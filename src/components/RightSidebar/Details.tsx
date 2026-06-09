import { useQuote } from '../../data/quotes';
import { changeTone, formatChange, formatCompact, formatPercent, formatPrice } from '../../lib/format';
import { freshnessClasses, freshnessLabel } from '../../lib/freshness';
import { useLayoutStore } from '../../store/layoutStore';

function Row({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-1.5">
      <span className="text-text-muted">{label}</span>
      <span className={`font-mono ${className}`}>{value}</span>
    </div>
  );
}

export function Details() {
  const symbol = useLayoutStore((s) => s.panes[s.activePane]?.symbol ?? '');
  const quote = useQuote(symbol || undefined);

  if (!symbol) {
    return <div className="px-3 py-4 text-center text-xs text-text-muted">No symbol in the active pane.</div>;
  }

  const tone = changeTone(quote?.changePercent);
  const toneClass = tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-text-muted';
  const range =
    quote?.low != null && quote?.high != null
      ? `${formatPrice(quote.low)} – ${formatPrice(quote.high)}`
      : '—';

  return (
    <div className="px-3 py-2 text-sm">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg font-semibold text-text-bright">{symbol}</span>
        {quote && (
          <span className={`oc-badge ${freshnessClasses(quote.freshness)}`}>
            {freshnessLabel(quote.freshness)}
          </span>
        )}
      </div>

      <div className="mb-3 flex items-baseline gap-2">
        <span className="font-mono text-2xl text-text-bright">{formatPrice(quote?.price)}</span>
        <span className={`font-mono ${toneClass}`}>
          {quote ? `${formatChange(quote.change)} (${formatPercent(quote.changePercent)})` : ''}
        </span>
      </div>

      <Row label="Previous close" value={formatPrice(quote?.prevClose)} />
      <Row label="Open" value={formatPrice(quote?.open)} />
      <Row label="Day range" value={range} />
      <Row label="Day high" value={formatPrice(quote?.high)} />
      <Row label="Day low" value={formatPrice(quote?.low)} />
      <Row label="Volume" value={formatCompact(quote?.volume)} />
      <Row label="52-week range" value="—" />

      <p className="mt-3 text-2xs leading-relaxed text-text-muted">
        Stats reflect the latest delayed quote. Extended fields (52-week range, market cap,
        fundamentals) arrive with the realtime/details providers in a later step.
      </p>
    </div>
  );
}
