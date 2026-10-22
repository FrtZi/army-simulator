// Les textes français des tableaux de bord (DASH-01 à DASH-05). Mêmes clés qu'en-dash.js.
export const FR_DASH = {
  "dash.title": "Tableaux de bord",
  "dash.hint": "Six vues de vos armées. Elles utilisent vos bonus, la composition en cours et les deux comparées.",
  "dash.efficiency": "Efficacité par place",
  "dash.rounds": "Bataille par round",
  "dash.balance": "Équilibre de l'armée",
  "dash.map": "Dégâts / encaissement",
  "dash.pros": "Forces et faiblesses",

  "efficiency.hint":
    "Ce que vaut une troupe dans votre armée, avec vos bonus : santé effective vers la droite, dégâts vers le haut. La capacité de marche compte les troupes quel que soit leur rang : un Maraudeur prend la place d'un Dragon. Plus c'est haut et à droite, plus chaque place rapporte.",

  "rounds.hint": "Les deux batailles de la comparaison, round par round : ce que perd chaque camp, et où.",
  "rounds.round": "Round",
  "rounds.lost": "{name} : troupes perdues",
  "rounds.byTier": "{name} : par rang",
  "rounds.power": "{name} : puissance perdue",
  "rounds.broken": "{name} : en déroute",

  "balance.hint": "Comment se répartit la puissance de la composition {name}, et où elle est faible.",
  "balance.tiers": "Par rang",
  "balance.alignments": "Par dieu",
  "balance.unitTypes": "Par type de troupe",
  "balance.modes": "Par attaque utilisée",
  "balance.ok": "Aucun point faible trouvé.",
  "warn.thin-front":
    "Première ligne fragile : le rang {tier} est touché en premier mais ne porte que {share} % de la santé effective.",
  "warn.unscreened-ranged":
    "Rang {tier} : uniquement des troupes à distance, rien devant elles : elles combattent en mêlée.",
  "warn.one-god": "{god} porte {share} % de la puissance : les bonus de {god} rapportent le plus.",
  "warn.low-morale": "Moral moyen {morale} : beaucoup d'escouades flancheront en subissant des pertes.",

  "map.hint":
    "Composition {name} : chaque type de troupe selon ses dégâts par troupe (en haut) et sa santé effective par troupe (à droite). Plus le point est gros, plus il y a de troupes.",
  "map.x": "Santé effective par troupe",
  "map.y": "Dégâts par troupe",
  "map.empty": "Ajoutez des troupes à la composition {name} pour les voir sur la carte.",
  "map.summary": "{count} types de troupes placés selon leurs dégâts et leur santé effective par troupe.",

  "pros.hint": "Composition {a} face à {b} : les chiffres où l'une devance l'autre de 10 % ou plus.",
  "pros.strengths": "Forces",
  "pros.weaknesses": "Faiblesses",
  "pros.none": "Rien ne ressort.",
  "pros.gap": "{figure} : {gap} %",
  "efficiency.summary": "{count} troupes placées selon leurs dégâts et leur santé effective par troupe.",
  "efficiency.legend":
    "Cerclées : les troupes de la composition {name}. Pointez un point (ou touchez-le) pour voir son nom.",
  "dash.raid": "Pillage",
  "raid.hint":
    "Ce qu'une troupe rapporte, avec vos bonus : la charge qu'elle ramène vers la droite, sa vitesse vers le haut. Les troupes rapides et qui portent beaucoup pillent le mieux ; une armée avance sans doute au rythme de sa troupe la plus lente (à confirmer).",
  "raid.x": "Charge par troupe",
  "raid.y": "Vitesse",
  "raid.summary": "{count} troupes placées selon leur vitesse et leur charge par troupe.",
  "zoom.hint": "Tracez un cadre sur le graphique pour zoomer.",
  "zoom.in": "Zoomer, vers le coin en bas à gauche",
  "zoom.out": "Dézoomer",
  "zoom.reset": "Voir tout le graphique",
  "efficiency.highlight": "Mettre en avant la composition {name}",
};
