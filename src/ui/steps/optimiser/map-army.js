// The army chosen, drawn (SIM-22, D-51): its heroes in their gods' colours, its troops as one bar by god, its power
// two ways as two bars (the game's, and with every bonus, SIM-20), and what weighs most as one bar by source. Every
// mark has its words beside it; the widths are raw shares (DEF-051), sized after drawing.
import { escape } from "../../dom.js";
import { label, nameOf, number } from "../../format.js";
import { SOURCES } from "../../optimiser-detail.js";
import { currentGame } from "../../state.js";
import { t } from "../../texts/index.js";
import { godClass } from "./blocks.js";

const raw = (share) => Math.round(Math.max(0, share) * 1000) / 10;

/** The troops' shares by god, the largest first: [[god, share]]. */
function godShares(troops) {
  const { units } = currentGame().catalogue;
  const all = Object.values(troops).reduce((sum, count) => sum + count, 0) || 1;
  const gods = new Map();
  for (const [id, count] of Object.entries(troops)) {
    const god = units.get(id).alignment;
    gods.set(god, (gods.get(god) ?? 0) + count / all);
  }
  return [...gods].sort((a, b) => b[1] - a[1]);
}

/** A bar of parts, each a mark sized by its share of their sum (weights overlap: they do not add to 1), named under it. */
function stacked(parts) {
  const sum = parts.reduce((total, [, share]) => total + share, 0) || 1;
  const bar = parts.map(([mark, share]) => `<span class="${mark}" data-share="${raw(share / sum)}"></span>`).join("");
  const words = parts
    .map(([mark, , name]) => `<li><span class="opt-dot ${mark}" aria-hidden="true"></span>${escape(name)}</li>`)
    .join("");
  return `<div class="opt-stack" aria-hidden="true">${bar}</div><ul class="opt-legend">${words}</ul>`;
}

/** The power two ways, as two bars against the larger. */
function powerBars({ power }) {
  const most = Math.max(power.game, power.buffed) || 1;
  const row = (key, value, mark) =>
    `<li class="share"><span>${escape(t(`optimiser.${key}`))}</span><span class="share-bar" aria-hidden="true"><span class="${mark}" data-share="${raw(value / most)}"></span></span><span class="share-value">${escape(number(Math.round(value)))}</span></li>`;
  return `<ul class="opt-list">${row("powerGame", power.game, "stage-tried")}${row("powerBuffed", power.buffed, "stage-chosen")}</ul>`;
}

const KIND_OF_SOURCE = {
  talents: "kind-hero",
  champion: "kind-champion",
  rituals: "kind-ritual",
  buildings: "kind-structure",
  setup: "stage-tried",
};

/** The army chosen as a block's body, and its line: its first god's share and its power's ratio. */
export function armyPicture(result) {
  const { warlords } = currentGame();
  const heroes = result.composition.heroes
    .map(({ id, level }) => {
      const warlord = warlords.get(id);
      return `<li class="opt-chip"><span class="opt-dot ${godClass(warlord.alignment)}" aria-hidden="true"></span>${escape(`${label(warlord)} · ${level}`)}</li>`;
    })
    .join("");
  const gods = godShares(result.composition.troops).map(([god, share]) => [
    godClass(god),
    share,
    // below 1 %, one decimal: a god with a few troops is not "0 %"
    `${nameOf("alignments", god)} ${number(share * 100, share < 0.01 ? 1 : 0)} %`,
  ]);
  const { weights } = result.detail;
  const weighing = SOURCES.filter((source) => weights[source] > 0)
    .sort((a, b) => weights[b] - weights[a])
    .map((source) => [
      KIND_OF_SOURCE[source],
      weights[source],
      `${t(`optimiser.source-${source}`)} −${number(weights[source] * 100, 1)} %`,
    ]);
  const body = `<ul class="opt-chips">${heroes}</ul>${stacked(gods)}${powerBars(result.detail)}${
    weighing.length ? `<h4>${escape(t("optimiser.weighs"))}</h4>${stacked(weighing)}` : ""
  }`;
  const { power } = result.detail;
  const ratio = power.game > 0 ? number(power.buffed / power.game, 2) : "—";
  const line = t("optimiser.armyLine", { gods: gods[0]?.[2] ?? "—", ratio });
  return { body, line };
}
