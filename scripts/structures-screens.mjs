// The game's screens over cctools.cc's structures (D-50): a cell corrected, each troop building's bonuses given to
// the troops it produces (Frantz, 2026-11-17), and the march places and marches the Keep and the Conclave give, which
// the source holds at 0. Pure: the import applies it, a test checks structures.json carries it.

const kebab = (stat) => stat.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
const snake = (stat) => kebab(stat).replace(/-/g, "_");
const same = (tables) => tables.every((table) => JSON.stringify(table) === JSON.stringify(tables[0]));

/** A building's bonuses by stat, one effect each for the troops it produces; its tables of a stat must agree. */
function produced(structure, definitions) {
  const byStat = new Map();
  for (const [id, levels] of Object.entries(structure.effects)) {
    const { stat } = definitions.get(id);
    byStat.set(stat, [...(byStat.get(stat) ?? []), levels]);
  }
  return [...byStat].map(([stat, tables]) => {
    // the game shows one table per building: tables that differ are a misreading (the Bestiary's level 19)
    if (!same(tables)) throw new Error(`${structure.id}: its ${stat} tables differ`);
    const effect = { id: `${structure.id}-troops-${kebab(stat)}`, code: `produced_troops_${snake(stat)}`, stat };
    return { effect: { ...effect, target: { buildings: [structure.id] } }, levels: tables[0] };
  });
}

/** structures.json's data with the screens applied: { source, effects, other, structures }. */
export function withScreens(data, screens) {
  const structures = data.structures.map((entry) => ({
    ...entry,
    effects: Object.fromEntries(Object.entries(entry.effects).map(([id, levels]) => [id, [...levels]])),
    other: { ...entry.other },
  }));
  const byId = new Map(structures.map((entry) => [entry.id, entry]));
  for (const { structure, effect, level, value } of screens.corrections) {
    byId.get(structure).effects[effect][level - 1] = value;
  }
  const definitions = new Map(data.effects.map((effect) => [effect.id, effect]));
  const added = [];
  for (const id of screens.producedTroops) {
    const entry = byId.get(id);
    const bonuses = produced(entry, definitions);
    entry.effects = Object.fromEntries(bonuses.map(({ effect, levels }) => [effect.id, levels]));
    added.push(...bonuses.map(({ effect }) => effect));
  }
  // flat places, not a percent: kept apart from the bonuses, which the engine reads as percents
  for (const [id, places] of Object.entries(screens.places)) {
    delete byId.get(id).effects["march-capacity"];
    byId.get(id).places = places;
  }
  for (const [id, marches] of Object.entries(screens.marches)) byId.get(id).other["march-maximum"] = marches;
  const used = new Set(structures.flatMap((entry) => Object.keys(entry.effects)));
  const effects = [...data.effects, ...added]
    .filter((effect) => used.has(effect.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  return { ...data, source: `${data.source}; the game's screens over it (D-50)`, effects, structures };
}
