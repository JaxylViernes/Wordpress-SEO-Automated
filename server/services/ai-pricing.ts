// server/config/ai-pricing.ts

export interface ModelPricing {
  inputPer1M: number;  // USD per 1M input tokens
  outputPer1M: number; // USD per 1M output tokens
  imagePer1k?: number; // USD per 1k images (for DALL-E)
}

// Pricing as of late 2024 (verify with provider docs)
export const AI_PRICING: Record<string, ModelPricing> = {
  // OpenAI Models
  'gpt-4o': {
    inputPer1M: 2.50,
    outputPer1M: 10.00
  },
  'gpt-4o-mini': {
    inputPer1M: 0.15,
    outputPer1M: 0.60
  },
  'gpt-4-turbo': {
    inputPer1M: 10.00,
    outputPer1M: 30.00
  },
  'gpt-3.5-turbo': {
    inputPer1M: 0.50,
    outputPer1M: 1.50
  },
  'dall-e-3': {
    inputPer1M: 0,
    outputPer1M: 0,
    imagePer1k: 40.00 // Standard quality 1024x1024
  },
  
  // Anthropic Models
  'claude-3-5-sonnet-latest': {
    inputPer1M: 3.00,
    outputPer1M: 15.00
  },
  'claude-3-opus': {
    inputPer1M: 15.00,
    outputPer1M: 75.00
  },
  'claude-3-haiku': {
    inputPer1M: 0.25,
    outputPer1M: 1.25
  },
  
  // Google Models (if you add Gemini)
  'gemini-1.5-pro': {
    inputPer1M: 1.25,
    outputPer1M: 5.00
  },
  'gemini-1.5-flash': {
    inputPer1M: 0.075,
    outputPer1M: 0.30
  }
};

export function calculateTokenCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = AI_PRICING[model];
  if (!pricing) {
    console.warn(`No pricing found for model: ${model}, using default`);
    return (inputTokens * 0.01 + outputTokens * 0.03) / 1000; // Fallback
  }
  
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  
  return inputCost + outputCost;
}

export function calculateImageCost(
  model: string,
  count: number,
  size: string = '1024x1024',
  quality: string = 'standard'
): number {
  const pricing = AI_PRICING[model];
  if (!pricing?.imagePer1k) {
    return 0;
  }
  
  // Adjust for size and quality
  let multiplier = 1;
  if (size === '1792x1024' || size === '1024x1792') multiplier = 2;
  if (quality === 'hd') multiplier *= 2;
  
  return (count / 1000) * pricing.imagePer1k * multiplier;
}