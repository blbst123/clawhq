import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Task {
  title: string;
  priority: string;
  source: string;
  time?: string;
}

interface Column {
  title: string;
  color: string;
  tasks: Task[];
}

const columns: Column[] = [
  { 
    title: "Backlog", 
    color: "bg-neutral-600",
    tasks: [
      { title: "Research Hyperliquid competitors", priority: "P2", source: "cron" },
      { title: "Update MEMORY.md structure", priority: "P3", source: "manual" },
    ]
  },
  { 
    title: "In Progress", 
    color: "bg-yellow-600",
    tasks: [
      { title: "Content Research: AI replacing jobs", priority: "P1", source: "cron" },
      { title: "Build ClawHQ MVP", priority: "P1", source: "manual" },
    ]
  },
  { 
    title: "Review", 
    color: "bg-purple-600",
    tasks: [
      { title: "Morning Brief delivered", priority: "P1", source: "cron", time: "8:30am" },
    ]
  },
  { 
    title: "Done", 
    color: "bg-green-600",
    tasks: [
      { title: "Lit.trade Analysis", priority: "P1", source: "cron", time: "7:30am" },
      { title: "Schedule calendar events", priority: "P2", source: "chat", time: "1:20pm" },
      { title: "Market news research", priority: "P2", source: "cron", time: "4:00am" },
      { title: "Product trends research", priority: "P2", source: "cron", time: "3:30am" },
    ]
  },
];

export default function TasksPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Tasks</h1>
        <p className="text-neutral-400">Track what&apos;s been delegated to Lolo</p>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map((column) => (
          <div key={column.title} className="space-y-4">
            {/* Column Header */}
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${column.color}`} />
              <h2 className="font-semibold text-white">{column.title}</h2>
              <Badge variant="outline" className="text-neutral-500 border-neutral-700 ml-auto">
                {column.tasks.length}
              </Badge>
            </div>

            {/* Tasks */}
            <div className="space-y-3">
              {column.tasks.map((task, i) => (
                <Card key={i} className="bg-neutral-900 border-neutral-800 hover:border-neutral-700 cursor-pointer transition-colors">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-white mb-2">{task.title}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            task.priority === "P1" ? "border-red-500 text-red-500" :
                            task.priority === "P2" ? "border-yellow-500 text-yellow-500" :
                            "border-neutral-500 text-neutral-500"
                          }`}
                        >
                          {task.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-neutral-500 border-neutral-700">
                          {task.source}
                        </Badge>
                      </div>
                      {task.time && (
                        <span className="text-xs text-neutral-500">{task.time}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
