/**
 * Yahoo Finance v8 chart API — daily closes for international context
 * indices. Free, keyless. Context series only: nothing fetched here ever
 * feeds the engine; failures are recorded as DATA_GAP rows (fail-open).
 */

interface YahooChartResponse {
  chart?: {
    result?: {
      timestamp?: number[];
      indicators?: { quote?: { close?: (number | null)[] }[] };
    }[];
    error?: unknown;
  };
}

export async function fetchYahooDaily(
  symbol: string,
): Promise<{ date: string; value: number }[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2y&interval=1d`;
  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) ekantik-correction-worker/2.0' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`yahoo HTTP ${res.status}`);
  const json = (await res.json()) as YahooChartResponse;
  const result = json.chart?.result?.[0];
  if (!result) {
    throw new Error(`yahoo: ${JSON.stringify(json.chart?.error ?? 'no result').slice(0, 160)}`);
  }
  const ts = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  // Last write per date wins — Yahoo can emit a duplicate partial bar for today.
  const byDate = new Map<string, number>();
  for (let i = 0; i < ts.length; i++) {
    const close = closes[i];
    if (close === null || close === undefined || !Number.isFinite(close)) continue;
    const date = new Date(ts[i]! * 1000).toISOString().slice(0, 10);
    byDate.set(date, Math.round(close * 100) / 100);
  }
  if (byDate.size === 0) throw new Error('yahoo: empty series');
  return [...byDate.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
