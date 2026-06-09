// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import App from './App';

// Mock the imperative charting engine — jsdom has no canvas, and we only want
// to prove the React workspace mounts and the grid populates from the stores.
vi.mock('lightweight-charts', () => {
  const series = {
    setData: vi.fn(),
    applyOptions: vi.fn(),
    attachPrimitive: vi.fn(),
    detachPrimitive: vi.fn(),
    priceToCoordinate: vi.fn(() => 0),
    coordinateToPrice: vi.fn(() => 0),
    createPriceLine: vi.fn(),
  };
  const timeScale = {
    fitContent: vi.fn(),
    logicalToCoordinate: vi.fn(() => 0),
    coordinateToLogical: vi.fn(() => 0),
  };
  const chart = {
    addSeries: vi.fn(() => series),
    removeSeries: vi.fn(),
    resize: vi.fn(),
    remove: vi.fn(),
    applyOptions: vi.fn(),
    timeScale: vi.fn(() => timeScale),
    subscribeClick: vi.fn(),
    unsubscribeClick: vi.fn(),
    subscribeCrosshairMove: vi.fn(),
    unsubscribeCrosshairMove: vi.fn(),
    panes: vi.fn(() => []),
    addPane: vi.fn(() => ({ setHeight: vi.fn() })),
    removePane: vi.fn(),
    priceScale: vi.fn(() => ({ applyOptions: vi.fn() })),
  };
  return {
    createChart: vi.fn(() => chart),
    ColorType: { Solid: 'solid' },
    CrosshairMode: { Normal: 0, Magnet: 1 },
    LineStyle: {},
    CandlestickSeries: 'Candlestick',
    BarSeries: 'Bar',
    LineSeries: 'Line',
    AreaSeries: 'Area',
    BaselineSeries: 'Baseline',
    HistogramSeries: 'Histogram',
  };
});

// Avoid real account fetches from the always-mounted status bar during render.
vi.mock('./trading/poller', () => ({
  useTrading: () => ({ positions: [], openOrders: [], configured: false, polling: false, lastPollAt: null }),
  useTradingStore: () => ({ positions: [], openOrders: [], configured: false }),
  subscribeTrading: () => () => {},
  kickTradingRefresh: () => {},
  refreshTrading: async () => {},
}));

beforeAll(() => {
  // jsdom has no ResizeObserver.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(cleanup);

describe('App', () => {
  it('mounts the workspace shell and a populated multi-chart grid', async () => {
    render(<App />);

    // Top toolbar brand + attribution badge are present.
    expect(screen.getByText('OpenChart')).toBeTruthy();
    expect(screen.getByText(/Powered by TradingView Lightweight Charts/)).toBeTruthy();

    // Panes start empty — each shows the in-pane symbol search prompt.
    expect((await screen.findAllByText('Search a symbol')).length).toBeGreaterThan(0);
    // The default watchlist is still populated (AAPL row).
    expect(screen.getAllByText('AAPL').length).toBeGreaterThan(0);

    // The watchlist tab and timeframe controls rendered.
    expect(screen.getByText('Watchlist')).toBeTruthy();
    expect(screen.getAllByText('1D').length).toBeGreaterThan(0);
  });
});
