# Financial Freedom Command Center — SaaS Product Specification

**Product:** Financial Freedom Command Center by Ekantik  
**Short product name:** Freedom Command  
**Category:** A financial-wellness operating system for American households  
**Version:** 2.1 · July 2026 (merged)
**Prepared for:** AI-assisted development team
**Lineage:** v1.1 (original five-pillar specification) → v2.0 (independent second-opinion review and fork, July 29 2026) → **v2.1 (this document — the merge)**. v2.1 adopts v2.0 nearly whole, restores concrete defaults and golden seed values that v2.0 had generalized away, corrects two internal inconsistencies in v2.0, returns the public-name decision to the founder (§20), and adds the adjudication log (Appendix D). One document is authoritative: this one.
**v2.0 change log:** resolves prototype/spec contradictions; adds community, household roles, safe accountability, model governance, claims governance, product operations, tenancy, entitlements, and abuse prevention; replaces the prototype's amortized-cost shortcut with cash-flow-matched comparisons; separates the objective Freedom Health Score from the prototype's subjective 300-point workbook; narrows the first release to a credible product wedge; and strengthens consumer, insurance, marketing, privacy, security, accessibility, and AI guardrails.
**Source system:** The Ekantik Financial Freedom Command Center single-file React prototype. It is a rich product-discovery artifact and formula reference, not production evidence, a compliance approval, or a production architecture.

---

## 0. How to read this document

This specification is written to be handed directly to an AI developer (or AI-assisted team). Conventions:

- **MUST / SHOULD / MAY** carry RFC-2119 meaning. MUST items are launch-blocking for the phase they appear in.
- Every module spec follows the same template: *Purpose → User stories → Inputs → Calculations → Outputs & UI → Integrations → Alerts → Phase availability → Build phase*.
- A formula is **normative only when this document explicitly labels it normative and it has passed both numerical verification and product/model-risk review**. Reproducing a prototype calculation in a second programming language proves consistency, not economic validity. Prototype-only formulas identified in §5.7 MUST NOT ship.
- Rates are stored as **fractions** (0.065 = 6.5%), never as percentages. This convention prevented an entire class of bugs in the reference system. Monthly rate = `apr / 12`.
- The five pillars — **Save More, Earn More, Grow More, Retire Free, Build a Legacy** — are the product's public architecture: three engines that build the capital, two destinations that convert it into a durable retirement paycheck and a transferred legacy. The Spine (Plan) and the Loop (Measure → Flag → Correct → Commit) are what make it an operating system instead of a calculator.
- Delivery stages are **Founder Pilot → Public MVP → V1 → V2** (§16). When a requirement names a later stage, do not pull it forward without a written product, compliance, and model-risk decision.

### 0.1 Authority and conflict rules

This v2.0 document is the build authority. When the prototype and this specification disagree:

1. This specification wins.
2. Safety, privacy, compliance, and model-governance requirements win over feature copy and engagement goals.
3. A household's source data wins over a derived value; a frozen historical snapshot wins over a recomputation of history.
4. Community content and AI output never override the deterministic engine.
5. No disclaimer turns a recommendation into “education.” Product behavior, context, personalization, and calls to action determine the risk classification; counsel must review high-risk surfaces before release.

### 0.2 Product decisions resolved in v2.0

| Decision | v2.0 resolution |
|---|---|
| Public name | **Founder decision — open (§20 register)**. Candidates: *Financial Freedom Command Center* (long form) / *Freedom Command* (short form). Trademark/domain review is a launch gate either way; this document uses "Freedom Command" as the working short name. |
| Product wedge | The dated plan + one next action + weekly/quarterly accountability loop. Calculators support the loop; they are not the product. |
| Canonical phases | **Stabilize → Secure → Accumulate → Live Free → Legacy** (§5.2). Old prototype/spec labels are aliases only. |
| Scores | **Freedom Health Score (0–100)** is the consumer score. The prototype's **Systems Index (0–300)** is a separate, optional coach/workbook diagnostic and is never combined with it (§5.8, M15). |
| Community | Private-by-default accountability circles, phase cohorts, moderated learning rooms, and expert office hours; never a public leaderboard of wealth or returns (§10.5–§10.10). |
| Advanced strategies | Isolated, disabled by default, counsel-reviewed, evidence-versioned, and unavailable until explicit release gates pass. Policy/LFIR content is not part of MVP or V1. |
| Automation | The product may remind, calculate, import, and attest. It does **not** move money, execute a “dead-man switch,” release a stake, trade, file, claim benefits, or change a policy. |
| Data | Manual and CSV first. Aggregation is provider-isolated and gated on the then-current legal/provider environment; it is not an MVP dependency. |
| AI | A constrained explanation and navigation layer grounded in approved content and EngineResult. It cannot create or alter financial truth, verdict thresholds, community sanctions, or transactions. |

### 0.3 Prototype disposition

The HTML prototype contains sample/person-specific household values, policy illustration data, return labels, commitments, and localStorage state. None may seed a production account, demo visible to the public, test fixture outside a synthetic-data package, marketing claim, or default assumption.

Prototype UI/code may inform flows and regression cases only after:

- product copy passes content/claim review;
- formulas pass §15 model-risk review;
- sample data is replaced with clearly synthetic, internally consistent personas;
- accessibility and responsive behavior are rebuilt and tested;
- localStorage persistence is replaced by the authorized SaaS data model;
- all features are mapped to §16 release gates.

---

## 1. Mission and market context

### 1.1 The mission

Help as many Americans as possible become financially free — not vaguely "someday," but **by a date they choose, on a plan that tells them the truth about whether they will make it.**

Financial freedom means a household has enough resilient income, liquidity, protection, and choice that paid work becomes optional on terms the household defines. It does **not** mean maximizing net worth, using leverage, buying a particular product, retiring early at any cost, or achieving a date promised by Ekantik.

**Primary user outcome:** each active household can answer four questions from current data:

1. Where are we now?
2. What date is our current behavior likely to produce?
3. What is the single safest high-leverage action next?
4. Who or what will help us follow through?

**Product non-goals:** brokerage, custody, tax preparation, credit repair, debt settlement, insurance quoting, estate-document drafting, benefits filing, money movement, or individualized security/product recommendations. These require a separate, expressly authorized and appropriately regulated service.

**Outcome hierarchy:** prevent ruin → create margin → increase the surplus → compound prudently → convert capital into durable spending → transfer intentionally. “As soon as possible” is optimized only inside the user's declared risk, liquidity, family, health, and lifestyle constraints.

### 1.1.1 Claims and evidence governance

Every externally visible market statistic, legal/tax statement, benchmark, “rule,” product comparison, and numerical example MUST be registered in a `ContentClaim` record:

`{id, exactClaim, sourceUrl, sourceType, jurisdiction?, effectiveFrom, reviewedAt, nextReviewAt, owner, reviewer, riskTier, supersededBy?}`.

- Tier A (legal, tax, benefits, insurance, performance, guarantees) requires qualified human review before publication and at least annual review.
- Tier B (market statistics and competitive pricing) requires a primary or clearly labeled secondary source and a dated “as of” label.
- Tier C (evergreen education) requires editorial review.
- Expired Tier A/B claims automatically unpublish or display “review required”; they do not silently persist.
- Appendix B is a reading list, not a substitute for the claim registry.

### 1.2 The situation (research snapshot; re-verify before publication)

The American household is running without margin:

| Signal | Figure | Source |
|---|---|---|
| Would pay a $1,000 emergency from savings | **30%** | Bankrate 2026 Emergency Savings Report (survey Dec 2025) |
| Have **no** emergency savings at all | **24%** | Bankrate 2026 |
| Uncomfortable with their emergency savings level | **60%** | Bankrate 2026 |
| Self-report living paycheck to paycheck (broad measure) | **~62%** | LendingClub / PYMNTS, May 2026 |
| Cannot cover a $400 emergency with cash equivalent | **33%** | Federal Reserve SHED 2025 |
| Zero monthly surplus, 3-month average (card-data measure) | **29%** | Bank of America Institute, 2026 |
| US personal saving rate | **2.6%** of disposable income | BEA, April 2026 |
| Median household retirement savings | **$87,000** (55–64 cohort: $185,000) | Federal Reserve SCF |
| Have a will | **24%** | Caring.com Wills & Estate Planning Study, 2025 |

Two structural conclusions drive the product:

1. **The problem is not information.** Calculators are free and everywhere. The gap is *operational*: no ordering of moves, no cadence, no feedback loop, no consequence for drift. People don't fail the math; they fail the follow-through.
2. **The problem is not only the poor.** The paycheck-to-paycheck share includes high earners; the binding constraint is almost always behavior and structure (savings rate, debt architecture, no automation), not income alone.

### 1.3 The competitive gap (July 2026 research hypothesis; refresh quarterly)

| Tool | Price | What it is | What it is not |
|---|---|---|---|
| Boldin PlannerPlus | $120/yr | Retirement scenario modeling, Roth/tax optimization | Not a behavior system; no accountability loop |
| ProjectionLab | $109/yr | Monte Carlo projections for the FIRE community | Models outcomes; never tells you what to do Monday |
| Pralana | $119/yr | Actuary-grade projection accuracy | Same gap |
| MaxiFi | $149–309/yr | Economics-based lifetime planning for high earners | Same gap |
| YNAB / Monarch | $99–180/yr | Budgeting / expense tracking | Rear-view mirror; no freedom plan, no phases, no verdicts |

**Competitive thesis (validate continuously):** most planning and budgeting tools emphasize modeling or transaction history. Freedom Command differentiates through a phase-gated sequence, transparent condition states that can block unsafe exploration, a named binding constraint, and a closed accountability loop. This is a hypothesis to test through win/loss research—not an unqualified claim that no competitor has any such behavior.

### 1.4 Product one-liner

> **Freedom Command turns financial freedom from an aspiration into an operated system: a dated plan, three engines of execution — Save More, Earn More, Grow More — and a quarterly loop that measures your pace, flags drift early, names your binding constraint, and holds you accountable to the date you chose. Then it carries you across the date: a retirement paycheck engineered to survive bad markets, and a legacy that is pre-funded, documented, and taught — not merely left behind.**

---

## 2. Product thesis and non-negotiable design principles

These are product-level laws. Every feature PR should be checkable against them.

**P1 — Sequence before optimization.** The system enforces an order of operations: *secure the floor before reaching for the ceiling.* Users in Stabilize are not shown personalized leverage strategies. Advanced content is absent until release/eligibility gates pass, with safer prerequisites explained. Derived from Falsify → Fortify → Explore.

**P2 — Verdict honesty (the system can refuse false certainty).** Every evaluated surface includes negative, neutral, and insufficient-data states—`CLEAR / WATCH / BLOCKED / NOT_YET`, “favored in this scenario / close call,” or “on track / watch / off track.” Dead bands incorporate uncertainty and costs. Recommendation-like `PROCEED / HOLD / STOP` wording is not a default consumer pattern (§12).

**P3 — One source of truth, everywhere.** A single normalized Plan (§7) feeds every module. A debt edited anywhere updates the trajectory, the rules scorecard, the freedom score, the alerts — instantly and consistently. No module keeps a private copy of shared state.

**P4 — Name the binding constraint.** Whenever the system evaluates multiple conditions, it surfaces *the one that binds* — the single next action with the highest leverage — not a wall of red. (Reference pattern: the gate engine's "Binding constraint" card and the resilience engine's ranked next-best-action.)

**P5 — A date, not a dream.** Everything anchors to the user's Freedom Date. Every lever is denominated in **months sooner / months later**. Every quarter answers one question: *are we still going to make the date?*

**P6 — Unanswered ≠ failing.** A question the user hasn't answered scores as WATCH or NOT YET, never as BLOCKED. A brand-new user must never open the app to a wall of alarms about data they haven't entered. (Hard-won reference-system lesson.)

**P7 — Educational honesty is the compliance posture.** The product teaches, computes, and flags; it does not give individualized investment, tax, legal, or insurance advice (§12). The honesty layer ("where this breaks — read before acting") ships on every strategy surface and is never removed to make a number look better.

**P8 — Time and consistency matter, but do not erase risk.** Starting earlier and sustaining a surplus usually expand the feasible set. They do not make a negative spread positive, turn a non-guaranteed return into a guarantee, or justify unsuitable leverage. Product implication: help users establish a safe repeatable contribution quickly, then show uncertainty rather than rate-chasing.

**P9 — Safety before speed.** “Sooner” is never optimized by silently increasing leverage, concentration, assumed return, withdrawal rate, or insurance premium burden. Every acceleration result carries its effect on liquidity, risk, and plan robustness. A faster fragile plan ranks below a slower resilient plan.

**P10 — Progressive disclosure, not a 25-tab cockpit.** The prototype proves the domain breadth but not the information architecture. The default consumer navigation is **Today · Plan · Money · Protect · Review · Community · Learn**. Modules appear contextually inside those jobs. Phase-locked content may be previewed with a reason and prerequisite; users are not asked to learn the full system before taking the next action.

**P11 — Private by default.** Exact balances, income, debt, account names, policy data, identity, and documents are private to the household unless the user grants a named person a specific scope for a specific duration. Community never receives exact financial data by default. Share links are revocable, expiring, watermarked, and excluded from search indexing.

**P12 — Dignity, agency, and accessibility.** Copy describes conditions, not character: “cash reserve below target,” never “undisciplined.” A user can pause reminders, renegotiate a commitment honestly, leave a circle, remove a verifier, and choose a slower date. Core flows target WCAG 2.2 AA and work with keyboard, screen reader, zoom, reduced motion, and accessible authentication.

**P13 — Explainable and contestable.** Every phase, score, flag, recommendation-like next action, and community moderation decision shows the inputs, rule, threshold, timestamp, and a correction/appeal path. Users can correct source data without editing derived outputs.

**P14 — Separate education, planning, and regulated service.** UI, routing, analytics, staff permissions, records, and consent MUST distinguish: (a) self-directed education/planning software, (b) human coaching/accountability, and (c) any advisory or insurance service. Cross-sell consent is explicit; SaaS data is not automatically visible to advisory personnel.

**P15 — Community is for execution, not promotion.** Reputation comes from helpfulness, consistency, and safe participation—not account size, returns, leverage, referrals, or product sales. Unsolicited DMs, lead harvesting, performance boasting without context, affiliate links, securities/insurance solicitation, and requests for money are prohibited.

---

## 3. Users and personas

Launch audience: **direct-to-consumer, self-serve** (decided). Advisor/coach tier follows in V2.

| Persona | Situation | Phase at signup | Primary jobs-to-be-done |
|---|---|---|---|
| **Maria, 29** — "Get me off the treadmill" | $68K salary, $9K credit cards @ 24%, no emergency fund, saves ~0% | Stabilize | Stop the bleeding; starter buffer; control high-cost debt; see a credible path |
| **Devon & Ash, 38** — "We earn well; where does it go?" | $210K HHI, $40K student loans, 401(k)s on autopilot, no plan, no date | Secure → Accumulate | Get a dated plan; automate savings; know if they're on pace; quarterly rhythm |
| **Priya, 51** — "Can I actually be free by 62?" | $480K saved, mortgage, wants $80K/yr passive by 62 | Growth | Feasibility verdict; which levers close the gap; sequence-of-returns protection; measure quarterly |
| **Frank & Elena, 63** — "Make it last, then pass it on" | $1.1M saved, retiring in 18 months, two adult kids, no will | Accumulate → Live Free (Red Zone) | Retirement income design; sequence-risk plan; benefits education; estate readiness; what may reach the kids |

All four use the same system; the **phase engine** (§6, M1) shows each a different front door and locks what shouldn't be touched yet.

### 3.1 Household and platform roles

Authorization is household-scoped and deny-by-default. A person may hold multiple roles, but staff roles can never be inferred from a consumer role.

| Role | Default access | Explicit exclusions |
|---|---|---|
| Household owner | Billing, members, all household plan data | Cannot expose another adult's individually restricted notes without consent |
| Household co-owner | All shared plan data; may edit | Cannot change billing owner or export/delete the household alone when dual approval is enabled |
| Contributor | Edit selected modules | No member, billing, export, document-vault, or sharing administration |
| Viewer | Read scopes granted by owner | No exact values unless the grant includes them |
| Accountability partner | Pace band, commitments, streak, check-in note by default | No balances, account names, documents, projections, or DMs outside the relationship |
| Circle member | Alias, phase/cohort, selected commitments and badges | No household financial fields |
| Facilitator/coach | Cohort roster and explicitly shared progress | No product sales, custody, trading, or silent access to financial data |
| Moderator/trust & safety | Reported community content and minimum account metadata needed to investigate | No household financial plan access |
| Support | Time-bound, user-approved impersonation/support session with audit banner | No secrets, full exports, or document contents by default |
| Compliance/content reviewer | Claims, approved content, disclosures, versions | No household data except a separately authorized investigation |
| Platform admin | Operational configuration | Production data access only through just-in-time elevated workflow with reason, approval, expiry, and audit |

**Household rules**

- Every financial entity belongs to exactly one `Household`; every query is tenant-filtered server-side and covered by row-level authorization tests.
- Adult partners receive separate identities. Shared credentials are prohibited.
- Invites expire in 7 days, are single-use, and show the granting scopes before acceptance.
- Removing a member revokes sessions and share grants immediately but preserves the audit trail.
- Household export and deletion define how jointly owned data, personal notes, community posts, and legally retained billing/security records are handled.

### 3.2 Inclusion requirements

- Support single adults, couples, multigenerational households, divorced/co-parenting households, variable/gig income, and people without investable assets.
- Do not assume home ownership, employer benefits, citizenship, a traditional retirement age, children, marriage, or access to a financial professional.
- Core planning works with estimates and ranges; exact account aggregation is never required for activation.
- English launches first; content architecture, currency/date formatting, reading level, and UI layout MUST be localization-ready. Spanish discovery and usability research occur during the Founder Pilot.

---

## 4. Product architecture overview

```
┌────────────────────────────────────────────────────────────────────┐
│                        THE SPINE — PLAN                            │
│  M1 Phase Diagnostic → M2 Freedom Plan (Number·Date·Mode)          │
│                      → M3 Trajectory (projection + actuals)        │
├──────────────────┬──────────────────────┬──────────────────────────┤
│  PILLAR 1        │  PILLAR 2            │  PILLAR 3                │
│  SAVE MORE       │  EARN MORE           │  GROW MORE               │
│  M4 Money Flow   │  M8 Income Streams   │  M10 Portfolio           │
│  M5 Debt         │  M9 Earn Engine      │  M11 Compounding Engine  │
│     Burndown     │     (levers,         │  M12 Big-Ticket Goals    │
│  M6 Savings &    │      playbooks,      │  M13 Scenarios &         │
│     Allocation   │      idea matrix)    │      Accelerator         │
│  M7 Automation   │                      │                          │
├──────────────────┴───────────┬──────────┴──────────────────────────┤
│  PILLAR 4 — RETIRE FREE      │  PILLAR 5 — BUILD A LEGACY          │
│  (the arrival)               │  (the transfer)                     │
│  M20 Readiness & Income Plan │  M23 Estate Readiness &             │
│  M21 Drawdown & Guardrails   │      Beneficiary Audit              │
│  M22 Social Security &       │  M24 Legacy Funding &               │
│      Benefits Timing         │      Value to Heirs                 │
│                              │  M25 Giving & Family Governance     │
├──────────────────────────────┴─────────────────────────────────────┤
│                    THE SHIELD — PROTECT                            │
│  M14 Resilience: emergency runway · insurance · concentration ·    │
│      tripwires · ranked next-best-actions                          │
├────────────────────────────────────────────────────────────────────┤
│               THE LOOP — MEASURE · FLAG · CORRECT · COMMIT         │
│  M15 Freedom Score   M16 Operating Rules Scorecard (16 rules)      │
│  M17 Quarterly Review & Operating Rhythm                           │
│  M18 Off-Track Engine & Alerts   M19 Accountability & Commitments  │
│  — mode-aware: ACCUMULATION ↔ RED ZONE ↔ DISTRIBUTION —            │
├────────────────────────────────────────────────────────────────────┤
│  V2: ADVANCED STRATEGY LIBRARY (gated) — strategy gate engines,    │
│  prepay-vs-compound comparator deep mode, policy-based strategies  │
│  (education-only, carrier-numbers-only rule)                       │
└────────────────────────────────────────────────────────────────────┘
```

The Dashboard (Home) is not a module; it is a composition: phase banner, freedom date + pace verdict, #1 next-best-action, score, tripwire count, and this week's commitment. One screen answers: *where am I, am I on pace, what is the one thing to do next?*

### 4.1 Consumer information architecture

The module map is an implementation taxonomy. It MUST NOT become the default sidebar.

| Destination | User question | Primary content |
|---|---|---|
| **Today** | What needs my attention now? | Pace/funded verdict, one next action, commitment, material tripwires, data freshness |
| **Plan** | What does freedom mean for us and when? | Phase, number/range, date, trajectory, goals, scenarios |
| **Money** | How do we create and route surplus? | Cash flow, debt, savings, automation plan, income, portfolio summary |
| **Protect** | What could reset the clock? | Runway, insurance attestations, concentration, draw order, estate readiness |
| **Review** | Are we doing what we said? | Weekly check-in, monthly close, quarterly report, scores, commitments |
| **Community** | Who will help us follow through safely? | Private circles, phase cohorts, learning rooms, office hours |
| **Learn** | Why does this rule exist? | Versioned curriculum, glossary, assumptions, source/disclosure panels |

The home screen shows no more than one primary CTA and three secondary alerts. Advanced strategy content is absent—not merely visually locked—until the entitlement, phase, data-completeness, jurisdiction, and release gates all allow it.

### 4.2 First-run journey

1. **Promise and boundary (1 min):** what the product does/does not do; privacy choice; no bank connection required.
2. **Household baseline (5–8 min):** income range, essential spend range, accessible reserve, high-interest debt, current long-term capital, dependents/protection attestations.
3. **Define freedom (3–5 min):** desired after-tax lifestyle range, date range, motivation, non-negotiables.
4. **Result:** phase, estimated range—not false precision—date feasibility, assumptions, confidence/data-freshness label, and one next action.
5. **Activation:** user accepts/edits the next action and sets the first weekly check-in. Community/circle is offered after the private plan exists, never as a prerequisite.

Progress is saved after each step. “Skip for now” is available except for consent, identity, and the minimum inputs required for the requested calculation.

---

## 5. Core domain concepts (normative definitions)

### 5.1 The vocabulary

| Term | Definition | Formula |
|---|---|---|
| **Freedom Spending Need** | Annual after-tax household spending in today's dollars after subtracting reliable non-portfolio income; entered as a range | — |
| **Planning Withdrawal Rate** | User-selected educational shorthand for an early capital target; never described as “forever” or “safe.” Guided range and default are versioned assumptions approved by model-risk/content review. | — |
| **Freedom Number (shorthand)** | Early planning estimate, not a retirement-readiness verdict | `freedomNumber = freedomSpendingNeed / planningWithdrawalRate` |
| **Freedom Date** | User-chosen target date. The system's anchor. | — |
| **Coverage Ratio** | Share of freedom spending need covered by reliable non-portfolio income under the selected scenario | `reliableNonPortfolioIncome / freedomSpendingNeed` |
| **Freedom Progress** | Capital progress toward the number | `currentCapital / freedomNumber` |
| **Required Pace** | Monthly contribution that reaches the number by the date | solve `m*` in the projection recurrence (§6 M3) |
| **Glide Path** | Capital-by-month curve implied by required pace | `G(t)` per §9.1 |
| **Pace Ratio** | The master on-track metric | `currentCapital / G(now)` |
| **Binding Constraint** | The single condition that most limits progress right now | first FAIL, else first WATCH, in priority order |
| **Tripwire** | A red-flag condition requiring immediate attention regardless of trend | §9.2 catalog |
| **Plan Mode** | Which regime the Loop runs in | `ACCUMULATION` → `RED ZONE` (within 5 years either side of retire date) → `DISTRIBUTION` |
| **Planning Spend Capacity** | Scenario spend supported by capital under the selected planning withdrawal rate; not a guarantee or “forever” amount | `capital × planningWithdrawalRate` |
| **Withdrawal Rate** | What the user actually draws | `annualSpend / capital` |
| **Funded Ratio** | Distribution-mode master metric (replaces pace ratio) | `capital / PV(remaining planned net spend)` |
| **Buffer Years** | Down-market spending held outside volatile assets | `bufferAssets / annualSpend` |
| **Legacy Earmark Impact** | Change in assets actually reserved for legacy after applying an eligible, sourced legacy-coverage scenario | `newlyUnearmarked = max(0, priorRequiredEarmark − requiredEarmark)` (§M24) |
| **Value to Heirs** | Projected estate at any age (educational) | `capital(t) + deathBenefit − debts(t)` |
| **Estate Readiness** | Weighted completion of the estate checklist | §6 M23 scoring |
| **Data Confidence** | Quality indicator derived from completeness, source, age, and reconciliation status; never a probability of success | `HIGH / MEDIUM / LOW` |
| **Scenario** | A deterministic result under stated assumptions | not a prediction or recommendation |
| **Plan Return** | Net real return used for purchasing-power projections | `(1 + nominalGross − fees − taxDrag)/(1 + inflation) − 1` (implementation uses exact component conventions, not this display shorthand) |

**Unit convention:** the primary plan is in today's dollars using net real return. Nominal charts are optional and must be labeled. Income, spending, benefits, and goals declare whether they are nominal or real; the engine rejects mixed-unit calculations. Taxes and fees are explicit assumptions, never hidden inside a return label.

### 5.2 The five phases (gated progression)

Phases order the work. Each phase has **objective gates** where data exists plus **attestations** where the product cannot verify. A phase is a routing device, not a grade or identity. The user may inspect later education, but a gated action never implies endorsement.

| # | Canonical public phase | Internal enum | Exit gates (v2 defaults; threshold registry controls effective values) |
|---|---|---|---|
| 1 | **Stabilize** | `STABILIZE` | Essential obligations are covered by current income or an active stabilization plan; starter accessible buffer is met; no currently missed minimum payment is unresolved |
| 2 | **Secure** | `SECURE` | Personalized emergency target is on plan (default guide: 3 months); high-cost debt has a payoff plan; positive monthly surplus or a dated path to it; applicable core protection reviewed |
| 3 | **Accumulate** | `ACCUMULATE` | Positive automated/attested long-term contribution; emergency target maintained; plan return and allocation assumptions acknowledged; no unaddressed severity-1 tripwire |
| 4 | **Live Free** | `DISTRIBUTE` | Retirement/income plan is funded within the approved band; near-term spending buffer and draw order exist; healthcare/benefit gaps are acknowledged; spending guardrails are active |
| 5 | **Legacy** | `LEGACY` | Live Free remains durable; beneficiary and estate-readiness reviews are current; any legacy target is funded, revised, or explicitly waived; family/giving plan is optional, never required |

**Alias migration:** prototype `Survival / Capitalization / Accumulation / Distribution / Legacy Building` and v1.1 `Survival / Stability / Security / Growth / Legacy` map to the canonical phases above. Only the canonical labels appear in new UI, analytics, events, URLs, and support content.

**Threshold rules**

- Dollar floors and percentage heuristics are defaults, not universal truths. They live in a versioned `ThresholdPolicy` with source, rationale, effective date, and applicability.
- A $1,000 reserve, 20% savings rate, 50% essentials ratio, 10% APR, 60% income concentration, six-month runway, or 25% holding limit MUST NOT be treated as universally suitable. The product shows the default, permits a reasoned household target where safe, and still surfaces catastrophic conditions.
- Phase changes require stable evidence over the configured observation window; one imported day does not promote or demote the household.
- Missing data yields `NOT_YET`; stale data dims the result; contradictory data requests reconciliation.

### 5.3 The order of operations: Falsify → Fortify → Explore

Applied at plan level and at every big decision surface:

1. **Falsify** — define the kill criteria first (what would make this plan/move wrong?).
2. **Fortify** — secure the never-lose position (emergency runway, insurance, ruin-proofing).
3. **Explore** — only then map upside, leverage, and acceleration.

UI expression: decision cards render the three steps in that visual order; Explore content is collapsed until Fortify checks pass.

### 5.4 The Sixteen Operating Rules (the adherence engine)

Two groups; each rule evaluates to `CLEAR / WATCH / BLOCKED / NOT_YET / N_A / INFO` against live data and the effective `ThresholdPolicy`. Display applicable rules on track, e.g. “9 of 12 applicable”; never keep a fixed denominator when rules are inapplicable or unanswered.

**Foundation (industry best practices):**

| # | Rule | Test |
|---|---|---|
| F1 | Accessible reserve on target | `accessibleReserves / essentialMonthly` vs household target and policy floor |
| F2 | Planned surplus is positive | current long-term contribution/surplus vs phase-appropriate target |
| F3 | Essentials are understood and supportable | essentials ratio vs household plan; default benchmark is context, not a universal fail |
| F4 | High-cost debt controlled | no missed minimum; balances above policy APR threshold have an active payoff plan |
| F5 | Applicable downside reviewed | health/life/disability/liability needs reviewed; product ownership is not automatically required |
| F6 | Income concentration understood | top-stream share vs policy watch threshold, adjusted for number/type of streams |
| F7 | Account/tax opportunities reviewed | eligible opportunities reviewed; `N_A` when unavailable/inapplicable |
| F8 | Estate/beneficiary basics reviewed | applicable beneficiaries and core document checklist current or on a dated action plan |

**Wealth engineering (the Ekantik rules):**

| # | Rule | Test |
|---|---|---|
| W1 | Recurring leaks reviewed | interest, fees, subscriptions, and avoidable costs are measured with an owner/action |
| W2 | Tax assumptions reviewed | planning tax assumptions are current; no “tax rate near zero” target |
| W3 | Discretionary spending is planned | discretionary amount fits the cash-flow plan; asset funding is optional education |
| W4 | Big purchases have a funding plan | goal contribution is on schedule without breaking safety gates |
| W5 | Speculation limited to declared surplus | speculative amount ≤ user cap and does not reduce essential reserve/obligations |
| W6 | Long-term contribution positive | planned net real long-term contribution > 0 when phase-applicable |
| W7 | Spending-growth source understood | informational |
| W8 | Borrowing purpose/horizon reviewed | informational; no universal five-year rule |

### 5.5 The Sixteen Principles (education layer)

Ships as in-app education (tooltips, "why this rule exists" panels, and a printable reference). Each principle carries **its breaking condition on its face** — green "holds when," amber "the real trade," red "breaks when." The load-bearing quantitative ones:

- **Cash-flow timing matters:** compare strategies using the same dated cash flows. APR, total interest dollars, average balance, NPV, and investment CAGR answer different questions and are never substituted for one another.
- **A contractual cost and an uncertain return are not equal-quality numbers:** show fees, taxes, liquidity, collateral, downside cases, and a break-even return. A projected positive spread is not arbitrage.
- **Volatility drag is real:** same arithmetic mean, radically different outcomes (reference case: $300K over 30 years at a steady 4.5% → $1,123,595; alternating +24.4%/−15.4% with the same mean → $645,628).
- **A verdict must be able to say no or “insufficient evidence”:** dead bands include model uncertainty and transaction costs, not merely a fixed display threshold.

### 5.6 The strategy-gate pattern (generic primitive)

Any multi-condition evaluation renders as a **gate panel**: N gates, each `CLEAR / WATCH / BLOCKED / NOT YET`, a rollup state (`CLEAR / WATCH / BLOCKED / INSUFFICIENT DATA`), and a named binding constraint with a concrete data/action path. Gates distinguish *the user's own stated targets* from *system safety safeguards*. This pattern MUST be implemented as a reusable engine + UI component (`GateEngine`, `GatePanel`)—it powers feasibility and later strategy labs. Consumer wording that implies a recommendation requires §12 approval.

### 5.7 Prototype calculations that are not approved for production

The following prototype concepts are useful prompts for analysis but MUST NOT be implemented as normative decision rules:

1. **“Amortized money costs 55–70% of its stated rate.”** `totalInterest / (originalPrincipal × years)` is an average interest dollars ratio against the original balance. It is not an annualized borrowing cost and is not comparable to a compound investment return.
2. **The “~2× rule.”** Comparing `(1+r)^y − 1` with `effectiveCost × y` mismatches timing and risk. It can materially favor financing because the invested lump sum and debt payments are not cash-flow matched.
3. **Guaranteed-looking return ranges.** Any prototype label such as “~13–20% CAGR,” “~4% perpetually,” “tax-free,” or “guaranteed floor” is prohibited unless it is a faithful display of a dated authoritative source, clearly separated into guaranteed/non-guaranteed components, and approved for that exact context.
4. **Return-as-skill scores.** A self-rated 0–10 lever or a benchmark return does not establish expected future return, suitability, or plan feasibility.
5. **Legacy release shortcut.** Death benefit does not automatically make an arbitrary amount of portfolio capital spendable; policy duration, loans, premiums, in-force status, taxes, ownership, and the assets actually earmarked for legacy matter.

**Approved comparator pattern (normative method, implementation details model-reviewed):**

- Define two mutually exclusive strategies from the same decision date.
- Match all cash flows by date: upfront cash, periodic debt payment/extra payment, fees, taxes, insurance/policy premiums, contributions, terminal balances, liquidity constraints, and any payoff/closing cost.
- Compare deterministic scenarios using NPV at a disclosed discount rate and XIRR/MIRR where appropriate; present a break-even return and sensitivity table.
- Investment returns are net of fees/tax assumptions and shown in downside/base/upside cases. Debt APR/cost is contractual where known. Risk, liquidity, collateral, and ruin conditions are separate gates; a favorable NPV cannot clear a failed safety gate.
- The user chooses assumptions within reviewed bounds; the product never defaults to a proprietary or unusually high return.

### 5.8 Two scores, never one blended number

| Score | Purpose | Range | Source | Public use |
|---|---|---:|---|---|
| **Freedom Health Score** | Current plan health and execution readiness | 0–100 | Deterministic metrics + applicability-aware attestations | Primary consumer score; trendable; never shown in community by default |
| **Systems Index** | Optional reflection on installed earning/saving/growth systems | 0–300 | User/coach rubric inherited from the prototype | V2 coach/workbook feature only; labeled subjective; not used for phase, alerts, projection, pricing, or claims |

The prototype's “55/300,” “33/300 resilience-adjusted,” and “18.3% efficiency” are not interchangeable. Migration stores the raw rubric answers and snapshots as `LegacySystemsIndex`; it does not convert them into a Freedom Health Score. The consumer UI never says “your score” without naming which score.

---

## 6. Module specifications

> Template key — **Reads/Writes** name entities from the data model (§7). **Emits** names events on the recompute bus. **Phase availability** uses the §5.2 phases. **Build** = MVP / V1 / V2.

> **v2.0 delivery note:** module-level Build labels below describe dependency intent inherited from v1.1. The staged scope and release gates in §16 are authoritative; they may defer a module even when its local label says MVP.

### THE SPINE

---

#### M1 · Onboarding & Phase Diagnostic

**Purpose:** In ≤ 15 minutes, place the user in their true phase, produce their first Freedom Number and Date, and hand them exactly one next action. This is the activation moment; everything else depends on it.

**User stories**
- As a new user, I answer plain-language questions (not a spreadsheet) and see my phase, my number, and my one next move.
- As a returning user, I can re-run the diagnostic and see phase changes over time.

**Inputs:** monthly net income range; essential monthly spend range; emergency reserves; debts (name, balance, APR, minimum — quick-add, refine later); current monthly surplus/contribution estimate; dependents; protection reviewed/not reviewed/not applicable; current long-term capital range; desired after-tax freedom spending range; desired freedom age/date range; risk/liquidity non-negotiables.

**Calculations**
- Phase assignment per §5.2 gates (objective gates computed; unanswered attestations default to WATCH per P6).
- Freedom Number range from the approved planning-withdrawal-rate assumption set; the result is labeled “planning shorthand,” not “capital that guarantees freedom.”
- Initial required pace range (§M3) and an immediate **feasibility verdict** via the GateEngine: `FEASIBLE IN BASE CASE / REQUIRES CHANGE / INSUFFICIENT DATA`, with the binding constraint named (e.g., monthly surplus or target date). “Achievable” is avoided because a deterministic projection is not a probability.
- First next-best-action from the resilience engine (§M14) priority order.

**Outputs & UI:** phase banner with gates shown as CLEAR/WATCH/NOT YET chips; freedom-number range + date-range card; feasibility verdict card; assumptions/data-confidence link; single “Do this first” action card; “what we'll ask for later” transparency list.

**Reads/Writes:** writes `Profile`, seed `IncomeStream[]`, `Debt[]`, `Account[]`, `FreedomPlan`. **Emits:** `PlanCreated`, `PhaseEvaluated`.

**Alerts:** none at onboarding (P6 — no alarms on day one; the Loop activates after 7 days or first weekly check-in, whichever comes first).

**Phase availability:** all. **Build:** MVP.

---

#### M2 · Freedom Plan (Number · Date · Objectives)

**Purpose:** The single dated contract the whole system serves.

**User stories**
- I set/adjust freedom spending, planning assumptions, and freedom date, and instantly see required pace and feasibility change.
- I set year-by-year objectives (income target by year, liquidity floor by year, legacy target) that downstream modules test against.
- I write my one-sentence "why" (intentionality statement) that the app shows me at review time.

**Inputs:** freedomSpending range, reliable non-portfolio income, planningWithdrawalRate, nominalGrossReturn, inflation, fees, taxDrag, freedomDate range, **retireDate** (defaults to freedomDate — freedom and retirement may differ), **planHorizonAge** (default from reviewed policy, user-editable), **legacyTarget**, objectives byYear (income, liquidity floor, legacy), intentionality statement, north-star phase focus.

**Calculations:** freedom-number range; net real plan return; required pace range; coverage ratio; per-objective status = actual vs byYear target (`AHEAD / ON / BEHIND`); **plan mode** = `ACCUMULATION` → `RED ZONE` (configured years before retireDate through transition) → `DISTRIBUTION` (past retireDate, or durable-income gates pass and user confirms). Mode drives the Loop's master metric (§9.1), the quarterly review script (§M17), and Pillar 4 gating.

**Outputs & UI:** plan header used app-wide (number, date, pace, coverage); objectives table with byYear chips; "change history" — every plan edit is versioned and stamped, so the quarterly review can show "you moved the goalposts" honestly (P2).

**Reads/Writes:** `FreedomPlan`, `Objective[]`. **Emits:** `PlanChanged` (triggers full recompute + glide-path rebuild §9.1).

**Alerts:** plan edited during a quarter → noted on next quarterly review ("date moved from X to Y").

**Phase availability:** all (Stabilize users get a simplified buffer/debt-control/date face). **Build:** MVP.

---

#### M3 · Trajectory (projection + actuals re-basing)

**Purpose:** The honest picture of where current behavior lands the user, against the glide path.

**Calculations (normative after §15 model-risk approval)**
- Projection recurrence (monthly): `C[t+1] = C[t] × (1 + r/12) + m[t]`, where `r` = approved net real plan return from M2 and `m[t]` = Model B net invested per month (§M11). Freedom month = first `t` where `C[t] ≥ freedomNumber` (cap horizon at 60 years). The result is a scenario under assumptions, never a promised arrival date.
- Required pace: solve for constant `m*` such that `C[T] = freedomNumber` at the freedom date. Closed form: `m* = (F − C0·(1+i)^n) · i / ((1+i)^n − 1)`, `i = r/12`, `n` = months to date; when `i = 0`, `m* = (F − C0)/n`. Negative `m*` displays as zero required contribution plus current surplus, not a negative contribution.
- **Actuals re-basing:** the user logs real year-end capital (`ActualsEntry{year, capital}`). A logged actual OVERRIDES the projection at that year and re-bases all forward years and the projected freedom date. Chart shows actual dots on the projected line. This is the anti-fantasy mechanism: the plan ages with reality.
- Sensitivity strip: approved downside/base/upside net-real returns plus contribution and spending stress. No case may exceed reviewed bounds; the base case is visually neutral, not preselected as “expected.”

**Outputs & UI:** capital curve vs glide path with band shading (ahead/on/watch/off per §9.1); projected date **range** vs chosen date range; actuals entry table; sensitivity strip; persistent “today's dollars / assumptions / as-of / confidence” footer.

**Reads/Writes:** reads everything financial; writes `ActualsEntry[]`. **Emits:** `TrajectoryRecomputed`.

**Alerts:** projected date slips > 3 months behind chosen date → `PACE_SLIP` flag to §M18.

**Phase availability:** Secure+. **Build:** MVP.

---

### PILLAR 1 — SAVE MORE

---

#### M4 · Money Flow (cash-flow awareness)

**Purpose:** Show where lifetime income actually goes — make the leak visceral, then route it.

**User stories**
- I see my income split across categories (%), my interest leak to lenders, and my "wealth line" (what's left that compounds).
- I see the lifetime version: at my income, $X flows through my hands by my freedom date; here's how much I currently keep.

**Inputs:** net monthly income; fixed/essential expense lines; discretionary lines; savings lines; tax rate estimate.

**Calculations:** category %; essentials ratio (F3); savings rate (F2); **interest leak** = Σ current monthly interest across debts (`Σ balance × apr / 12`); lifetime flow-through = income compounded over remaining working years vs kept-and-compounded share; 50/30/20 comparison overlay.

**Outputs & UI:** income waterfall (one horizontal flow, not a pie); leak card ("$412/mo leaves you as interest — that's $X by your freedom date if it compounded instead"); rule chips F2/F3 live.

**Reads/Writes:** `CashFlowProfile`. **Emits:** `CashFlowChanged`.

**Alerts:** savings rate below plan 2 consecutive months → `SAVINGS_DRIFT`.

**Phase availability:** all. **Build:** MVP.

---

#### M5 · Debt Burndown

**Purpose:** Structure debt for extinction — with the payoff plan wired into the compounding engine (a paid-off payment rejoins compounding automatically, per Model B).

**User stories**
- I list debts and pick avalanche or snowball; I see debt-free date, total interest, and interest saved vs minimums.
- I set "amortize to a deadline" on a debt and the required payment is computed and driven into my plan.
- I compare prepaying with investing using the same dated cash flows, with break-even return, liquidity, and downside—not a shortcut that treats an uncertain return as contractual.

**Inputs:** per debt: name, balance, `apr` (fraction), minimum payment, extra payment, optional amortize-years deadline, fees/prepayment cost when applicable, and user-confirmed tax-treatment scenario. The product never infers deductibility from a debt name.

**Calculations (normative)**
- Standard amortization: `pmt = P·i / (1 − (1+i)^−n)`, `i = apr/12`. Payoff months from a given payment: `n = −ln(1 − P·i/pmt) / ln(1+i)`.
- Strategy comparison: avalanche (rate-ordered) vs snowball (balance-ordered) vs minimums — debt-free date + total interest each.
- **Prepay-vs-invest comparison:** use §5.7's cash-flow-matched comparator. Show contractual APR, remaining interest dollars, payoff schedule, break-even net investment return, downside/base/upside NPV, liquidity given up, collateral/recourse, fees, and tax sensitivity. Tax treatment is an assumption confirmed by the user; the product does not infer deductibility from a debt name. Verdict states are `PREPAY FAVORED / INVESTING FAVORED IN BASE CASE / CLOSE CALL / SAFETY GATE BLOCKED / INSUFFICIENT DATA`; a favorable base case never clears a safety block.
- Interest leak feed to M4; debt service by month feed to M11 (Model B), time-bounded until payoff.

**Outputs & UI:** debt table sorted by the user's chosen strategy with APR visible; burndown chart; strategy A/B card; comparator with assumptions and break-even; “when this payment ends, redirecting it under the plan adds $X–$Y by your date in the shown scenarios.”

**Reads/Writes:** `Debt[]`. **Emits:** `DebtChanged` (recomputes trajectory, rules, score, alerts).

**Alerts:** payoff date slips > 1 quarter vs plan → `DEBT_SLIP`; new balance with APR > 10% → `HIGH_APR_NEW` (tripwire).

**Phase availability:** all. **Build:** MVP.

---

#### M6 · Savings & Allocation

**Purpose:** Decide where every saved dollar sits: emergency floor → storage (safe yield) → compounding → speculative surplus.

**Inputs:** account list with purpose tags (emergency / storage / compounding / speculative); target emergency months; storage yield; declared speculative surplus.

**Calculations:** emergency months = `emergencyReserves / essentialMonthly`; allocation waterfall order enforced (floor before storage before growth before speculation — W5); runway years = liquid / annual essentials; idle-cash drag = cash above floor × (expected return − storage yield).

**Outputs & UI:** waterfall visualization; F1 progress bar with the target months marker; drag card ("$18K above your floor is earning 0.4% — that's $X/yr of drag").

**Reads/Writes:** `Account[]`, allocation policy. **Emits:** `AllocationChanged`.

**Alerts:** emergency months below target → `EMERGENCY_LOW` (tripwire below 1 month; watch below target).

**Phase availability:** all. **Build:** MVP.

---

#### M7 · Automation

**Purpose:** Make the plan self-executing — the difference between intent and outcome.

**User stories**
- I define my routing rules (payday → X% to savings account, $Y to debt, $Z to brokerage) as a written, checkable plan.
- Each rule has an attestation ("this is set up at my bank") and the app checks in on it.

**Inputs:** accounts; rules `{trigger: payday/monthly/date, from, to, amount|%}`; safe/speculative split; attestation checkboxes.

**Calculations:** projected monthly routed total vs plan's required pace `m*`; gap = `m* − routedTotal` ("your automation funds 78% of your required pace").

**Outputs & UI:** rule cards with attestation state; the pace-funding gauge; setup guides per major bank (content).

**Reads/Writes:** `AutomationRule[]`. **Emits:** `AutomationChanged`.

**Alerts:** attested rule unconfirmed for 90 days → re-attest nudge; routed total < 80% of `m*` → `AUTOMATION_GAP`.

**Phase availability:** Secure+. **Build:** MVP (manual attestation; no bank write-access ever in scope).

---

### PILLAR 2 — EARN MORE

---

#### M8 · Income Streams

**Purpose:** Treat income as a portfolio: size, growth, concentration, and passive share.

**Inputs:** per stream: name, type (salary / business / side / passive), annualIncome, growthRate, capitalBase (for capital-backed streams), yield.

**Calculations:** total income; concentration = topStream/total (F6 flag > 60% when > 1 stream); passive income = Σ over passive/capital streams; coverage ratio to plan; per-stream projected income byYear vs the plan's income objectives.

**Outputs & UI:** stream stack; concentration bar with the 60% line; passive-vs-freedom-income gauge (the coverage crossover is the single most motivating chart in the reference system — passive income line crossing the freedom income line).

**Reads/Writes:** `IncomeStream[]`. **Emits:** `IncomeChanged`.

**Alerts:** concentration > 60% → `CONCENTRATION` (tripwire); income objective byYear behind → `INCOME_BEHIND` (watch).

**Phase availability:** all. **Build:** MVP.

---

#### M9 · Earn Engine (levers, playbooks, idea matrix)

**Purpose:** Make "earn more" operational, not aspirational — every earn idea is denominated in months-off-the-freedom-date and converted into commitments.

**User stories**
- I see what +$500/mo or +$1,000/mo of income does to my freedom date (via the accelerator engine, §M13).
- I log earn ideas on a **probability × payoff matrix** (from the reference Doubling Engine): each idea gets estimated monthly value, probability, effort; the matrix ranks expected value per effort.
- I pick one idea per quarter and it becomes a commitment (§M19) with a check-in cadence.
- I follow structured playbooks (negotiate a raise, productize a skill, rental income readiness, side income vetting) — each ends by writing a commitment, not just reading.

**Calculations:** idea EV = `monthlyValue × probability × 12`; months-sooner per idea via `gFM` delta (§M13); ranked list.

**Outputs & UI:** matrix (2×2: probability vs payoff, dot size = effort); "one thing this quarter" selector; playbook library (content, versioned).

**Reads/Writes:** `EarnIdea[]`, creates `Commitment`. **Emits:** `EarnIdeaCommitted`.

**Alerts:** none intrinsic; commitments handle follow-through.

**Phase availability:** all (Stabilize users see stabilization-focused playbooks first). **Build:** V1 (matrix + playbooks); the +income lever preview ships in MVP inside M13.

---

### PILLAR 3 — GROW MORE

---

#### M10 · Portfolio & Returns

**Purpose:** Know the blended engine you actually own — and whether it matches the plan's assumed return.

**Inputs:** holdings `{name, class, value, expectedReturn, yield}`; contribution mapping to accounts.

**Calculations:** allocation by class; blended expected return = value-weighted; **return-vs-plan check**: blended vs the trajectory's `r` (mismatch > 1% → flag "your plan assumes 8%; your portfolio is built for 6.2%"); rule-of-72 doubling time = `72 / (100·blended)`; doublings needed = `log2(freedomNumber / currentCapital)`; concentration (single holding > 25% → watch); cash drag.

**Outputs & UI:** allocation donut + blended-return card; "doublings to freedom: 2.4 — at your blended return, one doubling every 9.0 years" (the doubling frame is retained from the reference system — it is how the product talks about growth); mismatch verdict card.

**Reads/Writes:** `Holding[]`. **Emits:** `PortfolioChanged`.

**Alerts:** return-vs-plan mismatch > 1% for 2 quarters → `RETURN_MISMATCH`; single-holding concentration > 25% → watch.

**Phase availability:** Accumulate+. **Build:** V1. **Compliance note:** no security-level recommendations, ever. Class-level education only (§12).

---

#### M11 · Compounding Engine (Perpetual Income)

**Purpose:** The mathematical heart: convert plan inputs into the invested stream and the crossover to freedom.

**Calculations (normative — Model B, dollar-for-dollar)**
- `invested/yr = max(0, cashFlow × savingsRate − debtService − goalFunding)`.
- Obligations are **time-bounded**: debt service applies until payoff (from amortization or min+extra); goal funding until each goal's target year. When an obligation ends, its full payment rejoins compounding automatically — the "virtuous loop." The per-year obligations column visibly drops off.
- Planning capital target = `freedomSpendingNeed / planningWithdrawalRate` (same shorthand as the Freedom Number; presented as a scenario target, not “the capital that pays forever”).
- Coverage gauge and crossover chart (capital → passive income vs freedom income line).

**Outputs & UI:** invested-per-year table with obligations drop-off; crossover chart; "every obligation dollar is a dollar not compounding — your obligations end in this order: …" timeline.

**Reads/Writes:** derived only (reads M4/M5/M12 outputs). **Emits:** feeds M3 directly.

**Phase availability:** Secure+. **Build:** MVP (it is the trajectory's `m[t]` supplier).

---

#### M12 · Big-Ticket Goals

**Purpose:** Fund life's big purchases without silently destroying the freedom date.

**Inputs:** goals `{name, target, targetYear, fundedSoFar, expectedCagr}`.

**Calculations:** level annual contribution to hit target by targetYear: same annuity solve as `m*` scoped to the goal; per-goal funding feeds Model B as a time-bounded obligation; **trade-off card:** "funding this goal moves your freedom date by +N months" (computed by rerunning `gFM` without the goal).

**Outputs & UI:** goal cards with funding schedule; the trade-off line on every card (P2 — goals are not free, show the price).

**Reads/Writes:** `Goal[]`. **Emits:** `GoalChanged`.

**Alerts:** goal underfunded vs schedule > 10% → watch.

**Phase availability:** Secure+. **Build:** MVP-lite (single goal), V1 (full).

---

#### M13 · Scenarios & Freedom Accelerator

**Purpose:** Answer "what should I change?" with ranked, quantified levers — the decision layer.

**Calculations (normative)**
- Core engine `gFM(C0, m, r, goal, H)`: months-iterated years-to-goal (returns horizon H if unreached). Baseline: goal = freedomNumber; C0 = current capital; m = Model B monthly; r = plan return.
- **Accelerator:** rank reviewed household-controlled levers by months/range saved versus baseline: additional earned income, additional recurring contribution, one-time contribution, lower recurring fee drag, later date, or lower spending need. A return increase is a sensitivity—not an action—and never ranks as a “pull this lever.” Tax changes appear only as user-confirmed scenarios with approved content.
- **Scenarios:** user-defined what-if rows `{extraIncome, extraContribution, feeChange?, taxScenario?, lump, dateChange?, spendingChange?}` compared side-by-side versus the current plan, each with a projected date range and safety/data-confidence context.

**Outputs & UI:** lever leaderboard ("+$1,000/mo income: 31 months sooner"); scenario comparison table; every lever row has "make this real" → routes to the pillar module that implements it (earn → M9, save → M6/M7, return → M10) and offers to create a commitment.

**Reads/Writes:** `Scenario[]`. **Emits:** `ScenarioSaved`.

**Phase availability:** Secure+. **Build:** MVP (accelerator), V1 (custom scenarios).

---

### THE SHIELD — PROTECT

---

#### M14 · Resilience & Action

**Purpose:** The defense engine: verify the plan survives contact with reality, and rank the next-best-actions across the entire system.

**Calculations (normative — the `gRES` engine)**
- Essential monthly spend; emergency months vs target; **truthful liquidity**: runway counts automation cash + accessible account balances (NOT retirement-locked assets) — the same liquidity definition everywhere in the app.
- Insurance grid: life / disability / umbrella / health as applicable-aware checks (N/A when no dependents, etc. — P6).
- Income concentration (shared with M8).
- **Tripwires** (red, immediate): no life insurance with dependents; no disability coverage while income-dependent; emergency fund < 1 month; concentration > 60%; new high-APR balance. Tripwire count badges in the app header.
- **Next-best-actions:** merge failing operating rules + emergency top-up + insurance gaps + diversification + accelerator opportunities; sort by severity; render top 6; the #1 action is the app-wide "Do this next" (Dashboard, weekly email). Every action deep-links to the module that fixes it.
- Down-market draw-order review: a written, user-attested policy is required before entering Live Free; the software does not prescribe tax sequencing.

**Outputs & UI:** defense grid (N/4 insurance, runway, concentration); tripwire list; ranked action stack; readiness verdict.

**Reads/Writes:** `InsuranceFlags`, `DrawOrder`. **Emits:** `ResilienceEvaluated`.

**Build:** MVP (this engine powers the Dashboard and the Loop from day one).

---

### THE LOOP — MEASURE · FLAG · CORRECT · COMMIT

---

#### M15 · Freedom Score

**Purpose:** One named 0–100 **Freedom Health Score**, honestly constructed, that trends with plan health without becoming a credit score, a moral grade, or a community status symbol.

**Calculations (normative)**
- Applicable sub-scores (each 0–100): **Plan Pace/Funding (30%) · Resilience (25%) · Cash-Flow Margin (20%) · Debt/Obligations (15%) · Follow-through (10%)**. Exact functions and thresholds live in a versioned `ScorePolicy`; inapplicable components reweight transparently.
- Missing data receives no zero. If completeness is below the approved threshold, show a partial score with `LOW CONFIDENCE` or no overall score.
- Severity-1 conditions cap the displayed band but do not rewrite the stored component values. The UI names the cap and the action that removes it.
- Score changes caused by a `ScorePolicy` version are labeled “method changed” and are not presented as household progress/regression.
- Score history is snapshotted weekly for the trend line.

**Display:** always “Freedom Health 74/100,” never “74” alone. Show component contributions, policy version, data as-of, and confidence. The score is private by default and prohibited from public leaderboards, underwriting, eligibility decisions, or pricing.

**Systems Index:** see §5.8. It is a separate V2 artifact and never appears on the primary dashboard.

**Build:** MVP.

---

#### M16 · Operating Rules Scorecard

**Purpose:** The canonical adherence surface—all 16 rules, grouped, with per-group tallies and an applicability-aware “N of M applicable on track.”

**Behavior:** single shared rules engine (one implementation, many consumers — Dashboard tile, Automation's wealth-rules filter, Resilience's failing-rules feed). "Secure the foundation first" banner whenever any Foundation rule fails while the user is working in a Growth-phase module. Each rule row: test shown transparently, current value, threshold, pass/fail, "fix this" deep link.

**Build:** MVP.

---

#### M17 · Quarterly Review & Operating Rhythm

**Purpose:** The cadence that makes it an operating system. Uncadenced things leak.

**The rhythm**
- **Weekly (5 min):** check-in — confirm commitments, one number (this week's savings), streak maintained.
- **Monthly (15 min):** money-date — reconcile balances (manual/CSV), review alerts, adjust one thing.
- **Quarterly (45 min, the flagship):** the guided review flow (§8.3): snapshot → deltas → condition state → binding constraint → next quarter's commitments. Produces a shareable one-page Quarterly Freedom Report. **In DISTRIBUTION mode the question changes** from *“are we tracking the date?”* to *“what do the approved durability scenarios show?”*—funded ratio, withdrawal-rate policy state, buffer years, and legacy funding replace pace ratio at the top of the report, and any user-selected spending adjustment is acknowledged as part of completion.
- **Annually (family, 90 min — when the Family Charter is active, §M25):** the family meeting — capital, distributions, who is joining. Agenda template provided; logged as a first-class `ReviewSession`.

**Mechanics:** review sessions are first-class entities with completion state; the quarterly cannot be marked complete without (a) balances confirmed, (b) verdict acknowledged, (c) 1–3 commitments set for next quarter. Overdue > 14 days → escalating nudges (§M18).

**Build:** MVP (weekly + quarterly), V1 (monthly money-date, shareable report).

---

#### M18 · Off-Track Engine & Alerts

**Purpose:** Detect drift early, flag it honestly, and route the user to the fix. Full spec in §9.

**Build:** MVP (tripwires + pace bands + in-app), V1 (email digests, trend flags, escalation).

---

#### M19 · Accountability & Commitments

**Purpose:** Close the loop between deciding and doing. Full spec in §10.

**Build:** MVP (commitments + attestations + streaks), V1 (accountability partner), V2 (coach/advisor workspace).
---

### PILLAR 4 — RETIRE FREE (the arrival)

> Accumulation asks *“are we tracking the date?”* These modules ask *“and then what, exactly?”*—a spending plan assembled from sourced reliable income plus portfolio draws, tested against sequence risk, longevity, inflation, fees, taxes, and household constraints. Plan mode (`ACCUMULATION → RED ZONE → DISTRIBUTION`, §M2) governs when these modules move from preview to primary.

---

#### M20 · Retirement Readiness & Income Plan

**Purpose:** Convert the Freedom Number into a monthly retirement paycheck, with an honest verdict on whether it holds.

**User stories**
- Approaching my retire date, I see exactly where each month's income comes from: Social Security + pension + portfolio draw.
- I see the readiness condition—BASE CASE FUNDED / WATCH / AT RISK / INSUFFICIENT DATA—with the binding constraint named (spend, date, benefits assumption, or capital).
- I compare a capital-preservation target with a planned-depletion scenario, including stress cases and explicit assumptions.

**Inputs:** retirement spend target (seeded from current essentials + discretionary, aging-adjusted); planHorizonAge; SocialSecurityProfile (PIA from the user's own SSA statement, planned claim age); pension/annuity streams; pre-65 healthcare bridge cost estimate (when retireAge < 65).

**Calculations (candidate model; independent retirement-model review required before V1)**
- Reliable non-portfolio income `GI` = user-entered/current-source benefit scenario + applicable pensions/annuities/other sources, each with start/end, inflation, survivor, and tax attributes where modeled. **Net portfolio spend** `S = max(0, retirementSpend − GI)`.
- **Capital-preservation target:** planning spend capacity = `capital × planningWithdrawalRate`; this is a deterministic shorthand and does not guarantee preservation. Full readiness uses horizon, cash-flow, tax/fee/inflation, and stress assumptions.
- **Depletion design:** model reviewed real cash flows over the horizon with explicit zero/negative-return branches, source start/end dates, and spending inflation. The closed-form annuity solve may be used only for a level-real-spend educational case and must be labeled as such.
- **Readiness gate panel** (GateEngine): capital vs required · net spend vs sustainable/horizon · buffer funded (§M21) · draw order written (§M14/M21) · healthcare bridge covered (if retireAge < 65) · legacy pre-funding state (§M24, informational). Rollup READY / STRETCH / NOT ON CURRENT INPUTS with binding constraint. Unset fields render NOT YET, never BLOCKED (P6).
- Medicare bridge: `retireAge < 65` → bridge years × annual bridge cost added to early-years spend; unplanned → flag.
- **Legacy integration:** M24 may reduce the assets earmarked for legacy when the documented legacy gap is covered. Any newly unearmarked amount is rerun through M20; the UI says “available for the retirement plan under these assumptions,” never automatically “spendable.”

**Outputs & UI:** the paycheck card (stacked bar: sourced reliable non-portfolio vs portfolio-funded, by month); readiness gate panel; scenario designs side by side; years-funded range; bridge card when applicable; source/as-of/assumption disclosure.

**Reads/Writes:** `SpendingPlan`, `SocialSecurityProfile`. **Emits:** `RetirementPlanChanged`.

**Alerts:** `MEDICARE_BRIDGE` (retireAge < 65 with no bridge plan, sev 2); readiness verdict downgrade → surfaced at quarterly review.

**Phase availability:** educational preview from Accumulate; full module in RED ZONE and DISTRIBUTION. **Build:** V1 only after independent model review.

---

#### M21 · Drawdown & Guardrails

**Purpose:** The spending system that survives bad markets. Sequence-of-returns risk is the retirement killer, and the defense is decided *before* the drawdown — never during it.

**User stories**
- I see the current spending-policy state and what each modeled adjustment would do; I confirm any real spending change myself.
- My down-market draw order is written, attested, and executable: which account funds spending in a drawdown, in what order.
- I hold a buffer measured in **years of spending**, and the app tells me when to refill it (in good quarters only).

**Calculations (candidate policy; independent retirement-model review required before V1)**
- Initial withdrawal rate `w0 = S / capitalAtRetirement` (net of modeled reliable non-portfolio income). Current `WR = S / currentCapital`.
- **Guardrails:** the prototype candidate is `WR > 1.2·w0` → model a 10% cut, `WR < 0.8·w0` → model a 10% raise, else base spending. These constants are not universal or production-normative. A versioned `SpendingPolicy`, validated across horizon/inflation/tax/return stress cases and reviewed by qualified specialists, determines released behavior. Consumer UI presents scenario impact and acknowledgment; it does not execute or prescribe a withdrawal.
- **Buffer:** target `bufferYears` from the reviewed `SpendingPolicy`; `bufferYears = bufferAssets / S`. Refill behavior is modeled under explicit rules and never executed by the app.
- **Draw order:** user-authored or separately advised ordered account list. The product may teach generic tax/liquidity considerations but does not install a personalized tax-sequencing default. Attested (§10.2). Entering RED ZONE flags a missing draw-order review without prescribing the order.
- Sequence-risk education: the §5.5 volatility-drag pair recast for withdrawals — same average return, opposite outcomes when the bad years come first.

**Outputs & UI:** versioned guardrail-policy chart; current withdrawal-rate state; buffer gauge; draw-order review card with attestation; quarterly scenario/acknowledgment banner.

**Reads/Writes:** `SpendingPlan.drawOrder`, buffer tagging on `Account[]`. **Emits:** `DrawdownEvaluated`.

**Alerts:** `WITHDRAWAL_HIGH` (guardrail breach, sev 2 — fires at review and presents the modeled spending adjustment for the user's acknowledgment; the app never executes or prescribes it); `BUFFER_LOW` (< 1 year, sev 2); `DRAW_ORDER_MISSING` (tripwire, but **only** in RED ZONE or DISTRIBUTION — P6).

**Phase availability:** RED ZONE + DISTRIBUTION (educational preview earlier). **Build:** V1.

---

#### M22 · Social Security & Benefits Timing

**Purpose:** The largest inflation-adjusted annuity most Americans will ever own; claiming age is a six-figure decision made once.

**Calculations (statutory factors — education, not advice)**
- Claim-age factor (FRA 67, born 1960+): reduction of 5/9 of 1% per month for the first 36 months early, 5/12 of 1% per month beyond; delayed credits 2/3 of 1% per month past FRA to 70. Rendered table: 62 → **70.0%** · 63 → 75.0% · 64 → 80.0% · 65 → 86.7% · 66 → 93.3% · 67 → **100%** · 68 → 108% · 69 → 116% · 70 → **124%**.
- Monthly benefit at each claim age from the user-entered PIA (from their own ssa.gov statement — the app never scrapes or estimates PIA).
- **Nominal breakeven ages** between claim strategies (disclosed as ignoring COLA, taxes, and discounting): cumulative-benefit crossover, e.g., 62-vs-67 ≈ age 78.7; 67-vs-70 ≈ age 82.5.
- **Plan integration (the differentiator):** claim age is a scenario lever — each claim age rerun through M20: funded ratio, years funded, and value-to-heirs impact side by side. The verdict is "what your plan says," not "what the actuarial table says."
- Earnings-test education when working before FRA; spousal/survivor notes (education, V2.1 depth); **RMD awareness** rendered in tax-deferred contexts: age 73 currently, 75 from 2033 for those born 1960+ (SECURE 2.0) — education flag only.

**Outputs & UI:** claim-age slider with live monthly benefit; cumulative crossover chart; the three-scenario plan-impact table (62 / FRA / 70).

**Reads/Writes:** `SocialSecurityProfile`. **Emits:** `SSProfileChanged`.

**Alerts:** none (a timing decision, not a drift condition).

**Phase availability:** Accumulate+. **Build:** V2.

---

### PILLAR 5 — BUILD A LEGACY (the transfer)

> Only **24% of Americans have a will** (Caring.com 2025), and the largest cohort without one is parents of minor children. A legacy that isn't documented is a probate case; a legacy that isn't funded is a wish; a legacy that isn't taught is spent by the second generation. Three modules: document it, fund it, teach it.

---

#### M23 · Estate Readiness & Beneficiary Audit

**Purpose:** Make the transfer legally real. Checklist + audit, scored honestly, with the one gap that matters flagged first.

**User stories**
- I see my Estate Readiness score and exactly which document closes the biggest gap.
- Every account shows its beneficiary state: current / stale / **missing** — the audit catches the 401(k) still naming an ex-spouse.
- A life event (marriage, birth, divorce, death, state move) prompts a re-audit of everything.

**Inputs/state:** `EstateDoc` checklist — will · beneficiary designations · financial POA · healthcare directive · guardianship nomination (when minor dependents) · trust (conditional; education on when it matters) · letter of intent · document locations (metadata vault). Per-account/per-policy beneficiary fields `{primary, contingent, lastReviewedAt}`.

**Calculations (normative)**
- **Estate Readiness score** (0–100, weights reweighted when a component is N/A): will 25 · beneficiaries current on all applicable accounts 25 · financial POA 15 · healthcare directive 15 · guardianship 10 (when applicable) · trust/letter/locations 10.
- Beneficiary audit: missing on an applicable account → flag; `lastReviewedAt` > 3 years or older than the latest life event → stale.
- Life-event triggers re-open relevant attestations (P6: re-opened items score WATCH, not FAIL).

**Outputs & UI:** readiness ring with the binding gap named ("Guardianship nomination is your biggest gap — 10 points, and the one a judge decides without you"); checklist with attestations + dates; per-account beneficiary table with flags; state-aware education notes (community property, probate thresholds — education only).

**Reads/Writes:** `EstateDoc[]`, beneficiary fields on `Account[]`/`Holding[]`/policies. **Emits:** `EstateEvaluated`.

**Alerts:** `ESTATE_GAP` (**tripwire**: minor dependents AND no will or no guardianship nomination); `BENEFICIARY_MISSING` (sev 2); `ATTESTATION_STALE` (§9.2, reused).

**Compliance:** checklist, audit, and education only — the app drafts **no** legal documents and says so; "complete this with an attorney or a reputable document service" links out. Feeds rule F8.

**Phase availability:** all (dependents make it urgent in any phase). **Build:** V1 (checklist + audit); V2 (document vault uploads).

---

#### M24 · Legacy Funding & Value to Heirs

**Purpose:** Decide what you intend to leave, measure the gap honestly, and show how actual earmarking choices interact with retirement—without treating a death benefit as instant spendable capital.

**User stories**
- I set a legacy target (or explicitly waive one — a valid, logged choice).
- I see funding status: death benefit + earmarked assets vs the target — FUNDED / PARTIAL / UNFUNDED (NOT YET when no target).
- If documented coverage reduces the assets I need to earmark for legacy, I can see the scenario impact on retirement spending.
- I see the value-to-heirs curve: what actually reaches my heirs at every age.

**Calculations (candidate model; insurance/estate/model review required before V1)**
- Funding status = `(eligibleNetDeathBenefitAtHorizon + earmarkedAssets) / legacyTarget`; NOT_YET when target ≤ 0 or the policy source is stale/incomplete. Ratio display handles zero target without division.
- `legacyGapAfterInsurance = max(0, legacyTarget − eligibleNetDeathBenefitAtHorizon)`.
- `requiredEarmark = min(earmarkedAssets, legacyGapAfterInsurance)`.
- `newlyUnearmarked = max(0, priorRequiredEarmark − requiredEarmark)`. Only assets the household had actually earmarked can be released. The released amount is rerun through M20; it does not automatically create current spending.
- `eligibleNetDeathBenefitAtHorizon` comes from a dated in-force/carrier source and reflects the selected horizon scenario, outstanding loans, and approved adjustments. If policy status/source is stale or premiums are not modeled, the value is `NOT_YET`, not assumed.
- Value-to-heirs curve uses Appendix A's modeled assets + eligible net death benefit − debts − explicit modeled costs, drawn for capital-preservation-target and depletion scenarios. Excluded taxes, probate, ownership, policy, and legal nuances are listed prominently; missing items lower confidence rather than silently equal zero.
- Insurance-need feedback: legacy target unfunded and capital alone can't cover it → the gap is named as an insurable amount (education; no product recommendations).

**Outputs & UI:** funding/gap bar; “legacy earmark impact” scenario card; heirs curve with source/assumption disclosure; waive-with-reason flow.

**Reads/Writes:** `FreedomPlan.legacyTarget`, earmark tags on accounts. **Emits:** `LegacyEvaluated`.

**Alerts:** `LEGACY_UNDERFUNDED` (sev 3 watch — only when a target is set).

**Phase availability:** Accumulate+. **Build:** V1.

---

#### M25 · Giving & Family Governance

**Purpose:** Legacy is the transfer of competence, not just capital. Structure the giving, and run the family like the fiduciary of its own future.

**Features**
- **Giving plan:** annual and lifetime giving targets (charitable + family), tracked like goals with byYear status; QCD/DAF education (V2 depth; education only).
- **The Family Charter** (adapted from the reference system's family-governance grid): one tracker, visible to all — balances and distributions in a single ledger the family can see · an annual family meeting, ninety minutes, with the provided agenda (capital, distributions, who is joining) · family loans are documented and priced at arm's length — *amortization is negotiable, the rate is not* · **the invitation never expires** (a family member who declines today can join in ten years).
- **Heir readiness:** a content track (the Sixteen Principles as the curriculum) + optional view-scoped household seats for adult children (see the charter dashboard, not the balances, unless granted).
- The annual family meeting joins the Operating Rhythm (§M17) as a first-class yearly `ReviewSession` with its own completion state.

**Reads/Writes:** `GivingTarget[]`, `FamilyCharter`, household member seats. **Emits:** `CharterUpdated`.

**Alerts:** family meeting overdue (sev 3 — only when the charter is activated).

**Phase availability:** Accumulate+. **Build:** V2.
---

### V2 — ADVANCED STRATEGY LIBRARY (gated, education-only)

A library of strategy deep-dives, each implemented as a **GateEngine instance** (§5.6) over the user's live data and evidence versions. Candidate access begins no earlier than Accumulate and still requires every §16 ReleaseGate; phase alone never unlocks it.

| Strategy module | Core engine | Non-negotiable honesty elements |
|---|---|---|
| Prepay vs invest (deep mode) | cash-flow-matched NPV/break-even engine (§5.7) | after-tax assumption sensitivity; liquidity; downside cases; close-call/insufficient-data states |
| Leverage & big-asset financing | contractual cash flows + fees + collateral/liquidity gates + downside stress | no “effective-cost” shortcut; loss/foreclosure/capital-call conditions; favorable NPV cannot override safety |
| Policy-based strategies (cash-value life) | carrier/in-force values only + premium affordability, emergency, loan, lapse/MEC/tax, illustration, and legacy gates | Separate counsel-approved pack; guaranteed/non-guaranteed separation; no automatic “tax-free” claim; no app-computed MEC limit; BUILD SPEC mode only after eligibility/release gates |
| Family lending structures | family-rate cancellation proof (`FV(I_b − I_p)`) | "the rate you charge family is not the source of gain"; documentation/arm's-length warnings |

These modules are deliberately last: the moat for the mass market is the Loop, not specialized products or leverage. Retention alone is insufficient; each module requires the §16 release gate, independent model review, jurisdiction/content review, monitored pilot, complaint/harm instrumentation, and a kill switch.

---

## 7. The Integration Layer — one plan, one recompute graph

### 7.1 Entity model (normalized; Postgres)

```
Person *─* Household 1─1 FreedomPlan {freedomSpendingNeedRange,
                                     reliableIncome, planningWithdrawalRate,
                                     freedomDateRange, retireDate, planHorizonAge,
                                     legacyTarget, mode, assumptionSetId,
                                     version, history[]}
Household 1─* IncomeStream {name, type, annualIncome, growthRate,
                            capitalBase, yield}
Household 1─* Debt   {name, balance, apr, minPayment, extraPayment,
                      amortizeYears?, deductible?, openedAt}
Household 1─* Account {name, purpose: emergency|storage|compounding|
                       speculative|retirement, balance, yield, taxAdvantaged,
                       bufferTagged?, earmarkedForLegacy?,
                       beneficiaryPrimary?, beneficiaryContingent?,
                       beneficiaryReviewedAt?}
Household 1─* Goal    {name, target, targetYear, funded, cagr}
Household 1─* Holding {name, class, value, expectedReturn}
Household 1─1 CashFlowProfile {netIncomeMonthly, essentials[], discretionary[],
                               savingsLines[], taxRateEst}
Household 1─1 ResilienceProfile {insurance{life,disability,umbrella,health},
                                 emergencyTargetMonths, drawOrder?, dependents}
Household 1─* AutomationRule {trigger, from, to, amountOrPct, attestedAt?}
Household 1─* EarnIdea {name, monthlyValue, probability, effort, status}
Household 1─* Scenario {name, extraIncome, extraSave, returnBump, taxCut, lump}
Household 1─* ActualsEntry {year, capital}
Household 1─* Commitment {text, module, due, cadence, status, streak}
Household 1─* Attestation {key, checkedAt}          // e.g. rule attestations
Household 1─1 SpendingPlan {retirementSpendAnnual, bufferYearsTarget,
                            guardrailBandPct: 0.20, drawOrder[], w0}
Household 1─1 SocialSecurityProfile {piaMonthly, fra, plannedClaimAge}
Household 1─* EstateDoc {type: will|beneficiaries|poa|directive|
                         guardianship|trust|letter|locations,
                         status, updatedAt, location?}
Household 1─* GivingTarget {name, kind: charitable|family, annual,
                            byYear{}, lifetime?}
Household 1─1 FamilyCharter {activatedAt?, ledgerVisibleToAll,
                             meetingMonth, memberSeats[]}
Household 1─* ReviewSession {type: weekly|monthly|quarterly|annual_family,
                             period, completedAt?, verdict?,
                             commitmentsSet[], spendingVerdict?}
Household 1─* MetricSnapshot {at, metrics{...§8.1 catalog}, scoreParts{}}
Household 1─* Alert {code, severity, firedAt, resolvedAt?, module, payload}
Household 1─1 PhaseState {phase, gates{...}, lastEvaluatedAt}
```

Notes: `apr`, yields, and rates are fractions. Soft-delete everything (users un-delete debts constantly). Every mutation is audited (`who/when/what`) — the plan-version history powers the honesty features.

**v2.0 required extensions**

```text
Person 1─* HouseholdMembership {householdId, role, scopes[], status,
                                invitedBy, acceptedAt?, revokedAt?}
Household 1─* ShareGrant {granteePersonId, scopes[], expiresAt, revokedAt?}
Household 1─* DataSource {kind: manual|csv|provider|attestation,
                         provider?, externalIdHash?, observedAt, importedAt}
FinancialEntity 1─* SourceObservation {field, value, sourceId, observedAt,
                                      confidence, reconciliationState}
FreedomPlan 1─1 AssumptionSet {currency, dollarBasis: real|nominal,
                              nominalGrossReturn, inflation, fees, taxDrag,
                              planningWithdrawalRate, versions{}, acknowledgedAt}
Household 1─* KillCriterion {metric?, condition, responsePlan, observationWindow,
                            status, activatedAt, versions[]}
Person 1─* CircleMembership {circleId, alias, role, status, joinedAt, leftAt?}
Circle 1─* SharedProgressCard {ownerPersonId, allowedFields[], generatedAt}
Circle 1─* CommunityPost {authorId, body, visibility, disclosureTags[],
                         moderationState, createdAt, deletedAt?}
CommunityPost 1─* CommunityReport {reporterId, policyCode, detail?, createdAt}
CommunityCase 1─* ModerationDecision {policyCode, action, actorId, evidenceRef,
                                     decidedAt, appealState?}
Person 1─* BlockMute {targetPersonId, kind, createdAt}
ContentClaim {exactClaim, sourceUrl, riskTier, jurisdiction?, effectiveFrom,
              reviewedAt, nextReviewAt, ownerId, reviewerId, status}
PublishedContentVersion {contentKey, version, bodyRef, claimIds[],
                         disclosureBundleId, approvedBy, publishedAt}
ScorePolicy / ThresholdPolicy / FlagPolicy {version, effectiveAt, config,
                                            rationale, approvedBy}
PlanEntitlement {householdId, productPlan, features[], status, validThrough}
FeatureReleaseGate {feature, stage, jurisdictions[], complianceApproval,
                    modelRiskApproval, enabled}
AuditEvent {actor, action, resourceType, resourceId, householdId?, purpose,
            beforeHash?, afterHash?, at, correlationId}
```

Not every finance table should be soft-deleted identically: audit/security/billing records use counsel-approved immutable retention; community deletion and user privacy rights require separate tombstone/purge behavior; snapshots are immutable but may be cryptographically erased by destroying household-specific keys where legally appropriate.

### 7.2 The recompute graph

All derived values flow through **one pure, deterministic engine package** (`@freedom/engine`, §14) with an explicit dependency DAG:

```
inputs: Plan, Streams, Debts, Accounts, Goals, Holdings, CashFlow, Resilience
   ├→ amortization per debt ──→ debtService[t], payoffDates, interestLeak
   ├→ goal schedules ─────────→ goalFunding[t]
   ├→ Model B ────────────────→ invested[t]  (m[t])
   ├→ projection (gFM) ───────→ capitalCurve, projectedFreedomDate
   ├→ glide path ─────────────→ G(t), paceRatio
   ├→ rules engine (gOR) ─────→ 16 rule states
   ├→ resilience (gRES) ──────→ runway, tripwires, actions, defenseGaps
   ├→ retirement engine ──────→ paycheck (GI + draw), yearsFunded,
   │                            fundedRatio, guardrailState, bufferYears
   ├→ estate engine ──────────→ readinessScore, beneficiaryFlags
   ├→ legacy engine ──────────→ fundingStatus, legacyGap, earmarkImpact,
   │                            valueToHeirs(t)
   ├→ score ──────────────────→ base + displayed
   └→ off-track engine ───────→ flags → Alerts   (mode-aware, §9.1)
```

**Rule:** any input mutation triggers a full engine run (target < 50 ms server-side for a typical household; the engine is pure math, no I/O). The client receives one consistent `EngineResult` — never partial recomputes. This is P3 enforced structurally: modules cannot disagree because they all render the same result object.

### 7.3 Events (for side effects only)

`PlanChanged, DebtChanged, CashFlowChanged, AllocationChanged, IncomeChanged, PortfolioChanged, GoalChanged, AutomationChanged, ResilienceEvaluated, TrajectoryRecomputed, AlertFired, AlertResolved, CommitmentCreated/Kept/Missed, ReviewCompleted, PhaseChanged` — consumed by the notification service, snapshot service, and analytics. Events never carry computed truth (the engine result does); they signal *that* something changed.

---

## 8. The Measurement System

### 8.1 Metric catalog (every metric: one definition, one owner module, computed only in the engine)

| Metric | Formula | Direction |
|---|---|---|
| Net worth | Σ accounts + holdings + capitalBases − Σ debt balances | ↑ |
| Liquid runway (months) | truthful liquid reserves / essentialMonthly | ↑ |
| Planned surplus rate | verified long-term contributions / net income | vs household/policy target |
| Essentials ratio | essentials / net income | trend and supportability context |
| Interest leak ($/mo) | Σ balance × apr / 12 | ↓ |
| Weighted debt APR | Σ(balance × apr) / Σ balance | ↓ |
| Debt-free date | from active strategy | earlier |
| Emergency months | reserves / essentialMonthly | ↑ ≥ target |
| Income concentration | top stream / total income | vs versioned watch threshold |
| Reliable non-portfolio income ($/yr) | Σ approved scenario income sources | scenario-specific |
| Coverage ratio | reliable non-portfolio income / freedom spending need | ↑ → 1.0 |
| Freedom progress | capital / freedom number | ↑ → 1.0 |
| **Pace ratio** | capital / G(now) | vs versioned pace bands |
| Projected date delta | projected − chosen freedom date (months) | ≤ 0 |
| Return assumption alignment | asset-class assumption set vs plan assumption | review mismatch |
| Rules on track | clear / applicable | ↑ |
| Freedom Health Score | §M15 | trend with method/confidence |
| Commitments resolved honestly | kept + renegotiated / due | ↑ with kept shown separately |
| **Funded ratio** (distribution) | capital / PV(remaining planned real net spend) | vs versioned bands |
| Withdrawal rate | annual net portfolio spend / capital | vs `SpendingPolicy` |
| Buffer years | accessible buffer assets / near-term net spend | vs reviewed target |
| Years funded | depletion solve (§Appendix A) | ≥ horizon |
| Estate readiness | weighted checklist score (M23) | ↑ ≥ 80 |
| Beneficiary coverage | accounts current / applicable | 100% |
| Legacy funding | (deathBenefit + earmarked) / legacyTarget | ≥ 1.0 (when set) |
| Value to heirs | capital + deathBenefit − debts | ↑ |
| Giving progress | given / annual target | ↑ (when set) |

### 8.2 Snapshots

- **Weekly:** score + pace ratio + streak (cheap row, powers trends).
- **Quarter close:** full MetricSnapshot frozen at the moment the quarterly review is completed (not at calendar close — the review IS the close). Immutable once frozen.

### 8.3 The Quarterly Freedom Report (the flagship artifact)

Generated at quarterly review completion; one page; shareable as PDF/link:

1. **Condition banner:** ON PACE / WATCH / OFF PACE (+ pace ratio, projected vs chosen date). In DISTRIBUTION mode: BASE CASE FUNDED / WATCH / AT RISK (+ funded ratio, withdrawal-policy state, buffer years), with any modeled/user-selected spending adjustment acknowledged as part of completion.
2. **The quarter in four numbers:** net worth Δ, savings rate, debt Δ, coverage ratio — each vs last quarter and vs plan.
3. **Rules movement:** rules newly green / newly red.
4. **Binding constraint:** the one thing, named, with its fix.
5. **Commitments:** last quarter's kept/missed; next quarter's 1–3, written by the user.
6. **The date:** "Freedom: June 2036 — 118 months away. Last quarter it was 121."

The report is deliberately signable — the design brief is "something you'd print and put on the refrigerator."

---

## 9. The Off-Track Engine (flagging specification)

### 9.1 Glide path and bands

At plan creation/change, freeze the glide path: `G(t) = C0·(1+i)^t + m*·((1+i)^t − 1)/i` with a zero-rate branch (monthly `t`, `i = r/12`, `m*` = required pace at plan version). The following are initial candidate bands stored in a versioned `ThresholdPolicy`, not hard-coded product truths:

| Band | Condition | UI |
|---|---|---|
| AHEAD | pace ratio ≥ 1.05 | green |
| ON PACE | 0.95 ≤ ratio < 1.05 | green |
| WATCH | 0.85 ≤ ratio < 0.95 | amber |
| OFF PACE | ratio < 0.85 | red |

Re-basing: logging an actual (M3) updates *current capital truth* but does NOT silently rebuild `G(t)` — only an explicit plan edit does, and that edit is versioned and shown at review ("goalposts moved"). Off-track must stay visible; it cannot be cured by refreshing the projection (P2).

**Distribution mode (the handoff):** past the retire date, the pace ratio hands off to the **funded ratio** = `capital / PV(remaining planned net spend over the remaining horizon at plan r)` — same four bands, same thresholds, same UI, so the user's mental model survives retirement intact. The distribution baseline is frozen on entering RED ZONE exactly the way plan edits freeze `G(t)`. Guardrail state (§M21) renders alongside the band, and the two can disagree honestly (funded ratio ON PACE while spending breaches a guardrail — both shown).

### 9.2 Flag catalog

**Tripwires (severity 1 — immediate, red, header badge):**
`EMERGENCY_CRITICAL` (< 1 month) · `HIGH_APR_NEW` (new balance > 10% APR) · `NO_LIFE_INSURANCE` (with dependents) · `NO_DISABILITY` (income-dependent) · `CONCENTRATION` (> 60%) · `MISSED_MINIMUM` (self-reported/detected) · `ESTATE_GAP` (minor dependents AND no will or no guardianship nomination) · `DRAW_ORDER_MISSING` (RED ZONE or DISTRIBUTION only).

**Drift flags (severity 2 — amber, trend-based, need 2 consecutive periods unless noted):**
`PACE_WATCH` / `PACE_OFF` (band changes) · `SAVINGS_DRIFT` (rate < plan 2 months) · `DEBT_SLIP` (payoff > 1 quarter late) · `AUTOMATION_GAP` (< 80% of m*) · `RETURN_MISMATCH` (2 quarters) · `EMERGENCY_LOW` (below target, above critical) · `INCOME_BEHIND` (byYear objective) · `GOAL_UNDERFUNDED` (> 10%) · `WITHDRAWAL_HIGH` (guardrail breach — fires at quarterly review with the prescribed cut, no 2-period wait) · `BUFFER_LOW` (< 1 year of spending) · `BENEFICIARY_MISSING` (applicable account with no beneficiary) · `MEDICARE_BRIDGE` (retireAge < 65, no bridge plan).

**Process flags (severity 3):**
`REVIEW_OVERDUE` (> 14 days) · `STREAK_BROKEN` · `ATTESTATION_STALE` (> 90 days) · `DATA_STALE` (no balance confirm > 45 days — flags dim computed verdicts with "based on data from N weeks ago") · `LEGACY_UNDERFUNDED` (target set, funding < 1.0) · `FAMILY_MEETING_OVERDUE` (charter active, > 13 months).

### 9.3 Alert lifecycle

`detect (engine run) → debounce/dedupe (one open alert per code) → prioritize (severity, then §P4 binding-constraint ordering) → notify (in-app always; email digest per §9.4; push V2) → recommend (every alert carries its fix deep-link and, where possible, a one-tap "commit to fix by <date>") → resolve (auto, when the condition clears on a later engine run — with a "resolved" moment celebrated) → archive`.

**Anti-fatigue rules (MUST):** max 1 email/week unless a severity-1 fires; the Dashboard shows the top 3 by priority, never the full stack; every alert names its metric, threshold, and current value (no vague "attention needed"); P6 applies — flags never fire on never-entered data, only on entered-then-deteriorated or entered-and-failing data.

### 9.4 Notification cadence

| Channel | MVP | V1 |
|---|---|---|
| In-app (badge + stack) | ✓ | ✓ |
| Weekly email ("your week: score, pace, 1 action, streak") | ✓ | ✓ |
| Severity-1 immediate email | ✓ | ✓ |
| Monthly digest + quarterly review summons (7/3/0 days) | — | ✓ |
| Push (mobile/PWA) | — | V2 |

---

## 10. The Accountability System

### 10.1 Commitments and pre-commitment

The atomic unit of follow-through:

`{text, outcomeMetric?, baseline?, target?, sourceModule, due, cadence?, evidenceType, visibility, status: draft|active|kept|missed|renegotiated|cancelled, createdAt, activatedAt?, resolvedAt?}`.

Created from review sessions, alert fixes, accelerator levers, earn playbooks, or the user. Rules:

- Maximum 3 active non-cadence commitments.
- A system-suggested commitment remains a **draft** until the user activates it. The app cannot commit on the user's behalf.
- A missed commitment is acknowledged—kept / missed / renegotiate / cancel with reason—during the next check-in. No shame copy, confetti for dishonesty, or silent expiry.
- Metric-linked commitments read the metric from the engine; users cannot directly edit evidence. Manual evidence is explicitly labeled self-reported.
- `KillCriterion` is an optional advanced form: a binary condition, observation window, response plan, and review cadence chosen before the decision. Triggering it creates a review; it never moves money or labels the person a failure.
- Material edits after activation create a new version. High-consequence criteria may require a 48-hour cooling-off period and optional verifier acknowledgment.

### 10.2 Attestations

For things the app cannot verify (automation set up at the bank, coverage reviewed, draw order written): explicit statements with scope, source, timestamp, expiry policy, and optional evidence metadata. Re-attestation cadence is risk-based, not universally 90 days. The app never treats a checkbox as proof that a product is suitable or in force; it says “user attested.”

### 10.3 Streaks and milestones

Weekly check-in streak (the habit spine); quarterly review streak; milestone moments (first $1,000 buffer · first debt dead · foundation 8/8 green · first AHEAD quarter · coverage 25/50/75/100%). Milestones are *earned states computed from data*, never participation trophies — the celebration copy quotes the number that earned it.

### 10.4 Accountability partner (V1)

Named, authenticated relationship scoped by explicit grants: pace/funding band, streak, current commitments, and selected notes by default—never balances. Grants expire or are reviewed every 90 days, are revocable immediately, and have an access log. The partner can acknowledge, encourage, or request a check-in; they cannot edit the plan, create sanctions, market products, or see other relationships. Avoid anonymous bearer links for ongoing access. V2: coach workspace subject to separate role, agreement, supervision, and compliance review.

### 10.5 Community product architecture

Community exists to improve execution and reduce isolation. It is not a financial social network.

| Surface | Size | Visibility | Core job | Release |
|---|---:|---|---|---|
| **Accountability Circle** | 2–8 | Private, invite/matched | Weekly commitments, encouragement, review ritual | Founder Pilot |
| **Phase Cohort** | 12–30 | Private cohort | 6–8 week guided curriculum for Stabilize/Secure/Accumulate | Public MVP |
| **Learning Room** | many | Moderated, pseudonymous allowed | Ask questions about approved education; searchable answers | V1 |
| **Expert Office Hours** | event | Registered attendees | General education with disclosures and archived Q&A | V1 |
| **Household/Family Room** | invited family | Private | Shared charter, age-appropriate education, annual meeting | V2 |

There is no global feed in Founder Pilot/MVP, no follower counts, no public DMs, no public net-worth/return leaderboard, and no “hot strategy” ranking.

### 10.6 Community onboarding and matching

Users choose whether to join. Matching inputs: canonical phase, time zone, preferred cadence, topic, household style, communication preference, age-range opt-in, and whether they want peer-only or facilitator-led support. Exact balances, income, debt, employer, address, ethnicity, religion, health, immigration status, and advisory-client status are not matching inputs.

Before entry, users accept a plain-language Community Standard and complete a two-minute safety orientation: protect identity, do not share account numbers/documents, no requests for money, no product pitches, and report pressure or fraud. A user may use a display alias and leave/mute/block at any time.

### 10.7 Community privacy and sharing

- Default progress card contains: display alias, phase, commitment text, due state, weekly check-in state, and optional non-financial milestone.
- Exact dollars are off by default and cannot be enabled in a Learning Room. In a private Circle, a user may share a range or exact value per post; the UI warns before exact-value sharing.
- Posts are never used in advertising, testimonials, AI training, or adviser prospecting without separate purpose-specific consent.
- Deleted community content disappears from members promptly; abuse/security evidence may be retained under a disclosed schedule.
- Search engines and unauthenticated visitors cannot index or read member content.

### 10.8 Community safety and moderation

**Prohibited:** personalized buy/sell/borrow/claim instructions; securities, insurance, credit, tax-scheme, crypto, MLM, debt-relief, or paid-service solicitation; affiliate/referral links; performance claims presented as typical; impersonation; requests for money or credentials; moving a conversation off-platform to evade moderation; harassment, discrimination, shame, doxxing, or sharing another person's financial data.

**Controls**

- Pre-publication rules for links, contact information, high-risk product terms, credentials, and account-number patterns; flags assist but do not make final nuanced decisions.
- Report, block, mute, and leave controls on every community surface.
- Severity targets: credible fraud/account takeover/imminent financial exploitation queued immediately; threats/doxxing/harassment within 4 hours; solicitation/misinformation within 24 hours; ordinary disputes within 2 business days. Final staffed SLAs are set before public launch.
- Moderation states: `VISIBLE / LIMITED / REMOVED / QUARANTINED / ESCALATED`; each records policy code, evidence, actor, timestamp, notification, and appeal state.
- A two-person review is required for permanent bans except urgent containment; users receive a reason and appeal path.
- Facilitators and experts are verified, trained, disclosed, supervised, and barred from using roster data for sales.
- Trust & Safety can review reported community content but not household balances or documents.

### 10.9 Safe accountability stakes

The prototype's verifier, kill-criteria registry, cooling-off, and modification log are valuable. Its financial/reputational “stakes” and “dead-man switch” require redesign.

- Stakes are optional, off by default, self-authored, and capped. Safe examples: send an honest update, schedule a review, pause a discretionary hobby budget manually, or complete a learning module.
- The app prohibits stakes involving essential expenses, debt minimums, rent/mortgage, insurance, medication/health, food, childcare, immigration/legal needs, humiliation, political/charitable causes the user opposes, third-party punishment, self-harm, gambling, or unauthorized financial actions.
- Freedom Command never holds stake funds, charges a penalty, donates, reallocates, contacts an employer/family member, or executes a consequence.
- Verifier authority is advisory/acknowledgment only in consumer SaaS. “Binding approval” is not a platform power.

### 10.10 Community acceptance criteria and metrics

**Release gates**

1. Private-by-default sharing verified by authorization tests.
2. Report/block/leave/appeal flows pass E2E and accessibility tests.
3. Moderation runbook, trained coverage, escalation contacts, evidence retention, and incident simulation are complete.
4. Seed content and facilitators are reviewed; an empty or unsafe community does not launch.
5. No expert, coach, moderator, advisory employee, or member can export a roster for marketing.

**Metrics:** circle activation, weekly check-in lift vs matched non-community cohort, 8-week circle retention, commitments kept, helpfulness rating, report rate, substantiated-harm rate, median moderation time, appeal overturn rate, unsolicited-DM/solicitation attempts, and member-reported safety. Do not optimize posts, time-on-feed, virality, or financial-performance claims.

---

## 11. Engagement design (dignified gamification)

Phases are the levels; the score is the XP; streaks are the habit mechanic; milestones are the achievements — all of them **true** (computed from real financial state, per §10.3). Explicitly banned: dark patterns, loss-aversion countdown timers, engagement-bait notifications, celebrating logins. The retention thesis is P8: the product that keeps you in the system longest wins *for you* — engagement design serves time-in-system, and time-in-system is the user's compounding.

---

## 12. Compliance & trust posture (consumer SaaS)

This section is a design requirement, not legal advice; **engage securities/insurance counsel before launch.**

1. **Intended posture: self-directed educational/planning software.** It computes, teaches, and flags against the household's inputs and visible rules. Labels and disclaimers are necessary but not sufficient: personalized output, prompts, rankings, calls to action, compensation, human involvement, and integration with Ekantik advisory/insurance activities determine the actual legal posture. Securities, insurance, consumer-finance, privacy, and advertising counsel MUST review the product behavior and entity structure before pilot and each material expansion.
2. **No security-level recommendations.** Portfolio module operates at asset-class and expected-return level only. No "buy X."
3. **Verdict framing:** core product uses condition states (`CLEAR / WATCH / BLOCKED / NOT_YET`) and scenario comparisons. `PROCEED / HOLD / STOP`, rankings of personalized strategies, and “do this” language require specific counsel approval because “your own rules” framing does not automatically remove recommendation risk.
4. **Tax and insurance edges:** tax assumptions are user-confirmed and sourced; “ask your CPA” is a referral to verification, not a cure for inaccurate output. Policy values can be shown only from a dated carrier illustration/in-force statement with carrier, policy form, guaranteed/non-guaranteed separation, premium schedule, loans, and source date. The app never computes a 7-pay/MEC limit, represents a policy loan as automatically tax-free, or describes illustrated values as guaranteed. Life-insurance illustration handling is reviewed against applicable state adoption of NAIC Model #582 and later guidance.
5. **Separation from Ekantik advisory:** the SaaS and the RIA are separate offerings with separate hats. In-app pathways to "talk to a fiduciary" are clearly labeled as a separate advisory service. No SaaS surface implies the software itself owes or performs fiduciary duties; conversely, Ekantik's Standard (accountability, transparency) is the brand voice of the software.
6. **Marketing compliance:** no performance guarantees; "financial freedom in your time frame" is a planning framework, not a promise; testimonials with required disclosures only.
7. **Data ethics as brand:** no selling data, no ads, no "partner offers" for kickbacks — radical transparency includes the business model (subscription only). State it on the pricing page.
8. **Estate module boundaries:** checklist, audit, scoring, and education only. The app drafts no legal documents, and every estate surface says "complete this with an attorney or a reputable document service." State-law nuances render as education, not guidance.
9. **Government-benefit boundaries:** Social Security math uses statutory adjustment factors and the user's own SSA-statement PIA; breakeven charts are labeled nominal (no COLA/discounting); Medicare and RMD content (73 now; 75 from 2033 for those born 1960+, SECURE 2.0) is education-only with "confirm with SSA/Medicare/your CPA" framing. The app never files, claims, or advises on timing — it shows what each timing does to *the user's own plan*.
10. **Community and user-generated content:** Community Standards prohibit solicitation and individualized high-risk instructions (§10.8). Moderation does not convert every member statement into approved Ekantik content. Staff/expert statements, pinned answers, curriculum, and reused member outcomes are separately supervised and archived.
11. **Testimonials and advisory marketing:** member wins, badges, reviews, referrals, community highlights, experts, and compensated facilitators are not automatically reusable marketing. Any reuse requires consent, typical-results context, material-connection disclosure, and review under the FTC Endorsement Guides/Consumer Reviews and Testimonials Rule and, where an adviser advertisement is implicated, SEC Rule 206(4)-1. No reward is conditioned on positive sentiment.
12. **Financial-data regulation:** before aggregation, counsel must determine the product's obligations as a data recipient/aggregator/service provider and account for the then-current status of CFPB 12 CFR Part 1033; as of January 2026 the CFPB reports that compliance dates were stayed. Provider marketing must not claim regulatory certainty.
13. **GLBA/Safeguards assessment:** before pilot, counsel documents whether any Ekantik entity/product is a covered financial institution or service provider. Regardless of coverage, security controls meet or exceed the risk-based baseline in §13; if covered, the written information-security program, service-provider oversight, incident reporting, and retention obligations are mapped explicitly.
14. **Credit/eligibility boundary:** no score, phase, commitment, community behavior, or inferred attribute is used to approve, price, rank, or market credit, insurance, employment, housing, or another eligibility decision.
15. **Records and supervision:** retain content versions, claim approvals, formula/threshold versions, staff/expert community communications, consent, access logs, moderation decisions, and marketing approvals under a counsel-approved schedule. Product analytics alone are not the books-and-records system.

### 12.1 Mandatory pre-release legal/compliance decisions

The release checklist must contain signed decisions—not open questions—for:

1. Entity and “separate hats” architecture across SaaS, RIA, insurance, coaching, and community.
2. Investment-adviser/robo-adviser analysis of personalized projections, rankings, nudges, AI, and human escalation.
3. State insurance producer/advertising/illustration analysis for every policy-related screen.
4. FTC/SEC marketing, testimonials, endorsements, expert/facilitator compensation, and referral program.
5. GLBA/FTC Safeguards, state privacy, breach notice, children's/minors, data aggregation, and document retention.
6. Terms, privacy notice, community standards, moderation/appeals, subscription/renewal/cancellation, and accessibility.
7. Approved wording matrix for `educational`, `scenario`, `estimate`, `guaranteed`, `illustrated`, `tax-free`, `fiduciary`, `safe`, `on track`, and every verdict label.

---

## 13. Non-functional requirements

- **Security program:** adopt a NIST CSF 2.0 profile and verify the application against OWASP ASVS 5.0 Level 2 (version-pinned) before public launch. Maintain threat model, asset/data-flow inventory, dependency/SBOM scanning, secret scanning, SAST/DAST, code review, annual penetration test, vulnerability SLAs, backup-restore test, incident runbook, tabletop, and named security owner. “SOC 2 path” is a plan with evidence milestones; do not market certification before the report exists.
- **Identity and authorization:** passkeys or MFA for owners/admins; secure recovery; breached-password defense when passwords exist; short-lived privileged sessions; server-side household authorization; row-level tenant isolation; object-level authorization tests; staff JIT access with approval/reason/expiry; session/device view and revoke.
- **Cryptography and secrets:** TLS 1.2+ (prefer 1.3); managed encryption at rest; application/field encryption for high-risk values with keys outside the database; rotation and separation of duties; no sensitive data in URLs, analytics, error payloads, support tools, prompts, or logs. Exact algorithms/key sizes follow current platform/security review rather than a marketing-only “AES-256” checkbox.
- **Privacy:** complete data inventory, purpose, legal basis/consent where applicable, retention, processors, and deletion behavior per field class. Export-my-data is in MVP. Verified deletion completes within the disclosed period except immutable security/billing/legal records, which are minimized and separately retained. No sale or cross-context behavioral advertising. Global Privacy Control and state-rights workflows are evaluated by counsel.
- **Data classification:** `PUBLIC · INTERNAL · CONFIDENTIAL · RESTRICTED_FINANCIAL · RESTRICTED_IDENTITY · RESTRICTED_DOCUMENT`. Policies govern logging, analytics, support access, community sharing, export, retention, and vendor eligibility by class.
- **Availability/perf:** 99.9% target; engine run < 50 ms p95; page TTI < 2.5 s p75 mobile.
- **Reliability:** MVP SLOs and error budgets are defined before beta. Target RPO ≤ 15 minutes and RTO ≤ 4 hours for household plan data; quarterly restore test. Financial mutations are idempotent, transactional, and auditable. A partial provider outage never corrupts the last reconciled truth.
- **Accessibility:** WCAG 2.2 AA target; keyboard-only, screen-reader, 200% zoom/reflow, target size, focus visibility, reduced motion, non-color meaning, accessible authentication, redundant-entry reduction, charts with text/table alternatives, and representative manual testing with disabled users.
- **Data freshness honesty:** every computed surface displays its as-of date when data is > 14 days old.
- **Offline/degradation:** read-only PWA cache of a deliberately minimized last result; disabled by default on shared devices; no documents, account identifiers, community content, or support data cached offline.
- **Observability:** correlation IDs; structured, redacted logs; metrics/traces; engine latency/version; authorization denials; import reconciliation; notification delivery; moderation queues; audit-log integrity; SLO dashboards and alerts. Product events exclude exact balances and free text.
- **Compatibility:** current and previous major versions of Chrome, Edge, Safari, and Firefox; responsive 360px+; graceful behavior with text scaling and slow networks.
- **Localization/content:** US English first, timezone-aware cadence, locale-safe currency/date/number parsing, eighth-grade target for core instructions, glossary for unavoidable financial terms, and separate content versions per locale/jurisdiction.
- **Email/SMS:** verified domains, SPF/DKIM/DMARC, preference center, one-click unsubscribe where required, bounce/complaint handling, quiet hours, and no sensitive values in subject lines or lock-screen previews. SMS is opt-in and not required for core use.

---

## 14. Technical architecture (recommended; swappable if justified in an ADR)

- **Approach:** start as a modular monolith plus background worker. Domain boundaries are explicit; network microservices are earned by scale/compliance needs. Pin supported runtime/framework versions at implementation kickoff and update through dependency policy rather than hard-coding “latest” in product requirements.
- **Monorepo:** `apps/web` · `apps/worker` · `packages/engine` (**pure TypeScript, deterministic, zero I/O**) · `packages/policies` (phase/score/flag/threshold versions) · `packages/schemas` · `packages/authz` · `packages/ui` · `packages/content` (claim/disclosure references) · `packages/notifications`.
- **Domains:** identity/household, plan/ledger, engine/policies, cadence/accountability, community/trust-safety, content/claims, billing/entitlements, imports/providers, notifications, support/admin, analytics/audit.
- **Data:** Postgres with migrations, tenant-scoped repositories, row-level defense in depth, soft delete for user-correctable finance rows, immutable append-only audit events, and separate retention/deletion state. Redis/managed queue only where retries/scheduling are required.
- **Auth:** Clerk or Auth.js (email + OAuth + MFA). **Payments:** Stripe (monthly/annual). **Email:** Resend + React Email.
- **Authorization:** a provider handles authentication, not business authorization. All reads/writes call the shared `authz` package with actor, household, role, scope, resource, and purpose; UI hiding never substitutes for server enforcement.
- **API:** typed server API; commands validate schema, authorization, idempotency key, optimistic version, and audit context. `getEngineResult(householdId, planVersion, engineVersion, policyVersions)` is the canonical computed read. Historical snapshots never silently recompute.
- **Analytics:** privacy-minimized product analytics + first-party outcome event table. Exact dollars, account labels, documents, commitment free text, community text, and sensitive inferred traits never enter third-party analytics.
- **CSV import:** debts/accounts/holdings importers with mapping UI (MVP); aggregation (Plaid/MX) isolated behind a provider interface for V2.
- **Import reconciliation:** staged import → mapping → validation → duplicate detection → preview diff → user confirmation → atomic commit → provenance. Provider data never overwrites a user-reconciled record silently.
- **Community:** private membership graph, scoped progress cards, posts/comments/reactions, reports, moderation cases, blocks/mutes, appeals, facilitator credentials, and rate limits. Community store/query paths cannot join to finance tables except through an explicit privacy-filtered `SharedProgressView`.
- **Content/claims:** headless authoring is optional; the product requires approval workflow, immutable published version, effective dates, reviewer, source, jurisdiction, disclosure bundle, and rollback.
- **Entitlements:** server-side `PlanEntitlement` and `FeatureReleaseGate`; billing status does not directly grant high-risk modules. Advanced feature access is the intersection of product stage, subscription, phase, completeness, jurisdiction, compliance approval, and user consent.
- **Admin/support:** separate application/route group, strong MFA, IP/device/risk controls as appropriate, no bulk financial export, just-in-time access, visible user-session banner, and audit. Moderation tooling cannot open household finances.
- **AI-assisted development guardrails:** engine and policy packages are test-first; generated code receives human review; UI states are covered in Storybook or equivalent; PRs link requirements, threat/model-risk changes, tests, and screenshots. No production secrets or real household data enter coding assistants.

### 14.1 AI copilot boundary (V2)

- Retrieval corpus: current approved education/content claims + the requesting household's privacy-filtered EngineResult and source metadata.
- The model may explain, summarize, compare already-computed scenarios, draft a commitment for confirmation, or navigate to a module.
- The model may not invent rates/thresholds, compute authoritative values outside the engine, recommend a security/product, rank proprietary strategies, override a gate, infer protected/sensitive traits, moderate sanctions autonomously, or take external action.
- Responses cite the engine fields/content versions used, label uncertainty, and offer correction when source data is stale/missing.
- Prompt-injection defenses treat imports, documents, community posts, and URLs as untrusted data. Tools use allowlists, structured arguments, least privilege, and confirmation for any future state-changing capability.
- High-risk queries (self-harm tied to finances, exploitation/scam, eviction/foreclosure, inability to meet essentials, legal/tax/benefit specifics, or product recommendations) route to approved safe responses and human/authoritative resources under a reviewed policy.
- Log redacted prompts/responses only under disclosed retention and user controls; do not train external models on household/community content by default.

## 15. Testing & quality (the golden-number method)

The reference system's core QA practice — **every rendered figure independently cross-checked against a second implementation** — becomes CI:

1. **Golden tests:** an independent implementation computes canonical cases; the TS engine must match the defined rounding/tolerance. Approved seeds: amortization schedules; zero-rate and negative-required-pace boundaries; cash-flow-matched prepay/invest NPV and break-even cases; Model B obligation drop-off; real/nominal conversion; pace/funded band edges; missing/applicability score cases; historical policy-version snapshots; depletion and guardrail boundaries; authoritative benefits factors effective for the content version; legacy earmark/insurance-gap cases; estate-readiness reweighting. The prototype's `effective cost` and “~2×” tables are regression fixtures only in a `deprecated-prototype` suite and MUST NOT drive production verdicts.
2. **Property tests:** verdicts are monotone in their driving variable; dead bands produce HOLD, never oscillation; `m*` reproduces `F` when fed back through the projection; no NaN/Infinity for any bounded input.
3. **Verdict-flip tests:** every verdict surface has a test crossing each threshold in both directions.
4. **P6 test:** a brand-new household with minimal inputs renders zero BLOCKED/red states.
5. **E2E (Playwright):** onboarding → plan → first action; quarterly review completion; alert fire→fix→resolve. Accessibility CI (axe).
6. **Engine versioning:** `EngineResult.engineVersion`; snapshots store the version that computed them; formula changes require a migration note and golden-test update in the same PR.
7. **Model-risk review:** each formula/threshold documents purpose, units, assumptions, valid range, failure modes, economic rationale, owner, independent reviewer, source, effective version, and user disclosure. Verification approval is separate from code review.
8. **Authorization/tenancy tests:** role × scope × resource matrix; cross-household object-ID attacks; invite/share expiry; removed member; support JIT access; moderator cannot read finances; community view cannot join restricted finance fields.
9. **Privacy tests:** analytics/log redaction; export completeness; deletion/retention; offline cache; notification previews; consent withdrawal; community exact-value warnings; no indexing of private content.
10. **Community abuse tests:** solicitation/link controls, report/block/leave/appeal, rate limits, ban evasion signals, facilitator boundaries, moderation evidence/audit, false-positive recovery, and accessibility.
11. **Security tests:** ASVS-mapped cases, dependency/secret scanning, abuse-rate limits, file validation, CSV injection, prompt injection, stored XSS in community/free text, CSRF, SSRF, authorization, session recovery, backup restore, and incident simulation.
12. **Migration tests:** prototype import maps phase aliases, preserves original values/provenance, quarantines policy illustrations, stores the 0–300 rubric as `LegacySystemsIndex`, and never treats sample/person-specific prototype data as a new user's defaults.

### 15.1 Concrete golden seed values (v2.1 — independently verified)

Golden tests need numbers, not categories. The following cases are verified against an
independent Python model and MUST match to the stated tolerance (cents unless noted):

| Case | Inputs | Expected |
|---|---|---|
| Amortization payment | $285,000 · 6.25% · 30y | pmt = $1,754.79/mo; payoff-n inverse returns 360.000 |
| Zero-rate branches | i = 0 | `m* = (F − C0)/n`; `pmt = P/n`; projection consistency holds |
| Required-pace round trip | C0 $480,000 · r 8% nominal · n 132 · F $1.6M | m* = $2,118.63; recurrence reproduces F exactly |
| Glide-path identity | same case | `G(n) = F` exactly |
| **Matched-cash-flow break-even (property)** | any (P, APR, term); finance-and-stay-invested vs pay-cash-and-invest-payments | break-even net return **equals the contractual monthly-compounded APR** (verified at 6.25%/30y, 6.5%/30y, 8%/10y) |
| Deprecated-prototype fixture | 10.32% loan vs 4% growth · 30y (the old "~2×" boundary) | matched flows: financing **loses** ≈ $2.94 per $1 (−88.8%) — regression-pinned in the `deprecated-prototype` suite as proof the shortcut must never ship |
| Depletion solve | C $1M · r 5% real · S $80K real | n = 20.10y; simulation agrees ±1y; S ≤ C·r → ∞ |
| Funded-ratio identity | capital = PV(30y × $80K @ 5%) = $1,229,796 | funded ratio = 1.0 and capital funds exactly 30 years |
| Guardrail corridor edges | w0 = 5% | 6.1% → cut modeled; 3.9% → raise modeled; 5.9% / 4.1% → base spending |
| Benefits factors (content-versioned) | FRA 67 statutory | 62 → 0.700 · 65 → 0.867 · 67 → 1.000 · 70 → 1.240; nominal breakevens ≈ 78.7 (62v67), ≈ 82.5 (67v70) |
| Legacy earmark model | target $750K · eligible net DB $500K · earmarked $300K | gap $250K; requiredEarmark $250K; raising DB to $800K → gap 0, newlyUnearmarked $250K |
| Estate reweighting | guardianship N/A; will+beneficiaries+directive complete | score = 100 × 65/90 = 72.2 |
| Volatility drag (education) | $300K · 30y · steady 4.5% vs alternating +24.4%/−15.4% | $1,123,595 vs $645,628 |
| P6 fresh household | minimal inputs | zero BLOCKED/red states anywhere |

---

## 16. Phased roadmap with acceptance criteria

The reference prototype is broad enough to demonstrate the vision, but a 17-module public MVP in twelve weeks would create unacceptable product, model, privacy, and compliance risk. Delivery is evidence-gated, not calendar-promised.

### Founder Pilot — “The private loop” (target 8–12 weeks after discovery sign-off)

**Audience:** 50–100 invited households under explicit pilot terms; staffed onboarding/support; no public self-serve acquisition.

**Scope**

- Identity, household owner/co-owner, consent, audit, export/delete.
- M1 diagnostic using ranges; canonical phase; M2 plan; M3 base/downside trajectory.
- Simple M4 cash flow, M5 debt inventory/burndown, M6 accessible reserves.
- M14 resilience essentials; one next action.
- M17 weekly check-in; M19 commitments, versioning, optional named partner.
- **Community:** invite-only private circles (2–8), progress cards, check-in ritual, report/block/leave, staff moderation. No global feed, DMs, or expert marketplace.
- Founder-admin content/claims workflow, support tooling, privacy-minimized analytics, email reminders.
- No payments required for the pilot unless billing operations are specifically being tested. No bank aggregation, holdings, policy/LFIR, Social Security recommendations, AI copilot, document vault, or public community.

**Exit gates**

1. ≥70% of invited users can reach a phase, plan range, assumptions, one next action, and first commitment in ≤15 minutes without facilitator data correction.
2. ≥50% of activated households complete 4 of the first 6 weekly check-ins; circle cohort shows no safety regression and a directional adherence lift.
3. At least 20 households complete a monthly/quarterly-style review; research confirms the one-next-action is understood and not experienced as advice or shame.
4. All §12.1 pilot decisions signed; high-risk language removed; threat/model-risk review complete.
5. Cross-household/authz, export/delete, moderation, accessibility, restore, and incident-tabletop gates pass.
6. Zero open severity-1 security/privacy/community incidents and a documented resolution for every material pilot issue.

### Public MVP — “The loop, self-serve”

**Scope added to Pilot**

- Self-serve signup, pricing/trial, Stripe, renewal/cancellation/refund flows, marketing site with approved claims.
- Dashboard, M7 written automation/attestations, M8 income streams, M11 contribution engine, one M12 goal, M13 safe canonical levers, M15 Freedom Health Score, M16 transparent rules.
- Guided quarterly close + downloadable/shareable privacy-filtered report.
- CSV staged import/reconciliation; account freshness/confidence.
- Phase cohorts (12–30) with approved curriculum and trained facilitators.
- Notification preference center and reviewed milestone system.

**MVP acceptance criteria**

1. Editing source data returns one versioned EngineResult; all consumers show the same as-of/version.
2. Fresh/missing data yields no false red; stale/contradictory data is visible; score confidence behaves per M15.
3. Feasibility can state `REQUIRES CHANGE` or `INSUFFICIENT DATA` and names the visible binding constraint without a product/security recommendation.
4. Full quarterly review freezes a snapshot, acknowledges changes/assumptions, and creates 1–3 user-activated commitments.
5. Billing, cancellation, data rights, accessibility, security, authorization, community moderation, and claim-approval suites pass.
6. Core flows meet WCAG 2.2 AA target and manual assistive-technology acceptance.

### V1 — “Correct, collaborate, prepare”

- M9 Earn Engine; M10 portfolio by asset class; multiple M12 goals; custom M13 scenarios.
- Full monthly close, historical correction workflow, accountability partner, circles/cohorts, moderated learning rooms and office hours.
- M20 retirement readiness and M21 drawdown/guardrails only after independent retirement-model review; M23 estate checklist/beneficiary audit; revised M24 legacy gap/earmark model.
- PWA read-only cache; provider aggregation only after the §1033/provider/legal gate and reconciliation design are approved.
- No policy/LFIR strategy lab and no adviser/coach workspace by default.

**Exit gate:** demonstrate that OFF PACE/AT RISK users can understand the reason, compare bounded corrective levers, activate a safe commitment, and improve a leading behavior without increased complaints, harmful actions, or community pressure.

### V2 — “Regulated depth, if earned”

- M22 benefits timing with current authoritative sources and specialist review.
- M25 family governance/household seats; document-vault only after separate security/privacy assessment.
- Coach/advisor workspace with entity, supervision, books/records, consent, and role separation.
- AI copilot within §14.1.
- Native mobile only if retention/workflow evidence justifies it.
- Advanced Strategy Lab, including policy-based content, only as separately approved feature packs with jurisdiction, credentials, evidence, disclosures, and monitoring. The lab may never be required for phase advancement or shown as the default path to freedom.

### 16.1 Release governance

Every feature has a `ReleaseGate` covering product evidence, model-risk, legal/compliance, security/privacy, accessibility, operations/support, analytics, and rollback. A calendar date cannot waive an unmet gate. Feature flags support staff-only → pilot cohort → percentage rollout → general availability → kill switch. Financial formula/policy changes use shadow computation and snapshot-diff review before affecting user-visible truth.

---

## 17. Product success metrics (the company's own scorecard)

| Metric | Definition | Target (12 mo post-launch) |
|---|---|---|
| Activation | completed diagnostic + plan + first action viewed | ≥ 55% of signups |
| The Loop lives | weekly check-in completion | ≥ 45% of actives |
| Quarterly close rate | quarterly reviews completed on time | ≥ 60% of subscribers |
| **Foundation repair** | % of users with ≥ 1 red Foundation rule at signup that is green by day 90 | ≥ 40% |
| **Pace improvement** | median pace-ratio delta, signup → month 6 | > 0 |
| **Estate repair** | % of users with minor dependents completing will + guardianship + beneficiaries by day 180 | ≥ 30% |
| Retention | M12 logo retention | ≥ 65% |
| NPS driver question | "this product tells me the truth" agreement | ≥ 80% |
| Time to first value | Median minutes from signup to accepted next action | ≤ 15 min |
| Data trust | % of active households with reconciled/current core inputs | baseline in Pilot; target after 2 cohorts |
| Commitment integrity | Kept + honestly renegotiated / due commitments | trend up without reduced ambition |
| Community lift | Difference in 6-week check-in completion for matched circle vs non-circle users | positive with no safety regression |
| Community safety | Substantiated severe incidents per 1,000 active community users | explicit risk appetite set before MVP |
| Moderation quality | SLA attainment + appeal overturn rate | staffed targets set before MVP |
| Harm signal | Users reporting they took an unsafe action because of product/community output | zero tolerance for confirmed severity-1 patterns |
| Model corrections | Material user-facing calculation/policy defects | zero open; every event has impact analysis |
| Privacy/security | Confirmed cross-household exposure or unauthorized finance access | zero |

The three bolded metrics are the mission metrics — the product exists to move them, and the reference system's thesis is that the Loop (not the calculators) moves them. Estate repair earns its place among them: it is the cheapest catastrophic-risk fix in personal finance, and 76% of the market hasn't done it.

**Pricing hypothesis—not a decision:** Free may include the private diagnostic, plan range, one next action, and limited check-ins. Paid should monetize the operating loop, history, scenarios, household collaboration, circles/cohorts, and reports—not fear, red alerts, data export/delete, accessibility, or safety. Test willingness-to-pay during the Pilot. Any displayed price, competitor comparison, trial, renewal, cancellation, or discount is a dated approved claim. Advisory/insurance hand-off and coach workspace are separate services with separate consent and economics.

### 17.1 Company guardrail metrics

Growth reviews pair every activation/retention/revenue metric with trust and harm metrics. A feature cannot be declared successful if it increases conversion while worsening misunderstanding, risky action, privacy exposure, community solicitation, complaints, cancellations-after-renewal, or support burden. No experiment hides assumptions/disclosures, changes a risk threshold, increases notification pressure, or varies access to safety features.

---

## 18. Product operations and service blueprint

Software does not close the accountability loop by itself. The operating model is part of the product.

### 18.1 Subscription and entitlement operations

- Server is authoritative for trial, plan, grace, cancellation, refund, chargeback, and feature entitlement.
- Cancellation is self-serve and no harder than signup. Users retain read/export access for the disclosed grace period; safety, privacy, deletion, and community report/leave controls never require payment.
- Failed payment does not delete data or expose private circle status. Notifications use neutral copy.
- Grandfathering, price changes, taxes, promo eligibility, and refunds have written policies and audit.
- A billing plan cannot bypass a compliance/model-risk release gate.

### 18.2 Support and complaints

Support taxonomy: access/billing · data/import · calculation/assumption · privacy/security · accessibility · community/safety · regulated-service/marketing · general how-to.

- Every calculation dispute captures EngineResult, source-field provenance, engine/policy/content versions, locale, and displayed rounding—without copying unnecessary financial data into the ticket.
- Users can submit a data correction from the affected field and see whether historical snapshots change (normally they do not; corrections create annotated restatements).
- Security/privacy, financial exploitation, misleading claims, regulated-service complaints, and accessibility blockers have specialist escalation and preservation rules.
- Support may explain the product; it does not improvise financial/tax/legal/insurance advice.
- Publish response targets, status page, escalation route, and complaint appeal. Review complaint themes monthly with product/compliance/model-risk owners.

### 18.3 Trust & Safety operations

Before any public community: staffed coverage schedule, on-call/escalation contacts, fraud and imminent-harm playbooks, moderator training/certification, QA sampling, appeals reviewer, transparency metrics, evidence access controls, law-enforcement request process, and facilitator removal process. Automated tools prioritize; trained people own ambiguous enforcement.

### 18.4 Content and model operations

- Weekly automated expiry report for Tier A/B claims; monthly owner review; immediate emergency unpublish.
- Quarterly threshold/score/flag review; changes require user-impact simulation and method-change disclosure.
- Annual independent review of high-impact planning/retirement models, or sooner after a material legal/market/method change.
- Benefits/tax/limits content has effective-year versions. The system never rolls a user's historical report onto new law silently.
- A kill switch can disable a module, formula policy, claim, notification, AI tool, import provider, or community posting while preserving read access and evidence.

### 18.5 Definition of done

A feature is not done until: requirements/acceptance tests pass; content and disclosures approved; threat/privacy/model-risk changes reviewed; telemetry and support playbook exist; accessibility verified; migration/rollback/kill switch tested; ownership and review date assigned; and the release gate is recorded.

## 19. Brand expression in product (from the Ekantik identity system)

- **Name:** open founder decision (§20). Candidates: Financial Freedom Command Center / Freedom Command, by Ekantik. Validate trademark and domain before launch.
- **Palette:** Deep Navy `#1B2A4A` (structure, verdict panels) + Warm Gold `#C8A951` (progress, earned states) on White/Soft Ivory `#FAF8F5`; Forest Green for pass/growth states; Signal Red reserved for tripwires only. Data-viz accent Teal `#0D9488`.
- **Type:** serif display (Playfair Display or equivalent) for verdicts, numbers, and phase names; clean sans (Source Sans Pro / DM Sans) for UI. Uppercase + letter-spacing for section labels (the reference system's signature look).
- **Voice:** the Sophisticated Steward—confident, warm, radically transparent. “Fiduciary” is reserved for a person/entity legally acting in that capacity. The product's catchphrases are earned behaviors, not slogans: “A philosophy asks to be believed. A gate shows its work and can be failed.” · “The number nobody puts in the brochure.” · “Secure the floor before reaching for the ceiling.”
- **The Ekantik Standard** maps carefully: mass-market mission → Impact; the Loop → Accountability; visible rules/assumptions → Transparency; evidence and honesty → trust. Any fiduciary posture belongs to the separately identified regulated relationship, not to the software by implication. Compliance guardrails apply to all product marketing (§12).

---

## 20. Founder decision register

These decisions belong to the founder, not to this document or any reviewer. Each blocks
the stage listed; the specification proceeds on the stated working assumption until decided.

| # | Decision | Blocks | Working assumption |
|---|---|---|---|
| D1 | Public product name (long/short form) + trademark/domain | Public MVP marketing | "Freedom Command" as working short name |
| D2 | The initial paid promise: individual self-direction, household collaboration, or cohort experience | Pilot design | Individual + optional circle |
| D3 | Pilot audience and recruitment channel (broad consumers vs a narrower first segment) | Founder Pilot | Invited mixed-phase households from existing audience |
| D4 | Whether Ekantik advisory/insurance entities link at launch; if yes, entity/consent/supervision architecture first (§12.1-1) | Any cross-service surface | Not linked at launch |
| D5 | Community operating model: peer-led, Ekantik-facilitated, or trained contractor facilitators | Pilot circles | Founder-facilitated pilot circles |
| D6 | Pricing and trial policy after willingness-to-pay research | Public MVP billing | Test in pilot; hypothesis in §17 |
| D7 | Named owners for model risk, content claims, compliance approval, Trust & Safety, and security | Founder Pilot exit | Founder owns all five until delegated in writing |

---

## Appendix A — Formula quick reference (implement in `@freedom/engine`; all rates fractions)

```
freedomNumberRange = freedomSpendingNeedRange / planningWithdrawalRateSet

netRealReturn    = (1 + nominalNetReturn) / (1 + inflation) − 1
nominalNetReturn = nominalGrossReturn − explicitFeeDrag − explicitTaxDrag
                  // implementation specifies whether components are arithmetic
                  // approximations or exact cash-flow deductions; never mix units

i               = netRealReturn / 12
projection      : C[t+1] = C[t]·(1+i) + m[t]
requiredPace m* = (F − C0·(1+i)^n)·i / ((1+i)^n − 1), when i ≠ 0
requiredPace m* = (F − C0)/n, when i = 0
displayedPace   = max(0, m*)
glidePath G(t)  = C0·(1+i)^t + m*·((1+i)^t − 1)/i, with zero-rate branch
paceRatio       = currentCapital / G(now), with defined zero-denominator state
modelB m (mo)   = max(0, plannedSurplus − debtService − goalFunding)
                  // all values monthly and in today's dollars

amortized pmt   = P·j / (1 − (1+j)^−n), j = contractual APR/12
amortized pmt   = P/n, when j = 0
payoff n        = −ln(1 − P·j/pmt) / ln(1+j), only when pmt > P·j

// Prepay vs invest: build dated cash-flow arrays for both strategies.
npv(strategy, d)= Σ cashFlow[t] / (1+d)^(days[t]/365.2425)
breakEvenReturn = solve r where NPV(prepay, r) = NPV(invest, r)
                  // show fees, taxes, liquidity, collateral and downside separately
                  // no production "effective cost" or "~2×" shortcut

coverage        = reliableNonPortfolioIncome / freedomSpendingNeed
concentration   = topStream / totalIncome
emergencyMonths = accessibleReserves / essentialMonthly

freedomHealth   = weightedApplicable(
                    paceOrFunding, resilience, cashFlowMargin,
                    debtObligations, followThrough, ScorePolicy.version)
                  // missing ≠ zero; material tripwires may cap display band

// ---- distribution & legacy (model-reviewed before V1) ----
reliableIncome GI = approvedBenefitScenario + pensions + otherReliableIncome
netSpend S        = retirementSpend − GI
planningCapacity  = capital × planningWithdrawalRate
yearsFunded n     = annuity depletion solve using net real return and explicit
                    zero/negative-rate branches; deterministic scenario only
fundedRatio       = capital / PV(remaining real net-spend cash flows)
w0                = S / capitalAtRetirement
WR                = S / currentCapital
guardrailState    = versioned SpendingPolicy, not a universal constant
bufferYears       = accessibleBufferAssets / nearTermNetSpend

legacyGapAfterInsurance = max(0, legacyTarget − eligibleNetDeathBenefitAtHorizon)
requiredEarmark          = min(earmarkedAssets, legacyGapAfterInsurance)
newlyUnearmarked         = max(0, priorRequiredEarmark − requiredEarmark)
valueToHeirs(t)          = modeledAssets(t) + eligibleNetDeathBenefit(t)
                           − modeledDebts(t) − explicitCosts(t)
estateReadiness          = Σ applicableWeightᵢ·completeᵢ

// ---- ScorePolicy v1 DEFAULT (versioned; replaceable, never hard-coded) ----
FreedomHealth v1 = 0.30·PaceOrFunding + 0.25·Progress + 0.15·CashFlowMargin
                   + 0.15·Foundation + 0.15·FollowThrough
                   // each sub-score 0–100, applicability-aware (missing ≠ 0)
displayBandCap   = max(0.6, 1 − 0.08 · openSeverity1Tripwires)   // display-layer
                   // cap only; the stored base score is never mutated

// ---- education-layer identities (display/teaching, not decision rules) ----
ruleOf72 years   ≈ 72 / (100·r)
doublingsNeeded  = log2(freedomNumber / currentCapital)

// ---- V2 Advanced Strategy Lab screen (release-gated per §5.7/§16) ---------
// Quick like-for-like refinance screen ONLY (same balance, similar structure);
// the full cash-flow-matched comparator governs any decision surface.
afterTaxApr      = userConfirmedDeductible && itemizing
                   ? apr·(1 − marginalRate) : apr
spread           = afterTaxApr − alternativeRate
screenState      : spread > +0.01 → CANDIDATE — run full comparator
                   spread < −0.01 → UNLIKELY  — run full comparator to confirm
                   else           → CLOSE CALL (dead band ±100 bp)
robustness       = state identical under itemizing = true and false
                   // "flips on deductibility" flag when not robust
```

## Appendix B — Sources (research snapshot and control references; re-verify before use)

**v2.0 primary control/compliance references (status must be rechecked at each release):**

- [SEC — automated/electronic investment advice guidance and investor bulletin](https://www.sec.gov/newsroom/press-releases/2017-52)
- [SEC — Investment Adviser Marketing compliance guide](https://www.sec.gov/resources-small-businesses/small-business-compliance-guides/investment-adviser-marketing)
- [SEC — 2025/2026 observations on Marketing Rule testimonials, endorsements, and ratings](https://www.sec.gov/compliance/risk-alerts/additional-observations-regarding-advisers-compliance-advisers-act-marketing-rule)
- [FTC — Disclosures 101 for social media influencers](https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers)
- [FTC — Consumer Reviews and Testimonials Rule Q&A](https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers)
- [NAIC — Life Insurance Illustrations and Model Regulation #582](https://content.naic.org/insurance-topics/life-insurance-illustrations)
- [CFPB — Personal financial data rights / current §1033 status](https://www.consumerfinance.gov/compliance/compliance-resources/other-applicable-requirements/personal-financial-data-rights/)
- [FTC — Safeguards Rule](https://www.ftc.gov/legal-library/browse/rules/safeguards-rule)
- [NIST — Cybersecurity Framework 2.0](https://www.nist.gov/publications/nist-cybersecurity-framework-csf-20)
- [OWASP — Application Security Verification Standard 5.0](https://owasp.org/www-project-application-security-verification-standard/)
- [W3C — Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/)
- [U.S. Department of Justice — Guidance on Web Accessibility and the ADA](https://www.ada.gov/resources/web-guidance/)

These are requirements inputs, not legal advice. Counsel must identify applicable federal/state law and the status/version in force for each entity, jurisdiction, feature, and release date.

- Bankrate 2026 Annual Emergency Savings Report (survey Dec 2–8, 2025) — bankrate.com/banking/savings/emergency-savings-report
- LendingClub/PYMNTS paycheck-to-paycheck series; Federal Reserve SHED 2025; Bank of America Institute — via lambdafin.com measurement roundup (June 2026)
- BEA Personal Income & Outlays, April 2026 (personal saving rate 2.6%)
- Federal Reserve Survey of Consumer Finances (median retirement savings) — via synchrony.com summary
- Competitive pricing/positioning: retirementplanningtools.net (Boldin/ProjectionLab/Pralana/MaxiFi, 2026), marriagekidsandmoney.com, robberger.com
- Caring.com Wills & Estate Planning Study 2025 (24% of Americans have a will; parents of minors the largest gap cohort)
- Social Security claiming factors: SSA statutory reduction/delayed-credit rates (5/9%·36mo + 5/12%; 2/3%/mo credits), per SSA.gov / CRS R47151 / AARP; RMD ages per SECURE 2.0 (73 now, 75 from 2033)

## Appendix C — Reference-system → SaaS module map (for provenance)

| Reference tab/engine | SaaS destination |
|---|---|
| Phase Diagnostic (gPhase) | M1 |
| Goals & Objectives, Intentionality | M2 |
| Trajectory + accumulation actuals (gG/gW) | M3 |
| Money Flow part 1 (gFlow) | M4 |
| Debt Burndown (v3) + amortized-debt engine | M5 |
| Savings & Allocation (gSavAlloc) | M6 |
| Automation (gAuto) | M7 |
| Income streams (gW streams) | M8 |
| Doubling Engine mental models + matrix (wM) | M9 |
| Portfolio (gPort) | M10 |
| Perpetual Income Model B (gW) | M11 |
| Big Ticket Goals (gq) | M12 |
| Freedom Accelerator + Scenarios (gAccel/gScen) | M13 |
| Action & Resilience (gRES/gAct) | M14 |
| Freedom Score (wx) | M15 |
| 16-rule engine (gOR) | M16 |
| Operating Rhythm + QoQ (g0/wC) | M17 |
| Header tripwires + resilience flags | M18 |
| Accountability (wS) | M19 |
| Ten-gate engine + Family Banking + LFIR (gFlow/gQ) | V2 Strategy Library + GateEngine primitive |
| The Sixteen Principles one-pager | §5.5 education layer + M25 heir-readiness curriculum |
| Perpetual Income distribution engine + coverage gauge + `ssa` field | M20 · M22 |
| Gate 9 "written down-market draw order" + volatility-drag pair | M21 |
| Gate 10 “death benefit pre-funds the legacy” + value-to-heirs curve | M24 (revised legacy-gap and earmark-impact model) |
| Family-bank governance grid (one tracker · annual meeting · amortization negotiable, rate is not · invitation never expires) | M25 Family Charter |
| Foundation rule F8 (estate transfer protected) + insurance grid | M23 |

## Appendix D — Adjudication log (how v2.1 was merged)

An independent AI review produced v2.0 from v1.1. v2.1 is the merge. For transparency —
and so future editors know what was deliberate — the material dispositions:

**Adopted from v2.0 (the review was right):**
- **The cash-flow-matched comparator replacing the "effective cost / ~2×" shortcut (§5.7).**
  Independently re-verified in v2.1: with matched cash flows, the break-even return for
  finance-vs-prepay equals the contractual APR — not ~2× the growth rate. At the old
  rule's claimed boundary (10.32% loan vs 4% growth, 30y), financing loses ≈ 89%. The
  v1.1 arithmetic was internally consistent but modeled the wrong comparison; the old
  tables survive only as deprecated regression fixtures.
- Real-dollar unit convention and the net-real-return identity; freedom number as an
  early shorthand entered as a range with data confidence.
- Two scores, never blended (Freedom Health 0–100 primary; prototype Systems Index 0–300
  as a separate V2 coach diagnostic; `LegacySystemsIndex` migration).
- The revised legacy model (eligible net death benefit at horizon, earmark-delta release)
  replacing v1.1's simpler permission-to-spend formula, which could overstate released
  capital when assets were never earmarked.
- The community system (§10.5–10.10), consumer-safe stakes (§10.9), household/platform
  roles, claims registry (§1.1.1), threshold policy, release governance (§16.1), product
  operations (§18), Founder Pilot-first delivery, P9–P14, consumer IA (§4.1), and the
  applicability-aware rules engine.
- Deductibility never inferred from a debt name (user-confirmed tax scenario instead).

**Adapted in v2.1:**
- Concrete defaults restored where v2.0 left only policy abstractions: ScorePolicy v1
  weights, guardrail corridor constants (as the candidate policy it already named), and
  the §15.1 golden seed table — a golden suite without numbers is a category, not a test.
- The V2 strategy-lab after-tax refinance screen restored to Appendix A as a screen
  (CANDIDATE / UNLIKELY / CLOSE CALL) that always defers to the full comparator.
- M21 alert wording corrected to match v2.0's own no-prescription rule (the app presents
  the modeled cut for acknowledgment; it never "prescribes").

**Declined / returned to the founder:**
- v2.0 §0.2 "resolved" the public product name. Naming is the founder's call; it now
  lives in the §20 decision register with both candidates. (v2.0 §19 still said "working
  title," contradicting its own §0.2 — resolved in favor of founder authority.)

**Retained from v1.1 through v2.0 unchanged (verified present):** the five-pillar
architecture, M1–M25, the mode system and funded-ratio handoff, the Loop, the statutory
benefits factors, the estate scoring, the mission metrics, and the brand system.

---

*— End of specification. Build the Loop first; it is the product.*

