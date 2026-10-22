// Engine tests, on the real game data and the fictitious example configuration. Each test names the feature
// it proves. Expected values are worked out by hand in the comments.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  appliesTo,
  effectiveStats,
  effectProblems,
  indexCatalogue,
  marchCapacity,
  resolveSources,
  summariseArmy,
} from "../src/engine/index.js";

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
const example = read("examples/configuration.example.json");
const game = read(`data/${example.game}/game.json`);
const units = read(`data/${example.game}/units.json`);
const defences = read(`data/${example.game}/defences.json`);

const catalogue = indexCatalogue(units, defences);
const unit = (id) => catalogue.units.get(id) ?? catalogue.defences.get(id);
const effects = resolveSources(example.sources);
const [current] = example.scenarios;
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);
const codes = (effect) => effectProblems(effect, game, catalogue).map((problem) => problem.code);

test("BONUS-01 a manual source gives its effects as entered", () => {
  assert.deepEqual(effects, example.sources[0].effects);
  assert.throws(() => resolveSources([{ kind: "hero", effects: [] }]), /Unknown bonus source kind "hero"/);
});

test("BONUS-01 a bonus is a percentage from 0 to 100 on a stat that can be boosted", () => {
  assert.deepEqual(codes({ stat: "morale", percent: 0, target: { unitTypes: ["monsters"] } }), []);
  assert.deepEqual(codes({ stat: "armour", percent: 100, target: { alignments: ["slaanesh"] } }), []);
  assert.deepEqual(codes({ stat: "armour", percent: 101 }), ["percent-out-of-range"]);
  assert.deepEqual(codes({ stat: "armour", percent: -5 }), ["percent-out-of-range"]);
  assert.deepEqual(codes({ stat: "armour" }), ["percent-missing"]);
  // squad size, food upkeep and squad power are fixed by the game
  for (const stat of ["squadSize", "foodUpkeep", "squadPower"]) {
    assert.deepEqual(codes({ stat, percent: 10 }), ["fixed-stat"]);
  }
  assert.deepEqual(codes({ stat: "luck", percent: 10 }), ["unknown-stat"]);
  assert.deepEqual(codes({ stat: "marchCapacity", percent: 10, target: { tiers: [1] } }), ["army-stat-target"]);
  assert.deepEqual(codes({ stat: "health", percent: 10, target: { alignments: ["sigmar"] } }), ["unknown-value"]);
  assert.deepEqual(codes({ stat: "health", percent: 10, target: { colours: ["red"] } }), ["unknown-filter"]);
});

test("BONUS-01 a target selects a troop only when every filter matches", () => {
  const khorneHighTiers = { stat: "armour", percent: 15, target: { alignments: ["khorne"], tiers: [4, 5] } };
  assert.ok(appliesTo(khorneHighTiers, unit("khorngor"))); // Khorne, tier IV
  assert.ok(!appliesTo(khorneHighTiers, unit("khorne-chaos-warriors"))); // Khorne, but tier III
  assert.ok(!appliesTo(khorneHighTiers, unit("pestigor"))); // tier IV, but Nurgle
  assert.ok(appliesTo({ stat: "health", percent: 10 }, unit("marauders"))); // no target: every troop
  assert.ok(appliesTo({ stat: "morale", percent: 5, target: { unitTypes: ["monsters"] } }, unit("chimera")));
  assert.ok(appliesTo({ stat: "armour", percent: 5, target: { unitTypes: ["defences"] } }, unit("razor-walls")));
});

test("BONUS-02 effective stats: the example's bonuses on two troops", () => {
  // Khorngor (melee, Khorne, IV): melee attack 58 × 1.25, health 1950 × 1.10, armour 55 × 1.15
  const khorngor = effectiveStats(unit("khorngor"), effects);
  near(khorngor.meleeAttack, 72.5);
  near(khorngor.health, 2145);
  near(khorngor.armour, 63.25);
  near(khorngor.morale, 72); // no bonus on morale
  near(khorngor.squadPower, 60); // fixed
  // Tzaangor (ranged, Tzeentch, IV): only the +10 % health applies
  const tzaangor = effectiveStats(unit("tzaangor"), effects);
  near(tzaangor.meleeAttack, 15);
  near(tzaangor.health, 1100);
  near(tzaangor.armour, 28);
  assert.ok(!("rangedAttack" in effectiveStats(unit("khorngor"), effects)), "a stat the troop lacks stays absent");
});

test("BONUS-02 percentages add up before applying", () => {
  const troop = { ...unit("marauders"), stats: { health: 100 } };
  const twoPercents = [
    { stat: "health", percent: 10 },
    { stat: "health", percent: 15 },
  ];
  near(effectiveStats(troop, twoPercents).health, 125); // 100 × 1.25, not 100 × 1.10 × 1.15
});

test("ARMY-01 an army is a count per troop type, each line with its stats and power", () => {
  const army = summariseArmy(current.troops, catalogue, effects, example.limits);
  assert.deepEqual(
    army.lines.map((line) => [line.unit.id, line.count]),
    [
      ["khorngor", 20000],
      ["tzaangor", 15000],
      ["khorne-gor", 10000],
    ],
  );
  near(army.lines[0].stats.meleeAttack, 72.5);
});

test("ARMY-01 an army refuses unknown troops, defences and bad counts", () => {
  const summarise = (troops) => summariseArmy(troops, catalogue, [], example.limits);
  assert.throws(() => summarise({ "not-a-unit": 1 }), /Unknown troop "not-a-unit"/);
  assert.throws(() => summarise({ "razor-walls": 1 }), /"razor-walls" is a defence/);
  assert.throws(() => summarise({ khorngor: -1 }), /whole number/);
  assert.throws(() => summarise({ khorngor: 1.5 }), /whole number/);
});

test("ARMY-02 the march capacity: a fixed base, a bonus on top, and the total", () => {
  // the example: 50 000 base, +10 % → 5 000 bonus, 55 000 in all
  const capacity = marchCapacity(example.limits, effects);
  assert.equal(capacity.base, 50000);
  assert.equal(capacity.percent, 10);
  near(capacity.bonus, 5000);
  near(capacity.total, 55000);
  near(marchCapacity({ marchCapacity: 100000 }, [{ stat: "marchCapacity", percent: 16 }]).total, 116000);
});

test("ARMY-02 the army's size against the capacity, and the excess", () => {
  // the example army holds 20 000 + 15 000 + 10 000 = 45 000 troops: within 55 000
  const army = summariseArmy(current.troops, catalogue, effects, example.limits);
  assert.equal(army.size, 45000);
  near(army.capacity.total, 55000);
  assert.equal(army.excess, 0);
  // without the bonus, a 40 000 cap leaves 5 000 troops too many
  assert.equal(summariseArmy(current.troops, catalogue, [], { marchCapacity: 40000 }).excess, 5000);
});

test("SIM-01 army power: count × power per troop, untouched by bonuses", () => {
  // 20 000 Khorngor × 60 + 15 000 Tzaangor × 60 + 10 000 Khorne Gor × 150
  const withBonuses = summariseArmy(current.troops, catalogue, effects, example.limits);
  assert.equal(withBonuses.power, 3_600_000);
  assert.deepEqual(
    withBonuses.lines.map((line) => line.power),
    [1_200_000, 900_000, 1_500_000],
  );
  assert.equal(summariseArmy(current.troops, catalogue, [], example.limits).power, 3_600_000);
  assert.equal(summariseArmy({}, catalogue, [], example.limits).power, 0);
});
