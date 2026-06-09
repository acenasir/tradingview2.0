import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { searchSymbols } from '../data/providers/router';
import type { AssetType, SymbolResult } from '../data/providers/types';

interface SymbolSearchProps {
  onSelect: (symbol: string) => void;
  onClose?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
  /** Compact styling for use inside a pane header. */
  compact?: boolean;
  className?: string;
  /** DOM id for the input (used by the global "/" focus shortcut). */
  inputId?: string;
}

const ASSET_BADGE: Record<AssetType, { label: string; className: string }> = {
  stock: { label: 'STK', className: 'bg-accent/15 text-accent' },
  etf: { label: 'ETF', className: 'bg-accent/15 text-accent' },
  crypto: { label: 'CRY', className: 'bg-amber-500/15 text-amber-400' },
  forex: { label: 'FX', className: 'bg-up/15 text-up' },
  index: { label: 'IDX', className: 'bg-purple-500/15 text-purple-400' },
  futures: { label: 'FUT', className: 'bg-orange-500/15 text-orange-400' },
};

export function SymbolSearch({
  onSelect,
  onClose,
  autoFocus,
  placeholder = 'Search symbol…',
  compact,
  className = '',
  inputId,
}: SymbolSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SymbolResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Debounced search with in-flight cancellation.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchSymbols(query, controller.signal);
        if (!controller.signal.aborted) {
          setResults(res);
          setHighlight(0);
        }
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [query]);

  function choose(symbol: string) {
    onSelect(symbol);
    setQuery('');
    onClose?.();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = results[highlight];
      if (pick) choose(pick.symbol);
      else if (query.trim()) choose(query.trim().toUpperCase());
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose?.();
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-text-muted" />
        <input
          ref={inputRef}
          id={inputId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => setTimeout(() => onClose?.(), 120)}
          placeholder={placeholder}
          spellCheck={false}
          className={`w-full rounded border border-border bg-bg-input pl-7 pr-7 text-text-bright placeholder:text-text-muted focus:border-accent focus:outline-none ${
            compact ? 'h-6 text-xs' : 'h-8 text-sm'
          }`}
        />
        {query && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-1.5 oc-btn h-5 w-5"
            aria-label="Clear"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="absolute z-50 mt-1 max-h-80 w-full min-w-[260px] overflow-y-auto rounded border border-border bg-bg-panel shadow-xl">
        {loading && results.length === 0 ? (
          <div className="px-3 py-2 text-xs text-text-muted">Searching…</div>
        ) : results.length === 0 ? (
          <div className="px-3 py-2 text-xs text-text-muted">No matches</div>
        ) : (
          results.map((r, i) => {
            const badge = ASSET_BADGE[r.type];
            return (
              <button
                key={`${r.symbol}-${r.exchange}-${i}`}
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(r.symbol);
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left ${
                  i === highlight ? 'bg-bg-elevated' : ''
                }`}
              >
                <span className={`oc-badge w-9 justify-center ${badge.className}`}>{badge.label}</span>
                <span className="font-semibold text-text-bright">{r.symbol}</span>
                <span className="flex-1 truncate text-xs text-text-muted">{r.name}</span>
                <span className="text-2xs text-text-muted">{r.exchange}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
