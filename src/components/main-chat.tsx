"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Upload } from "lucide-react";
import { useGateway } from "@/lib/gateway-context";
import { useAgentIdentity } from "@/lib/use-agent-identity";
import { type ParsedMessage, type ParsedAttachment, groupMessages } from "@/lib/chat-parser";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { LiveToolCard } from "@/components/ui/tool-cards";
import { ChatGroup } from "@/components/task-chat";
import { ChatInput, type Attachment } from "@/components/ui/chat-input";
import { useChatSession } from "@/lib/use-chat-session";

const MAIN_SESSION_KEY = "main";

export function MainChat() {
  const { name: agentName, emoji: agentEmoji } = useAgentIdentity();

  const chat = useChatSession({
    sessionKey: MAIN_SESSION_KEY,
    cacheKey: MAIN_SESSION_KEY,
    historyLimit: 500,
    backgroundPollMs: 10000,
  });

  const { messages, setMessages, sending, streamContent, liveTools, sendMessage: rawSend, handleStop } = chat;

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(0);

  // ─── Auto-scroll ───
  useEffect(() => {
    const isNew = messages.length > prevMessageCount.current || streamContent || liveTools.length > 0;
    prevMessageCount.current = messages.length;
    if (isNew) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamContent, liveTools]);

  // ─── Send ───
  async function sendMessage(text: string, attachments?: Attachment[]) {
    if ((!text && !attachments?.length) || sending) return;
    const displayText = text + (attachments?.length ? ` [${attachments.length} file${attachments.length > 1 ? "s" : ""}]` : "");
    setMessages(prev => [...prev, { role: "user", text: displayText, toolCards: [], at: new Date().toISOString() }]);
    setInput("");
    await rawSend(text, attachments);
  }

  const groups = groupMessages(messages);
  const chatInputHandle = useRef<import("@/components/ui/chat-input").ChatInputHandle | null>(null);
  const [fileDragOver, setFileDragOver] = useState(false);

  return (
    <div
      className="flex flex-col h-full relative"
      onDragEnter={e => chatInputHandle.current?.dragProps.onDragEnter(e)}
      onDragOver={e => chatInputHandle.current?.dragProps.onDragOver(e)}
      onDragLeave={e => chatInputHandle.current?.dragProps.onDragLeave(e)}
      onDrop={e => chatInputHandle.current?.dragProps.onDrop(e)}
    >
      {fileDragOver && (
        <div className="absolute inset-0 z-50 bg-[#161210]/90 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none rounded-lg border-2 border-dashed border-orange-500/40">
          <Upload className="h-10 w-10 text-orange-400/70 mb-3" />
          <p className="text-[16px] font-medium text-white/80">Drop to attach</p>
          <p className="text-[13px] text-white/40 mt-1">Files will be attached to your message</p>
        </div>
      )}

      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/5 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-sm">{agentEmoji}</div>
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-[#161210]" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-white/90">Chat</h2>
            <p className="text-[10px] text-green-400">Main Session</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {groups.length === 0 && !streamContent && !sending && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-600/20 flex items-center justify-center text-2xl mb-4">{agentEmoji}</div>
            <p className="text-[15px] text-white/50 mb-1">Hey! What&apos;s up?</p>
            <p className="text-[12px] text-white/20 max-w-sm">Type a message to chat with your agent directly.</p>
          </div>
        )}

        {groups.map((group, i) => <ChatGroup key={i} group={group} />)}

        {liveTools.length > 0 && (
          <div className="ml-10 space-y-1.5 max-w-[85%]">
            {liveTools.map((tool, i) => <LiveToolCard key={i} name={tool.name} detail={tool.detail} />)}
          </div>
        )}

        {sending && streamContent && (
          <div className="flex gap-3">
            <div className="h-7 w-7 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0 mt-auto">
              <span className="text-[11px] text-white/40 font-medium">A</span>
            </div>
            <div className="max-w-[85%]">
              <div className="rounded-2xl px-4 py-2.5 bg-white/[0.04] border border-white/[0.06]">
                <MarkdownContent text={streamContent} className="text-white/75" />
                <span className="inline-block w-1.5 h-4 bg-orange-400 animate-pulse ml-0.5 align-middle" />
              </div>
            </div>
          </div>
        )}

        {sending && !streamContent && (
          <div className="flex gap-3">
            <div className="h-7 w-7 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0 mt-auto">
              <span className="text-[11px] text-white/40 font-medium">A</span>
            </div>
            <div className="w-fit">
              <div className="rounded-2xl px-3.5 py-2 bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-2 text-white/30">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-400/60" />
                  <span className="text-[13px]">{liveTools.length > 0 ? "Working…" : "Thinking…"}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={sendMessage}
        onStop={handleStop}
        sending={sending}
        placeholder={`Message ${agentName}…`}
        sendIcon="send"
        handleRef={chatInputHandle}
        onDragOverChange={setFileDragOver}
      />
    </div>
  );
}
