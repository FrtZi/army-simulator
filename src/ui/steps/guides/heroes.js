// The heroes' guide (GUIDE-02): the warlords found by god, rarity or name, each marked when in the player's saved
// setup; the one chosen in detail at a rank and level (its own by default when owned, else the highest): power,
// tier, its talents with the level that unlocks each and their value then and at most, its stats, and its power at
// the end of each rank.
import { escape, options } from "../../dom.js";
import { label, nameOf, number, searchable, tierName } from "../../format.js";
import { currentGame, state } from "../../state.js";
import { levelOf, rankOf } from "../../../engine/index.js";
import { talentName } from "../heroes/draw.js";
import { t } from "../../texts/index.js";

const rules = () => currentGame().game.heroRules;
const maxLevel = () => rules().ranks * rules().levelsPerRank;
const owned = () => new Map(state.savedPlayerSetup.warlords.map((warlord) => [warlord.id, warlord.level]));
const at = (level) => t("guides.at", rankOf(level, rules()));
const yours = (level) =>
  `<span class="badge-yours"><span aria-hidden="true">✓</span> ${escape(t("guides.yours", rankOf(level, rules())))}</span>`;
const numbers = (count) => Array.from({ length: count }, (_, index) => [index + 1, String(index + 1)]);

/** The warlords the filters and the search let through, in the game's order. */
export function guideHeroes() {
  const { god, rarity, search } = state.guide;
  const query = searchable(search.trim());
  return [...currentGame().warlords.values()].filter(
    (warlord) =>
      (!god || warlord.alignment === god) &&
      (!rarity || warlord.rarity === rarity) &&
      (!query || Object.values(warlord.labels).some((name) => searchable(name).includes(query))),
  );
}

export function heroListHtml() {
  const mine = owned();
  const shown = guideHeroes();
  if (!shown.length) return `<li class="empty">${escape(t("guides.none"))}</li>`;
  return shown
    .map(
      (
        warlord,
      ) => `<li><button type="button" class="guide-hero god-${warlord.alignment}" id="guide-hero-${warlord.id}" data-guide-hero="${warlord.id}" aria-current="${warlord.id === state.guide.hero}">
        <span class="name">${escape(label(warlord))}</span>${mine.has(warlord.id) ? yours(mine.get(warlord.id)) : ""}
        <span class="meta">${escape(`${nameOf("alignments", warlord.alignment)} · ${nameOf("rarities", warlord.rarity)}`)}</span>
      </button></li>`,
    )
    .join("");
}

function talentsTable(warlord, index) {
  const rows = Object.entries(warlord.talents).map(([id, values]) => {
    const now = values[index];
    const value =
      now === null ? `<span aria-hidden="true">🔒</span> ${escape(t("guides.locked"))}` : `+${number(now, 1)} %`;
    return `<tr${now === null ? ' class="locked"' : ""}><td>${escape(talentName(id))}</td><td>${escape(at(values.findIndex((v) => v !== null) + 1))}</td>
      <td class="num">${value}</td><td class="num">+${number(values.at(-1), 1)} %</td></tr>`;
  });
  const head = ["guides.talent", "guides.from", "guides.now", "guides.most"].map(
    (key, column) => `<th scope="col"${column > 1 ? ' class="num"' : ""}>${escape(t(key))}</th>`,
  );
  return `<table class="guide-table"><thead><tr>${head.join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function statsTable(warlord, index) {
  const rows = Object.entries(warlord.stats).map(
    ([id, values]) =>
      `<tr><td>${escape(nameOf("troopStats", id))}</td><td class="num">${number(values[index])}</td><td class="num">${number(values.at(-1))}</td></tr>`,
  );
  const head = [t("guides.stat"), t("guides.now"), t("guides.atMax", { max: maxLevel() })].map(
    (text, column) => `<th scope="col"${column ? ' class="num"' : ""}>${escape(text)}</th>`,
  );
  return `<table class="guide-table"><thead><tr>${head.join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function rankStrip(warlord, rank) {
  const ends = Array.from({ length: rules().ranks }, (_, index) => {
    const power = warlord.power[levelOf(index + 1, rules().levelsPerRank, rules()) - 1];
    const here = index + 1 === rank ? ' class="here" aria-current="true"' : "";
    return `<li${here}>${escape(t("guides.rankEnd", { rank: index + 1 }))}<b>${number(power)}</b></li>`;
  });
  return `<ol class="rank-strip">${ends.join("")}</ol>`;
}

const figure = (name, value, key) =>
  `<div class="metric${key ? " key" : ""}"><span class="metric-label">${escape(name)}</span><span class="metric-value">${escape(value)}</span></div>`;

/** The hero chosen, in detail at the level chosen. */
export function heroDetailHtml(warlord) {
  const mine = owned().get(warlord.id);
  const level = state.guide.level ?? mine ?? maxLevel();
  const index = level - 1;
  const { rank, level: inRank } = rankOf(level, rules());
  const unlocked = Object.values(warlord.talents).filter((values) => values[index] !== null).length;
  const fights = t("guides.fights", {
    god: nameOf("alignments", warlord.alignment),
    rarity: nameOf("rarities", warlord.rarity),
    from: nameOf("tiers", warlord.tier[0]),
    to: nameOf("tiers", warlord.tier.at(-1)),
  });
  return `<h3 id="guide-hero-title">${escape(label(warlord))} ${mine ? yours(mine) : ""}</h3>
    <p class="meta">${escape(fights)}</p>
    <div class="guide-level">
      <div class="field"><label for="guide-rank">${escape(t("guides.rank"))}</label><select id="guide-rank">${options(numbers(rules().ranks), rank)}</select></div>
      <div class="field"><label for="guide-level">${escape(t("guides.level"))}</label><select id="guide-level">${options(numbers(rules().levelsPerRank), inRank)}</select></div>
      <span class="meta">${escape(t("guides.levelOf", { level, max: maxLevel() }))}</span>
    </div>
    <div class="metrics">
      ${figure(t("guides.power"), number(warlord.power[index]), true)}
      ${figure(t("guides.tier"), tierName(warlord.tier[index]))}
      ${figure(t("guides.unlocked"), t("guides.unlockedOf", { n: unlocked, total: Object.keys(warlord.talents).length }))}
    </div>
    <h4>${escape(t("guides.talents"))}</h4>${talentsTable(warlord, index)}
    <h4>${escape(t("guides.stats"))}</h4>${statsTable(warlord, index)}
    <h4>${escape(t("guides.ranks"))}</h4>${rankStrip(warlord, rank)}`;
}

/** The filters: god, rarity (each "every one" or one value) and the search. */
export function heroFiltersHtml() {
  const { game } = currentGame();
  const choice = (id, key, list, value) =>
    `<div class="field"><label for="${id}">${escape(t(key))}</label><select id="${id}">${options(
      [["", t("guides.every")], ...game[list].map((entry) => [entry.id, label(entry)])],
      value,
    )}</select></div>`;
  return `<div class="guide-filters">
    ${choice("guide-god", "guides.god", "alignments", state.guide.god)}
    ${choice("guide-rarity", "guides.rarity", "rarities", state.guide.rarity)}
    <div class="field"><label for="guide-search">${escape(t("guides.search"))}</label><input id="guide-search" type="search" autocomplete="off" value="${escape(state.guide.search)}" /></div>
  </div>`;
}
