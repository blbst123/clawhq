import * as fs from "node:fs";
import * as path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

// Types matching the OpenClaw plugin API
interface OpenClawPluginApi {
  id: string;
  config: Record<string, any>;
  pluginConfig: Record<string, any>;
  runtime: Record<string, any>;
  logger: { info: (...args: any[]) => void; warn: (...args: any[]) => void; error: (...args: any[]) => void; debug: (...args: any[]) => void };
  registerHttpRoute: (params: { path: string; handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void }) => void;
  registerHttpHandler: (handler: (req: IncomingMessage, res: ServerResponse) => Promise<boolean>) => void;
  registerGatewayMethod: (method: string, handler: (ctx: { params: any; respond: (ok: boolean, payload?: unknown, error?: unknown) => void }) => Promise<void> | void) => void;
  resolvePath: (input: string) => string;
}

// ─── Helpers ───

function resolveWorkspaceDir(config: Record<string, any>): string {
  // Try config.agents.defaults.workspace, fallback to ~/.openclaw/workspace
  const ws = config?.agents?.defaults?.workspace;
  if (ws && typeof ws === "string") {
    if (ws.startsWith("~")) return path.join(process.env.HOME || "/root", ws.slice(1));
    return ws;
  }
  return path.join(process.env.HOME || "/root", ".openclaw", "workspace");
}

function resolveUiDir(): string {
  // UI files live alongside this plugin
  return path.join(__dirname, "ui");
}

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
};

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function sendError(res: ServerResponse, status: number, message: string) {
  sendJson(res, status, { error: message });
}

function getBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

// Verify auth token from query param or Authorization header
function checkAuth(req: IncomingMessage, config: Record<string, any>): boolean {
  const authToken = config?.gateway?.auth?.token;
  if (!authToken) return true; // No auth configured

  // Check query param
  const url = new URL(req.url || "/", "http://localhost");
  const queryToken = url.searchParams.get("token");
  if (queryToken === authToken) return true;

  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const bearer = authHeader.replace(/^Bearer\s+/i, "");
    if (bearer === authToken) return true;
  }

  // Check cookie
  const cookies = req.headers.cookie || "";
  const tokenCookie = cookies.split(";").map(c => c.trim()).find(c => c.startsWith("clawhq_token="));
  if (tokenCookie) {
    const cookieVal = tokenCookie.split("=")[1];
    if (cookieVal === authToken) return true;
  }

  return false;
}

// Sanitize file path to prevent directory traversal
function sanitizePath(input: string): string | null {
  const normalized = path.normalize(input).replace(/^(\.\.[\/\\])+/, "");
  if (normalized.includes("..")) return null;
  if (path.isAbsolute(normalized)) return null;
  return normalized;
}

// ─── Helpers: check if binary exists on PATH ───

function binExistsOnPath(name: string): boolean {
  const pathDirs = (process.env.PATH || "").split(path.delimiter);
  for (const dir of pathDirs) {
    try {
      const full = path.join(dir, name);
      fs.accessSync(full, fs.constants.X_OK);
      return true;
    } catch { /* not found */ }
  }
  return false;
}

// ─── Plugin Registration ───

export default function register(api: OpenClawPluginApi) {
  const log = api.logger;
  const config = api.config;
  const basePath = api.pluginConfig?.basePath || "/clawhq";
  const workspaceDir = resolveWorkspaceDir(config);
  const uiDir = resolveUiDir();

  log.info(`ClawHQ plugin loaded — basePath=${basePath}, workspace=${workspaceDir}, ui=${uiDir}`);

  // ─── API: Read workspace file ───
  api.registerHttpRoute({
    path: `${basePath}/api/files`,
    handler: async (req, res) => {
      if (!checkAuth(req, config)) { sendError(res, 401, "Unauthorized"); return; }

      const url = new URL(req.url || "/", "http://localhost");
      const filePath = url.searchParams.get("path");
      if (!filePath) { sendError(res, 400, "Missing ?path= parameter"); return; }

      const safe = sanitizePath(filePath);
      if (!safe) { sendError(res, 400, "Invalid path"); return; }

      const fullPath = path.join(workspaceDir, safe);
      try {
        const content = await fs.promises.readFile(fullPath, "utf-8");
        sendJson(res, 200, { path: safe, content });
      } catch {
        sendError(res, 404, `File not found: ${safe}`);
      }
    },
  });

  // ─── API: Write workspace file ───
  api.registerHttpRoute({
    path: `${basePath}/api/write`,
    handler: async (req, res) => {
      if (!checkAuth(req, config)) { sendError(res, 401, "Unauthorized"); return; }
      if (req.method !== "POST" && req.method !== "PUT") { sendError(res, 405, "Method not allowed"); return; }

      const body = await getBody(req);
      let parsed: { path: string; content: string };
      try {
        parsed = JSON.parse(body);
      } catch {
        sendError(res, 400, "Invalid JSON body"); return;
      }

      if (!parsed.path || typeof parsed.content !== "string") {
        sendError(res, 400, "Body must have { path, content }"); return;
      }

      const safe = sanitizePath(parsed.path);
      if (!safe) { sendError(res, 400, "Invalid path"); return; }

      const fullPath = path.join(workspaceDir, safe);
      try {
        await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.promises.writeFile(fullPath, parsed.content, "utf-8");
        sendJson(res, 200, { ok: true, path: safe });
      } catch (err) {
        sendError(res, 500, `Write failed: ${err}`);
      }
    },
  });

  // ─── API: List workspace files ───
  api.registerHttpRoute({
    path: `${basePath}/api/ls`,
    handler: async (req, res) => {
      if (!checkAuth(req, config)) { sendError(res, 401, "Unauthorized"); return; }

      const url = new URL(req.url || "/", "http://localhost");
      const dirPath = url.searchParams.get("path") || "";

      const safe = dirPath ? sanitizePath(dirPath) : "";
      if (safe === null) { sendError(res, 400, "Invalid path"); return; }

      const fullPath = path.join(workspaceDir, safe || "");
      try {
        const entries = await fs.promises.readdir(fullPath, { withFileTypes: true });
        const files = entries.map(e => ({
          name: e.name,
          path: path.join(safe || "", e.name),
          isDir: e.isDirectory(),
        }));
        sendJson(res, 200, { path: safe || "/", files });
      } catch {
        sendError(res, 404, `Directory not found: ${safe}`);
      }
    },
  });

  // ─── Catch-all HTTP handler for UI static files ───
  api.registerHttpHandler(async (req, res) => {
    const url = new URL(req.url || "/", "http://localhost");
    let pathname = url.pathname;

    // Only handle requests under basePath
    if (!pathname.startsWith(basePath)) return false;

    // Strip basePath
    let relativePath = pathname.slice(basePath.length) || "/";

    // Skip auth for static assets (CSS/JS/fonts/images) — no sensitive data
    const isStaticAsset = relativePath.startsWith("/_next/") || relativePath.startsWith("_next/") ||
      /\.(css|js|woff2?|png|svg|ico|jpg|jpeg|gif|webp|map)$/i.test(relativePath);

    if (!isStaticAsset && !checkAuth(req, config)) {
      // Redirect to gateway root for auth
      res.writeHead(401, { "Content-Type": "text/html" });
      res.end("<h1>Unauthorized</h1><p>Add ?token=YOUR_TOKEN to the URL.</p>");
      return true;
    }

    // Map to file
    if (relativePath === "/") relativePath = "/index.html";
    if (!path.extname(relativePath)) relativePath += ".html";

    const filePath = path.join(uiDir, relativePath);

    // Security: ensure we don't escape uiDir
    if (!filePath.startsWith(uiDir)) {
      res.writeHead(403);
      res.end("Forbidden");
      return true;
    }

    try {
      const stat = await fs.promises.stat(filePath);
      if (!stat.isFile()) {
        // Try index.html for SPA fallback
        const fallback = path.join(uiDir, "index.html");
        if (fs.existsSync(fallback)) {
          const content = await fs.promises.readFile(fallback);
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(content);
          return true;
        }
        return false;
      }

      const ext = path.extname(filePath);
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      const content = await fs.promises.readFile(filePath);
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
      return true;
    } catch {
      // File not found — try SPA fallback
      const fallback = path.join(uiDir, "index.html");
      try {
        const content = await fs.promises.readFile(fallback);
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(content);
        return true;
      } catch {
        return false;
      }
    }
  });

  // ─── Gateway RPC methods (for WebSocket access) ───

  api.registerGatewayMethod("clawhq.files.read", async ({ params, respond }) => {
    const filePath = typeof params?.path === "string" ? params.path : "";
    const safe = sanitizePath(filePath);
    if (!safe) { respond(false, undefined, { message: "Invalid path" }); return; }

    const fullPath = path.join(workspaceDir, safe);
    try {
      const content = await fs.promises.readFile(fullPath, "utf-8");
      respond(true, { path: safe, content });
    } catch {
      respond(false, undefined, { message: `File not found: ${safe}` });
    }
  });

  api.registerGatewayMethod("clawhq.files.write", async ({ params, respond }) => {
    const filePath = typeof params?.path === "string" ? params.path : "";
    const content = typeof params?.content === "string" ? params.content : null;
    if (content === null) { respond(false, undefined, { message: "content required" }); return; }

    const safe = sanitizePath(filePath);
    if (!safe) { respond(false, undefined, { message: "Invalid path" }); return; }

    const fullPath = path.join(workspaceDir, safe);
    try {
      await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.promises.writeFile(fullPath, content, "utf-8");
      respond(true, { ok: true, path: safe });
    } catch (err) {
      respond(false, undefined, { message: `Write failed: ${err}` });
    }
  });

  api.registerGatewayMethod("clawhq.files.list", async ({ params, respond }) => {
    const dirPath = typeof params?.path === "string" ? params.path : "";
    const safe = dirPath ? sanitizePath(dirPath) : "";
    if (safe === null) { respond(false, undefined, { message: "Invalid path" }); return; }

    const fullPath = path.join(workspaceDir, safe || "");
    try {
      const entries = await fs.promises.readdir(fullPath, { withFileTypes: true });
      const files = entries.map(e => ({
        name: e.name,
        path: path.join(safe || "", e.name),
        isDir: e.isDirectory(),
      }));
      respond(true, { path: safe || "/", files });
    } catch {
      respond(false, undefined, { message: `Directory not found: ${safe}` });
    }
  });

  // Return only env var NAMES from secrets.env (never values)
  api.registerGatewayMethod("clawhq.env.keys", async ({ respond }) => {
    // Look for secrets.env in common locations relative to workspace
    const candidates = [
      path.join(workspaceDir, "..", "secrets.env"),
      path.join(workspaceDir, "secrets.env"),
      path.join(workspaceDir, ".secrets", "secrets.env"),
    ];
    for (const filePath of candidates) {
      try {
        const content = await fs.promises.readFile(filePath, "utf-8");
        const names = content.split("\n")
          .filter(l => l.includes("=") && !l.startsWith("#") && l.trim())
          .map(l => l.split("=")[0].trim())
          .filter(Boolean);
        respond(true, { names });
        return;
      } catch { continue; }
    }
    respond(true, { names: [] });
  });

  // ─── Skills: list all installed skills with parsed frontmatter ───

  api.registerGatewayMethod("clawhq.skills.list", async ({ respond }) => {
    const homeDir = process.env.HOME || "/root";

    // Skill directories in precedence order (lowest → highest)
    const skillDirs: { source: string; dir: string }[] = [];

    // 1. Bundled skills (find openclaw package)
    const bundledCandidates = [
      path.join(homeDir, ".npm-global/lib/node_modules/openclaw/skills"),
      path.join("/usr/local/lib/node_modules/openclaw/skills"),
      path.join("/usr/lib/node_modules/openclaw/skills"),
    ];
    for (const d of bundledCandidates) {
      if (fs.existsSync(d)) { skillDirs.push({ source: "bundled", dir: d }); break; }
    }

    // 2. Managed/local skills
    const managedDir = path.join(homeDir, ".openclaw/skills");
    if (fs.existsSync(managedDir)) skillDirs.push({ source: "managed", dir: managedDir });

    // 3. Workspace skills
    const workspaceSkillsDir = path.join(workspaceDir, "skills");
    if (fs.existsSync(workspaceSkillsDir)) skillDirs.push({ source: "workspace", dir: workspaceSkillsDir });

    // 4. Extra dirs from config
    const extraDirs = config?.skills?.load?.extraDirs;
    if (Array.isArray(extraDirs)) {
      for (const d of extraDirs) {
        if (typeof d === "string" && fs.existsSync(d)) {
          skillDirs.push({ source: "extra", dir: d });
        }
      }
    }

    // Collect skills (higher precedence overwrites lower)
    const skillMap = new Map<string, any>();

    for (const { source, dir } of skillDirs) {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const skillMdPath = path.join(dir, entry.name, "SKILL.md");
          try {
            const content = await fs.promises.readFile(skillMdPath, "utf-8");
            const parsed = parseSkillFrontmatter(content);
            const name = parsed.name || entry.name;
            const configEntry = config?.skills?.entries?.[entry.name] || config?.skills?.entries?.[name];
            const enabled = configEntry?.enabled !== false;

            const reqs = parsed.metadata?.openclaw?.requires || null;
            const always = parsed.metadata?.openclaw?.always === true;
            const osFilter = parsed.metadata?.openclaw?.os;
            const missing: string[] = [];

            // Check eligibility
            if (!always && reqs) {
              if (reqs.bins) {
                for (const bin of reqs.bins) {
                  if (!binExistsOnPath(bin)) missing.push(`bin: ${bin}`);
                }
              }
              if (reqs.anyBins && reqs.anyBins.length > 0) {
                if (!reqs.anyBins.some((b: string) => binExistsOnPath(b))) {
                  missing.push(`any bin: ${reqs.anyBins.join("|")}`);
                }
              }
              if (reqs.env) {
                for (const envVar of reqs.env) {
                  const inEnv = !!process.env[envVar];
                  const inConfig = !!config?.skills?.entries?.[entry.name]?.env?.[envVar]
                    || !!config?.skills?.entries?.[entry.name]?.apiKey;
                  if (!inEnv && !inConfig) missing.push(`env: ${envVar}`);
                }
              }
              if (reqs.config) {
                for (const cfgPath of reqs.config) {
                  const val = cfgPath.split(".").reduce((o: any, k: string) => o?.[k], config);
                  if (!val) missing.push(`config: ${cfgPath}`);
                }
              }
            }
            if (osFilter && Array.isArray(osFilter) && !osFilter.includes(process.platform)) {
              missing.push(`os: ${osFilter.join("|")} (current: ${process.platform})`);
            }

            const active = enabled && missing.length === 0;

            skillMap.set(entry.name, {
              key: entry.name,
              name,
              description: parsed.description || "",
              source,
              location: skillMdPath,
              enabled,
              active,
              missingRequirements: missing.length > 0 ? missing : null,
              homepage: parsed.metadata?.openclaw?.homepage || parsed.homepage || null,
              emoji: parsed.metadata?.openclaw?.emoji || null,
              requires: parsed.metadata?.openclaw?.requires || null,
              primaryEnv: parsed.metadata?.openclaw?.primaryEnv || null,
              userInvocable: parsed["user-invocable"] !== "false" && parsed["user-invocable"] !== false,
            });
          } catch { /* no SKILL.md */ }
        }
      } catch { /* dir unreadable */ }
    }

    respond(true, { skills: Array.from(skillMap.values()) });
  });

  // ─── Skills: read SKILL.md content ───

  api.registerGatewayMethod("clawhq.skills.read", async ({ params, respond }) => {
    const location = typeof params?.location === "string" ? params.location : "";
    if (!location || !location.endsWith("SKILL.md")) {
      respond(false, undefined, { message: "Invalid skill location" }); return;
    }
    try {
      const content = await fs.promises.readFile(location, "utf-8");
      respond(true, { content });
    } catch {
      respond(false, undefined, { message: `Cannot read: ${location}` });
    }
  });

  log.info("ClawHQ: registered HTTP routes and gateway RPC methods");
}

// ─── SKILL.md frontmatter parser ───

function parseSkillFrontmatter(content: string): Record<string, any> {
  const result: Record<string, any> = {};
  // Match YAML frontmatter between --- delimiters
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return result;

  const fm = match[1];
  // Simple line-by-line YAML parser (handles single-line values + inline JSON for metadata)
  const lines = fm.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const kv = line.match(/^(\w[\w-]*):\s*(.*)/);
    if (kv) {
      const key = kv[1];
      let value: any = kv[2].trim();

      // Check for multi-line JSON (metadata field)
      if (value === "" || value === "{") {
        // Collect continuation lines
        let jsonStr = value;
        i++;
        while (i < lines.length && !lines[i].match(/^(\w[\w-]*):\s/)) {
          jsonStr += "\n" + lines[i];
          i++;
        }
        jsonStr = jsonStr.trim();
        if (jsonStr.startsWith("{")) {
          try { value = JSON.parse(jsonStr); } catch { value = jsonStr; }
        } else {
          value = jsonStr || null;
        }
        continue; // already advanced i
      }

      // Strip quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      // Try inline JSON
      if (value.startsWith("{")) {
        try { value = JSON.parse(value); } catch { /* keep as string */ }
      }
      result[key] = value;
    }
    i++;
  }
  return result;
}
