// server/services/cloudinary-storage.ts

import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

export interface CloudinaryImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  secureUrl: string;
}

export class CloudinaryStorageService {
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      console.warn('⚠️ Cloudinary not configured. Please set environment variables.');
      return;
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true, // Always use HTTPS
    });

    this.initialized = true;
    console.log('✅ Cloudinary storage initialized');
    console.log(`   Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    console.log(`   API Key: ${process.env.CLOUDINARY_API_KEY?.substring(0, 5)}...`);
  }

  /**
   * Upload image directly from DALL-E URL to Cloudinary
   * No need to download first - Cloudinary fetches it directly!
   */
  async uploadFromUrl(
    imageUrl: string,
    websiteId: string,
    contentId: string,
    imageName: string
  ): Promise<CloudinaryImage> {
    if (!this.initialized) {
      throw new Error('Cloudinary not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
    }

    try {
      // Clean up the image name for use as public_id
      const cleanImageName = imageName
        .replace(/\.[^/.]+$/, '') // Remove file extension
        .replace(/[^a-zA-Z0-9-_]/g, '-') // Replace special chars with hyphens
        .toLowerCase();

      // Create organized folder structure
      const publicId = `content-generator/${websiteId}/${contentId}/${cleanImageName}`;
      
      console.log(`📤 Uploading to Cloudinary: ${imageName}`);
      console.log(`   Public ID: ${publicId}`);

      const result: UploadApiResponse = await cloudinary.uploader.upload(imageUrl, {
        public_id: publicId,
        folder: `content-generator/${websiteId}`,
        resource_type: 'image',
        
        // Optimization settings
        quality: 'auto:best', // Automatic quality optimization
        fetch_format: 'auto', // Serve WebP/AVIF to supported browsers
        
        // Add metadata
        context: {
          website_id: websiteId,
          content_id: contentId,
          original_filename: imageName,
          generated_at: new Date().toISOString(),
        },
        
        // Tags for organization
        tags: ['ai-generated', 'dalle', websiteId, contentId],
        
        // Transformation for web optimization
        eager: [
          {
            width: 1920,
            height: 1080,
            crop: 'limit', // Don't upscale
            quality: 'auto:best',
            fetch_format: 'auto'
          },
          // Thumbnail version
          {
            width: 400,
            height: 300,
            crop: 'fill',
            gravity: 'auto',
            quality: 'auto:good'
          }
        ],
        
        // Backup settings
        backup: true, // Keep backup copy
        overwrite: true, // Overwrite if exists
        invalidate: true, // Invalidate CDN cache
        
        // Error handling
        return_delete_token: true, // Get delete token for cleanup if needed
      });

      console.log(`✅ Uploaded to Cloudinary successfully`);
      console.log(`   URL: ${result.secure_url}`);
      console.log(`   Size: ${(result.bytes / 1024).toFixed(2)} KB`);
      console.log(`   Format: ${result.format}`);
      console.log(`   Dimensions: ${result.width}x${result.height}`);

      return {
        url: result.url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        secureUrl: result.secure_url,
      };
    } catch (error: any) {
      console.error('❌ Cloudinary upload failed:', error);
      
      // Provide specific error messages
      if (error.message?.includes('Invalid image')) {
        throw new Error('Invalid image format. Cloudinary could not process this image.');
      } else if (error.message?.includes('File size too large')) {
        throw new Error('Image file size exceeds Cloudinary limits.');
      } else if (error.http_code === 401) {
        throw new Error('Cloudinary authentication failed. Please check your API credentials.');
      } else if (error.http_code === 420) {
        throw new Error('Cloudinary rate limit exceeded. Please wait and try again.');
      } else if (error.http_code === 500) {
        throw new Error('Cloudinary server error. Please try again later.');
      }
      
      throw new Error(`Cloudinary upload failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Upload from buffer (fallback if URL upload fails)
   */
  async uploadFromBuffer(
    imageBuffer: Buffer,
    websiteId: string,
    contentId: string,
    imageName: string
  ): Promise<CloudinaryImage> {
    if (!this.initialized) {
      throw new Error('Cloudinary not configured');
    }

    try {
      const cleanImageName = imageName
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .toLowerCase();

      const publicId = `content-generator/${websiteId}/${contentId}/${cleanImageName}`;

      console.log(`📤 Uploading buffer to Cloudinary: ${imageName}`);

      // Convert buffer to base64
      const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

      const result: UploadApiResponse = await cloudinary.uploader.upload(base64Image, {
        public_id: publicId,
        folder: `content-generator/${websiteId}`,
        resource_type: 'image',
        quality: 'auto:best',
        fetch_format: 'auto',
        context: {
          website_id: websiteId,
          content_id: contentId,
          original_filename: imageName,
          generated_at: new Date().toISOString(),
        },
        tags: ['ai-generated', 'dalle', websiteId, contentId],
      });

      console.log(`✅ Buffer uploaded to Cloudinary: ${result.secure_url}`);

      return {
        url: result.url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        secureUrl: result.secure_url,
      };
    } catch (error: any) {
      console.error('❌ Cloudinary buffer upload failed:', error);
      throw new Error(`Cloudinary buffer upload failed: ${error.message}`);
    }
  }

  /**
   * Get optimized URL with transformations
   */
  getOptimizedUrl(
    publicId: string,
    options?: {
      width?: number;
      height?: number;
      quality?: 'auto' | 'auto:best' | 'auto:good' | 'auto:eco' | number;
      format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
      crop?: 'scale' | 'fit' | 'limit' | 'fill' | 'thumb';
    }
  ): string {
    const transformation: any = {
      quality: options?.quality || 'auto:best',
      fetch_format: options?.format || 'auto',
    };

    if (options?.width) transformation.width = options.width;
    if (options?.height) transformation.height = options.height;
    if (options?.crop) transformation.crop = options.crop;

    return cloudinary.url(publicId, {
      secure: true,
      transformation,
    });
  }

  /**
   * Get responsive image URLs for different screen sizes
   */
  getResponsiveUrls(publicId: string): {
    small: string;
    medium: string;
    large: string;
    original: string;
  } {
    return {
      small: this.getOptimizedUrl(publicId, { width: 640, quality: 'auto:good' }),
      medium: this.getOptimizedUrl(publicId, { width: 1024, quality: 'auto:good' }),
      large: this.getOptimizedUrl(publicId, { width: 1920, quality: 'auto:best' }),
      original: this.getOptimizedUrl(publicId),
    };
  }

  /**
   * Delete image from Cloudinary (if needed)
   */
  async deleteImage(publicId: string): Promise<boolean> {
    if (!this.initialized) {
      console.warn('Cloudinary not initialized, cannot delete image');
      return false;
    }

    try {
      console.log(`🗑️ Deleting image from Cloudinary: ${publicId}`);
      const result = await cloudinary.uploader.destroy(publicId);
      
      if (result.result === 'ok') {
        console.log(`✅ Image deleted from Cloudinary`);
        return true;
      } else {
        console.warn(`⚠️ Failed to delete image: ${result.result}`);
        return false;
      }
    } catch (error: any) {
      console.error('Failed to delete image:', error);
      return false;
    }
  }

  /**
   * Get image info from Cloudinary
   */
  async getImageInfo(publicId: string): Promise<any> {
    if (!this.initialized) {
      throw new Error('Cloudinary not configured');
    }

    try {
      const result = await cloudinary.api.resource(publicId, {
        colors: true,
        faces: true,
        quality_analysis: true,
      });
      
      return {
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        created_at: result.created_at,
        colors: result.colors,
        predominant: result.predominant,
        quality_analysis: result.quality_analysis,
      };
    } catch (error: any) {
      console.error('Failed to get image info:', error);
      return null;
    }
  }

  /**
   * Check if Cloudinary is properly configured
   */
  isConfigured(): boolean {
    return this.initialized;
  }

  /**
   * Get usage stats (for monitoring)
   */
  async getUsageStats(): Promise<any> {
    if (!this.initialized) {
      throw new Error('Cloudinary not configured');
    }

    try {
      const result = await cloudinary.api.usage();
      
      return {
        plan: result.plan,
        credits_used: result.credits.used,
        credits_limit: result.credits.limit,
        credits_remaining: result.credits.limit - result.credits.used,
        bandwidth_used: result.bandwidth.used,
        bandwidth_limit: result.bandwidth.limit,
        storage_used: result.storage.used,
        storage_limit: result.storage.limit,
        transformations_used: result.transformations.used,
        transformations_limit: result.transformations.limit,
      };
    } catch (error: any) {
      console.error('Failed to get usage stats:', error);
      return null;
    }
  }

  /**
   * Batch upload multiple images
   */
  async batchUpload(
    images: Array<{
      url: string;
      filename: string;
      websiteId: string;
      contentId: string;
    }>
  ): Promise<CloudinaryImage[]> {
    const results: CloudinaryImage[] = [];
    
    for (const image of images) {
      try {
        const result = await this.uploadFromUrl(
          image.url,
          image.websiteId,
          image.contentId,
          image.filename
        );
        results.push(result);
      } catch (error: any) {
        console.error(`Failed to upload ${image.filename}:`, error.message);
        // Continue with other images even if one fails
      }
    }
    
    return results;
  }
}

export const cloudinaryStorage = new CloudinaryStorageService();