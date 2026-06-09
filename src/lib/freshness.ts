import type { Freshness } from '../data/providers/types';

/** Short human label for a data-freshness badge. */
export function freshnessLabel(f: Freshness): string {
  switch (f) {
    case 'realtime':
      return 'live';
    case 'iex':
      return 'live · IEX';
    case 'delayed':
      return 'delayed';
    case 'eod':
      return 'EOD';
    case 'mock':
      return 'demo';
    case 'loading':
      return 'loading';
    case 'error':
      return 'error';
    default:
      return f;
  }
}

/** Tailwind classes for the badge, by freshness. */
export function freshnessClasses(f: Freshness): string {
  switch (f) {
    case 'realtime':
    case 'iex':
      return 'bg-up/15 text-up';
    case 'delayed':
    case 'eod':
      return 'bg-bg-input text-text-muted';
    case 'mock':
      return 'bg-accent/15 text-accent';
    case 'error':
      return 'bg-down/15 text-down';
    case 'loading':
    default:
      return 'bg-bg-input text-text-muted';
  }
}

/** A longer tooltip explaining what the badge means. */
export function freshnessTitle(f: Freshness): string {
  switch (f) {
    case 'realtime':
      return 'Real-time streaming data';
    case 'iex':
      return 'Real-time IEX data (single exchange, not full SIP)';
    case 'delayed':
      return 'Delayed market data (free tier)';
    case 'eod':
      return 'End-of-day data only';
    case 'mock':
      return 'Demo data — no live provider key configured or provider unavailable';
    case 'loading':
      return 'Loading…';
    case 'error':
      return 'Failed to load data';
    default:
      return '';
  }
}
