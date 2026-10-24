// The figures behind the dashboards (DASH-01 to DASH-05): what each troop gives per march slot,
// a battle round by round, how an army is spread and where it is weak, and the pros and cons of a comparison.

import { damagePerTroop, healthPerTroop, preferredMode } from "./combat.js";
import { effectiveStats } from "./stats.js";

const PERCENT = 100;

/**
 * Every troop of the game with the player's bonuses: what one troop gives — damage per strike (with its stronger
 * attack), effective health, speed and load (what it carries home). Per troop is per march slot: the march capacity counts troops, whatever their
 * tier, so one Marauder takes the same room as one Dragon (D-21).
 */
export function efficiency(units, effects, model) {
  return units.map((unit) => {
    const stats = effectiveStats(unit, effects);
    return {
      unit,
      damage: damagePerTroop(stats, preferredMode(stats, model), model),
      health: healthPerTroop(stats, model),
      speed: stats.speed,
      load: stats.load ?? 0,
    };
  });
}

/** A battle (simulateBattle) round by round: per side, troops and power lost, troops broken, losses per tier. */
export function rounds(battle) {
  const side = (groups) =>
    groups.reduce(
      (total, group) => {
        total.lost += group.lost;
        total.powerLost += group.lost * group.powerPerTroop;
        total.broken += group.broken;
        total.byTier[group.tier] = (total.byTier[group.tier] ?? 0) + group.lost;
        return total;
      },
      { lost: 0, powerLost: 0, broken: 0, byTier: {} },
    );
  return battle.turns.map((turn) => ({
    turn: turn.turn,
    attacker: side(turn.attacker),
    defender: side(turn.defender),
  }));
}

/** Shares of a total, per value of a field of the army's lines (tier, alignment, unit type, attack used). */
function shares(lines, field, value) {
  const total = lines.reduce((sum, line) => sum + value(line), 0);
  const byValue = {};
  for (const line of lines) byValue[field(line)] = (byValue[field(line)] ?? 0) + value(line);
  return Object.entries(byValue).map(([key, amount]) => ({
    key,
    amount,
    share: total ? (amount / total) * PERCENT : 0,
  }));
}

// the thresholds of the balance warnings, in %
const THIN_FRONT = 10;
const ONE_GOD = 60;
const LOW_MORALE = 50;

/**
 * How a profile's power is spread (by tier, god, troop type, attack used) and the warnings: a thin front line
 * (the lowest tier holds little of the effective health), ranged troops with no melee in front at their tier,
 * one god carrying most of the power, low morale.
 */
export function balance(profile) {
  const lines = profile.lines.filter((line) => line.count > 0);
  const power = (line) => line.power;
  const spread = {
    tiers: shares(lines, (line) => line.unit.tier, power),
    alignments: shares(lines, (line) => line.unit.alignment, power),
    unitTypes: shares(lines, (line) => line.unit.unitType, power),
    modes: shares(lines, (line) => line.mode, power),
  };
  const warnings = [];
  if (lines.length) {
    const front = Math.min(...lines.map((line) => line.unit.tier));
    const frontHealth = shares(
      lines,
      (line) => line.unit.tier,
      (line) => line.health,
    ).find((s) => Number(s.key) === front);
    if (frontHealth.share < THIN_FRONT) warnings.push({ code: "thin-front", tier: front, share: frontHealth.share });
    for (const tier of new Set(lines.map((line) => line.unit.tier))) {
      const atTier = lines.filter((line) => line.unit.tier === tier);
      if (atTier.every((line) => line.mode === "ranged")) warnings.push({ code: "unscreened-ranged", tier });
    }
    const top = spread.alignments.reduce((best, entry) => (entry.share > best.share ? entry : best));
    if (top.share >= ONE_GOD && spread.alignments.length > 1) {
      warnings.push({ code: "one-god", alignment: top.key, share: top.share });
    }
    if (profile.morale < LOW_MORALE) warnings.push({ code: "low-morale", morale: profile.morale });
  }
  return { spread, warnings };
}

/** Pros and cons of each side of a comparison (compareArmies): the figures where it is ahead or behind by `threshold` % or more. */
export function prosAndCons(comparison, threshold = 10) {
  const sides = { a: { pros: [], cons: [] }, b: { pros: [], cons: [] } };
  for (const figure of comparison.figures) {
    if (figure.better === "none" || figure.better === "same") continue;
    const [winner, loser] = figure.better === "a" ? ["a", "b"] : ["b", "a"];
    const base = Math.abs(figure[loser]);
    const gap = base > 0 ? (Math.abs(figure.a - figure.b) / base) * PERCENT : Infinity;
    if (gap < threshold) continue;
    sides[winner].pros.push({ key: figure.key, gap });
    sides[loser].cons.push({ key: figure.key, gap });
  }
  return sides;
}
