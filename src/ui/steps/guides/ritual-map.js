// The map to reach a ritual (GUIDE-07, D-32): its category's tree as the game draws it, each ritual under its
// prerequisites, a node per ritual in the state the saved setup gives it (at its top, under way, can start, locked),
// the way to the level chosen lit, and below it the steps still to do, in order. Each node is a button that opens
// its ritual; the links are drawn behind, for the eye only.
import { escape } from "../../dom.js";
import { label } from "../../format.js";
import { CONFIG } from "../../config.js";
import { currentGame } from "../../state.js";
import { t } from "../../texts/index.js";
import { depthsOf, prerequisitesOf } from "../../../engine/index.js";
import { savedLevel } from "./levelled.js";

const ICONS = { done: "✓", partial: "◑", open: "○", locked: "✕" };
const mine = (id) => savedLevel("rituals", id);
const top = (entry) => entry.power.length;
const needsOf = (entry) => Object.keys(entry.requires.ritual ?? {});

/** Each node's place: a row per depth, each ritual under the middle of its prerequisites. */
function layout(entries) {
  const { nodeWidth: w, nodeHeight: h, gapX, gapY } = CONFIG.ritualMap;
  const depths = depthsOf(entries);
  const rows = [];
  for (const entry of entries) (rows[depths.get(entry.id)] ??= []).push(entry);
  const width = Math.max(...rows.map((row) => row.length)) * (w + gapX) - gapX;
  const places = new Map();
  const middle = (entry) => {
    const xs = needsOf(entry)
      .filter((id) => places.has(id))
      .map((id) => places.get(id).x);
    return xs.length ? xs.reduce((sum, x) => sum + x, 0) / xs.length : 0;
  };
  rows.forEach((row, depth) => {
    row.sort((a, b) => middle(a) - middle(b));
    const start = (width - (row.length * (w + gapX) - gapX)) / 2;
    row.forEach((entry, index) => places.set(entry.id, { x: start + index * (w + gapX), y: depth * (h + gapY) }));
  });
  return { places, width, height: rows.length * (h + gapY) - gapY };
}

/** A ritual's state from the saved setup: at its top, under way, can start (every first need met), or locked. */
function stateOf(entry) {
  const level = mine(entry.id);
  if (level >= top(entry)) return "done";
  if (level > 0) return "partial";
  const met = Object.entries(entry.requires.ritual ?? {}).every(([id, levels]) => mine(id) >= (levels[0] ?? 0));
  return met ? "open" : "locked";
}

function linksSvg(entries, layout_, lit) {
  const { nodeWidth: w, nodeHeight: h } = CONFIG.ritualMap;
  const paths = entries.flatMap((entry) =>
    Object.entries(entry.requires.ritual ?? {})
      .filter(([id]) => layout_.places.has(id))
      .map(([id, levels]) => {
        const from = layout_.places.get(id);
        const to = layout_.places.get(entry.id);
        const [x1, y1, x2, y2] = [from.x + w / 2, from.y + h, to.x + w / 2, to.y];
        const mid = (y1 + y2) / 2;
        const asked = levels.find((level) => level !== null) ?? 1;
        const on = lit.has(id) && (lit.has(entry.id) || lit.goal === entry.id);
        const tag = asked > 1 ? `<text x="${(x1 + x2) / 2 + 4}" y="${mid}">${asked}</text>` : "";
        return `<path class="${on ? "on-path" : ""}" d="M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}"/>${tag}`;
      }),
  );
  return `<svg class="map-links" width="${layout_.width}" height="${layout_.height}" aria-hidden="true">${paths.join("")}</svg>`;
}

function nodeHtml(entry, place, lit) {
  const { nodeWidth: w, nodeHeight: h } = CONFIG.ritualMap;
  const state = stateOf(entry);
  const level = state === "done" ? t("map.top") : `${mine(entry.id)}/${top(entry)}`;
  const classes = ["map-node", state, lit.has(entry.id) ? "on-path" : "", lit.goal === entry.id ? "goal" : ""];
  const words = t(`map.${state}`, { level: mine(entry.id), top: top(entry) });
  return `<button type="button" class="${classes.join(" ").trim()}" data-guide-entry="${entry.id}" style="left:${place.x}px;top:${place.y}px;width:${w}px;height:${h}px" aria-label="${escape(`${label(entry)}: ${words}`)}">
    <span class="name">${escape(label(entry))}</span><span class="map-state"><span aria-hidden="true">${ICONS[state]}</span> ${escape(level)}</span></button>`;
}

/** The steps left to reach `level` of the ritual: each prerequisite under the level asked, the deepest first. */
function stepsHtml(entry, level, needed, all) {
  const depths = depthsOf(all);
  const byId = new Map(all.map((other) => [other.id, other]));
  const steps = [...needed]
    .filter(([id, asked]) => mine(id) < asked && byId.has(id))
    .sort(([a], [b]) => depths.get(a) - depths.get(b))
    .map(([id, asked]) => [byId.get(id), asked]);
  if (mine(entry.id) < level) steps.push([entry, level]);
  if (!steps.length) return `<p class="hint">${escape(t("map.reached"))}</p>`;
  const items = steps.map(
    ([step, asked]) =>
      `<li><button type="button" class="link-button" data-guide-entry="${step.id}">${escape(label(step))}</button> ${escape(t("map.step", { from: mine(step.id), to: asked }))}</li>`,
  );
  return `<ol class="map-steps">${items.join("")}</ol>`;
}

/** The map of the ritual's category, the way to `level` lit, and the steps left. */
export function ritualMapHtml(entry, level) {
  const all = currentGame().rituals.rituals;
  const tree = all.filter((other) => other.category === entry.category);
  const needed = prerequisitesOf(all, entry.id, level);
  const lit = Object.assign(new Set(needed.keys()), { goal: entry.id });
  const placed = layout(tree);
  const nodes = tree.map((other) => nodeHtml(other, placed.places.get(other.id), lit));
  return `<h4>${escape(t("map.title", { level }))}</h4>
    <p class="hint">${escape(t("map.hint"))}</p>
    <div class="map-scroll"><div class="map" style="width:${placed.width}px;height:${placed.height}px">${linksSvg(tree, placed, lit)}${nodes.join("")}</div></div>
    <h4>${escape(t("map.stepsTitle"))}</h4>${stepsHtml(entry, level, needed, all)}`;
}
