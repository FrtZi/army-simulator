// Defects register: checks docs/defects.toml and generates its readable page, docs/defects.md.
//
// Ported from the shared format of our other repos (defects-format.mjs). Fails if an entry is incomplete, if a
// value is outside the lists, if the entries do not follow each other (DEF-001, DEF-002… in date order), if a
// proof file is missing or does not name its defect, or if a link is neither a commit nor a catalogue feature.
// Run by `npm run check` (git hook and CI).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parse } from "smol-toml";
import { catalogueFeatures } from "./catalogue.mjs";
import { page } from "./defects-page.mjs";
import { COMMIT, LISTS, OPTIONAL, REQUIRED, SEVERITIES, STATED_PROOF, STATUSES } from "./defects-format.mjs";
import { TAGS, TYPES, isoDate } from "./defects-format.mjs";

const root = new URL("../", import.meta.url);
const SOURCE = new URL("docs/defects.toml", root);
const PAGE = new URL("docs/defects.md", root);

const today = () => new Date().toLocaleDateString("sv"); // YYYY-MM-DD, local time

function checkValues(defect, number, previousDate) {
  const problems = [];
  const expected = `DEF-${String(number).padStart(3, "0")}`;
  if (defect.id !== expected) problems.push(`identifier expected ${expected} (entries follow each other)`);
  const date = isoDate(defect.date);
  if (!date || date > today()) problems.push("date missing from the calendar or in the future");
  else if (previousDate && date < previousDate) problems.push("date before the previous entry's");
  const lists = [
    ["type", TYPES],
    ["gravite", SEVERITIES],
    ["statut", Object.keys(STATUSES)],
  ];
  for (const [key, allowed] of lists) {
    if (!allowed.includes(defect[key])) problems.push(`${key} "${defect[key]}" outside: ${allowed.join(", ")}`);
  }
  return problems.concat(defect.etiquettes.filter((tag) => !TAGS.includes(tag)).map((tag) => `tag "${tag}" unknown`));
}

function checkReferences(defect, features) {
  const problems = [];
  for (const proof of defect.preuve) {
    if (STATED_PROOF.test(proof)) continue;
    const file = new URL(proof, root);
    if (!existsSync(file)) problems.push(`proof "${proof}": file not found`);
    else if (!readFileSync(file, "utf8").includes(defect.id)) problems.push(`proof "${proof}" does not name it`);
  }
  if (!defect.preuve.length && defect.statut !== "open") problems.push("no proof: a settled defect has one");
  for (const link of defect.liens ?? []) {
    if (!COMMIT.test(link) && !features.has(link)) problems.push(`link "${link}": no commit, no feature`);
  }
  return problems;
}

/** What is wrong with an entry (empty when it is complete and consistent). */
export function checkDefect(defect, number, previousDate, features) {
  let problems = REQUIRED.filter((key) => !(key in defect)).map((key) => `field "${key}" missing`);
  problems.push(
    ...Object.keys(defect)
      .filter((key) => ![...REQUIRED, ...OPTIONAL].includes(key))
      .map((key) => `field "${key}" unknown`),
  );
  problems.push(
    ...LISTS.filter((key) => key in defect && !Array.isArray(defect[key])).map((key) => `${key}: not a list`),
  );
  if (!problems.length) problems = checkValues(defect, number, previousDate).concat(checkReferences(defect, features));
  return problems.map((problem) => `${defect.id ?? `entry #${number}`}: ${problem}`);
}

function main() {
  const defects = parse(readFileSync(SOURCE, "utf8")).defaut ?? [];
  const features = new Set(catalogueFeatures().map((feature) => feature.id));
  const problems = [];
  let previous = null;
  defects.forEach((defect, index) => {
    problems.push(...checkDefect(defect, index + 1, previous, features));
    previous = isoDate(defect.date) ?? previous;
  });
  if (!problems.length) {
    const expected = page(defects);
    if (!existsSync(PAGE) || readFileSync(PAGE, "utf8") !== expected) {
      writeFileSync(PAGE, expected);
      problems.push("docs/defects.md was out of date: regenerated, `git add` it and retry");
    }
  }
  for (const problem of problems) console.error(`✗ ${problem}`);
  if (!problems.length) console.log(`✓ ${defects.length} defects, register and page aligned`);
  return problems.length ? 1 : 0;
}

// run as a script (npm run defects); imported by the tests, it only exports
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = main();
}
