// import React, { useState, useEffect, useCallback, useRef } from 'react';
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
//   Check,
//   AlertTriangle,
//   Key,
//   Eye,
//   EyeOff,
//   Save,
//   Edit,
//   Activity,
//   Map
// } from 'lucide-react';

// // Types
// interface GscConfiguration {
//   id?: string;
//   clientId: string;
//   clientSecret: string;
//   redirectUri: string;
//   isConfigured: boolean;
// }

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

// // API Service Class
// class SearchConsoleAPI {
//   private static baseURL = '/api/gsc';
  
//   private static async fetchWithAuth(url: string, options: RequestInit = {}) {
//     const response = await fetch(url, {
//       ...options,
//       credentials: 'include',
//       headers: {
//         'Content-Type': 'application/json',
//         ...options.headers,
//       },
//     });
    
//     if (!response.ok) {
//       const error = await response.json().catch(() => ({ error: 'Unknown error' }));
//       throw new Error(error.error || error.message || `Request failed with status ${response.status}`);
//     }
    
//     return response.json();
//   }

//   static async saveConfiguration(config: {
//     clientId: string;
//     clientSecret: string;
//     redirectUri: string;
//   }): Promise<GscConfiguration> {
//     return this.fetchWithAuth(`${this.baseURL}/configuration`, {
//       method: 'POST',
//       body: JSON.stringify(config)
//     });
//   }

//   static async getConfiguration(): Promise<GscConfiguration | null> {
//     try {
//       return await this.fetchWithAuth(`${this.baseURL}/configuration`);
//     } catch (error) {
//       return null;
//     }
//   }

//   static async deleteConfiguration(): Promise<void> {
//     await this.fetchWithAuth(`${this.baseURL}/configuration`, {
//       method: 'DELETE'
//     });
//   }

//   static async testConfiguration(config: {
//     clientId: string;
//     clientSecret: string;
//     redirectUri: string;
//   }): Promise<{ valid: boolean; error?: string }> {
//     return this.fetchWithAuth(`${this.baseURL}/configuration/test`, {
//       method: 'POST',
//       body: JSON.stringify(config)
//     });
//   }

//   static async getAuthUrl(): Promise<string> {
//     const data = await this.fetchWithAuth(`${this.baseURL}/auth-url`);
//     return data.authUrl;
//   }

//   static async authenticateAccount(code: string): Promise<GoogleAccount> {
//     const data = await this.fetchWithAuth(`${this.baseURL}/auth`, {
//       method: 'POST',
//       body: JSON.stringify({ code })
//     });
//     return data.account;
//   }

//   static async getProperties(accountId: string): Promise<SearchConsoleProperty[]> {
//     return this.fetchWithAuth(`${this.baseURL}/properties?accountId=${accountId}`);
//   }

//   static async requestIndexing(accountId: string, request: IndexingRequest): Promise<any> {
//     return this.fetchWithAuth(`${this.baseURL}/index`, {
//       method: 'POST',
//       body: JSON.stringify({ accountId, ...request })
//     });
//   }

//   static async inspectURL(accountId: string, siteUrl: string, inspectionUrl: string): Promise<any> {
//     return this.fetchWithAuth(`${this.baseURL}/inspect`, {
//       method: 'POST',
//       body: JSON.stringify({ accountId, siteUrl, inspectionUrl })
//     });
//   }

//   static async submitSitemap(accountId: string, siteUrl: string, sitemapUrl: string): Promise<any> {
//     return this.fetchWithAuth(`${this.baseURL}/sitemap`, {
//       method: 'POST',
//       body: JSON.stringify({ accountId, siteUrl, sitemapUrl })
//     });
//   }

//   static async getPerformance(accountId: string, siteUrl: string, days: number = 28): Promise<any[]> {
//     return this.fetchWithAuth(
//       `${this.baseURL}/performance?accountId=${accountId}&siteUrl=${encodeURIComponent(siteUrl)}&days=${days}`
//     );
//   }

//   static async refreshToken(accountId: string, refreshToken: string): Promise<any> {
//     return this.fetchWithAuth(`${this.baseURL}/refresh-token`, {
//       method: 'POST',
//       body: JSON.stringify({ accountId, refreshToken })
//     });
//   }
// }

// // Configuration Modal Component
// const ConfigurationModal: React.FC<{
//   isOpen: boolean;
//   onClose: () => void;
//   onSave: (config: GscConfiguration) => void;
//   initialConfig?: GscConfiguration | null;
// }> = ({ isOpen, onClose, onSave, initialConfig }) => {
//   const [clientId, setClientId] = useState(initialConfig?.clientId || '');
//   const [clientSecret, setClientSecret] = useState('');
//   const [redirectUri, setRedirectUri] = useState(initialConfig?.redirectUri || '');
//   const [showSecret, setShowSecret] = useState(false);
//   const [testing, setTesting] = useState(false);
//   const [testResult, setTestResult] = useState<{ valid: boolean; error?: string } | null>(null);
//   const [saving, setSaving] = useState(false);
//   const [showInstructions, setShowInstructions] = useState(false);

//   useEffect(() => {
//     if (isOpen && initialConfig) {
//       setClientId(initialConfig.clientId || '');
//       setRedirectUri(initialConfig.redirectUri || window.location.origin + '/api/gsc/oauth-callback');
//     }
//   }, [isOpen, initialConfig]);

//   const handleTest = async () => {
//     if (!clientId || !clientSecret) {
//       setTestResult({ valid: false, error: 'Client ID and Secret are required' });
//       return;
//     }

//     setTesting(true);
//     try {
//       const result = await SearchConsoleAPI.testConfiguration({
//         clientId,
//         clientSecret,
//         redirectUri: redirectUri || window.location.origin + '/api/gsc/oauth-callback'
//       });
//       setTestResult(result);
//     } catch (error: any) {
//       setTestResult({ valid: false, error: error.message });
//     } finally {
//       setTesting(false);
//     }
//   };

//   const handleSave = async () => {
//     if (!clientId || !clientSecret) {
//       setTestResult({ valid: false, error: 'Client ID and Secret are required' });
//       return;
//     }

//     setSaving(true);
//     try {
//       const config = await SearchConsoleAPI.saveConfiguration({
//         clientId,
//         clientSecret,
//         redirectUri: redirectUri || window.location.origin + '/api/gsc/oauth-callback'
//       });
//       onSave(config);
//       onClose();
//     } catch (error: any) {
//       setTestResult({ valid: false, error: error.message });
//     } finally {
//       setSaving(false);
//     }
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//       <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
//         <div className="p-5 border-b border-gray-200">
//           <div className="flex items-center justify-between">
//             <h2 className="text-lg font-semibold text-gray-900 flex items-center">
//               <Key className="w-5 h-5 mr-2 text-blue-600" />
//               OAuth Configuration
//             </h2>
//             <button
//               onClick={onClose}
//               className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
//             >
//               <X className="w-4 h-4" />
//             </button>
//           </div>
//         </div>

//         <div className="p-5 space-y-4">
//           {/* Collapsible Instructions */}
//           <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
//             <button
//               onClick={() => setShowInstructions(!showInstructions)}
//               className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-100 transition-colors"
//             >
//               <div className="flex items-center space-x-2">
//                 <Info className="w-4 h-4 text-blue-600" />
//                 <span className="text-sm font-medium text-blue-900">Setup Instructions</span>
//               </div>
//               {showInstructions ? (
//                 <ChevronDown className="w-4 h-4 text-blue-600" />
//               ) : (
//                 <ChevronRight className="w-4 h-4 text-blue-600" />
//               )}
//             </button>
//             {showInstructions && (
//               <div className="px-4 pb-3 text-xs text-blue-900 space-y-1">
//                 <ol className="list-decimal list-inside space-y-1">
//                   <li>Visit Google Cloud Console</li>
//                   <li>Enable Search Console & Indexing APIs</li>
//                   <li>Create OAuth 2.0 credentials</li>
//                   <li>Add redirect URI: <code className="bg-blue-100 px-1 rounded">{window.location.origin}/api/gsc/oauth-callback</code></li>
//                 </ol>
//               </div>
//             )}
//           </div>

//           {/* Client ID */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1.5">
//               Client ID
//             </label>
//             <input
//               type="text"
//               value={clientId}
//               onChange={(e) => setClientId(e.target.value)}
//               placeholder="Your OAuth Client ID"
//               className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//             />
//           </div>

//           {/* Client Secret */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1.5">
//               Client Secret
//             </label>
//             <div className="relative">
//               <input
//                 type={showSecret ? "text" : "password"}
//                 value={clientSecret}
//                 onChange={(e) => setClientSecret(e.target.value)}
//                 placeholder="Your OAuth Client Secret"
//                 className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//               />
//               <button
//                 type="button"
//                 onClick={() => setShowSecret(!showSecret)}
//                 className="absolute inset-y-0 right-0 pr-3 flex items-center"
//               >
//                 {showSecret ? (
//                   <EyeOff className="w-4 h-4 text-gray-400" />
//                 ) : (
//                   <Eye className="w-4 h-4 text-gray-400" />
//                 )}
//               </button>
//             </div>
//           </div>

//           {/* Test Result */}
//           {testResult && (
//             <div className={`p-3 rounded-lg text-sm ${
//               testResult.valid 
//                 ? 'bg-green-50 border border-green-200 text-green-800' 
//                 : 'bg-red-50 border border-red-200 text-red-800'
//             }`}>
//               <div className="flex items-center space-x-2">
//                 {testResult.valid ? (
//                   <CheckCircle className="w-4 h-4" />
//                 ) : (
//                   <AlertCircle className="w-4 h-4" />
//                 )}
//                 <span className="font-medium">
//                   {testResult.valid ? 'Configuration valid' : testResult.error}
//                 </span>
//               </div>
//             </div>
//           )}
//         </div>

//         <div className="p-5 border-t border-gray-200 flex justify-between">
//           <button
//             onClick={handleTest}
//             disabled={testing || !clientId || !clientSecret}
//             className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center space-x-2"
//           >
//             {testing ? (
//               <Loader2 className="w-4 h-4 animate-spin" />
//             ) : (
//               <CheckCircle className="w-4 h-4" />
//             )}
//             <span>Test</span>
//           </button>
          
//           <div className="flex space-x-2">
//             <button
//               onClick={onClose}
//               className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
//             >
//               Cancel
//             </button>
//             <button
//               onClick={handleSave}
//               disabled={saving || !clientId || !clientSecret}
//               className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center space-x-2"
//             >
//               {saving ? (
//                 <Loader2 className="w-4 h-4 animate-spin" />
//               ) : (
//                 <Save className="w-4 h-4" />
//               )}
//               <span>Save</span>
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// // Main Component
// export default function GoogleSearchConsole() {
//   const [configuration, setConfiguration] = useState<GscConfiguration | null>(null);
//   const [configModalOpen, setConfigModalOpen] = useState(false);
//   const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
//   const [properties, setProperties] = useState<SearchConsoleProperty[]>([]);
//   const [selectedAccount, setSelectedAccount] = useState<GoogleAccount | null>(null);
//   const [selectedProperty, setSelectedProperty] = useState<SearchConsoleProperty | null>(null);
//   const [indexingQueue, setIndexingQueue] = useState<IndexingRequest[]>([]);
//   const [loading, setLoading] = useState<boolean>(false);
//   const [activeTab, setActiveTab] = useState<'index' | 'inspect' | 'sitemap' | 'performance'>('index');
//   const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; message: string } | null>(null);
  
//   // Form states
//   const [urlToIndex, setUrlToIndex] = useState<string>('');
//   const [indexType, setIndexType] = useState<'URL_UPDATED' | 'URL_DELETED'>('URL_UPDATED');
//   const [urlToInspect, setUrlToInspect] = useState<string>('');
//   const [sitemapUrl, setSitemapUrl] = useState<string>('');
//   const [bulkUrls, setBulkUrls] = useState<string>('');
//   const [inspectionResult, setInspectionResult] = useState<any | null>(null);
//   const [performanceData, setPerformanceData] = useState<any[]>([]);
//   const [performanceDays, setPerformanceDays] = useState<number>(28);
//   const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
//   const [quotaUsage, setQuotaUsage] = useState<{ used: number; limit: number }>({ used: 0, limit: 200 });
//   const [accountDropdownOpen, setAccountDropdownOpen] = useState<boolean>(false);
//   const [sitemapList, setSitemapList] = useState<any[]>([]);
  
//   // Refs for OAuth window handling
//   const authWindowRef = useRef<Window | null>(null);
//   const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);
  
//   // Load initial data
//   useEffect(() => {
//     const loadInitialData = async () => {
//       // Load configuration
//       try {
//         const config = await SearchConsoleAPI.getConfiguration();
//         setConfiguration(config);
//       } catch (error) {
//         console.error('Failed to load configuration:', error);
//       }

//       // Load saved accounts from localStorage
//       const savedAccounts = localStorage.getItem('gsc_accounts');
//       if (savedAccounts) {
//         try {
//           const parsed = JSON.parse(savedAccounts);
//           setAccounts(parsed);
//           if (parsed.length > 0 && !selectedAccount) {
//             setSelectedAccount(parsed[0]);
//           }
//         } catch (error) {
//           console.error('Failed to parse saved accounts:', error);
//         }
//       }
//     };
    
//     loadInitialData();
    
//     // Check for OAuth callback in URL
//     const urlParams = new URLSearchParams(window.location.search);
//     const code = urlParams.get('code');
//     if (code) {
//       handleOAuthCallback(code);
//       window.history.replaceState({}, document.title, window.location.pathname);
//     }
//   }, []);

//   // Load properties when account changes
//   useEffect(() => {
//     if (selectedAccount) {
//       loadProperties(selectedAccount.id);
//       loadQuotaUsage(selectedAccount.id);
//     }
//   }, [selectedAccount]);

//   // Load performance data when property or tab changes
//   useEffect(() => {
//     if (selectedProperty && activeTab === 'performance') {
//       loadPerformanceData();
//     }
//   }, [selectedProperty, activeTab, performanceDays]);

//   const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
//     setNotification({ type, message });
//     setTimeout(() => setNotification(null), 5000);
//   };

//   const handleOAuthCallback = async (code: string) => {
//     if (isAuthenticating) return;
    
//     setIsAuthenticating(true);
//     try {
//       const account = await SearchConsoleAPI.authenticateAccount(code);
      
//       const existingIndex = accounts.findIndex(acc => acc.id === account.id);
//       let updatedAccounts;
      
//       if (existingIndex >= 0) {
//         updatedAccounts = [...accounts];
//         updatedAccounts[existingIndex] = account;
//         showNotification('success', `Account ${account.email} re-authenticated`);
//       } else {
//         updatedAccounts = [...accounts, account];
//         showNotification('success', `Account ${account.email} connected successfully`);
//       }
      
//       setAccounts(updatedAccounts);
//       setSelectedAccount(account);
      
//       // Save to localStorage
//       localStorage.setItem('gsc_accounts', JSON.stringify(updatedAccounts));
//     } catch (error: any) {
//       showNotification('error', error.message || 'Failed to authenticate account');
//     } finally {
//       setIsAuthenticating(false);
//     }
//   };

//   const loadProperties = async (accountId: string) => {
//     setLoading(true);
//     try {
//       const props = await SearchConsoleAPI.getProperties(accountId);
//       setProperties(props);
//       if (props.length > 0 && !selectedProperty) {
//         setSelectedProperty(props[0]);
//       }
//     } catch (error: any) {
//       showNotification('error', error.message || 'Failed to load properties');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const loadQuotaUsage = (accountId: string) => {
//     const today = new Date().toDateString();
//     const quotaKey = `gsc_quota_${accountId}_${today}`;
//     const used = parseInt(localStorage.getItem(quotaKey) || '0', 10);
//     setQuotaUsage({ used, limit: 200 });
//   };

//   const updateQuotaUsage = (accountId: string, increment: number = 1) => {
//     const today = new Date().toDateString();
//     const quotaKey = `gsc_quota_${accountId}_${today}`;
//     const currentUsage = parseInt(localStorage.getItem(quotaKey) || '0', 10);
//     const newUsage = currentUsage + increment;
//     localStorage.setItem(quotaKey, newUsage.toString());
//     setQuotaUsage({ used: newUsage, limit: 200 });
//   };

//   const loadPerformanceData = async () => {
//     if (!selectedAccount || !selectedProperty) return;
    
//     setLoading(true);
//     try {
//       const data = await SearchConsoleAPI.getPerformance(
//         selectedAccount.id,
//         selectedProperty.siteUrl,
//         performanceDays
//       );
//       setPerformanceData(data);
//     } catch (error: any) {
//       showNotification('error', 'Failed to load performance data');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleRemoveAccount = (accountId: string) => {
//     const updatedAccounts = accounts.filter(acc => acc.id !== accountId);
//     setAccounts(updatedAccounts);
    
//     // Update localStorage
//     if (updatedAccounts.length === 0) {
//       localStorage.removeItem('gsc_accounts');
//     } else {
//       localStorage.setItem('gsc_accounts', JSON.stringify(updatedAccounts));
//     }
    
//     if (selectedAccount?.id === accountId) {
//       setSelectedAccount(updatedAccounts[0] || null);
//       setProperties([]);
//       setSelectedProperty(null);
//     }
    
//     showNotification('info', 'Account removed');
//   };

//   const handleAddAccount = async () => {
//     if (!configuration || !configuration.isConfigured) {
//       showNotification('warning', 'Please configure your Google OAuth credentials first');
//       setConfigModalOpen(true);
//       return;
//     }

//     if (isAuthenticating) {
//       showNotification('info', 'Authentication already in progress');
//       return;
//     }
    
//     try {
//       setIsAuthenticating(true);
      
//       // Close any existing auth window
//       if (authWindowRef.current && !authWindowRef.current.closed) {
//         authWindowRef.current.close();
//       }
      
//       // Remove existing message handler
//       if (messageHandlerRef.current) {
//         window.removeEventListener('message', messageHandlerRef.current);
//       }
      
//       const authUrl = await SearchConsoleAPI.getAuthUrl();
      
//       const width = 500;
//       const height = 600;
//       const left = window.screen.width / 2 - width / 2;
//       const top = window.screen.height / 2 - height / 2;
      
//       authWindowRef.current = window.open(
//         authUrl,
//         'google-auth',
//         `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
//       );
      
//       const handleMessage = async (event: MessageEvent) => {
//         if (event.origin !== window.location.origin) return;
        
//         if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
//           const { code } = event.data;
          
//           window.removeEventListener('message', handleMessage);
//           messageHandlerRef.current = null;
          
//           if (authWindowRef.current && !authWindowRef.current.closed) {
//             authWindowRef.current.close();
//           }
//           authWindowRef.current = null;
          
//           await handleOAuthCallback(code);
//           setIsAuthenticating(false);
//         } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
//           window.removeEventListener('message', handleMessage);
//           messageHandlerRef.current = null;
          
//           if (authWindowRef.current && !authWindowRef.current.closed) {
//             authWindowRef.current.close();
//           }
//           authWindowRef.current = null;
          
//           showNotification('error', event.data.error || 'Authentication failed');
//           setIsAuthenticating(false);
//         }
//       };
      
//       messageHandlerRef.current = handleMessage;
//       window.addEventListener('message', handleMessage);
      
//       // Check if window was closed
//       const checkWindow = setInterval(() => {
//         if (authWindowRef.current && authWindowRef.current.closed) {
//           clearInterval(checkWindow);
//           if (messageHandlerRef.current) {
//             window.removeEventListener('message', messageHandlerRef.current);
//             messageHandlerRef.current = null;
//           }
//           setIsAuthenticating(false);
//         }
//       }, 1000);
      
//     } catch (error: any) {
//       showNotification('error', error.message || 'Failed to initiate authentication');
//       setIsAuthenticating(false);
//     }
//   };

//   const handleIndexUrl = async () => {
//     if (!urlToIndex || !selectedAccount || !selectedProperty) return;
    
//     if (quotaUsage.used >= quotaUsage.limit) {
//       showNotification('error', 'Daily quota exceeded (200 URLs/day)');
//       return;
//     }
    
//     const request: IndexingRequest = {
//       url: urlToIndex,
//       type: indexType,
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
      
//       updateQuotaUsage(selectedAccount.id, 1);
//       showNotification('success', `URL submitted for ${indexType === 'URL_UPDATED' ? 'indexing' : 'removal'}`);
//       setUrlToIndex('');
//     } catch (error: any) {
//       setIndexingQueue(queue => 
//         queue.map(item => 
//           item.url === urlToIndex 
//             ? { ...item, status: 'error', message: error.message }
//             : item
//         )
//       );
//       showNotification('error', 'Failed to submit URL');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleBulkIndex = async () => {
//     if (!bulkUrls || !selectedAccount || !selectedProperty) return;
    
//     const urls = bulkUrls.split('\n').filter(url => url.trim());
//     if (urls.length === 0) {
//       showNotification('error', 'No valid URLs found');
//       return;
//     }
    
//     if (quotaUsage.used + urls.length > quotaUsage.limit) {
//       showNotification('error', `Cannot submit ${urls.length} URLs. ${quotaUsage.limit - quotaUsage.used} remaining today.`);
//       return;
//     }
    
//     setLoading(true);
//     let successCount = 0;
    
//     for (const url of urls) {
//       const request: IndexingRequest = {
//         url: url.trim(),
//         type: 'URL_UPDATED',
//         status: 'pending'
//       };
      
//       setIndexingQueue(prev => [...prev, request]);
      
//       try {
//         await SearchConsoleAPI.requestIndexing(selectedAccount.id, request);
//         successCount++;
//         setIndexingQueue(queue => 
//           queue.map(item => 
//             item.url === url.trim() 
//               ? { ...item, status: 'success', notifyTime: new Date().toISOString() }
//               : item
//           )
//         );
//       } catch (error) {
//         setIndexingQueue(queue => 
//           queue.map(item => 
//             item.url === url.trim() 
//               ? { ...item, status: 'error' }
//               : item
//           )
//         );
//       }
//     }
    
//     updateQuotaUsage(selectedAccount.id, successCount);
//     showNotification('success', `${successCount}/${urls.length} URLs submitted`);
//     setBulkUrls('');
//     setLoading(false);
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
//       showNotification('success', 'URL inspection complete');
//     } catch (error: any) {
//       showNotification('error', 'Failed to inspect URL');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSubmitSitemap = async () => {
//     if (!sitemapUrl || !selectedAccount || !selectedProperty) return;
    
//     setLoading(true);
//     try {
//       const result = await SearchConsoleAPI.submitSitemap(
//         selectedAccount.id,
//         selectedProperty.siteUrl,
//         sitemapUrl
//       );
//       setSitemapList([...sitemapList, result]);
//       showNotification('success', 'Sitemap submitted successfully');
//       setSitemapUrl('');
//     } catch (error: any) {
//       showNotification('error', 'Failed to submit sitemap');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Configuration Modal */}
//       <ConfigurationModal
//         isOpen={configModalOpen}
//         onClose={() => setConfigModalOpen(false)}
//         onSave={(config) => {
//           setConfiguration(config);
//           showNotification('success', 'Configuration saved successfully');
//         }}
//         initialConfig={configuration}
//       />

//       {/* Header */}
//       <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex items-center justify-between h-16">
//             <div className="flex items-center">
//               <Globe className="w-8 h-8 text-blue-600 mr-3" />
//               <h1 className="text-xl font-semibold text-gray-900">
//                 Search Console Manager
//               </h1>
//             </div>
            
//             <div className="flex items-center space-x-3">
//               {/* Configuration Status */}
//               <button
//                 onClick={() => setConfigModalOpen(true)}
//                 className={`px-3 py-1.5 rounded-lg flex items-center space-x-2 text-sm transition-colors ${
//                   configuration?.isConfigured
//                     ? 'bg-green-100 text-green-700 hover:bg-green-200'
//                     : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
//                 }`}
//               >
//                 <Settings className="w-4 h-4" />
//                 <span className="hidden sm:inline">
//                   {configuration?.isConfigured ? 'Configured' : 'Setup'}
//                 </span>
//               </button>

//               {/* Quota Display */}
//               {selectedAccount && (
//                 <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-lg">
//                   <Activity className="w-4 h-4 text-gray-500" />
//                   <span className="text-sm text-gray-700">
//                     {quotaUsage.used}/{quotaUsage.limit}
//                   </span>
//                 </div>
//               )}
              
//               {/* Account Selector */}
//               {configuration?.isConfigured && (
//                 <div className="relative">
//                   <button
//                     className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
//                     onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
//                   >
//                     <User className="w-4 h-4" />
//                     <span className="text-sm hidden sm:inline">
//                       {selectedAccount?.email || 'Select Account'}
//                     </span>
//                     <ChevronDown className="w-4 h-4" />
//                   </button>
                  
//                   {accountDropdownOpen && (
//                     <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200">
//                       {accounts.map(account => (
//                         <div
//                           key={account.id}
//                           className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
//                         >
//                           <button
//                             className="flex-1 flex items-center space-x-3 text-left"
//                             onClick={() => {
//                               setSelectedAccount(account);
//                               setAccountDropdownOpen(false);
//                             }}
//                           >
//                             {account.picture ? (
//                               <img src={account.picture} alt={account.name} className="w-8 h-8 rounded-full" />
//                             ) : (
//                               <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
//                                 {account.name?.[0] || account.email[0].toUpperCase()}
//                               </div>
//                             )}
//                             <div>
//                               <p className="text-sm font-medium">{account.name}</p>
//                               <p className="text-xs text-gray-500">{account.email}</p>
//                             </div>
//                           </button>
//                           <div className="flex items-center space-x-1">
//                             {selectedAccount?.id === account.id && (
//                               <CheckCircle className="w-4 h-4 text-green-500" />
//                             )}
//                             <button
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 if (confirm(`Remove account ${account.email}?`)) {
//                                   handleRemoveAccount(account.id);
//                                 }
//                               }}
//                               className="p-1 hover:bg-red-50 rounded"
//                               title="Remove account"
//                             >
//                               <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
//                             </button>
//                           </div>
//                         </div>
//                       ))}
                      
//                       {accounts.length === 0 && (
//                         <div className="px-4 py-6 text-center text-sm text-gray-500">
//                           No accounts connected
//                         </div>
//                       )}
                      
//                       <div className="border-t border-gray-200">
//                         <button
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             handleAddAccount();
//                             setAccountDropdownOpen(false);
//                           }}
//                           disabled={isAuthenticating}
//                           className="w-full px-4 py-3 text-blue-600 hover:bg-blue-50 flex items-center space-x-2 text-sm"
//                         >
//                           {isAuthenticating ? (
//                             <Loader2 className="w-4 h-4 animate-spin" />
//                           ) : (
//                             <Plus className="w-4 h-4" />
//                           )}
//                           <span>Add Account</span>
//                         </button>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Property Selector */}
//       {selectedAccount && properties.length > 0 && (
//         <div className="bg-white border-b border-gray-200">
//           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//             <div className="flex items-center space-x-4 py-3 overflow-x-auto">
//               {properties.map(property => (
//                 <button
//                   key={property.siteUrl}
//                   onClick={() => setSelectedProperty(property)}
//                   className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
//                     selectedProperty?.siteUrl === property.siteUrl
//                       ? 'bg-blue-100 text-blue-700 font-medium'
//                       : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
//                   }`}
//                 >
//                   <Globe className="w-4 h-4 inline mr-2" />
//                   {property.siteUrl}
//                 </button>
//               ))}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Notification */}
//       {notification && (
//         <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top duration-300">
//           <div className={`flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg ${
//             notification.type === 'success' ? 'bg-green-500 text-white' :
//             notification.type === 'error' ? 'bg-red-500 text-white' :
//             notification.type === 'warning' ? 'bg-yellow-500 text-white' :
//             'bg-blue-500 text-white'
//           }`}>
//             {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
//             {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
//             {notification.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
//             {notification.type === 'info' && <Info className="w-5 h-5" />}
//             <span>{notification.message}</span>
//             <button onClick={() => setNotification(null)} className="ml-2">
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
//                   <Map className="w-4 h-4 inline mr-2" />
//                   Sitemaps
//                 </button>
//                 <button
//                   onClick={() => setActiveTab('performance')}
//                   className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
//                     activeTab === 'performance'
//                       ? 'border-blue-500 text-blue-600'
//                       : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
//                   }`}
//                 >
//                   <BarChart className="w-4 h-4 inline mr-2" />
//                   Performance
//                 </button>
//               </nav>
//             </div>

//             <div className="p-6">
//               {/* URL Indexing Tab */}
//               {activeTab === 'index' && (
//                 <div className="space-y-6">
//                   {/* Single URL */}
//                   <div>
//                     <h3 className="text-lg font-medium text-gray-900 mb-4">Request Indexing</h3>
//                     <div className="bg-gray-50 rounded-lg p-4">
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Single URL
//                       </label>
//                       <div className="flex space-x-2">
//                         <input
//                           type="url"
//                           value={urlToIndex}
//                           onChange={(e) => setUrlToIndex(e.target.value)}
//                           placeholder="https://example.com/page"
//                           className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                         />
//                         <select
//                           value={indexType}
//                           onChange={(e) => setIndexType(e.target.value as 'URL_UPDATED' | 'URL_DELETED')}
//                           className="px-3 py-2 border border-gray-300 rounded-lg"
//                         >
//                           <option value="URL_UPDATED">Update</option>
//                           <option value="URL_DELETED">Delete</option>
//                         </select>
//                         <button
//                           onClick={handleIndexUrl}
//                           disabled={loading || !urlToIndex}
//                           className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
//                         >
//                           {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
//                         </button>
//                       </div>
//                     </div>
//                   </div>

//                   {/* Bulk URLs */}
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                       Bulk URLs (one per line)
//                     </label>
//                     <div className="bg-gray-50 rounded-lg p-4">
//                       <textarea
//                         value={bulkUrls}
//                         onChange={(e) => setBulkUrls(e.target.value)}
//                         placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
//                         rows={5}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                       />
//                       <button
//                         onClick={handleBulkIndex}
//                         disabled={loading || !bulkUrls}
//                         className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
//                       >
//                         Submit All
//                       </button>
//                     </div>
//                   </div>

//                   {/* Queue */}
//                   {indexingQueue.length > 0 && (
//                     <div>
//                       <h3 className="text-lg font-medium text-gray-900 mb-4">Indexing Queue</h3>
//                       <div className="space-y-2">
//                         {indexingQueue.slice(-5).reverse().map((item, index) => (
//                           <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
//                             <span className="text-sm text-gray-700 truncate flex-1">{item.url}</span>
//                             <div className="flex items-center space-x-2">
//                               {item.status === 'pending' && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
//                               {item.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
//                               {item.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
//                               <span className={`text-xs ${
//                                 item.status === 'success' ? 'text-green-600' :
//                                 item.status === 'error' ? 'text-red-600' :
//                                 'text-gray-500'
//                               }`}>
//                                 {item.status === 'pending' ? 'Processing...' :
//                                  item.status === 'success' ? 'Indexed' :
//                                  'Failed'}
//                               </span>
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               )}

//               {/* URL Inspection Tab */}
//               {activeTab === 'inspect' && (
//                 <div className="space-y-6">
//                   <div>
//                     <h3 className="text-lg font-medium text-gray-900 mb-4">Inspect URL</h3>
//                     <div className="bg-gray-50 rounded-lg p-4">
//                       <div className="flex space-x-2">
//                         <input
//                           type="url"
//                           value={urlToInspect}
//                           onChange={(e) => setUrlToInspect(e.target.value)}
//                           placeholder="https://example.com/page-to-inspect"
//                           className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                         />
//                         <button
//                           onClick={handleInspectUrl}
//                           disabled={loading || !urlToInspect}
//                           className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
//                         >
//                           {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Inspect'}
//                         </button>
//                       </div>
//                     </div>
//                   </div>

//                   {inspectionResult && (
//                     <div className="bg-white border border-gray-200 rounded-lg p-6">
//                       <h4 className="text-lg font-medium text-gray-900 mb-4">Inspection Results</h4>
//                       <div className="space-y-4">
//                         <div className="grid grid-cols-2 gap-4">
//                           <div>
//                             <p className="text-sm text-gray-500">Index Status</p>
//                             <p className="font-medium">{inspectionResult.inspectionResult?.indexStatusResult?.coverageState}</p>
//                           </div>
//                           <div>
//                             <p className="text-sm text-gray-500">Last Crawl</p>
//                             <p className="font-medium">
//                               {inspectionResult.inspectionResult?.indexStatusResult?.lastCrawlTime 
//                                 ? new Date(inspectionResult.inspectionResult.indexStatusResult.lastCrawlTime).toLocaleDateString()
//                                 : 'N/A'}
//                             </p>
//                           </div>
//                           <div>
//                             <p className="text-sm text-gray-500">Mobile Usability</p>
//                             <p className="font-medium">{inspectionResult.inspectionResult?.mobileUsabilityResult?.verdict}</p>
//                           </div>
//                           <div>
//                             <p className="text-sm text-gray-500">Rich Results</p>
//                             <p className="font-medium">
//                               {inspectionResult.inspectionResult?.richResultsResult?.detectedItems?.length || 0} detected
//                             </p>
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               )}

//               {/* Sitemaps Tab */}
//               {activeTab === 'sitemap' && (
//                 <div className="space-y-6">
//                   <div>
//                     <h3 className="text-lg font-medium text-gray-900 mb-4">Submit Sitemap</h3>
//                     <div className="bg-gray-50 rounded-lg p-4">
//                       <div className="flex space-x-2">
//                         <input
//                           type="url"
//                           value={sitemapUrl}
//                           onChange={(e) => setSitemapUrl(e.target.value)}
//                           placeholder="https://example.com/sitemap.xml"
//                           className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                         />
//                         <button
//                           onClick={handleSubmitSitemap}
//                           disabled={loading || !sitemapUrl}
//                           className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
//                         >
//                           {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
//                         </button>
//                       </div>
//                     </div>
//                   </div>

//                   {sitemapList.length > 0 && (
//                     <div>
//                       <h3 className="text-lg font-medium text-gray-900 mb-4">Submitted Sitemaps</h3>
//                       <div className="space-y-2">
//                         {sitemapList.map((sitemap, index) => (
//                           <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
//                             <div>
//                               <p className="font-medium text-gray-900">{sitemap.path}</p>
//                               <p className="text-sm text-gray-500">
//                                 {sitemap.contents?.[0]?.indexed || 0} / {sitemap.contents?.[0]?.submitted || 0} indexed
//                               </p>
//                             </div>
//                             <CheckCircle className="w-5 h-5 text-green-500" />
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               )}

//               {/* Performance Tab */}
//               {activeTab === 'performance' && (
//                 <div className="space-y-6">
//                   <div className="flex items-center justify-between">
//                     <h3 className="text-lg font-medium text-gray-900">Performance Metrics</h3>
//                     <select
//                       value={performanceDays}
//                       onChange={(e) => setPerformanceDays(Number(e.target.value))}
//                       className="px-3 py-2 border border-gray-300 rounded-lg"
//                     >
//                       <option value={7}>Last 7 days</option>
//                       <option value={28}>Last 28 days</option>
//                       <option value={90}>Last 90 days</option>
//                     </select>
//                   </div>

//                   {performanceData.length > 0 && (
//                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//                       <div className="bg-blue-50 rounded-lg p-4">
//                         <p className="text-sm text-blue-600 font-medium">Total Clicks</p>
//                         <p className="text-2xl font-bold text-blue-900">
//                           {performanceData.reduce((sum, d) => sum + d.clicks, 0).toLocaleString()}
//                         </p>
//                       </div>
//                       <div className="bg-green-50 rounded-lg p-4">
//                         <p className="text-sm text-green-600 font-medium">Total Impressions</p>
//                         <p className="text-2xl font-bold text-green-900">
//                           {performanceData.reduce((sum, d) => sum + d.impressions, 0).toLocaleString()}
//                         </p>
//                       </div>
//                       <div className="bg-purple-50 rounded-lg p-4">
//                         <p className="text-sm text-purple-600 font-medium">Average CTR</p>
//                         <p className="text-2xl font-bold text-purple-900">
//                           {(performanceData.reduce((sum, d) => sum + d.ctr, 0) / performanceData.length * 100).toFixed(2)}%
//                         </p>
//                       </div>
//                       <div className="bg-orange-50 rounded-lg p-4">
//                         <p className="text-sm text-orange-600 font-medium">Average Position</p>
//                         <p className="text-2xl font-bold text-orange-900">
//                           {(performanceData.reduce((sum, d) => sum + d.position, 0) / performanceData.length).toFixed(1)}
//                         </p>
//                       </div>
//                     </div>
//                   )}

//                   <div className="bg-white border border-gray-200 rounded-lg p-4">
//                     <div className="h-64 flex items-center justify-center text-gray-400">
//                       <BarChart className="w-8 h-8 mr-2" />
//                       <span>Performance chart visualization would appear here</span>
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       ) : (
//         /* Empty State */
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
//           <div className="text-center">
//             <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
//             <h2 className="text-2xl font-semibold text-gray-900 mb-2">
//               {!configuration?.isConfigured 
//                 ? 'Configure OAuth to Get Started'
//                 : 'Connect Your Google Account'}
//             </h2>
//             <p className="text-gray-600 mb-8 max-w-md mx-auto">
//               {!configuration?.isConfigured 
//                 ? 'Set up your Google OAuth credentials to start managing your search presence.'
//                 : 'Connect your Google account to access Search Console features.'}
//             </p>
//             <button
//               onClick={!configuration?.isConfigured ? () => setConfigModalOpen(true) : handleAddAccount}
//               disabled={isAuthenticating}
//               className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2 disabled:opacity-50"
//             >
//               {!configuration?.isConfigured ? (
//                 <>
//                   <Settings className="w-5 h-5" />
//                   <span>Configure OAuth</span>
//                 </>
//               ) : isAuthenticating ? (
//                 <>
//                   <Loader2 className="w-5 h-5 animate-spin" />
//                   <span>Connecting...</span>
//                 </>
//               ) : (
//                 <>
//                   <Plus className="w-5 h-5" />
//                   <span>Add Google Account</span>
//                 </>
//               )}
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }





















// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false }
// });

// // GSC Scopes - Define only once at the top
// const GSC_SCOPES = [
//   'https://www.googleapis.com/auth/webmasters',
//   'https://www.googleapis.com/auth/indexing',
//   'https://www.googleapis.com/auth/siteverification',
//   'https://www.googleapis.com/auth/userinfo.email',
//   'https://www.googleapis.com/auth/userinfo.profile'
// ];

// // Store user GSC tokens (temporary in-memory cache)
// const gscUserTokens = new Map<string, any>();

// // Storage functions for GSC configurations
// const gscConfigStorage = {
//   async saveConfiguration(userId: string, config: {
//     clientId: string;
//     clientSecret: string;
//     redirectUri: string;
//   }) {
//     const query = `
//       INSERT INTO gsc_configurations (user_id, client_id, client_secret, redirect_uri)
//       VALUES ($1, $2, $3, $4)
//       ON CONFLICT (user_id) DO UPDATE SET
//         client_id = EXCLUDED.client_id,
//         client_secret = EXCLUDED.client_secret,
//         redirect_uri = EXCLUDED.redirect_uri,
//         updated_at = NOW()
//       RETURNING id, client_id, redirect_uri, is_configured, created_at
//     `;
    
//     const result = await pool.query(query, [
//       userId,
//       config.clientId,
//       config.clientSecret,  // Plain text
//       config.redirectUri
//     ]);
    
//     return {
//       id: result.rows[0].id,
//       clientId: result.rows[0].client_id,
//       redirectUri: result.rows[0].redirect_uri,
//       isConfigured: result.rows[0].is_configured
//     };
//   },

//   async getConfiguration(userId: string) {
//     const query = 'SELECT * FROM gsc_configurations WHERE user_id = $1 AND is_configured = true';
//     const result = await pool.query(query, [userId]);
    
//     if (result.rows.length === 0) return null;
    
//     const row = result.rows[0];
//     return {
//       id: row.id,
//       clientId: row.client_id,
//       clientSecret: row.client_secret,  // Plain text
//       redirectUri: row.redirect_uri,
//       isConfigured: row.is_configured
//     };
//   },

//   async deleteConfiguration(userId: string) {
//     const query = 'UPDATE gsc_configurations SET is_configured = false WHERE user_id = $1';
//     await pool.query(query, [userId]);
//     return { success: true };
//   },

//   async hasConfiguration(userId: string): Promise<boolean> {
//     const query = 'SELECT id FROM gsc_configurations WHERE user_id = $1 AND is_configured = true LIMIT 1';
//     const result = await pool.query(query, [userId]);
//     return result.rows.length > 0;
//   }
// };

// // Create OAuth2 client with user config or env vars as fallback
// const createGscOAuth2Client = async (userId?: string) => {
//   // If userId is provided, try to use user-specific configuration
//   if (userId) {
//     const config = await gscConfigStorage.getConfiguration(userId);
    
//     if (config) {
//       // User has configured their own credentials
//       return new google.auth.OAuth2(
//         config.clientId,
//         config.clientSecret,
//         config.redirectUri
//       );
//     }
    
//     // No user configuration found, fall back to environment variables
//     if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
//       return new google.auth.OAuth2(
//         process.env.GOOGLE_CLIENT_ID,
//         process.env.GOOGLE_CLIENT_SECRET,
//         process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/gsc/oauth-callback'
//       );
//     }
    
//     throw new Error('OAuth configuration not found. Please configure your Google OAuth credentials.');
//   }
  
//   // No userId provided, use environment variables (backward compatibility)
//   if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
//     return new google.auth.OAuth2(
//       process.env.GOOGLE_CLIENT_ID,
//       process.env.GOOGLE_CLIENT_SECRET,
//       process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/gsc/oauth-callback'
//     );
//   }
  
//   throw new Error('OAuth configuration not found. Please set up Google OAuth credentials.');
// };

// // Helper function to get authenticated client with proper token handling
// async function getAuthenticatedClient(userId: string, accountId: string): Promise<any> {
//   // Get tokens from memory or database
//   let tokens = gscUserTokens.get(`${userId}_${accountId}`);
  
//   if (!tokens) {
//     const savedAccount = await gscStorage.getGscAccount(userId, accountId);
//     if (!savedAccount) {
//       throw new Error('Account not found or not authenticated');
//     }
    
//     tokens = {
//       access_token: savedAccount.accessToken,
//       refresh_token: savedAccount.refreshToken,
//       expiry_date: savedAccount.tokenExpiry
//     };
    
//     // Cache in memory
//     gscUserTokens.set(`${userId}_${accountId}`, tokens);
//   }
  
//   // Create OAuth2 client with user's credentials or env vars as fallback
//   // THIS IS THE FIX - Pass userId to createGscOAuth2Client
//   const authClient = await createGscOAuth2Client(userId);
//   authClient.setCredentials(tokens);
  
//   // Check if token needs refresh (expires in less than 5 minutes)
//   if (tokens.expiry_date && tokens.expiry_date - Date.now() < 300000) {
//     try {
//       const { credentials } = await authClient.refreshAccessToken();
      
//       // Update tokens
//       tokens = credentials;
//       gscUserTokens.set(`${userId}_${accountId}`, credentials);
      
//       // Update in database
//       await gscStorage.updateGscAccount(userId, accountId, {
//         accessToken: credentials.access_token!,
//         tokenExpiry: credentials.expiry_date!
//       });
      
//       console.log(`✅ Token auto-refreshed for account: ${accountId}`);
//     } catch (refreshError: any) {
//       console.error('Token auto-refresh failed:', refreshError);
//       // Continue with existing token - it might still work
//     }
//   }
  
//   return authClient;
// }

// // ===================== API ROUTES =====================

// // Save configuration endpoint
// app.post("/api/gsc/configuration", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.user!.id;
//     const { clientId, clientSecret, redirectUri } = req.body;
    
//     console.log(`📝 Saving GSC configuration for user: ${userId}`);
    
//     if (!clientId || !clientSecret || !redirectUri) {
//       res.status(400).json({ error: 'Client ID, Client Secret, and Redirect URI are required' });
//       return;
//     }
    
//     // Validate the redirect URI format
//     try {
//       new URL(redirectUri);
//     } catch {
//       res.status(400).json({ error: 'Invalid redirect URI format' });
//       return;
//     }
    
//     const config = await gscConfigStorage.saveConfiguration(userId, {
//       clientId,
//       clientSecret,
//       redirectUri
//     });
    
//     // Log activity
//     await storage.createActivityLog({
//       userId,
//       type: "gsc_configuration_saved",
//       description: "Google OAuth configuration saved",
//       metadata: { clientId }
//     });
    
//     console.log(`✅ GSC configuration saved for user: ${userId}`);
//     res.json(config);
    
//   } catch (error: any) {
//     console.error('Configuration save error:', error);
//     res.status(500).json({ error: 'Failed to save configuration' });
//   }
// });

// // Get configuration (without exposing secret)
// app.get("/api/gsc/configuration", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.user!.id;
//     const config = await gscConfigStorage.getConfiguration(userId);
    
//     if (!config) {
//       // Check if env vars are available as fallback
//       const hasEnvConfig = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
//       res.json({ 
//         isConfigured: hasEnvConfig,
//         usingEnvVars: hasEnvConfig 
//       });
//       return;
//     }
    
//     // Don't send the actual secret to the frontend
//     res.json({
//       id: config.id,
//       clientId: config.clientId,
//       redirectUri: config.redirectUri,
//       isConfigured: true,
//       usingEnvVars: false
//     });
    
//   } catch (error: any) {
//     console.error('Configuration fetch error:', error);
//     res.status(500).json({ error: 'Failed to fetch configuration' });
//   }
// });

// // Test configuration
// app.post("/api/gsc/configuration/test", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { clientId, clientSecret, redirectUri } = req.body;
    
//     if (!clientId || !clientSecret || !redirectUri) {
//       res.json({ valid: false, error: 'Missing required fields' });
//       return;
//     }
    
//     // Try to create an OAuth2 client to test the credentials
//     try {
//       const testClient = new google.auth.OAuth2(
//         clientId,
//         clientSecret,
//         redirectUri
//       );
      
//       // Generate auth URL to verify credentials are formatted correctly
//       const authUrl = testClient.generateAuthUrl({
//         access_type: 'offline',
//         scope: GSC_SCOPES,
//         prompt: 'consent'
//       });
      
//       res.json({ valid: !!authUrl });
//     } catch (testError: any) {
//       res.json({ valid: false, error: 'Invalid credentials format' });
//     }
    
//   } catch (error: any) {
//     console.error('Configuration test error:', error);
//     res.status(500).json({ valid: false, error: 'Test failed' });
//   }
// });

// // Delete configuration
// app.delete("/api/gsc/configuration", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.user!.id;
//     await gscConfigStorage.deleteConfiguration(userId);
    
//     // Clear any cached tokens for this user
//     const keysToDelete: string[] = [];
//     gscUserTokens.forEach((value, key) => {
//       if (key.startsWith(`${userId}_`)) {
//         keysToDelete.push(key);
//       }
//     });
//     keysToDelete.forEach(key => gscUserTokens.delete(key));
    
//     console.log(`🗑️ GSC configuration deleted for user: ${userId}`);
//     res.json({ success: true });
    
//   } catch (error: any) {
//     console.error('Configuration delete error:', error);
//     res.status(500).json({ error: 'Failed to delete configuration' });
//   }
// });

// // Get OAuth URL with user-specific credentials
// app.get("/api/gsc/auth-url", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.user!.id;
//     console.log(`🔐 Generating GSC OAuth URL for user: ${userId}`);
    
//     // Create OAuth2 client with user's credentials or env vars as fallback
//     const authClient = await createGscOAuth2Client(userId);
    
//     const authUrl = authClient.generateAuthUrl({
//       access_type: 'offline',
//       scope: GSC_SCOPES,
//       prompt: 'consent',
//       state: userId
//     });
    
//     res.json({ authUrl });
//   } catch (error: any) {
//     console.error('GSC auth URL error:', error);
    
//     if (error.message?.includes('configuration not found')) {
//       res.status(400).json({ 
//         error: 'OAuth configuration not found. Please configure your credentials first.',
//         requiresConfig: true 
//       });
//     } else {
//       res.status(500).json({ error: 'Failed to generate auth URL' });
//     }
//   }
// });

// // Exchange code for tokens with user-specific credentials
// app.post("/api/gsc/auth", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.user!.id;
//     const { code } = req.body;
    
//     console.log(`🔐 Exchanging GSC auth code for user: ${userId}`);
    
//     if (!code) {
//       res.status(400).json({ error: 'Authorization code required' });
//       return;
//     }
    
//     // Create OAuth2 client with user's credentials or env vars as fallback
//     const authClient = await createGscOAuth2Client(userId);
    
//     try {
//       // Exchange code for tokens
//       const { tokens } = await authClient.getToken(code);
      
//       if (!tokens.access_token) {
//         console.error('No access token received');
//         res.status(400).json({ error: 'Failed to obtain access token' });
//         return;
//       }
      
//       // Set credentials for this client instance
//       authClient.setCredentials(tokens);
      
//       // Get user info
//       const oauth2 = google.oauth2({ version: 'v2', auth: authClient });
//       const { data: userInfo } = await oauth2.userinfo.get();
      
//       // Store tokens
//       const gscAccount = {
//         id: userInfo.id!,
//         email: userInfo.email!,
//         name: userInfo.name || userInfo.email!,
//         picture: userInfo.picture,
//         accessToken: tokens.access_token!,
//         refreshToken: tokens.refresh_token || '',
//         tokenExpiry: tokens.expiry_date || Date.now() + 3600000,
//         isActive: true
//       };
      
//       // Store in memory cache
//       gscUserTokens.set(`${userId}_${userInfo.id}`, tokens);
      
//       // Save to database
//       await gscStorage.saveGscAccount(userId, gscAccount);
      
//       // Log activity
//       await storage.createActivityLog({
//         userId,
//         type: "gsc_account_connected",
//         description: `Connected Google Search Console account: ${userInfo.email}`,
//         metadata: { 
//           gscAccountId: userInfo.id,
//           email: userInfo.email
//         }
//       });
      
//       console.log(`✅ GSC account connected: ${userInfo.email}`);
//       res.json({ account: gscAccount });
      
//     } catch (tokenError: any) {
//       if (tokenError.message?.includes('invalid_grant')) {
//         res.status(400).json({ 
//           error: 'Authorization code expired or already used. Please try signing in again.' 
//         });
//       } else if (tokenError.message?.includes('redirect_uri_mismatch')) {
//         res.status(400).json({ 
//           error: 'Redirect URI mismatch. Please check your configuration.' 
//         });
//       } else {
//         throw tokenError;
//       }
//     }
    
//   } catch (error: any) {
//     console.error('GSC auth error:', error);
    
//     if (error.message?.includes('configuration not found')) {
//       res.status(400).json({ 
//         error: 'OAuth configuration not found. Please configure your credentials first.',
//         requiresConfig: true 
//       });
//     } else {
//       res.status(500).json({ 
//         error: 'Authentication failed',
//         details: process.env.NODE_ENV === 'development' ? error.message : undefined
//       });
//     }
//   }
// });

// // Get user's GSC properties
// app.get("/api/gsc/properties", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.user!.id;
//     const { accountId } = req.query;
    
//     console.log(`🌐 Fetching GSC properties for user: ${userId}, account: ${accountId}`);
    
//     if (!accountId) {
//       res.status(400).json({ error: 'Account ID required' });
//       return;
//     }
    
//     // Get authenticated client with user's credentials
//     const authClient = await getAuthenticatedClient(userId, accountId as string);
    
//     // Get properties from Search Console
//     const searchconsole = google.searchconsole({ version: 'v1', auth: authClient });
//     const { data } = await searchconsole.sites.list();
    
//     // Transform properties
//     const properties = (data.siteEntry || []).map(site => ({
//       siteUrl: site.siteUrl!,
//       permissionLevel: site.permissionLevel!,
//       siteType: site.siteUrl?.startsWith('sc-domain:') ? 'DOMAIN' : 'SITE',
//       verified: true,
//       accountId: accountId as string
//     }));
    
//     console.log(`✅ Found ${properties.length} GSC properties`);
//     res.json(properties);
    
//   } catch (error: any) {
//     console.error('Error fetching GSC properties:', error);
    
//     if (error.message?.includes('auth') || error.code === 401) {
//       res.status(401).json({ error: 'Authentication expired. Please reconnect your account.' });
//     } else if (error.message?.includes('configuration not found')) {
//       res.status(400).json({ 
//         error: 'OAuth configuration not found. Please configure your credentials first.',
//         requiresConfig: true 
//       });
//     } else {
//       res.status(500).json({ error: 'Failed to fetch properties' });
//     }
//   }
// });

// // Submit URL for indexing
// app.post("/api/gsc/index", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.user!.id;
//     const { accountId, url, type = 'URL_UPDATED' } = req.body;
    
//     console.log(`📤 Submitting URL for indexing: ${url} (${type})`);
    
//     if (!accountId || !url) {
//       res.status(400).json({ error: 'Account ID and URL required' });
//       return;
//     }
    
//     // Get authenticated client with user's credentials
//     const authClient = await getAuthenticatedClient(userId, accountId);
    
//     // Use Indexing API
//     const indexing = google.indexing({ version: 'v3', auth: authClient });
    
//     try {
//       const result = await indexing.urlNotifications.publish({
//         requestBody: {
//           url: url,
//           type: type
//         }
//       });
      
//       // Log activity
//       await storage.createActivityLog({
//         userId,
//         type: "gsc_url_indexed",
//         description: `URL submitted for indexing: ${url}`,
//         metadata: { 
//           url,
//           type,
//           notifyTime: result.data.urlNotificationMetadata?.latestUpdate?.notifyTime
//         }
//       });
      
//       console.log(`✅ URL submitted for indexing: ${url}`);
//       res.json({
//         success: true,
//         notifyTime: result.data.urlNotificationMetadata?.latestUpdate?.notifyTime,
//         url: url
//       });
      
//     } catch (indexError: any) {
//       if (indexError.code === 429) {
//         res.status(429).json({ error: 'Daily quota exceeded (200 URLs/day)' });
//       } else {
//         throw indexError;
//       }
//     }
    
//   } catch (error: any) {
//     console.error('Indexing error:', error);
    
//     if (error.message?.includes('auth') || error.code === 401) {
//       res.status(401).json({ error: 'Authentication expired. Please reconnect your account.' });
//     } else if (error.message?.includes('configuration not found')) {
//       res.status(400).json({ 
//         error: 'OAuth configuration not found. Please configure your credentials first.',
//         requiresConfig: true 
//       });
//     } else {
//       res.status(500).json({ error: 'Failed to submit URL for indexing' });
//     }
//   }
// });

// // URL Inspection endpoint
// app.post("/api/gsc/inspect", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.user!.id;
//     const { accountId, siteUrl, inspectionUrl } = req.body;
    
//     console.log(`🔍 Inspecting URL: ${inspectionUrl}`);
    
//     if (!accountId || !siteUrl || !inspectionUrl) {
//       res.status(400).json({ error: 'Account ID, site URL, and inspection URL required' });
//       return;
//     }
    
//     // Get authenticated client with user's credentials
//     const authClient = await getAuthenticatedClient(userId, accountId);
    
//     // Use Search Console API
//     const searchconsole = google.searchconsole({ version: 'v1', auth: authClient });
    
//     const result = await searchconsole.urlInspection.index.inspect({
//       requestBody: {
//         siteUrl: siteUrl,
//         inspectionUrl: inspectionUrl
//       }
//     });
    
//     console.log(`✅ URL inspection complete: ${inspectionUrl}`);
//     res.json(result.data);
    
//   } catch (error: any) {
//     console.error('URL inspection error:', error);
    
//     if (error.message?.includes('auth') || error.code === 401) {
//       res.status(401).json({ error: 'Authentication expired. Please reconnect your account.' });
//     } else {
//       res.status(500).json({ error: 'Failed to inspect URL' });
//     }
//   }
// });

// // Submit Sitemap endpoint
// app.post("/api/gsc/sitemap", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.user!.id;
//     const { accountId, siteUrl, sitemapUrl } = req.body;
    
//     console.log(`📍 Submitting sitemap: ${sitemapUrl}`);
    
//     if (!accountId || !siteUrl || !sitemapUrl) {
//       res.status(400).json({ error: 'Account ID, site URL, and sitemap URL required' });
//       return;
//     }
    
//     // Get authenticated client with user's credentials
//     const authClient = await getAuthenticatedClient(userId, accountId);
    
//     // Use Search Console API
//     const searchconsole = google.searchconsole({ version: 'v1', auth: authClient });
    
//     await searchconsole.sitemaps.submit({
//       siteUrl: siteUrl,
//       feedpath: sitemapUrl
//     });
    
//     // Get sitemap details
//     const result = await searchconsole.sitemaps.get({
//       siteUrl: siteUrl,
//       feedpath: sitemapUrl
//     });
    
//     console.log(`✅ Sitemap submitted: ${sitemapUrl}`);
//     res.json(result.data);
    
//   } catch (error: any) {
//     console.error('Sitemap submission error:', error);
    
//     if (error.message?.includes('auth') || error.code === 401) {
//       res.status(401).json({ error: 'Authentication expired. Please reconnect your account.' });
//     } else {
//       res.status(500).json({ error: 'Failed to submit sitemap' });
//     }
//   }
// });

// // Get Performance data endpoint
// app.get("/api/gsc/performance", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.user!.id;
//     const { accountId, siteUrl, days = '28' } = req.query;
    
//     console.log(`📊 Fetching performance data for ${siteUrl}`);
    
//     if (!accountId || !siteUrl) {
//       res.status(400).json({ error: 'Account ID and site URL required' });
//       return;
//     }
    
//     // Get authenticated client with user's credentials
//     const authClient = await getAuthenticatedClient(userId, accountId as string);
    
//     // Use Search Console API
//     const searchconsole = google.searchconsole({ version: 'v1', auth: authClient });
    
//     const endDate = new Date();
//     const startDate = new Date();
//     startDate.setDate(startDate.getDate() - parseInt(days as string));
    
//     const result = await searchconsole.searchanalytics.query({
//       siteUrl: siteUrl as string,
//       requestBody: {
//         startDate: startDate.toISOString().split('T')[0],
//         endDate: endDate.toISOString().split('T')[0],
//         dimensions: ['date'],
//         metrics: ['clicks', 'impressions', 'ctr', 'position']
//       }
//     });
    
//     console.log(`✅ Performance data fetched for ${siteUrl}`);
//     res.json(result.data.rows || []);
    
//   } catch (error: any) {
//     console.error('Performance data error:', error);
    
//     if (error.message?.includes('auth') || error.code === 401) {
//       res.status(401).json({ error: 'Authentication expired. Please reconnect your account.' });
//     } else {
//       res.status(500).json({ error: 'Failed to fetch performance data' });
//     }
//   }
// });

// // Refresh token endpoint
// app.post("/api/gsc/refresh-token", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.user!.id;
//     const { accountId, refreshToken } = req.body;
    
//     console.log(`🔄 Refreshing token for account: ${accountId}`);
    
//     if (!accountId || !refreshToken) {
//       res.status(400).json({ error: 'Account ID and refresh token required' });
//       return;
//     }
    
//     // Create OAuth2 client with user's credentials
//     const authClient = await createGscOAuth2Client(userId);
//     authClient.setCredentials({ refresh_token: refreshToken });
    
//     const { credentials } = await authClient.refreshAccessToken();
    
//     // Update in memory cache
//     gscUserTokens.set(`${userId}_${accountId}`, credentials);
    
//     // Update in database
//     await gscStorage.updateGscAccount(userId, accountId, {
//       accessToken: credentials.access_token!,
//       tokenExpiry: credentials.expiry_date!
//     });
    
//     console.log(`✅ Token refreshed for account: ${accountId}`);
//     res.json({ success: true });
    
//   } catch (error: any) {
//     console.error('Token refresh error:', error);
//     res.status(500).json({ error: 'Failed to refresh token' });
//   }
// });
