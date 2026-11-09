// The setup file's dictionary and schema, published beside the page for tools and agents (CFG-06, D-27): one
// folder per game in dist/, built from the same data the page bundles. Never committed: the build writes them.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GAMES } from "../src/ui/games.js";
import { setupDictionary } from "../src/storage/setup-dictionary.js";
import { setupSchema } from "../src/storage/setup-schema.js";

/** The data the dictionary reads, from a game of the page's list (whose warlords are indexed in a Map). */
export const dictionaryData = (game) => ({ ...game, warlords: game.heroes.warlords });

/** Writes dist/<game>/setup-dictionary.json and setup.schema.json for every game; returns the paths written. */
export function writeSetupFiles(distDir) {
  return GAMES.flatMap((game) => {
    const dictionary = setupDictionary(dictionaryData(game));
    const folder = join(distDir, game.id);
    mkdirSync(folder, { recursive: true });
    const files = { "setup-dictionary.json": dictionary, "setup.schema.json": setupSchema(dictionary) };
    return Object.entries(files).map(([name, content]) => {
      const path = join(folder, name);
      writeFileSync(path, `${JSON.stringify(content, null, 2)}\n`);
      return path;
    });
  });
}
