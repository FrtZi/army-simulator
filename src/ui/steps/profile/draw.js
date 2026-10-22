// Step 4 · the profile of the composition being edited (SIM-01, SIM-08): power, damage per strike, tanking
// (effective health, from health and armour), morale, speed, load, upkeep; then the table (table.js).
import { byId, escape } from "../../dom.js";
import { number } from "../../format.js";
import { term } from "../../glossary/tooltip.js";
import { currentArmy, state } from "../../state.js";
import { t } from "../../texts/index.js";
import { profileTable } from "./table.js";

// each metric: its glossary term (if any), its value and, for some, a detail line
const METRICS = [
  ["power", "power", (p) => number(p.power)],
  ["troops", null, (p) => number(p.troops)],
  [
    "damage",
    "strike",
    (p) => number(p.damage.best),
    (p) => t("profile.damageSplit", { melee: number(p.damage.melee), ranged: number(p.damage.ranged) }),
  ],
  [
    "health",
    "ehp",
    (p) => number(p.health),
    (p) => t("profile.healthSplit", { health: number(p.rawHealth), armour: number(p.averageArmour, 1) }),
  ],
  ["morale", "morale", (p) => number(p.morale, 1)],
  ["speed", "speed", (p) => number(p.slowestSpeed)],
  ["load", "load", (p) => number(p.load)],
  ["food", "upkeep", (p) => number(p.foodPerHour)],
];

function metrics(profile) {
  return METRICS.map(([key, termKey, value, detail]) => {
    const title = termKey ? term(termKey, t(`profile.${key}`)) : escape(t(`profile.${key}`));
    return `<div class="metric" data-metric="${key}"><span class="metric-label">${title}</span>
      <span class="metric-value">${escape(value(profile))}</span>${detail ? `<span class="metric-detail">${escape(detail(profile))}</span>` : ""}</div>`;
  }).join("");
}

export function drawProfile() {
  const { profile } = currentArmy();
  const composition = state.compositions[state.active];
  byId("profile-composition").textContent = t("composition.tab", { name: composition.name || state.active + 1 });
  byId("profile-metrics").innerHTML = metrics(profile);
  byId("profile-lines").innerHTML = profile.lines.length ? profileTable(profile.lines) : "";
}
