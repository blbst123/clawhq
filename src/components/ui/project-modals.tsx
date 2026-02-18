"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROJECT_COLORS } from "@/lib/task-utils";

// ─── New Project Modal ───

interface NewProjectModalProps {
  open: boolean;
  onCreate: (name: string, color: string) => void;
  onClose: () => void;
}

export function NewProjectModal({ open, onCreate, onClose }: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("bg-blue-400");

  if (!open) return null;

  function handleCreate() {
    if (!name.trim()) return;
    onCreate(name, color);
    setName("");
    setColor("bg-blue-400");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1614] shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-[15px] font-semibold text-white/90">New Project</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors p-1 rounded-lg hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-1.5">Name</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
              placeholder="Project name"
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white placeholder-white/20 focus:border-orange-500/30 focus:outline-none transition-colors"
              autoFocus
            />
          </div>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/[0.06]">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[13px] text-white/40 hover:text-white/60 hover:bg-white/5 transition-all">Cancel</button>
          <button onClick={handleCreate} disabled={!name.trim()}
            className="px-4 py-2 rounded-lg bg-orange-500 text-white text-[13px] font-medium hover:bg-orange-600 disabled:opacity-30 transition-all">Create</button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Project Modal ───

interface EditProjectModalProps {
  project: { key: string; name: string; color: string } | null;
  onSave: (key: string, name: string, color: string) => void;
  onClose: () => void;
}

export function EditProjectModal({ project, onSave, onClose }: EditProjectModalProps) {
  const [name, setName] = useState(project?.name ?? "");
  const [color, setColor] = useState(project?.color ?? "bg-blue-400");

  if (!project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1614] shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-[15px] font-semibold text-white/90">Edit Project</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors p-1 rounded-lg hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-1.5">Name</label>
            <input type="text" value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") onSave(project.key, name, color); }}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white placeholder-white/20 focus:border-orange-500/30 focus:outline-none transition-colors"
              autoFocus />
          </div>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/[0.06]">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] text-white/40 hover:text-white/60 hover:bg-white/5 transition-all">Cancel</button>
          <button onClick={() => onSave(project.key, name, color)} disabled={!name.trim()}
            className="px-4 py-2 rounded-lg bg-orange-500 text-white text-[13px] font-medium hover:bg-orange-600 disabled:opacity-30 transition-all">Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared Color Picker ───

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div>
      <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-1.5">Color</label>
      <div className="flex items-center gap-2 flex-wrap">
        {PROJECT_COLORS.map(c => (
          <button key={c} onClick={() => onChange(c)}
            className={cn("h-6 w-6 rounded-full transition-all", c,
              value === c ? "ring-2 ring-white/50 ring-offset-2 ring-offset-[#1a1614]" : "hover:scale-110"
            )} />
        ))}
      </div>
    </div>
  );
}
