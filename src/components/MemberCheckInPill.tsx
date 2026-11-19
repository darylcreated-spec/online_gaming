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

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-[11px] font-mono font-semibold text-slate-300 hover:text-white transition cursor-pointer"
        title="Free Member Check-In (Optional Name & Email)"
      >
        <Users className="w-3.5 h-3.5 text-cyan-400" />
        <span className="max-w-[90px] truncate">{savedName || "Sign In"}</span>
      </button>

      {open && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 p-4 rounded-xl bg-slate-950 border border-cyan-500/30 shadow-2xl z-[80] font-mono space-y-3">
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
          </form>
        </div>
      )}
    </div>
  );
}
