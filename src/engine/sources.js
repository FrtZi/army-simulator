// Turns a player's bonus sources into effects. One resolver per source kind: adding a kind (hero, ritual,
// champion, armour, building) means adding its resolver here and its id to `sourceKinds` in data/<game>/game.json
// (docs/data-model.md). The rest of the engine only ever sees effects.

const RESOLVERS = {
  // the totals the player copies from the in-game boost summary: already effects
  manual: (source) => source.effects,
};

/** Every effect of every source, in order. Throws on an unknown source kind. */
export function resolveSources(sources) {
  return sources.flatMap((source) => {
    const resolve = RESOLVERS[source.kind];
    if (!resolve) throw new Error(`Unknown bonus source kind "${source.kind}"`);
    return resolve(source);
  });
}
