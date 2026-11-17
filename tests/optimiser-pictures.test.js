// The optimiser's pictures (SIM-22, SIM-23, SIM-24, D-51): the search's trail drawn as dots, the army chosen with its
// power two ways, the path as branches; bonuses grouped into lines; the champion's gear by slot and set. In Node on a
// made-up score, then on the published page in jsdom with a fictitious setup.
import { test } from "node:test";
import assert from "node:assert/strict";
import { optimise } from "../src/engine/index.js";
import { groupedEffects } from "../src/ui/steps/optimiser/effect-lines.js";
import { openPage } from "./page.js";

test("SIM-22 the search's trail: the trios tried, how many kept, the ranks settled and the one chosen among them", () => {
  const heroes = ["a", "b", "c", "d", "e", "f"].map((id) => ({ id, level: 1 }));
  const worth = { a: 1, b: 5, c: 2, d: 4, e: 3, f: 0 };
  const score = ({ troops, heroes: picked }) =>
    (troops.x ?? 0) * (1 + picked.reduce((sum, { id }) => sum + worth[id], 0));
  const settings = { width: 4, settled: 2, slices: 5, rounds: 5, heroesPerArmy: 2, talentsPerArmy: 0 };
  const { trail, composition } = optimise({
    owned: [["x", 100]],
    capacity: 100,
    heroes,
    offered: () => [],
    score,
    settings,
  });
  assert.equal(trail.trios, 15, "6 heroes two by two");
  assert.equal(trail.kept, 4);
  assert.equal(trail.settled.length, 2);
  for (const rank of trail.settled) assert.ok(rank >= 0 && rank < trail.kept, String(rank));
  assert.ok(trail.settled.includes(trail.chosen));
  // the best pair at a glance is b and d, and it stays the best: chosen at rank 0
  assert.equal(trail.chosen, 0);
  assert.deepEqual(composition.heroes.map(({ id }) => id).sort(), ["b", "d"]);
});

test("SIM-23 bonuses grouped: one line per value and troops, the stats that share them together, the largest first", () => {
  const infantry = { unitTypes: ["infantry"] };
  const both = { unitTypes: ["infantry", "monstrous-infantry"] };
  const lines = groupedEffects([
    { stat: "meleeAttack", percent: 40, target: both },
    { stat: "rangedAttack", percent: 40, target: both },
    { stat: "health", percent: 10, target: infantry },
    { stat: "armour", percent: 40, target: infantry },
  ]);
  assert.deepEqual(
    lines.map(({ stats, targets, percent }) => [stats, targets.map(([, value]) => value), percent]),
    [
      [["meleeAttack", "rangedAttack"], ["infantry", "monstrous-infantry"], 40],
      [["armour"], ["infantry"], 40],
      [["health"], ["infantry"], 10],
    ],
  );
});

const GAME = "chaos-conquest";
const setup = {
  format: "army-simulator/setup",
  version: 1,
  game: GAME,
  capacity: { base: 50000 },
  warlords: ["bloodthirster", "great-unclean-one", "doom-knight", "chosen-champion"].map((id) => ({
    id,
    rank: 4,
    level: 5,
  })),
  troops: [
    { id: "khorngor", count: 30000 },
    { id: "pestigor", count: 30000 },
  ],
  rituals: [{ id: "brutal-strength", level: 4 }],
  champion: {
    level: 40,
    gear: [
      { id: "great-helm-of-the-vanquisher", level: 1 },
      { id: "breastplate-of-fury", level: 3 },
      { id: "sabatons-of-the-vanquisher", level: 2 },
    ],
  },
};

function run() {
  const page = openPage({ stored: { "army-simulator.player-setup": JSON.stringify({ [GAME]: setup }) } });
  page.tick("#load-setup-toggle");
  page.click("#optimiser-run");
  return page;
}

test("SIM-22 the model's map drawn: every trio a dot by stage, the army's power two ways, the path as branches", () => {
  const page = run();
  page.click("#opt-tab-map");
  // 4 heroes: 4 trios, all kept; the dots in one path per stage, the picture named with its figures
  assert.deepEqual(
    page.$$("#opt-panel-map .dots").map((path) => path.getAttribute("class")),
    ["dots stage-tried", "dots stage-kept", "dots stage-settled", "dots stage-chosen"],
  );
  assert.match(
    page.$("#opt-panel-map .opt-search").getAttribute("aria-label"),
    /^4 trios of heroes as dots: 4 kept, 4 settled, 1 chosen$/,
  );
  assert.match(page.text("#opt-panel-map .opt-legend"), /4 trios tried at a glance.*1 chosen, ranked \d at a glance/);
  // the search played once after the run, still on the next draw, played again on demand
  assert.ok(!page.$("#opt-panel-map .opt-search").classList.contains("play"), "still once drawn again");
  page.click("#opt-map-replay");
  assert.ok(page.$("#opt-panel-map .opt-search").classList.contains("play"), "played again");
  page.click("#opt-tab-have");
  page.click("#opt-tab-map");
  assert.ok(!page.$("#opt-panel-map .opt-search").classList.contains("play"), "for one draw only");
  // the power two ways: the larger bar full, the game's a share of it
  const army = page.text('#opt-panel-map [data-block="army"]');
  assert.match(army, /The game's power[\d,]+With every bonus[\d,]+/);
  const shares = page.$$('#opt-panel-map [data-block="army"] .share-bar span').map((bar) => Number(bar.dataset.share));
  assert.equal(shares[1], 100);
  assert.ok(shares[0] > 0 && shares[0] < 100, String(shares[0]));
  // one branch per step of the path, each in its kind's colour, the kinds named in a legend
  const branches = page.$$("#opt-panel-map .opt-branch");
  assert.equal(branches.length, page.$$("#optimiser-path li").length);
  assert.ok(branches.every((branch) => /kind-(ritual|hero|structure|champion)/.test(branch.getAttribute("class"))));
  assert.match(page.text('#opt-panel-map [data-block="tree"]'), /Ritual|Hero|Building|Champion/);
});

test("SIM-23 SIM-24 the rituals in grouped lines, the champion's gear by slot and its sets with their tiers", () => {
  const page = run();
  assert.match(
    page.text('#opt-panel-have [data-block="rituals"]'),
    /Brutal Strength level 4 −[\d.]+ %Melee AttackKhorne\+6 %/,
  );
  const champion = '#opt-panel-have [data-block="champion"]';
  const cards = page.$$(`${champion} .opt-gear`).map((card) => card.textContent.replace(/\s+/g, " ").trim());
  assert.equal(cards.length, 6, "a card per slot");
  // the slot, the rarity's name, the piece; its bonuses in battle grouped, the value last
  assert.match(cards[0], /^Head Core\s?Great Helm of the Vanquisher/);
  assert.match(cards[1], /^Chest Rare\s?Breastplate of Fury.*HealthKhorne\+10\.5 %/);
  assert.match(cards[2], /^Gloves\s?Empty/);
  assert.equal(page.$$(`${champion} .opt-gear:nth-child(2) .opt-pips .on`).length, 3, "level 3 of its pips");
  // the Vanquisher set: 2 worn of 6, its next tier at 3 outside battle, ticked tiers none
  const set = page.text(`${champion} .opt-gear-set`);
  assert.match(set, /Vanquisher Set Bonus\S* 2\/6 pieces worn · next tier at 3/);
  assert.equal(page.$$(`${champion} .opt-gear-set .opt-track .on`).length, 2);
});
