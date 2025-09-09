// import { useState } from "react";
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { Download, TrendingUp, TrendingDown, Calendar, FileText, BarChart3, Minus, RefreshCw, Plus, AlertTriangle } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Alert, AlertDescription } from "@/components/ui/alert";
// import { api } from "@/lib/api";
// import { format } from "date-fns";

// const getTrendIcon = (change: number) => {
//   if (change > 0) return <TrendingUp className="w-3 h-3" />;
//   if (change < 0) return <TrendingDown className="w-3 h-3" />;
//   return <Minus className="w-3 h-3" />;
// };

// const getTrendColor = (change: number) => {
//   if (change > 0) return "text-green-600";
//   if (change < 0) return "text-red-600";
//   return "text-gray-600";
// };

// const formatNumber = (num: number) => {
//   if (num >= 1000) {
//     return (num / 1000).toFixed(1) + "k";
//   }
//   return num.toString();
// };

// // Helper function to check if a report already exists for this period
// const checkForExistingReport = (
//   reports: any[], 
//   websiteId: string, 
//   reportType: string, 
//   targetPeriod: string
// ): boolean => {
//   return reports.some(report => 
//     report.websiteId === websiteId && 
//     report.reportType === reportType && 
//     report.period === targetPeriod
//   );
// };

// // Helper function to generate period string
// const generatePeriodString = (reportType: string): string => {
//   const now = new Date();
  
//   if (reportType === 'weekly') {
//     const weekNumber = Math.ceil(now.getDate() / 7);
//     return `Week ${weekNumber}, ${now.getFullYear()}`;
//   } else if (reportType === 'monthly') {
//     return `${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
//   } else { // quarterly
//     const quarter = Math.floor(now.getMonth() / 3) + 1;
//     return `Q${quarter} ${now.getFullYear()}`;
//   }
// };

// export default function Reports() {
//   const [selectedWebsite, setSelectedWebsite] = useState<string>("all");
//   const [reportType, setReportType] = useState<string>("all");
//   const [message, setMessage] = useState<string>("");
//   const [duplicateWarnings, setDuplicateWarnings] = useState<string[]>([]);
//   const [isBulkGenerating, setIsBulkGenerating] = useState<boolean>(false);
//   const queryClient = useQueryClient();

//   // Fetch websites
//   const { data: websites } = useQuery({
//     queryKey: ["/api/user/websites"],
//     queryFn: api.getWebsites,
//   });

//   // Fetch all reports
//   const { data: allReports = [], isLoading, refetch } = useQuery({
//     queryKey: ["/api/user/reports"],
//     queryFn: () => api.getClientReports(),
//     staleTime: 5 * 60 * 1000, // 5 minutes
//   });

//   // Generate report mutation
//   const generateReportMutation = useMutation({
//     mutationFn: ({ websiteId, reportType }: { websiteId: string; reportType: 'weekly' | 'monthly' | 'quarterly' }) =>
//       api.generateClientReport(websiteId, { reportType }),
//     onSuccess: (data) => {
//       console.log(`Report generated for ${data.websiteName}`);
//       setMessage(`Successfully generated ${data.reportType} report for ${data.websiteName}`);
//       queryClient.invalidateQueries({ queryKey: ["/api/user/reports"] });
//       setDuplicateWarnings([]); // Clear warnings on success
//       // Clear message after 5 seconds
//       setTimeout(() => setMessage(""), 5000);
//     },
//     onError: (error: Error) => {
//       console.error(`Failed to generate report: ${error.message}`);
//       setMessage(`Error: Failed to generate report - ${error.message}`);
//       // Clear message after 5 seconds
//       setTimeout(() => setMessage(""), 5000);
//     },
//   });

//   // Filter reports based on selections
//   const filteredReports = allReports.filter(report => {
//     if (selectedWebsite !== "all" && report.websiteId !== selectedWebsite) return false;
//     if (reportType !== "all" && report.reportType !== reportType) return false;
//     return true;
//   });

//   // Calculate overview stats
//   const monthlyReports = filteredReports.filter(r => r.reportType === "monthly").length;
//   const weeklyReports = filteredReports.filter(r => r.reportType === "weekly").length;
//   const avgPerformance = filteredReports.length > 0 ? 
//     Math.round(filteredReports.reduce((sum, r) => sum + (r.data?.seoScoreChange || 0), 0) / filteredReports.length) : 0;

//   const handleGenerateReport = (websiteId: string, type: 'weekly' | 'monthly' | 'quarterly') => {
//     console.log(`Generating ${type} report for website: ${websiteId}`);
    
//     // Check for existing reports
//     const targetPeriod = generatePeriodString(type);
//     const existingReport = checkForExistingReport(allReports, websiteId, type, targetPeriod);
    
//     if (existingReport) {
//       const website = websites?.find(w => w.id === websiteId);
//       setMessage(`Warning: A ${type} report for ${targetPeriod} already exists for ${website?.name || 'this website'}. Generating new report will replace the existing one.`);
//     } else {
//       setMessage(`Generating ${type} report...`);
//     }
    
//     generateReportMutation.mutate({ websiteId, reportType: type });
//   };

//   const handleBulkGenerate = async () => {
//     console.log("Bulk generate button clicked");
    
//     if (!websites || websites.length === 0) {
//       setMessage("No websites available for report generation");
//       return;
//     }

//     if (reportType === "all") {
//       setMessage("Please select a specific report type before generating reports");
//       return;
//     }

//     setIsBulkGenerating(true);

//     const websiteIds = selectedWebsite === "all" ? 
//       websites.map(w => w.id) : 
//       [selectedWebsite];

//     // Check for duplicates before generating
//     const targetPeriod = generatePeriodString(reportType as 'weekly' | 'monthly' | 'quarterly');
//     const duplicates: string[] = [];
    
//     websiteIds.forEach(websiteId => {
//       const website = websites.find(w => w.id === websiteId);
//       if (checkForExistingReport(allReports, websiteId, reportType, targetPeriod)) {
//         duplicates.push(website?.name || 'Unknown website');
//       }
//     });

//     if (duplicates.length > 0) {
//       setDuplicateWarnings(duplicates);
//       setMessage(`Warning: ${duplicates.length} website(s) already have ${reportType} reports for ${targetPeriod}. Continue to replace existing reports.`);
//     } else {
//       setDuplicateWarnings([]);
//     }

//     setMessage(`Generating ${reportType} reports for ${websiteIds.length} website(s)...`);

//     try {
//       const results = await api.generateBulkReports(websiteIds, reportType as 'weekly' | 'monthly' | 'quarterly');
//       const successful = results.filter(r => r.success).length;
//       const failed = results.filter(r => !r.success).length;
      
//       if (successful > 0) {
//         console.log(`Generated ${successful} reports successfully`);
//         setMessage(`Successfully generated ${successful} ${reportType} reports${failed > 0 ? `, ${failed} failed` : ''}`);
//         queryClient.invalidateQueries({ queryKey: ["/api/user/reports"] });
//         setDuplicateWarnings([]);
//       } else {
//         setMessage("Failed to generate any reports");
//       }
//     } catch (error) {
//       console.error("Bulk report generation failed:", error);
//       setMessage("Bulk report generation failed");
//     } finally {
//       setIsBulkGenerating(false);
//     }
    
//     // Clear message after 5 seconds
//     setTimeout(() => setMessage(""), 5000);
//   };

//   // Check if generate button should be disabled
//   const isAnyGenerationInProgress = generateReportMutation.isPending || isBulkGenerating;
//   const isGenerateDisabled = isAnyGenerationInProgress || 
//                            !websites?.length || 
//                            reportType === "all" || 
//                            reportType === "";

//   return (
//     <div className="py-6">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
//         {/* Page Header */}
//         <div className="md:flex md:items-center md:justify-between mb-8">
//           <div className="flex-1 min-w-0">
//             <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
//               Client Reports
//             </h2>
//             <p className="mt-1 text-sm text-gray-500">
//               Comprehensive SEO and content performance reports for your websites
//             </p>
//           </div>
//           <div className="mt-4 flex gap-2 md:mt-0 md:ml-4">
//             <Button 
//               variant="outline" 
//               onClick={() => refetch()}
//               disabled={isLoading}
//             >
//               <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
//               Refresh
//             </Button>
//             <Button 
//               onClick={handleBulkGenerate}
//               disabled={isGenerateDisabled}
//               className="bg-primary-500 hover:bg-primary-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
//               title={reportType === "all" ? "Please select a report type first" : "Generate reports"}
//             >
//               {isAnyGenerationInProgress ? (
//                 <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
//               ) : (
//                 <Plus className="w-4 h-4 mr-2" />
//               )}
//               {isAnyGenerationInProgress 
//                 ? "Generating..." 
//                 : reportType === "all" 
//                 ? "Select Report Type" 
//                 : "Generate Reports"
//               }
//             </Button>
//           </div>
//         </div>

//         {/* Status Message */}
//         {message && (
//           <div className={`mb-4 p-3 rounded-md ${
//             message.includes('Error') || message.includes('Failed') 
//               ? 'bg-red-50 text-red-800 border border-red-200' 
//               : message.includes('Warning')
//               ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
//               : 'bg-green-50 text-green-800 border border-green-200'
//           }`}>
//             {message}
//           </div>
//         )}

//         {/* Duplicate Warnings */}
//         {duplicateWarnings.length > 0 && (
//           <Alert className="mb-4 border-yellow-200 bg-yellow-50">
//             <AlertTriangle className="h-4 w-4 text-yellow-600" />
//             <AlertDescription className="text-yellow-800">
//               <strong>Duplicate Reports Warning:</strong> The following websites already have {reportType} reports for this period:
//               <ul className="mt-2 list-disc list-inside">
//                 {duplicateWarnings.map((website, index) => (
//                   <li key={index}>{website}</li>
//                 ))}
//               </ul>
//               Generating new reports will replace the existing ones.
//             </AlertDescription>
//           </Alert>
//         )}

//         {/* Filters */}
//         <div className="flex flex-col sm:flex-row gap-4 mb-8">
//           <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
//             <SelectTrigger className="w-64">
//               <SelectValue placeholder="All websites" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="all">All websites</SelectItem>
//               {websites?.map((website) => (
//                 <SelectItem key={website.id} value={website.id}>
//                   {website.name}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>

//           <Select value={reportType} onValueChange={setReportType}>
//             <SelectTrigger className="w-48">
//               <SelectValue placeholder="Select report type" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="all">All report types</SelectItem>
//               <SelectItem value="weekly">Weekly reports</SelectItem>
//               <SelectItem value="monthly">Monthly reports</SelectItem>
//               <SelectItem value="quarterly">Quarterly reports</SelectItem>
//             </SelectContent>
//           </Select>
//         </div>

//         {/* Reports Overview */}
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
//           <Card>
//             <CardHeader className="pb-2">
//               <CardTitle className="text-sm font-medium text-gray-600">Total Reports</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold text-gray-900">{filteredReports.length}</div>
//               <p className="text-xs text-gray-500 mt-1">Generated reports</p>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader className="pb-2">
//               <CardTitle className="text-sm font-medium text-gray-600">Monthly Reports</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold text-blue-600">{monthlyReports}</div>
//               <p className="text-xs text-gray-500 mt-1">Comprehensive analysis</p>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader className="pb-2">
//               <CardTitle className="text-sm font-medium text-gray-600">Weekly Reports</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold text-green-600">{weeklyReports}</div>
//               <p className="text-xs text-gray-500 mt-1">Quick updates</p>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader className="pb-2">
//               <CardTitle className="text-sm font-medium text-gray-600">Avg Performance</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className={`text-2xl font-bold ${getTrendColor(avgPerformance)}`}>
//                 {avgPerformance > 0 ? '+' : ''}{avgPerformance}%
//               </div>
//               <p className="text-xs text-gray-500 mt-1">SEO improvement</p>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Loading State */}
//         {isLoading && (
//           <div className="text-center py-12">
//             <RefreshCw className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
//             <p className="mt-2 text-sm text-gray-500">Loading reports...</p>
//           </div>
//         )}

//         {/* Reports List */}
//         {!isLoading && (
//           <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
//             {filteredReports.map((report) => (
//               <Card key={report.id} className="hover:shadow-md transition-shadow">
//                 <CardHeader>
//                   <div className="flex items-center justify-between">
//                     <CardTitle className="text-lg">{report.websiteName || 'Unknown Website'}</CardTitle>
//                     <Badge variant={report.reportType === "monthly" ? "default" : "secondary"}>
//                       {report.reportType}
//                     </Badge>
//                   </div>
//                   <CardDescription>{report.period}</CardDescription>
//                 </CardHeader>
//                 <CardContent>
//                   <Tabs defaultValue="overview" className="w-full">
//                     <TabsList className="grid w-full grid-cols-2">
//                       <TabsTrigger value="overview">Overview</TabsTrigger>
//                       <TabsTrigger value="details">Details</TabsTrigger>
//                     </TabsList>
                    
//                     <TabsContent value="overview" className="space-y-3 mt-4">
//                       <div className="flex justify-between text-sm">
//                         <span className="text-gray-500">SEO Score Change</span>
//                         <span className={`font-medium flex items-center ${getTrendColor(report.data?.seoScoreChange || 0)}`}>
//                           {getTrendIcon(report.data?.seoScoreChange || 0)}
//                           <span className="ml-1">
//                             {(report.data?.seoScoreChange || 0) > 0 ? '+' : ''}
//                             {report.data?.seoScoreChange || 0}%
//                           </span>
//                         </span>
//                       </div>
                      
//                       <div className="flex justify-between text-sm">
//                         <span className="text-gray-500">Content Published</span>
//                         <span className="font-medium">{report.data?.contentPublished || 0} posts</span>
//                       </div>
                      
//                       <div className="flex justify-between text-sm">
//                         <span className="text-gray-500">Avg SEO Score</span>
//                         <span className="font-medium">{report.data?.avgSeoScore || 0}%</span>
//                       </div>

//                       <div className="flex justify-between text-sm">
//                         <span className="text-gray-500">AI Cost</span>
//                         <span className="font-medium">${(report.data?.totalCostUsd || 0).toFixed(2)}</span>
//                       </div>
//                     </TabsContent>
                    
//                     <TabsContent value="details" className="space-y-3 mt-4">
//                       <div className="flex justify-between text-sm">
//                         <span className="text-gray-500">Analytics Data</span>
//                         <span className="font-medium text-gray-400">Connect Analytics</span>
//                       </div>
                      
//                       <div className="flex justify-between text-sm">
//                         <span className="text-gray-500">Active Days</span>
//                         <span className="font-medium">{report.data?.activeDays || 0}</span>
//                       </div>
                      
//                       <div className="flex justify-between text-sm">
//                         <span className="text-gray-500">Readability Score</span>
//                         <span className="font-medium">{report.data?.avgReadabilityScore || 0}%</span>
//                       </div>
                      
//                       <div className="flex justify-between text-sm">
//                         <span className="text-gray-500">Brand Voice Score</span>
//                         <span className="font-medium">{report.data?.avgBrandVoiceScore || 0}%</span>
//                       </div>

//                       <div className="flex justify-between text-sm">
//                         <span className="text-gray-500">Tokens Used</span>
//                         <span className="font-medium">{(report.data?.totalTokens || 0).toLocaleString()}</span>
//                       </div>

//                       <div className="text-xs text-gray-400 italic mt-2">
//                         * Traffic data requires analytics integration
//                       </div>
//                     </TabsContent>
//                   </Tabs>
                  
//                   {/* Insights */}
//                   {report.insights && report.insights.length > 0 && (
//                     <div className="mt-4 pt-4 border-t">
//                       <h4 className="text-sm font-medium text-gray-900 mb-2">Key Insights</h4>
//                       <div className="space-y-1">
//                         {report.insights.slice(0, 2).map((insight, index) => (
//                           <p key={index} className="text-xs text-gray-600">{insight}</p>
//                         ))}
//                       </div>
//                     </div>
//                   )}
                  
//                   <div className="flex items-center justify-between mt-4 pt-4 border-t">
//                     <span className="text-xs text-gray-500">
//                       Generated {format(new Date(report.generatedAt), "MMM dd, yyyy")}
//                     </span>
//                     <div className="flex gap-2">
//                       <Button 
//                         size="sm" 
//                         variant="outline" 
//                         onClick={() => handleGenerateReport(report.websiteId, report.reportType as any)}
//                         disabled={isAnyGenerationInProgress}
//                       >
//                         {isAnyGenerationInProgress ? (
//                           <RefreshCw className="w-3 h-3 animate-spin" />
//                         ) : (
//                           <>
//                             <RefreshCw className="w-3 h-3 mr-1" />
//                             Regenerate
//                           </>
//                         )}
//                       </Button>
//                       <Button size="sm" variant="outline" className="text-primary-600">
//                         <Download className="w-3 h-3 mr-1" />
//                         PDF
//                       </Button>
//                     </div>
//                   </div>
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         )}

//         {/* Empty State */}
//         {!isLoading && filteredReports.length === 0 && (
//           <Card>
//             <CardContent className="text-center py-12">
//               <FileText className="mx-auto h-12 w-12 text-gray-400" />
//               <h3 className="mt-2 text-sm font-medium text-gray-900">No reports found</h3>
//               <p className="mt-1 text-sm text-gray-500">
//                 {selectedWebsite !== "all" || reportType !== "all"
//                   ? "No reports match your current filters."
//                   : "Reports will appear here once they are generated."
//                 }
//               </p>
//               <div className="mt-6">
//                 <Button 
//                   onClick={handleBulkGenerate}
//                   disabled={isGenerateDisabled}
//                   className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50"
//                 >
//                   {isAnyGenerationInProgress ? (
//                     <>
//                       <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
//                       Generating...
//                     </>
//                   ) : (
//                     <>
//                       <BarChart3 className="w-4 h-4 mr-2" />
//                       {reportType === "all" ? "Select Report Type First" : "Generate Your First Report"}
//                     </>
//                   )}
//                 </Button>
//               </div>
//             </CardContent>
//           </Card>
//         )}

//         {/* Quick Actions */}
//         {websites && websites.length > 0 && (
//           <Card className="mt-8">
//             <CardHeader>
//               <CardTitle>Quick Report Generation</CardTitle>
//               <CardDescription>
//                 Generate reports for individual websites
//               </CardDescription>
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-4">
//                 {websites.map((website) => (
//                   <div key={website.id} className="flex items-center justify-between p-4 border rounded-lg">
//                     <div>
//                       <h4 className="font-medium text-gray-900">{website.name}</h4>
//                       <p className="text-sm text-gray-500">{website.url}</p>
//                     </div>
//                     <div className="flex items-center space-x-2">
//                       <Button 
//                         size="sm" 
//                         variant="outline"
//                         onClick={() => handleGenerateReport(website.id, 'weekly')}
//                         disabled={isAnyGenerationInProgress}
//                         title={isAnyGenerationInProgress ? "Generation in progress..." : "Generate weekly report"}
//                       >
//                         {isAnyGenerationInProgress ? (
//                           <RefreshCw className="w-3 h-3 animate-spin" />
//                         ) : (
//                           "Weekly"
//                         )}
//                       </Button>
//                       <Button 
//                         size="sm" 
//                         variant="outline"
//                         onClick={() => handleGenerateReport(website.id, 'monthly')}
//                         disabled={isAnyGenerationInProgress}
//                         title={isAnyGenerationInProgress ? "Generation in progress..." : "Generate monthly report"}
//                       >
//                         {isAnyGenerationInProgress ? (
//                           <RefreshCw className="w-3 h-3 animate-spin" />
//                         ) : (
//                           "Monthly"
//                         )}
//                       </Button>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </CardContent>
//           </Card>
//         )}
//       </div>
//     </div>
//   );
// }






// import { useState } from "react";
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { Download, TrendingUp, TrendingDown, Calendar, FileText, BarChart3, Minus, RefreshCw, Plus, AlertTriangle } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Alert, AlertDescription } from "@/components/ui/alert";
// import { api } from "@/lib/api";
// import { format } from "date-fns";

// const getTrendIcon = (change: number) => {
//   if (change > 0) return <TrendingUp className="w-3 h-3" />;
//   if (change < 0) return <TrendingDown className="w-3 h-3" />;
//   return <Minus className="w-3 h-3" />;
// };

// const getTrendColor = (change: number) => {
//   if (change > 0) return "text-green-600";
//   if (change < 0) return "text-red-600";
//   return "text-gray-600";
// };

// const formatNumber = (num: number) => {
//   if (num >= 1000) {
//     return (num / 1000).toFixed(1) + "k";
//   }
//   return num.toString();
// };

// // Helper function to check if a report already exists for this period
// const checkForExistingReport = (
//   reports: any[], 
//   websiteId: string, 
//   reportType: string, 
//   targetPeriod: string
// ): boolean => {
//   return reports.some(report => 
//     report.websiteId === websiteId && 
//     report.reportType === reportType && 
//     report.period === targetPeriod
//   );
// };

// // Helper function to generate period string
// const generatePeriodString = (reportType: string): string => {
//   const now = new Date();
  
//   if (reportType === 'weekly') {
//     const weekNumber = Math.ceil(now.getDate() / 7);
//     return `Week ${weekNumber}, ${now.getFullYear()}`;
//   } else if (reportType === 'monthly') {
//     return `${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
//   } else { // quarterly
//     const quarter = Math.floor(now.getMonth() / 3) + 1;
//     return `Q${quarter} ${now.getFullYear()}`;
//   }
// };

// export default function Reports() {
//   const [selectedWebsite, setSelectedWebsite] = useState<string>("all");
//   const [reportType, setReportType] = useState<string>("all");
//   const [message, setMessage] = useState<string>("");
//   const [duplicateWarnings, setDuplicateWarnings] = useState<string[]>([]);
//   const [isBulkGenerating, setIsBulkGenerating] = useState<boolean>(false);
//   const queryClient = useQueryClient();

//   // Fetch websites
//   const { data: websites } = useQuery({
//     queryKey: ["/api/user/websites"],
//     queryFn: api.getWebsites,
//   });

//   // Fetch all reports
//   const { data: allReports = [], isLoading, refetch } = useQuery({
//     queryKey: ["/api/user/reports"],
//     queryFn: () => api.getClientReports(),
//     staleTime: 5 * 60 * 1000, // 5 minutes
//   });

//   // Generate report mutation
//   const generateReportMutation = useMutation({
//     mutationFn: ({ websiteId, reportType }: { websiteId: string; reportType: 'weekly' | 'monthly' | 'quarterly' }) =>
//       api.generateClientReport(websiteId, { reportType }),
//     onSuccess: (data) => {
//       console.log(`Report generated for ${data.websiteName}`);
//       setMessage(`Successfully generated ${data.reportType} report for ${data.websiteName}`);
//       queryClient.invalidateQueries({ queryKey: ["/api/user/reports"] });
//       setDuplicateWarnings([]); // Clear warnings on success
//       // Clear message after 5 seconds
//       setTimeout(() => setMessage(""), 5000);
//     },
//     onError: (error: Error) => {
//       console.error(`Failed to generate report: ${error.message}`);
//       setMessage(`Error: Failed to generate report - ${error.message}`);
//       // Clear message after 5 seconds
//       setTimeout(() => setMessage(""), 5000);
//     },
//   });

//   // Filter reports based on selections
//   const filteredReports = allReports.filter(report => {
//     if (selectedWebsite !== "all" && report.websiteId !== selectedWebsite) return false;
//     if (reportType !== "all" && report.reportType !== reportType) return false;
//     return true;
//   });

//   // Calculate overview stats
//   const monthlyReports = filteredReports.filter(r => r.reportType === "monthly").length;
//   const weeklyReports = filteredReports.filter(r => r.reportType === "weekly").length;
//   const avgPerformance = filteredReports.length > 0 ? 
//     Math.round(filteredReports.reduce((sum, r) => sum + (r.data?.seoScoreChange || 0), 0) / filteredReports.length) : 0;

  
//   // PDF download handler
//   const handleDownloadPDF = async (report: any) => {
//     // Dynamic import to avoid SSR issues
//     const { default: jsPDF } = await import("jspdf");
//     const autoTable = (await import("jspdf-autotable")).default;

//     const doc = new jsPDF();

//     const title = `${report.websiteName || "Website"} — ${(report.reportType || "")
//       .toString()
//       .toUpperCase()} Report`;
//     doc.setFontSize(16);
//     doc.text(title, 14, 18);

//     doc.setFontSize(11);
//     const period = report.period || "—";
//     const genDate = report.generatedAt ? format(new Date(report.generatedAt), "MMM dd, yyyy") : format(new Date(), "MMM dd, yyyy");
//     doc.text(`Period: ${period}`, 14, 26);
//     doc.text(`Generated: ${genDate}`, 14, 33);

//     autoTable(doc, {
//       startY: 40,
//       head: [["Metric", "Value"]],
//       body: [
//         ["SEO Score Change", `${report.data?.seoScoreChange ?? 0}%`],
//         ["Content Published", `${report.data?.contentPublished ?? 0} posts`],
//         ["Avg SEO Score", `${report.data?.avgSeoScore ?? 0}%`],
//         ["AI Cost", `$${(report.data?.totalCostUsd ?? 0).toFixed ? (report.data.totalCostUsd).toFixed(2) : Number(report.data?.totalCostUsd ?? 0).toFixed(2)}`],
//         ["Active Days", `${report.data?.activeDays ?? 0}`],
//         ["Readability Score", `${report.data?.avgReadabilityScore ?? 0}%`],
//         ["Brand Voice Score", `${report.data?.avgBrandVoiceScore ?? 0}%`],
//         ["Tokens Used", `${(report.data?.totalTokens ?? 0).toLocaleString?.() || report.data?.totalTokens || 0}`],
//       ],
//       styles: { fontSize: 10 },
//       theme: "striped",
//     });

//     const y = (doc as any).lastAutoTable?.finalY || 40;
//     if (Array.isArray(report.insights) && report.insights.length) {
//       doc.setFontSize(12);
//       doc.text("Key Insights", 14, y + 10);
//       doc.setFontSize(10);
//       const bullets = report.insights.map((i: string) => `• ${i}`).join("\n");
//       const wrapped = doc.splitTextToSize(bullets, 180);
//       doc.text(wrapped, 14, y + 16);
//     }

//     const safeName = `${(report.websiteName || "website")
//       .toLowerCase()
//       .replace(/[^a-z0-9]+/g, "-")}-${report.reportType}-${(report.period || "")
//       .toString()
//       .replace(/[^a-z0-9]+/gi, "-")}`;

//     doc.save(`${safeName}.pdf`);
//   };
// const handleGenerateReport = (websiteId: string, type: 'weekly' | 'monthly' | 'quarterly') => {
//     console.log(`Generating ${type} report for website: ${websiteId}`);
    
//     // Check for existing reports
//     const targetPeriod = generatePeriodString(type);
//     const existingReport = checkForExistingReport(allReports, websiteId, type, targetPeriod);
    
//     if (existingReport) {
//       const website = websites?.find(w => w.id === websiteId);
//       setMessage(`Warning: A ${type} report for ${targetPeriod} already exists for ${website?.name || 'this website'}. Generating new report will replace the existing one.`);
//     } else {
//       setMessage(`Generating ${type} report...`);
//     }
    
//     generateReportMutation.mutate({ websiteId, reportType: type });
//   };

//   const handleBulkGenerate = async () => {
//     console.log("Bulk generate button clicked");
    
//     if (!websites || websites.length === 0) {
//       setMessage("No websites available for report generation");
//       return;
//     }

//     if (reportType === "all") {
//       setMessage("Please select a specific report type before generating reports");
//       return;
//     }

//     setIsBulkGenerating(true);

//     const websiteIds = selectedWebsite === "all" ? 
//       websites.map(w => w.id) : 
//       [selectedWebsite];

//     // Check for duplicates before generating
//     const targetPeriod = generatePeriodString(reportType as 'weekly' | 'monthly' | 'quarterly');
//     const duplicates: string[] = [];
    
//     websiteIds.forEach(websiteId => {
//       const website = websites.find(w => w.id === websiteId);
//       if (checkForExistingReport(allReports, websiteId, reportType, targetPeriod)) {
//         duplicates.push(website?.name || 'Unknown website');
//       }
//     });

//     if (duplicates.length > 0) {
//       setDuplicateWarnings(duplicates);
//       setMessage(`Warning: ${duplicates.length} website(s) already have ${reportType} reports for ${targetPeriod}. Continue to replace existing reports.`);
//     } else {
//       setDuplicateWarnings([]);
//     }

//     setMessage(`Generating ${reportType} reports for ${websiteIds.length} website(s)...`);

//     try {
//       const results = await api.generateBulkReports(websiteIds, reportType as 'weekly' | 'monthly' | 'quarterly');
//       const successful = results.filter(r => r.success).length;
//       const failed = results.filter(r => !r.success).length;
      
//       if (successful > 0) {
//         console.log(`Generated ${successful} reports successfully`);
//         setMessage(`Successfully generated ${successful} ${reportType} reports${failed > 0 ? `, ${failed} failed` : ''}`);
//         queryClient.invalidateQueries({ queryKey: ["/api/user/reports"] });
//         setDuplicateWarnings([]);
//       } else {
//         setMessage("Failed to generate any reports");
//       }
//     } catch (error) {
//       console.error("Bulk report generation failed:", error);
//       setMessage("Bulk report generation failed");
//     } finally {
//       setIsBulkGenerating(false);
//     }
    
//     // Clear message after 5 seconds
//     setTimeout(() => setMessage(""), 5000);
//   };

//   // Check if generate button should be disabled
//   const isAnyGenerationInProgress = generateReportMutation.isPending || isBulkGenerating;
//   const isGenerateDisabled = isAnyGenerationInProgress || 
//                            !websites?.length || 
//                            reportType === "all" || 
//                            reportType === "";

//   return (
//     <div className="py-6">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
//         {/* Page Header */}
//         <div className="md:flex md:items-center md:justify-between mb-8">
//           <div className="flex-1 min-w-0">
//             <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
//               Client Reports
//             </h2>
//             <p className="mt-1 text-sm text-gray-500">
//               Comprehensive SEO and content performance reports for your websites
//             </p>
//           </div>
//           <div className="mt-4 flex gap-2 md:mt-0 md:ml-4">
//             <Button 
//               variant="outline" 
//               onClick={() => refetch()}
//               disabled={isLoading}
//             >
//               <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
//               Refresh
//             </Button>
//             <Button 
//               onClick={handleBulkGenerate}
//               disabled={isGenerateDisabled}
//               className="bg-primary-500 hover:bg-primary-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
//               title={reportType === "all" ? "Please select a report type first" : "Generate reports"}
//             >
//               {isAnyGenerationInProgress ? (
//                 <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
//               ) : (
//                 <Plus className="w-4 h-4 mr-2" />
//               )}
//               {isAnyGenerationInProgress 
//                 ? "Generating..." 
//                 : reportType === "all" 
//                 ? "Select Report Type" 
//                 : "Generate Reports"
//               }
//             </Button>
//           </div>
//         </div>

//         {/* Status Message */}
//         {message && (
//           <div className={`mb-4 p-3 rounded-md ${
//             message.includes('Error') || message.includes('Failed') 
//               ? 'bg-red-50 text-red-800 border border-red-200' 
//               : message.includes('Warning')
//               ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
//               : 'bg-green-50 text-green-800 border border-green-200'
//           }`}>
//             {message}
//           </div>
//         )}

//         {/* Duplicate Warnings */}
//         {duplicateWarnings.length > 0 && (
//           <Alert className="mb-4 border-yellow-200 bg-yellow-50">
//             <AlertTriangle className="h-4 w-4 text-yellow-600" />
//             <AlertDescription className="text-yellow-800">
//               <strong>Duplicate Reports Warning:</strong> The following websites already have {reportType} reports for this period:
//               <ul className="mt-2 list-disc list-inside">
//                 {duplicateWarnings.map((website, index) => (
//                   <li key={index}>{website}</li>
//                 ))}
//               </ul>
//               Generating new reports will replace the existing ones.
//             </AlertDescription>
//           </Alert>
//         )}

//         {/* Filters */}
//         <div className="flex flex-col sm:flex-row gap-4 mb-8">
//           <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
//             <SelectTrigger className="w-64">
//               <SelectValue placeholder="All websites" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="all">All websites</SelectItem>
//               {websites?.map((website) => (
//                 <SelectItem key={website.id} value={website.id}>
//                   {website.name}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>

//           <Select value={reportType} onValueChange={setReportType}>
//             <SelectTrigger className="w-48">
//               <SelectValue placeholder="Select report type" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="all">All report types</SelectItem>
//               <SelectItem value="weekly">Weekly reports</SelectItem>
//               <SelectItem value="monthly">Monthly reports</SelectItem>
//               <SelectItem value="quarterly">Quarterly reports</SelectItem>
//             </SelectContent>
//           </Select>
//         </div>

//         {/* Reports Overview */}
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
//           <Card>
//             <CardHeader className="pb-2">
//               <CardTitle className="text-sm font-medium text-gray-600">Total Reports</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold text-gray-900">{filteredReports.length}</div>
//               <p className="text-xs text-gray-500 mt-1">Generated reports</p>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader className="pb-2">
//               <CardTitle className="text-sm font-medium text-gray-600">Monthly Reports</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold text-blue-600">{monthlyReports}</div>
//               <p className="text-xs text-gray-500 mt-1">Comprehensive analysis</p>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader className="pb-2">
//               <CardTitle className="text-sm font-medium text-gray-600">Weekly Reports</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold text-green-600">{weeklyReports}</div>
//               <p className="text-xs text-gray-500 mt-1">Quick updates</p>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader className="pb-2">
//               <CardTitle className="text-sm font-medium text-gray-600">Avg Performance</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className={`text-2xl font-bold ${getTrendColor(avgPerformance)}`}>
//                 {avgPerformance > 0 ? '+' : ''}{avgPerformance}%
//               </div>
//               <p className="text-xs text-gray-500 mt-1">SEO improvement</p>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Loading State */}
//         {isLoading && (
//           <div className="text-center py-12">
//             <RefreshCw className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
//             <p className="mt-2 text-sm text-gray-500">Loading reports...</p>
//           </div>
//         )}

//         {/* Reports List */}
//         {!isLoading && (
//           <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
//             {filteredReports.map((report) => (
//               <Card key={report.id} className="hover:shadow-md transition-shadow">
//                 <CardHeader>
//                   <div className="flex items-center justify-between">
//                     <CardTitle className="text-lg">{report.websiteName || 'Unknown Website'}</CardTitle>
//                     <Badge variant={report.reportType === "monthly" ? "default" : "secondary"}>
//                       {report.reportType}
//                     </Badge>
//                   </div>
//                   <CardDescription>{report.period}</CardDescription>
//                 </CardHeader>
//                 <CardContent>
//                   <Tabs defaultValue="overview" className="w-full">
//                     <TabsList className="grid w-full grid-cols-2">
//                       <TabsTrigger value="overview">Overview</TabsTrigger>
//                       <TabsTrigger value="details">Details</TabsTrigger>
//                     </TabsList>
                    
//                     <TabsContent value="overview" className="space-y-3 mt-4">
//                       <div className="flex justify-between text-sm">
//                         <span className="text-gray-500">SEO Score Change</span>
//                         <span className={`font-medium flex items-center ${getTrendColor(report.data?.seoScoreChange || 0)}`}>
//                           {getTrendIcon(report.data?.seoScoreChange || 0)}
//                           <span className="ml-1">
//                             {(report.data?.seoScoreChange || 0) > 0 ? '+' : ''}
//                             {report.data?.seoScoreChange || 0}%
//                           </span>
//                         </span>
//                       </div>
                      
//                       <div className="flex justify-between text-sm">
//                         <span className="text-gray-500">Content Published</span>
//                         <span className="font-medium">{report.data?.contentPublished || 0} posts</span>
//                       </div>
                      
//                       <div className="flex justify-between text-sm">
//                         <span className="text-gray-500">Avg SEO Score</span>
//                         <span className="font-medium">{report.data?.avgSeoScore || 0}%</span>
//                       </div>

//                       <div className="flex justify-between text-sm">
//                         <span className="text-gray-500">AI Cost</span>
//                         <span className="font-medium">${(report.data?.totalCostUsd || 0).toFixed(2)}</span>
//                       </div>
//                     </TabsContent>
                    
//                     <TabsContent value="details" className="space-y-3 mt-4">
//                       <div className="flex justify-between text-sm">
//                         <span className="text-gray-500">Analytics Data</span>
//                         <span className="font-medium text-gray-400">Connect Analytics</span>
//                       </div>
                      
//                       <div className="flex justify-between text-sm">
//                         <span className="text-gray-500">Active Days</span>
//                         <span className="font-medium">{report.data?.activeDays || 0}</span>
//                       </div>
                      
//                       <div className="flex justify-between text-sm">
//                         <span className="text-gray-500">Readability Score</span>
//                         <span className="font-medium">{report.data?.avgReadabilityScore || 0}%</span>
//                       </div>
                      
//                       <div className="flex justify-between text-sm">
//                         <span className="text-gray-500">Brand Voice Score</span>
//                         <span className="font-medium">{report.data?.avgBrandVoiceScore || 0}%</span>
//                       </div>

//                       <div className="flex justify-between text-sm">
//                         <span className="text-gray-500">Tokens Used</span>
//                         <span className="font-medium">{(report.data?.totalTokens || 0).toLocaleString()}</span>
//                       </div>

//                       <div className="text-xs text-gray-400 italic mt-2">
//                         * Traffic data requires analytics integration
//                       </div>
//                     </TabsContent>
//                   </Tabs>
                  
//                   {/* Insights */}
//                   {report.insights && report.insights.length > 0 && (
//                     <div className="mt-4 pt-4 border-t">
//                       <h4 className="text-sm font-medium text-gray-900 mb-2">Key Insights</h4>
//                       <div className="space-y-1">
//                         {report.insights.slice(0, 2).map((insight, index) => (
//                           <p key={index} className="text-xs text-gray-600">{insight}</p>
//                         ))}
//                       </div>
//                     </div>
//                   )}
                  
//                   <div className="flex items-center justify-between mt-4 pt-4 border-t">
//                     <span className="text-xs text-gray-500">
//                       Generated {format(new Date(report.generatedAt), "MMM dd, yyyy")}
//                     </span>
//                     <div className="flex gap-2">
//                       <Button 
//                         size="sm" 
//                         variant="outline" 
//                         onClick={() => handleGenerateReport(report.websiteId, report.reportType as any)}
//                         disabled={isAnyGenerationInProgress}
//                       >
//                         {isAnyGenerationInProgress ? (
//                           <RefreshCw className="w-3 h-3 animate-spin" />
//                         ) : (
//                           <>
//                             <RefreshCw className="w-3 h-3 mr-1" />
//                             Regenerate
//                           </>
//                         )}
//                       </Button>
//                       <Button size="sm" variant="outline" className="text-primary-600" onClick={() => handleDownloadPDF(report)}>
//                         <Download className="w-3 h-3 mr-1" />
//                         PDF
//                       </Button>
//                     </div>
//                   </div>
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         )}

//         {/* Empty State */}
//         {!isLoading && filteredReports.length === 0 && (
//           <Card>
//             <CardContent className="text-center py-12">
//               <FileText className="mx-auto h-12 w-12 text-gray-400" />
//               <h3 className="mt-2 text-sm font-medium text-gray-900">No reports found</h3>
//               <p className="mt-1 text-sm text-gray-500">
//                 {selectedWebsite !== "all" || reportType !== "all"
//                   ? "No reports match your current filters."
//                   : "Reports will appear here once they are generated."
//                 }
//               </p>
//               <div className="mt-6">
//                 <Button 
//                   onClick={handleBulkGenerate}
//                   disabled={isGenerateDisabled}
//                   className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50"
//                 >
//                   {isAnyGenerationInProgress ? (
//                     <>
//                       <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
//                       Generating...
//                     </>
//                   ) : (
//                     <>
//                       <BarChart3 className="w-4 h-4 mr-2" />
//                       {reportType === "all" ? "Select Report Type First" : "Generate Your First Report"}
//                     </>
//                   )}
//                 </Button>
//               </div>
//             </CardContent>
//           </Card>
//         )}

//         {/* Quick Actions */}
//         {websites && websites.length > 0 && (
//           <Card className="mt-8">
//             <CardHeader>
//               <CardTitle>Quick Report Generation</CardTitle>
//               <CardDescription>
//                 Generate reports for individual websites
//               </CardDescription>
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-4">
//                 {websites.map((website) => (
//                   <div key={website.id} className="flex items-center justify-between p-4 border rounded-lg">
//                     <div>
//                       <h4 className="font-medium text-gray-900">{website.name}</h4>
//                       <p className="text-sm text-gray-500">{website.url}</p>
//                     </div>
//                     <div className="flex items-center space-x-2">
//                       <Button 
//                         size="sm" 
//                         variant="outline"
//                         onClick={() => handleGenerateReport(website.id, 'weekly')}
//                         disabled={isAnyGenerationInProgress}
//                         title={isAnyGenerationInProgress ? "Generation in progress..." : "Generate weekly report"}
//                       >
//                         {isAnyGenerationInProgress ? (
//                           <RefreshCw className="w-3 h-3 animate-spin" />
//                         ) : (
//                           "Weekly"
//                         )}
//                       </Button>
//                       <Button 
//                         size="sm" 
//                         variant="outline"
//                         onClick={() => handleGenerateReport(website.id, 'monthly')}
//                         disabled={isAnyGenerationInProgress}
//                         title={isAnyGenerationInProgress ? "Generation in progress..." : "Generate monthly report"}
//                       >
//                         {isAnyGenerationInProgress ? (
//                           <RefreshCw className="w-3 h-3 animate-spin" />
//                         ) : (
//                           "Monthly"
//                         )}
//                       </Button>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </CardContent>
//           </Card>
//         )}
//       </div>
//     </div>
//   );
// }





//Revised code: nasa taas yung dati
// client/src/pages/reports.tsx
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  TrendingUp,
  TrendingDown,
  Calendar,
  FileText,
  BarChart3,
  Minus,
  RefreshCw,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { format } from "date-fns";

/* ─────────────────────────────────────────────────────────────────────────────
 * Dedupe helpers (client-side safety net)
 *  - Key prefers report.id; else (websiteId|reportType|period)
 *  - Keeps the newest by generatedAt when duplicates appear
 * ────────────────────────────────────────────────────────────────────────────*/
type AnyReport = {
  id?: string | number;
  websiteId?: string;
  websiteName?: string;
  reportType?: "weekly" | "monthly" | "quarterly" | string;
  period?: string;
  generatedAt?: string | number | Date;
  data?: Record<string, any>;
  insights?: string[];
  [k: string]: any;
};

const reportKey = (r: AnyReport) =>
  (r.id ?? undefined)?.toString() ||
  [r.websiteId ?? "", r.reportType ?? "", r.period ?? ""].join("|");

const dedupeReports = (arr: AnyReport[]) => {
  const map = new Map<string, AnyReport>();
  for (const r of arr || []) {
    const key = reportKey(r);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, r);
    } else {
      const a = new Date(existing.generatedAt ?? 0).getTime();
      const b = new Date(r.generatedAt ?? 0).getTime();
      if (b > a) map.set(key, r);
    }
  }
  return Array.from(map.values());
};

/* ─────────────────────────────────────────────────────────────────────────────
 * UI helpers
 * ────────────────────────────────────────────────────────────────────────────*/
const getTrendIcon = (change: number) => {
  if (change > 0) return <TrendingUp className="w-3 h-3" />;
  if (change < 0) return <TrendingDown className="w-3 h-3" />;
  return <Minus className="w-3 h-3" />;
};

const getTrendColor = (change: number) => {
  if (change > 0) return "text-green-600";
  if (change < 0) return "text-red-600";
  return "text-gray-600";
};

const formatNumber = (num: number) => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }
  return num.toString();
};

/* ─────────────────────────────────────────────────────────────────────────────
 * Duplicate detection for target period BEFORE triggering generation
 * ────────────────────────────────────────────────────────────────────────────*/
const checkForExistingReport = (
  reports: AnyReport[],
  websiteId: string,
  reportType: string,
  targetPeriod: string
): AnyReport | null => {
  return reports.find(
    (report) =>
      report.websiteId === websiteId &&
      report.reportType === reportType &&
      report.period === targetPeriod
  ) || null;
};

/* ─────────────────────────────────────────────────────────────────────────────
 * Create a consistent "period" label for a new report
 * (You can replace this logic to match how your backend sets period)
 * ────────────────────────────────────────────────────────────────────────────*/
const generatePeriodString = (reportType: "weekly" | "monthly" | "quarterly"): string => {
  const now = new Date();
  if (reportType === "weekly") {
    // Simple week-of-month; adjust to match your backend if needed
    const weekNumber = Math.ceil(now.getDate() / 7);
    return `Week ${weekNumber}, ${now.getFullYear()}`;
  } else if (reportType === "monthly") {
    return now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } else {
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    return `Q${quarter} ${now.getFullYear()}`;
  }
};

export default function Reports() {
  const [selectedWebsite, setSelectedWebsite] = useState<string>("all");
  const [reportType, setReportType] = useState<string>("all");
  const [message, setMessage] = useState<string>("");
  const [duplicateWarnings, setDuplicateWarnings] = useState<string[]>([]);
  const [isBulkGenerating, setIsBulkGenerating] = useState<boolean>(false);
  const queryClient = useQueryClient();

  // Fetch websites
  const { data: websites } = useQuery({
    queryKey: ["/api/user/websites"],
    queryFn: api.getWebsites,
  });

  // Fetch all reports (we'll dedupe client-side for display & checks)
  const {
    data: fetchedReports = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["/api/user/reports"],
    queryFn: () => api.getClientReports(),
    staleTime: 5 * 60 * 1000,
  });

  // Always work off a deduped snapshot
  const allReports: AnyReport[] = useMemo(() => dedupeReports(fetchedReports), [fetchedReports]);

  // Single mutation that handles both create and update
  const generateReportMutation = useMutation({
    mutationFn: ({ 
      websiteId, 
      reportType, 
      reportId 
    }: { 
      websiteId: string; 
      reportType: "weekly" | "monthly" | "quarterly";
      reportId?: string | number;
    }) => {
      console.log('📤 API Call:', { websiteId, reportType, reportId });
      return api.generateClientReport(websiteId, { reportType, reportId });
    },
    onSuccess: (data, variables) => {
      const action = variables.reportId ? "updated" : "generated";
      console.log(`✅ Successfully ${action} report:`, data);
      setMessage(`Successfully ${action} ${data.reportType} report for ${data.websiteName}`);
      queryClient.invalidateQueries({ queryKey: ["/api/user/reports"] });
      setDuplicateWarnings([]);
      setTimeout(() => setMessage(""), 5000);
    },
    onError: (error: Error) => {
      setMessage(`Error: Failed to generate/update report - ${error.message}`);
      setTimeout(() => setMessage(""), 5000);
    },
  });

  // Filter reports (after dedupe)
  const filteredReports = useMemo(() => {
    return allReports.filter((report) => {
      if (selectedWebsite !== "all" && report.websiteId !== selectedWebsite) return false;
      if (reportType !== "all" && report.reportType !== reportType) return false;
      return true;
    });
  }, [allReports, selectedWebsite, reportType]);

  // Overview stats (based on filtered view)
  const monthlyReports = filteredReports.filter((r) => r.reportType === "monthly").length;
  const weeklyReports = filteredReports.filter((r) => r.reportType === "weekly").length;
  const avgPerformance =
    filteredReports.length > 0
      ? Math.round(
          filteredReports.reduce((sum, r) => sum + (r.data?.seoScoreChange || 0), 0) / filteredReports.length
        )
      : 0;

  /* ───────────────────────────────────────────────────────────────────────────
   * PDF download
   * ──────────────────────────────────────────────────────────────────────────*/
  const handleDownloadPDF = async (report: AnyReport) => {
    const { default: jsPDF } = (await import("jspdf")) as any;
    const autoTable = (await import("jspdf-autotable")).default as any;

    const doc = new jsPDF();

    const title = `${report.websiteName || "Website"} — ${(report.reportType || "").toString().toUpperCase()} Report`;
    doc.setFontSize(16);
    doc.text(title, 14, 18);

    doc.setFontSize(11);
    const period = report.period || "—";
    const genDate = report.generatedAt
      ? format(new Date(report.generatedAt), "MMM dd, yyyy")
      : format(new Date(), "MMM dd, yyyy");
    doc.text(`Period: ${period}`, 14, 26);
    doc.text(`Generated: ${genDate}`, 14, 33);

    autoTable(doc, {
      startY: 40,
      head: [["Metric", "Value"]],
      body: [
        ["SEO Score Change", `${report.data?.seoScoreChange ?? 0}%`],
        ["Content Published", `${report.data?.contentPublished ?? 0} posts`],
        ["Avg SEO Score", `${report.data?.avgSeoScore ?? 0}%`],
        [
          "AI Cost",
          `$${(report.data?.totalCostUsd ?? 0).toFixed
            ? report.data.totalCostUsd.toFixed(2)
            : Number(report.data?.totalCostUsd ?? 0).toFixed(2)}`,
        ],
        ["Active Days", `${report.data?.activeDays ?? 0}`],
        ["Readability Score", `${report.data?.avgReadabilityScore ?? 0}%`],
        ["Brand Voice Score", `${report.data?.avgBrandVoiceScore ?? 0}%`],
        ["Tokens Used", `${(report.data?.totalTokens ?? 0).toLocaleString?.() || report.data?.totalTokens || 0}`],
      ],
      styles: { fontSize: 10 },
      theme: "striped",
    });

    const y = (doc as any).lastAutoTable?.finalY || 40;
    if (Array.isArray(report.insights) && report.insights.length) {
      doc.setFontSize(12);
      doc.text("Key Insights", 14, y + 10);
      doc.setFontSize(10);
      const bullets = report.insights.map((i: string) => `• ${i}`).join("\n");
      const wrapped = doc.splitTextToSize(bullets, 180);
      doc.text(wrapped, 14, y + 16);
    }

    const safeName = `${(report.websiteName || "website").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${
      report.reportType
    }-${(report.period || "").toString().replace(/[^a-z0-9]+/gi, "-")}`;
    doc.save(`${safeName}.pdf`);
  };

  /* ───────────────────────────────────────────────────────────────────────────
   * Generate or Update Report
   *  - If reportId is provided, it updates the existing report
   *  - Otherwise, it checks for duplicates and creates a new report
   * ──────────────────────────────────────────────────────────────────────────*/
  const handleGenerateReport = (
    websiteId: string,
    type: "weekly" | "monthly" | "quarterly",
    reportId?: string | number
  ) => {
    console.log('🎯 handleGenerateReport called with:', { websiteId, type, reportId });
    
    if (!websiteId || !type) {
      console.error('❌ Missing required parameters:', { websiteId, type });
      setMessage('Error: Missing required parameters');
      return;
    }
    
    if (reportId) {
      // Update existing report
      console.log('🔄 REGENERATING report with ID:', reportId);
      setMessage(`Updating ${type} report...`);
      generateReportMutation.mutate({ websiteId, reportType: type, reportId });
    } else {
      console.log('➕ CREATING NEW report (no ID provided)');
      // Check for duplicates before creating new report
      const targetPeriod = generatePeriodString(type);
      const existingReport = checkForExistingReport(allReports, websiteId, type, targetPeriod);

      if (existingReport) {
        const website = websites?.find((w: any) => w.id === websiteId);
        setMessage(
          `Duplicate prevented: A ${type} report for ${targetPeriod} already exists for ${website?.name || "this website"}.`
        );
        setTimeout(() => setMessage(""), 5000);
        return; // ⛔️ do not generate
      }

      setMessage(`Generating ${type} report...`);
      generateReportMutation.mutate({ websiteId, reportType: type });
    }
  };

  /* ───────────────────────────────────────────────────────────────────────────
   * Bulk generate with duplicate guard
   *  - Skips websites that already have a report for the target period
   *  - Only calls the API for the remainder
   * ──────────────────────────────────────────────────────────────────────────*/
  const handleBulkGenerate = async () => {
    if (!websites || websites.length === 0) {
      setMessage("No websites available for report generation");
      return;
    }
    if (reportType === "all") {
      setMessage("Please select a specific report type before generating reports");
      return;
    }

    setIsBulkGenerating(true);

    const type = reportType as "weekly" | "monthly" | "quarterly";
    const websiteIds: string[] = selectedWebsite === "all" ? websites.map((w: any) => w.id) : [selectedWebsite];

    const targetPeriod = generatePeriodString(type);
    const duplicates: string[] = [];
    const toGenerate: string[] = [];

    websiteIds.forEach((websiteId) => {
      const website = websites.find((w: any) => w.id === websiteId);
      if (checkForExistingReport(allReports, websiteId, type, targetPeriod)) {
        duplicates.push(website?.name || "Unknown website");
      } else {
        toGenerate.push(websiteId);
      }
    });

    if (duplicates.length > 0) {
      setDuplicateWarnings(duplicates);
    } else {
      setDuplicateWarnings([]);
    }

    if (toGenerate.length === 0) {
      setMessage(
        `Duplicate prevented: All selected websites already have ${type} reports for ${targetPeriod}. Nothing to generate.`
      );
      setIsBulkGenerating(false);
      setTimeout(() => setMessage(""), 5000);
      return; // ⛔️ no API call
    }

    setMessage(
      `Generating ${type} reports for ${toGenerate.length} website(s)…` +
        (duplicates.length ? ` Skipped ${duplicates.length} duplicate(s).` : "")
    );

    try {
      const results = await api.generateBulkReports(toGenerate, type);
      const successful = results.filter((r: any) => r.success).length;
      const failed = results.filter((r: any) => !r.success).length;

      if (successful > 0) {
        setMessage(
          `Successfully generated ${successful} ${type} report(s)` +
            (failed > 0 ? `, ${failed} failed.` : ".") +
            (duplicates.length ? ` Skipped ${duplicates.length} duplicate(s).` : "")
        );
        queryClient.invalidateQueries({ queryKey: ["/api/user/reports"] });
        setDuplicateWarnings(duplicates);
      } else {
        setMessage("Failed to generate any reports");
      }
    } catch (error) {
      console.error("Bulk report generation failed:", error);
      setMessage("Bulk report generation failed");
    } finally {
      setIsBulkGenerating(false);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  // Disable rules
  const isAnyGenerationInProgress = generateReportMutation.isPending || isBulkGenerating;
  const isGenerateDisabled = isAnyGenerationInProgress || !websites?.length || reportType === "all" || reportType === "";

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Page Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">Client Reports</h2>
            <p className="mt-1 text-sm text-gray-500">
              Comprehensive SEO and content performance reports for your websites
            </p>
          </div>
          <div className="mt-4 flex gap-2 md:mt-0 md:ml-4">
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={handleBulkGenerate}
              disabled={isGenerateDisabled}
              className="bg-primary-500 hover:bg-primary-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              title={reportType === "all" ? "Please select a report type first" : "Generate reports"}
            >
              {isAnyGenerationInProgress ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {isAnyGenerationInProgress
                ? "Generating..."
                : reportType === "all"
                ? "Select Report Type"
                : "Generate Reports"}
            </Button>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`mb-4 p-3 rounded-md ${
              message.includes("Error") || message.includes("Failed")
                ? "bg-red-50 text-red-800 border border-red-200"
                : message.includes("Duplicate")
                ? "bg-yellow-50 text-yellow-800 border border-yellow-200"
                : "bg-green-50 text-green-800 border border-green-200"
            }`}
          >
            {message}
          </div>
        )}

        {/* Duplicate Warnings */}
        {duplicateWarnings.length > 0 && (
          <Alert className="mb-4 border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Duplicate Reports Skipped:</strong> These websites already have reports for the selected period:
              <ul className="mt-2 list-disc list-inside">
                {duplicateWarnings.map((website, index) => (
                  <li key={index}>{website}</li>
                ))}
              </ul>
              To update an existing report, use the Regenerate button on that card.
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="All websites" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All websites</SelectItem>
              {websites?.map((website: any) => (
                <SelectItem key={website.id} value={website.id}>
                  {website.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select report type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All report types</SelectItem>
              <SelectItem value="weekly">Weekly reports</SelectItem>
              <SelectItem value="monthly">Monthly reports</SelectItem>
              <SelectItem value="quarterly">Quarterly reports</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reports Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{filteredReports.length}</div>
              <p className="text-xs text-gray-500 mt-1">Generated reports</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Monthly Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{monthlyReports}</div>
              <p className="text-xs text-gray-500 mt-1">Comprehensive analysis</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Weekly Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{weeklyReports}</div>
              <p className="text-xs text-gray-500 mt-1">Quick updates</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getTrendColor(avgPerformance)}`}>
                {avgPerformance > 0 ? "+" : ""}
                {avgPerformance}%
              </div>
              <p className="text-xs text-gray-500 mt-1">SEO improvement</p>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <RefreshCw className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
            <p className="mt-2 text-sm text-gray-500">Loading reports...</p>
          </div>
        )}

        {/* Reports List */}
        {!isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredReports.map((report: AnyReport) => (
              <Card key={reportKey(report)} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{report.websiteName || "Unknown Website"}</CardTitle>
                    <Badge variant={report.reportType === "monthly" ? "default" : "secondary"}>
                      {report.reportType}
                    </Badge>
                  </div>
                  <CardDescription>{report.period}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="details">Details</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-3 mt-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">SEO Score Change</span>
                        <span className={`font-medium flex items-center ${getTrendColor(report.data?.seoScoreChange || 0)}`}>
                          {getTrendIcon(report.data?.seoScoreChange || 0)}
                          <span className="ml-1">
                            {(report.data?.seoScoreChange || 0) > 0 ? "+" : ""}
                            {report.data?.seoScoreChange || 0}%
                          </span>
                        </span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Content Published</span>
                        <span className="font-medium">{report.data?.contentPublished || 0} posts</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Avg SEO Score</span>
                        <span className="font-medium">{report.data?.avgSeoScore || 0}%</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">AI Cost</span>
                        <span className="font-medium">
                          $
                          {(
                            (report.data?.totalCostUsd ?? 0 as any).toFixed
                              ? (report.data?.totalCostUsd as any).toFixed(2)
                              : Number(report.data?.totalCostUsd ?? 0).toFixed(2)
                          ).toString()}
                        </span>
                      </div>
                    </TabsContent>

                    <TabsContent value="details" className="space-y-3 mt-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Analytics Data</span>
                        <span className="font-medium text-gray-400">Connect Analytics</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Active Days</span>
                        <span className="font-medium">{report.data?.activeDays || 0}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Readability Score</span>
                        <span className="font-medium">{report.data?.avgReadabilityScore || 0}%</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Brand Voice Score</span>
                        <span className="font-medium">{report.data?.avgBrandVoiceScore || 0}%</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Tokens Used</span>
                        <span className="font-medium">{(report.data?.totalTokens || 0).toLocaleString()}</span>
                      </div>

                      <div className="text-xs text-gray-400 italic mt-2">* Traffic data requires analytics integration</div>
                    </TabsContent>
                  </Tabs>

                  {/* Insights */}
                  {report.insights && report.insights.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Key Insights</h4>
                      <div className="space-y-1">
                        {report.insights.slice(0, 2).map((insight: string, index: number) => (
                          <p key={index} className="text-xs text-gray-600">
                            {insight}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <span className="text-xs text-gray-500">
                      Generated {format(new Date(report.generatedAt as any), "MMM dd, yyyy")}
                    </span>
                    <div className="flex gap-2">
                      {/* Regenerate: now passes the report ID to update the existing report */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          console.log('🔄 Regenerate clicked for report:', { 
                            id: report.id, 
                            websiteId: report.websiteId, 
                            type: report.reportType 
                          });
                          
                          // Debug checks
                          console.log('typeof handleGenerateReport:', typeof handleGenerateReport);
                          console.log('report.id:', report.id);
                          console.log('📌 Calling handleGenerateReport NOW...');
                          
                          handleGenerateReport(
                            report.websiteId as string, 
                            report.reportType as any, 
                            report.id
                          );
                        }}
                        disabled={isAnyGenerationInProgress}
                      >
                        {isAnyGenerationInProgress ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Regenerate
                          </>
                        )}
                      </Button>

                      {/* PDF */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-primary-600"
                        onClick={() => handleDownloadPDF(report)}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredReports.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No reports found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {selectedWebsite !== "all" || reportType !== "all"
                  ? "No reports match your current filters."
                  : "Reports will appear here once they are generated."}
              </p>
              <div className="mt-6">
                <Button
                  onClick={handleBulkGenerate}
                  disabled={isGenerateDisabled}
                  className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50"
                >
                  {isAnyGenerationInProgress ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      {reportType === "all" ? "Select Report Type First" : "Generate Your First Report"}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        {websites && websites.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Quick Report Generation</CardTitle>
              <CardDescription>
                Generate reports for individual websites
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {websites.map((website) => (
                  <div key={website.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">{website.name}</h4>
                      <p className="text-sm text-gray-500">{website.url}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleGenerateReport(website.id, 'weekly')}
                        disabled={isAnyGenerationInProgress}
                        title={isAnyGenerationInProgress ? "Generation in progress..." : "Generate weekly report"}
                      >
                        {isAnyGenerationInProgress ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          "Weekly"
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleGenerateReport(website.id, 'monthly')}
                        disabled={isAnyGenerationInProgress}
                        title={isAnyGenerationInProgress ? "Generation in progress..." : "Generate monthly report"}
                      >
                        {isAnyGenerationInProgress ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          "Monthly"
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}