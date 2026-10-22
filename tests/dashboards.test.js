// The figures behind the dashboards (DASH-01 to DASH-05), on the real game data, worked out by hand.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  armyProfile,
  balance,
  compareArmies,
  efficiency,
  indexCatalogue,
  prosAndCons,
  rounds,
  simulateBattle,
  summariseArmy,
} from "../src/engine/index.js";

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
const GAME = "chaos-conquest";
const units = read(`data/${GAME}/units.json`);
const catalogue = indexCatalogue(units, read(`data/${GAME}/defences.json`));
const RULES = read(`data/${GAME}/combat-rules.json`);
const army = (troops, effects = []) => summariseArmy(troops, catalogue, effects, { marchCapacity: 1e9 });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} ≠ ${expected}`);

test("DASH-01 DASH-06 efficiency per march slot: damage and effective health of one troop, bonuses included", () => {
  const rows = efficiency(units, [], RULES.model);
  const row = (id) => rows.find((entry) => entry.unit.id === id);
  // Marauders: 30 × 300 / 200 = 45 damage, 19 × 1 000 / 40 = 475 health; Chaos Dragons: 65 × 2 500 / 200 =
  // 812.5, 60 × 3 000 / 40 = 4 500. Both take one slot of the march capacity
  near(row("marauders").damage, 45);
  near(row("marauders").health, 475);
  near(row("chaos-dragons").damage, 812.5);
  near(row("chaos-dragons").health, 4500);
  // raiding (DASH-06): speed and load per troop, from the sheets: Marauders 6 and 20, Chaos Dragons 12 and 200
  assert.deepEqual([row("marauders").speed, row("marauders").load], [6, 20]);
  assert.deepEqual([row("chaos-dragons").speed, row("chaos-dragons").load], [12, 200]);
  near(efficiency(units, [{ stat: "load", percent: 50 }], RULES.model).find((e) => e.unit.id === "marauders").load, 30);
  const boosted = efficiency(units, [{ stat: "health", percent: 100 }], RULES.model);
  near(boosted.find((entry) => entry.unit.id === "marauders").health, 950);
  assert.equal(rows.length, units.length);
});

test("DASH-02 a battle round by round: troops and power lost, broken, losses per tier", () => {
  const battle = simulateBattle(army({ "khorne-gor": 100 }), army({ marauders: 200 }), { ...RULES, turns: 2 });
  const [first, second] = rounds(battle, catalogue);
  // round 1: 36 000 / 475 = 75.79 Marauders lost (power 4 each), then 44 % of the 124.21 left break
  near(first.defender.lost, 36000 / 475);
  near(first.defender.powerLost, (36000 / 475) * 4);
  near(first.defender.byTier[1], 36000 / 475);
  near(first.defender.broken, (200 - 36000 / 475) * 0.44);
  assert.equal(second.turn, 2);
  near(second.attacker.lost, 0);
});

test("DASH-03 balance: power by tier and god, and the warnings", () => {
  // 10 Bestigor (V, 1 500 power) and 30 Marauders (I, 120 power): tier I holds 30 × 475 = 14 250 of
  // 31 137.5 + 14 250 effective health (31 %): no thin front
  const mixed = balance(armyProfile(army({ "bestigor-herd": 10, marauders: 30 }), RULES.model));
  const tier5 = mixed.spread.tiers.find((entry) => entry.key === "5");
  near(tier5.share, (1500 / 1620) * 100);
  assert.deepEqual(mixed.warnings, []);
  // 1 Marauder in front of 10 Bestigor: thin front; Tzaangor alone at tier IV: ranged with nothing in front
  const exposed = balance(armyProfile(army({ "bestigor-herd": 10, marauders: 1, tzaangor: 5 }), RULES.model));
  const codes = exposed.warnings.map((warning) => warning.code);
  assert.ok(codes.includes("thin-front"));
  assert.ok(codes.includes("unscreened-ranged"));
  // one god carries most of the power: Khorne 600 + 1 500 of 2 140 (98 %), with 10 Marauders beside them
  const khorne = balance(armyProfile(army({ khorngor: 10, "khorne-gor": 10, marauders: 10 }), RULES.model));
  assert.ok(khorne.warnings.some((warning) => warning.code === "one-god" && warning.alignment === "khorne"));
});

test("DASH-05 pros and cons: the figures where a side is ahead or behind by 10 % or more", () => {
  // A: 10 Bestigor (power 1 500); B: 100 Marauders (power 400): A +275 % power
  const comparison = compareArmies(army({ "bestigor-herd": 10 }), army({ marauders: 100 }), RULES);
  const { a, b } = prosAndCons(comparison);
  const power = a.pros.find((entry) => entry.key === "power");
  near(power.gap, ((1500 - 400) / 400) * 100);
  assert.ok(b.cons.some((entry) => entry.key === "power"));
  assert.ok(
    b.pros.some((entry) => entry.key === "damage"),
    "100 Marauders deal 4 500, 10 Bestigor 2 460",
  );
  // equal armies: nothing to say
  const same = prosAndCons(compareArmies(army({ marauders: 10 }), army({ marauders: 10 }), RULES));
  assert.deepEqual(same, { a: { pros: [], cons: [] }, b: { pros: [], cons: [] } });
});
