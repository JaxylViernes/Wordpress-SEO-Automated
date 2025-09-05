

import { useState, useEffect } from "react";
import { Bot, Plus, Sparkles, Clock, CheckCircle, Play, Edit, Trash2, X, BarChart3, Target, Zap, Shield, DollarSign, RefreshCw, Save, AlertTriangle, Cpu } from "lucide-react";

// API utility functions
// API utility functions - CORRECTED ENDPOINTS
const api = {
  async getWebsites() {
    const response = await fetch('/api/user/websites'); // Changed from /api/websites
    if (!response.ok) throw new Error('Failed to fetch websites');
    return response.json();
  },

  async getWebsiteContent(websiteId) {
    const response = await fetch(`/api/user/websites/${websiteId}/content`); // Changed from /api/websites/${websiteId}/content
    if (!response.ok) throw new Error('Failed to fetch content');
    return response.json();
  },

  async generateContent(data) {
    const response = await fetch('/api/user/content/generate', { // Changed from /api/content/generate
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate content');
    }
    return response.json();
  },

  async updateContent(contentId, data) {
    const response = await fetch(`/api/user/content/${contentId}`, { // Changed from /api/content/${contentId}
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update content');
    }
    return response.json();
  },

async publishContent(contentId) {
  const response = await fetch(`/api/user/content/${contentId}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (!response.ok) {
    // Get the actual response text to see what's being returned
    const responseText = await response.text();
    console.error('Publish API Error Response:', responseText);
    
    // Try to parse as JSON first, fallback to text
    try {
      const errorData = JSON.parse(responseText);
      throw new Error(errorData.message || 'Failed to publish content');
    } catch (parseError) {
      // If it's not JSON, show the HTML error
      throw new Error(`Server returned HTML error (Status: ${response.status}). Check server logs.`);
    }
  }
  
  return response.json();
},
  async getActivityLogs(websiteId) {
    const url = websiteId ? `/api/user/activity-logs?websiteId=${websiteId}` : '/api/user/activity-logs'; // Changed from /api/activity-logs
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch activity logs');
    return response.json();
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case "published":
      return "bg-green-100 text-green-800 border-green-200";
    case "generating":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "scheduled":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "draft":
    case "pending_approval":
      return "bg-gray-100 text-gray-800 border-gray-200";
    case "approved":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case "published":
      return <CheckCircle className="w-4 h-4" />;
    case "generating":
      return <Bot className="w-4 h-4 animate-spin" />;
    case "scheduled":
      return <Clock className="w-4 h-4" />;
    case "draft":
    case "pending_approval":
      return <Edit className="w-4 h-4" />;
    case "approved":
      return <CheckCircle className="w-4 h-4" />;
    case "rejected":
      return <X className="w-4 h-4" />;
    default:
      return <Edit className="w-4 h-4" />;
  }
};

const getScoreColor = (score) => {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
};

const getProviderIcon = (provider) => {
  switch (provider) {
    case 'openai':
      return <Cpu className="w-4 h-4 text-green-600" />;
    case 'anthropic':
      return <Bot className="w-4 h-4 text-purple-600" />;
    default:
      return <Cpu className="w-4 h-4 text-gray-600" />;
  }
};

const getProviderName = (provider) => {
  switch (provider) {
    case 'openai':
      return 'OpenAI GPT-4O';
    case 'anthropic':
      return 'Anthropic Claude';
    default:
      return provider || 'Unknown';
  }
};

const formatDistanceToNow = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMs = now - date;
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  
  if (diffInHours < 1) {
    return "Less than an hour ago";
  } else if (diffInHours < 24) {
    return `${diffInHours} hours ago`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  }
};

// Error type detection
const getErrorType = (error) => {
  if (error.message.includes('OpenAI Error:')) return 'openai';
  if (error.message.includes('Anthropic Error:')) return 'anthropic';
  if (error.message.includes('PageSpeed API Error:')) return 'pagespeed';
  if (error.message.includes('Analysis Error:')) return 'analysis';
  return 'general';
};

const getErrorSeverity = (error) => {
  const type = getErrorType(error);
  if (type === 'pagespeed' || type === 'analysis') return 'warning';
  return 'error';
};

export default function AIContent() {
  // State management
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState(null);
  const [selectedWebsite, setSelectedWebsite] = useState("");
  const [websites, setWebsites] = useState([]);
  const [content, setContent] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoadingWebsites, setIsLoadingWebsites] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [toast, setToast] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Enhanced form state with AI provider
  const [formData, setFormData] = useState({
    websiteId: "",
    topic: "",
    keywords: "",
    tone: "professional",
    wordCount: 800,
    seoOptimized: true,
    brandVoice: "",
    targetAudience: "",
    eatCompliance: false,
    aiProvider: "openai" // Default to OpenAI
  });

  // Edit form state with AI provider
  const [editFormData, setEditFormData] = useState({
    title: "",
    body: "",
    excerpt: "",
    keywords: "",
    tone: "professional",
    brandVoice: "",
    targetAudience: "",
    eatCompliance: false,
    aiProvider: "openai"
  });

  const [formErrors, setFormErrors] = useState({});
  const [editFormErrors, setEditFormErrors] = useState({});

  // Load websites on component mount
  useEffect(() => {
    loadWebsites();
  }, []);

  // Load content when website is selected
  useEffect(() => {
    if (selectedWebsite) {
      loadContent();
    } else {
      setContent([]);
    }
  }, [selectedWebsite]);

  const loadWebsites = async () => {
    try {
      setIsLoadingWebsites(true);
      const websitesData = await api.getWebsites();
      setWebsites(websitesData);
    } catch (error) {
      showToast(
        "Failed to Load Websites",
        error.message || "Unable to fetch websites from database",
        "destructive"
      );
    } finally {
      setIsLoadingWebsites(false);
    }
  };

  const loadContent = async () => {
    if (!selectedWebsite) return;
    
    try {
      setIsLoadingContent(true);
      const contentData = await api.getWebsiteContent(selectedWebsite);
      setContent(contentData);
    } catch (error) {
      showToast(
        "Failed to Load Content",
        error.message || "Unable to fetch content from database",
        "destructive"
      );
      setContent([]);
    } finally {
      setIsLoadingContent(false);
    }
  };

  // Enhanced toast notification with error types
  const showToast = (title, description, variant = "default", errorType = null) => {
    setToast({ title, description, variant, errorType });
    setTimeout(() => setToast(null), 6000); // Longer timeout for errors
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.websiteId) errors.websiteId = "Please select a website";
    if (!formData.topic.trim()) errors.topic = "Topic is required";
    if (formData.wordCount < 100 || formData.wordCount > 5000) {
      errors.wordCount = "Word count must be between 100 and 5000";
    }
    if (!formData.aiProvider) errors.aiProvider = "Please select an AI provider";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditForm = () => {
    const errors = {};
    if (!editFormData.title.trim()) errors.title = "Title is required";
    if (!editFormData.body.trim()) errors.body = "Content body is required";
    if (editFormData.body.trim().length < 50) {
      errors.body = "Content body must be at least 50 characters long";
    }
    if (!editFormData.aiProvider) errors.aiProvider = "Please select an AI provider";
    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Enhanced AI content generation with proper error handling
  const generateContent = async () => {
    if (!validateForm()) return;

    setIsGenerating(true);
    
    try {
      const keywords = formData.keywords.split(",").map(k => k.trim()).filter(k => k);
      
      const result = await api.generateContent({
        websiteId: formData.websiteId,
        topic: formData.topic,
        keywords: keywords,
        tone: formData.tone,
        wordCount: formData.wordCount,
        brandVoice: formData.brandVoice || undefined,
        targetAudience: formData.targetAudience || undefined,
        eatCompliance: formData.eatCompliance,
        aiProvider: formData.aiProvider
      });

      const aiResult = result.aiResult;
      showToast(
        "Content Generated Successfully",
        `${getProviderName(aiResult.aiProvider)} generated content with SEO: ${aiResult.seoScore}%, Readability: ${aiResult.readabilityScore}%, Brand Voice: ${aiResult.brandVoiceScore}%. Cost: $${aiResult.costUsd.toFixed(4)}`
      );

      // Close dialog and reset form
      setIsGenerateDialogOpen(false);
      setFormData({
        websiteId: "",
        topic: "",
        keywords: "",
        tone: "professional",
        wordCount: 800,
        seoOptimized: true,
        brandVoice: "",
        targetAudience: "",
        eatCompliance: false,
        aiProvider: "openai"
      });
      setFormErrors({});

      // Refresh content list
      await loadContent();

    } catch (error) {
      const errorType = getErrorType(error);
      const severity = getErrorSeverity(error);
      
      let errorTitle = "Content Generation Failed";
      let errorDescription = error.message;

      // Provide specific guidance based on error type
      switch (errorType) {
        case 'openai':
          errorTitle = "OpenAI API Error";
          errorDescription += " Please check your OpenAI API key configuration.";
          break;
        case 'anthropic':
          errorTitle = "Anthropic API Error";
          errorDescription += " Please check your Anthropic API key configuration.";
          break;
        case 'pagespeed':
          errorTitle = "PageSpeed API Error";
          errorDescription += " SEO scores may be incomplete due to PageSpeed API issues.";
          break;
        case 'analysis':
          errorTitle = "Content Analysis Error";
          errorDescription += " Content was generated but analysis failed.";
          break;
      }

      showToast(errorTitle, errorDescription, severity === 'error' ? "destructive" : "warning", errorType);
    } finally {
      setIsGenerating(false);
    }
  };

  // Open edit dialog with populated data
  const openEditDialog = (contentItem) => {
    setEditingContent(contentItem);
    setEditFormData({
      title: contentItem.title || "",
      body: contentItem.body || "",
      excerpt: contentItem.excerpt || "",
      keywords: Array.isArray(contentItem.seoKeywords) ? contentItem.seoKeywords.join(", ") : "",
      tone: contentItem.tone || "professional",
      brandVoice: contentItem.brandVoice || "",
      targetAudience: contentItem.targetAudience || "",
      eatCompliance: contentItem.eatCompliance || false,
      aiProvider: contentItem.aiProvider || "openai"
    });
    setEditFormErrors({});
    setIsEditDialogOpen(true);
  };

  // Close edit dialog
  const closeEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingContent(null);
    setEditFormData({
      title: "",
      body: "",
      excerpt: "",
      keywords: "",
      tone: "professional",
      brandVoice: "",
      targetAudience: "",
      eatCompliance: false,
      aiProvider: "openai"
    });
    setEditFormErrors({});
  };

  // Update content with re-analysis
  const updateContent = async () => {
    if (!validateEditForm() || !editingContent) return;

    setIsUpdating(true);
    
    try {
      const keywords = editFormData.keywords.split(",").map(k => k.trim()).filter(k => k);
      
      const result = await api.updateContent(editingContent.id, {
        title: editFormData.title,
        body: editFormData.body,
        excerpt: editFormData.excerpt,
        seoKeywords: keywords,
        tone: editFormData.tone,
        brandVoice: editFormData.brandVoice || undefined,
        targetAudience: editFormData.targetAudience || undefined,
        eatCompliance: editFormData.eatCompliance,
        aiProvider: editFormData.aiProvider,
        websiteId: selectedWebsite,
        currentSeoScore: editingContent.seoScore,
        currentReadabilityScore: editingContent.readabilityScore,
        currentBrandVoiceScore: editingContent.brandVoiceScore
      });

      await loadContent();
      closeEditDialog();

      if (result.analysis) {
        const scoreDiff = {
          seo: result.analysis.seoScore - (editingContent.seoScore || 0),
          readability: result.analysis.readabilityScore - (editingContent.readabilityScore || 0),
          brandVoice: result.analysis.brandVoiceScore - (editingContent.brandVoiceScore || 0)
        };
        
        showToast(
          "Content Updated & Re-analyzed",
          `${getProviderName(result.analysis.aiProvider)} re-analyzed content - SEO: ${result.analysis.seoScore}% (${scoreDiff.seo >= 0 ? '+' : ''}${scoreDiff.seo}), Readability: ${result.analysis.readabilityScore}% (${scoreDiff.readability >= 0 ? '+' : ''}${scoreDiff.readability}), Brand Voice: ${result.analysis.brandVoiceScore}% (${scoreDiff.brandVoice >= 0 ? '+' : ''}${scoreDiff.brandVoice})`
        );
      } else {
        showToast(
          "Content Updated Successfully",
          "Your content has been updated and changes have been saved."
        );
      }
    } catch (error) {
      const errorType = getErrorType(error);
      const severity = getErrorSeverity(error);
      
      let errorTitle = "Update Failed";
      let errorDescription = error.message;

      switch (errorType) {
        case 'analysis':
          errorTitle = "Re-analysis Failed";
          errorDescription += " Content was updated but re-analysis failed.";
          break;
      }

      showToast(errorTitle, errorDescription, severity === 'error' ? "destructive" : "warning", errorType);
    } finally {
      setIsUpdating(false);
    }
  };

  const publishContent = async (contentId) => {
    setIsPublishing(true);
    
    try {
      await api.publishContent(contentId);
      await loadContent();
      
      showToast(
        "Content Published",
        "Content has been published to your WordPress site."
      );
    } catch (error) {
      showToast(
        "Publish Failed",
        error.message || "Failed to publish content. Please try again.",
        "destructive"
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const getWebsiteName = (websiteId) => {
    const website = websites.find(w => w.id === websiteId);
    return website?.name || "Unknown Website";
  };

  const getWebsiteBrandVoice = (websiteId) => {
    const website = websites.find(w => w.id === websiteId);
    return website?.brandVoice || "";
  };

  // Calculate metrics from real data - NO FALLBACKS
  const filteredContent = selectedWebsite ? content : [];
  const totalCost = filteredContent.reduce((sum, item) => {
    const cost = typeof item.costUsd === 'number' ? item.costUsd : 0;
    return sum + cost;
  }, 0);
  
  // Only calculate average if we have valid scores
  const validScores = filteredContent.filter(item => typeof item.seoScore === 'number' && item.seoScore > 0);
  const avgSeoScore = validScores.length > 0 
    ? Math.round(validScores.reduce((sum, item) => sum + item.seoScore, 0) / validScores.length)
    : null;

  return (
    <div className="py-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Enhanced Toast Notification */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border max-w-md ${
            toast.variant === "destructive" 
              ? "bg-red-50 border-red-200 text-red-800" 
              : toast.variant === "warning"
              ? "bg-yellow-50 border-yellow-200 text-yellow-800"
              : "bg-green-50 border-green-200 text-green-800"
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start flex-1">
                {toast.variant === "destructive" && <AlertTriangle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />}
                {toast.variant === "warning" && <AlertTriangle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />}
                <div className="flex-1">
                  <div className="font-medium text-sm">{toast.title}</div>
                  <div className="text-xs opacity-90 mt-1">{toast.description}</div>
                  {toast.errorType && (
                    <div className="text-xs mt-1 opacity-75">
                      Error Type: {toast.errorType.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => setToast(null)} className="ml-3 opacity-70 hover:opacity-100 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              AI Content Generation
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Create high-quality, SEO-optimized content with OpenAI GPT-4O or Anthropic Claude
            </p>
          </div>
          <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
            <button
              onClick={loadWebsites}
              disabled={isLoadingWebsites}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingWebsites ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setIsGenerateDialogOpen(true)}
              disabled={websites.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Content
            </button>
          </div>
        </div>

        {/* Enhanced Generate Content Dialog with AI Provider Selection */}
        {isGenerateDialogOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsGenerateDialogOpen(false)}></div>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Generate AI Content</h3>
                    <p className="mt-1 text-sm text-gray-500">Create SEO-optimized content with your preferred AI provider</p>
                  </div>
                  
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {/* AI Provider Selection */}
                    <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">AI Provider *</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({...prev, aiProvider: "openai"}))}
                          className={`p-3 border-2 rounded-lg text-left transition-all ${
                            formData.aiProvider === "openai" 
                              ? "border-green-500 bg-green-50" 
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center mb-1">
                            <Cpu className="w-4 h-4 text-green-600 mr-2" />
                            <span className="font-medium text-sm">OpenAI GPT-4O</span>
                          </div>
                          <p className="text-xs text-gray-600">Advanced language model with excellent content generation</p>
                          <p className="text-xs text-green-600 mt-1">$0.005/$0.015 per 1K tokens</p>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({...prev, aiProvider: "anthropic"}))}
                          className={`p-3 border-2 rounded-lg text-left transition-all ${
                            formData.aiProvider === "anthropic" 
                              ? "border-purple-500 bg-purple-50" 
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center mb-1">
                            <Bot className="w-4 h-4 text-purple-600 mr-2" />
                            <span className="font-medium text-sm">Anthropic Claude</span>
                          </div>
                          <p className="text-xs text-gray-600">Thoughtful AI with strong analytical capabilities</p>
                          <p className="text-xs text-purple-600 mt-1">$0.003/$0.015 per 1K tokens</p>
                        </button>
                      </div>
                      {formErrors.aiProvider && (
                        <p className="text-sm text-red-600 mt-1">{formErrors.aiProvider}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Website *</label>
                        <select
                          value={formData.websiteId}
                          onChange={(e) => setFormData(prev => ({
                            ...prev, 
                            websiteId: e.target.value,
                            brandVoice: getWebsiteBrandVoice(e.target.value)
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select website</option>
                          {websites.map((website) => (
                            <option key={website.id} value={website.id}>
                              {website.name}
                            </option>
                          ))}
                        </select>
                        {formErrors.websiteId && (
                          <p className="text-sm text-red-600 mt-1">{formErrors.websiteId}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Content Tone</label>
                        <select
                          value={formData.tone}
                          onChange={(e) => setFormData(prev => ({...prev, tone: e.target.value}))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="professional">Professional</option>
                          <option value="casual">Casual</option>
                          <option value="friendly">Friendly</option>
                          <option value="authoritative">Authoritative</option>
                          <option value="technical">Technical</option>
                          <option value="warm">Warm</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Content Topic *</label>
                      <input
                        type="text"
                        value={formData.topic}
                        onChange={(e) => setFormData(prev => ({...prev, topic: e.target.value}))}
                        placeholder="e.g., Latest WordPress Security Tips"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      {formErrors.topic && (
                        <p className="text-sm text-red-600 mt-1">{formErrors.topic}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">SEO Keywords</label>
                      <input
                        type="text"
                        value={formData.keywords}
                        onChange={(e) => setFormData(prev => ({...prev, keywords: e.target.value}))}
                        placeholder="wordpress, security, tips, 2024"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Separate keywords with commas</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Word Count</label>
                        <input
                          type="number"
                          value={formData.wordCount}
                          onChange={(e) => setFormData(prev => ({...prev, wordCount: parseInt(e.target.value) || 0}))}
                          min="100"
                          max="5000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                        {formErrors.wordCount && (
                          <p className="text-sm text-red-600 mt-1">{formErrors.wordCount}</p>
                        )}
                      </div>

                      <div className="flex items-center pt-6">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.seoOptimized}
                            onChange={(e) => setFormData(prev => ({...prev, seoOptimized: e.target.checked}))}
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">SEO Optimized</span>
                        </label>
                      </div>
                    </div>

                    {/* Advanced Options */}
                    <div className="border-t pt-4">
                      <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center text-sm text-blue-600 hover:text-blue-500"
                      >
                        <Zap className="w-4 h-4 mr-1" />
                        Advanced Options
                      </button>
                      
                      {showAdvanced && (
                        <div className="mt-3 space-y-4 pl-5 border-l-2 border-blue-100">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                            <input
                              type="text"
                              value={formData.targetAudience}
                              onChange={(e) => setFormData(prev => ({...prev, targetAudience: e.target.value}))}
                              placeholder="e.g., Small business owners, Developers"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Brand Voice Override</label>
                            <input
                              type="text"
                              value={formData.brandVoice}
                              onChange={(e) => setFormData(prev => ({...prev, brandVoice: e.target.value}))}
                              placeholder="Leave empty to use website's brand voice"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div className="flex items-center">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.eatCompliance}
                                onChange={(e) => setFormData(prev => ({...prev, eatCompliance: e.target.checked}))}
                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                              />
                              <span className="ml-2 text-sm text-gray-700">E-E-A-T Compliance (YMYL Content)</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={generateContent}
                    disabled={isGenerating}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <>
                        <Bot className="w-4 h-4 mr-2 animate-spin" />
                        Generating with {getProviderName(formData.aiProvider)}...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate with {getProviderName(formData.aiProvider)}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsGenerateDialogOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Content Dialog with AI Provider Selection */}
        {isEditDialogOpen && editingContent && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeEditDialog}></div>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Edit Content</h3>
                    <p className="mt-1 text-sm text-gray-500">Modify your AI-generated content and re-analyze with your preferred provider</p>
                  </div>
                  
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {/* AI Provider Selection for Re-analysis */}
                    <div className="border border-purple-200 bg-purple-50 rounded-lg p-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Re-analysis AI Provider *</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setEditFormData(prev => ({...prev, aiProvider: "openai"}))}
                          className={`p-2 border rounded text-left text-xs transition-all ${
                            editFormData.aiProvider === "openai" 
                              ? "border-green-500 bg-green-50" 
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center">
                            <Cpu className="w-3 h-3 text-green-600 mr-1" />
                            <span className="font-medium">OpenAI GPT-4O</span>
                          </div>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setEditFormData(prev => ({...prev, aiProvider: "anthropic"}))}
                          className={`p-2 border rounded text-left text-xs transition-all ${
                            editFormData.aiProvider === "anthropic" 
                              ? "border-purple-500 bg-purple-50" 
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center">
                            <Bot className="w-3 h-3 text-purple-600 mr-1" />
                            <span className="font-medium">Anthropic Claude</span>
                          </div>
                        </button>
                      </div>
                      {editFormErrors.aiProvider && (
                        <p className="text-sm text-red-600 mt-1">{editFormErrors.aiProvider}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                      <input
                        type="text"
                        value={editFormData.title}
                        onChange={(e) => setEditFormData(prev => ({...prev, title: e.target.value}))}
                        placeholder="Enter content title"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      {editFormErrors.title && (
                        <p className="text-sm text-red-600 mt-1">{editFormErrors.title}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Content Body *</label>
                      <textarea
                        value={editFormData.body}
                        onChange={(e) => setEditFormData(prev => ({...prev, body: e.target.value}))}
                        placeholder="Enter the main content..."
                        rows={12}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-none"
                      />
                      {editFormErrors.body && (
                        <p className="text-sm text-red-600 mt-1">{editFormErrors.body}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {editFormData.body.length} characters
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
                      <textarea
                        value={editFormData.excerpt}
                        onChange={(e) => setEditFormData(prev => ({...prev, excerpt: e.target.value}))}
                        placeholder="Brief description or summary..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">SEO Keywords</label>
                        <input
                          type="text"
                          value={editFormData.keywords}
                          onChange={(e) => setEditFormData(prev => ({...prev, keywords: e.target.value}))}
                          placeholder="wordpress, security, tips"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Separate keywords with commas</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Content Tone</label>
                        <select
                          value={editFormData.tone}
                          onChange={(e) => setEditFormData(prev => ({...prev, tone: e.target.value}))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="professional">Professional</option>
                          <option value="casual">Casual</option>
                          <option value="friendly">Friendly</option>
                          <option value="authoritative">Authoritative</option>
                          <option value="technical">Technical</option>
                          <option value="warm">Warm</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                        <input
                          type="text"
                          value={editFormData.targetAudience}
                          onChange={(e) => setEditFormData(prev => ({...prev, targetAudience: e.target.value}))}
                          placeholder="e.g., Small business owners"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Brand Voice</label>
                        <input
                          type="text"
                          value={editFormData.brandVoice}
                          onChange={(e) => setEditFormData(prev => ({...prev, brandVoice: e.target.value}))}
                          placeholder="Brand voice description"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editFormData.eatCompliance}
                          onChange={(e) => setEditFormData(prev => ({...prev, eatCompliance: e.target.checked}))}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700">E-E-A-T Compliance (YMYL Content)</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={updateContent}
                    disabled={isUpdating}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? (
                      <>
                        <Save className="w-4 h-4 mr-2 animate-pulse" />
                        Re-analyzing with {getProviderName(editFormData.aiProvider)}...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save & Re-analyze
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={closeEditDialog}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Website Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Website to View Content
          </label>
          {isLoadingWebsites ? (
            <div className="w-64 h-10 bg-gray-200 animate-pulse rounded-md"></div>
          ) : (
            <select
              value={selectedWebsite}
              onChange={(e) => setSelectedWebsite(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 w-64"
            >
              <option value="">Choose a website...</option>
              {websites.map((website) => (
                <option key={website.id} value={website.id}>
                  {website.name} ({website.status})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Enhanced Stats Dashboard - NO FALLBACKS */}
        {selectedWebsite && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BarChart3 className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Content</dt>
                      <dd className="text-2xl font-bold text-gray-900">
                        {isLoadingContent ? "..." : filteredContent.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Published</dt>
                      <dd className="text-2xl font-bold text-green-600">
                        {isLoadingContent ? "..." : filteredContent.filter(c => c.status === "published").length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Target className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Avg SEO Score</dt>
                      <dd className={`text-2xl font-bold ${avgSeoScore !== null ? getScoreColor(avgSeoScore) : 'text-gray-400'}`}>
                        {isLoadingContent ? "..." : (avgSeoScore !== null ? `${avgSeoScore}%` : "N/A")}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Shield className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">E-E-A-T Compliant</dt>
                      <dd className="text-2xl font-bold text-purple-600">
                        {isLoadingContent ? "..." : filteredContent.filter(c => c.eatCompliance).length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Cost</dt>
                      <dd className="text-2xl font-bold text-yellow-600">
                        {isLoadingContent ? "..." : `$${totalCost.toFixed(3)}`}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Content List with Provider Information */}
        {selectedWebsite ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Generated Content</h3>
                  <p className="text-sm text-gray-500">
                    Manage AI-generated content for {getWebsiteName(selectedWebsite)}
                  </p>
                </div>
                <button
                  onClick={loadContent}
                  disabled={isLoadingContent}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingContent ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
              
              {isLoadingContent ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border rounded-lg p-6 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-full mb-4"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : filteredContent.length > 0 ? (
                <div className="space-y-6">
                  {filteredContent.map((item) => (
                    <div key={item.id} className="border rounded-lg p-6 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-medium text-gray-900 text-lg">{item.title}</h4>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                              {getStatusIcon(item.status)}
                              <span className="ml-1 capitalize">{item.status.replace('_', ' ')}</span>
                            </span>
                            {item.aiProvider && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                {getProviderIcon(item.aiProvider)}
                                <span className="ml-1">{getProviderName(item.aiProvider)}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                            {item.excerpt || (item.body && item.body.substring(0, 200) + "...")}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {(item.status === "draft" || item.status === "pending_approval" || item.status === "approved" || item.status === "publish_failed") && (
                            <button
  onClick={() => publishContent(item.id)}
  disabled={isPublishing}
  className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
    item.status === "publish_failed"
      ? "bg-orange-600 hover:bg-orange-700 focus:ring-orange-500"
      : "bg-green-600 hover:bg-green-700 focus:ring-green-500"
  }`}
>
  <Play className="w-3 h-3 mr-1" />
  {item.status === "publish_failed" ? "Retry Publish" : "Publish"}
</button>
                          )}
                          <button 
                            onClick={() => openEditDialog(item)}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </button>
                        </div>
                      </div>

                      {/* Enhanced Metrics - Show Errors Instead of Fallbacks */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <div className={`text-lg font-bold ${
                            typeof item.seoScore === 'number' && item.seoScore > 0 
                              ? getScoreColor(item.seoScore) 
                              : 'text-red-500'
                          }`}>
                            {typeof item.seoScore === 'number' && item.seoScore > 0 
                              ? `${item.seoScore}%` 
                              : 'Error'
                            }
                          </div>
                          <div className="text-xs text-gray-500">SEO Score</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-lg font-bold ${
                            typeof item.readabilityScore === 'number' && item.readabilityScore > 0 
                              ? getScoreColor(item.readabilityScore) 
                              : 'text-red-500'
                          }`}>
                            {typeof item.readabilityScore === 'number' && item.readabilityScore > 0 
                              ? `${item.readabilityScore}%` 
                              : 'Error'
                            }
                          </div>
                          <div className="text-xs text-gray-500">Readability</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-lg font-bold ${
                            typeof item.brandVoiceScore === 'number' && item.brandVoiceScore > 0 
                              ? getScoreColor(item.brandVoiceScore) 
                              : 'text-red-500'
                          }`}>
                            {typeof item.brandVoiceScore === 'number' && item.brandVoiceScore > 0 
                              ? `${item.brandVoiceScore}%` 
                              : 'Error'
                            }
                          </div>
                          <div className="text-xs text-gray-500">Brand Voice</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">
                            {item.wordpressPostId ? `#${item.wordpressPostId}` : "-"}
                          </div>
                          <div className="text-xs text-gray-500">WP Post ID</div>
                        </div>
                      </div>

                      {/* Cost and Token Information */}
                      <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-3">
                        <div className="flex items-center space-x-4">
                          <span>Tokens: {item.tokensUsed || 'N/A'}</span>
                          <span>Cost: ${typeof item.costUsd === 'number' ? item.costUsd.toFixed(4) : 'N/A'}</span>
                          {item.seoKeywords && item.seoKeywords.length > 0 && (
                            <span>Keywords: {item.seoKeywords.join(", ")}</span>
                          )}
                          {item.eatCompliance && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              E-E-A-T
                            </span>
                          )}
                        </div>
                        <div>
                          <span>Created: {formatDistanceToNow(item.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Bot className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No content generated yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Start by generating your first AI-powered content piece with real-time analysis and scoring.
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={() => setIsGenerateDialogOpen(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Content
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="text-center py-12">
              <Bot className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {isLoadingWebsites ? "Loading websites..." : "Select a website"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {isLoadingWebsites 
                  ? "Please wait while we fetch your websites from the database."
                  : "Choose a website to view and manage its AI-generated content with real-time analytics and error reporting."
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}