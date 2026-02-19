"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Clock,
  Zap,
  ChevronDown,
  Sparkles,
  Loader2,
  CalendarDays,
  Timer,
  Calendar,
  Filter,
} from "lucide-react";
import { useGateway } from "@/lib/gateway-context";
import { ConnectGate } from "@/components/ui/connect-gate";
import { useCachedRpc, invalidateCache } from "@/lib/use-cached-rpc";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";
import { useToast } from "@/components/ui/toast";
import { timeAgo } from "@/lib/task-utils";
import { CronEditModal } from "@/components/ui/cron-edit-modal";
import {
  type CronJob,
  parseCronToHuman,
  extractModel,
  truncateMessage,
  inferProject,
  projectColorMap,
  isDailyOrMoreFrequent,
  getNextRunTimesToday,
  getScheduleMinuteOfDay,
  timeUntil,
} from "@/lib/cron-utils";

// ─── Small display components ───

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

function ProjectBadge({ job }: { job: CronJob }) {
  const { project, color } = inferProject(job);
  const cls = projectColorMap[color] || projectColorMap.gray;
  return <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-md border ${cls}`}>{project}</span>;
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

// ─── Expanded details ───

function ExpandedDetails({ job, onEdit, onRun, onToggleEnabled, onDelete }: {
  job: CronJob;
  onEdit: (job: CronJob) => void;
  onRun: (job: CronJob) => void;
  onToggleEnabled: (job: CronJob) => void;
  onDelete: (job: CronJob) => void;
}) {
  const prompt = job.payload.message || job.payload.text;
  const [running, setRunning] = useState(false);
  const [showManageMenu, setShowManageMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
        <button disabled={running} onClick={(e) => { e.stopPropagation(); setRunning(true); onRun(job); }}
          className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-300 text-[12px] hover:bg-orange-500/20 transition-all disabled:opacity-50">
          {running ? "Running…" : "Run Now"}
        </button>
        <button onClick={(e) => { e.stopPropagation(); onEdit(job); }}
          className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-[12px] hover:bg-white/10 transition-all">
          Edit
        </button>
        <div className="relative">
          <button onClick={(e) => { e.stopPropagation(); setShowManageMenu(!showManageMenu); setConfirmDelete(false); }}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-[12px] hover:bg-white/10 transition-all">
            {job.enabled ? "Pause" : "Enable"} / Delete
          </button>
          {showManageMenu && (
            <div className="absolute left-0 bottom-full mb-1 w-56 rounded-xl bg-[#1a1614] border border-white/10 shadow-2xl shadow-black/40 z-50 overflow-hidden" onClick={e => e.stopPropagation()}>
              <button onClick={() => { onToggleEnabled(job); setShowManageMenu(false); }}
                className="w-full text-left px-4 py-3 text-[13px] text-white/60 hover:bg-white/5 transition-all flex items-center gap-2">
                {job.enabled ? <><span className="h-2 w-2 rounded-full bg-yellow-400/60" /> Pause this job</> : <><span className="h-2 w-2 rounded-full bg-green-400/60" /> Enable this job</>}
              </button>
              <button onClick={() => { setConfirmDelete(true); setShowManageMenu(false); }}
                className="w-full text-left px-4 py-3 text-[13px] text-red-400/70 hover:bg-red-500/5 transition-all flex items-center gap-2 border-t border-white/5">
                <span className="h-2 w-2 rounded-full bg-red-400/60" /> Delete this job
              </button>
            </div>
          )}
          <ConfirmDeleteModal open={confirmDelete} title="Delete job"
            message={<>Delete <strong className="text-white/80">{job.name || job.id.slice(0, 8)}</strong>? This can&apos;t be undone.</>}
            onConfirm={async () => { await onDelete(job); setConfirmDelete(false); }}
            onCancel={() => setConfirmDelete(false)} />
        </div>
      </div>
    </div>
  );
}

// ─── Job row components ───

function TimeSlotCard({ job, isExpanded, onToggle, onEdit, onRun, onToggleEnabled, onDelete }: {
  job: CronJob; isExpanded: boolean; onToggle: () => void;
  onEdit: (job: CronJob) => void; onRun: (job: CronJob) => void; onToggleEnabled: (job: CronJob) => void; onDelete: (job: CronJob) => void;
}) {
  const human = parseCronToHuman(job.schedule);
  return (
    <div>
      <button onClick={onToggle}
        className={`w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${isExpanded ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"} ${!job.enabled ? "opacity-40" : ""}`}>
        <span className="w-48 text-[13px] text-orange-300/70 flex-shrink-0 truncate">{human}</span>
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

function RecurringRow({ job, isExpanded, onToggle, onEdit, onRun, onToggleEnabled, onDelete }: {
  job: CronJob; isExpanded: boolean; onToggle: () => void;
  onEdit: (job: CronJob) => void; onRun: (job: CronJob) => void; onToggleEnabled: (job: CronJob) => void; onDelete: (job: CronJob) => void;
}) {
  const human = parseCronToHuman(job.schedule);
  return (
    <div>
      <button onClick={onToggle}
        className={`w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${isExpanded ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"} ${!job.enabled ? "opacity-40" : ""}`}>
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

// ─── Main Page ───

export default function CronPage() {
  const { rpc, status: connStatus } = useGateway();
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [hideDisabled, setHideDisabled] = useState(true);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);
  const [models, setModels] = useState<string[]>([]);

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

  const { data: jobsData, loading, refresh: refreshCache } = useCachedRpc<CronJob[]>("cron-jobs", fetchCronJobs, 30_000);
  const jobs = jobsData ?? [];

  const refreshJobs = useCallback(() => {
    invalidateCache("cron-jobs");
    refreshCache();
  }, [refreshCache]);

  const { toast } = useToast();

  const handleRun = async (job: CronJob) => {
    try { await rpc.runCronJob(job.id); toast("info", `Triggered "${job.name || job.id}"`); } catch { toast("error", "Failed to run job"); } finally { refreshJobs(); }
  };
  const handleToggleEnabled = async (job: CronJob) => {
    const next = !job.enabled;
    try { await rpc.updateCronJob(job.id, { enabled: next }); toast("success", `"${job.name || job.id}" ${next ? "enabled" : "paused"}`); } catch { toast("error", "Failed to update job"); } finally { refreshJobs(); }
  };
  const handleDelete = async (job: CronJob) => {
    try { await rpc.removeCronJob(job.id); toast("delete", `"${job.name || job.id}" deleted`); } catch { toast("error", "Failed to delete job"); } finally { refreshJobs(); }
  };
  const handleSaveEdit = async (jobId: string, patch: Record<string, unknown>) => {
    if (jobId === "") {
      await rpc.request("cron.add", { job: patch });
      toast("success", `Created cron job "${(patch as { name?: string }).name || "Untitled"}"`);
    } else {
      await rpc.updateCronJob(jobId, patch);
      const job = jobs.find(j => j.id === jobId);
      toast("success", `Updated "${job?.name || jobId}"`);
    }
    refreshJobs();
  };

  const activeJobs = jobs.filter(j => j.enabled).length;
  const disabledJobs = jobs.filter(j => !j.enabled).length;
  const nextJob = jobs.filter(j => j.enabled && j.nextRun).sort((a, b) => new Date(a.nextRun!).getTime() - new Date(b.nextRun!).getTime())[0];

  const { dailyJobs, weeklyJobs } = useMemo(() => {
    const dailyJobs: { job: CronJob; nextTimes: Date[] }[] = [];
    const weeklyJobs: CronJob[] = [];
    const filtered = jobs.filter(j => !hideDisabled || j.enabled).filter(j => !projectFilter || inferProject(j).project === projectFilter);
    for (const job of filtered) {
      if (isDailyOrMoreFrequent(job)) {
        dailyJobs.push({ job, nextTimes: getNextRunTimesToday(job) });
      } else {
        weeklyJobs.push(job);
      }
    }
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

  const toggle = (id: string) => setExpandedJob(prev => prev === id ? null : id);

  if (connStatus !== "connected") return <ConnectGate>{null}</ConnectGate>;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/5 bg-white/[0.01] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10"><CalendarDays className="h-6 w-6 text-orange-400" /></div>
            <div>
              <h1 className="text-xl font-bold text-white">Schedule</h1>
              <p className="text-sm text-white/40">Cron jobs & recurring tasks</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 text-green-300"><Zap className="h-3.5 w-3.5" /> {activeJobs} active</span>
            {disabledJobs > 0 && <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] text-white/30">{disabledJobs} paused</span>}
            {nextJob?.nextRun && <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-300"><Clock className="h-3.5 w-3.5" /> next in {timeUntil(nextJob.nextRun)}</span>}
            <div className="relative">
              <button onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all border ${projectFilter ? "bg-orange-500/10 border-orange-500/20 text-orange-300" : "bg-white/[0.03] border-white/5 text-white/40 hover:bg-white/[0.06] hover:text-white/60"}`}>
                <Filter className="h-3.5 w-3.5" /><span>{projectFilter || "Filter"}</span><ChevronDown className={`h-3 w-3 transition-transform ${showFilterMenu ? "rotate-180" : ""}`} />
              </button>
              {showFilterMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-[#1a1614] border border-white/10 shadow-2xl shadow-black/40 z-50 overflow-hidden">
                  <div className="p-3">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Project</p>
                    <div className="flex flex-wrap gap-1">
                      <button onClick={() => { setProjectFilter(null); setShowFilterMenu(false); }}
                        className={`text-[11px] px-2 py-0.5 rounded-md transition-all ${!projectFilter ? "bg-orange-500/20 text-orange-300" : "text-white/30 hover:bg-white/5"}`}>All</button>
                      {availableProjects.map(p => (
                        <button key={p} onClick={() => { setProjectFilter(projectFilter === p ? null : p); setShowFilterMenu(false); }}
                          className={`text-[11px] px-2 py-0.5 rounded-md transition-all ${projectFilter === p ? "bg-orange-500/20 text-orange-300" : "text-white/30 hover:bg-white/5"}`}>{p}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {disabledJobs > 0 && (
              <label className="flex items-center gap-1.5 px-2.5 py-1 cursor-pointer text-white/40 hover:text-white/60 transition-colors">
                <input type="checkbox" checked={hideDisabled} onChange={(e) => setHideDisabled(e.target.checked)} className="accent-orange-500 w-3.5 h-3.5" />
                <span>Hide paused</span>
              </label>
            )}
            <button onClick={() => setEditingJob({ id: "", name: "", enabled: true, schedule: { kind: "cron", expr: "30 8 * * *", tz: "America/Los_Angeles" }, sessionTarget: "isolated", payload: { kind: "agentTurn", message: "" } })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-[13px] font-medium hover:bg-orange-600 transition-all ml-auto">
              + New Job
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && !jobsData ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 text-orange-400 animate-spin" /></div>
        ) : jobs.length === 0 ? (
          <div className="flex items-center justify-center py-16"><p className="text-sm text-white/30">No cron jobs configured</p></div>
        ) : (
          <div className="px-6 py-5 space-y-8">
            {dailyJobs.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Timer className="h-4 w-4 text-orange-400/60" />
                  <h2 className="text-[13px] font-semibold text-white/50 uppercase tracking-wider">Daily Schedule</h2>
                  <span className="text-[11px] text-white/20 ml-1">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</span>
                </div>
                <div className="space-y-0.5">
                  {dailyJobs.map(({ job }) => (
                    <TimeSlotCard key={job.id} job={job} isExpanded={expandedJob === job.id} onToggle={() => toggle(job.id)}
                      onEdit={setEditingJob} onRun={handleRun} onToggleEnabled={handleToggleEnabled} onDelete={handleDelete} />
                  ))}
                </div>
              </section>
            )}
            {weeklyJobs.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-orange-400/60" />
                  <h2 className="text-[13px] font-semibold text-white/50 uppercase tracking-wider">Weekly & Recurring</h2>
                </div>
                <div className="space-y-0.5">
                  {weeklyJobs.map(job => (
                    <RecurringRow key={job.id} job={job} isExpanded={expandedJob === job.id} onToggle={() => toggle(job.id)}
                      onEdit={setEditingJob} onRun={handleRun} onToggleEnabled={handleToggleEnabled} onDelete={handleDelete} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {editingJob && <CronEditModal job={editingJob} onClose={() => setEditingJob(null)} onSave={handleSaveEdit} availableModels={models} />}
    </div>
  );
}
