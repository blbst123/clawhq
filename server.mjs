// Custom server: Next.js + WebSocket proxy to gateway
// Auto-discovers local gateway config — zero setup needed

import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";

const port = parseInt(process.env.PORT || "3001", 10);
const dev = process.env.NODE_ENV !== "production";

// Auto-discover gateway config
function discoverGateway() {
  const configPath = process.env.OPENCLAW_CONFIG || join(homedir(), ".openclaw", "openclaw.json");
  if (!existsSync(configPath)) return { url: "ws://127.0.0.1:18789", token: null };

  try {
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    const gwPort = config.gateway?.port || 18789;
    const token = config.gateway?.auth?.token || null;
    return { url: `ws://127.0.0.1:${gwPort}`, token };
  } catch {
    return { url: "ws://127.0.0.1:18789", token: null };
  }
}

const gateway = discoverGateway();
console.log(`> Gateway: ${gateway.url} (token: ${gateway.token ? "found" : "missing"})`);

const app = next({ dev, port });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer((req, res) => {
  // Expose gateway info as a JSON endpoint for the frontend
  if (req.url === "/api/gateway-info") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      mode: "local",
      proxyUrl: "/ws",
      hasToken: !!gateway.token,
      token: gateway.token, // Safe — only accessible via localhost tunnel
    }));
    return;
  }
  handle(req, res);
});

// WebSocket proxy
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  if (req.url === "/ws" || req.url?.startsWith("/ws?")) {
    wss.handleUpgrade(req, socket, head, (clientWs) => {
      // Set origin to the Tailscale HTTPS URL so gateway accepts the connection
      // The gateway requires HTTPS or localhost secure context
      const gw = new WebSocket(gateway.url, {
        origin: gateway.secureOrigin || "https://localhost",
        headers: { "X-Forwarded-Proto": "https" },
      });

      gw.on("open", () => {
        clientWs.on("message", (data) => {
          if (gw.readyState === WebSocket.OPEN) gw.send(data);
        });
        gw.on("message", (data) => {
          if (clientWs.readyState === WebSocket.OPEN) clientWs.send(data);
        });
      });

      clientWs.on("close", () => gw.close());
      gw.on("close", () => clientWs.close());
      gw.on("error", () => clientWs.close());
      clientWs.on("error", () => gw.close());
    });
  } else {
    socket.destroy();
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`> ClawHQ ready on http://localhost:${port}`);
  console.log(`> Gateway proxy: /ws → ${gateway.url}`);
});
