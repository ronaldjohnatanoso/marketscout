#!/usr/bin/env python3
"""
MarketScout Yahoo Finance Data Fetcher
Fetches historical candle data for technical analysis.
Used as fallback when Finnhub doesn't provide candle data.
"""

import sys
import json
import argparse
from datetime import datetime, timedelta

try:
    import yfinance as yf
except ImportError:
    print(json.dumps({"error": "yfinance not installed"}))
    sys.exit(1)


def fetch_candles(symbol, period="3mo"):
    """Fetch historical candles for a symbol."""
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period)
        
        if hist.empty:
            return None
        
        closes = hist['Close'].tolist()
        highs = hist['High'].tolist()
        lows = hist['Low'].tolist()
        opens = hist['Open'].tolist()
        volumes = hist['Volume'].tolist()
        timestamps = [int(d.timestamp()) for d in hist.index]
        
        return {
            "symbol": symbol,
            "closes": [round(c, 2) for c in closes],
            "highs": [round(h, 2) for h in highs],
            "lows": [round(l, 2) for l in lows],
            "opens": [round(o, 2) for o in opens],
            "volumes": [int(v) for v in volumes],
            "timestamps": timestamps
        }
    except Exception as e:
        return {"symbol": symbol, "error": str(e)}


def calculate_rsi(closes, period=14):
    """Calculate RSI."""
    if len(closes) < period + 1:
        return None
    
    gains = 0
    losses = 0
    for i in range(len(closes) - period, len(closes)):
        change = closes[i] - closes[i - 1]
        if change > 0:
            gains += change
        else:
            losses += abs(change)
    
    avg_gain = gains / period
    avg_loss = losses / period
    
    if avg_loss == 0:
        return 100.0
    
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return round(rsi, 2)


def calculate_macd(closes):
    """Calculate MACD."""
    if len(closes) < 26:
        return None
    
    def ema(data, period):
        k = 2 / (period + 1)
        ema_val = sum(data[:period]) / period
        for i in range(period, len(data)):
            ema_val = (data[i] - ema_val) * k + ema_val
        return ema_val
    
    ema12 = ema(closes, 12)
    ema26 = ema(closes, 26)
    macd = ema12 - ema26
    
    # Signal line (9-period EMA of MACD)
    macd_series = [macd] * 9
    signal = ema(macd_series, 9)
    histogram = macd - signal
    
    return {
        "macd": round(macd, 4),
        "signal": round(signal, 4),
        "histogram": round(histogram, 4)
    }


def calculate_momentum(closes):
    """Calculate price momentum."""
    if len(closes) < 6:
        return None
    
    current = closes[-1]
    mom1d = ((current - closes[-2]) / closes[-2]) * 100 if len(closes) >= 2 else 0
    mom5d = ((current - closes[-6]) / closes[-6]) * 100 if len(closes) >= 6 else 0
    mom20d = ((current - closes[-21]) / closes[-21]) * 100 if len(closes) >= 21 else 0
    
    return {
        "mom1d": round(mom1d, 2),
        "mom5d": round(mom5d, 2),
        "mom20d": round(mom20d, 2)
    }


def calculate_ma(closes):
    """Calculate moving averages."""
    if len(closes) < 20:
        return None
    
    current = closes[-1]
    ma20 = sum(closes[-20:]) / min(20, len(closes))
    ma50 = sum(closes[-50:]) / 50 if len(closes) >= 50 else None
    ma200 = sum(closes[-200:]) / 200 if len(closes) >= 200 else None
    
    return {
        "ma20": round(ma20, 2),
        "ma50": round(ma50, 2) if ma50 else None,
        "ma200": round(ma200, 2) if ma200 else None,
        "priceVsMA20": round(((current - ma20) / ma20) * 100, 2)
    }


def screen_symbol(symbol):
    """Full technical analysis for a symbol."""
    candles = fetch_candles(symbol)
    if not candles or "error" in candles:
        return {"symbol": symbol, "error": candles.get("error", "No data")}
    
    closes = candles["closes"]
    if len(closes) < 20:
        return {"symbol": symbol, "error": "Insufficient data"}
    
    current_price = closes[-1]
    prev_close = closes[-2] if len(closes) >= 2 else current_price
    today_change = round(((current_price - prev_close) / prev_close) * 100, 2)
    
    rsi = calculate_rsi(closes)
    macd = calculate_macd(closes)
    momentum = calculate_momentum(closes)
    ma = calculate_ma(closes)
    
    # Determine signal
    signal = "HOLD"
    signal_reason = ""
    
    if rsi:
        if rsi < 30:
            signal = "OVERSOLD — Watch for bounce"
            signal_reason = f"RSI at {rsi} suggests undersold"
        elif rsi > 70:
            signal = "OVERBOUGHT — Caution"
            signal_reason = f"RSI at {rsi} suggests overbought"
        elif rsi > 60:
            signal = "BULLISH"
            signal_reason = f"RSI at {rsi} confirms upward momentum"
    
    if macd and macd["histogram"] > 0:
        if signal == "HOLD":
            signal = "BULLISH"
            signal_reason = "MACD histogram positive"
    
    if momentum and momentum["mom5d"] > 5:
        signal = "BREAKOUT CANDIDATE"
        signal_reason = f"+{momentum['mom5d']}% in 5 days — momentum building"
    
    return {
        "symbol": symbol,
        "price": current_price,
        "todayChange": today_change,
        "rsi": rsi,
        "macd": macd,
        "momentum": momentum,
        "movingAverages": ma,
        "signal": signal,
        "signalReason": signal_reason
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MarketScout Yahoo Finance data")
    parser.add_argument("symbol", help="Stock ticker symbol")
    parser.add_argument("--period", default="3mo", help="Period: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, max")
    parser.add_argument("--screen", action="store_true", help="Run full technical analysis")
    
    args = parser.parse_args()
    
    if args.screen:
        result = screen_symbol(args.symbol)
    else:
        result = fetch_candles(args.symbol, args.period)
    
    print(json.dumps(result, indent=2))
