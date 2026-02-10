// ─── Chat message parsing & grouping (pure logic, no React) ───

export interface ParsedMessage {
  role: "user" | "assistant" | "tool" | "system";
  text: string;
  toolCards: ToolEntry[];
  at: string;
  /** Full body for system events (cron reports, etc.) */
  body?: string;
}

export interface ToolEntry {
  kind: "call" | "result";
  name: string;
  args?: string;
  text?: string;
}

export interface MessageGroup {
  role: "user" | "assistant" | "tool" | "system";
  messages: ParsedMessage[];
  at: string;
}

// ─── Content extraction ───

export function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter(b => b && typeof b === "object" && (b as Record<string, unknown>).type === "text")
      .map(b => (b as Record<string, unknown>).text as string || "")
      .filter(Boolean)
      .join("\n");
  }
  if (content && typeof content === "object") {
    const c = content as Record<string, unknown>;
    if (typeof c.text === "string") return c.text;
    if (typeof c.content === "string") return c.content;
  }
  return "";
}

export function extractToolEntries(msg: {
  role?: string; content?: unknown; name?: string;
  toolName?: string; tool_name?: string;
  toolCallId?: string; tool_call_id?: string;
}): ToolEntry[] {
  const entries: ToolEntry[] = [];
  const content = msg.content;

  if (Array.isArray(content)) {
    for (const block of content) {
      if (!block || typeof block !== "object") continue;
      const b = block as Record<string, unknown>;
      const btype = (typeof b.type === "string" ? b.type : "").toLowerCase();

      if (["toolcall", "tool_call", "tooluse", "tool_use"].includes(btype) || (typeof b.name === "string" && b.arguments != null)) {
        let args = "";
        try {
          const raw = b.input ?? b.arguments ?? b.args;
          if (typeof raw === "string") args = raw;
          else if (raw) args = JSON.stringify(raw);
        } catch { /* */ }
        entries.push({ kind: "call", name: (b.name as string) || "tool", args });
      }

      if (btype === "toolresult" || btype === "tool_result") {
        const text = typeof b.text === "string" ? b.text : typeof b.content === "string" ? b.content : "";
        entries.push({ kind: "result", name: (b.name as string) || "tool", text });
      }
    }
  }

  const isToolResult = msg.role === "tool" || typeof msg.toolCallId === "string" || typeof msg.tool_call_id === "string";
  if (isToolResult && !entries.some(e => e.kind === "result")) {
    const name = (msg.toolName || msg.tool_name || msg.name || "tool") as string;
    const text = extractText(content) || undefined;
    entries.push({ kind: "result", name, text });
  }

  return entries;
}

export function shortenPath(s: string): string {
  return s.replace(/\/Users\/[^/]+/g, "~").replace(/\/home\/[^/]+/g, "~");
}

export function getToolDetail(name: string, args?: string): string {
  if (!args) return "";
  try {
    const p = JSON.parse(args);
    const raw = p.command || p.path || p.file_path || p.query || p.url || p.action || "";
    return raw ? shortenPath(raw) : "";
  } catch { return ""; }
}

// ─── System message splitting ───
// OpenClaw bundles system events + user text into a single role:"user" message.
// Format: "System: [timestamp] label: multi-line body\nSystem: [timestamp] ...\n[Tue ...] actual user text\n[message_id: ...]"
//
// We split these into separate ParsedMessages: system events + optional user message.

interface SplitResult {
  systemBlocks: { label: string; body: string; timestamp: string }[];
  userText: string;
}

const SYSTEM_BLOCK_RE = /^System:\s*\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+\w+)\]\s*/;
const USER_LINE_RE = /^\[(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+\w+\]\s*/;
const MSG_ID_RE = /\[message_id:\s*\w+\]\s*$/;

function splitUserContent(text: string): SplitResult {
  const systemBlocks: SplitResult["systemBlocks"] = [];
  const lines = text.split("\n");

  let currentSystemLabel = "";
  let currentSystemTimestamp = "";
  let currentSystemBody: string[] = [];
  let userLines: string[] = [];
  let inSystemBlock = false;

  for (const line of lines) {
    const sysMatch = line.match(SYSTEM_BLOCK_RE);
    if (sysMatch) {
      // Flush previous system block
      if (inSystemBlock && currentSystemLabel) {
        systemBlocks.push({
          label: currentSystemLabel,
          body: currentSystemBody.join("\n").trim(),
          timestamp: currentSystemTimestamp,
        });
      }
      inSystemBlock = true;
      currentSystemTimestamp = sysMatch[1];
      const rest = line.slice(sysMatch[0].length);
      currentSystemLabel = rest.split("\n")[0].slice(0, 200);
      currentSystemBody = [rest];
      continue;
    }

    if (inSystemBlock) {
      // Check if this line looks like a user message (timestamp prefix)
      if (USER_LINE_RE.test(line)) {
        // Flush system block, switch to user mode
        systemBlocks.push({
          label: currentSystemLabel,
          body: currentSystemBody.join("\n").trim(),
          timestamp: currentSystemTimestamp,
        });
        inSystemBlock = false;
        const cleaned = line.replace(USER_LINE_RE, "").replace(MSG_ID_RE, "").trim();
        if (cleaned) userLines.push(cleaned);
        continue;
      }
      // Still part of system block body
      currentSystemBody.push(line);
    } else {
      // User text area
      const cleaned = line.replace(USER_LINE_RE, "").replace(MSG_ID_RE, "").trim();
      if (cleaned) userLines.push(cleaned);
    }
  }

  // Flush final system block
  if (inSystemBlock && currentSystemLabel) {
    systemBlocks.push({
      label: currentSystemLabel,
      body: currentSystemBody.join("\n").trim(),
      timestamp: currentSystemTimestamp,
    });
  }

  return { systemBlocks, userText: userLines.join("\n").trim() };
}

/** Extract a short label for a system event (first meaningful line) */
function systemLabel(label: string): string {
  // "Cron (error): 🤖 **Some Job Name..." → "Cron: Some Job Name..."
  let s = label.replace(/\(error\):\s*/, ": ").replace(/\(ok\):\s*/, ": ");
  // Strip markdown bold
  s = s.replace(/\*\*/g, "");
  // Strip emoji
  s = s.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]/gu, "").trim();
  return s.slice(0, 120) || "system event";
}

// ─── Noise filtering (things to hide completely) ───

const HIDE_PATTERNS = [
  /^Pre-compaction memory flush/i,
  /^Store durable memories now/i,
  /^Read HEARTBEAT\.md/i,
  /^The conversation history before this point was compacted/i,
  /^\[Queued messages while agent was busy\]/i,
];

/** Patterns for system block labels (after "System: [timestamp] ") to skip */
const NOISE_LABEL_PATTERNS = [
  /^Exec completed/i,
  /^Build /i,
  /^Process /i,
];

function shouldHide(text: string): boolean {
  return HIDE_PATTERNS.some(p => p.test(text.trim()));
}

function isSystemNoise(label: string): boolean {
  return NOISE_LABEL_PATTERNS.some(p => p.test(label.trim()));
}

// ─── Parse raw history → ParsedMessages ───

export type RawMessage = {
  role?: string; content?: unknown; timestamp?: string;
  name?: string; toolName?: string; tool_name?: string;
  toolCallId?: string; tool_call_id?: string;
};

export function parseMessages(raw: RawMessage[]): ParsedMessage[] {
  const msgs: ParsedMessage[] = [];
  for (const m of raw) {
    const role = ((m.role || "assistant") as string).toLowerCase();
    if (role === "system") continue;

    const rawText = extractText(m.content);
    const ts = m.timestamp || new Date().toISOString();

    // Handle user messages — split system events from actual user text
    if (role === "user") {
      // Check if entire message is noise to hide
      if (shouldHide(rawText)) continue;

      const { systemBlocks, userText } = splitUserContent(rawText);

      // Emit system events as system messages (skip noise)
      for (const block of systemBlocks) {
        if (isSystemNoise(block.label)) continue;
        msgs.push({
          role: "system",
          text: systemLabel(block.label),
          body: block.body || undefined,
          toolCards: [],
          at: ts,
        });
      }

      // Emit user text if any remains
      if (userText) {
        msgs.push({ role: "user", text: userText, toolCards: [], at: ts });
      }
      continue;
    }

    const toolEntries = extractToolEntries(m);
    const text = extractText(m.content);
    const isToolRole = role === "tool" || typeof m.toolCallId === "string" || typeof m.tool_call_id === "string";

    msgs.push({
      role: isToolRole ? "tool" : "assistant",
      text: isToolRole ? "" : text,
      toolCards: toolEntries,
      at: ts,
    });
  }
  return msgs;
}

// ─── Group into agent turns ───

export function groupMessages(messages: ParsedMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let agentMessages: ParsedMessage[] = [];

  function flushAgent() {
    if (agentMessages.length === 0) return;

    const allToolCards: ToolEntry[] = [];
    const textSegments: { text: string; at: string }[] = [];

    for (const msg of agentMessages) {
      for (const tc of msg.toolCards) allToolCards.push(tc);
      if (msg.text.trim() && msg.role === "assistant") {
        textSegments.push({ text: msg.text.trim(), at: msg.at });
      }
    }

    const mergedMessages: ParsedMessage[] = [];

    if (allToolCards.length > 0) {
      mergedMessages.push({ role: "assistant", text: "", toolCards: allToolCards, at: agentMessages[0].at });
    }
    for (const seg of textSegments) {
      mergedMessages.push({ role: "assistant", text: seg.text, toolCards: [], at: seg.at });
    }

    if (mergedMessages.length > 0) {
      groups.push({ role: "assistant", messages: mergedMessages, at: agentMessages[agentMessages.length - 1].at });
    }
    agentMessages = [];
  }

  for (const msg of messages) {
    if (msg.role === "system") {
      flushAgent();
      groups.push({ role: "system", messages: [msg], at: msg.at });
    } else if (msg.role === "user") {
      flushAgent();
      groups.push({ role: "user", messages: [msg], at: msg.at });
    } else {
      agentMessages.push(msg);
    }
  }
  flushAgent();

  return groups;
}
