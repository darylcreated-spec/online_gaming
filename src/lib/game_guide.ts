export interface BudgetTierPoint {
  slips: number;
  label: string;
  costTT: number;
  anyPrizePct: number;       // Exact mathematical probability of winning >= 1 real NLCB prize
  naiveOverlapPct?: number;  // Standard random / overlapping / unstratified baseline for visual comparison
  tier2Pct?: number;         // Exact Match 4+ or Secondary Tier probability
  tier2Label?: string;
  jackpotOdds: string;       // Exact Jackpot / Top Prize odds string
  note: string;              // Crisp mathematical explanation of this tier
  steinerSupported?: boolean; // Whether inline Steiner-Johnson slip generation is available
}

export interface GameGuideInfo {
  key: "cashpot" | "lotto-plus" | "win-for-life" | "play-whe" | "pick4" | "fast-cash";
  name: string;
  shortName: string;
  tagline: string;
  costPerPlay: string;
  unitCostTT: number;
  costDetail: string;
  topPrize: string;
  odds: string;
  schedule: string;
  whatWins: string;
  whatPaysZero: string;
  mathEdgeSummary: string;
  howToPlay: string[];
  bestFor: string;
  themeColor: "amber" | "yellow" | "sky" | "emerald" | "purple" | "cyan";
  iconSrc: string;
  defaultTierIndex: number;
  budgetCurve: BudgetTierPoint[];
}

export const NLCB_GAME_GUIDE: GameGuideInfo[] = [
  {
    key: "cashpot",
    name: "Cash Pot",
    shortName: "Cash Pot",
    tagline: "5 of 20 balls + Multiplier",
    costPerPlay: "$5.00 TT / slip",
    unitCostTT: 5,
    costDetail: "$4.00 TT base + $1.00 TT Multiplier ($5.00 TT/slip). Mon/Thu/Sat are Sure Call days (100% 2x–4x Multiplier).",
    topPrize: "Pari-Mutuel Jackpot (5/5)",
    odds: "1 in 15,504 (5/5)",
    schedule: "Mon–Sat: 7:00 PM (and morning draws)",
    whatWins: "Match 3 ($5 base × mult), Match 4 (pari-mutuel × mult), Match 5 Jackpot (no mult).",
    whatPaysZero: "Match 0, 1, or 2 pays $0 TT.",
    mathEdgeSummary: "Steiner-Johnson Zero-Pair-Overlap packing (MaxOverlap ≤ 1, 20/20 balls) hits the exact 63.34% Match 3+ ceiling on 10 slips (+9.5% vs overlapping cores), while Mon/Thu/Sat Sure Call boosts expected Multiplier payout by +56%.",
    howToPlay: [
      "Pick a budget tier (5, 10, 15, or 20 Steiner-Johnson slips) at $5.00 TT per slip with Multiplier.",
      "Prioritize Mon, Thu, or Sat Sure Call draws where historical Multiplier is 2x–4x (2.95x avg, zero 1x).",
      "Play your generated zero-overlap slips at any official NLCB booth and check results after the draw."
    ],
    bestFor: "Highest 5-ball prize odds & Mon/Thu/Sat Multiplier EV",
    themeColor: "yellow",
    iconSrc: "/images/cash_pot_icon.png",
    defaultTierIndex: 2,
    budgetCurve: [
      {
        slips: 1,
        label: "1 Slip",
        costTT: 5,
        anyPrizePct: 7.26,
        naiveOverlapPct: 7.26,
        tier2Pct: 0.49,
        tier2Label: "Match 4+",
        jackpotOdds: "1 in 15,504",
        note: "Single 5-ball board. 1,126 winning combinations out of 15,504."
      },
      {
        slips: 5,
        label: "5 Slips",
        costTT: 25,
        anyPrizePct: 35.15,
        naiveOverlapPct: 31.4,
        tier2Pct: 2.45,
        tier2Label: "Match 4+",
        jackpotOdds: "1 in 3,101",
        note: "Exact Steiner J*(20,5;5) — MaxOverlap ≤ 1, covers 5,450 / 15,504 draws.",
        steinerSupported: true
      },
      {
        slips: 10,
        label: "10 Slips",
        costTT: 50,
        anyPrizePct: 63.34,
        naiveOverlapPct: 53.81,
        tier2Pct: 4.90,
        tier2Label: "Match 4+",
        jackpotOdds: "1 in 1,550",
        note: "Global Mathematical Ceiling: 9,820 / 15,504 draws, 20/20 balls, zero shared pairs.",
        steinerSupported: true
      },
      {
        slips: 15,
        label: "15 Slips",
        costTT: 75,
        anyPrizePct: 84.56,
        naiveOverlapPct: 68.2,
        tier2Pct: 7.35,
        tier2Label: "Match 4+",
        jackpotOdds: "1 in 1,034",
        note: "Global Mathematical Ceiling: 13,110 / 15,504 draws, MaxOverlap ≤ 1. Ideal for Sure Call nights.",
        steinerSupported: true
      },
      {
        slips: 20,
        label: "20 Slips",
        costTT: 100,
        anyPrizePct: 94.92,
        naiveOverlapPct: 77.9,
        tier2Pct: 9.80,
        tier2Label: "Match 4+",
        jackpotOdds: "1 in 775",
        note: "Near-certain Match 3+ (14,717 / 15,504 draws). Great for splitting $50 each with a syndicate partner.",
        steinerSupported: true
      }
    ]
  },
  {
    key: "lotto-plus",
    name: "Lotto Plus",
    shortName: "Lotto Plus",
    tagline: "5 of 35 + 1 of 10 Powerball",
    costPerPlay: "$5.00 TT / play",
    unitCostTT: 5,
    costDetail: "$5.00 TT per play. Full 1–10 Powerball Stratification across 10 plays guarantees 100% Powerball capture.",
    topPrize: "Multi-Million TTD Jackpot",
    odds: "1 in 3,246,320 (5+PB)",
    schedule: "Wed & Sat: 8:30 PM",
    whatWins: "Match 1+PB ($5), 2+PB ($10), 3 ($25), 3+PB ($100), 4 ($300), 4+PB ($1,500), 5, or 5+PB Jackpot.",
    whatPaysZero: "Match 0, 1, or 2 without Powerball pays $0 TT.",
    mathEdgeSummary: "Zero-pair-overlap packing covers all 35/35 main balls AND assigns all 10 distinct Powerballs (1–10), lifting real any-prize odds from 38.2% to 62.93% (+24.7%) with zero Jackpot lockouts.",
    howToPlay: [
      "Pick 5 main numbers (1–35) plus 1 Powerball (1–10) at $5.00 TT per play.",
      "On 10 plays ($50 TT), assign each Powerball 1 through 10 once so you always match the Powerball.",
      "Avoid birthday-only clusters (1–12) to reduce jackpot splitting if you win."
    ],
    bestFor: "Multi-million TTD jackpots with 10-PB stratification",
    themeColor: "sky",
    iconSrc: "/images/lotto_plus_icon.png",
    defaultTierIndex: 2,
    budgetCurve: [
      {
        slips: 1,
        label: "1 Play",
        costTT: 5,
        anyPrizePct: 6.86,
        naiveOverlapPct: 6.86,
        tier2Pct: 1.39,
        tier2Label: "Match 3+ Main",
        jackpotOdds: "1 in 3,246,320",
        note: "Single board: 10% chance of Powerball match, 6.86% total chance of any prize."
      },
      {
        slips: 5,
        label: "5 Plays",
        costTT: 25,
        anyPrizePct: 34.80,
        naiveOverlapPct: 26.5,
        tier2Pct: 6.95,
        tier2Label: "Match 3+ Main",
        jackpotOdds: "1 in 649,264",
        note: "Zero-overlap main balls + 5 distinct Powerballs (50% guaranteed PB match).",
        steinerSupported: true
      },
      {
        slips: 10,
        label: "10 Plays",
        costTT: 50,
        anyPrizePct: 62.93,
        naiveOverlapPct: 38.24,
        tier2Pct: 13.68,
        tier2Label: "Match 3+ Main",
        jackpotOdds: "1 in 324,632",
        note: "All 35/35 balls (MaxOverlap ≤ 1) + Full 1–10 Powerball Stratification (100% PB guarantee).",
        steinerSupported: true
      }
    ]
  },
  {
    key: "win-for-life",
    name: "Win For Life",
    shortName: "Win For Life",
    tagline: "6 of 28 + 1 of 10 Cash Ball",
    costPerPlay: "$10.00 TT / line",
    unitCostTT: 10,
    costDetail: "$10.00 TT per line. Exact 10-line Steiner packing covers all 28/28 balls with zero shared pairs.",
    topPrize: "$20,000 TT / mo for 20 yrs",
    odds: "1 in 3,767,400 (6+CB)",
    schedule: "Tue & Fri: 7:00 PM",
    whatWins: "Match 3 ($25), Match 4 ($100), Match 5 ($1,000), Match 6, or 6 + Cash Ball Grand Annuity.",
    whatPaysZero: "Match 0, 1, or 2 pays $0 TT.",
    mathEdgeSummary: "Exact Steiner J*(28,6;10) reaches 72.13% Match 3+ and the strict 9.55% Match 4+ ceiling (35,980 / 376,740 draws, MaxOverlap ≤ 1) plus 100% Cash Ball stratification (1–10).",
    howToPlay: [
      "Choose 6 numbers from 1 to 28 and 1 Cash Ball from 1 to 10 at $10.00 TT per line.",
      "Use 5 lines ($50 TT) or 10 lines ($100 TT, or split in a syndicate) to maximize zero-overlap coverage.",
      "Check Tue & Fri 7:00 PM results right inside the Win For Life tab."
    ],
    bestFor: "High Match 3+ density (72.1%) & monthly annuity jackpot",
    themeColor: "emerald",
    iconSrc: "/images/win_for_life_icon.png",
    defaultTierIndex: 2,
    budgetCurve: [
      {
        slips: 1,
        label: "1 Line",
        costTT: 10,
        anyPrizePct: 9.13,
        naiveOverlapPct: 9.13,
        tier2Pct: 0.96,
        tier2Label: "Match 4+",
        jackpotOdds: "1 in 3,767,400",
        note: "Single 6/28 line: 34,398 winning combinations out of 376,740."
      },
      {
        slips: 5,
        label: "5 Lines",
        costTT: 50,
        anyPrizePct: 43.74,
        naiveOverlapPct: 37.9,
        tier2Pct: 4.78,
        tier2Label: "Match 4+",
        jackpotOdds: "1 in 753,480",
        note: "Steiner J*(28,6;5) packing with near-zero overlap across 28 balls.",
        steinerSupported: true
      },
      {
        slips: 10,
        label: "10 Lines",
        costTT: 100,
        anyPrizePct: 72.13,
        naiveOverlapPct: 60.4,
        tier2Pct: 9.55,
        tier2Label: "Match 4+",
        jackpotOdds: "1 in 376,740",
        note: "Exact Zero-Pair-Overlap (MaxOverlap ≤ 1): 271,744 / 376,740 draws + 100% Cash Ball coverage.",
        steinerSupported: true
      }
    ]
  },
  {
    key: "play-whe",
    name: "Play Whe",
    shortName: "Play Whe",
    tagline: "Pick 1 mark from 1 to 36",
    costPerPlay: "From $1 TT / mark",
    unitCostTT: 1,
    costDetail: "Bet $1, $2, $5, or $10+ per distinct mark. Fixed 26:1 (or 24:1) payout with 4 draws daily.",
    topPrize: "26x (or 24x) your stake",
    odds: "1 in 36 per mark",
    schedule: "Mon–Sat: 10:30 AM, 1:00 PM, 4:00 PM, 7:00 PM",
    whatWins: "Exact match on any played mark (1–36) pays 26x (or 24x) that mark's stake.",
    whatPaysZero: "Any non-matching mark pays $0 TT.",
    mathEdgeSummary: "Every mark is mutually exclusive (exact 2.78% per mark). Playing 5 distinct marks lifts single-draw hit odds to 13.89% (5.2x net return when 1 hits); never double-bet the same mark if seeking hit frequency.",
    howToPlay: [
      "Choose 1, 3, 5, or 10 distinct marks from 1 to 36 based on your session budget.",
      "Tell the NLCB agent your mark numbers and stake per mark (e.g. $2 each on 5 marks = $10 TT).",
      "Draws run 4 times daily Mon–Sat at 10:30 AM, 1:00 PM, 4:00 PM, and 7:00 PM."
    ],
    bestFor: "Lowest entry cost ($1 TT) & 4 daily draws",
    themeColor: "amber",
    iconSrc: "/images/play_whe_icon.png",
    defaultTierIndex: 2,
    budgetCurve: [
      {
        slips: 1,
        label: "1 Mark",
        costTT: 1,
        anyPrizePct: 2.78,
        tier2Pct: 2.78,
        tier2Label: "26x Payout",
        jackpotOdds: "1 in 36",
        note: "Highest ROI multiplier on a hit (26x), lowest single-draw hit rate (1 in 36)."
      },
      {
        slips: 3,
        label: "3 Marks",
        costTT: 3,
        anyPrizePct: 8.33,
        tier2Pct: 8.33,
        tier2Label: "8.67x Net",
        jackpotOdds: "1 in 12",
        note: "3 distinct marks ($1 each = $3 TT). 8.33% hit chance per draw."
      },
      {
        slips: 5,
        label: "5 Marks",
        costTT: 5,
        anyPrizePct: 13.89,
        tier2Pct: 13.89,
        tier2Label: "5.2x Net",
        jackpotOdds: "1 in 7.2",
        note: "5 distinct marks ($1 each = $5 TT). 13.89% single-draw, 44.3% over 4 daily draws."
      },
      {
        slips: 10,
        label: "10 Marks",
        costTT: 10,
        anyPrizePct: 27.78,
        tier2Pct: 27.78,
        tier2Label: "2.6x Net",
        jackpotOdds: "1 in 3.6",
        note: "10 distinct marks ($1 each = $10 TT). Hits roughly 1 in every 3.6 draws."
      }
    ]
  },
  {
    key: "pick4",
    name: "Pick 4",
    shortName: "Pick 4",
    tagline: "4 digits (0–9) Straight or Box",
    costPerPlay: "From $1.00 TT / play",
    unitCostTT: 1,
    costDetail: "Play Straight (exact order, 1 in 10,000) or 24-Way / 12-Way Box (any order) starting from $1.00 TT ($1, $2, $5, $10+).",
    topPrize: "Up to $5,000 TT (Straight)",
    odds: "1 in 10,000 (Straight) · 1 in 417 (24-Box)",
    schedule: "Mon–Sat: 10:30 AM, 1:00 PM, 4:00 PM, 7:00 PM",
    whatWins: "Straight (exact order), Box (any order of your 4 digits), or Front/Back Pair plays.",
    whatPaysZero: "Non-matching digit orders (on Straight) or non-matching digit multisets (on Box) pay $0 TT.",
    mathEdgeSummary: "Switching from Straight (0.01%) to a 24-Way Box (4 distinct digits) multiplies your hit probability by 24x (0.24% per slip). Four disjoint 24-Way Boxes ($4 TT) cover 96 of 10,000 outcomes (0.96%).",
    howToPlay: [
      "Choose 4 digits from 0 to 9 and decide between Straight (exact order) or Box (any order).",
      "For 24-Way Box, pick 4 distinct digits (e.g., 1-4-7-9) to maximize permutation coverage (24 ways).",
      "Place your $1.00 TT+ slip at an NLCB booth for any of the 4 daily draws."
    ],
    bestFor: "Choosing between big Straight payout or 24x easier Box hits",
    themeColor: "purple",
    iconSrc: "/images/pick_four_icon.png",
    defaultTierIndex: 1,
    budgetCurve: [
      {
        slips: 1,
        label: "1 Straight",
        costTT: 1,
        anyPrizePct: 0.01,
        tier2Pct: 0.01,
        tier2Label: "Exact Order",
        jackpotOdds: "1 in 10,000",
        note: "Highest payout per dollar ($1.00 TT base), exact order required (1 in 10,000)."
      },
      {
        slips: 1,
        label: "1 Box (24-Way)",
        costTT: 1,
        anyPrizePct: 0.24,
        tier2Pct: 0.24,
        tier2Label: "Any Order",
        jackpotOdds: "1 in 417",
        note: "4 distinct digits in any order ($1.00 TT base) — 24x higher hit rate than Straight."
      },
      {
        slips: 4,
        label: "4 Disjoint Boxes",
        costTT: 4,
        anyPrizePct: 0.96,
        tier2Pct: 0.96,
        tier2Label: "96 Permutations",
        jackpotOdds: "1 in 104",
        note: "4 unique 24-Way Boxes ($1 each = $4 TT) covering 96 of 10,000 draws."
      },
      {
        slips: 10,
        label: "10 Disjoint Boxes",
        costTT: 10,
        anyPrizePct: 2.40,
        tier2Pct: 2.40,
        tier2Label: "240 Permutations",
        jackpotOdds: "1 in 42",
        note: "10 unique 24-Way Boxes ($1 each = $10 TT) covering 240 of 10,000 draws."
      }
    ]
  },
  {
    key: "fast-cash",
    name: "Fast Cash",
    shortName: "Fast Cash",
    tagline: "38-pocket rapid draws every 3 mins",
    costPerPlay: "From $1.00 TT / play",
    unitCostTT: 1,
    costDetail: "Base play starts at $1.00 TT per slip on a 38-state board (0, 00, 1–36), drawing every 3 minutes daily.",
    topPrize: "Instant tiered payouts",
    odds: "1 in 38 per straight number",
    schedule: "Every 3 minutes daily",
    whatWins: "Matching your straight number(s) or covered wheel sector / outside bets.",
    whatPaysZero: "Any uncovered pocket out of 38 (including 0 / 00 on even-money plays) pays $0 TT.",
    mathEdgeSummary: "Exact 38-pocket probability scales linearly with distinct numbers covered: 1 number = 2.63%, 5 numbers = 13.16%, 10 numbers = 26.32%, 14 numbers = 36.84%. Set a strict session stop-loss due to 3-minute speed.",
    howToPlay: [
      "Decide your session budget first — 3-minute draws run 20 times per hour.",
      "Pick straight numbers ($1.00 TT base each) or broader coverage inside the Fast Cash terminal.",
      "Track live 3-minute draw results and session cadence inside the Fast Cash tab."
    ],
    bestFor: "Fast 3-minute draws starting at $1.00 TT",
    themeColor: "cyan",
    iconSrc: "/images/fast_cash_icon.png",
    defaultTierIndex: 1,
    budgetCurve: [
      {
        slips: 1,
        label: "1 Number",
        costTT: 1,
        anyPrizePct: 2.63,
        tier2Pct: 2.63,
        tier2Label: "1 / 38 Pockets",
        jackpotOdds: "1 in 38",
        note: "Single straight pocket ($1.00 TT base). Exact 1 in 38 probability."
      },
      {
        slips: 5,
        label: "5 Numbers",
        costTT: 5,
        anyPrizePct: 13.16,
        tier2Pct: 13.16,
        tier2Label: "5 / 38 Pockets",
        jackpotOdds: "1 in 7.6",
        note: "5 distinct pockets ($5.00 TT). 13.16% hit probability every 3 minutes."
      },
      {
        slips: 10,
        label: "10 Numbers",
        costTT: 10,
        anyPrizePct: 26.32,
        tier2Pct: 26.32,
        tier2Label: "10 / 38 Pockets",
        jackpotOdds: "1 in 3.8",
        note: "10 distinct pockets ($10.00 TT). Covers over a quarter of the 38-pocket board."
      },
      {
        slips: 14,
        label: "14 Numbers",
        costTT: 14,
        anyPrizePct: 36.84,
        tier2Pct: 36.84,
        tier2Label: "14 / 38 Pockets",
        jackpotOdds: "1 in 2.7",
        note: "14 distinct pockets ($14.00 TT). 36.84% single-draw hit rate."
      }
    ]
  }
];

export const GAME_GUIDE_MAP: Record<GameGuideInfo["key"], GameGuideInfo> = Object.fromEntries(
  NLCB_GAME_GUIDE.map((g) => [g.key, g])
) as Record<GameGuideInfo["key"], GameGuideInfo>;
