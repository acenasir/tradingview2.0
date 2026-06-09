import {
  Eraser,
  Minus,
  MousePointer2,
  PencilRuler,
  Slash,
  Square,
  TrendingUp,
  Type,
} from 'lucide-react';
import { useState } from 'react';

/**
 * Left drawing toolbar. The drawing engine (overlay via Lightweight Charts
 * primitives) lands in a later step; for now the cursor is active and the rest
 * are placeholders so the workspace structure matches TradingView.
 */
const TOOLS = [
  { id: 'cursor', icon: MousePointer2, label: 'Cursor', ready: true },
  { id: 'trend', icon: TrendingUp, label: 'Trend line (soon)', ready: false },
  { id: 'hline', icon: Minus, label: 'Horizontal line (soon)', ready: false },
  { id: 'ray', icon: Slash, label: 'Ray (soon)', ready: false },
  { id: 'rect', icon: Square, label: 'Rectangle (soon)', ready: false },
  { id: 'fib', icon: PencilRuler, label: 'Fib retracement (soon)', ready: false },
  { id: 'text', icon: Type, label: 'Text (soon)', ready: false },
  { id: 'erase', icon: Eraser, label: 'Clear drawings (soon)', ready: false },
] as const;

export function LeftToolbar() {
  const [active, setActive] = useState('cursor');

  return (
    <div className="flex w-10 shrink-0 flex-col items-center gap-1 border-r border-border bg-bg-panel py-2">
      {TOOLS.map(({ id, icon: Icon, label, ready }) => (
        <button
          key={id}
          type="button"
          title={label}
          disabled={!ready}
          onClick={() => ready && setActive(id)}
          className={`oc-btn h-8 w-8 ${active === id ? 'oc-btn-active' : ''} ${
            ready ? '' : 'cursor-not-allowed opacity-40'
          }`}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
