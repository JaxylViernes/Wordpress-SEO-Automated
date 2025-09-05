import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Page imports
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Websites from "@/pages/websites";
import AIContent from "@/pages/ai-content";
import SEOAnalysis from "@/pages/seo-analysis";
import ContentSchedule from "@/pages/content-schedule";
import Reports from "@/pages/reports";
import ActivityLogs from "@/pages/activity-logs";
import Settings from "@/pages/settings";

// Layout components
import Sidebar, { MobileSidebarProvider } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

// Auth components (you'll need to create these)
import { AuthProvider, ProtectedRoute } from "@/pages/authentication"

// =============================================================================
// MAIN ROUTER COMPONENT
// =============================================================================

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/websites" component={Websites} />
      <Route path="/ai-content" component={AIContent} />
      <Route path="/seo-analysis" component={SEOAnalysis} />
      <Route path="/content-schedule" component={ContentSchedule} />
      <Route path="/reports" component={Reports} />
      <Route path="/activity-logs" component={ActivityLogs} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

// =============================================================================
// AUTHENTICATED LAYOUT
// =============================================================================

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 relative overflow-y-auto focus:outline-none px-4 sm:px-6 lg:px-8">
          <div className="py-4 sm:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN APP COMPONENT
// =============================================================================

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <MobileSidebarProvider>
            <ProtectedRoute>
              <AuthenticatedLayout>
                <AppRouter />
              </AuthenticatedLayout>
            </ProtectedRoute>
            <Toaster />
          </MobileSidebarProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;