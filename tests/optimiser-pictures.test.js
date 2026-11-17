// The optimiser's pictures (SIM-22, SIM-23, SIM-24, D-51): the search's trail drawn on one axis, the army chosen with its
// power two ways, the path as branches; bonuses grouped into lines; the champion's gear by slot and set. In Node on a
// made-up score, then on the published page in jsdom with a fictitious setup.
import { test } from "node:test";
import assert from "node:assert/strict";
import { optimise, varied } from "../src/engine/index.js";
import { groupedEffects } from "../src/ui/steps/optimiser/effect-lines.js";
import { openPage } from "./page.js";

test("SIM-22 the search's trail: every trio's score at a glance, the kept ones' heroes, place and scores, the settled ones', the one chosen", () => {
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
  // every trio's score at a glance, best first: 6 heroes two by two
  assert.equal(trail.glance.length, 15);
  assert.deepEqual(
    trail.glance,
    [...trail.glance].sort((a, b) => b - a),
  );
  // b and d at a glance: 100 troops × (1 + 5 + 4)
  assert.equal(trail.glance[0], 1000);
  assert.equal(trail.kept.length, 4);
  // each kept trio's heroes, its place at a glance and its score then, its score once its talents are chosen
  assert.deepEqual(trail.kept[0], { heroes: ["b", "d"], place: 0, glance: 1000, score: 1000 });
  for (const { place, glance } of trail.kept) assert.equal(glance, trail.glance[place]);
  assert.equal(trail.settled.length, 2);
  for (const { rank, score: settled } of trail.settled) {
    assert.ok(rank >= 0 && rank < trail.kept.length, String(rank));
    assert.ok(settled >= trail.kept[rank].score, "settling only raises a score");
  }
  assert.ok(trail.settled.some(({ rank }) => rank === trail.chosen));
  // the best pair at a glance is b and d, and it stays the best: chosen at rank 0
  assert.equal(trail.chosen, 0);
  assert.deepEqual(composition.heroes.map(({ id }) => id).sort(), ["b", "d"]);
});

test("SIM-27 DEF-059 the trios kept varied: the best at a glance, each pair of heroes in a few of them at most", () => {
  const trio = (ids, score) => ({ composition: { heroes: ids.map((id) => ({ id, level: 1 })) }, score });
  // a and b lift every army: at a glance they lead beside any third hero
  const ranked = [
    trio(["a", "b", "c"], 10),
    trio(["b", "a", "d"], 9),
    trio(["a", "b", "e"], 9),
    trio(["a", "c", "d"], 8),
    trio(["c", "d", "e"], 7),
  ];
  const ids = (kept) => kept.map(({ composition }) => composition.heroes.map(({ id }) => id).join(""));
  assert.deepEqual(ids(varied(ranked, 3)), ["abc", "bad", "abe"], "without a cap, the best at a glance");
  // a and b twice at most: "abe" gives its place to "acd", the order at a glance kept
  assert.deepEqual(ids(varied(ranked, 3, 2)), ["abc", "bad", "acd"]);
  // once: a pair already kept closes the door to every trio that has it (a and c in "acd")
  assert.deepEqual(ids(varied(ranked, 4, 1)), ["abc", "cde"]);
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

test("SIM-22 DEF-061 the model's map drawn: every trio by its share of the best at each stage, equal shares one mark, the trios named, the army's power two ways, the path as branches", () => {
  const page = run();
  page.click("#opt-tab-map");
  // 4 heroes: 4 trios at a glance as bars, each bar saying how many; the kept and settled ones as marks, each mark
  // a share and how many trios stand on it, a line following them from row to row
  const search = page.$("#opt-panel-map .opt-search");
  const counted = page
    .$$("#opt-panel-map .opt-search rect title")
    .map((title) => Number(title.textContent.split(" ")[0]));
  assert.equal(
    counted.reduce((sum, n) => sum + n, 0),
    4,
    "every trio in a bar",
  );
  // no page-wide style reaches the picture's shapes: a height from one would squash the bars (DEF-061)
  for (const shape of page.$$("#opt-panel-map .opt-search rect, #opt-panel-map .opt-search circle")) {
    assert.ok(!/\d/.test(page.window.getComputedStyle(shape).height), shape.getAttribute("class"));
  }
  const kept = page.$$("#opt-panel-map .opt-trios tbody tr").length;
  assert.ok(kept >= 1 && kept <= 4, String(kept));
  const many = (text) => Number(/· (\d+) trios/.exec(text)?.[1] ?? 1);
  const keptMarks = page.$$("#opt-panel-map .mark.row-kept").map((mark) => many(mark.textContent));
  assert.equal(
    keptMarks.reduce((sum, n) => sum + n, 0),
    kept,
    "every kept trio on a mark",
  );
  assert.equal(page.$$("#opt-panel-map .mark.row-chosen .ring").length, 1, "the one chosen ringed");
  assert.match(page.text("#opt-panel-map .mark.row-chosen text"), /^100 % · chosen$/);
  assert.ok(page.$$("#opt-panel-map .links.row-kept").length >= 1);
  assert.match(
    search.getAttribute("aria-label"),
    /^4 trios of heroes by their score at a glance; the \d kept placed again .*; the one chosen ranked \d at a glance$/,
  );
  assert.match(
    page.text("#opt-panel-map .opt-search"),
    /^At a glance4 trios.*Talents chosen\d kept.*Troops moved\d settled/,
  );
  // the axis says what a share is
  assert.match(
    page.text("#opt-panel-map .axis-title"),
    /^Each army's score for the goal, in % of the best army found \(= 100 %\)$/,
  );
  // the trios kept named, the one chosen first with its word, its share 100 % once its troops have moved
  const first = page.$$("#opt-panel-map .opt-trios tbody tr")[0];
  assert.match(first.textContent, /chosen/);
  assert.match(first.textContent, /100 %$/);
  // the stages as cards, the picture's legend
  assert.match(
    page.text("#opt-panel-map .opt-stages"),
    /^4trios of heroes, .*1chosen, the best settled; ranked \d at a glance/,
  );
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
