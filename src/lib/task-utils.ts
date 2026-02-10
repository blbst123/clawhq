// ─── Shared task utilities ───

import type { Task } from "./types";

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
}

const priorityOrder: Record<string, number> = { urgent: 0, medium: 1, low: 2 };

export function priSort(a: Task, b: Task) {
  return (priorityOrder[a.priority || ""] ?? 4) - (priorityOrder[b.priority || ""] ?? 4);
}

export function generateSessionKey(taskId: string): string {
  return `task-${taskId.replace("cap_", "")}`;
}
