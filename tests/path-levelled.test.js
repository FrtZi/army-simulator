// The path's rituals and buildings (SIM-12, D-43): each one level up from the levels held, what it asks first across
// both kinds; only the steps that can be done now are judged. In Node on a small worked tree, then on the published
// page in jsdom with Your setup loaded.
import { test } from "node:test";
import assert from "node:assert/strict";
import { levelledSteps, missingFor } from "../src/engine/index.js";
import { openPage } from "./page.js";

// a worked tree: ritual b asks ritual a at 2; ritual a asks the building s (2 at level 1, 3 at level 2); s asks k at 1
const entry = (id, levels, requires) => ({ id, power: Array(levels).fill(1), ...(requires && { requires }) });
const entries = {
  ritual: new Map([
    ["a", entry("a", 3, { structure: { s: [2, 3, 3] } })],
    ["b", entry("b", 2, { ritual: { a: [2, null] } })],
    ["done", entry("done", 1)],
  ]),
  structure: new Map([
    ["s", entry("s", 5, { structure: { k: [1, 1, 1, 1, 1] } })],
    ["k", entry("k", 5)],
  ]),
};
const held = {
  ritual: new Map([["done", 1]]),
  structure: new Map([
    ["s", 2],
    ["k", 1],
  ]),
};

test("SIM-12 what a level asks that is not held, across rituals and buildings, the roots first", () => {
  assert.deepEqual(missingFor(entries, held, "ritual", "b", 1), [
    { kind: "structure", id: "s", from: 2, level: 3 }, // a at 2 asks s at 3
    { kind: "ritual", id: "a", from: 0, level: 2 },
  ]);
  assert.deepEqual(missingFor(entries, held, "ritual", "a", 1), [], "s at 2 is held");
});

test("SIM-12 each ritual and building one level up, below its last, with what it asks first", () => {
  const steps = levelledSteps(entries, held, { ritual: ["a", "b", "done"], structure: ["s"] });
  assert.deepEqual(
    steps.map(({ kind, id, from, to, first }) => [kind, id, from, to, first.length]),
    [
      ["ritual", "a", 0, 1, 0],
      ["ritual", "b", 0, 1, 2],
      ["structure", "s", 2, 3, 0],
    ],
    "done is at its last level",
  );
});

const GAME = "chaos-conquest";
const setup = {
  format: "army-simulator/setup",
  version: 1,
  game: GAME,
  capacity: { base: 50000 },
  warlords: [{ id: "bloodthirster", rank: 4, level: 5 }],
  troops: [{ id: "khorngor", count: 50000 }],
  rituals: [{ id: "brutal-strength", level: 1 }],
  buildings: [
    { id: "sorcerers-citadel", level: 20 },
    { id: "chaos-keep", level: 15 },
    { id: "temple-of-khorne", level: 3 },
  ],
};

test("SIM-12 on the page: rituals and buildings one level up in the path, those that can be done now only", () => {
  const page = openPage({ stored: { "army-simulator.player-setup": JSON.stringify({ [GAME]: setup }) } });
  page.tick("#load-setup-toggle");
  page.click("#optimiser-run");
  const steps = page.$$("#optimiser-path li").map((step) => step.textContent);
  // Brutal Strength raises Khorne's melee attack; its level 2 asks the Sorcerer's Citadel at 12, held at 20
  const ritual = steps.find((step) => step.startsWith("Ritual Brutal Strength: level 1 → 2"));
  assert.match(ritual ?? steps.join("\n"), /· ▲ \+[\d.]+ % · costs [\d,]+ /);
  // the Herdstone raises every troop's health, its level 1 asking the Chaos Keep at 15, held
  assert.ok(
    steps.some((step) => /^Beastmen Herdstone: level 0 → 1 · ▲ < 0\.1 % · costs /.test(step)),
    steps.join("\n"),
  );
  // Brazen Cuirass asks Mindless Bloodlust at 3, not held: it waits for its prerequisites
  assert.ok(!steps.some((step) => step.includes("Brazen Cuirass")), steps.join("\n"));
});
