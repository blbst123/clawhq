"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Check,
  ChevronDown,
  Trash2,
  Play,
  Pause,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PriorityIcon, priOptions, projLabel } from "@/components/ui/priority-icon";
import { StatusIcon } from "@/components/ui/status-icon";
import { useSettings } from "@/lib/use-settings";
import { timeAgo } from "@/lib/task-utils";
import type { Task } from "@/lib/types";

// ─── Click outside hook ───
function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    function listener(e: MouseEvent) {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    }
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

// ─── Inline Dropdown ───
function InlineDropdown({ show, onClose, children, className }: {
  show: boolean; onClose: () => void; children: React.ReactNode; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClose);
  if (!show) return null;
  return (
    <div ref={ref} className={cn("absolute top-full left-0 mt-1 z-50 bg-[#1a1614] border border-white/10 rounded-lg shadow-xl py-1", className)}>
      {children}
    </div>
  );
}

const statusOptions = [
  { key: "inbox", label: "Inbox" },
  { key: "in_progress", label: "Active" },
  { key: "done", label: "Done" },
] as const;

const priorityOptions = priOptions;

// ─── Main Component ───
export function TaskDetailPanel({
  task,
  allProjects,
  onUpdate,
  onDelete,
  onStart,
  onClose,
  onCreateProject,
}: {
  task: Task;
  allProjects: string[];
  onUpdate: (patch: Partial<Task>) => void;
  onDelete: () => void;
  onStart: () => void;
  onClose: () => void;
  onCreateProject: () => void;
}) {
  const { getProjectColor } = useSettings();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.summary);
  const [descValue, setDescValue] = useState(task.note || task.quote || "");
  const [showStatus, setShowStatus] = useState(false);
  const [showPriority, setShowPriority] = useState(false);
  const [showProject, setShowProject] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // Sync when task changes
  useEffect(() => {
    setTitleValue(task.summary);
    setDescValue(task.note || task.quote || "");
    setEditingTitle(false);
    setShowDeleteConfirm(false);
  }, [task.id, task.summary, task.note, task.quote]);

  // Escape to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function saveTitle() {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== task.summary) {
      onUpdate({ summary: trimmed });
    } else {
      setTitleValue(task.summary);
    }
    setEditingTitle(false);
  }

  function saveDescription() {
    const trimmed = descValue.trim();
    const current = (task.note || task.quote || "").trim();
    if (trimmed !== current) {
      onUpdate({ note: trimmed || undefined, quote: undefined });
    }
  }

  const currentStatus = task.status === "todo" ? "inbox" : task.status;

  return (
    <div className="flex-1 min-w-0 flex flex-col border-l border-white/5 bg-[#0f0d0c]">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/5">
        <span className="text-[11px] text-white/25 uppercase tracking-wider font-medium">Task Details</span>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Title */}
        <div className="px-5 pt-5 pb-3">
          {editingTitle ? (
            <input
              ref={titleRef}
              type="text"
              value={titleValue}
              onChange={e => setTitleValue(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setTitleValue(task.summary); setEditingTitle(false); } }}
              className="w-full bg-transparent text-[18px] font-semibold text-white/90 focus:outline-none border-b border-orange-500/40 pb-1"
              autoFocus
            />
          ) : (
            <h2
              onClick={() => { setEditingTitle(true); setTimeout(() => titleRef.current?.focus(), 0); }}
              className="text-[18px] font-semibold text-white/90 cursor-text hover:text-white transition-colors"
            >
              {task.summary}
            </h2>
          )}
        </div>

        {/* Properties row */}
        <div className="px-5 flex items-center gap-2 flex-wrap">
          {/* Status */}
          <div className="relative">
            <button
              onClick={() => setShowStatus(!showStatus)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-all"
            >
              <StatusIcon status={currentStatus} className="h-3.5 w-3.5" />
              <span className="text-[12px] text-white/60">
                {statusOptions.find(s => s.key === currentStatus)?.label}
              </span>
            </button>
            <InlineDropdown show={showStatus} onClose={() => setShowStatus(false)} className="min-w-[140px]">
              {statusOptions.map(s => (
                <button key={s.key}
                  onClick={() => { onUpdate({ status: s.key as Task["status"] }); setShowStatus(false); }}
                  className="w-full text-left flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-all"
                >
                  <StatusIcon status={s.key} className="shrink-0" />
                  <span className="text-[12px] text-white/60">{s.label}</span>
                  {currentStatus === s.key && <Check className="h-3 w-3 text-orange-400 ml-auto" />}
                </button>
              ))}
            </InlineDropdown>
          </div>

          {/* Priority */}
          <div className="relative">
            <button
              onClick={() => setShowPriority(!showPriority)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-all"
            >
              <PriorityIcon priority={task.priority} className="h-3.5 w-3.5" />
              <span className="text-[12px] text-white/60">
                {priorityOptions.find(p => p.key === (task.priority || "none"))?.label}
              </span>
            </button>
            <InlineDropdown show={showPriority} onClose={() => setShowPriority(false)} className="min-w-[170px]">
              {priorityOptions.map(p => (
                <button key={p.key}
                  onClick={() => { onUpdate({ priority: p.key === "none" ? undefined : p.key as Task["priority"] }); setShowPriority(false); }}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-all"
                >
                  <PriorityIcon priority={p.key === "none" ? undefined : p.key} className="h-4 w-4" />
                  <span className="text-[13px] text-white/60">{p.label}</span>
                  {(task.priority || "none") === p.key && <Check className="h-3.5 w-3.5 text-orange-400 ml-auto" />}
                </button>
              ))}
            </InlineDropdown>
          </div>

          {/* Project */}
          <div className="relative">
            <button
              onClick={() => setShowProject(!showProject)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-all"
            >
              <div className={cn("h-2.5 w-2.5 rounded-full", getProjectColor(task.project))} />
              <span className="text-[12px] text-white/60">{projLabel(task.project)}</span>
            </button>
            <InlineDropdown show={showProject} onClose={() => setShowProject(false)} className="min-w-[170px]">
              {allProjects.map(p => (
                <button key={p}
                  onClick={() => { onUpdate({ project: p }); setShowProject(false); }}
                  className="w-full text-left flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-all"
                >
                  <div className={cn("h-2 w-2 rounded-full", getProjectColor(p))} />
                  <span className="text-[12px] text-white/60">{projLabel(p)}</span>
                  {(task.project || "general") === p && <Check className="h-3 w-3 text-orange-400 ml-auto" />}
                </button>
              ))}
              <div className="border-t border-white/5 mt-1 pt-1">
                <button
                  onClick={() => { setShowProject(false); onCreateProject(); }}
                  className="w-full text-left flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-all"
                >
                  <Plus className="h-3 w-3 text-orange-400" />
                  <span className="text-[12px] text-orange-400">New project</span>
                </button>
              </div>
            </InlineDropdown>
          </div>

          {/* Meta info */}
          <span className="text-[11px] text-white/20 ml-auto">{timeAgo(task.at)}</span>
          {task.source && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-white/30">{task.source}</span>
          )}
        </div>

        {/* Divider */}
        <div className="mx-5 my-4 border-t border-white/5" />

        {/* Description */}
        <div className="px-5 pb-5">
          <label className="block text-[12px] text-white/30 mb-2">Description</label>
          <textarea
            value={descValue}
            onChange={e => setDescValue(e.target.value)}
            onBlur={saveDescription}
            placeholder="Add a description..."
            rows={6}
            className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2.5 text-[13px] text-white/70 placeholder-white/15 focus:border-orange-500/30 focus:outline-none transition-colors resize-none leading-relaxed"
          />
        </div>

        {/* Quote (if from conversation) */}
        {task.quote && task.note !== task.quote && (
          <div className="px-5 pb-5">
            <label className="block text-[12px] text-white/30 mb-2">Original Quote</label>
            <div className="border-l-2 border-white/10 pl-3 py-1">
              <p className="text-[12px] text-white/30 italic leading-relaxed">{task.quote}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex-shrink-0 border-t border-white/5 px-5 py-3 flex items-center gap-2">
        {(task.status === "inbox" || task.status === "todo") && (
          <button
            onClick={onStart}
            className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 transition-all"
          >
            <Play className="h-3.5 w-3.5" /> Start
          </button>
        )}
        {task.status === "in_progress" && (
          <>
            <button
              onClick={() => onUpdate({ status: "done" })}
              className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-green-500/10 text-green-300 hover:bg-green-500/20 transition-all"
            >
              <Check className="h-3.5 w-3.5" /> Complete
            </button>
            <button
              onClick={() => onUpdate({ status: "inbox" })}
              className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 transition-all"
            >
              <Pause className="h-3.5 w-3.5" /> Back to Inbox
            </button>
          </>
        )}
        {task.status === "done" && (
          <button
            onClick={() => onUpdate({ status: "inbox" })}
            className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 transition-all"
          >
            Reopen
          </button>
        )}
        <div className="flex-1" />
        {showDeleteConfirm ? (
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-red-400/60">Delete?</span>
            <button onClick={() => { onDelete(); onClose(); }}
              className="text-[12px] px-2.5 py-1 rounded-md bg-red-500 text-white hover:bg-red-600 transition-all">
              Yes
            </button>
            <button onClick={() => setShowDeleteConfirm(false)}
              className="text-[12px] px-2.5 py-1 rounded-md text-white/40 hover:text-white/60 transition-all">
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-all"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
