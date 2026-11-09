// The items' guide (GUIDE-04): every resource and item the game's costs name, found by kind or name; one in detail:
// where it drops (each place with its levels and the most it gives on average per hit, chest, spoil or champion,
// level by level on demand) and what asks for it (the heroes, rituals and structures whose levels cost it, worked out
// from our own data).
import { escape, options } from "../../dom.js";
import { label, number, searchable } from "../../format.js";
import { currentGame, state } from "../../state.js";
import { t } from "../../texts/index.js";

const AVERAGES = ["perHit", "perChest", "perSpoil", "perChampion", "perCompletion"];
const guide = () => state.guide.items;

/** The resources and items the filters and the search let through, by name. */
export function shownItems() {
  const { kind, search } = guide();
  const query = searchable(search.trim());
  return [...currentGame().items.values()]
    .filter((item) => (!kind || item.kind === kind) && (!query || searchable(label(item)).includes(query)))
    .sort((a, b) => label(a).localeCompare(label(b)));
}

export function itemListHtml() {
  const shown = shownItems();
  if (!shown.length) return `<li class="empty">${escape(t("guides.noneFound"))}</li>`;
  return shown
    .map(
      (
        item,
      ) => `<li><button type="button" class="guide-hero" id="guide-item-${item.id}" data-guide-item="${item.id}" aria-current="${item.id === guide().id}">
        <span class="name">${escape(label(item))}</span><span class="meta">${escape(t(`guides.kind-${item.kind}`))}</span></button></li>`,
    )
    .join("");
}

export function itemFiltersHtml() {
  const kinds = [
    ["", t("guides.every")],
    ["currency", t("guides.kind-currency")],
    ["item", t("guides.kind-item")],
  ];
  return `<div class="guide-filters">
    <div class="field"><label for="guide-items-kind">${escape(t("guides.kind"))}</label><select id="guide-items-kind" data-guide-items="kind">${options(kinds, guide().kind)}</select></div>
    <div class="field"><label for="guide-items-search">${escape(t("guides.searchName"))}</label><input id="guide-items-search" type="search" autocomplete="off" data-guide-items="search" value="${escape(guide().search)}" /></div>
  </div>`;
}

const averagesText = (drop) =>
  AVERAGES.filter((name) => drop[name])
    .map((name) => t(`guides.${name}`, { n: number(drop[name], 2) }))
    .join(", ");

/** Where the item drops: one line per place, its levels and its best drop; each level on demand. */
function dropsHtml(id) {
  const { places, items } = currentGame().itemSources;
  const drops = items[id] ?? [];
  if (!drops.length) return `<p class="hint">${escape(t("guides.dropsNowhere"))}</p>`;
  const byPlace = new Map();
  for (const drop of drops) byPlace.set(drop.place, [...(byPlace.get(drop.place) ?? []), drop]);
  const rows = [...byPlace].map(([placeId, list]) => {
    const place = places.find((entry) => entry.id === placeId);
    const levels = list.map((drop) => drop.level);
    const best = list.reduce((top, drop) =>
      AVERAGES.some((name) => (drop[name] ?? 0) > (top[name] ?? 0)) ? drop : top,
    );
    const each = list.map(
      (drop) => `<li>${escape(t("guides.atLevel", { level: drop.level, what: averagesText(drop) }))}</li>`,
    );
    return `<li><details><summary>${escape(t("guides.dropLine", { place: label(place), kind: t(`guides.place-${place.kind}`), from: Math.min(...levels), to: Math.max(...levels), best: averagesText(best) }))}</summary><ul>${each.join("")}</ul></details></li>`;
  });
  return `<ul class="guide-drops">${rows.join("")}</ul>`;
}

/** What asks for the item: each hero, ritual or structure whose levels cost it, with the quantity over all levels. */
function usesHtml(id) {
  const game = currentGame();
  const users = [
    ...[...game.warlords.values()].map((entry) => ({ entry, kind: "guides.heroes" })),
    ...game.rituals.rituals.map((entry) => ({ entry, kind: "guides.rituals" })),
    ...game.structures.structures.map((entry) => ({ entry, kind: "guides.buildings" })),
  ].filter(({ entry }) => entry.costs?.[id]);
  if (!users.length) return `<p class="hint">${escape(t("guides.usedNowhere"))}</p>`;
  const rows = users.map(({ entry, kind }) => {
    const total = entry.costs[id].reduce((sum, quantity) => sum + (quantity ?? 0), 0);
    return `<li>${escape(t("guides.useLine", { name: label(entry), kind: t(kind), total: number(total) }))}</li>`;
  });
  return `<ul class="guide-uses">${rows.join("")}</ul>`;
}

export function itemDetailHtml(item) {
  // focusable by script: a cost table's item name brings the focus here (GUIDE-04)
  return `<h3 id="guide-items-title" tabindex="-1">${escape(label(item))}</h3>
    <p class="meta">${escape(t(`guides.kind-${item.kind}`))}</p>
    <h4>${escape(t("guides.drops"))}</h4>${dropsHtml(item.id)}
    <h4>${escape(t("guides.uses"))}</h4>${usesHtml(item.id)}`;
}
