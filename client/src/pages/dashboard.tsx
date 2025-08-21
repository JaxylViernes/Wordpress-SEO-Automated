import { useQuery } from "@tanstack/react-query";
import { Globe, Bot, Search, Calendar, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import StatsCard from "@/components/dashboard/stats-card";
import PerformanceChart from "@/components/dashboard/performance-chart";
import RecentActivity from "@/components/dashboard/recent-activity";
import WebsitesTable from "@/components/dashboard/websites-table";
import ContentQueue from "@/components/dashboard/content-queue";
import SEOIssues from "@/components/dashboard/seo-issues";
import ClientReports from "@/components/dashboard/client-reports";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: api.getDashboardStats,
  });

  return (
    <div className="py-4 sm:py-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-7 text-gray-900 truncate">
              Dashboard Overview
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Monitor your WordPress sites and AI-powered SEO optimization
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-4">
            <Button variant="outline" className="inline-flex items-center w-full sm:w-auto justify-center">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
          <StatsCard
            title="Active Websites"
            value={statsLoading ? "..." : stats?.activeWebsites || 0}
            icon={Globe}
            iconColor="bg-blue-500"
          />
          <StatsCard
            title="Content Generated"
            value={statsLoading ? "..." : stats?.contentGenerated || 0}
            icon={Bot}
            iconColor="bg-green-500"
          />
          <StatsCard
            title="Avg SEO Score"
            value={statsLoading ? "..." : stats?.avgSeoScore || 0}
            icon={Search}
            iconColor="bg-yellow-500"
            change="+5%"
            changeType="positive"
          />
          <StatsCard
            title="Scheduled Posts"
            value={statsLoading ? "..." : stats?.scheduledPosts || 0}
            icon={Calendar}
            iconColor="bg-purple-500"
          />
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Website Performance Chart */}
          <div className="lg:col-span-2">
            <PerformanceChart />
          </div>

          {/* Recent Activity */}
          <div>
            <RecentActivity />
          </div>
        </div>

        {/* Websites Table */}
        <div className="mb-8">
          <WebsitesTable />
        </div>

        {/* AI Content Generation Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ContentQueue />
          <SEOIssues />
        </div>

        {/* Client Reports Section */}
        <ClientReports />
      </div>
    </div>
  );
}
