// client/utils/client-sanitizer.ts
// Client-side sanitization utilities for React components

/**
 * Client-side input sanitizer for React components
 * Note: This is a lighter version without server-side dependencies
 */
export class ClientInputSanitizer {
  /**
   * Sanitize general text input - removes dangerous characters
   */
  static sanitizeText(input: string, maxLength: number = 500): string {
    if (!input || typeof input !== 'string') return '';
    
    // Remove dangerous characters and HTML-like content
    let cleaned = input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>\"'`]/g, '') // Remove potentially dangerous characters
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
    
    // Trim and limit length
    return cleaned.trim().substring(0, maxLength);
  }

  /**
   * Validate email format (client-side)
   */
  static validateEmail(email: string): { isValid: boolean; sanitized: string; error?: string } {
    if (!email || typeof email !== 'string') {
      return { isValid: false, sanitized: '', error: 'Email is required' };
    }

    const trimmed = email.trim().toLowerCase();
    
    // Basic email regex for client-side validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(trimmed)) {
      return { isValid: false, sanitized: trimmed, error: 'Please enter a valid email address' };
    }

    // Check for reasonable length
    if (trimmed.length > 254) {
      return { isValid: false, sanitized: trimmed, error: 'Email address is too long' };
    }

    return { isValid: true, sanitized: trimmed };
  }

  /**
   * Validate API key format based on provider
   */
  static validateApiKey(apiKey: string, provider: string): { isValid: boolean; error?: string } {
    if (!apiKey || typeof apiKey !== 'string') {
      return { isValid: false, error: 'API key is required' };
    }

    const trimmed = apiKey.trim();
    
    // Length check
    if (trimmed.length > 500) {
      return { isValid: false, error: 'API key is too long' };
    }

    // Provider-specific validation
    switch (provider) {
      case 'openai':
        if (!trimmed.startsWith('sk-')) {
          return { isValid: false, error: 'OpenAI API keys should start with "sk-"' };
        }
        if (trimmed.length < 40) {
          return { isValid: false, error: 'OpenAI API key appears too short' };
        }
        break;
        
      case 'anthropic':
        if (!trimmed.startsWith('sk-ant-')) {
          return { isValid: false, error: 'Anthropic API keys should start with "sk-ant-"' };
        }
        if (trimmed.length < 40) {
          return { isValid: false, error: 'Anthropic API key appears too short' };
        }
        break;
        
      case 'google_pagespeed':
      case 'gemini':
        if (!trimmed.startsWith('AIza')) {
          return { isValid: false, error: 'Google API keys typically start with "AIza"' };
        }
        if (trimmed.length < 30) {
          return { isValid: false, error: 'Google API key appears too short' };
        }
        break;
    }

    // Check for invalid characters
    if (!/^[a-zA-Z0-9_\-]+$/.test(trimmed)) {
      return { isValid: false, error: 'API key contains invalid characters' };
    }

    return { isValid: true };
  }

  /**
   * Sanitize numeric input
   */
  static sanitizeNumber(value: any, min: number, max: number): number {
    const num = parseInt(value, 10);
    
    if (isNaN(num)) {
      return min;
    }
    
    return Math.min(max, Math.max(min, num));
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): { 
    isValid: boolean; 
    strength: 'weak' | 'fair' | 'strong';
    errors: string[] 
  } {
    const errors: string[] = [];
    
    if (!password) {
      return { isValid: false, strength: 'weak', errors: ['Password is required'] };
    }

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    if (password.length > 200) {
      errors.push('Password is too long (max 200 characters)');
    }

    // Check for common weak passwords
    const weakPasswords = [
      'password', 'password123', '12345678', '123456789',
      'qwerty', 'abc123', 'admin', 'letmein', 'welcome'
    ];
    
    if (weakPasswords.includes(password.toLowerCase())) {
      errors.push('This password is too common');
    }

    // Determine strength
    let strength: 'weak' | 'fair' | 'strong' = 'weak';
    if (password.length >= 8 && password.length < 12) {
      strength = 'fair';
    } else if (password.length >= 12) {
      strength = 'strong';
    }
    
    // Check for character variety for strong passwords
    if (password.length >= 12) {
      const hasLower = /[a-z]/.test(password);
      const hasUpper = /[A-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecial = /[^a-zA-Z0-9]/.test(password);
      
      const varietyCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
      if (varietyCount >= 3) {
        strength = 'strong';
      }
    }

    return {
      isValid: errors.length === 0,
      strength,
      errors
    };
  }

  /**
   * Escape HTML for safe display
   */
  static escapeHtml(text: string): string {
    if (!text || typeof text !== 'string') return '';

    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in React components
export default ClientInputSanitizer;