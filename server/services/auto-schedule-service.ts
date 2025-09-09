import { storage } from "../storage";
import { aiService } from "./ai-service";
import { schedulerService } from "./scheduler-service";

export class AutoScheduleService {
  private isProcessing = false;

  async processAutoSchedules(): Promise<{
    processed: number;
    generated: number;
    failed: number;
    results: any[];
  }> {
    if (this.isProcessing) {
      console.log("⏳ Auto-schedule processor already running...");
      return { processed: 0, generated: 0, failed: 0, results: [] };
    }

    this.isProcessing = true;
    console.log("🤖 Starting auto-content generation...");

    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.toLocaleDateString("en-US", { weekday: "long" });

      // Get active schedules that should run now
      const schedules = await storage.getActiveAutoSchedules();
      const results = [];

      for (const schedule of schedules) {
        if (!this.shouldRunSchedule(schedule, currentHour, currentDay)) {
          continue;
        }

        // Check daily cost limit
        if (schedule.costToday >= schedule.maxDailyCost) {
          console.log(
            `💰 Daily cost limit reached for schedule: ${schedule.name}`
          );
          continue;
        }

        // Check monthly post limit
        if (schedule.postsThisMonth >= schedule.maxMonthlyPosts) {
          console.log(
            `📊 Monthly post limit reached for schedule: ${schedule.name}`
          );
          continue;
        }

        try {
          console.log(`🚀 Running auto-schedule: ${schedule.name}`);

          // Select topic based on rotation strategy
          const topic = this.selectTopic(schedule);

          // Generate content
          const generationResult = await this.generateContent(schedule, topic);

          if (generationResult.success) {
            // Update schedule metrics
            await storage.updateAutoSchedule(schedule.id, {
              lastRun: now,
              postsThisMonth: schedule.postsThisMonth + 1,
              costToday: schedule.costToday + generationResult.cost,
              nextTopicIndex:
                schedule.topicRotation === "sequential"
                  ? (schedule.nextTopicIndex + 1) % schedule.topics.length
                  : schedule.nextTopicIndex,
            });

            // If auto-publish is enabled, schedule the content
            if (schedule.autoPublish) {
              const publishTime = new Date(
                now.getTime() + schedule.publishDelay * 60 * 60 * 1000
              );

              await storage.createContentSchedule({
                contentId: generationResult.contentId,
                userId: schedule.userId,
                websiteId: schedule.websiteId,
                scheduledFor: publishTime,
                status: "scheduled",
                topic: topic,
                metadata: {
                  autoScheduleId: schedule.id,
                  autoScheduleName: schedule.name,
                },
              });

              console.log(
                `📅 Content scheduled for publishing at ${publishTime}`
              );
            }

            // Log activity
            await storage.createActivityLog({
              userId: schedule.userId,
              websiteId: schedule.websiteId,
              type: "auto_content_generated",
              description: `Auto-generated content: "${topic}"`,
              metadata: {
                scheduleId: schedule.id,
                scheduleName: schedule.name,
                contentId: generationResult.contentId,
                cost: generationResult.cost,
                autoPublish: schedule.autoPublish,
              },
            });

            results.push({
              scheduleId: schedule.id,
              success: true,
              contentId: generationResult.contentId,
              topic,
              cost: generationResult.cost,
            });
          } else {
            throw new Error(generationResult.error);
          }
        } catch (error) {
          console.error(`❌ Failed to process schedule ${schedule.id}:`, error);

          await storage.createActivityLog({
            userId: schedule.userId,
            websiteId: schedule.websiteId,
            type: "auto_content_failed",
            description: `Failed to auto-generate content for: ${schedule.name}`,
            metadata: {
              scheduleId: schedule.id,
              error: error instanceof Error ? error.message : "Unknown error",
            },
          });

          results.push({
            scheduleId: schedule.id,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      const generated = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      console.log(
        `✅ Auto-generation complete: ${generated} generated, ${failed} failed`
      );

      return {
        processed: results.length,
        generated,
        failed,
        results,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  private shouldRunSchedule(
    schedule: any,
    currentHour: number,
    currentDay: string
  ): boolean {
    // Check if it's time to run
    const scheduleHour = parseInt(schedule.timeOfDay.split(":")[0]);
    if (scheduleHour !== currentHour) return false;

    // Check if already run today
    if (schedule.lastRun) {
      const lastRunDate = new Date(schedule.lastRun).toDateString();
      const today = new Date().toDateString();
      if (lastRunDate === today) return false;
    }

    // Check frequency
    switch (schedule.frequency) {
      case "daily":
        return true;

      case "twice_weekly":
        return currentDay === "Monday" || currentDay === "Thursday";

      case "weekly":
        return currentDay === "Monday";

      case "biweekly":
        if (!schedule.lastRun) return currentDay === "Monday";
        const daysSinceLastRun = Math.floor(
          (Date.now() - new Date(schedule.lastRun).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        return daysSinceLastRun >= 14 && currentDay === "Monday";

      case "monthly":
        const today = new Date().getDate();
        return today === 1;

      case "custom":
        const customDays = schedule.customDays || [];
        return customDays.includes(currentDay);

      default:
        return false;
    }
  }

  private selectTopic(schedule: any): string {
    const topics = schedule.topics || [];
    if (topics.length === 0) return "General content";

    if (schedule.topicRotation === "sequential") {
      const index = schedule.nextTopicIndex || 0;
      return topics[index % topics.length];
    } else {
      // Random selection
      return topics[Math.floor(Math.random() * topics.length)];
    }
  }

  private async generateContent(schedule: any, topic: string): Promise<any> {
    try {
      // Call your existing AI content generation service
      const result = await aiService.generateContent({
        websiteId: schedule.websiteId,
        topic: topic,
        keywords: schedule.keywords?.split(",").map((k: string) => k.trim()),
        tone: schedule.tone,
        wordCount: schedule.wordCount,
        brandVoice: schedule.brandVoice,
        targetAudience: schedule.targetAudience,
        eatCompliance: schedule.eatCompliance,
        aiProvider: schedule.aiProvider,
        includeImages: schedule.includeImages,
        imageCount: schedule.imageCount,
        imageStyle: schedule.imageStyle,
        seoOptimized: schedule.seoOptimized,
        isAutoGenerated: true,
        autoScheduleId: schedule.id,
      });

      return {
        success: true,
        contentId: result.contentId,
        cost: result.totalCost || 0,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Content generation failed",
      };
    }
  }

  // Reset daily costs at midnight
  async resetDailyCosts(): Promise<void> {
    console.log("💰 Resetting daily cost counters...");
    await storage.resetAutoScheduleDailyCosts();
  }

  // Reset monthly post counts at the start of each month
  async resetMonthlyCounts(): Promise<void> {
    console.log("📊 Resetting monthly post counters...");
    await storage.resetAutoScheduleMonthlyCounts();
  }
}

export const autoScheduleService = new AutoScheduleService();
