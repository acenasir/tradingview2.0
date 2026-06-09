import { apiGet } from '../lib/api';

export interface NewsItem {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  /** Unix seconds. */
  datetime: number;
  image?: string;
}

interface FinnhubNews {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
  image?: string;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Recent company news for a US stock symbol (last ~14 days), via the proxy. */
export async function getCompanyNews(symbol: string, signal?: AbortSignal): Promise<NewsItem[]> {
  const to = new Date();
  const from = new Date(Date.now() - 14 * 86_400_000);
  const qs = new URLSearchParams({ symbol, from: ymd(from), to: ymd(to) });
  const data = await apiGet<FinnhubNews[]>(`/api/finnhub/company-news?${qs}`, signal);
  if (!Array.isArray(data)) return [];
  return data
    .filter((n) => n.headline && n.url)
    .map((n) => ({
      id: n.id,
      headline: n.headline,
      summary: n.summary,
      source: n.source,
      url: n.url,
      datetime: n.datetime,
      image: n.image,
    }))
    .slice(0, 30);
}
