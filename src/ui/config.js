// Every tunable value of the interface. Game facts are not here: they come from data/<game>/.
export const CONFIG = {
  languages: ["en", "fr"],
  locales: { en: "en-GB", fr: "fr-FR" },
  languageKey: "army-simulator.language", // the language chosen (LANG-02)
  foldKey: "army-simulator.folded", // the blocks folded (FOLD-01): a convenience, this browser only
  defaultMarchCapacity: 50000,
  newTroopCount: 1000,
  newBonus: { stat: "meleeAttack", percent: 10, filter: "all", value: "" },
  // what a bonus can target (one filter per bonus on the page; the engine accepts several)
  bonusFilters: ["unitTypes", "alignments", "tiers", "attackTypes", "buildings"],
  // the picker's filters: troop field → vocabulary list in game.json
  pickerFilters: { building: "buildings", tier: "tiers", alignment: "alignments", unitType: "unitTypes" },
  heroFilters: { alignment: "alignments", rarity: "rarities" }, // the hero picker's filters (D-26)
  newHeroLevel: 1, // a hero added starts at rank 1, level 1: the player sets its level
  // the setup's sections not entered on the page yet, and the version of the site that brings each (D-27)
  setupComing: { bonuses: "next" },
  percentStep: 0.5,
  // the map to reach a ritual (GUIDE-07): each node's size and the gaps between them, in pixels
  ritualMap: { nodeWidth: 168, nodeHeight: 56, gapX: 18, gapY: 40 },
  compositionNames: ["A", "B"], // the compositions a new page starts with; the player adds more (D-19)
};
