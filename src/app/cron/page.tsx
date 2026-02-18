"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Clock,
  Zap,
  ChevronDown,
  Sparkles,
  Loader2,
  WifiOff,
  CalendarDays,
  Timer,
  Calendar,
  Filter,
} from "lucide-react";
import { useGateway } from "@/lib/gateway-context";
import { useCachedRpc, invalidateCache } from "@/lib/use-cached-rpc";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";

interface CronJob {
  id: string;
  name?: string;
  enabled: boolean;
  schedule: { kind: string; expr?: string; tz?: string; everyMs?: number; at?: string };
  sessionTarget: string;
  payload: { kind: string; message?: string; text?: string; model?: string };
  createdAtMs?: number;
  updatedAtMs?: number;
  lastRun?: { startedAtMs?: number; finishedAtMs?: number; ok?: boolean; error?: string };
  nextRun?: string;
  state?: { lastRunAtMs?: number; lastStatus?: string; lastDurationMs?: number; lastError?: string; nextRunAtMs?: number };
}

/* ── Cron expression parser ── */

function parseCronToHuman(s: CronJob["schedule"]): string {
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

  // Every N minutes: */N * * * *
  if (min.startsWith("*/") && hour === "*") {
    const n = parseInt(min.slice(2));
    return n === 1 ? "Every minute" : `Every ${n} min`;
  }

  // Every N hours: 0 */N * * *
  if (hour.startsWith("*/") && min !== "*") {
    const n = parseInt(hour.slice(2));
    return n === 1 ? "Every hour" : `Every ${n} hours`;
  }

  // Every hour at :MM
  if (min !== "*" && !min.includes("/") && hour === "*") {
    return `Hourly at :${min.padStart(2, "0")}`;
  }

  // Specific time
  if (!min.includes("*") && !min.includes("/") && !hour.includes("*") && !hour.includes("/")) {
    const h = parseInt(hour);
    const m = parseInt(min);
    const time = formatClockTime(h, m) + tzLabel;

    // Day of week
    if (dow !== "*") {
      const days = dow.split(",").map(parseDow).filter(Boolean);
      if (days.length === 7) return `Daily at ${time}`;
      if (days.length === 1) return `${days[0]}s at ${time}`;
      return `${days.join(", ")} at ${time}`;
    }

    // Day of month
    if (dom !== "*") return `${ordinal(parseInt(dom))} of month at ${time}`;

    return `Daily at ${time}`;
  }

  return s.expr;
}

function formatClockTime(h: number, m: number): string {
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")}${ampm}`;
}

function parseDow(d: string): string | null {
  const map: Record<string, string> = { "0": "Sun", "1": "Mon", "2": "Tue", "3": "Wed", "4": "Thu", "5": "Fri", "6": "Sat", "7": "Sun", sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat" };
  return map[d.toLowerCase()] || null;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function tzAbbrev(tz: string): string {
  try {
    const short = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
      .formatToParts(new Date())
      .find(p => p.type === "timeZoneName")?.value;
    return short || tz.split("/").pop()!.replace("_", " ");
  } catch { return tz.split("/").pop()!.replace("_", " "); }
}

/* ── Classification: daily-or-more-frequent vs weekly+ ── */

function isDailyOrMoreFrequent(job: CronJob): boolean {
  const s = job.schedule;
  // "every" intervals: daily if <= 24h
  if (s.kind === "every" && s.everyMs) return s.everyMs <= 86400000;
  // "at" one-shots go in today's schedule
  if (s.kind === "at") return true;
  if (s.kind === "cron" && s.expr) {
    const parts = s.expr.trim().split(/\s+/);
    if (parts.length < 5) return true;
    const [, , dom, , dow] = parts;
    // If day-of-week or day-of-month is restricted, it's weekly+
    if (dow !== "*") return false;
    if (dom !== "*") return false;
    return true; // runs every day (or more frequently)
  }
  return true;
}

/* ── Get next run times today for a job ── */

function getNextRunTimesToday(job: CronJob): Date[] {
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
      if (!minP.includes("*") && !minP.includes("/") && !hourP.includes("*") && !hourP.includes("/")) {
        // Fixed time, already captured by nextRun
      } else if (minP.startsWith("*/")) {
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

/* ── Schedule minute-of-day for sorting ── */

function getScheduleMinuteOfDay(job: CronJob): number {
  const s = job.schedule;
  if (s.kind === "cron" && s.expr) {
    const parts = s.expr.trim().split(/\s+/);
    if (parts.length >= 2) {
      const min = parseInt(parts[0]);
      const hour = parseInt(parts[1]);
      if (!isNaN(min) && !isNaN(hour)) return hour * 60 + min;
    }
  }
  if (s.kind === "every" && s.everyMs) return 0; // interval jobs sort first
  if (s.kind === "at" && s.at) {
    const d = new Date(s.at);
    return d.getHours() * 60 + d.getMinutes();
  }
  return 9999;
}

/* ── Utility ── */

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return "overdue";
  if (diff < 60000) return "<1m";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m`;
  return `${Math.floor(diff / 86400000)}d`;
}

function extractModel(payload: CronJob["payload"]): string {
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

function truncateMessage(msg?: string, len = 120): string {
  if (!msg) return "";
  const first = msg.split("\n")[0];
  return first.length > len ? first.slice(0, len) + "…" : first;
}

/* ── Project inference ── */

function inferProject(job: CronJob): { project: string; color: string } {
  // Use job name as project label if it looks like one, otherwise "General"
  const name = job.name || "";
  if (name) return { project: name, color: "blue" };
  return { project: "General", color: "gray" };
}

const projectColorMap: Record<string, string> = {
  purple: "bg-purple-500/15 text-purple-300 border-purple-500/20",
  green: "bg-green-500/15 text-green-300 border-green-500/20",
  red: "bg-red-500/15 text-red-300 border-red-500/20",
  orange: "bg-orange-500/15 text-orange-300 border-orange-500/20",
  blue: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  gray: "bg-white/5 text-white/40 border-white/10",
};

function ProjectBadge({ job }: { job: CronJob }) {
  const { project, color } = inferProject(job);
  const cls = projectColorMap[color] || projectColorMap.gray;
  return (
    <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-md border ${cls}`}>
      {project}
    </span>
  );
}

/* ── Components ── */

function StatusDot({ job }: { job: CronJob }) {
  const hasRun = !!job.lastRun?.startedAtMs;
  const ok = job.lastRun?.ok !== false;
  if (!hasRun) return <span className="inline-block w-2 h-2 rounded-full bg-white/20 flex-shrink-0" title="Never run" />;
  if (ok) return <span className="inline-block w-2 h-2 rounded-full bg-green-400 flex-shrink-0" title="Last run OK" />;
  return <span className="inline-block w-2 h-2 rounded-full bg-red-400 flex-shrink-0" title="Last run failed" />;
}

function ModelBadge({ payload }: { payload: CronJob["payload"] }) {
  const model = extractModel(payload);
  const colors: Record<string, string> = {
    Opus: "bg-orange-500/15 text-orange-300 border-orange-500/20",
    Sonnet: "bg-blue-500/15 text-blue-300 border-blue-500/20",
    Haiku: "bg-purple-500/15 text-purple-300 border-purple-500/20",
    Flash: "bg-green-500/15 text-green-300 border-green-500/20",
  };
  const cls = colors[model] || "bg-white/5 text-white/40 border-white/10";
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border ${cls}`}>
      <Sparkles className="h-2.5 w-2.5" />{model}
    </span>
  );
}

function LastRunInfo({ job }: { job: CronJob }) {
  const hasRun = !!job.lastRun?.startedAtMs;
  if (!hasRun) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-white/30">
      <StatusDot job={job} />
      {timeAgo(job.lastRun!.startedAtMs!)}
    </span>
  );
}

function ExpandedDetails({ job, onEdit, onRun, onToggleEnabled, onDelete }: { job: CronJob; onEdit: (job: CronJob) => void; onRun: (job: CronJob) => void; onToggleEnabled: (job: CronJob) => void; onDelete: (job: CronJob) => void }) {
  const prompt = job.payload.message || job.payload.text;
  const [running, setRunning] = useState(false);
  const [showManageMenu, setShowManageMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="px-5 pb-4 pt-2 space-y-3">
      {prompt && (
        <div className="text-[13px] text-white/50 leading-relaxed whitespace-pre-wrap">
          {truncateMessage(prompt, 500)}
        </div>
      )}
      {job.lastRun?.error && (
        <div className="text-[13px] text-red-400/80">Error: {job.lastRun.error}</div>
      )}
      <div className="flex items-center gap-2 pt-1">
        <button
          disabled={running}
          onClick={(e) => { e.stopPropagation(); setRunning(true); onRun(job); }}
          className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-300 text-[12px] hover:bg-orange-500/20 transition-all disabled:opacity-50"
        >
          {running ? "Running…" : "Run Now"}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(job); }}
          className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-[12px] hover:bg-white/10 transition-all"
        >
          Edit
        </button>
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowManageMenu(!showManageMenu); setConfirmDelete(false); }}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-[12px] hover:bg-white/10 transition-all"
          >
            {job.enabled ? "Pause" : "Enable"} / Delete
          </button>
          {showManageMenu && (
            <div className="absolute left-0 bottom-full mb-1 w-56 rounded-xl bg-[#1a1614] border border-white/10 shadow-2xl shadow-black/40 z-50 overflow-hidden" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => { onToggleEnabled(job); setShowManageMenu(false); }}
                className="w-full text-left px-4 py-3 text-[13px] text-white/60 hover:bg-white/5 transition-all flex items-center gap-2"
              >
                {job.enabled ? (
                  <><span className="h-2 w-2 rounded-full bg-yellow-400/60" /> Pause this job</>
                ) : (
                  <><span className="h-2 w-2 rounded-full bg-green-400/60" /> Enable this job</>
                )}
              </button>
              <button
                onClick={() => { setConfirmDelete(true); setShowManageMenu(false); }}
                className="w-full text-left px-4 py-3 text-[13px] text-red-400/70 hover:bg-red-500/5 transition-all flex items-center gap-2 border-t border-white/5"
              >
                <span className="h-2 w-2 rounded-full bg-red-400/60" /> Delete this job
              </button>
            </div>
          )}
          <ConfirmDeleteModal
            open={confirmDelete}
            title="Delete job"
            message={<>Delete <strong className="text-white/80">{job.name || job.id.slice(0, 8)}</strong>? This can&apos;t be undone.</>}
            onConfirm={async () => { setDeleting(true); await onDelete(job); setConfirmDelete(false); }}
            onCancel={() => setConfirmDelete(false)}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Edit Modal ── */

/* ── Cron expression <-> human-friendly time helpers ── */

function cronToTimeFields(expr: string): { hour: string; minute: string; days: string[] } | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) return null;
  const [min, hour, , , dow] = parts;
  if (min.includes("*") || min.includes("/") || hour.includes("*") || hour.includes("/")) return null;
  const days = dow === "*" ? ["daily"] : dow.split(",");
  return { hour, minute: min, days };
}

function timeFieldsToCron(hour: string, minute: string, days: string[]): string {
  const dow = days.includes("daily") ? "*" : days.join(",");
  return `${minute} ${hour} * * ${dow}`;
}

const COMMON_TIMEZONES = [
  "America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York",
  "America/Vancouver", "America/Toronto", "Europe/London", "Europe/Paris",
  "Asia/Tokyo", "Asia/Shanghai", "Asia/Singapore", "Australia/Sydney", "UTC",
];

const DAY_OPTIONS = [
  { value: "daily", label: "Every day" },
  { value: "1", label: "Mon" }, { value: "2", label: "Tue" }, { value: "3", label: "Wed" },
  { value: "4", label: "Thu" }, { value: "5", label: "Fri" }, { value: "6", label: "Sat" }, { value: "0", label: "Sun" },
];

function EditModal({ job, onClose, onSave, availableModels }: { job: CronJob; onClose: () => void; onSave: (jobId: string, patch: Record<string, unknown>) => Promise<void>; availableModels: string[] }) {
  const [name, setName] = useState(job.name || "");
  const [scheduleKind, setScheduleKind] = useState(job.schedule.kind);

  // Human-friendly time fields (for cron with fixed time)
  const parsed = job.schedule.expr ? cronToTimeFields(job.schedule.expr) : null;
  const [hour, setHour] = useState(parsed?.hour || "8");
  const [minute, setMinute] = useState(parsed?.minute || "0");
  const [days, setDays] = useState<string[]>(parsed?.days || ["daily"]);
  const [cronExpr, setCronExpr] = useState(job.schedule.expr || "");
  const [useAdvancedCron, setUseAdvancedCron] = useState(!parsed && job.schedule.kind === "cron");
  const [cronTz, setCronTz] = useState(job.schedule.tz || "America/Los_Angeles");
  const [everyMins, setEveryMins] = useState(job.schedule.everyMs ? String(Math.round(job.schedule.everyMs / 60000)) : "30");
  const [atDatetime, setAtDatetime] = useState(job.schedule.at || "");
  const [payloadKind, setPayloadKind] = useState(job.payload.kind);
  const [message, setMessage] = useState(job.payload.message || job.payload.text || "");
  const [model, setModel] = useState(job.payload.model || "");
  const [sessionTarget, setSessionTarget] = useState(job.sessionTarget || "isolated");
  const [enabled, setEnabled] = useState(job.enabled);
  const [saving, setSaving] = useState(false);

  const inputCls = "w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white placeholder-white/20 focus:border-orange-500/30 focus:outline-none transition-colors";
  const labelCls = "block text-[12px] text-white/40 uppercase tracking-wider mb-1.5";
  const selectCls = "w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 pr-10 py-2 text-[13px] text-white focus:border-orange-500/30 focus:outline-none transition-colors bg-[length:16px] bg-[right_12px_center] bg-no-repeat bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.3)%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] appearance-none";
  const subLabelCls = "block text-[11px] text-white/30 mb-1";

  function toggleDay(day: string) {
    if (day === "daily") {
      setDays(["daily"]);
    } else {
      const newDays = days.filter(d => d !== "daily");
      if (newDays.includes(day)) {
        const filtered = newDays.filter(d => d !== day);
        setDays(filtered.length === 0 ? ["daily"] : filtered);
      } else {
        setDays([...newDays, day]);
      }
    }
  }

  // Build human-readable preview
  const schedulePreview = (() => {
    if (scheduleKind === "cron") {
      if (useAdvancedCron) return cronExpr;
      const h = parseInt(hour);
      const m = parseInt(minute);
      const time = formatClockTime(isNaN(h) ? 0 : h, isNaN(m) ? 0 : m);
      const tz = tzAbbrev(cronTz);
      if (days.includes("daily")) return `Daily at ${time} ${tz}`;
      const dayLabels = days.map(d => DAY_OPTIONS.find(o => o.value === d)?.label || d);
      return `${dayLabels.join(", ")} at ${time} ${tz}`;
    }
    if (scheduleKind === "every") return `Every ${everyMins} minutes`;
    if (scheduleKind === "at") return atDatetime ? `Once at ${new Date(atDatetime).toLocaleString()}` : "Pick a date/time";
    return "";
  })();

  async function handleSave() {
    setSaving(true);
    try {
      const isNewJob = job.id === "";
      
      // Build schedule
      const newSchedule: Record<string, unknown> = { kind: scheduleKind };
      if (scheduleKind === "cron") {
        newSchedule.expr = useAdvancedCron ? cronExpr : timeFieldsToCron(hour, minute, days);
        if (cronTz) newSchedule.tz = cronTz;
      } else if (scheduleKind === "every") {
        newSchedule.everyMs = parseInt(everyMins) * 60000;
      } else if (scheduleKind === "at") {
        newSchedule.at = atDatetime;
      }

      // Build payload
      const newPayload: Record<string, unknown> = { kind: payloadKind };
      if (payloadKind === "agentTurn") { 
        newPayload.message = message; 
        if (model) newPayload.model = model; 
      } else { 
        newPayload.text = message; 
      }

      if (isNewJob) {
        // Create new job - send complete job object
        const newJob: Record<string, unknown> = {
          name: name || undefined,
          enabled,
          sessionTarget,
          schedule: newSchedule,
          payload: newPayload,
        };
        await onSave("", newJob);
      } else {
        // Update existing job - send only changed fields
        const patch: Record<string, unknown> = {};
        if (name !== (job.name || "")) patch.name = name;
        if (enabled !== job.enabled) patch.enabled = enabled;
        if (sessionTarget !== (job.sessionTarget || "isolated")) patch.sessionTarget = sessionTarget;

        const origSched = job.schedule;
        const origExpr = origSched.expr || "";
        const newExpr = scheduleKind === "cron" ? (useAdvancedCron ? cronExpr : timeFieldsToCron(hour, minute, days)) : "";
        if (scheduleKind !== origSched.kind || newExpr !== origExpr || cronTz !== (origSched.tz || "") || everyMins !== (origSched.everyMs ? String(Math.round(origSched.everyMs / 60000)) : "") || atDatetime !== (origSched.at || "")) {
          patch.schedule = newSchedule;
        }

        if (payloadKind !== job.payload.kind || message !== (job.payload.message || job.payload.text || "") || model !== (job.payload.model || "")) {
          patch.payload = newPayload;
        }

        if (Object.keys(patch).length > 0) {
          await onSave(job.id, patch);
        }
      }
      onClose();
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[520px] mx-4 bg-[#1a1614] rounded-xl border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b border-white/5">
          <h2 className="text-[15px] font-semibold text-white">{job.id === "" ? "Create Job" : "Edit Job"}</h2>
        </div>
        <div className="px-6 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Name */}
          <div>
            <label className={labelCls}>Job Name</label>
            <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Morning Brief" />
          </div>

          {/* Schedule */}
          <div>
            <label className={labelCls}>Schedule</label>
            <div className="space-y-3">
              {/* Schedule type */}
              <div>
                <span className={subLabelCls}>How often should this run?</span>
                <div className="flex gap-2">
                  {[
                    { value: "cron", label: "Specific time", desc: "Daily/weekly at a set time" },
                    { value: "every", label: "Interval", desc: "Every X minutes" },
                    { value: "at", label: "One-time", desc: "Run once at a specific date" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setScheduleKind(opt.value)}
                      className={`flex-1 p-2.5 rounded-lg border text-left transition-all ${
                        scheduleKind === opt.value
                          ? "border-orange-500/30 bg-orange-500/10"
                          : "border-white/[0.08] bg-white/[0.02] hover:border-white/15"
                      }`}
                    >
                      <span className={`block text-[13px] font-medium ${scheduleKind === opt.value ? "text-orange-300" : "text-white/60"}`}>{opt.label}</span>
                      <span className="block text-[10px] text-white/25 mt-0.5">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cron: time picker or advanced */}
              {scheduleKind === "cron" && !useAdvancedCron && (
                <div className="space-y-3">
                  <div>
                    <span className={subLabelCls}>Time</span>
                    <div className="flex items-center gap-2">
                      <select className={`${selectCls} w-24`} value={hour} onChange={e => setHour(e.target.value)}>
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={String(i)}>
                            {i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`}
                          </option>
                        ))}
                      </select>
                      <span className="text-white/30">:</span>
                      <select className={`${selectCls} w-20`} value={minute} onChange={e => setMinute(e.target.value)}>
                        {["0", "15", "30", "45"].map(m => (
                          <option key={m} value={m}>{m.padStart(2, "0")}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <span className={subLabelCls}>Days</span>
                    <div className="flex flex-wrap gap-1.5">
                      {DAY_OPTIONS.map(d => (
                        <button
                          key={d.value}
                          onClick={() => toggleDay(d.value)}
                          className={`px-2.5 py-1 rounded-md text-[12px] transition-all border ${
                            days.includes(d.value)
                              ? "bg-orange-500/15 text-orange-300 border-orange-500/20"
                              : "text-white/30 border-white/[0.08] hover:border-white/15"
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className={subLabelCls}>Timezone</span>
                    <select className={selectCls} value={cronTz} onChange={e => setCronTz(e.target.value)}>
                      {COMMON_TIMEZONES.map(tz => (
                        <option key={tz} value={tz}>{tz.replace("America/", "").replace("_", " ")} ({tzAbbrev(tz)})</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={() => setUseAdvancedCron(true)} className="text-[11px] text-white/20 hover:text-white/40 transition-colors">
                    Switch to advanced cron expression →
                  </button>
                </div>
              )}

              {scheduleKind === "cron" && useAdvancedCron && (
                <div className="space-y-2">
                  <div>
                    <span className={subLabelCls}>Cron Expression</span>
                    <input className={inputCls} value={cronExpr} onChange={e => setCronExpr(e.target.value)} placeholder="30 8 * * *" />
                    <p className="text-[10px] text-white/20 mt-1">Format: minute hour day-of-month month day-of-week</p>
                  </div>
                  <div>
                    <span className={subLabelCls}>Timezone</span>
                    <select className={selectCls} value={cronTz} onChange={e => setCronTz(e.target.value)}>
                      {COMMON_TIMEZONES.map(tz => (
                        <option key={tz} value={tz}>{tz.replace("America/", "").replace("_", " ")} ({tzAbbrev(tz)})</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={() => setUseAdvancedCron(false)} className="text-[11px] text-white/20 hover:text-white/40 transition-colors">
                    ← Switch to simple time picker
                  </button>
                </div>
              )}

              {scheduleKind === "every" && (
                <div>
                  <span className={subLabelCls}>Run every</span>
                  <div className="flex items-center gap-2">
                    <input className={`${inputCls} w-24`} type="number" min="1" value={everyMins} onChange={e => setEveryMins(e.target.value)} />
                    <span className="text-[13px] text-white/40">minutes</span>
                  </div>
                </div>
              )}

              {scheduleKind === "at" && (
                <div>
                  <span className={subLabelCls}>Run at</span>
                  <input className={inputCls} type="datetime-local" value={atDatetime} onChange={e => setAtDatetime(e.target.value)} />
                </div>
              )}

              {/* Schedule preview */}
              <div className="px-3.5 py-2.5 rounded-lg bg-orange-500/5 border border-orange-500/10">
                <span className="text-[12px] text-white/30">Runs: </span>
                <span className="text-[14px] text-orange-300 font-medium">{schedulePreview}</span>
              </div>
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className={labelCls}>Prompt</label>
            <span className={subLabelCls}>What should the agent do when this job runs?</span>
            <textarea className={`${inputCls} min-h-[120px] resize-y`} value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe the task..." />
          </div>

          {/* Model + execution mode (side by side) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Model</label>
              <span className={subLabelCls}>Which AI model to use</span>
              <select className={selectCls} value={model} onChange={e => setModel(e.target.value)}>
                <option value="">Default</option>
                {availableModels.map(m => (
                  <option key={m} value={m}>{m.replace(/^.*\//, "")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Execution</label>
              <span className={subLabelCls}>How the job runs</span>
              <select className={selectCls} value={sessionTarget} onChange={e => setSessionTarget(e.target.value)}>
                <option value="isolated">Background (isolated)</option>
                <option value="main">Main session</option>
              </select>
            </div>
          </div>

          {sessionTarget === "main" && payloadKind !== "systemEvent" && (
            <p className="text-[11px] text-amber-400/60">Note: Main session jobs use system events, not agent turns.</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[13px] text-white/40 hover:bg-white/5 transition-all">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg text-[13px] bg-orange-500 text-white font-medium hover:bg-orange-600 transition-all disabled:opacity-50">
            {saving ? (job.id === "" ? "Creating…" : "Saving…") : (job.id === "" ? "Create Job" : "Save Changes")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Time Slot Card (for today's schedule) ── */

function TimeSlotCard({ time, job, isExpanded, onToggle, noTimeToday, onEdit, onRun, onToggleEnabled, onDelete }: { time: Date; job: CronJob; isExpanded: boolean; onToggle: () => void; noTimeToday?: boolean; onEdit: (job: CronJob) => void; onRun: (job: CronJob) => void; onToggleEnabled: (job: CronJob) => void; onDelete: (job: CronJob) => void }) {
  const human = parseCronToHuman(job.schedule);
  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
          isExpanded ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
        } ${!job.enabled ? "opacity-40" : ""}`}
      >
        {/* Schedule */}
        <span className="w-48 text-[13px] text-orange-300/70 flex-shrink-0 truncate">
          {noTimeToday ? human : human}
        </span>

        <span className="text-[14px] text-white/80 font-medium truncate flex-1">
          {job.name || job.id.slice(0, 8)}
          {!job.enabled && <span className="ml-2 text-[10px] text-white/25 font-normal uppercase tracking-wide">paused</span>}
        </span>

        <LastRunInfo job={job} />
        <ProjectBadge job={job} />
        <ModelBadge payload={job.payload} />

        <ChevronDown className={`h-3 w-3 text-white/15 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </button>
      {isExpanded && <ExpandedDetails job={job} onEdit={onEdit} onRun={onRun} onToggleEnabled={onToggleEnabled} onDelete={onDelete} />}
    </div>
  );
}

/* ── Recurring Job Row (for weekly/other section) ── */

function RecurringRow({ job, isExpanded, onToggle, onEdit, onRun, onToggleEnabled, onDelete }: { job: CronJob; isExpanded: boolean; onToggle: () => void; onEdit: (job: CronJob) => void; onRun: (job: CronJob) => void; onToggleEnabled: (job: CronJob) => void; onDelete: (job: CronJob) => void }) {
  const human = parseCronToHuman(job.schedule);
  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
          isExpanded ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
        } ${!job.enabled ? "opacity-40" : ""}`}
      >
        <span className="w-48 text-[13px] text-orange-300/70 flex-shrink-0 truncate">{human}</span>

        <span className="text-[14px] text-white/80 font-medium truncate flex-1">
          {job.name || job.id.slice(0, 8)}
          {!job.enabled && <span className="ml-2 text-[10px] text-white/25 font-normal uppercase tracking-wide">paused</span>}
        </span>

        <LastRunInfo job={job} />
        <ProjectBadge job={job} />
        <ModelBadge payload={job.payload} />

        {job.enabled && job.nextRun && (
          <span className="text-[10px] text-white/25 w-14 text-right flex-shrink-0">in {timeUntil(job.nextRun)}</span>
        )}

        <ChevronDown className={`h-3 w-3 text-white/15 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </button>
      {isExpanded && <ExpandedDetails job={job} onEdit={onEdit} onRun={onRun} onToggleEnabled={onToggleEnabled} onDelete={onDelete} />}
    </div>
  );
}

/* ── Main Page ── */

export default function CronPage() {
  const { rpc, status: connStatus } = useGateway();
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [hideDisabled, setHideDisabled] = useState(true);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);
  const [models, setModels] = useState<string[]>([]);

  // Fetch available models
  useEffect(() => {
    if (connStatus !== "connected") return;
    rpc.listModels().then((data) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = data as any;
      const modelList: string[] = (d?.models || d || [])
        .map((m: { id?: string; model?: string }) => m.id || m.model || "")
        .filter(Boolean);
      setModels(modelList);
    }).catch(() => {});
  }, [connStatus, rpc]);

  const fetchCronJobs = async (): Promise<CronJob[]> => {
    const data = await rpc.listCronJobs({ includeDisabled: true });
    const d = data as unknown as { jobs: CronJob[] };
    const jobList = d.jobs || [];
    for (const job of jobList) {
      if (!job.lastRun?.startedAtMs && job.state?.lastRunAtMs) {
        job.lastRun = { startedAtMs: job.state.lastRunAtMs, ok: job.state.lastStatus === "ok", error: job.state.lastError };
        if (job.state.lastDurationMs && job.state.lastRunAtMs) job.lastRun.finishedAtMs = job.state.lastRunAtMs + job.state.lastDurationMs;
      }
      if (!job.nextRun && job.state?.nextRunAtMs) job.nextRun = new Date(job.state.nextRunAtMs).toISOString();
    }
    return jobList;
  };

  const { data: jobsData, loading, refresh: refreshCache, stale } = useCachedRpc<CronJob[]>("cron-jobs", fetchCronJobs, 30_000);
  const jobs = jobsData ?? [];

  const refreshJobs = useCallback(() => {
    invalidateCache("cron-jobs");
    refreshCache();
  }, [refreshCache]);

  const handleRun = async (job: CronJob) => {
    try { await rpc.runCronJob(job.id); } catch {} finally { refreshJobs(); }
  };
  const handleToggleEnabled = async (job: CronJob) => {
    try { await rpc.updateCronJob(job.id, { enabled: !job.enabled }); } catch {} finally { refreshJobs(); }
  };
  const handleDelete = async (job: CronJob) => {
    try { await rpc.removeCronJob(job.id); } catch {} finally { refreshJobs(); }
  };
  const handleSaveEdit = async (jobId: string, patch: Record<string, unknown>) => {
    if (jobId === "") {
      // Create new job
      await rpc.request("cron.add", { job: patch });
    } else {
      // Update existing job
      await rpc.updateCronJob(jobId, patch);
    }
    refreshJobs();
  };

  const activeJobs = jobs.filter(j => j.enabled).length;
  const disabledJobs = jobs.filter(j => !j.enabled).length;
  const nextJob = jobs
    .filter(j => j.enabled && j.nextRun)
    .sort((a, b) => new Date(a.nextRun!).getTime() - new Date(b.nextRun!).getTime())[0];

  // Split jobs into today's schedule vs weekly/recurring
  const { dailyJobs, weeklyJobs } = useMemo(() => {
    const dailyJobs: { job: CronJob; nextTimes: Date[] }[] = [];
    const weeklyJobs: CronJob[] = [];

    const filtered = jobs
      .filter(j => !hideDisabled || j.enabled)
      .filter(j => !projectFilter || inferProject(j).project === projectFilter);
    for (const job of filtered) {
      if (isDailyOrMoreFrequent(job)) {
        const times = getNextRunTimesToday(job);
        // Even if no times left today, it's still a daily job
        dailyJobs.push({ job, nextTimes: times });
      } else {
        weeklyJobs.push(job);
      }
    }

    // Sort by scheduled time of day (chronological order)
    dailyJobs.sort((a, b) => {
      const aMin = getScheduleMinuteOfDay(a.job);
      const bMin = getScheduleMinuteOfDay(b.job);
      if (aMin !== bMin) return aMin - bMin;
      return (a.job.name || "").localeCompare(b.job.name || "");
    });
    return { dailyJobs, weeklyJobs };
  }, [jobs, hideDisabled, projectFilter]);

  const availableProjects = useMemo(() => {
    const projects = new Set<string>();
    for (const job of jobs) projects.add(inferProject(job).project);
    return Array.from(projects).sort();
  }, [jobs]);

  const hasActiveFilter = !!projectFilter;

  const toggle = (id: string) => setExpandedJob(prev => prev === id ? null : id);

  if (connStatus !== "connected") {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-white/30">
            {connStatus === "error" ? "Reconnecting…" : "Connecting…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/5 bg-white/[0.01] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <CalendarDays className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Schedule</h1>
              <p className="text-sm text-white/40">Cron jobs & recurring tasks</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 text-green-300">
              <Zap className="h-3.5 w-3.5" /> {activeJobs} active
            </span>
            {disabledJobs > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] text-white/30">
                {disabledJobs} paused
              </span>
            )}
            {nextJob?.nextRun && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-300">
                <Clock className="h-3.5 w-3.5" /> next in {timeUntil(nextJob.nextRun)}
              </span>
            )}
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all border ${
                  hasActiveFilter
                    ? "bg-orange-500/10 border-orange-500/20 text-orange-300"
                    : "bg-white/[0.03] border-white/5 text-white/40 hover:bg-white/[0.06] hover:text-white/60"
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                <span>{projectFilter || "Filter"}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${showFilterMenu ? "rotate-180" : ""}`} />
              </button>

              {showFilterMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-[#1a1614] border border-white/10 shadow-2xl shadow-black/40 z-50 overflow-hidden">
                  <div className="p-3">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Project</p>
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => { setProjectFilter(null); setShowFilterMenu(false); }}
                        className={`text-[11px] px-2 py-0.5 rounded-md transition-all ${
                          !projectFilter ? "bg-orange-500/20 text-orange-300" : "text-white/30 hover:bg-white/5"
                        }`}
                      >
                        All
                      </button>
                      {availableProjects.map(p => (
                        <button
                          key={p}
                          onClick={() => { setProjectFilter(projectFilter === p ? null : p); setShowFilterMenu(false); }}
                          className={`text-[11px] px-2 py-0.5 rounded-md transition-all ${
                            projectFilter === p ? "bg-orange-500/20 text-orange-300" : "text-white/30 hover:bg-white/5"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {disabledJobs > 0 && (
              <label className="flex items-center gap-1.5 px-2.5 py-1 cursor-pointer text-white/40 hover:text-white/60 transition-colors">
                <input
                  type="checkbox"
                  checked={hideDisabled}
                  onChange={(e) => setHideDisabled(e.target.checked)}
                  className="accent-orange-500 w-3.5 h-3.5"
                />
                <span>Hide paused</span>
              </label>
            )}
            <button
              onClick={() => {
                const newJobTemplate: CronJob = {
                  id: "",
                  name: "",
                  enabled: true,
                  schedule: { kind: "cron", expr: "30 8 * * *", tz: "America/Los_Angeles" },
                  sessionTarget: "isolated",
                  payload: { kind: "agentTurn", message: "" },
                };
                setEditingJob(newJobTemplate);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-[13px] font-medium hover:bg-orange-600 transition-all ml-auto"
            >
              + New Job
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && !jobsData ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 text-orange-400 animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-white/30">No cron jobs configured</p>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-8">
            {/* ── Daily Schedule ── */}
            {dailyJobs.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Timer className="h-4 w-4 text-orange-400/60" />
                  <h2 className="text-[13px] font-semibold text-white/50 uppercase tracking-wider">Daily Schedule</h2>
                  <span className="text-[11px] text-white/20 ml-1">
                    {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                  </span>
                </div>

                <div>
                  <div className="space-y-0.5">
                    {dailyJobs.map(({ job, nextTimes }) => {
                      // Show with next run time if available, otherwise use nextRun field
                      const displayTime = nextTimes[0] ?? (job.nextRun ? new Date(job.nextRun) : null);
                      return (
                        <TimeSlotCard
                          key={job.id}
                          time={displayTime ?? new Date()}
                          job={job}
                          isExpanded={expandedJob === job.id}
                          onToggle={() => toggle(job.id)}
                          noTimeToday={!displayTime}
                          onEdit={setEditingJob}
                          onRun={handleRun}
                          onToggleEnabled={handleToggleEnabled} onDelete={handleDelete}
                        />
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* ── Weekly & Less Frequent ── */}
            {weeklyJobs.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-orange-400/60" />
                  <h2 className="text-[13px] font-semibold text-white/50 uppercase tracking-wider">Weekly & Recurring</h2>
                </div>

                <div className="space-y-0.5">
                  {weeklyJobs.map(job => (
                    <RecurringRow
                      key={job.id}
                      job={job}
                      isExpanded={expandedJob === job.id}
                      onToggle={() => toggle(job.id)}
                      onEdit={setEditingJob}
                      onRun={handleRun}
                      onToggleEnabled={handleToggleEnabled} onDelete={handleDelete}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {editingJob && (
        <EditModal job={editingJob} onClose={() => setEditingJob(null)} onSave={handleSaveEdit} availableModels={models} />
      )}
    </div>
  );
}
