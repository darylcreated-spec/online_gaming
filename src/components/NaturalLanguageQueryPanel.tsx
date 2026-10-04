"use client";

import React, { useState, useEffect } from "react";
import {
  Database,
  Search,
  Terminal,
  Sparkles,
  Table,
  Bot,
  Copy,
  Check,
  Send,
  CornerDownLeft,
  RefreshCw,
  Play,
  Filter,
  Activity,
  Flame,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Code2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Hash,
  SlidersHorizontal,
  ArrowRight
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

interface QueryResult {
  success: boolean;
  query: string;
  sql: string;
  title: string;
  explanation: string;
  analysis: string;
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  metrics: {
    totalDurationMs: number;
    dbLatencyMs: number;
    model: string;
  };
  error?: string;
}

const PRESET_QUERIES = [
  {
    category: "Lotto Plus",
    label: "Top 5 most frequent numbers",
    prompt: "Show me the top 5 most frequent winning numbers in Lotto Plus history with their counts",
  },
  {
    category: "Lotto Plus",
    label: "Draws with sum between 90 & 110",
    prompt: "Show the last 10 Lotto Plus draws where the sum of the main 5 balls was between 90 and 110",
  },
  {
    category: "Lotto Plus",
    label: "Powerball frequency ranking",
    prompt: "Show all Powerball numbers 1 through 10 ordered by historical draw frequency",
  },
  {
    category: "Lotto Plus",
    label: "Draws with consecutive pairs",
    prompt: "Show recent Lotto Plus draws where two consecutive numbers were drawn together (e.g. 14 and 15)",
  },
  {
    category: "Cash Pot",
    label: "Top 5 most frequent Cash Pot balls",
    prompt: "What are the 5 most frequently drawn winning numbers in Cash Pot 5/20?",
  },
  {
    category: "Cash Pot",
    label: "Cash Pot draws with 5X Multiplier",
    prompt: "Show all Cash Pot draws that had a 5X multiplier",
  },
  {
    category: "Cash Pot",
    label: "Sum manifold distribution in Cash Pot",
    prompt: "Show the last 10 Cash Pot draws with their sum calculated",
  },
  {
    category: "Play Whe",
    label: "Morning slot top marks",
    prompt: "Show the top 5 Play Whe winning marks for the Morning time slot with their frequency",
  },
  {
    category: "Play Whe",
    label: "Last 10 draws of Mark 14 (Money Mover)",
    prompt: "Find the last 10 draws where Play Whe winning number was 14",
  },
  {
    category: "Play Whe",
    label: "Evening draw trends",
    prompt: "What are the top 5 most frequent winning numbers drawn in the Evening slot (7:00 PM)?",
  },
  {
    category: "Play Whe",
    label: "Marks drawn in the last 7 days",
    prompt: "Show all Play Whe draws from the last 7 calendar days ordered by draw date and slot",
  },
  {
    category: "Pick 4",
    label: "Consecutive identical digits",
    prompt: "Show all Pick 4 draws where at least two consecutive digits were identical",
  },
  {
    category: "Pick 4",
    label: "Pick 4 sums equal to 18",
    prompt: "Show all Pick 4 draws where the sum of the 4 digits equals exactly 18",
  },
  {
    category: "Pick 4",
    label: "Digit 7 frequency across all 4 positions",
    prompt: "Show Pick 4 draws where digit 7 appeared in any position",
  },
  {
    category: "Win For Life",
    label: "Draws where Cash Ball was 3",
    prompt: "Show the most recent 10 Win For Life draws where the Cash Ball was 3",
  },
  {
    category: "Win For Life",
    label: "Top 6 main balls in Win For Life",
    prompt: "What are the top 6 most drawn main numbers in Win For Life 6/28?",
  },
];

export default function NaturalLanguageQueryPanel() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSql, setShowSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("All");

  const categories = ["All", "Lotto Plus", "Play Whe", "Cash Pot", "Win For Life", "Pick 4"];

  const filteredPresets = activeCategoryFilter === "All"
    ? PRESET_QUERIES
    : PRESET_QUERIES.filter(p => p.category === activeCategoryFilter);

  const executeQuery = async (queryText: string) => {
    if (!queryText.trim() || loading) return;

    triggerHaptic("light");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/utility/nl-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText.trim() })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to process query");
      }

      setResult(data);
      triggerHaptic("success");
    } catch (err: any) {
      console.error("NL Query Error:", err);
      setError(err.message || "Failed to query the database. Please try rephrasing your question.");
      triggerHaptic("warning");
    } finally {
      setLoading(false);
    }
  };

  const handleCopySql = () => {
    if (!result?.sql) return;
    navigator.clipboard.writeText(result.sql);
    setCopiedSql(true);
    triggerHaptic("light");
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-6 font-mono">
      {/* 1. Header Hero Card */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-cyan-500/20 bg-slate-950/80 backdrop-blur-xl relative overflow-hidden shadow-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)] shrink-0">
              <Database className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black uppercase text-white tracking-wide flex items-center gap-2">
                  <span>Natural Language Database Query</span>
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-400/30">
                  Turso LibSQL + Gemini
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Ask questions in plain English across all 5 NLCB lottery games. Queries are translated to safe SQL and verified against live database records.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-gray-300">
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Read-Only Shield Active</span>
            </span>
          </div>
        </div>

        {/* Category Pills & Preset Queries */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 font-bold flex items-center gap-1.5 uppercase text-[10px]">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Quick Query Templates:
            </span>
            <div className="flex items-center gap-1 overflow-x-auto sleek-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategoryFilter(cat);
                    triggerHaptic("selection");
                  }}
                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase transition cursor-pointer shrink-0 ${
                    activeCategoryFilter === cat
                      ? "bg-cyan-500 text-slate-950 font-black shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                      : "bg-slate-900/80 text-gray-400 hover:text-white border border-white/5"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {filteredPresets.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPrompt(item.prompt);
                  executeQuery(item.prompt);
                }}
                disabled={loading}
                className="text-left px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-cyan-950/40 border border-white/10 hover:border-cyan-400/40 text-xs text-gray-300 hover:text-cyan-200 transition cursor-pointer flex items-center gap-2 group disabled:opacity-50"
              >
                <Search className="w-3 h-3 text-cyan-400/70 group-hover:text-cyan-300 shrink-0" />
                <span className="line-clamp-1">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Interactive Search & Input Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 bg-slate-950/90 shadow-xl space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeQuery(prompt);
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Terminal className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400" />
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask anything, e.g. 'Show me the last 5 Lotto Plus draws' or 'Which mark hits most in Evening Play Whe?'..."
              disabled={loading}
              className="w-full bg-black/60 border border-white/15 focus:border-cyan-400 rounded-xl pl-10 pr-10 py-3 text-xs sm:text-sm text-white placeholder-gray-500 font-mono focus:outline-none transition-all shadow-inner"
            />
            {prompt && (
              <button
                type="button"
                onClick={() => setPrompt("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs px-1"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.35)] disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Querying...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-slate-950" />
                <span>Execute Query</span>
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-between text-[10px] text-gray-500 px-1">
          <span className="flex items-center gap-1">
            <CornerDownLeft className="w-3 h-3 text-gray-600" />
            Press <strong>Enter</strong> to run query
          </span>
          <span>Supports: Play Whe, Lotto Plus, Cash Pot, Win For Life, Pick 4</span>
        </div>
      </div>

      {/* 3. Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-3 backdrop-blur-md">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wider block">Query Execution Error</span>
            <p className="text-gray-300 text-xs leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* 4. Results Display */}
      {result && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* Card A: AI Statistical Synthesis */}
          <div className="glass-panel p-5 rounded-2xl border border-cyan-500/30 bg-slate-950/90 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-400/30 text-cyan-300">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wide">
                    {result.title || "Statistical Analysis & Findings"}
                  </h3>
                  <span className="text-[10px] text-gray-400">
                    Natural Language Synthesis • {result.metrics?.model || "Gemini Flash"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                  {result.rowCount} Rows Found
                </span>
                <span className="px-2.5 py-1 rounded-md bg-black/40 text-gray-400 border border-white/10 text-[10px] font-mono">
                  {result.metrics?.totalDurationMs || 0}ms
                </span>
              </div>
            </div>

            {/* Analysis Text */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-xs text-gray-200 leading-relaxed whitespace-pre-line font-sans">
              {result.analysis}
            </div>

            {/* Collapsible SQL Inspector */}
            <div className="border-t border-white/5 pt-3">
              <button
                onClick={() => setShowSql(!showSql)}
                className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-cyan-300 transition py-1 cursor-pointer"
              >
                <span className="flex items-center gap-1.5 font-bold uppercase text-[10px]">
                  <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Inspect Executed SQL Query</span>
                </span>
                <span className="flex items-center gap-1 text-[10px]">
                  {showSql ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </button>

              {showSql && (
                <div className="mt-2.5 p-3 rounded-xl bg-black/80 border border-cyan-500/20 space-y-2 relative group">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <span className="text-[10px] text-gray-500 font-mono">Turso LibSQL (Read-Only)</span>
                    <button
                      onClick={handleCopySql}
                      className="text-[10px] text-gray-400 hover:text-cyan-300 flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 transition cursor-pointer"
                    >
                      {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSql ? "Copied!" : "Copy SQL"}</span>
                    </button>
                  </div>
                  <pre className="text-[11px] text-cyan-300 font-mono overflow-x-auto whitespace-pre-wrap py-1">
                    {result.sql}
                  </pre>
                  <div className="text-[9px] text-gray-500 flex items-center gap-2 pt-1 border-t border-white/5">
                    <span>Database Engine Latency: <strong>{result.metrics?.dbLatencyMs || 0}ms</strong></span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card B: Interactive Data Table */}
          <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-slate-950/90 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-black uppercase text-white tracking-wide">
                  Query Results Table
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 hidden sm:inline">
                  Displaying {result.rows.length} records
                </span>
                <button
                  onClick={() => {
                    if (!result?.rows?.length) return;
                    const headers = result.columns.join(",");
                    const rows = result.rows.map(r => result.columns.map(c => JSON.stringify(r[c] ?? "")).join(","));
                    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `nlcb_query_${Date.now()}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    triggerHaptic("success");
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-cyan-300 font-bold uppercase transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {result.rows.length === 0 ? (
              <div className="p-8 text-center bg-black/30 rounded-xl border border-white/5 text-xs text-gray-400">
                No database records matched your specific criteria.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[460px] sleek-scrollbar rounded-xl border border-white/10 bg-black/40 relative">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-md shadow-sm">
                    <tr className="border-b border-white/10 text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                      {result.columns.map((col, idx) => (
                        <th key={idx} className="py-2.5 px-3.5 whitespace-nowrap bg-slate-950">
                          {col.replace(/_/g, " ")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {result.rows.map((row, rowIdx) => (
                      <tr 
                        key={rowIdx}
                        className="hover:bg-cyan-500/[0.04] transition-colors"
                      >
                        {result.columns.map((col, colIdx) => {
                          const val = row[col];
                          const isNumberCol = /^(num\d|winning_number|digit\d|powerball|cash_ball|number)$/i.test(col);
                          const isFrequencyCol = /^(frequency|count|total|occurrences)$/i.test(col);

                          return (
                            <td key={colIdx} className="py-2.5 px-3.5 whitespace-nowrap text-gray-200">
                              {isNumberCol && val !== null && val !== undefined ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 font-bold text-[11px] font-mono">
                                  {val}
                                </span>
                              ) : isFrequencyCol ? (
                                <span className="inline-flex items-center gap-1 font-bold text-emerald-300">
                                  <Flame className="w-3 h-3 text-emerald-400" />
                                  <span>{val}</span>
                                </span>
                              ) : typeof val === "number" ? (
                                <span className="font-bold text-white">{val}</span>
                              ) : (
                                <span>{val !== null && val !== undefined ? String(val) : "—"}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
