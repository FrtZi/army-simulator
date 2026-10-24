// The product backlog's readable page (docs/backlog.md), written from docs/backlog.toml. Rendering only: the
// checker (backlog.mjs) runs first. Nothing here depends on today's date, so the page is the same wherever it
// is generated (the check compares it with the committed one). Ported from Portfolio Advisor's backlog page.

export const MOSCOW = ["must", "should", "could", "won't"];
export const SYMBOLS = { done: "✓", doing: "◐", "to do": "○" }; // the symbol goes with the label, never alone
export const MODULES = { data: "../data", engine: "../src/engine", storage: "../src/storage", ui: "../src/ui" };
export const CROSS_CUTTING = "framework"; // checks, hooks, CI, registers: no folder of their own
const BAR_WIDTH = 20;

const isoDate = (value) => value.toISOString().slice(0, 10);
const isDone = (task) => task.startsWith("[x]");
const statusLabel = (item) => `${SYMBOLS[item.status]} ${item.status}`;
const tasksLabel = (item) => `${item.tasks.filter(isDone).length}/${item.tasks.length}`;
const anchor = (id) => `[${id}](#${id.toLowerCase()})`;
const moduleLink = (module) => (module === CROSS_CUTTING ? module : `[${module}](${MODULES[module]})`);
const row = (cells) => `| ${cells.join(" | ")} |`;

function bar(done, total) {
  const filled = total ? Math.round((BAR_WIDTH * done) / total) : 0;
  return `\`${"█".repeat(filled)}${"░".repeat(BAR_WIDTH - filled)}\` ${done}/${total}`;
}

/** Where each milestone stands; a release is reached when all its Musts are done. */
function standing(milestones, items) {
  const lines = ["## Where we stand", "", row(["Milestone", "Musts done", "Items done", "Tasks done", "Reached"])];
  lines.push("|---|---|---|---|---|");
  for (const milestone of milestones) {
    const own = items.filter((item) => item.milestone === milestone.code);
    const musts = own.filter((item) => item.moscow === "must");
    const mustsDone = musts.filter((item) => item.status === "done").length;
    const tasks = own.flatMap((item) => item.tasks);
    const left = musts.length - mustsDone;
    let reached = "—";
    if (milestone.release) {
      reached = left ? `○ not yet: ${left} Must${left > 1 ? "s" : ""} left` : `✓ reached, tag ${milestone.release}`;
    }
    const itemsDone = `${own.filter((item) => item.status === "done").length}/${own.length}`;
    lines.push(
      row([
        milestone.name,
        bar(mustsDone, musts.length),
        itemsDone,
        `${tasks.filter(isDone).length}/${tasks.length}`,
        reached,
      ]),
    );
  }
  return lines.concat("");
}

/** What can start now: not done, every dependency done; earliest milestone and strongest priority first. */
function ready(milestones, items) {
  const done = new Set(items.filter((item) => item.status === "done").map((item) => item.id));
  const order = milestones.map((milestone) => milestone.code);
  const rank = (item) => [order.indexOf(item.milestone), MOSCOW.indexOf(item.moscow)];
  const open = items
    .filter((item) => item.status !== "done" && (item.depends_on ?? []).every((id) => done.has(id)))
    .sort((a, b) => rank(a)[0] - rank(b)[0] || rank(a)[1] - rank(b)[1] || a.id.localeCompare(b.id));
  const lines = ["## Ready to start", "", "Not done, and every dependency done:", ""];
  return lines.concat(
    open.map((i) => `- ${anchor(i.id)} ${i.title} (${i.milestone}, ${i.moscow}, ${statusLabel(i)})`),
    "",
  );
}

/** The dependency graph; each node carries its status in words, not only in its style. */
function graph(items) {
  const lines = ["## Dependencies", "", "```mermaid", "flowchart LR"];
  for (const item of items) {
    const node = item.id.replace("-", "");
    lines.push(`  ${node}["${item.id} ${statusLabel(item)}<br/>${item.title}"]:::${item.status.replace(" ", "")}`);
    for (const dependency of item.depends_on ?? []) lines.push(`  ${dependency.replace("-", "")} --> ${node}`);
  }
  lines.push(
    "  classDef done stroke-width:3px",
    "  classDef doing stroke-dasharray:4",
    "  classDef todo stroke-width:1px",
  );
  return lines.concat("```", "");
}

/** One item: its line of facts, its note, its to-do list. */
function card(item) {
  const meta = [item.moscow[0].toUpperCase() + item.moscow.slice(1), moduleLink(item.module), statusLabel(item)];
  meta.push(`added \`${isoDate(item.added)}\``);
  if (item.depends_on?.length) meta.push(`after ${item.depends_on.map(anchor).join(", ")}`);
  if (item.features?.length) meta.push(`features: ${item.features.join(", ")}`);
  const lines = [`<a id="${item.id.toLowerCase()}"></a>`, `#### ${item.id} · ${item.title}`, "", meta.join(" · "), ""];
  if (item.note) lines.push(item.note, "");
  return lines.concat(
    item.tasks.map((task) => `- ${task}`),
    "",
  );
}

function milestoneSection(milestone, items) {
  const own = items.filter((item) => item.milestone === milestone.code);
  const lines = [`### ${milestone.code} · ${milestone.name}`, "", milestone.goal, ""];
  lines.push(row(["ID", "Item", "MoSCoW", "Module", "Status", "Tasks"]), "|---|---|---|---|---|---|");
  for (const item of own) {
    lines.push(
      row([anchor(item.id), item.title, item.moscow, moduleLink(item.module), statusLabel(item), tasksLabel(item)]),
    );
  }
  return lines.concat("", ...own.map(card));
}

/** The whole page, from the backlog's milestones and items (already checked). */
export function page(milestones, items) {
  const lines = [
    "<!-- Generated by scripts/backlog.mjs from docs/backlog.toml: never edit by hand. -->",
    "# Product backlog",
    "",
    "[← Overview](../ARCHITECTURE.md) · Source: [backlog.toml](backlog.toml) · What each feature does",
    "and what proves it: [features.md](features.md) · Why: [decisions.md](decisions.md)",
    "",
    "What is left to do, in what order, and when each version is reached. Each item has a **MoSCoW**",
    "priority (*must*, *should*, *could*, *won't* this time), a milestone, its dependencies and its",
    "to-do list. A version is reached when every Must of its milestone is done. A new request enters",
    "`backlog.toml` as an item; its catalogue features follow, as *Planned*, once Frantz validates them.",
    "",
    `Statuses: ${Object.entries(SYMBOLS)
      .map(([name, symbol]) => `${symbol} ${name}`)
      .join(", ")}.`,
    "",
  ];
  const sections = milestones.flatMap((milestone) => milestoneSection(milestone, items));
  return [
    ...lines,
    ...standing(milestones, items),
    ...ready(milestones, items),
    ...graph(items),
    "## Items",
    "",
    ...sections,
  ].join("\n");
}
