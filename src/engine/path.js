// The path (SIM-12, docs/spec/optimiser.md, D-42): what to get or raise next, by its gain on the army found, the cost
// shown and not weighed (Frantz, 2026-11-16: gain first). Its first steps are the heroes: one not owned, got at level
// 1; one owned, raised to its next level. A step's gain is the best the army found reaches with it, its troops kept:
// the step's hero in place of each hero of the trio, or beside them with a place free, or itself raised when it is in
// the trio; the talents chosen again each time by the exact score.
import { chooseTalents } from "./optimise.js";

const better = (a, b) => (b.score > a.score ? b : a);

/** The trios a hero can join: itself raised when in the trio; else in place of each one, or beside with room. */
function triosWith(trio, hero, size) {
  const at = trio.findIndex(({ id }) => id === hero.id);
  if (at >= 0) return [trio.map((one, index) => (index === at ? hero : one))];
  const swaps = trio.map((_, index) => trio.map((one, other) => (other === index ? hero : one)));
  return trio.length < size ? [...swaps, [...trio, hero]] : swaps;
}

/**
 * The best the composition reaches with this hero at this level: { composition, score }. `options`: score (the exact
 * judge), offered(heroes) (the talents a trio offers, [{ id }]), heroesPerArmy, talentsPerArmy.
 */
export function bestWithHero(composition, hero, { score, offered, heroesPerArmy, talentsPerArmy }) {
  return triosWith(composition.heroes, hero, heroesPerArmy)
    .map((heroes) => {
      const ids = offered(heroes).map(({ id }) => id);
      return chooseTalents({ ...composition, heroes }, ids, { score, max: talentsPerArmy });
    })
    .reduce(better);
}

/** Each hero's step: one not owned, got at level 1; one owned below the `top` level, its next level. */
export const heroSteps = (ids, owned, top) =>
  ids
    .map((id) => ({ id, from: owned.get(id) ?? 0 }))
    .filter(({ from }) => from < top)
    .map(({ id, from }) => ({ kind: "hero", id, from, to: from + 1 }));

/**
 * The path's heroes: each step's gain on the army found ({ composition, score }), the most first, with the score it is
 * measured against (`base`) and the composition it reaches. A hero owned is first judged at its own level too, so its
 * gain is its next level's alone, not a trio the search missed. A step that gains nothing yet is kept: settled, its
 * troops may fill a capacity it raised (D-45).
 */
export function heroPath(found, steps, options) {
  return steps
    .map((step) => {
      const raised = bestWithHero(found.composition, { id: step.id, level: step.to }, options);
      const now = step.from ? bestWithHero(found.composition, { id: step.id, level: step.from }, options) : found;
      const base = Math.max(found.score, now.score);
      return { ...step, gain: raised.score - base, base, composition: raised.composition };
    })
    .sort((a, b) => b.gain - a.gain);
}
