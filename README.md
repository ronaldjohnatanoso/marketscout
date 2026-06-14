# MarketScout — Active Market Opportunity Discovery Engine

> Find the next SanDisk before it goes mainstream.

MarketScout is an automated opportunity discovery system that continuously monitors market narratives, news, and technical signals to surface pre-mainstream investment candidates — before the market prices them in.

## How It Works

```
Every 15 minutes:
1. Scan top market news + sector momentum
2. Match against active narratives (AI infrastructure, memory, commodities, etc.)
3. Map narratives → affected sectors → candidate companies
4. Run technical analysis (RSI, MACD, momentum, moving averages)
5. Score and rank candidates
6. Send Discord alert if top candidate passes threshold
7. Push report to GitHub
```

## The SanDisk Template

The core thesis: major market events create downstream effects that the market doesn't price in immediately.

**Example:**
```
AI training demand surge
  → GPU shortage
    → VRAM/HBM demand spike
      → Memory companies underpriced
        → SanDisk, Micron → HUGE run
```

MarketScout traces these causal chains and finds companies positioned to benefit.

## Quick Start

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/marketscout.git
cd marketscout
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your Discord webhook URL

# Run a test scan
node src/scheduler/scheduler.js --test

# Run full pipeline
node pipeline.js
```

## Configuration

### Narratives (`narratives/active.json`)

Define the market narratives you want to track. Each narrative has:
- `name` — Human-readable name
- `description` — What's happening
- `sectors` — Affected sectors
- `keywords` — News triggers
- `related_tickers` — Candidate companies
- `stage` — early / mid / late (early = higher upside potential)

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FINNHUB_API_KEY` | No | Free tier at finnhub.io. Without it, uses simulated data. |
| `DISCORD_WEBHOOK_URL` | Yes | Discord webhook for alerts |
| `ALERT_THRESHOLD` | No | Min score to trigger alert (default: 6.0) |

### GitHub Secrets

For GitHub Actions, add these secrets:
- `FINNHUB_API_KEY`
- `DISCORD_WEBHOOK_URL`
- `ALERT_THRESHOLD` (optional)

## Project Structure

```
marketscout/
├── package.json
├── pipeline.js              # Main orchestrator
├── narratives/
│   └── active.json          # Active market narratives
├── src/
│   ├── discovery/
│   │   ├── narratives.js    # Narrative matching engine
│   │   ├── sector-map.js    # Sector → company mapping
│   │   └── scanner.js       # Core discovery scanner
│   ├── analysis/
│   │   └── quant/
│   │       └── screener.js  # Technical analysis (RSI, MACD, etc.)
│   ├── report/
│   │   └── generator.js     # Markdown report generator
│   ├── notifiers/
│   │   └── discord.js       # Discord webhook notifier
│   └── scheduler/
│       └── scheduler.js     # Entry point for scheduled runs
├── alerts/                  # Generated alert reports
├── data/                    # Scan JSON data
└── .github/workflows/
    └── scout.yml            # GitHub Actions (15-min intervals)
```

## Discord Alerts

MarketScout sends rich embed alerts to Discord when candidates pass the threshold:

- **High severity (score ≥ 8):** Red alert — strong conviction
- **Medium severity (score ≥ 6):** Orange alert — worth watching

Each alert includes:
- Ticker + price + % change
- Signal (e.g., "BREAKOUT CANDIDATE", "OVERSOLD — Watch for bounce")
- Narrative explanation
- Top reasons for the score

## Architecture Notes

- **Narrative-first:** Not a screener that reacts to price moves. We find stories first, then check if companies are responding.
- **Pre-mainstream detection:** Catches companies before financial media covers them.
- **Causal chain mapping:** trend → sector → company cascade.
- **Story-driven reports:** Explains the WHY, not just the WHAT.

## Disclaimer

MarketScout is a research and discovery tool. Not financial advice. Always do your own due diligence before making investment decisions.

---

*Built to find the next opportunity before it stops being one.*
