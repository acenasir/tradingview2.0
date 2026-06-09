import { useEffect, useState } from 'react';
import { useQuoteStore } from '../data/quotes';
import { formatClock, formatPrice } from '../lib/format';
import { useSettingsStore } from '../store/settingsStore';
import { useTrading } from '../trading/poller';

export function StatusBar() {
  const [now, setNow] = useState(() => new Date());
  const polling = useQuoteStore((s) => s.polling);
  const lastPollAt = useQuoteStore((s) => s.lastPollAt);
  const streaming = useQuoteStore((s) => s.streaming);
  const streamStatus = useQuoteStore((s) => s.streamStatus);
  const dataMode = useSettingsStore((s) => s.dataMode);
  const pollIntervalMs = useSettingsStore((s) => s.pollIntervalMs);
  const timezone = useSettingsStore((s) => s.timezone);
  const { account, configured } = useTrading();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const realtime = dataMode === 'realtime';
  const stale = lastPollAt == null || now.getTime() - lastPollAt > pollIntervalMs * 2.5;

  let dotClass: string;
  let connLabel: string;
  if (realtime && streaming) {
    if (streamStatus === 'open') {
      dotClass = 'bg-up';
      connLabel = 'Live';
    } else if (streamStatus === 'connecting' || streamStatus === 'reconnecting') {
      dotClass = 'bg-amber-400 animate-pulse';
      connLabel = streamStatus === 'connecting' ? 'Connecting…' : 'Reconnecting…';
    } else {
      dotClass = 'bg-text-muted';
      connLabel = 'Idle';
    }
  } else if (polling) {
    dotClass = 'bg-accent animate-pulse';
    connLabel = 'Polling…';
  } else if (lastPollAt == null) {
    dotClass = 'bg-text-muted';
    connLabel = 'Idle';
  } else if (stale) {
    dotClass = 'bg-amber-400';
    connLabel = 'Stale';
  } else {
    dotClass = 'bg-up';
    connLabel = 'Connected';
  }

  return (
    <div className="flex h-6 shrink-0 items-center gap-3 border-t border-border bg-bg-panel px-3 text-2xs text-text-muted">
      <span className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
        {connLabel}
      </span>
      <span className="text-border-strong">·</span>
      <span
        title={
          realtime
            ? 'Realtime streams via Finnhub where available; other symbols poll delayed'
            : 'Default mode polls free delayed endpoints'
        }
      >
        {realtime ? `Realtime${streaming ? ' · live' : ' · delayed fallback'}` : 'Delayed · polling'} · every{' '}
        {Math.round(pollIntervalMs / 1000)}s
      </span>

      <span className="ml-auto flex items-center gap-3">
        <span className="font-mono">UTC {formatClock(now, 'UTC')}</span>
        <span className="font-mono">{formatClock(now, timezone || undefined)} local</span>
        <span className="text-border-strong">·</span>
        <span title="Alpaca paper account equity (simulated funds)">
          {configured === false
            ? 'Paper: off'
            : account
              ? `Paper $${formatPrice(Number(account.equity))}`
              : 'Paper …'}
        </span>
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
