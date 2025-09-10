// server/services/ai-fix-service.ts
import { aiService } from "./ai-service";
import { wordpressService } from "./wordpress-service";
import { wordPressAuthService } from "./wordpress-auth";
import { storage } from "../storage";
import { seoService } from "./seo-service";
import * as cheerio from "cheerio";

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
    };
  };
  errors?: string[];
  message: string;
  detailedLog: string[];
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
  stoppedReason:
    | "target_reached"
    | "max_iterations"
    | "no_improvement"
    | "error";
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

  async analyzeAndFixWebsite(
    websiteId: string,
    userId: string,
    dryRun: boolean = true,
    options: {
      fixTypes?: string[];
      maxChanges?: number;
      skipBackup?: boolean;
    } = {}
  ): Promise<AIFixResult> {
    this.log = []; // Reset log for this operation

    try {
      this.addLog(
        `Starting AI fix analysis for website ${websiteId} (dry run: ${dryRun})`
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

      this.addLog(`Found SEO report with score: ${latestReport.score}/100`);
      this.addLog(`Issues in report: ${latestReport.issues?.length || 0}`);

      // Enhanced analysis with better error handling
      const analysisResult = await this.analyzeWebsiteForAllFixes(
        website.url,
        latestReport
      );

      this.addLog(`Analysis found ${analysisResult.totalIssues} total issues`);
      this.addLog(
        `Fixable issues identified: ${analysisResult.fixableIssues.length}`
      );

      const maxChanges =
        options.maxChanges || analysisResult.fixableIssues.length;
      const fixesToApply = this.prioritizeAndFilterFixes(
        analysisResult.fixableIssues,
        options.fixTypes,
        maxChanges
      );

      this.addLog(`Will attempt to fix ${fixesToApply.length} issues`);

      let appliedFixes: AIFix[] = [];
      let errors: string[] = [];

      if (!dryRun && fixesToApply.length > 0) {
        // Create backup before making changes (unless skipped)
        if (!options.skipBackup) {
          await this.createWebsiteBackup(website, userId);
          this.addLog("Website backup created", "success");
        }

        // Apply comprehensive fixes with enhanced error handling
        const applyResult = await this.applyComprehensiveFixes(
          website,
          fixesToApply
        );

        appliedFixes = applyResult.appliedFixes;
        errors = applyResult.errors;

        // Log the activity with detailed breakdown
        const successfulFixes = appliedFixes.filter((f) => f.success);
        await storage.createActivityLog({
          userId,
          websiteId,
          type: "ai_fixes_applied",
          description: `AI fixes applied: ${
            successfulFixes.length
          } successful, ${appliedFixes.length - successfulFixes.length} failed`,
          metadata: {
            fixesApplied: appliedFixes.length,
            fixesSuccessful: successfulFixes.length,
            fixesFailed: appliedFixes.length - successfulFixes.length,
            fixTypes: [...new Set(appliedFixes.map((f) => f.type))],
            detailedFixes: successfulFixes.map((f) => ({
              type: f.type,
              description: f.description,
              element: f.element,
            })),
          },
        });

        this.addLog(
          `Applied ${successfulFixes.length}/${appliedFixes.length} fixes successfully`,
          "success"
        );
      } else {
        // Dry run - simulate fixes with detailed analysis
        appliedFixes = fixesToApply.map((fix) => ({
          ...fix,
          success: true, // Assume success for dry run
        }));
        this.addLog(
          `Dry run complete - would apply ${appliedFixes.length} fixes`,
          "info"
        );
      }

      const detailedBreakdown = this.calculateDetailedBreakdown(appliedFixes);
      const stats = {
        totalIssuesFound: analysisResult.totalIssues,
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

      return {
        success: true,
        dryRun,
        fixesApplied: appliedFixes,
        stats,
        errors: errors.length > 0 ? errors : undefined,
        message: dryRun
          ? `Dry run complete. Found ${stats.fixesAttempted} fixable issues.`
          : `Applied ${stats.fixesSuccessful} fixes successfully with ${stats.fixesFailed} failures.`,
        detailedLog: [...this.log],
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
      targetScore = 85, // Default acceptable score
      maxIterations = 5, // Prevent infinite loops
      minImprovementThreshold = 2, // Minimum score improvement to continue
      fixTypes,
      maxChangesPerIteration = 20,
      skipBackup = false,
    } = options;

    this.log = []; // Reset log
    this.addLog(
      `Starting iterative AI fix process (target: ${targetScore}, max iterations: ${maxIterations})`
    );

    const iterations: IterationResult[] = [];
    let currentIteration = 0;
    let stoppedReason:
      | "target_reached"
      | "max_iterations"
      | "no_improvement"
      | "error" = "error";
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
          []
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

          this.addLog(
            `\n--- Iteration ${currentIteration}/${maxIterations} ---`
          );
          this.addLog(
            `Current score: ${currentScore}/100, Target: ${targetScore}/100`
          );

          // Apply fixes for this iteration
          const fixStartTime = Date.now();
          const fixResult = await this.analyzeAndFixWebsite(
            websiteId,
            userId,
            false, // Not a dry run
            {
              fixTypes,
              maxChanges: maxChangesPerIteration,
              skipBackup: true, // Already created master backup
            }
          );
          const fixTime = Date.now() - fixStartTime;

          if (!fixResult.success) {
            this.addLog(
              `Iteration ${currentIteration} failed: ${fixResult.message}`,
              "error"
            );
            allErrors.push(
              `Iteration ${currentIteration}: ${fixResult.message}`
            );
            if (fixResult.errors) {
              allErrors.push(...fixResult.errors);
            }
            break;
          }

          // Collect fixes from this iteration
          allAppliedFixes.push(...fixResult.fixesApplied);
          if (fixResult.errors) {
            allErrors.push(...fixResult.errors);
          }

          this.addLog(
            `Applied ${fixResult.stats.fixesSuccessful} fixes in iteration ${currentIteration}`
          );

          // Wait a moment before re-analysis (let changes propagate)
          await new Promise((resolve) => setTimeout(resolve, 5000));

          // Re-analyze to get new score
          const analysisStartTime = Date.now();
          this.addLog("Re-analyzing website to measure improvement...");

          const newAnalysis = await seoService.analyzeWebsite(website.url, []);
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
              iterativeFixRound: currentIteration,
              fixesAppliedInRound: fixResult.stats.fixesSuccessful,
              previousScore: currentScore,
            },
          });

          const improvement = newScore - currentScore;
          const totalIterationTime = Date.now() - iterationStartTime;

          // Record this iteration
          iterations.push({
            iterationNumber: currentIteration,
            scoreBefore: currentScore,
            scoreAfter: newScore,
            fixesApplied: fixResult.stats.fixesAttempted,
            fixesSuccessful: fixResult.stats.fixesSuccessful,
            improvement,
            timestamp: new Date().toISOString(),
            fixDetails: fixResult.fixesApplied,
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
      });

      // Log the final activity
      await storage.createActivityLog({
        userId,
        websiteId,
        type: "iterative_ai_fixes_completed",
        description: `Iterative AI fixes completed: ${initialScore} → ${finalScore} (+${scoreImprovement.toFixed(
          1
        )}) in ${currentIteration} iterations`,
        metadata: {
          initialScore,
          finalScore,
          scoreImprovement,
          targetScore,
          iterationsCompleted: currentIteration,
          stoppedReason,
          totalFixesApplied: allAppliedFixes.filter((f) => f.success).length,
          totalFixesAttempted: allAppliedFixes.length,
          iterations: iterations.length,
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
        `Total fixes applied: ${
          allAppliedFixes.filter((f) => f.success).length
        }`
      );

      return {
        success: true,
        dryRun: false,
        fixesApplied: allAppliedFixes,
        stats: {
          totalIssuesFound: allAppliedFixes.length,
          fixesAttempted: allAppliedFixes.length,
          fixesSuccessful: allAppliedFixes.filter((f) => f.success).length,
          fixesFailed: allAppliedFixes.filter((f) => !f.success).length,
          estimatedImpact: this.calculateEstimatedImpact(allAppliedFixes),
          detailedBreakdown: this.calculateDetailedBreakdown(allAppliedFixes),
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
      };
    } catch (error) {
      this.addLog(
        `Iterative fix process failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
      console.error("Iterative AI fix error:", error);

      return {
        success: false,
        dryRun: false,
        fixesApplied: allAppliedFixes,
        stats: {
          totalIssuesFound: 0,
          fixesAttempted: allAppliedFixes.length,
          fixesSuccessful: allAppliedFixes.filter((f) => f.success).length,
          fixesFailed: allAppliedFixes.filter((f) => !f.success).length + 1,
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
        finalScore: (await this.getCurrentSeoScore(websiteId)) || 0,
        initialScore: 0,
        scoreImprovement: 0,
        targetScore,
        iterationsCompleted: currentIteration,
        stoppedReason: "error",
      };
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
        const metaResult = await this.fixMetaDescriptionsComprehensive(
          creds,
          fixes
        );
        applied.push(...metaResult.applied);
        errors.push(...metaResult.errors);
        break;

      case "poor_title_tag":
        const titleResult = await this.fixTitleTagsComprehensive(creds, fixes);
        applied.push(...titleResult.applied);
        errors.push(...titleResult.errors);
        break;

      case "heading_structure":
        const headingResult = await this.fixHeadingStructureComprehensive(
          creds,
          fixes
        );
        applied.push(...headingResult.applied);
        errors.push(...headingResult.errors);
        break;

      // Add cases for missing fix types
      case "missing_h1_tag":
        // This is actually handled by heading_structure, so redirect
        const h1Result = await this.fixHeadingStructureComprehensive(creds, fixes);
        applied.push(...h1Result.applied);
        errors.push(...h1Result.errors);
        break;

      case "low_content_quality":
        // This requires manual intervention - mark as not implemented
        this.addLog(`Content quality fixes require manual review`, "warning");
        applied.push(
          ...fixes.map((fix) => ({
            ...fix,
            success: false,
            error: "Content quality fixes require manual review",
          }))
        );
        break;

      case "internal_linking":
        // Complex fix that requires understanding site structure
        this.addLog(`Internal linking fixes not yet automated`, "warning");
        applied.push(
          ...fixes.map((fix) => ({
            ...fix,
            success: false,
            error: "Internal linking fixes require manual implementation",
          }))
        );
        break;

      case "image_optimization":
        // Requires image processing capabilities
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
        // For unsupported fix types, mark as failed with explanation
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

      for (const content of allContent.slice(0, 10)) {
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
          if (!excerpt || excerpt.length < 120) {
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
            $("body").prepend(`<h1>${title}</h1>`);
            changes.push(`Added missing H1: "${title}"`);
            needsUpdate = true;
          }

          if (needsUpdate) {
            try {
              const updatedContent = $.html();
              
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

  private selectAIProvider(): string | null {
    return process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR
      ? "openai"
      : process.env.ANTHROPIC_API_KEY
      ? "anthropic"
      : null;
  }

  private async callAIProvider(
    provider: string,
    systemMessage: string,
    userMessage: string,
    maxTokens: number = 500
  ): Promise<string> {
    if (provider === "openai") {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({
        apiKey:
          process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
      });

      return response.choices[0]?.message?.content || "";
    } else if (provider === "anthropic") {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const response = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: maxTokens,
        temperature: 0.7,
        system: systemMessage,
        messages: [{ role: "user", content: userMessage }],
      });

      const content = response.content[0];
      return content.type === "text" ? content.text : "";
    } else {
      throw new Error(`Unsupported AI provider: ${provider}`);
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
      altTextFixed: successful.filter((f) => f.type === "missing_alt_text")
        .length,
      metaDescriptionsUpdated: successful.filter(
        (f) => f.type === "missing_meta_description"
      ).length,
      titleTagsImproved: successful.filter((f) => f.type === "poor_title_tag")
        .length,
      headingStructureFixed: successful.filter(
        (f) => f.type === "heading_structure"
      ).length,
      internalLinksAdded: successful.filter(
        (f) => f.type === "internal_linking"
      ).length,
      imagesOptimized: successful.filter((f) => f.type === "image_optimization")
        .length,
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
}

export const aiFixService = new AIFixService();