import { aiService } from "./ai-service";
import { wordpressService } from "./wordpress-service";
import { wordPressAuthService } from "./wordpress-auth";
import { storage } from "../storage";
import { seoService } from "./seo-service";
import * as cheerio from "cheerio";
import { randomUUID } from "crypto";
export interface AIFixResult {
  success: boolean;
  dryRun: boolean;
  fixesApplied: AIFix[];
  stats: {
    totalIssuesFound: number;
    fixesAttempted: number;
    fixesSuccessful: number;
    fixesFailed: number;
    estimatedImpact: string;
    detailedBreakdown: {
      altTextFixed: number;
      metaDescriptionsUpdated: number;
      titleTagsImproved: number;
      headingStructureFixed: number;
      internalLinksAdded: number;
      imagesOptimized: number;
      contentQualityImproved: number;
    };
  };
  errors?: string[];
  message: string;
  detailedLog: string[];
  reanalysis?: any;
  fixSessionId?: string;
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
}

interface WordPressCredentials {
  url: string;
  username: string;
  applicationPassword: string;
}

interface IterativeFixResult extends AIFixResult {
  iterations: IterationResult[];
  finalScore: number;
  initialScore: number;
  scoreImprovement: number;
  targetScore: number;
  iterationsCompleted: number;
  stoppedReason: "target_reached" | "max_iterations" | "no_improvement" | "error";
  recommendations?: string[];
  applied?: {
    totalFixesApplied: number;
    imagesAltUpdated: number;
    metaDescriptionsUpdated: number;
    titleTagsUpdated: number;
    headingStructureFixed: number;
    averageImprovementPerIteration: number;
  };
  targetReached?: boolean;
}

interface IterationResult {
  iterationNumber: number;
  scoreBefore: number;
  scoreAfter: number;
  fixesApplied: number;
  fixesSuccessful: number;
  improvement: number;
  timestamp: string;
  fixDetails: AIFix[];
  analysisTime: number;
  fixTime: number;
}

class AIFixService {
  private log: string[] = [];

  private addLog(
    message: string,
    level: "info" | "success" | "warning" | "error" = "info"
  ) {
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

  // Enhanced AI Provider Selection - Now prioritizes Claude
  private selectAIProvider(): string | null {
    // First check for Claude (Anthropic) API key
    if (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY) {
      return "claude";
    }
    // Fallback to OpenAI if Claude not available
    if (process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR) {
      return "openai";
    }
    return null;
  }

  // Enhanced AI Provider Call with Claude 4 support
  private async callAIProvider(
    provider: string,
    systemMessage: string,
    userMessage: string,
    maxTokens: number = 500,
    temperature: number = 0.7
  ): Promise<string> {
    if (provider === "claude") {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
      });

      try {
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514", // Claude 4 model as requested
          max_tokens: maxTokens,
          temperature,
          system: systemMessage,
          messages: [{ role: "user", content: userMessage }],
        });

        const content = response.content[0];
        return content.type === "text" ? content.text : "";
      } catch (error) {
        this.addLog(`Claude API call failed: ${error.message}`, "warning");
        // Fallback to Claude 3.5 Sonnet if Claude 4 is not available
        const fallbackResponse = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: maxTokens,
          temperature,
          system: systemMessage,
          messages: [{ role: "user", content: userMessage }],
        });

        const fallbackContent = fallbackResponse.content[0];
        return fallbackContent.type === "text" ? fallbackContent.text : "";
      }
    } else if (provider === "openai") {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
        temperature,
        max_tokens: maxTokens,
      });

      return response.choices[0]?.message?.content || "";
    } else {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  private async analyzeContentQuality(content: string, title: string): Promise<{
    score: number;
    issues: string[];
    improvements: string[];
    readabilityScore: number;
    keywordDensity: Record<string, number>;
  }> {
    const provider = this.selectAIProvider();
    if (!provider) {
      return this.fallbackContentAnalysis(content);
    }

    try {
      const systemPrompt = `You are an expert content analyst specializing in SEO and readability. Analyze the provided content and return a JSON response with:
{
  "score": number (0-100, content quality score),
  "issues": [array of specific content issues found],
  "improvements": [array of specific improvement suggestions],
  "readabilityScore": number (0-100, readability score),
  "keywordDensity": {"keyword": density_percentage}
}

Focus on: readability, structure, keyword usage, user engagement, and SEO best practices.`;

      const userPrompt = `Title: "${title}"

Content: "${content.substring(0, 2000)}"

Provide detailed content quality analysis with actionable improvements.`;

      const result = await this.callAIProvider(provider, systemPrompt, userPrompt, 800, 0.3);
      const analysis = JSON.parse(this.cleanAIResponse(result));

      return {
        score: analysis.score || 50,
        issues: analysis.issues || [],
        improvements: analysis.improvements || [],
        readabilityScore: analysis.readabilityScore || 50,
        keywordDensity: analysis.keywordDensity || {},
      };
    } catch (error) {
      this.addLog(`Content analysis failed: ${error.message}`, "warning");
      return this.fallbackContentAnalysis(content);
    }
  }


  private async improveContentQuality(
    content: string,
    title: string,
    improvements: string[]
  ): Promise<string> {
    const provider = this.selectAIProvider();
    if (!provider) {
      return content; // Return original if no AI available
    }

    try {
      const systemPrompt = `You are a professional content editor and SEO specialist. Improve the provided content based on the specific improvement suggestions. Maintain the original meaning and tone while enhancing:

1. Readability and flow
2. SEO optimization
3. User engagement
4. Structure and formatting
5. Keyword integration (natural)

Return ONLY the improved content, maintaining HTML structure if present.`;

      const userPrompt = `Title: "${title}"

Original Content:
${content}

Specific Improvements Needed:
${improvements.map(imp => `- ${imp}`).join('\n')}

Provide the improved content:`;

      const improvedContent = await this.callAIProvider(
        provider,
        systemPrompt,
        userPrompt,
        2000,
        0.4
      );

      return improvedContent.trim();
    } catch (error) {
      this.addLog(`Content improvement failed: ${error.message}`, "warning");
      return content;
    }
  }

  // Enhanced Content Quality Fixes
  private async fixContentQuality(
    creds: WordPressCredentials,
    fixes: AIFix[]
  ): Promise<{ applied: AIFix[]; errors: string[] }> {
    this.addLog(`Improving content quality for ${fixes.length} items`);

    const applied: AIFix[] = [];
    const errors: string[] = [];

    try {
      const [posts, pages] = await Promise.all([
        this.getWordPressContentWithType(creds, "posts").catch(() => []),
        this.getWordPressContentWithType(creds, "pages").catch(() => []),
      ]);

      const allContent = [...posts, ...pages].slice(0, 5); // Limit to 5 items for content quality
      this.addLog(`Found ${allContent.length} items to improve content quality`);

      for (const content of allContent) {
        try {
          const title = content.title?.rendered || content.title || "";
          const contentText = content.content?.rendered || content.content || "";
          const plainText = this.extractTextFromHTML(contentText);

          if (plainText.length < 100) {
            this.addLog(`Skipping "${title}" - content too short to analyze`, "info");
            continue;
          }

          // Analyze content quality
          const analysis = await this.analyzeContentQuality(plainText, title);
          
          this.addLog(
            `Content analysis for "${title}": Score ${analysis.score}/100, ${analysis.issues.length} issues found`,
            analysis.score < 70 ? "warning" : "info"
          );

          // Only improve if score is below threshold
          if (analysis.score < 70 && analysis.improvements.length > 0) {
            try {
              const improvedContent = await this.improveContentQuality(
                contentText,
                title,
                analysis.improvements
              );

              if (improvedContent && improvedContent !== contentText) {
                await this.updateWordPressContent(creds, content.id, {
                  content: improvedContent,
                }, content.contentType);

                applied.push({
                  type: "content_quality",
                  description: `Improved content quality: ${analysis.improvements.slice(0, 2).join(", ")}`,
                  element: `${content.contentType}-${content.id}`,
                  before: `Quality score: ${analysis.score}/100`,
                  after: `Improved readability, structure, and engagement`,
                  success: true,
                  impact: "high",
                  wordpressPostId: content.id,
                });

                this.addLog(
                  `Improved content quality for: "${title}" (${content.contentType} ${content.id})`,
                  "success"
                );
              } else {
                this.addLog(`No content improvements generated for "${title}"`, "info");
              }
            } catch (updateError) {
              const errorMsg = `Failed to update content: ${updateError.message}`;
              errors.push(errorMsg);
              applied.push({
                type: "content_quality",
                description: `Failed to improve content quality for "${title}"`,
                element: `${content.contentType}-${content.id}`,
                before: `Quality score: ${analysis.score}/100`,
                after: "Failed to improve",
                success: false,
                impact: "high",
                error: errorMsg,
                wordpressPostId: content.id,
              });
              this.addLog(errorMsg, "error");
            }
          } else {
            this.addLog(
              `Content quality acceptable for "${title}" (score: ${analysis.score}/100)`,
              "info"
            );
          }
        } catch (contentError) {
          this.addLog(
            `Error analyzing content for "${content.title?.rendered || content.title}": ${contentError.message}`,
            "warning"
          );
        }
      }
    } catch (error) {
      const errorMsg = `Content quality improvement failed: ${error.message}`;
      errors.push(errorMsg);
      this.addLog(errorMsg, "error");
    }

    return { applied, errors };
  }

  private fallbackContentAnalysis(content: string): {
    score: number;
    issues: string[];
    improvements: string[];
    readabilityScore: number;
    keywordDensity: Record<string, number>;
  } {
    const words = content.split(/\s+/).length;
    const sentences = content.split(/[.!?]+/).length;
    const avgWordsPerSentence = words / sentences;
    
    const issues = [];
    const improvements = [];
    
    if (words < 300) {
      issues.push("Content is too short (< 300 words)");
      improvements.push("Expand content to at least 500-800 words");
    }
    
    if (avgWordsPerSentence > 25) {
      issues.push("Sentences are too long on average");
      improvements.push("Break down long sentences for better readability");
    }
    
    const readabilityScore = Math.max(0, 100 - (avgWordsPerSentence - 15) * 3);
    const score = Math.max(20, 100 - issues.length * 15);
    
    return {
      score,
      issues,
      improvements,
      readabilityScore,
      keywordDensity: {},
    };
  }



  private async performReanalysis(
  website: any,
  userId: string,
  websiteId: string,
  initialScore: number,
  delay: number = 3000 // Reduced default delay
): Promise<{
  enabled: boolean;
  initialScore: number;
  finalScore: number;
  scoreImprovement: number;
  analysisTime: number;
  success: boolean;
  error?: string;
  simulated?: boolean;
}> {
  const reanalysisStartTime = Date.now();
  
  try {
    if (delay > 0) {
      this.addLog(`Waiting ${delay}ms for changes to propagate...`, "info");
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    
    this.addLog("Running fresh SEO analysis to measure improvement...", "info");
    
    // Run fresh SEO analysis with enhanced error handling
    let newAnalysis;
    try {
      newAnalysis = await seoService.analyzeWebsite(website.url, [], userId);
    } catch (analysisError) {
      this.addLog(`SEO analysis failed during reanalysis: ${analysisError.message}`, "error");
      
      // Fallback: try without user ID in case of API key issues
      try {
        newAnalysis = await seoService.analyzeWebsite(website.url, []);
        this.addLog("Fallback analysis (without user API keys) succeeded", "warning");
      } catch (fallbackError) {
        throw new Error(`Both primary and fallback reanalysis failed: ${fallbackError.message}`);
      }
    }
    
    const finalScore = newAnalysis.score;
    const scoreImprovement = finalScore - initialScore;
    const analysisTime = Date.now() - reanalysisStartTime;
    
    // Save the new analysis to database
    try {
      await storage.createSeoReport({
        userId,
        websiteId,
        score: newAnalysis.score,
        issues: newAnalysis.issues,
        recommendations: newAnalysis.recommendations,
        pageSpeedScore: newAnalysis.pageSpeedScore,
        metadata: {
          postAIFix: true,
          previousScore: initialScore,
          scoreImprovement,
          fixSession: new Date().toISOString(),
          reanalysisTime: analysisTime,
        },
      });
      
      this.addLog("New SEO report saved to database", "success");
    } catch (saveError) {
      this.addLog(`Failed to save reanalysis report: ${saveError.message}`, "warning");
    }
    
    // Update website with new score
    try {
      await storage.updateWebsite(websiteId, {
        seoScore: finalScore,
        lastAnalyzed: new Date(),
      });
      
      this.addLog("Website score updated", "success");
    } catch (updateError) {
      this.addLog(`Failed to update website score: ${updateError.message}`, "warning");
    }
    
    this.addLog(
      `Reanalysis complete: ${initialScore} → ${finalScore} (${
        scoreImprovement >= 0 ? "+" : ""
      }${scoreImprovement.toFixed(1)})`,
      scoreImprovement > 0 ? "success" : scoreImprovement === 0 ? "info" : "warning"
    );
    
    return {
      enabled: true,
      initialScore,
      finalScore,
      scoreImprovement: Number(scoreImprovement.toFixed(1)),
      analysisTime: Math.round(analysisTime / 1000), // Convert to seconds
      success: true,
    };
  } catch (error) {
    const errorMessage = `Reanalysis failed: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    
    this.addLog(errorMessage, "error");
    
    return {
      enabled: true,
      initialScore,
      finalScore: initialScore, // Fallback to initial score
      scoreImprovement: 0,
      analysisTime: Math.round((Date.now() - reanalysisStartTime) / 1000),
      success: false,
      error: errorMessage,
    };
  }
}

// New method to estimate score improvement for dry runs
private estimateScoreImprovement(fixes: AIFix[]): number {
  let estimatedImprovement = 0;
  
  fixes.forEach(fix => {
    if (!fix.success) return; // Only count successful fixes
    
    switch (fix.impact) {
      case "high":
        estimatedImprovement += 8; // High impact fixes contribute more
        break;
      case "medium":
        estimatedImprovement += 4;
        break;
      case "low":
        estimatedImprovement += 2;
        break;
    }
    
    // Bonus for specific fix types that typically have high impact
    switch (fix.type) {
      case "missing_meta_description":
      case "poor_title_tag":
        estimatedImprovement += 3;
        break;
      case "missing_alt_text":
      case "heading_structure":
        estimatedImprovement += 2;
        break;
    }
  });
  
  // Cap the improvement to prevent unrealistic estimates
  return Math.min(estimatedImprovement, 25);
}
async analyzeAndFixWebsite(
  websiteId: string,
  userId: string,
  dryRun: boolean = true,
  options: {
    fixTypes?: string[];
    maxChanges?: number;
    skipBackup?: boolean;
    enableReanalysis?: boolean;
    reanalysisDelay?: number;
    forceReanalysis?: boolean;
  } = {}
): Promise<AIFixResult> {
  this.log = [];

  try {
    // Generate a unique session ID for this fix run
    const fixSessionId = randomUUID();
    
    this.addLog(
      `Starting AI fix analysis for website ${websiteId} (dry run: ${dryRun}, session: ${fixSessionId})`
    );

    // Get website details
    const website = await storage.getUserWebsite(websiteId, userId);
    if (!website) {
      throw new Error("Website not found or access denied");
    }

    this.addLog(`Loaded website: ${website.name} (${website.url})`);

    // Get latest SEO report to identify issues
    const seoReports = await storage.getSeoReportsByWebsite(websiteId);
    const latestReport = seoReports[0];

    if (!latestReport) {
      throw new Error(
        "No SEO analysis found. Please run SEO analysis first."
      );
    }

    // Get tracked issues but ONLY those that need fixing
    const trackedIssues = await storage.getTrackedSeoIssues(websiteId, userId, {
      autoFixableOnly: true,
      status: ['detected', 'reappeared'] // ONLY get issues that need fixing
    });

    this.addLog(`Found ${trackedIssues.length} tracked fixable issues (excluding already fixed)`);

    if (trackedIssues.length === 0) {
      this.addLog("No fixable issues found that haven't already been addressed", "info");
      
      return {
        success: true,
        dryRun,
        fixesApplied: [],
        stats: {
          totalIssuesFound: 0,
          fixesAttempted: 0,
          fixesSuccessful: 0,
          fixesFailed: 0,
          estimatedImpact: "none",
          detailedBreakdown: {
            altTextFixed: 0,
            metaDescriptionsUpdated: 0,
            titleTagsImproved: 0,
            headingStructureFixed: 0,
            internalLinksAdded: 0,
            imagesOptimized: 0,
          },
        },
        message: "All fixable SEO issues have already been addressed. No new fixes needed.",
        detailedLog: [...this.log],
      };
    }

    // Convert tracked issues to fixable issues format
    const fixableIssues = trackedIssues.map(trackedIssue => ({
      type: trackedIssue.issueType,
      description: trackedIssue.issueDescription || trackedIssue.issueTitle,
      element: trackedIssue.elementPath || trackedIssue.issueType,
      before: trackedIssue.currentValue || "Current state",
      after: trackedIssue.recommendedValue || "Improved state",
      impact: trackedIssue.severity === 'critical' ? 'high' as const : 
              trackedIssue.severity === 'warning' ? 'medium' as const : 'low' as const,
      trackedIssueId: trackedIssue.id // Add reference to tracked issue
    }));

    const maxChanges = options.maxChanges || fixableIssues.length;
    const fixesToApply = this.prioritizeAndFilterFixes(
      fixableIssues,
      options.fixTypes,
      maxChanges
    );

    this.addLog(`Will attempt to fix ${fixesToApply.length} issues`);

    let appliedFixes: AIFix[] = [];
    let errors: string[] = [];
    let reanalysisData: any = undefined;

    if (!dryRun && fixesToApply.length > 0) {
      // MODIFIED: Mark issues as "fixing" before attempting fixes
      const issueIds = fixesToApply
        .map(fix => fix.trackedIssueId)
        .filter(id => id);
      
      if (issueIds.length > 0) {
        await storage.bulkUpdateSeoIssueStatuses(issueIds, 'fixing', fixSessionId);
        this.addLog(`Marked ${issueIds.length} issues as fixing`);
      }

      // Create backup before making changes
      if (!options.skipBackup) {
        await this.createWebsiteBackup(website, userId);
        this.addLog("Website backup created", "success");
      }

      // Apply fixes
      const applyResult = await this.applyComprehensiveFixes(
        website,
        fixesToApply
      );

      appliedFixes = applyResult.appliedFixes;
      errors = applyResult.errors;

      const successfulFixes = appliedFixes.filter((f) => f.success);
      this.addLog(
        `Applied ${successfulFixes.length}/${appliedFixes.length} fixes successfully`,
        "success"
      );

      // MODIFIED: Update issue statuses based on fix results
      await this.updateIssueStatusesForFix(
        websiteId,
        userId,
        appliedFixes,
        fixSessionId,
        dryRun
      );

      // Reanalysis logic (unchanged)
      const shouldReanalyze = options.enableReanalysis !== false;
      const forceReanalysis = options.forceReanalysis === true;
      
      if (shouldReanalyze && (!dryRun && (successfulFixes.length > 0 || forceReanalysis))) {
        this.addLog("Starting post-fix reanalysis...", "info");
        
        reanalysisData = await this.performReanalysis(
          website,
          userId,
          websiteId,
          latestReport.score,
          options.reanalysisDelay || 3000
        );
        
        if (reanalysisData.success) {
          this.addLog(
            `Reanalysis completed: Score improved by ${reanalysisData.scoreImprovement} points`,
            reanalysisData.scoreImprovement > 0 ? "success" : "info"
          );
        } else {
          this.addLog(`Reanalysis failed: ${reanalysisData.error}`, "warning");
        }
      }

      // Enhanced activity log with session tracking
      await storage.createActivityLog({
        userId,
        websiteId,
        type: "ai_fixes_applied",
        description: `AI fixes applied: ${successfulFixes.length} successful, ${appliedFixes.length - successfulFixes.length} failed`,
        metadata: {
          fixSessionId,
          fixesApplied: appliedFixes.length,
          fixesSuccessful: successfulFixes.length,
          fixesFailed: appliedFixes.length - successfulFixes.length,
          fixTypes: [...new Set(appliedFixes.map((f) => f.type))],
          detailedFixes: successfulFixes.map((f) => ({
            type: f.type,
            description: f.description,
            element: f.element,
            trackedIssueId: f.trackedIssueId
          })),
          reanalysis: reanalysisData || null,
          trackedIssuesUpdated: true,
        },
      });
    } else {
      // Dry run
      appliedFixes = fixesToApply.map((fix) => ({
        ...fix,
        success: true,
      }));
      this.addLog(
        `Dry run complete - would apply ${appliedFixes.length} fixes`,
        "info"
      );
      
      if (options.enableReanalysis !== false && fixesToApply.length > 0) {
        this.addLog("Simulating post-fix score improvement for dry run...", "info");
        
        const estimatedImprovement = this.estimateScoreImprovement(appliedFixes);
        const estimatedFinalScore = Math.min(100, latestReport.score + estimatedImprovement);
        
        reanalysisData = {
          enabled: true,
          initialScore: latestReport.score,
          finalScore: estimatedFinalScore,
          scoreImprovement: estimatedImprovement,
          analysisTime: 0,
          success: true,
          simulated: true,
        };
        
        this.addLog(
          `Estimated score improvement: +${estimatedImprovement} points (${latestReport.score} → ${estimatedFinalScore})`,
          "info"
        );
      }
    }

    const detailedBreakdown = this.calculateDetailedBreakdown(appliedFixes);
    const stats = {
      totalIssuesFound: fixableIssues.length,
      fixesAttempted: appliedFixes.length,
      fixesSuccessful: appliedFixes.filter((f) => f.success).length,
      fixesFailed: appliedFixes.filter((f) => !f.success).length,
      estimatedImpact: this.calculateEstimatedImpact(appliedFixes),
      detailedBreakdown,
    };

    this.addLog(
      `Final stats: ${stats.fixesSuccessful}/${stats.fixesAttempted} fixes successful`,
      stats.fixesSuccessful > 0 ? "success" : "warning"
    );

    let message = dryRun
      ? `Dry run complete. Found ${stats.fixesAttempted} fixable issues.`
      : `Applied ${stats.fixesSuccessful} fixes successfully with ${stats.fixesFailed} failures.`;

    if (reanalysisData && reanalysisData.success) {
      if (reanalysisData.simulated) {
        message += ` Estimated SEO score improvement: +${reanalysisData.scoreImprovement} points`;
      } else {
        message += ` SEO score: ${reanalysisData.initialScore} → ${reanalysisData.finalScore} (+${reanalysisData.scoreImprovement})`;
      }
    }

    return {
      success: true,
      dryRun,
      fixesApplied: appliedFixes,
      stats,
      errors: errors.length > 0 ? errors : undefined,
      message,
      detailedLog: [...this.log],
      reanalysis: reanalysisData,
      fixSessionId, // Include session ID in response
    };
  } catch (error) {
    this.addLog(
      `AI fix service error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      "error"
    );
    console.error("AI fix service error:", error);
    return {
      success: false,
      dryRun,
      fixesApplied: [],
      stats: {
        totalIssuesFound: 0,
        fixesAttempted: 0,
        fixesSuccessful: 0,
        fixesFailed: 1,
        estimatedImpact: "none",
        detailedBreakdown: {
          altTextFixed: 0,
          metaDescriptionsUpdated: 0,
          titleTagsImproved: 0,
          headingStructureFixed: 0,
          internalLinksAdded: 0,
          imagesOptimized: 0,
        },
      },
      errors: [error instanceof Error ? error.message : "Unknown error"],
      message: `AI fix failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      detailedLog: [...this.log],
    };
  }
}

  private async analyzeWebsiteForAllFixes(url: string, seoReport: any) {
    this.addLog(`Analyzing website content for ALL fixable issues: ${url}`);

    try {
      // Fetch and parse website content with timeout
      const websiteContent = await this.fetchWebsiteContentWithTimeout(
        url,
        10000
      ); // 10 second timeout
      const $ = cheerio.load(websiteContent);

      // Always do direct HTML analysis first (more reliable)
      const directAnalysis = this.analyzeHTMLDirectly($);
      this.addLog(
        `Direct HTML analysis found: ${directAnalysis.fixes.length} issues`
      );

      // Try AI analysis with enhanced error handling
      let aiAnalysis = { fixes: [], totalIssues: 0, recommendations: [] };
      try {
        aiAnalysis = await this.getAIFixRecommendations(
          url,
          websiteContent,
          seoReport
        );
        this.addLog(`AI analysis found: ${aiAnalysis.fixes.length} issues`);
      } catch (aiError) {
        this.addLog(
          `AI analysis failed, using HTML analysis only: ${
            aiError instanceof Error ? aiError.message : "Unknown error"
          }`,
          "warning"
        );
      }

      // Merge and deduplicate fixes
      const allFixes = [...directAnalysis.fixes, ...aiAnalysis.fixes];
      const deduplicatedFixes = this.deduplicateFixes(allFixes);

      this.addLog(
        `Total unique issues after deduplication: ${deduplicatedFixes.length}`
      );

      return {
        totalIssues: directAnalysis.totalIssues + aiAnalysis.totalIssues,
        fixableIssues: deduplicatedFixes,
        recommendations: [
          ...directAnalysis.recommendations,
          ...aiAnalysis.recommendations,
        ],
      };
    } catch (error) {
      this.addLog(
        `Website analysis failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );

      // Fall back to a basic analysis based on SEO report only
      return this.createFallbackAnalysis(seoReport);
    }
  }

  private async getAIFixRecommendations(
    url: string,
    content: string,
    seoReport: any
  ) {
    // Simplified system prompt to reduce response size
    const system = `You are an SEO specialist. Analyze the website and return ONLY valid JSON with this structure:
{
  "totalIssues": number,
  "fixes": [
    {
      "type": "missing_alt_text|missing_meta_description|poor_title_tag|heading_structure",
      "description": "Brief description",
      "element": "element selector",
      "before": "current state",
      "after": "proposed fix",
      "impact": "high|medium|low"
    }
  ],
  "recommendations": ["brief recommendations"]
}

Return ONLY the JSON object. No explanations or markdown.`;

    // Truncate content more aggressively to prevent response truncation
    const truncatedContent = content.substring(0, 2000);

    const user = `URL: ${url}
SEO Score: ${seoReport.score}/100
Issues: ${JSON.stringify(seoReport.issues?.slice(0, 5) || [])}

Content (truncated):
${truncatedContent}

Find the top 5 most important automated fixes. Return only JSON.`;

    const provider = this.selectAIProvider();
    if (!provider) {
      throw new Error(
        "No AI provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY."
      );
    }

    try {
      const rawResult = await this.callAIProvider(provider, system, user, 1000); // Reduced max tokens
      const cleanResult = this.cleanAIResponse(rawResult);

      this.addLog(`AI response: ${cleanResult.length} chars`);

      // Enhanced JSON parsing with multiple fallback attempts
      let analysis;
      try {
        analysis = JSON.parse(cleanResult);
      } catch (parseError) {
        this.addLog(
          `Initial JSON parse failed, attempting to fix...`,
          "warning"
        );

        // Try multiple fix strategies
        const fixedResult =
          this.tryFixMalformedJSONMultipleAttempts(cleanResult);
        if (fixedResult) {
          analysis = JSON.parse(fixedResult);
          this.addLog("Successfully parsed fixed JSON!", "success");
        } else {
          throw new Error(
            `JSON parsing failed: ${
              parseError instanceof Error ? parseError.message : "Unknown error"
            }`
          );
        }
      }

      // Validate the analysis structure
      if (!this.validateAnalysisStructure(analysis)) {
        throw new Error("Invalid analysis structure returned by AI");
      }

      return {
        totalIssues: analysis.totalIssues || 0,
        fixes: Array.isArray(analysis.fixes) ? analysis.fixes.slice(0, 10) : [], // Limit to 10 fixes
        recommendations: Array.isArray(analysis.recommendations)
          ? analysis.recommendations.slice(0, 5)
          : [],
      };
    } catch (error) {
      this.addLog(
        `AI analysis failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
      throw error; // Re-throw to be handled by caller
    }
  }

  // Enhanced JSON fixing with multiple strategies
  private tryFixMalformedJSONMultipleAttempts(
    jsonString: string
  ): string | null {
    const strategies = [
      // Strategy 1: Close unclosed strings and structures
      (json: string) => {
        let fixed = json.trim();

        // Find last complete structure
        const lastCompleteObject = fixed.lastIndexOf("}");
        const lastCompleteArray = fixed.lastIndexOf("]");

        if (lastCompleteObject > -1 || lastCompleteArray > -1) {
          const cutPoint = Math.max(lastCompleteObject, lastCompleteArray) + 1;
          fixed = fixed.substring(0, cutPoint);
        }

        // Ensure proper closure
        const openBraces = (fixed.match(/{/g) || []).length;
        const closeBraces = (fixed.match(/}/g) || []).length;
        const openBrackets = (fixed.match(/\[/g) || []).length;
        const closeBrackets = (fixed.match(/\]/g) || []).length;

        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          fixed += "]";
        }
        for (let i = 0; i < openBraces - closeBraces; i++) {
          fixed += "}";
        }

        return fixed;
      },

      // Strategy 2: Extract only the fixes array if it's complete
      (json: string) => {
        const fixesMatch = json.match(/"fixes"\s*:\s*\[(.*?)\]/s);
        if (fixesMatch) {
          return `{"totalIssues": 5, "fixes": [${fixesMatch[1]}], "recommendations": []}`;
        }
        return null;
      },

      // Strategy 3: Create minimal valid structure
      (json: string) => {
        return '{"totalIssues": 0, "fixes": [], "recommendations": []}';
      },
    ];

    for (const strategy of strategies) {
      try {
        const fixed = strategy(jsonString);
        if (fixed) {
          JSON.parse(fixed); // Test if it's valid
          return fixed;
        }
      } catch (error) {
        continue; // Try next strategy
      }
    }

    return null;
  }

 //server/services/ai-fix-service.ts - Complete iterativelyFixUntilAcceptable method

async iterativelyFixUntilAcceptable(
  websiteId: string,
  userId: string,
  options: {
    targetScore?: number;
    maxIterations?: number;
    minImprovementThreshold?: number;
    fixTypes?: string[];
    maxChangesPerIteration?: number;
    skipBackup?: boolean;
  } = {}
): Promise<IterativeFixResult> {
  const {
    targetScore = 85,
    maxIterations = 5,
    minImprovementThreshold = 2,
    fixTypes,
    maxChangesPerIteration = 20,
    skipBackup = false,
  } = options;

  this.log = [];
  const iterativeSessionId = randomUUID();
  
  this.addLog(
    `Starting iterative AI fix process (target: ${targetScore}, max iterations: ${maxIterations}, session: ${iterativeSessionId})`
  );

  const iterations: IterationResult[] = [];
  let currentIteration = 0;
  let stoppedReason: "target_reached" | "max_iterations" | "no_improvement" | "error" = "error";
  let allAppliedFixes: AIFix[] = [];
  let allErrors: string[] = [];

  try {
    // Get website details
    const website = await storage.getUserWebsite(websiteId, userId);
    if (!website) {
      throw new Error("Website not found or access denied");
    }

    this.addLog(
      `Starting iterative fixes for website: ${website.name} (${website.url})`
    );

    // Get initial SEO score
    let currentScore = await this.getCurrentSeoScore(websiteId);
    if (currentScore === null) {
      this.addLog(
        "No existing SEO analysis found. Running initial analysis...",
        "info"
      );
      const initialAnalysis = await seoService.analyzeWebsite(
        website.url,
        [],
        userId,
        websiteId
      );
      currentScore = initialAnalysis.score;

      // Save initial analysis
      await storage.createSeoReport({
        userId,
        websiteId,
        score: initialAnalysis.score,
        issues: initialAnalysis.issues,
        recommendations: initialAnalysis.recommendations,
        pageSpeedScore: initialAnalysis.pageSpeedScore,
        metadata: {
          iterativeFixSession: iterativeSessionId,
          iterationNumber: 0,
          isInitialAnalysis: true
        }
      });
    }

    const initialScore = currentScore;
    this.addLog(`Initial SEO score: ${initialScore}/100`);

    if (currentScore >= targetScore) {
      this.addLog(
        `Website already meets target score (${currentScore} >= ${targetScore})`,
        "success"
      );
      stoppedReason = "target_reached";
    } else {
      // Create backup before starting (unless skipped)
      if (!skipBackup) {
        await this.createWebsiteBackup(website, userId);
        this.addLog(
          "Website backup created before iterative fixes",
          "success"
        );
      }

      // Iterative improvement loop
     while (currentIteration < maxIterations && currentScore < targetScore) {
      currentIteration++;
      const iterationStartTime = Date.now();

      this.addLog(`\n--- Iteration ${currentIteration}/${maxIterations} ---`);
      this.addLog(`Current score: ${currentScore}/100, Target: ${targetScore}/100`);

      // Get tracked issues for this iteration - ONLY unfixed ones
      const trackedIssues = await storage.getTrackedSeoIssues(websiteId, userId, {
        autoFixableOnly: true,
        status: ['detected', 'reappeared'] // Only get issues that need fixing
      });

      this.addLog(`Found ${trackedIssues.length} fixable issues for iteration ${currentIteration} (excluding already fixed)`);

      if (trackedIssues.length === 0) {
        this.addLog(
          `No unfixed issues found in iteration ${currentIteration}. All issues have been resolved!`,
          "success"
        );
        stoppedReason = "target_reached"; // Change reason since no more fixes needed
        break;
      }

        // Convert tracked issues to fixable issues format
        const fixableIssues = trackedIssues.map(trackedIssue => ({
          type: trackedIssue.issueType,
          description: trackedIssue.issueDescription || trackedIssue.issueTitle,
          element: trackedIssue.elementPath || trackedIssue.issueType,
          before: trackedIssue.currentValue || "Current state",
          after: trackedIssue.recommendedValue || "Improved state",
          impact: trackedIssue.severity === 'critical' ? 'high' as const : 
                  trackedIssue.severity === 'warning' ? 'medium' as const : 'low' as const,
          trackedIssueId: trackedIssue.id
        }));

        const fixesToApply = this.prioritizeAndFilterFixes(
          fixableIssues,
          fixTypes,
          maxChangesPerIteration
        );

        this.addLog(`Will attempt ${fixesToApply.length} fixes in iteration ${currentIteration}`);

        // Mark issues as fixing
        const issueIds = fixesToApply
          .map(fix => fix.trackedIssueId)
          .filter(id => id);
        
        if (issueIds.length > 0) {
          await storage.bulkUpdateSeoIssueStatuses(issueIds, 'fixing', iterativeSessionId);
        }

        // Apply fixes for this iteration
        const fixStartTime = Date.now();
        const applyResult = await this.applyComprehensiveFixes(
          website,
          fixesToApply
        );
        const fixTime = Date.now() - fixStartTime;

        const iterationFixes = applyResult.appliedFixes;
        allAppliedFixes.push(...iterationFixes);
        
        if (applyResult.errors.length > 0) {
          allErrors.push(...applyResult.errors.map(err => `Iteration ${currentIteration}: ${err}`));
        }

        const successfulFixes = iterationFixes.filter(f => f.success);
        this.addLog(
          `Applied ${successfulFixes.length}/${iterationFixes.length} fixes in iteration ${currentIteration}`
        );

        // Update issue statuses based on fix results
        await this.updateIssueStatusesForFix(
          websiteId,
          userId,
          iterationFixes,
          iterativeSessionId,
          false
        );

        // If no successful fixes, stop trying
        if (successfulFixes.length === 0) {
          this.addLog(
            `No successful fixes in iteration ${currentIteration}. Stopping.`,
            "warning"
          );
          stoppedReason = "no_improvement";
          break;
        }

        // Wait for changes to propagate
        this.addLog("Waiting for changes to propagate before re-analysis...");
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Re-analyze to get new score
        const analysisStartTime = Date.now();
        this.addLog("Re-analyzing website to measure improvement...");

        const newAnalysis = await seoService.analyzeWebsite(
          website.url, 
          [], 
          userId, 
          websiteId
        );
        const newScore = newAnalysis.score;
        const analysisTime = Date.now() - analysisStartTime;

        // Save the new analysis to database
        await storage.createSeoReport({
          userId,
          websiteId,
          score: newAnalysis.score,
          issues: newAnalysis.issues,
          recommendations: newAnalysis.recommendations,
          pageSpeedScore: newAnalysis.pageSpeedScore,
          metadata: {
            iterativeFixSession: iterativeSessionId,
            iterationNumber: currentIteration,
            fixesAppliedInIteration: successfulFixes.length,
            previousScore: currentScore,
            scoreImprovement: newScore - currentScore,
            fixSessionId: iterativeSessionId
          },
        });

        const improvement = newScore - currentScore;
        const totalIterationTime = Date.now() - iterationStartTime;

        // Record this iteration
        iterations.push({
          iterationNumber: currentIteration,
          scoreBefore: currentScore,
          scoreAfter: newScore,
          fixesApplied: iterationFixes.length,
          fixesSuccessful: successfulFixes.length,
          improvement,
          timestamp: new Date().toISOString(),
          fixDetails: iterationFixes,
          analysisTime: Math.round(analysisTime / 1000),
          fixTime: Math.round(fixTime / 1000),
        });

        this.addLog(
          `Score changed: ${currentScore} → ${newScore} (${
            improvement >= 0 ? "+" : ""
          }${improvement.toFixed(1)})`,
          improvement > 0 ? "success" : "warning"
        );

        // Check if we've reached the target
        if (newScore >= targetScore) {
          this.addLog(
            `Target score reached! ${newScore} >= ${targetScore}`,
            "success"
          );
          stoppedReason = "target_reached";
          currentScore = newScore;
          break;
        }

        // Check if improvement is too small to continue
        if (improvement < minImprovementThreshold) {
          this.addLog(
            `Improvement too small (${improvement.toFixed(
              1
            )} < ${minImprovementThreshold}). Stopping.`,
            "warning"
          );
          stoppedReason = "no_improvement";
          currentScore = newScore;
          break;
        }

        currentScore = newScore;
        this.addLog(`Iteration ${currentIteration} completed. Continuing...`);
      }

      // Check why we stopped
      if (currentIteration >= maxIterations && currentScore < targetScore) {
        this.addLog(
          `Reached maximum iterations (${maxIterations}) without achieving target score`,
          "warning"
        );
        stoppedReason = "max_iterations";
      }
    }

    const finalScore = currentScore;
    const scoreImprovement = finalScore - initialScore;

    // Update website with final score
    await storage.updateWebsite(websiteId, {
      seoScore: finalScore,
      updatedAt: new Date()
    });

    // Log the final activity with comprehensive metadata
    await storage.createActivityLog({
      userId,
      websiteId,
      type: "iterative_ai_fixes_completed",
      description: `Iterative AI fixes completed: ${initialScore} → ${finalScore} (+${scoreImprovement.toFixed(
        1
      )}) in ${currentIteration} iterations`,
      metadata: {
        iterativeFixSession: iterativeSessionId,
        initialScore,
        finalScore,
        scoreImprovement,
        targetScore,
        iterationsCompleted: currentIteration,
        stoppedReason,
        totalFixesApplied: allAppliedFixes.filter(f => f.success).length,
        totalFixesAttempted: allAppliedFixes.length,
        iterationsData: iterations,
        fixTypes: [...new Set(allAppliedFixes.map(f => f.type))],
        totalProcessingTime: iterations.reduce((sum, iter) => sum + (iter.analysisTime + iter.fixTime), 0),
        averageImprovementPerIteration: iterations.length > 0 
          ? (scoreImprovement / iterations.length) 
          : 0,
        completedSuccessfully: stoppedReason !== 'error'
      },
    });

    this.addLog(`\n=== ITERATIVE FIX COMPLETED ===`);
    this.addLog(`Initial score: ${initialScore}/100`);
    this.addLog(`Final score: ${finalScore}/100`);
    this.addLog(
      `Improvement: ${
        scoreImprovement >= 0 ? "+" : ""
      }${scoreImprovement.toFixed(1)} points`
    );
    this.addLog(`Iterations completed: ${currentIteration}`);
    this.addLog(`Reason for stopping: ${stoppedReason}`);
    this.addLog(
      `Total fixes applied: ${allAppliedFixes.filter(f => f.success).length}`
    );

    // Calculate detailed breakdown
    const detailedBreakdown = this.calculateDetailedBreakdown(allAppliedFixes);
    const estimatedImpact = this.calculateEstimatedImpact(allAppliedFixes);

    // Generate recommendations based on final state
    const recommendations: string[] = [];
    
    if (finalScore < targetScore) {
      const remainingPoints = targetScore - finalScore;
      recommendations.push(
        `Still need ${remainingPoints.toFixed(1)} points to reach target score of ${targetScore}.`
      );
      
      if (stoppedReason === "no_improvement") {
        recommendations.push("Consider running a fresh SEO analysis to identify new fixable issues.");
        recommendations.push("Focus on manual improvements like page speed optimization and content quality.");
      } else if (stoppedReason === "max_iterations") {
        recommendations.push("Run another iterative fix session to continue improving.");
        recommendations.push("Consider increasing the maximum iterations limit for more thorough optimization.");
      }
    } else {
      recommendations.push("Target score achieved! Focus on maintaining SEO quality.");
      recommendations.push("Consider setting a higher target score for continued improvement.");
    }

    if (allAppliedFixes.filter(f => f.success).length > 0) {
      recommendations.push("Monitor the website for any issues that might reappear after fixes.");
    }



    const result: IterativeFixResult = {
      success: true,
      dryRun: false,
      fixesApplied: allAppliedFixes,
      stats: {
        totalIssuesFound: allAppliedFixes.length,
        fixesAttempted: allAppliedFixes.length,
        fixesSuccessful: allAppliedFixes.filter(f => f.success).length,
        fixesFailed: allAppliedFixes.filter(f => !f.success).length,
        estimatedImpact,
        detailedBreakdown,
      },
      errors: allErrors.length > 0 ? allErrors : undefined,
      message: `Iterative AI fixes completed: ${initialScore} → ${finalScore} (+${scoreImprovement.toFixed(
        1
      )}) in ${currentIteration} iterations`,
      detailedLog: [...this.log],
      // Extended iterative properties
      iterations,
      finalScore,
      initialScore,
      scoreImprovement,
      targetScore,
      iterationsCompleted: currentIteration,
      stoppedReason,
      fixSessionId: iterativeSessionId,
      recommendations,
      applied: {
        totalFixesApplied: allAppliedFixes.filter(f => f.success).length,
        imagesAltUpdated: detailedBreakdown.altTextFixed,
        metaDescriptionsUpdated: detailedBreakdown.metaDescriptionsUpdated,
        titleTagsUpdated: detailedBreakdown.titleTagsImproved,
        headingStructureFixed: detailedBreakdown.headingStructureFixed,
        averageImprovementPerIteration: iterations.length > 0 
          ? Number((scoreImprovement / iterations.length).toFixed(1))
          : 0
      },
      targetReached: stoppedReason === "target_reached"
    };

    return result;

  } catch (error) {
    this.addLog(
      `Iterative fix process failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      "error"
    );
    console.error("Iterative AI fix error:", error);

    // Try to get current score for error response
    let currentScoreForError = 0;
    try {
      const errorScore = await this.getCurrentSeoScore(websiteId);
      currentScoreForError = errorScore || 0;
    } catch (scoreError) {
      console.error("Failed to get score for error response:", scoreError);
    }

    const result: IterativeFixResult = {
      success: false,
      dryRun: false,
      fixesApplied: allAppliedFixes,
      stats: {
        totalIssuesFound: 0,
        fixesAttempted: allAppliedFixes.length,
        fixesSuccessful: allAppliedFixes.filter(f => f.success).length,
        fixesFailed: allAppliedFixes.filter(f => !f.success).length + 1,
        estimatedImpact: "none",
        detailedBreakdown: this.calculateDetailedBreakdown(allAppliedFixes),
      },
      errors: [
        ...allErrors,
        error instanceof Error ? error.message : "Unknown error",
      ],
      message: `Iterative AI fix failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      detailedLog: [...this.log],
      // Extended iterative properties
      iterations,
      finalScore: currentScoreForError,
      initialScore: 0,
      scoreImprovement: 0,
      targetScore,
      iterationsCompleted: currentIteration,
      stoppedReason: "error",
      fixSessionId: iterativeSessionId,
      recommendations: [
        "Try running a single AI fix to identify and resolve immediate issues.",
        "Check website connectivity and WordPress credentials.",
        "Run a fresh SEO analysis to identify current issues."
      ],
      applied: {
        totalFixesApplied: allAppliedFixes.filter(f => f.success).length,
        imagesAltUpdated: 0,
        metaDescriptionsUpdated: 0,
        titleTagsUpdated: 0,
        headingStructureFixed: 0,
        averageImprovementPerIteration: 0
      },
      targetReached: false
    };

    return result;
  }
}

private async isIssueAlreadyFixed(
  websiteId: string, 
  userId: string, 
  issueType: string, 
  issueTitle: string
): Promise<boolean> {
  try {
    const existingIssues = await storage.getTrackedSeoIssues(websiteId, userId, {
      status: ['fixed', 'resolved']
    });

    return existingIssues.some(issue => 
      issue.issueType === issueType || 
      issue.issueTitle.toLowerCase().includes(issueTitle.toLowerCase().substring(0, 20))
    );
  } catch (error) {
    console.warn('Failed to check if issue is already fixed:', error);
    return false; // If we can't check, proceed with the fix
  }
}


  private async getCurrentSeoScore(websiteId: string): Promise<number | null> {
    try {
      const seoReports = await storage.getSeoReportsByWebsite(websiteId);
      return seoReports.length > 0 ? seoReports[0].score : null;
    } catch (error) {
      this.addLog(
        `Failed to get current SEO score: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "warning"
      );
      return null;
    }
  }

  // Helper method to determine if a score is acceptable
  static isScoreAcceptable(score: number, targetScore: number = 85): boolean {
    return score >= targetScore;
  }

  // Helper method to estimate remaining fix iterations needed
  static estimateIterationsNeeded(
    currentScore: number,
    targetScore: number,
    averageImprovementPerIteration: number = 5
  ): number {
    if (currentScore >= targetScore) return 0;
    const pointsNeeded = targetScore - currentScore;
    return Math.ceil(pointsNeeded / averageImprovementPerIteration);
  }

  private validateAnalysisStructure(analysis: any): boolean {
    return (
      analysis &&
      typeof analysis.totalIssues === "number" &&
      Array.isArray(analysis.fixes) &&
      Array.isArray(analysis.recommendations) &&
      analysis.fixes.every(
        (fix: any) => fix.type && fix.description && fix.impact
      )
    );
  }

  private createFallbackAnalysis(seoReport: any) {
    this.addLog("Creating fallback analysis from SEO report only", "warning");

    const fallbackFixes = [];
    const issues = seoReport.issues || [];

    // Create basic fixes based on common SEO issues
    if (issues.some((issue: any) => issue.type === "meta_description")) {
      fallbackFixes.push({
        type: "missing_meta_description",
        description: "Meta description needs improvement",
        element: 'meta[name="description"]',
        before: "Current meta description",
        after: "Optimized meta description",
        impact: "high",
      });
    }

    if (issues.some((issue: any) => issue.type === "title_tag")) {
      fallbackFixes.push({
        type: "poor_title_tag",
        description: "Title tag needs optimization",
        element: "title",
        before: "Current title",
        after: "Optimized title",
        impact: "high",
      });
    }

    return {
      totalIssues: fallbackFixes.length,
      fixableIssues: fallbackFixes,
      recommendations: [
        "Run a fresh SEO analysis for detailed recommendations",
      ],
    };
  }

  private async fetchWebsiteContentWithTimeout(
    url: string,
    timeout: number = 10000
  ): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AI-SEO-Fix-Bot/1.0)",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch website: ${response.status} ${response.statusText}`
        );
      }

      return await response.text();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Website fetch timed out");
      }
      throw error;
    }
  }

  private analyzeHTMLDirectly($: cheerio.CheerioAPI) {
    const fixes: any[] = [];
    let totalIssues = 0;

    // Check for missing alt text
    const imagesWithoutAlt = $('img:not([alt]), img[alt=""]');
    imagesWithoutAlt.each((_, el) => {
      const $img = $(el);
      const src = $img.attr("src") || "";
      if (src && !src.startsWith("data:")) {
        // Skip data URLs
        fixes.push({
          type: "missing_alt_text",
          description: `Image missing alt text: ${src.substring(0, 30)}...`,
          element: `img[src*="${src.split("/").pop()}"]`,
          before: "No alt text",
          after: "Generated alt text based on image context",
          impact: "medium",
          elementPath: `img[src="${src}"]`,
        });
        totalIssues++;
      }
    });

    // Check meta description
    const metaDesc = $('meta[name="description"]');
    if (metaDesc.length === 0) {
      fixes.push({
        type: "missing_meta_description",
        description: "Meta description is missing",
        element: 'meta[name="description"]',
        before: "No meta description",
        after: "SEO-optimized meta description (120-160 chars)",
        impact: "high",
      });
      totalIssues++;
    } else {
      const content = metaDesc.attr("content") || "";
      if (content.length < 120 || content.length > 160) {
        fixes.push({
          type: "missing_meta_description",
          description: `Meta description is ${
            content.length < 120 ? "too short" : "too long"
          } (${content.length} chars)`,
          element: 'meta[name="description"]',
          before: content.substring(0, 50) + "...",
          after: "Optimized meta description (120-160 characters)",
          impact: "high",
        });
        totalIssues++;
      }
    }

    // Check title tag
    const title = $("title");
    if (title.length === 0 || !title.text().trim()) {
      fixes.push({
        type: "poor_title_tag",
        description: "Title tag is missing or empty",
        element: "title",
        before: "No title or empty title",
        after: "SEO-optimized page title (30-60 chars)",
        impact: "high",
      });
      totalIssues++;
    } else if (title.text().length > 60 || title.text().length < 30) {
      fixes.push({
        type: "poor_title_tag",
        description: `Title tag is ${
          title.text().length > 60 ? "too long" : "too short"
        } (${title.text().length} chars)`,
        element: "title",
        before: title.text().substring(0, 50) + "...",
        after: "Optimized title (30-60 chars with keywords)",
        impact: "high",
      });
      totalIssues++;
    }

    // Check heading structure
    const h1s = $("h1");
    if (h1s.length === 0) {
      fixes.push({
        type: "heading_structure",
        description: "No H1 tag found on page",
        element: "h1",
        before: "No H1 tag",
        after: "Added main H1 heading with primary keywords",
        impact: "high",
      });
      totalIssues++;
    } else if (h1s.length > 1) {
      fixes.push({
        type: "heading_structure",
        description: `Multiple H1 tags found (${h1s.length})`,
        element: "h1",
        before: `${h1s.length} H1 tags`,
        after: "1 main H1 tag, others converted to H2/H3",
        impact: "medium",
      });
      totalIssues++;
    }

    this.addLog(`Direct HTML analysis found ${totalIssues} issues`);

    return {
      totalIssues,
      fixes,
      recommendations: [
        "Consider adding more internal links between related pages",
        "Optimize image file sizes for better page speed",
        "Add structured data markup for better search visibility",
      ],
    };
  }

  private deduplicateFixes(fixes: any[]): any[] {
    const seen = new Set<string>();
    return fixes.filter((fix) => {
      const key = `${fix.type}-${fix.element || fix.description}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

 private async applyComprehensiveFixes(
  website: any,
  fixes: AIFix[]
): Promise<{ appliedFixes: AIFix[]; errors: string[] }> {
  this.addLog(
    `Applying ${fixes.length} comprehensive fixes to WordPress site: ${website.url}`
  );

  // Filter out any fixes for issues that might have been fixed since we started
  const validFixes = [];
  for (const fix of fixes) {
    const alreadyFixed = await this.isIssueAlreadyFixed(
      website.id, 
      website.userId, // Assuming website has userId
      fix.type, 
      fix.description
    );

    if (alreadyFixed) {
      this.addLog(`Skipping fix for ${fix.type} - already fixed`, "info");
    } else {
      validFixes.push(fix);
    }
  }

  this.addLog(`After filtering already-fixed issues: ${validFixes.length} fixes remain`);

  if (validFixes.length === 0) {
    return {
      appliedFixes: [],
      errors: ["All issues were already fixed by a previous operation"]
    };
  }

    const creds: WordPressCredentials = {
      url: website.url,
      username: website.wpUsername || "admin",
      applicationPassword: website.wpApplicationPassword,
    };

    if (!creds.applicationPassword) {
      throw new Error(
        "Missing WordPress application password. Please configure WordPress credentials."
      );
    }

    this.addLog(
      `WordPress connection: ${creds.url}, User: ${creds.username}`,
      "info"
    );

    // Enhanced WordPress connection test with detailed diagnostics
    try {
      const connectionTest = await wordpressService.testConnection(creds);

      if (!connectionTest.success) {
        throw new Error(
          connectionTest.message || "WordPress connection failed"
        );
      }

      this.addLog("WordPress connection verified successfully", "success");
    } catch (connectionError) {
      this.addLog(
        `Connection test failed: ${
          connectionError instanceof Error
            ? connectionError.message
            : "Unknown error"
        }`,
        "error"
      );
      throw connectionError;
    }

    const appliedFixes: AIFix[] = [];
    const errors: string[] = [];

    // Group fixes by type for batch processing
    const fixesByType = this.groupFixesByType(fixes);

    // Apply each type of fix with individual error handling
    for (const [fixType, typeFixes] of Object.entries(fixesByType)) {
      this.addLog(`Processing ${typeFixes.length} fixes of type: ${fixType}`);

      try {
        const result = await this.applyFixesByType(creds, fixType, typeFixes);
        appliedFixes.push(...result.applied);
        if (result.errors.length > 0) {
          errors.push(...result.errors);
        }

        const successCount = result.applied.filter((f) => f.success).length;
        this.addLog(
          `Completed ${fixType}: ${successCount}/${result.applied.length} successful`,
          successCount > 0 ? "success" : "warning"
        );
      } catch (error) {
        const errorMessage = `Failed to apply ${fixType} fixes: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        this.addLog(errorMessage, "error");
        errors.push(errorMessage);

        // Mark all fixes of this type as failed
        appliedFixes.push(
          ...typeFixes.map((fix) => ({
            ...fix,
            success: false,
            error: errorMessage,
          }))
        );
      }
    }

    return { appliedFixes, errors };
  }

  private async fixMissingH1Tags(
  creds: WordPressCredentials,
  fixes: AIFix[]
): Promise<{ applied: AIFix[]; errors: string[] }> {
  this.addLog(`Fixing missing H1 tags for ${fixes.length} items`);

  const applied: AIFix[] = [];
  const errors: string[] = [];

  try {
    const [posts, pages] = await Promise.all([
      this.getWordPressContentWithType(creds, "posts").catch(() => []),
      this.getWordPressContentWithType(creds, "pages").catch(() => []),
    ]);

    const allContent = [...posts, ...pages];
    this.addLog(`Found ${allContent.length} items to check for missing H1 tags`);

    let processedCount = 0;
    let fixedCount = 0;

    for (const content of allContent) {
      try {
        processedCount++;
        const contentHtml = content.content?.rendered || content.content || "";
        
        if (!contentHtml) {
          this.addLog(`No content HTML found for "${content.title?.rendered || content.title}"`, "warning");
          continue;
        }

        const $ = cheerio.load(contentHtml);
        const h1s = $("h1");

        this.addLog(`Checking for missing H1 in "${content.title?.rendered || content.title}": found ${h1s.length} H1 tags`);

        // Only add H1 if completely missing
        if (h1s.length === 0) {
          try {
            const title = content.title?.rendered || content.title || "Page Title";
            
            // Add H1 at the beginning of content
            const updatedContent = `<h1>${title}</h1>\n${contentHtml}`;
            
            await this.updateWordPressContent(creds, content.id, {
              content: updatedContent,
            }, content.contentType);

            applied.push({
              type: "missing_h1",
              description: `Added missing H1 tag: "${title}"`,
              element: `${content.contentType}-${content.id}`,
              before: "No H1 tag found",
              after: `<h1>${title}</h1>`,
              success: true,
              impact: "high",
              wordpressPostId: content.id,
            });

            fixedCount++;
            this.addLog(`Added H1 tag to: ${content.title?.rendered || content.title} (${content.contentType} ${content.id})`, "success");
          } catch (updateError) {
            const errorMsg = `Failed to add H1 tag: ${updateError.message}`;
            errors.push(errorMsg);
            applied.push({
              type: "missing_h1",
              description: `Failed to add H1 tag for "${content.title?.rendered || content.title}"`,
              element: `${content.contentType}-${content.id}`,
              before: "No H1 tag",
              after: "Failed to add H1",
              success: false,
              impact: "high",
              error: errorMsg,
              wordpressPostId: content.id,
            });
            this.addLog(errorMsg, "error");
          }
        } else {
          this.addLog(`H1 tag already exists for "${content.title?.rendered || content.title}"`, "info");
        }
      } catch (contentError) {
        this.addLog(`Error processing H1 for "${content.title?.rendered || content.title}": ${contentError.message}`, "warning");
      }
    }

    this.addLog(`Processed ${processedCount} items, fixed ${fixedCount} missing H1 tags`, "success");
  } catch (error) {
    const errorMsg = `Missing H1 fix failed: ${error.message}`;
    errors.push(errorMsg);
    this.addLog(errorMsg, "error");
  }

  return { applied, errors };
}


private async fixLongMetaDescriptions(
  creds: WordPressCredentials,
  fixes: AIFix[]
): Promise<{ applied: AIFix[]; errors: string[] }> {
  this.addLog(`Fixing long meta descriptions for ${fixes.length} items`);

  const applied: AIFix[] = [];
  const errors: string[] = [];

  try {
    const [posts, pages] = await Promise.all([
      this.getWordPressContentWithType(creds, "posts").catch(() => []),
      this.getWordPressContentWithType(creds, "pages").catch(() => []),
    ]);

    const allContent = [...posts, ...pages].slice(0, 10);
    this.addLog(`Found ${allContent.length} items to check for long meta descriptions`);

    let processedCount = 0;
    let fixedCount = 0;

    for (const content of allContent) {
      try {
        processedCount++;
        const excerpt = content.excerpt?.rendered || content.excerpt || "";

        this.addLog(`Checking meta description for "${content.title?.rendered || content.title}": current length ${excerpt.length}`, "info");

        // Only shorten if too long (over 160 characters)
        if (excerpt && excerpt.length > 160) {
          try {
            // Shorten to 157 characters to leave room for "..."
            let shortenedDescription = excerpt.substring(0, 157);
            
            // Try to end at a sentence boundary
            const lastPeriod = shortenedDescription.lastIndexOf('.');
            const lastSpace = shortenedDescription.lastIndexOf(' ');
            
            if (lastPeriod > 140) {
              shortenedDescription = excerpt.substring(0, lastPeriod + 1);
            } else if (lastSpace > 140) {
              shortenedDescription = excerpt.substring(0, lastSpace) + "...";
            } else {
              shortenedDescription = shortenedDescription + "...";
            }

            await this.updateWordPressContent(creds, content.id, {
              excerpt: shortenedDescription,
            }, content.contentType);

            applied.push({
              type: "meta_description_too_long",
              description: `Shortened meta description from ${excerpt.length} to ${shortenedDescription.length} characters`,
              element: `${content.contentType}-${content.id}`,
              before: excerpt.substring(0, 100) + "...",
              after: shortenedDescription,
              success: true,
              impact: "medium",
              wordpressPostId: content.id,
            });

            fixedCount++;
            this.addLog(`Shortened meta description for: ${content.title?.rendered || content.title} (${excerpt.length} → ${shortenedDescription.length} chars)`, "success");
          } catch (updateError) {
            const errorMsg = `Failed to shorten meta description: ${updateError.message}`;
            errors.push(errorMsg);
            applied.push({
              type: "meta_description_too_long",
              description: `Failed to shorten meta description for "${content.title?.rendered || content.title}"`,
              element: `${content.contentType}-${content.id}`,
              before: excerpt.substring(0, 100) + "...",
              after: "Failed to shorten",
              success: false,
              impact: "medium",
              error: errorMsg,
              wordpressPostId: content.id,
            });
            this.addLog(errorMsg, "error");
          }
        } else {
          this.addLog(`Meta description length acceptable for "${content.title?.rendered || content.title}" (${excerpt.length} chars)`, "info");
        }
      } catch (contentError) {
        this.addLog(`Error processing meta description for "${content.title?.rendered || content.title}": ${contentError.message}`, "warning");
      }
    }

    this.addLog(`Processed ${processedCount} items, fixed ${fixedCount} long meta descriptions`, "success");
  } catch (error) {
    const errorMsg = `Long meta description fix failed: ${error.message}`;
    errors.push(errorMsg);
    this.addLog(errorMsg, "error");
  }

  return { applied, errors };
}

  // Rest of the methods remain the same as in the original code...
  private groupFixesByType(fixes: AIFix[]): Record<string, AIFix[]> {
    return fixes.reduce((groups, fix) => {
      (groups[fix.type] = groups[fix.type] || []).push(fix);
      return groups;
    }, {} as Record<string, AIFix[]>);
  }

   private async applyFixesByType(
    creds: WordPressCredentials,
    fixType: string,
    fixes: AIFix[]
  ): Promise<{ applied: AIFix[]; errors: string[] }> {
    const applied: AIFix[] = [];
    const errors: string[] = [];

    switch (fixType) {
      case "missing_alt_text":
        const altResult = await this.fixImageAltTextComprehensive(creds, fixes);
        applied.push(...altResult.applied);
        errors.push(...altResult.errors);
        break;

      case "missing_meta_description":
        const metaResult = await this.fixMetaDescriptionsComprehensive(creds, fixes);
        applied.push(...metaResult.applied);
        errors.push(...metaResult.errors);
        break;

      case "missing_h1":
        const h1FixResult = await this.fixMissingH1Tags(creds, fixes);
        applied.push(...h1FixResult.applied);
        errors.push(...h1FixResult.errors);
        break;

      case "meta_description_too_long":
        const metaTooLongResult = await this.fixLongMetaDescriptions(creds, fixes);
        applied.push(...metaTooLongResult.applied);
        errors.push(...metaTooLongResult.errors);
        break;

      case "poor_title_tag":
        const titleResult = await this.fixTitleTagsComprehensive(creds, fixes);
        applied.push(...titleResult.applied);
        errors.push(...titleResult.errors);
        break;

      case "heading_structure":
        const headingResult = await this.fixHeadingStructureComprehensive(creds, fixes);
        applied.push(...headingResult.applied);
        errors.push(...headingResult.errors);
        break;

      case "content_quality":
      case "low_content_quality":
        // Enhanced content quality improvement
        const contentResult = await this.fixContentQuality(creds, fixes);
        applied.push(...contentResult.applied);
        errors.push(...contentResult.errors);
        break;

      case "missing_h1_tag":
        const h1Result = await this.fixHeadingStructureComprehensive(creds, fixes);
        applied.push(...h1Result.applied);
        errors.push(...h1Result.errors);
        break;

      case "internal_linking":
        const linkingResult = await this.improveInternalLinking(creds, fixes);
        applied.push(...linkingResult.applied);
        errors.push(...linkingResult.errors);
        break;

      case "image_optimization":
        this.addLog(`Image optimization requires external tools`, "warning");
        applied.push(
          ...fixes.map((fix) => ({
            ...fix,
            success: false,
            error: "Image optimization requires manual or external tools",
          }))
        );
        break;

      default:
        this.addLog(`Fix type '${fixType}' not implemented yet`, "warning");
        applied.push(
          ...fixes.map((fix) => ({
            ...fix,
            success: false,
            error: `Fix type '${fixType}' not yet implemented`,
          }))
        );
        errors.push(`Fix type '${fixType}' not implemented yet`);
    }

    return { applied, errors };
  }


  private async improveInternalLinking(
    creds: WordPressCredentials,
    fixes: AIFix[]
  ): Promise<{ applied: AIFix[]; errors: string[] }> {
    this.addLog(`Improving internal linking for ${fixes.length} items`);

    const applied: AIFix[] = [];
    const errors: string[] = [];

    try {
      const [posts, pages] = await Promise.all([
        this.getWordPressContentWithType(creds, "posts").catch(() => []),
        this.getWordPressContentWithType(creds, "pages").catch(() => []),
      ]);

      const allContent = [...posts, ...pages];
      const contentToProcess = allContent.slice(0, 3); // Limit processing

      // Create a map of all available content for linking opportunities
      const linkingCandidates = allContent.map(item => ({
        id: item.id,
        title: item.title?.rendered || item.title || "",
        url: item.link || `${creds.url}/${item.slug}`,
        contentType: item.contentType,
        excerpt: this.extractTextFromHTML(item.content?.rendered || item.content || "").substring(0, 200),
      }));

      for (const content of contentToProcess) {
        try {
          const title = content.title?.rendered || content.title || "";
          const contentHtml = content.content?.rendered || content.content || "";
          const contentText = this.extractTextFromHTML(contentHtml);

          if (contentText.length < 200) {
            this.addLog(`Skipping internal linking for "${title}" - content too short`, "info");
            continue;
          }

          // Analyze content and suggest internal links
          const linkingSuggestions = await this.generateInternalLinkSuggestions(
            title,
            contentText,
            linkingCandidates.filter(candidate => candidate.id !== content.id)
          );

          if (linkingSuggestions.length > 0) {
            // Apply internal links to content
            const updatedContent = await this.addInternalLinksToContent(
              contentHtml,
              linkingSuggestions
            );

            if (updatedContent !== contentHtml) {
              try {
                await this.updateWordPressContent(creds, content.id, {
                  content: updatedContent,
                }, content.contentType);

                applied.push({
                  type: "internal_linking",
                  description: `Added ${linkingSuggestions.length} internal links`,
                  element: `${content.contentType}-${content.id}`,
                  before: "Limited internal linking",
                  after: `Added links to: ${linkingSuggestions.map(l => l.targetTitle).slice(0, 2).join(", ")}`,
                  success: true,
                  impact: "medium",
                  wordpressPostId: content.id,
                });

                this.addLog(
                  `Added ${linkingSuggestions.length} internal links to: "${title}"`,
                  "success"
                );
              } catch (updateError) {
                const errorMsg = `Failed to update content with internal links: ${updateError.message}`;
                errors.push(errorMsg);
                this.addLog(errorMsg, "error");
              }
            }
          } else {
            this.addLog(`No suitable internal linking opportunities found for "${title}"`, "info");
          }
        } catch (contentError) {
          this.addLog(
            `Error processing internal links for "${content.title?.rendered || content.title}": ${contentError.message}`,
            "warning"
          );
        }
      }
    } catch (error) {
      const errorMsg = `Internal linking improvement failed: ${error.message}`;
      errors.push(errorMsg);
      this.addLog(errorMsg, "error");
    }

    return { applied, errors };
  }

  private async generateInternalLinkSuggestions(
    currentTitle: string,
    currentContent: string,
    linkingCandidates: Array<{
      id: number;
      title: string;
      url: string;
      contentType: string;
      excerpt: string;
    }>
  ): Promise<Array<{
    anchorText: string;
    targetUrl: string;
    targetTitle: string;
    relevanceScore: number;
  }>> {
    const provider = this.selectAIProvider();
    if (!provider) {
      return [];
    }

    try {
      const systemPrompt = `You are an SEO specialist focused on internal linking. Analyze the current content and suggest relevant internal links from the available pages. Return a JSON array of suggestions:

[
  {
    "anchorText": "relevant phrase from current content",
    "targetUrl": "url of target page",
    "targetTitle": "title of target page",
    "relevanceScore": number (0-100)
  }
]

Only suggest highly relevant links (score > 70). Maximum 3 suggestions.`;

      const candidatesText = linkingCandidates
        .slice(0, 10) // Limit candidates to prevent token overflow
        .map(c => `- "${c.title}" (${c.url}): ${c.excerpt}`)
        .join('\n');

      const userPrompt = `Current Page: "${currentTitle}"

Current Content: "${currentContent.substring(0, 1000)}"

Available Pages for Linking:
${candidatesText}

Suggest relevant internal links:`;

      const result = await this.callAIProvider(provider, systemPrompt, userPrompt, 600, 0.3);
      const suggestions = JSON.parse(this.cleanAIResponse(result));

      return Array.isArray(suggestions) 
        ? suggestions.filter(s => s.relevanceScore > 70).slice(0, 3)
        : [];
    } catch (error) {
      this.addLog(`Internal link suggestion generation failed: ${error.message}`, "warning");
      return [];
    }
  }

  private async addInternalLinksToContent(
    contentHtml: string,
    linkingSuggestions: Array<{
      anchorText: string;
      targetUrl: string;
      targetTitle: string;
      relevanceScore: number;
    }>
  ): Promise<string> {
    let updatedContent = contentHtml;

    for (const suggestion of linkingSuggestions) {
      // Find the anchor text in content and replace with link
      const regex = new RegExp(`\\b${suggestion.anchorText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(updatedContent)) {
        updatedContent = updatedContent.replace(
          regex,
          `<a href="${suggestion.targetUrl}" title="${suggestion.targetTitle}">${suggestion.anchorText}</a>`
        );
      }
    }

    return updatedContent;
  }


  private async fixImageAltTextComprehensive(
    creds: WordPressCredentials,
    fixes: AIFix[]
  ): Promise<{ applied: AIFix[]; errors: string[] }> {
    this.addLog(`Fixing alt text for ${fixes.length} images`);

    const applied: AIFix[] = [];
    const errors: string[] = [];

    try {
      // Get all posts and pages with better error handling
      const [posts, pages] = await Promise.all([
        this.getWordPressContentWithType(creds, "posts").catch((e) => {
          this.addLog(`Failed to fetch posts: ${e.message}`, "warning");
          return [];
        }),
        this.getWordPressContentWithType(creds, "pages").catch((e) => {
          this.addLog(`Failed to fetch pages: ${e.message}`, "warning");
          return [];
        }),
      ]);

      const allContent = [...posts, ...pages];
      this.addLog(`Found ${allContent.length} posts/pages to check for images`);

      if (allContent.length === 0) {
        errors.push("No content found to process");
        return { applied, errors };
      }

      let totalImagesFixed = 0;

      for (const content of allContent) {
        // Limit to first 10 items
        try {
          const $ = cheerio.load(content.content.rendered || content.content);
          const imagesWithoutAlt = $('img:not([alt]), img[alt=""]');

          if (imagesWithoutAlt.length > 0) {
            this.addLog(
              `Processing ${imagesWithoutAlt.length} images in "${
                content.title.rendered || content.title
              }"`
            );

            let contentModified = false;

            for (let i = 0; i < Math.min(imagesWithoutAlt.length, 5); i++) {
              // Limit to 5 images per post
              const img = imagesWithoutAlt[i];
              const $img = $(img);
              const src = $img.attr("src") || "";

              if (src && !src.startsWith("data:")) {
                // Generate alt text using AI with fallback
                const altText = await this.generateAltText(
                  src,
                  content.title.rendered || content.title
                );
                $img.attr("alt", altText);
                totalImagesFixed++;
                contentModified = true;

                applied.push({
                  type: "missing_alt_text",
                  description: `Added alt text to image in "${
                    content.title.rendered || content.title
                  }"`,
                  element: src.split("/").pop() || "image",
                  before: "No alt text",
                  after: altText,
                  success: true,
                  impact: "medium",
                  wordpressPostId: content.id,
                });
              }
            }

            // Update the post/page content if modified
            if (contentModified) {
              try {
                const updatedContent = $.html();
                await this.updateWordPressContent(creds, content.id, {
                  content: updatedContent,
                }, content.contentType);
                this.addLog(
                  `Updated content for: ${
                    content.title.rendered || content.title
                  }`,
                  "success"
                );
              } catch (updateError) {
                const errorMsg = `Failed to update content: ${
                  updateError instanceof Error
                    ? updateError.message
                    : "Unknown error"
                }`;
                errors.push(errorMsg);
                this.addLog(errorMsg, "error");
              }
            }
          }
        } catch (contentError) {
          const errorMsg = `Error processing content "${
            content.title.rendered || content.title
          }": ${
            contentError instanceof Error
              ? contentError.message
              : "Unknown error"
          }`;
          errors.push(errorMsg);
          this.addLog(errorMsg, "warning");
        }
      }

      this.addLog(
        `Fixed alt text for ${totalImagesFixed} images total`,
        "success"
      );
    } catch (error) {
      const errorMsg = `Alt text fix failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      errors.push(errorMsg);
      this.addLog(errorMsg, "error");

      // Mark remaining fixes as failed
      applied.push(
        ...fixes.map((fix) => ({
          ...fix,
          success: false,
          error: errorMsg,
        }))
      );
    }

    return { applied, errors };
  }

  private async fixMetaDescriptionsComprehensive(
    creds: WordPressCredentials,
    fixes: AIFix[]
  ): Promise<{ applied: AIFix[]; errors: string[] }> {
    this.addLog(`Fixing meta descriptions for ${fixes.length} items`);

    const applied: AIFix[] = [];
    const errors: string[] = [];

    try {
      const [posts, pages] = await Promise.all([
        this.getWordPressContentWithType(creds, "posts").catch(() => []),
        this.getWordPressContentWithType(creds, "pages").catch(() => []),
      ]);

      const allContent = [...posts, ...pages].slice(0, 10);
      this.addLog(`Found ${allContent.length} items to check for meta descriptions`);

      let processedCount = 0;
      let fixedCount = 0;

      for (const content of allContent) {
        try {
          processedCount++;
          const excerpt = content.excerpt?.rendered || content.excerpt || "";
          const contentText = this.extractTextFromHTML(
            content.content?.rendered || content.content || ""
          );

          this.addLog(`Checking meta description for "${content.title?.rendered || content.title}": current length ${excerpt.length}`, "info");

          // Generate meta description if missing or too short
          if (!excerpt || excerpt.length < 120 || excerpt.length > 160) {
            try {
              const metaDescription = await this.generateMetaDescriptionWithFallback(
                content.title?.rendered || content.title || "",
                contentText
              );

              // Use the correct content type when updating
              await this.updateWordPressContent(creds, content.id, {
                excerpt: metaDescription,
              }, content.contentType); // Pass the content type

              applied.push({
                type: "missing_meta_description",
                description: `Updated meta description for "${content.title?.rendered || content.title}"`,
                element: `${content.contentType}-${content.id}`,
                before: excerpt || "No description",
                after: metaDescription,
                success: true,
                impact: "high",
                wordpressPostId: content.id,
              });

              fixedCount++;
              this.addLog(`Updated meta description for: ${content.title?.rendered || content.title} (${content.contentType} ${content.id})`, "success");
            } catch (updateError) {
              const errorMsg = `Failed to update meta description: ${updateError.message}`;
              errors.push(errorMsg);
              applied.push({
                type: "missing_meta_description",
                description: `Failed to update meta description for "${content.title?.rendered || content.title}"`,
                element: `${content.contentType}-${content.id}`,
                before: excerpt,
                after: "Failed to generate",
                success: false,
                impact: "high",
                error: errorMsg,
                wordpressPostId: content.id,
              });
              this.addLog(errorMsg, "error");
            }
          } else {
            this.addLog(`Meta description already adequate for "${content.title?.rendered || content.title}" (${excerpt.length} chars)`, "info");
          }
        } catch (contentError) {
          this.addLog(`Error processing meta description for "${content.title?.rendered || content.title}": ${contentError.message}`, "warning");
        }
      }

      this.addLog(`Processed ${processedCount} items, fixed ${fixedCount} meta descriptions`, "success");
    } catch (error) {
      const errorMsg = `Meta description fix failed: ${error.message}`;
      errors.push(errorMsg);
      this.addLog(errorMsg, "error");
    }

    return { applied, errors };
  }

  private async fixTitleTagsComprehensive(
    creds: WordPressCredentials,
    fixes: AIFix[]
  ): Promise<{ applied: AIFix[]; errors: string[] }> {
    this.addLog(`Optimizing title tags for ${fixes.length} items`);

    const applied: AIFix[] = [];
    const errors: string[] = [];

    try {
      const [posts, pages] = await Promise.all([
        this.getWordPressContentWithType(creds, "posts").catch(() => []),
        this.getWordPressContentWithType(creds, "pages").catch(() => []),
      ]);

      const allContent = [...posts, ...pages].slice(0, 10); // Limit processing

      for (const content of allContent) {
        try {
          const currentTitle = content.title?.rendered || content.title || "";

          // Optimize title if too long or could be improved
          if (currentTitle.length > 60 || currentTitle.length < 30) {
            const optimizedTitle = await this.optimizeTitle(
              currentTitle,
              this.extractTextFromHTML(
                content.content?.rendered || content.content || ""
              )
            );

            try {
              await this.updateWordPressContent(creds, content.id, {
                title: optimizedTitle,
              }, content.contentType);

              applied.push({
                type: "poor_title_tag",
                description: `Optimized title for "${currentTitle}"`,
                element: `${content.contentType}-${content.id}`,
                before: currentTitle,
                after: optimizedTitle,
                success: true,
                impact: "high",
                wordpressPostId: content.id,
              });

              this.addLog(
                `Optimized title: "${currentTitle}" -> "${optimizedTitle}"`,
                "success"
              );
            } catch (updateError) {
              const errorMsg = `Failed to update title: ${
                updateError instanceof Error
                  ? updateError.message
                  : "Unknown error"
              }`;
              errors.push(errorMsg);
              applied.push({
                type: "poor_title_tag",
                description: `Failed to optimize title for "${currentTitle}"`,
                element: `${content.contentType}-${content.id}`,
                before: currentTitle,
                after: optimizedTitle,
                success: false,
                impact: "high",
                error: errorMsg,
                wordpressPostId: content.id,
              });
            }
          }
        } catch (contentError) {
          this.addLog(
            `Error processing title for "${
              content.title?.rendered || content.title
            }": ${
              contentError instanceof Error
                ? contentError.message
                : "Unknown error"
            }`,
            "warning"
          );
        }
      }
    } catch (error) {
      const errorMsg = `Title optimization failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      errors.push(errorMsg);
      this.addLog(errorMsg, "error");
    }

    return { applied, errors };
  }

  private async fixHeadingStructureComprehensive(
    creds: WordPressCredentials,
    fixes: AIFix[]
  ): Promise<{ applied: AIFix[]; errors: string[] }> {
    this.addLog(`Fixing heading structure for ${fixes.length} items`);

    const applied: AIFix[] = [];
    const errors: string[] = [];

    try {
      const [posts, pages] = await Promise.all([
        this.getWordPressContentWithType(creds, "posts").catch(() => []),
        this.getWordPressContentWithType(creds, "pages").catch(() => []),
      ]);

      const allContent = [...posts, ...pages].slice(0, 10);
      this.addLog(`Found ${allContent.length} items to check for heading structure`);

      let processedCount = 0;
      let fixedCount = 0;

      for (const content of allContent) {
        try {
          processedCount++;
          const contentHtml = content.content?.rendered || content.content || "";
          
          if (!contentHtml) {
            this.addLog(`No content HTML found for "${content.title?.rendered || content.title}"`, "warning");
            continue;
          }

          const $ = cheerio.load(contentHtml);
          const h1s = $("h1");
          let needsUpdate = false;
          let changes: string[] = [];

          this.addLog(`Checking heading structure for "${content.title?.rendered || content.title}": found ${h1s.length} H1 tags`);

          // Fix multiple H1s
          if (h1s.length > 1) {
            h1s.each((index, el) => {
              if (index > 0) {
                // Keep first H1, convert others to H2
                $(el).replaceWith(`<h2>${$(el).text()}</h2>`);
                changes.push(`Converted H1 to H2: "${$(el).text()}"`);
                needsUpdate = true;
              }
            });
          }

          // Add H1 if missing
          if (h1s.length === 0) {
            const title = content.title?.rendered || content.title || "Page Title";
            $.root().prepend(`<h1>${title}</h1>`);
            changes.push(`Added missing H1: "${title}"`);
            needsUpdate = true;
          }

          if (needsUpdate) {
            try {
              const updatedContent = $.root().html() || $.html();
              
              // Use the correct content type when updating
              await this.updateWordPressContent(creds, content.id, {
                content: updatedContent,
              }, content.contentType); // Pass the content type

              applied.push({
                type: "heading_structure",
                description: `Fixed heading structure: ${changes.join(", ")}`,
                element: `${content.contentType}-${content.id}`,
                before: "Invalid heading structure",
                after: changes.join(", "),
                success: true,
                impact: "medium",
                wordpressPostId: content.id,
              });

              fixedCount++;
              this.addLog(`Fixed heading structure for: ${content.title?.rendered || content.title} (${content.contentType} ${content.id})`, "success");
            } catch (updateError) {
              const errorMsg = `Failed to fix heading structure: ${updateError.message}`;
              errors.push(errorMsg);
              applied.push({
                type: "heading_structure",
                description: `Failed to fix heading structure for "${content.title?.rendered || content.title}"`,
                element: `${content.contentType}-${content.id}`,
                before: "Invalid heading structure",
                after: changes.join(", "),
                success: false,
                impact: "medium",
                error: errorMsg,
                wordpressPostId: content.id,
              });
              this.addLog(errorMsg, "error");
            }
          } else {
            this.addLog(`Heading structure already correct for "${content.title?.rendered || content.title}"`, "info");
          }
        } catch (contentError) {
          this.addLog(`Error processing headings for "${content.title?.rendered || content.title}": ${contentError.message}`, "warning");
        }
      }

      this.addLog(`Processed ${processedCount} items, fixed ${fixedCount} heading structures`, "success");
    } catch (error) {
      const errorMsg = `Heading structure fix failed: ${error.message}`;
      errors.push(errorMsg);
      this.addLog(errorMsg, "error");
    }

    return { applied, errors };
  }

  // WordPress API helper methods with enhanced error handling
  private async getWordPressContentWithType(
    creds: WordPressCredentials,
    type: "posts" | "pages"
  ) {
    const endpoint = `${creds.url.replace(/\/$/, "")}/wp-json/wp/v2/${type}`;
    const auth = Buffer.from(
      `${creds.username}:${creds.applicationPassword}`
    ).toString("base64");

    this.addLog(`Fetching ${type} from ${endpoint}`);

    const response = await fetch(`${endpoint}?per_page=50&status=publish`, {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.addLog(`Failed to fetch ${type}: ${response.status} ${response.statusText} - ${errorText}`, "error");
      throw new Error(`Failed to fetch ${type}: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Add type information to each content item
    const dataWithType = data.map((item: any) => ({
      ...item,
      contentType: type === 'posts' ? 'post' : 'page'
    }));
    
    this.addLog(`Successfully fetched ${dataWithType.length} ${type}`);
    return dataWithType;
  }

  // Add missing getWordPressContent method (wrapper)
  private async getWordPressContent(
    creds: WordPressCredentials,
    type: "posts" | "pages"
  ) {
    return this.getWordPressContentWithType(creds, type);
  }

  private async updateWordPressContent(
    creds: WordPressCredentials,
    id: number,
    data: any,
    contentType: 'post' | 'page' = 'post' // Add content type parameter
  ) {
    // Determine the correct endpoint based on content type
    const endpoint = contentType === 'page' 
      ? `${creds.url.replace(/\/$/, "")}/wp-json/wp/v2/pages/${id}`
      : `${creds.url.replace(/\/$/, "")}/wp-json/wp/v2/posts/${id}`;
      
    const auth = Buffer.from(
      `${creds.username}:${creds.applicationPassword}`
    ).toString("base64");

    this.addLog(`Updating WordPress ${contentType} ${id} at ${endpoint} with data: ${Object.keys(data).join(", ")}`);

    const response = await fetch(endpoint, {
      method: "PUT", // Use PUT instead of POST for updates
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.addLog(`Failed to update ${contentType} ${id}: ${response.status} ${response.statusText} - ${errorBody}`, "error");
      
      // Try alternative approach if PUT fails
      if (response.status === 404 || response.status === 405) {
        this.addLog(`Retrying with POST method for ${contentType} ${id}`, "warning");
        
        const retryResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
        
        if (!retryResponse.ok) {
          const retryErrorBody = await retryResponse.text();
          throw new Error(`Failed to update ${contentType} ${id}: ${retryResponse.status} ${retryResponse.statusText} - ${retryErrorBody}`);
        }
        
        const retryResult = await retryResponse.json();
        this.addLog(`Successfully updated ${contentType} ${id} using POST method`);
        return retryResult;
      }
      
      throw new Error(`Failed to update ${contentType} ${id}: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const result = await response.json();
    this.addLog(`Successfully updated ${contentType} ${id}`);
    return result;
  }

  // AI helper methods with improved error handling and shorter responses
  private async generateAltText(
    imageSrc: string,
    context: string
  ): Promise<string> {
    const provider = this.selectAIProvider();
    if (!provider) {
      // Fallback: generate alt text from filename
      const filename = imageSrc.split("/").pop()?.replace(/\.[^/.]+$/, "") || "";
      const readable = filename
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase())
        .substring(0, 100);
      return readable || "Image";
    }

    try {
      const prompt = `Generate descriptive alt text for image "${imageSrc}" in context "${context}". Max 100 characters, descriptive, accessible:`;

      const result = await this.callAIProvider(
        provider,
        "You are an accessibility expert. Return only the alt text, no quotes or extra text.",
        prompt,
        50
      );
      
      const altText = result.trim().replace(/^["']|["']$/g, ""); // Remove quotes
      return altText.substring(0, 100) || "Descriptive image";
    } catch (error) {
      this.addLog(
        `AI alt text generation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "warning"
      );
      
      // Fallback: generate from filename
      const filename = imageSrc.split("/").pop()?.replace(/\.[^/.]+$/, "") || "";
      const readable = filename
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase())
        .substring(0, 100);
      return readable || "Descriptive image";
    }
  }

  private async generateMetaDescription(
    title: string,
    content: string
  ): Promise<string> {
    const provider = this.selectAIProvider();
    if (!provider) return content.substring(0, 155) + "...";

    try {
      const prompt = `Meta description for "${title}". Content: "${content.substring(
        0,
        300
      )}". 120-160 chars, compelling, SEO-optimized:`;

      const result = await this.callAIProvider(
        provider,
        "You are an SEO expert. Return only the meta description.",
        prompt,
        100
      );
      const description = result.trim();
      return description.length > 160
        ? description.substring(0, 157) + "..."
        : description;
    } catch {
      return content.substring(0, 155) + "...";
    }
  }

  // Add the missing generateMetaDescriptionWithFallback method
  private async generateMetaDescriptionWithFallback(
    title: string,
    content: string
  ): Promise<string> {
    try {
      // Try AI generation first
      return await this.generateMetaDescription(title, content);
    } catch (error) {
      this.addLog(
        `AI meta description generation failed, using fallback: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "warning"
      );
      
      // Fallback to simple extraction
      const cleanContent = content.replace(/<[^>]*>/g, "").trim();
      let description = cleanContent.substring(0, 140);
      
      // Try to end at a sentence boundary
      const lastPeriod = description.lastIndexOf(".");
      if (lastPeriod > 80) {
        description = description.substring(0, lastPeriod + 1);
      }
      
      // Ensure minimum length
      if (description.length < 120) {
        description = `${description} | ${title}`.substring(0, 157) + "...";
      }
      
      return description;
    }
  }

  private async optimizeTitle(
    currentTitle: string,
    content: string
  ): Promise<string> {
    const provider = this.selectAIProvider();
    if (!provider) return currentTitle.substring(0, 60);

    try {
      const prompt = `Optimize title "${currentTitle}" using content "${content.substring(
        0,
        200
      )}". 30-60 chars, engaging, SEO-focused:`;

      const result = await this.callAIProvider(
        provider,
        "You are an SEO expert. Return only the optimized title.",
        prompt,
        50
      );
      const optimized = result.trim();
      return optimized.length > 60
        ? optimized.substring(0, 57) + "..."
        : optimized;
    } catch {
      return currentTitle.substring(0, 60);
    }
  }


  // Helper methods
 private cleanAIResponse(response: string): string {
    let cleaned = response.trim();

    // Remove markdown code block markers
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "");
    }

    if (cleaned.endsWith("```")) {
      cleaned = cleaned.replace(/\s*```$/, "");
    }

    return cleaned.trim();
  }

  private extractTextFromHTML(html: string): string {
    const $ = cheerio.load(html);
    return $.text().replace(/\s+/g, " ").trim();
  }

  private prioritizeAndFilterFixes(
    fixes: any[],
    allowedTypes?: string[],
    maxChanges: number = 50
  ): AIFix[] {
    let filtered = fixes;

    // Filter by allowed fix types if specified
    if (allowedTypes && allowedTypes.length > 0) {
      filtered = filtered.filter((fix) => allowedTypes.includes(fix.type));
    }

    // Sort by impact (high > medium > low) and limit
    const priority = { high: 3, medium: 2, low: 1 };
    filtered.sort(
      (a, b) => (priority[b.impact] || 0) - (priority[a.impact] || 0)
    );

    return filtered.slice(0, maxChanges);
  }

   private calculateDetailedBreakdown(fixes: AIFix[]) {
    const successful = fixes.filter((f) => f.success);

    return {
      altTextFixed: successful.filter((f) => f.type === "missing_alt_text").length,
      metaDescriptionsUpdated: successful.filter((f) => f.type === "missing_meta_description").length,
      titleTagsImproved: successful.filter((f) => f.type === "poor_title_tag").length,
      headingStructureFixed: successful.filter((f) => f.type === "heading_structure").length,
      internalLinksAdded: successful.filter((f) => f.type === "internal_linking").length,
      imagesOptimized: successful.filter((f) => f.type === "image_optimization").length,
      contentQualityImproved: successful.filter((f) => f.type === "content_quality" || f.type === "low_content_quality").length,
    };
  }

  private calculateEstimatedImpact(fixes: AIFix[]): string {
    const successful = fixes.filter((f) => f.success);
    const highImpactFixes = successful.filter(
      (f) => f.impact === "high"
    ).length;
    const mediumImpactFixes = successful.filter(
      (f) => f.impact === "medium"
    ).length;
    const lowImpactFixes = successful.filter((f) => f.impact === "low").length;

    if (highImpactFixes >= 5) return "very high";
    if (highImpactFixes >= 3) return "high";
    if (highImpactFixes >= 1 || mediumImpactFixes >= 5) return "medium";
    if (mediumImpactFixes >= 1 || lowImpactFixes >= 5) return "low";
    return "minimal";
  }

  private async createWebsiteBackup(
    website: any,
    userId: string
  ): Promise<void> {
    this.addLog(`Creating backup for website: ${website.name}`);

    try {
      await storage.createBackup({
        userId,
        websiteId: website.id,
        backupType: "pre_ai_fix",
        status: "completed",
        data: {},
        metadata: {
          reason: "Before AI fixes",
          websiteUrl: website.url,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      this.addLog(
        `Backup creation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "warning"
      );
      // Don't throw - backup failure shouldn't stop the fix process
    }
  }

  // Get available fix types for a website
  async getAvailableFixTypes(
    websiteId: string,
    userId: string
  ): Promise<{
    availableFixes: string[];
    totalFixableIssues: number;
    estimatedTime: string;
    breakdown: Record<string, number>;
  }> {
    try {
      const website = await storage.getUserWebsite(websiteId, userId);
      if (!website) {
        throw new Error("Website not found or access denied");
      }

      const seoReports = await storage.getSeoReportsByWebsite(websiteId);
      const latestReport = seoReports[0];

      if (!latestReport) {
        return {
          availableFixes: [],
          totalFixableIssues: 0,
          estimatedTime: "0 minutes",
          breakdown: {},
        };
      }

      const analysis = await this.analyzeWebsiteForAllFixes(
        website.url,
        latestReport
      );

      const availableFixTypes = [
        ...new Set(analysis.fixableIssues.map((fix: any) => fix.type)),
      ];

      // Count issues by type
      const breakdown = analysis.fixableIssues.reduce(
        (acc: Record<string, number>, fix: any) => {
          acc[fix.type] = (acc[fix.type] || 0) + 1;
          return acc;
        },
        {}
      );

      return {
        availableFixes: availableFixTypes,
        totalFixableIssues: analysis.fixableIssues.length,
        estimatedTime: this.estimateFixTime(analysis.fixableIssues.length),
        breakdown,
      };
    } catch (error) {
      this.addLog(
        `Failed to get available fix types: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
      return {
        availableFixes: [],
        totalFixableIssues: 0,
        estimatedTime: "0 minutes",
        breakdown: {},
      };
    }
  }

  private estimateFixTime(fixCount: number): string {
    const minutesPerFix = 2;
    const totalMinutes = Math.max(3, fixCount * minutesPerFix);

    if (totalMinutes < 60) return `${totalMinutes} minutes`;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }


  //SEO TRACKING
  private async updateIssueStatusesForFix(
  websiteId: string,
  userId: string,
  fixes: AIFix[],
  fixSessionId: string,
  isDryRun: boolean = false
): Promise<void> {
  if (isDryRun) {
    console.log('Skipping issue status updates for dry run');
    return;
  }

  console.log(`Updating issue statuses for ${fixes.length} fixes in session ${fixSessionId}`);

  try {
    // Get all tracked issues for this website
    const trackedIssues = await storage.getTrackedSeoIssues(websiteId, userId, {
      autoFixableOnly: true,
      status: ['detected', 'reappeared', 'fixing']
    });

    // Create a mapping from fix types to issue types
    const fixTypeToIssueType = new Map([
      ['missing_alt_text', 'missing_alt_text'],
      ['missing_meta_description', 'missing_meta_description'],
      ['meta_description_too_long', 'missing_meta_description'],
      ['poor_title_tag', 'poor_title_tag'],
      ['heading_structure', 'heading_structure'],
      ['missing_h1', 'heading_structure'],
      ['missing_h1_tag', 'heading_structure']
    ]);

    // Process each fix and update corresponding issues
    for (const fix of fixes) {
      const issueType = fixTypeToIssueType.get(fix.type);
      if (!issueType) {
        console.log(`No issue type mapping found for fix type: ${fix.type}`);
        continue;
      }

      // Find the corresponding tracked issue
      const matchingIssue = trackedIssues.find(issue => 
        issue.issueType === issueType || 
        issue.issueTitle.toLowerCase().includes(fix.type.replace('_', ' '))
      );

      if (matchingIssue) {
        try {
          const newStatus = fix.success ? 'fixed' : 'detected';
          await storage.updateSeoIssueStatus(matchingIssue.id, newStatus, {
            fixMethod: 'ai_automatic',
            fixSessionId,
            fixBefore: fix.before,
            fixAfter: fix.after,
            aiModel: 'gpt-4o-mini', // or whatever model was used
            fixError: fix.error,
            resolutionNotes: fix.success 
              ? `Successfully fixed: ${fix.description}` 
              : `Fix failed: ${fix.error || 'Unknown error'}`
          });

          console.log(`Updated issue ${matchingIssue.id} status to: ${newStatus}`);
        } catch (error) {
          console.error(`Failed to update issue ${matchingIssue.id}:`, error);
        }
      } else {
        console.log(`No matching tracked issue found for fix type: ${fix.type}`);
      }
    }

    console.log(`Completed issue status updates for session ${fixSessionId}`);
  } catch (error) {
    console.error('Error updating issue statuses for fixes:', error);
    // Don't throw - issue tracking shouldn't break the fix process
  }
}
}

export const aiFixService = new AIFixService();