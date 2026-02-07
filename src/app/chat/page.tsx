import { Send, Paperclip, Smile, MoreHorizontal } from "lucide-react";

export default function ChatPage() {
  const messages = [
    {
      id: 1,
      sender: "bill",
      message: "Let's go with ClawHQ",
      time: "3:42pm",
    },
    {
      id: 2,
      sender: "lolo",
      message: "ClawHQ it is! 🦞 Setting up the project now. I'll scaffold it with Next.js 14, Tailwind, and shadcn/ui.",
      time: "3:42pm",
    },
    {
      id: 3,
      sender: "bill", 
      message: "Are you able to deploy this to vercel like you did with agent blueprints",
      time: "4:05pm",
    },
    {
      id: 4,
      sender: "lolo",
      message: "Yes! Just deployed it. Live at https://clawhq.vercel.app 🎉\n\nAll pages are working:\n• Dashboard with stats\n• Tasks kanban board\n• Costs breakdown\n• Cron jobs list\n• Settings",
      time: "4:15pm",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-medium">
                L
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-[#1f1712]" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Lolo</h2>
              <p className="text-xs text-green-400">Online • Main Session</p>
            </div>
          </div>
          <button className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.sender === 'bill' ? 'flex-row-reverse' : ''}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
              msg.sender === 'bill' 
                ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white'
                : 'bg-gradient-to-br from-orange-500 to-amber-600 text-white'
            }`}>
              {msg.sender === 'bill' ? 'B' : '🦞'}
            </div>
            <div className={`max-w-[70%] ${msg.sender === 'bill' ? 'items-end' : ''}`}>
              <div className={`rounded-2xl px-4 py-3 ${
                msg.sender === 'bill'
                  ? 'bg-orange-500/20 text-white rounded-tr-sm'
                  : 'glass-card rounded-tl-sm'
              }`}>
                <p className="text-sm whitespace-pre-wrap text-white/90">{msg.message}</p>
              </div>
              <p className={`text-xs text-white/30 mt-1 ${msg.sender === 'bill' ? 'text-right' : ''}`}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
            <Paperclip className="h-5 w-5" />
          </button>
          <div className="flex-1 relative">
            <input 
              type="text"
              placeholder="Message Lolo..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
              <Smile className="h-5 w-5" />
            </button>
          </div>
          <button className="p-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-all glow-orange">
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
