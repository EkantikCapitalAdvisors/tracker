/**
 * Estate readiness scoring & beneficiary audit (§M23, normative).
 *
 * Weights: will 25 · beneficiaries current 25 · financial POA 15 · healthcare
 * directive 15 · guardianship 10 (when minor dependents) · trust/letter/
 * locations 10 (shared bucket). Weights REWEIGHT when a component is N/A —
 * §15.1 golden: guardianship N/A with will+beneficiaries+directive complete
 * scores 100 × 65/90 = 72.2.
 */

import type { Account, ConditionState, EstateDoc, EstateDocType, Flag } from "./types.js";

const CORE_WEIGHTS: Array<{ type: EstateDocType; weight: number }> = [
  { type: "will", weight: 25 },
  { type: "beneficiaries", weight: 25 },
  { type: "poa", weight: 15 },
  { type: "directive", weight: 15 },
  { type: "guardianship", weight: 10 },
];

/** trust + letter + locations share one 10-point bucket, split evenly. */
const BUCKET_TYPES: EstateDocType[] = ["trust", "letter", "locations"];
const BUCKET_WEIGHT = 10;

export interface EstateEvaluation {
  /** 0–100 over applicable weights; null when nothing is answered. */
  readinessScore: number | null;
  componentStates: Partial<Record<EstateDocType, ConditionState>>;
  bindingGap: string | null;
}

function docState(doc: EstateDoc | undefined): ConditionState {
  if (!doc) return "NOT_YET";
  switch (doc.status) {
    case "complete":
      return "CLEAR";
    case "in_progress":
      return "WATCH";
    case "missing":
      return "WATCH"; // a named gap, surfaced — but display is never "BLOCKED" red wall (P6)
    case "not_applicable":
      return "N_A";
  }
}

export function evaluateEstate(
  docs: EstateDoc[] | undefined,
  hasMinorDependents: boolean,
): EstateEvaluation {
  const byType = new Map<EstateDocType, EstateDoc>();
  for (const d of docs ?? []) byType.set(d.type, d);

  const componentStates: Partial<Record<EstateDocType, ConditionState>> = {};
  let applicableWeight = 0;
  let earnedWeight = 0;
  let anyAnswered = false;
  let bindingGap: string | null = null;
  let bindingGapWeight = -1;

  for (const { type, weight } of CORE_WEIGHTS) {
    const doc = byType.get(type);
    let state = docState(doc);
    if (type === "guardianship" && !hasMinorDependents && (!doc || doc.status === "not_applicable")) {
      state = "N_A";
    }
    componentStates[type] = state;
    if (state === "N_A") continue;
    applicableWeight += weight;
    if (doc) anyAnswered = true;
    if (state === "CLEAR") {
      earnedWeight += weight;
    } else if (weight > bindingGapWeight) {
      bindingGapWeight = weight;
      bindingGap = type;
    }
  }

  // Shared bucket: fractional credit per completed doc.
  let bucketApplicable = 0;
  let bucketEarned = 0;
  for (const type of BUCKET_TYPES) {
    const doc = byType.get(type);
    const state = docState(doc);
    componentStates[type] = state;
    if (state === "N_A") continue;
    bucketApplicable += 1;
    if (doc) anyAnswered = true;
    if (state === "CLEAR") bucketEarned += 1;
  }
  if (bucketApplicable > 0) {
    applicableWeight += BUCKET_WEIGHT;
    earnedWeight += (BUCKET_WEIGHT * bucketEarned) / bucketApplicable;
  }

  const readinessScore =
    anyAnswered && applicableWeight > 0 ? (100 * earnedWeight) / applicableWeight : null;
  return { readinessScore, componentStates, bindingGap };
}

/**
 * Beneficiary audit (§M23): missing on an applicable account ⇒ flag;
 * reviewed > 3 years ago ⇒ stale. Unanswered applicability is skipped (P6).
 */
export function beneficiaryAudit(accounts: Account[] | undefined): Flag[] {
  const flags: Flag[] = [];
  for (const a of accounts ?? []) {
    if (!a.beneficiaryApplicable) continue;
    if (!a.beneficiaryPrimary) {
      flags.push({
        code: "BENEFICIARY_MISSING",
        severity: 2,
        module: "M23",
        message: `No beneficiary named on ${a.name}`,
        fixModule: "M23",
      });
    } else if (
      a.beneficiaryReviewedAtMonthsAgo !== undefined &&
      a.beneficiaryReviewedAtMonthsAgo > 36
    ) {
      flags.push({
        code: "ATTESTATION_STALE",
        severity: 3,
        module: "M23",
        message: `Beneficiary on ${a.name} last reviewed over 3 years ago`,
        fixModule: "M23",
      });
    }
  }
  return flags;
}
