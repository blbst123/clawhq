import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-neutral-400">Welcome back, Bill</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-neutral-400">Today&apos;s Spend</CardDescription>
            <CardTitle className="text-2xl text-white">$2.45</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-neutral-500">+12% from yesterday</p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-neutral-400">Tasks Completed</CardDescription>
            <CardTitle className="text-2xl text-white">12</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-neutral-500">3 in progress</p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-neutral-400">Cron Jobs</CardDescription>
            <CardTitle className="text-2xl text-white">8 active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-neutral-500">Next run in 23m</p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-neutral-400">Hours Today</CardDescription>
            <CardTitle className="text-2xl text-white">4.2h</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-neutral-500">~$0.58/hour</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <Card className="lg:col-span-2 bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-white">Recent Tasks</CardTitle>
            <CardDescription className="text-neutral-400">What Lolo has been working on</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { title: "Morning Brief", status: "completed", time: "8:30am" },
                { title: "Lit.trade Analysis", status: "completed", time: "7:30am" },
                { title: "Content Research #1", status: "in-progress", time: "3:35am" },
                { title: "Market News Research", status: "completed", time: "4:00am" },
              ].map((task, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-neutral-800 last:border-0">
                  <div>
                    <p className="font-medium text-white">{task.title}</p>
                    <p className="text-sm text-neutral-500">{task.time}</p>
                  </div>
                  <Badge 
                    variant={task.status === "completed" ? "default" : "secondary"}
                    className={task.status === "completed" ? "bg-green-600" : "bg-yellow-600"}
                  >
                    {task.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Cron Jobs */}
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-white">Upcoming Jobs</CardTitle>
            <CardDescription className="text-neutral-400">Next scheduled runs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Content: Research #1", time: "3:35am", model: "Opus" },
                { name: "Content: Script #1", time: "4:05am", model: "Opus" },
                { name: "Lit Revenue Check", time: "2:00am", model: "Sonnet" },
              ].map((job, i) => (
                <div key={i} className="py-2 border-b border-neutral-800 last:border-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-white text-sm">{job.name}</p>
                    <Badge variant="outline" className="text-neutral-400 border-neutral-700 text-xs">
                      {job.model}
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">{job.time} PST</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
