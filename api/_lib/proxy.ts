import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Shared helpers for the /api proxy functions. Files under `api/_lib` are NOT
 * turned into routes by Vercel (the `_` prefix is ignored) — they're bundled
 * into the functions that import them. Secrets are read from process.env here
 * so they never reach the browser.
 */

export function applyCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-app-passcode');
}

/**
 * Optional shared-passcode access guard. If APP_PASSCODE is set, requests must
 * present a matching `x-app-passcode` header. Returns true when allowed; writes
 * a 401 and returns false otherwise.
 */
export function checkPasscode(req: VercelRequest, res: VercelResponse): boolean {
  const required = process.env.APP_PASSCODE;
  if (!required) return true;
  const raw = req.headers['x-app-passcode'];
  const provided = Array.isArray(raw) ? raw[0] : raw;
  if (provided === required) return true;
  res.status(401).json({ status: 'error', code: 401, message: 'Missing or invalid access passcode' });
  return false;
}

/** Reconstruct a catch-all path param (e.g. ["quote"] → "quote"). */
export function joinPath(pathParam: string | string[] | undefined): string {
  if (!pathParam) return '';
  return Array.isArray(pathParam) ? pathParam.join('/') : pathParam;
}

/** Build a forwarded query string from req.query, dropping internal keys. */
export function forwardQuery(query: VercelRequest['query'], exclude: string[] = []): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key === 'path' || exclude.includes(key)) continue;
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else if (value != null) params.append(key, value);
  }
  return params;
}

/** Fetch from upstream and pipe the status + JSON body back to the client. */
export async function proxyJson(
  url: string,
  res: VercelResponse,
  init?: Parameters<typeof fetch>[1],
): Promise<void> {
  try {
    const upstream = await fetch(url, init);
    const text = await upstream.text();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(upstream.status).send(text || '{}');
  } catch (err) {
    res
      .status(502)
      .json({ status: 'error', code: 502, message: `Upstream fetch failed: ${(err as Error).message}` });
  }
}
