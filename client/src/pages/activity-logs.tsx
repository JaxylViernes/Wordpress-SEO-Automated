import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Filter,
  Download,
  Search,
  Calendar,
  Trash2,
  CheckSquare,
  X,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { api } from "@/lib/api";

// Date formatting utilities
const format = (date, formatStr) => {
  const d = new Date(date);
  if (formatStr === "MMM dd, yyyy 'at' HH:mm") {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${month} ${day}, ${year} at ${hours}:${minutes}`;
  }
  if (formatStr === "yyyy-MM-dd HH:mm") {
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
  return d.toISOString();
};

const formatDistanceToNow = (date, options) => {
  const now = new Date();
  const d = new Date(date);
  const diff = now - d;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let result;
  if (days > 0) {
    result = `${days} day${days > 1 ? "s" : ""}`;
  } else if (hours > 0) {
    result = `${hours} hour${hours > 1 ? "s" : ""}`;
  } else if (minutes > 0) {
    result = `${minutes} minute${minutes > 1 ? "s" : ""}`;
  } else {
    result = `${seconds} second${seconds > 1 ? "s" : ""}`;
  }

  return options?.addSuffix ? `${result} ago` : result;
};

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

const getActivityIcon = (type) => {
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

const formatMetadataKey = (key) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

const formatMetadataValue = (value) => {
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
    const dateMatch = value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    if (dateMatch) {
      try {
        const date = new Date(value);
        return format(date, "MMM dd, yyyy 'at' HH:mm");
      } catch {
        return value;
      }
    }
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
  if (typeof value === "number") return value.toLocaleString();
  if (Array.isArray(value)) {
    if (value.length === 0)
      return <span className="text-gray-400 italic">Empty list</span>;
    return (
      <div className="space-y-1">
        {value.slice(0, 3).map((item, i) => (
          <div
            key={i}
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
    if (entries.length === 0)
      return <span className="text-gray-400 italic">Empty</span>;
    return (
      <div className="space-y-1">
        {entries.slice(0, 3).map(([k, v]) => (
          <div key={k} className="text-xs">
            <span className="font-medium">{formatMetadataKey(k)}:</span>{" "}
            <span>{String(v)}</span>
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

const MetadataDisplay = ({ metadata }) => {
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
  const [selectedWebsite, setSelectedWebsite] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");
  const [selectedLogs, setSelectedLogs] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [notification, setNotification] = useState(null);

  const queryClient = useQueryClient();

  const { data: websites } = useQuery({
    queryKey: ["/api/websites"],
    queryFn: api.getWebsites,
  });

  const websiteParam = selectedWebsite === "all" ? undefined : selectedWebsite;

  const { data: activities, isLoading } = useQuery({
    queryKey: ["/api/activity-logs", websiteParam],
    queryFn: () => api.getActivityLogs(websiteParam),
  });

  // Delete single log mutation
  const deleteLogMutation = useMutation({
    mutationFn: (logId) => api.deleteActivityLog(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
      showNotification("Activity log deleted successfully", "success");
    },
    onError: (error) => {
      showNotification("Failed to delete activity log", "error");
      console.error("Delete error:", error);
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (logIds) => api.bulkDeleteActivityLogs(logIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
      setSelectedLogs(new Set());
      setIsSelectionMode(false);
      showNotification(
        `${
          data.deletedCount || logIds.length
        } activity logs deleted successfully`,
        "success"
      );
    },
    onError: (error) => {
      showNotification("Failed to delete selected logs", "error");
      console.error("Bulk delete error:", error);
    },
  });

  // Clear all mutation
  const clearAllMutation = useMutation({
    mutationFn: () => api.clearAllActivityLogs(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
      showNotification("All activity logs cleared successfully", "success");
    },
    onError: (error) => {
      showNotification("Failed to clear all logs", "error");
      console.error("Clear all error:", error);
    },
  });

  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const getWebsiteName = (websiteId) => {
    if (websiteId === "all") return "All websites";
    if (!websiteId) return "System";
    if (!Array.isArray(websites)) return "Unknown Website";
    const website = websites.find((w) => w.id === websiteId);
    return website?.name || "Unknown Website";
  };

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

  const handleSelectLog = (logId, checked) => {
    setSelectedLogs((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(logId);
      } else {
        newSet.delete(logId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedLogs.size === filteredActivities.length) {
      setSelectedLogs(new Set());
    } else {
      setSelectedLogs(new Set(filteredActivities.map((a) => a.id)));
    }
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedLogs(new Set());
  };

  const handleDeleteLog = (logId) => {
    deleteLogMutation.mutate(logId);
  };

  const handleBulkDelete = () => {
    const logIds = Array.from(selectedLogs);
    bulkDeleteMutation.mutate(logIds);
  };

  const handleClearAllLogs = () => {
    clearAllMutation.mutate();
  };

  const handleExportLogsPDF = async () => {
    if (!activities || activities.length === 0) return;

    const [{ default: jsPDF }, autoTableMod] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const autoTable = autoTableMod.default;
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const scopeAll = selectedWebsite === "all";
    const scopeName = scopeAll
      ? "All websites"
      : getWebsiteName(selectedWebsite);
    const fileScope = scopeAll
      ? "all-websites"
      : (scopeName || "website").toLowerCase().replace(/[^a-z0-9]+/g, "-");

    // Header
    doc.setFontSize(16);
    doc.text("Activity Logs", 40, 40);
    doc.setFontSize(10);
    doc.text(`Scope: ${scopeAll ? "All websites" : scopeName}`, 40, 58);
    doc.text(`Exported: ${format(new Date(), "yyyy-MM-dd HH:mm")}`, 40, 72);
    doc.text(`Total Activities: ${activities.length}`, 40, 86);

    // Table
    const head = [["Time", "Website", "Type", "Description"]];
    const body = activities.map((a) => [
      format(new Date(a.createdAt), "yyyy-MM-dd HH:mm"),
      getWebsiteName(a.websiteId),
      activityTypeLabels[a.type] ?? a.type,
      a.description || "",
    ]);

    autoTable(doc, {
      startY: 100,
      head,
      body,
      styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: [240, 240, 240] },
      columnStyles: {
        0: { cellWidth: 110 },
        1: { cellWidth: 150 },
        2: { cellWidth: 110 },
        3: { cellWidth: "auto" },
      },
      didDrawPage: (data) => {
        const pageSize = doc.internal.pageSize;
        const pageWidth = pageSize.getWidth();
        const pageHeight = pageSize.getHeight();
        const pageNumber = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(`Page ${pageNumber}`, pageWidth - 60, pageHeight - 20);
      },
    });

    // Summary by type
    const byType = {};
    activities.forEach((a) => {
      byType[a.type] = (byType[a.type] || 0) + 1;
    });
    const summaryRows = Object.keys(byType)
      .sort()
      .map((t) => [activityTypeLabels[t] ?? t, byType[t]]);

    const afterTableY = doc.lastAutoTable?.finalY ?? 100;
    const room = doc.internal.pageSize.getHeight() - afterTableY;

    const drawSummary = (startY) => {
      doc.setFontSize(12);
      doc.text("Summary by Type", 40, startY);
      autoTable(doc, {
        startY: startY + 8,
        head: [["Type", "Count"]],
        body: summaryRows,
        styles: { fontSize: 9 },
        theme: "grid",
        headStyles: { fillColor: [240, 240, 240] },
        columnStyles: { 0: { cellWidth: 260 }, 1: { cellWidth: 100 } },
      });
    };

    if (summaryRows.length > 0) {
      if (room > 120) {
        drawSummary(afterTableY + 24);
      } else {
        doc.addPage();
        drawSummary(40);
      }
    }

    doc.save(
      `activity-logs-${fileScope}-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.pdf`
    );
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
          <div className="mt-4 flex gap-2 md:mt-0 md:ml-4">
            {isSelectionMode ? (
              <>
                <Button variant="outline" onClick={handleCancelSelection}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      disabled={
                        selectedLogs.size === 0 || bulkDeleteMutation.isPending
                      }
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {bulkDeleteMutation.isPending
                        ? "Deleting..."
                        : `Delete Selected (${selectedLogs.size})`}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Delete {selectedLogs.size} Activity Logs?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. The selected activity logs
                        will be permanently deleted from the history.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleBulkDelete}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete Logs
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsSelectionMode(true)}
                  disabled={filteredActivities.length === 0}
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Select
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      disabled={
                        !activities ||
                        activities.length === 0 ||
                        clearAllMutation.isPending
                      }
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {clearAllMutation.isPending ? "Clearing..." : "Clear All"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Clear All Activity Logs?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete ALL activity logs across
                        all websites. This action cannot be undone and will
                        remove your complete activity history.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleClearAllLogs}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Clear All Logs
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Advanced Filters
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportLogsPDF}
                  disabled={!activities || activities.length === 0}
                  title={
                    !activities || activities.length === 0
                      ? "No logs to export yet"
                      : "Download logs as PDF"
                  }
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <Alert
            className={`mb-4 ${
              notification.type === "success"
                ? "border-green-200"
                : notification.type === "error"
                ? "border-red-200"
                : "border-blue-200"
            }`}
          >
            {notification.type === "success" && (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
            {notification.type === "error" && (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription
              className={
                notification.type === "success"
                  ? "text-green-800"
                  : notification.type === "error"
                  ? "text-red-800"
                  : "text-blue-800"
              }
            >
              {notification.message}
            </AlertDescription>
          </Alert>
        )}

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
          {isSelectionMode && (
            <Button
              variant="outline"
              onClick={handleSelectAll}
              className="w-fit"
            >
              {selectedLogs.size === filteredActivities.length
                ? "Deselect All"
                : "Select All"}
            </Button>
          )}
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
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle>Activity Timeline</CardTitle>
            <CardDescription>
              Chronological view of all automation activities
              {selectedWebsite !== "all" &&
                ` for ${getWebsiteName(selectedWebsite)}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden">
            <div className="h-full overflow-y-auto pr-2">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">Loading activities...</div>
                </div>
              ) : filteredActivities.length > 0 ? (
                <div className="space-y-4">
                  {filteredActivities.map((activity, index) => {
                    const isSelected = selectedLogs.has(activity.id);

                    return (
                      <div
                        key={activity.id}
                        className={`relative ${
                          isSelected ? "bg-blue-50 rounded-lg p-2 -m-2" : ""
                        }`}
                      >
                        {index < filteredActivities.length - 1 && (
                          <div className="absolute left-4 top-8 w-0.5 h-8 bg-gray-200"></div>
                        )}

                        <div className="flex items-start space-x-4">
                          {isSelectionMode && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                handleSelectLog(activity.id, checked)
                              }
                              className="mt-1.5"
                            />
                          )}

                          <div className="flex-shrink-0 w-8 h-8 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center">
                            {getActivityIcon(activity.type)}
                          </div>

                          <div className="flex-1 min-w-0 pb-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    {activity.description}
                                  </p>
                                  <Badge
                                    className={
                                      activityTypeColors[activity.type] ||
                                      "bg-gray-100 text-gray-800"
                                    }
                                  >
                                    {activityTypeLabels[activity.type] ||
                                      activity.type}
                                  </Badge>
                                </div>

                                <div className="flex items-center space-x-4 text-xs text-gray-500">
                                  <span>
                                    {getWebsiteName(activity.websiteId)}
                                  </span>
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

                              {!isSelectionMode && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-red-600 hover:bg-red-50 ml-2"
                                      disabled={deleteLogMutation.isPending}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Delete Activity Log?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete this
                                        activity log entry:
                                        <div className="mt-2 p-2 bg-gray-50 rounded">
                                          <div className="text-sm font-medium">
                                            {activity.description}
                                          </div>
                                          <div className="text-xs text-gray-500 mt-1">
                                            {format(
                                              new Date(activity.createdAt),
                                              "MMM dd, yyyy 'at' HH:mm"
                                            )}
                                          </div>
                                        </div>
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() =>
                                          handleDeleteLog(activity.id)
                                        }
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete Log
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No activities found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchQuery || activityFilter !== "all"
                      ? "No activities match your current filters."
                      : selectedWebsite !== "all"
                      ? "No activities recorded for this website yet."
                      : "Activities will appear here as your automation runs."}
                  </p>
                  {(searchQuery || activityFilter !== "all") && (
                    <div className="mt-6">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchQuery("");
                          setActivityFilter("all");
                        }}
                      >
                        Clear Filters
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
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
