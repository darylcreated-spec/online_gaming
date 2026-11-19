import { NextRequest, NextResponse } from "next/server";
import { db, query } from "@/lib/db";

export const dynamic = "force-dynamic";

async function ensureVisitorTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS app_visitor_sessions (
      visitor_id TEXT PRIMARY KEY,
      display_name TEXT,
      country TEXT,
      city TEXT,
      region TEXT,
      device_type TEXT,
      browser TEXT,
      os TEXT,
      last_tab TEXT DEFAULT 'welcome',
      visit_count INTEGER DEFAULT 1,
      first_seen TEXT DEFAULT CURRENT_TIMESTAMP,
      last_seen TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(() => {});
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_visitors_last_seen ON app_visitor_sessions(last_seen)`
  ).catch(() => {});
}

function parseUserAgent(ua: string): { device_type: string; browser: string; os: string } {
  const s = ua || "";
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(s);
  const isTablet = /iPad|Tablet/i.test(s);
  const device_type = isTablet ? "Tablet" : isMobile ? "Mobile" : "Desktop";

  let os = "Unknown OS";
  if (/Windows NT/i.test(s)) os = "Windows";
  else if (/iPhone|iPad|iPod/i.test(s)) os = "iOS";
  else if (/Android/i.test(s)) os = "Android";
  else if (/Mac OS X/i.test(s)) os = "macOS";
  else if (/Linux/i.test(s)) os = "Linux";

  let browser = "Browser";
  if (/Edg\//i.test(s)) browser = "Edge";
  else if (/Chrome\//i.test(s) && !/Chromium/i.test(s)) browser = "Chrome";
  else if (/Safari\//i.test(s) && !/Chrome/i.test(s)) browser = "Safari";
  else if (/Firefox\//i.test(s)) browser = "Firefox";

  return { device_type, browser, os };
}

export async function POST(request: NextRequest) {
  try {
    await ensureVisitorTable();
    const body = await request.json().catch(() => ({}));
    const visitorId = String(body.visitorId || "").trim().slice(0, 64);
    if (!visitorId) {
      return NextResponse.json({ success: false, error: "visitorId required" }, { status: 400 });
    }

    const displayName = body.displayName ? String(body.displayName).trim().slice(0, 50) : null;
    const lastTab = String(body.activeTab || "welcome").trim().slice(0, 40);
    const isNewSession = Boolean(body.isNewSession);

    const country = request.headers.get("x-vercel-ip-country") || "Local / Unknown";
    const cityRaw = request.headers.get("x-vercel-ip-city") || "";
    const city = cityRaw ? decodeURIComponent(cityRaw) : "Unknown";
    const region = request.headers.get("x-vercel-ip-country-region") || "";
    const ua = request.headers.get("user-agent") || "";
    const parsed = parseUserAgent(ua);

    await db.execute({
      sql: `INSERT INTO app_visitor_sessions (
              visitor_id, display_name, country, city, region,
              device_type, browser, os, last_tab, visit_count, first_seen, last_seen
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
            ON CONFLICT(visitor_id) DO UPDATE SET
              display_name = COALESCE(excluded.display_name, app_visitor_sessions.display_name),
              country = CASE WHEN excluded.country != 'Local / Unknown' THEN excluded.country ELSE app_visitor_sessions.country END,
              city = CASE WHEN excluded.city != 'Unknown' THEN excluded.city ELSE app_visitor_sessions.city END,
              region = CASE WHEN excluded.region != '' THEN excluded.region ELSE app_visitor_sessions.region END,
              device_type = excluded.device_type,
              browser = excluded.browser,
              os = excluded.os,
              last_tab = excluded.last_tab,
              visit_count = app_visitor_sessions.visit_count + ?,
              last_seen = datetime('now')`,
      args: [
        visitorId,
        displayName,
        country,
        city,
        region,
        parsed.device_type,
        parsed.browser,
        parsed.os,
        lastTab,
        isNewSession ? 1 : 0
      ]
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await ensureVisitorTable();

    const [
      activeNowRows,
      todayRows,
      weekRows,
      totalRows,
      recentVisitors,
      tabBreakdown,
      countryBreakdown,
      syndicateMembers,
      pushSubRows
    ] = await Promise.all([
      query<any>(
        "SELECT COUNT(*) as cnt FROM app_visitor_sessions WHERE last_seen >= datetime('now', '-5 minutes')"
      ).catch(() => [{ cnt: 0 }]),
      query<any>(
        "SELECT COUNT(*) as cnt FROM app_visitor_sessions WHERE last_seen >= datetime('now', '-1 day')"
      ).catch(() => [{ cnt: 0 }]),
      query<any>(
        "SELECT COUNT(*) as cnt FROM app_visitor_sessions WHERE last_seen >= datetime('now', '-7 days')"
      ).catch(() => [{ cnt: 0 }]),
      query<any>(
        "SELECT COUNT(*) as cnt, COALESCE(SUM(visit_count), 0) as total_visits FROM app_visitor_sessions"
      ).catch(() => [{ cnt: 0, total_visits: 0 }]),
      query<any>(
        "SELECT * FROM app_visitor_sessions ORDER BY last_seen DESC LIMIT 50"
      ).catch(() => []),
      query<any>(
        "SELECT last_tab, COUNT(*) as cnt FROM app_visitor_sessions GROUP BY last_tab ORDER BY cnt DESC LIMIT 10"
      ).catch(() => []),
      query<any>(
        "SELECT country, COUNT(*) as cnt FROM app_visitor_sessions GROUP BY country ORDER BY cnt DESC LIMIT 10"
      ).catch(() => []),
      query<any>(
        "SELECT member_name, role, contribution_amount, joined_at FROM syndicate_members ORDER BY id DESC LIMIT 25"
      ).catch(() => []),
      query<any>(
        "SELECT COUNT(*) as cnt FROM user_push_subscriptions"
      ).catch(() => [{ cnt: 0 }])
    ]);

    return NextResponse.json(
      {
        success: true,
        summary: {
          activeNow: Number(activeNowRows?.[0]?.cnt || 0),
          last24Hours: Number(todayRows?.[0]?.cnt || 0),
          last7Days: Number(weekRows?.[0]?.cnt || 0),
          totalUniqueVisitors: Number(totalRows?.[0]?.cnt || 0),
          totalSessions: Number(totalRows?.[0]?.total_visits || 0),
          pushSubscribers: Number(pushSubRows?.[0]?.cnt || 0),
          namedSyndicateMembers: (syndicateMembers || []).length
        },
        recentVisitors: recentVisitors || [],
        tabBreakdown: tabBreakdown || [],
        countryBreakdown: countryBreakdown || [],
        syndicateMembers: syndicateMembers || []
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate"
        }
      }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
