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

export default function SettingsPage() {
  return (
    <div className="p-8 min-h-screen max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-white/50">Configure ClawHQ and connected services</p>
      </div>

      <div className="space-y-6">
        {/* Connection Status */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Plug className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">OpenClaw Connection</h2>
              <p className="text-sm text-white/40">Gateway status and configuration</p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between py-2">
              <span className="text-white/60">Gateway URL</span>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-white/5 px-3 py-1.5 rounded-lg text-orange-300 font-mono">
                  http://localhost:18789
                </code>
                <button className="p-1.5 rounded hover:bg-white/5 text-white/40 hover:text-white transition-colors">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-white/60">Status</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-400 glow-green" />
                <span className="text-green-400">Connected</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-white/60">Version</span>
              <span className="text-white">2026.2.2-3</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-white/60">Uptime</span>
              <span className="text-white">2d 14h 32m</span>
            </div>
          </div>
        </div>

        {/* Connected Channels */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Settings2 className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Connected Channels</h2>
              <p className="text-sm text-white/40">Messaging platforms Lolo can access</p>
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {[
              { name: "Discord", status: "connected", account: "Bill HQ Server", icon: "🎮" },
              { name: "Telegram", status: "connected", account: "@bill_112", icon: "✈️" },
              { name: "Signal", status: "not configured", account: null, icon: "🔒" },
              { name: "WhatsApp", status: "not configured", account: null, icon: "💬" },
            ].map((channel, i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{channel.icon}</span>
                  <div>
                    <p className="text-white font-medium">{channel.name}</p>
                    {channel.account && (
                      <p className="text-sm text-white/40">{channel.account}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {channel.status === "connected" ? (
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm">Connected</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-white/30">
                      <XCircle className="h-4 w-4" />
                      <span className="text-sm">Not configured</span>
                    </div>
                  )}
                  <button className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs transition-all">
                    {channel.status === "connected" ? "Manage" : "Connect"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Configuration */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Bot className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Agent Configuration</h2>
              <p className="text-sm text-white/40">Active agents and their settings</p>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-2xl">
                    🦞
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-[#1f1712]" />
                </div>
                <div>
                  <p className="text-white font-semibold">Lolo</p>
                  <p className="text-sm text-white/40">Main Agent • claude-opus-4</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-all flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  View Workspace
                </button>
                <button className="px-3 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-sm transition-all">
                  Configure
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Shield className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Security</h2>
              <p className="text-sm text-white/40">API keys and access control</p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between py-2">
              <span className="text-white/60">Gateway Token</span>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-white/5 px-3 py-1.5 rounded-lg text-white/40 font-mono">
                  ••••••••••••••••
                </code>
                <button className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs transition-all">
                  Reveal
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-white/60">Last Token Rotation</span>
              <span className="text-white/40">Never</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
