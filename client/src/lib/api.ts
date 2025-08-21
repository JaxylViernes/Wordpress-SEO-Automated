import { apiRequest } from "./queryClient";

export const api = {
  // Websites
  getWebsites: () => fetch("/api/websites").then(res => res.json()),
  getWebsite: (id: string) => fetch(`/api/websites/${id}`).then(res => res.json()),
  createWebsite: (data: any) => apiRequest("POST", "/api/websites", data),
  updateWebsite: (id: string, data: any) => apiRequest("PUT", `/api/websites/${id}`, data),
  deleteWebsite: (id: string) => apiRequest("DELETE", `/api/websites/${id}`),

  // Content
  getWebsiteContent: (websiteId: string) => fetch(`/api/websites/${websiteId}/content`).then(res => res.json()),
  generateContent: (data: any) => apiRequest("POST", "/api/content/generate", data),
  publishContent: (id: string) => apiRequest("POST", `/api/content/${id}/publish`),

  // SEO
  getSeoReports: (websiteId: string) => fetch(`/api/websites/${websiteId}/seo-reports`).then(res => res.json()),
  runSeoAnalysis: (websiteId: string) => apiRequest("POST", `/api/websites/${websiteId}/seo-analysis`),
  performAutoFix: (websiteId: string, issueType: string) => apiRequest("POST", `/api/websites/${websiteId}/seo-autofix`, { issueType }),

  // Dashboard
  getDashboardStats: () => fetch("/api/dashboard/stats").then(res => res.json()),
  getPerformanceData: () => fetch("/api/dashboard/performance").then(res => res.json()),

  // Activity Logs
  getActivityLogs: (websiteId?: string) => {
    const url = websiteId ? `/api/activity-logs?websiteId=${websiteId}` : "/api/activity-logs";
    return fetch(url).then(res => res.json());
  }
};
