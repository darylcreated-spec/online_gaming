"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Users, 
  Share2, 
  MessageSquare, 
  Plus, 
  DollarSign, 
  Send, 
  Sparkles, 
  Check, 
  Copy, 
  Ticket, 
  Trophy, 
  Flame, 
  Clock, 
  ShieldCheck, 
  ArrowRight, 
  Hash,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  ExternalLink
} from "lucide-react";

interface SyndicateTabProps {
  onSelectGame?: (game: "welcome" | "lotto-plus" | "play-whe" | "win-for-life" | "syndicate" | "scanner" | "settings") => void;
}

export default function SyndicateTab({ onSelectGame }: SyndicateTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"pools" | "pool-detail" | "chat">("pools");
  
  // Syndicates state
  const [syndicates, setSyndicates] = useState<any[]>([]);
  const [loadingSyndicates, setLoadingSyndicates] = useState(true);
  const [selectedSyndicate, setSelectedSyndicate] = useState<any>(null);
  const [searchCode, setSearchCode] = useState("");
  const [searchError, setSearchError] = useState("");

  // Create Syndicate Modal / Form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSyndName, setNewSyndName] = useState("");
  const [newCreatorName, setNewCreatorName] = useState("");
  const [newGameType, setNewGameType] = useState("lotto-plus");
  const [newDrawDate, setNewDrawDate] = useState("Upcoming Draw");
  const [newInitialContrib, setNewInitialContrib] = useState("50");
  const [newNotes, setNewNotes] = useState("");
  const [creating, setCreating] = useState(false);

  // Add Member Form
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberAmount, setNewMemberAmount] = useState("50");
  const [addingMember, setAddingMember] = useState(false);

  // Add Ticket Form
  const [ticketNumbers, setTicketNumbers] = useState("");
  const [ticketBonus, setTicketBonus] = useState("");
  const [ticketCost, setTicketCost] = useState("10");
  const [addingTicket, setAddingTicket] = useState(false);

  // Community Chat state
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatTag, setChatTag] = useState("ALL");
  const [chatUser, setChatUser] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatLuckyNumbers, setChatLuckyNumbers] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Copy Slip Notification
  const [copiedSlip, setCopiedSlip] = useState(false);

  // Prize Payout Calculator
  const [hypoJackpot, setHypoJackpot] = useState("5000000");

  // Fetch all syndicates
  const fetchSyndicates = async () => {
    setLoadingSyndicates(true);
    try {
      const res = await fetch("/api/syndicates");
      const data = await res.json();
      if (data.success && data.syndicates) {
        setSyndicates(data.syndicates);
        if (data.syndicates.length > 0 && !selectedSyndicate) {
          fetchSyndicateDetail(data.syndicates[0].code);
        }
      }
    } catch (e) {
      console.error("Error loading syndicates:", e);
    } finally {
      setLoadingSyndicates(false);
    }
  };

  // Fetch syndicate by code
  const fetchSyndicateDetail = async (code: string) => {
    try {
      const res = await fetch(`/api/syndicates?code=${code}`);
      const data = await res.json();
      if (data.success && data.syndicate) {
        setSelectedSyndicate(data.syndicate);
        setSearchError("");
      } else {
        setSearchError("Syndicate code not found.");
      }
    } catch (e) {
      console.error("Error loading syndicate detail:", e);
      setSearchError("Failed to fetch syndicate details.");
    }
  };

  // Fetch Community Chat
  const fetchChat = async () => {
    try {
      const res = await fetch(`/api/chat?tag=${chatTag}`);
      const data = await res.json();
      if (data.success && data.messages) {
        setChatMessages(data.messages);
      }
    } catch (e) {
      console.error("Error loading chat:", e);
    }
  };

  useEffect(() => {
    fetchSyndicates();
    fetchChat();

    const interval = setInterval(() => {
      fetchChat();
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchChat();
  }, [chatTag]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Create Syndicate handler
  const handleCreateSyndicate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSyndName.trim() || !newCreatorName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/syndicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: newSyndName,
          creator_name: newCreatorName,
          game_type: newGameType,
          target_draw_date: newDrawDate,
          initial_contribution: newInitialContrib,
          notes: newNotes
        })
      });
      const data = await res.json();
      if (data.success && data.syndicate) {
        setShowCreateModal(false);
        setNewSyndName("");
        setNewNotes("");
        await fetchSyndicates();
        await fetchSyndicateDetail(data.syndicate.code);
        setActiveSubTab("pool-detail");
      }
    } catch (e) {
      console.error("Failed to create syndicate:", e);
    } finally {
      setCreating(false);
    }
  };

  // Add Member handler
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSyndicate || !newMemberName.trim() || !newMemberAmount) return;

    setAddingMember(true);
    try {
      const res = await fetch("/api/syndicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_member",
          syndicate_id: selectedSyndicate.id,
          member_name: newMemberName,
          contribution_amount: newMemberAmount
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewMemberName("");
        await fetchSyndicateDetail(selectedSyndicate.code);
        await fetchSyndicates();
      }
    } catch (e) {
      console.error("Error adding member:", e);
    } finally {
      setAddingMember(false);
    }
  };

  // Add Ticket handler
  const handleAddTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSyndicate || !ticketNumbers.trim()) return;

    setAddingTicket(true);
    try {
      const res = await fetch("/api/syndicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_ticket",
          syndicate_id: selectedSyndicate.id,
          game_type: selectedSyndicate.game_type,
          numbers: ticketNumbers,
          bonus: ticketBonus || null,
          cost: ticketCost
        })
      });
      const data = await res.json();
      if (data.success) {
        setTicketNumbers("");
        setTicketBonus("");
        await fetchSyndicateDetail(selectedSyndicate.code);
        await fetchSyndicates();
      }
    } catch (e) {
      console.error("Error adding ticket:", e);
    } finally {
      setAddingTicket(false);
    }
  };

  // Send Chat message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const user = chatUser.trim() || "TriniPlayer";
    if (!chatUser.trim()) setChatUser(user);

    setSendingChat(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_name: user,
          message: chatInput,
          game_tag: chatTag === "ALL" ? "ALL" : chatTag,
          lucky_numbers: chatLuckyNumbers || null
        })
      });
      const data = await res.json();
      if (data.success) {
        setChatInput("");
        setChatLuckyNumbers("");
        await fetchChat();
      }
    } catch (e) {
      console.error("Error posting chat message:", e);
    } finally {
      setSendingChat(false);
    }
  };

  // Generate copyable WhatsApp share slip text
  const generateShareSlipText = () => {
    if (!selectedSyndicate) return "";

    const lines = [
      `🎰 *THE WIN CONCEPT — SYNDICATE PLAYSLIP* 🎰`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🏷️ *Pool:* ${selectedSyndicate.name}`,
      `🔑 *Invite Code:* ${selectedSyndicate.code}`,
      `🎲 *Game:* ${selectedSyndicate.game_type.toUpperCase()}`,
      `📅 *Target Draw:* ${selectedSyndicate.target_draw_date}`,
      `💰 *Total Stake:* $${selectedSyndicate.total_stake?.toFixed(2)} TT`,
      `👥 *Members (${selectedSyndicate.members?.length || 0}):*`,
    ];

    selectedSyndicate.members?.forEach((m: any, i: number) => {
      lines.push(`  ${i + 1}. ${m.member_name} — $${m.contribution_amount?.toFixed(2)} (${m.share_percentage}%)`);
    });

    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`🎟️ *POOLED TICKETS (${selectedSyndicate.tickets?.length || 0}):*`);
    selectedSyndicate.tickets?.forEach((t: any, i: number) => {
      lines.push(`  Line ${i + 1}: [ ${t.numbers} ] ${t.bonus ? `PB: ${t.bonus}` : ""}`);
    });

    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`⚡ *Verified by The Win Concept Combinatorial Engine*`);
    lines.push(`🔗 Join & view live slip at: https://thewinconcept.tt/?pool=${selectedSyndicate.code}`);

    return lines.join("\n");
  };

  const handleCopySlip = () => {
    const text = generateShareSlipText();
    navigator.clipboard.writeText(text);
    setCopiedSlip(true);
    setTimeout(() => setCopiedSlip(false), 2500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-mono">
      
      {/* 1. Header Banner & Mode Selector */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-slate-950/40 space-y-4 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-widest flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                <span>Syndicate Hub &amp; Live Chat</span>
              </h2>
            </div>
            <p className="text-xs text-gray-400 mt-1 max-w-2xl">
              Pool tickets with friends, family, and coworkers to multiply your combinatorial odds. Auto-calculate payout shares, generate shareable slips, and discuss live strategies in community chat.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-primary text-slate-950 hover:bg-sky-300 transition text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(56,189,248,0.3)] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create New Pool</span>
          </button>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-white/5 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab("pools")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer whitespace-nowrap ${
              activeSubTab === "pools"
                ? "bg-white/10 text-white font-black border border-white/10"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-primary" />
            <span>Active Pools ({syndicates.length})</span>
          </button>

          <button
            onClick={() => {
              if (selectedSyndicate) setActiveSubTab("pool-detail");
            }}
            disabled={!selectedSyndicate}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer whitespace-nowrap ${
              activeSubTab === "pool-detail"
                ? "bg-white/10 text-white font-black border border-white/10"
                : selectedSyndicate
                ? "text-gray-400 hover:text-white"
                : "text-gray-600 cursor-not-allowed"
            }`}
          >
            <Ticket className="w-3.5 h-3.5 text-amber-400" />
            <span>{selectedSyndicate ? `${selectedSyndicate.code} Details` : "Pool Details"}</span>
          </button>

          <button
            onClick={() => setActiveSubTab("chat")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer whitespace-nowrap ${
              activeSubTab === "chat"
                ? "bg-white/10 text-white font-black border border-white/10"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Live Community Chat</span>
          </button>
        </div>
      </div>

      {/* 2. SUBTAB 1: ACTIVE POOLS & SEARCH */}
      {activeSubTab === "pools" && (
        <div className="space-y-6">
          
          {/* Quick Search By Code */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-300 font-bold uppercase tracking-wider shrink-0">
              <Hash className="w-4 h-4 text-primary" />
              <span>Join By Invite Code:</span>
            </div>
            <div className="flex-1 flex gap-2 w-full">
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="e.g. WIN-7720"
                className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white uppercase focus:outline-none focus:border-primary transition font-mono"
              />
              <button
                onClick={() => {
                  if (searchCode.trim()) {
                    fetchSyndicateDetail(searchCode.trim().toUpperCase());
                    setActiveSubTab("pool-detail");
                  }
                }}
                className="px-4 py-2 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 text-xs font-bold uppercase rounded-lg transition cursor-pointer"
              >
                Find Pool
              </button>
            </div>
          </div>

          {searchError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg">
              {searchError}
            </div>
          )}

          {/* Syndicates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingSyndicates ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-5 rounded-2xl bg-slate-950/60 border border-white/5 animate-pulse space-y-3">
                  <div className="w-24 h-4 bg-slate-800 rounded" />
                  <div className="w-40 h-6 bg-slate-800 rounded" />
                  <div className="w-full h-12 bg-slate-800/40 rounded" />
                </div>
              ))
            ) : syndicates.length === 0 ? (
              <div className="col-span-full p-12 text-center text-gray-500 glass-panel rounded-2xl">
                No active public syndicates found. Click <strong>CREATE NEW POOL</strong> to start one!
              </div>
            ) : (
              syndicates.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    fetchSyndicateDetail(s.code);
                    setActiveSubTab("pool-detail");
                  }}
                  className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer space-y-4 group relative overflow-hidden shadow-lg flex flex-col justify-between ${
                    selectedSyndicate?.id === s.id
                      ? "bg-slate-900 border-primary/50 shadow-[0_0_20px_rgba(56,189,248,0.15)]"
                      : "bg-slate-950/80 border-white/5 hover:border-white/20 hover:bg-slate-900/60"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                        {s.code}
                      </span>
                      <span className="text-[9px] text-gray-400 uppercase font-bold px-2 py-0.5 bg-slate-900 rounded border border-white/5">
                        {s.game_type}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white uppercase group-hover:text-primary transition line-clamp-1">
                      {s.name}
                    </h3>
                    
                    {s.notes && (
                      <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                        {s.notes}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 pt-3 border-t border-white/5">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-slate-900/60 rounded-lg border border-white/5">
                        <span className="text-[8px] text-gray-500 block uppercase">Stake</span>
                        <strong className="text-xs text-emerald-400">${s.total_stake?.toFixed(0)}</strong>
                      </div>
                      <div className="p-2 bg-slate-900/60 rounded-lg border border-white/5">
                        <span className="text-[8px] text-gray-500 block uppercase">Tickets</span>
                        <strong className="text-xs text-amber-400">{s.ticket_count}</strong>
                      </div>
                      <div className="p-2 bg-slate-900/60 rounded-lg border border-white/5">
                        <span className="text-[8px] text-gray-500 block uppercase">Members</span>
                        <strong className="text-xs text-sky-400">{s.member_count || 1}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
                      <span>By: <strong className="text-gray-200">{s.creator_name}</strong></span>
                      <span className="flex items-center gap-1 text-primary font-bold group-hover:translate-x-1 transition">
                        View Pool <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}

      {/* 3. SUBTAB 2: POOL DETAIL, TICKETS & SHARE SLIP */}
      {activeSubTab === "pool-detail" && selectedSyndicate && (
        <div className="space-y-6">
          
          {/* Top Syndicate Summary Card */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-slate-950/60 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black px-2.5 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary">
                    {selectedSyndicate.code}
                  </span>
                  <span className="text-xs text-gray-400 uppercase font-bold">
                    {selectedSyndicate.game_type} Pool
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase">
                  {selectedSyndicate.name}
                </h2>
                <p className="text-xs text-gray-400">
                  Target Draw: <strong className="text-amber-400">{selectedSyndicate.target_draw_date}</strong> · Creator: <strong className="text-gray-200">{selectedSyndicate.creator_name}</strong>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleCopySlip}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition cursor-pointer shadow-lg ${
                    copiedSlip
                      ? "bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                      : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                  }`}
                >
                  {copiedSlip ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSlip ? "Copied WhatsApp Slip!" : "Share WhatsApp Slip"}</span>
                </button>
              </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-900/80 rounded-xl border border-white/5">
                <span className="text-[9px] text-gray-400 uppercase font-bold block">Total Pool Stake</span>
                <span className="text-lg font-black text-emerald-400">${selectedSyndicate.total_stake?.toFixed(2)} TT</span>
              </div>
              <div className="p-3.5 bg-slate-900/80 rounded-xl border border-white/5">
                <span className="text-[9px] text-gray-400 uppercase font-bold block">Pooled Tickets</span>
                <span className="text-lg font-black text-amber-400">{selectedSyndicate.tickets?.length || 0} Lines</span>
              </div>
              <div className="p-3.5 bg-slate-900/80 rounded-xl border border-white/5">
                <span className="text-[9px] text-gray-400 uppercase font-bold block">Active Members</span>
                <span className="text-lg font-black text-sky-400">{selectedSyndicate.members?.length || 0} Players</span>
              </div>
              <div className="p-3.5 bg-slate-900/80 rounded-xl border border-white/5">
                <span className="text-[9px] text-gray-400 uppercase font-bold block">Coverage Factor</span>
                <span className="text-lg font-black text-violet-400">{(selectedSyndicate.tickets?.length || 1) * 35}x Matrix</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Pooled Tickets Deck */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase text-white flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-amber-400" />
                  <span>Pooled Tickets ({selectedSyndicate.tickets?.length || 0})</span>
                </h3>
              </div>

              {/* Add Ticket Form */}
              <form onSubmit={handleAddTicket} className="p-4 bg-slate-950/80 rounded-xl border border-white/5 space-y-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Add Line to Pool:</span>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <input
                    type="text"
                    value={ticketNumbers}
                    onChange={(e) => setTicketNumbers(e.target.value)}
                    placeholder="Numbers (e.g. 4, 12, 19, 26, 33)"
                    className="sm:col-span-6 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-primary"
                    required
                  />
                  <input
                    type="text"
                    value={ticketBonus}
                    onChange={(e) => setTicketBonus(e.target.value)}
                    placeholder="Bonus / PB (e.g. 7)"
                    className="sm:col-span-3 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    disabled={addingTicket}
                    className="sm:col-span-3 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-bold uppercase rounded-lg transition cursor-pointer disabled:opacity-50"
                  >
                    {addingTicket ? "Adding..." : "+ Add Line"}
                  </button>
                </div>
              </form>

              {/* Tickets List */}
              <div className="space-y-2.5">
                {selectedSyndicate.tickets?.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 glass-panel rounded-xl text-xs">
                    No tickets added to this pool yet. Add your first line above!
                  </div>
                ) : (
                  selectedSyndicate.tickets?.map((t: any, idx: number) => (
                    <div key={t.id} className="p-3 bg-slate-950/60 border border-white/5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-500 font-bold">Line #{idx + 1}</span>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {t.numbers.split(",").map((num: string, nIdx: number) => (
                            <div
                              key={nIdx}
                              className="w-7 h-7 rounded-full bg-slate-900 border border-white/10 text-white font-bold text-xs flex items-center justify-center shadow-inner"
                            >
                              {num.trim()}
                            </div>
                          ))}
                          {t.bonus && (
                            <>
                              <span className="text-gray-600 font-bold mx-0.5">|</span>
                              <div className="w-7 h-7 rounded-full bg-purple-600/80 border border-purple-400 text-white font-bold text-xs flex items-center justify-center">
                                {t.bonus}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold">${t.cost?.toFixed(2)} TT</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right: Members & Prize Split Calculator */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Member Contribution List */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>Members &amp; Shares ({selectedSyndicate.members?.length || 0})</span>
                </h3>

                {/* Join / Add Member Form */}
                <form onSubmit={handleAddMember} className="p-4 bg-slate-950/80 rounded-xl border border-white/5 space-y-2.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Contribute to Pool:</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="Player Name"
                      className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-primary"
                      required
                    />
                    <input
                      type="number"
                      value={newMemberAmount}
                      onChange={(e) => setNewMemberAmount(e.target.value)}
                      placeholder="$TT"
                      className="w-20 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-primary"
                      required
                    />
                    <button
                      type="submit"
                      disabled={addingMember}
                      className="px-3 py-2 bg-sky-500/10 border border-sky-500/30 text-sky-300 hover:bg-sky-500/20 text-xs font-bold uppercase rounded-lg transition cursor-pointer disabled:opacity-50"
                    >
                      {addingMember ? "Joining..." : "Join"}
                    </button>
                  </div>
                </form>

                {/* Member Roster List */}
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {selectedSyndicate.members?.map((m: any) => (
                    <div key={m.id} className="p-3 bg-slate-950/50 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">{m.member_name}</div>
                        <div className="text-[9px] text-gray-500 mt-0.5">Contributed: ${m.contribution_amount?.toFixed(2)} TT</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-primary">{m.share_percentage}%</div>
                        <div className="text-[8px] text-gray-400">of Payout</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prize Payout Simulation Calculator */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-emerald-500/20 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <Trophy className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-black uppercase text-white tracking-wider">
                    Jackpot Split Calculator
                  </h4>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Estimated Winning Pot ($TT):</span>
                    <strong className="text-emerald-400">${Number(hypoJackpot || 0).toLocaleString()} TT</strong>
                  </div>
                  <input
                    type="number"
                    value={hypoJackpot}
                    onChange={(e) => setHypoJackpot(e.target.value)}
                    step="500000"
                    min="100000"
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                  />
                </div>

                {/* Per-Member Estimated Payout */}
                <div className="space-y-1.5 pt-2 border-t border-white/5 max-h-[160px] overflow-y-auto">
                  {selectedSyndicate.members?.map((m: any) => {
                    const estimatedPrize = ((Number(hypoJackpot) || 0) * (m.share_percentage / 100));
                    return (
                      <div key={m.id} className="flex justify-between items-center text-[10px]">
                        <span className="text-gray-300 truncate max-w-[120px]">{m.member_name}:</span>
                        <strong className="text-emerald-300 font-mono">
                          ${estimatedPrize.toLocaleString(undefined, { maximumFractionDigits: 0 })} TT
                        </strong>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* 4. SUBTAB 3: LIVE COMMUNITY CHAT */}
      {activeSubTab === "chat" && (
        <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-slate-950/60 space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-lg font-black uppercase text-white">Live Community Discussion</h3>
              </div>
              <p className="text-xs text-gray-400">
                Discuss mark frequencies, share lucky dream journal tokens, and coordinate pool strategies with fellow players.
              </p>
            </div>

            {/* Channel Filter Pills */}
            <div className="flex bg-slate-900 p-1 rounded-lg border border-white/5 gap-1">
              {["ALL", "LOTTO", "PLAYWHE", "WINFORLIFE"].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setChatTag(tag)}
                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                    chatTag === tag
                      ? "bg-primary text-slate-950 font-black"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages Feed */}
          <div
            ref={chatScrollRef}
            className="h-[360px] overflow-y-auto space-y-3 p-4 bg-slate-950/80 rounded-xl border border-white/5"
          >
            {chatMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-xs italic">
                No messages in #{chatTag} yet. Be the first to start the conversation!
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className="p-3 bg-slate-900/60 rounded-xl border border-white/5 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{msg.user_name}</span>
                      <span className={`text-[8px] font-black px-1.5 py-0.2 rounded uppercase ${
                        msg.game_tag === "LOTTO"
                          ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                          : msg.game_tag === "PLAYWHE"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : msg.game_tag === "WINFORLIFE"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-slate-800 text-gray-400"
                      }`}>
                        {msg.game_tag}
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-500">{msg.created_at?.slice(11, 16) || "Now"}</span>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed">
                    {msg.message}
                  </p>

                  {msg.lucky_numbers && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[9px] text-amber-400 font-bold uppercase">Lucky Picks:</span>
                      <span className="text-[10px] font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-white/10">
                        {msg.lucky_numbers}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSendMessage} className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input
                type="text"
                value={chatUser}
                onChange={(e) => setChatUser(e.target.value)}
                placeholder="Your Name / Handle"
                className="sm:col-span-3 bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-primary"
              />
              <input
                type="text"
                value={chatLuckyNumbers}
                onChange={(e) => setChatLuckyNumbers(e.target.value)}
                placeholder="Attach Numbers (Optional)"
                className="sm:col-span-3 bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-primary"
              />
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Post to #${chatTag} channel...`}
                className="sm:col-span-5 bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-primary"
                required
              />
              <button
                type="submit"
                disabled={sendingChat}
                className="sm:col-span-1 py-2.5 bg-primary text-slate-950 hover:bg-sky-300 font-black rounded-xl flex items-center justify-center transition cursor-pointer disabled:opacity-50"
                title="Send Message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>

        </div>
      )}

      {/* 5. CREATE SYNDICATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>Create New Syndicate Pool</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSyndicate} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase font-bold">Syndicate Name:</label>
                <input
                  type="text"
                  value={newSyndName}
                  onChange={(e) => setNewSyndName(e.target.value)}
                  placeholder="e.g. POS Financial Lotto Club"
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold">Your Name (Admin):</label>
                  <input
                    type="text"
                    value={newCreatorName}
                    onChange={(e) => setNewCreatorName(e.target.value)}
                    placeholder="e.g. Daryl"
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold">Initial Stake ($TT):</label>
                  <input
                    type="number"
                    value={newInitialContrib}
                    onChange={(e) => setNewInitialContrib(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold">Target Game:</label>
                  <select
                    value={newGameType}
                    onChange={(e) => setNewGameType(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary uppercase"
                  >
                    <option value="lotto-plus">Lotto Plus</option>
                    <option value="play-whe">Play Whe</option>
                    <option value="win-for-life">Win For Life</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold">Target Draw Date:</label>
                  <input
                    type="text"
                    value={newDrawDate}
                    onChange={(e) => setNewDrawDate(e.target.value)}
                    placeholder="e.g. Saturday Draw"
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase font-bold">Notes &amp; Strategy (Optional):</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Combining top Bayesian candidates with genetic algorithm filters..."
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary h-16 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-2.5 bg-primary text-slate-950 font-black uppercase tracking-wider rounded-xl transition cursor-pointer hover:bg-sky-300 disabled:opacity-50 mt-2"
              >
                {creating ? "Generating Syndicate Code..." : "Create Syndicate Pool"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
