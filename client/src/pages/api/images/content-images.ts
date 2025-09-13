import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Simple test response - no database, no complex imports
  const { websiteId } = req.query;
  
  console.log('Content-images API hit!');
  console.log('Website ID:', websiteId);
  
  // Return empty array for now to test the endpoint
  res.status(200).json([]);
}

// // client/src/pages/api/images/content-images.ts
// import { NextApiRequest, NextApiResponse } from 'next';
// import { db } from '../../../../../server/db';

// interface ContentImage {
//   id: string;
//   url?: string;
//   data?: string | null;
//   contentId: string;
//   contentTitle: string;
//   websiteId: string;
//   websiteName: string;
//   hasMetadata: boolean;
//   metadataDetails: Record<string, any>;
//   size: number;
//   createdAt: string;
//   isAIGenerated: boolean;
//   processedAt: string | null;
//   costCents: number;
// }

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse
// ) {
//   // Only allow GET requests
//   if (req.method !== 'GET') {
//     return res.status(405).json({ 
//       error: 'Method not allowed',
//       message: `${req.method} is not supported. Use GET.`
//     });
//   }

//   try {
//     const { websiteId } = req.query;
    
//     console.log('API: Fetching content images for website:', websiteId || 'all');
    
//     // Build query - fetch content that has images
//     const query = db('ai_content')
//       .select(
//         'id',
//         'title',
//         'website_id',
//         'website_name',
//         'images',
//         'created_at',
//         'metadata_processed',
//         'has_images',
//         'image_count',
//         'image_cost_cents',
//         'ai_provider'
//       )
//       .whereNotNull('images')
//       .orderBy('created_at', 'desc');
    
//     // Filter by website if specified
//     if (websiteId && websiteId !== '' && websiteId !== 'undefined') {
//       query.where('website_id', websiteId as string);
//     }
    
//     // Add additional filter to ensure we only get content with actual images
//     query.andWhere(function() {
//       this.where('has_images', true)
//         .orWhereRaw("images != '[]'")
//         .orWhereRaw("images != ''")
//         .orWhereRaw("images IS NOT NULL");
//     });
    
//     const contentItems = await query;
    
//     console.log(`API: Found ${contentItems.length} content items with images`);
    
//     // Transform content items to image format
//     const images: ContentImage[] = [];
    
//     for (const content of contentItems) {
//       let contentImages: any[];
      
//       // Parse images data safely
//       try {
//         if (!content.images) continue;
        
//         // Handle different formats of image data
//         if (typeof content.images === 'string') {
//           // Skip empty strings or empty arrays
//           if (content.images === '' || content.images === '[]' || content.images === 'null') {
//             continue;
//           }
          
//           try {
//             contentImages = JSON.parse(content.images);
//           } catch (parseError) {
//             console.error(`Failed to parse images JSON for content ${content.id}:`, parseError);
//             continue;
//           }
//         } else if (Buffer.isBuffer(content.images)) {
//           // Handle Buffer data from database
//           try {
//             const jsonString = content.images.toString('utf8');
//             contentImages = JSON.parse(jsonString);
//           } catch (bufferError) {
//             console.error(`Failed to parse buffer data for content ${content.id}:`, bufferError);
//             continue;
//           }
//         } else {
//           contentImages = content.images;
//         }
        
//         // Validate it's an array with content
//         if (!Array.isArray(contentImages) || contentImages.length === 0) {
//           console.log(`Skipping content ${content.id}: no valid images array`);
//           continue;
//         }
//       } catch (error) {
//         console.error(`Failed to process images for content ${content.id}:`, error);
//         continue;
//       }
      
//       // Process each image in the content
//       contentImages.forEach((img: any, index: number) => {
//         // Skip invalid image objects
//         if (!img || (typeof img === 'object' && Object.keys(img).length === 0)) {
//           return;
//         }
        
//         // Generate unique image ID
//         const imageId = `${content.id}_${index}`;
        
//         // Check if image has metadata
//         const hasMetadata = !!(
//           img.metadataProcessed || 
//           img.metadata || 
//           content.metadata_processed ||
//           img.processedAt ||
//           img.hasMetadata
//         );
        
//         // Collect metadata details
//         const metadataDetails: Record<string, any> = {};
        
//         if (img.metadata && typeof img.metadata === 'object') {
//           Object.assign(metadataDetails, img.metadata);
//         }
        
//         // Add individual metadata fields
//         if (img.copyright) metadataDetails.copyright = img.copyright;
//         if (img.author) metadataDetails.author = img.author;
//         if (img.aiModel) metadataDetails.aiModel = img.aiModel;
//         if (img.aiProvider) metadataDetails.aiProvider = img.aiProvider;
        
//         // If no specific metadata but marked as processed, add default
//         if (hasMetadata && Object.keys(metadataDetails).length === 0) {
//           metadataDetails.aiProvider = content.ai_provider || 'OpenAI';
//           metadataDetails.aiModel = 'DALL-E 3';
//         }
        
//         // Calculate image size
//         let imageSize = 0;
//         if (img.processedSize) {
//           imageSize = img.processedSize;
//         } else if (img.size) {
//           imageSize = img.size;
//         } else if (img.data) {
//           try {
//             let base64Data = img.data;
//             // Remove data URL prefix if present
//             if (base64Data.includes(',')) {
//               base64Data = base64Data.split(',')[1];
//             }
//             // Estimate size from base64 length
//             imageSize = Math.round((base64Data.length * 3) / 4);
//           } catch (e) {
//             console.log(`Could not calculate size for image ${imageId}`);
//             imageSize = 0;
//           }
//         }
        
//         // Create image object with all details
//         const imageObject: ContentImage = {
//           id: imageId,
//           url: img.url || '',
//           data: img.data || null,
//           contentId: content.id,
//           contentTitle: content.title || 'Untitled',
//           websiteId: content.website_id || '',
//           websiteName: content.website_name || 'Unknown',
//           hasMetadata: hasMetadata,
//           metadataDetails: metadataDetails,
//           size: imageSize,
//           createdAt: content.created_at,
//           isAIGenerated: true, // All images from ai_content are AI-generated
//           processedAt: img.processedAt || null,
//           costCents: img.costCents || content.image_cost_cents || 4, // Default 4 cents
//         };
        
//         images.push(imageObject);
//       });
//     }
    
//     console.log(`API: Returning ${images.length} total images`);
    
//     // Return successful response with images array
//     return res.status(200).json(images);
    
//   } catch (error: any) {
//     console.error('API Error - Failed to fetch content images:', error);
    
//     // Return detailed error for debugging
//     return res.status(500).json({ 
//       error: 'Failed to fetch images',
//       message: error.message || 'An unexpected error occurred',
//       details: process.env.NODE_ENV === 'development' ? error.stack : undefined
//     });
//   }
// }