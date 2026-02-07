"use client";

import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  Settings2,
  Plug,
  Bot,
  Shield
} from "lucide-react";

const channels = [
  { name: "Discord", status: "connected", account: "Bill HQ Server", icon: "🎮" },
  { name: "Telegram", status: "connected", account: "@bill_112", icon: "✈️" },
  { name: "Signal", status: "not configured", account: null, icon: "🔒" },
  { name: "WhatsApp", status: "not configured", account: null, icon: "💬" },
];

export default function SettingsPage() {
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/5 bg-white/[0.01] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/5">
            <Settings2 className="h-6 w-6 text-white/60" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Settings</h1>
            <p className="text-sm text-white/40">Configuration & connections</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* OpenClaw Connection */}
        <div className="px-6 py-3 border-b border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <Plug className="h-3.5 w-3.5 text-orange-400" />
            <span className="text-sm font-semibold text-white/60">OpenClaw Connection</span>
          </div>
          <div className="space-y-0">
            {[
              { label: "Gateway URL", value: "http://localhost:18789", mono: true, copyable: true },
              { label: "Status", value: "Connected", status: "green" },
              { label: "Version", value: "2026.2.2-3" },
              { label: "Uptime", value: "2d 14h 32m" },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/[0.02] transition-all">
                <span className="text-xs text-white/40">{row.label}</span>
                <div className="flex items-center gap-2">
                  {row.status === "green" && <div className="h-1.5 w-1.5 rounded-full bg-green-400" />}
                  <span className={`text-xs ${row.mono ? "font-mono text-orange-300/70" : row.status === "green" ? "text-green-400" : "text-white/70"}`}>
                    {row.value}
                  </span>
                  {row.copyable && (
                    <button className="p-1 rounded hover:bg-white/5 text-white/20 hover:text-white/40 transition-colors">
                      <Copy className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Connected Channels */}
        <div className="px-6 py-3 border-b border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <Settings2 className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-sm font-semibold text-white/60">Connected Channels</span>
          </div>
          <div className="space-y-0">
            {channels.map((channel, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/[0.02] transition-all">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{channel.icon}</span>
                  <div>
                    <p className="text-xs font-medium text-white/70">{channel.name}</p>
                    {channel.account && <p className="text-[10px] text-white/30">{channel.account}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {channel.status === "connected" ? (
                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-300 border border-green-500/20">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.03] text-white/25 border border-white/5">
                      <XCircle className="h-2.5 w-2.5" /> Not configured
                    </span>
                  )}
                  <button className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/60 text-[10px] transition-all">
                    {channel.status === "connected" ? "Manage" : "Connect"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Configuration */}
        <div className="px-6 py-3 border-b border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="h-3.5 w-3.5 text-green-400" />
            <span className="text-sm font-semibold text-white/60">Agent</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-lg">
                  🦞
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-[#1f1712]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Lolo</p>
                <p className="text-[10px] text-white/30">Main Agent • claude-opus-4</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/60 text-xs transition-all flex items-center gap-1.5">
                <ExternalLink className="h-3 w-3" /> Workspace
              </button>
              <button className="px-2.5 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 text-xs transition-all">
                Configure
              </button>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="px-6 py-3">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-3.5 w-3.5 text-yellow-400" />
            <span className="text-sm font-semibold text-white/60">Security</span>
          </div>
          <div className="space-y-0">
            <div className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/[0.02] transition-all">
              <span className="text-xs text-white/40">Gateway Token</span>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-white/5 px-2 py-1 rounded text-white/30 font-mono">••••••••••••••••</code>
                <button className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-white/40 text-[10px] transition-all">Reveal</button>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/[0.02] transition-all">
              <span className="text-xs text-white/40">Last Token Rotation</span>
              <span className="text-xs text-white/30">Never</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
