import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  Settings,
  Play,
  Pause,
  AlertCircle,
  CheckCircle,
  Bot,
  Sparkles,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  Cpu,
  Globe,
  Info,
} from "lucide-react";

// API functions for auto-generation
const autoGenApi = {
  async getSchedules(websiteId?: string) {
    const url = websiteId ? `/api/user/auto-schedules?websiteId=${websiteId}` : '/api/user/auto-schedules';
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('Auto-schedules API not implemented yet');
        return [];
      }
      throw new Error('Failed to fetch schedules');
    }
    
    const data = await response.json();
    return data.schedules || data || [];
  },

  async createSchedule(data: any) {
    const response = await fetch('/api/user/auto-schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to create schedule');
    }
    
    return response.json();
  },

  async updateSchedule(scheduleId: string, data: any) {
    const response = await fetch(`/api/user/auto-schedules/${scheduleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to update schedule');
    }
    
    return response.json();
  },

  async deleteSchedule(scheduleId: string) {
    const response = await fetch(`/api/user/auto-schedules/${scheduleId}`, {
      method: "DELETE",
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to delete schedule');
    }
    
    return response.json();
  },

  async toggleSchedule(scheduleId: string, isActive: boolean) {
    const response = await fetch(`/api/user/auto-schedules/${scheduleId}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to toggle schedule');
    }
    
    return response.json();
  },

  async runScheduleNow(scheduleId: string) {
    const response = await fetch(`/api/user/auto-schedules/${scheduleId}/run`, {
      method: "POST",
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to run schedule');
    }
    
    return response.json();
  },
};

const frequencyOptions = [
  { value: "daily", label: "Daily", description: "Generate content every day" },
  {
    value: "twice_weekly",
    label: "Twice a Week",
    description: "Monday & Thursday",
  },
  { value: "weekly", label: "Weekly", description: "Once per week" },
  {
    value: "biweekly",
    label: "Every 2 Weeks",
    description: "Every other week",
  },
  { value: "monthly", label: "Monthly", description: "Once per month" },
  {
    value: "custom",
    label: "Custom Schedule",
    description: "Set specific days",
  },
];

const dayOptions = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const getProviderIcon = (provider: string) => {
  switch (provider) {
    case "openai":
      return <Cpu className="w-4 h-4 text-green-600" />;
    case "anthropic":
      return <Bot className="w-4 h-4 text-purple-600" />;
    case "gemini":
      return <Sparkles className="w-4 h-4 text-blue-600" />;
    default:
      return <Bot className="w-4 h-4 text-gray-600" />;
  }
};

const getProviderName = (provider: string) => {
  switch (provider) {
    case 'openai':
      return 'OpenAI GPT-4';
    case 'anthropic':
      return 'Anthropic Claude';
    case 'gemini':
      return 'Google Gemini';
    default:
      return provider || 'Default AI';
  }
};

// Helper function to convert time between timezones for display
const convertTimeToUserTimezone = (
  time: string, 
  fromTimezone: string, 
  toTimezone: string
): string => {
  try {
    if (fromTimezone === toTimezone) return time;
    
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    
    // Create a date object for today with the specified time
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    
    // Get the time in the source timezone
    const sourceFormatter = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: fromTimezone,
      hour12: true
    });
    
    // Get the time in the target timezone
    const targetFormatter = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: toTimezone,
      hour12: true
    });
    
    // This is a simplified conversion - for production, use a proper library
    const offset = getTimezoneOffset(fromTimezone) - getTimezoneOffset(toTimezone);
    const adjustedHours = (hours - Math.floor(offset / 60) + 24) % 24;
    const adjustedMinutes = (minutes - (offset % 60) + 60) % 60;
    
    const adjustedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), adjustedHours, adjustedMinutes);
    return targetFormatter.format(adjustedDate);
  } catch (error) {
    console.error('Error converting timezone:', error);
    return time;
  }
};

// Helper to get timezone offset
const getTimezoneOffset = (timezone: string): number => {
  try {
    const now = new Date();
    const tzDate = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
    return Math.round((tzDate.getTime() - utcDate.getTime()) / (1000 * 60));
  } catch {
    return 0;
  }
};

interface AutoContentSchedulerProps {
  websites: any[];
  selectedWebsite: string;
  onScheduleCreated?: () => void;
}

export default function AutoContentScheduler({
  websites,
  selectedWebsite,
  onScheduleCreated,
}: AutoContentSchedulerProps) {
  // FETCH USER SETTINGS
  const { data: userSettings } = useQuery({
    queryKey: ["/api/user/settings"],
    queryFn: async () => {
      const response = await fetch("/api/user/settings", {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      return response.json();
    },
  });

  // Helper function to get browser timezone
  const getUserTimezone = () => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  };

  // Get user's configured timezone from settings or fallback to browser
  const getUserConfiguredTimezone = () => {
    return userSettings?.profile?.timezone || getUserTimezone();
  };

  // Format time with timezone consideration
  const formatTimeWithTimezone = (time: string, timezone: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
      hour12: true
    });
    
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return formatter.format(date);
  };

  // Get next run time with proper timezone calculation
// Replace your existing getNextRunTime function with this fixed version
const getNextRunTime = (schedule: any) => {
  if (!schedule.isActive) return 'Schedule paused';
  
  const scheduledTime = schedule.localTime || schedule.timeOfDay;
  const scheduleTimezone = schedule.timezone || 'UTC';
  const userTimezone = getUserConfiguredTimezone();
  
  try {
    // Use UTC time if available (this is the most reliable approach)
    const utcTime = schedule.utcTime || schedule.timeOfDay;
    const [utcHours, utcMinutes] = utcTime.split(':').map(Number);
    
    const now = new Date();
    const next = new Date();
    
    // Set the next run time using UTC
    next.setUTCHours(utcHours, utcMinutes, 0, 0);
    
    // If this time has already passed today, move to tomorrow
    if (next <= now) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    
    // Apply frequency rules
    const { frequency, customDays } = schedule;
    
    if (frequency === 'daily') {
      // Already handled above - runs every day at the same time
    } else if (frequency === 'weekly') {
      // Run on Mondays
      while (next.getDay() !== 1) {
        next.setDate(next.getDate() + 1);
      }
    } else if (frequency === 'twice_weekly') {
      // Run on Mondays and Thursdays
      const targetDays = [1, 4];
      while (!targetDays.includes(next.getDay())) {
        next.setDate(next.getDate() + 1);
      }
    } else if (frequency === 'monthly') {
      // Run on the 1st of each month
      const currentDay = next.getDate();
      if (currentDay !== 1) {
        // Move to the 1st of next month
        if (currentDay > 1) {
          next.setMonth(next.getMonth() + 1);
        }
        next.setDate(1);
        
        // Reset the time since setDate might change it
        next.setUTCHours(utcHours, utcMinutes, 0, 0);
        
        // Check if we need to move to next month
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
        }
      }
    } else if (frequency === 'biweekly') {
      if (schedule.lastRun) {
        // Run every 2 weeks from last run
        const lastRun = new Date(schedule.lastRun);
        const daysSinceLastRun = Math.floor((now.getTime() - lastRun.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastRun < 14) {
          // Next run is 14 days from last run
          next.setTime(lastRun.getTime() + 14 * 24 * 60 * 60 * 1000);
          // Reset to the scheduled time
          next.setUTCHours(utcHours, utcMinutes, 0, 0);
        }
      }
      
      // Align to Monday
      while (next.getDay() !== 1) {
        next.setDate(next.getDate() + 1);
      }
    } else if (frequency === 'custom' && customDays?.length > 0) {
      // Run on custom selected days
      const dayMap: any = { 
        'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 
        'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 0 
      };
      const targetDayNumbers = customDays.map((d: string) => dayMap[d]);
      while (!targetDayNumbers.includes(next.getDay())) {
        next.setDate(next.getDate() + 1);
      }
    }
    
    // Format the result based on timezone preferences
    if (scheduleTimezone !== userTimezone) {
      // Show both schedule timezone and user timezone
      const scheduleFormatter = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: scheduleTimezone,
        hour12: true
      });
      
      const userFormatter = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: userTimezone,
        hour12: true
      });
      
      return `${scheduleFormatter.format(next)} ${scheduleTimezone} (${userFormatter.format(next)} your time)`;
    }
    
    // Same timezone - simpler display
    const formatter = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: userTimezone  // Display in USER's timezone, not schedule's timezone
    });
    
    return formatter.format(next);
  } catch (error) {
    console.error('Error calculating next run time:', error);
    console.error('Schedule data:', {
      localTime: schedule.localTime,
      utcTime: schedule.utcTime,
      timeOfDay: schedule.timeOfDay,
      timezone: schedule.timezone
    });
    
    // Fallback: try to show something useful
    if (schedule.localTime && schedule.timezone) {
      return `${schedule.localTime} ${schedule.timezone} daily`;
    }
    
    return 'Unable to calculate';
  }
};

  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null);
  const [runningSchedule, setRunningSchedule] = useState<string | null>(null);
  const [toast, setToast] = useState<any>(null);

  // Form state for creating new schedule
  const [scheduleForm, setScheduleForm] = useState({
    websiteId: selectedWebsite || "",
    name: "",
    frequency: "weekly",
    customDays: [] as string[],
    timeOfDay: '09:00',
    localTime: '09:00', // Store local time separately
    timezone: getUserTimezone(), // Initialize with browser timezone
    localTimeDisplay: '', // Will be set when creating
    
    // Content settings
    topics: [] as string[],
    topicRotation: 'random',
    keywords: '',
    tone: 'professional',
    wordCount: 800,
    seoOptimized: true,
    brandVoice: "",
    targetAudience: "",
    eatCompliance: false,
    aiProvider: "openai",

    // Image settings
    includeImages: false,
    imageCount: 1,
    imageStyle: "natural",
    autoPublish: true,
    publishDelay: 0,
    
    // Limits
    maxMonthlyPosts: 30,
    maxDailyCost: 5.00,
    
    isActive: true
  });

  const [formErrors, setFormErrors] = useState<any>({});
  const [topicInput, setTopicInput] = useState("");

  // Update timezone when user settings are loaded
  useEffect(() => {
    if (userSettings?.profile?.timezone) {
      setScheduleForm(prev => ({
        ...prev,
        timezone: userSettings.profile.timezone
      }));
    }
  }, [userSettings?.profile?.timezone]);

  useEffect(() => {
    loadSchedules();
  }, [selectedWebsite]);

  useEffect(() => {
    if (selectedWebsite) {
      setScheduleForm((prev) => ({ ...prev, websiteId: selectedWebsite }));
    }
  }, [selectedWebsite]);

  const loadSchedules = async () => {
    try {
      setIsLoading(true);
      const data = await autoGenApi.getSchedules(selectedWebsite);
      setSchedules(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error loading schedules:', error);
      setSchedules([]);
    } finally {
      setIsLoading(false);
    }
  };

  const showToastMessage = (
    title: string,
    description: string,
    variant = "default"
  ) => {
    setToast({ title, description, variant });
    setTimeout(() => setToast(null), 5000);
  };

  const validateForm = () => {
    const errors: any = {};

    if (!scheduleForm.websiteId) errors.websiteId = "Please select a website";
    if (!scheduleForm.name.trim()) errors.name = "Schedule name is required";
    if (scheduleForm.topics.length === 0)
      errors.topics = "At least one topic is required";
    if (
      scheduleForm.frequency === "custom" &&
      scheduleForm.customDays.length === 0
    ) {
      errors.customDays = "Please select at least one day for custom schedule";
    }
    if (scheduleForm.wordCount < 100 || scheduleForm.wordCount > 5000) {
      errors.wordCount = "Word count must be between 100 and 5000";
    }
    if (scheduleForm.maxDailyCost < 0.01 || scheduleForm.maxDailyCost > 100) {
      errors.maxDailyCost = "Daily cost limit must be between $0.01 and $100";
    }

    if (scheduleForm.includeImages) {
      if (scheduleForm.imageCount < 1 || scheduleForm.imageCount > 3) {
        errors.imageCount = "Image count must be between 1 and 3";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddTopic = () => {
    if (topicInput.trim() && !scheduleForm.topics.includes(topicInput.trim())) {
      setScheduleForm((prev) => ({
        ...prev,
        topics: [...prev.topics, topicInput.trim()],
      }));
      setTopicInput("");
    }
  };

  const handleRemoveTopic = (topic: string) => {
    setScheduleForm((prev) => ({
      ...prev,
      topics: prev.topics.filter((t) => t !== topic),
    }));
  };

 const handleCreateSchedule = async () => {
  if (!validateForm()) return;

  setIsCreating(true);
  try {
    // Explicitly build schedule data WITHOUT utcTime
    // This forces the backend to calculate the correct UTC time
    const scheduleData = {
      // Basic info
      websiteId: scheduleForm.websiteId,
      name: scheduleForm.name,
      frequency: scheduleForm.frequency,
      customDays: scheduleForm.customDays,
      
      // Time and timezone - NO UTC TIME
      timeOfDay: scheduleForm.timeOfDay,
      localTime: scheduleForm.timeOfDay,
      timezone: scheduleForm.timezone || getUserConfiguredTimezone() || 'UTC',
      localTimeDisplay: `${scheduleForm.timeOfDay} ${scheduleForm.timezone || getUserConfiguredTimezone() || 'UTC'}`,
      // DO NOT include utcTime - backend must calculate it
      
      // Content settings
      topics: scheduleForm.topics,
      topicRotation: scheduleForm.topicRotation,
      keywords: scheduleForm.keywords,
      tone: scheduleForm.tone,
      wordCount: scheduleForm.wordCount,
      brandVoice: scheduleForm.brandVoice,
      targetAudience: scheduleForm.targetAudience,
      eatCompliance: scheduleForm.eatCompliance,
      seoOptimized: scheduleForm.seoOptimized,
      
      // AI and image settings
      aiProvider: scheduleForm.aiProvider,
      includeImages: scheduleForm.includeImages,
      imageCount: scheduleForm.imageCount,
      imageStyle: scheduleForm.imageStyle,
      
      // Publishing settings
      autoPublish: scheduleForm.autoPublish,
      publishDelay: scheduleForm.publishDelay,
      
      // Limits
      maxMonthlyPosts: scheduleForm.maxMonthlyPosts,
      maxDailyCost: scheduleForm.maxDailyCost,
      
      // Status
      isActive: true
    };
    
    console.log('Creating schedule with timezone data:', {
      localTime: scheduleData.localTime,
      timezone: scheduleData.timezone,
      display: scheduleData.localTimeDisplay,
      // Verify NO utcTime is being sent
      hasUtcTime: 'utcTime' in scheduleData ? 'YES - ERROR!' : 'NO - Good'
    });
    
    // Log warning if timezone is Japan for debugging
    if (scheduleData.timezone === 'Asia/Tokyo') {
      console.log(`⚠️ Japan timezone schedule:`, {
        input: `${scheduleData.localTime} JST`,
        expectedUTC: `Should be converted to UTC-9 on backend`,
        example: `00:59 JST should become 15:59 UTC`
      });
    }
    
    const result = await autoGenApi.createSchedule(scheduleData);
    
    // Verify the result has correct UTC time
    if (result.timezone === 'Asia/Tokyo' && result.utcTime === result.localTime) {
      console.error('❌ UTC conversion failed! UTC time same as local time');
      showToastMessage(
        "Warning",
        "Schedule created but timezone conversion may not be working correctly",
        "destructive"
      );
    }
    
    await loadSchedules();
    setShowCreateDialog(false);
    resetForm();
    
    // Build description with actual times
    let scheduleDescription = '';
    if (scheduleData.timezone === 'Asia/Tokyo') {
      const [hours, minutes] = scheduleData.localTime.split(':').map(Number);
      const phTime = hours === 0 ? '23' : String((hours - 1 + 24) % 24).padStart(2, '0');
      scheduleDescription = scheduleForm.autoPublish 
        ? `Content will be generated at ${scheduleData.localTime} Japan time (${phTime}:${String(minutes).padStart(2, '0')} Philippines time)`
        : `Content will be generated at ${scheduleData.localTime} Japan time and saved as draft`;
    } else {
      scheduleDescription = scheduleForm.autoPublish 
        ? (scheduleForm.publishDelay === 0 
          ? `Content will be generated and published immediately at ${scheduleData.localTime} ${scheduleData.timezone}`
          : `Content will be generated at ${scheduleData.localTime} ${scheduleData.timezone} and published ${scheduleForm.publishDelay} hours later`)
        : `Content will be generated at ${scheduleData.localTime} ${scheduleData.timezone} and saved as draft`;
    }
    
    showToastMessage(
      "Schedule Created",
      scheduleDescription
    );
    
    if (onScheduleCreated) onScheduleCreated();
  } catch (error: any) {
    showToastMessage(
      "Failed to create schedule",
      error.message,
      "destructive"
    );
  } finally {
    setIsCreating(false);
  }
};



  const handleToggleSchedule = async (
    scheduleId: string,
    currentStatus: boolean
  ) => {
    try {
      await autoGenApi.toggleSchedule(scheduleId, !currentStatus);
      await loadSchedules();
      showToastMessage(
        currentStatus ? "Schedule Paused" : "Schedule Activated",
        currentStatus
          ? "Auto-generation has been paused"
          : "Auto-generation has been activated"
      );
    } catch (error: any) {
      showToastMessage(
        "Failed to toggle schedule",
        error.message,
        "destructive"
      );
    }
  };

  const handleRunNow = async (scheduleId: string) => {
    try {
      setRunningSchedule(scheduleId);
      const result = await autoGenApi.runScheduleNow(scheduleId);
      showToastMessage('Generation Started', 'Content generation has been triggered successfully');
      await loadSchedules();
    } catch (error: any) {
      showToastMessage("Failed to run schedule", error.message, "destructive");
    } finally {
      setRunningSchedule(null);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm("Are you sure you want to delete this schedule? This action cannot be undone.")) return;

    try {
      await autoGenApi.deleteSchedule(scheduleId);
      await loadSchedules();
      showToastMessage("Schedule Deleted", "The schedule has been removed");
    } catch (error: any) {
      showToastMessage(
        "Failed to delete schedule",
        error.message,
        "destructive"
      );
    }
  };

  const resetForm = () => {
    setScheduleForm({
      websiteId: selectedWebsite || "",
      name: "",
      frequency: "weekly",
      customDays: [],
      timeOfDay: '09:00',
      localTime: '09:00',
      timezone: getUserConfiguredTimezone(),
      localTimeDisplay: '',
      topics: [],
      topicRotation: "random",
      keywords: "",
      tone: "professional",
      wordCount: 800,
      seoOptimized: true,
      brandVoice: "",
      targetAudience: "",
      eatCompliance: false,
      aiProvider: "openai",
      includeImages: false,
      imageCount: 1,
      imageStyle: "natural",
      autoPublish: true,
      publishDelay: 0,
      maxMonthlyPosts: 30,
      maxDailyCost: 5.0,
      isActive: true,
    });
    setTopicInput("");
    setFormErrors({});
    setShowAdvancedSettings(false);
  };

  const getFrequencyLabel = (frequency: string, customDays?: string[]) => {
    if (frequency === "custom" && customDays?.length > 0) {
      return `Custom (${customDays.join(", ")})`;
    }
    return (
      frequencyOptions.find((f) => f.value === frequency)?.label || frequency
    );
  };

  const formatCost = (cost: any) => {
    const numCost = typeof cost === 'string' ? parseFloat(cost) : cost;
    return isNaN(numCost) ? '0.00' : numCost.toFixed(2);
  };

  // Schedule display component
  const ScheduleTimezoneDisplay = ({ schedule }: any) => {
    const userTimezone = getUserConfiguredTimezone();
    const scheduleTime = schedule.localTime || schedule.timeOfDay;
    const scheduleTimezone = schedule.timezone || 'UTC';
    
    // Show warning if timezone differs from current user timezone
    const showTimezoneWarning = scheduleTimezone !== userTimezone;
    
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <span className="flex items-center">
          <Clock className="w-4 h-4 mr-1" />
          {scheduleTime}
        </span>
        <span className="flex items-center">
          <Globe className="w-4 h-4 mr-1" />
          {scheduleTimezone}
        </span>
        {showTimezoneWarning && (
          <span className="flex items-center text-amber-600 text-xs bg-amber-50 px-2 py-0.5 rounded">
            <Info className="w-3 h-3 mr-1" />
            Runs at {convertTimeToUserTimezone(scheduleTime, scheduleTimezone, userTimezone)} in your timezone
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border max-w-md ${
            toast.variant === "destructive"
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-green-50 border-green-200 text-green-800"
          }`}
        >
          <div className="flex items-start">
            <div className="flex-1">
              <div className="font-medium text-sm">{toast.title}</div>
              <div className="text-xs opacity-90 mt-1">{toast.description}</div>
            </div>
            <button
              onClick={() => setToast(null)}
              className="ml-3 opacity-70 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Auto-Generation Schedules
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Automatically generate and publish content on a schedule
            </p>
          </div>
          <button
            onClick={() => setShowCreateDialog(true)}
            disabled={!selectedWebsite}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Create Schedule
          </button>
        </div>

        {/* Schedules List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="border rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : schedules.length > 0 ? (
          <div className="space-y-4">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="border rounded-lg overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium text-gray-900">
                          {schedule.name}
                        </h4>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            schedule.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {schedule.isActive ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <Pause className="w-3 h-3 mr-1" />
                              Paused
                            </>
                          )}
                        </span>
                        {getProviderIcon(schedule.aiProvider)}
                        <span className="text-xs text-gray-500">
                          {getProviderName(schedule.aiProvider)}
                        </span>
                      </div>

                      <div className="mt-2">
                        <ScheduleTimezoneDisplay schedule={schedule} />
                      </div>

                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {getFrequencyLabel(
                            schedule.frequency,
                            schedule.customDays
                          )}
                        </span>
                        <span>•</span>
                        <span>{schedule.topics?.length || 0} topics</span>
                        <span>•</span>
                        <span>{schedule.wordCount} words</span>
                        {schedule.includeImages && (
                          <>
                            <span>•</span>
                            <span className="text-orange-600">
                              {schedule.imageCount} image
                              {schedule.imageCount > 1 ? "s" : ""}
                            </span>
                          </>
                        )}
                        {schedule.autoPublish && (
                          <>
                            <span>•</span>
                            <span className="text-green-600 font-medium">
                              {schedule.publishDelay === 0 
                                ? 'Auto-publish (immediate)' 
                                : `Auto-publish (${schedule.publishDelay}h delay)`}
                            </span>
                          </>
                        )}
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-500">
                        Next run: {getNextRunTime(schedule)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleRunNow(schedule.id)}
                        disabled={runningSchedule === schedule.id}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                        title="Run now"
                      >
                        {runningSchedule === schedule.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() =>
                          handleToggleSchedule(schedule.id, schedule.isActive)
                        }
                        className="p-1.5 text-gray-600 hover:bg-gray-50 rounded"
                        title={schedule.isActive ? "Pause" : "Activate"}
                      >
                        {schedule.isActive ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() =>
                          setExpandedSchedule(
                            expandedSchedule === schedule.id
                              ? null
                              : schedule.id
                          )
                        }
                        className="p-1.5 text-gray-600 hover:bg-gray-50 rounded"
                      >
                        {expandedSchedule === schedule.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedSchedule === schedule.id && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Topics:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {schedule.topics?.map(
                              (topic: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800"
                                >
                                  {topic}
                                </span>
                              )
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-gray-500">Settings:</span>
                          <div className="mt-1 space-y-1 text-xs">
                            <div>Schedule time: {schedule.localTime || schedule.timeOfDay} {schedule.timezone || 'UTC'}</div>
                            {schedule.utcTime && (
                              <div className="text-gray-400">UTC time: {schedule.utcTime}</div>
                            )}
                            <div>Max monthly posts: {schedule.maxMonthlyPosts}</div>
                            <div>Daily cost limit: ${formatCost(schedule.maxDailyCost)}</div>
                            <div>Posts this month: {schedule.postsThisMonth || 0}</div>
                            <div>Cost today: ${formatCost(schedule.costToday || 0)}</div>
                            {schedule.autoPublish && (
                              <div className="text-green-600">
                                Publishing: {schedule.publishDelay === 0 ? 'Immediate' : `After ${schedule.publishDelay}h`}
                              </div>
                            )}
                            {schedule.keywords && (
                              <div>Keywords: {schedule.keywords}</div>
                            )}
                            {schedule.targetAudience && (
                              <div>Audience: {schedule.targetAudience}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="text-xs text-gray-500">
                          Created:{" "}
                          {new Date(schedule.createdAt).toLocaleDateString()}
                          {schedule.lastRun &&
                            ` • Last run: ${new Date(
                              schedule.lastRun
                            ).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}`}
                        </div>
                        <button
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Delete Schedule
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No schedules yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedWebsite ? 'Create a schedule to automatically generate content' : 'Select a website first'}
            </p>
            {selectedWebsite && (
              <div className="mt-4">
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Calendar className="w-3 h-3 mr-1" />
                  Create First Schedule
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Schedule Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowCreateDialog(false)}
            ></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Create Auto-Generation Schedule
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Set up automatic content generation with AI
                  </p>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  {/* Basic Settings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Schedule Name *
                      </label>
                      <input
                        type="text"
                        value={scheduleForm.name}
                        onChange={(e) =>
                          setScheduleForm((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        placeholder="e.g., Weekly Blog Posts"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      {formErrors.name && (
                        <p className="text-sm text-red-600 mt-1">
                          {formErrors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Website *
                      </label>
                      <select
                        value={scheduleForm.websiteId}
                        onChange={(e) =>
                          setScheduleForm((prev) => ({
                            ...prev,
                            websiteId: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select website</option>
                        {websites?.map((website) => (
                          <option key={website.id} value={website.id}>
                            {website.name}
                          </option>
                        ))}
                      </select>
                      {formErrors.websiteId && (
                        <p className="text-sm text-red-600 mt-1">
                          {formErrors.websiteId}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Frequency Settings */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Generation Frequency *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {frequencyOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            setScheduleForm((prev) => ({
                              ...prev,
                              frequency: option.value,
                            }))
                          }
                          className={`p-3 border-2 rounded-lg text-left transition-all ${
                            scheduleForm.frequency === option.value
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <div className="font-medium text-sm">
                            {option.label}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {option.description}
                          </div>
                        </button>
                      ))}
                    </div>

                    {scheduleForm.frequency === "custom" && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Days
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {dayOptions.map((day) => (
                            <label key={day} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={scheduleForm.customDays.includes(day)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setScheduleForm((prev) => ({
                                      ...prev,
                                      customDays: [...prev.customDays, day],
                                    }));
                                  } else {
                                    setScheduleForm((prev) => ({
                                      ...prev,
                                      customDays: prev.customDays.filter(
                                        (d) => d !== day
                                      ),
                                    }));
                                  }
                                }}
                                className="rounded border-gray-300 text-blue-600"
                              />
                              <span className="ml-2 text-sm">{day}</span>
                            </label>
                          ))}
                        </div>
                        {formErrors.customDays && (
                          <p className="text-sm text-red-600 mt-1">
                            {formErrors.customDays}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Time and Timezone Settings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Time of Day
                      </label>
                      <input
                        type="time"
                        value={scheduleForm.timeOfDay}
                        onChange={(e) =>
                          setScheduleForm((prev) => ({
                            ...prev,
                            timeOfDay: e.target.value,
                            localTime: e.target.value, // Update both
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Content will generate at this time in {scheduleForm.timezone}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Globe className="w-4 h-4 inline mr-1" />
                        Timezone
                        {userSettings?.profile?.timezone && (
                          <span className="text-xs text-blue-600 ml-2">
                            (From your account settings)
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <select
                          value={scheduleForm.timezone}
                          disabled={!!userSettings?.profile?.timezone}
                          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                            userSettings?.profile?.timezone 
                              ? 'border-gray-200 bg-gray-50 text-gray-700 cursor-not-allowed' 
                              : 'border-gray-300'
                          }`}
                        >
                          <option value={scheduleForm.timezone}>
                            {scheduleForm.timezone}
                          </option>
                        </select>
                        {userSettings?.profile?.timezone && (
                          <Info className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {userSettings?.profile?.timezone 
                          ? 'Timezone is configured in your account settings.'
                          : 'Using your browser timezone. Configure in account settings to change.'}
                      </p>
                    </div>
                  </div>

                  {/* Word Count */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Word Count
                    </label>
                    <input
                      type="number"
                      value={scheduleForm.wordCount}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, wordCount: parseInt(e.target.value) || 800 }))}
                      min="100"
                      max="5000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    {formErrors.wordCount && (
                      <p className="text-sm text-red-600 mt-1">{formErrors.wordCount}</p>
                    )}
                  </div>

                  {/* Topics */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content Topics *
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={topicInput}
                        onChange={(e) => setTopicInput(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" &&
                          (e.preventDefault(), handleAddTopic())
                        }
                        placeholder="Enter a topic and press Enter"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddTopic}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {scheduleForm.topics.map((topic, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          {topic}
                          <button
                            type="button"
                            onClick={() => handleRemoveTopic(topic)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    {formErrors.topics && (
                      <p className="text-sm text-red-600 mt-1">
                        {formErrors.topics}
                      </p>
                    )}
                  </div>

                  {/* AI Provider Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">AI Provider</label>
                    <select
                      value={scheduleForm.aiProvider}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, aiProvider: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="openai">OpenAI GPT-4O</option>
                      <option value="anthropic">Anthropic Claude</option>
                      <option value="gemini">Google Gemini</option>
                    </select>
                  </div>

                  {/* Advanced Settings Toggle */}
                  <div className="border-t pt-4">
                    <button
                      type="button"
                      onClick={() =>
                        setShowAdvancedSettings(!showAdvancedSettings)
                      }
                      className="flex items-center text-sm text-blue-600 hover:text-blue-500"
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Advanced Settings
                      {showAdvancedSettings ? (
                        <ChevronUp className="w-4 h-4 ml-1" />
                      ) : (
                        <ChevronDown className="w-4 h-4 ml-1" />
                      )}
                    </button>

                    {showAdvancedSettings && (
                      <div className="mt-4 space-y-4 pl-5 border-l-2 border-blue-100">
                        {/* Additional Settings */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
                            <select
                              value={scheduleForm.tone}
                              onChange={(e) =>
                                setScheduleForm((prev) => ({
                                  ...prev,
                                  tone: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="professional">Professional</option>
                              <option value="casual">Casual</option>
                              <option value="friendly">Friendly</option>
                              <option value="authoritative">Authoritative</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Topic Rotation</label>
                            <select
                              value={scheduleForm.topicRotation}
                              onChange={(e) => setScheduleForm(prev => ({ ...prev, topicRotation: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="random">Random</option>
                              <option value="sequential">Sequential</option>
                            </select>
                          </div>
                        </div>

                        {/* Keywords and Audience */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              SEO Keywords (optional)
                            </label>
                            <input
                              type="text"
                              value={scheduleForm.keywords}
                              onChange={(e) => setScheduleForm(prev => ({ ...prev, keywords: e.target.value }))}
                              placeholder="keyword1, keyword2, keyword3"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Target Audience (optional)
                            </label>
                            <input
                              type="text"
                              value={scheduleForm.targetAudience}
                              onChange={(e) => setScheduleForm(prev => ({ ...prev, targetAudience: e.target.value }))}
                              placeholder="e.g., Small business owners"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>

                        {/* Brand Voice */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Brand Voice Guidelines (optional)
                          </label>
                          <textarea
                            value={scheduleForm.brandVoice}
                            onChange={(e) => setScheduleForm(prev => ({ ...prev, brandVoice: e.target.value }))}
                            placeholder="Describe your brand's tone, style, and messaging preferences..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        {/* Image Settings */}
                        <div className="border border-orange-200 bg-orange-50 rounded-lg p-3">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={scheduleForm.includeImages}
                              onChange={(e) => setScheduleForm(prev => ({ ...prev, includeImages: e.target.checked }))}
                              className="rounded border-gray-300 text-orange-600"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">Generate Images with DALL-E 3</span>
                          </label>
                          
                          {scheduleForm.includeImages && (
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Number of Images</label>
                                <select
                                  value={scheduleForm.imageCount}
                                  onChange={(e) => setScheduleForm(prev => ({ ...prev, imageCount: parseInt(e.target.value) }))}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                                >
                                  <option value={1}>1 Image</option>
                                  <option value={2}>2 Images</option>
                                  <option value={3}>3 Images</option>
                                </select>
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Image Style</label>
                                <select
                                  value={scheduleForm.imageStyle}
                                  onChange={(e) => setScheduleForm(prev => ({ ...prev, imageStyle: e.target.value }))}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                                >
                                  <option value="natural">Natural</option>
                                  <option value="digital_art">Digital Art</option>
                                  <option value="photographic">Photographic</option>
                                  <option value="cinematic">Cinematic</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Auto-publish Settings */}
                        <div className="border border-green-200 bg-green-50 rounded-lg p-3">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={scheduleForm.autoPublish}
                              onChange={(e) =>
                                setScheduleForm((prev) => ({
                                  ...prev,
                                  autoPublish: e.target.checked,
                                  publishDelay: e.target.checked ? 0 : prev.publishDelay,
                                }))
                              }
                              className="rounded border-gray-300 text-green-600"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">
                              Auto-publish after generation
                            </span>
                          </label>

                          {scheduleForm.autoPublish && (
                            <div className="mt-2 text-xs text-green-700 bg-green-100 rounded p-2">
                              <div className="flex items-center">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Content will be published {scheduleForm.publishDelay === 0 ? 'immediately' : `${scheduleForm.publishDelay} hours`} after generation
                              </div>
                              <details className="mt-2">
                                <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                                  Add publish delay (optional)
                                </summary>
                                <div className="mt-2">
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Delay publication by (hours)
                                  </label>
                                  <input
                                    type="number"
                                    value={scheduleForm.publishDelay}
                                    onChange={(e) =>
                                      setScheduleForm((prev) => ({
                                        ...prev,
                                        publishDelay: Math.max(0, parseInt(e.target.value) || 0),
                                      }))
                                    }
                                    min="0"
                                    max="72"
                                    placeholder="0 (immediate)"
                                    className="w-32 px-2 py-1 text-sm border border-gray-300 rounded-md"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Leave at 0 for immediate publishing
                                  </p>
                                </div>
                              </details>
                            </div>
                          )}
                          {!scheduleForm.autoPublish && (
                            <div className="mt-2 text-xs text-amber-700 bg-amber-50 rounded p-2">
                              <AlertCircle className="w-3 h-3 inline mr-1" />
                              Generated content will be saved as draft and require manual publishing
                            </div>
                          )}
                        </div>

                        {/* Limits */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Max Monthly Posts
                            </label>
                            <input
                              type="number"
                              value={scheduleForm.maxMonthlyPosts}
                              onChange={(e) => setScheduleForm(prev => ({ ...prev, maxMonthlyPosts: parseInt(e.target.value) || 30 }))}
                              min="1"
                              max="100"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Daily Cost Limit ($)
                            </label>
                            <input
                              type="number"
                              value={scheduleForm.maxDailyCost}
                              onChange={(e) => setScheduleForm(prev => ({ ...prev, maxDailyCost: parseFloat(e.target.value) || 5 }))}
                              min="0.01"
                              max="100"
                              step="0.01"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                            {formErrors.maxDailyCost && (
                              <p className="text-sm text-red-600 mt-1">
                                {formErrors.maxDailyCost}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Additional Options */}
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={scheduleForm.seoOptimized}
                              onChange={(e) =>
                                setScheduleForm((prev) => ({
                                  ...prev,
                                  seoOptimized: e.target.checked,
                                }))
                              }
                              className="rounded border-gray-300 text-blue-600"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              SEO Optimized
                            </span>
                          </label>

                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={scheduleForm.eatCompliance}
                              onChange={(e) =>
                                setScheduleForm((prev) => ({
                                  ...prev,
                                  eatCompliance: e.target.checked,
                                }))
                              }
                              className="rounded border-gray-300 text-purple-600"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              E-E-A-T Compliance
                            </span>
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
                  onClick={handleCreateSchedule}
                  disabled={isCreating}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {isCreating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Create Schedule
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateDialog(false);
                    resetForm();
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



























