"use client";

import { useState } from "react";
import {
  Clock,
  Zap,
  DollarSign,
  Sparkles,
  MessageSquare,
  RefreshCw,
  FileText,
  Globe,
  Activity,
  Terminal,
  Search,
  ChevronDown,
  ChevronRight,
  Calendar,
  X,
  Bot,
  Eye,
  Code,
  Send,
  Database,
  FileCode,
  Wrench,
  ArrowRight,
  Hash,
  Cpu,
  Filter,
} from "lucide-react";

// ─── Types ───
// Granular: every single action the agent takes
type ToolCallStatus = "success" | "error" | "running";

interface ToolCall {
  id: string;
  tool: string;
  args?: Record<string, unknown>;
  result?: string;
  status: ToolCallStatus;
  durationMs?: number;
}

interface GranularEvent {
  id: string;
  timestamp: string; // ISO
  time: string; // display
  date: string;
  sessionKey: string;
  sessionLabel?: string;
  kind: "user_message" | "assistant_message" | "tool_call" | "tool_result" | "system_event" | "session_start" | "session_end" | "cron_trigger" | "heartbeat";
  // Content
  text?: string;
  toolCall?: ToolCall;
  // Metadata
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  cost?: number;
  channel?: string;
  user?: string;
  cronJob?: string;
  thinkingTokens?: number;
}

// ─── Mock granular data (simulating what gateway API returns) ───
const granularEvents: GranularEvent[] = [
  // Morning Brief session
  {
    id: "g1", timestamp: "2026-02-08T16:32:15Z", time: "8:32:15am", date: "Today",
    sessionKey: "cron-morning-brief-1707408600", sessionLabel: "Morning Brief",
    kind: "assistant_message", text: "Good morning Bill! Here's your daily brief...",
    model: "claude-sonnet-4-20250514", tokensIn: 1250, tokensOut: 890, cost: 0.0086,
    channel: "discord",
  },
  {
    id: "g2", timestamp: "2026-02-08T16:32:14Z", time: "8:32:14am", date: "Today",
    sessionKey: "cron-morning-brief-1707408600", sessionLabel: "Morning Brief",
    kind: "tool_call",
    toolCall: { id: "tc1", tool: "message", args: { action: "send", target: "#general", message: "☀️ Morning Brief..." }, status: "success", durationMs: 320 },
  },
  {
    id: "g3", timestamp: "2026-02-08T16:31:48Z", time: "8:31:48am", date: "Today",
    sessionKey: "cron-morning-brief-1707408600", sessionLabel: "Morning Brief",
    kind: "tool_call",
    toolCall: { id: "tc2", tool: "web_search", args: { query: "crypto market news today" }, status: "success", durationMs: 1240 },
    model: "claude-sonnet-4-20250514", tokensIn: 180, tokensOut: 45,
  },
  {
    id: "g4", timestamp: "2026-02-08T16:31:45Z", time: "8:31:45am", date: "Today",
    sessionKey: "cron-morning-brief-1707408600", sessionLabel: "Morning Brief",
    kind: "tool_call",
    toolCall: { id: "tc3", tool: "exec", args: { command: "~/.local/bin/gog-run calendar events primary --from 2026-02-08 --to 2026-02-09" }, status: "success", durationMs: 2100 },
  },
  {
    id: "g5", timestamp: "2026-02-08T16:31:42Z", time: "8:31:42am", date: "Today",
    sessionKey: "cron-morning-brief-1707408600", sessionLabel: "Morning Brief",
    kind: "tool_call",
    toolCall: { id: "tc4", tool: "exec", args: { command: "~/.local/bin/gog-run gmail search 'is:unread newer_than:1d' --max 5" }, status: "success", durationMs: 1800 },
  },
  {
    id: "g6", timestamp: "2026-02-08T16:31:38Z", time: "8:31:38am", date: "Today",
    sessionKey: "cron-morning-brief-1707408600", sessionLabel: "Morning Brief",
    kind: "tool_call",
    toolCall: { id: "tc5", tool: "Read", args: { file_path: "memory/WORKING.md" }, status: "success", durationMs: 12 },
  },
  {
    id: "g7", timestamp: "2026-02-08T16:31:37Z", time: "8:31:37am", date: "Today",
    sessionKey: "cron-morning-brief-1707408600", sessionLabel: "Morning Brief",
    kind: "tool_call",
    toolCall: { id: "tc6", tool: "Read", args: { file_path: "MEMORY.md" }, status: "success", durationMs: 8 },
  },
  {
    id: "g8", timestamp: "2026-02-08T16:31:36Z", time: "8:31:36am", date: "Today",
    sessionKey: "cron-morning-brief-1707408600", sessionLabel: "Morning Brief",
    kind: "cron_trigger", cronJob: "morning-brief", text: "Cron triggered: morning-brief",
  },
  {
    id: "g8b", timestamp: "2026-02-08T16:30:00Z", time: "8:30:00am", date: "Today",
    sessionKey: "cron-morning-brief-1707408600", sessionLabel: "Morning Brief",
    kind: "session_start", text: "Session started (isolated)",
  },

  // Lit Analysis session
  {
    id: "g9", timestamp: "2026-02-08T15:45:22Z", time: "7:45:22am", date: "Today",
    sessionKey: "cron-lit-analysis-1707405000", sessionLabel: "Lit Analysis",
    kind: "assistant_message", text: "Lit.trade 24h analysis complete. Volume: $1.2M (+12%), Builder fees: $1.2K.",
    model: "claude-sonnet-4-20250514", tokensIn: 980, tokensOut: 650, cost: 0.0052,
    channel: "discord",
  },
  {
    id: "g10", timestamp: "2026-02-08T15:45:20Z", time: "7:45:20am", date: "Today",
    sessionKey: "cron-lit-analysis-1707405000", sessionLabel: "Lit Analysis",
    kind: "tool_call",
    toolCall: { id: "tc7", tool: "message", args: { action: "send", target: "#lit-trade" }, status: "success", durationMs: 280 },
  },
  {
    id: "g11", timestamp: "2026-02-08T15:44:55Z", time: "7:44:55am", date: "Today",
    sessionKey: "cron-lit-analysis-1707405000", sessionLabel: "Lit Analysis",
    kind: "tool_call",
    toolCall: { id: "tc8", tool: "web_fetch", args: { url: "https://api.hyperliquid.xyz/info" }, status: "success", durationMs: 890 },
  },
  {
    id: "g12", timestamp: "2026-02-08T15:44:50Z", time: "7:44:50am", date: "Today",
    sessionKey: "cron-lit-analysis-1707405000", sessionLabel: "Lit Analysis",
    kind: "tool_call",
    toolCall: { id: "tc9", tool: "Read", args: { file_path: "memory/WORKING.md" }, status: "success", durationMs: 10 },
  },
  {
    id: "g13", timestamp: "2026-02-08T15:44:48Z", time: "7:44:48am", date: "Today",
    sessionKey: "cron-lit-analysis-1707405000", sessionLabel: "Lit Analysis",
    kind: "session_start", text: "Session started (isolated)",
  },

  // Chat interaction — Bill asks about activity feed
  {
    id: "g14", timestamp: "2026-02-08T14:53:00Z", time: "6:53:00am", date: "Today",
    sessionKey: "main", sessionLabel: "Main",
    kind: "user_message", text: "Let's try to see how it would look if we just moved the granular data directly to the activity feed. Maybe do a mockup first",
    user: "Bill", channel: "discord",
  },
  {
    id: "g15", timestamp: "2026-02-08T14:44:00Z", time: "6:44:00am", date: "Today",
    sessionKey: "main", sessionLabel: "Main",
    kind: "user_message", text: "hello, what happened? why didn you reply",
    user: "Bill", channel: "discord",
  },
  {
    id: "g16", timestamp: "2026-02-08T14:43:00Z", time: "6:43:00am", date: "Today",
    sessionKey: "main", sessionLabel: "Main",
    kind: "assistant_message", text: "Sorry about that! I was deep in research mode...",
    model: "claude-opus-4-20250514", tokensIn: 3200, tokensOut: 1800, cost: 0.042,
  },
  {
    id: "g17", timestamp: "2026-02-08T14:42:30Z", time: "6:42:30am", date: "Today",
    sessionKey: "main", sessionLabel: "Main",
    kind: "tool_call",
    toolCall: { id: "tc10", tool: "Read", args: { file_path: "/home/lolo/clawhq/src/lib/gateway-rpc.ts" }, status: "success", durationMs: 15 },
    model: "claude-opus-4-20250514",
  },
  {
    id: "g18", timestamp: "2026-02-08T14:42:25Z", time: "6:42:25am", date: "Today",
    sessionKey: "main", sessionLabel: "Main",
    kind: "tool_call",
    toolCall: { id: "tc11", tool: "Read", args: { file_path: "/home/lolo/clawhq/src/app/activity/page.tsx" }, status: "success", durationMs: 18 },
    model: "claude-opus-4-20250514",
  },
  {
    id: "g19", timestamp: "2026-02-08T14:42:20Z", time: "6:42:20am", date: "Today",
    sessionKey: "main", sessionLabel: "Main",
    kind: "tool_call",
    toolCall: { id: "tc12", tool: "exec", args: { command: "grep -r 'usage.logs' /home/lolo/.npm-global/lib/node_modules/openclaw/dist/" }, status: "success", durationMs: 340 },
  },

  // Heartbeat
  {
    id: "g20", timestamp: "2026-02-08T14:00:00Z", time: "6:00:00am", date: "Today",
    sessionKey: "main", sessionLabel: "Main",
    kind: "heartbeat", text: "HEARTBEAT_OK",
  },

  // Earlier — ClawHQ dev session
  {
    id: "g21", timestamp: "2026-02-08T06:51:00Z", time: "10:51:00pm", date: "Yesterday",
    sessionKey: "main", sessionLabel: "Main",
    kind: "tool_call",
    toolCall: { id: "tc13", tool: "exec", args: { command: "cd /home/lolo/clawhq && git push origin main" }, status: "success", durationMs: 3200 },
  },
  {
    id: "g22", timestamp: "2026-02-08T06:50:30Z", time: "10:50:30pm", date: "Yesterday",
    sessionKey: "main", sessionLabel: "Main",
    kind: "tool_call",
    toolCall: { id: "tc14", tool: "Write", args: { file_path: "/home/lolo/clawhq/src/app/activity/page.tsx" }, status: "success", durationMs: 22 },
    model: "claude-opus-4-20250514", tokensIn: 8500, tokensOut: 6200, cost: 0.92,
  },
  {
    id: "g23", timestamp: "2026-02-08T06:48:00Z", time: "10:48:00pm", date: "Yesterday",
    sessionKey: "main", sessionLabel: "Main",
    kind: "tool_call",
    toolCall: { id: "tc15", tool: "Read", args: { file_path: "/home/lolo/clawhq/src/app/globals.css" }, status: "success", durationMs: 10 },
  },
  {
    id: "g24", timestamp: "2026-02-08T06:47:00Z", time: "10:47:00pm", date: "Yesterday",
    sessionKey: "main", sessionLabel: "Main",
    kind: "user_message", text: "Let's redesign the dashboard with a 3-column layout",
    user: "Bill", channel: "discord",
  },
];

// ─── Helpers ───
const kindConfig: Record<GranularEvent["kind"], { icon: typeof Bot; label: string; color: string; bg: string }> = {
  user_message: { icon: MessageSquare, label: "User", color: "text-blue-300", bg: "bg-blue-500/10" },
  assistant_message: { icon: Bot, label: "Assistant", color: "text-green-300", bg: "bg-green-500/10" },
  tool_call: { icon: Wrench, label: "Tool", color: "text-orange-300", bg: "bg-orange-500/10" },
  tool_result: { icon: ArrowRight, label: "Result", color: "text-white/40", bg: "bg-white/5" },
  system_event: { icon: Terminal, label: "System", color: "text-white/40", bg: "bg-white/5" },
  session_start: { icon: Zap, label: "Start", color: "text-emerald-300", bg: "bg-emerald-500/10" },
  session_end: { icon: X, label: "End", color: "text-white/30", bg: "bg-white/5" },
  cron_trigger: { icon: RefreshCw, label: "Cron", color: "text-orange-300", bg: "bg-orange-500/10" },
  heartbeat: { icon: Activity, label: "Heartbeat", color: "text-white/25", bg: "bg-white/[0.03]" },
};

const toolIcons: Record<string, typeof Globe> = {
  web_search: Globe,
  web_fetch: Globe,
  exec: Terminal,
  Read: FileText,
  Write: FileCode,
  Edit: Code,
  message: Send,
  memory_search: Database,
  memory_get: Database,
  browser: Eye,
  cron: RefreshCw,
  nodes: Cpu,
};

function formatTokens(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function truncatePath(p: string, max = 45) {
  if (p.length <= max) return p;
  return "…" + p.slice(p.length - max + 1);
}

// ─── Component ───
export default function ActivityV2Page() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<GranularEvent["kind"] | null>(null);
  const [sessionFilter, setSessionFilter] = useState<string | null>(null);
  const [showSessions, setShowSessions] = useState(false);

  // Unique sessions
  const sessions = [...new Map(granularEvents.map(e => [e.sessionKey, e.sessionLabel || e.sessionKey])).entries()];

  // Filter
  let filtered = granularEvents;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(e =>
      e.text?.toLowerCase().includes(q) ||
      e.toolCall?.tool.toLowerCase().includes(q) ||
      JSON.stringify(e.toolCall?.args || {}).toLowerCase().includes(q) ||
      e.sessionLabel?.toLowerCase().includes(q)
    );
  }
  if (kindFilter) {
    filtered = filtered.filter(e => e.kind === kindFilter);
  }
  if (sessionFilter) {
    filtered = filtered.filter(e => e.sessionKey === sessionFilter);
  }

  // Group by date
  const dateGroups: { date: string; events: GranularEvent[] }[] = [];
  let currentDate = "";
  for (const e of filtered) {
    if (e.date !== currentDate) {
      currentDate = e.date;
      dateGroups.push({ date: e.date, events: [] });
    }
    dateGroups[dateGroups.length - 1].events.push(e);
  }

  // Kind counts
  const kindCounts: Partial<Record<GranularEvent["kind"], number>> = {};
  for (const e of granularEvents) {
    kindCounts[e.kind] = (kindCounts[e.kind] || 0) + 1;
  }

  // Totals
  const totalCost = granularEvents.reduce((s, e) => s + (e.cost || 0), 0);
  const totalTokensIn = granularEvents.reduce((s, e) => s + (e.tokensIn || 0), 0);
  const totalTokensOut = granularEvents.reduce((s, e) => s + (e.tokensOut || 0), 0);

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
              <h1 className="text-lg font-bold text-white">Activity <span className="text-xs font-normal text-white/20 ml-1">v2 — granular</span></h1>
              <p className="text-xs text-white/40">{filtered.length} events · ${totalCost.toFixed(2)} · {formatTokens(totalTokensIn + totalTokensOut)} tokens</p>
            </div>
          </div>
        </div>

        {/* Kind filter chips */}
        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
          <button
            onClick={() => setKindFilter(null)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-all ${
              kindFilter === null ? "bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/25" : "bg-white/[0.03] text-white/40 hover:bg-white/[0.06]"
            }`}
          >
            <span className="font-bold tabular-nums">{granularEvents.length}</span> All
          </button>
          {(["tool_call", "assistant_message", "user_message", "cron_trigger", "session_start", "heartbeat"] as GranularEvent["kind"][]).map(kind => {
            const count = kindCounts[kind] || 0;
            if (count === 0) return null;
            const cfg = kindConfig[kind];
            const isActive = kindFilter === kind;
            return (
              <button
                key={kind}
                onClick={() => setKindFilter(isActive ? null : kind)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-all ${
                  isActive ? `${cfg.bg} ${cfg.color} ring-1 ring-current/25` : "bg-white/[0.03] text-white/40 hover:bg-white/[0.06]"
                }`}
              >
                <cfg.icon className="h-3 w-3" />
                <span className="font-bold tabular-nums">{count}</span>
                <span className="opacity-70">{cfg.label}</span>
              </button>
            );
          })}

          {/* Session filter */}
          <div className="relative ml-auto">
            <button
              onClick={() => setShowSessions(!showSessions)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition-all border ${
                sessionFilter
                  ? "bg-purple-500/10 border-purple-500/20 text-purple-300"
                  : "bg-white/[0.03] border-white/5 text-white/40 hover:bg-white/[0.06]"
              }`}
            >
              <Hash className="h-3 w-3" />
              {sessionFilter ? sessions.find(([k]) => k === sessionFilter)?.[1] : "All Sessions"}
              <ChevronDown className={`h-3 w-3 transition-transform ${showSessions ? "rotate-180" : ""}`} />
            </button>
            {showSessions && (
              <div className="absolute right-0 top-full mt-1 w-56 rounded-xl bg-[#1a1614] border border-white/10 shadow-2xl z-50 overflow-hidden">
                <button
                  onClick={() => { setSessionFilter(null); setShowSessions(false); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-white/5 ${!sessionFilter ? "text-orange-300" : "text-white/50"}`}
                >
                  All Sessions
                </button>
                {sessions.map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => { setSessionFilter(key); setShowSessions(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-white/5 ${sessionFilter === key ? "text-orange-300" : "text-white/50"}`}
                  >
                    {label} <span className="text-white/15 ml-1">{key === "main" ? "" : key.slice(0, 20)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tools, messages, args..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {dateGroups.map(({ date, events }) => (
          <div key={date}>
            <div className="sticky top-0 z-10 px-6 py-2 bg-[#161210]/95 backdrop-blur-sm border-b border-white/5">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-orange-400" />
                <span className="text-sm font-semibold text-white/60">{date}</span>
                <span className="text-[10px] text-white/20">{events.length} events</span>
              </div>
            </div>

            {/* Column headers */}
            <div className="px-6 py-1.5 flex items-center gap-3 text-[10px] text-white/20 uppercase tracking-wider border-b border-white/5">
              <span className="w-3" />
              <span className="w-20">Time</span>
              <span className="w-16">Kind</span>
              <span className="flex-1">Detail</span>
              <span className="w-24 text-right">Session</span>
              <span className="w-16 text-right">Tokens</span>
              <span className="w-14 text-right">Cost</span>
            </div>

            {events.map((event) => (
              <GranularRow
                key={event.id}
                event={event}
                expanded={expandedId === event.id}
                onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
              />
            ))}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-white/30">
            <Search className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-lg">No events found</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Row ───
function GranularRow({ event, expanded, onToggle }: {
  event: GranularEvent;
  expanded: boolean;
  onToggle: () => void;
}) {
  const cfg = kindConfig[event.kind];
  const ToolIcon = event.toolCall ? (toolIcons[event.toolCall.tool] || Wrench) : cfg.icon;

  // Build detail text
  let detail = "";
  let detailSub = "";
  if (event.kind === "tool_call" && event.toolCall) {
    detail = event.toolCall.tool;
    // Extract meaningful arg
    const args = event.toolCall.args || {};
    if (args.command) detailSub = truncatePath(String(args.command), 60);
    else if (args.file_path) detailSub = truncatePath(String(args.file_path));
    else if (args.path) detailSub = truncatePath(String(args.path));
    else if (args.query) detailSub = String(args.query);
    else if (args.url) detailSub = truncatePath(String(args.url), 50);
    else if (args.action) detailSub = String(args.action) + (args.target ? ` → ${args.target}` : "");
  } else if (event.kind === "user_message") {
    detail = event.text?.slice(0, 80) || "";
    if (event.user) detailSub = event.user;
  } else if (event.kind === "assistant_message") {
    detail = event.text?.slice(0, 80) || "";
  } else {
    detail = event.text || event.cronJob || "";
  }

  const totalTokens = (event.tokensIn || 0) + (event.tokensOut || 0);

  // Row dimming for less important events
  const isDim = event.kind === "heartbeat" || event.kind === "session_start" || event.kind === "session_end";

  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full text-left px-6 py-1.5 flex items-center gap-3 text-xs transition-all ${
          expanded ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
        } ${isDim ? "opacity-40 hover:opacity-70" : ""}`}
      >
        {/* Status dot */}
        <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
          event.toolCall?.status === "error" ? "bg-red-400" :
          event.toolCall?.status === "running" ? "bg-orange-400 animate-pulse" :
          event.kind === "user_message" ? "bg-blue-400" :
          event.kind === "assistant_message" ? "bg-green-400" :
          event.kind === "cron_trigger" ? "bg-orange-400" :
          "bg-white/20"
        }`} />

        {/* Time */}
        <span className="text-white/25 w-20 flex-shrink-0 tabular-nums font-mono text-[11px]">{event.time}</span>

        {/* Kind badge */}
        <span className={`w-16 flex-shrink-0 flex items-center gap-1 ${cfg.color}`}>
          <ToolIcon className="h-3 w-3" />
          <span className="text-[10px]">{event.kind === "tool_call" ? "" : cfg.label}</span>
        </span>

        {/* Detail */}
        <span className="flex-1 truncate min-w-0">
          {event.kind === "tool_call" ? (
            <>
              <span className="text-orange-300/80 font-mono font-medium">{detail}</span>
              {detailSub && <span className="text-white/30 ml-1.5 font-mono text-[11px]">{detailSub}</span>}
              {event.toolCall?.durationMs && (
                <span className="text-white/15 ml-1.5 text-[10px]">{event.toolCall.durationMs}ms</span>
              )}
            </>
          ) : event.kind === "user_message" ? (
            <>
              {detailSub && <span className="text-blue-300/50 mr-1.5">{detailSub}:</span>}
              <span className="text-white/60">{detail}</span>
            </>
          ) : event.kind === "assistant_message" ? (
            <span className="text-white/50">{detail}{detail.length >= 80 ? "…" : ""}</span>
          ) : (
            <span className="text-white/30">{detail}</span>
          )}
        </span>

        {/* Session */}
        <span className="w-24 text-right flex-shrink-0 text-[10px] text-white/20 truncate">
          {event.sessionLabel}
        </span>

        {/* Tokens */}
        <span className="w-16 text-right flex-shrink-0 text-white/15 tabular-nums">
          {totalTokens > 0 ? formatTokens(totalTokens) : "—"}
        </span>

        {/* Cost */}
        <span className="w-14 text-right flex-shrink-0 text-white/15 tabular-nums">
          {event.cost ? `$${event.cost < 0.01 ? event.cost.toFixed(4) : event.cost.toFixed(2)}` : "—"}
        </span>

        <ChevronRight className={`h-3 w-3 text-white/10 flex-shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>

      {/* Expanded */}
      {expanded && (
        <div className="px-6 pb-2 ml-7 space-y-1.5">
          {event.text && event.kind !== "user_message" && event.kind !== "assistant_message" && (
            <p className="text-xs text-white/40">{event.text}</p>
          )}
          {(event.kind === "user_message" || event.kind === "assistant_message") && event.text && (
            <p className="text-xs text-white/50 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">{event.text}</p>
          )}
          {event.toolCall && (
            <div className="font-mono text-[11px] space-y-1">
              <div className="text-white/30">
                <span className="text-white/15">args: </span>
                <span className="text-white/40">{JSON.stringify(event.toolCall.args, null, 0)}</span>
              </div>
              {event.toolCall.result && (
                <div className="text-white/25 max-h-20 overflow-y-auto">
                  <span className="text-white/15">result: </span>{event.toolCall.result}
                </div>
              )}
              <div className="flex items-center gap-3 text-white/20">
                <span className={event.toolCall.status === "success" ? "text-green-400/50" : "text-red-400/50"}>
                  {event.toolCall.status}
                </span>
                {event.toolCall.durationMs && <span>{event.toolCall.durationMs}ms</span>}
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 text-[10px] text-white/20 pt-1">
            {event.model && <span className="flex items-center gap-1"><Sparkles className="h-2.5 w-2.5" /> {event.model}</span>}
            {event.tokensIn && <span>↓{formatTokens(event.tokensIn)}</span>}
            {event.tokensOut && <span>↑{formatTokens(event.tokensOut)}</span>}
            {event.channel && <span>via {event.channel}</span>}
            <span className="text-white/10">{event.sessionKey}</span>
          </div>
        </div>
      )}
    </div>
  );
}
