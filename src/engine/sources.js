// Turns a player's bonus sources into effects. One resolver per source kind: adding a kind (hero, ritual,
// champion, armour, building) means adding its resolver here and its id to `sourceKinds` in data/<game>/game.json
// (docs/data-model.md). The rest of the engine only ever sees effects.

/**
 * A levelled source (rituals, buildings: D-29): each entry the player has at a level gives the bonuses in battle of
 * that level. `catalogue`: { effects: the effects' definitions, entries: the rituals or structures }; `levels`:
 * [{ id, level }]. An unknown id or a level 0 gives nothing.
 */
function levelled({ catalogue, levels }) {
  const definitions = new Map(catalogue.effects.map((effect) => [effect.id, effect]));
  const entries = new Map(catalogue.entries.map((entry) => [entry.id, entry]));
  return levels.flatMap(({ id, level }) => {
    const entry = entries.get(id);
    if (!entry || level < 1) return [];
    return Object.entries(entry.effects).flatMap(([effectId, values]) => {
      const percent = values[Math.min(level, values.length) - 1];
      if (percent === null) return [];
      const { stat, target } = definitions.get(effectId);
      return [{ stat, percent, ...(target && { target }) }];
    });
  });
}

/**
 * The champion's gear (BL-13, open question 22): each piece worn at its level, and each set by the most pieces of it
 * worn (the highest tier reached counts; a flat bonus is not one of our effects). `part`: "general", the bonuses on
 * troops everywhere; "march", those for the troops of the march it leads. `catalogue`: champion.json; `gear`:
 * [{ id, level }].
 */
function champion({ catalogue, gear, part }) {
  const definitions = new Map(catalogue[part === "march" ? "march" : "effects"].map((effect) => [effect.id, effect]));
  const pieces = new Map(catalogue.pieces.map((piece) => [piece.id, piece]));
  const worn = gear.filter(({ id, level }) => pieces.has(id) && level >= 1);
  const effectOf = (id, percent) => {
    const { stat, target } = definitions.get(id);
    return { stat, percent, ...(target && { target }) };
  };
  const fromPieces = worn.flatMap(({ id, level }) =>
    Object.entries(pieces.get(id)[part === "march" ? "march" : "effects"] ?? {})
      .map(([effect, values]) => [effect, values[Math.min(level, values.length) - 1]])
      .filter(([, percent]) => percent !== null)
      .map(([effect, percent]) => effectOf(effect, percent)),
  );
  const fromSets = catalogue.sets.flatMap((set) => {
    const count = worn.filter(({ id }) => set.pieces.includes(id)).length;
    return Object.entries(set.bonuses)
      .filter(([effect]) => definitions.has(effect))
      .map(([effect, byCount]) => [
        effect,
        Object.keys(byCount)
          .map(Number)
          .filter((needed) => needed <= count),
      ])
      .filter(([effect, reached]) => reached.length && typeof set.bonuses[effect][Math.max(...reached)] === "number")
      .map(([effect, reached]) => effectOf(effect, set.bonuses[effect][Math.max(...reached)]));
  });
  return [...fromPieces, ...fromSets];
}

const RESOLVERS = {
  // the totals the player copies from the in-game boost summary: already effects
  manual: (source) => source.effects,
  ritual: levelled,
  building: levelled,
  champion,
};

/** Every effect of every source, in order. Throws on an unknown source kind. */
export function resolveSources(sources) {
  return sources.flatMap((source) => {
    const resolve = RESOLVERS[source.kind];
    if (!resolve) throw new Error(`Unknown bonus source kind "${source.kind}"`);
    return resolve(source);
  });
}
