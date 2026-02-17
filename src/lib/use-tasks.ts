"use client";

import { useState, useEffect, useCallback } from "react";
import { useGateway } from "@/lib/gateway-context";
import type { Task } from "@/lib/types";

const TASKS_PATH = "data/clawhq/tasks.json";
const TASKS_API = "/api/clawhq/tasks.json";

// Module-level cache shared across components
let tasksCache: { data: Task[]; ts: number } | null = null;
let tasksListeners = new Set<() => void>();

const LS_KEY = "clawhq-tasks-cache";
const LS_MAX_AGE = 5 * 60_000; // 5 min staleness for localStorage cache

// Hydrate from localStorage on module load
try {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.data && Date.now() - parsed.ts < LS_MAX_AGE) {
        tasksCache = parsed;
      }
    }
  }
} catch { /* ignore */ }

function notifyListeners() {
  tasksListeners.forEach(fn => fn());
}

function persistCache(data: Task[]) {
  const entry = { data, ts: Date.now() };
  tasksCache = entry;
  try { localStorage.setItem(LS_KEY, JSON.stringify(entry)); } catch { /* */ }
}

export function useTasks() {
  const { rpc, status: connStatus } = useGateway();
  const [tasks, setTasksLocal] = useState<Task[]>(tasksCache?.data ?? []);
  const [loading, setLoading] = useState(!tasksCache);
  const [saving, setSaving] = useState(false);

  // Subscribe to cache changes from other components
  useEffect(() => {
    const handler = () => {
      if (tasksCache) setTasksLocal([...tasksCache.data]);
    };
    tasksListeners.add(handler);
    return () => { tasksListeners.delete(handler); };
  }, []);

  // Load on mount and retry when connection establishes
  useEffect(() => {
    if (tasksCache) { setTasksLocal(tasksCache.data); setLoading(false); return; }
    if (connStatus === "connected") loadTasks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connStatus]);

  async function loadTasks() {
    setLoading(true);
    try {
      const res = await fetch(TASKS_API);
      if (res.ok) {
        const parsed = await res.json();
        const data = Array.isArray(parsed) ? parsed : [];
        persistCache(data);
        setTasksLocal(data);
        notifyListeners();
        setLoading(false);
        return;
      }
    } catch { /* fallback to RPC */ }
    try {
      const result = await rpc?.request<{ content: string }>("clawhq.files.read", { path: TASKS_PATH });
      if (result?.content) {
        const data = JSON.parse(result.content);
        const arr = Array.isArray(data) ? data : [];
        persistCache(arr);
        setTasksLocal(arr);
        notifyListeners();
      }
    } catch { /* */ }
    setLoading(false);
  }

  const saveTasks = useCallback(async (updated: Task[]) => {
    setSaving(true);
    try {
      await rpc?.request("clawhq.files.write", { path: TASKS_PATH, content: JSON.stringify(updated, null, 2) });
    } catch { /* */ }
    persistCache(updated);
    setTasksLocal(updated);
    notifyListeners();
    setSaving(false);
  }, [rpc]);

  const updateTask = useCallback(async (id: string, patch: Partial<Task>) => {
    const current = tasksCache?.data ?? tasks;
    const updated = current.map(t => t.id === id ? { ...t, ...patch } : t);
    await saveTasks(updated);
  }, [saveTasks, tasks]);

  const deleteTask = useCallback(async (id: string) => {
    const current = tasksCache?.data ?? tasks;
    const updated = current.filter(t => t.id !== id);
    await saveTasks(updated);
  }, [saveTasks, tasks]);

  const addTask = useCallback(async (task: Task) => {
    const current = tasksCache?.data ?? tasks;
    const updated = [task, ...current];
    await saveTasks(updated);
  }, [saveTasks, tasks]);

  return { tasks, loading, saving, saveTasks, updateTask, deleteTask, addTask, reload: loadTasks };
}
