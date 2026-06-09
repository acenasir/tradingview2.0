import { Ban, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { changeTone, formatPercent, formatPrice } from '../../lib/format';
import { cancelAllOrders, cancelOrder } from '../../trading/alpaca';
import { kickTradingRefresh, useTrading } from '../../trading/poller';
import { OrderTicket } from './OrderTicket';
import { Positions } from './Positions';

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="border-t border-border">
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-2xs font-semibold uppercase tracking-wide text-text-muted">{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xs uppercase text-text-muted">{label}</span>
      <span className={`font-mono text-sm ${className}`}>{value}</span>
    </div>
  );
}

export function TradePanel() {
  const { account, openOrders, configured, error } = useTrading();
  const [busy, setBusy] = useState<string | null>(null);

  if (configured === false) {
    return (
      <div className="px-4 py-6 text-center">
        <div className="mb-2 inline-block rounded bg-amber-500/15 px-2 py-0.5 text-2xs font-semibold uppercase text-amber-400">
          Paper — simulated funds
        </div>
        <p className="text-sm font-medium text-text">Paper trading not configured</p>
        <p className="mx-auto mt-2 max-w-[230px] text-xs leading-relaxed text-text-muted">
          Add <code className="text-text">ALPACA_KEY_ID</code> and{' '}
          <code className="text-text">ALPACA_SECRET_KEY</code> (from an Alpaca <b>Paper</b> account) to your
          environment and run via <code className="text-text">vercel dev</code> — see the README.
        </p>
      </div>
    );
  }

  const equity = account ? Number(account.equity) : null;
  const lastEquity = account ? Number(account.last_equity) : null;
  const dayPl = equity != null && lastEquity != null ? equity - lastEquity : null;
  const dayPlPct = dayPl != null && lastEquity ? (dayPl / lastEquity) * 100 : null;
  const plTone = changeTone(dayPl);
  const plClass = plTone === 'up' ? 'text-up' : plTone === 'down' ? 'text-down' : 'text-text';

  async function doCancel(id: string) {
    setBusy(id);
    try {
      await cancelOrder(id);
      kickTradingRefresh();
    } catch {
      /* refreshed on next poll */
    } finally {
      setBusy(null);
    }
  }

  async function doCancelAll() {
    setBusy('all');
    try {
      await cancelAllOrders();
      kickTradingRefresh();
    } catch {
      /* refreshed on next poll */
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-center justify-between bg-amber-500/10 px-3 py-1 text-2xs font-semibold uppercase tracking-wide text-amber-400">
        <span>Paper — simulated funds</span>
        {account?.pattern_day_trader && <span title="Flagged as pattern day trader">PDT</span>}
      </div>

      {/* Account strip */}
      <div className="grid grid-cols-2 gap-y-2 px-3 py-2">
        <Stat label="Equity" value={equity != null ? `$${formatPrice(equity)}` : '—'} className="text-text-bright" />
        <Stat
          label="Day P&L"
          value={dayPl != null ? `${dayPl >= 0 ? '+' : ''}$${formatPrice(dayPl)} (${formatPercent(dayPlPct ?? 0)})` : '—'}
          className={plClass}
        />
        <Stat label="Buying power" value={account ? `$${formatPrice(Number(account.buying_power))}` : '—'} />
        <Stat label="Cash" value={account ? `$${formatPrice(Number(account.cash))}` : '—'} />
      </div>

      {error && <div className="mx-3 mb-2 rounded bg-down/15 px-2 py-1 text-2xs text-down">{error}</div>}

      {/* Order ticket */}
      <Section title="Order ticket">
        <OrderTicket />
      </Section>

      {/* Open orders */}
      <Section
        title={`Open orders (${openOrders.length})`}
        action={
          openOrders.length > 0 && (
            <button
              type="button"
              onClick={doCancelAll}
              disabled={busy === 'all'}
              className="flex items-center gap-1 text-2xs text-text-muted hover:text-down disabled:opacity-40"
            >
              <Ban className="h-3 w-3" /> Cancel all
            </button>
          )
        }
      >
        {openOrders.length === 0 ? (
          <div className="px-3 py-2 text-center text-xs text-text-muted">No open orders.</div>
        ) : (
          openOrders.map((o) => (
            <div key={o.id} className="group flex items-center px-3 py-1 text-xs hover:bg-bg-elevated">
              <span className={`w-9 font-semibold uppercase ${o.side === 'buy' ? 'text-up' : 'text-down'}`}>
                {o.side}
              </span>
              <div className="flex-1 truncate">
                <span className="font-medium text-text-bright">{o.symbol}</span>{' '}
                <span className="text-text-muted">
                  {o.qty ?? o.notional} · {o.type.replace('_', ' ')}
                  {o.limit_price ? ` @ ${o.limit_price}` : ''}
                </span>
              </div>
              <span className="w-16 truncate text-right text-2xs text-text-muted">{o.status}</span>
              <button
                type="button"
                title="Cancel order"
                disabled={busy === o.id}
                onClick={() => doCancel(o.id)}
                className="oc-btn h-5 w-5 opacity-0 group-hover:opacity-100 hover:text-down disabled:opacity-40"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </Section>

      {/* Positions */}
      <Section title="Positions">
        <Positions />
      </Section>
    </div>
  );
}
