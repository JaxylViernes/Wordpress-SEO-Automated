import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bot, Plus, Sparkles, Clock, CheckCircle, Play, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { z } from "zod";
import { formatDistanceToNow } from "date-fns";

const contentFormSchema = z.object({
  websiteId: z.string().min(1, "Please select a website"),
  topic: z.string().min(1, "Topic is required"),
  keywords: z.string(),
  tone: z.enum(["professional", "casual", "friendly", "authoritative"]),
  wordCount: z.number().min(100).max(5000),
});

type ContentFormData = z.infer<typeof contentFormSchema>;

const getStatusColor = (status: string) => {
  switch (status) {
    case "published":
      return "bg-green-100 text-green-800";
    case "generating":
      return "bg-blue-100 text-blue-800";
    case "scheduled":
      return "bg-yellow-100 text-yellow-800";
    case "draft":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "published":
      return <CheckCircle className="w-4 h-4" />;
    case "generating":
      return <Bot className="w-4 h-4" />;
    case "scheduled":
      return <Clock className="w-4 h-4" />;
    case "draft":
      return <Edit className="w-4 h-4" />;
    default:
      return <Edit className="w-4 h-4" />;
  }
};

export default function AIContent() {
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedWebsite, setSelectedWebsite] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: websites } = useQuery({
    queryKey: ["/api/websites"],
    queryFn: api.getWebsites,
  });

  const { data: content, isLoading } = useQuery({
    queryKey: ["/api/content", selectedWebsite],
    queryFn: () => selectedWebsite ? api.getWebsiteContent(selectedWebsite) : Promise.resolve([]),
    enabled: !!selectedWebsite,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ContentFormData>({
    resolver: zodResolver(contentFormSchema),
    defaultValues: {
      tone: "professional",
      wordCount: 800,
    },
  });

  const generateContent = useMutation({
    mutationFn: api.generateContent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
      toast({
        title: "Content Generated",
        description: "AI content has been successfully generated and saved as draft.",
      });
      setIsGenerateDialogOpen(false);
      reset();
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    },
  });

  const publishContent = useMutation({
    mutationFn: api.publishContent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
      toast({
        title: "Content Published",
        description: "Content has been published to your WordPress site.",
      });
    },
    onError: () => {
      toast({
        title: "Publish Failed",
        description: "Failed to publish content. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ContentFormData) => {
    const keywords = data.keywords.split(",").map(k => k.trim()).filter(k => k);
    generateContent.mutate({
      ...data,
      keywords,
    });
  };

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
              AI Content Generation
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Create high-quality, SEO-optimized content using AI
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary-500 hover:bg-primary-600 text-white">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Content
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Generate AI Content</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="websiteId">Target Website</Label>
                    <Select
                      value={watch("websiteId")}
                      onValueChange={(value) => setValue("websiteId", value)}
                    >
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
                    {errors.websiteId && (
                      <p className="text-sm text-red-600 mt-1">{errors.websiteId.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="topic">Content Topic</Label>
                    <Input
                      id="topic"
                      {...register("topic")}
                      placeholder="e.g., Latest WordPress Security Tips"
                    />
                    {errors.topic && (
                      <p className="text-sm text-red-600 mt-1">{errors.topic.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="keywords">SEO Keywords (comma-separated)</Label>
                    <Input
                      id="keywords"
                      {...register("keywords")}
                      placeholder="wordpress, security, tips, 2024"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="tone">Content Tone</Label>
                      <Select
                        value={watch("tone")}
                        onValueChange={(value) => setValue("tone", value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="authoritative">Authoritative</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="wordCount">Word Count</Label>
                      <Input
                        id="wordCount"
                        type="number"
                        {...register("wordCount", { valueAsNumber: true })}
                        min="100"
                        max="5000"
                      />
                      {errors.wordCount && (
                        <p className="text-sm text-red-600 mt-1">{errors.wordCount.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsGenerateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-primary-500 hover:bg-primary-600"
                      disabled={generateContent.isPending}
                    >
                      {generateContent.isPending ? "Generating..." : "Generate"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Website Selector */}
        <div className="mb-6">
          <Label htmlFor="websiteSelect" className="text-sm font-medium text-gray-700">
            Select Website to View Content
          </Label>
          <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
            <SelectTrigger className="w-64 mt-1">
              <SelectValue placeholder="Choose a website..." />
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

        {/* Content Generation Stats */}
        {selectedWebsite && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {content?.length || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Published</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {content?.filter(c => c.status === "published").length || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Drafts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">
                  {content?.filter(c => c.status === "draft").length || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Scheduled</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {content?.filter(c => c.status === "scheduled").length || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Content List */}
        {selectedWebsite && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Content</CardTitle>
              <CardDescription>
                Manage AI-generated content for {getWebsiteName(selectedWebsite)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">Loading content...</div>
                </div>
              ) : content && content.length > 0 ? (
                <div className="space-y-4">
                  {content.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-medium text-gray-900">{item.title}</h3>
                            <Badge className={getStatusColor(item.status)}>
                              <div className="flex items-center space-x-1">
                                {getStatusIcon(item.status)}
                                <span className="capitalize">{item.status}</span>
                              </div>
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {item.body.substring(0, 200)}...
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>AI Model: {item.aiModel}</span>
                            <span>Keywords: {item.seoKeywords.join(", ")}</span>
                            <span>Created: {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {item.status === "draft" && (
                            <Button
                              size="sm"
                              onClick={() => publishContent.mutate(item.id)}
                              disabled={publishContent.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Publish
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Bot className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No content generated yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Start by generating your first AI-powered content piece.
                  </p>
                  <div className="mt-6">
                    <Button
                      onClick={() => setIsGenerateDialogOpen(true)}
                      className="bg-primary-500 hover:bg-primary-600"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Content
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!selectedWebsite && (
          <Card>
            <CardContent className="text-center py-12">
              <Bot className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Select a website</h3>
              <p className="mt-1 text-sm text-gray-500">
                Choose a website to view and manage its AI-generated content.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
