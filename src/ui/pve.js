// A PvE army as the battle's second side (SIM-11, BL-20, docs/spec/pve.md): a place of data/<game>/pve.json chosen
// by kind, name and level, its troops kept or left out and their counts lowered (Frantz, 2026-11-10). They fight with
// their own stats: no hero, no bonus, no march capacity; the player always attacks. The state is passed in, so
// state.js uses these without importing back.
import { indexCatalogue, summariseArmy } from "../engine/index.js";

// a PvE troop marches nowhere and eats nothing: what the sheets give our troops, theirs do not need
const NOT_MARCHING = { squadSize: 1, foodUpkeep: 0, speed: 0, load: 0 };
const catalogues = new WeakMap();

/** A PvE troop as the engine reads a troop. */
const pveUnit = (troop) => ({ ...troop, stats: { ...NOT_MARCHING, ...troop.stats } });

/** The PvE troops indexed once per game, for every PvE army that follows. */
export function pveCatalogue(game) {
  if (!catalogues.has(game)) {
    catalogues.set(game, indexCatalogue(game.pve.troops.map(pveUnit)));
  }
  return catalogues.get(game);
}

/** The places that field troops (an empty one is left out), of one kind. */
export const placesOf = (game, kind) =>
  game.pve.places
    .filter((place) => place.kind === kind && Object.keys(place.troops).length > 0)
    .sort((a, b) => a.level - b.level); // the lowest level first

/** The place chosen: its kind, name (English) and level; the first of each when the choice is not there. */
export function chosenPlace(state, game) {
  const { kind, name, level } = state.pve;
  const ofKind = placesOf(game, kind);
  const named = ofKind.filter((place) => place.labels.en === name);
  const pool = named.length ? named : ofKind.filter((place) => place.labels.en === ofKind[0]?.labels.en);
  return pool.find((place) => place.level === level) ?? pool[0] ?? null;
}

/** A place chosen: its whole army, every troop at its count. */
export function choosePlace(state, game, choice) {
  Object.assign(state.pve, choice);
  const place = chosenPlace(state, game);
  Object.assign(state.pve, { name: place?.labels.en ?? "", level: place?.level ?? null, troops: { ...place?.troops } });
}

/** The races of the PvE army's troops kept. */
export const pveRaces = (state, game) =>
  new Set(Object.keys(state.pve.troops).map((id) => pveCatalogue(game).units.get(id)?.race));

/**
 * A talent that counts only against one race (game.json `against`, Combat Bonus vs. Empire): its effects on the
 * stats it `raises`, at the hero's level, when every troop kept is of that race (open question 16: to verify).
 */
export function raceTalentEffects({ chosen, offered }, talentCodes, races) {
  return chosen.flatMap((id) => {
    const shape = talentCodes.find((entry) => entry.id === id);
    if (!shape?.against || races.size !== 1 || !races.has(shape.against)) return [];
    const { percent } = offered.find((entry) => entry.id === id);
    return shape.raises.map((stat) => ({ stat, percent }));
  });
}

/** The PvE army as the engine sees it: the troops kept, at their counts, without bonus or capacity. */
export const pveArmy = (state, game) =>
  summariseArmy(state.pve.troops, pveCatalogue(game), [], { marchCapacity: Number.MAX_SAFE_INTEGER });
