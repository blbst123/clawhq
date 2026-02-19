// ─── Activity feed parsing (pure logic, no React) ───

import {
  Bot, Terminal, FileText, FileCode, Code, Send, Database, Eye, Cpu,
  Wrench, GitBranch, Mail, CloudUpload, Globe, Calendar, RefreshCw,
  MessageSquare, Activity,
} from "lucide-react";
import { formatTime, formatDate } from "@/lib/task-utils";
import { extractText as chatExtractText } from "@/lib/chat-parser";

// ─── Types ───

export interface ActivityItem {
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

// ─── Helpers ───

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.filter((b: Record<string, unknown>) => b?.type === "text").map((b: Record<string, unknown>) => safeStr(b.text)).join("\n");
  return "";
}

// ─── Tool description & icons ───

export function describeToolCall(name: string, args: Record<string, unknown>): string {
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
    case "Edit": return `Edited ${s(args.file_path || args.path).split("/").pop() || "file"}`;
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

export function getToolIcon(name: string, args: Record<string, unknown>): typeof Bot {
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

export function summarizeTools(tools: { name: string; args: Record<string, unknown> }[]): { description: string; icon: typeof Bot; iconColor: string } {
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

// ─── Source helpers ───

export function parseChannel(label?: string): string {
  if (!label) return "";
  const m = label.match(/#([\w-]+)$/);
  if (m) return `#${m[1]}`;
  if (label.includes("telegram")) return "Telegram";
  return "";
}

export function getSourceType(label?: string): "discord" | "telegram" | "cron" | "other" {
  const l = (label || "").toLowerCase();
  if (l.includes("discord")) return "discord";
  if (l.includes("telegram")) return "telegram";
  if (l.includes("cron")) return "cron";
  return "other";
}

export const srcColor: Record<string, string> = { discord: "text-indigo-400", telegram: "text-sky-400", cron: "text-orange-400", other: "text-white/25" };

// ─── Parse & group sessions into activity items ───

export function parseAndGroup(sessionKey: string, sessionLabel: string, rawMessages: unknown): ActivityItem[] {
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
