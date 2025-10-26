// Blog system for dynamic markdown file loading and URL routing

// Markdown to HTML converter using marked.js library
function markdownToHtml(markdown) {
    // Check if marked is available
    if (typeof marked !== 'undefined') {
        // Configure marked options
        marked.setOptions({
            breaks: true,        // Convert \n to <br>
            gfm: true,          // GitHub Flavored Markdown
            tables: true,       // Enable tables
            sanitize: false,    // Allow HTML (be careful with user content)
            smartLists: true,   // Better list handling
            smartypants: true   // Smart quotes and dashes
        });
        
        return marked.parse(markdown);
    } else {
        // Fallback if marked.js is not loaded
        console.warn('marked.js library not loaded, using basic fallback');
        return `<pre>${markdown}</pre>`;
    }
}

// Blog router to handle URL query parameters
function initBlogRouter() {
    const currentPath = window.location.pathname;
    const blogPath = '/blog/';
    
    console.log('initBlogRouter called, currentPath:', currentPath);
    
    // Check if we're on a blog page
    if (currentPath.startsWith(blogPath)) {
        console.log('On blog page, checking for article parameter...');
        
        // Get the article parameter from the query string
        const urlParams = new URLSearchParams(window.location.search);
        const article = urlParams.get('article');
        
        console.log('Article parameter:', article);
        
        if (article) {
            // Load and display the markdown file
            const markdownFileName = article + '.md';
            console.log('Loading markdown file:', markdownFileName);
            loadMarkdownFile(markdownFileName);
        } else {
            // Show the main blog page (current content)
            console.log('No article parameter, showing main blog page...');
            showMainBlogPage();
        }
    } else {
        console.log('Not on blog page, skipping blog router');
    }
}

// Show the main blog page with dynamic article list
async function showMainBlogPage() {
    console.log('Showing main blog page');
    
    try {
        // Get list of markdown files from the test folder
        console.log('Calling getAvailableArticles...');
        const articles = await getAvailableArticles();
        console.log('getAvailableArticles returned:', articles);
        
        // Update the blog page with dynamic article list
        console.log('Calling updateBlogPageWithArticles...');
        updateBlogPageWithArticles(articles);
        console.log('updateBlogPageWithArticles completed');
        
    } catch (error) {
        console.error('Error loading article list:', error);
        console.error('Error stack:', error.stack);
        // Keep the default content if there's an error
    }
}

// Get list of available articles from test folder
async function getAvailableArticles() {
    const availableArticles = [];
    
    // List of known articles to check
    const knownArticles = [
        '2024-01-15T10:30:45.123Z-sample1',
        '2024-01-10T14:22:18.456Z-sample2', 
        '2024-01-05T08:15:30.789Z-sample3',
        '2024-01-20T16:45:30.999Z-new-article',
        '2024-01-25T12:00:00.000Z-directory-test',
        '2024-06-01T12:00:00.000Z-old-article',
        '2025-10-07T08:00:00.000Z-four-days-ago',
        '2025-10-08T10:00:00.000Z-three-days-ago',
        '2025-10-09T12:00:00.000Z-two-days-ago',
        '2025-10-10T14:00:00.000Z-yesterdays-article',
        '2025-10-11T15:00:00.000Z-todays-article'
    ];
    
    console.log('Checking for articles...');
    
    // Calculate the cutoff date (3 months ago)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    console.log('Current date:', new Date().toISOString());
    console.log('Cutoff date (3 months ago):', threeMonthsAgo.toISOString());
    
    // Try to fetch each known article
    for (const article of knownArticles) {
        try {
            const currentPath = window.location.pathname;
            const isInSubdirectory = currentPath.split('/').length > 2;
            const markdownPath = isInSubdirectory ? `../test/${article}.md` : `test/${article}.md`;
            
            console.log(`Checking: ${markdownPath}`);
            
            const response = await fetch(markdownPath, { method: 'HEAD' });
            if (response.ok) {
                // Parse ISO date-time from filename
                const isoDateTime = parseIsoDateTimeFromFilename(article);
                const articleName = extractArticleNameFromFilename(article);
                
                if (isoDateTime) {
                    const articleDate = new Date(isoDateTime);
                    console.log(`Article date: ${articleDate.toISOString()}, Cutoff: ${threeMonthsAgo.toISOString()}`);
                    
                    // Only include articles from the last 3 months
                    if (articleDate >= threeMonthsAgo) {
                        availableArticles.push({
                            name: article,
                            displayName: articleName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                            description: 'Click to read this markdown article with various formatting and content examples.',
                            published: isoDateTime.split('T')[0], // Extract just the date part
                            isoDateTime: isoDateTime,
                            url: `/blog/?article=${article}`
                        });
                        console.log(`Found recent article: ${article} (${articleDate.toISOString()})`);
                    } else {
                        console.log(`Article too old: ${article} (${articleDate.toISOString()})`);
                    }
                }
            } else {
                console.log(`Article not found: ${article} (${response.status})`);
            }
        } catch (error) {
            console.log(`Error checking article ${article}:`, error);
        }
    }
    
    console.log(`Total recent articles found: ${availableArticles.length}`);
    
    // Sort articles by ISO date-time (newest first)
    availableArticles.sort((a, b) => new Date(b.isoDateTime) - new Date(a.isoDateTime));
    
    // Limit to maximum 4 articles
    const limitedArticles = availableArticles.slice(0, 4);
    console.log(`Limited to ${limitedArticles.length} most recent articles`);
    
    return limitedArticles;
}

// Parse ISO date-time from filename
function parseIsoDateTimeFromFilename(filename) {
    // Expected format: YYYY-MM-DDTHH:mm:ss.sssZ-articlename
    const match = filename.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
    if (match) {
        return match[1];
    }
    return null;
}

// Extract article name from filename (everything after the ISO date-time)
function extractArticleNameFromFilename(filename) {
    // Expected format: YYYY-MM-DDTHH:mm:ss.sssZ-articlename
    const match = filename.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z-(.+)$/);
    if (match) {
        return match[1];
    }
    return filename; // Fallback to original filename
}

// Update the blog page with dynamic article list
function updateBlogPageWithArticles(articles) {
    console.log('updateBlogPageWithArticles called with:', articles);
    
    const mainElement = document.querySelector('main .container');
    if (!mainElement) {
        console.log('Main element not found');
        return;
    }

    // Find the existing feature-grid section
    const featureGrid = mainElement.querySelector('.feature-grid');
    if (!featureGrid) {
        console.log('Feature grid not found');
        return;
    }

    console.log('Found feature grid, clearing content...');
    
    // Clear existing content
    featureGrid.innerHTML = '';

    // Add each article as a feature card
    articles.forEach((article, index) => {
        console.log(`Adding article ${index + 1}:`, article);
        
        const articleCard = document.createElement('div');
        articleCard.className = 'feature-card';

        // Format the published date
        const publishDate = new Date(article.published);
        const formattedDate = publishDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        articleCard.innerHTML = `
            <h3><a href="${article.url}">${article.displayName}</a></h3>
            <p>${article.description}</p>
            <p><em>Published: ${formattedDate}</em></p>
        `;

        featureGrid.appendChild(articleCard);
    });

    // Update the section title to show count
    const sectionTitle = mainElement.querySelector('.features h2');
    if (sectionTitle) {
        if (articles.length > 0) {
            sectionTitle.textContent = `Recent Articles (${articles.length} from last 3 months)`;
        } else {
            sectionTitle.textContent = `Recent Articles (0 from last 3 months)`;
        }
        console.log(`Updated section title to show ${articles.length} recent articles`);
    }
}

// Load and display a markdown file
async function loadMarkdownFile(filename) {
    try {
        console.log(`Loading markdown file: ${filename}`);
        
        // Determine the correct path based on current location
        const currentPath = window.location.pathname;
        const isInSubdirectory = currentPath.split('/').length > 2;
        const markdownPath = isInSubdirectory ? `../test/${filename}` : `test/${filename}`;
        
        const response = await fetch(markdownPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const markdownContent = await response.text();
        const htmlContent = markdownToHtml(markdownContent);
        
        // Get current ISO date-time
        const now = new Date();
        const isoDateTime = now.toISOString();
        
        // Replace the main content with the markdown content
        const mainElement = document.querySelector('main .container');
        if (mainElement) {
            mainElement.innerHTML = `
                <div class="blog-post">
                    <div class="blog-navigation">
                        <a href="/blog/" class="back-to-blog">← Back to Blog</a>
                    </div>
                    <article class="markdown-content">
                        <div class="article-header">
                            <h1 class="article-datetime">${isoDateTime}</h1>
                        </div>
                        ${htmlContent}
                    </article>
                </div>
            `;
        }
        
        // Update the page title with ISO date-time
        const titleElement = document.querySelector('title');
        if (titleElement) {
            const now = new Date();
            const isoDateTime = now.toISOString();
            const postTitle = filename.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            titleElement.textContent = `${isoDateTime} - ${postTitle} - My Website Blog`;
        }
        
    } catch (error) {
        console.error(`Error loading markdown file ${filename}:`, error);
        
        // Show error message
        const mainElement = document.querySelector('main .container');
        if (mainElement) {
            mainElement.innerHTML = `
                <div class="blog-post">
                    <div class="blog-navigation">
                        <a href="/blog/" class="back-to-blog">← Back to Blog</a>
                    </div>
                    <div class="error-message">
                        <h1>Post Not Found</h1>
                        <p>The blog post "${filename}" could not be found.</p>
                        <p><a href="/blog/">Return to the blog</a></p>
                    </div>
                </div>
            `;
        }
    }
}

// Handle browser navigation (back/forward buttons)
window.addEventListener('popstate', function(event) {
    initBlogRouter();
});

// Initialize the blog router when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing blog router...');
    console.log('Current URL:', window.location.href);
    console.log('Current pathname:', window.location.pathname);
    
    // Wait a bit for templates to load first
    setTimeout(() => {
        console.log('Starting blog router initialization...');
        console.log('Templates should be loaded by now');
        initBlogRouter();
    }, 500); // Increased timeout to give templates more time
});

// Fallback initialization in case DOMContentLoaded doesn't fire
if (document.readyState === 'loading') {
    console.log('Document still loading, waiting for DOMContentLoaded...');
} else {
    console.log('Document already loaded, initializing blog router immediately...');
    setTimeout(() => {
        initBlogRouter();
    }, 1000);
}
