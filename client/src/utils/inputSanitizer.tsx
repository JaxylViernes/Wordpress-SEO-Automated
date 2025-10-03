// client/src/utils/inputSanitizer.tsx
// Frontend sanitization utilities for the Google Search Console Manager

import React, { useState, useCallback } from "react";

/**
 * Frontend Input Sanitization Class
 */
export class FrontendSanitizer {
  /**
   * Basic HTML entity escaping for safe display
   */
  static escapeHtml(input: string): string {
    if (!input || typeof input !== "string") return "";

    const escapeMap: { [key: string]: string } = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
      "/": "&#x2F;",
    };

    return input.trim().replace(/[&<>"'/]/g, (char) => escapeMap[char]);
  }

  /**
   * Remove potentially dangerous content from text
   */
  static sanitizeText(input: string): string {
    if (!input || typeof input !== "string") return "";

    // Remove any potential script tags or HTML
    let cleaned = input.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      ""
    );
    cleaned = cleaned.replace(/<[^>]+>/g, "");

    // Remove dangerous event handlers
    cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");

    return cleaned.trim();
  }

  /**
   * Validate and sanitize URL
   */
  static validateUrl(url: string): {
    isValid: boolean;
    sanitized: string;
    error?: string;
    warning?: string;
  } {
    if (!url || typeof url !== "string") {
      return { isValid: false, sanitized: "", error: "URL is required" };
    }

    const trimmed = url.trim();

    if (!trimmed) {
      return { isValid: false, sanitized: "", error: "URL cannot be empty" };
    }

    // Check for protocol
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      return {
        isValid: false,
        sanitized: trimmed,
        error: "URL must start with http:// or https://",
      };
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /javascript:/i,
      /data:text\/html/i,
      /vbscript:/i,
      /file:\/\//i,
      /<script/i,
      /onclick=/i,
      /onerror=/i,
      /onload=/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(trimmed)) {
        return {
          isValid: false,
          sanitized: "",
          error: "URL contains potentially harmful content",
        };
      }
    }

    // Validate URL structure
    try {
      const urlObj = new URL(trimmed);

      // Additional security checks
      if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
        return {
          isValid: false,
          sanitized: "",
          error: "Only HTTP and HTTPS protocols are allowed",
        };
      }

      // Check for localhost/private IPs (optional warning)
      const hostname = urlObj.hostname.toLowerCase();
      let warning: string | undefined;

      if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.startsWith("192.168.") ||
        hostname.startsWith("10.") ||
        hostname.startsWith("172.")
      ) {
        warning = "This appears to be a local/private URL";
      }

      // Normalize URL
      const normalized = urlObj.toString();

      return {
        isValid: true,
        sanitized: normalized,
        warning,
      };
    } catch (error) {
      return {
        isValid: false,
        sanitized: trimmed,
        error: "Invalid URL format",
      };
    }
  }

  /**
   * Validate sitemap URL
   */
  static validateSitemapUrl(url: string): {
    isValid: boolean;
    sanitized: string;
    error?: string;
    warning?: string;
  } {
    const urlValidation = this.validateUrl(url);

    if (!urlValidation.isValid) {
      return urlValidation;
    }

    // Check for typical sitemap patterns
    const sitemapPatterns = [
      /sitemap.*\.xml$/i,
      /sitemap$/i,
      /\.xml$/i,
      /sitemap_index\.xml$/i,
    ];

    const hasTypicalPattern = sitemapPatterns.some((pattern) =>
      pattern.test(urlValidation.sanitized)
    );

    if (!hasTypicalPattern) {
      return {
        ...urlValidation,
        warning:
          "URL does not follow typical sitemap naming (e.g., sitemap.xml)",
      };
    }

    return urlValidation;
  }

  /**
   * Validate OAuth credentials
   */
  static validateOAuthCredentials(
    clientId: string,
    clientSecret: string
  ): {
    isValid: boolean;
    sanitizedId: string;
    sanitizedSecret: string;
    errors: string[];
  } {
    const errors: string[] = [];

    // Sanitize inputs
    const sanitizedId = this.sanitizeText(clientId).trim();
    const sanitizedSecret = this.sanitizeText(clientSecret).trim();

    // Validate Client ID
    if (!sanitizedId) {
      errors.push("Client ID is required");
    } else if (sanitizedId.length < 10) {
      errors.push("Client ID appears too short");
    } else if (!/^[\w.-]+$/.test(sanitizedId)) {
      errors.push("Client ID contains invalid characters");
    }

    // Validate Client Secret
    if (!sanitizedSecret) {
      errors.push("Client Secret is required");
    } else if (sanitizedSecret.length < 10) {
      errors.push("Client Secret appears too short");
    } else if (!/^[\w.-]+$/.test(sanitizedSecret)) {
      errors.push("Client Secret contains invalid characters");
    }

    // Check for common placeholder values
    const placeholders = [
      "your-client-id",
      "your-client-secret",
      "xxxxxxxxxx",
      "1234567890",
      "client-id-here",
      "client-secret-here",
    ];

    if (placeholders.some((p) => sanitizedId.toLowerCase().includes(p))) {
      errors.push("Client ID appears to be a placeholder");
    }

    if (placeholders.some((p) => sanitizedSecret.toLowerCase().includes(p))) {
      errors.push("Client Secret appears to be a placeholder");
    }

    return {
      isValid: errors.length === 0,
      sanitizedId,
      sanitizedSecret,
      errors,
    };
  }

  /**
   * Process and validate bulk URLs
   */
  static processBulkUrls(input: string): {
    valid: Array<{ url: string; line: number }>;
    invalid: Array<{ url: string; line: number; error: string }>;
    total: number;
    summary: string;
  } {
    if (!input || typeof input !== "string") {
      return {
        valid: [],
        invalid: [],
        total: 0,
        summary: "No URLs provided",
      };
    }

    const lines = input.split("\n");
    const valid: Array<{ url: string; line: number }> = [];
    const invalid: Array<{ url: string; line: number; error: string }> = [];
    const processed = new Set<string>(); // Track duplicates

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return; // Skip empty lines

      const lineNumber = index + 1;

      // Check for duplicates
      if (processed.has(trimmed)) {
        invalid.push({
          url: trimmed,
          line: lineNumber,
          error: "Duplicate URL",
        });
        return;
      }

      processed.add(trimmed);

      const validation = this.validateUrl(trimmed);
      if (validation.isValid) {
        valid.push({
          url: validation.sanitized,
          line: lineNumber,
        });
      } else {
        invalid.push({
          url: trimmed,
          line: lineNumber,
          error: validation.error || "Invalid URL",
        });
      }
    });

    const total = valid.length + invalid.length;
    let summary = `${total} URL(s) processed`;

    if (invalid.length > 0) {
      summary += ` - ${invalid.length} invalid`;
    }

    return { valid, invalid, total, summary };
  }

  /**
   * Validate email address
   */
  static validateEmail(email: string): {
    isValid: boolean;
    sanitized: string;
    error?: string;
  } {
    if (!email || typeof email !== "string") {
      return { isValid: false, sanitized: "", error: "Email is required" };
    }

    const trimmed = email.trim().toLowerCase();

    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmed)) {
      return {
        isValid: false,
        sanitized: trimmed,
        error: "Invalid email format",
      };
    }

    // Additional checks
    if (trimmed.includes("..")) {
      return {
        isValid: false,
        sanitized: trimmed,
        error: "Invalid email format",
      };
    }

    return { isValid: true, sanitized: trimmed };
  }

  /**
   * Validate account/property ID
   */
  static validateAccountId(id: string): {
    isValid: boolean;
    sanitized: string;
    error?: string;
  } {
    if (!id || typeof id !== "string") {
      return { isValid: false, sanitized: "", error: "ID is required" };
    }

    const trimmed = id.trim();

    // Allow alphanumeric, dots, hyphens, and underscores
    if (!/^[\w.-]+$/.test(trimmed)) {
      return {
        isValid: false,
        sanitized: "",
        error: "ID contains invalid characters",
      };
    }

    return { isValid: true, sanitized: trimmed };
  }

  /**
   * Rate limiting helper for frontend
   */
  static createRateLimiter(
    maxRequests: number,
    timeWindowMs: number
  ): (key: string) => boolean {
    const requests = new Map<string, number[]>();

    return (key: string): boolean => {
      const now = Date.now();
      const keyRequests = requests.get(key) || [];

      // Remove old requests outside time window
      const validRequests = keyRequests.filter(
        (time) => now - time < timeWindowMs
      );

      if (validRequests.length >= maxRequests) {
        return false; // Rate limit exceeded
      }

      validRequests.push(now);
      requests.set(key, validRequests);

      return true;
    };
  }
}

/**
 * Custom React Hook for Input Validation
 */
export function useInputValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Record<string, string>>({});
  const [validatedValues, setValidatedValues] = useState<Record<string, any>>(
    {}
  );

  const validateUrl = useCallback(
    (value: string, fieldName: string = "url") => {
      const result = FrontendSanitizer.validateUrl(value);

      if (result.isValid) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });

        if (result.warning) {
          setWarnings((prev) => ({ ...prev, [fieldName]: result.warning }));
        } else {
          setWarnings((prev) => {
            const newWarnings = { ...prev };
            delete newWarnings[fieldName];
            return newWarnings;
          });
        }

        setValidatedValues((prev) => ({
          ...prev,
          [fieldName]: result.sanitized,
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          [fieldName]: result.error || "Invalid URL",
        }));
        setWarnings((prev) => {
          const newWarnings = { ...prev };
          delete newWarnings[fieldName];
          return newWarnings;
        });
        setValidatedValues((prev) => ({ ...prev, [fieldName]: null }));
      }

      return result;
    },
    []
  );

  const validateSitemapUrl = useCallback((value: string) => {
    const result = FrontendSanitizer.validateSitemapUrl(value);
    const fieldName = "sitemapUrl";

    if (result.isValid) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });

      if (result.warning) {
        setWarnings((prev) => ({ ...prev, [fieldName]: result.warning }));
      } else {
        setWarnings((prev) => {
          const newWarnings = { ...prev };
          delete newWarnings[fieldName];
          return newWarnings;
        });
      }

      setValidatedValues((prev) => ({
        ...prev,
        [fieldName]: result.sanitized,
      }));
    } else {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: result.error || "Invalid URL",
      }));
      setWarnings((prev) => {
        const newWarnings = { ...prev };
        delete newWarnings[fieldName];
        return newWarnings;
      });
      setValidatedValues((prev) => ({ ...prev, [fieldName]: null }));
    }

    return result;
  }, []);

  const validateOAuth = useCallback(
    (clientId: string, clientSecret: string) => {
      const result = FrontendSanitizer.validateOAuthCredentials(
        clientId,
        clientSecret
      );

      if (result.isValid) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.clientId;
          delete newErrors.clientSecret;
          delete newErrors.oauth;
          return newErrors;
        });

        setValidatedValues((prev) => ({
          ...prev,
          clientId: result.sanitizedId,
          clientSecret: result.sanitizedSecret,
        }));
      } else {
        const errorObj: Record<string, string> = {};

        result.errors.forEach((error) => {
          if (error.includes("Client ID")) {
            errorObj.clientId = error;
          } else if (error.includes("Client Secret")) {
            errorObj.clientSecret = error;
          } else {
            errorObj.oauth = error;
          }
        });

        setErrors((prev) => ({ ...prev, ...errorObj }));
      }

      return result;
    },
    []
  );

  const validateBulkUrls = useCallback((urls: string) => {
    const result = FrontendSanitizer.processBulkUrls(urls);
    const fieldName = "bulkUrls";

    if (result.invalid.length > 0) {
      const errorDetails = result.invalid
        .slice(0, 3) // Show first 3 errors
        .map((item) => `Line ${item.line}: ${item.error}`)
        .join(", ");

      const errorMsg =
        result.invalid.length > 3
          ? `${errorDetails}, and ${result.invalid.length - 3} more...`
          : errorDetails;

      setErrors((prev) => ({ ...prev, [fieldName]: errorMsg }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }

    setValidatedValues((prev) => ({
      ...prev,
      [fieldName]: result.valid.map((item) => item.url),
    }));

    return result;
  }, []);

  const clearField = useCallback((fieldName: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });

    setWarnings((prev) => {
      const newWarnings = { ...prev };
      delete newWarnings[fieldName];
      return newWarnings;
    });

    setValidatedValues((prev) => {
      const newValues = { ...prev };
      delete newValues[fieldName];
      return newValues;
    });
  }, []);

  const clearAll = useCallback(() => {
    setErrors({});
    setWarnings({});
    setValidatedValues({});
  }, []);

  return {
    errors,
    warnings,
    validatedValues,
    validateUrl,
    validateSitemapUrl,
    validateOAuth,
    validateBulkUrls,
    clearField,
    clearAll,
    hasErrors: Object.keys(errors).length > 0,
    hasWarnings: Object.keys(warnings).length > 0,
  };
}

// Export validation components for use in the main GSC component
export { FrontendSanitizer as Sanitizer };
