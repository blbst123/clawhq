"use client";

import { useState } from "react";
import { Sparkles, Eye, EyeOff, X, Loader2 } from "lucide-react";
import { useGateway } from "@/lib/gateway-context";
import type { ConnectionStatus } from "@/lib/gateway-rpc";

/** Wrap page content — shows token prompt when disconnected, spinner when connecting. */
export function ConnectGate({ children }: { children: React.ReactNode }) {
  const { status, ready } = useGateway();
  if (status === "connected") return <>{children}</>;
  // Not yet determined if we have a saved config — show nothing to avoid flash
  if (!ready || status === "connecting") return <Spinner />;
  return <TokenPrompt />;
}

function Spinner() {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="h-8 w-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
        <p className="text-sm text-white/30">Connecting…</p>
      </div>
    </div>
  );
}

function TokenPrompt() {
  const { connect, error } = useGateway();
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  const handleConnect = () => {
    if (!token.trim()) return;
    connect({ url: "__self__", token: token.trim() });
  };

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-full max-w-md mx-auto px-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-600/20 mb-4">
            <Sparkles className="h-8 w-8 text-orange-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">ClawHQ</h1>
          <p className="text-sm text-white/40">Connect to your OpenClaw gateway to get started</p>
        </div>

        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <X className="h-4 w-4 text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-300">Connection failed — check your token and try again</p>
            </div>
          )}

          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Gateway Token</label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={e => setToken(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleConnect()}
                placeholder="Paste your token here"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-orange-500/30 transition-all font-mono"
                autoFocus
              />
              <button
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-white/5 text-white/30 hover:text-white/50 transition-colors"
              >
                {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-white/20 mt-1.5">
              Find it in <span className="font-mono text-white/30">~/.openclaw/openclaw.json</span> → gateway.auth.token
            </p>
          </div>

          <button
            onClick={handleConnect}
            disabled={!token.trim()}
            className="w-full px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-all"
          >
            Connect
          </button>

          <p className="text-[10px] text-white/15 text-center">
            Your token is stored locally in this browser and never sent elsewhere.
          </p>
        </div>
      </div>
    </div>
  );
}
