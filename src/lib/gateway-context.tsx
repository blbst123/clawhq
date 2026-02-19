"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  GatewayRPC,
  getGateway,
  loadGatewayConfig,
  saveGatewayConfig,
  clearGatewayConfig,
  type GatewayConfig,
  type ConnectionStatus,
} from "./gateway-rpc";

interface GatewayContextValue {
  rpc: GatewayRPC;
  status: ConnectionStatus;
  ready: boolean;
  config: GatewayConfig | null;
  connect: (config: GatewayConfig) => void;
  disconnect: () => void;
  error: string | null;
}

const GatewayContext = createContext<GatewayContextValue | null>(null);

export function GatewayProvider({ children }: { children: React.ReactNode }) {
  const rpcRef = useRef<GatewayRPC>(getGateway());
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState<GatewayConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Listen to status changes
  useEffect(() => {
    const rpc = rpcRef.current;
    const unsub = rpc.onStatus((s) => {
      setStatus(s);
      if (s === "connected") setError(null);
      if (s === "error") setError("Connection failed");
    });
    return unsub;
  }, []);

  // Auto-connect: check URL params first, then saved config
  useEffect(() => {
    // Support ?token=xxx in URL (one-click setup from CLI)
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) {
      const cfg = { url: "__self__", token: urlToken };
      setConfig(cfg);
      setStatus("connecting");
      saveGatewayConfig(cfg);
      rpcRef.current.connect(cfg);
      // Strip token from URL for security
      const clean = new URL(window.location.href);
      clean.searchParams.delete("token");
      window.history.replaceState({}, "", clean.pathname + clean.search);
      setReady(true);
      return;
    }

    // Fall back to saved config
    const saved = loadGatewayConfig();
    if (saved) {
      setConfig(saved);
      setStatus("connecting");
      rpcRef.current.connect(saved);
    }
    setReady(true);
  }, []);

  const connect = useCallback((cfg: GatewayConfig) => {
    setConfig(cfg);
    saveGatewayConfig(cfg);
    setError(null);
    rpcRef.current.connect(cfg);
  }, []);

  const disconnect = useCallback(() => {
    rpcRef.current.disconnect();
    clearGatewayConfig();
    setConfig(null);
    setError(null);
  }, []);

  return (
    <GatewayContext.Provider value={{
      rpc: rpcRef.current,
      status,
      ready,
      config,
      connect,
      disconnect,
      error,
    }}>
      {children}
    </GatewayContext.Provider>
  );
}

export function useGateway() {
  const ctx = useContext(GatewayContext);
  if (!ctx) throw new Error("useGateway must be inside GatewayProvider");
  return ctx;
}
