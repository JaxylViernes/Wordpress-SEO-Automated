import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Users, Activity, Globe, FileText, TrendingUp, 
  AlertTriangle, DollarSign, Cpu, Database, Shield
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import UserManagement from "./UserManagement";
import SystemMonitoring from "./SystemMonitoring";
import AIUsageAnalytics from "./AIUsageAnalytics";

export default function AdminDashboard() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const user = await api.getCurrentUser();
      if (!user.isAdmin) {
        toast({
          title: "Access Denied",
          description: "Admin privileges required",
          variant: "destructive"
        });
        setLocation("/");
        return;
      }
      setIsAdmin(true);
      fetchDashboardStats();
    } catch (error) {
      console.error("Admin access check failed:", error);
      setLocation("/");
    }
  };

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const data = await api.admin.getDashboard();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch admin dashboard:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Cpu className="w-12 h-12 mx-auto mb-4 animate-spin text-primary-500" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary-500" />
              Admin Dashboard
            </h1>
            <p className="text-gray-600 mt-2">System management and monitoring</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={fetchDashboardStats}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.users?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.users?.activeUsers || 0} active this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Websites</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.websites?.totalWebsites || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.websites?.activeWebsites || 0} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Content</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.content?.totalContent || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.content?.contentThisMonth || 0} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Usage</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats?.aiUsage?.totalCostDollars?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.aiUsage?.operationsThisMonth || 0} ops this month
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="system">System Monitoring</TabsTrigger>
          <TabsTrigger value="ai">AI Usage</TabsTrigger>
          <TabsTrigger value="websites">Websites</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="system">
          <SystemMonitoring stats={stats} />
        </TabsContent>

        <TabsContent value="ai">
          <AIUsageAnalytics />
        </TabsContent>

        <TabsContent value="websites">
          <Card>
            <CardHeader>
              <CardTitle>Website Management</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add website management component */}
              <p>Website management features coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add security management component */}
              <p>Security management features coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}