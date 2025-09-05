import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { aiService } from "./services/ai-service";
import { seoService } from "./services/seo-service";
import { approvalWorkflowService } from "./services/approval-workflow";
import { insertWebsiteSchema, insertContentSchema } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { AuthService } from "./services/auth-service";
import { wordpressService } from "./services/wordpress-service";
import { wordPressAuthService } from './services/wordpress-auth'; // Adjust path as needed
import { aiFixService } from "./services/ai-fix-service";


const authService = new AuthService();

// Extend Request interface for session and user
declare global {
  namespace Express {
    interface Request {
      session?: {
        userId?: string;
        save: (callback: (err?: any) => void) => void;
        destroy: (callback: (err?: any) => void) => void;
      };
      user?: {
        id: string;
        username: string;
        email: string;
        name: string;
      };
    }
  }
}

// Session middleware to check authentication
const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessionId = req.session?.userId;
    if (!sessionId) {
      console.log('❌ No session in requireAuth middleware');
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const user = await storage.getUser(sessionId);
    if (!user) {
      console.log('❌ User not found in requireAuth middleware');
      req.session?.destroy(() => {});
      res.status(401).json({ message: "Invalid session" });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ message: "Authentication error" });
  }
};
export async function registerRoutes(app: Express): Promise<Server> {
  
  // =============================================================================
  // AUTHENTICATION ROUTES
  // =============================================================================
  
  app.post("/api/auth/signup", async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('📝 Signup request received:', {
        body: req.body,
        hasUsername: !!req.body.username,
        hasPassword: !!req.body.password,
      });

      const { username, password, email, name } = req.body;

      if (!username || !password) {
        console.error('❌ Missing required fields');
        res.status(400).json({ 
          message: "Username and password are required",
          errors: ['Username is required', 'Password is required'].filter((_, i) => 
            i === 0 ? !username : !password
          )
        });
        return;
      }

      const validation = authService.validateUserData({ username, password, email, name });
      if (validation.length > 0) {
        console.error('❌ Validation errors:', validation);
        res.status(400).json({ 
          message: "Validation failed", 
          errors: validation 
        });
        return;
      }

      console.log('👤 Creating user...');
      const user = await authService.createUser({ username, password, email, name });
      console.log('✅ User created:', { id: user.id, username: user.username });
      
      if (req.session) {
        req.session.userId = user.id;
        req.session.save((err) => {
          if (err) {
            console.error("❌ Session save error:", err);
            res.status(500).json({ message: "Failed to create session" });
            return;
          }

          console.log('✅ Session created for user:', user.id);

          res.status(201).json({
            success: true,
            message: "Account created successfully",
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              name: user.name
            }
          });
        });
      } else {
        console.error('❌ No session available');
        res.status(500).json({ message: "Session not configured" });
      }
    } catch (error) {
      console.error("❌ Signup error:", error);
      
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          res.status(409).json({ message: error.message });
          return;
        }
        
        if (error.message.includes('Validation failed')) {
          res.status(400).json({ message: error.message });
          return;
        }
      }
      
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🔐 Login request received:', {
        hasUsername: !!req.body.username,
        hasPassword: !!req.body.password,
        username: req.body.username
      });

      const { username, password } = req.body;

      if (!username || !password) {
        console.error('❌ Missing login credentials');
        res.status(400).json({ message: "Username and password are required" });
        return;
      }

      console.log('🔍 Authenticating user...');
      const user = await authService.authenticateUser(username, password);
      console.log('✅ Authentication successful:', user.username);
      
      if (req.session) {
        req.session.userId = user.id;
        req.session.save((err) => {
          if (err) {
            console.error("❌ Session save error:", err);
            res.status(500).json({ message: "Failed to create session" });
            return;
          }

          console.log('✅ Session created for login:', user.id);

          res.json({
            success: true,
            message: "Login successful",
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              name: user.name
            }
          });
        });
      } else {
        console.error('❌ No session available for login');
        res.status(500).json({ message: "Session not configured" });
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      
      if (error instanceof Error && error.message.includes('Invalid username or password')) {
        res.status(401).json({ message: "Invalid username or password" });
        return;
      }
      
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.session?.userId;
      
      req.session?.destroy((err) => {
        if (err) {
          console.error("Session destroy error:", err);
          res.status(500).json({ message: "Failed to logout" });
          return;
        }
        
        res.clearCookie('connect.sid');
        res.json({ 
          success: true, 
          message: "Logged out successfully" 
        });
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('👤 Auth check request, session:', {
        hasSession: !!req.session,
        userId: req.session?.userId
      });

      const sessionId = req.session?.userId;
      if (!sessionId) {
        console.log('❌ No session ID found');
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      const user = await storage.getUser(sessionId);
      if (!user) {
        console.log('❌ User not found for session:', sessionId);
        req.session?.destroy(() => {});
        res.status(401).json({ message: "Invalid session" });
        return;
      }

      console.log('✅ User found:', { id: user.id, username: user.username });

      res.json({
        id: user.id,
        username: user.username,
        email: user.email || null,
        name: user.name || null
      });
    } catch (error) {
      console.error("❌ Auth check error:", error);
      res.status(500).json({ message: "Authentication error" });
    }
  });

  // =============================================================================
  // USER-SCOPED WEBSITES ROUTES
  // =============================================================================
  
  app.get("/api/user/websites", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      console.log(`🌐 Fetching websites for user: ${userId}`);
      
      const websites = await storage.getUserWebsites(userId);
      console.log(`✅ Found ${websites.length} websites for user ${userId}`);
      
      res.json(websites);
    } catch (error) {
      console.error("Failed to fetch user websites:", error);
      res.status(500).json({ message: "Failed to fetch websites" });
    }
  });

  app.get("/api/user/websites/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const website = await storage.getUserWebsite(req.params.id, userId);
      if (!website) {
        res.status(404).json({ message: "Website not found or access denied" });
        return;
      }
      res.json(website);
    } catch (error) {
      console.error("Failed to fetch user website:", error);
      res.status(500).json({ message: "Failed to fetch website" });
    }
  });

  app.post("/api/user/websites", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      console.log(`🌐 Creating website for user: ${userId}`, req.body);
      
      const validatedData = insertWebsiteSchema.parse(req.body);
      const websiteWithUserId = { ...validatedData, userId };
      
      const website = await storage.createWebsite(websiteWithUserId);
      console.log(`✅ Website created successfully:`, website.id);
      
      res.status(201).json(website);
    } catch (error) {
      console.error("Failed to create website:", error);
      
      if (error instanceof Error) {
        if (error.message.includes('authentication')) {
          res.status(401).json({ message: "WordPress authentication failed. Please check your credentials." });
          return;
        }
        if (error.message.includes('validation')) {
          res.status(400).json({ message: "Invalid website data: " + error.message });
          return;
        }
      }
      
      res.status(400).json({ message: "Failed to create website" });
    }
  });

  app.put("/api/user/websites/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      // Verify ownership before update
      const existingWebsite = await storage.getUserWebsite(req.params.id, userId);
      if (!existingWebsite) {
        res.status(404).json({ message: "Website not found or access denied" });
        return;
      }
      
      const website = await storage.updateWebsite(req.params.id, req.body);
      res.json(website);
    } catch (error) {
      console.error("Failed to update website:", error);
      res.status(500).json({ message: "Failed to update website" });
    }
  });

  app.delete("/api/user/websites/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      // Verify ownership before delete
      const existingWebsite = await storage.getUserWebsite(req.params.id, userId);
      if (!existingWebsite) {
        res.status(404).json({ message: "Website not found or access denied" });
        return;
      }
      
      const deleted = await storage.deleteWebsite(req.params.id);
      if (!deleted) {
        res.status(404).json({ message: "Website not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete website:", error);
      res.status(500).json({ message: "Failed to delete website" });
    }
  });

  // Website ownership validation endpoint
  app.post("/api/user/websites/:id/validate-ownership", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const website = await storage.getUserWebsite(req.params.id, userId);
      if (!website) {
        res.status(403).json({ message: "Website not found or access denied" });
        return;
      }
      res.json({ valid: true, websiteId: website.id, userId });
    } catch (error) {
      console.error("Website ownership validation failed:", error);
      res.status(500).json({ message: "Validation failed" });
    }
  });

  // =============================================================================
  // USER-SCOPED CONTENT ROUTES
  // =============================================================================

  app.get("/api/user/websites/:id/content", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      // Verify website ownership first
      const website = await storage.getUserWebsite(req.params.id, userId);
      if (!website) {
        res.status(404).json({ message: "Website not found or access denied" });
        return;
      }
      
      const content = await storage.getContentByWebsite(req.params.id);
      res.json(content);
    } catch (error) {
      console.error("Failed to fetch content:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

 app.post("/api/user/content/generate", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { websiteId, ...contentData } = req.body;
    
    // Verify website ownership
    const website = await storage.getUserWebsite(websiteId, userId);
    if (!website) {
      res.status(403).json({ message: "Website not found or access denied" });
      return;
    }
    
    const { 
      topic, 
      keywords, 
      tone, 
      wordCount, 
      brandVoice, 
      targetAudience, 
      eatCompliance,
      aiProvider = 'openai'
    } = contentData;
    
    if (!topic) {
      res.status(400).json({ message: "Topic is required" });
      return;
    }

    if (aiProvider && !['openai', 'anthropic'].includes(aiProvider)) {
      res.status(400).json({ message: "AI provider must be either 'openai' or 'anthropic'" });
      return;
    }

    console.log(`🤖 Generating content with ${aiProvider.toUpperCase()} for topic: ${topic}`);

    const result = await aiService.generateContent({
      websiteId,
      topic,
      keywords: keywords || [],
      tone: tone || "professional", 
      wordCount: wordCount || 800,
      seoOptimized: true,
      brandVoice: brandVoice || "professional",
      targetAudience,
      eatCompliance: eatCompliance || false,
      aiProvider: aiProvider as 'openai' | 'anthropic',
      userId: req.user!.id
    });

    // FIXED: Ensure we're saving proper numeric values, never 0 unless intended
    const content = await storage.createContent({
      userId,
      websiteId,
      title: result.title,
      body: result.content,
      excerpt: result.excerpt,
      metaDescription: result.metaDescription,
      metaTitle: result.metaTitle,
      seoScore: Math.max(1, Math.min(100, Math.round(result.seoScore))), // Ensure 1-100 range
      readabilityScore: Math.max(1, Math.min(100, Math.round(result.readabilityScore))), 
      brandVoiceScore: Math.max(1, Math.min(100, Math.round(result.brandVoiceScore))),
      tokensUsed: Math.max(1, result.tokensUsed), // Ensure at least 1
      costUsd: Math.max(1, Math.round((result.costUsd || 0.001) * 100)), // Convert to cents, min 1 cent
      eatCompliance: result.eatCompliance,
      seoKeywords: result.keywords,
      aiModel: aiProvider === 'openai' ? 'gpt-4o' : 'claude-3-5-sonnet-20250106'
    });

    console.log(`✅ Content saved with scores - SEO: ${content.seoScore}, Readability: ${content.readabilityScore}, Brand: ${content.brandVoiceScore}, Tokens: ${content.tokensUsed}, Cost: ${content.costUsd} cents`);

    // Log the activity
    await storage.createActivityLog({
      userId,
      websiteId,
      type: "content_generated",
      description: `AI content generated: "${result.title}" (${result.aiProvider.toUpperCase()})`,
      metadata: { 
        contentId: content.id,
        aiProvider: result.aiProvider,
        tokensUsed: content.tokensUsed,
        costCents: content.costUsd
      }
    });

    res.json({ content, aiResult: result });
  } catch (error) {
    console.error("Content generation error:", error);
    
    let statusCode = 500;
    let errorMessage = error instanceof Error ? error.message : "Failed to generate content";
    
    if (error instanceof Error) {
      if (error.name === 'AIProviderError') {
        statusCode = 400;
      } else if (error.name === 'AnalysisError') {
        statusCode = 422;
        errorMessage = `Content generated successfully, but analysis failed: ${error.message}`;
      }
    }
    
    res.status(statusCode).json({ 
      message: errorMessage,
      error: error instanceof Error ? error.name : 'UnknownError'
    });
  }
});

// Remove the duplicate route and use this single, fixed version
app.put("/api/user/content/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const contentId = req.params.id;
    const { websiteId, aiProvider, ...updateData } = req.body;
    
    // Verify website ownership if websiteId is provided
    if (websiteId) {
      const website = await storage.getUserWebsite(websiteId, userId);
      if (!website) {
        res.status(403).json({ message: "Website not found or access denied" });
        return;
      }
    }
    
    // If aiProvider is specified, re-analyze the content
    let analysis = null;
    if (aiProvider && updateData.title && updateData.body) {
      try {
        console.log(`🤖 Re-analyzing content with ${aiProvider.toUpperCase()}`);
        
        const keywords = Array.isArray(updateData.seoKeywords) ? 
          updateData.seoKeywords : 
          (typeof updateData.seoKeywords === 'string' ? 
            updateData.seoKeywords.split(',').map(k => k.trim()) : []);

        analysis = await aiService.analyzeExistingContent({
          title: updateData.title,
          content: updateData.body,
          keywords: keywords,
          tone: updateData.tone || 'professional',
          brandVoice: updateData.brandVoice,
          targetAudience: updateData.targetAudience,
          eatCompliance: updateData.eatCompliance || false,
          websiteId: websiteId || contentId,
          aiProvider: aiProvider as 'openai' | 'anthropic',
          userId: userId
        });

        // FIXED: Properly validate and set analysis results
        if (analysis) {
          console.log('Raw analysis results:', {
            seoScore: analysis.seoScore,
            readabilityScore: analysis.readabilityScore,
            brandVoiceScore: analysis.brandVoiceScore,
            tokensUsed: analysis.tokensUsed,
            costUsd: analysis.costUsd
          });

          // Ensure scores are valid numbers between 1-100, with fallbacks
          updateData.seoScore = Math.max(1, Math.min(100, Math.round(Number(analysis.seoScore) || 50)));
          updateData.readabilityScore = Math.max(1, Math.min(100, Math.round(Number(analysis.readabilityScore) || 50)));
          updateData.brandVoiceScore = Math.max(1, Math.min(100, Math.round(Number(analysis.brandVoiceScore) || 50)));
          
          // Ensure tokens used is a positive number
          updateData.tokensUsed = Math.max(1, Math.round(Number(analysis.tokensUsed) || 100));
          
          // Convert cost to cents, ensure it's at least 1 cent
          const costInDollars = Number(analysis.costUsd) || 0.01;
          updateData.costUsd = Math.max(1, Math.round(costInDollars * 100));

          // Update AI model based on provider
          updateData.aiModel = aiProvider === 'openai' ? 'gpt-4o' : 'claude-3-5-sonnet-20250106';

          console.log(`✅ Content re-analyzed - SEO: ${updateData.seoScore}%, Readability: ${updateData.readabilityScore}%, Brand Voice: ${updateData.brandVoiceScore}%, Tokens: ${updateData.tokensUsed}, Cost: ${updateData.costUsd} cents`);
        } else {
          console.warn("⚠️ Analysis returned null/undefined result");
        }
      } catch (analysisError) {
        console.warn(`⚠️ Content analysis failed: ${analysisError instanceof Error ? analysisError.message : 'Unknown error'}`);
        // Continue with update even if analysis fails, but don't update scores
      }
    }
    
    // Perform the update
    const updatedContent = await storage.updateContent(contentId, updateData);
    if (!updatedContent) {
      res.status(404).json({ message: "Content not found" });
      return;
    }

    // Log the activity if analysis was performed
    if (analysis && websiteId) {
      try {
        await storage.createActivityLog({
          userId,
          websiteId,
          type: "content_updated",
          description: `Content updated and re-analyzed: "${updatedContent.title}" (${aiProvider?.toUpperCase()})`,
          metadata: { 
            contentId: updatedContent.id,
            aiProvider: aiProvider,
            tokensUsed: updateData.tokensUsed,
            costCents: updateData.costUsd,
            scoresUpdated: !!analysis
          }
        });
      } catch (logError) {
        console.warn("Failed to log activity:", logError);
        // Don't fail the request if logging fails
      }
    }

    res.json({ 
      content: updatedContent,
      analysis: analysis // Include analysis results in response
    });
  } catch (error) {
    console.error("Content update error:", error);
    
    let statusCode = 500;
    let errorMessage = "Failed to update content";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.name === 'ValidationError') {
        statusCode = 400;
      }
    }
    
    res.status(statusCode).json({ 
      message: errorMessage,
      error: error instanceof Error ? error.name : 'UnknownError'
    });
  }
}); // Adjust path as needed

app.post("/api/user/content/:id/publish", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const contentId = req.params.id;
    
    console.log(`📝 Publishing content ${contentId} for user ${userId}`);
    
    // Get the content
    const content = await storage.getContent(contentId);
    if (!content || content.userId !== userId) {
      res.status(404).json({ message: "Content not found or access denied" });
      return;
    }

    // Get the website
    const website = await storage.getUserWebsite(content.websiteId, userId);
    if (!website) {
      res.status(404).json({ message: "Website not found or access denied" });
      return;
    }

    // Check if already published
    if (content.wordpressPostId && content.status === "published") {
      res.status(400).json({ 
        message: "Content already published to WordPress",
        wordpressPostId: content.wordpressPostId,
        wordpressUrl: content.wordpressUrl || `${website.url}/?p=${content.wordpressPostId}`
      });
      return;
    }

    // Use hardcoded credentials for now (no encryption/decryption)
    const wpCredentials = {
      applicationName: 'AI Content Manager',
      applicationPassword: 'nm48 i9wF QyBG 4ZzS AtOi FppB', // Your test password
      username: website.wpUsername || 'info@murrayimmeubles.com' // Your WordPress username
    };

    console.log(`🔐 Using WordPress credentials:`);
    console.log(`- URL: ${website.url}`);
    console.log(`- Username: ${wpCredentials.username}`);
    console.log(`- Password: ${wpCredentials.applicationPassword.substring(0, 10)}...`);

    // Test WordPress connection with diagnostics
    console.log(`🔗 Testing WordPress connection for ${website.url}...`);
    
    const connectionTest = await wordPressAuthService.testConnectionWithDiagnostics(
      website.url,
      wpCredentials
    );

    if (!connectionTest.success) {
      console.error('❌ WordPress connection failed:', connectionTest.error);
      console.log('Full diagnostics:', connectionTest.diagnostics);
      
      res.status(400).json({ 
        message: `Cannot connect to WordPress: ${connectionTest.error}`,
        error: 'WP_CONNECTION_FAILED',
        diagnostics: connectionTest.diagnostics,
        troubleshooting: connectionTest.diagnostics?.recommendations || [
          "Verify WordPress URL is correct and accessible",
          "Check Application Password is valid and not expired", 
          "Ensure WordPress REST API is enabled",
          "Check firewall/security plugin settings",
          "Verify user has publishing permissions"
        ]
      });
      return;
    }

    console.log(`✅ WordPress connection successful!`);
    console.log('User info:', connectionTest.userInfo);

    // Prepare post data
    const postData = {
      title: content.title,
      content: content.body,
      excerpt: content.excerpt || '',
      status: 'publish' as const,
      meta: {
        description: content.metaDescription || content.excerpt || '',
        title: content.metaTitle || content.title
      }
    };

    let wpResult;
    try {
      if (content.wordpressPostId) {
        // Update existing post
        console.log(`📝 Updating existing WordPress post ${content.wordpressPostId}`);
        wpResult = await wordpressService.updatePost(
          {
            url: website.url,
            username: wpCredentials.username,
            applicationPassword: wpCredentials.applicationPassword
          }, 
          content.wordpressPostId, 
          postData
        );
      } else {
        // Create new post
        console.log(`🆕 Creating new WordPress post`);
        wpResult = await wordpressService.publishPost(
          {
            url: website.url,
            username: wpCredentials.username,
            applicationPassword: wpCredentials.applicationPassword
          }, 
          postData
        );
      }
    } catch (wpError) {
      console.error("❌ WordPress publish error:", wpError);
      
      await storage.updateContent(contentId, {
        status: "publish_failed",
        publishError: wpError instanceof Error ? wpError.message : 'Unknown WordPress error'
      });

      res.status(500).json({ 
        message: wpError instanceof Error ? wpError.message : "Failed to publish to WordPress",
        error: 'WP_PUBLISH_FAILED'
      });
      return;
    }

    // Update content with WordPress details
    const updatedContent = await storage.updateContent(contentId, {
      status: "published",
      publishDate: new Date(),
      wordpressPostId: wpResult.id,
      wordpressUrl: wpResult.link,
      publishError: null
    });

    // Log the activity
    await storage.createActivityLog({
      userId,
      websiteId: content.websiteId,
      type: "content_published", 
      description: `Content published to WordPress: "${content.title}"`,
      metadata: { 
        contentId: content.id,
        wordpressPostId: wpResult.id,
        wordpressUrl: wpResult.link,
        publishMethod: content.wordpressPostId ? 'update' : 'create'
      }
    });

    console.log(`🎉 Content published successfully! Post ID: ${wpResult.id}`);

    res.json({
      success: true,
      content: updatedContent,
      wordpress: {
        postId: wpResult.id,
        url: wpResult.link,
        status: wpResult.status
      },
      message: "Content published to WordPress successfully",
      debug: {
        connectionDiagnostics: connectionTest.diagnostics
      }
    });

  } catch (error) {
    console.error("❌ Publish endpoint error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Failed to publish content";
    res.status(500).json({ 
      message: errorMessage,
      error: 'PUBLISH_FAILED'
    });
  }
});
  // =============================================================================
  // USER-SCOPED SEO ROUTES
  // =============================================================================

  app.get("/api/user/websites/:id/seo-reports", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      // Verify website ownership
      const website = await storage.getUserWebsite(req.params.id, userId);
      if (!website) {
        res.status(404).json({ message: "Website not found or access denied" });
        return;
      }
      
      const reports = await storage.getSeoReportsByWebsite(req.params.id);
      res.json(reports);
    } catch (error) {
      console.error("Failed to fetch SEO reports:", error);
      res.status(500).json({ message: "Failed to fetch SEO reports" });
    }
  });

  app.post("/api/user/websites/:id/seo-analysis", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { targetKeywords } = req.body;
      
      const website = await storage.getUserWebsite(req.params.id, userId);
      if (!website) {
        res.status(404).json({ message: "Website not found or access denied" });
        return;
      }

      console.log(`🔍 Starting SEO analysis for website: ${website.name} (${website.url})`);

      const analysis = await seoService.analyzeWebsite(
        website.url, 
        targetKeywords || []
      );
      
      // Save the report
      const report = await storage.createSeoReport({
        userId,
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

      // Log activity
      await storage.createActivityLog({
        userId,
        websiteId: req.params.id,
        type: "seo_analysis",
        description: `SEO analysis completed for ${website.url} (Score: ${analysis.score}/100)`,
        metadata: { 
          reportId: report.id, 
          score: analysis.score,
          pageSpeedScore: analysis.pageSpeedScore,
          issuesFound: analysis.issues?.length || 0
        }
      });

      console.log(`✅ SEO analysis completed. Score: ${analysis.score}, Issues: ${analysis.issues.length}`);

      res.json(analysis);
    } catch (error) {
      console.error("SEO analysis error:", error);
      
      let statusCode = 500;
      let errorMessage = error instanceof Error ? error.message : "Failed to perform SEO analysis";
      
      if (error instanceof Error) {
        if (error.message.includes('Cannot access website')) {
          statusCode = 400;
          errorMessage = `Website is not accessible: ${error.message}`;
        } else if (error.message.includes('timeout')) {
          statusCode = 408;
          errorMessage = "Website took too long to respond. Please try again.";
        }
      }
      
      res.status(statusCode).json({ 
        message: errorMessage,
        error: 'SEO_ANALYSIS_FAILED'
      });
    }
  });

  // Add this route to your routes.ts file, right after the existing AI fix routes

app.post("/api/user/websites/:id/iterative-ai-fix", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const websiteId = req.params.id;
    const { 
      targetScore = 85, 
      maxIterations = 5, 
      minImprovementThreshold = 2,
      fixTypes, 
      maxChangesPerIteration = 20, 
      skipBackup = false 
    } = req.body;

    console.log(`🔄 Starting iterative AI fix for website ${websiteId} (target: ${targetScore}, max iterations: ${maxIterations})`);

    // Verify website ownership
    const website = await storage.getUserWebsite(websiteId, userId);
    if (!website) {
      res.status(404).json({ message: "Website not found or access denied" });
      return;
    }

    // Validate parameters
    if (targetScore < 50 || targetScore > 100) {
      res.status(400).json({ 
        message: "Target score must be between 50 and 100",
        error: "INVALID_TARGET_SCORE"
      });
      return;
    }

    if (maxIterations < 1 || maxIterations > 10) {
      res.status(400).json({ 
        message: "Max iterations must be between 1 and 10",
        error: "INVALID_MAX_ITERATIONS"
      });
      return;
    }

    // Run iterative AI fixes
    const result = await aiFixService.iterativelyFixUntilAcceptable(
      websiteId,
      userId,
      { 
        targetScore, 
        maxIterations, 
        minImprovementThreshold,
        fixTypes, 
        maxChangesPerIteration,
        skipBackup 
      }
    );

    console.log(`✅ Iterative AI fix completed. Final score: ${result.finalScore}, Iterations: ${result.iterationsCompleted}`);

    // Send comprehensive response
    res.json({
      success: result.success,
      message: result.message,
      iterative: true,
      
      // Score progression
      initialScore: result.initialScore,
      finalScore: result.finalScore,
      scoreImprovement: result.scoreImprovement,
      targetScore: result.targetScore,
      targetReached: result.finalScore >= result.targetScore,
      
      // Process details  
      iterationsCompleted: result.iterationsCompleted,
      stoppedReason: result.stoppedReason,
      maxIterations,
      
      // Iteration breakdown
      iterations: result.iterations.map(iter => ({
        iteration: iter.iterationNumber,
        scoreBefore: iter.scoreBefore,
        scoreAfter: iter.scoreAfter,
        improvement: iter.improvement,
        fixesApplied: iter.fixesSuccessful,
        duration: `${iter.fixTime + iter.analysisTime}s`,
        timestamp: iter.timestamp
      })),
      
      // Overall statistics
      stats: {
        ...result.stats,
        scoreProgressionPercentage: result.initialScore > 0 
          ? Math.round((result.scoreImprovement / result.initialScore) * 100) 
          : 0,
        averageImprovementPerIteration: result.iterationsCompleted > 0 
          ? result.scoreImprovement / result.iterationsCompleted 
          : 0,
        totalProcessingTime: result.iterations.reduce((total, iter) => 
          total + iter.fixTime + iter.analysisTime, 0
        )
      },
      
      // Detailed results
      applied: {
        totalFixesApplied: result.fixesApplied.filter(f => f.success).length,
        imagesAltUpdated: result.fixesApplied.filter(f => f.type === 'missing_alt_text' && f.success).length,
        metaDescriptionsUpdated: result.fixesApplied.filter(f => f.type === 'missing_meta_description' && f.success).length,
        titleTagsUpdated: result.fixesApplied.filter(f => f.type === 'poor_title_tag' && f.success).length,
        headingStructureFixed: result.fixesApplied.filter(f => f.type === 'heading_structure' && f.success).length
      },
      
      fixes: result.fixesApplied,
      errors: result.errors,
      detailedLog: result.detailedLog,
      
      // Recommendations for next steps
      recommendations: generateIterativeFixRecommendations(result)
    });

  } catch (error) {
    console.error("Iterative AI fix error:", error);
    
    let statusCode = 500;
    let errorMessage = "Failed to complete iterative AI fixes";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes('No SEO analysis found')) {
        statusCode = 400;
        errorMessage = "Please run SEO analysis first before applying iterative AI fixes";
      } else if (error.message.includes('access denied')) {
        statusCode = 403;
      } else if (error.message.includes('Cannot access website')) {
        statusCode = 400;
        errorMessage = "Cannot access website for analysis. Please check if the website is online and accessible.";
      }
    }
    
    res.status(statusCode).json({ 
      success: false,
      message: errorMessage,
      iterative: true,
      error: error instanceof Error ? error.name : 'IterativeAIFixError'
    });
  }
});

// Helper function to generate recommendations - add this after the route
function generateIterativeFixRecommendations(result: any): string[] {
  const recommendations: string[] = [];
  
  if (result.stoppedReason === 'target_reached') {
    recommendations.push(`🎉 Excellent work! Your website now has a ${result.finalScore}/100 SEO score.`);
    recommendations.push("Monitor your SEO score weekly to maintain this performance.");
    if (result.finalScore < 95) {
      recommendations.push("Consider running a detailed content audit to reach 95+ score.");
    }
  } else if (result.stoppedReason === 'max_iterations') {
    recommendations.push(`Reached maximum iterations. Score improved by ${result.scoreImprovement.toFixed(1)} points.`);
    recommendations.push("Consider running the process again after addressing remaining critical issues manually.");
    recommendations.push("Review technical SEO elements that require manual intervention.");
  } else if (result.stoppedReason === 'no_improvement') {
    recommendations.push("Score improvement plateaued. Consider manual optimization for remaining issues.");
    recommendations.push("Focus on content quality improvements and technical SEO elements.");
    recommendations.push("Review website structure and user experience factors.");
  } else if (result.stoppedReason === 'error') {
    recommendations.push("Process encountered errors. Check website accessibility and try again.");
    recommendations.push("Review error logs for specific issues that need manual attention.");
  }
  
  // Add general recommendations based on final score
  if (result.finalScore < 70) {
    recommendations.push("Focus on critical SEO issues: meta descriptions, title tags, and image optimization.");
  } else if (result.finalScore < 85) {
    recommendations.push("Work on advanced SEO: internal linking, content structure, and technical optimization.");
  }
  
  // Add iteration-specific insights
  if (result.iterationsCompleted > 0) {
    const avgImprovement = result.scoreImprovement / result.iterationsCompleted;
    if (avgImprovement > 5) {
      recommendations.push(`Strong improvement trend (+${avgImprovement.toFixed(1)} points/iteration). Keep up the momentum!`);
    } else if (avgImprovement > 2) {
      recommendations.push(`Steady improvement (+${avgImprovement.toFixed(1)} points/iteration). Consider focusing on high-impact fixes.`);
    }
  }
  
  return recommendations;
}

  // =============================================================================
  // USER-SCOPED DASHBOARD ROUTES
  // =============================================================================

  app.get("/api/user/dashboard/stats", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const stats = await storage.getUserDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/user/dashboard/performance", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      // Generate mock performance data for the last 7 days
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
      console.error("Failed to fetch performance data:", error);
      res.status(500).json({ message: "Failed to fetch performance data" });
    }
  });

  app.get("/api/user/activity-logs", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const websiteId = req.query.websiteId as string;
      
      if (websiteId) {
        // Verify website ownership if filtering by website
        const website = await storage.getUserWebsite(websiteId, userId);
        if (!website) {
          res.status(404).json({ message: "Website not found or access denied" });
          return;
        }
      }
      
      const logs = await storage.getUserActivityLogs(userId, websiteId);
      res.json(logs);
    } catch (error) {
      console.error("Failed to fetch activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // =============================================================================
  // GLOBAL/SYSTEM ROUTES (No user scoping needed)
  // =============================================================================
  
  app.get("/api/ai-providers/status", async (req: Request, res: Response): Promise<void> => {
    try {
      const status = {
        openai: {
          available: !!(process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR),
          model: 'gpt-4o',
          pricing: { input: 0.005, output: 0.015 }
        },
        anthropic: {
          available: !!process.env.ANTHROPIC_API_KEY,
          model: 'claude-3-5-sonnet-20241022',
          pricing: { input: 0.003, output: 0.015 }
        },
        pagespeed: {
          available: !!process.env.GOOGLE_PAGESPEED_API_KEY
        }
      };

      res.json({
        success: true,
        providers: status
      });
    } catch (error) {
      console.error('Provider status check error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        error: 'Failed to check provider status',
        message: errorMessage
      });
    }
  });

  app.get("/api/seo/health", async (req: Request, res: Response): Promise<void> => {
    try {
      const hasGoogleApiKey = !!process.env.GOOGLE_PAGESPEED_API_KEY;
      const hasOpenAI = !!process.env.OPENAI_API_KEY;
      const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
      
      res.json({
        status: "healthy",
        services: {
          pageSpeedInsights: {
            configured: hasGoogleApiKey,
            message: hasGoogleApiKey 
              ? "Google PageSpeed Insights API is configured" 
              : "Using fallback speed estimation (configure GOOGLE_PAGESPEED_API_KEY for better results)"
          },
          technicalAnalysis: {
            configured: true,
            message: "Technical SEO analysis is fully operational"
          },
          aiContentAnalysis: {
            configured: hasOpenAI || hasAnthropic,
            providers: {
              openai: hasOpenAI,
              anthropic: hasAnthropic
            },
            message: hasOpenAI || hasAnthropic 
              ? `AI content analysis available via ${hasAnthropic ? 'Anthropic Claude' : 'OpenAI GPT-4'}` 
              : "Configure OPENAI_API_KEY or ANTHROPIC_API_KEY for AI-powered content analysis"
          }
        },
        capabilities: {
          basicSEO: true,
          technicalSEO: true,
          pageSpeed: hasGoogleApiKey,
          contentQuality: hasOpenAI || hasAnthropic,
          keywordOptimization: hasOpenAI || hasAnthropic,
          eatScoring: hasOpenAI || hasAnthropic,
          contentGapAnalysis: hasOpenAI || hasAnthropic,
          semanticAnalysis: hasOpenAI || hasAnthropic,
          userIntentAlignment: hasOpenAI || hasAnthropic
        }
      });
    } catch (error) {
      console.error("SEO health check failed:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ 
        status: "unhealthy", 
        error: errorMessage 
      });
    }
  });

  // URL validation endpoint
  app.post("/api/validate-url", async (req: Request, res: Response): Promise<void> => {
    try {
      const { url } = req.body;
      
      if (!url) {
        res.status(400).json({ 
          valid: false, 
          error: "URL is required" 
        });
        return;
      }

      // Basic URL validation
      try {
        new URL(url);
        res.json({
          valid: true,
          url: url,
          message: "URL format is valid"
        });
      } catch {
        res.json({
          valid: false,
          error: "Invalid URL format",
          message: "Please enter a valid URL starting with http:// or https://"
        });
      }
    } catch (error) {
      console.error("URL validation error:", error);
      res.status(500).json({ 
        valid: false, 
        error: "URL validation failed" 
      });
    }
  });


  app.post("/api/user/websites/:id/ai-fix", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const websiteId = req.params.id;
    const { dryRun = true, fixTypes, maxChanges, skipBackup } = req.body;

    console.log(`🔧 AI fix request for website ${websiteId} (dry run: ${dryRun})`);

    // Verify website ownership
    const website = await storage.getUserWebsite(websiteId, userId);
    if (!website) {
      res.status(404).json({ message: "Website not found or access denied" });
      return;
    }

    // Run AI fix analysis and application
    const result = await aiFixService.analyzeAndFixWebsite(
      websiteId,
      userId,
      dryRun,
      { fixTypes, maxChanges, skipBackup }
    );

    console.log(`✅ AI fix completed. Success: ${result.success}, Applied: ${result.stats.fixesSuccessful} fixes`);

    res.json({
      success: result.success,
      message: result.message,
      dryRun: result.dryRun,
      stats: result.stats,
      applied: {
        imagesAltUpdated: result.fixesApplied.filter(f => f.type === 'missing_alt_text' && f.success).length,
        metaDescriptionUpdated: result.fixesApplied.some(f => f.type === 'missing_meta_description' && f.success),
        titleTagsUpdated: result.fixesApplied.filter(f => f.type === 'poor_title_tag' && f.success).length,
        headingStructureFixed: result.fixesApplied.some(f => f.type === 'heading_structure' && f.success)
      },
      fixes: result.fixesApplied,
      errors: result.errors,
      estimatedImpact: result.stats.estimatedImpact
    });

  } catch (error) {
    console.error("AI fix error:", error);
    
    let statusCode = 500;
    let errorMessage = "Failed to apply AI fixes";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes('No SEO analysis found')) {
        statusCode = 400;
        errorMessage = "Please run SEO analysis first before applying AI fixes";
      } else if (error.message.includes('access denied')) {
        statusCode = 403;
      } else if (error.message.includes('Cannot access website')) {
        statusCode = 400;
        errorMessage = "Cannot access website for analysis. Please check if the website is online and accessible.";
      }
    }
    
    res.status(statusCode).json({ 
      success: false,
      message: errorMessage,
      error: error instanceof Error ? error.name : 'AIFixError'
    });
  }
});

app.get("/api/user/websites/:id/available-fixes", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const websiteId = req.params.id;

    // Verify website ownership
    const website = await storage.getUserWebsite(websiteId, userId);
    if (!website) {
      res.status(404).json({ message: "Website not found or access denied" });
      return;
    }

    const availableFixes = await aiFixService.getAvailableFixTypes(websiteId, userId);

    res.json({
      websiteId,
      websiteName: website.name,
      websiteUrl: website.url,
      ...availableFixes,
      fixTypes: {
        'missing_alt_text': 'Add missing alt text to images',
        'missing_meta_description': 'Optimize meta descriptions',
        'poor_title_tag': 'Improve title tags',
        'heading_structure': 'Fix heading hierarchy',
        'internal_linking': 'Add internal links',
        'image_optimization': 'Optimize images for SEO'
      }
    });

  } catch (error) {
    console.error("Get available fixes error:", error);
    res.status(500).json({ 
      message: "Failed to get available fixes",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// AI Fix History
app.get("/api/user/websites/:id/ai-fix-history", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const websiteId = req.params.id;

    // Verify website ownership
    const website = await storage.getUserWebsite(websiteId, userId);
    if (!website) {
      res.status(404).json({ message: "Website not found or access denied" });
      return;
    }

    // Get AI fix activity logs
    const logs = await storage.getUserActivityLogs(userId, websiteId);
    const aiFixLogs = logs.filter(log => 
      log.type === 'ai_fixes_applied' || 
      log.type === 'ai_fix_attempted' ||
      log.type === 'ai_fix_failed'
    );

    res.json({
      websiteId,
      history: aiFixLogs.map(log => ({
        id: log.id,
        date: log.createdAt,
        type: log.type,
        description: log.description,
        metadata: log.metadata,
        success: log.type === 'ai_fixes_applied'
      }))
    });

  } catch (error) {
    console.error("Get AI fix history error:", error);
    res.status(500).json({ 
      message: "Failed to get AI fix history",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

  const httpServer = createServer(app);
  return httpServer;
}

// Export the requireAuth middleware for use in other files
export { requireAuth };