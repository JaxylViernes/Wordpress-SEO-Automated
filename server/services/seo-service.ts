// // export interface SEOAnalysisResult {
// //   score: number;
// //   issues: SEOIssue[];
// //   recommendations: SEORecommendation[];
// //   pageSpeedScore?: number;
// // }

// // export interface SEOIssue {
// //   type: "critical" | "warning" | "info";
// //   title: string;
// //   description: string;
// //   affectedPages: number;
// //   autoFixAvailable: boolean;
// // }

// // export interface SEORecommendation {
// //   priority: "high" | "medium" | "low";
// //   title: string;
// //   description: string;
// //   impact: string;
// // }

// // export class SEOService {
// //   async analyzeWebsite(url: string): Promise<SEOAnalysisResult> {
// //     try {
// //       // Simulate API call to Google PageSpeed Insights or similar service
// //       const pageSpeedScore = await this.getPageSpeedScore(url);
// //       const technicalAnalysis = await this.performTechnicalAnalysis(url);
      
// //       const issues = this.generateIssues(url);
// //       const recommendations = this.generateRecommendations(issues);
// //       const score = this.calculateOverallScore(issues, pageSpeedScore);

// //       return {
// //         score,
// //         issues,
// //         recommendations,
// //         pageSpeedScore
// //       };
// //     } catch (error) {
// //       console.error("SEO analysis failed:", error);
// //       throw new Error("Failed to analyze website SEO. Please check the URL and try again.");
// //     }
// //   }

// //   private async getPageSpeedScore(url: string): Promise<number> {
// //     // In a real implementation, this would call Google PageSpeed Insights API
// //     // For now, simulate a score based on URL characteristics
// //     const baseScore = 75;
// //     const randomVariation = Math.random() * 20 - 10; // +/- 10 points
// //     return Math.max(20, Math.min(100, Math.round(baseScore + randomVariation)));
// //   }

// //   private async performTechnicalAnalysis(url: string): Promise<any> {
// //     // In a real implementation, this would crawl the website and analyze:
// //     // - Meta tags
// //     // - Heading structure
// //     // - Image alt texts
// //     // - Internal linking
// //     // - Schema markup
// //     // - Page load speed
// //     // - Mobile responsiveness
    
// //     return {
// //       metaTags: this.analyzeMetaTags(url),
// //       headings: this.analyzeHeadings(url),
// //       images: this.analyzeImages(url),
// //       links: this.analyzeLinks(url)
// //     };
// //   }

// //   private analyzeMetaTags(url: string): any {
// //     // Simulate meta tag analysis
// //     return {
// //       missingDescriptions: Math.floor(Math.random() * 10),
// //       duplicateTitles: Math.floor(Math.random() * 5),
// //       longTitles: Math.floor(Math.random() * 3)
// //     };
// //   }

// //   private analyzeHeadings(url: string): any {
// //     return {
// //       missingH1: Math.floor(Math.random() * 2),
// //       multipleH1: Math.floor(Math.random() * 3),
// //       improperHierarchy: Math.floor(Math.random() * 5)
// //     };
// //   }

// //   private analyzeImages(url: string): any {
// //     return {
// //       missingAltText: Math.floor(Math.random() * 15),
// //       largeSizes: Math.floor(Math.random() * 8),
// //       unoptimizedFormats: Math.floor(Math.random() * 12)
// //     };
// //   }

// //   private analyzeLinks(url: string): any {
// //     return {
// //       brokenLinks: Math.floor(Math.random() * 3),
// //       missingInternalLinks: Math.floor(Math.random() * 10),
// //       poorAnchorText: Math.floor(Math.random() * 7)
// //     };
// //   }

// //   private generateIssues(url: string): SEOIssue[] {
// //     const issues: SEOIssue[] = [];
    
// //     // Generate realistic issues based on common SEO problems
// //     const possibleIssues = [
// //       {
// //         type: "critical" as const,
// //         title: "Missing Meta Descriptions",
// //         description: "Several pages are missing meta descriptions, which are important for search engine results.",
// //         affectedPages: Math.floor(Math.random() * 10) + 1,
// //         autoFixAvailable: true
// //       },
// //       {
// //         type: "warning" as const,
// //         title: "Slow Page Load Speed",
// //         description: "Page load times are above recommended thresholds, affecting user experience and rankings.",
// //         affectedPages: Math.floor(Math.random() * 5) + 1,
// //         autoFixAvailable: false
// //       },
// //       {
// //         type: "warning" as const,
// //         title: "Missing Alt Text on Images",
// //         description: "Images without alt text reduce accessibility and SEO effectiveness.",
// //         affectedPages: Math.floor(Math.random() * 8) + 1,
// //         autoFixAvailable: true
// //       },
// //       {
// //         type: "info" as const,
// //         title: "Optimize Internal Linking",
// //         description: "Adding more internal links could improve page authority distribution.",
// //         affectedPages: Math.floor(Math.random() * 15) + 5,
// //         autoFixAvailable: false
// //       }
// //     ];

// //     // Randomly select 2-4 issues
// //     const numberOfIssues = Math.floor(Math.random() * 3) + 2;
// //     const selectedIssues = possibleIssues
// //       .sort(() => Math.random() - 0.5)
// //       .slice(0, numberOfIssues);

// //     return selectedIssues;
// //   }

// //   private generateRecommendations(issues: SEOIssue[]): SEORecommendation[] {
// //     const recommendations: SEORecommendation[] = [
// //       {
// //         priority: "high",
// //         title: "Implement Schema Markup",
// //         description: "Add structured data to help search engines understand your content better.",
// //         impact: "Improved rich snippets and search visibility"
// //       },
// //       {
// //         priority: "medium",
// //         title: "Optimize for Core Web Vitals",
// //         description: "Focus on Largest Contentful Paint, First Input Delay, and Cumulative Layout Shift.",
// //         impact: "Better user experience and search rankings"
// //       },
// //       {
// //         priority: "medium",
// //         title: "Improve Content Freshness",
// //         description: "Regularly update existing content and publish new, relevant articles.",
// //         impact: "Increased organic traffic and user engagement"
// //       }
// //     ];

// //     // Add specific recommendations based on detected issues
// //     issues.forEach(issue => {
// //       if (issue.title.includes("Meta Descriptions")) {
// //         recommendations.unshift({
// //           priority: "high",
// //           title: "Fix Missing Meta Descriptions",
// //           description: "Add unique, compelling meta descriptions to all pages.",
// //           impact: "Improved click-through rates from search results"
// //         });
// //       }
// //     });

// //     return recommendations;
// //   }

// //   private calculateOverallScore(issues: SEOIssue[], pageSpeedScore: number): number {
// //     let baseScore = 90;
    
// //     issues.forEach(issue => {
// //       switch (issue.type) {
// //         case "critical":
// //           baseScore -= 15;
// //           break;
// //         case "warning":
// //           baseScore -= 8;
// //           break;
// //         case "info":
// //           baseScore -= 3;
// //           break;
// //       }
// //     });

// //     // Factor in page speed (30% weight)
// //     const speedImpact = (pageSpeedScore - 75) * 0.3;
// //     baseScore += speedImpact;

// //     return Math.max(0, Math.min(100, Math.round(baseScore)));
// //   }

// //   async performAutoFix(websiteId: string, issueType: string): Promise<{ success: boolean; message: string }> {
// //     try {
// //       // In a real implementation, this would:
// //       // 1. Connect to WordPress via REST API or XML-RPC
// //       // 2. Identify pages with the specific issue
// //       // 3. Apply automated fixes (e.g., generate meta descriptions)
// //       // 4. Update the website content
      
// //       await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time
      
// //       return {
// //         success: true,
// //         message: `Successfully applied auto-fix for ${issueType}. Changes have been made to your WordPress site.`
// //       };
// //     } catch (error) {
// //       console.error("Auto-fix failed:", error);
// //       return {
// //         success: false,
// //         message: "Auto-fix failed. Please check your WordPress connection and try again."
// //       };
// //     }
// //   }
// // }

// // export const seoService = new SEOService();



// import axios from 'axios';
// import * as cheerio from 'cheerio';
// import OpenAI from 'openai';
// import Anthropic from '@anthropic-ai/sdk';

// export interface EnhancedSEOAnalysisResult {
//   score: number;
//   issues: SEOIssue[];
//   recommendations: SEORecommendation[];
//   pageSpeedScore?: number;
//   technicalDetails: TechnicalSEODetails;
//   contentAnalysis: ContentAnalysisResult;
//   competitiveAnalysis?: CompetitiveAnalysisResult;
// }

// export interface ContentAnalysisResult {
//   qualityScore: number;
//   readabilityScore: number;
//   keywordOptimization: KeywordOptimizationResult;
//   eatScore: EATScore;
//   contentGaps: string[];
//   semanticKeywords: string[];
//   contentStructureScore: number;
//   uniquenessScore: number;
//   userIntentAlignment: number;
// }

// export interface KeywordOptimizationResult {
//   primaryKeywordDensity: number;
//   keywordDistribution: 'poor' | 'good' | 'excellent';
//   missingKeywords: string[];
//   keywordCannibalization: boolean;
//   lsiKeywords: string[];
// }

// export interface EATScore {
//   expertise: number;
//   authoritativeness: number;
//   trustworthiness: number;
//   overall: number;
// }

// export interface CompetitiveAnalysisResult {
//   competitorUrls: string[];
//   contentGapOpportunities: string[];
//   strengthsVsCompetitors: string[];
//   improvementOpportunities: string[];
// }

// export interface TechnicalSEODetails {
//   metaTags: {
//     hasTitle: boolean;
//     titleLength: number;
//     hasDescription: boolean;
//     descriptionLength: number;
//     hasKeywords: boolean;
//     hasOgTags?: boolean;
//     hasTwitterCards?: boolean;
//   };
//   headings: {
//     h1Count: number;
//     h2Count: number;
//     h3Count: number;
//     hasProperHierarchy: boolean;
//   };
//   images: {
//     total: number;
//     withoutAlt: number;
//     withoutTitle: number;
//   };
//   links: {
//     internal: number;
//     external: number;
//     broken: number;
//   };
//   performance: {
//     loadTime?: number;
//     pageSize?: number;
//   };
//   mobile: {
//     responsive: boolean;
//     viewportMeta: boolean;
//   };
//   schema?: {
//     hasStructuredData: boolean;
//   };
// }

// export interface SEOIssue {
//   type: "critical" | "warning" | "info";
//   title: string;
//   description: string;
//   affectedPages: number;
//   autoFixAvailable: boolean;
// }

// export interface SEORecommendation {
//   priority: "high" | "medium" | "low";
//   title: string;
//   description: string;
//   impact: string;
// }

// export class EnhancedSEOService {
//   private googleApiKey: string;
//   private openai: OpenAI | null = null;
//   private anthropic: Anthropic | null = null;

//   constructor() {
//     this.googleApiKey = process.env.GOOGLE_PAGESPEED_API_KEY || '';
    
//     // Initialize AI clients
//     if (process.env.OPENAI_API_KEY) {
//       this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
//     }
    
//     if (process.env.ANTHROPIC_API_KEY) {
//       this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
//     }
//   }

//   async analyzeWebsite(url: string, targetKeywords?: string[]): Promise<EnhancedSEOAnalysisResult> {
//     try {
//       console.log(`Starting enhanced SEO analysis for: ${url}`);
      
//       const normalizedUrl = this.normalizeUrl(url);
      
//       // Perform basic technical analysis first
//       const [pageContent, pageSpeedScore, technicalDetails] = await Promise.all([
//         this.fetchPageContent(normalizedUrl),
//         this.getPageSpeedScore(normalizedUrl),
//         this.performTechnicalAnalysis(normalizedUrl)
//       ]);

//       // Extract text content for AI analysis
//       const textContent = this.extractTextContent(pageContent);
//       const pageTitle = cheerio.load(pageContent)('title').text();
//       const metaDescription = cheerio.load(pageContent)('meta[name="description"]').attr('content') || '';

//       // Perform AI-powered content analysis
//       const contentAnalysis = await this.performAIContentAnalysis(
//         textContent, 
//         pageTitle, 
//         metaDescription, 
//         targetKeywords || []
//       );

//       // Generate issues based on both technical and content analysis
//       const issues = this.analyzeForIssues(technicalDetails, pageContent, contentAnalysis);
//       const recommendations = this.generateEnhancedRecommendations(issues, technicalDetails, contentAnalysis);
//       const score = this.calculateEnhancedScore(issues, pageSpeedScore, technicalDetails, contentAnalysis);

//       console.log(`Enhanced SEO analysis completed. Score: ${score}`);

//       return {
//         score,
//         issues,
//         recommendations,
//         pageSpeedScore,
//         technicalDetails,
//         contentAnalysis
//       };
//     } catch (error) {
//       console.error("Enhanced SEO analysis failed:", error);
//       throw new Error(`Failed to analyze website SEO: ${error.message}`);
//     }
//   }

//   private async performAIContentAnalysis(
//     content: string, 
//     title: string, 
//     description: string, 
//     targetKeywords: string[]
//   ): Promise<ContentAnalysisResult> {
    
//     const analysisPrompt = `Analyze this webpage content for comprehensive SEO quality assessment:

// TITLE: ${title}
// META DESCRIPTION: ${description}
// TARGET KEYWORDS: ${targetKeywords.join(', ')}

// CONTENT:
// ${content.substring(0, 8000)} ${content.length > 8000 ? '...(truncated)' : ''}

// Please provide a detailed SEO content analysis including:

// 1. CONTENT QUALITY (0-100): Overall content quality, depth, expertise, value to users, comprehensiveness
// 2. READABILITY (0-100): How easy is the content to read and understand (sentence length, word complexity, structure)
// 3. KEYWORD OPTIMIZATION:
//    - Primary keyword density percentage (calculate based on target keywords)
//    - Keyword distribution quality (poor/good/excellent)
//    - Missing important keywords that should be included
//    - LSI/semantic keywords already present in the content
// 4. E-A-T SCORING (0-100 each):
//    - Expertise: Does content demonstrate subject matter expertise and depth?
//    - Authoritativeness: Is the source presented as authoritative with credentials/citations?
//    - Trustworthiness: Does content have trust signals, accuracy, transparency?
//    - Overall: Combined E-A-T score
// 5. CONTENT GAPS: What important topics/subtopics are missing that users would expect?
// 6. SEMANTIC KEYWORDS: Related keywords and phrases that should be included to improve topical relevance
// 7. CONTENT STRUCTURE (0-100): Organization quality, logical flow, use of headings, scanability
// 8. UNIQUENESS (0-100): How original and differentiated is this content from typical content on this topic
// 9. USER INTENT ALIGNMENT (0-100): How well does the content match what users searching for these keywords actually want

// Return ONLY valid JSON with this exact structure:
// {
//   "qualityScore": number,
//   "readabilityScore": number,
//   "keywordOptimization": {
//     "primaryKeywordDensity": number,
//     "keywordDistribution": "poor|good|excellent",
//     "missingKeywords": ["keyword1", "keyword2"],
//     "keywordCannibalization": boolean,
//     "lsiKeywords": ["lsi1", "lsi2"]
//   },
//   "eatScore": {
//     "expertise": number,
//     "authoritativeness": number,
//     "trustworthiness": number,
//     "overall": number
//   },
//   "contentGaps": ["gap1", "gap2"],
//   "semanticKeywords": ["semantic1", "semantic2"],
//   "contentStructureScore": number,
//   "uniquenessScore": number,
//   "userIntentAlignment": number
// }`;

//     try {
//       let analysisResult: string;

//       if (this.anthropic) {
//         console.log('Using Anthropic Claude for content analysis...');
//         const response = await this.anthropic.messages.create({
//           model: 'claude-sonnet-4-20250514',
//           max_tokens: 2000,
//           messages: [{ role: 'user', content: analysisPrompt }]
//         });
//         analysisResult = response.content[0].type === 'text' ? response.content[0].text : '';
//       } else if (this.openai) {
//         console.log('Using OpenAI GPT-4 for content analysis...');
//         const response = await this.openai.chat.completions.create({
//           model: 'gpt-4',
//           messages: [{ role: 'user', content: analysisPrompt }],
//           max_tokens: 2000,
//           temperature: 0.3
//         });
//         analysisResult = response.choices[0].message.content || '';
//       } else {
//         throw new Error('No AI service available for content analysis');
//       }

//       // Parse JSON response
//       const jsonMatch = analysisResult.match(/\{[\s\S]*\}/);
//       if (!jsonMatch) {
//         console.error('AI response did not contain valid JSON:', analysisResult);
//         throw new Error('Invalid JSON response from AI');
//       }

//       const parsed = JSON.parse(jsonMatch[0]);
      
//       // Validate and ensure all required fields exist
//       const result = {
//         qualityScore: this.validateScore(parsed.qualityScore),
//         readabilityScore: this.validateScore(parsed.readabilityScore),
//         keywordOptimization: {
//           primaryKeywordDensity: Math.max(0, Math.min(100, parsed.keywordOptimization?.primaryKeywordDensity || 0)),
//           keywordDistribution: ['poor', 'good', 'excellent'].includes(parsed.keywordOptimization?.keywordDistribution) 
//             ? parsed.keywordOptimization.keywordDistribution : 'poor',
//           missingKeywords: Array.isArray(parsed.keywordOptimization?.missingKeywords) 
//             ? parsed.keywordOptimization.missingKeywords.slice(0, 10) : [],
//           keywordCannibalization: Boolean(parsed.keywordOptimization?.keywordCannibalization),
//           lsiKeywords: Array.isArray(parsed.keywordOptimization?.lsiKeywords) 
//             ? parsed.keywordOptimization.lsiKeywords.slice(0, 10) : []
//         },
//         eatScore: {
//           expertise: this.validateScore(parsed.eatScore?.expertise),
//           authoritativeness: this.validateScore(parsed.eatScore?.authoritativeness),
//           trustworthiness: this.validateScore(parsed.eatScore?.trustworthiness),
//           overall: this.validateScore(parsed.eatScore?.overall)
//         },
//         contentGaps: Array.isArray(parsed.contentGaps) ? parsed.contentGaps.slice(0, 8) : [],
//         semanticKeywords: Array.isArray(parsed.semanticKeywords) ? parsed.semanticKeywords.slice(0, 15) : [],
//         contentStructureScore: this.validateScore(parsed.contentStructureScore),
//         uniquenessScore: this.validateScore(parsed.uniquenessScore),
//         userIntentAlignment: this.validateScore(parsed.userIntentAlignment)
//       };

//       console.log('AI content analysis completed:', {
//         quality: result.qualityScore,
//         readability: result.readabilityScore,
//         eatOverall: result.eatScore.overall,
//         contentGaps: result.contentGaps.length,
//         semanticKeywords: result.semanticKeywords.length
//       });

//       return result;
//     } catch (error) {
//       console.error('AI content analysis failed:', error);
      
//       // Return default scores if AI analysis fails
//       return {
//         qualityScore: 50,
//         readabilityScore: 50,
//         keywordOptimization: {
//           primaryKeywordDensity: 0,
//           keywordDistribution: 'poor',
//           missingKeywords: [],
//           keywordCannibalization: false,
//           lsiKeywords: []
//         },
//         eatScore: {
//           expertise: 40,
//           authoritativeness: 40,
//           trustworthiness: 40,
//           overall: 40
//         },
//         contentGaps: ['AI analysis unavailable'],
//         semanticKeywords: [],
//         contentStructureScore: 50,
//         uniquenessScore: 50,
//         userIntentAlignment: 50
//       };
//     }
//   }

//   private validateScore(score: any): number {
//     const num = Number(score);
//     return isNaN(num) ? 50 : Math.max(0, Math.min(100, Math.round(num)));
//   }

//   private extractTextContent(html: string): string {
//     const $ = cheerio.load(html);
    
//     // Remove script and style elements
//     $('script, style, nav, footer, header, aside, .menu, .sidebar, .ads').remove();
    
//     // Extract main content text
//     const mainSelectors = ['main', 'article', '.content', '.post', '.entry-content', '.main-content', '#content'];
//     let mainContent = '';
    
//     for (const selector of mainSelectors) {
//       const element = $(selector).first();
//       if (element.length && element.text().trim().length > 200) {
//         mainContent = element.text();
//         break;
//       }
//     }
    
//     // Fallback to body if no main content found
//     if (!mainContent) {
//       mainContent = $('body').text();
//     }
    
//     // Clean up whitespace
//     return mainContent.replace(/\s+/g, ' ').trim();
//   }

//   private normalizeUrl(url: string): string {
//     if (!url.startsWith('http://') && !url.startsWith('https://')) {
//       url = 'https://' + url;
//     }
//     return url;
//   }

//   private async fetchPageContent(url: string): Promise<string> {
//     try {
//       const response = await axios.get(url, {
//         timeout: 15000,
//         maxRedirects: 5,
//         headers: {
//           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
//           'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
//           'Accept-Language': 'en-US,en;q=0.5',
//           'Accept-Encoding': 'gzip, deflate',
//           'Connection': 'keep-alive'
//         }
//       });
//       return response.data;
//     } catch (error) {
//       if (error.code === 'ENOTFOUND') {
//         throw new Error(`Cannot access website: Domain not found (${error.hostname})`);
//       } else if (error.code === 'ECONNREFUSED') {
//         throw new Error(`Cannot access website: Connection refused`);
//       } else if (error.code === 'ETIMEDOUT') {
//         throw new Error(`Cannot access website: Request timeout`);
//       } else if (error.response?.status) {
//         throw new Error(`Cannot access website: HTTP ${error.response.status} ${error.response.statusText}`);
//       } else {
//         throw new Error(`Cannot access website: ${error.message}`);
//       }
//     }
//   }

//   private async getPageSpeedScore(url: string): Promise<number> {
//     if (!this.googleApiKey) {
//       console.warn('Google PageSpeed API key not configured, using fallback analysis');
//       return this.estimatePageSpeedScore(url);
//     }

//     try {
//       const [mobileResponse, desktopResponse] = await Promise.allSettled([
//         axios.get(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${this.googleApiKey}&strategy=mobile&category=PERFORMANCE`),
//         axios.get(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${this.googleApiKey}&strategy=desktop&category=PERFORMANCE`)
//       ]);

//       let mobileScore = 0;
//       let desktopScore = 0;

//       if (mobileResponse.status === 'fulfilled') {
//         mobileScore = Math.round((mobileResponse.value.data?.lighthouseResult?.categories?.performance?.score || 0) * 100);
//       }

//       if (desktopResponse.status === 'fulfilled') {
//         desktopScore = Math.round((desktopResponse.value.data?.lighthouseResult?.categories?.performance?.score || 0) * 100);
//       }

//       if (mobileScore === 0 && desktopScore === 0) {
//         throw new Error('No valid PageSpeed data received');
//       }
      
//       // Weight mobile more heavily (60/40 split)
//       const finalScore = mobileScore * 0.6 + desktopScore * 0.4;
//       console.log(`PageSpeed scores - Mobile: ${mobileScore}, Desktop: ${desktopScore}, Final: ${Math.round(finalScore)}`);
      
//       return Math.round(finalScore);
//     } catch (error) {
//       console.error('PageSpeed API failed, using fallback:', error.message);
//       return this.estimatePageSpeedScore(url);
//     }
//   }

//   private async estimatePageSpeedScore(url: string): Promise<number> {
//     try {
//       const startTime = Date.now();
//       await axios.head(url, { 
//         timeout: 10000,
//         headers: {
//           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
//         }
//       });
//       const loadTime = Date.now() - startTime;
      
//       console.log(`Estimated load time: ${loadTime}ms`);
      
//       if (loadTime < 800) return 95;
//       if (loadTime < 1500) return 85;
//       if (loadTime < 2500) return 75;
//       if (loadTime < 4000) return 65;
//       if (loadTime < 6000) return 55;
//       return 45;
//     } catch {
//       return 50;
//     }
//   }

//   private async performTechnicalAnalysis(url: string): Promise<TechnicalSEODetails> {
//     const html = await this.fetchPageContent(url);
//     const $ = cheerio.load(html);

//     const title = $('title').text().trim();
//     const description = $('meta[name="description"]').attr('content')?.trim() || '';
//     const keywords = $('meta[name="keywords"]').attr('content')?.trim() || '';
//     const viewport = $('meta[name="viewport"]').attr('content')?.trim() || '';

//     // Enhanced heading analysis
//     const h1Count = $('h1').length;
//     const h2Count = $('h2').length;
//     const h3Count = $('h3').length;
    
//     const headings = [];
//     $('h1, h2, h3, h4, h5, h6').each((i, elem) => {
//       headings.push(parseInt(elem.tagName.charAt(1)));
//     });
    
//     const hasProperHierarchy = this.checkHeadingHierarchy(headings);

//     // Enhanced image analysis
//     const images = $('img');
//     const totalImages = images.length;
//     let imagesWithoutAlt = 0;
//     let imagesWithoutTitle = 0;

//     images.each((i, elem) => {
//       const alt = $(elem).attr('alt');
//       const title = $(elem).attr('title');
      
//       if (!alt || alt.trim() === '') imagesWithoutAlt++;
//       if (!title || title.trim() === '') imagesWithoutTitle++;
//     });

//     // Enhanced link analysis
//     const domain = new URL(url).hostname;
//     const allLinks = $('a[href]');
//     let internalLinks = 0;
//     let externalLinks = 0;

//     allLinks.each((i, elem) => {
//       const href = $(elem).attr('href');
//       if (href) {
//         if (href.startsWith('/') || href.includes(domain)) {
//           internalLinks++;
//         } else if (href.startsWith('http')) {
//           externalLinks++;
//         }
//       }
//     });

//     // Schema markup detection
//     const hasSchemaMarkup = $('script[type="application/ld+json"]').length > 0 || 
//                            $('[itemscope]').length > 0 ||
//                            $('[typeof]').length > 0;

//     // Social media meta tags
//     const hasOgTags = $('meta[property^="og:"]').length > 0;
//     const hasTwitterCards = $('meta[name^="twitter:"]').length > 0;

//     // Enhanced responsive design check
//     const responsive = this.checkResponsiveDesign($, html);

//     return {
//       metaTags: {
//         hasTitle: title.length > 0,
//         titleLength: title.length,
//         hasDescription: description.length > 0,
//         descriptionLength: description.length,
//         hasKeywords: keywords.length > 0,
//         hasOgTags,
//         hasTwitterCards
//       },
//       headings: {
//         h1Count,
//         h2Count,
//         h3Count,
//         hasProperHierarchy,
//       },
//       images: {
//         total: totalImages,
//         withoutAlt: imagesWithoutAlt,
//         withoutTitle: imagesWithoutTitle,
//       },
//       links: {
//         internal: internalLinks,
//         external: externalLinks,
//         broken: 0, // Would need additional checking
//       },
//       performance: {
//         pageSize: html.length,
//       },
//       mobile: {
//         responsive,
//         viewportMeta: viewport.includes('width=device-width'),
//       },
//       schema: {
//         hasStructuredData: hasSchemaMarkup
//       }
//     };
//   }

//   private checkHeadingHierarchy(headings: number[]): boolean {
//     if (headings.length <= 1) return true;
    
//     for (let i = 1; i < headings.length; i++) {
//       if (headings[i] > headings[i-1] + 1) {
//         return false; // Skipped a level
//       }
//     }
//     return true;
//   }

//   private checkResponsiveDesign($: cheerio.CheerioAPI, html: string): boolean {
//     const hasViewportMeta = $('meta[name="viewport"]').length > 0;
//     const hasMediaQueries = html.includes('@media') || html.includes('screen and (');
//     const hasBootstrap = html.includes('bootstrap') || $('.container, .row, .col-').length > 0;
//     const hasFlexbox = html.includes('display:flex') || html.includes('display: flex') || $('.d-flex').length > 0;
//     const hasGrid = html.includes('display:grid') || html.includes('display: grid') || $('.grid').length > 0;
//     const hasResponsiveClasses = $('.responsive, .mobile, .tablet, .desktop').length > 0;
    
//     // More sophisticated check
//     const responsiveIndicators = [
//       hasViewportMeta,
//       hasMediaQueries,
//       hasBootstrap,
//       hasFlexbox,
//       hasGrid,
//       hasResponsiveClasses
//     ].filter(Boolean).length;
    
//     return responsiveIndicators >= 2; // Need at least 2 indicators
//   }

//   private analyzeForIssues(
//     technicalDetails: TechnicalSEODetails, 
//     html: string, 
//     contentAnalysis: ContentAnalysisResult
//   ): SEOIssue[] {
//     const issues: SEOIssue[] = [];

//     // Technical issues
//     if (!technicalDetails.metaTags.hasTitle) {
//       issues.push({
//         type: "critical",
//         title: "Missing Page Title",
//         description: "The page is missing a title tag, which is crucial for SEO and user experience.",
//         affectedPages: 1,
//         autoFixAvailable: false
//       });
//     }

//     if (technicalDetails.metaTags.titleLength > 60) {
//       issues.push({
//         type: "warning",
//         title: "Title Tag Too Long",
//         description: `Title tag is ${technicalDetails.metaTags.titleLength} characters. Keep it under 60 characters for optimal display.`,
//         affectedPages: 1,
//         autoFixAvailable: false
//       });
//     }

//     if (technicalDetails.metaTags.titleLength < 10) {
//       issues.push({
//         type: "warning",
//         title: "Title Tag Too Short",
//         description: `Title tag is only ${technicalDetails.metaTags.titleLength} characters. Consider expanding for better SEO.`,
//         affectedPages: 1,
//         autoFixAvailable: false
//       });
//     }

//     if (!technicalDetails.metaTags.hasDescription) {
//       issues.push({
//         type: "critical",
//         title: "Missing Meta Description",
//         description: "The page lacks a meta description, which impacts search result click-through rates.",
//         affectedPages: 1,
//         autoFixAvailable: false
//       });
//     }

//     if (technicalDetails.metaTags.descriptionLength > 160) {
//       issues.push({
//         type: "warning",
//         title: "Meta Description Too Long",
//         description: `Meta description is ${technicalDetails.metaTags.descriptionLength} characters. Keep it under 160 characters.`,
//         affectedPages: 1,
//         autoFixAvailable: false
//       });
//     }

//     // Heading issues
//     if (technicalDetails.headings.h1Count === 0) {
//       issues.push({
//         type: "critical",
//         title: "Missing H1 Tag",
//         description: "The page doesn't have an H1 tag, which should contain the main topic/keyword.",
//         affectedPages: 1,
//         autoFixAvailable: false
//       });
//     }

//     if (technicalDetails.headings.h1Count > 1) {
//       issues.push({
//         type: "warning",
//         title: "Multiple H1 Tags",
//         description: `Found ${technicalDetails.headings.h1Count} H1 tags. Use only one H1 per page.`,
//         affectedPages: 1,
//         autoFixAvailable: false
//       });
//     }

//     if (!technicalDetails.headings.hasProperHierarchy) {
//       issues.push({
//         type: "warning",
//         title: "Improper Heading Hierarchy",
//         description: "Heading tags are not in proper hierarchical order (H1, H2, H3, etc.).",
//         affectedPages: 1,
//         autoFixAvailable: false
//       });
//     }

//     // Image issues
//     if (technicalDetails.images.withoutAlt > 0) {
//       issues.push({
//         type: "warning",
//         title: "Images Missing Alt Text",
//         description: `${technicalDetails.images.withoutAlt} out of ${technicalDetails.images.total} images are missing alt text.`,
//         affectedPages: 1,
//         autoFixAvailable: false
//       });
//     }

//     // Mobile issues
//     if (!technicalDetails.mobile.viewportMeta) {
//       issues.push({
//         type: "critical",
//         title: "Missing Viewport Meta Tag",
//         description: "The page lacks a viewport meta tag, affecting mobile responsiveness.",
//         affectedPages: 1,
//         autoFixAvailable: false
//       });
//     }

//     if (!technicalDetails.mobile.responsive) {
//       issues.push({
//         type: "warning",
//         title: "Not Mobile Responsive",
//         description: "The page may not be optimized for mobile devices.",
//         affectedPages: 1,
//         autoFixAvailable: false
//       });
//     }

//     // Schema markup
//     if (!technicalDetails.schema?.hasStructuredData) {
//       issues.push({
//         type: "warning",
//         title: "Missing Schema Markup",
//         description: "No structured data found. Schema markup helps search engines understand your content.",
//         affectedPages: 1,
//         autoFixAvailable: false
//       });
//     }

//     // Social media tags
//     if (!technicalDetails.metaTags.hasOgTags) {
//       issues.push({
//         type: "info",
//         title: "Missing Open Graph Tags",
//         description: "Open Graph tags improve how your content appears when shared on social media.",
//         affectedPages: 1,
//         autoFixAvailable: false
//       });
//     }

//     // Content quality issues (AI-powered)
//     if (contentAnalysis.qualityScore < 60) {
//       issues.push({
//         type: "critical",
//         title: "Low Content Quality",
//         description: `Content quality score is ${contentAnalysis.qualityScore}/100. Content lacks depth, expertise, or value for users.`,
//         affectedPages: 1,
//         autoFixAvailable: false
//       });
//     }

//     if (contentAnalysis.readabilityScore < 70) {
//       issues.push({
//         type: "warning",
//         title: "Poor Readability",
//         description: `Readability score is ${contentAnalysis.readabilityScore}/100. Content is difficult to read and understand.`,
//         affectedPages: 1,
//         autoFixAvailable: false
//       });
//     }

//     // E-A-T issues
//     if (contentAnalysis.eatScore.overall < 60) {
//       issues.push({
//         type: "warning",
//         title: "Low E-A-T Score",
//         description: `E-A-T score is ${contentAnalysis.eatScore.overall}/100. Content lacks expertise, authoritativeness, or trustworthiness signals.`,
//         affectedPages: 1,
//         autoFixAvailable: false
//       });
//     }

//     // Keyword optimization issues
//     if (contentAnalysis.keywordOptimization.keywordDistribution === 'poor') {
//       issues.push({
//         type: "warning",
//         title: "Poor Keyword Distribution",
//         description: "Keywords are not well distributed throughout the content. Improve keyword placement in headings, body text, and meta tags.",
//         affectedPages: 1,
//         autoFixAvailable: false
//       });
//     }

//     if (contentAnalysis.keywordOptimization.primaryKeywordDensity > 5) {
//       issues.push({
//         type: "warning",
//         title: "Keyword Over-Optimization",
//         description: `Keyword density is ${contentAnalysis.keywordOptimization.primaryKeywordDensity.toFixed(1)}%. Consider reducing to 1-3% to avoid penalties.`,
//         affectedPages: 1,
//         autoFixAvailable: false
//       });
//     }

//     if (contentAnalysis.keywordOptimization.missingKeywords.length > 0) {
//       issues.push({
//         type: "info",
//         title: "Missing Important Keywords",
//         description: `Consider adding these relevant keywords: ${contentAnalysis.keywordOptimization.missingKeywords.slice(0, 5).join(', ')}`,
//         affectedPages: 1,
//         autoFixAvailable: false
//       });
//     }

//     // Content structure issues
//     if (contentAnalysis.contentStructureScore < 70) {
//       issues.push({
//         type: "warning",
//         title: "Poor Content Structure",
//         description: `Content structure score is ${contentAnalysis.contentStructureScore}/100. Improve organization, use more headings, and create better content flow.`,
//         affectedPages: 1,
//         autoFixAvailable: false
//       });
//     }

//     // User intent alignment
//     if (contentAnalysis.userIntentAlignment < 70) {
//       issues.push({
//         type: "warning",
//         title: "Poor User Intent Alignment",
//         description: `User intent alignment is ${contentAnalysis.userIntentAlignment}/100. Content doesn't match what users are searching for.`,
//         affectedPages: 1,
//         autoFixAvailable: false
//       });
//     }

//     // Content uniqueness
//     if (contentAnalysis.uniquenessScore < 60) {
//       issues.push({
//         type: "warning",
//         title: "Low Content Uniqueness",
//         description: `Uniqueness score is ${contentAnalysis.uniquenessScore}/100. Add more original insights, data, or perspectives.`,
//         affectedPages: 1,
//         autoFixAvailable: false
//       });
//     }

//     return issues;
//   }

//   private generateEnhancedRecommendations(
//     issues: SEOIssue[], 
//     technicalDetails: TechnicalSEODetails, 
//     contentAnalysis: ContentAnalysisResult
//   ): SEORecommendation[] {
//     const recommendations: SEORecommendation[] = [];

//     // Content-based recommendations
//     if (contentAnalysis.contentGaps.length > 0) {
//       recommendations.push({
//         priority: "high",
//         title: "Fill Content Gaps",
//         description: `Add content covering these important topics: ${contentAnalysis.contentGaps.slice(0, 3).join(', ')}`,
//         impact: "Better topic coverage and search visibility for long-tail queries"
//       });
//     }

//     if (contentAnalysis.semanticKeywords.length > 0) {
//       recommendations.push({
//         priority: "medium",
//         title: "Add Semantic Keywords",
//         description: `Include these related keywords naturally: ${contentAnalysis.semanticKeywords.slice(0, 5).join(', ')}`,
//         impact: "Improved semantic SEO and topical authority"
//       });
//     }

//     if (contentAnalysis.eatScore.overall < 80) {
//       recommendations.push({
//         priority: "high",
//         title: "Improve E-A-T Signals",
//         description: "Add author bios, credentials, citations, testimonials, and trust signals to improve expertise, authoritativeness, and trustworthiness.",
//         impact: "Better rankings for YMYL and competitive queries"
//       });
//     }

//     if (contentAnalysis.uniquenessScore < 70) {
//       recommendations.push({
//         priority: "high",
//         title: "Increase Content Uniqueness",
//         description: "Add original insights, data, examples, case studies, or unique perspectives to differentiate from competitors.",
//         impact: "Better differentiation from competitors and higher rankings"
//       });
//     }

//     if (contentAnalysis.readabilityScore < 80) {
//       recommendations.push({
//         priority: "medium",
//         title: "Improve Content Readability",
//         description: "Use shorter sentences, simpler words, bullet points, and better formatting to improve readability.",
//         impact: "Better user engagement and lower bounce rates"
//       });
//     }

//     if (contentAnalysis.userIntentAlignment < 80) {
//       recommendations.push({
//         priority: "high",
//         title: "Align Content with User Intent",
//         description: "Restructure content to better match what users are actually searching for when using target keywords.",
//         impact: "Higher click-through rates and better search rankings"
//       });
//     }

//     // Technical recommendations
//     if (!technicalDetails.schema?.hasStructuredData) {
//       recommendations.push({
//         priority: "high",
//         title: "Implement Schema Markup",
//         description: "Add structured data (JSON-LD) to help search engines understand your content better.",
//         impact: "Improved rich snippets and search visibility"
//       });
//     }

//     if (!technicalDetails.metaTags.hasOgTags) {
//       recommendations.push({
//         priority: "medium",
//         title: "Add Open Graph Tags",
//         description: "Implement Open Graph meta tags to control how your content appears on social media.",
//         impact: "Better social media sharing and potential traffic increase"
//       });
//     }

//     if (technicalDetails.links.internal < 5) {
//       recommendations.push({
//         priority: "medium",
//         title: "Optimize Internal Linking",
//         description: `You have ${technicalDetails.links.internal} internal links. Add more contextual internal links to related pages.`,
//         impact: "Better page authority distribution and user navigation"
//       });
//     }

//     // Issue-specific recommendations
//     const criticalIssues = issues.filter(i => i.type === "critical");
//     if (criticalIssues.length > 0) {
//       recommendations.unshift({
//         priority: "high",
//         title: "Fix Critical SEO Issues",
//         description: `Address ${criticalIssues.length} critical issues: ${criticalIssues.slice(0, 3).map(i => i.title).join(', ')}`,
//         impact: "Significant improvement in search engine rankings"
//       });
//     }

//     if (technicalDetails.images.total > 0 && technicalDetails.images.withoutAlt > 0) {
//       recommendations.push({
//         priority: "medium",
//         title: "Optimize Image SEO",
//         description: "Add descriptive alt text to all images and optimize image file sizes for faster loading.",
//         impact: "Better accessibility and image search rankings"
//       });
//     }

//     if (!technicalDetails.mobile.responsive) {
//       recommendations.unshift({
//         priority: "high",
//         title: "Implement Mobile Responsiveness",
//         description: "Ensure your website works well on all device sizes, especially mobile devices.",
//         impact: "Better mobile search rankings and user experience"
//       });
//     }

//     // Performance recommendations
//     if (technicalDetails.performance.pageSize && technicalDetails.performance.pageSize > 500000) {
//       recommendations.push({
//         priority: "medium",
//         title: "Optimize Page Size",
//         description: `Page size is ${Math.round(technicalDetails.performance.pageSize / 1024)}KB. Consider optimizing images and code.`,
//         impact: "Faster loading times and better user experience"
//       });
//     }

//     return recommendations.slice(0, 12); // Limit to 12 recommendations
//   }

//   private calculateEnhancedScore(
//     issues: SEOIssue[], 
//     pageSpeedScore: number, 
//     technicalDetails: TechnicalSEODetails, 
//     contentAnalysis: ContentAnalysisResult
//   ): number {
//     let baseScore = 100;
    
//     // Deduct for issues (reduced impact since we have more factors)
//     issues.forEach(issue => {
//       switch (issue.type) {
//         case "critical":
//           baseScore -= 12; // Reduced from 20
//           break;
//         case "warning":
//           baseScore -= 6;  // Reduced from 10
//           break;
//         case "info":
//           baseScore -= 2;  // Reduced from 5
//           break;
//       }
//     });

//     // Content quality weight (35% - most important)
//     const contentScore = (
//       contentAnalysis.qualityScore * 0.3 +
//       contentAnalysis.eatScore.overall * 0.25 +
//       contentAnalysis.readabilityScore * 0.15 +
//       contentAnalysis.userIntentAlignment * 0.15 +
//       contentAnalysis.uniquenessScore * 0.15
//     );
    
//     // Technical weight (45%)
//     let technicalScore = baseScore;
    
//     // Bonus points for good technical practices
//     if (technicalDetails.metaTags.hasTitle && technicalDetails.metaTags.titleLength <= 60 && technicalDetails.metaTags.titleLength >= 30) {
//       technicalScore += 5;
//     }
//     if (technicalDetails.metaTags.hasDescription && technicalDetails.metaTags.descriptionLength <= 160 && technicalDetails.metaTags.descriptionLength >= 120) {
//       technicalScore += 5;
//     }
//     if (technicalDetails.headings.h1Count === 1) {
//       technicalScore += 3;
//     }
//     if (technicalDetails.mobile.responsive && technicalDetails.mobile.viewportMeta) {
//       technicalScore += 5;
//     }
//     if (technicalDetails.schema?.hasStructuredData) {
//       technicalScore += 5;
//     }
//     if (technicalDetails.metaTags.hasOgTags) {
//       technicalScore += 3;
//     }
//     if (technicalDetails.images.withoutAlt === 0 && technicalDetails.images.total > 0) {
//       technicalScore += 3;
//     }

//     // Page speed weight (20%)
//     const speedScore = pageSpeedScore || 50;
    
//     // Combine all scores with weights
//     const finalScore = (contentScore * 0.35) + (technicalScore * 0.45) + (speedScore * 0.20);

//     return Math.max(0, Math.min(100, Math.round(finalScore)));
//   }

//   async performAutoFix(websiteId: string, issueType: string): Promise<{ success: boolean; message: string }> {
//     // Real auto-fix would require WordPress API integration or other CMS integration
//     return {
//       success: false,
//       message: "Auto-fix requires WordPress REST API integration or direct CMS access. Please manually address the issues for now."
//     };
//   }
// }

// export const seoService = new EnhancedSEOService();





import axios from 'axios';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { storage } from '../storage';

export interface EnhancedSEOAnalysisResult {
  score: number;
  issues: SEOIssue[];
  recommendations: SEORecommendation[];
  pageSpeedScore?: number;
  technicalDetails: TechnicalSEODetails;
  contentAnalysis: ContentAnalysisResult;
  competitiveAnalysis?: CompetitiveAnalysisResult;
}

export interface ContentAnalysisResult {
  qualityScore: number;
  readabilityScore: number;
  keywordOptimization: KeywordOptimizationResult;
  eatScore: EATScore;
  contentGaps: string[];
  semanticKeywords: string[];
  contentStructureScore: number;
  uniquenessScore: number;
  userIntentAlignment: number;
}

export interface KeywordOptimizationResult {
  primaryKeywordDensity: number;
  keywordDistribution: 'poor' | 'good' | 'excellent';
  missingKeywords: string[];
  keywordCannibalization: boolean;
  lsiKeywords: string[];
}

export interface EATScore {
  expertise: number;
  authoritativeness: number;
  trustworthiness: number;
  overall: number;
}

export interface CompetitiveAnalysisResult {
  competitorUrls: string[];
  contentGapOpportunities: string[];
  strengthsVsCompetitors: string[];
  improvementOpportunities: string[];
}

export interface TechnicalSEODetails {
  metaTags: {
    hasTitle: boolean;
    titleLength: number;
    hasDescription: boolean;
    descriptionLength: number;
    hasKeywords: boolean;
    hasOgTags?: boolean;
    hasTwitterCards?: boolean;
  };
  headings: {
    h1Count: number;
    h2Count: number;
    h3Count: number;
    hasProperHierarchy: boolean;
  };
  images: {
    total: number;
    withoutAlt: number;
    withoutTitle: number;
  };
  links: {
    internal: number;
    external: number;
    broken: number;
  };
  performance: {
    loadTime?: number;
    pageSize?: number;
  };
  mobile: {
    responsive: boolean;
    viewportMeta: boolean;
  };
  schema?: {
    hasStructuredData: boolean;
  };
}

export interface SEOIssue {
  type: "critical" | "warning" | "info";
  title: string;
  description: string;
  affectedPages: number;
  autoFixAvailable: boolean;
}

export interface SEORecommendation {
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  impact: string;
}

export class EnhancedSEOService {
  constructor() {
    // Constructor no longer initializes AI clients - they're retrieved per-user
  }

  private async getUserGooglePageSpeedApiKey(userId: string): Promise<string | null> {
    if (!userId) {
      // Fallback to system API key if no user ID provided (for backward compatibility)
      return process.env.GOOGLE_PAGESPEED_API_KEY || null;
    }
    return storage.getDecryptedApiKey(userId, 'google_pagespeed');
  }

  private async getUserOpenAI(userId: string): Promise<OpenAI | null> {
    if (!userId) return null;
    const apiKey = await storage.getDecryptedApiKey(userId, 'openai');
    if (!apiKey) return null;
    return new OpenAI({ apiKey });
  }

  private async getUserAnthropic(userId: string): Promise<Anthropic | null> {
    if (!userId) return null;
    const apiKey = await storage.getDecryptedApiKey(userId, 'anthropic');
    if (!apiKey) return null;
    return new Anthropic({ apiKey });
  }

  async analyzeWebsite(url: string, targetKeywords?: string[], userId?: string): Promise<EnhancedSEOAnalysisResult> {
    try {
      console.log(`Starting enhanced SEO analysis for: ${url}${userId ? ` (user: ${userId})` : ''}`);
      
      const normalizedUrl = this.normalizeUrl(url);
      
      // Perform basic technical analysis first
      const [pageContent, pageSpeedScore, technicalDetails] = await Promise.all([
        this.fetchPageContent(normalizedUrl),
        this.getPageSpeedScore(normalizedUrl, userId),
        this.performTechnicalAnalysis(normalizedUrl)
      ]);

      // Extract text content for AI analysis
      const textContent = this.extractTextContent(pageContent);
      const pageTitle = cheerio.load(pageContent)('title').text();
      const metaDescription = cheerio.load(pageContent)('meta[name="description"]').attr('content') || '';

      // Perform AI-powered content analysis (if user has AI keys)
      const contentAnalysis = await this.performAIContentAnalysis(
        textContent, 
        pageTitle, 
        metaDescription, 
        targetKeywords || [],
        userId
      );

      // Generate issues based on both technical and content analysis
      const issues = this.analyzeForIssues(technicalDetails, pageContent, contentAnalysis);
      const recommendations = this.generateEnhancedRecommendations(issues, technicalDetails, contentAnalysis);
      const score = this.calculateEnhancedScore(issues, pageSpeedScore, technicalDetails, contentAnalysis);

      console.log(`Enhanced SEO analysis completed. Score: ${score}`);

      return {
        score,
        issues,
        recommendations,
        pageSpeedScore,
        technicalDetails,
        contentAnalysis
      };
    } catch (error) {
      console.error("Enhanced SEO analysis failed:", error);
      throw new Error(`Failed to analyze website SEO: ${error.message}`);
    }
  }

  private async performAIContentAnalysis(
    content: string, 
    title: string, 
    description: string, 
    targetKeywords: string[],
    userId?: string
  ): Promise<ContentAnalysisResult> {

    if (!userId) {
      console.log('No user ID provided, skipping AI content analysis');
      return this.getFallbackContentAnalysis();
    }
    
    const analysisPrompt = `Analyze this webpage content for comprehensive SEO quality assessment:

TITLE: ${title}
META DESCRIPTION: ${description}
TARGET KEYWORDS: ${targetKeywords.join(', ')}

CONTENT:
${content.substring(0, 8000)} ${content.length > 8000 ? '...(truncated)' : ''}

Please provide a detailed SEO content analysis including:

1. CONTENT QUALITY (0-100): Overall content quality, depth, expertise, value to users, comprehensiveness
2. READABILITY (0-100): How easy is the content to read and understand (sentence length, word complexity, structure)
3. KEYWORD OPTIMIZATION:
   - Primary keyword density percentage (calculate based on target keywords)
   - Keyword distribution quality (poor/good/excellent)
   - Missing important keywords that should be included
   - LSI/semantic keywords already present in the content
4. E-A-T SCORING (0-100 each):
   - Expertise: Does content demonstrate subject matter expertise and depth?
   - Authoritativeness: Is the source presented as authoritative with credentials/citations?
   - Trustworthiness: Does content have trust signals, accuracy, transparency?
   - Overall: Combined E-A-T score
5. CONTENT GAPS: What important topics/subtopics are missing that users would expect?
6. SEMANTIC KEYWORDS: Related keywords and phrases that should be included to improve topical relevance
7. CONTENT STRUCTURE (0-100): Organization quality, logical flow, use of headings, scanability
8. UNIQUENESS (0-100): How original and differentiated is this content from typical content on this topic
9. USER INTENT ALIGNMENT (0-100): How well does the content match what users searching for these keywords actually want

Return ONLY valid JSON with this exact structure:
{
  "qualityScore": number,
  "readabilityScore": number,
  "keywordOptimization": {
    "primaryKeywordDensity": number,
    "keywordDistribution": "poor|good|excellent",
    "missingKeywords": ["keyword1", "keyword2"],
    "keywordCannibalization": boolean,
    "lsiKeywords": ["lsi1", "lsi2"]
  },
  "eatScore": {
    "expertise": number,
    "authoritativeness": number,
    "trustworthiness": number,
    "overall": number
  },
  "contentGaps": ["gap1", "gap2"],
  "semanticKeywords": ["semantic1", "semantic2"],
  "contentStructureScore": number,
  "uniquenessScore": number,
  "userIntentAlignment": number
}`;

    try {
      let analysisResult: string;
      let tokensUsed = 0;

      // Try Anthropic first, then OpenAI
      const anthropic = await this.getUserAnthropic(userId);
      const openai = await this.getUserOpenAI(userId);

      if (anthropic) {
        console.log('Using user Anthropic Claude for content analysis...');
        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          messages: [{ role: 'user', content: analysisPrompt }]
        });
        analysisResult = response.content[0].type === 'text' ? response.content[0].text : '';
        tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
      } else if (openai) {
        console.log('Using user OpenAI GPT-4 for content analysis...');
        const response = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: analysisPrompt }],
          max_tokens: 2000,
          temperature: 0.3
        });
        analysisResult = response.choices[0].message.content || '';
        tokensUsed = response.usage?.total_tokens || 0;
      } else {
        console.log('No AI service available for user, using fallback analysis');
        return this.getFallbackContentAnalysis();
      }

      // Parse JSON response
      const jsonMatch = analysisResult.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('AI response did not contain valid JSON:', analysisResult);
        throw new Error('Invalid JSON response from AI');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and ensure all required fields exist
      const result = {
        qualityScore: this.validateScore(parsed.qualityScore),
        readabilityScore: this.validateScore(parsed.readabilityScore),
        keywordOptimization: {
          primaryKeywordDensity: Math.max(0, Math.min(100, parsed.keywordOptimization?.primaryKeywordDensity || 0)),
          keywordDistribution: ['poor', 'good', 'excellent'].includes(parsed.keywordOptimization?.keywordDistribution) 
            ? parsed.keywordOptimization.keywordDistribution : 'poor',
          missingKeywords: Array.isArray(parsed.keywordOptimization?.missingKeywords) 
            ? parsed.keywordOptimization.missingKeywords.slice(0, 10) : [],
          keywordCannibalization: Boolean(parsed.keywordOptimization?.keywordCannibalization),
          lsiKeywords: Array.isArray(parsed.keywordOptimization?.lsiKeywords) 
            ? parsed.keywordOptimization.lsiKeywords.slice(0, 10) : []
        },
        eatScore: {
          expertise: this.validateScore(parsed.eatScore?.expertise),
          authoritativeness: this.validateScore(parsed.eatScore?.authoritativeness),
          trustworthiness: this.validateScore(parsed.eatScore?.trustworthiness),
          overall: this.validateScore(parsed.eatScore?.overall)
        },
        contentGaps: Array.isArray(parsed.contentGaps) ? parsed.contentGaps.slice(0, 8) : [],
        semanticKeywords: Array.isArray(parsed.semanticKeywords) ? parsed.semanticKeywords.slice(0, 15) : [],
        contentStructureScore: this.validateScore(parsed.contentStructureScore),
        uniquenessScore: this.validateScore(parsed.uniquenessScore),
        userIntentAlignment: this.validateScore(parsed.userIntentAlignment)
      };

      // Track AI usage if we have a user ID
      if (userId && tokensUsed > 0) {
        const provider = anthropic ? 'anthropic' : 'openai';
        const costPerToken = provider === 'anthropic' ? 0.003 : 0.005;
        const costUsd = (tokensUsed * costPerToken) / 1000;

        await storage.trackAiUsage({
          websiteId: '', // SEO analysis might not be tied to a specific website
          userId,
          model: provider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gpt-4',
          tokensUsed,
          costUsd: Math.round(costUsd * 100), // Store as cents
          operation: 'seo_content_analysis'
        });
      }

      console.log('AI content analysis completed:', {
        quality: result.qualityScore,
        readability: result.readabilityScore,
        eatOverall: result.eatScore.overall,
        contentGaps: result.contentGaps.length,
        semanticKeywords: result.semanticKeywords.length,
        tokensUsed
      });

      return result;
    } catch (error) {
      console.error('AI content analysis failed:', error);
      console.log('Falling back to basic content analysis');
      
      // Return fallback analysis if AI analysis fails
      return this.getFallbackContentAnalysis();
    }
  }

  private getFallbackContentAnalysis(): ContentAnalysisResult {
    return {
      qualityScore: 50,
      readabilityScore: 50,
      keywordOptimization: {
        primaryKeywordDensity: 0,
        keywordDistribution: 'poor',
        missingKeywords: [],
        keywordCannibalization: false,
        lsiKeywords: []
      },
      eatScore: {
        expertise: 40,
        authoritativeness: 40,
        trustworthiness: 40,
        overall: 40
      },
      contentGaps: ['AI analysis unavailable - configure API keys for detailed insights'],
      semanticKeywords: [],
      contentStructureScore: 50,
      uniquenessScore: 50,
      userIntentAlignment: 50
    };
  }

  private validateScore(score: any): number {
    const num = Number(score);
    return isNaN(num) ? 50 : Math.max(0, Math.min(100, Math.round(num)));
  }

  private extractTextContent(html: string): string {
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style, nav, footer, header, aside, .menu, .sidebar, .ads').remove();
    
    // Extract main content text
    const mainSelectors = ['main', 'article', '.content', '.post', '.entry-content', '.main-content', '#content'];
    let mainContent = '';
    
    for (const selector of mainSelectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim().length > 200) {
        mainContent = element.text();
        break;
      }
    }
    
    // Fallback to body if no main content found
    if (!mainContent) {
      mainContent = $('body').text();
    }
    
    // Clean up whitespace
    return mainContent.replace(/\s+/g, ' ').trim();
  }

  private normalizeUrl(url: string): string {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    return url;
  }

  private async fetchPageContent(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive'
        }
      });
      return response.data;
    } catch (error) {
      if (error.code === 'ENOTFOUND') {
        throw new Error(`Cannot access website: Domain not found (${error.hostname})`);
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error(`Cannot access website: Connection refused`);
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error(`Cannot access website: Request timeout`);
      } else if (error.response?.status) {
        throw new Error(`Cannot access website: HTTP ${error.response.status} ${error.response.statusText}`);
      } else {
        throw new Error(`Cannot access website: ${error.message}`);
      }
    }
  }

  private async getPageSpeedScore(url: string, userId?: string): Promise<number> {
    const googleApiKey = await this.getUserGooglePageSpeedApiKey(userId);
    
    if (!googleApiKey) {
      console.warn(`Google PageSpeed API key not configured${userId ? ` for user ${userId}` : ''}, using fallback analysis`);
      return this.estimatePageSpeedScore(url);
    }

    try {
      const [mobileResponse, desktopResponse] = await Promise.allSettled([
        axios.get(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${googleApiKey}&strategy=mobile&category=PERFORMANCE`),
        axios.get(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${googleApiKey}&strategy=desktop&category=PERFORMANCE`)
      ]);

      let mobileScore = 0;
      let desktopScore = 0;

      if (mobileResponse.status === 'fulfilled') {
        mobileScore = Math.round((mobileResponse.value.data?.lighthouseResult?.categories?.performance?.score || 0) * 100);
      }

      if (desktopResponse.status === 'fulfilled') {
        desktopScore = Math.round((desktopResponse.value.data?.lighthouseResult?.categories?.performance?.score || 0) * 100);
      }

      if (mobileScore === 0 && desktopScore === 0) {
        throw new Error('No valid PageSpeed data received');
      }
      
      // Weight mobile more heavily (60/40 split)
      const finalScore = mobileScore * 0.6 + desktopScore * 0.4;
      console.log(`PageSpeed scores - Mobile: ${mobileScore}, Desktop: ${desktopScore}, Final: ${Math.round(finalScore)}`);
      
      return Math.round(finalScore);
    } catch (error) {
      console.error('PageSpeed API failed, using fallback:', error.message);
      return this.estimatePageSpeedScore(url);
    }
  }

  private async estimatePageSpeedScore(url: string): Promise<number> {
    try {
      const startTime = Date.now();
      await axios.head(url, { 
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      const loadTime = Date.now() - startTime;
      
      console.log(`Estimated load time: ${loadTime}ms`);
      
      if (loadTime < 800) return 95;
      if (loadTime < 1500) return 85;
      if (loadTime < 2500) return 75;
      if (loadTime < 4000) return 65;
      if (loadTime < 6000) return 55;
      return 45;
    } catch {
      return 50;
    }
  }

  private async performTechnicalAnalysis(url: string): Promise<TechnicalSEODetails> {
    const html = await this.fetchPageContent(url);
    const $ = cheerio.load(html);

    const title = $('title').text().trim();
    const description = $('meta[name="description"]').attr('content')?.trim() || '';
    const keywords = $('meta[name="keywords"]').attr('content')?.trim() || '';
    const viewport = $('meta[name="viewport"]').attr('content')?.trim() || '';

    // Enhanced heading analysis
    const h1Count = $('h1').length;
    const h2Count = $('h2').length;
    const h3Count = $('h3').length;
    
    const headings = [];
    $('h1, h2, h3, h4, h5, h6').each((i, elem) => {
      headings.push(parseInt(elem.tagName.charAt(1)));
    });
    
    const hasProperHierarchy = this.checkHeadingHierarchy(headings);

    // Enhanced image analysis
    const images = $('img');
    const totalImages = images.length;
    let imagesWithoutAlt = 0;
    let imagesWithoutTitle = 0;

    images.each((i, elem) => {
      const alt = $(elem).attr('alt');
      const title = $(elem).attr('title');
      
      if (!alt || alt.trim() === '') imagesWithoutAlt++;
      if (!title || title.trim() === '') imagesWithoutTitle++;
    });

    // Enhanced link analysis
    const domain = new URL(url).hostname;
    const allLinks = $('a[href]');
    let internalLinks = 0;
    let externalLinks = 0;

    allLinks.each((i, elem) => {
      const href = $(elem).attr('href');
      if (href) {
        if (href.startsWith('/') || href.includes(domain)) {
          internalLinks++;
        } else if (href.startsWith('http')) {
          externalLinks++;
        }
      }
    });

    // Schema markup detection
    const hasSchemaMarkup = $('script[type="application/ld+json"]').length > 0 || 
                           $('[itemscope]').length > 0 ||
                           $('[typeof]').length > 0;

    // Social media meta tags
    const hasOgTags = $('meta[property^="og:"]').length > 0;
    const hasTwitterCards = $('meta[name^="twitter:"]').length > 0;

    // Enhanced responsive design check
    const responsive = this.checkResponsiveDesign($, html);

    return {
      metaTags: {
        hasTitle: title.length > 0,
        titleLength: title.length,
        hasDescription: description.length > 0,
        descriptionLength: description.length,
        hasKeywords: keywords.length > 0,
        hasOgTags,
        hasTwitterCards
      },
      headings: {
        h1Count,
        h2Count,
        h3Count,
        hasProperHierarchy,
      },
      images: {
        total: totalImages,
        withoutAlt: imagesWithoutAlt,
        withoutTitle: imagesWithoutTitle,
      },
      links: {
        internal: internalLinks,
        external: externalLinks,
        broken: 0, // Would need additional checking
      },
      performance: {
        pageSize: html.length,
      },
      mobile: {
        responsive,
        viewportMeta: viewport.includes('width=device-width'),
      },
      schema: {
        hasStructuredData: hasSchemaMarkup
      }
    };
  }

  private checkHeadingHierarchy(headings: number[]): boolean {
    if (headings.length <= 1) return true;
    
    for (let i = 1; i < headings.length; i++) {
      if (headings[i] > headings[i-1] + 1) {
        return false; // Skipped a level
      }
    }
    return true;
  }

  private checkResponsiveDesign($: cheerio.CheerioAPI, html: string): boolean {
    const hasViewportMeta = $('meta[name="viewport"]').length > 0;
    const hasMediaQueries = html.includes('@media') || html.includes('screen and (');
    const hasBootstrap = html.includes('bootstrap') || $('.container, .row, .col-').length > 0;
    const hasFlexbox = html.includes('display:flex') || html.includes('display: flex') || $('.d-flex').length > 0;
    const hasGrid = html.includes('display:grid') || html.includes('display: grid') || $('.grid').length > 0;
    const hasResponsiveClasses = $('.responsive, .mobile, .tablet, .desktop').length > 0;
    
    // More sophisticated check
    const responsiveIndicators = [
      hasViewportMeta,
      hasMediaQueries,
      hasBootstrap,
      hasFlexbox,
      hasGrid,
      hasResponsiveClasses
    ].filter(Boolean).length;
    
    return responsiveIndicators >= 2; // Need at least 2 indicators
  }

  private analyzeForIssues(
    technicalDetails: TechnicalSEODetails, 
    html: string, 
    contentAnalysis: ContentAnalysisResult
  ): SEOIssue[] {
    const issues: SEOIssue[] = [];

    // Technical issues
    if (!technicalDetails.metaTags.hasTitle) {
      issues.push({
        type: "critical",
        title: "Missing Page Title",
        description: "The page is missing a title tag, which is crucial for SEO and user experience.",
        affectedPages: 1,
        autoFixAvailable: false
      });
    }

    if (technicalDetails.metaTags.titleLength > 60) {
      issues.push({
        type: "warning",
        title: "Title Tag Too Long",
        description: `Title tag is ${technicalDetails.metaTags.titleLength} characters. Keep it under 60 characters for optimal display.`,
        affectedPages: 1,
        autoFixAvailable: false
      });
    }

    if (technicalDetails.metaTags.titleLength < 10) {
      issues.push({
        type: "warning",
        title: "Title Tag Too Short",
        description: `Title tag is only ${technicalDetails.metaTags.titleLength} characters. Consider expanding for better SEO.`,
        affectedPages: 1,
        autoFixAvailable: false
      });
    }

    if (!technicalDetails.metaTags.hasDescription) {
      issues.push({
        type: "critical",
        title: "Missing Meta Description",
        description: "The page lacks a meta description, which impacts search result click-through rates.",
        affectedPages: 1,
        autoFixAvailable: false
      });
    }

    if (technicalDetails.metaTags.descriptionLength > 160) {
      issues.push({
        type: "warning",
        title: "Meta Description Too Long",
        description: `Meta description is ${technicalDetails.metaTags.descriptionLength} characters. Keep it under 160 characters.`,
        affectedPages: 1,
        autoFixAvailable: false
      });
    }

    // Heading issues
    if (technicalDetails.headings.h1Count === 0) {
      issues.push({
        type: "critical",
        title: "Missing H1 Tag",
        description: "The page doesn't have an H1 tag, which should contain the main topic/keyword.",
        affectedPages: 1,
        autoFixAvailable: false
      });
    }

    if (technicalDetails.headings.h1Count > 1) {
      issues.push({
        type: "warning",
        title: "Multiple H1 Tags",
        description: `Found ${technicalDetails.headings.h1Count} H1 tags. Use only one H1 per page.`,
        affectedPages: 1,
        autoFixAvailable: false
      });
    }

    if (!technicalDetails.headings.hasProperHierarchy) {
      issues.push({
        type: "warning",
        title: "Improper Heading Hierarchy",
        description: "Heading tags are not in proper hierarchical order (H1, H2, H3, etc.).",
        affectedPages: 1,
        autoFixAvailable: false
      });
    }

    // Image issues
    if (technicalDetails.images.withoutAlt > 0) {
      issues.push({
        type: "warning",
        title: "Images Missing Alt Text",
        description: `${technicalDetails.images.withoutAlt} out of ${technicalDetails.images.total} images are missing alt text.`,
        affectedPages: 1,
        autoFixAvailable: false
      });
    }

    // Mobile issues
    if (!technicalDetails.mobile.viewportMeta) {
      issues.push({
        type: "critical",
        title: "Missing Viewport Meta Tag",
        description: "The page lacks a viewport meta tag, affecting mobile responsiveness.",
        affectedPages: 1,
        autoFixAvailable: false
      });
    }

    if (!technicalDetails.mobile.responsive) {
      issues.push({
        type: "warning",
        title: "Not Mobile Responsive",
        description: "The page may not be optimized for mobile devices.",
        affectedPages: 1,
        autoFixAvailable: false
      });
    }

    // Schema markup
    if (!technicalDetails.schema?.hasStructuredData) {
      issues.push({
        type: "warning",
        title: "Missing Schema Markup",
        description: "No structured data found. Schema markup helps search engines understand your content.",
        affectedPages: 1,
        autoFixAvailable: false
      });
    }

    // Social media tags
    if (!technicalDetails.metaTags.hasOgTags) {
      issues.push({
        type: "info",
        title: "Missing Open Graph Tags",
        description: "Open Graph tags improve how your content appears when shared on social media.",
        affectedPages: 1,
        autoFixAvailable: false
      });
    }

    // Content quality issues (AI-powered or fallback)
    if (contentAnalysis.qualityScore < 60) {
      issues.push({
        type: "critical",
        title: "Low Content Quality",
        description: `Content quality score is ${contentAnalysis.qualityScore}/100. Content lacks depth, expertise, or value for users.`,
        affectedPages: 1,
        autoFixAvailable: false
      });
    }

    if (contentAnalysis.readabilityScore < 70) {
      issues.push({
        type: "warning",
        title: "Poor Readability",
        description: `Readability score is ${contentAnalysis.readabilityScore}/100. Content is difficult to read and understand.`,
        affectedPages: 1,
        autoFixAvailable: false
      });
    }

    // E-A-T issues
    if (contentAnalysis.eatScore.overall < 60) {
      issues.push({
        type: "warning",
        title: "Low E-A-T Score",
        description: `E-A-T score is ${contentAnalysis.eatScore.overall}/100. Content lacks expertise, authoritativeness, or trustworthiness signals.`,
        affectedPages: 1,
        autoFixAvailable: false
      });
    }

    // Keyword optimization issues
    if (contentAnalysis.keywordOptimization.keywordDistribution === 'poor') {
      issues.push({
        type: "warning",
        title: "Poor Keyword Distribution",
        description: "Keywords are not well distributed throughout the content. Improve keyword placement in headings, body text, and meta tags.",
        affectedPages: 1,
        autoFixAvailable: false
      });
    }

    if (contentAnalysis.keywordOptimization.primaryKeywordDensity > 5) {
      issues.push({
        type: "warning",
        title: "Keyword Over-Optimization",
        description: `Keyword density is ${contentAnalysis.keywordOptimization.primaryKeywordDensity.toFixed(1)}%. Consider reducing to 1-3% to avoid penalties.`,
        affectedPages: 1,
        autoFixAvailable: false
      });
    }

    if (contentAnalysis.keywordOptimization.missingKeywords.length > 0) {
      issues.push({
        type: "info",
        title: "Missing Important Keywords",
        description: `Consider adding these relevant keywords: ${contentAnalysis.keywordOptimization.missingKeywords.slice(0, 5).join(', ')}`,
        affectedPages: 1,
        autoFixAvailable: false
      });
    }

    // Content structure issues
    if (contentAnalysis.contentStructureScore < 70) {
      issues.push({
        type: "warning",
        title: "Poor Content Structure",
        description: `Content structure score is ${contentAnalysis.contentStructureScore}/100. Improve organization, use more headings, and create better content flow.`,
        affectedPages: 1,
        autoFixAvailable: false
      });
    }

    // User intent alignment
    if (contentAnalysis.userIntentAlignment < 70) {
      issues.push({
        type: "warning",
        title: "Poor User Intent Alignment",
        description: `User intent alignment is ${contentAnalysis.userIntentAlignment}/100. Content doesn't match what users are searching for.`,
        affectedPages: 1,
        autoFixAvailable: false
      });
    }

    // Content uniqueness
    if (contentAnalysis.uniquenessScore < 60) {
      issues.push({
        type: "warning",
        title: "Low Content Uniqueness",
        description: `Uniqueness score is ${contentAnalysis.uniquenessScore}/100. Add more original insights, data, or perspectives.`,
        affectedPages: 1,
        autoFixAvailable: false
      });
    }

    return issues;
  }

  private generateEnhancedRecommendations(
    issues: SEOIssue[], 
    technicalDetails: TechnicalSEODetails, 
    contentAnalysis: ContentAnalysisResult
  ): SEORecommendation[] {
    const recommendations: SEORecommendation[] = [];

    // Content-based recommendations
    if (contentAnalysis.contentGaps.length > 0 && !contentAnalysis.contentGaps[0].includes('AI analysis unavailable')) {
      recommendations.push({
        priority: "high",
        title: "Fill Content Gaps",
        description: `Add content covering these important topics: ${contentAnalysis.contentGaps.slice(0, 3).join(', ')}`,
        impact: "Better topic coverage and search visibility for long-tail queries"
      });
    }

    if (contentAnalysis.semanticKeywords.length > 0) {
      recommendations.push({
        priority: "medium",
        title: "Add Semantic Keywords",
        description: `Include these related keywords naturally: ${contentAnalysis.semanticKeywords.slice(0, 5).join(', ')}`,
        impact: "Improved semantic SEO and topical authority"
      });
    }

    if (contentAnalysis.eatScore.overall < 80) {
      recommendations.push({
        priority: "high",
        title: "Improve E-A-T Signals",
        description: "Add author bios, credentials, citations, testimonials, and trust signals to improve expertise, authoritativeness, and trustworthiness.",
        impact: "Better rankings for YMYL and competitive queries"
      });
    }

    if (contentAnalysis.uniquenessScore < 70) {
      recommendations.push({
        priority: "high",
        title: "Increase Content Uniqueness",
        description: "Add original insights, data, examples, case studies, or unique perspectives to differentiate from competitors.",
        impact: "Better differentiation from competitors and higher rankings"
      });
    }

    if (contentAnalysis.readabilityScore < 80) {
      recommendations.push({
        priority: "medium",
        title: "Improve Content Readability",
        description: "Use shorter sentences, simpler words, bullet points, and better formatting to improve readability.",
        impact: "Better user engagement and lower bounce rates"
      });
    }

    if (contentAnalysis.userIntentAlignment < 80) {
      recommendations.push({
        priority: "high",
        title: "Align Content with User Intent",
        description: "Restructure content to better match what users are actually searching for when using target keywords.",
        impact: "Higher click-through rates and better search rankings"
      });
    }

    // Technical recommendations
    if (!technicalDetails.schema?.hasStructuredData) {
      recommendations.push({
        priority: "high",
        title: "Implement Schema Markup",
        description: "Add structured data (JSON-LD) to help search engines understand your content better.",
        impact: "Improved rich snippets and search visibility"
      });
    }

    if (!technicalDetails.metaTags.hasOgTags) {
      recommendations.push({
        priority: "medium",
        title: "Add Open Graph Tags",
        description: "Implement Open Graph meta tags to control how your content appears on social media.",
        impact: "Better social media sharing and potential traffic increase"
      });
    }

    if (technicalDetails.links.internal < 5) {
      recommendations.push({
        priority: "medium",
        title: "Optimize Internal Linking",
        description: `You have ${technicalDetails.links.internal} internal links. Add more contextual internal links to related pages.`,
        impact: "Better page authority distribution and user navigation"
      });
    }

    // Issue-specific recommendations
    const criticalIssues = issues.filter(i => i.type === "critical");
    if (criticalIssues.length > 0) {
      recommendations.unshift({
        priority: "high",
        title: "Fix Critical SEO Issues",
        description: `Address ${criticalIssues.length} critical issues: ${criticalIssues.slice(0, 3).map(i => i.title).join(', ')}`,
        impact: "Significant improvement in search engine rankings"
      });
    }

    if (technicalDetails.images.total > 0 && technicalDetails.images.withoutAlt > 0) {
      recommendations.push({
        priority: "medium",
        title: "Optimize Image SEO",
        description: "Add descriptive alt text to all images and optimize image file sizes for faster loading.",
        impact: "Better accessibility and image search rankings"
      });
    }

    if (!technicalDetails.mobile.responsive) {
      recommendations.unshift({
        priority: "high",
        title: "Implement Mobile Responsiveness",
        description: "Ensure your website works well on all device sizes, especially mobile devices.",
        impact: "Better mobile search rankings and user experience"
      });
    }

    // Performance recommendations
    if (technicalDetails.performance.pageSize && technicalDetails.performance.pageSize > 500000) {
      recommendations.push({
        priority: "medium",
        title: "Optimize Page Size",
        description: `Page size is ${Math.round(technicalDetails.performance.pageSize / 1024)}KB. Consider optimizing images and code.`,
        impact: "Faster loading times and better user experience"
      });
    }

    return recommendations.slice(0, 12); // Limit to 12 recommendations
  }

  private calculateEnhancedScore(
    issues: SEOIssue[], 
    pageSpeedScore: number, 
    technicalDetails: TechnicalSEODetails, 
    contentAnalysis: ContentAnalysisResult
  ): number {
    let baseScore = 100;
    
    // Deduct for issues (reduced impact since we have more factors)
    issues.forEach(issue => {
      switch (issue.type) {
        case "critical":
          baseScore -= 12; // Reduced from 20
          break;
        case "warning":
          baseScore -= 6;  // Reduced from 10
          break;
        case "info":
          baseScore -= 2;  // Reduced from 5
          break;
      }
    });

    // Content quality weight (35% - most important)
    const contentScore = (
      contentAnalysis.qualityScore * 0.3 +
      contentAnalysis.eatScore.overall * 0.25 +
      contentAnalysis.readabilityScore * 0.15 +
      contentAnalysis.userIntentAlignment * 0.15 +
      contentAnalysis.uniquenessScore * 0.15
    );
    
    // Technical weight (45%)
    let technicalScore = baseScore;
    
    // Bonus points for good technical practices
    if (technicalDetails.metaTags.hasTitle && technicalDetails.metaTags.titleLength <= 60 && technicalDetails.metaTags.titleLength >= 30) {
      technicalScore += 5;
    }
    if (technicalDetails.metaTags.hasDescription && technicalDetails.metaTags.descriptionLength <= 160 && technicalDetails.metaTags.descriptionLength >= 120) {
      technicalScore += 5;
    }
    if (technicalDetails.headings.h1Count === 1) {
      technicalScore += 3;
    }
    if (technicalDetails.mobile.responsive && technicalDetails.mobile.viewportMeta) {
      technicalScore += 5;
    }
    if (technicalDetails.schema?.hasStructuredData) {
      technicalScore += 5;
    }
    if (technicalDetails.metaTags.hasOgTags) {
      technicalScore += 3;
    }
    if (technicalDetails.images.withoutAlt === 0 && technicalDetails.images.total > 0) {
      technicalScore += 3;
    }

    // Page speed weight (20%)
    const speedScore = pageSpeedScore || 50;
    
    // Combine all scores with weights
    const finalScore = (contentScore * 0.35) + (technicalScore * 0.45) + (speedScore * 0.20);

    return Math.max(0, Math.min(100, Math.round(finalScore)));
  }

  async performAutoFix(websiteId: string, issueType: string): Promise<{ success: boolean; message: string }> {
    // Real auto-fix would require WordPress API integration or other CMS integration
    return {
      success: false,
      message: "Auto-fix requires WordPress REST API integration or direct CMS access. Please manually address the issues for now."
    };
  }
}

export const seoService = new EnhancedSEOService();