// server/services/wordpress-fix-service.ts
import { wordPressAuthService } from "./wordpress-auth";

export interface WordPressCredentials {
  url: string;
  username: string;
  applicationPassword: string;
}

export class WordPressFixService {
  private async makeWPRequest(
    credentials: WordPressCredentials,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ) {
    const auth = Buffer.from(`${credentials.username}:${credentials.applicationPassword}`).toString('base64');
    const url = `${credentials.url.replace(/\/$/, '')}/wp-json/wp/v2${endpoint}`;

    console.log(`🔗 WordPress API Request: ${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'User-Agent': 'AI-SEO-Fix-Bot/1.0'
      },
      body: data ? JSON.stringify(data) : undefined
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WordPress API Error: ${response.status} ${error}`);
    }

    return response.json();
  }

  async fixImageAltText(credentials: WordPressCredentials): Promise<{
    success: boolean;
    fixed: number;
    errors: string[];
  }> {
    try {
      console.log('🖼️ Starting image alt text fixes...');

      // Get all media items without alt text
      const mediaItems = await this.makeWPRequest(
        credentials,
        '/media?per_page=100&media_type=image'
      );

      const imagesWithoutAlt = mediaItems.filter((item: any) => 
        !item.alt_text || item.alt_text.trim() === ''
      );

      console.log(`Found ${imagesWithoutAlt.length} images without alt text`);

      let fixed = 0;
      const errors: string[] = [];

      for (const image of imagesWithoutAlt) {
        try {
          // Generate alt text using AI based on filename and context
          const altText = await this.generateAltText(image);
          
          // Update the image with new alt text
          await this.makeWPRequest(
            credentials,
            `/media/${image.id}`,
            'PUT',
            { alt_text: altText }
          );

          console.log(`✅ Updated alt text for image ${image.id}: "${altText}"`);
          fixed++;
        } catch (error) {
          const errorMsg = `Failed to update image ${image.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      return {
        success: fixed > 0,
        fixed,
        errors
      };

    } catch (error) {
      console.error('Image alt text fix failed:', error);
      return {
        success: false,
        fixed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async fixMetaDescriptions(credentials: WordPressCredentials): Promise<{
    success: boolean;
    fixed: number;
    errors: string[];
  }> {
    try {
      console.log('📝 Starting meta description fixes...');

      // Get all posts and pages
      const [posts, pages] = await Promise.all([
        this.makeWPRequest(credentials, '/posts?per_page=50'),
        this.makeWPRequest(credentials, '/pages?per_page=50')
      ]);

      const allContent = [...posts, ...pages];
      let fixed = 0;
      const errors: string[] = [];

      for (const content of allContent) {
        try {
          // Check if meta description exists (Yoast SEO format)
          const currentMeta = content.yoast_head_json?.og_description || 
                             content.meta?.description || 
                             content.excerpt?.rendered;

          if (!currentMeta || currentMeta.length < 120) {
            // Generate optimized meta description
            const metaDescription = await this.generateMetaDescription(content);
            
            // Update via Yoast SEO if available, otherwise use custom meta
            const updateData = await this.updateMetaDescription(credentials, content.id, metaDescription);
            
            console.log(`✅ Updated meta description for ${content.type} ${content.id}`);
            fixed++;
          }
        } catch (error) {
          const errorMsg = `Failed to update meta for ${content.type} ${content.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      return {
        success: fixed > 0,
        fixed,
        errors
      };

    } catch (error) {
      console.error('Meta description fix failed:', error);
      return {
        success: false,
        fixed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async fixTitleTags(credentials: WordPressCredentials): Promise<{
    success: boolean;
    fixed: number;
    errors: string[];
  }> {
    try {
      console.log('📄 Starting title tag optimization...');

      const [posts, pages] = await Promise.all([
        this.makeWPRequest(credentials, '/posts?per_page=50'),
        this.makeWPRequest(credentials, '/pages?per_page=50')
      ]);

      const allContent = [...posts, ...pages];
      let fixed = 0;
      const errors: string[] = [];

      for (const content of allContent) {
        try {
          const currentTitle = content.title?.rendered || '';
          
          // Check if title needs optimization (too short, too long, not SEO-friendly)
          if (this.needsTitleOptimization(currentTitle)) {
            const optimizedTitle = await this.generateOptimizedTitle(content);
            
            await this.makeWPRequest(
              credentials,
              `/${content.type}s/${content.id}`,
              'PUT',
              { title: optimizedTitle }
            );

            console.log(`✅ Optimized title for ${content.type} ${content.id}: "${optimizedTitle}"`);
            fixed++;
          }
        } catch (error) {
          const errorMsg = `Failed to update title for ${content.type} ${content.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      return {
        success: fixed > 0,
        fixed,
        errors
      };

    } catch (error) {
      console.error('Title tag fix failed:', error);
      return {
        success: false,
        fixed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async fixHeadingStructure(credentials: WordPressCredentials): Promise<{
    success: boolean;
    fixed: number;
    errors: string[];
  }> {
    try {
      console.log('📚 Starting heading structure fixes...');

      const [posts, pages] = await Promise.all([
        this.makeWPRequest(credentials, '/posts?per_page=50'),
        this.makeWPRequest(credentials, '/pages?per_page=50')
      ]);

      const allContent = [...posts, ...pages];
      let fixed = 0;
      const errors: string[] = [];

      for (const content of allContent) {
        try {
          const currentContent = content.content?.rendered || '';
          
          // Analyze and fix heading structure
          const fixedContent = await this.fixContentHeadings(currentContent);
          
          if (fixedContent !== currentContent) {
            await this.makeWPRequest(
              credentials,
              `/${content.type}s/${content.id}`,
              'PUT',
              { content: fixedContent }
            );

            console.log(`✅ Fixed heading structure for ${content.type} ${content.id}`);
            fixed++;
          }
        } catch (error) {
          const errorMsg = `Failed to fix headings for ${content.type} ${content.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      return {
        success: fixed > 0,
        fixed,
        errors
      };

    } catch (error) {
      console.error('Heading structure fix failed:', error);
      return {
        success: false,
        fixed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Helper methods

  private async generateAltText(image: any): Promise<string> {
    // Use AI to generate appropriate alt text based on filename and context
    const filename = image.source_url.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';
    const title = image.title?.rendered || '';
    
    // Simple rule-based alt text generation (could be enhanced with AI vision)
    if (title && title !== filename) {
      return title.substring(0, 125); // Alt text should be concise
    }
    
    // Convert filename to readable alt text
    const readable = filename
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .substring(0, 125);
      
    return readable || 'Image';
  }

  private async generateMetaDescription(content: any): Promise<string> {
    const title = content.title?.rendered || '';
    const excerpt = content.excerpt?.rendered?.replace(/<[^>]*>/g, '') || '';
    const contentText = content.content?.rendered?.replace(/<[^>]*>/g, '').substring(0, 300) || '';
    
    // Create meta description from content
    let metaDesc = excerpt || contentText;
    
    // Ensure proper length (120-160 characters)
    if (metaDesc.length > 160) {
      metaDesc = metaDesc.substring(0, 157) + '...';
    } else if (metaDesc.length < 120) {
      // Pad with title if needed
      const padding = ` | ${title}`;
      if ((metaDesc + padding).length <= 160) {
        metaDesc += padding;
      }
    }
    
    return metaDesc;
  }

  private async updateMetaDescription(credentials: WordPressCredentials, postId: number, metaDescription: string): Promise<void> {
    try {
      // Try to update via Yoast SEO API first
      await this.makeWPRequest(
        credentials,
        `/yoast/v1/meta/${postId}`,
        'PUT',
        { meta_description: metaDescription }
      );
    } catch (yoastError) {
      // Fall back to custom meta field
      await this.makeWPRequest(
        credentials,
        `/posts/${postId}/meta`,
        'POST',
        {
          key: '_yoast_wpseo_metadesc',
          value: metaDescription
        }
      );
    }
  }

  private async generateOptimizedTitle(content: any): Promise<string> {
    const currentTitle = content.title?.rendered || '';
    const contentText = content.content?.rendered?.replace(/<[^>]*>/g, '').substring(0, 200) || '';
    
    // Basic title optimization rules
    let optimizedTitle = currentTitle;
    
    // Ensure title is not too long (under 60 characters)
    if (optimizedTitle.length > 60) {
      optimizedTitle = optimizedTitle.substring(0, 57) + '...';
    }
    
    // Ensure title is not too short (over 30 characters)
    if (optimizedTitle.length < 30 && contentText) {
      const words = contentText.split(' ').slice(0, 8).join(' ');
      optimizedTitle = `${optimizedTitle} - ${words}`.substring(0, 60);
    }
    
    return optimizedTitle;
  }

  private needsTitleOptimization(title: string): boolean {
    return title.length < 30 || title.length > 60 || 
           title.toLowerCase() === title || 
           !title.includes(' ');
  }

  private async fixContentHeadings(htmlContent: string): Promise<string> {
    // Parse HTML and fix heading hierarchy
    // This is a simplified version - in production, use a proper HTML parser
    
    let fixed = htmlContent;
    
    // Ensure there's only one H1
    const h1Matches = fixed.match(/<h1[^>]*>/gi);
    if (h1Matches && h1Matches.length > 1) {
      // Convert extra H1s to H2s
      let h1Count = 0;
      fixed = fixed.replace(/<h1([^>]*)>/gi, (match, attrs) => {
        h1Count++;
        return h1Count === 1 ? match : `<h2${attrs}>`;
      });
      fixed = fixed.replace(/<\/h1>/gi, (match, offset, string) => {
        // Count H1 tags before this closing tag
        const beforeThis = string.substring(0, offset);
        const h1Opens = (beforeThis.match(/<h1[^>]*>/gi) || []).length;
        const h1Closes = (beforeThis.match(/<\/h1>/gi) || []).length;
        return h1Opens > 1 && h1Closes >= 0 ? '</h2>' : match;
      });
    }
    
    return fixed;
  }
}

export const wordPressFixService = new WordPressFixService();

// Update your ai-fix-service.ts to use this:
// Replace the placeholder methods with calls to wordPressFixService methods