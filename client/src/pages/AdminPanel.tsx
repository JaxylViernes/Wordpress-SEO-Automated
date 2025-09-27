import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Users, 
  Globe, 
  FileText, 
  ChartBar, 
  Shield, 
  Trash2, 
  ShieldCheck, 
  ShieldOff, 
  Key, 
  DollarSign, 
  Activity,
  TrendingUp,
  TrendingDown,
  AlertCircle
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
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load admin data",
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
        throw new Error('Failed to fetch user details');
      }
      
      const data = await res.json();
      setSelectedUserDetails(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load user API usage details",
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
        const error = await res.json();
        throw new Error(error.message);
      }

      const updatedUser = await res.json();
      setUsers(users.map(u => u.id === userId ? updatedUser : u));
      
      toast({
        title: "Success",
        description: `Admin status ${!currentStatus ? 'granted' : 'removed'} successfully`
      });
    } catch (error: any) {
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
        const error = await res.json();
        throw new Error(error.message);
      }

      setUsers(users.filter(u => u.id !== deleteUserId));
      toast({
        title: "Success",
        description: "User deleted successfully"
      });
    } catch (error: any) {
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
            {/* User API Usage Table */}
            <Card>
              <CardHeader>
                <CardTitle>API Usage by User</CardTitle>
                <CardDescription>
                  Individual user API consumption and costs
                </CardDescription>
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
                        <TableCell>{formatNumber(user.requestCount)}</TableCell>
                        <TableCell>{formatNumber(user.totalTokens)}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCost(user.totalCostCents)}
                        </TableCell>
                        <TableCell>
                          {user.lastUsed ? format(new Date(user.lastUsed), 'MMM dd, HH:mm') : 'Never'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedUserId(user.userId)}
                          >
                            <Activity className="w-4 h-4 mr-1" />
                            Details
                          </Button>
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
                        (sum: number, u: any) => sum + u.monthlyCostCents, 0
                      );
                      const percentage = totalMonthlyCost > 0 
                        ? ((user.monthlyCostCents / totalMonthlyCost) * 100).toFixed(1)
                        : '0';
                      
                      return (
                        <TableRow key={user.userId}>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>{formatNumber(user.monthlyRequests)}</TableCell>
                          <TableCell>{formatNumber(user.monthlyTokens)}</TableCell>
                          <TableCell className="font-semibold">
                            {formatCost(user.monthlyCostCents)}
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
                        <TableHead>Requests</TableHead>
                        <TableHead>Tokens</TableHead>
                        <TableHead>Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedUserDetails.modelUsage?.map((model: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{model.model}</TableCell>
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
                        <TableHead>Requests</TableHead>
                        <TableHead>Tokens</TableHead>
                        <TableHead>Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedUserDetails.operationUsage?.map((op: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{op.operation}</TableCell>
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