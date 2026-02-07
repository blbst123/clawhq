"use client";

import { useState } from "react";
import {
  DollarSign,
  Zap,
  Database,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Lightbulb,
  Sparkles,
  BarChart3
} from "lucide-react";

const modelBreakdown = [
  { model: "Claude Opus", cost: 28.50, tokens: "850K", percent: 62, color: "orange" },
  { model: "Claude Sonnet", cost: 14.20, tokens: "1.2M", percent: 31, color: "blue" },
  { model: "Groq (Free)", cost: 0.00, tokens: "350K", percent: 7, color: "green" },
];

const dailyCosts = [
  { day: "Mon", cost: 2.45, tokens: "320K" },
  { day: "Tue", cost: 3.12, tokens: "410K" },
  { day: "Wed", cost: 2.89, tokens: "380K" },
  { day: "Thu", cost: 2.67, tokens: "350K" },
  { day: "Fri", cost: 3.45, tokens: "450K" },
  { day: "Sat", cost: 1.98, tokens: "260K" },
  { day: "Sun", cost: 2.24, tokens: "290K" },
];

const tips = [
  { text: "62% of spend is on Opus. Consider using Sonnet for routine tasks.", highlight: "62%", color: "text-green-400" },
  { text: "Average cost per task: $0.38", highlight: "$0.38", color: "text-orange-400" },
  { text: "Projected monthly: ~$195 at current rate", highlight: "~$195", color: "text-yellow-400" },
];

export default function CostsPage() {
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const maxCost = Math.max(...dailyCosts.map(d => d.cost));

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/5 bg-white/[0.01] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <DollarSign className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Costs & Usage</h1>
              <p className="text-sm text-white/40">API spend & token tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300">
              <DollarSign className="h-3.5 w-3.5" /> $2.45 today
              <TrendingUp className="h-3 w-3 text-green-400 ml-1" />
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300">
              <BarChart3 className="h-3.5 w-3.5" /> $18.80 /wk
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 text-green-300">
              <Zap className="h-3.5 w-3.5" /> $45.80 /mo
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] text-white/40">
              <Database className="h-3.5 w-3.5" /> 2.4M tokens
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Daily Spend Chart */}
        <div className="px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-3.5 w-3.5 text-orange-400" />
            <span className="text-sm font-semibold text-white/60">Daily Spend</span>
            <span className="text-[10px] text-white/20">This Week</span>
          </div>
          <div className="flex items-end gap-2 h-32">
            {dailyCosts.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <span className="text-[10px] text-white/30 opacity-0 group-hover:opacity-100 transition-opacity">${day.cost.toFixed(2)}</span>
                <div className="w-full relative">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-orange-600/80 to-orange-400/80 transition-all group-hover:from-orange-500 group-hover:to-orange-300"
                    style={{ height: `${(day.cost / maxCost) * 100}px` }}
                  />
                </div>
                <span className="text-[10px] text-white/30">{day.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Model Breakdown */}
        <div className="px-6 py-3 border-b border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-orange-400" />
            <span className="text-sm font-semibold text-white/60">By Model</span>
          </div>
          {modelBreakdown.map((item, i) => (
            <button
              key={i}
              onClick={() => setExpandedModel(expandedModel === item.model ? null : item.model)}
              className="w-full text-left"
            >
              <div className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-all hover:bg-white/[0.02] ${expandedModel === item.model ? "bg-white/[0.03]" : ""}`}>
                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                  item.color === "orange" ? "bg-orange-400" :
                  item.color === "blue" ? "bg-blue-400" : "bg-green-400"
                }`} />
                <span className="text-xs font-medium text-white/70 flex-1">{item.model}</span>
                <div className="w-24 h-1.5 rounded-full bg-white/5 flex-shrink-0">
                  <div
                    className={`h-full rounded-full ${
                      item.color === "orange" ? "bg-orange-500" :
                      item.color === "blue" ? "bg-blue-500" : "bg-green-500"
                    }`}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
                <span className="text-xs text-white/40 w-14 text-right">${item.cost.toFixed(2)}</span>
                <span className="text-[10px] text-white/20 w-8 text-right">{item.percent}%</span>
                <ChevronRight className={`h-3 w-3 text-white/15 transition-transform ${expandedModel === item.model ? "rotate-90" : ""}`} />
              </div>
              {expandedModel === item.model && (
                <div className="ml-7 px-2 pb-2">
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-white/25">Cost</p>
                      <p className="text-xs text-white/60">${item.cost.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/25">Tokens</p>
                      <p className="text-xs text-white/60">{item.tokens}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/25">Share</p>
                      <p className="text-xs text-white/60">{item.percent}%</p>
                    </div>
                  </div>
                </div>
              )}
            </button>
          ))}
          <div className="flex items-center justify-between px-2 pt-2 mt-1 border-t border-white/5">
            <span className="text-[10px] text-white/25">Total This Month</span>
            <span className="text-sm font-bold text-white/70">$45.80</span>
          </div>
        </div>

        {/* Cost Optimization */}
        <div className="px-6 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-3.5 w-3.5 text-yellow-400" />
            <span className="text-sm font-semibold text-white/60">Optimization Tips</span>
          </div>
          <div className="space-y-1">
            {tips.map((tip, i) => (
              <div key={i} className="px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.03] transition-all">
                <p className="text-xs text-white/50">{tip.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
