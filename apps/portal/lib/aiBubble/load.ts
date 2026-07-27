import 'server-only';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { RunFile, ThresholdFile } from './types';

/**
 * Runs are read from their own immutable JSON. §9: past runs must render from
 * their stored data and are NEVER recomputed against current thresholds.
 */
const DIR = join(process.cwd(), '..', '..', 'data', 'ai-bubble');
const DIR_ALT = join(process.cwd(), 'data', 'ai-bubble');

function dataDir(): string | null {
  if (existsSync(DIR)) return DIR;
  if (existsSync(DIR_ALT)) return DIR_ALT;
  return null;
}

export function loadThresholds(): ThresholdFile | null {
  const dir = dataDir();
  if (!dir) return null;
  const files = readdirSync(dir)
    .filter((f) => /^thresholds\.v\d+\.json$/.test(f))
    .sort();
  const latest = files.at(-1);
  if (!latest) return null;
  return JSON.parse(readFileSync(join(dir, latest), 'utf8')) as ThresholdFile;
}

export function listRunDates(): string[] {
  const dir = dataDir();
  if (!dir || !existsSync(join(dir, 'runs'))) return [];
  return readdirSync(join(dir, 'runs'))
    .filter((f) => /^run-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => f.slice(4, 14))
    .sort();
}

export function loadRun(date?: string): RunFile | null {
  const dir = dataDir();
  if (!dir) return null;
  const target = date ?? listRunDates().at(-1);
  if (!target) return null;
  const path = join(dir, 'runs', `run-${target}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as RunFile;
}

/** Amendment log — §8 states this is member-visible; §12.2 asks for confirmation. */
export function loadAmendments(): unknown[] {
  const dir = dataDir();
  if (!dir || !existsSync(join(dir, 'amendments.json'))) return [];
  return JSON.parse(readFileSync(join(dir, 'amendments.json'), 'utf8')) as unknown[];
}

/** Publication readiness — mirrors the validator's completeness gate (§7.4). */
export function publicationBlockers(t: ThresholdFile | null): string[] {
  if (!t) return ['No threshold file found.'];
  const out: string[] = [];
  if (t.expected_tripwire_count && t.tripwires.length !== t.expected_tripwire_count) {
    out.push(`${t.tripwires.length} of ${t.expected_tripwire_count} tripwires defined`);
  }
  const prov = t.tripwires.filter((x) => x.provisional);
  if (prov.length > 0) out.push(`${prov.length} provisional threshold(s): ${prov.map((p) => p.id).join(', ')}`);
  return out;
}
