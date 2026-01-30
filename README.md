# 🐰 BB-SB-MODEL v2

**Bad Bunny Super Bowl LX Halftime Show Prediction Model**

A production-grade prediction engine for Bad Bunny's Super Bowl LX halftime performance. This model generates **original probability estimates** - market data is used only for comparison and edge detection.

![Version](https://img.shields.io/badge/version-2.0.0-gold)
![Event](https://img.shields.io/badge/event-Feb%208%202026-blue)
![Framework](https://img.shields.io/badge/Next.js-14-black)

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/v2-bb-sb-model.git
cd v2-bb-sb-model

# Install
npm install

# Setup environment
cp .env.example .env.local
# Add your GROQ_API_KEY from console.groq.com

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

## 📊 Features

- **Original Probability Model** - We generate our own odds using a weighted factor system
- **Live Market Comparison** - Compare our predictions to Kalshi, Polymarket, FanDuel
- **Edge Detection** - Automatically identify mispriced markets
- **AI Chatbot** - Ask questions about the model using Llama 3.1 (via Groq)
- **Auto-Refresh** - Data updates every 60 seconds
- **Vercel Cron** - Hourly market comparison updates

## 🎯 Current Predictions (v2.0.0)

| Prediction | Value | Confidence |
|------------|-------|------------|
| First Song | Tití Me Preguntó | 28% |
| Last Song | BAILE INoLVIDABLE | 65% |
| Top Guest | Cardi B | 75% |
| Biggest Edge | SELL NuevaYol | +36% |

## 🧠 Model Philosophy

### Our Odds Are Original

We calculate probabilities from first principles:

| Factor | Weight | Description |
|--------|--------|-------------|
| Streaming | 20% | Spotify all-time + current streams |
| Concert | 15% | setlist.fm historical data |
| SB Suitability | 25% | Broadcast requirements |
| Cultural | 20% | Awards, significance |
| Album Push | 20% | Current promotional cycle |

### Markets Are For Comparison Only

```
OUR_PROBABILITY → Compare to → MARKET_PRICE → Calculate → EDGE
```

We **never** adjust our probabilities based on market movements.

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS (Gold terminal theme)
- **AI**: Groq (Llama 3.1 70B)
- **State**: Zustand + SWR
- **Deployment**: Vercel

## 📁 Project Structure

```
v2-bb-sb-model/
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── page.tsx       # Main dashboard
│   │   └── layout.tsx     # Root layout
│   ├── components/
│   │   ├── Dashboard.tsx  # Terminal UI
│   │   └── ChatBot.tsx    # AI chat interface
│   ├── lib/
│   │   ├── model.ts       # Core prediction engine
│   │   ├── markets.ts     # Market data fetching
│   │   └── chat.ts        # Chatbot logic
│   ├── data/
│   │   └── predictions.json # Source of truth
│   └── types/
│       └── index.ts       # TypeScript definitions
├── claude.md              # Claude Code instructions
└── vercel.json           # Deployment config
```

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/predictions` | GET | Our model predictions |
| `/api/markets` | GET | Market comparison data |
| `/api/chat` | POST | AI chatbot |
| `/api/update` | POST | Update model |
| `/api/cron` | GET | Hourly refresh |

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel
3. Add environment variables:
   - `GROQ_API_KEY`
   - `CRON_SECRET`
4. Deploy

### Manual

```bash
npm run build
npm start
```

## 🤖 Claude Code Usage

See `claude.md` for detailed Claude Code prompts including:

- Daily model updates
- Adding new intelligence
- Probability adjustments
- Market edge analysis

## 📈 Trade Recommendations

### High Conviction

| Action | Song | Platform | Edge |
|--------|------|----------|------|
| SELL | NuevaYol | Kalshi | +36% |
| BUY | BAILE Last | FanDuel | +56% |
| BUY | Tití First | FanDuel | +11% |

## 📝 License

MIT

---

Built with 🐰 for Super Bowl LX
