// Heroes in a composition (D-26), on the game's real warlords: their level as a rank, their stats at that level,
// the talents they offer and the four the composition activates, and heroes fighting like a group of one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  armyProfile,
  effectiveStats,
  heroProblems,
  heroUnit,
  indexCatalogue,
  levelOf,
  offeredTalents,
  rankOf,
  simulateBattle,
  summariseArmy,
  talentEffects,
} from "../src/engine/index.js";

const read = (file) => JSON.parse(readFileSync(new URL(`../data/chaos-conquest/${file}`, import.meta.url), "utf8"));
const game = read("game.json");
const rules = read("combat-rules.json");
const { talents, warlords: list } = read("warlords.json");
const warlords = new Map(list.map((warlord) => [warlord.id, warlord]));
const catalogue = indexCatalogue(read("units.json"), read("defences.json"));
const RULES = game.heroRules;
const hero = (id, level) => ({ warlord: warlords.get(id), level });
const LIMITS = { marchCapacity: 1_000_000 };

test("ARMY-05 a hero's level as the game shows it: rank 1 to 7, level 1 to 5 within the rank", () => {
  assert.deepEqual(rankOf(12, RULES), { rank: 3, level: 2 });
  assert.deepEqual(rankOf(1, RULES), { rank: 1, level: 1 });
  assert.deepEqual(rankOf(35, RULES), { rank: 7, level: 5 });
  for (let level = 1; level <= RULES.ranks * RULES.levelsPerRank; level += 1) {
    const { rank, level: within } = rankOf(level, RULES);
    assert.equal(levelOf(rank, within, RULES), level);
  }
});

test("ARMY-05 a hero at its level: its tier, its own stats and its power at that level", () => {
  const azazel = heroUnit(warlords.get("azazel"), 35);
  assert.equal(azazel.tier, 5);
  assert.equal(azazel.unitType, "hero");
  assert.equal(azazel.stats.health, 1600);
  assert.equal(azazel.stats.meleeDamage, 60000);
  assert.equal(azazel.stats.squadPower, 162500, "its power where a troop has its power per troop");
  assert.equal(heroUnit(warlords.get("azazel"), 1).tier, 4, "a lower level, a lower tier");
});

test("ARMY-06 a talent two heroes offer is offered once, at its strongest (D-26)", () => {
  // both give Slaanesh Health: the Herald at level 1 (+1.5 %), offered first, and Azazel at level 35 (+45 %)
  const offered = offeredTalents([hero("herald-of-slaanesh", 1), hero("azazel", 35)]);
  const health = offered.filter((talent) => talent.id === "slaanesh-health");
  assert.equal(health.length, 1);
  assert.equal(health[0].percent, 45, "the strongest, not the first");
  assert.deepEqual(health[0].from.sort(), ["azazel", "herald-of-slaanesh"]);
  assert.equal(offered.length, new Set(offered.map((talent) => talent.id)).size);
});

test("ARMY-06 the rules: 3 heroes, 4 talents in all, each offered by a hero at its level", () => {
  const codes = (composition) => heroProblems(composition, warlords, RULES).map((problem) => problem.code);
  const four = ["azazel", "karanak", "sigvald-the-magnificent", "throgg-king-of-trolls"].map((id) => ({
    id,
    level: 35,
  }));
  assert.deepEqual(codes({ heroes: four, talents: [] }), ["too-many-heroes"]);
  assert.deepEqual(codes({ heroes: [{ id: "azazel", level: 36 }], talents: [] }), ["hero-level"]);
  assert.deepEqual(codes({ heroes: [{ id: "nobody", level: 1 }], talents: [] }), ["unknown-hero"]);
  const azazel = [{ id: "azazel", level: 35 }];
  const five = [
    "slaanesh-health",
    "slaanesh-melee-damage",
    "slaanesh-ranged-damage",
    "chariots-health",
    "monsters-ranged-damage",
  ];
  assert.deepEqual(codes({ heroes: azazel, talents: five }), ["too-many-talents"]);
  assert.deepEqual(codes({ heroes: azazel, talents: five.slice(0, 4) }), []);
  assert.deepEqual(codes({ heroes: azazel, talents: ["march-combat"] }), ["talent-not-offered"]);
  // Slaanesh Ranged Damage unlocks above level 1
  assert.deepEqual(codes({ heroes: [{ id: "azazel", level: 1 }], talents: ["slaanesh-ranged-damage"] }), [
    "talent-not-offered",
  ]);
});

test("BONUS-03 the chosen talents raise the troops they target; a battle-specific one waits (open question 16)", () => {
  const offered = offeredTalents([hero("azazel", 35), hero("karanak", 35), hero("sigvald-the-magnificent", 35)]);
  const chosen = ["slaanesh-health", "march-combat", "march-capacity"];
  const { effects, inactive } = talentEffects(chosen, offered, talents, game.talentCodes);
  assert.deepEqual(inactive, ["march-combat"]);
  assert.deepEqual(effects[0], { stat: "health", percent: 45, target: { alignments: ["slaanesh"] } });
  assert.equal(effects[1].stat, "marchCapacity");
  const slaanesh = catalogue.units.get("slaanesh-serpents");
  const khorne = catalogue.units.get("bloodletters");
  assert.equal(effectiveStats(slaanesh, effects).health, slaanesh.stats.health * 1.45);
  assert.equal(effectiveStats(khorne, effects).health, khorne.stats.health, "another god's troop is untouched");
});

test("SIM-10 a hero fights as a group of one: its power counts, its stats are its own, it takes no march place", () => {
  const azazel = heroUnit(warlords.get("azazel"), 35);
  const effects = [{ stat: "health", percent: 45, target: { alignments: ["slaanesh"] } }];
  const army = summariseArmy({ "slaanesh-serpents": 100 }, catalogue, effects, LIMITS, [azazel]);
  assert.equal(army.size, 100, "the hero takes no place in the march (open question 18)");
  assert.equal(army.power, 100 * catalogue.units.get("slaanesh-serpents").stats.squadPower + 162500);
  assert.equal(army.heroes[0].stats.health, 1600, "no bonus on a hero (open question 14)");
  const profile = armyProfile(army, rules.model);
  assert.equal(profile.heroes, 1);
  assert.ok(profile.lines.some((line) => line.hero && line.count === 1));
  assert.ok(Number.isFinite(profile.foodPerHour), "a hero has no upkeep, and breaks no sum");
});

test("SIM-10 in battle, a hero strikes and is struck at its tier, after the lower tiers", () => {
  const champion = heroUnit(warlords.get("chosen-champion"), 1); // tier 1 at level 1
  const azazel = heroUnit(warlords.get("azazel"), 35); // tier 5
  const alone = summariseArmy({}, catalogue, [], LIMITS, [azazel]);
  const marauders = summariseArmy({ marauders: 1000 }, catalogue, [], LIMITS);
  const battle = simulateBattle(alone, marauders, rules);
  assert.ok(battle.turns[0].defender[0].lost > 0, "the hero alone kills Marauders");
  assert.equal(battle.turns[0].attacker[0].tier, 5);
  const screened = summariseArmy({ marauders: 1000 }, catalogue, [], LIMITS, [azazel]);
  const struck = simulateBattle(summariseArmy({ marauders: 10 }, catalogue, [], LIMITS), screened, rules);
  const azazelLost = struck.turns[0].defender.find((group) => group.id === "azazel").lost;
  assert.equal(azazelLost, 0, "tier 1 Marauders stand in front of a tier 5 hero");
  const front = summariseArmy({}, catalogue, [], LIMITS, [champion]);
  const lost = simulateBattle(marauders, front, rules).powerLost.defender;
  assert.ok(lost > 0 && lost <= 500, "a hero struck down loses its power, nothing more");
});
