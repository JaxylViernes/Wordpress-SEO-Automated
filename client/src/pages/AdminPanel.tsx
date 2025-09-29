import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Users, 
  Globe, 
  FileText, 
  BarChart, 
  Shield, 
  Trash2, 
  ShieldCheck, 
  ShieldOff, 
  Key, 
  DollarSign, 
  Activity,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Download,
  FileDown
} from "lucide-react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

export default function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [apiUsage, setApiUsage] = useState<any>(null);
  const [userApiUsage, setUserApiUsage] = useState<any>(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState<any>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserDetails(selectedUserId);
    }
  }, [selectedUserId]);

  const fetchData = async () => {
    try {
      const [statsRes, usersRes, apiUsageRes, userApiUsageRes] = await Promise.all([
        fetch('/api/admin/statistics', { credentials: 'include' }),
        fetch('/api/admin/users', { credentials: 'include' }),
        fetch('/api/admin/system-api-usage', { credentials: 'include' }),
        fetch('/api/admin/users-api-usage', { credentials: 'include' })
      ]);

      if (!statsRes.ok || !usersRes.ok || !apiUsageRes.ok || !userApiUsageRes.ok) {
        if (statsRes.status === 403 || usersRes.status === 403 || apiUsageRes.status === 403 || userApiUsageRes.status === 403) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to access the admin panel",
            variant: "destructive"
          });
          return;
        }
        throw new Error('Failed to fetch admin data');
      }

      const [statsData, usersData, apiUsageData, userApiUsageData] = await Promise.all([
        statsRes.json(),
        usersRes.json(),
        apiUsageRes.json(),
        userApiUsageRes.json()
      ]);

      setStats(statsData);
      setUsers(usersData);
      setApiUsage(apiUsageData);
      setUserApiUsage(userApiUsageData);
    } catch (error: any) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load admin data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    setLoadingUserDetails(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/api-usage`, { 
        credentials: 'include' 
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch user details: ${res.status} ${res.statusText}`);
      }
      
      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error('Non-JSON response received:', contentType);
        const text = await res.text();
        console.error('Response preview:', text.substring(0, 200));
        throw new Error('Server returned non-JSON response. Please check the API endpoint.');
      }
      
      const data = await res.json();
      setSelectedUserDetails(data);
    } catch (error: any) {
      console.error('Error fetching user details:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load user API usage details",
        variant: "destructive"
      });
    } finally {
      setLoadingUserDetails(false);
    }
  };

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    setUpdatingUser(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/admin-status`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAdmin: !currentStatus })
      });

      if (!res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const error = await res.json();
          throw new Error(error.message || `Failed: ${res.status}`);
        } else {
          throw new Error(`Server error: ${res.status} ${res.statusText}`);
        }
      }

      const updatedUser = await res.json();
      setUsers(users.map(u => u.id === userId ? updatedUser : u));
      
      toast({
        title: "Success",
        description: `Admin status ${!currentStatus ? 'granted' : 'removed'} successfully`
      });
    } catch (error: any) {
      console.error('Error updating admin status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update admin status",
        variant: "destructive"
      });
    } finally {
      setUpdatingUser(null);
    }
  };

  const deleteUser = async () => {
    if (!deleteUserId) return;

    try {
      const res = await fetch(`/api/admin/users/${deleteUserId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const error = await res.json();
          throw new Error(error.message || `Failed: ${res.status}`);
        } else {
          throw new Error(`Server error: ${res.status} ${res.statusText}`);
        }
      }

      setUsers(users.filter(u => u.id !== deleteUserId));
      toast({
        title: "Success",
        description: "User deleted successfully"
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive"
      });
    } finally {
      setDeleteUserId(null);
    }
  };

  const formatCost = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  // Generate PDF report for a single user
  const downloadUserReport = async (userId: string) => {
    setDownloadingReport(userId);
    try {
      // Fetch detailed user data
      const res = await fetch(`/api/admin/users/${userId}/api-usage`, { 
        credentials: 'include' 
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch user details: ${res.status} ${res.statusText}`);
      }
      
      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error('Non-JSON response received:', contentType);
        const text = await res.text();
        console.error('Response preview:', text.substring(0, 200));
        throw new Error('Server returned non-JSON response. Please check the API endpoint.');
      }
      
      const userDetails = await res.json();
      const user = userApiUsage?.userUsage?.find((u: any) => u.userId === userId);
      
      if (!user) {
        throw new Error('User data not found');
      }
      
      // Create PDF
      const doc = new jsPDF();
      
      // Add logo/header background
      doc.setFillColor(240, 240, 240);
      doc.rect(0, 0, 210, 30, 'F');
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(33, 33, 33);
      doc.text('API Usage Report', 105, 20, { align: 'center' });
      
      // User Info Section
      doc.setFontSize(14);
      doc.setTextColor(66, 66, 66);
      doc.text('User Information', 14, 45);
      
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Username: `, 14, 55);
      doc.setTextColor(33, 33, 33);
      doc.text(`${user?.username || 'N/A'}`, 40, 55);
      
      doc.setTextColor(100, 100, 100);
      doc.text(`Email: `, 14, 62);
      doc.setTextColor(33, 33, 33);
      doc.text(`${user?.email || 'N/A'}`, 30, 62);
      
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: `, 14, 69);
      doc.setTextColor(33, 33, 33);
      doc.text(`${format(new Date(), 'MMMM dd, yyyy HH:mm')}`, 40, 69);
      
      // Summary Section with background
      doc.setFillColor(250, 250, 250);
      doc.rect(10, 80, 190, 30, 'F');
      
      doc.setFontSize(14);
      doc.setTextColor(66, 66, 66);
      doc.text('Usage Summary', 14, 90);
      
      doc.setFontSize(10);
      doc.setTextColor(33, 33, 33);
      doc.text(`Total Requests: ${formatNumber(userDetails.summary?.totalRequests || 0)}`, 14, 100);
      doc.text(`Total Tokens: ${formatNumber(userDetails.summary?.totalTokens || 0)}`, 75, 100);
      doc.text(`Total Cost: ${formatCost(userDetails.summary?.totalCostCents || 0)}`, 140, 100);
      
      // Usage by Model Table
      let yPosition = 120;
      
      if (userDetails.modelUsage && userDetails.modelUsage.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(66, 66, 66);
        doc.text('Usage by Model', 14, yPosition);
        
        autoTable(doc, {
          startY: yPosition + 5,
          head: [['Model', 'Key Source', 'Requests', 'Tokens', 'Cost']],
          body: userDetails.modelUsage.map((model: any) => [
            model.model,
            model.keySource === 'user' ? 'User Key' : 'System Key',
            model.requests.toString(),
            formatNumber(model.tokens),
            formatCost(model.costCents)
          ]),
          theme: 'grid',
          headStyles: { 
            fillColor: [66, 66, 66],
            textColor: [255, 255, 255],
            fontSize: 10
          },
          bodyStyles: {
            fontSize: 9,
            textColor: [33, 33, 33]
          },
          alternateRowStyles: {
            fillColor: [250, 250, 250]
          },
          margin: { left: 14, right: 14 }
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }
      
      // Usage by Operation Table
      if (userDetails.operationUsage && userDetails.operationUsage.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(66, 66, 66);
        doc.text('Usage by Operation', 14, yPosition);
        
        autoTable(doc, {
          startY: yPosition + 5,
          head: [['Operation', 'Key Source', 'Requests', 'Tokens', 'Cost']],
          body: userDetails.operationUsage.map((op: any) => [
            op.operation,
            op.keySource === 'user' ? 'User Key' : 'System Key',
            op.requests.toString(),
            formatNumber(op.tokens),
            formatCost(op.costCents)
          ]),
          theme: 'grid',
          headStyles: { 
            fillColor: [66, 66, 66],
            textColor: [255, 255, 255],
            fontSize: 10
          },
          bodyStyles: {
            fontSize: 9,
            textColor: [33, 33, 33]
          },
          alternateRowStyles: {
            fillColor: [250, 250, 250]
          },
          margin: { left: 14, right: 14 }
        });
      }
      
      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page 1 of 1`, 105, pageHeight - 10, { align: 'center' });
      
      // Save PDF
      doc.save(`${user?.username || 'user'}_api_usage_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
      toast({
        title: "Success",
        description: "Report downloaded successfully"
      });
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate PDF report",
        variant: "destructive"
      });
    } finally {
      setDownloadingReport(null);
    }
  };

  // Generate combined PDF report for all users
  const downloadAllUsersReport = async () => {
    setDownloadingReport('all');
    try {
      if (!userApiUsage?.userUsage || userApiUsage.userUsage.length === 0) {
        throw new Error('No user data available for report generation');
      }

      const doc = new jsPDF();
      
      // Cover Page
      doc.setFillColor(240, 240, 240);
      doc.rect(0, 0, 210, 297, 'F');
      
      doc.setFontSize(32);
      doc.setTextColor(33, 33, 33);
      doc.text('API Usage Report', 105, 80, { align: 'center' });
      
      doc.setFontSize(18);
      doc.setTextColor(66, 66, 66);
      doc.text('All Users Summary', 105, 100, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`, 105, 120, { align: 'center' });
      
      // System Summary Box
      const totalSystemCost = userApiUsage.userUsage.reduce(
        (sum: number, u: any) => sum + (u.totalCostCents || 0), 0
      );
      const totalSystemRequests = userApiUsage.userUsage.reduce(
        (sum: number, u: any) => sum + (u.requestCount || 0), 0
      );
      const totalSystemTokens = userApiUsage.userUsage.reduce(
        (sum: number, u: any) => sum + (u.totalTokens || 0), 0
      );
      
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(30, 140, 150, 80, 5, 5, 'F');
      
      doc.setFontSize(14);
      doc.setTextColor(66, 66, 66);
      doc.text('System Overview', 105, 155, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setTextColor(33, 33, 33);
      doc.text(`Total Users: ${userApiUsage.userUsage.length}`, 40, 170);
      doc.text(`Total Requests: ${formatNumber(totalSystemRequests)}`, 40, 180);
      doc.text(`Total Tokens: ${formatNumber(totalSystemTokens)}`, 40, 190);
      doc.text(`Total Cost: ${formatCost(totalSystemCost)}`, 40, 200);
      
      // New page for user data
      doc.addPage();
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, 210, 297, 'F');
      
      doc.setFontSize(16);
      doc.setTextColor(33, 33, 33);
      doc.text('User Usage Details', 14, 20);
      
      // User Usage Table
      autoTable(doc, {
        startY: 30,
        head: [['Username', 'Email', 'Requests', 'Tokens', 'Cost', 'Last Activity']],
        body: userApiUsage.userUsage.map((user: any) => [
          user.username || 'N/A',
          user.email || 'N/A',
          formatNumber(user.requestCount || 0),
          formatNumber(user.totalTokens || 0),
          formatCost(user.totalCostCents || 0),
          user.lastUsed ? format(new Date(user.lastUsed), 'MMM dd, HH:mm') : 'Never'
        ]),
        theme: 'grid',
        headStyles: { 
          fillColor: [66, 66, 66],
          textColor: [255, 255, 255],
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [33, 33, 33]
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250]
        },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 45 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 30 }
        }
      });
      
      // Monthly Usage Page
      if (userApiUsage.monthlyUserUsage && userApiUsage.monthlyUserUsage.length > 0) {
        doc.addPage();
        
        doc.setFontSize(16);
        doc.setTextColor(33, 33, 33);
        doc.text('Current Month Usage', 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Billing Period: ${userApiUsage.billingPeriod ? 
            `${format(new Date(userApiUsage.billingPeriod.start), 'MMM dd')} - ${format(new Date(userApiUsage.billingPeriod.end), 'MMM dd, yyyy')}` 
            : 'Current Month'}`,
          14, 30
        );
        
        const totalMonthlyCost = userApiUsage.monthlyUserUsage.reduce(
          (sum: number, u: any) => sum + (u.monthlyCostCents || 0), 0
        );
        
        autoTable(doc, {
          startY: 40,
          head: [['Username', 'Monthly Requests', 'Monthly Tokens', 'Monthly Cost', '% of Total']],
          body: userApiUsage.monthlyUserUsage.map((user: any) => {
            const percentage = totalMonthlyCost > 0 
              ? ((user.monthlyCostCents / totalMonthlyCost) * 100).toFixed(1)
              : '0';
            return [
              user.username || 'N/A',
              formatNumber(user.monthlyRequests || 0),
              formatNumber(user.monthlyTokens || 0),
              formatCost(user.monthlyCostCents || 0),
              `${percentage}%`
            ];
          }),
          theme: 'grid',
          headStyles: { 
            fillColor: [66, 66, 66],
            textColor: [255, 255, 255],
            fontSize: 9
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [33, 33, 33]
          },
          alternateRowStyles: {
            fillColor: [250, 250, 250]
          },
          margin: { left: 14, right: 14 }
        });
      }
      
      // Save PDF
      doc.save(`all_users_api_usage_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
      toast({
        title: "Success",
        description: "Combined report downloaded successfully"
      });
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate PDF report",
        variant: "destructive"
      });
    } finally {
      setDownloadingReport(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const totalMonthlyCost = apiUsage?.monthlyStats?.totalCostCents || 0;
  const topSpender = userApiUsage?.monthlyUserUsage?.[0];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="w-8 h-8" />
          Admin Panel
        </h1>
        <p className="text-muted-foreground mt-1">
          System administration and user management
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.users || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.recentActivity?.filter((a: any) => a.type === 'user_created')?.length || 0} new this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Websites</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.websites || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active sites
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Content</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.content || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total posts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly API Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCost(totalMonthlyCost)}
            </div>
            <p className="text-xs text-muted-foreground">
              {apiUsage?.monthlyStats?.totalRequests || 0} requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Spender</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {topSpender?.username || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {topSpender ? formatCost(topSpender.monthlyCostCents) : '$0.00'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="api-usage">System API Usage</TabsTrigger>
          <TabsTrigger value="user-api-usage">User API Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user accounts and admin permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.email || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={user.isAdmin ? "default" : "secondary"}>
                          {user.isAdmin ? 'Admin' : 'User'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.createdAt ? format(new Date(user.createdAt), 'MMM dd, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={user.isAdmin ? "outline" : "default"}
                            onClick={() => toggleAdminStatus(user.id, user.isAdmin)}
                            disabled={updatingUser === user.id}
                          >
                            {updatingUser === user.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : user.isAdmin ? (
                              <ShieldOff className="w-4 h-4" />
                            ) : (
                              <ShieldCheck className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteUserId(user.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-usage">
          <div className="space-y-4">
            {/* System Keys Status */}
            <Card>
              <CardHeader>
                <CardTitle>System API Keys Status</CardTitle>
                <CardDescription>
                  Environment variables configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {apiUsage?.systemKeysStatus && Object.entries(apiUsage.systemKeysStatus).map(([key, configured]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Key className={`h-4 w-4 ${configured ? 'text-green-500' : 'text-gray-400'}`} />
                      <span className="text-sm font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <Badge variant={configured ? "default" : "secondary"}>
                        {configured ? 'Active' : 'Not Set'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Usage by Provider */}
            <Card>
              <CardHeader>
                <CardTitle>Usage by AI Provider</CardTitle>
                <CardDescription>
                  Total usage across all system API keys
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Requests</TableHead>
                      <TableHead>Tokens Used</TableHead>
                      <TableHead>Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiUsage?.providerCosts && Object.entries(apiUsage.providerCosts).map(([provider, data]: [string, any]) => (
                      <TableRow key={provider}>
                        <TableCell className="font-medium capitalize">{provider}</TableCell>
                        <TableCell>{formatNumber(data.requests)}</TableCell>
                        <TableCell>{formatNumber(data.tokens)}</TableCell>
                        <TableCell>{formatCost(data.costCents)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Usage by Model/Operation */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Usage Breakdown</CardTitle>
                <CardDescription>
                  Usage by model and operation type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model</TableHead>
                      <TableHead>Operation</TableHead>
                      <TableHead>Requests</TableHead>
                      <TableHead>Tokens</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Last Used</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiUsage?.usageByModel?.map((usage: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{usage.model}</TableCell>
                        <TableCell>{usage.operation}</TableCell>
                        <TableCell>{usage.usageCount}</TableCell>
                        <TableCell>{formatNumber(usage.totalTokens)}</TableCell>
                        <TableCell>{formatCost(usage.totalCostCents)}</TableCell>
                        <TableCell>
                          {usage.lastUsed ? format(new Date(usage.lastUsed), 'MMM dd, HH:mm') : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Daily Usage Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Daily Usage</CardTitle>
                <CardDescription>
                  API usage over the last 7 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Requests</TableHead>
                      <TableHead>Tokens</TableHead>
                      <TableHead>Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiUsage?.dailyUsage?.slice(0, 7).map((day: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {format(new Date(day.date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>{day.requests}</TableCell>
                        <TableCell>{formatNumber(day.totalTokens)}</TableCell>
                        <TableCell>{formatCost(day.totalCostCents)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="user-api-usage">
          <div className="space-y-4">
            {/* API Key Usage Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Key Usage</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCost(userApiUsage?.systemKeyTotalCost || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(userApiUsage?.systemKeyTotalRequests || 0)} requests
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">User Key Usage</CardTitle>
                  <Key className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCost(userApiUsage?.userKeyTotalCost || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(userApiUsage?.userKeyTotalRequests || 0)} requests
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cost Distribution</CardTitle>
                  <BarChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Progress 
                        value={
                          userApiUsage?.systemKeyTotalCost && userApiUsage?.userKeyTotalCost
                            ? (userApiUsage.systemKeyTotalCost / (userApiUsage.systemKeyTotalCost + userApiUsage.userKeyTotalCost)) * 100
                            : 0
                        } 
                        className="h-2"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {userApiUsage?.systemKeyTotalCost && userApiUsage?.userKeyTotalCost
                        ? Math.round((userApiUsage.systemKeyTotalCost / (userApiUsage.systemKeyTotalCost + userApiUsage.userKeyTotalCost)) * 100)
                        : 0}% System
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total Combined: {formatCost((userApiUsage?.systemKeyTotalCost || 0) + (userApiUsage?.userKeyTotalCost || 0))}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* User API Usage Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>API Usage by User</CardTitle>
                    <CardDescription>
                      Individual user API consumption and costs
                    </CardDescription>
                  </div>
                  <Button
                    onClick={downloadAllUsersReport}
                    disabled={downloadingReport === 'all'}
                    variant="outline"
                  >
                    {downloadingReport === 'all' ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileDown className="w-4 h-4 mr-2" />
                    )}
                    Download All Reports
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Total Requests</TableHead>
                      <TableHead>Tokens Used</TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userApiUsage?.userUsage?.map((user: any) => (
                      <TableRow key={user.userId}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.email || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span>{formatNumber(user.requestCount)}</span>
                            </div>
                            {user.userKeyRequests > 0 && (
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="text-xs">
                                  <Key className="w-3 h-3 mr-1" />
                                  User: {formatNumber(user.userKeyRequests)}
                                </Badge>
                              </div>
                            )}
                            {user.systemKeyRequests > 0 && (
                              <div className="flex items-center gap-1">
                                <Badge variant="secondary" className="text-xs">
                                  <Shield className="w-3 h-3 mr-1" />
                                  System: {formatNumber(user.systemKeyRequests)}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatNumber(user.totalTokens)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-semibold">
                              {formatCost(user.totalCostCents)}
                            </div>
                            {user.userKeyCostCents > 0 && (
                              <div className="text-xs text-muted-foreground">
                                User: {formatCost(user.userKeyCostCents)}
                              </div>
                            )}
                            {user.systemKeyCostCents > 0 && (
                              <div className="text-xs text-muted-foreground">
                                System: {formatCost(user.systemKeyCostCents)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.lastUsed ? format(new Date(user.lastUsed), 'MMM dd, HH:mm') : 'Never'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedUserId(user.userId)}
                            >
                              <Activity className="w-4 h-4 mr-1" />
                              Details
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadUserReport(user.userId)}
                              disabled={downloadingReport === user.userId}
                            >
                              {downloadingReport === user.userId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Monthly User Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Current Month Usage by User</CardTitle>
                <CardDescription>
                  {userApiUsage?.billingPeriod && 
                    `${format(new Date(userApiUsage.billingPeriod.start), 'MMM dd')} - ${format(new Date(userApiUsage.billingPeriod.end), 'MMM dd, yyyy')}`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Monthly Requests</TableHead>
                      <TableHead>Monthly Tokens</TableHead>
                      <TableHead>Monthly Cost</TableHead>
                      <TableHead>% of Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userApiUsage?.monthlyUserUsage?.map((user: any) => {
                      const totalMonthlyCost = userApiUsage.monthlyUserUsage.reduce(
                        (sum: number, u: any) => sum + (u.monthlyCostCents || 0), 0
                      );
                      const percentage = totalMonthlyCost > 0 
                        ? ((user.monthlyCostCents / totalMonthlyCost) * 100).toFixed(1)
                        : '0';
                      
                      return (
                        <TableRow key={user.userId}>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div>{formatNumber(user.monthlyRequests)}</div>
                              <div className="flex gap-2">
                                {user.monthlyUserKeyRequests > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    <Key className="w-3 h-3 mr-1" />
                                    {formatNumber(user.monthlyUserKeyRequests)}
                                  </Badge>
                                )}
                                {user.monthlySystemKeyRequests > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Shield className="w-3 h-3 mr-1" />
                                    {formatNumber(user.monthlySystemKeyRequests)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{formatNumber(user.monthlyTokens)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-semibold">
                                {formatCost(user.monthlyCostCents)}
                              </div>
                              <div className="text-xs space-y-0.5">
                                {user.monthlyUserKeyCostCents > 0 && (
                                  <div className="text-muted-foreground">
                                    User: {formatCost(user.monthlyUserKeyCostCents)}
                                  </div>
                                )}
                                {user.monthlySystemKeyCostCents > 0 && (
                                  <div className="text-muted-foreground">
                                    System: {formatCost(user.monthlySystemKeyCostCents)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={Math.min(100, parseFloat(percentage))} 
                                className="w-20 h-2"
                              />
                              <span className="text-sm">{percentage}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* User Details Dialog */}
      <Dialog open={!!selectedUserId} onOpenChange={() => setSelectedUserId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User API Usage Details</DialogTitle>
            <DialogDescription>
              {selectedUserDetails?.user?.username} - {selectedUserDetails?.user?.email}
            </DialogDescription>
          </DialogHeader>
          
          {loadingUserDetails ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : selectedUserDetails && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Cost</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">
                      {formatCost(selectedUserDetails.summary?.totalCostCents || 0)}
                    </div>
                    <div className="space-y-1 mt-2">
                      {selectedUserDetails.summary?.userKeyCostCents > 0 && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Key className="w-3 h-3" />
                          User: {formatCost(selectedUserDetails.summary.userKeyCostCents)}
                        </div>
                      )}
                      {selectedUserDetails.summary?.systemKeyCostCents > 0 && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          System: {formatCost(selectedUserDetails.summary.systemKeyCostCents)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">
                      {formatNumber(selectedUserDetails.summary?.totalRequests || 0)}
                    </div>
                    <div className="space-y-1 mt-2">
                      {selectedUserDetails.summary?.userKeyRequests > 0 && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Key className="w-3 h-3" />
                          User: {formatNumber(selectedUserDetails.summary.userKeyRequests)}
                        </div>
                      )}
                      {selectedUserDetails.summary?.systemKeyRequests > 0 && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          System: {formatNumber(selectedUserDetails.summary.systemKeyRequests)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Tokens</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">
                      {formatNumber(selectedUserDetails.summary?.totalTokens || 0)}
                    </div>
                    <div className="space-y-1 mt-2">
                      {selectedUserDetails.summary?.userKeyTokens > 0 && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Key className="w-3 h-3" />
                          User: {formatNumber(selectedUserDetails.summary.userKeyTokens)}
                        </div>
                      )}
                      {selectedUserDetails.summary?.systemKeyTokens > 0 && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          System: {formatNumber(selectedUserDetails.summary.systemKeyTokens)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Usage by Model */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Usage by Model</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model</TableHead>
                        <TableHead>Key Source</TableHead>
                        <TableHead>Requests</TableHead>
                        <TableHead>Tokens</TableHead>
                        <TableHead>Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedUserDetails.modelUsage?.map((model: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{model.model}</TableCell>
                          <TableCell>
                            <Badge variant={model.keySource === 'user' ? 'outline' : 'secondary'} className="text-xs">
                              {model.keySource === 'user' ? (
                                <>
                                  <Key className="w-3 h-3 mr-1" />
                                  User Key
                                </>
                              ) : (
                                <>
                                  <Shield className="w-3 h-3 mr-1" />
                                  System Key
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>{model.requests}</TableCell>
                          <TableCell>{formatNumber(model.tokens)}</TableCell>
                          <TableCell>{formatCost(model.costCents)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Usage by Operation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Usage by Operation</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Operation</TableHead>
                        <TableHead>Key Source</TableHead>
                        <TableHead>Requests</TableHead>
                        <TableHead>Tokens</TableHead>
                        <TableHead>Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedUserDetails.operationUsage?.map((op: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{op.operation}</TableCell>
                          <TableCell>
                            <Badge variant={op.keySource === 'user' ? 'outline' : 'secondary'} className="text-xs">
                              {op.keySource === 'user' ? (
                                <>
                                  <Key className="w-3 h-3 mr-1" />
                                  User Key
                                </>
                              ) : (
                                <>
                                  <Shield className="w-3 h-3 mr-1" />
                                  System Key
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>{op.requests}</TableCell>
                          <TableCell>{formatNumber(op.tokens)}</TableCell>
                          <TableCell>{formatCost(op.costCents)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this user and all their data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUser} className="bg-destructive text-destructive-foreground">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


// import { useState, useEffect } from "react";
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { 
//   Loader2, 
//   Users, 
//   Globe, 
//   FileText, 
//   ChartBar, 
//   Shield, 
//   Trash2, 
//   ShieldCheck, 
//   ShieldOff, 
//   Key, 
//   DollarSign, 
//   Activity,
//   TrendingUp,
//   TrendingDown,
//   AlertCircle,
//   Download,
//   FileDown
// } from "lucide-react";
// import { format } from "date-fns";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import {
//   Tabs,
//   TabsContent,
//   TabsList,
//   TabsTrigger,
// } from "@/components/ui/tabs";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "@/components/ui/alert-dialog";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { useToast } from "@/hooks/use-toast";
// import { Progress } from "@/components/ui/progress";
// import { jsPDF } from "jspdf";
// import autoTable from 'jspdf-autotable';

// export default function AdminPanel() {
//   const [loading, setLoading] = useState(true);
//   const [stats, setStats] = useState<any>(null);
//   const [users, setUsers] = useState<any[]>([]);
//   const [apiUsage, setApiUsage] = useState<any>(null);
//   const [userApiUsage, setUserApiUsage] = useState<any>(null);
//   const [selectedUserDetails, setSelectedUserDetails] = useState<any>(null);
//   const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
//   const [updatingUser, setUpdatingUser] = useState<string | null>(null);
//   const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
//   const [loadingUserDetails, setLoadingUserDetails] = useState(false);
//   const [downloadingReport, setDownloadingReport] = useState<string | null>(null);
//   const { toast } = useToast();

//   useEffect(() => {
//     fetchData();
//   }, []);

//   useEffect(() => {
//     if (selectedUserId) {
//       fetchUserDetails(selectedUserId);
//     }
//   }, [selectedUserId]);

//   const fetchData = async () => {
//     try {
//       const [statsRes, usersRes, apiUsageRes, userApiUsageRes] = await Promise.all([
//         fetch('/api/admin/statistics', { credentials: 'include' }),
//         fetch('/api/admin/users', { credentials: 'include' }),
//         fetch('/api/admin/system-api-usage', { credentials: 'include' }),
//         fetch('/api/admin/users-api-usage', { credentials: 'include' })
//       ]);

//       if (!statsRes.ok || !usersRes.ok || !apiUsageRes.ok || !userApiUsageRes.ok) {
//         if (statsRes.status === 403 || usersRes.status === 403 || apiUsageRes.status === 403 || userApiUsageRes.status === 403) {
//           toast({
//             title: "Access Denied",
//             description: "You don't have permission to access the admin panel",
//             variant: "destructive"
//           });
//           return;
//         }
//         throw new Error('Failed to fetch admin data');
//       }

//       const [statsData, usersData, apiUsageData, userApiUsageData] = await Promise.all([
//         statsRes.json(),
//         usersRes.json(),
//         apiUsageRes.json(),
//         userApiUsageRes.json()
//       ]);

//       setStats(statsData);
//       setUsers(usersData);
//       setApiUsage(apiUsageData);
//       setUserApiUsage(userApiUsageData);
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: "Failed to load admin data",
//         variant: "destructive"
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchUserDetails = async (userId: string) => {
//     setLoadingUserDetails(true);
//     try {
//       const res = await fetch(`/api/admin/users/${userId}/api-usage`, { 
//         credentials: 'include' 
//       });
      
//       if (!res.ok) {
//         throw new Error('Failed to fetch user details');
//       }
      
//       const data = await res.json();
//       setSelectedUserDetails(data);
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: "Failed to load user API usage details",
//         variant: "destructive"
//       });
//     } finally {
//       setLoadingUserDetails(false);
//     }
//   };

//   const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
//     setUpdatingUser(userId);
//     try {
//       const res = await fetch(`/api/admin/users/${userId}/admin-status`, {
//         method: 'PUT',
//         credentials: 'include',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ isAdmin: !currentStatus })
//       });

//       if (!res.ok) {
//         const error = await res.json();
//         throw new Error(error.message);
//       }

//       const updatedUser = await res.json();
//       setUsers(users.map(u => u.id === userId ? updatedUser : u));
      
//       toast({
//         title: "Success",
//         description: `Admin status ${!currentStatus ? 'granted' : 'removed'} successfully`
//       });
//     } catch (error: any) {
//       toast({
//         title: "Error",
//         description: error.message || "Failed to update admin status",
//         variant: "destructive"
//       });
//     } finally {
//       setUpdatingUser(null);
//     }
//   };

//   const deleteUser = async () => {
//     if (!deleteUserId) return;

//     try {
//       const res = await fetch(`/api/admin/users/${deleteUserId}`, {
//         method: 'DELETE',
//         credentials: 'include'
//       });

//       if (!res.ok) {
//         const error = await res.json();
//         throw new Error(error.message);
//       }

//       setUsers(users.filter(u => u.id !== deleteUserId));
//       toast({
//         title: "Success",
//         description: "User deleted successfully"
//       });
//     } catch (error: any) {
//       toast({
//         title: "Error",
//         description: error.message || "Failed to delete user",
//         variant: "destructive"
//       });
//     } finally {
//       setDeleteUserId(null);
//     }
//   };

//   const formatCost = (cents: number) => {
//     return `$${(cents / 100).toFixed(2)}`;
//   };

//   const formatNumber = (num: number) => {
//     return num.toLocaleString();
//   };

//   // Generate PDF report for a single user
//   const downloadUserReport = async (userId: string) => {
//     setDownloadingReport(userId);
//     try {
//       // Fetch detailed user data
//       const res = await fetch(`/api/admin/users/${userId}/api-usage`, { 
//         credentials: 'include' 
//       });
      
//       if (!res.ok) {
//         throw new Error('Failed to fetch user details');
//       }
      
//       const userDetails = await res.json();
//       const user = userApiUsage?.userUsage?.find((u: any) => u.userId === userId);
      
//       // Create PDF
//       const doc = new jsPDF();
      
//       // Add logo/header background
//       doc.setFillColor(240, 240, 240);
//       doc.rect(0, 0, 210, 30, 'F');
      
//       // Header
//       doc.setFontSize(20);
//       doc.setTextColor(33, 33, 33);
//       doc.text('API Usage Report', 105, 20, { align: 'center' });
      
//       // User Info Section
//       doc.setFontSize(14);
//       doc.setTextColor(66, 66, 66);
//       doc.text('User Information', 14, 45);
      
//       doc.setFontSize(11);
//       doc.setTextColor(100, 100, 100);
//       doc.text(`Username: `, 14, 55);
//       doc.setTextColor(33, 33, 33);
//       doc.text(`${user?.username || 'N/A'}`, 40, 55);
      
//       doc.setTextColor(100, 100, 100);
//       doc.text(`Email: `, 14, 62);
//       doc.setTextColor(33, 33, 33);
//       doc.text(`${user?.email || 'N/A'}`, 30, 62);
      
//       doc.setTextColor(100, 100, 100);
//       doc.text(`Generated: `, 14, 69);
//       doc.setTextColor(33, 33, 33);
//       doc.text(`${format(new Date(), 'MMMM dd, yyyy HH:mm')}`, 40, 69);
      
//       // Summary Section with background
//       doc.setFillColor(250, 250, 250);
//       doc.rect(10, 80, 190, 30, 'F');
      
//       doc.setFontSize(14);
//       doc.setTextColor(66, 66, 66);
//       doc.text('Usage Summary', 14, 90);
      
//       doc.setFontSize(10);
//       doc.setTextColor(33, 33, 33);
//       doc.text(`Total Requests: ${formatNumber(userDetails.summary?.totalRequests || 0)}`, 14, 100);
//       doc.text(`Total Tokens: ${formatNumber(userDetails.summary?.totalTokens || 0)}`, 75, 100);
//       doc.text(`Total Cost: ${formatCost(userDetails.summary?.totalCostCents || 0)}`, 140, 100);
      
//       // Usage by Model Table
//       let yPosition = 120;
      
//       if (userDetails.modelUsage && userDetails.modelUsage.length > 0) {
//         doc.setFontSize(12);
//         doc.setTextColor(66, 66, 66);
//         doc.text('Usage by Model', 14, yPosition);
        
//         autoTable(doc, {
//           startY: yPosition + 5,
//           head: [['Model', 'Key Source', 'Requests', 'Tokens', 'Cost']],
//           body: userDetails.modelUsage.map((model: any) => [
//             model.model,
//             model.keySource === 'user' ? 'User Key' : 'System Key',
//             model.requests.toString(),
//             formatNumber(model.tokens),
//             formatCost(model.costCents)
//           ]),
//           theme: 'grid',
//           headStyles: { 
//             fillColor: [66, 66, 66],
//             textColor: [255, 255, 255],
//             fontSize: 10
//           },
//           bodyStyles: {
//             fontSize: 9,
//             textColor: [33, 33, 33]
//           },
//           alternateRowStyles: {
//             fillColor: [250, 250, 250]
//           },
//           margin: { left: 14, right: 14 }
//         });
        
//         yPosition = (doc as any).lastAutoTable.finalY + 15;
//       }
      
//       // Usage by Operation Table
//       if (userDetails.operationUsage && userDetails.operationUsage.length > 0) {
//         doc.setFontSize(12);
//         doc.setTextColor(66, 66, 66);
//         doc.text('Usage by Operation', 14, yPosition);
        
//         autoTable(doc, {
//           startY: yPosition + 5,
//           head: [['Operation', 'Key Source', 'Requests', 'Tokens', 'Cost']],
//           body: userDetails.operationUsage.map((op: any) => [
//             op.operation,
//             op.keySource === 'user' ? 'User Key' : 'System Key',
//             op.requests.toString(),
//             formatNumber(op.tokens),
//             formatCost(op.costCents)
//           ]),
//           theme: 'grid',
//           headStyles: { 
//             fillColor: [66, 66, 66],
//             textColor: [255, 255, 255],
//             fontSize: 10
//           },
//           bodyStyles: {
//             fontSize: 9,
//             textColor: [33, 33, 33]
//           },
//           alternateRowStyles: {
//             fillColor: [250, 250, 250]
//           },
//           margin: { left: 14, right: 14 }
//         });
//       }
      
//       // Footer
//       const pageHeight = doc.internal.pageSize.height;
//       doc.setFontSize(8);
//       doc.setTextColor(150, 150, 150);
//       doc.text(`Page 1 of 1`, 105, pageHeight - 10, { align: 'center' });
      
//       // Save PDF
//       doc.save(`${user?.username || 'user'}_api_usage_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
//       toast({
//         title: "Success",
//         description: "Report downloaded successfully"
//       });
//     } catch (error) {
//       console.error('Error generating PDF:', error);
//       toast({
//         title: "Error",
//         description: "Failed to generate PDF report. Please check console for details.",
//         variant: "destructive"
//       });
//     } finally {
//       setDownloadingReport(null);
//     }
//   };

//   // Generate combined PDF report for all users
//   const downloadAllUsersReport = async () => {
//     setDownloadingReport('all');
//     try {
//       const doc = new jsPDF();
      
//       // Cover Page
//       doc.setFillColor(240, 240, 240);
//       doc.rect(0, 0, 210, 297, 'F');
      
//       doc.setFontSize(32);
//       doc.setTextColor(33, 33, 33);
//       doc.text('API Usage Report', 105, 80, { align: 'center' });
      
//       doc.setFontSize(18);
//       doc.setTextColor(66, 66, 66);
//       doc.text('All Users Summary', 105, 100, { align: 'center' });
      
//       doc.setFontSize(12);
//       doc.setTextColor(100, 100, 100);
//       doc.text(`Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`, 105, 120, { align: 'center' });
      
//       // System Summary Box
//       const totalSystemCost = userApiUsage?.userUsage?.reduce(
//         (sum: number, u: any) => sum + u.totalCostCents, 0
//       ) || 0;
//       const totalSystemRequests = userApiUsage?.userUsage?.reduce(
//         (sum: number, u: any) => sum + u.requestCount, 0
//       ) || 0;
//       const totalSystemTokens = userApiUsage?.userUsage?.reduce(
//         (sum: number, u: any) => sum + u.totalTokens, 0
//       ) || 0;
      
//       doc.setFillColor(255, 255, 255);
//       doc.roundedRect(30, 140, 150, 80, 5, 5, 'F');
      
//       doc.setFontSize(14);
//       doc.setTextColor(66, 66, 66);
//       doc.text('System Overview', 105, 155, { align: 'center' });
      
//       doc.setFontSize(11);
//       doc.setTextColor(33, 33, 33);
//       doc.text(`Total Users: ${userApiUsage?.userUsage?.length || 0}`, 40, 170);
//       doc.text(`Total Requests: ${formatNumber(totalSystemRequests)}`, 40, 180);
//       doc.text(`Total Tokens: ${formatNumber(totalSystemTokens)}`, 40, 190);
//       doc.text(`Total Cost: ${formatCost(totalSystemCost)}`, 40, 200);
      
//       // New page for user data
//       doc.addPage();
//       doc.setFillColor(255, 255, 255);
//       doc.rect(0, 0, 210, 297, 'F');
      
//       doc.setFontSize(16);
//       doc.setTextColor(33, 33, 33);
//       doc.text('User Usage Details', 14, 20);
      
//       // User Usage Table
//       if (userApiUsage?.userUsage && userApiUsage.userUsage.length > 0) {
//         autoTable(doc, {
//           startY: 30,
//           head: [['Username', 'Email', 'Requests', 'Tokens', 'Cost', 'Last Activity']],
//           body: userApiUsage.userUsage.map((user: any) => [
//             user.username,
//             user.email || 'N/A',
//             formatNumber(user.requestCount),
//             formatNumber(user.totalTokens),
//             formatCost(user.totalCostCents),
//             user.lastUsed ? format(new Date(user.lastUsed), 'MMM dd, HH:mm') : 'Never'
//           ]),
//           theme: 'grid',
//           headStyles: { 
//             fillColor: [66, 66, 66],
//             textColor: [255, 255, 255],
//             fontSize: 9
//           },
//           bodyStyles: {
//             fontSize: 8,
//             textColor: [33, 33, 33]
//           },
//           alternateRowStyles: {
//             fillColor: [250, 250, 250]
//           },
//           margin: { left: 14, right: 14 },
//           columnStyles: {
//             0: { cellWidth: 30 },
//             1: { cellWidth: 45 },
//             2: { cellWidth: 25 },
//             3: { cellWidth: 25 },
//             4: { cellWidth: 25 },
//             5: { cellWidth: 30 }
//           }
//         });
//       }
      
//       // Monthly Usage Page
//       if (userApiUsage?.monthlyUserUsage && userApiUsage.monthlyUserUsage.length > 0) {
//         doc.addPage();
        
//         doc.setFontSize(16);
//         doc.setTextColor(33, 33, 33);
//         doc.text('Current Month Usage', 14, 20);
        
//         doc.setFontSize(10);
//         doc.setTextColor(100, 100, 100);
//         doc.text(
//           `Billing Period: ${userApiUsage.billingPeriod ? 
//             `${format(new Date(userApiUsage.billingPeriod.start), 'MMM dd')} - ${format(new Date(userApiUsage.billingPeriod.end), 'MMM dd, yyyy')}` 
//             : 'Current Month'}`,
//           14, 30
//         );
        
//         const totalMonthlyCost = userApiUsage.monthlyUserUsage.reduce(
//           (sum: number, u: any) => sum + u.monthlyCostCents, 0
//         );
        
//         autoTable(doc, {
//           startY: 40,
//           head: [['Username', 'Monthly Requests', 'Monthly Tokens', 'Monthly Cost', '% of Total']],
//           body: userApiUsage.monthlyUserUsage.map((user: any) => {
//             const percentage = totalMonthlyCost > 0 
//               ? ((user.monthlyCostCents / totalMonthlyCost) * 100).toFixed(1)
//               : '0';
//             return [
//               user.username,
//               formatNumber(user.monthlyRequests),
//               formatNumber(user.monthlyTokens),
//               formatCost(user.monthlyCostCents),
//               `${percentage}%`
//             ];
//           }),
//           theme: 'grid',
//           headStyles: { 
//             fillColor: [66, 66, 66],
//             textColor: [255, 255, 255],
//             fontSize: 9
//           },
//           bodyStyles: {
//             fontSize: 8,
//             textColor: [33, 33, 33]
//           },
//           alternateRowStyles: {
//             fillColor: [250, 250, 250]
//           },
//           margin: { left: 14, right: 14 }
//         });
//       }
      
//       // Save PDF
//       doc.save(`all_users_api_usage_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
//       toast({
//         title: "Success",
//         description: "Combined report downloaded successfully"
//       });
//     } catch (error) {
//       console.error('Error generating PDF:', error);
//       toast({
//         title: "Error",
//         description: "Failed to generate PDF report. Please check console for details.",
//         variant: "destructive"
//       });
//     } finally {
//       setDownloadingReport(null);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <Loader2 className="w-8 h-8 animate-spin" />
//       </div>
//     );
//   }

//   const totalMonthlyCost = apiUsage?.monthlyStats?.totalCostCents || 0;
//   const topSpender = userApiUsage?.monthlyUserUsage?.[0];

//   return (
//     <div className="container mx-auto p-6">
//       <div className="mb-6">
//         <h1 className="text-3xl font-bold flex items-center gap-2">
//           <Shield className="w-8 h-8" />
//           Admin Panel
//         </h1>
//         <p className="text-muted-foreground mt-1">
//           System administration and user management
//         </p>
//       </div>

//       {/* Statistics Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Total Users</CardTitle>
//             <Users className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">{stats?.users || 0}</div>
//             <p className="text-xs text-muted-foreground">
//               {stats?.recentActivity?.filter((a: any) => a.type === 'user_created')?.length || 0} new this week
//             </p>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Websites</CardTitle>
//             <Globe className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">{stats?.websites || 0}</div>
//             <p className="text-xs text-muted-foreground">
//               Active sites
//             </p>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Content</CardTitle>
//             <FileText className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">{stats?.content || 0}</div>
//             <p className="text-xs text-muted-foreground">
//               Total posts
//             </p>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Monthly API Cost</CardTitle>
//             <DollarSign className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">
//               {formatCost(totalMonthlyCost)}
//             </div>
//             <p className="text-xs text-muted-foreground">
//               {apiUsage?.monthlyStats?.totalRequests || 0} requests
//             </p>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Top Spender</CardTitle>
//             <TrendingUp className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-lg font-bold truncate">
//               {topSpender?.username || 'N/A'}
//             </div>
//             <p className="text-xs text-muted-foreground">
//               {topSpender ? formatCost(topSpender.monthlyCostCents) : '$0.00'}
//             </p>
//           </CardContent>
//         </Card>
//       </div>

//       <Tabs defaultValue="users" className="space-y-4">
//         <TabsList className="grid w-full grid-cols-3">
//           <TabsTrigger value="users">Users</TabsTrigger>
//           <TabsTrigger value="api-usage">System API Usage</TabsTrigger>
//           <TabsTrigger value="user-api-usage">User API Usage</TabsTrigger>
//         </TabsList>

//         <TabsContent value="users">
//           {/* Users Table */}
//           <Card>
//             <CardHeader>
//               <CardTitle>User Management</CardTitle>
//               <CardDescription>
//                 Manage user accounts and admin permissions
//               </CardDescription>
//             </CardHeader>
//             <CardContent>
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead>Username</TableHead>
//                     <TableHead>Email</TableHead>
//                     <TableHead>Status</TableHead>
//                     <TableHead>Joined</TableHead>
//                     <TableHead>Actions</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {users.map((user) => (
//                     <TableRow key={user.id}>
//                       <TableCell className="font-medium">{user.username}</TableCell>
//                       <TableCell>{user.email || 'N/A'}</TableCell>
//                       <TableCell>
//                         <Badge variant={user.isAdmin ? "default" : "secondary"}>
//                           {user.isAdmin ? 'Admin' : 'User'}
//                         </Badge>
//                       </TableCell>
//                       <TableCell>
//                         {user.createdAt ? format(new Date(user.createdAt), 'MMM dd, yyyy') : 'N/A'}
//                       </TableCell>
//                       <TableCell>
//                         <div className="flex gap-2">
//                           <Button
//                             size="sm"
//                             variant={user.isAdmin ? "outline" : "default"}
//                             onClick={() => toggleAdminStatus(user.id, user.isAdmin)}
//                             disabled={updatingUser === user.id}
//                           >
//                             {updatingUser === user.id ? (
//                               <Loader2 className="w-4 h-4 animate-spin" />
//                             ) : user.isAdmin ? (
//                               <ShieldOff className="w-4 h-4" />
//                             ) : (
//                               <ShieldCheck className="w-4 h-4" />
//                             )}
//                           </Button>
//                           <Button
//                             size="sm"
//                             variant="destructive"
//                             onClick={() => setDeleteUserId(user.id)}
//                           >
//                             <Trash2 className="w-4 h-4" />
//                           </Button>
//                         </div>
//                       </TableCell>
//                     </TableRow>
//                   ))}
//                 </TableBody>
//               </Table>
//             </CardContent>
//           </Card>
//         </TabsContent>

//         <TabsContent value="api-usage">
//           <div className="space-y-4">
//             {/* System Keys Status */}
//             <Card>
//               <CardHeader>
//                 <CardTitle>System API Keys Status</CardTitle>
//                 <CardDescription>
//                   Environment variables configuration
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
//                   {apiUsage?.systemKeysStatus && Object.entries(apiUsage.systemKeysStatus).map(([key, configured]) => (
//                     <div key={key} className="flex items-center gap-2">
//                       <Key className={`h-4 w-4 ${configured ? 'text-green-500' : 'text-gray-400'}`} />
//                       <span className="text-sm font-medium capitalize">
//                         {key.replace(/([A-Z])/g, ' $1').trim()}
//                       </span>
//                       <Badge variant={configured ? "default" : "secondary"}>
//                         {configured ? 'Active' : 'Not Set'}
//                       </Badge>
//                     </div>
//                   ))}
//                 </div>
//               </CardContent>
//             </Card>

//             {/* Usage by Provider */}
//             <Card>
//               <CardHeader>
//                 <CardTitle>Usage by AI Provider</CardTitle>
//                 <CardDescription>
//                   Total usage across all system API keys
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <Table>
//                   <TableHeader>
//                     <TableRow>
//                       <TableHead>Provider</TableHead>
//                       <TableHead>Requests</TableHead>
//                       <TableHead>Tokens Used</TableHead>
//                       <TableHead>Cost</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {apiUsage?.providerCosts && Object.entries(apiUsage.providerCosts).map(([provider, data]: [string, any]) => (
//                       <TableRow key={provider}>
//                         <TableCell className="font-medium capitalize">{provider}</TableCell>
//                         <TableCell>{formatNumber(data.requests)}</TableCell>
//                         <TableCell>{formatNumber(data.tokens)}</TableCell>
//                         <TableCell>{formatCost(data.costCents)}</TableCell>
//                       </TableRow>
//                     ))}
//                   </TableBody>
//                 </Table>
//               </CardContent>
//             </Card>

//             {/* Usage by Model/Operation */}
//             <Card>
//               <CardHeader>
//                 <CardTitle>Detailed Usage Breakdown</CardTitle>
//                 <CardDescription>
//                   Usage by model and operation type
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <Table>
//                   <TableHeader>
//                     <TableRow>
//                       <TableHead>Model</TableHead>
//                       <TableHead>Operation</TableHead>
//                       <TableHead>Requests</TableHead>
//                       <TableHead>Tokens</TableHead>
//                       <TableHead>Cost</TableHead>
//                       <TableHead>Last Used</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {apiUsage?.usageByModel?.map((usage: any, idx: number) => (
//                       <TableRow key={idx}>
//                         <TableCell className="font-medium">{usage.model}</TableCell>
//                         <TableCell>{usage.operation}</TableCell>
//                         <TableCell>{usage.usageCount}</TableCell>
//                         <TableCell>{formatNumber(usage.totalTokens)}</TableCell>
//                         <TableCell>{formatCost(usage.totalCostCents)}</TableCell>
//                         <TableCell>
//                           {usage.lastUsed ? format(new Date(usage.lastUsed), 'MMM dd, HH:mm') : 'N/A'}
//                         </TableCell>
//                       </TableRow>
//                     ))}
//                   </TableBody>
//                 </Table>
//               </CardContent>
//             </Card>

//             {/* Daily Usage Trend */}
//             <Card>
//               <CardHeader>
//                 <CardTitle>Recent Daily Usage</CardTitle>
//                 <CardDescription>
//                   API usage over the last 7 days
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <Table>
//                   <TableHeader>
//                     <TableRow>
//                       <TableHead>Date</TableHead>
//                       <TableHead>Requests</TableHead>
//                       <TableHead>Tokens</TableHead>
//                       <TableHead>Cost</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {apiUsage?.dailyUsage?.slice(0, 7).map((day: any, idx: number) => (
//                       <TableRow key={idx}>
//                         <TableCell className="font-medium">
//                           {format(new Date(day.date), 'MMM dd, yyyy')}
//                         </TableCell>
//                         <TableCell>{day.requests}</TableCell>
//                         <TableCell>{formatNumber(day.totalTokens)}</TableCell>
//                         <TableCell>{formatCost(day.totalCostCents)}</TableCell>
//                       </TableRow>
//                     ))}
//                   </TableBody>
//                 </Table>
//               </CardContent>
//             </Card>
//           </div>
//         </TabsContent>

//         <TabsContent value="user-api-usage">
//           <div className="space-y-4">
//             {/* API Key Usage Summary */}
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
//               <Card>
//                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                   <CardTitle className="text-sm font-medium">System Key Usage</CardTitle>
//                   <Shield className="h-4 w-4 text-muted-foreground" />
//                 </CardHeader>
//                 <CardContent>
//                   <div className="text-2xl font-bold">
//                     {formatCost(userApiUsage?.systemKeyTotalCost || 0)}
//                   </div>
//                   <p className="text-xs text-muted-foreground">
//                     {formatNumber(userApiUsage?.systemKeyTotalRequests || 0)} requests
//                   </p>
//                 </CardContent>
//               </Card>

//               <Card>
//                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                   <CardTitle className="text-sm font-medium">User Key Usage</CardTitle>
//                   <Key className="h-4 w-4 text-muted-foreground" />
//                 </CardHeader>
//                 <CardContent>
//                   <div className="text-2xl font-bold">
//                     {formatCost(userApiUsage?.userKeyTotalCost || 0)}
//                   </div>
//                   <p className="text-xs text-muted-foreground">
//                     {formatNumber(userApiUsage?.userKeyTotalRequests || 0)} requests
//                   </p>
//                 </CardContent>
//               </Card>

//               <Card>
//                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                   <CardTitle className="text-sm font-medium">Cost Distribution</CardTitle>
//                   <ChartBar className="h-4 w-4 text-muted-foreground" />
//                 </CardHeader>
//                 <CardContent>
//                   <div className="flex items-center gap-2">
//                     <div className="flex-1">
//                       <Progress 
//                         value={
//                           userApiUsage?.systemKeyTotalCost && userApiUsage?.userKeyTotalCost
//                             ? (userApiUsage.systemKeyTotalCost / (userApiUsage.systemKeyTotalCost + userApiUsage.userKeyTotalCost)) * 100
//                             : 0
//                         } 
//                         className="h-2"
//                       />
//                     </div>
//                     <span className="text-xs text-muted-foreground">
//                       {userApiUsage?.systemKeyTotalCost && userApiUsage?.userKeyTotalCost
//                         ? Math.round((userApiUsage.systemKeyTotalCost / (userApiUsage.systemKeyTotalCost + userApiUsage.userKeyTotalCost)) * 100)
//                         : 0}% System
//                     </span>
//                   </div>
//                   <p className="text-xs text-muted-foreground mt-1">
//                     Total Combined: {formatCost((userApiUsage?.systemKeyTotalCost || 0) + (userApiUsage?.userKeyTotalCost || 0))}
//                   </p>
//                 </CardContent>
//               </Card>
//             </div>

//             {/* User API Usage Table */}
//             <Card>
//               <CardHeader>
//                 <div className="flex items-center justify-between">
//                   <div>
//                     <CardTitle>API Usage by User</CardTitle>
//                     <CardDescription>
//                       Individual user API consumption and costs
//                     </CardDescription>
//                   </div>
//                   <Button
//                     onClick={downloadAllUsersReport}
//                     disabled={downloadingReport === 'all'}
//                     variant="outline"
//                   >
//                     {downloadingReport === 'all' ? (
//                       <Loader2 className="w-4 h-4 mr-2 animate-spin" />
//                     ) : (
//                       <FileDown className="w-4 h-4 mr-2" />
//                     )}
//                     Download All Reports
//                   </Button>
//                 </div>
//               </CardHeader>
//               <CardContent>
//                 <Table>
//                   <TableHeader>
//                     <TableRow>
//                       <TableHead>User</TableHead>
//                       <TableHead>Email</TableHead>
//                       <TableHead>Total Requests</TableHead>
//                       <TableHead>Tokens Used</TableHead>
//                       <TableHead>Total Cost</TableHead>
//                       <TableHead>Last Activity</TableHead>
//                       <TableHead>Actions</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {userApiUsage?.userUsage?.map((user: any) => (
//                       <TableRow key={user.userId}>
//                         <TableCell className="font-medium">{user.username}</TableCell>
//                         <TableCell>{user.email || 'N/A'}</TableCell>
//                         <TableCell>
//                           <div className="space-y-1">
//                             <div className="flex items-center gap-2">
//                               <span>{formatNumber(user.requestCount)}</span>
//                             </div>
//                             {user.userKeyRequests > 0 && (
//                               <div className="flex items-center gap-1">
//                                 <Badge variant="outline" className="text-xs">
//                                   <Key className="w-3 h-3 mr-1" />
//                                   User: {formatNumber(user.userKeyRequests)}
//                                 </Badge>
//                               </div>
//                             )}
//                             {user.systemKeyRequests > 0 && (
//                               <div className="flex items-center gap-1">
//                                 <Badge variant="secondary" className="text-xs">
//                                   <Shield className="w-3 h-3 mr-1" />
//                                   System: {formatNumber(user.systemKeyRequests)}
//                                 </Badge>
//                               </div>
//                             )}
//                           </div>
//                         </TableCell>
//                         <TableCell>{formatNumber(user.totalTokens)}</TableCell>
//                         <TableCell>
//                           <div className="space-y-1">
//                             <div className="font-semibold">
//                               {formatCost(user.totalCostCents)}
//                             </div>
//                             {user.userKeyCostCents > 0 && (
//                               <div className="text-xs text-muted-foreground">
//                                 User: {formatCost(user.userKeyCostCents)}
//                               </div>
//                             )}
//                             {user.systemKeyCostCents > 0 && (
//                               <div className="text-xs text-muted-foreground">
//                                 System: {formatCost(user.systemKeyCostCents)}
//                               </div>
//                             )}
//                           </div>
//                         </TableCell>
//                         <TableCell>
//                           {user.lastUsed ? format(new Date(user.lastUsed), 'MMM dd, HH:mm') : 'Never'}
//                         </TableCell>
//                         <TableCell>
//                           <div className="flex gap-2">
//                             <Button
//                               size="sm"
//                               variant="outline"
//                               onClick={() => setSelectedUserId(user.userId)}
//                             >
//                               <Activity className="w-4 h-4 mr-1" />
//                               Details
//                             </Button>
//                             <Button
//                               size="sm"
//                               variant="outline"
//                               onClick={() => downloadUserReport(user.userId)}
//                               disabled={downloadingReport === user.userId}
//                             >
//                               {downloadingReport === user.userId ? (
//                                 <Loader2 className="w-4 h-4 animate-spin" />
//                               ) : (
//                                 <Download className="w-4 h-4" />
//                               )}
//                             </Button>
//                           </div>
//                         </TableCell>
//                       </TableRow>
//                     ))}
//                   </TableBody>
//                 </Table>
//               </CardContent>
//             </Card>

//             {/* Monthly User Usage */}
//             <Card>
//               <CardHeader>
//                 <CardTitle>Current Month Usage by User</CardTitle>
//                 <CardDescription>
//                   {userApiUsage?.billingPeriod && 
//                     `${format(new Date(userApiUsage.billingPeriod.start), 'MMM dd')} - ${format(new Date(userApiUsage.billingPeriod.end), 'MMM dd, yyyy')}`
//                   }
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <Table>
//                   <TableHeader>
//                     <TableRow>
//                       <TableHead>User</TableHead>
//                       <TableHead>Monthly Requests</TableHead>
//                       <TableHead>Monthly Tokens</TableHead>
//                       <TableHead>Monthly Cost</TableHead>
//                       <TableHead>% of Total</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {userApiUsage?.monthlyUserUsage?.map((user: any) => {
//                       const totalMonthlyCost = userApiUsage.monthlyUserUsage.reduce(
//                         (sum: number, u: any) => sum + u.monthlyCostCents, 0
//                       );
//                       const percentage = totalMonthlyCost > 0 
//                         ? ((user.monthlyCostCents / totalMonthlyCost) * 100).toFixed(1)
//                         : '0';
                      
//                       return (
//                         <TableRow key={user.userId}>
//                           <TableCell className="font-medium">{user.username}</TableCell>
//                           <TableCell>
//                             <div className="space-y-1">
//                               <div>{formatNumber(user.monthlyRequests)}</div>
//                               <div className="flex gap-2">
//                                 {user.monthlyUserKeyRequests > 0 && (
//                                   <Badge variant="outline" className="text-xs">
//                                     <Key className="w-3 h-3 mr-1" />
//                                     {formatNumber(user.monthlyUserKeyRequests)}
//                                   </Badge>
//                                 )}
//                                 {user.monthlySystemKeyRequests > 0 && (
//                                   <Badge variant="secondary" className="text-xs">
//                                     <Shield className="w-3 h-3 mr-1" />
//                                     {formatNumber(user.monthlySystemKeyRequests)}
//                                   </Badge>
//                                 )}
//                               </div>
//                             </div>
//                           </TableCell>
//                           <TableCell>{formatNumber(user.monthlyTokens)}</TableCell>
//                           <TableCell>
//                             <div className="space-y-1">
//                               <div className="font-semibold">
//                                 {formatCost(user.monthlyCostCents)}
//                               </div>
//                               <div className="text-xs space-y-0.5">
//                                 {user.monthlyUserKeyCostCents > 0 && (
//                                   <div className="text-muted-foreground">
//                                     User: {formatCost(user.monthlyUserKeyCostCents)}
//                                   </div>
//                                 )}
//                                 {user.monthlySystemKeyCostCents > 0 && (
//                                   <div className="text-muted-foreground">
//                                     System: {formatCost(user.monthlySystemKeyCostCents)}
//                                   </div>
//                                 )}
//                               </div>
//                             </div>
//                           </TableCell>
//                           <TableCell>
//                             <div className="flex items-center gap-2">
//                               <Progress 
//                                 value={Math.min(100, parseFloat(percentage))} 
//                                 className="w-20 h-2"
//                               />
//                               <span className="text-sm">{percentage}%</span>
//                             </div>
//                           </TableCell>
//                         </TableRow>
//                       );
//                     })}
//                   </TableBody>
//                 </Table>
//               </CardContent>
//             </Card>
//           </div>
//         </TabsContent>
//       </Tabs>

//       {/* User Details Dialog */}
//       <Dialog open={!!selectedUserId} onOpenChange={() => setSelectedUserId(null)}>
//         <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
//           <DialogHeader>
//             <DialogTitle>User API Usage Details</DialogTitle>
//             <DialogDescription>
//               {selectedUserDetails?.user?.username} - {selectedUserDetails?.user?.email}
//             </DialogDescription>
//           </DialogHeader>
          
//           {loadingUserDetails ? (
//             <div className="flex justify-center p-8">
//               <Loader2 className="w-8 h-8 animate-spin" />
//             </div>
//           ) : selectedUserDetails && (
//             <div className="space-y-4">
//               {/* Summary Stats */}
//               <div className="grid grid-cols-3 gap-4">
//                 <Card>
//                   <CardHeader className="pb-2">
//                     <CardTitle className="text-sm">Total Cost</CardTitle>
//                   </CardHeader>
//                   <CardContent>
//                     <div className="text-xl font-bold">
//                       {formatCost(selectedUserDetails.summary?.totalCostCents || 0)}
//                     </div>
//                     <div className="space-y-1 mt-2">
//                       {selectedUserDetails.summary?.userKeyCostCents > 0 && (
//                         <div className="text-xs text-muted-foreground flex items-center gap-1">
//                           <Key className="w-3 h-3" />
//                           User: {formatCost(selectedUserDetails.summary.userKeyCostCents)}
//                         </div>
//                       )}
//                       {selectedUserDetails.summary?.systemKeyCostCents > 0 && (
//                         <div className="text-xs text-muted-foreground flex items-center gap-1">
//                           <Shield className="w-3 h-3" />
//                           System: {formatCost(selectedUserDetails.summary.systemKeyCostCents)}
//                         </div>
//                       )}
//                     </div>
//                   </CardContent>
//                 </Card>
//                 <Card>
//                   <CardHeader className="pb-2">
//                     <CardTitle className="text-sm">Total Requests</CardTitle>
//                   </CardHeader>
//                   <CardContent>
//                     <div className="text-xl font-bold">
//                       {formatNumber(selectedUserDetails.summary?.totalRequests || 0)}
//                     </div>
//                     <div className="space-y-1 mt-2">
//                       {selectedUserDetails.summary?.userKeyRequests > 0 && (
//                         <div className="text-xs text-muted-foreground flex items-center gap-1">
//                           <Key className="w-3 h-3" />
//                           User: {formatNumber(selectedUserDetails.summary.userKeyRequests)}
//                         </div>
//                       )}
//                       {selectedUserDetails.summary?.systemKeyRequests > 0 && (
//                         <div className="text-xs text-muted-foreground flex items-center gap-1">
//                           <Shield className="w-3 h-3" />
//                           System: {formatNumber(selectedUserDetails.summary.systemKeyRequests)}
//                         </div>
//                       )}
//                     </div>
//                   </CardContent>
//                 </Card>
//                 <Card>
//                   <CardHeader className="pb-2">
//                     <CardTitle className="text-sm">Total Tokens</CardTitle>
//                   </CardHeader>
//                   <CardContent>
//                     <div className="text-xl font-bold">
//                       {formatNumber(selectedUserDetails.summary?.totalTokens || 0)}
//                     </div>
//                     <div className="space-y-1 mt-2">
//                       {selectedUserDetails.summary?.userKeyTokens > 0 && (
//                         <div className="text-xs text-muted-foreground flex items-center gap-1">
//                           <Key className="w-3 h-3" />
//                           User: {formatNumber(selectedUserDetails.summary.userKeyTokens)}
//                         </div>
//                       )}
//                       {selectedUserDetails.summary?.systemKeyTokens > 0 && (
//                         <div className="text-xs text-muted-foreground flex items-center gap-1">
//                           <Shield className="w-3 h-3" />
//                           System: {formatNumber(selectedUserDetails.summary.systemKeyTokens)}
//                         </div>
//                       )}
//                     </div>
//                   </CardContent>
//                 </Card>
//               </div>

//               {/* Usage by Model */}
//               <Card>
//                 <CardHeader>
//                   <CardTitle className="text-sm">Usage by Model</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <Table>
//                     <TableHeader>
//                       <TableRow>
//                         <TableHead>Model</TableHead>
//                         <TableHead>Key Source</TableHead>
//                         <TableHead>Requests</TableHead>
//                         <TableHead>Tokens</TableHead>
//                         <TableHead>Cost</TableHead>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {selectedUserDetails.modelUsage?.map((model: any, idx: number) => (
//                         <TableRow key={idx}>
//                           <TableCell>{model.model}</TableCell>
//                           <TableCell>
//                             <Badge variant={model.keySource === 'user' ? 'outline' : 'secondary'} className="text-xs">
//                               {model.keySource === 'user' ? (
//                                 <>
//                                   <Key className="w-3 h-3 mr-1" />
//                                   User Key
//                                 </>
//                               ) : (
//                                 <>
//                                   <Shield className="w-3 h-3 mr-1" />
//                                   System Key
//                                 </>
//                               )}
//                             </Badge>
//                           </TableCell>
//                           <TableCell>{model.requests}</TableCell>
//                           <TableCell>{formatNumber(model.tokens)}</TableCell>
//                           <TableCell>{formatCost(model.costCents)}</TableCell>
//                         </TableRow>
//                       ))}
//                     </TableBody>
//                   </Table>
//                 </CardContent>
//               </Card>

//               {/* Usage by Operation */}
//               <Card>
//                 <CardHeader>
//                   <CardTitle className="text-sm">Usage by Operation</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <Table>
//                     <TableHeader>
//                       <TableRow>
//                         <TableHead>Operation</TableHead>
//                         <TableHead>Key Source</TableHead>
//                         <TableHead>Requests</TableHead>
//                         <TableHead>Tokens</TableHead>
//                         <TableHead>Cost</TableHead>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {selectedUserDetails.operationUsage?.map((op: any, idx: number) => (
//                         <TableRow key={idx}>
//                           <TableCell>{op.operation}</TableCell>
//                           <TableCell>
//                             <Badge variant={op.keySource === 'user' ? 'outline' : 'secondary'} className="text-xs">
//                               {op.keySource === 'user' ? (
//                                 <>
//                                   <Key className="w-3 h-3 mr-1" />
//                                   User Key
//                                 </>
//                               ) : (
//                                 <>
//                                   <Shield className="w-3 h-3 mr-1" />
//                                   System Key
//                                 </>
//                               )}
//                             </Badge>
//                           </TableCell>
//                           <TableCell>{op.requests}</TableCell>
//                           <TableCell>{formatNumber(op.tokens)}</TableCell>
//                           <TableCell>{formatCost(op.costCents)}</TableCell>
//                         </TableRow>
//                       ))}
//                     </TableBody>
//                   </Table>
//                 </CardContent>
//               </Card>
//             </div>
//           )}
//         </DialogContent>
//       </Dialog>

//       {/* Delete Confirmation Dialog */}
//       <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>Are you sure?</AlertDialogTitle>
//             <AlertDialogDescription>
//               This will permanently delete this user and all their data. This action cannot be undone.
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel>Cancel</AlertDialogCancel>
//             <AlertDialogAction onClick={deleteUser} className="bg-destructive text-destructive-foreground">
//               Delete User
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
//     </div>
//   );
// }








// import { useState, useEffect } from "react";
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { 
//   Loader2, 
//   Users, 
//   Globe, 
//   FileText, 
//   ChartBar, 
//   Shield, 
//   Trash2, 
//   ShieldCheck, 
//   ShieldOff, 
//   Key, 
//   DollarSign, 
//   Activity,
//   TrendingUp,
//   TrendingDown,
//   AlertCircle
// } from "lucide-react";
// import { format } from "date-fns";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import {
//   Tabs,
//   TabsContent,
//   TabsList,
//   TabsTrigger,
// } from "@/components/ui/tabs";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "@/components/ui/alert-dialog";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { useToast } from "@/hooks/use-toast";
// import { Progress } from "@/components/ui/progress";

// export default function AdminPanel() {
//   const [loading, setLoading] = useState(true);
//   const [stats, setStats] = useState<any>(null);
//   const [users, setUsers] = useState<any[]>([]);
//   const [apiUsage, setApiUsage] = useState<any>(null);
//   const [userApiUsage, setUserApiUsage] = useState<any>(null);
//   const [selectedUserDetails, setSelectedUserDetails] = useState<any>(null);
//   const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
//   const [updatingUser, setUpdatingUser] = useState<string | null>(null);
//   const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
//   const [loadingUserDetails, setLoadingUserDetails] = useState(false);
//   const { toast } = useToast();

//   useEffect(() => {
//     fetchData();
//   }, []);

//   useEffect(() => {
//     if (selectedUserId) {
//       fetchUserDetails(selectedUserId);
//     }
//   }, [selectedUserId]);

//   const fetchData = async () => {
//     try {
//       const [statsRes, usersRes, apiUsageRes, userApiUsageRes] = await Promise.all([
//         fetch('/api/admin/statistics', { credentials: 'include' }),
//         fetch('/api/admin/users', { credentials: 'include' }),
//         fetch('/api/admin/system-api-usage', { credentials: 'include' }),
//         fetch('/api/admin/users-api-usage', { credentials: 'include' })
//       ]);

//       if (!statsRes.ok || !usersRes.ok || !apiUsageRes.ok || !userApiUsageRes.ok) {
//         if (statsRes.status === 403 || usersRes.status === 403 || apiUsageRes.status === 403 || userApiUsageRes.status === 403) {
//           toast({
//             title: "Access Denied",
//             description: "You don't have permission to access the admin panel",
//             variant: "destructive"
//           });
//           return;
//         }
//         throw new Error('Failed to fetch admin data');
//       }

//       const [statsData, usersData, apiUsageData, userApiUsageData] = await Promise.all([
//         statsRes.json(),
//         usersRes.json(),
//         apiUsageRes.json(),
//         userApiUsageRes.json()
//       ]);

//       setStats(statsData);
//       setUsers(usersData);
//       setApiUsage(apiUsageData);
//       setUserApiUsage(userApiUsageData);
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: "Failed to load admin data",
//         variant: "destructive"
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchUserDetails = async (userId: string) => {
//     setLoadingUserDetails(true);
//     try {
//       const res = await fetch(`/api/admin/users/${userId}/api-usage`, { 
//         credentials: 'include' 
//       });
      
//       if (!res.ok) {
//         throw new Error('Failed to fetch user details');
//       }
      
//       const data = await res.json();
//       setSelectedUserDetails(data);
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: "Failed to load user API usage details",
//         variant: "destructive"
//       });
//     } finally {
//       setLoadingUserDetails(false);
//     }
//   };

//   const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
//     setUpdatingUser(userId);
//     try {
//       const res = await fetch(`/api/admin/users/${userId}/admin-status`, {
//         method: 'PUT',
//         credentials: 'include',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ isAdmin: !currentStatus })
//       });

//       if (!res.ok) {
//         const error = await res.json();
//         throw new Error(error.message);
//       }

//       const updatedUser = await res.json();
//       setUsers(users.map(u => u.id === userId ? updatedUser : u));
      
//       toast({
//         title: "Success",
//         description: `Admin status ${!currentStatus ? 'granted' : 'removed'} successfully`
//       });
//     } catch (error: any) {
//       toast({
//         title: "Error",
//         description: error.message || "Failed to update admin status",
//         variant: "destructive"
//       });
//     } finally {
//       setUpdatingUser(null);
//     }
//   };

//   const deleteUser = async () => {
//     if (!deleteUserId) return;

//     try {
//       const res = await fetch(`/api/admin/users/${deleteUserId}`, {
//         method: 'DELETE',
//         credentials: 'include'
//       });

//       if (!res.ok) {
//         const error = await res.json();
//         throw new Error(error.message);
//       }

//       setUsers(users.filter(u => u.id !== deleteUserId));
//       toast({
//         title: "Success",
//         description: "User deleted successfully"
//       });
//     } catch (error: any) {
//       toast({
//         title: "Error",
//         description: error.message || "Failed to delete user",
//         variant: "destructive"
//       });
//     } finally {
//       setDeleteUserId(null);
//     }
//   };

//   const formatCost = (cents: number) => {
//     return `$${(cents / 100).toFixed(2)}`;
//   };

//   const formatNumber = (num: number) => {
//     return num.toLocaleString();
//   };

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <Loader2 className="w-8 h-8 animate-spin" />
//       </div>
//     );
//   }

//   const totalMonthlyCost = apiUsage?.monthlyStats?.totalCostCents || 0;
//   const topSpender = userApiUsage?.monthlyUserUsage?.[0];

//   return (
//     <div className="container mx-auto p-6">
//       <div className="mb-6">
//         <h1 className="text-3xl font-bold flex items-center gap-2">
//           <Shield className="w-8 h-8" />
//           Admin Panel
//         </h1>
//         <p className="text-muted-foreground mt-1">
//           System administration and user management
//         </p>
//       </div>

//       {/* Statistics Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Total Users</CardTitle>
//             <Users className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">{stats?.users || 0}</div>
//             <p className="text-xs text-muted-foreground">
//               {stats?.recentActivity?.filter((a: any) => a.type === 'user_created')?.length || 0} new this week
//             </p>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Websites</CardTitle>
//             <Globe className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">{stats?.websites || 0}</div>
//             <p className="text-xs text-muted-foreground">
//               Active sites
//             </p>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Content</CardTitle>
//             <FileText className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">{stats?.content || 0}</div>
//             <p className="text-xs text-muted-foreground">
//               Total posts
//             </p>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Monthly API Cost</CardTitle>
//             <DollarSign className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">
//               {formatCost(totalMonthlyCost)}
//             </div>
//             <p className="text-xs text-muted-foreground">
//               {apiUsage?.monthlyStats?.totalRequests || 0} requests
//             </p>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Top Spender</CardTitle>
//             <TrendingUp className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-lg font-bold truncate">
//               {topSpender?.username || 'N/A'}
//             </div>
//             <p className="text-xs text-muted-foreground">
//               {topSpender ? formatCost(topSpender.monthlyCostCents) : '$0.00'}
//             </p>
//           </CardContent>
//         </Card>
//       </div>

//       <Tabs defaultValue="users" className="space-y-4">
//         <TabsList className="grid w-full grid-cols-3">
//           <TabsTrigger value="users">Users</TabsTrigger>
//           <TabsTrigger value="api-usage">System API Usage</TabsTrigger>
//           <TabsTrigger value="user-api-usage">User API Usage</TabsTrigger>
//         </TabsList>

//         <TabsContent value="users">
//           {/* Users Table */}
//           <Card>
//             <CardHeader>
//               <CardTitle>User Management</CardTitle>
//               <CardDescription>
//                 Manage user accounts and admin permissions
//               </CardDescription>
//             </CardHeader>
//             <CardContent>
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead>Username</TableHead>
//                     <TableHead>Email</TableHead>
//                     <TableHead>Status</TableHead>
//                     <TableHead>Joined</TableHead>
//                     <TableHead>Actions</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {users.map((user) => (
//                     <TableRow key={user.id}>
//                       <TableCell className="font-medium">{user.username}</TableCell>
//                       <TableCell>{user.email || 'N/A'}</TableCell>
//                       <TableCell>
//                         <Badge variant={user.isAdmin ? "default" : "secondary"}>
//                           {user.isAdmin ? 'Admin' : 'User'}
//                         </Badge>
//                       </TableCell>
//                       <TableCell>
//                         {user.createdAt ? format(new Date(user.createdAt), 'MMM dd, yyyy') : 'N/A'}
//                       </TableCell>
//                       <TableCell>
//                         <div className="flex gap-2">
//                           <Button
//                             size="sm"
//                             variant={user.isAdmin ? "outline" : "default"}
//                             onClick={() => toggleAdminStatus(user.id, user.isAdmin)}
//                             disabled={updatingUser === user.id}
//                           >
//                             {updatingUser === user.id ? (
//                               <Loader2 className="w-4 h-4 animate-spin" />
//                             ) : user.isAdmin ? (
//                               <ShieldOff className="w-4 h-4" />
//                             ) : (
//                               <ShieldCheck className="w-4 h-4" />
//                             )}
//                           </Button>
//                           <Button
//                             size="sm"
//                             variant="destructive"
//                             onClick={() => setDeleteUserId(user.id)}
//                           >
//                             <Trash2 className="w-4 h-4" />
//                           </Button>
//                         </div>
//                       </TableCell>
//                     </TableRow>
//                   ))}
//                 </TableBody>
//               </Table>
//             </CardContent>
//           </Card>
//         </TabsContent>

//         <TabsContent value="api-usage">
//           <div className="space-y-4">
//             {/* System Keys Status */}
//             <Card>
//               <CardHeader>
//                 <CardTitle>System API Keys Status</CardTitle>
//                 <CardDescription>
//                   Environment variables configuration
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
//                   {apiUsage?.systemKeysStatus && Object.entries(apiUsage.systemKeysStatus).map(([key, configured]) => (
//                     <div key={key} className="flex items-center gap-2">
//                       <Key className={`h-4 w-4 ${configured ? 'text-green-500' : 'text-gray-400'}`} />
//                       <span className="text-sm font-medium capitalize">
//                         {key.replace(/([A-Z])/g, ' $1').trim()}
//                       </span>
//                       <Badge variant={configured ? "default" : "secondary"}>
//                         {configured ? 'Active' : 'Not Set'}
//                       </Badge>
//                     </div>
//                   ))}
//                 </div>
//               </CardContent>
//             </Card>

//             {/* Usage by Provider */}
//             <Card>
//               <CardHeader>
//                 <CardTitle>Usage by AI Provider</CardTitle>
//                 <CardDescription>
//                   Total usage across all system API keys
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <Table>
//                   <TableHeader>
//                     <TableRow>
//                       <TableHead>Provider</TableHead>
//                       <TableHead>Requests</TableHead>
//                       <TableHead>Tokens Used</TableHead>
//                       <TableHead>Cost</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {apiUsage?.providerCosts && Object.entries(apiUsage.providerCosts).map(([provider, data]: [string, any]) => (
//                       <TableRow key={provider}>
//                         <TableCell className="font-medium capitalize">{provider}</TableCell>
//                         <TableCell>{formatNumber(data.requests)}</TableCell>
//                         <TableCell>{formatNumber(data.tokens)}</TableCell>
//                         <TableCell>{formatCost(data.costCents)}</TableCell>
//                       </TableRow>
//                     ))}
//                   </TableBody>
//                 </Table>
//               </CardContent>
//             </Card>

//             {/* Usage by Model/Operation */}
//             <Card>
//               <CardHeader>
//                 <CardTitle>Detailed Usage Breakdown</CardTitle>
//                 <CardDescription>
//                   Usage by model and operation type
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <Table>
//                   <TableHeader>
//                     <TableRow>
//                       <TableHead>Model</TableHead>
//                       <TableHead>Operation</TableHead>
//                       <TableHead>Requests</TableHead>
//                       <TableHead>Tokens</TableHead>
//                       <TableHead>Cost</TableHead>
//                       <TableHead>Last Used</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {apiUsage?.usageByModel?.map((usage: any, idx: number) => (
//                       <TableRow key={idx}>
//                         <TableCell className="font-medium">{usage.model}</TableCell>
//                         <TableCell>{usage.operation}</TableCell>
//                         <TableCell>{usage.usageCount}</TableCell>
//                         <TableCell>{formatNumber(usage.totalTokens)}</TableCell>
//                         <TableCell>{formatCost(usage.totalCostCents)}</TableCell>
//                         <TableCell>
//                           {usage.lastUsed ? format(new Date(usage.lastUsed), 'MMM dd, HH:mm') : 'N/A'}
//                         </TableCell>
//                       </TableRow>
//                     ))}
//                   </TableBody>
//                 </Table>
//               </CardContent>
//             </Card>

//             {/* Daily Usage Trend */}
//             <Card>
//               <CardHeader>
//                 <CardTitle>Recent Daily Usage</CardTitle>
//                 <CardDescription>
//                   API usage over the last 7 days
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <Table>
//                   <TableHeader>
//                     <TableRow>
//                       <TableHead>Date</TableHead>
//                       <TableHead>Requests</TableHead>
//                       <TableHead>Tokens</TableHead>
//                       <TableHead>Cost</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {apiUsage?.dailyUsage?.slice(0, 7).map((day: any, idx: number) => (
//                       <TableRow key={idx}>
//                         <TableCell className="font-medium">
//                           {format(new Date(day.date), 'MMM dd, yyyy')}
//                         </TableCell>
//                         <TableCell>{day.requests}</TableCell>
//                         <TableCell>{formatNumber(day.totalTokens)}</TableCell>
//                         <TableCell>{formatCost(day.totalCostCents)}</TableCell>
//                       </TableRow>
//                     ))}
//                   </TableBody>
//                 </Table>
//               </CardContent>
//             </Card>
//           </div>
//         </TabsContent>

//         <TabsContent value="user-api-usage">
//           <div className="space-y-4">
//             {/* User API Usage Table */}
//             <Card>
//               <CardHeader>
//                 <CardTitle>API Usage by User</CardTitle>
//                 <CardDescription>
//                   Individual user API consumption and costs
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <Table>
//                   <TableHeader>
//                     <TableRow>
//                       <TableHead>User</TableHead>
//                       <TableHead>Email</TableHead>
//                       <TableHead>Total Requests</TableHead>
//                       <TableHead>Tokens Used</TableHead>
//                       <TableHead>Total Cost</TableHead>
//                       <TableHead>Last Activity</TableHead>
//                       <TableHead>Actions</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {userApiUsage?.userUsage?.map((user: any) => (
//                       <TableRow key={user.userId}>
//                         <TableCell className="font-medium">{user.username}</TableCell>
//                         <TableCell>{user.email || 'N/A'}</TableCell>
//                         <TableCell>{formatNumber(user.requestCount)}</TableCell>
//                         <TableCell>{formatNumber(user.totalTokens)}</TableCell>
//                         <TableCell className="font-semibold">
//                           {formatCost(user.totalCostCents)}
//                         </TableCell>
//                         <TableCell>
//                           {user.lastUsed ? format(new Date(user.lastUsed), 'MMM dd, HH:mm') : 'Never'}
//                         </TableCell>
//                         <TableCell>
//                           <Button
//                             size="sm"
//                             variant="outline"
//                             onClick={() => setSelectedUserId(user.userId)}
//                           >
//                             <Activity className="w-4 h-4 mr-1" />
//                             Details
//                           </Button>
//                         </TableCell>
//                       </TableRow>
//                     ))}
//                   </TableBody>
//                 </Table>
//               </CardContent>
//             </Card>

//             {/* Monthly User Usage */}
//             <Card>
//               <CardHeader>
//                 <CardTitle>Current Month Usage by User</CardTitle>
//                 <CardDescription>
//                   {userApiUsage?.billingPeriod && 
//                     `${format(new Date(userApiUsage.billingPeriod.start), 'MMM dd')} - ${format(new Date(userApiUsage.billingPeriod.end), 'MMM dd, yyyy')}`
//                   }
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <Table>
//                   <TableHeader>
//                     <TableRow>
//                       <TableHead>User</TableHead>
//                       <TableHead>Monthly Requests</TableHead>
//                       <TableHead>Monthly Tokens</TableHead>
//                       <TableHead>Monthly Cost</TableHead>
//                       <TableHead>% of Total</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {userApiUsage?.monthlyUserUsage?.map((user: any) => {
//                       const totalMonthlyCost = userApiUsage.monthlyUserUsage.reduce(
//                         (sum: number, u: any) => sum + u.monthlyCostCents, 0
//                       );
//                       const percentage = totalMonthlyCost > 0 
//                         ? ((user.monthlyCostCents / totalMonthlyCost) * 100).toFixed(1)
//                         : '0';
                      
//                       return (
//                         <TableRow key={user.userId}>
//                           <TableCell className="font-medium">{user.username}</TableCell>
//                           <TableCell>{formatNumber(user.monthlyRequests)}</TableCell>
//                           <TableCell>{formatNumber(user.monthlyTokens)}</TableCell>
//                           <TableCell className="font-semibold">
//                             {formatCost(user.monthlyCostCents)}
//                           </TableCell>
//                           <TableCell>
//                             <div className="flex items-center gap-2">
//                               <Progress 
//                                 value={Math.min(100, parseFloat(percentage))} 
//                                 className="w-20 h-2"
//                               />
//                               <span className="text-sm">{percentage}%</span>
//                             </div>
//                           </TableCell>
//                         </TableRow>
//                       );
//                     })}
//                   </TableBody>
//                 </Table>
//               </CardContent>
//             </Card>
//           </div>
//         </TabsContent>
//       </Tabs>

//       {/* User Details Dialog */}
//       <Dialog open={!!selectedUserId} onOpenChange={() => setSelectedUserId(null)}>
//         <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
//           <DialogHeader>
//             <DialogTitle>User API Usage Details</DialogTitle>
//             <DialogDescription>
//               {selectedUserDetails?.user?.username} - {selectedUserDetails?.user?.email}
//             </DialogDescription>
//           </DialogHeader>
          
//           {loadingUserDetails ? (
//             <div className="flex justify-center p-8">
//               <Loader2 className="w-8 h-8 animate-spin" />
//             </div>
//           ) : selectedUserDetails && (
//             <div className="space-y-4">
//               {/* Summary Stats */}
//               <div className="grid grid-cols-3 gap-4">
//                 <Card>
//                   <CardHeader className="pb-2">
//                     <CardTitle className="text-sm">Total Cost</CardTitle>
//                   </CardHeader>
//                   <CardContent>
//                     <div className="text-xl font-bold">
//                       {formatCost(selectedUserDetails.summary?.totalCostCents || 0)}
//                     </div>
//                   </CardContent>
//                 </Card>
//                 <Card>
//                   <CardHeader className="pb-2">
//                     <CardTitle className="text-sm">Total Requests</CardTitle>
//                   </CardHeader>
//                   <CardContent>
//                     <div className="text-xl font-bold">
//                       {formatNumber(selectedUserDetails.summary?.totalRequests || 0)}
//                     </div>
//                   </CardContent>
//                 </Card>
//                 <Card>
//                   <CardHeader className="pb-2">
//                     <CardTitle className="text-sm">Total Tokens</CardTitle>
//                   </CardHeader>
//                   <CardContent>
//                     <div className="text-xl font-bold">
//                       {formatNumber(selectedUserDetails.summary?.totalTokens || 0)}
//                     </div>
//                   </CardContent>
//                 </Card>
//               </div>

//               {/* Usage by Model */}
//               <Card>
//                 <CardHeader>
//                   <CardTitle className="text-sm">Usage by Model</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <Table>
//                     <TableHeader>
//                       <TableRow>
//                         <TableHead>Model</TableHead>
//                         <TableHead>Requests</TableHead>
//                         <TableHead>Tokens</TableHead>
//                         <TableHead>Cost</TableHead>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {selectedUserDetails.modelUsage?.map((model: any, idx: number) => (
//                         <TableRow key={idx}>
//                           <TableCell>{model.model}</TableCell>
//                           <TableCell>{model.requests}</TableCell>
//                           <TableCell>{formatNumber(model.tokens)}</TableCell>
//                           <TableCell>{formatCost(model.costCents)}</TableCell>
//                         </TableRow>
//                       ))}
//                     </TableBody>
//                   </Table>
//                 </CardContent>
//               </Card>

//               {/* Usage by Operation */}
//               <Card>
//                 <CardHeader>
//                   <CardTitle className="text-sm">Usage by Operation</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <Table>
//                     <TableHeader>
//                       <TableRow>
//                         <TableHead>Operation</TableHead>
//                         <TableHead>Requests</TableHead>
//                         <TableHead>Tokens</TableHead>
//                         <TableHead>Cost</TableHead>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {selectedUserDetails.operationUsage?.map((op: any, idx: number) => (
//                         <TableRow key={idx}>
//                           <TableCell>{op.operation}</TableCell>
//                           <TableCell>{op.requests}</TableCell>
//                           <TableCell>{formatNumber(op.tokens)}</TableCell>
//                           <TableCell>{formatCost(op.costCents)}</TableCell>
//                         </TableRow>
//                       ))}
//                     </TableBody>
//                   </Table>
//                 </CardContent>
//               </Card>
//             </div>
//           )}
//         </DialogContent>
//       </Dialog>

//       {/* Delete Confirmation Dialog */}
//       <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>Are you sure?</AlertDialogTitle>
//             <AlertDialogDescription>
//               This will permanently delete this user and all their data. This action cannot be undone.
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel>Cancel</AlertDialogCancel>
//             <AlertDialogAction onClick={deleteUser} className="bg-destructive text-destructive-foreground">
//               Delete User
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
//     </div>
//   );
// }




















// import { useState, useEffect } from "react";
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { 
//   Loader2, 
//   Users, 
//   Globe, 
//   FileText, 
//   BarChart3, 
//   Shield, 
//   Trash2, 
//   ShieldCheck, 
//   ShieldOff, 
//   Key, 
//   DollarSign, 
//   Activity,
//   TrendingUp,
//   TrendingDown,
//   AlertCircle,
//   Download,
//   FileDown
// } from "lucide-react";
// import { format } from "date-fns";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import {
//   Tabs,
//   TabsContent,
//   TabsList,
//   TabsTrigger,
// } from "@/components/ui/tabs";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "@/components/ui/alert-dialog";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { useToast } from "@/hooks/use-toast";
// import { Progress } from "@/components/ui/progress";
// import { jsPDF } from "jspdf";
// import autoTable from 'jspdf-autotable';

// export default function AdminPanel() {
//   const [loading, setLoading] = useState(true);
//   const [stats, setStats] = useState<any>(null);
//   const [users, setUsers] = useState<any[]>([]);
//   const [apiUsage, setApiUsage] = useState<any>(null);
//   const [userApiUsage, setUserApiUsage] = useState<any>(null);
//   const [selectedUserDetails, setSelectedUserDetails] = useState<any>(null);
//   const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
//   const [updatingUser, setUpdatingUser] = useState<string | null>(null);
//   const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
//   const [loadingUserDetails, setLoadingUserDetails] = useState(false);
//   const [downloadingReport, setDownloadingReport] = useState<string | null>(null);
//   const { toast } = useToast();

//   useEffect(() => {
//     fetchData();
//   }, []);

//   useEffect(() => {
//     if (selectedUserId) {
//       fetchUserDetails(selectedUserId);
//     }
//   }, [selectedUserId]);

//   const fetchData = async () => {
//     try {
//       const [statsRes, usersRes, apiUsageRes, userApiUsageRes] = await Promise.all([
//         fetch('/api/admin/statistics', { credentials: 'include' }),
//         fetch('/api/admin/users', { credentials: 'include' }),
//         fetch('/api/admin/system-api-usage', { credentials: 'include' }),
//         fetch('/api/admin/users-api-usage', { credentials: 'include' })
//       ]);

//       if (!statsRes.ok || !usersRes.ok || !apiUsageRes.ok || !userApiUsageRes.ok) {
//         if (statsRes.status === 403 || usersRes.status === 403 || apiUsageRes.status === 403 || userApiUsageRes.status === 403) {
//           toast({
//             title: "Access Denied",
//             description: "You don't have permission to access the admin panel",
//             variant: "destructive"
//           });
//           return;
//         }
//         throw new Error('Failed to fetch admin data');
//       }

//       const [statsData, usersData, apiUsageData, userApiUsageData] = await Promise.all([
//         statsRes.json(),
//         usersRes.json(),
//         apiUsageRes.json(),
//         userApiUsageRes.json()
//       ]);

//       console.log("User API Usage Data:", userApiUsageData); // Debug log to check the data structure

//       setStats(statsData);
//       setUsers(usersData);
//       setApiUsage(apiUsageData);
//       setUserApiUsage(userApiUsageData);
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: "Failed to load admin data",
//         variant: "destructive"
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchUserDetails = async (userId: string) => {
//     setLoadingUserDetails(true);
//     try {
//       const res = await fetch(`/api/admin/users/${userId}/api-usage`, { 
//         credentials: 'include' 
//       });
      
//       if (!res.ok) {
//         throw new Error('Failed to fetch user details');
//       }
      
//       const data = await res.json();
//       setSelectedUserDetails(data);
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: "Failed to load user API usage details",
//         variant: "destructive"
//       });
//     } finally {
//       setLoadingUserDetails(false);
//     }
//   };

//   const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
//     setUpdatingUser(userId);
//     try {
//       const res = await fetch(`/api/admin/users/${userId}/admin-status`, {
//         method: 'PUT',
//         credentials: 'include',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ isAdmin: !currentStatus })
//       });

//       if (!res.ok) {
//         const error = await res.json();
//         throw new Error(error.message);
//       }

//       const updatedUser = await res.json();
//       setUsers(users.map(u => u.id === userId ? updatedUser : u));
      
//       toast({
//         title: "Success",
//         description: `Admin status ${!currentStatus ? 'granted' : 'removed'} successfully`
//       });
//     } catch (error: any) {
//       toast({
//         title: "Error",
//         description: error.message || "Failed to update admin status",
//         variant: "destructive"
//       });
//     } finally {
//       setUpdatingUser(null);
//     }
//   };

//   const deleteUser = async () => {
//     if (!deleteUserId) return;

//     try {
//       const res = await fetch(`/api/admin/users/${deleteUserId}`, {
//         method: 'DELETE',
//         credentials: 'include'
//       });

//       if (!res.ok) {
//         const error = await res.json();
//         throw new Error(error.message);
//       }

//       setUsers(users.filter(u => u.id !== deleteUserId));
//       toast({
//         title: "Success",
//         description: "User deleted successfully"
//       });
//     } catch (error: any) {
//       toast({
//         title: "Error",
//         description: error.message || "Failed to delete user",
//         variant: "destructive"
//       });
//     } finally {
//       setDeleteUserId(null);
//     }
//   };

//   const formatCost = (cents: number) => {
//     return `$${(cents / 100).toFixed(2)}`;
//   };

//   const formatNumber = (num: number) => {
//     return num.toLocaleString();
//   };

//   // Calculate summary totals for API key usage
//   const calculateApiKeyTotals = () => {
//     if (!userApiUsage?.userUsage) {
//       return {
//         systemCost: userApiUsage?.systemKeyTotalCost || 0,
//         userCost: userApiUsage?.userKeyTotalCost || 0,
//         systemRequests: userApiUsage?.systemKeyTotalRequests || 0,
//         userRequests: userApiUsage?.userKeyTotalRequests || 0
//       };
//     }

//     const systemCost = userApiUsage.userUsage.reduce(
//       (sum: number, user: any) => sum + (user.systemKeyCostCents || 0), 0
//     ) || userApiUsage?.systemKeyTotalCost || 0;

//     const userCost = userApiUsage.userUsage.reduce(
//       (sum: number, user: any) => sum + (user.userKeyCostCents || 0), 0
//     ) || userApiUsage?.userKeyTotalCost || 0;

//     const systemRequests = userApiUsage.userUsage.reduce(
//       (sum: number, user: any) => sum + (user.systemKeyRequests || 0), 0
//     ) || userApiUsage?.systemKeyTotalRequests || 0;

//     const userRequests = userApiUsage.userUsage.reduce(
//       (sum: number, user: any) => sum + (user.userKeyRequests || 0), 0
//     ) || userApiUsage?.userKeyTotalRequests || 0;

//     return { systemCost, userCost, systemRequests, userRequests };
//   };

//   // Generate PDF report for a single user
//   const downloadUserReport = async (userId: string) => {
//     setDownloadingReport(userId);
//     try {
//       // Fetch detailed user data
//       const res = await fetch(`/api/admin/users/${userId}/api-usage`, { 
//         credentials: 'include' 
//       });
      
//       if (!res.ok) {
//         throw new Error('Failed to fetch user details');
//       }
      
//       const userDetails = await res.json();
//       const user = userApiUsage?.userUsage?.find((u: any) => u.userId === userId);
      
//       // Create PDF
//       const doc = new jsPDF();
      
//       // Add logo/header background
//       doc.setFillColor(240, 240, 240);
//       doc.rect(0, 0, 210, 30, 'F');
      
//       // Header
//       doc.setFontSize(20);
//       doc.setTextColor(33, 33, 33);
//       doc.text('API Usage Report', 105, 20, { align: 'center' });
      
//       // User Info Section
//       doc.setFontSize(14);
//       doc.setTextColor(66, 66, 66);
//       doc.text('User Information', 14, 45);
      
//       doc.setFontSize(11);
//       doc.setTextColor(100, 100, 100);
//       doc.text(`Username: `, 14, 55);
//       doc.setTextColor(33, 33, 33);
//       doc.text(`${user?.username || 'N/A'}`, 40, 55);
      
//       doc.setTextColor(100, 100, 100);
//       doc.text(`Email: `, 14, 62);
//       doc.setTextColor(33, 33, 33);
//       doc.text(`${user?.email || 'N/A'}`, 30, 62);
      
//       doc.setTextColor(100, 100, 100);
//       doc.text(`Generated: `, 14, 69);
//       doc.setTextColor(33, 33, 33);
//       doc.text(`${format(new Date(), 'MMMM dd, yyyy HH:mm')}`, 40, 69);
      
//       // Summary Section with background
//       doc.setFillColor(250, 250, 250);
//       doc.rect(10, 80, 190, 30, 'F');
      
//       doc.setFontSize(14);
//       doc.setTextColor(66, 66, 66);
//       doc.text('Usage Summary', 14, 90);
      
//       doc.setFontSize(10);
//       doc.setTextColor(33, 33, 33);
//       doc.text(`Total Requests: ${formatNumber(userDetails.summary?.totalRequests || 0)}`, 14, 100);
//       doc.text(`Total Tokens: ${formatNumber(userDetails.summary?.totalTokens || 0)}`, 75, 100);
//       doc.text(`Total Cost: ${formatCost(userDetails.summary?.totalCostCents || 0)}`, 140, 100);
      
//       // Usage by Model Table
//       let yPosition = 120;
      
//       if (userDetails.modelUsage && userDetails.modelUsage.length > 0) {
//         doc.setFontSize(12);
//         doc.setTextColor(66, 66, 66);
//         doc.text('Usage by Model', 14, yPosition);
        
//         autoTable(doc, {
//           startY: yPosition + 5,
//           head: [['Model', 'Key Source', 'Requests', 'Tokens', 'Cost']],
//           body: userDetails.modelUsage.map((model: any) => [
//             model.model,
//             model.keySource === 'user' ? 'User Key' : 'System Key',
//             model.requests.toString(),
//             formatNumber(model.tokens),
//             formatCost(model.costCents)
//           ]),
//           theme: 'grid',
//           headStyles: { 
//             fillColor: [66, 66, 66],
//             textColor: [255, 255, 255],
//             fontSize: 10
//           },
//           bodyStyles: {
//             fontSize: 9,
//             textColor: [33, 33, 33]
//           },
//           alternateRowStyles: {
//             fillColor: [250, 250, 250]
//           },
//           margin: { left: 14, right: 14 }
//         });
        
//         yPosition = (doc as any).lastAutoTable.finalY + 15;
//       }
      
//       // Usage by Operation Table
//       if (userDetails.operationUsage && userDetails.operationUsage.length > 0) {
//         doc.setFontSize(12);
//         doc.setTextColor(66, 66, 66);
//         doc.text('Usage by Operation', 14, yPosition);
        
//         autoTable(doc, {
//           startY: yPosition + 5,
//           head: [['Operation', 'Key Source', 'Requests', 'Tokens', 'Cost']],
//           body: userDetails.operationUsage.map((op: any) => [
//             op.operation,
//             op.keySource === 'user' ? 'User Key' : 'System Key',
//             op.requests.toString(),
//             formatNumber(op.tokens),
//             formatCost(op.costCents)
//           ]),
//           theme: 'grid',
//           headStyles: { 
//             fillColor: [66, 66, 66],
//             textColor: [255, 255, 255],
//             fontSize: 10
//           },
//           bodyStyles: {
//             fontSize: 9,
//             textColor: [33, 33, 33]
//           },
//           alternateRowStyles: {
//             fillColor: [250, 250, 250]
//           },
//           margin: { left: 14, right: 14 }
//         });
//       }
      
//       // Footer
//       const pageHeight = doc.internal.pageSize.height;
//       doc.setFontSize(8);
//       doc.setTextColor(150, 150, 150);
//       doc.text(`Page 1 of 1`, 105, pageHeight - 10, { align: 'center' });
      
//       // Save PDF
//       doc.save(`${user?.username || 'user'}_api_usage_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
//       toast({
//         title: "Success",
//         description: "Report downloaded successfully"
//       });
//     } catch (error) {
//       console.error('Error generating PDF:', error);
//       toast({
//         title: "Error",
//         description: "Failed to generate PDF report. Please check console for details.",
//         variant: "destructive"
//       });
//     } finally {
//       setDownloadingReport(null);
//     }
//   };

//   // Generate combined PDF report for all users
//   const downloadAllUsersReport = async () => {
//     setDownloadingReport('all');
//     try {
//       const doc = new jsPDF();
      
//       // Cover Page
//       doc.setFillColor(240, 240, 240);
//       doc.rect(0, 0, 210, 297, 'F');
      
//       doc.setFontSize(32);
//       doc.setTextColor(33, 33, 33);
//       doc.text('API Usage Report', 105, 80, { align: 'center' });
      
//       doc.setFontSize(18);
//       doc.setTextColor(66, 66, 66);
//       doc.text('All Users Summary', 105, 100, { align: 'center' });
      
//       doc.setFontSize(12);
//       doc.setTextColor(100, 100, 100);
//       doc.text(`Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`, 105, 120, { align: 'center' });
      
//       // System Summary Box
//       const totalSystemCost = userApiUsage?.userUsage?.reduce(
//         (sum: number, u: any) => sum + u.totalCostCents, 0
//       ) || 0;
//       const totalSystemRequests = userApiUsage?.userUsage?.reduce(
//         (sum: number, u: any) => sum + u.requestCount, 0
//       ) || 0;
//       const totalSystemTokens = userApiUsage?.userUsage?.reduce(
//         (sum: number, u: any) => sum + u.totalTokens, 0
//       ) || 0;
      
//       doc.setFillColor(255, 255, 255);
//       doc.roundedRect(30, 140, 150, 80, 5, 5, 'F');
      
//       doc.setFontSize(14);
//       doc.setTextColor(66, 66, 66);
//       doc.text('System Overview', 105, 155, { align: 'center' });
      
//       doc.setFontSize(11);
//       doc.setTextColor(33, 33, 33);
//       doc.text(`Total Users: ${userApiUsage?.userUsage?.length || 0}`, 40, 170);
//       doc.text(`Total Requests: ${formatNumber(totalSystemRequests)}`, 40, 180);
//       doc.text(`Total Tokens: ${formatNumber(totalSystemTokens)}`, 40, 190);
//       doc.text(`Total Cost: ${formatCost(totalSystemCost)}`, 40, 200);
      
//       // New page for user data
//       doc.addPage();
//       doc.setFillColor(255, 255, 255);
//       doc.rect(0, 0, 210, 297, 'F');
      
//       doc.setFontSize(16);
//       doc.setTextColor(33, 33, 33);
//       doc.text('User Usage Details', 14, 20);
      
//       // User Usage Table
//       if (userApiUsage?.userUsage && userApiUsage.userUsage.length > 0) {
//         autoTable(doc, {
//           startY: 30,
//           head: [['Username', 'Email', 'Requests', 'Tokens', 'Cost', 'Last Activity']],
//           body: userApiUsage.userUsage.map((user: any) => [
//             user.username,
//             user.email || 'N/A',
//             formatNumber(user.requestCount),
//             formatNumber(user.totalTokens),
//             formatCost(user.totalCostCents),
//             user.lastUsed ? format(new Date(user.lastUsed), 'MMM dd, HH:mm') : 'Never'
//           ]),
//           theme: 'grid',
//           headStyles: { 
//             fillColor: [66, 66, 66],
//             textColor: [255, 255, 255],
//             fontSize: 9
//           },
//           bodyStyles: {
//             fontSize: 8,
//             textColor: [33, 33, 33]
//           },
//           alternateRowStyles: {
//             fillColor: [250, 250, 250]
//           },
//           margin: { left: 14, right: 14 },
//           columnStyles: {
//             0: { cellWidth: 30 },
//             1: { cellWidth: 45 },
//             2: { cellWidth: 25 },
//             3: { cellWidth: 25 },
//             4: { cellWidth: 25 },
//             5: { cellWidth: 30 }
//           }
//         });
//       }
      
//       // Monthly Usage Page
//       if (userApiUsage?.monthlyUserUsage && userApiUsage.monthlyUserUsage.length > 0) {
//         doc.addPage();
        
//         doc.setFontSize(16);
//         doc.setTextColor(33, 33, 33);
//         doc.text('Current Month Usage', 14, 20);
        
//         doc.setFontSize(10);
//         doc.setTextColor(100, 100, 100);
//         doc.text(
//           `Billing Period: ${userApiUsage.billingPeriod ? 
//             `${format(new Date(userApiUsage.billingPeriod.start), 'MMM dd')} - ${format(new Date(userApiUsage.billingPeriod.end), 'MMM dd, yyyy')}` 
//             : 'Current Month'}`,
//           14, 30
//         );
        
//         const totalMonthlyCost = userApiUsage.monthlyUserUsage.reduce(
//           (sum: number, u: any) => sum + u.monthlyCostCents, 0
//         );
        
//         autoTable(doc, {
//           startY: 40,
//           head: [['Username', 'Monthly Requests', 'Monthly Tokens', 'Monthly Cost', '% of Total']],
//           body: userApiUsage.monthlyUserUsage.map((user: any) => {
//             const percentage = totalMonthlyCost > 0 
//               ? ((user.monthlyCostCents / totalMonthlyCost) * 100).toFixed(1)
//               : '0';
//             return [
//               user.username,
//               formatNumber(user.monthlyRequests),
//               formatNumber(user.monthlyTokens),
//               formatCost(user.monthlyCostCents),
//               `${percentage}%`
//             ];
//           }),
//           theme: 'grid',
//           headStyles: { 
//             fillColor: [66, 66, 66],
//             textColor: [255, 255, 255],
//             fontSize: 9
//           },
//           bodyStyles: {
//             fontSize: 8,
//             textColor: [33, 33, 33]
//           },
//           alternateRowStyles: {
//             fillColor: [250, 250, 250]
//           },
//           margin: { left: 14, right: 14 }
//         });
//       }
      
//       // Save PDF
//       doc.save(`all_users_api_usage_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
//       toast({
//         title: "Success",
//         description: "Combined report downloaded successfully"
//       });
//     } catch (error) {
//       console.error('Error generating PDF:', error);
//       toast({
//         title: "Error",
//         description: "Failed to generate PDF report. Please check console for details.",
//         variant: "destructive"
//       });
//     } finally {
//       setDownloadingReport(null);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <Loader2 className="w-8 h-8 animate-spin" />
//       </div>
//     );
//   }

//   const totalMonthlyCost = apiUsage?.monthlyStats?.totalCostCents || 0;
//   const topSpender = userApiUsage?.monthlyUserUsage?.[0];

//   return (
//     <div className="container mx-auto p-6">
//       <div className="mb-6">
//         <h1 className="text-3xl font-bold flex items-center gap-2">
//           <Shield className="w-8 h-8" />
//           Admin Panel
//         </h1>
//         <p className="text-muted-foreground mt-1">
//           System administration and user management
//         </p>
//       </div>

//       {/* Statistics Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Total Users</CardTitle>
//             <Users className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">{stats?.users || 0}</div>
//             <p className="text-xs text-muted-foreground">
//               {stats?.recentActivity?.filter((a: any) => a.type === 'user_created')?.length || 0} new this week
//             </p>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Websites</CardTitle>
//             <Globe className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">{stats?.websites || 0}</div>
//             <p className="text-xs text-muted-foreground">
//               Active sites
//             </p>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Content</CardTitle>
//             <FileText className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">{stats?.content || 0}</div>
//             <p className="text-xs text-muted-foreground">
//               Total posts
//             </p>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Monthly API Cost</CardTitle>
//             <DollarSign className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">
//               {formatCost(totalMonthlyCost)}
//             </div>
//             <p className="text-xs text-muted-foreground">
//               {apiUsage?.monthlyStats?.totalRequests || 0} requests
//             </p>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Top Spender</CardTitle>
//             <TrendingUp className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-lg font-bold truncate">
//               {topSpender?.username || 'N/A'}
//             </div>
//             <p className="text-xs text-muted-foreground">
//               {topSpender ? formatCost(topSpender.monthlyCostCents) : '$0.00'}
//             </p>
//           </CardContent>
//         </Card>
//       </div>

//       <Tabs defaultValue="users" className="space-y-4">
//         <TabsList className="grid w-full grid-cols-3">
//           <TabsTrigger value="users">Users</TabsTrigger>
//           <TabsTrigger value="api-usage">System API Usage</TabsTrigger>
//           <TabsTrigger value="user-api-usage">User API Usage</TabsTrigger>
//         </TabsList>

//         <TabsContent value="users">
//           {/* Users Table */}
//           <Card>
//             <CardHeader>
//               <CardTitle>User Management</CardTitle>
//               <CardDescription>
//                 Manage user accounts and admin permissions
//               </CardDescription>
//             </CardHeader>
//             <CardContent>
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead>Username</TableHead>
//                     <TableHead>Email</TableHead>
//                     <TableHead>Status</TableHead>
//                     <TableHead>Joined</TableHead>
//                     <TableHead>Actions</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {users.map((user) => (
//                     <TableRow key={user.id}>
//                       <TableCell className="font-medium">{user.username}</TableCell>
//                       <TableCell>{user.email || 'N/A'}</TableCell>
//                       <TableCell>
//                         <Badge variant={user.isAdmin ? "default" : "secondary"}>
//                           {user.isAdmin ? 'Admin' : 'User'}
//                         </Badge>
//                       </TableCell>
//                       <TableCell>
//                         {user.createdAt ? format(new Date(user.createdAt), 'MMM dd, yyyy') : 'N/A'}
//                       </TableCell>
//                       <TableCell>
//                         <div className="flex gap-2">
//                           <Button
//                             size="sm"
//                             variant={user.isAdmin ? "outline" : "default"}
//                             onClick={() => toggleAdminStatus(user.id, user.isAdmin)}
//                             disabled={updatingUser === user.id}
//                           >
//                             {updatingUser === user.id ? (
//                               <Loader2 className="w-4 h-4 animate-spin" />
//                             ) : user.isAdmin ? (
//                               <ShieldOff className="w-4 h-4" />
//                             ) : (
//                               <ShieldCheck className="w-4 h-4" />
//                             )}
//                           </Button>
//                           <Button
//                             size="sm"
//                             variant="destructive"
//                             onClick={() => setDeleteUserId(user.id)}
//                           >
//                             <Trash2 className="w-4 h-4" />
//                           </Button>
//                         </div>
//                       </TableCell>
//                     </TableRow>
//                   ))}
//                 </TableBody>
//               </Table>
//             </CardContent>
//           </Card>
//         </TabsContent>

//         <TabsContent value="api-usage">
//           <div className="space-y-4">
//             {/* System Keys Status */}
//             <Card>
//               <CardHeader>
//                 <CardTitle>System API Keys Status</CardTitle>
//                 <CardDescription>
//                   Environment variables configuration
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
//                   {apiUsage?.systemKeysStatus && Object.entries(apiUsage.systemKeysStatus).map(([key, configured]) => (
//                     <div key={key} className="flex items-center gap-2">
//                       <Key className={`h-4 w-4 ${configured ? 'text-green-500' : 'text-gray-400'}`} />
//                       <span className="text-sm font-medium capitalize">
//                         {key.replace(/([A-Z])/g, ' $1').trim()}
//                       </span>
//                       <Badge variant={configured ? "default" : "secondary"}>
//                         {configured ? 'Active' : 'Not Set'}
//                       </Badge>
//                     </div>
//                   ))}
//                 </div>
//               </CardContent>
//             </Card>

//             {/* Usage by Provider */}
//             <Card>
//               <CardHeader>
//                 <CardTitle>Usage by AI Provider</CardTitle>
//                 <CardDescription>
//                   Total usage across all system API keys
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <Table>
//                   <TableHeader>
//                     <TableRow>
//                       <TableHead>Provider</TableHead>
//                       <TableHead>Requests</TableHead>
//                       <TableHead>Tokens Used</TableHead>
//                       <TableHead>Cost</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {apiUsage?.providerCosts && Object.entries(apiUsage.providerCosts).map(([provider, data]: [string, any]) => (
//                       <TableRow key={provider}>
//                         <TableCell className="font-medium capitalize">{provider}</TableCell>
//                         <TableCell>{formatNumber(data.requests)}</TableCell>
//                         <TableCell>{formatNumber(data.tokens)}</TableCell>
//                         <TableCell>{formatCost(data.costCents)}</TableCell>
//                       </TableRow>
//                     ))}
//                   </TableBody>
//                 </Table>
//               </CardContent>
//             </Card>

//             {/* Usage by Model/Operation */}
//             <Card>
//               <CardHeader>
//                 <CardTitle>Detailed Usage Breakdown</CardTitle>
//                 <CardDescription>
//                   Usage by model and operation type
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <Table>
//                   <TableHeader>
//                     <TableRow>
//                       <TableHead>Model</TableHead>
//                       <TableHead>Operation</TableHead>
//                       <TableHead>Requests</TableHead>
//                       <TableHead>Tokens</TableHead>
//                       <TableHead>Cost</TableHead>
//                       <TableHead>Last Used</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {apiUsage?.usageByModel?.map((usage: any, idx: number) => (
//                       <TableRow key={idx}>
//                         <TableCell className="font-medium">{usage.model}</TableCell>
//                         <TableCell>{usage.operation}</TableCell>
//                         <TableCell>{usage.usageCount}</TableCell>
//                         <TableCell>{formatNumber(usage.totalTokens)}</TableCell>
//                         <TableCell>{formatCost(usage.totalCostCents)}</TableCell>
//                         <TableCell>
//                           {usage.lastUsed ? format(new Date(usage.lastUsed), 'MMM dd, HH:mm') : 'N/A'}
//                         </TableCell>
//                       </TableRow>
//                     ))}
//                   </TableBody>
//                 </Table>
//               </CardContent>
//             </Card>

//             {/* Daily Usage Trend */}
//             <Card>
//               <CardHeader>
//                 <CardTitle>Recent Daily Usage</CardTitle>
//                 <CardDescription>
//                   API usage over the last 7 days
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <Table>
//                   <TableHeader>
//                     <TableRow>
//                       <TableHead>Date</TableHead>
//                       <TableHead>Requests</TableHead>
//                       <TableHead>Tokens</TableHead>
//                       <TableHead>Cost</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {apiUsage?.dailyUsage?.slice(0, 7).map((day: any, idx: number) => (
//                       <TableRow key={idx}>
//                         <TableCell className="font-medium">
//                           {format(new Date(day.date), 'MMM dd, yyyy')}
//                         </TableCell>
//                         <TableCell>{day.requests}</TableCell>
//                         <TableCell>{formatNumber(day.totalTokens)}</TableCell>
//                         <TableCell>{formatCost(day.totalCostCents)}</TableCell>
//                       </TableRow>
//                     ))}
//                   </TableBody>
//                 </Table>
//               </CardContent>
//             </Card>
//           </div>
//         </TabsContent>

//         <TabsContent value="user-api-usage">
//           <div className="space-y-4">
//             {/* API Key Usage Summary */}
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
//               <Card>
//                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                   <CardTitle className="text-sm font-medium">System Key Usage</CardTitle>
//                   <Shield className="h-4 w-4 text-muted-foreground" />
//                 </CardHeader>
//                 <CardContent>
//                   <div className="text-2xl font-bold">
//                     {formatCost((() => {
//                       // Calculate system key total from user usage data
//                       const systemTotal = userApiUsage?.userUsage?.reduce(
//                         (sum: number, user: any) => sum + (user.systemKeyCostCents || 0), 0
//                       ) || 0;
//                       return systemTotal || userApiUsage?.systemKeyTotalCost || 0;
//                     })())}
//                   </div>
//                   <p className="text-xs text-muted-foreground">
//                     {formatNumber((() => {
//                       const systemRequests = userApiUsage?.userUsage?.reduce(
//                         (sum: number, user: any) => sum + (user.systemKeyRequests || 0), 0
//                       ) || 0;
//                       return systemRequests || userApiUsage?.systemKeyTotalRequests || 0;
//                     })())} requests
//                   </p>
//                 </CardContent>
//               </Card>

//               <Card>
//                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                   <CardTitle className="text-sm font-medium">User Key Usage</CardTitle>
//                   <Key className="h-4 w-4 text-muted-foreground" />
//                 </CardHeader>
//                 <CardContent>
//                   <div className="text-2xl font-bold">
//                     {formatCost((() => {
//                       // Calculate user key total from user usage data
//                       const userTotal = userApiUsage?.userUsage?.reduce(
//                         (sum: number, user: any) => sum + (user.userKeyCostCents || 0), 0
//                       ) || 0;
//                       return userTotal || userApiUsage?.userKeyTotalCost || 0;
//                     })())}
//                   </div>
//                   <p className="text-xs text-muted-foreground">
//                     {formatNumber((() => {
//                       const userRequests = userApiUsage?.userUsage?.reduce(
//                         (sum: number, user: any) => sum + (user.userKeyRequests || 0), 0
//                       ) || 0;
//                       return userRequests || userApiUsage?.userKeyTotalRequests || 0;
//                     })()} requests
//                   </p>
//                 </CardContent>
//               </Card>

//               <Card>
//                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                   <CardTitle className="text-sm font-medium">Cost Distribution</CardTitle>
//                   <BarChart3 className="h-4 w-4 text-muted-foreground" />
//                 </CardHeader>
//                 <CardContent>
//                   <div className="flex items-center gap-2">
//                     <div className="flex-1">
//                       <Progress 
//                         value={(() => {
//                           const systemTotal = userApiUsage?.userUsage?.reduce(
//                             (sum: number, user: any) => sum + (user.systemKeyCostCents || 0), 0
//                           ) || userApiUsage?.systemKeyTotalCost || 0;
//                           const userTotal = userApiUsage?.userUsage?.reduce(
//                             (sum: number, user: any) => sum + (user.userKeyCostCents || 0), 0
//                           ) || userApiUsage?.userKeyTotalCost || 0;
//                           const total = systemTotal + userTotal;
//                           return total > 0 ? (systemTotal / total) * 100 : 0;
//                         })()} 
//                         className="h-2"
//                       />
//                     </div>
//                     <span className="text-xs text-muted-foreground">
//                       {(() => {
//                         const systemTotal = userApiUsage?.userUsage?.reduce(
//                           (sum: number, user: any) => sum + (user.systemKeyCostCents || 0), 0
//                         ) || userApiUsage?.systemKeyTotalCost || 0;
//                         const userTotal = userApiUsage?.userUsage?.reduce(
//                           (sum: number, user: any) => sum + (user.userKeyCostCents || 0), 0
//                         ) || userApiUsage?.userKeyTotalCost || 0;
//                         const total = systemTotal + userTotal;
//                         return total > 0 ? Math.round((systemTotal / total) * 100) : 0;
//                       })()}% System
//                     </span>
//                   </div>
//                   <p className="text-xs text-muted-foreground mt-1">
//                     Total Combined: {formatCost((() => {
//                       const systemTotal = userApiUsage?.userUsage?.reduce(
//                         (sum: number, user: any) => sum + (user.systemKeyCostCents || 0), 0
//                       ) || userApiUsage?.systemKeyTotalCost || 0;
//                       const userTotal = userApiUsage?.userUsage?.reduce(
//                         (sum: number, user: any) => sum + (user.userKeyCostCents || 0), 0
//                       ) || userApiUsage?.userKeyTotalCost || 0;
//                       return systemTotal + userTotal;
//                     })())}
//                   </p>
//                 </CardContent>
//               </Card>
//             </div>

//             {/* User API Usage Table */}
//             <Card>
//               <CardHeader>
//                 <div className="flex items-center justify-between">
//                   <div>
//                     <CardTitle>API Usage by User</CardTitle>
//                     <CardDescription>
//                       Individual user API consumption and costs
//                     </CardDescription>
//                   </div>
//                   <Button
//                     onClick={downloadAllUsersReport}
//                     disabled={downloadingReport === 'all'}
//                     variant="outline"
//                   >
//                     {downloadingReport === 'all' ? (
//                       <Loader2 className="w-4 h-4 mr-2 animate-spin" />
//                     ) : (
//                       <FileDown className="w-4 h-4 mr-2" />
//                     )}
//                     Download All Reports
//                   </Button>
//                 </div>
//               </CardHeader>
//               <CardContent>
//                 <Table>
//                   <TableHeader>
//                     <TableRow>
//                       <TableHead>User</TableHead>
//                       <TableHead>Email</TableHead>
//                       <TableHead>Key Usage</TableHead>
//                       <TableHead>Total Requests</TableHead>
//                       <TableHead>Tokens Used</TableHead>
//                       <TableHead>Total Cost</TableHead>
//                       <TableHead>Last Activity</TableHead>
//                       <TableHead>Actions</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {userApiUsage?.userUsage?.map((user: any) => {
//                       const userKeyPercentage = user.requestCount > 0 
//                         ? Math.round((user.userKeyRequests / user.requestCount) * 100)
//                         : 0;
//                       const systemKeyPercentage = user.requestCount > 0 
//                         ? Math.round((user.systemKeyRequests / user.requestCount) * 100)
//                         : 0;
                      
//                       return (
//                         <TableRow key={user.userId}>
//                           <TableCell className="font-medium">{user.username}</TableCell>
//                           <TableCell>{user.email || 'N/A'}</TableCell>
//                           <TableCell>
//                             <div className="space-y-2">
//                               {user.userKeyRequests > 0 && (
//                                 <div className="flex items-center gap-2">
//                                   <Key className="w-3 h-3 text-blue-500" />
//                                   <Progress 
//                                     value={userKeyPercentage} 
//                                     className="w-20 h-2"
//                                   />
//                                   <span className="text-xs">{userKeyPercentage}%</span>
//                                 </div>
//                               )}
//                               {user.systemKeyRequests > 0 && (
//                                 <div className="flex items-center gap-2">
//                                   <Shield className="w-3 h-3 text-green-500" />
//                                   <Progress 
//                                     value={systemKeyPercentage} 
//                                     className="w-20 h-2"
//                                   />
//                                   <span className="text-xs">{systemKeyPercentage}%</span>
//                                 </div>
//                               )}
//                               {user.requestCount === 0 && (
//                                 <span className="text-xs text-muted-foreground">No usage</span>
//                               )}
//                             </div>
//                           </TableCell>
//                           <TableCell>
//                             <div className="space-y-1">
//                               <div className="flex items-center gap-2">
//                                 <span className="font-medium">{formatNumber(user.requestCount)}</span>
//                               </div>
//                               <div className="flex flex-col gap-1">
//                                 {user.userKeyRequests > 0 && (
//                                   <div className="flex items-center gap-1">
//                                     <Badge variant="outline" className="text-xs">
//                                       <Key className="w-3 h-3 mr-1" />
//                                       User: {formatNumber(user.userKeyRequests)}
//                                     </Badge>
//                                   </div>
//                                 )}
//                                 {user.systemKeyRequests > 0 && (
//                                   <div className="flex items-center gap-1">
//                                     <Badge variant="secondary" className="text-xs">
//                                       <Shield className="w-3 h-3 mr-1" />
//                                       System: {formatNumber(user.systemKeyRequests)}
//                                     </Badge>
//                                   </div>
//                                 )}
//                               </div>
//                             </div>
//                           </TableCell>
//                           <TableCell>{formatNumber(user.totalTokens)}</TableCell>
//                           <TableCell>
//                             <div className="space-y-1">
//                               <div className="font-semibold">
//                                 {formatCost(user.totalCostCents)}
//                               </div>
//                               {user.userKeyCostCents > 0 && (
//                                 <div className="text-xs text-muted-foreground">
//                                   User: {formatCost(user.userKeyCostCents)}
//                                 </div>
//                               )}
//                               {user.systemKeyCostCents > 0 && (
//                                 <div className="text-xs text-muted-foreground">
//                                   System: {formatCost(user.systemKeyCostCents)}
//                                 </div>
//                               )}
//                             </div>
//                           </TableCell>
//                           <TableCell>
//                             {user.lastUsed ? format(new Date(user.lastUsed), 'MMM dd, HH:mm') : 'Never'}
//                           </TableCell>
//                           <TableCell>
//                             <div className="flex gap-2">
//                               <Button
//                                 size="sm"
//                                 variant="outline"
//                                 onClick={() => setSelectedUserId(user.userId)}
//                               >
//                                 <Activity className="w-4 h-4 mr-1" />
//                                 Details
//                               </Button>
//                               <Button
//                                 size="sm"
//                                 variant="outline"
//                                 onClick={() => downloadUserReport(user.userId)}
//                                 disabled={downloadingReport === user.userId}
//                               >
//                                 {downloadingReport === user.userId ? (
//                                   <Loader2 className="w-4 h-4 animate-spin" />
//                                 ) : (
//                                   <Download className="w-4 h-4" />
//                                 )}
//                               </Button>
//                             </div>
//                           </TableCell>
//                         </TableRow>
//                       );
//                     })}
//                   </TableBody>
//                 </Table>
//               </CardContent>
//             </Card>

//             {/* Monthly User Usage */}
//             <Card>
//               <CardHeader>
//                 <CardTitle>Current Month Usage by User</CardTitle>
//                 <CardDescription>
//                   {userApiUsage?.billingPeriod && 
//                     `${format(new Date(userApiUsage.billingPeriod.start), 'MMM dd')} - ${format(new Date(userApiUsage.billingPeriod.end), 'MMM dd, yyyy')}`
//                   }
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <Table>
//                   <TableHeader>
//                     <TableRow>
//                       <TableHead>User</TableHead>
//                       <TableHead>Monthly Requests</TableHead>
//                       <TableHead>Monthly Tokens</TableHead>
//                       <TableHead>Monthly Cost</TableHead>
//                       <TableHead>% of Total</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {userApiUsage?.monthlyUserUsage?.map((user: any) => {
//                       const totalMonthlyCost = userApiUsage.monthlyUserUsage.reduce(
//                         (sum: number, u: any) => sum + u.monthlyCostCents, 0
//                       );
//                       const percentage = totalMonthlyCost > 0 
//                         ? ((user.monthlyCostCents / totalMonthlyCost) * 100).toFixed(1)
//                         : '0';
                      
//                       return (
//                         <TableRow key={user.userId}>
//                           <TableCell className="font-medium">{user.username}</TableCell>
//                           <TableCell>
//                             <div className="space-y-1">
//                               <div>{formatNumber(user.monthlyRequests)}</div>
//                               <div className="flex gap-2">
//                                 {user.monthlyUserKeyRequests > 0 && (
//                                   <Badge variant="outline" className="text-xs">
//                                     <Key className="w-3 h-3 mr-1" />
//                                     {formatNumber(user.monthlyUserKeyRequests)}
//                                   </Badge>
//                                 )}
//                                 {user.monthlySystemKeyRequests > 0 && (
//                                   <Badge variant="secondary" className="text-xs">
//                                     <Shield className="w-3 h-3 mr-1" />
//                                     {formatNumber(user.monthlySystemKeyRequests)}
//                                   </Badge>
//                                 )}
//                               </div>
//                             </div>
//                           </TableCell>
//                           <TableCell>{formatNumber(user.monthlyTokens)}</TableCell>
//                           <TableCell>
//                             <div className="space-y-1">
//                               <div className="font-semibold">
//                                 {formatCost(user.monthlyCostCents)}
//                               </div>
//                               <div className="text-xs space-y-0.5">
//                                 {user.monthlyUserKeyCostCents > 0 && (
//                                   <div className="text-muted-foreground">
//                                     User: {formatCost(user.monthlyUserKeyCostCents)}
//                                   </div>
//                                 )}
//                                 {user.monthlySystemKeyCostCents > 0 && (
//                                   <div className="text-muted-foreground">
//                                     System: {formatCost(user.monthlySystemKeyCostCents)}
//                                   </div>
//                                 )}
//                               </div>
//                             </div>
//                           </TableCell>
//                           <TableCell>
//                             <div className="flex items-center gap-2">
//                               <Progress 
//                                 value={Math.min(100, parseFloat(percentage))} 
//                                 className="w-20 h-2"
//                               />
//                               <span className="text-sm">{percentage}%</span>
//                             </div>
//                           </TableCell>
//                         </TableRow>
//                       );
//                     })}
//                   </TableBody>
//                 </Table>
//               </CardContent>
//             </Card>
//           </div>
//         </TabsContent>
//       </Tabs>

//       {/* User Details Dialog */}
//       <Dialog open={!!selectedUserId} onOpenChange={() => setSelectedUserId(null)}>
//         <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
//           <DialogHeader>
//             <DialogTitle>User API Usage Details</DialogTitle>
//             <DialogDescription>
//               {selectedUserDetails?.user?.username} - {selectedUserDetails?.user?.email}
//             </DialogDescription>
//           </DialogHeader>
          
//           {loadingUserDetails ? (
//             <div className="flex justify-center p-8">
//               <Loader2 className="w-8 h-8 animate-spin" />
//             </div>
//           ) : selectedUserDetails && (
//             <div className="space-y-4">
//               {/* Summary Stats */}
//               <div className="grid grid-cols-3 gap-4">
//                 <Card>
//                   <CardHeader className="pb-2">
//                     <CardTitle className="text-sm">Total Cost</CardTitle>
//                   </CardHeader>
//                   <CardContent>
//                     <div className="text-xl font-bold">
//                       {formatCost(selectedUserDetails.summary?.totalCostCents || 0)}
//                     </div>
//                     <div className="space-y-1 mt-2">
//                       {selectedUserDetails.summary?.userKeyCostCents > 0 && (
//                         <div className="text-xs text-muted-foreground flex items-center gap-1">
//                           <Key className="w-3 h-3" />
//                           User: {formatCost(selectedUserDetails.summary.userKeyCostCents)}
//                         </div>
//                       )}
//                       {selectedUserDetails.summary?.systemKeyCostCents > 0 && (
//                         <div className="text-xs text-muted-foreground flex items-center gap-1">
//                           <Shield className="w-3 h-3" />
//                           System: {formatCost(selectedUserDetails.summary.systemKeyCostCents)}
//                         </div>
//                       )}
//                     </div>
//                   </CardContent>
//                 </Card>
//                 <Card>
//                   <CardHeader className="pb-2">
//                     <CardTitle className="text-sm">Total Requests</CardTitle>
//                   </CardHeader>
//                   <CardContent>
//                     <div className="text-xl font-bold">
//                       {formatNumber(selectedUserDetails.summary?.totalRequests || 0)}
//                     </div>
//                     <div className="space-y-1 mt-2">
//                       {selectedUserDetails.summary?.userKeyRequests > 0 && (
//                         <div className="text-xs text-muted-foreground flex items-center gap-1">
//                           <Key className="w-3 h-3" />
//                           User: {formatNumber(selectedUserDetails.summary.userKeyRequests)}
//                         </div>
//                       )}
//                       {selectedUserDetails.summary?.systemKeyRequests > 0 && (
//                         <div className="text-xs text-muted-foreground flex items-center gap-1">
//                           <Shield className="w-3 h-3" />
//                           System: {formatNumber(selectedUserDetails.summary.systemKeyRequests)}
//                         </div>
//                       )}
//                     </div>
//                   </CardContent>
//                 </Card>
//                 <Card>
//                   <CardHeader className="pb-2">
//                     <CardTitle className="text-sm">Total Tokens</CardTitle>
//                   </CardHeader>
//                   <CardContent>
//                     <div className="text-xl font-bold">
//                       {formatNumber(selectedUserDetails.summary?.totalTokens || 0)}
//                     </div>
//                     <div className="space-y-1 mt-2">
//                       {selectedUserDetails.summary?.userKeyTokens > 0 && (
//                         <div className="text-xs text-muted-foreground flex items-center gap-1">
//                           <Key className="w-3 h-3" />
//                           User: {formatNumber(selectedUserDetails.summary.userKeyTokens)}
//                         </div>
//                       )}
//                       {selectedUserDetails.summary?.systemKeyTokens > 0 && (
//                         <div className="text-xs text-muted-foreground flex items-center gap-1">
//                           <Shield className="w-3 h-3" />
//                           System: {formatNumber(selectedUserDetails.summary.systemKeyTokens)}
//                         </div>
//                       )}
//                     </div>
//                   </CardContent>
//                 </Card>
//               </div>

//               {/* Usage by Model */}
//               <Card>
//                 <CardHeader>
//                   <CardTitle className="text-sm">Usage by Model</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <Table>
//                     <TableHeader>
//                       <TableRow>
//                         <TableHead>Model</TableHead>
//                         <TableHead>Key Source</TableHead>
//                         <TableHead>Requests</TableHead>
//                         <TableHead>Tokens</TableHead>
//                         <TableHead>Cost</TableHead>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {selectedUserDetails.modelUsage?.map((model: any, idx: number) => (
//                         <TableRow key={idx}>
//                           <TableCell>{model.model}</TableCell>
//                           <TableCell>
//                             <Badge variant={model.keySource === 'user' ? 'outline' : 'secondary'} className="text-xs">
//                               {model.keySource === 'user' ? (
//                                 <>
//                                   <Key className="w-3 h-3 mr-1" />
//                                   User Key
//                                 </>
//                               ) : (
//                                 <>
//                                   <Shield className="w-3 h-3 mr-1" />
//                                   System Key
//                                 </>
//                               )}
//                             </Badge>
//                           </TableCell>
//                           <TableCell>{model.requests}</TableCell>
//                           <TableCell>{formatNumber(model.tokens)}</TableCell>
//                           <TableCell>{formatCost(model.costCents)}</TableCell>
//                         </TableRow>
//                       ))}
//                     </TableBody>
//                   </Table>
//                 </CardContent>
//               </Card>

//               {/* Usage by Operation */}
//               <Card>
//                 <CardHeader>
//                   <CardTitle className="text-sm">Usage by Operation</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <Table>
//                     <TableHeader>
//                       <TableRow>
//                         <TableHead>Operation</TableHead>
//                         <TableHead>Key Source</TableHead>
//                         <TableHead>Requests</TableHead>
//                         <TableHead>Tokens</TableHead>
//                         <TableHead>Cost</TableHead>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {selectedUserDetails.operationUsage?.map((op: any, idx: number) => (
//                         <TableRow key={idx}>
//                           <TableCell>{op.operation}</TableCell>
//                           <TableCell>
//                             <Badge variant={op.keySource === 'user' ? 'outline' : 'secondary'} className="text-xs">
//                               {op.keySource === 'user' ? (
//                                 <>
//                                   <Key className="w-3 h-3 mr-1" />
//                                   User Key
//                                 </>
//                               ) : (
//                                 <>
//                                   <Shield className="w-3 h-3 mr-1" />
//                                   System Key
//                                 </>
//                               )}
//                             </Badge>
//                           </TableCell>
//                           <TableCell>{op.requests}</TableCell>
//                           <TableCell>{formatNumber(op.tokens)}</TableCell>
//                           <TableCell>{formatCost(op.costCents)}</TableCell>
//                         </TableRow>
//                       ))}
//                     </TableBody>
//                   </Table>
//                 </CardContent>
//               </Card>
//             </div>
//           )}
//         </DialogContent>
//       </Dialog>

//       {/* Delete Confirmation Dialog */}
//       <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>Are you sure?</AlertDialogTitle>
//             <AlertDialogDescription>
//               This will permanently delete this user and all their data. This action cannot be undone.
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel>Cancel</AlertDialogCancel>
//             <AlertDialogAction onClick={deleteUser} className="bg-destructive text-destructive-foreground">
//               Delete User
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
//     </div>
//   );
// }