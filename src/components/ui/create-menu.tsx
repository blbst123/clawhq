"use client";

import { useState } from "react";
import { Plus, FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";

export function CreateMenu({ onNewTask, onNewProject, variant = "icon" }: {
  onNewTask: () => void;
  onNewProject: () => void;
  variant?: "icon" | "button";
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      {variant === "icon" ? (
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "h-6 w-6 rounded-md flex items-center justify-center transition-all",
            open ? "bg-orange-500/20 text-orange-300" : "text-white/25 hover:text-white/50 hover:bg-white/[0.06]"
          )}
          title="Create new…"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      ) : (
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all",
            open ? "bg-orange-600 text-white" : "bg-orange-500 text-white hover:bg-orange-600"
          )}
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      )}

      {open && (<>
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        <div className="absolute right-0 top-8 z-50 w-56 rounded-xl border border-white/[0.08] bg-[#1a1816] shadow-2xl shadow-black/60 overflow-hidden">
          <div className="p-1.5">
            <button
              onClick={() => { setOpen(false); onNewTask(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-white/[0.05] transition-colors group"
            >
              <div className="h-7 w-7 rounded-lg bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                <Plus className="h-3.5 w-3.5 text-orange-400" />
              </div>
              <div>
                <div className="text-[13px] font-medium text-white/80">New Task</div>
                <div className="text-[11px] text-white/30">Add to inbox</div>
              </div>
            </button>
            <button
              onClick={() => { setOpen(false); onNewProject(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-white/[0.05] transition-colors group"
            >
              <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <FolderPlus className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <div>
                <div className="text-[13px] font-medium text-white/80">New Project</div>
                <div className="text-[11px] text-white/30">Name & color</div>
              </div>
            </button>
          </div>
        </div>
      </>)}
    </div>
  );
}
