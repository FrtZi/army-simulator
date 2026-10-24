// Heroes (warlords) in a composition (D-26): at most `heroesPerArmy` of them, each at its level; they fight like
// a group of one troop, with their own stats at that level; and the composition activates at most
// `talentsPerArmy` of the bonuses they offer, a bonus two heroes offer counting once, at its strongest.
// The rules are facts of the game (data/<game>/game.json, heroRules); the warlords come from warlords.json.

const HERO = "hero"; // a hero's unit type: no troop bonus targets it (open question 14: talents on troops only)

/** A level as the game shows it: rank 1 to `ranks`, and the level within the rank (level 12 = rank 3, level 2). */
export function rankOf(level, { levelsPerRank }) {
  return { rank: Math.ceil(level / levelsPerRank), level: ((level - 1) % levelsPerRank) + 1 };
}

/** The level from a rank and a level within it. */
export const levelOf = (rank, rankLevel, { levelsPerRank }) => (rank - 1) * levelsPerRank + rankLevel;

/**
 * A hero at its level, as a unit the engine fights with: its tier and its own stats at that level, its power
 * where a troop has its power per troop. A battle line holds one of it.
 */
export function heroUnit(warlord, level) {
  const at = (values) => values[level - 1];
  const stats = Object.fromEntries(Object.entries(warlord.stats).map(([stat, values]) => [stat, at(values)]));
  return {
    id: warlord.id,
    labels: warlord.labels,
    alignment: warlord.alignment,
    rarity: warlord.rarity,
    unitType: HERO,
    level,
    tier: at(warlord.tier),
    stats: { ...stats, squadPower: at(warlord.power) },
  };
}

/**
 * Every talent the heroes offer at their levels, once each: a talent two heroes offer is kept at its strongest
 * value (D-26). heroes: [{ warlord, level }] → [{ id, percent, from: [warlord ids] }].
 */
export function offeredTalents(heroes) {
  const offered = new Map();
  for (const { warlord, level } of heroes) {
    for (const [id, values] of Object.entries(warlord.talents)) {
      const percent = values[level - 1];
      if (percent === null) continue;
      const known = offered.get(id);
      if (!known || Math.abs(percent) > Math.abs(known.percent)) {
        offered.set(id, { id, percent, from: [...(known?.from ?? []), warlord.id] });
      } else known.from.push(warlord.id);
    }
  }
  return [...offered.values()];
}

/**
 * The chosen talents as effects (the engine's bonus shape). A talent the engine cannot apply yet (a bonus that
 * counts only in some battles, open question 16) gives none: it is returned among `inactive`.
 */
export function talentEffects(chosen, offered, talents, talentCodes) {
  const effects = [];
  const inactive = [];
  for (const id of chosen) {
    const talent = offered.find((entry) => entry.id === id);
    if (!talent) continue;
    const shape = talents.find((entry) => entry.id === id) ?? talentCodes.find((entry) => entry.id === id);
    if (!shape?.stat) {
      inactive.push(id);
      continue;
    }
    effects.push({ stat: shape.stat, percent: talent.percent, ...(shape.target && { target: shape.target }) });
  }
  return { effects, inactive };
}

/** What breaks the rules in a composition's heroes and talents, as codes the page translates. */
export function heroProblems({ heroes, talents }, warlords, rules) {
  const problems = [];
  const levels = rules.ranks * rules.levelsPerRank;
  if (heroes.length > rules.heroesPerArmy) problems.push({ code: "too-many-heroes", max: rules.heroesPerArmy });
  if (new Set(heroes.map((hero) => hero.id)).size < heroes.length) problems.push({ code: "same-hero-twice" });
  for (const { id, level } of heroes) {
    if (!warlords.has(id)) problems.push({ code: "unknown-hero", id });
    else if (!Number.isInteger(level) || level < 1 || level > levels) problems.push({ code: "hero-level", id });
  }
  if (talents.length > rules.talentsPerArmy) problems.push({ code: "too-many-talents", max: rules.talentsPerArmy });
  if (new Set(talents).size < talents.length) problems.push({ code: "same-talent-twice" });
  if (problems.length) return problems;
  const offered = offeredTalents(heroes.map(({ id, level }) => ({ warlord: warlords.get(id), level })));
  return talents
    .filter((id) => !offered.some((entry) => entry.id === id))
    .map((id) => ({ code: "talent-not-offered", id }));
}
