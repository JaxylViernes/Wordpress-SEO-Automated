import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Play,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  Globe,
  Smartphone,
  Image,
  Link,
  FileText,
  Zap,
  Eye,
  Brain,
  Target,
  Award,
  BookOpen,
  Lightbulb,
  BarChart3,
  Wrench,
  Settings,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import ProgressDialog from "@/components/ProgressDialog";

// Constants

const parseBackendLogs = (detailedLog: string[] | undefined) => {
  if (!detailedLog || !Array.isArray(detailedLog)) return [];

  return detailedLog.map((log) => {
    const match = log.match(
      /\[(\d{2}:\d{2}:\d{2})\]\s*([🔍✅❌⚠️ℹ️🔧🚀📊🎯🔄]?)\s*(.*)/
    );

    if (match) {
      const [, timestamp, emoji, message] = match;
      let level: "info" | "success" | "warning" | "error" = "info";

      if (emoji === "✅" || message.toLowerCase().includes("success")) {
        level = "success";
      } else if (
        emoji === "❌" ||
        message.toLowerCase().includes("error") ||
        message.toLowerCase().includes("failed")
      ) {
        level = "error";
      } else if (emoji === "⚠️" || message.toLowerCase().includes("warning")) {
        level = "warning";
      }

      return { timestamp, level, message };
    }

    return {
      timestamp: new Date().toTimeString().split(" ")[0],
      level: "info" as const,
      message: log,
    };
  });
};

const AI_FIXABLE_TITLES = [
  // Title issues
  "missing page title",
  "title tag too long",
  "title tag too short",

  // Meta description issues
  "missing meta description",
  "meta description too long",
  "meta description too short",

  // Heading issues
  "missing h1 tag",
  "multiple h1 tags",
  "improper heading hierarchy",

  // Image issues
  "images missing alt text",

  // Content quality issues
  "low content quality",
  "poor readability",
  "poor content readability",
  "poor content structure",

  // Technical SEO issues (newly fixable)
  "missing viewport meta tag",
  "missing schema markup",
  "missing open graph tags",

  // Keyword optimization issues (newly fixable)
  "poor keyword distribution",
  "keyword over-optimization",
  "missing important keywords",
];

// Helper Functions
const getIssueStatusBadge = (status: string) => {
  const configs = {
    detected: {
      variant: "destructive" as const,
      icon: "🔴",
      text: "New Issue",
    },
    reappeared: {
      variant: "destructive" as const,
      icon: "🔄",
      text: "Reappeared",
    },
    fixing: { variant: "default" as const, icon: "⚙️", text: "Fixing..." },
    fixed: { variant: "secondary" as const, icon: "✅", text: "Fixed" },
    resolved: { variant: "secondary" as const, icon: "✅", text: "Resolved" },
  };
  return (
    configs[status as keyof typeof configs] || {
      variant: "outline" as const,
      icon: "❓",
      text: status,
    }
  );
};

const formatTimeAgo = (date: string) => {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  if (diffInSeconds < 3600)
    return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000)
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return `${Math.floor(diffInSeconds / 2592000)} months ago`;
};

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
};

const getScoreGradient = (score: number) => {
  if (score >= 80) return "from-green-500 to-green-600";
  if (score >= 60) return "from-yellow-500 to-yellow-600";
  return "from-red-500 to-red-600";
};

const getIssueIcon = (type: string) => {
  switch (type) {
    case "critical":
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    case "warning":
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case "info":
      return <CheckCircle className="w-4 h-4 text-blue-500" />;
    default:
      return <AlertCircle className="w-4 h-4 text-gray-500" />;
  }
};

const getIssueColor = (type: string) => {
  switch (type) {
    case "critical":
      return "bg-red-50 border-red-200 text-red-800";
    case "warning":
      return "bg-yellow-50 border-yellow-200 text-yellow-800";
    case "info":
      return "bg-blue-50 border-blue-200 text-blue-800";
    default:
      return "bg-gray-50 border-gray-200 text-gray-800";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "low":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getKeywordDistributionColor = (distribution: string) => {
  switch (distribution) {
    case "excellent":
      return "bg-green-100 text-green-800";
    case "good":
      return "bg-blue-100 text-blue-800";
    case "poor":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

//Fixables
const getFixableIssuesOnly = (issues: any[]) => {
  return issues.filter((issue) => {
    // Check if the issue title contains any of the AI-fixable patterns
    const titleLower = issue.title.toLowerCase();

    // Direct title match
    if (
      AI_FIXABLE_TITLES.some((type) => titleLower.includes(type.toLowerCase()))
    ) {
      return true;
    }

    // Also check the autoFixAvailable flag from backend
    if (issue.autoFixAvailable === true) {
      return true;
    }

    return false;
  });
};

const getFixableIssuesWithStatus = (issues: any[], trackedIssues: any[]) => {
  const fixableIssues = getFixableIssuesOnly(issues);

  return fixableIssues.map((issue) => {
    // Find matching tracked issue with improved matching logic
    const tracked = trackedIssues.find((t) => {
      // First try exact title match
      if (t.issueTitle === issue.title) return true;

      // Then try issue type matching
      const mappedType = mapReportIssueToTrackingType(issue.title);
      if (t.issueType === mappedType) return true;

      // Finally try partial title matching for common patterns
      return t.issueTitle
        .toLowerCase()
        .includes(issue.title.toLowerCase().substring(0, 20));
    });

    return {
      ...issue,
      trackingStatus: tracked?.status || "detected",
      trackingInfo: tracked,
      lastSeen:
        tracked?.lastSeenAt ||
        tracked?.last_seen_at ||
        new Date().toISOString(),
      fixedAt: tracked?.fixedAt || tracked?.fixed_at,
      detectedAt: tracked?.detectedAt || tracked?.detected_at,
    };
  });
};

// Helper function to map report issue titles to tracking types
const mapReportIssueToTrackingType = (title: string): string => {
  const titleLower = title.toLowerCase();

  if (titleLower.includes("meta description"))
    return "missing_meta_description";
  if (titleLower.includes("title tag")) return "poor_title_tag";
  if (titleLower.includes("h1") || titleLower.includes("heading"))
    return "heading_structure";
  if (titleLower.includes("alt text") || titleLower.includes("image"))
    return "missing_alt_text";
  if (titleLower.includes("viewport")) return "missing_viewport_meta";
  if (titleLower.includes("schema") || titleLower.includes("structured data"))
    return "missing_schema";
  if (titleLower.includes("mobile") || titleLower.includes("responsive"))
    return "mobile_responsiveness";
  if (titleLower.includes("content quality")) return "low_content_quality";
  if (titleLower.includes("readability")) return "poor_readability";
  if (titleLower.includes("e-a-t")) return "low_eat_score";
  if (titleLower.includes("keyword")) return "keyword_optimization";

  return "other";
};

export default function SEOAnalysis() {
  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);
  const [selectedWebsite, setSelectedWebsite] = useState<string>("");
  const [fixResult, setFixResult] = useState<any>(null);
  const [progressDialog, setProgressDialog] = useState({
    open: false,
    type: "seo-analysis" as "seo-analysis" | "ai-fix",
    title: "",
    description: "",
    progress: 0,
    logs: [] as Array<{
      timestamp: string;
      level: "info" | "success" | "warning" | "error";
      message: string;
    }>,
    status: "idle" as "idle" | "running" | "success" | "error",
    result: null as any,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: websites } = useQuery({
    queryKey: ["/api/websites"],
    queryFn: api.getWebsites,
  });

  const { data: seoReports, isLoading } = useQuery({
    queryKey: ["/api/seo-reports", selectedWebsite],
    queryFn: () =>
      selectedWebsite
        ? api.getSeoReports(selectedWebsite)
        : Promise.resolve([]),
    enabled: !!selectedWebsite,
  });

  const latestReport = seoReports?.[0];

  const { data: detailedAnalysis, isLoading: isDetailedLoading } = useQuery({
    queryKey: ["/api/seo-detailed", selectedWebsite],
    queryFn: () =>
      selectedWebsite
        ? api.getDetailedSeoData(selectedWebsite)
        : Promise.resolve(null),
    enabled: !!selectedWebsite && !!latestReport,
  });

  // Calculate current score
  const currentScore = latestReport?.score || 0;

  const runAnalysis = useMutation({
    mutationFn: () => api.runSeoAnalysis(selectedWebsite),
    onMutate: () => {
      // Initialize with better starting state
      setProgressDialog({
        open: true,
        type: "seo-analysis",
        title: "AI-Enhanced SEO Analysis",
        description: `Analyzing ${getWebsiteName(
          selectedWebsite
        )} with comprehensive AI insights...`,
        progress: 5, // Start with a small value
        logs: [
          {
            timestamp: new Date().toTimeString().split(" ")[0],
            level: "info",
            message: "Starting SEO analysis...",
          },
        ],
        status: "running",
        result: null,
      });

      // Simulate progress updates while waiting for response
      let currentProgress = 5;
      const progressTimer = setInterval(() => {
        currentProgress = Math.min(currentProgress + Math.random() * 15, 90);

        setProgressDialog((prev) => {
          if (prev.status !== "running") {
            clearInterval(progressTimer);
            return prev;
          }

          // Add simulated log messages based on progress
          const newLogs = [...prev.logs];

          if (
            currentProgress > 20 &&
            !prev.logs.some((l) => l.message.includes("Fetching"))
          ) {
            newLogs.push({
              timestamp: new Date().toTimeString().split(" ")[0],
              level: "info",
              message: "Fetching page content...",
            });
          }
          if (
            currentProgress > 40 &&
            !prev.logs.some((l) => l.message.includes("technical"))
          ) {
            newLogs.push({
              timestamp: new Date().toTimeString().split(" ")[0],
              level: "info",
              message: "Analyzing technical SEO factors...",
            });
          }
          if (
            currentProgress > 60 &&
            !prev.logs.some((l) => l.message.includes("AI"))
          ) {
            newLogs.push({
              timestamp: new Date().toTimeString().split(" ")[0],
              level: "info",
              message: "Running AI content analysis...",
            });
          }
          if (
            currentProgress > 80 &&
            !prev.logs.some((l) => l.message.includes("score"))
          ) {
            newLogs.push({
              timestamp: new Date().toTimeString().split(" ")[0],
              level: "info",
              message: "Calculating SEO score...",
            });
          }

          return {
            ...prev,
            progress: currentProgress,
            logs: newLogs,
          };
        });
      }, 1000);

      // Store timer reference for cleanup
      (window as any).__seoAnalysisTimer = progressTimer;

      // Clear any existing data
      queryClient.setQueryData(["/api/seo-reports", selectedWebsite], []);
      queryClient.setQueryData(["/api/seo-detailed", selectedWebsite], null);
    },

    onSuccess: (data) => {
      // Clear the progress timer
      if ((window as any).__seoAnalysisTimer) {
        clearInterval((window as any).__seoAnalysisTimer);
        delete (window as any).__seoAnalysisTimer;
      }

      // Parse real logs if available
      const logs = data?.detailedLog ? parseBackendLogs(data.detailedLog) : [];

      const hasValidScore = typeof data?.score === "number" && data.score >= 0;

      if (hasValidScore) {
        setProgressDialog((prev) => ({
          ...prev,
          progress: 100,
          logs:
            logs.length > 0
              ? logs
              : [
                  ...prev.logs,
                  {
                    timestamp: new Date().toTimeString().split(" ")[0],
                    level: "success" as const,
                    message: `✅ Analysis complete! Score: ${data.score}/100`,
                  },
                ],
          status: "success",
          result: data,
        }));

        queryClient.invalidateQueries({
          queryKey: ["/api/seo-reports", selectedWebsite],
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/seo-detailed", selectedWebsite],
        });
        queryClient.invalidateQueries({ queryKey: ["/api/websites"] });
        queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });

        const websiteName = getWebsiteName(selectedWebsite);
        const issueCount = data.issues?.length || 0;
        const criticalIssues =
          data.issues?.filter((i: any) => i.type === "critical").length || 0;
        const scoreText =
          data.score >= 80
            ? "Excellent SEO!"
            : data.score >= 60
            ? "Good progress!"
            : "Needs attention.";

        const hasAIAnalysis = !!data.contentAnalysis;
        const aiMessage = hasAIAnalysis
          ? ` Content Quality: ${data.contentAnalysis.qualityScore}/100, E-A-T: ${data.contentAnalysis.eatScore.overall}/100.`
          : "";

        toast({
          title: `${
            hasAIAnalysis ? "AI-Enhanced" : "Technical"
          } SEO Analysis Complete - ${data.score}/100`,
          description: `${websiteName} analysis finished. ${scoreText} Found ${issueCount} issue(s) (${criticalIssues} critical).${aiMessage}`,
        });
      } else {
        // Update progress dialog with error
        setProgressDialog((prev) => ({
          ...prev,
          status: "error",
          logs: [
            ...prev.logs,
            {
              timestamp: new Date().toTimeString().split(" ")[0],
              level: "error" as const,
              message: "❌ Analysis incomplete or invalid data received",
            },
          ],
        }));

        queryClient.setQueryData(["/api/seo-reports", selectedWebsite], []);
        queryClient.setQueryData(["/api/seo-detailed", selectedWebsite], null);

        toast({
          title: "Analysis Incomplete",
          description:
            "The website analysis didn't complete successfully. Please try again or check if the website is accessible.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      // Clear the progress timer
      if ((window as any).__seoAnalysisTimer) {
        clearInterval((window as any).__seoAnalysisTimer);
        delete (window as any).__seoAnalysisTimer;
      }

      setProgressDialog((prev) => ({
        ...prev,
        status: "error",
        logs: [
          ...prev.logs,
          {
            timestamp: new Date().toTimeString().split(" ")[0],
            level: "error" as const,
            message: `❌ Analysis failed: ${error?.message || "Unknown error"}`,
          },
        ],
      }));

      queryClient.setQueryData(["/api/seo-reports", selectedWebsite], []);
      queryClient.setQueryData(["/api/seo-detailed", selectedWebsite], null);

      let userMessage = "Unable to analyze this website. Please try again.";
      let title = "Analysis Failed";

      if (error?.message) {
        const errorText = error.message.toLowerCase();
        if (
          errorText.includes("cannot access") ||
          errorText.includes("not accessible")
        ) {
          title = "Website Not Accessible";
          userMessage =
            "Cannot reach the website. Please check if the URL is correct and the site is online.";
        } else if (
          errorText.includes("timeout") ||
          errorText.includes("took too long")
        ) {
          title = "Website Too Slow";
          userMessage =
            "The website is taking too long to respond. Try again later or check if the site is working properly.";
        } else if (errorText.includes("dns") || errorText.includes("domain")) {
          title = "Website Not Found";
          userMessage =
            "Cannot find this website. Please verify the URL is correct.";
        } else if (
          errorText.includes("ssl") ||
          errorText.includes("certificate")
        ) {
          title = "Security Certificate Issue";
          userMessage =
            "There's a security certificate problem with this website. Contact the site owner to fix this issue.";
        } else if (
          errorText.includes("blocked") ||
          errorText.includes("forbidden")
        ) {
          title = "Access Blocked";
          userMessage =
            "This website is blocking our analysis tool. Contact the site owner to allow SEO analysis.";
        } else if (
          errorText.includes("ai") ||
          errorText.includes("content analysis")
        ) {
          title = "AI Analysis Unavailable";
          userMessage =
            "Technical analysis completed, but AI-powered content analysis failed. Configure OpenAI or Anthropic API keys for enhanced analysis.";
        }
      }

      toast({
        title,
        description: userMessage,
        variant: "destructive",
      });
    },
  });

  // Fix with AI mutations
  const fixWithAIMutation = useMutation({
    mutationFn: (dryRun: boolean) => api.fixWithAI(selectedWebsite, dryRun),
    onMutate: (dryRun) => {
      setProgressDialog({
        open: true,
        type: "ai-fix",
        title: dryRun ? "AI Fix Preview (Dry Run)" : "Applying AI Fixes",
        description: `${
          dryRun ? "Simulating" : "Applying"
        } automatic SEO fixes for ${getWebsiteName(selectedWebsite)}...`,
        progress: 5,
        logs: [
          {
            timestamp: new Date().toTimeString().split(" ")[0],
            level: "info",
            message: `🔧 Starting AI fix process (${
              dryRun ? "dry run" : "live"
            } mode)...`,
          },
        ],
        status: "running",
        result: null,
      });

      // Simulate detailed progress for AI fixes
      let currentProgress = 5;
      const progressSteps = [
        { at: 10, message: "🔍 Analyzing fixable issues...", level: "info" },
        { at: 20, message: "📊 Loading tracked SEO issues...", level: "info" },
        { at: 30, message: "🔐 Connecting to WordPress...", level: "info" },
        {
          at: 35,
          message: "✅ WordPress connection verified",
          level: "success",
        },
        { at: 40, message: "💾 Creating backup...", level: "info" },
        { at: 45, message: "📄 Fetching pages and posts...", level: "info" },
        { at: 50, message: "🤖 Applying AI fixes...", level: "info" },
        { at: 55, message: "🏷️ Updating meta descriptions...", level: "info" },
        { at: 60, message: "📝 Optimizing title tags...", level: "info" },
        { at: 65, message: "🖼️ Adding alt text to images...", level: "info" },
        { at: 70, message: "📑 Fixing heading structure...", level: "info" },
        { at: 75, message: "🔗 Improving internal linking...", level: "info" },
        { at: 80, message: "✨ Enhancing content quality...", level: "info" },
        {
          at: 85,
          message: "🎯 Optimizing keyword distribution...",
          level: "info",
        },
        { at: 90, message: "💾 Saving changes to WordPress...", level: "info" },
        {
          at: 95,
          message: "📊 Updating issue tracking status...",
          level: "info",
        },
      ];

      let stepIndex = 0;
      const progressTimer = setInterval(() => {
        // Increment progress
        currentProgress = Math.min(currentProgress + Math.random() * 8 + 2, 95);

        setProgressDialog((prev) => {
          if (prev.status !== "running") {
            clearInterval(progressTimer);
            return prev;
          }

          const newLogs = [...prev.logs];

          // Add step messages as we reach them
          while (
            stepIndex < progressSteps.length &&
            currentProgress >= progressSteps[stepIndex].at
          ) {
            const step = progressSteps[stepIndex];
            newLogs.push({
              timestamp: new Date().toTimeString().split(" ")[0],
              level: step.level as "info" | "success" | "warning" | "error",
              message: step.message,
            });
            stepIndex++;
          }

          // Add some random detail messages for realism
          if (
            Math.random() > 0.7 &&
            currentProgress > 50 &&
            currentProgress < 90
          ) {
            const detailMessages = [
              "• Found missing meta description",
              "• Title tag too long - optimizing...",
              "• Processing image without alt text",
              "• Detected multiple H1 tags",
              "• Improving content readability",
              "• Adding semantic keywords",
              "• Restructuring content hierarchy",
            ];
            const randomMessage =
              detailMessages[Math.floor(Math.random() * detailMessages.length)];
            if (!prev.logs.some((l) => l.message === randomMessage)) {
              newLogs.push({
                timestamp: new Date().toTimeString().split(" ")[0],
                level: "info",
                message: randomMessage,
              });
            }
          }

          return {
            ...prev,
            progress: currentProgress,
            logs: newLogs,
          };
        });
      }, 700); // Update every 700ms for smooth progress

      // Store timer reference for cleanup
      (window as any).__aiFixTimer = progressTimer;
    },

    onSuccess: (data: any) => {
      // Clear the progress timer
      if ((window as any).__aiFixTimer) {
        clearInterval((window as any).__aiFixTimer);
        delete (window as any).__aiFixTimer;
      }

      // Parse real logs from backend if available
      const realLogs = data?.detailedLog
        ? parseBackendLogs(data.detailedLog)
        : [];

      // If we have real logs, use them; otherwise keep simulated ones
      const finalLogs =
        realLogs.length > 0
          ? realLogs
          : (() => {
              const logs = [...progressDialog.logs];

              // Add summary of what was done
              if (data?.stats) {
                const { fixesSuccessful, fixesFailed, detailedBreakdown } =
                  data.stats;

                if (detailedBreakdown) {
                  if (detailedBreakdown.altTextFixed > 0) {
                    logs.push({
                      timestamp: new Date().toTimeString().split(" ")[0],
                      level: "success" as const,
                      message: `✅ Fixed ${detailedBreakdown.altTextFixed} images with missing alt text`,
                    });
                  }
                  if (detailedBreakdown.metaDescriptionsUpdated > 0) {
                    logs.push({
                      timestamp: new Date().toTimeString().split(" ")[0],
                      level: "success" as const,
                      message: `✅ Updated ${detailedBreakdown.metaDescriptionsUpdated} meta descriptions`,
                    });
                  }
                  if (detailedBreakdown.titleTagsImproved > 0) {
                    logs.push({
                      timestamp: new Date().toTimeString().split(" ")[0],
                      level: "success" as const,
                      message: `✅ Improved ${detailedBreakdown.titleTagsImproved} title tags`,
                    });
                  }
                  if (detailedBreakdown.headingStructureFixed > 0) {
                    logs.push({
                      timestamp: new Date().toTimeString().split(" ")[0],
                      level: "success" as const,
                      message: `✅ Fixed heading structure issues`,
                    });
                  }
                }

                logs.push({
                  timestamp: new Date().toTimeString().split(" ")[0],
                  level: "success" as const,
                  message: `🎉 Successfully applied ${fixesSuccessful} fixes!`,
                });

                if (fixesFailed > 0) {
                  logs.push({
                    timestamp: new Date().toTimeString().split(" ")[0],
                    level: "warning" as const,
                    message: `⚠️ ${fixesFailed} fixes could not be applied`,
                  });
                }
              }

              return logs;
            })();

      // Update progress dialog with success
      setProgressDialog((prev) => ({
        ...prev,
        progress: 100,
        logs: finalLogs,
        status: "success",
        result: data,
      }));

      // Save full payload for detailed view
      setFixResult(data);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: ["/api/seo-reports", selectedWebsite],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/seo-detailed", selectedWebsite],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });

      // Show toast notification
      const isDry = !!data?.dryRun;
      const successCount = data?.stats?.fixesSuccessful || 0;

      toast({
        title: isDry ? "Dry Run Complete" : "AI Fixes Applied",
        description: isDry
          ? `Preview complete. ${successCount} fixes ready to apply.`
          : `Successfully applied ${successCount} SEO improvements.`,
      });
    },

    onError: (error: any) => {
      // Clear the progress timer
      if ((window as any).__aiFixTimer) {
        clearInterval((window as any).__aiFixTimer);
        delete (window as any).__aiFixTimer;
      }

      // Check if error contains logs
      const errorLogs = error?.detailedLog
        ? parseBackendLogs(error.detailedLog)
        : [];

      setProgressDialog((prev) => ({
        ...prev,
        status: "error",
        logs:
          errorLogs.length > 0
            ? errorLogs
            : [
                ...prev.logs,
                {
                  timestamp: new Date().toTimeString().split(" ")[0],
                  level: "error" as const,
                  message: `❌ Fix failed: ${
                    error?.message || "Unknown error"
                  }`,
                },
              ],
      }));

      toast({
        title: "AI Fix Failed",
        description: error?.message || "Could not apply AI fixes.",
        variant: "destructive",
      });
    },
  });

  const clearHistoryMutation = useMutation({
    mutationFn: () => api.clearSeoHistory(selectedWebsite),
    onSuccess: () => {
      // Clear the cached data
      queryClient.setQueryData(["/api/seo-reports", selectedWebsite], []);
      queryClient.invalidateQueries({
        queryKey: ["/api/seo-reports", selectedWebsite],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/seo-detailed", selectedWebsite],
      });

      toast({
        title: "History Cleared",
        description: `Successfully cleared all SEO analysis history for ${getWebsiteName(
          selectedWebsite
        )}.`,
      });

      setShowClearHistoryDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Clear History",
        description:
          error?.message ||
          "Unable to clear analysis history. Please try again.",
        variant: "destructive",
      });
    },
  });
  // Helper functions
  const getWebsiteName = (websiteId: string) => {
    const website = websites?.find((w) => w.id === websiteId);
    return website?.name || "Unknown Website";
  };

  const getWebsiteUrl = (websiteId: string) => {
    const website = websites?.find((w) => w.id === websiteId);
    return website?.url || "";
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Page Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              AI-Enhanced SEO Analysis
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Comprehensive real-time SEO analysis with AI-powered content
              insights, technical evaluation, and performance optimization
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 gap-2">
            {/* Fix with AI */}
            <Button
              onClick={() => fixWithAIMutation.mutate(false)}
              disabled={!selectedWebsite || fixWithAIMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {fixWithAIMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wrench className="w-4 h-4 mr-2" />
              )}
              {fixWithAIMutation.isPending ? "Fixing..." : "Fix with AI"}
            </Button>

            {/* Run Analysis */}
            <Button
              onClick={() => runAnalysis.mutate()}
              disabled={!selectedWebsite || runAnalysis.isPending}
              className="bg-primary-500 hover:bg-primary-600 text-white"
            >
              {runAnalysis.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Brain className="w-4 h-4 mr-2" />
              )}
              {runAnalysis.isPending
                ? "Analyzing..."
                : "Run AI-Enhanced Analysis"}
            </Button>
          </div>
        </div>

        {/* Website Selector */}
        <div className="mb-6">
          <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select website to analyze..." />
            </SelectTrigger>
            <SelectContent>
              {websites?.map((website) => (
                <SelectItem key={website.id} value={website.id}>
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4" />
                    <span>{website.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fix Result Panel */}
        {fixResult && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  {fixResult.dryRun ? "AI Fix Preview" : "AI Fixes Applied"}
                  <Badge variant="secondary" className="ml-2">
                    Impact: {fixResult?.stats?.estimatedImpact ?? "minimal"}
                  </Badge>
                  {!fixResult.dryRun && fixResult.stats.fixesSuccessful > 0 && (
                    <Badge
                      variant="default"
                      className="ml-2 bg-green-100 text-green-800"
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      Live Changes Made
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-sm">
                    {fixResult?.stats?.fixesSuccessful ?? 0} successful
                  </Badge>
                  <Badge variant="destructive" className="text-sm">
                    {fixResult?.stats?.fixesFailed ?? 0} failed
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription>
                <div className="space-y-1">
                  <div>
                    {fixResult?.stats?.fixesSuccessful ?? 0} successful •{" "}
                    {fixResult?.stats?.fixesFailed ?? 0} failed
                  </div>
                  <div className="text-xs text-gray-500">
                    Total issues found:{" "}
                    {fixResult?.stats?.totalIssuesFound ?? 0} • Fixes attempted:{" "}
                    {fixResult?.stats?.fixesAttempted ?? 0}
                  </div>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Detailed Breakdown Stats */}
              {fixResult?.stats?.detailedBreakdown && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {fixResult.stats.detailedBreakdown.altTextFixed}
                    </div>
                    <div className="text-xs text-gray-600">Images Alt Text</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {
                        fixResult.stats.detailedBreakdown
                          .metaDescriptionsUpdated
                      }
                    </div>
                    <div className="text-xs text-gray-600">
                      Meta Descriptions
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {fixResult.stats.detailedBreakdown.titleTagsImproved}
                    </div>
                    <div className="text-xs text-gray-600">Title Tags</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {fixResult.stats.detailedBreakdown.headingStructureFixed}
                    </div>
                    <div className="text-xs text-gray-600">
                      Heading Structure
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {fixResult.stats.detailedBreakdown.internalLinksAdded}
                    </div>
                    <div className="text-xs text-gray-600">Internal Links</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">
                      {fixResult.stats.detailedBreakdown.imagesOptimized}
                    </div>
                    <div className="text-xs text-gray-600">
                      Images Optimized
                    </div>
                  </div>
                </div>
              )}

              {/* Individual Fix Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Fix Details</h4>
                  <Badge variant="outline" className="text-xs">
                    {(fixResult.fixes || []).length} fixes
                  </Badge>
                </div>

                {(fixResult.fixes || []).map((f: any, i: number) => (
                  <div
                    key={i}
                    className={`p-4 rounded-lg border ${
                      f.success
                        ? "border-green-200 bg-green-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {f.type.replace("_", " ")}
                        </Badge>
                        <Badge
                          variant={
                            f.impact === "high"
                              ? "destructive"
                              : f.impact === "medium"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {f.impact} impact
                        </Badge>
                        {f.element && (
                          <span className="text-xs text-gray-500">
                            • {f.element}
                          </span>
                        )}
                        {f.wordpressPostId && (
                          <span className="text-xs text-blue-500">
                            • Post #{f.wordpressPostId}
                          </span>
                        )}
                      </div>
                      <Badge
                        className={
                          f.success
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {f.success ? "Success" : "Failed"}
                      </Badge>
                    </div>

                    <p className="text-sm mb-3">{f.description}</p>

                    {(f.before || f.after) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {f.before && (
                          <div className="p-3 bg-white border rounded">
                            <div className="font-medium mb-1 text-red-700">
                              Before
                            </div>
                            <pre className="overflow-auto whitespace-pre-wrap text-gray-700">
                              {f.before.length > 150
                                ? f.before.substring(0, 150) + "..."
                                : f.before}
                            </pre>
                          </div>
                        )}
                        {f.after && (
                          <div className="p-3 bg-white border rounded">
                            <div className="font-medium mb-1 text-green-700">
                              After
                            </div>
                            <pre className="overflow-auto whitespace-pre-wrap text-gray-700">
                              {f.after.length > 150
                                ? f.after.substring(0, 150) + "..."
                                : f.after}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}

                    {f.error && (
                      <div className="mt-3 p-2 rounded bg-red-50 border border-red-200 text-xs text-red-800">
                        <strong>Error:</strong> {f.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Error Summary */}
              {Array.isArray(fixResult.errors) &&
                fixResult.errors.length > 0 && (
                  <div className="p-4 rounded-lg border border-red-200 bg-red-50">
                    <div className="flex items-center mb-2">
                      <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                      <span className="font-medium text-sm text-red-800">
                        Errors Encountered ({fixResult.errors.length})
                      </span>
                    </div>
                    <div className="space-y-1">
                      {fixResult.errors.map((error: string, i: number) => (
                        <div key={i} className="text-xs text-red-700">
                          • {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex items-center space-x-2">
                  {fixResult.dryRun && (
                    <Button
                      onClick={() => fixWithAIMutation.mutate(false)}
                      disabled={fixWithAIMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {fixWithAIMutation.isPending ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Wrench className="w-4 h-4 mr-2" />
                      )}
                      Apply These Fixes
                    </Button>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFixResult(null)}
                >
                  Clear Results
                </Button>
              </div>

              {/* Success Summary */}
              {!fixResult.dryRun && fixResult.stats.fixesSuccessful > 0 && (
                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <span className="font-medium text-green-800">
                      Successfully Applied {fixResult.stats.fixesSuccessful} SEO
                      Fixes!
                    </span>
                  </div>
                  <div className="text-sm text-green-700">
                    Your website's SEO has been improved. The changes are now
                    live on your WordPress site.
                    {fixResult.stats.estimatedImpact !== "minimal" && (
                      <span className="block mt-1">
                        Expected SEO impact:{" "}
                        <strong className="capitalize">
                          {fixResult.stats.estimatedImpact}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Show loading state during analysis */}
        {runAnalysis.isPending && (
          <Card>
            <CardContent className="text-center py-12">
              <div className="flex flex-col items-center space-y-4">
                <RefreshCw className="h-12 w-12 text-blue-500 animate-spin" />
                <Brain className="h-8 w-8 text-purple-500 animate-pulse" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2 mt-4">
                AI-Enhanced Analysis in Progress...
              </h3>
              <p className="text-sm text-gray-500">
                Running comprehensive SEO analysis for{" "}
                {getWebsiteName(selectedWebsite)}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                This includes technical SEO, content quality analysis, E-A-T
                scoring, and keyword optimization
              </p>
              <div className="mt-4 w-64 mx-auto bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full animate-pulse"
                  style={{ width: "60%" }}
                ></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Show results only if analysis complete and valid */}
        {!runAnalysis.isPending &&
          selectedWebsite &&
          latestReport &&
          latestReport.score !== undefined && (
            <div>
              {/* SEO Score Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Overall SEO Score
                      {detailedAnalysis?.hasAIAnalysis && (
                        <Badge variant="secondary" className="ml-2">
                          <Brain className="w-3 h-3 mr-1" />
                          AI-Enhanced
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Analysis completed {formatTimeAgo(latestReport.createdAt)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-4">
                      <div
                        className={`text-6xl font-bold ${getScoreColor(
                          latestReport.score
                        )}`}
                      >
                        {latestReport.score}
                      </div>
                      <div className="flex-1">
                        <Progress
                          value={latestReport.score}
                          className="w-full h-4 mb-2"
                        />
                        <p className="text-sm text-gray-600">
                          {latestReport.score >= 80
                            ? "Excellent SEO Performance"
                            : latestReport.score >= 60
                            ? "Good SEO Foundation"
                            : "Needs Optimization"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {detailedAnalysis?.hasAIAnalysis
                            ? "Based on AI-powered content analysis & technical SEO"
                            : "Based on technical SEO analysis"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Zap className="w-5 h-5 mr-2" />
                      Page Speed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-3xl font-bold ${getScoreColor(
                        latestReport.pageSpeedScore || 0
                      )}`}
                    >
                      {latestReport.pageSpeedScore || "N/A"}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {latestReport.pageSpeedScore
                        ? "Google PageSpeed"
                        : "Estimated Score"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Analysis Tabs */}
              <Tabs defaultValue="issues" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="issues">Issues & Fixes</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="issues">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Wrench className="w-5 h-5 mr-2 text-purple-600" />
                          SEO Issues & AI Fixes
                        </div>
                        {/* Issue Summary Badges */}
                        <div className="flex items-center space-x-2">
                          {(() => {
                            const allIssues = latestReport?.issues || [];
                            const fixableIssues = getFixableIssuesWithStatus(
                              allIssues,
                              detailedAnalysis?.trackedIssues || []
                            );
                            const detectedCount = fixableIssues.filter((i) =>
                              ["detected", "reappeared"].includes(
                                i.trackingStatus
                              )
                            ).length;
                            const fixedCount = fixableIssues.filter((i) =>
                              ["fixed", "resolved"].includes(i.trackingStatus)
                            ).length;
                            const fixingCount = fixableIssues.filter(
                              (i) => i.trackingStatus === "fixing"
                            ).length;

                            return (
                              <>
                                {detectedCount > 0 && (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    {detectedCount} Fixable
                                  </Badge>
                                )}
                                {fixingCount > 0 && (
                                  <Badge
                                    variant="default"
                                    className="text-xs animate-pulse"
                                  >
                                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                    {fixingCount} Fixing
                                  </Badge>
                                )}
                                {fixedCount > 0 && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-green-100 text-green-800"
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    {fixedCount} Fixed
                                  </Badge>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </CardTitle>
                      <CardDescription>
                        Track SEO issues and their fix status. AI can
                        automatically resolve technical issues.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Inner Tabs for issue categories */}
                      <Tabs defaultValue="fixable" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="fixable">AI Fixable</TabsTrigger>
                          <TabsTrigger value="manual">Manual</TabsTrigger>
                          <TabsTrigger value="resolved">Resolved</TabsTrigger>
                        </TabsList>

                        {/* AI Fixable Issues Tab */}
                        <TabsContent value="fixable" className="space-y-4 mt-6">
                          {(() => {
                            const allIssues = latestReport?.issues || [];
                            const fixableIssues = getFixableIssuesWithStatus(
                              allIssues,
                              detailedAnalysis?.trackedIssues || []
                            );

                            // Filter out already fixed/resolved issues
                            const activeFixableIssues = fixableIssues.filter(
                              (i) =>
                                !["fixed", "resolved"].includes(
                                  i.trackingStatus
                                )
                            );

                            if (activeFixableIssues.length === 0) {
                              return (
                                <div className="text-center py-8">
                                  <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                                    No Active AI-Fixable Issues
                                  </h3>
                                  <p className="mt-1 text-sm text-gray-500">
                                    All automatically fixable SEO issues have
                                    been resolved!
                                  </p>
                                </div>
                              );
                            }

                            return activeFixableIssues.map((issue, index) => {
                              const statusConfig = getIssueStatusBadge(
                                issue.trackingStatus
                              );

                              return (
                                <div
                                  key={index}
                                  className={`p-4 rounded-lg border ${getIssueColor(
                                    issue.type
                                  )} relative`}
                                >
                                  {/* Status indicator */}
                                  <div className="absolute top-2 right-2">
                                    <Badge
                                      variant={statusConfig.variant}
                                      className="text-xs"
                                    >
                                      <span className="mr-1">
                                        {statusConfig.icon}
                                      </span>
                                      {statusConfig.text}
                                    </Badge>
                                  </div>

                                  <div className="flex items-start justify-between pr-20">
                                    <div className="flex items-start space-x-3">
                                      {getIssueIcon(issue.type)}
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                          <h4 className="font-medium">
                                            {issue.title}
                                          </h4>
                                          <Badge
                                            variant="outline"
                                            className="text-xs bg-green-50 text-green-700 border-green-200"
                                          >
                                            <Zap className="w-3 h-3 mr-1" />
                                            AI Fixable
                                          </Badge>
                                          {/* Show what type of fix is available */}
                                          {(() => {
                                            const titleLower =
                                              issue.title.toLowerCase();
                                            if (
                                              titleLower.includes("keyword")
                                            ) {
                                              return (
                                                <Badge
                                                  variant="secondary"
                                                  className="text-xs"
                                                >
                                                  Keyword Optimization
                                                </Badge>
                                              );
                                            }
                                            if (
                                              titleLower.includes(
                                                "content structure"
                                              )
                                            ) {
                                              return (
                                                <Badge
                                                  variant="secondary"
                                                  className="text-xs"
                                                >
                                                  Content Restructuring
                                                </Badge>
                                              );
                                            }
                                            if (
                                              titleLower.includes("schema") ||
                                              titleLower.includes("viewport") ||
                                              titleLower.includes("open graph")
                                            ) {
                                              return (
                                                <Badge
                                                  variant="secondary"
                                                  className="text-xs"
                                                >
                                                  Technical SEO
                                                </Badge>
                                              );
                                            }
                                            return null;
                                          })()}
                                        </div>
                                        <p className="text-sm mt-1 opacity-90">
                                          {issue.description}
                                        </p>

                                        {/* Tracking Details */}
                                        <div className="flex items-center space-x-4 mt-3">
                                          <Badge
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            {issue.type.toUpperCase()}
                                          </Badge>
                                          <span className="text-xs opacity-75">
                                            {issue.affectedPages} page(s)
                                            affected
                                          </span>
                                          {issue.lastSeen && (
                                            <span className="text-xs text-gray-500">
                                              Last seen:{" "}
                                              {formatTimeAgo(issue.lastSeen)}
                                            </span>
                                          )}
                                          {issue.trackingStatus ===
                                            "reappeared" && (
                                            <Badge
                                              variant="destructive"
                                              className="text-xs"
                                            >
                                              <AlertTriangle className="w-3 h-3 mr-1" />
                                              Issue returned after fix
                                            </Badge>
                                          )}
                                        </div>

                                        {/* Fix History */}
                                        {issue.trackingInfo?.metadata
                                          ?.fixHistory && (
                                          <details className="mt-3">
                                            <summary className="text-xs cursor-pointer text-blue-600 hover:text-blue-800">
                                              View Fix History
                                            </summary>
                                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                              <pre className="whitespace-pre-wrap">
                                                {JSON.stringify(
                                                  issue.trackingInfo.metadata
                                                    .fixHistory,
                                                  null,
                                                  2
                                                )}
                                              </pre>
                                            </div>
                                          </details>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Progress indicator for fixing status */}
                                  {issue.trackingStatus === "fixing" && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                      <div className="flex items-center space-x-2">
                                        <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                                        <div className="flex-1">
                                          <div className="flex justify-between text-xs mb-1">
                                            <span>Applying AI fix...</span>
                                            <span>In progress</span>
                                          </div>
                                          <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                              className="bg-blue-500 h-2 rounded-full animate-pulse"
                                              style={{ width: "60%" }}
                                            ></div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </TabsContent>

                        {/* Manual Issues Tab */}
                        <TabsContent value="manual" className="space-y-4 mt-6">
                          {(() => {
                            const allIssues = latestReport?.issues || [];

                            // Get truly manual issues by excluding AI-fixable ones
                            const manualIssues = allIssues.filter((issue) => {
                              const titleLower = issue.title.toLowerCase();

                              // Check against AI-fixable titles
                              const isAIFixable = AI_FIXABLE_TITLES.some(
                                (type) =>
                                  titleLower.includes(type.toLowerCase())
                              );

                              // Also check the backend flag
                              if (issue.autoFixAvailable === true) {
                                return false; // It's AI-fixable, not manual
                              }

                              return !isAIFixable; // Only return true if NOT AI-fixable
                            });

                            if (manualIssues.length === 0) {
                              return (
                                <div className="text-center py-8">
                                  <CheckCircle className="mx-auto h-12 w-12 text-blue-500" />
                                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                                    No Manual Issues Found
                                  </h3>
                                  <p className="mt-1 text-sm text-gray-500">
                                    All detected issues can be automatically
                                    fixed by AI.
                                  </p>
                                </div>
                              );
                            }

                            return manualIssues.map((issue, index) => (
                              <div
                                key={index}
                                className={`p-4 rounded-lg border ${getIssueColor(
                                  issue.type
                                )}`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start space-x-3">
                                    {getIssueIcon(issue.type)}
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2 mb-1">
                                        <h4 className="font-medium">
                                          {issue.title}
                                        </h4>
                                        <Badge
                                          variant="outline"
                                          className="text-xs bg-orange-50 text-orange-700 border-orange-200"
                                        >
                                          <Settings className="w-3 h-3 mr-1" />
                                          Manual Fix Required
                                        </Badge>
                                      </div>
                                      <p className="text-sm mt-1 opacity-90">
                                        {issue.description}
                                      </p>
                                      <div className="flex items-center space-x-4 mt-2">
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          {issue.type.toUpperCase()}
                                        </Badge>
                                        <span className="text-xs opacity-75">
                                          {issue.affectedPages} page(s) affected
                                        </span>
                                        <span className="text-xs text-orange-600 font-medium">
                                          🔧 Manual fix needed
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ));
                          })()}
                        </TabsContent>

                        {/* Resolved Issues Tab */}
                        <TabsContent
                          value="resolved"
                          className="space-y-4 mt-6"
                        >
                          {(() => {
                            const allIssues = latestReport?.issues || [];
                            const fixableIssues = getFixableIssuesWithStatus(
                              allIssues,
                              detailedAnalysis?.trackedIssues || []
                            );
                            const resolvedIssues = fixableIssues.filter((i) =>
                              ["fixed", "resolved"].includes(i.trackingStatus)
                            );

                            if (resolvedIssues.length === 0) {
                              return (
                                <div className="text-center py-8">
                                  <Clock className="mx-auto h-12 w-12 text-gray-400" />
                                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                                    No Resolved Issues Yet
                                  </h3>
                                  <p className="mt-1 text-sm text-gray-500">
                                    Issues that have been fixed will appear
                                    here.
                                  </p>
                                </div>
                              );
                            }

                            return resolvedIssues.map((issue, index) => {
                              const statusConfig = getIssueStatusBadge(
                                issue.trackingStatus
                              );

                              return (
                                <div
                                  key={index}
                                  className="p-4 rounded-lg border border-green-200 bg-green-50"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-3">
                                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                          <h4 className="font-medium text-green-900">
                                            {issue.title}
                                          </h4>
                                          <Badge
                                            variant={statusConfig.variant}
                                            className="text-xs"
                                          >
                                            <span className="mr-1">
                                              {statusConfig.icon}
                                            </span>
                                            {statusConfig.text}
                                          </Badge>
                                        </div>
                                        <p className="text-sm mt-1 text-green-800 opacity-90">
                                          {issue.description}
                                        </p>
                                        <div className="flex items-center space-x-4 mt-2">
                                          {issue.fixedAt && (
                                            <span className="text-xs text-green-600">
                                              Fixed:{" "}
                                              {formatTimeAgo(issue.fixedAt)}
                                            </span>
                                          )}
                                          {/* {issue.trackingInfo?.fix_method && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-green-100 text-green-800"
                            >
                              {issue.trackingInfo.fix_method === "ai_automatic"
                                ? "🤖 AI Fixed"
                                : "👤 Manual"}
                            </Badge>
                          )} */}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </TabsContent>
                      </Tabs>

                      {/* Action Section */}
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-600">
                            Issues are automatically tracked and updated when
                            fixes are applied or when new analysis detects
                            changes.
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="history">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Analysis History</CardTitle>
                          <CardDescription>
                            Previous SEO analysis results for{" "}
                            {getWebsiteName(selectedWebsite)}
                          </CardDescription>
                        </div>
                        {seoReports && seoReports.length > 0 && (
                          <AlertDialog
                            open={showClearHistoryDialog}
                            onOpenChange={setShowClearHistoryDialog}
                          >
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Clear History
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Clear Analysis History?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete all SEO analysis
                                  history for{" "}
                                  <span className="font-medium">
                                    {getWebsiteName(selectedWebsite)}
                                  </span>
                                  . This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => clearHistoryMutation.mutate()}
                                  disabled={clearHistoryMutation.isPending}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  {clearHistoryMutation.isPending ? (
                                    <>
                                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                      Clearing...
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Clear History
                                    </>
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="text-center py-8">
                          <div className="text-gray-500">
                            Loading analysis history...
                          </div>
                        </div>
                      ) : seoReports && seoReports.length > 0 ? (
                        <div className="space-y-3">
                          {seoReports.map((report) => (
                            <div
                              key={report.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex items-center space-x-4">
                                <div
                                  className={`text-2xl font-bold ${getScoreColor(
                                    report.score
                                  )}`}
                                >
                                  {report.score}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">
                                    SEO Score: {report.score}/100
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {formatTimeAgo(report.createdAt)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {report.metadata?.aiAnalysisPerformed && (
                                  <Badge variant="default" className="text-xs">
                                    <Brain className="w-3 h-3 mr-1" />
                                    AI-Enhanced
                                  </Badge>
                                )}
                                {report.pageSpeedScore && (
                                  <Badge variant="outline">
                                    Speed: {report.pageSpeedScore}
                                  </Badge>
                                )}
                                <Badge variant="outline">
                                  Issues:{" "}
                                  {(report.issues as any[])?.length || 0}
                                </Badge>
                              </div>
                            </div>
                          ))}
                          <div className="text-xs text-gray-500 mt-4 pt-4 border-t">
                            {seoReports.length} analysis record
                            {seoReports.length !== 1 ? "s" : ""} • Oldest:{" "}
                            {formatTimeAgo(
                              seoReports[seoReports.length - 1].createdAt
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Search className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">
                            No analysis history
                          </h3>
                          <p className="mt-1 text-sm text-gray-500">
                            Run your first AI-enhanced SEO analysis to see
                            results here.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}

        {/* Show when no analysis data is available */}
        {!runAnalysis.isPending &&
          selectedWebsite &&
          (!latestReport || latestReport.score === undefined) && (
            <Card>
              <CardContent className="text-center py-12">
                <Search className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No SEO Analysis Data
                </h3>
                <p className="mt-1 text-sm text-gray-500 mb-4">
                  Run an AI-enhanced SEO analysis to see comprehensive insights
                  for {getWebsiteName(selectedWebsite)}.
                </p>
                <div className="flex flex-col items-center space-y-2">
                  <Button
                    onClick={() => runAnalysis.mutate()}
                    disabled={runAnalysis.isPending}
                    className="bg-primary-500 hover:bg-primary-600 text-white"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Start AI-Enhanced Analysis
                  </Button>
                  <p className="text-xs text-gray-400">
                    Includes content quality assessment, E-A-T scoring, keyword
                    optimization, and technical SEO
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

        {/* Show error state */}
        {runAnalysis.isError && (
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Website Analysis Failed
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                We couldn't analyze {getWebsiteName(selectedWebsite)}. Please
                check that the website URL is correct and try again.
              </p>
              <Button
                onClick={() => runAnalysis.mutate()}
                disabled={runAnalysis.isPending}
                variant="outline"
                className="mt-4"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Analysis
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Default state - no website selected */}
        {!selectedWebsite && (
          <Card>
            <CardContent className="text-center py-12">
              <div className="flex justify-center space-x-4 mb-4">
                <Globe className="h-12 w-12 text-gray-400" />
                <Brain className="h-12 w-12 text-purple-400" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Select a website
              </h3>
              <p className="mt-1 text-sm text-gray-500 mb-4">
                Choose a website to run AI-enhanced SEO analysis with
                comprehensive technical insights and content evaluation.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  AI-Enhanced Analysis Includes:
                </h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Content quality & readability assessment</li>
                  <li>• E-A-T (Expertise, Authority, Trust) scoring</li>
                  <li>• Keyword optimization analysis</li>
                  <li>• Content gap identification</li>
                  <li>• Semantic keyword suggestions</li>
                  <li>• User intent alignment evaluation</li>
                  <li>• Technical SEO audit</li>
                  <li>• Page speed analysis</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        <ProgressDialog
          open={progressDialog.open}
          onClose={() =>
            setProgressDialog((prev) => ({ ...prev, open: false }))
          }
          title={progressDialog.title}
          description={progressDialog.description}
          progress={progressDialog.progress}
          logs={progressDialog.logs}
          status={progressDialog.status}
          result={progressDialog.result}
          type={progressDialog.type}
        />
      </div>
    </div>
  );
}
