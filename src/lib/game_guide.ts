export interface BudgetTierPoint {
  slips: number;
  label: string;
  costTT: number;
  anyPrizePct: number;       // Exact mathematical probability of winning at least 1 real NLCB prize
  naiveOverlapPct?: number;  // Standard random or overlapping baseline for visual comparison
  tier2Pct?: number;         // Exact secondary prize tier probability
  tier2Label?: string;
  jackpotOdds: string;       // Exact jackpot or top prize odds string
  note: string;              // Plain-English explanation of this budget tier
  steinerSupported?: boolean; // Whether inline zero-overlap slip generation is available
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
    tagline: "Pick 5 numbers from 1 to 20 with Multiplier",
    costPerPlay: "$5.00 per slip",
    unitCostTT: 5,
    costDetail: "$4.00 base play plus $1.00 for the Multiplier ($5.00 TTD per slip). Monday, Thursday, and Saturday are Sure Call days where the Multiplier is always 2 to 4 times.",
    topPrize: "Shared Jackpot (Match all 5)",
    odds: "1 in 15,504 for all 5 numbers",
    schedule: "Daily at 7:00 PM (except religious holidays)",
    whatWins: "Match 3 numbers ($5 base times the Multiplier), Match 4 numbers (shared prize times the Multiplier), or Match all 5 numbers for the Jackpot (no Multiplier).",
    whatPaysZero: "Matching 0, 1, or 2 numbers pays $0.",
    mathEdgeSummary: "Removing repeated pairs between slips (at most 1 shared number between any two slips, covering all 20 numbers) reaches the highest possible 63.34% chance of matching 3 or more numbers on 10 slips (9.5% higher than overlapping slips). Playing on Monday, Thursday, or Saturday Sure Call days raises the average Multiplier payout by 56%.",
    howToPlay: [
      "Choose a budget tier (5, 10, 15, or 20 non-overlapping slips) at $5.00 TTD per slip with the Multiplier included.",
      "Focus on Monday, Thursday, or Saturday Sure Call draws where the Multiplier has historically been 2 to 4 times (2.95 times average, never 1 time).",
      "Play your generated slips at any official NLCB booth and check results after the 7:00 PM draw."
    ],
    bestFor: "Highest 5-number prize odds and Monday, Thursday, Saturday Multiplier value",
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
        tier2Label: "Match 4 or more",
        jackpotOdds: "1 in 15,504",
        note: "One 5-number slip covers 1,126 winning combinations out of 15,504 possible draws."
      },
      {
        slips: 5,
        label: "5 Slips",
        costTT: 25,
        anyPrizePct: 35.15,
        naiveOverlapPct: 31.4,
        tier2Pct: 2.45,
        tier2Label: "Match 4 or more",
        jackpotOdds: "1 in 3,101",
        note: "Zero-overlap design with at most 1 shared number between any two slips. Covers 5,450 of 15,504 possible draws.",
        steinerSupported: true
      },
      {
        slips: 10,
        label: "10 Slips",
        costTT: 50,
        anyPrizePct: 63.34,
        naiveOverlapPct: 53.81,
        tier2Pct: 4.90,
        tier2Label: "Match 4 or more",
        jackpotOdds: "1 in 1,550",
        note: "Highest possible coverage for 10 slips: covers 9,820 of 15,504 draws, uses all 20 numbers, and never repeats any pair.",
        steinerSupported: true
      },
      {
        slips: 15,
        label: "15 Slips",
        costTT: 75,
        anyPrizePct: 84.56,
        naiveOverlapPct: 68.2,
        tier2Pct: 7.35,
        tier2Label: "Match 4 or more",
        jackpotOdds: "1 in 1,034",
        note: "Highest possible coverage for 15 slips: covers 13,110 of 15,504 draws with at most 1 shared number. Best suited for Sure Call nights.",
        steinerSupported: true
      },
      {
        slips: 20,
        label: "20 Slips",
        costTT: 100,
        anyPrizePct: 94.92,
        naiveOverlapPct: 77.9,
        tier2Pct: 9.80,
        tier2Label: "Match 4 or more",
        jackpotOdds: "1 in 775",
        note: "Covers 14,717 of 15,504 possible draws for matching 3 or more numbers. Ideal for splitting $50 each with a group partner.",
        steinerSupported: true
      }
    ]
  },
  {
    key: "lotto-plus",
    name: "Lotto Plus",
    shortName: "Lotto Plus",
    tagline: "Pick 5 numbers from 1 to 35 plus 1 Powerball from 1 to 10",
    costPerPlay: "$5.00 per play",
    unitCostTT: 5,
    costDetail: "$5.00 TTD per play. Playing 10 tickets and assigning every Powerball from 1 to 10 once guarantees you match the Powerball every draw.",
    topPrize: "Multi-Million TTD Jackpot",
    odds: "1 in 3,246,320 for 5 numbers plus Powerball",
    schedule: "Wednesday and Saturday at 8:30 PM",
    whatWins: "Match 1 plus Powerball ($5), 2 plus Powerball ($10), 3 main ($25), 3 plus Powerball ($100), 4 main ($300), 4 plus Powerball ($1,500), 5 main, or 5 plus Powerball for the Jackpot.",
    whatPaysZero: "Matching 0, 1, or 2 main numbers without the Powerball pays $0.",
    mathEdgeSummary: "Removing repeated pairs covers all 35 main numbers and assigns every Powerball from 1 to 10 once across 10 plays. That lifts your real chance of winning any prize from 38.2% to 62.93% (24.7% higher) without blocking any jackpot number.",
    howToPlay: [
      "Pick 5 main numbers from 1 to 35 plus 1 Powerball from 1 to 10 at $5.00 TTD per play.",
      "When playing 10 plays ($50 TTD), assign each Powerball from 1 to 10 once so you are guaranteed to match the Powerball.",
      "Include numbers above 12 rather than only calendar dates to reduce the chance of sharing a jackpot."
    ],
    bestFor: "Multi-million TTD jackpots with all 10 Powerballs covered",
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
        tier2Label: "Match 3 or more",
        jackpotOdds: "1 in 3,246,320",
        note: "One play gives a 10% chance of matching the Powerball and a 6.86% total chance of winning any prize."
      },
      {
        slips: 5,
        label: "5 Plays",
        costTT: 25,
        anyPrizePct: 34.80,
        naiveOverlapPct: 26.5,
        tier2Pct: 6.95,
        tier2Label: "Match 3 or more",
        jackpotOdds: "1 in 649,264",
        note: "Non-overlapping main numbers paired with 5 different Powerballs for a 50% guaranteed Powerball match.",
        steinerSupported: true
      },
      {
        slips: 10,
        label: "10 Plays",
        costTT: 50,
        anyPrizePct: 62.93,
        naiveOverlapPct: 38.24,
        tier2Pct: 13.68,
        tier2Label: "Match 3 or more",
        jackpotOdds: "1 in 324,632",
        note: "Covers all 35 main numbers with at most 1 shared number between slips, plus every Powerball from 1 to 10 for a 100% Powerball match.",
        steinerSupported: true
      }
    ]
  },
  {
    key: "win-for-life",
    name: "Win For Life",
    shortName: "Win For Life",
    tagline: "Pick 6 numbers from 1 to 28 plus 1 Cash Ball from 1 to 10",
    costPerPlay: "$10.00 per line",
    unitCostTT: 10,
    costDetail: "$10.00 TTD per line. A 10-line non-overlapping set covers all 28 main numbers with zero repeated pairs and covers all 10 Cash Balls.",
    topPrize: "$20,000 per month for 20 years",
    odds: "1 in 3,767,400 for 6 numbers plus Cash Ball",
    schedule: "Tuesday and Friday at 7:00 PM",
    whatWins: "Match 3 numbers ($25), Match 4 numbers ($100), Match 5 numbers ($1,000), Match 6 numbers, or Match 6 plus the Cash Ball for the Grand Prize.",
    whatPaysZero: "Matching 0, 1, or 2 numbers pays $0.",
    mathEdgeSummary: "A 10-line non-overlapping set reaches a 72.13% chance of matching 3 or more numbers and the exact 9.55% ceiling for matching 4 or more numbers (covering 35,980 of 376,740 draws, at most 1 shared number) plus all 10 Cash Balls from 1 to 10.",
    howToPlay: [
      "Choose 6 numbers from 1 to 28 and 1 Cash Ball from 1 to 10 at $10.00 TTD per line.",
      "Use 5 lines ($50 TTD) or 10 lines ($100 TTD, or split with a group) for maximum non-overlapping coverage.",
      "Check Tuesday and Friday 7:00 PM results right inside the Win For Life tab."
    ],
    bestFor: "High chance of matching 3 or more numbers (72.1%) and monthly grand prize",
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
        tier2Label: "Match 4 or more",
        jackpotOdds: "1 in 3,767,400",
        note: "One 6-number line covers 34,398 winning combinations out of 376,740 possible draws."
      },
      {
        slips: 5,
        label: "5 Lines",
        costTT: 50,
        anyPrizePct: 43.74,
        naiveOverlapPct: 37.9,
        tier2Pct: 4.78,
        tier2Label: "Match 4 or more",
        jackpotOdds: "1 in 753,480",
        note: "Five lines spread evenly across all 28 numbers with almost zero overlap.",
        steinerSupported: true
      },
      {
        slips: 10,
        label: "10 Lines",
        costTT: 100,
        anyPrizePct: 72.13,
        naiveOverlapPct: 60.4,
        tier2Pct: 9.55,
        tier2Label: "Match 4 or more",
        jackpotOdds: "1 in 376,740",
        note: "Zero repeated pairs (at most 1 shared number): covers 271,744 of 376,740 possible draws plus all 10 Cash Balls.",
        steinerSupported: true
      }
    ]
  },
  {
    key: "play-whe",
    name: "Play Whe",
    shortName: "Play Whe",
    tagline: "Pick 1 mark from 1 to 36",
    costPerPlay: "From $1.00 per mark",
    unitCostTT: 1,
    costDetail: "Bet $1, $2, $5, or more on each separate mark. Fixed payout of 26 times (or 24 times) your stake with 4 draws every day from Monday to Saturday.",
    topPrize: "26 times (or 24 times) your stake",
    odds: "1 in 36 per mark",
    schedule: "Monday to Saturday at 10:30 AM, 1:00 PM, 4:00 PM, and 7:00 PM",
    whatWins: "Matching any mark you played (from 1 to 36) pays 26 times (or 24 times) the stake on that mark.",
    whatPaysZero: "Any mark that is not drawn pays $0.",
    mathEdgeSummary: "Each separate mark has an exact 2.78% chance to win. Playing 5 different marks lifts your single-draw win chance to 13.89% (a 5.2 times return when 1 hits). Avoid betting twice on the same mark if your goal is hitting more often.",
    howToPlay: [
      "Choose 1, 3, 5, or 10 different marks from 1 to 36 based on your session budget.",
      "Tell the NLCB agent your mark numbers and bet amount per mark (for example, $2 each on 5 marks equals $10 TTD).",
      "Draws run 4 times daily from Monday to Saturday at 10:30 AM, 1:00 PM, 4:00 PM, and 7:00 PM."
    ],
    bestFor: "Lowest entry cost ($1.00) and 4 draws every day",
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
        tier2Label: "26 times payout",
        jackpotOdds: "1 in 36",
        note: "Highest payout per dollar spent (26 times your stake), with a 1 in 36 chance per draw."
      },
      {
        slips: 3,
        label: "3 Marks",
        costTT: 3,
        anyPrizePct: 8.33,
        tier2Pct: 8.33,
        tier2Label: "8.67 times return",
        jackpotOdds: "1 in 12",
        note: "3 different marks ($1 each equals $3 TTD) for an 8.33% chance to hit each draw."
      },
      {
        slips: 5,
        label: "5 Marks",
        costTT: 5,
        anyPrizePct: 13.89,
        tier2Pct: 13.89,
        tier2Label: "5.2 times return",
        jackpotOdds: "1 in 7.2",
        note: "5 different marks ($1 each equals $5 TTD). Gives a 13.89% chance per draw, or 44.3% across all 4 daily draws."
      },
      {
        slips: 10,
        label: "10 Marks",
        costTT: 10,
        anyPrizePct: 27.78,
        tier2Pct: 27.78,
        tier2Label: "2.6 times return",
        jackpotOdds: "1 in 3.6",
        note: "10 different marks ($1 each equals $10 TTD). Hits roughly once every 3.6 draws."
      }
    ]
  },
  {
    key: "pick4",
    name: "Pick 4",
    shortName: "Pick 4",
    tagline: "Pick 4 digits from 0 to 9 in exact order or any order",
    costPerPlay: "From $1.00 per play",
    unitCostTT: 1,
    costDetail: "Play Straight (exact order, 1 in 10,000) or a 24-Way or 12-Way Box (any order) starting from $1.00 TTD ($1, $2, $5, or $10).",
    topPrize: "Up to $5,000 TTD (Exact Order)",
    odds: "1 in 10,000 (Exact Order) or 1 in 417 (24-Way Box)",
    schedule: "Monday to Saturday at 10:30 AM, 1:00 PM, 4:00 PM, and 7:00 PM",
    whatWins: "Straight (exact order), Box (your 4 digits in any order), or Front and Back Pair plays.",
    whatPaysZero: "Digits in the wrong order on a Straight play, or non-matching digits on a Box play, pay $0.",
    mathEdgeSummary: "Switching from Straight (0.01% chance) to a 24-Way Box with 4 different digits makes hitting 24 times easier (0.24% per slip). Playing 4 separate 24-Way Boxes ($4 TTD) covers 96 of 10,000 possible draws (0.96%).",
    howToPlay: [
      "Choose 4 digits from 0 to 9 and decide between Straight (exact order) or Box (any order).",
      "For a 24-Way Box, pick 4 different digits (such as 1, 4, 7, 9) so all 24 possible orders win.",
      "Place your slip starting from $1.00 TTD at any NLCB booth for any of the 4 daily draws."
    ],
    bestFor: "Choosing between a big exact-order prize or 24 times easier any-order wins",
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
        note: "Highest payout per dollar ($1.00 TTD base), but your 4 digits must match in exact order (1 in 10,000)."
      },
      {
        slips: 1,
        label: "1 Box (24-Way)",
        costTT: 1,
        anyPrizePct: 0.24,
        tier2Pct: 0.24,
        tier2Label: "Any Order",
        jackpotOdds: "1 in 417",
        note: "4 different digits in any order ($1.00 TTD base). 24 times higher chance to win than Straight."
      },
      {
        slips: 4,
        label: "4 Separate Boxes",
        costTT: 4,
        anyPrizePct: 0.96,
        tier2Pct: 0.96,
        tier2Label: "96 Combinations",
        jackpotOdds: "1 in 104",
        note: "4 different 24-Way Boxes ($1 each equals $4 TTD) covering 96 of 10,000 possible draws."
      },
      {
        slips: 10,
        label: "10 Separate Boxes",
        costTT: 10,
        anyPrizePct: 2.40,
        tier2Pct: 2.40,
        tier2Label: "240 Combinations",
        jackpotOdds: "1 in 42",
        note: "10 different 24-Way Boxes ($1 each equals $10 TTD) covering 240 of 10,000 possible draws."
      }
    ]
  },
  {
    key: "fast-cash",
    name: "Fast Cash",
    shortName: "Fast Cash",
    tagline: "38 numbers (0, 00, and 1 to 36) drawn every 3 minutes",
    costPerPlay: "From $1.00 per play",
    unitCostTT: 1,
    costDetail: "Base play starts at $1.00 TTD per slip on a 38-number board (0, 00, and 1 to 36), with a new draw every 3 minutes daily.",
    topPrize: "Instant tiered payouts",
    odds: "1 in 38 per single number",
    schedule: "Every 3 minutes daily",
    whatWins: "Matching your chosen single numbers, board section, or outside bet.",
    whatPaysZero: "Any uncovered number out of 38 (including 0 and 00 on even-money bets) pays $0.",
    mathEdgeSummary: "Your chance of winning grows directly with how many different numbers you cover: 1 number is 2.63%, 5 numbers is 13.16%, 10 numbers is 26.32%, and 14 numbers is 36.84%. Set a strict spending limit because draws happen every 3 minutes.",
    howToPlay: [
      "Decide your spending limit first because 3-minute draws run 20 times every hour.",
      "Pick single numbers ($1.00 TTD base each) or wider board coverage inside the Fast Cash section.",
      "Track live 3-minute draw results and recent history inside the Fast Cash tab."
    ],
    bestFor: "Fast draws every 3 minutes starting at $1.00",
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
        tier2Label: "1 of 38 Numbers",
        jackpotOdds: "1 in 38",
        note: "One single number ($1.00 TTD base) gives an exact 1 in 38 chance to win."
      },
      {
        slips: 5,
        label: "5 Numbers",
        costTT: 5,
        anyPrizePct: 13.16,
        tier2Pct: 13.16,
        tier2Label: "5 of 38 Numbers",
        jackpotOdds: "1 in 7.6",
        note: "5 different numbers ($5.00 TTD) give a 13.16% chance to hit every 3 minutes."
      },
      {
        slips: 10,
        label: "10 Numbers",
        costTT: 10,
        anyPrizePct: 26.32,
        tier2Pct: 26.32,
        tier2Label: "10 of 38 Numbers",
        jackpotOdds: "1 in 3.8",
        note: "10 different numbers ($10.00 TTD) cover more than a quarter of the 38-number board."
      },
      {
        slips: 14,
        label: "14 Numbers",
        costTT: 14,
        anyPrizePct: 36.84,
        tier2Pct: 36.84,
        tier2Label: "14 of 38 Numbers",
        jackpotOdds: "1 in 2.7",
        note: "14 different numbers ($14.00 TTD) give a 36.84% single-draw win chance."
      }
    ]
  }
];

export const GAME_GUIDE_MAP: Record<GameGuideInfo["key"], GameGuideInfo> = Object.fromEntries(
  NLCB_GAME_GUIDE.map((g) => [g.key, g])
) as Record<GameGuideInfo["key"], GameGuideInfo>;
