//server/services/auto-schedule-service.ts
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
      // CRITICAL: Use UTC hours and day for comparison with UTC-stored times
      const currentUTCHour = now.getUTCHours();
      const currentUTCMinutes = now.getUTCMinutes();
      const currentUTCDay = now.toLocaleDateString("en-US", { 
        weekday: "long",
        timeZone: 'UTC' 
      });

      console.log(`🕐 Current UTC time: ${currentUTCHour}:${String(currentUTCMinutes).padStart(2, '0')} UTC (${currentUTCDay})`);
      console.log(`📍 Server local time: ${now.toLocaleString()}`);

      // Get active schedules that should run now
      const schedules = await storage.getActiveAutoSchedules();
      
      const results = [];

      for (const schedule of schedules) {
        const shouldRun = await this.shouldRunScheduleUTC(schedule, currentUTCHour, currentUTCMinutes, currentUTCDay);
        if (!shouldRun) {
          continue;
        }

        // Check daily cost limit
        const currentCost = parseFloat(schedule.costToday) || 0;
        const maxCost = parseFloat(schedule.maxDailyCost) || 5.00;
        if (currentCost >= maxCost) {
          console.log(
            `💰 Daily cost limit reached for schedule: ${schedule.name} ($${currentCost.toFixed(2)}/$${maxCost.toFixed(2)})`
          );
          continue;
        }

        // Check monthly post limit
        const postsThisMonth = schedule.postsThisMonth || 0;
        const maxMonthlyPosts = schedule.maxMonthlyPosts || 30;
        if (postsThisMonth >= maxMonthlyPosts) {
          console.log(
            `📊 Monthly post limit reached for schedule: ${schedule.name} (${postsThisMonth}/${maxMonthlyPosts})`
          );
          continue;
        }

        try {
          console.log(`🚀 Running auto-schedule: ${schedule.name}`);
          if (schedule.localTimeDisplay && schedule.timezone) {
            console.log(`   (${schedule.localTimeDisplay} ${schedule.timezone})`);
          }

          // Select topic based on rotation strategy
          const topic = this.selectTopic(schedule);

          // Generate content
          const generationResult = await this.generateContent(schedule, topic);

          if (generationResult.success) {
            // Update schedule metrics with proper numeric conversion
            const currentCostToday = parseFloat(schedule.costToday) || 0;
            const generationCost = parseFloat(generationResult.cost) || 0;
            const newCostToday = currentCostToday + generationCost;
            
            // Calculate next topic index safely
            const topicsLength = schedule.topics?.length || 1;
            const currentIndex = schedule.nextTopicIndex || 0;
            const nextIndex = schedule.topicRotation === 'sequential' 
              ? (currentIndex + 1) % topicsLength 
              : currentIndex;
            
            await storage.updateAutoSchedule(schedule.id, {
              lastRun: now,
              lastRunUTC: now.toISOString(),
              postsThisMonth: postsThisMonth + 1,
              costToday: newCostToday,
              nextTopicIndex: nextIndex
            });
            
            console.log(`💰 Updated schedule costs: Previous: $${currentCostToday.toFixed(6)}, Generation: $${generationCost.toFixed(6)}, New Total: $${newCostToday.toFixed(6)}`);

            if (schedule.autoPublish) {
              let publishTime: Date;
              let scheduleStatus: string;
              
              if (schedule.publishDelay === 0 || !schedule.publishDelay) {
                publishTime = new Date();
                scheduleStatus = 'publishing';
                console.log(`📌 Setting up immediate publishing for content ${generationResult.contentId}`);
              } else {
                publishTime = new Date(
                  now.getTime() + (schedule.publishDelay || 0) * 60 * 60 * 1000
                );
                scheduleStatus = 'scheduled';
                console.log(`⏰ Scheduling content for ${publishTime.toISOString()}`);
              }

              const scheduleData = {
                contentId: generationResult.contentId,
                userId: schedule.userId,
                websiteId: schedule.websiteId,
                scheduled_date: publishTime,
                status: scheduleStatus,
                title: generationResult.title || topic || 'Auto-generated content',
                topic: topic,
                timezone: schedule.timezone || 'UTC',
                metadata: {
                  autoScheduleId: schedule.id,
                  autoScheduleName: schedule.name,
                  topic: topic,
                  publishDelay: schedule.publishDelay || 0,
                  generatedAt: new Date(),
                  isAutoGenerated: true,
                  scheduledTimeUTC: schedule.timeOfDay,
                  originalTimezone: schedule.timezone,
                  localTimeDisplay: schedule.localTimeDisplay
                },
              };
              console.log('📋 Creating content_schedule with data:', {
                contentId: scheduleData.contentId,
                userId: scheduleData.userId,
                websiteId: scheduleData.websiteId,
                scheduled_date: scheduleData.scheduled_date?.toISOString(),
                status: scheduleData.status,
                title: scheduleData.title,
                topic: scheduleData.topic,
              });

              try {
                await storage.createContentSchedule(scheduleData);
                console.log('✅ Content schedule created successfully');
              } catch (dbError: any) {
                console.error('❌ Database error when creating content_schedule:', dbError);
                console.error('Failed with data:', JSON.stringify(scheduleData, null, 2));
                throw dbError;
              }

              if (schedule.publishDelay === 0) {
                try {
                  console.log(`🚀 Attempting immediate publish for content ${generationResult.contentId}`);
                  const publishResult = await this.publishToWordPress(
                    generationResult.contentId,
                    schedule.websiteId,
                    schedule.userId
                  );
                  
                  if (publishResult && publishResult.success) {
                    await storage.updateContentScheduleByContentId(generationResult.contentId, {
                      status: 'published',
                      published_at: new Date(),
                      metadata: {
                        wordPressPostId: publishResult.postId,
                        publishedAt: new Date().toISOString()
                      }
                    });
                    
                    console.log(`✅ Content published immediately (WordPress Post ID: ${publishResult.postId})`);
                  } else {
                    await storage.updateContentScheduleByContentId(generationResult.contentId, {
                      status: 'failed',
                      error: publishResult?.error || 'Publishing failed'
                    });
                    
                    console.error(`❌ Failed to publish immediately: ${publishResult?.error}`);
                  }
                } catch (publishError: any) {
                  console.error(`❌ Publishing error: ${publishError.message}`);
                  try {
                    await storage.updateContentScheduleByContentId(generationResult.contentId, {
                      status: 'failed',
                      error: publishError.message
                    });
                  } catch (updateError) {
                    console.error('Failed to update status:', updateError);
                  }
                }
              } else {
                console.log(`📅 Content scheduled for publishing at ${publishTime.toISOString()}`);
              }
            } else {
              console.log(`📝 Saving content ${generationResult.contentId} as draft`);
              
              const draftData = {
                contentId: generationResult.contentId,
                userId: schedule.userId,
                websiteId: schedule.websiteId,
                scheduled_date: new Date(),
                status: 'draft',
                title: generationResult.title || topic || 'Auto-generated draft',
                topic: topic,
                timezone: schedule.timezone || 'UTC',
                metadata: {
                  autoScheduleId: schedule.id,
                  autoScheduleName: schedule.name,
                  topic: topic,
                  isDraft: true,
                  generatedAt: new Date(),
                  isAutoGenerated: true,
                },
              };
              
              console.log('📋 Creating draft content_schedule with data:', {
                contentId: draftData.contentId,
                scheduled_date: draftData.scheduled_date?.toISOString(),
                title: draftData.title,
                topic: draftData.topic,
              });
              
              try {
                await storage.createContentSchedule(draftData);
                console.log('✅ Draft schedule created successfully');
              } catch (dbError: any) {
                console.error('❌ Database error when creating draft schedule:', dbError);
                console.error('Failed with data:', JSON.stringify(draftData, null, 2));
                throw dbError;
              }
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
                publishStatus: schedule.autoPublish 
                  ? (schedule.publishDelay === 0 ? 'immediate' : 'scheduled')
                  : 'draft',
                generatedAtUTC: now.toISOString(),
                scheduleTimeUTC: schedule.timeOfDay,
                userTimezone: schedule.timezone
              },
            });

            results.push({
              scheduleId: schedule.id,
              scheduleName: schedule.name,
              success: true,
              contentId: generationResult.contentId,
              topic,
              cost: generationResult.cost,
              published: schedule.autoPublish && schedule.publishDelay === 0,
              scheduled: schedule.autoPublish && schedule.publishDelay > 0,
            });
            
            console.log(`✅ Successfully processed schedule: ${schedule.name}`);
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
              attemptedAt: now.toISOString()
            },
          });

          results.push({
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      const generated = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      console.log(
        `\n✅ Auto-generation complete: ${generated} generated, ${failed} failed`
      );

      if (results.length > 0) {
        console.log('📊 Results summary:');
        results.forEach(r => {
          if (r.success) {
            console.log(`   ✅ ${r.scheduleName}: Content generated (${r.topic})`);
          } else {
            console.log(`   ❌ ${r.scheduleName}: Failed - ${r.error}`);
          }
        });
      }

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

  private async publishToWordPress(
    contentId: string,
    websiteId: string,
    userId: string
  ): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const content = await storage.getContent(contentId);
      if (!content) {
        return { success: false, error: 'Content not found' };
      }
      
      const website = await storage.getUserWebsite(websiteId, userId);
      if (!website) {
        return { success: false, error: 'Website not found' };
      }
      
      if (!website.url || !website.wpUsername || !website.wpApplicationPassword) {
        console.error('WordPress configuration missing:', {
          hasUrl: !!website.url,
          hasUsername: !!website.wpUsername,
          hasAppPassword: !!website.wpApplicationPassword
        });
        return { 
          success: false, 
          error: 'WordPress configuration incomplete. Please provide your WordPress username and application password.' 
        };
      }
      
      const baseUrl = website.url.replace(/\/$/, '');
      const apiUrl = `${baseUrl}/wp-json/wp/v2/posts`;
      
      const postData = {
        title: content.title,
        content: content.body || content.content || '',
        status: 'publish',
        excerpt: content.excerpt || '',
        format: 'standard',
        meta: {
          _yoast_wpseo_metadesc: content.metaDescription || content.meta_description || '',
          _yoast_wpseo_title: content.metaTitle || content.meta_title || content.title,
        }
      };
      
      const auth = Buffer.from(
        `${website.wpUsername}:${website.wpApplicationPassword}`
      ).toString('base64');
      
      console.log(`📡 Publishing to WordPress: ${apiUrl}`);
    console.log(`🔐 Authenticating as WordPress user: ${website.wpUsername}`);
      console.log(`📝 Post title: ${postData.title}`);
    console.log(`📄 Status: ${postData.status} (forced immediate publishing)`);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
          'User-Agent': 'SEO-Content-Generator/1.0'
        },
        body: JSON.stringify(postData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `WordPress API error: ${response.status} ${response.statusText}`;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.code || errorMessage;
          
          if (response.status === 401) {
            errorMessage = `Authentication failed. Please check:
1. WordPress username: "${website.wpUsername}" is correct
2. Application password is valid and not expired
3. The application password has not been revoked in WordPress`;
          } else if (response.status === 403) {
            errorMessage = 'Permission denied. Make sure your WordPress user has permission to create posts.';
          } else if (response.status === 404) {
            errorMessage = 'WordPress REST API not found. Check if REST API is enabled and the URL is correct.';
          }
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        console.error('WordPress API error:', {
          status: response.status,
          statusText: response.statusText,
        error: errorMessage,
        url: apiUrl,
        username: website.wpUsername
        });
        
        return { success: false, error: errorMessage };
      }
      
      const publishedPost = await response.json();
      
      console.log(`✅ Successfully published to WordPress:`, {
        postId: publishedPost.id,
        link: publishedPost.link,
        status: publishedPost.status
      });
      
      try {
        await storage.updateWebsite(websiteId, {
          contentCount: website.contentCount + 1,
          updatedAt: new Date()
        });
        
        if (typeof storage.updateContent === 'function') {
          await storage.updateContent(contentId, {
            wordpress_post_id: publishedPost.id.toString(),
            wordpress_link: publishedPost.link,
            published_at: new Date(),
            status: 'published'
          });
        }
      } catch (updateError) {
        console.warn('Could not update records:', updateError);
      }
      
      await storage.createActivityLog({
        userId: userId,
        websiteId: websiteId,
        type: 'content_published',
        description: `Published content to WordPress: "${content.title}"`,
        metadata: {
          contentId: contentId,
          wordpressPostId: publishedPost.id,
          wordpressLink: publishedPost.link,
          autoPublished: true,
          publishedImmediately: true
        }
      });
      
      return {
        success: true,
        postId: publishedPost.id.toString()
      };
      
    } catch (error: any) {
      console.error('WordPress publishing error:', error);
      
      if (error.message?.includes('fetch failed')) {
        return { 
          success: false, 
          error: 'Could not connect to WordPress site. Please check the URL and ensure the site is accessible.' 
        };
      }
      
      return { 
        success: false, 
        error: error.message || 'Unknown publishing error' 
      };
    }
  }

  /**
   * FIXED: Enhanced schedule checking with proper daily schedule handling
   * This now properly handles:
   * - Running at the exact scheduled time
   * - Catching up if scheduled time passed but hasn't run today
   * - Preventing multiple runs per day
   * - Accurate status messaging
   */
  private async shouldRunScheduleUTC(
    schedule: any,
    currentUTCHour: number,
    currentUTCMinutes: number,
    currentUTCDay: string
  ): Promise<boolean> {
    // Parse the stored UTC time
    const [scheduleHour, scheduleMinutes] = schedule.timeOfDay.split(":").map(Number);
    
    // Calculate minutes since midnight for both scheduled and current time
    const scheduledMinutesToday = scheduleHour * 60 + scheduleMinutes;
    const currentMinutesToday = currentUTCHour * 60 + currentUTCMinutes;
    
    // Check if already run today (in UTC)
    let hasRunToday = false;
    if (schedule.lastRun) {
      const lastRunDate = new Date(schedule.lastRun);
      const todayUTC = new Date();
      
      // Compare UTC dates properly
      const lastRunUTCDateStr = `${lastRunDate.getUTCFullYear()}-${String(lastRunDate.getUTCMonth() + 1).padStart(2, '0')}-${String(lastRunDate.getUTCDate()).padStart(2, '0')}`;
      const todayUTCDateStr = `${todayUTC.getUTCFullYear()}-${String(todayUTC.getUTCMonth() + 1).padStart(2, '0')}-${String(todayUTC.getUTCDate()).padStart(2, '0')}`;
      
      hasRunToday = lastRunUTCDateStr === todayUTCDateStr;
      
      if (hasRunToday) {
        return false;
      }
    }
    
    // Check if the scheduled time has passed today
    const hasScheduledTimePassed = currentMinutesToday >= scheduledMinutesToday;
    
    // Check if we're within the exact scheduled time window (5 minute tolerance)
    const isWithinScheduledWindow = currentUTCHour === scheduleHour && 
                                   Math.abs(currentUTCMinutes - scheduleMinutes) <= 5;
    
    // Check frequency constraints
    const frequencyCheck = this.checkFrequency(schedule.frequency, currentUTCDay, schedule.lastRun, schedule.customDays);
    
    if (!frequencyCheck) {
      return false;
    }
    
    // Determine if should run
    let shouldRun = false;
    let reason = '';
    
    if (isWithinScheduledWindow) {
      // We're within the scheduled time window
      shouldRun = true;
      reason = 'Within scheduled time window';
    } else if (hasScheduledTimePassed && !hasRunToday) {
      // Scheduled time has passed but hasn't run today - catch up
      shouldRun = true;
      reason = `Catching up - scheduled time ${schedule.timeOfDay} UTC has passed`;
    } else if (!hasScheduledTimePassed) {
      // Scheduled time hasn't arrived yet today
      shouldRun = false;
      const hoursUntil = Math.floor((scheduledMinutesToday - currentMinutesToday) / 60);
      const minutesUntil = (scheduledMinutesToday - currentMinutesToday) % 60;
      reason = `Scheduled for ${schedule.timeOfDay} UTC (in ${hoursUntil}h ${minutesUntil}m)`;
    }
    
    // Log the decision
    if (shouldRun) {
      console.log(`   ✅ Should run now: ${reason}`);
    } else {
      console.log(`   ⏰ ${reason}`);
    }
    
    return shouldRun;
  }

  private checkFrequency(
    frequency: string,
    currentUTCDay: string,
    lastRun: Date | string | null,
    customDays?: string[]
  ): boolean {
    switch (frequency) {
      case "daily":
        return true;

      case "twice_weekly":
        return currentUTCDay === "Monday" || currentUTCDay === "Thursday";

      case "weekly":
        return currentUTCDay === "Monday";

      case "biweekly":
        if (!lastRun) return currentUTCDay === "Monday";
        const lastRunDate = typeof lastRun === 'string' ? new Date(lastRun) : lastRun;
        const daysSinceLastRun = Math.floor(
          (Date.now() - lastRunDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysSinceLastRun >= 14 && currentUTCDay === "Monday";

      case "monthly":
        const todayUTC = new Date();
        const dayOfMonth = todayUTC.getUTCDate();
        return dayOfMonth === 1;

      case "custom":
        return (customDays || []).includes(currentUTCDay);

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

  async generateContent(schedule: any, topic: string): Promise<any> {
    try {
      // Safe handling of keywords field
      let keywordsArray: string[] = [];
      if (schedule.keywords) {
        if (Array.isArray(schedule.keywords)) {
          keywordsArray = schedule.keywords.filter((k: any) => k && typeof k === 'string');
        } else if (typeof schedule.keywords === 'string' && schedule.keywords.trim()) {
          keywordsArray = schedule.keywords.split(',').map((k: string) => k.trim()).filter(k => k);
        }
      }

      console.log('   🔧 Generating content with parameters:', {
        topic: topic,
        keywords: keywordsArray.length > 0 ? keywordsArray.join(', ') : 'none',
        wordCount: schedule.wordCount || 800,
        tone: schedule.tone || 'professional',
        aiProvider: schedule.aiProvider || 'openai'
      });
      
      // Call the AI service to generate content
      const result = await aiService.generateContent({
        userId: schedule.userId,
        websiteId: schedule.websiteId,
        topic: topic,
        keywords: keywordsArray,
        tone: schedule.tone || 'professional',
        wordCount: schedule.wordCount || 800,
        brandVoice: schedule.brandVoice || '',
        targetAudience: schedule.targetAudience || '',
        eatCompliance: schedule.eatCompliance || false,
        aiProvider: schedule.aiProvider || 'openai',
        includeImages: schedule.includeImages || false,
        imageCount: schedule.imageCount || 1,
        imageStyle: schedule.imageStyle || 'natural',
        seoOptimized: schedule.seoOptimized !== false,
        isAutoGenerated: true,
        autoScheduleId: schedule.id,
        autoPublish: schedule.autoPublish || false,
        publishDelay: schedule.publishDelay || 0,
      });

      // Check if result has contentId (new format) or is the raw content (old format)
      if (result && result.contentId) {
        // New format - AI service already saved the content
        return {
          success: true,
          contentId: result.contentId,
          cost: result.totalCost || 0,
          title: result.title
        };
      } else if (result && result.title && result.content) {
        // Old format - AI service returned raw content, we need to save it
        console.log('AI service returned raw content, saving to database...');
        
        // Save the generated content to the database
        const savedContent = await storage.createContent({
          userId: schedule.userId,
          websiteId: schedule.websiteId,
          title: result.title,
          body: result.content,
          excerpt: result.excerpt || '',
          metaDescription: result.metaDescription || '',
          metaTitle: result.metaTitle || result.title,
          aiModel: schedule.aiProvider || 'openai',
          seoKeywords: result.keywords || [],
          seoScore: result.seoScore || 0,
          readabilityScore: result.readabilityScore || 0,
          brandVoiceScore: result.brandVoiceScore || 0,
          eatCompliance: result.eatCompliance || false,
          tokensUsed: result.tokensUsed || 0,
          costUsd: Math.round((result.costUsd || 0) * 100), // Convert to cents for storage
          status: 'ready',
          hasImages: schedule.includeImages || false,
          imageCount: schedule.imageCount || 0,
          imageCostCents: 0
        });

        console.log(`   ✅ Content saved with ID: ${savedContent.id}`);

        return {
          success: true,
          contentId: savedContent.id,
          cost: result.costUsd || 0,
          title: result.title
        };
      } else {
        console.error('   ❌ Invalid result from AI service:', result);
        throw new Error('Content generation did not return valid content');
      }

    } catch (error) {
      console.error('   ❌ Content generation error:', {
        scheduleId: schedule.id,
        topic: topic,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Content generation failed",
      };
    }
  }

  // Reset daily costs at midnight UTC
  async resetDailyCosts(): Promise<void> {
    console.log("💰 Resetting daily cost counters at UTC midnight...");
    await storage.resetAutoScheduleDailyCosts();
  }

  // Reset monthly post counts at the start of each month (UTC)
  async resetMonthlyCounts(): Promise<void> {
    console.log("📊 Resetting monthly post counters at UTC month start...");
    await storage.resetAutoScheduleMonthlyCounts();
  }

  // Run a single schedule manually
  async runSingleSchedule(schedule: any): Promise<void> {
    try {
      console.log(`\n🤖 Manually running schedule: ${schedule.name}`);
      console.log(`   Schedule time: ${schedule.timeOfDay} UTC`);
      if (schedule.timezone) {
        console.log(`   User timezone: ${schedule.timezone}`);
        if (schedule.localTimeDisplay) {
          console.log(`   Local time: ${schedule.localTimeDisplay} ${schedule.timezone}`);
        }
      }
      
      // Check daily cost limit
      const currentCost = parseFloat(schedule.costToday) || 0;
      const maxCost = parseFloat(schedule.maxDailyCost) || 5.00;
      if (currentCost >= maxCost) {
        console.log(`💰 Daily cost limit reached: $${currentCost.toFixed(2)}/$${maxCost.toFixed(2)}`);
        return;
      }

      // Check monthly post limit
      const postsThisMonth = schedule.postsThisMonth || 0;
      const maxMonthlyPosts = schedule.maxMonthlyPosts || 30;
      if (postsThisMonth >= maxMonthlyPosts) {
        console.log(`📊 Monthly post limit reached: ${postsThisMonth}/${maxMonthlyPosts}`);
        return;
      }

      // Select topic based on rotation strategy
      const topic = this.selectTopic(schedule);
      console.log(`   Topic selected: "${topic}"`);

      // Generate content
      const generationResult = await this.generateContent(schedule, topic);

      if (generationResult.success) {
        const now = new Date();
        
        // Update schedule metrics
        const generationCost = parseFloat(generationResult.cost) || 0;
        const newCostToday = currentCost + generationCost;
        
        // Calculate next topic index
        const topicsLength = schedule.topics?.length || 1;
        const currentIndex = schedule.nextTopicIndex || 0;
        const nextIndex = schedule.topicRotation === 'sequential' 
          ? (currentIndex + 1) % topicsLength 
          : currentIndex;
        
        await storage.updateAutoSchedule(schedule.id, {
          lastRun: now,
          lastRunUTC: now.toISOString(),
          postsThisMonth: postsThisMonth + 1,
          costToday: newCostToday,
          nextTopicIndex: nextIndex
        });
        
        console.log(`✅ Schedule "${schedule.name}" completed successfully`);
        console.log(`   Content ID: ${generationResult.contentId}`);
        console.log(`   Generation cost: $${generationCost.toFixed(6)}`);
        console.log(`   Total cost today: $${newCostToday.toFixed(2)}`);
        
        // Handle auto-publishing
        if (schedule.autoPublish) {
          let publishTime: Date;
          let scheduleStatus: string;
          
          if (schedule.publishDelay === 0 || !schedule.publishDelay) {
            // Immediate publishing
            publishTime = new Date();
            scheduleStatus = 'publishing';
            
            console.log(`   🚀 Publishing immediately...`);
            const publishResult = await this.publishToWordPress(
              generationResult.contentId,
              schedule.websiteId,
              schedule.userId
            );
            
            if (publishResult.success) {
              console.log(`   ✅ Content published to WordPress (Post ID: ${publishResult.postId})`);
            } else {
              console.log(`   ❌ Publishing failed: ${publishResult.error}`);
            }
          } else {
            // Delayed publishing
            publishTime = new Date(now.getTime() + schedule.publishDelay * 60 * 60 * 1000);
            scheduleStatus = 'scheduled';
            
            // Create a content_schedule entry for delayed publishing
            await storage.createContentSchedule({
              contentId: generationResult.contentId,
              userId: schedule.userId,
              websiteId: schedule.websiteId,
              scheduled_date: publishTime,
              status: scheduleStatus,
              title: generationResult.title || topic,
              topic: topic,
              timezone: schedule.timezone || 'UTC',
              metadata: {
                autoScheduleId: schedule.id,
                publishDelay: schedule.publishDelay,
                scheduledTimeUTC: schedule.timeOfDay,
                originalTimezone: schedule.timezone
              }
            });
            
            console.log(`   ⏰ Content scheduled for publishing at ${publishTime.toISOString()}`);
            console.log(`   (${schedule.publishDelay} hours from now)`);
          }
        } else {
          console.log(`   📝 Content saved as draft`);
        }
        
        // Log activity
        await storage.createActivityLog({
          userId: schedule.userId,
          websiteId: schedule.websiteId,
          type: "auto_content_generated",
          description: `Manually triggered auto-generation: "${topic}"`,
          metadata: {
            scheduleId: schedule.id,
            contentId: generationResult.contentId,
            cost: generationResult.cost,
            generatedAtUTC: new Date().toISOString(),
            manualRun: true
          }
        });
      } else {
        console.error(`❌ Failed to generate content: ${generationResult.error}`);
        
        await storage.createActivityLog({
          userId: schedule.userId,
          websiteId: schedule.websiteId,
          type: "auto_content_failed",
          description: `Failed manual generation for schedule: ${schedule.name}`,
          metadata: {
            scheduleId: schedule.id,
            error: generationResult.error,
            manualRun: true
          }
        });
      }
    } catch (error) {
      console.error(`❌ Error running single schedule ${schedule.id}:`, error);
      throw error;
    }
  }
}

export const autoScheduleService = new AutoScheduleService();


























































// 
//server/services/auto-schedule-service.ts
// import { storage } from "../storage";
// import { aiService } from "./ai-service";
// import { schedulerService } from "./scheduler-service";

// export class AutoScheduleService {
//   private isProcessing = false;

//   async processAutoSchedules(): Promise<{
//     processed: number;
//     generated: number;
//     failed: number;
//     results: any[];
//   }> {
//     if (this.isProcessing) {
//       console.log("⏳ Auto-schedule processor already running...");
//       return { processed: 0, generated: 0, failed: 0, results: [] };
//     }

//     this.isProcessing = true;
//     console.log("🤖 Starting auto-content generation...");

//     try {
//       const now = new Date();
//       const currentHour = now.getHours();
//       const currentDay = now.toLocaleDateString("en-US", { weekday: "long" });

//       // Get active schedules that should run now
//       const schedules = await storage.getActiveAutoSchedules();
//       const results = [];

//       for (const schedule of schedules) {
//         if (!this.shouldRunSchedule(schedule, currentHour, currentDay)) {
//           continue;
//         }

//         // Check daily cost limit
//         if (schedule.costToday >= schedule.maxDailyCost) {
//           console.log(
//             `💰 Daily cost limit reached for schedule: ${schedule.name}`
//           );
//           continue;
//         }

//         // Check monthly post limit
//         if (schedule.postsThisMonth >= schedule.maxMonthlyPosts) {
//           console.log(
//             `📊 Monthly post limit reached for schedule: ${schedule.name}`
//           );
//           continue;
//         }

//         try {
//           console.log(`🚀 Running auto-schedule: ${schedule.name}`);

//           // Select topic based on rotation strategy
//           const topic = this.selectTopic(schedule);

//           // Generate content
//           const generationResult = await this.generateContent(schedule, topic);

//           if (generationResult.success) {
//             // Update schedule metrics with proper numeric conversion
//             const currentCostToday = parseFloat(schedule.costToday) || 0;
//             const generationCost = parseFloat(generationResult.cost) || 0;
//             const newCostToday = currentCostToday + generationCost;
            
//             // Calculate next topic index safely
//             const topicsLength = schedule.topics?.length || 1;
//             const currentIndex = schedule.nextTopicIndex || 0;
//             const nextIndex = schedule.topicRotation === 'sequential' 
//               ? (currentIndex + 1) % topicsLength 
//               : currentIndex;
            
//             await storage.updateAutoSchedule(schedule.id, {
//               lastRun: now,
//               postsThisMonth: (schedule.postsThisMonth || 0) + 1,
//               costToday: newCostToday, // Now properly calculated as a number
//               nextTopicIndex: nextIndex
//             });
            
//             console.log(`💰 Updated schedule costs: Previous: $${currentCostToday.toFixed(6)}, Generation: $${generationCost.toFixed(6)}, New Total: $${newCostToday.toFixed(6)}`);

//             if (schedule.autoPublish) {
//               let publishTime: Date;
//               let scheduleStatus: string;
              
//               if (schedule.publishDelay === 0 || !schedule.publishDelay) {
//                 publishTime = new Date();
//                 scheduleStatus = 'publishing';
//                 console.log(`📌 Setting up immediate publishing for content ${generationResult.contentId}`);
//               } else {
//                 publishTime = new Date(
//                   now.getTime() + (schedule.publishDelay || 0) * 60 * 60 * 1000
//                 );
//                 scheduleStatus = 'scheduled';
//                 console.log(`⏰ Scheduling content for ${publishTime.toISOString()}`);
//               }

//               const scheduleData = {
//                 contentId: generationResult.contentId,
//                 userId: schedule.userId,
//                 websiteId: schedule.websiteId,
//                 scheduled_date: publishTime,
//                 status: scheduleStatus,
//                 title: generationResult.title || topic || 'Auto-generated content',
//                 topic: topic,
//                 metadata: {
//                   autoScheduleId: schedule.id,
//                   autoScheduleName: schedule.name,
//                   topic: topic,  // Keep in metadata too for reference
//                   publishDelay: schedule.publishDelay || 0,
//                   generatedAt: new Date(),
//                   isAutoGenerated: true,
//                 },
//               };
//               console.log('📋 Creating content_schedule with data:', {
//                 contentId: scheduleData.contentId,
//                 userId: scheduleData.userId,
//                 websiteId: scheduleData.websiteId,
//                 scheduled_date: scheduleData.scheduled_date?.toISOString(),
//                 status: scheduleData.status,
//                 title: scheduleData.title,
//                 topic: scheduleData.topic,
//               });

//               try {
//                 await storage.createContentSchedule(scheduleData);
//                 console.log('✅ Content schedule created successfully');
//               } catch (dbError: any) {
//                 console.error('❌ Database error when creating content_schedule:', dbError);
//                 console.error('Failed with data:', JSON.stringify(scheduleData, null, 2));
//                 throw dbError;
//               }

//               if (schedule.publishDelay === 0) {
//                 try {
//                   console.log(`🚀 Attempting immediate publish for content ${generationResult.contentId}`);
//                   const publishResult = await this.publishToWordPress(
//                     generationResult.contentId,
//                     schedule.websiteId,
//                     schedule.userId
//                   );
                  
//                   if (publishResult && publishResult.success) {
//                     await storage.updateContentScheduleByContentId(generationResult.contentId, {
//                       status: 'published',
//                       published_at: new Date(),
//                       metadata: {
//                         wordPressPostId: publishResult.postId,
//                         publishedAt: new Date().toISOString()
//                       }
//                     });
                    
//                     console.log(`✅ Content published immediately (WordPress Post ID: ${publishResult.postId})`);
//                   } else {
//                     await storage.updateContentScheduleByContentId(generationResult.contentId, {
//                       status: 'failed',
//                       error: publishResult?.error || 'Publishing failed'
//                     });
                    
//                     console.error(`❌ Failed to publish immediately: ${publishResult?.error}`);
//                   }
//                 } catch (publishError: any) {
//                   console.error(`❌ Publishing error: ${publishError.message}`);
//                   try {
//                     await storage.updateContentScheduleByContentId(generationResult.contentId, {
//                       status: 'failed',
//                       error: publishError.message
//                     });
//                   } catch (updateError) {
//                     console.error('Failed to update status:', updateError);
//                   }
//                 }
//               } else {
//                 console.log(`📅 Content scheduled for publishing at ${publishTime.toISOString()}`);
//               }
//             } else {
//               console.log(`📝 Saving content ${generationResult.contentId} as draft`);
              
//               const draftData = {
//                 contentId: generationResult.contentId,
//                 userId: schedule.userId,
//                 websiteId: schedule.websiteId,
//                 scheduled_date: new Date(),
//                 status: 'draft',
//                 title: generationResult.title || topic || 'Auto-generated draft',
//                 topic: topic,
//                 metadata: {
//                   autoScheduleId: schedule.id,
//                   autoScheduleName: schedule.name,
//                   topic: topic,
//                   isDraft: true,
//                   generatedAt: new Date(),
//                   isAutoGenerated: true,
//                 },
//               };
              
//               console.log('📋 Creating draft content_schedule with data:', {
//                 contentId: draftData.contentId,
//                 scheduled_date: draftData.scheduled_date?.toISOString(),
//                 title: draftData.title,
//                 topic: draftData.topic,
//               });
              
//               try {
//                 await storage.createContentSchedule(draftData);
//                 console.log('✅ Draft schedule created successfully');
//               } catch (dbError: any) {
//                 console.error('❌ Database error when creating draft schedule:', dbError);
//                 console.error('Failed with data:', JSON.stringify(draftData, null, 2));
//                 throw dbError;
//               }
//             }

//             // Log activity
//             await storage.createActivityLog({
//               userId: schedule.userId,
//               websiteId: schedule.websiteId,
//               type: "auto_content_generated",
//               description: `Auto-generated content: "${topic}"`,
//               metadata: {
//                 scheduleId: schedule.id,
//                 scheduleName: schedule.name,
//                 contentId: generationResult.contentId,
//                 cost: generationResult.cost,
//                 autoPublish: schedule.autoPublish,
//                 publishStatus: schedule.autoPublish 
//                   ? (schedule.publishDelay === 0 ? 'immediate' : 'scheduled')
//                   : 'draft',
//               },
//             });

//             results.push({
//               scheduleId: schedule.id,
//               success: true,
//               contentId: generationResult.contentId,
//               topic,
//               cost: generationResult.cost,
//               published: schedule.autoPublish && schedule.publishDelay === 0,
//               scheduled: schedule.autoPublish && schedule.publishDelay > 0,
//             });
//           } else {
//             throw new Error(generationResult.error);
//           }
//         } catch (error) {
//           console.error(`❌ Failed to process schedule ${schedule.id}:`, error);

//           await storage.createActivityLog({
//             userId: schedule.userId,
//             websiteId: schedule.websiteId,
//             type: "auto_content_failed",
//             description: `Failed to auto-generate content for: ${schedule.name}`,
//             metadata: {
//               scheduleId: schedule.id,
//               error: error instanceof Error ? error.message : "Unknown error",
//             },
//           });

//           results.push({
//             scheduleId: schedule.id,
//             success: false,
//             error: error instanceof Error ? error.message : "Unknown error",
//           });
//         }
//       }

//       const generated = results.filter((r) => r.success).length;
//       const failed = results.filter((r) => !r.success).length;

//       console.log(
//         `✅ Auto-generation complete: ${generated} generated, ${failed} failed`
//       );

//       return {
//         processed: results.length,
//         generated,
//         failed,
//         results,
//       };
//     } finally {
//       this.isProcessing = false;
//     }
//   }

// private async publishToWordPress(
//   contentId: string,
//   websiteId: string,
//   userId: string
// ): Promise<{ success: boolean; postId?: string; error?: string }> {
//   try {
//     // Step 1: Get the content from database
//     const content = await storage.getContent(contentId);
//     if (!content) {
//       return { success: false, error: 'Content not found' };
//     }
    
//     // Step 2: Get the website details with WordPress credentials
//     const website = await storage.getUserWebsite(websiteId, userId);
//     if (!website) {
//       return { success: false, error: 'Website not found' };
//     }
    
//     // Step 3: Validate WordPress configuration
//     if (!website.url || !website.wpUsername || !website.wpApplicationPassword) {
//       console.error('WordPress configuration missing:', {
//         hasUrl: !!website.url,
//         hasUsername: !!website.wpUsername,
//         hasAppPassword: !!website.wpApplicationPassword
//       });
//       return { 
//         success: false, 
//         error: 'WordPress configuration incomplete. Please provide your WordPress username and application password.' 
//       };
//     }
    
//     // Step 4: Prepare WordPress API endpoint
//     const baseUrl = website.url.replace(/\/$/, '');
//     const apiUrl = `${baseUrl}/wp-json/wp/v2/posts`;
    
//     // Step 5: Prepare the post data
//     const postData = {
//       title: content.title,
//       content: content.body || content.content || '',
//       status: 'publish', // Changed from conditional to always 'publish'
//       excerpt: content.excerpt || '',
//       format: 'standard',
//       meta: {
//         _yoast_wpseo_metadesc: content.metaDescription || content.meta_description || '',
//         _yoast_wpseo_title: content.metaTitle || content.meta_title || content.title,
//       }
//     };
    
//     // Step 6: Prepare authentication
//     const auth = Buffer.from(
//       `${website.wpUsername}:${website.wpApplicationPassword}`
//     ).toString('base64');
    
//     console.log(`📡 Publishing to WordPress: ${apiUrl}`);
//     console.log(`🔐 Authenticating as WordPress user: ${website.wpUsername}`);
//     console.log(`📝 Post title: ${postData.title}`);
//     console.log(`📄 Status: ${postData.status} (forced immediate publishing)`);
    
//     // Step 7: Make the API request
//     const response = await fetch(apiUrl, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Basic ${auth}`,
//         'User-Agent': 'SEO-Content-Generator/1.0'
//       },
//       body: JSON.stringify(postData)
//     });
    
//     // Step 8: Handle the response
//     if (!response.ok) {
//       const errorText = await response.text();
//       let errorMessage = `WordPress API error: ${response.status} ${response.statusText}`;
      
//       try {
//         const errorJson = JSON.parse(errorText);
//         errorMessage = errorJson.message || errorJson.code || errorMessage;
        
//         if (response.status === 401) {
//           errorMessage = `Authentication failed. Please check:
// 1. WordPress username: "${website.wpUsername}" is correct
// 2. Application password is valid and not expired
// 3. The application password has not been revoked in WordPress`;
//         } else if (response.status === 403) {
//           errorMessage = 'Permission denied. Make sure your WordPress user has permission to create posts.';
//         } else if (response.status === 404) {
//           errorMessage = 'WordPress REST API not found. Check if REST API is enabled and the URL is correct.';
//         }
//       } catch {
//         errorMessage = errorText || errorMessage;
//       }
      
//       console.error('WordPress API error:', {
//         status: response.status,
//         statusText: response.statusText,
//         error: errorMessage,
//         url: apiUrl,
//         username: website.wpUsername
//       });
      
//       return { success: false, error: errorMessage };
//     }
    
//     // Step 9: Parse successful response
//     const publishedPost = await response.json();
    
//     console.log(`✅ Successfully published to WordPress:`, {
//       postId: publishedPost.id,
//       link: publishedPost.link,
//       status: publishedPost.status
//     });
    
//     // Step 10: Update records
//     try {
//       // Update the content count for the website
//       await storage.updateWebsite(websiteId, {
//         contentCount: website.contentCount + 1,
//         updatedAt: new Date()
//       });
      
//       // If you have a content update method
//       if (typeof storage.updateContent === 'function') {
//         await storage.updateContent(contentId, {
//           wordpress_post_id: publishedPost.id.toString(),
//           wordpress_link: publishedPost.link,
//           published_at: new Date(),
//           status: 'published'
//         });
//       }
//     } catch (updateError) {
//       console.warn('Could not update records:', updateError);
//       // Don't fail the whole operation
//     }
    
//     // Step 11: Log the successful publication
//     await storage.createActivityLog({
//       userId: userId,
//       websiteId: websiteId,
//       type: 'content_published',
//       description: `Published content to WordPress: "${content.title}"`,
//       metadata: {
//         contentId: contentId,
//         wordpressPostId: publishedPost.id,
//         wordpressLink: publishedPost.link,
//         autoPublished: true,
//         publishedImmediately: true
//       }
//     });
    
//     return {
//       success: true,
//       postId: publishedPost.id.toString()
//     };
    
//   } catch (error: any) {
//     console.error('WordPress publishing error:', error);
    
//     // Check for common network errors
//     if (error.message?.includes('fetch failed')) {
//       return { 
//         success: false, 
//         error: 'Could not connect to WordPress site. Please check the URL and ensure the site is accessible.' 
//       };
//     }
    
//     return { 
//       success: false, 
//       error: error.message || 'Unknown publishing error' 
//     };
//   }
// }


//   private shouldRunSchedule(
//     schedule: any,
//     currentHour: number,
//     currentDay: string
//   ): boolean {
//     // Check if it's time to run
//     const scheduleHour = parseInt(schedule.timeOfDay.split(":")[0]);
//     if (scheduleHour !== currentHour) return false;

//     // Check if already run today
//     if (schedule.lastRun) {
//       const lastRunDate = new Date(schedule.lastRun).toDateString();
//       const today = new Date().toDateString();
//       if (lastRunDate === today) return false;
//     }

//     // Check frequency
//     switch (schedule.frequency) {
//       case "daily":
//         return true;

//       case "twice_weekly":
//         return currentDay === "Monday" || currentDay === "Thursday";

//       case "weekly":
//         return currentDay === "Monday";

//       case "biweekly":
//         if (!schedule.lastRun) return currentDay === "Monday";
//         const daysSinceLastRun = Math.floor(
//           (Date.now() - new Date(schedule.lastRun).getTime()) /
//             (1000 * 60 * 60 * 24)
//         );
//         return daysSinceLastRun >= 14 && currentDay === "Monday";

//       case "monthly":
//         const today = new Date().getDate();
//         return today === 1;

//       case "custom":
//         const customDays = schedule.customDays || [];
//         return customDays.includes(currentDay);

//       default:
//         return false;
//     }
//   }

//   private selectTopic(schedule: any): string {
//     const topics = schedule.topics || [];
//     if (topics.length === 0) return "General content";

//     if (schedule.topicRotation === "sequential") {
//       const index = schedule.nextTopicIndex || 0;
//       return topics[index % topics.length];
//     } else {
//       // Random selection
//       return topics[Math.floor(Math.random() * topics.length)];
//     }
//   }
//   async generateContent(schedule: any, topic: string): Promise<any> {
//     try {
//       // Safe handling of keywords field
//       let keywordsArray: string[] = [];
//       if (schedule.keywords) {
//         if (Array.isArray(schedule.keywords)) {
//           keywordsArray = schedule.keywords.filter((k: any) => k && typeof k === 'string');
//         } else if (typeof schedule.keywords === 'string' && schedule.keywords.trim()) {
//           keywordsArray = schedule.keywords.split(',').map((k: string) => k.trim()).filter(k => k);
//         }
//       }

//       console.log('Processing keywords for schedule:', {
//         scheduleId: schedule.id,
//         originalKeywords: schedule.keywords,
//         processedKeywords: keywordsArray,
//         userId: schedule.userId
//       });
//       // Call the AI service to generate content
//       const result = await aiService.generateContent({
//         userId: schedule.userId, // CRITICAL: Pass userId
//         websiteId: schedule.websiteId,
//         topic: topic,
//         keywords: keywordsArray,
//         tone: schedule.tone || 'professional',
//         wordCount: schedule.wordCount || 800,
//         brandVoice: schedule.brandVoice || '',
//         targetAudience: schedule.targetAudience || '',
//         eatCompliance: schedule.eatCompliance || false,
//         aiProvider: schedule.aiProvider || 'openai',
//         includeImages: schedule.includeImages || false,
//         imageCount: schedule.imageCount || 1,
//         imageStyle: schedule.imageStyle || 'natural',
//         seoOptimized: schedule.seoOptimized !== false,
//         isAutoGenerated: true,
//         autoScheduleId: schedule.id,
//         autoPublish: schedule.autoPublish || false,
//         publishDelay: schedule.publishDelay || 0,
//       });

//       // Check if result has contentId (new format) or is the raw content (old format)
//       if (result && result.contentId) {
//         // New format - AI service already saved the content
//         return {
//           success: true,
//           contentId: result.contentId,
//           cost: result.totalCost || 0,
//           title: result.title
//         };
//       } else if (result && result.title && result.content) {
//         // Old format - AI service returned raw content, we need to save it
//         console.log('AI service returned raw content, saving to database...');
        
//         // Save the generated content to the database
//         const savedContent = await storage.createContent({
//           userId: schedule.userId, // Use the schedule's userId
//           websiteId: schedule.websiteId,
//           title: result.title,
//           body: result.content,
//           excerpt: result.excerpt || '',
//           metaDescription: result.metaDescription || '',
//           metaTitle: result.metaTitle || result.title,
//           aiModel: schedule.aiProvider || 'openai',
//           seoKeywords: result.keywords || [],
//           seoScore: result.seoScore || 0,
//           readabilityScore: result.readabilityScore || 0,
//           brandVoiceScore: result.brandVoiceScore || 0,
//           eatCompliance: result.eatCompliance || false,
//           tokensUsed: result.tokensUsed || 0,
//           costUsd: Math.round((result.costUsd || 0) * 100), // Convert to cents for storage
//           status: 'ready', // Auto-generated content can be marked as ready
//           hasImages: schedule.includeImages || false,
//           imageCount: schedule.imageCount || 0,
//           imageCostCents: 0
//         });

//         console.log('Content saved with ID:', savedContent.id);

//         return {
//           success: true,
//           contentId: savedContent.id,
//           cost: result.costUsd || 0,
//           title: result.title
//         };
//       } else {
//         // No valid result
//         console.error('Invalid result from AI service:', result);
//         throw new Error('Content generation did not return valid content');
//       }

//     } catch (error) {
//       console.error('Content generation error in auto-schedule:', {
//         scheduleId: schedule.id,
//         topic: topic,
//         userId: schedule.userId,
//         error: error instanceof Error ? error.message : 'Unknown error'
//       });
      
//       return {
//         success: false,
//         error:
//           error instanceof Error ? error.message : "Content generation failed",
//       };
//     }
//   }

//   // Reset daily costs at midnight
//   async resetDailyCosts(): Promise<void> {
//     console.log("💰 Resetting daily cost counters...");
//     await storage.resetAutoScheduleDailyCosts();
//   }

//   // Reset monthly post counts at the start of each month
//   async resetMonthlyCounts(): Promise<void> {
//     console.log("📊 Resetting monthly post counters...");
//     await storage.resetAutoScheduleMonthlyCounts();
//   }
// }

// export const autoScheduleService = new AutoScheduleService();
