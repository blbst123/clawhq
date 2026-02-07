"use client";

import { Send, Paperclip, Smile, MoreHorizontal, MessageSquare } from "lucide-react";

const messages = [
  { id: 1, sender: "bill", message: "Let's go with ClawHQ", time: "3:42pm" },
  { id: 2, sender: "lolo", message: "ClawHQ it is! 🦞 Setting up the project now. I'll scaffold it with Next.js 14, Tailwind, and shadcn/ui.", time: "3:42pm" },
  { id: 3, sender: "bill", message: "Are you able to deploy this to vercel like you did with agent blueprints", time: "4:05pm" },
  { id: 4, sender: "lolo", message: "Yes! Just deployed it. Live at https://clawhq.vercel.app 🎉\n\nAll pages are working:\n• Dashboard with stats\n• Tasks kanban board\n• Costs breakdown\n• Cron jobs list\n• Settings", time: "4:15pm" },
  { id: 5, sender: "bill", message: "Can you make the activity page look sleeker? Less padding, more compact", time: "6:20pm" },
  { id: 6, sender: "lolo", message: "Done! Redesigned with:\n• Compact header with inline stat chips\n• Expandable rows instead of big cards\n• Source badges with colored borders\n• Tighter spacing throughout\n\nAlready deployed to prod 🚀", time: "6:51pm" },
  { id: 7, sender: "bill", message: "🔥 love it", time: "6:52pm" },
  { id: 8, sender: "lolo", message: "Thanks! Want me to apply the same style to the other pages too?", time: "6:52pm" },
];

export default function ChatPage() {
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/5 bg-white/[0.01] px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-sm">
                🦞
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-[#1f1712]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Lolo</h2>
              <p className="text-[10px] text-green-400">Online • Main Session</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-white/[0.03] text-white/30">
              <MessageSquare className="h-2.5 w-2.5" /> {messages.length} messages
            </span>
            <button className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.sender === "bill" ? "flex-row-reverse" : ""}`}>
            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
              msg.sender === "bill"
                ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white"
                : "bg-gradient-to-br from-orange-500 to-amber-600 text-white"
            }`}>
              {msg.sender === "bill" ? "B" : "🦞"}
            </div>
            <div className={`max-w-[70%] ${msg.sender === "bill" ? "items-end" : ""}`}>
              <div className={`rounded-2xl px-3.5 py-2.5 ${
                msg.sender === "bill"
                  ? "bg-orange-500/20 text-white rounded-tr-sm"
                  : "bg-white/[0.04] border border-white/5 rounded-tl-sm"
              }`}>
                <p className="text-[13px] whitespace-pre-wrap text-white/85 leading-relaxed">{msg.message}</p>
              </div>
              <p className={`text-[10px] text-white/20 mt-0.5 ${msg.sender === "bill" ? "text-right" : ""}`}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-6 py-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors">
            <Paperclip className="h-4 w-4" />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Message Lolo..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors">
              <Smile className="h-4 w-4" />
            </button>
          </div>
          <button className="p-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-all">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
