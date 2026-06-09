/**
 * Tiny TTL cache used to respect free-tier daily/minute caps: we never refetch
 * a quote or history window that is still fresh. In-memory by default; history
 * is also mirrored to localStorage so reloads don't re-spend the daily budget.
 */

interface Entry<T> {
  value: T;
  expires: number;
}

export class TtlCache<T> {
  private map = new Map<string, Entry<T>>();

  constructor(private readonly defaultTtlMs: number) {}

  get(key: string): T | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (Date.now() > e.expires) {
      this.map.delete(key);
      return undefined;
    }
    return e.value;
  }

  /** Return a value even if expired (useful for graceful "last known" fallbacks). */
  getStale(key: string): T | undefined {
    return this.map.get(key)?.value;
  }

  set(key: string, value: T, ttlMs = this.defaultTtlMs): void {
    this.map.set(key, { value, expires: Date.now() + ttlMs });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): void {
    this.map.delete(key);
  }
}

/* ── localStorage-backed history cache ──────────────────────────────────────
   Keyed by symbol+resolution. Survives reloads so we don't re-spend quota. */

const HISTORY_PREFIX = 'openchart.hist.';
const HISTORY_TTL_MS = 1000 * 60 * 60 * 12; // 12h

interface StoredHistory<T> {
  value: T;
  expires: number;
}

export function readHistoryCache<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(HISTORY_PREFIX + key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as StoredHistory<T>;
    if (Date.now() > parsed.expires) {
      localStorage.removeItem(HISTORY_PREFIX + key);
      return undefined;
    }
    return parsed.value;
  } catch {
    return undefined;
  }
}

export function writeHistoryCache<T>(key: string, value: T, ttlMs = HISTORY_TTL_MS): void {
  try {
    const payload: StoredHistory<T> = { value, expires: Date.now() + ttlMs };
    localStorage.setItem(HISTORY_PREFIX + key, JSON.stringify(payload));
  } catch {
    /* storage full / disabled — non-fatal */
  }
}
