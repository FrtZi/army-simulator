// The army found in detail and X or Y (SIM-19, SIM-20, SIM-21, D-48): what each source weighs, the rituals acting on
// the army, the bonuses summed by stat, the power two ways; two aims compared. On the published page in jsdom.
import { test } from "node:test";
import assert from "node:assert/strict";
import { openPage } from "./page.js";

const GAME = "chaos-conquest";
const base = {
  format: "army-simulator/setup",
  version: 1,
  game: GAME,
  capacity: { base: 50000 },
  troops: [
    { id: "khorngor", count: 30000 },
    { id: "pestigor", count: 30000 },
  ],
};

function run(setup) {
  const page = openPage({
    stored: { "army-simulator.player-setup": JSON.stringify({ [GAME]: { ...base, ...setup } }) },
  });
  page.tick("#load-setup-toggle");
  page.click("#optimiser-run");
  return page;
}
const blockText = (page, id) => page.text(`#opt-panel-have [data-block="${id}"]`);

test("SIM-19 what weighs, the rituals acting on the army, the bonuses summed by stat and source", () => {
  const page = run({
    // Brutal Strength raises Khorne's melee attack; the Tallyman's Dirge, Nurgle's morale only
    rituals: [
      { id: "brutal-strength", level: 4 },
      { id: "tallymans-dirge", level: 3 },
    ],
    champion: { level: 40, gear: [{ id: "breastplate-of-fury", level: 3 }] },
  });
  const weights = blockText(page, "weights");
  assert.match(weights, /^What weighs most .*Rituals −[\d.]+ %/);
  assert.match(weights, /^What weighs most .*Champion −[\d.]+ %/);
  // the Dirge touches the Pestigor's morale, which damage × health does not count: listed, weighing nothing
  const rituals = blockText(page, "rituals");
  assert.match(rituals, /Brutal Strength · level 4 · Melee Attack, Khorne \+6 %/);
  assert.match(rituals, /Tallymans Dirge · level 3 · Morale, Nurgle \+7 % ?−0 %/);
  // the Breastplate of Fury at rare: Khorne's health +10.5 %, in the champion's column
  assert.match(blockText(page, "synthesis"), /Health, Khorne—\+10\.5 %———Melee Attack, Khorne——\+6 %——/);
  assert.match(blockText(page, "champion"), /^Champion level 40 · −[\d.]+ % without it/);
});

test("SIM-20 the power two ways: the game's, and with every bonus, the same with none", () => {
  const bare = run({});
  // no hero, no ritual, no champion: no bonus, the two powers the same
  assert.match(blockText(bare, "summary"), /Power: the game's ([\d,]+); with every bonus \1 \(×1\)/);
  const buffed = run({ rituals: [{ id: "brutal-strength", level: 10 }] });
  const [, game, more, ratio] = blockText(buffed, "summary").match(
    /the game's ([\d,]+); with every bonus ([\d,]+) \(×([\d.]+)\)/,
  );
  assert.ok(Number(ratio) > 1, ratio);
  const figure = (text) => Number(text.replace(/,/g, ""));
  assert.ok(Math.abs(figure(more) - figure(game) * Number(ratio)) <= figure(game) * 0.006, "power × ratio");
});

test("SIM-21 X or Y: two aims ticked, each side's best army, the better marked; a side with no troop says so", () => {
  const page = run({});
  page.click("#opt-tab-xy");
  assert.match(page.text("#opt-panel-xy"), /^Two aims compared Not compared yet/);
  page.tick("#xy-x-alignment-khorne");
  page.tick("#xy-y-alignment-nurgle");
  page.click("#optimiser-xy-run");
  const cards = page.$$("#opt-panel-xy .opt-xy").map((card) => card.textContent.replace(/\s+/g, " ").trim());
  assert.equal(cards.length, 2);
  assert.match(cards[0], /^Khorne/);
  assert.match(cards[1], /^Nurgle/);
  assert.equal(cards.filter((card) => card.includes("✓ The better of the two now")).length, 1, cards.join(" | "));
  assert.match(cards[0], /Khorngor × 30,000/);
  // Slaanesh: no troop owned
  page.untick("#xy-y-alignment-nurgle");
  page.tick("#xy-y-alignment-slaanesh");
  page.click("#optimiser-xy-run");
  assert.match(page.text("#opt-panel-xy"), /Slaanesh None of your troops owned fits this aim\./);
});
