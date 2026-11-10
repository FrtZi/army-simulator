// The setup file's data dictionary (CFG-06, D-27), per ISO/IEC 11179: each element's name, definition, data type,
// value domain, obligation, names on screen, where in game and example. The words come from data/<game>/setup.json,
// every type, range and id list from the game's own data, so the dictionary cannot drift from what the reader
// (setup-file.js) accepts: a test reads the dictionary's example file back without a single refusal.

import { TARGET_FIELDS } from "../engine/index.js";
import { SETUP_FORMAT, SETUP_VERSION } from "./setup-file.js";
import { pieceLevels } from "./setup-champion.js";

// a name we translated ourselves ends with "*" (D-08): the game may show another one
const TRANSLATED = /\*$/;

/** An entry of a value list: its id, its names without the star, and which of them we translated. */
function listEntry({ id, labels }, extra = {}) {
  const names = Object.fromEntries(
    Object.entries(labels ?? {}).map(([lang, name]) => [lang, name.replace(TRANSLATED, "")]),
  );
  const translated = Object.keys(labels ?? {}).filter((lang) => TRANSLATED.test(labels[lang]));
  return { id, labels: names, ...(translated.length && { translated }), ...extra };
}

/** Every list of allowed ids: the warlords, the stats a bonus may raise, and the values of each target filter. */

function valueLists({ game, warlords, units, defences, rituals, structures, champion }) {
  const filters = Object.fromEntries(
    Object.keys(TARGET_FIELDS)
      .filter((filter) => filter !== "units")
      .map((filter) => [filter, game[filter].map((entry) => listEntry(entry))]),
  );
  return {
    warlords: warlords.map((warlord) => listEntry(warlord, { rarity: warlord.rarity })),
    // never raised: squad size, upkeep, power, protection; the march capacity has its own field (DEF-017)
    stats: game.troopStats.filter((stat) => stat.boostable !== false).map((stat) => listEntry(stat)),
    ...filters,
    units: [...units, ...defences].map((unit) => listEntry(unit)),
    // each with its last level: a level read beyond it is refused (BONUS-04, BONUS-07)
    rituals: (rituals?.rituals ?? []).map((ritual) => listEntry(ritual, { levels: ritual.power.length })),
    buildings: (structures?.structures ?? []).map((building) => listEntry(building, { levels: building.power.length })),
    gear: (champion?.pieces ?? []).map((piece) => listEntry(piece, { levels: pieceLevels(piece) })),
  };
}

/** The data type and value domain of each element, from the game's rules. */
function domains(game, gameId, champion) {
  const { ranks, levelsPerRank } = game.heroRules;
  const percent = { dataType: "number", valueDomain: game.bonusPercent };
  const count = { dataType: "integer", valueDomain: { min: 0 } };
  const list = { dataType: "list", valueDomain: {} };
  const object = { dataType: "object", valueDomain: {} };
  const levelled = (name) => ({ [name]: list, [`${name}[].id`]: { dataType: "text", valueDomain: { list: name } } });
  return {
    format: { dataType: "text", valueDomain: { const: SETUP_FORMAT } },
    version: { dataType: "integer", valueDomain: { const: SETUP_VERSION } },
    game: { dataType: "text", valueDomain: { const: gameId } },
    warlords: list,
    "warlords[].id": { dataType: "text", valueDomain: { list: "warlords" } },
    "warlords[].rank": { dataType: "integer", valueDomain: { min: 1, max: ranks } },
    "warlords[].level": { dataType: "integer", valueDomain: { min: 1, max: levelsPerRank } },
    capacity: object,
    "capacity.base": count,
    "capacity.bonusPercent": percent,
    bonuses: list,
    "bonuses[].stat": { dataType: "text", valueDomain: { list: "stats" } },
    "bonuses[].percent": percent,
    "bonuses[].target": { dataType: "object", valueDomain: { filters: Object.keys(TARGET_FIELDS) } },
    "bonuses[].source": { dataType: "text", valueDomain: {} },
    ...levelled("rituals"),
    "rituals[].level": count,
    ...levelled("buildings"),
    "buildings[].level": count,
    champion: object,
    "champion.level": { dataType: "integer", valueDomain: { min: 1, max: champion?.champion.power.length } },
    "champion.gear": list,
    "champion.gear[].id": { dataType: "text", valueDomain: { list: "gear" } },
    "champion.gear[].level": { dataType: "integer", valueDomain: { min: 1 } },
  };
}

/**
 * The dictionary of one game's setup file. `gameData`: { id, labels, game, warlords, units, defences, setup }
 * (setup: the words, data/<game>/setup.json). Every element of the words must have a domain, and the reverse.
 */
export function setupDictionary(gameData) {
  const typed = domains(gameData.game, gameData.id, gameData.champion);
  const elements = gameData.setup.elements.map((element) => {
    if (!typed[element.name]) throw new Error(`setup.json: no type for the element "${element.name}"`);
    return { ...element, ...typed[element.name] };
  });
  const missing = Object.keys(typed).filter((name) => !elements.some((element) => element.name === name));
  if (missing.length) throw new Error(`setup.json: no definition for ${missing.join(", ")}`);
  return {
    format: SETUP_FORMAT,
    version: SETUP_VERSION,
    game: gameData.id,
    gameName: gameData.labels.en,
    elements,
    valueLists: valueLists(gameData),
    readings: gameData.setup.readings,
  };
}

/** A file holding every element's example: each list section with one entry. */
export function exampleFile(dictionary) {
  const file = {};
  for (const { name, example } of dictionary.elements) {
    if (example === undefined) continue;
    // "champion.gear[].id": champion → gear, a list of one entry → id
    const keys = name.split(".");
    const holder = keys.slice(0, -1).reduce((node, key) => {
      if (!key.endsWith("[]")) return (node[key] ??= {});
      return (node[key.slice(0, -2)] ??= [{}])[0];
    }, file);
    holder[keys.at(-1)] = example;
  }
  return file;
}
