// ─── OpenClaw Gateway WebSocket RPC Client ───
// Connects to the gateway's WebSocket RPC endpoint (same protocol as Control UI)

type RpcCallback = {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export interface GatewayConfig {
  url: string;   // e.g. "ws://100.x.y.z:18789" or "wss://..."
  token: string;
}

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export class GatewayRPC {
  private ws: WebSocket | null = null;
  private pending = new Map<number, RpcCallback>();
  private nextId = 1;
  private config: GatewayConfig | null = null;
  private closed = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffMs = 1000;
  private _status: ConnectionStatus = "disconnected";
  private statusListeners = new Set<(status: ConnectionStatus) => void>();
  private eventListeners = new Map<string, Set<(data: unknown) => void>>();

  get status() { return this._status; }

  private setStatus(s: ConnectionStatus) {
    this._status = s;
    this.statusListeners.forEach(fn => fn(s));
  }

  onStatus(fn: (status: ConnectionStatus) => void) {
    this.statusListeners.add(fn);
    return () => { this.statusListeners.delete(fn); };
  }

  onEvent(event: string, fn: (data: unknown) => void) {
    if (!this.eventListeners.has(event)) this.eventListeners.set(event, new Set());
    this.eventListeners.get(event)!.add(fn);
    return () => { this.eventListeners.get(event)?.delete(fn); };
  }

  connect(config: GatewayConfig) {
    this.config = config;
    this.closed = false;
    this.doConnect();
  }

  disconnect() {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.flushPending(new Error("Disconnected"));
    this.setStatus("disconnected");
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  async request<T = unknown>(method: string, params?: Record<string, unknown>, timeoutMs = 15000): Promise<T> {
    if (!this.isConnected) throw new Error("Not connected to gateway");

    const id = this.nextId++;
    const msg = JSON.stringify({ jsonrpc: "2.0", method, params: params ?? {}, id });

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`RPC timeout: ${method}`));
      }, timeoutMs);

      this.pending.set(id, {
        resolve: resolve as (r: unknown) => void,
        reject,
        timer,
      });

      this.ws!.send(msg);
    });
  }

  // ─── Convenience methods ───

  async getStatus() {
    return this.request<{
      version?: string;
      uptime?: number;
      agent?: string;
      model?: string;
      [key: string]: unknown;
    }>("status");
  }

  async getHealth() {
    return this.request("health");
  }

  async listSessions(opts?: { active?: number }) {
    return this.request<Array<{
      sessionKey: string;
      sessionId: string;
      updatedAt: number;
      chatType?: string;
      [key: string]: unknown;
    }>>("sessions.list", opts);
  }

  async getSessionUsage() {
    return this.request<unknown>("sessions.usage");
  }

  async getUsageLogs() {
    return this.request<unknown>("sessions.usage.logs");
  }

  async getUsageTimeseries(opts?: { from?: number; to?: number; bucketMs?: number }) {
    return this.request<unknown>("sessions.usage.timeseries", opts);
  }

  async getUsageCost() {
    return this.request<unknown>("usage.cost");
  }

  async listCronJobs() {
    return this.request<{ jobs: Array<{
      id: string;
      name?: string;
      schedule: unknown;
      payload: unknown;
      enabled: boolean;
      lastRun?: unknown;
      nextRun?: string;
      [key: string]: unknown;
    }> }>("cron.list");
  }

  async getCronStatus() {
    return this.request<unknown>("cron.status");
  }

  async getCronRuns(jobId: string) {
    return this.request<unknown>("cron.runs", { jobId });
  }

  async getChatHistory(sessionKey: string, opts?: { limit?: number; includeTools?: boolean }) {
    return this.request<unknown>("chat.history", { sessionKey, ...opts });
  }

  async getConfig() {
    return this.request<unknown>("config.get");
  }

  async listModels() {
    return this.request<unknown>("models.list");
  }

  async getChannelsStatus() {
    return this.request<unknown>("channels.status");
  }

  async listAgents() {
    return this.request<unknown>("agents.list");
  }

  async listNodes() {
    return this.request<unknown>("node.list");
  }

  async getAgentIdentity() {
    return this.request<{ name?: string; avatar?: string }>("agent.identity.get");
  }

  async listFiles(opts?: { agent?: string; path?: string }) {
    return this.request<unknown>("agents.files.list", opts);
  }

  async getFile(opts: { agent?: string; path: string }) {
    return this.request<unknown>("agents.files.get", opts);
  }

  async setFile(opts: { agent?: string; path: string; content: string }) {
    return this.request<unknown>("agents.files.set", opts);
  }

  // ─── Internal ───

  private doConnect() {
    if (this.closed || !this.config) return;

    this.setStatus("connecting");

    // Build WS URL with token
    const wsUrl = this.config.url.replace(/^http/, "ws");
    const separator = wsUrl.includes("?") ? "&" : "?";
    const url = `${wsUrl}${separator}token=${encodeURIComponent(this.config.token)}`;

    try {
      this.ws = new WebSocket(url);
    } catch {
      this.setStatus("error");
      this.scheduleReconnect();
      return;
    }

    this.ws.addEventListener("open", () => {
      this.backoffMs = 1000;
      this.setStatus("connected");
      // Send connect handshake
      this.ws?.send(JSON.stringify({
        jsonrpc: "2.0",
        method: "connect",
        params: { token: this.config!.token, client: "clawhq" },
        id: this.nextId++,
      }));
    });

    this.ws.addEventListener("message", (ev) => {
      this.handleMessage(String(ev.data ?? ""));
    });

    this.ws.addEventListener("close", () => {
      this.ws = null;
      if (!this.closed) {
        this.setStatus("connecting");
        this.scheduleReconnect();
      }
    });

    this.ws.addEventListener("error", () => {
      this.setStatus("error");
    });
  }

  private handleMessage(raw: string) {
    try {
      const msg = JSON.parse(raw);

      // RPC response
      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const cb = this.pending.get(msg.id)!;
        this.pending.delete(msg.id);
        clearTimeout(cb.timer);
        if (msg.error) {
          cb.reject(new Error(msg.error.message ?? "RPC error"));
        } else {
          cb.resolve(msg.result);
        }
        return;
      }

      // Server-push event (notification)
      if (msg.method && !msg.id) {
        const listeners = this.eventListeners.get(msg.method);
        if (listeners) {
          listeners.forEach(fn => fn(msg.params));
        }
        // Also emit wildcard
        const all = this.eventListeners.get("*");
        if (all) {
          all.forEach(fn => fn({ method: msg.method, params: msg.params }));
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  private scheduleReconnect() {
    if (this.closed) return;
    this.reconnectTimer = setTimeout(() => {
      this.doConnect();
    }, this.backoffMs);
    this.backoffMs = Math.min(this.backoffMs * 1.5, 30000);
  }

  private flushPending(error: Error) {
    for (const [id, cb] of this.pending) {
      clearTimeout(cb.timer);
      cb.reject(error);
    }
    this.pending.clear();
  }
}

// ─── Singleton ───
let _instance: GatewayRPC | null = null;
export function getGateway(): GatewayRPC {
  if (!_instance) _instance = new GatewayRPC();
  return _instance;
}

// ─── LocalStorage helpers ───
const STORAGE_KEY = "clawhq_gateway";

export function saveGatewayConfig(config: GatewayConfig) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }
}

export function loadGatewayConfig(): GatewayConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearGatewayConfig() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}
