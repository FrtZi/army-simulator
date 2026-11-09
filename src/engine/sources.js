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

const RESOLVERS = {
  // the totals the player copies from the in-game boost summary: already effects
  manual: (source) => source.effects,
  ritual: levelled,
  building: levelled,
};

/** Every effect of every source, in order. Throws on an unknown source kind. */
export function resolveSources(sources) {
  return sources.flatMap((source) => {
    const resolve = RESOLVERS[source.kind];
    if (!resolve) throw new Error(`Unknown bonus source kind "${source.kind}"`);
    return resolve(source);
  });
}
