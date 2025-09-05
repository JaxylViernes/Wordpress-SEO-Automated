import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import WebsitesTable from "@/components/dashboard/websites-table";
import AddWebsiteForm from "@/components/forms/add-website-form";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export default function Websites() {
  // ADD THESE MISSING STATE DECLARATIONS
  const [isAddWebsiteOpen, setIsAddWebsiteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { isAuthenticated, isLoading } = useAuth();

  const { data: websites, isLoading: websitesLoading } = useQuery({
    queryKey: ["websites"], // Simple key, no user ID needed
    queryFn: api.getWebsites,
    enabled: isAuthenticated, // Only when logged in
  });

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please log in</div>;

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Website Management
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage all your connected WordPress websites and their configurations
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
          <Button variant="outline" className="flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        {!websitesLoading && websites && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Total Websites</h3>
              <p className="text-3xl font-bold text-primary-600">{websites.length}</p>
              <p className="text-sm text-gray-500 mt-2">Connected WordPress sites</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Active Sites</h3>
              <p className="text-3xl font-bold text-green-600">
                {websites.filter(w => w.status === "active").length}
              </p>
              <p className="text-sm text-gray-500 mt-2">Currently optimizing</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Avg SEO Score</h3>
              <p className="text-3xl font-bold text-yellow-600">
                {Math.round(websites.reduce((sum, w) => sum + w.seoScore, 0) / websites.length) || 0}
              </p>
              <p className="text-sm text-gray-500 mt-2">Across all websites</p>
            </div>
          </div>
        )}

        <WebsitesTable />
      </div>
    </div>
  );
}