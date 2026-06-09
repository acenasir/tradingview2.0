import { ApiError, apiGet } from '../../lib/api';
import { TWELVEDATA_INTERVAL, resolutionSeconds } from '../../lib/resolutions';
import {
  RateLimitError,
  SymbolNotFoundError,
  type AssetType,
  type Candle,
  type DataProvider,
  type Quote,
  type Resolution,
  type SymbolResult,
} from './types';

/* ── Twelve Data response shapes (only the fields we use) ──────────────────── */

interface TdError {
  status: 'error';
  code: number;
  message: string;
}

interface TdSearchRow {
  symbol: string;
  instrument_name: string;
  exchange: string;
  instrument_type?: string;
  country?: string;
  currency?: string;
}
interface TdSearchResponse {
  data?: TdSearchRow[];
  status?: string;
}

interface TdSeriesValue {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume?: string;
}
interface TdSeriesResponse {
  values?: TdSeriesValue[];
  status?: string;
  code?: number;
  message?: string;
}

interface TdQuoteResponse {
  symbol?: string;
  close?: string;
  previous_close?: string;
  open?: string;
  high?: string;
  low?: string;
  change?: string;
  percent_change?: string;
  volume?: string;
  status?: string;
  code?: number;
  message?: string;
}

/* ── helpers ──────────────────────────────────────────────────────────────── */

function isTdError(body: unknown): body is TdError {
  return typeof body === 'object' && body !== null && (body as { status?: string }).status === 'error';
}

/** Normalize any failure into RateLimitError / SymbolNotFoundError / Error. */
function throwForFailure(symbol: string, status: number | undefined, body: unknown): never {
  // Twelve Data signals quota exhaustion with code 429 (sometimes HTTP 200 body).
  const code = isTdError(body) ? body.code : status;
  if (code === 429) throw new RateLimitError('twelvedata');
  if (code === 404 || code === 400) throw new SymbolNotFoundError(symbol);
  const msg = isTdError(body) ? body.message : `HTTP ${status ?? '??'}`;
  throw new Error(`Twelve Data: ${msg}`);
}

function tdInterval(res: Resolution): string {
  return TWELVEDATA_INTERVAL[res];
}

function parseTdTime(datetime: string): number {
  // We always request timezone=UTC, so timestamps are UTC.
  const iso = datetime.includes(' ') ? `${datetime.replace(' ', 'T')}Z` : `${datetime}T00:00:00Z`;
  return Math.floor(Date.parse(iso) / 1000);
}

function mapAssetType(t: string | undefined): AssetType {
  const v = (t ?? '').toLowerCase();
  if (v.includes('digital') || v.includes('crypto')) return 'crypto';
  if (v.includes('physical currency') || v.includes('forex')) return 'forex';
  if (v.includes('etf')) return 'etf';
  if (v.includes('index')) return 'index';
  if (v.includes('future')) return 'futures';
  return 'stock';
}

/* ── provider ─────────────────────────────────────────────────────────────── */

export const twelveDataProvider: DataProvider = {
  id: 'twelvedata',
  supportsRealtime: false,

  // Free tier: ~8 req/min, ~800 req/day. https://twelvedata.com/pricing
  async searchSymbols(query: string, signal?: AbortSignal): Promise<SymbolResult[]> {
    const qs = new URLSearchParams({ symbol: query, outputsize: '20' });
    const body = await apiGet<TdSearchResponse>(`/api/td/symbol_search?${qs}`, signal);
    if (isTdError(body)) throwForFailure(query, undefined, body);
    return (body.data ?? []).map((row) => ({
      symbol: row.symbol,
      name: row.instrument_name,
      exchange: row.exchange,
      type: mapAssetType(row.instrument_type),
      currency: row.currency,
      country: row.country,
    }));
  },

  // Free tier: counts against the daily credit budget — cache aggressively.
  async getHistory(symbol: string, resolution: Resolution, from: number, to: number): Promise<Candle[]> {
    const bars = Math.round((to - from) / resolutionSeconds(resolution));
    const outputsize = Math.min(5000, Math.max(50, bars || 500));
    const qs = new URLSearchParams({
      symbol,
      interval: tdInterval(resolution),
      outputsize: String(outputsize),
      order: 'ASC',
      timezone: 'UTC',
    });
    let body: TdSeriesResponse;
    try {
      body = await apiGet<TdSeriesResponse>(`/api/td/time_series?${qs}`);
    } catch (err) {
      if (err instanceof ApiError) throwForFailure(symbol, err.status, err.body);
      throw err;
    }
    if (!body.values || isTdError(body)) throwForFailure(symbol, body.code, body);
    return (body.values ?? [])
      .map((v) => ({
        time: parseTdTime(v.datetime),
        open: Number(v.open),
        high: Number(v.high),
        low: Number(v.low),
        close: Number(v.close),
        volume: v.volume != null ? Number(v.volume) : undefined,
      }))
      .filter((c) => Number.isFinite(c.time) && Number.isFinite(c.close));
  },

  // Delayed quote on the free tier.
  async getQuote(symbol: string): Promise<Quote> {
    const qs = new URLSearchParams({ symbol });
    let body: TdQuoteResponse;
    try {
      body = await apiGet<TdQuoteResponse>(`/api/td/quote?${qs}`);
    } catch (err) {
      if (err instanceof ApiError) throwForFailure(symbol, err.status, err.body);
      throw err;
    }
    if (isTdError(body) || body.close == null) throwForFailure(symbol, body.code, body);
    const price = Number(body.close);
    const prevClose = body.previous_close != null ? Number(body.previous_close) : undefined;
    return {
      symbol,
      price,
      change: body.change != null ? Number(body.change) : prevClose != null ? price - prevClose : 0,
      changePercent: body.percent_change != null ? Number(body.percent_change) : 0,
      prevClose,
      open: body.open != null ? Number(body.open) : undefined,
      high: body.high != null ? Number(body.high) : undefined,
      low: body.low != null ? Number(body.low) : undefined,
      volume: body.volume != null ? Number(body.volume) : undefined,
      timestamp: Date.now(),
      freshness: 'delayed',
    };
  },
};
