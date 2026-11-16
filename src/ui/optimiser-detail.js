// The army found in detail (SIM-19, SIM-20, D-48): the bonuses each source gives it, what each weighs, the rituals
// acting on it, the bonuses summed by stat, its power two ways. Weighed on damage × health (the all-round score)
// whatever the goal, the troops and heroes kept: what the army would lose without a source, everything else the same.
import { CONFIG } from "./config.js";
import { bonusEffect, currentGame, state } from "./state.js";
import { capacityInPlay, championMarchEffects, setupBonuses, setupSources } from "./lab-setup.js";
import { heroUnits, talentsOf } from "./heroes.js";
import { appliesTo, armyProfile, profileScore, resolveSources, summariseArmy } from "../engine/index.js";

export const SOURCES = ["talents", "champion", "rituals", "buildings", "setup"];

/** Each source's effects on the army found: its talents, its champion's (its march's too), rituals, buildings, setup. */
function effectsBySource(composition) {
  const game = currentGame();
  const sources = setupSources(state, game);
  const played = { ...state.composition, ...composition };
  return {
    talents: talentsOf(played, game).effects,
    champion: [...resolveSources(sources.champion), ...championMarchEffects(state, game, played)],
    rituals: resolveSources(sources.rituals),
    buildings: resolveSources(sources.buildings),
    setup: setupBonuses(state) ? state.savedPlayerSetup.bonuses : state.bonuses.map(bonusEffect),
  };
}

/** The army with these effects, and its all-round score (damage × health). */
function judged(composition, effects) {
  const game = currentGame();
  const limits = { marchCapacity: capacityInPlay(state).base };
  const army = summariseArmy(composition.troops, game.catalogue, effects, limits, heroUnits(composition, game));
  return { army, score: profileScore(armyProfile(army, game.rules.model), CONFIG.optimiser.guess) };
}

/** What the score would lose without these effects, as a share of it (0 to 1). */
const weightOf = (composition, all, without) => 1 - judged(composition, without).score / all.score;

/** The rituals held that touch a troop of the army, each with its level, its effects there and its weight. */
function ritualsActing(composition, effects, all) {
  const game = currentGame();
  const units = Object.keys(composition.troops).map((id) => game.catalogue.units.get(id));
  const others = SOURCES.filter((source) => source !== "rituals").flatMap((source) => effects[source]);
  return state.savedPlayerSetup.rituals
    .map(({ id, level }) => {
      const own = resolveSources([{ ...setupSources(state, game).rituals[0], levels: [{ id, level }] }]);
      const acting = own.filter((effect) => units.some((unit) => appliesTo(effect, unit)));
      const rest = state.savedPlayerSetup.rituals.filter((ritual) => ritual.id !== id);
      const without = resolveSources([{ ...setupSources(state, game).rituals[0], levels: rest }]);
      return { id, level, effects: acting, weight: weightOf(composition, all, [...others, ...without]) };
    })
    .filter((ritual) => ritual.effects.length)
    .sort((a, b) => b.weight - a.weight);
}

/** The bonuses on the army summed by stat and troops, one figure per source: [{ stat, target, by: { source: % } }]. */
function synthesis(composition, effects) {
  const units = Object.keys(composition.troops).map((id) => currentGame().catalogue.units.get(id));
  const rows = new Map();
  for (const source of SOURCES) {
    for (const effect of effects[source]) {
      const counts = effect.stat === "marchCapacity" || units.some((unit) => appliesTo(effect, unit));
      if (!counts) continue;
      const key = JSON.stringify([effect.stat, effect.target ?? null]);
      const row = rows.get(key) ?? { stat: effect.stat, target: effect.target, by: {} };
      row.by[source] = (row.by[source] ?? 0) + effect.percent;
      rows.set(key, row);
    }
  }
  return [...rows.values()];
}

/** The detail of the army found: its sources' weights, the rituals acting on it, its synthesis, its power two ways. */
export function detailOf(composition) {
  const effects = effectsBySource(composition);
  const all = judged(
    composition,
    SOURCES.flatMap((source) => effects[source]),
  );
  const weights = Object.fromEntries(
    SOURCES.map((source) => [
      source,
      weightOf(
        composition,
        all,
        SOURCES.filter((other) => other !== source).flatMap((other) => effects[other]),
      ),
    ]),
  );
  // the power with every bonus: the game's (troops and heroes), times what the bonuses add to damage × health
  const bare = judged(composition, []);
  const power = { game: all.army.power, buffed: bare.score > 0 ? (all.army.power * all.score) / bare.score : 0 };
  return {
    weights,
    rituals: ritualsActing(composition, effects, all),
    synthesis: synthesis(composition, effects),
    power,
  };
}
