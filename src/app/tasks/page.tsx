import { 
  Plus, 
  MoreHorizontal, 
  MessageSquare, 
  Link2, 
  Calendar,
  Filter,
  ArrowUpDown
} from "lucide-react";

interface Task {
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  source: string;
  date: string;
  progress: number;
  comments: number;
  links: number;
}

interface Column {
  title: string;
  color: string;
  glowClass: string;
  tasks: Task[];
}

const columns: Column[] = [
  { 
    title: "To Do", 
    color: "bg-white/40",
    glowClass: "",
    tasks: [
      { title: "Research Hyperliquid competitors", description: "Analyze competing platforms", priority: "Medium", source: "cron", date: "Feb 7", progress: 0, comments: 2, links: 1 },
      { title: "Update MEMORY.md structure", description: "Reorganize memory files", priority: "Low", source: "manual", date: "Feb 6", progress: 0, comments: 0, links: 0 },
    ]
  },
  { 
    title: "In Progress", 
    color: "bg-yellow-400",
    glowClass: "glow-yellow",
    tasks: [
      { title: "Content Research: AI jobs", description: "Research AI replacing jobs topic", priority: "High", source: "cron", date: "Feb 7", progress: 65, comments: 5, links: 3 },
      { title: "Build ClawHQ MVP", description: "Dashboard for agent management", priority: "High", source: "manual", date: "Feb 7", progress: 40, comments: 12, links: 2 },
    ]
  },
  { 
    title: "Done", 
    color: "bg-green-400",
    glowClass: "glow-green",
    tasks: [
      { title: "Morning Brief", description: "Daily update delivered", priority: "High", source: "cron", date: "Feb 7", progress: 100, comments: 1, links: 0 },
      { title: "Lit.trade Analysis", description: "Revenue and growth analysis", priority: "High", source: "cron", date: "Feb 7", progress: 100, comments: 3, links: 2 },
      { title: "Schedule calendar events", description: "Created daily schedule", priority: "Medium", source: "chat", date: "Feb 6", progress: 100, comments: 0, links: 1 },
      { title: "Market news research", description: "Crypto market updates", priority: "Medium", source: "cron", date: "Feb 7", progress: 100, comments: 2, links: 4 },
    ]
  },
];

const priorityColors = {
  High: "bg-red-500/20 text-red-300 border-red-500/30",
  Medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", 
  Low: "bg-green-500/20 text-green-300 border-green-500/30",
};

export default function TasksPage() {
  return (
    <div className="p-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Tasks</h1>
          <p className="text-white/50">Track what&apos;s been delegated to Lolo</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-all">
            <Filter className="h-4 w-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-all">
            <ArrowUpDown className="h-4 w-4" />
            Sort
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-all glow-orange">
            <Plus className="h-4 w-4" />
            New Task
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((column) => (
          <div key={column.title} className="space-y-4">
            {/* Column Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${column.color} ${column.glowClass}`} />
                <h2 className="font-semibold text-white">{column.title}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                  {column.tasks.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                  <Plus className="h-4 w-4" />
                </button>
                <button className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tasks */}
            <div className="space-y-3">
              {column.tasks.map((task, i) => (
                <div 
                  key={i} 
                  className="glass-card glass-card-hover rounded-xl p-4 cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-white text-sm leading-tight">{task.title}</h3>
                    <button className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-white/40 mb-3">{task.description}</p>
                  
                  {/* Progress Bar */}
                  {task.progress > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white/40">Progress</span>
                        <span className="text-xs text-white/60">{task.progress}/100</span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className={`progress-fill ${task.progress === 100 ? 'progress-green' : 'progress-yellow'}`}
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Meta */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColors[task.priority]}`}>
                        {task.priority}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40">
                        {task.source}
                      </span>
                    </div>
                  </div>
                  
                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-1 text-white/30">
                      <Calendar className="h-3 w-3" />
                      <span className="text-xs">{task.date}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {task.comments > 0 && (
                        <div className="flex items-center gap-1 text-white/30">
                          <MessageSquare className="h-3 w-3" />
                          <span className="text-xs">{task.comments}</span>
                        </div>
                      )}
                      {task.links > 0 && (
                        <div className="flex items-center gap-1 text-white/30">
                          <Link2 className="h-3 w-3" />
                          <span className="text-xs">{task.links}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Add Task Button */}
              <button className="w-full p-3 rounded-xl border border-dashed border-white/10 text-white/30 hover:text-white/50 hover:border-white/20 hover:bg-white/[0.02] transition-all text-sm flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" />
                Add task
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
