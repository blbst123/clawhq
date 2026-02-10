"use client";

import { useState, useEffect, useRef } from "react";
import {
  Zap,
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
  Hash,
  Cpu,
  Loader2,
  AlertCircle,
  GitBranch,
  Mail,
  CloudUpload,
} from "lucide-react";
import { useGateway } from "@/lib/gateway-context";
import { useCachedRpc } from "@/lib/use-cached-rpc";

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════

interface RawEvent {
  id: string;
  timestamp: number;
  sessionKey: string;
  sessionLabel?: string;
  kind: "user" | "assistant" | "tool" | "heartbeat";
  text?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  model?: string;
}

interface ActivityItem {
  id: string;
  timestamp: number;
  time: string;
  date: string;
  // What happened (human-readable)
  description: string;
  icon: typeof Bot;
  iconColor: string;
  // Where it came from
  sourceType: "discord" | "telegram" | "cron" | "other";
  channelName: string;
  // Details (for expanded view)
  trigger?: string;
  triggerUser?: string;
  steps: { icon: typeof Bot; description: string }[];
  responsePreviews: string[];
  model?: string;
  stepCount: number;
}

// ═══════════════════════════════════════════════════════
// Tool → Human Description (zero tokens)
// ═══════════════════════════════════════════════════════

function describeToolCall(name: string, args: Record<string, unknown>): string {
  const s = (v: unknown) => typeof v === "string" ? v : "";
  switch (name) {
    case "exec": {
      const cmd = s(args.command);
      if (cmd.includes("git push")) return "Pushed to git";
      if (cmd.includes("git pull")) return "Pulled from git";
      if (cmd.includes("git commit")) return "Committed changes";
      if (cmd.includes("git status")) return "Checked git status";
      if (cmd.includes("gog-run gmail")) return "Checked email";
      if (cmd.includes("gog-run calendar")) return "Checked calendar";
      if (cmd.includes("gog-run drive")) return "Accessed Drive";
      if (cmd.includes("next build")) return "Built Next.js app";
      if (cmd.includes("vercel")) return "Deployed to Vercel";
      if (cmd.includes("npm install") || cmd.includes("npm i")) return "Installed packages";
      if (cmd.includes("grep") || cmd.includes("find ")) return "Searched files";
      if (cmd.includes("curl")) return "Made HTTP request";
      return "Ran shell command";
    }
    case "Read": {
      const fp = s(args.file_path || args.path);
      const f = fp.split("/").pop() || "file";
      if (fp.includes("MEMORY")) return "Read memory";
      if (fp.includes("WORKING")) return "Read working state";
      return `Read ${f}`;
    }
    case "Write": {
      const fp = s(args.file_path || args.path);
      const f = fp.split("/").pop() || "file";
      if (fp.includes("memory/")) return "Updated memory";
      return `Wrote ${f}`;
    }
    case "Edit": { const f = s(args.file_path || args.path).split("/").pop() || "file"; return `Edited ${f}`; }
    case "web_search": return `Searched: "${s(args.query).slice(0, 40)}"`;
    case "web_fetch": return "Fetched web page";
    case "message": {
      const target = s(args.target);
      if (s(args.action) === "send") return `Sent message${target ? ` to ${target}` : ""}`;
      if (s(args.action) === "react") return "Added reaction";
      return `Message: ${s(args.action)}`;
    }
    case "memory_search": return "Searched memory";
    case "memory_get": return "Retrieved memory";
    case "browser": return "Controlled browser";
    case "nodes": return s(args.action) === "run" ? "Ran on remote node" : `Node: ${s(args.action)}`;
    case "sessions_spawn": return "Spawned sub-agent";
    case "sessions_list": return "Listed sessions";
    case "session_status": return "Checked status";
    case "cron": return `Cron: ${s(args.action)}`;
    case "image": return "Analyzed image";
    case "tts": return "Generated speech";
    default: return `Used ${name}`;
  }
}

function getToolIcon(name: string, args: Record<string, unknown>): typeof Bot {
  if (name === "exec") {
    const cmd = typeof args.command === "string" ? args.command : "";
    if (cmd.includes("git")) return GitBranch;
    if (cmd.includes("gog-run gmail")) return Mail;
    if (cmd.includes("gog-run calendar")) return Calendar;
    if (cmd.includes("next build") || cmd.includes("vercel")) return CloudUpload;
    return Terminal;
  }
  return ({ Read: FileText, Write: FileCode, Edit: Code, web_search: Globe, web_fetch: Globe, message: Send, memory_search: Database, memory_get: Database, browser: Eye, cron: RefreshCw, nodes: Cpu, sessions_spawn: Bot }[name] || Wrench) as typeof Bot;
}

// Icon color — mostly grey, only highlight truly notable actions
const IC = "text-white/30"; // default grey

// Summarize a group of tool calls into one activity description
function summarizeTools(tools: { name: string; args: Record<string, unknown> }[]): { description: string; icon: typeof Bot; iconColor: string } {
  if (tools.length === 0) return { description: "Responded to conversation", icon: MessageSquare, iconColor: IC };

  const cmds = tools.filter(t => t.name === "exec").map(t => typeof t.args.command === "string" ? t.args.command : "");
  const names = tools.map(t => t.name);

  // Priority patterns
  if (cmds.some(c => c.includes("git push"))) return { description: cmds.some(c => c.includes("next build")) ? "Built & deployed" : "Pushed to git", icon: GitBranch, iconColor: "text-green-400" };
  if (cmds.some(c => c.includes("next build"))) return { description: "Built app", icon: CloudUpload, iconColor: IC };
  if (cmds.some(c => c.includes("vercel"))) return { description: "Deployed to Vercel", icon: CloudUpload, iconColor: "text-green-400" };
  if (cmds.some(c => c.includes("gog-run gmail"))) return { description: "Checked email", icon: Mail, iconColor: IC };
  if (cmds.some(c => c.includes("gog-run calendar"))) return { description: "Checked calendar", icon: Calendar, iconColor: IC };

  if (names.includes("web_search")) {
    const q = typeof tools.find(t => t.name === "web_search")?.args.query === "string" ? tools.find(t => t.name === "web_search")!.args.query as string : "";
    return { description: `Researched: ${q.slice(0, 40)}`, icon: Globe, iconColor: IC };
  }
  if (names.includes("message")) {
    const msgTool = tools.find(t => t.name === "message");
    const target = typeof msgTool?.args.target === "string" ? msgTool.args.target : "";
    return { description: `Sent message${target ? ` to ${target}` : ""}`, icon: Send, iconColor: IC };
  }
  if (names.includes("sessions_spawn")) return { description: "Spawned background task", icon: Bot, iconColor: IC };
  if (names.includes("browser")) return { description: "Browsed the web", icon: Eye, iconColor: IC };
  if (names.includes("nodes")) return { description: "Ran on remote node", icon: Cpu, iconColor: IC };

  const writes = tools.filter(t => t.name === "Write" || t.name === "Edit");
  if (writes.length > 0) {
    const f = (typeof writes[0].args.file_path === "string" ? writes[0].args.file_path : typeof writes[0].args.path === "string" ? writes[0].args.path : "").split("/").pop() || "files";
    return { description: writes.length > 1 ? `Updated ${writes.length} files` : `Updated ${f}`, icon: FileCode, iconColor: IC };
  }

  const reads = tools.filter(t => t.name === "Read");
  if (reads.length >= 3) return { description: `Read ${reads.length} files`, icon: FileText, iconColor: IC };
  if (names.includes("memory_search") || names.includes("memory_get")) return { description: "Recalled from memory", icon: Database, iconColor: IC };

  return { description: describeToolCall(tools[0].name, tools[0].args), icon: getToolIcon(tools[0].name, tools[0].args), iconColor: IC };
}

// ═══════════════════════════════════════════════════════
// Parse & Group
// ═══════════════════════════════════════════════════════

function safeStr(v: unknown): string { return typeof v === "string" ? v : v == null ? "" : String(v); }

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.filter((b: Record<string, unknown>) => b?.type === "text").map((b: Record<string, unknown>) => safeStr(b.text)).join("\n");
  return "";
}

function extractToolUse(content: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(content)) return [];
  return content.filter((b: Record<string, unknown>) => b && (b.type === "tool_use" || b.type === "toolCall"));
}

function formatTime(ts: number): string { return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase(); }

function formatDate(ts: number): string {
  const d = new Date(ts); const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (day.getTime() === today.getTime()) return "Today";
  if (day.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function parseChannel(label?: string): string {
  if (!label) return "";
  const m = label.match(/#([\w-]+)$/);
  if (m) return `#${m[1]}`;
  if (label.includes("telegram")) return "Telegram";
  return "";
}

function getSourceType(label?: string): "discord" | "telegram" | "cron" | "other" {
  const l = (label || "").toLowerCase();
  if (l.includes("discord")) return "discord";
  if (l.includes("telegram")) return "telegram";
  if (l.includes("cron")) return "cron";
  return "other";
}

function parseAndGroup(sessionKey: string, sessionLabel: string, rawMessages: unknown): ActivityItem[] {
  if (!rawMessages) return [];
  const messages: unknown[] = Array.isArray(rawMessages) ? rawMessages :
    (rawMessages as Record<string, unknown>)?.messages != null && Array.isArray((rawMessages as Record<string, unknown>).messages)
      ? (rawMessages as Record<string, unknown>).messages as unknown[] : [];

  // First pass: extract raw events
  const raw: RawEvent[] = [];
  for (let i = 0; i < messages.length; i++) {
    try {
      const msg = messages[i] as Record<string, unknown>;
      if (!msg || typeof msg !== "object") continue;
      const role = safeStr(msg.role);
      const rawTs = msg.timestamp ?? msg.ts ?? msg.createdAt;
      const ts = typeof rawTs === "number" ? rawTs : typeof rawTs === "string" ? new Date(rawTs).getTime() : Date.now();
      const tsMs = ts < 1e12 ? ts * 1000 : ts;
      const content = msg.content;

      if (role === "user") {
        const text = extractText(content);
        const isHb = text.includes("HEARTBEAT") || text.includes("heartbeat");
        raw.push({ id: `${sessionKey}-${i}`, timestamp: tsMs, sessionKey, sessionLabel, kind: isHb ? "heartbeat" : "user", text, model: safeStr(msg.model) });
      } else if (role === "assistant") {
        const contentArr = Array.isArray(content) ? content as Record<string, unknown>[] : [];
        const textBlocks = contentArr.filter(b => b?.type === "text").map(b => safeStr(b.text).trim()).filter(Boolean);
        const toolBlocks = extractToolUse(content);
        // Interleave tool calls and text blocks in order
        let seq = 0;
        if (contentArr.length > 0) {
          for (const block of contentArr) {
            if (block?.type === "tool_use" || block?.type === "toolCall") {
              const toolArgs = (block as Record<string, unknown>).input ?? (block as Record<string, unknown>).arguments;
              raw.push({ id: `${sessionKey}-${i}-t${seq}`, timestamp: tsMs + seq, sessionKey, sessionLabel, kind: "tool", toolName: safeStr(block.name), toolArgs: (typeof toolArgs === "object" && toolArgs != null) ? toolArgs as Record<string, unknown> : undefined, model: safeStr(msg.model) });
              seq++;
            } else if (block?.type === "text") {
              const t = safeStr(block.text).trim();
              if (t && t !== "HEARTBEAT_OK" && t !== "NO_REPLY") {
                raw.push({ id: `${sessionKey}-${i}-a${seq}`, timestamp: tsMs + seq, sessionKey, sessionLabel, kind: "assistant", text: t, model: safeStr(msg.model) });
                seq++;
              } else if (t === "HEARTBEAT_OK" || t === "NO_REPLY") {
                raw.push({ id: `${sessionKey}-${i}-hb`, timestamp: tsMs, sessionKey, sessionLabel, kind: "heartbeat", text: t });
                seq++;
              }
            }
          }
        } else {
          // Simple string content
          const text = extractText(content).trim();
          if (text && text !== "HEARTBEAT_OK" && text !== "NO_REPLY") {
            raw.push({ id: `${sessionKey}-${i}-a`, timestamp: tsMs, sessionKey, sessionLabel, kind: "assistant", text, model: safeStr(msg.model) });
          } else if (text === "HEARTBEAT_OK" || text === "NO_REPLY") {
            raw.push({ id: `${sessionKey}-${i}-hb`, timestamp: tsMs, sessionKey, sessionLabel, kind: "heartbeat", text });
          }
        }
      }
    } catch { continue; }
  }

  // Second pass: group into activity items
  // A group starts with a user message (or standalone assistant turn) and includes all
  // subsequent tool calls and assistant messages until the next user message
  const items: ActivityItem[] = [];
  let groupStart = 0;

  function flushGroup(start: number, end: number) {
    const group = raw.slice(start, end);
    if (group.length === 0) return;

    const userMsg = group.find(e => e.kind === "user");
    const hbMsg = group.find(e => e.kind === "heartbeat");
    const tools = group.filter(e => e.kind === "tool");
    const assistantMsgs = group.filter(e => e.kind === "assistant" && e.text);
    const first = group[0];

    // Skip pure heartbeat groups
    const isHeartbeat = !!hbMsg && tools.length === 0;

    const toolData = tools.map(t => ({ name: t.toolName || "unknown", args: t.toolArgs || {} }));
    const { description, icon, iconColor } = isHeartbeat
      ? { description: "Heartbeat check", icon: Activity, iconColor: "text-white/15" }
      : tools.length > 0
        ? summarizeTools(toolData)
        : { description: "Responded to conversation", icon: MessageSquare, iconColor: IC };

    const steps = tools.map(t => ({
      icon: getToolIcon(t.toolName || "", t.toolArgs || {}),
      description: describeToolCall(t.toolName || "unknown", t.toolArgs || {}),
    }));

    items.push({
      id: first.id,
      timestamp: first.timestamp,
      time: formatTime(first.timestamp),
      date: formatDate(first.timestamp),
      description,
      icon,
      iconColor,
      sourceType: getSourceType(first.sessionLabel),
      channelName: parseChannel(first.sessionLabel),
      trigger: userMsg?.text?.slice(0, 120),
      triggerUser: undefined, // TODO: extract from session
      steps,
      responsePreviews: assistantMsgs.map(a => a.text!.slice(0, 300)),
      model: assistantMsgs.at(-1)?.model || tools[0]?.model,
      stepCount: tools.length,
    });
  }

  for (let i = 0; i < raw.length; i++) {
    if (raw[i].kind === "user" || raw[i].kind === "heartbeat") {
      if (i > groupStart) flushGroup(groupStart, i);
      groupStart = i;
    }
  }
  flushGroup(groupStart, raw.length);

  return items;
}

// ═══════════════════════════════════════════════════════
// Source Icon
// ═══════════════════════════════════════════════════════

function SourceIcon({ type, className }: { type: string; className?: string }) {
  if (type === "discord") return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" /></svg>;
  if (type === "telegram") return <Send className={className} />;
  if (type === "cron") return <RefreshCw className={className} />;
  return <Bot className={className} />;
}

const srcColor: Record<string, string> = { discord: "text-indigo-400", telegram: "text-sky-400", cron: "text-orange-400", other: "text-white/25" };

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
    // Fetch max history from all sessions — get everything available
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
    // Sort purely chronologically — newest first
    all.sort((a, b) => b.timestamp - a.timestamp);
    return all;
  };

  const { data: items, loading, error, refresh, stale } = useCachedRpc<ActivityItem[]>("activity", fetchActivity, 60_000);

  // Re-fetch when gateway connects (handles race where hook fires before WS is ready)
  const hasTriggeredFetch = useRef(false);
  useEffect(() => {
    if (gwStatus === "connected" && !hasTriggeredFetch.current) {
      hasTriggeredFetch.current = true;
      // Only refresh if we have no data or had an error
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
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-white/30">
            {gwStatus === "error" ? "Reconnecting…" : "Connecting…"}
          </p>
        </div>
      </div>
    );
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

        {/* Load more — instant, client-side pagination */}
        {!(loading && !items) && !error && hasMore && (
          <div className="flex justify-center py-6">
            <button
              onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60 transition-all border border-white/5"
            >
              <ChevronDown className="h-4 w-4" />
              Show more ({filtered.length - visibleCount} remaining)
            </button>
          </div>
        )}

        {!(loading && !items) && !error && allItems.length > 0 && !hasMore && (
          <div className="flex justify-center py-6">
            <span className="text-[12px] text-white/15">All {total} activities shown</span>
          </div>
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

// ═══════════════════════════════════════════════════════
// Activity Row — compact, matches cron page style
// ═══════════════════════════════════════════════════════

function ActivityRow({ item, expanded, onToggle }: { item: ActivityItem; expanded: boolean; onToggle: () => void }) {
  const Icon = item.icon;
  const isHeartbeat = item.icon === Activity;

  return (
    <div className={isHeartbeat ? "opacity-30 hover:opacity-60 transition-opacity" : ""}>
      <button
        onClick={onToggle}
        className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition-all ${expanded ? "bg-white/[0.04]" : "hover:bg-white/[0.03]"}`}
      >
        {/* Time */}
        <span className="w-20 text-[13px] text-orange-300/70 flex-shrink-0 tabular-nums">{item.time}</span>

        {/* Activity icon + description */}
        <Icon className={`h-4 w-4 flex-shrink-0 ${item.sourceType === "cron" ? "text-orange-400" : item.iconColor}`} />
        <span className="text-[14px] text-white/80 font-medium truncate flex-1">{item.description}</span>

        {/* Step count badge */}
        {item.stepCount > 0 && (
          <span className="text-[11px] text-white/20 flex-shrink-0 tabular-nums">{item.stepCount} steps</span>
        )}

        {/* Source badge */}
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
          {/* Trigger message */}
          {item.trigger && (
            <div className="text-[13px] text-white/40 leading-relaxed">
              {item.triggerUser && <span className="text-blue-300/50 font-medium">{item.triggerUser}: </span>}
              {item.trigger}
            </div>
          )}

          {/* Steps */}
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

          {/* Responses */}
          {item.responsePreviews.length > 0 && (
            <div className="space-y-2">
              {item.responsePreviews.map((text, i) => (
                <div key={i} className="text-[13px] text-white/35 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto rounded-lg bg-white/[0.02] px-3 py-2">
                  {text}
                </div>
              ))}
            </div>
          )}

          {/* Model */}
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
