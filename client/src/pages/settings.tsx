import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Key, Globe, Bot, Bell, Shield, User, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

// Mock settings data
const getSettings = () => ({
  profile: {
    name: "John Doe",
    email: "john@example.com",
    company: "Digital Marketing Agency",
    timezone: "America/New_York",
  },
  apiKeys: {
    openai: "sk-...",
    claude: "sk-...",
    googlePageSpeed: "AIza...",
  },
  notifications: {
    emailReports: true,
    contentGenerated: true,
    seoIssues: true,
    systemAlerts: false,
  },
  automation: {
    defaultAiModel: "gpt-4o",
    autoFixSeoIssues: true,
    contentGenerationFrequency: "twice-weekly",
    reportGeneration: "weekly",
  },
  security: {
    twoFactorAuth: false,
    sessionTimeout: 24,
    allowApiAccess: true,
  },
});

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState(getSettings());
  const [activeTab, setActiveTab] = useState("profile");

  const { data: websites } = useQuery({
    queryKey: ["/api/websites"],
    queryFn: api.getWebsites,
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: any) => {
      // Mock API call - in real app this would save to backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      return newSettings;
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Your settings have been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateSettings.mutate(settings);
  };

  const updateSetting = (section: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [key]: value,
      },
    }));
  };

  return (
    <div className="py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Page Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Settings
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage your account, integrations, and automation preferences
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Button 
              onClick={handleSave} 
              disabled={updateSettings.isPending}
              className="bg-primary-500 hover:bg-primary-600"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateSettings.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={settings.profile.name}
                      onChange={(e) => updateSetting("profile", "name", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={settings.profile.email}
                      onChange={(e) => updateSetting("profile", "email", e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={settings.profile.company}
                    onChange={(e) => updateSetting("profile", "company", e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={settings.profile.timezone}
                    onValueChange={(value) => updateSetting("profile", "timezone", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations */}
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="w-5 h-5 mr-2" />
                  API Keys
                </CardTitle>
                <CardDescription>
                  Configure your AI and third-party service integrations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="openai">OpenAI API Key</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      id="openai"
                      type="password"
                      value={settings.apiKeys.openai}
                      onChange={(e) => updateSetting("apiKeys", "openai", e.target.value)}
                      placeholder="sk-..."
                    />
                    <Badge className="bg-green-100 text-green-800">Connected</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Required for GPT-4 content generation
                  </p>
                </div>

                <div>
                  <Label htmlFor="claude">Anthropic Claude API Key</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      id="claude"
                      type="password"
                      value={settings.apiKeys.claude}
                      onChange={(e) => updateSetting("apiKeys", "claude", e.target.value)}
                      placeholder="sk-..."
                    />
                    <Badge className="bg-green-100 text-green-800">Connected</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Required for Claude-3 content generation
                  </p>
                </div>

                <div>
                  <Label htmlFor="pageSpeed">Google PageSpeed Insights API Key</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      id="pageSpeed"
                      type="password"
                      value={settings.apiKeys.googlePageSpeed}
                      onChange={(e) => updateSetting("apiKeys", "googlePageSpeed", e.target.value)}
                      placeholder="AIza..."
                    />
                    <Badge className="bg-green-100 text-green-800">Connected</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Required for automated SEO analysis
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>WordPress Connections</CardTitle>
                <CardDescription>
                  Manage your connected WordPress websites
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {websites?.map((website) => (
                    <div key={website.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Globe className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{website.name}</p>
                          <p className="text-sm text-gray-500">{website.url}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={
                          website.status === "active" ? "bg-green-100 text-green-800" :
                          website.status === "processing" ? "bg-yellow-100 text-yellow-800" :
                          "bg-red-100 text-red-800"
                        }>
                          {website.status}
                        </Badge>
                        <Button size="sm" variant="outline">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Automation Settings */}
          <TabsContent value="automation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bot className="w-5 h-5 mr-2" />
                  Automation Preferences
                </CardTitle>
                <CardDescription>
                  Configure your AI content generation and SEO automation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="defaultAi">Default AI Model</Label>
                  <Select
                    value={settings.automation.defaultAiModel}
                    onValueChange={(value) => updateSetting("automation", "defaultAiModel", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o">GPT-4 (Recommended)</SelectItem>
                      <SelectItem value="claude-3">Claude-3</SelectItem>
                      <SelectItem value="auto-select">Auto-Select Best</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    This will be used as the default for new content generation
                  </p>
                </div>

                <div>
                  <Label htmlFor="frequency">Content Generation Frequency</Label>
                  <Select
                    value={settings.automation.contentGenerationFrequency}
                    onValueChange={(value) => updateSetting("automation", "contentGenerationFrequency", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="twice-weekly">Twice Weekly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="reports">Report Generation</Label>
                  <Select
                    value={settings.automation.reportGeneration}
                    onValueChange={(value) => updateSetting("automation", "reportGeneration", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="autoFix">Auto-fix SEO Issues</Label>
                    <p className="text-sm text-gray-500">
                      Automatically apply fixes for common SEO issues
                    </p>
                  </div>
                  <Switch
                    id="autoFix"
                    checked={settings.automation.autoFixSeoIssues}
                    onCheckedChange={(checked) => updateSetting("automation", "autoFixSeoIssues", checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="w-5 h-5 mr-2" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose what notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="emailReports">Email Reports</Label>
                    <p className="text-sm text-gray-500">
                      Receive automated reports via email
                    </p>
                  </div>
                  <Switch
                    id="emailReports"
                    checked={settings.notifications.emailReports}
                    onCheckedChange={(checked) => updateSetting("notifications", "emailReports", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="contentGenerated">Content Generated</Label>
                    <p className="text-sm text-gray-500">
                      Notify when AI content is generated
                    </p>
                  </div>
                  <Switch
                    id="contentGenerated"
                    checked={settings.notifications.contentGenerated}
                    onCheckedChange={(checked) => updateSetting("notifications", "contentGenerated", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="seoIssues">SEO Issues</Label>
                    <p className="text-sm text-gray-500">
                      Alert when SEO issues are detected
                    </p>
                  </div>
                  <Switch
                    id="seoIssues"
                    checked={settings.notifications.seoIssues}
                    onCheckedChange={(checked) => updateSetting("notifications", "seoIssues", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="systemAlerts">System Alerts</Label>
                    <p className="text-sm text-gray-500">
                      Receive system maintenance and update notifications
                    </p>
                  </div>
                  <Switch
                    id="systemAlerts"
                    checked={settings.notifications.systemAlerts}
                    onCheckedChange={(checked) => updateSetting("notifications", "systemAlerts", checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Manage your account security and access controls
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="twoFactor">Two-Factor Authentication</Label>
                    <p className="text-sm text-gray-500">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Switch
                    id="twoFactor"
                    checked={settings.security.twoFactorAuth}
                    onCheckedChange={(checked) => updateSetting("security", "twoFactorAuth", checked)}
                  />
                </div>

                <div>
                  <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    min="1"
                    max="168"
                    value={settings.security.sessionTimeout}
                    onChange={(e) => updateSetting("security", "sessionTimeout", parseInt(e.target.value))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Automatically log out after this many hours of inactivity
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="apiAccess">API Access</Label>
                    <p className="text-sm text-gray-500">
                      Allow third-party applications to access your data
                    </p>
                  </div>
                  <Switch
                    id="apiAccess"
                    checked={settings.security.allowApiAccess}
                    onCheckedChange={(checked) => updateSetting("security", "allowApiAccess", checked)}
                  />
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium text-gray-900 mb-2">Change Password</h4>
                  <div className="space-y-3">
                    <Input type="password" placeholder="Current password" />
                    <Input type="password" placeholder="New password" />
                    <Input type="password" placeholder="Confirm new password" />
                    <Button variant="outline" size="sm">
                      Update Password
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
