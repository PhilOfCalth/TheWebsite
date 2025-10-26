// Dynamic template system that scans the templates folder and loads templates
// based on t_ tags found in the HTML

// Function to load a template from an HTML file into matching t_ elements
async function loadTemplate(templateName, templatePath) {
    try {
        const response = await fetch(templatePath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const templateContent = await response.text();
        
        // Find all elements with the matching t_ tag
        const elements = document.querySelectorAll(`t_${templateName}`);
        
        elements.forEach(element => {
            // Check if this is a layout template
            if (templateName === 'layout') {
                renderLayoutTemplate(element, templateContent);
            } else {
                element.innerHTML = templateContent;
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
        const templatePath = `templates/${templateName}.html`;
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
