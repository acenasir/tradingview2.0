export interface VwapBar {
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/**
 * Cumulative Volume-Weighted Average Price over the loaded series.
 * (A running anchored VWAP; session-reset anchoring is a future refinement.)
 */
export function vwap(bars: VwapBar[]): (number | null)[] {
  const out: (number | null)[] = new Array(bars.length).fill(null);
  let cumPV = 0;
  let cumV = 0;
  for (let i = 0; i < bars.length; i++) {
    const v = bars[i].volume ?? 0;
    const typical = (bars[i].high + bars[i].low + bars[i].close) / 3;
    cumPV += typical * v;
    cumV += v;
    out[i] = cumV > 0 ? cumPV / cumV : null;
  }
  return out;
}
