import {
  Activity,
  AreaChart,
  BarChart3,
  CandlestickChart,
  ChevronDown,
  LineChart,
  Settings,
  Sigma,
  X,
} from 'lucide-react';
import type { ChartType } from '../data/providers/types';
import { RESOLUTIONS } from '../lib/resolutions';
import { INDICATOR_META, INDICATOR_ORDER, useIndicatorStore } from '../store/indicatorStore';
import { useLayoutStore } from '../store/layoutStore';
import { useSettingsStore } from '../store/settingsStore';
import { DataModeToggle } from './DataModeToggle';
import { LayoutPicker } from './LayoutPicker';
import { SymbolSearch } from './SymbolSearch';
import { Menu } from './ui/Menu';

const CHART_TYPES: { type: ChartType; label: string; icon: typeof LineChart }[] = [
  { type: 'candlestick', label: 'Candlestick', icon: CandlestickChart },
  { type: 'heikin-ashi', label: 'Heikin-Ashi', icon: CandlestickChart },
  { type: 'bar', label: 'Bar', icon: BarChart3 },
  { type: 'line', label: 'Line', icon: LineChart },
  { type: 'area', label: 'Area', icon: AreaChart },
  { type: 'baseline', label: 'Baseline', icon: Activity },
];

export function TopToolbar() {
  const activePane = useLayoutStore((s) => s.activePane);
  const pane = useLayoutStore((s) => s.panes[activePane]);
  const setPaneSymbol = useLayoutStore((s) => s.setPaneSymbol);
  const setPaneResolution = useLayoutStore((s) => s.setPaneResolution);
  const setPaneChartType = useLayoutStore((s) => s.setPaneChartType);

  const activeChart = CHART_TYPES.find((c) => c.type === pane.chartType) ?? CHART_TYPES[0];

  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-bg-panel px-2">
      <div className="flex items-center gap-1.5 pr-1 font-semibold text-text-bright">
        <CandlestickChart className="h-5 w-5 text-accent" />
        <span className="hidden sm:inline">OpenChart</span>
      </div>

      <div className="h-5 w-px bg-border" />

      {/* Global symbol search → loads the active pane */}
      <SymbolSearch
        inputId="global-symbol-search"
        className="w-56"
        placeholder="Search symbol (press /)"
        onSelect={(s) => setPaneSymbol(activePane, s)}
      />

      <div className="h-5 w-px bg-border" />

      {/* Timeframes (apply to active pane) */}
      <div className="flex items-center gap-0.5">
        {RESOLUTIONS.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setPaneResolution(activePane, r.value)}
            className={`oc-btn h-7 min-w-7 px-1.5 text-xs ${
              pane.resolution === r.value ? 'oc-btn-active' : ''
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="h-5 w-px bg-border" />

      {/* Chart type */}
      <Menu
        button={({ open }) => (
          <button type="button" className={`oc-btn h-7 gap-1 px-2 ${open ? 'oc-btn-active' : ''}`}>
            <activeChart.icon className="h-4 w-4" />
            <ChevronDown className="h-3 w-3" />
          </button>
        )}
      >
        {({ close }) => (
          <div className="w-44">
            {CHART_TYPES.map((c) => (
              <button
                key={c.type}
                type="button"
                onClick={() => {
                  setPaneChartType(activePane, c.type);
                  close();
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-bg-elevated ${
                  pane.chartType === c.type ? 'text-accent' : 'text-text'
                }`}
              >
                <c.icon className="h-4 w-4" />
                {c.label}
              </button>
            ))}
          </div>
        )}
      </Menu>

      {/* Indicators (apply to active pane) */}
      <IndicatorsMenu paneId={pane.id} />

      <div className="ml-auto flex items-center gap-2">
        <DataModeToggle />
        <LayoutPicker />
        <SettingsMenu />
      </div>
    </div>
  );
}

function IndicatorsMenu({ paneId }: { paneId: string }) {
  const indicators = useIndicatorStore((s) => s.indicators[paneId]) ?? [];
  const add = useIndicatorStore((s) => s.addIndicator);
  const remove = useIndicatorStore((s) => s.removeIndicator);
  const update = useIndicatorStore((s) => s.updateIndicator);

  return (
    <Menu
      button={({ open }) => (
        <button type="button" className={`oc-btn h-7 gap-1 px-2 text-xs ${open ? 'oc-btn-active' : ''}`}>
          <Sigma className="h-4 w-4" />
          <span className="hidden md:inline">Indicators</span>
          {indicators.length > 0 && <span className="text-accent">{indicators.length}</span>}
          <ChevronDown className="h-3 w-3" />
        </button>
      )}
    >
      {() => (
        <div className="w-64">
          <div className="px-3 py-1 text-2xs uppercase tracking-wide text-text-muted">Add to active chart</div>
          <div className="grid grid-cols-2 gap-1 px-2 pb-2">
            {INDICATOR_ORDER.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => add(paneId, type)}
                className="rounded border border-border px-2 py-1 text-left text-xs text-text hover:border-accent hover:text-accent"
              >
                {INDICATOR_META[type].label}
              </button>
            ))}
          </div>

          {indicators.length > 0 && (
            <>
              <div className="border-t border-border px-3 py-1 text-2xs uppercase tracking-wide text-text-muted">
                On this chart
              </div>
              <div className="max-h-48 space-y-1 overflow-y-auto px-2 pb-2">
                {indicators.map((c) => (
                  <div key={c.id} className="flex items-center gap-1.5 rounded bg-bg-elevated px-2 py-1">
                    <input
                      type="color"
                      value={c.color ?? INDICATOR_META[c.type].defaultColor}
                      onChange={(e) => update(paneId, c.id, { color: e.target.value })}
                      className="h-4 w-4 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                      title="Color"
                    />
                    <span className="flex-1 truncate text-xs text-text">{INDICATOR_META[c.type].label}</span>
                    {INDICATOR_META[c.type].hasPeriod && (
                      <input
                        type="number"
                        min={1}
                        value={c.period ?? ''}
                        onChange={(e) => update(paneId, c.id, { period: Number(e.target.value) || 1 })}
                        className="h-6 w-12 rounded border border-border bg-bg-input px-1 text-right text-xs text-text-bright focus:border-accent focus:outline-none"
                        title="Period"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => remove(paneId, c.id)}
                      className="oc-btn h-5 w-5 hover:text-down"
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </Menu>
  );
}

function SettingsMenu() {
  const pollIntervalMs = useSettingsStore((s) => s.pollIntervalMs);
  const setPollIntervalMs = useSettingsStore((s) => s.setPollIntervalMs);
  const showGrid = useSettingsStore((s) => s.showGrid);
  const setShowGrid = useSettingsStore((s) => s.setShowGrid);
  const crosshair = useSettingsStore((s) => s.crosshair);
  const setCrosshair = useSettingsStore((s) => s.setCrosshair);
  const timezone = useSettingsStore((s) => s.timezone);
  const setTimezone = useSettingsStore((s) => s.setTimezone);

  return (
    <Menu
      align="right"
      button={({ open }) => (
        <button type="button" className={`oc-btn h-7 w-7 ${open ? 'oc-btn-active' : ''}`} title="Settings">
          <Settings className="h-4 w-4" />
        </button>
      )}
    >
      {() => (
        <div className="w-60 space-y-3 p-3 text-sm">
          <label className="flex items-center justify-between gap-2">
            <span className="text-text-muted">Poll interval</span>
            <span className="flex items-center gap-1">
              <input
                type="number"
                min={3}
                max={120}
                value={Math.round(pollIntervalMs / 1000)}
                onChange={(e) => setPollIntervalMs(Number(e.target.value) * 1000)}
                className="h-7 w-16 rounded border border-border bg-bg-input px-2 text-right text-text-bright focus:border-accent focus:outline-none"
              />
              <span className="text-text-muted">s</span>
            </span>
          </label>

          <label className="flex items-center justify-between gap-2">
            <span className="text-text-muted">Grid lines</span>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
          </label>

          <label className="flex items-center justify-between gap-2">
            <span className="text-text-muted">Crosshair magnet</span>
            <input
              type="checkbox"
              checked={crosshair === 'magnet'}
              onChange={(e) => setCrosshair(e.target.checked ? 'magnet' : 'normal')}
              className="h-4 w-4 accent-accent"
            />
          </label>

          <label className="flex items-center justify-between gap-2">
            <span className="text-text-muted">Time zone</span>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="h-7 rounded border border-border bg-bg-input px-1 text-text-bright focus:border-accent focus:outline-none"
            >
              <option value="">Local</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">New York</option>
              <option value="Europe/London">London</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </label>
        </div>
      )}
    </Menu>
  );
}
