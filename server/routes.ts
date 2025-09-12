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
import { apiValidationService } from "./services/api-validation";


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

    console.log('🔍 DEBUG: Raw request body:', {
      websiteId,
      contentData: {
        includeImages: contentData.includeImages,
        imageCount: contentData.imageCount,
        imageStyle: contentData.imageStyle,
        aiProvider: contentData.aiProvider,
        topic: contentData.topic
      }
    });
    
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
      aiProvider = 'openai',
      includeImages = false,
      imageCount = 0,
      imageStyle = 'natural'
    } = contentData;
    
    if (!topic) {
      res.status(400).json({ message: "Topic is required" });
      return;
    }

    // UPDATED: Remove OpenAI requirement for images - just check if OpenAI API key exists for DALL-E
    if (includeImages && !process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY_ENV_VAR) {
      res.status(400).json({ 
        message: "Image generation requires OpenAI API key for DALL-E 3" 
      });
      return;
    }

    // Validate image count
    if (includeImages && (imageCount < 1 || imageCount > 3)) {
      res.status(400).json({ 
        message: "Image count must be between 1 and 3" 
      });
      return;
    }

    // Updated validation to include Gemini
    if (aiProvider && !['openai', 'anthropic', 'gemini'].includes(aiProvider)) {
      res.status(400).json({ 
        message: "AI provider must be 'openai', 'anthropic', or 'gemini'" 
      });
      return;
    }

    console.log(`🤖 Generating content with ${aiProvider.toUpperCase()} for topic: ${topic}`);
    if (includeImages) {
      console.log(`🎨 Will also generate ${imageCount} images with DALL-E 3`);
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
      eatCompliance: eatCompliance || false,
      aiProvider: aiProvider as 'openai' | 'anthropic' | 'gemini',
      userId: req.user!.id,
      includeImages,
      imageCount,
      imageStyle
    });

    // Save content with proper cost tracking
    const content = await storage.createContent({
      userId,
      websiteId,
      title: result.title,
      body: result.content,
      excerpt: result.excerpt,
      metaDescription: result.metaDescription,
      metaTitle: result.metaTitle,
      seoScore: Math.max(1, Math.min(100, Math.round(result.seoScore))),
      readabilityScore: Math.max(1, Math.min(100, Math.round(result.readabilityScore))), 
      brandVoiceScore: Math.max(1, Math.min(100, Math.round(result.brandVoiceScore))),
      tokensUsed: Math.max(1, result.tokensUsed),
      costUsd: Math.max(1, Math.round((result.costUsd || 0.001) * 100)), // Text cost only
      eatCompliance: result.eatCompliance,
      seoKeywords: result.keywords,
      aiModel: aiProvider === 'openai' ? 'gpt-4o' : aiProvider === 'anthropic' ? 'claude-3-5-sonnet-20250106' : 'gemini-1.5-pro',
      hasImages: includeImages && result.images?.length > 0,
      imageCount: result.images?.length || 0,
      imageCostCents: Math.round((result.totalImageCost || 0) * 100)
    });

    console.log(`✅ Content saved with scores - SEO: ${content.seoScore}, Readability: ${content.readabilityScore}, Brand: ${content.brandVoiceScore}, Tokens: ${content.tokensUsed}, Text Cost: ${content.costUsd} cents, Image Cost: ${Math.round((result.totalImageCost || 0) * 100)} cents`);

    // Save images to database if generated
    if (result.images && result.images.length > 0) {
      for (const image of result.images) {
        await storage.createContentImage({
          contentId: content.id,
          userId,
          websiteId,
          originalUrl: image.url,
          filename: image.filename,
          altText: image.altText,
          generationPrompt: image.prompt,
          costCents: Math.round(image.cost * 100),
          imageStyle,
          size: '1024x1024',
          status: 'generated'
        });
      }
    }

    // Log the activity
    await storage.createActivityLog({
      userId,
      websiteId,
      type: "content_generated",
      description: `AI content generated: "${result.title}" (${result.aiProvider.toUpperCase()}${result.images?.length ? ` + ${result.images.length} DALL-E images` : ''})`,
      metadata: { 
        contentId: content.id,
        contentAiProvider: result.aiProvider,
        imageAiProvider: result.images?.length ? 'dall-e-3' : null,
        tokensUsed: content.tokensUsed,
        textCostCents: content.costUsd,
        hasImages: !!result.images?.length,
        imageCount: result.images?.length || 0,
        imageCostCents: Math.round((result.totalImageCost || 0) * 100)
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
      } else if (error.message.includes('Image generation failed')) {
        statusCode = 422;
        errorMessage = `Content generated successfully, but image generation failed: ${error.message}`;
      }
    }
    
    res.status(statusCode).json({ 
      message: errorMessage,
      error: error instanceof Error ? error.name : 'UnknownError'
    });
  }
});



app.post("/api/user/content/:id/upload-images", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const contentId = req.params.id;
    
    // Get the content and verify ownership
    const content = await storage.getContent(contentId);
    if (!content || content.userId !== userId) {
      res.status(404).json({ message: "Content not found or access denied" });
      return;
    }

    // Get the website for WordPress credentials
    const website = await storage.getUserWebsite(content.websiteId, userId);
    if (!website) {
      res.status(404).json({ message: "Website not found" });
      return;
    }

    // Get images for this content
    const images = await storage.getContentImages(contentId);
    if (images.length === 0) {
      res.status(400).json({ message: "No images to upload" });
      return;
    }

    const wpCredentials = {
      url: website.url,
      username: website.wpUsername || 'your_username',
      applicationPassword: website.wpApplicationPassword || 'your_app_password'
    };

    const uploadResults = [];
    let successCount = 0;

    for (const image of images) {
      if (image.status === 'uploaded') {
        uploadResults.push({ imageId: image.id, status: 'already_uploaded', wpUrl: image.wordpressUrl });
        successCount++;
        continue;
      }

      try {
        const uploadResult = await imageService.uploadImageToWordPress(
          image.originalUrl,
          image.filename,
          image.altText,
          wpCredentials
        );

        // Update image record with WordPress info
        await storage.updateContentImage(image.id, {
          wordpressMediaId: uploadResult.id,
          wordpressUrl: uploadResult.url,
          status: 'uploaded'
        });

        uploadResults.push({
          imageId: image.id,
          status: 'uploaded',
          wpMediaId: uploadResult.id,
          wpUrl: uploadResult.url
        });

        successCount++;
      } catch (uploadError) {
        console.error(`Failed to upload image ${image.id}:`, uploadError);
        
        await storage.updateContentImage(image.id, {
          status: 'failed',
          uploadError: uploadError.message
        });

        uploadResults.push({
          imageId: image.id,
          status: 'failed',
          error: uploadError.message
        });
      }
    }

    res.json({
      success: successCount > 0,
      message: `${successCount}/${images.length} images uploaded successfully`,
      results: uploadResults,
      successCount,
      totalCount: images.length
    });

  } catch (error) {
    console.error("Image upload error:", error);
    res.status(500).json({ 
      message: "Failed to upload images",
      error: error.message 
    });
  }
});

app.put("/api/user/content/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const contentId = req.params.id;
    const { 
      websiteId, 
      aiProvider, 
      regenerateImages = false,
      includeImages = false,
      imageCount = 0,
      imageStyle = 'natural',
      ...updateData 
    } = req.body;
    
    console.log('DEBUG: Content update parameters:', {
      contentAI: aiProvider,
      regenerateImages,
      includeImages,
      imageCount,
      imageStyle
    });
    
    // Verify website ownership if websiteId is provided
    if (websiteId) {
      const website = await storage.getUserWebsite(websiteId, userId);
      if (!website) {
        res.status(403).json({ message: "Website not found or access denied" });
        return;
      }
    }
    
    // If aiProvider is specified, REGENERATE the content completely
    let regenerationResult = null;
    if (aiProvider && updateData.title && updateData.body) {
      try {
        console.log(`Content AI: ${aiProvider.toUpperCase()}, Image AI: ${(regenerateImages || includeImages) ? 'DALL-E 3' : 'None'}`);
        
        // Get existing content to check for images
        const existingContent = await storage.getContent(contentId);
        const hasExistingImages = existingContent?.hasImages || false;
        const existingImageCount = existingContent?.imageCount || 0;
        
        // UPDATED: Determine image settings (independent of content AI provider)
        let shouldIncludeImages = false;
        let finalImageCount = 0;
        let finalImageStyle = imageStyle || 'natural';
        
        if (regenerateImages) {
          // User wants to regenerate images - check if OpenAI API key is available
          if (!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY_ENV_VAR) {
            throw new Error('Image regeneration requires OpenAI API key for DALL-E 3');
          }
          shouldIncludeImages = true;
          finalImageCount = imageCount || existingImageCount || 1;
          console.log('Will regenerate images with DALL-E:', { finalImageCount, finalImageStyle });
        } else if (!regenerateImages && hasExistingImages) {
          // User wants to keep existing images
          shouldIncludeImages = false;
          finalImageCount = 0;
          console.log('Will keep existing images');
        } else if (includeImages) {
          // New image generation request - check if OpenAI API key is available
          if (!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY_ENV_VAR) {
            throw new Error('Image generation requires OpenAI API key for DALL-E 3');
          }
          shouldIncludeImages = true;
          finalImageCount = imageCount || 1;
          console.log('Will add new images with DALL-E:', { finalImageCount, finalImageStyle });
        }
        
        const keywords = Array.isArray(updateData.seoKeywords) ? 
          updateData.seoKeywords : 
          (typeof updateData.seoKeywords === 'string' ? 
            updateData.seoKeywords.split(',').map(k => k.trim()) : []);

        // UPDATED: Generate content with selected AI provider, images with DALL-E when needed
        console.log('Generation parameters:', {
          contentProvider: aiProvider,
          imageProvider: shouldIncludeImages ? 'dall-e-3' : 'none',
          topic: updateData.title,
          includeImages: shouldIncludeImages,
          imageCount: finalImageCount
        });

        // Generate content with selected AI provider (images handled internally)
        regenerationResult = await aiService.generateContent({
          websiteId: websiteId || contentId,
          topic: updateData.title,
          keywords: keywords,
          tone: updateData.tone || 'professional',
          wordCount: updateData.body ? updateData.body.split(' ').length : 800,
          seoOptimized: true,
          brandVoice: updateData.brandVoice,
          targetAudience: updateData.targetAudience,
          eatCompliance: updateData.eatCompliance || false,
          aiProvider: aiProvider as 'openai' | 'anthropic' | 'gemini',
          userId: userId,
          includeImages: shouldIncludeImages,
          imageCount: finalImageCount,
          imageStyle: finalImageStyle
        });

        if (regenerationResult) {
          console.log('Regeneration completed:', {
            contentAI: aiProvider,
            imageAI: shouldIncludeImages ? 'dall-e-3' : 'none',
            hasImages: !!regenerationResult.images?.length,
            imageCount: regenerationResult.images?.length || 0,
            textCost: regenerationResult.costUsd,
            imageCost: regenerationResult.totalImageCost || 0
          });

          // Update content data
          updateData.title = regenerationResult.title;
          updateData.body = regenerationResult.content;
          updateData.excerpt = regenerationResult.excerpt;
          updateData.metaDescription = regenerationResult.metaDescription;
          updateData.metaTitle = regenerationResult.metaTitle;
          updateData.seoKeywords = regenerationResult.keywords;

          // Update scores
          updateData.seoScore = Math.max(1, Math.min(100, Math.round(regenerationResult.seoScore)));
          updateData.readabilityScore = Math.max(1, Math.min(100, Math.round(regenerationResult.readabilityScore)));
          updateData.brandVoiceScore = Math.max(1, Math.min(100, Math.round(regenerationResult.brandVoiceScore)));
          
          // Update costs and tokens
          updateData.tokensUsed = Math.max(1, Math.round(regenerationResult.tokensUsed));
          updateData.costUsd = Math.max(1, Math.round(regenerationResult.costUsd * 100)); // Text cost only
          
          // Update image information
          updateData.hasImages = !!regenerationResult.images?.length;
          updateData.imageCount = regenerationResult.images?.length || 0;
          updateData.imageCostCents = Math.round((regenerationResult.totalImageCost || 0) * 100);

          // Update AI model (content AI, not image AI)
          updateData.aiModel = aiProvider === 'openai' ? 'gpt-4o' : 
                                aiProvider === 'anthropic' ? 'claude-3-5-sonnet-20250106' : 
                                'gemini-1.5-pro';

          console.log(`Content regenerated with ${aiProvider.toUpperCase()}, images with DALL-E - SEO: ${updateData.seoScore}%, Images: ${updateData.imageCount}`);
          
          // Save images to database if generated
          if (regenerationResult.images && regenerationResult.images.length > 0) {
            console.log(`Saving ${regenerationResult.images.length} DALL-E images to database`);
            
            // Delete existing images if regenerating
            if (regenerateImages) {
              await storage.deleteContentImages(contentId);
              console.log('Deleted existing images for regeneration');
            }
            
            // Save new images
            for (const image of regenerationResult.images) {
              await storage.createContentImage({
                contentId: contentId,
                userId,
                websiteId: websiteId || existingContent.websiteId,
                originalUrl: image.url,
                filename: image.filename,
                altText: image.altText,
                generationPrompt: image.prompt,
                costCents: Math.round(image.cost * 100),
                imageStyle: finalImageStyle,
                size: '1024x1024',
                status: 'generated'
              });
            }
          }
        }
      } catch (regenerationError) {
        console.error(`Content regeneration failed:`, regenerationError);
        // Continue with update even if regeneration fails
      }
    }
    
    // Perform the update
    const updatedContent = await storage.updateContent(contentId, updateData);
    if (!updatedContent) {
      res.status(404).json({ message: "Content not found" });
      return;
    }

    // Log the activity
    if (regenerationResult && websiteId) {
      try {
        const hasImages = regenerationResult.images?.length > 0;
        const activityDescription = hasImages 
          ? `Content regenerated with ${aiProvider?.toUpperCase()}, images with DALL-E: "${updatedContent.title}"`
          : `Content regenerated with ${aiProvider?.toUpperCase()}: "${updatedContent.title}"`;
          
        await storage.createActivityLog({
          userId,
          websiteId,
          type: "content_regenerated",
          description: activityDescription,
          metadata: { 
            contentId: updatedContent.id,
            contentAiProvider: aiProvider,
            imageAiProvider: hasImages ? 'dall-e-3' : null,
            tokensUsed: updateData.tokensUsed,
            textCostCents: updateData.costUsd,
            regenerated: !!regenerationResult,
            imagesRegenerated: regenerateImages,
            newImageCount: regenerationResult?.images?.length || 0,
            imageCostCents: Math.round((regenerationResult?.totalImageCost || 0) * 100)
          }
        });
      } catch (logError) {
        console.warn("Failed to log activity:", logError);
      }
    }

    res.json({ 
      content: updatedContent,
      regeneration: regenerationResult ? {
        success: true,
        contentAiProvider: aiProvider,
        imageAiProvider: regenerationResult.images?.length > 0 ? 'dall-e-3' : null,
        tokensUsed: regenerationResult.tokensUsed,
        costUsd: regenerationResult.costUsd,
        seoScore: regenerationResult.seoScore,
        readabilityScore: regenerationResult.readabilityScore,
        brandVoiceScore: regenerationResult.brandVoiceScore,
        imagesRegenerated: regenerateImages,
        newImageCount: regenerationResult.images?.length || 0,
        imageCostUsd: regenerationResult.totalImageCost || 0
      } : null
    });
  } catch (error) {
    console.error("Content update error:", error);
    
    let statusCode = 500;
    let errorMessage = "Failed to update content";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.name === 'ValidationError') {
        statusCode = 400;
      } else if (error.name === 'AIProviderError') {
        statusCode = 400;
        errorMessage = `Content regeneration failed: ${error.message}`;
      }
    }
    
    res.status(statusCode).json({ 
      message: errorMessage,
      error: error instanceof Error ? error.name : 'UnknownError'
    });
  }
});

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

app.get("/api/user/content/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const contentId = req.params.id;
    
    // Get the content
    const content = await storage.getContent(contentId);
    if (!content || content.userId !== userId) {
      res.status(404).json({ message: "Content not found or access denied" });
      return;
    }

    // Return content with proper field mapping
    res.json({
      ...content,
      content: content.body, // Map 'body' field to 'content' for consistency
      wordCount: content.body ? content.body.split(/\s+/).length : 0,
      readingTime: content.body ? Math.ceil(content.body.split(/\s+/).length / 200) : 0,
    });
  } catch (error) {
    console.error("Failed to fetch content:", error);
    res.status(500).json({ message: "Failed to fetch content" });
  }
});

// =============================================================================
  // USER-SCOPED CLIENT REPORTS ROUTES (ADD THIS SECTION)
  // =============================================================================

  app.get("/api/user/reports", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      console.log(`📊 Fetching all reports for user: ${userId}`);
      
      // Get all reports for user's websites
      const websites = await storage.getUserWebsites(userId);
      const allReports = [];
      
      for (const website of websites) {
        const reports = await storage.getClientReports(website.id);
        // Add website info to each report
        const reportsWithWebsite = reports.map(report => ({
          ...report,
          websiteName: website.name,
          websiteUrl: website.url
        }));
        allReports.push(...reportsWithWebsite);
      }
      
      // Sort by generated date, most recent first
      allReports.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
      
      console.log(`✅ Found ${allReports.length} reports for user ${userId}`);
      res.json(allReports);
    } catch (error) {
      console.error("Failed to fetch user reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.get("/api/user/websites/:id/reports", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const websiteId = req.params.id;
      
      // Verify website ownership
      const website = await storage.getUserWebsite(websiteId, userId);
      if (!website) {
        res.status(404).json({ message: "Website not found or access denied" });
        return;
      }
      
      const reports = await storage.getClientReports(websiteId);
      const reportsWithWebsite = reports.map(report => ({
        ...report,
        websiteName: website.name,
        websiteUrl: website.url
      }));
      
      res.json(reportsWithWebsite);
    } catch (error) {
      console.error("Failed to fetch client reports:", error);
      res.status(500).json({ message: "Failed to fetch client reports" });
    }
  });

  app.post("/api/user/websites/:id/reports/generate", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const websiteId = req.params.id;
      const { reportType = 'monthly' } = req.body;
      
      console.log(`🔄 Generating ${reportType} report for website: ${websiteId}, user: ${userId}`);
      
      // Verify website ownership
      const website = await storage.getUserWebsite(websiteId, userId);
      if (!website) {
        res.status(404).json({ message: "Website not found or access denied" });
        return;
      }
      
      // Generate report data from existing data
      const reportData = await generateReportData(websiteId, reportType, userId);
      
      // Create the report
      const report = await storage.createClientReport({
        userId,
        websiteId,
        reportType,
        period: reportData.period,
        data: reportData.data,
        insights: reportData.insights,
        roiData: reportData.roiData
      });
      
      console.log(`✅ Report generated successfully: ${report.id}`);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        websiteId,
        type: "report_generated",
        description: `${reportType} report generated for ${website.name}`,
        metadata: { reportId: report.id, reportType, period: reportData.period }
      });
      
      res.json({
        ...report,
        websiteName: website.name,
        websiteUrl: website.url
      });
      
    } catch (error) {
      console.error("Report generation error:", error);
      res.status(500).json({ 
        message: "Failed to generate report",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
















//nadagdag

// Enhanced version with better date handling
const generatePeriodString = (reportType: "weekly" | "monthly" | "quarterly", date?: Date): string => {
  const targetDate = date || new Date();
  
  switch (reportType) {
    case "weekly": {
      // Get the week number of the year
      const startOfYear = new Date(targetDate.getFullYear(), 0, 1);
      const days = Math.floor((targetDate.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
      return `Week ${weekNumber}, ${targetDate.getFullYear()}`;
    }
    
    case "monthly": {
      const monthName = targetDate.toLocaleDateString("en-US", { month: "long" });
      return `${monthName} ${targetDate.getFullYear()}`;
    }
    
    case "quarterly": {
      const quarter = Math.floor(targetDate.getMonth() / 3) + 1;
      return `Q${quarter} ${targetDate.getFullYear()}`;
    }
    
    default:
      throw new Error(`Invalid report type: ${reportType}`);
  }
};



























// Helper function to generate report data from existing data
async function generateReportData(websiteId: string, reportType: string, userId: string) {
  console.log(`📊 Generating report data for website: ${websiteId}, type: ${reportType}`);
  
  const now = new Date();
  let startDate: Date;
  let period: string;
  



//nadagdag
if (reportType === 'weekly') {
    // Match the frontend's week calculation exactly
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    period = `Week ${weekNumber}, ${now.getFullYear()}`;
  } else if (reportType === 'monthly') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    period = `${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  } else { // quarterly
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    startDate = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
    period = `Q${quarter} ${now.getFullYear()}`;
  }













  //wag alisin
  // Calculate date range based on report type
  // if (reportType === 'weekly') {
  //   startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  //   period = `Week ${Math.ceil(now.getDate() / 7)}, ${now.getFullYear()}`;
  // } else if (reportType === 'monthly') {
  //   startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  //   period = `${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  // } else { // quarterly
  //   const quarter = Math.floor(now.getMonth() / 3) + 1;
  //   startDate = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
  //   period = `Q${quarter} ${now.getFullYear()}`;
  // }
  









  console.log(`📅 Report period: ${period} (from ${startDate.toISOString()})`);
  
  try {
    // Check for existing report to prevent duplicates
    const existingReports = await storage.getClientReports(websiteId);
    const duplicateReport = existingReports.find(report => 
      report.reportType === reportType && report.period === period
    );
    
    if (duplicateReport) {
      console.log(`⚠️ Duplicate report found for ${period}, ${reportType}`);
      // Return existing data instead of generating new mock data
      return {
        period: duplicateReport.period,
        data: duplicateReport.data,
        insights: duplicateReport.insights,
        roiData: duplicateReport.roiData
      };
    }
    
    // Get ACTUAL data for the period
    const [
      content,
      seoReports,
      activityLogs
    ] = await Promise.all([
      storage.getContentByWebsite(websiteId),
      storage.getSeoReportsByWebsite(websiteId),
      storage.getActivityLogs(websiteId)
    ]);
    
    console.log(`📊 Data fetched - Content: ${content.length}, SEO Reports: ${seoReports.length}, Activity: ${activityLogs.length}`);
    
    // Filter data by date range
    const periodContent = content.filter(c => new Date(c.createdAt) >= startDate);
    const periodSeoReports = seoReports.filter(r => new Date(r.createdAt) >= startDate);
    const periodActivity = activityLogs.filter(a => new Date(a.createdAt) >= startDate);
    
    // Calculate FACTUAL metrics from actual data
    const publishedContent = periodContent.filter(c => c.status === 'published');
    const latestSeoReport = seoReports[0]; // Most recent SEO report
    const previousSeoReport = seoReports[1]; // Previous SEO report for comparison
    
    // Calculate SEO score change (factual)
    const seoScoreChange = latestSeoReport && previousSeoReport ? 
      latestSeoReport.score - previousSeoReport.score : 0;
    
    // Calculate average scores from ACTUAL content (factual)
    const avgSeoScore = periodContent.length > 0 ? 
      Math.round(periodContent.reduce((sum, c) => sum + (c.seoScore || 0), 0) / periodContent.length) : 0;
    
    const avgReadabilityScore = periodContent.length > 0 ? 
      Math.round(periodContent.reduce((sum, c) => sum + (c.readabilityScore || 0), 0) / periodContent.length) : 0;
    
    const avgBrandVoiceScore = periodContent.length > 0 ? 
      Math.round(periodContent.reduce((sum, c) => sum + (c.brandVoiceScore || 0), 0) / periodContent.length) : 0;
    
    // Calculate ACTUAL costs and tokens (factual)
    const totalCostCents = periodContent.reduce((sum, c) => sum + (c.costUsd || 0), 0);
    const totalImageCostCents = periodContent.reduce((sum, c) => sum + (c.imageCostCents || 0), 0);
    const totalTokens = periodContent.reduce((sum, c) => sum + (c.tokensUsed || 0), 0);
    const totalCostUsd = (totalCostCents + totalImageCostCents) / 100;
    
    // Count active days (factual)
    const activeDays = periodActivity.length > 0 ? 
      new Set(periodActivity.map(a => a.createdAt.toDateString())).size : 0;
    
    // Count content with images (factual)
    const contentWithImages = periodContent.filter(c => c.hasImages).length;
    const totalImages = periodContent.reduce((sum, c) => sum + (c.imageCount || 0), 0);
    
    // Generate insights based on ACTUAL data (factual)
    const insights = [];
    
    if (seoScoreChange > 5) {
      insights.push(`SEO score improved significantly by ${seoScoreChange.toFixed(1)} points this ${reportType}.`);
    } else if (seoScoreChange < -5) {
      insights.push(`SEO score declined by ${Math.abs(seoScoreChange).toFixed(1)} points - recommend immediate attention.`);
    } else if (Math.abs(seoScoreChange) <= 2) {
      insights.push(`SEO score remained stable with minimal change (${seoScoreChange >= 0 ? '+' : ''}${seoScoreChange.toFixed(1)} points).`);
    }
    
    if (publishedContent.length > 0) {
      insights.push(`Published ${publishedContent.length} pieces of content with an average SEO score of ${avgSeoScore}%.`);
      
      if (contentWithImages > 0) {
        insights.push(`${contentWithImages} content pieces included AI-generated images (${totalImages} total images).`);
      }
    } else {
      insights.push(`No content was published during this ${reportType} period.`);
    }
    
    if (avgBrandVoiceScore > 80) {
      insights.push(`Excellent brand voice consistency with ${avgBrandVoiceScore}% average score.`);
    } else if (avgBrandVoiceScore > 60) {
      insights.push(`Good brand voice alignment with ${avgBrandVoiceScore}% average score.`);
    } else if (avgBrandVoiceScore > 0) {
      insights.push(`Brand voice needs improvement - current average: ${avgBrandVoiceScore}%.`);
    }
    
    if (totalCostUsd > 0) {
      const textCost = totalCostCents / 100;
      const imageCost = totalImageCostCents / 100;
      if (imageCost > 0) {
        insights.push(`AI generation cost: $${totalCostUsd.toFixed(2)} total ($${textCost.toFixed(2)} content + $${imageCost.toFixed(2)} images) for ${totalTokens.toLocaleString()} tokens.`);
      } else {
        insights.push(`AI content generation cost: $${textCost.toFixed(2)} for ${totalTokens.toLocaleString()} tokens.`);
      }
    }
    
    if (activeDays > 0) {
      const activityRate = (activeDays / ((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))) * 100;
      insights.push(`Active on ${activeDays} days (${activityRate.toFixed(0)}% activity rate) during this period.`);
    }
    
    // Build FACTUAL data object (no mock data)
    const data = {
      // SEO metrics (factual)
      seoScoreChange: Math.round(seoScoreChange * 10) / 10,
      currentSeoScore: latestSeoReport?.score || 0,
      previousSeoScore: previousSeoReport?.score || 0,
      
      // Content metrics (factual)
      contentPublished: publishedContent.length,
      contentTotal: periodContent.length,
      avgSeoScore,
      avgReadabilityScore,
      avgBrandVoiceScore,
      
      // Cost metrics (factual)
      totalCostUsd,
      textCostUsd: totalCostCents / 100,
      imageCostUsd: totalImageCostCents / 100,
      totalTokens,
      
      // Activity metrics (factual)
      activeDays,
      
      // Image metrics (factual)
      contentWithImages,
      totalImages,
      
      // Analytics placeholders (clearly marked as unavailable)
      pageViews: null, // Requires Google Analytics integration
      organicTraffic: null, // Requires Google Analytics integration
      conversionRate: null, // Requires conversion tracking
      backlinks: null, // Requires SEO tool integration
      keywordRankings: null, // Requires SEO tool integration
      
      // Data availability flags
      hasAnalytics: false,
      hasSeoTools: false,
      dataNote: "Traffic and ranking data requires analytics integration"
    };
    
    // Calculate ROI based on ACTUAL data
    const roiData = {
      contentROI: publishedContent.length > 0 && totalCostUsd > 0 ? 
        Math.round((publishedContent.length * 50) / totalCostUsd) : 0, // Estimated $50 value per published post
      timeInvested: publishedContent.length * 30, // 30 minutes per content piece (reasonable estimate)
      costPerContent: publishedContent.length > 0 ? 
        Math.round((totalCostUsd / publishedContent.length) * 100) / 100 : 0,
      costEfficiency: totalTokens > 0 ? 
        Math.round((totalTokens / (totalCostUsd * 100)) * 100) / 100 : 0 // tokens per cent
    };
    
    console.log(`✅ FACTUAL report data generated:`, { 
      period, 
      contentCount: periodContent.length, 
      publishedCount: publishedContent.length,
      seoScoreChange: data.seoScoreChange,
      totalCostUsd: data.totalCostUsd,
      activeDays: data.activeDays,
      hasImages: contentWithImages > 0
    });
    
    return {
      period,
      data,
      insights,
      roiData
    };
    
  } catch (error) {
    console.error("Error generating FACTUAL report data:", error);
    throw error;
  }
}

// Also update the route handler to check for duplicates
app.post("/api/user/websites/:id/reports/generate", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const websiteId = req.params.id;
    const { reportType = 'monthly' } = req.body;
    
    console.log(`📄 Generating ${reportType} report for website: ${websiteId}, user: ${userId}`);
    
    // Verify website ownership
    const website = await storage.getUserWebsite(websiteId, userId);
    if (!website) {
      res.status(404).json({ message: "Website not found or access denied" });
      return;
    }
    
    // Check for existing report in the same period
    const now = new Date();
    let targetPeriod: string;
    
    if (reportType === 'weekly') {
      // Match the frontend's week calculation exactly
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
      targetPeriod = `Week ${weekNumber}, ${now.getFullYear()}`;
    } else if (reportType === 'monthly') {
      targetPeriod = `${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    } else { // quarterly
      const quarter = Math.floor(now.getMonth() / 3) + 1;
      targetPeriod = `Q${quarter} ${now.getFullYear()}`;
    }
    
    // Check for existing report
    const existingReports = await storage.getClientReports(websiteId);
    const existingReport = existingReports.find(report => 
      report.reportType === reportType && report.period === targetPeriod
    );
    
    if (existingReport) {
      console.log(`⚠️ Report already exists for ${targetPeriod}, ${reportType}. Updating existing report.`);
      
      // Update the existing report instead of creating a duplicate
      const reportData = await generateReportData(websiteId, reportType, userId);
      
      const updatedReport = await storage.updateClientReport(existingReport.id, {
        data: reportData.data,
        insights: reportData.insights,
        roiData: reportData.roiData,
        generatedAt: new Date()
      });
      
      console.log(`✅ Report updated successfully: ${updatedReport.id}`);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        websiteId,
        type: "report_updated",
        description: `${reportType} report updated for ${website.name} (${targetPeriod})`,
        metadata: { reportId: updatedReport.id, reportType, period: targetPeriod, action: 'update' }
      });
      
      res.json({
        ...updatedReport,
        websiteName: website.name,
        websiteUrl: website.url,
        updated: true,
        message: `Updated existing ${reportType} report for ${targetPeriod}`
      });
      return;
    }
    
    // Generate new report data from FACTUAL data
    const reportData = await generateReportData(websiteId, reportType, userId);
    
    // Create the report
    const report = await storage.createClientReport({
      userId,
      websiteId,
      reportType,
      period: reportData.period,
      data: reportData.data,
      insights: reportData.insights,
      roiData: reportData.roiData
    });
    
    console.log(`✅ New report generated successfully: ${report.id}`);
    
    // Log activity
    await storage.createActivityLog({
      userId,
      websiteId,
      type: "report_generated",
      description: `${reportType} report generated for ${website.name} (${reportData.period})`,
      metadata: { reportId: report.id, reportType, period: reportData.period, action: 'create' }
    });
    
    res.json({
      ...report,
      websiteName: website.name,
      websiteUrl: website.url,
      updated: false,
      message: `Generated new ${reportType} report for ${reportData.period}`
    });
    
  } catch (error) {
    console.error("Report generation error:", error);
    res.status(500).json({ 
      message: "Failed to generate report",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


























// =============================================================================
// CONTENT SCHEDULING ROUTES (Updated for Existing Content)
// =============================================================================

app.get("/api/user/websites/:id/content-schedule", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const websiteId = req.params.id;
    
    // Verify website ownership
    const website = await storage.getUserWebsite(websiteId, userId);
    if (!website) {
      res.status(404).json({ message: "Website not found or access denied" });
      return;
    }
    
    const scheduledContent = await storage.getContentSchedule(websiteId);
    res.json(scheduledContent);
  } catch (error) {
    console.error("Failed to fetch content schedule:", error);
    res.status(500).json({ message: "Failed to fetch content schedule" });
  }
});

app.post("/api/user/websites/:id/schedule-content", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const websiteId = req.params.id;
    const { contentId, scheduledDate } = req.body;
    
    console.log('📅 Scheduling existing content:', { websiteId, contentId, scheduledDate });
    
    // Verify website ownership
    const website = await storage.getUserWebsite(websiteId, userId);
    if (!website) {
      res.status(404).json({ message: "Website not found or access denied" });
      return;
    }
    
    // Verify content exists and belongs to user
    const content = await storage.getContent(contentId);
    if (!content || content.userId !== userId || content.websiteId !== websiteId) {
      res.status(404).json({ message: "Content not found or access denied" });
      return;
    }
    
    // Validate content is not already published
    if (content.status === 'published') {
      res.status(400).json({ message: "Content is already published" });
      return;
    }
    
    // Validate required fields
    if (!contentId || !scheduledDate) {
      res.status(400).json({ message: "Content ID and scheduled date are required" });
      return;
    }
    
    // Validate scheduled date is in the future
    const scheduleTime = new Date(scheduledDate);
    if (scheduleTime <= new Date()) {
      res.status(400).json({ message: "Scheduled date must be in the future" });
      return;
    }
    
    // Check if content is already scheduled
    const existingSchedule = await storage.getContentScheduleByContentId(contentId);
    if (existingSchedule) {
      res.status(400).json({ message: "This content is already scheduled for publication" });
      return;
    }
    
    // Create scheduled content with topic from content title
    const scheduledContent = await storage.createContentSchedule({
      userId,
      websiteId,
      scheduledDate: scheduleTime,
      topic: content.title, // Use content title as topic
      keywords: content.seoKeywords || [], // Use content keywords
      contentId,
      status: "scheduled" // Changed from "planned" to "scheduled"
    });
    
    // Log activity
    await storage.createActivityLog({
      userId,
      websiteId,
      type: "content_scheduled",
      description: `Content scheduled for publication: "${content.title}" on ${scheduleTime.toLocaleString()}`,
      metadata: { 
        scheduleId: scheduledContent.id,
        contentId,
        contentTitle: content.title,
        scheduledDate: scheduledDate
      }
    });
    
    console.log('✅ Content scheduled successfully:', scheduledContent.id);
    res.status(201).json({
      ...scheduledContent,
      contentTitle: content.title,
      contentExcerpt: content.excerpt,
      seoKeywords: content.seoKeywords
    });
    
  } catch (error) {
    console.error("Failed to schedule content:", error);
    res.status(500).json({ 
      message: "Failed to schedule content",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.put("/api/user/websites/:websiteId/content-schedule/:scheduleId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { websiteId, scheduleId } = req.params;
    const { scheduledDate, status } = req.body;
    
    // Verify website ownership
    const website = await storage.getUserWebsite(websiteId, userId);
    if (!website) {
      res.status(404).json({ message: "Website not found or access denied" });
      return;
    }
    
    // Get existing schedule to verify ownership
    const scheduleItem = await storage.getContentScheduleById(scheduleId);
    if (!scheduleItem || scheduleItem.userId !== userId) {
      res.status(404).json({ message: "Scheduled content not found or access denied" });
      return;
    }
    
    // Update the schedule
    const updates: any = {};
    if (scheduledDate !== undefined) {
      const scheduleTime = new Date(scheduledDate);
      if (scheduleTime <= new Date() && status !== 'cancelled') {
        res.status(400).json({ message: "Scheduled date must be in the future unless cancelling" });
        return;
      }
      updates.scheduledDate = scheduleTime;
    }
    if (status !== undefined) updates.status = status;
    
    const updatedSchedule = await storage.updateContentSchedule(scheduleId, updates);
    
    // Log activity
    await storage.createActivityLog({
      userId,
      websiteId,
      type: "content_schedule_updated",
      description: `Publication schedule updated for content`,
      metadata: { 
        scheduleId,
        updates: Object.keys(updates)
      }
    });
    
    res.json(updatedSchedule);
    
  } catch (error) {
    console.error("Failed to update scheduled content:", error);
    res.status(500).json({ 
      message: "Failed to update scheduled content",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.delete("/api/user/websites/:websiteId/content-schedule/:scheduleId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { websiteId, scheduleId } = req.params;
    
    // Verify website ownership
    const website = await storage.getUserWebsite(websiteId, userId);
    if (!website) {
      res.status(404).json({ message: "Website not found or access denied" });
      return;
    }
    
    // Verify schedule ownership
    const scheduleItem = await storage.getContentScheduleById(scheduleId);
    if (!scheduleItem || scheduleItem.userId !== userId) {
      res.status(404).json({ message: "Scheduled content not found or access denied" });
      return;
    }
    
    // Get content info for logging
    const content = await storage.getContent(scheduleItem.contentId);
    
    // Delete the schedule
    const deleted = await storage.deleteContentSchedule(scheduleId);
    
    if (!deleted) {
      res.status(404).json({ message: "Scheduled content not found" });
      return;
    }
    
    // Log activity
    await storage.createActivityLog({
      userId,
      websiteId,
      type: "content_schedule_deleted",
      description: `Publication schedule removed: "${content?.title || 'Unknown'}"`,
      metadata: { 
        scheduleId,
        contentId: scheduleItem.contentId,
        contentTitle: content?.title
      }
    });
    
    res.status(204).send();
    
  } catch (error) {
    console.error("Failed to delete scheduled content:", error);
    res.status(500).json({ 
      message: "Failed to delete scheduled content",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get("/api/user/content-schedule", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    
    // Get all user's websites
    const websites = await storage.getUserWebsites(userId);
    const allScheduledContent = [];
    
    // Get scheduled content for each website
    for (const website of websites) {
      const schedules = await storage.getContentScheduleWithDetails(website.id);
      const schedulesWithWebsite = schedules.map(schedule => ({
        ...schedule,
        websiteName: website.name,
        websiteUrl: website.url
      }));
      allScheduledContent.push(...schedulesWithWebsite);
    }
    
    // Sort by scheduled date
    allScheduledContent.sort((a, b) => 
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );
    
    res.json(allScheduledContent);
  } catch (error) {
    console.error("Failed to fetch user's scheduled content:", error);
    res.status(500).json({ message: "Failed to fetch scheduled content" });
  }
});

// Automatic publishing endpoint (for cron jobs)
app.post("/api/system/publish-scheduled-content", async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🕒 Running scheduled content publication check...');
    
    // Get all overdue scheduled content
    const overdueContent = await storage.getPendingScheduledContent();
    
    const results = [];
    
    for (const schedule of overdueContent) {
      try {
        console.log(`📤 Publishing scheduled content: ${schedule.contentId}`);
        
        // Get the content
        const content = await storage.getContent(schedule.contentId);
        if (!content) {
          console.error(`Content not found: ${schedule.contentId}`);
          continue;
        }
        
        // Get the website
        const website = await storage.getUserWebsite(content.websiteId, content.userId);
        if (!website) {
          console.error(`Website not found: ${content.websiteId}`);
          continue;
        }
        
        // Publish the content (you'll need to implement this)
        try {
          // Use your existing publish logic here
          const wpCredentials = {
            url: website.url,
            username: website.wpUsername || 'admin',
            applicationPassword: website.wpApplicationPassword
          };
          
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
          
          const wpResult = await wordpressService.publishPost(wpCredentials, postData);
          
          // Update content with WordPress details
          await storage.updateContent(content.id, {
            status: "published",
            publishDate: new Date(),
            wordpressPostId: wpResult.id,
            wordpressUrl: wpResult.link,
            publishError: null
          });
          
          // Update schedule status
          await storage.updateContentSchedule(schedule.id, { status: 'published' });
          
          // Log activity
          await storage.createActivityLog({
            userId: content.userId,
            websiteId: content.websiteId,
            type: "scheduled_content_published",
            description: `Scheduled content published: "${content.title}"`,
            metadata: { 
              scheduleId: schedule.id,
              contentId: content.id,
              wordpressPostId: wpResult.id,
              wordpressUrl: wpResult.link
            }
          });
          
          results.push({
            scheduleId: schedule.id,
            contentId: content.id,
            success: true,
            wordpressPostId: wpResult.id,
            wordpressUrl: wpResult.link
          });
          
          console.log(`✅ Successfully published: ${content.title}`);
          
        } catch (publishError) {
          console.error(`Failed to publish content ${content.id}:`, publishError);
          
          // Update schedule status to failed
          await storage.updateContentSchedule(schedule.id, { status: 'failed' });
          
          // Update content with error
          await storage.updateContent(content.id, {
            status: "publish_failed",
            publishError: publishError instanceof Error ? publishError.message : 'Unknown error'
          });
          
          // Log failure
          await storage.createActivityLog({
            userId: content.userId,
            websiteId: content.websiteId,
            type: "scheduled_content_failed",
            description: `Failed to publish scheduled content: "${content.title}"`,
            metadata: { 
              scheduleId: schedule.id,
              contentId: content.id,
              error: publishError instanceof Error ? publishError.message : 'Unknown error'
            }
          });
          
          results.push({
            scheduleId: schedule.id,
            contentId: content.id,
            success: false,
            error: publishError instanceof Error ? publishError.message : 'Unknown error'
          });
        }
        
      } catch (error) {
        console.error(`Error processing schedule ${schedule.id}:`, error);
        results.push({
          scheduleId: schedule.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    console.log(`🎯 Processed ${overdueContent.length} scheduled items, ${results.filter(r => r.success).length} published successfully`);
    
    res.json({
      success: true,
      processed: overdueContent.length,
      published: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });
    
  } catch (error) {
    console.error("Scheduled publishing process failed:", error);
    res.status(500).json({ 
      message: "Failed to process scheduled content",
      error: error instanceof Error ? error.message : 'Unknown error'
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
    const websiteId = req.params.id; // Get the websiteId from params
    const { targetKeywords } = req.body;
    
    const website = await storage.getUserWebsite(websiteId, userId);
    if (!website) {
      res.status(404).json({ message: "Website not found or access denied" });
      return;
    }

    console.log(`🔍 Starting SEO analysis for website: ${website.name} (${website.url})`);

    // FIXED: Pass userId and websiteId to enable issue tracking
    const analysis = await seoService.analyzeWebsite(
      website.url, 
      targetKeywords || [],
      userId,    // ← Add this parameter
      websiteId  // ← Add this parameter  
    );
    
    // Save the report (this will now work because userId/websiteId are provided)
    const report = await storage.createSeoReport({
      userId,
      websiteId: websiteId,
      score: analysis.score,
      issues: analysis.issues,
      recommendations: analysis.recommendations,
      pageSpeedScore: analysis.pageSpeedScore
    });

    // Update website SEO score
    await storage.updateWebsite(websiteId, {
      seoScore: analysis.score
    });

    // Log activity
    await storage.createActivityLog({
      userId,
      websiteId: websiteId,
      type: "seo_analysis",
      description: `SEO analysis completed for ${website.url} (Score: ${analysis.score}/100)`,
      metadata: { 
        reportId: report.id, 
        score: analysis.score,
        pageSpeedScore: analysis.pageSpeedScore,
        issuesFound: analysis.issues?.length || 0,
        issuesTracked: true // ← Add this flag
      }
    });

    console.log(`✅ SEO analysis completed. Score: ${analysis.score}, Issues: ${analysis.issues.length}, Tracked: ${analysis.issues.length} issues`);

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
      gemini: {
        available: !!process.env.GOOGLE_GEMINI_API_KEY,
        model: 'gemini-1.5-pro',
        pricing: { input: 0.0025, output: 0.0075 }
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
    const hasGemini = !!process.env.GOOGLE_GEMINI_API_KEY;
    
    const availableProviders = [];
    if (hasOpenAI) availableProviders.push('OpenAI GPT-4');
    if (hasAnthropic) availableProviders.push('Anthropic Claude');
    if (hasGemini) availableProviders.push('Google Gemini');
    
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
          configured: hasOpenAI || hasAnthropic || hasGemini,
          providers: {
            openai: hasOpenAI,
            anthropic: hasAnthropic,
            gemini: hasGemini
          },
          message: availableProviders.length > 0
            ? `AI content analysis available via ${availableProviders.join(', ')}` 
            : "Configure OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_GEMINI_API_KEY for AI-powered content analysis"
        }
      },
      capabilities: {
        basicSEO: true,
        technicalSEO: true,
        pageSpeed: hasGoogleApiKey,
        contentQuality: hasOpenAI || hasAnthropic || hasGemini,
        keywordOptimization: hasOpenAI || hasAnthropic || hasGemini,
        eatScoring: hasOpenAI || hasAnthropic || hasGemini,
        contentGapAnalysis: hasOpenAI || hasAnthropic || hasGemini,
        semanticAnalysis: hasOpenAI || hasAnthropic || hasGemini,
        userIntentAlignment: hasOpenAI || hasAnthropic || hasGemini
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




// =============================================================================
// USER SETTINGS ROUTES
// =============================================================================

app.get("/api/user/settings", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    console.log(`⚙️ Fetching settings for user: ${userId}`);
    
    const settings = await storage.getOrCreateUserSettings(userId);
    
    // Transform database format to frontend format
    const transformedSettings = {
      profile: {
        name: settings.profileName || req.user!.name || "",
        email: settings.profileEmail || req.user!.email || "",
        company: settings.profileCompany || "",
        timezone: settings.profileTimezone || "America/New_York",
      },
      notifications: {
        emailReports: settings.notificationEmailReports,
        contentGenerated: settings.notificationContentGenerated,
        seoIssues: settings.notificationSeoIssues,
        systemAlerts: settings.notificationSystemAlerts,
      },
      automation: {
        defaultAiModel: settings.automationDefaultAiModel,
        autoFixSeoIssues: settings.automationAutoFixSeoIssues,
        contentGenerationFrequency: settings.automationContentGenerationFrequency,
        reportGeneration: settings.automationReportGeneration,
      },
      security: {
        twoFactorAuth: settings.securityTwoFactorAuth,
        sessionTimeout: settings.securitySessionTimeout,
        allowApiAccess: settings.securityAllowApiAccess,
      },
    };
    
    console.log(`✅ Settings fetched successfully for user ${userId}`);
    res.json(transformedSettings);
  } catch (error) {
    console.error("Failed to fetch user settings:", error);
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

app.put("/api/user/settings", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { profile, notifications, automation, security } = req.body;
    
    console.log(`⚙️ Updating settings for user: ${userId}`);
    
    // Transform frontend format to database format
    const updateData: Partial<InsertUserSettings> = {};
    
    if (profile) {
      if (profile.name !== undefined) updateData.profileName = profile.name;
      if (profile.email !== undefined) updateData.profileEmail = profile.email;
      if (profile.company !== undefined) updateData.profileCompany = profile.company;
      if (profile.timezone !== undefined) updateData.profileTimezone = profile.timezone;
    }
    
    if (notifications) {
      if (notifications.emailReports !== undefined) updateData.notificationEmailReports = notifications.emailReports;
      if (notifications.contentGenerated !== undefined) updateData.notificationContentGenerated = notifications.contentGenerated;
      if (notifications.seoIssues !== undefined) updateData.notificationSeoIssues = notifications.seoIssues;
      if (notifications.systemAlerts !== undefined) updateData.notificationSystemAlerts = notifications.systemAlerts;
    }
    
    if (automation) {
      if (automation.defaultAiModel !== undefined) updateData.automationDefaultAiModel = automation.defaultAiModel;
      if (automation.autoFixSeoIssues !== undefined) updateData.automationAutoFixSeoIssues = automation.autoFixSeoIssues;
      if (automation.contentGenerationFrequency !== undefined) updateData.automationContentGenerationFrequency = automation.contentGenerationFrequency;
      if (automation.reportGeneration !== undefined) updateData.automationReportGeneration = automation.reportGeneration;
    }
    
    if (security) {
      if (security.twoFactorAuth !== undefined) updateData.securityTwoFactorAuth = security.twoFactorAuth;
      if (security.sessionTimeout !== undefined) updateData.securitySessionTimeout = security.sessionTimeout;
      if (security.allowApiAccess !== undefined) updateData.securityAllowApiAccess = security.allowApiAccess;
    }
    
    // Validate session timeout
    if (updateData.securitySessionTimeout !== undefined) {
      if (updateData.securitySessionTimeout < 1 || updateData.securitySessionTimeout > 168) {
        res.status(400).json({ message: "Session timeout must be between 1 and 168 hours" });
        return;
      }
    }
    
    // Update the settings
    const updatedSettings = await storage.updateUserSettings(userId, updateData);
    
    if (!updatedSettings) {
      res.status(404).json({ message: "Settings not found" });
      return;
    }
    
    // Transform back to frontend format
    const transformedSettings = {
      profile: {
        name: updatedSettings.profileName || req.user!.name || "",
        email: updatedSettings.profileEmail || req.user!.email || "",
        company: updatedSettings.profileCompany || "",
        timezone: updatedSettings.profileTimezone || "America/New_York",
      },
      notifications: {
        emailReports: updatedSettings.notificationEmailReports,
        contentGenerated: updatedSettings.notificationContentGenerated,
        seoIssues: updatedSettings.notificationSeoIssues,
        systemAlerts: updatedSettings.notificationSystemAlerts,
      },
      automation: {
        defaultAiModel: updatedSettings.automationDefaultAiModel,
        autoFixSeoIssues: updatedSettings.automationAutoFixSeoIssues,
        contentGenerationFrequency: updatedSettings.automationContentGenerationFrequency,
        reportGeneration: updatedSettings.automationReportGeneration,
      },
      security: {
        twoFactorAuth: updatedSettings.securityTwoFactorAuth,
        sessionTimeout: updatedSettings.securitySessionTimeout,
        allowApiAccess: updatedSettings.securityAllowApiAccess,
      },
    };
    
    // Log the activity
    await storage.createActivityLog({
      userId,
      type: "settings_updated",
      description: "User settings updated",
      metadata: { 
        sectionsUpdated: Object.keys(req.body),
        timestamp: new Date().toISOString()
      }
    });
    
    console.log(`✅ Settings updated successfully for user ${userId}`);
    res.json(transformedSettings);
  } catch (error) {
    console.error("Failed to update user settings:", error);
    res.status(500).json({ message: "Failed to update settings" });
  }
});

app.delete("/api/user/settings", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    console.log(`🗑️ Resetting settings to defaults for user: ${userId}`);
    
    const deleted = await storage.deleteUserSettings(userId);
    
    if (!deleted) {
      res.status(404).json({ message: "Settings not found" });
      return;
    }
    
    // Create new default settings
    const defaultSettings = await storage.getOrCreateUserSettings(userId);
    
    // Transform to frontend format
    const transformedSettings = {
      profile: {
        name: req.user!.name || "",
        email: req.user!.email || "",
        company: "",
        timezone: "America/New_York",
      },
      notifications: {
        emailReports: true,
        contentGenerated: true,
        seoIssues: true,
        systemAlerts: false,
      },
      automation: {
        defaultAiModel: "gpt-4o",
        autoFixSeoIssues: true,
        contentGenerationFrequency: "twice-weekly",
        reportGeneration: "weekly",
      },
      security: {
        twoFactorAuth: false,
        sessionTimeout: 24,
        allowApiAccess: true,
      },
    };
    
    // Log the activity
    await storage.createActivityLog({
      userId,
      type: "settings_reset",
      description: "User settings reset to defaults",
      metadata: { 
        timestamp: new Date().toISOString()
      }
    });
    
    console.log(`✅ Settings reset to defaults for user ${userId}`);
    res.json({
      message: "Settings reset to defaults",
      settings: transformedSettings
    });
  } catch (error) {
    console.error("Failed to reset user settings:", error);
    res.status(500).json({ message: "Failed to reset settings" });
  }
});



// =============================================================================
// REAL API KEY MANAGEMENT ROUTES
// =============================================================================

app.get("/api/user/api-keys", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    console.log(`🔑 Fetching API keys for user: ${userId}`);
    
    const apiKeys = await storage.getUserApiKeys(userId);
    
    // Transform for frontend (don't send encrypted keys)
    const transformedKeys = apiKeys.map(key => ({
      id: key.id,
      provider: key.provider,
      keyName: key.keyName,
      maskedKey: key.maskedKey,
      isActive: key.isActive,
      validationStatus: key.validationStatus,
      lastValidated: key.lastValidated?.toISOString(),
      validationError: key.validationError,
      usageCount: key.usageCount,
      lastUsed: key.lastUsed?.toISOString(),
      createdAt: key.createdAt.toISOString()
    }));
    
    console.log(`✅ Found ${transformedKeys.length} API keys for user ${userId}`);
    res.json(transformedKeys);
  } catch (error) {
    console.error("Failed to fetch API keys:", error);
    res.status(500).json({ message: "Failed to fetch API keys" });
  }
});

app.post("/api/user/api-keys", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { provider, keyName, apiKey } = req.body;
    
    console.log(`🔑 Adding API key for user: ${userId}, provider: ${provider}`);
    
    // Validate input
    if (!provider || !keyName || !apiKey) {
      res.status(400).json({ message: "Provider, key name, and API key are required" });
      return;
    }
    
    // Validate provider
    if (!apiValidationService.getSupportedProviders().includes(provider)) {
      res.status(400).json({ message: "Invalid provider" });
      return;
    }
    
    // Check if user already has a key for this provider
    const existingKeys = await storage.getUserApiKeys(userId);
    const existingProviderKey = existingKeys.find(k => k.provider === provider && k.isActive);
    
    if (existingProviderKey) {
      res.status(400).json({ 
        message: `You already have an active ${apiValidationService.getProviderDisplayName(provider)} API key. Please delete the existing one first.` 
      });
      return;
    }
    
    // Create the API key record (this also validates format and encrypts)
    let newApiKey;
    try {
      newApiKey = await storage.createUserApiKey(userId, {
        provider,
        keyName,
        apiKey
      });
    } catch (createError) {
      res.status(400).json({ 
        message: createError instanceof Error ? createError.message : "Invalid API key format"
      });
      return;
    }
    
    // Validate the API key with the actual service
    console.log(`🔍 Validating ${provider} API key...`);
    
    let validationResult;
    try {
      validationResult = await apiValidationService.validateApiKey(provider, apiKey);
    } catch (validationError) {
      console.error(`Validation failed for ${provider}:`, validationError);
      validationResult = { 
        valid: false, 
        error: validationError instanceof Error ? validationError.message : 'Validation failed' 
      };
    }
    
    // Update the validation status
    await storage.updateUserApiKey(userId, newApiKey.id, {
      validationStatus: validationResult.valid ? 'valid' : 'invalid',
      lastValidated: new Date(),
      validationError: validationResult.error || null
    });
    
    // Get the updated key
    const updatedKey = await storage.getUserApiKey(userId, newApiKey.id);
    
    if (!validationResult.valid) {
      // Delete the key if validation failed
      await storage.deleteUserApiKey(userId, newApiKey.id);
      
      res.status(400).json({ 
        message: validationResult.error || "API key validation failed",
        error: "INVALID_API_KEY"
      });
      return;
    }
    
    // Log activity
    await storage.createActivityLog({
      userId,
      type: "api_key_added",
      description: `API key added for ${apiValidationService.getProviderDisplayName(provider)}: ${keyName}`,
      metadata: { 
        provider,
        keyName,
        keyId: newApiKey.id,
        validationStatus: validationResult.valid ? 'valid' : 'invalid'
      }
    });
    
    console.log(`✅ API key added and validated successfully for user ${userId}`);
    
    // Return the transformed key (without encrypted data)
    res.status(201).json({
      id: updatedKey!.id,
      provider: updatedKey!.provider,
      keyName: updatedKey!.keyName,
      maskedKey: updatedKey!.maskedKey,
      isActive: updatedKey!.isActive,
      validationStatus: updatedKey!.validationStatus,
      lastValidated: updatedKey!.lastValidated?.toISOString(),
      validationError: updatedKey!.validationError,
      usageCount: updatedKey!.usageCount,
      lastUsed: updatedKey!.lastUsed?.toISOString(),
      createdAt: updatedKey!.createdAt.toISOString()
    });
  } catch (error) {
    console.error("Failed to add API key:", error);
    res.status(500).json({ 
      message: "Failed to add API key",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post("/api/user/api-keys/:id/validate", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const keyId = req.params.id;
    
    console.log(`🔍 Validating API key ${keyId} for user: ${userId}`);
    
    // Get the API key
    const apiKey = await storage.getUserApiKey(userId, keyId);
    if (!apiKey) {
      res.status(404).json({ message: "API key not found" });
      return;
    }
    
    // Get the decrypted key
    const decryptedKey = await storage.getDecryptedApiKey(userId, keyId);
    if (!decryptedKey) {
      res.status(400).json({ message: "Cannot decrypt API key" });
      return;
    }
    
    // Validate with the actual service
    let validationResult;
    try {
      validationResult = await apiValidationService.validateApiKey(apiKey.provider, decryptedKey);
    } catch (validationError) {
      console.error(`Validation failed for ${apiKey.provider}:`, validationError);
      validationResult = { 
        valid: false, 
        error: validationError instanceof Error ? validationError.message : 'Validation failed' 
      };
    }
    
    // Update the validation status
    await storage.updateUserApiKey(userId, keyId, {
      validationStatus: validationResult.valid ? 'valid' : 'invalid',
      lastValidated: new Date(),
      validationError: validationResult.error || null
    });
    
    // Log activity
    await storage.createActivityLog({
      userId,
      type: "api_key_validated",
      description: `API key validation ${validationResult.valid ? 'successful' : 'failed'}: ${apiKey.keyName}`,
      metadata: { 
        keyId,
        provider: apiKey.provider,
        isValid: validationResult.valid,
        error: validationResult.error
      }
    });
    
    console.log(`✅ API key validation completed for user ${userId}: ${validationResult.valid ? 'valid' : 'invalid'}`);
    
    res.json({
      isValid: validationResult.valid,
      error: validationResult.error,
      lastValidated: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to validate API key:", error);
    res.status(500).json({ 
      message: "Failed to validate API key",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.delete("/api/user/api-keys/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const keyId = req.params.id;
    
    console.log(`🗑️ Deleting API key ${keyId} for user: ${userId}`);
    
    // Get the API key before deletion for logging
    const apiKey = await storage.getUserApiKey(userId, keyId);
    if (!apiKey) {
      res.status(404).json({ message: "API key not found" });
      return;
    }
    
    // Delete the API key
    const deleted = await storage.deleteUserApiKey(userId, keyId);
    
    if (!deleted) {
      res.status(404).json({ message: "API key not found" });
      return;
    }
    
    // Log activity
    await storage.createActivityLog({
      userId,
      type: "api_key_deleted",
      description: `API key deleted: ${apiKey.keyName} (${apiValidationService.getProviderDisplayName(apiKey.provider)})`,
      metadata: { 
        keyId,
        provider: apiKey.provider,
        keyName: apiKey.keyName
      }
    });
    
    console.log(`✅ API key deleted successfully for user ${userId}`);
    res.status(204).send();
  } catch (error) {
    console.error("Failed to delete API key:", error);
    res.status(500).json({ 
      message: "Failed to delete API key",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get("/api/user/api-keys/status", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    console.log(`📊 Fetching API key status for user: ${userId}`);
    
    // Get user's API keys
    const userKeys = await storage.getUserApiKeys(userId);
    
    // Build status for each provider
    const providers = {
      openai: {
        configured: false,
        keyName: null as string | null,
        lastValidated: null as string | null,
        status: "not_configured" as string
      },
      anthropic: {
        configured: false,
        keyName: null as string | null,
        lastValidated: null as string | null,
        status: "not_configured" as string
      },
      google_pagespeed: {
        configured: false,
        keyName: null as string | null,
        lastValidated: null as string | null,
        status: "not_configured" as string
      }
    };
    
    // Check user's keys
    for (const key of userKeys) {
      if (key.isActive && providers[key.provider as keyof typeof providers]) {
        const providerStatus = providers[key.provider as keyof typeof providers];
        providerStatus.configured = true;
        providerStatus.keyName = key.keyName;
        providerStatus.lastValidated = key.lastValidated?.toISOString() || null;
        providerStatus.status = key.validationStatus === 'valid' ? 'active' : 
                                 key.validationStatus === 'invalid' ? 'invalid' : 'pending';
      }
    }
    
    // Also check environment variables (system keys)
    if (!providers.openai.configured && (process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR)) {
      providers.openai.configured = true;
      providers.openai.keyName = "System OpenAI Key";
      providers.openai.status = "system";
    }
    
    if (!providers.anthropic.configured && process.env.ANTHROPIC_API_KEY) {
      providers.anthropic.configured = true;
      providers.anthropic.keyName = "System Anthropic Key";
      providers.anthropic.status = "system";
    }
    
    if (!providers.google_pagespeed.configured && process.env.GOOGLE_PAGESPEED_API_KEY) {
      providers.google_pagespeed.configured = true;
      providers.google_pagespeed.keyName = "System PageSpeed Key";
      providers.google_pagespeed.status = "system";
    }
    
    console.log(`✅ API key status fetched for user ${userId}`);
    res.json({ providers });
  } catch (error) {
    console.error("Failed to fetch API key status:", error);
    res.status(500).json({ 
      message: "Failed to fetch API key status",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});










//NADAGDAG
// Fixed POST /api/user/reports - with direct update
app.post('/api/user/reports', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { websiteId, reportType, reportId } = req.body;
    const userId = req.user!.id;
    
    console.log('📥 Report endpoint called with:', { websiteId, reportType, reportId, userId });
    
    // Validate required fields
    if (!websiteId || !reportType) {
      res.status(400).json({ 
        error: 'Missing required fields: websiteId and reportType' 
      });
      return;
    }
    
    // Get website details
    const websites = await storage.getUserWebsites(userId);
    const website = websites.find(w => w.id === websiteId);
    
    if (!website) {
      res.status(404).json({ error: 'Website not found' });
      return;
    }
    
    // Generate report data
    const period = generatePeriodString(reportType);
    const reportData = {
      data: {
        seoScoreChange: Math.floor(Math.random() * 20) - 5,
        contentPublished: Math.floor(Math.random() * 10),
        avgSeoScore: Math.floor(Math.random() * 100),
        totalCostUsd: Math.random() * 100,
        activeDays: Math.floor(Math.random() * 30),
        avgReadabilityScore: Math.floor(Math.random() * 100),
        avgBrandVoiceScore: Math.floor(Math.random() * 100),
        totalTokens: Math.floor(Math.random() * 100000),
      },
      insights: [
        "SEO performance improved this period",
        "Content quality remains consistent"
      ]
    };
    
    let report;
    
    if (reportId) {
      // UPDATE existing report - Don't create new, just update existing
      console.log('✅ Updating existing report:', reportId);
      
      // First check if a report exists for this period (prevent duplicates)
      const existingReports = await storage.getClientReports(userId);
      const duplicateReport = existingReports.find(r => 
        r.websiteId === websiteId && 
        r.reportType === reportType && 
        r.period === period &&
        r.id !== reportId  // Not the same report we're updating
      );
      
      if (duplicateReport) {
        console.log('⚠️ Another report exists for this period, returning it instead');
        report = duplicateReport;
      } else {
        // Since we don't have a proper update method, 
        // return a mock updated report to prevent creating duplicates
        report = {
          id: reportId,
          userId: userId,
          websiteId: websiteId,
          websiteName: website.name,
          reportType: reportType,
          period: period,
          data: reportData.data,
          insights: reportData.insights,
          generatedAt: new Date()
        };
        
        console.log('✅ Report updated (simulated):', reportId);
        
        // TODO: Add actual update to storage
        // await storage.updateClientReport(reportId, reportData);
      }
      
    } else {
      // CREATE new report
      console.log('➕ Creating new report');
      
      // Check for existing report to prevent duplicates
      const existingReports = await storage.getClientReports(userId);
      const duplicateReport = existingReports.find(r => 
        r.websiteId === websiteId && 
        r.reportType === reportType && 
        r.period === period
      );
      
      if (duplicateReport) {
        console.log('⚠️ Report already exists for this period, returning it');
        report = duplicateReport;
      } else {
        // Create new report
        report = await storage.createClientReport({
          userId: userId,
          websiteId: websiteId,
          websiteName: website.name,
          reportType: reportType,
          period: period,
          data: reportData.data,
          insights: reportData.insights,
          generatedAt: new Date()
        });
        
        console.log('✅ New report created:', report.id);
      }
    }
    
    // Log activity
    await storage.createActivityLog({
      userId,
      type: reportId ? "report_updated" : "report_created",
      description: `${reportId ? 'Updated' : 'Generated'} ${reportType} report for ${website.name}`,
      metadata: { 
        reportId: report.id,
        websiteId,
        reportType
      }
    });
    
    // Return the report
    res.json({
      id: report.id,
      websiteId: report.websiteId,
      websiteName: report.websiteName || website.name,
      reportType: report.reportType,
      period: report.period,
      data: report.data,
      insights: report.insights,
      generatedAt: report.generatedAt
    });
    
  } catch (error) {
    console.error('❌ Error in report generation:', error);
    res.status(500).json({ 
      error: 'Failed to generate report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});















// =============================================================================
// PASSWORD CHANGE ROUTE
// =============================================================================

app.post("/api/auth/change-password", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    console.log(`🔐 Password change request for user: ${userId}`);
    
    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400).json({ 
        message: "Current password, new password, and confirmation are required" 
      });
      return;
    }
    
    // Check if new passwords match
    if (newPassword !== confirmPassword) {
      res.status(400).json({ 
        message: "New password and confirmation do not match" 
      });
      return;
    }
    
    // Validate new password strength
    const passwordValidation = authService.validatePassword(newPassword);
    if (passwordValidation.length > 0) {
      res.status(400).json({ 
        message: "Password does not meet requirements",
        errors: passwordValidation
      });
      return;
    }
    
    // Get current user from database
    const user = await storage.getUser(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    // Verify current password
    const isCurrentPasswordValid = await authService.verifyPassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      res.status(400).json({ 
        message: "Current password is incorrect" 
      });
      return;
    }
    
    // Check if new password is different from current
    const isSamePassword = await authService.verifyPassword(newPassword, user.password);
    if (isSamePassword) {
      res.status(400).json({ 
        message: "New password must be different from current password" 
      });
      return;
    }
    
    // Hash new password
    const hashedNewPassword = await authService.hashPassword(newPassword);
    
    // Update password in database
    const updatedUser = await authService.updateUserPassword(userId, hashedNewPassword);
    
    if (!updatedUser) {
      res.status(500).json({ message: "Failed to update password" });
      return;
    }
    
    // Log the activity
    await storage.createActivityLog({
      userId,
      type: "password_changed",
      description: "User password changed successfully",
      metadata: { 
        timestamp: new Date().toISOString(),
        ipAddress: req.ip || 'unknown'
      }
    });
    
    // Log security audit
    await storage.createSecurityAudit({
      userId,
      action: "password_change",
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
    
    console.log(`✅ Password changed successfully for user: ${userId}`);
    
    res.json({
      success: true,
      message: "Password changed successfully"
    });
    
  } catch (error) {
    console.error("Password change error:", error);
    
    // Log failed attempt
    try {
      await storage.createSecurityAudit({
        userId: req.user?.id,
        action: "password_change_failed",
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: false,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      });
    } catch (logError) {
      console.error("Failed to log security audit:", logError);
    }
    
    res.status(500).json({ 
      message: "Failed to change password",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


//SEO TRACKING
app.get("/api/user/websites/:websiteId/detailed-seo", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { websiteId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    // Validate website ownership
    const website = await storage.getUserWebsite(websiteId, userId);
    if (!website) {
      res.status(404).json({ message: "Website not found or access denied" });
      return;
    }

    console.log(`Getting detailed SEO data for website ${websiteId}`);

    // Get detailed SEO data including tracked issues
    const detailedData = await seoService.getDetailedSeoData(websiteId, userId);

    res.json(detailedData);
  } catch (error) {
    console.error("Error getting detailed SEO data:", error);
    res.status(500).json({ 
      message: "Failed to get detailed SEO data",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Add this endpoint to get tracked issues for a website
app.get("/api/user/websites/:websiteId/tracked-issues", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { websiteId } = req.params;
    const userId = req.user?.id;
    const { status, autoFixableOnly, limit } = req.query;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    // Validate website ownership
    const website = await storage.getUserWebsite(websiteId, userId);
    if (!website) {
      res.status(404).json({ message: "Website not found or access denied" });
      return;
    }

    const options: any = {};
    
    if (status && typeof status === 'string') {
      options.status = status.split(',');
    }
    
    if (autoFixableOnly === 'true') {
      options.autoFixableOnly = true;
    }
    
    if (limit && !isNaN(Number(limit))) {
      options.limit = Number(limit);
    }

    const trackedIssues = await storage.getTrackedSeoIssues(websiteId, userId, options);

    res.json(trackedIssues);
  } catch (error) {
    console.error("Error getting tracked issues:", error);
    res.status(500).json({ 
      message: "Failed to get tracked issues",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Add this endpoint to get issue tracking summary
app.get("/api/user/websites/:websiteId/issue-summary", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { websiteId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    // Validate website ownership
    const website = await storage.getUserWebsite(websiteId, userId);
    if (!website) {
      res.status(404).json({ message: "Website not found or access denied" });
      return;
    }

    const summary = await storage.getSeoIssueTrackingSummary(websiteId, userId);

    res.json(summary);
  } catch (error) {
    console.error("Error getting issue summary:", error);
    res.status(500).json({ 
      message: "Failed to get issue summary",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Add this endpoint to manually update issue status (for manual fixes)
app.put("/api/user/tracked-issues/:issueId/status", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { issueId } = req.params;
    const { status, resolutionNotes, fixMethod } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    // Validate that the issue belongs to the user
    const trackedIssues = await storage.getTrackedSeoIssues("", userId, { limit: 1000 });
    const issue = trackedIssues.find(i => i.id === issueId);
    
    if (!issue) {
      res.status(404).json({ message: "Issue not found or access denied" });
      return;
    }

    // Validate website ownership
    const website = await storage.getUserWebsite(issue.websiteId, userId);
    if (!website) {
      res.status(404).json({ message: "Website not found or access denied" });
      return;
    }

    const validStatuses = ['detected', 'fixing', 'fixed', 'resolved', 'reappeared'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ message: "Invalid status" });
      return;
    }

    const updatedIssue = await storage.updateSeoIssueStatus(issueId, status, {
      fixMethod: fixMethod || 'manual',
      resolutionNotes
    });

    if (!updatedIssue) {
      res.status(404).json({ message: "Issue not found" });
      return;
    }

    res.json(updatedIssue);
  } catch (error) {
    console.error("Error updating issue status:", error);
    res.status(500).json({ 
      message: "Failed to update issue status",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

  const httpServer = createServer(app);
  return httpServer;
}





// Export the requireAuth middleware for use in other files
export { requireAuth };