// The games the page knows, with their data. The JSON files are imported here so the build bundles them into
// the single page. Adding a game: its folder in data/, its line in data/games.json, and its imports below.
import gameList from "../../data/games.json" with { type: "json" };
import chaosConquestGame from "../../data/chaos-conquest/game.json" with { type: "json" };
import chaosConquestUnits from "../../data/chaos-conquest/units.json" with { type: "json" };
import chaosConquestDefences from "../../data/chaos-conquest/defences.json" with { type: "json" };
import chaosConquestRules from "../../data/chaos-conquest/combat-rules.json" with { type: "json" };
import chaosConquestWarlords from "../../data/chaos-conquest/warlords.json" with { type: "json" };
import chaosConquestSetup from "../../data/chaos-conquest/setup.json" with { type: "json" };
import chaosConquestItems from "../../data/chaos-conquest/items.json" with { type: "json" };
import chaosConquestRituals from "../../data/chaos-conquest/rituals.json" with { type: "json" };
import chaosConquestStructures from "../../data/chaos-conquest/structures.json" with { type: "json" };
import chaosConquestItemSources from "../../data/chaos-conquest/item-sources.json" with { type: "json" };
import chaosConquestChampion from "../../data/chaos-conquest/champion.json" with { type: "json" };
import chaosConquestPve from "../../data/chaos-conquest/pve.json" with { type: "json" };
import { indexCatalogue } from "../engine/index.js";
import { setupDictionary } from "../storage/setup-dictionary.js";

const DATA = {
  "chaos-conquest": {
    game: chaosConquestGame,
    units: chaosConquestUnits,
    defences: chaosConquestDefences,
    rules: chaosConquestRules,
    heroes: chaosConquestWarlords,
    setup: chaosConquestSetup,
    items: chaosConquestItems,
    rituals: chaosConquestRituals,
    structures: chaosConquestStructures,
    itemSources: chaosConquestItemSources,
    champion: chaosConquestChampion,
    pve: chaosConquestPve,
  },
};

/** Each game: its id and names (games.json), its data, its catalogue and its warlords indexed once. */
export const GAMES = gameList.map((entry) => {
  const data = DATA[entry.id];
  if (!data) throw new Error(`data/games.json lists "${entry.id}" but src/ui/games.js does not import its data`);
  const { warlords, talents } = data.heroes;
  return {
    ...entry,
    ...data,
    catalogue: indexCatalogue(data.units, data.defences),
    warlords: new Map(warlords.map((warlord) => [warlord.id, warlord])),
    talents,
    items: new Map(data.items.items.map((item) => [item.id, item])),
  };
});

/** A game's setup dictionary (CFG-06): the page's game, its warlords given as the list the dictionary reads. */
export const dictionaryOf = (game) => setupDictionary({ ...game, warlords: game.heroes.warlords });

/** The games by id, as the storage module reads files against them. */
export const GAMES_BY_ID = Object.fromEntries(GAMES.map((game) => [game.id, game]));
