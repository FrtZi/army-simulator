// A rituals category as the game's tree (GUIDE-07, D-32): a row per depth, each ritual under the middle of its
// prerequisites; and the order it is read in, row by row from the left, which numbers the rituals the same way in the
// guides' map and in Your setup (Frantz, 2026-11-10).
import { CONFIG } from "./config.js";
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
