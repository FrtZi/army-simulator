// The champion's guide (GUIDE-03, BL-13): the champion level by level (power, tier, experience, skill points, its own
// stats), its gear piece by piece (each level's bonuses, cost and the structures it requires) and the sets (their
// bonuses by the number of pieces worn), and how its bonuses are applied (D-30).
import { escape, options } from "../../dom.js";
import { label, nameOf, number, searchable } from "../../format.js";
import { currentGame, state } from "../../state.js";
import { t } from "../../texts/index.js";
import { costsTable } from "./costs.js";

const VIEWS = ["champion", "gear", "sets"];
const guide = () => state.guide.champion;
const data = () => currentGame().champion;
const numbers = (count) => Array.from({ length: count }, (_, index) => [index + 1, String(index + 1)]);
const field = (id, key, control) => `<div class="field"><label for="${id}">${escape(t(key))}</label>${control}</div>`;

/** A bonus by its id: one of our effects named by stat and troops, else its name from the file. */
function bonusName(id) {
  const effect = data().effects.find((entry) => entry.id === id);
  if (!effect) return label(data().other.find((entry) => entry.id === id)) || id;
  const [filter, [value] = []] = Object.entries(effect.target ?? {})[0] ?? [];
  return t("talents.label", {
    stat: nameOf("troopStats", effect.stat),
    target: filter ? nameOf(filter, value) : t("talents.march"),
  });
}

/** The pieces the slot filter and the search let through, by name. */
export function shownPieces() {
  const query = searchable(guide().search.trim());
  return data()
    .pieces.filter(
      (piece) => (!guide().slot || piece.slot === guide().slot) && (!query || searchable(label(piece)).includes(query)),
    )
    .sort((a, b) => label(a).localeCompare(label(b)));
}

export function championFiltersHtml() {
  const views = VIEWS.map((view) => [view, t(`guides.view-${view}`)]);
  const slots = data().slots.map((slot) => [slot, t(`guides.slot-${slot}`)]);
  const viewField = field(
    "guide-champion-view",
    "guides.show",
    `<select id="guide-champion-view" data-guide-champion="view">${options(views, guide().view)}</select>`,
  );
  if (guide().view !== "gear") return `<div class="guide-filters">${viewField}</div>`;
  return `<div class="guide-filters">${viewField}
    ${field("guide-champion-slot", "guides.slot", `<select id="guide-champion-slot" data-guide-champion="slot">${options([["", t("guides.every")], ...slots], guide().slot)}</select>`)}
    ${field("guide-champion-search", "guides.searchName", `<input id="guide-champion-search" type="search" autocomplete="off" data-guide-champion="search" value="${escape(guide().search)}" />`)}
  </div>`;
}

const row = (cells) =>
  `<tr>${cells.map((cell, index) => `<td${index ? ' class="num"' : ""}>${cell}</td>`).join("")}</tr>`;
const table = (head, rows) =>
  `<table class="guide-table"><thead><tr>${head.map((text, index) => `<th scope="col"${index ? ' class="num"' : ""}>${escape(text)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;

/** The champion at the level chosen: its figures, its own stats now and at most. */
export function championDetailHtml() {
  const { champion } = data();
  const max = champion.power.length;
  const level = Math.min(guide().level ?? max, max);
  const index = level - 1;
  const stats = Object.entries(champion.stats).map(([id, values]) =>
    row([escape(nameOf("troopStats", id)), number(values[index]), number(values.at(-1))]),
  );
  const other = Object.entries(champion.other).map(([id, values]) =>
    row([escape(bonusName(id)), number(values[index]), number(values.at(-1))]),
  );
  return `<h3 id="guide-champion-title">${escape(t("guides.view-champion"))}</h3>
    <div class="guide-level">${field("guide-champion-level", "guides.levelChoice", `<select id="guide-champion-level" data-guide-champion="level">${options(numbers(max), level)}</select>`)}
      <span class="meta">${escape(t("guides.levelOf", { level, max }))}</span></div>
    <div class="metrics">
      <div class="metric key"><span class="metric-label">${escape(t("guides.power"))}</span><span class="metric-value">${number(champion.power[index])}</span></div>
      <div class="metric"><span class="metric-label">${escape(t("guides.experience"))}</span><span class="metric-value">${number(champion.xp[index])}</span></div>
      <div class="metric"><span class="metric-label">${escape(t("guides.skillPoints"))}</span><span class="metric-value">${number(champion.skillPoints[index])}</span></div>
    </div>
    <h4>${escape(t("guides.stats"))}</h4>${table([t("guides.stat"), t("guides.now"), t("guides.atMax", { max })], [...stats, ...other])}
    <p class="hint">${escape(t("guides.championSkills"))}</p>`;
}

/** A piece at the level chosen: its bonuses now and at most, the structures it requires, what it costs. */
export function pieceDetailHtml(piece) {
  const max = Object.values({ ...piece.effects, ...piece.other })[0]?.length ?? 1;
  const level = Math.min(guide().level ?? 1, max);
  const index = level - 1;
  const bonuses = Object.entries({ ...piece.effects, ...piece.other }).map(([id, values]) =>
    row([
      escape(bonusName(id)),
      values[index] === null ? "—" : `+${number(values[index], 2)} %`,
      `+${number(values.at(-1), 2)} %`,
    ]),
  );
  const needs = Object.entries(piece.requires.structure ?? {})
    .filter(([, levels]) => levels[index] !== null)
    .map(
      ([id, levels]) =>
        `<li>${escape(t("guides.needs", { name: label(currentGame().structures.structures.find((entry) => entry.id === id)) || id, level: levels[index] }))}</li>`,
    );
  const sets = piece.sets.map((id) => label(data().sets.find((set) => set.id === id))).join(", ");
  return `<h3 id="guide-champion-title">${escape(label(piece))}</h3>
    <p class="meta">${escape([t(`guides.slot-${piece.slot}`), nameOf("rarities", piece.rarity), sets].filter(Boolean).join(" · "))}</p>
    <div class="guide-level">${field("guide-champion-level", "guides.levelChoice", `<select id="guide-champion-level" data-guide-champion="level">${options(numbers(max), level)}</select>`)}</div>
    <h4>${escape(t("guides.bonuses"))}</h4>${table([t("guides.bonus"), t("guides.now"), t("guides.most")], bonuses)}
    <p class="hint">${escape(t("guides.howApplied"))}</p>
    <h4>${escape(t("guides.requires"))}</h4>${needs.length ? `<ul class="guide-requires">${needs.join("")}</ul>` : `<p class="hint">${escape(t("guides.nothingRequired"))}</p>`}
    ${costsTable(piece, level, 0, t("guides.fromStart"))}`;
}

/** A set: its pieces, and what it gives for each number of pieces worn. */
export function setDetailHtml(set) {
  const counts = [...new Set(Object.values(set.bonuses).flatMap((byCount) => Object.keys(byCount)))].sort();
  const value = (entry) =>
    entry === undefined ? "—" : typeof entry === "object" ? `+${number(entry.flat)}` : `+${number(entry, 2)} %`;
  const rows = Object.entries(set.bonuses).map(([id, byCount]) =>
    row([escape(bonusName(id)), ...counts.map((count) => value(byCount[count]))]),
  );
  const pieces = set.pieces.map(
    (id) => `<li>${escape(label(data().pieces.find((piece) => piece.id === id)) || id)}</li>`,
  );
  return `<h3 id="guide-champion-title">${escape(label(set))}</h3>
    <h4>${escape(t("guides.setPieces"))}</h4><ul class="guide-uses">${pieces.join("")}</ul>
    <h4>${escape(t("guides.setBonuses"))}</h4>${table([t("guides.bonus"), ...counts.map((count) => t("guides.piecesWorn", { n: count }))], rows)}`;
}
