// server/services/api-usage-tracker.ts
import { storage } from "../storage";

interface UsageTrackingData {
  userId: string;
  websiteId?: string;
  provider: 'openai' | 'anthropic' | 'gemini' | 'google';
  model: string;
  operation: string;
  keyType: 'user' | 'system';
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  costUsd?: number;
  metadata?: Record<string, any>;
}

// Accurate pricing as of 2024
const MODEL_PRICING = {
  openai: {
    'gpt-4o': { input: 0.005, output: 0.015 }, // per 1k tokens
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'dall-e-3': { 
      standard: { '1024x1024': 0.04, '1024x1792': 0.08, '1792x1024': 0.08 },
      hd: { '1024x1024': 0.08, '1024x1792': 0.12, '1792x1024': 0.12 }
    }
  },
  anthropic: {
    'claude-3-5-sonnet-latest': { input: 0.003, output: 0.015 },
    'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 }
  },
  gemini: {
    'gemini-1.5-flash-8b': { input: 0.00025, output: 0.00075 },
    'gemini-1.5-flash': { input: 0.00035, output: 0.00105 },
    'gemini-1.5-pro': { input: 0.00125, output: 0.00375 }
  }
};

class ApiUsageTracker {
  private calculateCost(data: UsageTrackingData): number {
    // For image generation
    if (data.model === 'dall-e-3' && data.metadata?.imageSize) {
      const quality = data.metadata.quality || 'standard';
      const size = data.metadata.imageSize || '1024x1024';
      return MODEL_PRICING.openai['dall-e-3'][quality]?.[size] || 0.04;
    }

    // For text models
    const providerPricing = MODEL_PRICING[data.provider];
    if (!providerPricing) {
      console.warn(`Unknown provider for pricing: ${data.provider}`);
      return 0;
    }

    const modelPricing = providerPricing[data.model];
    if (!modelPricing || typeof modelPricing === 'object' && !('input' in modelPricing)) {
      console.warn(`Unknown model for pricing: ${data.provider}/${data.model}`);
      // Fallback pricing
      return this.calculateFallbackCost(data);
    }

    const pricing = modelPricing as { input: number; output: number };
    let cost = 0;

    if (data.inputTokens) {
      cost += (data.inputTokens / 1000) * pricing.input;
    }
    if (data.outputTokens) {
      cost += (data.outputTokens / 1000) * pricing.output;
    }

    // If only total tokens provided, use average
    if (!data.inputTokens && !data.outputTokens && data.totalTokens) {
      const avgPrice = (pricing.input + pricing.output) / 2;
      cost = (data.totalTokens / 1000) * avgPrice;
    }

    return cost;
  }

  private calculateFallbackCost(data: UsageTrackingData): number {
    // Conservative fallback pricing
    const fallbackRates = {
      openai: 0.01,
      anthropic: 0.008,
      gemini: 0.001
    };
    
    const rate = fallbackRates[data.provider] || 0.005;
    const tokens = data.totalTokens || (data.inputTokens || 0) + (data.outputTokens || 0);
    return (tokens / 1000) * rate;
  }

  async trackUsage(data: UsageTrackingData): Promise<void> {
    try {
      // Calculate cost if not provided
      const costUsd = data.costUsd ?? this.calculateCost(data);
      
      // Convert to cents for storage
      const costCents = Math.max(1, Math.round(costUsd * 100));
      
      // Store in database
      await storage.trackAiUsage({
        websiteId: data.websiteId,
        userId: data.userId,
        model: data.model,
        tokensUsed: data.totalTokens || (data.inputTokens || 0) + (data.outputTokens || 0),
        costUsd: costCents,
        operation: data.operation,
        keyType: data.keyType
      });

      // Log for monitoring
      console.log(`📊 API Usage Tracked:`, {
        provider: data.provider,
        model: data.model,
        operation: data.operation,
        keyType: data.keyType,
        tokens: data.totalTokens || `in:${data.inputTokens} out:${data.outputTokens}`,
        cost: `$${costUsd.toFixed(6)}`,
        user: data.userId.substring(0, 8) + '...'
      });

      // Update user's API key usage counter if using their key
      if (data.keyType === 'user') {
        await this.updateUserKeyUsageCounter(data.userId, data.provider);
      }
    } catch (error) {
      console.error('Failed to track API usage:', error);
      // Don't throw - tracking failures shouldn't break the main flow
    }
  }

  private async updateUserKeyUsageCounter(userId: string, provider: string): Promise<void> {
    try {
      const userApiKeys = await storage.getUserApiKeys(userId);
      const apiKey = userApiKeys.find(
        (key: any) => 
          key.provider === provider && 
          key.isActive && 
          key.validationStatus === 'valid'
      );

      if (apiKey && apiKey.id) {
        const currentCount = typeof apiKey.usageCount === 'number' 
          ? apiKey.usageCount 
          : 0;
        
        await storage.updateUserApiKey(userId, apiKey.id, {
          usageCount: currentCount + 1,
          lastUsed: new Date()
        });
      }
    } catch (error) {
      console.warn('Failed to update API key usage counter:', error);
    }
  }

  // Helper method to get cost estimate before making API call
  estimateCost(
    provider: string,
    model: string,
    estimatedTokens: number
  ): { min: number; max: number; average: number } {
    const providerPricing = MODEL_PRICING[provider];
    if (!providerPricing) {
      return { min: 0, max: 0, average: 0 };
    }

    const modelPricing = providerPricing[model];
    if (!modelPricing || typeof modelPricing !== 'object' || !('input' in modelPricing)) {
      return { min: 0, max: 0, average: 0 };
    }

    const pricing = modelPricing as { input: number; output: number };
    const min = (estimatedTokens / 1000) * Math.min(pricing.input, pricing.output);
    const max = (estimatedTokens / 1000) * Math.max(pricing.input, pricing.output);
    const average = (estimatedTokens / 1000) * ((pricing.input + pricing.output) / 2);

    return { min, max, average };
  }
}

export const apiUsageTracker = new ApiUsageTracker();