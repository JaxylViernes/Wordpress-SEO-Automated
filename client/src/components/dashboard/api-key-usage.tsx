import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, TrendingUp, DollarSign, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ApiKeyUsageData {
  providers: {
    openai?: {
      configured: boolean;
      keyName: string | null;
      status: string;
      usage?: {
        totalUsageCount: number;
        totalTokens: number;
        totalCostCents: number;
        lastUsed: string | null;
      };
    };
    anthropic?: {
      configured: boolean;
      keyName: string | null;
      status: string;
      usage?: {
        totalUsageCount: number;
        totalTokens: number;
        totalCostCents: number;
        lastUsed: string | null;
      };
    };
    google_pagespeed?: {
      configured: boolean;
      keyName: string | null;
      status: string;
      usage?: {
        totalUsageCount: number;
        totalCostCents: number;
        lastUsed: string | null;
      };
    };
  };
}

export default function ApiKeyUsage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["api-key-usage"],
    queryFn: async () => {
      const status = await api.getApiKeyStatus();
      const keys = await api.getUserApiKeys();
      
      // Fetch usage for each configured key
      const usageData: ApiKeyUsageData = { providers: status.providers };
      
      for (const key of keys) {
        if (key.isActive && key.validationStatus === 'valid') {
          const usage = await api.getApiKeyUsage(key.id);
          if (usageData.providers[key.provider as keyof typeof usageData.providers]) {
            usageData.providers[key.provider as keyof typeof usageData.providers]!.usage = usage;
          }
        }
      }
      
      return usageData;
    },
    staleTime: 30000,
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Key Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Key Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Failed to load usage data</p>
        </CardContent>
      </Card>
    );
  }

  const formatCost = (cents: number) => {
    return `$${(cents / 100).toFixed(4)}`;
  };

  const formatTokens = (tokens: number) => {
    if (tokens > 1000000) {
      return `${(tokens / 1000000).toFixed(2)}M`;
    } else if (tokens > 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  const formatLastUsed = (date: string | null) => {
    if (!date) return "Never";
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API Key Usage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* OpenAI */}
        {data?.providers.openai?.configured && (
          <div className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium text-sm">OpenAI</div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                data.providers.openai.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : data.providers.openai.status === 'system'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {data.providers.openai.status}
              </span>
            </div>
            
            {data.providers.openai.usage && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Activity className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600">Uses:</span>
                  <span className="font-medium">{data.providers.openai.usage.totalUsageCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600">Cost:</span>
                  <span className="font-medium">{formatCost(data.providers.openai.usage.totalCostCents)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600">Tokens:</span>
                  <span className="font-medium">{formatTokens(data.providers.openai.usage.totalTokens)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-600">Last:</span>
                  <span className="font-medium">{formatLastUsed(data.providers.openai.usage.lastUsed)}</span>
                </div>
              </div>
            )}
            
            <div className="text-xs text-gray-500">
              {data.providers.openai.keyName}
            </div>
          </div>
        )}

        {/* Anthropic */}
        {data?.providers.anthropic?.configured && (
          <div className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium text-sm">Anthropic</div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                data.providers.anthropic.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : data.providers.anthropic.status === 'system'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {data.providers.anthropic.status}
              </span>
            </div>
            
            {data.providers.anthropic.usage && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Activity className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600">Uses:</span>
                  <span className="font-medium">{data.providers.anthropic.usage.totalUsageCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600">Cost:</span>
                  <span className="font-medium">{formatCost(data.providers.anthropic.usage.totalCostCents)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600">Tokens:</span>
                  <span className="font-medium">{formatTokens(data.providers.anthropic.usage.totalTokens)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-600">Last:</span>
                  <span className="font-medium">{formatLastUsed(data.providers.anthropic.usage.lastUsed)}</span>
                </div>
              </div>
            )}
            
            <div className="text-xs text-gray-500">
              {data.providers.anthropic.keyName}
            </div>
          </div>
        )}

        {/* Google PageSpeed */}
        {data?.providers.google_pagespeed?.configured && (
          <div className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium text-sm">Google PageSpeed</div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                data.providers.google_pagespeed.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : data.providers.google_pagespeed.status === 'system'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {data.providers.google_pagespeed.status}
              </span>
            </div>
            
            {data.providers.google_pagespeed.usage && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Activity className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600">Uses:</span>
                  <span className="font-medium">{data.providers.google_pagespeed.usage.totalUsageCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600">Cost:</span>
                  <span className="font-medium">{formatCost(data.providers.google_pagespeed.usage.totalCostCents)}</span>
                </div>
                <div className="col-span-2 flex items-center gap-1">
                  <span className="text-gray-600">Last used:</span>
                  <span className="font-medium">{formatLastUsed(data.providers.google_pagespeed.usage.lastUsed)}</span>
                </div>
              </div>
            )}
            
            <div className="text-xs text-gray-500">
              {data.providers.google_pagespeed.keyName}
            </div>
          </div>
        )}

        {/* No API keys configured */}
        {!data?.providers.openai?.configured && 
         !data?.providers.anthropic?.configured && 
         !data?.providers.google_pagespeed?.configured && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">No API keys configured</p>
            <p className="text-xs text-gray-400 mt-1">
              Add API keys in Settings to track usage
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}