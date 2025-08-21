import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Plus, Edit, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { format, addDays, isToday, isTomorrow, isPast } from "date-fns";

// Mock scheduled content data
const getScheduledContent = () => [
  {
    id: "1",
    websiteId: "1",
    title: "Latest WordPress Security Tips",
    excerpt: "Keep your WordPress site secure with these essential security practices...",
    scheduledDate: addDays(new Date(), 1),
    status: "scheduled",
    aiModel: "gpt-4o",
    keywords: ["wordpress", "security", "tips"],
  },
  {
    id: "2",
    websiteId: "2",
    title: "E-commerce SEO Best Practices",
    excerpt: "Boost your online store's visibility with proven SEO strategies...",
    scheduledDate: addDays(new Date(), 3),
    status: "scheduled",
    aiModel: "claude-3",
    keywords: ["ecommerce", "seo", "optimization"],
  },
  {
    id: "3",
    websiteId: "1",
    title: "WordPress Performance Optimization",
    excerpt: "Speed up your WordPress site with these performance tips...",
    scheduledDate: addDays(new Date(), 7),
    status: "scheduled",
    aiModel: "gpt-4o",
    keywords: ["wordpress", "performance", "speed"],
  },
  {
    id: "4",
    websiteId: "3",
    title: "Local SEO for Restaurants",
    excerpt: "Attract more local customers with restaurant-specific SEO techniques...",
    scheduledDate: addDays(new Date(), -1),
    status: "published",
    aiModel: "gpt-4o",
    keywords: ["restaurant", "local seo", "marketing"],
  },
];

const getStatusBadge = (status: string, date: Date) => {
  if (status === "published") {
    return <Badge className="bg-green-100 text-green-800">Published</Badge>;
  }
  if (isPast(date) && status === "scheduled") {
    return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
  }
  if (isToday(date)) {
    return <Badge className="bg-blue-100 text-blue-800">Today</Badge>;
  }
  if (isTomorrow(date)) {
    return <Badge className="bg-yellow-100 text-yellow-800">Tomorrow</Badge>;
  }
  return <Badge className="bg-gray-100 text-gray-800">Scheduled</Badge>;
};

const getDateLabel = (date: Date) => {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "MMM dd, yyyy");
};

export default function ContentSchedule() {
  const [selectedWebsite, setSelectedWebsite] = useState<string>("");
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);

  const { data: websites } = useQuery({
    queryKey: ["/api/websites"],
    queryFn: api.getWebsites,
  });

  // Mock data for scheduled content
  const scheduledContent = getScheduledContent();
  
  const filteredContent = selectedWebsite 
    ? scheduledContent.filter(content => content.websiteId === selectedWebsite)
    : scheduledContent;

  const getWebsiteName = (websiteId: string) => {
    const website = websites?.find(w => w.id === websiteId);
    return website?.name || "Unknown Website";
  };

  const upcomingContent = filteredContent.filter(c => 
    c.status === "scheduled" && !isPast(c.scheduledDate)
  ).length;

  const publishedToday = filteredContent.filter(c => 
    c.status === "published" && isToday(c.scheduledDate)
  ).length;

  const failedPosts = filteredContent.filter(c => 
    c.status === "scheduled" && isPast(c.scheduledDate)
  ).length;

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Page Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Content Schedule
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage automated content publishing schedules
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary-500 hover:bg-primary-600 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule Content
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Schedule New Content</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select website" />
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
                  <div>
                    <Label htmlFor="title">Content Title</Label>
                    <Input id="title" placeholder="Enter content title" />
                  </div>
                  <div>
                    <Label htmlFor="date">Publish Date</Label>
                    <Input id="date" type="date" />
                  </div>
                  <div>
                    <Label htmlFor="time">Publish Time</Label>
                    <Input id="time" type="time" defaultValue="09:00" />
                  </div>
                  <div>
                    <Label htmlFor="excerpt">Content Brief</Label>
                    <Textarea 
                      id="excerpt" 
                      placeholder="Brief description of the content to be generated"
                      rows={3}
                    />
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsScheduleDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-primary-500 hover:bg-primary-600"
                    >
                      Schedule
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Website Filter */}
        <div className="mb-6">
          <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="All websites" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All websites</SelectItem>
              {websites?.map((website) => (
                <SelectItem key={website.id} value={website.id}>
                  {website.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Schedule Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Upcoming Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{upcomingContent}</div>
              <p className="text-xs text-gray-500 mt-1">Scheduled for publishing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Published Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{publishedToday}</div>
              <p className="text-xs text-gray-500 mt-1">Successfully published</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Failed Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{failedPosts}</div>
              <p className="text-xs text-gray-500 mt-1">Need attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Auto-Publishing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {websites?.filter(w => w.autoPosting).length || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">Sites with auto-posting</p>
            </CardContent>
          </Card>
        </div>

        {/* Scheduled Content List */}
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Content</CardTitle>
            <CardDescription>
              Manage your automated content publishing schedule
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredContent.length > 0 ? (
              <div className="space-y-4">
                {filteredContent
                  .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())
                  .map((content) => (
                    <div key={content.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-medium text-gray-900">{content.title}</h3>
                            {getStatusBadge(content.status, content.scheduledDate)}
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {content.excerpt}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {getDateLabel(content.scheduledDate)}
                            </span>
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {format(content.scheduledDate, "HH:mm")}
                            </span>
                            <span>Website: {getWebsiteName(content.websiteId)}</span>
                            <span>AI: {content.aiModel}</span>
                          </div>
                          
                          <div className="flex items-center space-x-1 mt-2">
                            {content.keywords.map((keyword) => (
                              <Badge key={keyword} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          {content.status === "scheduled" && !isPast(content.scheduledDate) && (
                            <>
                              <Button size="sm" variant="outline">
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                          
                          {content.status === "published" && (
                            <div className="flex items-center text-green-600">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              <span className="text-sm">Published</span>
                            </div>
                          )}
                          
                          {isPast(content.scheduledDate) && content.status === "scheduled" && (
                            <div className="flex items-center text-red-600">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              <span className="text-sm">Failed</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No scheduled content</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedWebsite 
                    ? "No content scheduled for this website." 
                    : "Start by scheduling your first content piece."
                  }
                </p>
                <div className="mt-6">
                  <Button
                    onClick={() => setIsScheduleDialogOpen(true)}
                    className="bg-primary-500 hover:bg-primary-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Content
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Auto-Publishing Settings */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Auto-Publishing Settings</CardTitle>
            <CardDescription>
              Configure automatic content generation and publishing schedules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {websites?.map((website) => (
                <div key={website.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{website.name}</h4>
                    <p className="text-sm text-gray-500">
                      {website.autoPosting 
                        ? "Auto-posting enabled • 2 posts per week" 
                        : "Auto-posting disabled"
                      }
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={website.autoPosting ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                      {website.autoPosting ? "Enabled" : "Disabled"}
                    </Badge>
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
