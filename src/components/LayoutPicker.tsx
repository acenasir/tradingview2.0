import { ChevronDown, LayoutGrid } from 'lucide-react';
import { LAYOUTS, layoutDef, type LayoutDef } from '../lib/layouts';
import { useLayoutStore } from '../store/layoutStore';
import { Menu } from './ui/Menu';

/** Mini diagram of a layout preset rendered with CSS grid. */
function LayoutGlyph({ def, className = '' }: { def: LayoutDef; className?: string }) {
  return (
    <div
      className={`grid gap-px ${className}`}
      style={{
        gridTemplateColumns: `repeat(${def.cols}, 1fr)`,
        gridTemplateRows: `repeat(${def.rows}, 1fr)`,
      }}
    >
      {Array.from({ length: def.panes }, (_, i) => (
        <div key={i} className="rounded-[1px] bg-current" />
      ))}
    </div>
  );
}

export function LayoutPicker() {
  const preset = useLayoutStore((s) => s.preset);
  const setPreset = useLayoutStore((s) => s.setPreset);
  const current = layoutDef(preset);

  return (
    <Menu
      align="right"
      button={({ open }) => (
        <button
          type="button"
          className={`oc-btn h-7 gap-1 px-2 ${open ? 'oc-btn-active' : ''}`}
          title="Layout"
        >
          <LayoutGrid className="h-4 w-4" />
          <span className="text-xs">{current.label}</span>
          <ChevronDown className="h-3 w-3" />
        </button>
      )}
    >
      {({ close }) => (
        <div className="grid w-44 grid-cols-3 gap-1.5 p-2">
          {LAYOUTS.map((l) => {
            const active = l.preset === preset;
            return (
              <button
                key={l.preset}
                type="button"
                onClick={() => {
                  setPreset(l.preset);
                  close();
                }}
                title={`${l.panes} chart${l.panes > 1 ? 's' : ''} · ${l.shortcut}`}
                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded border p-1.5 transition-colors ${
                  active
                    ? 'border-accent text-accent'
                    : 'border-border text-text-muted hover:border-border-strong hover:text-text'
                }`}
              >
                <LayoutGlyph def={l} className="h-7 w-7" />
                <span className="text-2xs">{l.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </Menu>
  );
}
