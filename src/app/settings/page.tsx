import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-neutral-400">Configure ClawHQ and connected services</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Connection Status */}
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-white">OpenClaw Connection</CardTitle>
            <CardDescription className="text-neutral-400">Gateway status and configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Gateway URL</span>
              <code className="text-sm bg-neutral-800 px-2 py-1 rounded text-white">
                http://localhost:18789
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Status</span>
              <Badge className="bg-green-600">Connected</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Version</span>
              <span className="text-white">2026.2.2-3</span>
            </div>
          </CardContent>
        </Card>

        {/* Connected Channels */}
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-white">Connected Channels</CardTitle>
            <CardDescription className="text-neutral-400">Messaging platforms Lolo can access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: "Discord", status: "connected", account: "Bill HQ" },
              { name: "Telegram", status: "connected", account: "@bill_112" },
              { name: "Signal", status: "not configured", account: null },
            ].map((channel, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-white">{channel.name}</p>
                  {channel.account && (
                    <p className="text-sm text-neutral-500">{channel.account}</p>
                  )}
                </div>
                <Badge 
                  variant="outline"
                  className={channel.status === "connected" 
                    ? "border-green-500 text-green-500" 
                    : "border-neutral-500 text-neutral-500"
                  }
                >
                  {channel.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Agent Configuration */}
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-white">Agent Configuration</CardTitle>
            <CardDescription className="text-neutral-400">Active agents and their settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🦞</span>
                <div>
                  <p className="text-white font-medium">Lolo</p>
                  <p className="text-sm text-neutral-500">Main agent</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="text-neutral-400 border-neutral-700">
                Configure
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
