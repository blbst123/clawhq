import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Pause, Clock } from "lucide-react";

export default function CronPage() {
  const jobs = [
    { 
      name: "Lit.trade Revenue Check", 
      schedule: "0 2 * * *", 
      time: "2:00am PST",
      model: "Sonnet",
      enabled: true,
      lastRun: "Today, 2:00am",
      status: "success"
    },
    { 
      name: "Content: Research #1", 
      schedule: "35 3 * * *", 
      time: "3:35am PST",
      model: "Opus",
      enabled: true,
      lastRun: "Today, 3:35am",
      status: "success"
    },
    { 
      name: "Content: Script #1", 
      schedule: "5 4 * * *", 
      time: "4:05am PST",
      model: "Opus",
      enabled: true,
      lastRun: "Today, 4:05am",
      status: "success"
    },
    { 
      name: "Morning Brief", 
      schedule: "30 8 * * *", 
      time: "8:30am PST",
      model: "Sonnet",
      enabled: true,
      lastRun: "Today, 8:30am",
      status: "success"
    },
    { 
      name: "Agent Blueprints Improvement", 
      schedule: "30 4 * * *", 
      time: "4:30am PST",
      model: "Sonnet",
      enabled: false,
      lastRun: "Feb 4, 4:30am",
      status: "disabled"
    },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Cron Jobs</h1>
          <p className="text-neutral-400">Manage scheduled tasks</p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700">
          + New Job
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-neutral-400">Active Jobs</CardDescription>
            <CardTitle className="text-2xl text-white">4</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-neutral-500">1 disabled</p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-neutral-400">Runs Today</CardDescription>
            <CardTitle className="text-2xl text-white">12</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-neutral-500">All successful</p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-neutral-400">Next Run</CardDescription>
            <CardTitle className="text-2xl text-white flex items-center gap-2">
              <Clock className="h-5 w-5" />
              23m
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-neutral-500">Lit Revenue Check</p>
          </CardContent>
        </Card>
      </div>

      {/* Jobs List */}
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-white">All Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {jobs.map((job, i) => (
              <div key={i} className="flex items-center justify-between py-4 border-b border-neutral-800 last:border-0">
                <div className="flex items-center gap-4">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className={job.enabled ? "text-green-500" : "text-neutral-500"}
                  >
                    {job.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <div>
                    <p className="font-medium text-white">{job.name}</p>
                    <p className="text-sm text-neutral-500">{job.time} · {job.schedule}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="text-neutral-400 border-neutral-700">
                    {job.model}
                  </Badge>
                  <Badge 
                    className={
                      job.status === "success" ? "bg-green-600" : 
                      job.status === "disabled" ? "bg-neutral-600" : "bg-red-600"
                    }
                  >
                    {job.status}
                  </Badge>
                  <span className="text-xs text-neutral-500 w-28 text-right">{job.lastRun}</span>
                  <Button variant="ghost" size="sm" className="text-neutral-400">
                    Run Now
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
