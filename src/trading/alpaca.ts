import { apiDelete, apiGet, apiPost } from '../lib/api';

/**
 * Alpaca PAPER trading client. Every call goes through the same-origin
 * `/api/alpaca/*` proxy, which is hardcoded to the paper host and injects the
 * secret key server-side. This module never talks to the live-money host.
 */

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';
export type TimeInForce = 'day' | 'gtc' | 'opg' | 'cls' | 'ioc' | 'fok';
export type OrderClass = 'simple' | 'bracket' | 'oco' | 'oto';

/** Numeric fields come back from Alpaca as strings. */
export interface AlpacaAccount {
  status: string;
  currency: string;
  cash: string;
  equity: string;
  last_equity: string;
  buying_power: string;
  portfolio_value: string;
  long_market_value: string;
  short_market_value: string;
  pattern_day_trader: boolean;
  trading_blocked: boolean;
}

export interface AlpacaPosition {
  symbol: string;
  qty: string;
  side: 'long' | 'short';
  avg_entry_price: string;
  current_price: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  change_today: string;
}

export interface AlpacaOrder {
  id: string;
  client_order_id: string;
  symbol: string;
  asset_class: string;
  qty: string | null;
  notional: string | null;
  filled_qty: string;
  filled_avg_price: string | null;
  side: OrderSide;
  type: OrderType;
  order_class: OrderClass | '';
  time_in_force: TimeInForce;
  limit_price: string | null;
  stop_price: string | null;
  trail_percent: string | null;
  status: string;
  created_at: string;
  legs?: AlpacaOrder[] | null;
}

export interface PlaceOrderRequest {
  symbol: string;
  qty?: number;
  notional?: number;
  side: OrderSide;
  type: OrderType;
  time_in_force: TimeInForce;
  limit_price?: number;
  stop_price?: number;
  trail_percent?: number;
  order_class?: OrderClass;
  take_profit?: { limit_price: number };
  stop_loss?: { stop_price: number; limit_price?: number };
  extended_hours?: boolean;
}

export interface CancelResult {
  id: string;
  status: number;
}

export function getAccount(): Promise<AlpacaAccount> {
  return apiGet<AlpacaAccount>('/api/alpaca/account');
}

export function getPositions(): Promise<AlpacaPosition[]> {
  return apiGet<AlpacaPosition[]>('/api/alpaca/positions');
}

export function getOpenOrders(): Promise<AlpacaOrder[]> {
  return apiGet<AlpacaOrder[]>('/api/alpaca/orders?status=open&nested=true&direction=desc');
}

export function placeOrder(req: PlaceOrderRequest): Promise<AlpacaOrder> {
  return apiPost<AlpacaOrder>('/api/alpaca/orders', req);
}

export function cancelOrder(id: string): Promise<void> {
  return apiDelete<void>(`/api/alpaca/orders/${encodeURIComponent(id)}`);
}

export function cancelAllOrders(): Promise<CancelResult[]> {
  return apiDelete<CancelResult[]>('/api/alpaca/orders');
}

/** Liquidate an entire position at market. */
export function closePosition(symbol: string): Promise<AlpacaOrder> {
  return apiDelete<AlpacaOrder>(`/api/alpaca/positions/${encodeURIComponent(symbol)}`);
}
