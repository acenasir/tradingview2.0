/**
 * A single shared ResizeObserver for the whole app. With up to 16 charts on
 * screen we don't want 16 separate observers; instead every chart container
 * registers a callback here. Size changes are coalesced into one rAF flush so
 * we resize all affected charts in a single frame.
 */

type ResizeCallback = (width: number, height: number) => void;

const callbacks = new WeakMap<Element, ResizeCallback>();
const pending = new Map<Element, { width: number; height: number }>();
let frame = 0;

let observer: ResizeObserver | null = null;

function ensureObserver(): ResizeObserver {
  if (observer) return observer;
  observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const box = entry.contentRect;
      pending.set(entry.target, { width: box.width, height: box.height });
    }
    if (!frame) {
      frame = requestAnimationFrame(flush);
    }
  });
  return observer;
}

function flush(): void {
  frame = 0;
  for (const [el, size] of pending) {
    const cb = callbacks.get(el);
    if (cb) cb(size.width, size.height);
  }
  pending.clear();
}

/** Observe an element; returns an unsubscribe function. */
export function observeResize(el: Element, cb: ResizeCallback): () => void {
  callbacks.set(el, cb);
  ensureObserver().observe(el);
  return () => {
    observer?.unobserve(el);
    callbacks.delete(el);
    pending.delete(el);
  };
}
