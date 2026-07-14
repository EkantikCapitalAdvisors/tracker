/**
 * Builds one day's EngineReadings from stored raw series + manual entries.
 * All derivation math lives in the engine package; this file only assembles.
 * Missing series → null fields → the engine marks the tripwire DATA_GAP.
 */

import {
  consecutiveNarrowingWeeks,
  inTopTrailingTercile,
  rollingClosingHigh,
  rvRatio,
  sahmValue,
  sustainedAtOrAbove,
  yoyPct,
  type EngineReadings,
} from '@ekantik/correction-engine';
import { latestManualEntry, latestReadings } from './lib/supabase.js';

const MANUAL_STALE_DAYS = 14;

function values(rows: { value: number | null }[]): number[] {
  return rows.map((r) => r.value).filter((v): v is number => v !== null);
}

async function tryLatest(seriesId: string, limit: number) {
  try {
    return await latestReadings(seriesId, limit);
  } catch {
    return [];
  }
}

export async function assembleReadings(): Promise<EngineReadings> {
  const [spx, baa, dgs10, cpi, unrate, claims, vix, curve, cape] = await Promise.all([
    tryLatest('SP500', 260),
    tryLatest('BAA', 30),
    tryLatest('DGS10', 260),
    tryLatest('CPIAUCSL', 26),
    tryLatest('UNRATE', 30),
    tryLatest('IC4WSA', 60),
    tryLatest('VIXCLS', 10),
    tryLatest('T10Y3M', 5),
    tryLatest('CAPE', 400),
  ]);

  if (spx.length === 0) throw new Error('No S&P 500 closes stored — cannot evaluate');
  const spxValues = values(spx);
  const last = spx[spx.length - 1]!;
  const spClose = last.value!;
  const asOfDate = last.as_of_date;

  const high = rollingClosingHigh(
    spx.filter((r) => r.value !== null).map((r) => ({ date: r.as_of_date, value: r.value! })),
  );

  // Baa−10y spread: monthly Baa vs same-window 10y (daily), both in %.
  // Spread in bp; Δ3m from the value ~63 trading days back on the daily leg.
  const spreadSeries = buildSpreadSeries(baa, dgs10);
  const spreadBp = spreadSeries.at(-1) ?? null;
  const spread3mAgo = spreadSeries.length > 63 ? spreadSeries[spreadSeries.length - 64]! : null;
  const spreadDelta3m =
    spreadBp !== null && spread3mAgo !== null ? spreadBp - spread3mAgo : null;

  // Weekly narrowing: resample the daily spread series to weekly (every 5th).
  const weekly: number[] = [];
  for (let i = spreadSeries.length - 1; i >= 0; i -= 5) weekly.unshift(spreadSeries[i]!);
  const narrowingWeeks = weekly.length >= 2 ? consecutiveNarrowingWeeks(weekly) : null;

  const dgs10Values = values(dgs10);
  const tenYearDelta3m =
    dgs10Values.length > 63
      ? (dgs10Values[dgs10Values.length - 1]! - dgs10Values[dgs10Values.length - 64]!) * 100
      : null;

  const cpiValues = values(cpi);
  const cpiYoY = cpiValues.length >= 13 ? yoyPct(cpiValues.at(-1)!, cpiValues.at(-13)!) : null;

  const sahm = sahmValue(values(unrate));

  const claimsValues = values(claims);
  const claimsYoY =
    claimsValues.length >= 53 ? yoyPct(claimsValues.at(-1)!, claimsValues.at(-53)!) : null;

  const [breadth, higherLow] = await Promise.all([
    latestManualEntry('REVISION_BREADTH_NEGATIVE', MANUAL_STALE_DAYS),
    latestManualEntry('CONFIRMED_HIGHER_LOW', MANUAL_STALE_DAYS),
  ]);

  return {
    asOfDate,
    spClose,
    cycleHigh: high.value,
    cycleHighDate: high.date,
    baa10ySpreadBp: spreadBp,
    baa10ySpreadDelta3mBp: spreadDelta3m,
    baa10yNarrowingWeeks: narrowingWeeks,
    cpiYoYPct: cpiYoY,
    tenYearDelta3mBp: tenYearDelta3m,
    sahmValue: sahm,
    claims4wkYoYPct: claimsYoY,
    revisionBreadthNegative: breadth?.value_bool ?? null,
    vixSustained3Closes: vix.length >= 3 ? sustainedAtOrAbove(values(vix), 30, 3) : null,
    rv10rv60: rvRatio(spxValues),
    capeTopTercile: cape.length >= 24 ? inTopTrailingTercile(values(cape)) : null,
    curve10y3mBp: curve.length > 0 ? (values(curve).at(-1) ?? 0) * 100 : null,
    confirmedHigherLow: higherLow?.value_bool ?? null,
  };
}

/** Daily Baa−10y series in bp, aligned on the 10y daily dates. */
function buildSpreadSeries(
  baa: { as_of_date: string; value: number | null }[],
  dgs10: { as_of_date: string; value: number | null }[],
): number[] {
  if (baa.length === 0 || dgs10.length === 0) return [];
  const out: number[] = [];
  let baaIdx = 0;
  for (const d of dgs10) {
    if (d.value === null) continue;
    // advance to the latest monthly Baa print at or before this date
    while (baaIdx + 1 < baa.length && baa[baaIdx + 1]!.as_of_date <= d.as_of_date) baaIdx++;
    const b = baa[baaIdx];
    if (!b || b.value === null || b.as_of_date > d.as_of_date) continue;
    out.push((b.value - d.value) * 100);
  }
  return out;
}
