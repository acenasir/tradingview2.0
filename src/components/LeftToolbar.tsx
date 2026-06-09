import {
  AlignJustify,
  Eraser,
  Minus,
  MousePointer2,
  Slash,
  Square,
  TrendingUp,
  Type,
  type LucideIcon,
} from 'lucide-react';
import { drawingKey, useDrawingStore, type DrawingTool } from '../store/drawingStore';
import { useLayoutStore } from '../store/layoutStore';

/**
 * Left drawing toolbar. Trend line, horizontal line and Fibonacci retracement
 * are live (drawn directly on the chart and persisted per pane/symbol/timeframe);
 * ray/rectangle/text are stubbed for a later step.
 */
const TOOLS: { id: DrawingTool; icon: LucideIcon; label: string; ready: boolean }[] = [
  { id: 'cursor', icon: MousePointer2, label: 'Cursor — select / move / delete drawings', ready: true },
  { id: 'trendline', icon: TrendingUp, label: 'Trend line', ready: true },
  { id: 'ray', icon: Slash, label: 'Ray', ready: true },
  { id: 'hline', icon: Minus, label: 'Horizontal line', ready: true },
  { id: 'rectangle', icon: Square, label: 'Rectangle', ready: true },
  { id: 'fib', icon: AlignJustify, label: 'Fibonacci retracement', ready: true },
  { id: 'text', icon: Type, label: 'Text', ready: true },
];

export function LeftToolbar() {
  const activeTool = useDrawingStore((s) => s.activeTool);
  const setTool = useDrawingStore((s) => s.setTool);
  const clearKey = useDrawingStore((s) => s.clearKey);
  const activePane = useLayoutStore((s) => s.panes[s.activePane]);

  return (
    <div className="flex w-10 shrink-0 flex-col items-center gap-1 border-r border-border bg-bg-panel py-2">
      {TOOLS.map(({ id, icon: Icon, label, ready }) => (
        <button
          key={id}
          type="button"
          title={label}
          disabled={!ready}
          onClick={() => ready && setTool(id)}
          className={`oc-btn h-8 w-8 ${activeTool === id ? 'oc-btn-active' : ''} ${
            ready ? '' : 'cursor-not-allowed opacity-40'
          }`}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}

      <div className="my-1 h-px w-5 bg-border" />

      <button
        type="button"
        title="Clear drawings on the active pane"
        onClick={() => {
          if (activePane) clearKey(drawingKey(activePane.id, activePane.symbol, activePane.resolution));
        }}
        className="oc-btn h-8 w-8 hover:text-down"
      >
        <Eraser className="h-4 w-4" />
      </button>
    </div>
  );
}
