// server/services/wordpress-image-updater.ts
// Module for updating WordPress images with processed versions

import FormData from 'form-data';
import sharp from 'sharp';

export class WordPressImageUpdater {
  /**
   * Update a WordPress media item with processed image
   */
  async updateWordPressMedia(
    website: any,
    mediaId: string,
    processedBuffer: Buffer,
    options: any
  ): Promise<string> {
    const baseUrl = website.url.replace(/\/$/, '');
    const updateUrl = `${baseUrl}/wp-json/wp/v2/media/${mediaId}`;
    
    // Prepare authentication
    const username = website.wpUsername || website.wpApplicationName || 'admin';
    const password = website.wpApplicationPassword; // Already plain text
    const authString = `${username}:${password}`;
    const authHeader = `Basic ${Buffer.from(authString).toString('base64')}`;
    
    try {
      // First, get the current media item to preserve its data
      const getResponse = await fetch(updateUrl, {
        headers: {
          'Authorization': authHeader
        }
      });
      
      if (!getResponse.ok) {
        throw new Error(`Failed to fetch media item: ${getResponse.statusText}`);
      }
      
      const mediaItem = await getResponse.json();
      
      // Create form data for update
      const form = new FormData();
      
      // Add the processed image
      form.append('file', processedBuffer, {
        filename: mediaItem.slug + '_processed.jpg',
        contentType: 'image/jpeg'
      });
      
      // Update metadata fields if not stripping
      if (options.action !== 'strip') {
        const updates: any = {
          alt_text: mediaItem.alt_text || ''
        };
        
        if (options.copyright) {
          updates.caption = options.copyright;
        }
        
        if (options.author) {
          updates.description = `Processed by ${options.author}`;
        }
        
        // Add each field to form data
        Object.keys(updates).forEach(key => {
          form.append(key, updates[key]);
        });
      }
      
      // Send update request
      const updateResponse = await fetch(updateUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          ...form.getHeaders()
        },
        body: form
      });
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Failed to update media: ${errorText}`);
      }
      
      const result = await updateResponse.json();
      return result.source_url || result.guid?.rendered;
      
    } catch (error: any) {
      console.error('WordPress update error:', error);
      throw error;
    }
  }
  
  /**
   * Create a metadata record in the database
   */
  async recordMetadataUpdate(
    db: any,
    imageId: string,
    websiteId: string,
    options: any,
    success: boolean,
    error?: string
  ): Promise<void> {
    try {
      // Check if we have a metadata tracking table
      const tableExists = await db.schema.hasTable('image_metadata_status');
      
      if (!tableExists) {
        // Create the table if it doesn't exist
        await db.schema.createTable('image_metadata_status', (table: any) => {
          table.increments('id').primary();
          table.string('image_id').unique();
          table.string('website_id');
          table.boolean('has_metadata').defaultTo(false);
          table.string('copyright');
          table.string('author');
          table.string('action');
          table.boolean('processed').defaultTo(false);
          table.text('error');
          table.timestamp('processed_at');
          table.timestamps(true, true);
        });
      }
      
      // Insert or update the record
      await db('image_metadata_status')
        .insert({
          image_id: imageId,
          website_id: websiteId,
          has_metadata: options.action !== 'strip',
          copyright: options.copyright || null,
          author: options.author || null,
          action: options.action,
          processed: success,
          error: error || null,
          processed_at: new Date()
        })
        .onConflict('image_id')
        .merge();
        
    } catch (err) {
      console.error('Failed to record metadata update:', err);
      // Non-critical error, don't throw
    }
  }
  
  /**
   * Get processing status for images
   */
  async getProcessingStatus(db: any, websiteId?: string): Promise<any[]> {
    try {
      let query = db('image_metadata_status')
        .select('*')
        .orderBy('processed_at', 'desc');
      
      if (websiteId) {
        query = query.where('website_id', websiteId);
      }
      
      return await query;
    } catch (error) {
      console.error('Failed to get processing status:', error);
      return [];
    }
  }
}

export const wpImageUpdater = new WordPressImageUpdater();