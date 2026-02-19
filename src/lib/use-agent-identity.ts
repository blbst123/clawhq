import { useState, useEffect } from "react";
import { useGateway } from "./gateway-context";
import { createStore } from "./create-store";

const store = createStore<{ name: string; emoji: string }>(null);

export function useAgentIdentity() {
  const { rpc, status } = useGateway();
  const [name, setName] = useState(store.get()?.name || "Agent");
  const [emoji, setEmoji] = useState(store.get()?.emoji || "🤖");

  useEffect(() => {
    return store.subscribe(() => {
      const v = store.get();
      if (v) { setName(v.name); setEmoji(v.emoji); }
    });
  }, []);

  useEffect(() => {
    if (status !== "connected") return;
    if (store.get()) { setName(store.get()!.name); setEmoji(store.get()!.emoji); return; }
    (async () => {
      let n = "Agent";
      let e = "🤖";

      try {
        const s = await rpc.getStatus();
        if (s?.agent) n = s.agent;
      } catch { /* */ }

      try {
        const result = await rpc.request<{ content?: string }>("clawhq.files.read", { path: "IDENTITY.md" });
        if (result?.content) {
          const nameMatch = result.content.match(/\*\*Name:\*\*\s*(.+)/);
          const emojiMatch = result.content.match(/\*\*Emoji:\*\*\s*(.+)/);
          if (nameMatch) n = nameMatch[1].trim();
          if (emojiMatch) e = emojiMatch[1].trim();
        }
      } catch { /* IDENTITY.md not found */ }

      store.set({ name: n, emoji: e });
    })();
  }, [status, rpc]);

  return { name, emoji };
}
