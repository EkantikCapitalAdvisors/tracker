/**
 * Indicator math shared by the ingestion worker and the replay harness.
 * Pure functions; closing/official data only.
 */

export interface DatedValue {
  date: string; // ISO YYYY-MM-DD
  value: number;
}

/** Drawdown % of `close` vs `high` (negative when below). */
export function drawdownPct(close: number, high: number): number {
  return ((close - high) / high) * 100;
}

/**
 * Rolling N-trading-day closing high, evaluated at the last element.
 * `windowTd` defaults to ~6 months of trading days (126).
 */
export function rollingClosingHigh(closes: DatedValue[], windowTd = 126): DatedValue {
  if (closes.length === 0) throw new Error('rollingClosingHigh: empty series');
  const window = closes.slice(-windowTd);
  let best = window[0]!;
  for (const c of window) {
    if (c.value >= best.value) best = c;
  }
  return best;
}

/** Annualized stdev of log returns over the trailing `n` closes. */
export function realizedVol(closes: number[], n: number): number | null {
  if (closes.length < n + 1) return null;
  const slice = closes.slice(-(n + 1));
  const rets: number[] = [];
  for (let i = 1; i < slice.length; i++) {
    rets.push(Math.log(slice[i]! / slice[i - 1]!));
  }
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

/** RV10/RV60 ratio; null while insufficient history. */
export function rvRatio(closes: number[]): number | null {
  const rv10 = realizedVol(closes, 10);
  const rv60 = realizedVol(closes, 60);
  if (rv10 === null || rv60 === null || rv60 === 0) return null;
  return rv10 / rv60;
}

/**
 * Real-time Sahm construction: 3-month MA of U3 minus the minimum of that
 * 3-month MA over the prior 12 months. Input: monthly U3 series, oldest
 * first, at least 15 observations.
 */
export function sahmValue(u3Monthly: number[]): number | null {
  if (u3Monthly.length < 15) return null;
  const ma3 = (endIdx: number) =>
    (u3Monthly[endIdx]! + u3Monthly[endIdx - 1]! + u3Monthly[endIdx - 2]!) / 3;
  const last = u3Monthly.length - 1;
  const current = ma3(last);
  let min = Infinity;
  for (let i = last - 12; i < last; i++) {
    min = Math.min(min, ma3(i));
  }
  return Number((current - min).toFixed(4));
}

/** Year-over-year % change between latest and the value ~1 year prior. */
export function yoyPct(latest: number, yearAgo: number): number {
  return ((latest - yearAgo) / yearAgo) * 100;
}

/** VIX ≥ level sustained for `n` consecutive closes (evaluated at the end). */
export function sustainedAtOrAbove(closes: number[], level: number, n: number): boolean {
  if (closes.length < n) return false;
  return closes.slice(-n).every((c) => c >= level);
}

/**
 * Consecutive weeks of narrowing at the end of a weekly spread series
 * (oldest first). A week counts when its value is strictly below the prior
 * week's.
 */
export function consecutiveNarrowingWeeks(weekly: number[]): number {
  let count = 0;
  for (let i = weekly.length - 1; i > 0; i--) {
    if (weekly[i]! < weekly[i - 1]!) count++;
    else break;
  }
  return count;
}

/** Top trailing-30y tercile test for CAPE (monthly series, oldest first). */
export function inTopTrailingTercile(monthly: number[], windowMonths = 360): boolean | null {
  if (monthly.length < 24) return null;
  const window = monthly.slice(-windowMonths);
  const latest = window[window.length - 1]!;
  const sorted = [...window].sort((a, b) => a - b);
  const cut = sorted[Math.floor((sorted.length * 2) / 3)]!;
  return latest >= cut;
}
