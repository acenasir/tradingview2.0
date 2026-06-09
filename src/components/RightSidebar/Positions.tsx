import { X } from 'lucide-react';
import { useState } from 'react';
import { changeTone, formatPercent, formatPrice } from '../../lib/format';
import { closePosition } from '../../trading/alpaca';
import { kickTradingRefresh, useTradingStore } from '../../trading/poller';

export function Positions() {
  const positions = useTradingStore((s) => s.positions);
  const [closing, setClosing] = useState<string | null>(null);

  if (positions.length === 0) {
    return <div className="px-3 py-3 text-center text-xs text-text-muted">No open positions.</div>;
  }

  async function close(symbol: string) {
    setClosing(symbol);
    try {
      await closePosition(symbol);
      kickTradingRefresh();
    } catch {
      /* surfaced via the next poll / order rejection */
    } finally {
      setClosing(null);
    }
  }

  return (
    <div className="text-xs">
      <div className="flex items-center px-3 py-1 text-2xs uppercase tracking-wide text-text-muted">
        <span className="flex-1">Symbol</span>
        <span className="w-14 text-right">Qty</span>
        <span className="w-20 text-right">P&L</span>
        <span className="w-6" />
      </div>
      {positions.map((p) => {
        const pl = Number(p.unrealized_pl);
        const plpc = Number(p.unrealized_plpc) * 100;
        const tone = changeTone(pl);
        const toneClass = tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-text-muted';
        const qty = Number(p.qty);
        return (
          <div key={p.symbol} className="group flex items-center px-3 py-1 hover:bg-bg-elevated">
            <div className="flex-1 truncate">
              <div className="font-medium text-text-bright">{p.symbol}</div>
              <div className="text-2xs text-text-muted">
                @ {formatPrice(Number(p.avg_entry_price))} → {formatPrice(Number(p.current_price))}
              </div>
            </div>
            <span className={`w-14 text-right font-mono ${p.side === 'short' ? 'text-down' : 'text-text'}`}>
              {qty}
            </span>
            <div className={`w-20 text-right font-mono ${toneClass}`}>
              <div>{pl >= 0 ? '+' : ''}{formatPrice(pl)}</div>
              <div className="text-2xs">{formatPercent(plpc)}</div>
            </div>
            <button
              type="button"
              title="Close position (market)"
              disabled={closing === p.symbol}
              onClick={() => close(p.symbol)}
              className="oc-btn h-5 w-5 opacity-0 group-hover:opacity-100 hover:text-down disabled:opacity-40"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
