// Imports the game's rituals from cctools.cc's saved pages (D-25, BL-10) into data/<game>/rituals.json: the
// categories, and each ritual level by level: its power, its cost (in items of items.json), what it requires (a
// ritual or a structure at a level) and its bonuses, applied in battle when they read as our effects, else kept for
// the guides (scripts/levels.mjs).
//
//   node scripts/import-rituals.mjs   reads captures/<game>/sources/cctools/rituals/<category>/*.html (saved pages,
//                                     never committed) and writes data/<game>/rituals.json
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { pageData } from "./cctools.mjs";
import { readGame } from "./import-warlords.mjs";
import { formatLevelled, kebab, labels, levelFigures, newContext, sortedById } from "./levels.mjs";

const GAME = "chaos-conquest";
const root = new URL("../", import.meta.url);
const PAGES = new URL(`captures/${GAME}/sources/cctools/rituals/`, root);
const OUTPUT = new URL(`data/${GAME}/rituals.json`, root);
const SOURCE = "cctools.cc, the rituals' pages (D-25); written by scripts/import-rituals.mjs: never edit by hand";

/** One ritual from its page's data. */
export function ritualOf({ ritual, category, levels }, context) {
  const sorted = [...levels].sort((a, b) => a.level - b.level);
  if (sorted.length !== ritual.levels_count) {
    throw new Error(`${ritual.code}: ${sorted.length} levels of ${ritual.levels_count}`);
  }
  const id = kebab(ritual.code);
  return {
    id,
    code: ritual.code,
    category: category.slug,
    labels: labels(ritual.display_name),
    ...levelFigures(sorted, context),
  };
}

/** The whole file: the categories, the effects and other bonuses met, the rituals; each list sorted by id. */
export function buildRituals(categories, pages, game) {
  const context = newContext(game);
  const rituals = pages.map((data) => ritualOf(data, context)).sort((a, b) => a.id.localeCompare(b.id));
  return {
    source: SOURCE,
    categories: categories.map((category) => ({
      id: category.slug,
      code: category.code,
      labels: labels(category.display_name),
    })),
    effects: sortedById(context.effects),
    other: sortedById(context.other),
    rituals,
  };
}

export const formatRituals = formatLevelled;

/** The saved pages: the categories, in the game's order, and every ritual's page. */
export function savedRituals(folder = PAGES) {
  const { categories } = pageData(readFileSync(new URL("index.html", folder), "utf8"));
  const pages = categories.flatMap((category) => {
    const dir = new URL(`${category.slug}/`, folder);
    return readdirSync(dir)
      .filter((file) => file.endsWith(".html") && file !== "index.html")
      .map((file) => pageData(readFileSync(new URL(file, dir), "utf8")));
  });
  return { categories, pages };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const { categories, pages } = savedRituals();
  const data = buildRituals(categories, pages, readGame());
  writeFileSync(OUTPUT, formatRituals(data));
  console.log(
    `✓ ${data.rituals.length} rituals in ${data.categories.length} categories; ${data.effects.length} bonuses applied in battle, ${data.other.length} kept for the guides`,
  );
}
