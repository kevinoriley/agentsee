import { readFileSync } from "fs";
import { join } from "path";
import { createHmac, timingSafeEqual } from "crypto";
import { Request, Response, NextFunction } from "express";
import type { IncomingMessage } from "http";

const TOKEN_FILE = join(
  process.env.HOME ?? "/root",
  ".config",
  "agentsee",
  "auth-token"
);

const COOKIE_NAME = "agentsee_session";
const COOKIE_MAX_AGE = 86400; // 24 hours

/** Load the auth token from disk. Returns null if no token file. */
export function loadToken(): string | null {
  try {
    const token = readFileSync(TOKEN_FILE, "utf-8").trim();
    return token || null;
  } catch {
    return null;
  }
}

/** Constant-time string comparison. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Create an HMAC-signed session cookie value. */
function makeSessionCookie(token: string): string {
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", token).update(ts).digest("hex");
  return `${ts}.${sig}`;
}

/** Verify a session cookie value. Returns true if valid and not expired. */
function verifySessionCookie(cookie: string, token: string): boolean {
  const dot = cookie.indexOf(".");
  if (dot === -1) return false;
  const ts = cookie.slice(0, dot);
  const sig = cookie.slice(dot + 1);
  const age = Math.floor(Date.now() / 1000) - parseInt(ts, 10);
  if (isNaN(age) || age < 0 || age > COOKIE_MAX_AGE) return false;
  const expected = createHmac("sha256", token).update(ts).digest("hex");
  return safeEqual(sig, expected);
}

/** Parse a specific cookie from a cookie header string. */
function parseCookie(header: string, name: string): string | null {
  for (const part of header.split(";")) {
    const [k, ...rest] = part.split("=");
    if (k.trim() === name) return rest.join("=").trim();
  }
  return null;
}

/** Check if a request is authenticated (Bearer token or session cookie). */
export function isAuthenticated(
  req: Request | IncomingMessage,
  token: string
): boolean {
  const headers = req.headers;

  // Check Bearer token
  const auth = headers.authorization ?? "";
  if (auth.startsWith("Bearer ")) {
    const candidate = auth.slice(7).trim();
    if (safeEqual(candidate, token)) return true;
  }

  // Check session cookie
  const cookieHeader = headers.cookie ?? "";
  if (cookieHeader) {
    const session = parseCookie(cookieHeader, COOKIE_NAME);
    if (session && verifySessionCookie(session, token)) return true;
  }

  // Check query param (for WebSocket connections)
  const url = new URL(req.url ?? "/", "http://localhost");
  const qToken = url.searchParams.get("token");
  if (qToken && safeEqual(qToken, token)) return true;

  return false;
}

/** Login page HTML. */
const LOGIN_HTML = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>agentsee - Login</title>
<style>
  body { background: #0d1117; color: #c9d1d9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 32px; width: 320px; }
  h1 { font-size: 18px; margin: 0 0 16px; }
  input { width: 100%; box-sizing: border-box; background: #0d1117; border: 1px solid #30363d; color: #c9d1d9; padding: 8px 12px; border-radius: 4px; font-size: 14px; margin-bottom: 12px; font-family: monospace; }
  button { width: 100%; background: #238636; border: none; color: #fff; padding: 8px; border-radius: 4px; font-size: 14px; cursor: pointer; font-weight: 600; }
  button:hover { background: #2ea043; }
  .error { color: #f85149; font-size: 12px; margin-bottom: 8px; display: none; }
</style></head>
<body><div class="card">
  <h1>agentsee</h1>
  <div class="error" id="err">Invalid token.</div>
  <form method="POST" action="/login">
    <input type="password" name="token" placeholder="Paste auth token" autofocus required>
    <button type="submit">Log in</button>
  </form>
</div>
<script>if(location.search.includes("fail"))document.getElementById("err").style.display="block"</script>
</body></html>`;

/**
 * Create Express auth middleware + login routes.
 * If token is null, returns a no-op middleware (no auth required).
 */
export function createAuthMiddleware(token: string | null) {
  return {
    /** Middleware that protects all routes except /login and /hook/*. */
    protect(req: Request, res: Response, next: NextFunction): void {
      // No token = no auth required
      if (!token) {
        next();
        return;
      }

      // Always allow hook and MCP endpoints (agents authenticate via their own config)
      if (req.path.startsWith("/hook/") || req.path.startsWith("/mcp")) {
        next();
        return;
      }

      // Always allow login page
      if (req.path === "/login") {
        next();
        return;
      }

      if (isAuthenticated(req, token)) {
        next();
        return;
      }

      // API requests get 401
      if (
        req.path.startsWith("/agent/") ||
        req.path.startsWith("/mcp") ||
        req.path === "/health"
      ) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }

      // Browser requests get redirected to login
      res.redirect("/login");
    },

    /** Login page GET handler. */
    loginPage(_req: Request, res: Response): void {
      if (!token) {
        res.redirect("/");
        return;
      }
      res.type("html").send(LOGIN_HTML);
    },

    /** Login POST handler. */
    loginSubmit(req: Request, res: Response): void {
      if (!token) {
        res.redirect("/");
        return;
      }

      // Parse form body (token field)
      const candidate =
        typeof req.body === "string"
          ? req.body
          : req.body?.token ?? "";

      if (safeEqual(String(candidate).trim(), token)) {
        const cookie = makeSessionCookie(token);
        res.setHeader(
          "Set-Cookie",
          `${COOKIE_NAME}=${cookie}; HttpOnly; SameSite=Strict; Max-Age=${COOKIE_MAX_AGE}; Path=/`
        );
        res.redirect("/");
      } else {
        res.redirect("/login?fail");
      }
    },
  };
}
