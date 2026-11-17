// The best army with no aim is never below an aimed one (SIM-12, DEF-054, D-49): every army an aim allows, the search
// with no aim allows too. In Node on a made-up score, where a hero triples his god's troops: the troops worth most
// alone are another god's, so the search filled with them first kept the wrong hero.
import { test } from "node:test";
import assert from "node:assert/strict";
import { optimise, settle } from "../src/engine/index.js";

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

// DEF-058: settled again with other talents, an army kept troops beyond the capacity they left it
test("SIM-26 DEF-058 settled again, an army keeps no more troops than its talents' capacity gives", () => {
  const talents = { cap: 50 }; // "cap" raises the capacity by 50 places; "atk" lifts every troop by a fifth
  const capacity = ({ talents: chosen = [] }) => 100 + chosen.reduce((sum, id) => sum + (talents[id] ?? 0), 0);
  const judge = ({ troops, talents: chosen = [] }) =>
    Object.values(troops).reduce((sum, count) => sum + count, 0) * (chosen.includes("atk") ? 1.2 : 1);
  const composition = { troops: { x: 150 }, heroes: [], talents: ["cap"] };
  const done = settle(composition, {
    owned: [["x", 500]],
    capacity,
    offered: () => [
      { id: "cap", percent: 1 },
      { id: "atk", percent: 1 },
    ],
    score: judge,
    slices: 10,
    rounds: 20,
    talentsPerArmy: 1,
  });
  // "cap": 150 troops, 150; "atk": 100 troops × 1.2, 120: the capacity talent stays, and the troops fit
  assert.deepEqual(done.composition.talents, ["cap"]);
  assert.ok(done.composition.troops.x <= capacity(done.composition), JSON.stringify(done.composition));
  assert.equal(done.score, 150);
});
