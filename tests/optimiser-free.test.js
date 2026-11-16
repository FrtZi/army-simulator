// The best army with no aim is never below an aimed one (SIM-12, DEF-054, D-49): every army an aim allows, the search
// with no aim allows too. In Node on a made-up score, where a hero triples his god's troops: the troops worth most
// alone are another god's, so the search filled with them first kept the wrong hero.
import { test } from "node:test";
import assert from "node:assert/strict";
import { optimise } from "../src/engine/index.js";

// worth per place alone; the "b" hero triples the "b" troops, the "a" hero adds a tenth to the "a" troops
const WORTH = { a1: 3, a2: 3, b1: 2, b2: 2 };
const BOOST = { a: { a: 1.1 }, b: { b: 3 } };
const score = ({ troops, heroes }) =>
  Object.entries(troops).reduce((total, [id, count]) => {
    const boost = heroes.reduce((most, { id: hero }) => Math.max(most, BOOST[hero][id[0]] ?? 1), 1);
    return total + count * WORTH[id] * boost;
  }, 0);
const owned = Object.keys(WORTH).map((id) => [id, 500]);
const heroes = [
  { id: "a", level: 1 },
  { id: "b", level: 1 },
];
// one hero per army and one trio kept: the search keeps only the hero its first fill favours
const settings = { width: 1, settled: 1, slices: 10, rounds: 20, heroesPerArmy: 1, talentsPerArmy: 0 };
const groups = [
  ["a1", "a2"],
  ["b1", "b2"],
];

test("SIM-12 DEF-054 the best with no aim scores at least the best aimed at each god", () => {
  const run = (troops, extra = {}) =>
    optimise({ owned: troops, capacity: 1000, heroes, offered: () => [], score, settings, ...extra });
  const free = run(owned, { groups });
  for (const group of groups) {
    const aimed = run(owned.filter(([id]) => group.includes(id)));
    assert.ok(free.score >= aimed.score, `free ${free.score} below ${group.join("+")} ${aimed.score}`);
  }
  // the "b" army led by its hero: 1,000 × 2 × 3
  assert.equal(free.score, 6000);
  assert.deepEqual(free.composition.heroes, [{ id: "b", level: 1 }]);
});
