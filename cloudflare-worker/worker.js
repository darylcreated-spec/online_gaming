/**
 * Cloudflare Worker: Zero-Cost NLCB Scraping & Edge Relay (Plan C)
 * 
 * Why this works:
 * Cloudflare Workers run on Cloudflare's global edge network (AS13335).
 * When fetching nlcbplaywhelotto.com or nlcbgames.com from within Cloudflare's
 * own network, Cloudflare WAF does not block requests with datacenter 403 Forbidden.
 * 
 * Free Quota: 100,000 requests/day (100% free forever).
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Health check & status
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

    // 2. Extract target URL from ?url= parameter
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

    // 3. Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "*"
        }
      });
    }

    try {
      // 4. Construct modern browser headers
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

      // 5. Forward request (GET or POST)
      const fetchOptions = {
        method: request.method,
        headers: forwardHeaders,
        redirect: "follow"
      };

      if (request.method === "POST") {
        fetchOptions.body = await request.text();
      }

      const response = await fetch(targetUrl, fetchOptions);
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
  }
};
