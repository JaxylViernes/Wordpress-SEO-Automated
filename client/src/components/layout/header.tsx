import { useState } from "react";
import { Search, Bell, Plus, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import AddWebsiteForm from "@/components/forms/add-website-form";
import { useMobileSidebar } from "./sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { UserMenu } from "@/pages/authentication";

export default function Header() {
  const [isAddWebsiteOpen, setIsAddWebsiteOpen] = useState(false);
  const { setIsOpen } = useMobileSidebar();
  const isMobile = useIsMobile();

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
            <label htmlFor="search-field" className="sr-only">Search</label>
            <div className="relative w-full text-gray-400 focus-within:text-gray-600 max-w-lg">
              <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                <Search className="w-5 h-5" />
              </div>
              <Input
                id="search-field"
                className="block w-full pl-8 pr-3 py-2 border-transparent text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent sm:text-sm"
                placeholder={isMobile ? "Search..." : "Search websites, content, or reports..."}
                type="search"
              />
            </div>
          </div>
        </div>
        
        <div className="ml-2 sm:ml-4 flex items-center md:ml-6 space-x-2 sm:space-x-4">
          {/* Notification Bell */}
          <button className="relative bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
              3
            </span>
          </button>
          
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
          
          {/* User Menu - Moved outside of button */}
          <UserMenu />
        </div>
      </div>
    </div>
  );
}