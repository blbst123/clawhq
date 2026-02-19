"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { PriorityIcon, priOptions, projLabel } from "@/components/ui/priority-icon";
import { selectCls, inputCls, labelCls } from "@/lib/utils";
import type { Task } from "@/lib/types";

interface AddTaskModalProps {
  open: boolean;
  allProjects: string[];
  defaultProject?: string;
  onAdd: (task: Task) => void;
  onClose: () => void;
}

export function AddTaskModal({ open, allProjects, defaultProject, onAdd, onClose }: AddTaskModalProps) {
  const [summary, setSummary] = useState("");
  const [project, setProject] = useState(defaultProject || "general");
  const [priority, setPriority] = useState<string | undefined>(undefined);
  const [note, setNote] = useState("");

  if (!open) return null;

  function handleAdd() {
    if (!summary.trim()) return;
    onAdd({
      id: `cap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      at: new Date().toISOString(),
      type: "manual",
      summary: summary.trim(),
      project: project === "general" ? undefined : project,
      status: "inbox",
      priority: priority as Task["priority"],
      note: note.trim() || undefined,
    });
    setSummary("");
    setProject(defaultProject || "general");
    setPriority(undefined);
    setNote("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#1a1614] shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-[15px] font-semibold text-white/90">Add Task</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors p-1 rounded-lg hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className={labelCls}>Summary</label>
            <input type="text" value={summary} onChange={e => setSummary(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && summary.trim()) handleAdd(); }}
              placeholder="What needs to be done?"
              className={inputCls} autoFocus />
          </div>
          <div>
            <label className={labelCls}>Project</label>
            <select value={project} onChange={e => setProject(e.target.value)} className={selectCls}>
              {allProjects.map(p => <option key={p} value={p}>{projLabel(p)}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Priority</label>
            <div className="flex gap-1">
              {priOptions.map(p => (
                <button key={p.key} type="button" onClick={() => setPriority(p.key === "none" ? undefined : p.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] border transition-all ${
                    (priority || "none") === p.key
                      ? "border-orange-500/40 bg-orange-500/10 text-white/90"
                      : "border-white/[0.06] bg-white/[0.02] text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
                  }`}>
                  <PriorityIcon priority={p.key === "none" ? undefined : p.key} className="h-3.5 w-3.5" />{p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Note <span className="text-white/20">(optional)</span></label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Additional context..." rows={2}
              className={`${inputCls} resize-none`} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/[0.06]">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[13px] text-white/40 hover:text-white/60 hover:bg-white/5 transition-all">Cancel</button>
          <button onClick={handleAdd} disabled={!summary.trim()} className="px-4 py-2 rounded-lg bg-orange-500 text-white text-[13px] font-medium hover:bg-orange-600 disabled:opacity-30 transition-all">Add Task</button>
        </div>
      </div>
    </div>
  );
}
