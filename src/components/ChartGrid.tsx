import { layoutDef } from '../lib/layouts';
import { useLayoutStore } from '../store/layoutStore';
import { ChartPane } from './ChartPane';

/**
 * The multi-chart grid. Only the panes visible in the current preset are
 * mounted (lazy-mount), and each pane keeps a stable key by index so switching
 * presets never tears down / recreates the charts that remain on screen.
 */
export function ChartGrid() {
  const preset = useLayoutStore((s) => s.preset);
  const maximized = useLayoutStore((s) => s.maximized);
  const def = layoutDef(preset);

  if (maximized !== null && maximized < def.panes) {
    return (
      <div className="h-full w-full bg-border p-px">
        <ChartPane paneIndex={maximized} />
      </div>
    );
  }

  return (
    <div
      className="grid h-full w-full gap-px bg-border p-px"
      style={{
        gridTemplateColumns: `repeat(${def.cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${def.rows}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: def.panes }, (_, i) => (
        <ChartPane key={i} paneIndex={i} />
      ))}
    </div>
  );
}
