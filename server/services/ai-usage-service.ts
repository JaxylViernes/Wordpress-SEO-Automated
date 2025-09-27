// server/services/ai-usage-service.ts

import { storage } from "../storage";
import { calculateTokenCost, calculateImageCost } from "server/services/ai-pricing";

interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

interface TrackingOptions {
  userId: string;
  websiteId?: string;
  model: string;
  operation: string;
  tokens: TokenUsage;
  keyType?: 'user' | 'system';
  metadata?: any;
}

class AIUsageService {
  /**
   * Track AI usage with accurate cost calculation
   */
  async trackUsage(options: TrackingOptions): Promise<void> {
    const { userId, websiteId, model, operation, tokens, keyType, metadata } = options;
    
    // Calculate input/output tokens
    let inputTokens = tokens.inputTokens || 0;
    let outputTokens = tokens.outputTokens || 0;
    
    // If only totalTokens is provided, estimate split (30% input, 70% output typical)
    if (!tokens.inputTokens && !tokens.outputTokens && tokens.totalTokens) {
      inputTokens = Math.round(tokens.totalTokens * 0.3);
      outputTokens = Math.round(tokens.totalTokens * 0.7);
    }
    
    const totalTokens = inputTokens + outputTokens;
    const costUsd = calculateTokenCost(model, inputTokens, outputTokens);
    
    // Convert to cents for storage
    const costCents = Math.round(costUsd * 100);
    
    console.log(`📊 AI Usage: ${model} - ${operation}`, {
      inputTokens,
      outputTokens,
      totalTokens,
      costUsd: costUsd.toFixed(4),
      costCents,
      keyType
    });
    
    // Store in database
    if (websiteId) {
      try {
        await storage.trackAiUsage({
          userId,
          websiteId,
          model,
          operation,
          tokensUsed: totalTokens,
          costUsd: costCents, // Note: storing cents as "costUsd" for backward compatibility
          metadata: {
            ...metadata,
            inputTokens,
            outputTokens,
            actualCostUsd: costUsd,
            keyType
          }
        });
      } catch (error) {
        console.error('Failed to track AI usage:', error);
      }
    }
    
    // Update daily/monthly limits for auto-schedules if applicable
    if (metadata?.autoScheduleId) {
      await this.updateAutoScheduleLimits(metadata.autoScheduleId, costUsd);
    }
  }
  
  /**
   * Track image generation costs
   */
  async trackImageGeneration(options: {
    userId: string;
    websiteId?: string;
    contentId?: string;
    model: string;
    count: number;
    size?: string;
    quality?: string;
  }): Promise<number> {
    const { userId, websiteId, contentId, model, count, size, quality } = options;
    
    const costUsd = calculateImageCost(model, count, size, quality);
    const costCents = Math.round(costUsd * 100);
    
    console.log(`🎨 Image Generation: ${model}`, {
      count,
      size: size || '1024x1024',
      quality: quality || 'standard',
      costUsd: costUsd.toFixed(4),
      costCents
    });
    
    if (websiteId) {
      await storage.trackAiUsage({
        userId,
        websiteId,
        model,
        operation: 'image_generation',
        tokensUsed: 0, // Images don't use tokens
        costUsd: costCents,
        metadata: {
          contentId,
          imageCount: count,
          imageSize: size,
          imageQuality: quality,
          actualCostUsd: costUsd
        }
      });
    }
    
    return costCents;
  }
  
  /**
   * Estimate cost before running operation
   */
  async estimateCost(
    model: string,
    estimatedInputTokens: number,
    estimatedOutputTokens: number
  ): Promise<{ costUsd: number; costCents: number; warning?: string }> {
    const costUsd = calculateTokenCost(model, estimatedInputTokens, estimatedOutputTokens);
    const costCents = Math.round(costUsd * 100);
    
    let warning: string | undefined;
    if (costUsd > 1.0) {
      warning = `High cost operation: $${costUsd.toFixed(2)}`;
    }
    
    return { costUsd, costCents, warning };
  }
  
  /**
   * Get usage statistics for a user
   */
  async getUserStats(userId: string, period: 'day' | 'week' | 'month' = 'month'): Promise<{
    totalCostCents: number;
    totalTokens: number;
    operationBreakdown: Record<string, number>;
    modelBreakdown: Record<string, number>;
  }> {
    // This would query the aiUsageTracking table
    // Implementation depends on your database structure
    const cutoffDate = new Date();
    if (period === 'day') cutoffDate.setDate(cutoffDate.getDate() - 1);
    else if (period === 'week') cutoffDate.setDate(cutoffDate.getDate() - 7);
    else cutoffDate.setMonth(cutoffDate.getMonth() - 1);
    
    // Placeholder - implement based on your storage
    return {
      totalCostCents: 0,
      totalTokens: 0,
      operationBreakdown: {},
      modelBreakdown: {}
    };
  }
  
  /**
   * Update auto-schedule cost tracking
   */
  private async updateAutoScheduleLimits(scheduleId: string, costUsd: number): Promise<void> {
    try {
      const schedule = await storage.getAutoSchedule(scheduleId);
      if (!schedule) return;
      
      // Fix the malformed cost issue
      const currentCostToday = parseFloat(String(schedule.costToday || 0));
      const newCostToday = currentCostToday + costUsd;
      
      await storage.updateAutoSchedule(scheduleId, {
        costToday: newCostToday,
        postsThisMonth: (schedule.postsThisMonth || 0) + 1
      });
      
      // Check limits
      if (newCostToday > (schedule.maxDailyCost || 10)) {
        console.warn(`⚠️ Auto-schedule ${scheduleId} exceeded daily cost limit`);
        // Could disable the schedule here
      }
    } catch (error) {
      console.error('Failed to update auto-schedule limits:', error);
    }
  }
}

export const aiUsageService = new AIUsageService();