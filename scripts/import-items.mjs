// Imports the resources and items the game's costs name, from cctools.cc's saved pages (D-25, GUIDE-04, D-29),
// into data/<game>/items.json: one entry per resource or item, its game code, kind and rarity, its name in English
// (and in French with a star until read in the game, D-08). The warlords', rituals' and structures' costs point at these ids; the
// gear's will.
//
//   node scripts/import-items.mjs     reads the saved warlord, ritual and structure pages, writes data/<game>/items.json
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { itemOf } from "./cctools.mjs";
import { savedPages } from "./import-warlords.mjs";
import { savedRituals } from "./import-rituals.mjs";
import { savedStructures } from "./import-structures.mjs";

const GAME = "chaos-conquest";
const SEARCHES = new URL(`../captures/${GAME}/sources/cctools/items/`, import.meta.url);
const OUTPUT = new URL(`../data/${GAME}/items.json`, import.meta.url);
const SOURCE =
  "cctools.cc, the costs on its saved pages (D-25); written by scripts/import-items.mjs: never edit by hand";

/** Every cost of a warlord page, as cctools.cc writes it there ({ type, code, label, rarity }). */
const warlordCosts = (page) => Object.values(page.levelData).flatMap((level) => level.costs);

/** Every cost of a ritual or structure page, written there by kind ({ currency: [{ code, name }], item: […] }). */
const levelledCosts = (page) =>
  page.levels.flatMap((level) =>
    Object.entries(level.costs ?? {}).flatMap(([type, list]) =>
      list.map((cost) => ({ type, code: cost.code, label: cost.name, rarity: null })),
    ),
  );

/**
 * The name cctools.cc's item search shows for a code, when it was saved: a ritual page names a component by its code
 * ("Component Unit Icon Of The Gods"), the search by its name ("Icon of the Gods").
 */
export function searchedName(code, folder = SEARCHES) {
  for (const file of ["search.json", "search-short.json"]) {
    const path = new URL(`${code}/${file}`, folder);
    const match = existsSync(path) && JSON.parse(readFileSync(path, "utf8")).find((result) => result.code === code);
    if (match) return match.display_name;
  }
  return null;
}

/**
 * Every resource and item the pages' costs name, once each, sorted by id; two codes for one id stop the import.
 * A rarity read on one page is kept when another page does not give it.
 */
export function buildItems(warlordPages, levelledPages = [], nameOf = () => null) {
  const items = new Map();
  for (const cost of [...warlordPages.flatMap(warlordCosts), ...levelledPages.flatMap(levelledCosts)]) {
    const { id, code, kind, rarity, label } = itemOf(cost);
    const known = items.get(id);
    if (known && known.code !== code) throw new Error(`item ${id}: codes ${known.code} and ${code}`);
    const name = nameOf(code) ?? label;
    items.set(id, { id, code, kind, rarity: rarity ?? known?.rarity ?? null, labels: { en: name, fr: `${name}*` } });
  }
  return { source: SOURCE, items: [...items.values()].sort((a, b) => a.id.localeCompare(b.id)) };
}

/** One item per line: the file reads as a list. */
export const formatItems = ({ source, items }) =>
  `{\n  "source": ${JSON.stringify(source)},\n  "items": [\n${items.map((item) => `    ${JSON.stringify(item)}`).join(",\n")}\n  ]\n}\n`;

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const data = buildItems(savedPages(), [...savedRituals().pages, ...savedStructures()], searchedName);
  writeFileSync(OUTPUT, formatItems(data));
  console.log(`✓ ${data.items.length} resources and items`);
}
