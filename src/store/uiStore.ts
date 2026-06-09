import { create } from 'zustand';
import type { OrderSide } from '../trading/alpaca';

export type SidebarTab = 'watchlist' | 'details' | 'trade' | 'news';

interface UiState {
  sidebarTab: SidebarTab;
  sidebarCollapsed: boolean;
  /** Pre-selected side for the order ticket. */
  tradeSide: OrderSide;
  /** Bumped each time a trade is requested, so the ticket can re-sync. */
  tradeNonce: number;

  setSidebarTab: (tab: SidebarTab) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  /** Open the Trade tab with a side preset (used by the b/s shortcuts). */
  openTrade: (side: OrderSide) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarTab: 'watchlist',
  sidebarCollapsed: false,
  tradeSide: 'buy',
  tradeNonce: 0,

  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  openTrade: (side) =>
    set((s) => ({ sidebarTab: 'trade', sidebarCollapsed: false, tradeSide: side, tradeNonce: s.tradeNonce + 1 })),
}));
