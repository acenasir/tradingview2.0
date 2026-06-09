import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useQuotes } from '../../data/quotes';
import { changeTone, formatPercent, formatPrice } from '../../lib/format';
import { useLayoutStore } from '../../store/layoutStore';
import { useWatchlistStore } from '../../store/watchlistStore';
import { SymbolSearch } from '../SymbolSearch';

export function Watchlist() {
  const lists = useWatchlistStore((s) => s.lists);
  const activeListId = useWatchlistStore((s) => s.activeListId);
  const setActiveList = useWatchlistStore((s) => s.setActiveList);
  const addSymbol = useWatchlistStore((s) => s.addSymbol);
  const removeSymbol = useWatchlistStore((s) => s.removeSymbol);
  const addList = useWatchlistStore((s) => s.addList);

  const setPaneSymbol = useLayoutStore((s) => s.setPaneSymbol);
  const activePane = useLayoutStore((s) => s.activePane);

  const [adding, setAdding] = useState(false);

  const activeList = lists.find((l) => l.id === activeListId) ?? lists[0];
  const quotes = useQuotes(activeList.symbols);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <select
          value={activeList.id}
          onChange={(e) => setActiveList(e.target.value)}
          className="h-7 flex-1 rounded border border-border bg-bg-input px-2 text-xs text-text-bright focus:border-accent focus:outline-none"
        >
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.symbols.length})
            </option>
          ))}
        </select>
        <button
          type="button"
          title="New watchlist"
          onClick={() => addList(`List ${lists.length + 1}`)}
          className="oc-btn h-7 w-7"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-border px-2 py-1.5">
        {adding ? (
          <SymbolSearch
            compact
            autoFocus
            placeholder="Add symbol…"
            onSelect={(s) => {
              addSymbol(s);
              setAdding(false);
            }}
            onClose={() => setAdding(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex h-6 w-full items-center gap-1.5 rounded text-xs text-text-muted hover:text-text"
          >
            <Plus className="h-3.5 w-3.5" /> Add symbol
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* column header */}
        <div className="flex items-center px-2 py-1 text-2xs uppercase tracking-wide text-text-muted">
          <span className="flex-1">Symbol</span>
          <span className="w-20 text-right">Last</span>
          <span className="w-16 text-right">Chg%</span>
          <span className="w-5" />
        </div>

        {activeList.symbols.length === 0 && (
          <div className="px-3 py-4 text-center text-xs text-text-muted">No symbols yet.</div>
        )}

        {activeList.symbols.map((sym) => {
          const q = quotes[sym];
          const tone = changeTone(q?.changePercent);
          const toneClass = tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-text-muted';
          return (
            <div
              key={sym}
              onClick={() => setPaneSymbol(activePane, sym)}
              className="group flex cursor-pointer items-center px-2 py-1 hover:bg-bg-elevated"
              title={`Load ${sym} into the active pane`}
            >
              <span className="flex-1 truncate font-medium text-text-bright">{sym}</span>
              <span className="w-20 text-right font-mono text-text">{formatPrice(q?.price)}</span>
              <span className={`w-16 text-right font-mono text-2xs ${toneClass}`}>
                {q ? formatPercent(q.changePercent) : '—'}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeSymbol(sym);
                }}
                className="oc-btn h-5 w-5 opacity-0 group-hover:opacity-100 hover:text-down"
                title="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
