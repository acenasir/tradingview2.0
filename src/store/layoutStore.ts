import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChartType, Resolution } from '../data/providers/types';
import { MAX_PANES, paneCount, type LayoutPreset } from '../lib/layouts';

export interface PaneConfig {
  id: string;
  /** Empty string = an empty pane (shows a search prompt). */
  symbol: string;
  resolution: Resolution;
  chartType: ChartType;
}

interface LayoutState {
  preset: LayoutPreset;
  /** Always MAX_PANES configs; the preset controls how many are visible so
   *  switching presets never discards a pane's configuration. */
  panes: PaneConfig[];
  activePane: number;
  maximized: number | null;

  setPreset: (preset: LayoutPreset) => void;
  setActivePane: (index: number) => void;
  setPaneSymbol: (index: number, symbol: string) => void;
  setPaneResolution: (index: number, resolution: Resolution) => void;
  setPaneChartType: (index: number, chartType: ChartType) => void;
  clearPane: (index: number) => void;
  toggleMaximize: (index: number) => void;
}

function makePane(index: number): PaneConfig {
  return {
    id: `pane-${index}-${Math.random().toString(36).slice(2, 8)}`,
    symbol: '', // empty by default — assign a symbol via the in-pane search
    resolution: '1D',
    chartType: 'candlestick',
  };
}

function initialPanes(): PaneConfig[] {
  return Array.from({ length: MAX_PANES }, (_, i) => makePane(i));
}

function updatePane(panes: PaneConfig[], index: number, patch: Partial<PaneConfig>): PaneConfig[] {
  return panes.map((p, i) => (i === index ? { ...p, ...patch } : p));
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      preset: '4',
      panes: initialPanes(),
      activePane: 0,
      maximized: null,

      setPreset: (preset) =>
        set((s) => ({
          preset,
          activePane: Math.min(s.activePane, paneCount(preset) - 1),
          maximized: null,
        })),

      setActivePane: (index) => set({ activePane: index }),

      setPaneSymbol: (index, symbol) =>
        set((s) => ({ panes: updatePane(s.panes, index, { symbol: symbol.trim() }) })),

      setPaneResolution: (index, resolution) =>
        set((s) => ({ panes: updatePane(s.panes, index, { resolution }) })),

      setPaneChartType: (index, chartType) =>
        set((s) => ({ panes: updatePane(s.panes, index, { chartType }) })),

      clearPane: (index) => set((s) => ({ panes: updatePane(s.panes, index, { symbol: '' }) })),

      toggleMaximize: (index) => set((s) => ({ maximized: s.maximized === index ? null : index })),
    }),
    {
      name: 'openchart.layout',
      version: 2,
      // v2: stop auto-assigning default symbols — start every pane empty so the
      // user populates each chart by searching.
      migrate: (persisted, version) => {
        const state = persisted as Partial<LayoutState> | undefined;
        if (state?.panes && version < 2) {
          state.panes = state.panes.map((p) => ({ ...p, symbol: '' }));
        }
        return state as LayoutState;
      },
      partialize: (s) => ({ preset: s.preset, panes: s.panes, activePane: s.activePane }),
      merge: (persisted, current) => {
        // Be defensive: ensure we always have exactly MAX_PANES configs.
        const p = persisted as Partial<LayoutState> | undefined;
        const panes = (p?.panes ?? current.panes).slice(0, MAX_PANES);
        while (panes.length < MAX_PANES) panes.push(makePane(panes.length));
        return { ...current, ...p, panes };
      },
    },
  ),
);
