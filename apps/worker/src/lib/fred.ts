import { env } from '../env.js';

/**
 * FRED series fetcher. Fail-open by contract: callers catch and log a
 * DATA_GAP row; a failed series never blocks the pipeline.
 */
export interface FredObservation {
  date: string;
  value: number;
}

export async function fetchFredSeries(
  seriesId: string,
  observations = 400,
): Promise<FredObservation[]> {
  const url = new URL('https://api.stlouisfed.org/fred/series/observations');
  url.searchParams.set('series_id', seriesId);
  url.searchParams.set('api_key', env.FRED_API_KEY);
  url.searchParams.set('file_type', 'json');
  url.searchParams.set('sort_order', 'desc');
  url.searchParams.set('limit', String(observations));

  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`FRED ${seriesId} HTTP ${res.status}`);
  const body = (await res.json()) as { observations?: { date: string; value: string }[] };
  const rows = (body.observations ?? [])
    .filter((o) => o.value !== '.' && o.value !== '')
    .map((o) => ({ date: o.date, value: Number(o.value) }))
    .filter((o) => Number.isFinite(o.value));
  return rows.reverse(); // oldest first
}
