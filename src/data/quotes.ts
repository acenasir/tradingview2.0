import { useEffect } from 'react';
import { create } from 'zustand';
import { useSettingsStore } from '../store/settingsStore';
import { finnhubAvailable, finnhubStream } from './providers/finnhub';
import { getQuote } from './providers/router';
import type { Quote, Tick } from './providers/types';
import type { SocketStatus } from './socket';

/**
 * Shared quote distribution. In delayed-free mode every subscribed symbol is
 * polled on the shared interval. In realtime mode, eligible US tickers are
 * streamed live via Finnhub (seeded once with a delayed quote for prev-close so
 * change% is correct); everything else gracefully falls back to delayed polling.
 */

interface QuoteStoreState {
  quotes: Record<string, Quote>;
  polling: boolean;
  lastPollAt: number | null;
  /** True when ≥1 symbol is being streamed. */
  streaming: boolean;
  streamStatus: SocketStatus | 'idle';
}

export const useQuoteStore = create<QuoteStoreState>(() => ({
  quotes: {},
  polling: false,
  lastPollAt: null,
  streaming: false,
  streamStatus: 'idle',
}));

const refCounts = new Map<string, number>();
const streamed = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;

/** A symbol is stream-eligible when realtime mode is on, a Finnhub token exists,
 *  and it looks like a plain US ticker (no forex/crypto "/" pair). */
function canStream(symbol: string): boolean {
  return (
    useSettingsStore.getState().dataMode === 'realtime' &&
    finnhubAvailable() &&
    /^[A-Z][A-Z.]*$/.test(symbol)
  );
}

function applyTick(t: Tick): void {
  const cur = useQuoteStore.getState().quotes[t.symbol];
  if (!streamed.has(t.symbol)) return; // ignore stale ticks for unsubscribed symbols
  const prevClose = cur?.prevClose;
  const change = prevClose != null ? t.price - prevClose : (cur?.change ?? 0);
  const changePercent = prevClose ? (change / prevClose) * 100 : (cur?.changePercent ?? 0);
  const quote: Quote = {
    symbol: t.symbol,
    price: t.price,
    change,
    changePercent,
    prevClose,
    open: cur?.open,
    high: cur?.high,
    low: cur?.low,
    volume: cur?.volume,
    timestamp: t.timestamp || Date.now(),
    freshness: 'realtime',
  };
  useQuoteStore.setState((s) => ({ quotes: { ...s.quotes, [t.symbol]: quote } }));
}

finnhubStream.onTick(applyTick);
finnhubStream.onStatus((status) => useQuoteStore.setState({ streamStatus: status }));

/** Fetch a delayed quote once to seed prev-close/open for newly streamed symbols. */
async function seed(symbols: string[]): Promise<void> {
  const results = await Promise.allSettled(symbols.map((s) => getQuote(s)));
  const next = { ...useQuoteStore.getState().quotes };
  results.forEach((r, i) => {
    if (r.status !== 'fulfilled') return;
    const q = r.value;
    const existing = next[symbols[i]];
    // Keep a live price if a tick already arrived; just refresh the daily anchors.
    next[symbols[i]] =
      existing && existing.freshness === 'realtime'
        ? { ...existing, prevClose: q.prevClose, open: q.open, high: q.high, low: q.low }
        : q;
  });
  useQuoteStore.setState({ quotes: next });
}

/** Re-partition subscribed symbols into streamed vs polled. */
function recompute(): void {
  const all = [...refCounts.keys()];
  const next = new Set(all.filter(canStream));
  const toSeed = [...next].filter((s) => !streamed.has(s));
  streamed.clear();
  next.forEach((s) => streamed.add(s));
  finnhubStream.setSymbols([...streamed]);
  useQuoteStore.setState({ streaming: streamed.size > 0, streamStatus: streamed.size > 0 ? useQuoteStore.getState().streamStatus : 'idle' });
  if (toSeed.length) void seed(toSeed);
}

async function pollOnce(): Promise<void> {
  const polled = [...refCounts.keys()].filter((s) => !streamed.has(s));
  if (!polled.length) {
    useQuoteStore.setState({ polling: false, lastPollAt: Date.now() });
    return;
  }
  useQuoteStore.setState({ polling: true });
  const results = await Promise.allSettled(polled.map((s) => getQuote(s)));
  const next = { ...useQuoteStore.getState().quotes };
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') next[polled[i]] = r.value;
  });
  useQuoteStore.setState({ quotes: next, polling: false, lastPollAt: Date.now() });
}

function schedule(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(tick, useSettingsStore.getState().pollIntervalMs);
}

async function tick(): Promise<void> {
  await pollOnce();
  if (running) schedule();
}

function start(): void {
  if (running) return;
  running = true;
  recompute();
  void tick();
}

function stop(): void {
  running = false;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  finnhubStream.setSymbols([]);
  streamed.clear();
  useQuoteStore.setState({ streaming: false, streamStatus: 'idle' });
}

export function subscribeSymbols(symbols: string[]): () => void {
  for (const s of symbols) refCounts.set(s, (refCounts.get(s) ?? 0) + 1);
  if (!running) {
    start();
  } else {
    recompute();
    void pollOnce(); // fetch any newly-added delayed symbols immediately
  }
  return () => {
    for (const s of symbols) {
      const count = (refCounts.get(s) ?? 1) - 1;
      if (count <= 0) refCounts.delete(s);
      else refCounts.set(s, count);
    }
    if (refCounts.size === 0) stop();
    else recompute();
  };
}

// React to data-mode / poll-interval changes.
useSettingsStore.subscribe((state, prev) => {
  if (!running) return;
  if (state.dataMode !== prev.dataMode) {
    recompute();
    void pollOnce();
  }
  if (state.pollIntervalMs !== prev.pollIntervalMs) schedule();
});

export function useQuote(symbol?: string): Quote | undefined {
  useEffect(() => {
    if (!symbol) return;
    return subscribeSymbols([symbol]);
  }, [symbol]);
  return useQuoteStore((s) => (symbol ? s.quotes[symbol] : undefined));
}

export function useQuotes(symbols: string[]): Record<string, Quote> {
  const key = symbols.join(',');
  useEffect(() => {
    if (!symbols.length) return;
    return subscribeSymbols(symbols);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return useQuoteStore((s) => s.quotes);
}
