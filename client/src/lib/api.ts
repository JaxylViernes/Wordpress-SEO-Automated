//client/src/lib/api.ts
import { apiRequest } from "./queryClient";

// ===============================
// MAIN API CLIENT
// ===============================
export const api = {

  // ===============================
  // CONTENT MANAGEMENT
  // ===============================
  
  getContentById: (contentId: string) => 
  fetch(`/api/user/content/${contentId}`).then(res => {
    if (!res.ok) throw new Error('Failed to fetch content details');
    return res.json();
  }),

  getWebsiteContent: (websiteId: string) => 
    fetch(`/api/user/websites/${websiteId}/content`).then(res => {
      if (!res.ok) throw new Error('Failed to fetch content or access denied');
      return res.json();
    }),
  
  generateContent: (data: {
    websiteId: string;
    topic: string;
    keywords?: string[];
    tone?: string;
    wordCount?: number;
    brandVoice?: string;
    targetAudience?: string;
    eatCompliance?: boolean;
    aiProvider?: 'openai' | 'anthropic' | 'gemini'; // Updated to include gemini
  }) => {
    console.log("🤖 Generating content with data:", data);
    return apiRequest("POST", "/api/user/content/generate", data);
  },
  
  updateContent: (id: string, data: {
    title?: string;
    body?: string;
    excerpt?: string;
    metaDescription?: string;
    metaTitle?: string;
    websiteId?: string;
    tone?: string;
    brandVoice?: string;
    targetAudience?: string;
    eatCompliance?: boolean;
    aiProvider?: 'openai' | 'anthropic' | 'gemini'; // Updated to include gemini
  }) => apiRequest("PUT", `/api/user/content/${id}`, data),
  
  publishContent: (id: string) => apiRequest("POST", `/api/user/content/${id}/publish`),

  // ===============================
  // AUTHENTICATION
  // ===============================

  getCurrentUser: () => fetch("/api/auth/me").then(res => {
    if (!res.ok) throw new Error('Authentication required');
    return res.json();
  }),

  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    console.log("🔐 Changing user password");
    return fetch("/api/auth/change-password", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    }).then(res => {
      if (!res.ok) {
        return res.json().then(error => {
          throw new Error(error.message || 'Failed to change password');
        });
      }
      return res.json();
    });
  },

  // ===============================
  // WEBSITE MANAGEMENT
  // ===============================
  
  getWebsites: () => fetch("/api/user/websites").then(res => {
    if (!res.ok) throw new Error('Failed to fetch websites');
    return res.json();
  }),
  
  getWebsite: (id: string) => fetch(`/api/user/websites/${id}`).then(res => {
    if (!res.ok) throw new Error('Website not found or access denied');
    return res.json();
  }),
  
  createWebsite: (data: {
    name: string;
    url: string;
    wpApplicationName: string;
    wpApplicationPassword: string;
    wpUsername?: string;
    aiModel?: string;
    brandVoice?: string;
    targetAudience?: string;
    autoPosting?: boolean;
    requireApproval?: boolean;
    contentGuidelines?: string;
  }) => {
    console.log("🚀 Creating website with data:", data);
    return apiRequest("POST", "/api/user/websites", data);
  },
  
  updateWebsite: (id: string, data: any) => apiRequest("PUT", `/api/user/websites/${id}`, data),
  
  deleteWebsite: (id: string) => apiRequest("DELETE", `/api/user/websites/${id}`),

  // Website ownership validation
  validateWebsiteOwnership: async (websiteId: string): Promise<void> => {
    const response = await fetch(`/api/user/websites/${websiteId}/validate-ownership`, {
      method: 'POST'
    });
    if (!response.ok) {
      throw new Error('Website access denied - not owned by current user');
    }
  },

  // ===============================
  // AI FIXES AND AUTOMATION
  // ===============================

  fixWithAI: async (websiteId: string, dryRun: boolean = false, options?: {
    fixTypes?: string[];
    maxChanges?: number;
    skipBackup?: boolean;
  }) => {
    const response = await fetch(`/api/user/websites/${websiteId}/ai-fix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        dryRun,
        ...options 
      })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'AI fix failed' }));
      throw new Error(error.message || 'Failed to apply AI fixes');
    }
    
    return response.json();
  },

  // Get available AI fix types
  getAvailableAIFixes: async (websiteId: string) => {
    const response = await fetch(`/api/user/websites/${websiteId}/available-fixes`);
    if (!response.ok) throw new Error('Failed to get available fixes');
    return response.json();
  },

  // ===============================
  // SEO ANALYSIS AND REPORTING
  // ===============================

  getSeoReports: (websiteId: string) => 
    fetch(`/api/user/websites/${websiteId}/seo-reports`).then(res => {
      if (!res.ok) throw new Error('Failed to fetch SEO reports or access denied');
      return res.json();
    }),
  
  runSeoAnalysis: (websiteId: string, data?: { targetKeywords?: string[] }) => 
    fetch(`/api/user/websites/${websiteId}/seo-analysis`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {})
    }).then(res => {
      if (!res.ok) throw new Error('Failed to run SEO analysis or access denied');
      return res.json();
    }),

  getDetailedSeoData: (websiteId: string) => 
    fetch(`/api/user/websites/${websiteId}/detailed-seo`).then(res => {
      if (!res.ok) throw new Error('Failed to fetch detailed SEO data');
      return res.json();
    }),

  // Get tracked SEO issues for a website  
  getTrackedSeoIssues: (websiteId: string, options?: {
    status?: string[];
    autoFixableOnly?: boolean;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status.join(','));
    if (options?.autoFixableOnly) params.set('autoFixableOnly', 'true');
    if (options?.limit) params.set('limit', options.limit.toString());
    
    const url = `/api/user/websites/${websiteId}/tracked-issues${params.toString() ? `?${params}` : ''}`;
    
    return fetch(url).then(res => {
      if (!res.ok) throw new Error('Failed to fetch tracked issues');
      return res.json();
    });
  },

  // Get issue tracking summary
  getIssueTrackingSummary: (websiteId: string) =>
    fetch(`/api/user/websites/${websiteId}/issue-summary`).then(res => {
      if (!res.ok) throw new Error('Failed to fetch issue summary');
      return res.json();
    }),

  // Update issue status manually
  updateIssueStatus: (issueId: string, data: {
    status: string;
    resolutionNotes?: string;
    fixMethod?: string;
  }) =>
    fetch(`/api/user/tracked-issues/${issueId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => {
      if (!res.ok) throw new Error('Failed to update issue status');
      return res.json();
    }),

  // ===============================
  // BATCH OPERATIONS
  // ===============================

  // Batch operations
  batchAnalyzeSites: async (websiteIds: string[], options?: {
    includeContentAnalysis?: boolean;
    targetKeywords?: string[];
  }) => {
    const analyses = await Promise.allSettled(
      websiteIds.map(id => api.runSeoAnalysis(id, options))
    );
    
    return analyses.map((result, index) => ({
      websiteId: websiteIds[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null
    }));
  },

  // SEO comparison across user's websites
  compareSeoScores: async (websiteIds: string[]) => {
    const reports = await Promise.all(
      websiteIds.map(async (id) => {
        try {
          const [reports, website] = await Promise.all([
            api.getSeoReports(id),
            api.getWebsite(id)
          ]);
          return {
            websiteId: id,
            websiteName: website.name,
            websiteUrl: website.url,
            latestScore: reports[0]?.score || 0,
            latestAnalysis: reports[0]?.createdAt || null,
            hasAiAnalysis: reports[0]?.metadata?.aiAnalysisPerformed || false
          };
        } catch (error) {
          return {
            websiteId: id,
            error: error.message
          };
        }
      })
    );
    
    return reports;
  },

  // SEO trend analysis for user's websites
  getSeoTrends: async (websiteId: string, days: number = 30) => {
    const reports = await api.getSeoReports(websiteId);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentReports = reports.filter(report => 
      new Date(report.createdAt) >= cutoffDate
    );
    
    return {
      websiteId,
      period: `${days} days`,
      totalAnalyses: recentReports.length,
      scoreHistory: recentReports.map(report => ({
        date: report.createdAt,
        score: report.score,
        pageSpeedScore: report.pageSpeedScore,
        issuesCount: report.issues?.length || 0,
        hasAiAnalysis: report.metadata?.aiAnalysisPerformed || false
      })),
      averageScore: recentReports.length > 0 ? 
        Math.round(recentReports.reduce((sum, r) => sum + r.score, 0) / recentReports.length) : 0,
      scoreImprovement: recentReports.length >= 2 ? 
        recentReports[0].score - recentReports[recentReports.length - 1].score : 0
    };
  },

  // ===============================
  // CLIENT REPORTS
  // ===============================

  getClientReports: (websiteId?: string) => {
    const url = websiteId ? 
      `/api/user/websites/${websiteId}/reports` : 
      "/api/user/reports";
    console.log(`Fetching reports from: ${url}`);
    return fetch(url).then(res => {
      console.log(`Reports response status: ${res.status}`);
      if (!res.ok) {
        console.error(`Failed to fetch reports: ${res.status} ${res.statusText}`);
        throw new Error('Failed to fetch client reports');
      }
      return res.json();
    }).then(data => {
      console.log(`Fetched ${data.length} reports`);
      return data;
    });
  },

  // Modify your existing api.generateClientReport function:
  generateClientReport: async (
    websiteId: string, 
    data: { 
      reportType: 'weekly' | 'monthly' | 'quarterly',
      reportId?: string | number  // Add this optional parameter
    }
  ) => {
    const response = await fetch('/api/user/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        websiteId, 
        ...data 
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate report');
    }
    
    return response.json();
  },

  generateBulkReports: async (websiteIds: string[], reportType: 'weekly' | 'monthly' | 'quarterly' = 'monthly') => {
    console.log(`Generating bulk reports for ${websiteIds.length} websites`);
    
    const reports = await Promise.allSettled(
      websiteIds.map(id => api.generateClientReport(id, { reportType }))
    );
    
    return reports.map((result, index) => ({
      websiteId: websiteIds[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null
    }));
  },

  // ===============================
  // CONTENT SCHEDULING
  // ===============================

  // Get scheduled content for a specific website
  getContentSchedule: (websiteId: string) => 
    fetch(`/api/user/websites/${websiteId}/content-schedule`).then(res => {
      if (!res.ok) throw new Error('Failed to fetch content schedule');
      return res.json();
    }),

  // Get all scheduled content for user (across all websites)
  getAllScheduledContent: () => 
    fetch('/api/user/content-schedule').then(res => {
      if (!res.ok) throw new Error('Failed to fetch scheduled content');
      return res.json();
    }),

  // Schedule existing content for publication
  scheduleExistingContent: (websiteId: string, data: {
    contentId: string;
    scheduledDate: string;
  }) => {
    console.log("📅 Scheduling existing content:", data);
    return fetch(`/api/user/websites/${websiteId}/schedule-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => {
      if (!res.ok) throw new Error('Failed to schedule content');
      return res.json();
    });
  },

  // Update scheduled content
  updateScheduledContent: (websiteId: string, scheduleId: string, data: {
    scheduledDate?: string;
    status?: string;
  }) => {
    console.log("✏️ Updating scheduled content:", { scheduleId, data });
    return fetch(`/api/user/websites/${websiteId}/content-schedule/${scheduleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => {
      if (!res.ok) throw new Error('Failed to update scheduled content');
      return res.json();
    });
  },

  // Delete scheduled content (unschedule)
  deleteScheduledContent: (websiteId: string, scheduleId: string) => {
    console.log("🗑️ Unscheduling content:", scheduleId);
    return fetch(`/api/user/websites/${websiteId}/content-schedule/${scheduleId}`, {
      method: 'DELETE'
    }).then(res => {
      if (!res.ok) throw new Error('Failed to unschedule content');
    });
  },

  // Get unpublished content available for scheduling
  getAvailableContentForScheduling: (websiteId: string) => 
    fetch(`/api/user/websites/${websiteId}/content`).then(res => {
      if (!res.ok) throw new Error('Failed to fetch content');
      return res.json();
    }).then(content => 
      content.filter((c: any) => c.status === 'ready' || c.status === 'pending_approval')
    ),

  // Bulk schedule multiple content pieces
  batchScheduleContent: async (websiteId: string, schedules: Array<{
    contentId: string;
    scheduledDate: string;
  }>) => {
    console.log(`📅 Batch scheduling ${schedules.length} content pieces`);
    
    const results = await Promise.allSettled(
      schedules.map(schedule => api.scheduleExistingContent(websiteId, schedule))
    );
    
    return results.map((result, index) => ({
      schedule: schedules[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null
    }));
  },

  // Get scheduled content statistics
  getScheduleStats: async (websiteId?: string) => {
    try {
      const scheduledContent = websiteId 
        ? await api.getContentSchedule(websiteId)
        : await api.getAllScheduledContent();
      
      const now = new Date();
      const thisWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const scheduled = scheduledContent.filter((c: any) => c.status === 'scheduled');
      const published = scheduledContent.filter((c: any) => c.status === 'published');
      const overdue = scheduled.filter((c: any) => new Date(c.scheduledDate) <= now);
      const upcoming = scheduled.filter((c: any) => 
        new Date(c.scheduledDate) <= thisWeek && new Date(c.scheduledDate) > now
      );
      const thisMonthCount = scheduled.filter((c: any) => {
        const scheduleDate = new Date(c.scheduledDate);
        return scheduleDate.getMonth() === now.getMonth() && 
               scheduleDate.getFullYear() === now.getFullYear();
      });
      
      return {
        total: scheduledContent.length,
        scheduled: scheduled.length,
        published: published.length,
        overdue: overdue.length,
        upcoming: upcoming.length,
        thisMonth: thisMonthCount.length,
        nextScheduled: scheduled.length > 0 
          ? scheduled.sort((a: any, b: any) => 
              new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
            )[0]
          : null
      };
    } catch (error) {
      console.error('Failed to get schedule stats:', error);
      return {
        total: 0, scheduled: 0, published: 0, overdue: 0, 
        upcoming: 0, thisMonth: 0, nextScheduled: null
      };
    }
  },

  // Check if content is already scheduled
  isContentScheduled: async (contentId: string) => {
    try {
      // This would need a new endpoint, or you can check in the frontend
      const allScheduled = await api.getAllScheduledContent();
      return allScheduled.some((s: any) => 
        s.contentId === contentId && (s.status === 'scheduled' || s.status === 'publishing')
      );
    } catch (error) {
      console.error('Failed to check if content is scheduled:', error);
      return false;
    }
  },

  // Quick schedule content for immediate publication
  scheduleContentForNow: (websiteId: string, contentId: string) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1); // Schedule for 1 minute from now
    
    return api.scheduleExistingContent(websiteId, {
      contentId,
      scheduledDate: now.toISOString()
    });
  },

  // Reschedule content to a new date
  rescheduleContent: (websiteId: string, scheduleId: string, newDate: string) => {
    return api.updateScheduledContent(websiteId, scheduleId, {
      scheduledDate: newDate
    });
  },

  // Cancel scheduled content (mark as cancelled)
  cancelScheduledContent: (websiteId: string, scheduleId: string) => {
    return api.updateScheduledContent(websiteId, scheduleId, {
      status: 'cancelled'
    });
  },

  // Get scheduling dashboard data
  getSchedulingDashboard: async () => {
    try {
      const [scheduledContent, websites] = await Promise.all([
        api.getAllScheduledContent(),
        api.getWebsites()
      ]);
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const todayScheduled = scheduledContent.filter((c: any) => {
        const scheduleDate = new Date(c.scheduledDate);
        return scheduleDate >= today && scheduleDate < tomorrow && c.status === 'scheduled';
      });
      
      const weekScheduled = scheduledContent.filter((c: any) => {
        const scheduleDate = new Date(c.scheduledDate);
        return scheduleDate >= today && scheduleDate <= nextWeek && c.status === 'scheduled';
      });
      
      const overdue = scheduledContent.filter((c: any) => 
        new Date(c.scheduledDate) < now && c.status === 'scheduled'
      );
      
      const recentlyPublished = scheduledContent.filter((c: any) => {
        const publishDate = new Date(c.publishedAt || c.scheduledDate);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return publishDate >= weekAgo && c.status === 'published';
      });
      
      return {
        stats: {
          todayCount: todayScheduled.length,
          weekCount: weekScheduled.length,
          overdueCount: overdue.length,
          recentlyPublishedCount: recentlyPublished.length,
          totalActiveSchedules: scheduledContent.filter((c: any) => c.status === 'scheduled').length
        },
        upcomingToday: todayScheduled,
        upcomingWeek: weekScheduled.slice(0, 10), // Limit to 10 items
        overdueItems: overdue,
        websiteStats: websites?.map((website: any) => {
          const websiteSchedules = scheduledContent.filter((c: any) => c.websiteId === website.id);
          return {
            websiteId: website.id,
            websiteName: website.name,
            scheduledCount: websiteSchedules.filter((c: any) => c.status === 'scheduled').length,
            publishedCount: websiteSchedules.filter((c: any) => c.status === 'published').length,
            overdueCount: websiteSchedules.filter((c: any) => 
              new Date(c.scheduledDate) < now && c.status === 'scheduled'
            ).length
          };
        }) || []
      };
    } catch (error) {
      console.error('Failed to get scheduling dashboard:', error);
      return {
        stats: {
          todayCount: 0,
          weekCount: 0,
          overdueCount: 0,
          recentlyPublishedCount: 0,
          totalActiveSchedules: 0
        },
        upcomingToday: [],
        upcomingWeek: [],
        overdueItems: [],
        websiteStats: []
      };
    }
  },

  // ===============================
  // DASHBOARD AND ANALYTICS
  // ===============================

  getDashboardStats: () => fetch("/api/user/dashboard/stats").then(res => {
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  }),
  
  getPerformanceData: () => fetch("/api/user/dashboard/performance").then(res => {
    if (!res.ok) throw new Error('Failed to fetch performance data');
    return res.json();
  }),

  // ===============================
  // ACTIVITY LOGS
  // ===============================

  getActivityLogs: (websiteId?: string) => {
    const url = websiteId ? 
      `/api/user/activity-logs?websiteId=${websiteId}` : 
      "/api/user/activity-logs";
    return fetch(url).then(res => {
      if (!res.ok) throw new Error('Failed to fetch activity logs');
      return res.json();
    });
  },

  // ===============================
  // GLOBAL UTILITIES
  // ===============================

  // Global endpoints (no user scoping needed)
  getSeoHealth: () => fetch('/api/seo/health').then(res => {
    if (!res.ok) throw new Error('Failed to check SEO service health');
    return res.json();
  }),

  getAiProviderStatus: () => fetch('/api/ai-providers/status').then(res => {
    if (!res.ok) throw new Error('Failed to check AI provider status');
    return res.json();
  }),

  // URL validation (global utility)
  validateUrl: async (url: string) => {
    try {
      const response = await fetch('/api/validate-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      return response.json();
    } catch (error) {
      return {
        valid: false,
        error: 'URL validation failed',
        message: error.message
      };
    }
  },
};

// ===============================
// SEO HELPER FUNCTIONS
// ===============================
export const seoHelpers = {
  getScoreCategory: (score: number): 'excellent' | 'good' | 'needs-improvement' | 'critical' => {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'needs-improvement';
    return 'critical';
  },

  getScoreColor: (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  },

  prioritizeIssues: (issues: any[]): any[] => {
    const priority = { critical: 3, warning: 2, info: 1 };
    return issues.sort((a, b) => (priority[b.type] || 0) - (priority[a.type] || 0));
  },

  calculateProgress: (current: number, previous: number): {
    change: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  } => {
    const change = current - previous;
    const percentage = previous > 0 ? (change / previous) * 100 : 0;
    
    return {
      change,
      percentage: Math.abs(percentage),
      trend: Math.abs(change) < 1 ? 'stable' : change > 0 ? 'up' : 'down'
    };
  },
};

// ===============================
// ISSUE TRACKING HELPERS
// ===============================
export const issueHelpers = {
  getIssueStatusBadge: (status: string) => {
    switch (status) {
      case 'detected':
        return { variant: 'destructive', icon: '🔍', text: 'Detected' };
      case 'reappeared':
        return { variant: 'destructive', icon: '🔄', text: 'Reappeared' };
      case 'fixing':
        return { variant: 'default', icon: '⚙️', text: 'Fixing...' };
      case 'fixed':
        return { variant: 'secondary', icon: '✅', text: 'Fixed' };
      case 'resolved':
        return { variant: 'secondary', icon: '✅', text: 'Resolved' };
      default:
        return { variant: 'outline', icon: '❓', text: status };
    }
  },

  getIssueTypeDisplayName: (issueType: string): string => {
    const displayNames: { [key: string]: string } = {
      'missing_alt_text': 'Missing Alt Text',
      'missing_meta_description': 'Meta Description',
      'poor_title_tag': 'Title Tag',
      'heading_structure': 'Heading Structure',
      'missing_h1': 'Missing H1',
      'missing_viewport_meta': 'Viewport Meta',
      'missing_schema': 'Schema Markup',
      'mobile_responsiveness': 'Mobile Responsive',
      'low_content_quality': 'Content Quality',
      'poor_readability': 'Readability',
      'low_eat_score': 'E-A-T Score',
      'keyword_optimization': 'Keyword Optimization',
      'missing_og_tags': 'Open Graph Tags',
      'other': 'Other'
    };
    
    return displayNames[issueType] || issueType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  },

  formatTimeAgo: (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  },

  // Determine if an issue is AI-fixable based on its type
  isAIFixable: (issueType: string): boolean => {
    const AI_FIXABLE_TYPES = [
      'missing_alt_text',
      'missing_meta_description', 
      'poor_title_tag',
      'heading_structure',
      'missing_h1'
    ];
    return AI_FIXABLE_TYPES.includes(issueType);
  },

  // Get fixable issues with their current status
  getFixableIssuesWithStatus: (reportIssues: any[], trackedIssues: any[]) => {
    const AI_FIXABLE_TITLES = [
      'missing page title',
      'title tag too long', 
      'title tag too short',
      'missing meta description',
      'meta description too long',
      'missing h1 tag',
      'multiple h1 tags', 
      'improper heading hierarchy',
      'images missing alt text'
    ];

    // Get issues that can be fixed by AI
    const fixableReportIssues = reportIssues.filter(issue => 
      AI_FIXABLE_TITLES.some(type => 
        issue.title.toLowerCase().includes(type.toLowerCase())
      )
    );

    // Merge with tracking status
    return fixableReportIssues.map(issue => {
      const trackingInfo = trackedIssues.find(tracked => 
        tracked.issueTitle.toLowerCase().includes(issue.title.toLowerCase().substring(0, 20))
      );

      return {
        ...issue,
        trackingStatus: trackingInfo?.status || 'detected',
        trackingInfo,
        lastSeen: trackingInfo?.lastSeenAt,
        fixedAt: trackingInfo?.fixedAt,
        fixMethod: trackingInfo?.fixMethod
      };
    });
  }
};

export default api;