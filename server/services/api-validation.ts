// Create this file: server/services/api-validation.ts

export class ApiValidationService {
  async validateOpenAIKey(
    apiKey: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      if (response.ok) {
        return { valid: true };
      } else if (response.status === 401) {
        return { valid: false, error: "Invalid OpenAI API key" };
      } else if (response.status === 429) {
        return { valid: false, error: "OpenAI API rate limit exceeded" };
      } else {
        return { valid: false, error: `OpenAI API error: ${response.status}` };
      }
    } catch (error) {
      return {
        valid: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to validate OpenAI key",
      };
    }
  }

  async validateAnthropicKey(
    apiKey: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1,
          messages: [{ role: "user", content: "test" }],
        }),
        timeout: 10000,
      });

      if (response.ok) {
        return { valid: true };
      } else if (response.status === 401) {
        return { valid: false, error: "Invalid Anthropic API key" };
      } else if (response.status === 429) {
        return { valid: false, error: "Anthropic API rate limit exceeded" };
      } else {
        return {
          valid: false,
          error: `Anthropic API error: ${response.status}`,
        };
      }
    } catch (error) {
      return {
        valid: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to validate Anthropic key",
      };
    }
  }

  async validateGooglePageSpeedKey(
    apiKey: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const testUrl = "https://www.google.com";
      const response = await fetch(
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
          testUrl
        )}&key=${apiKey}`,
        {
          timeout: 10000,
        }
      );

      if (response.ok) {
        return { valid: true };
      } else if (response.status === 400) {
        const data = await response.json().catch(() => ({}));
        if (data.error?.message?.includes("API key not valid")) {
          return { valid: false, error: "Invalid Google PageSpeed API key" };
        }
        return {
          valid: false,
          error: "Google PageSpeed API configuration error",
        };
      } else if (response.status === 403) {
        return {
          valid: false,
          error: "Google PageSpeed API key lacks required permissions",
        };
      } else if (response.status === 429) {
        return { valid: false, error: "Google PageSpeed API quota exceeded" };
      } else {
        return {
          valid: false,
          error: `Google PageSpeed API error: ${response.status}`,
        };
      }
    } catch (error) {
      return {
        valid: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to validate Google PageSpeed key",
      };
    }
  }

  async validateApiKey(
    provider: string,
    apiKey: string
  ): Promise<{ valid: boolean; error?: string }> {
    switch (provider) {
      case "openai":
        return this.validateOpenAIKey(apiKey);
      case "anthropic":
        return this.validateAnthropicKey(apiKey);
      case "google_pagespeed":
        return this.validateGooglePageSpeedKey(apiKey);
      default:
        return { valid: false, error: "Unsupported provider" };
    }
  }

  getProviderDisplayName(provider: string): string {
    switch (provider) {
      case "openai":
        return "OpenAI GPT-4";
      case "anthropic":
        return "Anthropic Claude";
      case "google_pagespeed":
        return "Google PageSpeed Insights";
      default:
        return provider;
    }
  }

  getSupportedProviders(): string[] {
    return ["openai", "anthropic", "google_pagespeed"];
  }
}

export const apiValidationService = new ApiValidationService();
