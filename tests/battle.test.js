// Battle tests (SIM-02) and the published formulas (SIM-07, community wiki), on the real game data. The
// expected figures are worked out by hand in the comments, from the units' sheets:
//   Khorne Gor (V, melee): 48 attack × 1 500 damage / 200 = 360 per troop; 45 armour × 1 100 health / 40 = 1 237.5
//   Marauders (I, melee):  30 × 300 / 200 = 45 per troop;                  19 × 1 000 / 40 = 475
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  armyDamage,
  armyProfile,
  compareArmies,
  armyHealth,
  attackMode,
  preferredMode,
  damagePerTroop,
  healthPerTroop,
  indexCatalogue,
  simulateBattle,
  summariseArmy,
  tierFactor,
  verdict,
} from "../src/engine/index.js";

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
const GAME = "chaos-conquest";
const catalogue = indexCatalogue(read(`data/${GAME}/units.json`), read(`data/${GAME}/defences.json`));
const RULES = read(`data/${GAME}/combat-rules.json`);
const NO_MORALE = { ...RULES.morale, lossThresholdPercent: 100 };
const oneTurn = { ...RULES, turns: 1, morale: NO_MORALE };
const withModel = (rules, model) => ({ ...rules, model: { ...rules.model, ...model } });
const army = (troops, effects = []) => summariseArmy(troops, catalogue, effects, { marchCapacity: 1e9 });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} ≠ ${expected}`);
const lost = (state, id) => state.find((group) => group.id === id).lost;
const left = (state, id) => state.find((group) => group.id === id).count;

test("SIM-02 one turn: the attacker strikes first, the defender answers with its survivors", () => {
  const result = simulateBattle(army({ "khorne-gor": 100 }), army({ marauders: 1000 }), oneTurn);
  const marauderLosses = (100 * 360) / 475; // 75.79
  const gorLosses = ((1000 - marauderLosses) * 45) / 1237.5; // 33.61
  near(lost(result.turns[0].defender, "marauders"), marauderLosses);
  near(lost(result.turns[0].attacker, "khorne-gor"), gorLosses);
  // power lost: 33.61 Gor × 150 = 5 041 against 75.79 Marauders × 4 = 303: the defender inflicted more
  near(result.powerLost.attacker, gorLosses * 150);
  near(result.powerLost.defender, marauderLosses * 4);
  assert.equal(result.winner, "defender");
});

test("SIM-02 a battle lasts the turns of the rules (3 in this game)", () => {
  const result = simulateBattle(army({ "khorne-gor": 10 }), army({ marauders: 10 }), RULES);
  assert.equal(RULES.turns, 3);
  assert.deepEqual(
    result.turns.map((turn) => turn.turn),
    [1, 2, 3],
  );
});

test("SIM-02 damage hits the lowest tier first, then melee before ranged within a tier", () => {
  // 10 Khorne Gor deal 3 600: 5 Bloodletters (II, melee, 25 × 900 / 40 = 562.5) take 2 812.5, the rest
  // (787.5) goes to the Blue Horrors (II, ranged, 19 × 1 350 / 40 = 641.25); the Flesh Hounds (IV) are untouched
  const defender = army({ "flesh-hounds": 100, "blue-horrors": 100, bloodletters: 5 });
  const [turn] = simulateBattle(army({ "khorne-gor": 10 }), defender, oneTurn).turns;
  near(lost(turn.defender, "bloodletters"), 5);
  near(lost(turn.defender, "blue-horrors"), 787.5 / 641.25);
  near(lost(turn.defender, "flesh-hounds"), 0);
});

test("SIM-02 a ranged group shoots only while its tier has melee troops or defences on its side", () => {
  const tzaangor = army({ tzaangor: 1 }).lines[0];
  const group = (line, count) => ({ unit: line.unit, stats: line.stats, count });
  const khorngor = army({ khorngor: 1 }).lines[0];
  const mode = (striker, side) => attackMode(striker, side, RULES.model);
  assert.equal(mode(group(tzaangor, 1), [group(tzaangor, 1)]), "melee");
  assert.equal(mode(group(tzaangor, 1), [group(tzaangor, 1), group(khorngor, 5)]), "ranged");
  assert.equal(mode(group(tzaangor, 1), [group(tzaangor, 1), group(khorngor, 0)]), "melee");
  assert.equal(mode(group(khorngor, 1), [group(khorngor, 1)]), "melee");
  // Tzaangor: 15 × 200 / 200 = 15 in melee, 60 × 1 200 / 200 = 360 at range
  near(damagePerTroop(tzaangor.stats, "melee", RULES.model), 15);
  near(damagePerTroop(tzaangor.stats, "ranged", RULES.model), 360);
});

test("SIM-02 a troop prefers the attack that deals more, bonuses included (wiki)", () => {
  // Gor of Tzeentch: melee 53 × 800 / 200 = 212, ranged 23 × 800 / 200 = 92 → melee;
  // with +150 % ranged damage, 92 × 2.5 = 230 > 212 → ranged
  assert.equal(preferredMode(army({ "tzeentch-gor": 1 }).lines[0].stats, RULES.model), "melee");
  const boosted = army({ "tzeentch-gor": 1 }, [{ stat: "rangedDamage", percent: 150 }]).lines[0];
  assert.equal(preferredMode(boosted.stats, RULES.model), "ranged");
});

test("SIM-02 within a tier and a category, the higher morale is hit first (wiki)", () => {
  // Khorne Chaos Warriors (III, morale 53, prefers ranged: 35 × 1 000 > 32 × 800) and Nurgle Chaos Warriors
  // (III, morale 62, melee): melee first; then Chaos Warriors (III, melee, morale 56) and Nurgle (62) by morale
  const defender = army({ "chaos-warriors": 100, "nurgle-chaos-warriors": 100, "khorne-chaos-warriors": 100 });
  const [turn] = simulateBattle(army({ "khorne-gor": 1 }), defender, oneTurn).turns;
  // 1 Gor deals 360: all on the Nurgle warriors (62 morale), 55 × 1 500 / 40 = 2 062.5 each
  near(lost(turn.defender, "nurgle-chaos-warriors"), 360 / 2062.5);
  near(lost(turn.defender, "chaos-warriors"), 0);
  near(lost(turn.defender, "khorne-chaos-warriors"), 0);
});

test("SIM-02 the tier modifier: a bonus per tier below the striker, a penalty per tier above", () => {
  const model = { ...RULES.model, tierModifierPercent: 10 };
  near(tierFactor(5, 1, model), 1.4);
  near(tierFactor(1, 5, model), 0.6);
  near(tierFactor(3, 3, model), 1);
  const [turn] = simulateBattle(
    army({ "khorne-gor": 100 }),
    army({ marauders: 1000 }),
    withModel(oneTurn, model),
  ).turns;
  near(lost(turn.defender, "marauders"), (36000 * 1.4) / 475);
});

test("SIM-02 morale: heavy losses break troops, who sit out the next turn", () => {
  const rules = { ...RULES, turns: 2 };
  const { turns } = simulateBattle(army({ "khorne-gor": 100 }), army({ marauders: 200 }), rules);
  // turn 1: 75.79 of 200 Marauders fall (37.9 % > 25 %): (100 − 56 morale) % of the 124.21 left break
  const survivors = 200 - 36000 / 475;
  near(turns[0].defender[0].broken, survivors * 0.44);
  // turn 2: the Gor kill the 69.56 unbroken Marauders; the broken ones cannot strike back, and melee cannot
  // reach them (wiki: broken troops are only hit by ranged attacks), so they all survive the turn
  near(lost(turns[1].attacker, "khorne-gor"), 0);
  near(left(turns[1].defender, "marauders"), survivors * 0.44);
});

test("SIM-02 bonuses change the battle: +100 % melee damage doubles the Gor's kills", () => {
  const boosted = army({ "khorne-gor": 100 }, [{ stat: "meleeDamage", percent: 100 }]);
  const [turn] = simulateBattle(boosted, army({ marauders: 1000 }), oneTurn).turns;
  near(lost(turn.defender, "marauders"), (2 * 36000) / 475);
});

test("SIM-07 per-troop figures follow the published formulas", () => {
  const stats = (id) => catalogue.units.get(id).stats;
  // attack × damage / 200 and armour × health / 40, worked out by hand
  near(damagePerTroop(stats("chaos-chosen"), "melee", RULES.model), 270);
  near(damagePerTroop(stats("bestigor-herd"), "melee", RULES.model), 246);
  near(damagePerTroop(stats("bestigor-herd"), "ranged", RULES.model), 106.25);
  near(damagePerTroop(stats("chaos-dragons"), "melee", RULES.model), 812.5);
  near(damagePerTroop(stats("chaos-dragons"), "ranged", RULES.model), 805);
  near(healthPerTroop(stats("chaos-dragons"), RULES.model), 4500);
  near(healthPerTroop(stats("beasts-of-nurgle"), RULES.model), 3350);
  near(healthPerTroop(stats("chaos-bile-trolls"), RULES.model), 2484.375);
});

test("SIM-07 army measures: bonuses on attack and damage, the stronger attack per line", () => {
  // (attack + attack × bonus) × (damage + damage × bonus) / 200, × troops
  const chosen = army({ "chaos-chosen": 1000 }, [
    { stat: "meleeAttack", percent: 20 },
    { stat: "meleeDamage", percent: 10 },
  ]);
  near(armyDamage(chosen, RULES.model), (1000 * (45 * 1.2 * (1200 * 1.1))) / 200);
  // Bestigor: melee 246 beats ranged 106.25 per troop; health 47 × 2 650 / 40 = 3 113.75
  const bestigor = army({ "bestigor-herd": 10 });
  near(armyDamage(bestigor, RULES.model), 2460);
  near(armyHealth(bestigor, RULES.model), 31137.5);
});

test("SIM-08 the army profile: damage, tanking, morale, speed, load and upkeep in one place", () => {
  // 10 Bestigor (V, melee): melee 41 × 1 200 / 200 = 246, ranged 25 × 850 / 200 = 106.25, health 3 113.75,
  // morale 68, speed 8, load 220, food 30 per 100 per hour; 30 Marauders (I, melee): 45, 22 × 300 / 200 = 33,
  // health 475, morale 56, speed 6, load 20, food 6
  const mixed = army({ "bestigor-herd": 10, marauders: 30 });
  const profile = armyProfile(mixed, RULES.model);
  assert.equal(profile.troops, 40);
  assert.equal(profile.power, 10 * 150 + 30 * 4);
  near(profile.damage.melee, 10 * 246 + 30 * 45);
  near(profile.damage.ranged, 10 * 106.25 + 30 * 33);
  near(profile.damage.best, 10 * 246 + 30 * 45);
  near(profile.health, 10 * 3113.75 + 30 * 475);
  near(profile.morale, (10 * 68 + 30 * 56) / 40);
  assert.equal(profile.slowestSpeed, 6);
  near(profile.load, 10 * 220 + 30 * 20);
  near(profile.foodPerHour, (10 * 30 + 30 * 6) / 100);
  assert.deepEqual(profile.byTier, { 5: 10, 1: 30 });
  assert.deepEqual(profile.byAttackType, { melee: 40 });
  near(profile.lines[0].health, 31137.5);
  // its tanking, split: raw health 10 × 2 650 + 30 × 1 000; average armour (10 × 47 + 30 × 19) / 40
  near(profile.rawHealth, 10 * 2650 + 30 * 1000);
  near(profile.averageArmour, (10 * 47 + 30 * 19) / 40);
  // each line shows the two stats its damage comes from: Bestigor strike in melee, 41 attack, 1 200 damage
  assert.deepEqual(
    [profile.lines[0].mode, profile.lines[0].attack, profile.lines[0].damagePerHit, profile.lines[0].armour],
    ["melee", 41, 1200, 47],
  );
  // an empty army has a profile of zeros
  const empty = armyProfile(army({}), RULES.model);
  assert.deepEqual([empty.troops, empty.power, empty.health, empty.morale, empty.slowestSpeed], [0, 0, 0, 0, 0]);
});

test("SIM-03 two armies compared: each figure, its difference, the better side, and both battles", () => {
  // A: 10 Bestigor (power 1 500, damage 2 460); B: 100 Marauders (power 400, damage 4 500, food 6 / 100 / h)
  const a = army({ "bestigor-herd": 10 });
  const b = army({ marauders: 100 });
  const { figures, battles } = compareArmies(a, b, RULES);
  const figure = (key) => figures.find((entry) => entry.key === key);
  assert.deepEqual([figure("power").a, figure("power").b, figure("power").difference], [1500, 400, -1100]);
  assert.equal(figure("power").better, "a");
  assert.equal(figure("damage").better, "b");
  // food: 10 × 30 / 100 = 3 for A, 100 × 6 / 100 = 6 for B: less is better
  assert.equal(figure("food").better, "a");
  assert.equal(battles.aAttacks.turns.length, 3);
  assert.ok(["attacker", "defender", "draw"].includes(battles.bAttacks.winner));
  // an empty side: figures, but no battle
  const oneEmpty = compareArmies(a, army({}), RULES);
  assert.equal(oneEmpty.battles, null);
  assert.ok(
    oneEmpty.figures.every((entry) => entry.better === "none"),
    "nothing is better than an empty army",
  );
});

test("SIM-03 DEF-020 figures equal but for rounding are the same; a real gap picks a side", () => {
  assert.equal(verdict(0.1 + 0.2, 0.3, "higher"), "same");
  assert.equal(verdict(1, 2, "higher"), "b");
  assert.equal(verdict(1, 2, "lower"), "a");
});
