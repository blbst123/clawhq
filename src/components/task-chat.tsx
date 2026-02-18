"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ArrowUp, Square, ArrowLeft, Loader2, Check,
  Pencil, CheckCircle2, Inbox, Trash2,
} from "lucide-react";
import { useGateway } from "@/lib/gateway-context";
import { cn } from "@/lib/utils";
import { type ParsedMessage, type MessageGroup, extractText, shortenPath, parseMessages, groupMessages } from "@/lib/chat-parser";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { ToolCardView, ToolSummaryCard, LiveToolCard } from "@/components/ui/tool-cards";
import { PriorityIcon, priLabels, priColors, priOptions, projColor, projLabel } from "@/components/ui/priority-icon";
import { InlineDropdown } from "@/components/ui/inline-dropdown";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";

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

// ─── Notification sound ───

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch { /* audio not available */ }
}

// ─── Persist state across tab switches ───

const draftCache = new Map<string, string>();
const scrollCache = new Map<string, number>();
const historyCache = new Map<string, { messages: ParsedMessage[]; ts: number }>();
const sendingCache = new Map<string, boolean>();
const activeRunIdCache = new Map<string, string>();
const HISTORY_TTL = 30_000;

// ─── Message Bubble ───

function MessageBubble({ msg, showTools = true }: { msg: ParsedMessage; showTools?: boolean }) {
  const hasText = !!msg.text.trim();
  const hasTools = msg.toolCards.length > 0;

  if (!hasText && hasTools && msg.role === "tool") {
    if (!showTools) return null;
    return (
      <div className="space-y-1.5">
        {msg.toolCards.map((tc, j) => <ToolCardView key={j} entry={tc} />)}
      </div>
    );
  }

  if (!hasText && !hasTools) return null;
  if (!hasText && hasTools && !showTools) return null;

  return (
    <div className={cn(
      "chat-bubble rounded-2xl px-4 py-2.5",
      msg.role === "user"
        ? "bg-orange-500/20 text-white/90 border border-orange-500/30"
        : "bg-white/[0.04] border border-white/[0.06]"
    )}>
      {hasText && (
        msg.role === "assistant"
          ? <MarkdownContent text={msg.text} className="text-white/75" />
          : <div className="text-[14px] leading-relaxed whitespace-pre-wrap break-words text-white/90">{msg.text}</div>
      )}
      {hasTools && showTools && (
        <div className={cn("space-y-1.5", hasText && "mt-2")}>
          {msg.toolCards.map((tc, j) => <ToolCardView key={j} entry={tc} />)}
        </div>
      )}
    </div>
  );
}

// ─── Chat Group ───

function SystemMessage({ msg }: { msg: ParsedMessage }) {
  const [expanded, setExpanded] = useState(false);
  const hasBody = !!(msg.body && msg.body.trim());
  const isNoise = /^Exec completed|^Build |^Process /i.test(msg.text);

  // Noise events: tiny centered label
  if (isNoise && !hasBody) {
    return (
      <div className="flex justify-center py-0.5">
        <span className="text-[10px] text-white/10 text-center max-w-[80%] truncate">{msg.text}</span>
      </div>
    );
  }

  // Content events (cron reports, etc.): expandable card
  return (
    <div className="ml-10 mr-0 my-1.5">
      <button
        onClick={() => hasBody && setExpanded(!expanded)}
        className={cn(
          "w-full text-left rounded-lg border transition-colors",
          expanded
            ? "bg-white/[0.04] border-white/[0.08]"
            : "bg-white/[0.02] border-white/[0.05] hover:border-white/[0.08] hover:bg-white/[0.03]",
          !hasBody && "cursor-default"
        )}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-400/50 shrink-0" />
          <span className="text-[12px] text-white/40 truncate flex-1">{msg.text}</span>
          {hasBody && (
            <span className="text-[10px] text-white/20 shrink-0">{expanded ? "▼" : "▶"}</span>
          )}
          <span className="text-[10px] text-white/15 shrink-0">
            {new Date(msg.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
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

export function ChatGroup({ group, showTools = true }: { group: MessageGroup; showTools?: boolean }) {
  if (group.role === "system") {
    return (
      <>
        {group.messages.map((m, i) => <SystemMessage key={i} msg={m} />)}
      </>
    );
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
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/15">{time}</span>
          </div>
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
                <div className="space-y-1.5">
                  {allToolCards.map((tc, j) => <ToolCardView key={j} entry={tc} />)}
                </div>
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

// ─── Main Component ───

export function TaskChat({ task, allProjects, onBack, onStatusChange, onPriorityChange, onProjectChange, onEdit, onDelete, initialMessage, onInitialMessageSent }: TaskChatProps) {
  const { id: taskId, summary: taskSummary, sessionKey } = task;
  const { rpc } = useGateway();

  // ─── State ───
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [input, setInput] = useState(() => draftCache.get(taskId) || "");
  const [sending, _setSending] = useState(() => sendingCache.get(taskId) || false);
  const sendingRef = useRef(sending);
  const setSending = useCallback((v: boolean) => {
    sendingCache.set(taskId, v);
    sendingRef.current = v;
    _setSending(v);
  }, [taskId]);
  const [streamContent, setStreamContent] = useState<string | null>(null);
  const streamRef = useRef<string | null>(null);
  useEffect(() => { streamRef.current = streamContent; }, [streamContent]);
  const [liveTools, setLiveTools] = useState<Array<{ name: string; detail?: string }>>([]);
  const [showTools, setShowTools] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);

  // ─── Refs ───
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeRunId = useRef<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialScrollRestored = useRef(false);
  const prevMessageCount = useRef(0);
  const sessionKeyRef = useRef(sessionKey);
  useEffect(() => { sessionKeyRef.current = sessionKey; }, [sessionKey]);

  // ─── Load history ───
  const loadHistory = useCallback(async (opts?: { skipCache?: boolean }): Promise<ParsedMessage[]> => {
    try {
      if (!opts?.skipCache) {
        const cached = historyCache.get(sessionKey);
        if (cached && Date.now() - cached.ts < HISTORY_TTL) {
          setMessages(cached.messages);
          return cached.messages;
        }
      }

      const result = await rpc.getChatHistory(sessionKey, { limit: 100 });
      const data = result as { messages?: Array<Record<string, unknown>> };
      if (!data?.messages) return [];
      const parsed = parseMessages(data.messages as Parameters<typeof parseMessages>[0]);
      historyCache.set(sessionKey, { messages: parsed, ts: Date.now() });

      if (sendingRef.current) {
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg?.role === "user") {
            const serverHasIt = parsed.length > 0 && parsed[parsed.length - 1]?.role === "user"
              && parsed[parsed.length - 1].text === lastMsg.text;
            if (!serverHasIt) return [...parsed, lastMsg];
          }
          return parsed;
        });
      } else {
        setMessages(parsed);
      }
      return parsed;
    } catch { return []; }
  }, [rpc, sessionKey]);

  // ─── Polling fallback ───
  function pollUntilDone(attempt = 0) {
    if (attempt > 120) { setSending(false); return; }
    pollTimer.current = setTimeout(async () => {
      try {
        const key = sessionKeyRef.current;
        const result = await rpc.getChatHistory(key, { limit: 100 });
        const data = result as { messages?: Array<Record<string, unknown>> };
        if (data?.messages) {
          const parsed = parseMessages(data.messages as Parameters<typeof parseMessages>[0]);
          historyCache.set(key, { messages: parsed, ts: Date.now() });
          setMessages(parsed);

          if (attempt >= 3 && parsed.length > 0) {
            const last = parsed[parsed.length - 1];
            if (last.role === "assistant" && last.text.trim()) {
              setSending(false);
              setStreamContent(null);
              setLiveTools([]);
              if (pollTimer.current) { clearTimeout(pollTimer.current); pollTimer.current = null; }
              playNotificationSound();
              return;
            }
          }
        }
      } catch { /* */ }
      if (sendingRef.current) pollUntilDone(attempt + 1);
    }, 2000);
  }

  // ─── Session change: reset + reload ───
  useEffect(() => {
    setStreamContent(null);
    setLiveTools([]);
    activeRunId.current = activeRunIdCache.get(taskId) || null;
    initialScrollRestored.current = false;

    const wasSending = sendingCache.get(taskId) || false;

    function detectIncompleteTurn(msgs: ParsedMessage[]): boolean {
      if (msgs.length === 0) return false;
      const last = msgs[msgs.length - 1];
      if (last.role === "user") return true;
      if (last.role === "assistant" && !last.text.trim()) return true;
      return false;
    }

    function resumeIfIncomplete(msgs: ParsedMessage[]) {
      if (wasSending || detectIncompleteTurn(msgs)) {
        setSending(true);
        pollUntilDone();
      } else {
        setSending(false);
      }
    }

    let cancelled = false;
    async function loadAndDetect(retries = 3) {
      const cached = historyCache.get(sessionKey);
      if (cached && Date.now() - cached.ts < HISTORY_TTL) {
        setMessages(cached.messages);
        resumeIfIncomplete(cached.messages);
        return;
      }

      const msgs = await loadHistory({ skipCache: true });
      if (cancelled) return;

      if (msgs.length === 0 && retries > 0) {
        await new Promise(r => setTimeout(r, 1000));
        if (!cancelled) await loadAndDetect(retries - 1);
        return;
      }
      resumeIfIncomplete(msgs);
    }

    // Skip history load when we have an initial message — it's a new session
    if (!initialMessage) loadAndDetect();
    return () => { cancelled = true; };
  }, [sessionKey, loadHistory, initialMessage]);

  // ─── Auto-send initial message ───
  const initialSent = useRef<string | null>(null);
  useEffect(() => {
    if (!initialMessage) return;
    const sentKey = `${taskId}:${initialMessage}`;
    if (initialSent.current === sentKey) return;
    initialSent.current = sentKey;

    setMessages(prev => [...prev, { role: "user", text: initialMessage, toolCards: [], at: new Date().toISOString() }]);
    setSending(true);
    const messageToSend = initialMessage;
    onInitialMessageSent?.();

    (async () => {
      try {
        const result = await rpc.chatSend(sessionKey, messageToSend);
        if (result?.runId) { activeRunId.current = result.runId; activeRunIdCache.set(taskId, result.runId); }
        pollUntilDone();
      } catch (err) {
        setMessages(prev => [...prev, { role: "assistant", text: `⚠️ ${err instanceof Error ? err.message : "Error"}`, toolCards: [], at: new Date().toISOString() }]);
        setSending(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage]);

  // ─── Chat events ───
  useEffect(() => {
    const unsub = rpc.onEvent("chat", (data: unknown) => {
      const evt = data as { sessionKey?: string; runId?: string; state?: string; message?: unknown; errorMessage?: string };
      const matches = evt.sessionKey?.endsWith(sessionKey) || (evt.runId && evt.runId === activeRunId.current);
      if (!matches) return;

      if (evt.state === "delta") {
        if (!sendingRef.current) setSending(true);
        const text = extractText(evt.message);
        if (text) { const cur = streamRef.current || ""; if (text.length >= cur.length) setStreamContent(text); }
      }
      if (evt.state === "final" || evt.state === "aborted") {
        if (pollTimer.current) { clearTimeout(pollTimer.current); pollTimer.current = null; }
        setStreamContent(null); setLiveTools([]); setSending(false); loadHistory({ skipCache: true });
        if (evt.state === "final") playNotificationSound();
      }
      if (evt.state === "error") {
        setStreamContent(null); setLiveTools([]); setSending(false);
        setMessages(prev => [...prev, { role: "assistant", text: `⚠️ ${evt.errorMessage || "Error"}`, toolCards: [], at: new Date().toISOString() }]);
      }
    });
    return unsub;
  }, [rpc, sessionKey, loadHistory]);

  // ─── Agent events (live tools) ───
  useEffect(() => {
    const unsub = rpc.onEvent("agent", (data: unknown) => {
      const evt = data as { sessionKey?: string; runId?: string; stream?: string; name?: string; toolName?: string; phase?: string; args?: unknown };
      const matches = evt.sessionKey?.endsWith(sessionKey) || (evt.runId && evt.runId === activeRunId.current);
      if (!matches || evt.stream !== "tool") return;

      const name = evt.name || evt.toolName || "tool";
      const phase = evt.phase || "start";
      if (phase === "start") {
        if (!sendingRef.current) setSending(true);
        let detail = "";
        if (evt.args && typeof evt.args === "object") {
          const a = evt.args as Record<string, unknown>;
          detail = (a.command || a.path || a.file_path || a.query || a.url || a.action || "") as string;
        }
        setLiveTools(prev => [...prev, { name, detail: detail ? shortenPath(detail) : undefined }]);
      }
      if (phase === "result" || phase === "error") {
        setLiveTools(prev => prev.slice(0, -1));
      }
    });
    return unsub;
  }, [rpc, sessionKey]);

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

  // ─── Auto-resize textarea ───
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 300) + "px";
  }, []);
  useEffect(() => { autoResize(); }, [input, autoResize]);

  // ─── Cleanup poll timer ───
  useEffect(() => { return () => { if (pollTimer.current) clearTimeout(pollTimer.current); }; }, []);

  // ─── Actions ───
  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;
    setMessages(prev => [...prev, { role: "user", text, toolCards: [], at: new Date().toISOString() }]);
    setInput(""); setSending(true); setStreamContent(null); setLiveTools([]);
    draftCache.delete(taskId);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    try {
      const r = await rpc.chatSend(sessionKey, text);
      if (r?.runId) { activeRunId.current = r.runId; activeRunIdCache.set(taskId, r.runId); }
      pollUntilDone();
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: `⚠️ ${err instanceof Error ? err.message : "Error"}`, toolCards: [], at: new Date().toISOString() }]);
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  async function handleStop() {
    try { await rpc.chatAbort(sessionKey); } catch { /* */ }
    setSending(false); setStreamContent(null); setLiveTools([]);
  }

  const groups = groupMessages(messages);

  // ─── Render ───
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/5 px-5 py-3 space-y-2.5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-all">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="text-[15px] font-semibold text-white/90 leading-snug min-w-0 flex-1 truncate">{taskSummary}</h2>
          <label className="flex items-center gap-1.5 cursor-pointer text-white/35 hover:text-white/55 transition-colors shrink-0">
            <input type="checkbox" checked={showTools} onChange={(e) => setShowTools(e.target.checked)} className="accent-orange-500 w-3.5 h-3.5" />
            <span className="text-[12px]">Show tools</span>
          </label>
        </div>

        <div className="ml-10 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Project picker */}
            <div className="relative">
              <button onClick={() => setShowProjectPicker(!showProjectPicker)}
                className="flex items-center gap-1.5 text-[12px] text-white/45 hover:text-white/70 px-1.5 py-0.5 rounded-md hover:bg-white/[0.04] transition-all">
                <div className={cn("h-2.5 w-2.5 rounded-full", projColor(task.project))} />
                <span>{projLabel(task.project)}</span>
              </button>
              <InlineDropdown show={showProjectPicker} onClose={() => setShowProjectPicker(false)}>
                {(allProjects || ["general"]).map(p => (
                  <button key={p} onClick={() => { onProjectChange?.(p); setShowProjectPicker(false); }}
                    className="w-full text-left flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-all">
                    <div className={cn("h-2 w-2 rounded-full", projColor(p))} />
                    <span className="text-[12px] text-white/60">{projLabel(p)}</span>
                    {(task.project || "general") === p && <Check className="h-3 w-3 text-orange-400 ml-auto" />}
                  </button>
                ))}
              </InlineDropdown>
            </div>

            {/* Priority picker */}
            <div className="relative">
              <button onClick={() => setShowPriorityPicker(!showPriorityPicker)}
                className="flex items-center gap-1.5 text-[12px] px-1.5 py-0.5 rounded-md hover:bg-white/[0.04] transition-all">
                <PriorityIcon priority={task.priority} className="h-3.5 w-3.5" />
                <span className={cn("text-[11px] font-medium", priColors[task.priority || ""] ? priColors[task.priority!].split(" ")[0] : "text-white/30")}>
                  {priLabels[task.priority || ""] || "No priority"}
                </span>
              </button>
              <InlineDropdown show={showPriorityPicker} onClose={() => setShowPriorityPicker(false)}>
                {priOptions.map(p => (
                  <button key={p.key} onClick={() => { onPriorityChange?.(p.key === "none" ? undefined : p.key); setShowPriorityPicker(false); }}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/5 transition-all">
                    <PriorityIcon priority={p.key === "none" ? undefined : p.key} className="h-3.5 w-3.5" />
                    <span className="text-[12px] text-white/60">{p.label}</span>
                    {(task.priority || "none") === p.key && <Check className="h-3 w-3 text-orange-400 ml-auto" />}
                  </button>
                ))}
              </InlineDropdown>
            </div>

            <span className="text-[11px] text-white/15">•</span>
            <span className="text-[11px] text-white/20">{sessionKey}</span>
          </div>
          {(task.note) && (
            <p className="text-[13px] text-white/35 line-clamp-2 leading-relaxed">{task.note}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 ml-10">
          {onStatusChange && task.status === "in_progress" && (
            <button onClick={() => onStatusChange("done")}
              className="flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-lg text-green-300 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/30 transition-all font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" /> Mark Done
            </button>
          )}
          {onStatusChange && task.status === "in_progress" && (
            <button onClick={() => onStatusChange("inbox")}
              className="flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-lg text-white/50 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-white/[0.12] transition-all">
              <Inbox className="h-3.5 w-3.5" /> Move to Inbox
            </button>
          )}
          {onEdit && (
            <button onClick={onEdit}
              className="flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-lg text-white/50 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-white/[0.12] transition-all">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          )}
          {onDelete && (
            <button onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-lg text-red-400/60 hover:text-red-400 bg-white/[0.02] hover:bg-red-500/10 border border-white/[0.06] hover:border-red-500/20 transition-all ml-auto">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmDeleteModal
        open={showDeleteConfirm}
        message={<>Delete <strong className="text-white/80">{taskSummary}</strong>? This can&apos;t be undone.</>}
        onConfirm={() => { setShowDeleteConfirm(false); onDelete?.(); }}
        onCancel={() => setShowDeleteConfirm(false)}
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
                <div className="text-[14px] text-white/75 leading-relaxed">
                  <MarkdownContent text={streamContent || ""} className="text-white/75" />
                  <span className="inline-block w-1.5 h-4 bg-orange-400 animate-pulse ml-0.5 align-middle" />
                </div>
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

      {/* Input */}
      <div className="flex-shrink-0 border-t border-white/5 px-5 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message the agent about this task…"
            rows={1}
            className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[14px] text-white placeholder-white/20 focus:border-orange-500/30 focus:outline-none transition-colors resize-none overflow-y-auto"
            style={{ minHeight: "42px" }}
          />
          {sending ? (
            <button onClick={handleStop} className="p-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all shrink-0" title="Stop">
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={sendMessage} disabled={!input.trim()} className="p-2.5 rounded-xl bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-30 transition-all shrink-0" title="Send">
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
