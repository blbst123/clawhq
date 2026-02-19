"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Check,
  ChevronRight,
  Pencil,
  Trash2,
  Play,
  Pause,
  Plus,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PriorityIcon, priOptions, projLabel } from "@/components/ui/priority-icon";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";
import { StatusIcon } from "@/components/ui/status-icon";
import { useSettings } from "@/lib/use-settings";
import type { Task } from "@/lib/types";

// ─── Shared data ───

const statusOptions = [
  { key: "inbox" as const, label: "Inbox" },
  { key: "in_progress" as const, label: "In Progress" },
  { key: "done" as const, label: "Done" },
];

// ─── Types ───

interface ContextMenuProps {
  task: Task;
  allProjects: string[];
  onStatusChange: (status: Task["status"]) => void;
  onPriorityChange: (priority: Task["priority"]) => void;
  onProjectChange: (project: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onStart?: () => void;
  onCreateProject?: () => void;
}

interface MenuPosition { x: number; y: number }
type SubMenu = "status" | "priority" | "project" | null;

// ─── Hook ───

export function useTaskContextMenu() {
  const [menu, setMenu] = useState<{ task: Task; pos: MenuPosition } | null>(null);
  const handleContextMenu = useCallback((e: React.MouseEvent, task: Task) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ task, pos: { x: e.clientX, y: e.clientY } });
  }, []);
  const close = useCallback(() => setMenu(null), []);
  return { menu, handleContextMenu, close };
}

// ─── Component ───

export function TaskContextMenu({
  task, position, allProjects,
  onStatusChange, onPriorityChange, onProjectChange,
  onEdit, onDelete, onStart, onCreateProject, onClose,
}: ContextMenuProps & { position: MenuPosition; onClose: () => void }) {
  const { getProjectColor } = useSettings();
  const [subMenu, setSubMenu] = useState<SubMenu>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const [adjustedPos, setAdjustedPos] = useState(position);
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let { x, y } = position;
    if (x + rect.width > vw - 8) x = vw - rect.width - 8;
    if (y + rect.height > vh - 8) y = vh - rect.height - 8;
    if (x < 8) x = 8;
    if (y < 8) y = 8;
    setAdjustedPos({ x, y });
  }, [position]);

  const currentStatus = task.status === "todo" ? "inbox" : task.status;

  function getSubMenuPosition(parentItem: HTMLElement | null): { top: number; left: number } {
    if (!parentItem || !menuRef.current) return { top: 0, left: 0 };
    const menuRect = menuRef.current.getBoundingClientRect();
    const itemRect = parentItem.getBoundingClientRect();
    const vw = window.innerWidth;
    let left = menuRect.width - 2;
    if (menuRect.right + 200 > vw) left = -198;
    return { top: itemRect.top - menuRect.top - 4, left };
  }

  const [subPos, setSubPos] = useState({ top: 0, left: 0 });

  function openSub(key: SubMenu, e: React.MouseEvent) {
    if (subMenu === key) { setSubMenu(null); return; }
    setSubMenu(key);
    setSubPos(getSubMenuPosition(e.currentTarget as HTMLElement));
  }

  const itemCls = "flex items-center gap-2.5 w-full px-3 py-[7px] text-[13px] text-white/70 hover:bg-white/[0.06] transition-colors cursor-default";
  const subItemCls = "flex items-center gap-2.5 w-full px-3 py-[6px] text-[13px] text-white/60 hover:bg-white/[0.06] transition-colors cursor-default";

  return (
    <div className="fixed inset-0 z-[100]" onClick={onClose}>
      <div ref={menuRef} onClick={e => e.stopPropagation()}
        className="absolute bg-[#1c1a18] border border-white/[0.1] rounded-xl shadow-2xl shadow-black/60 py-1.5 min-w-[200px] select-none"
        style={{ left: adjustedPos.x, top: adjustedPos.y }}>

        <button className={itemCls} onMouseEnter={e => openSub("status", e)} onClick={e => openSub("status", e)}>
          <StatusIcon status={currentStatus} className="h-4 w-4" /><span className="flex-1 text-left">Status</span><ChevronRight className="h-3.5 w-3.5 text-white/25" />
        </button>

        <button className={itemCls} onMouseEnter={e => openSub("priority", e)} onClick={e => openSub("priority", e)}>
          <PriorityIcon priority={task.priority} className="h-4 w-4" /><span className="flex-1 text-left">Priority</span><ChevronRight className="h-3.5 w-3.5 text-white/25" />
        </button>

        <button className={itemCls} onMouseEnter={e => openSub("project", e)} onClick={e => openSub("project", e)}>
          <div className={cn("h-3 w-3 rounded-full", getProjectColor(task.project))} /><span className="flex-1 text-left">Project</span><ChevronRight className="h-3.5 w-3.5 text-white/25" />
        </button>

        <div className="my-1.5 border-t border-white/[0.06]" />

        <button className={itemCls} onMouseEnter={() => setSubMenu(null)} onClick={() => { onEdit(); onClose(); }}>
          <Pencil className="h-4 w-4" /><span className="flex-1 text-left">Edit…</span>
        </button>

        {(task.status === "inbox" || task.status === "todo") && onStart && (
          <button className={itemCls} onMouseEnter={() => setSubMenu(null)} onClick={() => { onStart(); onClose(); }}>
            <Play className="h-4 w-4" /><span className="flex-1 text-left">Start</span>
          </button>
        )}
        {task.status === "in_progress" && (
          <button className={itemCls} onMouseEnter={() => setSubMenu(null)} onClick={() => { onStatusChange("done"); onClose(); }}>
            <Check className="h-4 w-4" /><span className="flex-1 text-left">Complete</span>
          </button>
        )}
        {task.status === "done" && (
          <button className={itemCls} onMouseEnter={() => setSubMenu(null)} onClick={() => { onStatusChange("inbox"); onClose(); }}>
            <Pause className="h-4 w-4" /><span className="flex-1 text-left">Reopen</span>
          </button>
        )}

        <button className={itemCls} onMouseEnter={() => setSubMenu(null)} onClick={() => { navigator.clipboard.writeText(task.summary); onClose(); }}>
          <Copy className="h-4 w-4" /><span className="flex-1 text-left">Copy title</span>
        </button>

        <div className="my-1.5 border-t border-white/[0.06]" />

        <button className={cn(itemCls, "text-red-400/70 hover:bg-red-500/10")} onMouseEnter={() => setSubMenu(null)} onClick={() => setConfirmDelete(true)}>
          <Trash2 className="h-4 w-4" /><span className="flex-1 text-left">Delete</span>
        </button>
        <ConfirmDeleteModal open={confirmDelete}
          message={<>Delete <strong className="text-white/80">{task.summary}</strong>? This can&apos;t be undone.</>}
          onConfirm={() => { onDelete(); onClose(); }} onCancel={() => setConfirmDelete(false)} />

        {/* Submenus */}
        {subMenu === "status" && (
          <div className="absolute bg-[#1c1a18] border border-white/[0.1] rounded-xl shadow-2xl shadow-black/60 py-1.5 min-w-[160px]"
            style={{ top: subPos.top, left: subPos.left }}>
            {statusOptions.map(s => (
              <button key={s.key} className={subItemCls} onClick={() => { onStatusChange(s.key); onClose(); }}>
                <StatusIcon status={s.key} className="h-4 w-4 shrink-0" /><span className="flex-1 text-left">{s.label}</span>
                {currentStatus === s.key && <Check className="h-3.5 w-3.5 text-orange-400" />}
              </button>
            ))}
          </div>
        )}

        {subMenu === "priority" && (
          <div className="absolute bg-[#1c1a18] border border-white/[0.1] rounded-xl shadow-2xl shadow-black/60 py-1.5 min-w-[160px]"
            style={{ top: subPos.top, left: subPos.left }}>
            {priOptions.map(p => (
              <button key={p.key} className={subItemCls} onClick={() => { onPriorityChange(p.key === "none" ? undefined : p.key as Task["priority"]); onClose(); }}>
                <PriorityIcon priority={p.key === "none" ? undefined : p.key} className="h-4 w-4 shrink-0" /><span className="flex-1 text-left">{p.label}</span>
                {(task.priority || "none") === p.key && <Check className="h-3.5 w-3.5 text-orange-400" />}
              </button>
            ))}
          </div>
        )}

        {subMenu === "project" && (
          <div className="absolute bg-[#1c1a18] border border-white/[0.1] rounded-xl shadow-2xl shadow-black/60 py-1.5 min-w-[170px] max-h-[300px] overflow-y-auto"
            style={{ top: subPos.top, left: subPos.left }}>
            {allProjects.map(p => (
              <button key={p} className={subItemCls} onClick={() => { onProjectChange(p); onClose(); }}>
                <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", getProjectColor(p))} /><span className="flex-1 text-left">{projLabel(p)}</span>
                {(task.project || "general") === p && <Check className="h-3.5 w-3.5 text-orange-400" />}
              </button>
            ))}
            {onCreateProject && (
              <>
                <div className="my-1 border-t border-white/[0.06]" />
                <button className={subItemCls} onClick={() => { onCreateProject(); onClose(); }}>
                  <Plus className="h-3.5 w-3.5 text-orange-400" /><span className="text-orange-400">New project</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
