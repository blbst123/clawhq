"use client";

import { useState, useEffect, useCallback } from "react";
import { useGateway } from "@/lib/gateway-context";
import { createStore } from "@/lib/create-store";

export interface ProjectMeta {
  color?: string;
}

export interface ClawHQSettings {
  projects: Record<string, ProjectMeta>;
}

const DEFAULT_SETTINGS: ClawHQSettings = { projects: {} };
const SETTINGS_PATH = "data/clawhq/settings.json";

const store = createStore<ClawHQSettings>(null);

export function useSettings() {
  const { rpc, status } = useGateway();
  const [settings, setSettingsLocal] = useState<ClawHQSettings>(store.get() || DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(!!store.get());

  useEffect(() => {
    return store.subscribe(() => {
      const v = store.get();
      if (v) setSettingsLocal({ projects: { ...v.projects } });
    });
  }, []);

  useEffect(() => {
    if (!rpc || status !== "connected" || store.get()) return;
    (async () => {
      try {
        const result = await rpc.request<{ content: string }>("clawhq.files.read", { path: SETTINGS_PATH });
        if (result?.content) {
          const raw = JSON.parse(result.content);
          store.set({ projects: { ...DEFAULT_SETTINGS.projects, ...(raw.projects || {}) } });
        }
      } catch {
        store.set({ ...DEFAULT_SETTINGS });
      }
      setLoaded(true);
    })();
  }, [rpc, status]);

  const saveSettings = useCallback(async (patch: Partial<ClawHQSettings>) => {
    const base = store.get() || DEFAULT_SETTINGS;
    const updated: ClawHQSettings = {
      projects: patch.projects ? { ...patch.projects } : { ...base.projects },
    };
    store.set(updated);
    try {
      await rpc?.request("clawhq.files.write", {
        path: SETTINGS_PATH,
        content: JSON.stringify(updated, null, 2),
      });
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  }, [rpc]);

  const getProjectColor = useCallback((proj?: string): string => {
    const key = (proj || "").toLowerCase().trim();
    if (!key || key === "general") return "bg-white/40";
    const custom = settings.projects[key]?.color;
    if (custom) return custom;
    const palette = [
      "bg-purple-400", "bg-blue-400", "bg-cyan-400", "bg-teal-400", "bg-green-400",
      "bg-emerald-400", "bg-amber-400", "bg-orange-400", "bg-red-400", "bg-pink-400",
      "bg-rose-400", "bg-indigo-400", "bg-violet-400", "bg-fuchsia-400", "bg-sky-400",
    ];
    let h = 0;
    for (let i = 0; i < key.length; i++) { h = ((h << 5) - h + key.charCodeAt(i)) | 0; }
    return palette[Math.abs(h) % palette.length];
  }, [settings.projects]);

  return { settings, loaded, saveSettings, getProjectColor };
}
