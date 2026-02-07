import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Zap, 
  DollarSign,
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles
} from "lucide-react";

export default function Dashboard() {
  return (
    <div className="p-8 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-3xl font-bold text-white">Welcome back, Bill</h1>
          <Sparkles className="h-6 w-6 text-purple-400" />
        </div>
        <p className="text-white/50">Here&apos;s what Lolo has been working on</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Today's Spend */}
        <div className="stat-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <DollarSign className="h-5 w-5 text-purple-400" />
            </div>
            <div className="flex items-center gap-1 text-xs">
              <TrendingUp className="h-3 w-3 text-green-400" />
              <span className="text-green-400">+12%</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-white mb-1">$2.45</p>
          <p className="text-sm text-white/40">Today&apos;s spend</p>
          <div className="mt-3 progress-bar">
            <div className="progress-fill progress-purple" style={{ width: '45%' }} />
          </div>
          <p className="text-xs text-white/30 mt-1">45% of daily budget</p>
        </div>

        {/* Tasks Completed */}
        <div className="stat-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            </div>
            <div className="flex items-center gap-1 text-xs">
              <TrendingUp className="h-3 w-3 text-green-400" />
              <span className="text-green-400">+3</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-white mb-1">12</p>
          <p className="text-sm text-white/40">Tasks completed</p>
          <div className="mt-3 progress-bar">
            <div className="progress-fill progress-green" style={{ width: '80%' }} />
          </div>
          <p className="text-xs text-white/30 mt-1">3 in progress</p>
        </div>

        {/* Cron Jobs */}
        <div className="stat-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Clock className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="flex items-center gap-1 text-xs text-white/40">
              <Circle className="h-2 w-2 fill-green-400 text-green-400" />
              <span>All running</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-white mb-1">8 active</p>
          <p className="text-sm text-white/40">Cron jobs</p>
          <div className="mt-3 progress-bar">
            <div className="progress-fill progress-yellow" style={{ width: '100%' }} />
          </div>
          <p className="text-xs text-white/30 mt-1">Next run in 23m</p>
        </div>

        {/* Hours Today */}
        <div className="stat-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-pink-500/10">
              <Zap className="h-5 w-5 text-pink-400" />
            </div>
            <div className="flex items-center gap-1 text-xs">
              <TrendingDown className="h-3 w-3 text-pink-400" />
              <span className="text-pink-400">-8%</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-white mb-1">4.2h</p>
          <p className="text-sm text-white/40">Hours today</p>
          <div className="mt-3 progress-bar">
            <div className="progress-fill progress-purple" style={{ width: '52%' }} />
          </div>
          <p className="text-xs text-white/30 mt-1">~$0.58/hour avg</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <div className="lg:col-span-2 glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Recent Tasks</h2>
              <p className="text-sm text-white/40">What Lolo has been working on</p>
            </div>
            <button className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors">
              View all <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            {[
              { title: "Morning Brief", status: "completed", time: "8:30am", progress: 100, source: "cron" },
              { title: "Lit.trade Analysis", status: "completed", time: "7:30am", progress: 100, source: "cron" },
              { title: "Content Research: AI replacing jobs", status: "in-progress", time: "3:35am", progress: 65, source: "cron" },
              { title: "Build ClawHQ MVP", status: "in-progress", time: "ongoing", progress: 40, source: "manual" },
              { title: "Market News Research", status: "completed", time: "4:00am", progress: 100, source: "cron" },
            ].map((task, i) => (
              <div key={i} className="group p-4 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      task.status === "completed" ? "bg-green-400 glow-green" : "bg-yellow-400 glow-yellow"
                    }`} />
                    <span className="font-medium text-white group-hover:text-purple-300 transition-colors">{task.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40">{task.source}</span>
                    <span className="text-xs text-white/40">{task.time}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 progress-bar">
                    <div 
                      className={`progress-fill ${task.status === "completed" ? "progress-green" : "progress-yellow"}`}
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/40 w-8">{task.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Cron Jobs */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Upcoming Jobs</h2>
              <p className="text-sm text-white/40">Next scheduled runs</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { name: "Content: Research #1", time: "3:35am", model: "Opus", color: "purple" },
              { name: "Content: Script #1", time: "4:05am", model: "Opus", color: "purple" },
              { name: "Lit Revenue Check", time: "2:00am", model: "Sonnet", color: "blue" },
              { name: "Morning Brief", time: "8:30am", model: "Sonnet", color: "blue" },
            ].map((job, i) => (
              <div key={i} className="p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-white text-sm">{job.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    job.color === "purple" 
                      ? "bg-purple-500/20 text-purple-300" 
                      : "bg-blue-500/20 text-blue-300"
                  }`}>
                    {job.model}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-white/30" />
                  <span className="text-xs text-white/40">{job.time} PST</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Quick Stats */}
          <div className="mt-6 pt-6 border-t border-white/5">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">23m</p>
                <p className="text-xs text-white/40">Until next run</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">12</p>
                <p className="text-xs text-white/40">Runs today</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
