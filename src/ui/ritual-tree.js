// A rituals category as the game's tree (GUIDE-07, D-32): a row per depth, each ritual under the middle of its
// prerequisites; and the order it is read in, row by row from the left, which numbers the rituals the same way in the
// guides' map and in Your setup (Frantz, 2026-11-10); and the tree drawn, a node per ritual in the state its levels
// give it, each a button, the links behind for the eye only.
import { escape } from "./dom.js";
import { label } from "./format.js";
import { CONFIG } from "./config.js";
import { t } from "./texts/index.js";
import { depthsOf } from "../engine/index.js";

const needsOf = (entry) => Object.keys(entry.requires.ritual ?? {});

/** Each node's place, the rows in order, and the tree's size. */
export function treeLayout(entries) {
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
  return { places, rows, width, height: rows.length * (h + gapY) - gapY };
}

/** The rituals in the order the tree is read, each with its number from 1. */
export const treeOrder = (entries) =>
  treeLayout(entries)
    .rows.flat()
    .map((entry, index) => ({ entry, number: index + 1 }));

const ICONS = { done: "✓", partial: "◑", open: "○", locked: "✕" };
const top = (entry) => entry.power.length;

/** A ritual's state from its levels: at its top, under way, can start (every first need met), or locked. */
function stateOf(entry, mine) {
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

function nodeHtml(entry, place, { levelOf: mine, lit, attribute }, number) {
  const { nodeWidth: w, nodeHeight: h } = CONFIG.ritualMap;
  const state = stateOf(entry, mine);
  const level = state === "done" ? t("map.top") : `${mine(entry.id)}/${top(entry)}`;
  const classes = ["map-node", state, lit.has(entry.id) ? "on-path" : "", lit.goal === entry.id ? "goal" : ""];
  const words = t(`map.${state}`, { level: mine(entry.id), top: top(entry) });
  return `<button type="button" class="${classes.join(" ").trim()}" ${attribute}="${entry.id}" style="left:${place.x}px;top:${place.y}px;width:${w}px;height:${h}px" aria-label="${escape(`${label(entry)}: ${words}`)}">
    <span class="name"><span class="tree-number">${number}</span> ${escape(label(entry))}</span><span class="map-state"><span aria-hidden="true">${ICONS[state]}</span> ${escape(level)}</span></button>`;
}

/**
 * The tree drawn: `levelOf(id)` the level each ritual is at (saved, or as entered), `lit` the rituals on the way
 * (a Set, its `goal` the one aimed at or chosen), `attribute` the data attribute each node's button carries.
 */
export function treeHtml(tree, options) {
  const placed = treeLayout(tree);
  const nodes = treeOrder(tree).map(({ entry, number }) =>
    nodeHtml(entry, placed.places.get(entry.id), options, number),
  );
  return `<div class="map-scroll"><div class="map" style="width:${placed.width}px;height:${placed.height}px">${linksSvg(tree, placed, options.lit)}${nodes.join("")}</div></div>`;
}
