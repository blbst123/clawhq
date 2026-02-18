"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Inbox,
  CheckCircle2,
  Zap,
  Loader2,
  ChevronDown,
  ChevronRight,
  Plus,
  Play,
  Pause,
  Check,
  X,
  Search,
  Activity,
  Calendar,
  RefreshCw,
  Sparkles,
  MessageSquare,
  Terminal,
  Globe,
  FileText,
  FileCode,
  Code,
  Send,
  Database,
  Eye,
  Bot,
  Cpu,
  Wrench,
  GitBranch,
  Mail,
  CloudUpload,
  Pencil,
  Trash2,
  Hash,
  // FolderPlus moved to CreateMenu component
  MoreHorizontal,
} from "lucide-react";
import { useGateway } from "@/lib/gateway-context";
import { cn } from "@/lib/utils";
import { TaskChat } from "@/components/task-chat";
import { PriorityIcon, priOptions, projLabel } from "@/components/ui/priority-icon";
import { StatusIcon } from "@/components/ui/status-icon";
import { useSettings } from "@/lib/use-settings";
import { useProjects } from "@/lib/use-projects";
import { useTasks } from "@/lib/use-tasks";
import { timeAgo, formatTime, formatDate, priSort, generateSessionKey } from "@/lib/task-utils";
import type { Task } from "@/lib/types";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";

// ─── Types ───

// Task type imported from @/lib/types

interface ActivityItem {
  id: string;
  timestamp: number;
  time: string;
  date: string;
  description: string;
  icon: typeof Bot;
  iconColor: string;
  sourceType: "discord" | "telegram" | "cron" | "other";
  channelName: string;
  trigger?: string;
  steps: { icon: typeof Bot; description: string }[];
  responsePreviews: string[];
  model?: string;
  stepCount: number;
}

// ─── Helpers ───

// timeAgo, formatTime, priSort imported from @/lib/task-utils

// ─── Status Icon (same as planning page) ───

// StatusIcon imported from @/components/ui/status-icon

// ─── Activity parsing (reused from activity page) ───

function safeStr(v: unknown): string { return typeof v === "string" ? v : v == null ? "" : String(v); }

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.filter((b: Record<string, unknown>) => b?.type === "text").map((b: Record<string, unknown>) => safeStr(b.text)).join("\n");
  return "";
}

function describeToolCall(name: string, args: Record<string, unknown>): string {
  const s = (v: unknown) => typeof v === "string" ? v : "";
  switch (name) {
    case "exec": {
      const cmd = s(args.command);
      if (cmd.includes("git push")) return "Pushed to git";
      if (cmd.includes("git pull")) return "Pulled from git";
      if (cmd.includes("git commit")) return "Committed changes";
      if (cmd.includes("gog-run gmail")) return "Checked email";
      if (cmd.includes("gog-run calendar")) return "Checked calendar";
      if (cmd.includes("next build")) return "Built Next.js app";
      if (cmd.includes("vercel")) return "Deployed to Vercel";
      return "Ran shell command";
    }
    case "Read": { const f = s(args.file_path || args.path).split("/").pop() || "file"; return f.includes("MEMORY") ? "Read memory" : `Read ${f}`; }
    case "Write": { const f = s(args.file_path || args.path).split("/").pop() || "file"; return f.includes("memory/") ? "Updated memory" : `Wrote ${f}`; }
    case "Edit": { return `Edited ${s(args.file_path || args.path).split("/").pop() || "file"}`; }
    case "web_search": return `Searched: "${s(args.query).slice(0, 40)}"`;
    case "web_fetch": return "Fetched web page";
    case "message": return s(args.action) === "send" ? `Sent message${s(args.target) ? ` to ${s(args.target)}` : ""}` : `Message: ${s(args.action)}`;
    case "memory_search": return "Searched memory";
    case "memory_get": return "Retrieved memory";
    case "browser": return "Controlled browser";
    case "sessions_spawn": return "Spawned sub-agent";
    case "cron": return `Cron: ${s(args.action)}`;
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

const IC = "text-white/30";

function summarizeTools(tools: { name: string; args: Record<string, unknown> }[]): { description: string; icon: typeof Bot; iconColor: string } {
  if (tools.length === 0) return { description: "Responded to conversation", icon: MessageSquare, iconColor: IC };
  const cmds = tools.filter(t => t.name === "exec").map(t => typeof t.args.command === "string" ? t.args.command : "");
  const names = tools.map(t => t.name);
  if (cmds.some(c => c.includes("git push"))) return { description: cmds.some(c => c.includes("next build")) ? "Built & deployed" : "Pushed to git", icon: GitBranch, iconColor: "text-green-400" };
  if (cmds.some(c => c.includes("next build"))) return { description: "Built app", icon: CloudUpload, iconColor: IC };
  if (cmds.some(c => c.includes("vercel"))) return { description: "Deployed to Vercel", icon: CloudUpload, iconColor: "text-green-400" };
  if (cmds.some(c => c.includes("gog-run gmail"))) return { description: "Checked email", icon: Mail, iconColor: IC };
  if (cmds.some(c => c.includes("gog-run calendar"))) return { description: "Checked calendar", icon: Calendar, iconColor: IC };
  if (names.includes("web_search")) { const q = typeof tools.find(t => t.name === "web_search")?.args.query === "string" ? tools.find(t => t.name === "web_search")!.args.query as string : ""; return { description: `Researched: ${q.slice(0, 40)}`, icon: Globe, iconColor: IC }; }
  if (names.includes("message")) { const t = tools.find(t => t.name === "message"); return { description: `Sent message${typeof t?.args.target === "string" ? ` to ${t.args.target}` : ""}`, icon: Send, iconColor: IC }; }
  if (names.includes("sessions_spawn")) return { description: "Spawned background task", icon: Bot, iconColor: IC };
  if (names.includes("browser")) return { description: "Browsed the web", icon: Eye, iconColor: IC };
  const writes = tools.filter(t => t.name === "Write" || t.name === "Edit");
  if (writes.length > 0) { const f = (typeof writes[0].args.file_path === "string" ? writes[0].args.file_path : typeof writes[0].args.path === "string" ? writes[0].args.path : "").split("/").pop() || "files"; return { description: writes.length > 1 ? `Updated ${writes.length} files` : `Updated ${f}`, icon: FileCode, iconColor: IC }; }
  return { description: describeToolCall(tools[0].name, tools[0].args), icon: getToolIcon(tools[0].name, tools[0].args), iconColor: IC };
}

function extractToolUse(content: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(content)) return [];
  return content.filter((b: Record<string, unknown>) => b && (b.type === "tool_use" || b.type === "toolCall"));
}

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

function parseAndGroup(sessionKey: string, sessionLabel: string, rawMessages: unknown): ActivityItem[] {
  if (!rawMessages) return [];
  const messages: unknown[] = Array.isArray(rawMessages) ? rawMessages :
    (rawMessages as Record<string, unknown>)?.messages != null && Array.isArray((rawMessages as Record<string, unknown>).messages)
      ? (rawMessages as Record<string, unknown>).messages as unknown[] : [];

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
        raw.push({ id: `${sessionKey}-${i}`, timestamp: tsMs, sessionKey, sessionLabel, kind: isHb ? "heartbeat" : "user", text });
      } else if (role === "assistant") {
        const contentArr = Array.isArray(content) ? content as Record<string, unknown>[] : [];
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
              }
            }
          }
        } else {
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
    const isHeartbeat = !!hbMsg && tools.length === 0;
    const toolData = tools.map(t => ({ name: t.toolName || "unknown", args: t.toolArgs || {} }));
    const { description, icon, iconColor } = isHeartbeat
      ? { description: "Heartbeat check", icon: Activity, iconColor: "text-white/15" }
      : tools.length > 0 ? summarizeTools(toolData) : { description: "Responded to conversation", icon: MessageSquare, iconColor: IC };
    const steps = tools.map(t => ({ icon: getToolIcon(t.toolName || "", t.toolArgs || {}), description: describeToolCall(t.toolName || "unknown", t.toolArgs || {}) }));
    items.push({
      id: first.id, timestamp: first.timestamp, time: formatTime(first.timestamp), date: formatDate(first.timestamp),
      description, icon, iconColor, sourceType: getSourceType(first.sessionLabel), channelName: parseChannel(first.sessionLabel),
      trigger: userMsg?.text?.slice(0, 120), steps, responsePreviews: assistantMsgs.map(a => a.text!.slice(0, 300)),
      model: assistantMsgs.at(-1)?.model || tools[0]?.model, stepCount: tools.length,
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

// formatDate imported from @/lib/task-utils

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

function SourceIcon({ type, className }: { type: string; className?: string }) {
  if (type === "discord") return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" /></svg>;
  if (type === "telegram") return <Send className={className} />;
  if (type === "cron") return <RefreshCw className={className} />;
  return <Bot className={className} />;
}

const srcColor: Record<string, string> = { discord: "text-indigo-400", telegram: "text-sky-400", cron: "text-orange-400", other: "text-white/25" };

// ─── Tasks cache ───

// Tasks cache moved to useTasks hook

// ─── Activity cache ───

let activityCache: { data: ActivityItem[]; ts: number } | null = null;
const ACTIVITY_CACHE_TTL = 60_000;

// ─── Create Menu (+ button dropdown) ───

// CreateMenu is imported from @/components/ui/create-menu

// ═══════════════════════════════════════════════════════
// Dashboard Page
// ═══════════════════════════════════════════════════════

export default function Dashboard() {
  const { rpc, status: connStatus } = useGateway();
  const { settings, saveSettings, getProjectColor } = useSettings();
  const { name: agentName } = useAgentIdentity();

  // ─── Tasks (shared hook) ───
  const { tasks, loading: capturesLoading, saving, saveTasks, updateTask, deleteTask, addTask: addTaskToStore } = useTasks();

  // ─── Activity state ───
  const [activityItems, setActivityItems] = useState<ActivityItem[]>(activityCache?.data ?? []);
  const [activityLoading, setActivityLoading] = useState(!activityCache);

  // ─── UI state ───
  const [activeChatTaskId, setActiveChatTaskId] = useState<string | null>(null);
  const [pendingKickoff, setPendingKickoff] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const saved = localStorage.getItem("clawhq-collapsed-projects");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [searchQuery, setSearchQuery] = useState("");

  // ─── Resizable columns ───
  const MIN_W = 320;
  const MIN_CHAT = 320;
  const [leftW, setLeftW] = useState(() => {
    if (typeof window !== "undefined") { const v = localStorage.getItem("clawhq-dash-leftW"); if (v) return Number(v); }
    return 340;
  });
  const [midW, setMidW] = useState(() => {
    if (typeof window !== "undefined") { const v = localStorage.getItem("clawhq-dash-midW"); if (v) return Number(v); }
    return 380;
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"left" | "right" | null>(null);
  const startX = useRef(0);
  const startLeftW = useRef(0);
  const startMidW = useRef(0);
  const leftWRef = useRef(leftW);
  const midWRef = useRef(midW);
  useEffect(() => { leftWRef.current = leftW; }, [leftW]);
  useEffect(() => { midWRef.current = midW; }, [midW]);

  const onMouseDownLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = "left";
    startX.current = e.clientX;
    startLeftW.current = leftW;
  }, [leftW]);

  const onMouseDownRight = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = "right";
    startX.current = e.clientX;
    startMidW.current = midW;
  }, [midW]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const delta = e.clientX - startX.current;
      const totalW = containerRef.current.offsetWidth;
      if (dragging.current === "left") {
        const newLeft = Math.max(MIN_W, Math.min(startLeftW.current + delta, totalW - MIN_W - MIN_CHAT - 8));
        setLeftW(newLeft);
      } else {
        const newMid = Math.max(MIN_W, Math.min(startMidW.current + delta, totalW - leftW - MIN_CHAT - 8));
        setMidW(newMid);
      }
    };
    const onMouseUp = () => {
      if (dragging.current === "left") localStorage.setItem("clawhq-dash-leftW", String(leftWRef.current));
      if (dragging.current === "right") localStorage.setItem("clawhq-dash-midW", String(midWRef.current));
      dragging.current = null;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, [leftW, midW]);

  // Task management via shared hook (loadTasks, saveTasks, updateTask, deleteTask from useTasks)

  async function startTask(id: string) {
    const task = tasks.find(c => c.id === id);
    if (!task) return;
    const sessionKey = task.sessionKey || generateSessionKey(id);
    await updateTask(id, { status: "in_progress", sessionKey });
    setActiveChatTaskId(id);
    setExpandedId(null);
  }

  async function openTaskChat(id: string) {
    const task = tasks.find(c => c.id === id);
    if (task && !task.sessionKey) {
      const sessionKey = `task-${id.replace("cap_", "")}`;
      await updateTask(id, { sessionKey });
    }
    setActiveChatTaskId(id);
  }

  // ─── Load activity ───
  useEffect(() => {
    if (activityCache && Date.now() - activityCache.ts < ACTIVITY_CACHE_TTL) {
      setActivityItems(activityCache.data);
      setActivityLoading(false);
      return;
    }
    loadActivity();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connStatus]);

  async function loadActivity() {
    if (connStatus !== "connected") return;
    setActivityLoading(!activityCache);
    try {
      const rawSessions = await rpc.listSessions();
      let sessionsList: Array<Record<string, unknown>> = [];
      if (Array.isArray(rawSessions)) sessionsList = rawSessions;
      else if (rawSessions && typeof rawSessions === "object") {
        const obj = rawSessions as Record<string, unknown>;
        if (Array.isArray(obj.sessions)) sessionsList = obj.sessions as Array<Record<string, unknown>>;
      }
      const promises = sessionsList.slice(0, 10).map(async (session) => {
        try {
          const key = safeStr(session.key || session.sessionKey || session.id);
          if (!key) return [];
          const label = safeStr(session.displayName || session.label || key);
          const history = await rpc.getChatHistory(key, { limit: 200 });
          return parseAndGroup(key, label, history);
        } catch { return []; }
      });
      const results = await Promise.all(promises);
      const all: ActivityItem[] = [];
      for (const r of results) all.push(...r);
      all.sort((a, b) => b.timestamp - a.timestamp);
      activityCache = { data: all, ts: Date.now() };
      setActivityItems(all);
    } catch { /* */ }
    setActivityLoading(false);
  }

  // ─── Derived data ───
  const inboxItems = useMemo(() => {
    let items = tasks.filter(c => c.status === "inbox" || c.status === "todo");
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(c => c.summary.toLowerCase().includes(q) || (c.note || "").toLowerCase().includes(q) || (c.project || "").toLowerCase().includes(q));
    }
    return items;
  }, [tasks, searchQuery]);

  const activeItems = useMemo(() => tasks.filter(c => c.status === "in_progress"), [tasks]);

  // ─── Fetch session metadata for active tasks ───
  interface TaskSessionMeta {
    lastMessage: string;
    lastRole: "user" | "assistant";
    lastAt: number;
    messageCount: number;
    toolNames: Set<string>;
  }
  const [taskMetas, setTaskMetas] = useState<Record<string, TaskSessionMeta>>({});

  useEffect(() => {
    if (connStatus !== "connected" || activeItems.length === 0) return;
    const keysToFetch = activeItems.filter(t => t.sessionKey).map(t => ({ id: t.id, key: t.sessionKey! }));
    if (keysToFetch.length === 0) return;

    Promise.all(keysToFetch.map(async ({ id, key }) => {
      try {
        const result = await rpc.getChatHistory(key, { limit: 50 });
        const data = result as { messages?: Array<Record<string, unknown>> };
        if (!data?.messages?.length) return null;
        const msgs = data.messages;
        let lastMessage = "";
        let lastRole: "user" | "assistant" = "user";
        let lastAt = 0;
        let msgCount = 0;
        const toolSet = new Set<string>();

        for (const msg of msgs) {
          const role = safeStr(msg.role);
          if (role !== "user" && role !== "assistant") continue;
          const rawTs = msg.timestamp ?? msg.ts ?? msg.createdAt;
          const ts = typeof rawTs === "number" ? (rawTs < 1e12 ? rawTs * 1000 : rawTs) : typeof rawTs === "string" ? new Date(rawTs).getTime() : 0;

          if (role === "user") {
            const text = extractText(msg.content);
            if (text && !text.includes("HEARTBEAT")) {
              msgCount++;
              if (ts >= lastAt) { lastMessage = text; lastRole = "user"; lastAt = ts; }
            }
          } else if (role === "assistant") {
            const content = msg.content;
            if (Array.isArray(content)) {
              for (const block of content as Record<string, unknown>[]) {
                if (block?.type === "tool_use" || block?.type === "toolCall") {
                  toolSet.add(safeStr(block.name));
                }
                if (block?.type === "text") {
                  const t = safeStr(block.text).trim();
                  if (t && t !== "HEARTBEAT_OK" && t !== "NO_REPLY") {
                    msgCount++;
                    if (ts >= lastAt) { lastMessage = t; lastRole = "assistant"; lastAt = ts; }
                  }
                }
              }
            } else {
              const text = extractText(content);
              if (text && text !== "HEARTBEAT_OK" && text !== "NO_REPLY") {
                msgCount++;
                if (ts >= lastAt) { lastMessage = text; lastRole = "assistant"; lastAt = ts; }
              }
            }
          }
        }
        if (!lastMessage) return null;
        return { id, meta: { lastMessage, lastRole, lastAt, messageCount: msgCount, toolNames: toolSet } as TaskSessionMeta };
      } catch { return null; }
    })).then(results => {
      const map: Record<string, TaskSessionMeta> = {};
      for (const r of results) { if (r) map[r.id] = r.meta; }
      setTaskMetas(map);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItems.length, connStatus]);

  const inboxGrouped = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    // Include all known projects (even empty ones)
    groups["general"] = [];
    for (const key of Object.keys(settings.projects)) {
      groups[key] = [];
    }
    for (const c of inboxItems) {
      const proj = c.project || "general";
      if (!groups[proj]) groups[proj] = [];
      groups[proj].push(c);
    }
    for (const items of Object.values(groups)) items.sort(priSort);
    return Object.entries(groups).sort((a, b) => {
      if (a[0] === "general") return -1;
      if (b[0] === "general") return 1;
      return a[0].localeCompare(b[0]);
    });
  }, [inboxItems, settings.projects]);

  const allProjects = useMemo(() => {
    const set = new Set(tasks.map(c => c.project || "general"));
    set.add("general");
    Object.keys(settings.projects).forEach(k => set.add(k));
    return Array.from(set).sort();
  }, [tasks, settings.projects]);

  const recentActivity = useMemo(() =>
    activityItems.filter(i => i.icon !== Activity).slice(0, 30),
  [activityItems]);

  const counts = useMemo(() => ({
    inbox: tasks.filter(c => c.status === "inbox" || c.status === "todo").length,
    active: tasks.filter(c => c.status === "in_progress").length,
    done: tasks.filter(c => c.status === "done").length,
  }), [tasks]);

  // ─── Add Task modal state ───
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSummary, setNewSummary] = useState("");
  const [newProject, setNewProject] = useState("general");
  const [newPriority, setNewPriority] = useState<string | undefined>(undefined);
  const [newNote, setNewNote] = useState("");

  // ─── New Project modal state ───
  const [showNewProject, setShowNewProject] = useState(false);
  const {
    projectMenuOpen, setProjectMenuOpen,
    confirmDeleteProject, setConfirmDeleteProject,
    editingProject, setEditingProject,
    createProject, deleteProject, saveProjectEdit,
  } = useProjects(tasks, saveTasks);
  // newProjectName/Color state moved into NewProjectModal
  const { menu: ctxMenu, handleContextMenu, close: closeCtxMenu } = useTaskContextMenu();
  // getProjectColor comes from useSettings hook

  async function addTask() {
    if (!newSummary.trim()) return;
    await addTaskToStore({
      id: `cap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      at: new Date().toISOString(),
      type: "manual",
      summary: newSummary.trim(),
      project: newProject === "general" ? undefined : newProject,
      status: "inbox",
      priority: newPriority as Task["priority"],
      note: newNote.trim() || undefined,
    });
    setNewSummary(""); setNewProject("general"); setNewPriority(undefined); setNewNote("");
    setShowAddForm(false);
  }

  function toggleProject(proj: string) {
    setCollapsedProjects(prev => {
      const next = new Set(prev);
      if (next.has(proj)) next.delete(proj); else next.add(proj);
      localStorage.setItem("clawhq-collapsed-projects", JSON.stringify([...next]));
      return next;
    });
  }

  // ─── Loading state ───
  if (connStatus !== "connected") {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-white/30">{connStatus === "error" ? "Reconnecting…" : "Connecting…"}</p>
        </div>
      </div>
    );
  }

  const chatTask = activeChatTaskId ? tasks.find(c => c.id === activeChatTaskId) : null;

  return (
    <div className="h-screen flex flex-col">
      {/* ═══ Top Stats Bar ═══ */}
      <div className="flex-shrink-0 border-b border-white/5 bg-white/[0.01] px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-orange-500/10">
              <Sparkles className="h-5 w-5 text-orange-400" />
            </div>
            <span className="text-lg font-bold text-white">Dashboard</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {saving && (
              <span className="flex items-center gap-1.5 text-[11px] text-white/30">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </span>
            )}
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 text-white/40">
              <Inbox className="h-3.5 w-3.5" /> {counts.inbox} inbox
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-300">
              <Zap className="h-3.5 w-3.5" /> {counts.active} active
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 text-green-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> {counts.done} done
            </span>
          </div>
        </div>
      </div>

      {/* ═══ 3-Column Layout ═══ */}
      <div ref={containerRef} className="flex-1 flex min-h-0">

        {/* ════ LEFT: Planning Queue (Inbox) ════ */}
        <div style={{ width: leftW, minWidth: MIN_W }} className="flex flex-col flex-shrink-0">
          {/* Header */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-white/5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Inbox className="h-4 w-4 text-orange-400" />
                Inbox
                {counts.inbox > 0 && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-normal">{counts.inbox}</span>
                )}
              </h2>
              <CreateMenu
                onNewTask={() => setShowAddForm(true)}
                onNewProject={() => setShowNewProject(true)}
              />
            </div>
            {/* Search */}
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search…"
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-8 pr-7 py-1.5 text-[12px] text-white placeholder-white/20 focus:border-orange-500/30 focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Task list */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
            {capturesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 text-orange-400 animate-spin" />
              </div>
            ) : inboxItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Inbox className="h-8 w-8 text-white/10 mb-3" />
                <p className="text-[13px] text-white/30">Inbox empty</p>
                <p className="text-[11px] text-white/15 mt-1">Tasks appear as your agent tasks them</p>
              </div>
            ) : (
              inboxGrouped.map(([proj, items], gi) => (
                <div key={proj} className={gi > 0 ? "mt-4" : ""}>
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => toggleProject(proj)} className="flex items-center gap-2 group">
                      {collapsedProjects.has(proj) ? <ChevronRight className="h-3.5 w-3.5 text-white/25" /> : <ChevronDown className="h-3.5 w-3.5 text-white/25" />}
                      <div className={cn("h-2.5 w-2.5 rounded-full", getProjectColor(proj))} />
                      <span className="text-[14px] leading-none font-semibold text-white/70 group-hover:text-white/90 transition-colors">{projLabel(proj)}</span>
                      <span className="text-[14px] leading-none text-white/25 ml-1 font-normal">{items.length}</span>
                    </button>
                    <div className="flex-1" />
                    {proj !== "general" && (
                      <div className="relative">
                        <button onClick={() => setProjectMenuOpen(projectMenuOpen === proj ? null : proj)}
                          className="p-1 rounded-md text-white/20 hover:text-white/50 hover:bg-white/5 transition-all">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                        {projectMenuOpen === proj && (<>
                          <div className="fixed inset-0 z-40" onClick={() => setProjectMenuOpen(null)} />
                          <div className="absolute right-0 top-7 z-50 bg-[#1a1614] border border-white/10 rounded-lg shadow-xl py-1 min-w-[130px]">
                            <button onClick={() => { setEditingProject({ key: proj, name: projLabel(proj), color: getProjectColor(proj) }); setProjectMenuOpen(null); }}
                              className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors">
                              <Pencil className="h-3 w-3" /> Edit
                            </button>
                            <button onClick={() => { setConfirmDeleteProject(proj); setProjectMenuOpen(null); }}
                              className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                              <Trash2 className="h-3 w-3" /> Delete
                            </button>
                          </div>
                        </>)}
                      </div>
                    )}
                  </div>
                  {!collapsedProjects.has(proj) && (
                    <div className="ml-2 space-y-1">
                      {items.map(task => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          compact
                          expanded={expandedId === task.id}
                          onToggle={() => setExpandedId(expandedId === task.id ? null : task.id)}
                          onStart={() => startTask(task.id)}
                          onStatusChange={(status) => updateTask(task.id, { status })}
                          onUpdate={(patch) => updateTask(task.id, patch)}
                          onEdit={() => setEditingTask(task)}
                          onDelete={() => deleteTask(task.id)}
                          onContextMenu={handleContextMenu}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ═══ DRAG HANDLE ═══ */}
        <div onMouseDown={onMouseDownLeft} className="w-1 bg-white/[0.06] hover:bg-orange-500/30 cursor-col-resize transition-colors flex-shrink-0" />

        {/* ════ MIDDLE: Active + Activity ════ */}
        <div className="flex flex-col min-w-0 flex-shrink-0" style={{ width: midW, minWidth: MIN_W }}>
          {/* Active tasks header */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-400" />
              Active
              {counts.active > 0 && (
                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-normal">{counts.active}</span>
              )}
            </h2>
          </div>

          {/* Active tasks list */}
          <div className="flex-shrink-0 border-b border-white/5">
            {activeItems.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-[12px] text-white/20">No active tasks</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {activeItems.map(task => {
                  const isSelected = activeChatTaskId === task.id;
                  const meta = taskMetas[task.id];
                  return (
                    <button
                      key={task.id}
                      onClick={() => openTaskChat(task.id)}
                      className={cn(
                        "w-full text-left rounded-xl p-3.5 transition-all",
                        isSelected
                          ? "bg-orange-500/[0.1] border border-orange-500/30 shadow-[0_0_12px_rgba(249,115,22,0.08)]"
                          : "bg-white/[0.025] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.035]"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                          isSelected ? "bg-orange-500/20" : "bg-white/[0.04]"
                        )}>
                          <StatusIcon status="in_progress" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn("text-[14px] font-semibold truncate flex-1", isSelected ? "text-orange-200" : "text-white/85")}>{task.summary}</span>
                            <PriorityIcon priority={task.priority} className="h-3.5 w-3.5 shrink-0" />
                          </div>
                          {/* Last message preview */}
                          {meta?.lastMessage ? (
                            <p className="text-[12px] text-white/30 mt-1.5 line-clamp-1 leading-relaxed">
                              <span className={cn("font-medium", meta.lastRole === "user" ? "text-orange-300/50" : "text-white/40")}>
                                {meta.lastRole === "user" ? "You" : agentName}:
                              </span>{" "}
                              {meta.lastMessage.slice(0, 120)}
                            </p>
                          ) : (task.note) ? (
                            <p className="text-[12px] text-white/30 mt-1.5 line-clamp-1 leading-relaxed">{task.note}</p>
                          ) : null}
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-1.5">
                              <div className={cn("h-2 w-2 rounded-full", getProjectColor(task.project))} />
                              <span className="text-[11px] text-white/25">{projLabel(task.project)}</span>
                            </div>
                            {meta && (
                              <span className="flex items-center gap-1 text-[11px] text-white/20">
                                <MessageSquare className="h-3 w-3" /> {meta.messageCount}
                              </span>
                            )}
                            <span className="text-[11px] text-white/15 ml-auto">
                              {meta?.lastAt ? timeAgo(new Date(meta.lastAt).toISOString()) : timeAgo(task.at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Spacer — activity feed removed, keeping middle column for active tasks only */}
          <div className="flex-1" />
        </div>

        {/* ═══ DRAG HANDLE 2 ═══ */}
        <div onMouseDown={onMouseDownRight} className="w-1 bg-white/[0.06] hover:bg-orange-500/30 cursor-col-resize transition-colors flex-shrink-0" />

        {/* ════ RIGHT: Chat (always visible) ════ */}
        <div className="flex-1 min-w-0" style={{ minWidth: MIN_CHAT }}>
          {chatTask && chatTask.sessionKey ? (
            <TaskChat
              task={{
                id: chatTask.id,
                summary: chatTask.summary,
                sessionKey: chatTask.sessionKey!,
                note: chatTask.note,
                project: chatTask.project,
                priority: chatTask.priority,
                status: chatTask.status,
                at: chatTask.at,
              }}
              allProjects={allProjects}
              onBack={() => setActiveChatTaskId(null)}
              onStatusChange={(status) => {
                updateTask(chatTask.id, { status: status as Task["status"] });
                if (status !== "in_progress") setActiveChatTaskId(null);
              }}
              onPriorityChange={(pri) => updateTask(chatTask.id, { priority: pri as Task["priority"] })}
              onProjectChange={(proj) => updateTask(chatTask.id, { project: proj })}
              onDelete={() => { deleteTask(chatTask.id); setActiveChatTaskId(null); }}
              initialMessage={pendingKickoff ?? undefined}
              onInitialMessageSent={() => setPendingKickoff(null)}
            />
          ) : (
            <MainChat />
          )}
        </div>
      </div>

      {/* Context Menu */}
      {ctxMenu && (
        <TaskContextMenu
          task={ctxMenu.task}
          position={ctxMenu.pos}
          allProjects={allProjects}
          onStatusChange={(status) => { updateTask(ctxMenu.task.id, { status }); closeCtxMenu(); }}
          onPriorityChange={(pri) => { updateTask(ctxMenu.task.id, { priority: pri }); closeCtxMenu(); }}
          onProjectChange={(proj) => { updateTask(ctxMenu.task.id, { project: proj }); closeCtxMenu(); }}
          onEdit={() => { setEditingTask(ctxMenu.task); closeCtxMenu(); }}
          onDelete={() => { deleteTask(ctxMenu.task.id); closeCtxMenu(); }}
          onStart={() => { startTask(ctxMenu.task.id); closeCtxMenu(); }}
          onCreateProject={() => { setShowNewProject(true); closeCtxMenu(); }}
          onClose={closeCtxMenu}
        />
      )}

      {/* ═══ Add Task Modal ═══ */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#1a1614] shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-[15px] font-semibold text-white/90">Add Task</h2>
              <button onClick={() => setShowAddForm(false)} className="text-white/30 hover:text-white/60 transition-colors p-1 rounded-lg hover:bg-white/5">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-1.5">Summary</label>
                <input
                  type="text"
                  value={newSummary}
                  onChange={e => setNewSummary(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && newSummary.trim()) addTask(); }}
                  placeholder="What needs to be done?"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white placeholder-white/20 focus:border-orange-500/30 focus:outline-none transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-1.5">Project</label>
                <select
                  value={newProject}
                  onChange={e => setNewProject(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 pr-10 py-2 text-[13px] text-white focus:border-orange-500/30 focus:outline-none transition-colors appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.3)%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]"
                >
                  {allProjects.map(p => (
                    <option key={p} value={p}>{projLabel(p)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-1.5">Priority</label>
                <div className="flex gap-1">
                  {priOptions.map(p => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setNewPriority(p.key === "none" ? undefined : p.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] border transition-all ${
                        (newPriority || "none") === p.key
                          ? "border-orange-500/40 bg-orange-500/10 text-white/90"
                          : "border-white/[0.06] bg-white/[0.02] text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
                      }`}
                    >
                      <PriorityIcon priority={p.key === "none" ? undefined : p.key} className="h-3.5 w-3.5" />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-1.5">Note <span className="text-white/20">(optional)</span></label>
                <textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Additional context..."
                  rows={2}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white placeholder-white/20 focus:border-orange-500/30 focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/[0.06]">
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-lg text-[13px] text-white/40 hover:text-white/60 hover:bg-white/5 transition-all">
                Cancel
              </button>
              <button onClick={addTask} disabled={!newSummary.trim()} className="px-4 py-2 rounded-lg bg-orange-500 text-white text-[13px] font-medium hover:bg-orange-600 disabled:opacity-30 transition-all">
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ New Project Modal ═══ */}
      <NewProjectModal
        open={showNewProject}
        onCreate={(name, color) => { createProject(name, color); setShowNewProject(false); }}
        onClose={() => setShowNewProject(false)}
      />

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          allProjects={allProjects}
          onSave={(patch) => { updateTask(editingTask.id, patch); setEditingTask(null); }}
          onClose={() => setEditingTask(null)}
          onCreateProject={() => setShowNewProject(true)}
        />
      )}

      {/* Delete Project Confirmation */}
      <ConfirmDeleteModal
        open={!!confirmDeleteProject}
        title="Delete project"
        message={<>Delete <strong className="text-white/80">{confirmDeleteProject ? projLabel(confirmDeleteProject) : ""}</strong>? All tasks will be moved to General.</>}
        onConfirm={() => confirmDeleteProject && deleteProject(confirmDeleteProject)}
        onCancel={() => setConfirmDeleteProject(null)}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        project={editingProject}
        onSave={(key, name, color) => { saveProjectEdit(key, name, color); setEditingProject(null); }}
        onClose={() => setEditingProject(null)}
      />
    </div>
  );
}

// ─── Main Session Chat ───

import { type ParsedMessage, type MessageGroup, extractText as chatExtractText, parseMessages, groupMessages, shortenPath } from "@/lib/chat-parser";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { ToolCardView, ToolSummaryCard, LiveToolCard } from "@/components/ui/tool-cards";
import { ChatGroup } from "@/components/task-chat";
import { useAgentIdentity } from "@/lib/use-agent-identity";
import { CreateMenu } from "@/components/ui/create-menu";
import { TaskContextMenu, useTaskContextMenu } from "@/components/ui/task-context-menu";
import { TaskRow } from "@/components/ui/task-row";
import { EditTaskModal } from "@/components/ui/edit-task-modal";
import { NewProjectModal, EditProjectModal } from "@/components/ui/project-modals";

let mainSending = false;
let mainActiveRunId: string | null = null;
const MAIN_SESSION_KEY = "main";

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch { /* */ }
}

// MainChatGroup removed — using shared ChatGroup from task-chat.tsx

function MainChat() {
  const { rpc } = useGateway();
  const { name: agentName, emoji: agentEmoji } = useAgentIdentity();
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, _setSending] = useState(() => mainSending);
  const sendingRef = useRef(mainSending);
  const setSending = useCallback((v: boolean) => {
    mainSending = v;
    sendingRef.current = v;
    _setSending(v);
  }, []);
  const [streamContent, setStreamContent] = useState<string | null>(null);
  const streamRef = useRef<string | null>(null);
  const [liveTools, setLiveTools] = useState<Array<{ name: string; detail?: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeRunId = useRef<string | null>(mainActiveRunId);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevMessageCount = useRef(0);

  useEffect(() => { streamRef.current = streamContent; }, [streamContent]);

  // Load history
  const loadHistory = useCallback(async () => {
    try {
      const result = await rpc.getChatHistory(MAIN_SESSION_KEY, { limit: 500 });
      const data = result as { messages?: Array<Record<string, unknown>> };
      if (!data?.messages) return;
      const parsed = parseMessages(data.messages as Parameters<typeof parseMessages>[0]);
      if (sendingRef.current) {
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg?.role === "user") {
            const serverHasIt = parsed.length > 0 && parsed[parsed.length - 1]?.role === "user" && parsed[parsed.length - 1].text === lastMsg.text;
            if (!serverHasIt) return [...parsed, lastMsg];
          }
          return parsed;
        });
      } else {
        setMessages(parsed);
      }
    } catch { /* */ }
  }, [rpc]);

  // Polling fallback
  function pollUntilDone(attempt = 0) {
    if (attempt > 120) { setSending(false); return; }
    pollTimer.current = setTimeout(async () => {
      try {
        const result = await rpc.getChatHistory(MAIN_SESSION_KEY, { limit: 500 });
        const data = result as { messages?: Array<Record<string, unknown>> };
        if (data?.messages) {
          const parsed = parseMessages(data.messages as Parameters<typeof parseMessages>[0]);
          setMessages(parsed);
          if (attempt >= 3 && parsed.length > 0) {
            const last = parsed[parsed.length - 1];
            if (last.role === "assistant" && last.text.trim()) {
              setSending(false); setStreamContent(null); setLiveTools([]);
              playNotificationSound();
              return;
            }
          }
        }
      } catch { /* */ }
      if (sendingRef.current) pollUntilDone(attempt + 1);
    }, 2000);
  }

  // On mount: load history + detect incomplete turn
  useEffect(() => {
    setStreamContent(null);
    setLiveTools([]);
    activeRunId.current = mainActiveRunId;

    const wasSending = mainSending;

    function detectIncompleteTurn(msgs: ParsedMessage[]): boolean {
      if (msgs.length === 0) return false;
      const last = msgs[msgs.length - 1];
      if (last.role === "user") return true;
      if (last.role === "assistant" && !last.text.trim()) return true;
      return false;
    }

    async function loadAndDetect() {
      try {
        const result = await rpc.getChatHistory(MAIN_SESSION_KEY, { limit: 500 });
        const data = result as { messages?: Array<Record<string, unknown>> };
        if (!data?.messages) return;
        const parsed = parseMessages(data.messages as Parameters<typeof parseMessages>[0]);
        setMessages(parsed);
        if (wasSending || detectIncompleteTurn(parsed)) {
          setSending(true);
          pollUntilDone();
        } else {
          setSending(false);
        }
      } catch { /* */ }
    }

    loadAndDetect();
    return () => { if (pollTimer.current) { clearTimeout(pollTimer.current); pollTimer.current = null; } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Background poll — catch messages that arrive outside active send (e.g. cron, external triggers)
  useEffect(() => {
    const iv = setInterval(() => {
      if (!sendingRef.current) loadHistory();
    }, 10000);
    return () => clearInterval(iv);
  }, [loadHistory]);

  // Chat events
  useEffect(() => {
    const unsub = rpc.onEvent("chat", (data: unknown) => {
      const evt = data as { sessionKey?: string; runId?: string; state?: string; message?: unknown; errorMessage?: string };
      const matches = evt.sessionKey === MAIN_SESSION_KEY || (evt.runId && evt.runId === activeRunId.current);
      if (!matches) return;
      if (evt.state === "delta") {
        if (!sendingRef.current) setSending(true);
        const text = chatExtractText(evt.message);
        if (text) { const cur = streamRef.current || ""; if (text.length >= cur.length) setStreamContent(text); }
      }
      if (evt.state === "final" || evt.state === "aborted") {
        if (pollTimer.current) { clearTimeout(pollTimer.current); pollTimer.current = null; }
        setStreamContent(null); setLiveTools([]); setSending(false); loadHistory();
        if (evt.state === "final") playNotificationSound();
      }
      if (evt.state === "error") {
        setStreamContent(null); setLiveTools([]); setSending(false);
        setMessages(prev => [...prev, { role: "assistant", text: `⚠️ ${evt.errorMessage || "Error"}`, toolCards: [], at: new Date().toISOString() }]);
      }
    });
    return unsub;
  }, [rpc, loadHistory, setSending]);

  // Agent events (live tools)
  useEffect(() => {
    const unsub = rpc.onEvent("agent", (data: unknown) => {
      const evt = data as { sessionKey?: string; runId?: string; stream?: string; name?: string; toolName?: string; phase?: string; args?: unknown };
      const matches = evt.sessionKey === MAIN_SESSION_KEY || (evt.runId && evt.runId === activeRunId.current);
      if (!matches || evt.stream !== "tool") return;
      const name = evt.name || evt.toolName || "tool";
      const phase = evt.phase || "start";
      if (phase === "start") {
        if (!sendingRef.current) setSending(true);
        let detail = "";
        if (evt.args && typeof evt.args === "object") {
          const a = evt.args as Record<string, unknown>;
          detail = (a.command || a.path || a.file_path || a.query || a.url || a.action || "") as string;
        }
        setLiveTools(prev => [...prev, { name, detail: detail ? shortenPath(detail) : undefined }]);
      }
      if (phase === "result" || phase === "error") setLiveTools(prev => prev.slice(0, -1));
    });
    return unsub;
  }, [rpc, setSending]);

  // Auto-scroll
  useEffect(() => {
    const isNew = messages.length > prevMessageCount.current || streamContent || liveTools.length > 0;
    prevMessageCount.current = messages.length;
    if (isNew) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamContent, liveTools]);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, []);
  useEffect(() => { autoResize(); }, [input, autoResize]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;
    setMessages(prev => [...prev, { role: "user", text, toolCards: [], at: new Date().toISOString() }]);
    setInput(""); setSending(true); setStreamContent(null); setLiveTools([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    try {
      const r = await rpc.chatSend(MAIN_SESSION_KEY, text);
      if (r?.runId) { activeRunId.current = r.runId; mainActiveRunId = r.runId; }
      pollUntilDone();
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: `⚠️ ${err instanceof Error ? err.message : "Error"}`, toolCards: [], at: new Date().toISOString() }]);
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  async function handleStop() {
    try { await rpc.chatAbort(MAIN_SESSION_KEY); } catch { /* */ }
    setSending(false); setStreamContent(null); setLiveTools([]);
  }

  const groups = groupMessages(messages);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/5 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-sm">{agentEmoji}</div>
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-[#161210]" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-white/90">Chat</h2>
            <p className="text-[10px] text-green-400">Main Session</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {groups.length === 0 && !streamContent && !sending && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-600/20 flex items-center justify-center text-2xl mb-4">{agentEmoji}</div>
            <p className="text-[15px] text-white/50 mb-1">Hey! What&apos;s up?</p>
            <p className="text-[12px] text-white/20 max-w-sm">Type a message to chat with your agent directly.</p>
          </div>
        )}

        {groups.map((group, i) => <ChatGroup key={i} group={group} />)}

        {liveTools.length > 0 && (
          <div className="ml-10 space-y-1.5 max-w-[85%]">
            {liveTools.map((tool, i) => <LiveToolCard key={i} name={tool.name} detail={tool.detail} />)}
          </div>
        )}

        {sending && streamContent && (
          <div className="flex gap-3">
            <div className="h-7 w-7 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0 mt-auto">
              <span className="text-[11px] text-white/40 font-medium">A</span>
            </div>
            <div className="max-w-[85%]">
              <div className="rounded-2xl px-4 py-2.5 bg-white/[0.04] border border-white/[0.06]">
                <MarkdownContent text={streamContent} className="text-white/75" />
                <span className="inline-block w-1.5 h-4 bg-orange-400 animate-pulse ml-0.5 align-middle" />
              </div>
            </div>
          </div>
        )}

        {sending && !streamContent && (
          <div className="flex gap-3">
            <div className="h-7 w-7 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0 mt-auto">
              <span className="text-[11px] text-white/40 font-medium">A</span>
            </div>
            <div className="w-fit">
              <div className="rounded-2xl px-3.5 py-2 bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-2 text-white/30">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-400/60" />
                  <span className="text-[13px]">{liveTools.length > 0 ? "Working…" : "Thinking…"}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-white/5 px-5 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${agentName}…`}
            rows={1}
            className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[14px] text-white placeholder-white/20 focus:border-orange-500/30 focus:outline-none transition-colors resize-none overflow-y-auto"
            style={{ minHeight: "42px" }}
          />
          {sending ? (
            <button onClick={handleStop} className="p-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all shrink-0" title="Stop">
              <X className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={sendMessage} disabled={!input.trim()} className="p-2.5 rounded-xl bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-30 transition-all shrink-0" title="Send">
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

