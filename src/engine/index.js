// The engine's public API: the only module the page and the tests import. Pure functions, no DOM, no file
// access: callers pass the game data (data/<game>/*.json) and the player's configuration.

export { TARGET_FIELDS, appliesTo } from "./targets.js";
export { resolveSources } from "./sources.js";
export { effectProblems } from "./bonuses.js";
export { bonusPercent, applyPercent, effectiveStats, marchCapacity } from "./stats.js";
export { fighters, indexCatalogue, summariseArmy } from "./army.js";
export { heroProblems, heroUnit, levelOf, offeredTalents, rankOf, talentEffects } from "./heroes.js";
export { damagePerTroop, healthPerTroop, tierFactor, attackMode, preferredMode } from "./combat.js";
export { simulateBattle } from "./battle.js";
export { armyDamage, armyHealth } from "./measures.js";
export { armyProfile } from "./profile.js";
export { COMPARED, compareArmies, verdict } from "./compare.js";
export { efficiency, rounds, balance, prosAndCons } from "./insights.js";
