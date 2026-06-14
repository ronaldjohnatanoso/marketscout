/**
 * MarketScout Scheduler
 * 
 * Entry point for scheduled scans.
 * Parses args, runs scan pipeline, sends notifications.
 */

import { readFileSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ALERTS_DIR = join(__dirname, '../../alerts');

// Load env
try {
  const envFile = readFileSync('/home/ronald/credentials/.env', 'utf8');
  envFile.split('\n').forEach(line => {
    const [k, ...rest] = line.split('=');
    if (k && rest.length) process.env[k.trim()] = rest.join('=').trim();
  });
} catch (e) { /* no .env */ }

const SCORE_THRESHOLD = parseFloat(process.env.ALERT_THRESHOLD || '6.0');
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';

const args = process.argv.slice(2);

// CLI commands
if (args.includes('--test')) {
  console.log('[Scheduler] Running in test mode...');
  runScan(true).then(() => process.exit(0));
} else if (args.includes('--list')) {
  listAlerts();
} else if (args.includes('--clear')) {
  clearAlerts();
} else if (args.includes('--report')) {
  showLatestReport();
} else {
  // Default: run scan
  runScan(false).then(() => process.exit(0));
}

async function runScan(isTest = false) {
  console.log('[Scheduler] MarketScout scan starting...');
  console.log(`[Scheduler] Alert threshold: ${SCORE_THRESHOLD}`);
  
  const { scan } = await import('../discovery/scanner.js');
  const { screenCandidates } = await import('../analysis/quant/screener.js');
  const { saveReport, generateAlertReport } = await import('../report/generator.js');
  const { sendAlert, sendDailySummary } = await import('../notifiers/discord.js');
  
  // Step 1: Discovery scan
  const scanResult = await scan();
  
  // Step 2: Screen top candidates with technical analysis
  if (scanResult.topCandidates.length > 0) {
    console.log('[Scheduler] Screening candidates with technical analysis...');
    const tickerSymbols = scanResult.topCandidates
      .slice(0, 8)
      .map(c => c.ticker)
      .filter(t => !t.includes(' '));
    
    const screened = await screenCandidates(tickerSymbols);
    
    // Merge screening data into candidates
    for (const c of scanResult.topCandidates) {
      const screenedData = screened.find(s => s.symbol === c.ticker);
      if (screenedData) {
        c.signal = screenedData.signal;
        c.signalReason = screenedData.signalReason;
        c.rsi = screenedData.rsi;
        c.momentum = screenedData.momentum;
        c.macd = screenedData.macd;
      }
    }
  }
  
  // Step 3: Save report
  const { filepath } = saveReport(scanResult);
  console.log(`[Scheduler] Report saved: ${filepath}`);
  
  // Step 4: Check for alerts
  const alertCandidates = scanResult.topCandidates.filter(c => c.score >= SCORE_THRESHOLD);
  
  if (alertCandidates.length > 0) {
    console.log(`[Scheduler] ${alertCandidates.length} candidates above threshold — sending Discord alert`);
    
    const severity = alertCandidates[0].score >= 8 ? 'high' : 'medium';
    
    await sendAlert({
      severity,
      summary: `${alertCandidates.length} opportunity candidate(s) detected above threshold`,
      candidates: alertCandidates
    });
    
    // Also save alert-specific report
    generateAlertReport(alertCandidates, severity);
  } else {
    console.log('[Scheduler] No candidates above alert threshold — no Discord alert sent');
  }
  
  // Step 5: Send daily summary to Discord (every run)
  if (!isTest && DISCORD_WEBHOOK_URL) {
    await sendDailySummary(scanResult);
  }
  
  console.log('[Scheduler] Scan complete');
  return scanResult;
}

function listAlerts() {
  if (!existsSync(ALERTS_DIR)) {
    console.log('No alerts directory found');
    return;
  }
  
  const files = readdirSync(ALERTS_DIR)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse();
  
  console.log(`\n=== MarketScout Alerts (${files.length}) ===\n`);
  for (const file of files.slice(0, 20)) {
    console.log(`  ${file}`);
  }
}

function clearAlerts() {
  if (!existsSync(ALERTS_DIR)) {
    console.log('No alerts to clear');
    return;
  }
  
  const files = readdirSync(ALERTS_DIR).filter(f => f.endsWith('.md'));
  for (const file of files) {
    unlinkSync(join(ALERTS_DIR, file));
  }
  console.log(`Cleared ${files.length} alert files`);
}

function showLatestReport() {
  const { loadLatestReport } = require('../report/generator.js');
  const report = loadLatestReport();
  if (report) {
    console.log(report);
  } else {
    console.log('No latest report found. Run a scan first.');
  }
}
