// client/src/pages/api/images/process-metadata.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';

interface MetadataPayload {
  imageData?: string;
  contentId: string;
  websiteName: string;
  imageIndex: number;
  metadata: {
    copyright?: string;
    author?: string;
    description?: string;
    aiProvider?: string;
    aiModel?: string;
    keywords?: string[];
    contentTopic?: string;
  };
}

interface ProcessedImage {
  data: string;
  metadataAdded: boolean;
  size: number;
  processedAt: string;
  metadata?: Record<string, any>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      message: 'Method not allowed',
      error: `${req.method} is not supported. Use POST.`
    });
  }

  try {
    const payload: MetadataPayload = req.body;
    
    // Validate required fields
    if (!payload.contentId) {
      return res.status(400).json({ 
        message: 'Missing required field: contentId',
        error: 'Bad Request'
      });
    }
    
    console.log(`Processing metadata for content ${payload.contentId}, image ${payload.imageIndex}`);
    
    // Get the current content from database
    const [content] = await db('ai_content')
      .where('id', payload.contentId)
      .select('id', 'images', 'metadata_processed');
    
    if (!content) {
      return res.status(404).json({ 
        message: 'Content not found',
        error: `No content found with ID: ${payload.contentId}`
      });
    }
    
    // Parse existing images
    let images: any[] = [];
    try {
      if (typeof content.images === 'string') {
        images = JSON.parse(content.images);
      } else if (Buffer.isBuffer(content.images)) {
        images = JSON.parse(content.images.toString('utf8'));
      } else {
        images = content.images || [];
      }
    } catch (error) {
      console.error('Failed to parse existing images:', error);
      images = [];
    }
    
    // Ensure images array exists and has the required index
    if (!Array.isArray(images)) {
      images = [];
    }
    
    // Get or create the image at the specified index
    let targetImage = images[payload.imageIndex];
    
    if (!targetImage) {
      // If image doesn't exist at this index, create a new one
      targetImage = {
        data: payload.imageData || '',
        url: '',
        createdAt: new Date().toISOString()
      };
      images[payload.imageIndex] = targetImage;
    }
    
    // Add/update metadata for the image
    const processedMetadata = {
      ...payload.metadata,
      processedAt: new Date().toISOString(),
      processedBy: 'Image Metadata API',
      version: '1.0'
    };
    
    // Update the image object with metadata
    targetImage.metadata = processedMetadata;
    targetImage.metadataProcessed = true;
    targetImage.processedAt = new Date().toISOString();
    targetImage.hasMetadata = true;
    
    // Keep the original image data
    if (payload.imageData && !targetImage.data) {
      targetImage.data = payload.imageData;
    }
    
    // Calculate size if we have data
    if (targetImage.data) {
      try {
        let base64Data = targetImage.data;
        if (base64Data.includes(',')) {
          base64Data = base64Data.split(',')[1];
        }
        targetImage.processedSize = Math.round((base64Data.length * 3) / 4);
      } catch (e) {
        targetImage.processedSize = 0;
      }
    }
    
    // Update the database with the modified images array
    try {
      await db('ai_content')
        .where('id', payload.contentId)
        .update({
          images: JSON.stringify(images),
          metadata_processed: true,
          updated_at: new Date()
        });
      
      console.log(`Successfully updated metadata for content ${payload.contentId}, image ${payload.imageIndex}`);
    } catch (dbError: any) {
      console.error('Database update failed:', dbError);
      return res.status(500).json({ 
        message: 'Failed to update database',
        error: dbError.message
      });
    }
    
    // Return the processed image
    const response: ProcessedImage = {
      data: targetImage.data || payload.imageData || '',
      metadataAdded: true,
      size: targetImage.processedSize || 0,
      processedAt: targetImage.processedAt,
      metadata: processedMetadata
    };
    
    return res.status(200).json(response);
    
  } catch (error: any) {
    console.error('API Error - Failed to process metadata:', error);
    
    // Return detailed error response
    return res.status(500).json({ 
      message: 'Failed to process metadata',
      error: error.message || 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}