# @freedom/engine — Freedom Command calculation engine

First build increment of **Freedom Command** (Financial Freedom Command Center by
Ekantik), per the handoff in `docs/freedom-command/`:

> Build in spec §16's MVP order, starting with `@freedom/engine` **test-first**
> against the §15.1 golden numbers.

**Authority:** `docs/freedom-command/Freedom_Command_SaaS_Specification.md`
(v2.1, merged). Where anything here disagrees with the spec, the spec wins.
The single-file React prototype is a behavioral reference only; none of its
code or data enters this package (handoff rule 2).

## What this package is

The pure calculation core of spec §7.2 — **deterministic, zero I/O, no clock**.
One entry point:

```ts
import { computeEngineResult } from "@freedom/engine";
const result = computeEngineResult(input); // one consistent EngineResult
```

Any input mutation reruns the whole graph; every module renders the same
`EngineResult` object, so surfaces cannot disagree (spec P3). The engine is
versioned (`ENGINE_VERSION`, plus policy versions on every result) so snapshots
can record exactly what computed them (§15.6).

Implemented (MVP recompute graph + the §15.1-pinned math):

| Area | Module | Spec |
|---|---|---|
| Annuity/projection core: `m*`, glide path, gFM, zero-rate branches | `annuity.ts` | §M3, App. A |
| Amortization, payoff strategies, interest leak, time-bounded debt service | `debts.ts` | §M5 |
| Model B invested stream with obligation drop-off | `modelB.ts`, `goals.ts` | §M11, §M12 |
| Cash-flow-matched comparator, NPV/break-even, prepay-vs-invest verdicts | `comparator.ts` | §5.7, §M5 |
| Depletion solve, funded ratio, guardrail corridor, buffer years | `distribution.ts` | §M20/21, §9.1 |
| SSA claim factors + nominal breakevens (education) | `benefits.ts` | §M22 |
| Legacy gap/earmark model, value to heirs | `legacy.ts` | §M24 |
| Estate readiness with applicability reweighting, beneficiary audit | `estate.ts` | §M23 |
| 16-rule scorecard (applicability-aware) | `rules.ts` | §5.4, §M16 |
| Phase engine (canonical five phases) | `phase.ts` | §5.2 |
| GateEngine primitive (rollup + binding constraint) | `gates.ts` | §5.6 |
| Resilience: tripwires, insurance grid, ranked actions | `resilience.ts` | §M14, §9.2 |
| Freedom Health Score (reweighting; display-band cap) | `score.ts` | §M15, App. A |
| Pace/funded bands + drift-flag catalog | `offtrack.ts` | §9.1–9.2 |
| Versioned Threshold/Score/Spending/Flag policies | `policies.ts` | §5.2, §16.1 |
| Education identities (volatility drag, rule of 72) | `education.ts` | §5.5 |
| V2 refinance screen (release-gated by the app layer) | `refinanceScreen.ts` | App. A |

## Testing (the golden-number method, §15)

- `test/golden.test.ts` — every §15.1 golden seed row, to the stated tolerance.
- `test/deprecated-prototype/` — the prototype's "effective cost" and "~2×"
  shortcuts, implemented **only here** as regression fixtures proving they must
  never ship (§5.7), plus a guard test that scans `src/` for them.
- `test/property.test.ts` — m*/projection round trips, amortization inverses,
  no-NaN grid, band monotonicity, dead-band stability.
- `test/verdict-flips.test.ts` — every threshold crossed in both directions.
- `test/p6-fresh-household.test.ts` — a brand-new household renders zero
  BLOCKED/red states anywhere (§P6).

```sh
npm test --workspace @freedom/engine
```

## What is deliberately NOT here

- I/O, persistence, auth, tenancy, notifications — the engine is pure math;
  the SaaS layers around it are later increments (§14).
- The M20/M21 retirement models ship as **candidate policies** and require
  independent retirement-model review before any V1 consumer surface (§M20/21).
- Anything from spec §5.7's deprecated list, the Systems Index (V2 coach
  artifact), policy/LFIR content, and the Advanced Strategy Lab (release-gated
  V2).

## Conventions

Rates are fractions (`0.065` = 6.5%); monthly rate = annual ÷ 12. The plan is
denominated in today's dollars at net real return; nominal-vs-real quantities
are never mixed in one comparison (§5.1). Unanswered data yields `NOT_YET` —
never `BLOCKED` (§P6). Missing score components reweight; they are never zero
(§M15).
