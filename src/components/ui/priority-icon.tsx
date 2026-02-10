"use client";

import { cn } from "@/lib/utils";

// ─── Priority data ───

export const priLabels: Record<string, string> = {
  urgent: "Urgent", medium: "Medium", low: "Low",
};

export const priColors: Record<string, string> = {
  urgent: "text-red-400 bg-red-500/10",
  medium: "text-yellow-300 bg-yellow-500/10",
  low: "text-white/40 bg-white/[0.04]",
};

export const priOptions = [
  { key: "urgent", label: "Urgent" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
  { key: "none", label: "No priority" },
] as const;

// ─── Project helpers ───

const colorPalette = [
  "bg-purple-400", "bg-blue-400", "bg-cyan-400", "bg-teal-400", "bg-green-400",
  "bg-emerald-400", "bg-amber-400", "bg-orange-400", "bg-red-400", "bg-pink-400",
  "bg-rose-400", "bg-indigo-400", "bg-violet-400", "bg-fuchsia-400", "bg-sky-400",
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

export function projColor(p?: string): string {
  const key = (p || "").toLowerCase().trim();
  if (!key || key === "general") return "bg-white/40";
  return colorPalette[hashStr(key) % colorPalette.length];
}

export function projLabel(p?: string): string {
  if (!p || p.toLowerCase() === "general") return "General";
  // Title case: capitalize first letter of each word, preserve dots/special chars
  return p.replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Priority Icon (Linear-style bars) ───

export function PriorityIcon({ priority, className }: { priority?: string; className?: string }) {
  const cls = cn("h-4 w-4", className);
  const bar = "rgba(255,255,255,0.35)";
  const dim = "rgba(255,255,255,0.1)";
  switch (priority) {
    case "urgent":
      return (<svg className={cls} viewBox="0 0 16 16" fill="none"><rect x="1" y="8" width="3" height="6" rx="0.5" fill="rgb(239,68,68)" /><rect x="6" y="4" width="3" height="10" rx="0.5" fill="rgb(239,68,68)" /><rect x="11" y="1" width="3" height="13" rx="0.5" fill="rgb(239,68,68)" /></svg>);
    case "medium":
      return (<svg className={cls} viewBox="0 0 16 16" fill="none"><rect x="1" y="8" width="3" height="6" rx="0.5" fill={bar} /><rect x="6" y="4" width="3" height="10" rx="0.5" fill={bar} /><rect x="11" y="1" width="3" height="13" rx="0.5" fill={dim} /></svg>);
    case "low":
      return (<svg className={cls} viewBox="0 0 16 16" fill="none"><rect x="1" y="8" width="3" height="6" rx="0.5" fill={bar} /><rect x="6" y="4" width="3" height="10" rx="0.5" fill={dim} /><rect x="11" y="1" width="3" height="13" rx="0.5" fill={dim} /></svg>);
    default:
      return (<svg className={cls} viewBox="0 0 16 16" fill="none"><rect x="1" y="8" width="3" height="6" rx="0.5" fill={dim} /><rect x="6" y="4" width="3" height="10" rx="0.5" fill={dim} /><rect x="11" y="1" width="3" height="13" rx="0.5" fill={dim} /></svg>);
  }
}
