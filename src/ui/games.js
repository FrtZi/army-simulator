// The games the page knows, with their data. The JSON files are imported here so the build bundles them into
// the single page. Adding a game: its folder in data/, its line in data/games.json, and its imports below.
import gameList from "../../data/games.json" with { type: "json" };
import chaosConquestGame from "../../data/chaos-conquest/game.json" with { type: "json" };
import chaosConquestUnits from "../../data/chaos-conquest/units.json" with { type: "json" };
import chaosConquestDefences from "../../data/chaos-conquest/defences.json" with { type: "json" };
import chaosConquestRules from "../../data/chaos-conquest/combat-rules.json" with { type: "json" };
import chaosConquestWarlords from "../../data/chaos-conquest/warlords.json" with { type: "json" };
import { indexCatalogue } from "../engine/index.js";

const DATA = {
  "chaos-conquest": {
    game: chaosConquestGame,
    units: chaosConquestUnits,
    defences: chaosConquestDefences,
    rules: chaosConquestRules,
    heroes: chaosConquestWarlords,
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
  };
});
