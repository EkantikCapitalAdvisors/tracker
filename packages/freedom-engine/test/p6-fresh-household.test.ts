/**
 * The P6 test (§15.4, §15.1 last row): a brand-new household with minimal
 * inputs renders ZERO BLOCKED/red states anywhere. Unanswered ≠ failing.
 */

import { describe, expect, it } from "vitest";
import { computeEngineResult } from "../src/index.js";

describe("P6: fresh household", () => {
  it("an empty input produces no BLOCKED state, no tripwire, no flag, no alarm", () => {
    const result = computeEngineResult({});

    // No severity-1 tripwires, no flags at all.
    expect(result.resilience.tripwires).toHaveLength(0);
    expect(result.flags).toHaveLength(0);
    expect(result.bindingConstraint).toBeNull();

    // No rule is BLOCKED; unanswered rules are NOT_YET / N_A / INFO.
    for (const rule of result.rules.rules) {
      expect(rule.state, `rule ${rule.id}`).not.toBe("BLOCKED");
    }

    // No phase gate is BLOCKED.
    for (const gate of result.phase.gates) {
      expect(gate.state, `gate ${gate.id}`).not.toBe("BLOCKED");
    }

    // Bands and verdicts refuse certainty rather than alarming.
    expect(result.trajectory.band).toBe("NOT_YET");
    expect(result.plan.feasibility).toBe("INSUFFICIENT_DATA");
    expect(result.distribution.guardrail).toBe("NOT_YET");
    expect(result.legacy.state).toBe("NOT_YET");
    expect(result.estate.readinessScore).toBeNull();

    // No score is invented from missing data.
    expect(result.score.base).toBeNull();
    expect(result.score.displayed).toBeNull();
    expect(result.score.confidence).toBe("LOW");
    expect(result.dataConfidence).toBe("LOW");
  });

  it("a household that has entered only income and essentials still sees no red", () => {
    const result = computeEngineResult({
      cashFlow: { netIncomeMonthly: 5_000, essentialsMonthly: 3_000 },
    });
    expect(result.resilience.tripwires).toHaveLength(0);
    expect(result.flags.filter((f) => f.severity === 1)).toHaveLength(0);
    for (const rule of result.rules.rules) {
      expect(rule.state, `rule ${rule.id}`).not.toBe("BLOCKED");
    }
  });

  it("a missed minimum the user has ENTERED is allowed to alarm (the P6 boundary)", () => {
    const result = computeEngineResult({
      debts: [
        {
          name: "Card",
          balance: 3_000,
          apr: 0.24,
          minPayment: 90,
          missedMinimumUnresolved: true,
        },
      ],
    });
    expect(result.resilience.tripwires.map((t) => t.code)).toContain("MISSED_MINIMUM");
  });
});
