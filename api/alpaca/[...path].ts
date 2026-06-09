import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, checkPasscode, forwardQuery, joinPath, proxyJson } from '../_lib/proxy';

/**
 * Alpaca PAPER trading proxy. Injects APCA-API-KEY-ID / APCA-API-SECRET-KEY
 * server-side and forwards to the paper trading host only:
 *
 *   GET    /api/alpaca/account
 *   GET    /api/alpaca/positions
 *   DELETE /api/alpaca/positions/{symbol}
 *   GET    /api/alpaca/orders?status=open&nested=true
 *   POST   /api/alpaca/orders            { symbol, qty|notional, side, type, ... }
 *   DELETE /api/alpaca/orders/{id}
 *   DELETE /api/alpaca/orders
 *
 * SAFETY: the base host is hardcoded to the PAPER endpoint and we hard-refuse
 * the live-money host. There is no way for the client to redirect this to live.
 */
const PAPER_BASE = 'https://paper-api.alpaca.markets';
const LIVE_BASE = 'https://api.alpaca.markets';

// Defensive guard — must never point at the live-money host.
if (PAPER_BASE.startsWith(LIVE_BASE)) {
  throw new Error('OpenChart refuses to connect to the Alpaca live trading host');
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (!checkPasscode(req, res)) return;

  const keyId = process.env.ALPACA_KEY_ID;
  const secret = process.env.ALPACA_SECRET_KEY;
  if (!keyId || !secret) {
    res.status(503).json({
      code: 503,
      message: 'Alpaca paper keys not configured (ALPACA_KEY_ID / ALPACA_SECRET_KEY)',
    });
    return;
  }

  const path = joinPath(req.query.path);
  const qs = forwardQuery(req.query).toString();
  const url = `${PAPER_BASE}/v2/${path}${qs ? `?${qs}` : ''}`;

  const method = req.method ?? 'GET';
  const hasBody = method !== 'GET' && method !== 'DELETE' && req.body != null;

  await proxyJson(url, res, {
    method,
    headers: {
      'APCA-API-KEY-ID': keyId,
      'APCA-API-SECRET-KEY': secret,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    ...(hasBody ? { body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body) } : {}),
  });
}
