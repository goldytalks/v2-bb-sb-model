# 🐰 BB-SB-MODEL v2 | Claude Code Instructions

## What This Project Is

A production-grade prediction model for Bad Bunny's Super Bowl LX halftime show (Feb 8, 2026). This is the **source of truth** for first song, setlist, guest appearance, and betting edge predictions.

**Key Principle:** Our model generates ORIGINAL probability estimates. Kalshi/Polymarket data is used ONLY for comparison to identify market inefficiencies—never as input signal.

---

## Quick Start

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/v2-bb-sb-model.git
cd v2-bb-sb-model
npm install

# Set up environment
cp .env.example .env.local
# Add your API keys to .env.local

# Run locally
npm run dev

# Deploy to Vercel
vercel --prod
```

---

## Project Structure

```
v2-bb-sb-model/
├── claude.md                 # YOU ARE HERE - Claude Code instructions
├── README.md                 # Public documentation
├── package.json              # Dependencies (Next.js 14, Tailwind, etc.)
├── next.config.js            # Next.js configuration
├── vercel.json               # Vercel deployment settings
├── tailwind.config.ts        # Tailwind with gold theme
├── .env.example              # Environment template
├── .gitignore
│
├── src/
│   ├── app/
│   │   ├── layout.tsx        # Root layout with fonts
│   │   ├── page.tsx          # Main dashboard page
│   │   ├── globals.css       # Global styles + terminal theme
│   │   └── api/
│   │       ├── predictions/route.ts   # GET our model predictions
│   │       ├── chat/route.ts          # POST chatbot queries
│   │       ├── markets/route.ts       # GET market comparison data
│   │       ├── update/route.ts        # POST model updates
│   │       └── cron/route.ts          # Vercel cron for auto-refresh
│   │
│   ├── components/
│   │   ├── Dashboard.tsx              # Main terminal dashboard
│   │   ├── ChatBot.tsx                # AI chatbot interface
│   │   ├── ProbabilityChart.tsx       # Animated probability bars
│   │   ├── SetlistGrid.tsx            # 8-song setlist display
│   │   ├── MarketComparison.tsx       # Our odds vs market odds
│   │   ├── TradeCards.tsx             # BUY/SELL/FADE recommendations
│   │   ├── LiveGraph.tsx              # Animated trading graph
│   │   └── TickerTape.tsx             # Scrolling alerts
│   │
│   ├── lib/
│   │   ├── model.ts           # Core prediction engine
│   │   ├── markets.ts         # Kalshi/Polymarket fetchers
│   │   ├── chat.ts            # Chatbot logic (Groq/Ollama)
│   │   ├── edge-calculator.ts # Edge detection algorithms
│   │   └── constants.ts       # Song data, weights, etc.
│   │
│   ├── hooks/
│   │   ├── useModel.ts        # React hook for predictions
│   │   ├── useMarkets.ts      # React hook for market data
│   │   └── useChat.ts         # React hook for chatbot
│   │
│   ├── types/
│   │   └── index.ts           # TypeScript interfaces
│   │
│   └── data/
│       └── predictions.json   # Current model state (auto-updated)
│
├── scripts/
│   ├── update-model.ts        # CLI for manual updates
│   └── seed-data.ts           # Initialize prediction data
│
└── docs/
    ├── model-methodology.md   # How probabilities are calculated
    ├── api-reference.md       # API documentation
    └── deployment.md          # GitHub + Vercel setup guide
```

---

## Claude Code Prompts

### 1. Initial Setup (Run First Time)

```
I'm setting up the v2-bb-sb-model project. Please:

1. Navigate to the project directory
2. Run `npm install` to install dependencies
3. Copy .env.example to .env.local
4. Run `npm run dev` to start the development server
5. Verify the dashboard loads at http://localhost:3000

Working directory: /path/to/v2-bb-sb-model
```

### 2. Daily Model Update

```
Daily Bad Bunny model update for [DATE]:

STEP 1: Fetch latest market data for comparison
- Get Kalshi first song odds (do NOT use as input, only for edge calculation)
- Get Polymarket odds if available
- Get FanDuel odds

STEP 2: Check for new intelligence
- Search "Bad Bunny Super Bowl rehearsal" past 24 hours
- Search "Bad Bunny New Orleans" for guest sightings
- Check for any interviews or statements

STEP 3: Update OUR model probabilities (if warranted by new intel)
- Only adjust our probabilities based on NEW INFORMATION (rehearsals, statements, etc.)
- NEVER adjust based on market movement alone
- Document reasoning for any changes

STEP 4: Recalculate edges
- Compare our updated probabilities to current market odds
- Identify new mispricing opportunities

STEP 5: Update src/data/predictions.json and commit

Show me: What changed, new edges, any alerts.
```

### 3. Add New Intelligence

```
NEW INTEL RECEIVED:

Type: [rehearsal | interview | guest_sighting | production | other]
Source: [TMZ | Billboard | Twitter | etc.]
Content: [DESCRIBE WHAT WAS SEEN/SAID]
Confidence: [low | medium | high]

Please:
1. Analyze how this affects our model
2. Propose specific probability adjustments (with reasoning)
3. Update src/data/predictions.json
4. Recalculate all edges
5. Generate updated trade recommendations

Important: Only adjust probabilities that this intel DIRECTLY affects.
```

### 4. Chatbot Query (Test the AI)

```
Test the chatbot with these queries:

1. "What's the most likely opening song and why?"
2. "Is NuevaYol overpriced on Kalshi?"
3. "Who are the most likely guest appearances?"
4. "What's the predicted setlist?"
5. "Where are the biggest betting edges right now?"

Verify the responses are accurate based on our model data.
```

### 5. Deploy to Vercel

```
Deploy the v2-bb-sb-model to Vercel:

1. Ensure all changes are committed to git
2. Run `vercel --prod`
3. Set environment variables in Vercel dashboard:
   - GROQ_API_KEY (for chatbot)
   - CRON_SECRET (for auto-updates)
4. Verify the production URL works
5. Test the chatbot on production

Return the production URL when complete.
```

### 6. Full Model Recalibration

```
Perform full model recalibration:

1. Review all current probabilities against latest data:
   - Streaming numbers (Spotify monthly listeners, daily streams)
   - Concert setlist patterns (setlist.fm)
   - Billboard chart positions
   - Award nominations/wins
   - Recent interviews and statements

2. For each song in first_song predictions:
   - Verify streaming rank is current
   - Check concert opener frequency
   - Assess Super Bowl broadcast suitability
   - Evaluate cultural significance weight
   - Factor in current album cycle promotion

3. Recalculate all probabilities using the weighted model:
   - Streaming (20%)
   - Concert frequency (15%)
   - SB Suitability (25%)
   - Cultural weight (20%)
   - Album push (20%)

4. Update predictions.json with new values
5. Recalculate all market edges
6. Generate calibration report

Save report to docs/calibration-[DATE].md
```

---

## Model Philosophy

### Our Odds Are Original

We generate probabilities from first principles:

1. **Streaming Data** (20% weight)
   - Spotify all-time streams
   - Current monthly listeners
   - Daily trending songs

2. **Concert Frequency** (15% weight)
   - setlist.fm historical data
   - Tour opener patterns
   - Festival vs. tour behavior

3. **Super Bowl Suitability** (25% weight)
   - Explicit content level
   - Clean version availability
   - Energy/staging requirements
   - Guest dependencies

4. **Cultural Significance** (20% weight)
   - Awards (Grammy, Latin Grammy)
   - Critical acclaim
   - Political/social importance
   - Historic moments

5. **Current Album Push** (20% weight)
   - Is song from current album?
   - Featured in promotional materials?
   - Grammy-nominated from current cycle?

### Markets Are For Comparison Only

```
OUR PROBABILITY → Compare to → MARKET PRICE → Calculate → EDGE

EDGE = OUR_PROBABILITY - MARKET_IMPLIED_PROBABILITY
```

- Positive edge = Market underpricing (BUY opportunity)
- Negative edge = Market overpricing (SELL/FADE opportunity)

We NEVER adjust our probabilities to match markets. Markets are often wrong.

---

## API Reference

### GET /api/predictions

Returns our current model predictions.

```json
{
  "first_song": [...],
  "last_song": [...],
  "setlist": [...],
  "guests": [...],
  "meta": { "version", "last_updated" }
}
```

### GET /api/markets

Returns current market odds (for comparison only).

```json
{
  "kalshi": { "first_song": [...] },
  "polymarket": { "first_song": [...] },
  "fanduel": { "first_song": [...], "last_song": [...] }
}
```

### POST /api/chat

Send a question to the AI chatbot.

```json
{
  "message": "What's the most likely opening song?"
}
```

### POST /api/update

Update model probabilities (requires auth).

```json
{
  "song": "NuevaYol",
  "bet_type": "first_song",
  "new_probability": 0.22,
  "reasoning": "Rehearsal report suggests..."
}
```

---

## Environment Variables

```bash
# .env.local

# Chatbot (required for AI features)
GROQ_API_KEY=gsk_...           # Get from console.groq.com

# Auto-update cron (required for Vercel cron)
CRON_SECRET=your_secret_here    # Any random string

# Optional: Market data APIs
KALSHI_API_KEY=                 # For authenticated Kalshi access
POLYMARKET_API_KEY=             # For Polymarket access
```

---

## Deployment Checklist

### GitHub Setup

```bash
git init
git add .
git commit -m "Initial commit: v2-bb-sb-model"
git remote add origin https://github.com/YOUR_USERNAME/v2-bb-sb-model.git
git branch -M main
git push -u origin main
```

### Vercel Setup

1. Go to [vercel.com](https://vercel.com)
2. Import GitHub repository
3. Set environment variables:
   - `GROQ_API_KEY`
   - `CRON_SECRET`
4. Deploy

### Enable Auto-Updates

The `/api/cron` endpoint is called by Vercel Cron every hour to refresh market comparison data. Configure in `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron",
    "schedule": "0 * * * *"
  }]
}
```

---

## Key Files to Understand

| File | Purpose |
|------|---------|
| `src/lib/model.ts` | Core prediction engine - all probability calculations |
| `src/lib/edge-calculator.ts` | Compares our odds to markets, finds edges |
| `src/data/predictions.json` | Current model state - source of truth |
| `src/components/Dashboard.tsx` | Main UI - the terminal interface |
| `src/components/ChatBot.tsx` | AI chat interface |
| `src/app/api/chat/route.ts` | Chatbot API using Groq (Llama 3.1) |

---

## Common Tasks

### Update a single probability

```bash
curl -X POST http://localhost:3000/api/update \
  -H "Content-Type: application/json" \
  -d '{"song": "NuevaYol", "bet_type": "first_song", "new_probability": 0.18}'
```

### Ask the chatbot

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are the best bets right now?"}'
```

### Get current predictions

```bash
curl http://localhost:3000/api/predictions
```

### Get market comparison

```bash
curl http://localhost:3000/api/markets
```

---

## Troubleshooting

### "Module not found" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### Chatbot not responding
- Check GROQ_API_KEY is set correctly
- Verify Groq API is accessible
- Check rate limits

### Market data stale
- Vercel cron may not be configured
- Check /api/cron endpoint manually
- Verify CRON_SECRET matches

---

## Contact

Model maintained by the prediction team. For issues, create a GitHub issue or check the docs.

---

*Remember: Our model is the source of truth. Markets are just for comparison.*
