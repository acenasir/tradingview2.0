/** Number / price / time formatting helpers. */

/** Format a price with a sensible number of decimals for its magnitude. */
export function formatPrice(value: number | null | undefined, digits?: number): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const d = digits ?? decimalsFor(value);
  return value.toLocaleString('en-US', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

function decimalsFor(value: number): number {
  const abs = Math.abs(value);
  if (abs === 0) return 2;
  if (abs >= 1000) return 2;
  if (abs >= 1) return 2;
  if (abs >= 0.01) return 4;
  return 6;
}

/** Signed percentage, e.g. "+1.23%" / "-0.40%". */
export function formatPercent(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}%`;
}

/** Signed absolute change, e.g. "+1.20" / "-0.34". */
export function formatChange(value: number | null | undefined, digits?: number): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  const d = digits ?? decimalsFor(value);
  return `${sign}${value.toFixed(d)}`;
}

/** Compact volume / large number, e.g. 1.2M, 3.4B. */
export function formatCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
}

/** A direction class helper for green/red coloring. */
export function changeTone(value: number | null | undefined): 'up' | 'down' | 'flat' {
  if (value == null || !Number.isFinite(value) || value === 0) return 'flat';
  return value > 0 ? 'up' : 'down';
}

/** HH:MM:SS in a given time zone (default local). */
export function formatClock(date: Date, timeZone?: string): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone,
  });
}
