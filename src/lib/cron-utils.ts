// ─── Cron utility functions (pure logic, no React) ───

export interface CronSchedule {
  kind: string;
  expr?: string;
  tz?: string;
  everyMs?: number;
  at?: string;
}

export interface CronPayload {
  kind: string;
  message?: string;
  text?: string;
  model?: string;
}

export interface CronJob {
  id: string;
  name?: string;
  enabled: boolean;
  schedule: CronSchedule;
  sessionTarget: string;
  payload: CronPayload;
  createdAtMs?: number;
  updatedAtMs?: number;
  lastRun?: { startedAtMs?: number; finishedAtMs?: number; ok?: boolean; error?: string };
  nextRun?: string;
  state?: { lastRunAtMs?: number; lastStatus?: string; lastDurationMs?: number; lastError?: string; nextRunAtMs?: number };
}

// ─── Cron expression parser ───

export function parseCronToHuman(s: CronSchedule): string {
  if (s.kind === "every" && s.everyMs) {
    const mins = Math.round(s.everyMs / 60000);
    if (mins < 60) return `Every ${mins} min`;
    const hrs = mins / 60;
    if (hrs === Math.floor(hrs)) return hrs === 1 ? "Every hour" : `Every ${hrs} hours`;
    return `Every ${mins} min`;
  }
  if (s.kind === "at" && s.at) {
    const d = new Date(s.at);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      " at " + formatClockTime(d.getHours(), d.getMinutes());
  }
  if (s.kind !== "cron" || !s.expr) return s.kind;

  const parts = s.expr.trim().split(/\s+/);
  if (parts.length < 5) return s.expr;
  const [min, hour, dom, , dow] = parts;
  const tzLabel = s.tz ? ` ${tzAbbrev(s.tz)}` : "";

  if (min.startsWith("*/") && hour === "*") {
    const n = parseInt(min.slice(2));
    return n === 1 ? "Every minute" : `Every ${n} min`;
  }
  if (hour.startsWith("*/") && min !== "*") {
    const n = parseInt(hour.slice(2));
    return n === 1 ? "Every hour" : `Every ${n} hours`;
  }
  if (min !== "*" && !min.includes("/") && hour === "*") {
    return `Hourly at :${min.padStart(2, "0")}`;
  }
  if (!min.includes("*") && !min.includes("/") && !hour.includes("*") && !hour.includes("/")) {
    const h = parseInt(hour);
    const m = parseInt(min);
    const time = formatClockTime(h, m) + tzLabel;
    if (dow !== "*") {
      const days = dow.split(",").map(parseDow).filter(Boolean);
      if (days.length === 7) return `Daily at ${time}`;
      if (days.length === 1) return `${days[0]}s at ${time}`;
      return `${days.join(", ")} at ${time}`;
    }
    if (dom !== "*") return `${ordinal(parseInt(dom))} of month at ${time}`;
    return `Daily at ${time}`;
  }
  return s.expr;
}

export function formatClockTime(h: number, m: number): string {
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")}${ampm}`;
}

export function parseDow(d: string): string | null {
  const map: Record<string, string> = { "0": "Sun", "1": "Mon", "2": "Tue", "3": "Wed", "4": "Thu", "5": "Fri", "6": "Sat", "7": "Sun", sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat" };
  return map[d.toLowerCase()] || null;
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function tzAbbrev(tz: string): string {
  try {
    const short = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
      .formatToParts(new Date())
      .find(p => p.type === "timeZoneName")?.value;
    return short || tz.split("/").pop()!.replace("_", " ");
  } catch { return tz.split("/").pop()!.replace("_", " "); }
}

// ─── Classification ───

export function isDailyOrMoreFrequent(job: CronJob): boolean {
  const s = job.schedule;
  if (s.kind === "every" && s.everyMs) return s.everyMs <= 86400000;
  if (s.kind === "at") return true;
  if (s.kind === "cron" && s.expr) {
    const parts = s.expr.trim().split(/\s+/);
    if (parts.length < 5) return true;
    const [, , dom, , dow] = parts;
    if (dow !== "*") return false;
    if (dom !== "*") return false;
    return true;
  }
  return true;
}

// ─── Next run times today ───

export function getNextRunTimesToday(job: CronJob): Date[] {
  const now = new Date();
  const eod = new Date(now);
  eod.setHours(23, 59, 59, 999);
  const times: Date[] = [];

  if (job.nextRun) {
    const next = new Date(job.nextRun);
    if (next <= eod) times.push(next);
  }

  const s = job.schedule;
  if (s.kind === "every" && s.everyMs && job.nextRun) {
    let t = new Date(job.nextRun).getTime();
    for (let i = 0; i < 8 && times.length < 5; i++) {
      t += s.everyMs;
      const d = new Date(t);
      if (d > eod) break;
      if (d > now) times.push(d);
    }
  } else if (s.kind === "cron" && s.expr) {
    const parts = s.expr.trim().split(/\s+/);
    if (parts.length >= 5) {
      const [minP, hourP] = parts;
      if (minP.startsWith("*/")) {
        const interval = parseInt(minP.slice(2));
        if (interval > 0 && job.nextRun) {
          let t = new Date(job.nextRun).getTime();
          for (let i = 0; i < 12 && times.length < 5; i++) {
            t += interval * 60000;
            const d = new Date(t);
            if (d > eod) break;
            if (d > now) times.push(d);
          }
        }
      } else if (hourP.startsWith("*/")) {
        const interval = parseInt(hourP.slice(2));
        if (interval > 0 && job.nextRun) {
          let t = new Date(job.nextRun).getTime();
          for (let i = 0; i < 8 && times.length < 5; i++) {
            t += interval * 3600000;
            const d = new Date(t);
            if (d > eod) break;
            if (d > now) times.push(d);
          }
        }
      }
    }
  }
  return times.slice(0, 5);
}

// ─── Schedule minute-of-day for sorting ───

export function getScheduleMinuteOfDay(job: CronJob): number {
  const s = job.schedule;
  if (s.kind === "cron" && s.expr) {
    const parts = s.expr.trim().split(/\s+/);
    if (parts.length >= 2) {
      const min = parseInt(parts[0]);
      const hour = parseInt(parts[1]);
      if (!isNaN(min) && !isNaN(hour)) return hour * 60 + min;
    }
  }
  if (s.kind === "every" && s.everyMs) return 0;
  if (s.kind === "at" && s.at) {
    const d = new Date(s.at);
    return d.getHours() * 60 + d.getMinutes();
  }
  return 9999;
}

// ─── Misc utilities ───

export function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return "overdue";
  if (diff < 60000) return "<1m";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m`;
  return `${Math.floor(diff / 86400000)}d`;
}

export function extractModel(payload: CronPayload): string {
  if (payload.model) {
    const m = payload.model;
    if (m.includes("opus")) return "Opus";
    if (m.includes("sonnet")) return "Sonnet";
    if (m.includes("haiku")) return "Haiku";
    if (m.includes("flash")) return "Flash";
    return m.split("/").pop() || m;
  }
  return "Default Model";
}

export function truncateMessage(msg?: string, len = 120): string {
  if (!msg) return "";
  const first = msg.split("\n")[0];
  return first.length > len ? first.slice(0, len) + "…" : first;
}

export function inferProject(job: CronJob): { project: string; color: string } {
  const name = job.name || "";
  if (name) return { project: name, color: "blue" };
  return { project: "General", color: "gray" };
}

export const projectColorMap: Record<string, string> = {
  purple: "bg-purple-500/15 text-purple-300 border-purple-500/20",
  green: "bg-green-500/15 text-green-300 border-green-500/20",
  red: "bg-red-500/15 text-red-300 border-red-500/20",
  orange: "bg-orange-500/15 text-orange-300 border-orange-500/20",
  blue: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  gray: "bg-white/5 text-white/40 border-white/10",
};

// ─── Cron expression <-> time field helpers ───

export function cronToTimeFields(expr: string): { hour: string; minute: string; days: string[] } | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) return null;
  const [min, hour, , , dow] = parts;
  if (min.includes("*") || min.includes("/") || hour.includes("*") || hour.includes("/")) return null;
  const days = dow === "*" ? ["daily"] : dow.split(",");
  return { hour, minute: min, days };
}

export function timeFieldsToCron(hour: string, minute: string, days: string[]): string {
  const dow = days.includes("daily") ? "*" : days.join(",");
  return `${minute} ${hour} * * ${dow}`;
}

export const COMMON_TIMEZONES = [
  "America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York",
  "America/Vancouver", "America/Toronto", "Europe/London", "Europe/Paris",
  "Asia/Tokyo", "Asia/Shanghai", "Asia/Singapore", "Australia/Sydney", "UTC",
];

export const DAY_OPTIONS = [
  { value: "daily", label: "Every day" },
  { value: "1", label: "Mon" }, { value: "2", label: "Tue" }, { value: "3", label: "Wed" },
  { value: "4", label: "Thu" }, { value: "5", label: "Fri" }, { value: "6", label: "Sat" }, { value: "0", label: "Sun" },
];
