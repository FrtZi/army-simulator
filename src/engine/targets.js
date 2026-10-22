// Which troops an effect applies to. A target lists filters; a troop is selected when every given filter
// contains the troop's value for that field. An empty or missing target selects every troop.

/** Each target filter, and the troop field it reads. */
export const TARGET_FIELDS = {
  tiers: "tier",
  recruitments: "recruitment",
  attackTypes: "attackType",
  unitTypes: "unitType",
  alignments: "alignment",
  buildings: "building",
  units: "id",
};

/** True when the effect's target selects this troop (or defence). */
export function appliesTo(effect, troop) {
  return Object.entries(effect.target ?? {}).every(([filter, values]) => values.includes(troop[TARGET_FIELDS[filter]]));
}
