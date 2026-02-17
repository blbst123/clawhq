// ─── Shared types for ClawHQ ───

export interface Task {
  id: string;
  at: string;
  type: string;
  summary: string;
  source?: string;
  project?: string;
  status: "inbox" | "todo" | "in_progress" | "done" | "dismissed";
  priority?: "low" | "medium" | "urgent";
  note?: string;
  sessionKey?: string;
}
