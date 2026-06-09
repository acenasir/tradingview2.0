import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib/proxy';

/**
 * Diagnostics + access-guard probe. Always reachable (so the client can learn
 * whether a passcode is required); reports which provider keys are configured
 * (booleans only, never the keys) and whether the supplied passcode is valid.
 *   GET /api/health
 */
export default function handler(req: VercelRequest, res: VercelResponse): void {
  applyCors(res);
  const required = Boolean(process.env.APP_PASSCODE);
  const raw = req.headers['x-app-passcode'];
  const provided = Array.isArray(raw) ? raw[0] : raw;
  const authed = !required || provided === process.env.APP_PASSCODE;

  res.status(200).json({
    status: 'ok',
    defaultMode: 'delayed-free',
    passcodeRequired: required,
    authed,
    providers: {
      twelvedata: Boolean(process.env.TWELVEDATA_KEY),
      finnhub: Boolean(process.env.FINNHUB_KEY),
      alphavantage: Boolean(process.env.ALPHAVANTAGE_KEY),
      alpaca: Boolean(process.env.ALPACA_KEY_ID && process.env.ALPACA_SECRET_KEY),
    },
  });
}
