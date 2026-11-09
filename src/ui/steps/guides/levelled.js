// The guides of the rituals and the structures (GUIDE-03): both are levelled entries of the same shape (D-29), so one
// list serves them: found by category (rituals), by whether they give bonuses in battle, or by name; each marked
// with its level when in the player's saved setup.
import { escape, options } from "../../dom.js";
import { label, searchable } from "../../format.js";
import { currentGame, state } from "../../state.js";
import { t } from "../../texts/index.js";

/** Each levelled guide: where its entries are, its grouping filter if any, and its section in the setup. */
export const LEVELLED = {
  rituals: {
    entries: () => currentGame().rituals.rituals,
    groups: () => currentGame().rituals.categories,
    setup: "rituals",
  },
  buildings: { entries: () => currentGame().structures.structures, groups: null, setup: "buildings" },
};

export const guideOf = (kind) => state.guide.levelled[kind];
/** The player's saved level of an entry, or 0. */
export const savedLevel = (kind, id) =>
  state.savedPlayerSetup[LEVELLED[kind].setup].find((entry) => entry.id === id)?.level ?? 0;

/** The entries the filters and the search let through, by name in the page's language. */
export function shownEntries(kind) {
  const { group, battle, search } = guideOf(kind);
  const query = searchable(search.trim());
  return LEVELLED[kind]
    .entries()
    .filter(
      (entry) =>
        (!group || entry.category === group) &&
        (!battle || Object.keys(entry.effects).length > 0) &&
        (!query || Object.values(entry.labels).some((name) => searchable(name).includes(query))),
    )
    .sort((a, b) => label(a).localeCompare(label(b)));
}

export function entryListHtml(kind) {
  const shown = shownEntries(kind);
  if (!shown.length) return `<li class="empty">${escape(t("guides.noneFound"))}</li>`;
  return shown
    .map((entry) => {
      const mine = savedLevel(kind, entry.id);
      const yours = mine
        ? `<span class="badge-yours"><span aria-hidden="true">✓</span> ${escape(t("guides.yoursLevel", { level: mine }))}</span>`
        : "";
      const battle = Object.keys(entry.effects).length ? t("guides.inBattle") : t("guides.notInBattle");
      const meta = [t("guides.levels", { levels: entry.power.length }), battle];
      return `<li><button type="button" class="guide-hero" id="guide-${kind}-${entry.id}" data-guide-entry="${entry.id}" aria-current="${entry.id === guideOf(kind).id}">
        <span class="name">${escape(label(entry))}</span>${yours}<span class="meta">${escape(meta.join(" · "))}</span></button></li>`;
    })
    .join("");
}

/** The filters: the category (rituals), battle bonuses only, the search. */
export function entryFiltersHtml(kind) {
  const { group, battle, search } = guideOf(kind);
  const groups = LEVELLED[kind].groups?.();
  const groupField = groups
    ? `<div class="field"><label for="guide-${kind}-group">${escape(t("guides.category"))}</label><select id="guide-${kind}-group" data-guide-field="group">${options(
        [["", t("guides.every")], ...groups.map((entry) => [entry.id, label(entry)])],
        group,
      )}</select></div>`
    : "";
  return `<div class="guide-filters">
    ${groupField}
    <div class="field guide-check"><label for="guide-${kind}-battle"><input id="guide-${kind}-battle" type="checkbox" data-guide-field="battle"${battle ? " checked" : ""} /> ${escape(t("guides.battleOnly"))}</label></div>
    <div class="field"><label for="guide-${kind}-search">${escape(t("guides.searchName"))}</label><input id="guide-${kind}-search" type="search" autocomplete="off" data-guide-field="search" value="${escape(search)}" /></div>
  </div>`;
}
