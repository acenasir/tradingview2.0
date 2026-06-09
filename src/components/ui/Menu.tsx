import { useEffect, useRef, useState, type ReactNode } from 'react';

interface MenuProps {
  button: (state: { open: boolean }) => ReactNode;
  children: (state: { close: () => void }) => ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

/** Lightweight popover/menu with click-outside + Escape handling. */
export function Menu({ button, children, align = 'left', className = '' }: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div onClick={() => setOpen((o) => !o)}>{button({ open })}</div>
      {open && (
        <div
          className={`absolute z-50 mt-1 rounded border border-border bg-bg-panel py-1 shadow-xl ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
}
