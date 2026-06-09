import type { OrderSide, OrderType, PlaceOrderRequest, TimeInForce } from './alpaca';

/** UI form state for the order ticket (strings, as held by inputs). */
export interface OrderForm {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  tif: TimeInForce;
  useNotional: boolean;
  qty: string;
  notional: string;
  limitPrice: string;
  stopPrice: string;
  trailPercent: string;
  bracket: boolean;
  tpPrice: string;
  slPrice: string;
}

const n = (s: string): number => Number(s);

/** Notional (dollar-amount) orders are only valid for plain market orders. */
export function canUseNotional(form: Pick<OrderForm, 'type' | 'bracket'>): boolean {
  return form.type === 'market' && !form.bracket;
}

/** Bracket orders attach to market or limit entries. */
export function canUseBracket(type: OrderType): boolean {
  return type === 'market' || type === 'limit';
}

function needsLimit(type: OrderType): boolean {
  return type === 'limit' || type === 'stop_limit';
}
function needsStop(type: OrderType): boolean {
  return type === 'stop' || type === 'stop_limit';
}
function needsTrail(type: OrderType): boolean {
  return type === 'trailing_stop';
}

/** Whether the form is complete enough to submit. */
export function isOrderValid(form: OrderForm): boolean {
  const usingNotional = form.useNotional && canUseNotional(form);
  return (
    form.symbol.trim().length > 0 &&
    (usingNotional ? n(form.notional) > 0 : n(form.qty) > 0) &&
    (!needsLimit(form.type) || n(form.limitPrice) > 0) &&
    (!needsStop(form.type) || n(form.stopPrice) > 0) &&
    (!needsTrail(form.type) || n(form.trailPercent) > 0) &&
    (!form.bracket || !canUseBracket(form.type) || (n(form.tpPrice) > 0 && n(form.slPrice) > 0))
  );
}

/** Build the Alpaca order payload from the form, applying the field rules. */
export function buildOrderRequest(form: OrderForm): PlaceOrderRequest {
  const usingNotional = form.useNotional && canUseNotional(form);
  const req: PlaceOrderRequest = {
    symbol: form.symbol.trim().toUpperCase(),
    side: form.side,
    type: form.type,
    time_in_force: form.tif,
  };
  if (usingNotional) req.notional = n(form.notional);
  else req.qty = n(form.qty);
  if (needsLimit(form.type)) req.limit_price = n(form.limitPrice);
  if (needsStop(form.type)) req.stop_price = n(form.stopPrice);
  if (needsTrail(form.type)) req.trail_percent = n(form.trailPercent);
  if (form.bracket && canUseBracket(form.type)) {
    req.order_class = 'bracket';
    req.take_profit = { limit_price: n(form.tpPrice) };
    req.stop_loss = { stop_price: n(form.slPrice) };
  }
  return req;
}
