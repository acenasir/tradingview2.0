import { generateMockCandles, quoteFromCandles } from '../../lib/candles';
import type { Candle, DataProvider, Quote, Resolution, SymbolResult } from './types';
import { searchUniverse } from './universe';

/**
 * Deterministic synthetic provider. This is the always-available fallback: when
 * no real key is configured, the network is down, or a provider is rate-limited,
 * the router degrades to this so the app is never empty or broken. Everything it
 * returns is badged "demo".
 */
export const mockProvider: DataProvider = {
  id: 'mock',
  supportsRealtime: false,

  async searchSymbols(query: string): Promise<SymbolResult[]> {
    return searchUniverse(query);
  },

  async getHistory(symbol: string, resolution: Resolution): Promise<Candle[]> {
    return generateMockCandles(symbol, resolution);
  },

  async getQuote(symbol: string): Promise<Quote> {
    // Use a coarse resolution just to derive a believable last/prev close.
    const candles = generateMockCandles(symbol, '1D', 3);
    return quoteFromCandles(symbol, candles);
  },
};
