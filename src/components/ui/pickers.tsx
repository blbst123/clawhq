"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PriorityIcon, priOptions, projLabel } from "@/components/ui/priority-icon";
import { StatusIcon } from "@/components/ui/status-icon";
import { InlineDropdown } from "@/components/ui/inline-dropdown";
import { useSettings } from "@/lib/use-settings";

// ─── Status Picker ───

const statusOptions = [
  { key: "inbox" as const, label: "Inbox" },
  { key: "in_progress" as const, label: "Active" },
  { key: "done" as const, label: "Done" },
];

export function StatusPicker({
  status,
  onChange,
  className,
}: {
  status: string;
  onChange: (status: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = status === "todo" ? "inbox" : status;

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-all"
      >
        <StatusIcon status={current} className="h-3.5 w-3.5" />
        <span className="text-[12px] text-white/60">
          {statusOptions.find(s => s.key === current)?.label}
        </span>
      </button>
      <InlineDropdown show={open} onClose={() => setOpen(false)} className="min-w-[140px]">
        {statusOptions.map(s => (
          <button key={s.key}
            onClick={() => { onChange(s.key); setOpen(false); }}
            className="w-full text-left flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-all">
            <StatusIcon status={s.key} className="shrink-0" />
            <span className="text-[12px] text-white/60">{s.label}</span>
            {current === s.key && <Check className="h-3 w-3 text-orange-400 ml-auto" />}
          </button>
        ))}
      </InlineDropdown>
    </div>
  );
}

// ─── Priority Picker ───

export function PriorityPicker({
  priority,
  onChange,
  className,
}: {
  priority?: string;
  onChange: (priority: string | undefined) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-all"
      >
        <PriorityIcon priority={priority} className="h-3.5 w-3.5" />
        <span className="text-[12px] text-white/60">
          {priOptions.find(p => p.key === (priority || "none"))?.label}
        </span>
      </button>
      <InlineDropdown show={open} onClose={() => setOpen(false)} className="min-w-[170px]">
        {priOptions.map(p => (
          <button key={p.key}
            onClick={() => { onChange(p.key === "none" ? undefined : p.key); setOpen(false); }}
            className="w-full text-left flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-all">
            <PriorityIcon priority={p.key === "none" ? undefined : p.key} className="h-4 w-4" />
            <span className="text-[13px] text-white/60">{p.label}</span>
            {(priority || "none") === p.key && <Check className="h-3.5 w-3.5 text-orange-400 ml-auto" />}
          </button>
        ))}
      </InlineDropdown>
    </div>
  );
}

// ─── Project Picker ───

export function ProjectPicker({
  project,
  allProjects,
  onChange,
  onCreateProject,
  className,
}: {
  project?: string;
  allProjects: string[];
  onChange: (project: string) => void;
  onCreateProject?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { getProjectColor } = useSettings();

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-all"
      >
        <div className={cn("h-2.5 w-2.5 rounded-full", getProjectColor(project))} />
        <span className="text-[12px] text-white/60">{projLabel(project)}</span>
      </button>
      <InlineDropdown show={open} onClose={() => setOpen(false)} className="min-w-[170px]">
        {allProjects.map(p => (
          <button key={p}
            onClick={() => { onChange(p); setOpen(false); }}
            className="w-full text-left flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-all">
            <div className={cn("h-2 w-2 rounded-full", getProjectColor(p))} />
            <span className="text-[12px] text-white/60">{projLabel(p)}</span>
            {(project || "general") === p && <Check className="h-3 w-3 text-orange-400 ml-auto" />}
          </button>
        ))}
        {onCreateProject && (
          <div className="border-t border-white/5 mt-1 pt-1">
            <button
              onClick={() => { setOpen(false); onCreateProject(); }}
              className="w-full text-left flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-all">
              <Plus className="h-3 w-3 text-orange-400" />
              <span className="text-[12px] text-orange-400">New project</span>
            </button>
          </div>
        )}
      </InlineDropdown>
    </div>
  );
}
