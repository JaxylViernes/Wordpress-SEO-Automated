import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  metadata?: {
    model?: string;
    organization?: string;
    limits?: any;
  };
}

export class ApiKeyValidationService {
  
  static async validateOpenAI(apiKey: string): Promise<ValidationResult> {
    try {
      const openai = new OpenAI({ apiKey });
      
      // Test with a minimal request to list models
      const response = await openai.models.list();
      
      const hasGPT4 = response.data.some(model => model.id.includes('gpt-4'));
      
      return {
        isValid: true,
        metadata: {
          model: hasGPT4 ? 'gpt-4o available' : 'gpt-3.5 available',
          organization: response.data[0]?.owned_by || 'unknown'
        }
      };
    } catch (error: any) {
      let errorMessage = 'Invalid OpenAI API key';
      
      if (error.status === 401) {
        errorMessage = 'Invalid API key - authentication failed';
      } else if (error.status === 429) {
        errorMessage = 'API key valid but rate limited';
      } else if (error.status === 403) {
        errorMessage = 'API key valid but insufficient permissions';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        isValid: false,
        error: errorMessage
      };
    }
  }

  static async validateAnthropic(apiKey: string): Promise<ValidationResult> {
    try {
      const anthropic = new Anthropic({ apiKey });
      
      // Test with a minimal message
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307', // Use cheaper model for validation
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }]
      });
      
      return {
        isValid: true,
        metadata: {
          model: 'Claude models available'
        }
      };
    } catch (error: any) {
      let errorMessage = 'Invalid Anthropic API key';
      
      if (error.status === 401) {
        errorMessage = 'Invalid API key - authentication failed';
      } else if (error.status === 429) {
        errorMessage = 'API key valid but rate limited';
      } else if (error.status === 403) {
        errorMessage = 'API key valid but insufficient permissions';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        isValid: false,
        error: errorMessage
      };
    }
  }

  static async validateGooglePageSpeed(apiKey: string): Promise<ValidationResult> {
    try {
      // Test with Google PageSpeed Insights API using a simple URL
      const testUrl = 'https://example.com';
      const response = await axios.get(
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(testUrl)}&key=${apiKey}&strategy=mobile&category=PERFORMANCE`,
        { 
          timeout: 15000,
          validateStatus: function (status) {
            // Accept 2xx and some 4xx responses for validation
            return status < 500;
          }
        }
      );

      if (response.status === 200) {
        return {
          isValid: true,
          metadata: {
            service: 'PageSpeed Insights API'
          }
        };
      } else if (response.status === 403) {
        const errorData = response.data?.error;
        if (errorData?.message?.includes('API key not valid')) {
          return {
            isValid: false,
            error: 'Invalid Google API key'
          };
        } else {
          return {
            isValid: false,
            error: 'API key valid but PageSpeed Insights API not enabled'
          };
        }
      } else {
        return {
          isValid: false,
          error: `API validation failed with status ${response.status}`
        };
      }
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        return {
          isValid: false,
          error: 'Validation timeout - please try again'
        };
      }
      
      const errorMessage = error.response?.data?.error?.message || error.message || 'Invalid Google API key';
      
      return {
        isValid: false,
        error: errorMessage
      };
    }
  }

  static async validateApiKey(provider: string, apiKey: string): Promise<ValidationResult> {
    if (!apiKey || apiKey.trim().length === 0) {
      return {
        isValid: false,
        error: 'API key cannot be empty'
      };
    }

    switch (provider.toLowerCase()) {
      case 'openai':
        if (!apiKey.startsWith('sk-') && !apiKey.startsWith('sk-proj-')) {
          return {
            isValid: false,
            error: 'OpenAI API keys should start with "sk-" or "sk-proj-"'
          };
        }
        return this.validateOpenAI(apiKey);
        
      case 'anthropic':
        if (!apiKey.startsWith('sk-ant-')) {
          return {
            isValid: false,
            error: 'Anthropic API keys should start with "sk-ant-"'
          };
        }
        return this.validateAnthropic(apiKey);
        
      case 'google_pagespeed':
        if (!apiKey.startsWith('AIza')) {
          return {
            isValid: false,
            error: 'Google API keys typically start with "AIza"'
          };
        }
        return this.validateGooglePageSpeed(apiKey);
        
      default:
        return {
          isValid: false,
          error: `Unknown provider: ${provider}`
        };
    }
  }
}