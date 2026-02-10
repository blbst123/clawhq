import { useState, useEffect } from "react";
import { useGateway } from "./gateway-context";

let cache: { name: string; emoji: string } | null = null;

export function useAgentIdentity() {
  const { rpc, status } = useGateway();
  const [name, setName] = useState(cache?.name || "Agent");
  const [emoji, setEmoji] = useState(cache?.emoji || "🤖");

  useEffect(() => {
    if (status !== "connected") return;
    if (cache) { setName(cache.name); setEmoji(cache.emoji); return; }
    (async () => {
      let n = "Agent";
      let e = "🤖";

      // 1. Try gateway status for agent name
      try {
        const s = await rpc.getStatus();
        if (s?.agent) n = s.agent;
      } catch { /* */ }

      // 2. Try IDENTITY.md for richer identity (name + emoji)
      try {
        const result = await rpc.request<{ content?: string }>("clawhq.files.read", { path: "IDENTITY.md" });
        if (result?.content) {
          const nameMatch = result.content.match(/\*\*Name:\*\*\s*(.+)/);
          const emojiMatch = result.content.match(/\*\*Emoji:\*\*\s*(.+)/);
          if (nameMatch) n = nameMatch[1].trim();
          if (emojiMatch) e = emojiMatch[1].trim();
        }
      } catch { /* IDENTITY.md not found — use gateway name */ }

      cache = { name: n, emoji: e };
      setName(n);
      setEmoji(e);
    })();
  }, [status, rpc]);

  return { name, emoji };
}
