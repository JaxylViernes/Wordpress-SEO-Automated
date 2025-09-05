// import { useState } from "react";
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { Save, Key, Globe, Bot, Bell, Shield, User, Trash2 } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Switch } from "@/components/ui/switch";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Textarea } from "@/components/ui/textarea";
// import { Badge } from "@/components/ui/badge";
// import { useToast } from "@/hooks/use-toast";
// import { api } from "@/lib/api";

// // Mock settings data
// const getSettings = () => ({
//   profile: {
//     name: "John Doe",
//     email: "john@example.com",
//     company: "Digital Marketing Agency",
//     timezone: "America/New_York",
//   },
//   apiKeys: {
//     openai: "sk-...",
//     claude: "sk-...",
//     googlePageSpeed: "AIza...",
//   },
//   notifications: {
//     emailReports: true,
//     contentGenerated: true,
//     seoIssues: true,
//     systemAlerts: false,
//   },
//   automation: {
//     defaultAiModel: "gpt-4o",
//     autoFixSeoIssues: true,
//     contentGenerationFrequency: "twice-weekly",
//     reportGeneration: "weekly",
//   },
//   security: {
//     twoFactorAuth: false,
//     sessionTimeout: 24,
//     allowApiAccess: true,
//   },
// });

// export default function Settings() {
//   const { toast } = useToast();
//   const queryClient = useQueryClient();
//   const [settings, setSettings] = useState(getSettings());
//   const [activeTab, setActiveTab] = useState("profile");

//   const { data: websites } = useQuery({
//     queryKey: ["/api/websites"],
//     queryFn: api.getWebsites,
//   });

//   const updateSettings = useMutation({
//     mutationFn: async (newSettings: any) => {
//       // Mock API call - in real app this would save to backend
//       await new Promise(resolve => setTimeout(resolve, 1000));
//       return newSettings;
//     },
//     onSuccess: () => {
//       toast({
//         title: "Settings Saved",
//         description: "Your settings have been successfully updated.",
//       });
//     },
//     onError: () => {
//       toast({
//         title: "Save Failed",
//         description: "Failed to save settings. Please try again.",
//         variant: "destructive",
//       });
//     },
//   });

//   const handleSave = () => {
//     updateSettings.mutate(settings);
//   };

//   const updateSetting = (section: string, key: string, value: any) => {
//     setSettings(prev => ({
//       ...prev,
//       [section]: {
//         ...prev[section as keyof typeof prev],
//         [key]: value,
//       },
//     }));
//   };

//   return (
//     <div className="py-6">
//       <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
//         {/* Page Header */}
//         <div className="md:flex md:items-center md:justify-between mb-8">
//           <div className="flex-1 min-w-0">
//             <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
//               Settings
//             </h2>
//             <p className="mt-1 text-sm text-gray-500">
//               Manage your account, integrations, and automation preferences
//             </p>
//           </div>
//           <div className="mt-4 flex md:mt-0 md:ml-4">
//             <Button 
//               onClick={handleSave} 
//               disabled={updateSettings.isPending}
//               className="bg-primary-500 hover:bg-primary-600"
//             >
//               <Save className="w-4 h-4 mr-2" />
//               {updateSettings.isPending ? "Saving..." : "Save Changes"}
//             </Button>
//           </div>
//         </div>

//         <Tabs value={activeTab} onValueChange={setActiveTab}>
//           <TabsList className="grid w-full grid-cols-5">
//             <TabsTrigger value="profile">Profile</TabsTrigger>
//             <TabsTrigger value="integrations">Integrations</TabsTrigger>
//             <TabsTrigger value="automation">Automation</TabsTrigger>
//             <TabsTrigger value="notifications">Notifications</TabsTrigger>
//             <TabsTrigger value="security">Security</TabsTrigger>
//           </TabsList>

//           {/* Profile Settings */}
//           <TabsContent value="profile" className="space-y-6">
//             <Card>
//               <CardHeader>
//                 <CardTitle className="flex items-center">
//                   <User className="w-5 h-5 mr-2" />
//                   Profile Information
//                 </CardTitle>
//                 <CardDescription>
//                   Update your personal information and preferences
//                 </CardDescription>
//               </CardHeader>
//               <CardContent className="space-y-4">
//                 <div className="grid grid-cols-2 gap-4">
//                   <div>
//                     <Label htmlFor="name">Full Name</Label>
//                     <Input
//                       id="name"
//                       value={settings.profile.name}
//                       onChange={(e) => updateSetting("profile", "name", e.target.value)}
//                     />
//                   </div>
//                   <div>
//                     <Label htmlFor="email">Email Address</Label>
//                     <Input
//                       id="email"
//                       type="email"
//                       value={settings.profile.email}
//                       onChange={(e) => updateSetting("profile", "email", e.target.value)}
//                     />
//                   </div>
//                 </div>
                
//                 <div>
//                   <Label htmlFor="company">Company</Label>
//                   <Input
//                     id="company"
//                     value={settings.profile.company}
//                     onChange={(e) => updateSetting("profile", "company", e.target.value)}
//                   />
//                 </div>
                
//                 <div>
//                   <Label htmlFor="timezone">Timezone</Label>
//                   <Select
//                     value={settings.profile.timezone}
//                     onValueChange={(value) => updateSetting("profile", "timezone", value)}
//                   >
//                     <SelectTrigger>
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
//                       <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
//                       <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
//                       <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
//                       <SelectItem value="UTC">UTC</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* Integrations */}
//           <TabsContent value="integrations" className="space-y-6">
//             <Card>
//               <CardHeader>
//                 <CardTitle className="flex items-center">
//                   <Key className="w-5 h-5 mr-2" />
//                   API Keys
//                 </CardTitle>
//                 <CardDescription>
//                   Configure your AI and third-party service integrations
//                 </CardDescription>
//               </CardHeader>
//               <CardContent className="space-y-6">
//                 <div>
//                   <Label htmlFor="openai">OpenAI API Key</Label>
//                   <div className="flex items-center space-x-2 mt-1">
//                     <Input
//                       id="openai"
//                       type="password"
//                       value={settings.apiKeys.openai}
//                       onChange={(e) => updateSetting("apiKeys", "openai", e.target.value)}
//                       placeholder="sk-..."
//                     />
//                     <Badge className="bg-green-100 text-green-800">Connected</Badge>
//                   </div>
//                   <p className="text-xs text-gray-500 mt-1">
//                     Required for GPT-4 content generation
//                   </p>
//                 </div>

//                 <div>
//                   <Label htmlFor="claude">Anthropic Claude API Key</Label>
//                   <div className="flex items-center space-x-2 mt-1">
//                     <Input
//                       id="claude"
//                       type="password"
//                       value={settings.apiKeys.claude}
//                       onChange={(e) => updateSetting("apiKeys", "claude", e.target.value)}
//                       placeholder="sk-..."
//                     />
//                     <Badge className="bg-green-100 text-green-800">Connected</Badge>
//                   </div>
//                   <p className="text-xs text-gray-500 mt-1">
//                     Required for Claude-3 content generation
//                   </p>
//                 </div>

//                 <div>
//                   <Label htmlFor="pageSpeed">Google PageSpeed Insights API Key</Label>
//                   <div className="flex items-center space-x-2 mt-1">
//                     <Input
//                       id="pageSpeed"
//                       type="password"
//                       value={settings.apiKeys.googlePageSpeed}
//                       onChange={(e) => updateSetting("apiKeys", "googlePageSpeed", e.target.value)}
//                       placeholder="AIza..."
//                     />
//                     <Badge className="bg-green-100 text-green-800">Connected</Badge>
//                   </div>
//                   <p className="text-xs text-gray-500 mt-1">
//                     Required for automated SEO analysis
//                   </p>
//                 </div>
//               </CardContent>
//             </Card>

//             <Card>
//               <CardHeader>
//                 <CardTitle>WordPress Connections</CardTitle>
//                 <CardDescription>
//                   Manage your connected WordPress websites
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="space-y-3">
//                   {websites?.map((website) => (
//                     <div key={website.id} className="flex items-center justify-between p-3 border rounded-lg">
//                       <div className="flex items-center space-x-3">
//                         <Globe className="w-5 h-5 text-gray-400" />
//                         <div>
//                           <p className="font-medium text-gray-900">{website.name}</p>
//                           <p className="text-sm text-gray-500">{website.url}</p>
//                         </div>
//                       </div>
//                       <div className="flex items-center space-x-2">
//                         <Badge className={
//                           website.status === "active" ? "bg-green-100 text-green-800" :
//                           website.status === "processing" ? "bg-yellow-100 text-yellow-800" :
//                           "bg-red-100 text-red-800"
//                         }>
//                           {website.status}
//                         </Badge>
//                         <Button size="sm" variant="outline">
//                           <Trash2 className="w-3 h-3" />
//                         </Button>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* Automation Settings */}
//           <TabsContent value="automation" className="space-y-6">
//             <Card>
//               <CardHeader>
//                 <CardTitle className="flex items-center">
//                   <Bot className="w-5 h-5 mr-2" />
//                   Automation Preferences
//                 </CardTitle>
//                 <CardDescription>
//                   Configure your AI content generation and SEO automation
//                 </CardDescription>
//               </CardHeader>
//               <CardContent className="space-y-6">
//                 <div>
//                   <Label htmlFor="defaultAi">Default AI Model</Label>
//                   <Select
//                     value={settings.automation.defaultAiModel}
//                     onValueChange={(value) => updateSetting("automation", "defaultAiModel", value)}
//                   >
//                     <SelectTrigger>
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="gpt-4o">GPT-4 (Recommended)</SelectItem>
//                       <SelectItem value="claude-3">Claude-3</SelectItem>
//                       <SelectItem value="auto-select">Auto-Select Best</SelectItem>
//                     </SelectContent>
//                   </Select>
//                   <p className="text-xs text-gray-500 mt-1">
//                     This will be used as the default for new content generation
//                   </p>
//                 </div>

//                 <div>
//                   <Label htmlFor="frequency">Content Generation Frequency</Label>
//                   <Select
//                     value={settings.automation.contentGenerationFrequency}
//                     onValueChange={(value) => updateSetting("automation", "contentGenerationFrequency", value)}
//                   >
//                     <SelectTrigger>
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="daily">Daily</SelectItem>
//                       <SelectItem value="twice-weekly">Twice Weekly</SelectItem>
//                       <SelectItem value="weekly">Weekly</SelectItem>
//                       <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
//                       <SelectItem value="monthly">Monthly</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 <div>
//                   <Label htmlFor="reports">Report Generation</Label>
//                   <Select
//                     value={settings.automation.reportGeneration}
//                     onValueChange={(value) => updateSetting("automation", "reportGeneration", value)}
//                   >
//                     <SelectTrigger>
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="daily">Daily</SelectItem>
//                       <SelectItem value="weekly">Weekly</SelectItem>
//                       <SelectItem value="monthly">Monthly</SelectItem>
//                       <SelectItem value="quarterly">Quarterly</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 <div className="flex items-center justify-between">
//                   <div>
//                     <Label htmlFor="autoFix">Auto-fix SEO Issues</Label>
//                     <p className="text-sm text-gray-500">
//                       Automatically apply fixes for common SEO issues
//                     </p>
//                   </div>
//                   <Switch
//                     id="autoFix"
//                     checked={settings.automation.autoFixSeoIssues}
//                     onCheckedChange={(checked) => updateSetting("automation", "autoFixSeoIssues", checked)}
//                   />
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* Notifications */}
//           <TabsContent value="notifications" className="space-y-6">
//             <Card>
//               <CardHeader>
//                 <CardTitle className="flex items-center">
//                   <Bell className="w-5 h-5 mr-2" />
//                   Notification Preferences
//                 </CardTitle>
//                 <CardDescription>
//                   Choose what notifications you want to receive
//                 </CardDescription>
//               </CardHeader>
//               <CardContent className="space-y-6">
//                 <div className="flex items-center justify-between">
//                   <div>
//                     <Label htmlFor="emailReports">Email Reports</Label>
//                     <p className="text-sm text-gray-500">
//                       Receive automated reports via email
//                     </p>
//                   </div>
//                   <Switch
//                     id="emailReports"
//                     checked={settings.notifications.emailReports}
//                     onCheckedChange={(checked) => updateSetting("notifications", "emailReports", checked)}
//                   />
//                 </div>

//                 <div className="flex items-center justify-between">
//                   <div>
//                     <Label htmlFor="contentGenerated">Content Generated</Label>
//                     <p className="text-sm text-gray-500">
//                       Notify when AI content is generated
//                     </p>
//                   </div>
//                   <Switch
//                     id="contentGenerated"
//                     checked={settings.notifications.contentGenerated}
//                     onCheckedChange={(checked) => updateSetting("notifications", "contentGenerated", checked)}
//                   />
//                 </div>

//                 <div className="flex items-center justify-between">
//                   <div>
//                     <Label htmlFor="seoIssues">SEO Issues</Label>
//                     <p className="text-sm text-gray-500">
//                       Alert when SEO issues are detected
//                     </p>
//                   </div>
//                   <Switch
//                     id="seoIssues"
//                     checked={settings.notifications.seoIssues}
//                     onCheckedChange={(checked) => updateSetting("notifications", "seoIssues", checked)}
//                   />
//                 </div>

//                 <div className="flex items-center justify-between">
//                   <div>
//                     <Label htmlFor="systemAlerts">System Alerts</Label>
//                     <p className="text-sm text-gray-500">
//                       Receive system maintenance and update notifications
//                     </p>
//                   </div>
//                   <Switch
//                     id="systemAlerts"
//                     checked={settings.notifications.systemAlerts}
//                     onCheckedChange={(checked) => updateSetting("notifications", "systemAlerts", checked)}
//                   />
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* Security */}
//           <TabsContent value="security" className="space-y-6">
//             <Card>
//               <CardHeader>
//                 <CardTitle className="flex items-center">
//                   <Shield className="w-5 h-5 mr-2" />
//                   Security Settings
//                 </CardTitle>
//                 <CardDescription>
//                   Manage your account security and access controls
//                 </CardDescription>
//               </CardHeader>
//               <CardContent className="space-y-6">
//                 <div className="flex items-center justify-between">
//                   <div>
//                     <Label htmlFor="twoFactor">Two-Factor Authentication</Label>
//                     <p className="text-sm text-gray-500">
//                       Add an extra layer of security to your account
//                     </p>
//                   </div>
//                   <Switch
//                     id="twoFactor"
//                     checked={settings.security.twoFactorAuth}
//                     onCheckedChange={(checked) => updateSetting("security", "twoFactorAuth", checked)}
//                   />
//                 </div>

//                 <div>
//                   <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
//                   <Input
//                     id="sessionTimeout"
//                     type="number"
//                     min="1"
//                     max="168"
//                     value={settings.security.sessionTimeout}
//                     onChange={(e) => updateSetting("security", "sessionTimeout", parseInt(e.target.value))}
//                   />
//                   <p className="text-xs text-gray-500 mt-1">
//                     Automatically log out after this many hours of inactivity
//                   </p>
//                 </div>

//                 <div className="flex items-center justify-between">
//                   <div>
//                     <Label htmlFor="apiAccess">API Access</Label>
//                     <p className="text-sm text-gray-500">
//                       Allow third-party applications to access your data
//                     </p>
//                   </div>
//                   <Switch
//                     id="apiAccess"
//                     checked={settings.security.allowApiAccess}
//                     onCheckedChange={(checked) => updateSetting("security", "allowApiAccess", checked)}
//                   />
//                 </div>

//                 <div className="pt-4 border-t">
//                   <h4 className="font-medium text-gray-900 mb-2">Change Password</h4>
//                   <div className="space-y-3">
//                     <Input type="password" placeholder="Current password" />
//                     <Input type="password" placeholder="New password" />
//                     <Input type="password" placeholder="Confirm new password" />
//                     <Button variant="outline" size="sm">
//                       Update Password
//                     </Button>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>
//         </Tabs>
//       </div>
//     </div>
//   );
// }



import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Key, Globe, Bot, Bell, Shield, User, Trash2, Eye, EyeOff, Check, X, Loader2, Plus } from "lucide-react";
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

// API Key interfaces
interface UserApiKey {
  id: string;
  provider: string;
  keyName: string;
  maskedKey: string;
  isActive: boolean;
  validationStatus: 'valid' | 'invalid' | 'pending';
  lastValidated?: string;
  createdAt: string;
}

interface ApiKeyFormData {
  provider: string;
  keyName: string;
  apiKey: string;
}

interface ApiKeyStatus {
  providers: {
    openai: {
      configured: boolean;
      keyName?: string;
      lastValidated?: string;
      status: string;
    };
    anthropic: {
      configured: boolean;
      keyName?: string;
      lastValidated?: string;
      status: string;
    };
    google_pagespeed: {
      configured: boolean;
      keyName?: string;
      lastValidated?: string;
      status: string;
    };
  };
}

// Mock settings data for non-API key settings
const getSettings = () => ({
  profile: {
    name: "John Doe",
    email: "john@example.com",
    company: "Digital Marketing Agency",
    timezone: "America/New_York",
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
  
  // API Key management state
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [newKeyForm, setNewKeyForm] = useState<ApiKeyFormData>({
    provider: '',
    keyName: '',
    apiKey: ''
  });
  const [validatingKeys, setValidatingKeys] = useState<Set<string>>(new Set());
  const [showApiKey, setShowApiKey] = useState(false);

  const { data: websites } = useQuery({
    queryKey: ["/api/websites"],
    queryFn: api.getWebsites,
  });

  // Fetch user API keys
  const { data: userApiKeys, refetch: refetchApiKeys } = useQuery<UserApiKey[]>({
    queryKey: ["/api/user/api-keys"],
    queryFn: async () => {
      const response = await fetch("/api/user/api-keys", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch API keys');
      return response.json();
    },
  });

  const { data: apiKeyStatus } = useQuery<ApiKeyStatus>({
    queryKey: ["/api/user/api-keys/status"],
    queryFn: async () => {
      const response = await fetch("/api/user/api-keys/status", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch API key status');
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Update non-API settings
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

  // Add API key mutation
  const addApiKey = useMutation({
    mutationFn: async (keyData: ApiKeyFormData) => {
      const response = await fetch("/api/user/api-keys", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(keyData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add API key');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "API Key Added",
        description: "Your API key has been added and validated successfully.",
      });
      setIsAddingKey(false);
      setNewKeyForm({ provider: '', keyName: '', apiKey: '' });
      refetchApiKeys();
      queryClient.invalidateQueries({ queryKey: ["/api/user/api-keys/status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Add API Key",
        description: error.message || "Please check your API key and try again.",
        variant: "destructive",
      });
    },
  });

  // Validate API key mutation
  const validateApiKey = useMutation({
    mutationFn: async (keyId: string) => {
      const response = await fetch(`/api/user/api-keys/${keyId}/validate`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to validate API key');
      }
      
      return response.json();
    },
    onSuccess: (data, keyId) => {
      toast({
        title: data.isValid ? "Key Valid" : "Key Invalid",
        description: data.isValid ? "API key is working correctly." : data.error,
        variant: data.isValid ? "default" : "destructive",
      });
      refetchApiKeys();
      queryClient.invalidateQueries({ queryKey: ["/api/user/api-keys/status"] });
    },
  });

  // Delete API key mutation
  const deleteApiKey = useMutation({
    mutationFn: async (keyId: string) => {
      const response = await fetch(`/api/user/api-keys/${keyId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete API key');
      }
    },
    onSuccess: () => {
      toast({
        title: "API Key Deleted",
        description: "The API key has been removed from your account.",
      });
      refetchApiKeys();
      queryClient.invalidateQueries({ queryKey: ["/api/user/api-keys/status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Delete API Key",
        description: error.message,
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

  const handleAddApiKey = () => {
    if (!newKeyForm.provider || !newKeyForm.keyName || !newKeyForm.apiKey) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }
    
    addApiKey.mutate(newKeyForm);
  };

  const handleValidateKey = (keyId: string) => {
    setValidatingKeys(prev => new Set(prev).add(keyId));
    validateApiKey.mutate(keyId, {
      onFinally: () => {
        setValidatingKeys(prev => {
          const newSet = new Set(prev);
          newSet.delete(keyId);
          return newSet;
        });
      }
    });
  };

  const getStatusBadge = (status: string, provider: string) => {
    const providerStatus = apiKeyStatus?.providers?.[provider as keyof typeof apiKeyStatus.providers];
    
    if (!providerStatus?.configured) {
      return <Badge className="bg-gray-100 text-gray-800">Not Configured</Badge>;
    }
    
    if (status === 'valid') {
      return <Badge className="bg-green-100 text-green-800">✓ Active</Badge>;
    } else if (status === 'invalid') {
      return <Badge className="bg-red-100 text-red-800">✗ Invalid</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai':
        return <Bot className="w-6 h-6 text-green-600" />;
      case 'anthropic':
        return <Bot className="w-6 h-6 text-blue-600" />;
      case 'google_pagespeed':
        return <Globe className="w-6 h-6 text-orange-600" />;
      default:
        return <Key className="w-6 h-6 text-gray-400" />;
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'OpenAI GPT-4';
      case 'anthropic':
        return 'Anthropic Claude';
      case 'google_pagespeed':
        return 'Google PageSpeed Insights';
      default:
        return provider;
    }
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
            <TabsTrigger value="integrations">API Keys</TabsTrigger>
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

          {/* API Keys (Integrations) */}
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Key className="w-5 h-5 mr-2" />
                    Your API Keys
                  </span>
                  <Button
                    size="sm"
                    onClick={() => setIsAddingKey(true)}
                    disabled={isAddingKey}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add API Key
                  </Button>
                </CardTitle>
                <CardDescription>
                  Securely store and manage your AI service API keys. Keys are encrypted and never visible in full.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add New API Key Form */}
                {isAddingKey && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium mb-4">Add New API Key</h4>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="provider">Service Provider</Label>
                        <Select
                          value={newKeyForm.provider}
                          onValueChange={(value) => setNewKeyForm(prev => ({ ...prev, provider: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="openai">OpenAI (GPT-4)</SelectItem>
                            <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                            <SelectItem value="google_pagespeed">Google PageSpeed Insights</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="keyName">Key Name</Label>
                        <Input
                          id="keyName"
                          placeholder="e.g., My OpenAI Key"
                          value={newKeyForm.keyName}
                          onChange={(e) => setNewKeyForm(prev => ({ ...prev, keyName: e.target.value }))}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="apiKey">API Key</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="apiKey"
                            type={showApiKey ? "text" : "password"}
                            placeholder={
                              newKeyForm.provider === 'openai' ? 'sk-...' :
                              newKeyForm.provider === 'anthropic' ? 'sk-ant-...' :
                              'AIza...'
                            }
                            value={newKeyForm.apiKey}
                            onChange={(e) => setNewKeyForm(prev => ({ ...prev, apiKey: e.target.value }))}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowApiKey(!showApiKey)}
                          >
                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button 
                          onClick={handleAddApiKey} 
                          disabled={addApiKey.isPending}
                        >
                          {addApiKey.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4 mr-2" />
                          )}
                          {addApiKey.isPending ? "Validating..." : "Add Key"}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setIsAddingKey(false);
                            setNewKeyForm({ provider: '', keyName: '', apiKey: '' });
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Existing API Keys */}
                <div className="space-y-3">
                  {userApiKeys?.map((apiKey: UserApiKey) => (
                    <div key={apiKey.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                          {getProviderIcon(apiKey.provider)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{apiKey.keyName}</p>
                          <p className="text-sm text-gray-500">
                            {getProviderName(apiKey.provider)}
                          </p>
                          <p className="text-xs text-gray-400 font-mono">{apiKey.maskedKey}</p>
                          {apiKey.lastValidated && (
                            <p className="text-xs text-gray-400">
                              Last validated: {new Date(apiKey.lastValidated).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(apiKey.validationStatus, apiKey.provider)}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleValidateKey(apiKey.id)}
                          disabled={validatingKeys.has(apiKey.id)}
                        >
                          {validatingKeys.has(apiKey.id) ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteApiKey.mutate(apiKey.id)}
                          disabled={deleteApiKey.isPending}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {(!userApiKeys || userApiKeys.length === 0) && !isAddingKey && (
                    <div className="text-center py-8 text-gray-500">
                      <Key className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No API keys configured yet.</p>
                      <p className="text-sm">Add your first API key to get started with AI content generation.</p>
                    </div>
                  )}
                </div>

                {/* Provider Status Overview */}
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium mb-3">Service Status</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 border rounded">
                      <Bot className="w-8 h-8 mx-auto mb-2 text-green-600" />
                      <p className="font-medium">OpenAI</p>
                      {getStatusBadge(
                        apiKeyStatus?.providers?.openai?.configured ? 'valid' : 'invalid',
                        'openai'
                      )}
                    </div>
                    <div className="text-center p-3 border rounded">
                      <Bot className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                      <p className="font-medium">Anthropic</p>
                      {getStatusBadge(
                        apiKeyStatus?.providers?.anthropic?.configured ? 'valid' : 'invalid',
                        'anthropic'
                      )}
                    </div>
                    <div className="text-center p-3 border rounded">
                      <Globe className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                      <p className="font-medium">PageSpeed</p>
                      {getStatusBadge(
                        apiKeyStatus?.providers?.google_pagespeed?.configured ? 'valid' : 'invalid',
                        'google_pagespeed'
                      )}
                    </div>
                  </div>
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
