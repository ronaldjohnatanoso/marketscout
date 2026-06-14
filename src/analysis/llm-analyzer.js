/**
 * MarketScout LLM Analyzer
 * 
 * Uses Groq (LLM) to provide qualitative judgment on candidates.
 * Takes the mechanical scan results and adds human-level reasoning:
 * - Is the narrative actually compelling?
 * - Is the stock pricing in the story yet?
 * - What's the bull case / bear case?
 * - Should this trigger an alert?
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

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Analyze a single candidate with LLM qualitative judgment
 */
export async function analyzeCandidate(candidate, narrative, apiKey = GROQ_API_KEY) {
  if (!apiKey) {
    return { summary: 'No LLM API key — skipping qualitative analysis', shouldAlert: null };
  }

  const prompt = buildPrompt(candidate, narrative);

  try {
    const res = await axios.post(GROQ_API_URL, {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a senior equity research analyst at a hedge fund. You specialize in narrative-driven investing — finding stocks positioned to benefit from market themes before the consensus prices them in.

You will receive:
- A stock candidate with technical data (RSI, MACD, momentum, price)
- The market narrative it sits under
- Related news headlines

Your job: Provide a sharp, direct qualitative assessment. Answer:
1. Is this narrative actually playing out? (Yes/No/Too Early + 2 sentence explanation)
2. Is the stock pricing in this narrative? (pricing-in / partially / not-yet)
3. Bull case (2 sentences)
4. Bear case (2 sentences)
5. Alert recommendation (ALERT / WATCH / SKIP) — with a one-sentence reason

Be skeptical. Most stocks that match a narrative are not actually good bets. Only recommend if the setup is genuinely compelling and the risk/reward is favorable.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 400
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const text = res.data.choices[0]?.message?.content || '';
    return parseLLMResponse(text, candidate);
  } catch (e) {
    console.error(`[LLM] Groq analysis failed for ${candidate.ticker}:`, e.message);
    return { summary: `LLM analysis failed: ${e.message}`, shouldAlert: null };
  }
}

/**
 * Build the prompt for a candidate
 */
function buildPrompt(candidate, narrative) {
  const narrativeInfo = narrative ? `
NARRATIVE: ${narrative.name}
Stage: ${narrative.stage} (early/mid/late — early = pre-mainstream, highest upside)
Confidence: ${(narrative.confidence * 100).toFixed(0)}%
Description: ${narrative.description}
Keywords: ${narrative.keywords.join(', ')}
` : 'Narrative: Unknown';

  const newsSnippets = candidate.relatedNews && candidate.relatedNews.length > 0
    ? candidate.relatedNews.slice(0, 3).map(n => `- "${n.headline}" (${n.source})`).join('\n')
    : '- No related news';

  const technicalData = candidate.quote
    ? `Price: $${candidate.quote.price} (${candidate.quote.changePercent > 0 ? '+' : ''}${candidate.quote.changePercent?.toFixed(1)}% today)`
    : 'Price: N/A';

  return `CANDIDATE: ${candidate.ticker}
${narrativeInfo}

TECHNICAL DATA:
${technicalData}
RSI (14): ${candidate.rsi || 'N/A'} ${candidate.rsi ? (candidate.rsi < 30 ? '(OVERSOLD)' : candidate.rsi > 70 ? '(OVERBOUGHT)' : '') : ''}
5-Day Momentum: ${candidate.momentum?.mom5d ? `${candidate.momentum.mom5d > 0 ? '+' : ''}${candidate.momentum.mom5d}%` : 'N/A'}
20-Day Momentum: ${candidate.momentum?.mom20d ? `${candidate.momentum.mom20d > 0 ? '+' : ''}${candidate.momentum.mom20d}%` : 'N/A'}
Signal: ${candidate.signal || 'N/A'}
Signal Reason: ${candidate.signalReason || 'N/A'}

RELATED NEWS:
${newsSnippets}

Provide your qualitative assessment.`;
}

/**
 * Parse LLM response to extract structured data
 */
function parseLLMResponse(text, candidate) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  let narrativeVerdict = null;
  let pricingVerdict = null;
  let bullCase = null;
  let bearCase = null;
  let recommendation = 'WATCH';
  let recommendationReason = '';
  let shouldAlert = false;

  for (const line of lines) {
    const lower = line.toLowerCase();
    
    if (lower.startsWith('1.') || lower.startsWith('is this narrative')) {
      narrativeVerdict = line;
    } else if (lower.startsWith('2.') || lower.startsWith('is the stock')) {
      pricingVerdict = line;
    } else if (lower.startsWith('3.') || lower.startsWith('bull case')) {
      bullCase = line.replace(/^3\.\s*/i, '').replace(/^bull case:?\s*/i, '');
    } else if (lower.startsWith('4.') || lower.startsWith('bear case')) {
      bearCase = line.replace(/^4\.\s*/i, '').replace(/^bear case:?\s*/i, '');
    } else if (lower.startsWith('5.') || lower.startsWith('alert recommendation') || lower.includes('alert recommendation')) {
      const match = line.match(/\b(ALERT|WATCH|SKIP)\b/i);
      recommendation = match ? match[1].toUpperCase() : 'WATCH';
      recommendationReason = line;
    }
  }

  // Determine shouldAlert
  if (recommendation === 'ALERT') {
    shouldAlert = true;
  } else if (recommendation === 'SKIP') {
    shouldAlert = false;
  }

  return {
    summary: text,
    narrativeVerdict,
    pricingVerdict,
    bullCase,
    bearCase,
    recommendation,
    recommendationReason,
    shouldAlert
  };
}

/**
 * Analyze multiple candidates
 */
export async function analyzeCandidates(candidates, narratives, apiKey = GROQ_API_KEY) {
  if (!apiKey) {
    console.log('[LLM] No Groq API key — skipping LLM analysis');
    return candidates.map(c => ({
      ...c,
      llmAnalysis: { summary: 'No LLM API key', shouldAlert: null }
    }));
  }

  console.log(`[LLM] Analyzing ${candidates.length} candidates with Groq...`);
  const results = [];

  for (const candidate of candidates) {
    // Find matching narrative
    const narrative = narratives.find(n => n.id === candidate.sourceNarratives?.[0]) || null;
    
    const analysis = await analyzeCandidate(candidate, narrative, apiKey);
    results.push({
      ...candidate,
      llmAnalysis: analysis
    });
    
    console.log(`[LLM] ${candidate.ticker}: ${analysis.recommendation}`);
    
    // Rate limit Groq
    await new Promise(r => setTimeout(r, 500));
  }

  return results;
}

/**
 * Get candidates that LLM recommends alerting on
 */
export function getLLMAlertCandidates(analyzedCandidates) {
  return analyzedCandidates.filter(c => c.llmAnalysis?.shouldAlert === true);
}
