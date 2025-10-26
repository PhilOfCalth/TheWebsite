#!/bin/bash

# AWS S3 Website Deployment Script
# This script handles AWS CLI authentication and deploys the website to S3

set -e  # Exit on any error

# Configuration - Update these variables for your setup
BUCKET_NAME=""
AWS_REGION="us-east-1"
PROFILE_NAME="default"
LOCAL_DIR="."
EXCLUDE_PATTERNS="aws/ awscliv2.zip .git/ .gitignore deploy.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if AWS CLI is installed
check_aws_cli() {
    log_info "Checking AWS CLI installation..."
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first:"
        echo "  curl 'https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip' -o 'awscliv2.zip'"
        echo "  unzip awscliv2.zip"
        echo "  sudo ./aws/install"
        exit 1
    fi
    
    AWS_VERSION=$(aws --version 2>&1)
    log_success "AWS CLI found: $AWS_VERSION"
}

# Function to configure AWS CLI
configure_aws() {
    log_info "Configuring AWS CLI..."
    
    # Check if already configured
    if aws configure list --profile $PROFILE_NAME | grep -q "access_key"; then
        log_info "AWS CLI is already configured for profile '$PROFILE_NAME'"
        read -p "Do you want to reconfigure? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 0
        fi
    fi
    
    log_info "Please provide your AWS credentials:"
    aws configure --profile $PROFILE_NAME
    
    log_success "AWS CLI configured successfully"
}

# Function to set bucket name
set_bucket_name() {
    if [ -z "$BUCKET_NAME" ]; then
        log_info "Please enter your S3 bucket name:"
        read -p "Bucket name: " BUCKET_NAME
        
        if [ -z "$BUCKET_NAME" ]; then
            log_error "Bucket name cannot be empty"
            exit 1
        fi
    fi
    
    log_info "Using bucket: $BUCKET_NAME"
}

# Function to check if bucket exists
check_bucket_exists() {
    log_info "Checking if bucket '$BUCKET_NAME' exists..."
    
    if aws s3 ls "s3://$BUCKET_NAME" --profile $PROFILE_NAME 2>/dev/null; then
        log_success "Bucket '$BUCKET_NAME' exists and is accessible"
    else
        log_warning "Bucket '$BUCKET_NAME' does not exist or is not accessible"
        read -p "Do you want to create the bucket? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            create_bucket
        else
            log_error "Cannot proceed without a valid bucket"
            exit 1
        fi
    fi
}

# Function to create S3 bucket
create_bucket() {
    log_info "Creating bucket '$BUCKET_NAME' in region '$AWS_REGION'..."
    
    if [ "$AWS_REGION" = "us-east-1" ]; then
        aws s3 mb "s3://$BUCKET_NAME" --profile $PROFILE_NAME
    else
        aws s3 mb "s3://$BUCKET_NAME" --region "$AWS_REGION" --profile $PROFILE_NAME
    fi
    
    if [ $? -eq 0 ]; then
        log_success "Bucket '$BUCKET_NAME' created successfully"
    else
        log_error "Failed to create bucket '$BUCKET_NAME'"
        exit 1
    fi
}

# Function to configure bucket for static website hosting
configure_website_hosting() {
    log_info "Configuring bucket for static website hosting..."
    
    # Enable static website hosting
    aws s3 website "s3://$BUCKET_NAME" \
        --index-document index.html \
        --error-document index.html \
        --profile $PROFILE_NAME
    
    if [ $? -eq 0 ]; then
        log_success "Static website hosting configured"
    else
        log_error "Failed to configure static website hosting"
        exit 1
    fi
    
    # Set bucket policy for public read access
    log_info "Setting bucket policy for public read access..."
    
    POLICY=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF
)
    
    echo "$POLICY" > /tmp/bucket-policy.json
    aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy file:///tmp/bucket-policy.json --profile $PROFILE_NAME
    rm /tmp/bucket-policy.json
    
    if [ $? -eq 0 ]; then
        log_success "Bucket policy set for public read access"
    else
        log_error "Failed to set bucket policy"
        exit 1
    fi
}

# Function to sync files to S3
sync_to_s3() {
    log_info "Syncing files to S3 bucket '$BUCKET_NAME'..."
    
    # Build exclude string
    EXCLUDE_ARGS=""
    for pattern in $EXCLUDE_PATTERNS; do
        EXCLUDE_ARGS="$EXCLUDE_ARGS --exclude '$pattern*'"
    done
    
    # Sync with proper content types
    aws s3 sync "$LOCAL_DIR" "s3://$BUCKET_NAME" \
        --profile $PROFILE_NAME \
        --delete \
        --cache-control "max-age=31536000" \
        --exclude "*.html" \
        --exclude "*.css" \
        --exclude "*.js" \
        $EXCLUDE_ARGS
    
    # Sync HTML files with shorter cache
    aws s3 sync "$LOCAL_DIR" "s3://$BUCKET_NAME" \
        --profile $PROFILE_NAME \
        --delete \
        --cache-control "max-age=0" \
        --include "*.html" \
        $EXCLUDE_ARGS
    
    # Sync CSS files
    aws s3 sync "$LOCAL_DIR" "s3://$BUCKET_NAME" \
        --profile $PROFILE_NAME \
        --delete \
        --cache-control "max-age=86400" \
        --include "*.css" \
        $EXCLUDE_ARGS
    
    # Sync JS files
    aws s3 sync "$LOCAL_DIR" "s3://$BUCKET_NAME" \
        --profile $PROFILE_NAME \
        --delete \
        --cache-control "max-age=86400" \
        --include "*.js" \
        $EXCLUDE_ARGS
    
    if [ $? -eq 0 ]; then
        log_success "Files synced successfully to S3"
    else
        log_error "Failed to sync files to S3"
        exit 1
    fi
}

# Function to set proper content types
set_content_types() {
    log_info "Setting proper content types for files..."
    
    # Set content type for HTML files
    aws s3 cp "s3://$BUCKET_NAME/" "s3://$BUCKET_NAME/" \
        --recursive \
        --metadata-directive REPLACE \
        --content-type "text/html" \
        --include "*.html" \
        --profile $PROFILE_NAME
    
    # Set content type for CSS files
    aws s3 cp "s3://$BUCKET_NAME/" "s3://$BUCKET_NAME/" \
        --recursive \
        --metadata-directive REPLACE \
        --content-type "text/css" \
        --include "*.css" \
        --profile $PROFILE_NAME
    
    # Set content type for JS files
    aws s3 cp "s3://$BUCKET_NAME/" "s3://$BUCKET_NAME/" \
        --recursive \
        --metadata-directive REPLACE \
        --content-type "application/javascript" \
        --include "*.js" \
        --profile $PROFILE_NAME
    
    log_success "Content types set successfully"
}

# Function to display website URL
show_website_url() {
    log_success "Deployment completed successfully!"
    echo
    echo "Your website is now available at:"
    echo "  http://$BUCKET_NAME.s3-website-$AWS_REGION.amazonaws.com"
    echo
    echo "Or if using a custom domain:"
    echo "  https://$BUCKET_NAME"
    echo
    log_info "Note: If you're using a custom domain, make sure to configure it in Route 53 or your DNS provider"
}

# Function to show help
show_help() {
    echo "AWS S3 Website Deployment Script"
    echo
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -b, --bucket BUCKET_NAME    S3 bucket name"
    echo "  -r, --region REGION         AWS region (default: us-east-1)"
    echo "  -p, --profile PROFILE       AWS profile name (default: default)"
    echo "  -d, --dir DIRECTORY         Local directory to deploy (default: current directory)"
    echo "  -h, --help                  Show this help message"
    echo
    echo "Examples:"
    echo "  $0                                    # Interactive mode"
    echo "  $0 -b my-website-bucket              # Deploy to specific bucket"
    echo "  $0 -b my-bucket -r us-west-2        # Deploy to specific bucket and region"
    echo "  $0 -b my-bucket -p production        # Deploy using specific AWS profile"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--bucket)
            BUCKET_NAME="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -p|--profile)
            PROFILE_NAME="$2"
            shift 2
            ;;
        -d|--dir)
            LOCAL_DIR="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
main() {
    echo "=========================================="
    echo "AWS S3 Website Deployment Script"
    echo "=========================================="
    echo
    
    # Check prerequisites
    check_aws_cli
    
    # Configure AWS CLI
    configure_aws
    
    # Set bucket name
    set_bucket_name
    
    # Check if bucket exists
    check_bucket_exists
    
    # Configure bucket for website hosting
    configure_website_hosting
    
    # Sync files to S3
    sync_to_s3
    
    # Set proper content types
    set_content_types
    
    # Show website URL
    show_website_url
}

# Run main function
main "$@"
