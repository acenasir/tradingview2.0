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
import type { Drawing, DrawingPoint } from '../store/drawingStore';
import { formatPrice } from './format';

type Target = Parameters<IPrimitivePaneRenderer['draw']>[0];
type Ctx = CanvasRenderingContext2D;
type Conv = (value: number) => number | null;
interface Pt {
  x: number;
  y: number;
}

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const FIB_COLORS = ['#787b86', '#ef5350', '#ff9800', '#4caf50', '#26a69a', '#42a5f5', '#787b86'];
const HANDLE = '#2962ff';

/** A read-through source so the primitive always reflects the latest store state. */
export interface DrawingSource {
  getDrawings: () => Drawing[];
  getPreview: () => Drawing | null;
  getSelectedId: () => string | null;
}

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
      const { width, height } = scope.mediaSize;
      const toX: Conv = (logical) => ts.logicalToCoordinate(logical as Logical);
      const toY: Conv = (price) => series.priceToCoordinate(price);
      const selectedId = source.getSelectedId();
      for (const d of source.getDrawings()) drawDrawing(ctx, d, width, height, toX, toY, false, d.id === selectedId);
      const preview = source.getPreview();
      if (preview) drawDrawing(ctx, preview, width, height, toX, toY, true, false);
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

function handle(ctx: Ctx, x: number, y: number): void {
  ctx.save();
  ctx.setLineDash([]);
  ctx.fillStyle = '#0b0e15';
  ctx.strokeStyle = HANDLE;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
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

/** Screen positions of a drawing's anchor handles. */
function handlePoints(d: Drawing, width: number, toX: Conv, toY: Conv): Pt[] {
  if (d.type === 'hline') {
    const y = toY(d.points[0].price);
    return y == null ? [] : [{ x: width / 2, y }];
  }
  const pts: Pt[] = [];
  for (const p of d.points) {
    const x = toX(p.logical);
    const y = toY(p.price);
    if (x != null && y != null) pts.push({ x, y });
  }
  return pts;
}

/** Extend a→b to the chart edge for a ray. */
function rayEnd(a: Pt, b: Pt, width: number, height: number): Pt {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0) return { x: b.x, y: dy >= 0 ? height : 0 };
  const targetX = dx > 0 ? width : 0;
  const t = (targetX - a.x) / dx;
  return { x: targetX, y: a.y + dy * t };
}

function drawDrawing(
  ctx: Ctx,
  d: Drawing,
  width: number,
  height: number,
  toX: Conv,
  toY: Conv,
  preview: boolean,
  selected: boolean,
): void {
  ctx.save();
  ctx.lineWidth = selected ? 2 : 1.5;
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
    const a = sp(d.points[0], toX, toY);
    const b = sp(d.points[1], toX, toY);
    if (a && b) segment(ctx, a.x, a.y, b.x, b.y);
  } else if (d.type === 'ray' && d.points.length === 2) {
    const a = sp(d.points[0], toX, toY);
    const b = sp(d.points[1], toX, toY);
    if (a && b) {
      const end = rayEnd(a, b, width, height);
      segment(ctx, a.x, a.y, end.x, end.y);
    }
  } else if (d.type === 'rectangle' && d.points.length === 2) {
    const a = sp(d.points[0], toX, toY);
    const b = sp(d.points[1], toX, toY);
    if (a && b) {
      const x = Math.min(a.x, b.x);
      const y = Math.min(a.y, b.y);
      const w = Math.abs(b.x - a.x);
      const h = Math.abs(b.y - a.y);
      ctx.save();
      ctx.globalAlpha = preview ? 0.06 : 0.1;
      ctx.fillRect(x, y, w, h);
      ctx.restore();
      ctx.strokeRect(x, y, w, h);
    }
  } else if (d.type === 'text') {
    const a = sp(d.points[0], toX, toY);
    if (a) {
      const label = d.text ?? 'Text';
      ctx.save();
      ctx.font = '12px sans-serif';
      ctx.fillStyle = d.color;
      ctx.fillText(label, a.x + 6, a.y + 4);
      ctx.restore();
    }
  } else if (d.type === 'fib' && d.points.length === 2) {
    const a = sp(d.points[0], toX, toY);
    const b = sp(d.points[1], toX, toY);
    if (a && b) {
      const left = Math.min(a.x, b.x);
      const right = Math.max(a.x, b.x);
      FIB_LEVELS.forEach((lvl, i) => {
        const price = d.points[0].price + (d.points[1].price - d.points[0].price) * lvl;
        const y = toY(price);
        if (y == null) return;
        ctx.strokeStyle = FIB_COLORS[i] ?? d.color;
        ctx.globalAlpha = preview ? 0.6 : 1;
        segment(ctx, left, y, right, y);
        ctx.fillStyle = FIB_COLORS[i] ?? d.color;
        ctx.globalAlpha = 1;
        ctx.fillText(`${(lvl * 100).toFixed(1)}%  ${formatPrice(price)}`, left + 4, y - 2);
      });
      ctx.strokeStyle = d.color;
      ctx.globalAlpha = preview ? 0.4 : 0.6;
      segment(ctx, a.x, a.y, a.x, b.y);
      segment(ctx, b.x, a.y, b.x, b.y);
    }
  }

  if (selected && !preview) {
    for (const p of handlePoints(d, width, toX, toY)) handle(ctx, p.x, p.y);
  }
  ctx.restore();
}

function sp(p: DrawingPoint, toX: Conv, toY: Conv): Pt | null {
  const x = toX(p.logical);
  const y = toY(p.price);
  return x != null && y != null ? { x, y } : null;
}
