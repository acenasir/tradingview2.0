import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib/proxy';

/**
 * Diagnostics endpoint — reports which provider keys are configured (booleans
 * only, never the keys themselves). Handy for verifying a deploy / local setup:
 *   GET /api/health
 */
export default function handler(_req: VercelRequest, res: VercelResponse): void {
  applyCors(res);
  res.status(200).json({
    status: 'ok',
    defaultMode: 'delayed-free',
    providers: {
      twelvedata: Boolean(process.env.TWELVEDATA_KEY),
      finnhub: Boolean(process.env.FINNHUB_KEY),
      alphavantage: Boolean(process.env.ALPHAVANTAGE_KEY),
      alpaca: Boolean(process.env.ALPACA_KEY_ID && process.env.ALPACA_SECRET_KEY),
    },
    passcodeRequired: Boolean(process.env.APP_PASSCODE),
  });
}
