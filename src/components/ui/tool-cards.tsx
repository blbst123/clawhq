"use client";

import { useState, useMemo } from "react";
import {
  Loader2, Check,
  Terminal, FileText, Pencil, Globe,
  Search, MonitorSmartphone, Mail, Brain,
  Clock, Wrench, Eye, Plug, Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolEntry } from "@/lib/chat-parser";
import { getToolDetail } from "@/lib/chat-parser";

// ─── Tool metadata registry ───

const toolMeta: Record<string, { icon: React.ElementType; label: string }> = {
  read:           { icon: FileText, label: "Read" },
  write:          { icon: Pencil, label: "Write" },
  edit:           { icon: Pencil, label: "Edit" },
  exec:           { icon: Terminal, label: "Exec" },
  bash:           { icon: Terminal, label: "Bash" },
  process:        { icon: Terminal, label: "Process" },
  browser:        { icon: Globe, label: "Browser" },
  web_search:     { icon: Search, label: "Web Search" },
  web_fetch:      { icon: Globe, label: "Web Fetch" },
  nodes:          { icon: MonitorSmartphone, label: "Nodes" },
  message:        { icon: Mail, label: "Message" },
  memory_search:  { icon: Brain, label: "Memory Search" },
  memory_get:     { icon: Brain, label: "Memory" },
  cron:           { icon: Clock, label: "Cron" },
  gateway:        { icon: Plug, label: "Gateway" },
  image:          { icon: ImageIcon, label: "Image" },
  canvas:         { icon: ImageIcon, label: "Canvas" },
  tts:            { icon: Wrench, label: "TTS" },
  session_status: { icon: Eye, label: "Session Status" },
  sessions_spawn: { icon: Wrench, label: "Spawn" },
  sessions_send:  { icon: Mail, label: "Session Send" },
  sessions_list:  { icon: Eye, label: "Sessions" },
};

export function getToolMeta(name: string) {
  return toolMeta[name.toLowerCase()] || { icon: Wrench, label: name };
}

// ─── Tool Card ───

const INLINE_MAX = 80;

export function ToolCardView({ entry }: { entry: ToolEntry }) {
  const [expanded, setExpanded] = useState(false);
  const meta = getToolMeta(entry.name);
  const Icon = meta.icon;
  const detail = entry.kind === "call" ? getToolDetail(entry.name, entry.args) : "";
  const hasText = !!entry.text?.trim();
  const isShort = hasText && entry.text!.length <= INLINE_MAX;
  const isLong = hasText && !isShort;
  const noOutput = !hasText;
  const clickable = isLong;

  return (
    <div
      className={cn(
        "rounded-lg border bg-white/[0.025] border-white/[0.07]",
        clickable && "cursor-pointer hover:border-white/10 hover:bg-white/[0.04]"
      )}
      onClick={clickable ? () => setExpanded(!expanded) : undefined}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-3.5 w-3.5 text-white/35 shrink-0" />
          <span className="text-[13px] font-medium text-white/60">{meta.label}</span>
        </div>
        {clickable ? (
          <span className="flex items-center gap-1 text-[12px] text-green-400/60">
            View <Check className="h-3 w-3" />
          </span>
        ) : (
          <Check className="h-3 w-3 text-green-400/50 shrink-0" />
        )}
      </div>
      {detail && (
        <div className="px-3 pb-1.5 -mt-0.5">
          <span className="text-[11px] text-white/20 font-mono truncate block">{detail}</span>
        </div>
      )}
      {noOutput && !detail && (
        <div className="px-3 pb-1.5 -mt-0.5">
          <span className="text-[11px] text-white/20">Completed</span>
        </div>
      )}
      {isShort && (
        <div className="mx-3 mb-1.5 px-2 py-1 rounded bg-white/[0.02] border border-white/[0.04]">
          <pre className="text-[11px] text-white/25 font-mono whitespace-pre-wrap break-all leading-relaxed">{entry.text}</pre>
        </div>
      )}
      {isLong && !expanded && (
        <div className="mx-3 mb-1.5 px-2 py-1 rounded bg-white/[0.02] border border-white/[0.04] max-h-[40px] overflow-hidden">
          <pre className="text-[11px] text-white/25 font-mono whitespace-pre-wrap break-all leading-relaxed">
            {entry.text!.split("\n").slice(0, 2).join("\n").slice(0, 100)}
          </pre>
        </div>
      )}
      {isLong && expanded && (
        <div className="mx-3 mb-1.5 px-2 py-1 rounded bg-white/[0.02] border border-white/[0.04] max-h-60 overflow-y-auto">
          <pre className="text-[11px] text-white/25 font-mono whitespace-pre-wrap break-all leading-relaxed">{entry.text}</pre>
        </div>
      )}
    </div>
  );
}

// ─── Tool Summary (collapsed) ───

export function ToolSummaryCard({ tools }: { tools: ToolEntry[] }) {
  const [expanded, setExpanded] = useState(false);

  const toolCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tools) counts[t.name] = (counts[t.name] || 0) + 1;
    return counts;
  }, [tools]);

  const summary = Object.entries(toolCounts)
    .map(([name, count]) => {
      const meta = getToolMeta(name);
      return count > 1 ? `${meta.label} ×${count}` : meta.label;
    })
    .join(", ");

  return (
    <div className="rounded-lg border bg-white/[0.025] border-white/[0.07]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.02] transition-colors"
      >
        <Wrench className="h-3.5 w-3.5 text-white/25 shrink-0" />
        <span className="text-[12px] text-white/40 flex-1 text-left truncate">
          {tools.length} action{tools.length !== 1 ? "s" : ""}: {summary}
        </span>
        <Check className="h-3 w-3 text-green-400/50 shrink-0" />
      </button>
      {expanded && (
        <div className="border-t border-white/[0.05] px-2 py-1.5 space-y-1">
          {tools.map((tc, j) => <ToolCardView key={j} entry={tc} />)}
        </div>
      )}
    </div>
  );
}

// ─── Live Tool Card (streaming) ───

export function LiveToolCard({ name, detail }: { name: string; detail?: string }) {
  const meta = getToolMeta(name);
  const Icon = meta.icon;
  return (
    <div className="rounded-lg border bg-orange-500/[0.04] border-orange-500/20">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <Loader2 className="h-3.5 w-3.5 text-orange-400 animate-spin shrink-0" />
        <span className="text-[13px] font-medium text-white/60">{meta.label}</span>
      </div>
      {detail && (
        <div className="px-3 pb-1.5 -mt-0.5">
          <span className="text-[11px] text-white/20 font-mono truncate block">{detail}</span>
        </div>
      )}
    </div>
  );
}
