// PERF-01: a simulation answers in under 100 ms on a phone. Measured here on the worst case — every troop type
// of the game on both sides, both battles of a comparison, every chart's figures — against a quarter of that
// budget, a phone being taken as about four times slower than the computer running the tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compareArmies, efficiency, indexCatalogue, summariseArmy } from "../src/engine/index.js";

const read = (file) => JSON.parse(readFileSync(new URL(`../data/chaos-conquest/${file}`, import.meta.url), "utf8"));
const PHONE_BUDGET_MS = 100;
const PHONE_SLOWDOWN = 4;
const RUNS = 9;

test("PERF-01 the worst comparison and every chart's figures, well within a phone's 100 ms", () => {
  const [units, defences, rules] = ["units.json", "defences.json", "combat-rules.json"].map(read);
  const catalogue = indexCatalogue(units, defences);
  const everyTroop = Object.fromEntries(units.map((unit) => [unit.id, 100_000]));
  const effects = [{ stat: "meleeDamage", percent: 50 }];
  const durations = Array.from({ length: RUNS }, () => {
    const start = performance.now();
    const army = summariseArmy(everyTroop, catalogue, effects, { marchCapacity: 10_000_000 });
    compareArmies(army, army, rules);
    efficiency(units, effects, rules.model);
    return performance.now() - start;
  }).sort((a, b) => a - b);
  const median = durations[Math.floor(RUNS / 2)];
  assert.ok(median < PHONE_BUDGET_MS / PHONE_SLOWDOWN, `${median.toFixed(1)} ms on this computer`);
});
