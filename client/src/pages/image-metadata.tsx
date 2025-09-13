//client/src/pages/image-metadata.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Image, 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  Info, 
  FileImage, 
  RefreshCw, 
  Filter, 
  Settings, 
  X,
  Zap,
  Clock
} from "lucide-react";

// Enhanced API implementation with proper error handling
const api = {
  async getContentImages(websiteId?: string) {
    const url = websiteId 
      ? `/api/images/content-images?websiteId=${websiteId}`
      : '/api/images/content-images';
    
    try {
      const response = await fetch(url);
      
      // Check content type before parsing
      const contentType = response.headers.get("content-type");
      
      if (!response.ok) {
        // Try to get error details
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Server error: ${response.status}`);
        } else {
          // It's probably HTML (error page)
          const text = await response.text();
          
          if (text.includes("<!DOCTYPE") || text.includes("<html")) {
            console.error(`API endpoint ${url} returned HTML instead of JSON`);
            
            if (response.status === 404) {
              console.warn("Images API endpoint not found. Using empty array as fallback.");
              return []; // Return empty array for 404
            } else if (response.status === 500) {
              throw new Error("Server error when loading images.");
            } else if (response.status === 401 || response.status === 403) {
              throw new Error("Authentication required to load images.");
            }
          }
          
          throw new Error(`Failed to load images: ${response.statusText}`);
        }
      }
      
      // Check if the response is actually JSON before parsing
      if (!contentType || !contentType.includes("application/json")) {
        console.warn(`Warning: ${url} did not return JSON content-type`);
        // Try to parse anyway, but handle the error
        try {
          const data = await response.json();
          // Ensure we return an array
          if (Array.isArray(data)) return data;
          if (data.images && Array.isArray(data.images)) return data.images;
          console.warn("API returned unexpected format, using empty array");
          return [];
        } catch (parseError) {
          console.error("Failed to parse response as JSON:", parseError);
          return []; // Return empty array as fallback
        }
      }
      
      // Safe to parse JSON
      const data = await response.json();
      
      // Ensure we return an array
      if (Array.isArray(data)) return data;
      if (data.images && Array.isArray(data.images)) return data.images;
      
      console.warn("API returned unexpected format, using empty array");
      return [];
      
    } catch (error) {
      console.error('getContentImages error:', error);
      // Don't throw for 404s, just return empty array
      if (error instanceof Error && error.message.includes("not found")) {
        return [];
      }
      throw error;
    }
  },

  async batchProcessMetadata(imageIds: string[], options: any) {
    try {
      const response = await fetch('/api/images/batch-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds, options })
      });
      
      // Check content type before parsing
      const contentType = response.headers.get("content-type");
      
      if (!response.ok) {
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to process images");
        } else {
          const text = await response.text();
          if (text.includes("<!DOCTYPE") || text.includes("<html")) {
            if (response.status === 404) {
              throw new Error("Batch processing API not available. Please configure the endpoint.");
            }
          }
          throw new Error(`Processing failed: ${response.statusText}`);
        }
      }
      
      // Check if response is JSON
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Batch process API did not return JSON");
        throw new Error("Invalid response from batch processing API");
      }
      
      return await response.json();
    } catch (error) {
      console.error('batchProcessMetadata error:', error);
      throw error;
    }
  },

  async getWebsites() {
    try {
      const response = await fetch("/api/user/websites");
      
      // Check content type before parsing
      const contentType = response.headers.get("content-type");
      
      if (!response.ok) {
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch websites");
        } else {
          const text = await response.text();
          if (text.includes("<!DOCTYPE") || text.includes("<html")) {
            console.error("Websites API returned HTML - endpoint may not exist");
            if (response.status === 404) {
              console.warn("Websites API not found. Returning empty array.");
              return []; // Return empty array for missing endpoint
            }
          }
          throw new Error(`Failed to fetch websites: ${response.statusText}`);
        }
      }
      
      // Check if response is JSON
      if (!contentType || !contentType.includes("application/json")) {
        console.warn("Websites API did not return JSON, attempting to parse anyway");
        try {
          const data = await response.json();
          return Array.isArray(data) ? data : [];
        } catch {
          console.error("Failed to parse websites response");
          return [];
        }
      }
      
      const data = await response.json();
      return Array.isArray(data) ? data : [];
      
    } catch (error) {
      console.error('getWebsites error:', error);
      // Don't throw for 404s, just return empty array
      if (error instanceof Error && error.message.includes("not found")) {
        return [];
      }
      throw error;
    }
  },

  async getImageStatus(contentId: string) {
    try {
      const response = await fetch(`/api/images/batch-process?contentId=${contentId}`);
      
      // Check content type before parsing
      const contentType = response.headers.get("content-type");
      
      if (!response.ok) {
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to get image status");
        } else {
          const text = await response.text();
          if (text.includes("<!DOCTYPE") || text.includes("<html")) {
            if (response.status === 404) {
              throw new Error("Status API not available");
            }
          }
          throw new Error(`Failed to get status: ${response.statusText}`);
        }
      }
      
      // Check if response is JSON
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid response from status API");
      }
      
      return await response.json();
    } catch (error) {
      console.error('getImageStatus error:', error);
      throw error;
    }
  }
};

// Utility functions
const formatFileSize = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

interface ContentImage {
  id: string;
  url?: string;
  data?: string;
  contentId: string;
  contentTitle: string;
  websiteId: string;
  websiteName: string;
  hasMetadata: boolean;
  metadataDetails?: {
    copyright?: string;
    author?: string;
    aiModel?: string;
    aiProvider?: string;
  };
  size: number;
  createdAt: string;
  isAIGenerated: boolean;
  processedAt?: string;
  costCents?: number;
}

interface Website {
  id: string;
  name: string;
  domain?: string;
  status?: string;
  contentCount?: number;
  lastContentDate?: string;
}

interface ProcessOptions {
  action: 'add' | 'strip' | 'update';
  copyright?: string;
  author?: string;
  removeGPS?: boolean;
  optimize?: boolean;
  maxWidth?: number;
  quality?: number;
  keepColorProfile?: boolean;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface ProcessingStatus {
  imageId: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  error?: string;
}

export default function ImageMetadata() {
  // State management
  const [images, setImages] = useState<ContentImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsite, setSelectedWebsite] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'with-metadata' | 'without-metadata' | 'ai-generated'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus[]>([]);
  const [apiAvailable, setApiAvailable] = useState(true); // Track if APIs are available

  // Processing options
  const [processOptions, setProcessOptions] = useState<ProcessOptions>({
    action: 'add',
    copyright: `© ${new Date().getFullYear()}`,
    author: 'AI Content Generator',
    removeGPS: true,
    optimize: true,
    maxWidth: 1920,
    quality: 85,
    keepColorProfile: true
  });

  // Toast management
  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Load websites on mount
  useEffect(() => {
    loadWebsites();
  }, []);

  // Load images when website changes
  useEffect(() => {
    if (websites.length > 0 || selectedWebsite === "") {
      loadImages();
    }
  }, [selectedWebsite, websites]);

  const loadWebsites = async () => {
    try {
      console.log('Loading websites from database...');
      const data = await api.getWebsites();
      
      // Validate the response is an array
      if (Array.isArray(data)) {
        setWebsites(data);
        console.log(`Loaded ${data.length} websites:`, data);
        
        // Auto-select first website if none selected and websites exist
        if (data.length > 0 && !selectedWebsite) {
          setSelectedWebsite(data[0].id);
        }
        
        // Show info if no websites found
        if (data.length === 0) {
          addToast("No websites found. Please add a website first.", "info");
          setApiAvailable(false);
        } else {
          setApiAvailable(true);
        }
      } else {
        console.error('Invalid websites response:', data);
        setWebsites([]);
        setApiAvailable(false);
      }
    } catch (error: any) {
      console.error('Error loading websites:', error);
      setWebsites([]);
      
      // Only show error toast for actual errors, not 404s
      if (!error.message?.includes("not found") && !error.message?.includes("404")) {
        addToast(error.message || "Failed to load websites", "error");
      } else {
        // API doesn't exist - show helpful message
        addToast("Website API not configured. Please set up your websites first.", "info");
        setApiAvailable(false);
      }
    }
  };

  const loadImages = async () => {
    // Don't try to load if no websites available and one is selected
    if (websites.length === 0 && selectedWebsite) {
      setImages([]);
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('Loading images for website:', selectedWebsite || 'all');
      const data = await api.getContentImages(selectedWebsite || undefined);
      
      // Validate the response is an array
      if (Array.isArray(data)) {
        setImages(data);
        console.log(`Loaded ${data.length} images`);
        
        if (data.length > 0) {
          // Count metadata status
          const withMetadata = data.filter(img => img.hasMetadata).length;
          const withoutMetadata = data.length - withMetadata;
          
          addToast(
            `Loaded ${data.length} images (${withMetadata} protected, ${withoutMetadata} unprotected)`,
            "info"
          );
        } else if (apiAvailable) {
          // Only show this if the API is available but returned no data
          console.log("No images found for current selection");
        }
      } else {
        console.error('Invalid images response:', data);
        setImages([]);
      }
    } catch (error: any) {
      console.error('Error loading images:', error);
      setImages([]);
      
      // Only show error for non-404 errors
      if (!error.message?.includes("not found") && !error.message?.includes("404")) {
        addToast(error.message || "Failed to load images", "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedImages.length === filteredImages.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(filteredImages.map(img => img.id));
    }
  };

  const handleSelectImage = (imageId: string) => {
    setSelectedImages(prev =>
      prev.includes(imageId)
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  const handleBatchProcess = async () => {
    if (selectedImages.length === 0) {
      addToast("Please select images to process", "warning");
      return;
    }

    // Confirm action for destructive operations
    if (processOptions.action === 'strip') {
      const confirmed = window.confirm(
        `Are you sure you want to strip metadata from ${selectedImages.length} images? This action cannot be undone.`
      );
      if (!confirmed) return;
    }

    setIsProcessing(true);
    
    // Initialize processing status
    const initialStatus: ProcessingStatus[] = selectedImages.map(id => ({
      imageId: id,
      status: 'pending'
    }));
    setProcessingStatus(initialStatus);

    try {
      // Update status to processing
      setProcessingStatus(prev => 
        prev.map(s => ({ ...s, status: 'processing' as const }))
      );

      console.log('Processing images with options:', processOptions);
      const result = await api.batchProcessMetadata(selectedImages, processOptions);
      console.log('Processing result:', result);
      
      // Update status based on results
      if (result.results) {
        setProcessingStatus(prev => 
          prev.map(s => ({
            ...s,
            status: result.results.success.some((success: any) => success.imageId === s.imageId) 
              ? 'success' as const
              : 'failed' as const
          }))
        );
      }

      const actionText = 
        processOptions.action === 'add' ? 'Added metadata to' : 
        processOptions.action === 'strip' ? 'Stripped metadata from' : 
        'Updated metadata for';

      addToast(
        `${actionText} ${result.processed} of ${result.total} images (${result.successRate})`,
        result.failed > 0 ? "warning" : "success"
      );

      // Show detailed errors if any
      if (result.errors && result.errors.length > 0) {
        console.error('Processing errors:', result.errors);
        result.errors.forEach((error: any) => {
          console.error(`Image ${error.imageId} error:`, error);
        });
        
        // Show first error to user
        if (result.errors[0]) {
          addToast(`Error: ${result.errors[0].message}`, "error");
        }
      }
      
      // Reload images to show updated metadata status
      await loadImages();
      setSelectedImages([]);
      
      // Clear processing status after a delay
      setTimeout(() => {
        setProcessingStatus([]);
      }, 3000);
      
    } catch (error: any) {
      console.error('Batch processing error:', error);
      addToast(error.message || "Failed to process images", "error");
      
      // Update all to failed status
      setProcessingStatus(prev => 
        prev.map(s => ({ ...s, status: 'failed' as const, error: 'Processing failed' }))
      );
      
      // Clear processing status after a delay
      setTimeout(() => {
        setProcessingStatus([]);
      }, 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter images based on selected filter
  const filteredImages = useMemo(() => {
    return images.filter(img => {
      // First filter by website if one is selected
      if (selectedWebsite && img.websiteId !== selectedWebsite) {
        return false;
      }
      
      // Then apply additional filters
      switch (filter) {
        case 'with-metadata':
          return img.hasMetadata;
        case 'without-metadata':
          return !img.hasMetadata;
        case 'ai-generated':
          return img.isAIGenerated;
        default:
          return true;
      }
    });
  }, [images, filter, selectedWebsite]);

  // Calculate statistics
  const stats = useMemo(() => ({
    total: images.length,
    withMetadata: images.filter(img => img.hasMetadata).length,
    withoutMetadata: images.filter(img => !img.hasMetadata).length,
    aiGenerated: images.filter(img => img.isAIGenerated).length,
    totalSize: images.reduce((sum, img) => sum + (img.size || 0), 0),
    totalCost: images.reduce((sum, img) => sum + (img.costCents || 0), 0)
  }), [images]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`
              flex items-center justify-between p-4 rounded-lg shadow-lg min-w-[300px]
              ${toast.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                toast.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                toast.type === 'info' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                'bg-green-50 text-green-800 border border-green-200'}
            `}
          >
            <div className="flex items-center">
              {toast.type === 'error' || toast.type === 'warning' ? 
                <AlertTriangle className="w-5 h-5 mr-2" /> :
               toast.type === 'info' ? 
                <Info className="w-5 h-5 mr-2" /> :
                <CheckCircle className="w-5 h-5 mr-2" />}
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Image Metadata Manager
          </h1>
          <p className="text-gray-600">
            Batch process metadata for AI-generated content images
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-gray-500">{formatFileSize(stats.totalSize)}</p>
              </div>
              <FileImage className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Protected</p>
                <p className="text-2xl font-bold text-green-600">{stats.withMetadata}</p>
                <p className="text-xs text-gray-500">
                  {stats.total > 0 ? `${Math.round((stats.withMetadata / stats.total) * 100)}%` : '0%'}
                </p>
              </div>
              <Shield className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unprotected</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.withoutMetadata}</p>
                <p className="text-xs text-gray-500">
                  {stats.total > 0 ? `${Math.round((stats.withoutMetadata / stats.total) * 100)}%` : '0%'}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">AI Generated</p>
                <p className="text-2xl font-bold text-purple-600">{stats.aiGenerated}</p>
                <p className="text-xs text-gray-500">
                  ${(stats.totalCost / 100).toFixed(2)} total
                </p>
              </div>
              <Zap className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Selected</p>
                <p className="text-2xl font-bold text-indigo-600">{selectedImages.length}</p>
                <p className="text-xs text-gray-500">Ready</p>
              </div>
              <CheckCircle className="w-8 h-8 text-indigo-500" />
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full px-6 py-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center">
              <Settings className="w-5 h-5 mr-2 text-gray-600" />
              <span className="font-medium">Processing Settings</span>
            </div>
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${showSettings ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showSettings && (
            <div className="px-6 pb-6 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Action
                  </label>
                  <select
                    value={processOptions.action}
                    onChange={(e) => setProcessOptions({...processOptions, action: e.target.value as ProcessOptions['action']})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="add">Add Metadata</option>
                    <option value="strip">Strip All Metadata</option>
                    <option value="update">Update Existing Metadata</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {processOptions.action === 'add' && 'Add copyright and author information'}
                    {processOptions.action === 'strip' && 'Remove all metadata from images'}
                    {processOptions.action === 'update' && 'Update existing metadata fields'}
                  </p>
                </div>

                {processOptions.action !== 'strip' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Copyright
                      </label>
                      <input
                        type="text"
                        value={processOptions.copyright}
                        onChange={(e) => setProcessOptions({...processOptions, copyright: e.target.value})}
                        placeholder="© 2024 Your Company"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Author/Artist
                      </label>
                      <input
                        type="text"
                        value={processOptions.author}
                        onChange={(e) => setProcessOptions({...processOptions, author: e.target.value})}
                        placeholder="AI Content Generator"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Optimization
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={processOptions.removeGPS}
                        onChange={(e) => setProcessOptions({...processOptions, removeGPS: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="ml-2 text-sm">Remove GPS Data</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={processOptions.optimize}
                        onChange={(e) => setProcessOptions({...processOptions, optimize: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="ml-2 text-sm">Optimize for Web</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={processOptions.keepColorProfile}
                        onChange={(e) => setProcessOptions({...processOptions, keepColorProfile: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="ml-2 text-sm">Keep Color Profile</span>
                    </label>
                  </div>
                </div>

                {processOptions.optimize && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Width (px)
                      </label>
                      <input
                        type="number"
                        value={processOptions.maxWidth}
                        onChange={(e) => setProcessOptions({...processOptions, maxWidth: parseInt(e.target.value)})}
                        min="640"
                        max="3840"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quality (1-100)
                      </label>
                      <input
                        type="number"
                        value={processOptions.quality}
                        onChange={(e) => setProcessOptions({...processOptions, quality: parseInt(e.target.value)})}
                        min="1"
                        max="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Toolbar */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={selectedWebsite}
                  onChange={(e) => setSelectedWebsite(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  disabled={websites.length === 0}
                >
                  {websites.length > 0 ? (
                    <>
                      <option value="">All Websites</option>
                      {websites.map(site => (
                        <option key={site.id} value={site.id}>
                          {site.name}
                          {site.contentCount ? ` (${site.contentCount} items)` : ''}
                        </option>
                      ))}
                    </>
                  ) : (
                    <option value="">No websites available</option>
                  )}
                </select>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as typeof filter)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="all">All Images ({stats.total})</option>
                    <option value="with-metadata">With Metadata ({stats.withMetadata})</option>
                    <option value="without-metadata">Without Metadata ({stats.withoutMetadata})</option>
                    <option value="ai-generated">AI Generated ({stats.aiGenerated})</option>
                  </select>
                </div>

                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {selectedImages.length === filteredImages.length && filteredImages.length > 0 
                    ? 'Deselect All' 
                    : 'Select All'}
                </button>

                {selectedImages.length > 0 && (
                  <span className="text-sm text-gray-600">
                    {selectedImages.length} of {filteredImages.length} selected
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={loadImages}
                  disabled={isLoading}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={handleBatchProcess}
                  disabled={selectedImages.length === 0 || isProcessing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing {processingStatus.filter(s => s.status === 'processing').length} images...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Process Selected ({selectedImages.length})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Image Grid */}
          <div className="p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                <p className="text-gray-600">Loading images from database...</p>
              </div>
            ) : filteredImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredImages.map(image => {
                  const processingItem = processingStatus.find(s => s.imageId === image.id);
                  const isSelected = selectedImages.includes(image.id);
                  
                  return (
                    <div
                      key={image.id}
                      className={`
                        relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all
                        ${isSelected ? 'border-blue-500 shadow-lg scale-[1.02]' : 'border-gray-200 hover:border-gray-300'}
                        ${processingItem?.status === 'processing' ? 'animate-pulse' : ''}
                        ${processingItem?.status === 'success' ? 'ring-2 ring-green-500' : ''}
                        ${processingItem?.status === 'failed' ? 'ring-2 ring-red-500' : ''}
                      `}
                      onClick={() => handleSelectImage(image.id)}
                    >
                      <div className="aspect-square bg-gray-100">
                        {image.data ? (
                          <img
                            src={image.data}
                            alt={image.contentTitle}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : image.url ? (
                          <img
                            src={image.url}
                            alt={image.contentTitle}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-2 text-white">
                          <p className="text-xs font-medium truncate">{image.contentTitle}</p>
                          <p className="text-xs opacity-90">{formatFileSize(image.size)}</p>
                          <p className="text-xs opacity-80">{image.websiteName}</p>
                        </div>
                      </div>

                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                        {image.hasMetadata && (
                          <span className="bg-green-500 text-white p-1 rounded" title="Has metadata">
                            <Shield className="w-3 h-3" />
                          </span>
                        )}
                        {image.isAIGenerated && (
                          <span className="bg-purple-500 text-white text-[10px] px-1 py-0.5 rounded font-bold">
                            AI
                          </span>
                        )}
                      </div>

                      <div className="absolute top-2 left-2">
                        <div className={`
                          w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                          ${isSelected 
                            ? 'bg-blue-500 border-blue-500 scale-110' 
                            : 'bg-white/80 border-gray-300 group-hover:border-gray-400'}
                        `}>
                          {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                        </div>
                      </div>

                      {processingItem && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          {processingItem.status === 'processing' && (
                            <Loader2 className="w-8 h-8 animate-spin text-white" />
                          )}
                          {processingItem.status === 'success' && (
                            <CheckCircle className="w-8 h-8 text-green-400" />
                          )}
                          {processingItem.status === 'failed' && (
                            <AlertTriangle className="w-8 h-8 text-red-400" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <Image className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No images found</h3>
                <p className="text-sm text-gray-500 text-center max-w-md">
                  {!apiAvailable 
                    ? 'API endpoints are not configured. Please set up your backend services first.' 
                    : websites.length === 0 
                      ? 'No websites found. Please generate content with images first using the AI Content page.' 
                      : selectedWebsite 
                        ? 'No images found for this website. Generate content with images enabled.'
                        : 'Select a website to view images or generate content with images enabled.'}
                </p>
                {filter !== 'all' && (
                  <button
                    onClick={() => setFilter('all')}
                    className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
























// //client/src/pages/image-metadata.tsx
// import React, { useState, useEffect, useCallback, useMemo } from "react";
// import { 
//   Image, 
//   Shield, 
//   CheckCircle, 
//   AlertTriangle, 
//   Loader2, 
//   Info, 
//   FileImage, 
//   RefreshCw, 
//   Filter, 
//   Settings, 
//   X,
//   Zap,
//   Clock
// } from "lucide-react";

// // Mock API for demonstration - replace with actual API calls
// const mockApi = {
//   async getContentImages(websiteId) {
//     // Simulate API delay
//     await new Promise(resolve => setTimeout(resolve, 1000));
    
//     // Return mock data
//     return [
//       {
//         id: "content1_0",
//         url: "https://via.placeholder.com/400x400/4F46E5/ffffff?text=Image+1",
//         contentId: "content1",
//         contentTitle: "AI Technology Blog Post",
//         websiteId: "site1",
//         websiteName: "TechBlog",
//         hasMetadata: true,
//         metadataDetails: {
//           copyright: "© 2024 TechBlog",
//           author: "AI Content Generator",
//           aiModel: "DALL-E 3"
//         },
//         size: 245678,
//         createdAt: "2024-01-15T10:30:00Z",
//         isAIGenerated: true
//       },
//       {
//         id: "content1_1",
//         url: "https://via.placeholder.com/400x400/10B981/ffffff?text=Image+2",
//         contentId: "content1",
//         contentTitle: "AI Technology Blog Post",
//         websiteId: "site1",
//         websiteName: "TechBlog",
//         hasMetadata: false,
//         size: 189234,
//         createdAt: "2024-01-15T10:31:00Z",
//         isAIGenerated: true
//       },
//       {
//         id: "content2_0",
//         url: "https://via.placeholder.com/400x400/F59E0B/ffffff?text=Image+3",
//         contentId: "content2",
//         contentTitle: "Machine Learning Guide",
//         websiteId: "site1",
//         websiteName: "TechBlog",
//         hasMetadata: false,
//         size: 312456,
//         createdAt: "2024-01-16T14:20:00Z",
//         isAIGenerated: false
//       },
//       {
//         id: "content3_0",
//         url: "https://via.placeholder.com/400x400/EF4444/ffffff?text=Image+4",
//         contentId: "content3",
//         contentTitle: "Future of AI Article",
//         websiteId: "site2",
//         websiteName: "Innovation Hub",
//         hasMetadata: true,
//         metadataDetails: {
//           copyright: "© 2024 Innovation Hub",
//           author: "Content Team"
//         },
//         size: 278901,
//         createdAt: "2024-01-17T09:15:00Z",
//         isAIGenerated: true
//       },
//       {
//         id: "content4_0",
//         url: "https://via.placeholder.com/400x400/8B5CF6/ffffff?text=Image+5",
//         contentId: "content4",
//         contentTitle: "Data Science Basics",
//         websiteId: "site2",
//         websiteName: "Innovation Hub",
//         hasMetadata: false,
//         size: 198765,
//         createdAt: "2024-01-18T11:45:00Z",
//         isAIGenerated: true
//       }
//     ];
//   },

//   async batchProcessMetadata(imageIds, options) {
//     // Simulate processing delay
//     await new Promise(resolve => setTimeout(resolve, 2000));
    
//     // Simulate some failures for demonstration
//     const results = {
//       success: [],
//       failed: []
//     };
    
//     imageIds.forEach((id, index) => {
//       if (Math.random() > 0.1) { // 90% success rate
//         results.success.push({ imageId: id, processingTime: `${100 + Math.random() * 200}ms` });
//       } else {
//         results.failed.push(id);
//       }
//     });
    
//     return {
//       processed: results.success.length,
//       failed: results.failed.length,
//       total: imageIds.length,
//       processingTime: "2000ms",
//       successRate: `${Math.round((results.success.length / imageIds.length) * 100)}%`,
//       results
//     };
//   },

//   async getWebsites() {
//     await new Promise(resolve => setTimeout(resolve, 500));
//     return [
//       { id: "site1", name: "TechBlog", domain: "techblog.com" },
//       { id: "site2", name: "Innovation Hub", domain: "innovationhub.com" },
//       { id: "site3", name: "AI News", domain: "ainews.com" }
//     ];
//   }
// };

// // Replace mockApi with your actual API
// const api = mockApi;

// // Utility functions
// const formatFileSize = (bytes) => {
//   if (bytes < 1024) return bytes + ' B';
//   if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
//   return (bytes / 1048576).toFixed(2) + ' MB';
// };

// const formatDate = (dateString) => {
//   const date = new Date(dateString);
//   return date.toLocaleDateString('en-US', {
//     month: 'short',
//     day: 'numeric',
//     hour: '2-digit',
//     minute: '2-digit'
//   });
// };

// export default function ImageMetadata() {
//   // State management
//   const [images, setImages] = useState([]);
//   const [selectedImages, setSelectedImages] = useState([]);
//   const [websites, setWebsites] = useState([]);
//   const [selectedWebsite, setSelectedWebsite] = useState("");
//   const [isLoading, setIsLoading] = useState(false);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [filter, setFilter] = useState('all');
//   const [showSettings, setShowSettings] = useState(false);
//   const [toasts, setToasts] = useState([]);
//   const [processingStatus, setProcessingStatus] = useState([]);

//   // Processing options
//   const [processOptions, setProcessOptions] = useState({
//     action: 'add',
//     copyright: `© ${new Date().getFullYear()}`,
//     author: 'AI Content Generator',
//     removeGPS: true,
//     optimize: true,
//     maxWidth: 1920,
//     quality: 85
//   });

//   // Toast management
//   const addToast = useCallback((message, type = 'success') => {
//     const id = Math.random().toString(36).substr(2, 9);
//     setToasts(prev => [...prev, { id, message, type }]);
//     setTimeout(() => {
//       setToasts(prev => prev.filter(t => t.id !== id));
//     }, 5000);
//   }, []);

//   const removeToast = useCallback((id) => {
//     setToasts(prev => prev.filter(t => t.id !== id));
//   }, []);

//   // Load websites on mount
//   useEffect(() => {
//     loadWebsites();
//   }, []);

//   // Load images when website changes
//   useEffect(() => {
//     if (selectedWebsite || websites.length > 0) {
//       loadImages();
//     }
//   }, [selectedWebsite]);

//   const loadWebsites = async () => {
//     try {
//       const data = await api.getWebsites();
//       setWebsites(data);
//       if (data.length > 0 && !selectedWebsite) {
//         setSelectedWebsite(data[0].id);
//       }
//     } catch (error) {
//       addToast("Failed to load websites", "error");
//       console.error('Error loading websites:', error);
//     }
//   };

//   const loadImages = async () => {
//     setIsLoading(true);
//     try {
//       const data = await api.getContentImages(selectedWebsite || undefined);
//       setImages(data);
//       addToast(`Loaded ${data.length} images`, "info");
//     } catch (error) {
//       addToast("Failed to load images", "error");
//       console.error('Error loading images:', error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleSelectAll = () => {
//     if (selectedImages.length === filteredImages.length) {
//       setSelectedImages([]);
//     } else {
//       setSelectedImages(filteredImages.map(img => img.id));
//     }
//   };

//   const handleSelectImage = (imageId) => {
//     setSelectedImages(prev =>
//       prev.includes(imageId)
//         ? prev.filter(id => id !== imageId)
//         : [...prev, imageId]
//     );
//   };

//   const handleBatchProcess = async () => {
//     if (selectedImages.length === 0) {
//       addToast("Please select images to process", "warning");
//       return;
//     }

//     setIsProcessing(true);
    
//     // Initialize processing status
//     const initialStatus = selectedImages.map(id => ({
//       imageId: id,
//       status: 'pending'
//     }));
//     setProcessingStatus(initialStatus);

//     try {
//       // Update status to processing
//       setProcessingStatus(prev => 
//         prev.map(s => ({ ...s, status: 'processing' }))
//       );

//       const result = await api.batchProcessMetadata(selectedImages, processOptions);
      
//       // Update status based on results
//       if (result.results) {
//         setProcessingStatus(prev => 
//           prev.map(s => ({
//             ...s,
//             status: result.results.success.some(success => success.imageId === s.imageId) 
//               ? 'success' 
//               : 'failed'
//           }))
//         );
//       }

//       const actionText = 
//         processOptions.action === 'add' ? 'Added metadata to' : 
//         processOptions.action === 'strip' ? 'Stripped metadata from' : 
//         'Updated metadata for';

//       addToast(
//         `${actionText} ${result.processed} of ${result.total} images (${result.successRate})`,
//         result.failed > 0 ? "warning" : "success"
//       );
      
//       // Reload images to show updated metadata status
//       await loadImages();
//       setSelectedImages([]);
      
//       // Clear processing status after a delay
//       setTimeout(() => {
//         setProcessingStatus([]);
//       }, 3000);
      
//     } catch (error) {
//       addToast(error.message || "Failed to process images", "error");
//       console.error('Batch processing error:', error);
//     } finally {
//       setIsProcessing(false);
//     }
//   };

//   // Filter images based on selected filter
//   const filteredImages = useMemo(() => {
//     return images.filter(img => {
//       if (selectedWebsite && img.websiteId !== selectedWebsite) {
//         return false;
//       }
//       switch (filter) {
//         case 'with-metadata':
//           return img.hasMetadata;
//         case 'without-metadata':
//           return !img.hasMetadata;
//         case 'ai-generated':
//           return img.isAIGenerated;
//         default:
//           return true;
//       }
//     });
//   }, [images, filter, selectedWebsite]);

//   // Calculate statistics
//   const stats = useMemo(() => ({
//     total: images.length,
//     withMetadata: images.filter(img => img.hasMetadata).length,
//     withoutMetadata: images.filter(img => !img.hasMetadata).length,
//     aiGenerated: images.filter(img => img.isAIGenerated).length,
//     totalSize: images.reduce((sum, img) => sum + img.size, 0)
//   }), [images]);

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Toast Container */}
//       <div className="fixed top-4 right-4 z-50 space-y-2">
//         {toasts.map(toast => (
//           <div
//             key={toast.id}
//             className={`
//               flex items-center justify-between p-4 rounded-lg shadow-lg min-w-[300px]
//               ${toast.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
//                 toast.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
//                 toast.type === 'info' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
//                 'bg-green-50 text-green-800 border border-green-200'}
//             `}
//           >
//             <div className="flex items-center">
//               {toast.type === 'error' || toast.type === 'warning' ? 
//                 <AlertTriangle className="w-5 h-5 mr-2" /> :
//                toast.type === 'info' ? 
//                 <Info className="w-5 h-5 mr-2" /> :
//                 <CheckCircle className="w-5 h-5 mr-2" />}
//               <span className="text-sm font-medium">{toast.message}</span>
//             </div>
//             <button
//               onClick={() => removeToast(toast.id)}
//               className="ml-4 text-gray-400 hover:text-gray-600"
//             >
//               <X className="w-4 h-4" />
//             </button>
//           </div>
//         ))}
//       </div>

//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {/* Header */}
//         <div className="mb-8">
//           <h1 className="text-3xl font-bold text-gray-900 mb-2">
//             Image Metadata Manager
//           </h1>
//           <p className="text-gray-600">
//             Batch process metadata for AI-generated and uploaded images
//           </p>
//         </div>

//         {/* Statistics Cards */}
//         <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
//           <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm text-gray-600">Total</p>
//                 <p className="text-2xl font-bold">{stats.total}</p>
//                 <p className="text-xs text-gray-500">{formatFileSize(stats.totalSize)}</p>
//               </div>
//               <FileImage className="w-8 h-8 text-blue-500" />
//             </div>
//           </div>

//           <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm text-gray-600">Protected</p>
//                 <p className="text-2xl font-bold text-green-600">{stats.withMetadata}</p>
//                 <p className="text-xs text-gray-500">
//                   {stats.total > 0 ? `${Math.round((stats.withMetadata / stats.total) * 100)}%` : '0%'}
//                 </p>
//               </div>
//               <Shield className="w-8 h-8 text-green-500" />
//             </div>
//           </div>

//           <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm text-gray-600">Unprotected</p>
//                 <p className="text-2xl font-bold text-yellow-600">{stats.withoutMetadata}</p>
//                 <p className="text-xs text-gray-500">
//                   {stats.total > 0 ? `${Math.round((stats.withoutMetadata / stats.total) * 100)}%` : '0%'}
//                 </p>
//               </div>
//               <AlertTriangle className="w-8 h-8 text-yellow-500" />
//             </div>
//           </div>

//           <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm text-gray-600">AI Generated</p>
//                 <p className="text-2xl font-bold text-purple-600">{stats.aiGenerated}</p>
//                 <p className="text-xs text-gray-500">
//                   {stats.total > 0 ? `${Math.round((stats.aiGenerated / stats.total) * 100)}%` : '0%'}
//                 </p>
//               </div>
//               <Zap className="w-8 h-8 text-purple-500" />
//             </div>
//           </div>

//           <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm text-gray-600">Selected</p>
//                 <p className="text-2xl font-bold text-indigo-600">{selectedImages.length}</p>
//                 <p className="text-xs text-gray-500">Ready</p>
//               </div>
//               <CheckCircle className="w-8 h-8 text-indigo-500" />
//             </div>
//           </div>
//         </div>

//         {/* Settings Panel */}
//         <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
//           <button
//             onClick={() => setShowSettings(!showSettings)}
//             className="w-full px-6 py-4 flex items-center justify-between text-left"
//           >
//             <div className="flex items-center">
//               <Settings className="w-5 h-5 mr-2 text-gray-600" />
//               <span className="font-medium">Processing Settings</span>
//             </div>
//             <svg 
//               className={`w-5 h-5 text-gray-400 transition-transform ${showSettings ? 'rotate-180' : ''}`}
//               fill="none" 
//               stroke="currentColor" 
//               viewBox="0 0 24 24"
//             >
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
//             </svg>
//           </button>
          
//           {showSettings && (
//             <div className="px-6 pb-6 border-t border-gray-100">
//               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Action
//                   </label>
//                   <select
//                     value={processOptions.action}
//                     onChange={(e) => setProcessOptions({...processOptions, action: e.target.value})}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                   >
//                     <option value="add">Add Metadata</option>
//                     <option value="strip">Strip All Metadata</option>
//                     <option value="update">Update Existing Metadata</option>
//                   </select>
//                 </div>

//                 {processOptions.action !== 'strip' && (
//                   <>
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Copyright
//                       </label>
//                       <input
//                         type="text"
//                         value={processOptions.copyright}
//                         onChange={(e) => setProcessOptions({...processOptions, copyright: e.target.value})}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                       />
//                     </div>

//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Author/Artist
//                       </label>
//                       <input
//                         type="text"
//                         value={processOptions.author}
//                         onChange={(e) => setProcessOptions({...processOptions, author: e.target.value})}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                       />
//                     </div>
//                   </>
//                 )}

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Optimization
//                   </label>
//                   <div className="space-y-2">
//                     <label className="flex items-center">
//                       <input
//                         type="checkbox"
//                         checked={processOptions.removeGPS}
//                         onChange={(e) => setProcessOptions({...processOptions, removeGPS: e.target.checked})}
//                         className="rounded border-gray-300 text-blue-600"
//                       />
//                       <span className="ml-2 text-sm">Remove GPS Data</span>
//                     </label>
//                     <label className="flex items-center">
//                       <input
//                         type="checkbox"
//                         checked={processOptions.optimize}
//                         onChange={(e) => setProcessOptions({...processOptions, optimize: e.target.checked})}
//                         className="rounded border-gray-300 text-blue-600"
//                       />
//                       <span className="ml-2 text-sm">Optimize for Web</span>
//                     </label>
//                   </div>
//                 </div>

//                 {processOptions.optimize && (
//                   <>
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Max Width (px)
//                       </label>
//                       <input
//                         type="number"
//                         value={processOptions.maxWidth}
//                         onChange={(e) => setProcessOptions({...processOptions, maxWidth: parseInt(e.target.value)})}
//                         min="640"
//                         max="3840"
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                       />
//                     </div>

//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Quality (1-100)
//                       </label>
//                       <input
//                         type="number"
//                         value={processOptions.quality}
//                         onChange={(e) => setProcessOptions({...processOptions, quality: parseInt(e.target.value)})}
//                         min="1"
//                         max="100"
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                       />
//                     </div>
//                   </>
//                 )}
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Main Content */}
//         <div className="bg-white rounded-lg shadow-sm border border-gray-200">
//           {/* Toolbar */}
//           <div className="px-6 py-4 border-b border-gray-200">
//             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//               <div className="flex flex-wrap items-center gap-3">
//                 <select
//                   value={selectedWebsite}
//                   onChange={(e) => setSelectedWebsite(e.target.value)}
//                   className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
//                 >
//                   <option value="">All Websites</option>
//                   {websites.map(site => (
//                     <option key={site.id} value={site.id}>{site.name}</option>
//                   ))}
//                 </select>

//                 <div className="flex items-center gap-2">
//                   <Filter className="w-4 h-4 text-gray-500" />
//                   <select
//                     value={filter}
//                     onChange={(e) => setFilter(e.target.value)}
//                     className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
//                   >
//                     <option value="all">All Images</option>
//                     <option value="with-metadata">With Metadata</option>
//                     <option value="without-metadata">Without Metadata</option>
//                     <option value="ai-generated">AI Generated</option>
//                   </select>
//                 </div>

//                 <button
//                   onClick={handleSelectAll}
//                   className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
//                 >
//                   {selectedImages.length === filteredImages.length && filteredImages.length > 0 
//                     ? 'Deselect All' 
//                     : 'Select All'}
//                 </button>

//                 {selectedImages.length > 0 && (
//                   <span className="text-sm text-gray-600">
//                     {selectedImages.length} selected
//                   </span>
//                 )}
//               </div>

//               <div className="flex gap-2">
//                 <button
//                   onClick={loadImages}
//                   disabled={isLoading}
//                   className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
//                 >
//                   <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
//                 </button>
//                 <button
//                   onClick={handleBatchProcess}
//                   disabled={selectedImages.length === 0 || isProcessing}
//                   className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
//                 >
//                   {isProcessing ? (
//                     <>
//                       <Loader2 className="w-4 h-4 mr-2 animate-spin" />
//                       Processing...
//                     </>
//                   ) : (
//                     <>
//                       <Shield className="w-4 h-4 mr-2" />
//                       Process Selected
//                     </>
//                   )}
//                 </button>
//               </div>
//             </div>
//           </div>

//           {/* Image Grid */}
//           <div className="p-6">
//             {isLoading ? (
//               <div className="flex flex-col items-center justify-center py-16">
//                 <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
//                 <p className="text-gray-600">Loading images...</p>
//               </div>
//             ) : filteredImages.length > 0 ? (
//               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
//                 {filteredImages.map(image => {
//                   const processingItem = processingStatus.find(s => s.imageId === image.id);
//                   const isSelected = selectedImages.includes(image.id);
                  
//                   return (
//                     <div
//                       key={image.id}
//                       className={`
//                         relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all
//                         ${isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'}
//                         ${processingItem?.status === 'processing' ? 'animate-pulse' : ''}
//                       `}
//                       onClick={() => handleSelectImage(image.id)}
//                     >
//                       <div className="aspect-square bg-gray-100">
//                         <img
//                           src={image.url}
//                           alt={image.contentTitle}
//                           className="w-full h-full object-cover"
//                         />
//                       </div>
                      
//                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
//                         <div className="absolute bottom-0 left-0 right-0 p-2 text-white">
//                           <p className="text-xs font-medium truncate">{image.contentTitle}</p>
//                           <p className="text-xs opacity-90">{formatFileSize(image.size)}</p>
//                         </div>
//                       </div>

//                       <div className="absolute top-2 right-2 flex flex-col gap-1">
//                         {image.hasMetadata && (
//                           <span className="bg-green-500 text-white p-1 rounded">
//                             <Shield className="w-3 h-3" />
//                           </span>
//                         )}
//                         {image.isAIGenerated && (
//                           <span className="bg-purple-500 text-white text-[10px] px-1 py-0.5 rounded font-bold">
//                             AI
//                           </span>
//                         )}
//                       </div>

//                       <div className="absolute top-2 left-2">
//                         <div className={`
//                           w-5 h-5 rounded border-2 flex items-center justify-center
//                           ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white/80 border-gray-300'}
//                         `}>
//                           {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
//                         </div>
//                       </div>

//                       {processingItem && (
//                         <div className="absolute inset-0 flex items-center justify-center bg-black/50">
//                           {processingItem.status === 'processing' && (
//                             <Loader2 className="w-8 h-8 animate-spin text-white" />
//                           )}
//                           {processingItem.status === 'success' && (
//                             <CheckCircle className="w-8 h-8 text-green-400" />
//                           )}
//                           {processingItem.status === 'failed' && (
//                             <AlertTriangle className="w-8 h-8 text-red-400" />
//                           )}
//                         </div>
//                       )}
//                     </div>
//                   );
//                 })}
//               </div>
//             ) : (
//               <div className="flex flex-col items-center justify-center py-16">
//                 <Image className="w-12 h-12 text-gray-400 mb-4" />
//                 <h3 className="text-lg font-medium text-gray-900 mb-2">No images found</h3>
//                 <p className="text-sm text-gray-500">
//                   {selectedWebsite 
//                     ? 'No images match your filter criteria.' 
//                     : 'Select a website to view images.'}
//                 </p>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }