import { useEffect } from 'react';
import { create } from 'zustand';
import { ApiError } from '../lib/api';
import { getAccount, getOpenOrders, getPositions, type AlpacaAccount, type AlpacaOrder, type AlpacaPosition } from './alpaca';

/**
 * Shared poller for the paper account. Account/positions/orders are all REST,
 * so this works identically locally and on Vercel (no persistent WebSocket).
 * If the server reports keys are missing (503) we flip to "unconfigured" and
 * stop polling so we don't hammer the proxy.
 */

interface TradingState {
  account?: AlpacaAccount;
  positions: AlpacaPosition[];
  openOrders: AlpacaOrder[];
  /** null = unknown/loading, true = keys present, false = not configured. */
  configured: boolean | null;
  error?: string;
  polling: boolean;
  lastPollAt: number | null;
}

export const useTradingStore = create<TradingState>(() => ({
  positions: [],
  openOrders: [],
  configured: null,
  polling: false,
  lastPollAt: null,
}));

const POLL_MS = 6000;
let refCount = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let consecutiveFailures = 0;

/** Fetch account + positions + open orders once and update the store. */
export async function refreshTrading(): Promise<void> {
  useTradingStore.setState({ polling: true });
  try {
    const [account, positions, openOrders] = await Promise.all([
      getAccount(),
      getPositions(),
      getOpenOrders(),
    ]);
    consecutiveFailures = 0;
    useTradingStore.setState({
      account,
      positions,
      openOrders,
      configured: true,
      error: undefined,
      polling: false,
      lastPollAt: Date.now(),
    });
  } catch (err) {
    // Server reports keys missing → unconfigured; stop immediately.
    if (err instanceof ApiError && err.status === 503) {
      consecutiveFailures = 0;
      useTradingStore.setState({ configured: false, polling: false, lastPollAt: Date.now() });
      stop();
      return;
    }
    consecutiveFailures += 1;
    const message = err instanceof Error ? err.message : 'Failed to load account';
    // Never connected and repeatedly failing (e.g. no `/api` under plain
    // `vite dev`) → give up rather than poll a dead endpoint forever.
    if (useTradingStore.getState().configured !== true && consecutiveFailures >= 3) {
      useTradingStore.setState({ configured: false, error: message, polling: false, lastPollAt: Date.now() });
      stop();
      return;
    }
    useTradingStore.setState({ error: message, polling: false, lastPollAt: Date.now() });
  }
}

function schedule(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(tick, POLL_MS);
}

async function tick(): Promise<void> {
  await refreshTrading();
  if (running) schedule();
}

function start(): void {
  if (running) return;
  running = true;
  void tick();
}

function stop(): void {
  running = false;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

/** Subscribe to account polling. Returns an unsubscribe function. */
export function subscribeTrading(): () => void {
  refCount += 1;
  if (!running && useTradingStore.getState().configured !== false) start();
  return () => {
    refCount -= 1;
    if (refCount <= 0) stop();
  };
}

/** Force an immediate refresh (e.g. right after placing/cancelling an order). */
export function kickTradingRefresh(): void {
  void refreshTrading();
}

export function useTrading(): TradingState {
  useEffect(() => subscribeTrading(), []);
  return useTradingStore();
}
