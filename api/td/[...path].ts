import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, checkPasscode, forwardQuery, joinPath, proxyJson } from '../_lib/proxy';

/**
 * Twelve Data proxy. Injects TWELVEDATA_KEY server-side and forwards to
 * https://api.twelvedata.com/<path>. Free tier ≈ 8 req/min, ≈ 800 req/day —
 * the client caches + rate-limits, but keep that in mind here too.
 *
 *   /api/td/symbol_search?symbol=AAP
 *   /api/td/time_series?symbol=AAPL&interval=1day&outputsize=500&order=ASC&timezone=UTC
 *   /api/td/quote?symbol=AAPL
 */
const BASE = 'https://api.twelvedata.com';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (!checkPasscode(req, res)) return;

  const key = process.env.TWELVEDATA_KEY;
  if (!key) {
    res
      .status(503)
      .json({ status: 'error', code: 503, message: 'TWELVEDATA_KEY not configured on the server' });
    return;
  }

  const path = joinPath(req.query.path);
  const params = forwardQuery(req.query);
  params.set('apikey', key);
  await proxyJson(`${BASE}/${path}?${params.toString()}`, res);
}
