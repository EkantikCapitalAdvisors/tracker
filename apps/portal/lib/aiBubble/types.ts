/** AI Bubble Module — data contract types (Build Spec v1.0 §3). */

export type TripwireStatus = 'DORMANT' | 'ARMED' | 'PARTIAL' | 'FIRED' | 'UNSCOREABLE' | 'RETIRED';
export type Direction = 'up' | 'down' | 'none';
export type SellerClass = 'speculative' | 'fundamental' | 'buy_and_hold' | 'none';
export type Visibility = 'public' | 'member' | 'internal';
export type Severity = 'low' | 'medium' | 'high';
export type Confidence = 'scheduled' | 'estimated' | 'conditional';

/** §3.4 — RETIRED is excluded from the denominator; UNSCOREABLE deliberately is not. */
export const STATUS_SCORE: Record<Exclude<TripwireStatus, 'RETIRED'>, number> = {
  DORMANT: 0,
  ARMED: 0,
  PARTIAL: 0.5,
  FIRED: 1,
  UNSCOREABLE: 0,
};

export interface TierDef {
  id: number;
  key: string;
  name: string;
  weight: number;
  question: string;
}

export interface BandDef {
  key: string;
  label: string;
  min: number;
  max: number;
}

export interface TripwireDef {
  id: string;
  tier: number;
  name: string;
  public_name: string;
  threshold_text: string;
  threshold_machine: { metric: string; op: string; value: number | null };
  seller_class: SellerClass;
  search_queries: string[];
  notes?: string;
  retired_at?: string | null;
  /** Local extension: inferred, not yet transcribed from the framework doc. */
  provisional?: boolean;
}

export interface ThresholdFile {
  schema_version: string;
  framework_version: string;
  effective_from: string;
  hash: string;
  expected_tripwire_count?: number;
  tiers: TierDef[];
  bands: BandDef[];
  tripwires: TripwireDef[];
}

export interface Evidence {
  statement: string;
  observed_value?: string;
  source_name: string;
  source_url: string;
  source_date: string;
}

export interface RunTripwire {
  id: string;
  status: TripwireStatus;
  prior_status?: TripwireStatus;
  status_score: number;
  changed: boolean;
  direction?: Direction;
  rationale?: string;
  evidence?: Evidence[];
  discriminators_applied?: string[];
  contrary_evidence?: Evidence[];
  unscoreable_reason?: string;
  data_request?: string;
  visibility: Visibility;
}

export interface RunTier {
  id: number;
  load: number;
  contribution: number;
  prior_load?: number;
}

export interface CascadeFactor {
  proposed: number;
  tier: number;
  load: number;
}

export interface CascadeOverride {
  factor: string;
  proposed: number;
  applied: number;
  justification: string;
  author: string;
  timestamp: string;
}

export interface CascadeContribution {
  spec_to_fundamental: Record<string, CascadeFactor>;
  fundamental_to_buy_and_hold: Record<string, CascadeFactor>;
  override: CascadeOverride | null;
}

export interface RunFile {
  schema_version: string;
  framework_version: string;
  thresholds_hash: string;
  run_date: string;
  prior_run_date: string | null;
  source_window_start: string | null;
  supersedes?: string;
  index: {
    score_raw: number;
    score_display: string;
    prior_score_raw?: number | null;
    delta?: number | null;
    band: string;
    band_changed: boolean;
    coverage: { scored: number; total: number; unscoreable_ids: string[] };
  };
  tiers: RunTier[];
  tripwires: RunTripwire[];
  status_changes: {
    id: string;
    from: TripwireStatus;
    to: TripwireStatus;
    direction: Direction;
    seller_class_activated?: SellerClass;
    cascade_note?: string;
  }[];
  held_with_contrary_evidence: {
    id: string;
    status: TripwireStatus;
    note: string;
    source_url: string;
    source_date: string;
  }[];
  watch_items: { rank: number; tripwire_id: string; text: string; visibility: Visibility }[];
  reconciliation_flags: {
    tripwire_id: string;
    severity: Severity;
    text: string;
    requires?: string;
    opened_on: string;
    status: 'open' | 'resolved';
    visibility: Visibility;
  }[];
  catalysts: { date: string; event: string; tripwire_ids: string[]; confidence: Confidence }[];
  cascade_contribution: CascadeContribution;
  narrative: { bottom_line: string; quiet_week: boolean };
  publication: {
    digest_path?: string | null;
    verifier: string | null;
    verified_at: string | null;
    briefing_sent: boolean;
  };
}

/** §8 — required verbatim on every surface: page, historical view, card, email. */
export const AI_BUBBLE_DISCLOSURE =
  'The AI Bubble Trigger Index is an internal monitoring framework published for informational ' +
  'purposes as general-circulation research. It is not personalised investment advice, not a ' +
  'prediction, and not a trading signal. Thresholds are pre-committed criteria; modifications ' +
  'follow a published protocol requiring written justification, a 48-hour cool-off, and a ' +
  'countersignature. Investing involves risk, including possible loss of principal.';
