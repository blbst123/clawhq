"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ParsedMessage, type ParsedAttachment, type MessageGroup, groupMessages } from "@/lib/chat-parser";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { ToolCardView, ToolSummaryCard, LiveToolCard } from "@/components/ui/tool-cards";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";
import { ChatInput, type Attachment } from "@/components/ui/chat-input";
import { TaskHeader } from "@/components/ui/task-header";
import { useChatSession, draftCache, scrollCache } from "@/lib/use-chat-session";

// ─── Types ───

export interface TaskInfo {
  id: string;
  summary: string;
  sessionKey: string;
  note?: string;
  project?: string;
  priority?: string;
  status: string;
  at: string;
}

interface TaskChatProps {
  task: TaskInfo;
  allProjects?: string[];
  onBack: () => void;
  onStatusChange?: (status: string) => void;
  onPriorityChange?: (priority: string | undefined) => void;
  onProjectChange?: (project: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  initialMessage?: string;
  onInitialMessageSent?: () => void;
}

// ─── Image Lightbox ───

function ImageLightbox({ srcs, index, onClose, onNav }: { srcs: string[]; index: number; onClose: () => void; onNav: (i: number) => void }) {
  const multi = srcs.length > 1;
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (multi && e.key === "ArrowLeft") onNav((index - 1 + srcs.length) % srcs.length);
      if (multi && e.key === "ArrowRight") onNav((index + 1) % srcs.length);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onNav, index, srcs.length, multi]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer" onClick={onClose}>
      {multi && (
        <button
          onClick={e => { e.stopPropagation(); onNav((index - 1 + srcs.length) % srcs.length); }}
          className="absolute left-4 z-10 p-2 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-all"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
      )}
      <img
        src={srcs[index]}
        alt={`Image ${index + 1} of ${srcs.length}`}
        className="max-w-[85vw] max-h-[85vh] object-contain rounded-lg shadow-2xl cursor-default"
        onClick={e => e.stopPropagation()}
      />
      {multi && (
        <button
          onClick={e => { e.stopPropagation(); onNav((index + 1) % srcs.length); }}
          className="absolute right-4 z-10 p-2 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-all"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      )}
      {multi && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-[12px] text-white/60">
          {index + 1} / {srcs.length}
        </div>
      )}
    </div>
  );
}

function AttachmentGrid({ attachments }: { attachments: ParsedAttachment[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  if (attachments.length === 0) return null;

  const count = attachments.length;
  const gridClass = count === 1 ? "grid grid-cols-1" : "grid grid-cols-2 gap-0.5";

  return (
    <>
      {lightboxIndex !== null && (() => {
        const srcs = attachments.map(a => a.url || (a.data ? `data:${a.mimeType || "image/png"};base64,${a.data}` : "")).filter(Boolean);
        return <ImageLightbox srcs={srcs} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNav={setLightboxIndex} />;
      })()}
      <div className={cn(gridClass, "overflow-hidden rounded-xl max-w-[280px]")}>
        {attachments.map((att, i) => {
          const src = att.url || (att.data ? `data:${att.mimeType || "image/png"};base64,${att.data}` : null);
          if (!src) return null;
          const spanFull = count === 3 && i === 0;
          return (
            <button key={i} onClick={() => setLightboxIndex(i)}
              className={cn("block overflow-hidden bg-black/20", spanFull && "col-span-2")}>
              <img src={src} alt={`attachment ${i + 1}`}
                className={cn("w-full object-cover hover:opacity-80 transition-opacity cursor-pointer", count === 1 ? "max-h-[240px]" : "h-[120px]")} />
            </button>
          );
        })}
      </div>
    </>
  );
}

// ─── Message Bubble ───

function MessageBubble({ msg, showTools = true }: { msg: ParsedMessage; showTools?: boolean }) {
  const hasText = !!msg.text.trim();
  const hasTools = msg.toolCards.length > 0;
  const hasAttachments = (msg.attachments?.length ?? 0) > 0;

  if (!hasText && hasTools && msg.role === "tool") {
    if (!showTools) return null;
    return <div className="space-y-1.5">{msg.toolCards.map((tc, j) => <ToolCardView key={j} entry={tc} />)}</div>;
  }
  if (!hasText && !hasTools && !hasAttachments) return null;
  if (!hasText && hasTools && !showTools && !hasAttachments) return null;
  if (hasAttachments && !hasText && !hasTools) return <AttachmentGrid attachments={msg.attachments!} />;

  return (
    <div className="space-y-1.5">
      {hasAttachments && <AttachmentGrid attachments={msg.attachments!} />}
      <div className={cn("chat-bubble rounded-2xl px-4 py-2.5",
        msg.role === "user" ? "bg-orange-500/20 text-white/90 border border-orange-500/30" : "bg-white/[0.04] border border-white/[0.06]")}>
        {hasText && (msg.role === "assistant"
          ? <MarkdownContent text={msg.text} className="text-white/75" />
          : <div className="text-[14px] leading-relaxed whitespace-pre-wrap break-words text-white/90">{msg.text}</div>
        )}
        {hasTools && showTools && (
          <div className={cn("space-y-1.5", hasText && "mt-2")}>{msg.toolCards.map((tc, j) => <ToolCardView key={j} entry={tc} />)}</div>
        )}
      </div>
    </div>
  );
}

// ─── System Message ───

function SystemMessage({ msg }: { msg: ParsedMessage }) {
  const [expanded, setExpanded] = useState(false);
  const hasBody = !!(msg.body && msg.body.trim());
  const isNoise = /^Exec completed|^Build |^Process /i.test(msg.text);

  if (isNoise && !hasBody) {
    return (
      <div className="flex justify-center py-0.5">
        <span className="text-[10px] text-white/10 text-center max-w-[80%] truncate">{msg.text}</span>
      </div>
    );
  }

  return (
    <div className="ml-10 mr-0 my-1.5">
      <button
        onClick={() => hasBody && setExpanded(!expanded)}
        className={cn("w-full text-left rounded-lg border transition-colors",
          expanded ? "bg-white/[0.04] border-white/[0.08]" : "bg-white/[0.02] border-white/[0.05] hover:border-white/[0.08] hover:bg-white/[0.03]",
          !hasBody && "cursor-default")}>
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-400/50 shrink-0" />
          <span className="text-[12px] text-white/40 truncate flex-1">{msg.text}</span>
          {hasBody && <span className="text-[10px] text-white/20 shrink-0">{expanded ? "▼" : "▶"}</span>}
          <span className="text-[10px] text-white/15 shrink-0">{new Date(msg.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </button>
      {expanded && hasBody && (
        <div className="mt-0.5 rounded-lg bg-white/[0.02] border border-white/[0.05] px-4 py-3 max-h-[70vh] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.15) transparent" }}>
          <MarkdownContent text={msg.body!} className="text-white/60 text-[13px]" />
        </div>
      )}
    </div>
  );
}

// ─── Chat Group (exported for reuse in MainChat) ───

export function ChatGroup({ group, showTools = true }: { group: MessageGroup; showTools?: boolean }) {
  if (group.role === "system") {
    return <>{group.messages.map((m, i) => <SystemMessage key={i} msg={m} />)}</>;
  }

  if (!showTools && group.role === "tool") return null;
  if (!showTools && group.role === "assistant") {
    const hasAnyText = group.messages.some(m => m.text.trim());
    if (!hasAnyText) return null;
  }

  const roleName = group.role === "user" ? "You" : group.role === "assistant" ? "Assistant" : "tool";
  const avatarLetter = group.role === "user" ? "U" : group.role === "assistant" ? "A" : "⚙";
  const avatarColor = group.role === "user" ? "bg-orange-500/20 text-orange-300" : group.role === "tool" ? "bg-white/[0.06] text-white/30" : "bg-white/[0.06] text-white/40";
  const time = new Date(group.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const allToolCards = useMemo(() => group.messages.flatMap(m => m.toolCards), [group.messages]);

  if (group.role === "tool" && showTools) {
    return (
      <div className="flex gap-3">
        <div className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-auto", avatarColor)}>
          <span className="text-[11px] font-medium">{avatarLetter}</span>
        </div>
        <div className="min-w-0 max-w-[85%] space-y-1.5">
          {allToolCards.length > 2 ? <ToolSummaryCard tools={allToolCards} /> : allToolCards.map((tc, j) => <ToolCardView key={j} entry={tc} />)}
          <div className="flex items-center gap-2"><span className="text-[11px] text-white/15">{time}</span></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-3", group.role === "user" && "flex-row-reverse")}>
      <div className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-auto", avatarColor)}>
        <span className="text-[11px] font-medium">{avatarLetter}</span>
      </div>
      <div className={cn("min-w-0 space-y-1.5", group.role === "user" ? "items-end flex flex-col max-w-[80%]" : "max-w-[85%]")}>
        {group.role === "assistant" ? (
          <>
            {group.messages.map((msg, i) => {
              if (!msg.text.trim()) return null;
              return (
                <div key={i} className="rounded-2xl px-4 py-2.5 bg-white/[0.04] border border-white/[0.06]">
                  <MarkdownContent text={msg.text} className="text-white/75" />
                </div>
              );
            })}
            {showTools && allToolCards.length > 0 && (
              allToolCards.length > 2 ? <ToolSummaryCard tools={allToolCards} /> : (
                <div className="space-y-1.5">{allToolCards.map((tc, j) => <ToolCardView key={j} entry={tc} />)}</div>
              )
            )}
          </>
        ) : (
          group.messages.map((msg, i) => <MessageBubble key={i} msg={msg} showTools={showTools} />)
        )}
        <div className={cn("flex items-center gap-2", group.role === "user" && "flex-row-reverse")}>
          <span className="text-[11px] text-white/25">{roleName}</span>
          <span className="text-[11px] text-white/15">{time}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main TaskChat Component ───

export function TaskChat({ task, allProjects, onBack, onStatusChange, onPriorityChange, onProjectChange, onEdit, onDelete, initialMessage, onInitialMessageSent }: TaskChatProps) {
  const { id: taskId, summary: taskSummary, sessionKey } = task;

  const chat = useChatSession({
    sessionKey,
    cacheKey: taskId,
    skipInitialLoad: !!initialMessage,
  });

  const { messages, setMessages, sending, setSending, streamContent, liveTools, loadHistory, sendMessage: rawSend, handleStop, activeRunId } = chat;

  // ─── UI state ───
  const [input, setInput] = useState(() => draftCache.get(taskId) || "");
  const [showTools, setShowTools] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const initialScrollRestored = useRef(false);
  const prevMessageCount = useRef(0);

  // ─── Auto-send initial message ───
  const initialSent = useRef<string | null>(null);
  useEffect(() => {
    if (!initialMessage) return;
    const sentKey = `${taskId}:${initialMessage}`;
    if (initialSent.current === sentKey) return;
    initialSent.current = sentKey;

    setMessages(prev => [...prev, { role: "user", text: initialMessage, toolCards: [], at: new Date().toISOString() }]);
    onInitialMessageSent?.();
    rawSend(initialMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage]);

  // ─── Auto-scroll ───
  useEffect(() => {
    const isNewContent = messages.length > prevMessageCount.current || streamContent || liveTools.length > 0;
    prevMessageCount.current = messages.length;
    if (isNewContent && initialScrollRestored.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamContent, liveTools]);

  // ─── Restore scroll position ───
  useEffect(() => {
    if (messages.length > 0 && !initialScrollRestored.current) {
      initialScrollRestored.current = true;
      const saved = scrollCache.get(taskId);
      if (saved !== undefined && messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = saved;
      } else {
        messagesEndRef.current?.scrollIntoView();
      }
    }
  }, [messages, taskId]);

  useEffect(() => {
    return () => { if (messagesContainerRef.current) scrollCache.set(taskId, messagesContainerRef.current.scrollTop); };
  }, [taskId]);

  // ─── Draft persistence ───
  useEffect(() => {
    if (input) draftCache.set(taskId, input);
    else draftCache.delete(taskId);
  }, [input, taskId]);

  // ─── Send ───
  async function handleSend(text: string, attachments?: Attachment[]) {
    if ((!text && !attachments?.length) || sending) return;
    const optimisticAttachments: ParsedAttachment[] | undefined = attachments?.length
      ? attachments.map(a => ({ type: "image" as const, mimeType: a.mimeType, data: a.dataUrl.replace(/^data:[^;]+;base64,/, "") }))
      : undefined;
    setMessages(prev => [...prev, { role: "user", text, toolCards: [], at: new Date().toISOString(), attachments: optimisticAttachments }]);
    setInput("");
    draftCache.delete(taskId);
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

      <TaskHeader
        task={task}
        allProjects={allProjects}
        showTools={showTools}
        onShowToolsChange={setShowTools}
        onBack={onBack}
        onStatusChange={onStatusChange}
        onPriorityChange={onPriorityChange}
        onProjectChange={onProjectChange}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {groups.length === 0 && !streamContent && !sending && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[14px] text-white/40 mb-2">Start the conversation</p>
            <p className="text-[12px] text-white/20 max-w-sm">Discuss this task with the agent. It can research, plan, code, or execute.</p>
          </div>
        )}

        {groups.map((group, i) => <ChatGroup key={i} group={group} showTools={showTools} />)}

        {showTools && liveTools.length > 0 && (
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
                  <span className="text-[13px]">{liveTools.length > 0 ? "Working…" : messages.length <= 1 ? "Setting up task session…" : "Thinking…"}</span>
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
        onSend={handleSend}
        onStop={handleStop}
        sending={sending}
        placeholder="Message the agent about this task…"
        handleRef={chatInputHandle}
        onDragOverChange={setFileDragOver}
      />
    </div>
  );
}
