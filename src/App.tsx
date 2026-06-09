import { useEffect } from 'react';
import { ChartGrid } from './components/ChartGrid';
import { LeftToolbar } from './components/LeftToolbar';
import { RightSidebar } from './components/RightSidebar';
import { StatusBar } from './components/StatusBar';
import { TopToolbar } from './components/TopToolbar';
import { LAYOUTS, type LayoutPreset } from './lib/layouts';
import { useLayoutStore } from './store/layoutStore';

const SHORTCUT_TO_PRESET = new Map<string, LayoutPreset>(LAYOUTS.map((l) => [l.shortcut, l.preset]));

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export default function App() {
  const setPreset = useLayoutStore((s) => s.setPreset);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // "/" focuses global search from anywhere.
      if (e.key === '/' && !isTypingTarget(e.target)) {
        e.preventDefault();
        document.getElementById('global-symbol-search')?.focus();
        return;
      }

      if (isTypingTarget(e.target)) return;

      // 1–9 and 'g' switch layout presets.
      const preset = SHORTCUT_TO_PRESET.get(e.key.toLowerCase());
      if (preset) {
        e.preventDefault();
        setPreset(preset);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setPreset]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-bg text-text">
      <TopToolbar />
      <div className="flex min-h-0 flex-1">
        <LeftToolbar />
        <main className="min-w-0 flex-1">
          <ChartGrid />
        </main>
        <RightSidebar />
      </div>
      <StatusBar />
    </div>
  );
}
