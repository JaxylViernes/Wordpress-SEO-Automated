// server/utils/sanitizer.ts
// Comprehensive input sanitization utilities for GSC Manager

import validator from 'validator';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

// Create DOMPurify instance with jsdom for Node.js
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window as any);

/**
 * Sanitization utilities for various input types
 */
export class InputSanitizer {
  /**
   * Sanitize general text input - removes dangerous HTML/scripts
   */
  static sanitizeText(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    // Remove any HTML tags and scripts using DOMPurify with jsdom
    const cleaned = DOMPurify.sanitize(input, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true 
    });
    
    // Trim whitespace
    return cleaned.trim();
  }

  /**
   * Alternative sanitizeText without DOMPurify (for better performance)
   * Use this if you don't need full HTML sanitization
   */
  static sanitizeTextSimple(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    // Remove HTML tags using regex (simpler but less secure than DOMPurify)
    let cleaned = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    cleaned = cleaned.replace(/<[^>]+>/g, '');
    
    // Decode HTML entities
    cleaned = validator.unescape(cleaned);
    
    // Remove dangerous patterns
    cleaned = cleaned.replace(/javascript:/gi, '');
    cleaned = cleaned.replace(/on\w+\s*=/gi, '');
    
    // Trim whitespace
    return cleaned.trim();
  }

  /**
   * Sanitize and validate URLs
   */
  static sanitizeUrl(url: string): { isValid: boolean; sanitized: string; error?: string } {
    if (!url || typeof url !== 'string') {
      return { isValid: false, sanitized: '', error: 'URL is required' };
    }

    // Trim whitespace
    const trimmed = url.trim();
    
    // Check if empty after trimming
    if (!trimmed) {
      return { isValid: false, sanitized: '', error: 'URL cannot be empty' };
    }

    // Validate URL format
    if (!validator.isURL(trimmed, {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true,
      require_host: true,
      require_tld: true,
      allow_query_components: true,
      allow_fragments: true,
      allow_protocol_relative_urls: false
    })) {
      return { isValid: false, sanitized: trimmed, error: 'Invalid URL format. URLs must start with http:// or https://' };
    }

    // Additional validation for malicious patterns
    const maliciousPatterns = [
      /javascript:/i,
      /data:text\/html/i,
      /vbscript:/i,
      /file:\/\//i,
      /<script/i,
      /onclick=/i,
      /onerror=/i
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(trimmed)) {
        return { isValid: false, sanitized: '', error: 'URL contains potentially harmful content' };
      }
    }

    // Normalize URL
    try {
      const urlObj = new URL(trimmed);
      
      // Additional security checks
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return { isValid: false, sanitized: '', error: 'Only HTTP and HTTPS protocols are allowed' };
      }

      // Check for localhost/private IPs (optional - depending on requirements)
      const hostname = urlObj.hostname.toLowerCase();
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
        return { isValid: false, sanitized: '', error: 'Local URLs are not allowed' };
      }

      return { isValid: true, sanitized: urlObj.toString() };
    } catch (error) {
      return { isValid: false, sanitized: trimmed, error: 'Invalid URL structure' };
    }
  }

  /**
   * Sanitize sitemap URL with additional validation
   */
  static sanitizeSitemapUrl(url: string): { isValid: boolean; sanitized: string; error?: string; warning?: string } {
    const urlValidation = this.sanitizeUrl(url);
    
    if (!urlValidation.isValid) {
      return urlValidation;
    }

    // Check for typical sitemap patterns
    const sitemapPatterns = [
      /sitemap.*\.xml$/i,
      /sitemap$/i,
      /\.xml$/i
    ];

    const hasTypicalPattern = sitemapPatterns.some(pattern => pattern.test(urlValidation.sanitized));
    
    if (!hasTypicalPattern) {
      return {
        ...urlValidation,
        warning: 'URL does not follow typical sitemap naming convention (e.g., sitemap.xml)'
      };
    }

    return urlValidation;
  }

  /**
   * Sanitize OAuth credentials
   */
  static sanitizeOAuthCredentials(clientId: string, clientSecret: string): {
    isValid: boolean;
    sanitizedId: string;
    sanitizedSecret: string;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // Sanitize and validate client ID
    const sanitizedId = this.sanitizeText(clientId);
    if (!sanitizedId) {
      errors.push('Client ID is required');
    } else if (sanitizedId.length < 10) {
      errors.push('Client ID appears to be too short');
    } else if (!/^[\w.-]+$/.test(sanitizedId)) {
      errors.push('Client ID contains invalid characters');
    }

    // Sanitize and validate client secret
    const sanitizedSecret = this.sanitizeText(clientSecret);
    if (!sanitizedSecret) {
      errors.push('Client Secret is required');
    } else if (sanitizedSecret.length < 10) {
      errors.push('Client Secret appears to be too short');
    } else if (!/^[\w.-]+$/.test(sanitizedSecret)) {
      errors.push('Client Secret contains invalid characters');
    }

    // Check for common placeholder values
    const placeholders = ['your-client-id', 'your-client-secret', 'xxxxxxxxxx', '1234567890'];
    if (placeholders.some(p => sanitizedId.toLowerCase().includes(p))) {
      errors.push('Client ID appears to be a placeholder value');
    }
    if (placeholders.some(p => sanitizedSecret.toLowerCase().includes(p))) {
      errors.push('Client Secret appears to be a placeholder value');
    }

    return {
      isValid: errors.length === 0,
      sanitizedId,
      sanitizedSecret,
      errors
    };
  }

  /**
   * Sanitize bulk URLs (one per line)
   */
  static sanitizeBulkUrls(input: string): {
    valid: string[];
    invalid: Array<{ url: string; error: string }>;
    total: number;
  } {
    if (!input || typeof input !== 'string') {
      return { valid: [], invalid: [], total: 0 };
    }

    const lines = input.split('\n');
    const valid: string[] = [];
    const invalid: Array<{ url: string; error: string }> = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue; // Skip empty lines

      const validation = this.sanitizeUrl(trimmed);
      if (validation.isValid) {
        valid.push(validation.sanitized);
      } else {
        invalid.push({
          url: trimmed,
          error: validation.error || 'Invalid URL'
        });
      }
    }

    return {
      valid,
      invalid,
      total: valid.length + invalid.length
    };
  }

  /**
   * Sanitize email address
   */
  static sanitizeEmail(email: string): { isValid: boolean; sanitized: string; error?: string } {
    if (!email || typeof email !== 'string') {
      return { isValid: false, sanitized: '', error: 'Email is required' };
    }

    const trimmed = email.trim().toLowerCase();

    if (!validator.isEmail(trimmed)) {
      return { isValid: false, sanitized: trimmed, error: 'Invalid email format' };
    }

    return { isValid: true, sanitized: trimmed };
  }

  /**
   * Sanitize and validate account ID (alphanumeric)
   */
  static sanitizeAccountId(id: string): { isValid: boolean; sanitized: string; error?: string } {
    if (!id || typeof id !== 'string') {
      return { isValid: false, sanitized: '', error: 'Account ID is required' };
    }

    const trimmed = id.trim();

    // Allow alphanumeric, dots, and hyphens (common in Google IDs)
    if (!/^[\w.-]+$/.test(trimmed)) {
      return { isValid: false, sanitized: '', error: 'Account ID contains invalid characters' };
    }

    return { isValid: true, sanitized: trimmed };
  }

  /**
   * Escape HTML entities for safe display
   */
  static escapeHtml(text: string): string {
    if (!text || typeof text !== 'string') return '';

    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
      '/': '&#x2F;'
    };

    return text.replace(/[&<>"'/]/g, char => map[char]);
  }

  /**
   * Validate and sanitize property/site URL
   */
  static sanitizePropertyUrl(url: string): { isValid: boolean; sanitized: string; error?: string } {
    if (!url || typeof url !== 'string') {
      return { isValid: false, sanitized: '', error: 'Property URL is required' };
    }

    const trimmed = url.trim();

    // Handle domain properties (sc-domain:example.com)
    if (trimmed.startsWith('sc-domain:')) {
      const domain = trimmed.substring('sc-domain:'.length);
      
      if (!domain) {
        return { isValid: false, sanitized: '', error: 'Domain cannot be empty' };
      }

      // Validate domain format
      if (!validator.isFQDN(domain)) {
        return { isValid: false, sanitized: trimmed, error: 'Invalid domain format' };
      }

      return { isValid: true, sanitized: trimmed };
    }

    // Handle regular URL properties
    return this.sanitizeUrl(trimmed);
  }

  /**
   * Rate limit check utility
   */
  static createRateLimiter(maxRequests: number, timeWindow: number) {
    const requests = new Map<string, number[]>();

    return (identifier: string): boolean => {
      const now = Date.now();
      const userRequests = requests.get(identifier) || [];
      
      // Remove old requests outside time window
      const validRequests = userRequests.filter(time => now - time < timeWindow);
      
      if (validRequests.length >= maxRequests) {
        return false; // Rate limit exceeded
      }

      validRequests.push(now);
      requests.set(identifier, validRequests);
      
      // Cleanup old entries periodically
      if (requests.size > 100) {
        for (const [key, times] of requests.entries()) {
          if (times.every(time => now - time > timeWindow)) {
            requests.delete(key);
          }
        }
      }

      return true;
    };
  }
}

/**
 * Express middleware for input sanitization
 */
export const sanitizationMiddleware = {
  /**
   * Sanitize all string values in request body
   */
  body: (req: any, res: any, next: any) => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    next();
  },

  /**
   * Sanitize all query parameters
   */
  query: (req: any, res: any, next: any) => {
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    next();
  },

  /**
   * Sanitize all params
   */
  params: (req: any, res: any, next: any) => {
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }
    next();
  }
};

/**
 * Recursively sanitize object values
 */
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Special handling for specific fields
    if (key === 'url' || key === 'siteUrl' || key === 'inspectionUrl' || key === 'sitemapUrl') {
      // Don't auto-sanitize URLs as they need validation
      sanitized[key] = value;
    } else if (key === 'clientId' || key === 'clientSecret' || key === 'accessToken' || key === 'refreshToken') {
      // Don't modify tokens/secrets
      sanitized[key] = value;
    } else if (typeof value === 'string') {
      // General text sanitization - use the simple version for better performance
      sanitized[key] = InputSanitizer.sanitizeTextSimple(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// Export for use in React components
export default InputSanitizer;