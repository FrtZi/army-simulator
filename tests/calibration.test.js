// The calibration (SIM-04, docs/spec/calibration.md): the gaps and the fit on figures made up for the test, a
// fictitious report replayed end to end, calibration.json against the data it names; then the real reports, which
// stay on the author's computer (captures/): without them, as in the CI, that test is skipped.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gapsOf, replayFigures, reportFigures, scoreOf, withinNoise } from "../src/calibration/measures.js";
import { candidatesOf, fit, withValue } from "../src/calibration/fit.js";
import { REPORT_FORMAT, REPORT_VERSION, armiesOf, replay, reportProblems } from "../scripts/replay.mjs";
import { backtest, calibrationOf, reportsOf } from "../scripts/backtest.mjs";

const GAME = "chaos-conquest";
const calibration = calibrationOf(GAME);
const { settings } = calibration;
const read = (file) => JSON.parse(readFileSync(new URL(`../data/${GAME}/${file}`, import.meta.url), "utf8"));
const MEASURES = ["enemyDead", "yourDead", "yourPowerLost", "yourDeadByTroop"];

// a battle as the engine returns it, reduced to what the measures read: two troops and a hero on one side
const group = (id, count, hero = false) => ({ id, count, hero });
const BATTLE = {
  deployed: { attacker: [group("a", 100), group("b", 50), group("h", 1, true)], defender: [group("x", 200)] },
  survivors: { attacker: [group("a", 70), group("b", 50), group("h", 1, true)], defender: [group("x", 20)] },
  powerLost: { attacker: 300 },
};
const REPORT = { figures: { attacker: { lost: { a: 30, b: 0 }, powerLost: 300 }, defender: { lost: { x: 180 } } } };

test("SIM-04 a replay's figures read as a report's: the dead on both sides, troop by troop, heroes left out", () => {
  const figures = { enemyDead: 180, yourDead: 30, yourPowerLost: 300, yourDeadByTroop: { a: 30, b: 0 } };
  assert.deepEqual(replayFigures(BATTLE), figures);
  assert.deepEqual(reportFigures(REPORT), figures);
});

test("SIM-04 a gap is a log ratio: none when the replay matches, log 2 for twice the dead, the noise from the table", () => {
  const actual = reportFigures(REPORT);
  const same = gapsOf(actual, actual, settings);
  assert.deepEqual(Object.values(same), [0, 0, 0, 0]);
  assert.equal(scoreOf(same, settings), 0);
  const offset = settings.countOffset;
  const twice = gapsOf({ ...actual, enemyDead: 2 * (180 + offset) - offset }, actual, settings);
  assert.ok(Math.abs(twice.enemyDead - Math.log(2)) < 1e-12);
  assert.ok(scoreOf(twice, settings) > 0);
  const noise = settings.noiseGapPercent.value / 100;
  assert.equal(withinNoise(Math.log1p(noise * 0.99), settings), true);
  assert.equal(withinNoise(Math.log1p(noise * 1.01), settings), false);
});

test("SIM-04 the candidates: a list as given, a range walked by its step; the rules changed on a copy", () => {
  assert.deepEqual(
    candidatesOf({ candidates: { from: 0, to: 50, step: 25 } }).map(({ value }) => value),
    [0, 25, 50],
  );
  assert.deepEqual(candidatesOf({ candidates: null }), []);
  const rules = { model: { tierFactors: { 0: 1 } } };
  assert.deepEqual(withValue(rules, "model.tierFactors", { 0: 2 }), { model: { tierFactors: { 0: 2 } } });
  assert.deepEqual(rules, { model: { tierFactors: { 0: 1 } } });
});

// reports whose true value is known: the fit finds it, and keeps it only out of sample and with enough reports
const truth = (values) => values.map((value, index) => ({ value, index }));
const distance = (report, value) => (value - report.value) ** 2;
const RANGE = { candidates: { from: 0, to: 100, step: 25 } };

test("SIM-04 the fit finds the value the reports hold, kept only if it holds out of sample", () => {
  const six = truth([50, 50, 50, 50, 25, 75]);
  const found = fit(RANGE, 0, six, distance, settings);
  assert.equal(found.best.value, 50);
  assert.ok(found.outOfSample < found.now);
  assert.equal(found.verdict, "fitted");
  assert.equal(fit(RANGE, 0, six.slice(0, 3), distance, settings).verdict, "better, too few reports");
  assert.equal(fit(RANGE, 50, six, distance, settings).verdict, "no better");
  assert.equal(fit(RANGE, 0, six.slice(0, 1), distance, settings).verdict, "too few reports");
});

// a fictitious report: a few troops of ours against a PvE place, no setup file
const FICTITIOUS = {
  format: REPORT_FORMAT,
  version: REPORT_VERSION,
  game: GAME,
  date: "2026-01-01",
  setup: null,
  target: { place: "army-rank-10-frostheart-phoenix-event", troops: null },
  army: { troops: { khorngor: 20000, "tzeentch-gor": 5000 }, heroes: [], talents: [] },
};

test("SIM-04 a report replayed as the page plays it: its own figures score none, a wrong place or troop refused", () => {
  const armies = armiesOf(FICTITIOUS, null);
  const figures = replayFigures(replay(armies));
  assert.ok(figures.enemyDead > 0 && figures.yourDead > 0);
  const attacker = { lost: figures.yourDeadByTroop, powerLost: figures.yourPowerLost };
  const defender = { lost: { "elf-monstrous-beasts-tier-5": figures.enemyDead } };
  const report = { ...FICTITIOUS, figures: { attacker, defender } };
  assert.equal(backtest({ report, armies }, settings).score, 0);
  const wrong = { ...FICTITIOUS, target: { place: "nowhere" }, army: { troops: { nobody: 1 } } };
  assert.deepEqual(reportProblems(wrong), ['no PvE place "nowhere"', 'no troop "nobody"']);
});

test("SIM-04 calibration.json names what exists: combat rules keys, PvE places, measures, one order each", () => {
  const rules = read("combat-rules.json");
  const places = new Set(read("pve.json").places.map(({ id }) => id));
  for (const { id, combatRulesKey } of calibration.parameters.filter((entry) => entry.combatRulesKey)) {
    const value = combatRulesKey.split(".").reduce((node, step) => node?.[step], rules);
    assert.notEqual(value, undefined, `${id}: no "${combatRulesKey}" in combat-rules.json`);
  }
  for (const { place } of settings.suggestedTargets) assert.ok(places.has(place), `no PvE place "${place}"`);
  assert.deepEqual(settings.measures.map(({ id }) => id).sort(), [...MEASURES].sort());
  const orders = calibration.parameters.map(({ order }) => order);
  assert.equal(new Set(orders).size, orders.length);
});

test("SIM-04 every battle report kept replays, its gaps shown", { skip: reportsOf(calibration).length === 0 }, (t) => {
  for (const entry of reportsOf(calibration)) {
    const { score } = backtest(entry, settings);
    t.diagnostic(`${entry.report.date} ${entry.report.target.place}: score ${score.toFixed(4)}`);
    assert.ok(Number.isFinite(score));
  }
});
