// The path (SIM-12, D-42): each hero to get or raise, by its gain on the army found, the most first. In Node on a
// worked case whose gains are counted by hand, then on the published page in jsdom, with Your setup loaded.
import { test } from "node:test";
import assert from "node:assert/strict";
import { bestWithHero, heroPath, heroSteps } from "../src/engine/index.js";
import { openPage } from "./page.js";

// a worked case: a hero adds its weight × its level, talents and troops add nothing
const WEIGHT = { a: 1, b: 2, c: 3, d: 10, e: 0.1, f: 0.5 };
const score = ({ heroes }) => heroes.reduce((sum, { id, level }) => sum + WEIGHT[id] * level, 0);
const options = { score, offered: () => [], heroesPerArmy: 3, talentsPerArmy: 4 };
const army = (heroes) => {
  const composition = { troops: {}, heroes, talents: [] };
  return { composition, score: score(composition) };
};
const at5 = (...ids) => ids.map((id) => ({ id, level: 5 }));

test("SIM-12 the hero steps: one not owned got at level 1, one owned raised by a level, none past the top", () => {
  const owned = new Map([
    ["a", 5],
    ["b", 35],
  ]);
  assert.deepEqual(heroSteps(["a", "b", "c"], owned, 35), [
    { kind: "hero", id: "a", from: 5, to: 6 },
    { kind: "hero", id: "c", from: 0, to: 1 },
  ]);
});

test("SIM-12 the path: each step's gain counted by hand, the most first, those that add nothing left out", () => {
  const found = army(at5("a", "b", "c")); // 5 + 10 + 15 = 30
  const owned = new Map(Object.entries({ a: 5, b: 5, c: 5, f: 5 }));
  const path = heroPath(found, heroSteps(Object.keys(WEIGHT), owned, 35), options).filter(({ gain }) => gain > 0);
  assert.deepEqual(
    path.map(({ id, gain }) => [id, Math.round(gain * 10) / 10]),
    [
      ["d", 5], // got at level 1 in place of a: 10 + 10 + 15 = 35
      ["c", 3], // c raised to 6: +3
      ["b", 2],
      ["a", 1],
    ],
    "e (0.1 at level 1) and f (0.5 × 6 < a's 5) add nothing",
  );
  assert.deepEqual(path[0].composition.heroes, [{ id: "d", level: 1 }, ...at5("b", "c")]);
});

test("SIM-12 a hero owned is judged at its own level too: its gain is its next level's, not a trio missed", () => {
  // an army found without c, though c at its own level 5 would already do better than f
  const found = army(at5("a", "b", "f")); // 5 + 10 + 2.5 = 17.5
  const [step] = heroPath(found, [{ kind: "hero", id: "c", from: 5, to: 6 }], options);
  assert.equal(bestWithHero(found.composition, { id: "c", level: 5 }, options).score, 30);
  assert.equal(step.gain, 3, "33 with c at 6, against 30 with c at 5: the level adds 3, not 15.5");
});

const GAME = "chaos-conquest";
const setup = {
  format: "army-simulator/setup",
  version: 1,
  game: GAME,
  capacity: { base: 50000 },
  // level 20: rank 4, level 5, as a setup file says it
  warlords: ["bloodthirster", "chaos-lord-of-khorne", "great-unclean-one", "doom-knight"].map((id) => ({
    id,
    rank: 4,
    level: 5,
  })),
  troops: [
    { id: "khorngor", count: 30000 },
    { id: "pestigor", count: 30000 },
    { id: "khorne-gor", count: 20000 },
  ],
};

test("SIM-12 on the page: the path under the army found, each step with its gain and its cost", () => {
  const page = openPage({ stored: { "army-simulator.player-setup": JSON.stringify({ [GAME]: setup }) } });
  page.tick("#load-setup-toggle");
  page.click("#optimiser-run");
  assert.match(page.text("#opt-panel-up"), /The path: what to get or raise next/);
  const steps = page.$$("#optimiser-path li").map((step) => step.textContent);
  assert.ok(steps.length > 0 && steps.length <= 10, `${steps.length} steps`);
  // a hero of the army found, raised: its talents raise the army's Khorne and Nurgle troops
  assert.match(
    steps[0],
    /^Raise (Chaos Lord of Khorne on Dragon|Great Unclean One|Bloodthirster) from level 20 to 21 · ▲ \+[\d.]+ % · costs [\d,]+ /,
  );
  // "▲ +1.2 %", or "▲ < 0.1 %" for a gain one decimal would round to 0
  const gains = steps.map((step) => Number(step.match(/▲ (?:\+([\d.]+)|< 0\.1) %/)[1] ?? 0.05));
  assert.deepEqual(
    gains,
    [...gains].sort((x, y) => y - x),
    "the most first",
  );
});
