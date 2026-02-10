"use client";

import { useState, useEffect, useCallback } from "react";
import { useGateway } from "@/lib/gateway-context";

export interface ClawHQSettings {
  projectColors: Record<string, string>;
}

const DEFAULT_SETTINGS: ClawHQSettings = { projectColors: {} };
const SETTINGS_PATH = "data/clawhq/settings.json";

// Module-level cache so all components share the same data
let settingsCache: ClawHQSettings | null = null;
let settingsListeners = new Set<() => void>();

function notifyListeners() {
  settingsListeners.forEach(fn => fn());
}

export function useSettings() {
  const { rpc, status } = useGateway();
  const [settings, setSettingsLocal] = useState<ClawHQSettings>(settingsCache || DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(!!settingsCache);

  // Subscribe to cache changes
  useEffect(() => {
    const handler = () => {
      if (settingsCache) setSettingsLocal({ ...settingsCache });
    };
    settingsListeners.add(handler);
    return () => { settingsListeners.delete(handler); };
  }, []);

  // Load on mount
  useEffect(() => {
    if (!rpc || status !== "connected" || settingsCache) return;
    (async () => {
      try {
        const result = await rpc.request<{ content: string }>("clawhq.files.read", { path: SETTINGS_PATH });
        if (result?.content) {
          settingsCache = { ...DEFAULT_SETTINGS, ...JSON.parse(result.content) };
          setSettingsLocal({ ...settingsCache! });
        }
      } catch {
        // File doesn't exist yet — use defaults
        settingsCache = { ...DEFAULT_SETTINGS };
      }
      setLoaded(true);
    })();
  }, [rpc, status]);

  const saveSettings = useCallback(async (patch: Partial<ClawHQSettings>) => {
    const updated = { ...(settingsCache || DEFAULT_SETTINGS), ...patch };
    settingsCache = updated;
    setSettingsLocal({ ...updated });
    notifyListeners();
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
    const custom = settings.projectColors[key];
    if (custom) return custom;
    // Deterministic hash fallback
    const palette = [
      "bg-purple-400", "bg-blue-400", "bg-cyan-400", "bg-teal-400", "bg-green-400",
      "bg-emerald-400", "bg-amber-400", "bg-orange-400", "bg-red-400", "bg-pink-400",
      "bg-rose-400", "bg-indigo-400", "bg-violet-400", "bg-fuchsia-400", "bg-sky-400",
    ];
    let h = 0;
    for (let i = 0; i < key.length; i++) { h = ((h << 5) - h + key.charCodeAt(i)) | 0; }
    return palette[Math.abs(h) % palette.length];
  }, [settings.projectColors]);

  return { settings, loaded, saveSettings, getProjectColor };
}
