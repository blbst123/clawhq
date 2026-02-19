"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Key,
  Cloud,
  ChevronRight,
  Loader2,
  RefreshCw,
  Bot,
  MessageSquare,
  Cpu,
  Puzzle,
  Wrench,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGateway } from "@/lib/gateway-context";
import { ConnectGate } from "@/components/ui/connect-gate";

interface Service {
  name: string;
  description: string;
  category: "ai" | "channel" | "node" | "skill" | "api";
  details: Record<string, string>;
}

const categoryConfig: Record<string, { label: string; color: string; bg: string; border: string; iconColor: string; icon: typeof Bot }> = {
  ai: { label: "AI Models", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", iconColor: "text-purple-400", icon: Bot },
  api: { label: "APIs & Services", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", iconColor: "text-blue-400", icon: Key },
  channel: { label: "Channels", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20", iconColor: "text-cyan-400", icon: MessageSquare },
  node: { label: "Nodes", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", iconColor: "text-green-400", icon: Cpu },
  skill: { label: "Skills", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", iconColor: "text-amber-400", icon: Puzzle },
};

// ─── Helpers ───

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

function envVarToName(envVar: string): string {
  return envVar
    .replace(/_API_KEY$|_API_TOKEN$|_TOKEN$|_SECRET$|_KEY$/i, "")
    .split("_")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function buildServices(
  config: Record<string, unknown> | null,
  nodesList: Array<Record<string, unknown>>,
  skillsList: Array<Record<string, unknown>>,
  envVarNames: string[],
): Service[] {
  const services: Service[] = [];
  if (!config) return services;

  const model = config.model as string | undefined;
  if (model) {
    const provider = model.split("/")[0] || "unknown";
    services.push({
      name: provider.charAt(0).toUpperCase() + provider.slice(1),
      description: model,
      category: "ai",
      details: { Model: model },
    });
  }

  for (const envVar of envVarNames) {
    if (model && envVar.toLowerCase().includes(model.split("/")[0]?.toLowerCase())) continue;
    services.push({
      name: envVarToName(envVar),
      description: `$${envVar}`,
      category: "api",
      details: { Variable: `$${envVar}` },
    });
  }

  // Sensitive keys to never show in details
  const sensitiveKeys = new Set(["token", "bottoken", "secret", "apikey", "api_key", "password", "credentials"]);
  function isSensitive(key: string): boolean {
    return sensitiveKeys.has(key.toLowerCase().replace(/[_-]/g, ""));
  }

  const channels = config.channels as Record<string, unknown> | undefined;
  if (channels && typeof channels === "object") {
    for (const [key, value] of Object.entries(channels)) {
      if (!value || typeof value !== "object") continue;
      const chConf = value as Record<string, unknown>;
      if (chConf.enabled === false) continue;

      // Extract safe, interesting config fields
      const details: Record<string, string> = {};
      for (const [k, v] of Object.entries(chConf)) {
        if (k === "enabled" || isSensitive(k)) continue;
        if (typeof v === "string") details[formatKey(k)] = v;
        else if (typeof v === "boolean") details[formatKey(k)] = v ? "Yes" : "No";
        else if (typeof v === "number") details[formatKey(k)] = String(v);
        else if (typeof v === "object" && v !== null) {
          // Flatten one level for objects like guilds, dm
          const sub = v as Record<string, unknown>;
          for (const [sk, sv] of Object.entries(sub)) {
            if (isSensitive(sk)) continue;
            if (typeof sv === "string" || typeof sv === "boolean" || typeof sv === "number") {
              details[`${formatKey(k)} → ${sk}`] = String(sv);
            } else if (typeof sv === "object" && sv !== null) {
              // e.g. guilds.*.requireMention
              for (const [ssk, ssv] of Object.entries(sv as Record<string, unknown>)) {
                if (typeof ssv === "string" || typeof ssv === "boolean" || typeof ssv === "number") {
                  details[`${formatKey(k)} → ${sk} → ${ssk}`] = String(ssv);
                }
              }
            }
          }
        }
      }

      services.push({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        description: `${key} messaging channel`,
        category: "channel",
        details,
      });
    }
  }

  for (const node of nodesList) {
    const name = (node.name || node.id || "Unknown") as string;
    const details: Record<string, string> = {};
    if (node.platform) details["Platform"] = String(node.platform);
    if (node.arch) details["Architecture"] = String(node.arch);
    if (node.os) details["OS"] = String(node.os);
    if (node.version) details["Version"] = String(node.version);
    const online = node.online === true || node.status === "online";
    details["Status"] = online ? "Online" : "Offline";
    services.push({ name, description: "Paired device node", category: "node", details });
  }

  for (const skill of skillsList) {
    const name = (skill.name || "Unknown") as string;
    const desc = (skill.description || "Agent skill") as string;
    const details: Record<string, string> = {};
    if (skill.version) details["Version"] = String(skill.version);
    if (skill.location) details["Location"] = String(skill.location);
    services.push({ name, description: desc, category: "skill", details });
  }

  return services;
}

// ─── Components ───

function ServiceCard({ service, isSelected, onClick }: { service: Service; isSelected: boolean; onClick: () => void }) {
  const cat = categoryConfig[service.category];
  const CatIcon = cat.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3.5 rounded-xl transition-all duration-150 border group",
        isSelected
          ? cn("bg-white/[0.06] shadow-lg shadow-black/20", cat.border)
          : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08]"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0", cat.bg)}>
          <CatIcon className={cn("h-4 w-4", cat.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-white/85 truncate">{service.name}</h3>
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-md", cat.bg, cat.color)}>
              {cat.label}
            </span>
          </div>
          <p className="text-[12px] text-white/35 mt-0.5 truncate">{service.description}</p>
        </div>
        <ChevronRight className={cn(
          "h-4 w-4 flex-shrink-0 transition-all",
          isSelected ? cn("rotate-90", cat.iconColor) : "text-white/10 group-hover:text-white/25"
        )} />
      </div>
    </button>
  );
}

// ─── Page ───

export default function AccessPage() {
  const { rpc, status: connStatus } = useGateway();
  const [loading, setLoading] = useState(true);
  const [gatewayConfig, setGatewayConfig] = useState<Record<string, unknown> | null>(null);
  const [nodesList, setNodesList] = useState<Array<Record<string, unknown>>>([]);
  const [skillsList, setSkillsList] = useState<Array<Record<string, unknown>>>([]);
  const [envVarNames, setEnvVarNames] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  useEffect(() => {
    if (connStatus !== "connected") return;
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connStatus]);

  async function loadData() {
    setLoading(true);
    try {
      try { const r = await rpc.getConfig() as { config?: Record<string, unknown> }; if (r?.config) setGatewayConfig(r.config); } catch { /* */ }
      try { const r = await rpc.request<{ nodes?: Array<Record<string, unknown>> }>("nodes.list", {}); if (r?.nodes) setNodesList(r.nodes); } catch { /* */ }
      try { const r = await rpc.request<{ skills?: Array<Record<string, unknown>> }>("skills.list", {}); if (r?.skills) setSkillsList(r.skills); } catch { /* */ }
      try { const r = await rpc.request<{ names?: string[] }>("clawhq.env.keys", {}); if (r?.names) setEnvVarNames(r.names.filter(n => /(_API_KEY|_API_TOKEN|_TOKEN|_SECRET|_KEY)$/i.test(n))); } catch { /* */ }
    } catch { /* */ }
    setLoading(false);
  }

  const services = useMemo(() => buildServices(gatewayConfig, nodesList, skillsList, envVarNames), [gatewayConfig, nodesList, skillsList, envVarNames]);

  const filtered = useMemo(() =>
    filterCategory === "all" ? services : services.filter(s => s.category === filterCategory),
    [services, filterCategory]
  );

  const selected = services.find(s => s.name === selectedService);

  const activeCategories = useMemo(() => {
    const cats = new Set(services.map(s => s.category));
    return ["all", ...["ai", "api", "channel", "node", "skill"].filter(c => cats.has(c as Service["category"]))];
  }, [services]);

  if (connStatus !== "connected") {
    return <ConnectGate>{null}</ConnectGate>;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/5 bg-white/[0.01] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Zap className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Access</h1>
              <p className="text-sm text-white/40">Connected services & integrations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Summary chips */}
            {activeCategories.filter(c => c !== "all").map(c => {
              const cat = categoryConfig[c];
              const count = services.filter(s => s.category === c).length;
              return (
                <div key={c} className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[12px] font-medium", cat.bg, cat.border, cat.color)}>
                  <cat.icon className="h-3 w-3" />
                  {count}
                </div>
              );
            })}
            <button onClick={loadData} disabled={loading}
              className="h-8 w-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors" title="Refresh">
              <RefreshCw className={cn("h-3.5 w-3.5 text-white/30", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-1 mt-4 bg-white/[0.03] rounded-lg p-0.5 w-fit">
          {activeCategories.map(c => {
            const cat = categoryConfig[c];
            const count = c === "all" ? services.length : services.filter(s => s.category === c).length;
            return (
              <button
                key={c}
                onClick={() => setFilterCategory(c)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[12px] font-medium transition-all",
                  filterCategory === c
                    ? cn("bg-white/[0.08]", c === "all" ? "text-white/80" : cat?.color)
                    : "text-white/30 hover:text-white/50"
                )}
              >
                {c === "all" ? `All (${count})` : `${cat?.label} (${count})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content — two panel */}
      <div className="flex-1 overflow-hidden flex">
        {/* Service List */}
        <div className="w-[420px] border-r border-white/5 overflow-y-auto p-4 space-y-1.5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 text-amber-400 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Wrench className="h-8 w-8 text-white/10 mb-3" />
              <p className="text-sm text-white/25">No services found</p>
              <p className="text-[12px] text-white/15 mt-1">Services are auto-discovered from your gateway config</p>
            </div>
          ) : (
            filtered.map(service => (
              <ServiceCard
                key={service.name}
                service={service}
                isSelected={selectedService === service.name}
                onClick={() => setSelectedService(selectedService === service.name ? null : service.name)}
              />
            ))
          )}
        </div>

        {/* Detail Panel */}
        <div className="flex-1 overflow-y-auto">
          {selected ? (() => {
            const cat = categoryConfig[selected.category];
            const CatIcon = cat.icon;
            return (
              <div className="p-6 max-w-2xl">
                <div className="flex items-start gap-4 mb-6">
                  <div className={cn("h-14 w-14 rounded-xl flex items-center justify-center", cat.bg)}>
                    <CatIcon className={cn("h-7 w-7", cat.iconColor)} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-2xl font-bold text-white">{selected.name}</h2>
                      <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-md border", cat.bg, cat.border, cat.color)}>
                        {cat.label}
                      </span>
                    </div>
                    <p className="text-[14px] text-white/45">{selected.description}</p>
                  </div>
                </div>

                {Object.keys(selected.details).length > 0 && (
                  <div className="space-y-3">
                    {Object.entries(selected.details).map(([label, value]) => (
                      <div key={label} className={cn("rounded-xl border px-4 py-3", "bg-white/[0.02] border-white/[0.05]")}>
                        <div className="text-[11px] uppercase tracking-wider text-white/25 mb-1">{label}</div>
                        <code className="text-[13px] text-white/60 font-mono">{value}</code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })() : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <Cloud className="h-10 w-10 text-white/10 mx-auto" />
                <p className="text-sm text-white/25">Select a service to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
