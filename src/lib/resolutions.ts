import type { Resolution } from '../data/providers/types';

export interface ResolutionDef {
  value: Resolution;
  label: string;
  /** Seconds per bar (approximate for 1M). */
  seconds: number;
  /** Whether the bar represents intraday time (vs. day/week/month). */
  intraday: boolean;
}

export const RESOLUTIONS: ResolutionDef[] = [
  { value: '1m', label: '1m', seconds: 60, intraday: true },
  { value: '5m', label: '5m', seconds: 300, intraday: true },
  { value: '15m', label: '15m', seconds: 900, intraday: true },
  { value: '30m', label: '30m', seconds: 1800, intraday: true },
  { value: '1h', label: '1h', seconds: 3600, intraday: true },
  { value: '4h', label: '4h', seconds: 14400, intraday: true },
  { value: '1D', label: '1D', seconds: 86400, intraday: false },
  { value: '1W', label: '1W', seconds: 604800, intraday: false },
  { value: '1M', label: '1M', seconds: 2592000, intraday: false },
];

const BY_VALUE = new Map(RESOLUTIONS.map((r) => [r.value, r]));

export function resolutionDef(res: Resolution): ResolutionDef {
  return BY_VALUE.get(res) ?? RESOLUTIONS[6]; // default 1D
}

export function resolutionSeconds(res: Resolution): number {
  return resolutionDef(res).seconds;
}

/** Map our resolution to Twelve Data's `interval` strings. */
export const TWELVEDATA_INTERVAL: Record<Resolution, string> = {
  '1m': '1min',
  '5m': '5min',
  '15m': '15min',
  '30m': '30min',
  '1h': '1h',
  '4h': '4h',
  '1D': '1day',
  '1W': '1week',
  '1M': '1month',
};

/** Map our resolution to Finnhub's candle resolution strings (used in realtime step). */
export const FINNHUB_RESOLUTION: Record<Resolution, string> = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '1h': '60',
  '4h': '240',
  '1D': 'D',
  '1W': 'W',
  '1M': 'M',
};

/**
 * Default history window (unix seconds) for a resolution — enough bars to fill a
 * chart without exceeding free-tier output sizes.
 */
export function defaultHistoryRange(res: Resolution, now = Date.now()): { from: number; to: number } {
  const to = Math.floor(now / 1000);
  const lookbackBars = 500;
  const span = resolutionSeconds(res) * lookbackBars;
  return { from: to - span, to };
}

/** Approximate number of bars to request for a resolution (capped for free tiers). */
export function defaultOutputSize(): number {
  return 500;
}
