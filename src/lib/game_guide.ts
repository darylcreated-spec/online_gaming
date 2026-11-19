export interface GameGuideInfo {
  key: "play-whe" | "cashpot" | "lotto-plus" | "win-for-life" | "pick4" | "fast-cash";
  name: string;
  tagline: string;
  costPerPlay: string;
  costDetail: string;
  topPrize: string;
  odds: string;
  schedule: string;
  howToPlay: string[];
  bestFor: string;
  themeColor: "amber" | "yellow" | "sky" | "emerald" | "purple" | "cyan";
  iconSrc: string;
}

export const NLCB_GAME_GUIDE: GameGuideInfo[] = [
  {
    key: "play-whe",
    name: "Play Whe",
    tagline: "Pick 1 mark from 1 to 36",
    costPerPlay: "From $1 TT / mark",
    costDetail: "Choose your stake ($1, $2, $5, $10+ per mark) at any NLCB agent.",
    topPrize: "26x (or 24x) your stake",
    odds: "1 in 36",
    schedule: "Mon–Sat: 10:30 AM, 1:00 PM, 4:00 PM, 7:00 PM",
    howToPlay: [
      "Pick 1 number (1–36) or use the Top Trio for wider coverage.",
      "Tell the NLCB booth agent your mark number and bet amount (e.g. $5 on #8 Tiger).",
      "Check results after the 10:30 AM, 1:00 PM, 4:00 PM, or 7:00 PM draw."
    ],
    bestFor: "Low-budget daily play & quick payouts",
    themeColor: "amber",
    iconSrc: "/images/play_whe_icon.png"
  },
  {
    key: "cashpot",
    name: "Cash Pot",
    tagline: "5 balls (1–20) + Multiplier",
    costPerPlay: "$5.00 TT / slip",
    costDetail: "$5.00 TT per play with Multiplier included; 1, 3, or 5 consecutive draws ($5–$25 TT).",
    topPrize: "$100,000 TT (up to $500,000 TT w/ 5x)",
    odds: "1 in 15,504 (5/5)",
    schedule: "Mon–Sat: 10:30 AM & 7:00 PM",
    howToPlay: [
      "Pick 5 numbers from 1 to 20 (or use our 10-slip covering wheel for $50 TT).",
      "Pay $5.00 TT per slip at an NLCB booth; optionally play 3 or 5 draws ahead.",
      "Match 3, 4, or 5 balls to win — the draw Multiplier boosts non-jackpot & top tiers."
    ],
    bestFor: "Best odds for a $100K+ 5-ball prize",
    themeColor: "yellow",
    iconSrc: "/images/cash_pot_icon.png"
  },
  {
    key: "lotto-plus",
    name: "Lotto Plus",
    tagline: "5 balls (1–35) + 1 Powerball (1–10)",
    costPerPlay: "$5.00 TT / play",
    costDetail: "$5.00 TT per board (+ Multiplier option on select plays). Budget wheels: 3–10 slips ($15–$50 TT).",
    topPrize: "Multi-Million TTD Jackpot",
    odds: "1 in 3,246,320 (Jackpot)",
    schedule: "Wed & Sat: 8:30 PM",
    howToPlay: [
      "Pick 5 main numbers (1–35) plus 1 Powerball (1–10).",
      "Play single lines ($5 TT) or a budget covering wheel at your NLCB retailer.",
      "Match 3+ balls or Powerball combinations to win cash prizes up to the Jackpot."
    ],
    bestFor: "Biggest life-changing TTD jackpots",
    themeColor: "sky",
    iconSrc: "/images/lotto_plus_icon.png"
  },
  {
    key: "win-for-life",
    name: "Win For Life",
    tagline: "6 balls (1–28) + 1 Cash Ball (1–10)",
    costPerPlay: "$10.00 TT / line",
    costDetail: "$10.00 TT per line. Budget wheels: 3 lines ($30 TT), 5 lines ($50 TT), 10 lines ($100 TT).",
    topPrize: "$20,000 TT / month for 20 years",
    odds: "1 in 3,767,400 (Top Prize)",
    schedule: "Tue & Fri: 7:00 PM",
    howToPlay: [
      "Pick 6 numbers from 1 to 28 and 1 Cash Ball from 1 to 10.",
      "Each line costs $10.00 TT at any NLCB Lotto booth.",
      "Match 3+ balls to win fixed prizes, or all 6 + Cash Ball for the 20-year annuity."
    ],
    bestFor: "Long-term monthly income jackpot",
    themeColor: "emerald",
    iconSrc: "/images/win_for_life_icon.png"
  },
  {
    key: "pick4",
    name: "Pick 4",
    tagline: "4 digits (0–9) Straight or Box",
    costPerPlay: "From $2.00 TT / play",
    costDetail: "Choose Straight (exact order) or Box (any order) at $2, $5, or $10 TT per slip.",
    topPrize: "Up to $5,000 TT (Straight)",
    odds: "1 in 10,000 (Straight)",
    schedule: "Mon–Sat: 10:30 AM, 1:00 PM, 4:00 PM, 7:00 PM",
    howToPlay: [
      "Pick four digits from 0 to 9 (e.g. 4-1-8-2).",
      "Choose Straight (exact order, highest payout) or Box (any order, easier hit).",
      "Play 4 times daily Mon–Sat at any NLCB agent."
    ],
    bestFor: "Flexible Straight & Box digit strategies",
    themeColor: "purple",
    iconSrc: "/images/pick_four_icon.png"
  },
  {
    key: "fast-cash",
    name: "Fast Cash",
    tagline: "Rapid 5-minute NLCB draws",
    costPerPlay: "From $5.00 TT / play",
    costDetail: "Fast-paced 5-minute draw intervals available at NLCB Fast Cash terminals.",
    topPrize: "Instant tiered payouts",
    odds: "Varies by spot selection",
    schedule: "Every 5 minutes daily",
    howToPlay: [
      "Select your spot numbers based on recent 5-minute draw momentum.",
      "Place your slip at an NLCB Fast Cash booth before the 5-minute cutoff.",
      "Track live draws and hit frequency right inside the Fast Cash tab."
    ],
    bestFor: "Rapid-fire 5-minute draw tracking",
    themeColor: "cyan",
    iconSrc: "/images/fast_cash_icon.png"
  }
];

export const GAME_GUIDE_MAP: Record<GameGuideInfo["key"], GameGuideInfo> = Object.fromEntries(
  NLCB_GAME_GUIDE.map((g) => [g.key, g])
) as Record<GameGuideInfo["key"], GameGuideInfo>;
