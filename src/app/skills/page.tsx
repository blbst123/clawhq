"use client";

import { useState, useEffect, useMemo } from "react";
import { Wrench, Loader2, ExternalLink, CheckCircle2, XCircle, Globe, Terminal, Key, Search, Package, FileCode, AlertTriangle } from "lucide-react";
import { useGateway } from "@/lib/gateway-context";
import ReactMarkdown from "react-markdown";

interface Skill {
  name: string;
  description: string;
  source: string;
  bundled: boolean;
  filePath: string;
  baseDir: string;
  skillKey: string;
  emoji?: string | null;
  homepage?: string | null;
  always?: boolean;
  disabled?: boolean;
  blockedByAllowlist?: boolean;
  eligible: boolean;
  requirements?: { bins?: string[]; anyBins?: string[]; env?: string[]; config?: string[]; os?: string[] } | null;
  missing?: { bins: string[]; env: string[]; config: string[]; os: string[] } | null;
  install?: unknown[] | null;
}

const SOURCE_COLORS: Record<string, string> = {
  "openclaw-bundled": "bg-blue-500/15 text-blue-400",
  "managed": "bg-purple-500/15 text-purple-400",
  "workspace": "bg-green-500/15 text-green-400",
  "extra": "bg-amber-500/15 text-amber-400",
};

function sourceLabel(source: string): string {
  if (source === "openclaw-bundled") return "bundled";
  return source;
}

function getMissingItems(skill: Skill): string[] {
  if (!skill.missing) return [];
  const items: string[] = [];
  skill.missing.bins?.forEach(b => items.push(`bin: ${b}`));
  skill.missing.env?.forEach(e => items.push(`env: ${e}`));
  skill.missing.config?.forEach(c => items.push(`config: ${c}`));
  skill.missing.os?.forEach(o => items.push(`os: ${o}`));
  return items;
}

export default function SkillsPage() {
  const { rpc, status: connStatus } = useGateway();
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [skillContent, setSkillContent] = useState<string>("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "available">("all");

  useEffect(() => {
    if (connStatus !== "connected") return;
    loadSkills();
  }, [connStatus]);

  async function loadSkills() {
    setLoading(true);
    try {
      const result = await rpc.listSkills();
      if (result?.skills) {
        setSkills(result.skills.sort((a, b) => {
          // Eligible first, then alphabetical
          if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
          return a.name.localeCompare(b.name);
        }));
      }
    } catch (err) {
      console.error("Failed to load skills:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadSkillContent(skill: Skill) {
    setSelectedKey(skill.skillKey);
    setLoadingContent(true);
    try {
      const result = await rpc.readSkill(skill.filePath);
      if (result?.content) {
        const content = result.content.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, "");
        setSkillContent(content);
      } else {
        setSkillContent("*Could not load skill documentation.*");
      }
    } catch {
      setSkillContent("*Could not load skill documentation.*");
    } finally {
      setLoadingContent(false);
    }
  }

  const filtered = useMemo(() => {
    let list = skills;
    if (filterStatus === "active") list = list.filter(s => s.eligible);
    if (filterStatus === "available") list = list.filter(s => !s.eligible);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.skillKey.toLowerCase().includes(q));
    }
    return list;
  }, [skills, search, filterStatus]);

  const selected = skills.find(s => s.skillKey === selectedKey);

  if (connStatus !== "connected") {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-white/30">
            {connStatus === "error" ? "Reconnecting…" : "Connecting…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/5 bg-white/[0.01] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Wrench className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Skills</h1>
              <p className="text-sm text-white/40">Installed agent skills & tools</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 text-green-400/70">
              {skills.filter(s => s.eligible).length} active
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] text-white/30">
              {skills.length} installed
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left: Skills List */}
        <div className="w-96 border-r border-white/5 flex flex-col">
          {/* Search + filters */}
          <div className="p-3 border-b border-white/5 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
              <input
                type="text"
                placeholder="Search skills…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-white/10"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {(["all", "active", "available"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors capitalize ${filterStatus === s
                    ? s === "active" ? "bg-green-500/15 text-green-400" : s === "available" ? "bg-amber-500/15 text-amber-400" : "bg-white/10 text-white/70"
                    : "text-white/30 hover:text-white/50"}`}
                >
                  {s}{s !== "all" ? ` (${skills.filter(sk => s === "active" ? sk.eligible : !sk.eligible).length})` : ""}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <Package className="h-8 w-8 text-white/10" />
                <p className="text-sm text-white/30">{search ? "No matching skills" : "No skills found"}</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filtered.map(skill => {
                  const missingCount = getMissingItems(skill).length;
                  return (
                    <button
                      key={skill.skillKey}
                      onClick={() => loadSkillContent(skill)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                        selectedKey === skill.skillKey
                          ? "bg-blue-500/15 border border-blue-500/20"
                          : "hover:bg-white/[0.03] border border-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-base mt-0.5 w-5 text-center flex-shrink-0">
                          {skill.emoji || "🔧"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={`text-[13px] font-medium truncate ${skill.eligible ? "text-white/80" : "text-white/40"}`}>
                              {skill.name}
                            </h3>
                            {skill.eligible ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 flex-shrink-0">active</span>
                            ) : skill.disabled ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400/60 flex-shrink-0">disabled</span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/25 flex-shrink-0">
                                {missingCount > 0 ? `${missingCount} missing` : "unavailable"}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-white/35 line-clamp-1 mt-0.5">{skill.description}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${SOURCE_COLORS[skill.source] || "bg-white/5 text-white/30"}`}>
                              {sourceLabel(skill.source)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Skill Details */}
        <div className="flex-1 overflow-y-auto">
          {loadingContent ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
            </div>
          ) : selected ? (
            <div className="p-6 max-w-3xl">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{selected.emoji || "🔧"}</span>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{selected.name}</h2>
                    <p className="text-[13px] text-white/40">{selected.description}</p>
                  </div>
                </div>

                {/* Meta badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded ${SOURCE_COLORS[selected.source] || "bg-white/5 text-white/30"}`}>
                    <Package className="h-3 w-3" />
                    {sourceLabel(selected.source)}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded ${
                    selected.eligible ? "bg-green-500/15 text-green-400"
                    : selected.disabled ? "bg-red-500/15 text-red-400"
                    : "bg-amber-500/15 text-amber-400"
                  }`}>
                    {selected.eligible ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {selected.eligible ? "Active" : selected.disabled ? "Disabled" : "Unavailable"}
                  </span>
                  {selected.homepage && (
                    <a href={selected.homepage} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-white/5 text-white/30 hover:text-white/50 transition-colors">
                      <Globe className="h-3 w-3" />
                      Website
                    </a>
                  )}
                </div>

                {/* Requirements */}
                {selected.requirements && (
                  <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3 mb-4">
                    <h3 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">Requirements</h3>
                    <div className="space-y-1.5">
                      {selected.requirements.bins?.length ? (
                        <div className="flex items-center gap-2 text-[12px]">
                          <Terminal className="h-3 w-3 text-white/30" />
                          <span className="text-white/40">Binaries:</span>
                          <span className="text-white/60 font-mono">{selected.requirements.bins.join(", ")}</span>
                        </div>
                      ) : null}
                      {selected.requirements.anyBins?.length ? (
                        <div className="flex items-center gap-2 text-[12px]">
                          <Terminal className="h-3 w-3 text-white/30" />
                          <span className="text-white/40">Any of:</span>
                          <span className="text-white/60 font-mono">{selected.requirements.anyBins.join(", ")}</span>
                        </div>
                      ) : null}
                      {selected.requirements.env?.length ? (
                        <div className="flex items-center gap-2 text-[12px]">
                          <Key className="h-3 w-3 text-white/30" />
                          <span className="text-white/40">Env vars:</span>
                          <span className="text-white/60 font-mono">{selected.requirements.env.join(", ")}</span>
                        </div>
                      ) : null}
                      {selected.requirements.config?.length ? (
                        <div className="flex items-center gap-2 text-[12px]">
                          <FileCode className="h-3 w-3 text-white/30" />
                          <span className="text-white/40">Config:</span>
                          <span className="text-white/60 font-mono">{selected.requirements.config.join(", ")}</span>
                        </div>
                      ) : null}
                      {selected.requirements.os?.length ? (
                        <div className="flex items-center gap-2 text-[12px]">
                          <FileCode className="h-3 w-3 text-white/30" />
                          <span className="text-white/40">OS:</span>
                          <span className="text-white/60 font-mono">{selected.requirements.os.join(", ")}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Missing requirements */}
                {!selected.eligible && getMissingItems(selected).length > 0 && (
                  <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-3 mb-4">
                    <h3 className="text-[11px] font-semibold text-amber-400/70 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3" />
                      Missing
                    </h3>
                    <ul className="space-y-1">
                      {getMissingItems(selected).map((m, i) => (
                        <li key={i} className="flex items-center gap-2 text-[12px]">
                          <XCircle className="h-3 w-3 text-amber-400/50 flex-shrink-0" />
                          <span className="text-amber-200/60 font-mono">{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selected.blockedByAllowlist && (
                  <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-3 mb-4">
                    <p className="text-[12px] text-red-300/60">Blocked by skills allowlist configuration.</p>
                  </div>
                )}

                {/* Location */}
                <div className="text-[11px] text-white/25 font-mono truncate">
                  {selected.filePath}
                </div>
              </div>

              {/* Documentation */}
              {skillContent && (
                <div className="border-t border-white/5 pt-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ExternalLink className="h-4 w-4 text-white/30" />
                    <h3 className="text-[13px] font-semibold text-white/50 uppercase tracking-wider">Documentation</h3>
                  </div>
                  <div className="skill-docs">
                    <ReactMarkdown>{skillContent}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Wrench className="h-10 w-10 text-white/10" />
              <p className="text-sm text-white/30">Select a skill to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
