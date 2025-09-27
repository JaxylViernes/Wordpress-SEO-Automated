// server/services/image-service.ts

import OpenAI from "openai";
import { storage } from "../storage";
import { apiKeyEncryptionService } from "./api-key-encryption";

export interface ImageGenerationRequest {
  topic: string;
  count: number;
  style: "natural" | "digital_art" | "photographic" | "cinematic";
  contentContext?: string;
  keywords?: string[];
}

export interface GeneratedImage {
  url: string;
  filename: string;
  altText: string;
  prompt: string;
  cost: number;
}

export interface ImageGenerationResult {
  images: GeneratedImage[];
  totalCost: number;
}

interface UserApiKey {
  id: string;
  provider: string;
  keyName: string;
  encryptedApiKey: string;
  isActive: boolean;
  validationStatus: 'valid' | 'invalid' | 'pending';
  usageCount?: number; 
  lastUsed?: Date;
}

export class ImageService {
  private readonly DALLE_COSTS = {
    "1024x1024": 0.04, // Standard quality
    "1792x1024": 0.08, // HD landscape
    "1024x1792": 0.08, // HD portrait
  };

  // Cache for API keys to avoid repeated database queries
   private apiKeyCache: Map<string, { key: string; type: 'user' | 'system'; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get the OpenAI API key for image generation, checking user's keys first, then falling back to env vars
   */
  private async getOpenAIApiKey(userId?: string): Promise<{ key: string; type: 'user' | 'system' } | null> {
    // If no userId provided, use environment variables
      if (!userId) {
      console.log('⚠️ No userId provided for image generation, using environment variables');
      const envKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;
      return envKey ? { key: envKey, type: 'system' } : null;
    }

    const cacheKey = `${userId}-openai`;
    
    // Check cache first
    const cached = this.apiKeyCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`✅ Using cached OpenAI API key for image generation (${cached.type} key)`);
      return { key: cached.key, type: cached.type };
    }

    try {
      // Get user's API keys from database
      const userApiKeys = await storage.getUserApiKeys(userId);
      
      if (userApiKeys && userApiKeys.length > 0) {
        // Find valid OpenAI key
        const validKey = userApiKeys.find(
          (key: UserApiKey) => 
            key.provider === 'openai' && 
            key.isActive && 
            key.validationStatus === 'valid'
        );

        if (validKey && validKey.encryptedApiKey) {
          try {
            // Decrypt the API key
            const decryptedKey = apiKeyEncryptionService.decrypt(validKey.encryptedApiKey);
            
            // Cache with type information
            this.apiKeyCache.set(cacheKey, {
              key: decryptedKey,
              type: 'user',
              timestamp: Date.now()
            });

            console.log(`✅ Using user's OpenAI API key for image generation (${validKey.keyName})`);
            return { key: decryptedKey, type: 'user' };
          } catch (decryptError: any) {
            console.error(`Failed to decrypt user's OpenAI key:`, decryptError.message);
          }
        }
      }
    } catch (error: any) {
      console.warn(`Failed to fetch user's API keys for image generation: ${error.message}`);
    }

    // Fallback to environment variables
    console.log(`⚠️ No user OpenAI key found for image generation, falling back to environment variables`);
    
    // Log this fallback for monitoring (include key type in metadata)
    if (userId) {
      try {
        await storage.createActivityLog({
          userId: userId,
          type: "api_key_fallback",
          description: "Using system OpenAI key for image generation (no user key configured)",
          metadata: { 
            provider: 'openai',
            feature: 'image_generation',
            keyType: 'system'
          }
        });
      } catch (logError) {
        console.warn('Failed to log API key fallback:', logError);
      }
    }
    
    const envKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;
    if (envKey) {
      // Cache system key
      this.apiKeyCache.set(cacheKey, {
        key: envKey,
        type: 'system',
        timestamp: Date.now()
      });
      return { key: envKey, type: 'system' };
    }
    
    return null;
  }

  /**
   * Create an OpenAI client with the appropriate API key
   */
 private async createOpenAIClient(userId?: string): Promise<{ client: OpenAI; keyType: 'user' | 'system' }> {
    const keyInfo = await this.getOpenAIApiKey(userId);
    
    if (!keyInfo) {
      throw new Error(
        userId 
          ? 'No OpenAI API key available. Please add your OpenAI API key in settings to generate images.'
          : 'No OpenAI API key configured. Image generation requires an OpenAI API key.'
      );
    }

    return {
      client: new OpenAI({ apiKey: keyInfo.key }),
      keyType: keyInfo.type
    };
  }

  /**
   * Clear cached API key for a user (call this when user updates their keys)
   */
    public clearApiKeyCache(userId: string): void {
    this.apiKeyCache.delete(`${userId}-openai`);
    console.log(`🗑️ Cleared OpenAI API key cache for user ${userId}`);
  }


  async generateImages(
    request: ImageGenerationRequest,
    userId?: string,
    websiteId?: string 
  ): Promise<ImageGenerationResult & { keyType?: 'user' | 'system' }> {
    // Create OpenAI client and track key type
    let openai: OpenAI;
    let keyType: 'user' | 'system' = 'system';
    
    try {
      const clientInfo = await this.createOpenAIClient(userId);
      openai = clientInfo.client;
      keyType = clientInfo.keyType;
    } catch (error: any) {
      console.error('Failed to initialize OpenAI client for image generation:', error.message);
      throw error;
    }

    console.log(
      `🎨 Starting image generation: ${request.count} images for "${request.topic}"${
        userId ? ` (user: ${userId}, ${keyType} key)` : ' (system key)'
      }`
    );

    const images: GeneratedImage[] = [];
    let totalCost = 0;

    for (let i = 0; i < request.count; i++) {
      try {
        const prompt = this.createImagePrompt(
          request.topic,
          request.style,
          i + 1,
          request.count,
          request.keywords
        );

        console.log(
          `🖼️ Generating image ${i + 1}/${request.count} with ${keyType} key: ${prompt.substring(
            0,
            100
          )}...`
        );

        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: prompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
          style: request.style === "natural" ? "natural" : "vivid",
        });

        const imageUrl = response.data[0]?.url;
        if (!imageUrl) {
          throw new Error(`No image URL returned for image ${i + 1}`);
        }

        const imageCost = this.DALLE_COSTS["1024x1024"];
        totalCost += imageCost;

        images.push({
          url: imageUrl,
          filename: this.generateFilename(request.topic, i + 1),
          altText: this.generateAltTextForAIImage(request.topic, i + 1, request.count),
          prompt: prompt,
          cost: imageCost,
        });

        console.log(
          `✅ Generated image ${i + 1}/${
            request.count
          } (Cost: $${imageCost.toFixed(4)}, Key: ${keyType})`
        );

        // Track API key usage with type
        if (userId && websiteId) {
    try {
      await storage.trackAiUsage({
        userId,
        websiteId: websiteId || 'default',  // Now we have a valid websiteId
        model: 'dall-e-3',
        operation: 'image_generation',
        tokensUsed: 0,
        costUsd: Math.round(this.DALLE_COSTS["1024x1024"] * 100),
        keyType
      });
    } catch (trackError) {
      console.warn('Failed to track AI usage:', trackError);
    }
  }

        // Rate limiting
        if (i < request.count - 1) {
          console.log("⏳ Waiting to respect rate limits...");
          await new Promise((resolve) => setTimeout(resolve, 12000));
        }
      } catch (error: any) {
        console.error(`❌ Failed to generate image ${i + 1}:`, error.message);

        // Handle errors...
        if (error.status === 401) {
          if (userId) this.clearApiKeyCache(userId);
          throw new Error(
            `Invalid OpenAI API key (${keyType} key). Please check your API key${
              keyType === 'user' ? ' in settings' : ' configuration'
            }.`
          );
        } else if (
          error.status === 400 &&
          error.message.includes("content_policy")
        ) {
          console.warn(
            `⚠️ Content policy violation for image ${i + 1}, skipping...`
          );
          continue;
        } else if (error.status === 402) {
          throw new Error(
            `Insufficient OpenAI credits for image generation. Generated ${i} of ${request.count} images.`
          );
        }

        // For other errors, continue but log the failure
        console.warn(
          `⚠️ Skipping image ${i + 1} due to error: ${error.message}`
        );
      }
    }

    if (images.length === 0) {
      throw new Error("Failed to generate any images - all requests failed");
    }

    if (images.length < request.count) {
      console.warn(
        `⚠️ Generated ${images.length}/${request.count} images due to errors`
      );
    }

    console.log(
      `🎉 Image generation complete: ${images.length}/${
        request.count
      } images (Total cost: $${totalCost.toFixed(4)}, Key type: ${keyType})`
    );

    // Return with key type information
    return {
      images,
      totalCost,
      keyType
    };
  }

  /**
   * Track API key usage for monitoring
   */
private async trackApiKeyUsage(userId: string, operation: string, keyType: 'user' | 'system'): Promise<void> {
    try {
      // Track in AI usage table with key type
      await storage.trackAiUsage({
        userId,
        websiteId: undefined, // Images might not always have websiteId
        model: 'dall-e-3',
        operation,
        tokensUsed: 0, // Images don't use tokens
        costUsd: Math.round(this.DALLE_COSTS["1024x1024"] * 100), // Convert to cents
        keyType // Pass the key type
      });

      console.log(`📊 Image generation usage: ${operation} (${keyType} key)`);

      // Also update the user's API key usage counter if using their key
      if (keyType === 'user') {
        const userApiKeys = await storage.getUserApiKeys(userId);
        const openaiKey = userApiKeys.find(
          (key: any) => 
            key.provider === 'openai' && 
            key.isActive && 
            key.validationStatus === 'valid'
        );

        if (openaiKey && openaiKey.id) {
          const currentCount = typeof openaiKey.usageCount === 'number' 
            ? openaiKey.usageCount 
            : 0;
          
          if (!isNaN(currentCount)) {
            await storage.updateUserApiKey(userId, openaiKey.id, {
              usageCount: currentCount + 1,
              lastUsed: new Date()
            });
          }
        }
      }
    } catch (error: any) {
      console.warn('Failed to track API key usage:', error.message);
    }
  }


  private createImagePrompt(
    topic: string,
    style: string,
    imageNumber: number,
    totalImages: number,
    keywords?: string[]
  ): string {
    const stylePrompts = {
      natural: "photorealistic, natural lighting, high quality photograph",
      digital_art:
        "modern digital illustration, clean design, professional artwork",
      photographic:
        "professional photography, studio lighting, commercial quality, sharp focus",
      cinematic: "cinematic composition, dramatic lighting, movie-style visual",
    };

    const styleText =
      stylePrompts[style as keyof typeof stylePrompts] || stylePrompts.natural;

    // Create different prompts based on image position
    let imageContext = "";
    if (totalImages === 1) {
      imageContext = "main hero image representing";
    } else if (imageNumber === 1) {
      imageContext = "primary hero image for";
    } else if (imageNumber === 2) {
      imageContext = "supporting visual illustrating";
    } else {
      imageContext = "detailed supplementary image about";
    }

    // Include keywords if provided
    const keywordContext =
      keywords && keywords.length > 0
        ? ` Related concepts: ${keywords.slice(0, 3).join(", ")}.`
        : "";

    const basePrompt = `Create a ${styleText} serving as a ${imageContext} "${topic}".${keywordContext}`;

    // Add style-specific guidance
    const styleGuidance = {
      natural:
        " The image should look realistic and authentic, suitable for a professional blog post.",
      digital_art:
        " Use modern, clean visual design with engaging colors and professional illustration style.",
      photographic:
        " High-quality commercial photography with professional composition and lighting.",
      cinematic:
        " Dramatic visual storytelling with cinematic lighting and compelling composition.",
    };

    const guidance =
      styleGuidance[style as keyof typeof styleGuidance] ||
      styleGuidance.natural;

    return `${basePrompt}${guidance} Avoid text overlays, watermarks, or busy backgrounds. Focus on clear, relevant imagery that complements written content.`;
  }

  private generateAltTextForAIImage(
    topic: string,
    imageNumber: number,
    totalImages: number
  ): string {
    const cleanTopic = topic.replace(/[^\w\s]/g, "").trim();

    if (totalImages === 1) {
      return `Visual representation of ${cleanTopic}`;
    } else if (imageNumber === 1) {
      return `Hero image for ${cleanTopic}`;
    } else {
      return `Supporting visual ${imageNumber} for ${cleanTopic}`;
    }
  }

  private generateFilename(topic: string, imageNumber: number): string {
    const slug = this.slugify(topic);
    const timestamp = Date.now();
    return `${slug}-${imageNumber}-${timestamp}.png`;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single
      .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
      .substring(0, 50); // Limit length
  }

  async uploadImageToWordPress(
    imageUrl: string,
    filename: string,
    altText: string,
    wpCredentials: {
      url: string;
      username: string;
      applicationPassword: string;
    }
  ): Promise<{ id: number; url: string; filename: string }> {
    try {
      console.log(`📤 Uploading image to WordPress: ${filename}`);

      // Download the image from DALL-E URL
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(
          `Failed to download image: ${imageResponse.statusText}`
        );
      }

      const imageArrayBuffer = await imageResponse.arrayBuffer();
      const imageBlob = new Blob([imageArrayBuffer], { type: "image/png" });

      // Create form data for WordPress upload
      const formData = new FormData();
      formData.append("file", imageBlob, filename);
      formData.append("title", altText);
      formData.append("alt_text", altText);
      formData.append("caption", altText);

      // Upload to WordPress
      const wpUrl = wpCredentials.url.replace(/\/$/, "");
      const authHeader = Buffer.from(
        `${wpCredentials.username}:${wpCredentials.applicationPassword}`
      ).toString("base64");

      const uploadResponse = await fetch(`${wpUrl}/wp-json/wp/v2/media`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(
          `WordPress upload failed (${uploadResponse.status}): ${errorText}`
        );
      }

      const result = await uploadResponse.json();

      console.log(`✅ Image uploaded to WordPress: ID ${result.id}`);

      return {
        id: result.id,
        url: result.source_url || result.guid?.rendered,
        filename: result.slug || filename,
      };
    } catch (error: any) {
      console.error("WordPress image upload error:", error);
      throw new Error(`Failed to upload image to WordPress: ${error.message}`);
    }
  }

  // Helper method to validate image generation request
  validateImageRequest(request: ImageGenerationRequest): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!request.topic || request.topic.trim().length < 3) {
      errors.push("Topic must be at least 3 characters long");
    }

    if (request.count < 1 || request.count > 3) {
      errors.push("Image count must be between 1 and 3");
    }

    const validStyles = ["natural", "digital_art", "photographic", "cinematic"];
    if (!validStyles.includes(request.style)) {
      errors.push(`Style must be one of: ${validStyles.join(", ")}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

 async generateAltTextForUpload(
    imageBuffer: Buffer, 
    filename: string,
    userId?: string
  ): Promise<{ altText: string; keyType: 'user' | 'system' }> {
    try {
      // Get client with key type tracking
      const clientInfo = await this.createOpenAIClient(userId);
      const openai = clientInfo.client;
      const keyType = clientInfo.keyType;
      
      const base64Image = imageBuffer.toString('base64');
      const dataUrl = `data:image/jpeg;base64,${base64Image}`;
      
      console.log(`🔍 Generating alt text with ${keyType} key`);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: "Generate concise, descriptive alt text for this image suitable for web accessibility. Maximum 125 characters."
            },
            {
              type: "image_url",
              image_url: { url: dataUrl }
            }
          ]
        }],
        max_tokens: 100
      });
      
      // Track usage with key type
      if (userId) {
        await this.trackApiKeyUsage(userId, 'alt_text_generation', keyType);
      }
      
      return {
        altText: response.choices[0]?.message?.content || 
                filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        keyType
      };
      
    } catch (error) {
      console.warn('Failed to generate alt text:', error);
      // Fallback to filename-based alt text
      return {
        altText: filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        keyType: 'system' // Fallback doesn't use any API
      };
    }
  }


  /**
   * Optimize uploaded images
   */
  async optimizeImage(buffer: Buffer, options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
  } = {}): Promise<Buffer> {
    const sharp = require('sharp');
    
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 85,
      format = 'jpeg'
    } = options;
    
    try {
      let pipeline = sharp(buffer);
      
      // Get metadata
      const metadata = await pipeline.metadata();
      
      // Resize if needed
      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        pipeline = pipeline.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }
      
      // Convert format and compress
      switch (format) {
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality, progressive: true });
          break;
        case 'png':
          pipeline = pipeline.png({ quality, compressionLevel: 9 });
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality });
          break;
      }
      
      // Remove metadata for privacy
      pipeline = pipeline.rotate(); // Auto-rotate based on EXIF
      
      return await pipeline.toBuffer();
      
    } catch (error) {
      console.error('Image optimization failed:', error);
      return buffer; // Return original if optimization fails
    }
  }

}

export const imageService = new ImageService();