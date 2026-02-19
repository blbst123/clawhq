"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useGateway } from "@/lib/gateway-context";
import { createStore } from "@/lib/create-store";
import type { Task } from "@/lib/types";

const TASKS_PATH = "data/clawhq/tasks.json";

const store = createStore<{ data: Task[]; ts: number }>(null);
/** Monotonic version counter — incremented on every local write */
let localVersion = 0;

const LS_KEY = "clawhq-tasks-cache";
const LS_MAX_AGE = 5 * 60_000;

// Hydrate from localStorage on module load
try {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.data && Date.now() - parsed.ts < LS_MAX_AGE) {
        store.set(parsed);
      }
    }
  }
} catch { /* ignore */ }

function persistCache(data: Task[]) {
  localVersion++;
  const entry = { data, ts: Date.now() };
  store.set(entry);
  try { localStorage.setItem(LS_KEY, JSON.stringify(entry)); } catch { /* */ }
}

export function useTasks() {
  const { rpc, status: connStatus } = useGateway();
  const [tasks, setTasksLocal] = useState<Task[]>(store.get()?.data ?? []);
  const [loading, setLoading] = useState(!store.get());
  const [saving, setSaving] = useState(false);
  const loadedVersion = useRef(localVersion);

  useEffect(() => {
    return store.subscribe(() => {
      const v = store.get();
      if (v) setTasksLocal([...v.data]);
    });
  }, []);

  useEffect(() => {
    if (store.get()) { setTasksLocal(store.get()!.data); setLoading(false); return; }
    if (connStatus === "connected") loadTasks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connStatus]);

  async function loadTasks() {
    if (localVersion > loadedVersion.current) return;
    setLoading(true);
    try {
      const result = await rpc?.request<{ content: string }>("clawhq.files.read", { path: TASKS_PATH });
      if (result?.content) {
        const data = JSON.parse(result.content);
        const arr = Array.isArray(data) ? data : [];
        if (localVersion <= loadedVersion.current) {
          persistCache(arr);
          loadedVersion.current = localVersion;
          setTasksLocal(arr);
        }
      }
    } catch { /* */ }
    setLoading(false);
  }

  const saveTasks = useCallback(async (updated: Task[]) => {
    setSaving(true);
    persistCache(updated);
    setTasksLocal(updated);
    try {
      await rpc?.request("clawhq.files.write", { path: TASKS_PATH, content: JSON.stringify(updated, null, 2) });
      loadedVersion.current = localVersion;
    } catch (e) {
      console.error("Failed to save tasks:", e);
    }
    setSaving(false);
  }, [rpc]);

  const updateTask = useCallback(async (id: string, patch: Partial<Task>) => {
    const current = store.get()?.data ?? tasks;
    const updated = current.map(t => t.id === id ? { ...t, ...patch } : t);
    await saveTasks(updated);
  }, [saveTasks, tasks]);

  const deleteTask = useCallback(async (id: string) => {
    const current = store.get()?.data ?? tasks;
    const updated = current.filter(t => t.id !== id);
    await saveTasks(updated);
  }, [saveTasks, tasks]);

  const addTask = useCallback(async (task: Task) => {
    const current = store.get()?.data ?? tasks;
    const updated = [task, ...current];
    await saveTasks(updated);
  }, [saveTasks, tasks]);

  return { tasks, loading, saving, saveTasks, updateTask, deleteTask, addTask, reload: loadTasks };
}
