import { describe, expect, it } from 'vitest';
import { generateMockCandles, quoteFromCandles, toHeikinAshi } from './candles';

describe('generateMockCandles', () => {
  it('produces the requested count with strictly ascending, valid OHLC', () => {
    const candles = generateMockCandles('AAPL', '1D', 60);
    expect(candles).toHaveLength(60);
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      expect(c.high).toBeGreaterThanOrEqual(c.low);
      expect(c.high).toBeGreaterThanOrEqual(c.open);
      expect(c.high).toBeGreaterThanOrEqual(c.close);
      expect(c.low).toBeLessThanOrEqual(c.open);
      expect(c.low).toBeLessThanOrEqual(c.close);
      expect(c.close).toBeGreaterThan(0);
      if (i > 0) expect(c.time).toBeGreaterThan(candles[i - 1].time);
    }
  });

  it('is deterministic per (symbol, resolution)', () => {
    expect(generateMockCandles('MSFT', '1h', 20)).toEqual(generateMockCandles('MSFT', '1h', 20));
    expect(generateMockCandles('MSFT', '1h', 20)).not.toEqual(generateMockCandles('NVDA', '1h', 20));
  });
});

describe('toHeikinAshi', () => {
  it('keeps length and produces valid HA candles', () => {
    const base = generateMockCandles('X', '1h', 40);
    const ha = toHeikinAshi(base);
    expect(ha).toHaveLength(base.length);
    for (const c of ha) {
      expect(c.high).toBeGreaterThanOrEqual(c.low);
      expect(c.high).toBeGreaterThanOrEqual(c.open);
      expect(c.low).toBeLessThanOrEqual(c.open);
    }
  });
});

describe('quoteFromCandles', () => {
  it('derives a sensible delayed-style quote', () => {
    const candles = generateMockCandles('TSLA', '1D', 5);
    const q = quoteFromCandles('TSLA', candles);
    expect(q.symbol).toBe('TSLA');
    expect(q.freshness).toBe('mock');
    expect(Number.isFinite(q.price)).toBe(true);
    expect(q.price).toBe(candles[candles.length - 1].close);
  });
});
