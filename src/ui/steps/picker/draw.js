// The troop picker (D-15): opened by "Add troops", a search and four filters over the game's troops; tick
// several, add them at once. Troops already in the army are shown ticked, and cannot be added twice.
import { byId, escape } from "../../dom.js";
import { CONFIG } from "../../config.js";
import { matchesFilters, multiFilter } from "../../filters.js";
import { label, searchable, troopMeta } from "../../format.js";
import { troopIcon } from "../../icons.js";
import { currentGame, state } from "../../state.js";
import { t } from "../../texts/index.js";

/** The troops matching the search (in either language) and every filter set. */
export function matchingTroops() {
  const { picker } = state;
  const query = searchable(picker.search.trim());
  return [...currentGame().catalogue.units.values()].filter(
    (unit) =>
      matchesFilters(unit, picker.filters) &&
      (!query || Object.values(unit.labels).some((name) => searchable(name).includes(query))),
  );
}

/** The picker's filters: building, tier, god, type, several values each. */
export function drawFilters() {
  byId("picker-filters").innerHTML = Object.keys(CONFIG.pickerFilters)
    .map((field) => multiFilter("filter", field, state.picker.filters[field]))
    .join("");
}

export function drawPickerList() {
  const troops = matchingTroops();
  byId("picker-list").innerHTML = troops.length
    ? troops
        .map((unit) => {
          const inArmy = unit.id in state.troops;
          const checked = inArmy || state.picker.picked.has(unit.id) ? " checked" : "";
          const note = inArmy ? ` · ${t("picker.inArmy")}` : "";
          return `<li><label for="pick-${unit.id}"><input type="checkbox" id="pick-${unit.id}" data-pick="${unit.id}"${checked}${inArmy ? " disabled" : ""} />
            ${troopIcon(unit)}<span class="name">${escape(label(unit))}</span><span class="visually-hidden">, </span><span class="meta">${escape(troopMeta(unit) + note)}</span></label></li>`;
        })
        .join("")
    : `<li class="empty">${escape(t("picker.none"))}</li>`;
}

export function drawPickerButton() {
  const count = state.picker.picked.size;
  byId("picker-add").textContent = count ? t("picker.add", { n: count }) : t("picker.addNone");
}

export function drawPicker() {
  const { open, search } = state.picker;
  const toggle = byId("picker-toggle");
  toggle.textContent = `${open ? "×" : "+"} ${t(open ? "picker.close" : "picker.open")}`;
  toggle.setAttribute("aria-expanded", String(open));
  byId("picker").hidden = !open;
  byId("picker-search").value = search;
  drawFilters();
  drawPickerList();
  drawPickerButton();
}
