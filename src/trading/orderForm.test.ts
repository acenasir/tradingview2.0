import { describe, expect, it } from 'vitest';
import { buildOrderRequest, canUseBracket, canUseNotional, isOrderValid, type OrderForm } from './orderForm';

function form(overrides: Partial<OrderForm> = {}): OrderForm {
  return {
    symbol: 'aapl',
    side: 'buy',
    type: 'market',
    tif: 'day',
    useNotional: false,
    qty: '10',
    notional: '1000',
    limitPrice: '',
    stopPrice: '',
    trailPercent: '5',
    bracket: false,
    tpPrice: '',
    slPrice: '',
    ...overrides,
  };
}

describe('order field rules', () => {
  it('allows notional only for plain market orders', () => {
    expect(canUseNotional(form({ type: 'market', bracket: false }))).toBe(true);
    expect(canUseNotional(form({ type: 'limit' }))).toBe(false);
    expect(canUseNotional(form({ type: 'market', bracket: true }))).toBe(false);
  });

  it('allows brackets for market and limit only', () => {
    expect(canUseBracket('market')).toBe(true);
    expect(canUseBracket('limit')).toBe(true);
    expect(canUseBracket('stop')).toBe(false);
    expect(canUseBracket('trailing_stop')).toBe(false);
  });
});

describe('buildOrderRequest', () => {
  it('builds a market order, upper-casing the symbol', () => {
    expect(buildOrderRequest(form())).toEqual({
      symbol: 'AAPL',
      side: 'buy',
      type: 'market',
      time_in_force: 'day',
      qty: 10,
    });
  });

  it('uses notional only when allowed', () => {
    expect(buildOrderRequest(form({ useNotional: true, notional: '500' })).notional).toBe(500);
    // notional ignored for limit orders → falls back to qty
    const limit = buildOrderRequest(form({ type: 'limit', limitPrice: '190', useNotional: true }));
    expect(limit.notional).toBeUndefined();
    expect(limit.qty).toBe(10);
    expect(limit.limit_price).toBe(190);
  });

  it('adds stop / trailing fields per type', () => {
    expect(buildOrderRequest(form({ type: 'stop', stopPrice: '180' })).stop_price).toBe(180);
    const sl = buildOrderRequest(form({ type: 'stop_limit', stopPrice: '180', limitPrice: '181' }));
    expect(sl.stop_price).toBe(180);
    expect(sl.limit_price).toBe(181);
    expect(buildOrderRequest(form({ type: 'trailing_stop', trailPercent: '3' })).trail_percent).toBe(3);
  });

  it('attaches a bracket only when permitted', () => {
    const bracket = buildOrderRequest(form({ bracket: true, tpPrice: '200', slPrice: '170' }));
    expect(bracket.order_class).toBe('bracket');
    expect(bracket.take_profit).toEqual({ limit_price: 200 });
    expect(bracket.stop_loss).toEqual({ stop_price: 170 });
    // bracket flag ignored for stop orders
    expect(buildOrderRequest(form({ type: 'stop', stopPrice: '1', bracket: true })).order_class).toBeUndefined();
  });
});

describe('isOrderValid', () => {
  it('requires a positive quantity', () => {
    expect(isOrderValid(form({ qty: '0' }))).toBe(false);
    expect(isOrderValid(form({ qty: '5' }))).toBe(true);
  });
  it('requires the relevant price fields', () => {
    expect(isOrderValid(form({ type: 'limit' }))).toBe(false);
    expect(isOrderValid(form({ type: 'limit', limitPrice: '190' }))).toBe(true);
    expect(isOrderValid(form({ type: 'stop_limit', stopPrice: '180' }))).toBe(false);
    expect(isOrderValid(form({ type: 'stop_limit', stopPrice: '180', limitPrice: '181' }))).toBe(true);
  });
  it('requires take-profit and stop-loss when bracketed', () => {
    expect(isOrderValid(form({ bracket: true, tpPrice: '200' }))).toBe(false);
    expect(isOrderValid(form({ bracket: true, tpPrice: '200', slPrice: '170' }))).toBe(true);
  });
});
