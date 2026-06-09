import { ChevronRight, Info, ListChecks, Newspaper, Wallet } from 'lucide-react';
import { useState, type ComponentType } from 'react';
import { Details } from './Details';
import { Watchlist } from './Watchlist';

type TabId = 'watchlist' | 'details' | 'trade' | 'news';

const TABS: { id: TabId; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'watchlist', label: 'Watchlist', icon: ListChecks },
  { id: 'details', label: 'Details', icon: Info },
  { id: 'trade', label: 'Trade', icon: Wallet },
  { id: 'news', label: 'News', icon: Newspaper },
];

function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-sm font-medium text-text">{title}</p>
      <p className="mx-auto mt-2 max-w-[220px] text-xs leading-relaxed text-text-muted">{note}</p>
    </div>
  );
}

export function RightSidebar() {
  const [tab, setTab] = useState<TabId>('watchlist');
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="flex w-10 shrink-0 flex-col items-center gap-1 border-l border-border bg-bg-panel py-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            title={label}
            onClick={() => {
              setTab(id);
              setCollapsed(false);
            }}
            className="oc-btn h-8 w-8"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex w-72 shrink-0 flex-col border-l border-border bg-bg-panel">
      <div className="flex items-center border-b border-border">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex h-9 flex-1 items-center justify-center gap-1.5 text-xs transition-colors ${
              tab === id
                ? 'border-b-2 border-accent text-text-bright'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden lg:inline">{label}</span>
          </button>
        ))}
        <button
          type="button"
          title="Collapse"
          onClick={() => setCollapsed(true)}
          className="oc-btn h-9 w-8 shrink-0"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'watchlist' && <Watchlist />}
        {tab === 'details' && <Details />}
        {tab === 'trade' && (
          <ComingSoon
            title="Paper trading"
            note="Alpaca paper-trading panel (account, positions, order ticket) is wired in a later step. PAPER — simulated funds only."
          />
        )}
        {tab === 'news' && (
          <ComingSoon
            title="News"
            note="Company news for the active symbol (via Finnhub) arrives in a later step."
          />
        )}
      </div>
    </div>
  );
}
