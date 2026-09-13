# 🎲 THE WIN CONCEPT — Caribbean Gaming & Lottery Analytics Platform

A high-performance, real-time statistical tracking, combinatorial optimization, and mathematical prediction platform for the **National Lotteries Control Board (NLCB)** games in Trinidad & Tobago.

Built with **Next.js 16 (Turbopack)**, **Tailwind CSS**, **LibSQL / Turso Cloud SQLite**, and custom **stochastic prediction engines**.

---

## 🚀 Key Features

### 1. Multi-Game 5-in-1 Command Center
Real-time tracking and deep analytics across all 5 official NLCB games:
* **Play Whe**: 1–36 single ball, traditional Chinapoo marks, 4 daily draws (Morning, Midday, Afternoon, Evening, including Sunday schedules).
* **Lotto Plus**: 5 of 36 + Powerball (1–10) + Multiplier, drawn Wednesdays & Saturdays.
* **Win For Life**: 6 of 28 + Cash Ball (1–3), drawn Tuesdays & Fridays with $20,000/month top prize tracking.
* **Cash Pot**: 5 of 20 with 1X–5X Multiplier, drawn daily at 7:00 PM.
* **Pick 4**: 4-digit independent chamber (0000–9999), 4 daily draws with Straight & Box (4-way, 6-way, 12-way, 24-way) Expected Value (EV) optimization.

---

### 2. Rigorous Mathematical Prediction Engines (No AI Spindle / Gimmicks)
All mathematical recommendations on the dashboard are **100% grounded in the historical winning numbers stored in the database**:

* **Play Whe**:
  * **1st & 2nd-Order Markov Transition Kernels**: Evaluates historical ball transition matrices ($36 \times 36$) to compute Maximum A Posteriori (MAP) successor probabilities from the latest drawn mark.
  * **Dirichlet-Multinomial Bayesian Updating**: Continuously recalibrates probability masses across 19,700+ historical draws.
* **Lotto Plus**:
  * **Gaussian Centroid Sum Bands**: Restricts recommendations to the 68% bell curve around $\mu = 92.5, \sigma = 21.6$.
  * **Schönheim Minimum Covering Bound $L(v, k, t)$**: Computes abbreviated wheeling systems that mathematically guarantee prize tier matches.
* **Win For Life**:
  * **Jaccard Graph Adjacency Companion Matrix**: Mines co-occurrence network edges and companion affinities across the 6/28 pool.
* **Cash Pot**:
  * **Hypergeometric Probability Mass Function**: Leverages the $80.5\%$ empirical probability of 1–2 repeating anchor balls from the prior draw.
* **Pick 4**:
  * **Positional Chamber Transition Matrices**: Multiplies 4 independent $10 \times 10$ transition vectors to find optimal Straight candidates and high-EV Box permutations.

---

### 3. Interactive 3D Physics Tumbler (Quick Pick Generator)
* Custom-crafted tumbler simulation positioned on the dashboard.
* Uses official physical ball colors (white, red, blue, green, yellow).
* Smooth real-time ball drop animation with dynamic game switching for all 5 lottery formats.

---

### 4. Automated Cloud Synchronization & Database
* **Turso Cloud DB**: Ultra-low latency distributed SQLite database.
* **Master 5-in-1 Auto-Sync**: Automated background cron endpoint (`/api/cron/sync-all`) with rate-limiting cooldowns and parallel scrapers.
* **Full & Recent Manual Sync Center**: Fine-grained synchronization cards for each individual game in the Settings panel.
* **OCR Ticket Scanner & Syndicate Suite**: Computer vision ticket reader and group syndicate ticket manager.

---

## 🛠️ Tech Stack

* **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) + React 19
* **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Glassmorphic dark cyberpunk / fintech aesthetic)
* **Icons**: [Lucide React](https://lucide.dev/)
* **Database**: [Turso](https://turso.tech/) (@libsql/client) with local SQLite fallback
* **Scraping / Ingestion**: [Cheerio](https://cheerio.js.org/) + Native Fetch
* **Charts & Visualizations**: Recharts + Custom SVG Canvas
* **OCR**: Tesseract.js

---

## 📦 Project Structure

```
├── data/
│   └── lotto.db                     # Local SQLite fallback database
├── public/
│   └── images/                      # Official game badges & icons
├── scripts/
│   ├── scraper.py                   # Automated Python scraper utilities
│   └── sync_cloud.js                # Turso cloud sync script
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── cashpot/             # Cash Pot data & math endpoints
│   │   │   ├── cron/sync-all/       # Master 5-in-1 automated cron sync
│   │   │   ├── lotto/math-engine/   # Lotto Plus & WFL math engine
│   │   │   ├── pick4/               # Pick 4 data & math endpoints
│   │   │   ├── playwhe/             # Play Whe data, correlation & predictions
│   │   │   └── winforlife/          # Win For Life sync & stats
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── WelcomeTab.tsx           # Main Command Center Dashboard
│   │   ├── InteractiveTumbler.tsx   # 3D Quick Pick Tumbler
│   │   ├── PlayWheTab.tsx           # Play Whe deep analytics
│   │   ├── LottoTab.tsx             # Lotto Plus wheeling & stats
│   │   ├── WinForLifeTab.tsx        # Win For Life analytics
│   │   ├── CashPotTab.tsx           # Cash Pot matrix
│   │   ├── Pick4Tab.tsx             # Pick 4 positional suite
│   │   ├── SettingsTab.tsx          # Master 5-in-1 Sync Center
│   │   └── UtilitySuiteTab.tsx      # OCR Scanner & Syndicates
│   └── lib/
│       ├── db.ts                    # LibSQL client & connection manager
│       ├── draw_schedule.ts         # Live draw times & Sunday schedules
│       ├── lotto_wfl_math_engine.ts # Multi-ball math inference engine
│       ├── pick4_math_engine.ts     # Positional Pick 4 math engine
│       ├── playwhe_engine.ts        # Bayesian-Markov Play Whe engine
│       ├── scraper.ts               # Core scraping routines
│       └── wheeling.ts              # Combinatorial wheeling algorithms
└── README.md
```

---

## ⚡ Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/d-win-concept.git
cd d-win-concept
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
TURSO_DATABASE_URL=libsql://your-database-name.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token_here
CRON_SECRET=your_optional_cron_secret
```
*(Note: If no Turso credentials are provided, the app will automatically fall back to the local SQLite database at `data/lotto.db`)*

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production
```bash
npm run build
npm run start
```

---

## ⏰ Automated Draw Schedule (AST)

| Game | Draw Days | Draw Times (AST) |
| :--- | :--- | :--- |
| **Play Whe** | Mon – Sun | 10:30 AM, 1:00 PM, 4:00 PM, 7:00 PM |
| **Pick 4** | Mon – Sun | 10:30 AM, 1:00 PM, 4:00 PM, 7:00 PM |
| **Cash Pot** | Mon – Sun | 7:00 PM |
| **Lotto Plus** | Wed & Sat | 8:30 PM |
| **Win For Life**| Tue & Fri | 7:00 PM |

---

## 🛡️ License

This project is licensed under the [MIT License](LICENSE).
