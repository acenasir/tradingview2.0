import { ReconnectingSocket, type SocketStatus } from '../socket';
import type { Tick } from './types';

/**
 * Finnhub real-time trade stream. The token is intentionally client-exposed
 * (Finnhub's browser WS is designed that way and is rate-limited), supplied via
 * the non-secret VITE_FINNHUB_TOKEN. One multiplexed socket; symbol
 * subscriptions are ref-counted by the desired set.
 */
const TOKEN = import.meta.env.VITE_FINNHUB_TOKEN ?? '';

export function finnhubAvailable(): boolean {
  return TOKEN.length > 0;
}

type TickListener = (tick: Tick) => void;
type StatusListener = (status: SocketStatus) => void;

interface FinnhubTradeMessage {
  type?: string;
  data?: { s: string; p: number; t: number; v?: number }[];
}

let socket: ReconnectingSocket | null = null;
const desired = new Set<string>();
const subscribed = new Set<string>();
const tickListeners = new Set<TickListener>();
const statusListeners = new Set<StatusListener>();

function ensureSocket(): void {
  if (socket || !finnhubAvailable()) return;
  socket = new ReconnectingSocket({
    url: `wss://ws.finnhub.io?token=${encodeURIComponent(TOKEN)}`,
    onOpen: () => {
      subscribed.clear();
      syncSubscriptions();
    },
    onMessage: (data) => {
      const msg = data as FinnhubTradeMessage;
      if (msg.type !== 'trade' || !Array.isArray(msg.data)) return;
      for (const d of msg.data) {
        const tick: Tick = { symbol: d.s, price: d.p, timestamp: d.t || Date.now(), volume: d.v };
        for (const l of tickListeners) l(tick);
      }
    },
    onStatus: (status) => {
      for (const l of statusListeners) l(status);
    },
  });
  socket.connect();
}

function syncSubscriptions(): void {
  if (!socket || !socket.isOpen()) return;
  for (const s of desired) {
    if (!subscribed.has(s)) {
      socket.send({ type: 'subscribe', symbol: s });
      subscribed.add(s);
    }
  }
  for (const s of [...subscribed]) {
    if (!desired.has(s)) {
      socket.send({ type: 'unsubscribe', symbol: s });
      subscribed.delete(s);
    }
  }
}

export const finnhubStream = {
  /** Replace the full set of symbols we want streamed. */
  setSymbols(symbols: string[]): void {
    desired.clear();
    for (const s of symbols) desired.add(s);
    if (!finnhubAvailable()) return;
    if (desired.size > 0) ensureSocket();
    syncSubscriptions();
  },
  onTick(listener: TickListener): () => void {
    tickListeners.add(listener);
    return () => tickListeners.delete(listener);
  },
  onStatus(listener: StatusListener): () => void {
    statusListeners.add(listener);
    return () => statusListeners.delete(listener);
  },
};
