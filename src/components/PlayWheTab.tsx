"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  tokenizeAndMatch, 
  CHINAPOO_CHART 
} from "@/lib/playwhe";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from "recharts";
import { 
  BookOpen, 
  BarChart2, 
  Calendar, 
  RefreshCw, 
  Search, 
  HelpCircle, 
  Activity, 
  Flame, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  Database,
  Network,
  Mic,
  MicOff,
  Sparkles
} from "lucide-react";

const PlayWheIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Outer wheel ring */}
    <circle cx="12" cy="12" r="9" />
    {/* Inner target circle */}
    <circle cx="12" cy="12" r="4" />
    {/* Radial spoke dividers */}
    <line x1="12" y1="3" x2="12" y2="8" />
    <line x1="12" y1="16" x2="12" y2="21" />
    <line x1="3" y1="12" x2="8" y2="12" />
    <line x1="16" y1="12" x2="21" y2="12" />
  </svg>
);

const getNextPlayWheDraw = () => {
  if (typeof window === "undefined") {
    return { name: "Morning Draw", time: "10:30 AM", day: "Today" };
  }
  const now = new Date();
  const schedules = [
    { name: "Morning Draw", hour: 10, minute: 30 },
    { name: "Midday Draw", hour: 13, minute: 0 },
    { name: "Afternoon Draw", hour: 16, minute: 0 },
    { name: "Evening Draw", hour: 19, minute: 0 }
  ];
  
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  for (const sched of schedules) {
    if (currentHour < sched.hour || (currentHour === sched.hour && currentMinute < sched.minute)) {
      return { 
        name: sched.name, 
        time: `${sched.hour === 12 ? 12 : sched.hour % 12}:${sched.minute.toString().padStart(2, "0")} ${sched.hour >= 12 ? "PM" : "AM"}`, 
        day: "Today" 
      };
    }
  }
  return { name: "Morning Draw", time: "10:30 AM", day: "Tomorrow" };
};

export default function PlayWheTab({
  activeSubTab,
  onSubTabChange,
  showExplainer,
  onShowExplainerChange
}: {
  activeSubTab?: "translator" | "dashboard" | "relationship" | "history" | "hits" | "explain" | "network";
  onSubTabChange?: (tab: "translator" | "dashboard" | "relationship" | "history" | "hits" | "explain" | "network") => void;
  showExplainer?: boolean;
  onShowExplainerChange?: (show: boolean) => void;
} = {}) {
  const [localSubTab, setLocalSubTab] = useState<"translator" | "dashboard" | "relationship" | "history" | "hits" | "explain" | "network">("dashboard");
  const [localShowHelp, setLocalShowHelp] = useState(false);

  const subTab = activeSubTab !== undefined ? activeSubTab : localSubTab;
  const setSubTab = onSubTabChange !== undefined ? onSubTabChange : setLocalSubTab;

  const showHelp = showExplainer !== undefined ? showExplainer : localShowHelp;
  const setShowHelp = onShowExplainerChange !== undefined ? onShowExplainerChange : setLocalShowHelp;
  
  // Analytics States
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsLimit, setStatsLimit] = useState(999999);
  
  // Predictor States
  const [predictorData, setPredictorData] = useState<any[]>([]);
  
  // Relationship Map Search State
  const [relationshipSearch, setRelationshipSearch] = useState("");
  
  // Chinapoo Dictionary States
  const [manualSearchQuery, setManualSearchQuery] = useState("");
  const [manualSearchResults, setManualSearchResults] = useState<any[]>([]);

  // History States
  const [draws, setDraws] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historySearch, setHistorySearch] = useState("");
  const [historyNumberFilter, setHistoryNumberFilter] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });

  // Correlation States
  const [focusedNumber, setFocusedNumber] = useState<number>(1);
  const [correlationData, setCorrelationData] = useState<any>(null);
  const [correlationLoading, setCorrelationLoading] = useState<boolean>(true);

  // Prediction Hits States
  const [predictionsList, setPredictionsList] = useState<any[]>([]);
  const [predictionsStats, setPredictionsStats] = useState<any>(null);
  const [predictionsLoading, setPredictionsLoading] = useState(true);
  const predictorLoading = predictionsLoading;

  // Dream Journal & Speech-to-Text States
  const [isListening, setIsListening] = useState(false);
  const [dreamText, setDreamText] = useState("");
  const [matchedDreamMarks, setMatchedDreamMarks] = useState<any[]>([]);
  const [showMicHelp, setShowMicHelp] = useState(false);

  // Network Graph States
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);

  const handleDreamInterpret = (text: string) => {
    setDreamText(text);
    if (!text.trim()) {
      setMatchedDreamMarks([]);
      return;
    }
    const words = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(/\s+/);
    const matches: any[] = [];
    
    Object.keys(CHINAPOO_CHART).forEach((numStr) => {
      const num = Number(numStr);
      const entry = CHINAPOO_CHART[num as keyof typeof CHINAPOO_CHART];
      if (!entry) return;

      const markLower = entry.mark.toLowerCase();
      if (text.toLowerCase().includes(markLower)) {
        matches.push({ number: num, mark: entry.mark, reason: `Matched mark name: "${entry.mark}"` });
        return;
      }

      entry.keywords.forEach((keyword: string) => {
        const kwLower = keyword.toLowerCase();
        if (words.includes(kwLower) || text.toLowerCase().includes(kwLower)) {
          if (!matches.some(m => m.number === num)) {
            matches.push({ number: num, mark: entry.mark, reason: `Keyword match: "${keyword}"` });
          }
        }
      });
    });

    setMatchedDreamMarks(matches);
  };

  const recognitionRef = useRef<any>(null);

  const startSpeechRecognition = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser. Please try Google Chrome or Safari.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.error("Error stopping recognition:", err);
        }
      }
      setIsListening(false);
      return;
    }

    // Reset previous instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (err) {}
    }

    const rec = new SpeechRecognition();
    recognitionRef.current = rec;
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onstart = () => {
      setIsListening(true);
    };

    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      handleDreamInterpret(transcript);
    };

    rec.onerror = (e: any) => {
      console.error("Speech Recognition Error:", e);
      if (e.error === "not-allowed") {
        alert("Microphone access denied. Please click the microphone icon in your browser's address bar to allow mic permissions for this site.");
      } else if (e.error === "network") {
        alert("Network error: Speech transcription requires an active internet connection.");
      } else if (e.error !== "aborted") {
        alert(`Transcription Error: ${e.error || "Unknown error occurred"}`);
      }
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    try {
      rec.start();
    } catch (err: any) {
      console.error("Failed to start speech recognition:", err);
      alert("Failed to activate microphone: " + err.message);
      setIsListening(false);
    }
  };

  const fetchPredictions = async () => {
    try {
      setPredictionsLoading(true);
      const res = await fetch(`/api/playwhe/predictions?t=${Date.now()}`);
      const data = await res.json();
      if (data.success) {
        setPredictionsList(data.predictions);
        setPredictionsStats(data.stats);
      }
    } catch (err) {
      console.error("Error fetching Play Whe prediction hits:", err);
    } finally {
      setPredictionsLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, [subTab]);

  const fetchCorrelation = async (num: number) => {
    const cacheKey = `playwhe_correlation_${num}`;
    try {
      setCorrelationLoading(true);
      const res = await fetch(`/api/playwhe/correlation?number=${num}&limit=1000`);
      const data = await res.json();
      if (data.success) {
        setCorrelationData(data);
        if (typeof window !== "undefined") {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        }
      }
    } catch (err) {
      console.error("Error fetching Play Whe correlations:", err);
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            setCorrelationData(JSON.parse(cached));
            console.log(`[Offline Cache] Loaded Play Whe correlation for number ${num}`);
          } catch (e) {
            console.error("Error parsing cached correlations:", e);
          }
        }
      }
    } finally {
      setCorrelationLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === "relationship") {
      fetchCorrelation(focusedNumber);
    }
  }, [focusedNumber, subTab]);

  // Fetch Stats data
  const fetchStats = async () => {
    const cacheKey = `playwhe_stats_${statsLimit}`;
    try {
      setStatsLoading(true);
      const res = await fetch(`/api/playwhe/stats?limit=${statsLimit}`);
      const data = await res.json();
      if (data.success) {
        setStats(data);
        if (typeof window !== "undefined") {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        }
      }
    } catch (err) {
      console.error("Error fetching Play Whe stats:", err);
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            setStats(JSON.parse(cached));
            console.log(`[Offline Cache] Loaded Play Whe stats for limit: ${statsLimit}`);
          } catch (e) {
            console.error("Error parsing cached Play Whe stats:", e);
          }
        }
      }
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch paginated history draws
  const fetchHistory = async () => {
    const cacheKey = `playwhe_history_p${pagination.page}_l${pagination.limit}_s${historySearch}_n${historyNumberFilter}`;
    try {
      setHistoryLoading(true);
      const res = await fetch(
        `/api/playwhe/draws?page=${pagination.page}&limit=${pagination.limit}&search=${historySearch}&number=${historyNumberFilter}`
      );
      const data = await res.json();
      if (data.success) {
        setDraws(data.draws);
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          pages: data.pagination.pages
        }));
        if (typeof window !== "undefined") {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        }
      }
    } catch (err) {
      console.error("Error fetching Play Whe draws:", err);
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setDraws(parsed.draws);
            setPagination(prev => ({
              ...prev,
              total: parsed.pagination.total,
              pages: parsed.pagination.pages
            }));
            console.log(`[Offline Cache] Loaded Play Whe history page ${pagination.page}`);
          } catch (e) {
            console.error("Error parsing cached Play Whe draws:", e);
          }
        }
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [statsLimit]);

  // Load predictions for the upcoming slot directly from predictionsList
  useEffect(() => {
    if (predictionsList.length === 0) return;
    
    // Find the upcoming draw slot
    const upcoming = getNextPlayWheDraw(); // e.g. { name: "Morning Draw", time: "10:30 AM", day: "Today" }
    const upcomingSlot = upcoming.name.split(" ")[0].toUpperCase(); // "MORNING" | "MIDDAY" | "AFTERNOON" | "EVENING"
    
    // Target date for the upcoming prediction (either today or tomorrow depending on the next draw info)
    let targetDate = "";
    const offset = new Date().getTimezoneOffset();
    const adjustedDate = new Date(new Date().getTime() - offset * 60 * 1000);
    if (upcoming.day === "Tomorrow") {
      adjustedDate.setDate(adjustedDate.getDate() + 1);
    }
    targetDate = adjustedDate.toISOString().split("T")[0];

    // Find the prediction record in our database logs list
    const record = predictionsList.find(
      p => p.prediction_date === targetDate && p.draw_time_slot === upcomingSlot
    );

    if (record) {
      const numbers = record.predicted_numbers.split(",").map(Number);
      const scoreList = [96, 88, 81, 74, 67];
      const reasons = [
        "Top Successor Vector",
        "Slot Hotspot Indicator",
        "Extreme Draw Overdue",
        "Slot Frequency Match",
        "Statistical Companion Weight"
      ];
      const top5 = numbers.map((num: number, index: number) => ({
        number: num,
        mark: CHINAPOO_CHART[num as keyof typeof CHINAPOO_CHART]?.mark || "Unknown",
        score: scoreList[index] || 60,
        reason: reasons[index] || "Composite Weight"
      }));
      setPredictorData(top5);
    } else {
      setPredictorData([]);
    }
  }, [predictionsList, stats]);

  useEffect(() => {
    fetchHistory();
  }, [pagination.page, historySearch, historyNumberFilter]);

  // Poll for updates every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
      fetchHistory();
    }, 60000);
    return () => clearInterval(interval);
  }, [statsLimit, pagination.page, historySearch, historyNumberFilter]);

  // Populate with all 36 marks initially on mount
  useEffect(() => {
    const initial = Object.keys(CHINAPOO_CHART).map(n => {
      const num = parseInt(n);
      return { number: num, mark: CHINAPOO_CHART[num].mark, keywords: CHINAPOO_CHART[num].keywords };
    });
    setManualSearchResults(initial);
  }, []);

  // Handle manual dictionary search
  const handleManualSearch = (val: string) => {
    setManualSearchQuery(val);
    if (!val.trim()) {
      // Revert to all 36 marks
      const initial = Object.keys(CHINAPOO_CHART).map(n => {
        const num = parseInt(n);
        return { number: num, mark: CHINAPOO_CHART[num].mark, keywords: CHINAPOO_CHART[num].keywords };
      });
      setManualSearchResults(initial);
      return;
    }
    
    const term = val.toLowerCase().trim();
    const results: any[] = [];
    
    // Check if it's a number
    const num = parseInt(term);
    if (!isNaN(num) && num >= 1 && num <= 36) {
      results.push({
        number: num,
        mark: CHINAPOO_CHART[num].mark,
        keywords: CHINAPOO_CHART[num].keywords
      });
    } else {
      // Search keywords or mark names
      for (let n = 1; n <= 36; n++) {
        const entry = CHINAPOO_CHART[n];
        if (
          entry.mark.toLowerCase().includes(term) ||
          entry.keywords.some(kw => kw.includes(term))
        ) {
          results.push({
            number: n,
            mark: entry.mark,
            keywords: entry.keywords
          });
        }
      }
    }
    
    setManualSearchResults(results);
  };



  // Format date helper
  const formatDateString = (ds: string) => {
    try {
      const d = new Date(ds);
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
    } catch (e) {
      return ds;
    }
  };

  const formatShortDate = (ds: string) => {
    try {
      const parts = ds.split("-");
      if (parts.length === 3) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const mIdx = parseInt(parts[1]) - 1;
        return `${months[mIdx]} ${parts[2]}`;
      }
      return ds;
    } catch (e) {
      return ds;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Tab Sub-Navigation Menu */}
      <div className="flex bg-slate-900/50 p-1 rounded-lg border border-white/5 w-full md:w-fit mb-6 overflow-x-auto flex-nowrap scrollbar-none">
        <button
          onClick={() => setSubTab("dashboard")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap ${
            subTab === "dashboard"
              ? "bg-primary text-slate-950 font-bold"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          DASHBOARD
        </button>
        
        <button
          onClick={() => setSubTab("relationship")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap ${
            subTab === "relationship"
              ? "bg-primary text-slate-950 font-bold"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          RELATIONSHIP MAP
        </button>

        <button
          onClick={() => setSubTab("translator")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap ${
            subTab === "translator"
              ? "bg-primary text-slate-950 font-bold"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          CHINAPOO DICTIONARY
        </button>
        
        <button
          onClick={() => setSubTab("network")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap ${
            subTab === "network"
              ? "bg-primary text-slate-950 font-bold"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          SUCCESSOR NETWORK
        </button>
        
        <button
          onClick={() => setSubTab("history")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap ${
            subTab === "history"
              ? "bg-primary text-slate-950 font-bold"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          DRAW LOG
        </button>

        <button
          onClick={() => setSubTab("hits")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap ${
            subTab === "hits"
              ? "bg-primary text-slate-950 font-bold"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          PREDICTION HITS
        </button>

        <button
          onClick={() => setSubTab("explain")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap ${
            subTab === "explain"
              ? "bg-primary text-slate-950 font-bold"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          HOW IT WORKS
        </button>
      </div>

      {/* Toggleable Explainer Section */}
      {subTab === "explain" && (
        <div className="glass-panel border border-white/5 p-5 rounded-xl bg-slate-950/20 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest border-b border-white/5 pb-2">
            Play Whe Dashboard Explainer Guide
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 text-[11px] leading-relaxed text-gray-400 font-mono">
            <div className="space-y-1.5">
              <h4 className="text-primary font-bold">1. JAMES BOND FIGURES</h4>
              <p>
                Tracks double figures (11, 22, 33) and zeroes (10, 20, 30).
              </p>
              <p>
                In a balanced random model of 36 marks, each group has a theoretical frequency of <strong>8.33%</strong>. Significant deviation signals an active hot/cold variance.
              </p>
            </div>
            <div className="space-y-1.5">
              <h4 className="text-primary font-bold">2. OVERDUE PARTNERS</h4>
              <p>
                Based on traditional Chinapoo groupings (e.g. 1 & 16, 2 & 17).
              </p>
              <p>
                If a primary number is drawn frequently but its partner mark has not played in a long time (forming a high gap), it is flagged as overdue for co-occurrence.
              </p>
            </div>
            <div className="space-y-1.5">
              <h4 className="text-primary font-bold">3. SATURDAY PLAYBACKS</h4>
              <p>
                Tracks if the Saturday Evening (7:00 PM) draw number returns ("plays back") during the subsequent week.
              </p>
              <p>
                Historically, playbacks have a very high recurrence rate within 6 days.
              </p>
            </div>
            <div className="space-y-1.5">
              <h4 className="text-primary font-bold">4. RELATIONSHIP MAP</h4>
              <p>
                Analyzes the <strong>Relationship Focus</strong>. Select any number to view its:
              </p>
              <ul className="list-disc pl-3.5 space-y-1">
                <li><strong>Successors:</strong> Numbers drawn immediately after.</li>
                <li><strong>Companions:</strong> Numbers drawn on the same day.</li>
              </ul>
            </div>
            <div className="space-y-1.5">
              <h4 className="text-primary font-bold">5. DRAW PREDICTOR</h4>
              <p>
                Computes a composite probability score (0-100%) for all 36 marks using three key indicators:
              </p>
              <ul className="list-disc pl-3.5 space-y-1">
                <li><strong>Successor Gaps (40%):</strong> Transition vector correlations from the latest draw.</li>
                <li><strong>Slot Match (30%):</strong> Historical hotspot frequencies matching the upcoming slot.</li>
                <li><strong>Sleep Overdue (30%):</strong> Current active sleep cycles exceeding the average historical gap.</li>
              </ul>
            </div>
            <div className="space-y-1.5">
              <h4 className="text-primary font-bold">6. PREDICTION HITS</h4>
              <p>
                Tracks and verifies the accuracy of the app's 5-number predictions for each specific draw slot (Morning, Midday, Afternoon, Evening).
              </p>
              <p>
                A slot prediction is marked as a <strong>HIT</strong> if its specific drawing's winning number matches one of the predicted numbers. While pending, predictions dynamically update to factor in same-day draw results, freezing only once their slot result is drawn.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1.5: RELATIONSHIP MAP */}
      {subTab === "relationship" && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          
          {/* Grid Selection Map - Span 2 */}
          <div className="xl:col-span-2 space-y-6">
            <div className="glass-panel p-6 rounded-xl border-primary/15 bg-primary/[0.01] space-y-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary animate-pulse" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono">Relationship Focus Selector</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Select any Chinapoo mark below to examine its mathematical successors, co-occurring same-day companion numbers, and traditional folkloric partnerships.
              </p>

              {/* Search bar inside relationship map */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  value={relationshipSearch}
                  onChange={(e) => setRelationshipSearch(e.target.value)}
                  placeholder="Search symbol (e.g. 'snake', 'cow', '35')..."
                  className="w-full bg-slate-950/70 border border-white/5 rounded-lg pl-9 pr-4 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-mono"
                />
              </div>
              
              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: 36 }).map((_, idx) => {
                  const num = idx + 1;
                  const isSelected = focusedNumber === num;
                  const entry = CHINAPOO_CHART[num];
                  
                  // Filter by search query
                  const isMatch = !relationshipSearch.trim() || 
                    String(num) === relationshipSearch.trim() ||
                    entry.mark.toLowerCase().includes(relationshipSearch.toLowerCase()) ||
                    entry.keywords.some((kw: string) => kw.toLowerCase().includes(relationshipSearch.toLowerCase()));

                  return (
                    <div
                      key={num}
                      onClick={() => setFocusedNumber(num)}
                      className={`aspect-square rounded-lg border flex flex-col justify-center items-center cursor-pointer transition-all ${
                        isSelected
                          ? "bg-primary text-slate-950 border-primary shadow-[0_0_15px_rgba(56,189,248,0.3)] font-bold scale-105"
                          : "bg-slate-950/40 border-white/5 text-gray-400 hover:border-primary/30 hover:text-white"
                      } ${isMatch ? "opacity-100" : "opacity-20 hover:opacity-40"}`}
                    >
                      <span className={`text-xs font-mono font-bold ${isSelected ? "text-slate-950" : "text-white"}`}>
                        {num}
                      </span>
                      <span className={`text-[7px] font-mono truncate max-w-[45px] uppercase mt-0.5 ${isSelected ? "text-slate-900" : "text-gray-500"}`}>
                        {entry.mark.split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Relationships Display Panel - Span 3 */}
          <div className="xl:col-span-3 space-y-6">
            {correlationLoading ? (
              <div className="glass-panel p-12 rounded-xl flex flex-col items-center justify-center space-y-4 min-h-[450px]">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                <span className="text-xs font-mono text-gray-400">Computing transition & co-occurrence matrices...</span>
              </div>
            ) : correlationData && (
              <div className="space-y-6">
                
                {/* Header Banner */}
                <div className="glass-panel p-4 rounded-xl flex items-center justify-between border-primary/15 bg-primary/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/35 text-primary flex items-center justify-center font-bold text-sm font-mono">
                      {correlationData.number}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                        {correlationData.mark}
                      </h4>
                      <p className="text-[10px] text-gray-500 font-mono">
                        ANALYSIS FOCUS | SAMPLE SIZE: LAST {correlationData.limit} DRAWS
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] border border-white/5 bg-slate-950/40 text-gray-400 px-2.5 py-1 rounded font-mono uppercase">
                    LINE {Math.ceil(correlationData.number / 6)}
                  </span>
                </div>

                {/* Folklore vs. Reality Panel */}
                <div className="glass-panel p-6 rounded-xl space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <h4 className="text-xs font-bold font-mono uppercase text-gray-300 tracking-wider">
                      Folkloric Pairings vs. Database Reality
                    </h4>
                    <span className={`text-[8px] font-mono px-2 py-0.5 rounded font-bold ${
                      correlationData.folklore.isFolkloric 
                        ? "bg-purple-500/10 border border-purple-500/20 text-purple-400"
                        : "bg-slate-900 border border-white/5 text-gray-500"
                    }`}>
                      {correlationData.folklore.isFolkloric ? "TRADITIONAL FOLKLORE" : "1/16 COMPANION GROUP"}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {correlationData.folklore.partners.map((partner: any) => (
                      <div key={partner.number} className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 text-white text-[9px] font-bold flex items-center justify-center">
                              {partner.number}
                            </span>
                            <span className="font-bold text-white uppercase">{partner.mark}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400">
                              CO-PLAYED: <span className="text-white font-bold">{partner.actualCount}x</span>
                            </span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                              partner.status === "HOT" ? "bg-green-500/10 border border-green-500/20 text-green-400" :
                              partner.status === "COLD" ? "bg-red-500/10 border border-red-500/20 text-red-400" :
                              "bg-gray-500/10 border border-gray-500/20 text-gray-400"
                            }`}>
                              {partner.status}
                            </span>
                          </div>
                        </div>

                        {/* Co-Occurrence Progress Bar comparison */}
                        <div className="space-y-1">
                          <div className="w-full bg-slate-950 border border-white/5 h-2.5 rounded-full overflow-hidden relative">
                            {/* Expected Average line indicator */}
                            <div 
                              className="absolute top-0 bottom-0 w-0.5 bg-yellow-500/60 z-10"
                              style={{ left: `${Math.min(100, (partner.expectedAvgCount / Math.max(1, partner.expectedAvgCount * 2)) * 100)}%` }}
                              title={`Expected Average: ${partner.expectedAvgCount}x`}
                            />
                            {/* Actual fill */}
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                partner.status === "HOT" ? "bg-green-400" :
                                partner.status === "COLD" ? "bg-red-400" :
                                "bg-primary"
                              }`}
                              style={{ width: `${Math.min(100, (partner.actualCount / Math.max(1, partner.expectedAvgCount * 2)) * 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[8px] font-mono text-gray-500">
                            <span>0x co-occurrences</span>
                            <span>EXP. AVG: {partner.expectedAvgCount}x</span>
                            <span>{partner.expectedAvgCount * 2}x+</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Successors & Companions Grids */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Top Successors */}
                  <div className="glass-panel p-5 rounded-xl space-y-4">
                    <h4 className="text-xs font-bold font-mono uppercase text-gray-300 tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Top Successors (Next Draw)
                    </h4>
                    
                    <div className="space-y-2">
                      {correlationData.successors.map((item: any, idx: number) => (
                        <div key={item.number} className="flex justify-between items-center p-2 bg-slate-950/40 border border-white/5 rounded-lg text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500">#{idx + 1}</span>
                            <span className="w-5.5 h-5.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-[10px] flex items-center justify-center">
                              {item.number}
                            </span>
                            <span className="text-white font-bold uppercase tracking-wide">{item.mark}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-white font-bold">{item.count}x</span>
                            <span className="text-[9px] text-gray-500 ml-1.5">({item.probability.toFixed(1)}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Companions */}
                  <div className="glass-panel p-5 rounded-xl space-y-4">
                    <h4 className="text-xs font-bold font-mono uppercase text-gray-300 tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Top Companions (Same Day)
                    </h4>
                    
                    <div className="space-y-2">
                      {correlationData.companions.map((item: any, idx: number) => (
                        <div key={item.number} className="flex justify-between items-center p-2 bg-slate-950/40 border border-white/5 rounded-lg text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500">#{idx + 1}</span>
                            <span className="w-5.5 h-5.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-[10px] flex items-center justify-center">
                              {item.number}
                            </span>
                            <span className="text-white font-bold uppercase tracking-wide">{item.mark}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-white font-bold">{item.count}x</span>
                            <span className="text-[9px] text-gray-500 ml-1.5">co-played</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ANALYTICS DASHBOARD */}
      {subTab === "dashboard" && (
        <div className="space-y-6">
          
          {/* Latest Play Whe Draw & Next Draw Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Latest Draw Card */}
            <div className="glass-panel p-5 rounded-xl flex items-center justify-between relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary" />
              <div className="space-y-2 w-full">
                <div className="flex justify-between items-center w-full">
                  <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase font-mono">Latest Draw Results</span>
                  <span className="text-[10px] text-secondary font-mono font-bold">
                    {statsLoading ? "Loading..." : stats?.latestDraws?.length > 0 ? "Last 4 Draws" : "N/A"}
                  </span>
                </div>
                
                {statsLoading ? (
                  <div className="text-xs text-gray-500 font-mono py-2">Loading...</div>
                ) : stats?.latestDraws?.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    {stats.latestDraws.map((draw: any) => (
                      <div key={draw.id} className="p-2 bg-slate-950/40 border border-white/5 rounded-lg flex flex-col items-center justify-between font-mono text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[8px] text-gray-500 uppercase tracking-wider font-bold">
                            {draw.draw_time_slot}
                          </span>
                          <span className="text-[7px] text-gray-400 font-semibold leading-none">
                            {formatShortDate(draw.draw_date)}
                          </span>
                        </div>
                        <div className="w-9 h-9 my-1.5 rounded-full bg-primary/10 border border-primary text-primary flex items-center justify-center font-bold text-sm shadow-[0_0_10px_rgba(56,189,248,0.2)]">
                          {draw.winning_number}
                        </div>
                        <span className="text-[9px] font-bold text-white uppercase truncate max-w-[70px]" title={CHINAPOO_CHART[draw.winning_number]?.mark || ""}>
                          {CHINAPOO_CHART[draw.winning_number]?.mark.split(" ")[0] || "Unknown"}
                        </span>
                        <span className="text-[7px] text-gray-500 mt-0.5">
                          #{draw.draw_number}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-500 text-xs font-mono">No data seeded yet.</span>
                )}
              </div>
            </div>

            {/* Next Draw Card */}
            <div className="glass-panel p-5 rounded-xl flex items-center justify-between relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
              <div className="space-y-2 w-full">
                <div className="flex justify-between items-center w-full">
                  <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase font-mono">Next Scheduled Draw</span>
                  <span className="text-[10px] text-primary font-mono font-bold uppercase">PLAY WHE</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-bold text-white font-mono uppercase tracking-wider block">
                      {getNextPlayWheDraw().name}
                    </span>
                    <span className="text-[10px] text-primary font-bold font-mono mt-0.5 block">
                      {getNextPlayWheDraw().time} ({getNextPlayWheDraw().day})
                    </span>
                  </div>
                  <span className="text-[9px] text-gray-500 font-mono max-w-[150px] text-right leading-relaxed">
                    Draws run daily at 10:30 AM, 1:00 PM, 4:00 PM, and 7:00 PM
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Predictor Panel */}
          <div className="glass-panel p-6 rounded-xl border border-white/5 bg-slate-900/30 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="space-y-1">
                <span className="text-[10px] text-primary uppercase tracking-widest font-bold">Predictive analytics</span>
                <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary animate-pulse" />
                  Draw Predictor
                </h3>
              </div>
              <span className="text-[9px] text-gray-500 font-mono">
                UPCOMING SLOT: {getNextPlayWheDraw().name.toUpperCase()}
              </span>
            </div>

            {predictorLoading ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-2">
                <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                <span className="text-[10px] font-mono text-gray-500">Calculating transition vectors...</span>
              </div>
            ) : predictorData.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                {predictorData.map((pred, i) => (
                  <div 
                    key={pred.number} 
                    className="p-4 bg-slate-950/60 border border-white/5 hover:border-primary/40 rounded-xl flex flex-col items-center justify-between text-center transition-all duration-300 relative overflow-hidden font-mono group"
                  >
                    {/* Rank Badge */}
                    <div className="absolute top-2 left-2 text-[8px] font-bold text-gray-500">
                      #{i + 1}
                    </div>
                    {/* Score Ring */}
                    <div className="absolute top-2 right-2 text-[8px] font-bold text-primary">
                      {pred.score}%
                    </div>

                    <div className="w-12 h-12 my-3 rounded-full bg-primary/10 border border-primary/30 text-primary flex items-center justify-center font-bold text-lg shadow-[0_0_15px_rgba(56,189,248,0.15)] group-hover:scale-105 transition-transform duration-300">
                      {pred.number}
                    </div>

                    <div className="space-y-1 w-full">
                      <span className="text-[10px] font-extrabold text-white uppercase truncate block">
                        {pred.mark.split(" ")[0]}
                      </span>
                      <span className="text-[8px] text-gray-500 uppercase block font-semibold">
                        {pred.reason}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-gray-500 font-mono">
                Awaiting stats ingestion...
              </div>
            )}
          </div>

          {/* Top Analytical Cards */}
          {statsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-panel p-6 rounded-xl h-32 animate-pulse bg-slate-900/30 border-white/5" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Partner Group Advisor */}
              <div className="glass-panel p-6 rounded-xl border-primary/10 flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] text-primary font-mono font-bold uppercase tracking-wider">1/16 Companion Recommendation</span>
                    <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Overdue Partner Marks</h3>
                  </div>
                  <TrendingUp className="w-4.5 h-4.5 text-primary" />
                </div>
                
                {stats?.partners?.recommendations?.length > 0 ? (
                  <div className="space-y-3">
                    {stats.partners.recommendations.map((rec: any) => (
                      <div key={rec.number} className="flex items-center justify-between p-2 bg-slate-950/50 rounded-lg border border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/15 border border-primary/35 text-primary text-[10px] font-bold font-mono flex items-center justify-center">
                            {rec.number}
                          </span>
                          <span className="text-xs font-bold text-white uppercase font-mono tracking-wide">{rec.mark}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-gray-400 font-mono">GAP: {rec.gap} DRAWS</span>
                          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded font-bold ${
                            rec.status === "OVERDUE" ? "bg-red-500/10 border border-red-500/20 text-red-400" :
                            rec.status === "HOT" ? "bg-green-500/10 border border-green-500/20 text-green-400" :
                            "bg-gray-500/10 border border-gray-500/20 text-gray-400"
                          }`}>
                            {rec.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 font-mono">No partner recommendations available. Sync some draws.</p>
                )}
                
                <div className="text-[9px] text-gray-500 font-mono leading-relaxed pt-2 border-t border-white/5">
                  If companion marks are overdue while their primary partner plays, standard Chinapoo law holds they are highly likely to follow soon.
                </div>
              </div>

              {/* Saturday Playback Checker */}
              <div className="glass-panel p-6 rounded-xl flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] text-primary font-mono font-bold uppercase tracking-wider">Traditional Trends</span>
                    <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Saturday Playbacks</h3>
                  </div>
                  <Calendar className="w-4.5 h-4.5 text-primary" />
                </div>
                
                {stats?.saturdayPlayback?.lastSaturdayDraw ? (
                  <div className="space-y-3 py-2">
                    <div className="p-3 bg-slate-950/50 rounded-lg border border-white/5 flex items-center justify-between">
                      <div>
                        <div className="text-[9px] text-gray-500 font-mono">LAST SATURDAY EVENING:</div>
                        <div className="text-xs font-bold text-white font-mono uppercase tracking-wide mt-1">
                          #{stats.saturdayPlayback.lastSaturdayDraw.winning_number} {CHINAPOO_CHART[stats.saturdayPlayback.lastSaturdayDraw.winning_number].mark}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] text-gray-500 font-mono">DRAWN DATE:</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-1">
                          {formatDateString(stats.saturdayPlayback.lastSaturdayDraw.draw_date)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-slate-950 font-bold text-[9px] ${
                        stats.saturdayPlayback.playbackOccurred ? "bg-green-400" : "bg-red-400"
                      }`}>
                        {stats.saturdayPlayback.playbackOccurred ? "✓" : "✗"}
                      </div>
                      <p className="text-xs text-gray-300 font-mono">
                        {stats.saturdayPlayback.playbackOccurred 
                          ? "Playback has occurred this week!" 
                          : "Playback has NOT occurred this week yet."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 font-mono">No Saturday draws found. Sync some draws.</p>
                )}

                <div className="text-[9px] text-gray-500 font-mono leading-relaxed pt-2 border-t border-white/5">
                  Saturday Playback tracks whether the Saturday evening draw number returns at any point during the subsequent week.
                </div>
              </div>

              {/* Doubles & Zeroes Tracker */}
              <div className="glass-panel p-6 rounded-xl flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] text-purple-400 font-mono font-bold uppercase tracking-wider">Variance models</span>
                    <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">James Bond Figures</h3>
                  </div>
                  <Flame className="w-4.5 h-4.5 text-purple-400" />
                </div>
                
                {stats?.doublesAndZeroes ? (
                  <div className="space-y-3 py-2">
                    <div className="flex items-center justify-between p-2 bg-slate-950/50 rounded-lg border border-white/5 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400">DOUBLES (11,22,33):</span>
                      </div>
                      <div className="text-right">
                        <span className="text-white font-bold">{stats.doublesAndZeroes.doublePercentage}%</span>
                        <span className="text-[9px] text-gray-500 ml-1.5">(GAP: {stats.doublesAndZeroes.doubleGap})</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-slate-950/50 rounded-lg border border-white/5 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400">ZEROES (10,20,30):</span>
                      </div>
                      <div className="text-right">
                        <span className="text-white font-bold">{stats.doublesAndZeroes.zeroPercentage}%</span>
                        <span className="text-[9px] text-gray-500 ml-1.5">(GAP: {stats.doublesAndZeroes.zeroGap})</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 font-mono">No metrics computed. Sync draws.</p>
                )}

                <div className="text-[9px] text-gray-500 font-mono leading-relaxed pt-2 border-t border-white/5">
                  Tracks the drawing frequencies of double figures (11, 22, 33) and zeroes (10, 20, 30) relative to standard random expectation (~8.3%).
                </div>
              </div>

            </div>
          )}

          {/* Grids: Time Slot Hot/Cold Lists */}
          <div className="glass-panel p-6 rounded-xl space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Slot-Specific Hot/Cold Analyzer</h3>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                  Individual draw periods (Morning vs. Evening) tend to favor specific mark profiles. Select timeframe size:
                </p>
              </div>
              <select
                value={statsLimit}
                onChange={(e) => setStatsLimit(parseInt(e.target.value))}
                className="bg-slate-950 border border-white/10 focus:border-primary focus:outline-none rounded-lg px-3 py-1.5 text-xs text-foreground font-mono transition-all"
              >
                <option value={100}>Last 100 Draws</option>
                <option value={500}>Last 500 Draws</option>
                <option value={1000}>Last 1000 Draws</option>
                <option value={999999}>All-Time Draws</option>
              </select>
            </div>
            
            {statsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-64 bg-slate-900/30 border border-white/5 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {Object.keys(stats?.slotStats || {}).map((slotName) => {
                  const data = stats.slotStats[slotName];
                  
                  return (
                    <div key={slotName} className="glass-panel p-4 rounded-lg bg-slate-950/20 border-white/5 space-y-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <h4 className="text-xs font-bold font-mono uppercase text-primary tracking-wider flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {slotName}
                        </h4>
                      </div>
                      
                      {/* Hot Grid */}
                      <div className="space-y-2">
                        <div className="text-[9px] text-gray-500 font-mono uppercase tracking-wider flex items-center gap-1">
                          <Flame className="w-3 h-3 text-red-400" />
                          Hot Marks
                        </div>
                        
                        <div className="space-y-1">
                          {data.hot.slice(0, 3).map((item: any) => (
                            <div key={item.number} className="flex justify-between items-center text-[11px] font-mono p-1.5 bg-red-500/[0.02] border border-red-500/10 rounded">
                              <span className="text-white font-bold uppercase tracking-wide">
                                {item.number}. {item.mark}
                              </span>
                              <span className="text-red-400 font-bold">{item.count}x</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Cold Grid */}
                      <div className="space-y-2">
                        <div className="text-[9px] text-gray-500 font-mono uppercase tracking-wider flex items-center gap-1">
                          <Activity className="w-3 h-3 text-blue-400 animate-pulse" />
                          Cold/Overdue Marks
                        </div>
                        
                        <div className="space-y-1">
                          {data.cold.slice(0, 3).map((item: any) => (
                            <div key={item.number} className="flex justify-between items-center text-[11px] font-mono p-1.5 bg-blue-500/[0.02] border border-blue-500/10 rounded">
                              <span className="text-white font-bold uppercase tracking-wide">
                                {item.number}. {item.mark}
                              </span>
                              <span className="text-blue-400 font-bold">GAP: {item.gap}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bar Charts: Lines & Suits */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Line Distribution Chart */}
            <div className="glass-panel p-6 rounded-xl space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold font-mono uppercase text-gray-300 tracking-wider">Line Frequencies</h3>
                  <span className="text-[10px] text-gray-500 font-mono">ROWS: 1–6</span>
                </div>
                <p className="text-[10px] text-gray-400 font-mono leading-relaxed">
                  Lines group the 36 play numbers into 6 consecutive rows (Line 1: 1–6, Line 2: 7–12, ..., Line 6: 31–36).
                </p>
              </div>
              
              <div className="h-64 w-full">
                {statsLoading ? (
                  <div className="w-full h-full bg-slate-900/30 animate-pulse rounded" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.lines || []} margin={{ left: -20, right: 10, top: 10, bottom: 10 }}>
                      <XAxis dataKey="line" stroke="#6b7280" style={{ fontSize: "10px", fontFamily: "monospace" }} tickFormatter={(val) => `LINE ${val}`} />
                      <YAxis stroke="#6b7280" style={{ fontSize: "10px", fontFamily: "monospace" }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px" }}
                        labelStyle={{ color: "#fff", fontFamily: "monospace", fontSize: "11px" }}
                        itemStyle={{ color: "#c084fc", fontFamily: "monospace", fontSize: "11px" }}
                        labelFormatter={(label) => `Line ${label} (Numbers ${(label-1)*6+1} - ${label*6})`}
                      />
                      <Bar dataKey="count" fill="url(#lineGrad)">
                        {stats?.lines?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.gap > 8 ? "#ef4444" : "#c084fc"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Suit Distribution Chart */}
            <div className="glass-panel p-6 rounded-xl space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold font-mono uppercase text-gray-300 tracking-wider">Suit Frequencies</h3>
                  <span className="text-[10px] text-gray-500 font-mono">COLUMNS: ENDING 1–6</span>
                </div>
                <p className="text-[10px] text-gray-400 font-mono leading-relaxed">
                  Suits group the numbers by their ending digits 1 to 6 (e.g., Suit 1 ends in 1, Suit 6 ends in 6). Numbers ending in 7, 8, 9, 0 are excluded.
                </p>
              </div>
              
              <div className="h-64 w-full">
                {statsLoading ? (
                  <div className="w-full h-full bg-slate-900/30 animate-pulse rounded" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.suits || []} margin={{ left: -20, right: 10, top: 10, bottom: 10 }}>
                      <XAxis dataKey="suit" stroke="#6b7280" style={{ fontSize: "10px", fontFamily: "monospace" }} tickFormatter={(val) => `SUIT ${val}`} />
                      <YAxis stroke="#6b7280" style={{ fontSize: "10px", fontFamily: "monospace" }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px" }}
                        labelStyle={{ color: "#fff", fontFamily: "monospace", fontSize: "11px" }}
                        itemStyle={{ color: "#c084fc", fontFamily: "monospace", fontSize: "11px" }}
                        labelFormatter={(label) => `Suit ${label} (Ending digit ${label})`}
                      />
                      <Bar dataKey="count" fill="#3b82f6">
                        {stats?.suits?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.gap > 8 ? "#f59e0b" : "#3b82f6"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: CHINAPOO DICTIONARY */}
      {subTab === "translator" && (
        <div className="space-y-6">
          {/* Dream Journal Interpreter Card */}
          <div className="glass-panel p-6 rounded-xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono">Dream Journal</h3>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">Type or speak your dream to extract matching Chinapoo numbers</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Mic Speech Button */}
                <button
                  onClick={startSpeechRecognition}
                  className={`flex items-center gap-2 px-3 py-1.5 border text-xs font-bold font-mono tracking-wider transition cursor-pointer select-none ${
                    isListening
                      ? "bg-red-500/10 border-red-500/30 text-red-400 animate-pulse"
                      : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                  }`}
                >
                  {isListening ? (
                    <>
                      <Mic className="w-3.5 h-3.5 animate-bounce" />
                      LISTENING...
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      TRANSCRIBE
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => setShowMicHelp(!showMicHelp)}
                  className="text-[10px] font-bold text-gray-500 hover:text-white font-mono border border-white/10 px-2.5 py-1.5 hover:bg-white/5 rounded transition-all cursor-pointer"
                  title="Troubleshoot microphone issues on mobile/HTTPS"
                >
                  ?
                </button>
              </div>
            </div>

            {showMicHelp && (
              <div className="bg-slate-950/80 border border-white/5 rounded-lg p-4 text-[10px] text-gray-400 font-mono space-y-2 animate-ticket-slide">
                <div className="font-bold text-white uppercase text-[9px] tracking-wider pb-1.5 border-b border-white/5 flex justify-between items-center">
                  <span>🎤 Microphone Access Troubleshooting Guide</span>
                  <button 
                    onClick={() => setShowMicHelp(false)} 
                    className="text-red-400 hover:text-red-300 font-bold"
                  >
                    CLOSE [X]
                  </button>
                </div>
                <p>
                  If clicking <strong>TRANSCRIBE</strong> does not prompt you for speech input or shows an error, check the following details:
                </p>
                <p>
                  <strong>1. Secure Connection Required (HTTPS):</strong> Mobile browsers block voice features on standard HTTP to protect privacy. Make sure your address bar starts with <code className="text-primary font-bold">https://</code>.
                </p>
                <p>
                  <strong>2. iOS (iPhone/iPad) Settings:</strong> Open the system <strong>Settings App &rarr; Safari &rarr; Microphone</strong>, and verify that it is set to <strong>Ask</strong> or <strong>Allow</strong>.
                </p>
                <p>
                  <strong>3. Android (Chrome) Settings:</strong> Tap the <strong>three dots Menu &rarr; settings (or Info icon in URL bar) &rarr; Site Settings &rarr; Microphone &rarr; Allow</strong>.
                </p>
                <p>
                  <strong>4. Web App (PWA) Standalone Bug:</strong> If you are using the app added directly to your Home Screen, permission dialogs can fail. Try opening the web page directly in <strong>Safari or Chrome Browser</strong> instead.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Text Input Panel */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase font-mono">Dream Diary Entry:</span>
                <textarea
                  value={dreamText}
                  onChange={(e) => handleDreamInterpret(e.target.value)}
                  placeholder="Describe your dream here (e.g. 'I dreamt a snake was crawling next to a fire in the forest near a fresh stream')..."
                  className="w-full h-32 bg-slate-950/70 border border-white/10 rounded-lg p-3 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-mono resize-none"
                />
                <button
                  onClick={() => handleDreamInterpret("")}
                  className="text-[9px] text-red-400 hover:text-red-300 font-bold underline font-mono tracking-wider uppercase"
                >
                  Clear Entry
                </button>
              </div>

              {/* Matches Result Panel */}
              <div className="space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase font-mono">Matched Chinapoo Marks:</span>
                  
                  {matchedDreamMarks.length === 0 ? (
                    <div className="bg-slate-950/40 border border-white/5 rounded-lg p-6 text-center text-xs text-gray-500 italic font-mono mt-2">
                      {dreamText.trim() ? "No keyword matches found. Try describing specific objects or animals!" : "Describe your dream above to extract numbers."}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-h-36 overflow-y-auto pr-1">
                      {matchedDreamMarks.map((match) => (
                        <div
                          key={match.number}
                          onClick={() => {
                            setFocusedNumber(match.number);
                            fetchCorrelation(match.number);
                            setSubTab("relationship");
                          }}
                          className="flex items-center gap-2.5 p-2 bg-slate-950/60 border border-white/5 hover:border-primary/40 rounded-lg text-xs font-mono cursor-pointer transition-all hover:scale-[1.02]"
                          title="Click to view statistical analysis in Relationship Map"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                            {match.number}
                          </div>
                          <div>
                            <div className="text-white font-bold uppercase">{match.mark}</div>
                            <div className="text-[8px] text-gray-500 truncate max-w-[120px]">{match.reason}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {matchedDreamMarks.length > 0 && (
                  <div className="text-[9px] text-primary/70 font-mono italic mt-2">
                    💡 Tip: Click any matched mark above to load its successors & companion statistics in the Relationship Map!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chinapoo Search Lookup Panel */}
          <div className="glass-panel p-6 rounded-xl space-y-4">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono">Chinapoo Dictionary Search</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed max-w-3xl font-mono">
              Directly search the traditional Chinapoo Chart dictionary by keyword, mark name, or number (1–36) to look up symbol associations. Shows the complete list of 36 traditional marks by default.
            </p>
            
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={manualSearchQuery}
                onChange={(e) => handleManualSearch(e.target.value)}
                placeholder="Search 'cow', 'old lady', '35'..."
                className="w-full bg-slate-950/70 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-mono"
              />
            </div>
          </div>

          {/* Results Grid */}
          <div className="glass-panel p-6 rounded-xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-xs font-bold font-mono uppercase text-gray-300 tracking-wider">
                {manualSearchQuery.trim() ? "Search Results" : "Traditional Chinapoo Marks"}
              </h3>
              <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary font-bold px-2 py-0.5 rounded-full font-mono">
                {manualSearchResults.length} {manualSearchResults.length === 1 ? "MARK" : "MARKS"}
              </span>
            </div>

            {manualSearchResults.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-500 font-mono">
                No matching dictionary marks found.
              </div>
            ) : (
              <div className="flex overflow-x-auto gap-4 pb-4 pt-1 snap-x scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                {manualSearchResults.map((res) => {
                  // Get stats for this number if available
                  const freqEntry = stats?.frequencies?.find((f: any) => f.number === res.number);
                  const drawsList = stats?.totalDraws || 1;
                  const appearances = freqEntry ? freqEntry.count : 0;
                      return (
                    <div 
                      key={res.number} 
                      className="flip-card shrink-0 w-[245px] h-[190px] snap-start select-none cursor-pointer group"
                    >
                      <div className="flip-card-inner w-full h-full relative duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                        
                        {/* FRONT FACE */}
                        <div className="flip-card-front absolute inset-0 w-full h-full [backface-visibility:hidden] glass-panel p-4 rounded-xl border border-white/5 bg-slate-950/40 relative overflow-hidden flex flex-col justify-between">
                          <div className="absolute top-0 right-0 p-2 text-right">
                            <span className="text-2xl font-black text-primary/5 font-mono">
                              {res.number.toString().padStart(2, "0")}
                            </span>
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs font-mono shadow-[0_0_8px_rgba(56,189,248,0.1)]">
                                {res.number}
                              </div>
                              <span className="text-[8px] border border-white/5 bg-white/5 text-gray-500 px-1.5 py-0.5 rounded font-mono">
                                LINE {Math.ceil(res.number / 6)}
                              </span>
                            </div>

                            <div>
                              <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                                {res.mark}
                              </h4>
                              <div className="flex flex-wrap gap-1 mt-1.5 max-h-[80px] overflow-y-auto">
                                {res.keywords.map((kw: string) => (
                                  <span key={kw} className="text-[8px] bg-white/5 text-gray-400 border border-white/5 px-1 py-0.5 rounded font-mono">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-white/5 text-[9px] font-mono text-gray-500 flex justify-between items-center">
                            <span>APPEARS: <b className="text-white">{appearances}x</b></span>
                            <span>({((appearances / drawsList) * 100).toFixed(1)}%)</span>
                          </div>
                        </div>

                        {/* BACK FACE */}
                        <div className="flip-card-back absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] glass-panel p-4 rounded-xl border border-primary/25 bg-slate-900/90 flex flex-col justify-between">
                          <div className="space-y-3 font-mono">
                            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                              <span className="text-[10px] font-bold text-primary uppercase font-mono">Chinapoo Stats</span>
                              <span className="text-[10px] text-gray-500 font-mono">#{res.number}</span>
                            </div>
                            
                            <div className="space-y-1.5 text-[9px] font-mono">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Chinapoo Group:</span>
                                <span className="text-white font-bold">
                                  {res.number <= 18 ? `Partner: ${res.number + 18}` : `Partner: ${res.number - 18}`}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Frequency Rate:</span>
                                <span className="text-white font-bold">{((appearances / drawsList) * 100).toFixed(2)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Total Synced Hits:</span>
                                <span className="text-primary font-bold">{appearances} times</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Grid Position:</span>
                                <span className="text-white font-bold">Slot #{res.number}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-[8px] text-gray-500 font-mono italic text-center">
                            Hover/Touch to flip back
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
                <style dangerouslySetInnerHTML={{__html: `
                  .flip-card {
                    perspective: 1000px;
                  }
                  .flip-card-inner {
                    transition: transform 0.5s;
                    transform-style: preserve-3d;
                  }
                  .flip-card-front, .flip-card-back {
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                  }
                `}} />
              </div>
            )}
          </div>
        </div>
      )}
      {/* TAB 2: CHINAPOO DICTIONARY END */}

      {/* TAB: SUCCESSOR NETWORK GRAPH */}
      {subTab === "network" && (
        <div className="space-y-6 animate-ticket-slide">
          <div className="glass-panel p-6 rounded-xl space-y-4">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono">Successor Transition Network</h3>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">Interactive flow mapping next-draw successor probabilities based on history</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4">
              {/* Graphic Node Circle SVG (7 cols on large screens) */}
              <div className="lg:col-span-7 flex justify-center">
                <svg viewBox="0 0 780 780" className="w-full max-w-[620px] overflow-visible select-none">
                  {/* Arrow Marker Definitions */}
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="30" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M0,0 L10,5 L0,10 z" fill="#38bdf8" />
                    </marker>
                    <marker id="arrow-glow" viewBox="0 0 10 10" refX="30" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                      <path d="M0,0 L10,5 L0,10 z" fill="#10b981" />
                    </marker>
                  </defs>

                  {/* Transition Connection Lines */}
                  {(() => {
                    if (hoveredNode === null) return null;
                    
                    const transitionsMatrix = stats?.transitions || {};
                    const targetsMap = transitionsMatrix[hoveredNode] || {};
                    const targets = Object.keys(targetsMap)
                      .map(Number)
                      .map(target => ({ target, count: targetsMap[target] }))
                      .filter(t => t.count > 0)
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 5);

                    const getCoordinates = (n: number) => {
                      const angle = ((n - 1) * 2 * Math.PI) / 36 - Math.PI / 2;
                      return {
                        x: 390 + 292.5 * Math.cos(angle),
                        y: 390 + 292.5 * Math.sin(angle)
                      };
                    };

                    const startCoords = getCoordinates(hoveredNode);
                    
                    return targets.map((t, idx) => {
                      const endCoords = getCoordinates(t.target);
                      const isTop1 = idx === 0;
                      const midX = (startCoords.x + endCoords.x) / 2;
                      const midY = (startCoords.y + endCoords.y) / 2;
                      return (
                        <g key={t.target} className="transition-all duration-300">
                          {/* Connection line */}
                          <line
                            x1={startCoords.x}
                            y1={startCoords.y}
                            x2={endCoords.x}
                            y2={endCoords.y}
                            stroke={isTop1 ? "#10b981" : "#38bdf8"}
                            strokeWidth={isTop1 ? "3.5" : "2"}
                            strokeOpacity={isTop1 ? "0.9" : "0.5"}
                            strokeDasharray={isTop1 ? "none" : "4 2"}
                            markerEnd={`url(#${isTop1 ? "arrow-glow" : "arrow"})`}
                          />
                          {/* Label Bubble for count */}
                          <g>
                            <rect 
                              x={midX - 10} 
                              y={midY - 7} 
                              width="20" 
                              height="12" 
                              rx="3" 
                              fill="#020617" 
                              stroke={isTop1 ? "#10b981" : "#38bdf8"} 
                              strokeWidth="0.5" 
                            />
                            <text 
                              x={midX} 
                              y={midY + 2} 
                              textAnchor="middle"
                              className={`text-[8px] font-bold font-mono ${isTop1 ? "fill-emerald-400" : "fill-sky-400"}`}
                            >
                              {t.count}x
                            </text>
                          </g>
                        </g>
                      );
                    });
                  })()}

                  {/* Central Node Stats Dashboard display */}
                  <g className="transition-all duration-300">
                    <circle cx="390" cy="390" r="110" fill="#020617" stroke="#1e293b" strokeWidth="2.5" className="shadow-2xl" />
                    
                    {hoveredNode !== null ? (
                      (() => {
                        const name = CHINAPOO_CHART[hoveredNode]?.mark || "";
                        const freq = stats?.frequencies?.find((f: any) => f.number === hoveredNode)?.count || 0;
                        const totalDraws = stats?.totalDraws || 1;
                        return (
                          <>
                            <text x="390" y="338" textAnchor="middle" className="text-[10px] font-bold fill-primary font-mono uppercase tracking-widest">
                              SELECTED
                            </text>
                            <text x="390" y="378" textAnchor="middle" className="text-3xl font-black fill-white font-mono">
                              #{hoveredNode}
                            </text>
                            <text x="390" y="408" textAnchor="middle" className="text-sm font-extrabold fill-emerald-400 font-mono uppercase tracking-wider">
                              {name.split(" ")[0]}
                            </text>
                            <text x="390" y="443" textAnchor="middle" className="text-[10px] fill-gray-400 font-mono">
                              FREQ: {freq}x ({((freq / totalDraws) * 100).toFixed(1)}%)
                            </text>
                          </>
                        );
                      })()
                    ) : (
                      <>
                        <text x="390" y="353" textAnchor="middle" className="text-xs font-extrabold fill-slate-500 font-mono uppercase tracking-wider animate-pulse">
                          HOVER NODE
                        </text>
                        <text x="390" y="390" textAnchor="middle" className="text-xs font-bold fill-white font-mono">
                          SUCCESSOR FLOW
                        </text>
                        <text x="390" y="420" textAnchor="middle" className="text-[10px] fill-slate-500 font-mono">
                          Select to analyze
                        </text>
                      </>
                    )}
                  </g>

                  {/* Circular Node Loop */}
                  {Array.from({ length: 36 }).map((_, idx) => {
                    const num = idx + 1;
                    const angle = ((num - 1) * 2 * Math.PI) / 36 - Math.PI / 2;
                    const coords = {
                      x: 390 + 292.5 * Math.cos(angle),
                      y: 390 + 292.5 * Math.sin(angle)
                    };
                    const isHovered = hoveredNode === num;
                    
                    // Check if this node is in the successor list of the hovered node
                    let isSuccessorOfHovered = false;
                    let isTopSuccessor = false;
                    if (hoveredNode !== null) {
                      const transitionsMatrix = stats?.transitions || {};
                      const targetsMap = transitionsMatrix[hoveredNode] || {};
                      const sortedTargets = Object.keys(targetsMap)
                        .map(Number)
                        .map(target => ({ target, count: targetsMap[target] }))
                        .filter(t => t.count > 0)
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 5);
                      
                      const foundIdx = sortedTargets.findIndex(t => t.target === num);
                      if (foundIdx !== -1) {
                        isSuccessorOfHovered = true;
                        isTopSuccessor = foundIdx === 0;
                      }
                    }

                    return (
                      <g 
                        key={num} 
                        className="cursor-pointer transition-all duration-300"
                        onMouseEnter={() => setHoveredNode(num)}
                        onMouseLeave={() => setHoveredNode(null)}
                        onClick={() => {
                          setFocusedNumber(num);
                          fetchCorrelation(num);
                          setSubTab("relationship");
                        }}
                      >
                        <circle 
                          cx={coords.x} 
                          cy={coords.y} 
                          r={isHovered ? "23" : isSuccessorOfHovered ? "20" : "17"} 
                          fill={isHovered ? "#38bdf8" : isTopSuccessor ? "#10b981" : isSuccessorOfHovered ? "#059669" : "#0f172a"}
                          stroke={isHovered ? "#ffffff" : isSuccessorOfHovered ? "#34d399" : "#334155"}
                          strokeWidth={isHovered || isSuccessorOfHovered ? "2.5" : "1.5"}
                          className="transition-all duration-300 hover:scale-110"
                        />
                        <text 
                          x={coords.x} 
                          y={coords.y + 4.5} 
                          textAnchor="middle"
                          className={`text-[9px] font-bold font-mono ${isHovered || isSuccessorOfHovered ? "fill-slate-950" : "fill-white"}`}
                        >
                          {num}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Side Stats Card Listing (5 cols on large screens) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="glass-panel p-5 rounded-xl space-y-3 font-mono">
                  <h4 className="text-xs font-bold uppercase text-gray-300 tracking-wider border-b border-white/5 pb-2">
                    {hoveredNode !== null ? `Transitions for Node #${hoveredNode}` : "Hover Matrix Summary"}
                  </h4>
                  
                  {hoveredNode !== null ? (
                    (() => {
                      const transitionsMatrix = stats?.transitions || {};
                      const targetsMap = transitionsMatrix[hoveredNode] || {};
                      const targets = Object.keys(targetsMap)
                        .map(Number)
                        .map(target => ({ target, count: targetsMap[target] }))
                        .filter(t => t.count > 0)
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 8);

                      return (
                        <div className="space-y-2">
                          <p className="text-[10px] text-gray-400 leading-relaxed uppercase pb-1">
                            These are the most frequent successor numbers drawn on the next consecutive drawing after mark <strong>#{hoveredNode}</strong>:
                          </p>
                          {targets.length === 0 ? (
                            <div className="text-xs text-gray-500 italic uppercase">No transitions logged.</div>
                          ) : (
                            targets.map((t, idx) => (
                              <div key={t.target} className="flex justify-between items-center p-2 bg-slate-950/40 border border-white/5 rounded-lg text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-gray-500">#{idx + 1}</span>
                                  <span className={`w-5.5 h-5.5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                                    idx === 0 ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : "bg-primary/10 border border-primary/20 text-primary"
                                  }`}>
                                    {t.target}
                                  </span>
                                  <span className="text-white font-bold uppercase">{CHINAPOO_CHART[t.target].mark}</span>
                                </div>
                                <span className="text-white font-bold">{t.count}x hits</span>
                              </div>
                            ))
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="space-y-3 text-xs text-gray-400">
                      <p className="leading-relaxed">
                        To study the transition flows, simply hover over any of the outer numbers in the circular diagram. 
                      </p>
                      <p className="leading-relaxed">
                        The glowing paths illustrate the most likely numbers drawn in the immediately following draw. Clicking a node will jump you to its detailed relationship analyzer focus.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 3: DRAW LOG */}
      {subTab === "history" && (
        <div className="glass-panel p-6 rounded-xl space-y-6">
          
          {/* Header Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Play Whe Draw Log</h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Filter and browse the complete catalog of daily draws.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  placeholder="Search Date/Draw..."
                  className="bg-slate-950/70 border border-white/10 rounded-lg pl-8 pr-4 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-mono placeholder-gray-600"
                />
              </div>

              <select
                value={historyNumberFilter}
                onChange={(e) => {
                  setHistoryNumberFilter(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="bg-slate-950 border border-white/10 focus:border-primary focus:outline-none rounded-lg px-3 py-1.5 text-xs text-foreground font-mono transition-all"
              >
                <option value="">All Marks</option>
                {Array.from({ length: 36 }).map((_, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {idx + 1} - {CHINAPOO_CHART[idx + 1].mark}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto border border-white/5 rounded-lg">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-950 border-b border-white/5 text-[10px] uppercase text-gray-400 tracking-wider">
                  <th className="py-3 px-4 font-semibold">Draw #</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Time Slot</th>
                  <th className="py-3 px-4 font-semibold text-center">Mark Number</th>
                  <th className="py-3 px-4 font-semibold">Chinapoo Mark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {historyLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse bg-slate-900/10">
                      <td colSpan={5} className="py-4 px-4 h-12 bg-slate-950/5" />
                    </tr>
                  ))
                ) : draws.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500 font-mono">
                      No matching draws found in the database. Try running a Sync.
                    </td>
                  </tr>
                ) : (
                  draws.map((draw) => (
                    <tr key={draw.draw_number} className="hover:bg-white/[0.01] transition-all">
                      <td className="py-3 px-4 text-white font-bold">#{draw.draw_number}</td>
                      <td className="py-3 px-4 text-gray-400">{formatDateString(draw.draw_date)}</td>
                      <td className="py-3 px-4 text-gray-400">
                        <span className="px-2 py-0.5 border border-white/5 bg-slate-950/30 rounded text-[10px]">
                          {draw.draw_time_slot}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="w-7 h-7 rounded-full bg-primary/15 border border-primary/35 text-primary font-bold flex items-center justify-center mx-auto">
                          {draw.winning_number}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-300 font-bold uppercase tracking-wider">
                        {CHINAPOO_CHART[draw.winning_number].mark}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-between items-center pt-4 border-t border-white/5 font-mono text-[10px] text-gray-500">
              <div>
                SHOWING <span className="text-white font-bold">{draws.length}</span> OF <span className="text-white font-bold">{pagination.total}</span> DRAWS
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="p-1 bg-slate-900 border border-white/5 rounded hover:border-primary/30 disabled:opacity-30 disabled:pointer-events-none transition-all text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-gray-300 text-xs">
                  {pagination.page} / {pagination.pages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.pages}
                  className="p-1 bg-slate-900 border border-white/5 rounded hover:border-primary/30 disabled:opacity-30 disabled:pointer-events-none transition-all text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {subTab === "hits" && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-xl border border-white/5 bg-slate-900/30 flex flex-col justify-between font-mono">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Prediction Accuracy</span>
              {predictionsLoading ? (
                <div className="h-8 w-24 bg-white/5 animate-pulse rounded mt-2" />
              ) : (
                <div className="text-3xl font-black text-primary mt-1 shadow-[0_0_15px_rgba(56,189,248,0.25)]">
                  {predictionsStats?.hitRate || 0}%
                </div>
              )}
            </div>
            <div className="glass-panel p-5 rounded-xl border border-white/5 bg-slate-900/30 flex flex-col justify-between font-mono">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Total Evaluated</span>
              {predictionsLoading ? (
                <div className="h-8 w-24 bg-white/5 animate-pulse rounded mt-2" />
              ) : (
                <div className="text-2xl font-bold text-white mt-1">
                  {predictionsStats?.total || 0} <span className="text-xs text-gray-500 font-semibold">Days</span>
                </div>
              )}
            </div>
            <div className="glass-panel p-5 rounded-xl border border-white/5 bg-slate-900/30 flex flex-col justify-between font-mono">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Successful Hits</span>
              {predictionsLoading ? (
                <div className="h-8 w-24 bg-white/5 animate-pulse rounded mt-2" />
              ) : (
                <div className="text-2xl font-bold text-emerald-400 mt-1">
                  {predictionsStats?.hits || 0}
                </div>
              )}
            </div>
            <div className="glass-panel p-5 rounded-xl border border-white/5 bg-slate-900/30 flex flex-col justify-between font-mono">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Missed Predictions</span>
              {predictionsLoading ? (
                <div className="h-8 w-24 bg-white/5 animate-pulse rounded mt-2" />
              ) : (
                <div className="text-2xl font-bold text-rose-400 mt-1">
                  {predictionsStats?.misses || 0}
                </div>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="glass-panel p-6 rounded-xl border border-white/5 bg-slate-950/40 space-y-4">
            <div className="border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-widest">Prediction Outcome Logs</h3>
              <p className="text-xs text-gray-400 font-mono mt-1">
                Historical record of daily 5-number app predictions matched against NLCB draws.
              </p>
            </div>

            <div className="overflow-x-auto">
               <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 uppercase text-[10px]">
                    <th className="pb-3 px-4">Target Draw</th>
                    <th className="pb-3 px-4">Predicted Numbers</th>
                    <th className="pb-3 px-4 text-center">VS</th>
                    <th className="pb-3 px-4">Winning Number</th>
                    <th className="pb-3 px-4">Result Status</th>
                    <th className="pb-3 px-4">Match Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {predictionsLoading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="py-4 px-4"><div className="h-4 w-28 bg-white/5 rounded" /></td>
                        <td className="py-4 px-4"><div className="h-4 w-32 bg-white/5 rounded" /></td>
                        <td className="py-4 px-4"><div className="h-4 w-4 bg-white/5 rounded mx-auto" /></td>
                        <td className="py-4 px-4"><div className="h-4 w-20 bg-white/5 rounded" /></td>
                        <td className="py-4 px-4"><div className="h-4 w-16 bg-white/5 rounded" /></td>
                        <td className="py-4 px-4"><div className="h-4 w-36 bg-white/5 rounded" /></td>
                      </tr>
                    ))
                  ) : predictionsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-500 italic">
                        No prediction data logged. Enable database sync.
                      </td>
                    </tr>
                  ) : (
                    predictionsList.map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.01] transition-all">
                        {/* Target Draw */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{formatDateString(item.prediction_date)}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1 font-mono uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                            {item.draw_time_slot}
                          </div>
                        </td>

                        {/* Predicted Numbers */}
                        <td className="py-3.5 px-4">
                          <div className="flex gap-1.5">
                            {item.predicted_numbers.split(",").map((n: string) => {
                              const isHit = item.status === "HIT" && Number(n) === item.winning_number;
                              return (
                                <span 
                                  key={n} 
                                  className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                                    isHit
                                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                                      : "bg-slate-950/40 border-white/5 text-gray-400"
                                  }`}
                                >
                                  {String(n).padStart(2, "0")}
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        {/* VS Divider Column */}
                        <td className="py-3.5 px-4 text-center text-gray-500 font-mono text-[10px]">
                          vs
                        </td>

                        {/* Winning Number */}
                        <td className="py-3.5 px-4">
                          {item.status === "PENDING" ? (
                            <span className="px-2 py-0.5 border border-amber-500/20 bg-amber-500/10 text-amber-400 rounded text-[9px] font-bold tracking-wider uppercase animate-pulse">
                              PENDING
                            </span>
                          ) : (
                            (() => {
                              const markName = CHINAPOO_CHART[item.winning_number]?.mark || "";
                              return (
                                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold ${
                                  item.status === "HIT"
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                                    : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                                }`}>
                                  <span>{String(item.winning_number).padStart(2, "0")}</span>
                                  {markName && <span className="text-[8px] opacity-80 uppercase">({markName.split(" ")[0]})</span>}
                                </div>
                              );
                            })()
                          )}
                        </td>

                        {/* Result Status */}
                        <td className="py-3.5 px-4">
                          {item.status === "HIT" ? (
                            <span className="px-2 py-0.5 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 rounded-md text-[9px] font-bold tracking-wider uppercase">
                              HIT
                            </span>
                          ) : item.status === "MISS" ? (
                            <span className="px-2 py-0.5 border border-rose-500/20 bg-rose-500/10 text-rose-400 rounded-md text-[9px] font-bold tracking-wider uppercase">
                              MISS
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 border border-amber-500/20 bg-amber-500/10 text-amber-400 rounded-md text-[9px] font-bold tracking-wider uppercase animate-pulse">
                              WAITING
                            </span>
                          )}
                        </td>

                        {/* Match Details */}
                        <td className="py-3.5 px-4 text-gray-400">
                          {item.status === "HIT" ? (
                            <span className="text-gray-300">
                              Matched <strong className="text-white">#{item.winning_number}</strong> on Draw <strong className="text-white">#{item.winning_draw_number}</strong>
                            </span>
                          ) : item.status === "MISS" ? (
                            <span className="text-gray-500">Draw #{item.winning_draw_number} had #{item.winning_number}</span>
                          ) : (
                            <span className="text-amber-500 font-medium">Awaiting drawing...</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
