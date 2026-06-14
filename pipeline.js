/**
 * MarketScout Pipeline
 * 
 * Main orchestrator — runs the full discovery + analysis + report pipeline.
 * Can be called directly or via scheduler.
 * 
 * Usage:
 *   node pipeline.js              # Full scan + report
 *   node pipeline.js --scan       # Discovery only
 *   node pipeline.js --screen     # Technical analysis only
 *   node pipeline.js --report     # Report generation only
 *   node pipeline.js --discord    # Send to Discord only
 */

import { readFileSync } from 'fs';

try {
  const envFile = readFileSync('/home/ronald/credentials/.env', 'utf8');
  envFile.split('\n').forEach(line => {
    const [k, ...rest] = line.split('=');
    if (k && rest.length) process.env[k.trim()] = rest.join('=').trim();
  });
} catch (e) { /* no .env */ }

const args = process.argv.slice(2);
const mode = args.find(a => a.startsWith('--')) || '--all';

async function main() {
  console.log('=== MarketScout Pipeline ===');
  console.log(`Mode: ${mode}`);
  console.log(`Started: ${new Date().toISOString()}`);
  console.log();

  if (mode === '--narratives') {
    const { printNarrativeStatus } = await import('./src/discovery/narratives.js');
    printNarrativeStatus();
    return;
  }

  if (mode === '--sectors') {
    const { printSectorMap } = await import('./src/discovery/sector-map.js');
    printSectorMap();
    return;
  }

  // Full pipeline
  const scanResult = await runPipeline();
  console.log('\n=== Pipeline Complete ===');
  console.log(`Candidates found: ${scanResult.candidates.length}`);
  console.log(`Top candidate: ${scanResult.topCandidates[0]?.ticker || 'none'} (score: ${scanResult.topCandidates[0]?.score?.toFixed(1) || '?'})`);
}

async function runPipeline() {
  // Step 1: Discovery scan
  if (mode === '--all' || mode === '--scan') {
    console.log('[Pipeline] Step 1: Running discovery scan...');
  }
  const { scan } = await import('./src/discovery/scanner.js');
  const scanResult = await scan();
  console.log(`[Pipeline] Discovery complete: ${scanResult.candidates.length} candidates`);
  
  // Step 2: Technical analysis on top candidates
  if (mode === '--all' || mode === '--screen' || mode === '--analysis') {
    console.log('[Pipeline] Step 2: Running technical analysis...');
    const { screenCandidates } = await import('./src/analysis/quant/screener.js');
    
    const tickerSymbols = scanResult.topCandidates
      .slice(0, 10)
      .map(c => c.ticker)
      .filter(t => !t.includes(' '));
    
    const screened = await screenCandidates(tickerSymbols);
    
    // Merge
    for (const c of scanResult.topCandidates) {
      const sd = screened.find(s => s.symbol === c.ticker);
      if (sd) {
        Object.assign(c, {
          signal: sd.signal,
          signalReason: sd.signalReason,
          rsi: sd.rsi,
          momentum: sd.momentum,
          macd: sd.macd,
          movingAverages: sd.movingAverages
        });
      }
    }
    console.log(`[Pipeline] Technical analysis complete`);
  }
  
  // Step 3: Generate report
  if (mode === '--all' || mode === '--report') {
    console.log('[Pipeline] Step 3: Generating report...');
    const { saveReport } = await import('./src/report/generator.js');
    const { filepath } = saveReport(scanResult);
    console.log(`[Pipeline] Report saved: ${filepath}`);
  }
  
  // Step 4: Discord notification
  if (mode === '--all' || mode === '--discord') {
    console.log('[Pipeline] Step 4: Sending Discord notification...');
    const { sendAlert, sendDailySummary } = await import('./src/notifiers/discord.js');
    const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';
    const SCORE_THRESHOLD = parseFloat(process.env.ALERT_THRESHOLD || '6.0');
    
    const alertCandidates = scanResult.topCandidates.filter(c => c.score >= SCORE_THRESHOLD);
    
    if (alertCandidates.length > 0) {
      await sendAlert({
        severity: alertCandidates[0].score >= 8 ? 'high' : 'medium',
        summary: `${alertCandidates.length} opportunity candidate(s) detected`,
        candidates: alertCandidates
      });
    } else {
      await sendDailySummary(scanResult);
    }
  }
  
  return scanResult;
}

main().catch(e => {
  console.error('[Pipeline] Error:', e);
  process.exit(1);
});
