import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  Key, TrendingUp, DollarSign, Activity, User, Server,
  AlertCircle, ChevronRight, Clock, Zap, Info
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

interface UsageData {
  operations: number;
  tokens: number;
  costCents: number;
  lastUsed: string | null;
  breakdown?: Record<string, number>;
}

interface ProviderData {
  user: UsageData;
  system: UsageData;
  configured: boolean;
  userKeyName: string | null;
  userKeyStatus: string | null;
}

interface UsageSummary {
  providers: {
    openai: ProviderData;
    anthropic: ProviderData;
    gemini: ProviderData;
  };
  totals: {
    user: { operations: number; tokens: number; costCents: number };
    system: { operations: number; tokens: number; costCents: number };
    combined: { operations: number; tokens: number; costCents: number };
  };
}

export default function ApiKeyUsage() {
  const { data, isLoading, error } = useQuery<UsageSummary>({
    queryKey: ["api-key-usage-summary"],
    queryFn: () => api.getApiKeyUsageSummary(),
    refetchInterval: 60000, 
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load API usage data</AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="Total Usage"
          icon={Activity}
          value={`$${(data.totals.combined.costCents / 100).toFixed(2)}`}
          subtitle={`${data.totals.combined.operations} operations`}
          trend={data.totals.combined.operations > 0}
        />
        <SummaryCard
          title="Your Keys"
          icon={User}
          value={`$${(data.totals.user.costCents / 100).toFixed(2)}`}
          subtitle={`${data.totals.user.operations} operations`}
          color="green"
        />
        <SummaryCard
          title="System Keys"
          icon={Server}
          value={`$${(data.totals.system.costCents / 100).toFixed(2)}`}
          subtitle={`${data.totals.system.operations} operations`}
          color="blue"
        />
      </div>

      {/* System Key Warning - Only show for unconfigured providers */}
      {(() => {
        const unconfiguredProviders = Object.entries(data.providers)
          .filter(([_, provider]) => provider.system.operations > 0 && !provider.configured)
          .map(([name]) => name);
        
        if (unconfiguredProviders.length === 0) return null;
        
        return (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Configure API keys for better control</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                You're using system keys for{' '}
                <strong>{unconfiguredProviders.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}</strong>.
                {' '}({data.totals.system.operations} operations, 
                ${(data.totals.system.costCents / 100).toFixed(2)} in costs)
              </p>
              <p className="text-sm">
                Add your own API keys to reduce costs and have better control.
              </p>
              <Link href="/settings">
                <Button size="sm" className="mt-2">
                  Configure API Keys <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        );
      })()}

      {/* Provider Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="openai">OpenAI</TabsTrigger>
          <TabsTrigger value="anthropic">Anthropic</TabsTrigger>
          <TabsTrigger value="gemini">Gemini</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab data={data} />
        </TabsContent>

        <TabsContent value="openai">
          <ProviderTab provider="openai" data={data.providers.openai} />
        </TabsContent>

        <TabsContent value="anthropic">
          <ProviderTab provider="anthropic" data={data.providers.anthropic} />
        </TabsContent>

        <TabsContent value="gemini">
          <ProviderTab provider="gemini" data={data.providers.gemini} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({ 
  title, 
  icon: Icon, 
  value, 
  subtitle, 
  color = "default",
  trend 
}: {
  title: string;
  icon: any;
  value: string;
  subtitle: string;
  color?: "default" | "green" | "blue";
  trend?: boolean;
}) {
  const colorClasses = {
    default: "text-gray-600 bg-gray-100",
    green: "text-green-600 bg-green-100",
    blue: "text-blue-600 bg-blue-100",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center text-xs text-muted-foreground">
          {subtitle}
          {trend && <TrendingUp className="ml-1 h-3 w-3 text-green-500" />}
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewTab({ data }: { data: UsageSummary }) {
  const userPercentage = data.totals.combined.costCents > 0
    ? (data.totals.user.costCents / data.totals.combined.costCents) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Overview</CardTitle>
        <CardDescription>Distribution between your keys and system keys</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Usage Distribution Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Key Usage Distribution</span>
            <span>{userPercentage.toFixed(1)}% User Keys</span>
          </div>
          <div className="flex h-8 overflow-hidden rounded-lg bg-gray-100">
            {userPercentage > 0 && (
              <div 
                className="bg-green-500 flex items-center justify-center text-xs text-white"
                style={{ width: `${userPercentage}%` }}
              >
                {userPercentage > 10 && "User"}
              </div>
            )}
            {userPercentage < 100 && (
              <div 
                className="bg-blue-500 flex items-center justify-center text-xs text-white"
                style={{ width: `${100 - userPercentage}%` }}
              >
                {(100 - userPercentage) > 10 && "System"}
              </div>
            )}
          </div>
        </div>

        {/* Provider Breakdown */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Provider Breakdown</h4>
          {Object.entries(data.providers).map(([provider, providerData]) => (
            <ProviderSummaryRow 
              key={provider}
              provider={provider}
              data={providerData}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ProviderSummaryRow({ 
  provider, 
  data 
}: { 
  provider: string;
  data: ProviderData;
}) {
  const totalOps = data.user.operations + data.system.operations;
  const totalCost = data.user.costCents + data.system.costCents;
  
  if (totalOps === 0) return null;

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <div className="font-medium capitalize">{provider}</div>
        {data.userKeyName && (
          <Badge variant="outline" className="text-xs">
            {data.userKeyName}
          </Badge>
        )}
        {!data.configured && (
          <Badge variant="secondary" className="text-xs">
            No user key
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <User className="h-3 w-3 text-green-500" />
          <span>${(data.user.costCents / 100).toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Server className="h-3 w-3 text-blue-500" />
          <span>${(data.system.costCents / 100).toFixed(2)}</span>
        </div>
        <Badge variant="secondary">
          {totalOps} ops
        </Badge>
      </div>
    </div>
  );
}

function ProviderTab({ 
  provider, 
  data 
}: { 
  provider: string;
  data: ProviderData;
}) {
  const hasUserKey = data.configured;
  const totalOps = data.user.operations + data.system.operations;

  return (
    <div className="space-y-4">
      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">{provider} Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium">User API Key</div>
              <div className="text-xs text-muted-foreground">
                {hasUserKey ? data.userKeyName : "Not configured"}
              </div>
            </div>
            <Badge variant={hasUserKey ? "default" : "secondary"}>
              {hasUserKey ? (data.userKeyStatus || "Active") : "Not Set"}
            </Badge>
          </div>
          
          {!hasUserKey && data.system.operations > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You're using system keys for {provider}. 
                <Link href="/settings" className="underline ml-1">
                  Add your own key
                </Link>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Usage Stats */}
      {totalOps > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UsageCard
            title="Your Key Usage"
            icon={User}
            usage={data.user}
            color="green"
          />
          <UsageCard
            title="System Key Usage"
            icon={Server}
            usage={data.system}
            color="blue"
          />
        </div>
      )}

      {totalOps === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Activity className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-muted-foreground">No usage recorded yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UsageCard({ 
  title, 
  icon: Icon, 
  usage, 
  color 
}: {
  title: string;
  icon: any;
  usage: UsageData;
  color: "green" | "blue";
}) {
  const colorClasses = {
    green: "text-green-600 bg-green-100",
    blue: "text-blue-600 bg-blue-100",
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Never";
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <div className={`p-1 rounded ${colorClasses[color]}`}>
            <Icon className="h-3 w-3" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-2xl font-bold">
              ${(usage.costCents / 100).toFixed(3)}
            </p>
            <p className="text-xs text-muted-foreground">Total Cost</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {usage.operations}
            </p>
            <p className="text-xs text-muted-foreground">Operations</p>
          </div>
        </div>
        
        {usage.tokens > 0 && (
          <div className="pt-2 border-t">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Tokens</span>
              <span className="font-medium">
                {usage.tokens > 1000000 
                  ? `${(usage.tokens / 1000000).toFixed(2)}M`
                  : usage.tokens > 1000
                  ? `${(usage.tokens / 1000).toFixed(1)}K`
                  : usage.tokens}
              </span>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Last used: {formatDate(usage.lastUsed)}
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}