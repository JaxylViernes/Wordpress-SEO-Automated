// client/src/pages/dashboard.tsx
import { useQuery } from "@tanstack/react-query";
import { Globe, Bot, Search, Calendar, TrendingUp, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/pages/authentication";
import StatsCard from "@/components/dashboard/stats-card";
import PerformanceChart from "@/components/dashboard/performance-chart";
import RecentActivity from "@/components/dashboard/recent-activity";
import WebsitesTable from "@/components/dashboard/websites-table";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Helper function to calculate percentage change
const calculatePercentageChange = (
  current: number,
  previous: number
): { percentage: string; type: "positive" | "negative" | "neutral" } => {
  // Handle edge cases
  if (previous === undefined || previous === null || previous === 0 || isNaN(previous)) {
    if (current > 0) {
      return { percentage: "First Report", type: "neutral" };
    }
    return { percentage: "N/A", type: "neutral" };
  }

  if (current === undefined || current === null || isNaN(current)) {
    return { percentage: "N/A", type: "neutral" };
  }

  const change = ((current - previous) / previous) * 100;
  
  if (isNaN(change)) {
    return { percentage: "N/A", type: "neutral" };
  }

  const roundedChange = Math.round(change * 10) / 10;

  if (roundedChange > 0) {
    return { percentage: `+${roundedChange}%`, type: "positive" };
  } else if (roundedChange < 0) {
    return { percentage: `${roundedChange}%`, type: "negative" };
  } else {
    return { percentage: "0%", type: "neutral" };
  }
};

// Helper function to format SEO score display
const formatSeoScore = (score: number): string => {
  if (!score && score !== 0) return "0%";
  // Handle if score is a decimal (0-1) vs percentage (0-100)
  const percentage = score <= 1 ? score * 100 : score;
  return `${Math.round(percentage * 10) / 10}%`;
};

export default function Dashboard() {
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedWebsite, setSelectedWebsite] = useState<string | null>(null);

  // Fetch list of websites
  const { data: websites, isLoading: websitesLoading } = useQuery({
    queryKey: ["websites-list"],
    queryFn: api.getWebsites,
    enabled: isAuthenticated,
    staleTime: 5000,
  });

  // Set default website when websites load
  useEffect(() => {
    if (websites && websites.length > 0 && !selectedWebsite) {
      setSelectedWebsite("all");
    }
  }, [websites, selectedWebsite]);

  // Fetch stats based on selected website
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["dashboard-stats", selectedWebsite],
    queryFn: async () => {
      if (selectedWebsite === "all" || !selectedWebsite) {
        return api.getDashboardStats();
      }
      return api.getDashboardStats(selectedWebsite);
    },
    enabled: isAuthenticated && !!selectedWebsite,
    retry: 1,
    staleTime: 5000,
    refetchOnWindowFocus: false,
  });

  // IMPORTANT: Fetch performance data separately
  const { data: performanceData, isLoading: performanceLoading } = useQuery({
    queryKey: ["dashboard-performance", selectedWebsite],
    queryFn: () => api.getPerformanceData(),
    enabled: isAuthenticated,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Calculate SEO score percentage change
  const seoScoreChange = calculatePercentageChange(
    stats?.avgSeoScore || 0,
    stats?.previousAvgSeoScore || 0
  );

  // Debug logging for change calculation
  useEffect(() => {
    if (stats) {
      console.log('Stats for change calculation:', {
        current: stats.avgSeoScore,
        previous: stats.previousAvgSeoScore,
        change: seoScoreChange
      });
    }
  }, [stats, seoScoreChange]);

  // Add debug logging
  useEffect(() => {
    if (statsError) {
      console.error('Stats query error:', statsError);
    }
  }, [statsError]);

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please log in</div>;

  const selectedWebsiteName = selectedWebsite === "all" 
    ? "All Websites" 
    : websites?.find(w => w.id === selectedWebsite)?.name || "Select Website";

  return (
    <div className="py-4 sm:py-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-7 text-gray-900 truncate">
              Dashboard Overview
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Monitor your WordPress sites and AI-powered SEO optimization
            </p>
          </div>
          {/* Website Selector */}
          {websites && websites.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="mt-4 sm:mt-0">
                  <Globe className="h-4 w-4 mr-2" />
                  {selectedWebsiteName}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Select Website</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedWebsite("all")}>
                  <Globe className="h-4 w-4 mr-2" />
                  All Websites
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {websites.map((website: any) => (
                  <DropdownMenuItem
                    key={website.id}
                    onClick={() => setSelectedWebsite(website.id)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{website.name}</span>
                      {website.url && (
                        <span className="text-xs text-gray-500 ml-2 truncate">
                          {new URL(website.url).hostname}
                        </span>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
          <StatsCard
            title={selectedWebsite === "all" ? "Active Websites" : "Website Reports"}
            value={
              statsLoading ? "..." : 
              selectedWebsite === "all" 
                ? (stats?.websiteCount || 0) 
                : (stats?.reportCount !== undefined ? stats.reportCount : 0)
            }
            icon={Globe}
            iconColor="bg-blue-500"
          />
          <StatsCard
            title="Content Generated"
            value={statsLoading ? "..." : (stats?.contentCount !== undefined ? stats.contentCount : 0)}
            icon={Bot}
            iconColor="bg-green-500"
          />
          <StatsCard
            title="Current Seo Score"
            value={
              statsLoading ? "..." : 
              stats?.avgSeoScore !== undefined && stats.avgSeoScore > 0
                ? formatSeoScore(stats.avgSeoScore)
                : "0%"
            }
            icon={Search}
            iconColor="bg-yellow-500"
            change={
              statsLoading 
                ? "..." 
                : stats?.previousAvgSeoScore !== null && stats?.previousAvgSeoScore !== undefined
                  ? seoScoreChange.percentage 
                  : stats?.avgSeoScore > 0 
                    ? "First Report"
                    : ""
            }
            changeType={seoScoreChange.type}
          />
          <StatsCard
            title="Scheduled Posts"
            value={statsLoading ? "..." : (stats?.scheduledPosts !== undefined ? stats.scheduledPosts : 0)}
            icon={Calendar}
            iconColor="bg-purple-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <PerformanceChart 
              performanceData={performanceData}
              isLoading={performanceLoading}
              selectedWebsite={selectedWebsite}
            />
          </div>
          <div>
            <RecentActivity />
          </div>
        </div>

        <div className="mb-8">
          <WebsitesTable />
        </div>
      </div>
    </div>
  );
}