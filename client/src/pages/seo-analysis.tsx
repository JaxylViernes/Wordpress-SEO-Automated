import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Play, AlertTriangle, CheckCircle, AlertCircle, TrendingUp, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

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

export default function SEOAnalysis() {
  const [selectedWebsite, setSelectedWebsite] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: websites } = useQuery({
    queryKey: ["/api/websites"],
    queryFn: api.getWebsites,
  });

  const { data: seoReports, isLoading } = useQuery({
    queryKey: ["/api/seo-reports", selectedWebsite],
    queryFn: () => selectedWebsite ? api.getSeoReports(selectedWebsite) : Promise.resolve([]),
    enabled: !!selectedWebsite,
  });

  const runAnalysis = useMutation({
    mutationFn: () => api.runSeoAnalysis(selectedWebsite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seo-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/websites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
      toast({
        title: "SEO Analysis Complete",
        description: "Your website has been analyzed and recommendations are ready.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to run SEO analysis. Please try again.",
        variant: "destructive",
      });
    },
  });

  const performAutoFix = useMutation({
    mutationFn: ({ issueType }: { issueType: string }) => api.performAutoFix(selectedWebsite, issueType),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/seo-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
      toast({
        title: data.success ? "Auto-Fix Applied" : "Auto-Fix Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: () => {
      toast({
        title: "Auto-Fix Failed",
        description: "Failed to apply auto-fix. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getWebsiteName = (websiteId: string) => {
    const website = websites?.find(w => w.id === websiteId);
    return website?.name || "Unknown Website";
  };

  const latestReport = seoReports?.[0];

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Page Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              SEO Analysis
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Comprehensive SEO analysis and automated optimization recommendations
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Button
              onClick={() => runAnalysis.mutate()}
              disabled={!selectedWebsite || runAnalysis.isPending}
              className="bg-primary-500 hover:bg-primary-600 text-white"
            >
              {runAnalysis.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              {runAnalysis.isPending ? "Analyzing..." : "Run Analysis"}
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
                  {website.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedWebsite && latestReport && (
          <>
            {/* SEO Score Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Overall SEO Score</CardTitle>
                  <CardDescription>
                    Analysis completed {formatDistanceToNow(new Date(latestReport.createdAt), { addSuffix: true })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <div className={`text-6xl font-bold ${getScoreColor(latestReport.score)}`}>
                      {latestReport.score}
                    </div>
                    <div className="flex-1">
                      <Progress 
                        value={latestReport.score} 
                        className="w-full h-4 mb-2"
                      />
                      <p className="text-sm text-gray-600">
                        {latestReport.score >= 80 ? "Excellent" :
                         latestReport.score >= 60 ? "Good" : "Needs Improvement"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Page Speed Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getScoreColor(latestReport.pageSpeedScore || 0)}`}>
                    {latestReport.pageSpeedScore || "N/A"}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Google PageSpeed Insights
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Issues and Recommendations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* SEO Issues */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
                    SEO Issues
                  </CardTitle>
                  <CardDescription>
                    Issues found that need attention
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {latestReport.issues && latestReport.issues.length > 0 ? (
                      (latestReport.issues as any[]).map((issue, index) => (
                        <div key={index} className={`p-4 rounded-lg border ${getIssueColor(issue.type)}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              {getIssueIcon(issue.type)}
                              <div className="flex-1">
                                <h4 className="font-medium">{issue.title}</h4>
                                <p className="text-sm mt-1 opacity-90">{issue.description}</p>
                                {issue.affectedPages > 0 && (
                                  <p className="text-xs mt-2 opacity-75">
                                    {issue.affectedPages} pages affected
                                  </p>
                                )}
                              </div>
                            </div>
                            {issue.autoFixAvailable && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => performAutoFix.mutate({ issueType: issue.title })}
                                disabled={performAutoFix.isPending}
                                className="ml-2"
                              >
                                {performAutoFix.isPending ? "Fixing..." : "Auto-Fix"}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No issues found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Your website is performing well!
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
                    Recommendations
                  </CardTitle>
                  <CardDescription>
                    Suggestions to improve your SEO
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {latestReport.recommendations && latestReport.recommendations.length > 0 ? (
                      (latestReport.recommendations as any[]).map((rec, index) => (
                        <div key={index} className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-medium text-gray-900">{rec.title}</h4>
                                <Badge className={getPriorityColor(rec.priority)}>
                                  {rec.priority}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                              <p className="text-xs text-green-600 font-medium">
                                Impact: {rec.impact}
                              </p>
                            </div>
                            <Button size="sm" variant="ghost">
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No recommendations</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Your SEO is optimized!
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Analysis History */}
            <Card>
              <CardHeader>
                <CardTitle>Analysis History</CardTitle>
                <CardDescription>
                  Previous SEO analysis results for {getWebsiteName(selectedWebsite)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="text-gray-500">Loading analysis history...</div>
                  </div>
                ) : seoReports && seoReports.length > 0 ? (
                  <div className="space-y-3">
                    {seoReports.map((report) => (
                      <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className={`text-2xl font-bold ${getScoreColor(report.score)}`}>
                            {report.score}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              SEO Score: {report.score}/100
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {report.pageSpeedScore && (
                            <Badge variant="outline">
                              Speed: {report.pageSpeedScore}
                            </Badge>
                          )}
                          <Badge variant="outline">
                            Issues: {(report.issues as any[])?.length || 0}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Search className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No analysis history</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Run your first SEO analysis to see results here.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!selectedWebsite && (
          <Card>
            <CardContent className="text-center py-12">
              <Search className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Select a website</h3>
              <p className="mt-1 text-sm text-gray-500">
                Choose a website to run SEO analysis and view recommendations.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
