"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  Pencil,
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
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";
import { InlineDropdown } from "@/components/ui/inline-dropdown";
import type { Task } from "@/lib/types";

// Dropdown imported from @/components/ui/inline-dropdown

// ─── Shared TaskRow Props ───

export interface TaskRowProps {
  task: Task;
  expanded: boolean;
  compact?: boolean; // compact mode for dashboard sidebar
  onToggle: () => void;
  onStatusChange: (status: Task["status"]) => void;
  onUpdate: (patch: Partial<Task>) => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onStart?: () => void;
  onOpenChat?: () => void;
  onCreateProject?: () => void;
  allProjects?: string[];
  isActiveChat?: boolean;
  isSelected?: boolean;
  onContextMenu?: (e: React.MouseEvent, task: Task) => void;
}

// ─── TaskRow ───

export function TaskRow({
  task,
  expanded,
  compact,
  onToggle,
  onStatusChange,
  onUpdate,
  onDelete,
  onEdit,
  onStart,
  onOpenChat,
  onCreateProject,
  allProjects,
  isActiveChat,
  isSelected,
  onContextMenu,
}: TaskRowProps) {
  const { getProjectColor } = useSettings();
  const isDone = task.status === "done";
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const description = task.note || "";

  const px = compact ? "px-3" : "px-4";
  const py = compact ? "py-2.5" : "py-3";
  const gap = compact ? "gap-2" : "gap-2.5";
  const titleSize = compact ? "text-[13px]" : "text-[14px]";

  return (
    <div className={cn(
      "rounded-lg border transition-all",
      isActiveChat || isSelected
        ? "bg-orange-500/[0.08] border-orange-500/30"
        : expanded
          ? "bg-white/[0.03] border-orange-500/20"
          : "bg-white/[0.015] border-white/5 hover:border-white/10",
      isDone && "opacity-60"
    )}>
      <div
        className={cn("flex items-center cursor-pointer hover:bg-white/[0.01] transition-all", px, py, gap)}
        onClick={() => {
          if (task.status === "in_progress" && onOpenChat) onOpenChat();
          else onToggle();
        }}
        onContextMenu={onContextMenu ? (e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(e, task); } : undefined}
      >
        {/* Priority icon */}
        <div className="relative shrink-0 flex items-center">
          <button
            onClick={e => { e.stopPropagation(); setShowPriorityPicker(!showPriorityPicker); }}
            className="hover:scale-110 transition-transform flex items-center"
            title={priOptions.find(p => p.key === (task.priority || "none"))?.label}
          >
            <PriorityIcon priority={task.priority} className={compact ? "h-4 w-4" : undefined} />
          </button>
          <InlineDropdown show={showPriorityPicker} onClose={() => setShowPriorityPicker(false)} className="min-w-[150px]">
            {priOptions.map(p => (
              <button key={p.key}
                onClick={e => { e.stopPropagation(); onUpdate({ priority: p.key === "none" ? undefined : p.key as Task["priority"] }); setShowPriorityPicker(false); }}
                className="w-full text-left flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/5 transition-all">
                <PriorityIcon priority={p.key === "none" ? undefined : p.key} className="h-4 w-4" />
                <span className="text-[13px] text-white/60">{p.label}</span>
                {(task.priority || "none") === p.key && <Check className="h-3.5 w-3.5 text-orange-400 ml-auto" />}
              </button>
            ))}
          </InlineDropdown>
        </div>

        {/* Status icon */}
        <div className="relative shrink-0 flex items-center">
          <button
            onClick={e => { e.stopPropagation(); setShowStatusPicker(!showStatusPicker); }}
            className="hover:scale-110 transition-transform flex items-center"
          >
            <StatusIcon status={task.status === "todo" ? "inbox" : task.status} />
          </button>
          <InlineDropdown show={showStatusPicker} onClose={() => setShowStatusPicker(false)} className="min-w-[140px]">
            {([
              { key: "inbox", label: "Inbox", textCls: "text-white/60" },
              { key: "in_progress", label: "Active", textCls: "text-white/60" },
              { key: "done", label: "Done", textCls: "text-green-400/70" },
            ] as const).map(s => {
              const isCurrent = (task.status === "inbox" || task.status === "todo") ? s.key === "inbox" : task.status === s.key;
              return (
                <button key={s.key}
                  onClick={e => { e.stopPropagation(); onStatusChange(s.key as Task["status"]); setShowStatusPicker(false); }}
                  className="w-full text-left flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-all">
                  <StatusIcon status={s.key} className="shrink-0" />
                  <span className={cn("text-[12px]", s.textCls)}>{s.label}</span>
                  {isCurrent && <Check className="h-3 w-3 text-orange-400 ml-auto" />}
                </button>
              );
            })}
          </InlineDropdown>
        </div>

        {/* Title */}
        <span className={cn(
          "flex-1 font-medium min-w-0 truncate",
          titleSize,
          isDone ? "text-white/40 line-through" : "text-white/80"
        )}>
          {task.summary}
        </span>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {!compact && (
            <div className="flex items-center gap-1.5">
              <div className={cn("h-2 w-2 rounded-full", getProjectColor(task.project))} />
              <span className="text-[11px] text-white/30">{projLabel(task.project)}</span>
            </div>
          )}
          <span className="text-[11px] text-white/20">{timeAgo(task.at)}</span>
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className={cn("pb-3 space-y-3 border-t border-white/5 pt-3", px)}>
          {description && (
            <p className={cn("text-white/40 whitespace-pre-wrap line-clamp-3", compact ? "text-[12px] leading-relaxed" : "text-[13px]")}>{description}</p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {/* Project picker (non-compact only) */}
            {!compact && allProjects && (
              <div className="relative">
                <button
                  onClick={e => { e.stopPropagation(); setShowProjectPicker(!showProjectPicker); }}
                  className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all"
                >
                  <div className={cn("h-2.5 w-2.5 rounded-full", getProjectColor(task.project))} />
                  <span className="text-white/60">{projLabel(task.project)}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-white/25" />
                </button>
                <InlineDropdown show={showProjectPicker} onClose={() => setShowProjectPicker(false)} className="min-w-[170px]">
                  {allProjects.map(p => (
                    <button key={p}
                      onClick={e => { e.stopPropagation(); onUpdate({ project: p }); setShowProjectPicker(false); }}
                      className="w-full text-left flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-all">
                      <div className={cn("h-2 w-2 rounded-full", getProjectColor(p))} />
                      <span className="text-[12px] text-white/60">{projLabel(p)}</span>
                      {(task.project || "general") === p && <Check className="h-3 w-3 text-orange-400 ml-auto" />}
                    </button>
                  ))}
                  {onCreateProject && (
                    <div className="border-t border-white/5 mt-1 pt-1">
                      <button
                        onClick={e => { e.stopPropagation(); setShowProjectPicker(false); onCreateProject(); }}
                        className="w-full text-left flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-all">
                        <Plus className="h-3 w-3 text-orange-400" />
                        <span className="text-[12px] text-orange-400">New project</span>
                      </button>
                    </div>
                  )}
                </InlineDropdown>
              </div>
            )}

            {/* Edit */}
            {onEdit && (
              <button
                onClick={e => { e.stopPropagation(); onEdit(); }}
                className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 hover:border-white/20 text-white/50 hover:text-white/80 transition-all"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            )}

            {/* Status actions */}
            {(task.status === "inbox" || task.status === "todo") && (
              <button
                onClick={e => { e.stopPropagation(); onStart ? onStart() : onStatusChange("in_progress"); }}
                className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 transition-all"
              >
                <Play className="h-3.5 w-3.5" /> Start
              </button>
            )}
            {task.status === "in_progress" && (
              <>
                {onOpenChat && (
                  <button
                    onClick={e => { e.stopPropagation(); onOpenChat(); }}
                    className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 transition-all"
                  >
                    Open Chat
                  </button>
                )}
                <button
                  onClick={e => { e.stopPropagation(); onStatusChange("done"); }}
                  className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-green-500/10 text-green-300 hover:bg-green-500/20 transition-all"
                >
                  <Check className="h-3.5 w-3.5" /> Complete
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onStatusChange("inbox"); }}
                  className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 transition-all"
                >
                  <Pause className="h-3.5 w-3.5" /> Back to Inbox
                </button>
              </>
            )}
            {task.status === "done" && (
              <button
                onClick={e => { e.stopPropagation(); onStatusChange("inbox"); }}
                className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 transition-all"
              >
                Reopen
              </button>
            )}

            {/* Delete */}
            {onDelete && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-all ml-auto"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <ConfirmDeleteModal
                  open={showDeleteConfirm}
                  message={<>Delete <strong className="text-white/80">{task.summary}</strong>? This can&apos;t be undone.</>}
                  onConfirm={() => { onDelete(); setShowDeleteConfirm(false); }}
                  onCancel={() => setShowDeleteConfirm(false)}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
