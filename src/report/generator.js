/**
 * MarketScout Report Generator
 * 
 * Generates markdown reports with narrative-driven analysis.
 * These reports get pushed to GitHub daily.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ALERTS_DIR = join(__dirname, '../../alerts');
const DATA_DIR = join(__dirname, '../../data');

// Ensure directories exist
if (!existsSync(ALERTS_DIR)) mkdirSync(ALERTS_DIR, { recursive: true });
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

/**
 * Generate a discovery report markdown
 */
export function generateReport(scanResult) {
  const timestamp = new Date().toISOString();
  const dateSlug = new Date().toISOString().split('T')[0];
  
  let md = `# 📊 MarketScout Daily Brief — ${dateSlug}\n\n`;
  md += `*Generated: ${timestamp} (Asia/Manila)*\n\n`;
  md += `---\n\n`;
  
  // Executive summary
  md += `## Executive Summary\n\n`;
  md += `Scanned **${scanResult.newsScanned}** news items across **${scanResult.narratives}** active narratives.\n`;
  md += `Detected **${scanResult.matches}** narrative-news matches.\n`;
  md += `Found **${scanResult.candidates.length}** candidate opportunities.\n\n`;
  
  // Top opportunities
  md += `## 🚨 Top Opportunities\n\n`;
  
  if (scanResult.topCandidates.length === 0) {
    md += `*No high-confidence opportunities detected in this scan.*\n\n`;
  } else {
    for (let i = 0; i < Math.min(scanResult.topCandidates.length, 5); i++) {
      const c = scanResult.topCandidates[i];
      md += `### ${i + 1}. ${c.ticker}\n\n`;
      md += `**Score: ${c.score?.toFixed(1) || '?'}/10**\n\n`;
      md += `**Narrative:** ${c.primaryNarrative}\n\n`;
      
      if (c.quote) {
        md += `**Price:** $${c.quote.price} `;
        md += `(${c.quote.changePercent > 0 ? '🟢' : '🔴'} ${c.quote.changePercent > 0 ? '+' : ''}${c.quote.changePercent?.toFixed(1)}%)\n\n`;
      }
      
      md += `**Why this opportunity:**\n`;
      if (c.reasons && c.reasons.length > 0) {
        for (const reason of c.reasons) {
          md += `- ${reason}\n`;
        }
      } else {
        md += `- Positioned to benefit from: ${c.primaryNarrative}\n`;
      }
      md += `\n`;
      
      if (c.relatedNews && c.relatedNews.length > 0) {
        md += `**Related News:**\n`;
        for (const news of c.relatedNews.slice(0, 2)) {
          md += `- [${news.headline}](${news.url || '#'}) — *${news.source}*\n`;
        }
        md += `\n`;
      }
      
      md += `---\n\n`;
    }
  }
  
  // Active narratives
  md += `## 📡 Active Narratives Being Tracked\n\n`;
  md += `| Narrative | Stage | Confidence | Keywords |\n`;
  md += `|-----------|-------|------------|--------|\n`;
  
  const narratives = scanResult.narrativeList || scanResult.narratives || [];
  for (const n of narratives.slice(0, 7)) {
    md += `| ${n.name} | ${n.stage} | ${(n.confidence * 100).toFixed(0)}% | ${n.keywords.slice(0, 3).join(', ')} |\n`;
  }
  md += `\n`;
  
  // All candidates
  md += `## 📋 Full Candidate List\n\n`;
  md += `| Ticker | Narrative | Score | Price | Change |\n`;
  md += `|--------|-----------|-------|-------|--------|\n`;
  
  for (const c of scanResult.candidates) {
    const price = c.quote ? `$${c.quote.price}` : 'N/A';
    const change = c.quote ? `${c.quote.changePercent > 0 ? '+' : ''}${c.quote.changePercent?.toFixed(1)}%` : 'N/A';
    md += `| ${c.ticker} | ${c.primaryNarrative} | ${c.score?.toFixed(1) || '?'} | ${price} | ${change} |\n`;
  }
  md += `\n`;
  
  // Footer
  md += `---\n\n`;
  md += `*MarketScout monitors pre-mainstream investment opportunities.\n`;
  md += `Report generated automatically. Not financial advice.*\n`;
  
  return { md, dateSlug };
}

/**
 * Save report to alerts directory
 */
export function saveReport(scanResult) {
  const { md, dateSlug } = generateReport(scanResult);
  
  const filename = `brief-${dateSlug}.md`;
  const filepath = join(ALERTS_DIR, filename);
  writeFileSync(filepath, md, 'utf8');
  
  // Also save latest.md as always-current copy
  const latestPath = join(ALERTS_DIR, 'latest.md');
  writeFileSync(latestPath, md, 'utf8');
  
  // Save JSON data
  const dataPath = join(DATA_DIR, `scan-${dateSlug}.json`);
  writeFileSync(dataPath, JSON.stringify(scanResult, null, 2), 'utf8');
  
  console.log(`[Report] Saved: ${filepath}`);
  return { filepath, latestPath, dataPath };
}

/**
 * Generate alert-specific report (high-priority)
 */
export function generateAlertReport(candidates, severity = 'medium') {
  const timestamp = new Date().toISOString();
  const dateSlug = new Date().toISOString().split('T')[0];
  const timeSlug = new Date().toISOString().split('T')[1].split('.')[0].replace(':', '-');
  
  let md = `# 🚨 MarketScout Alert — ${dateSlug} ${timeSlug}\n\n`;
  md += `*Severity: ${severity.toUpperCase()}*\n\n`;
  md += `---\n\n`;
  
  for (const c of candidates) {
    md += `## ${c.ticker}\n\n`;
    md += `**Score: ${c.score?.toFixed(1) || '?'}/10**\n\n`;
    md += `**Signal:** ${c.signal || 'WATCH'}\n`;
    md += `**Reason:** ${c.signalReason || c.primaryNarrative}\n\n`;
    
    if (c.quote) {
      md += `**Price:** $${c.quote.price} `;
      md += `(${c.quote.changePercent > 0 ? '🟢' : '🔴'} ${c.quote.changePercent > 0 ? '+' : ''}${c.quote.changePercent?.toFixed(1)}%)\n\n`;
    }
    
    md += `**Narrative:** ${c.primaryNarrative}\n\n`;
    md += `**Reasons:**\n`;
    if (c.reasons) {
      for (const reason of c.reasons) {
        md += `- ${reason}\n`;
      }
    }
    md += `\n---\n\n`;
  }
  
  md += `\n*Generated: ${timestamp}*\n`;
  
  const filename = `alert-${dateSlug}-${timeSlug}.md`;
  const filepath = join(ALERTS_DIR, filename);
  writeFileSync(filepath, md, 'utf8');
  
  return filepath;
}

/**
 * Load latest report
 */
export function loadLatestReport() {
  const latestPath = join(ALERTS_DIR, 'latest.md');
  try {
    return readFileSync(latestPath, 'utf8');
  } catch (e) {
    return null;
  }
}
