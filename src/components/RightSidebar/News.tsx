import { ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCompanyNews, type NewsItem } from '../../data/news';
import { ApiError } from '../../lib/api';
import { useLayoutStore } from '../../store/layoutStore';

type NewsState = 'idle' | 'loading' | 'error' | 'empty' | 'unconfigured' | 'unsupported';

function timeAgo(unixSec: number): string {
  const s = Math.max(0, Math.floor(Date.now() / 1000 - unixSec));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function News() {
  const symbol = useLayoutStore((s) => s.panes[s.activePane]?.symbol ?? '');
  const [items, setItems] = useState<NewsItem[]>([]);
  const [state, setState] = useState<NewsState>('idle');

  useEffect(() => {
    if (!symbol) {
      setState('idle');
      setItems([]);
      return;
    }
    // Finnhub company-news covers US equities; pairs/indices aren't supported.
    if (symbol.includes('/')) {
      setState('unsupported');
      setItems([]);
      return;
    }
    const controller = new AbortController();
    setState('loading');
    getCompanyNews(symbol, controller.signal)
      .then((news) => {
        if (controller.signal.aborted) return;
        setItems(news);
        setState(news.length ? 'idle' : 'empty');
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setState(err instanceof ApiError && err.status === 503 ? 'unconfigured' : 'error');
      });
    return () => controller.abort();
  }, [symbol]);

  if (!symbol) {
    return <div className="px-3 py-4 text-center text-xs text-text-muted">No symbol in the active pane.</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-1.5 text-xs">
        <span className="font-semibold text-text-bright">{symbol}</span>
        <span className="text-text-muted"> · recent news</span>
      </div>

      {state === 'loading' && <div className="px-3 py-4 text-center text-xs text-text-muted">Loading…</div>}
      {state === 'empty' && <div className="px-3 py-4 text-center text-xs text-text-muted">No recent news.</div>}
      {state === 'unsupported' && (
        <div className="px-3 py-4 text-center text-xs text-text-muted">News is available for US stock symbols.</div>
      )}
      {state === 'error' && <div className="px-3 py-4 text-center text-xs text-down">Couldn’t load news.</div>}
      {state === 'unconfigured' && (
        <div className="px-4 py-6 text-center text-xs leading-relaxed text-text-muted">
          Set <code className="text-text">FINNHUB_KEY</code> on the server (and run via <code className="text-text">vercel dev</code>)
          to load company news — see the README.
        </div>
      )}

      {state === 'idle' && items.length > 0 && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {items.map((n) => (
            <a
              key={n.id}
              href={n.url}
              target="_blank"
              rel="noreferrer noopener"
              className="group block border-b border-border/60 px-3 py-2 hover:bg-bg-elevated"
            >
              <div className="mb-0.5 flex items-center gap-1.5 text-2xs text-text-muted">
                <span className="truncate">{n.source}</span>
                <span>·</span>
                <span>{timeAgo(n.datetime)}</span>
                <ExternalLink className="ml-auto h-3 w-3 opacity-0 group-hover:opacity-100" />
              </div>
              <div className="text-xs font-medium leading-snug text-text group-hover:text-text-bright">{n.headline}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
