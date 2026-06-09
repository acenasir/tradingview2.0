import { useEffect, useState, type ReactNode } from 'react';
import { ApiError } from '../../lib/api';
import { useLayoutStore } from '../../store/layoutStore';
import { useUiStore } from '../../store/uiStore';
import { placeOrder, type OrderSide, type OrderType, type TimeInForce } from '../../trading/alpaca';
import {
  buildOrderRequest,
  canUseBracket,
  canUseNotional,
  isOrderValid,
  type OrderForm,
} from '../../trading/orderForm';
import { kickTradingRefresh } from '../../trading/poller';

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: 'market', label: 'Market' },
  { value: 'limit', label: 'Limit' },
  { value: 'stop', label: 'Stop' },
  { value: 'stop_limit', label: 'Stop limit' },
  { value: 'trailing_stop', label: 'Trailing stop' },
];

function alpacaError(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string } | undefined;
    if (body?.message) return body.message;
    return `Request failed (${err.status})`;
  }
  return err instanceof Error ? err.message : 'Order failed';
}

export function OrderTicket() {
  const activeSymbol = useLayoutStore((s) => s.panes[s.activePane]?.symbol ?? '');
  const intendedSide = useUiStore((s) => s.tradeSide);
  const tradeNonce = useUiStore((s) => s.tradeNonce);

  const [side, setSide] = useState<OrderSide>(intendedSide);
  const [symbol, setSymbol] = useState(activeSymbol);
  const [type, setType] = useState<OrderType>('market');
  const [useNotional, setUseNotional] = useState(false);
  const [qty, setQty] = useState('1');
  const [notional, setNotional] = useState('1000');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [trailPercent, setTrailPercent] = useState('5');
  const [tif, setTif] = useState<TimeInForce>('day');
  const [bracket, setBracket] = useState(false);
  const [tpPrice, setTpPrice] = useState('');
  const [slPrice, setSlPrice] = useState('');

  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Follow the active pane's symbol.
  useEffect(() => {
    if (activeSymbol) setSymbol(activeSymbol);
  }, [activeSymbol]);

  // The b/s shortcut preselects a side and re-targets the active symbol.
  useEffect(() => {
    if (tradeNonce === 0) return;
    setSide(intendedSide);
    if (activeSymbol) setSymbol(activeSymbol);
    setConfirming(false);
    setResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeNonce]);

  const needsLimit = type === 'limit' || type === 'stop_limit';
  const needsStop = type === 'stop' || type === 'stop_limit';
  const needsTrail = type === 'trailing_stop';

  const form: OrderForm = {
    symbol,
    side,
    type,
    tif,
    useNotional,
    qty,
    notional,
    limitPrice,
    stopPrice,
    trailPercent,
    bracket,
    tpPrice,
    slPrice,
  };
  const notionalAllowed = canUseNotional(form);
  const bracketAllowed = canUseBracket(type);
  const valid = isOrderValid(form);

  async function submit() {
    setSubmitting(true);
    setResult(null);
    try {
      const order = await placeOrder(buildOrderRequest(form));
      setResult({ ok: true, message: `${order.side.toUpperCase()} ${order.symbol} — ${order.status}` });
      kickTradingRefresh();
    } catch (err) {
      setResult({ ok: false, message: alpacaError(err) });
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  }

  const sideBtn = side === 'buy' ? 'bg-up hover:brightness-110' : 'bg-down hover:brightness-110';
  const qtyLabel = useNotional ? `$${notional || '0'}` : `${qty || '0'} sh`;

  return (
    <div className="space-y-2 p-3">
      {/* Buy / Sell toggle */}
      <div className="flex rounded border border-border p-0.5">
        {(['buy', 'sell'] as OrderSide[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            className={`h-7 flex-1 rounded text-xs font-semibold uppercase transition-colors ${
              side === s
                ? s === 'buy'
                  ? 'bg-up text-white'
                  : 'bg-down text-white'
                : 'text-text-muted hover:text-text'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <Labeled label="Symbol">
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          spellCheck={false}
          className="oc-input"
        />
      </Labeled>

      <Labeled label="Order type">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as OrderType)}
          className="oc-input"
        >
          {ORDER_TYPES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Labeled>

      {/* Quantity / notional */}
      <Labeled
        label={
          <span className="flex items-center justify-between">
            <span>{useNotional ? 'Notional ($)' : 'Quantity'}</span>
            {notionalAllowed && (
              <button
                type="button"
                onClick={() => setUseNotional((v) => !v)}
                className="text-2xs text-accent hover:underline"
              >
                {useNotional ? 'use shares' : 'use $ amount'}
              </button>
            )}
          </span>
        }
      >
        {useNotional && notionalAllowed ? (
          <input type="number" min={1} step="any" value={notional} onChange={(e) => setNotional(e.target.value)} className="oc-input" />
        ) : (
          <input type="number" min={0} step="any" value={qty} onChange={(e) => setQty(e.target.value)} className="oc-input" />
        )}
      </Labeled>

      {needsLimit && (
        <Labeled label="Limit price">
          <input type="number" min={0} step="any" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} className="oc-input" />
        </Labeled>
      )}
      {needsStop && (
        <Labeled label="Stop price">
          <input type="number" min={0} step="any" value={stopPrice} onChange={(e) => setStopPrice(e.target.value)} className="oc-input" />
        </Labeled>
      )}
      {needsTrail && (
        <Labeled label="Trail (%)">
          <input type="number" min={0} step="any" value={trailPercent} onChange={(e) => setTrailPercent(e.target.value)} className="oc-input" />
        </Labeled>
      )}

      <Labeled label="Time in force">
        <select value={tif} onChange={(e) => setTif(e.target.value as TimeInForce)} className="oc-input">
          <option value="day">Day</option>
          <option value="gtc">GTC</option>
          <option value="ioc">IOC</option>
          <option value="fok">FOK</option>
        </select>
      </Labeled>

      {bracketAllowed && (
        <label className="flex items-center gap-2 text-xs text-text-muted">
          <input type="checkbox" checked={bracket} onChange={(e) => setBracket(e.target.checked)} className="h-3.5 w-3.5 accent-accent" />
          Bracket (take-profit / stop-loss)
        </label>
      )}
      {bracket && bracketAllowed && (
        <div className="grid grid-cols-2 gap-2">
          <Labeled label="Take profit">
            <input type="number" min={0} step="any" value={tpPrice} onChange={(e) => setTpPrice(e.target.value)} className="oc-input" />
          </Labeled>
          <Labeled label="Stop loss">
            <input type="number" min={0} step="any" value={slPrice} onChange={(e) => setSlPrice(e.target.value)} className="oc-input" />
          </Labeled>
        </div>
      )}

      {/* Result / confirm / submit */}
      {result && (
        <div className={`rounded px-2 py-1.5 text-xs ${result.ok ? 'bg-up/15 text-up' : 'bg-down/15 text-down'}`}>
          {result.message}
        </div>
      )}

      {confirming ? (
        <div className="space-y-2 rounded border border-border-strong p-2">
          <p className="text-xs text-text">
            <span className={`font-semibold uppercase ${side === 'buy' ? 'text-up' : 'text-down'}`}>{side}</span>{' '}
            {qtyLabel} <span className="font-semibold text-text-bright">{symbol.toUpperCase()}</span> · {type.replace('_', ' ')}
            {needsLimit ? ` @ ${limitPrice}` : ''}
            {needsStop ? ` stop ${stopPrice}` : ''}
            {bracket && bracketAllowed ? ` · TP ${tpPrice} / SL ${slPrice}` : ''} · {tif.toUpperCase()}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirming(false)} className="oc-btn h-8 flex-1 border border-border text-xs">
              Back
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={submit}
              className={`h-8 flex-1 rounded text-xs font-semibold text-white disabled:opacity-50 ${sideBtn}`}
            >
              {submitting ? 'Submitting…' : 'Confirm'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={!valid}
          onClick={() => {
            setResult(null);
            setConfirming(true);
          }}
          className={`h-9 w-full rounded text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 ${sideBtn}`}
        >
          {side === 'buy' ? 'Buy' : 'Sell'} {symbol.toUpperCase()}
        </button>
      )}
    </div>
  );
}

function Labeled({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-2xs uppercase tracking-wide text-text-muted">{label}</span>
      {children}
    </label>
  );
}
