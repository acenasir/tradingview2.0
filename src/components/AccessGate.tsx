import { Lock } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { apiGet, setPasscode } from '../lib/api';

interface Health {
  passcodeRequired?: boolean;
  authed?: boolean;
}

type Phase = 'checking' | 'locked' | 'open';

/**
 * Optional shared-passcode gate. If the deployment sets APP_PASSCODE, the
 * /api proxy requires a matching `x-app-passcode` header; this screen collects
 * it and stores it. When no backend is reachable (e.g. plain `vite dev`) or no
 * passcode is configured, it gets out of the way immediately.
 */
export function AccessGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('checking');
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function check(): Promise<boolean> {
    try {
      const health = await apiGet<Health>('/api/health');
      if (health.passcodeRequired && !health.authed) {
        setPhase('locked');
        return false;
      }
      setPhase('open');
      return true;
    } catch {
      // No /api reachable → nothing to guard; let the app through.
      setPhase('open');
      return true;
    }
  }

  useEffect(() => {
    void check();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    setPasscode(value.trim());
    const ok = await check();
    if (!ok) setError(true);
    setBusy(false);
  }

  if (phase === 'checking') {
    return <div className="flex h-screen w-screen items-center justify-center bg-bg text-sm text-text-muted">Loading…</div>;
  }

  if (phase === 'locked') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg">
        <form onSubmit={onSubmit} className="w-72 rounded-lg border border-border bg-bg-panel p-5 shadow-xl">
          <div className="mb-3 flex items-center gap-2 text-text-bright">
            <Lock className="h-4 w-4 text-accent" />
            <span className="font-semibold">OpenChart</span>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-text-muted">
            This deployment is passcode-protected. Enter the access passcode to continue.
          </p>
          <input
            type="password"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Passcode"
            className="oc-input mb-2"
          />
          {error && <p className="mb-2 text-2xs text-down">Incorrect passcode.</p>}
          <button
            type="submit"
            disabled={busy || !value.trim()}
            className="h-8 w-full rounded bg-accent text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {busy ? 'Checking…' : 'Unlock'}
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
