// Imports where each resource and item is found, from cctools.cc's saved answers (D-25, GUIDE-04, D-29), into
// data/<game>/item-sources.json: the places (armies, raids, Foes, resource tiles: one per kind and name, its levels
// told apart), and per item of items.json the places it drops at, by level, with how many on average per hit, per
// chest, per spoil, per champion or per gathering completed (only the non-zero ones kept).
//
//   node scripts/import-item-sources.mjs   reads captures/<game>/sources/cctools/items/<code>/<kind>.json (saved,
//                                          never committed) and writes data/<game>/item-sources.json
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { kebab, labels } from "./levels.mjs";

const GAME = "chaos-conquest";
const root = new URL("../", import.meta.url);
const SAVED = new URL(`captures/${GAME}/sources/cctools/items/`, root);
const OUTPUT = new URL(`data/${GAME}/item-sources.json`, root);
const ITEMS = new URL(`data/${GAME}/items.json`, root);
const SOURCE =
  "cctools.cc, where each item drops (D-25); written by scripts/import-item-sources.mjs: never edit by hand";
const KINDS = ["army", "raid", "foe", "resource"];
// cctools.cc's averages, and our names for them
// (a resource tile counts per gathering completed)
const AVERAGES = {
  avg_per_hit: "perHit",
  avg_per_chest: "perChest",
  avg_per_spoil: "perSpoil",
  avg_per_champion: "perChampion",
  avg_per_completion: "perCompletion",
};
const rounded = (value) => Math.round(value * 1000) / 1000; // 1.2000000000000002 → 1.2

/** One drop: the place's id, the level, and the averages that are not zero. */
function dropOf(answer, kind, places) {
  const place = `${kind}-${kebab(answer.location_name)}`;
  places.set(place, { id: place, kind, labels: labels(answer.location_name) });
  const averages = Object.entries(AVERAGES)
    .filter(([field]) => answer[field])
    .map(([field, name]) => [name, rounded(answer[field])]);
  return { place, level: answer.level, ...Object.fromEntries(averages) };
}

/** The whole file from the saved answers: the places met, and each item's drops, by place then level. */
export function buildItemSources(items, read) {
  const places = new Map();
  const found = {};
  for (const item of items) {
    const drops = KINDS.flatMap((kind) => (read(item.code, kind) ?? []).map((answer) => dropOf(answer, kind, places)));
    if (drops.length) found[item.id] = drops.sort((a, b) => a.place.localeCompare(b.place) || a.level - b.level);
  }
  return { source: SOURCE, places: [...places.values()].sort((a, b) => a.id.localeCompare(b.id)), items: found };
}

/** One place and one drop per line: the file reads as lists. */
export function formatItemSources({ source, places, items }) {
  const placeLines = places.map((place) => `    ${JSON.stringify(place)}`).join(",\n");
  const itemBlocks = Object.entries(items)
    .map(
      ([id, drops]) =>
        `    ${JSON.stringify(id)}: [\n${drops.map((drop) => `      ${JSON.stringify(drop)}`).join(",\n")}\n    ]`,
    )
    .join(",\n");
  return `{\n  "source": ${JSON.stringify(source)},\n  "places": [\n${placeLines}\n  ],\n  "items": {\n${itemBlocks}\n  }\n}\n`;
}

/** A saved answer, or null when the item or the kind was not saved. */
export function savedAnswer(code, kind, folder = SAVED) {
  const file = new URL(`${code}/${kind}.json`, folder);
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
}

export const readItems = () => JSON.parse(readFileSync(ITEMS, "utf8")).items;

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const data = buildItemSources(readItems(), savedAnswer);
  writeFileSync(OUTPUT, formatItemSources(data));
  console.log(`✓ ${Object.keys(data.items).length} items found somewhere, in ${data.places.length} places`);
}
