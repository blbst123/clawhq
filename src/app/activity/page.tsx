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
  Calendar,
  X,
  AlertCircle,
  Bot,
  Play
} from "lucide-react";

// ─── Types ───
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

type ViewMode = "timeline" | "tasks";

// ─── Mock data ───
const allActivity: ActivityEvent[] = [
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

// ─── Source helpers ───
function getSourceConfig(source: TriggerSource) {
  switch (source.type) {
    case "cron": return { icon: RefreshCw, label: "Cron", detail: source.jobName, bg: "bg-orange-500/10", text: "text-orange-300", border: "border-orange-500/20" };
    case "chat": return { icon: MessageSquare, label: source.channel, detail: source.user, bg: "bg-blue-500/10", text: "text-blue-300", border: "border-blue-500/20" };
    case "backlog": return { icon: FileText, label: "Backlog", detail: source.itemTitle?.slice(0, 25), bg: "bg-purple-500/10", text: "text-purple-300", border: "border-purple-500/20" };
    case "webhook": return { icon: Globe, label: source.service, detail: source.event, bg: "bg-cyan-500/10", text: "text-cyan-300", border: "border-cyan-500/20" };
    case "heartbeat": return { icon: Activity, label: "Heartbeat", detail: null, bg: "bg-white/5", text: "text-white/50", border: "border-white/10" };
    case "system": return { icon: Terminal, label: "System", detail: source.reason, bg: "bg-white/5", text: "text-white/50", border: "border-white/10" };
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

// ─── Source type counts for stat chips ───
type SourceCategory = "cron" | "chat" | "backlog" | "webhook" | "system";

const sourceCategoryConfig: Record<SourceCategory, { icon: typeof RefreshCw; label: string; bg: string; activeBg: string; text: string; activeText: string }> = {
  cron: { icon: RefreshCw, label: "Cron", bg: "bg-white/[0.03]", activeBg: "bg-orange-500/15 ring-1 ring-orange-500/30", text: "text-white/50", activeText: "text-orange-300" },
  chat: { icon: MessageSquare, label: "Chat", bg: "bg-white/[0.03]", activeBg: "bg-blue-500/15 ring-1 ring-blue-500/30", text: "text-white/50", activeText: "text-blue-300" },
  backlog: { icon: FileText, label: "Backlog", bg: "bg-white/[0.03]", activeBg: "bg-purple-500/15 ring-1 ring-purple-500/30", text: "text-white/50", activeText: "text-purple-300" },
  webhook: { icon: Globe, label: "Webhook", bg: "bg-white/[0.03]", activeBg: "bg-cyan-500/15 ring-1 ring-cyan-500/30", text: "text-white/50", activeText: "text-cyan-300" },
  system: { icon: Terminal, label: "System", bg: "bg-white/[0.03]", activeBg: "bg-white/10 ring-1 ring-white/20", text: "text-white/50", activeText: "text-white/70" },
};

function getSourceCategory(source: TriggerSource): SourceCategory {
  if (source.type === "heartbeat") return "system";
  return source.type as SourceCategory;
}

export default function ActivityPage() {
  const [view, setView] = useState<ViewMode>("timeline");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSourceFilter, setActiveSourceFilter] = useState<SourceCategory | null>(null);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [modelFilter, setModelFilter] = useState<string | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Counts by source category
  const sourceCounts: Record<SourceCategory, number> = { cron: 0, chat: 0, backlog: 0, webhook: 0, system: 0 };
  for (const e of allActivity) {
    sourceCounts[getSourceCategory(e.source)]++;
  }

  // Unique projects and models for filter dropdown
  const allProjects = [...new Set(allActivity.map(e => e.project).filter(Boolean))] as string[];
  const allModels = [...new Set(allActivity.map(e => e.model).filter(Boolean))] as string[];

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
  if (activeSourceFilter) {
    filtered = filtered.filter(e => getSourceCategory(e.source) === activeSourceFilter);
  }
  if (projectFilter) {
    filtered = filtered.filter(e => e.project === projectFilter);
  }
  if (modelFilter) {
    filtered = filtered.filter(e => e.model === modelFilter);
  }

  const activeFilterCount = [activeSourceFilter, projectFilter, modelFilter].filter(Boolean).length;

  // Group by date for rendering
  const dateGroups: { date: string; events: ActivityEvent[] }[] = [];
  let currentDate = "";
  for (const e of filtered) {
    if (e.date !== currentDate) {
      currentDate = e.date;
      dateGroups.push({ date: e.date, events: [] });
    }
    dateGroups[dateGroups.length - 1].events.push(e);
  }

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
              <LayoutList className="h-3.5 w-3.5" />
              Timeline
            </button>
            <button
              onClick={() => setView("tasks")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === "tasks" ? "bg-orange-500/20 text-orange-300" : "text-white/40 hover:text-white/60"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Tasks
            </button>
          </div>
        </div>

        {/* Source chips + Filter button row */}
        <div className="flex items-center gap-3 mb-3">
          {/* Source chips — smaller/sleeker */}
          <div className="flex items-center gap-1.5 flex-1">
            <button
              onClick={() => setActiveSourceFilter(null)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
                activeSourceFilter === null
                  ? "bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/25"
                  : "bg-white/[0.03] text-white/40 hover:bg-white/[0.06]"
              }`}
            >
              <span className="font-bold tabular-nums">{allActivity.length}</span>
              <span className="opacity-70">All</span>
            </button>

            {(Object.entries(sourceCategoryConfig) as [SourceCategory, typeof sourceCategoryConfig[SourceCategory]][]).map(([key, config]) => {
              const count = sourceCounts[key];
              if (count === 0) return null;
              const isActive = activeSourceFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveSourceFilter(isActive ? null : key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
                    isActive ? `${config.activeBg} ${config.activeText}` : `bg-white/[0.03] text-white/40 hover:bg-white/[0.06]`
                  }`}
                >
                  <config.icon className="h-3 w-3" />
                  <span className="font-bold tabular-nums">{count}</span>
                  <span className="opacity-70">{config.label}</span>
                </button>
              );
            })}
          </div>

          {/* Filter button */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all border ${
                activeFilterCount > 0
                  ? "bg-orange-500/10 border-orange-500/20 text-orange-300"
                  : "bg-white/[0.03] border-white/5 text-white/40 hover:bg-white/[0.06] hover:text-white/60"
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="ml-0.5 h-4 w-4 rounded-full bg-orange-500/30 text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={`h-3 w-3 transition-transform ${showFilterMenu ? "rotate-180" : ""}`} />
            </button>

            {/* Filter dropdown */}
            {showFilterMenu && (
              <div className="absolute right-0 top-full mt-1 w-64 rounded-xl bg-[#1a1614] border border-white/10 shadow-2xl shadow-black/40 z-50 overflow-hidden">
                {/* Project filter */}
                <div className="p-3 border-b border-white/5">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Project</p>
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => setProjectFilter(null)}
                      className={`text-[11px] px-2 py-0.5 rounded-md transition-all ${
                        projectFilter === null ? "bg-orange-500/20 text-orange-300" : "text-white/30 hover:bg-white/5"
                      }`}
                    >
                      All
                    </button>
                    {allProjects.map(p => (
                      <button
                        key={p}
                        onClick={() => setProjectFilter(projectFilter === p ? null : p)}
                        className={`text-[11px] px-2 py-0.5 rounded-md transition-all ${
                          projectFilter === p ? "bg-orange-500/20 text-orange-300" : "text-white/30 hover:bg-white/5"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model filter */}
                <div className="p-3 border-b border-white/5">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Model</p>
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => setModelFilter(null)}
                      className={`text-[11px] px-2 py-0.5 rounded-md transition-all ${
                        modelFilter === null ? "bg-orange-500/20 text-orange-300" : "text-white/30 hover:bg-white/5"
                      }`}
                    >
                      All
                    </button>
                    {allModels.map(m => (
                      <button
                        key={m}
                        onClick={() => setModelFilter(modelFilter === m ? null : m)}
                        className={`text-[11px] px-2 py-0.5 rounded-md transition-all flex items-center gap-1 ${
                          modelFilter === m ? "bg-orange-500/20 text-orange-300" : "text-white/30 hover:bg-white/5"
                        }`}
                      >
                        <Sparkles className="h-2.5 w-2.5" /> {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear + close */}
                <div className="p-2 flex items-center justify-between">
                  <button
                    onClick={() => { setProjectFilter(null); setModelFilter(null); setActiveSourceFilter(null); }}
                    className="text-[11px] text-white/25 hover:text-white/40 px-2 py-1"
                  >
                    Clear all
                  </button>
                  <button
                    onClick={() => setShowFilterMenu(false)}
                    className="text-[11px] text-orange-400 hover:text-orange-300 px-2 py-1"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active filter pills */}
        {(projectFilter || modelFilter) && (
          <div className="flex items-center gap-1.5 mb-3">
            {projectFilter && (
              <button onClick={() => setProjectFilter(null)} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-300 hover:bg-orange-500/20">
                {projectFilter} <X className="h-2.5 w-2.5" />
              </button>
            )}
            {modelFilter && (
              <button onClick={() => setModelFilter(null)} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-300 hover:bg-orange-500/20">
                <Sparkles className="h-2 w-2" /> {modelFilter} <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search activity..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="flex-1 overflow-y-auto">
        {dateGroups.map(({ date, events }) => (
          <div key={date}>
            {/* Date header */}
            <div className="sticky top-0 z-10 px-6 py-2 bg-[#161210]/95 backdrop-blur-sm border-b border-white/5">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-orange-400" />
                <span className="text-sm font-semibold text-white/60">{date}</span>
                <span className="text-[10px] text-white/20">{events.length} events</span>
              </div>
            </div>

            {/* Timeline header row */}
            {view === "timeline" && (
              <div className="px-6 py-1.5 flex items-center gap-3 text-[10px] text-white/20 uppercase tracking-wider border-b border-white/5">
                <span className="w-3" />
                <span className="w-16">Time</span>
                <span className="flex-1">Action</span>
                <span className="w-36 text-right">Project</span>
                <span className="w-20 text-right">Source</span>
                <span className="w-16 text-right">Model</span>
                <span className="w-14 text-right">Duration</span>
              </div>
            )}

            {view === "timeline" && events.map((event) => (
              <CompactRow
                key={event.id}
                event={event}
                expanded={expandedId === event.id}
                onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
              />
            ))}

            {view === "tasks" && (() => {
              // Group into task cards: only show "complete" and "running" as cards, collapse "action"/"info" steps
              const taskCards = events.filter(e => e.type === "complete" || e.type === "start" || e.type === "error");
              const backgroundCount = events.length - taskCards.length;
              return (
                <>
                  <div className="p-3 space-y-2">
                    {taskCards.map((event) => (
                      <TaskCard
                        key={event.id}
                        event={event}
                        steps={events.filter(e => e.task === event.task && e.id !== event.id)}
                        expanded={expandedId === event.id}
                        onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
                      />
                    ))}
                    {backgroundCount > 0 && (
                      <div className="rounded-lg border border-white/5 bg-white/[0.01] px-4 py-2 flex items-center justify-between">
                        <span className="text-[10px] text-white/20">+ {backgroundCount} background steps</span>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
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

// ─── Compact Row (expandable) ───
function CompactRow({ event, expanded, onToggle }: {
  event: ActivityEvent;
  expanded: boolean;
  onToggle: () => void;
}) {
  const config = getSourceConfig(event.source);

  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full text-left px-6 py-2 flex items-center gap-3 text-xs transition-all ${
          expanded
            ? "bg-white/[0.04]"
            : "hover:bg-white/[0.02]"
        } ${event.type === "error" ? "border-l-2 border-red-500/50" : ""}`}
      >
        <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${getTypeDot(event.type)}`} />
        <span className="text-white/30 w-16 flex-shrink-0 tabular-nums">{event.time}</span>
        <span className={`flex-1 truncate ${
          event.type === "complete" ? "text-white/80 font-medium" :
          event.type === "error" ? "text-red-300/80" :
          event.type === "start" ? "text-blue-300/70" :
          "text-white/50"
        }`}>{event.action}</span>
        <span className="w-36 text-right truncate flex-shrink-0">
          {event.project ? (
            <>
              <span className="text-white/35">{event.project}</span>
              {event.task !== event.project && (
                <span className="text-white/15"> › {event.task}</span>
              )}
            </>
          ) : (
            <span className="text-white/20">{event.task}</span>
          )}
        </span>
        <span className={`w-20 text-right ${config.text} text-[10px]`}>{config.label}</span>
        <span className="w-16 text-right text-white/20">{event.model || "—"}</span>
        <span className="w-14 text-right text-white/20">{event.duration || "—"}</span>
        <ChevronRight className={`h-3 w-3 text-white/15 flex-shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="px-6 pb-3">
          <div className="ml-7 p-4 rounded-xl bg-white/[0.025] border border-white/5">
            {event.description && (
              <p className="text-sm text-white/60 leading-relaxed mb-3">{event.description}</p>
            )}

            {/* Detail grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {event.duration && (
                <div className="p-2 rounded-lg bg-white/[0.03]">
                  <p className="text-[10px] text-white/25 mb-0.5">Duration</p>
                  <p className="text-sm font-medium text-white/70 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-white/30" /> {event.duration}
                  </p>
                </div>
              )}
              {event.model && (
                <div className="p-2 rounded-lg bg-white/[0.03]">
                  <p className="text-[10px] text-white/25 mb-0.5">Model</p>
                  <p className="text-sm font-medium text-white/70 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-orange-400/50" /> {event.model}
                  </p>
                </div>
              )}
              {event.cost !== undefined && event.cost > 0 && (
                <div className="p-2 rounded-lg bg-white/[0.03]">
                  <p className="text-[10px] text-white/25 mb-0.5">Cost</p>
                  <p className="text-sm font-medium text-white/70 flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-amber-400/50" /> ${event.cost.toFixed(2)}
                  </p>
                </div>
              )}
              {event.tokens && (
                <div className="p-2 rounded-lg bg-white/[0.03]">
                  <p className="text-[10px] text-white/25 mb-0.5">Tokens</p>
                  <p className="text-sm font-medium text-white/70 flex items-center gap-1">
                    <Zap className="h-3 w-3 text-yellow-400/50" /> {((event.tokens.in + event.tokens.out) / 1000).toFixed(1)}K
                  </p>
                  <p className="text-[10px] text-white/20">{event.tokens.in.toLocaleString()} in · {event.tokens.out.toLocaleString()} out</p>
                </div>
              )}
            </div>

            {/* Source + project */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
              <SourceBadge source={event.source} />
              {event.project && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-white/30">{event.project}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Timeline Row ───
function TimelineRow({ event, expanded, onToggle }: {
  event: ActivityEvent;
  expanded: boolean;
  onToggle: () => void;
}) {
  const config = getSourceConfig(event.source);

  return (
    <div className="px-6">
      <button
        onClick={onToggle}
        className={`w-full text-left flex items-start gap-4 py-3 px-3 -mx-3 rounded-xl transition-all ${
          expanded ? "bg-white/[0.03]" : "hover:bg-white/[0.015]"
        }`}
      >
        <div className="flex flex-col items-center pt-1">
          <div className={`h-2.5 w-2.5 rounded-full ${getTypeDot(event.type)} ring-2 ring-white/5`} />
          <div className="w-px flex-1 bg-white/5 mt-1" />
        </div>
        <div className="flex-1 min-w-0 pb-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-white">{event.action}</span>
          </div>
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
        <span className="text-xs text-white/30 pt-0.5 flex-shrink-0">{event.time}</span>
      </button>

      {expanded && event.description && (
        <div className="ml-7 mb-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <p className="text-sm text-white/60 leading-relaxed mb-3">{event.description}</p>
          <div className="flex items-center gap-4 text-xs text-white/30">
            {event.duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {event.duration}</span>}
            {event.tokens && <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {((event.tokens.in + event.tokens.out) / 1000).toFixed(1)}K tokens</span>}
            {event.cost !== undefined && event.cost > 0 && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> ${event.cost.toFixed(2)}</span>}
          </div>
          <div className="mt-3 pt-3 border-t border-white/5">
            <SourceBadge source={event.source} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Task Card (Option A) ───
function TaskCard({ event, steps, expanded, onToggle }: {
  event: ActivityEvent;
  steps: ActivityEvent[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const isRunning = event.type === "start";
  const isError = event.type === "error";

  return (
    <div className={`rounded-xl border transition-all ${
      isRunning ? "border-orange-500/15 bg-orange-500/[0.03]" :
      isError ? "border-red-500/20 bg-red-500/[0.03]" :
      "border-white/5 bg-white/[0.02] hover:border-white/10"
    }`}>
      <button onClick={onToggle} className="w-full text-left p-4">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${
              isRunning ? "bg-orange-400 animate-pulse" :
              isError ? "bg-red-400" : "bg-green-400"
            }`} />
            <h3 className={`text-sm font-semibold ${
              isRunning ? "text-orange-200" : isError ? "text-red-300" : "text-white"
            }`}>{event.action}</h3>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-white/30">{event.time}</p>
            {event.duration && <p className="text-[10px] text-white/15">{event.duration}</p>}
          </div>
        </div>

        {event.description && (
          <p className="text-xs text-white/40 ml-4 mb-2">{event.description}</p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 ml-4">
          <SourceBadge source={event.source} compact />
          {event.project && <span className="text-[10px] text-white/20">{event.project}</span>}
          {event.model && <span className="text-[10px] text-white/20">{event.model}</span>}
          {event.cost !== undefined && event.cost > 0 && <span className="text-[10px] text-white/20">${event.cost.toFixed(2)}</span>}
          {event.tokens && <span className="text-[10px] text-white/15">{((event.tokens.in + event.tokens.out) / 1000).toFixed(1)}K tokens</span>}
        </div>

        {/* Steps count */}
        {steps.length > 0 && (
          <div className="ml-4 mt-2 pt-2 border-t border-white/5">
            <span className="text-[10px] text-white/20 flex items-center gap-1">
              <ChevronRight className={`h-2.5 w-2.5 transition-transform ${expanded ? "rotate-90" : ""}`} />
              {steps.length} steps
              {event.duration && ` · ${event.duration} total`}
            </span>
          </div>
        )}
      </button>

      {/* Expanded steps */}
      {expanded && steps.length > 0 && (
        <div className="px-4 pb-3 ml-4 space-y-0.5">
          {steps.map(step => (
            <div key={step.id} className="flex items-center gap-2 py-1 text-[10px]">
              <div className={`h-1 w-1 rounded-full ${getTypeDot(step.type)}`} />
              <span className="text-white/30 w-14">{step.time}</span>
              <span className="text-white/40">{step.action}</span>
              {step.model && <span className="text-white/15 ml-auto">{step.model}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
