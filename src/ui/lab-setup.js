// The player's saved setup in the Battle lab (CFG-04, D-27): with "Load your setup" on, each thing the setup holds
// replaces the lab's: a composition plays only the heroes owned, each at the setup's level; the setup's march
// capacity (base, bonus) and its bonuses count instead of those entered in the lab. What the setup does not hold,
// the lab's own values still give. Off, the lab plays freely. Always the saved setup, never unsaved edits.
// The state is passed in, so state.js can use these without importing back.

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

/** Whether the switch can be turned on: something is saved in Your setup. */
export const hasSavedSetup = (state) =>
  state.savedPlayerSetup.warlords.length > 0 ||
  state.savedPlayerSetup.bonuses.length > 0 ||
  Object.keys(state.savedPlayerSetup.capacity).length > 0;
