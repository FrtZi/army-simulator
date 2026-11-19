// A battle report replayed by the engine as the page plays it (SIM-04, docs/spec/calibration.md): the setup file of
// that day loaded, the army sent as a composition, the PvE place attacked as the second side. The reports stay on the
// author's computer (captures/, git-ignored); their format is in docs/data-model.md.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { GAMES_BY_ID } from "../src/ui/games.js";
import { readSetupFile } from "../src/storage/setup-file.js";
import { selectGame, state, summarise } from "../src/ui/state.js";
import { pveArmy, pveRaces } from "../src/ui/pve.js";
import { simulateBattle } from "../src/engine/index.js";

export const REPORT_FORMAT = "army-simulator/battle-report";
export const REPORT_VERSION = 1;

/** Why a report cannot be replayed (none when it can): its format, its game, its target, its troops. */
export function reportProblems(report) {
  if (report.format !== REPORT_FORMAT || report.version !== REPORT_VERSION) return ["not a battle report, version 1"];
  const game = GAMES_BY_ID[report.game];
  if (!game) return [`no game "${report.game}"`];
  const problems = [];
  if (!game.pve.places.some((place) => place.id === report.target.place)) {
    problems.push(`no PvE place "${report.target.place}"`);
  }
  for (const id of Object.keys(report.army.troops)) {
    if (!game.catalogue.units.has(id)) problems.push(`no troop "${id}"`);
  }
  return problems;
}

/** The setup file a report names, read against the game; refused values make the replay another battle. */
function setupOf(setupFile) {
  if (!setupFile) return null;
  const read = readSetupFile(setupFile, GAMES_BY_ID);
  if (read.problems.length) throw new Error(`the setup file is refused: ${JSON.stringify(read.problems)}`);
  return read.sections;
}

/**
 * Both sides of a report as the engine sees them, built once: the army sent with the setup of that day, and the place
 * attacked (its troops left when it was already hit, else all of them). `setupFile`: the parsed file, or null.
 */
export function armiesOf(report, setupFile) {
  const problems = reportProblems(report);
  if (problems.length) throw new Error(`the report of ${report.date} cannot be replayed: ${problems.join("; ")}`);
  const game = GAMES_BY_ID[report.game];
  selectGame(game.id);
  const sections = setupOf(setupFile);
  Object.assign(state, { useSetup: Boolean(sections), savedPlayerSetup: sections });
  const place = game.pve.places.find((entry) => entry.id === report.target.place);
  const troops = { ...(report.target.troops ?? place.troops) };
  state.pve = { ...state.pve, on: true, kind: place.kind, name: place.labels.en, level: place.level, troops };
  const { army } = report;
  const composition = { name: report.date, heroes: [], talents: [], ...army };
  return { attacker: summarise(composition, pveRaces(state, game)), defender: pveArmy(state, game), game };
}

/** A report's battle replayed with the combat rules given (the game's own when none). */
export const replay = ({ attacker, defender, game }, rules = game.rules) => simulateBattle(attacker, defender, rules);

/** The reports kept in a folder, each with its setup file (named relative to the folder); none when it is absent. */
export function loadReports(folder) {
  if (!existsSync(folder)) return [];
  const read = (file) => JSON.parse(readFileSync(join(folder, file), "utf8"));
  return readdirSync(folder)
    .filter((file) => file.endsWith(".json"))
    .map(read)
    .filter((file) => file.format === REPORT_FORMAT)
    .map((report) => ({ report, setupFile: report.setup ? read(report.setup) : null }));
}
