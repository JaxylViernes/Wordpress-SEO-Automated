import { Router } from "express";
import { storage } from "../../storage";
import { autoScheduleService } from "../../services/auto-schedule-service";
import { requireAuth } from "../../middleware/auth"; // Assuming you have auth middleware

const router = Router();

// Apply auth middleware to all routes
router.use(requireAuth);

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

// POST /api/user/auto-schedules - Create new schedule
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

    // Create the schedule - don't pass id, createdAt, or updatedAt
    const scheduleData = {
      websiteId: req.body.websiteId,
      name: req.body.name,
      frequency: req.body.frequency,
      timeOfDay: req.body.timeOfDay,
      customDays: req.body.customDays || [],
      topics: req.body.topics || [],
      keywords: req.body.keywords || '',
      tone: req.body.tone || 'professional',
      wordCount: req.body.wordCount || 800,
      brandVoice: req.body.brandVoice || '',
      targetAudience: req.body.targetAudience || '',
      eatCompliance: req.body.eatCompliance || false,
      aiProvider: req.body.aiProvider || 'openai',
      includeImages: req.body.includeImages || false,
      imageCount: req.body.imageCount || 1,
      imageStyle: req.body.imageStyle || 'natural',
      seoOptimized: req.body.seoOptimized !== false,
      autoPublish: req.body.autoPublish || false,
      publishDelay: req.body.publishDelay || 0,
      topicRotation: req.body.topicRotation || 'random',
      maxDailyCost: req.body.maxDailyCost || 5.00,
      maxMonthlyPosts: req.body.maxMonthlyPosts || 30,
      userId,
      // These will be set with defaults
      costToday: 0,
      postsThisMonth: 0,
      nextTopicIndex: 0,
      lastRun: null,
      isActive: req.body.isActive !== false
    };

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
        topics: req.body.topics
      }
    });

    res.json({ success: true, schedule });
  } catch (error) {
    console.error("Error creating auto-schedule:", error);
    res.status(500).json({ error: "Failed to create schedule" });
  }
});

// PUT /api/user/auto-schedules/:id - Update schedule
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

    // Update the schedule
    await storage.updateAutoSchedule(req.params.id, {
      ...req.body,
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
      publishDelay: schedule.publishDelay
    });

    // Log the manual run attempt
    await storage.createActivityLog({
      userId,
      websiteId: schedule.websiteId,
      type: "auto_schedule_manual_run",
      description: `Manually triggered auto-generation: ${schedule.name}`,
      metadata: { scheduleId: req.params.id }
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
          // Just ensure the content_schedule entry exists with proper scheduled_date
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
                metadata: {
                  autoGenerated: true,
                  autoScheduleId: schedule.id,
                  publishedImmediately: true,
                  generatedAt: new Date()
                }
              });
            }
          } catch (scheduleError) {
            console.error('Error handling content schedule:', scheduleError);
            // Don't fail the whole operation if schedule entry has issues
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
              metadata: {
                autoGenerated: true,
                autoScheduleId: schedule.id,
                publishDelay: schedule.publishDelay,
                generatedAt: new Date()
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
              metadata: {
                autoGenerated: true,
                autoScheduleId: schedule.id,
                isDraft: true,
                generatedAt: new Date()
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
            scheduledForPublishing: schedule.autoPublish && schedule.publishDelay > 0
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

export default router;