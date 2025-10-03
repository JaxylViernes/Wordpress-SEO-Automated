import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Globe,
  Calendar,
  BarChart3,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AddWebsiteForm from "@/components/forms/add-website-form";
import { api } from "@/lib/api";
import { useAuth } from "@/pages/authentication";
import { toast } from "sonner";
import { format } from "date-fns";

interface Website {
  id: string;
  name: string;
  url: string;
  status: "active" | "inactive" | "error";
  seoScore: number;
  contentCount: number;
  wpUsername?: string;
  wpApplicationName: string;
  wpApplicationPassword: string;
  aiModel?: string;
  brandVoice?: string;
  targetAudience?: string;
  autoPosting?: boolean;
  requireApproval?: boolean;
  contentGuidelines?: string;
  createdAt: string;
  updatedAt: string;
}

export default function Websites() {
  const [isAddWebsiteOpen, setIsAddWebsiteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [websiteToDelete, setWebsiteToDelete] = useState<Website | null>(null);

  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  // Form state for editing
  const [editForm, setEditForm] = useState({
    name: "",
    url: "",
    wpUsername: "",
    wpApplicationName: "",
    wpApplicationPassword: "",
    aiModel: "",
    brandVoice: "",
    targetAudience: "",
    autoPosting: false,
    requireApproval: true,
    contentGuidelines: "",
  });

  const { data: websites, isLoading: websitesLoading } = useQuery({
    queryKey: ["websites"],
    queryFn: api.getWebsites,
    enabled: isAuthenticated,
  });

  // Update website mutation
  const updateWebsiteMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.updateWebsite(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["websites"] });
      setIsEditModalOpen(false);
      toast.success("Website updated successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update website"
      );
    },
  });

  // Delete website mutation
  const deleteWebsiteMutation = useMutation({
    mutationFn: (id: string) => api.deleteWebsite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["websites"] });
      setIsDeleteDialogOpen(false);
      setWebsiteToDelete(null);
      toast.success("Website deleted successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete website"
      );
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please log in</div>;

  const filteredWebsites =
    websites?.filter(
      (website) =>
        website.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        website.url.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  const handleViewWebsite = (website: Website) => {
    setSelectedWebsite(website);
    setIsViewModalOpen(true);
  };

  const handleEditWebsite = (website: Website) => {
    setSelectedWebsite(website);
    setEditForm({
      name: website.name,
      url: website.url,
      wpUsername: website.wpUsername || "",
      wpApplicationName: website.wpApplicationName,
      wpApplicationPassword: website.wpApplicationPassword,
      aiModel: website.aiModel || "gpt-4o",
      brandVoice: website.brandVoice || "",
      targetAudience: website.targetAudience || "",
      autoPosting: website.autoPosting || false,
      requireApproval: website.requireApproval !== false,
      contentGuidelines: website.contentGuidelines || "",
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteWebsite = (website: Website) => {
    setWebsiteToDelete(website);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (websiteToDelete) {
      deleteWebsiteMutation.mutate(websiteToDelete.id);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedWebsite) {
      updateWebsiteMutation.mutate({
        id: selectedWebsite.id,
        data: editForm,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case "inactive":
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <XCircle className="w-3 h-3 mr-1" />
            Inactive
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-red-100 text-red-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const getSeoScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Website Management
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage all your connected WordPress websites and their
              configurations
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Dialog open={isAddWebsiteOpen} onOpenChange={setIsAddWebsiteOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary-500 hover:bg-primary-600 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Website
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <AddWebsiteForm onSuccess={() => setIsAddWebsiteOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search websites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {/* <Button variant="outline" className="flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button> */}
        </div>

        {/* Website Stats */}
        {!websitesLoading && websites && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-900 mb-2">
                  Total Websites
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary-600">
                  {websites.length}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Connected WordPress sites
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-900 mb-2">
                  Active Sites
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  {websites.filter((w) => w.status === "active").length}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Currently optimizing
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-900 mb-2">
                  Avg SEO Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-yellow-600">
                  {Math.round(
                    websites.reduce((sum, w) => sum + w.seoScore, 0) /
                      websites.length
                  ) || 0}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Across all websites
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Websites Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Websites</CardTitle>
            <CardDescription>
              Manage your connected WordPress websites
            </CardDescription>
          </CardHeader>
          <CardContent>
            {websitesLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading websites...</div>
              </div>
            ) : filteredWebsites.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Website</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>SEO Score</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWebsites.map((website) => (
                      <TableRow key={website.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Globe className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900">
                                {website.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {website.url}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(website.status)}</TableCell>
                        <TableCell>
                          <span
                            className={`font-semibold ${getSeoScoreColor(
                              website.seoScore
                            )}`}
                          >
                            {website.seoScore}/100
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <BarChart3 className="w-4 h-4 text-gray-400" />
                            <span>{website.contentCount} posts</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-500">
                              {format(
                                new Date(website.updatedAt),
                                "MMM dd, yyyy"
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewWebsite(website)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditWebsite(website)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteWebsite(website)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Globe className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No websites found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchQuery
                    ? "No websites match your search criteria."
                    : "Get started by adding your first WordPress website."}
                </p>
                {!searchQuery && (
                  <div className="mt-6">
                    <Button onClick={() => setIsAddWebsiteOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Website
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Website Modal */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Globe className="w-5 h-5" />
                <span>Website Details</span>
              </DialogTitle>
            </DialogHeader>
            {selectedWebsite && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Website Name
                    </Label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedWebsite.name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      URL
                    </Label>
                    <div className="mt-1 flex items-center space-x-2">
                      <p className="text-sm text-gray-900">
                        {selectedWebsite.url}
                      </p>
                      <a
                        href={selectedWebsite.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Status
                    </Label>
                    <div className="mt-1">
                      {getStatusBadge(selectedWebsite.status)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      SEO Score
                    </Label>
                    <p
                      className={`mt-1 text-lg font-semibold ${getSeoScoreColor(
                        selectedWebsite.seoScore
                      )}`}
                    >
                      {selectedWebsite.seoScore}/100
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Content Count
                    </Label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedWebsite.contentCount} posts
                    </p>
                  </div>
                  {/* <div>
                    <Label className="text-sm font-medium text-gray-700">
                      AI Model
                    </Label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedWebsite.aiModel || "Default"}
                    </p>
                  </div> */}
                </div>

                {/* {selectedWebsite.brandVoice && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Brand Voice
                    </Label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedWebsite.brandVoice}
                    </p>
                  </div>
                )} */}

                {/* {selectedWebsite.targetAudience && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Target Audience
                    </Label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedWebsite.targetAudience}
                    </p>
                  </div>
                )} */}

                {/* {selectedWebsite.contentGuidelines && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Content Guidelines
                    </Label>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                      {selectedWebsite.contentGuidelines}
                    </p>
                  </div>
                )} */}

                {/* <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Auto Posting
                    </Label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedWebsite.autoPosting ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Require Approval
                    </Label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedWebsite.requireApproval !== false
                        ? "Enabled"
                        : "Disabled"}
                    </p>
                  </div>
                </div> */}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Created
                    </Label>
                    <p className="mt-1 text-sm text-gray-900">
                      {format(new Date(selectedWebsite.createdAt), "PPP")}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Last Updated
                    </Label>
                    <p className="mt-1 text-sm text-gray-900">
                      {format(new Date(selectedWebsite.updatedAt), "PPP")}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Website Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Edit className="w-5 h-5" />
                <span>Edit Website</span>
              </DialogTitle>
              <DialogDescription>
                Update your website configuration and settings.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Website Name *</Label>
                  <Input
                    id="name"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="url">Website URL *</Label>
                  <Input
                    id="url"
                    type="url"
                    value={editForm.url}
                    onChange={(e) =>
                      setEditForm({ ...editForm, url: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wpUsername">WordPress Username</Label>
                  <Input
                    id="wpUsername"
                    value={editForm.wpUsername}
                    onChange={(e) =>
                      setEditForm({ ...editForm, wpUsername: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="wpApplicationName">Application Name *</Label>
                  <Input
                    id="wpApplicationName"
                    value={editForm.wpApplicationName}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        wpApplicationName: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="wpApplicationPassword">
                  Application Password *
                </Label>
                <Input
                  id="wpApplicationPassword"
                  type="password"
                  value={editForm.wpApplicationPassword}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      wpApplicationPassword: e.target.value,
                    })
                  }
                  required
                />
              </div>

              {/* <div>
                <Label htmlFor="aiModel">AI Model</Label>
                <Select
                  value={editForm.aiModel}
                  onValueChange={(value) =>
                    setEditForm({ ...editForm, aiModel: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select AI model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o (OpenAI)</SelectItem>
                    <SelectItem value="claude-3-5-sonnet">
                      Claude 3.5 Sonnet (Anthropic)
                    </SelectItem>
                    <SelectItem value="gemini-1.5-pro">
                      Gemini 1.5 Pro (Google)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brandVoice">Brand Voice</Label>
                  <Input
                    id="brandVoice"
                    value={editForm.brandVoice}
                    onChange={(e) =>
                      setEditForm({ ...editForm, brandVoice: e.target.value })
                    }
                    placeholder="e.g., Professional, Friendly, Authoritative"
                  />
                </div> */}
              {/* <div>
                  <Label htmlFor="targetAudience">Target Audience</Label>
                  <Input
                    id="targetAudience"
                    value={editForm.targetAudience}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        targetAudience: e.target.value,
                      })
                    }
                    placeholder="e.g., Small business owners, Tech professionals"
                  />
                </div> */}
              {/* </div> */}

              {/* <div>
                <Label htmlFor="contentGuidelines">Content Guidelines</Label>
                <Textarea
                  id="contentGuidelines"
                  value={editForm.contentGuidelines}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      contentGuidelines: e.target.value,
                    })
                  }
                  placeholder="Specific guidelines for content generation..."
                  rows={3}
                />
              </div> */}

              {/* <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoPosting"
                    checked={editForm.autoPosting}
                    onCheckedChange={(checked) =>
                      setEditForm({ ...editForm, autoPosting: checked })
                    }
                  />
                  <Label htmlFor="autoPosting">Enable Auto Posting</Label>
                </div> */}

              {/* <div className="flex items-center space-x-2">
                  <Switch
                    id="requireApproval"
                    checked={editForm.requireApproval}
                    onCheckedChange={(checked) =>
                      setEditForm({ ...editForm, requireApproval: checked })
                    }
                  />
                  <Label htmlFor="requireApproval">
                    Require Content Approval
                  </Label>
                </div>
              </div> */}

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateWebsiteMutation.isPending}
                >
                  {updateWebsiteMutation.isPending
                    ? "Updating..."
                    : "Update Website"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>Delete Website</span>
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <strong>{websiteToDelete?.name}</strong>? This action cannot be
                undone and will permanently remove:
                <ul className="mt-2 ml-4 list-disc text-sm">
                  <li>Website configuration and settings</li>
                  <li>All generated content for this website</li>
                  <li>SEO reports and analytics data</li>
                  <li>Scheduled content and automation rules</li>
                </ul>
                <div className="mt-3 p-3 bg-red-50 rounded-md">
                  <p className="text-sm text-red-800">
                    <strong>Warning:</strong> This will NOT delete content from
                    your actual WordPress site. Only the connection and data in
                    this application will be removed.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                disabled={deleteWebsiteMutation.isPending}
              >
                {deleteWebsiteMutation.isPending
                  ? "Deleting..."
                  : "Delete Website"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
