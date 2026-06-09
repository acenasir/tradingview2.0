import type { Candle, Quote, Resolution } from '../data/providers/types';
import { resolutionSeconds } from './resolutions';

/* ── Deterministic PRNG so a given symbol always yields the same demo series ── */

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A plausible starting price derived from the symbol so demos look varied but stable. */
function basePrice(symbol: string): number {
  const h = hashString(symbol);
  if (symbol.includes('/')) {
    // forex / crypto pairs
    if (/USD$/.test(symbol) && /^(BTC|ETH)/.test(symbol)) return 1000 + (h % 60000);
    return 0.5 + (h % 200) / 100; // forex-ish 0.5–2.5
  }
  return 20 + (h % 480); // equities 20–500
}

/**
 * Generate a deterministic synthetic OHLC series. Used as a graceful fallback
 * whenever a real provider is unavailable (no API key, offline, or rate-limited)
 * so the grid is always populated. Badged as "demo" in the UI.
 */
export function generateMockCandles(symbol: string, resolution: Resolution, count = 400): Candle[] {
  const rng = mulberry32(hashString(`${symbol}:${resolution}`));
  const step = resolutionSeconds(resolution);
  const end = Math.floor(Date.now() / 1000 / step) * step;
  const start = end - step * (count - 1);

  let price = basePrice(symbol);
  const vol = price * 0.012; // ~1.2% per-bar volatility
  const candles: Candle[] = [];

  for (let i = 0; i < count; i++) {
    const time = start + i * step;
    const drift = (rng() - 0.49) * vol * 2;
    const open = price;
    const close = Math.max(0.0001, open + drift);
    const wick = Math.abs(drift) + rng() * vol;
    const high = Math.max(open, close) + rng() * wick;
    const low = Math.min(open, close) - rng() * wick;
    const volume = Math.round((500_000 + rng() * 5_000_000) * (price > 100 ? 0.3 : 1));
    candles.push({
      time,
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
      volume,
    });
    price = close;
  }
  return candles;
}

/** Build a delayed-style quote from a candle series (used by the mock provider). */
export function quoteFromCandles(symbol: string, candles: Candle[]): Quote {
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2] ?? last;
  const prevClose = prev.close;
  const price = last.close;
  const change = price - prevClose;
  return {
    symbol,
    price,
    change,
    changePercent: prevClose ? (change / prevClose) * 100 : 0,
    prevClose,
    open: last.open,
    high: last.high,
    low: last.low,
    volume: last.volume,
    timestamp: Date.now(),
    freshness: 'mock',
  };
}

/** Standard Heikin-Ashi transform (client-side; no extra data needed). */
export function toHeikinAshi(candles: Candle[]): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const prev = out[i - 1];
    const haOpen = prev ? (prev.open + prev.close) / 2 : (c.open + c.close) / 2;
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);
    out.push({
      time: c.time,
      open: round(haOpen),
      high: round(haHigh),
      low: round(haLow),
      close: round(haClose),
      volume: c.volume,
    });
  }
  return out;
}

function round(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
