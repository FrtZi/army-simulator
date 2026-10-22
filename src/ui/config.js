// Every tunable value of the interface. Game facts are not here: they come from data/<game>/.
export const CONFIG = {
  languages: ["en", "fr"],
  locales: { en: "en-GB", fr: "fr-FR" },
  languageKey: "army-simulator.language", // the only thing the page keeps in the browser (LANG-02)
  defaultMarchCapacity: 50000,
  newTroopCount: 1000,
  newBonus: { stat: "meleeAttack", percent: 10, filter: "all", value: "" },
  // what a bonus can target (one filter per bonus on the page; the engine accepts several)
  bonusFilters: ["unitTypes", "alignments", "tiers", "attackTypes", "buildings"],
  // the picker's filters: troop field → vocabulary list in game.json
  pickerFilters: { building: "buildings", tier: "tiers", alignment: "alignments", unitType: "unitTypes" },
  percentStep: 0.5,
  compositionNames: ["A", "B"], // the compositions a new page starts with; the player adds more (D-19)
};
