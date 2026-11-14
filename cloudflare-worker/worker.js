/**
 * Cloudflare Worker: Zero-Cost NLCB Scraping & Edge Relay (Plan C)
 *
 * Security hardened:
 * - Restricts proxying to an explicit NLCB & mirror hostname allowlist (prevents open SSRF)
 * - Supports optional PROXY_SECRET Worker secret checked via X-Proxy-Key header
 *
 * Free Quota: 100,000 requests/day (100% free forever).
 */

const ALLOWED_HOSTS = new Set([
  "www.nlcbplaywhelotto.com",
  "nlcbplaywhelotto.com",
  "nlcblottoresult.com",
  "www.nlcblottoresult.com",
  "nlcbgames.com",
  "www.nlcbgames.com",
  "backend-production-412b.up.railway.app"
]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Health check & status (public metadata only)
    if (url.pathname === "/health" || url.pathname === "/status") {
      return new Response(JSON.stringify({
        status: "ok",
        service: "NLCB Edge Proxy Relay",
        edgeNetwork: "Cloudflare Workers",
        timestamp: new Date().toISOString()
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // 2. Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-Proxy-Key"
        }
      });
    }

    // 3. Optional shared secret check (configure PROXY_SECRET in Cloudflare Worker settings)
    const configuredSecret = env && typeof env.PROXY_SECRET === "string" ? env.PROXY_SECRET.trim() : "";
    if (configuredSecret) {
      const incomingKey = (request.headers.get("x-proxy-key") || "").trim();
      if (incomingKey !== configuredSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized relay key" }), {
          status: 401,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    // 4. Extract & validate target URL against strict hostname allowlist (anti-SSRF)
    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) {
      return new Response(JSON.stringify({
        error: "Missing required ?url= parameter",
        example: "/?url=https://www.nlcbplaywhelotto.com/nlcb-play-whe-results/"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    let parsedTarget;
    try {
      parsedTarget = new URL(targetUrl);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid target URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    if (parsedTarget.protocol !== "https:" || !ALLOWED_HOSTS.has(parsedTarget.hostname.toLowerCase())) {
      return new Response(JSON.stringify({
        error: "Forbidden: target host is not in the NLCB allowlist"
      }), {
        status: 403,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    try {
      const forwardHeaders = new Headers();
      forwardHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36");
      forwardHeaders.set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8");
      forwardHeaders.set("Accept-Language", "en-US,en;q=0.9");
      forwardHeaders.set("Cache-Control", "no-cache");
      forwardHeaders.set("Pragma", "no-cache");

      const incomingContentType = request.headers.get("content-type");
      if (incomingContentType) {
        forwardHeaders.set("Content-Type", incomingContentType);
      }

      const fetchOptions = {
        method: request.method,
        headers: forwardHeaders,
        redirect: "follow"
      };

      if (request.method === "POST") {
        fetchOptions.body = await request.text();
      }

      const response = await fetch(parsedTarget.toString(), fetchOptions);
      const responseBody = await response.text();

      return new Response(responseBody, {
        status: response.status,
        headers: {
          "Content-Type": response.headers.get("content-type") || "text/html; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "X-Proxied-By": "Cloudflare-Worker-Plan-C"
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({
        error: "Proxy request failed",
        message: err.message
      }), {
        status: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  },

  /**
   * Free-tier Cloudflare Worker Cron Trigger (100,000 req/day free forever).
   * Configure Worker Secrets/Vars: SYNC_TARGET_URL (e.g. https://your-app.vercel.app)
   * and CRON_SECRET matching your Vercel CRON_SECRET.
   */
  async scheduled(event, env, ctx) {
    const baseUrl = env && typeof env.SYNC_TARGET_URL === "string" ? env.SYNC_TARGET_URL.trim().replace(/\/+$/, "") : "";
    const cronSecret = env && typeof env.CRON_SECRET === "string" ? env.CRON_SECRET.trim() : "";

    if (!baseUrl || !cronSecret) {
      console.log("[CF Cron] Skipping scheduled sync: SYNC_TARGET_URL or CRON_SECRET not configured in Worker env.");
      return;
    }

    const syncUrl = `${baseUrl}/api/cron/sync-all`;
    ctx.waitUntil(
      fetch(syncUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${cronSecret}`,
          "User-Agent": "Cloudflare-Worker-Cron/1.0"
        },
        body: JSON.stringify({ force: false })
      })
        .then(async (res) => {
          const text = await res.text().catch(() => "");
          console.log(`[CF Cron] Triggered ${syncUrl} -> HTTP ${res.status}: ${text.slice(0, 200)}`);
        })
        .catch((err) => {
          console.error("[CF Cron] Dispatch failed:", err.message);
        })
    );
  }
};
