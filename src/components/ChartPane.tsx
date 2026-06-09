import {
  AreaSeries,
  BarSeries,
  BaselineSeries,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineSeries,
  createChart,
  type ChartOptions,
  type DeepPartial,
  type IChartApi,
  type ISeriesApi,
  type SeriesDataItemTypeMap,
  type SeriesType,
  type UTCTimestamp,
} from 'lightweight-charts';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getHistory } from '../data/providers/router';
import { useQuote } from '../data/quotes';
import type { Candle, ChartType, Freshness } from '../data/providers/types';
import { toHeikinAshi } from '../lib/candles';
import { changeTone, formatPercent, formatPrice } from '../lib/format';
import { freshnessClasses, freshnessLabel, freshnessTitle } from '../lib/freshness';
import { useLayoutStore } from '../store/layoutStore';
import { useSettingsStore } from '../store/settingsStore';
import { observeResize } from '../lib/resize';
import { SymbolSearch } from './SymbolSearch';

const UP = '#26a69a';
const DOWN = '#ef5350';
const BLUE = '#2962ff';

type AnySeriesData = SeriesDataItemTypeMap[SeriesType];
type PaneStatus = 'loading' | 'ready' | 'error' | 'notfound' | 'empty';

function baseChartOptions(showGrid: boolean, magnet: boolean): DeepPartial<ChartOptions> {
  return {
    autoSize: false,
    layout: {
      background: { type: ColorType.Solid, color: '#131722' },
      textColor: '#b2b5be',
      fontSize: 11,
      attributionLogo: false, // single global attribution lives in the status bar
    },
    grid: {
      vertLines: { color: '#1e222d', visible: showGrid },
      horzLines: { color: '#1e222d', visible: showGrid },
    },
    rightPriceScale: { borderColor: '#2a2e39' },
    timeScale: { borderColor: '#2a2e39', timeVisible: true, secondsVisible: false, rightOffset: 4 },
    crosshair: { mode: magnet ? CrosshairMode.Magnet : CrosshairMode.Normal },
    handleScale: true,
    handleScroll: true,
  };
}

function createSeries(chart: IChartApi, type: ChartType): ISeriesApi<SeriesType> {
  switch (type) {
    case 'bar':
      return chart.addSeries(BarSeries, { upColor: UP, downColor: DOWN }) as ISeriesApi<SeriesType>;
    case 'line':
      return chart.addSeries(LineSeries, { color: BLUE, lineWidth: 2 }) as ISeriesApi<SeriesType>;
    case 'area':
      return chart.addSeries(AreaSeries, {
        lineColor: BLUE,
        topColor: 'rgba(41, 98, 255, 0.4)',
        bottomColor: 'rgba(41, 98, 255, 0.02)',
        lineWidth: 2,
      }) as ISeriesApi<SeriesType>;
    case 'baseline':
      return chart.addSeries(BaselineSeries, {
        topLineColor: UP,
        topFillColor1: 'rgba(38, 166, 154, 0.28)',
        topFillColor2: 'rgba(38, 166, 154, 0.05)',
        bottomLineColor: DOWN,
        bottomFillColor1: 'rgba(239, 83, 80, 0.05)',
        bottomFillColor2: 'rgba(239, 83, 80, 0.28)',
      }) as ISeriesApi<SeriesType>;
    case 'candlestick':
    case 'heikin-ashi':
    default:
      return chart.addSeries(CandlestickSeries, {
        upColor: UP,
        downColor: DOWN,
        borderUpColor: UP,
        borderDownColor: DOWN,
        wickUpColor: UP,
        wickDownColor: DOWN,
      }) as ISeriesApi<SeriesType>;
  }
}

function toSeriesData(candles: Candle[], type: ChartType): AnySeriesData[] {
  const src = type === 'heikin-ashi' ? toHeikinAshi(candles) : candles;
  if (type === 'line' || type === 'area' || type === 'baseline') {
    return src.map((c) => ({ time: c.time as UTCTimestamp, value: c.close }));
  }
  return src.map((c) => ({
    time: c.time as UTCTimestamp,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));
}

interface ChartPaneProps {
  paneIndex: number;
}

export function ChartPane({ paneIndex }: ChartPaneProps) {
  const pane = useLayoutStore((s) => s.panes[paneIndex]);
  const isActive = useLayoutStore((s) => s.activePane === paneIndex);
  const maximized = useLayoutStore((s) => s.maximized === paneIndex);
  const setActivePane = useLayoutStore((s) => s.setActivePane);
  const setPaneSymbol = useLayoutStore((s) => s.setPaneSymbol);
  const clearPane = useLayoutStore((s) => s.clearPane);
  const toggleMaximize = useLayoutStore((s) => s.toggleMaximize);

  const showGrid = useSettingsStore((s) => s.showGrid);
  const crosshair = useSettingsStore((s) => s.crosshair);

  const { symbol, resolution, chartType } = pane;
  const quote = useQuote(symbol || undefined);

  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const candlesRef = useRef<Candle[]>([]);

  const [status, setStatus] = useState<PaneStatus>('loading');
  const [freshness, setFreshness] = useState<Freshness>('loading');
  const [editing, setEditing] = useState(false);

  // 1) Create the chart once. Never recreate on re-render.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const chart = createChart(el, baseChartOptions(showGrid, crosshair === 'magnet'));
    chart.resize(el.clientWidth, el.clientHeight);
    chartRef.current = chart;

    const unobserve = observeResize(el, (w, h) => {
      if (w > 0 && h > 0) chart.resize(w, h);
    });

    return () => {
      unobserve();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Live-update chart options when display settings change.
  useEffect(() => {
    chartRef.current?.applyOptions(baseChartOptions(showGrid, crosshair === 'magnet'));
  }, [showGrid, crosshair]);

  // 3) (Re)create the series when the chart type changes, then re-render data.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current);
      seriesRef.current = null;
    }
    const series = createSeries(chart, chartType);
    seriesRef.current = series;
    if (candlesRef.current.length) {
      series.setData(toSeriesData(candlesRef.current, chartType));
      chart.timeScale().fitContent();
    }
  }, [chartType]);

  // 4) Load history when symbol / resolution change.
  useEffect(() => {
    if (!symbol) {
      candlesRef.current = [];
      seriesRef.current?.setData([]);
      setStatus('empty');
      setFreshness('loading');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    setFreshness('loading');
    (async () => {
      try {
        const result = await getHistory(symbol, resolution);
        if (cancelled) return;
        candlesRef.current = result.candles;
        setFreshness(result.freshness);
        if (seriesRef.current) {
          seriesRef.current.setData(toSeriesData(result.candles, chartType));
          chartRef.current?.timeScale().fitContent();
        }
        setStatus(result.candles.length ? 'ready' : 'notfound');
      } catch (err) {
        if (cancelled) return;
        setFreshness('error');
        setStatus(err instanceof Error && err.name === 'SymbolNotFoundError' ? 'notfound' : 'error');
      }
    })();
    return () => {
      cancelled = true;
    };
    // chartType handled by effect (3); excluded here to avoid double-fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, resolution]);

  const tone = changeTone(quote?.changePercent);
  const toneClass = tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-text-muted';

  return (
    <div
      onMouseDown={() => setActivePane(paneIndex)}
      className={`group relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-bg ${
        isActive ? 'ring-1 ring-inset ring-accent' : 'ring-1 ring-inset ring-border'
      }`}
    >
      {/* Header */}
      <div
        onDoubleClick={() => toggleMaximize(paneIndex)}
        className="flex h-7 shrink-0 items-center gap-2 border-b border-border bg-bg-panel px-2 select-none"
      >
        {editing ? (
          <div className="w-48">
            <SymbolSearch
              compact
              autoFocus
              placeholder="Symbol…"
              onSelect={(s) => {
                setPaneSymbol(paneIndex, s);
                setEditing(false);
              }}
              onClose={() => setEditing(false)}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="font-semibold text-text-bright hover:text-accent"
            title="Change symbol"
          >
            {symbol || '＋ Symbol'}
          </button>
        )}

        {!editing && quote && (
          <>
            <span className="font-mono text-text">{formatPrice(quote.price)}</span>
            <span className={`font-mono text-2xs ${toneClass}`}>{formatPercent(quote.changePercent)}</span>
          </>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-2xs text-text-muted">{resolution}</span>
          <span
            className={`oc-badge ${freshnessClasses(freshness)}`}
            title={freshnessTitle(freshness)}
          >
            {freshnessLabel(freshness)}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleMaximize(paneIndex);
            }}
            className="oc-btn h-5 w-5 opacity-0 group-hover:opacity-100"
            title={maximized ? 'Restore' : 'Maximize'}
          >
            {maximized ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearPane(paneIndex);
            }}
            className="oc-btn h-5 w-5 opacity-0 group-hover:opacity-100 hover:text-down"
            title="Clear pane"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Chart area */}
      <div className="relative min-h-0 flex-1">
        <div ref={wrapRef} className="absolute inset-0" />
        {status !== 'ready' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-text-muted">
            {status === 'loading' && 'Loading…'}
            {status === 'empty' && 'Search a symbol to load a chart'}
            {status === 'notfound' && `No data for "${symbol}"`}
            {status === 'error' && 'Failed to load — will retry'}
          </div>
        )}
      </div>
    </div>
  );
}
