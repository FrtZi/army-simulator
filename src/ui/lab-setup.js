// The player's saved setup in the Battle lab (CFG-04, D-27): with "Load your setup" on, each thing the setup holds
// replaces the lab's: a composition plays only the heroes owned, each at the setup's level; the setup's march
// capacity (base, bonus) and its bonuses count instead of those entered in the lab. What the setup does not hold,
// the lab's own values still give. Off, the lab plays freely. Always the saved setup, never unsaved edits.
// The state is passed in, so state.js can use these without importing back.
import { resolveSources } from "../engine/index.js";

const owned = (state) => new Map(state.savedPlayerSetup.warlords.map((warlord) => [warlord.id, warlord.level]));

/** The composition as it plays: with the setup on, only the heroes owned, each at the setup's level. */
export function asPlayed(composition, state) {
  if (!state.useSetup) return composition;
  const levels = owned(state);
  const heroes = (composition.heroes ?? [])
    .filter((hero) => levels.has(hero.id))
    .map((hero) => ({ id: hero.id, level: levels.get(hero.id) }));
  return { ...composition, heroes };
}

/** The composition's heroes the setup leaves out, as they are not owned (none with the setup off). */
export const notOwned = (composition, state) =>
  state.useSetup ? (composition.heroes ?? []).filter((hero) => !owned(state).has(hero.id)) : [];

/** Whether the setup gives this capacity value ("base", "bonusPercent"): then the lab's field shows it, locked. */
export const fromSetup = (state, field) => state.useSetup && state.savedPlayerSetup.capacity[field] !== undefined;

/** The march capacity in play: each value the setup holds, else the lab's. */
export const capacityInPlay = (state) => ({
  base: fromSetup(state, "base") ? state.savedPlayerSetup.capacity.base : state.marchCapacity,
  percent: fromSetup(state, "bonusPercent") ? state.savedPlayerSetup.capacity.bonusPercent : state.capacityBonus,
});

/** Whether the setup's bonuses replace the lab's: when it is on and holds some. */
export const setupBonuses = (state) => state.useSetup && state.savedPlayerSetup.bonuses.length > 0;

/**
 * Whether the switch can be turned on: something is saved in Your setup, in any section, those to come included (a
 * list of sections here once forgot the rituals and buildings: DEF-036).
 */
export const hasSavedSetup = (state) =>
  Object.entries(state.savedPlayerSetup).some(
    ([section, value]) => section !== "game" && value !== null && Object.keys(value).length > 0,
  );

/** The bonuses in battle of the saved setup's rituals and buildings at their levels, with the setup on (BONUS-04, 07). */
export function setupSourceEffects(state, game) {
  if (!state.useSetup) return [];
  const { rituals, buildings } = state.savedPlayerSetup;
  return resolveSources([
    { kind: "ritual", catalogue: { effects: game.rituals.effects, entries: game.rituals.rituals }, levels: rituals },
    {
      kind: "building",
      catalogue: { effects: game.structures.effects, entries: game.structures.structures },
      levels: buildings,
    },
    { kind: "champion", catalogue: game.champion, gear: championGear(state), part: "general" },
  ]);
}

/** The gear the saved setup's champion wears, or none. */
export const championGear = (state) => state.savedPlayerSetup.champion?.gear ?? [];

/**
 * The bonuses of the champion's gear for the troops of the march it leads (D-30): only with the setup
 * loaded, and only for a composition it leads.
 */
export function championMarchEffects(state, game, composition) {
  if (!state.useSetup || !composition.ledByChampion) return [];
  return resolveSources([{ kind: "champion", catalogue: game.champion, gear: championGear(state), part: "march" }]);
}
