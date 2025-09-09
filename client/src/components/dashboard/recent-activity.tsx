import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

const activityTypeColors = {
  content_published: "bg-green-500",
  content_generated: "bg-blue-500",
  content_scheduled: "bg-yellow-500",
  seo_analysis: "bg-blue-500",
  seo_issue: "bg-red-500",
  website_connected: "bg-purple-500",
  seo_autofix: "bg-green-500",
};

export default function RecentActivity() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["/api/activity-logs"],
    queryFn: () => api.getActivityLogs(),
  });

  const { data: websites } = useQuery({
    queryKey: ["/api/websites"],
    queryFn: api.getWebsites,
  });

  if (isLoading) {
    return (
      <div className="bg-white shadow-sm rounded-lg">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="text-gray-500">Loading activities...</div>
        </div>
      </div>
    );
  }

  const recentActivities = activities?.slice(0, 4) || [];

  const getWebsiteName = (websiteId: string) => {
    const website = websites?.find((w) => w.id === websiteId);
    return website?.name || "Unknown Website";
  };

  return (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="px-6 py-5 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
      </div>
      <div className="divide-y divide-gray-200">
        {recentActivities.map((activity) => {
          const colorClass =
            activityTypeColors[
              activity.type as keyof typeof activityTypeColors
            ] || "bg-gray-500";

          return (
            <div key={activity.id} className="px-6 py-4">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 ${colorClass} rounded-full`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500">
                    {activity.websiteId
                      ? getWebsiteName(activity.websiteId)
                      : "System"}{" "}
                    •{" "}
                    {formatDistanceToNow(new Date(activity.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-6 py-3 bg-gray-50">
        <a
          href="/activity-logs"
          className="text-sm font-medium text-primary-600 hover:text-primary-500"
        >
          View all activity →
        </a>
      </div>
    </div>
  );
}
