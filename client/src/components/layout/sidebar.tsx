import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Rocket,
  Globe,
  Bot,
  Search,
  Calendar,
  BarChart3,
  History,
  Settings,
  X,
  Image,
  SearchCheck,
  Shield, // Add this import
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useState, createContext, useContext, useEffect } from "react"; // Add useEffect
import { useIsMobile } from "@/hooks/use-mobile";
import { CompactSidebarUserMenu, UserMenu } from "@/pages/authentication";

// Mobile sidebar context (keep your existing code)
const MobileSidebarContext = createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}>({ isOpen: false, setIsOpen: () => {} });

export const useMobileSidebar = () => useContext(MobileSidebarContext);

export function MobileSidebarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <MobileSidebarContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </MobileSidebarContext.Provider>
  );
}

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Websites", href: "/websites", icon: Globe },
  { name: "AI Content", href: "/ai-content", icon: Bot },
  { name: "SEO Analysis", href: "/seo-analysis", icon: Search },
  { name: "Search Console", href: "/googlesearchconsole", icon: SearchCheck },
  { name: "Content Schedule", href: "/content-schedule", icon: Calendar },
  { name: "Image Metadata", href: "/image-metadata", icon: Image },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Activity Logs", href: "/activity-logs", icon: History },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Admin Panel", href: "/admin", icon: Shield, adminOnly: true },
];

// Shared sidebar content component
function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const [location] = useLocation();
  const [user, setUser] = useState<any>(null); // Add this state

  // Add this useEffect to fetch user data
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => {
        if (res.ok) {
          return res.json();
        }
        return null;
      })
      .then(data => {
        if (data) {
          setUser(data);
        }
      })
      .catch(error => {
        console.error('Failed to fetch user:', error);
      });
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center flex-shrink-0 px-4 pt-5">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <Rocket className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">WP AI Manager</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-8 flex-1 px-2 space-y-1">
        {navigation.map((item) => {
          // Skip admin-only items for non-admin users
          if (item.adminOnly && !user?.isAdmin) {
            return null;
          }

          const isActive = location === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onLinkClick}
              className={cn(
                "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                isActive
                  ? "bg-primary-50 border-r-4 border-primary-500 text-primary-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon
                className={cn(
                  "mr-3 h-4 w-4",
                  isActive
                    ? "text-primary-500"
                    : "text-gray-400 group-hover:text-gray-500"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <CompactSidebarUserMenu />
    </div>
  );
}

export default function Sidebar() {
  const isMobile = useIsMobile();
  const { isOpen, setIsOpen } = useMobileSidebar();

  // Desktop sidebar
  if (!isMobile) {
    return (
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-grow pb-4 overflow-y-auto bg-white border-r border-gray-200">
            <SidebarContent />
          </div>
        </div>
      </div>
    );
  }

  // Mobile sidebar (Sheet)
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="left" className="p-0 w-64">
        <div className="flex flex-col h-full bg-white">
          <SidebarContent onLinkClick={() => setIsOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}