import { Radio, Timer } from 'lucide-react';
import type { DataMode } from '../data/providers/types';
import { useSettingsStore } from '../store/settingsStore';

const OPTIONS: { mode: DataMode; label: string; title: string; icon: typeof Timer }[] = [
  {
    mode: 'delayed-free',
    label: 'Delayed',
    title: 'Delayed-free mode — polls free delayed endpoints. Works with one free key.',
    icon: Timer,
  },
  {
    mode: 'realtime',
    label: 'Realtime',
    title: 'Realtime mode — streams US tickers live via Finnhub (needs VITE_FINNHUB_TOKEN). Symbols with no free realtime source fall back to delayed polling.',
    icon: Radio,
  },
];

export function DataModeToggle() {
  const dataMode = useSettingsStore((s) => s.dataMode);
  const setDataMode = useSettingsStore((s) => s.setDataMode);

  return (
    <div className="flex items-center rounded border border-border p-0.5" role="group" aria-label="Data mode">
      {OPTIONS.map(({ mode, label, title, icon: Icon }) => {
        const active = dataMode === mode;
        return (
          <button
            key={mode}
            type="button"
            title={title}
            onClick={() => setDataMode(mode)}
            className={`flex h-6 items-center gap-1 rounded px-2 text-xs transition-colors ${
              active ? 'bg-bg-elevated text-text-bright' : 'text-text-muted hover:text-text'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
