// Short definitions shown when hovering, focusing or tapping a dotted term, in both languages. `wiki: true`
// marks a definition taken from the game's community wiki (Combat Mechanics, CC-BY-SA, D-16); "to confirm"
// marks what nobody has checked yet (docs/open-questions.md).
export const WIKI_URL = "https://warhammer-cnc.fandom.com/wiki/Combat_Mechanics";

export const TERMS = {
  tier: {
    en: ["Tier", "A troop's rank, I to VI. In battle, damage hits the lowest tier first."],
    fr: ["Rang", "Le niveau d'une troupe, de I à VI. En combat, les dégâts touchent d'abord le rang le plus bas."],
    wiki: true,
  },
  power: {
    en: [
      "Power",
      "Power per troop (the sheet's \"squad power\"). An army's power = troops × power. The winner of a battle is the side that destroys more power.",
    ],
    fr: [
      "Puissance",
      "Puissance par troupe (la « puissance d'escouade » de la fiche). Celle d'une armée = troupes × puissance. Gagne le camp qui détruit le plus de puissance.",
    ],
    wiki: true,
  },
  attack: {
    en: ["Attack", "How well a troop hits, in melee or at range: one of the two numbers its damage comes from."],
    fr: [
      "Attaque",
      "La qualité des coups d'une troupe, en mêlée ou à distance : l'un des deux nombres d'où viennent ses dégâts.",
    ],
  },
  damage: {
    en: ["Damage", "How hard each hit is: the other number. Damage per strike multiplies attack by damage."],
    fr: ["Dégâts", "La force de chaque coup : l'autre nombre. Les dégâts par frappe multiplient attaque et dégâts."],
  },
  strike: {
    en: [
      "Damage per strike",
      "What a troop deals per round: attack × damage / 200, bonuses included. Each troop uses its stronger attack, melee or ranged; the army's is the sum.",
    ],
    fr: [
      "Dégâts par frappe",
      "Ce qu'une troupe inflige par round : attaque × dégâts / 200, bonus compris. Chaque troupe utilise sa meilleure attaque, mêlée ou distance ; celle de l'armée est la somme.",
    ],
    wiki: true,
  },
  armour: {
    en: ["Armour", "How well a troop resists: one of the two numbers of its effective health."],
    fr: ["Armure", "La résistance d'une troupe : l'un des deux nombres de sa santé effective."],
  },
  health: {
    en: ["Health", "A troop's hit points: the other number of its effective health."],
    fr: ["Santé", "Les points de vie d'une troupe : l'autre nombre de sa santé effective."],
  },
  ehp: {
    en: [
      "Effective health",
      "The damage a troop soaks before falling: armour × health / 40, bonuses included. The army's sum is its tanking.",
    ],
    fr: [
      "Santé effective",
      "Les dégâts qu'une troupe encaisse avant de tomber : armure × santé / 40, bonus compris. La somme pour l'armée, c'est son encaissement.",
    ],
    wiki: true,
  },
  morale: {
    en: [
      "Morale",
      "The chance (%) a squad holds when it loses more than 25 % in a round. If not, it is broken for the next round: it cannot strike, and only ranged attacks reach it. 100 or more: unbreakable.",
    ],
    fr: [
      "Moral",
      "La chance (%) qu'une escouade tienne quand elle perd plus de 25 % en un round. Sinon, elle est en déroute au round suivant : elle ne frappe pas, et seules les attaques à distance l'atteignent. 100 ou plus : inébranlable.",
    ],
    wiki: true,
  },
  speed: {
    en: ["Speed", "Marching speed. The slowest troop's is shown: the army likely moves at its pace (to confirm)."],
    fr: [
      "Vitesse",
      "Vitesse de marche. Celle de la troupe la plus lente est affichée : l'armée avance sans doute à son rythme (à confirmer).",
    ],
  },
  load: {
    en: ["Load", 'What a troop carries home after a victory (the French game calls it "Charger").'],
    fr: ["Charge", "Ce qu'une troupe rapporte après une victoire (« Charger » dans le jeu en français)."],
    wiki: true,
  },
  upkeep: {
    en: ["Food upkeep", "Food eaten per hour; the sheet gives it per 100 troops."],
    fr: ["Entretien", "Nourriture consommée par heure ; la fiche la donne pour 100 troupes."],
  },
  capacity: {
    en: ["March capacity", "The most troops one army can march with: your base, plus its bonus."],
    fr: ["Capacité de marche", "Le nombre maximum de troupes d'une armée en marche : votre base, plus son bonus."],
  },
  bonus: {
    en: ["Bonus", "A percentage added to a stat by heroes, rituals, buildings… Bonuses on the same stat add up."],
    fr: [
      "Bonus",
      "Un pourcentage ajouté à une stat par les héros, rituels, bâtiments… Les bonus d'une même stat s'additionnent.",
    ],
  },
};
