# Reading the Reference Implementation
### A guide for the developer — read this before opening either file

This handoff contains three things:

| File | What it is |
|---|---|
| `Freedom_Command_SaaS_Specification.md` | **The contract.** v2.1 (merged) — five pillars, 25 modules, community system, formulas, data model, governance, Founder Pilot → MVP → V1 → V2 roadmap. This is what you are building. Appendix D records how the independent second-opinion review (v2.0) was merged. |
| `Freedom_Command_Reference_DEMO.html` | **The working prototype.** A 22-tab single-file React app. Open it in any browser — no server, no install. This is what the product should *feel* like. |
| This README | The rules for using one to build the other. |

---

## The three rules

**1 — The specification is normative; the prototype is behavioral reference.**
Where they disagree, the spec wins, always. The prototype shows how a verdict chip behaves, how a gate panel reads, what tone the copy takes, how a chart is composed. The spec defines what gets built, in what order, with which formulas. Formulas live in spec Appendix A and are enforced by the golden seed values in spec §15.1 — never reverse-engineer a formula from the prototype's minified source when the spec states it directly. In particular, spec §5.7 lists prototype calculations that are **deprecated and must never ship** (the "effective cost" and "~2×" comparisons among them); they exist in the test suite only as regression fixtures proving they stay dead.

**2 — Never extend, copy, or transplant the prototype's code.**
It is a minified single-file bundle that was maintained by string-splicing — a prototyping technique, deliberately abandoned. The build target is spec §14: a monorepo with a pure `@freedom/engine` package, typed schemas, and componentized UI. Treat the prototype as a living wireframe. If you find yourself reading its minified JS to copy logic, stop and go back to the spec.

**3 — Phase discipline.**
The prototype contains *more* than MVP. The family-banking cards, the ten-gate engine, and the policy/LFIR content map to the **V2 Advanced Strategy Library** (spec §6-V2, Appendix C). Do not attempt a 22-tab one-for-one clone — the budget will die where the moat isn't. Build the Loop (spec §16 MVP scope). Consult the prototype for the modules in the phase you are building, and only those.

---

## What to harvest from the prototype

- **Verdict honesty in practice.** PROCEED / HOLD / STOP chips with dead bands; "flips on deductibility" flags; a rollup that overrides to BUILD SPEC when prerequisites don't exist; the named binding constraint with a concrete fix. This behavior is the product's moat — match its spirit exactly.
- **The honesty layers.** Every strategy card ends with a "Where this breaks — read before acting" list, and gates the user hasn't answered render WATCH / NOT YET, never BLOCKED. These are launch requirements (spec P2, P6, §12), not decoration.
- **Copy voice.** Confident, specific, transparent — "A philosophy asks to be believed. A gate shows its work and can be failed." Study it; reproduce the register, not the sentences.
- **Layout grammar.** Card sections with uppercase tracked labels, stat tiles, gold-accent CTAs, navy verdict panels, deep-links between modules ("make this real →").
- **Cross-module liveness.** Edit a debt in Debt Burndown, then open Money Flow — the gate table already reflects it. That is spec §7's single-EngineResult rule, visible.

## What to ignore

- The storage model (browser localStorage under `ffcc:*` keys) — the SaaS is server-persisted (spec §7).
- The single-file architecture, the minified class names, the Tailwind-purge workarounds, the chart library internals.
- Any figure on screen as a source of truth — see the demo-data note below.

---

## About the data you'll see

**Every number and name in the prototype is fictional demo data** — the "Carter household": a consulting income, an auto loan, a rewards card, two college goals, a sample whole-life schedule from a fictional carrier. It exists so every verdict state has something to render. Do not treat any on-screen figure as a canonical test value; the canonical values are the golden-number cases in spec §15.1. (The demo is still internally consistent — the gate-8 table's basis-point spreads, for example, are real arithmetic on the demo balances, so it remains useful for eyeballing behavior.)

To reset the prototype to its seed state, clear the browser's localStorage for the file (DevTools → Application → Local Storage → delete `ffcc:*` keys) and reload.

---

## Where to start

1. Read spec §0–§5 (the laws and the domain concepts) end to end.
2. Open the prototype and spend 30 minutes as a user: run the Phase Diagnostic, edit a debt, watch the tabs react, open Money Flow's gate cards and toggle "I itemize."
3. Build in spec §16's MVP order, starting with `@freedom/engine` **test-first** against the §15.1 golden numbers.
4. When a design question arises that neither document answers, the tie-breaker is spec §2: does the candidate answer preserve verdict honesty, the single source of truth, and the named binding constraint? If not, it's wrong.

*Freedom Command by Ekantik — build the Loop first; it is the product.*
