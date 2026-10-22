// The single mutable state of the page, and the values derived from it. Controls write the state; drawing
// functions read it (and these derived values) and write the DOM.
import { CONFIG } from "./config.js";
import { GAMES } from "./games.js";
import { armyProfile, compareArmies, effectProblems, summariseArmy } from "../engine/index.js";

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

const emptyCompositions = () => CONFIG.compositionNames.map((name) => ({ name, troops: {} }));

export const state = {
  language: startLanguage(),
  gameId: GAMES[0].id,
  marchCapacity: CONFIG.defaultMarchCapacity,
  capacityBonus: 0,
  bonuses: [], // each { stat, percent, filter, value }; filter "all" or one of CONFIG.bonusFilters
  compositions: emptyCompositions(), // each { name, troops: troop id → count, in the order added }
  active: 0, // the composition being edited
  compare: [0, 1], // the two compositions compared
  dashboard: "efficiency", // the dashboard tab shown
  efficiencyFilters: {}, // the charts' filters: building, tier, alignment → the values ticked
  highlightComposition: false, // the charts darken the troops outside the composition being edited
  chartZoom: {}, // per dashboard: the ranges zoomed into ({ x0, x1, y0, y1 }), or nothing for the whole chart
  openFilter: null, // the filter drop-down open, kept open across redraws
  profileDetails: new Set(), // the key columns of the profile table whose details are open
  picker: { open: false, picked: new Set(), search: "", filters: {} },
  /** The troops of the composition being edited. */
  get troops() {
    return this.compositions[this.active].troops;
  },
};

const resetPicker = () => Object.assign(state.picker, { open: false, picked: new Set(), search: "", filters: {} });

/** Starts over with a new game: its troops and bonuses would mean nothing in another one. */
export function selectGame(id) {
  Object.assign(state, { gameId: id, bonuses: [], compositions: emptyCompositions(), active: 0, compare: [0, 1] });
  resetPicker();
}

export const currentGame = () => GAMES.find((game) => game.id === state.gameId);

/** A bonus row of the page as an engine effect. */
export function bonusEffect(bonus) {
  if (bonus.filter === "all") return { stat: bonus.stat, percent: bonus.percent };
  const value = bonus.filter === "tiers" ? Number(bonus.value) : bonus.value;
  return { stat: bonus.stat, percent: bonus.percent, target: { [bonus.filter]: [value] } };
}

/** An engine effect as a bonus row; null when its target has several filters (the page shows one per row). */
export function bonusRow(effect) {
  const filters = Object.entries(effect.target ?? {});
  if (filters.length > 1 || filters.some(([, values]) => values.length !== 1)) return null;
  const [filter, [value] = [""]] = filters[0] ?? ["all"];
  return { stat: effect.stat, percent: effect.percent, filter, value: String(value) };
}

export const capacityEffect = () => ({ stat: "marchCapacity", percent: state.capacityBonus });

/** The problems of an effect in the current game (empty when it is valid). */
export function problemsOf(effect) {
  const { game, catalogue } = currentGame();
  return effectProblems(effect, game, catalogue);
}

/** Every valid effect: a bonus with a problem is shown with it, and left out of the figures. */
export function validEffects() {
  return [...state.bonuses.map(bonusEffect), capacityEffect()].filter((effect) => !problemsOf(effect).length);
}

const summarise = (troops) =>
  summariseArmy(troops, currentGame().catalogue, validEffects(), { marchCapacity: state.marchCapacity });

/** The composition being edited as the engine sees it, and its profile. */
export function currentArmy() {
  const army = summarise(state.troops);
  return { army, profile: armyProfile(army, currentGame().rules.model) };
}

/** The names of the two compositions compared. */
export const comparedNames = () => state.compare.map((index) => state.compositions[index].name || String(index + 1));

/** The two compositions chosen for the comparison (figures and battles); null when it is the same one twice. */
export const comparison = () =>
  state.compare[0] === state.compare[1]
    ? null
    : compareArmies(...state.compare.map((index) => summarise(state.compositions[index].troops)), currentGame().rules);

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
