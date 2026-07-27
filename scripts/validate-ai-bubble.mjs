#!/usr/bin/env node
/**
 * AI Bubble Module — validation gate (Build Spec v1.0 §7.4).
 * Blocks merge/deploy on failure. Run as a pretest/CI step:
 *   node scripts/validate-ai-bubble.mjs
 *
 * Includes the separate threshold-drift check: if thresholds.v{n}.json differs
 * from the last deployed snapshot without a matching amendments.json entry,
 * the build FAILS. That is the mechanical enforcement of the 48-hour cool-off
 * and countersignature protocol — without it the pre-commitment claim is
 * unenforced and must not be published.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'data/ai-bubble');
const SNAPSHOT = join(DIR, '.deployed-thresholds.sha256');
const EPS = 1e-9;

const errors = [];
const warnings = [];
const fail = (m) => errors.push(m);
const warn = (m) => warnings.push(m);
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

/** Canonical JSON (sorted keys) so the hash is stable across formatting. */
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}
const hashTripwires = (tripwires) =>
  `sha256:${createHash('sha256').update(canonical(tripwires)).digest('hex')}`;

const STATUS_SCORE = { DORMANT: 0, ARMED: 0, PARTIAL: 0.5, FIRED: 1, UNSCOREABLE: 0 };
const roundHalfUp2 = (v) => (Math.floor(v * 100 + 0.5) / 100).toFixed(2);

// ---------------------------------------------------------------- thresholds
const thresholdFiles = existsSync(DIR)
  ? readdirSync(DIR).filter((f) => /^thresholds\.v\d+\.json$/.test(f)).sort()
  : [];
if (thresholdFiles.length === 0) {
  console.error('✖ no thresholds.v{n}.json found in data/ai-bubble');
  process.exit(1);
}
const thresholdPath = join(DIR, thresholdFiles.at(-1));
const thresholds = readJson(thresholdPath);
const computedHash = hashTripwires(thresholds.tripwires);

// weights sum to 1.0 (float-safe)
const weightSum = thresholds.tiers.reduce((a, t) => a + t.weight, 0);
if (Math.abs(weightSum - 1) > 1e-9) fail(`tier weights sum to ${weightSum}, expected 1.0`);

// bands contiguous and non-overlapping
const bands = [...thresholds.bands].sort((a, b) => a.min - b.min);
bands.forEach((b, i) => {
  if (b.max <= b.min) fail(`band ${b.key}: max must exceed min`);
  if (i > 0 && Math.abs(b.min - bands[i - 1].max) > EPS) {
    fail(`bands not contiguous between ${bands[i - 1].key} and ${b.key}`);
  }
});

// completeness — pre-commitment is not real until every tripwire is defined
const expected = thresholds.expected_tripwire_count;
if (expected && thresholds.tripwires.length !== expected) {
  fail(
    `thresholds file defines ${thresholds.tripwires.length} of ${expected} tripwires — ` +
      'supply the framework document before publication',
  );
}
const derived = thresholds.tripwires.filter((t) => t.text_source === 'derived_from_run');
if (derived.length > 0) {
  warn(
    `${derived.length} threshold text(s) transcribed from run rationales, not read from the ` +
      'framework document — reconcile and publish any correction as an amendment. ' +
      '(Scoring never reads threshold_text, so Index integrity is unaffected.)',
  );
}
const provisional = thresholds.tripwires.filter((t) => t.provisional);
if (provisional.length > 0) {
  fail(
    `${provisional.length} provisional tripwire(s) present (${provisional
      .map((t) => t.id)
      .join(', ')}) — thresholds inferred from run examples must be replaced with framework text`,
  );
}
const ids = thresholds.tripwires.map((t) => t.id);
if (new Set(ids).size !== ids.length) fail('duplicate tripwire ids in threshold file');

// ------------------------------------------------------- threshold-drift gate
if (existsSync(SNAPSHOT)) {
  const deployed = readFileSync(SNAPSHOT, 'utf8').trim();
  if (deployed !== computedHash) {
    const amendments = existsSync(join(DIR, 'amendments.json')) ? readJson(join(DIR, 'amendments.json')) : [];
    const covered = amendments.some((a) => a.new_hash === computedHash);
    if (!covered) {
      fail(
        'THRESHOLD DRIFT: thresholds changed since the last deploy with no amendments.json ' +
          `entry carrying new_hash "${computedHash}". Publish an amendment (justification, ` +
          '48-hour cool-off, countersignature) or revert.',
      );
    }
  }
} else {
  warn(`no deploy snapshot yet — writing ${SNAPSHOT} as the baseline`);
}

// --------------------------------------------------------------------- runs
const runsDir = join(DIR, 'runs');
const runFiles = existsSync(runsDir)
  ? readdirSync(runsDir).filter((f) => /^run-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()
  : [];
if (runFiles.length === 0) warn('no run files yet — nothing to validate against the contract');

const tierOf = new Map(thresholds.tripwires.map((t) => [t.id, t.tier]));

for (const [i, file] of runFiles.entries()) {
  const run = readJson(join(runsDir, file));
  const where = (m) => fail(`${file}: ${m}`);

  if (run.thresholds_hash === thresholds.declared_upstream_hash) {
    warn(
      `${file}: run cites the framework's upstream hash; local threshold text is a transcription ` +
        'and is unverified against the framework document',
    );
  } else if (run.thresholds_hash !== thresholds.hash && run.thresholds_hash !== computedHash) {
    where(`thresholds_hash does not match the threshold file (${computedHash})`);
  }

  // every tripwire in the threshold file appears exactly once
  const runIds = run.tripwires.map((t) => t.id);
  if (new Set(runIds).size !== runIds.length) where('duplicate tripwire ids in run');
  for (const id of ids) if (!runIds.includes(id)) where(`missing tripwire ${id}`);
  for (const id of runIds) if (!ids.includes(id)) where(`unknown tripwire ${id} not in threshold file`);

  // score reproduces from tripwires[]
  const tiers = thresholds.tiers.map((tier) => {
    const inTier = run.tripwires.filter((t) => tierOf.get(t.id) === tier.id && t.status !== 'RETIRED');
    const load = inTier.length === 0 ? 0 : inTier.reduce((a, t) => a + (STATUS_SCORE[t.status] ?? 0), 0) / inTier.length;
    return { id: tier.id, load, contribution: tier.weight * load };
  });
  const scoreRaw = tiers.reduce((a, t) => a + t.contribution, 0);
  if (Math.abs(scoreRaw - run.index.score_raw) > EPS) {
    where(`score_raw ${run.index.score_raw} does not reproduce from tripwires[] (computed ${scoreRaw})`);
  }
  if (run.index.score_display !== roundHalfUp2(run.index.score_raw)) {
    where(`score_display ${run.index.score_display} ≠ half-up round of score_raw`);
  }
  for (const rt of run.tiers ?? []) {
    const computed = tiers.find((t) => t.id === rt.id);
    if (computed && Math.abs(computed.load - rt.load) > EPS) {
      where(`tier ${rt.id} load ${rt.load} ≠ computed ${computed.load}`);
    }
  }

  // band matches score_raw
  const band = bands.find((b) => scoreRaw >= b.min && (scoreRaw < b.max || (b.max >= 1 && scoreRaw <= b.max)));
  if (band && run.index.band !== band.key) where(`band ${run.index.band} ≠ ${band.key} for score ${scoreRaw}`);

  // coverage honesty — UNSCOREABLE stays in the denominator
  const live = run.tripwires.filter((t) => t.status !== 'RETIRED');
  const uns = live.filter((t) => t.status === 'UNSCOREABLE').map((t) => t.id);
  if (run.index.coverage.total !== live.length) where('coverage.total ≠ non-retired tripwire count');
  if (run.index.coverage.scored !== live.length - uns.length) where('coverage.scored miscounted');

  // evidence discipline
  for (const t of run.tripwires) {
    const expectedScore = t.status === 'RETIRED' ? 0 : STATUS_SCORE[t.status];
    if (expectedScore === undefined) where(`tripwire ${t.id}: unknown status ${t.status}`);
    else if (Math.abs(expectedScore - t.status_score) > EPS) {
      where(`tripwire ${t.id}: status_score ${t.status_score} ≠ ${expectedScore} for ${t.status}`);
    }
    if (t.changed && (t.evidence ?? []).length === 0) where(`changed tripwire ${t.id} has no evidence`);
    if (t.status === 'UNSCOREABLE' && !t.unscoreable_reason) where(`${t.id}: UNSCOREABLE without a reason`);
    for (const e of t.evidence ?? []) {
      if (!e.source_url || !e.source_date) where(`tripwire ${t.id}: evidence missing source_url/source_date`);
      if (run.source_window_start && t.changed && e.source_date <= run.source_window_start) {
        where(`tripwire ${t.id}: status change cites source dated ${e.source_date} ≤ source_window_start`);
      }
    }
  }

  // cascade overrides must justify themselves
  const ov = run.cascade_contribution?.override;
  if (ov && !String(ov.justification ?? '').trim()) where('cascade override has an empty justification');

  // §7.4 — the check is on the MEMBER-RENDERED payload, not the canonical
  // source: a run legitimately stores internal blocks (e.g. epig_governance).
  // What must never happen is one surviving the build-time strip.
  const stripped = {};
  for (const [k, v] of Object.entries(run)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && v.visibility === 'internal') continue;
    stripped[k] = Array.isArray(v) ? v.filter((i) => !(i && typeof i === 'object' && i.visibility === 'internal')) : v;
  }
  if (JSON.stringify(stripped).includes('"visibility":"internal"')) {
    where('visibility:internal survived the build-time strip');
  }

  // prior-run linkage
  if (i > 0) {
    const prior = readJson(join(runsDir, runFiles[i - 1]));
    if (run.prior_run_date !== prior.run_date) {
      where(`prior_run_date ${run.prior_run_date} ≠ preceding run ${prior.run_date}`);
    }
    if (
      typeof run.index.prior_score_raw === 'number' &&
      Math.abs(run.index.prior_score_raw - prior.index.score_raw) > EPS
    ) {
      where('prior_score_raw does not match the prior run file');
    }
  }
}

// -------------------------------------------------------------------- report
for (const w of warnings) console.warn(`⚠ ${w}`);
if (errors.length > 0) {
  console.error(`\n✖ AI Bubble validation failed (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error('\nThe module must not publish while these fail (§7.4, §11).');
  process.exit(1);
}
if (!existsSync(SNAPSHOT)) writeFileSync(SNAPSHOT, `${computedHash}\n`);
console.log(`✓ AI Bubble validation passed — ${thresholds.tripwires.length} tripwires, ${runFiles.length} run(s)`);
console.log(`  threshold hash ${computedHash}`);
