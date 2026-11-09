// Imports the game's structures (buildings) from cctools.cc's saved pages (D-25, BL-14) into
// data/<game>/structures.json: each structure level by level, as the rituals are (scripts/levels.mjs): its power,
// its cost, what it requires and its bonuses. Its id comes from its name, as game.json's buildings already are.
//
//   node scripts/import-structures.mjs   reads captures/<game>/sources/cctools/structures/*.html (saved pages,
//                                        never committed) and writes data/<game>/structures.json
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { pageData } from "./cctools.mjs";
import { readGame } from "./import-warlords.mjs";
import { formatLevelled, levelFigures, newContext, sortedById, structureId, structureLabels } from "./levels.mjs";

const GAME = "chaos-conquest";
const root = new URL("../", import.meta.url);
const PAGES = new URL(`captures/${GAME}/sources/cctools/structures/`, root);
const OUTPUT = new URL(`data/${GAME}/structures.json`, root);
const SOURCE = "cctools.cc, the structures' pages (D-25); written by scripts/import-structures.mjs: never edit by hand";

/** One structure from its page's data. */
export function structureOf({ structure, levels }, context) {
  const sorted = [...levels].sort((a, b) => a.level - b.level);
  if (sorted.length !== structure.levels_count) {
    throw new Error(`${structure.code}: ${sorted.length} levels of ${structure.levels_count}`);
  }
  const { game } = context;
  const id = structureId(structure.display_name, game);
  return {
    id,
    code: structure.code,
    labels: structureLabels(structure.display_name, game),
    ...levelFigures(sorted, context),
  };
}

/** The whole file: the effects and other bonuses met, the structures; each list sorted by id. */
export function buildStructures(pages, game) {
  const context = newContext(game);
  const structures = pages.map((data) => structureOf(data, context)).sort((a, b) => a.id.localeCompare(b.id));
  return { source: SOURCE, effects: sortedById(context.effects), other: sortedById(context.other), structures };
}

export const formatStructures = formatLevelled;

/** Every structure's saved page. */
export function savedStructures(folder = PAGES) {
  return readdirSync(folder)
    .filter((file) => file.endsWith(".html") && file !== "index.html")
    .map((file) => pageData(readFileSync(new URL(file, folder), "utf8")));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const data = buildStructures(savedStructures(), readGame());
  writeFileSync(OUTPUT, formatStructures(data));
  console.log(
    `✓ ${data.structures.length} structures; ${data.effects.length} bonuses applied in battle, ${data.other.length} kept for the guides`,
  );
}
