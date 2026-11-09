// Imports the resources and items the game's costs name, from cctools.cc's saved pages (D-25, GUIDE-04), into
// data/<game>/items.json: one entry per resource or item, its game code, kind and rarity, its name in English (and in
// French with a star until read in the game, D-08). The warlords' costs point at these ids; the rituals', buildings'
// and gear's will.
//
//   node scripts/import-items.mjs     reads the saved warlord pages and writes data/<game>/items.json
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { itemOf } from "./cctools.mjs";
import { savedPages } from "./import-warlords.mjs";

const GAME = "chaos-conquest";
const OUTPUT = new URL(`../data/${GAME}/items.json`, import.meta.url);
const SOURCE =
  "cctools.cc, the costs on its saved pages (D-25); written by scripts/import-items.mjs: never edit by hand";

/** Every resource and item the pages' costs name, once each, sorted by id; two codes for one id stop the import. */
export function buildItems(pages) {
  const items = new Map();
  for (const page of pages) {
    for (const level of Object.values(page.levelData)) {
      for (const cost of level.costs) {
        const { id, code, kind, rarity, label } = itemOf(cost);
        if (items.has(id) && items.get(id).code !== code) {
          throw new Error(`item ${id}: codes ${items.get(id).code} and ${code}`);
        }
        items.set(id, { id, code, kind, rarity, labels: { en: label, fr: `${label}*` } });
      }
    }
  }
  return { source: SOURCE, items: [...items.values()].sort((a, b) => a.id.localeCompare(b.id)) };
}

/** One item per line: the file reads as a list. */
export const formatItems = ({ source, items }) =>
  `{\n  "source": ${JSON.stringify(source)},\n  "items": [\n${items.map((item) => `    ${JSON.stringify(item)}`).join(",\n")}\n  ]\n}\n`;

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const data = buildItems(savedPages());
  writeFileSync(OUTPUT, formatItems(data));
  console.log(`✓ ${data.items.length} resources and items`);
}
