// Dynamic template system that scans the templates folder and loads templates
// based on t_ tags found in the HTML

// Function to load a template from an HTML file into matching t_ elements
async function loadTemplate(templateName, templatePath) {
    try {
        console.log(`Fetching template from: ${templatePath}`);
        const response = await fetch(templatePath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const templateContent = await response.text();
        console.log(`Successfully loaded template: ${templateName}, content length: ${templateContent.length}`);
        
        // Find all elements with the matching t_ tag
        const elements = document.querySelectorAll(`t_${templateName}`);
        console.log(`Found ${elements.length} elements for template: ${templateName}`);
        
        elements.forEach(element => {
            // Check if this is a layout template
            if (templateName === 'layout') {
                renderLayoutTemplate(element, templateContent);
            } else {
                // Adjust image paths based on current location
                let adjustedContent = templateContent;
                const currentPath = window.location.pathname;
                const isInSubdirectory = currentPath.split('/').length > 2;
                
                if (isInSubdirectory) {
                    // If in subdirectory, keep ../images/ paths as they are
                    // (they're already correct for subdirectories)
                } else {
                    // If in root directory, change ../images/ to images/
                    adjustedContent = adjustedContent.replace(/\.\.\/images\//g, 'images/');
                }
                
                element.innerHTML = adjustedContent;
            }
        });
        
        console.log(`Loaded template: ${templateName} into ${elements.length} element(s)`);
    } catch (error) {
        console.error(`Error loading template ${templateName} from ${templatePath}:`, error);
        // Fallback: show error message in matching t_ elements
        const elements = document.querySelectorAll(`t_${templateName}`);
        elements.forEach(element => {
            element.innerHTML = `<div class="template-error">Error loading template: ${templateName}</div>`;
        });
    }
}

// Function to render layout template with content substitution
function renderLayoutTemplate(element, templateContent) {
    // Get the content from within the t_layout tags
    const content = element.innerHTML;
    
    // Get data attributes for template variables
    const title = element.getAttribute('data-title') || 'Page';
    const head = element.getAttribute('data-head') || '';
    const scripts = element.getAttribute('data-scripts') || '';
    
    // Replace template variables
    let renderedContent = templateContent
        .replace('{{title}}', title)
        .replace('{{head}}', head)
        .replace('{{content}}', content)
        .replace('{{scripts}}', scripts);
    
    // Replace the entire document with the rendered layout
    document.documentElement.innerHTML = renderedContent;
    
    // Re-run the template loading for any nested templates after a short delay
    // to ensure the DOM is fully updated
    setTimeout(() => {
        loadAllTemplates();
    }, 50);
}

// Function to scan for t_ tags and load corresponding templates
async function loadAllTemplates() {
    console.log('Starting template loading...');
    
    // Find all t_ tags in the current page
    const templateTags = document.querySelectorAll('[class*="t_"], [id*="t_"]');
    const templateNames = new Set();
    console.log('Found template tags:', templateTags.length);
    
    // Extract template names from t_ tags
    templateTags.forEach(tag => {
        const className = tag.className;
        const id = tag.id;
        
        // Check class names for t_ pattern
        if (className) {
            const classMatches = className.match(/t_(\w+)/g);
            if (classMatches) {
                classMatches.forEach(match => {
                    templateNames.add(match.substring(2)); // Remove 't_' prefix
                });
            }
        }
        
        // Check id for t_ pattern
        if (id && id.startsWith('t_')) {
            templateNames.add(id.substring(2)); // Remove 't_' prefix
        }
    });
    
    // Also check for custom t_ elements (like <t_header>, <t_footer>, <t_nav>, <t_sidebar>, <t_layout>)
    const customElements = document.querySelectorAll('t_header, t_footer, t_nav, t_sidebar, t_layout');
    console.log('Found custom elements:', customElements.length);
    customElements.forEach(element => {
        const tagName = element.tagName.toLowerCase();
        console.log('Processing custom element:', tagName);
        if (tagName.startsWith('t_')) {
            templateNames.add(tagName.substring(2)); // Remove 't_' prefix
        }
    });
    
    console.log('Found template tags:', Array.from(templateNames));
    
    // Load each template
    const loadPromises = Array.from(templateNames).map(templateName => {
        // Determine the correct path based on current location
        const currentPath = window.location.pathname;
        const isInSubdirectory = currentPath.split('/').length > 2;
        const templatePath = isInSubdirectory ? `../templates/${templateName}.html` : `templates/${templateName}.html`;
        console.log(`Loading template: ${templateName} from ${templatePath}`);
        return loadTemplate(templateName, templatePath);
    });
    
    await Promise.all(loadPromises);
}

// Load templates when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, starting template loading...');
    // Add a small delay to ensure everything is ready
    setTimeout(() => {
        try {
            loadAllTemplates().catch(error => {
                console.error('Error loading templates:', error);
            });
        } catch (error) {
            console.error('Error in template loading:', error);
        }
    }, 100);
});
