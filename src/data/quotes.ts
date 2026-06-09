import { useEffect } from 'react';
import { create } from 'zustand';
import { useSettingsStore } from '../store/settingsStore';
import { getQuote } from './providers/router';
import type { Quote } from './providers/types';

/**
 * A single shared polling loop for delayed quotes. Components subscribe to the
 * symbols they care about (ref-counted); the loop fetches them on the shared
 * interval and writes results into a Zustand store. Caching in the router keeps
 * us inside free-tier limits, and one loop means 16 panes never spin up 16 timers.
 */

interface QuoteStoreState {
  quotes: Record<string, Quote>;
  polling: boolean;
  lastPollAt: number | null;
}

export const useQuoteStore = create<QuoteStoreState>(() => ({
  quotes: {},
  polling: false,
  lastPollAt: null,
}));

const refCounts = new Map<string, number>();
let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;

async function pollSymbols(symbols: string[]): Promise<void> {
  if (!symbols.length) return;
  useQuoteStore.setState({ polling: true });
  const results = await Promise.allSettled(symbols.map((s) => getQuote(s)));
  // Read AFTER awaiting so we merge with any updates that landed meanwhile.
  const next = { ...useQuoteStore.getState().quotes };
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') next[symbols[i]] = r.value;
  });
  useQuoteStore.setState({ quotes: next, polling: false, lastPollAt: Date.now() });
}

function schedule(): void {
  if (timer) clearTimeout(timer);
  const interval = useSettingsStore.getState().pollIntervalMs;
  timer = setTimeout(tick, interval);
}

async function tick(): Promise<void> {
  await pollSymbols([...refCounts.keys()]);
  if (running) schedule();
}

function start(): void {
  if (running) return;
  running = true;
  void tick(); // poll immediately, then on the interval
}

function stop(): void {
  running = false;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

/** Subscribe to one or more symbols. Returns an unsubscribe function. */
export function subscribeSymbols(symbols: string[]): () => void {
  const added: string[] = [];
  for (const s of symbols) {
    const count = refCounts.get(s) ?? 0;
    refCounts.set(s, count + 1);
    if (count === 0) added.push(s);
  }
  if (!running) start();
  else if (added.length) void pollSymbols(added); // fetch brand-new symbols right away

  return () => {
    for (const s of symbols) {
      const count = (refCounts.get(s) ?? 1) - 1;
      if (count <= 0) refCounts.delete(s);
      else refCounts.set(s, count);
    }
    if (refCounts.size === 0) stop();
  };
}

// Reschedule promptly when the user changes the poll interval.
useSettingsStore.subscribe((state, prev) => {
  if (running && state.pollIntervalMs !== prev.pollIntervalMs) schedule();
});

/** Subscribe to a single symbol and read its latest quote. */
export function useQuote(symbol?: string): Quote | undefined {
  useEffect(() => {
    if (!symbol) return;
    return subscribeSymbols([symbol]);
  }, [symbol]);
  return useQuoteStore((s) => (symbol ? s.quotes[symbol] : undefined));
}

/** Subscribe to many symbols (e.g. a watchlist) and read the quote map. */
export function useQuotes(symbols: string[]): Record<string, Quote> {
  const key = symbols.join(',');
  useEffect(() => {
    if (!symbols.length) return;
    return subscribeSymbols(symbols);
    // key captures the symbol set; symbols identity changes each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return useQuoteStore((s) => s.quotes);
}
