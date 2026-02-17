"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Inbox,
  CheckCircle2,
  Zap,
  Loader2,
  WifiOff,
  ListTodo,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  Play,
  Pause,
  Search,
  MoreHorizontal,
} from "lucide-react";
import { useGateway } from "@/lib/gateway-context";
import { cn } from "@/lib/utils";
import { TaskChat } from "@/components/task-chat";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import { PriorityIcon, priOptions, projLabel } from "@/components/ui/priority-icon";
import { StatusIcon } from "@/components/ui/status-icon";
import { useSettings } from "@/lib/use-settings";
import { useProjects } from "@/lib/use-projects";
import { useTasks } from "@/lib/use-tasks";
import { timeAgo, priSort, generateSessionKey } from "@/lib/task-utils";
import type { Task } from "@/lib/types";
import { CreateMenu } from "@/components/ui/create-menu";

// ─── Types ───

// Task type imported from @/lib/types

// ─── Helpers ───

const statusTabs = [
  { key: "inbox", label: "Inbox", icon: Inbox },
  { key: "active", label: "Active", icon: Zap },
  { key: "done", label: "Done", icon: CheckCircle2 },
] as const;

// timeAgo, priSort, generateSessionKey imported from @/lib/task-utils

const projectLabel = projLabel;

// ─── Main ───

export default function TasksPage() {
  const { rpc, status: connStatus } = useGateway();
  const { settings, saveSettings, getProjectColor } = useSettings();
  const { tasks, loading, saving, saveTasks, updateTask, deleteTask, addTask: addTaskToStore } = useTasks();
  // getProjectColor comes from useSettings hook
  const [activeTab, setActiveTab] = useState<string>("inbox");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSummary, setNewSummary] = useState("");
  const [newProject, setNewProject] = useState("general");
  const [newNote, setNewNote] = useState("");
  const [newPriority, setNewPriority] = useState<Task["priority"]>(undefined);
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const saved = localStorage.getItem("clawhq-collapsed-projects-planning");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [showNewProject, setShowNewProject] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const {
    projectMenuOpen, setProjectMenuOpen,
    confirmDeleteProject, setConfirmDeleteProject,
    editingProject, setEditingProject,
    createProject, deleteProject, saveProjectEdit,
  } = useProjects(tasks, saveTasks);
  const [sortBy, setSortBy] = useState<"project" | "priority" | "date">("project");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeChatTaskId, setActiveChatTaskId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [pendingKickoff, setPendingKickoff] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState("bg-blue-400");

  // Task management via shared useTasks hook

  async function addTask() {
    if (!newSummary.trim()) return;
    await addTaskToStore({
      id: `cap_${Date.now()}`,
      at: new Date().toISOString(),
      type: "task",
      summary: newSummary.trim(),
      project: newProject,
      status: "inbox",
      source: "manual",
      ...(newNote.trim() ? { note: newNote.trim() } : {}),
      ...(newPriority ? { priority: newPriority } : {}),
    });
    setNewSummary("");
    setNewNote("");
    setNewPriority(undefined);
    setShowAddForm(false);
    setActiveTab("inbox");
  }

  function confirmDelete(id: string) {
    setDeleteConfirmId(id);
  }

  async function startTask(id: string) {
    const task = tasks.find(c => c.id === id);
    if (!task) return;
    const sessionKey = task.sessionKey || generateSessionKey(id);
    await updateTask(id, { status: "in_progress", sessionKey });
    setActiveTab("active");
    setActiveChatTaskId(id);
    setExpandedId(null);
  }

  async function openTaskChat(id: string) {
    // Auto-assign sessionKey if missing
    const task = tasks.find(c => c.id === id);
    if (task && !task.sessionKey) {
      const sessionKey = `task-${id.replace("cap_", "")}`;
      await updateTask(id, { sessionKey });
    }
    setActiveChatTaskId(id);
  }

  async function deleteTaskAndDismiss(id: string) {
    await deleteTask(id);
    setDeleteConfirmId(null);
  }

  // Filtered — map old statuses to new tabs + search
  const filtered = useMemo(() => {
    let items: Task[];
    if (activeTab === "inbox") {
      items = tasks.filter(c => c.status === "inbox" || c.status === "todo");
    } else if (activeTab === "active") {
      items = tasks.filter(c => c.status === "in_progress");
    } else if (activeTab === "done") {
      items = tasks.filter(c => c.status === "done");
    } else {
      items = [];
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(c =>
        c.summary.toLowerCase().includes(q) ||
        (c.note || "").toLowerCase().includes(q) ||
        (c.project || "").toLowerCase().includes(q) ||
        (c.type || "").toLowerCase().includes(q)
      );
    }
    return items;
  }, [tasks, activeTab, searchQuery]);

  // priSort imported from @/lib/task-utils

  const grouped = useMemo(() => {
    if (sortBy === "date") {
      // Flat list sorted by date created (newest first)
      const sorted = [...filtered].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      return [["__all", sorted]] as [string, Task[]][];
    }
    if (sortBy === "priority") {
      // Group by priority level
      const priGroups: Record<string, Task[]> = {};
      for (const c of filtered) {
        const key = c.priority || "none";
        if (!priGroups[key]) priGroups[key] = [];
        priGroups[key].push(c);
      }
      const priKeys = ["urgent", "medium", "low", "none"];
      return priKeys
        .filter(k => priGroups[k]?.length)
        .map(k => [`__pri_${k}`, priGroups[k]] as [string, Task[]]);
    }
    const groups: Record<string, Task[]> = {};
    // Seed with all known projects (even empty)
    groups["general"] = [];
    for (const key of Object.keys(settings.projects)) {
      groups[key] = [];
    }
    for (const c of filtered) {
      const proj = c.project || "general";
      if (!groups[proj]) groups[proj] = [];
      groups[proj].push(c);
    }
    // Sort items within each group by priority
    for (const items of Object.values(groups)) {
      items.sort(priSort);
    }
    // Sort groups: general first in inbox, then alphabetical
    const entries = Object.entries(groups).sort((a, b) => {
      if (activeTab === "inbox") {
        if (a[0] === "general") return -1;
        if (b[0] === "general") return 1;
      } else {
        if (a[0] === "general") return 1;
        if (b[0] === "general") return -1;
      }
      return a[0].localeCompare(b[0]);
    });
    return entries;
  }, [filtered, sortBy, settings.projects]);

  // Counts per tab
  const counts = useMemo(() => {
    return {
      inbox: tasks.filter(c => c.status === "inbox" || c.status === "todo").length,
      active: tasks.filter(c => c.status === "in_progress").length,
      done: tasks.filter(c => c.status === "done").length,
    };
  }, [tasks]);

  // All unique projects
  const allProjects = useMemo(() => {
    const set = new Set(tasks.map(c => c.project || "general"));
    set.add("general");
    Object.keys(settings.projects).forEach(k => set.add(k));
    return Array.from(set).sort();
  }, [tasks, settings.projects]);

  function toggleProject(proj: string) {
    setCollapsedProjects(prev => {
      const next = new Set(prev);
      if (next.has(proj)) next.delete(proj);
      else next.add(proj);
      localStorage.setItem("clawhq-collapsed-projects-planning", JSON.stringify([...next]));
      return next;
    });
  }

  if (connStatus !== "connected") {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-white/30">
            {connStatus === "error" ? "Reconnecting…" : "Connecting…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/5 bg-white/[0.01] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <ListTodo className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Planning Queue</h1>
              <p className="text-sm text-white/40">Auto-task your conversations into ideas and tasks so you never forget anything</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saving && (
              <span className="flex items-center gap-1.5 text-[11px] text-white/30">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </span>
            )}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as "project" | "priority" | "date")}
              className="bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-[12px] text-white/60 focus:outline-none focus:border-orange-500/30 appearance-none bg-[length:14px] bg-[right_8px_center] bg-no-repeat bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.3)%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] pr-7"
            >
              <option value="project">Sort by Project</option>
              <option value="priority">Sort by Priority</option>
              <option value="date">Sort by Date Created</option>
            </select>
            <CreateMenu
              variant="button"
              onNewTask={() => setShowAddForm(true)}
              onNewProject={() => setShowNewProject(true)}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 border-b border-white/5 px-6">
        <div className="flex items-center gap-0">
          {statusTabs.map(tab => {
            const count = counts[tab.key] || 0;
            const isActive = activeTab === tab.key;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSelectedTaskId(null); }}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-[15px] font-medium border-b-2 transition-all",
                  isActive
                    ? "border-orange-500 text-white/90"
                    : "border-transparent text-white/35 hover:text-white/60"
                )}
              >
                <TabIcon className={cn("h-3.5 w-3.5", isActive ? "text-orange-400" : "")} />
                {tab.label}
                {count > 0 && (
                  <span className={cn(
                    "text-[11px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                    isActive && tab.key === "inbox"
                      ? "bg-orange-500/20 text-orange-300"
                      : isActive
                        ? "bg-white/10 text-white/60"
                        : "bg-white/5 text-white/30"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          <div className="relative flex-1 ml-auto max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/25" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tasks…"
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-9 pr-8 py-1.5 text-[13px] text-white placeholder-white/20 focus:border-orange-500/30 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#1a1614] shadow-2xl shadow-black/40">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-[15px] font-semibold text-white/90">Add Task</h2>
              <button onClick={() => setShowAddForm(false)} className="text-white/30 hover:text-white/60 transition-colors p-1 rounded-lg hover:bg-white/5">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-5 py-4 space-y-4">
              {/* Summary */}
              <div>
                <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-1.5">Summary</label>
                <input
                  type="text"
                  value={newSummary}
                  onChange={e => setNewSummary(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && newSummary.trim()) addTask(); }}
                  placeholder="What needs to be done?"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white placeholder-white/20 focus:border-orange-500/30 focus:outline-none transition-colors"
                  autoFocus
                />
              </div>

              {/* Project */}
              <div>
                <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-1.5">Project</label>
                <select
                  value={newProject}
                  onChange={e => setNewProject(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 pr-10 py-2 text-[13px] text-white focus:border-orange-500/30 focus:outline-none transition-colors appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.3)%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]"
                >
                  {allProjects.map(p => (
                    <option key={p} value={p}>{projectLabel(p)}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-1.5">Priority</label>
                <div className="flex gap-1">
                  {priorityOptions.map(p => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setNewPriority(p.key === "none" ? undefined : p.key as Task["priority"])}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] border transition-all ${
                        (newPriority || "none") === p.key
                          ? "border-orange-500/40 bg-orange-500/10 text-white/90"
                          : "border-white/[0.06] bg-white/[0.02] text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
                      }`}
                    >
                      <PriorityIcon priority={p.key === "none" ? undefined : p.key} className="h-3.5 w-3.5" />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note (optional) */}
              <div>
                <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-1.5">Note <span className="text-white/20">(optional)</span></label>
                <textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Additional context..."
                  rows={2}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white placeholder-white/20 focus:border-orange-500/30 focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/[0.06]">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-lg text-[13px] text-white/40 hover:text-white/60 hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={addTask}
                disabled={!newSummary.trim()}
                className="px-4 py-2 rounded-lg bg-orange-500 text-white text-[13px] font-medium hover:bg-orange-600 disabled:opacity-30 transition-all"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showNewProject && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewProject(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1614] shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-[15px] font-semibold text-white/90">New Project</h2>
              <button onClick={() => setShowNewProject(false)} className="text-white/30 hover:text-white/60 transition-colors p-1 rounded-lg hover:bg-white/5">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-1.5">Name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="Project name"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white placeholder-white/20 focus:border-orange-500/30 focus:outline-none transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-1.5">Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {["bg-blue-400","bg-purple-400","bg-red-400","bg-orange-400","bg-green-400","bg-yellow-400","bg-pink-400","bg-cyan-400","bg-indigo-400"].map(c => (
                    <button key={c} onClick={() => setNewProjectColor(c)}
                      className={cn("h-6 w-6 rounded-full transition-all", c,
                        newProjectColor === c ? "ring-2 ring-white/50 ring-offset-2 ring-offset-[#1a1614]" : "hover:scale-110"
                      )} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/[0.06]">
              <button onClick={() => setShowNewProject(false)}
                className="px-4 py-2 rounded-lg text-[13px] text-white/40 hover:text-white/60 hover:bg-white/5 transition-all">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!newProjectName.trim()) return;
                  createProject(newProjectName, newProjectColor);
                  setShowNewProject(false);
                  setNewProjectName("");
                  setNewProjectColor("bg-blue-400");
                }}
                disabled={!newProjectName.trim()}
                className="px-4 py-2 rounded-lg bg-orange-500 text-white text-[13px] font-medium hover:bg-orange-600 disabled:opacity-30 transition-all">
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1614] shadow-2xl shadow-black/40 p-5">
            <h3 className="text-[15px] font-semibold text-white/90 mb-2">Delete task?</h3>
            <p className="text-[13px] text-white/40 mb-4">This action cannot be undone.</p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-lg text-[13px] text-white/40 hover:text-white/60 hover:bg-white/5 transition-all">
                Cancel
              </button>
              <button onClick={() => deleteTaskAndDismiss(deleteConfirmId!)}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-[13px] font-medium hover:bg-red-600 transition-all">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          allProjects={allProjects}
          onSave={(patch) => { updateTask(editingTask.id, patch); setEditingTask(null); }}
          onClose={() => setEditingTask(null)}
          onDelete={() => { setEditingTask(null); confirmDelete(editingTask.id); }}
          onCreateProject={() => setShowNewProject(true)}
        />
      )}

      {/* Delete Project Confirmation */}
      {confirmDeleteProject && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDeleteProject(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1614] shadow-2xl shadow-black/40">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-[15px] font-semibold text-white/90">Delete Project</h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-[13px] text-white/60">
                Delete <span className="font-semibold text-white/80">{projectLabel(confirmDeleteProject)}</span>? All tasks will be moved to General.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/[0.06]">
              <button onClick={() => setConfirmDeleteProject(null)}
                className="px-4 py-2 rounded-lg text-[13px] text-white/40 hover:text-white/60 hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={() => deleteProject(confirmDeleteProject)}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-[13px] font-medium hover:bg-red-600 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingProject(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1614] shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-[15px] font-semibold text-white/90">Edit Project</h2>
              <button onClick={() => setEditingProject(null)} className="text-white/30 hover:text-white/60 transition-colors p-1 rounded-lg hover:bg-white/5">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-1.5">Name</label>
                <input type="text" value={editingProject.name}
                  onChange={e => setEditingProject({ ...editingProject, name: e.target.value })}
                  onKeyDown={e => { if (e.key === "Enter") saveProjectEdit(editingProject.key, editingProject.name, editingProject.color); }}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white placeholder-white/20 focus:border-orange-500/30 focus:outline-none transition-colors"
                  autoFocus />
              </div>
              <div>
                <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-1.5">Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {["bg-purple-400", "bg-blue-400", "bg-cyan-400", "bg-teal-400", "bg-green-400", "bg-amber-400", "bg-orange-400", "bg-red-400", "bg-pink-400", "bg-indigo-400", "bg-violet-400", "bg-fuchsia-400", "bg-sky-400"].map(c => (
                    <button key={c} onClick={() => setEditingProject({ ...editingProject, color: c })}
                      className={cn("h-6 w-6 rounded-full transition-all", c,
                        editingProject.color === c ? "ring-2 ring-white/50 ring-offset-2 ring-offset-[#1a1614]" : "hover:scale-110"
                      )} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/[0.06]">
              <button onClick={() => setEditingProject(null)}
                className="px-4 py-2 rounded-lg text-[13px] text-white/40 hover:text-white/60 hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={() => saveProjectEdit(editingProject.key, editingProject.name, editingProject.color)}
                disabled={!editingProject.name.trim()}
                className="px-4 py-2 rounded-lg bg-orange-500 text-white text-[13px] font-medium hover:bg-orange-600 disabled:opacity-30 transition-all">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Content — split view when chat is open */}
      <div className="flex-1 flex overflow-hidden">
      {/* Task list (always visible) */}
      <div className={cn(
        "overflow-y-auto transition-all",
        (activeChatTaskId && activeTab === "active") || (selectedTaskId && activeTab !== "active")
          ? "w-[340px] min-w-[340px] border-r border-white/5" : "flex-1"
      )}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 text-orange-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-3 rounded-xl bg-white/[0.03] mb-4">
              {activeTab === "inbox" ? (
                <Inbox className="h-8 w-8 text-white/15" />
              ) : activeTab === "done" ? (
                <CheckCircle2 className="h-8 w-8 text-white/15" />
              ) : (
                <Zap className="h-8 w-8 text-white/15" />
              )}
            </div>
            <p className="text-[14px] text-white/40 mb-1">
              {activeTab === "inbox"
                ? "Inbox is empty"
                : activeTab === "done"
                  ? "No completed tasks yet"
                  : "Nothing active"}
            </p>
            <p className="text-[12px] text-white/20 max-w-xs">
              {activeTab === "inbox"
                ? "Tasks will appear here as your agent tasks them from conversations"
                : "Start a task from inbox to move it here"}
            </p>
          </div>
        ) : (
          <div className="px-6 py-4 space-y-4">
            {/* Grouped task list */}
            {(
              /* Grouped view for all tabs */
              <div className="space-y-4">
                {grouped.map(([proj, items]) => {
                  const isAllGroup = proj === "__all";
                  const isPriGroup = proj.startsWith("__pri_");
                  const priKey = isPriGroup ? proj.replace("__pri_", "") : null;
                  const priLabel = priKey ? (priorityOptions.find(p => p.key === priKey)?.label || priKey) : null;

                  if (isAllGroup) {
                    return (
                      <div key={proj} className="space-y-1">
                        {items.map(task => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            expanded={false}
                            onToggle={() => { setSelectedTaskId(selectedTaskId === task.id ? null : task.id); }}
                            onStatusChange={(status) => updateTask(task.id, { status })}
                            onDelete={() => confirmDelete(task.id)}
                            onUpdate={(patch) => updateTask(task.id, patch)}
                            allProjects={allProjects}
                            onCreateProject={() => setShowNewProject(true)}
                            onEditOpen={() => setSelectedTaskId(task.id)}
                            onStart={() => startTask(task.id)}
                            onOpenChat={() => openTaskChat(task.id)}
                            isActiveChat={activeChatTaskId === task.id}
                            isSelected={selectedTaskId === task.id}
                          />
                        ))}
                      </div>
                    );
                  }

                  return (
                  <div key={proj}>
                    {isPriGroup ? (
                      <button
                        onClick={() => toggleProject(proj)}
                        className="flex items-center gap-2 mb-2 group"
                      >
                        {collapsedProjects.has(proj) ? (
                          <ChevronRight className="h-3.5 w-3.5 text-white/25" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-white/25" />
                        )}
                        <PriorityIcon priority={priKey === "none" ? undefined : priKey!} className="h-3.5 w-3.5" />
                        <span className="text-[14px] leading-none font-semibold text-white/70 group-hover:text-white/90 transition-colors">
                          {priLabel}
                        </span>
                        <span className="text-[14px] leading-none text-white/25 ml-1 font-normal">{items.length}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={() => toggleProject(proj)}
                          className="flex items-center gap-2 group"
                        >
                          {collapsedProjects.has(proj) ? (
                            <ChevronRight className="h-3.5 w-3.5 text-white/25" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-white/25" />
                          )}
                          <div className={cn("h-2.5 w-2.5 rounded-full", getProjectColor(proj))} />
                          <span className="text-[14px] leading-none font-semibold text-white/70 group-hover:text-white/90 transition-colors">
                            {projectLabel(proj)}
                          </span>
                          <span className="text-[14px] leading-none text-white/25 ml-1 font-normal">{items.length}</span>
                        </button>
                        <div className="flex-1" />
                        {proj !== "general" && (
                          <div className="relative">
                            <button onClick={() => setProjectMenuOpen(projectMenuOpen === proj ? null : proj)}
                              className="p-1 rounded-md text-white/20 hover:text-white/50 hover:bg-white/5 transition-all">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                            {projectMenuOpen === proj && (<>
                              <div className="fixed inset-0 z-40" onClick={() => setProjectMenuOpen(null)} />
                              <div className="absolute right-0 top-7 z-50 bg-[#1a1614] border border-white/10 rounded-lg shadow-xl py-1 min-w-[130px]">
                                <button onClick={() => { setEditingProject({ key: proj, name: projectLabel(proj), color: getProjectColor(proj) }); setProjectMenuOpen(null); }}
                                  className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors">
                                  <Pencil className="h-3 w-3" /> Edit
                                </button>
                                <button onClick={() => { setConfirmDeleteProject(proj); setProjectMenuOpen(null); }}
                                  className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                  <Trash2 className="h-3 w-3" /> Delete
                                </button>
                              </div>
                            </>)}
                          </div>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); setNewProject(proj); setNewSummary(""); setNewNote(""); setShowAddForm(true); }}
                          className="p-1 rounded-md text-white/25 hover:text-orange-400 hover:bg-white/5 transition-all"
                          title={`Add task to ${projectLabel(proj)}`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    {!collapsedProjects.has(proj) && (
                      <div className="ml-3 space-y-1">
                        {items.map(task => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            expanded={false}
                            onToggle={() => { setSelectedTaskId(selectedTaskId === task.id ? null : task.id); }}
                            onStatusChange={(status) => updateTask(task.id, { status })}
                            onDelete={() => confirmDelete(task.id)}
                            onUpdate={(patch) => updateTask(task.id, patch)}
                            allProjects={allProjects}
                            onCreateProject={() => setShowNewProject(true)}
                            onEditOpen={() => setSelectedTaskId(task.id)}
                            onStart={() => startTask(task.id)}
                            onOpenChat={() => openTaskChat(task.id)}
                            isActiveChat={activeChatTaskId === task.id}
                            isSelected={selectedTaskId === task.id}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat panel (right side, active tab only) */}
      {/* Detail panel (right side, inbox/done tabs) */}
      {selectedTaskId && activeTab !== "active" && (() => {
        const task = tasks.find(c => c.id === selectedTaskId);
        if (!task) return null;
        return (
          <TaskDetailPanel
            task={task}
            allProjects={allProjects}
            onUpdate={(patch) => updateTask(task.id, patch)}
            onDelete={() => { deleteTask(task.id); setSelectedTaskId(null); }}
            onStart={() => startTask(task.id)}
            onClose={() => setSelectedTaskId(null)}
            onCreateProject={() => setShowNewProject(true)}
          />
        );
      })()}

      {/* Chat panel (right side, active tab only) */}
      {activeChatTaskId && activeTab === "active" && (() => {
        const task = tasks.find(c => c.id === activeChatTaskId);
        if (!task || !task.sessionKey) return null;
        return (
          <div className="flex-1 min-w-0">
            <TaskChat
              task={{
                id: task.id,
                summary: task.summary,
                sessionKey: task.sessionKey!,
                note: task.note,
                project: task.project,
                priority: task.priority,
                status: task.status,
                at: task.at,
              }}
              allProjects={allProjects}
              onBack={() => setActiveChatTaskId(null)}
              onStatusChange={(status) => { updateTask(task.id, { status: status as Task["status"] }); if (status !== "in_progress") { setActiveChatTaskId(null); } }}
              onPriorityChange={(pri) => updateTask(task.id, { priority: pri as Task["priority"] })}
              onProjectChange={(proj) => updateTask(task.id, { project: proj })}
              onEdit={() => setEditingTask(task)}
              onDelete={() => { deleteTask(task.id); setActiveChatTaskId(null); }}
              initialMessage={pendingKickoff ?? undefined}
              onInitialMessageSent={() => setPendingKickoff(null)}
            />
          </div>
        );
      })()}
      </div>
    </div>
  );
}


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

// PriorityIcon and priorityOptions imported from @/components/ui/priority-icon
const priorityOptions = priOptions;

// ─── Linear-style Status Icon ───

// StatusIcon imported from @/components/ui/status-icon

// ─── Dropdown wrapper with click-outside ───

function Dropdown({ show, onClose, children, className }: {
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

// ─── Task Row ───

function TaskRow({
  task,
  expanded,
  onToggle,
  onStatusChange,
  onDelete,
  onUpdate,
  allProjects,
  onCreateProject,
  onEditOpen,
  onStart,
  onOpenChat,
  isActiveChat,
  isSelected,
}: {
  task: Task;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (status: Task["status"]) => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<Task>) => void;
  allProjects: string[];
  onCreateProject: () => void;
  onEditOpen: () => void;
  onStart?: () => void;
  onOpenChat?: () => void;
  isActiveChat?: boolean;
  isSelected?: boolean;
}) {
  const { getProjectColor } = useSettings();
  const isDone = task.status === "done";
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const description = task.note || "";

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
      <div className="flex items-center gap-2.5 px-4 py-3 cursor-pointer hover:bg-white/[0.01] transition-all" onClick={() => {
        if (task.status === "in_progress" && onOpenChat) { onOpenChat(); } else { onToggle(); }
      }}>
        {/* Priority icon — Linear-style bars */}
        <div className="relative shrink-0 flex items-center">
          <button
            onClick={e => { e.stopPropagation(); setShowPriorityPicker(!showPriorityPicker); }}
            className="hover:scale-110 transition-transform flex items-center"
            title={priorityOptions.find(p => p.key === (task.priority || "none"))?.label}
          >
            <PriorityIcon priority={task.priority} />
          </button>
          <Dropdown show={showPriorityPicker} onClose={() => setShowPriorityPicker(false)} className="min-w-[170px]">
            {priorityOptions.map(p => (
              <button key={p.key}
                onClick={e => { e.stopPropagation(); onUpdate({ priority: p.key === "none" ? undefined : p.key as Task["priority"] }); setShowPriorityPicker(false); }}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-all">
                <PriorityIcon priority={p.key === "none" ? undefined : p.key} className="h-4.5 w-4.5" />
                <span className="text-[13px] text-white/60">{p.label}</span>
                {(task.priority || "none") === p.key && <Check className="h-3.5 w-3.5 text-orange-400 ml-auto" />}
              </button>
            ))}
          </Dropdown>
        </div>

        {/* Status icon — Linear-style */}
        <div className="relative shrink-0 flex items-center">
          <button
            onClick={e => { e.stopPropagation(); setShowStatusPicker(!showStatusPicker); }}
            className="hover:scale-110 transition-transform flex items-center"
          >
            <StatusIcon status={task.status === "todo" ? "inbox" : task.status} />
          </button>
          <Dropdown show={showStatusPicker} onClose={() => setShowStatusPicker(false)} className="min-w-[140px]">
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
          </Dropdown>
        </div>

        {/* Title */}
        <span className={cn(
          "flex-1 text-[14px] font-medium min-w-0 truncate",
          isDone ? "text-white/40 line-through" : "text-white/80"
        )}>
          {task.summary}
        </span>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className={cn("h-2 w-2 rounded-full", getProjectColor(task.project))} />
            <span className="text-[11px] text-white/30">{projectLabel(task.project)}</span>
          </div>
          <span className="text-[11px] text-white/20">{timeAgo(task.at)}</span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-3 space-y-3 border-t border-white/5 pt-3">
          {/* Description preview */}
          {description && (
            <p className="text-[13px] text-white/40 whitespace-pre-wrap line-clamp-3">{description}</p>
          )}

          {/* Project picker + Edit + Status actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Project picker */}
            <div className="relative">
              <button
                onClick={e => { e.stopPropagation(); setShowProjectPicker(!showProjectPicker); }}
                className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all"
              >
                <div className={cn("h-2.5 w-2.5 rounded-full", getProjectColor(task.project))} />
                <span className="text-white/60">{projectLabel(task.project)}</span>
                <ChevronDown className="h-3.5 w-3.5 text-white/25" />
              </button>
              <Dropdown show={showProjectPicker} onClose={() => setShowProjectPicker(false)} className="min-w-[170px]">
                {allProjects.map(p => (
                  <button key={p}
                    onClick={e => { e.stopPropagation(); onUpdate({ project: p }); setShowProjectPicker(false); }}
                    className="w-full text-left flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-all">
                    <div className={cn("h-2 w-2 rounded-full", getProjectColor(p))} />
                    <span className="text-[12px] text-white/60">{projectLabel(p)}</span>
                    {(task.project || "general") === p && <Check className="h-3 w-3 text-orange-400 ml-auto" />}
                  </button>
                ))}
                <div className="border-t border-white/5 mt-1 pt-1">
                  <button
                    onClick={e => { e.stopPropagation(); setShowProjectPicker(false); onCreateProject(); }}
                    className="w-full text-left flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-all">
                    <Plus className="h-3 w-3 text-orange-400" />
                    <span className="text-[12px] text-orange-400">New project</span>
                  </button>
                </div>
              </Dropdown>
            </div>

            {/* Edit button */}
            <button
              onClick={e => { e.stopPropagation(); onEditOpen(); }}
              className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 hover:border-white/20 text-white/50 hover:text-white/80 transition-all"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>

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

            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-all ml-auto"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Edit Task Modal ───

function EditTaskModal({
  task,
  allProjects,
  onSave,
  onClose,
  onDelete,
  onCreateProject,
}: {
  task: Task;
  allProjects: string[];
  onSave: (patch: Partial<Task>) => void;
  onClose: () => void;
  onDelete: () => void;
  onCreateProject: () => void;
}) {
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
            <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-1.5">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white placeholder-white/20 focus:border-orange-500/30 focus:outline-none transition-colors"
              autoFocus />
          </div>
          <div>
            <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Add details..." rows={4}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white placeholder-white/20 focus:border-orange-500/30 focus:outline-none transition-colors resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-1.5">Project</label>
              <select value={project} onChange={e => setProject(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 pr-10 py-2 text-[13px] text-white focus:border-orange-500/30 focus:outline-none transition-colors appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.3)%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]">
                {allProjects.map(p => (
                  <option key={p} value={p}>{projectLabel(p)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-1.5">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 pr-10 py-2 text-[13px] text-white focus:border-orange-500/30 focus:outline-none transition-colors appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.3)%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]">
                {priorityOptions.map(p => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
          <button onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg text-[13px] text-white/40 hover:text-white/60 hover:bg-white/5 transition-all">
              Cancel
            </button>
            <button
              onClick={() => onSave({
                summary: title,
                note: description,
                project,
                priority: priority === "none" ? undefined : priority as Task["priority"],
              })}
              className="px-4 py-2 rounded-lg bg-orange-500 text-white text-[13px] font-medium hover:bg-orange-600 transition-all">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
