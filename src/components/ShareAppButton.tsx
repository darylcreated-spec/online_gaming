"use client";

import React, { useState, useEffect, useRef } from "react";
import { Share2, Check, Copy, Link2, MessageCircle, X } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

const SHARE_URL = "https://ttonlinegaming.vercel.app/";
const SHARE_TITLE = "The Win Concept | NLCB Analytics";
const SHARE_TEXT =
  "Understand exact NLCB odds, compare ticket budgets, and remove overlapping plays across Cash Pot, Lotto Plus, Win For Life, Play Whe, Pick 4, and Fast Cash.";

export default function ShareAppButton() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copiedMode, setCopiedMode] = useState<"link" | "message" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  const handlePrimaryClick = async () => {
    triggerHaptic("selection");
    const isTouchDevice =
      typeof window !== "undefined" &&
      (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768);

    // On phones/tablets, launch the native OS share sheet directly (WhatsApp, Messages, AirDrop, etc.)
    if (isTouchDevice && typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: SHARE_TITLE,
          text: SHARE_TEXT,
          url: SHARE_URL
        });
        return;
      } catch (err: any) {
        // If user explicitly dismissed the native sheet, do not force fallback modal open
        if (err?.name === "AbortError") return;
      }
    }

    // On desktop (or browsers without Web Share API), toggle clean share menu
    setMenuOpen((prev) => !prev);
  };

  const handleWhatsAppShare = () => {
    triggerHaptic("selection");
    const waText = encodeURIComponent(`${SHARE_TEXT}\n\n${SHARE_URL}`);
    window.open(`https://wa.me/?text=${waText}`, "_blank", "noopener,noreferrer");
    setMenuOpen(false);
  };

  const handleCopy = (mode: "link" | "message") => {
    triggerHaptic("success");
    const payload = mode === "link" ? SHARE_URL : `${SHARE_TEXT}\n\n${SHARE_URL}`;
    navigator.clipboard?.writeText(payload).catch(() => {});
    setCopiedMode(mode);
    setTimeout(() => {
      setCopiedMode(null);
      setMenuOpen(false);
    }, 1500);
  };

  const handleNativeShareFromMenu = async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: SHARE_TITLE,
          text: SHARE_TEXT,
          url: SHARE_URL
        });
        setMenuOpen(false);
      } catch {
        // ignore cancel
      }
    }
  };

  return (
    <div ref={containerRef} className="relative font-sans">
      <button
        type="button"
        onClick={handlePrimaryClick}
        title="Share The Win Concept with friends"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
          menuOpen
            ? "bg-sky-500/20 border-sky-400 text-sky-200"
            : "bg-slate-900/70 border-white/10 text-slate-200 hover:text-white hover:border-sky-400/50 hover:bg-slate-800"
        }`}
      >
        <Share2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        <span>Share</span>
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[75] sm:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed inset-x-4 top-28 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72 p-3.5 rounded-xl bg-[#0b1120] border border-white/15 shadow-2xl z-[80] space-y-2.5">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-sm font-bold text-white">Share The Win Concept</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close share menu"
                className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Send the app link to friends so they can check exact odds, compare ticket budgets, and remove overlapping plays.
            </p>

            <div className="space-y-1.5 pt-0.5">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Share on WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopy("link")}
                className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-100 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {copiedMode === "link" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Link Copied</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Copy App Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleCopy("message")}
                className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {copiedMode === "message" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Message Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Message and Link</span>
                  </>
                )}
              </button>

              {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                <button
                  type="button"
                  onClick={handleNativeShareFromMenu}
                  className="w-full py-2 px-3 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-white/10 text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>More Share Options</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
