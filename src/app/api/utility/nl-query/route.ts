import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ALLOWED_TABLES = new Set([
  "draws",
  "playwhe_draws",
  "cashpot_draws",
  "winforlife_draws",
  "pick4_draws"
]);

const SENSITIVE_TABLE_PATTERN =
  /\b(sqlite_master|sqlite_schema|sqlite_temp_master|app_visitor_sessions|user_push_subscriptions|syndicates|syndicate_members|syndicate_tickets|sync_locks|sync_audit_log|saved_slips|consensus_pre_draw_locks|prediction_engine_logs|multi_draw_play_campaigns|community_chat|prediction_audits|pragma)\b/i;

// Lightweight per-isolate rate limiter (10 queries / 60s per IP)
const nlQueryHits = new Map<string, number[]>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const recent = (nlQueryHits.get(ip) || []).filter((ts) => now - ts < windowMs);
  if (recent.length >= 10) {
    nlQueryHits.set(ip, recent);
    return true;
  }
  recent.push(now);
  nlQueryHits.set(ip, recent);
  if (nlQueryHits.size > 200) {
    const firstKey = nlQueryHits.keys().next().value;
    if (firstKey) nlQueryHits.delete(firstKey);
  }
  return false;
}

// Validate SQL safety: strictly read-only SELECT / WITH queries against the 5 official draw tables ONLY
function isSafeSql(sql: string): boolean {
  const trimmed = sql.trim();
  const clean = trimmed.toLowerCase();
  if (!clean.startsWith("select") && !clean.startsWith("with")) {
    return false;
  }
  // Reject multi-statements, comments, recursive CTE DoS, or sensitive/system tables
  if (trimmed.includes(";") || /--|\/\*/.test(trimmed)) return false;
  if (/\bwith\s+recursive\b/i.test(trimmed)) return false;
  if (SENSITIVE_TABLE_PATTERN.test(trimmed)) return false;

  // Prohibited DDL/DML keywords
  const forbiddenPatterns = [
    /\binsert\b/i,
    /\bupdate\b/i,
    /\bdelete\b/i,
    /\bdrop\b/i,
    /\balter\b/i,
    /\bcreate\b/i,
    /\btruncate\b/i,
    /\breplace\b/i,
    /\battach\b/i,
    /\bdetach\b/i,
    /\bexecute\b/i,
    /\bvacuum\b/i
  ];
  if (forbiddenPatterns.some((pattern) => pattern.test(trimmed))) return false;

  // Collect CTE names declared in WITH clauses so FROM/JOIN checks allow CTE references
  const cteNames = new Set<string>();
  const cteRegex = /\b(?:with|,)\s*([a-z_][a-z0-9_]*)\s+as\s*\(/gi;
  let cteMatch: RegExpExecArray | null;
  while ((cteMatch = cteRegex.exec(trimmed)) !== null) {
    cteNames.add(cteMatch[1].toLowerCase());
  }

  // Verify every FROM / JOIN target is strictly an official draw table or declared CTE
  const tableRefRegex = /\b(?:from|join)\s+["'`[]?([a-z_][a-z0-9_]*)["'`\]]?/gi;
  let tblMatch: RegExpExecArray | null;
  let tableCount = 0;
  while ((tblMatch = tableRefRegex.exec(trimmed)) !== null) {
    const tbl = tblMatch[1].toLowerCase();
    tableCount++;
    if (!ALLOWED_TABLES.has(tbl) && !cteNames.has(tbl)) {
      return false;
    }
  }
  return tableCount > 0;
}

const DB_SCHEMA_PROMPT = `
You are an expert SQL engineer and quantitative lottery database specialist for the Trinidad & Tobago NLCB lottery system.
The database is SQLite (Turso Cloud LibSQL).

TABLE SCHEMAS:
1. draws (Lotto Plus - 5 of 35 + Powerball 1-10):
   - id INTEGER PRIMARY KEY
   - draw_number INTEGER UNIQUE
   - draw_date TEXT (YYYY-MM-DD)
   - num1 INTEGER (1-35)
   - num2 INTEGER (1-35)
   - num3 INTEGER (1-35)
   - num4 INTEGER (1-35)
   - num5 INTEGER (1-35)
   - powerball INTEGER (1-10)
   - multiplier TEXT (e.g. '1x', '2x')
   - jackpot TEXT (e.g. '$4,500,000')

2. playwhe_draws (Play Whe - 1 of 36, 4 daily draws):
   - id INTEGER PRIMARY KEY
   - draw_number INTEGER UNIQUE
   - draw_date TEXT (YYYY-MM-DD)
   - draw_time_slot TEXT ('Morning', 'Midday', 'Afternoon', 'Evening')
   - winning_number INTEGER (1-36)
   - mark_name TEXT (e.g. 'Centipede', 'Small Dog', 'Carib Cat', 'Dead Man', 'Big Snake', etc.)

3. cashpot_draws (Cash Pot - 5 of 20 + Multiplier):
   - id INTEGER PRIMARY KEY
   - draw_number INTEGER UNIQUE
   - draw_date TEXT (YYYY-MM-DD)
   - num1 INTEGER (1-20)
   - num2 INTEGER (1-20)
   - num3 INTEGER (1-20)
   - num4 INTEGER (1-20)
   - num5 INTEGER (1-20)
   - multiplier INTEGER (1-5)
   - jackpot TEXT

4. winforlife_draws (Win For Life - 6 of 28 + Cash Ball 1-3):
   - id INTEGER PRIMARY KEY
   - draw_number INTEGER UNIQUE
   - draw_date TEXT (YYYY-MM-DD)
   - num1 INTEGER (1-28)
   - num2 INTEGER (1-28)
   - num3 INTEGER (1-28)
   - num4 INTEGER (1-28)
   - num5 INTEGER (1-28)
   - num6 INTEGER (1-28)
   - cash_ball INTEGER (1-3)
   - jackpot TEXT

5. pick4_draws (Pick 4 - 4 digits 0-9 each):
   - id INTEGER PRIMARY KEY
   - draw_number INTEGER UNIQUE
   - draw_date TEXT (YYYY-MM-DD)
   - draw_time_slot TEXT ('Morning', 'Midday', 'Afternoon', 'Evening')
   - digit1 INTEGER (0-9)
   - digit2 INTEGER (0-9)
   - digit3 INTEGER (0-9)
   - digit4 INTEGER (0-9)

TASK:
Convert the user's natural language request into a valid, highly optimized, read-only SQLite query.
Return STRICT JSON ONLY in this format:
{
  "sql": "SELECT ...",
  "explanation": "One or two sentences explaining what the query computes.",
  "title": "Short title describing the result"
}
RULES:
1. Output ONLY valid JSON with no markdown backticks, no markdown fence.
2. Read-only queries only. Never use INSERT, UPDATE, DELETE, DROP, ALTER, CREATE.
3. Always include LIMIT (maximum 50 rows) if the user did not specify a small limit.
4. Use standard SQLite functions. For sum of drawn balls, use (num1 + num2 + num3 + num4 + num5).
5. Sequence does not matter for multi-ball games. To find if a number appeared in Lotto Plus, use (num1 = ? OR num2 = ? OR num3 = ? OR num4 = ? OR num5 = ?).
`;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Please wait a minute before running more AI queries." },
        { status: 429, headers: { "Cache-Control": "no-store" } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const queryText = String(body.query || "").trim();
    const customApiKey = body.apiKey || null;

    if (!queryText) {
      return NextResponse.json({ success: false, error: "Please provide a query." }, { status: 400 });
    }
    if (queryText.length > 500) {
      return NextResponse.json({ success: false, error: "Query is too long (maximum 500 characters)." }, { status: 400 });
    }

    const apiKey = customApiKey || process.env.GEMINI_API_KEY || null;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "Google Gemini API key is not configured in environment or provided in request."
      }, { status: 500 });
    }

    const client = new GoogleGenAI({ apiKey });

    // 1. Generate SQL from Natural Language with Gemini
    let sqlGenerationPrompt = `${DB_SCHEMA_PROMPT}\n\nUser Question:\n"${queryText}"\n\nGenerate the JSON output:`;
    
    let generatedRaw = "";
    let usedModel = "gemini-2.5-flash";

    try {
      const resp = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: sqlGenerationPrompt,
      });
      generatedRaw = resp.text || "";
    } catch (err: any) {
      console.warn("[gemini-2.5-flash failed, trying gemini-3.8-flash]:", err.message);
      const fallbackResp = await client.models.generateContent({
        model: "gemini-3.8-flash",
        contents: sqlGenerationPrompt,
      });
      generatedRaw = fallbackResp.text || "";
      usedModel = "gemini-3.8-flash";
    }

    // Clean JSON response (strip markdown wrappers if any)
    let cleanJsonStr = generatedRaw.trim();
    if (cleanJsonStr.startsWith("```json")) {
      cleanJsonStr = cleanJsonStr.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleanJsonStr.startsWith("```")) {
      cleanJsonStr = cleanJsonStr.replace(/^```/, "").replace(/```$/, "").trim();
    }

    let parsedResult: { sql: string; explanation: string; title: string };
    try {
      parsedResult = JSON.parse(cleanJsonStr);
    } catch (parseErr) {
      console.error("Failed to parse JSON from Gemini:", cleanJsonStr);
      // Fallback regex extraction of SQL
      const sqlMatch = generatedRaw.match(/select[\s\S]+?(?=;|\n\n|"|$)/i);
      if (sqlMatch) {
        parsedResult = {
          sql: sqlMatch[0].trim(),
          explanation: "Generated SQL query based on your request.",
          title: "Database Query Result"
        };
      } else {
        return NextResponse.json({
          success: false,
          error: "Could not formulate a valid SQL query for this question. Please try rephrasing."
        }, { status: 422 });
      }
    }

    let sqlToExecute = parsedResult.sql.trim();
    if (sqlToExecute.endsWith(";")) {
      sqlToExecute = sqlToExecute.slice(0, -1);
    }

    // Enforce safety
    if (!isSafeSql(sqlToExecute)) {
      return NextResponse.json({
        success: false,
        error: "The generated query contains unsafe or non-read-only operations. Execution blocked for security."
      }, { status: 403 });
    }

    // Ensure safe LIMIT (strictly capped at <= 100 rows)
    const limitMatch = sqlToExecute.match(/\blimit\s+(\d+)/i);
    if (!limitMatch) {
      sqlToExecute += " LIMIT 50";
    } else if (parseInt(limitMatch[1], 10) > 100) {
      sqlToExecute = sqlToExecute.replace(/\blimit\s+\d+/gi, "LIMIT 100");
    }

    // 2. Execute SQL query on Turso DB
    const dbExecutionStart = Date.now();
    const queryResult = await db.execute({ sql: sqlToExecute, args: [] });
    const dbLatencyMs = Date.now() - dbExecutionStart;

    const columns = queryResult.columns || [];
    const rows = queryResult.rows.map((row: any) => {
      const obj: Record<string, any> = {};
      columns.forEach((col: string, idx: number) => {
        obj[col] = row[idx];
      });
      return obj;
    });

    // 3. Formulate Natural Language Statistical Insights
    let synthesisPrompt = `
You are a Quantitative Analyst for the Trinidad & Tobago NLCB lottery database.
The user asked: "${queryText}"

Executed SQL:
\`\`\`sql
${sqlToExecute}
\`\`\`

Query returned ${rows.length} rows. Here is a summary of the data:
${JSON.stringify(rows.slice(0, 15), null, 2)}

TASK:
Provide a concise, quantitative statistical interpretation of these results in 2-4 sentences.
Highlight key patterns, anomalies, highest frequencies, or notable facts relevant to Trinidad lottery players.
Do not use technical jargon; make it insightful, punchy, and clear.`;

    let synthesisText = "";
    try {
      const synthResp = await client.models.generateContent({
        model: usedModel,
        contents: synthesisPrompt,
      });
      synthesisText = synthResp.text || "";
    } catch (synthErr) {
      console.warn("Synthesis generation warning:", synthErr);
      synthesisText = parsedResult.explanation || `Query completed successfully returning ${rows.length} records.`;
    }

    const totalDurationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      query: queryText,
      sql: sqlToExecute,
      title: parsedResult.title || "Query Results",
      explanation: parsedResult.explanation,
      analysis: synthesisText,
      columns,
      rows,
      rowCount: rows.length,
      metrics: {
        totalDurationMs,
        dbLatencyMs,
        model: usedModel
      }
    });

  } catch (error: any) {
    console.error("[API /api/utility/nl-query Error]:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "An unexpected error occurred while executing the database query."
    }, { status: 500 });
  }
}
