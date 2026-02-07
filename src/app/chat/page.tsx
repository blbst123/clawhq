import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Chat</h1>
        <p className="text-neutral-400">Direct communication with Lolo</p>
      </div>

      <Card className="bg-neutral-900 border-neutral-800 flex-1 flex flex-col">
        <CardHeader className="border-b border-neutral-800">
          <CardTitle className="text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Main Session
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-4 flex flex-col">
          {/* Messages Area */}
          <div className="flex-1 space-y-4 overflow-auto mb-4">
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm">
                B
              </div>
              <div className="flex-1">
                <p className="text-sm text-neutral-400 mb-1">Bill · 3:42pm</p>
                <div className="bg-neutral-800 rounded-lg p-3">
                  <p className="text-white">Let&apos;s go with ClawHQ</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center text-lg">
                🦞
              </div>
              <div className="flex-1">
                <p className="text-sm text-neutral-400 mb-1">Lolo · 3:42pm</p>
                <div className="bg-neutral-800 rounded-lg p-3">
                  <p className="text-white">ClawHQ it is! 🦞 Setting up the project now...</p>
                </div>
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="flex gap-2">
            <input 
              type="text"
              placeholder="Message Lolo..."
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
            />
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
