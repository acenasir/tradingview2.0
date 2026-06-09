/**
 * Thin client for the same-origin `/api/*` proxy functions. The proxy injects
 * the real provider keys server-side, so no secret ever ships to the browser.
 * If an optional access passcode (APP_PASSCODE) is configured, it is attached
 * here from localStorage.
 */

const PASSCODE_KEY = 'openchart.passcode';

export function getPasscode(): string {
  try {
    return localStorage.getItem(PASSCODE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setPasscode(value: string): void {
  try {
    localStorage.setItem(PASSCODE_KEY, value);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    readonly body?: unknown,
  ) {
    super(`API ${status} for ${path}`);
    this.name = 'ApiError';
  }
}

function authHeaders(): HeadersInit {
  const passcode = getPasscode();
  return passcode ? { 'x-app-passcode': passcode } : {};
}

/** GET a JSON resource from the local proxy. Throws ApiError on non-2xx. */
export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { headers: authHeaders(), signal });
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, path, body);
  }
  return (await res.json()) as T;
}

/** POST JSON to the local proxy. Throws ApiError on non-2xx. */
export async function apiPost<T>(path: string, payload: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, path, body);
  }
  return (await res.json()) as T;
}
