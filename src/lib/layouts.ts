/** Multi-chart grid layout presets. */

export type LayoutPreset = '1' | '2v' | '2h' | '3' | '4' | '6' | '8' | '9' | '16';

export interface LayoutDef {
  preset: LayoutPreset;
  /** Number of visible panes. */
  panes: number;
  cols: number;
  rows: number;
  /** Short label for the picker. */
  label: string;
  /** Keyboard shortcut key (1–9, then 'g' for 16). */
  shortcut: string;
}

export const LAYOUTS: LayoutDef[] = [
  { preset: '1', panes: 1, cols: 1, rows: 1, label: '1', shortcut: '1' },
  { preset: '2v', panes: 2, cols: 2, rows: 1, label: '2 ┃', shortcut: '2' },
  { preset: '2h', panes: 2, cols: 1, rows: 2, label: '2 ━', shortcut: '3' },
  { preset: '3', panes: 3, cols: 3, rows: 1, label: '3', shortcut: '4' },
  { preset: '4', panes: 4, cols: 2, rows: 2, label: '4', shortcut: '5' },
  { preset: '6', panes: 6, cols: 3, rows: 2, label: '6', shortcut: '6' },
  { preset: '8', panes: 8, cols: 4, rows: 2, label: '8', shortcut: '7' },
  { preset: '9', panes: 9, cols: 3, rows: 3, label: '9', shortcut: '8' },
  { preset: '16', panes: 16, cols: 4, rows: 4, label: '16', shortcut: 'g' },
];

export const LAYOUT_BY_PRESET = new Map(LAYOUTS.map((l) => [l.preset, l]));

export const MAX_PANES = 16;

export function layoutDef(preset: LayoutPreset): LayoutDef {
  return LAYOUT_BY_PRESET.get(preset) ?? LAYOUTS[0];
}

export function paneCount(preset: LayoutPreset): number {
  return layoutDef(preset).panes;
}
