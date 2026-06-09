import { defaultHistoryRange } from '../../lib/resolutions';
import { TokenBucket } from '../../lib/rateLimiter';
import { useSettingsStore } from '../../store/settingsStore';
import { TtlCache, readHistoryCache, writeHistoryCache } from '../cache';
import { mockProvider } from './mock';
import { twelveDataProvider } from './twelvedata';
import {
  RateLimitError,
  SymbolNotFoundError,
  type HistoryResult,
  type Quote,
  type Resolution,
  type SymbolResult,
} from './types';
import { searchUniverse } from './universe';

/**
 * The router is the single entry point the app uses for data. In delayed-free
 * mode it prefers Twelve Data (global coverage + search) and degrades to the
 * deterministic mock provider whenever a key is missing, the network fails, or
 * we hit a rate limit — so the UI is always populated and never errors hard.
 *
 * Realtime streaming providers (Finnhub WS, Alpaca IEX) are wired in a later step.
 */

// Twelve Data free tier ≈ 8 requests/minute. Keep a little headroom.
const tdBucket = new TokenBucket(8, 7);

const quoteCache = new TtlCache<Quote>(12_000);
const historyMem = new TtlCache<HistoryResult>(1000 * 60 * 5);

function quoteTtlMs(): number {
  return Math.max(2000, useSettingsStore.getState().pollIntervalMs);
}

/* ── search ───────────────────────────────────────────────────────────────── */

export async function searchSymbols(query: string, signal?: AbortSignal): Promise<SymbolResult[]> {
  const q = query.trim();
  if (!q) return searchUniverse('');
  if (tdBucket.tryTake()) {
    try {
      const results = await twelveDataProvider.searchSymbols(q, signal);
      if (results.length) return results;
    } catch {
      /* fall through to local universe */
    }
  }
  return searchUniverse(q);
}

/* ── history ──────────────────────────────────────────────────────────────── */

export async function getHistory(symbol: string, resolution: Resolution): Promise<HistoryResult> {
  const key = `${symbol}:${resolution}`;

  const memHit = historyMem.get(key);
  if (memHit) return memHit;

  const stored = readHistoryCache<HistoryResult>(key);
  if (stored) {
    historyMem.set(key, stored);
    return stored;
  }

  const { from, to } = defaultHistoryRange(resolution);

  if (tdBucket.tryTake()) {
    try {
      const candles = await twelveDataProvider.getHistory(symbol, resolution, from, to);
      if (candles.length) {
        const result: HistoryResult = { candles, freshness: 'delayed', source: 'twelvedata' };
        historyMem.set(key, result);
        writeHistoryCache(key, result);
        return result;
      }
    } catch (err) {
      // A genuinely unknown symbol should surface as such; transient/limit
      // errors fall through to demo data so the pane still renders.
      if (err instanceof SymbolNotFoundError) throw err;
    }
  }

  const candles = await mockProvider.getHistory(symbol, resolution, from, to);
  const result: HistoryResult = { candles, freshness: 'mock', source: 'mock' };
  // Short TTL so we retry the real provider once budget/network recovers.
  historyMem.set(key, result, 60_000);
  return result;
}

/* ── quote ────────────────────────────────────────────────────────────────── */

export async function getQuote(symbol: string): Promise<Quote> {
  const cached = quoteCache.get(symbol);
  if (cached) return cached;

  if (tdBucket.tryTake()) {
    try {
      const quote = await twelveDataProvider.getQuote(symbol);
      quoteCache.set(symbol, quote, quoteTtlMs());
      return quote;
    } catch (err) {
      // On rate limit, prefer serving the last known value over demo data.
      if (err instanceof RateLimitError) {
        const stale = quoteCache.getStale(symbol);
        if (stale) return { ...stale, timestamp: stale.timestamp };
      }
    }
  } else {
    const stale = quoteCache.getStale(symbol);
    if (stale) return stale;
  }

  const mock = await mockProvider.getQuote(symbol);
  quoteCache.set(symbol, mock, quoteTtlMs());
  return mock;
}

/** Best-effort label of where data is currently coming from (for the status bar). */
export function rateBudgetRemaining(): number {
  return tdBucket.available;
}
