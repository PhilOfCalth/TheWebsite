# The Website with Dynamic Template System

A simple website built with plain HTML, CSS, and JavaScript featuring a powerful templating system.

## Features

### 1. Dynamic Template Loading
- Automatically scans for `t_` tags in HTML
- Loads templates from the `templates/` folder
- Supports multiple template types: custom elements, classes, and IDs

### 2. Layout Template System
- Complete page structure with header, footer, and CSS
- Content substitution with template variables
- Custom head content and scripts support

## Template Types

### Custom Elements
```html
<t_header></t_header>
<t_footer></t_footer>
<t_nav></t_nav>
<t_sidebar></t_sidebar>
<t_layout data-title="Page Title">
    <!-- Page content goes here -->
</t_layout>
```

### Class-based Templates
```html
<div class="t_sidebar"></div>
```

### ID-based Templates
```html
<div id="t_header"></div>
```

## Layout Template Usage

The layout template provides a complete page structure. Use it like this:

### Basic Usage
```html
<t_layout data-title="My Page">
    <h1>Page Title</h1>
    <p>Your content goes here...</p>
</t_layout>
```

### Advanced Usage
```html
<t_layout 
    data-title="Advanced Page" 
    data-head='
        <meta name="description" content="Page description">
        <style>/* Custom CSS */</style>
    '
    data-scripts='
        <script>/* Custom JavaScript */</script>
    '
>
    <h1>Advanced Page</h1>
    <p>Content with custom head and scripts...</p>
</t_layout>
```

## Template Variables

The layout template supports these variables:
- `{{title}}` - Page title (from data-title attribute)
- `{{head}}` - Custom head content (from data-head attribute)
- `{{content}}` - Page content (from within t_layout tags)
- `{{scripts}}` - Custom scripts (from data-scripts attribute)

## File Structure

```
TheWebsite/
├── templates/
│   ├── layout.html      # Main layout template
│   ├── header.html      # Navigation header
│   ├── footer.html      # Site footer
│   ├── nav.html         # Breadcrumb navigation
│   └── sidebar.html     # Sidebar content
├── css/
│   └── styles.css       # All styling
├── js/
│   ├── templates.js     # Template loading system
│   └── main.js          # JavaScript functionality
├── about/
│   └── index.html       # About page
├── contact/
│   └── index.html       # Contact page
├── index.html           # Homepage
└── README.md            # This file
```

## Getting Started

1. Start a local server:
   ```bash
   python3 -m http.server 8001
   ```

2. Open your browser and visit:
   - `http://localhost:8001/` - Homepage
   - `http://localhost:8001/about/` - About page
   - `http://localhost:8001/contact/` - Contact page

## Adding New Templates

1. Create a new HTML file in the `templates/` folder
2. Add the corresponding `t_` tag to your HTML
3. The system will automatically load and render the template

## Adding New Pages

### Using Layout Template (Recommended)
```html
<t_layout data-title="New Page">
    <h1>New Page</h1>
    <p>Your content here...</p>
</t_layout>
```

### Using Individual Templates
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Page</title>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <t_header></t_header>
    <main>
        <div class="container">
            <h1>My Page</h1>
            <p>Content here...</p>
        </div>
    </main>
    <t_footer></t_footer>
    <script src="js/templates.js"></script>
    <script src="js/main.js"></script>
</body>
</html>
```

## Benefits

- **Zero Configuration**: Just add `t_` tags and templates load automatically
- **Maintainable**: Templates are separate HTML files
- **Flexible**: Multiple ways to reference templates
- **Performance**: Parallel loading and browser caching
- **Scalable**: Easy to add new templates and pages
