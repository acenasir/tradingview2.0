import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type IndicatorType = 'sma' | 'ema' | 'bollinger' | 'vwap' | 'volume' | 'rsi' | 'macd';

export interface IndicatorConfig {
  id: string;
  type: IndicatorType;
  period?: number;
  color?: string;
}

export interface IndicatorMeta {
  label: string;
  /** Renders on the price pane (vs. its own sub-pane). */
  overlay: boolean;
  hasPeriod: boolean;
  defaultPeriod?: number;
  defaultColor: string;
}

export const INDICATOR_META: Record<IndicatorType, IndicatorMeta> = {
  sma: { label: 'SMA', overlay: true, hasPeriod: true, defaultPeriod: 20, defaultColor: '#f5a623' },
  ema: { label: 'EMA', overlay: true, hasPeriod: true, defaultPeriod: 20, defaultColor: '#2962ff' },
  bollinger: { label: 'Bollinger Bands', overlay: true, hasPeriod: true, defaultPeriod: 20, defaultColor: '#a78bfa' },
  vwap: { label: 'VWAP', overlay: true, hasPeriod: false, defaultColor: '#ff6d00' },
  volume: { label: 'Volume', overlay: true, hasPeriod: false, defaultColor: '#787b86' },
  rsi: { label: 'RSI', overlay: false, hasPeriod: true, defaultPeriod: 14, defaultColor: '#2962ff' },
  macd: { label: 'MACD', overlay: false, hasPeriod: false, defaultColor: '#2962ff' },
};

/** Order shown in the Indicators menu. */
export const INDICATOR_ORDER: IndicatorType[] = ['sma', 'ema', 'bollinger', 'vwap', 'rsi', 'macd', 'volume'];

interface IndicatorState {
  /** Indicators keyed by pane id (they persist across symbol changes). */
  indicators: Record<string, IndicatorConfig[]>;
  addIndicator: (paneId: string, type: IndicatorType) => void;
  removeIndicator: (paneId: string, id: string) => void;
  updateIndicator: (paneId: string, id: string, patch: Partial<IndicatorConfig>) => void;
}

let counter = 0;
function newId(): string {
  return `ind-${Date.now().toString(36)}-${(counter++).toString(36)}`;
}

export const useIndicatorStore = create<IndicatorState>()(
  persist(
    (set) => ({
      indicators: {},
      addIndicator: (paneId, type) =>
        set((s) => {
          const meta = INDICATOR_META[type];
          const cfg: IndicatorConfig = { id: newId(), type, period: meta.defaultPeriod, color: meta.defaultColor };
          return { indicators: { ...s.indicators, [paneId]: [...(s.indicators[paneId] ?? []), cfg] } };
        }),
      removeIndicator: (paneId, id) =>
        set((s) => ({
          indicators: { ...s.indicators, [paneId]: (s.indicators[paneId] ?? []).filter((c) => c.id !== id) },
        })),
      updateIndicator: (paneId, id, patch) =>
        set((s) => ({
          indicators: {
            ...s.indicators,
            [paneId]: (s.indicators[paneId] ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
          },
        })),
    }),
    { name: 'openchart.indicators', version: 1 },
  ),
);
