"use client";

import { useState } from "react";
import {
  Play,
  Pause,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  RefreshCw,
  ChevronRight,
  Sparkles,
  MoreHorizontal
} from "lucide-react";

interface Job {
  name: string;
  schedule: string;
  time: string;
  model: string;
  modelColor: string;
  enabled: boolean;
  lastRun: string;
  status: "success" | "failed" | "disabled";
  nextRun: string;
  description?: string;
  avgDuration?: string;
  avgCost?: string;
}

const jobs: Job[] = [
  {
    name: "Lit.trade Revenue Check", schedule: "0 2 * * *", time: "2:00am PST",
    model: "Sonnet", modelColor: "blue", enabled: true, lastRun: "Today, 2:00am",
    status: "success", nextRun: "23m", description: "Checks 24h volume, fees, and builder revenue from Hyperliquid API.",
    avgDuration: "45s", avgCost: "$0.12"
  },
  {
    name: "Content: Research #1", schedule: "35 3 * * *", time: "3:35am PST",
    model: "Opus", modelColor: "orange", enabled: true, lastRun: "Today, 3:35am",
    status: "success", nextRun: "1h 58m", description: "Deep research on trending AI topics using web search.",
    avgDuration: "8m", avgCost: "$0.65"
  },
  {
    name: "Content: Script #1", schedule: "5 4 * * *", time: "4:05am PST",
    model: "Opus", modelColor: "orange", enabled: true, lastRun: "Today, 4:05am",
    status: "success", nextRun: "2h 28m", description: "Generates video script from research output.",
    avgDuration: "12m", avgCost: "$0.88"
  },
  {
    name: "Morning Brief", schedule: "30 8 * * *", time: "8:30am PST",
    model: "Sonnet", modelColor: "blue", enabled: true, lastRun: "Today, 8:30am",
    status: "success", nextRun: "6h 53m", description: "Daily summary with market overview, calendar, and priority tasks.",
    avgDuration: "2m 05s", avgCost: "$0.24"
  },
  {
    name: "Lit Analysis", schedule: "30 7 * * *", time: "7:30am PST",
    model: "Sonnet", modelColor: "blue", enabled: true, lastRun: "Today, 7:30am",
    status: "success", nextRun: "5h 53m", description: "Detailed Lit.trade metrics analysis with trend detection.",
    avgDuration: "1m 12s", avgCost: "$0.18"
  },
  {
    name: "Agent Blueprints Improvement", schedule: "30 4 * * *", time: "4:30am PST",
    model: "Sonnet", modelColor: "blue", enabled: false, lastRun: "Feb 4, 4:30am",
    status: "disabled", nextRun: "-", description: "Iterates on agent-blueprints.vercel.app with improvements.",
    avgDuration: "15m", avgCost: "$0.35"
  },
];

export default function CronPage() {
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const activeJobs = jobs.filter(j => j.enabled).length;
  const disabledJobs = jobs.filter(j => !j.enabled).length;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/5 bg-white/[0.01] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <RefreshCw className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Cron Jobs</h1>
              <p className="text-sm text-white/40">Scheduled tasks</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 text-green-300">
              <Zap className="h-3.5 w-3.5" /> {activeJobs} active
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] text-white/40">
              <Pause className="h-3.5 w-3.5" /> {disabledJobs} disabled
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> 12 runs today
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500/10 text-yellow-300">
              <Clock className="h-3.5 w-3.5" /> 23m next
            </span>
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex-shrink-0 px-6 py-1.5 flex items-center gap-3 text-[10px] text-white/20 uppercase tracking-wider border-b border-white/5">
        <span className="w-7" />
        <span className="flex-1">Job</span>
        <span className="w-20">Model</span>
        <span className="w-28 text-right">Last Run</span>
        <span className="w-16 text-right">Next</span>
        <span className="w-16 text-right">Status</span>
        <span className="w-4" />
      </div>

      {/* Jobs */}
      <div className="flex-1 overflow-y-auto">
        {jobs.map((job, i) => {
          const isExpanded = expandedJob === job.name;
          return (
            <div key={i}>
              <button
                onClick={() => setExpandedJob(isExpanded ? null : job.name)}
                className={`w-full text-left px-6 py-2.5 flex items-center gap-3 text-xs transition-all ${
                  isExpanded ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                } ${!job.enabled ? "opacity-50" : ""}`}
              >
                {/* Play/Pause icon */}
                <div className={`p-1 rounded flex-shrink-0 ${
                  job.enabled ? "text-green-400" : "text-white/20"
                }`}>
                  {job.enabled ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                </div>

                {/* Name + schedule */}
                <div className="flex-1 min-w-0">
                  <span className="text-white/80 font-medium">{job.name}</span>
                  <span className="text-white/20 ml-2 font-mono text-[10px]">{job.schedule}</span>
                  <span className="text-white/15 ml-2 text-[10px]">{job.time}</span>
                </div>

                {/* Model badge */}
                <span className={`w-20 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border ${
                  job.modelColor === "orange"
                    ? "bg-orange-500/10 text-orange-300 border-orange-500/20"
                    : "bg-blue-500/10 text-blue-300 border-blue-500/20"
                }`}>
                  <Sparkles className="h-2.5 w-2.5" />
                  {job.model}
                </span>

                {/* Last run */}
                <span className="w-28 text-right text-white/30">{job.lastRun}</span>

                {/* Next run */}
                <span className={`w-16 text-right font-medium ${job.enabled ? "text-white/50" : "text-white/15"}`}>
                  {job.nextRun}
                </span>

                {/* Status */}
                <span className="w-16 flex items-center justify-end gap-1">
                  {job.status === "success" && <><CheckCircle2 className="h-3 w-3 text-green-400" /><span className="text-green-400/70">ok</span></>}
                  {job.status === "failed" && <><XCircle className="h-3 w-3 text-red-400" /><span className="text-red-400/70">fail</span></>}
                  {job.status === "disabled" && <span className="text-white/20">off</span>}
                </span>

                <ChevronRight className={`h-3 w-3 text-white/15 flex-shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-6 pb-3">
                  <div className="ml-10 p-3 rounded-xl bg-white/[0.025] border border-white/5">
                    {job.description && (
                      <p className="text-xs text-white/50 mb-3">{job.description}</p>
                    )}
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-white/[0.03]">
                        <p className="text-[10px] text-white/25">Schedule</p>
                        <p className="text-xs text-white/60 font-mono">{job.schedule}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.03]">
                        <p className="text-[10px] text-white/25">Avg Duration</p>
                        <p className="text-xs text-white/60">{job.avgDuration || "—"}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.03]">
                        <p className="text-[10px] text-white/25">Avg Cost</p>
                        <p className="text-xs text-white/60">{job.avgCost || "—"}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.03]">
                        <p className="text-[10px] text-white/25">Model</p>
                        <p className="text-xs text-white/60">{job.model}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-300 text-[10px] hover:bg-orange-500/20 transition-all">
                        Run Now
                      </button>
                      <button className="px-2.5 py-1 rounded-lg bg-white/5 text-white/40 text-[10px] hover:bg-white/10 transition-all">
                        {job.enabled ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
