/**
 * MarketScout Narrative Engine
 * 
 * Loads, manages, and scores active market narratives.
 * Each narrative maps a market story → affected sectors → candidate companies.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NARRATIVES_FILE = join(__dirname, '../../narratives/active.json');

/**
 * Load all active narratives from config
 */
export function loadNarratives() {
  try {
    const raw = readFileSync(NARRATIVES_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('[Narratives] Failed to load narratives:', e.message);
    return [];
  }
}

/**
 * Find narratives matching a news/sentiment signal
 * @param {string} text - News headline or content
 * @returns {Array} Matching narratives with confidence scores
 */
export function matchNarratives(text) {
  const narratives = loadNarratives();
  const lower = text.toLowerCase();
  
  const matched = narratives.map(narrative => {
    let score = 0;
    const matchedKeywords = [];
    
    for (const keyword of narrative.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        score += 1;
        matchedKeywords.push(keyword);
      }
    }
    
    if (score === 0) return null;
    
    return {
      ...narrative,
      matchScore: score,
      matchedKeywords,
      confidence: narrative.confidence * Math.min(score / 2, 1) // Boost if multiple keywords match
    };
  }).filter(n => n !== null && n.matchScore > 0);
  
  // Sort by confidence × match score
  matched.sort((a, b) => (b.confidence * b.matchScore) - (a.confidence * a.matchScore));
  
  return matched;
}

/**
 * Get all candidate tickers from matched narratives
 * @param {Array} matchedNarratives 
 * @returns {Array} Deduplicated list of ticker objects
 */
export function getCandidatesFromNarratives(matchedNarratives) {
  const tickerMap = new Map();
  
  for (const narrative of matchedNarratives) {
    for (const ticker of narrative.related_tickers) {
      if (!tickerMap.has(ticker)) {
        tickerMap.set(ticker, {
          ticker,
          sourceNarratives: [narrative.id],
          primaryNarrative: narrative.name,
          stage: narrative.stage,
          confidence: narrative.confidence
        });
      } else {
        const existing = tickerMap.get(ticker);
        existing.sourceNarratives.push(narrative.id);
        existing.confidence = Math.max(existing.confidence, narrative.confidence);
      }
    }
  }
  
  return Array.from(tickerMap.values());
}

/**
 * Print current narrative status (for CLI testing)
 */
export function printNarrativeStatus() {
  const narratives = loadNarratives();
  console.log('\n=== MarketScout Active Narratives ===\n');
  for (const n of narratives) {
    console.log(`[${n.stage.toUpperCase()}] ${n.name}`);
    console.log(`  ${n.description}`);
    console.log(`  Sectors: ${n.sectors.join(', ')}`);
    console.log(`  Keywords: ${n.keywords.slice(0, 5).join(', ')}...`);
    console.log(`  Confidence: ${(n.confidence * 100).toFixed(0)}%`);
    console.log();
  }
}

// CLI test
if (process.argv[1] && process.argv[1].endsWith('narratives.js')) {
  printNarrativeStatus();
}
