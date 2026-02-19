"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useGateway } from "@/lib/gateway-context";
import { type ParsedMessage, extractText, shortenPath, parseMessages } from "@/lib/chat-parser";
import { playNotificationSound } from "@/lib/audio";
import type { Attachment } from "@/components/ui/chat-input";

// ─── Caches (shared across components, SPA-only) ───

const draftCache = new Map<string, string>();
const scrollCache = new Map<string, number>();
const historyCache = new Map<string, { messages: ParsedMessage[]; ts: number }>();
const sendingCache = new Map<string, boolean>();
const activeRunIdCache = new Map<string, string>();
const HISTORY_TTL = 30_000;

export { draftCache, scrollCache };

// ─── Types ───

export interface LiveTool {
  name: string;
  detail?: string;
}

export interface UseChatSessionOptions {
  sessionKey: string;
  /** Stable identifier for caching (defaults to sessionKey) */
  cacheKey?: string;
  /** Skip initial history load (e.g. when sending an initial message) */
  skipInitialLoad?: boolean;
  /** History fetch limit */
  historyLimit?: number;
  /** Background poll interval in ms (0 to disable) */
  backgroundPollMs?: number;
}

export interface UseChatSessionResult {
  messages: ParsedMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ParsedMessage[]>>;
  sending: boolean;
  setSending: (v: boolean) => void;
  streamContent: string | null;
  setStreamContent: React.Dispatch<React.SetStateAction<string | null>>;
  liveTools: LiveTool[];
  setLiveTools: React.Dispatch<React.SetStateAction<LiveTool[]>>;
  loadHistory: (opts?: { skipCache?: boolean }) => Promise<ParsedMessage[]>;
  sendMessage: (text: string, attachments?: Attachment[]) => Promise<void>;
  handleStop: () => Promise<void>;
  activeRunId: React.MutableRefObject<string | null>;
}

export function useChatSession({
  sessionKey,
  cacheKey,
  skipInitialLoad = false,
  historyLimit = 100,
  backgroundPollMs = 0,
}: UseChatSessionOptions): UseChatSessionResult {
  const key = cacheKey ?? sessionKey;
  const { rpc } = useGateway();

  const [messages, setMessages] = useState<ParsedMessage[]>(() => {
    const cached = historyCache.get(sessionKey);
    return cached && Date.now() - cached.ts < HISTORY_TTL ? cached.messages : [];
  });
  const [sending, _setSending] = useState(() => sendingCache.get(key) || false);
  const sendingRef = useRef(sending);
  const setSending = useCallback((v: boolean) => {
    sendingCache.set(key, v);
    sendingRef.current = v;
    _setSending(v);
  }, [key]);

  const [streamContent, setStreamContent] = useState<string | null>(null);
  const streamRef = useRef<string | null>(null);
  useEffect(() => { streamRef.current = streamContent; }, [streamContent]);

  const [liveTools, setLiveTools] = useState<LiveTool[]>([]);
  const activeRunId = useRef<string | null>(activeRunIdCache.get(key) || null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

      const result = await rpc.getChatHistory(sessionKey, { limit: historyLimit });
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
  }, [rpc, sessionKey, historyLimit]);

  // ─── Poll until done ───
  function pollUntilDone(attempt = 0) {
    if (attempt > 120) { setSending(false); return; }
    pollTimer.current = setTimeout(async () => {
      try {
        const sk = sessionKeyRef.current;
        const result = await rpc.getChatHistory(sk, { limit: historyLimit });
        const data = result as { messages?: Array<Record<string, unknown>> };
        if (data?.messages) {
          const parsed = parseMessages(data.messages as Parameters<typeof parseMessages>[0]);
          historyCache.set(sk, { messages: parsed, ts: Date.now() });
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

  // ─── Initial load + detect incomplete turn ───
  useEffect(() => {
    setStreamContent(null);
    setLiveTools([]);
    activeRunId.current = activeRunIdCache.get(key) || null;

    if (skipInitialLoad) return;

    const wasSending = sendingCache.get(key) || false;

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

    loadAndDetect();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey]);

  // ─── Chat events ───
  useEffect(() => {
    const unsub = rpc.onEvent("chat", (data: unknown) => {
      const evt = data as { sessionKey?: string; runId?: string; state?: string; message?: unknown; errorMessage?: string };
      const matches = evt.sessionKey === sessionKey || evt.sessionKey?.endsWith(sessionKey) || (evt.runId && evt.runId === activeRunId.current);
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
  }, [rpc, sessionKey, loadHistory, setSending]);

  // ─── Agent events (live tools) ───
  useEffect(() => {
    const unsub = rpc.onEvent("agent", (data: unknown) => {
      const evt = data as { sessionKey?: string; runId?: string; stream?: string; name?: string; toolName?: string; phase?: string; args?: unknown };
      const matches = evt.sessionKey === sessionKey || evt.sessionKey?.endsWith(sessionKey) || (evt.runId && evt.runId === activeRunId.current);
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
  }, [rpc, sessionKey, setSending]);

  // ─── Background poll ───
  useEffect(() => {
    if (!backgroundPollMs) return;
    const iv = setInterval(() => {
      if (!sendingRef.current) loadHistory();
    }, backgroundPollMs);
    return () => clearInterval(iv);
  }, [backgroundPollMs, loadHistory]);

  // ─── Cleanup ───
  useEffect(() => {
    return () => { if (pollTimer.current) clearTimeout(pollTimer.current); };
  }, []);

  // ─── Send message ───
  const sendMessage = useCallback(async (text: string, attachments?: Attachment[]) => {
    if ((!text && !attachments?.length) || sendingRef.current) return;
    setSending(true);
    setStreamContent(null);
    setLiveTools([]);
    try {
      const rpcAttachments = attachments?.map(a => {
        const match = /^data:([^;]+);base64,(.+)$/.exec(a.dataUrl);
        return match ? { type: "image", mimeType: match[1], content: match[2] } : null;
      }).filter((a): a is { type: string; mimeType: string; content: string } => a !== null);
      const r = await rpc.chatSend(sessionKey, text, { attachments: rpcAttachments?.length ? rpcAttachments : undefined });
      if (r?.runId) { activeRunId.current = r.runId; activeRunIdCache.set(key, r.runId); }
      pollUntilDone();
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: `⚠️ ${err instanceof Error ? err.message : "Error"}`, toolCards: [], at: new Date().toISOString() }]);
      setSending(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rpc, sessionKey, key, setSending]);

  // ─── Stop ───
  const handleStop = useCallback(async () => {
    try { await rpc.chatAbort(sessionKey); } catch { /* */ }
    setSending(false);
    setStreamContent(null);
    setLiveTools([]);
  }, [rpc, sessionKey, setSending]);

  return {
    messages, setMessages,
    sending, setSending,
    streamContent, setStreamContent,
    liveTools, setLiveTools,
    loadHistory,
    sendMessage,
    handleStop,
    activeRunId,
  };
}
