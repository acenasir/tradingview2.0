import { describe, expect, it } from 'vitest';
import { bollinger, ema, macd, rsi, sma, vwap } from './index';

describe('sma', () => {
  it('averages a trailing window with null warmup', () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });
});

describe('ema', () => {
  it('seeds with the SMA then smooths', () => {
    expect(ema([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });
  it('returns all null when shorter than the period', () => {
    expect(ema([1, 2], 5)).toEqual([null, null]);
  });
});

describe('rsi', () => {
  it('is null during warmup and 100 for a strictly rising series', () => {
    const values = Array.from({ length: 20 }, (_, i) => i + 1);
    const out = rsi(values, 14);
    expect(out.slice(0, 14).every((v) => v === null)).toBe(true);
    expect(out[14]).toBe(100);
  });
  it('stays within 0..100', () => {
    const values = [44, 44.3, 44.1, 44.6, 43.8, 44.2, 45, 44.7, 45.2, 45.6, 46, 45.4, 46.2, 47, 46.5, 46.8];
    for (const v of rsi(values, 14)) {
      if (v != null) expect(v).toBeGreaterThanOrEqual(0), expect(v).toBeLessThanOrEqual(100);
    }
  });
});

describe('bollinger', () => {
  it('middle equals the SMA and collapses to it for constant input', () => {
    const values = new Array(25).fill(10);
    const { middle, upper, lower } = bollinger(values, 20, 2);
    expect(middle).toEqual(sma(values, 20));
    expect(upper[24]).toBe(10);
    expect(lower[24]).toBe(10);
  });
  it('upper ≥ middle ≥ lower', () => {
    const values = Array.from({ length: 30 }, (_, i) => i + Math.sin(i));
    const { middle, upper, lower } = bollinger(values, 20, 2);
    for (let i = 0; i < values.length; i++) {
      if (middle[i] != null) {
        expect(upper[i]!).toBeGreaterThanOrEqual(middle[i]!);
        expect(middle[i]!).toBeGreaterThanOrEqual(lower[i]!);
      }
    }
  });
});

describe('macd', () => {
  it('histogram equals macd − signal where both exist', () => {
    const values = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 3) * 5);
    const { macd: line, signal, histogram } = macd(values);
    expect(line.length).toBe(values.length);
    for (let i = 0; i < values.length; i++) {
      if (line[i] != null && signal[i] != null) {
        expect(histogram[i]!).toBeCloseTo(line[i]! - signal[i]!, 8);
      }
    }
  });
});

describe('vwap', () => {
  it('equals the typical price when it is constant', () => {
    const bars = [
      { high: 10, low: 10, close: 10, volume: 5 },
      { high: 10, low: 10, close: 10, volume: 3 },
    ];
    expect(vwap(bars)).toEqual([10, 10]);
  });
});
