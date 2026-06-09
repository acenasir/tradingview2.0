import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
}

interface WatchlistState {
  lists: Watchlist[];
  activeListId: string;

  setActiveList: (id: string) => void;
  addSymbol: (symbol: string) => void;
  removeSymbol: (symbol: string) => void;
  addList: (name: string) => void;
  renameList: (id: string, name: string) => void;
  deleteList: (id: string) => void;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

const DEFAULT_LIST: Watchlist = {
  id: 'default',
  name: 'My List',
  symbols: ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'SPY', 'QQQ', 'BTC/USD', 'ETH/USD', 'EUR/USD'],
};

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set) => ({
      lists: [DEFAULT_LIST],
      activeListId: DEFAULT_LIST.id,

      setActiveList: (id) => set({ activeListId: id }),

      addSymbol: (symbol) =>
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === s.activeListId && !l.symbols.includes(symbol)
              ? { ...l, symbols: [symbol, ...l.symbols] }
              : l,
          ),
        })),

      removeSymbol: (symbol) =>
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === s.activeListId ? { ...l, symbols: l.symbols.filter((x) => x !== symbol) } : l,
          ),
        })),

      addList: (name) =>
        set((s) => {
          const list: Watchlist = { id: uid(), name: name.trim() || `List ${s.lists.length + 1}`, symbols: [] };
          return { lists: [...s.lists, list], activeListId: list.id };
        }),

      renameList: (id, name) =>
        set((s) => ({ lists: s.lists.map((l) => (l.id === id ? { ...l, name } : l)) })),

      deleteList: (id) =>
        set((s) => {
          if (s.lists.length <= 1) return s; // always keep at least one
          const lists = s.lists.filter((l) => l.id !== id);
          const activeListId = s.activeListId === id ? lists[0].id : s.activeListId;
          return { lists, activeListId };
        }),
    }),
    { name: 'openchart.watchlists', version: 1 },
  ),
);
