// import { useState } from "react";
// import { Search, Plus, Menu } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
// import AddWebsiteForm from "@/components/forms/add-website-form";
// import { useMobileSidebar } from "./sidebar";
// import { useIsMobile } from "@/hooks/use-mobile";

// // ⬇️ Import the simple, real-data bell
// import ActivityBellSimple from "@/components/notifications/activity-bell-simple";

// export default function Header() {
//   const [isAddWebsiteOpen, setIsAddWebsiteOpen] = useState(false);
//   const { setIsOpen } = useMobileSidebar();
//   const isMobile = useIsMobile();

//   return (
//     <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow-sm border-b border-gray-200">
//       {isMobile && (
//         <button
//           onClick={() => setIsOpen(true)}
//           className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 md:hidden"
//         >
//           <Menu className="w-5 h-5" />
//         </button>
//       )}

//       <div className="flex-1 px-4 flex justify-between items-center">
//         <div className="flex-1 flex">
//           <div className="w-full flex md:ml-0">
//             <span className="sr-only">Search</span>
//             <div className="relative w-full text-gray-400 focus-within:text-gray-600 max-w-lg">
//               <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
//                 <Search className="w-5 h-5" />
//               </div>
      
//             </div>
//           </div>
//         </div>

//         <div className="ml-2 sm:ml-4 flex items-center md:ml-6 space-x-2 sm:space-x-4">
//           <ActivityBellSimple />

//           {/* Add Website Dialog */}
//           <Dialog open={isAddWebsiteOpen} onOpenChange={setIsAddWebsiteOpen}>
//             <DialogTrigger asChild>
//               <Button className="bg-primary-500 hover:bg-primary-600 text-white px-2 sm:px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-1 sm:space-x-2">
//                 <Plus className="w-4 h-4" />
//                 {!isMobile && <span>Add Website</span>}
//               </Button>
//             </DialogTrigger>
//             <DialogContent className="sm:max-w-md mx-4 sm:mx-auto">
//               <AddWebsiteForm onSuccess={() => setIsAddWebsiteOpen(false)} />
//             </DialogContent>
//           </Dialog>
//         </div>
//       </div>
//     </div>
//   );
// }




// client/src/components/layout/header.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Plus, Menu, X, FileText, Globe, BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import AddWebsiteForm from "@/components/forms/add-website-form";
import { useMobileSidebar } from "./sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { debounce } from "lodash";

// Import the simple, real-data bell
import ActivityBellSimple from "@/components/notifications/activity-bell-simple";

// Types for search results
type SearchResult = {
  id: string;
  title: string;
  subtitle?: string;
  type: 'website' | 'report' | 'post';
  url?: string;
  icon: React.ReactNode;
  path: string;
};

export default function Header() {
  const [isAddWebsiteOpen, setIsAddWebsiteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const { setIsOpen } = useMobileSidebar();
  const isMobile = useIsMobile();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Navigation function without react-router-dom
  const navigate = (path: string) => {
    window.location.href = path;
  };

  // Fetch data for searching
  const { data: websites } = useQuery({
    queryKey: ["/api/user/websites"],
    queryFn: api.getWebsites,
    staleTime: 5 * 60 * 1000,
  });

  const { data: reports } = useQuery({
    queryKey: ["/api/user/reports"],
    queryFn: api.getClientReports,
    staleTime: 5 * 60 * 1000,
  });

  const { data: posts } = useQuery({
    queryKey: ["/api/user/posts"],
    queryFn: api.getPosts,
    staleTime: 5 * 60 * 1000,
  });

  // Debounced search function
  const performSearch = useCallback(
    debounce((query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      const results: SearchResult[] = [];
      const lowerQuery = query.toLowerCase();

      // Search websites
      if (websites) {
        const websiteResults = websites
          .filter(site => 
            site.name.toLowerCase().includes(lowerQuery) ||
            site.url.toLowerCase().includes(lowerQuery)
          )
          .slice(0, 3)
          .map(site => ({
            id: site.id,
            title: site.name,
            subtitle: site.url,
            type: 'website' as const,
            icon: <Globe className="w-4 h-4" />,
            path: `/websites/${site.id}`
          }));
        results.push(...websiteResults);
      }

      // Search reports
      if (reports) {
        const reportResults = reports
          .filter(report => 
            report.websiteName?.toLowerCase().includes(lowerQuery) ||
            report.reportType?.toLowerCase().includes(lowerQuery) ||
            report.period?.toLowerCase().includes(lowerQuery)
          )
          .slice(0, 3)
          .map(report => ({
            id: report.id,
            title: `${report.reportType?.charAt(0).toUpperCase()}${report.reportType?.slice(1)} Report - ${report.websiteName}`,
            subtitle: report.period,
            type: 'report' as const,
            icon: <BarChart3 className="w-4 h-4" />,
            path: `/reports?id=${report.id}`
          }));
        results.push(...reportResults);
      }

      // Search posts
      if (posts) {
        const postResults = posts
          .filter(post => 
            post.title?.toLowerCase().includes(lowerQuery) ||
            post.content?.toLowerCase().includes(lowerQuery) ||
            post.keywords?.some(k => k.toLowerCase().includes(lowerQuery))
          )
          .slice(0, 3)
          .map(post => ({
            id: post.id,
            title: post.title,
            subtitle: `${post.status} • ${post.websiteName}`,
            type: 'post' as const,
            icon: <FileText className="w-4 h-4" />,
            path: `/posts/${post.id}`
          }));
        results.push(...postResults);
      }

      setSearchResults(results);
      setIsSearching(false);
    }, 300),
    [websites, reports, posts]
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setSelectedIndex(-1);
    
    if (query.trim()) {
      setShowResults(true);
      performSearch(query);
    } else {
      setShowResults(false);
      setSearchResults([]);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleResultClick(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowResults(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle clicking on a search result
  const handleResultClick = (result: SearchResult) => {
    navigate(result.path);
    setSearchQuery("");
    setShowResults(false);
    setSearchResults([]);
    setSelectedIndex(-1);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get type badge color
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'website':
        return 'bg-blue-100 text-blue-700';
      case 'report':
        return 'bg-green-100 text-green-700';
      case 'post':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow-sm border-b border-gray-200">
      {isMobile && (
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      <div className="flex-1 px-4 flex justify-between items-center">
        <div className="flex-1 flex">
          <div className="w-full flex md:ml-0">
            <div className="relative w-full max-w-lg" ref={searchRef}>
              {/* Search Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className={cn(
                    "w-5 h-5 transition-colors",
                    searchQuery ? "text-gray-600" : "text-gray-400"
                  )} />
                </div>
                <Input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => searchQuery && setShowResults(true)}
                  placeholder="Search websites, reports, posts..."
                  className="w-full pl-10 pr-10 py-2 border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showResults && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                  {isSearching ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="inline-flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500 mr-2"></div>
                        Searching...
                      </div>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="max-h-96 overflow-y-auto">
                      {searchResults.map((result, index) => (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => handleResultClick(result)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={cn(
                            "w-full px-4 py-3 flex items-center space-x-3 hover:bg-gray-50 transition-colors text-left",
                            selectedIndex === index && "bg-gray-50"
                          )}
                        >
                          <div className="flex-shrink-0 text-gray-400">
                            {result.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {result.title}
                              </p>
                              <span className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                                getTypeBadgeColor(result.type)
                              )}>
                                {result.type}
                              </span>
                            </div>
                            {result.subtitle && (
                              <p className="text-xs text-gray-500 truncate mt-0.5">
                                {result.subtitle}
                              </p>
                            )}
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  ) : searchQuery.trim() ? (
                    <div className="p-8 text-center">
                      <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">
                        No results found for "{searchQuery}"
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Try searching with different keywords
                      </p>
                    </div>
                  ) : null}

                  {/* Quick Actions */}
                  {searchResults.length > 0 && (
                    <div className="border-t border-gray-200 p-2 bg-gray-50">
                      <div className="flex items-center justify-between px-2">
                        <span className="text-xs text-gray-500">
                          Press <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">↵</kbd> to select • <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">ESC</kbd> to close
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

        <div className="ml-2 sm:ml-4 flex items-center md:ml-6 space-x-2 sm:space-x-4">
          <ActivityBellSimple />

          {/* Add Website Dialog */}
          <Dialog open={isAddWebsiteOpen} onOpenChange={setIsAddWebsiteOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary-500 hover:bg-primary-600 text-white px-2 sm:px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-1 sm:space-x-2">
                <Plus className="w-4 h-4" />
                {!isMobile && <span>Add Website</span>}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md mx-4 sm:mx-auto">
              <AddWebsiteForm onSuccess={() => setIsAddWebsiteOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}