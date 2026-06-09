import type {
  IChartApiBase,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesApi,
  ISeriesPrimitive,
  Logical,
  SeriesAttachedParameter,
  SeriesType,
  Time,
} from 'lightweight-charts';
import type { Drawing } from '../store/drawingStore';
import { formatPrice } from './format';

type Target = Parameters<IPrimitivePaneRenderer['draw']>[0];
type Ctx = CanvasRenderingContext2D;
type Conv = (value: number) => number | null;

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const FIB_COLORS = ['#787b86', '#ef5350', '#ff9800', '#4caf50', '#26a69a', '#42a5f5', '#787b86'];

/** A read-through source so the primitive always reflects the latest store state. */
export interface DrawingSource {
  getDrawings: () => Drawing[];
  getPreview: () => Drawing | null;
}

/**
 * A single Lightweight-Charts series primitive that renders all of a pane's
 * drawings (plus the in-progress preview) into the chart's own coordinate
 * space. x positions come from `logicalToCoordinate`, which stays correct as
 * the user pans/zooms — even when an anchor scrolls off-screen.
 */
export class DrawingsPrimitive implements ISeriesPrimitive<Time> {
  chart?: IChartApiBase<Time>;
  series?: ISeriesApi<SeriesType, Time>;
  private _requestUpdate?: () => void;
  private readonly _views: IPrimitivePaneView[];

  constructor(public readonly source: DrawingSource) {
    this._views = [new DrawingsPaneView(this)];
  }

  attached(param: SeriesAttachedParameter<Time>): void {
    this.chart = param.chart;
    this.series = param.series;
    this._requestUpdate = param.requestUpdate;
  }
  detached(): void {
    this.chart = undefined;
    this.series = undefined;
    this._requestUpdate = undefined;
  }
  updateAllViews(): void {}
  paneViews(): readonly IPrimitivePaneView[] {
    return this._views;
  }
  /** Trigger a redraw (call when drawings / preview change). */
  requestUpdate(): void {
    this._requestUpdate?.();
  }
}

class DrawingsPaneView implements IPrimitivePaneView {
  constructor(private readonly primitive: DrawingsPrimitive) {}
  zOrder(): 'top' {
    return 'top';
  }
  renderer(): IPrimitivePaneRenderer {
    return new DrawingsRenderer(this.primitive);
  }
}

class DrawingsRenderer implements IPrimitivePaneRenderer {
  constructor(private readonly primitive: DrawingsPrimitive) {}
  draw(target: Target): void {
    const { chart, series, source } = this.primitive;
    if (!chart || !series) return;
    const ts = chart.timeScale();
    target.useMediaCoordinateSpace((scope) => {
      const ctx = scope.context;
      const width = scope.mediaSize.width;
      const toX: Conv = (logical) => ts.logicalToCoordinate(logical as Logical);
      const toY: Conv = (price) => series.priceToCoordinate(price);
      for (const d of source.getDrawings()) drawDrawing(ctx, d, width, toX, toY, false);
      const preview = source.getPreview();
      if (preview) drawDrawing(ctx, preview, width, toX, toY, true);
    });
  }
}

/* ── canvas helpers (media/CSS pixel coordinates) ───────────────────────────── */

function segment(ctx: Ctx, x1: number, y1: number, x2: number, y2: number): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function handle(ctx: Ctx, x: number, y: number, color: string): void {
  ctx.save();
  ctx.setLineDash([]);
  ctx.fillStyle = '#0b0e15';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function priceTag(ctx: Ctx, right: number, y: number, price: number, color: string): void {
  const text = formatPrice(price);
  ctx.save();
  ctx.setLineDash([]);
  ctx.font = '10px sans-serif';
  const w = ctx.measureText(text).width + 8;
  ctx.fillStyle = color;
  ctx.fillRect(right - w - 1, y - 7, w, 14);
  ctx.fillStyle = '#0b0e15';
  ctx.fillText(text, right - w + 3, y + 3);
  ctx.restore();
}

function drawDrawing(ctx: Ctx, d: Drawing, width: number, toX: Conv, toY: Conv, preview: boolean): void {
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = d.color;
  ctx.fillStyle = d.color;
  ctx.font = '10px sans-serif';
  if (preview) ctx.setLineDash([4, 4]);

  if (d.type === 'hline') {
    const y = toY(d.points[0].price);
    if (y != null) {
      segment(ctx, 0, y, width, y);
      if (!preview) priceTag(ctx, width, y, d.points[0].price, d.color);
    }
  } else if (d.type === 'trendline' && d.points.length === 2) {
    const [a, b] = d.points;
    const ax = toX(a.logical);
    const ay = toY(a.price);
    const bx = toX(b.logical);
    const by = toY(b.price);
    if (ax != null && ay != null && bx != null && by != null) {
      segment(ctx, ax, ay, bx, by);
      if (!preview) {
        handle(ctx, ax, ay, d.color);
        handle(ctx, bx, by, d.color);
      }
    }
  } else if (d.type === 'fib' && d.points.length === 2) {
    const [a, b] = d.points;
    const ax = toX(a.logical);
    const bx = toX(b.logical);
    const ay = toY(a.price);
    const by = toY(b.price);
    if (ax != null && bx != null && ay != null && by != null) {
      const left = Math.min(ax, bx);
      const right = Math.max(ax, bx);
      FIB_LEVELS.forEach((lvl, i) => {
        const price = a.price + (b.price - a.price) * lvl;
        const y = toY(price);
        if (y == null) return;
        ctx.strokeStyle = FIB_COLORS[i] ?? d.color;
        ctx.globalAlpha = preview ? 0.6 : 1;
        segment(ctx, left, y, right, y);
        ctx.fillStyle = FIB_COLORS[i] ?? d.color;
        ctx.globalAlpha = 1;
        ctx.fillText(`${(lvl * 100).toFixed(1)}%  ${formatPrice(price)}`, left + 4, y - 2);
      });
      // vertical anchors
      ctx.strokeStyle = d.color;
      ctx.globalAlpha = preview ? 0.4 : 0.6;
      segment(ctx, ax, ay, ax, by);
      segment(ctx, bx, ay, bx, by);
    }
  }
  ctx.restore();
}
