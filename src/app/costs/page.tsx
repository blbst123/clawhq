import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Zap,
  Database,
  Calendar
} from "lucide-react";

export default function CostsPage() {
  const modelBreakdown = [
    { model: "Claude Opus", cost: "$28.50", tokens: "850K", percent: 62, color: "orange" },
    { model: "Claude Sonnet", cost: "$14.20", tokens: "1.2M", percent: 31, color: "blue" },
    { model: "Groq (Free)", cost: "$0.00", tokens: "350K", percent: 7, color: "green" },
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

  const maxCost = Math.max(...dailyCosts.map(d => d.cost));

  return (
    <div className="p-8 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Costs & Usage</h1>
        <p className="text-white/50">Track API spend and token usage</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <DollarSign className="h-5 w-5 text-orange-400" />
            </div>
            <div className="flex items-center gap-1 text-xs">
              <TrendingUp className="h-3 w-3 text-green-400" />
              <span className="text-green-400">+8%</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-white mb-1">$2.45</p>
          <p className="text-sm text-white/40">Today</p>
        </div>

        <div className="stat-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Calendar className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex items-center gap-1 text-xs">
              <TrendingDown className="h-3 w-3 text-red-400" />
              <span className="text-red-400">-3%</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-white mb-1">$18.80</p>
          <p className="text-sm text-white/40">This Week</p>
        </div>

        <div className="stat-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Zap className="h-5 w-5 text-green-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mb-1">$45.80</p>
          <p className="text-sm text-white/40">This Month</p>
          <p className="text-xs text-white/30 mt-2">7 days in</p>
        </div>

        <div className="stat-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Database className="h-5 w-5 text-yellow-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mb-1">2.4M</p>
          <p className="text-sm text-white/40">Total Tokens</p>
          <p className="text-xs text-white/30 mt-2">1.8M in / 600K out</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Chart */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Daily Spend (This Week)</h2>
          <div className="flex items-end gap-3 h-48">
            {dailyCosts.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs text-white/50">${day.cost.toFixed(2)}</span>
                <div className="w-full relative group">
                  <div 
                    className="w-full rounded-t-lg bg-gradient-to-t from-orange-600 to-orange-400 transition-all group-hover:from-orange-500 group-hover:to-orange-300"
                    style={{ height: `${(day.cost / maxCost) * 150}px` }}
                  />
                  {/* Tooltip */}
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md rounded-lg px-3 py-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    <p className="text-white font-medium">${day.cost.toFixed(2)}</p>
                    <p className="text-white/50">{day.tokens} tokens</p>
                  </div>
                </div>
                <span className="text-xs text-white/40">{day.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Model Breakdown */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Cost by Model</h2>
          <div className="space-y-5">
            {modelBreakdown.map((item, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${
                      item.color === "orange" ? "bg-orange-400" :
                      item.color === "blue" ? "bg-blue-400" : "bg-green-400"
                    }`} />
                    <span className="text-white font-medium">{item.model}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white">{item.cost}</span>
                    <span className="text-white/40 text-sm ml-2">({item.percent}%)</span>
                  </div>
                </div>
                <div className="progress-bar h-2">
                  <div 
                    className={`progress-fill h-full ${
                      item.color === "orange" ? "progress-orange" :
                      item.color === "blue" ? "bg-gradient-to-r from-blue-600 to-blue-400" :
                      "progress-green"
                    }`}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
                <p className="text-xs text-white/30 mt-1">{item.tokens} tokens</p>
              </div>
            ))}
          </div>
          
          {/* Total */}
          <div className="mt-6 pt-6 border-t border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-white/50">Total This Month</span>
              <span className="text-xl font-bold text-white">$45.80</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Optimization Tips */}
      <div className="mt-6 glass-card rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">💡 Cost Optimization</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
            <p className="text-sm text-white/70">
              <span className="text-green-400 font-medium">62%</span> of spend is on Opus. Consider using Sonnet for routine tasks.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
            <p className="text-sm text-white/70">
              Average cost per task: <span className="text-orange-400 font-medium">$0.38</span>
            </p>
          </div>
          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
            <p className="text-sm text-white/70">
              Projected monthly: <span className="text-yellow-400 font-medium">~$195</span> at current rate
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
