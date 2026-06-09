import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DataMode } from '../data/providers/types';

export type Theme = 'dark' | 'light';
export type CrosshairMode = 'normal' | 'magnet';

interface SettingsState {
  /** delayed-free is the default and works with zero realtime entitlement. */
  dataMode: DataMode;
  /** Shared delayed-quote poll interval in ms (free-tier friendly). */
  pollIntervalMs: number;
  theme: Theme;
  showGrid: boolean;
  crosshair: CrosshairMode;
  /** IANA time zone for axis labels / clock (empty = local). */
  timezone: string;

  setDataMode: (mode: DataMode) => void;
  setPollIntervalMs: (ms: number) => void;
  toggleTheme: () => void;
  setShowGrid: (value: boolean) => void;
  setCrosshair: (mode: CrosshairMode) => void;
  setTimezone: (tz: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      dataMode: 'delayed-free',
      pollIntervalMs: 15_000,
      theme: 'dark',
      showGrid: true,
      crosshair: 'normal',
      timezone: '',

      setDataMode: (mode) => set({ dataMode: mode }),
      setPollIntervalMs: (ms) => set({ pollIntervalMs: Math.min(120_000, Math.max(3_000, Math.round(ms))) }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setShowGrid: (value) => set({ showGrid: value }),
      setCrosshair: (mode) => set({ crosshair: mode }),
      setTimezone: (tz) => set({ timezone: tz }),
    }),
    { name: 'openchart.settings', version: 1 },
  ),
);
