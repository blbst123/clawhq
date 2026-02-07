"use client";

import { useState } from "react";
import { 
  Clock, 
  Zap, 
  DollarSign,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  MoreHorizontal,
  Play,
  ChevronRight,
  ChevronDown,
  Send,
  Calendar,
  Plus,
  ArrowRight,
  Timer
} from "lucide-react";

// Backlog items
const backlogItems = [
  {
    id: "1",
    title: "Agent Blueprints - Next Steps",
    description: "Figure out direction for the project",
    status: "needs-discussion",
    messages: 12,
    project: "Side Projects",
    projectColor: "blue"
  },
  {
    id: "2",
    title: "Research Hyperliquid competitors",
    description: "Analyze competing platforms and features",
    status: "ready",
    messages: 0,
    project: "Lit.trade",
    projectColor: "purple"
  },
  {
    id: "3",
    title: "Write blog post about AI agents",
    description: "Content piece for the website",
    status: "needs-discussion",
    messages: 3,
    project: "Content",
    projectColor: "red"
  },
  {
    id: "4",
    title: "Build pricing page for Chartr",
    description: "Design and implement pricing tiers",
    status: "ready",
    messages: 0,
    project: "Chartr",
    projectColor: "green"
  },
];

// Active tasks
const activeTasks = [
  {
    id: "t1",
    title: "Content Research",
    description: "AI job displacement research",
    status: "running",
    progress: 65,
    startedAt: "3:58am"
  },
  {
    id: "t2",
    title: "Lit Revenue Check",
    description: "Daily automated check",
    status: "scheduled",
    scheduledFor: "2:00pm"
  },
];

// Recent activity
const recentActivity = [
  { id: "a1", action: "Morning Brief sent", task: "Morning Brief", time: "8:32am", type: "complete" },
  { id: "a2", action: "Generated summary", task: "Morning Brief", time: "8:31am", type: "action" },
  { id: "a3", action: "Fetched calendar events", task: "Morning Brief", time: "8:30am", type: "action" },
  { id: "a4", action: "Lit Analysis complete", task: "Lit Analysis", time: "7:45am", type: "complete" },
  { id: "a5", action: "Queried Hyperliquid API", task: "Lit Analysis", time: "7:44am", type: "action" },
  { id: "a6", action: "Task started", task: "Lit Analysis", time: "7:44am", type: "start" },
];

// Chat messages (mock)
const chatContexts: Record<string, Array<{role: string, content: string, time: string}>> = {
  "general": [
    { role: "user", content: "Give me a quick summary of what you did today", time: "8:35am" },
    { role: "assistant", content: "Good morning! Here's your summary:\n\n✅ Morning Brief - Sent at 8:32am\n✅ Lit Analysis - Revenue up 12%\n🔄 Content Research - 65% complete\n\nTotal spend so far: $2.45", time: "8:35am" },
  ],
  "1": [
    { role: "user", content: "What should we do with Agent Blueprints?", time: "Yesterday" },
    { role: "assistant", content: "I see a few directions we could take:\n\n1. Focus on templates - pre-built agent configs\n2. Build community - let users share setups\n3. Educational content - tutorials and guides\n\nWhat resonates with you?", time: "Yesterday" },
    { role: "user", content: "I like the templates idea but not sure how to package it", time: "Yesterday" },
    { role: "assistant", content: "We could create 'starter kits' - each one includes:\n- AGENTS.md template\n- SOUL.md with personality\n- Recommended skills\n- Sample cron jobs\n\nWant me to draft one as a prototype?", time: "Yesterday" },
  ],
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "needs-discussion": return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    case "ready": return "bg-green-500/20 text-green-300 border-green-500/30";
    default: return "bg-white/10 text-white/50 border-white/10";
  }
};

const getProjectColor = (color: string) => {
  switch (color) {
    case "purple": return "bg-purple-400";
    case "red": return "bg-red-400";
    case "orange": return "bg-orange-400";
    case "blue": return "bg-blue-400";
    case "green": return "bg-green-400";
    default: return "bg-white/40";
  }
};

export default function Dashboard() {
  const [chatContext, setChatContext] = useState<string>("general");
  const [inputValue, setInputValue] = useState("");
  
  const currentMessages = chatContexts[chatContext] || chatContexts["general"];
  const contextItem = backlogItems.find(item => item.id === chatContext);

  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <div className="flex-shrink-0 border-b border-white/5 bg-white/[0.01] px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-orange-500/10">
              <Sparkles className="h-5 w-5 text-orange-400" />
            </div>
            <span className="text-lg font-bold text-white">ClawHQ</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-white font-medium">12</span>
              <span className="text-white/50">tasks</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10">
              <Clock className="h-4 w-4 text-orange-400" />
              <span className="text-white font-medium">8</span>
              <span className="text-white/50">cron</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10">
              <DollarSign className="h-4 w-4 text-amber-400" />
              <span className="text-white font-medium">$2.45</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10">
              <Zap className="h-4 w-4 text-yellow-400" />
              <span className="text-white font-medium">4.2h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Column - Backlog */}
        <div className="w-72 border-r border-white/5 flex flex-col">
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2">
                📝 Backlog
                <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/50">
                  {backlogItems.length}
                </span>
              </h2>
              <button className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-white">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-white/40 mt-1">Ideas & planning</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {backlogItems.map((item) => (
              <div 
                key={item.id}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all group"
              >
                <div className="flex items-start gap-2 mb-2">
                  <div className={`h-2 w-2 rounded-full mt-1.5 ${getProjectColor(item.projectColor)}`} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-white truncate">{item.title}</h3>
                    <p className="text-xs text-white/40 truncate">{item.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusColor(item.status)}`}>
                    {item.status === "needs-discussion" ? "Discuss" : "Ready"}
                  </span>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setChatContext(item.id)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"
                      title="Discuss"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-green-400 transition-all"
                      title="Run now"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-orange-400 transition-all"
                      title="Schedule"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                
                {item.messages > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-white/30">
                    <MessageSquare className="h-3 w-3" />
                    <span className="text-[10px]">{item.messages} messages</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="p-3 border-t border-white/5">
            <button className="w-full p-2.5 rounded-xl border border-dashed border-white/10 text-white/30 hover:text-white/50 hover:border-white/20 hover:bg-white/[0.02] transition-all text-sm flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" />
              Add idea
            </button>
          </div>
        </div>

        {/* Middle Column - Task Tracker + Activity */}
        <div className="w-80 border-r border-white/5 flex flex-col">
          {/* Task Tracker */}
          <div className="p-4 border-b border-white/5">
            <h2 className="font-semibold text-white flex items-center gap-2">
              🤖 Task Tracker
              <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/50">
                {activeTasks.length}
              </span>
            </h2>
            <p className="text-xs text-white/40 mt-1">Active & scheduled</p>
          </div>
          
          <div className="p-3 space-y-2">
            {activeTasks.map((task) => (
              <div 
                key={task.id}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/5"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-white">{task.title}</h3>
                  {task.status === "running" ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                      Running
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      {task.scheduledFor}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/40 mb-2">{task.description}</p>
                {task.progress && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-white/10">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-white/40">{task.progress}%</span>
                  </div>
                )}
              </div>
            ))}
            
            {activeTasks.length === 0 && (
              <div className="text-center py-8 text-white/30 text-sm">
                No active tasks
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="flex-1 flex flex-col min-h-0 border-t border-white/5">
            <div className="p-4 border-b border-white/5">
              <h2 className="font-semibold text-white flex items-center gap-2">
                ⚡ Recent Activity
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {recentActivity.map((activity) => (
                <div 
                  key={activity.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/[0.02] transition-all"
                >
                  <div className={`mt-1 h-1.5 w-1.5 rounded-full ${
                    activity.type === "complete" ? "bg-green-400" :
                    activity.type === "start" ? "bg-blue-400" : "bg-white/30"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/70">{activity.action}</p>
                    <p className="text-[10px] text-white/30">{activity.task}</p>
                  </div>
                  <span className="text-[10px] text-white/30">{activity.time}</span>
                </div>
              ))}
            </div>
            
            <div className="p-3 border-t border-white/5">
              <button className="w-full text-xs text-orange-400 hover:text-orange-300 flex items-center justify-center gap-1">
                View all activity <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Header */}
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-orange-400" />
                <h2 className="font-semibold text-white">Chat</h2>
              </div>
              <button 
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                onClick={() => setChatContext("general")}
              >
                <span className="text-sm text-white/70">
                  {contextItem ? `📎 ${contextItem.title.slice(0, 20)}...` : "General"}
                </span>
                <ChevronDown className="h-4 w-4 text-white/40" />
              </button>
            </div>
            {contextItem && (
              <p className="text-xs text-white/40 mt-1">
                Discussing: {contextItem.title}
              </p>
            )}
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {currentMessages.map((message, i) => (
              <div 
                key={i}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[80%] ${
                  message.role === "user" 
                    ? "bg-orange-500/20 rounded-2xl rounded-tr-sm" 
                    : "bg-white/[0.03] rounded-2xl rounded-tl-sm"
                } px-4 py-3`}>
                  <p className="text-sm text-white/90 whitespace-pre-wrap">{message.content}</p>
                  <p className="text-[10px] text-white/30 mt-1">{message.time}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input 
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={contextItem ? `Ask about ${contextItem.title}...` : "Ask Lolo anything..."}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                />
              </div>
              <button className="p-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-all">
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
