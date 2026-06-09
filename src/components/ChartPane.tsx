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
  type MouseEventParams,
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
import { DrawingsPrimitive } from '../lib/drawingPrimitive';
import { IndicatorManager } from '../lib/indicatorManager';
import {
  drawingKey,
  newDrawingId,
  useDrawingStore,
  type Drawing,
  type DrawingPoint,
} from '../store/drawingStore';
import { INDICATOR_META, useIndicatorStore, type IndicatorConfig } from '../store/indicatorStore';
import { SymbolSearch } from './SymbolSearch';

const UP = '#26a69a';
const DOWN = '#ef5350';
const BLUE = '#2962ff';
const DRAW_COLOR = '#2962ff';

const DRAW_HINT: Record<string, string> = {
  trendline: 'Click two points · Esc to cancel',
  fib: 'Click two points · Esc to cancel',
  hline: 'Click to place horizontal line · Esc to cancel',
};

const QUICK_PICKS = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'SPY', 'BTC/USD'];

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

  const activeTool = useDrawingStore((s) => s.activeTool);
  const setTool = useDrawingStore((s) => s.setTool);
  const addDrawing = useDrawingStore((s) => s.addDrawing);
  const dkey = drawingKey(pane.id, symbol, resolution);
  const paneDrawings = useDrawingStore((s) => s.drawings[dkey]);
  const indicators = useIndicatorStore((s) => s.indicators[pane.id]);
  const removeIndicator = useIndicatorStore((s) => s.removeIndicator);

  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const candlesRef = useRef<Candle[]>([]);
  const drawingPrimitiveRef = useRef<DrawingsPrimitive | null>(null);
  const drawingsRef = useRef<Drawing[]>([]);
  const previewRef = useRef<Drawing | null>(null);
  const pendingStartRef = useRef<DrawingPoint | null>(null);
  const indicatorMgrRef = useRef<IndicatorManager | null>(null);
  const configsRef = useRef<IndicatorConfig[]>([]);

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
    indicatorMgrRef.current = new IndicatorManager(chart);

    const unobserve = observeResize(el, (w, h) => {
      if (w > 0 && h > 0) chart.resize(w, h);
    });

    return () => {
      unobserve();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      indicatorMgrRef.current = null;
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
    // Attach the (persistent) drawing primitive to the freshly created series.
    let primitive = drawingPrimitiveRef.current;
    if (!primitive) {
      primitive = new DrawingsPrimitive({
        getDrawings: () => drawingsRef.current,
        getPreview: () => previewRef.current,
      });
      drawingPrimitiveRef.current = primitive;
    }
    series.attachPrimitive(primitive);
    if (candlesRef.current.length) {
      series.setData(toSeriesData(candlesRef.current, chartType));
      chart.timeScale().fitContent();
    }
    // Re-add indicators after the new main series so overlays draw on top.
    indicatorMgrRef.current?.rebuild(configsRef.current);
    indicatorMgrRef.current?.updateData(configsRef.current, candlesRef.current);
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
        indicatorMgrRef.current?.updateData(configsRef.current, result.candles);
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

  // 5) Keep the drawing primitive's data in sync with the store + redraw.
  useEffect(() => {
    drawingsRef.current = paneDrawings ?? [];
    drawingPrimitiveRef.current?.requestUpdate();
  }, [paneDrawings]);

  // 6) Drawing interaction — capture clicks to place shapes when a tool is active.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || activeTool === 'cursor') return;
    const ts = chart.timeScale();

    const toPoint = (param: MouseEventParams): DrawingPoint | null => {
      const series = seriesRef.current;
      if (!series || !param.point) return null;
      const price = series.coordinateToPrice(param.point.y);
      const logical = param.logical ?? ts.coordinateToLogical(param.point.x);
      if (price == null || logical == null) return null;
      const time = typeof param.time === 'number' ? param.time : 0;
      return { time, logical: logical as number, price: price as number };
    };

    const onClick = (param: MouseEventParams) => {
      const pt = toPoint(param);
      if (!pt) return;
      if (activeTool === 'hline') {
        addDrawing(dkey, { id: newDrawingId(), type: 'hline', points: [pt], color: DRAW_COLOR });
        setTool('cursor');
        return;
      }
      if (!pendingStartRef.current) {
        pendingStartRef.current = pt;
      } else {
        const type = activeTool === 'fib' ? 'fib' : 'trendline';
        addDrawing(dkey, {
          id: newDrawingId(),
          type,
          points: [pendingStartRef.current, pt],
          color: DRAW_COLOR,
        });
        pendingStartRef.current = null;
        previewRef.current = null;
        setTool('cursor');
        drawingPrimitiveRef.current?.requestUpdate();
      }
    };

    const onMove = (param: MouseEventParams) => {
      if (!pendingStartRef.current) return;
      const pt = toPoint(param);
      if (!pt) return;
      const type = activeTool === 'fib' ? 'fib' : 'trendline';
      previewRef.current = { id: 'preview', type, points: [pendingStartRef.current, pt], color: DRAW_COLOR };
      drawingPrimitiveRef.current?.requestUpdate();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      pendingStartRef.current = null;
      previewRef.current = null;
      setTool('cursor');
      drawingPrimitiveRef.current?.requestUpdate();
    };

    chart.subscribeClick(onClick);
    chart.subscribeCrosshairMove(onMove);
    window.addEventListener('keydown', onKey);
    return () => {
      chart.unsubscribeClick(onClick);
      chart.unsubscribeCrosshairMove(onMove);
      window.removeEventListener('keydown', onKey);
      pendingStartRef.current = null;
      previewRef.current = null;
      drawingPrimitiveRef.current?.requestUpdate();
    };
  }, [activeTool, dkey, addDrawing, setTool]);

  // 7) Indicators — rebuild series when the config set changes, refill from candles.
  useEffect(() => {
    configsRef.current = indicators ?? [];
    indicatorMgrRef.current?.rebuild(configsRef.current);
    indicatorMgrRef.current?.updateData(configsRef.current, candlesRef.current);
  }, [indicators]);

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
          {symbol && (
            <span
              className={`oc-badge ${freshnessClasses(freshness)}`}
              title={freshnessTitle(freshness)}
            >
              {freshnessLabel(freshness)}
            </span>
          )}
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
        <div ref={wrapRef} className={`absolute inset-0 ${activeTool !== 'cursor' ? 'cursor-crosshair' : ''}`} />
        {activeTool !== 'cursor' && (
          <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded bg-bg-panel/90 px-2 py-0.5 text-2xs text-accent shadow">
            {DRAW_HINT[activeTool] ?? 'Drawing…'}
          </div>
        )}
        {symbol && indicators && indicators.length > 0 && (
          <div className="pointer-events-none absolute left-1 top-1 z-10 flex flex-col items-start gap-0.5">
            {indicators.map((c) => (
              <div
                key={c.id}
                className="group/ind pointer-events-auto flex items-center gap-1 rounded bg-bg-panel/80 px-1.5 py-0.5 text-2xs"
              >
                <span style={{ color: c.color }} className="font-medium">
                  {INDICATOR_META[c.type].label}
                  {c.period ? ` ${c.period}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => removeIndicator(pane.id, c.id)}
                  className="text-text-muted opacity-0 group-hover/ind:opacity-100 hover:text-down"
                  title="Remove indicator"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        {status === 'empty' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg px-4">
            <div className="text-center">
              <p className="text-sm font-medium text-text">Search a symbol</p>
              <p className="text-2xs text-text-muted">Assign any symbol to this chart</p>
            </div>
            <div className="w-56">
              <SymbolSearch placeholder="Search symbol…" onSelect={(s) => setPaneSymbol(paneIndex, s)} />
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {QUICK_PICKS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPaneSymbol(paneIndex, s)}
                  className="rounded border border-border px-2 py-0.5 text-2xs text-text-muted hover:border-accent hover:text-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {(status === 'loading' || status === 'notfound' || status === 'error') && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-text-muted">
            {status === 'loading' && 'Loading…'}
            {status === 'notfound' && `No data for "${symbol}"`}
            {status === 'error' && 'Failed to load — will retry'}
          </div>
        )}
      </div>
    </div>
  );
}
