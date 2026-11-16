// The optimiser on a real account's scale (DEF-049): with every troop owned in varied numbers, the slices of the
// capacity move to the troops worth most per place only, and the search finds the same army judging far fewer.
// A count of armies judged, not a time: a slow machine would make a time flaky.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  armyProfile,
  heroUnit,
  indexCatalogue,
  offeredTalents,
  optimise,
  profileScore,
  summariseArmy,
  talentEffects,
} from "../src/engine/index.js";

const read = (path) => JSON.parse(readFileSync(new URL(`../data/chaos-conquest/${path}`, import.meta.url), "utf8"));
const game = read("game.json");
const rules = read("combat-rules.json");
const units = read("units.json");
const { warlords, talents } = read("warlords.json");
const catalogue = indexCatalogue(units, read("defences.json"));
const byId = new Map(warlords.map((warlord) => [warlord.id, warlord]));
const withWarlords = (heroes) => heroes.map(({ id, level }) => ({ warlord: byId.get(id), level }));
const offered = (heroes) => offeredTalents(withWarlords(heroes));
const CAPACITY = 60000;
const score = (composition) => {
  const { effects } = talentEffects(composition.talents, offered(composition.heroes), talents, game.talentCodes);
  const heroes = withWarlords(composition.heroes).map(({ warlord, level }) => heroUnit(warlord, level));
  const army = summariseArmy(composition.troops, catalogue, effects, { marchCapacity: CAPACITY }, heroes);
  return profileScore(armyProfile(army, rules.model), { damage: 0.5, health: 0.5 });
};

test("SIM-05 DEF-049 every troop owned: the same army found, judging a few thousand armies, not tens of thousands", () => {
  // all 82 troops owned, from 200 to 40,000 each, as a real account holds them
  const owned = units.map((unit, index) => [unit.id, 200 + ((index * 7919) % 40000)]);
  const heroes = warlords.slice(0, 12).map(({ id }) => ({ id, level: 20 }));
  const search = (candidates) =>
    optimise({
      owned,
      capacity: CAPACITY,
      heroes,
      offered,
      score,
      settings: { width: 20, slices: 20, rounds: 60, settled: 5, ...game.heroRules, ...(candidates && { candidates }) },
    });
  const short = search(12);
  const every = search();
  assert.equal(short.score, every.score, "the same army's score");
  assert.ok(short.judged < 4000, `${short.judged} armies judged`);
  assert.ok(every.judged > 2 * short.judged, `${every.judged} against ${short.judged}`);
});

// DEF-053: with the best troops rare and all placed, the places a talent frees found no troop to take: on a real
// account, 50,000 troops for 61,500 places
test("SIM-05 DEF-053 the places a talent frees are filled, even when the best troops are rare and all placed", () => {
  const owned = units.map((unit) => [unit.id, 1000]); // 82,000 troops, a thousand of each
  const heroes = warlords.slice(0, 6).map(({ id }) => ({ id, level: 20 }));
  // a trio raises the capacity, as a march capacity talent does: 50,000 places without heroes, 61,500 with them
  const capacity = (composition) => (composition.heroes.length ? 61500 : 50000);
  const settings = { width: 20, slices: 20, rounds: 60, settled: 5, candidates: 12, ...game.heroRules };
  const found = optimise({ owned, capacity, heroes, offered, score, settings });
  const placed = Object.values(found.composition.troops).reduce((sum, count) => sum + count, 0);
  assert.equal(placed, 61500);
});
