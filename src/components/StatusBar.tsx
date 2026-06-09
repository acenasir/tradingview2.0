import { useEffect, useState } from 'react';
import { useQuoteStore } from '../data/quotes';
import { formatClock } from '../lib/format';
import { useSettingsStore } from '../store/settingsStore';

export function StatusBar() {
  const [now, setNow] = useState(() => new Date());
  const polling = useQuoteStore((s) => s.polling);
  const lastPollAt = useQuoteStore((s) => s.lastPollAt);
  const dataMode = useSettingsStore((s) => s.dataMode);
  const pollIntervalMs = useSettingsStore((s) => s.pollIntervalMs);
  const timezone = useSettingsStore((s) => s.timezone);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const stale = lastPollAt == null || now.getTime() - lastPollAt > pollIntervalMs * 2.5;
  const dotClass = polling
    ? 'bg-accent animate-pulse'
    : lastPollAt == null
      ? 'bg-text-muted'
      : stale
        ? 'bg-amber-400'
        : 'bg-up';
  const connLabel = polling
    ? 'Polling…'
    : lastPollAt == null
      ? 'Idle'
      : stale
        ? 'Stale'
        : 'Connected';

  return (
    <div className="flex h-6 shrink-0 items-center gap-3 border-t border-border bg-bg-panel px-3 text-2xs text-text-muted">
      <span className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
        {connLabel}
      </span>
      <span className="text-border-strong">·</span>
      <span title="Default mode polls free delayed endpoints">
        {dataMode === 'delayed-free' ? 'Delayed · polling' : 'Realtime'} · every {Math.round(pollIntervalMs / 1000)}s
      </span>

      <span className="ml-auto flex items-center gap-3">
        <span className="font-mono">UTC {formatClock(now, 'UTC')}</span>
        <span className="font-mono">{formatClock(now, timezone || undefined)} local</span>
        <span className="text-border-strong">·</span>
        <span title="Paper trading wired in a later step">Paper: —</span>
        <span className="text-border-strong">·</span>
        <a
          href="https://www.tradingview.com/"
          target="_blank"
          rel="noreferrer noopener"
          className="text-text-muted hover:text-accent"
          title="Charting by TradingView Lightweight Charts™ (Apache-2.0)"
        >
          Powered by TradingView Lightweight Charts™
        </a>
      </span>
    </div>
  );
}
