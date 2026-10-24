// Product backlog: checks docs/backlog.toml and generates its readable page, docs/backlog.md.
//
// Built on the defects register's pattern, ported from Portfolio Advisor. Fails if an item is incomplete, a
// value is outside the lists, the identifiers do not follow each other, a dependency is unknown, circular, in
// a later milestone or (for a Must) of lower priority, a status disagrees with its to-do list or its
// dependencies, or a feature is missing from the catalogue. Run by `npm run check` (git hook and CI).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parse } from "smol-toml";
import { catalogueFeatures } from "./catalogue.mjs";
import { CROSS_CUTTING, MODULES, MOSCOW, SYMBOLS, page } from "./backlog-page.mjs";

const root = new URL("../", import.meta.url);
const SOURCE = new URL("docs/backlog.toml", root);
const PAGE = new URL("docs/backlog.md", root);
const STATUSES = Object.keys(SYMBOLS);
const REQUIRED = ["id", "title", "moscow", "milestone", "module", "status", "added", "tasks"];
const OPTIONAL = ["depends_on", "features", "note"];
const TASK = /^\[[ x]\] \S/;
const today = () => new Date().toLocaleDateString("sv"); // YYYY-MM-DD, local time
const isDate = (value) => value instanceof Date && value.isDate?.();

/** The status says what the to-do list shows: nothing ticked, some, or all. */
function statusProblems(item) {
  const done = item.tasks.filter((task) => task.startsWith("[x]")).length;
  if (item.status === "done" && done < item.tasks.length) return ["done, but tasks remain unticked"];
  if (item.status === "to do" && done) return ["to do, but tasks are ticked (doing?)"];
  if (item.status === "doing" && done === item.tasks.length) return ["every task is ticked (done?)"];
  return [];
}

/** What is wrong with one item on its own (empty when it is complete and consistent). */
export function checkItem(item, number, known) {
  const fields = [...REQUIRED, ...OPTIONAL];
  const problems = REQUIRED.filter((key) => !(key in item)).map((key) => `field "${key}" missing`);
  problems.push(
    ...Object.keys(item)
      .filter((key) => !fields.includes(key))
      .map((key) => `field "${key}" unknown`),
  );
  if (problems.length) return problems;
  const expected = `BL-${String(number).padStart(2, "0")}`;
  if (item.id !== expected) problems.push(`identifier expected ${expected} (items follow each other)`);
  if (!isDate(item.added) || item.added.toISOString().slice(0, 10) > today()) {
    problems.push("added: not a date, or in the future");
  }
  for (const [key, allowed] of [
    ["moscow", MOSCOW],
    ["status", STATUSES],
    ["milestone", known.milestones],
  ]) {
    if (!allowed.includes(item[key])) problems.push(`${key} "${item[key]}" outside: ${allowed.join(", ")}`);
  }
  if (!known.modules.includes(item.module)) {
    problems.push(`module "${item.module}" outside: ${known.modules.join(", ")}`);
  }
  if (!Array.isArray(item.tasks) || !item.tasks.length) {
    return problems.concat("no task: the to-do list says what is left");
  }
  problems.push(
    ...item.tasks.filter((task) => !TASK.test(task)).map((task) => `task "${task}": expected "[ ] …" or "[x] …"`),
  );
  problems.push(
    ...(item.features ?? []).filter((id) => !known.features.has(id)).map((id) => `feature ${id} not in the catalogue`),
  );
  return problems.length ? problems : statusProblems(item);
}

/** One dependency: never planned after the item, never weaker than a Must, done before the item is. */
function dependencyProblems(item, other, milestones) {
  const problems = [];
  if (milestones.indexOf(other.milestone) > milestones.indexOf(item.milestone)) {
    problems.push(`depends on ${other.id}, planned later`);
  }
  if (item.moscow === "must" && other.moscow !== "must") {
    problems.push(`a Must depending on ${other.id}, a ${other.moscow}`);
  }
  if (item.status === "done" && other.status !== "done") problems.push(`done, but ${other.id} is not`);
  return problems;
}

/** Whether following the dependencies from `start` leads back to it. */
function cycleFrom(start, byId) {
  const seen = new Set();
  const stack = [...(byId.get(start).depends_on ?? [])];
  while (stack.length) {
    const current = stack.pop();
    if (current === start) return true;
    if (byId.has(current) && !seen.has(current)) {
      seen.add(current);
      stack.push(...(byId.get(current).depends_on ?? []));
    }
  }
  return false;
}

export function checkDependencies(items, milestones) {
  const byId = new Map(items.map((item) => [item.id, item]));
  return items.flatMap((item) => {
    const problems = (item.depends_on ?? []).flatMap((id) =>
      byId.has(id) ? dependencyProblems(item, byId.get(id), milestones) : [`depends on ${id}, unknown`],
    );
    if (cycleFrom(item.id, byId)) problems.push("circular dependency");
    return problems.map((problem) => `${item.id}: ${problem}`);
  });
}

/** Every problem of the backlog: each item on its own, then (if they are sound) their dependencies. */
export function backlogProblems(backlog, features) {
  const milestones = (backlog.milestone ?? []).map((milestone) => milestone.code);
  const known = { milestones, modules: [...Object.keys(MODULES), CROSS_CUTTING], features };
  const items = backlog.item ?? [];
  const problems = items.flatMap((item, index) =>
    checkItem(item, index + 1, known).map((problem) => `${item.id ?? `item #${index + 1}`}: ${problem}`),
  );
  return problems.length ? problems : checkDependencies(items, milestones);
}

function main() {
  const backlog = parse(readFileSync(SOURCE, "utf8"));
  const problems = backlogProblems(backlog, new Set(catalogueFeatures().map((feature) => feature.id)));
  if (!problems.length) {
    const expected = page(backlog.milestone, backlog.item);
    if (!existsSync(PAGE) || readFileSync(PAGE, "utf8") !== expected) {
      writeFileSync(PAGE, expected);
      problems.push("docs/backlog.md was out of date: regenerated, `git add` it and retry");
    }
  }
  for (const problem of problems) console.error(`✗ ${problem}`);
  if (!problems.length) console.log(`✓ ${backlog.item.length} backlog items, source and page aligned`);
  return problems.length ? 1 : 0;
}

// run as a script (npm run backlog); imported by the tests, it only exports
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = main();
}
