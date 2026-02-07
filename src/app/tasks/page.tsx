"use client";

import { useState } from "react";
import {
  Clock,
  Zap,
  DollarSign,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  RefreshCw,
  FileText,
  Globe,
  Terminal,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Play,
  Activity
} from "lucide-react";

// ─── Types ───
interface ProjectTask {
  id: string;
  title: string;
  description?: string;
  status: "complete" | "running" | "scheduled" | "failed";
  source: { type: string; label: string };
  time: string;
  duration?: string;
  cost?: number;
  model?: string;
  progress?: number;
}

interface Project {
  id: string;
  name: string;
  color: string;
  dotColor: string;
  tasks: ProjectTask[];
}

const projects: Project[] = [
  {
    id: "littrade",
    name: "Lit.trade",
    color: "purple",
    dotColor: "bg-purple-400",
    tasks: [
      {
        id: "lt1", title: "Lit Analysis", description: "24h volume: $1.2M (+12%), fees: $1.2K",
        status: "complete", source: { type: "cron", label: "Cron" }, time: "7:45am",
        duration: "1m 12s", cost: 0.18, model: "Sonnet"
      },
      {
        id: "lt2", title: "Revenue Check", status: "complete",
        source: { type: "cron", label: "Cron" }, time: "2:00am",
        duration: "45s", cost: 0.12, model: "Sonnet"
      },
      {
        id: "lt3", title: "Investor Update Draft", description: "Q4 metrics and roadmap email",
        status: "complete", source: { type: "chat", label: "Telegram" }, time: "11:30pm",
        duration: "8m", cost: 0.32, model: "Sonnet"
      },
      {
        id: "lt4", title: "Competitor Research", description: "Analyzing Hyperliquid competitors",
        status: "running", source: { type: "backlog", label: "Backlog" }, time: "4:20pm",
        model: "Opus", progress: 40
      },
      {
        id: "lt5", title: "Fee Tier Analysis",
        status: "scheduled", source: { type: "cron", label: "Cron" }, time: "2:00pm"
      },
    ]
  },
  {
    id: "clawhq",
    name: "ClawHQ",
    color: "orange",
    dotColor: "bg-orange-400",
    tasks: [
      {
        id: "ch1", title: "Dashboard Redesign", description: "3-column layout with backlog, tracker, chat",
        status: "complete", source: { type: "chat", label: "#claw-hq" }, time: "6:51am",
        duration: "45m", cost: 0.92, model: "Opus"
      },
      {
        id: "ch2", title: "Activity Page Built", description: "Compact view with filters and expandable rows",
        status: "complete", source: { type: "chat", label: "#claw-hq" }, time: "10:45pm",
        duration: "30m", cost: 0.78, model: "Opus"
      },
      {
        id: "ch3", title: "Custom Scrollbar",
        status: "complete", source: { type: "chat", label: "#claw-hq" }, time: "10:38pm",
        duration: "5m", cost: 0.08, model: "Sonnet"
      },
    ]
  },
  {
    id: "content",
    name: "Content",
    color: "red",
    dotColor: "bg-red-400",
    tasks: [
      {
        id: "co1", title: "AI Jobs Research", description: "Deep research on AI job displacement, 12+ sources",
        status: "running", source: { type: "cron", label: "Cron" }, time: "3:58am",
        model: "Opus", progress: 65
      },
      {
        id: "co2", title: "Blog: Why AI Agents Need Souls", description: "2,400 word draft",
        status: "complete", source: { type: "chat", label: "Telegram" }, time: "3:15pm",
        duration: "12m", cost: 0.88, model: "Opus"
      },
    ]
  },
  {
    id: "general",
    name: "General",
    color: "gray",
    dotColor: "bg-white/40",
    tasks: [
      {
        id: "ge1", title: "Morning Brief",
        status: "complete", source: { type: "cron", label: "Cron" }, time: "8:32am",
        duration: "2m 05s", cost: 0.24, model: "Sonnet"
      },
    ]
  },
  {
    id: "chartr",
    name: "Chartr",
    color: "green",
    dotColor: "bg-green-400",
    tasks: [
      {
        id: "cr1", title: "Domain Configured", description: "DNS and landing page setup",
        status: "complete", source: { type: "chat", label: "Telegram" }, time: "9:00am",
        duration: "5m", cost: 0.15, model: "Sonnet"
      },
    ]
  },
  {
    id: "blueprints",
    name: "Agent Blueprints",
    color: "blue",
    dotColor: "bg-blue-400",
    tasks: [
      {
        id: "ab1", title: "Site Deployed", description: "Launched with starter kits and docs",
        status: "complete", source: { type: "chat", label: "#agent-blueprints" }, time: "11:00am",
        duration: "1h 20m", cost: 1.45, model: "Opus"
      },
    ]
  },
];

const getSourceStyle = (type: string) => {
  switch (type) {
    case "cron": return "bg-orange-500/10 text-orange-300 border-orange-500/20";
    case "chat": return "bg-blue-500/10 text-blue-300 border-blue-500/20";
    case "backlog": return "bg-purple-500/10 text-purple-300 border-purple-500/20";
    default: return "bg-white/5 text-white/40 border-white/10";
  }
};

const getSourceIcon = (type: string) => {
  switch (type) {
    case "cron": return RefreshCw;
    case "chat": return MessageSquare;
    case "backlog": return FileText;
    default: return Terminal;
  }
};

export default function TasksPage() {
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  // Stats
  const allTasks = projects.flatMap(p => p.tasks);
  const completed = allTasks.filter(t => t.status === "complete").length;
  const running = allTasks.filter(t => t.status === "running").length;
  const totalCost = allTasks.reduce((s, t) => s + (t.cost || 0), 0);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/5 bg-white/[0.01] px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Activity className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Tasks</h1>
              <p className="text-sm text-white/40">By project</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 text-green-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> {completed} done
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-300">
              <Zap className="h-3.5 w-3.5" /> {running} running
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300">
              <DollarSign className="h-3.5 w-3.5" /> ${totalCost.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Project Lanes */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full min-w-max">
          {projects.map((project, i) => {
            const projectCompleted = project.tasks.filter(t => t.status === "complete").length;
            const projectRunning = project.tasks.filter(t => t.status === "running").length;
            const projectCost = project.tasks.reduce((s, t) => s + (t.cost || 0), 0);

            return (
              <div
                key={project.id}
                className={`w-72 flex flex-col h-full ${i > 0 ? "border-l border-white/5" : ""}`}
              >
                {/* Lane header */}
                <div className="flex-shrink-0 px-3 py-3 border-b border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`h-2.5 w-2.5 rounded-full ${project.dotColor}`} />
                    <span className="text-sm font-semibold text-white">{project.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/30 ml-auto">
                      {project.tasks.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-white/25 ml-5">
                    {projectCompleted > 0 && <span>{projectCompleted} done</span>}
                    {projectRunning > 0 && <span className="text-orange-300/50">{projectRunning} running</span>}
                    {projectCost > 0 && <span>${projectCost.toFixed(2)}</span>}
                  </div>
                </div>

                {/* Tasks */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {project.tasks.map((task) => {
                    const SourceIcon = getSourceIcon(task.source.type);
                    const isExpanded = expandedTask === task.id;

                    return (
                      <button
                        key={task.id}
                        onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                        className={`w-full text-left rounded-lg transition-all ${
                          task.status === "running"
                            ? "bg-orange-500/[0.04] border border-orange-500/15 hover:border-orange-500/25"
                            : task.status === "scheduled"
                              ? "bg-white/[0.01] border border-dashed border-white/8 hover:border-white/15"
                              : "bg-white/[0.02] border border-white/5 hover:border-white/10"
                        } ${isExpanded ? "ring-1 ring-orange-500/20" : ""}`}
                      >
                        <div className="p-2.5">
                          {/* Title row */}
                          <div className="flex items-start gap-2 mb-1">
                            <div className={`h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                              task.status === "complete" ? "bg-green-400" :
                              task.status === "running" ? "bg-orange-400 animate-pulse" :
                              task.status === "scheduled" ? "bg-white/20" :
                              "bg-red-400"
                            }`} />
                            <span className={`text-xs font-medium leading-tight ${
                              task.status === "running" ? "text-orange-200" :
                              task.status === "scheduled" ? "text-white/40" :
                              "text-white/80"
                            }`}>{task.title}</span>
                          </div>

                          {/* Description */}
                          {task.description && isExpanded && (
                            <p className="text-[10px] text-white/35 ml-3.5 mb-2 leading-relaxed">{task.description}</p>
                          )}

                          {/* Progress bar for running */}
                          {task.status === "running" && task.progress && (
                            <div className="flex items-center gap-2 ml-3.5 mb-1.5">
                              <div className="flex-1 h-1 rounded-full bg-white/10">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                                  style={{ width: `${task.progress}%` }}
                                />
                              </div>
                              <span className="text-[9px] text-white/25">{task.progress}%</span>
                            </div>
                          )}

                          {/* Meta */}
                          <div className="flex items-center gap-1.5 ml-3.5 flex-wrap">
                            <span className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded border ${getSourceStyle(task.source.type)}`}>
                              <SourceIcon className="h-2 w-2" />
                              {task.source.label}
                            </span>
                            <span className="text-[9px] text-white/15">{task.time}</span>
                            {task.model && <span className="text-[9px] text-white/15">{task.model}</span>}
                            {task.duration && <span className="text-[9px] text-white/15">{task.duration}</span>}
                            {task.cost !== undefined && task.cost > 0 && (
                              <span className="text-[9px] text-white/15">${task.cost.toFixed(2)}</span>
                            )}
                          </div>

                          {/* Expanded detail */}
                          {isExpanded && (task.cost || task.duration || task.model) && (
                            <div className="grid grid-cols-3 gap-1.5 ml-3.5 mt-2 pt-2 border-t border-white/5">
                              {task.duration && (
                                <div className="p-1.5 rounded bg-white/[0.03]">
                                  <p className="text-[8px] text-white/20">Duration</p>
                                  <p className="text-[10px] text-white/50">{task.duration}</p>
                                </div>
                              )}
                              {task.model && (
                                <div className="p-1.5 rounded bg-white/[0.03]">
                                  <p className="text-[8px] text-white/20">Model</p>
                                  <p className="text-[10px] text-white/50">{task.model}</p>
                                </div>
                              )}
                              {task.cost !== undefined && task.cost > 0 && (
                                <div className="p-1.5 rounded bg-white/[0.03]">
                                  <p className="text-[8px] text-white/20">Cost</p>
                                  <p className="text-[10px] text-white/50">${task.cost.toFixed(2)}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
