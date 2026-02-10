"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Bot,
  Settings2,
  Zap,
  Wifi,
  Server,
  Globe,
  Eye,
  EyeOff,
  Shield,
} from "lucide-react";
import { useGateway } from "@/lib/gateway-context";

export default function SettingsPage() {
  const { rpc, status, config, connect, disconnect, error } = useGateway();
  const [gatewayInfo, setGatewayInfo] = useState<Record<string, unknown> | null>(null);
  const [agentInfo, setAgentInfo] = useState<{ name?: string; avatar?: string } | null>(null);
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  // Detect if served by gateway (injected window vars)
  const [isGatewayServed, setIsGatewayServed] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).__OPENCLAW_ASSISTANT_NAME__) {
      setIsGatewayServed(true);
    }
  }, []);

  // Fetch gateway info when connected
  useEffect(() => {
    if (status === "connected") {
      rpc.getStatus().then((data) => {
        setGatewayInfo(data);
      }).catch(() => {});
      rpc.getAgentIdentity().then(setAgentInfo).catch(() => {});
    } else {
      setGatewayInfo(null);
      setAgentInfo(null);
    }
  }, [status, rpc]);

  const handleConnect = () => {
    if (!token) return;
    connect({ url: "__self__", token });
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-shrink-0 border-b border-white/5 bg-white/[0.01] px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-orange-500/10">
            <Settings2 className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Settings</h1>
            <p className="text-xs text-white/40">Gateway connection & configuration</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl space-y-6">

        {/* ── Connected State ── */}
        {status === "connected" && (
          <>
            <div className="rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Connected</h2>
                    <p className="text-xs text-white/30 flex items-center gap-1.5">
                      <Server className="h-3 w-3" />
                      {isGatewayServed ? "Local gateway" : config?.url}
                    </p>
                  </div>
                </div>
                <button
                  onClick={disconnect}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/40 hover:text-white/60 transition-all"
                >
                  Disconnect
                </button>
              </div>
            </div>

            {/* Gateway Info */}
            {gatewayInfo && (
              <div className="rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap className="h-4 w-4 text-orange-400" />
                    <h2 className="text-sm font-semibold text-white">Gateway</h2>
                  </div>
                  {gatewayInfo.version ? (
                    <span className="text-xs text-white/40 font-mono">
                      v{String(gatewayInfo.version)}
                    </span>
                  ) : null}
                </div>
                <div className="p-5 space-y-2">
                  {Object.entries(gatewayInfo).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between py-1">
                      <span className="text-xs text-white/40">{key}</span>
                      <span className="text-xs text-white/70 font-mono truncate max-w-[60%] text-right">
                        {typeof value === "object" ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Agent Info */}
            {agentInfo && (
              <div className="rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3">
                  <Bot className="h-4 w-4 text-orange-400" />
                  <h2 className="text-sm font-semibold text-white">Agent</h2>
                </div>
                <div className="p-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-2xl">
                    {agentInfo.avatar || "🤖"}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{agentInfo.name || "Agent"}</p>
                    <p className="text-xs text-green-400">Online</p>
                  </div>
                </div>
              </div>
            )}

            {/* Test API */}
            <div className="rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3">
                <RefreshCw className="h-4 w-4 text-white/40" />
                <h2 className="text-sm font-semibold text-white">Test API</h2>
              </div>
              <div className="p-5">
                <p className="text-xs text-white/30 mb-3">Quick test the RPC connection:</p>
                <div className="flex flex-wrap gap-2">
                  {["status", "sessions.list", "cron.list", "channels.status"].map(method => (
                    <button
                      key={method}
                      onClick={async () => {
                        try {
                          const result = await rpc.request(method);
                          alert(`${method}:\n${JSON.stringify(result, null, 2).slice(0, 2000)}`);
                        } catch (err) {
                          alert(`Error: ${err}`);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/50 hover:text-white transition-all font-mono"
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Connecting State ── */}
        {status === "connecting" && (
          <div className="rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden">
            <div className="px-5 py-8 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-orange-400 animate-spin" />
              <p className="text-sm text-white/50">Connecting to gateway...</p>
            </div>
          </div>
        )}

        {/* ── Disconnected / Error State ── */}
        {(status === "disconnected" || status === "error") && (
          <div className="rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden">
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    {isGatewayServed ? "Enter your gateway token" : "Connect to gateway"}
                  </h2>
                  <p className="text-xs text-white/30">
                    {isGatewayServed
                      ? "One-time setup — your token is stored locally in this browser"
                      : "Enter your gateway details to connect"}
                  </p>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  <p className="text-xs text-red-300">{error}</p>
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
                    className="w-full bg-white/[0.03] border border-white/8 rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-orange-500/30 transition-all font-mono"
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
                disabled={!token}
                className="w-full px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                <Wifi className="h-4 w-4" />
                Connect
              </button>

              {isGatewayServed && (
                <p className="text-[10px] text-white/15 text-center">
                  Your token never leaves this browser. Connection is direct to your local gateway.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
