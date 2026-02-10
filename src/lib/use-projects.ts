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

  const createProject = useCallback(async (name: string, color?: string) => {
    const key = name.trim().toLowerCase();
    if (!key) return;
    const projects = { ...settings.projects, [key]: { color: color || undefined } };
    await saveSettings({ projects });
  }, [settings, saveSettings]);

  const deleteProject = useCallback(async (proj: string) => {
    const updated = tasks.map(c => c.project === proj ? { ...c, project: "general" } : c);
    await saveTasks(updated);
    const projects = { ...settings.projects };
    delete projects[proj];
    await saveSettings({ projects });
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
    const projects = { ...settings.projects };
    if (newKey !== oldKey && projects[oldKey]) delete projects[oldKey];
    projects[newKey] = { ...projects[newKey], color: color || projects[newKey]?.color };
    await saveSettings({ projects });
    setEditingProject(null);
    setProjectMenuOpen(null);
  }, [tasks, saveTasks, settings, saveSettings]);

  return {
    projectMenuOpen, setProjectMenuOpen,
    confirmDeleteProject, setConfirmDeleteProject,
    editingProject, setEditingProject,
    createProject,
    deleteProject,
    saveProjectEdit,
  };
}
