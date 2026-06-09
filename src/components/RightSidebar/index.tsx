import { ChevronRight, Info, ListChecks, Newspaper, Wallet } from 'lucide-react';
import type { ComponentType } from 'react';
import { useUiStore, type SidebarTab } from '../../store/uiStore';
import { Details } from './Details';
import { News } from './News';
import { TradePanel } from './TradePanel';
import { Watchlist } from './Watchlist';

const TABS: { id: SidebarTab; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'watchlist', label: 'Watchlist', icon: ListChecks },
  { id: 'details', label: 'Details', icon: Info },
  { id: 'trade', label: 'Trade', icon: Wallet },
  { id: 'news', label: 'News', icon: Newspaper },
];

export function RightSidebar() {
  const tab = useUiStore((s) => s.sidebarTab);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const setTab = useUiStore((s) => s.setSidebarTab);
  const setCollapsed = useUiStore((s) => s.setSidebarCollapsed);

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
              tab === id ? 'border-b-2 border-accent text-text-bright' : 'text-text-muted hover:text-text'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden lg:inline">{label}</span>
          </button>
        ))}
        <button type="button" title="Collapse" onClick={() => setCollapsed(true)} className="oc-btn h-9 w-8 shrink-0">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'watchlist' && <Watchlist />}
        {tab === 'details' && <Details />}
        {tab === 'trade' && <TradePanel />}
        {tab === 'news' && <News />}
      </div>
    </div>
  );
}
