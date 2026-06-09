import {
  HistogramSeries,
  LineSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type SeriesPartialOptionsMap,
  type SeriesType,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Candle } from '../data/providers/types';
import { bollinger, ema, macd, rsi, sma, vwap } from '../indicators';
import { INDICATOR_META, type IndicatorConfig } from '../store/indicatorStore';

const UP = '#26a69a';
const DOWN = '#ef5350';

interface Entry {
  series: ISeriesApi<SeriesType>[];
}

/**
 * Owns the chart series used to render a pane's indicators. Structure changes
 * (add/remove an indicator) rebuild the series set; frequent candle updates only
 * call setData. Overlays + volume live on the price pane; RSI/MACD get sub-panes.
 */
export class IndicatorManager {
  private entries = new Map<string, Entry>();

  constructor(private readonly chart: IChartApi) {}

  private addLine(options: SeriesPartialOptionsMap['Line'], paneIndex: number): ISeriesApi<SeriesType> {
    return this.chart.addSeries(LineSeries, options, paneIndex) as ISeriesApi<SeriesType>;
  }
  private addHistogram(options: SeriesPartialOptionsMap['Histogram'], paneIndex: number): ISeriesApi<SeriesType> {
    return this.chart.addSeries(HistogramSeries, options, paneIndex) as ISeriesApi<SeriesType>;
  }

  /** Tear down and recreate all indicator series for the given configs. */
  rebuild(configs: IndicatorConfig[]): void {
    this.removeAll();

    let subPane = 0;
    for (const cfg of configs) {
      const meta = INDICATOR_META[cfg.type];
      const color = cfg.color ?? meta.defaultColor;
      try {
        if (cfg.type === 'volume') {
          const s = this.addHistogram(
            { priceScaleId: 'oc-vol', priceFormat: { type: 'volume' }, lastValueVisible: false, priceLineVisible: false },
            0,
          );
          this.chart.priceScale('oc-vol', 0).applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
          this.entries.set(cfg.id, { series: [s] });
        } else if (meta.overlay) {
          // sma / ema / vwap → 1 line; bollinger → 3 lines (all on the price pane)
          const lines = cfg.type === 'bollinger' ? 3 : 1;
          const series: ISeriesApi<SeriesType>[] = [];
          for (let i = 0; i < lines; i++) {
            series.push(
              this.addLine(
                { color, lineWidth: i === 0 ? 2 : 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false },
                0,
              ),
            );
          }
          this.entries.set(cfg.id, { series });
        } else {
          // rsi / macd → dedicated sub-pane
          subPane += 1;
          const paneIndex = subPane;
          this.ensurePane(paneIndex);
          if (cfg.type === 'rsi') {
            const s = this.addLine({ color, lineWidth: 2, priceLineVisible: false }, paneIndex);
            s.createPriceLine({ price: 70, color: '#787b86', lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: true });
            s.createPriceLine({ price: 30, color: '#787b86', lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: true });
            this.entries.set(cfg.id, { series: [s] });
          } else {
            // macd: macd line, signal line, histogram
            const macdLine = this.addLine({ color: '#2962ff', lineWidth: 2, priceLineVisible: false }, paneIndex);
            const signalLine = this.addLine({ color: '#ff6d00', lineWidth: 1, priceLineVisible: false }, paneIndex);
            const hist = this.addHistogram({ priceLineVisible: false, lastValueVisible: false }, paneIndex);
            this.entries.set(cfg.id, { series: [macdLine, signalLine, hist] });
          }
          try {
            this.chart.panes()[paneIndex]?.setHeight(120);
          } catch {
            /* height is best-effort */
          }
        }
      } catch {
        /* a failed indicator must never break the chart */
      }
    }
  }

  /** Recompute and push data into the existing series (cheap; called per update). */
  updateData(configs: IndicatorConfig[], candles: Candle[]): void {
    if (!candles.length) return;
    const times = candles.map((c) => c.time as UTCTimestamp);
    const closes = candles.map((c) => c.close);

    for (const cfg of configs) {
      const entry = this.entries.get(cfg.id);
      if (!entry) continue;
      const period = cfg.period ?? INDICATOR_META[cfg.type].defaultPeriod ?? 20;
      try {
        switch (cfg.type) {
          case 'sma':
            entry.series[0].setData(toLine(times, sma(closes, period)));
            break;
          case 'ema':
            entry.series[0].setData(toLine(times, ema(closes, period)));
            break;
          case 'vwap':
            entry.series[0].setData(toLine(times, vwap(candles)));
            break;
          case 'bollinger': {
            const b = bollinger(closes, period, 2);
            entry.series[0].setData(toLine(times, b.middle));
            entry.series[1].setData(toLine(times, b.upper));
            entry.series[2].setData(toLine(times, b.lower));
            break;
          }
          case 'rsi':
            entry.series[0].setData(toLine(times, rsi(closes, period)));
            break;
          case 'macd': {
            const m = macd(closes);
            entry.series[0].setData(toLine(times, m.macd));
            entry.series[1].setData(toLine(times, m.signal));
            entry.series[2].setData(
              times
                .map((t, i) => ({ time: t, value: m.histogram[i], color: (m.histogram[i] ?? 0) >= 0 ? UP : DOWN }))
                .filter((p): p is { time: UTCTimestamp; value: number; color: string } => p.value != null),
            );
            break;
          }
          case 'volume':
            entry.series[0].setData(
              candles.map((c) => ({
                time: c.time as UTCTimestamp,
                value: c.volume ?? 0,
                color: c.close >= c.open ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)',
              })),
            );
            break;
        }
      } catch {
        /* ignore a single indicator's update failure */
      }
    }
  }

  private ensurePane(index: number): void {
    while (this.chart.panes().length <= index) this.chart.addPane();
  }

  private removeAll(): void {
    for (const entry of this.entries.values()) {
      for (const s of entry.series) {
        try {
          this.chart.removeSeries(s);
        } catch {
          /* already gone */
        }
      }
    }
    this.entries.clear();
    // Drop now-empty sub-panes (keep the price pane at index 0).
    try {
      for (let i = this.chart.panes().length - 1; i >= 1; i--) this.chart.removePane(i);
    } catch {
      /* best-effort */
    }
  }
}

function toLine(times: UTCTimestamp[], values: (number | null)[]): LineData[] {
  const out: LineData[] = [];
  for (let i = 0; i < times.length; i++) {
    const v = values[i];
    if (v != null) out.push({ time: times[i], value: v });
  }
  return out;
}
