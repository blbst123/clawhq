// ─── OpenClaw Gateway WebSocket RPC Client ───
// Matches the real gateway control-UI protocol (type:req/res, connect handshake)

type RpcCallback = {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export interface GatewayConfig {
  url: string;   // e.g. "http://100.x.y.z:18789"
  token: string;
}

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

function makeId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export class GatewayRPC {
  private ws: WebSocket | null = null;
  private pending = new Map<string, RpcCallback>();
  private config: GatewayConfig | null = null;
  private closed = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffMs = 1000;
  private _status: ConnectionStatus = "disconnected";
  private statusListeners = new Set<(status: ConnectionStatus) => void>();
  private eventListeners = new Map<string, Set<(data: unknown) => void>>();
  private helloData: Record<string, unknown> | null = null;
  private connectSent = false;
  private connectNonce: string | null = null;

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
    this.helloData = null;
    this.doConnect();
  }

  disconnect() {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.helloData = null;
    this.flushPending(new Error("Disconnected"));
    this.setStatus("disconnected");
  }

  get isConnected() {
    return this._status === "connected" && this.ws?.readyState === WebSocket.OPEN;
  }

  getHelloData() {
    return this.helloData;
  }

  async request<T = unknown>(method: string, params?: Record<string, unknown>, timeoutMs = 15000): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Not connected to gateway");
    }

    const id = makeId();
    const msg = JSON.stringify({ type: "req", id, method, params: params ?? {} });

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

  async listSessions(opts?: { active?: number }) {
    return this.request<Array<{
      sessionKey: string;
      sessionId: string;
      updatedAt: number;
      chatType?: string;
      [key: string]: unknown;
    }>>("sessions.list", opts);
  }

  async getSessionUsage(opts?: { limit?: number }) {
    return this.request<unknown>("sessions.usage", opts ?? { limit: 200 });
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

  async listCronJobs(opts?: { includeDisabled?: boolean }) {
    return this.request<{ jobs: Array<{
      id: string;
      name?: string;
      schedule: unknown;
      payload: unknown;
      enabled: boolean;
      lastRun?: unknown;
      nextRun?: string;
      [key: string]: unknown;
    }> }>("cron.list", opts);
  }

  async getCronStatus() {
    return this.request<unknown>("cron.status");
  }

  async updateCronJob(jobId: string, patch: Record<string, unknown>) {
    return this.request<unknown>("cron.update", { jobId, patch });
  }

  async runCronJob(jobId: string) {
    return this.request<unknown>("cron.run", { jobId });
  }

  async removeCronJob(jobId: string) {
    return this.request<unknown>("cron.remove", { jobId });
  }

  async getCronRuns(jobId: string) {
    return this.request<unknown>("cron.runs", { jobId });
  }

  async getChatHistory(sessionKey: string, opts?: { limit?: number; includeTools?: boolean }) {
    return this.request<unknown>("chat.history", { sessionKey, ...opts });
  }

  async chatSend(sessionKey: string, message: string, opts?: { idempotencyKey?: string }) {
    return this.request<{ runId?: string; status?: string }>("chat.send", {
      sessionKey,
      message,
      deliver: false,
      idempotencyKey: opts?.idempotencyKey ?? makeId(),
    });
  }

  async chatAbort(sessionKey: string) {
    return this.request<unknown>("chat.abort", { sessionKey });
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

  async listSkills(agentId?: string) {
    return this.request<{ skills: Array<{
      name: string; description: string; source: string; bundled: boolean;
      filePath: string; baseDir: string; skillKey: string;
      emoji?: string | null; homepage?: string | null;
      always?: boolean; disabled?: boolean; blockedByAllowlist?: boolean;
      eligible: boolean;
      requirements?: { bins?: string[]; anyBins?: string[]; env?: string[]; config?: string[]; os?: string[] } | null;
      missing?: { bins: string[]; env: string[]; config: string[]; os: string[] } | null;
      configChecks?: Record<string, unknown> | null;
      install?: unknown[] | null;
    }> }>("skills.status", agentId ? { agentId } : {});
  }

  async readSkill(location: string) {
    return this.request<{ content: string }>("clawhq.skills.read", { location });
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

    // Build WS URL
    let wsUrl: string;
    if (this.config.url === "__self__" || this.config.url === "") {
      // Same-origin: served by the gateway, connect to same host
      const proto = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws";
      const host = typeof window !== "undefined" ? window.location.host : "localhost:18789";
      wsUrl = `${proto}://${host}`;
    } else if (this.config.url === "__proxy__") {
      // Dev proxy mode (server.mjs)
      const proto = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws";
      const host = typeof window !== "undefined" ? window.location.host : "localhost:3001";
      wsUrl = `${proto}://${host}/ws`;
    } else {
      wsUrl = this.config.url.replace(/^http/, "ws").replace(/\/$/, "");
    }

    try {
      this.ws = new WebSocket(wsUrl);
    } catch {
      this.setStatus("error");
      this.scheduleReconnect();
      return;
    }

    this.ws.addEventListener("open", () => {
      // Queue connect with a brief delay (gateway may send a challenge first)
      this.connectSent = false;
      this.connectNonce = null;
      setTimeout(() => this.sendConnect(), 750);
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
      // error event is followed by close event
    });
  }

  private sendConnect() {
    if (this.connectSent) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.config) return;
    this.connectSent = true;

    const connectParams: Record<string, unknown> = {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: "openclaw-control-ui",
        version: "0.1.0",
        platform: typeof navigator !== "undefined" ? navigator.platform ?? "web" : "web",
        mode: "webchat",
      },
      role: "operator",
      scopes: ["operator.admin", "operator.approvals", "operator.pairing"],
      auth: {
        token: this.config.token,
      },
      caps: [],
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "clawhq",
      locale: typeof navigator !== "undefined" ? navigator.language : "en",
    };

    this.request("connect", connectParams)
      .then((result) => {
        this.backoffMs = 1000;
        this.helloData = result as Record<string, unknown>;
        this.setStatus("connected");
      })
      .catch(() => {
        this.setStatus("error");
        this.ws?.close();
      });
  }

  private handleMessage(raw: string) {
    try {
      const msg = JSON.parse(raw);

      // Response to a request: {type: "res", id, ok, payload?, error?}
      if (msg.type === "res" && msg.id !== undefined && this.pending.has(msg.id)) {
        const cb = this.pending.get(msg.id)!;
        this.pending.delete(msg.id);
        clearTimeout(cb.timer);
        if (msg.error) {
          cb.reject(new Error(msg.error.message ?? msg.error ?? "RPC error"));
        } else {
          // Gateway uses "payload" not "result"
          cb.resolve(msg.payload ?? msg.result);
        }
        return;
      }

      // Server-push event: {type: "event", event, payload?, seq?}
      if (msg.type === "event") {
        const eventName = msg.event;

        // Handle connect challenge — store nonce and re-send connect
        if (eventName === "connect.challenge") {
          const nonce = msg.payload?.nonce;
          if (typeof nonce === "string") {
            this.connectNonce = nonce;
            this.connectSent = false; // Allow re-send
            this.sendConnect();
          }
          return;
        }

        if (eventName) {
          const listeners = this.eventListeners.get(eventName);
          if (listeners) listeners.forEach(fn => fn(msg.payload));
          const all = this.eventListeners.get("*");
          if (all) all.forEach(fn => fn({ event: eventName, payload: msg.payload }));
        }
        return;
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
    this.backoffMs = Math.min(this.backoffMs * 1.7, 30000);
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
