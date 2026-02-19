"use client";

import { useState, useEffect, useRef } from "react";
import { X, Check, Trash2, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";
import { StatusPicker, PriorityPicker, ProjectPicker } from "@/components/ui/pickers";
import { timeAgo } from "@/lib/task-utils";
import type { Task } from "@/lib/types";

// ─── Auto-expanding description (Linear-style) ───
function DescriptionEditor({ value, onChange, onBlur }: {
  value: string; onChange: (v: string) => void; onBlur: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder="Add description..."
      rows={1}
      className="w-full bg-transparent text-[14px] text-white/60 placeholder-white/20 focus:outline-none resize-none leading-relaxed overflow-hidden"
    />
  );
}

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
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.summary);
  const [descValue, setDescValue] = useState(task.note || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // Sync when task changes
  useEffect(() => {
    setTitleValue(task.summary);
    setDescValue(task.note || "");
    setEditingTitle(false);
    setShowDeleteConfirm(false);
  }, [task.id, task.summary, task.note]);

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
    const current = (task.note || "").trim();
    if (trimmed !== current) {
      onUpdate({ note: trimmed || undefined });
    }
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col border-l border-white/5 bg-[#0f0d0c]">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/5">
        <span className="text-[11px] text-white/25 uppercase tracking-wider font-medium">Task Details</span>
        <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Title */}
        <div className="px-5 pt-5 pb-3">
          {editingTitle ? (
            <input
              ref={titleRef} type="text" value={titleValue}
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

        {/* Description */}
        <div className="px-5 pt-1 pb-4">
          <DescriptionEditor value={descValue} onChange={setDescValue} onBlur={saveDescription} />
        </div>

        {/* Properties row */}
        <div className="px-5 pb-4 flex items-center gap-2 flex-wrap">
          <StatusPicker status={task.status} onChange={(s) => onUpdate({ status: s as Task["status"] })} />
          <PriorityPicker priority={task.priority} onChange={(p) => onUpdate({ priority: p as Task["priority"] })} />
          <ProjectPicker project={task.project} allProjects={allProjects} onChange={(p) => onUpdate({ project: p })} onCreateProject={onCreateProject} />

          {/* Meta info */}
          <span className="text-[11px] text-white/20 ml-auto">{timeAgo(task.at)}</span>
          {task.source && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-white/30">{task.source}</span>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex-shrink-0 border-t border-white/5 px-5 py-3 flex items-center gap-2">
        {(task.status === "inbox" || task.status === "todo") && (
          <button onClick={onStart}
            className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 transition-all">
            <Play className="h-3.5 w-3.5" /> Start
          </button>
        )}
        {task.status === "in_progress" && (
          <>
            <button onClick={() => onUpdate({ status: "done" })}
              className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-green-500/10 text-green-300 hover:bg-green-500/20 transition-all">
              <Check className="h-3.5 w-3.5" /> Complete
            </button>
            <button onClick={() => onUpdate({ status: "inbox" })}
              className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 transition-all">
              <Pause className="h-3.5 w-3.5" /> Back to Inbox
            </button>
          </>
        )}
        {task.status === "done" && (
          <button onClick={() => onUpdate({ status: "inbox" })}
            className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 transition-all">
            Reopen
          </button>
        )}
        <div className="flex-1" />
        <button onClick={() => setShowDeleteConfirm(true)}
          className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-all" title="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
        <ConfirmDeleteModal
          open={showDeleteConfirm}
          message={<>Delete <strong className="text-white/80">{task.summary}</strong>? This can&apos;t be undone.</>}
          onConfirm={() => { onDelete(); onClose(); }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      </div>
    </div>
  );
}
