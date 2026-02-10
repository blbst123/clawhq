"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Zap,
  X,
} from "lucide-react";

interface DayData {
  date: number;
  dayOfWeek: string;
  isToday: boolean;
  isFuture: boolean;
  activityLevel: number; // 0-4
  cronRuns: number;
  tasksCompleted: number;
  cost: number;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildMonth(year: number, month: number): DayData[] {
  const today = new Date();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: DayData[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const isToday = date.toDateString() === today.toDateString();
    const isFuture = date > today;
    days.push({
      date: d,
      dayOfWeek: WEEKDAYS[date.getDay()],
      isToday,
      isFuture,
      activityLevel: 0,
      cronRuns: 0,
      tasksCompleted: 0,
      cost: 0,
    });
  }
  return days;
}

const ACTIVITY_COLORS = [
  "bg-white/[0.03]",
  "bg-green-500/20",
  "bg-green-500/35",
  "bg-green-500/50",
  "bg-green-500/70",
];

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const days = useMemo(() => buildMonth(year, month), [year, month]);
  const firstDayOffset = new Date(year, month, 1).getDay();
  const monthLabel = new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  }

  const selected = selectedDay ? days.find(d => d.date === selectedDay) : null;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/5 bg-white/[0.01] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Calendar className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Calendar</h1>
              <p className="text-sm text-white/40">Agent activity timeline</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Calendar Grid */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold text-white/80">{monthLabel}</h2>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[11px] text-white/25 font-medium py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`pad-${i}`} className="aspect-square" />
            ))}
            {days.map(day => (
              <button
                key={day.date}
                onClick={() => setSelectedDay(day.date)}
                className={`aspect-square rounded-lg border transition-all flex flex-col items-center justify-center gap-1 ${
                  selectedDay === day.date
                    ? "border-blue-500/30 bg-blue-500/10"
                    : day.isToday
                    ? "border-orange-500/30 bg-orange-500/5"
                    : "border-white/[0.04] hover:border-white/10 hover:bg-white/[0.02]"
                }`}
              >
                <span className={`text-[13px] font-medium ${day.isToday ? "text-orange-400" : day.isFuture ? "text-white/20" : "text-white/50"}`}>
                  {day.date}
                </span>
                <div className={`w-2.5 h-2.5 rounded-sm ${ACTIVITY_COLORS[day.activityLevel]}`} />
              </button>
            ))}
          </div>

          {/* Coming soon notice */}
          <div className="mt-8 text-center py-8">
            <Clock className="h-8 w-8 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/30">Calendar data coming soon</p>
            <p className="text-xs text-white/15 mt-1">Activity heatmap, cron runs, and daily summaries</p>
          </div>
        </div>

        {/* Day Detail Panel */}
        {selected && (
          <div className="w-96 border-l border-white/5 p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-white/80">
                {new Date(year, month, selected.date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </h3>
              <button onClick={() => setSelectedDay(null)} className="p-1 rounded hover:bg-white/5 text-white/30">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="h-3 w-3 text-blue-400/60" />
                  <span className="text-[11px] text-white/30">Cron Runs</span>
                </div>
                <span className="text-lg font-semibold text-white/60">{selected.cronRuns}</span>
              </div>
              <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="h-3 w-3 text-green-400/60" />
                  <span className="text-[11px] text-white/30">Tasks</span>
                </div>
                <span className="text-lg font-semibold text-white/60">{selected.tasksCompleted}</span>
              </div>
            </div>

            <div className="text-center py-8">
              <p className="text-xs text-white/20">Day details will appear here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
