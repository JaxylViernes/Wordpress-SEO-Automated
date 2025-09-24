import DOMPurify from 'dompurify';

// Sanitization configuration for WordPress content
const createSanitizationConfig = () => {
  return {
    // Allow common WordPress/HTML tags
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'div', 'span',
      'a', 'strong', 'b', 'em', 'i', 'u',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'img', 'figure', 'figcaption',
      'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'hr'
    ],
    
    // Allow specific attributes
    ALLOWED_ATTR: [
      'href', 'title', 'alt', 'src', 'class', 'id',
      'width', 'height', 'style', 'target', 'rel'
    ],
    
    // Allow specific URL schemes
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    
    // Keep relative URLs
    KEEP_CONTENT: false,
    
    // Allow specific CSS properties for WordPress styling
    ALLOWED_CSS_PROPERTIES: [
      'color', 'background-color', 'font-size', 'font-weight', 
      'text-align', 'margin', 'padding', 'border', 'width', 'height'
    ]
  };
};

// Basic sanitization for form inputs (titles, excerpts, etc.)
export function sanitizeFormInput(input: string): string {
  if (!input) return '';
  
  // For simple inputs, just remove script tags and javascript protocols
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '');
}

// Minimal sanitization for HTML content - preserves WordPress HTML
export function sanitizeHtmlContent(html: string, preserveHtml: boolean = true): string {
  if (!html) return '';
  
  // Don't sanitize at all if preserveHtml is true (for WordPress content)
  if (preserveHtml) {
    // Just remove the most dangerous elements but keep all WordPress formatting
    let cleaned = html;
    
    // Remove script tags and their content
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove iframe tags (unless from trusted sources like YouTube)
    cleaned = cleaned.replace(/<iframe(?![^>]*(?:youtube\.com|vimeo\.com))[^>]*>.*?<\/iframe>/gi, '');
    
    // Remove onclick and other on* event handlers
    cleaned = cleaned.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
    cleaned = cleaned.replace(/\son\w+\s*=\s*[^\s>]*/gi, '');
    
    // Remove javascript: protocol
    cleaned = cleaned.replace(/javascript:/gi, '');
    
    return cleaned;
  }
  
  // If preserveHtml is false, strip all HTML tags
  return html.replace(/<[^>]*>/g, '');
}