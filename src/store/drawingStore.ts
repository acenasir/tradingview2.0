import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DrawingTool = 'cursor' | 'trendline' | 'hline' | 'fib' | 'ray' | 'rectangle' | 'text';

export type DrawingType = 'trendline' | 'hline' | 'fib' | 'ray' | 'rectangle' | 'text';

export interface DrawingPoint {
  /** Unix seconds — kept for reference/persistence. */
  time: number;
  /** Logical bar index — drives the x coordinate (stable off-screen via
   *  logicalToCoordinate). */
  logical: number;
  price: number;
}

export interface Drawing {
  id: string;
  type: DrawingType;
  points: DrawingPoint[];
  color: string;
  /** Label for the `text` type. */
  text?: string;
}

interface DrawingState {
  /** Currently selected tool (global; applied to whichever pane you click). */
  activeTool: DrawingTool;
  /** Drawings keyed by `paneId:symbol:resolution` so they render coordinate-
   *  stable within the data context they were drawn in. */
  drawings: Record<string, Drawing[]>;

  setTool: (tool: DrawingTool) => void;
  addDrawing: (key: string, drawing: Drawing) => void;
  updateDrawing: (key: string, id: string, patch: Partial<Drawing>) => void;
  removeDrawing: (key: string, id: string) => void;
  clearKey: (key: string) => void;
}

/** Build the per-context storage key. */
export function drawingKey(paneId: string, symbol: string, resolution: string): string {
  return `${paneId}:${symbol}:${resolution}`;
}

export function newDrawingId(): string {
  return `dw-${Math.random().toString(36).slice(2, 9)}`;
}

export const useDrawingStore = create<DrawingState>()(
  persist(
    (set) => ({
      activeTool: 'cursor',
      drawings: {},

      setTool: (tool) => set({ activeTool: tool }),

      addDrawing: (key, drawing) =>
        set((s) => ({ drawings: { ...s.drawings, [key]: [...(s.drawings[key] ?? []), drawing] } })),

      updateDrawing: (key, id, patch) =>
        set((s) => ({
          drawings: {
            ...s.drawings,
            [key]: (s.drawings[key] ?? []).map((d) => (d.id === id ? { ...d, ...patch } : d)),
          },
        })),

      removeDrawing: (key, id) =>
        set((s) => ({
          drawings: { ...s.drawings, [key]: (s.drawings[key] ?? []).filter((d) => d.id !== id) },
        })),

      clearKey: (key) => set((s) => ({ drawings: { ...s.drawings, [key]: [] } })),
    }),
    {
      name: 'openchart.drawings',
      version: 1,
      // Persist only the drawings; the active tool is transient session state.
      partialize: (s) => ({ drawings: s.drawings }),
    },
  ),
);
