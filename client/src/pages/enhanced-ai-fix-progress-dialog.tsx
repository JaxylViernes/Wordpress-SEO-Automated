// Enhanced AI Fix Progress Dialog Component
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Brain,
  Wrench,
  Search,
  Globe,
  Image,
  FileText,
  Settings,
  Zap,
  Target,
  Clock,
} from "lucide-react";

interface ProgressStep {
  id: string;
  message: string;
  status: "pending" | "running" | "completed" | "error";
  timestamp?: string;
  level: "info" | "success" | "warning" | "error";
  progress?: number; // 0-100 for individual step progress
  details?: string[]; // Sub-step details
}

interface AIFixProgress {
  isOpen: boolean;
  currentStep: number;
  totalSteps: number;
  steps: ProgressStep[];
  overallStatus: "initializing" | "running" | "completed" | "error";
  estimatedTimeRemaining?: number;
  realTimeLogs: string[]; // Real backend logs
  currentOperation?: string;
  progressPercentage: number;
}

export const EnhancedAIFixProgressDialog = () => {
  const [progress, setProgress] = useState<AIFixProgress>({
    isOpen: false,
    currentStep: 0,
    totalSteps: 0,
    steps: [],
    overallStatus: "initializing",
    realTimeLogs: [],
    progressPercentage: 0,
  });

  // Function to start the progress dialog with real backend polling
  const startProgressWithPolling = async (websiteId: string, dryRun: boolean) => {
    // Initialize progress dialog
    const initialSteps = createInitialSteps(dryRun);
    setProgress({
      isOpen: true,
      currentStep: 0,
      totalSteps: initialSteps.length,
      steps: initialSteps,
      overallStatus: "initializing",
      realTimeLogs: [`Starting AI fix analysis (dry run: ${dryRun})`],
      currentOperation: "Initializing...",
      progressPercentage: 0,
    });

    // Start the actual backend process
    try {
      // Option 1: Use polling to check progress
      const pollProgress = async () => {
        // You can implement a progress endpoint that returns current status
        // For now, we'll simulate with the actual backend response structure
        
        // Make the actual API call
        const response = await fetch(`/api/user/websites/${websiteId}/ai-fix`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dryRun })
        });
        
        const result = await response.json();
        
        // Update progress with real backend logs
        if (result.detailedLog) {
          updateProgressWithBackendLogs(result.detailedLog, result.success);
        }
        
        return result;
      };

      // Start polling or direct execution
      const result = await pollProgress();
      return result;

    } catch (error) {
      updateProgressError(error.message);
      throw error;
    }
  };

  // Function to update progress with real backend logs
  const updateProgressWithBackendLogs = (logs: string[], success: boolean) => {
    setProgress(prev => {
      const newSteps = [...prev.steps];
      const newRealTimeLogs = [...logs];
      
      // Parse backend logs to update step status
      logs.forEach((log, index) => {
        const stepIndex = Math.floor((index / logs.length) * newSteps.length);
        if (newSteps[stepIndex]) {
          if (log.includes('✅')) {
            newSteps[stepIndex].status = 'completed';
            newSteps[stepIndex].level = 'success';
          } else if (log.includes('❌') || log.includes('Error')) {
            newSteps[stepIndex].status = 'error';
            newSteps[stepIndex].level = 'error';
          } else if (log.includes('ℹ️') || log.includes('Starting') || log.includes('Processing')) {
            newSteps[stepIndex].status = 'running';
            newSteps[stepIndex].level = 'info';
          }
          
          // Extract timestamp and clean message
          const timestampMatch = log.match(/\[([\d:]+)\]/);
          const cleanMessage = log.replace(/\[[\d:]+\]\s*[✅❌⚠️ℹ️]?\s*/, '');
          
          newSteps[stepIndex].message = cleanMessage || newSteps[stepIndex].message;
          newSteps[stepIndex].timestamp = timestampMatch ? timestampMatch[1] : undefined;
        }
      });

      const completedSteps = newSteps.filter(s => s.status === 'completed').length;
      const progressPercentage = Math.round((completedSteps / newSteps.length) * 100);

      return {
        ...prev,
        steps: newSteps,
        realTimeLogs: newRealTimeLogs,
        progressPercentage,
        currentStep: completedSteps,
        overallStatus: success ? 'completed' : (progressPercentage === 100 ? 'completed' : 'running'),
        currentOperation: success ? 'Completed!' : `Processing step ${completedSteps + 1}...`
      };
    });
  };

  const updateProgressError = (errorMessage: string) => {
    setProgress(prev => ({
      ...prev,
      overallStatus: 'error',
      currentOperation: 'Error occurred',
      realTimeLogs: [...prev.realTimeLogs, `❌ Error: ${errorMessage}`]
    }));
  };

  const createInitialSteps = (isDryRun: boolean): ProgressStep[] => [
    {
      id: "init",
      message: `Starting AI fix analysis ${isDryRun ? '(dry run)' : '(live changes)'}`,
      status: "pending",
      level: "info"
    },
    {
      id: "website_load",
      message: "Loading website details and SEO report",
      status: "pending",
      level: "info"
    },
    {
      id: "wordpress_connection",
      message: "Testing WordPress connection",
      status: "pending",
      level: "info"
    },
    {
      id: "content_analysis",
      message: "Analyzing website content for fixable issues",
      status: "pending",
      level: "info"
    },
    {
      id: "ai_recommendations",
      message: "Getting AI fix recommendations",
      status: "pending",
      level: "info"
    },
    {
      id: "fixes_prioritization",
      message: "Prioritizing and filtering fixes",
      status: "pending",
      level: "info"
    },
    {
      id: "meta_descriptions",
      message: "Processing meta description fixes",
      status: "pending",
      level: "info"
    },
    {
      id: "heading_structure",
      message: "Processing heading structure fixes",
      status: "pending",
      level: "info"
    },
    {
      id: "alt_text",
      message: "Processing image alt text fixes",
      status: "pending",
      level: "info"
    },
    {
      id: "completion",
      message: isDryRun ? "Dry run analysis complete" : "AI fixes applied successfully",
      status: "pending",
      level: "success"
    }
  ];

  const getStatusIcon = (status: ProgressStep["status"], level: ProgressStep["level"]) => {
    switch (status) {
      case "running":
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      case "completed":
        return level === "success" ? 
          <CheckCircle className="w-4 h-4 text-green-500" /> :
          <CheckCircle className="w-4 h-4 text-gray-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-gray-300" />;
    }
  };

  const getStepIcon = (stepId: string) => {
    const iconMap = {
      init: Zap,
      website_load: Globe,
      wordpress_connection: Settings,
      content_analysis: Search,
      ai_recommendations: Brain,
      fixes_prioritization: Target,
      meta_descriptions: FileText,
      heading_structure: FileText,
      alt_text: Image,
      completion: CheckCircle
    };
    
    const Icon = iconMap[stepId] || Settings;
    return <Icon className="w-4 h-4" />;
  };

  const formatTimeRemaining = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Expose functions to parent component
  useEffect(() => {
    window.enhancedAiFixProgress = {
      start: startProgressWithPolling,
      close: () => setProgress(prev => ({ ...prev, isOpen: false }))
    };
  }, []);

  return (
    <Dialog 
      open={progress.isOpen} 
      onOpenChange={(open) => {
        if (!open && progress.overallStatus === "completed") {
          setProgress(prev => ({ ...prev, isOpen: false }));
        }
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Brain className="w-5 h-5 mr-2 text-purple-600" />
              AI Fix Service
              {progress.overallStatus === "running" && (
                <Badge variant="secondary" className="ml-2">
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  {progress.currentOperation || "Processing..."}
                </Badge>
              )}
              {progress.overallStatus === "completed" && (
                <Badge variant="default" className="ml-2">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Completed
                </Badge>
              )}
              {progress.overallStatus === "error" && (
                <Badge variant="destructive" className="ml-2">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Error
                </Badge>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {progress.progressPercentage}% Complete
            </div>
          </DialogTitle>
          <DialogDescription>
            <div className="space-y-3">
              {/* Overall Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress: {progress.currentStep} of {progress.totalSteps} steps</span>
                  <span className="font-medium">{progress.progressPercentage}%</span>
                </div>
                <div className="relative">
                  <Progress 
                    value={progress.progressPercentage} 
                    className="h-3"
                  />
                  {/* Animated progress indicator */}
                  {progress.overallStatus === "running" && (
                    <div 
                      className="absolute top-0 h-3 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"
                      style={{ width: "20%", left: `${Math.max(0, progress.progressPercentage - 10)}%` }}
                    />
                  )}
                </div>
              </div>
              
              {/* Time Estimates */}
              {progress.overallStatus === "running" && progress.estimatedTimeRemaining && (
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  Estimated time remaining: {formatTimeRemaining(progress.estimatedTimeRemaining)}
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[60vh] overflow-hidden">
          {/* Step Progress */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Step Progress</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {progress.steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-start space-x-3 p-3 rounded-lg transition-all duration-500 ${
                    step.status === "running"
                      ? "bg-blue-50 border-l-4 border-blue-400 transform scale-105"
                      : step.status === "completed"
                      ? step.level === "success"
                        ? "bg-green-50 border-l-4 border-green-400"
                        : "bg-gray-50 border-l-4 border-gray-300"
                      : step.status === "error"
                      ? "bg-red-50 border-l-4 border-red-400"
                      : "bg-gray-50"
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getStepIcon(step.id)}
                  </div>
                  <div className="flex-shrink-0 mt-0.5">
                    {getStatusIcon(step.status, step.level)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${
                        step.status === "running" ? "text-blue-900" :
                        step.status === "completed" ? 
                          step.level === "success" ? "text-green-900" : "text-gray-900" :
                        step.status === "error" ? "text-red-900" : "text-gray-600"
                      }`}>
                        {step.message}
                      </p>
                      {step.timestamp && (
                        <span className="text-xs text-gray-500 ml-2">
                          {step.timestamp}
                        </span>
                      )}
                    </div>
                    
                    {/* Individual step progress bar */}
                    {step.status === "running" && (
                      <div className="mt-2">
                        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out animate-pulse" 
                            style={{ width: `${step.progress || 60}%` }} 
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Step details */}
                    {step.details && step.details.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {step.details.map((detail, idx) => (
                          <div key={idx} className="text-xs text-gray-600 pl-2 border-l-2 border-gray-200">
                            {detail}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Logs */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Live Backend Logs</h3>
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs max-h-80 overflow-y-auto">
              {progress.realTimeLogs.length > 0 ? (
                progress.realTimeLogs.map((log, index) => (
                  <div 
                    key={index} 
                    className={`mb-1 ${
                      log.includes('✅') ? 'text-green-300' :
                      log.includes('❌') ? 'text-red-300' :
                      log.includes('⚠️') ? 'text-yellow-300' :
                      'text-gray-300'
                    }`}
                  >
                    <span className="opacity-60">{index + 1:03d}</span> {log}
                  </div>
                ))
              ) : (
                <div className="text-gray-500">Waiting for backend logs...</div>
              )}
              
              {/* Blinking cursor when running */}
              {progress.overallStatus === "running" && (
                <div className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1" />
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          {progress.overallStatus === "completed" && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">AI Fix process completed successfully!</span>
            </div>
          )}
          
          {progress.overallStatus === "error" && (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">AI Fix process encountered an error</span>
            </div>
          )}
          
          {progress.overallStatus === "running" && (
            <div className="flex items-center space-x-2 text-blue-600">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="font-medium">Processing... {progress.currentOperation}</span>
            </div>
          )}

          <Button
            onClick={() => setProgress(prev => ({ ...prev, isOpen: false }))}
            variant={progress.overallStatus === "running" ? "outline" : "default"}
            disabled={progress.overallStatus === "running"}
          >
            {progress.overallStatus === "running" ? "Processing..." : "Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedAIFixProgressDialog;