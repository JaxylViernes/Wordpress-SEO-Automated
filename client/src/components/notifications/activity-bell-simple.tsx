"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

type ActivityLog = {
  id: string;
  type: string;
  description: string;
  websiteId: string | null;
  createdAt: string; // ISO
  metadata?: Record<string, any>;
};

const typeLabels: Record<string, string> = {
  content_published: "Content Published",
  content_generated: "Content Generated",
  content_scheduled: "Content Scheduled",
  seo_analysis: "SEO Analysis",
  seo_issue: "SEO Issue",
  website_connected: "Website Connected",
  seo_autofix: "SEO Auto-Fix",
};

function normalizeActivityResponse(j: any): ActivityLog[] {
  // Array directly
  if (Array.isArray(j)) return j;

  // Common keys
  const keys = ["activities", "logs", "items", "data", "results"];
  for (const k of keys) {
    const v = j?.[k];
    if (Array.isArray(v)) return v;
    if (v && typeof v === "object") {
      // nested common: data.items
      if (Array.isArray(v.items)) return v.items;
      if (Array.isArray(v.results)) return v.results;
    }
  }

  console.warn("[ActivityBell] Unrecognized response shape:", j);
  return [];
}

async function fetchWithFallback(): Promise<ActivityLog[]> {
  // Try /api/user/activity-logs first (your logs show this endpoint returning real data)
  const endpoints = ["/api/user/activity-logs?limit=20", "/api/activity-logs?limit=20", "/api/user/activity-logs", "/api/activity-logs"];

  for (const url of endpoints) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) continue;
      const j = await r.json();
      const arr = normalizeActivityResponse(j);
      if (arr.length) return arr.slice(0, 20);
      // If empty array, still return (maybe there truly are no logs)
      if (Array.isArray(j)) return [];
    } catch (e) {
      // try next endpoint
      console.warn(`[ActivityBell] fetch failed for ${url}`, e);
    }
  }
  return [];
}

export default function ActivityBellSimple() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("activity:lastSeenAt");
    if (saved) setLastSeenAt(saved);
  }, []);

  async function refresh() {
    const arr = await fetchWithFallback();
    setLogs(arr);
  }

  useEffect(() => {
    refresh();
    timer.current = window.setInterval(refresh, 15000); // every 15s
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, []);

  const unread = useMemo(() => {
    if (!lastSeenAt) return logs.length;
    const t = new Date(lastSeenAt).getTime();
    return logs.filter(l => new Date(l.createdAt).getTime() > t).length;
  }, [logs, lastSeenAt]);

  function markAllRead() {
    const now = new Date().toISOString();
    setLastSeenAt(now);
    localStorage.setItem("activity:lastSeenAt", now);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative bg-white p-1 rounded-full text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 bg-red-500 rounded-full text-[10px] leading-4 text-white flex items-center justify-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-medium">Activity</div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={refresh}>Refresh</Button>
            {unread > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead}>
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-80">
          {logs.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No activity yet</div>
          ) : (
            <ul className="divide-y">
              {logs.map((l) => {
                const label = typeLabels[l.type] || l.type;
                const isUnread = !lastSeenAt || new Date(l.createdAt) > new Date(lastSeenAt);
                return (
                  <li key={l.id} className="p-3 hover:bg-gray-50">
                    <div className="flex items-start gap-2">
                      <span className={`mt-1 h-2 w-2 rounded-full ${isUnread ? "bg-primary-500" : "bg-gray-300"}`} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{label}</div>
                        <div className="text-sm">{l.description}</div>
                        <div className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(l.createdAt), { addSuffix: true })}
                        </div>
                        {/* {l.metadata && Object.keys(l.metadata).length > 0 && (
                          <details className="mt-1 text-xs text-gray-600">
                            <summary className="hover:text-gray-800">Details</summary>
                            <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                              {JSON.stringify(l.metadata, null, 2)}
                            </pre>
                          </details>
                        )} */}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
