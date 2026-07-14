# Ekantik Correction Dashboard v2 — Portal-Integrated Live System

Production correction-intelligence system for the Ekantik Correction Intelligence Program.
Ingests a fixed attribute set daily, runs a pre-committed tier state machine, renders the
`/dashboard/correction` page, posts the automated Friday sentinel to Slack, and maintains an
immutable audit log for falsifiability tracking.

**Authority:** Correction Dashboard System Specification v1.0 (Jul 14, 2026) + *The Anatomy of
Correction Depth* backtest (54 events, 1974–2026). If anything here conflicts with the Spec,
the Spec wins.

## Design law

Every threshold and transition rule is **FROZEN** — fixed by the 50-year backtest before the
first live reading. They are seeded into `cd_thresholds` and the application makes silent
change structurally impossible:

- `frozen=true` rows reject `UPDATE`/`DELETE` at the Postgres level (trigger).
- The only mutation path is `cd_threshold_changes`: written justification (≥50 chars) →
  48-hour minimum cool-off (DB-enforced) → countersignature by a second person (proposer
  cannot countersign; DB-enforced) → `cd_apply_threshold_change()` RPC.
- Both workers and the portal run `assertThresholdIntegrity()` at load: any divergence between
  `cd_thresholds` and the committed constants without an applied, countersigned change row
  aborts the run.
- `cd_tripwire_log` and `cd_state_log` are append-only (DB triggers).
- The VIX confirmer is structurally excluded from state transitions: the transition function
  consumes a type that does not contain confirmer fields, and a regression test asserts VIX can
  never change a transition.

## Repository layout

```
packages/engine        Pure tier state machine, tripwires, depth engine, indicator math
  src/thresholds.ts    FROZEN thresholds + integrity guard
  src/stateMachine.ts  computeState(readings, priorState) — Spec §3
  src/depthEngine.ts   Range-typed depth engine — Spec §4 (never a point estimate)
  test/replay/         54-event replay harness (M1 regression gate, runs in CI)
apps/worker            Railway worker (BullMQ): ingestion, sentinel, retirement checks
apps/portal            Next.js 14 App Router portal — /dashboard/correction + cron/admin routes
supabase/migrations    Schema, governance triggers, RLS, threshold seed
```

## The 54-event replay harness (M1 gate)

`packages/engine/test/replay/` replays the full Appendix A catalog through `computeState` and
asserts, per event, the documented tier, close-basis depth, ordered transitions, and full
de-escalation — plus the failed-recovery cohort statistics on the 1990–2022 daily events
(n = 33): **P(≥10% | ESCALATE) = 58% vs P(≥10% | CLEAN) = 7%**.

Because this environment cannot fetch historical daily closes, the harness drives the machine
with **deterministic synthetic paths reconstructed from the catalog** (peak/trough dates,
depth, and the documented clean-recovery/failed-bounce router outcomes). This validates the
machine's mechanics against 50 years of documented history and is a permanent CI test. When a
real daily S&P close series is available, replaying actual data supersedes the reconstruction —
the harness accepts any daily close series.

Run it:

```sh
npm ci
npm run build --workspace @ekantik/correction-engine
npm test          # 296 tests incl. 252 replay assertions
```

## Deployment

1. **Supabase** — apply `supabase/migrations/0001_correction_dashboard.sql` (tables, triggers,
   RLS internal-only, threshold seed). Create a private storage bucket `cd-exports`.
2. **Railway worker** — deploy `apps/worker` (`npm run build && npm start`) with env from
   `.env.example`. It consumes the `correction-dashboard` BullMQ queue on Upstash Redis.
3. **Vercel portal** — deploy `apps/portal`. `vercel.json` schedules the crons (UTC ≈ CT+5,
   adjust for CST if desired):
   - daily ingest 22:35 UTC Mon–Fri → post-close evaluation; daily mini-sentinel auto-activates while Tier ≥ 1
   - Friday sentinel 22:00 UTC Fri → three-message threaded Slack post (auto-send)
   - weekly ingest + retirement checks Saturday; annual export Jan 2
4. **Decommission the v1 scheduled prompt** once the first automated Friday sentinel posts
   correctly (M3): remove the scheduled-prompt task that runs
   `correction-dashboard-sentinel-v1-task-prompt.md`.

## Data set (Spec §2)

FRED: `SP500`, `BAA`, `DGS10`/`GS10`, `BAMLC0A0CM`/`BAMLH0A0HYM2` (**context only until the
Jan-2027 calibration — no trigger status, enforced in code**), `CPIAUCSL` (provisional),
`UNRATE` (real-time Sahm), `IC4WSA`, `VIXCLS`, `T10Y3M`. CFTC COT (ES net specs z-score),
multpl CAPE scrape, ICI (probation). Alight 401(k), dealer gamma, revision breadth, and
confirmed-higher-low are human-entered in the admin drawer and render **N/A when stale > 14
days**. Ingestion is fail-open: a failed series writes a `DATA_GAP` row and never blocks the
pipeline.

## Governance operations

- **Propose:** admin drawer → justification, proposer.
- **Countersign:** second person sets `effective_at` (≥ proposed + 48h; DB rejects less).
- **Apply:** `cd_apply_threshold_change(id)` — the only path that can touch a frozen row.
- **Retirement alerts** (Saturday check, Slack): CREDIT_IMPULSE 3 consecutive live triggers
  with no ≥10% event in 9m; SAHM second consecutive FIRED with no recession in 12m;
  FAILED_RECOVERY live P(≥10%|ESCALATE) < 35% over any 10 escalations; RATE_SHOCK 2 failed
  combined flags. Alerts **propose** suspension; nothing auto-modifies.
- **Annual re-validation** (January): the year's events + readings exported to
  `cd-exports/revalidation/<year>.json` for the backtest re-run.

## Definition of done (Spec §8)

- M1 — ingestion + schema + state machine with the 54-event replay passing ✅ (CI)
- M2 — dashboard page live (internal), FP ledger populated from live triggers
- M3 — sentinel automation replaces the v1 scheduled prompt (decommission it in the same PR)
- M4 — governance flow tested end-to-end; retirement alerts wired

Internal research instrument. Not investment advice.
