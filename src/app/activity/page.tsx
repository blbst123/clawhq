"use client";

import { useState } from "react";
import {
  Clock,
  Zap,
  DollarSign,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  RefreshCw,
  FileText,
  Globe,
  Activity,
  Terminal,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  LayoutList,
  GitBranch,
  ArrowUpDown,
  Calendar,
  Layers,
  X,
  AlertCircle,
  Play,
  Bot
} from "lucide-react";

// ─── Source / Trigger Types (shared with dashboard) ───
type TriggerSource =
  | { type: "cron"; jobName: string; schedule: string }
  | { type: "chat"; channel: string; user: string }
  | { type: "backlog"; itemId: string; itemTitle: string }
  | { type: "system"; reason: string }
  | { type: "webhook"; service: string; event: string }
  | { type: "heartbeat" };

interface ActivityEvent {
  id: string;
  action: string;
  description?: string;
  task: string;
  time: string;
  date: string;
  type: "complete" | "action" | "start" | "error" | "info";
  source: TriggerSource;
  model?: string;
  cost?: number;
  duration?: string;
  tokens?: { in: number; out: number };
  project?: string;
}

// ─── Mock data: full activity log ───
const allActivity: ActivityEvent[] = [
  // Today
  {
    id: "a1", action: "Morning Brief sent", description: "Daily summary delivered to #general with market overview, calendar events, and priority tasks.",
    task: "Morning Brief", time: "8:32am", date: "Today", type: "complete",
    source: { type: "cron", jobName: "morning-brief", schedule: "daily 8:30am" },
    model: "Sonnet", cost: 0.24, duration: "2m 05s", tokens: { in: 1250, out: 890 }, project: "General"
  },
  {
    id: "a2", action: "Generated summary", task: "Morning Brief", time: "8:31am", date: "Today", type: "action",
    source: { type: "cron", jobName: "morning-brief", schedule: "daily 8:30am" }, model: "Sonnet", project: "General"
  },
  {
    id: "a3", action: "Fetched calendar events", task: "Morning Brief", time: "8:30am", date: "Today", type: "action",
    source: { type: "cron", jobName: "morning-brief", schedule: "daily 8:30am" }, project: "General"
  },
  {
    id: "a4", action: "Lit Analysis complete", description: "24h volume: $1.2M (+12%), fees: $1.2K. Report pushed to #lit-trade.",
    task: "Lit Analysis", time: "7:45am", date: "Today", type: "complete",
    source: { type: "cron", jobName: "lit-analysis", schedule: "daily 7:30am" },
    model: "Sonnet", cost: 0.18, duration: "1m 12s", tokens: { in: 980, out: 650 }, project: "Lit.trade"
  },
  {
    id: "a5", action: "Queried Hyperliquid API", task: "Lit Analysis", time: "7:44am", date: "Today", type: "action",
    source: { type: "cron", jobName: "lit-analysis", schedule: "daily 7:30am" }, project: "Lit.trade"
  },
  {
    id: "a6", action: "Task started", task: "Lit Analysis", time: "7:44am", date: "Today", type: "start",
    source: { type: "cron", jobName: "lit-analysis", schedule: "daily 7:30am" }, project: "Lit.trade"
  },
  {
    id: "a7", action: "Dashboard redesign deployed", description: "Updated 3-column layout with backlog, task tracker, and context-aware chat. Pushed to Vercel.",
    task: "ClawHQ Dev", time: "6:51am", date: "Today", type: "complete",
    source: { type: "chat", channel: "#claw-hq", user: "Bill" },
    model: "Opus", cost: 0.92, duration: "45m", tokens: { in: 8500, out: 6200 }, project: "ClawHQ"
  },
  {
    id: "a8", action: "Heartbeat check — all clear", task: "System", time: "6:00am", date: "Today", type: "info",
    source: { type: "heartbeat" }, project: "System"
  },
  {
    id: "a9", action: "GitHub webhook: PR merged", description: "PR #42 'feat: activity calendar' merged into main.",
    task: "ClawHQ Dev", time: "5:45am", date: "Today", type: "info",
    source: { type: "webhook", service: "GitHub", event: "pull_request.merged" }, project: "ClawHQ"
  },
  {
    id: "a10", action: "Content Research: AI Jobs started", description: "Deep research on AI job displacement. Scanning 12+ sources.",
    task: "Content Research", time: "3:58am", date: "Today", type: "start",
    source: { type: "cron", jobName: "content-research", schedule: "daily 3:30am" },
    model: "Opus", project: "Content"
  },
  {
    id: "a11", action: "Lit Revenue Check", description: "2am automated check. Revenue: $1.1K, Volume: $980K.",
    task: "Lit Revenue", time: "2:00am", date: "Today", type: "complete",
    source: { type: "cron", jobName: "lit-revenue", schedule: "daily 2:00am" },
    model: "Sonnet", cost: 0.12, duration: "45s", tokens: { in: 420, out: 280 }, project: "Lit.trade"
  },
  // Yesterday
  {
    id: "a12", action: "Email draft: Investor Update", description: "Drafted Q4 investor update covering Lit.trade metrics and roadmap.",
    task: "Email", time: "11:30pm", date: "Yesterday", type: "complete",
    source: { type: "chat", channel: "Telegram", user: "Bill" },
    model: "Sonnet", cost: 0.32, duration: "8m", tokens: { in: 1800, out: 1200 }, project: "Lit.trade"
  },
  {
    id: "a13", action: "Calendar view built", description: "Full monthly calendar with activity heatmap and day detail panel for ClawHQ.",
    task: "ClawHQ Dev", time: "9:15pm", date: "Yesterday", type: "complete",
    source: { type: "chat", channel: "#claw-hq", user: "Bill" },
    model: "Opus", cost: 1.10, duration: "35m", tokens: { in: 7200, out: 5800 }, project: "ClawHQ"
  },
  {
    id: "a14", action: "Competitor research started", description: "Kicked off from backlog item. Analyzing Hyperliquid competitor platforms.",
    task: "Research", time: "4:20pm", date: "Yesterday", type: "start",
    source: { type: "backlog", itemId: "2", itemTitle: "Research Hyperliquid competitors" },
    model: "Opus", project: "Lit.trade"
  },
  {
    id: "a15", action: "Morning Brief sent", task: "Morning Brief", time: "8:32am", date: "Yesterday", type: "complete",
    source: { type: "cron", jobName: "morning-brief", schedule: "daily 8:30am" },
    model: "Sonnet", cost: 0.22, duration: "1m 58s", tokens: { in: 1100, out: 820 }, project: "General"
  },
  {
    id: "a16", action: "Lit Analysis complete", task: "Lit Analysis", time: "7:45am", date: "Yesterday", type: "complete",
    source: { type: "cron", jobName: "lit-analysis", schedule: "daily 7:30am" },
    model: "Sonnet", cost: 0.16, duration: "1m 05s", tokens: { in: 900, out: 600 }, project: "Lit.trade"
  },
  {
    id: "a17", action: "System error: Vercel deploy timeout", description: "Vercel had an outage. Deploy queued but not promoted to production.",
    task: "ClawHQ Dev", time: "6:30am", date: "Yesterday", type: "error",
    source: { type: "system", reason: "Vercel outage" }, project: "ClawHQ"
  },
  {
    id: "a18", action: "Heartbeat check — all clear", task: "System", time: "6:00am", date: "Yesterday", type: "info",
    source: { type: "heartbeat" }, project: "System"
  },
  // 2 days ago
  {
    id: "a19", action: "Blog post draft: Why AI Agents Need Souls", description: "2,400 word draft exploring agent personality and continuity.",
    task: "Content", time: "3:15pm", date: "Feb 5", type: "complete",
    source: { type: "chat", channel: "Telegram", user: "Bill" },
    model: "Opus", cost: 0.88, duration: "12m", tokens: { in: 3200, out: 4100 }, project: "Content"
  },
  {
    id: "a20", action: "Agent Blueprints site deployed", description: "Launched agent-blueprints.vercel.app with starter kits and documentation.",
    task: "Agent Blueprints", time: "11:00am", date: "Feb 5", type: "complete",
    source: { type: "chat", channel: "#agent-blueprints", user: "Bill" },
    model: "Opus", cost: 1.45, duration: "1h 20m", tokens: { in: 12000, out: 9500 }, project: "Agent Blueprints"
  },
  {
    id: "a21", action: "Chartr.xyz domain configured", description: "Set up DNS and initial landing page.",
    task: "Chartr Setup", time: "9:00am", date: "Feb 5", type: "complete",
    source: { type: "chat", channel: "Telegram", user: "Bill" },
    model: "Sonnet", cost: 0.15, duration: "5m", project: "Chartr"
  },
];

// ─── View types ───
type ViewMode = "timeline" | "grouped" | "compact";
type GroupBy = "task" | "source" | "project" | "date";

// ─── Source config (same as dashboard) ───
function getSourceConfig(source: TriggerSource) {
  switch (source.type) {
    case "cron": return { icon: RefreshCw, label: "Cron", detail: source.jobName, bg: "bg-orange-500/10", text: "text-orange-300", border: "border-orange-500/20", dotColor: "bg-orange-400" };
    case "chat": return { icon: MessageSquare, label: source.channel, detail: source.user, bg: "bg-blue-500/10", text: "text-blue-300", border: "border-blue-500/20", dotColor: "bg-blue-400" };
    case "backlog": return { icon: FileText, label: "Backlog", detail: source.itemTitle?.slice(0, 25), bg: "bg-purple-500/10", text: "text-purple-300", border: "border-purple-500/20", dotColor: "bg-purple-400" };
    case "webhook": return { icon: Globe, label: source.service, detail: source.event, bg: "bg-cyan-500/10", text: "text-cyan-300", border: "border-cyan-500/20", dotColor: "bg-cyan-400" };
    case "heartbeat": return { icon: Activity, label: "Heartbeat", detail: null, bg: "bg-white/5", text: "text-white/50", border: "border-white/10", dotColor: "bg-white/30" };
    case "system": return { icon: Terminal, label: "System", detail: source.reason, bg: "bg-white/5", text: "text-white/50", border: "border-white/10", dotColor: "bg-white/30" };
  }
}

const SourceBadge = ({ source, compact = false }: { source: TriggerSource; compact?: boolean }) => {
  const config = getSourceConfig(source);
  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md ${config.bg} ${config.text} border ${config.border}`}>
        <config.icon className="h-2.5 w-2.5" />
        {config.label}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg ${config.bg} ${config.text} border ${config.border}`}>
      <config.icon className="h-3 w-3" />
      <span className="font-medium">{config.label}</span>
      {config.detail && <span className="opacity-60">· {config.detail}</span>}
    </span>
  );
};

const getTypeDot = (type: string) => {
  switch (type) {
    case "complete": return "bg-green-400";
    case "start": return "bg-blue-400";
    case "error": return "bg-red-400";
    case "info": return "bg-white/30";
    default: return "bg-white/20";
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case "complete": return { label: "Completed", color: "text-green-400" };
    case "start": return { label: "Started", color: "text-blue-400" };
    case "error": return { label: "Error", color: "text-red-400" };
    case "info": return { label: "Info", color: "text-white/40" };
    case "action": return { label: "Step", color: "text-white/40" };
    default: return { label: type, color: "text-white/40" };
  }
};

// ─── Group helper ───
function groupEvents(events: ActivityEvent[], by: GroupBy): Record<string, ActivityEvent[]> {
  const groups: Record<string, ActivityEvent[]> = {};
  for (const e of events) {
    let key: string;
    switch (by) {
      case "task": key = e.task; break;
      case "source": key = e.source.type; break;
      case "project": key = e.project || "Other"; break;
      case "date": key = e.date; break;
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  return groups;
}

export default function ActivityPage() {
  const [view, setView] = useState<ViewMode>("timeline");
  const [groupBy, setGroupBy] = useState<GroupBy>("date");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  // Filter
  let filtered = allActivity;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(e =>
      e.action.toLowerCase().includes(q) ||
      e.task.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q) ||
      e.project?.toLowerCase().includes(q)
    );
  }
  if (sourceFilter) {
    filtered = filtered.filter(e => e.source.type === sourceFilter);
  }
  if (typeFilter) {
    filtered = filtered.filter(e => e.type === typeFilter);
  }

  // Stats
  const totalCost = filtered.reduce((s, e) => s + (e.cost || 0), 0);
  const completedCount = filtered.filter(e => e.type === "complete").length;
  const errorCount = filtered.filter(e => e.type === "error").length;
  const uniqueTasks = new Set(filtered.map(e => e.task)).size;

  // Grouped data
  const grouped = view === "grouped" ? groupEvents(filtered, groupBy) : { "all": filtered };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/5 bg-white/[0.01] px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Zap className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Activity</h1>
              <p className="text-sm text-white/40">{filtered.length} events</p>
            </div>
          </div>

          {/* View switcher */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5">
            <button
              onClick={() => setView("timeline")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === "timeline" ? "bg-orange-500/20 text-orange-300" : "text-white/40 hover:text-white/60"
              }`}
            >
              <GitBranch className="h-3.5 w-3.5" />
              Timeline
            </button>
            <button
              onClick={() => setView("grouped")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === "grouped" ? "bg-orange-500/20 text-orange-300" : "text-white/40 hover:text-white/60"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Grouped
            </button>
            <button
              onClick={() => setView("compact")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === "compact" ? "bg-orange-500/20 text-orange-300" : "text-white/40 hover:text-white/60"
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              Compact
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <span className="text-sm text-white font-medium">{completedCount}</span>
            <span className="text-xs text-white/40">completed</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10">
            <DollarSign className="h-4 w-4 text-amber-400" />
            <span className="text-sm text-white font-medium">${totalCost.toFixed(2)}</span>
            <span className="text-xs text-white/40">spent</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10">
            <Bot className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-white font-medium">{uniqueTasks}</span>
            <span className="text-xs text-white/40">tasks</span>
          </div>
          {errorCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <span className="text-sm text-white font-medium">{errorCount}</span>
              <span className="text-xs text-white/40">errors</span>
            </div>
          )}
        </div>

        {/* Search + Filters */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search activity..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
            />
          </div>

          {/* Source filter */}
          <div className="flex items-center gap-1">
            {[
              { key: null, label: "All" },
              { key: "cron", label: "Cron" },
              { key: "chat", label: "Chat" },
              { key: "backlog", label: "Backlog" },
              { key: "webhook", label: "Webhook" },
              { key: "heartbeat", label: "Heartbeat" },
            ].map(f => (
              <button
                key={f.key || "all"}
                onClick={() => setSourceFilter(f.key)}
                className={`text-xs px-2.5 py-1 rounded-md transition-all ${
                  sourceFilter === f.key
                    ? "bg-orange-500/20 text-orange-300"
                    : "text-white/30 hover:bg-white/5 hover:text-white/50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-1 border-l border-white/10 pl-3">
            {[
              { key: null, label: "All types" },
              { key: "complete", label: "✓ Done" },
              { key: "start", label: "▶ Started" },
              { key: "error", label: "✕ Errors" },
            ].map(f => (
              <button
                key={f.key || "all-types"}
                onClick={() => setTypeFilter(f.key)}
                className={`text-xs px-2.5 py-1 rounded-md transition-all ${
                  typeFilter === f.key
                    ? "bg-orange-500/20 text-orange-300"
                    : "text-white/30 hover:bg-white/5 hover:text-white/50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Group by (when in grouped view) */}
          {view === "grouped" && (
            <div className="flex items-center gap-1 border-l border-white/10 pl-3">
              <span className="text-[10px] text-white/30 mr-1">Group:</span>
              {(["date", "task", "project", "source"] as GroupBy[]).map(g => (
                <button
                  key={g}
                  onClick={() => setGroupBy(g)}
                  className={`text-xs px-2 py-1 rounded-md transition-all capitalize ${
                    groupBy === g
                      ? "bg-orange-500/20 text-orange-300"
                      : "text-white/30 hover:bg-white/5 hover:text-white/50"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active filters */}
        {(searchQuery || sourceFilter || typeFilter) && (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[10px] text-white/30">Filters:</span>
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 hover:bg-white/15">
                &quot;{searchQuery}&quot; <X className="h-2.5 w-2.5" />
              </button>
            )}
            {sourceFilter && (
              <button onClick={() => setSourceFilter(null)} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 hover:bg-orange-500/25">
                {sourceFilter} <X className="h-2.5 w-2.5" />
              </button>
            )}
            {typeFilter && (
              <button onClick={() => setTypeFilter(null)} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 hover:bg-orange-500/25">
                {typeFilter} <X className="h-2.5 w-2.5" />
              </button>
            )}
            <button
              onClick={() => { setSearchQuery(""); setSourceFilter(null); setTypeFilter(null); }}
              className="text-[10px] text-white/30 hover:text-white/50 ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Activity Feed */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(grouped).map(([groupKey, events]) => (
          <div key={groupKey}>
            {/* Group header (timeline view shows "all" so skip header) */}
            {view === "grouped" && (
              <div className="sticky top-0 z-10 px-6 py-2 bg-[#161210]/90 backdrop-blur-sm border-b border-white/5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white/70 capitalize">{groupKey}</h3>
                  <span className="text-[10px] text-white/30">{events.length} events</span>
                </div>
              </div>
            )}

            {/* Date headers in timeline mode */}
            {view !== "grouped" && (() => {
              let lastDate = "";
              return events.map((event) => {
                const showDateHeader = event.date !== lastDate;
                lastDate = event.date;
                return (
                  <div key={event.id}>
                    {showDateHeader && (
                      <div className="sticky top-0 z-10 px-6 py-2 bg-[#161210]/90 backdrop-blur-sm border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-orange-400" />
                          <h3 className="text-sm font-semibold text-white/70">{event.date}</h3>
                        </div>
                      </div>
                    )}
                    {view === "compact" ? (
                      <CompactRow event={event} />
                    ) : (
                      <TimelineRow
                        event={event}
                        expanded={expandedId === event.id}
                        onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
                      />
                    )}
                  </div>
                );
              });
            })()}

            {/* Grouped view renders events without date headers */}
            {view === "grouped" && events.map((event) => (
              <TimelineRow
                key={event.id}
                event={event}
                expanded={expandedId === event.id}
                onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
                showDate
              />
            ))}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-white/30">
            <Search className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-lg">No activity found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Timeline Row ───
function TimelineRow({ event, expanded, onToggle, showDate = false }: {
  event: ActivityEvent;
  expanded: boolean;
  onToggle: () => void;
  showDate?: boolean;
}) {
  const config = getSourceConfig(event.source);
  const typeInfo = getTypeLabel(event.type);

  return (
    <div className="px-6">
      <button
        onClick={onToggle}
        className={`w-full text-left flex items-start gap-4 py-3 px-3 -mx-3 rounded-xl transition-all ${
          expanded ? "bg-white/[0.03]" : "hover:bg-white/[0.015]"
        }`}
      >
        {/* Timeline */}
        <div className="flex flex-col items-center pt-1">
          <div className={`h-2.5 w-2.5 rounded-full ${getTypeDot(event.type)} ring-2 ring-white/5`} />
          <div className="w-px flex-1 bg-white/5 mt-1" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pb-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-white">{event.action}</span>
            <span className={`text-[10px] ${typeInfo.color}`}>{typeInfo.label}</span>
            {showDate && <span className="text-[10px] text-white/20">{event.date}</span>}
          </div>

          {/* Meta row */}
          <div className="flex items-center flex-wrap gap-2 mt-1.5">
            <SourceBadge source={event.source} compact />
            {event.project && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">{event.project}</span>
            )}
            {event.model && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/30 flex items-center gap-1">
                <Sparkles className="h-2 w-2" /> {event.model}
              </span>
            )}
            {event.cost !== undefined && event.cost > 0 && (
              <span className="text-[10px] text-white/30">${event.cost.toFixed(2)}</span>
            )}
            {event.duration && (
              <span className="text-[10px] text-white/20 flex items-center gap-0.5">
                <Clock className="h-2 w-2" /> {event.duration}
              </span>
            )}
          </div>
        </div>

        {/* Time */}
        <span className="text-xs text-white/30 pt-0.5 flex-shrink-0">{event.time}</span>
      </button>

      {/* Expanded detail */}
      {expanded && event.description && (
        <div className="ml-7 mb-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <p className="text-sm text-white/60 leading-relaxed mb-3">{event.description}</p>

          <div className="flex items-center gap-4 text-xs text-white/30">
            {event.duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {event.duration}
              </span>
            )}
            {event.tokens && (
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" /> {((event.tokens.in + event.tokens.out) / 1000).toFixed(1)}K tokens
                <span className="text-white/15">({event.tokens.in} in / {event.tokens.out} out)</span>
              </span>
            )}
            {event.model && (
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> {event.model}
              </span>
            )}
            {event.cost !== undefined && event.cost > 0 && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> ${event.cost.toFixed(2)}
              </span>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-white/5">
            <SourceBadge source={event.source} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Compact Row ───
function CompactRow({ event }: { event: ActivityEvent }) {
  const config = getSourceConfig(event.source);

  return (
    <div className="px-6 py-1.5 flex items-center gap-3 hover:bg-white/[0.015] transition-all text-xs">
      <div className={`h-1.5 w-1.5 rounded-full ${getTypeDot(event.type)}`} />
      <span className="text-white/30 w-14 flex-shrink-0">{event.time}</span>
      <span className="text-white/80 flex-1 truncate">{event.action}</span>
      <span className="text-white/20 w-24 truncate text-right">{event.task}</span>
      <span className={`${config.text} w-16 truncate text-right`}>
        {event.source.type}
      </span>
      {event.cost !== undefined && event.cost > 0 ? (
        <span className="text-white/30 w-12 text-right">${event.cost.toFixed(2)}</span>
      ) : (
        <span className="w-12" />
      )}
    </div>
  );
}
