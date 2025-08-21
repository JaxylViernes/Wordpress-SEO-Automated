import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { aiService } from "./services/ai-service";
import { seoService } from "./services/seo-service";
import { approvalWorkflowService } from "./services/approval-workflow";
import { insertWebsiteSchema, insertContentSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Websites routes
  app.get("/api/websites", async (req, res) => {
    try {
      const websites = await storage.getWebsites();
      res.json(websites);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch websites" });
    }
  });

  app.get("/api/websites/:id", async (req, res) => {
    try {
      const website = await storage.getWebsite(req.params.id);
      if (!website) {
        return res.status(404).json({ message: "Website not found" });
      }
      res.json(website);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch website" });
    }
  });

  app.post("/api/websites", async (req, res) => {
    try {
      const validatedData = insertWebsiteSchema.parse(req.body);
      const website = await storage.createWebsite(validatedData);
      res.status(201).json(website);
    } catch (error) {
      res.status(400).json({ message: "Invalid website data" });
    }
  });

  app.put("/api/websites/:id", async (req, res) => {
    try {
      const website = await storage.updateWebsite(req.params.id, req.body);
      if (!website) {
        return res.status(404).json({ message: "Website not found" });
      }
      res.json(website);
    } catch (error) {
      res.status(500).json({ message: "Failed to update website" });
    }
  });

  app.delete("/api/websites/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteWebsite(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Website not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete website" });
    }
  });

  // Content routes
  app.get("/api/websites/:id/content", async (req, res) => {
    try {
      const content = await storage.getContentByWebsite(req.params.id);
      res.json(content);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.post("/api/content/generate", async (req, res) => {
    try {
      const { websiteId, topic, keywords, tone, wordCount, brandVoice, targetAudience, eatCompliance } = req.body;
      
      if (!websiteId || !topic) {
        return res.status(400).json({ message: "Website ID and topic are required" });
      }

      const result = await aiService.generateContent({
        websiteId,
        topic,
        keywords: keywords || [],
        tone: tone || "professional",
        wordCount: wordCount || 800,
        seoOptimized: true,
        brandVoice: brandVoice || "professional",
        targetAudience,
        eatCompliance: eatCompliance || false
      });

      // Save the generated content (defaults to pending_approval)
      const content = await storage.createContent({
        websiteId,
        title: result.title,
        body: result.content,
        excerpt: result.excerpt,
        metaDescription: result.metaDescription,
        metaTitle: result.metaTitle,
        aiModel: "gpt-4o",
        seoKeywords: result.keywords,
        seoScore: result.seoScore,
        readabilityScore: result.readabilityScore,
        brandVoiceScore: result.brandVoiceScore,
        eatCompliance: result.eatCompliance,
      });

      // Log the activity
      await storage.createActivityLog({
        websiteId,
        type: "content_generated",
        description: `AI content generated: "${result.title}" (${result.tokensUsed} tokens, $${result.costUsd})`,
        metadata: { 
          contentId: content.id, 
          aiModel: "gpt-4o",
          tokensUsed: result.tokensUsed,
          costUsd: result.costUsd,
          qualityChecks: result.qualityChecks
        }
      });

      res.json({ content, aiResult: result });
    } catch (error) {
      console.error("Content generation error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to generate content" });
    }
  });

  app.post("/api/content/:id/publish", async (req, res) => {
    try {
      const content = await storage.updateContent(req.params.id, {
        status: "published",
        publishDate: new Date()
      });

      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }

      // Log the activity
      await storage.createActivityLog({
        websiteId: content.websiteId,
        type: "content_published",
        description: `Content published: "${content.title}"`,
        metadata: { contentId: content.id }
      });

      res.json(content);
    } catch (error) {
      res.status(500).json({ message: "Failed to publish content" });
    }
  });

  // SEO routes
  app.get("/api/websites/:id/seo-reports", async (req, res) => {
    try {
      const reports = await storage.getSeoReportsByWebsite(req.params.id);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch SEO reports" });
    }
  });

  app.post("/api/websites/:id/seo-analysis", async (req, res) => {
    try {
      const website = await storage.getWebsite(req.params.id);
      if (!website) {
        return res.status(404).json({ message: "Website not found" });
      }

      const analysis = await seoService.analyzeWebsite(website.url);
      
      // Save the report
      const report = await storage.createSeoReport({
        websiteId: req.params.id,
        score: analysis.score,
        issues: analysis.issues,
        recommendations: analysis.recommendations,
        pageSpeedScore: analysis.pageSpeedScore
      });

      // Update website SEO score
      await storage.updateWebsite(req.params.id, {
        seoScore: analysis.score
      });

      // Log the activity
      await storage.createActivityLog({
        websiteId: req.params.id,
        type: "seo_analysis",
        description: `SEO analysis completed (Score: ${analysis.score})`,
        metadata: { reportId: report.id, score: analysis.score }
      });

      res.json(analysis);
    } catch (error) {
      console.error("SEO analysis error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to perform SEO analysis" });
    }
  });

  app.post("/api/websites/:id/seo-autofix", async (req, res) => {
    try {
      const { issueType } = req.body;
      const result = await seoService.performAutoFix(req.params.id, issueType);
      
      if (result.success) {
        await storage.createActivityLog({
          websiteId: req.params.id,
          type: "seo_autofix",
          description: `Auto-fix applied: ${issueType}`,
          metadata: { issueType, success: true }
        });
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to apply auto-fix" });
    }
  });

  // Activity logs
  app.get("/api/activity-logs", async (req, res) => {
    try {
      const websiteId = req.query.websiteId as string;
      const logs = await storage.getActivityLogs(websiteId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const websites = await storage.getWebsites();
      const allLogs = await storage.getActivityLogs();
      
      const stats = {
        activeWebsites: websites.length,
        contentGenerated: allLogs.filter(log => log.type === "content_generated" || log.type === "content_published").length,
        avgSeoScore: Math.round(websites.reduce((sum, w) => sum + w.seoScore, 0) / websites.length) || 0,
        scheduledPosts: allLogs.filter(log => log.type === "content_scheduled").length
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Performance data for charts
  app.get("/api/dashboard/performance", async (req, res) => {
    try {
      // Generate mock performance data for the last 30 days
      const days = 7;
      const data = [];
      const baseScore = 75;
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const variation = Math.random() * 10 - 5; // +/- 5 points
        const score = Math.max(70, Math.min(100, baseScore + variation + (i * 2))); // Slight upward trend
        
        data.push({
          date: date.toISOString().split('T')[0],
          score: Math.round(score)
        });
      }

      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch performance data" });
    }
  });

  // Content Approval Workflow Routes
  app.get("/api/content/pending-approval", async (req, res) => {
    try {
      const pendingContent = await approvalWorkflowService.getPendingApprovals();
      res.json(pendingContent);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending approvals" });
    }
  });

  app.post("/api/content/:id/submit-for-approval", async (req, res) => {
    try {
      const result = await approvalWorkflowService.submitForApproval(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to submit for approval" });
    }
  });

  app.post("/api/content/:id/approve", async (req, res) => {
    try {
      const { reviewerId, feedback, qualityScore } = req.body;
      
      if (!reviewerId) {
        return res.status(400).json({ message: "Reviewer ID is required" });
      }

      const result = await approvalWorkflowService.processApproval({
        contentId: req.params.id,
        reviewerId,
        decision: "approved",
        feedback,
        qualityScore
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve content" });
    }
  });

  app.post("/api/content/:id/reject", async (req, res) => {
    try {
      const { reviewerId, feedback, qualityScore } = req.body;
      
      if (!reviewerId) {
        return res.status(400).json({ message: "Reviewer ID is required" });
      }

      const result = await approvalWorkflowService.processApproval({
        contentId: req.params.id,
        reviewerId,
        decision: "rejected",
        feedback,
        qualityScore
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to reject content" });
    }
  });

  app.post("/api/content/:id/publish", async (req, res) => {
    try {
      const { publishNow, scheduledDate, performBackup } = req.body;
      
      const result = await approvalWorkflowService.publishApprovedContent(
        req.params.id,
        {
          publishNow: publishNow || false,
          scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
          performBackup: performBackup || true
        }
      );

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to publish content" });
    }
  });

  // Emergency Controls
  app.post("/api/websites/:id/emergency-stop", async (req, res) => {
    try {
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ message: "Emergency stop reason is required" });
      }

      const result = await approvalWorkflowService.emergencyStop(req.params.id, reason);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to activate emergency stop" });
    }
  });

  // AI Usage Tracking
  app.get("/api/ai-usage/:websiteId", async (req, res) => {
    try {
      const usage = await storage.aiUsageTracking
        .select()
        .from(storage.aiUsageTracking)
        .where(eq(storage.aiUsageTracking.websiteId, req.params.websiteId))
        .orderBy(desc(storage.aiUsageTracking.createdAt))
        .limit(100);
      
      res.json(usage);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch AI usage data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
