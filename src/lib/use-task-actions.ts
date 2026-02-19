"use client";

import { useCallback, useRef } from "react";
import { useTasks } from "@/lib/use-tasks";
import { useToast } from "@/components/ui/toast";
import type { Task } from "@/lib/types";

/**
 * Wraps useTasks with toast notifications for all mutations.
 * Use this in pages instead of calling useTasks + toast directly.
 */
export function useTaskActions() {
  const { tasks, loading, saving, saveTasks, updateTask: _updateTask, deleteTask: _deleteTask, addTask: _addTask, reload } = useTasks();
  const { toast } = useToast();

  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const addTask = useCallback(async (task: Task) => {
    await _addTask(task);
    toast("success", `Created task "${task.summary.slice(0, 50)}${task.summary.length > 50 ? "…" : ""}"`);
  }, [_addTask, toast]);

  const updateTask = useCallback(async (id: string, patch: Partial<Task>) => {
    await _updateTask(id, patch);
    const task = tasksRef.current.find(t => t.id === id);
    const name = task ? `"${task.summary.slice(0, 40)}${task.summary.length > 40 ? "…" : ""}"` : "Task";
    if (patch.status === "done") toast("success", `${name} marked as done`);
    else if (patch.status === "in_progress") toast("info", `${name} started`);
    else if (patch.status === "inbox") toast("info", `${name} moved to inbox`);
    else if (patch.priority !== undefined) {
      const priLabel = patch.priority ? patch.priority.charAt(0).toUpperCase() + patch.priority.slice(1) : "None";
      toast("success", `${name} priority set to ${priLabel}`);
    }
    else if (patch.project !== undefined) toast("success", `${name} project updated`);
    else if (patch.summary !== undefined) toast("success", `${name} updated`);
  }, [_updateTask, toast]);

  const deleteTask = useCallback(async (id: string) => {
    const task = tasksRef.current.find(t => t.id === id);
    const name = task ? `"${task.summary.slice(0, 40)}${task.summary.length > 40 ? "…" : ""}"` : "Task";
    await _deleteTask(id);
    toast("delete", `${name} deleted`);
  }, [_deleteTask, toast]);

  return { tasks, loading, saving, saveTasks, addTask, updateTask, deleteTask, reload };
}
