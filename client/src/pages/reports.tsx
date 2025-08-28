import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, TrendingUp, TrendingDown, Calendar, FileText, BarChart3, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { format, subMonths, subWeeks } from "date-fns";

// Mock report data
const getClientReports = () => [
  {
    id: "1",
    websiteId: "1",
    websiteName: "TechBlog.com",
    reportType: "monthly",
    period: "November 2024",
    generatedAt: subMonths(new Date(), 0),
    data: {
      seoScoreChange: 8,
      contentPublished: 12,
      trafficChange: 24,
      keywordRankings: 45,
      backlinks: 23,
      pageViews: 15420,
      organicTraffic: 8960,
      conversionRate: 3.2,
    },
  },
  {
    id: "2",
    websiteId: "2",
    websiteName: "E-Commerce.store",
    reportType: "weekly",
    period: "Week 46, 2024",
    generatedAt: subWeeks(new Date(), 1),
    data: {
      seoScoreChange: 2,
      contentPublished: 3,
      trafficChange: 15,
      keywordRankings: 32,
      backlinks: 8,
      pageViews: 8750,
      organicTraffic: 5200,
      conversionRate: 4.8,
    },
  },
  {
    id: "3",
    websiteId: "3",
    websiteName: "RestaurantSite.com",
    reportType: "monthly",
    period: "November 2024",
    generatedAt: subMonths(new Date(), 0),
    data: {
      seoScoreChange: -3,
      contentPublished: 6,
      trafficChange: 0,
      keywordRankings: 18,
      backlinks: 12,
      pageViews: 3420,
      organicTraffic: 2100,
      conversionRate: 2.1,
    },
  },
];

const getTrendIcon = (change: number) => {
  if (change > 0) return <TrendingUp className="w-3 h-3" />;
  if (change < 0) return <TrendingDown className="w-3 h-3" />;
  return <Minus className="w-3 h-3" />;
};

const getTrendColor = (change: number) => {
  if (change > 0) return "text-green-600";
  if (change < 0) return "text-red-600";
  return "text-gray-600";
};

const formatNumber = (num: number) => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }
  return num.toString();
};

export default function Reports() {
  const [selectedWebsite, setSelectedWebsite] = useState<string>("");
  const [reportType, setReportType] = useState<string>("all");

  const { data: websites } = useQuery({
    queryKey: ["/api/websites"],
    queryFn: api.getWebsites,
  });

  // Mock data for reports
  const allReports = getClientReports();
  
// Updated logic
const filteredReports = allReports.filter(report => {
  if (selectedWebsite && selectedWebsite !== "all" && report.websiteId !== selectedWebsite) return false;
  if (reportType !== "all" && report.reportType !== reportType) return false;
  return true;
});

  const getWebsiteName = (websiteId: string) => {
    const website = websites?.find(w => w.id === websiteId);
    return website?.name || "Unknown Website";
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Page Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Client Reports
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Comprehensive SEO and content performance reports for your clients
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Button className="bg-primary-500 hover:bg-primary-600 text-white">
              <Download className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="All websites" />
            </SelectTrigger>
            <SelectContent>
  <SelectItem value="all">All websites</SelectItem>  {/* Changed from "" to "all" */}
  {websites?.map((website) => (
    <SelectItem key={website.id} value={website.id}>
      {website.name}
    </SelectItem>
  ))}
</SelectContent>
          </Select>

          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All report types</SelectItem>
              <SelectItem value="weekly">Weekly reports</SelectItem>
              <SelectItem value="monthly">Monthly reports</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reports Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{filteredReports.length}</div>
              <p className="text-xs text-gray-500 mt-1">Generated reports</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Monthly Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {filteredReports.filter(r => r.reportType === "monthly").length}
              </div>
              <p className="text-xs text-gray-500 mt-1">Comprehensive analysis</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Weekly Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {filteredReports.filter(r => r.reportType === "weekly").length}
              </div>
              <p className="text-xs text-gray-500 mt-1">Quick updates</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(
                  filteredReports.reduce((sum, r) => sum + r.data.seoScoreChange, 0) / 
                  Math.max(filteredReports.length, 1)
                )}%
              </div>
              <p className="text-xs text-gray-500 mt-1">SEO improvement</p>
            </CardContent>
          </Card>
        </div>

        {/* Reports List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{report.websiteName}</CardTitle>
                  <Badge variant={report.reportType === "monthly" ? "default" : "secondary"}>
                    {report.reportType}
                  </Badge>
                </div>
                <CardDescription>{report.period}</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-3 mt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">SEO Score</span>
                      <span className={`font-medium flex items-center ${getTrendColor(report.data.seoScoreChange)}`}>
                        {getTrendIcon(report.data.seoScoreChange)}
                        <span className="ml-1">
                          {report.data.seoScoreChange > 0 ? '+' : ''}{report.data.seoScoreChange}%
                        </span>
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Content Published</span>
                      <span className="font-medium">{report.data.contentPublished} posts</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Traffic Change</span>
                      <span className={`font-medium flex items-center ${getTrendColor(report.data.trafficChange)}`}>
                        {report.data.trafficChange !== 0 && getTrendIcon(report.data.trafficChange)}
                        <span className="ml-1">
                          {report.data.trafficChange > 0 ? '+' : ''}
                          {report.data.trafficChange === 0 ? 'Stable' : `${report.data.trafficChange}%`}
                        </span>
                      </span>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="details" className="space-y-3 mt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Page Views</span>
                      <span className="font-medium">{formatNumber(report.data.pageViews)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Organic Traffic</span>
                      <span className="font-medium">{formatNumber(report.data.organicTraffic)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Keywords Ranking</span>
                      <span className="font-medium">{report.data.keywordRankings}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">New Backlinks</span>
                      <span className="font-medium">{report.data.backlinks}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Conversion Rate</span>
                      <span className="font-medium">{report.data.conversionRate}%</span>
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-xs text-gray-500">
                    Generated {format(report.generatedAt, "MMM dd, yyyy")}
                  </span>
                  <Button size="sm" variant="outline" className="text-primary-600">
                    <Download className="w-3 h-3 mr-1" />
                    PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredReports.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No reports found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {selectedWebsite || reportType !== "all"
                  ? "No reports match your current filters."
                  : "Reports will appear here once they are generated."
                }
              </p>
              <div className="mt-6">
                <Button className="bg-primary-500 hover:bg-primary-600">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Report Generation Settings */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Automated Report Settings</CardTitle>
            <CardDescription>
              Configure automatic report generation schedules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {websites?.map((website) => (
                <div key={website.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{website.name}</h4>
                    <p className="text-sm text-gray-500">
                      Weekly reports on Mondays, Monthly reports on 1st of each month
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                    <Button size="sm" variant="outline">
                      Configure
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
