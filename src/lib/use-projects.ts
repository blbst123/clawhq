import { useState, useCallback } from "react";
import type { Task } from "@/lib/types";
import { useSettings } from "./use-settings";

export function useProjects(
  tasks: Task[],
  saveTasks: (t: Task[]) => Promise<void>,
) {
  const { settings, saveSettings } = useSettings();

  const [projectMenuOpen, setProjectMenuOpen] = useState<string | null>(null);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<{ key: string; name: string; color: string } | null>(null);

  const deleteProject = useCallback(async (proj: string) => {
    const updated = tasks.map(c => c.project === proj ? { ...c, project: "general" } : c);
    await saveTasks(updated);
    const colors = { ...settings.projectColors };
    delete colors[proj];
    await saveSettings({ projectColors: colors });
    setConfirmDeleteProject(null);
    setProjectMenuOpen(null);
  }, [tasks, saveTasks, settings, saveSettings]);

  const saveProjectEdit = useCallback(async (oldKey: string, newName: string, color?: string) => {
    const newKey = newName.trim().toLowerCase();
    if (!newKey) { setEditingProject(null); return; }
    if (newKey !== oldKey) {
      const updated = tasks.map(c => c.project === oldKey ? { ...c, project: newKey } : c);
      await saveTasks(updated);
    }
    const colors = { ...settings.projectColors };
    if (newKey !== oldKey && colors[oldKey]) delete colors[oldKey];
    if (color) colors[newKey] = color;
    await saveSettings({ projectColors: colors });
    setEditingProject(null);
    setProjectMenuOpen(null);
  }, [tasks, saveTasks, settings, saveSettings]);

  return {
    projectMenuOpen, setProjectMenuOpen,
    confirmDeleteProject, setConfirmDeleteProject,
    editingProject, setEditingProject,
    deleteProject,
    saveProjectEdit,
  };
}
