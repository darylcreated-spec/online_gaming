# 🛡️ Cloudflare Worker Edge Relay (Plan C Scraper Fallback)

This Cloudflare Worker serves as your **zero-cost, infinite-credit Plan C fallback proxy** for scraping NLCB lottery results (`nlcbplaywhelotto.com` and other protected endpoints).

### Why It Works
* Cloudflare Workers run on Cloudflare's own global Anycast edge network (`AS13335`).
* When the Worker fetches `www.nlcbplaywhelotto.com`, the request originates from **inside Cloudflare's own network**, bypassing the datacenter IP blocks that trigger Cloudflare WAF HTTP 403 Forbidden.
* **Cost**: $0.00 (Cloudflare's free plan includes **100,000 requests per day**).

---

## 🚀 How to Deploy in 60 Seconds

### Option A: Via Cloudflare Web Dashboard (No CLI needed)
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com/) and sign in (or create a free account).
2. On the left sidebar, click **Workers & Pages** -> **Create application** -> **Create Worker**.
3. Name it `nlcb-edge-proxy` and click **Deploy**.
4. Click **Edit code**.
5. Paste the entire code from [`worker.js`](worker.js) into the editor.
6. Click **Deploy** at the top right.
7. Copy your Worker URL (e.g., `https://nlcb-edge-proxy.<your-subdomain>.workers.dev`).

### Option B: Via Command Line (Wrangler)
In this directory (`cloudflare-worker/`), run:
```bash
npx wrangler deploy
```

---

## 🔗 Connect to the App

Once deployed, add your Worker URL to your `.env.local` file and to your Vercel Project Environment Variables:

```env
CLOUDFLARE_WORKER_PROXY_URL="https://nlcb-edge-proxy.<your-subdomain>.workers.dev"
```

### Verification
You can test that your Worker is running by visiting:
```
https://nlcb-edge-proxy.<your-subdomain>.workers.dev/health
```
It should return:
```json
{"status":"ok","service":"NLCB Edge Proxy Relay","edgeNetwork":"Cloudflare Workers"}
```
