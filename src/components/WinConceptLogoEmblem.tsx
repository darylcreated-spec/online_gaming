"use client";

import React, { useState } from "react";
import { triggerHaptic } from "@/lib/haptics";

interface WinConceptLogoEmblemProps {
  size?: "sm" | "md" | "lg" | "xl";
  showLabel?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function WinConceptLogoEmblem({
  size = "sm",
  showLabel = false,
  className = "",
  onClick
}: WinConceptLogoEmblemProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Dimensions mapping
  const sizeMap = {
    sm: "w-9 h-9 sm:w-10 sm:h-10",
    md: "w-14 h-14",
    lg: "w-20 h-20 sm:w-24 sm:h-24",
    xl: "w-28 h-28 sm:w-32 sm:h-32"
  };

  const imageSizeMap = {
    sm: "w-9 h-9 sm:w-10 sm:h-10",
    md: "w-14 h-14",
    lg: "w-20 h-20 sm:w-24 sm:h-24",
    xl: "w-28 h-28 sm:w-32 sm:h-32"
  };

  const handleClick = () => {
    triggerHaptic("light");
    if (onClick) onClick();
  };

  return (
    <div 
      className={`relative inline-flex items-center gap-3 group select-none ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* 3D Kinetic Emblem Container */}
      <div className={`relative ${sizeMap[size]} flex items-center justify-center`}>
        
        {/* Ambient Multi-Spectral Neon Glow Bloom (Pulsing Layer) */}
        <div 
          className={`absolute -inset-1.5 rounded-full bg-gradient-to-tr from-sky-500/40 via-amber-500/30 to-sky-400/40 blur-md transition-all duration-700 pointer-events-none ${
            isHovered 
              ? "opacity-100 scale-110 blur-lg shadow-[0_0_30px_rgba(56,189,248,0.6),0_0_20px_rgba(245,158,11,0.5)]" 
              : "opacity-75 animate-pulse"
          }`}
          aria-hidden="true"
        />

        {/* Static Precision Border Rim */}
        <div 
          className="absolute -inset-0.5 rounded-full border border-sky-400/30 pointer-events-none"
          aria-hidden="true"
        />

        {/* Enhanced 3D Blender-Grade Logo Asset */}
        <div className="relative z-10 w-full h-full rounded-full overflow-hidden flex items-center justify-center shadow-[inset_0_0_12px_rgba(2,6,23,0.8),0_4px_16px_rgba(0,0,0,0.6)] border border-sky-400/40 bg-slate-950/80 transition-transform duration-300 group-hover:scale-105">
          <img
            src="/images/win_concept_logo_enhanced.png"
            alt="The Win Concept Enhanced Logo"
            className={`${imageSizeMap[size]} object-contain filter drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]`}
          />
        </div>

        {/* Dynamic Specular Lens Glare Ping */}
        <div 
          className="absolute top-1 left-2 w-2.5 h-1.5 rounded-full bg-white/40 blur-[1px] rotate-[-30deg] pointer-events-none z-20"
          aria-hidden="true"
        />
      </div>

      {/* Optional Integrated Text Lockup */}
      {showLabel && (
        <div className="flex flex-col">
          <span className="text-base sm:text-lg font-black tracking-widest text-white uppercase font-mono drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]">
            The Win Concept
          </span>
          <span className="text-[10px] tracking-wider text-sky-400 font-mono font-semibold uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            Your Online Gaming Resource
          </span>
        </div>
      )}
    </div>
  );
}
