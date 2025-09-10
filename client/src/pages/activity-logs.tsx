import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Filter, Download, Search, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { format, formatDistanceToNow } from "date-fns";

const activityTypeColors = {
  content_published: "bg-green-100 text-green-800",
  content_generated: "bg-blue-100 text-blue-800",
  content_scheduled: "bg-yellow-100 text-yellow-800",
  seo_analysis: "bg-purple-100 text-purple-800",
  seo_issue: "bg-red-100 text-red-800",
  website_connected: "bg-indigo-100 text-indigo-800",
  seo_autofix: "bg-green-100 text-green-800",
};

const activityTypeLabels = {
  content_published: "Content Published",
  content_generated: "Content Generated",
  content_scheduled: "Content Scheduled",
  seo_analysis: "SEO Analysis",
  seo_issue: "SEO Issue",
  website_connected: "Website Connected",
  seo_autofix: "SEO Auto-Fix",
};

const getActivityIcon = (type: string) => {
  const iconClass = "w-3 h-3";
  switch (type) {
    case "content_published":
    case "content_generated":
    case "content_scheduled":
      return <Activity className={iconClass} />;
    case "seo_analysis":
    case "seo_issue":
    case "seo_autofix":
      return <Search className={iconClass} />;
    case "website_connected":
      return <Calendar className={iconClass} />;
    default:
      return <Activity className={iconClass} />;
  }
};

// Function to format metadata keys into readable labels
const formatMetadataKey = (key: string): string => {
  return key
    .replace(/([A-Z])/g, " $1") // Add space before capital letters
    .replace(/[_-]/g, " ") // Replace underscores and hyphens with spaces
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Function to format metadata values for better readability
const formatMetadataValue = (value: any): React.ReactNode => {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic">None</span>;
  }

  if (typeof value === "boolean") {
    return (
      <Badge variant={value ? "default" : "secondary"} className="text-xs">
        {value ? "Yes" : "No"}
      </Badge>
    );
  }

  if (typeof value === "string") {
    // Check if it's a date string
    const dateMatch = value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    if (dateMatch) {
      try {
        const date = new Date(value);
        return format(date, "MMM dd, yyyy 'at' HH:mm");
      } catch {
        return value;
      }
    }

    // Check if it's a URL
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-all"
        >
          {value}
        </a>
      );
    }

    // Long text handling
    if (value.length > 100) {
      return (
        <div className="max-w-md">
          <p className="break-words">{value.substring(0, 100)}...</p>
          <details className="mt-1">
            <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
              Show full text
            </summary>
            <p className="mt-1 text-xs break-words">{value}</p>
          </details>
        </div>
      );
    }

    return <span className="break-words">{value}</span>;
  }

  if (typeof value === "number") {
    // Format large numbers with commas
    return value.toLocaleString();
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-gray-400 italic">Empty list</span>;
    }

    return (
      <div className="space-y-1">
        {value.slice(0, 3).map((item, index) => (
          <div
            key={index}
            className="text-xs bg-gray-100 rounded px-2 py-1 inline-block mr-1"
          >
            {typeof item === "object" ? JSON.stringify(item) : String(item)}
          </div>
        ))}
        {value.length > 3 && (
          <div className="text-xs text-gray-500">
            +{value.length - 3} more items
          </div>
        )}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return <span className="text-gray-400 italic">Empty</span>;
    }

    return (
      <div className="space-y-1">
        {entries.slice(0, 3).map(([key, val]) => (
          <div key={key} className="text-xs">
            <span className="font-medium">{formatMetadataKey(key)}:</span>{" "}
            <span>{String(val)}</span>
          </div>
        ))}
        {entries.length > 3 && (
          <div className="text-xs text-gray-500">
            +{entries.length - 3} more fields
          </div>
        )}
      </div>
    );
  }

  return <span>{String(value)}</span>;
};

// Component for rendering metadata in a user-friendly way
const MetadataDisplay = ({ metadata }: { metadata: Record<string, any> }) => {
  const entries = Object.entries(metadata);

  if (entries.length === 0) {
    return (
      <div className="text-xs text-gray-500 italic">
        No additional details available
      </div>
    );
  }

  return (
    <div className="mt-2 border rounded-lg bg-gray-50 p-3">
      <div className="grid gap-3">
        {entries.map(([key, value]) => (
          <div key={key} className="grid grid-cols-3 gap-2 items-start">
            <div className="text-xs font-medium text-gray-700 col-span-1">
              {formatMetadataKey(key)}:
            </div>
            <div className="text-xs text-gray-900 col-span-2">
              {formatMetadataValue(value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function ActivityLogs() {
  const [selectedWebsite, setSelectedWebsite] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activityFilter, setActivityFilter] = useState<string>("");

  const { data: websites } = useQuery({
    queryKey: ["/api/websites"],
    queryFn: api.getWebsites,
  });

  const { data: activities, isLoading } = useQuery({
    queryKey: ["/api/activity-logs", selectedWebsite],
    queryFn: () => api.getActivityLogs(selectedWebsite || undefined),
  });

  const getWebsiteName = (websiteId: string | null) => {
    if (!websiteId) return "System";
    if (!Array.isArray(websites)) return "Unknown Website";
    const website = websites.find((w) => w.id === websiteId);
    return website?.name || "Unknown Website";
  };

  // Updated logic
  const filteredActivities =
    activities?.filter((activity) => {
      if (
        searchQuery &&
        !activity.description.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      if (
        activityFilter &&
        activityFilter !== "all" &&
        activity.type !== activityFilter
      ) {
        return false;
      }
      return true;
    }) || [];

  const activityStats = {
    total: activities?.length || 0,
    today:
      activities?.filter((a) => {
        const today = new Date();
        const activityDate = new Date(a.createdAt);
        return activityDate.toDateString() === today.toDateString();
      }).length || 0,
    content: activities?.filter((a) => a.type.includes("content")).length || 0,
    seo: activities?.filter((a) => a.type.includes("seo")).length || 0,
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Page Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Activity Logs
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Complete history of all automation activities across your websites
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Button variant="outline" className="mr-2">
              <Filter className="w-4 h-4 mr-2" />
              Advanced Filters
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Logs
            </Button>
          </div>
        </div>

        {/* Activity Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {activityStats.total}
              </div>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {activityStats.today}
              </div>
              <p className="text-xs text-gray-500 mt-1">Activities today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Content Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {activityStats.content}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Generation & publishing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                SEO Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {activityStats.seo}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Analysis & optimization
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="All websites" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All websites</SelectItem>
              {Array.isArray(websites) &&
                websites.map((website) => (
                  <SelectItem key={website.id} value={website.id}>
                    {website.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Select value={activityFilter} onValueChange={setActivityFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All activities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All activities</SelectItem>
              {Object.entries(activityTypeLabels).map(([type, label]) => (
                <SelectItem key={type} value={type}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
            <CardDescription>
              Chronological view of all automation activities
              {selectedWebsite && ` for ${getWebsiteName(selectedWebsite)}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading activities...</div>
              </div>
            ) : filteredActivities.length > 0 ? (
              <div className="space-y-4">
                {filteredActivities.map((activity, index) => (
                  <div key={activity.id} className="relative">
                    {/* Timeline line */}
                    {index < filteredActivities.length - 1 && (
                      <div className="absolute left-4 top-8 w-0.5 h-8 bg-gray-200"></div>
                    )}

                    <div className="flex items-start space-x-4">
                      {/* Timeline dot */}
                      <div className="flex-shrink-0 w-8 h-8 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center">
                        {getActivityIcon(activity.type)}
                      </div>

                      {/* Activity content */}
                      <div className="flex-1 min-w-0 pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className="text-sm font-medium text-gray-900">
                                {activity.description}
                              </p>
                              <Badge
                                className={
                                  activityTypeColors[
                                    activity.type as keyof typeof activityTypeColors
                                  ] || "bg-gray-100 text-gray-800"
                                }
                              >
                                {activityTypeLabels[
                                  activity.type as keyof typeof activityTypeLabels
                                ] || activity.type}
                              </Badge>
                            </div>

                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>{getWebsiteName(activity.websiteId)}</span>
                              <span>
                                {format(
                                  new Date(activity.createdAt),
                                  "MMM dd, yyyy 'at' HH:mm"
                                )}
                              </span>
                              <span>
                                {formatDistanceToNow(
                                  new Date(activity.createdAt),
                                  { addSuffix: true }
                                )}
                              </span>
                            </div>

                            {/* Improved Metadata Display */}
                            {activity.metadata &&
                              Object.keys(activity.metadata).length > 0 && (
                                <div className="mt-3">
                                  <details className="cursor-pointer group">
                                    <summary className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                                      <span className="group-open:hidden">
                                        Show details
                                      </span>
                                      <span className="hidden group-open:inline">
                                        Hide details
                                      </span>
                                    </summary>
                                    <MetadataDisplay
                                      metadata={activity.metadata}
                                    />
                                  </details>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No activities found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchQuery || activityFilter
                    ? "No activities match your current filters."
                    : selectedWebsite
                    ? "No activities recorded for this website yet."
                    : "Activities will appear here as your automation runs."}
                </p>
                {(searchQuery || activityFilter) && (
                  <div className="mt-6">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("");
                        setActivityFilter("");
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Summary by Type */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Activity Summary</CardTitle>
            <CardDescription>Breakdown of activities by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(activityTypeLabels).map(([type, label]) => {
                const count =
                  activities?.filter((a) => a.type === type).length || 0;
                return (
                  <div key={type} className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {count}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{label}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
