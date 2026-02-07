"use client";

import { useState } from "react";
import { 
  Clock, 
  Zap, 
  DollarSign,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  MoreHorizontal,
  Play,
  ChevronRight,
  ChevronDown,
  Send,
  Calendar,
  Plus,
  ArrowRight,
  Timer,
  Bot,
  RefreshCw,
  Terminal,
  Globe,
  GitBranch,
  Mail,
  Search,
  FileText,
  TrendingUp,
  Activity
} from "lucide-react";

// ─── Source / Trigger Types ───
// Every activity has a source that tells you WHERE it came from
type TriggerSource = 
  | { type: "cron"; jobName: string; schedule: string }
  | { type: "chat"; channel: string; user: string }
  | { type: "backlog"; itemId: string; itemTitle: string }
  | { type: "system"; reason: string }
  | { type: "webhook"; service: string; event: string }
  | { type: "heartbeat" };

// ─── Activity Event (rich model) ───
interface ActivityEvent {
  id: string;
  action: string;
  description?: string;
  task: string;
  time: string;
  type: "complete" | "action" | "start" | "error" | "info";
  source: TriggerSource;
  model?: string;
  cost?: number;
  duration?: string;
  tokens?: { in: number; out: number };
}

// ─── Backlog items ───
const backlogItems = [
  {
    id: "1",
    title: "Agent Blueprints - Next Steps",
    description: "Figure out direction for the project",
    status: "needs-discussion",
    messages: 12,
    project: "Side Projects",
    projectColor: "blue"
  },
  {
    id: "2",
    title: "Research Hyperliquid competitors",
    description: "Analyze competing platforms and features",
    status: "ready",
    messages: 0,
    project: "Lit.trade",
    projectColor: "purple"
  },
  {
    id: "3",
    title: "Write blog post about AI agents",
    description: "Content piece for the website",
    status: "needs-discussion",
    messages: 3,
    project: "Content",
    projectColor: "red"
  },
  {
    id: "4",
    title: "Build pricing page for Chartr",
    description: "Design and implement pricing tiers",
    status: "ready",
    messages: 0,
    project: "Chartr",
    projectColor: "green"
  },
];

// ─── Active tasks ───
const activeTasks = [
  {
    id: "t1",
    title: "Content Research",
    description: "AI job displacement research",
    status: "running",
    progress: 65,
    startedAt: "3:58am",
    source: { type: "cron" as const, jobName: "content-research", schedule: "daily 3:30am" }
  },
  {
    id: "t2",
    title: "Lit Revenue Check",
    description: "Daily automated check",
    status: "scheduled",
    scheduledFor: "2:00pm",
    source: { type: "cron" as const, jobName: "lit-revenue", schedule: "daily 2:00pm" }
  },
];

// ─── Rich activity feed with sources ───
const recentActivity: ActivityEvent[] = [
  { 
    id: "a1", 
    action: "Morning Brief sent", 
    description: "Daily summary delivered to #general with market overview, calendar, and priority tasks.",
    task: "Morning Brief", 
    time: "8:32am", 
    type: "complete",
    source: { type: "cron", jobName: "morning-brief", schedule: "daily 8:30am" },
    model: "Sonnet",
    cost: 0.24,
    duration: "2m 05s",
    tokens: { in: 1250, out: 890 }
  },
  { 
    id: "a2", 
    action: "Generated summary", 
    task: "Morning Brief", 
    time: "8:31am", 
    type: "action",
    source: { type: "cron", jobName: "morning-brief", schedule: "daily 8:30am" },
    model: "Sonnet"
  },
  { 
    id: "a3", 
    action: "Fetched calendar events", 
    task: "Morning Brief", 
    time: "8:30am", 
    type: "action",
    source: { type: "cron", jobName: "morning-brief", schedule: "daily 8:30am" }
  },
  { 
    id: "a4", 
    action: "Lit Analysis complete", 
    description: "24h volume: $1.2M (+12%), fees: $1.2K. Report pushed to #lit-trade.",
    task: "Lit Analysis", 
    time: "7:45am", 
    type: "complete",
    source: { type: "cron", jobName: "lit-analysis", schedule: "daily 7:30am" },
    model: "Sonnet",
    cost: 0.18,
    duration: "1m 12s",
    tokens: { in: 980, out: 650 }
  },
  { 
    id: "a5", 
    action: "Queried Hyperliquid API", 
    task: "Lit Analysis", 
    time: "7:44am", 
    type: "action",
    source: { type: "cron", jobName: "lit-analysis", schedule: "daily 7:30am" }
  },
  { 
    id: "a6", 
    action: "Dashboard redesign deployed", 
    description: "Updated 3-column layout with backlog, task tracker, and context-aware chat. Pushed to Vercel.",
    task: "ClawHQ Dev", 
    time: "6:51am", 
    type: "complete",
    source: { type: "chat", channel: "#claw-hq", user: "Bill" },
    model: "Opus",
    cost: 0.92,
    duration: "45m",
    tokens: { in: 8500, out: 6200 }
  },
  { 
    id: "a7", 
    action: "Heartbeat check — all clear", 
    task: "System", 
    time: "6:00am", 
    type: "info",
    source: { type: "heartbeat" }
  },
  {
    id: "a8",
    action: "GitHub webhook: PR merged",
    description: "PR #42 'feat: activity calendar' merged into main.",
    task: "ClawHQ Dev",
    time: "5:45am",
    type: "info",
    source: { type: "webhook", service: "GitHub", event: "pull_request.merged" }
  },
  {
    id: "a9",
    action: "Email draft: Investor Update",
    description: "Drafted Q4 investor update covering Lit.trade metrics and roadmap.",
    task: "Email",
    time: "11:30pm",
    type: "complete",
    source: { type: "chat", channel: "Telegram", user: "Bill" },
    model: "Sonnet",
    cost: 0.32,
    duration: "8m",
    tokens: { in: 1800, out: 1200 }
  },
  {
    id: "a10",
    action: "Competitor research started",
    description: "Kicked off from backlog item. Analyzing Hyperliquid competitor platforms.",
    task: "Research",
    time: "Yesterday",
    type: "start",
    source: { type: "backlog", itemId: "2", itemTitle: "Research Hyperliquid competitors" },
    model: "Opus"
  },
];

// Chat messages (mock)
const chatContexts: Record<string, Array<{role: string, content: string, time: string}>> = {
  "general": [
    { role: "user", content: "Give me a quick summary of what you did today", time: "8:35am" },
    { role: "assistant", content: "Good morning! Here's your summary:\n\n✅ Morning Brief - Sent at 8:32am\n✅ Lit Analysis - Revenue up 12%\n🔄 Content Research - 65% complete\n🚀 Dashboard deployed to Vercel\n\nTotal spend so far: $2.45", time: "8:35am" },
  ],
  "1": [
    { role: "user", content: "What should we do with Agent Blueprints?", time: "Yesterday" },
    { role: "assistant", content: "I see a few directions we could take:\n\n1. Focus on templates - pre-built agent configs\n2. Build community - let users share setups\n3. Educational content - tutorials and guides\n\nWhat resonates with you?", time: "Yesterday" },
    { role: "user", content: "I like the templates idea but not sure how to package it", time: "Yesterday" },
    { role: "assistant", content: "We could create 'starter kits' - each one includes:\n- AGENTS.md template\n- SOUL.md with personality\n- Recommended skills\n- Sample cron jobs\n\nWant me to draft one as a prototype?", time: "Yesterday" },
  ],
};

// ─── Source badge rendering ───
const SourceBadge = ({ source, compact = false }: { source: TriggerSource; compact?: boolean }) => {
  const config = getSourceConfig(source);
  
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md ${config.bg} ${config.text} border ${config.border}`} title={config.tooltip}>
        <config.icon className="h-2.5 w-2.5" />
        <span>{config.label}</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg ${config.bg} ${config.text} border ${config.border}`} title={config.tooltip}>
      <config.icon className="h-3 w-3" />
      <span className="font-medium">{config.label}</span>
      {config.detail && <span className="opacity-60">· {config.detail}</span>}
    </div>
  );
};

function getSourceConfig(source: TriggerSource) {
  switch (source.type) {
    case "cron":
      return {
        icon: RefreshCw,
        label: "Cron",
        detail: source.jobName,
        tooltip: `Cron job: ${source.jobName} (${source.schedule})`,
        bg: "bg-orange-500/10",
        text: "text-orange-300",
        border: "border-orange-500/20"
      };
    case "chat":
      return {
        icon: MessageSquare,
        label: source.channel,
        detail: source.user,
        tooltip: `Chat: ${source.channel} by ${source.user}`,
        bg: "bg-blue-500/10",
        text: "text-blue-300",
        border: "border-blue-500/20"
      };
    case "backlog":
      return {
        icon: FileText,
        label: "Backlog",
        detail: source.itemTitle.length > 20 ? source.itemTitle.slice(0, 20) + "…" : source.itemTitle,
        tooltip: `From backlog: ${source.itemTitle}`,
        bg: "bg-purple-500/10",
        text: "text-purple-300",
        border: "border-purple-500/20"
      };
    case "webhook":
      return {
        icon: Globe,
        label: source.service,
        detail: source.event,
        tooltip: `Webhook: ${source.service} → ${source.event}`,
        bg: "bg-cyan-500/10",
        text: "text-cyan-300",
        border: "border-cyan-500/20"
      };
    case "heartbeat":
      return {
        icon: Activity,
        label: "Heartbeat",
        detail: null,
        tooltip: "Periodic heartbeat check",
        bg: "bg-white/5",
        text: "text-white/50",
        border: "border-white/10"
      };
    case "system":
      return {
        icon: Terminal,
        label: "System",
        detail: source.reason,
        tooltip: `System: ${source.reason}`,
        bg: "bg-white/5",
        text: "text-white/50",
        border: "border-white/10"
      };
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "needs-discussion": return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    case "ready": return "bg-green-500/20 text-green-300 border-green-500/30";
    default: return "bg-white/10 text-white/50 border-white/10";
  }
};

const getProjectColor = (color: string) => {
  switch (color) {
    case "purple": return "bg-purple-400";
    case "red": return "bg-red-400";
    case "orange": return "bg-orange-400";
    case "blue": return "bg-blue-400";
    case "green": return "bg-green-400";
    default: return "bg-white/40";
  }
};

const getActivityDotColor = (type: string) => {
  switch (type) {
    case "complete": return "bg-green-400";
    case "start": return "bg-blue-400";
    case "error": return "bg-red-400";
    case "info": return "bg-white/30";
    default: return "bg-white/20";
  }
};

export default function Dashboard() {
  const [chatContext, setChatContext] = useState<string>("general");
  const [inputValue, setInputValue] = useState("");
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  
  const currentMessages = chatContexts[chatContext] || chatContexts["general"];
  const contextItem = backlogItems.find(item => item.id === chatContext);

  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <div className="flex-shrink-0 border-b border-white/5 bg-white/[0.01] px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-orange-500/10">
              <Sparkles className="h-5 w-5 text-orange-400" />
            </div>
            <span className="text-lg font-bold text-white">ClawHQ</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-white font-medium">12</span>
              <span className="text-white/50">tasks</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10">
              <Clock className="h-4 w-4 text-orange-400" />
              <span className="text-white font-medium">8</span>
              <span className="text-white/50">cron</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10">
              <DollarSign className="h-4 w-4 text-amber-400" />
              <span className="text-white font-medium">$2.45</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10">
              <Zap className="h-4 w-4 text-yellow-400" />
              <span className="text-white font-medium">4.2h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - 3 columns */}
      <div className="flex-1 flex min-h-0">
        
        {/* ═══ LEFT: Backlog ═══ */}
        <div className="w-80 flex flex-col bg-white/[0.005]">
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2">
                📝 Backlog
                <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/50">
                  {backlogItems.length}
                </span>
              </h2>
              <button className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-white">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-white/40 mt-1">Ideas & planning</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {backlogItems.map((item) => (
              <div 
                key={item.id}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all group"
              >
                <div className="flex items-start gap-2 mb-2">
                  <div className={`h-2 w-2 rounded-full mt-1.5 ${getProjectColor(item.projectColor)}`} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-white truncate">{item.title}</h3>
                    <p className="text-xs text-white/40 truncate">{item.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusColor(item.status)}`}>
                    {item.status === "needs-discussion" ? "Discuss" : "Ready"}
                  </span>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setChatContext(item.id)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"
                      title="Discuss"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-green-400 transition-all"
                      title="Run now"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-orange-400 transition-all"
                      title="Schedule"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                
                {item.messages > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-white/30">
                    <MessageSquare className="h-3 w-3" />
                    <span className="text-[10px]">{item.messages} messages</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="p-3 border-t border-white/5">
            <button className="w-full p-2.5 rounded-xl border border-dashed border-white/10 text-white/30 hover:text-white/50 hover:border-white/20 hover:bg-white/[0.02] transition-all text-sm flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" />
              Add idea
            </button>
          </div>
        </div>

        {/* ═══ DIVIDER ═══ */}
        <div className="w-px bg-white/10" />

        {/* ═══ MIDDLE: Task Tracker + Activity ═══ */}
        <div className="w-[420px] flex flex-col bg-white/[0.005]">
          {/* Task Tracker */}
          <div className="p-4 border-b border-white/5">
            <h2 className="font-semibold text-white flex items-center gap-2">
              🤖 Task Tracker
              <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/50">
                {activeTasks.length}
              </span>
            </h2>
            <p className="text-xs text-white/40 mt-1">Active & scheduled</p>
          </div>
          
          <div className="p-3 space-y-2">
            {activeTasks.map((task) => (
              <div 
                key={task.id}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/5"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-sm font-medium text-white">{task.title}</h3>
                  {task.status === "running" ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                      Running
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      {task.scheduledFor}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/40 mb-2">{task.description}</p>
                <div className="flex items-center gap-2 mb-2">
                  <SourceBadge source={task.source} compact />
                </div>
                {task.progress && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-white/10">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-white/40">{task.progress}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ─── Activity Feed ─── */}
          <div className="flex-1 flex flex-col min-h-0 border-t border-white/5">
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  ⚡ Activity
                </h2>
                <div className="flex items-center gap-1">
                  {/* Source filter chips */}
                  <button className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60 transition-all">All</button>
                  <button className="text-[9px] px-2 py-0.5 rounded-full text-white/30 hover:bg-orange-500/10 hover:text-orange-300 transition-all">Cron</button>
                  <button className="text-[9px] px-2 py-0.5 rounded-full text-white/30 hover:bg-blue-500/10 hover:text-blue-300 transition-all">Chat</button>
                  <button className="text-[9px] px-2 py-0.5 rounded-full text-white/30 hover:bg-purple-500/10 hover:text-purple-300 transition-all">Backlog</button>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
              {recentActivity.map((activity) => (
                <div key={activity.id}>
                  <button 
                    onClick={() => setExpandedActivity(expandedActivity === activity.id ? null : activity.id)}
                    className={`w-full text-left flex items-start gap-3 p-2.5 rounded-lg transition-all ${
                      expandedActivity === activity.id 
                        ? "bg-white/[0.04] border border-white/10" 
                        : "hover:bg-white/[0.02] border border-transparent"
                    }`}
                  >
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center mt-1">
                      <div className={`h-2 w-2 rounded-full ${getActivityDotColor(activity.type)}`} />
                      {expandedActivity !== activity.id && (
                        <div className="w-px h-4 bg-white/5 mt-1" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs text-white/80 font-medium truncate">{activity.action}</p>
                        <span className="text-[10px] text-white/30 flex-shrink-0">{activity.time}</span>
                      </div>
                      
                      {/* Source badge - always visible */}
                      <div className="flex items-center gap-2 mt-1">
                        <SourceBadge source={activity.source} compact />
                        {activity.model && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/30">
                            {activity.model}
                          </span>
                        )}
                        {activity.cost !== undefined && activity.cost > 0 && (
                          <span className="text-[9px] text-white/30">
                            ${activity.cost.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  
                  {/* Expanded detail */}
                  {expandedActivity === activity.id && activity.description && (
                    <div className="ml-7 mb-2 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                      <p className="text-xs text-white/60 leading-relaxed mb-2">{activity.description}</p>
                      
                      <div className="flex items-center gap-3 text-[10px] text-white/30">
                        {activity.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" /> {activity.duration}
                          </span>
                        )}
                        {activity.tokens && (
                          <span className="flex items-center gap-1">
                            <Zap className="h-2.5 w-2.5" /> {((activity.tokens.in + activity.tokens.out) / 1000).toFixed(1)}K tokens
                          </span>
                        )}
                        {activity.model && (
                          <span className="flex items-center gap-1">
                            <Sparkles className="h-2.5 w-2.5" /> {activity.model}
                          </span>
                        )}
                      </div>
                      
                      {/* Source detail */}
                      <div className="mt-2 pt-2 border-t border-white/5">
                        <SourceBadge source={activity.source} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="p-3 border-t border-white/5">
              <button className="w-full text-xs text-orange-400 hover:text-orange-300 flex items-center justify-center gap-1">
                View all activity <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* ═══ DIVIDER ═══ */}
        <div className="w-px bg-white/10" />

        {/* ═══ RIGHT: Chat ═══ */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Header */}
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-orange-400" />
                <h2 className="font-semibold text-white">Chat</h2>
              </div>
              <button 
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                onClick={() => setChatContext("general")}
              >
                <span className="text-sm text-white/70">
                  {contextItem ? `📎 ${contextItem.title.slice(0, 20)}...` : "General"}
                </span>
                <ChevronDown className="h-4 w-4 text-white/40" />
              </button>
            </div>
            {contextItem && (
              <p className="text-xs text-white/40 mt-1">
                Discussing: {contextItem.title}
              </p>
            )}
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {currentMessages.map((message, i) => (
              <div 
                key={i}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[80%] ${
                  message.role === "user" 
                    ? "bg-orange-500/20 rounded-2xl rounded-tr-sm" 
                    : "bg-white/[0.03] rounded-2xl rounded-tl-sm"
                } px-4 py-3`}>
                  <p className="text-sm text-white/90 whitespace-pre-wrap">{message.content}</p>
                  <p className="text-[10px] text-white/30 mt-1">{message.time}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input 
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={contextItem ? `Ask about ${contextItem.title}...` : "Ask Lolo anything..."}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                />
              </div>
              <button className="p-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-all">
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
