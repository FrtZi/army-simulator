// The battle (official rules, data/<game>/combat-rules.json): a number of turns; in each, the side that
// started the fight strikes first, then the other; every group alive and not broken strikes. Morale is tested
// at the end of each turn. The winner is the side that inflicted the bigger power loss. The outcome is the
// expected one (fractional troops), rounded only for display.

import { attackMode, damagePerTroop } from "./combat.js";
import { strike, targetOrder } from "./allocate.js";
import { rally, testMorale } from "./morale.js";

/** A side's fighting groups, from an army summary's lines (effective stats included). */
const deploy = (army) =>
  army.lines.map((line) => ({ unit: line.unit, stats: line.stats, count: line.count, broken: 0, lostThisTurn: 0 }));

/** One side strikes the other: each group alive and not broken, with its current attack mode. */
function strikePhase(strikers, targets, rules) {
  // the order damage reaches the targets holds for the whole phase: tiers, categories and morale do not change
  const slots = targetOrder(targets, rules.damageOrderWithinTier, rules.model);
  for (const group of strikers) {
    const fighting = group.count - group.broken;
    if (fighting <= 0) continue;
    const mode = attackMode(group, strikers, rules.model);
    strike(group, mode, fighting * damagePerTroop(group.stats, mode, rules.model), slots, rules.model);
  }
}

const snapshot = (side) =>
  side.map((group) => ({ id: group.unit.id, count: group.count, broken: group.broken, lost: group.lostThisTurn }));
const powerOf = (side) => side.reduce((total, group) => total + group.count * group.unit.stats.squadPower, 0);

/** The power each side lost, and the winner: the side that inflicted the bigger loss ("draw" when equal). */
function outcome(start, sides) {
  const lost = {
    attacker: start.attacker - powerOf(sides.attacker),
    defender: start.defender - powerOf(sides.defender),
  };
  if (lost.defender === lost.attacker) return { powerLost: lost, winner: "draw" };
  return { powerLost: lost, winner: lost.defender > lost.attacker ? "attacker" : "defender" };
}

/**
 * Simulates a battle between two army summaries (from summariseArmy). Returns each turn's state after morale
 * (per group: troops left, broken, lost that turn), the survivors, the power each side lost and the winner.
 */
export function simulateBattle(attacker, defender, rules) {
  const sides = { attacker: deploy(attacker), defender: deploy(defender) };
  const start = { attacker: powerOf(sides.attacker), defender: powerOf(sides.defender) };
  const second = rules.firstToStrike === "attacker" ? "defender" : "attacker";
  const order = [rules.firstToStrike, second];
  const turns = [];
  for (let turn = 1; turn <= rules.turns; turn += 1) {
    for (const [index, name] of order.entries()) strikePhase(sides[name], sides[order[1 - index]], rules);
    for (const side of Object.values(sides)) {
      rally(side);
      testMorale(side, rules);
    }
    turns.push({ turn, attacker: snapshot(sides.attacker), defender: snapshot(sides.defender) });
    for (const side of Object.values(sides)) for (const group of side) group.lostThisTurn = 0;
  }
  return {
    turns,
    survivors: { attacker: snapshot(sides.attacker), defender: snapshot(sides.defender) },
    ...outcome(start, sides),
  };
}
