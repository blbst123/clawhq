"use client";

import { useState } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  DollarSign,
  Zap,
  X,
  Calendar,
  ArrowRight,
  Play,
  FileText,
  MessageSquare,
  ExternalLink,
  MoreHorizontal,
  TrendingUp,
  Sparkles
} from "lucide-react";

// Generate mock data for the entire month
const generateMonthData = () => {
  const days: DayData[] = [];
  const daysInMonth = 28; // February 2026
  
  for (let i = 1; i <= daysInMonth; i++) {
    const isPast = i <= 7;
    const isToday = i === 7;
    const isFuture = i > 7;
    
    // Generate varying activity levels
    const activityLevel = isFuture ? 0 : Math.floor(Math.random() * 5);
    const cronRuns = isFuture ? 0 : Math.floor(Math.random() * 12) + 2;
    const tasksCompleted = isFuture ? 0 : Math.floor(Math.random() * 6) + 1;
    const cost = isFuture ? 0 : Math.round((Math.random() * 4 + 1) * 100) / 100;
    const hours = isFuture ? 0 : Math.round((Math.random() * 5 + 1) * 10) / 10;
    
    const cronEvents: Event[] = [];
    const taskEvents: TaskEvent[] = [];
    
    if (!isFuture) {
      // Cron events
      cronEvents.push({ time: "2:00am", name: "Lit Revenue Check", type: "cron", status: "success", model: "Sonnet", duration: "45s", cost: 0.12 });
      if (cronRuns > 3) {
        cronEvents.push({ time: "3:35am", name: "Content Research", type: "cron", status: "success", model: "Opus", duration: "3m 20s", cost: 0.85 });
      }
      if (cronRuns > 5) {
        cronEvents.push({ time: "4:05am", name: "Content Script", type: "cron", status: "success", model: "Opus", duration: "4m 15s", cost: 0.92 });
      }
      cronEvents.push({ time: "7:30am", name: "Lit Analysis", type: "cron", status: "success", model: "Sonnet", duration: "1m 12s", cost: 0.18 });
      cronEvents.push({ time: "8:30am", name: "Morning Brief", type: "cron", status: "success", model: "Sonnet", duration: "2m 05s", cost: 0.24 });
      
      // Task events
      taskEvents.push({
        id: `task-${i}-1`,
        title: "Morning Brief Delivered",
        description: "Generated and sent daily update with market overview, calendar events, and priority tasks.",
        time: "8:32am",
        duration: "2m 05s",
        status: "completed",
        source: "cron",
        model: "Sonnet",
        cost: 0.24,
        tokensIn: 1250,
        tokensOut: 890,
        tags: ["daily", "automated"]
      });
      
      if (tasksCompleted > 1) {
        taskEvents.push({
          id: `task-${i}-2`,
          title: "Lit.trade Revenue Analysis",
          description: "Analyzed 24h trading volume, fee revenue, and user metrics. Generated insights report.",
          time: "7:45am",
          duration: "1m 12s",
          status: "completed",
          source: "cron",
          model: "Sonnet",
          cost: 0.18,
          tokensIn: 980,
          tokensOut: 650,
          tags: ["lit.trade", "analytics"]
        });
      }
      
      if (tasksCompleted > 2) {
        taskEvents.push({
          id: `task-${i}-3`,
          title: "Content Research: AI Jobs",
          description: "Deep research on AI replacing jobs topic. Found 12 sources, synthesized key arguments, drafted outline.",
          time: "3:58am",
          duration: "3m 20s",
          status: "completed",
          source: "cron",
          model: "Opus",
          cost: 0.85,
          tokensIn: 4200,
          tokensOut: 2800,
          tags: ["content", "research"]
        });
      }
      
      if (tasksCompleted > 3) {
        taskEvents.push({
          id: `task-${i}-4`,
          title: "ClawHQ Dashboard Updates",
          description: "Built calendar view component, added activity heatmap, implemented day detail panel.",
          time: "5:15pm",
          duration: "45m",
          status: "completed",
          source: "chat",
          model: "Opus",
          cost: 1.20,
          tokensIn: 8500,
          tokensOut: 6200,
          tags: ["clawhq", "development"]
        });
      }
      
      if (tasksCompleted > 4) {
        taskEvents.push({
          id: `task-${i}-5`,
          title: "Email Draft: Investor Update",
          description: "Drafted Q4 investor update email covering Lit.trade metrics and roadmap.",
          time: "11:30am",
          duration: "8m",
          status: "completed",
          source: "chat",
          model: "Sonnet",
          cost: 0.32,
          tokensIn: 1800,
          tokensOut: 1200,
          tags: ["email", "lit.trade"]
        });
      }
    } else {
      // Future scheduled events
      cronEvents.push({ time: "2:00am", name: "Lit Revenue Check", type: "cron", status: "scheduled", model: "Sonnet", duration: "-", cost: 0 });
      cronEvents.push({ time: "8:30am", name: "Morning Brief", type: "cron", status: "scheduled", model: "Sonnet", duration: "-", cost: 0 });
    }
    
    days.push({
      date: i,
      dayOfWeek: getDayOfWeek(i),
      cronRuns,
      tasksCompleted,
      cost,
      hours,
      activityLevel,
      isToday,
      isFuture,
      cronEvents,
      taskEvents
    });
  }
  
  return days;
};

const getDayOfWeek = (date: number): string => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[(date) % 7];
};

const getFullDayOfWeek = (date: number): string => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[(date) % 7];
};

interface Event {
  time: string;
  name: string;
  type: "cron" | "task";
  status: "success" | "failed" | "in-progress" | "scheduled";
  model: string;
  duration: string;
  cost: number;
}

interface TaskEvent {
  id: string;
  title: string;
  description: string;
  time: string;
  duration: string;
  status: "completed" | "in-progress" | "failed";
  source: "cron" | "chat" | "manual";
  model: string;
  cost: number;
  tokensIn: number;
  tokensOut: number;
  tags: string[];
}

interface DayData {
  date: number;
  dayOfWeek: string;
  cronRuns: number;
  tasksCompleted: number;
  cost: number;
  hours: number;
  activityLevel: number;
  isToday: boolean;
  isFuture: boolean;
  cronEvents: Event[];
  taskEvents: TaskEvent[];
}

const monthData = generateMonthData();

const getActivityColor = (level: number, isFuture: boolean) => {
  if (isFuture) return "bg-white/[0.02]";
  switch (level) {
    case 0: return "bg-white/[0.03]";
    case 1: return "bg-orange-500/10";
    case 2: return "bg-orange-500/20";
    case 3: return "bg-orange-500/30";
    case 4: return "bg-orange-500/40";
    default: return "bg-white/[0.03]";
  }
};

const getActivityBorder = (level: number, isToday: boolean, isFuture: boolean) => {
  if (isToday) return "border-orange-500/50 ring-2 ring-orange-500/20";
  if (isFuture) return "border-white/5";
  switch (level) {
    case 0: return "border-white/5";
    case 1: return "border-orange-500/10";
    case 2: return "border-orange-500/20";
    case 3: return "border-orange-500/30";
    case 4: return "border-orange-500/40";
    default: return "border-white/5";
  }
};

export default function CalendarPage() {
  const [selectedDay, setSelectedDay] = useState<DayData | null>(monthData.find(d => d.isToday) || null);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  const calendarGrid: (DayData | null)[] = [...monthData];
  
  const monthTotals = monthData.reduce((acc, day) => ({
    cronRuns: acc.cronRuns + day.cronRuns,
    tasksCompleted: acc.tasksCompleted + day.tasksCompleted,
    cost: acc.cost + day.cost,
    hours: acc.hours + day.hours
  }), { cronRuns: 0, tasksCompleted: 0, cost: 0, hours: 0 });

  return (
    <div className="p-8 min-h-screen flex gap-6">
      {/* Main Calendar Area */}
      <div className="w-[480px] flex-shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Calendar className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Activity Calendar</h1>
              <p className="text-sm text-white/50">February 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="glass-card rounded-xl p-4">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {weekDays.map((day) => (
              <div key={day} className="text-center py-1.5">
                <span className="text-[10px] font-medium text-white/40">{day}</span>
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarGrid.map((day, i) => (
              day ? (
                <button
                  key={i}
                  onClick={() => setSelectedDay(day)}
                  className={`
                    relative p-2 rounded-lg border transition-all cursor-pointer
                    ${getActivityColor(day.activityLevel, day.isFuture)}
                    ${getActivityBorder(day.activityLevel, day.isToday, day.isFuture)}
                    ${selectedDay?.date === day.date ? "ring-2 ring-orange-400" : ""}
                    hover:border-white/20
                  `}
                >
                  <span className={`text-sm font-bold ${
                    day.isToday ? "text-orange-400" : 
                    day.isFuture ? "text-white/30" : "text-white"
                  }`}>
                    {day.date}
                  </span>
                  {!day.isFuture && day.activityLevel > 0 && (
                    <div className="absolute bottom-1 right-1 flex gap-0.5">
                      {Array.from({ length: Math.min(day.activityLevel, 3) }).map((_, j) => (
                        <div key={j} className="h-1 w-1 rounded-full bg-orange-400" />
                      ))}
                    </div>
                  )}
                </button>
              ) : (
                <div key={i} className="p-2 rounded-lg" />
              )
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-white/5">
            <span className="text-[10px] text-white/30">Activity:</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <div 
                key={level}
                className={`h-3 w-3 rounded ${getActivityColor(level, false)} border ${
                  level === 0 ? "border-white/10" : `border-orange-500/${level * 10 + 10}`
                }`}
              />
            ))}
          </div>
        </div>

        {/* Month Stats */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="glass-card rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3 w-3 text-orange-400" />
              <span className="text-[10px] text-white/50">Cron Runs</span>
            </div>
            <p className="text-lg font-bold text-white">{monthTotals.cronRuns}</p>
          </div>
          <div className="glass-card rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-3 w-3 text-green-400" />
              <span className="text-[10px] text-white/50">Tasks Done</span>
            </div>
            <p className="text-lg font-bold text-white">{monthTotals.tasksCompleted}</p>
          </div>
          <div className="glass-card rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-3 w-3 text-amber-400" />
              <span className="text-[10px] text-white/50">Total Cost</span>
            </div>
            <p className="text-lg font-bold text-white">${monthTotals.cost.toFixed(2)}</p>
          </div>
          <div className="glass-card rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-3 w-3 text-yellow-400" />
              <span className="text-[10px] text-white/50">Hours Active</span>
            </div>
            <p className="text-lg font-bold text-white">{monthTotals.hours.toFixed(1)}h</p>
          </div>
        </div>
      </div>

      {/* Day Detail Panel - Expanded */}
      <div className="flex-1 min-w-0">
        {selectedDay ? (
          <div className="glass-card rounded-xl overflow-hidden sticky top-8">
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-gradient-to-r from-orange-500/5 to-transparent">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-bold text-white">
                      {getFullDayOfWeek(selectedDay.date)}, February {selectedDay.date}
                    </h2>
                    {selectedDay.isToday && (
                      <span className="text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-300 font-medium">
                        Today
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/50">
                    {selectedDay.isFuture 
                      ? `${selectedDay.cronEvents.length} jobs scheduled`
                      : `${selectedDay.taskEvents.length} tasks completed • ${selectedDay.cronEvents.length} cron runs`
                    }
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedDay(null)}
                  className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Day Stats Bar */}
              {!selectedDay.isFuture && (
                <div className="flex items-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-orange-500/10">
                      <Clock className="h-4 w-4 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{selectedDay.cronRuns}</p>
                      <p className="text-[10px] text-white/40">cron runs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-green-500/10">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{selectedDay.tasksCompleted}</p>
                      <p className="text-[10px] text-white/40">tasks done</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10">
                      <DollarSign className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">${selectedDay.cost.toFixed(2)}</p>
                      <p className="text-[10px] text-white/40">spent</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-yellow-500/10">
                      <Zap className="h-4 w-4 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{selectedDay.hours}h</p>
                      <p className="text-[10px] text-white/40">active</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6 max-h-[calc(100vh-280px)] overflow-y-auto">
              {!selectedDay.isFuture ? (
                <>
                  {/* Tasks Completed Section */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                      <h3 className="text-lg font-semibold text-white">Tasks Completed</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300">
                        {selectedDay.taskEvents.length}
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      {selectedDay.taskEvents.map((task) => (
                        <div 
                          key={task.id}
                          className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-white group-hover:text-orange-300 transition-colors">
                                  {task.title}
                                </h4>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  task.source === "cron" 
                                    ? "bg-orange-500/20 text-orange-300" 
                                    : task.source === "chat"
                                      ? "bg-blue-500/20 text-blue-300"
                                      : "bg-white/10 text-white/50"
                                }`}>
                                  {task.source}
                                </span>
                              </div>
                              <p className="text-sm text-white/50 leading-relaxed">
                                {task.description}
                              </p>
                            </div>
                            <button className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/5 text-white/40 hover:text-white transition-all">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Task Meta */}
                          <div className="flex items-center gap-4 mb-3">
                            <div className="flex items-center gap-1.5 text-white/40">
                              <Clock className="h-3 w-3" />
                              <span className="text-xs">{task.time}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-white/40">
                              <Play className="h-3 w-3" />
                              <span className="text-xs">{task.duration}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="h-3 w-3 text-orange-400" />
                              <span className="text-xs text-white/60">{task.model}</span>
                            </div>
                          </div>

                          {/* Task Stats */}
                          <div className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02]">
                            <div className="flex-1">
                              <p className="text-[10px] text-white/30 mb-0.5">Cost</p>
                              <p className="text-sm font-medium text-white">${task.cost.toFixed(2)}</p>
                            </div>
                            <div className="w-px h-8 bg-white/5" />
                            <div className="flex-1">
                              <p className="text-[10px] text-white/30 mb-0.5">Tokens In</p>
                              <p className="text-sm font-medium text-white">{(task.tokensIn / 1000).toFixed(1)}K</p>
                            </div>
                            <div className="w-px h-8 bg-white/5" />
                            <div className="flex-1">
                              <p className="text-[10px] text-white/30 mb-0.5">Tokens Out</p>
                              <p className="text-sm font-medium text-white">{(task.tokensOut / 1000).toFixed(1)}K</p>
                            </div>
                            <div className="w-px h-8 bg-white/5" />
                            <div className="flex-1">
                              <p className="text-[10px] text-white/30 mb-0.5">Status</p>
                              <div className="flex items-center gap-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                                <span className="text-xs text-green-400">Complete</span>
                              </div>
                            </div>
                          </div>

                          {/* Tags */}
                          <div className="flex items-center gap-2 mt-3">
                            {task.tags.map((tag) => (
                              <span 
                                key={tag}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cron Runs Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="h-5 w-5 text-orange-400" />
                      <h3 className="text-lg font-semibold text-white">Cron Runs</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300">
                        {selectedDay.cronEvents.length}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {selectedDay.cronEvents.map((event, i) => (
                        <div 
                          key={i}
                          className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
                        >
                          <div className={`h-2 w-2 rounded-full ${
                            event.status === "success" ? "bg-green-400" :
                            event.status === "failed" ? "bg-red-400" :
                            "bg-white/30"
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white">{event.name}</p>
                          </div>
                          <span className="text-xs text-white/40">{event.time}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-white/50">
                            {event.model}
                          </span>
                          <span className="text-xs text-white/40 w-16 text-right">{event.duration}</span>
                          <span className="text-xs text-white/60 w-12 text-right">${event.cost.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Day Summary */}
                  <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/5 border border-orange-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-4 w-4 text-orange-400" />
                      <h4 className="text-sm font-semibold text-white">Day Summary</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-[10px] text-white/40 mb-1">Success Rate</p>
                        <p className="text-lg font-bold text-green-400">100%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40 mb-1">Avg Cost/Task</p>
                        <p className="text-lg font-bold text-white">
                          ${(selectedDay.cost / Math.max(selectedDay.taskEvents.length, 1)).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40 mb-1">Total Tokens</p>
                        <p className="text-lg font-bold text-white">
                          {(selectedDay.taskEvents.reduce((sum, t) => sum + t.tokensIn + t.tokensOut, 0) / 1000).toFixed(1)}K
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Future Day - Scheduled Events */
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="h-5 w-5 text-white/40" />
                    <h3 className="text-lg font-semibold text-white">Scheduled Jobs</h3>
                  </div>
                  
                  <div className="space-y-2">
                    {selectedDay.cronEvents.map((event, i) => (
                      <div 
                        key={i}
                        className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/5"
                      >
                        <div className="h-2 w-2 rounded-full bg-white/30" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white/70">{event.name}</p>
                        </div>
                        <span className="text-xs text-white/40">{event.time}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                          {event.model}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                    <Calendar className="h-8 w-8 text-white/20 mx-auto mb-2" />
                    <p className="text-sm text-white/40">
                      This day hasn&apos;t happened yet
                    </p>
                    <p className="text-xs text-white/30 mt-1">
                      Check back after February {selectedDay.date} for activity details
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-xl p-12 flex flex-col items-center justify-center h-64 sticky top-8">
            <Calendar className="h-16 w-16 text-white/10 mb-4" />
            <p className="text-lg text-white/40 text-center">Select a day to view details</p>
            <p className="text-sm text-white/20 mt-1">Click any day on the calendar</p>
          </div>
        )}
      </div>
    </div>
  );
}
