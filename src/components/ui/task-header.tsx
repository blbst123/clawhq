"use client";

import {
  ArrowLeft, Check, CheckCircle2, Inbox, Pencil, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PriorityIcon, priLabels, priColors, priOptions, projColor, projLabel } from "@/components/ui/priority-icon";
import { InlineDropdown } from "@/components/ui/inline-dropdown";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";
import type { TaskInfo } from "@/components/task-chat";
import { useState } from "react";

interface TaskHeaderProps {
  task: TaskInfo;
  allProjects?: string[];
  showTools: boolean;
  onShowToolsChange: (v: boolean) => void;
  onBack: () => void;
  onStatusChange?: (status: string) => void;
  onPriorityChange?: (priority: string | undefined) => void;
  onProjectChange?: (project: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function TaskHeader({
  task,
  allProjects,
  showTools,
  onShowToolsChange,
  onBack,
  onStatusChange,
  onPriorityChange,
  onProjectChange,
  onEdit,
  onDelete,
}: TaskHeaderProps) {
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="flex-shrink-0 border-b border-white/5 px-5 py-3 space-y-2.5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-all">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h2 className="text-[15px] font-semibold text-white/90 leading-snug min-w-0 flex-1 truncate">{task.summary}</h2>
        <label className="flex items-center gap-1.5 cursor-pointer text-white/35 hover:text-white/55 transition-colors shrink-0">
          <input type="checkbox" checked={showTools} onChange={(e) => onShowToolsChange(e.target.checked)} className="accent-orange-500 w-3.5 h-3.5" />
          <span className="text-[12px]">Show tools</span>
        </label>
      </div>

      <div className="ml-10 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Project picker */}
          <div className="relative">
            <button onClick={() => setShowProjectPicker(!showProjectPicker)}
              className="flex items-center gap-1.5 text-[12px] text-white/45 hover:text-white/70 px-1.5 py-0.5 rounded-md hover:bg-white/[0.04] transition-all">
              <div className={cn("h-2.5 w-2.5 rounded-full", projColor(task.project))} />
              <span>{projLabel(task.project)}</span>
            </button>
            <InlineDropdown show={showProjectPicker} onClose={() => setShowProjectPicker(false)}>
              {(allProjects || ["general"]).map(p => (
                <button key={p} onClick={() => { onProjectChange?.(p); setShowProjectPicker(false); }}
                  className="w-full text-left flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-all">
                  <div className={cn("h-2 w-2 rounded-full", projColor(p))} />
                  <span className="text-[12px] text-white/60">{projLabel(p)}</span>
                  {(task.project || "general") === p && <Check className="h-3 w-3 text-orange-400 ml-auto" />}
                </button>
              ))}
            </InlineDropdown>
          </div>

          {/* Priority picker */}
          <div className="relative">
            <button onClick={() => setShowPriorityPicker(!showPriorityPicker)}
              className="flex items-center gap-1.5 text-[12px] px-1.5 py-0.5 rounded-md hover:bg-white/[0.04] transition-all">
              <PriorityIcon priority={task.priority} className="h-3.5 w-3.5" />
              <span className={cn("text-[11px] font-medium", priColors[task.priority || ""] ? priColors[task.priority!].split(" ")[0] : "text-white/30")}>
                {priLabels[task.priority || ""] || "No priority"}
              </span>
            </button>
            <InlineDropdown show={showPriorityPicker} onClose={() => setShowPriorityPicker(false)}>
              {priOptions.map(p => (
                <button key={p.key} onClick={() => { onPriorityChange?.(p.key === "none" ? undefined : p.key); setShowPriorityPicker(false); }}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/5 transition-all">
                  <PriorityIcon priority={p.key === "none" ? undefined : p.key} className="h-3.5 w-3.5" />
                  <span className="text-[12px] text-white/60">{p.label}</span>
                  {(task.priority || "none") === p.key && <Check className="h-3 w-3 text-orange-400 ml-auto" />}
                </button>
              ))}
            </InlineDropdown>
          </div>

          <span className="text-[11px] text-white/15">•</span>
          <span className="text-[11px] text-white/20">{task.sessionKey}</span>
        </div>
        {task.note && (
          <p className="text-[13px] text-white/35 line-clamp-2 leading-relaxed">{task.note}</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 ml-10">
        {onStatusChange && task.status === "in_progress" && (
          <button onClick={() => onStatusChange("done")}
            className="flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-lg text-green-300 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/30 transition-all font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" /> Mark Done
          </button>
        )}
        {onStatusChange && task.status === "in_progress" && (
          <button onClick={() => onStatusChange("inbox")}
            className="flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-lg text-white/50 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-white/[0.12] transition-all">
            <Inbox className="h-3.5 w-3.5" /> Move to Inbox
          </button>
        )}
        {onEdit && (
          <button onClick={onEdit}
            className="flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-lg text-white/50 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-white/[0.12] transition-all">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        )}
        {onDelete && (
          <button onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-lg text-red-400/60 hover:text-red-400 bg-white/[0.02] hover:bg-red-500/10 border border-white/[0.06] hover:border-red-500/20 transition-all ml-auto">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmDeleteModal
        open={showDeleteConfirm}
        message={<>Delete <strong className="text-white/80">{task.summary}</strong>? This can&apos;t be undone.</>}
        onConfirm={() => { setShowDeleteConfirm(false); onDelete?.(); }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
