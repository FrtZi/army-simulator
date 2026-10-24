// The hero picker (ARMY-05): like the troop picker (D-15), a search and filters (god, rarity) over the game's
// warlords; tick several, add them at once. A composition takes at most `heroesPerArmy` heroes: once that many
// are in it or ticked, the others cannot be ticked, and the status says why.
import { byId, escape } from "../../dom.js";
import { CONFIG } from "../../config.js";
import { matchesFilters, multiFilter } from "../../filters.js";
import { label, nameOf, searchable } from "../../format.js";
import { troopIcon } from "../../icons.js";
import { currentGame, state } from "../../state.js";
import { t } from "../../texts/index.js";

const warlords = () => [...currentGame().warlords.values()];
const inComposition = (id) => state.composition.heroes.some((hero) => hero.id === id);

/** The warlords matching the search (in either language) and every filter set. */
export function matchingHeroes() {
  const { heroPicker } = state;
  const query = searchable(heroPicker.search.trim());
  return warlords().filter(
    (warlord) =>
      matchesFilters(warlord, heroPicker.filters) &&
      (!query || Object.values(warlord.labels).some((name) => searchable(name).includes(query))),
  );
}

/** True when the composition, with the heroes ticked, has as many heroes as it can take. */
const full = () =>
  state.composition.heroes.length + state.heroPicker.picked.size >= currentGame().game.heroRules.heroesPerArmy;

export function drawHeroFilters() {
  byId("hero-picker-filters").innerHTML = Object.keys(CONFIG.heroFilters)
    .map((field) => multiFilter("hero-filter", field, state.heroPicker.filters[field], warlords()))
    .join("");
}

function item(warlord) {
  const chosen = inComposition(warlord.id);
  const ticked = chosen || state.heroPicker.picked.has(warlord.id);
  const blocked = chosen || (full() && !ticked);
  const meta = [nameOf("alignments", warlord.alignment), nameOf("rarities", warlord.rarity)];
  if (chosen) meta.push(t("heroes.inArmy"));
  const icon = troopIcon({ alignment: warlord.alignment, unitType: "hero" });
  return `<li><label for="pick-hero-${warlord.id}"><input type="checkbox" id="pick-hero-${warlord.id}" data-pick-hero="${warlord.id}"${ticked ? " checked" : ""}${blocked ? " disabled" : ""} />
    ${icon}<span class="name">${escape(label(warlord))}</span><span class="visually-hidden">, </span><span class="meta">${escape(meta.join(" · "))}</span></label></li>`;
}

export function drawHeroPickerList() {
  const heroes = matchingHeroes();
  byId("hero-picker-list").innerHTML = heroes.length
    ? heroes.map(item).join("")
    : `<li class="empty">${escape(t("heroes.none"))}</li>`;
  const max = currentGame().game.heroRules.heroesPerArmy;
  byId("hero-picker-status").textContent = full() ? `ⓘ ${t("heroes.full", { max })}` : "";
}

export function drawHeroPickerButton() {
  const count = state.heroPicker.picked.size;
  byId("hero-picker-add").textContent = count ? t("heroes.add", { n: count }) : t("heroes.addNone");
}

export function drawHeroPicker() {
  const { open, search } = state.heroPicker;
  const toggle = byId("hero-picker-toggle");
  toggle.textContent = `${open ? "×" : "+"} ${t(open ? "heroes.close" : "heroes.open")}`;
  toggle.setAttribute("aria-expanded", String(open));
  byId("hero-picker").hidden = !open;
  byId("hero-picker-search").value = search;
  drawHeroFilters();
  drawHeroPickerList();
  drawHeroPickerButton();
}
