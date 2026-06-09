/** Shared types for the swappable data-provider layer. */

export type Resolution = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1D' | '1W' | '1M';

export type ChartType = 'candlestick' | 'bar' | 'line' | 'area' | 'baseline' | 'heikin-ashi';

export type DataMode = 'delayed-free' | 'realtime';

export type AssetType = 'stock' | 'etf' | 'crypto' | 'forex' | 'index' | 'futures';

/** How fresh the data behind a price is — drives the per-pane badge. */
export type Freshness = 'realtime' | 'iex' | 'delayed' | 'eod' | 'mock' | 'loading' | 'error';

export interface SymbolResult {
  /** Display symbol, e.g. "AAPL" or "BTC/USD". */
  symbol: string;
  name: string;
  exchange: string;
  type: AssetType;
  currency?: string;
  /** Country / region code when provided by the source. */
  country?: string;
}

export interface Candle {
  /** Unix seconds (UTC), strictly ascending within a series. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface HistoryResult {
  candles: Candle[];
  freshness: Freshness;
  /** Provider id that produced the data. */
  source: string;
}

export interface Quote {
  symbol: string;
  price: number;
  /** Absolute change vs. previous close. */
  change: number;
  /** Percent change vs. previous close. */
  changePercent: number;
  prevClose?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  /** Epoch milliseconds when the quote was produced. */
  timestamp: number;
  freshness: Freshness;
}

export interface Tick {
  symbol: string;
  price: number;
  timestamp: number;
  volume?: number;
}

export interface DataProvider {
  id: string;
  supportsRealtime: boolean;
  searchSymbols(query: string, signal?: AbortSignal): Promise<SymbolResult[]>;
  getHistory(symbol: string, resolution: Resolution, from: number, to: number): Promise<Candle[]>;
  getQuote(symbol: string): Promise<Quote>;
  /** Delayed providers leave this undefined; realtime providers implement streaming. */
  subscribeQuotes?(symbols: string[], onTick: (t: Tick) => void): () => void;
}

/** Thrown when a provider hits its free-tier rate limit so the router can fall back. */
export class RateLimitError extends Error {
  constructor(readonly provider: string) {
    super(`${provider} rate limit reached`);
    this.name = 'RateLimitError';
  }
}

/** Thrown when a symbol cannot be found / has no data. */
export class SymbolNotFoundError extends Error {
  constructor(readonly symbol: string) {
    super(`Symbol not found: ${symbol}`);
    this.name = 'SymbolNotFoundError';
  }
}
