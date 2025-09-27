// //client/src/App.tsx
import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdminPanel from "@/pages/AdminPanel";

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
import ImageMetadata from "@/pages/image-metadata";
import GoogleSearchConsole from "@/pages/googlesearchconsole";
import ResetPasswordPage from "@/pages/ResetPasswordPage"; // Add this import

// Layout components
import Sidebar, { MobileSidebarProvider } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

// Auth components
import { AuthProvider, ProtectedRoute, AuthPage, useAuth } from "@/pages/authentication";

// =============================================================================
// PROTECTED ROUTER COMPONENT (for authenticated routes)
// =============================================================================

function ProtectedRouter() {
  const { user } = useAuth();

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/websites" component={Websites} />
      <Route path="/ai-content" component={AIContent} />
      <Route path="/seo-analysis" component={SEOAnalysis} />
      <Route path="/googlesearchconsole" component={GoogleSearchConsole} />
      <Route path="/content-schedule" component={ContentSchedule} />
      <Route path="/image-metadata" component={ImageMetadata} />
      <Route path="/reports" component={Reports} />
      <Route path="/activity-logs" component={ActivityLogs} />
      <Route path="/settings" component={Settings} />

       {/* Add admin route with conditional rendering */}
      <Route path="/admin">
        {user?.isAdmin ? <AdminPanel /> : <NotFound />}
      </Route>
      
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
          <div className="py-4 sm:py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

// =============================================================================
// REDIRECT COMPONENT
// =============================================================================

function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(to);
  }, [to, setLocation]);
  return null;
}

// =============================================================================
// APP CONTENT - Handles routing based on auth state
// =============================================================================

function AppContent() {
  const { user, loading } = useAuth();

  // Show loading spinner while checking auth status
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes (accessible without authentication) */}
      <Route path="/login">
        {user ? <Redirect to="/" /> : <AuthPage />}
      </Route>
      <Route path="/reset-password" component={ResetPasswordPage} />
      
      {/* Protected routes (requires authentication) */}
      <Route>
        {user ? (
          <MobileSidebarProvider>
            <AuthenticatedLayout>
              <ProtectedRouter />
            </AuthenticatedLayout>
          </MobileSidebarProvider>
        ) : (
          <AuthPage />
        )}
      </Route>
    </Switch>
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
          <AppContent />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;