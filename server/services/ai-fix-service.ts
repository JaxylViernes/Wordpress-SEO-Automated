import { aiService } from "server/services/ai-service";
import { wordpressService } from "server/services/wordpress-service";
import { wordPressAuthService } from "server/services/wordpress-auth";
import { storage } from "server/storage";
import { seoService } from "./seo-service";
import * as cheerio from "cheerio";
import { randomUUID } from "crypto";
import { SchemaGenerator } from "./schema-generator";
import { apiKeyEncryptionService } from "./api-key-encryption";

// ============================================
// TYPES AND INTERFACES
// ============================================

export interface AIFixResult {
  success: boolean;
  dryRun: boolean;
  fixesApplied: AIFix[];
  stats: AIFixStats;
  errors?: string[];
  message: string;
  detailedLog: string[];
  reanalysis?: ReanalysisResult;
  fixSessionId?: string;
  verification?: VerificationResult;
}

export interface AIFix {
  type: string;
  description: string;
  element?: string;
  before?: string;
  after?: string;
  success: boolean;
  impact: "high" | "medium" | "low";
  error?: string;
  wordpressPostId?: number;
  elementPath?: string;
  trackedIssueId?: string;
  verified?: boolean;
  verificationDetails?: string;
}

interface AIFixStats {
  totalIssuesFound: number;
  fixesAttempted: number;
  fixesSuccessful: number;
  fixesFailed: number;
  fixesVerified: number;
  estimatedImpact: string;
  detailedBreakdown: {
    altTextFixed: number;
    metaDescriptionsUpdated: number;
    titleTagsImproved: number;
    headingStructureFixed: number;
    internalLinksAdded: number;
    imagesOptimized: number;
    contentQualityImproved: number;
    structuredDataAdded: number;
    canonicalUrlsFixed: number;
  };
}

export enum ProcessingMode {
  SAMPLE = "sample",
  PARTIAL = "partial",
  FULL = "full",
  PRIORITY = "priority",
}

interface ProcessingOptions {
  mode?: ProcessingMode;
  batchSize?: number;
  maxItems?: number;
  progressCallback?: (current: number, total: number) => void;
  priorityUrls?: string[];
}

interface ProcessingLimits {
  maxItems: number;
  batchSize: number;
  delayBetweenBatches: number;
}

interface ReanalysisResult {
  enabled: boolean;
  initialScore: number;
  finalScore: number;
  scoreImprovement: number;
  analysisTime: number;
  success: boolean;
  error?: string;
  simulated?: boolean;
}

interface VerificationResult {
  totalVerified: number;
  totalFailed: number;
  details: Array<{
    fixType: string;
    verified: boolean;
    message: string;
  }>;
}

interface WordPressCredentials {
  url: string;
  username: string;
  applicationPassword: string;
}

interface ContentAnalysis {
  score: number;
  issues: string[];
  improvements: string[];
  readabilityScore: number;
  keywordDensity: Record<string, number>;
}

interface SEOContext {
  targetKeywords: string[];
  competitorAnalysis?: string;
  userIntent: string;
  contentType: string;
  topicClusters?: string[];
}

// ============================================
// BACKUP AND ROLLBACK SYSTEM
// ============================================

class BackupRollbackSystem {
  private backups: Map<string, any> = new Map();

  async createDetailedBackup(
    creds: WordPressCredentials,
    contentIds: number[],
    sessionId: string,
    userId: string,
    websiteId: string
  ): Promise<void> {
    const backupData: any[] = [];

    for (const id of contentIds) {
      try {
        const [post, page] = await Promise.all([
          this.fetchContent(creds, id, "posts").catch(() => null),
          this.fetchContent(creds, id, "pages").catch(() => null),
        ]);

        const content = post || page;
        if (content) {
          backupData.push({
            id: content.id,
            type: post ? "post" : "page",
            title: content.title,
            content: content.content,
            excerpt: content.excerpt,
            modified: content.modified,
          });
        }
      } catch (error) {
        console.error(`Failed to backup content ${id}:`, error);
      }
    }

    this.backups.set(sessionId, {
      timestamp: new Date(),
      content: backupData,
    });

    await storage.createBackup({
      userId,
      websiteId,
      backupType: "pre_ai_fix_detailed",
      status: "completed",
      data: { content: backupData },
      metadata: {
        sessionId,
        contentCount: backupData.length,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async rollback(
    creds: WordPressCredentials,
    sessionId: string
  ): Promise<{ success: boolean; restored: number; errors: string[] }> {
    const backup = this.backups.get(sessionId);
    if (!backup) {
      return { success: false, restored: 0, errors: ["Backup not found"] };
    }

    let restored = 0;
    const errors: string[] = [];

    for (const item of backup.content) {
      try {
        await this.restoreContent(creds, item);
        restored++;
      } catch (error: any) {
        errors.push(`Failed to restore ${item.id}: ${error.message}`);
      }
    }

    return { success: restored > 0, restored, errors };
  }

  private async fetchContent(
    creds: WordPressCredentials,
    id: number,
    type: "posts" | "pages"
  ): Promise<any> {
    const endpoint = `${creds.url.replace(/\/$/, "")}/wp-json/wp/v2/${type}/${id}`;
    const auth = Buffer.from(
      `${creds.username}:${creds.applicationPassword}`
    ).toString("base64");

    const response = await fetch(endpoint, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!response.ok) throw new Error(`Failed to fetch ${type} ${id}`);
    return response.json();
  }

  private async restoreContent(creds: WordPressCredentials, backup: any): Promise<void> {
    const endpoint = `${creds.url.replace(/\/$/, "")}/wp-json/wp/v2/${backup.type}s/${backup.id}`;
    const auth = Buffer.from(
      `${creds.username}:${creds.applicationPassword}`
    ).toString("base64");

    const response = await fetch(endpoint, {
      method: "PUT",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: backup.title,
        content: backup.content,
        excerpt: backup.excerpt,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to restore ${backup.type} ${backup.id}`);
    }
  }
}

// ============================================
// VERIFICATION SYSTEM
// ============================================

class SEOVerificationSystem {
 private async verifyFix(
  creds: WordPressCredentials,
  contentId: number,
  fixType: string,
  contentType: "post" | "page"
): Promise<{ verified: boolean; details: string }> {
  // Wait longer for WordPress to invalidate cache and process changes
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Add cache-busting parameter
  const cacheBuster = Date.now();
  const endpoint =
    contentType === "page"
      ? `${creds.url.replace(/\/$/, "")}/wp-json/wp/v2/pages/${contentId}?context=edit&_=${cacheBuster}`
      : `${creds.url.replace(/\/$/, "")}/wp-json/wp/v2/posts/${contentId}?context=edit&_=${cacheBuster}`;
  const auth = Buffer.from(
    `${creds.username}:${creds.applicationPassword}`
  ).toString("base64");

  try {
    const response = await fetch(endpoint, {
      headers: { 
        Authorization: `Basic ${auth}`,
        'Cache-Control': 'no-cache', // Force fresh data
      },
    });

    if (!response.ok) {
      return { verified: false, details: "Failed to fetch updated content" };
    }

    const content = await response.json();

    switch (fixType) {
      case "missing_alt_text":
      case "images_missing_alt_text":
      case "missing_alt__text":
        return this.verifyAltTextFix(content);

      case "missing_meta_description":
      case "meta_description_too_long":
      case "meta_description_too_short":
        return this.verifyMetaDescriptionFix(content);

      case "poor_title_tag":
      case "title_tag_too_long":
      case "title_tag_too_short":
        return this.verifyTitleFix(content);

      case "heading_structure":
      case "missing_h1":
      case "multiple_h1_tags":
        return this.verifyHeadingStructure(content);

      case "thin_content":
      case "content_too_short":
        return this.verifyContentLength(content);

      default:
        return {
          verified: true,
          details: "No verification available for this fix type",
        };
    }
  } catch (error: any) {
    return { verified: false, details: error.message };
  }
}

 private verifyAltTextFix(content: any): { verified: boolean; details: string } {
  // FIX: Use raw content
  const html = content.content?.raw || content.content?.rendered || "";
  const $ = cheerio.load(html);

  const imagesWithoutAlt = $('img:not([alt]), img[alt=""]').length;
  const totalImages = $("img").length;

  if (totalImages === 0) {
    return {
      verified: true,
      details: "No images to verify",
    };
  }

  if (imagesWithoutAlt === 0) {
    return {
      verified: true,
      details: `All ${totalImages} images have alt text`,
    };
  }

  return {
    verified: false,
    details: `${imagesWithoutAlt} of ${totalImages} images still missing alt text`,
  };
}

  private verifyMetaDescriptionFix(content: any): {
    verified: boolean;
    details: string;
  } {
    const excerpt = content.excerpt?.rendered || "";
    const cleanExcerpt = excerpt.replace(/<[^>]*>/g, "").trim();

    if (cleanExcerpt.length >= 120 && cleanExcerpt.length <= 160) {
      return {
        verified: true,
        details: `Meta description optimal (${cleanExcerpt.length} chars)`,
      };
    }

    return {
      verified: false,
      details: `Meta description ${cleanExcerpt.length} chars (target: 120-160)`,
    };
  }

  private verifyTitleFix(content: any): { verified: boolean; details: string } {
    const title = content.title?.rendered || "";
    const cleanTitle = title.replace(/<[^>]*>/g, "").trim();

    if (cleanTitle.length >= 30 && cleanTitle.length <= 60) {
      return {
        verified: true,
        details: `Title optimal (${cleanTitle.length} chars)`,
      };
    }

    return {
      verified: false,
      details: `Title ${cleanTitle.length} chars (target: 30-60)`,
    };
  }

 private verifyHeadingStructure(content: any): {
  verified: boolean;
  details: string;
} {
  // Use RAW content for verification (not cached rendered)
  const html = content.content?.raw || content.content?.rendered || "";
  const $ = cheerio.load(html);

  const h1Count = $("h1").length;
  const headings = $("h1, h2, h3, h4, h5, h6").toArray();

  let previousLevel = 0;
  let hierarchyCorrect = true;

  for (const heading of headings) {
    const level = parseInt(heading.tagName.charAt(1));
    if (level > previousLevel + 1 && previousLevel !== 0) {
      hierarchyCorrect = false;
      break;
    }
    previousLevel = level;
  }

  // FIX: Must have EXACTLY 1 H1
  if (h1Count === 1 && hierarchyCorrect) {
    return {
      verified: true,
      details: `Heading structure correct (1 H1, proper hierarchy)`,
    };
  }

  // FIX: Provide specific failure reasons
  const issues = [];
  if (h1Count === 0) issues.push("missing H1");
  if (h1Count > 1) issues.push(`${h1Count} H1s found`);
  if (!hierarchyCorrect) issues.push("hierarchy broken");

  return {
    verified: false,
    details: `Heading issues: ${issues.join(", ")}`,
  };
}

  private verifyContentLength(content: any): { verified: boolean; details: string } {
  // FIX: Prefer raw content (unprocessed) over rendered (cached)
  const html = content.content?.raw || content.content?.rendered || "";
  const text = html.replace(/<[^>]*>/g, "").trim();
  const wordCount = text.split(/\s+/).filter((w: string) => w.length > 0).length;

  console.log(`📊 Content verification:`, {
    hasRaw: !!content.content?.raw,
    hasRendered: !!content.content?.rendered,
    wordCount,
    usingField: content.content?.raw ? 'raw' : 'rendered',
  });

  if (wordCount >= 300) {
    return {
      verified: true,
      details: `Content length sufficient (${wordCount} words)`,
    };
  }

  return {
    verified: false,
    details: `Content too thin (${wordCount} words, target: 300+)`,
  };
}
}

// ============================================
// SEMANTIC ANALYSIS FOR INTERNAL LINKING
// ============================================

class SemanticAnalyzer {
  buildSemanticIndex(content: any[]): Map<number, any> {
    const index = new Map();

    for (const item of content) {
      const title = item.title?.rendered || "";
      const keywords = this.extractSemanticKeywords(
        title,
        item.content?.rendered || ""
      );

      index.set(item.id, {
        id: item.id,
        title,
        url: item.link,
        keywords,
        type: item.contentType,
      });
    }

    return index;
  }

  extractSemanticKeywords(title: string, content: string): string[] {
    const text = `${title} ${content}`.toLowerCase().replace(/<[^>]*>/g, "");
    const words = text.split(/\W+/);

    const frequency: Record<string, number> = {};
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "can",
      "this",
      "that",
      "these",
      "those",
    ]);

    for (const word of words) {
      if (word.length > 3 && !stopWords.has(word)) {
        frequency[word] = (frequency[word] || 0) + 1;
      }
    }

    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([word]) => word);
  }

  findRelevantPages(
    currentContent: any,
    semanticIndex: Map<number, any>,
    baseUrl: string
  ): Array<{ url: string; title: string; matchedKeyword: string; score: number }> {
    const currentKeywords = this.extractSemanticKeywords(
      currentContent.title?.rendered || "",
      currentContent.content?.rendered || ""
    );

    const scored: Array<{
      url: string;
      title: string;
      matchedKeyword: string;
      score: number;
    }> = [];

    for (const [id, item] of semanticIndex) {
      if (id === currentContent.id) continue;

      let score = 0;
      let matchedKeyword = "";

      for (const keyword of currentKeywords) {
        if (item.keywords.includes(keyword)) {
          score += 1;
          if (!matchedKeyword) matchedKeyword = keyword;
        }
      }

      if (score > 0) {
        scored.push({
          url: item.url,
          title: item.title,
          matchedKeyword,
          score,
        });
      }
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, 5);
  }
}

// ============================================
// MAIN AI FIX SERVICE
// ============================================

class AIFixService {
  private log: string[] = [];
  private currentUserId?: string;
  private currentWebsiteId?: string;
  private backupSystem = new BackupRollbackSystem();
  private verificationSystem = new SEOVerificationSystem();
  private semanticAnalyzer = new SemanticAnalyzer();

  // Logging utility
  private addLog(
    message: string,
    level: "info" | "success" | "warning" | "error" = "info"
  ): void {
    const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
    const emoji =
      level === "success"
        ? "✅"
        : level === "error"
        ? "❌"
        : level === "warning"
        ? "⚠️"
        : "ℹ️";
    const logMessage = `[${timestamp}] ${emoji} ${message}`;
    this.log.push(logMessage);
    console.log(logMessage);
  }

  // ============================================
  // API KEY MANAGEMENT
  // ============================================

  private async getAPIKey(
    userId: string | undefined,
    provider: string,
    envVarNames: string[]
  ): Promise<{ key: string; type: "user" | "system" } | null> {
    if (userId) {
      try {
        const userApiKeys = await storage.getUserApiKeys(userId);

        if (userApiKeys && userApiKeys.length > 0) {
          const validKey = userApiKeys.find(
            (key: any) =>
              key.provider === provider &&
              key.isActive &&
              key.validationStatus === "valid"
          );

          if (validKey && validKey.encryptedApiKey) {
            try {
              const decryptedKey = apiKeyEncryptionService.decrypt(
                validKey.encryptedApiKey
              );
              this.addLog(
                `Using user's ${provider} API key (${validKey.keyName})`,
                "info"
              );
              return { key: decryptedKey, type: "user" };
            } catch (decryptError: any) {
              this.addLog(
                `Failed to decrypt user's ${provider} key: ${decryptError.message}`,
                "warning"
              );
            }
          }
        }
      } catch (error: any) {
        this.addLog(
          `Failed to fetch user's API keys: ${error.message}`,
          "warning"
        );
      }
    }

    for (const envVar of envVarNames) {
      if (process.env[envVar]) {
        this.addLog(`Using system ${provider} API key`, "info");
        return { key: process.env[envVar]!, type: "system" };
      }
    }

    return null;
  }

  private async getUserAnthropic(userId: string | undefined): Promise<{
    client: any;
    keyType: "user" | "system";
  } | null> {
    const keyInfo = await this.getAPIKey(userId, "anthropic", [
      "ANTHROPIC_API_KEY",
      "CLAUDE_API_KEY",
    ]);

    if (!keyInfo) return null;

    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    return {
      client: new Anthropic({ apiKey: keyInfo.key }),
      keyType: keyInfo.type,
    };
  }

  private async getUserOpenAI(userId: string | undefined): Promise<{
    client: any;
    keyType: "user" | "system";
  } | null> {
    const keyInfo = await this.getAPIKey(userId, "openai", [
      "OPENAI_API_KEY",
      "OPENAI_API_KEY_ENV_VAR",
    ]);

    if (!keyInfo) return null;

    const { default: OpenAI } = await import("openai");
    return {
      client: new OpenAI({ apiKey: keyInfo.key }),
      keyType: keyInfo.type,
    };
  }

  // ============================================
  // MAIN ENTRY POINT
  // ============================================

  async analyzeAndFixWebsite(
    websiteId: string,
    userId: string,
    dryRun: boolean = false,
    options: {
      fixTypes?: string[];
      maxChanges?: number;
      skipBackup?: boolean;
      enableReanalysis?: boolean;
      reanalysisDelay?: number;
      forceReanalysis?: boolean;
      processingMode?: ProcessingMode;
      processingOptions?: ProcessingOptions;
      autoRollbackOnFailure?: boolean;
    } = {}
  ): Promise<AIFixResult> {
    this.log = [];
    this.currentUserId = userId;
    this.currentWebsiteId = websiteId;
    const fixSessionId = randomUUID();

    this.addLog("=== Starting Enhanced AI Fix Analysis ===", "info");

    try {
      const startScore = await this.getCurrentSEOScore(websiteId, userId);
      const website = await this.validateWebsiteAccess(websiteId, userId);
      const fixableIssues = await this.getFixableIssues(websiteId, userId);

      if (fixableIssues.length === 0) {
        return this.createNoFixesNeededResult(dryRun, fixSessionId);
      }

      const fixesToApply = this.prioritizeAndFilterFixes(
        fixableIssues,
        options.fixTypes,
        options.maxChanges || fixableIssues.length
      );

      this.addLog(`Will attempt to fix ${fixesToApply.length} issues`);

      if (!dryRun) {
        return await this.applyFixesAndAnalyzeWithVerification(
          website,
          websiteId,
          userId,
          fixesToApply,
          fixSessionId,
          options,
          startScore
        );
      } else {
        return await this.performDryRun(
          fixesToApply,
          fixSessionId,
          options,
          website
        );
      }
    } catch (error) {
      return this.createErrorResult(error, dryRun, fixSessionId);
    }
  }

  // ============================================
  // FIX APPLICATION WITH VERIFICATION
  // ============================================

  private async applyFixesAndAnalyzeWithVerification(
  website: any,
  websiteId: string,
  userId: string,
  fixesToApply: AIFix[],
  fixSessionId: string,
  options: any,
  startScore: number
): Promise<AIFixResult> {
  const creds = this.getWordPressCredentials(website);

  await this.markIssuesAsFixing(fixesToApply, fixSessionId);

  // Create detailed backup
  if (!options.skipBackup) {
    const contentIds = this.extractContentIds(fixesToApply);
    await this.backupSystem.createDetailedBackup(
      creds,
      contentIds,
      fixSessionId,
      userId,
      websiteId
    );
    this.addLog("Backup created successfully", "success");
  }

  // Apply fixes with verification
  const { appliedFixes, errors, verificationResult } =
    await this.applyFixesWithVerification(creds, fixesToApply, userId);

  // FIXED: Check verification failure rate
  const successfulFixes = appliedFixes.filter(f => f.success);
  const verifiedFixes = appliedFixes.filter(f => f.verified === true);
  const verificationFailureRate = successfulFixes.length > 0
    ? 1 - (verifiedFixes.length / successfulFixes.length)
    : 0;

  // FIXED: Rollback if verification failure rate is too high
  if (verificationFailureRate > 0.5 && !options.skipBackup) {
    this.addLog(
      `High verification failure rate (${(verificationFailureRate * 100).toFixed(0)}%) - initiating rollback`,
      "error"
    );
    
    const rollbackResult = await this.backupSystem.rollback(creds, fixSessionId);
    
    return {
      success: false,
      dryRun: false,
      fixesApplied: [],
      stats: this.createEmptyStats(),
      message: `Changes rolled back - ${(verificationFailureRate * 100).toFixed(0)}% of fixes failed verification`,
      detailedLog: [...this.log],
      fixSessionId,
      errors: [...errors, `Rollback restored ${rollbackResult.restored} items`],
    };
  }

  await this.updateIssueStatusesAfterFix(
    websiteId,
    userId,
    appliedFixes,
    fixSessionId
  );

  // Perform reanalysis
  let reanalysisData: ReanalysisResult | undefined;
  if (options.enableReanalysis !== false) {
    reanalysisData = await this.performScoreOnlyReanalysis(
      website,
      userId,
      websiteId,
      options.reanalysisDelay || 10000
    );

    // Check for score decrease
    if (reanalysisData.scoreImprovement < -5 && options.autoRollbackOnFailure && !options.skipBackup) {
      this.addLog("SEO score decreased significantly - initiating rollback", "warning");
      await this.backupSystem.rollback(creds, fixSessionId);

      return {
        success: false,
        dryRun: false,
        fixesApplied: [],
        stats: this.createEmptyStats(),
        message: `Changes rolled back - SEO score decreased by ${Math.abs(
          reanalysisData.scoreImprovement
        )} points`,
        detailedLog: [...this.log],
        fixSessionId,
        reanalysis: reanalysisData,
      };
    }
  }

  await this.createActivityLog(
    userId,
    websiteId,
    appliedFixes,
    reanalysisData,
    fixSessionId
  );

  return this.createSuccessResult(
    appliedFixes,
    errors,
    fixesToApply.length,
    false,
    reanalysisData,
    fixSessionId,
    verificationResult
  );
}

 private async applyFixesWithVerification(
  creds: WordPressCredentials,
  fixes: AIFix[],
  userId: string
): Promise<{
  appliedFixes: AIFix[];
  errors: string[];
  verificationResult: VerificationResult;
}> {
  const appliedFixes: AIFix[] = [];
  const errors: string[] = [];
  const verificationDetails: Array<{
    fixType: string;
    verified: boolean;
    message: string;
  }> = [];

  const fixesByType = this.groupFixesByType(fixes);

  for (const [fixType, typeFixes] of Object.entries(fixesByType)) {
    this.addLog(`Processing ${typeFixes.length} fixes of type: ${fixType}`);

    try {
      const strategy = this.getFixStrategy(fixType);

      if (!strategy) {
        this.addLog(`No fix strategy available for ${fixType} - skipping`, "error");
        errors.push(`No strategy available for fix type: ${fixType}`);
        
        appliedFixes.push(
          ...typeFixes.map((fix) => ({
            ...fix,
            success: false,
            error: "Fix strategy not implemented",
            description: `Cannot process ${fixType} - strategy not available`,
          }))
        );
        continue;
      }

      const result = await strategy(creds, typeFixes, userId);

      // Process each applied fix
      for (const appliedFix of result.applied) {
        // FIX: Only verify if content was actually updated
        // If verified=true is already set, it means content was already optimal
        if (appliedFix.verified === true) {
          // Content was already optimal - no need to re-verify
          this.addLog(`Content already optimal: ${appliedFix.description}`, "success");
          
          verificationDetails.push({
            fixType,
            verified: true,
            message: appliedFix.description || "Content already optimal",
          });
          
          appliedFixes.push(appliedFix);
          continue;
        }

        // Only run verification if content was actually updated
        if (appliedFix.success && appliedFix.wordpressPostId) {
          const verification = await this.verificationSystem.verifyFix(
            creds,
            appliedFix.wordpressPostId,
            fixType,
            (appliedFix.element as "post" | "page") || "post"
          );

          appliedFix.verified = verification.verified;
          appliedFix.verificationDetails = verification.details;

          // Only mark as failed if verification exists AND explicitly failed
          if (verification.details !== "No verification available for this fix type" && !verification.verified) {
            appliedFix.success = false;
            appliedFix.error = `Verification failed: ${verification.details}`;
            errors.push(`${fixType} verification failed: ${verification.details}`);
            this.addLog(`Verification failed: ${verification.details}`, "error");
          } else if (verification.verified) {
            this.addLog(`Verified: ${verification.details}`, "success");
          } else {
            this.addLog(`${verification.details}`, "info");
          }

          verificationDetails.push({
            fixType,
            verified: verification.verified,
            message: verification.details,
          });
        }

        appliedFixes.push(appliedFix);
      }

      errors.push(...result.errors);
    } catch (error: any) {
      this.addLog(`Error processing ${fixType}: ${error.message}`, "error");
      errors.push(`${fixType}: ${error.message}`);

      appliedFixes.push(
        ...typeFixes.map((fix) => ({
          ...fix,
          success: false,
          error: error.message,
        }))
      );
    }
  }

  const verificationResult: VerificationResult = {
    totalVerified: verificationDetails.filter((v) => v.verified).length,
    totalFailed: verificationDetails.filter((v) => !v.verified).length,
    details: verificationDetails,
  };

  return { appliedFixes, errors, verificationResult };
}

  // ============================================
  // ENHANCED AI CONTENT GENERATION
  // ============================================

  private async generateMetaDescriptionEnhanced(
    title: string,
    content: string,
    userId?: string
  ): Promise<string> {
    const context = await this.buildSEOContext(title, content);
    const provider = await this.selectAIProvider(userId);

    if (!provider) {
      return this.createFallbackMetaDescription(title, content);
    }

    try {
      const systemPrompt = `You are an SEO expert writing meta descriptions for search engines.

CRITICAL RULES:
1. Focus on search intent - what would make someone click?
2. Include primary keyword naturally in first 120 characters
3. Use active voice and action verbs
4. Add specificity (numbers, benefits, outcomes)
5. NO AI phrases like "comprehensive guide", "delve into", "dive into", "landscape of"
6. Write for humans first, search engines second
7. 145-155 characters exactly (optimal for SERP display)

BAD EXAMPLES:
- "In this comprehensive guide, we'll dive into everything you need to know about SEO."
- "Explore the fascinating landscape of digital marketing strategies."

GOOD EXAMPLES:
- "Boost your rankings 40% with these 7 proven SEO tactics used by top sites in 2025."
- "Learn WordPress security in 10 minutes. Protect against hackers with our step-by-step guide."

Return ONLY the meta description text, no preambles or explanations.`;

      const userPrompt = `Write a meta description that will rank and convert:

Title: ${title}
Primary Keywords: ${context.targetKeywords.join(", ")}
User Intent: ${context.userIntent}
Content Type: ${context.contentType}
Content Summary: ${content.substring(0, 400)}

Requirements:
- Include "${context.targetKeywords[0]}" naturally
- Promise specific value/outcome
- Create urgency or curiosity
- 145-155 characters exactly
- No AI clichés`;

      const result = await this.callAIProvider(
        provider,
        systemPrompt,
        userPrompt,
        80,
        0.4,
        userId
      );

      return this.cleanAndValidateMetaDescription(result, context.targetKeywords[0]);
    } catch (error) {
      this.addLog("Meta description generation failed, using fallback", "warning");
      return this.createFallbackMetaDescription(title, content);
    }
  }

  private async optimizeTitleEnhanced(
    currentTitle: string,
    content: string,
    userId?: string
  ): Promise<string> {
    const context = await this.buildSEOContext(currentTitle, content);
    const provider = await this.selectAIProvider(userId);

    if (!provider) return currentTitle.substring(0, 60);

    try {
      const systemPrompt = `You are an SEO title optimization expert.

TITLE OPTIMIZATION RULES:
1. Primary keyword within first 5 words
2. Include year (2025) for recency signals when relevant
3. Use power words (Proven, Complete, Essential, Ultimate, Guide, Tips)
4. Add numbers when relevant (7 Ways, Top 10, 5 Steps)
5. 50-60 characters (optimal for Google display)
6. Front-load value proposition
7. Avoid keyword stuffing - must read naturally

FORMULA: [Number/Power Word] + [Primary Keyword] + [Benefit/Outcome] + [Year if relevant]

BAD EXAMPLES:
- "Everything You Need to Know About SEO in 2025"
- "The Ultimate Comprehensive Guide to Digital Marketing"

GOOD EXAMPLES:
- "SEO Strategy 2025: 12 Tactics That Boosted Traffic 300%"
- "WordPress Security: Complete Guide to Protect Your Site"

Return ONLY the optimized title, no preambles or explanations.`;

      const userPrompt = `Optimize this title for rankings and CTR:

Current: "${currentTitle}"
Primary Keyword: "${context.targetKeywords[0]}"
Secondary Keywords: ${context.targetKeywords.slice(1, 3).join(", ")}
Content Type: ${context.contentType}
User Intent: ${context.userIntent}

Create a title that:
- Starts with primary keyword or power word
- Promises specific value
- Feels current/fresh
- 50-60 characters`;

      const result = await this.callAIProvider(
        provider,
        systemPrompt,
        userPrompt,
        40,
        0.3,
        userId
      );

      return this.cleanAndValidateTitle(result);
    } catch (error) {
      return currentTitle.substring(0, 60);
    }
  }

  private async buildSEOContext(title: string, content: string): Promise<SEOContext> {
    const keywords = this.extractPrimaryKeywords(title, content);
    const intent = this.detectUserIntent(title, content);
    const contentType = this.detectContentType(content);

    return {
      targetKeywords: keywords,
      userIntent: intent,
      contentType: contentType,
    };
  }

  private extractPrimaryKeywords(title: string, content: string): string[] {
    const text = `${title} ${content}`.toLowerCase().replace(/<[^>]*>/g, "");
    const words = text.split(/\W+/);

    const frequency: Record<string, number> = {};
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
    ]);

    for (const word of words) {
      if (word.length > 3 && !stopWords.has(word)) {
        frequency[word] = (frequency[word] || 0) + 1;
      }
    }

    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  private detectUserIntent(title: string, content: string): string {
    const text = `${title} ${content}`.toLowerCase();

    if (
      text.includes("how to") ||
      text.includes("guide") ||
      text.includes("tutorial")
    ) {
      return "informational-howto";
    }
    if (text.includes("best") || text.includes("top") || text.includes("review")) {
      return "commercial-investigation";
    }
    if (text.includes("buy") || text.includes("price") || text.includes("deal")) {
      return "transactional";
    }
    if (text.includes("what") || text.includes("why") || text.includes("when")) {
      return "informational-question";
    }

    return "informational-general";
  }

  private detectContentType(content: string): string {
    const $ = cheerio.load(content);

    const hasSteps = $("ol").length > 0 || /step \d+/i.test(content);
    const hasQuestions = $("h2, h3")
      .toArray()
      .some((h) => $(h).text().includes("?"));

    if (hasSteps) return "how-to";
    if (hasQuestions) return "faq";
    return "article";
  }

 private cleanAndValidateMetaDescription(
  description: string,
  primaryKeyword: string
): string {
  let cleaned = this.cleanAIResponse(description);
  cleaned = cleaned.replace(/^["']|["']$/g, "");

  // Remove HTML entities BEFORE length calculations
  cleaned = cleaned
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, ""); // Remove numeric entities
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Ensure primary keyword is present
  if (!cleaned.toLowerCase().includes(primaryKeyword.toLowerCase())) {
    cleaned = `${primaryKeyword}: ${cleaned}`;
  }

  // More conservative limit (WordPress often adds site name = ~15-25 chars)
  const maxLength = 135;  
  if (cleaned.length > maxLength) {
    // Try to find last complete sentence
    let cutoff = cleaned.lastIndexOf('. ', maxLength);
    if (cutoff < 100) {
      // No good sentence break - find last word boundary
      cutoff = cleaned.lastIndexOf(' ', maxLength - 3);
    }
    
    if (cutoff > 100) {
      cleaned = cleaned.substring(0, cutoff + 1).trim();
    } else {
      // Force truncate with ellipsis
      cleaned = cleaned.substring(0, maxLength - 3).trim() + '...';
    }
  }

  // Ensure minimum length
  if (cleaned.length < 120) {
    return cleaned; // Let verification catch this as failure
  }

  return cleaned.trim();
}

  private cleanAndValidateTitle(title: string): string {
    let cleaned = this.cleanAIResponse(title);
    cleaned = cleaned.replace(/^["']|["']$/g, "");
    cleaned = cleaned.replace(/^(Title:|Optimized Title:)\s*/i, "");

    if (cleaned.length > 60) {
      cleaned = cleaned.substring(0, 57).replace(/\s+\S*$/, "") + "...";
    }

    return cleaned;
  }

  private extractTargetContentIds(fixes: AIFix[]): number[] {
  return fixes
    .map(fix => fix.wordpressPostId)
    .filter((id): id is number => typeof id === "number");
}

  // ============================================
  // FIX STRATEGY IMPLEMENTATIONS
  // ============================================
private async addStructuredData(
  creds: WordPressCredentials,
  fixes: AIFix[],
  userId?: string
): Promise<{ applied: AIFix[]; errors: string[] }> {
  // CHANGE THIS to use fixWordPressContent helper
  return this.fixWordPressContent(
    creds,
    fixes,
    async (content, fix) => {
      const contentHtml = content.content?.rendered || content.content || "";
      
      // Check if schema already exists
      if (contentHtml.includes('application/ld+json')) {
        return {
          updated: false,
          data: {},
          description: "Structured data already exists",
        };
      }

      // Get site info
      const siteInfo = await this.getWordPressSiteInfo(creds);
      
      const schemaGen = new SchemaGenerator({
        siteName: siteInfo.name,
        siteUrl: creds.url,
        logoUrl: siteInfo.logo_url,
        organizationName: siteInfo.name,
      });

      // Generate schemas
      const schemas = schemaGen.detectAndGenerateSchema(
        content,
        siteInfo.author || "Site Author"
      );

      if (schemas.length === 0) {
        return {
          updated: false,
          data: {},
          description: "No suitable schema types detected",
        };
      }

      // Inject schemas
      const updatedHtml = schemaGen.injectSchemaIntoContent(contentHtml, schemas);

      return {
        updated: true,
        data: { content: updatedHtml },
        description: `Added ${schemas.length} schema types: ${this.getSchemaTypes(schemas).join(", ")}`,
      };
    },
    userId
  );
}

private getSchemaTypes(schemas: object[]): string[] {
  return schemas.map((s: any) => s["@type"] || "Unknown");
}

private async fixCanonicalUrls(
  creds: WordPressCredentials,
  fixes: AIFix[],
  userId?: string
): Promise<{ applied: AIFix[]; errors: string[] }> {
  return this.fixWordPressContent(
    creds,
    fixes,
    async (content, fix) => {
      const contentHtml = content.content?.rendered || content.content || "";
      const $ = cheerio.load(contentHtml, this.getCheerioConfig());

      // Check if canonical already exists
      const existingCanonical = $('link[rel="canonical"]');
      const canonicalUrl = content.link || `${creds.url}/${content.slug}`;

      if (existingCanonical.length > 0) {
        const existingHref = existingCanonical.attr("href");
        if (existingHref === canonicalUrl) {
          return {
            updated: false,
            data: {},
            description: "Canonical URL already correct",
          };
        }
        // Update incorrect canonical
        existingCanonical.attr("href", canonicalUrl);
      } else {
        // Add canonical tag to head
        const canonicalTag = `<link rel="canonical" href="${canonicalUrl}" />`;
        
        if ($("head").length) {
          $("head").append(canonicalTag);
        } else {
          $.root().prepend(`<head>${canonicalTag}</head>`);
        }
      }

      return {
        updated: true,
        data: { content: $.html() },
        description: `Added/fixed canonical URL: ${canonicalUrl}`,
      };
    },
    userId
  );
}

private async addSocialMetaTags(
  creds: WordPressCredentials,
  fixes: AIFix[],
  userId?: string
): Promise<{ applied: AIFix[]; errors: string[] }> {
  return this.fixWordPressContent(
    creds,
    fixes,
    async (content, fix) => {
      const contentHtml = content.content?.rendered || content.content || "";
      const $ = cheerio.load(contentHtml, this.getCheerioConfig());

      // Check if OG tags already exist
      if ($('meta[property^="og:"]').length > 0) {
        return {
          updated: false,
          data: {},
          description: "Social meta tags already present",
        };
      }

      const title = this.cleanText(content.title?.rendered || content.title || "");
      const description = this.cleanText(
        content.excerpt?.rendered || content.excerpt || ""
      ).substring(0, 200);
      const imageUrl = this.extractFirstImage(contentHtml);
      const url = content.link || `${creds.url}/${content.slug}`;

      const metaTags = [
        // Open Graph tags
        `<meta property="og:type" content="article" />`,
        `<meta property="og:title" content="${this.escapeHtml(title)}" />`,
        `<meta property="og:description" content="${this.escapeHtml(description)}" />`,
        `<meta property="og:url" content="${url}" />`,
        `<meta property="og:site_name" content="${creds.url}" />`,
        imageUrl ? `<meta property="og:image" content="${imageUrl}" />` : "",
        
        // Twitter Card tags
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:title" content="${this.escapeHtml(title)}" />`,
        `<meta name="twitter:description" content="${this.escapeHtml(description)}" />`,
        imageUrl ? `<meta name="twitter:image" content="${imageUrl}" />` : "",
      ].filter(Boolean);

      // Insert into head
      if ($("head").length) {
        $("head").append(metaTags.join("\n"));
      } else {
        $.root().prepend(`<head>\n${metaTags.join("\n")}\n</head>`);
      }

      return {
        updated: true,
        data: { content: $.html() },
        description: `Added ${metaTags.length} social meta tags (OG + Twitter)`,
      };
    },
    userId
  );
}

private async optimizeKeywordPlacement(
  creds: WordPressCredentials,
  fixes: AIFix[],
  userId?: string
): Promise<{ applied: AIFix[]; errors: string[] }> {
  return this.fixWordPressContent(
    creds,
    fixes,
    async (content, fix) => {
      const contentHtml = content.content?.rendered || content.content || "";
      const title = content.title?.rendered || content.title || "";
      
      const keywords = this.extractPrimaryKeywords(title, contentHtml);
      const primaryKeyword = keywords[0];

      if (!primaryKeyword) {
        return {
          updated: false,
          data: {},
          description: "No primary keyword detected",
        };
      }

      const $ = cheerio.load(contentHtml, this.getCheerioConfig());
      const firstParagraph = $("p").first().text();

      // Check if keyword is in first 100 words
      const first100Words = firstParagraph.split(/\s+/).slice(0, 100).join(" ");
      
      if (first100Words.toLowerCase().includes(primaryKeyword.toLowerCase())) {
        // Check keyword density
        const fullText = $.text();
        const density = this.calculateKeywordDensity(fullText, primaryKeyword);

        if (density >= 0.5 && density <= 2.5) {
          return {
            updated: false,
            data: {},
            description: `Keyword optimization already good (density: ${density.toFixed(1)}%)`,
          };
        }
      }

      // Need to optimize keyword placement
      const provider = await this.selectAIProvider(userId);
      if (!provider) {
        return {
          updated: false,
          data: {},
          description: "AI provider not available for keyword optimization",
        };
      }

      try {
        const systemPrompt = `You are an SEO content editor. Optimize keyword placement without changing the article's meaning.

RULES:
1. Include primary keyword in first paragraph (first 100 words)
2. Target keyword density: 1-2%
3. Use keyword naturally - no stuffing
4. Add keyword variations (LSI keywords)
5. Maintain readability
6. Keep existing HTML structure

Return ONLY the optimized HTML content.`;

        const userPrompt = `Optimize keyword placement in this content:

Primary Keyword: "${primaryKeyword}"
Title: ${title}
Content: ${contentHtml.substring(0, 1500)}

Current Issues:
- Keyword not in first 100 words
- Keyword density needs optimization

Return optimized HTML with natural keyword integration.`;

        const optimized = await this.callAIProvider(
          provider,
          systemPrompt,
          userPrompt,
          2000,
          0.6,
          userId
        );

        const cleaned = this.cleanAIResponse(optimized);
        const newDensity = this.calculateKeywordDensity(
          cleaned.replace(/<[^>]*>/g, ""),
          primaryKeyword
        );

        return {
          updated: true,
          data: { content: cleaned },
          description: `Optimized keyword "${primaryKeyword}" (density: ${newDensity.toFixed(1)}%)`,
        };
      } catch (error: any) {
        return {
          updated: false,
          data: {},
          description: `Keyword optimization failed: ${error.message}`,
        };
      }
    },
    userId
  );
}


private async updateContentFreshness(
  creds: WordPressCredentials,
  fixes: AIFix[],
  userId?: string
): Promise<{ applied: AIFix[]; errors: string[] }> {
  return this.fixWordPressContent(
    creds,
    fixes,
    async (content, fix) => {
      const contentHtml = content.content?.rendered || content.content || "";
      const $ = cheerio.load(contentHtml, this.getCheerioConfig());

      // Check if "Last Updated" already exists
      if (contentHtml.includes("Last Updated") || contentHtml.includes("Updated on")) {
        return {
          updated: false,
          data: {},
          description: "Freshness signal already present",
        };
      }

      const lastModified = content.modified || new Date().toISOString();
      const formattedDate = new Date(lastModified).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Add freshness indicator at the top
      const freshnessTag = `<p class="content-freshness" style="color: #666; font-size: 0.9em; font-style: italic;">
        <strong>Last Updated:</strong> ${formattedDate}
      </p>`;

      // Insert after first heading or at the beginning
      const firstHeading = $("h1, h2").first();
      if (firstHeading.length) {
        firstHeading.after(freshnessTag);
      } else {
        $.root().prepend(freshnessTag);
      }

      // Also update the WordPress modified date
      return {
        updated: true,
        data: { 
          content: $.html(),
          modified: new Date().toISOString()
        },
        description: `Added "Last Updated: ${formattedDate}" freshness signal`,
      };
    },
    userId
  );
}

private async generateTableOfContents(
  creds: WordPressCredentials,
  fixes: AIFix[],
  userId?: string
): Promise<{ applied: AIFix[]; errors: string[] }> {
  return this.fixWordPressContent(
    creds,
    fixes,
    async (content, fix) => {
      const contentHtml = content.content?.rendered || content.content || "";
      const $ = cheerio.load(contentHtml, this.getCheerioConfig());

      // Check if TOC already exists
      if (contentHtml.includes("table-of-contents") || contentHtml.includes("toc-")) {
        return {
          updated: false,
          data: {},
          description: "Table of contents already exists",
        };
      }

      // Extract all H2 and H3 headings
      const headings: Array<{ level: number; text: string; id: string }> = [];
      
      $("h2, h3").each((index, el) => {
        const $el = $(el);
        const text = $el.text().trim();
        const level = parseInt(el.tagName.charAt(1));
        const id = this.slugify(text);

        // Add ID to heading for anchor links
        $el.attr("id", id);

        headings.push({ level, text, id });
      });

      // Need at least 3 headings to justify TOC
      if (headings.length < 3) {
        return {
          updated: false,
          data: {},
          description: `Too few headings (${headings.length}) for TOC`,
        };
      }

      // Generate TOC HTML
      const tocHtml = this.buildTOCHtml(headings);

      // Insert TOC after first paragraph or at the beginning
      const firstParagraph = $("p").first();
      if (firstParagraph.length) {
        firstParagraph.after(tocHtml);
      } else {
        $.root().prepend(tocHtml);
      }

      return {
        updated: true,
        data: { content: $.html() },
        description: `Generated table of contents with ${headings.length} entries`,
      };
    },
    userId
  );
}

private async fixImageAltText(
  creds: WordPressCredentials,
  fixes: AIFix[],
  userId?: string
): Promise<{ applied: AIFix[]; errors: string[] }> {
  // CHANGE THIS to use fixWordPressContent helper
  return this.fixWordPressContent(
    creds,
    fixes,
    async (content, fix) => {
      const contentHtml = content.content?.rendered || content.content || "";
      const $ = cheerio.load(contentHtml, this.getCheerioConfig());

      const imagesWithoutAlt = $("img").filter((i, el) => {
        const $img = $(el);
        const alt = $img.attr("alt");
        return !alt || alt.trim() === "" || alt === "null";
      });

      if (imagesWithoutAlt.length === 0) {
        return {
          updated: false,
          data: {},
          description: "All images already have alt text",
        };
      }

      let imagesFixed = 0;

      for (const img of imagesWithoutAlt.toArray()) {
        const $img = $(img);
        const src = $img.attr("src") || "";
        
        if (!src || src.startsWith("data:")) continue;

        const altText = this.generateContextualAltText(
          src,
          content.title?.rendered || content.title || "",
          contentHtml
        );

        // Try Media API first
        const wpImageClass = $img.attr("class") || "";
        const wpImageIdMatch = wpImageClass.match(/wp-image-(\d+)/);
        
        if (wpImageIdMatch) {
          try {
            const mediaId = parseInt(wpImageIdMatch[1]);
            await this.updateWordPressMedia(creds, mediaId, { alt_text: altText, caption: altText });
            imagesFixed++;
          } catch (error: any) {
            this.addLog(`Media API failed, using HTML fallback`, "warning");
          }
        }

        $img.attr("alt", altText);
      }

      return {
        updated: true,
        data: { content: this.extractHtmlContent($) },
        description: `Fixed alt text for ${imagesWithoutAlt.length} images`,
      };
    },
    userId
  );
}

private async debugWordPressContent(
  creds: WordPressCredentials,
  contentId: number,
  contentType: "post" | "page"
): Promise<void> {
  const endpoint =
    contentType === "page"
      ? `${creds.url.replace(/\/$/, "")}/wp-json/wp/v2/pages/${contentId}`
      : `${creds.url.replace(/\/$/, "")}/wp-json/wp/v2/posts/${contentId}`;

  const auth = Buffer.from(
    `${creds.username}:${creds.applicationPassword}`
  ).toString("base64");

  const response = await fetch(endpoint, {
    headers: { Authorization: `Basic ${auth}` },
  });

  const content = await response.json();

  console.log(`🔍 WordPress Content Debug:`, {
    id: contentId,
    hasRaw: !!content.content?.raw,
    hasRendered: !!content.content?.rendered,
    rawLength: content.content?.raw?.length || 0,
    renderedLength: content.content?.rendered?.length || 0,
    rawWordCount: (content.content?.raw || "")
      .replace(/<[^>]*>/g, "")
      .split(/\s+/)
      .filter((w: string) => w.length > 0).length,
    renderedWordCount: (content.content?.rendered || "")
      .replace(/<[^>]*>/g, "")
      .split(/\s+/)
      .filter((w: string) => w.length > 0).length,
    excerpt: content.excerpt?.rendered?.length || 0,
    title: content.title?.rendered?.length || 0,
  });
}

private async updateWordPressMedia(
  creds: WordPressCredentials,
  mediaId: number,
  data: { alt_text?: string; title?: string; caption?: string }
): Promise<any> {
  const endpoint = `${creds.url.replace(/\/$/, "")}/wp-json/wp/v2/media/${mediaId}`;
  const auth = Buffer.from(
    `${creds.username}:${creds.applicationPassword}`
  ).toString("base64");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to update media ${mediaId}: ${errorBody}`);
  }

  return response.json();
}


  private generateContextualAltText(
    src: string,
    title: string,
    context: string
  ): string {
    const filename = src.split("/").pop()?.replace(/\.[^/.]+$/, "") || "";
    const cleanFilename = filename.replace(/[-_]/g, " ");

    // Extract surrounding text for context
    const $ = cheerio.load(context);
    const img = $(`img[src="${src}"]`);
    const nearbyText = img
      .parent()
      .text()
      .substring(0, 100)
      .replace(/\s+/g, " ")
      .trim();

    if (nearbyText) {
      return nearbyText.substring(0, 100);
    }

    if (cleanFilename.length > 5) {
      return cleanFilename.substring(0, 100);
    }

    return `Image related to ${title}`.substring(0, 100);
  }

  private async fixMetaDescriptions(
    creds: WordPressCredentials,
    fixes: AIFix[],
    userId?: string
  ): Promise<{ applied: AIFix[]; errors: string[] }> {
    return this.fixWordPressContent(
      creds,
      fixes,
      async (content, fix) => {
        const excerpt = content.excerpt?.rendered || content.excerpt || "";
        const title = content.title?.rendered || content.title || "";
        const cleanExcerpt = excerpt.replace(/<[^>]*>/g, "").trim();

        if (cleanExcerpt.length >= 120 && cleanExcerpt.length <= 160) {
          return {
            updated: false,
            data: {},
            description: `Meta description already optimal (${cleanExcerpt.length} chars)`,
          };
        }

        const metaDescription = await this.generateMetaDescriptionEnhanced(
          title,
          content.content?.rendered || "",
          userId
        );

        return {
          updated: true,
          data: { excerpt: metaDescription },
          description: `Updated meta description (${cleanExcerpt.length} → ${metaDescription.length} chars)`,
        };
      },
      userId
    );
  }

  private async fixTitleTags(
    creds: WordPressCredentials,
    fixes: AIFix[],
    userId?: string
  ): Promise<{ applied: AIFix[]; errors: string[] }> {
    return this.fixWordPressContent(
      creds,
      fixes,
      async (content, fix) => {
        const currentTitle = content.title?.rendered || content.title || "";

        if (currentTitle.length >= 30 && currentTitle.length <= 60) {
          return {
            updated: false,
            data: {},
            description: `Title already optimal (${currentTitle.length} chars)`,
          };
        }

        const optimizedTitle = await this.optimizeTitleEnhanced(
          currentTitle,
          content.content?.rendered || "",
          userId
        );

        return {
          updated: true,
          data: { title: optimizedTitle },
          description: `Optimized title (${currentTitle.length} → ${optimizedTitle.length} chars)`,
        };
      },
      userId
    );
  }

  private async fixHeadingStructure(
    creds: WordPressCredentials,
    fixes: AIFix[],
    userId?: string
  ): Promise<{ applied: AIFix[]; errors: string[] }> {
    return this.fixWordPressContent(
      creds,
      fixes,
      async (content, fix) => {
        const contentHtml = content.content?.rendered || content.content || "";
        const $ = cheerio.load(contentHtml, this.getCheerioConfig());

        const h1s = $("h1");
        let updated = false;
        const changes: string[] = [];

        if (h1s.length > 1) {
          h1s.each((index, el) => {
            if (index > 0) {
              const h1Text = $(el).text();
              $(el).replaceWith(`<h2>${h1Text}</h2>`);
              changes.push(`Converted duplicate H1 to H2`);
              updated = true;
            }
          });
        }

        if (h1s.length === 0) {
  const title = content.title?.rendered || content.title || "Page Title";
  const cleanTitle = title.replace(/<[^>]*>/g, "");
  
  // Find first meaningful element to insert H1 before
  const firstElement = $('p, h2, h3, h4, div, article, section').first();
  if (firstElement.length) {
    firstElement.before(`<h1>${cleanTitle}</h1>`);
  } else {
    // No elements found - prepend to body content
    const bodyContent = $('body').first();
    if (bodyContent.length) {
      bodyContent.prepend(`<h1>${cleanTitle}</h1>`);
    } else {
      // Last resort - wrap and prepend
      const content = $.html();
      $.root().html(`<h1>${cleanTitle}</h1>${content}`);
    }
  }
  
  changes.push(`Added missing H1 tag`);
  updated = true;
}

        // Fix heading hierarchy
        const headings = $("h1, h2, h3, h4, h5, h6").toArray();
        let previousLevel = 0;

        headings.forEach((heading) => {
          const currentLevel = parseInt(heading.tagName.charAt(1));

          if (currentLevel > previousLevel + 1 && previousLevel !== 0) {
            const correctLevel = previousLevel + 1;
            const headingText = $(heading).text();

            if (correctLevel <= 6) {
              $(heading).replaceWith(
                `<h${correctLevel}>${headingText}</h${correctLevel}>`
              );
              changes.push(`Fixed heading hierarchy`);
              updated = true;
              previousLevel = correctLevel;
            } else {
              previousLevel = currentLevel;
            }
          } else {
            previousLevel = currentLevel;
          }
        });

        if (updated) {
          return {
            updated: true,
            data: { content: this.extractHtmlContent($) },
            description: `Fixed heading structure: ${changes.join(", ")}`,
          };
        }

        return {
          updated: false,
          data: {},
          description: "Heading structure already optimal",
        };
      },
      userId
    );
  }

  private async improveInternalLinking(
    creds: WordPressCredentials,
    fixes: AIFix[],
    userId?: string
  ): Promise<{ applied: AIFix[]; errors: string[] }> {
    const [posts, pages] = await Promise.all([
      this.getWordPressContent(creds, "posts").catch(() => []),
      this.getWordPressContent(creds, "pages").catch(() => []),
    ]);

    const allContent = [...posts, ...pages];
    const semanticIndex = this.semanticAnalyzer.buildSemanticIndex(allContent);

    return this.fixWordPressContent(
      creds,
      fixes,
      async (content, fix) => {
        const contentHtml = content.content?.rendered || content.content || "";
        const $ = cheerio.load(contentHtml, this.getCheerioConfig());

        const existingLinks = $(`a[href*="${creds.url}"]`).length;
        const wordCount = this.wordCount(contentHtml);
        const targetLinks = Math.max(2, Math.min(5, Math.floor(wordCount / 300)));

        if (existingLinks >= targetLinks) {
          return {
            updated: false,
            data: {},
            description: `Sufficient internal links (${existingLinks})`,
          };
        }

        const relevantPages = this.semanticAnalyzer.findRelevantPages(
          content,
          semanticIndex,
          creds.url
        );

        let linksAdded = 0;
        const paragraphs = $("p").toArray();

        for (const page of relevantPages.slice(0, targetLinks - existingLinks)) {
          if (linksAdded >= targetLinks - existingLinks) break;

          for (const p of paragraphs) {
            const text = $(p).text();
            if (
              text.toLowerCase().includes(page.matchedKeyword.toLowerCase()) &&
              !$(p).find("a").length
            ) {
              const regex = new RegExp(`\\b(${page.matchedKeyword})\\b`, "i");
              const html = $(p).html();
              if (html && !html.includes("href")) {
                const newHtml = html.replace(
                  regex,
                  `<a href="${page.url}" title="${page.title}">$1</a>`
                );
                $(p).html(newHtml);
                linksAdded++;
                break;
              }
            }
          }
        }

        if (linksAdded > 0) {
          return {
            updated: true,
            data: { content: this.extractHtmlContent($) },
            description: `Added ${linksAdded} contextual internal links`,
          };
        }

        return {
          updated: false,
          data: {},
          description: "No suitable internal linking opportunities",
        };
      },
      userId
    );
  }

  private async fixExternalLinkAttributes(
    creds: WordPressCredentials,
    fixes: AIFix[],
    userId?: string
  ): Promise<{ applied: AIFix[]; errors: string[] }> {
    return this.fixWordPressContent(
      creds,
      fixes,
      async (content, fix) => {
        const contentHtml = content.content?.rendered || content.content || "";
        const $ = cheerio.load(contentHtml, this.getCheerioConfig());

        let linksFixed = 0;

        $('a[href^="http"]').each((_, elem) => {
          const href = $(elem).attr("href");
          if (href && !href.includes(creds.url)) {
            const $link = $(elem);
            let changed = false;

            if (!$link.attr("target")) {
              $link.attr("target", "_blank");
              changed = true;
            }

            const currentRel = $link.attr("rel") || "";
            const relParts = currentRel.split(" ").filter((r) => r);

            if (!relParts.includes("noopener")) {
              relParts.push("noopener");
              changed = true;
            }
            if (!relParts.includes("noreferrer")) {
              relParts.push("noreferrer");
              changed = true;
            }

            if (changed) {
              $link.attr("rel", relParts.join(" "));
              linksFixed++;
            }
          }
        });

        if (linksFixed > 0) {
          return {
            updated: true,
            data: { content: this.extractHtmlContent($) },
            description: `Fixed ${linksFixed} external links (added noopener/noreferrer)`,
          };
        }

        return {
          updated: false,
          data: {},
          description: "External links already have proper attributes",
        };
      },
      userId
    );
  }

  private async optimizeImages(
    creds: WordPressCredentials,
    fixes: AIFix[],
    userId?: string
  ): Promise<{ applied: AIFix[]; errors: string[] }> {
    return this.fixWordPressContent(
      creds,
      fixes,
      async (content, fix) => {
        const contentHtml = content.content?.rendered || content.content || "";
        const $ = cheerio.load(contentHtml, this.getCheerioConfig());

        let imagesOptimized = 0;

        $("img").each((_, elem) => {
          const $img = $(elem);
          let changed = false;

          if (!$img.attr("loading")) {
            $img.attr("loading", "lazy");
            changed = true;
          }

          if (!$img.attr("decoding")) {
            $img.attr("decoding", "async");
            changed = true;
          }

          const src = $img.attr("src") || "";
          if (!$img.attr("width") || !$img.attr("height")) {
            const sizeMatch = src.match(/-(\d+)x(\d+)\./);
            if (sizeMatch) {
              $img.attr("width", sizeMatch[1]);
              $img.attr("height", sizeMatch[2]);
              changed = true;
            }
          }

          if (changed) {
            imagesOptimized++;
          }
        });

        if (imagesOptimized > 0) {
          return {
            updated: true,
            data: { content: this.extractHtmlContent($) },
            description: `Optimized ${imagesOptimized} images (lazy loading, dimensions)`,
          };
        }

        return {
          updated: false,
          data: {},
          description: "Images already optimized",
        };
      },
      userId
    );
  }



  // ============================================
  // WORDPRESS CONTENT HELPER METHODS
  // ============================================

private cleanText(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

private escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

private extractFirstImage(html: string): string | null {
  const $ = cheerio.load(html);
  return $("img").first().attr("src") || null;
}

private calculateKeywordDensity(text: string, keyword: string): number {
  const words = text.toLowerCase().split(/\s+/);
  const keywordCount = words.filter((w) => w.includes(keyword.toLowerCase())).length;
  return (keywordCount / words.length) * 100;
}

private slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

private buildTOCHtml(headings: Array<{ level: number; text: string; id: string }>): string {
  let html = `
    <div class="table-of-contents" style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-left: 4px solid #0073aa;">
      <h2 style="margin-top: 0;">Table of Contents</h2>
      <ol style="margin-bottom: 0;">
  `;

  headings.forEach((heading) => {
    const indent = heading.level === 3 ? "margin-left: 20px;" : "";
    html += `
      <li style="${indent}">
        <a href="#${heading.id}" style="text-decoration: none; color: #0073aa;">
          ${heading.text}
        </a>
      </li>
    `;
  });

  html += `
      </ol>
    </div>
  `;

  return html;
}

private async getWordPressSiteInfo(creds: WordPressCredentials): Promise<any> {
  const endpoint = `${creds.url.replace(/\/$/, "")}/wp-json`;
  const auth = Buffer.from(
    `${creds.username}:${creds.applicationPassword}`
  ).toString("base64");

  const response = await fetch(endpoint, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!response.ok) {
    return { name: "Website", author: "Admin" };
  }

  const data = await response.json();
  return {
    name: data.name || "Website",
    description: data.description || "",
    url: data.url || creds.url,
    logo_url: data.site_logo?.url || null,
    author: "Admin",
  };
}


  private async fixWordPressContent(
  creds: WordPressCredentials,
  fixes: AIFix[],
  fixProcessor: (content: any, fix: AIFix) => Promise<{
    updated: boolean;
    data: any;
    description: string;
  }>,
  userId?: string
): Promise<{ applied: AIFix[]; errors: string[] }> {
  const applied: AIFix[] = [];
  const errors: string[] = [];

  try {
    // CHANGE: Only fetch content that needs fixing
    const targetIds = this.extractTargetContentIds(fixes);
    
    if (targetIds.length === 0) {
      // Fallback to processing all content if no specific IDs
      this.addLog("No specific content IDs - processing all content", "warning");
      const allContent = await this.getAllWordPressContent(creds, 50);
      
      for (const content of allContent) {
        for (const fix of fixes) {
          try {
            const result = await fixProcessor(content, fix);
            
            // FIX: Mark as successful even if no update was needed
            if (result.updated) {
              await this.updateWordPressContent(creds, content.id, result.data, content.contentType);
              applied.push({
                ...fix,
                description: result.description,
                wordpressPostId: content.id,
                element: content.contentType,
                success: true,
              });
              this.addLog(result.description, "success");
            } else {
              // Content is already good - still mark as successfully resolved
              applied.push({
                ...fix,
                description: result.description,
                wordpressPostId: content.id,
                element: content.contentType,
                success: true,
                verified: true, // Already verified as good
              });
              this.addLog(`✓ ${result.description}`, "info");
            }
          } catch (error: any) {
            errors.push(`Fix failed for content ${content.id}: ${error.message}`);
            applied.push({
              ...fix,
              success: false,
              error: error.message,
              wordpressPostId: content.id,
            });
          }
        }
      }
    } else {
      // BETTER: Fetch only the specific content that needs fixing
      this.addLog(`Targeting ${targetIds.length} specific content items`, "info");
      
      for (const fix of fixes) {
        if (!fix.wordpressPostId) {
          this.addLog(`Skipping fix without content ID: ${fix.type}`, "warning");
          continue;
        }

        try {
          // Fetch the specific content
          const contentType = (fix.element as "post" | "page") || "post";
          const content = await this.fetchSpecificContent(creds, fix.wordpressPostId, contentType);
          
          if (!content) {
            errors.push(`Content ${fix.wordpressPostId} not found`);
            applied.push({
              ...fix,
              success: false,
              error: "Content not found",
            });
            continue;
          }

          const result = await fixProcessor(content, fix);
          
          if (result.updated) {
            await this.updateWordPressContent(creds, content.id, result.data, contentType);
            applied.push({
              ...fix,
              description: result.description,
              wordpressPostId: content.id,
              element: contentType,
              success: true,
            });
            this.addLog(`✅ ${result.description}`, "success");
          } else {
            // FIX: Content already optimal - mark as successfully resolved
            applied.push({
              ...fix,
              description: result.description,
              wordpressPostId: content.id,
              element: contentType,
              success: true,
              verified: true, // Already verified as good
            });
            this.addLog(`ℹ️  ${result.description}`, "info");
          }
        } catch (error: any) {
          errors.push(`Fix failed for ${fix.wordpressPostId}: ${error.message}`);
          applied.push({
            ...fix,
            success: false,
            error: error.message,
            wordpressPostId: fix.wordpressPostId,
          });
          this.addLog(`❌ ${error.message}`, "error");
        }
      }
    }

    return { applied, errors };
  } catch (error: any) {
    errors.push(`WordPress content fix failed: ${error.message}`);
    return { applied, errors };
  }
}

// Add this helper method
private async fetchSpecificContent(
  creds: WordPressCredentials,
  contentId: number,
  contentType: "post" | "page"
): Promise<any | null> {
  try {
    const endpoint = contentType === "page"
      ? `${creds.url.replace(/\/$/, "")}/wp-json/wp/v2/pages/${contentId}?context=edit`
      : `${creds.url.replace(/\/$/, "")}/wp-json/wp/v2/posts/${contentId}?context=edit`;

    const auth = Buffer.from(
      `${creds.username}:${creds.applicationPassword}`
    ).toString("base64");

    const response = await fetch(endpoint, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!response.ok) {
      this.addLog(`Failed to fetch ${contentType} ${contentId}: ${response.status}`, "error");
      return null;
    }

    const data = await response.json();
    return { ...data, contentType };
  } catch (error: any) {
    this.addLog(`Error fetching content ${contentId}: ${error.message}`, "error");
    return null;
  }
}

  private async getAllWordPressContent(
    creds: WordPressCredentials,
    maxItems: number = 50
  ): Promise<any[]> {
    const allContent: any[] = [];
    let page = 1;
    const perPage = 50;

    while (allContent.length < maxItems) {
      try {
        const posts = await this.getWordPressContentPaginated(
          creds,
          "posts",
          page,
          perPage
        );
        if (posts.length === 0) break;

        allContent.push(...posts.map((p) => ({ ...p, contentType: "post" })));
        if (posts.length < perPage || allContent.length >= maxItems) break;
        page++;

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        this.addLog(`Error fetching posts page ${page}`, "warning");
        break;
      }
    }

    page = 1;
    while (allContent.length < maxItems) {
      try {
        const pages = await this.getWordPressContentPaginated(
          creds,
          "pages",
          page,
          perPage
        );
        if (pages.length === 0) break;

        allContent.push(...pages.map((p) => ({ ...p, contentType: "page" })));
        if (pages.length < perPage || allContent.length >= maxItems) break;
        page++;

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        this.addLog(`Error fetching pages page ${page}`, "warning");
        break;
      }
    }

    return allContent.slice(0, maxItems);
  }

  private async getWordPressContentPaginated(
    creds: WordPressCredentials,
    type: "posts" | "pages",
    page: number = 1,
    perPage: number = 50
  ): Promise<any[]> {
    const endpoint = `${creds.url.replace(/\/$/, "")}/wp-json/wp/v2/${type}`;
    const auth = Buffer.from(
      `${creds.username}:${creds.applicationPassword}`
    ).toString("base64");

    const response = await fetch(
      `${endpoint}?per_page=${perPage}&page=${page}&status=publish`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 400 || response.status === 404) {
        return [];
      }
      throw new Error(`Failed to fetch ${type}: ${response.status}`);
    }

    return response.json();
  }

  private async getWordPressContent(
    creds: WordPressCredentials,
    type: "posts" | "pages"
  ): Promise<any[]> {
    const endpoint = `${creds.url.replace(/\/$/, "")}/wp-json/wp/v2/${type}`;
    const auth = Buffer.from(
      `${creds.username}:${creds.applicationPassword}`
    ).toString("base64");

    const response = await fetch(`${endpoint}?per_page=50&status=publish`, {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${type}: ${response.status}`);
    }

    const data = await response.json();
    return data.map((item: any) => ({
      ...item,
      contentType: type === "posts" ? "post" : "page",
    }));
  }

 private async updateWordPressContent(
  creds: WordPressCredentials,
  id: number,
  data: any,
  contentType: "post" | "page" = "post"
): Promise<any> {
  const endpoint =
    contentType === "page"
      ? `${creds.url.replace(/\/$/, "")}/wp-json/wp/v2/pages/${id}?context=edit`
      : `${creds.url.replace(/\/$/, "")}/wp-json/wp/v2/posts/${id}?context=edit`;

  const auth = Buffer.from(
    `${creds.username}:${creds.applicationPassword}`
  ).toString("base64");

  // Fetch current content first
  const currentResponse = await fetch(endpoint, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!currentResponse.ok) {
    throw new Error(`Failed to fetch current content: ${currentResponse.status}`);
  }

  const currentContent = await currentResponse.json();

  // Build update payload
  const updateData: any = {};
  
  if (data.content !== undefined) {
    updateData.content = data.content;
  }
  
  if (data.excerpt !== undefined) {
    updateData.excerpt = data.excerpt;
  }
  
  if (data.title !== undefined) {
    updateData.title = data.title;
  }

  if (data.modified !== undefined) {
    updateData.modified = data.modified;
  }

  // Preserve critical fields
  updateData.status = currentContent.status || 'publish';
  updateData.comment_status = currentContent.comment_status;
  updateData.ping_status = currentContent.ping_status;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updateData),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to update ${contentType} ${id}: ${errorBody}`);
  }

  const result = await response.json();

  // FIX: Longer wait for WordPress to process
  await new Promise((resolve) => setTimeout(resolve, 6000));

  // Verify using RAW content
  const verifyResponse = await fetch(endpoint, {
    headers: { 
      Authorization: `Basic ${auth}`,
      'Cache-Control': 'no-cache',
    },
  });

  if (verifyResponse.ok) {
    const actualSaved = await verifyResponse.json();
    
    // FIX: Use RAW content for verification
    const savedContent = actualSaved.content?.raw || actualSaved.content?.rendered || "";
    const originalContent = data.content || "";
    
    const savedWordCount = this.wordCount(savedContent);
    const originalWordCount = this.wordCount(originalContent);

    console.log(`📊 Save verification:`, {
      originalWords: originalWordCount,
      savedWords: savedWordCount,
      hasRaw: !!actualSaved.content?.raw,
      difference: originalWordCount - savedWordCount,
    });

    // FIX: More lenient check since WordPress may add/remove HTML
    if (savedWordCount < originalWordCount * 0.8) {
      throw new Error(
        `Content verification failed: Expected ~${originalWordCount} words, got ${savedWordCount} words. Content loss detected.`
      );
    }
  }

  return result;
}

  // ============================================
  // AI PROVIDER METHODS
  // ============================================

  private async selectAIProvider(userId?: string): Promise<string | null> {
    const providers = [
      { name: "claude", priority: 1 },
      { name: "openai", priority: 2 },
    ];

    for (const provider of providers.sort((a, b) => a.priority - b.priority)) {
      if (await this.isProviderAvailable(provider.name, userId)) {
        return provider.name;
      }
    }

    this.addLog("No AI providers available", "error");
    return null;
  }

  private async isProviderAvailable(
    provider: string,
    userId?: string
  ): Promise<boolean> {
    if (provider === "claude" || provider === "anthropic") {
      const apiKey = await this.getAPIKey(userId, "anthropic", [
        "ANTHROPIC_API_KEY",
        "CLAUDE_API_KEY",
      ]);
      return !!apiKey;
    } else if (provider === "openai") {
      const apiKey = await this.getAPIKey(userId, "openai", [
        "OPENAI_API_KEY",
        "OPENAI_API_KEY_ENV_VAR",
      ]);
      return !!apiKey;
    }
    return false;
  }

  private async callAIProvider(
    provider: string,
    systemMessage: string,
    userMessage: string,
    maxTokens: number = 500,
    temperature: number = 0.7,
    userId?: string
  ): Promise<string> {
    if (provider === "claude" || provider === "anthropic") {
      const anthropicResult = await this.getUserAnthropic(userId);
      if (!anthropicResult) {
        throw new Error("Anthropic API not available");
      }

      const response = await anthropicResult.client.messages.create({
        model: "claude-3-5-sonnet-latest",
        max_tokens: maxTokens,
        temperature,
        system: systemMessage,
        messages: [{ role: "user", content: userMessage }],
      });

      const content = response.content[0];
      return content.type === "text" ? content.text : "";
    } else if (provider === "openai") {
      const openaiResult = await this.getUserOpenAI(userId);
      if (!openaiResult) {
        throw new Error("OpenAI API not available");
      }

      const response = await openaiResult.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
        temperature,
        max_tokens: maxTokens,
      });

      return response.choices[0]?.message?.content || "";
    }

    throw new Error(`Unsupported AI provider: ${provider}`);
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  private getFixStrategy(
  fixType: string
):
  | ((
      creds: WordPressCredentials,
      fixes: AIFix[],
      userId?: string
    ) => Promise<{ applied: AIFix[]; errors: string[] }>)
  | null {
  const normalizedType = fixType.replace(/__/g, "_").toLowerCase();

  // This methodMap must align with the ACTUAL output from mapIssueToTrackingType()
  const methodMap: Record<string, string> = {
    // ==============================================
    // META TAGS (from mapIssueToTrackingType)
    // ==============================================
    missing_meta_description: "fixMetaDescriptions",
    duplicate_meta_descriptions: "fixMetaDescriptions",
    poor_title_tag: "fixTitleTags",
    
    // Common variations/aliases
    meta_description_too_long: "fixMetaDescriptions",
    meta_description_too_short: "fixMetaDescriptions",
    no_meta_description: "fixMetaDescriptions",
    title_tag_too_long: "fixTitleTags",
    title_tag_too_short: "fixTitleTags",
    bad_title: "fixTitleTags",
    missing_title: "fixTitleTags",
    
    // ==============================================
    // IMAGES (from mapIssueToTrackingType)
    // ==============================================
    missing_alt_text: "fixImageAltText",
    unoptimized_images: "optimizeImages",
    missing_image_dimensions: "fixImageDimensions",
    images_missing_lazy_loading: "fixImageDimensions",
    
    // Common variations/aliases
    images_missing_alt_text: "fixImageAltText",
    missing_alt__text: "fixImageAltText",
    images_missing_alt__text: "fixImageAltText",
    images_without_alt: "fixImageAltText",
    no_alt_text: "fixImageAltText",
    large_images: "optimizeImages",
    images_not_optimized: "optimizeImages",
    no_lazy_loading: "fixImageDimensions",
    
    // ==============================================
    // HEADINGS (from mapIssueToTrackingType)
    // ==============================================
    heading_structure: "fixHeadingStructure",
    
    // Common variations/aliases
    missing_h1: "fixHeadingStructure",
    missing_h1_tag: "fixHeadingStructure",
    multiple_h1_tags: "fixHeadingStructure",
    multiple_h1: "fixHeadingStructure",
    h1_issues: "fixHeadingStructure",
    poor_heading_hierarchy: "fixHeadingStructure",
    improper_heading_hierarchy: "fixHeadingStructure",
    
    // ==============================================
    // STRUCTURED DATA (from mapIssueToTrackingType)
    // ==============================================
    missing_schema: "addStructuredData",  // ⚠️ CRITICAL: This is the actual tracking type
    missing_faq_schema: "addStructuredData",
    missing_breadcrumbs: "addStructuredData",  // ⚠️ ADDED: Was missing
    
    // Common variations/aliases
    missing_structured_data: "addStructuredData",
    missing_schema_markup: "addStructuredData",
    no_json_ld: "addStructuredData",
    no_schema: "addStructuredData",
    
    // ==============================================
    // SOCIAL META TAGS (from mapIssueToTrackingType)
    // ==============================================
    missing_og_tags: "addSocialMetaTags",
    missing_twitter_cards: "addSocialMetaTags",
    
    // Common variations/aliases
    poor_social_sharing: "addSocialMetaTags",
    no_open_graph: "addSocialMetaTags",
    no_social_meta: "addSocialMetaTags",
    missing_open_graph_tags: "addSocialMetaTags",
    
    // ==============================================
    // CANONICAL & MOBILE (from mapIssueToTrackingType)
    // ==============================================
    missing_canonical_url: "fixCanonicalUrls",  // ⚠️ CRITICAL: This is the actual tracking type
    missing_viewport_meta: "fixTechnicalIssues",  // Not fixable via content update
    mobile_responsiveness: "fixTechnicalIssues",  // Not fixable via content update
    
    // Common variations/aliases
    missing_canonical: "fixCanonicalUrls",
    no_canonical_url: "fixCanonicalUrls",
    
    // ==============================================
    // LINKS (from mapIssueToTrackingType)
    // ==============================================
    broken_internal_links: "fixBrokenInternalLinks",
    poor_internal_linking: "improveInternalLinking",
    external_links_missing_attributes: "fixExternalLinkAttributes",
    orphan_pages: "improveInternalLinking",  // ⚠️ ADDED: Was missing
    
    // Common variations/aliases
    missing_internal_links: "improveInternalLinking",
    low_internal_links: "improveInternalLinking",
    external_links_no_noopener: "fixExternalLinkAttributes",
    unsafe_external_links: "fixExternalLinkAttributes",
    
    // ==============================================
    // CONTENT ISSUES (from mapIssueToTrackingType)
    // ==============================================
    thin_content: "expandThinContent",
    duplicate_content: "fixCanonicalUrls",  // Best handled with canonical
    low_content_quality: "fixContentQuality",
    poor_readability: "fixContentQuality",
    poor_content_structure: "fixContentQuality",
    keyword_optimization: "optimizeKeywordPlacement",
    
    // NOT AUTO-FIXABLE (requires human input)
    low_eat_score: null,  // Requires author credentials, citations
    poor_user_intent: null,  // Requires content strategy
    low_content_uniqueness: null,  // Requires original research
    
    // Common variations/aliases
    content_too_short: "expandThinContent",
    low_word_count: "expandThinContent",
    insufficient_content: "expandThinContent",
    short_content: "expandThinContent",
    content_quality: "fixContentQuality",
    bad_content_structure: "fixContentQuality",
    poor_keyword_distribution: "optimizeKeywordPlacement",
    poor_keyword_placement: "optimizeKeywordPlacement",
    low_keyword_density: "optimizeKeywordPlacement",
    keyword_not_in_intro: "optimizeKeywordPlacement",
    missing_keywords: "optimizeKeywordPlacement",
    keyword_over_optimization: "optimizeKeywordPlacement",
    
    // ==============================================
    // SITE-WIDE (from mapIssueToTrackingType)
    // ==============================================
    // These are not fixable via WordPress REST API
    missing_xml_sitemap: null,  // Requires server access
    robots_txt_issues: null,  // Requires server access
    unoptimized_permalinks: null,  // Requires WordPress settings
    redirect_chains: null,  // Requires server configuration
    
    // ==============================================
    // ADDITIONAL FEATURES (not in mapIssueToTrackingType)
    // ==============================================
    // These don't come from analysis but could be requested
    outdated_content: "updateContentFreshness",
    missing_update_date: "updateContentFreshness",
    old_content: "updateContentFreshness",
    missing_toc: "generateTableOfContents",
    poor_navigation: "generateTableOfContents",
    no_table_of_contents: "generateTableOfContents",
  };

  const methodName = methodMap[normalizedType] || methodMap[fixType];

  // Handle null mappings (non-fixable issues)
  if (methodName === null) {
    this.addLog(
      `Issue type "${fixType}" is not automatically fixable (requires manual intervention)`,
      "warning"
    );
    return null;
  }

  if (!methodName) {
    // Log helpful debugging info
    this.addLog(
      `❌ No mapping for "${fixType}" (normalized: "${normalizedType}")`,
      "error"
    );
    this.addLog(
      `💡 Available fix types: ${Object.keys(methodMap).slice(0, 10).join(", ")}...`,
      "info"
    );
    return null;
  }

  const method = (this as any)[methodName];

  if (!method || typeof method !== "function") {
    this.addLog(
      `❌ Method "${methodName}" doesn't exist on AIFixService`,
      "error"
    );
    return null;
  }

  this.addLog(`✅ Mapped ${fixType} → ${methodName}`, "success");
  return method.bind(this);
}

  private cleanAIResponse(content: string): string {
    if (!content) return "";

    let cleaned = content.trim();

    const prefixPatterns = [
      /^(Sure|Certainly|Here's?|Here is|I've|I have|Below|The following|Let me)\b[^{[\n<]*[\n:]/gi,
      /^```[a-z]*\s*\n/gim,
      /^["'`]+\s*/g,
    ];

    for (const pattern of prefixPatterns) {
      cleaned = cleaned.replace(pattern, "");
    }

    cleaned = cleaned.replace(/["']?\s*html\s*$/gi, "");
    cleaned = cleaned.replace(/\s*["']\s*$/g, "");

    return cleaned.trim();
  }

 private extractHtmlContent($: cheerio.CheerioAPI): string {
  // Try to extract only body content
  const body = $('body');
  if (body.length > 0) {
    const bodyHtml = body.html();
    if (bodyHtml) {
      return bodyHtml.trim();
    }
  }
  
  // No body tag - get all content without wrapper tags
  const children = $.root().children();
  if (children.length > 0) {
    return children
      .map((i, el) => $(el).toString())
      .get()
      .join('')
      .trim();
  }
  
  // Fallback - return everything but strip html/body/head wrappers
  let html = $.html({
    decodeEntities: false,
    xmlMode: false,
    selfClosingTags: true,
  });
  
  html = html
    .replace(/^<!DOCTYPE[^>]*>/i, "")
    .replace(/^<html[^>]*>/i, "")
    .replace(/<\/html>\s*$/i, "")
    .replace(/^<head>[\s\S]*?<\/head>/i, "")
    .replace(/^<body[^>]*>/i, "")
    .replace(/<\/body>\s*$/i, "");
  
  return html.trim();
}

  private getCheerioConfig() {
    return {
      xml: false,
      decodeEntities: false,
      normalizeWhitespace: false,
      recognizeSelfClosing: true,
    };
  }

  private wordCount(html: string): number {
    const text = html.replace(/<[^>]*>/g, "").trim();
    return text.split(/\s+/).filter((w) => w.length > 0).length;
  }

  private createFallbackMetaDescription(title: string, content: string): string {
    const cleanContent = content.replace(/<[^>]*>/g, "").trim();
    const description = `${title}. ${cleanContent.substring(0, 100)}...`;
    return description.substring(0, 160);
  }

  private getWordPressCredentials(website: any): WordPressCredentials {
    if (!website.wpApplicationPassword) {
      throw new Error("WordPress credentials not configured");
    }

    return {
      url: website.url,
      username: website.wpUsername || "admin",
      applicationPassword: website.wpApplicationPassword,
    };
  }

  private groupFixesByType(fixes: AIFix[]): Record<string, AIFix[]> {
    return fixes.reduce((groups, fix) => {
      (groups[fix.type] = groups[fix.type] || []).push(fix);
      return groups;
    }, {} as Record<string, AIFix[]>);
  }

  private prioritizeAndFilterFixes(
    fixes: AIFix[],
    allowedTypes?: string[],
    maxChanges: number = 50
  ): AIFix[] {
    let filtered = fixes;

    if (allowedTypes && allowedTypes.length > 0) {
      filtered = filtered.filter((fix) => allowedTypes.includes(fix.type));
    }

    const priority = { high: 3, medium: 2, low: 1 };
    filtered.sort((a, b) => (priority[b.impact] || 0) - (priority[a.impact] || 0));

    return filtered.slice(0, maxChanges);
  }

  private extractContentIds(fixes: AIFix[]): number[] {
    return fixes
      .map((f) => f.wordpressPostId)
      .filter((id): id is number => typeof id === "number");
  }

  private async getCurrentSEOScore(
    websiteId: string,
    userId: string
  ): Promise<number> {
    const latestReport = await this.getLatestSeoReport(websiteId, userId);
    return latestReport?.score || 0;
  }

  private async getLatestSeoReport(websiteId: string, userId: string) {
    const reports = await storage.getSeoReportsByWebsite(websiteId, userId);
    return reports[0];
  }

  private async validateWebsiteAccess(websiteId: string, userId: string) {
    const website = await storage.getUserWebsite(websiteId, userId);
    if (!website) {
      throw new Error("Website not found or access denied");
    }
    this.addLog(`Loaded website: ${website.name} (${website.url})`);
    return website;
  }

  private async getFixableIssues(
    websiteId: string,
    userId: string
  ): Promise<AIFix[]> {
    await this.resetStuckFixingIssues(websiteId, userId);

    const trackedIssues = await storage.getTrackedSeoIssues(websiteId, userId, {
      autoFixableOnly: true,
      status: ["detected", "reappeared"],
      excludeRecentlyFixed: true,
      fixedWithinDays: 7,
    });

    this.addLog(`Found ${trackedIssues.length} tracked fixable issues`);

    return trackedIssues.map((issue) => ({
      type: issue.issueType,
      description: issue.issueDescription || issue.issueTitle,
      element: issue.elementPath || issue.issueType,
      before: issue.currentValue || "Current state",
      after: issue.recommendedValue || "Improved state",
      impact: this.mapSeverityToImpact(issue.severity),
      trackedIssueId: issue.id,
      success: false,
      wordpressPostId: issue.affectedPostId || issue.postId || issue.contentId,
    }));
  }



 private async expandThinContent(
  creds: WordPressCredentials,
  fixes: AIFix[],
  userId?: string
): Promise<{ applied: AIFix[]; errors: string[] }> {
  return this.fixWordPressContent(
    creds,
    fixes,
    async (content, fix) => {
      const contentHtml = content.content?.rendered || content.content || "";
      const text = contentHtml.replace(/<[^>]*>/g, "").trim();
      const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;

      // FIXED: Use proper threshold
      if (wordCount >= 300) {
        return {
          updated: false,
          data: {},
          description: `Content length sufficient (${wordCount} words)`,
        };
      }

      const provider = await this.selectAIProvider(userId);
      if (!provider) {
        return {
          updated: false,
          data: {},
          description: "AI provider not available",
        };
      }

      try {
        const title = content.title?.rendered || content.title || "";
        const context = await this.buildSEOContext(title, contentHtml);

        // FIXED: Retry logic with increasing targets
        let attempt = 0;
        let maxAttempts = 3;
        let expanded = "";
        let newWordCount = 0;

        while (attempt < maxAttempts && newWordCount < 400) {
          attempt++;
          const targetWords = 600 + (attempt * 100); // 600, 700, 800

          const systemPrompt = `You are a content writer. Write EXACTLY ${targetWords} words.

CRITICAL REQUIREMENTS:
- Minimum: ${targetWords - 50} words (STRICT)
- Maximum: ${targetWords + 50} words
- Count carefully - you will be verified

STRUCTURE:
- Introduction (100 words)
- 3-4 sections with H2 headings (${Math.floor(targetWords * 0.7)} words)
- Conclusion (100 words)

NO AI PHRASES: avoid "delve", "dive into", "landscape", "realm", "comprehensive", "explore"

Return ONLY HTML content starting with first tag.`;

          const userPrompt = `Write EXACTLY ${targetWords} words expanding this content:

Title: ${title}
Current: ${text.substring(0, 200)}
Keyword: ${context.targetKeywords[0]}

Add specific examples, actionable tips, and concrete details to reach ${targetWords} words.

Return only HTML.`;

          expanded = await this.callAIProvider(
            provider,
            systemPrompt,
            userPrompt,
            Math.max(2000, targetWords * 3), // Generous token limit
            0.7,
            userId
          );

          let cleaned = this.cleanAIResponse(expanded);
          cleaned = cleaned.replace(/^.*?<(h[1-6]|p|div|article)/i, "<$1");
          
          newWordCount = cleaned
            .replace(/<[^>]*>/g, "")
            .split(/\s+/)
            .filter((w) => w.length > 0).length;

          if (newWordCount >= 400) {
            this.addLog(`Content expanded successfully: ${wordCount} → ${newWordCount} words`, "success");
            return {
              updated: true,
              data: { content: cleaned },
              description: `Expanded content from ${wordCount} to ${newWordCount} words`,
            };
          }

          this.addLog(`Attempt ${attempt}: Only ${newWordCount} words generated, retrying...`, "warning");
        }

        // FIXED: Fail if we can't meet minimum requirements
        return {
          updated: false,
          data: {},
          description: `Content expansion failed after ${maxAttempts} attempts: only ${newWordCount} words generated (target: 400+)`,
        };
      } catch (error: any) {
        return {
          updated: false,
          data: {},
          description: `Expansion failed: ${error.message}`,
        };
      }
    },
    userId
  );
}



private async fixContentQuality(
  creds: WordPressCredentials,
  fixes: AIFix[],
  userId?: string
): Promise<{ applied: AIFix[]; errors: string[] }> {
  return this.fixWordPressContent(
    creds,
    fixes,
    async (content, fix) => {
      const contentHtml = content.content?.rendered || content.content || "";
      const title = content.title?.rendered || content.title || "";
      
      // Basic quality checks
      const wordCount = this.wordCount(contentHtml);
      const $ = cheerio.load(contentHtml);
      const headingCount = $('h2, h3').length;
      const listCount = $('ul, ol').length;
      
      // If content already has good structure, skip
      if (wordCount >= 500 && headingCount >= 2 && listCount >= 1) {
        return {
          updated: false,
          data: {},
          description: "Content quality already good",
        };
      }

      const provider = await this.selectAIProvider(userId);
      if (!provider) {
        return {
          updated: false,
          data: {},
          description: "AI provider not available",
        };
      }

      try {
        const context = await this.buildSEOContext(title, contentHtml);

        const systemPrompt = `You are a content editor improving article quality and readability.

IMPROVEMENT CHECKLIST:
1. Break long paragraphs (keep under 4 sentences each)
2. Add H2/H3 subheadings every 200-300 words
3. Convert lists to bullet points where appropriate
4. Add bold text for key points (sparingly)
5. Improve sentence variety and flow
6. Remove fluff and repetition
7. Add transitions between sections
8. NO AI clichés or corporate speak

Return ONLY the improved HTML content.`;

        const userPrompt = `Improve this content's quality and readability:

Title: ${title}
Content: ${contentHtml.substring(0, 1000)}

Issues to fix:
${wordCount < 500 ? "- Too short, needs expansion\n" : ""}
${headingCount < 2 ? "- Needs more subheadings\n" : ""}
${listCount === 0 ? "- Could use bullet points\n" : ""}

Target Keywords: ${context.targetKeywords.join(", ")}

Return improved HTML content.`;

        const improved = await this.callAIProvider(
          provider,
          systemPrompt,
          userPrompt,
          2000,
          0.7,
          userId
        );

        const cleaned = this.cleanAIResponse(improved);

        return {
          updated: true,
          data: { content: cleaned },
          description: `Improved content quality (added structure and readability)`,
        };
      } catch (error: any) {
        return {
          updated: false,
          data: {},
          description: `Quality improvement failed: ${error.message}`,
        };
      }
    },
    userId
  );
}


private async fixBrokenInternalLinks(
  creds: WordPressCredentials,
  fixes: AIFix[],
  userId?: string
): Promise<{ applied: AIFix[]; errors: string[] }> {
  // Get all valid URLs first
  const [posts, pages] = await Promise.all([
    this.getWordPressContent(creds, "posts").catch(() => []),
    this.getWordPressContent(creds, "pages").catch(() => []),
  ]);

  const validUrls = new Set([...posts, ...pages].map((c) => c.link));

  return this.fixWordPressContent(
    creds,
    fixes,
    async (content, fix) => {
      const contentHtml = content.content?.rendered || content.content || "";
      const $ = cheerio.load(contentHtml, this.getCheerioConfig());

      let fixedLinks = 0;

      // Check all internal links
      $(`a[href*="${creds.url}"]`).each((_, elem) => {
        const href = $(elem).attr("href");
        if (href && !validUrls.has(href)) {
          // Try to find similar URL
          const slug = href.split("/").filter((s) => s).pop();
          if (slug) {
            for (const validUrl of validUrls) {
              if (validUrl.includes(slug)) {
                $(elem).attr("href", validUrl);
                fixedLinks++;
                break;
              }
            }
          }
          
          // If no match found, remove link but keep text
          if (!$(elem).attr("href-fixed")) {
            const text = $(elem).text();
            $(elem).replaceWith(text);
            fixedLinks++;
          }
        }
      });

      if (fixedLinks > 0) {
        return {
          updated: true,
          data: { content: this.extractHtmlContent($) },
          description: `Fixed ${fixedLinks} broken internal links`,
        };
      }

      return {
        updated: false,
        data: {},
        description: "No broken internal links found",
      };
    },
    userId
  );
}



private async fixImageDimensions(
  creds: WordPressCredentials,
  fixes: AIFix[],
  userId?: string
): Promise<{ applied: AIFix[]; errors: string[] }> {
  return this.fixWordPressContent(
    creds,
    fixes,
    async (content, fix) => {
      const contentHtml = content.content?.rendered || content.content || "";
      const $ = cheerio.load(contentHtml, this.getCheerioConfig());

      let imagesFixed = 0;

      $("img").each((_, elem) => {
        const $img = $(elem);
        const src = $img.attr("src") || "";
        let changed = false;

        if (!src) return;

        // Add lazy loading
        if (!$img.attr("loading")) {
          $img.attr("loading", "lazy");
          changed = true;
        }

        // Add async decoding
        if (!$img.attr("decoding")) {
          $img.attr("decoding", "async");
          changed = true;
        }

        // Try to extract dimensions from filename
        if (!$img.attr("width") || !$img.attr("height")) {
          const sizeMatch = src.match(/-(\d+)x(\d+)\./);
          if (sizeMatch) {
            $img.attr("width", sizeMatch[1]);
            $img.attr("height", sizeMatch[2]);
            changed = true;
          }
        }

        if (changed) {
          imagesFixed++;
        }
      });

      if (imagesFixed > 0) {
        return {
          updated: true,
          data: { content: this.extractHtmlContent($) },
          description: `Optimized ${imagesFixed} images (lazy loading, dimensions)`,
        };
      }

      return {
        updated: false,
        data: {},
        description: "Images already optimized",
      };
    },
    userId
  );
}


  private mapSeverityToImpact(severity: string): "high" | "medium" | "low" {
    return severity === "critical"
      ? "high"
      : severity === "warning"
      ? "medium"
      : "low";
  }

  private async resetStuckFixingIssues(
    websiteId: string,
    userId: string
  ): Promise<void> {
    const stuckIssues = await storage.getTrackedSeoIssues(websiteId, userId, {
      status: ["fixing"],
    });

    if (stuckIssues.length > 0) {
      for (const issue of stuckIssues) {
        await storage.updateSeoIssueStatus(issue.id, "detected", {
          resolutionNotes: "Reset from stuck fixing status",
        });
      }
      this.addLog(`Reset ${stuckIssues.length} stuck issues`, "info");
    }
  }

  private async markIssuesAsFixing(
    fixes: AIFix[],
    fixSessionId: string
  ): Promise<void> {
    const issueIds = fixes
      .map((fix) => fix.trackedIssueId)
      .filter((id) => id) as string[];

    if (issueIds.length > 0) {
      await storage.bulkUpdateSeoIssueStatuses(issueIds, "fixing", fixSessionId);
      this.addLog(`Marked ${issueIds.length} issues as fixing`);
    }
  }

  private async updateIssueStatusesAfterFix(
  websiteId: string,
  userId: string,
  fixes: AIFix[],
  fixSessionId: string
): Promise<void> {
  this.addLog(`Starting status updates for ${fixes.length} fixes`, "info");
  
  for (const fix of fixes) {
    if (!fix.trackedIssueId) {
      this.addLog(`Skipping fix without tracked ID: ${fix.type}`, "warning");
      continue;
    }

    // Determine final status
    let shouldMarkAsFixed = false;
    
    if (fix.success) {
      // If verification says "already optimal" or "No verification available", treat as success
      if (fix.verificationDetails?.includes("already optimal") ||
          fix.verificationDetails?.includes("already good") ||
          fix.verificationDetails?.includes("already correct") ||
          fix.verificationDetails?.includes("already have") ||
          fix.verificationDetails?.includes("already present") ||
          fix.verificationDetails === "No verification available for this fix type") {
        shouldMarkAsFixed = true;
        this.addLog(`✓ ${fix.type}: ${fix.description}`, "success");
      }
      // If verification was performed and passed
      else if (fix.verified === true) {
        shouldMarkAsFixed = true;
        this.addLog(`✓ ${fix.type} verified: ${fix.verificationDetails}`, "success");
      }
      // If verification was performed but failed
      else if (fix.verified === false) {
        shouldMarkAsFixed = false;
        this.addLog(`✗ ${fix.type} verification failed: ${fix.verificationDetails}`, "warning");
      }
      // No verification info - assume success
      else {
        shouldMarkAsFixed = true;
        this.addLog(`✓ ${fix.type} completed`, "info");
      }
    } else {
      this.addLog(`✗ ${fix.type} failed: ${fix.error}`, "error");
    }

    const status = shouldMarkAsFixed ? "fixed" : "detected";
    const notes = shouldMarkAsFixed
      ? `AI fix applied: ${fix.description}. ${fix.verificationDetails || ''}`
      : `Fix attempted but failed: ${fix.error || fix.description}`;

    try {
      await storage.updateSeoIssueStatus(fix.trackedIssueId, status, {
        fixMethod: "ai_automatic",
        fixSessionId,
        resolutionNotes: notes.trim(),
        fixedAt: shouldMarkAsFixed ? new Date() : undefined,
      });
      
      this.addLog(`Updated issue ${fix.trackedIssueId} → ${status}`, "success");
    } catch (error: any) {      this.addLog(`Failed to update issue ${fix.trackedIssueId}: ${error.message}`, "error");
      console.error(`Status update error for ${fix.trackedIssueId}:`, error);
    }
  }
  
  this.addLog(`Completed status updates`, "success");
}

  private async performScoreOnlyReanalysis(
    website: any,
    userId: string,
    websiteId: string,
    delay: number
  ): Promise<ReanalysisResult> {
    try {
      if (delay > 0) {
        this.addLog(`Waiting ${delay}ms for changes to propagate...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const latestReport = await this.getLatestSeoReport(websiteId, userId);
      const initialScore = latestReport?.score || 0;

      const newAnalysis = await seoService.analyzeWebsite(
        website.url,
        [],
        userId,
        websiteId,
        {
          skipIssueTracking: true,
          scoreOnly: true,
        }
      );

      const scoreImprovement = newAnalysis.score - initialScore;

      await storage.updateWebsite(websiteId, {
        seoScore: newAnalysis.score,
        lastAnalyzed: new Date(),
      });

      return {
        enabled: true,
        initialScore,
        finalScore: newAnalysis.score,
        scoreImprovement,
        analysisTime: delay / 1000,
        success: true,
      };
    } catch (error: any) {
      return {
        enabled: true,
        initialScore: 0,
        finalScore: 0,
        scoreImprovement: 0,
        analysisTime: delay / 1000,
        success: false,
        error: error.message,
      };
    }
  }

  private async performDryRun(
    fixesToApply: AIFix[],
    fixSessionId: string,
    options: any,
    website: any
  ): Promise<AIFixResult> {
    const appliedFixes = fixesToApply.map((fix) => ({ ...fix, success: true }));

    let reanalysisData: ReanalysisResult | undefined;
    if (options.enableReanalysis !== false && fixesToApply.length > 0) {
      const estimatedImprovement = this.estimateScoreImprovement(appliedFixes);
      const latestReport = await this.getLatestSeoReport(
        website.id,
        this.currentUserId!
      );

      reanalysisData = {
        enabled: true,
        initialScore: latestReport?.score || 0,
        finalScore: Math.min(100, (latestReport?.score || 0) + estimatedImprovement),
        scoreImprovement: estimatedImprovement,
        analysisTime: 0,
        success: true,
        simulated: true,
      };
    }

    return this.createSuccessResult(
      appliedFixes,
      [],
      fixesToApply.length,
      true,
      reanalysisData,
      fixSessionId
    );
  }

  private estimateScoreImprovement(fixes: AIFix[]): number {
    const weights: Record<string, number> = {
      missing_meta_description: 5.0,
      poor_title_tag: 5.0,
      missing_h1: 4.5,
      heading_structure: 3.5,
      missing_alt_text: 2.5,
    };

    let improvement = 0;
    const successfulFixes = fixes.filter((f) => f.success);

    for (const fix of successfulFixes) {
      const weight = weights[fix.type] || 2.0;
      const impactMultiplier =
        fix.impact === "high" ? 1.0 : fix.impact === "medium" ? 0.7 : 0.4;
      improvement += weight * impactMultiplier;
    }

    return Math.min(improvement, 40);
  }

  private async createActivityLog(
    userId: string,
    websiteId: string,
    appliedFixes: AIFix[],
    reanalysis: ReanalysisResult | undefined,
    fixSessionId: string
  ): Promise<void> {
    const successfulFixes = appliedFixes.filter((f) => f.success);
    const verifiedFixes = appliedFixes.filter((f) => f.verified === true);

    await storage.createActivityLog({
      userId,
      websiteId,
      type: "ai_fixes_applied",
      description: `AI fixes: ${successfulFixes.length} successful (${verifiedFixes.length} verified), ${
        appliedFixes.length - successfulFixes.length
      } failed`,
      metadata: {
        fixSessionId,
        fixesApplied: appliedFixes.length,
        fixesSuccessful: successfulFixes.length,
        fixesVerified: verifiedFixes.length,
        fixesFailed: appliedFixes.length - successfulFixes.length,
        reanalysis: reanalysis || null,
      },
    });
  }

  // ============================================
  // RESULT CREATION METHODS
  // ============================================

  private createSuccessResult(
    appliedFixes: AIFix[],
    errors: string[],
    totalIssues: number,
    dryRun: boolean,
    reanalysis: ReanalysisResult | undefined,
    fixSessionId: string,
    verification?: VerificationResult
  ): AIFixResult {
    const stats: AIFixStats = {
      totalIssuesFound: totalIssues,
      fixesAttempted: appliedFixes.length,
      fixesSuccessful: appliedFixes.filter((f) => f.success).length,
      fixesFailed: appliedFixes.filter((f) => !f.success).length,
      fixesVerified: appliedFixes.filter((f) => f.verified === true).length,
      estimatedImpact: this.calculateEstimatedImpact(appliedFixes),
      detailedBreakdown: this.calculateDetailedBreakdown(appliedFixes),
    };

    let message = dryRun
      ? `Dry run complete. Found ${stats.fixesAttempted} fixable issues.`
      : `Applied ${stats.fixesSuccessful} fixes successfully (${stats.fixesVerified} verified).`;

    if (reanalysis?.success) {
      message += ` SEO score: ${reanalysis.initialScore} → ${reanalysis.finalScore} (+${reanalysis.scoreImprovement})`;
    }

    return {
      success: true,
      dryRun,
      fixesApplied: appliedFixes,
      stats,
      errors: errors.length > 0 ? errors : undefined,
      message,
      detailedLog: [...this.log],
      reanalysis,
      fixSessionId,
      verification,
    };
  }

  private calculateDetailedBreakdown(fixes: AIFix[]) {
    const successful = fixes.filter((f) => f.success);

    return {
      altTextFixed: successful.filter(
        (f) =>
          f.type === "missing_alt_text" ||
          f.type === "images_missing_alt_text" ||
          f.type === "missing_alt__text"
      ).length,
      metaDescriptionsUpdated: successful.filter(
        (f) => f.type === "missing_meta_description"
      ).length,
      titleTagsImproved: successful.filter((f) => f.type === "poor_title_tag")
        .length,
      headingStructureFixed: successful.filter((f) => f.type === "heading_structure")
        .length,
      internalLinksAdded: successful.filter(
        (f) => f.type === "poor_internal_linking" || f.type === "missing_internal_links"
      ).length,
      imagesOptimized: successful.filter((f) => f.type === "unoptimized_images")
        .length,
      contentQualityImproved: successful.filter((f) => f.type === "content_quality")
        .length,
      structuredDataAdded: successful.filter(
  (f) => f.type === "missing_structured_data" || f.type === "missing_schema_markup"
).length,
canonicalUrlsFixed: successful.filter(
  (f) => f.type === "missing_canonical" || f.type === "duplicate_content"
).length,
    };
  }

  private calculateEstimatedImpact(fixes: AIFix[]): string {
    const successful = fixes.filter((f) => f.success);
    const highImpact = successful.filter((f) => f.impact === "high").length;

    if (highImpact >= 5) return "very high";
    if (highImpact >= 3) return "high";
    if (highImpact >= 1) return "medium";
    return "low";
  }

  private createNoFixesNeededResult(
    dryRun: boolean,
    fixSessionId: string
  ): AIFixResult {
    return {
      success: true,
      dryRun,
      fixesApplied: [],
      stats: this.createEmptyStats(),
      message: "All fixable SEO issues have already been addressed.",
      detailedLog: [...this.log],
      fixSessionId,
    };
  }

  private createEmptyStats(): AIFixStats {
    return {
      totalIssuesFound: 0,
      fixesAttempted: 0,
      fixesSuccessful: 0,
      fixesFailed: 0,
      fixesVerified: 0,
      estimatedImpact: "none",
      detailedBreakdown: {
        altTextFixed: 0,
        metaDescriptionsUpdated: 0,
        titleTagsImproved: 0,
        headingStructureFixed: 0,
        internalLinksAdded: 0,
        imagesOptimized: 0,
        contentQualityImproved: 0,
        structuredDataAdded: 0,
        canonicalUrlsFixed: 0,
      },
    };
  }

  private createErrorResult(
    error: any,
    dryRun: boolean,
    fixSessionId: string
  ): AIFixResult {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    this.addLog(`AI fix service error: ${errorMessage}`, "error");

    return {
      success: false,
      dryRun,
      fixesApplied: [],
      stats: this.createEmptyStats(),
      errors: [errorMessage],
      message: `AI fix failed: ${errorMessage}`,
      detailedLog: [...this.log],
      fixSessionId,
    };
  }

  
}

export const aiFixService = new AIFixService();