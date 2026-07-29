/**
 * The strategy-gate pattern (§5.6) — reusable GateEngine primitive.
 *
 * N gates, each CLEAR / WATCH / BLOCKED / NOT_YET, a rollup, and a named
 * binding constraint with a concrete fix path. Binding constraint = first
 * FAIL (BLOCKED), else first WATCH, in priority order (§5.1).
 */

import type { Gate, GatePanelResult, GateRollup } from "./types.js";

export function evaluateGatePanel(gates: Gate[]): GatePanelResult {
  const considered = gates.filter((g) => g.state !== "N_A" && g.state !== "INFO");
  const blocked = considered.filter((g) => g.state === "BLOCKED");
  const watch = considered.filter((g) => g.state === "WATCH");
  const notYet = considered.filter((g) => g.state === "NOT_YET");

  let rollup: GateRollup;
  if (blocked.length > 0) rollup = "BLOCKED";
  else if (notYet.length > 0 && notYet.length >= considered.length / 2) rollup = "INSUFFICIENT_DATA";
  else if (watch.length > 0 || notYet.length > 0) rollup = "WATCH";
  else rollup = "CLEAR";

  const bindingConstraint = blocked[0] ?? watch[0] ?? notYet[0] ?? null;
  return { gates, rollup, bindingConstraint };
}
