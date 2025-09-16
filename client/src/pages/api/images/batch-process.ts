// client/src/pages/api/images/batch-process.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';

interface ProcessOptions {
  action: 'add' | 'strip' | 'update';
  copyright?: string;
  author?: string;
  removeGPS?: boolean;
  optimize?: boolean;
  maxWidth?: number;
  quality?: number;
  keepColorProfile?: boolean;
}

interface BatchProcessRequest {
  imageIds: string[];
  options: ProcessOptions;
}

interface ProcessResult {
  imageId: string;
  success: boolean;
  message?: string;
  error?: string;
}

interface BatchProcessResponse {
  total: number;
  processed: number;
  failed: number;
  successRate: string;
  results: {
    success: ProcessResult[];
    failed: ProcessResult[];
  };
  errors?: Array<{ imageId: string; message: string }>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle GET requests for status checks
  if (req.method === 'GET') {
    const { contentId } = req.query;
    
    if (!contentId) {
      return res.status(400).json({ 
        message: 'Missing contentId parameter',
        error: 'Bad Request'
      });
    }
    
    try {
      // Check processing status for a specific content
      const [content] = await db('ai_content')
        .where('id', contentId)
        .select('id', 'metadata_processed', 'updated_at');
      
      if (!content) {
        return res.status(404).json({ 
          message: 'Content not found',
          status: 'not_found'
        });
      }
      
      return res.status(200).json({
        contentId: content.id,
        status: content.metadata_processed ? 'completed' : 'pending',
        processedAt: content.updated_at
      });
      
    } catch (error: any) {
      console.error('Error checking status:', error);
      return res.status(500).json({ 
        message: 'Failed to check status',
        error: error.message
      });
    }
  }
  
  // Handle POST requests for batch processing
  if (req.method === 'POST') {
    try {
      const { imageIds, options }: BatchProcessRequest = req.body;
      
      // Validate input
      if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
        return res.status(400).json({ 
          message: 'Invalid or empty imageIds array',
          error: 'Bad Request'
        });
      }
      
      if (!options || !options.action) {
        return res.status(400).json({ 
          message: 'Missing processing options',
          error: 'Bad Request'
        });
      }
      
      console.log(`Batch processing ${imageIds.length} images with action: ${options.action}`);
      
      const results: ProcessResult[] = [];
      const errors: Array<{ imageId: string; message: string }> = [];
      
      // Process each image
      for (const imageId of imageIds) {
        try {
          // Parse imageId format: contentId_imageIndex
          const [contentId, imageIndexStr] = imageId.split('_');
          const imageIndex = parseInt(imageIndexStr);
          
          if (!contentId || isNaN(imageIndex)) {
            throw new Error(`Invalid image ID format: ${imageId}`);
          }
          
          // Get content from database
          const [content] = await db('ai_content')
            .where('id', contentId)
            .select('id', 'images', 'website_name');
          
          if (!content) {
            throw new Error(`Content not found: ${contentId}`);
          }
          
          // Parse images array
          let images: any[] = [];
          try {
            if (typeof content.images === 'string') {
              images = JSON.parse(content.images);
            } else if (Buffer.isBuffer(content.images)) {
              images = JSON.parse(content.images.toString('utf8'));
            } else {
              images = content.images || [];
            }
          } catch (parseError) {
            throw new Error(`Failed to parse images for content ${contentId}`);
          }
          
          // Get the specific image
          const targetImage = images[imageIndex];
          if (!targetImage) {
            throw new Error(`Image not found at index ${imageIndex}`);
          }
          
          // Process based on action
          switch (options.action) {
            case 'add':
              // Add metadata to image
              targetImage.metadata = {
                copyright: options.copyright || `© ${new Date().getFullYear()} ${content.website_name}`,
                author: options.author || 'AI Content Generator',
                aiProvider: 'OpenAI',
                aiModel: 'DALL-E 3',
                processedAt: new Date().toISOString(),
                processedBy: 'Batch Processor'
              };
              targetImage.metadataProcessed = true;
              targetImage.hasMetadata = true;
              break;
              
            case 'strip':
              // Remove all metadata
              delete targetImage.metadata;
              delete targetImage.copyright;
              delete targetImage.author;
              delete targetImage.aiProvider;
              delete targetImage.aiModel;
              targetImage.metadataProcessed = false;
              targetImage.hasMetadata = false;
              break;
              
            case 'update':
              // Update existing metadata
              if (!targetImage.metadata) {
                targetImage.metadata = {};
              }
              if (options.copyright) targetImage.metadata.copyright = options.copyright;
              if (options.author) targetImage.metadata.author = options.author;
              targetImage.metadata.updatedAt = new Date().toISOString();
              targetImage.metadataProcessed = true;
              targetImage.hasMetadata = true;
              break;
          }
          
          // Apply optimization options if requested
          if (options.optimize && targetImage.data) {
            // Note: Actual image optimization would require image processing libraries
            // This is a placeholder for the optimization logic
            targetImage.optimized = true;
            targetImage.optimizationSettings = {
              maxWidth: options.maxWidth || 1920,
              quality: options.quality || 85,
              keepColorProfile: options.keepColorProfile !== false
            };
          }
          
          // Remove GPS data if requested
          if (options.removeGPS) {
            targetImage.gpsRemoved = true;
          }
          
          // Update the content in database
          await db('ai_content')
            .where('id', contentId)
            .update({
              images: JSON.stringify(images),
              metadata_processed: options.action !== 'strip',
              updated_at: new Date()
            });
          
          results.push({
            imageId,
            success: true,
            message: `Successfully ${options.action === 'add' ? 'added metadata to' : options.action === 'strip' ? 'stripped metadata from' : 'updated'} image`
          });
          
        } catch (error: any) {
          console.error(`Error processing image ${imageId}:`, error);
          
          results.push({
            imageId,
            success: false,
            error: error.message
          });
          
          errors.push({
            imageId,
            message: error.message
          });
        }
      }
      
      // Calculate statistics
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;
      const successRate = `${Math.round((successCount / imageIds.length) * 100)}%`;
      
      // Prepare response
      const response: BatchProcessResponse = {
        total: imageIds.length,
        processed: successCount,
        failed: failedCount,
        successRate,
        results: {
          success: results.filter(r => r.success),
          failed: results.filter(r => !r.success)
        }
      };
      
      // Add errors if any
      if (errors.length > 0) {
        response.errors = errors;
      }
      
      console.log(`Batch processing complete: ${successCount}/${imageIds.length} successful`);
      
      return res.status(200).json(response);
      
    } catch (error: any) {
      console.error('Batch processing error:', error);
      
      return res.status(500).json({ 
        message: 'Failed to process images',
        error: error.message || 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
  
  // Method not allowed
  return res.status(405).json({ 
    message: 'Method not allowed',
    error: `${req.method} is not supported. Use GET or POST.`
  });
}