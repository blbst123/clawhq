import { 
  Plus, 
  Play, 
  Pause, 
  Clock, 
  CheckCircle2, 
  XCircle,
  MoreHorizontal,
  Zap,
  Calendar
} from "lucide-react";

interface Job {
  name: string;
  schedule: string;
  time: string;
  model: string;
  modelColor: string;
  enabled: boolean;
  lastRun: string;
  status: "success" | "failed" | "disabled";
  nextRun: string;
}

const jobs: Job[] = [
  { 
    name: "Lit.trade Revenue Check", 
    schedule: "0 2 * * *", 
    time: "2:00am PST",
    model: "Sonnet",
    modelColor: "blue",
    enabled: true,
    lastRun: "Today, 2:00am",
    status: "success",
    nextRun: "23m"
  },
  { 
    name: "Content: Research #1", 
    schedule: "35 3 * * *", 
    time: "3:35am PST",
    model: "Opus",
    modelColor: "purple",
    enabled: true,
    lastRun: "Today, 3:35am",
    status: "success",
    nextRun: "1h 58m"
  },
  { 
    name: "Content: Script #1", 
    schedule: "5 4 * * *", 
    time: "4:05am PST",
    model: "Opus",
    modelColor: "purple",
    enabled: true,
    lastRun: "Today, 4:05am",
    status: "success",
    nextRun: "2h 28m"
  },
  { 
    name: "Morning Brief", 
    schedule: "30 8 * * *", 
    time: "8:30am PST",
    model: "Sonnet",
    modelColor: "blue",
    enabled: true,
    lastRun: "Today, 8:30am",
    status: "success",
    nextRun: "6h 53m"
  },
  { 
    name: "Lit Analysis", 
    schedule: "30 7 * * *", 
    time: "7:30am PST",
    model: "Sonnet",
    modelColor: "blue",
    enabled: true,
    lastRun: "Today, 7:30am",
    status: "success",
    nextRun: "5h 53m"
  },
  { 
    name: "Agent Blueprints Improvement", 
    schedule: "30 4 * * *", 
    time: "4:30am PST",
    model: "Sonnet",
    modelColor: "blue",
    enabled: false,
    lastRun: "Feb 4, 4:30am",
    status: "disabled",
    nextRun: "-"
  },
];

export default function CronPage() {
  const activeJobs = jobs.filter(j => j.enabled).length;
  const disabledJobs = jobs.filter(j => !j.enabled).length;

  return (
    <div className="p-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Cron Jobs</h1>
          <p className="text-white/50">Manage scheduled tasks</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium transition-all glow-purple">
          <Plus className="h-4 w-4" />
          New Job
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="stat-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Zap className="h-5 w-5 text-green-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mb-1">{activeJobs}</p>
          <p className="text-sm text-white/40">Active Jobs</p>
          <p className="text-xs text-white/30 mt-2">{disabledJobs} disabled</p>
        </div>

        <div className="stat-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <CheckCircle2 className="h-5 w-5 text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mb-1">12</p>
          <p className="text-sm text-white/40">Runs Today</p>
          <p className="text-xs text-green-400 mt-2">All successful</p>
        </div>

        <div className="stat-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Clock className="h-5 w-5 text-yellow-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mb-1">23m</p>
          <p className="text-sm text-white/40">Next Run</p>
          <p className="text-xs text-white/30 mt-2">Lit Revenue Check</p>
        </div>
      </div>

      {/* Jobs List */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h2 className="font-semibold text-white">All Jobs</h2>
        </div>
        <div className="divide-y divide-white/5">
          {jobs.map((job, i) => (
            <div key={i} className="p-4 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    className={`p-2 rounded-lg transition-all ${
                      job.enabled 
                        ? "bg-green-500/10 text-green-400 hover:bg-green-500/20" 
                        : "bg-white/5 text-white/30 hover:bg-white/10"
                    }`}
                  >
                    {job.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{job.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        job.modelColor === "purple" 
                          ? "bg-purple-500/20 text-purple-300" 
                          : "bg-blue-500/20 text-blue-300"
                      }`}>
                        {job.model}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-white/40">{job.time}</span>
                      <span className="text-xs text-white/30 font-mono">{job.schedule}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      {job.status === "success" && (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      )}
                      {job.status === "failed" && (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                      {job.status === "disabled" && (
                        <Pause className="h-4 w-4 text-white/30" />
                      )}
                      <span className={`text-sm ${
                        job.status === "success" ? "text-green-400" :
                        job.status === "failed" ? "text-red-400" :
                        "text-white/30"
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-xs text-white/30 mt-0.5">{job.lastRun}</p>
                  </div>
                  
                  <div className="text-right w-20">
                    {job.enabled ? (
                      <>
                        <p className="text-sm font-medium text-white">{job.nextRun}</p>
                        <p className="text-xs text-white/30">until next</p>
                      </>
                    ) : (
                      <span className="text-sm text-white/30">-</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs transition-all">
                      Run Now
                    </button>
                    <button className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
