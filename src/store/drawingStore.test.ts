import { beforeEach, describe, expect, it } from 'vitest';
import { drawingKey, newDrawingId, useDrawingStore, type Drawing } from './drawingStore';

const hline = (id: string): Drawing => ({
  id,
  type: 'hline',
  points: [{ time: 0, logical: 1, price: 100 }],
  color: '#2962ff',
});

describe('drawingStore', () => {
  beforeEach(() => useDrawingStore.setState({ activeTool: 'cursor', drawings: {} }));

  it('builds a stable per-context key', () => {
    expect(drawingKey('pane-1', 'AAPL', '1D')).toBe('pane-1:AAPL:1D');
  });

  it('adds, removes, and clears drawings per key', () => {
    const k = drawingKey('p', 'AAPL', '1D');
    const { addDrawing, removeDrawing, clearKey } = useDrawingStore.getState();

    addDrawing(k, hline('a'));
    addDrawing(k, hline('b'));
    expect(useDrawingStore.getState().drawings[k]).toHaveLength(2);

    removeDrawing(k, 'a');
    expect(useDrawingStore.getState().drawings[k].map((d) => d.id)).toEqual(['b']);

    clearKey(k);
    expect(useDrawingStore.getState().drawings[k]).toEqual([]);
  });

  it('updates a drawing in place', () => {
    const k = drawingKey('p', 'AAPL', '1D');
    const { addDrawing, updateDrawing } = useDrawingStore.getState();
    addDrawing(k, hline('a'));
    updateDrawing(k, 'a', { points: [{ time: 1, logical: 9, price: 250 }] });
    expect(useDrawingStore.getState().drawings[k][0].points[0].price).toBe(250);
  });

  it('keeps drawings on separate keys isolated', () => {
    const { addDrawing } = useDrawingStore.getState();
    addDrawing(drawingKey('p', 'AAPL', '1D'), hline('a'));
    addDrawing(drawingKey('p', 'MSFT', '1D'), hline('b'));
    const { drawings } = useDrawingStore.getState();
    expect(drawings['p:AAPL:1D']).toHaveLength(1);
    expect(drawings['p:MSFT:1D']).toHaveLength(1);
  });

  it('selects the active tool', () => {
    useDrawingStore.getState().setTool('fib');
    expect(useDrawingStore.getState().activeTool).toBe('fib');
  });

  it('generates unique ids', () => {
    expect(newDrawingId()).not.toBe(newDrawingId());
  });
});
