"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  DollarSign,
  Zap,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronRight,
  Plus,
  Play,
  Calendar,
  RefreshCw,
  Terminal,
  Globe,
  Activity,
  FileText,
  ArrowRight,
  Lightbulb,
  Hash,
  Loader2,
} from "lucide-react";

// ─── Types ───
type TriggerSource =
  | { type: "cron"; jobName: string; schedule: string }
  | { type: "chat"; channel: string; user: string }
  | { type: "backlog"; itemId: string; itemTitle: string }
  | { type: "system"; reason: string }
  | { type: "webhook"; service: string; event: string }
  | { type: "heartbeat" };

interface QueueItem {
  id: string;
  title: string;
  note?: string;
  status: "idea" | "discussing" | "ready" | "running";
  capturedFrom: { type: "chat"; channel: string } | { type: "manual" } | { type: "cron-suggestion" };
  capturedAt: string;
  messages: number;
}

interface ProjectGroup {
  name: string;
  color: string;
  items: QueueItem[];
}

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

// ─── Data ───
const projects: ProjectGroup[] = [
  {
    name: "Lit.trade", color: "purple",
    items: [
      { id: "q1", title: "Add referral program", note: "User-to-user referrals with fee discount for first 30 days", status: "discussing", capturedFrom: { type: "chat", channel: "Telegram" }, capturedAt: "2h ago", messages: 4 },
      { id: "q2", title: "Trade journaling MVP", note: "Core differentiator — let users tag and annotate trades", status: "ready", capturedFrom: { type: "chat", channel: "#lit-trade" }, capturedAt: "Yesterday", messages: 8 },
      { id: "q3", title: "Competitor analysis: dYdX, GMX", status: "running", capturedFrom: { type: "chat", channel: "Telegram" }, capturedAt: "3h ago", messages: 0 },
      { id: "q8", title: "Fee tier restructuring", note: "Consider volume-based discounts", status: "idea", capturedFrom: { type: "chat", channel: "#lit-trade" }, capturedAt: "4d ago", messages: 1 },
    ]
  },
  {
    name: "Content", color: "red",
    items: [
      { id: "q4", title: "Video: Why AI agents need souls", status: "discussing", capturedFrom: { type: "chat", channel: "Telegram" }, capturedAt: "5h ago", messages: 3 },
      { id: "q5", title: "Set up Xiaohongshu schedule", status: "idea", capturedFrom: { type: "manual" }, capturedAt: "2d ago", messages: 0 },
      { id: "q9", title: "YouTube channel branding", status: "idea", capturedFrom: { type: "manual" }, capturedAt: "5d ago", messages: 0 },
    ]
  },
  {
    name: "ClawHQ", color: "orange",
    items: [
      { id: "q6", title: "Real-time OpenClaw connection", note: "Hook up to actual gateway API", status: "idea", capturedFrom: { type: "chat", channel: "#claw-hq" }, capturedAt: "Today", messages: 2 },
    ]
  },
  {
    name: "Chartr", color: "green",
    items: [
      { id: "q7", title: "Landing page copy", note: "Clear value prop for web3 legal audience", status: "idea", capturedFrom: { type: "manual" }, capturedAt: "3d ago", messages: 0 },
    ]
  },
];

const activeTasks = [
  { id: "t1", title: "Content Research: AI job displacement", progress: 65, startedAt: "3:58am", source: { type: "cron" as const, jobName: "content-research", schedule: "daily 3:30am" }, project: "Content" },
  { id: "t2", title: "Competitor analysis: dYdX, GMX", progress: 20, startedAt: "4:22pm", source: { type: "backlog" as const, itemId: "q3", itemTitle: "Competitor analysis" }, project: "Lit.trade" },
];

const recentActivity: ActivityEvent[] = [
  { id: "a1", action: "Morning Brief sent", description: "Daily summary with market overview, calendar, and priority tasks.", task: "Morning Brief", time: "8:32am", type: "complete", source: { type: "cron", jobName: "morning-brief", schedule: "daily 8:30am" }, model: "Sonnet", cost: 0.24, duration: "2m 05s", tokens: { in: 1250, out: 890 } },
  { id: "a4", action: "Lit Analysis complete", description: "24h volume: $1.2M (+12%), fees: $1.2K.", task: "Lit Analysis", time: "7:45am", type: "complete", source: { type: "cron", jobName: "lit-analysis", schedule: "daily 7:30am" }, model: "Sonnet", cost: 0.18, duration: "1m 12s" },
  { id: "a6", action: "Dashboard deployed to Vercel", task: "ClawHQ Dev", time: "6:51am", type: "complete", source: { type: "chat", channel: "#claw-hq", user: "Bill" }, model: "Opus", cost: 0.92, duration: "45m" },
  { id: "a7", action: "Heartbeat — all clear", task: "System", time: "6:00am", type: "info", source: { type: "heartbeat" } },
  { id: "a8", action: "Referral program research", description: "Compiled 5 referral models from competing platforms.", task: "Research", time: "5:30am", type: "complete", source: { type: "backlog", itemId: "q1", itemTitle: "Add referral program to Lit" }, model: "Sonnet", cost: 0.15, duration: "3m" },
  { id: "a9", action: "Trade journal schema drafted", task: "Lit.trade", time: "Yesterday", type: "complete", source: { type: "chat", channel: "Telegram", user: "Bill" }, model: "Opus", cost: 0.45, duration: "12m" },
];

const chatMessages: Record<string, Array<{ role: string; content: string; time: string }>> = {
  general: [
    { role: "user", content: "Quick summary of today", time: "8:35am" },
    { role: "assistant", content: "Morning! Here's the rundown:\n\n✅ Morning Brief sent\n✅ Lit Analysis — revenue up 12%\n🔄 Content research — 65% done\n🔄 Competitor analysis — just started\n\n4 items in your queue need attention. Trade journaling MVP is ready to build whenever you say go.", time: "8:35am" },
  ],
  q1: [
    { role: "user", content: "We should add a referral program to Lit", time: "2h ago" },
    { role: "assistant", content: "I looked into how other builders handle referrals:\n\n• Most use builder code sharing\n• Some add tiered rewards — 10% of fees for 30 days\n• dYdX does epoch-based rewards\n\nDo we want user-to-user referrals on top of our builder code?", time: "2h ago" },
    { role: "user", content: "Yeah user to user. Like give someone a link and they get a fee discount", time: "2h ago" },
    { role: "assistant", content: "Doable. We'd need:\n1. Unique referral links per user\n2. Fee discount logic (maybe 5% off for 30 days)\n3. Referrer reward (% of referee's fees)\n\nWant me to draft the full spec or research discount % first?", time: "2h ago" },
  ],
  q2: [
    { role: "user", content: "The trade journal should be our main differentiator", time: "Yesterday" },
    { role: "assistant", content: "Agreed. Core features:\n\n• Auto-import trades from Hyperliquid\n• Tag trades (thesis, mistake, FOMO, etc.)\n• Add notes/annotations after close\n• Performance by tag\n\nTraders who journal improve. Once their history is in Lit, they won't leave. Ready to start the MVP?", time: "Yesterday" },
  ],
  q4: [
    { role: "user", content: "I want to make a video about why AI agents need personality", time: "5h ago" },
    { role: "assistant", content: "Love it. Rough outline:\n\n**Hook:** \"Your AI assistant is boring. Here's why that matters.\"\n\n1. Personality = trust\n2. SOUL.md — giving your agent identity\n3. The uncanny valley of \"helpful but hollow\"\n4. Real example: how Lolo evolved\n\nFull script? What platform — 抖音 or YouTube?", time: "5h ago" },
  ],
};

// ─── Helpers ───
const dotColor = (c: string) => c === "purple" ? "bg-purple-400" : c === "red" ? "bg-red-400" : c === "orange" ? "bg-orange-400" : c === "green" ? "bg-green-400" : c === "blue" ? "bg-blue-400" : "bg-white/40";
const dotColorMuted = (c: string) => c === "purple" ? "bg-purple-400/40" : c === "red" ? "bg-red-400/40" : c === "orange" ? "bg-orange-400/40" : c === "green" ? "bg-green-400/40" : "bg-white/20";

const statusCfg = (s: QueueItem["status"]) => {
  switch (s) {
    case "idea": return { label: "Idea", emoji: "💭", text: "text-white/40", bg: "bg-white/5", border: "border-white/8" };
    case "discussing": return { label: "Discussing", emoji: "💬", text: "text-blue-300", bg: "bg-blue-500/10", border: "border-blue-500/20" };
    case "ready": return { label: "Ready", emoji: "▶", text: "text-green-300", bg: "bg-green-500/10", border: "border-green-500/20" };
    case "running": return { label: "Running", emoji: "🔄", text: "text-orange-300", bg: "bg-orange-500/10", border: "border-orange-500/20" };
  }
};

const captureLabel = (f: QueueItem["capturedFrom"]) => f.type === "chat" ? `via ${f.channel}` : f.type === "manual" ? "added manually" : "agent suggestion";

const srcIcon = (t: string) => t === "cron" ? RefreshCw : t === "chat" ? MessageSquare : t === "backlog" ? FileText : t === "webhook" ? Globe : t === "heartbeat" ? Activity : Terminal;
const srcStyle = (t: string) => t === "cron" ? "bg-orange-500/10 text-orange-300 border-orange-500/20" : t === "chat" ? "bg-blue-500/10 text-blue-300 border-blue-500/20" : t === "backlog" ? "bg-purple-500/10 text-purple-300 border-purple-500/20" : t === "webhook" ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" : "bg-white/5 text-white/40 border-white/10";
const srcLabel = (s: TriggerSource) => s.type === "chat" ? s.channel : s.type === "cron" ? "Cron" : s.type === "backlog" ? "Queue" : s.type === "webhook" ? s.service : s.type === "heartbeat" ? "Heartbeat" : "System";
const actDot = (t: string) => t === "error" ? "bg-red-400" : "bg-white/25";

const SrcBadge = ({ source }: { source: TriggerSource }) => {
  const Icon = srcIcon(source.type);
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md border ${srcStyle(source.type)}`}>
      <Icon className="h-3 w-3" />{srcLabel(source)}
    </span>
  );
};

// ═══════════════════════════════════════════════
export default function MockupV2() {
  const [chatContext, setChatContext] = useState("general");
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  // Projects start collapsed except first one
  const [openProjects, setOpenProjects] = useState<Set<string>>(new Set(["Lit.trade"]));

  // ─── Resizable columns ───
  const MIN_W = 340;
  const MIN_CHAT = 280;
  const [leftW, setLeftW] = useState(380);
  const [midW, setMidW] = useState(380);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"left" | "right" | null>(null);
  const startX = useRef(0);
  const startLeftW = useRef(0);
  const startMidW = useRef(0);

  const onMouseDown = useCallback((which: "left" | "right") => (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = which;
    startX.current = e.clientX;
    startLeftW.current = leftW;
    startMidW.current = midW;
  }, [leftW, midW]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const delta = e.clientX - startX.current;
      const totalW = containerRef.current.offsetWidth;

      if (dragging.current === "left") {
        const newLeft = Math.max(MIN_W, Math.min(startLeftW.current + delta, totalW - startMidW.current - MIN_CHAT - 8));
        setLeftW(newLeft);
      } else {
        const newMid = Math.max(MIN_W, Math.min(startMidW.current + delta, totalW - startLeftW.current - MIN_CHAT - 8));
        setMidW(newMid);
      }
    };
    const onMouseUp = () => { dragging.current = null; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, []);

  const activeQueueItem = projects.flatMap(p => p.items).find(q => q.id === chatContext);
  const currentMessages = chatMessages[chatContext] || chatMessages["general"];
  const totalQueued = projects.reduce((n, p) => n + p.items.length, 0);

  const toggleProject = (name: string) => {
    setOpenProjects(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  return (
    <div className="h-screen flex flex-col">
      {/* ═══ Top Bar ═══ */}
      <div className="flex-shrink-0 border-b border-white/5 bg-white/[0.01] px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-orange-500/10">
              <Sparkles className="h-5 w-5 text-orange-400" />
            </div>
            <span className="text-lg font-bold text-white">ClawHQ</span>
            <span className="text-xs px-2 py-0.5 rounded bg-orange-500/10 text-orange-300/60">v2 mockup</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 text-green-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> 12 done
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-300">
              <Loader2 className="h-3.5 w-3.5" /> 2 running
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300">
              <DollarSign className="h-3.5 w-3.5" /> $2.45
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 text-white/40">
              <Lightbulb className="h-3.5 w-3.5" /> {totalQueued} queued
            </span>
          </div>
        </div>
      </div>

      {/* ═══ 3-Column Layout ═══ */}
      <div ref={containerRef} className="flex-1 flex min-h-0">

        {/* ════ LEFT: Planning Queue ════ */}
        <div style={{ width: leftW, minWidth: MIN_W }} className="flex flex-col bg-white/[0.005] flex-shrink-0">
          {/* Header */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-white/5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-orange-400" />
                Planning Queue
                <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/40 font-normal">{totalQueued}</span>
              </h2>
              <button className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-white transition-colors">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Project groups — collapsible */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {projects.map((project) => {
              const isOpen = openProjects.has(project.name);
              const discussing = project.items.filter(i => i.status === "discussing").length;
              const ready = project.items.filter(i => i.status === "ready").length;
              const running = project.items.filter(i => i.status === "running").length;

              return (
                <div key={project.name}>
                  {/* Project header — always visible */}
                  <button
                    onClick={() => toggleProject(project.name)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all ${
                      isOpen ? "bg-white/[0.03]" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <ChevronRight className={`h-3 w-3 text-white/20 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                    <span className={`h-2.5 w-2.5 rounded-full ${dotColor(project.color)}`} />
                    <span className="text-sm font-semibold text-white/70 flex-1 text-left">{project.name}</span>
                    
                    {/* Status summary chips */}
                    <div className="flex items-center gap-1">
                      {running > 0 && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-300">{running} running</span>
                      )}
                      {ready > 0 && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-300">{ready} ready</span>
                      )}
                      {discussing > 0 && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300">{discussing} 💬</span>
                      )}
                      {!isOpen && (
                        <span className="text-[11px] text-white/20 ml-1">{project.items.length}</span>
                      )}
                    </div>
                  </button>

                  {/* Expanded items */}
                  {isOpen && (
                    <div className="ml-3 mr-1 mt-0.5 mb-2 space-y-px">
                      {project.items.map((item) => {
                        const sc = statusCfg(item.status);
                        const isSelected = expandedItem === item.id;
                        const isChatTarget = chatContext === item.id;

                        return (
                          <div key={item.id}>
                            <button
                              onClick={() => setExpandedItem(isSelected ? null : item.id)}
                              className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                                isChatTarget
                                  ? "bg-orange-500/[0.06]"
                                  : isSelected
                                    ? "bg-white/[0.03]"
                                    : "hover:bg-white/[0.02]"
                              }`}
                            >
                              {/* Title + status */}
                              <div className="flex items-center gap-2">
                                <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                                  item.status === "running" ? "bg-orange-400 animate-pulse" :
                                  item.status === "ready" ? "bg-green-400" :
                                  item.status === "discussing" ? "bg-blue-400" :
                                  dotColorMuted(project.color)
                                }`} />
                                <span className="text-sm text-white/75 flex-1 truncate">{item.title}</span>
                                <span className={`text-[11px] ${sc.text}`}>{sc.emoji}</span>
                              </div>

                              {/* Inline meta — only when NOT expanded */}
                              {!isSelected && (
                                <div className="flex items-center gap-2 mt-1 ml-3.5">
                                  <span className="text-[11px] text-white/20">{item.capturedAt}</span>
                                  {item.messages > 0 && (
                                    <span className="text-[11px] text-white/20 flex items-center gap-0.5">
                                      <MessageSquare className="h-2.5 w-2.5" /> {item.messages}
                                    </span>
                                  )}
                                </div>
                              )}
                            </button>

                            {/* Expanded detail */}
                            {isSelected && (
                              <div
                                onClick={() => setExpandedItem(null)}
                                className="mx-2 mb-1 ml-5 px-3 py-2 rounded-lg bg-white/[0.025] hover:bg-white/[0.04] cursor-pointer transition-all space-y-1.5"
                              >
                                {item.note && (
                                  <p className="text-xs text-white/40 leading-relaxed">{item.note}</p>
                                )}
                                <div className="flex items-center gap-2 text-[11px] text-white/25">
                                  <span className="flex items-center gap-1">
                                    <Hash className="h-2.5 w-2.5" />
                                    {captureLabel(item.capturedFrom)}
                                  </span>
                                  <span>•</span>
                                  <span>{item.capturedAt}</span>
                                  {item.messages > 0 && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center gap-0.5">
                                        <MessageSquare className="h-2.5 w-2.5" /> {item.messages} msgs
                                      </span>
                                    </>
                                  )}
                                </div>
                                {/* Actions */}
                                <div className="flex items-center gap-2 pt-0.5">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setChatContext(item.id); }}
                                    className="text-xs text-blue-300/80 hover:text-blue-300 flex items-center gap-1 transition-colors"
                                  >
                                    <MessageSquare className="h-3 w-3" /> Discuss
                                  </button>
                                  {item.status === "ready" && (
                                    <button
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-xs text-green-300/80 hover:text-green-300 flex items-center gap-1 transition-colors"
                                    >
                                      <Play className="h-3 w-3" /> Start
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-xs text-white/25 hover:text-white/50 flex items-center gap-1 transition-colors"
                                  >
                                    <Calendar className="h-3 w-3" /> Schedule
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick capture */}
          <div className="flex-shrink-0 p-3 border-t border-white/5">
            <div className="relative">
              <input
                type="text"
                placeholder="Capture an idea..."
                className="w-full bg-white/[0.03] border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-orange-500/30 transition-all"
              />
              <Plus className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
            </div>
          </div>
        </div>

        {/* ═══ DRAG HANDLE 1 ═══ */}
        <div
          onMouseDown={onMouseDown("left")}
          className="w-1 bg-white/10 hover:bg-orange-500/30 cursor-col-resize transition-colors flex-shrink-0"
        />

        {/* ════ MIDDLE: Active + Activity ════ */}
        <div style={{ width: midW, minWidth: MIN_W }} className="flex flex-col bg-white/[0.005] flex-shrink-0">
          {/* Active tasks */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-400" />
              Active
              <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-300 font-normal">{activeTasks.length} running</span>
            </h2>
          </div>

          <div className="flex-shrink-0 p-3 space-y-1.5 border-b border-white/5">
            {activeTasks.map((task) => (
              <div key={task.id} className="p-2.5 rounded-lg bg-orange-500/[0.04] border border-orange-500/10">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-white/80">{task.title}</span>
                  <span className="text-[11px] text-white/30">{task.startedAt}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <SrcBadge source={task.source} />
                  <span className="text-[11px] text-white/25">{task.project}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400" style={{ width: `${task.progress}%` }} />
                  </div>
                  <span className="text-[11px] text-white/30">{task.progress}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Activity feed */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-shrink-0 px-4 py-3 border-b border-white/5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-white/50" /> Activity
                </h2>
                <div className="flex items-center gap-1">
                  <button className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-white/40">All</button>
                  <button className="text-[11px] px-2 py-0.5 rounded-full text-white/25 hover:bg-orange-500/10 hover:text-orange-300 transition-all">Cron</button>
                  <button className="text-[11px] px-2 py-0.5 rounded-full text-white/25 hover:bg-blue-500/10 hover:text-blue-300 transition-all">Chat</button>
                  <button className="text-[11px] px-2 py-0.5 rounded-full text-white/25 hover:bg-purple-500/10 hover:text-purple-300 transition-all">Queue</button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
              {recentActivity.map((a) => (
                <div key={a.id}>
                  <button
                    onClick={() => setExpandedActivity(expandedActivity === a.id ? null : a.id)}
                    className={`w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all ${
                      expandedActivity === a.id ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${actDot(a.type)}`} />
                    <span className="text-xs text-white/70 font-medium truncate">{a.action}</span>
                    <span className="text-[10px] text-white/20 flex-shrink-0 ml-auto whitespace-nowrap">
                      {a.time}{a.cost ? ` · $${a.cost.toFixed(2)}` : ""}
                    </span>
                  </button>
                  {expandedActivity === a.id && (
                    <div
                      onClick={() => setExpandedActivity(null)}
                      className="ml-6 mb-1 mx-2 px-2.5 py-2 rounded-lg bg-white/[0.025] hover:bg-white/[0.04] cursor-pointer transition-all space-y-1.5"
                    >
                      {a.description && (
                        <p className="text-[11px] text-white/35 leading-relaxed">{a.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-[10px] text-white/20">
                        <SrcBadge source={a.source} />
                        {a.model && <span>{a.model}</span>}
                        {a.duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {a.duration}</span>}
                        {a.cost !== undefined && a.cost > 0 && <span>${a.cost.toFixed(2)}</span>}
                        {a.tokens && <span>{((a.tokens.in + a.tokens.out) / 1000).toFixed(1)}K tokens</span>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex-shrink-0 p-3 border-t border-white/5">
              <button className="w-full text-xs text-orange-400 hover:text-orange-300 flex items-center justify-center gap-1">
                View all activity <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* ═══ DRAG HANDLE 2 ═══ */}
        <div
          onMouseDown={onMouseDown("right")}
          className="w-1 bg-white/10 hover:bg-orange-500/30 cursor-col-resize transition-colors flex-shrink-0"
        />

        {/* ════ RIGHT: Chat ════ */}
        <div className="flex-1 flex flex-col min-w-0" style={{ minWidth: MIN_CHAT }}>
          <div className="flex-shrink-0 px-4 py-3 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-orange-400" />
                <span className="text-sm font-semibold text-white">Chat</span>
              </div>
              <button onClick={() => setChatContext("general")} className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/8 transition-all text-xs">
                <span className="text-white/60">
                  {activeQueueItem ? `📎 ${activeQueueItem.title.slice(0, 25)}${activeQueueItem.title.length > 25 ? "…" : ""}` : "General"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-white/30" />
              </button>
            </div>
            {activeQueueItem && (
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-[11px] px-1.5 py-0.5 rounded ${statusCfg(activeQueueItem.status).bg} ${statusCfg(activeQueueItem.status).text}`}>
                  {statusCfg(activeQueueItem.status).emoji} {statusCfg(activeQueueItem.status).label}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {activeQueueItem && (
              <div className="mb-2 px-3 py-2 rounded-lg bg-white/[0.02]">
                <p className="text-xs text-white/20 uppercase tracking-wider mb-0.5">Discussing</p>
                <p className="text-base text-white/60 font-medium">{activeQueueItem.title}</p>
              </div>
            )}
            {currentMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] ${
                  msg.role === "user" ? "bg-orange-500/15 rounded-2xl rounded-tr-sm" : "bg-white/[0.03] rounded-2xl rounded-tl-sm"
                } px-3.5 py-2.5`}>
                  <p className="text-sm text-white/85 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  <p className="text-[11px] text-white/20 mt-1">{msg.time}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex-shrink-0 p-3 border-t border-white/5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={activeQueueItem ? `Discuss ${activeQueueItem.title.slice(0, 30)}...` : "Ask anything... ideas auto-captured ✨"}
                className="flex-1 bg-white/[0.03] border border-white/8 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-orange-500/30 focus:ring-1 focus:ring-orange-500/15 transition-all"
              />
              <button className="p-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-all">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
