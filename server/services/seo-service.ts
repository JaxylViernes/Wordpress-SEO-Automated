import axios from "axios";
import * as cheerio from "cheerio";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { storage } from "../storage";


// #region Constants
const SEO_CONSTANTS = {
  CONTENT_TRUNCATE_LENGTH: 8000,
  MAX_RECOMMENDATIONS: 12,
  
  // Scoring weights
  WEIGHTS: {
    CONTENT: 0.35,
    TECHNICAL: 0.45,
    SPEED: 0.20,
  },
  
  // Score thresholds
  THRESHOLDS: {
    LOW_QUALITY: 60,
    POOR_READABILITY: 70,
    LOW_EAT: 60,
    HIGH_KEYWORD_DENSITY: 5,
    POOR_STRUCTURE: 70,
    POOR_INTENT: 70,
    LOW_UNIQUENESS: 60,
  },
  
  // Character limits
  LIMITS: {
    TITLE_MIN: 10,
    TITLE_MAX: 60,
    TITLE_OPTIMAL_MIN: 30,
    DESCRIPTION_MIN: 120,
    DESCRIPTION_MAX: 160,
    PAGE_SIZE_WARNING: 500000,
  },
  
  // Timeouts and retries
  NETWORK: {
    TIMEOUT: 15000,
    HEAD_TIMEOUT: 10000,
    MAX_REDIRECTS: 5,
  },
  
  // Grace periods (hours)
  GRACE_PERIODS: {
    AI_FIX: 48,
    MANUAL_FIX: 24,
  },
  
  // Issue tracking
  ISSUE_LIMITS: {
    RECENT: 50,
    EXISTING: 500,
  },
};

const AI_FIXABLE_ISSUE_TYPES = [
  // Meta tags
  'missing page title',
  'title tag too long',
  'title tag too short',
  'missing meta description',
  'meta description too long',
  'meta description too short',
  'duplicate meta descriptions',
  
  // Headings
  'missing h1 tag',
  'multiple h1 tags',
  'improper heading hierarchy',
  
  // Images
  'images missing alt text',
  'unoptimized images',
  'missing image dimensions',
  'images missing lazy loading',
  
  // Content
  'low content quality',
  'poor readability',
  'poor content structure',
  'thin content',
  'duplicate content',
  'keyword over-optimization',
  'poor keyword distribution',
  'missing important keywords',
  
  // Technical SEO
  'missing viewport meta tag',
  'missing schema markup',
  'missing open graph tags',
  'missing twitter cards',
  'missing canonical url',
  'missing breadcrumbs',
  'missing faq schema',
  
  // Links
  'broken internal links',
  'poor internal linking',
  'external links missing attributes',
  'orphan pages',
  
  // Site-wide
  'missing xml sitemap',
  'robots txt issues',
  'unoptimized permalinks',
  'redirect chains',
];

const DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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
  wordCount?: number;
  duplicateContentRisk?: number;
}

export interface KeywordOptimizationResult {
  primaryKeywordDensity: number;
  keywordDistribution: "poor" | "good" | "excellent";
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
    hasCanonical?: boolean;
    canonicalUrl?: string;
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
    withoutDimensions?: number;
    withoutLazyLoading?: number;
  };
  links: {
    internal: number;
    external: number;
    broken: number;
    externalWithoutAttributes?: number;
    inboundLinks?: number;
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
    hasFAQSchema?: boolean;
    hasBreadcrumbs?: boolean;
    hasArticleSchema?: boolean;
    hasProductSchema?: boolean;
    hasFAQContent?: boolean;
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

export interface AnalysisOptions {
  skipIssueTracking?: boolean;
}


export class EnhancedSEOService {
  constructor() {
  }

  //API Key Management
  private async getAPIKey(
    userId: string | undefined,
    provider: string,
    envVarNames: string[]
  ): Promise<string | null> {
    if (userId) {
      try {
        const userKey = await storage.getDecryptedApiKey(userId, provider);
        if (userKey) return userKey;
        
        console.log(
          `No user-specific ${provider} key for user ${userId}, checking system keys`
        );
      } catch (error: any) {
        console.warn(
          `Failed to get user ${provider} key for ${userId}: ${error.message}`
        );
      }
    }
    for (const envVar of envVarNames) {
      if (process.env[envVar]) {
        if (userId) {
          console.log(`Using system ${provider} API key for user ${userId}`);
        }
        return process.env[envVar]!;
      }
    }

    return null;
  }

  private async getUserOpenAI(userId: string | undefined): Promise<OpenAI | null> {
    if (!userId) return null;
    
    const apiKey = await this.getAPIKey(
      userId,
      "openai",
      ["OPENAI_API_KEY", "OPENAI_API_KEY_ENV_VAR"]
    );
    
    return apiKey ? new OpenAI({ apiKey }) : null;
  }

  private async getUserAnthropic(userId: string | undefined): Promise<Anthropic | null> {
    if (!userId) return null;
    
    const apiKey = await this.getAPIKey(userId, "anthropic", ["ANTHROPIC_API_KEY"]);
    return apiKey ? new Anthropic({ apiKey }) : null;
  }

  private async getUserGooglePageSpeedApiKey(userId: string | undefined): Promise<string | null> {
    return this.getAPIKey(userId, "google_pagespeed", ["GOOGLE_PAGESPEED_API_KEY"]);
  }


  async analyzeWebsite(
    url: string,
    targetKeywords?: string[],
    userId?: string,
    websiteId?: string,
    options?: AnalysisOptions
  ): Promise<EnhancedSEOAnalysisResult> {
    try {
      this.logAnalysisStart(url, userId, websiteId, options);
      
      const normalizedUrl = this.normalizeUrl(url);
      const [pageContent, pageSpeedScore, technicalDetails] = await Promise.all([
        this.fetchPageContent(normalizedUrl),
        this.getPageSpeedScore(normalizedUrl, userId),
        this.performTechnicalAnalysis(normalizedUrl),
      ]);

      const { text: textContent, wordCount } = this.extractTextContent(pageContent);
      const $ = cheerio.load(pageContent);
      const pageTitle = $("title").text();
      const metaDescription = $('meta[name="description"]').attr("content") || "";
      
      const contentAnalysis = await this.performAIContentAnalysis(
        textContent,
        pageTitle,
        metaDescription,
        targetKeywords || [],
        userId,
        websiteId,
        wordCount
      );
      
      const issues = await this.analyzeForIssues(technicalDetails, pageContent, contentAnalysis, normalizedUrl);
      const recommendations = this.generateEnhancedRecommendations(
        issues,
        technicalDetails,
        contentAnalysis
      );
      const score = this.calculateEnhancedScore(
        issues,
        pageSpeedScore,
        technicalDetails,
        contentAnalysis
      );

      await this.storeAnalysisResults(
        userId,
        websiteId,
        url,
        score,
        issues,
        recommendations,
        pageSpeedScore,
        technicalDetails,
        contentAnalysis,
        targetKeywords,
        options
      );

      console.log(`SEO analysis completed. Score: ${score}`);

      return {
        score,
        issues,
        recommendations,
        pageSpeedScore,
        technicalDetails,
        contentAnalysis,
      };
    } catch (error: any) {
      console.error("Enhanced SEO analysis failed:", error);
      throw new Error(`Failed to analyze website SEO: ${error.message}`);
    }
  }

  private logAnalysisStart(
    url: string,
    userId?: string,
    websiteId?: string,
    options?: AnalysisOptions
  ): void {
    const parts = [`Starting enhanced SEO analysis for: ${url}`];
    if (userId) parts.push(`(user: ${userId})`);
    if (websiteId) parts.push(`(website: ${websiteId})`);
    if (options?.skipIssueTracking) parts.push("[SKIP ISSUE TRACKING]");
    console.log(parts.join(" "));
  }

  private async storeAnalysisResults(
    userId: string | undefined,
    websiteId: string | undefined,
    url: string,
    score: number,
    issues: SEOIssue[],
    recommendations: SEORecommendation[],
    pageSpeedScore: number,
    technicalDetails: TechnicalSEODetails,
    contentAnalysis: ContentAnalysisResult,
    targetKeywords: string[] | undefined,
    options: AnalysisOptions | undefined
  ): Promise<void> {
    if (!userId || !websiteId) {
      console.log("Skipping SEO report storage - missing userId or websiteId");
      return;
    }
    try {
      const website = await storage.getUserWebsite(websiteId, userId);
      if (!website) {
        throw new Error(
          `Website ${websiteId} not found or access denied for user ${userId}`
        );
      }

      const seoReport = await storage.createSeoReport({
        userId,
        websiteId,
        score,
        issues: issues.map(this.mapIssueForStorage),
        recommendations,
        pageSpeedScore,
        metadata: {
          technicalDetails,
          contentAnalysis,
          analysisUrl: url,
          targetKeywords,
          aiAnalysisPerformed: !!userId,
          hasTrackedIssues: !options?.skipIssueTracking,
          trackingEnabled: !options?.skipIssueTracking,
          skipIssueTracking: options?.skipIssueTracking || false,
          timestamp: new Date().toISOString()
        },
      });
      await storage.updateWebsite(websiteId, {
        seoScore: score,
        updatedAt: new Date(),
      });

      if (!options?.skipIssueTracking) {
        await this.storeTrackedIssues(issues, userId, websiteId, seoReport.id);
        console.log(`SEO report created with ID: ${seoReport.id} and issues tracked`);
      } else {
        console.log(
          `SEO report created with ID: ${seoReport.id} [ISSUE TRACKING SKIPPED]`
        );
      }
    } catch (error) {
      console.error("Failed to store SEO report or track issues:", error);
      console.log("Continuing with analysis despite storage failure");
    }
  }

  private mapIssueForStorage(issue: SEOIssue) {
    return {
      type: issue.type,
      title: issue.title,
      description: issue.description,
      affectedPages: issue.affectedPages,
      autoFixAvailable: issue.autoFixAvailable,
    };
  }

  //Issue Tracking
  private async storeTrackedIssues(
    issues: SEOIssue[],
    userId: string,
    websiteId: string,
    seoReportId: string
  ): Promise<void> {
    if (!userId || !websiteId) {
      console.log('Skipping issue tracking - missing userId or websiteId');
      return;
    }

    console.log(`Tracking ${issues.length} SEO issues for website ${websiteId}`);
    const existingTrackedIssues = await storage.getTrackedSeoIssues(
      websiteId,
      userId,
      { limit: SEO_CONSTANTS.ISSUE_LIMITS.EXISTING }
    );

    const currentIssueTypes = new Set<string>();

    for (const issue of issues) {
      try {
        await this.processIndividualIssue(
          issue,
          currentIssueTypes,
          existingTrackedIssues,
          userId,
          websiteId,
          seoReportId
        );
      } catch (error: any) {
        console.error(`Failed to track issue "${issue.title}":`, error);
      }
    }
    await this.autoResolveIssues(existingTrackedIssues, currentIssueTypes);

    this.logIssueTrackingSummary(issues, existingTrackedIssues, currentIssueTypes);
  }

  private async processIndividualIssue(
    issue: SEOIssue,
    currentIssueTypes: Set<string>,
    existingTrackedIssues: any[],
    userId: string,
    websiteId: string,
    seoReportId: string
  ): Promise<void> {
    const issueType = this.mapIssueToTrackingType(issue.title);
    currentIssueTypes.add(issueType);

    const existingIssue = existingTrackedIssues.find(existing =>
      existing.issueType === issueType || this.isSameIssue(existing, issue)
    );

    if (existingIssue) {
      await this.handleExistingIssue(existingIssue, issue);
    } else {
      await this.createNewTrackedIssue(issue, issueType, userId, websiteId, seoReportId);
    }
  }

  private async handleExistingIssue(existingIssue: any, issue: SEOIssue): Promise<void> {
    const status = existingIssue.status;
    
    if (status === 'fixed' || status === 'resolved') {
      await this.handleResolvedOrFixedIssue(existingIssue, status);
    } else if (status === 'fixing') {
      console.log(`Resetting stuck "fixing" issue: ${issue.title}`);
      await storage.updateSeoIssueStatus(existingIssue.id, 'detected', {
        resolutionNotes: 'Reset from stuck fixing status during new analysis',
        lastSeenAt: new Date()
      });
    } else if (status === 'detected' || status === 'reappeared') {
      await storage.updateSeoIssueStatus(existingIssue.id, status, {
        lastSeenAt: new Date()
      });
    }
  }

  private async handleResolvedOrFixedIssue(existingIssue: any, status: string): Promise<void> {
    const statusDate = new Date(
      existingIssue[status === 'fixed' ? 'fixedAt' : 'resolvedAt'] || 
      existingIssue.updatedAt
    );
    const hoursSinceStatus = (Date.now() - statusDate.getTime()) / (1000 * 60 * 60);
    
    const gracePeriod = status === 'fixed' && existingIssue.fixMethod === 'ai_automatic'
      ? SEO_CONSTANTS.GRACE_PERIODS.AI_FIX
      : SEO_CONSTANTS.GRACE_PERIODS.MANUAL_FIX;

    if (hoursSinceStatus < gracePeriod) {
      console.log(
        `Skipping recently ${status} issue (${hoursSinceStatus.toFixed(1)}h ago): ${existingIssue.issueTitle}`
      );
    } else {
      console.log(
        `Issue reappeared after ${hoursSinceStatus.toFixed(1)}h: ${existingIssue.issueTitle}`
      );
      await storage.updateSeoIssueStatus(existingIssue.id, 'reappeared', {
        resolutionNotes: `Issue detected again after ${Math.round(hoursSinceStatus)}h grace period`,
        previousStatus: status,
        reappearedAt: new Date(),
        lastSeenAt: new Date()
      });
    }
  }

  private async createNewTrackedIssue(
    issue: SEOIssue,
    issueType: string,
    userId: string,
    websiteId: string,
    seoReportId: string
  ): Promise<void> {
    const isAutoFixable = this.isIssueAutoFixable(issue);

    await storage.createOrUpdateSeoIssue({
      userId,
      websiteId,
      issueType,
      issueTitle: issue.title,
      issueDescription: issue.description,
      severity: issue.type,
      autoFixAvailable: isAutoFixable,
      elementPath: this.generateElementPath(issue.title),
      currentValue: this.extractCurrentValue(issue.title, issue.description),
      recommendedValue: this.generateRecommendedValue(issue.title, issue.description),
      seoReportId
    });

    console.log(`Created new tracked issue: ${issue.title}`);
  }

  private isIssueAutoFixable(issue: SEOIssue): boolean {
    return AI_FIXABLE_ISSUE_TYPES.some(type =>
      issue.title.toLowerCase().includes(type.toLowerCase())
    ) || issue.autoFixAvailable === true;
  }

  private async autoResolveIssues(
    existingTrackedIssues: any[],
    currentIssueTypes: Set<string>
  ): Promise<void> {
    const issuesToResolve = existingTrackedIssues.filter(existing =>
      ['detected', 'reappeared'].includes(existing.status) &&
      !currentIssueTypes.has(existing.issueType)
    );

    for (const issueToResolve of issuesToResolve) {
      await storage.updateSeoIssueStatus(issueToResolve.id, 'resolved', {
        resolutionNotes: 'Issue no longer detected in latest analysis',
        resolvedAutomatically: true,
        resolvedAt: new Date()
      });
      console.log(`Auto-resolved issue: ${issueToResolve.issueTitle}`);
    }
  }

  private logIssueTrackingSummary(
    issues: SEOIssue[],
    existingTrackedIssues: any[],
    currentIssueTypes: Set<string>
  ): void {
    const fixedCount = existingTrackedIssues.filter(i =>
      i.status === 'fixed' && !currentIssueTypes.has(i.issueType)
    ).length;
    
    const newCount = issues.filter(issue =>
      !existingTrackedIssues.some(existing =>
        this.mapIssueToTrackingType(issue.title) === existing.issueType
      )
    ).length;

    console.log(`Issue tracking complete: ${newCount} new, ${fixedCount} remain fixed`);
  }

  private isSameIssue(tracked: any, reported: SEOIssue): boolean {
    const trackedTitle = tracked.issueTitle.toLowerCase();
    const reportedTitle = reported.title.toLowerCase();

    if (trackedTitle === reportedTitle) return true;

    const keyTerms = [
      'meta description', 'title tag', 'h1', 'alt text',
      'viewport', 'schema', 'content quality', 'readability'
    ];

    return keyTerms.some(term =>
      trackedTitle.includes(term) && reportedTitle.includes(term)
    );
  }

  private mapIssueToTrackingType(title: string): string {
    const titleLower = title.toLowerCase();
    const mappings: { [key: string]: string[] } = {
      // Meta tags
      "missing_meta_description": ["meta description"],
      "duplicate_meta_descriptions": ["duplicate meta"],
      "poor_title_tag": ["title tag"],
      
      // Headings
      "heading_structure": ["h1", "heading", "hierarchy"],
      
      // Images
      "missing_alt_text": ["alt text", "image alt"],
      "unoptimized_images": ["unoptimized image", "image optimization"],
      "missing_image_dimensions": ["image dimension", "width height"],
      "images_missing_lazy_loading": ["lazy loading", "loading attribute"],
      
      // Schema & structured data
      "missing_schema": ["schema", "structured data", "json-ld"],
      "missing_faq_schema": ["faq schema", "faq structured"],
      "missing_breadcrumbs": ["breadcrumb"],
      
      // Open Graph & social
      "missing_og_tags": ["open graph", "og:"],
      "missing_twitter_cards": ["twitter card", "twitter:"],
      
      // Links
      "broken_internal_links": ["broken link", "404", "dead link"],
      "poor_internal_linking": ["internal link", "internal linking"],
      "external_links_missing_attributes": ["external link", "nofollow", "noopener"],
      "orphan_pages": ["orphan page", "no inbound links"],
      
      // Content issues
      "thin_content": ["thin content", "insufficient content", "short content"],
      "duplicate_content": ["duplicate content", "content duplication"],
      "low_content_quality": ["content quality"],
      "poor_readability": ["readability"],
      "low_eat_score": ["e-a-t", "expertise", "authority", "trust"],
      "keyword_optimization": ["keyword"],
      "poor_user_intent": ["user intent", "search intent"],
      "low_content_uniqueness": ["content uniqueness", "uniqueness", "original"],
      "poor_content_structure": ["content structure", "organization"],
      
      // Technical
      "missing_viewport_meta": ["viewport"],
      "mobile_responsiveness": ["mobile", "responsive"],
      "missing_canonical_url": ["canonical"],
      "missing_xml_sitemap": ["sitemap", "xml sitemap"],
      "robots_txt_issues": ["robots.txt", "robots txt"],
      "unoptimized_permalinks": ["permalink", "url structure"],
      "redirect_chains": ["redirect chain", "multiple redirects"],
    };

    for (const [type, keywords] of Object.entries(mappings)) {
      if (keywords.some(keyword => titleLower.includes(keyword))) {
        return type;
      }
    }

    return "other";
  }

  private generateElementPath(title: string): string | undefined {
    const titleLower = title.toLowerCase();
    const pathMappings: { [key: string]: string[] } = {
      "title": ["title tag"],
      'meta[name="description"]': ["meta description"],
      "h1": ["h1"],
      'meta[name="viewport"]': ["viewport"],
      "img": ["alt text"],
    };

    for (const [path, keywords] of Object.entries(pathMappings)) {
      if (keywords.some(keyword => titleLower.includes(keyword))) {
        return path;
      }
    }

    return undefined;
  }

  private extractCurrentValue(title: string, description: string): string | undefined {
    const titleLower = title.toLowerCase();

    if (titleLower.includes("missing")) {
      return "Not present";
    }

    const match = description.match(/(\d+) characters/);
    if (titleLower.includes("too long")) {
      return match ? `${match[1]} characters` : "Too long";
    }
    if (titleLower.includes("too short")) {
      return match ? `${match[1]} characters` : "Too short";
    }

    return undefined;
  }

  private generateRecommendedValue(title: string, description: string): string | undefined {
    const titleLower = title.toLowerCase();
    const recommendations: { [key: string]: { missing?: string; default: string } } = {
      "meta description": {
        missing: "Add 120-160 character meta description",
        default: "Optimize to 120-160 characters"
      },
      "title tag": {
        missing: "Add 30-60 character title tag",
        default: "Optimize to 30-60 characters"
      },
      "alt text": {
        default: "Add descriptive alt text to images"
      },
      "h1": {
        missing: "Add one H1 heading",
        default: "Use only one H1 per page"
      }
    };

    for (const [keyword, values] of Object.entries(recommendations)) {
      if (titleLower.includes(keyword)) {
        if (titleLower.includes("missing") && values.missing) {
          return values.missing;
        }
        return values.default;
      }
    }

    return undefined;
  }

  //Data Retrieval
  async getDetailedSeoData(
    websiteId: string,
    userId: string
  ): Promise<{
    hasAIAnalysis: boolean;
    trackedIssues: any[];
    issuesSummary: any;
    recentActivity: any[];
  }> {
    try {
      const seoReports = await storage.getSeoReportsByWebsite(websiteId);
      const latestReport = seoReports[0];
      const hasAIAnalysis = latestReport?.metadata?.aiAnalysisPerformed || false;

      const trackedIssues = await storage.getTrackedSeoIssues(websiteId, userId, {
        limit: SEO_CONSTANTS.ISSUE_LIMITS.RECENT
      });

      const issuesSummary = await storage.getSeoIssueTrackingSummary(websiteId, userId);

      const recentActivity = this.extractRecentActivity(trackedIssues);

      console.log(`Retrieved ${trackedIssues.length} tracked issues for website ${websiteId}`);

      return {
        hasAIAnalysis,
        trackedIssues,
        issuesSummary,
        recentActivity
      };
    } catch (error) {
      console.error('Error getting detailed SEO data:', error);
      return this.getDefaultSeoData();
    }
  }

  private extractRecentActivity(trackedIssues: any[]): any[] {
    return trackedIssues
      .filter(issue => issue.metadata?.statusHistory)
      .flatMap(issue =>
        (issue.metadata.statusHistory || []).map((history: any) => ({
          ...history,
          issueTitle: issue.issueTitle,
          issueType: issue.issueType,
          issueId: issue.id
        }))
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }

  private getDefaultSeoData() {
    return {
      hasAIAnalysis: false,
      trackedIssues: [],
      issuesSummary: {
        totalIssues: 0,
        detected: 0,
        fixing: 0,
        fixed: 0,
        resolved: 0,
        reappeared: 0,
        autoFixable: 0,
        completionPercentage: 0,
        lastActivity: null
      },
      recentActivity: []
    };
  }

  // AI Content Analysis
  private async performAIContentAnalysis(
    content: string,
    title: string,
    description: string,
    targetKeywords: string[],
    userId?: string,
    websiteId?: string,
    wordCount?: number
  ): Promise<ContentAnalysisResult> {
    const defaultResult = this.getDefaultContentAnalysisResult(wordCount);

    try {
      const analysisPrompt = this.buildAnalysisPrompt(
        content,
        title,
        description,
        targetKeywords
      );

      const aiResponse = await this.getAIAnalysisResponse(
        analysisPrompt,
        userId
      );

      if (!aiResponse) {
        console.log("No AI service available, using default analysis");
        return defaultResult;
      }

      const parsed = this.parseAIResponse(aiResponse.result);
      const result = this.validateContentAnalysisResult(parsed, wordCount);

      await this.trackAIUsageIfApplicable(
        userId,
        websiteId,
        aiResponse.tokensUsed,
        aiResponse.provider
      );

      console.log("AI content analysis completed:", {
        provider: aiResponse.provider,
        quality: result.qualityScore,
        tokensUsed: aiResponse.tokensUsed,
      });

      return result;
    } catch (error) {
      console.error("AI content analysis failed:", error);
      return defaultResult;
    }
  }

  private getDefaultContentAnalysisResult(wordCount?: number): ContentAnalysisResult {
    return {
      qualityScore: 70,
      readabilityScore: 70,
      keywordOptimization: {
        primaryKeywordDensity: 2,
        keywordDistribution: "good",
        missingKeywords: [],
        keywordCannibalization: false,
        lsiKeywords: [],
      },
      eatScore: {
        expertise: 70,
        authoritativeness: 70,
        trustworthiness: 70,
        overall: 70,
      },
      contentGaps: [],
      semanticKeywords: [],
      contentStructureScore: 70,
      uniquenessScore: 70,
      userIntentAlignment: 70,
      wordCount: wordCount || 0,
      duplicateContentRisk: 0,
    };
  }

  private buildAnalysisPrompt(
    content: string,
    title: string,
    description: string,
    targetKeywords: string[]
  ): string {
    const truncatedContent = content.substring(0, SEO_CONSTANTS.CONTENT_TRUNCATE_LENGTH);
    const contentSuffix = content.length > SEO_CONSTANTS.CONTENT_TRUNCATE_LENGTH ? "...(truncated)" : "";

    return `Analyze this webpage content for comprehensive SEO quality assessment:

TITLE: ${title}
META DESCRIPTION: ${description}
TARGET KEYWORDS: ${targetKeywords.join(", ")}

CONTENT:
${truncatedContent}${contentSuffix}

Please provide a detailed SEO content analysis including:

1. CONTENT QUALITY (0-100): Overall content quality, depth, expertise, value to users
2. READABILITY (0-100): How easy is the content to read and understand
3. KEYWORD OPTIMIZATION:
   - Primary keyword density percentage
   - Keyword distribution quality (poor/good/excellent)
   - Missing important keywords
   - LSI/semantic keywords present
4. E-A-T SCORING (0-100 each):
   - Expertise: Subject matter expertise and depth
   - Authoritativeness: Source authority with credentials/citations
   - Trustworthiness: Trust signals, accuracy, transparency
   - Overall: Combined E-A-T score
5. CONTENT GAPS: Missing important topics/subtopics
6. SEMANTIC KEYWORDS: Related keywords to improve topical relevance
7. CONTENT STRUCTURE (0-100): Organization quality, logical flow
8. UNIQUENESS (0-100): Originality and differentiation
9. USER INTENT ALIGNMENT (0-100): How well content matches search intent

Return ONLY valid JSON with the exact structure specified.`;
  }

  private async getAIAnalysisResponse(
    prompt: string,
    userId?: string
  ): Promise<{ result: string; tokensUsed: number; provider: string } | null> {
    const openai = await this.getUserOpenAI(userId);
    const anthropic = await this.getUserAnthropic(userId);

    if (openai) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are an SEO expert. Return ONLY valid JSON without any markdown formatting."
            },
            { role: "user", content: prompt }
          ],
          max_tokens: 2000,
          temperature: 0.3,
          response_format: { type: "json_object" }
        });

        return {
          result: response.choices[0].message.content || "",
          tokensUsed: response.usage?.total_tokens || 0,
          provider: "openai"
        };
      } catch (error) {
        console.error("OpenAI API error:", error);
      }
    }

    if (anthropic) {
      try {
        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-latest",
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
        });

        const text = response.content[0].type === "text" 
          ? response.content[0].text 
          : "";

        return {
          result: text,
          tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
          provider: "anthropic"
        };
      } catch (error) {
        console.error("Anthropic API error:", error);
      }
    }

    return null;
  }

  private parseAIResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      return this.tryExtractScoresFromText(response) || this.getDefaultContentAnalysisResult();
    }
  }

  private tryExtractScoresFromText(text: string): any | null {
    try {
      const result = this.getDefaultContentAnalysisResult();
      
      const patterns: { [key: string]: RegExp } = {
        qualityScore: /quality[:\s]+(\d+)/i,
        readabilityScore: /readability[:\s]+(\d+)/i,
        expertise: /expertise[:\s]+(\d+)/i,
        trustworthiness: /trust[:\s]+(\d+)/i,
      };

      for (const [key, pattern] of Object.entries(patterns)) {
        const match = text.match(pattern);
        if (match) {
          const value = parseInt(match[1]);
          if (key === 'expertise' || key === 'trustworthiness') {
            (result.eatScore as any)[key] = value;
          } else {
            (result as any)[key] = value;
          }
        }
      }

      return result;
    } catch (error) {
      return null;
    }
  }

  private validateContentAnalysisResult(parsed: any, wordCount?: number): ContentAnalysisResult {
    return {
      qualityScore: this.safeValidateScore(parsed.qualityScore),
      readabilityScore: this.safeValidateScore(parsed.readabilityScore),
      keywordOptimization: {
        primaryKeywordDensity: Math.max(0, Math.min(100, 
          Number(parsed.keywordOptimization?.primaryKeywordDensity) || 2)),
        keywordDistribution: this.validateKeywordDistribution(
          parsed.keywordOptimization?.keywordDistribution
        ),
        missingKeywords: Array.isArray(parsed.keywordOptimization?.missingKeywords)
          ? parsed.keywordOptimization.missingKeywords : [],
        keywordCannibalization: Boolean(parsed.keywordOptimization?.keywordCannibalization),
        lsiKeywords: Array.isArray(parsed.keywordOptimization?.lsiKeywords)
          ? parsed.keywordOptimization.lsiKeywords : [],
      },
      eatScore: {
        expertise: this.safeValidateScore(parsed.eatScore?.expertise),
        authoritativeness: this.safeValidateScore(parsed.eatScore?.authoritativeness),
        trustworthiness: this.safeValidateScore(parsed.eatScore?.trustworthiness),
        overall: this.safeValidateScore(parsed.eatScore?.overall),
      },
      contentGaps: Array.isArray(parsed.contentGaps) ? parsed.contentGaps : [],
      semanticKeywords: Array.isArray(parsed.semanticKeywords) ? parsed.semanticKeywords : [],
      contentStructureScore: this.safeValidateScore(parsed.contentStructureScore),
      uniquenessScore: this.safeValidateScore(parsed.uniquenessScore),
      userIntentAlignment: this.safeValidateScore(parsed.userIntentAlignment),
      wordCount: wordCount || 0,
      duplicateContentRisk: parsed.duplicateContentRisk || 0,
    };
  }

  private validateKeywordDistribution(value: any): "poor" | "good" | "excellent" {
    return ["poor", "good", "excellent"].includes(value) ? value : "good";
  }

  private safeValidateScore(score: any, defaultValue: number = 70): number {
    try {
      const num = Number(score);
      if (isNaN(num)) return defaultValue;
      return Math.max(0, Math.min(100, Math.round(num)));
    } catch {
      return defaultValue;
    }
  }

  private async trackAIUsageIfApplicable(
    userId: string | undefined,
    websiteId: string | undefined,
    tokensUsed: number,
    provider: string
  ): Promise<void> {
    if (!userId || !websiteId || tokensUsed <= 0) return;

    const costPerToken = provider === "openai" ? 0.01 / 1000 : 0.003 / 1000;
    const costUsd = tokensUsed * costPerToken;

    try {
      const website = await storage.getUserWebsite(websiteId, userId);
      if (website) {
        await storage.trackAiUsage({
          websiteId,
          userId,
          model: provider === "openai" ? "gpt-4-turbo" : "claude-3-5-sonnet-latest",
          tokensUsed,
          costUsd: Math.round(costUsd * 100),
          operation: "seo_content_analysis",
        });
      }
    } catch (error: any) {
      console.warn("Failed to track AI usage:", error.message);
    }
  }

  //Technical Analysis
  private normalizeUrl(url: string): string {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return "https://" + url;
    }
    return url;
  }

  private async fetchPageContent(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        timeout: SEO_CONSTANTS.NETWORK.TIMEOUT,
        maxRedirects: SEO_CONSTANTS.NETWORK.MAX_REDIRECTS,
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate",
          Connection: "keep-alive",
        },
      });
      return response.data;
    } catch (error) {
      throw this.createFetchError(error);
    }
  }

  private createFetchError(error: any): Error {
    if (error.code === "ENOTFOUND") {
      return new Error(`Cannot access website: Domain not found (${error.hostname})`);
    }
    if (error.code === "ECONNREFUSED") {
      return new Error(`Cannot access website: Connection refused`);
    }
    if (error.code === "ETIMEDOUT") {
      return new Error(`Cannot access website: Request timeout`);
    }
    if (error.response?.status) {
      return new Error(
        `Cannot access website: HTTP ${error.response.status} ${error.response.statusText}`
      );
    }
    return new Error(`Cannot access website: ${error.message}`);
  }

  private async getPageSpeedScore(url: string, userId?: string): Promise<number> {
    const googleApiKey = await this.getUserGooglePageSpeedApiKey(userId);

    if (!googleApiKey) {
      console.warn(`Google PageSpeed API key not configured, using fallback analysis`);
      return this.estimatePageSpeedScore(url);
    }

    try {
      const scores = await this.fetchPageSpeedScores(url, googleApiKey);
      
      if (scores.mobile === 0 && scores.desktop === 0) {
        throw new Error("No valid PageSpeed data received");
      }

      const finalScore = scores.mobile * 0.6 + scores.desktop * 0.4;
      console.log(
        `PageSpeed scores - Mobile: ${scores.mobile}, Desktop: ${scores.desktop}, Final: ${Math.round(finalScore)}`
      );

      return Math.round(finalScore);
    } catch (error: any) {
      console.error("PageSpeed API failed, using fallback:", error.message);
      return this.estimatePageSpeedScore(url);
    }
  }

  private async fetchPageSpeedScores(
    url: string,
    apiKey: string
  ): Promise<{ mobile: number; desktop: number }> {
    const baseUrl = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
    const encodedUrl = encodeURIComponent(url);

    const [mobileResponse, desktopResponse] = await Promise.allSettled([
      axios.get(`${baseUrl}?url=${encodedUrl}&key=${apiKey}&strategy=mobile&category=PERFORMANCE`),
      axios.get(`${baseUrl}?url=${encodedUrl}&key=${apiKey}&strategy=desktop&category=PERFORMANCE`),
    ]);

    return {
      mobile: this.extractPageSpeedScore(mobileResponse),
      desktop: this.extractPageSpeedScore(desktopResponse),
    };
  }

  private extractPageSpeedScore(response: PromiseSettledResult<any>): number {
    if (response.status === "fulfilled") {
      const score = response.value.data?.lighthouseResult?.categories?.performance?.score || 0;
      return Math.round(score * 100);
    }
    return 0;
  }

  private async estimatePageSpeedScore(url: string): Promise<number> {
    try {
      const startTime = Date.now();
      await axios.head(url, {
        timeout: SEO_CONSTANTS.NETWORK.HEAD_TIMEOUT,
        headers: { "User-Agent": DEFAULT_USER_AGENT },
      });
      const loadTime = Date.now() - startTime;

      console.log(`Estimated load time: ${loadTime}ms`);

      const thresholds = [
        { time: 800, score: 95 },
        { time: 1500, score: 85 },
        { time: 2500, score: 75 },
        { time: 4000, score: 65 },
        { time: 6000, score: 55 },
      ];

      for (const threshold of thresholds) {
        if (loadTime < threshold.time) return threshold.score;
      }
      return 45;
    } catch {
      return 50;
    }
  }

  private async performTechnicalAnalysis(url: string): Promise<TechnicalSEODetails> {
    const html = await this.fetchPageContent(url);
    const $ = cheerio.load(html);

    return {
      metaTags: this.analyzeMetaTags($),
      headings: this.analyzeHeadings($),
      images: this.analyzeImagesEnhanced($),
      links: this.analyzeLinksEnhanced($, url),
      performance: { pageSize: html.length },
      mobile: this.analyzeMobile($, html),
      schema: this.analyzeSchemaEnhanced($),
    };
  }

  // Enhanced image analysis:
  private analyzeImagesEnhanced($: cheerio.CheerioAPI) {
    const images = $("img");
    let withoutAlt = 0;
    let withoutTitle = 0;
    let withoutDimensions = 0;
    let withoutLazyLoading = 0;

    images.each((i, elem) => {
      const $img = $(elem);
      const alt = $img.attr("alt");
      const title = $img.attr("title");
      const width = $img.attr("width");
      const height = $img.attr("height");
      const loading = $img.attr("loading");
      
      if (!alt || alt.trim() === "") withoutAlt++;
      if (!title || title.trim() === "") withoutTitle++;
      if (!width || !height) withoutDimensions++;
      if (loading !== "lazy" && i > 2) withoutLazyLoading++; // Skip first few images
    });

    return {
      total: images.length,
      withoutAlt,
      withoutTitle,
      withoutDimensions,
      withoutLazyLoading,
    };
  }

  private analyzeSchemaEnhanced($: cheerio.CheerioAPI) {
    const hasStructuredData = 
      $('script[type="application/ld+json"]').length > 0 ||
      $("[itemscope]").length > 0 ||
      $("[typeof]").length > 0;

    // Check for specific schema types
    let hasFAQSchema = false;
    let hasBreadcrumbs = false;
    let hasArticleSchema = false;
    let hasProductSchema = false;

    // Check JSON-LD scripts
    $('script[type="application/ld+json"]').each((i, elem) => {
      const content = $(elem).html() || "";
      if (content.includes('"@type":"FAQPage"')) hasFAQSchema = true;
      if (content.includes('"@type":"BreadcrumbList"')) hasBreadcrumbs = true;
      if (content.includes('"@type":"Article"')) hasArticleSchema = true;
      if (content.includes('"@type":"Product"')) hasProductSchema = true;
    });

    // Check for breadcrumb markup
    if ($('.breadcrumb, .breadcrumbs, nav[aria-label*="breadcrumb"]').length > 0) {
      hasBreadcrumbs = true;
    }

    // Check if content has FAQ-like structure
    const hasFAQContent = $('h2:contains("?"), h3:contains("?")').length >= 3;

    return {
      hasStructuredData,
      hasFAQSchema,
      hasBreadcrumbs,
      hasArticleSchema,
      hasProductSchema,
      hasFAQContent,
    };
  }

  // Enhanced meta tag analysis:
  private analyzeMetaTags($: cheerio.CheerioAPI) {
    const title = $("title").text().trim();
    const description = $('meta[name="description"]').attr("content")?.trim() || "";
    const keywords = $('meta[name="keywords"]').attr("content")?.trim() || "";
    const canonical = $('link[rel="canonical"]').attr("href")?.trim() || "";

    return {
      hasTitle: title.length > 0,
      titleLength: title.length,
      hasDescription: description.length > 0,
      descriptionLength: description.length,
      hasKeywords: keywords.length > 0,
      hasOgTags: $('meta[property^="og:"]').length > 0,
      hasTwitterCards: $('meta[name^="twitter:"]').length > 0,
      hasCanonical: canonical.length > 0,
      canonicalUrl: canonical,
    };
  }

  private analyzeContentIssues(issues: SEOIssue[], content: ContentAnalysisResult): void {
    const thresholds = SEO_CONSTANTS.THRESHOLDS;

    // Existing content quality checks...
    if (content.qualityScore < thresholds.LOW_QUALITY) {
      issues.push(this.createIssue(
        "critical",
        "Low Content Quality",
        `Content quality score is ${content.qualityScore}/100. Content lacks depth or value.`,
        true
      ));
    }

    if (content.readabilityScore < thresholds.POOR_READABILITY) {
      issues.push(this.createIssue(
        "warning",
        "Poor Readability",
        `Readability score is ${content.readabilityScore}/100. Content is difficult to understand.`,
        true
      ));
    }

    if (content.eatScore.overall < thresholds.LOW_EAT) {
      issues.push(this.createIssue(
        "warning",
        "Low E-A-T Score",
        `E-A-T score is ${content.eatScore.overall}/100. Content lacks expertise or trust signals.`,
        false
      ));
    }

    // Keyword optimization
    if (content.keywordOptimization.keywordDistribution === "poor") {
      issues.push(this.createIssue(
        "warning",
        "Poor Keyword Distribution",
        "Keywords are not well distributed throughout the content.",
        true
      ));
    }

    if (content.keywordOptimization.primaryKeywordDensity > thresholds.HIGH_KEYWORD_DENSITY) {
      issues.push(this.createIssue(
        "warning",
        "Keyword Over-Optimization",
        `Keyword density is ${content.keywordOptimization.primaryKeywordDensity.toFixed(1)}%. Consider reducing to 1-3%.`,
        true
      ));
    }

    if (content.keywordOptimization.missingKeywords.length > 0) {
      issues.push(this.createIssue(
        "info",
        "Missing Important Keywords",
        `Consider adding: ${content.keywordOptimization.missingKeywords.join(", ")}`,
        true
      ));
    }

    // Content structure and uniqueness
    if (content.contentStructureScore < thresholds.POOR_STRUCTURE) {
      issues.push(this.createIssue(
        "warning",
        "Poor Content Structure",
        `Content structure score is ${content.contentStructureScore}/100. Improve organization and flow.`,
        true
      ));
    }

    if (content.userIntentAlignment < thresholds.POOR_INTENT) {
      issues.push(this.createIssue(
        "warning",
        "Poor User Intent Alignment",
        `User intent alignment is ${content.userIntentAlignment}/100. Content doesn't match search intent.`,
        false
      ));
    }

    if (content.uniquenessScore < thresholds.LOW_UNIQUENESS) {
      issues.push(this.createIssue(
        "warning",
        "Low Content Uniqueness",
        `Uniqueness score is ${content.uniquenessScore}/100. Add more original insights.`,
        false
      ));
    }

    // Check for thin content (word count based)
    if (content.wordCount && content.wordCount < 300) {
      issues.push(this.createIssue(
        "warning",
        "Thin Content",
        `Content has only ${content.wordCount} words. Expand to at least 500 words for better SEO.`,
        true
      ));
    }

    // Check for duplicate content indicators
    if (content.duplicateContentRisk && content.duplicateContentRisk > 30) {
      issues.push(this.createIssue(
        "warning",
        "Duplicate Content Risk",
        "Content may be too similar to other pages. Add unique value.",
        true
      ));
    }
  }

  private analyzeHeadings($: cheerio.CheerioAPI) {
    const headings: number[] = [];
    $("h1, h2, h3, h4, h5, h6").each((i, elem) => {
      headings.push(parseInt(elem.tagName.charAt(1)));
    });

    return {
      h1Count: $("h1").length,
      h2Count: $("h2").length,
      h3Count: $("h3").length,
      hasProperHierarchy: this.checkHeadingHierarchy(headings),
    };
  }

  private checkHeadingHierarchy(headings: number[]): boolean {
    if (headings.length <= 1) return true;

    for (let i = 1; i < headings.length; i++) {
      if (headings[i] > headings[i - 1] + 1) {
        return false;
      }
    }
    return true;
  }

  private analyzeImages($: cheerio.CheerioAPI) {
    const images = $("img");
    let withoutAlt = 0;
    let withoutTitle = 0;

    images.each((i, elem) => {
      const alt = $(elem).attr("alt");
      const title = $(elem).attr("title");
      if (!alt || alt.trim() === "") withoutAlt++;
      if (!title || title.trim() === "") withoutTitle++;
    });

    return {
      total: images.length,
      withoutAlt,
      withoutTitle,
    };
  }

  private analyzeLinksEnhanced($: cheerio.CheerioAPI, url: string) {
    const domain = new URL(url).hostname;
    const allLinks = $("a[href]");
    let internal = 0;
    let external = 0;
    let broken = 0;
    let externalWithoutAttributes = 0;
    const internalUrls = new Set<string>();

    allLinks.each((i, elem) => {
      const $link = $(elem);
      const href = $link.attr("href");
      
      if (href) {
        if (href.startsWith("/") || href.includes(domain)) {
          internal++;
          internalUrls.add(href);
          
          // Check for broken links (simplified check)
          if (href.includes("404") || href.includes("error")) {
            broken++;
          }
        } else if (href.startsWith("http")) {
          external++;
          
          // Check for missing security attributes
          const rel = $link.attr("rel") || "";
          const target = $link.attr("target");
          
          if (!rel.includes("noopener") || !rel.includes("noreferrer") || !target) {
            externalWithoutAttributes++;
          }
        }
      }
    });

    // Check if this page is linked from anywhere (simplified)
    const inboundLinks = $(`a[href="${url}"], a[href*="${url.split('/').pop()}"]`).length;

    return { 
      internal, 
      external, 
      broken,
      externalWithoutAttributes,
      inboundLinks
    };
  }

  private analyzeMobile($: cheerio.CheerioAPI, html: string) {
    const viewport = $('meta[name="viewport"]').attr("content")?.trim() || "";
    return {
      responsive: this.checkResponsiveDesign($, html),
      viewportMeta: viewport.includes("width=device-width"),
    };
  }

  private checkResponsiveDesign($: cheerio.CheerioAPI, html: string): boolean {
    const indicators = [
      $('meta[name="viewport"]').length > 0,
      html.includes("@media") || html.includes("screen and ("),
      html.includes("bootstrap") || $(".container, .row, .col-").length > 0,
      html.includes("display:flex") || html.includes("display: flex") || $(".d-flex").length > 0,
      html.includes("display:grid") || html.includes("display: grid") || $(".grid").length > 0,
      $(".responsive, .mobile, .tablet, .desktop").length > 0,
    ];

    const indicatorCount = indicators.filter(Boolean).length;
    return indicatorCount >= 2;
  }

  private hasSchemaMarkup($: cheerio.CheerioAPI): boolean {
    return (
      $('script[type="application/ld+json"]').length > 0 ||
      $("[itemscope]").length > 0 ||
      $("[typeof]").length > 0
    );
  }

  private extractTextContent(html: string): { text: string; wordCount: number } {
    const $ = cheerio.load(html);

    $("script, style, nav, footer, header, aside, .menu, .sidebar, .ads").remove();

    const mainSelectors = [
      "main", "article", ".content", ".post",
      ".entry-content", ".main-content", "#content",
    ];

    let textContent = "";
    for (const selector of mainSelectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim().length > 200) {
        textContent = element.text().replace(/\s+/g, " ").trim();
        break;
      }
    }

    if (!textContent) {
      textContent = $("body").text().replace(/\s+/g, " ").trim();
    }

    const wordCount = this.countWords(textContent);

    return { text: textContent, wordCount };
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  //Issue Analysis
  private async analyzeForIssues(
    technicalDetails: TechnicalSEODetails,
    html: string,
    contentAnalysis: ContentAnalysisResult,
    url: string
  ): Promise<SEOIssue[]> {
    const issues: SEOIssue[] = [];

    this.analyzeTechnicalIssues(issues, technicalDetails);
    this.analyzeContentIssues(issues, contentAnalysis);
    await this.analyzeSiteWideIssues(url, issues);

    return issues;
  }

  private analyzeTechnicalIssues(issues: SEOIssue[], technical: TechnicalSEODetails): void {
    // Existing title tag checks
    if (!technical.metaTags.hasTitle) {
      issues.push(this.createIssue(
        "critical",
        "Missing Page Title",
        "The page is missing a title tag, which is crucial for SEO and user experience.",
        true
      ));
    } else {
      if (technical.metaTags.titleLength > SEO_CONSTANTS.LIMITS.TITLE_MAX) {
        issues.push(this.createIssue(
          "warning",
          "Title Tag Too Long",
          `Title tag is ${technical.metaTags.titleLength} characters. Keep it under ${SEO_CONSTANTS.LIMITS.TITLE_MAX} characters.`,
          true
        ));
      }
      if (technical.metaTags.titleLength < SEO_CONSTANTS.LIMITS.TITLE_MIN) {
        issues.push(this.createIssue(
          "warning",
          "Title Tag Too Short",
          `Title tag is only ${technical.metaTags.titleLength} characters. Consider expanding for better SEO.`,
          true
        ));
      }
    }

    // Existing meta description checks
    if (!technical.metaTags.hasDescription) {
      issues.push(this.createIssue(
        "critical",
        "Missing Meta Description",
        "The page lacks a meta description, which impacts search result click-through rates.",
        true
      ));
    } else {
      if (technical.metaTags.descriptionLength > SEO_CONSTANTS.LIMITS.DESCRIPTION_MAX) {
        issues.push(this.createIssue(
          "warning",
          "Meta Description Too Long",
          `Meta description is ${technical.metaTags.descriptionLength} characters. Keep it under ${SEO_CONSTANTS.LIMITS.DESCRIPTION_MAX}.`,
          true
        ));
      }
      if (technical.metaTags.descriptionLength < SEO_CONSTANTS.LIMITS.DESCRIPTION_MIN) {
        issues.push(this.createIssue(
          "warning",
          "Meta Description Too Short",
          `Meta description is ${technical.metaTags.descriptionLength} characters. Expand to at least ${SEO_CONSTANTS.LIMITS.DESCRIPTION_MIN}.`,
          true
        ));
      }
    }

    // Heading checks
    if (technical.headings.h1Count === 0) {
      issues.push(this.createIssue(
        "critical",
        "Missing H1 Tag",
        "The page doesn't have an H1 tag, which should contain the main topic/keyword.",
        true
      ));
    } else if (technical.headings.h1Count > 1) {
      issues.push(this.createIssue(
        "warning",
        "Multiple H1 Tags",
        `Found ${technical.headings.h1Count} H1 tags. Use only one H1 per page.`,
        true
      ));
    }

    if (!technical.headings.hasProperHierarchy) {
      issues.push(this.createIssue(
        "warning",
        "Improper Heading Hierarchy",
        "Heading tags are not in proper hierarchical order.",
        true
      ));
    }

    // Image issues
    if (technical.images.withoutAlt > 0) {
      issues.push(this.createIssue(
        "warning",
        "Images Missing Alt Text",
        `${technical.images.withoutAlt} out of ${technical.images.total} images are missing alt text.`,
        true
      ));
    }

    // Check for missing image dimensions and lazy loading
    if (technical.images.withoutDimensions && technical.images.withoutDimensions > 0) {
      issues.push(this.createIssue(
        "warning",
        "Images Missing Dimensions",
        `${technical.images.withoutDimensions} images lack width/height attributes, causing layout shift.`,
        true
      ));
    }

    if (technical.images.withoutLazyLoading && technical.images.withoutLazyLoading > 0) {
      issues.push(this.createIssue(
        "info",
        "Images Missing Lazy Loading",
        `${technical.images.withoutLazyLoading} images could benefit from lazy loading.`,
        true
      ));
    }

    // Mobile and viewport
    if (!technical.mobile.viewportMeta) {
      issues.push(this.createIssue(
        "critical",
        "Missing Viewport Meta Tag",
        "The page lacks a viewport meta tag, affecting mobile responsiveness.",
        true
      ));
    }

    if (!technical.mobile.responsive) {
      issues.push(this.createIssue(
        "warning",
        "Not Mobile Responsive",
        "The page may not be optimized for mobile devices.",
        false
      ));
    }

    // Schema and structured data
    if (!technical.schema?.hasStructuredData) {
      issues.push(this.createIssue(
        "warning",
        "Missing Schema Markup",
        "No structured data found. Schema markup helps search engines understand your content.",
        true
      ));
    }

    // Check for specific schema types
    if (!technical.schema?.hasFAQSchema && technical.schema?.hasFAQContent) {
      issues.push(this.createIssue(
        "info",
        "Missing FAQ Schema",
        "FAQ content detected but no FAQ schema markup found.",
        true
      ));
    }

    if (!technical.schema?.hasBreadcrumbs) {
      issues.push(this.createIssue(
        "info",
        "Missing Breadcrumbs",
        "No breadcrumb navigation found. Breadcrumbs improve user experience and SEO.",
        true
      ));
    }

    // Social meta tags
    if (!technical.metaTags.hasOgTags) {
      issues.push(this.createIssue(
        "info",
        "Missing Open Graph Tags",
        "Open Graph tags improve how your content appears when shared on social media.",
        true
      ));
    }

    if (!technical.metaTags.hasTwitterCards) {
      issues.push(this.createIssue(
        "info",
        "Missing Twitter Cards",
        "Twitter Card tags optimize how your content appears on Twitter.",
        true
      ));
    }

    // Canonical URL check
    if (!technical.metaTags.hasCanonical) {
      issues.push(this.createIssue(
        "warning",
        "Missing Canonical URL",
        "No canonical URL specified. This can lead to duplicate content issues.",
        true
      ));
    }

    // Links analysis
    if (technical.links.internal < 3) {
      issues.push(this.createIssue(
        "warning",
        "Poor Internal Linking",
        `Only ${technical.links.internal} internal links found. Add more to improve site structure.`,
        true
      ));
    }

    if (technical.links.broken > 0) {
      issues.push(this.createIssue(
        "warning",
        "Broken Internal Links",
        `${technical.links.broken} broken internal links detected.`,
        true
      ));
    }

    if (technical.links.externalWithoutAttributes && technical.links.externalWithoutAttributes > 0) {
      issues.push(this.createIssue(
        "info",
        "External Links Missing Attributes",
        `${technical.links.externalWithoutAttributes} external links lack security attributes.`,
        true
      ));
    }

    // Check for orphan pages indicator
    if (technical.links.inboundLinks === 0) {
      issues.push(this.createIssue(
        "warning",
        "Orphan Page",
        "This page has no internal links pointing to it.",
        true
      ));
    }
  }

  private async analyzeSiteWideIssues(
    url: string,
    issues: SEOIssue[]
  ): Promise<void> {
    const domain = new URL(url).origin;
    
    // Check for XML sitemap
    try {
      const sitemapResponse = await axios.head(`${domain}/sitemap.xml`, {
        timeout: 5000,
        maxRedirects: 2,
      });
      
      if (sitemapResponse.status === 404) {
        issues.push(this.createIssue(
          "warning",
          "Missing XML Sitemap",
          "No XML sitemap found at /sitemap.xml. This helps search engines discover your pages.",
          true
        ));
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        issues.push(this.createIssue(
          "warning",
          "Missing XML Sitemap",
          "No XML sitemap found. Create one to help search engines index your site.",
          true
        ));
      }
    }
    
    // Check for robots.txt
    try {
      const robotsResponse = await axios.get(`${domain}/robots.txt`, {
        timeout: 5000,
        maxRedirects: 2,
      });
      
      const robotsContent = robotsResponse.data;
      if (!robotsContent || robotsContent.length < 10) {
        issues.push(this.createIssue(
          "info",
          "Robots.txt Issues",
          "Robots.txt file is missing or empty. Configure it to control crawler access.",
          true
        ));
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        issues.push(this.createIssue(
          "info",
          "Robots.txt Issues", 
          "No robots.txt file found. Create one to guide search engine crawlers.",
          true
        ));
      }
    }
  }

  private createIssue(
    type: "critical" | "warning" | "info",
    title: string,
    description: string,
    autoFixAvailable: boolean
  ): SEOIssue {
    return {
      type,
      title,
      description,
      affectedPages: 1,
      autoFixAvailable,
    };
  }

  //Recommendations
  private generateEnhancedRecommendations(
    issues: SEOIssue[],
    technicalDetails: TechnicalSEODetails,
    contentAnalysis: ContentAnalysisResult
  ): SEORecommendation[] {
    const recommendations: SEORecommendation[] = [];

    this.addContentRecommendations(recommendations, contentAnalysis);
    this.addTechnicalRecommendations(recommendations, technicalDetails);
    this.addIssueBasedRecommendations(recommendations, issues);

    return recommendations.slice(0, SEO_CONSTANTS.MAX_RECOMMENDATIONS);
  }

  private addContentRecommendations(
    recommendations: SEORecommendation[],
    content: ContentAnalysisResult
  ): void {
    if (content.contentGaps.length > 0) {
      recommendations.push({
        priority: "high",
        title: "Fill Content Gaps",
        description: `Add content covering: ${content.contentGaps.join(", ")}`,
        impact: "Better topic coverage and search visibility",
      });
    }

    if (content.semanticKeywords.length > 0) {
      recommendations.push({
        priority: "medium",
        title: "Add Semantic Keywords",
        description: `Include these related keywords: ${content.semanticKeywords.join(", ")}`,
        impact: "Improved semantic SEO and topical authority",
      });
    }

    const thresholds = {
      eatScore: { value: content.eatScore.overall, threshold: 80 },
      uniquenessScore: { value: content.uniquenessScore, threshold: 70 },
      readabilityScore: { value: content.readabilityScore, threshold: 80 },
      userIntentAlignment: { value: content.userIntentAlignment, threshold: 80 },
    };

    if (thresholds.eatScore.value < thresholds.eatScore.threshold) {
      recommendations.push({
        priority: "high",
        title: "Improve E-A-T Signals",
        description: "Add author bios, credentials, citations, and trust signals.",
        impact: "Better rankings for YMYL and competitive queries",
      });
    }

    if (thresholds.uniquenessScore.value < thresholds.uniquenessScore.threshold) {
      recommendations.push({
        priority: "high",
        title: "Increase Content Uniqueness",
        description: "Add original insights, data, or unique perspectives.",
        impact: "Better differentiation from competitors",
      });
    }

    if (thresholds.readabilityScore.value < thresholds.readabilityScore.threshold) {
      recommendations.push({
        priority: "medium",
        title: "Improve Content Readability",
        description: "Use shorter sentences, simpler words, and better formatting.",
        impact: "Better user engagement and lower bounce rates",
      });
    }

    if (thresholds.userIntentAlignment.value < thresholds.userIntentAlignment.threshold) {
      recommendations.push({
        priority: "high",
        title: "Align Content with User Intent",
        description: "Restructure content to match what users are searching for.",
        impact: "Higher click-through rates and better rankings",
      });
    }
  }

  private addTechnicalRecommendations(
    recommendations: SEORecommendation[],
    technical: TechnicalSEODetails
  ): void {
    if (!technical.schema?.hasStructuredData) {
      recommendations.push({
        priority: "high",
        title: "Implement Schema Markup",
        description: "Add structured data (JSON-LD) for better search understanding.",
        impact: "Improved rich snippets and search visibility",
      });
    }

    if (!technical.metaTags.hasOgTags) {
      recommendations.push({
        priority: "medium",
        title: "Add Open Graph Tags",
        description: "Implement Open Graph meta tags for better social sharing.",
        impact: "Better social media sharing and traffic",
      });
    }

    if (technical.links.internal < 5) {
      recommendations.push({
        priority: "medium",
        title: "Optimize Internal Linking",
        description: `You have ${technical.links.internal} internal links. Add more contextual links.`,
        impact: "Better page authority distribution",
      });
    }

    if (!technical.mobile.responsive) {
      recommendations.unshift({
        priority: "high",
        title: "Implement Mobile Responsiveness",
        description: "Ensure your website works well on all device sizes.",
        impact: "Better mobile search rankings",
      });
    }

    if (technical.performance.pageSize && 
        technical.performance.pageSize > SEO_CONSTANTS.LIMITS.PAGE_SIZE_WARNING) {
      const sizeKB = Math.round(technical.performance.pageSize / 1024);
      recommendations.push({
        priority: "medium",
        title: "Optimize Page Size",
        description: `Page size is ${sizeKB}KB. Consider optimizing images and code.`,
        impact: "Faster loading times",
      });
    }
  }

  private addIssueBasedRecommendations(
    recommendations: SEORecommendation[],
    issues: SEOIssue[]
  ): void {
    const criticalIssues = issues.filter(i => i.type === "critical");
    if (criticalIssues.length > 0) {
      recommendations.unshift({
        priority: "high",
        title: "Fix Critical SEO Issues",
        description: `Address ${criticalIssues.length} critical issues: ${
          criticalIssues.map(i => i.title).join(", ")
        }`,
        impact: "Significant improvement in search rankings",
      });
    }
  }

  //Score Calculation
  private calculateEnhancedScore(
    issues: SEOIssue[],
    pageSpeedScore: number,
    technicalDetails: TechnicalSEODetails,
    contentAnalysis: ContentAnalysisResult
  ): number {
    let baseScore = 100;
    const issueImpact = { critical: 12, warning: 6, info: 2 };
    
    for (const issue of issues) {
      baseScore -= issueImpact[issue.type];
    }

    const contentScore = this.calculateContentScore(contentAnalysis);
    const technicalScore = this.calculateTechnicalScore(baseScore, technicalDetails);
    const weights = SEO_CONSTANTS.WEIGHTS;
    const finalScore = 
      contentScore * weights.CONTENT +
      technicalScore * weights.TECHNICAL +
      pageSpeedScore * weights.SPEED;

    return Math.max(0, Math.min(100, Math.round(finalScore)));
  }

  private calculateContentScore(content: ContentAnalysisResult): number {
    return (
      content.qualityScore * 0.3 +
      content.eatScore.overall * 0.25 +
      content.readabilityScore * 0.15 +
      content.userIntentAlignment * 0.15 +
      content.uniquenessScore * 0.15
    );
  }

  private calculateTechnicalScore(
    baseScore: number,
    technical: TechnicalSEODetails
  ): number {
    let score = baseScore;
    const bonuses = [
      {
        condition: technical.metaTags.hasTitle &&
                  technical.metaTags.titleLength <= SEO_CONSTANTS.LIMITS.TITLE_MAX &&
                  technical.metaTags.titleLength >= SEO_CONSTANTS.LIMITS.TITLE_OPTIMAL_MIN,
        points: 5
      },
      {
        condition: technical.metaTags.hasDescription &&
                  technical.metaTags.descriptionLength <= SEO_CONSTANTS.LIMITS.DESCRIPTION_MAX &&
                  technical.metaTags.descriptionLength >= SEO_CONSTANTS.LIMITS.DESCRIPTION_MIN,
        points: 5
      },
      {
        condition: technical.headings.h1Count === 1,
        points: 3
      },
      {
        condition: technical.mobile.responsive && technical.mobile.viewportMeta,
        points: 5
      },
      {
        condition: technical.schema?.hasStructuredData,
        points: 5
      },
      {
        condition: technical.metaTags.hasOgTags,
        points: 3
      },
      {
        condition: technical.images.withoutAlt === 0 && technical.images.total > 0,
        points: 3
      }
    ];

    for (const bonus of bonuses) {
      if (bonus.condition) score += bonus.points;
    }

    return score;
  }
}

export const seoService = new EnhancedSEOService();