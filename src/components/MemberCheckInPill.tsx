"use client";

import React, { useState, useEffect } from "react";
import { Users, X, CheckCircle2 } from "lucide-react";

export default function MemberCheckInPill() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savedName, setSavedName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const n = localStorage.getItem("win_concept_display_name");
    const e = localStorage.getItem("win_concept_email");
    if (n) {
      setName(n);
      setSavedName(n);
    }
    if (e) setEmail(e);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const visitorId =
        localStorage.getItem("win_concept_visitor_id") ||
        `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem("win_concept_visitor_id", visitorId);
      localStorage.setItem("win_concept_display_name", name.trim());
      if (email.trim()) localStorage.setItem("win_concept_email", email.trim());

      await fetch("/api/analytics/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId,
          displayName: name.trim(),
          email: email.trim() || undefined,
          activeTab: "welcome"
        })
      });
      setSavedName(name.trim());
      setOpen(false);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("win_concept_display_name");
      localStorage.removeItem("win_concept_email");
    }
    setName("");
    setEmail("");
    setSavedName(null);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-semibold transition cursor-pointer border whitespace-nowrap ${
          savedName
            ? "bg-slate-900/90 hover:bg-slate-800 border-emerald-500/40 text-white"
            : "bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-400/50 text-cyan-200"
        }`}
        title="Free Member Login / Check-In (Optional Name & Email)"
      >
        {savedName ? (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
        ) : (
          <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        )}
        <span className="max-w-[90px] truncate">{savedName || "Sign In"}</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[75] sm:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72 p-4 rounded-xl bg-slate-950 border border-cyan-500/30 shadow-2xl z-[80] font-mono space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white uppercase">Member Check-In (Free)</span>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSave} className="space-y-2.5">
            <div>
              <label className="text-[10px] text-slate-400 uppercase block mb-1">Your Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase block mb-1">Email (Optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {saving ? "Saving..." : savedName ? "Update Profile" : "Save & Check In"}
            </button>
            {savedName && (
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 text-[11px] font-bold uppercase cursor-pointer"
              >
                Sign Out
              </button>
            )}
          </form>
        </div>
        </>
      )}
    </div>
  );
}
