import { describe, expect, it } from 'vitest';
import { getHistory, getQuote, searchSymbols } from './router';

/**
 * In this (node, no `/api`) environment the Twelve Data proxy is unreachable,
 * so these assert the graceful degradation to demo data that keeps every pane
 * and watchlist row populated.
 */
describe('data router — graceful demo fallback', () => {
  it('returns demo history with ascending candles when the proxy is unavailable', async () => {
    const result = await getHistory('AAPL', '1D');
    expect(result.candles.length).toBeGreaterThan(0);
    expect(result.freshness).toBe('mock');
    for (let i = 1; i < result.candles.length; i++) {
      expect(result.candles[i].time).toBeGreaterThan(result.candles[i - 1].time);
    }
  });

  it('returns a quote for any symbol', async () => {
    const q = await getQuote('MSFT');
    expect(q.symbol).toBe('MSFT');
    expect(q.price).toBeGreaterThan(0);
  });

  it('falls back to the built-in universe for search', async () => {
    const results = await searchSymbols('AAP');
    expect(results.some((r) => r.symbol === 'AAPL')).toBe(true);
  });
});
