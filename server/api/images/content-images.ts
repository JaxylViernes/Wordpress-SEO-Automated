// server/api/images/content-images.ts
// Express route for fetching images from WordPress and database

import { Request, Response } from 'express';
import { db } from '@/lib/db'; // Adjust this import path as needed

export const getContentImages = async (req: Request, res: Response) => {
  try {
    const { websiteId } = req.query;
    
    console.log('=== FETCHING CONTENT IMAGES ===');
    console.log('Website ID:', websiteId || 'all');
    
    const images: any[] = [];
    
    // Step 1: Get website(s) from database
    let websiteQuery = db('websites')
      .select('*');
    
    if (websiteId && websiteId !== 'undefined') {
      websiteQuery = websiteQuery.where('id', websiteId);
    }
    
    const websites = await websiteQuery;
    console.log(`Found ${websites.length} websites`);
    
    // Process each website
    for (const website of websites) {
      console.log(`\nProcessing: ${website.name}`);
      console.log(`URL: ${website.url}`);
      
      if (!website.url) {
        console.log('No URL configured, skipping');
        continue;
      }
      
      const baseUrl = website.url.replace(/\/$/, '');
      
      // Step 2: Fetch WordPress posts with images
      try {
        const postsUrl = `${baseUrl}/wp-json/wp/v2/posts?_embed&per_page=20`;
        console.log(`Fetching posts from: ${postsUrl}`);
        
        const headers: any = {
          'Content-Type': 'application/json'
        };
        
        // Add authentication if available
        if (website.wp_application_password) {
          const username = website.wp_username || website.wp_application_name || 'admin';
          const authString = `${username}:${website.wp_application_password}`;
          headers['Authorization'] = `Basic ${Buffer.from(authString).toString('base64')}`;
        }
        
        const postsResponse = await fetch(postsUrl, { headers });
        
        if (postsResponse.ok) {
          const posts = await postsResponse.json();
          console.log(`Found ${posts.length} posts`);
          
          for (const post of posts) {
            // Extract featured image
            if (post._embedded?.['wp:featuredmedia']?.[0]) {
              const media = post._embedded['wp:featuredmedia'][0];
              if (media.media_type === 'image' && media.source_url) {
                images.push({
                  id: `wp_post_${website.id}_${post.id}_featured`,
                  url: media.source_url,
                  contentId: `post_${post.id}`,
                  contentTitle: stripHtml(post.title?.rendered) || 'WordPress Post',
                  websiteId: website.id,
                  websiteName: website.name,
                  hasMetadata: !!(media.alt_text || media.caption?.rendered),
                  metadataDetails: {
                    postId: post.id,
                    altText: media.alt_text || '',
                    caption: media.caption?.rendered || '',
                    isFeatured: true
                  },
                  size: media.media_details?.filesize || 0,
                  createdAt: post.date,
                  isAIGenerated: false,
                  processedAt: post.modified,
                  costCents: 0,
                  source: 'wordpress_post'
                });
              }
            }
            
            // Extract images from post content
            if (post.content?.rendered) {
              const imgMatches = post.content.rendered.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi) || [];
              
              for (const imgTag of imgMatches) {
                const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
                if (srcMatch && srcMatch[1]) {
                  const url = srcMatch[1];
                  
                  // Skip data URLs and emojis
                  if (!url.startsWith('data:') && !url.includes('emoji') && !images.some(img => img.url === url)) {
                    const altMatch = imgTag.match(/alt=["']([^"']*?)["']/i);
                    
                    images.push({
                      id: `wp_post_${website.id}_${post.id}_${images.length}`,
                      url: url,
                      contentId: `post_${post.id}`,
                      contentTitle: stripHtml(post.title?.rendered) || 'WordPress Post',
                      websiteId: website.id,
                      websiteName: website.name,
                      hasMetadata: !!altMatch,
                      metadataDetails: {
                        postId: post.id,
                        altText: altMatch ? altMatch[1] : ''
                      },
                      size: 0,
                      createdAt: post.date,
                      isAIGenerated: false,
                      processedAt: post.modified,
                      costCents: 0,
                      source: 'wordpress_post'
                    });
                  }
                }
              }
            }
          }
        } else {
          console.log(`Failed to fetch posts: ${postsResponse.status}`);
          
          // Try without authentication
          const publicResponse = await fetch(postsUrl);
          if (publicResponse.ok) {
            const posts = await publicResponse.json();
            console.log(`Found ${posts.length} public posts`);
            // Process posts (same logic as above)
          }
        }
      } catch (error: any) {
        console.error(`Error fetching WordPress posts:`, error.message);
      }
      
      // Step 3: Fetch WordPress Media Library
      try {
        const mediaUrl = `${baseUrl}/wp-json/wp/v2/media?per_page=50`;
        console.log(`Fetching media from: ${mediaUrl}`);
        
        const mediaResponse = await fetch(mediaUrl);
        
        if (mediaResponse.ok) {
          const mediaItems = await mediaResponse.json();
          console.log(`Found ${mediaItems.length} media items`);
          
          for (const media of mediaItems) {
            if (media.mime_type?.startsWith('image/') && media.source_url) {
              if (!images.some(img => img.url === media.source_url)) {
                images.push({
                  id: `wp_media_${website.id}_${media.id}`,
                  url: media.source_url,
                  contentId: `media_${media.id}`,
                  contentTitle: stripHtml(media.title?.rendered) || 'Media Library',
                  websiteId: website.id,
                  websiteName: website.name,
                  hasMetadata: !!(media.alt_text || media.caption?.rendered),
                  metadataDetails: {
                    mediaId: media.id,
                    altText: media.alt_text || '',
                    caption: media.caption?.rendered || ''
                  },
                  size: media.media_details?.filesize || 0,
                  createdAt: media.date,
                  isAIGenerated: false,
                  processedAt: media.modified,
                  costCents: 0,
                  source: 'wordpress_media'
                });
              }
            }
          }
        }
      } catch (error: any) {
        console.error(`Error fetching media:`, error.message);
      }
    }
    
    // Step 4: Get content from database (using correct table name)
    try {
      let contentQuery = db('content')  // Using 'content' table, not 'ai_content'
        .select('*');
      
      if (websiteId && websiteId !== 'undefined') {
        contentQuery = contentQuery.where('websiteId', websiteId);  // Note: camelCase field name
      }
      
      const contentItems = await contentQuery;
      console.log(`Found ${contentItems.length} content items in database`);
      
      for (const content of contentItems) {
        if (content.body) {
          // Extract images from HTML body
          const imgMatches = content.body.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi) || [];
          
          for (const imgTag of imgMatches) {
            const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
            if (srcMatch && srcMatch[1]) {
              const url = srcMatch[1];
              
              if (!url.startsWith('data:') && !images.some(img => img.url === url)) {
                const altMatch = imgTag.match(/alt=["']([^"']*?)["']/i);
                
                images.push({
                  id: `content_${content.id}_${images.length}`,
                  url: url,
                  contentId: content.id,
                  contentTitle: content.title || 'Content',
                  websiteId: content.websiteId,
                  websiteName: websites.find(w => w.id === content.websiteId)?.name || 'Unknown',
                  hasMetadata: !!altMatch,
                  metadataDetails: {
                    altText: altMatch ? altMatch[1] : '',
                    wordpressPostId: content.wordpressPostId,
                    status: content.status
                  },
                  size: 0,
                  createdAt: content.createdAt,
                  isAIGenerated: true,
                  processedAt: content.updatedAt,
                  costCents: content.costUsd || 0,
                  source: 'database_content'
                });
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error fetching content from database:', error.message);
    }
    
    console.log(`\nTotal images found: ${images.length}`);
    console.log(`- WordPress posts: ${images.filter(i => i.source === 'wordpress_post').length}`);
    console.log(`- Media Library: ${images.filter(i => i.source === 'wordpress_media').length}`);
    console.log(`- Database content: ${images.filter(i => i.source === 'database_content').length}`);
    
    res.json(images);
    
  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({
      error: 'Failed to fetch images',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Helper function to strip HTML
function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

// Register the route in your Express app
// In your main server file (app.ts or index.ts), add:
// app.get('/api/images/content-images', getContentImages);

















// // server/api/images/content-images.ts
// import { db } from '@/lib/db';
// import { NextApiRequest, NextApiResponse } from 'next';

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse
// ) {
//   if (req.method !== 'GET') {
//     return res.status(405).json({ error: 'Method not allowed' });
//   }

//   try {
//     const { websiteId } = req.query;
    
//     console.log('Fetching content images for website:', websiteId || 'all');
    
//     // Build query
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
//         'image_cost_cents'
//       )
//       .whereNotNull('images')
//       .where('has_images', true)
//       .orderBy('created_at', 'desc');
    
//     if (websiteId) {
//       query.where('website_id', websiteId);
//     }
    
//     const contentItems = await query;
    
//     console.log(`Found ${contentItems.length} content items with images`);
    
//     // Transform content items to image format for the metadata component
//     const images = [];
    
//     for (const content of contentItems) {
//       let contentImages;
      
//       // Parse images data safely
//       try {
//         if (typeof content.images === 'string') {
//           contentImages = JSON.parse(content.images);
//         } else {
//           contentImages = content.images;
//         }
//       } catch (error) {
//         console.error(`Failed to parse images for content ${content.id}:`, error);
//         continue;
//       }
      
//       // Process each image in the content
//       if (Array.isArray(contentImages)) {
//         contentImages.forEach((img, index) => {
//           // Create a unique ID for each image
//           const imageId = `${content.id}_${index}`;
          
//           // Determine if image has metadata
//           const hasMetadata = !!(
//             img.metadataProcessed || 
//             img.metadata || 
//             content.metadata_processed
//           );
          
//           // Extract metadata details if available
//           const metadataDetails = img.metadata || {};
//           if (img.copyright) metadataDetails.copyright = img.copyright;
//           if (img.author) metadataDetails.author = img.author;
//           if (img.aiModel) metadataDetails.aiModel = img.aiModel;
//           if (img.aiProvider) metadataDetails.aiProvider = img.aiProvider;
          
//           // Calculate size
//           let imageSize = 0;
//           if (img.processedSize) {
//             imageSize = img.processedSize;
//           } else if (img.size) {
//             imageSize = img.size;
//           } else if (img.data) {
//             // Estimate size from base64 string
//             imageSize = Math.round((img.data.length * 3) / 4);
//           }
          
//           images.push({
//             id: imageId,
//             url: img.url || '',
//             data: img.data || null,
//             contentId: content.id,
//             contentTitle: content.title || 'Untitled',
//             websiteId: content.website_id,
//             websiteName: content.website_name || 'Unknown',
//             hasMetadata: hasMetadata,
//             metadataDetails: metadataDetails,
//             size: imageSize,
//             createdAt: content.created_at,
//             isAIGenerated: true, // All DALL-E images are AI-generated
//             processedAt: img.processedAt || null,
//             costCents: img.costCents || 4, // Default DALL-E cost
//           });
//         });
//       }
//     }
    
//     console.log(`Returning ${images.length} total images`);
    
//     return res.status(200).json(images);
//   } catch (error) {
//     console.error('Error fetching content images:', error);
//     return res.status(500).json({ 
//       error: 'Failed to fetch images',
//       message: error.message,
//       details: process.env.NODE_ENV === 'development' ? error.stack : undefined
//     });
//   }
// }