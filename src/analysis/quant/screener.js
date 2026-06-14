/**
 * Quantitative Screener
 * 
 * Applies technical indicators to candidate stocks:
 * - RSI (Relative Strength Index)
 * - Price momentum (% change over periods)
 * - Volume signals
 * - Moving average position
 * - Breakout detection
 */

import axios from 'axios';
import { readFileSync } from 'fs';

// Load env
try {
  const envFile = readFileSync('/home/ronald/credentials/.env', 'utf8');
  envFile.split('\n').forEach(line => {
    const [k, ...rest] = line.split('=');
    if (k && rest.length) process.env[k.trim()] = rest.join('=').trim();
  });
} catch (e) { /* no .env */ }

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || '';

/**
 * Simple RSI calculation
 * @param {number[]} closes - Array of closing prices
 * @param {number} period - RSI period (default 14)
 */
export function calculateRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100; // All gains
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Simple MACD calculation
 * @param {number[]} closes 
 */
export function calculateMACD(closes) {
  if (closes.length < 26) return null;
  
  // EMA helper
  const ema = (data, period) => {
    const k = 2 / (period + 1);
    let emaVal = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < data.length; i++) {
      emaVal = (data[i] - emaVal) * k + emaVal;
    }
    return emaVal;
  };
  
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macd = ema12 - ema26;
  const signal = ema([...Array(9).fill(macd), macd], 9); // rough signal line
  const histogram = macd - signal;
  
  return { macd, signal, histogram, ema12, ema26 };
}

/**
 * Calculate price momentum metrics
 * @param {number[]} closes 
 */
export function calculateMomentum(closes) {
  if (closes.length < 5) return null;
  
  const current = closes[closes.length - 1];
  const mom1d = closes.length >= 2 ? ((current - closes[closes.length - 2]) / closes[closes.length - 2]) * 100 : 0;
  const mom5d = closes.length >= 6 ? ((current - closes[closes.length - 6]) / closes[closes.length - 6]) * 100 : 0;
  const mom20d = closes.length >= 21 ? ((current - closes[closes.length - 21]) / closes[closes.length - 21]) * 100 : 0;
  
  return { mom1d, mom5d, mom20d, current };
}

/**
 * Calculate moving averages
 */
export function calculateMA(closes) {
  if (closes.length < 50) return null;
  
  const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, closes.length);
  const ma50 = closes.length >= 50 ? closes.slice(-50).reduce((a, b) => a + b, 0) / 50 : null;
  const ma200 = closes.length >= 200 ? closes.slice(-200).reduce((a, b) => a + b, 0) / 200 : null;
  
  const current = closes[closes.length - 1];
  
  return {
    ma20, ma50, ma200,
    priceVsMA20: ((current - ma20) / ma20) * 100,
    priceVsMA50: ma50 ? ((current - ma50) / ma50) * 100 : null,
    goldenCross: ma50 && ma200 ? ma50 > ma200 && closes[closes.length - 2] <= (closes.slice(-22, -21)[0] || 0) : false
  };
}

/**
 * Fetch historical candles for a symbol
 */
export async function fetchCandles(symbol, resolution = 'D', from = null, to = null, token = '') {
  if (!token) {
    // Return simulated data for testing
    return generateSimulatedCandles(symbol);
  }
  
  const now = Math.floor(Date.now() / 1000);
  const fromTs = from || now - 90 * 24 * 60 * 60; // 90 days
  const toTs = to || now;
  
  try {
    const res = await axios.get(`https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${fromTs}&to=${toTs}`, {
      params: { token },
      timeout: 10000
    });
    
    if (res.data.s === 'ok') {
      return {
        symbol,
        closes: res.data.c,
        highs: res.data.h,
        lows: res.data.l,
        opens: res.data.o,
        volumes: res.data.v || [],
        timestamps: res.data.t
      };
    }
    return null;
  } catch (e) {
    console.error(`[Quant] Failed to fetch candles for ${symbol}:`, e.message);
    return null;
  }
}

/**
 * Generate simulated candles for testing
 */
function generateSimulatedCandles(symbol) {
  const basePrices = {
    'MU': 120, 'WDC': 70, 'NVDA': 130, 'AMD': 160, 'ASML': 950,
    'MU1': 118, 'MU2': 122, 'MU3': 125
  };
  const base = basePrices[symbol] || 100 + Math.random() * 50;
  
  const closes = [];
  let price = base;
  for (let i = 0; i < 90; i++) {
    price = price * (1 + (Math.random() - 0.48) * 0.03);
    closes.push(Math.round(price * 100) / 100);
  }
  
  return {
    symbol,
    closes,
    highs: closes.map(c => c * (1 + Math.random() * 0.02)),
    lows: closes.map(c => c * (1 - Math.random() * 0.02)),
    opens: closes.map((c, i) => i === 0 ? c : closes[i - 1]),
    volumes: closes.map(() => Math.floor(Math.random() * 10000000)),
    timestamps: []
  };
}

/**
 * Screen a single candidate with technical analysis
 */
export async function screenCandidate(symbol, token = FINNHUB_API_KEY) {
  const candles = await fetchCandles(symbol, 'D', null, null, token);
  if (!candles || candles.closes.length < 20) {
    return { symbol, error: 'Insufficient data' };
  }
  
  const closes = candles.closes;
  const rsi = calculateRSI(closes);
  const macd = calculateMACD(closes);
  const momentum = calculateMomentum(closes);
  const ma = calculateMA(closes);
  
  // Current price and today's change
  const currentPrice = closes[closes.length - 1];
  const prevClose = closes[closes.length - 2];
  const todayChange = ((currentPrice - prevClose) / prevClose) * 100;
  
  // Determine signal
  let signal = 'HOLD';
  let signalReason = '';
  
  if (rsi !== null) {
    if (rsi < 30) {
      signal = 'OVERSOLD — Watch for bounce';
      signalReason = `RSI at ${rsi.toFixed(1)} suggests undersold`;
    } else if (rsi > 70) {
      signal = 'OVERBOUGHT — Caution';
      signalReason = `RSI at ${rsi.toFixed(1)} suggests overbought`;
    } else if (rsi > 60 && rsi < 70) {
      signal = 'BULLISH';
      signalReason = `RSI at ${rsi.toFixed(1)} confirms upward momentum`;
    }
  }
  
  if (macd && macd.histogram > 0) {
    signal = 'BULLISH';
    signalReason = signalReason || 'MACD histogram positive';
  }
  
  if (momentum && momentum.mom5d > 5) {
    signal = 'BREAKOUT CANDIDATE';
    signalReason = `+${momentum.mom5d.toFixed(1)}% in 5 days — momentum building`;
  }
  
  if (ma && ma.priceVsMA20 > 5) {
    signal = 'ABOVE MA20';
    signalReason = `Price ${ma.priceVsMA20.toFixed(1)}% above 20-day MA`;
  }
  
  return {
    symbol,
    price: currentPrice,
    todayChange,
    rsi: rsi ? Math.round(rsi * 10) / 10 : null,
    macd: macd ? {
      macd: Math.round(macd.macd * 100) / 100,
      signal: Math.round(macd.signal * 100) / 100,
      histogram: Math.round(macd.histogram * 100) / 100
    } : null,
    momentum: momentum ? {
      mom1d: Math.round(momentum.mom1d * 10) / 10,
      mom5d: Math.round(momentum.mom5d * 10) / 10,
      mom20d: Math.round(momentum.mom20d * 10) / 10
    } : null,
    movingAverages: ma ? {
      ma20: Math.round(ma.ma20 * 100) / 100,
      ma50: ma.ma50 ? Math.round(ma.ma50 * 100) / 100 : null,
      priceVsMA20: Math.round(ma.priceVsMA20 * 10) / 10
    } : null,
    signal,
    signalReason
  };
}

/**
 * Screen multiple candidates
 */
export async function screenCandidates(symbols, token = FINNHUB_API_KEY) {
  const results = [];
  for (const symbol of symbols) {
    const screened = await screenCandidate(symbol, token);
    results.push(screened);
    // Rate limit
    await new Promise(r => setTimeout(r, 300));
  }
  return results;
}

/**
 * Get top opportunities from screened results
 */
export function getTopOpportunities(screened, minScore = 5) {
  return screened
    .filter(s => !s.error)
    .filter(s => s.signal !== 'HOLD' && s.signal !== 'OVERBOUGHT — Caution')
    .sort((a, b) => {
      // Score by RSI (prefer oversold that might bounce or bullish mid-range)
      const aScore = (a.rsi || 50) < 40 ? 10 : (a.rsi || 50) > 60 ? 5 : 3;
      const bScore = (b.rsi || 50) < 40 ? 10 : (b.rsi || 50) > 60 ? 5 : 3;
      return bScore - aScore;
    });
}
