import { ema } from './ema';

export interface MacdResult {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
}

/** MACD line, signal line (EMA of MACD) and histogram (MACD − signal). */
export function macd(values: number[], fast = 12, slow = 26, signalPeriod = 9): MacdResult {
  const emaFast = ema(values, fast);
  const emaSlow = ema(values, slow);
  const macdLine: (number | null)[] = values.map((_, i) => {
    const f = emaFast[i];
    const s = emaSlow[i];
    return f != null && s != null ? f - s : null;
  });

  const signal: (number | null)[] = new Array(values.length).fill(null);
  const histogram: (number | null)[] = new Array(values.length).fill(null);

  const firstIdx = macdLine.findIndex((v) => v != null);
  if (firstIdx >= 0) {
    const compact = macdLine.slice(firstIdx).map((v) => v as number);
    const sig = ema(compact, signalPeriod);
    for (let i = 0; i < sig.length; i++) {
      const idx = firstIdx + i;
      signal[idx] = sig[i];
      const m = macdLine[idx];
      if (sig[i] != null && m != null) histogram[idx] = m - (sig[i] as number);
    }
  }
  return { macd: macdLine, signal, histogram };
}
