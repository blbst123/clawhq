"use client";

import { useState } from "react";
import { selectCls } from "@/lib/utils";
import {
  type CronJob,
  formatClockTime,
  tzAbbrev,
  cronToTimeFields,
  timeFieldsToCron,
  COMMON_TIMEZONES,
  DAY_OPTIONS,
} from "@/lib/cron-utils";

interface EditModalProps {
  job: CronJob;
  onClose: () => void;
  onSave: (jobId: string, patch: Record<string, unknown>) => Promise<void>;
  availableModels: string[];
}

export function CronEditModal({ job, onClose, onSave, availableModels }: EditModalProps) {
  const [name, setName] = useState(job.name || "");
  const [scheduleKind, setScheduleKind] = useState(job.schedule.kind);

  const parsed = job.schedule.expr ? cronToTimeFields(job.schedule.expr) : null;
  const [hour, setHour] = useState(parsed?.hour || "8");
  const [minute, setMinute] = useState(parsed?.minute || "0");
  const [days, setDays] = useState<string[]>(parsed?.days || ["daily"]);
  const [cronExpr, setCronExpr] = useState(job.schedule.expr || "");
  const [useAdvancedCron, setUseAdvancedCron] = useState(!parsed && job.schedule.kind === "cron");
  const [cronTz, setCronTz] = useState(job.schedule.tz || "America/Los_Angeles");
  const [everyMins, setEveryMins] = useState(job.schedule.everyMs ? String(Math.round(job.schedule.everyMs / 60000)) : "30");
  const [atDatetime, setAtDatetime] = useState(job.schedule.at || "");
  const [payloadKind] = useState(job.payload.kind);
  const [message, setMessage] = useState(job.payload.message || job.payload.text || "");
  const [model, setModel] = useState(job.payload.model || "");
  const [sessionTarget, setSessionTarget] = useState(job.sessionTarget || "isolated");
  const [enabled] = useState(job.enabled);
  const [saving, setSaving] = useState(false);

  const inputCls = "w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white placeholder-white/20 focus:border-orange-500/30 focus:outline-none transition-colors";
  const labelCls = "block text-[12px] text-white/40 uppercase tracking-wider mb-1.5";
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

      const newSchedule: Record<string, unknown> = { kind: scheduleKind };
      if (scheduleKind === "cron") {
        newSchedule.expr = useAdvancedCron ? cronExpr : timeFieldsToCron(hour, minute, days);
        if (cronTz) newSchedule.tz = cronTz;
      } else if (scheduleKind === "every") {
        newSchedule.everyMs = parseInt(everyMins) * 60000;
      } else if (scheduleKind === "at") {
        newSchedule.at = atDatetime;
      }

      const newPayload: Record<string, unknown> = { kind: payloadKind };
      if (payloadKind === "agentTurn") {
        newPayload.message = message;
        if (model) newPayload.model = model;
      } else {
        newPayload.text = message;
      }

      if (isNewJob) {
        await onSave("", { name: name || undefined, enabled, sessionTarget, schedule: newSchedule, payload: newPayload });
      } else {
        const patch: Record<string, unknown> = {};
        if (name !== (job.name || "")) patch.name = name;
        if (enabled !== job.enabled) patch.enabled = enabled;
        if (sessionTarget !== (job.sessionTarget || "isolated")) patch.sessionTarget = sessionTarget;

        const origExpr = job.schedule.expr || "";
        const newExpr = scheduleKind === "cron" ? (useAdvancedCron ? cronExpr : timeFieldsToCron(hour, minute, days)) : "";
        if (scheduleKind !== job.schedule.kind || newExpr !== origExpr || cronTz !== (job.schedule.tz || "") || everyMins !== (job.schedule.everyMs ? String(Math.round(job.schedule.everyMs / 60000)) : "") || atDatetime !== (job.schedule.at || "")) {
          patch.schedule = newSchedule;
        }
        if (payloadKind !== job.payload.kind || message !== (job.payload.message || job.payload.text || "") || model !== (job.payload.model || "")) {
          patch.payload = newPayload;
        }
        if (Object.keys(patch).length > 0) await onSave(job.id, patch);
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
              <div>
                <span className={subLabelCls}>How often should this run?</span>
                <div className="flex gap-2">
                  {[
                    { value: "cron", label: "Specific time", desc: "Daily/weekly at a set time" },
                    { value: "every", label: "Interval", desc: "Every X minutes" },
                    { value: "at", label: "One-time", desc: "Run once at a specific date" },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => setScheduleKind(opt.value)}
                      className={`flex-1 p-2.5 rounded-lg border text-left transition-all ${scheduleKind === opt.value ? "border-orange-500/30 bg-orange-500/10" : "border-white/[0.08] bg-white/[0.02] hover:border-white/15"}`}>
                      <span className={`block text-[13px] font-medium ${scheduleKind === opt.value ? "text-orange-300" : "text-white/60"}`}>{opt.label}</span>
                      <span className="block text-[10px] text-white/25 mt-0.5">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {scheduleKind === "cron" && !useAdvancedCron && (
                <div className="space-y-3">
                  <div>
                    <span className={subLabelCls}>Time</span>
                    <div className="flex items-center gap-2">
                      <select className={`${selectCls} w-24`} value={hour} onChange={e => setHour(e.target.value)}>
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={String(i)}>{i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`}</option>
                        ))}
                      </select>
                      <span className="text-white/30">:</span>
                      <select className={`${selectCls} w-20`} value={minute} onChange={e => setMinute(e.target.value)}>
                        {["0", "15", "30", "45"].map(m => <option key={m} value={m}>{m.padStart(2, "0")}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <span className={subLabelCls}>Days</span>
                    <div className="flex flex-wrap gap-1.5">
                      {DAY_OPTIONS.map(d => (
                        <button key={d.value} onClick={() => toggleDay(d.value)}
                          className={`px-2.5 py-1 rounded-md text-[12px] transition-all border ${days.includes(d.value) ? "bg-orange-500/15 text-orange-300 border-orange-500/20" : "text-white/30 border-white/[0.08] hover:border-white/15"}`}>
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className={subLabelCls}>Timezone</span>
                    <select className={selectCls} value={cronTz} onChange={e => setCronTz(e.target.value)}>
                      {COMMON_TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace("America/", "").replace("_", " ")} ({tzAbbrev(tz)})</option>)}
                    </select>
                  </div>
                  <button onClick={() => setUseAdvancedCron(true)} className="text-[11px] text-white/20 hover:text-white/40 transition-colors">Switch to advanced cron expression →</button>
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
                      {COMMON_TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace("America/", "").replace("_", " ")} ({tzAbbrev(tz)})</option>)}
                    </select>
                  </div>
                  <button onClick={() => setUseAdvancedCron(false)} className="text-[11px] text-white/20 hover:text-white/40 transition-colors">← Switch to simple time picker</button>
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

          {/* Model + execution */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Model</label>
              <span className={subLabelCls}>Which AI model to use</span>
              <select className={selectCls} value={model} onChange={e => setModel(e.target.value)}>
                <option value="">Default</option>
                {availableModels.map(m => <option key={m} value={m}>{m.replace(/^.*\//, "")}</option>)}
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
