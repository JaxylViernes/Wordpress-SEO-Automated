import { Router } from "express";
import { storage } from "../../storage";
import { autoScheduleService } from "../../services/auto-schedule-service";
import { requireAuth } from "../../middleware/auth";

const router = Router();

// Apply auth middleware to all routes
router.use(requireAuth);

// ============= TIMEZONE CONVERSION FUNCTIONS =============
/**
 * Convert local time to UTC based on timezone
 * @param localTime Time in HH:MM format (e.g., "09:00")
 * @param timezone IANA timezone string (e.g., "Asia/Tokyo")
 * @returns UTC time in HH:MM format
 */
function convertTimeToUTC(localTime: string, timezone: string): string {
  try {
    const [hours, minutes] = localTime.split(':').map(Number);
    
    // Create a date object for today
    const now = new Date();
    const testDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
    
    // Get timezone offset for this specific date/time
    const tzOffset = getTimezoneOffsetMinutes(testDate, timezone);
    
    // Calculate UTC time
    let utcHours = hours - Math.floor(tzOffset / 60);
    let utcMinutes = minutes - (tzOffset % 60);
    
    // Handle negative minutes
    if (utcMinutes < 0) {
      utcMinutes += 60;
      utcHours -= 1;
    } else if (utcMinutes >= 60) {
      utcMinutes -= 60;
      utcHours += 1;
    }
    
    // Handle hour wraparound (0-23)
    utcHours = (utcHours + 24) % 24;
    
    const result = `${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}`;
    
    console.log(`🕐 Timezone conversion: ${localTime} ${timezone} → ${result} UTC`);
    
    return result;
  } catch (error) {
    console.error('Error in convertTimeToUTC:', error);
    return localTime; // Fallback to original time
  }
}

/**
 * Get timezone offset in minutes (positive = ahead of UTC)
 */
function getTimezoneOffsetMinutes(date: Date, timezone: string): number {
  try {
    // Create formatters for both timezones
    const tzFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const utcFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    // Parse the formatted strings
    const tzParts = tzFormatter.formatToParts(date);
    const utcParts = utcFormatter.formatToParts(date);
    
    const getTimeValue = (parts: any[], type: string) => {
      const part = parts.find(p => p.type === type);
      return part ? parseInt(part.value) : 0;
    };
    
    // Calculate total minutes for each
    const tzMinutes = getTimeValue(tzParts, 'hour') * 60 + getTimeValue(tzParts, 'minute');
    const utcMinutes = getTimeValue(utcParts, 'hour') * 60 + getTimeValue(utcParts, 'minute');
    
    // Check if dates are different
    const tzDay = getTimeValue(tzParts, 'day');
    const utcDay = getTimeValue(utcParts, 'day');
    
    let offset = tzMinutes - utcMinutes;
    
    // Adjust for day boundary crossing
    if (tzDay > utcDay) {
      offset += 24 * 60; // Timezone is ahead and crossed to next day
    } else if (tzDay < utcDay) {
      offset -= 24 * 60; // Timezone is behind and in previous day
    }
    
    return offset;
  } catch (error) {
    console.error('Error getting timezone offset:', error);
    
    // Fallback to hardcoded common offsets
    const commonOffsets: Record<string, number> = {
      'Asia/Tokyo': 540,      // UTC+9
      'Asia/Manila': 480,     // UTC+8
      'Asia/Singapore': 480,  // UTC+8
      'America/New_York': -300, // UTC-5 (EST, adjust for DST if needed)
      'America/Los_Angeles': -480, // UTC-8 (PST, adjust for DST if needed)
      'Europe/London': 0,     // UTC+0
      'Europe/Paris': 60,     // UTC+1
      'Australia/Sydney': 600, // UTC+10
      'UTC': 0,
    };
    
    return commonOffsets[timezone] || 0;
  }
}
// ============= END TIMEZONE CONVERSION FUNCTIONS =============

// GET /api/user/auto-schedules - Get all schedules for user
router.get("/", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { websiteId } = req.query;
    
    let schedules;
    if (websiteId) {
      // Verify ownership and get schedules for specific website
      const website = await storage.getUserWebsite(websiteId as string, userId);
      if (!website) {
        return res.status(403).json({ error: "Access denied to this website" });
      }
      
      // Get all user schedules and filter by website
      schedules = await storage.getUserAutoSchedules(userId);
      schedules = schedules.filter(s => s.websiteId === websiteId);
    } else {
      // Get all schedules for the user
      schedules = await storage.getUserAutoSchedules(userId);
    }
    
    res.json({ schedules });
  } catch (error) {
    console.error("Error fetching auto-schedules:", error);
    res.status(500).json({ error: "Failed to fetch schedules" });
  }
});

// POST /api/user/auto-schedules - Create new schedule (FIXED WITH TIMEZONE CONVERSION)
router.post("/", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify website ownership
    const website = await storage.getUserWebsite(req.body.websiteId, userId);
    if (!website) {
      return res.status(403).json({ error: "Access denied to this website" });
    }

    // CRITICAL FIX: Handle timezone conversion
    let utcTime = req.body.timeOfDay; // Default fallback
    const localTime = req.body.localTime || req.body.timeOfDay;
    const timezone = req.body.timezone || 'UTC';
    
    // Convert local time to UTC if timezone is provided
    if (timezone && timezone !== 'UTC') {
      utcTime = convertTimeToUTC(localTime, timezone);
      
      console.log(`📋 Creating schedule "${req.body.name}":`, {
        input: `${localTime} ${timezone}`,
        output: `${utcTime} UTC`,
        timezone: timezone
      });
      
      // Validate conversion for Asia/Tokyo
      if (timezone === 'Asia/Tokyo') {
        const [localHour] = localTime.split(':').map(Number);
        const [utcHour] = utcTime.split(':').map(Number);
        const expectedUtcHour = (localHour - 9 + 24) % 24;
        
        if (utcHour !== expectedUtcHour) {
          console.warn(`⚠️ Potential timezone conversion issue:`, {
            expected: expectedUtcHour,
            actual: utcHour,
            input: `${localTime} JST`
          });
        }
      }
    }

    // Create the schedule with proper timezone data
    const scheduleData = {
      websiteId: req.body.websiteId,
      name: req.body.name,
      frequency: req.body.frequency,
      time_of_day: calculatedUtcTime,  // snake_case for database
      timeOfDay: calculatedUtcTime,  // Also include camelCase for compatibility
      local_time: localTime, // Store original local time (snake_case)
      localTime: localTime, // Also include camelCase
      utc_time: utcTime, // Explicitly store UTC (snake_case)
      utcTime: utcTime, // Also include camelCase
      timezone: timezone, // Store timezone
      localTimeDisplay: `${localTime} ${timezone}`, // Display format
      local_time_display: `${localTime} ${timezone}`, // Snake case version
      customDays: req.body.customDays || [],
      custom_days: req.body.customDays || [], // Snake case for DB
      topics: req.body.topics || [],
      keywords: req.body.keywords || '',
      tone: req.body.tone || 'professional',
      wordCount: req.body.wordCount || 800,
      word_count: req.body.wordCount || 800, // Snake case for DB
      brandVoice: req.body.brandVoice || '',
      brand_voice: req.body.brandVoice || '', // Snake case for DB
      targetAudience: req.body.targetAudience || '',
      target_audience: req.body.targetAudience || '', // Snake case for DB
      eatCompliance: req.body.eatCompliance || false,
      eat_compliance: req.body.eatCompliance || false, // Snake case for DB
      aiProvider: req.body.aiProvider || 'openai',
      ai_provider: req.body.aiProvider || 'openai', // Snake case for DB
      includeImages: req.body.includeImages || false,
      include_images: req.body.includeImages || false, // Snake case for DB
      imageCount: req.body.imageCount || 1,
      image_count: req.body.imageCount || 1, // Snake case for DB
      imageStyle: req.body.imageStyle || 'natural',
      image_style: req.body.imageStyle || 'natural', // Snake case for DB
      seoOptimized: req.body.seoOptimized !== false,
      seo_optimized: req.body.seoOptimized !== false, // Snake case for DB
      autoPublish: req.body.autoPublish || false,
      auto_publish: req.body.autoPublish || false, // Snake case for DB
      publishDelay: req.body.publishDelay || 0,
      publish_delay: req.body.publishDelay || 0, // Snake case for DB
      topicRotation: req.body.topicRotation || 'random',
      topic_rotation: req.body.topicRotation || 'random', // Snake case for DB
      maxDailyCost: req.body.maxDailyCost || 5.00,
      max_daily_cost: req.body.maxDailyCost || 5.00, // Snake case for DB
      maxMonthlyPosts: req.body.maxMonthlyPosts || 30,
      max_monthly_posts: req.body.maxMonthlyPosts || 30, // Snake case for DB
      userId,
      user_id: userId, // Snake case for DB
      // These will be set with defaults
      costToday: 0,
      cost_today: 0, // Snake case for DB
      postsThisMonth: 0,
      posts_this_month: 0, // Snake case for DB
      nextTopicIndex: 0,
      next_topic_index: 0, // Snake case for DB
      lastRun: null,
      last_run: null, // Snake case for DB
      isActive: req.body.isActive !== false,
      is_active: req.body.isActive !== false // Snake case for DB
    };

    console.log('💾 Saving schedule with timezone data:', {
      name: scheduleData.name,
      timeOfDay_UTC: scheduleData.timeOfDay,
      localTime: scheduleData.localTime,
      utcTime: scheduleData.utcTime,
      timezone: scheduleData.timezone
    });

    const schedule = await storage.createAutoSchedule(scheduleData);

    // Log activity
    await storage.createActivityLog({
      userId,
      websiteId: req.body.websiteId,
      type: "auto_schedule_created",
      description: `Created auto-generation schedule: ${req.body.name}`,
      metadata: {
        scheduleId: schedule.id,
        frequency: req.body.frequency,
        topics: req.body.topics,
        timeOfDay_UTC: utcTime,
        localTime: localTime,
        timezone: timezone
      }
    });

    res.json({ success: true, schedule });
  } catch (error) {
    console.error("Error creating auto-schedule:", error);
    res.status(500).json({ error: "Failed to create schedule" });
  }
});

// PUT /api/user/auto-schedules/:id - Update schedule (FIXED WITH TIMEZONE CONVERSION)
router.put("/:id", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get the schedule to verify ownership
    const schedule = await storage.getAutoSchedule(req.params.id);
    if (!schedule || schedule.userId !== userId) {
      return res.status(404).json({ error: "Schedule not found" });
    }

    const updates = { ...req.body };

    // Handle timezone conversion if time or timezone is being updated
    if (updates.localTime || updates.local_time || updates.timezone) {
      const localTime = updates.localTime || updates.local_time || schedule.local_time || schedule.localTime || schedule.time_of_day;
      const timezone = updates.timezone || schedule.timezone || 'UTC';
      
      if (timezone && timezone !== 'UTC') {
        const utcTime = convertTimeToUTC(localTime, timezone);
        
        console.log(`🔄 Updating schedule time:`, {
          scheduleId: req.params.id,
          oldTime: `${schedule.local_time || schedule.localTime || schedule.time_of_day} ${schedule.timezone || 'UTC'}`,
          newTime: `${localTime} ${timezone}`,
          utcTime: utcTime
        });
        
        // Update both snake_case and camelCase fields for compatibility
        updates.time_of_day = utcTime;  // CRITICAL: Snake case for DB
        updates.timeOfDay = utcTime;
        updates.utc_time = utcTime;      // Snake case for DB
        updates.utcTime = utcTime;
        updates.local_time = localTime;  // Snake case for DB
        updates.localTime = localTime;
        updates.timezone = timezone;
        updates.local_time_display = `${localTime} ${timezone}`; // Snake case for DB
        updates.localTimeDisplay = `${localTime} ${timezone}`;
      }
    }

    // Update the schedule
    await storage.updateAutoSchedule(req.params.id, {
      ...updates,
      updatedAt: new Date()
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating auto-schedule:", error);
    res.status(500).json({ error: "Failed to update schedule" });
  }
});

// POST /api/user/auto-schedules/:id/toggle - Toggle schedule active status
router.post("/:id/toggle", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get the schedule to verify ownership
    const schedule = await storage.getAutoSchedule(req.params.id);
    if (!schedule || schedule.userId !== userId) {
      return res.status(404).json({ error: "Schedule not found" });
    }

    const { isActive } = req.body;
    
    // Update the schedule
    await storage.updateAutoSchedule(req.params.id, { 
      isActive,
      updatedAt: new Date()
    });

    // Log activity
    await storage.createActivityLog({
      userId,
      websiteId: schedule.websiteId,
      type: isActive ? "auto_schedule_activated" : "auto_schedule_paused",
      description: `${isActive ? 'Activated' : 'Paused'} auto-generation schedule: ${schedule.name}`,
      metadata: { scheduleId: req.params.id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error toggling auto-schedule:", error);
    res.status(500).json({ error: "Failed to toggle schedule" });
  }
});

// POST /api/user/auto-schedules/:id/run - Run schedule immediately
router.post("/:id/run", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get the schedule to verify ownership
    const schedule = await storage.getAutoSchedule(req.params.id);
    if (!schedule || schedule.userId !== userId) {
      return res.status(404).json({ error: "Schedule not found or access denied" });
    }

    // CRITICAL: Ensure userId is in the schedule object
    schedule.userId = userId;

    console.log('Manual run initiated for schedule:', {
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      userId: userId,
      websiteId: schedule.websiteId,
      autoPublish: schedule.autoPublish,
      publishDelay: schedule.publishDelay,
      timeOfDay_UTC: schedule.timeOfDay,
      localTime: schedule.localTime,
      timezone: schedule.timezone
    });

    // Log the manual run attempt
    await storage.createActivityLog({
      userId,
      websiteId: schedule.websiteId,
      type: "auto_schedule_manual_run",
      description: `Manually triggered auto-generation: ${schedule.name}`,
      metadata: { 
        scheduleId: req.params.id,
        timeOfDay_UTC: schedule.timeOfDay,
        timezone: schedule.timezone
      }
    });

    // Select topic based on rotation strategy
    const topics = schedule.topics || [];
    let topic = 'General content';
    
    if (topics.length > 0) {
      if (schedule.topicRotation === 'sequential') {
        const index = schedule.nextTopicIndex || 0;
        topic = topics[index % topics.length];
      } else {
        topic = topics[Math.floor(Math.random() * topics.length)];
      }
    }

    // Process keywords safely
    let keywordsArray: string[] = [];
    if (schedule.keywords) {
      if (Array.isArray(schedule.keywords)) {
        keywordsArray = schedule.keywords.filter((k: any) => k && typeof k === 'string');
      } else if (typeof schedule.keywords === 'string' && schedule.keywords.trim()) {
        keywordsArray = schedule.keywords.split(',').map((k: string) => k.trim()).filter(k => k);
      }
    }

    // Generate content directly here since we need better error handling
    try {
      const contentRequest = {
        userId: userId, // CRITICAL: Explicitly pass userId
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
        publishDelay: schedule.publishDelay || 0
      };

      console.log('Manual run - generating content with userId:', userId);
      console.log('Publishing configuration:', {
        autoPublish: contentRequest.autoPublish,
        publishDelay: contentRequest.publishDelay,
        willPublishImmediately: contentRequest.autoPublish && contentRequest.publishDelay === 0
      });
      
      // Import aiService at the top of the file if not already imported
      const { aiService } = await import("../../services/ai-service");
      const result = await aiService.generateContent(contentRequest);
      
      console.log('Content generation result:', {
        success: !!result,
        hasContentId: !!result?.contentId,
        contentId: result?.contentId,
        wasPublished: result?.published || false
      });
      
      if (result && result.contentId) {
        if (schedule.autoPublish && schedule.publishDelay === 0) {
          // Content should already be published by aiService
          try {
            // Check if content_schedule entry was created
            const scheduleEntry = await storage.getContentScheduleByContentId(result.contentId);
            if (!scheduleEntry) {
              await storage.createContentSchedule({
                contentId: result.contentId,
                websiteId: schedule.websiteId,
                userId: userId,
                scheduled_date: new Date(), // Set to NOW for immediate publishing
                status: 'published',
                title: result.title || topic,
                timezone: schedule.timezone || 'UTC',
                metadata: {
                  autoGenerated: true,
                  autoScheduleId: schedule.id,
                  publishedImmediately: true,
                  generatedAt: new Date(),
                  timeOfDay_UTC: schedule.timeOfDay,
                  localTime: schedule.localTime,
                  timezone: schedule.timezone
                }
              });
            }
          } catch (scheduleError) {
            console.error('Error handling content schedule:', scheduleError);
          }
        } else if (schedule.autoPublish && schedule.publishDelay > 0) {
          try {
            const scheduledDate = new Date();
            scheduledDate.setHours(scheduledDate.getHours() + schedule.publishDelay);
            
            await storage.createContentSchedule({
              contentId: result.contentId,
              websiteId: schedule.websiteId,
              userId: userId,
              scheduled_date: scheduledDate, // Set future date for delayed publishing
              status: 'scheduled',
              title: result.title || topic,
              timezone: schedule.timezone || 'UTC',
              metadata: {
                autoGenerated: true,
                autoScheduleId: schedule.id,
                publishDelay: schedule.publishDelay,
                generatedAt: new Date(),
                timeOfDay_UTC: schedule.timeOfDay,
                localTime: schedule.localTime,
                timezone: schedule.timezone
              }
            });
          } catch (scheduleError) {
            console.error('Error creating delayed schedule:', scheduleError);
          }
        } else {
          try {
            await storage.createContentSchedule({
              contentId: result.contentId,
              websiteId: schedule.websiteId,
              userId: userId,
              scheduled_date: new Date(), // Set to NOW for drafts
              status: 'draft',
              title: result.title || topic,
              timezone: schedule.timezone || 'UTC',
              metadata: {
                autoGenerated: true,
                autoScheduleId: schedule.id,
                isDraft: true,
                generatedAt: new Date(),
                timeOfDay_UTC: schedule.timeOfDay,
                localTime: schedule.localTime,
                timezone: schedule.timezone
              }
            });
          } catch (scheduleError) {
            console.error('Error creating draft schedule:', scheduleError);
          }
        }
        
        // Update schedule metrics
        const costToday = parseFloat(schedule.costToday || '0');
        const totalCost = parseFloat(result.totalCost || '0');
        
        await storage.updateAutoSchedule(schedule.id, {
          lastRun: new Date(),
          postsThisMonth: (schedule.postsThisMonth || 0) + 1,
          costToday: costToday + totalCost,
          nextTopicIndex: schedule.topicRotation === 'sequential' 
            ? ((schedule.nextTopicIndex || 0) + 1) % Math.max(topics.length, 1) 
            : schedule.nextTopicIndex
        });

        // Log success
        await storage.createActivityLog({
          userId,
          websiteId: schedule.websiteId,
          type: "auto_content_generated",
          description: `Successfully generated content via manual run: "${topic}"`,
          metadata: {
            scheduleId: schedule.id,
            contentId: result.contentId,
            cost: totalCost,
            autoPublished: schedule.autoPublish && schedule.publishDelay === 0,
            scheduledForPublishing: schedule.autoPublish && schedule.publishDelay > 0,
            timeOfDay_UTC: schedule.timeOfDay,
            timezone: schedule.timezone
          }
        });

        res.json({ 
          success: true, 
          contentId: result.contentId,
          topic,
          cost: totalCost,
          published: schedule.autoPublish && schedule.publishDelay === 0,
          scheduledForPublishing: schedule.autoPublish && schedule.publishDelay > 0,
          message: schedule.autoPublish && schedule.publishDelay === 0 
            ? "Content generated and published immediately"
            : schedule.autoPublish && schedule.publishDelay > 0
            ? `Content generated and scheduled for publishing in ${schedule.publishDelay} hours`
            : "Content generated successfully (saved as draft)"
        });
      } else {
        throw new Error('Content generation returned no contentId');
      }
    } catch (genError: any) {
      console.error("Content generation error:", genError);
      
      // Log the failure
      await storage.createActivityLog({
        userId,
        websiteId: schedule.websiteId,
        type: "auto_content_failed",
        description: `Failed to generate content for: ${schedule.name}`,
        metadata: {
          scheduleId: schedule.id,
          error: genError.message,
          stack: genError.stack
        }
      });
      
      res.status(500).json({ 
        error: "Failed to generate content",
        details: genError.message 
      });
    }
  } catch (error: any) {
    console.error("Error running auto-schedule:", error);
    res.status(500).json({ 
      error: "Failed to run schedule",
      details: error.message 
    });
  }
});

// DELETE /api/user/auto-schedules/:id - Delete schedule
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get the schedule to verify ownership
    const schedule = await storage.getAutoSchedule(req.params.id);
    if (!schedule || schedule.userId !== userId) {
      return res.status(404).json({ error: "Schedule not found" });
    }

    // Soft delete the schedule
    await storage.deleteAutoSchedule(req.params.id);

    // Log activity
    await storage.createActivityLog({
      userId,
      websiteId: schedule.websiteId,
      type: "auto_schedule_deleted",
      description: `Deleted auto-generation schedule: ${schedule.name}`,
      metadata: { scheduleId: req.params.id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting auto-schedule:", error);
    res.status(500).json({ error: "Failed to delete schedule" });
  }
});

// TEST ENDPOINT - Add this to verify timezone conversion is working
router.post("/test-timezone", requireAuth, async (req, res) => {
  try {
    const { localTime, timezone } = req.body;
    
    const utcTime = convertTimeToUTC(localTime, timezone);
    const offset = getTimezoneOffsetMinutes(new Date(), timezone);
    
    res.json({
      input: {
        localTime,
        timezone
      },
      output: {
        utcTime,
        offsetMinutes: offset,
        offsetHours: offset / 60
      },
      examples: {
        'Tokyo 09:00 AM': convertTimeToUTC('09:00', 'Asia/Tokyo'),
        'Tokyo 16:55': convertTimeToUTC('16:55', 'Asia/Tokyo'),
        'Manila 09:00 AM': convertTimeToUTC('09:00', 'Asia/Manila'),
        'New York 09:00 AM': convertTimeToUTC('09:00', 'America/New_York')
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;


















//WAG ALISIN
//server/api/auto-schedules.ts
//import { Router } from "express";
// import { storage } from "../../storage";
// import { autoScheduleService } from "../../services/auto-schedule-service";
// import { requireAuth } from "../../middleware/auth"; // Assuming you have auth middleware

// const router = Router();

// // Apply auth middleware to all routes
// router.use(requireAuth);

// // GET /api/user/auto-schedules - Get all schedules for user
// router.get("/", async (req, res) => {
//   try {
//     const userId = req.user?.id;
//     if (!userId) {
//       return res.status(401).json({ error: "Unauthorized" });
//     }

//     const { websiteId } = req.query;
    
//     let schedules;
//     if (websiteId) {
//       // Verify ownership and get schedules for specific website
//       const website = await storage.getUserWebsite(websiteId as string, userId);
//       if (!website) {
//         return res.status(403).json({ error: "Access denied to this website" });
//       }
      
//       // Get all user schedules and filter by website
//       schedules = await storage.getUserAutoSchedules(userId);
//       schedules = schedules.filter(s => s.websiteId === websiteId);
//     } else {
//       // Get all schedules for the user
//       schedules = await storage.getUserAutoSchedules(userId);
//     }
    
//     res.json({ schedules });
//   } catch (error) {
//     console.error("Error fetching auto-schedules:", error);
//     res.status(500).json({ error: "Failed to fetch schedules" });
//   }
// });

// // POST /api/user/auto-schedules - Create new schedule
// router.post("/", async (req, res) => {
//   try {
//     const userId = req.user?.id;
//     if (!userId) {
//       return res.status(401).json({ error: "Unauthorized" });
//     }

//     // Verify website ownership
//     const website = await storage.getUserWebsite(req.body.websiteId, userId);
//     if (!website) {
//       return res.status(403).json({ error: "Access denied to this website" });
//     }

//     // Create the schedule - don't pass id, createdAt, or updatedAt
//     const scheduleData = {
//       websiteId: req.body.websiteId,
//       name: req.body.name,
//       frequency: req.body.frequency,
//       timeOfDay: req.body.timeOfDay,
//       customDays: req.body.customDays || [],
//       topics: req.body.topics || [],
//       keywords: req.body.keywords || '',
//       tone: req.body.tone || 'professional',
//       wordCount: req.body.wordCount || 800,
//       brandVoice: req.body.brandVoice || '',
//       targetAudience: req.body.targetAudience || '',
//       eatCompliance: req.body.eatCompliance || false,
//       aiProvider: req.body.aiProvider || 'openai',
//       includeImages: req.body.includeImages || false,
//       imageCount: req.body.imageCount || 1,
//       imageStyle: req.body.imageStyle || 'natural',
//       seoOptimized: req.body.seoOptimized !== false,
//       autoPublish: req.body.autoPublish || false,
//       publishDelay: req.body.publishDelay || 0,
//       topicRotation: req.body.topicRotation || 'random',
//       maxDailyCost: req.body.maxDailyCost || 5.00,
//       maxMonthlyPosts: req.body.maxMonthlyPosts || 30,
//       userId,
//       // These will be set with defaults
//       costToday: 0,
//       postsThisMonth: 0,
//       nextTopicIndex: 0,
//       lastRun: null,
//       isActive: req.body.isActive !== false
//     };

//     const schedule = await storage.createAutoSchedule(scheduleData);

//     // Log activity
//     await storage.createActivityLog({
//       userId,
//       websiteId: req.body.websiteId,
//       type: "auto_schedule_created",
//       description: `Created auto-generation schedule: ${req.body.name}`,
//       metadata: {
//         scheduleId: schedule.id,
//         frequency: req.body.frequency,
//         topics: req.body.topics
//       }
//     });

//     res.json({ success: true, schedule });
//   } catch (error) {
//     console.error("Error creating auto-schedule:", error);
//     res.status(500).json({ error: "Failed to create schedule" });
//   }
// });

// // PUT /api/user/auto-schedules/:id - Update schedule
// router.put("/:id", async (req, res) => {
//   try {
//     const userId = req.user?.id;
//     if (!userId) {
//       return res.status(401).json({ error: "Unauthorized" });
//     }

//     // Get the schedule to verify ownership
//     const schedule = await storage.getAutoSchedule(req.params.id);
//     if (!schedule || schedule.userId !== userId) {
//       return res.status(404).json({ error: "Schedule not found" });
//     }

//     // Update the schedule
//     await storage.updateAutoSchedule(req.params.id, {
//       ...req.body,
//       updatedAt: new Date()
//     });

//     res.json({ success: true });
//   } catch (error) {
//     console.error("Error updating auto-schedule:", error);
//     res.status(500).json({ error: "Failed to update schedule" });
//   }
// });

// // POST /api/user/auto-schedules/:id/toggle - Toggle schedule active status
// router.post("/:id/toggle", async (req, res) => {
//   try {
//     const userId = req.user?.id;
//     if (!userId) {
//       return res.status(401).json({ error: "Unauthorized" });
//     }

//     // Get the schedule to verify ownership
//     const schedule = await storage.getAutoSchedule(req.params.id);
//     if (!schedule || schedule.userId !== userId) {
//       return res.status(404).json({ error: "Schedule not found" });
//     }

//     const { isActive } = req.body;
    
//     // Update the schedule
//     await storage.updateAutoSchedule(req.params.id, { 
//       isActive,
//       updatedAt: new Date()
//     });

//     // Log activity
//     await storage.createActivityLog({
//       userId,
//       websiteId: schedule.websiteId,
//       type: isActive ? "auto_schedule_activated" : "auto_schedule_paused",
//       description: `${isActive ? 'Activated' : 'Paused'} auto-generation schedule: ${schedule.name}`,
//       metadata: { scheduleId: req.params.id }
//     });

//     res.json({ success: true });
//   } catch (error) {
//     console.error("Error toggling auto-schedule:", error);
//     res.status(500).json({ error: "Failed to toggle schedule" });
//   }
// });






// // POST /api/user/auto-schedules/:id/run - Run schedule immediately
// router.post("/:id/run", async (req, res) => {
//   try {
//     const userId = req.user?.id;
//     if (!userId) {
//       return res.status(401).json({ error: "Unauthorized" });
//     }

//     // Get the schedule to verify ownership
//     const schedule = await storage.getAutoSchedule(req.params.id);
//     if (!schedule || schedule.userId !== userId) {
//       return res.status(404).json({ error: "Schedule not found or access denied" });
//     }

//     // CRITICAL: Ensure userId is in the schedule object
//     schedule.userId = userId;

//     console.log('Manual run initiated for schedule:', {
//       scheduleId: schedule.id,
//       scheduleName: schedule.name,
//       userId: userId,
//       websiteId: schedule.websiteId,
//       autoPublish: schedule.autoPublish,
//       publishDelay: schedule.publishDelay
//     });

//     // Log the manual run attempt
//     await storage.createActivityLog({
//       userId,
//       websiteId: schedule.websiteId,
//       type: "auto_schedule_manual_run",
//       description: `Manually triggered auto-generation: ${schedule.name}`,
//       metadata: { scheduleId: req.params.id }
//     });

//     // Select topic based on rotation strategy
//     const topics = schedule.topics || [];
//     let topic = 'General content';
    
//     if (topics.length > 0) {
//       if (schedule.topicRotation === 'sequential') {
//         const index = schedule.nextTopicIndex || 0;
//         topic = topics[index % topics.length];
//       } else {
//         topic = topics[Math.floor(Math.random() * topics.length)];
//       }
//     }

//     // Process keywords safely
//     let keywordsArray: string[] = [];
//     if (schedule.keywords) {
//       if (Array.isArray(schedule.keywords)) {
//         keywordsArray = schedule.keywords.filter((k: any) => k && typeof k === 'string');
//       } else if (typeof schedule.keywords === 'string' && schedule.keywords.trim()) {
//         keywordsArray = schedule.keywords.split(',').map((k: string) => k.trim()).filter(k => k);
//       }
//     }

//     // Generate content directly here since we need better error handling
//     try {
//       const contentRequest = {
//         userId: userId, // CRITICAL: Explicitly pass userId
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
//         publishDelay: schedule.publishDelay || 0
//       };

//       console.log('Manual run - generating content with userId:', userId);
//       console.log('Publishing configuration:', {
//         autoPublish: contentRequest.autoPublish,
//         publishDelay: contentRequest.publishDelay,
//         willPublishImmediately: contentRequest.autoPublish && contentRequest.publishDelay === 0
//       });
      
//       // Import aiService at the top of the file if not already imported
//       const { aiService } = await import("../../services/ai-service");
//       const result = await aiService.generateContent(contentRequest);
      
//       console.log('Content generation result:', {
//         success: !!result,
//         hasContentId: !!result?.contentId,
//         contentId: result?.contentId,
//         wasPublished: result?.published || false
//       });
      
//       if (result && result.contentId) {
//         if (schedule.autoPublish && schedule.publishDelay === 0) {
//           // Content should already be published by aiService
//           // Just ensure the content_schedule entry exists with proper scheduled_date
//           try {
//             // Check if content_schedule entry was created
//             const scheduleEntry = await storage.getContentScheduleByContentId(result.contentId);
//             if (!scheduleEntry) {
//               await storage.createContentSchedule({
//                 contentId: result.contentId,
//                 websiteId: schedule.websiteId,
//                 userId: userId,
//                 scheduled_date: new Date(), // Set to NOW for immediate publishing
//                 status: 'published',
//                 title: result.title || topic,
//                 metadata: {
//                   autoGenerated: true,
//                   autoScheduleId: schedule.id,
//                   publishedImmediately: true,
//                   generatedAt: new Date()
//                 }
//               });
//             }
//           } catch (scheduleError) {
//             console.error('Error handling content schedule:', scheduleError);
//             // Don't fail the whole operation if schedule entry has issues
//           }
//         } else if (schedule.autoPublish && schedule.publishDelay > 0) {
//           try {
//             const scheduledDate = new Date();
//             scheduledDate.setHours(scheduledDate.getHours() + schedule.publishDelay);
            
//             await storage.createContentSchedule({
//               contentId: result.contentId,
//               websiteId: schedule.websiteId,
//               userId: userId,
//               scheduled_date: scheduledDate, // Set future date for delayed publishing
//               status: 'scheduled',
//               title: result.title || topic,
//               metadata: {
//                 autoGenerated: true,
//                 autoScheduleId: schedule.id,
//                 publishDelay: schedule.publishDelay,
//                 generatedAt: new Date()
//               }
//             });
//           } catch (scheduleError) {
//             console.error('Error creating delayed schedule:', scheduleError);
//           }
//         } else {
//           try {
//             await storage.createContentSchedule({
//               contentId: result.contentId,
//               websiteId: schedule.websiteId,
//               userId: userId,
//               scheduled_date: new Date(), // Set to NOW for drafts
//               status: 'draft',
//               title: result.title || topic,
//               metadata: {
//                 autoGenerated: true,
//                 autoScheduleId: schedule.id,
//                 isDraft: true,
//                 generatedAt: new Date()
//               }
//             });
//           } catch (scheduleError) {
//             console.error('Error creating draft schedule:', scheduleError);
//           }
//         }
        
//         // Update schedule metrics
//         const costToday = parseFloat(schedule.costToday || '0');
//         const totalCost = parseFloat(result.totalCost || '0');
        
//         await storage.updateAutoSchedule(schedule.id, {
//           lastRun: new Date(),
//           postsThisMonth: (schedule.postsThisMonth || 0) + 1,
//           costToday: costToday + totalCost,
//           nextTopicIndex: schedule.topicRotation === 'sequential' 
//             ? ((schedule.nextTopicIndex || 0) + 1) % Math.max(topics.length, 1) 
//             : schedule.nextTopicIndex
//         });

//         // Log success
//         await storage.createActivityLog({
//           userId,
//           websiteId: schedule.websiteId,
//           type: "auto_content_generated",
//           description: `Successfully generated content via manual run: "${topic}"`,
//           metadata: {
//             scheduleId: schedule.id,
//             contentId: result.contentId,
//             cost: totalCost,
//             autoPublished: schedule.autoPublish && schedule.publishDelay === 0,
//             scheduledForPublishing: schedule.autoPublish && schedule.publishDelay > 0
//           }
//         });

//         res.json({ 
//           success: true, 
//           contentId: result.contentId,
//           topic,
//           cost: totalCost,
//           published: schedule.autoPublish && schedule.publishDelay === 0,
//           scheduledForPublishing: schedule.autoPublish && schedule.publishDelay > 0,
//           message: schedule.autoPublish && schedule.publishDelay === 0 
//             ? "Content generated and published immediately"
//             : schedule.autoPublish && schedule.publishDelay > 0
//             ? `Content generated and scheduled for publishing in ${schedule.publishDelay} hours`
//             : "Content generated successfully (saved as draft)"
//         });
//       } else {
//         throw new Error('Content generation returned no contentId');
//       }
//     } catch (genError: any) {
//       console.error("Content generation error:", genError);
      
//       // Log the failure
//       await storage.createActivityLog({
//         userId,
//         websiteId: schedule.websiteId,
//         type: "auto_content_failed",
//         description: `Failed to generate content for: ${schedule.name}`,
//         metadata: {
//           scheduleId: schedule.id,
//           error: genError.message,
//           stack: genError.stack
//         }
//       });
      
//       res.status(500).json({ 
//         error: "Failed to generate content",
//         details: genError.message 
//       });
//     }
//   } catch (error: any) {
//     console.error("Error running auto-schedule:", error);
//     res.status(500).json({ 
//       error: "Failed to run schedule",
//       details: error.message 
//     });
//   }
// });

// // DELETE /api/user/auto-schedules/:id - Delete schedule
// router.delete("/:id", async (req, res) => {
//   try {
//     const userId = req.user?.id;
//     if (!userId) {
//       return res.status(401).json({ error: "Unauthorized" });
//     }

//     // Get the schedule to verify ownership
//     const schedule = await storage.getAutoSchedule(req.params.id);
//     if (!schedule || schedule.userId !== userId) {
//       return res.status(404).json({ error: "Schedule not found" });
//     }

//     // Soft delete the schedule
//     await storage.deleteAutoSchedule(req.params.id);

//     // Log activity
//     await storage.createActivityLog({
//       userId,
//       websiteId: schedule.websiteId,
//       type: "auto_schedule_deleted",
//       description: `Deleted auto-generation schedule: ${schedule.name}`,
//       metadata: { scheduleId: req.params.id }
//     });

//     res.json({ success: true });
//   } catch (error) {
//     console.error("Error deleting auto-schedule:", error);
//     res.status(500).json({ error: "Failed to delete schedule" });
//   }
// });

// export default router;