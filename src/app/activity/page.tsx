"use client";

import { useState, useEffect, useRef } from "react";
import {
  Zap, Sparkles, RefreshCw, Activity, Search,
  ChevronDown, Calendar, X, Bot, Send,
  Loader2, AlertCircle, Hash,
} from "lucide-react";
import { useGateway } from "@/lib/gateway-context";
import { ConnectGate } from "@/components/ui/connect-gate";
import { useCachedRpc } from "@/lib/use-cached-rpc";
import {
  type ActivityItem,
  parseAndGroup,
  srcColor,
} from "@/lib/activity-parser";

// ─── Source Icon ───

function SourceIcon({ type, className }: { type: string; className?: string }) {
  if (type === "discord") return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" /></svg>;
  if (type === "telegram") return <Send className={className} />;
  if (type === "cron") return <RefreshCw className={className} />;
  return <Bot className={className} />;
}

// ─── Helpers ───

function safeStr(v: unknown): string { return typeof v === "string" ? v : v == null ? "" : String(v); }

// ═══════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════

const PAGE_SIZE = 30;

export default function ActivityPage() {
  const { rpc, status: gwStatus } = useGateway();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<string | null>(null);
  const [showChannels, setShowChannels] = useState(false);
  const [showHeartbeats, setShowHeartbeats] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const fetchActivity = async (): Promise<ActivityItem[]> => {
    const rawSessions = await rpc.listSessions();
    let sessionsList: Array<Record<string, unknown>> = [];
    if (Array.isArray(rawSessions)) sessionsList = rawSessions;
    else if (rawSessions && typeof rawSessions === "object") {
      const obj = rawSessions as Record<string, unknown>;
      if (Array.isArray(obj.sessions)) sessionsList = obj.sessions as Array<Record<string, unknown>>;
    }
    const promises = sessionsList.slice(0, 15).map(async (session) => {
      try {
        const key = safeStr(session.key || session.sessionKey || session.id);
        if (!key) return [];
        const label = safeStr(session.displayName || session.label || key);
        const history = await rpc.getChatHistory(key, { limit: 500 });
        return parseAndGroup(key, label, history);
      } catch { return []; }
    });
    const results = await Promise.all(promises);
    const all: ActivityItem[] = [];
    for (const r of results) all.push(...r);
    all.sort((a, b) => b.timestamp - a.timestamp);
    return all;
  };

  const { data: items, loading, error, refresh, stale } = useCachedRpc<ActivityItem[]>("activity", fetchActivity, 60_000);

  const hasTriggeredFetch = useRef(false);
  useEffect(() => {
    if (gwStatus === "connected" && !hasTriggeredFetch.current) {
      hasTriggeredFetch.current = true;
      if (!items || error) refresh();
    }
  }, [gwStatus, items, error, refresh]);
  const allItems = items ?? [];

  // Filter
  let filtered = allItems;
  if (!showHeartbeats) filtered = filtered.filter(i => i.icon !== Activity);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(i => i.description.toLowerCase().includes(q) || i.trigger?.toLowerCase().includes(q) || i.steps.some(s => s.description.toLowerCase().includes(q)));
  }
  if (channelFilter) filtered = filtered.filter(i => i.channelName === channelFilter);

  const channels = [...new Set(allItems.map(i => i.channelName).filter(Boolean))];
  const total = filtered.length;
  const hasMore = visibleCount < filtered.length;
  const visible = filtered.slice(0, visibleCount);

  // Group by date
  const dateGroups: { date: string; items: ActivityItem[] }[] = [];
  let cd = "";
  for (const item of visible) {
    if (item.date !== cd) { cd = item.date; dateGroups.push({ date: item.date, items: [] }); }
    dateGroups[dateGroups.length - 1].items.push(item);
  }

  if (gwStatus !== "connected") {
    return <ConnectGate>{null}</ConnectGate>;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/5 bg-white/[0.01] px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-orange-500/10">
              <Zap className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Activity</h1>
              <p className="text-sm text-white/40">
                {loading && !items ? "Loading..." : <>{total} activities{stale && <Loader2 className="inline h-3 w-3 ml-1.5 animate-spin text-orange-400/50" />}</>}
              </p>
            </div>
          </div>
          <button onClick={refresh} disabled={loading && !items} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60 transition-all disabled:opacity-30">
            <RefreshCw className={`h-3.5 w-3.5 ${loading && !items ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <div className="flex items-center gap-2">
          {channels.length > 1 && (
            <div className="relative">
              <button onClick={() => setShowChannels(!showChannels)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] transition-all border ${channelFilter ? "bg-blue-500/10 border-blue-500/20 text-blue-300" : "bg-white/[0.03] border-white/5 text-white/40 hover:bg-white/[0.06]"}`}>
                <Hash className="h-3.5 w-3.5" />
                {channelFilter || "All Channels"}
                <ChevronDown className={`h-3 w-3 transition-transform ${showChannels ? "rotate-180" : ""}`} />
              </button>
              {showChannels && (
                <div className="absolute left-0 top-full mt-1 w-48 rounded-xl bg-[#1a1614] border border-white/10 shadow-2xl z-50 overflow-hidden">
                  <button onClick={() => { setChannelFilter(null); setShowChannels(false); }} className={`w-full text-left px-4 py-2.5 text-[13px] hover:bg-white/5 ${!channelFilter ? "text-orange-300" : "text-white/50"}`}>All Channels</button>
                  {channels.map(ch => (
                    <button key={ch} onClick={() => { setChannelFilter(ch); setShowChannels(false); }} className={`w-full text-left px-4 py-2.5 text-[13px] hover:bg-white/5 ${channelFilter === ch ? "text-orange-300" : "text-white/50"}`}>{ch}</button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button onClick={() => setShowHeartbeats(!showHeartbeats)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] transition-all ${showHeartbeats ? "bg-white/10 text-white/50" : "bg-white/[0.03] text-white/25 hover:bg-white/[0.06]"}`}>
            <Activity className="h-3.5 w-3.5" /> Heartbeats
          </button>
          <div className="relative flex-1 ml-auto max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search activities..." className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-[13px] text-white placeholder-white/25 focus:outline-none focus:border-orange-500/50 transition-all" />
            {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/40"><X className="h-4 w-4" /></button>}
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {loading && !items && <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 text-orange-400 animate-spin" /></div>}
        {error && <div className="flex flex-col items-center justify-center py-20 text-red-400/60"><AlertCircle className="h-12 w-12 mb-3" /><p className="text-sm">{error}</p><button onClick={refresh} className="mt-3 text-[13px] text-orange-400 hover:text-orange-300">Retry</button></div>}

        {!(loading && !items) && !error && dateGroups.map(({ date, items: dayItems }) => (
          <div key={date}>
            <div className="sticky top-0 z-10 px-6 py-2.5 bg-[#161210]/95 backdrop-blur-sm border-b border-white/5">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-orange-400" />
                <span className="text-[14px] font-semibold text-white/60">{date}</span>
                <span className="text-[11px] text-white/20">{dayItems.length}</span>
              </div>
            </div>
            {dayItems.map((item) => (
              <ActivityRow key={item.id} item={item} expanded={expandedId === item.id} onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)} />
            ))}
          </div>
        ))}

        {!(loading && !items) && !error && hasMore && (
          <div className="flex justify-center py-6">
            <button onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60 transition-all border border-white/5">
              <ChevronDown className="h-4 w-4" /> Show more ({filtered.length - visibleCount} remaining)
            </button>
          </div>
        )}

        {!(loading && !items) && !error && allItems.length > 0 && !hasMore && (
          <div className="flex justify-center py-6"><span className="text-[12px] text-white/15">All {total} activities shown</span></div>
        )}

        {!(loading && !items) && !error && allItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-white/30">
            <Activity className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-lg">No activity yet</p>
            <p className="text-sm mt-1">Activity will appear here as your agent works</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Activity Row ───

function ActivityRow({ item, expanded, onToggle }: { item: ActivityItem; expanded: boolean; onToggle: () => void }) {
  const Icon = item.icon;
  const isHeartbeat = item.icon === Activity;

  return (
    <div className={isHeartbeat ? "opacity-30 hover:opacity-60 transition-opacity" : ""}>
      <button
        onClick={onToggle}
        className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition-all ${expanded ? "bg-white/[0.04]" : "hover:bg-white/[0.03]"}`}
      >
        <span className="w-20 text-[13px] text-orange-300/70 flex-shrink-0 tabular-nums">{item.time}</span>
        <Icon className={`h-4 w-4 flex-shrink-0 ${item.sourceType === "cron" ? "text-orange-400" : item.iconColor}`} />
        <span className="text-[14px] text-white/80 font-medium truncate flex-1">{item.description}</span>
        {item.stepCount > 0 && <span className="text-[11px] text-white/20 flex-shrink-0 tabular-nums">{item.stepCount} steps</span>}
        {item.channelName && (
          <span className="flex items-center gap-1.5 flex-shrink-0">
            <SourceIcon type={item.sourceType} className={`h-3.5 w-3.5 ${srcColor[item.sourceType]}`} />
            <span className="text-[12px] text-white/25">{item.channelName}</span>
          </span>
        )}
        <ChevronDown className={`h-3 w-3 text-white/15 flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="px-5 pb-4 pt-2 space-y-3">
          {item.trigger && (
            <div className="text-[13px] text-white/40 leading-relaxed">{item.trigger}</div>
          )}
          {item.steps.length > 0 && (
            <div className="rounded-lg bg-white/[0.02] border border-white/5 divide-y divide-white/5">
              {item.steps.map((step, i) => {
                const SIcon = step.icon;
                return (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 text-[13px]">
                    <SIcon className="h-3.5 w-3.5 text-white/20 flex-shrink-0" />
                    <span className="text-white/50">{step.description}</span>
                  </div>
                );
              })}
            </div>
          )}
          {item.responsePreviews.length > 0 && (
            <div className="space-y-2">
              {item.responsePreviews.map((text, i) => (
                <div key={i} className="text-[13px] text-white/35 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto rounded-lg bg-white/[0.02] px-3 py-2">{text}</div>
              ))}
            </div>
          )}
          {item.model && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-white/15">
              <Sparkles className="h-3 w-3" />
              {item.model.replace("claude-", "").replace("-20250514", "")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
