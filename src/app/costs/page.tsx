"use client";

import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Loader2,
  WifiOff,
  Calendar,
} from "lucide-react";
import { useGateway } from "@/lib/gateway-context";
import { useCachedRpc } from "@/lib/use-cached-rpc";

interface DailyCost {
  date: string;
  totalTokens: number;
  totalCost: number;
  inputCost: number;
  outputCost: number;
  cacheReadCost: number;
  cacheWriteCost: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

interface ModelCost {
  model: string;
  provider?: string;
  count: number;
  totalCost: number;
  inputCost: number;
  outputCost: number;
  cacheReadCost: number;
  cacheWriteCost: number;
  totalTokens: number;
}

function formatCost(n: number): string {
  if (n < 0.01) return "<$0.01";
  return "$" + n.toFixed(2);
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(0) + "K";
  return String(n);
}

function formatDate(d: string): string {
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface CostsData {
  daily: DailyCost[];
  modelCosts: ModelCost[];
}

export default function CostsPage() {
  const { rpc, status: connStatus } = useGateway();

  const fetchCosts = async (): Promise<CostsData> => {
    const [costData, usageData] = await Promise.all([
      rpc.getUsageCost().catch(() => null),
      rpc.getSessionUsage({ limit: 500 }).catch(() => null),
    ]);

    const daily = (costData as unknown as { daily: DailyCost[] })?.daily || [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = usageData as any;
    const byModel: Array<{ model?: string; provider?: string; count?: number; totals?: { totalCost?: number; inputCost?: number; outputCost?: number; cacheReadCost?: number; cacheWriteCost?: number; totalTokens?: number } }> = d?.aggregates?.byModel || [];
    const modelCosts: ModelCost[] = byModel.map((m) => ({
      model: m.model || "unknown",
      provider: m.provider,
      count: m.count || 0,
      totalCost: m.totals?.totalCost || 0,
      inputCost: m.totals?.inputCost || 0,
      outputCost: m.totals?.outputCost || 0,
      cacheReadCost: m.totals?.cacheReadCost || 0,
      cacheWriteCost: m.totals?.cacheWriteCost || 0,
      totalTokens: m.totals?.totalTokens || 0,
    })).sort((a, b) => b.totalCost - a.totalCost);

    return { daily, modelCosts };
  };

  const { data, loading, stale } = useCachedRpc<CostsData>("costs", fetchCosts, 60_000);
  const daily = data?.daily ?? [];
  const modelCosts = data?.modelCosts ?? [];

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

  const totalCost = daily.reduce((s, d) => s + d.totalCost, 0);
  const totalTokens = daily.reduce((s, d) => s + d.totalTokens, 0);
  const today = daily[daily.length - 1];
  const yesterday = daily.length >= 2 ? daily[daily.length - 2] : null;
  const costTrend = today && yesterday ? today.totalCost - yesterday.totalCost : 0;
  const last7 = daily.slice(-7);
  const last7Cost = last7.reduce((s, d) => s + d.totalCost, 0);
  const maxDailyCost = Math.max(...daily.map(d => d.totalCost), 0.01);

  // Cost breakdown
  const totalInput = daily.reduce((s, d) => s + d.inputCost, 0);
  const totalOutput = daily.reduce((s, d) => s + d.outputCost, 0);
  const totalCacheRead = daily.reduce((s, d) => s + d.cacheReadCost, 0);
  const totalCacheWrite = daily.reduce((s, d) => s + d.cacheWriteCost, 0);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/5 bg-white/[0.01] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <DollarSign className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Costs</h1>
              <p className="text-sm text-white/40">{daily.length} days of usage{stale && <Loader2 className="inline h-3 w-3 ml-2 animate-spin text-orange-400/50" />}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading && !data ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 text-orange-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
                <p className="text-[11px] text-white/30 mb-1">Total ({daily.length}d)</p>
                <p className="text-2xl font-bold text-white">{formatCost(totalCost)}</p>
                <p className="text-[10px] text-white/20 mt-1">{formatTokens(totalTokens)} tokens</p>
              </div>
              <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
                <p className="text-[11px] text-white/30 mb-1">Last 7 days</p>
                <p className="text-2xl font-bold text-white">{formatCost(last7Cost)}</p>
                <p className="text-[10px] text-white/20 mt-1">{formatCost(last7Cost / 7)}/day avg</p>
              </div>
              <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
                <p className="text-[11px] text-white/30 mb-1">Today</p>
                <p className="text-2xl font-bold text-white">{today ? formatCost(today.totalCost) : "—"}</p>
                <div className="flex items-center gap-1 mt-1">
                  {costTrend > 0 ? (
                    <><TrendingUp className="h-3 w-3 text-red-400" /><span className="text-[10px] text-red-400">+{formatCost(costTrend)} vs yesterday</span></>
                  ) : costTrend < 0 ? (
                    <><TrendingDown className="h-3 w-3 text-green-400" /><span className="text-[10px] text-green-400">{formatCost(costTrend)} vs yesterday</span></>
                  ) : (
                    <span className="text-[10px] text-white/20">same as yesterday</span>
                  )}
                </div>
              </div>
              <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
                <p className="text-[11px] text-white/30 mb-1">Avg/day</p>
                <p className="text-2xl font-bold text-white">{formatCost(totalCost / daily.length)}</p>
                <p className="text-[10px] text-white/20 mt-1">~{formatCost(totalCost / daily.length * 30)}/mo projected</p>
              </div>
            </div>

            {/* Cost bar chart */}
            <div className="rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3">
                <BarChart3 className="h-4 w-4 text-orange-400" />
                <h2 className="text-sm font-semibold text-white">Daily Cost</h2>
              </div>
              <div className="p-5">
                <div className="flex items-end gap-1" style={{ height: "160px" }}>
                  {daily.map((d, i) => {
                    const pct = maxDailyCost > 0 ? (d.totalCost / maxDailyCost) * 100 : 0;
                    const isToday = i === daily.length - 1;
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center justify-end group relative" style={{ height: "100%" }}>
                        <div
                          className={`w-full rounded-t transition-all ${
                            isToday ? "bg-orange-500" : "bg-orange-500/30 group-hover:bg-orange-500/50"
                          }`}
                          style={{ height: `${Math.max(pct, 1)}%` }}
                        />
                        {/* Tooltip */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                          <div className="bg-black/90 rounded px-2 py-1 text-[10px] text-white whitespace-nowrap border border-white/10">
                            {formatDate(d.date)}: {formatCost(d.totalCost)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-[9px] text-white/20">
                  <span>{daily.length > 0 ? formatDate(daily[0].date) : ""}</span>
                  <span>{daily.length > 0 ? formatDate(daily[daily.length - 1].date) : ""}</span>
                </div>
              </div>
            </div>

            {/* Cost breakdown */}
            <div className="rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5">
                <h2 className="text-sm font-semibold text-white">Cost Breakdown</h2>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/50 w-24">Cache Write</span>
                  <div className="flex-1 h-2 rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-orange-500/60" style={{ width: `${totalCost > 0 ? (totalCacheWrite / totalCost) * 100 : 0}%` }} />
                  </div>
                  <span className="text-xs text-white/50 w-16 text-right">{formatCost(totalCacheWrite)}</span>
                  <span className="text-[10px] text-white/25 w-10 text-right">{totalCost > 0 ? Math.round((totalCacheWrite / totalCost) * 100) : 0}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/50 w-24">Cache Read</span>
                  <div className="flex-1 h-2 rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-amber-500/60" style={{ width: `${totalCost > 0 ? (totalCacheRead / totalCost) * 100 : 0}%` }} />
                  </div>
                  <span className="text-xs text-white/50 w-16 text-right">{formatCost(totalCacheRead)}</span>
                  <span className="text-[10px] text-white/25 w-10 text-right">{totalCost > 0 ? Math.round((totalCacheRead / totalCost) * 100) : 0}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/50 w-24">Output</span>
                  <div className="flex-1 h-2 rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-blue-500/60" style={{ width: `${totalCost > 0 ? (totalOutput / totalCost) * 100 : 0}%` }} />
                  </div>
                  <span className="text-xs text-white/50 w-16 text-right">{formatCost(totalOutput)}</span>
                  <span className="text-[10px] text-white/25 w-10 text-right">{totalCost > 0 ? Math.round((totalOutput / totalCost) * 100) : 0}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/50 w-24">Input</span>
                  <div className="flex-1 h-2 rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-green-500/60" style={{ width: `${totalCost > 0 ? (totalInput / totalCost) * 100 : 0}%` }} />
                  </div>
                  <span className="text-xs text-white/50 w-16 text-right">{formatCost(totalInput)}</span>
                  <span className="text-[10px] text-white/25 w-10 text-right">{totalCost > 0 ? Math.round((totalInput / totalCost) * 100) : 0}%</span>
                </div>
              </div>
            </div>

            {/* Cost by Model */}
            {modelCosts.length > 0 && (
              <div className="rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5">
                  <h2 className="text-sm font-semibold text-white">Cost by Model</h2>
                </div>
                <div className="px-5 py-2 flex items-center gap-4 text-[11px] text-white/25 uppercase tracking-wider border-b border-white/5">
                  <span className="flex-1">Model</span>
                  <span className="w-16 text-right">Calls</span>
                  <span className="w-24 text-right">Tokens</span>
                  <span className="w-20 text-right">Input</span>
                  <span className="w-20 text-right">Output</span>
                  <span className="w-24 text-right font-semibold">Total</span>
                </div>
                {(() => {
                  const maxModelCost = Math.max(...modelCosts.map(m => m.totalCost), 0.01);
                  return modelCosts.map((m) => (
                    <div key={m.model} className="px-5 py-2.5 border-b border-white/[0.02] hover:bg-white/[0.02] transition-all">
                      <div className="flex items-center gap-4 text-[13px]">
                        <div className="flex-1 min-w-0">
                          <span className="text-white/60 truncate block">{m.model.replace(/^.*\//, "")}</span>
                          {m.provider && <span className="text-[10px] text-white/20">{m.provider}</span>}
                        </div>
                        <span className="w-16 text-right text-white/35 font-mono text-[12px]">{m.count}</span>
                        <span className="w-24 text-right text-white/35 font-mono text-[12px]">{formatTokens(m.totalTokens)}</span>
                        <span className="w-20 text-right text-white/35">{formatCost(m.inputCost)}</span>
                        <span className="w-20 text-right text-white/35">{formatCost(m.outputCost)}</span>
                        <span className="w-24 text-right text-white/70 font-medium">{formatCost(m.totalCost)}</span>
                      </div>
                      <div className="mt-1.5 h-1 rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-orange-500/40" style={{ width: `${(m.totalCost / maxModelCost) * 100}%` }} />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}

            {/* Daily table */}
            <div className="rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3">
                <Calendar className="h-4 w-4 text-white/40" />
                <h2 className="text-sm font-semibold text-white">Daily Breakdown</h2>
              </div>
              <div className="px-5 py-2 flex items-center gap-4 text-[11px] text-white/25 uppercase tracking-wider border-b border-white/5">
                <span className="w-24">Date</span>
                <span className="w-24">Tokens</span>
                <span className="w-20 text-right">Input</span>
                <span className="w-20 text-right">Output</span>
                <span className="w-20 text-right">Cache R</span>
                <span className="w-20 text-right">Cache W</span>
                <span className="w-24 text-right font-semibold">Total</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {[...daily].reverse().map((d) => (
                  <div key={d.date} className="px-5 py-2.5 flex items-center gap-4 text-[13px] hover:bg-white/[0.02] transition-all border-b border-white/[0.02]">
                    <span className="w-24 text-white/50">{formatDate(d.date)}</span>
                    <span className="w-24 text-white/40 font-mono text-[12px]">{formatTokens(d.totalTokens)}</span>
                    <span className="w-20 text-right text-white/35">{formatCost(d.inputCost)}</span>
                    <span className="w-20 text-right text-white/35">{formatCost(d.outputCost)}</span>
                    <span className="w-20 text-right text-white/35">{formatCost(d.cacheReadCost)}</span>
                    <span className="w-20 text-right text-white/35">{formatCost(d.cacheWriteCost)}</span>
                    <span className="w-24 text-right text-white/70 font-medium">{formatCost(d.totalCost)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
