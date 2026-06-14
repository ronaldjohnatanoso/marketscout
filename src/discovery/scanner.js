/**
 * MarketScout Scanner
 * 
 * Core discovery engine: scans for pre-mainstream opportunities
 * by matching news + sector data against active narratives.
 */

import axios from 'axios';
import { loadNarratives, matchNarratives, getCandidatesFromNarratives } from './narratives.js';
import { SECTOR_MAP, getTickersForSectors } from './sector-map.js';

// Load .env
try {
  const envFile = await import('fs').then(fs => fs.readFileSync('/home/ronald/credentials/.env', 'utf8'));
  envFile.split('\n').forEach(line => {
    const [k, ...rest] = line.split('=');
    if (k && rest.length) process.env[k.trim()] = rest.join('=').trim();
  });
} catch (e) { /* no .env */ }

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || '';

/**
 * Fetch latest market news from Finnhub
 * @param {string} token - Finnhub API key
 */
async function fetchMarketNews(token) {
  if (!token) {
    console.log('[Scanner] No Finnhub API key — using simulated news');
    return getSimulatedNews();
  }
  
  try {
    const res = await axios.get('https://finnhub.io/api/v1/news?category=general', {
      params: { token },
      timeout: 10000
    });
    return res.data.slice(0, 30).map(item => ({
      headline: item.headline,
      summary: item.summary,
      source: item.source,
      datetime: item.datetime,
      url: item.url,
      category: 'general'
    }));
  } catch (e) {
    console.error('[Scanner] Finnhub news fetch failed:', e.message);
    return getSimulatedNews();
  }
}

/**
 * Fetch sector news from Finnhub
 */
async function fetchSectorNews(token, sectors) {
  if (!token) return [];
  
  try {
    // Finnhub supports sector-specific news
    const categoryMap = {
      'semiconductors': 'technology',
      'biotech': 'life-science',
      'defense': 'politics',
      'mining': 'commodities'
    };
    
    const results = [];
    for (const sector of sectors.slice(0, 3)) {
      const cat = categoryMap[sector] || 'general';
      const res = await axios.get(`https://finnhub.io/api/v1/news?category=${cat}`, {
        params: { token },
        timeout: 8000
      });
      results.push(...res.data.slice(0, 10));
    }
    
    return results.map(item => ({
      headline: item.headline,
      summary: item.summary,
      source: item.source,
      datetime: item.datetime,
      category: item.category
    }));
  } catch (e) {
    console.error('[Scanner] Sector news fetch failed:', e.message);
    return [];
  }
}

/**
 * Fetch stock quote data
 */
async function fetchQuote(symbol, token) {
  if (!token) return null;
  
  try {
    const res = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}`, {
      params: { token },
      timeout: 5000
    });
    const q = res.data;
    if (!q.c) return null;
    
    const change = q.c - q.pc;
    const changePercent = (change / q.pc) * 100;
    
    return {
      symbol,
      price: q.c,
      change,
      changePercent,
      high: q.h,
      low: q.l,
      open: q.o,
      prevClose: q.pc,
      volume: null // Finnhub free doesn't include volume in quote
    };
  } catch (e) {
    return null;
  }
}

/**
 * Fetch quotes for multiple symbols
 */
async function fetchQuotes(symbols, token) {
  const results = [];
  for (const symbol of symbols) {
    const quote = await fetchQuote(symbol, token);
    if (quote) results.push(quote);
    // Rate limit: Finnhub free = 60/min
    await new Promise(r => setTimeout(r, 500));
  }
  return results;
}

/**
 * Simulated news for when no API key is available
 */
function getSimulatedNews() {
  const now = Date.now() / 1000;
  return [
    {
      headline: 'AI chip demand continues to surge as hyperscalers announce record capex',
      summary: 'Major cloud providers report unprecedented AI training workloads driving semiconductor demand.',
      source: 'MarketWatch',
      datetime: now - 300,
      category: 'technology'
    },
    {
      headline: 'Memory contract prices set to rise 20% in Q3 as HBM shortage worsens',
      summary: 'Industry sources indicate HBM3 supply remains constrained while AI server demand accelerates.',
      source: 'DigiTimes',
      datetime: now - 1800,
      category: 'technology'
    },
    {
      headline: 'Grid infrastructure spending expected to double as AI data centers strain power grids',
      summary: 'Utilities and grid operators announce major infrastructure upgrades to support AI computing load.',
      source: 'Reuters',
      datetime: now - 3600,
      category: 'energy'
    },
    {
      headline: 'US announces new export controls on advanced semiconductor equipment to China',
      summary: 'Commerce Department expands restrictions on chip manufacturing equipment shipments.',
      source: 'Bloomberg',
      datetime: now - 7200,
      category: 'politics'
    },
    {
      headline: 'Copper demand from EV and AI infrastructure could trigger supply crisis by 2026',
      summary: 'Analysts warn of potential copper shortage as multiple industries compete for supply.',
      source: 'Financial Times',
      datetime: now - 10800,
      category: 'commodities'
    }
  ];
}

/**
 * Score a candidate based on news + quote data
 */
function scoreCandidate(candidate, matchedNarrative, quote) {
  let score = 0;
  const reasons = [];
  
  // Narrative confidence (0-1)
  score += matchedNarrative.confidence * 3;
  reasons.push(`${matchedNarrative.name} (${(matchedNarrative.confidence * 100).toFixed(0)}% confidence)`);
  
  // Price momentum (if quote available)
  if (quote) {
    const absChangePct = Math.abs(quote.changePercent);
    
    // Big move = more interesting
    if (absChangePct > 5) {
      score += 2;
      reasons.push(`${quote.changePercent.toFixed(1)}% move today`);
    } else if (absChangePct > 2) {
      score += 1;
      reasons.push(`${quote.changePercent.toFixed(1)}% move today`);
    }
    
    // Underpriced check: price near low of day suggests potential
    if (quote.price < quote.prevClose * 1.02 && absChangePct > 0) {
      score += 1;
      reasons.push('Approaching breakout level');
    }
  }
  
  // Early stage = higher upside potential
  if (matchedNarrative.stage === 'early') {
    score += 1.5;
    reasons.push('Early-stage narrative (pre-mainstream)');
  } else if (matchedNarrative.stage === 'mid') {
    score += 0.75;
    reasons.push('Mid-stage narrative');
  }
  
  // Multiple narrative sources = stronger signal
  if (candidate.sourceNarratives.length > 1) {
    score += 1;
    reasons.push(`Detected across ${candidate.sourceNarratives.length} narratives`);
  }
  
  return {
    ...candidate,
    score: Math.round(score * 10) / 10,
    reasons,
    quote: quote || null
  };
}

/**
 * Main scan function — discovers opportunities
 */
export async function scan() {
  console.log('[Scanner] Starting MarketScout discovery scan...');
  
  const narratives = loadNarratives();
  const allNews = await fetchMarketNews(FINNHUB_API_KEY);
  const sectorNews = await fetchSectorNews(FINNHUB_API_KEY, narratives.map(n => n.sectors[0]));
  
  const combinedNews = [...allNews, ...sectorNews];
  
  // Match news against narratives
  const allMatches = [];
  for (const news of combinedNews) {
    const text = `${news.headline} ${news.summary}`;
    const matched = matchNarratives(text);
    if (matched.length > 0) {
      allMatches.push({ news, matched });
    }
  }
  
  console.log(`[Scanner] Found ${allMatches.length} news-narrative matches`);
  
  // Aggregate candidates from all matches
  const candidateMap = new Map();
  
  for (const { news, matched } of allMatches) {
    const candidates = getCandidatesFromNarratives(matched);
    
    for (const candidate of candidates) {
      if (!candidateMap.has(candidate.ticker)) {
        candidateMap.set(candidate.ticker, {
          ...candidate,
          matchedNarratives: matched,
          relatedNews: [news]
        });
      } else {
        const existing = candidateMap.get(candidate.ticker);
        existing.relatedNews.push(news);
        // Boost confidence if matched by multiple news items
        existing.confidence = Math.min(existing.confidence + 0.05, 1);
      }
    }
  }
  
  // Fetch quotes for candidates
  const tickerSymbols = Array.from(candidateMap.keys()).filter(t => !t.includes(' '));
  let quotes = [];
  if (tickerSymbols.length > 0 && FINNHUB_API_KEY) {
    console.log(`[Scanner] Fetching quotes for ${tickerSymbols.length} tickers...`);
    quotes = await fetchQuotes(tickerSymbols, FINNHUB_API_KEY);
  }
  
  const quoteMap = new Map(quotes.map(q => [q.symbol, q]));
  
  // Score and rank candidates
  const scored = [];
  for (const [ticker, candidate] of candidateMap) {
    const quote = quoteMap.get(ticker) || null;
    const topNarrative = candidate.matchedNarratives[0];
    
    const scoredCandidate = scoreCandidate(candidate, topNarrative, quote);
    scored.push(scoredCandidate);
  }
  
  // Sort by score
  scored.sort((a, b) => b.score - a.score);
  
  const topCandidates = scored.slice(0, 10);
  
  console.log(`[Scanner] Top ${topCandidates.length} candidates:`);
  for (const c of topCandidates) {
    console.log(`  [${c.score.toFixed(1)}] ${c.ticker} — ${c.primaryNarrative}`);
    if (c.quote) {
      console.log(`    Price: $${c.quote.price} (${c.quote.changePercent > 0 ? '+' : ''}${c.quote.changePercent.toFixed(1)}%)`);
    }
  }
  
  return {
    timestamp: new Date().toISOString(),
    narratives: narratives.length,
    narrativeList: narratives,
    newsScanned: combinedNews.length,
    matches: allMatches.length,
    candidates: scored,
    topCandidates
  };
}

// CLI test
if (process.argv[1].endsWith('scanner.js')) {
  scan().then(r => {
    console.log('\n=== Scan Complete ===');
    console.log(`Candidates found: ${r.candidates.length}`);
    process.exit(0);
  }).catch(e => {
    console.error('Scan failed:', e);
    process.exit(1);
  });
}
