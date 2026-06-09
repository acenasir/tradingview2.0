import type { SymbolResult } from './types';

/**
 * A small built-in symbol universe. Used (a) to seed default watchlists and
 * (b) as a search fallback when no provider key is configured / the provider
 * is unreachable, so symbol search always returns something usable.
 */
export const SYMBOL_UNIVERSE: SymbolResult[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', type: 'stock', currency: 'USD', country: 'US' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', exchange: 'NASDAQ', type: 'stock', currency: 'USD', country: 'US' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', exchange: 'NASDAQ', type: 'stock', currency: 'USD', country: 'US' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', type: 'stock', currency: 'USD', country: 'US' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', exchange: 'NASDAQ', type: 'stock', currency: 'USD', country: 'US' },
  { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', type: 'stock', currency: 'USD', country: 'US' },
  { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', type: 'stock', currency: 'USD', country: 'US' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', exchange: 'NASDAQ', type: 'stock', currency: 'USD', country: 'US' },
  { symbol: 'NFLX', name: 'Netflix Inc.', exchange: 'NASDAQ', type: 'stock', currency: 'USD', country: 'US' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', type: 'stock', currency: 'USD', country: 'US' },
  { symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE', type: 'stock', currency: 'USD', country: 'US' },
  { symbol: 'DIS', name: 'Walt Disney Co.', exchange: 'NYSE', type: 'stock', currency: 'USD', country: 'US' },
  { symbol: 'BA', name: 'Boeing Co.', exchange: 'NYSE', type: 'stock', currency: 'USD', country: 'US' },
  { symbol: 'KO', name: 'Coca-Cola Co.', exchange: 'NYSE', type: 'stock', currency: 'USD', country: 'US' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSE Arca', type: 'etf', currency: 'USD', country: 'US' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NASDAQ', type: 'etf', currency: 'USD', country: 'US' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', exchange: 'NYSE Arca', type: 'etf', currency: 'USD', country: 'US' },
  { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar', exchange: 'Crypto', type: 'crypto', currency: 'USD' },
  { symbol: 'ETH/USD', name: 'Ethereum / US Dollar', exchange: 'Crypto', type: 'crypto', currency: 'USD' },
  { symbol: 'SOL/USD', name: 'Solana / US Dollar', exchange: 'Crypto', type: 'crypto', currency: 'USD' },
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', exchange: 'Forex', type: 'forex', currency: 'USD' },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', exchange: 'Forex', type: 'forex', currency: 'USD' },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', exchange: 'Forex', type: 'forex', currency: 'JPY' },
];

export function searchUniverse(query: string): SymbolResult[] {
  const q = query.trim().toUpperCase();
  if (!q) return SYMBOL_UNIVERSE.slice(0, 12);
  return SYMBOL_UNIVERSE.filter(
    (s) => s.symbol.toUpperCase().includes(q) || s.name.toUpperCase().includes(q),
  ).slice(0, 20);
}

export function lookupSymbol(symbol: string): SymbolResult | undefined {
  return SYMBOL_UNIVERSE.find((s) => s.symbol === symbol);
}
