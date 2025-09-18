// server/api/images/crawl.ts
// Web crawler endpoint for discovering and fetching images from websites

import { Request, Response } from 'express';
import { JSDOM } from 'jsdom';
import sharp from 'sharp';
import { URL } from 'url';

interface CrawlOptions {
  maxDepth: number;
  maxImages: number;
  followExternal: boolean;
  includeSubdomains: boolean;
  imageTypes: string[];
  minWidth?: number;
  minHeight?: number;
  excludePatterns?: string[];
}

interface CrawledImage {
  url: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  size?: number;
  pageUrl: string;
  pageTitle?: string;
  depth: number;
}

class WebImageCrawler {
  private visitedUrls = new Set<string>();
  private visitedImages = new Set<string>();
  private crawledImages: CrawledImage[] = [];
  private baseUrl: URL;
  private options: CrawlOptions;
  
  constructor(startUrl: string, options: CrawlOptions) {
    this.baseUrl = new URL(startUrl);
    this.options = options;
  }
  
  async crawl(): Promise<CrawledImage[]> {
    await this.crawlPage(this.baseUrl.href, 0);
    return this.crawledImages;
  }
  
  private async crawlPage(url: string, depth: number): Promise<void> {
    // Check limits
    if (depth > this.options.maxDepth) return;
    if (this.crawledImages.length >= this.options.maxImages) return;
    if (this.visitedUrls.has(url)) return;
    
    this.visitedUrls.add(url);
    
    try {
      console.log(`Crawling: ${url} (depth: ${depth})`);
      
      // Fetch the page
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ImageCrawler/1.0)',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
      
      if (!response.ok) {
        console.log(`Failed to fetch ${url}: ${response.status}`);
        return;
      }
      
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        console.log(`Skipping non-HTML content: ${url}`);
        return;
      }
      
      const html = await response.text();
      const dom = new JSDOM(html, { url });
      const document = dom.window.document;
      
      // Get page title
      const pageTitle = document.querySelector('title')?.textContent || '';
      
      // Extract images
      const images = document.querySelectorAll('img');
      for (const img of images) {
        if (this.crawledImages.length >= this.options.maxImages) break;
        
        const imgUrl = this.resolveUrl(img.src, url);
        if (!imgUrl || this.visitedImages.has(imgUrl)) continue;
        
        // Check if image matches our criteria
        if (this.shouldIncludeImage(imgUrl, img)) {
          this.visitedImages.add(imgUrl);
          
          // Try to get image dimensions
          let width = parseInt(img.getAttribute('width') || '0');
          let height = parseInt(img.getAttribute('height') || '0');
          let size = 0;
          
          // If dimensions not in HTML, try to fetch image metadata
          if (!width || !height) {
            try {
              const imgMeta = await this.getImageMetadata(imgUrl);
              width = imgMeta.width || width;
              height = imgMeta.height || height;
              size = imgMeta.size || 0;
            } catch (e) {
              console.log(`Could not get metadata for ${imgUrl}`);
            }
          }
          
          // Check minimum dimensions
          if (this.options.minWidth && width < this.options.minWidth) continue;
          if (this.options.minHeight && height < this.options.minHeight) continue;
          
          this.crawledImages.push({
            url: imgUrl,
            alt: img.alt || undefined,
            title: img.title || undefined,
            width,
            height,
            size,
            pageUrl: url,
            pageTitle,
            depth,
          });
          
          console.log(`  Found image: ${imgUrl} (${width}x${height})`);
        }
      }
      
      // Extract links for further crawling
      if (depth < this.options.maxDepth) {
        const links = document.querySelectorAll('a[href]');
        const uniqueLinks = new Set<string>();
        
        for (const link of links) {
          const href = link.getAttribute('href');
          if (!href) continue;
          
          const linkUrl = this.resolveUrl(href, url);
          if (linkUrl && this.shouldFollowLink(linkUrl)) {
            uniqueLinks.add(linkUrl);
          }
        }
        
        // Crawl discovered links
        for (const linkUrl of uniqueLinks) {
          if (this.crawledImages.length >= this.options.maxImages) break;
          await this.crawlPage(linkUrl, depth + 1);
        }
      }
      
    } catch (error: any) {
      console.error(`Error crawling ${url}:`, error.message);
    }
  }
  
  private resolveUrl(relativeUrl: string, baseUrl: string): string | null {
    try {
      if (!relativeUrl || relativeUrl.startsWith('data:')) return null;
      return new URL(relativeUrl, baseUrl).href;
    } catch {
      return null;
    }
  }
  
  private shouldIncludeImage(url: string, img: HTMLImageElement): boolean {
    // Check exclude patterns
    if (this.options.excludePatterns) {
      for (const pattern of this.options.excludePatterns) {
        if (url.toLowerCase().includes(pattern.toLowerCase())) {
          return false;
        }
      }
    }
    
    // Check file extension
    const extension = url.split('.').pop()?.toLowerCase() || '';
    if (this.options.imageTypes.length > 0) {
      if (!this.options.imageTypes.includes(extension)) {
        // Also check if URL might be an image without extension
        if (!url.includes('/api/') && !url.includes('/image/')) {
          return false;
        }
      }
    }
    
    // Skip tiny images (likely icons)
    const width = parseInt(img.getAttribute('width') || '0');
    const height = parseInt(img.getAttribute('height') || '0');
    if (width > 0 && width < 50) return false;
    if (height > 0 && height < 50) return false;
    
    return true;
  }
  
  private shouldFollowLink(url: string): boolean {
    try {
      const linkUrl = new URL(url);
      
      // Check if we should follow external links
      if (!this.options.followExternal) {
        if (linkUrl.hostname !== this.baseUrl.hostname) {
          // Check subdomains
          if (this.options.includeSubdomains) {
            const baseDomain = this.baseUrl.hostname.split('.').slice(-2).join('.');
            const linkDomain = linkUrl.hostname.split('.').slice(-2).join('.');
            if (baseDomain !== linkDomain) return false;
          } else {
            return false;
          }
        }
      }
      
      // Skip non-HTTP(S) protocols
      if (!['http:', 'https:'].includes(linkUrl.protocol)) {
        return false;
      }
      
      // Skip common non-content URLs
      const skipPatterns = [
        '/login', '/signin', '/signup', '/register',
        '/api/', '/feed/', '.pdf', '.zip', '.doc',
        'mailto:', 'javascript:', '#'
      ];
      
      for (const pattern of skipPatterns) {
        if (url.includes(pattern)) return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }
  
  private async getImageMetadata(url: string): Promise<{ width?: number; height?: number; size?: number }> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      
      if (!response.ok) throw new Error('Failed to fetch');
      
      const size = parseInt(response.headers.get('content-length') || '0');
      
      // For actual dimensions, we'd need to download the image
      // This is expensive, so only do it for promising images
      if (size > 10000) { // Only for images > 10KB
        const imgResponse = await fetch(url, {
          signal: AbortSignal.timeout(10000),
        });
        
        const buffer = Buffer.from(await imgResponse.arrayBuffer());
        const metadata = await sharp(buffer).metadata();
        
        return {
          width: metadata.width,
          height: metadata.height,
          size: buffer.length,
        };
      }
      
      return { size };
    } catch {
      return {};
    }
  }
}

// Main crawl endpoint
export const crawlWebsite = async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, options } = req.body;
    
    console.log(`🕷️ Starting web crawl for: ${url}`);
    
    // Validate URL
    let validUrl: URL;
    try {
      validUrl = new URL(url);
      if (!['http:', 'https:'].includes(validUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      res.status(400).json({
        error: 'Invalid URL',
        message: 'Please provide a valid HTTP(S) URL',
      });
      return;
    }
    
    // Set default options
    const crawlOptions: CrawlOptions = {
      maxDepth: options?.maxDepth || 2,
      maxImages: options?.maxImages || 50,
      followExternal: options?.followExternal || false,
      includeSubdomains: options?.includeSubdomains || true,
      imageTypes: options?.imageTypes || ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      minWidth: options?.minWidth || 200,
      minHeight: options?.minHeight || 200,
      excludePatterns: options?.excludePatterns || ['thumbnail', 'icon', 'logo', 'avatar'],
    };
    
    // Create crawler and start crawling
    const crawler = new WebImageCrawler(url, crawlOptions);
    const images = await crawler.crawl();
    
    console.log(`✅ Crawl complete: Found ${images.length} images`);
    
    // Transform to match frontend format
    const transformedImages = images.map((img, index) => ({
      id: `crawled_${Date.now()}_${index}`,
      url: img.url,
      contentId: `crawl_${index}`,
      contentTitle: img.pageTitle || `Page: ${new URL(img.pageUrl).pathname}`,
      websiteId: 'crawled',
      websiteName: validUrl.hostname,
      hasMetadata: false,
      metadataDetails: {
        alt: img.alt,
        title: img.title,
        width: img.width,
        height: img.height,
      },
      size: img.size || 0,
      createdAt: new Date().toISOString(),
      isAIGenerated: false,
      isCrawled: true,
      source: img.pageUrl,
    }));
    
    res.json({
      success: true,
      images: transformedImages,
      stats: {
        totalImages: images.length,
        pagesVisited: crawler['visitedUrls'].size,
        maxDepthReached: Math.max(...images.map(i => i.depth)),
      },
    });
    
  } catch (error: any) {
    console.error('Crawl error:', error);
    res.status(500).json({
      error: 'Crawl failed',
      message: error.message,
    });
  }
};