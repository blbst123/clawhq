"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { PriorityIcon, priOptions, projLabel } from "@/components/ui/priority-icon";
import { selectCls, inputCls, labelCls } from "@/lib/utils";
import type { Task } from "@/lib/types";

interface EditTaskModalProps {
  task: Task;
  allProjects: string[];
  onSave: (patch: Partial<Task>) => void;
  onClose: () => void;
  onCreateProject?: () => void;
}

export function EditTaskModal({ task, allProjects, onSave, onClose, onCreateProject }: EditTaskModalProps) {
  const [title, setTitle] = useState(task.summary);
  const [description, setDescription] = useState(task.note || "");
  const [project, setProject] = useState(task.project || "general");
  const [priority, setPriority] = useState(task.priority || "none");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#1a1614] shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-[15px] font-semibold text-white/90">Edit Task</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors p-1 rounded-lg hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className={labelCls}>Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputCls} autoFocus />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Add details..." rows={4}
              className={`${inputCls} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Project</label>
              <select value={project} onChange={e => e.target.value === "__new__" && onCreateProject ? onCreateProject() : setProject(e.target.value)}
                className={selectCls}>
                {allProjects.map(p => <option key={p} value={p}>{projLabel(p)}</option>)}
                {onCreateProject && <option value="__new__">+ New project</option>}
              </select>
            </div>
            <div>
              <label className={labelCls}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className={selectCls}>
                {priOptions.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/[0.06]">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[13px] text-white/40 hover:text-white/60 hover:bg-white/5 transition-all">Cancel</button>
          <button
            onClick={() => onSave({ summary: title, note: description, project, priority: priority === "none" ? undefined : priority as Task["priority"] })}
            className="px-4 py-2 rounded-lg bg-orange-500 text-white text-[13px] font-medium hover:bg-orange-600 transition-all">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
