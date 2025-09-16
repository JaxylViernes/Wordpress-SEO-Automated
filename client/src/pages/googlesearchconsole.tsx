import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Globe,
  Plus,
  RefreshCw,
  Send,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  User,
  Trash2,
  FileText,
  Link,
  TrendingUp,
  Clock,
  Search,
  BarChart,
  LogOut,
  Settings,
  Shield,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  Info,
  Copy,
  Check,
  AlertTriangle
} from 'lucide-react';

// Types
interface GoogleAccount {
  id: string;
  email: string;
  name: string;
  picture?: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
  isActive: boolean;
}

interface SearchConsoleProperty {
  siteUrl: string;
  permissionLevel: string;
  siteType: 'SITE' | 'DOMAIN';
  verified: boolean;
  accountId: string;
}

interface IndexingRequest {
  url: string;
  type: 'URL_UPDATED' | 'URL_DELETED';
  notifyTime?: string;
  status?: 'pending' | 'success' | 'error';
  message?: string;
}

interface PerformanceData {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  date?: string;
}

interface URLInspectionResult {
  url: string;
  indexStatus: 'INDEXED' | 'NOT_INDEXED' | 'CRAWLED' | 'DISCOVERED';
  lastCrawlTime?: string;
  pageFetchState?: string;
  googleCanonical?: string;
  userCanonical?: string;
  sitemap?: string[];
  referringUrls?: string[];
  mobileUsability?: 'MOBILE_FRIENDLY' | 'NOT_MOBILE_FRIENDLY' | 'NEUTRAL';
  richResultsStatus?: string;
}

// API Service Class with proper integration
class SearchConsoleAPI {
  private static baseURL = '/api/gsc';
  
  private static async fetchWithAuth(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || error.message || `Request failed with status ${response.status}`);
    }
    
    return response.json();
  }

  static async getAuthUrl(): Promise<string> {
    const data = await this.fetchWithAuth(`${this.baseURL}/auth-url`);
    return data.authUrl;
  }

  static async authenticateAccount(code: string): Promise<GoogleAccount> {
    const data = await this.fetchWithAuth(`${this.baseURL}/auth`, {
      method: 'POST',
      body: JSON.stringify({ code })
    });
    return data.account;
  }

  static async getProperties(accountId: string): Promise<SearchConsoleProperty[]> {
    return this.fetchWithAuth(`${this.baseURL}/properties?accountId=${accountId}`);
  }

  static async requestIndexing(accountId: string, request: IndexingRequest): Promise<any> {
    return this.fetchWithAuth(`${this.baseURL}/index`, {
      method: 'POST',
      body: JSON.stringify({ accountId, ...request })
    });
  }

  static async inspectURL(accountId: string, siteUrl: string, inspectionUrl: string): Promise<URLInspectionResult> {
    return this.fetchWithAuth(`${this.baseURL}/inspect`, {
      method: 'POST',
      body: JSON.stringify({ accountId, siteUrl, inspectionUrl })
    });
  }

  static async submitSitemap(accountId: string, siteUrl: string, sitemapUrl: string): Promise<any> {
    return this.fetchWithAuth(`${this.baseURL}/sitemap`, {
      method: 'POST',
      body: JSON.stringify({ accountId, siteUrl, sitemapUrl })
    });
  }

  static async getPerformance(accountId: string, siteUrl: string, days: number = 28): Promise<PerformanceData[]> {
    return this.fetchWithAuth(
      `${this.baseURL}/performance?accountId=${accountId}&siteUrl=${encodeURIComponent(siteUrl)}&days=${days}`
    );
  }

  static async refreshToken(accountId: string, refreshToken: string): Promise<any> {
    return this.fetchWithAuth(`${this.baseURL}/refresh-token`, {
      method: 'POST',
      body: JSON.stringify({ accountId, refreshToken })
    });
  }
}

// Main Component
const GoogleSearchConsole: React.FC = () => {
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [properties, setProperties] = useState<SearchConsoleProperty[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<GoogleAccount | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<SearchConsoleProperty | null>(null);
  const [indexingQueue, setIndexingQueue] = useState<IndexingRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'index' | 'inspect' | 'sitemap' | 'performance'>('index');
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; message: string } | null>(null);
  
  // Form states
  const [urlToIndex, setUrlToIndex] = useState<string>('');
  const [urlToInspect, setUrlToInspect] = useState<string>('');
  const [sitemapUrl, setSitemapUrl] = useState<string>('');
  const [bulkUrls, setBulkUrls] = useState<string>('');
  const [inspectionResult, setInspectionResult] = useState<URLInspectionResult | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [quotaUsage, setQuotaUsage] = useState<{ used: number; limit: number }>({ used: 0, limit: 200 });
  const [accountDropdownOpen, setAccountDropdownOpen] = useState<boolean>(false);
  
  // Refs for managing auth window and preventing duplicates
  const authWindowRef = useRef<Window | null>(null);
  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);

  // Load saved accounts on mount
  useEffect(() => {
    const loadAccounts = () => {
      try {
        const savedAccounts = localStorage.getItem('gsc_accounts');
        if (savedAccounts) {
          const parsed = JSON.parse(savedAccounts);
          setAccounts(parsed);
          if (parsed.length > 0 && !selectedAccount) {
            setSelectedAccount(parsed[0]);
          }
        }
      } catch (error) {
        console.error('Failed to load saved accounts:', error);
        showNotification('error', 'Failed to load saved accounts');
      }
    };
    
    loadAccounts();
    
    // Check for code in URL (OAuth callback fallback)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      handleOAuthCallback(code);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Load properties when account changes
  useEffect(() => {
    if (selectedAccount) {
      loadProperties(selectedAccount.id);
      loadQuotaUsage(selectedAccount.id);
    }
  }, [selectedAccount]);

  // Save accounts to localStorage whenever they change
  useEffect(() => {
    if (accounts.length > 0) {
      localStorage.setItem('gsc_accounts', JSON.stringify(accounts));
    }
  }, [accounts]);

  // Auto-refresh tokens when needed
  useEffect(() => {
    const refreshTokensIfNeeded = async () => {
      for (const account of accounts) {
        const timeUntilExpiry = account.tokenExpiry - Date.now();
        
        // Refresh if token expires in less than 5 minutes
        if (account.refreshToken && timeUntilExpiry < 300000) {
          try {
            const result = await SearchConsoleAPI.refreshToken(account.id, account.refreshToken);
            
            const updatedAccounts = accounts.map(acc => 
              acc.id === account.id 
                ? { ...acc, accessToken: result.accessToken, tokenExpiry: result.tokenExpiry }
                : acc
            );
            
            setAccounts(updatedAccounts);
            console.log(`Token refreshed for ${account.email}`);
          } catch (error) {
            console.error(`Failed to refresh token for ${account.email}:`, error);
            showNotification('warning', `Token refresh failed for ${account.email}. Please re-authenticate.`);
            
            // Mark account as inactive
            const updatedAccounts = accounts.map(acc => 
              acc.id === account.id ? { ...acc, isActive: false } : acc
            );
            setAccounts(updatedAccounts);
          }
        }
      }
    };

    // Initial check
    refreshTokensIfNeeded();
    
    // Set up interval for periodic checks
    const interval = setInterval(refreshTokensIfNeeded, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [accounts]);

  // Cleanup auth window on unmount
  useEffect(() => {
    return () => {
      if (authWindowRef.current && !authWindowRef.current.closed) {
        authWindowRef.current.close();
      }
      if (messageHandlerRef.current) {
        window.removeEventListener('message', messageHandlerRef.current);
      }
    };
  }, []);

  const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadProperties = async (accountId: string) => {
    setLoading(true);
    try {
      const props = await SearchConsoleAPI.getProperties(accountId);
      setProperties(props);
      if (props.length > 0 && !selectedProperty) {
        setSelectedProperty(props[0]);
      }
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to load properties');
      console.error('Load properties error:', error);
      
      // If authentication error, mark account as inactive
      if (error.message?.includes('authenticated') || error.message?.includes('401')) {
        const updatedAccounts = accounts.map(acc => 
          acc.id === accountId ? { ...acc, isActive: false } : acc
        );
        setAccounts(updatedAccounts);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadQuotaUsage = async (accountId: string) => {
    const today = new Date().toDateString();
    const quotaKey = `gsc_quota_${accountId}_${today}`;
    const used = parseInt(localStorage.getItem(quotaKey) || '0', 10);
    setQuotaUsage({ used, limit: 200 });
  };

  const updateQuotaUsage = (accountId: string, increment: number = 1) => {
    const today = new Date().toDateString();
    const quotaKey = `gsc_quota_${accountId}_${today}`;
    const currentUsage = parseInt(localStorage.getItem(quotaKey) || '0', 10);
    const newUsage = currentUsage + increment;
    localStorage.setItem(quotaKey, newUsage.toString());
    setQuotaUsage({ used: newUsage, limit: 200 });
  };

  const handleOAuthCallback = async (code: string) => {
    if (isAuthenticating) return;
    
    setIsAuthenticating(true);
    try {
      const account = await SearchConsoleAPI.authenticateAccount(code);
      
      // Check if account already exists
      const existingIndex = accounts.findIndex(acc => acc.id === account.id);
      let updatedAccounts;
      
      if (existingIndex >= 0) {
        // Update existing account
        updatedAccounts = [...accounts];
        updatedAccounts[existingIndex] = account;
        showNotification('success', `Account ${account.email} re-authenticated`);
      } else {
        // Add new account
        updatedAccounts = [...accounts, account];
        showNotification('success', `Account ${account.email} connected successfully`);
      }
      
      setAccounts(updatedAccounts);
      setSelectedAccount(account);
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      showNotification('error', error.message || 'Failed to authenticate account');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleAddAccount = async () => {
    if (isAuthenticating) {
      showNotification('info', 'Authentication already in progress');
      return;
    }
    
    try {
      setIsAuthenticating(true);
      
      // Close any existing auth window
      if (authWindowRef.current && !authWindowRef.current.closed) {
        authWindowRef.current.close();
      }
      
      // Remove any existing message handler
      if (messageHandlerRef.current) {
        window.removeEventListener('message', messageHandlerRef.current);
      }
      
      const authUrl = await SearchConsoleAPI.getAuthUrl();
      
      // Open auth window
      const width = 500;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      authWindowRef.current = window.open(
        authUrl,
        'google-auth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      );
      
      // Create message handler for OAuth callback
      const handleMessage = async (event: MessageEvent) => {
        // Security: validate origin
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          const { code } = event.data;
          
          // Remove handler immediately
          window.removeEventListener('message', handleMessage);
          messageHandlerRef.current = null;
          
          // Close auth window
          if (authWindowRef.current && !authWindowRef.current.closed) {
            authWindowRef.current.close();
          }
          authWindowRef.current = null;
          
          // Handle the OAuth callback
          await handleOAuthCallback(code);
          setIsAuthenticating(false);
        } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
          window.removeEventListener('message', handleMessage);
          messageHandlerRef.current = null;
          
          if (authWindowRef.current && !authWindowRef.current.closed) {
            authWindowRef.current.close();
          }
          authWindowRef.current = null;
          
          showNotification('error', event.data.error || 'Authentication failed');
          setIsAuthenticating(false);
        }
      };
      
      messageHandlerRef.current = handleMessage;
      window.addEventListener('message', handleMessage);
      
      // Check if window was closed
      const checkWindow = setInterval(() => {
        if (authWindowRef.current && authWindowRef.current.closed) {
          clearInterval(checkWindow);
          if (messageHandlerRef.current) {
            window.removeEventListener('message', messageHandlerRef.current);
            messageHandlerRef.current = null;
          }
          setIsAuthenticating(false);
        }
      }, 1000);
      
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to initiate authentication');
      setIsAuthenticating(false);
    }
  };

  const handleRemoveAccount = (accountId: string) => {
    const updatedAccounts = accounts.filter(acc => acc.id !== accountId);
    setAccounts(updatedAccounts);
    
    if (updatedAccounts.length === 0) {
      localStorage.removeItem('gsc_accounts');
    }
    
    if (selectedAccount?.id === accountId) {
      setSelectedAccount(updatedAccounts[0] || null);
      setProperties([]);
      setSelectedProperty(null);
    }
    
    showNotification('info', 'Account removed');
  };

  const handleIndexUrl = async () => {
    if (!urlToIndex || !selectedAccount || !selectedProperty) return;
    
    // Check quota
    if (quotaUsage.used >= quotaUsage.limit) {
      showNotification('error', 'Daily quota exceeded (200 URLs/day). Try again tomorrow.');
      return;
    }
    
    // Validate URL
    try {
      const url = new URL(urlToIndex);
      if (!url.protocol.startsWith('http')) {
        showNotification('error', 'Invalid URL: must start with http:// or https://');
        return;
      }
    } catch {
      showNotification('error', 'Invalid URL format');
      return;
    }
    
    const request: IndexingRequest = {
      url: urlToIndex,
      type: 'URL_UPDATED',
      status: 'pending'
    };
    
    setIndexingQueue([...indexingQueue, request]);
    setLoading(true);
    
    try {
      const result = await SearchConsoleAPI.requestIndexing(selectedAccount.id, request);
      
      setIndexingQueue(queue => 
        queue.map(item => 
          item.url === urlToIndex 
            ? { ...item, status: 'success', notifyTime: result.notifyTime }
            : item
        )
      );
      
      updateQuotaUsage(selectedAccount.id, 1);
      showNotification('success', `URL submitted for indexing: ${urlToIndex}`);
      setUrlToIndex('');
    } catch (error: any) {
      setIndexingQueue(queue => 
        queue.map(item => 
          item.url === urlToIndex 
            ? { ...item, status: 'error', message: error.message }
            : item
        )
      );
      
      if (error.message?.includes('quota')) {
        loadQuotaUsage(selectedAccount.id); // Refresh quota count
      }
      
      showNotification('error', error.message || 'Failed to submit URL for indexing');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkIndex = async () => {
    if (!bulkUrls || !selectedAccount || !selectedProperty) return;
    
    const urls = bulkUrls.split('\n').filter(url => url.trim());
    
    if (urls.length === 0) {
      showNotification('error', 'No valid URLs found');
      return;
    }
    
    if (quotaUsage.used + urls.length > quotaUsage.limit) {
      showNotification('warning', `Only ${quotaUsage.limit - quotaUsage.used} URLs can be submitted today`);
      return;
    }
    
    setLoading(true);
    let successCount = 0;
    let errorCount = 0;
    
    for (const url of urls) {
      const trimmedUrl = url.trim();
      if (!trimmedUrl) continue;
      
      const request: IndexingRequest = {
        url: trimmedUrl,
        type: 'URL_UPDATED',
        status: 'pending'
      };
      
      setIndexingQueue(prev => [...prev, request]);
      
      try {
        await SearchConsoleAPI.requestIndexing(selectedAccount.id, request);
        successCount++;
        
        setIndexingQueue(queue => 
          queue.map(item => 
            item.url === trimmedUrl 
              ? { ...item, status: 'success' }
              : item
          )
        );
      } catch (error: any) {
        errorCount++;
        
        setIndexingQueue(queue => 
          queue.map(item => 
            item.url === trimmedUrl 
              ? { ...item, status: 'error', message: error.message }
              : item
          )
        );
        
        if (error.message?.includes('quota')) {
          break; // Stop if quota exceeded
        }
      }
      
      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    updateQuotaUsage(selectedAccount.id, successCount);
    
    if (successCount > 0) {
      showNotification('success', `Successfully submitted ${successCount} URL(s)`);
    }
    if (errorCount > 0) {
      showNotification('warning', `Failed to submit ${errorCount} URL(s)`);
    }
    
    setBulkUrls('');
    setLoading(false);
  };

  const handleInspectUrl = async () => {
    if (!urlToInspect || !selectedAccount || !selectedProperty) return;
    
    // Validate URL
    try {
      const url = new URL(urlToInspect);
      if (!url.protocol.startsWith('http')) {
        showNotification('error', 'Invalid URL: must start with http:// or https://');
        return;
      }
    } catch {
      showNotification('error', 'Invalid URL format');
      return;
    }
    
    setLoading(true);
    setInspectionResult(null);
    
    try {
      const result = await SearchConsoleAPI.inspectURL(
        selectedAccount.id, 
        selectedProperty.siteUrl, 
        urlToInspect
      );
      
      setInspectionResult(result);
      showNotification('success', 'URL inspection completed');
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to inspect URL');
      console.error('Inspect URL error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSitemap = async () => {
    if (!sitemapUrl || !selectedAccount || !selectedProperty) return;
    
    // Validate sitemap URL
    try {
      const url = new URL(sitemapUrl);
      if (!url.protocol.startsWith('http')) {
        showNotification('error', 'Invalid URL: must start with http:// or https://');
        return;
      }
      if (!sitemapUrl.includes('.xml')) {
        showNotification('warning', 'Warning: Sitemap URL typically ends with .xml');
      }
    } catch {
      showNotification('error', 'Invalid URL format');
      return;
    }
    
    setLoading(true);
    try {
      await SearchConsoleAPI.submitSitemap(
        selectedAccount.id,
        selectedProperty.siteUrl,
        sitemapUrl
      );
      
      showNotification('success', `Sitemap submitted: ${sitemapUrl}`);
      setSitemapUrl('');
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to submit sitemap');
      console.error('Submit sitemap error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPerformanceData = async () => {
    if (!selectedAccount || !selectedProperty) return;
    
    setLoading(true);
    try {
      const data = await SearchConsoleAPI.getPerformance(
        selectedAccount.id,
        selectedProperty.siteUrl,
        28
      );
      
      setPerformanceData(data);
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to load performance data');
      console.error('Load performance error:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showNotification('info', 'Copied to clipboard');
    } catch (err) {
      showNotification('error', 'Failed to copy');
    }
  };

  const clearIndexingQueue = () => {
    setIndexingQueue([]);
    showNotification('info', 'Indexing queue cleared');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Globe className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                Google Search Console Manager
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Quota Display */}
              {selectedAccount && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-lg">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">
                    Quota: {quotaUsage.used}/{quotaUsage.limit}
                  </span>
                </div>
              )}
              
              {/* Account Selector */}
              <div className="relative">
                <button
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                >
                  {selectedAccount ? (
                    <>
                      <User className="w-4 h-4" />
                      <span className="text-sm">{selectedAccount.email}</span>
                      <ChevronDown className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4" />
                      <span className="text-sm">Select Account</span>
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
                
                {accountDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    {accounts.map(account => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setSelectedAccount(account);
                          setAccountDropdownOpen(false);
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          {account.picture ? (
                            <img src={account.picture} alt={account.name} className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
                              {account.name[0]}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{account.name}</p>
                            <p className="text-xs text-gray-500">{account.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!account.isActive && (
                            <AlertTriangle className="w-4 h-4 text-yellow-500" title="Token expired" />
                          )}
                          {selectedAccount?.id === account.id && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                      </div>
                    ))}
                    
                    <div className="border-t border-gray-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddAccount();
                          setAccountDropdownOpen(false);
                        }}
                        disabled={isAuthenticating}
                        className="w-full flex items-center space-x-2 px-4 py-3 text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                      >
                        {isAuthenticating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        <span className="text-sm">
                          {isAuthenticating ? 'Authenticating...' : 'Add Google Account'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleAddAccount}
                disabled={isAuthenticating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span className="text-sm">Add Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Property Selector */}
      {selectedAccount && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4 py-3">
              <label className="text-sm font-medium text-gray-700">Property:</label>
              <select
                value={selectedProperty?.siteUrl || ''}
                onChange={(e) => {
                  const prop = properties.find(p => p.siteUrl === e.target.value);
                  setSelectedProperty(prop || null);
                }}
                className="flex-1 max-w-md px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading || properties.length === 0}
              >
                <option value="">
                  {loading ? 'Loading properties...' : 'Select a property'}
                </option>
                {properties.map(property => (
                  <option key={property.siteUrl} value={property.siteUrl}>
                    {property.siteUrl} ({property.siteType})
                  </option>
                ))}
              </select>
              
              {selectedProperty && (
                <div className="flex items-center space-x-2">
                  {selectedProperty.verified ? (
                    <span className="flex items-center text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Verified
                    </span>
                  ) : (
                    <span className="flex items-center text-yellow-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Not Verified
                    </span>
                  )}
                </div>
              )}
              
              <button
                onClick={() => loadProperties(selectedAccount.id)}
                disabled={loading}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh properties"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top duration-300">
          <div className={`flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500 text-white' :
            notification.type === 'error' ? 'bg-red-500 text-white' :
            notification.type === 'warning' ? 'bg-yellow-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
            {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {notification.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
            {notification.type === 'info' && <Info className="w-5 h-5" />}
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 hover:opacity-80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {selectedAccount && selectedProperty ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('index')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'index'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Send className="w-4 h-4 inline mr-2" />
                  URL Indexing
                </button>
                <button
                  onClick={() => setActiveTab('inspect')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'inspect'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Search className="w-4 h-4 inline mr-2" />
                  URL Inspection
                </button>
                <button
                  onClick={() => setActiveTab('sitemap')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'sitemap'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  Sitemaps
                </button>
                <button
                  onClick={() => {
                    setActiveTab('performance');
                    loadPerformanceData();
                  }}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'performance'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 inline mr-2" />
                  Performance
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* URL Indexing Tab */}
              {activeTab === 'index' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Request URL Indexing</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Submit URLs to Google for indexing. This tells Google that your content is new or updated and should be crawled.
                    </p>
                    
                    {/* Single URL */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Single URL
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="url"
                          value={urlToIndex}
                          onChange={(e) => setUrlToIndex(e.target.value)}
                          placeholder="https://example.com/new-page"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={handleIndexUrl}
                          disabled={loading || !urlToIndex || quotaUsage.used >= quotaUsage.limit}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center space-x-2"
                        >
                          {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          <span>Submit</span>
                        </button>
                      </div>
                    </div>

                    {/* Bulk URLs */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bulk URLs (one per line)
                      </label>
                      <textarea
                        value={bulkUrls}
                        onChange={(e) => setBulkUrls(e.target.value)}
                        placeholder={`https://example.com/page1\nhttps://example.com/page2\nhttps://example.com/page3`}
                        rows={5}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={handleBulkIndex}
                        disabled={loading || !bulkUrls || quotaUsage.used >= quotaUsage.limit}
                        className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center space-x-2"
                      >
                        <Send className="w-4 h-4" />
                        <span>Submit All</span>
                      </button>
                    </div>
                  </div>

                  {/* Indexing Queue */}
                  {indexingQueue.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Indexing Queue</h3>
                        <button
                          onClick={clearIndexingQueue}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          Clear Queue
                        </button>
                      </div>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {indexingQueue.map((item, index) => (
                          <div key={index} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center space-x-3">
                              {item.status === 'pending' && <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />}
                              {item.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                              {item.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                              <span className="text-sm text-gray-900 truncate max-w-md">{item.url}</span>
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.status === 'pending' && 'Submitting...'}
                              {item.status === 'success' && 'Submitted'}
                              {item.status === 'error' && (item.message || 'Failed')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* API Quota Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Indexing API Quota</p>
                        <p className="text-sm text-blue-800 mt-1">
                          You can submit up to 200 URLs per day using the Indexing API. 
                          URLs are typically crawled within minutes to hours of submission.
                        </p>
                        <div className="mt-2">
                          <div className="w-full bg-blue-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min((quotaUsage.used / quotaUsage.limit) * 100, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-blue-700 mt-1">
                            {quotaUsage.used} of {quotaUsage.limit} URLs used today
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* URL Inspection Tab */}
              {activeTab === 'inspect' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">URL Inspection Tool</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Check the index status of any URL on your property and see how Google sees your page.
                    </p>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex space-x-2">
                        <input
                          type="url"
                          value={urlToInspect}
                          onChange={(e) => setUrlToInspect(e.target.value)}
                          placeholder="https://example.com/page-to-inspect"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={handleInspectUrl}
                          disabled={loading || !urlToInspect}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center space-x-2"
                        >
                          {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Search className="w-4 h-4" />
                          )}
                          <span>Inspect</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Inspection Results */}
                  {inspectionResult && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Inspection Results</h4>
                      
                      <div className="space-y-4">
                        {/* Index Status */}
                        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                          <span className="text-sm font-medium text-gray-700">Index Status</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            inspectionResult.indexStatus === 'INDEXED'
                              ? 'bg-green-100 text-green-800'
                              : inspectionResult.indexStatus === 'CRAWLED'
                              ? 'bg-blue-100 text-blue-800'
                              : inspectionResult.indexStatus === 'DISCOVERED'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {inspectionResult.indexStatus.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Last Crawl */}
                        {inspectionResult.lastCrawlTime && (
                          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                            <span className="text-sm font-medium text-gray-700">Last Crawled</span>
                            <span className="text-sm text-gray-900">
                              {new Date(inspectionResult.lastCrawlTime).toLocaleDateString()}
                            </span>
                          </div>
                        )}

                        {/* Mobile Usability */}
                        {inspectionResult.mobileUsability && (
                          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                            <span className="text-sm font-medium text-gray-700">Mobile Usability</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              inspectionResult.mobileUsability === 'MOBILE_FRIENDLY'
                                ? 'bg-green-100 text-green-800'
                                : inspectionResult.mobileUsability === 'NOT_MOBILE_FRIENDLY'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {inspectionResult.mobileUsability.replace(/_/g, ' ')}
                            </span>
                          </div>
                        )}

                        {/* Canonical URL */}
                        {inspectionResult.googleCanonical && (
                          <div className="pb-4 border-b border-gray-200">
                            <span className="text-sm font-medium text-gray-700 block mb-2">Canonical URL</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-900 flex-1 truncate">{inspectionResult.googleCanonical}</span>
                              <button
                                onClick={() => copyToClipboard(inspectionResult.googleCanonical || '')}
                                className="p-1 hover:bg-gray-100 rounded"
                                title="Copy to clipboard"
                              >
                                <Copy className="w-4 h-4 text-gray-500" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Actions based on status */}
                        {inspectionResult.indexStatus !== 'INDEXED' && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <button
                              onClick={() => {
                                setUrlToIndex(urlToInspect);
                                setActiveTab('index');
                              }}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                            >
                              <Send className="w-4 h-4" />
                              <span>Request Indexing</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sitemaps Tab */}
              {activeTab === 'sitemap' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Sitemap Management</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Submit your sitemap to help Google discover all the pages on your website.
                    </p>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sitemap URL
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="url"
                          value={sitemapUrl}
                          onChange={(e) => setSitemapUrl(e.target.value)}
                          placeholder="https://example.com/sitemap.xml"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={handleSubmitSitemap}
                          disabled={loading || !sitemapUrl}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center space-x-2"
                        >
                          {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                          <span>Submit</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sitemap Tips */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-900">Sitemap Best Practices</p>
                        <ul className="text-sm text-yellow-800 mt-2 space-y-1 list-disc list-inside">
                          <li>Include all important pages you want indexed</li>
                          <li>Keep your sitemap under 50MB and 50,000 URLs</li>
                          <li>Update your sitemap when you add or remove pages</li>
                          <li>Use sitemap index files for large websites</li>
                          <li>Include lastmod dates to indicate when pages were updated</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Performance Tab */}
              {activeTab === 'performance' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Search Performance</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Monitor your website's performance in Google Search results.
                    </p>
                  </div>

                  {/* Performance Metrics */}
                  {performanceData.length > 0 && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-500">Total Clicks</span>
                            <TrendingUp className="w-4 h-4 text-gray-400" />
                          </div>
                          <p className="text-2xl font-bold text-gray-900 mt-2">
                            {performanceData.reduce((sum, d) => sum + d.clicks, 0).toLocaleString()}
                          </p>
                        </div>
                        
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-500">Total Impressions</span>
                            <BarChart className="w-4 h-4 text-gray-400" />
                          </div>
                          <p className="text-2xl font-bold text-gray-900 mt-2">
                            {performanceData.reduce((sum, d) => sum + d.impressions, 0).toLocaleString()}
                          </p>
                        </div>
                        
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-500">Average CTR</span>
                            <TrendingUp className="w-4 h-4 text-gray-400" />
                          </div>
                          <p className="text-2xl font-bold text-gray-900 mt-2">
                            {performanceData.length > 0 
                              ? (performanceData.reduce((sum, d) => sum + d.ctr, 0) / performanceData.length * 100).toFixed(1)
                              : 0}%
                          </p>
                        </div>
                        
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-500">Average Position</span>
                            <TrendingUp className="w-4 h-4 text-gray-400" />
                          </div>
                          <p className="text-2xl font-bold text-gray-900 mt-2">
                            {performanceData.length > 0
                              ? (performanceData.reduce((sum, d) => sum + d.position, 0) / performanceData.length).toFixed(1)
                              : 0}
                          </p>
                        </div>
                      </div>

                      {/* Performance Chart (simplified) */}
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h4 className="text-lg font-medium text-gray-900 mb-4">Daily Performance</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clicks</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impressions</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CTR</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {performanceData.slice(0, 10).map((data, idx) => (
                                <tr key={idx}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {data.date || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {data.clicks.toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {data.impressions.toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {(data.ctr * 100).toFixed(2)}%
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {data.position.toFixed(1)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}

                  {/* No data message */}
                  {performanceData.length === 0 && !loading && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                      <BarChart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No performance data available</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Performance data will appear here once Google has collected search metrics for your property.
                      </p>
                      <button
                        onClick={loadPerformanceData}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Refresh Data
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Account Management */}
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Connected Accounts</h3>
            <div className="space-y-3">
              {accounts.map(account => (
                <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {account.picture ? (
                      <img src={account.picture} alt={account.name} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                        {account.name[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{account.name}</p>
                      <p className="text-xs text-gray-500">{account.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {account.isActive ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Active
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAddAccount()}
                        className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full hover:bg-yellow-200"
                      >
                        Re-authenticate
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveAccount(account.id)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Remove account"
                    >
                      <Trash2 className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {accounts.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">No accounts connected yet</p>
                <button
                  onClick={handleAddAccount}
                  disabled={isAuthenticating}
                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
                >
                  {isAuthenticating ? 'Authenticating...' : 'Connect your first account'}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Get Started with Google Search Console
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Connect your Google account to start managing your website's presence in Google Search results.
            </p>
            <button
              onClick={handleAddAccount}
              disabled={isAuthenticating}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2 disabled:opacity-50"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  <span>Add Google Account</span>
                </>
              )}
            </button>
            
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="bg-white rounded-lg shadow p-6">
                <Send className="w-8 h-8 text-blue-600 mb-3" />
                <h3 className="font-medium text-gray-900 mb-2">Submit URLs</h3>
                <p className="text-sm text-gray-600">
                  Tell Google about new or updated content on your website
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <Search className="w-8 h-8 text-blue-600 mb-3" />
                <h3 className="font-medium text-gray-900 mb-2">Inspect URLs</h3>
                <p className="text-sm text-gray-600">
                  Check how Google sees your pages and troubleshoot issues
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <TrendingUp className="w-8 h-8 text-blue-600 mb-3" />
                <h3 className="font-medium text-gray-900 mb-2">Track Performance</h3>
                <p className="text-sm text-gray-600">
                  Monitor clicks, impressions, and search rankings
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleSearchConsole;























// // client/src/pages/googlesearchconsole.tsx

// import React, { useState, useEffect, useCallback } from 'react';
// import {
//   Globe,
//   Plus,
//   RefreshCw,
//   Send,
//   CheckCircle,
//   AlertCircle,
//   ExternalLink,
//   User,
//   Trash2,
//   FileText,
//   Link,
//   TrendingUp,
//   Clock,
//   Search,
//   BarChart,
//   LogOut,
//   Settings,
//   Shield,
//   X,
//   ChevronDown,
//   ChevronRight,
//   Loader2,
//   Info,
//   Copy,
//   Check
// } from 'lucide-react';

// // Types
// interface GoogleAccount {
//   id: string;
//   email: string;
//   name: string;
//   picture?: string;
//   accessToken: string;
//   refreshToken: string;
//   tokenExpiry: number;
//   isActive: boolean;
// }

// interface SearchConsoleProperty {
//   siteUrl: string;
//   permissionLevel: string;
//   siteType: 'SITE' | 'DOMAIN';
//   verified: boolean;
//   accountId: string;
// }

// interface IndexingRequest {
//   url: string;
//   type: 'URL_UPDATED' | 'URL_DELETED';
//   notifyTime?: string;
//   status?: 'pending' | 'success' | 'error';
//   message?: string;
// }

// interface PerformanceData {
//   clicks: number;
//   impressions: number;
//   ctr: number;
//   position: number;
//   date?: string;
// }

// interface URLInspectionResult {
//   url: string;
//   indexStatus: 'INDEXED' | 'NOT_INDEXED' | 'CRAWLED' | 'DISCOVERED';
//   lastCrawlTime?: string;
//   pageFetchState?: string;
//   googleCanonical?: string;
//   userCanonical?: string;
//   sitemap?: string[];
//   referringUrls?: string[];
//   mobileUsability?: 'MOBILE_FRIENDLY' | 'NOT_MOBILE_FRIENDLY' | 'NEUTRAL';
//   richResultsStatus?: string;
// }

// // API Service Class
// class SearchConsoleAPI {
//   private static baseURL = 'http://localhost:5000/api/gsc';

//   static async getAuthUrl(): Promise<string> {
//     const response = await fetch(`${this.baseURL}/auth-url`, {
//       credentials: 'include'
//     });
//     if (!response.ok) throw new Error('Failed to get auth URL');
//     const data = await response.json();
//     return data.authUrl;
//   }

//   static async authenticateAccount(code: string): Promise<GoogleAccount> {
//     const response = await fetch(`${this.baseURL}/auth`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       credentials: 'include',
//       body: JSON.stringify({ code })
//     });
//     if (!response.ok) throw new Error('Authentication failed');
//     const data = await response.json();
//     return data.account;
//   }

//   static async getProperties(accountId: string): Promise<SearchConsoleProperty[]> {
//     const response = await fetch(`${this.baseURL}/properties?accountId=${accountId}`, {
//       credentials: 'include'
//     });
//     if (!response.ok) throw new Error('Failed to fetch properties');
//     return response.json();
//   }

//   static async requestIndexing(accountId: string, request: IndexingRequest): Promise<any> {
//     const response = await fetch(`${this.baseURL}/index`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       credentials: 'include',
//       body: JSON.stringify({ accountId, ...request })
//     });
    
//     if (response.status === 429) {
//       throw new Error('Daily quota exceeded (200 URLs/day)');
//     }
//     if (!response.ok) throw new Error('Failed to submit URL for indexing');
//     return response.json();
//   }

//   static async inspectURL(accountId: string, siteUrl: string, inspectionUrl: string): Promise<URLInspectionResult> {
//     const response = await fetch(`${this.baseURL}/inspect`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       credentials: 'include',
//       body: JSON.stringify({ accountId, siteUrl, inspectionUrl })
//     });
//     if (!response.ok) throw new Error('Failed to inspect URL');
//     return response.json();
//   }

//   static async submitSitemap(accountId: string, siteUrl: string, sitemapUrl: string): Promise<any> {
//     const response = await fetch(`${this.baseURL}/sitemap`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       credentials: 'include',
//       body: JSON.stringify({ accountId, siteUrl, sitemapUrl })
//     });
//     if (!response.ok) throw new Error('Failed to submit sitemap');
//     return response.json();
//   }

//   static async getPerformance(accountId: string, siteUrl: string, days: number = 28): Promise<PerformanceData[]> {
//     const response = await fetch(
//       `${this.baseURL}/performance?accountId=${accountId}&siteUrl=${encodeURIComponent(siteUrl)}&days=${days}`,
//       { credentials: 'include' }
//     );
//     if (!response.ok) throw new Error('Failed to fetch performance data');
//     return response.json();
//   }

//   static async refreshToken(accountId: string, refreshToken: string): Promise<any> {
//     const response = await fetch(`${this.baseURL}/refresh-token`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       credentials: 'include',
//       body: JSON.stringify({ accountId, refreshToken })
//     });
//     if (!response.ok) throw new Error('Failed to refresh token');
//     return response.json();
//   }
// }

// // Main Component
// const GoogleSearchConsole: React.FC = () => {
//   const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
//   const [properties, setProperties] = useState<SearchConsoleProperty[]>([]);
//   const [selectedAccount, setSelectedAccount] = useState<GoogleAccount | null>(null);
//   const [selectedProperty, setSelectedProperty] = useState<SearchConsoleProperty | null>(null);
//   const [indexingQueue, setIndexingQueue] = useState<IndexingRequest[]>([]);
//   const [loading, setLoading] = useState<boolean>(false);
//   const [activeTab, setActiveTab] = useState<'index' | 'inspect' | 'sitemap' | 'performance'>('index');
//   const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  
//   // Form states
//   const [urlToIndex, setUrlToIndex] = useState<string>('');
//   const [urlToInspect, setUrlToInspect] = useState<string>('');
//   const [sitemapUrl, setSitemapUrl] = useState<string>('');
//   const [bulkUrls, setBulkUrls] = useState<string>('');
//   const [inspectionResult, setInspectionResult] = useState<URLInspectionResult | null>(null);
//   const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);

//   // Load saved accounts on mount
//   useEffect(() => {
//     const savedAccounts = localStorage.getItem('gsc_accounts');
//     if (savedAccounts) {
//       const parsed = JSON.parse(savedAccounts);
//       setAccounts(parsed);
//       if (parsed.length > 0) {
//         setSelectedAccount(parsed[0]);
//       }
//     }
//   }, []);

//   // Load properties when account changes
//   useEffect(() => {
//     if (selectedAccount) {
//       loadProperties(selectedAccount.id);
//     }
//   }, [selectedAccount]);

//   // Auto-refresh tokens when needed
//   useEffect(() => {
//     const refreshTokensIfNeeded = async () => {
//       for (const account of accounts) {
//         if (account.tokenExpiry && account.tokenExpiry < Date.now() + 300000) { // 5 minutes before expiry
//           try {
//             const result = await SearchConsoleAPI.refreshToken(account.id, account.refreshToken);
            
//             const updatedAccounts = accounts.map(acc => 
//               acc.id === account.id 
//                 ? { ...acc, accessToken: result.accessToken, tokenExpiry: result.tokenExpiry }
//                 : acc
//             );
            
//             setAccounts(updatedAccounts);
//             localStorage.setItem('gsc_accounts', JSON.stringify(updatedAccounts));
//           } catch (error) {
//             console.error(`Failed to refresh token for ${account.email}`);
//           }
//         }
//       }
//     };

//     const interval = setInterval(refreshTokensIfNeeded, 60000); // Check every minute
//     return () => clearInterval(interval);
//   }, [accounts]);

//   const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
//     setNotification({ type, message });
//     setTimeout(() => setNotification(null), 5000);
//   };

//   const loadProperties = async (accountId: string) => {
//     setLoading(true);
//     try {
//       const props = await SearchConsoleAPI.getProperties(accountId);
//       setProperties(props);
//       if (props.length > 0) {
//         setSelectedProperty(props[0]);
//       }
//     } catch (error) {
//       showNotification('error', 'Failed to load properties. Please re-authenticate.');
//       console.error('Load properties error:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

// const handleAddAccount = async () => {
//   try {
//     const authUrl = await SearchConsoleAPI.getAuthUrl();
//     const authWindow = window.open(authUrl, 'google-auth', 'width=500,height=600');
    
//     // Create a flag to prevent duplicate processing
//     let isProcessing = false;
    
//     const handleMessage = async (event: MessageEvent) => {
//       // Check if already processing
//       if (isProcessing) return;
      
//       if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
//         isProcessing = true; // Set flag immediately
//         const { code } = event.data;
        
//         try {
//           const account = await SearchConsoleAPI.authenticateAccount(code);
//           // ... rest of your code
//         } catch (error) {
//           console.error('Auth error:', error);
//           showNotification('error', 'Failed to authenticate account');
//         } finally {
//           // Remove event listener after processing
//           window.removeEventListener('message', handleMessage);
//           authWindow?.close();
//         }
//       }
//     };
    
//     window.addEventListener('message', handleMessage);
//   } catch (error) {
//     showNotification('error', 'Failed to initiate authentication');
//   }
// };

//   const handleRemoveAccount = (accountId: string) => {
//     const updatedAccounts = accounts.filter(acc => acc.id !== accountId);
//     setAccounts(updatedAccounts);
//     localStorage.setItem('gsc_accounts', JSON.stringify(updatedAccounts));
    
//     if (selectedAccount?.id === accountId) {
//       setSelectedAccount(updatedAccounts[0] || null);
//     }
    
//     showNotification('info', 'Account removed');
//   };

//   const handleIndexUrl = async () => {
//     if (!urlToIndex || !selectedAccount || !selectedProperty) return;
    
//     const request: IndexingRequest = {
//       url: urlToIndex,
//       type: 'URL_UPDATED',
//       status: 'pending'
//     };
    
//     setIndexingQueue([...indexingQueue, request]);
//     setLoading(true);
    
//     try {
//       const result = await SearchConsoleAPI.requestIndexing(selectedAccount.id, request);
      
//       setIndexingQueue(queue => 
//         queue.map(item => 
//           item.url === urlToIndex 
//             ? { ...item, status: 'success', notifyTime: result.notifyTime }
//             : item
//         )
//       );
      
//       showNotification('success', `URL submitted for indexing: ${urlToIndex}`);
//       setUrlToIndex('');
//     } catch (error: any) {
//       setIndexingQueue(queue => 
//         queue.map(item => 
//           item.url === urlToIndex 
//             ? { ...item, status: 'error', message: error.message }
//             : item
//         )
//       );
//       showNotification('error', error.message || 'Failed to submit URL for indexing');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleBulkIndex = async () => {
//     if (!bulkUrls || !selectedAccount || !selectedProperty) return;
    
//     const urls = bulkUrls.split('\n').filter(url => url.trim());
    
//     for (const url of urls) {
//       setUrlToIndex(url);
//       await handleIndexUrl();
//     }
    
//     setBulkUrls('');
//   };

//   const handleInspectUrl = async () => {
//     if (!urlToInspect || !selectedAccount || !selectedProperty) return;
    
//     setLoading(true);
//     try {
//       const result = await SearchConsoleAPI.inspectURL(
//         selectedAccount.id, 
//         selectedProperty.siteUrl, 
//         urlToInspect
//       );
      
//       setInspectionResult(result);
//       showNotification('success', 'URL inspection completed');
//     } catch (error) {
//       showNotification('error', 'Failed to inspect URL');
//       console.error('Inspect URL error:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSubmitSitemap = async () => {
//     if (!sitemapUrl || !selectedAccount || !selectedProperty) return;
    
//     setLoading(true);
//     try {
//       await SearchConsoleAPI.submitSitemap(
//         selectedAccount.id,
//         selectedProperty.siteUrl,
//         sitemapUrl
//       );
      
//       showNotification('success', `Sitemap submitted: ${sitemapUrl}`);
//       setSitemapUrl('');
//     } catch (error) {
//       showNotification('error', 'Failed to submit sitemap');
//       console.error('Submit sitemap error:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const loadPerformanceData = async () => {
//     if (!selectedAccount || !selectedProperty) return;
    
//     setLoading(true);
//     try {
//       const data = await SearchConsoleAPI.getPerformance(
//         selectedAccount.id,
//         selectedProperty.siteUrl,
//         28
//       );
      
//       setPerformanceData(data);
//     } catch (error) {
//       showNotification('error', 'Failed to load performance data');
//       console.error('Load performance error:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const copyToClipboard = async (text: string) => {
//     try {
//       await navigator.clipboard.writeText(text);
//       showNotification('info', 'Copied to clipboard');
//     } catch (err) {
//       showNotification('error', 'Failed to copy');
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       <div className="bg-white border-b border-gray-200">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex items-center justify-between h-16">
//             <div className="flex items-center">
//               <Globe className="w-8 h-8 text-blue-600 mr-3" />
//               <h1 className="text-xl font-semibold text-gray-900">
//                 Google Search Console Manager
//               </h1>
//             </div>
            
//             <div className="flex items-center space-x-4">
//               {/* Account Selector */}
//               <div className="relative">
//                 <button
//                   className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
//                   onClick={() => document.getElementById('account-dropdown')?.classList.toggle('hidden')}
//                 >
//                   {selectedAccount ? (
//                     <>
//                       <User className="w-4 h-4" />
//                       <span className="text-sm">{selectedAccount.email}</span>
//                       <ChevronDown className="w-4 h-4" />
//                     </>
//                   ) : (
//                     <>
//                       <User className="w-4 h-4" />
//                       <span className="text-sm">Select Account</span>
//                       <ChevronDown className="w-4 h-4" />
//                     </>
//                   )}
//                 </button>
                
//                 <div id="account-dropdown" className="hidden absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
//                   {accounts.map(account => (
//                     <div
//                       key={account.id}
//                       className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer"
//                       onClick={() => {
//                         setSelectedAccount(account);
//                         document.getElementById('account-dropdown')?.classList.add('hidden');
//                       }}
//                     >
//                       <div className="flex items-center space-x-3">
//                         {account.picture ? (
//                           <img src={account.picture} alt={account.name} className="w-8 h-8 rounded-full" />
//                         ) : (
//                           <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
//                             {account.name[0]}
//                           </div>
//                         )}
//                         <div>
//                           <p className="text-sm font-medium text-gray-900">{account.name}</p>
//                           <p className="text-xs text-gray-500">{account.email}</p>
//                         </div>
//                       </div>
//                       {selectedAccount?.id === account.id && (
//                         <CheckCircle className="w-4 h-4 text-green-500" />
//                       )}
//                     </div>
//                   ))}
                  
//                   <div className="border-t border-gray-200">
//                     <button
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         handleAddAccount();
//                         document.getElementById('account-dropdown')?.classList.add('hidden');
//                       }}
//                       className="w-full flex items-center space-x-2 px-4 py-3 text-blue-600 hover:bg-blue-50 transition-colors"
//                     >
//                       <Plus className="w-4 h-4" />
//                       <span className="text-sm">Add Google Account</span>
//                     </button>
//                   </div>
//                 </div>
//               </div>
              
//               <button
//                 onClick={handleAddAccount}
//                 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
//               >
//                 <Plus className="w-4 h-4" />
//                 <span className="text-sm">Add Account</span>
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Property Selector */}
//       {selectedAccount && (
//         <div className="bg-white border-b border-gray-200">
//           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//             <div className="flex items-center space-x-4 py-3">
//               <label className="text-sm font-medium text-gray-700">Property:</label>
//               <select
//                 value={selectedProperty?.siteUrl || ''}
//                 onChange={(e) => {
//                   const prop = properties.find(p => p.siteUrl === e.target.value);
//                   setSelectedProperty(prop || null);
//                 }}
//                 className="flex-1 max-w-md px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//               >
//                 <option value="">Select a property</option>
//                 {properties.map(property => (
//                   <option key={property.siteUrl} value={property.siteUrl}>
//                     {property.siteUrl} ({property.siteType})
//                   </option>
//                 ))}
//               </select>
              
//               {selectedProperty && (
//                 <div className="flex items-center space-x-2">
//                   {selectedProperty.verified ? (
//                     <span className="flex items-center text-green-600 text-sm">
//                       <CheckCircle className="w-4 h-4 mr-1" />
//                       Verified
//                     </span>
//                   ) : (
//                     <span className="flex items-center text-yellow-600 text-sm">
//                       <AlertCircle className="w-4 h-4 mr-1" />
//                       Not Verified
//                     </span>
//                   )}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Notification */}
//       {notification && (
//         <div className="fixed top-4 right-4 z-50">
//           <div className={`flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg ${
//             notification.type === 'success' ? 'bg-green-500 text-white' :
//             notification.type === 'error' ? 'bg-red-500 text-white' :
//             'bg-blue-500 text-white'
//           }`}>
//             {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
//             {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
//             {notification.type === 'info' && <Info className="w-5 h-5" />}
//             <span>{notification.message}</span>
//             <button
//               onClick={() => setNotification(null)}
//               className="ml-4 hover:opacity-80"
//             >
//               <X className="w-4 h-4" />
//             </button>
//           </div>
//         </div>
//       )}

//       {/* Main Content */}
//       {selectedAccount && selectedProperty ? (
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//           {/* Tabs */}
//           <div className="bg-white rounded-lg shadow mb-6">
//             <div className="border-b border-gray-200">
//               <nav className="flex -mb-px">
//                 <button
//                   onClick={() => setActiveTab('index')}
//                   className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
//                     activeTab === 'index'
//                       ? 'border-blue-500 text-blue-600'
//                       : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
//                   }`}
//                 >
//                   <Send className="w-4 h-4 inline mr-2" />
//                   URL Indexing
//                 </button>
//                 <button
//                   onClick={() => setActiveTab('inspect')}
//                   className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
//                     activeTab === 'inspect'
//                       ? 'border-blue-500 text-blue-600'
//                       : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
//                   }`}
//                 >
//                   <Search className="w-4 h-4 inline mr-2" />
//                   URL Inspection
//                 </button>
//                 <button
//                   onClick={() => setActiveTab('sitemap')}
//                   className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
//                     activeTab === 'sitemap'
//                       ? 'border-blue-500 text-blue-600'
//                       : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
//                   }`}
//                 >
//                   <FileText className="w-4 h-4 inline mr-2" />
//                   Sitemaps
//                 </button>
//                 <button
//                   onClick={() => {
//                     setActiveTab('performance');
//                     loadPerformanceData();
//                   }}
//                   className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
//                     activeTab === 'performance'
//                       ? 'border-blue-500 text-blue-600'
//                       : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
//                   }`}
//                 >
//                   <TrendingUp className="w-4 h-4 inline mr-2" />
//                   Performance
//                 </button>
//               </nav>
//             </div>

//             {/* Tab Content */}
//             <div className="p-6">
//               {/* URL Indexing Tab */}
//               {activeTab === 'index' && (
//                 <div className="space-y-6">
//                   <div>
//                     <h3 className="text-lg font-medium text-gray-900 mb-4">Request URL Indexing</h3>
//                     <p className="text-sm text-gray-600 mb-4">
//                       Submit URLs to Google for indexing. This tells Google that your content is new or updated and should be crawled.
//                     </p>
                    
//                     {/* Single URL */}
//                     <div className="bg-gray-50 rounded-lg p-4 mb-4">
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Single URL
//                       </label>
//                       <div className="flex space-x-2">
//                         <input
//                           type="url"
//                           value={urlToIndex}
//                           onChange={(e) => setUrlToIndex(e.target.value)}
//                           placeholder="https://example.com/new-page"
//                           className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                         />
//                         <button
//                           onClick={handleIndexUrl}
//                           disabled={loading || !urlToIndex}
//                           className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center space-x-2"
//                         >
//                           {loading ? (
//                             <Loader2 className="w-4 h-4 animate-spin" />
//                           ) : (
//                             <Send className="w-4 h-4" />
//                           )}
//                           <span>Submit</span>
//                         </button>
//                       </div>
//                     </div>

//                     {/* Bulk URLs */}
//                     <div className="bg-gray-50 rounded-lg p-4">
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Bulk URLs (one per line)
//                       </label>
//                       <textarea
//                         value={bulkUrls}
//                         onChange={(e) => setBulkUrls(e.target.value)}
//                         placeholder={`https://example.com/page1
// https://example.com/page2
// https://example.com/page3`}
//                         rows={5}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                       />
//                       <button
//                         onClick={handleBulkIndex}
//                         disabled={loading || !bulkUrls}
//                         className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center space-x-2"
//                       >
//                         <Send className="w-4 h-4" />
//                         <span>Submit All</span>
//                       </button>
//                     </div>
//                   </div>

//                   {/* Indexing Queue */}
//                   {indexingQueue.length > 0 && (
//                     <div>
//                       <h3 className="text-lg font-medium text-gray-900 mb-4">Indexing Queue</h3>
//                       <div className="space-y-2">
//                         {indexingQueue.map((item, index) => (
//                           <div key={index} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
//                             <div className="flex items-center space-x-3">
//                               {item.status === 'pending' && <Clock className="w-4 h-4 text-yellow-500" />}
//                               {item.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
//                               {item.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
//                               <span className="text-sm text-gray-900">{item.url}</span>
//                             </div>
//                             <div className="text-sm text-gray-500">
//                               {item.status === 'pending' && 'Submitting...'}
//                               {item.status === 'success' && 'Submitted'}
//                               {item.status === 'error' && item.message}
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   )}

//                   {/* API Quota Info */}
//                   <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
//                     <div className="flex items-start space-x-2">
//                       <Info className="w-5 h-5 text-blue-600 mt-0.5" />
//                       <div>
//                         <p className="text-sm font-medium text-blue-900">Indexing API Quota</p>
//                         <p className="text-sm text-blue-800 mt-1">
//                           You can submit up to 200 URLs per day using the Indexing API. 
//                           URLs are typically crawled within minutes to hours of submission.
//                         </p>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* URL Inspection Tab */}
//               {activeTab === 'inspect' && (
//                 <div className="space-y-6">
//                   <div>
//                     <h3 className="text-lg font-medium text-gray-900 mb-4">URL Inspection Tool</h3>
//                     <p className="text-sm text-gray-600 mb-4">
//                       Check the index status of any URL on your property and see how Google sees your page.
//                     </p>
                    
//                     <div className="bg-gray-50 rounded-lg p-4">
//                       <div className="flex space-x-2">
//                         <input
//                           type="url"
//                           value={urlToInspect}
//                           onChange={(e) => setUrlToInspect(e.target.value)}
//                           placeholder="https://example.com/page-to-inspect"
//                           className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                         />
//                         <button
//                           onClick={handleInspectUrl}
//                           disabled={loading || !urlToInspect}
//                           className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center space-x-2"
//                         >
//                           {loading ? (
//                             <Loader2 className="w-4 h-4 animate-spin" />
//                           ) : (
//                             <Search className="w-4 h-4" />
//                           )}
//                           <span>Inspect</span>
//                         </button>
//                       </div>
//                     </div>
//                   </div>

//                   {/* Inspection Results */}
//                   {inspectionResult && (
//                     <div className="bg-white border border-gray-200 rounded-lg p-6">
//                       <h4 className="text-lg font-medium text-gray-900 mb-4">Inspection Results</h4>
                      
//                       <div className="space-y-4">
//                         {/* Index Status */}
//                         <div className="flex items-center justify-between pb-4 border-b border-gray-200">
//                           <span className="text-sm font-medium text-gray-700">Index Status</span>
//                           <span className={`px-3 py-1 rounded-full text-sm font-medium ${
//                             inspectionResult.indexStatus === 'INDEXED'
//                               ? 'bg-green-100 text-green-800'
//                               : 'bg-yellow-100 text-yellow-800'
//                           }`}>
//                             {inspectionResult.indexStatus}
//                           </span>
//                         </div>

//                         {/* Last Crawl */}
//                         {inspectionResult.lastCrawlTime && (
//                           <div className="flex items-center justify-between pb-4 border-b border-gray-200">
//                             <span className="text-sm font-medium text-gray-700">Last Crawled</span>
//                             <span className="text-sm text-gray-900">
//                               {new Date(inspectionResult.lastCrawlTime).toLocaleDateString()}
//                             </span>
//                           </div>
//                         )}

//                         {/* Mobile Usability */}
//                         <div className="flex items-center justify-between pb-4 border-b border-gray-200">
//                           <span className="text-sm font-medium text-gray-700">Mobile Usability</span>
//                           <span className={`px-3 py-1 rounded-full text-sm font-medium ${
//                             inspectionResult.mobileUsability === 'MOBILE_FRIENDLY'
//                               ? 'bg-green-100 text-green-800'
//                               : 'bg-red-100 text-red-800'
//                           }`}>
//                             {inspectionResult.mobileUsability?.replace('_', ' ')}
//                           </span>
//                         </div>

//                         {/* Canonical URL */}
//                         <div className="pb-4 border-b border-gray-200">
//                           <span className="text-sm font-medium text-gray-700 block mb-2">Canonical URL</span>
//                           <div className="flex items-center space-x-2">
//                             <span className="text-sm text-gray-900 flex-1">{inspectionResult.googleCanonical}</span>
//                             <button
//                               onClick={() => copyToClipboard(inspectionResult.googleCanonical || '')}
//                               className="p-1 hover:bg-gray-100 rounded"
//                             >
//                               <Copy className="w-4 h-4 text-gray-500" />
//                             </button>
//                           </div>
//                         </div>

//                         {/* Sitemaps */}
//                         {inspectionResult.sitemap && inspectionResult.sitemap.length > 0 && (
//                           <div>
//                             <span className="text-sm font-medium text-gray-700 block mb-2">Found in Sitemaps</span>
//                             <div className="space-y-1">
//                               {inspectionResult.sitemap.map((sitemap, idx) => (
//                                 <div key={idx} className="text-sm text-gray-900">
//                                   {sitemap}
//                                 </div>
//                               ))}
//                             </div>
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               )}

//               {/* Sitemaps Tab */}
//               {activeTab === 'sitemap' && (
//                 <div className="space-y-6">
//                   <div>
//                     <h3 className="text-lg font-medium text-gray-900 mb-4">Sitemap Management</h3>
//                     <p className="text-sm text-gray-600 mb-4">
//                       Submit your sitemap to help Google discover all the pages on your website.
//                     </p>
                    
//                     <div className="bg-gray-50 rounded-lg p-4">
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Sitemap URL
//                       </label>
//                       <div className="flex space-x-2">
//                         <input
//                           type="url"
//                           value={sitemapUrl}
//                           onChange={(e) => setSitemapUrl(e.target.value)}
//                           placeholder="https://example.com/sitemap.xml"
//                           className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                         />
//                         <button
//                           onClick={handleSubmitSitemap}
//                           disabled={loading || !sitemapUrl}
//                           className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center space-x-2"
//                         >
//                           {loading ? (
//                             <Loader2 className="w-4 h-4 animate-spin" />
//                           ) : (
//                             <FileText className="w-4 h-4" />
//                           )}
//                           <span>Submit</span>
//                         </button>
//                       </div>
//                     </div>
//                   </div>

//                   {/* Sitemap Tips */}
//                   <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
//                     <div className="flex items-start space-x-2">
//                       <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
//                       <div>
//                         <p className="text-sm font-medium text-yellow-900">Sitemap Best Practices</p>
//                         <ul className="text-sm text-yellow-800 mt-2 space-y-1 list-disc list-inside">
//                           <li>Include all important pages you want indexed</li>
//                           <li>Keep your sitemap under 50MB and 50,000 URLs</li>
//                           <li>Update your sitemap when you add or remove pages</li>
//                           <li>Use sitemap index files for large websites</li>
//                           <li>Include lastmod dates to indicate when pages were updated</li>
//                         </ul>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* Performance Tab */}
//               {activeTab === 'performance' && (
//                 <div className="space-y-6">
//                   <div>
//                     <h3 className="text-lg font-medium text-gray-900 mb-4">Search Performance</h3>
//                     <p className="text-sm text-gray-600 mb-4">
//                       Monitor your website's performance in Google Search results.
//                     </p>
//                   </div>

//                   {/* Performance Metrics */}
//                   {performanceData.length > 0 && (
//                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//                       <div className="bg-white border border-gray-200 rounded-lg p-4">
//                         <div className="flex items-center justify-between">
//                           <span className="text-sm font-medium text-gray-500">Total Clicks</span>
//                           <TrendingUp className="w-4 h-4 text-gray-400" />
//                         </div>
//                         <p className="text-2xl font-bold text-gray-900 mt-2">
//                           {performanceData.reduce((sum, d) => sum + d.clicks, 0).toLocaleString()}
//                         </p>
//                       </div>
                      
//                       <div className="bg-white border border-gray-200 rounded-lg p-4">
//                         <div className="flex items-center justify-between">
//                           <span className="text-sm font-medium text-gray-500">Total Impressions</span>
//                           <BarChart className="w-4 h-4 text-gray-400" />
//                         </div>
//                         <p className="text-2xl font-bold text-gray-900 mt-2">
//                           {performanceData.reduce((sum, d) => sum + d.impressions, 0).toLocaleString()}
//                         </p>
//                       </div>
                      
//                       <div className="bg-white border border-gray-200 rounded-lg p-4">
//                         <div className="flex items-center justify-between">
//                           <span className="text-sm font-medium text-gray-500">Average CTR</span>
//                           <TrendingUp className="w-4 h-4 text-gray-400" />
//                         </div>
//                         <p className="text-2xl font-bold text-gray-900 mt-2">
//                           {performanceData.length > 0 
//                             ? (performanceData.reduce((sum, d) => sum + d.ctr, 0) / performanceData.length * 100).toFixed(1)
//                             : 0}%
//                         </p>
//                       </div>
                      
//                       <div className="bg-white border border-gray-200 rounded-lg p-4">
//                         <div className="flex items-center justify-between">
//                           <span className="text-sm font-medium text-gray-500">Average Position</span>
//                           <TrendingUp className="w-4 h-4 text-gray-400" />
//                         </div>
//                         <p className="text-2xl font-bold text-gray-900 mt-2">
//                           {performanceData.length > 0
//                             ? (performanceData.reduce((sum, d) => sum + d.position, 0) / performanceData.length).toFixed(1)
//                             : 0}
//                         </p>
//                       </div>
//                     </div>
//                   )}

//                   {/* No data message */}
//                   {performanceData.length === 0 && !loading && (
//                     <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
//                       <BarChart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
//                       <p className="text-gray-600">No performance data available</p>
//                       <p className="text-sm text-gray-500 mt-1">
//                         Performance data will appear here once Google has collected search metrics for your property.
//                       </p>
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Account Management */}
//           <div className="mt-6 bg-white rounded-lg shadow p-6">
//             <h3 className="text-lg font-medium text-gray-900 mb-4">Connected Accounts</h3>
//             <div className="space-y-3">
//               {accounts.map(account => (
//                 <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
//                   <div className="flex items-center space-x-3">
//                     {account.picture ? (
//                       <img src={account.picture} alt={account.name} className="w-10 h-10 rounded-full" />
//                     ) : (
//                       <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
//                         {account.name[0]}
//                       </div>
//                     )}
//                     <div>
//                       <p className="text-sm font-medium text-gray-900">{account.name}</p>
//                       <p className="text-xs text-gray-500">{account.email}</p>
//                     </div>
//                   </div>
//                   <div className="flex items-center space-x-2">
//                     {account.isActive && (
//                       <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
//                         Active
//                       </span>
//                     )}
//                     <button
//                       onClick={() => handleRemoveAccount(account.id)}
//                       className="p-1 hover:bg-gray-200 rounded transition-colors"
//                     >
//                       <Trash2 className="w-4 h-4 text-gray-500" />
//                     </button>
//                   </div>
//                 </div>
//               ))}
//             </div>
            
//             {accounts.length === 0 && (
//               <div className="text-center py-4 text-gray-500">
//                 <p className="text-sm">No accounts connected yet</p>
//                 <button
//                   onClick={handleAddAccount}
//                   className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
//                 >
//                   Connect your first account
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       ) : (
//         /* Empty State */
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
//           <div className="text-center">
//             <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
//             <h2 className="text-2xl font-semibold text-gray-900 mb-2">
//               Get Started with Google Search Console
//             </h2>
//             <p className="text-gray-600 mb-8 max-w-md mx-auto">
//               Connect your Google account to start managing your website's presence in Google Search results.
//             </p>
//             <button
//               onClick={handleAddAccount}
//               className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
//             >
//               <Plus className="w-5 h-5" />
//               <span>Add Google Account</span>
//             </button>
            
//             <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
//               <div className="bg-white rounded-lg shadow p-6">
//                 <Send className="w-8 h-8 text-blue-600 mb-3" />
//                 <h3 className="font-medium text-gray-900 mb-2">Submit URLs</h3>
//                 <p className="text-sm text-gray-600">
//                   Tell Google about new or updated content on your website
//                 </p>
//               </div>
//               <div className="bg-white rounded-lg shadow p-6">
//                 <Search className="w-8 h-8 text-blue-600 mb-3" />
//                 <h3 className="font-medium text-gray-900 mb-2">Inspect URLs</h3>
//                 <p className="text-sm text-gray-600">
//                   Check how Google sees your pages and troubleshoot issues
//                 </p>
//               </div>
//               <div className="bg-white rounded-lg shadow p-6">
//                 <TrendingUp className="w-8 h-8 text-blue-600 mb-3" />
//                 <h3 className="font-medium text-gray-900 mb-2">Track Performance</h3>
//                 <p className="text-sm text-gray-600">
//                   Monitor clicks, impressions, and search rankings
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default GoogleSearchConsole;