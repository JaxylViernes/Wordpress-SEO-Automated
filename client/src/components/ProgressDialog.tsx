import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  XCircle,
  Loader2,
  Zap,
  Brain,
  Search,
  Wrench,
  Database,
  AlertCircle,
  Globe,
  PenTool,
  Shield,
  Activity
} from 'lucide-react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  icon?: string;
}

interface ProgressDialogProps {
  open: boolean;
  onClose?: () => void;
  title: string;
  description?: string;
  progress: number;
  logs: LogEntry[];
  status: 'idle' | 'running' | 'success' | 'error';
  result?: any;
  type: 'seo-analysis' | 'ai-fix';
}

const ProgressDialog: React.FC<ProgressDialogProps> = ({
  open,
  onClose,
  title,
  description,
  progress: initialProgress,
  logs,
  status,
  result,
  type
}) => {
  const [currentActivity, setCurrentActivity] = useState<string>('Starting...');
  const [activityIcon, setActivityIcon] = useState<React.ReactNode>(<Loader2 className="h-4 w-4 animate-spin" />);
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Memoize simulated activities to prevent recreation on every render
  const simulatedActivities = useMemo(() => {
    return type === 'seo-analysis' ? [
      { at: 5, message: 'Connecting to website...', icon: <Globe className="h-4 w-4 text-purple-500 animate-pulse" /> },
      { at: 15, message: 'Tracking SEO issues...', icon: <Database className="h-4 w-4 text-blue-500 animate-pulse" /> },
      { at: 25, message: 'Analyzing page structure...', icon: <Search className="h-4 w-4 text-blue-500 animate-pulse" /> },
      { at: 35, message: 'Checking meta tags...', icon: <AlertCircle className="h-4 w-4 text-orange-500 animate-pulse" /> },
      { at: 45, message: 'Evaluating content quality...', icon: <PenTool className="h-4 w-4 text-indigo-500 animate-pulse" /> },
      { at: 55, message: 'Running AI content analysis...', icon: <Brain className="h-4 w-4 text-purple-500 animate-pulse" /> },
      { at: 70, message: 'Calculating SEO score...', icon: <Activity className="h-4 w-4 text-blue-500 animate-pulse" /> },
      { at: 85, message: 'Generating recommendations...', icon: <Wrench className="h-4 w-4 text-green-500 animate-pulse" /> },
      { at: 95, message: 'Finalizing report...', icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> },
    ] : [
      { at: 5, message: 'Analyzing fixable issues...', icon: <Search className="h-4 w-4 text-blue-500 animate-pulse" /> },
      { at: 15, message: 'Connecting to WordPress...', icon: <Globe className="h-4 w-4 text-purple-500 animate-pulse" /> },
      { at: 25, message: 'Creating backup...', icon: <Shield className="h-4 w-4 text-green-500 animate-pulse" /> },
      { at: 35, message: 'Fetching content...', icon: <Database className="h-4 w-4 text-blue-500 animate-pulse" /> },
      { at: 45, message: 'Applying AI fixes...', icon: <Zap className="h-4 w-4 text-purple-500 animate-pulse" /> },
      { at: 60, message: 'Updating meta tags...', icon: <Wrench className="h-4 w-4 text-orange-500 animate-pulse" /> },
      { at: 75, message: 'Improving content quality...', icon: <PenTool className="h-4 w-4 text-indigo-500 animate-pulse" /> },
      { at: 90, message: 'Saving changes...', icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> },
    ];
  }, [type]); // Only recreate when type changes

  // Start progress simulation when dialog opens and status is running
  useEffect(() => {
    if (open && status === 'running') {
      setSimulatedProgress(initialProgress || 0);
      
      // Clear any existing interval
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      
      // Start new progress simulation
      progressInterval.current = setInterval(() => {
        setSimulatedProgress(prev => {
          if (prev >= 95) {
            if (progressInterval.current) {
              clearInterval(progressInterval.current);
            }
            return 95; // Stay at 95% until actual completion
          }
          // Slow down as we get closer to completion
          const increment = prev < 50 ? 2 : prev < 80 ? 1 : 0.5;
          return Math.min(prev + increment, 95);
        });
      }, 500);
    }
    
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [open, status, initialProgress]);
  
  // Update progress to 100% when status changes to success
  useEffect(() => {
    if (status === 'success') {
      setSimulatedProgress(100);
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    } else if (status === 'error') {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }
  }, [status]);

  // Update activity based on progress or logs
  useEffect(() => {
    // If we have real logs, use the latest one
    if (logs && logs.length > 0) {
      const latestLog = logs[logs.length - 1];
      const cleanMessage = latestLog.message
        .replace(/\[\d{2}:\d{2}:\d{2}\]\s*/g, '')
        .replace(/[🔧🕒🤖✅ℹ️📋🚀📊🎯🔄❌⚠️]/g, '')
        .trim();
      
      setCurrentActivity(cleanMessage);
      
      // Set appropriate icon
      const message = cleanMessage.toLowerCase();
      if (message.includes('success') || message.includes('complete')) {
        setActivityIcon(<CheckCircle2 className="h-4 w-4 text-green-500" />);
      } else if (message.includes('error') || message.includes('failed')) {
        setActivityIcon(<XCircle className="h-4 w-4 text-red-500" />);
      } else if (message.includes('wordpress')) {
        setActivityIcon(<Globe className="h-4 w-4 text-purple-500 animate-pulse" />);
      } else if (message.includes('analyzing') || message.includes('analysis')) {
        setActivityIcon(<Brain className="h-4 w-4 text-blue-500 animate-pulse" />);
      } else if (message.includes('fix')) {
        setActivityIcon(<Zap className="h-4 w-4 text-purple-500 animate-pulse" />);
      } else {
        setActivityIcon(<Loader2 className="h-4 w-4 animate-spin" />);
      }
    } else {
      // Use simulated activities based on progress
      const currentSimulated = simulatedActivities
        .filter(activity => activity.at <= simulatedProgress)
        .pop();
      
      if (currentSimulated) {
        setCurrentActivity(currentSimulated.message);
        setActivityIcon(currentSimulated.icon);
      }
    }
  }, [logs, simulatedProgress, simulatedActivities]); // simulatedActivities is now stable due to useMemo

  const getDisplayProgress = () => {
    // Use provided progress if it's actively updating, otherwise use simulated
    return initialProgress > simulatedProgress ? initialProgress : simulatedProgress;
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'running':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getProgressBarColor = () => {
    if (status === 'error') return 'bg-red-500';
    if (status === 'success') return 'bg-green-500';
    return '';
  };

  const getCompletionSummary = () => {
    if (status !== 'success' || !result) return null;
    
    if (type === 'ai-fix' && result.stats) {
      const { fixesSuccessful, fixesFailed, totalIssuesFound, estimatedImpact } = result.stats;
      return (
        <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-green-800">
              ✅ AI Fixes Applied Successfully!
            </span>
            <Badge variant="default" className="bg-green-600">
              {fixesSuccessful} fixed
            </Badge>
          </div>
          <div className="flex gap-4 text-xs text-gray-600">
            <span>Issues found: {totalIssuesFound}</span>
            {fixesFailed > 0 && (
              <span className="text-orange-600">Failed: {fixesFailed}</span>
            )}
            {estimatedImpact && (
              <span>Impact: {estimatedImpact}</span>
            )}
          </div>
        </div>
      );
    }
    
    if (type === 'seo-analysis' && result) {
      const criticalIssues = result.issues?.filter((i: any) => i.type === 'critical').length || 0;
      return (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-blue-800">
              ✅ SEO Analysis Complete!
            </span>
            <Badge variant="default" className={`${result.score >= 80 ? 'bg-green-600' : result.score >= 60 ? 'bg-yellow-600' : 'bg-red-600'}`}>
              Score: {result.score}/100
            </Badge>
          </div>
          {result.issues && (
            <div className="flex gap-4 text-xs text-gray-600">
              <span>Total issues: {result.issues.length}</span>
              {criticalIssues > 0 && (
                <span className="text-red-600">Critical: {criticalIssues}</span>
              )}
              {result.contentAnalysis && (
                <span className="text-purple-600">AI-Enhanced ✨</span>
              )}
            </div>
          )}
        </div>
      );
    }
    
    return null;
  };

  // Inline styles for shimmer animation (avoiding styled-jsx issues)
  const shimmerStyle = {
    animation: 'shimmer 2s infinite',
    backgroundSize: '200% 100%',
  };

  return (
    <Dialog open={open} onOpenChange={status !== 'running' ? onClose : undefined}>
      <DialogContent className="max-w-md" aria-describedby="progress-dialog-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'ai-fix' ? (
              <Zap className="h-5 w-5 text-purple-500" />
            ) : (
              <Brain className="h-5 w-5 text-blue-500" />
            )}
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription id="progress-dialog-description">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Activity Status */}
          <div className="flex items-center gap-3 min-h-[48px] p-3 bg-gray-50 rounded-lg">
            <div className={getStatusColor()}>
              {activityIcon}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${getStatusColor()}`}>
                {currentActivity}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Progress</span>
              <span>{Math.round(getDisplayProgress())}%</span>
            </div>
            <div className="relative">
              <Progress 
                value={getDisplayProgress()} 
                className={`h-3 transition-all duration-300 ${getProgressBarColor()}`}
              />
              {/* Animated stripe overlay for running state */}
              {status === 'running' && (
                <div className="absolute inset-0 h-3 overflow-hidden rounded-full pointer-events-none">
                  <div 
                    className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    style={shimmerStyle}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Completion Summary */}
          {getCompletionSummary()}

          {/* Action Buttons */}
          {status !== 'running' && (
            <div className="flex justify-end pt-2">
              <Button
                onClick={onClose}
                variant={status === 'success' ? 'default' : 'outline'}
                className={status === 'success' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {status === 'success' ? 'Done' : 'Close'}
              </Button>
            </div>
          )}

          {/* Activity indicator for running state */}
          {status === 'running' && (
            <div className="flex justify-center">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="flex gap-1">
                  <span className="inline-block w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="inline-block w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="inline-block w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                Processing...(This may take some time)
              </div>
            </div>
          )}
        </div>

        <style>
          {`
            @keyframes shimmer {
              0% {
                transform: translateX(-100%);
              }
              100% {
                transform: translateX(100%);
              }
            }
          `}
        </style>
      </DialogContent>
    </Dialog>
  );
};

export default ProgressDialog;