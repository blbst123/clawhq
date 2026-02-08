"use client";

import { useState, useEffect } from "react";
import {
  Plug,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  RefreshCw,
  Bot,
  Settings2,
  Zap,
} from "lucide-react";
import { useGateway } from "@/lib/gateway-context";

export default function SettingsPage() {
  const { rpc, status, config, connect, disconnect, error } = useGateway();
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [gatewayInfo, setGatewayInfo] = useState<Record<string, unknown> | null>(null);
  const [channelsInfo, setChannelsInfo] = useState<unknown>(null);
  const [agentInfo, setAgentInfo] = useState<{ name?: string; avatar?: string } | null>(null);

  // Populate fields from saved config
  useEffect(() => {
    if (config) {
      setUrl(config.url);
      setToken(config.token);
    }
  }, [config]);

  // Fetch gateway info when connected
  useEffect(() => {
    if (status === "connected") {
      rpc.getStatus().then(setGatewayInfo).catch(() => {});
      rpc.getChannelsStatus().then(setChannelsInfo).catch(() => {});
      rpc.getAgentIdentity().then(setAgentInfo).catch(() => {});
    } else {
      setGatewayInfo(null);
      setChannelsInfo(null);
      setAgentInfo(null);
    }
  }, [status, rpc]);

  const handleConnect = () => {
    if (!url || !token) return;
    setTesting(true);
    connect({ url: url.replace(/\/$/, ""), token });
    // Give it a moment to connect
    setTimeout(() => setTesting(false), 3000);
  };

  const handleDisconnect = () => {
    disconnect();
    setGatewayInfo(null);
    setChannelsInfo(null);
    setAgentInfo(null);
  };

  const statusColor = status === "connected" ? "text-green-400" :
    status === "connecting" ? "text-orange-400" :
    status === "error" ? "text-red-400" : "text-white/30";

  const StatusIcon = status === "connected" ? CheckCircle2 :
    status === "connecting" ? Loader2 :
    status === "error" ? XCircle : WifiOff;

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-shrink-0 border-b border-white/5 bg-white/[0.01] px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-orange-500/10">
            <Settings2 className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Settings</h1>
            <p className="text-xs text-white/40">Connect to your OpenClaw gateway</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl space-y-6">
        {/* Connection Card */}
        <div className="rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Plug className="h-5 w-5 text-orange-400" />
              <div>
                <h2 className="text-sm font-semibold text-white">Gateway Connection</h2>
                <p className="text-xs text-white/30">Connect ClawHQ to your OpenClaw instance</p>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 text-xs ${statusColor}`}>
              <StatusIcon className={`h-3.5 w-3.5 ${status === "connecting" ? "animate-spin" : ""}`} />
              <span className="capitalize">{status}</span>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Gateway URL */}
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Gateway URL</label>
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="http://100.x.y.z:18789"
                disabled={status === "connected"}
                className="w-full bg-white/[0.03] border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-orange-500/30 transition-all disabled:opacity-50"
              />
              <p className="text-[10px] text-white/20 mt-1">Your OpenClaw gateway address (Tailscale IP, localhost, etc.)</p>
            </div>

            {/* Token */}
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Gateway Token</label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="Your gateway auth token"
                  disabled={status === "connected"}
                  className="w-full bg-white/[0.03] border border-white/8 rounded-lg px-3 py-2.5 pr-20 text-sm text-white placeholder-white/20 focus:outline-none focus:border-orange-500/30 transition-all disabled:opacity-50 font-mono"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="p-1.5 rounded hover:bg-white/5 text-white/30 hover:text-white/50 transition-colors"
                  >
                    {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(token)}
                    className="p-1.5 rounded hover:bg-white/5 text-white/30 hover:text-white/50 transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-white/20 mt-1">Found in ~/.openclaw/openclaw.json → gateway.auth.token</p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            {/* Connect/Disconnect button */}
            <div className="flex items-center gap-3 pt-1">
              {status === "connected" ? (
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-all"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={!url || !token || testing}
                  className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-all flex items-center gap-2"
                >
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                  Connect
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Connected Info */}
        {status === "connected" && gatewayInfo && (
          <>
            {/* Gateway Status */}
            <div className="rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3">
                <Zap className="h-4 w-4 text-green-400" />
                <h2 className="text-sm font-semibold text-white">Gateway Info</h2>
              </div>
              <div className="p-5 space-y-2">
                {Object.entries(gatewayInfo).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-1">
                    <span className="text-xs text-white/40">{key}</span>
                    <span className="text-xs text-white/70 font-mono">
                      {typeof value === "object" ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

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
                    <p className="text-xs text-green-400">Connected</p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick test buttons */}
            <div className="rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3">
                <RefreshCw className="h-4 w-4 text-white/40" />
                <h2 className="text-sm font-semibold text-white">Test API</h2>
              </div>
              <div className="p-5">
                <p className="text-xs text-white/30 mb-3">Quick test the RPC connection:</p>
                <div className="flex flex-wrap gap-2">
                  {["sessions.list", "cron.list", "models.list", "channels.status", "usage.cost"].map(method => (
                    <button
                      key={method}
                      onClick={async () => {
                        try {
                          const result = await rpc.request(method);
                          console.log(`[ClawHQ] ${method}:`, result);
                          alert(`Success! Check browser console for ${method} response.`);
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
      </div>
    </div>
  );
}
