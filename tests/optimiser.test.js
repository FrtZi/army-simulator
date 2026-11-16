// The optimiser, angle 1 (SIM-05, D-40): the best composition, heroes and talents within the troops owned and the
// march capacity. In Node on the real game data, the search against simple compositions and against every trio and
// talent choice; then on the published page in jsdom, with Your setup loaded.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  armyProfile,
  combinations,
  heroUnit,
  indexCatalogue,
  offeredTalents,
  optimise,
  profileScore,
  summariseArmy,
  talentEffects,
} from "../src/engine/index.js";
import { addTroops, openPage } from "./page.js";

const read = (path) => JSON.parse(readFileSync(new URL(`../data/chaos-conquest/${path}`, import.meta.url), "utf8"));
const game = read("game.json");
const rules = read("combat-rules.json");
const { warlords, talents } = read("warlords.json");
const catalogue = indexCatalogue(read("units.json"), read("defences.json"));
const byId = new Map(warlords.map((warlord) => [warlord.id, warlord]));
const settings = { width: 20, slices: 20, rounds: 60, ...game.heroRules };
const CAPACITY = 50000;

const withWarlords = (heroes) => heroes.map(({ id, level }) => ({ warlord: byId.get(id), level }));
const offered = (heroes) => offeredTalents(withWarlords(heroes));
/** A composition scored as the page does without a setup: its talents' bonuses, its heroes fighting, a profile. */
const judge = (weights) => (composition) => {
  const { effects } = talentEffects(composition.talents, offered(composition.heroes), talents, game.talentCodes);
  const units = withWarlords(composition.heroes).map(({ warlord, level }) => heroUnit(warlord, level));
  const army = summariseArmy(composition.troops, catalogue, effects, { marchCapacity: CAPACITY }, units);
  return profileScore(armyProfile(army, rules.model), weights);
};
const ALL_ROUND = { damage: 0.5, health: 0.5 };

test("SIM-05 the search's pieces: every trio of the heroes, a profile scored as a weighted geometric mean", () => {
  assert.equal(combinations([...Array(12).keys()], 3).length, 220);
  assert.deepEqual(combinations(["a", "b"], 3), [], "fewer items than the size: nothing");
  assert.deepEqual(combinations(["a"], 0), [[]]);
  const profile = { power: 9, damage: { best: 4 }, health: 25 };
  assert.equal(profileScore(profile, ALL_ROUND), 10, "√4 × √25");
  assert.equal(profileScore(profile, { power: 1 }), 9);
});

test("SIM-05 the composition found scores at least as high as each simple one, within the troops owned and capacity", () => {
  const owned = [
    ["khorngor", 30000],
    ["pestigor", 30000],
    ["khorne-gor", 20000],
    ["chaos-spawn", 5000],
  ];
  const score = judge(ALL_ROUND);
  const found = optimise({ owned, capacity: CAPACITY, heroes: [], offered, score, settings });
  const { troops } = found.composition;
  assert.ok(Object.values(troops).reduce((sum, count) => sum + count, 0) <= CAPACITY, "within the capacity");
  for (const [id, count] of Object.entries(troops)) assert.ok(count <= new Map(owned).get(id), `${id} within owned`);
  assert.equal(found.score, score(found.composition));
  const simple = (some) => score({ troops: some, heroes: [], talents: [] });
  for (const [id, count] of owned) assert.ok(found.score >= simple({ [id]: Math.min(count, CAPACITY) }), `all ${id}`);
  // the owned mix as it stands, in the order listed, until the capacity is full
  assert.ok(found.score >= simple({ khorngor: 30000, pestigor: 20000 }), "the owned mix");
  assert.equal(optimise({ owned: [["khorngor", 0]], capacity: CAPACITY, heroes: [], offered, score, settings }), null);
});

test("SIM-05 troops that complete each other: a mix found, better than all of either", () => {
  // the Tzaangor deal damage, Tzeentch's Chaos Warriors take it: for damage × health, a mix is worth more
  const owned = [
    ["tzaangor", CAPACITY],
    ["tzeentch-chaos-warriors", CAPACITY],
  ];
  const score = judge(ALL_ROUND);
  const found = optimise({ owned, capacity: CAPACITY, heroes: [], offered, score, settings });
  const best = Math.max(...owned.map(([id]) => score({ troops: { [id]: CAPACITY }, heroes: [], talents: [] })));
  assert.equal(Object.keys(found.composition.troops).length, 2);
  assert.ok(found.score > 1.15 * best, `${found.score} against ${best}`);
});

/** The best of every trio with every choice of at most `talentsPerArmy` talents it offers, for the troops given. */
function exhaustive(heroes, troops, score) {
  let best = -Infinity;
  for (const trio of combinations(heroes, game.heroRules.heroesPerArmy)) {
    const ids = offered(trio).map(({ id }) => id);
    for (let size = 0; size <= game.heroRules.talentsPerArmy; size += 1) {
      for (const chosen of combinations(ids, size)) {
        best = Math.max(best, score({ troops, heroes: trio, talents: chosen }));
      }
    }
  }
  return best;
}

test("SIM-05 the heroes and talents found: the owned ones only, at most 3 and 4, as good as trying every choice", () => {
  const heroes = ["bloodthirster", "great-unclean-one", "skulltaker", "herald-of-nurgle", "chaos-lord-of-khorne"].map(
    (id) => ({ id, level: 20 }),
  );
  const owned = [
    ["khorngor", 30000],
    ["pestigor", 30000],
  ];
  const score = judge(ALL_ROUND);
  const found = optimise({ owned, capacity: CAPACITY, heroes, offered, score, settings });
  const { composition } = found;
  assert.equal(composition.heroes.length, 3);
  assert.ok(
    composition.heroes.every((hero) => heroes.includes(hero)),
    "only heroes owned, at their levels",
  );
  assert.ok(composition.talents.length <= 4);
  const ids = offered(composition.heroes).map(({ id }) => id);
  assert.ok(
    composition.talents.every((id) => ids.includes(id)),
    "only talents the trio offers",
  );
  assert.equal(composition.talents.length, 4, "more than 4 add to Khorne's and Nurgle's troops: the best 4 taken");
  assert.equal(found.score, exhaustive(heroes, composition.troops, score));
});

const GAME = "chaos-conquest";
const SETUP_KEY = "army-simulator.player-setup";
const setup = {
  format: "army-simulator/setup",
  version: 1,
  game: GAME,
  capacity: { base: CAPACITY },
  // level 20: rank 4, level 5 (5 levels a rank), as a setup file says it
  warlords: ["bloodthirster", "chaos-lord-of-khorne", "azazel", "doom-knight"].map((id) => ({ id, rank: 4, level: 5 })),
  troops: [
    { id: "khorngor", count: 30000 },
    { id: "pestigor", count: 30000 },
    { id: "khorne-gor", count: 20000 },
  ],
};
const openWithSetup = () => openPage({ stored: { [SETUP_KEY]: JSON.stringify({ [GAME]: setup }) } });

test("SIM-05 on the page: with Your setup loaded, the best army for a goal found, then put in the composition", () => {
  const page = openWithSetup();
  assert.ok(page.$("#optimiser-run").disabled, "not without the setup loaded");
  assert.match(page.text("#optimiser-status"), /Turn on “Load your setup”/);
  page.tick("#load-setup-toggle");
  page.choose("#optimiser-goal", "damage");
  page.click("#optimiser-run");
  assert.match(page.text("#optimiser-status"), /^✓ The best army found for “Damage”, among [\d,]+ armies tried\.$/);
  const result = page.text("#optimiser-result");
  assert.match(result, /Composition A is empty for now\./);
  assert.match(result, /Troops: 50,000 of 50,000/);
  assert.match(result, /Heroes Bloodthirster · level 20/);
  // the other talents add no damage to these melee troops of Khorne: none taken for nothing
  assert.match(result, /Talents: 1 of 4 Melee Damage, Khorne \+33\.5 %/);
  page.click("#optimiser-use");
  assert.equal(page.text("#optimiser-status"), "✓ Composition A now holds the army found.");
  assert.equal(page.$$("#hero-lines .hero-line").length, 3);
  assert.equal(page.$$("#army-lines input").length, 2, "its two troops");
  page.click("#optimiser-run");
  assert.match(page.text("#optimiser-result"), /= As good as composition A as it stands\./, "found again from itself");
});

// DEF-045: troops added to the side compared once left the button greyed, the block drawn only with the whole page
test("SIM-05 DEF-045 on the page: a battle won against the comparison's second side, said in words", () => {
  const page = openWithSetup();
  page.tick("#load-setup-toggle");
  page.choose("#optimiser-goal", "battle");
  assert.match(page.text("#optimiser-status"), /The comparison's second side is empty/);
  page.click("#composition-tab-1");
  addTroops(page, ["khorngor"]);
  page.click("#composition-tab-0");
  page.click("#optimiser-run");
  assert.match(page.text("#optimiser-result"), /^Composition A is empty for now\./);
  addTroops(page, ["pestigor"]);
  page.click("#optimiser-run");
  assert.match(
    page.text("#optimiser-result"),
    /^Attacking: ✓ won by [\d,]+ power; composition A as it stands: ✗ lost by [\d,]+ power\./,
  );
});
