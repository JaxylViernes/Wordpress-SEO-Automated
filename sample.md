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










# GOOGLE_CLIENT_ID=79116181459-n1cntmbuiomfppcan8v5s3mep70aciml.apps.googleusercontent.com
# GOOGLE_CLIENT_SECRET=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



# GOOGLE_CLIENT_ID=747008179131-3glv0cq6il1k9j5gc8dmsaadmgqhlsup.apps.googleusercontent.com
# GOOGLE_CLIENT_SECRET=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



// console.log('OAuth2 Client Configuration:', {
//   clientId: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'MISSING',
//   clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'MISSING',
//   redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/gsc/oauth-callback'
// });

// // GSC Scopes
// const GSC_SCOPES = [
//   'https://www.googleapis.com/auth/webmasters',
//   'https://www.googleapis.com/auth/indexing',
//   'https://www.googleapis.com/auth/siteverification',
//   'https://www.googleapis.com/auth/userinfo.email',
//   'https://www.googleapis.com/auth/userinfo.profile'
// ];

// // Store user GSC tokens (temporary in-memory cache)
// const gscUserTokens = new Map<string, any>();

// // Get OAuth URL for GSC
// app.get("/api/gsc/auth-url", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.user!.id;
//     console.log(`🔐 Generating GSC OAuth URL for user: ${userId}`);
    
//     const authUrl = gscOAuth2Client.generateAuthUrl({
//       access_type: 'offline',
//       scope: GSC_SCOPES,
//       prompt: 'consent',
//       state: userId
//     });
    
//     res.json({ authUrl });
//   } catch (error) {
//     console.error('GSC auth URL error:', error);
//     res.status(500).json({ error: 'Failed to generate auth URL' });
//   }
// });

// // Exchange code for tokens
// app.post("/api/gsc/auth", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.user!.id;
//     const { code } = req.body;
    
//     console.log(`🔐 Exchanging GSC auth code for user: ${userId}`);
    
//     if (!code) {
//       res.status(400).json({ error: 'Authorization code required' });
//       return;
//     }
    
//     // Create a new OAuth2 client instance for this request
//     const authClient = new google.auth.OAuth2(
//       process.env.GOOGLE_CLIENT_ID,
//       process.env.GOOGLE_CLIENT_SECRET,
//       process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/gsc/oauth-callback'
//     );
    
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
//       try {
//         await gscStorage.saveGscAccount(userId, gscAccount);
//       } catch (storageError) {
//         console.error('Storage error (non-fatal):', storageError);
//       }
      
//       // Log activity
//       try {
//         if (storage && storage.createActivityLog) {
//           await storage.createActivityLog({
//             userId,
//             type: "gsc_account_connected",
//             description: `Connected Google Search Console account: ${userInfo.email}`,
//             metadata: { 
//               gscAccountId: userInfo.id,
//               email: userInfo.email
//             }
//           });
//         }
//       } catch (logError) {
//         console.error('Activity log error (non-fatal):', logError);
//       }
      
//       console.log(`✅ GSC account connected: ${userInfo.email}`);
//       res.json({ account: gscAccount });
      
//     } catch (tokenError: any) {
//       if (tokenError.message?.includes('invalid_grant')) {
//         console.error('Invalid grant - code may have been used or expired');
//         res.status(400).json({ 
//           error: 'Authorization code expired or already used. Please try signing in again.' 
//         });
//         return;
//       }
      
//       if (tokenError.message?.includes('redirect_uri_mismatch')) {
//         console.error('Redirect URI mismatch during token exchange');
//         res.status(400).json({ 
//           error: 'Configuration error. Please contact support.' 
//         });
//         return;
//       }
      
//       throw tokenError;
//     }
    
//   } catch (error: any) {
//     console.error('GSC auth error:', error);
//     const errorMessage = error.message || 'Authentication failed';
//     const statusCode = error.response?.status || 500;
    
//     res.status(statusCode).json({ 
//       error: 'Authentication failed',
//       details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
//     });
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
    
//     // Get tokens from memory or database
//     let tokens = gscUserTokens.get(`${userId}_${accountId}`);
//     if (!tokens) {
//       const savedAccount = await gscStorage.getGscAccount(userId, accountId as string);
//       if (!savedAccount) {
//         res.status(401).json({ error: 'Not authenticated' });
//         return;
//       }
      
//       tokens = {
//         access_token: savedAccount.accessToken,
//         refresh_token: savedAccount.refreshToken,
//         expiry_date: savedAccount.tokenExpiry
//       };
      
//       // Cache in memory
//       gscUserTokens.set(`${userId}_${accountId}`, tokens);
//     }
    
//     // Set credentials
//     gscOAuth2Client.setCredentials(tokens);
    
//     // Get properties from Search Console
//     const searchconsole = google.searchconsole({ version: 'v1', auth: gscOAuth2Client });
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
    
//   } catch (error) {
//     console.error('Error fetching GSC properties:', error);
//     res.status(500).json({ error: 'Failed to fetch properties' });
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
    
//     // Get tokens from memory or database
//     let tokens = gscUserTokens.get(`${userId}_${accountId}`);
//     if (!tokens) {
//       const savedAccount = await gscStorage.getGscAccount(userId, accountId);
//       if (!savedAccount) {
//         res.status(401).json({ error: 'Not authenticated' });
//         return;
//       }
      
//       tokens = {
//         access_token: savedAccount.accessToken,
//         refresh_token: savedAccount.refreshToken,
//         expiry_date: savedAccount.tokenExpiry
//       };
      
//       gscUserTokens.set(`${userId}_${accountId}`, tokens);
//     }
    
//     gscOAuth2Client.setCredentials(tokens);
    
//     // Use Indexing API
//     const indexing = google.indexing({ version: 'v3', auth: gscOAuth2Client });
    
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
    
//   } catch (error) {
//     console.error('Indexing error:', error);
//     res.status(500).json({ error: 'Failed to submit URL for indexing' });
//   }
// });

// // Inspect URL
// app.post("/api/gsc/inspect", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.user!.id;
//     const { accountId, siteUrl, inspectionUrl } = req.body;
    
//     console.log(`🔍 Inspecting URL: ${inspectionUrl}`);
    
//     if (!accountId || !siteUrl || !inspectionUrl) {
//       res.status(400).json({ error: 'Account ID, site URL, and inspection URL required' });
//       return;
//     }
    
//     // Get tokens from memory or database
//     let tokens = gscUserTokens.get(`${userId}_${accountId}`);
//     if (!tokens) {
//       const savedAccount = await gscStorage.getGscAccount(userId, accountId);
//       if (!savedAccount) {
//         res.status(401).json({ error: 'Not authenticated' });
//         return;
//       }
      
//       tokens = {
//         access_token: savedAccount.accessToken,
//         refresh_token: savedAccount.refreshToken,
//         expiry_date: savedAccount.tokenExpiry
//       };
      
//       gscUserTokens.set(`${userId}_${accountId}`, tokens);
//     }
    
//     gscOAuth2Client.setCredentials(tokens);
    
//     // Use URL Inspection API
//     const searchconsole = google.searchconsole({ version: 'v1', auth: gscOAuth2Client });
    
//     const result = await searchconsole.urlInspection.index.inspect({
//       requestBody: {
//         inspectionUrl: inspectionUrl,
//         siteUrl: siteUrl
//       }
//     });
    
//     const inspection = result.data.inspectionResult;
    
//     // Transform result
//     const inspectionResult = {
//       url: inspectionUrl,
//       indexStatus: inspection?.indexStatusResult?.coverageState || 'NOT_INDEXED',
//       lastCrawlTime: inspection?.indexStatusResult?.lastCrawlTime,
//       pageFetchState: inspection?.indexStatusResult?.pageFetchState,
//       googleCanonical: inspection?.indexStatusResult?.googleCanonical,
//       userCanonical: inspection?.indexStatusResult?.userCanonical,
//       sitemap: inspection?.indexStatusResult?.sitemap,
//       mobileUsability: inspection?.mobileUsabilityResult?.verdict || 'NEUTRAL',
//       richResultsStatus: inspection?.richResultsResult?.verdict
//     };
    
//     console.log(`✅ URL inspection complete: ${inspectionResult.indexStatus}`);
//     res.json(inspectionResult);
    
//   } catch (error) {
//     console.error('Inspection error:', error);
//     res.status(500).json({ error: 'Failed to inspect URL' });
//   }
// });

// // Submit sitemap
// app.post("/api/gsc/sitemap", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.user!.id;
//     const { accountId, siteUrl, sitemapUrl } = req.body;
    
//     console.log(`📄 Submitting sitemap: ${sitemapUrl}`);
    
//     if (!accountId || !siteUrl || !sitemapUrl) {
//       res.status(400).json({ error: 'Account ID, site URL, and sitemap URL required' });
//       return;
//     }
    
//     // Get tokens from memory or database
//     let tokens = gscUserTokens.get(`${userId}_${accountId}`);
//     if (!tokens) {
//       const savedAccount = await gscStorage.getGscAccount(userId, accountId);
//       if (!savedAccount) {
//         res.status(401).json({ error: 'Not authenticated' });
//         return;
//       }
      
//       tokens = {
//         access_token: savedAccount.accessToken,
//         refresh_token: savedAccount.refreshToken,
//         expiry_date: savedAccount.tokenExpiry
//       };
      
//       gscUserTokens.set(`${userId}_${accountId}`, tokens);
//     }
    
//     gscOAuth2Client.setCredentials(tokens);
    
//     // Submit sitemap
//     const searchconsole = google.searchconsole({ version: 'v1', auth: gscOAuth2Client });
    
//     await searchconsole.sitemaps.submit({
//       siteUrl: siteUrl,
//       feedpath: sitemapUrl
//     });
    
//     // Log activity
//     await storage.createActivityLog({
//       userId,
//       type: "gsc_sitemap_submitted",
//       description: `Sitemap submitted: ${sitemapUrl}`,
//       metadata: { 
//         siteUrl,
//         sitemapUrl
//       }
//     });
    
//     console.log(`✅ Sitemap submitted: ${sitemapUrl}`);
//     res.json({
//       success: true,
//       message: 'Sitemap submitted successfully'
//     });
    
//   } catch (error) {
//     console.error('Sitemap submission error:', error);
//     res.status(500).json({ error: 'Failed to submit sitemap' });
//   }
// });

// // Get performance data
// app.get("/api/gsc/performance", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.user!.id;
//     const { accountId, siteUrl, days = '28' } = req.query;
    
//     console.log(`📊 Fetching performance data for: ${siteUrl}`);
    
//     if (!accountId || !siteUrl) {
//       res.status(400).json({ error: 'Account ID and site URL required' });
//       return;
//     }
    
//     // Get tokens from memory or database
//     let tokens = gscUserTokens.get(`${userId}_${accountId}`);
//     if (!tokens) {
//       const savedAccount = await gscStorage.getGscAccount(userId, accountId as string);
//       if (!savedAccount) {
//         res.status(401).json({ error: 'Not authenticated' });
//         return;
//       }
      
//       tokens = {
//         access_token: savedAccount.accessToken,
//         refresh_token: savedAccount.refreshToken,
//         expiry_date: savedAccount.tokenExpiry
//       };
      
//       gscUserTokens.set(`${userId}_${accountId}`, tokens);
//     }
    
//     gscOAuth2Client.setCredentials(tokens);
    
//     // Get performance data
//     const searchconsole = google.searchconsole({ version: 'v1', auth: gscOAuth2Client });
    
//     const endDate = new Date();
//     const startDate = new Date();
//     startDate.setDate(startDate.getDate() - parseInt(days as string));
    
//     const result = await searchconsole.searchanalytics.query({
//       siteUrl: siteUrl as string,
//       requestBody: {
//         startDate: startDate.toISOString().split('T')[0],
//         endDate: endDate.toISOString().split('T')[0],
//         dimensions: ['date'],
//         metrics: ['clicks', 'impressions', 'ctr', 'position'],
//         rowLimit: 1000
//       }
//     });
    
//     const performanceData = (result.data.rows || []).map(row => ({
//       date: row.keys?.[0],
//       clicks: row.clicks || 0,
//       impressions: row.impressions || 0,
//       ctr: row.ctr || 0,
//       position: row.position || 0
//     }));
    
//     console.log(`✅ Performance data fetched: ${performanceData.length} days`);
//     res.json(performanceData);
    
//   } catch (error) {
//     console.error('Performance data error:', error);
//     res.status(500).json({ error: 'Failed to fetch performance data' });
//   }
// });

// // Refresh GSC token
// app.post("/api/gsc/refresh-token", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.user!.id;
//     const { accountId, refreshToken } = req.body;
    
//     console.log(`🔄 Refreshing GSC token for account: ${accountId}`);
    
//     gscOAuth2Client.setCredentials({ refresh_token: refreshToken });
//     const { credentials } = await gscOAuth2Client.refreshAccessToken();
    
//     // Update stored tokens in memory
//     gscUserTokens.set(`${userId}_${accountId}`, credentials);
    
//     // Update in database
//     await gscStorage.updateGscAccount(userId, accountId, {
//       accessToken: credentials.access_token!,
//       tokenExpiry: credentials.expiry_date!
//     });
    
//     console.log(`✅ GSC token refreshed for account: ${accountId}`);
//     res.json({
//       accessToken: credentials.access_token,
//       tokenExpiry: credentials.expiry_date
//     });
    
//   } catch (error) {
//     console.error('Token refresh error:', error);
//     res.status(500).json({ error: 'Failed to refresh token' });
//   }
// });

// // OAuth callback handler
// app.get("/api/gsc/oauth-callback", async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { code, state, error } = req.query;
    
//     if (error) {
//       res.send(`
//         <!DOCTYPE html>
//         <html>
//         <head><title>Authentication Error</title></head>
//         <body>
//           <script>
//             if (window.opener) {
//               window.opener.postMessage({
//                 type: 'GOOGLE_AUTH_ERROR',
//                 error: '${error}'
//               }, '*');
//               window.close();
//             } else {
//               window.location.href = '/google-search-console?error=${error}';
//             }
//           </script>
//         </body>
//         </html>
//       `);
//       return;
//     }
    
//     if (!code) {
//       res.send(`
//         <!DOCTYPE html>
//         <html>
//         <head><title>Authentication Error</title></head>
//         <body>
//           <script>
//             if (window.opener) {
//               window.opener.postMessage({
//                 type: 'GOOGLE_AUTH_ERROR',
//                 error: 'No authorization code received'
//               }, '*');
//               window.close();
//             } else {
//               window.location.href = '/google-search-console?error=no_code';
//             }
//           </script>
//         </body>
//         </html>
//       `);
//       return;
//     }
    
//     // Send success message to opener window
//     res.send(`
//       <!DOCTYPE html>
//       <html>
//       <head><title>Authentication Successful</title></head>
//       <body>
//         <script>
//           if (window.opener) {
//             window.opener.postMessage({
//               type: 'GOOGLE_AUTH_SUCCESS',
//               code: '${code}',
//               state: '${state || ''}'
//             }, '*');
//             window.close();
//           } else {
//             window.location.href = '/google-search-console?code=${code}';
//           }
//         </script>
//         <p>Authentication successful! This window should close automatically...</p>
//       </body>
//       </html>
//     `);
//   } catch (error) {
//     console.error('OAuth callback error:', error);
//     res.status(500).send('Authentication failed');
//   }
// });

// // Get all GSC accounts for a user
// app.get("/api/gsc/accounts", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.user!.id;
//     const accounts = await gscStorage.getAllGscAccounts(userId);
//     res.json(accounts);
//   } catch (error) {
//     console.error('Error fetching GSC accounts:', error);
//     res.status(500).json({ error: 'Failed to fetch accounts' });
//   }
// });

// // Remove GSC account
// app.post("/api/gsc/remove-account", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.user!.id;
//     const { accountId } = req.body;
    
//     if (!accountId) {
//       res.status(400).json({ error: 'Account ID required' });
//       return;
//     }
    
//     await gscStorage.deleteGscAccount(userId, accountId);
    
//     // Remove from memory cache
//     gscUserTokens.delete(`${userId}_${accountId}`);
    
//     console.log(`🗑️ GSC account removed: ${accountId}`);
//     res.json({ success: true });
//   } catch (error) {
//     console.error('Error removing GSC account:', error);
//     res.status(500).json({ error: 'Failed to remove account' });
//   }
// });


// // server/routes/gsc.routes.ts

// import { Router, Request, Response } from 'express';
// import { gscService } from '../services/gsc.service';
// import { storage } from '../storage';

// export const gscRouter = Router();

// // Configuration endpoints
// gscRouter.get('/configuration', async (req: Request, res: Response) => {
//   try {
//     const userId = req.user!.id;
//     const config = await storage.getGscConfiguration(userId);
    
//     res.json(config ? {
//       ...config,
//       clientSecret: '***HIDDEN***' // Mask secret in response
//     } : null);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to get configuration' });
//   }
// });

// gscRouter.post('/configuration', async (req: Request, res: Response) => {
//   try {
//     const userId = req.user!.id;
//     const { clientId, clientSecret, redirectUri } = req.body;

//     if (!clientId || !clientSecret || !redirectUri) {
//       return res.status(400).json({ error: 'All fields are required' });
//     }

//     const config = await storage.saveGscConfiguration(userId, {
//       clientId,
//       clientSecret,
//       redirectUri
//     });

//     res.json({
//       ...config,
//       clientSecret: '***HIDDEN***'
//     });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to save configuration' });
//   }
// });

// // OAuth endpoints
// gscRouter.get('/auth-url', async (req: Request, res: Response) => {
//   try {
//     const userId = req.user!.id;
//     const authUrl = await gscService.generateAuthUrl(userId);
    
//     if (!authUrl) {
//       return res.status(400).json({ error: 'Configuration required' });
//     }

//     res.json({ authUrl });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to generate auth URL' });
//   }
// });

// gscRouter.post('/auth', async (req: Request, res: Response) => {
//   try {
//     const userId = req.user!.id;
//     const { code } = req.body;

//     if (!code) {
//       return res.status(400).json({ error: 'Authorization code required' });
//     }

//     const tokens = await gscService.exchangeCodeForTokens(userId, code);
//     const userInfo = await gscService.getUserInfo(tokens.access_token!);

//     const account = await storage.saveGscAccount(userId, {
//       id: userInfo.id!,
//       email: userInfo.email!,
//       name: userInfo.name || userInfo.email!,
//       picture: userInfo.picture,
//       accessToken: tokens.access_token!,
//       refreshToken: tokens.refresh_token || '',
//       tokenExpiry: tokens.expiry_date || Date.now() + 3600000
//     });

//     res.json({ account });
//   } catch (error) {
//     res.status(500).json({ error: 'Authentication failed' });
//   }
// });

// // Add to your main server file:
// // app.use('/api/gsc', requireAuth, gscRouter);








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
//   AlertTriangle
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

// // API Service Class with proper integration
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

//   static async inspectURL(accountId: string, siteUrl: string, inspectionUrl: string): Promise<URLInspectionResult> {
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

//   static async getPerformance(accountId: string, siteUrl: string, days: number = 28): Promise<PerformanceData[]> {
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

// // Main Component
// const GoogleSearchConsole: React.FC = () => {
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
//   const [urlToInspect, setUrlToInspect] = useState<string>('');
//   const [sitemapUrl, setSitemapUrl] = useState<string>('');
//   const [bulkUrls, setBulkUrls] = useState<string>('');
//   const [inspectionResult, setInspectionResult] = useState<URLInspectionResult | null>(null);
//   const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
//   const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
//   const [quotaUsage, setQuotaUsage] = useState<{ used: number; limit: number }>({ used: 0, limit: 200 });
//   const [accountDropdownOpen, setAccountDropdownOpen] = useState<boolean>(false);
  
//   // Refs for managing auth window and preventing duplicates
//   const authWindowRef = useRef<Window | null>(null);
//   const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);

//   // Load saved accounts on mount
//   useEffect(() => {
//     const loadAccounts = () => {
//       try {
//         const savedAccounts = localStorage.getItem('gsc_accounts');
//         if (savedAccounts) {
//           const parsed = JSON.parse(savedAccounts);
//           setAccounts(parsed);
//           if (parsed.length > 0 && !selectedAccount) {
//             setSelectedAccount(parsed[0]);
//           }
//         }
//       } catch (error) {
//         console.error('Failed to load saved accounts:', error);
//         showNotification('error', 'Failed to load saved accounts');
//       }
//     };
    
//     loadAccounts();
    
//     // Check for code in URL (OAuth callback fallback)
//     const urlParams = new URLSearchParams(window.location.search);
//     const code = urlParams.get('code');
//     if (code) {
//       handleOAuthCallback(code);
//       // Clean URL
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

//   // Save accounts to localStorage whenever they change
//   useEffect(() => {
//     if (accounts.length > 0) {
//       localStorage.setItem('gsc_accounts', JSON.stringify(accounts));
//     }
//   }, [accounts]);

//   // Auto-refresh tokens when needed
//   useEffect(() => {
//     const refreshTokensIfNeeded = async () => {
//       for (const account of accounts) {
//         const timeUntilExpiry = account.tokenExpiry - Date.now();
        
//         // Refresh if token expires in less than 5 minutes
//         if (account.refreshToken && timeUntilExpiry < 300000) {
//           try {
//             const result = await SearchConsoleAPI.refreshToken(account.id, account.refreshToken);
            
//             const updatedAccounts = accounts.map(acc => 
//               acc.id === account.id 
//                 ? { ...acc, accessToken: result.accessToken, tokenExpiry: result.tokenExpiry }
//                 : acc
//             );
            
//             setAccounts(updatedAccounts);
//             console.log(`Token refreshed for ${account.email}`);
//           } catch (error) {
//             console.error(`Failed to refresh token for ${account.email}:`, error);
//             showNotification('warning', `Token refresh failed for ${account.email}. Please re-authenticate.`);
            
//             // Mark account as inactive
//             const updatedAccounts = accounts.map(acc => 
//               acc.id === account.id ? { ...acc, isActive: false } : acc
//             );
//             setAccounts(updatedAccounts);
//           }
//         }
//       }
//     };

//     // Initial check
//     refreshTokensIfNeeded();
    
//     // Set up interval for periodic checks
//     const interval = setInterval(refreshTokensIfNeeded, 60000); // Check every minute
    
//     return () => clearInterval(interval);
//   }, [accounts]);

//   // Cleanup auth window on unmount
//   useEffect(() => {
//     return () => {
//       if (authWindowRef.current && !authWindowRef.current.closed) {
//         authWindowRef.current.close();
//       }
//       if (messageHandlerRef.current) {
//         window.removeEventListener('message', messageHandlerRef.current);
//       }
//     };
//   }, []);

//   const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
//     setNotification({ type, message });
//     setTimeout(() => setNotification(null), 5000);
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
//       console.error('Load properties error:', error);
      
//       // If authentication error, mark account as inactive
//       if (error.message?.includes('authenticated') || error.message?.includes('401')) {
//         const updatedAccounts = accounts.map(acc => 
//           acc.id === accountId ? { ...acc, isActive: false } : acc
//         );
//         setAccounts(updatedAccounts);
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   const loadQuotaUsage = async (accountId: string) => {
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

//   const handleOAuthCallback = async (code: string) => {
//     if (isAuthenticating) return;
    
//     setIsAuthenticating(true);
//     try {
//       const account = await SearchConsoleAPI.authenticateAccount(code);
      
//       // Check if account already exists
//       const existingIndex = accounts.findIndex(acc => acc.id === account.id);
//       let updatedAccounts;
      
//       if (existingIndex >= 0) {
//         // Update existing account
//         updatedAccounts = [...accounts];
//         updatedAccounts[existingIndex] = account;
//         showNotification('success', `Account ${account.email} re-authenticated`);
//       } else {
//         // Add new account
//         updatedAccounts = [...accounts, account];
//         showNotification('success', `Account ${account.email} connected successfully`);
//       }
      
//       setAccounts(updatedAccounts);
//       setSelectedAccount(account);
//     } catch (error: any) {
//       console.error('OAuth callback error:', error);
//       showNotification('error', error.message || 'Failed to authenticate account');
//     } finally {
//       setIsAuthenticating(false);
//     }
//   };

//   const handleAddAccount = async () => {
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
      
//       // Remove any existing message handler
//       if (messageHandlerRef.current) {
//         window.removeEventListener('message', messageHandlerRef.current);
//       }
      
//       const authUrl = await SearchConsoleAPI.getAuthUrl();
      
//       // Open auth window
//       const width = 500;
//       const height = 600;
//       const left = window.screen.width / 2 - width / 2;
//       const top = window.screen.height / 2 - height / 2;
      
//       authWindowRef.current = window.open(
//         authUrl,
//         'google-auth',
//         `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
//       );
      
//       // Create message handler for OAuth callback
//       const handleMessage = async (event: MessageEvent) => {
//         // Security: validate origin
//         if (event.origin !== window.location.origin) return;
        
//         if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
//           const { code } = event.data;
          
//           // Remove handler immediately
//           window.removeEventListener('message', handleMessage);
//           messageHandlerRef.current = null;
          
//           // Close auth window
//           if (authWindowRef.current && !authWindowRef.current.closed) {
//             authWindowRef.current.close();
//           }
//           authWindowRef.current = null;
          
//           // Handle the OAuth callback
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

//   const handleRemoveAccount = (accountId: string) => {
//     const updatedAccounts = accounts.filter(acc => acc.id !== accountId);
//     setAccounts(updatedAccounts);
    
//     if (updatedAccounts.length === 0) {
//       localStorage.removeItem('gsc_accounts');
//     }
    
//     if (selectedAccount?.id === accountId) {
//       setSelectedAccount(updatedAccounts[0] || null);
//       setProperties([]);
//       setSelectedProperty(null);
//     }
    
//     showNotification('info', 'Account removed');
//   };

//   const handleIndexUrl = async () => {
//     if (!urlToIndex || !selectedAccount || !selectedProperty) return;
    
//     // Check quota
//     if (quotaUsage.used >= quotaUsage.limit) {
//       showNotification('error', 'Daily quota exceeded (200 URLs/day). Try again tomorrow.');
//       return;
//     }
    
//     // Validate URL
//     try {
//       const url = new URL(urlToIndex);
//       if (!url.protocol.startsWith('http')) {
//         showNotification('error', 'Invalid URL: must start with http:// or https://');
//         return;
//       }
//     } catch {
//       showNotification('error', 'Invalid URL format');
//       return;
//     }
    
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
      
//       updateQuotaUsage(selectedAccount.id, 1);
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
      
//       if (error.message?.includes('quota')) {
//         loadQuotaUsage(selectedAccount.id); // Refresh quota count
//       }
      
//       showNotification('error', error.message || 'Failed to submit URL for indexing');
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
//       showNotification('warning', `Only ${quotaUsage.limit - quotaUsage.used} URLs can be submitted today`);
//       return;
//     }
    
//     setLoading(true);
//     let successCount = 0;
//     let errorCount = 0;
    
//     for (const url of urls) {
//       const trimmedUrl = url.trim();
//       if (!trimmedUrl) continue;
      
//       const request: IndexingRequest = {
//         url: trimmedUrl,
//         type: 'URL_UPDATED',
//         status: 'pending'
//       };
      
//       setIndexingQueue(prev => [...prev, request]);
      
//       try {
//         await SearchConsoleAPI.requestIndexing(selectedAccount.id, request);
//         successCount++;
        
//         setIndexingQueue(queue => 
//           queue.map(item => 
//             item.url === trimmedUrl 
//               ? { ...item, status: 'success' }
//               : item
//           )
//         );
//       } catch (error: any) {
//         errorCount++;
        
//         setIndexingQueue(queue => 
//           queue.map(item => 
//             item.url === trimmedUrl 
//               ? { ...item, status: 'error', message: error.message }
//               : item
//           )
//         );
        
//         if (error.message?.includes('quota')) {
//           break; // Stop if quota exceeded
//         }
//       }
      
//       // Add delay between requests to avoid rate limiting
//       await new Promise(resolve => setTimeout(resolve, 500));
//     }
    
//     updateQuotaUsage(selectedAccount.id, successCount);
    
//     if (successCount > 0) {
//       showNotification('success', `Successfully submitted ${successCount} URL(s)`);
//     }
//     if (errorCount > 0) {
//       showNotification('warning', `Failed to submit ${errorCount} URL(s)`);
//     }
    
//     setBulkUrls('');
//     setLoading(false);
//   };

//   const handleInspectUrl = async () => {
//     if (!urlToInspect || !selectedAccount || !selectedProperty) return;
    
//     // Validate URL
//     try {
//       const url = new URL(urlToInspect);
//       if (!url.protocol.startsWith('http')) {
//         showNotification('error', 'Invalid URL: must start with http:// or https://');
//         return;
//       }
//     } catch {
//       showNotification('error', 'Invalid URL format');
//       return;
//     }
    
//     setLoading(true);
//     setInspectionResult(null);
    
//     try {
//       const result = await SearchConsoleAPI.inspectURL(
//         selectedAccount.id, 
//         selectedProperty.siteUrl, 
//         urlToInspect
//       );
      
//       setInspectionResult(result);
//       showNotification('success', 'URL inspection completed');
//     } catch (error: any) {
//       showNotification('error', error.message || 'Failed to inspect URL');
//       console.error('Inspect URL error:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSubmitSitemap = async () => {
//     if (!sitemapUrl || !selectedAccount || !selectedProperty) return;
    
//     // Validate sitemap URL
//     try {
//       const url = new URL(sitemapUrl);
//       if (!url.protocol.startsWith('http')) {
//         showNotification('error', 'Invalid URL: must start with http:// or https://');
//         return;
//       }
//       if (!sitemapUrl.includes('.xml')) {
//         showNotification('warning', 'Warning: Sitemap URL typically ends with .xml');
//       }
//     } catch {
//       showNotification('error', 'Invalid URL format');
//       return;
//     }
    
//     setLoading(true);
//     try {
//       await SearchConsoleAPI.submitSitemap(
//         selectedAccount.id,
//         selectedProperty.siteUrl,
//         sitemapUrl
//       );
      
//       showNotification('success', `Sitemap submitted: ${sitemapUrl}`);
//       setSitemapUrl('');
//     } catch (error: any) {
//       showNotification('error', error.message || 'Failed to submit sitemap');
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
//     } catch (error: any) {
//       showNotification('error', error.message || 'Failed to load performance data');
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

//   const clearIndexingQueue = () => {
//     setIndexingQueue([]);
//     showNotification('info', 'Indexing queue cleared');
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
//               {/* Quota Display */}
//               {selectedAccount && (
//                 <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-lg">
//                   <Clock className="w-4 h-4 text-gray-500" />
//                   <span className="text-sm text-gray-700">
//                     Quota: {quotaUsage.used}/{quotaUsage.limit}
//                   </span>
//                 </div>
//               )}
              
//               {/* Account Selector */}
//               <div className="relative">
//                 <button
//                   className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
//                   onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
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
                
//                 {accountDropdownOpen && (
//                   <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
//                     {accounts.map(account => (
//                       <div
//                         key={account.id}
//                         className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer"
//                         onClick={() => {
//                           setSelectedAccount(account);
//                           setAccountDropdownOpen(false);
//                         }}
//                       >
//                         <div className="flex items-center space-x-3">
//                           {account.picture ? (
//                             <img src={account.picture} alt={account.name} className="w-8 h-8 rounded-full" />
//                           ) : (
//                             <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
//                               {account.name[0]}
//                             </div>
//                           )}
//                           <div>
//                             <p className="text-sm font-medium text-gray-900">{account.name}</p>
//                             <p className="text-xs text-gray-500">{account.email}</p>
//                           </div>
//                         </div>
//                         <div className="flex items-center space-x-2">
//                           {!account.isActive && (
//                             <AlertTriangle className="w-4 h-4 text-yellow-500" title="Token expired" />
//                           )}
//                           {selectedAccount?.id === account.id && (
//                             <CheckCircle className="w-4 h-4 text-green-500" />
//                           )}
//                         </div>
//                       </div>
//                     ))}
                    
//                     <div className="border-t border-gray-200">
//                       <button
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           handleAddAccount();
//                           setAccountDropdownOpen(false);
//                         }}
//                         disabled={isAuthenticating}
//                         className="w-full flex items-center space-x-2 px-4 py-3 text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
//                       >
//                         {isAuthenticating ? (
//                           <Loader2 className="w-4 h-4 animate-spin" />
//                         ) : (
//                           <Plus className="w-4 h-4" />
//                         )}
//                         <span className="text-sm">
//                           {isAuthenticating ? 'Authenticating...' : 'Add Google Account'}
//                         </span>
//                       </button>
//                     </div>
//                   </div>
//                 )}
//               </div>
              
//               <button
//                 onClick={handleAddAccount}
//                 disabled={isAuthenticating}
//                 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
//               >
//                 {isAuthenticating ? (
//                   <Loader2 className="w-4 h-4 animate-spin" />
//                 ) : (
//                   <Plus className="w-4 h-4" />
//                 )}
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
//                 disabled={loading || properties.length === 0}
//               >
//                 <option value="">
//                   {loading ? 'Loading properties...' : 'Select a property'}
//                 </option>
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
              
//               <button
//                 onClick={() => loadProperties(selectedAccount.id)}
//                 disabled={loading}
//                 className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
//                 title="Refresh properties"
//               >
//                 <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Notification */}
//       {notification && (
//         <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top duration-300">
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
//                           disabled={loading || !urlToIndex || quotaUsage.used >= quotaUsage.limit}
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
//                         placeholder={`https://example.com/page1\nhttps://example.com/page2\nhttps://example.com/page3`}
//                         rows={5}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                       />
//                       <button
//                         onClick={handleBulkIndex}
//                         disabled={loading || !bulkUrls || quotaUsage.used >= quotaUsage.limit}
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
//                       <div className="flex items-center justify-between mb-4">
//                         <h3 className="text-lg font-medium text-gray-900">Indexing Queue</h3>
//                         <button
//                           onClick={clearIndexingQueue}
//                           className="text-sm text-gray-500 hover:text-gray-700"
//                         >
//                           Clear Queue
//                         </button>
//                       </div>
//                       <div className="space-y-2 max-h-96 overflow-y-auto">
//                         {indexingQueue.map((item, index) => (
//                           <div key={index} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
//                             <div className="flex items-center space-x-3">
//                               {item.status === 'pending' && <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />}
//                               {item.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
//                               {item.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
//                               <span className="text-sm text-gray-900 truncate max-w-md">{item.url}</span>
//                             </div>
//                             <div className="text-sm text-gray-500">
//                               {item.status === 'pending' && 'Submitting...'}
//                               {item.status === 'success' && 'Submitted'}
//                               {item.status === 'error' && (item.message || 'Failed')}
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
//                         <div className="mt-2">
//                           <div className="w-full bg-blue-200 rounded-full h-2">
//                             <div 
//                               className="bg-blue-600 h-2 rounded-full transition-all duration-300"
//                               style={{ width: `${Math.min((quotaUsage.used / quotaUsage.limit) * 100, 100)}%` }}
//                             />
//                           </div>
//                           <p className="text-xs text-blue-700 mt-1">
//                             {quotaUsage.used} of {quotaUsage.limit} URLs used today
//                           </p>
//                         </div>
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
//                               : inspectionResult.indexStatus === 'CRAWLED'
//                               ? 'bg-blue-100 text-blue-800'
//                               : inspectionResult.indexStatus === 'DISCOVERED'
//                               ? 'bg-yellow-100 text-yellow-800'
//                               : 'bg-red-100 text-red-800'
//                           }`}>
//                             {inspectionResult.indexStatus.replace('_', ' ')}
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
//                         {inspectionResult.mobileUsability && (
//                           <div className="flex items-center justify-between pb-4 border-b border-gray-200">
//                             <span className="text-sm font-medium text-gray-700">Mobile Usability</span>
//                             <span className={`px-3 py-1 rounded-full text-sm font-medium ${
//                               inspectionResult.mobileUsability === 'MOBILE_FRIENDLY'
//                                 ? 'bg-green-100 text-green-800'
//                                 : inspectionResult.mobileUsability === 'NOT_MOBILE_FRIENDLY'
//                                 ? 'bg-red-100 text-red-800'
//                                 : 'bg-gray-100 text-gray-800'
//                             }`}>
//                               {inspectionResult.mobileUsability.replace(/_/g, ' ')}
//                             </span>
//                           </div>
//                         )}

//                         {/* Canonical URL */}
//                         {inspectionResult.googleCanonical && (
//                           <div className="pb-4 border-b border-gray-200">
//                             <span className="text-sm font-medium text-gray-700 block mb-2">Canonical URL</span>
//                             <div className="flex items-center space-x-2">
//                               <span className="text-sm text-gray-900 flex-1 truncate">{inspectionResult.googleCanonical}</span>
//                               <button
//                                 onClick={() => copyToClipboard(inspectionResult.googleCanonical || '')}
//                                 className="p-1 hover:bg-gray-100 rounded"
//                                 title="Copy to clipboard"
//                               >
//                                 <Copy className="w-4 h-4 text-gray-500" />
//                               </button>
//                             </div>
//                           </div>
//                         )}

//                         {/* Actions based on status */}
//                         {inspectionResult.indexStatus !== 'INDEXED' && (
//                           <div className="mt-4 pt-4 border-t border-gray-200">
//                             <button
//                               onClick={() => {
//                                 setUrlToIndex(urlToInspect);
//                                 setActiveTab('index');
//                               }}
//                               className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
//                             >
//                               <Send className="w-4 h-4" />
//                               <span>Request Indexing</span>
//                             </button>
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
//                     <>
//                       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//                         <div className="bg-white border border-gray-200 rounded-lg p-4">
//                           <div className="flex items-center justify-between">
//                             <span className="text-sm font-medium text-gray-500">Total Clicks</span>
//                             <TrendingUp className="w-4 h-4 text-gray-400" />
//                           </div>
//                           <p className="text-2xl font-bold text-gray-900 mt-2">
//                             {performanceData.reduce((sum, d) => sum + d.clicks, 0).toLocaleString()}
//                           </p>
//                         </div>
                        
//                         <div className="bg-white border border-gray-200 rounded-lg p-4">
//                           <div className="flex items-center justify-between">
//                             <span className="text-sm font-medium text-gray-500">Total Impressions</span>
//                             <BarChart className="w-4 h-4 text-gray-400" />
//                           </div>
//                           <p className="text-2xl font-bold text-gray-900 mt-2">
//                             {performanceData.reduce((sum, d) => sum + d.impressions, 0).toLocaleString()}
//                           </p>
//                         </div>
                        
//                         <div className="bg-white border border-gray-200 rounded-lg p-4">
//                           <div className="flex items-center justify-between">
//                             <span className="text-sm font-medium text-gray-500">Average CTR</span>
//                             <TrendingUp className="w-4 h-4 text-gray-400" />
//                           </div>
//                           <p className="text-2xl font-bold text-gray-900 mt-2">
//                             {performanceData.length > 0 
//                               ? (performanceData.reduce((sum, d) => sum + d.ctr, 0) / performanceData.length * 100).toFixed(1)
//                               : 0}%
//                           </p>
//                         </div>
                        
//                         <div className="bg-white border border-gray-200 rounded-lg p-4">
//                           <div className="flex items-center justify-between">
//                             <span className="text-sm font-medium text-gray-500">Average Position</span>
//                             <TrendingUp className="w-4 h-4 text-gray-400" />
//                           </div>
//                           <p className="text-2xl font-bold text-gray-900 mt-2">
//                             {performanceData.length > 0
//                               ? (performanceData.reduce((sum, d) => sum + d.position, 0) / performanceData.length).toFixed(1)
//                               : 0}
//                           </p>
//                         </div>
//                       </div>

//                       {/* Performance Chart (simplified) */}
//                       <div className="bg-white border border-gray-200 rounded-lg p-6">
//                         <h4 className="text-lg font-medium text-gray-900 mb-4">Daily Performance</h4>
//                         <div className="overflow-x-auto">
//                           <table className="min-w-full divide-y divide-gray-200">
//                             <thead className="bg-gray-50">
//                               <tr>
//                                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
//                                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clicks</th>
//                                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impressions</th>
//                                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CTR</th>
//                                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
//                               </tr>
//                             </thead>
//                             <tbody className="bg-white divide-y divide-gray-200">
//                               {performanceData.slice(0, 10).map((data, idx) => (
//                                 <tr key={idx}>
//                                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                                     {data.date || 'N/A'}
//                                   </td>
//                                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                                     {data.clicks.toLocaleString()}
//                                   </td>
//                                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                                     {data.impressions.toLocaleString()}
//                                   </td>
//                                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                                     {(data.ctr * 100).toFixed(2)}%
//                                   </td>
//                                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                                     {data.position.toFixed(1)}
//                                   </td>
//                                 </tr>
//                               ))}
//                             </tbody>
//                           </table>
//                         </div>
//                       </div>
//                     </>
//                   )}

//                   {/* No data message */}
//                   {performanceData.length === 0 && !loading && (
//                     <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
//                       <BarChart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
//                       <p className="text-gray-600">No performance data available</p>
//                       <p className="text-sm text-gray-500 mt-1">
//                         Performance data will appear here once Google has collected search metrics for your property.
//                       </p>
//                       <button
//                         onClick={loadPerformanceData}
//                         className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
//                       >
//                         Refresh Data
//                       </button>
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
//                     {account.isActive ? (
//                       <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
//                         Active
//                       </span>
//                     ) : (
//                       <button
//                         onClick={() => handleAddAccount()}
//                         className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full hover:bg-yellow-200"
//                       >
//                         Re-authenticate
//                       </button>
//                     )}
//                     <button
//                       onClick={() => handleRemoveAccount(account.id)}
//                       className="p-1 hover:bg-gray-200 rounded transition-colors"
//                       title="Remove account"
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
//                   disabled={isAuthenticating}
//                   className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
//                 >
//                   {isAuthenticating ? 'Authenticating...' : 'Connect your first account'}
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
//               disabled={isAuthenticating}
//               className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2 disabled:opacity-50"
//             >
//               {isAuthenticating ? (
//                 <>
//                   <Loader2 className="w-5 h-5 animate-spin" />
//                   <span>Authenticating...</span>
//                 </>
//               ) : (
//                 <>
//                   <Plus className="w-5 h-5" />
//                   <span>Add Google Account</span>
//                 </>
//               )}
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