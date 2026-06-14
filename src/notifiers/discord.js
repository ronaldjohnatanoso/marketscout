/**
 * Discord Notifier
 * 
 * Sends MarketScout alerts to Discord via webhook.
 * Supports rich embeds with opportunity details.
 */

import axios from 'axios';
import { readFileSync } from 'fs';

try {
  const envFile = readFileSync('/home/ronald/credentials/.env', 'utf8');
  envFile.split('\n').forEach(line => {
    const [k, ...rest] = line.split('=');
    if (k && rest.length) process.env[k.trim()] = rest.join('=').trim();
  });
} catch (e) { /* no .env */ }

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';

/**
 * Send a rich embed alert to Discord
 */
export async function sendAlert(alert, webhookUrl = DISCORD_WEBHOOK_URL) {
  if (!webhookUrl) {
    console.log('[Discord] No webhook URL configured — skipping alert');
    return { success: false, reason: 'no_webhook' };
  }
  
  const color = alert.severity === 'high' ? 0xFF4444 : alert.severity === 'medium' ? 0xFFAA00 : 0x44FF44;
  
  const embed = {
    title: `🚨 MarketScout Alert: ${alert.candidates[0]?.ticker || 'Opportunity Found'}`,
    description: alert.summary,
    color,
    fields: alert.candidates.map((c, i) => ({
      name: `${i + 1}. ${c.ticker} ${c.quote ? `$${c.quote.price} (${c.quote.changePercent > 0 ? '+' : ''}${c.quote.changePercent?.toFixed(1)}%)` : ''}`,
      value: `**${c.signal || 'WATCH'}**\n${c.signalReason || c.primaryNarrative}\nScore: ${c.score?.toFixed(1) || '?'}/10\n${c.reasons?.map(r => `• ${r}`).join('\n') || ''}`,
      inline: false
    })),
    footer: {
      text: `MarketScout • ${new Date().toISOString()}`
    },
    timestamp: new Date().toISOString()
  };
  
  if (alert.candidates.length === 1) {
    embed.fields = [{
      name: `${alert.candidates[0].ticker}`,
      value: `**${alert.candidates[0].signal || 'WATCH'}**\n${alert.candidates[0].signalReason || alert.candidates[0].primaryNarrative}\nScore: ${alert.candidates[0].score?.toFixed(1) || '?'}/10\n${alert.candidates[0].reasons?.map(r => `• ${r}`).join('\n') || ''}`,
      inline: false
    }];
  }
  
  try {
    const res = await axios.post(webhookUrl, {
      username: 'MarketScout',
      avatar_url: 'https://i.imgur.com/afR7R7G.png',
      embeds: [embed]
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    console.log('[Discord] Alert sent successfully');
    return { success: true, status: res.status };
  } catch (e) {
    console.error('[Discord] Failed to send alert:', e.message);
    return { success: false, reason: e.message };
  }
}

/**
 * Send a daily summary report to Discord
 */
export async function sendDailySummary(report, webhookUrl = DISCORD_WEBHOOK_URL) {
  if (!webhookUrl) {
    console.log('[Discord] No webhook URL — skipping daily summary');
    return { success: false, reason: 'no_webhook' };
  }
  
  const embed = {
    title: '📊 MarketScout Daily Brief',
    description: `Scanned ${report.newsScanned} news items across ${report.narratives} active narratives. Found ${report.candidates.length} candidates.`,
    color: 0x3498DB,
    fields: report.topCandidates.slice(0, 5).map((c, i) => ({
      name: `#${i + 1} ${c.ticker} — Score: ${c.score?.toFixed(1) || '?'}/10`,
      value: `${c.primaryNarrative}\n${c.quote ? `$${c.quote.price} (${c.quote.changePercent > 0 ? '+' : ''}${c.quote.changePercent?.toFixed(1)}%)` : ''}\n${c.reasons?.slice(0, 2).map(r => `• ${r}`).join('\n') || ''}`,
      inline: false
    })),
    footer: {
      text: `MarketScout • ${new Date().toISOString()}`
    },
    timestamp: new Date().toISOString()
  };
  
  try {
    const res = await axios.post(webhookUrl, {
      username: 'MarketScout',
      avatar_url: 'https://i.imgur.com/afR7R7G.png',
      embeds: [embed]
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    return { success: true, status: res.status };
  } catch (e) {
    return { success: false, reason: e.message };
  }
}

/**
 * Send a test message
 */
export async function sendTest(webhookUrl = DISCORD_WEBHOOK_URL) {
  if (!webhookUrl) {
    console.log('[Discord] No webhook URL. Set DISCORD_WEBHOOK_URL in /home/ronald/credentials/.env');
    return { success: false, reason: 'no_webhook' };
  }
  
  try {
    const res = await axios.post(webhookUrl, {
      username: 'MarketScout',
      content: '✅ MarketScout is online and watching. Alerts will appear here when opportunities are detected.'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    console.log('[Discord] Test message sent successfully');
    return { success: true };
  } catch (e) {
    console.error('[Discord] Test failed:', e.message);
    return { success: false, reason: e.message };
  }
}

// CLI test
if (process.argv.includes('--test')) {
  sendTest().then(r => {
    console.log(r);
    process.exit(r.success ? 0 : 1);
  });
}
