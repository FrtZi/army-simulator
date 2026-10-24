// A composition's heroes and talents (D-26), worked out from the game's data: which warlords at which levels,
// the talents they offer, the chosen ones as effects. The game is passed in, so state.js can use these without
// importing back; the controls that change heroes are in steps/heroes/bind.js.
import { heroUnit, offeredTalents, talentEffects } from "../engine/index.js";

/** The composition's heroes with their warlord's data: [{ warlord, level }] (an unknown id is left out). */
export const heroesOf = (composition, game) =>
  (composition.heroes ?? [])
    .map(({ id, level }) => ({ warlord: game.warlords.get(id), level }))
    .filter((hero) => hero.warlord);

/** The heroes as units the engine fights with, at their levels. */
export const heroUnits = (composition, game) =>
  heroesOf(composition, game).map(({ warlord, level }) => heroUnit(warlord, level));

/** The talents the heroes offer, and the chosen ones as effects (or inactive: open question 16). */
export function talentsOf(composition, game) {
  const offered = offeredTalents(heroesOf(composition, game));
  const chosen = composition.talents ?? [];
  return { offered, chosen, ...talentEffects(chosen, offered, game.talents, game.game.talentCodes) };
}

/** Drops the chosen talents no hero offers any more (a hero removed, or set to a lower level). */
export function pruneTalents(composition, game) {
  const { offered } = talentsOf(composition, game);
  composition.talents = (composition.talents ?? []).filter((id) => offered.some((talent) => talent.id === id));
}
