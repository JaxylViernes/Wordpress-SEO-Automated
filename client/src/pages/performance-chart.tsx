import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Loader2, Search } from "lucide-react";

interface PerformanceChartProps {
  stats?: any;
  isLoading?: boolean;
}

// Color palette for multiple lines
const LINE_COLORS = [
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#84cc16", // lime-500
];

// Helper function to format dates
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
};

// Helper to get date key for grouping (YYYY-MM-DD format)
const getDateKey = (input: string | number | Date) => {
  const d =
    typeof input === "number" && input < 1e12 ? new Date(input * 1000) : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};


export default function PerformanceChart({ stats, isLoading }: PerformanceChartProps) {
  // Fetch SEO reports data directly from seo_reports table
  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ["seo-reports-chart-data"],
    queryFn: async () => {
      const websites = await api.getWebsites();
      console.log("=== CHART DEBUG START ===");
      console.log("Fetched websites:", websites);
      
      // Create a map to store all data points by date
      const allDataPoints = new Map<string, any>();
      const websiteInfo = [];
      let totalReports = 0;
      
      // Fetch reports for each website
      for (let i = 0; i < websites.length; i++) {
        const website = websites[i];
        
        try {
          // Get SEO reports from the seo_reports table
          const reports = await api.getSeoReports(website.id);
          console.log(`Reports for ${website.name}:`, reports);
          
          if (reports && reports.length > 0) {
            totalReports += reports.length;
            
            // Sort reports by timestamp DESCENDING (newest first)
            const sortedReports = [...reports].sort((a, b) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            
            // Get the absolute latest score for display
            const latestReport = sortedReports[0];
            
            // CRITICAL FIX: Handle different score field names and formats
            let latestScore = 0;
            
            // Check multiple possible field names for the score
            if (latestReport?.score !== undefined) {
              latestScore = parseFloat(latestReport.score) || 0;
            } else if (latestReport?.overallScore !== undefined) {
              latestScore = parseFloat(latestReport.overallScore) || 0;
            } else if (latestReport?.seoScore !== undefined) {
              latestScore = parseFloat(latestReport.seoScore) || 0;
            }
            
            console.log(`Latest score for ${website.name}: ${latestScore}`);
            console.log(`Full report object:`, latestReport);
            
            // Store website info
            websiteInfo.push({
              id: website.id,
              name: website.name,
              color: LINE_COLORS[i % LINE_COLORS.length],
              latestScore: latestScore,
              reportCount: reports.length
            });
            
            // Group by date, keeping only the LATEST report for each date
            const latestReportPerDate = new Map<string, any>();
            
            sortedReports.forEach((report: any) => {
              const dateKey = getDateKey(report.createdAt);
              
              // Only add if we haven't seen this date yet (we're iterating newest first)
              if (!latestReportPerDate.has(dateKey)) {
                latestReportPerDate.set(dateKey, report);
                console.log(`Using for ${dateKey}: Score=${report.score}`);
              }
            });
            
            // Process reports and add to chart data
            latestReportPerDate.forEach((report, dateKey) => {
              // CRITICAL FIX: Parse score properly
              let actualScore = 0;
              
              // Handle different possible score formats
              if (typeof report.score === 'string') {
                // If it's a string like "81/100", extract the number
                if (report.score.includes('/')) {
                  actualScore = parseFloat(report.score.split('/')[0]) || 0;
                } else {
                  actualScore = parseFloat(report.score) || 0;
                }
              } else if (typeof report.score === 'number') {
                actualScore = report.score;
              } else if (report.overallScore !== undefined) {
                // Sometimes it might be stored as overallScore
                actualScore = parseFloat(report.overallScore) || 0;
              }
              
              const displayDate = formatDate(report.createdAt);
              
              console.log(`Processing ${website.name} for ${dateKey}: score=${actualScore} (original=${report.score})`);
              
              // Initialize date point if it doesn't exist
              if (!allDataPoints.has(dateKey)) {
                allDataPoints.set(dateKey, {
                  date: displayDate,
                  dateKey: dateKey,
                  timestamp: new Date(dateKey).getTime()
                });
              }
              
              const dataPoint = allDataPoints.get(dateKey);
              
              // Set this website's score for this date (ensure it's a number)
              dataPoint[website.name] = actualScore;
              
              // Store metadata for tooltips
              if (!dataPoint.metadata) {
                dataPoint.metadata = {};
              }
              dataPoint.metadata[website.name] = {
                score: actualScore,
                pageSpeedScore: report.pageSpeedScore,
                issuesCount: report.fixableIssuesCount || 0,
                criticalIssues: report.criticalIssuesCount || 0,
                reportId: report.id,
                createdAt: report.createdAt
              };
            });
            
          } else {
            // Website has no reports
            websiteInfo.push({
              id: website.id,
              name: website.name,
              color: LINE_COLORS[i % LINE_COLORS.length],
              latestScore: 0,
              reportCount: 0
            });
          }
        } catch (error) {
          console.error(`Error fetching reports for ${website.name}:`, error);
          websiteInfo.push({
            id: website.id,
            name: website.name,
            color: LINE_COLORS[i % LINE_COLORS.length],
            latestScore: 0,
            reportCount: 0,
            error: true
          });
        }
      }
      
      // Convert map to sorted array
      const chartPoints = Array.from(allDataPoints.values())
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(point => {
          // Remove internal fields
          const { timestamp, dateKey, ...chartPoint } = point;
          return chartPoint;
        });
      
      // Limit to last 30 data points for readability
      const recentPoints = chartPoints.slice(-30);
      
      // CRITICAL DEBUG: Log the actual data being sent to the chart
      console.log("=== CRITICAL DEBUG ===");
      console.log("Chart points before rendering:", recentPoints);
      if (recentPoints.length > 0) {
        const lastPoint = recentPoints[recentPoints.length - 1];
        console.log("Last data point details:");
        console.log("  Date:", lastPoint.date);
        Object.keys(lastPoint).forEach(key => {
          if (key !== 'date' && key !== 'metadata') {
            console.log(`  ${key}: ${lastPoint[key]}`);
          }
        });
      }
      console.log("Website info with scores:", websiteInfo.map(w => ({
        name: w.name,
        latestScore: w.latestScore,
        reportCount: w.reportCount
      })));
      console.log("=== END CRITICAL DEBUG ===");
      
      // Debug final data
      console.log("Final chart data:", recentPoints);
      console.log("Website info:", websiteInfo);
      console.log("=== CHART DEBUG END ===");
      
      return {
        data: recentPoints,
        websites: websiteInfo,
        hasData: recentPoints.length > 0,
        totalReports
      };
    },
    enabled: !isLoading,
    refetchInterval: 30000, // Refetch every 30 seconds to get latest data
    staleTime: 0, // Consider data immediately stale
    cacheTime: 0, // Don't cache the data
  });

  const loading = isLoading || chartLoading;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SEO Performance Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[350px]">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Custom tooltip component with metadata
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const metadata = payload[0]?.payload?.metadata;
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-sm mb-2">{label}</p>
          {payload.map((entry: any) => {
            const siteMetadata = metadata?.[entry.name];
            return (
              <div key={entry.name} className="mb-2 pb-2 border-b last:border-0">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="font-medium text-sm">{entry.name}</span>
                </div>
                <div className="ml-5 mt-1 space-y-0.5">
                  <div className="text-sm">
                    <span className="text-gray-600">SEO Score:</span>
                    <span className="font-bold ml-1">{entry.value?.toFixed(1)}</span>
                  </div>
                  {siteMetadata && (
                    <>
                      {siteMetadata.pageSpeedScore && (
                        <div className="text-xs text-gray-600">
                          Page Speed: {siteMetadata.pageSpeedScore}
                        </div>
                      )}
                      {siteMetadata.criticalIssues > 0 && (
                        <div className="text-xs text-red-600">
                          Critical Issues: {siteMetadata.criticalIssues}
                        </div>
                      )}
                      {siteMetadata.issuesCount > 0 && (
                        <div className="text-xs text-yellow-600">
                          Fixable Issues: {siteMetadata.issuesCount}
                        </div>
                      )}
                      {siteMetadata.createdAt && (
                        <div className="text-xs text-gray-500">
                          Report time: {new Date(siteMetadata.createdAt).toLocaleTimeString()}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO Performance Trend</CardTitle>
        {chartData?.websites && chartData.websites.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-3 text-sm">
              {chartData.websites
                .filter((site: any) => site.reportCount > 0)
                .map((site: any) => (
                  <div key={site.id} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: site.color }}
                    />
                    <span className="text-gray-600">{site.name}</span>
                    <span className="font-semibold text-gray-900">
                      {site.latestScore?.toFixed(1) || "0.0"}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({site.reportCount} reports)
                    </span>
                  </div>
              ))}
            </div>
            {chartData.websites.some((site: any) => site.reportCount === 0) && (
              <div className="text-xs text-amber-600">
                ⚠️ Some websites have no SEO reports yet
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {chartData?.hasData ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart 
              data={chartData.data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickMargin={8}
              />
              <YAxis 
                domain={[0, 100]}
                ticks={[0, 20, 40, 60, 80, 100]}
                tick={{ fontSize: 12 }}
                tickMargin={8}
                label={{ 
                  value: 'SEO Score', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fontSize: 12, fill: '#666' }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Render a line for each website that has reports */}
              {chartData.websites
                .filter((site: any) => site.reportCount > 0)
                .map((site: any) => (
                  <Line
                    key={site.id}
                    type="monotone"
                    dataKey={site.name}
                    stroke={site.color}
                    strokeWidth={2}
                    dot={{ r: 4, fill: site.color }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[350px] flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="mb-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No SEO Reports Found
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {chartData?.totalReports === 0 
                    ? "You haven't run any SEO analyses yet."
                    : "Unable to load SEO report data."}
                </p>
              </div>
              
              {chartData?.websites && chartData.websites.length > 0 ? (
                <div className="bg-blue-50 rounded-lg p-4 text-left">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    Your Websites:
                  </p>
                  <div className="space-y-1">
                    {chartData.websites.map((site: any) => (
                      <div key={site.id} className="text-sm text-blue-800 flex items-center justify-between">
                        <span>• {site.name}</span>
                        <span className="text-xs text-blue-600">
                          {site.error ? "Error loading" : "Ready for analysis"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-xs text-blue-700">
                      To start tracking SEO performance:
                    </p>
                    <ol className="text-xs text-blue-600 mt-1 space-y-0.5">
                      <li>1. Go to a website's detail page</li>
                      <li>2. Click "Run SEO Analysis"</li>
                      <li>3. Reports will appear here automatically</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    Add a website to start tracking SEO performance
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
