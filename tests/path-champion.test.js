// The path's champion steps (SIM-12, D-44): each piece worn one level up, each piece of an empty slot put on, both as
// the forge allows; each skill one level up with its requirements held and a point free. In Node on a worked case,
// then on the published page in jsdom with Your setup's champion.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gearSteps, skillSteps } from "../src/engine/index.js";
import { openPage } from "./page.js";

const piece = (id, slot, levels, forge) => ({
  id,
  slot,
  costs: { iron: Array(levels).fill(1) },
  ...(forge && { requires: { structure: { forge: [forge, ...Array(levels - 1).fill(null)] } } }),
});
const pieces = [
  piece("helm", "head", 3),
  piece("crown", "head", 3),
  piece("blade", "weapon", 2, 10),
  piece("top", "chest", 2),
];

test("SIM-12 the gear steps: a piece worn one level up below its last, a piece of an empty slot put on if forged", () => {
  const gear = [
    { id: "helm", level: 1 },
    { id: "top", level: 2 },
  ];
  const steps = (forge) =>
    gearSteps(gear, pieces, new Map([["forge", forge]])).map(({ id, from, to }) => [id, from, to]);
  // the head is filled: no crown; the top is at its last level; the blade asks the forge at 10
  assert.deepEqual(steps(9), [["helm", 1, 2]]);
  assert.deepEqual(steps(10), [
    ["helm", 1, 2],
    ["blade", 0, 1],
  ]);
});

const tree = (id, points, skills) => ({ id, points, skills });
const trees = [
  tree("champion", "skillPoints", [
    { id: "a", max: 2 },
    { id: "b", max: 5, requires: { a: 2 } },
    { id: "c", gives: { bonus: [1, 2, 3] } },
  ]),
  tree("conquest", "monsterSkillPoints", [{ id: "d", max: 1 }]),
];

test("SIM-12 the skill steps: below its last, its requirements held, in a tree with a point free", () => {
  const steps = (held, points) =>
    skillSteps(trees, new Map(Object.entries(held)), (each) => points[each.id]).map(({ id, from, to }) => [
      id,
      from,
      to,
    ]);
  // a at its max; b asks a at 2, held; c's last known level is 3; the conquest tree has no point free
  assert.deepEqual(steps({ a: 2, c: 1 }, { champion: 4, conquest: 0 }), [
    ["b", 0, 1],
    ["c", 1, 2],
  ]);
  assert.deepEqual(
    steps({ a: 1 }, { champion: 4, conquest: 1 }),
    [
      ["a", 1, 2],
      ["c", 0, 1],
      ["d", 0, 1],
    ],
    "b waits for a at 2",
  );
  assert.deepEqual(steps({ a: 2, c: 2 }, { champion: 4, conquest: 0 }), [], "4 points, 4 spent");
});

const GAME = "chaos-conquest";
const champion = JSON.parse(readFileSync(new URL("../data/chaos-conquest/champion.json", import.meta.url), "utf8"));
const setup = {
  format: "army-simulator/setup",
  version: 1,
  game: GAME,
  capacity: { base: 50000 },
  warlords: [{ id: "bloodthirster", rank: 4, level: 5 }],
  troops: [{ id: "khorngor", count: 50000 }],
  buildings: [{ id: "daemonic-forge", level: 32 }],
  champion: { level: 40, gear: [{ id: "armour-of-damnation", level: 2 }], skills: [{ id: "keen-blades-i", level: 3 }] },
};

test("SIM-12 on the page: the champion's pieces in the path, the one worn raised, the empty slots' put on", () => {
  const page = openPage({ stored: { "army-simulator.player-setup": JSON.stringify({ [GAME]: setup }) } });
  page.tick("#load-setup-toggle");
  page.click("#optimiser-run");
  const steps = page.$$("#optimiser-path li").map((step) => step.textContent);
  assert.ok(
    steps.some((step) => /^Gear Armour of Damnation: level 2 → 3 · ▲ \+[\d.]+ % · costs /.test(step)),
    steps.join("\n"),
  );
  assert.ok(
    steps.some((step) => /^Put on .+ at level 1 · ▲ /.test(step)),
    "an empty slot's piece",
  );
  // the chest is worn: no other chest piece is put on
  const chests = champion.pieces.filter((each) => each.slot === "chest" && each.id !== "armour-of-damnation");
  assert.ok(!steps.some((step) => chests.some((each) => step.startsWith(`Put on ${each.labels.en} `))));
});
