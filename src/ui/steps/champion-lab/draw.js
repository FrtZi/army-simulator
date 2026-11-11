// The Champion lab (BONUS-09, BL-30, Frantz 2026-11-11): the champion at a level, two gear sets side by side with every
// bonus they give, and its two skill trees. It starts from the saved setup and saves nothing.
import { byId, escape, options } from "../../dom.js";
import { nameOf, number, tierName } from "../../format.js";
import { currentGame } from "../../state.js";
import { lab } from "./lab.js";
import { t } from "../../texts/index.js";
import { drawGear } from "./gear.js";
import { drawSkills } from "./skills.js";

const champion = () => currentGame().champion.champion;

const metric = (key, value, isKey = false) =>
  `<div class="metric${isKey ? " key" : ""}"><span class="metric-label">${escape(t(key))}</span><span class="metric-value">${escape(value)}</span></div>`;

/** The champion at the level chosen: power, tier, the points of its two trees, its stats. */
function drawFigures() {
  const index = lab().level - 1;
  const own = champion();
  const rows = Object.entries(own.stats).map(
    ([id, values]) =>
      `<tr><td>${escape(nameOf("troopStats", id))}</td><td class="num">${number(values[index])}</td></tr>`,
  );
  byId("clab-figures").innerHTML = `<div class="metrics">
      ${metric("guides.power", number(own.power[index]), true)}
      ${metric("guides.tier", tierName(own.tier[index]))}
      ${metric("clab.championPoints", number(own.skillPoints[index]))}
      ${metric("clab.conquestPoints", number(own.monsterSkillPoints[index]))}
    </div>
    <table class="guide-table"><thead><tr><th scope="col">${escape(t("guides.stat"))}</th><th scope="col" class="num">${escape(t("guides.now"))}</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

export function drawChampionLab() {
  const levels = Array.from({ length: champion().power.length }, (_, index) => [index + 1, String(index + 1)]);
  byId("clab-level").innerHTML = options(levels, lab().level);
  drawFigures();
  drawGear();
  drawSkills();
}
