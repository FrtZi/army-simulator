// The single mutable state of the page, and the values derived from it. Controls write the state; drawing
// functions read it (and these derived values) and write the DOM.
import { CONFIG } from "./config.js";
import { raceTalentEffects } from "./pve.js";
import { GAMES } from "./games.js";
import { armyProfile, effectProblems, summariseArmy } from "../engine/index.js";
import { heroUnits, talentsOf } from "./heroes.js";
import { bonusEffect, bonusRow } from "./bonus-rows.js";
import {
  asPlayed,
  baseInPlay,
  capacityInPlay,
  championMarchEffects,
  setupBonuses,
  setupSourceEffects,
} from "./lab-setup.js";

/** The language: the one remembered in this browser, else the browser's own if the page has it. */
function startLanguage() {
  try {
    const saved = localStorage.getItem(CONFIG.languageKey);
    if (CONFIG.languages.includes(saved)) return saved;
  } catch {
    // storage blocked (private window, file://): fall back to the browser's language
  }
  const browser = (navigator.language ?? "").slice(0, 2);
  return CONFIG.languages.includes(browser) ? browser : CONFIG.languages[0];
}

const emptyCompositions = () => CONFIG.compositionNames.map((name) => ({ name, troops: {}, heroes: [], talents: [] }));

export const state = {
  language: startLanguage(),
  gameId: GAMES[0].id,
  marchCapacity: CONFIG.defaultMarchCapacity,
  capacityBonus: 0,
  bonuses: [], // each { stat, percent, filter, value }; filter "all" or one of CONFIG.bonusFilters
  // each { name, troops: troop id → count in the order added, heroes: [{ id, level }], talents: [talent ids] }
  compositions: emptyCompositions(),
  page: "lab", // the page tab shown: the Battle lab or Your setup (NAV-01)
  useSetup: false, // "Load your setup" in the Battle lab: the saved setup replaces what it holds (D-27)
  // the Champion lab's saved setups, and the one played in the Battle lab ("name|side"; "": Your setup's) (CFG-10)
  ...{ championSetups: [], labChampion: "" },
  // the player's setup (D-27): the one edited, the last one saved, and whether the last save failed
  playerSetup: null,
  savedPlayerSetup: null,
  setupSaveFailed: false,
  setupRitualCategory: null, // the rituals' category shown in Your setup (BONUS-04)
  ...{ setupSkillTree: null, setupSkillChosen: null }, // the champion's skill tree shown, the skill chosen (BONUS-10)
  // the Guides (GUIDE-01): the block shown; in the heroes' guide, the filters, the search, the hero, its level
  guide: {
    kind: "heroes",
    ...{ god: "", rarity: "", search: "", hero: null, level: null },
    // the rituals' and structures' guides (GUIDE-03): the category, battle bonuses only, search, entry, level
    levelled: {
      rituals: { group: "", battle: false, search: "", id: null, level: null },
      buildings: { group: "", battle: false, search: "", id: null, level: null },
    },
    items: { rarity: "", search: "", id: null, open: {} }, // the items' guide (GUIDE-04, GUIDE-08)
    champion: { view: "champion", slot: "", search: "", id: null, level: null }, // the champion's (BL-13)
  },
  setupImport: null, // a setup file uploaded: what it brings, before it is applied (CFG-05)
  active: 0, // the composition being edited
  compare: [0, 1], // the two compositions compared
  pve: { on: false, kind: "army", name: "", level: null, troops: {} }, // a PvE army as the second side (SIM-11)
  // the optimiser (SIM-05): the goal, the aim ticked (field → values, SIM-12), the battle's opponent (a composition's
  // index or "pve"), the army found (false: none placed), put in the composition; then the tab shown and the blocks
  // closed (SIM-18), kept across runs
  optimiser: { goal: CONFIG.optimiser.goals[0].id, aim: {}, opponent: "", result: null, applied: false },
  optimiserView: { tab: "have", closed: new Set() },
  optimiserXY: { aims: { x: {}, y: {} }, result: null }, // X or Y: two aims ticked, their armies (SIM-21)
  dashboard: "efficiency", // the dashboard tab shown
  efficiencyFilters: {}, // the charts' filters: building, tier, alignment → the values ticked
  highlightComposition: false, // the charts darken the troops outside the composition being edited
  chartZoom: {}, // per dashboard: the ranges zoomed into ({ x0, x1, y0, y1 }), or nothing for the whole chart
  chartTable: false, // the charts' "Show as a table" is open (D-24)
  openFilter: null, // the filter drop-down open, kept open across redraws
  profileDetails: new Set(), // the key columns of the profile table whose details are open
  picker: { open: false, picked: new Set(), search: "", filters: {} },
  heroPicker: { open: false, picked: new Set(), search: "", filters: {} }, // the same, for the heroes (D-26)
  /** The composition being edited. */
  get composition() {
    return this.compositions[this.active];
  },
  /** The troops of the composition being edited. */
  get troops() {
    return this.compositions[this.active].troops;
  },
};

const closed = () => ({ open: false, picked: new Set(), search: "", filters: {} });
const resetPicker = () => Object.assign(state, { picker: closed(), heroPicker: closed() });

/** Starts over with a new game: its troops and bonuses would mean nothing in another one. */
export function selectGame(id) {
  Object.assign(state, { gameId: id, bonuses: [], compositions: emptyCompositions(), active: 0, compare: [0, 1] });
  state.pve = { ...state.pve, on: false, name: "", level: null, troops: {} };
  state.optimiser = { ...state.optimiser, result: null, applied: false };
  resetPicker();
}

export const currentGame = () => GAMES.find((game) => game.id === state.gameId);

export { bonusEffect, bonusRow };

export const capacityEffect = () => ({ stat: "marchCapacity", percent: capacityInPlay(state).percent });

/** The problems of an effect in the current game (empty when it is valid). */
export function problemsOf(effect) {
  const { game, catalogue } = currentGame();
  return effectProblems(effect, game, catalogue);
}

/** Every valid effect: a bonus with a problem is shown with it, and left out of the figures. */
export function validEffects(seen = state) {
  // `seen`: the state, or one whose setup holds a ritual or building more (the optimiser's path, D-43)
  const bonuses = setupBonuses(seen) ? seen.savedPlayerSetup.bonuses : seen.bonuses.map(bonusEffect);
  const sources = setupSourceEffects(seen, currentGame()); // rituals and buildings, with the setup loaded
  return [...bonuses, ...sources, capacityEffect()].filter((effect) => !problemsOf(effect).length);
}

/**
 * A composition as the engine sees it, its heroes played as given: its troops with every bonus, its talents' included,
 * and its heroes. `shared`: the bonuses every composition shares (validEffects), passed in by a caller that sums many
 * armies. The optimiser's path plays a hero not owned yet, or one level up, so it skips asPlayed (D-42).
 */
// a composition's effects and hero units, built once per bonuses shared and per heroes and talents: the optimiser sums
// thousands of armies differing in their troops only, and the same list lets the engine keep its troops' stats (DEF-049)
const built = new WeakMap();

function effectsOf(composition, against, shared, seen) {
  const game = currentGame();
  const key = JSON.stringify([
    composition.heroes ?? [],
    composition.talents ?? [],
    composition.ledByChampion,
    [...against],
  ]);
  if (!built.has(shared)) built.set(shared, new Map());
  const known = built.get(shared);
  if (known.has(key)) return known.get(key);
  // `seen`: the state, or one whose champion has a piece or a skill more (the optimiser's path, D-44); it comes with
  // its own shared bonuses, so the key above holds
  const march = championMarchEffects(seen, game, composition).filter((effect) => !problemsOf(effect).length);
  const talents = talentsOf(composition, game);
  // against a PvE army of one race, a talent for that race counts too (Combat Bonus vs. Empire)
  const versus = raceTalentEffects(talents, game.game.talentCodes, against);
  const value = { effects: [...shared, ...talents.effects, ...march, ...versus], units: heroUnits(composition, game) };
  known.set(key, value);
  return value;
}

export function summariseAsGiven(composition, against = new Set(), shared = validEffects(), seen = state) {
  const { effects, units } = effectsOf(composition, against, shared, seen);
  const limits = { marchCapacity: baseInPlay(state, currentGame(), seen) };
  return summariseArmy(composition.troops, currentGame().catalogue, effects, limits, units);
}

/** A composition as the engine sees it, as it plays: with the setup loaded, only the heroes owned, at their levels. */
export const summarise = (composition, against, shared) =>
  summariseAsGiven(asPlayed(composition, state), against, shared);

/** The composition being edited as the engine sees it, and its profile. */
export function currentArmy() {
  const army = summarise(state.composition);
  return { army, profile: armyProfile(army, currentGame().rules.model) };
}

/** The whole setup, in the shape the storage module saves. */
export const currentSetup = () => ({
  game: state.gameId,
  marchCapacity: state.marchCapacity,
  capacityBonus: state.capacityBonus,
  bonuses: state.bonuses.map(bonusEffect),
  compositions: state.compositions,
});

/** Puts a setup read from a save or a file on the page; false when a bonus cannot be shown as a row. */
export function applySetup(setup) {
  const rows = setup.bonuses.map(bonusRow);
  if (rows.includes(null)) return false;
  const compositions = setup.compositions.length ? setup.compositions : emptyCompositions();
  const compare = [0, Math.min(1, compositions.length - 1)];
  const { game, marchCapacity, capacityBonus } = setup;
  Object.assign(state, { gameId: game, marchCapacity, capacityBonus, bonuses: rows, compositions, active: 0, compare });
  resetPicker();
  return true;
}
