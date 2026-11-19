// The calibration's backtest (SIM-04, docs/spec/calibration.md), on the author's computer: every battle report of
// captures/ replayed by the engine, each measure's gap shown; with --fit <parameter>, that parameter of
// data/<game>/calibration.json fitted out of sample. It reads; it writes nothing: a value fitted goes into
// combat-rules.json by hand, with its decision.
//   node scripts/backtest.mjs [--game chaos-conquest] [--fit tier-modifier]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { armiesOf, loadReports, replay } from "./replay.mjs";
import { gapsOf, replayFigures, reportFigures, scoreOf, withinNoise } from "../src/calibration/measures.js";
import { fit, withValue } from "../src/calibration/fit.js";

const ROOT = new URL("../", import.meta.url);

/** A game's calibration table (data/<game>/calibration.json). */
export const calibrationOf = (game) => JSON.parse(readFileSync(new URL(`data/${game}/calibration.json`, ROOT), "utf8"));

/** The reports a calibration table points to, each with both sides built once. */
export const reportsOf = (calibration) =>
  loadReports(fileURLToPath(new URL(calibration.reports, ROOT))).map(({ report, setupFile }) => ({
    report,
    armies: armiesOf(report, setupFile),
  }));

/** One report's gaps and score, with the combat rules given. */
export function backtest({ report, armies }, settings, rules) {
  const predicted = replayFigures(replay(armies, rules));
  const actual = reportFigures(report);
  const gaps = gapsOf(predicted, actual, settings);
  return { predicted, actual, gaps, score: scoreOf(gaps, settings) };
}

const percent = (gap) => `${Math.expm1(gap) >= 0 ? "+" : ""}${(Math.expm1(gap) * 100).toFixed(1)} %`;
const count = (value) => (typeof value === "number" ? Math.round(value).toLocaleString("en-GB") : "by troop");

function printBacktest(reports, settings) {
  for (const entry of reports) {
    const { predicted, actual, gaps, score } = backtest(entry, settings);
    console.log(`\n${entry.report.date} · ${entry.report.target.place} · score ${score.toFixed(4)}`);
    for (const { id } of settings.measures) {
      const state = withinNoise(gaps[id], settings) ? "✓ within noise" : "✗ off";
      console.log(
        `  ${id.padEnd(16)} ${count(predicted[id]).padStart(12)} ${count(actual[id]).padStart(12)}  ${percent(gaps[id]).padStart(9)}  ${state}`,
      );
    }
  }
}

function printFit(reports, calibration, id) {
  const parameter = calibration.parameters.find((entry) => entry.id === id);
  if (!parameter?.combatRulesKey) throw new Error(`"${id}" is not a parameter the fit can try (calibration.json)`);
  const { rules } = reports[0].armies.game;
  const current = parameter.combatRulesKey.split(".").reduce((node, step) => node[step], rules);
  const scoreFor = (entry, value) =>
    backtest(entry, calibration.settings, withValue(rules, parameter.combatRulesKey, value)).score;
  const result = fit(parameter, current, reports, scoreFor, calibration.settings);
  console.log(`\n${id} on ${reports.length} report(s): today ${result.now.toFixed(4)}`);
  if (result.best) {
    console.log(
      `  best "${result.best.name}": ${result.inSample.toFixed(4)} on all, ${result.outOfSample.toFixed(4)} out of sample`,
    );
  }
  console.log(`  verdict: ${result.verdict}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { values } = parseArgs({
    options: { game: { type: "string", default: "chaos-conquest" }, fit: { type: "string" } },
  });
  const calibration = calibrationOf(values.game);
  const reports = reportsOf(calibration);
  if (!reports.length) console.log(`No battle report in ${calibration.reports}: nothing to replay.`);
  else if (values.fit) printFit(reports, calibration, values.fit);
  else printBacktest(reports, calibration.settings);
}
