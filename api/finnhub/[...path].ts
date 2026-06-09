import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, checkPasscode, forwardQuery, joinPath, proxyJson } from '../_lib/proxy';

/**
 * Finnhub REST proxy. Injects FINNHUB_KEY server-side and forwards to
 * https://finnhub.io/api/v1/<path>. Free tier ≈ 60 req/min.
 *
 *   /api/finnhub/company-news?symbol=AAPL&from=2025-06-01&to=2025-06-09
 */
const BASE = 'https://finnhub.io/api/v1';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (!checkPasscode(req, res)) return;

  const key = process.env.FINNHUB_KEY;
  if (!key) {
    res.status(503).json({ code: 503, message: 'FINNHUB_KEY not configured on the server' });
    return;
  }

  const path = joinPath(req.query.path);
  const params = forwardQuery(req.query);
  params.set('token', key);
  await proxyJson(`${BASE}/${path}?${params.toString()}`, res);
}
