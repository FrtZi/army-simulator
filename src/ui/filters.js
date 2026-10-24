// The filters shared by the pickers and the charts: building, tier, god, troop type for troops; god and rarity for
// heroes. Each is a drop-down of tick boxes (several values at once); nothing ticked means all. A list stays open while its boxes are ticked,
// even though the part around it is redrawn.
import { CONFIG } from "./config.js";
import { escape } from "./dom.js";
import { nameOf, tierName } from "./format.js";
import { currentGame, state } from "./state.js";
import { t } from "./texts/index.js";

const TITLES = { building: "filter.buildings", tier: "filter.tiers", alignment: "filter.alignments" };
TITLES.unitType = "filter.unitTypes";
TITLES.rarity = "filter.rarities";
const LISTS = { ...CONFIG.pickerFilters, ...CONFIG.heroFilters }; // each filter → its vocabulary list
const NAMES_SHOWN = 2; // more ticked values are summed up as "3 selected"

const troops = () => [...currentGame().catalogue.units.values()];

/** The values of a filter the entries (troops, or heroes) actually use, as [value, name] pairs. */
function choices(field, entries) {
  const list = LISTS[field];
  const used = currentGame().game[list].filter((entry) => entries.some((item) => item[field] === entry.id));
  return used.map((entry) => [String(entry.id), field === "tier" ? tierName(entry.id) : nameOf(list, entry.id)]);
}

function summary(pairs, selected) {
  if (!selected.length) return t("filter.any");
  if (selected.length > NAMES_SHOWN) return t("filter.several", { n: selected.length });
  return pairs
    .filter(([value]) => selected.includes(value))
    .map(([, name]) => name)
    .join(", ");
}

/** One filter: its title, the drop-down's summary of what is ticked, and its tick boxes. */
export function multiFilter(prefix, field, selected = [], entries = troops()) {
  const id = `${prefix}-${field}`;
  const title = t(TITLES[field]);
  const pairs = choices(field, entries);
  const boxes = pairs.map(
    ([value, name]) =>
      `<label for="${id}-${value}"><input type="checkbox" id="${id}-${value}" data-multi="${field}" value="${escape(value)}"${selected.includes(value) ? " checked" : ""} /> ${escape(name)}</label>`,
  );
  return `<div class="field multi"><span class="field-title" aria-hidden="true">${escape(title)}</span>
    <details class="multi-select" id="${id}"${state.openFilter === id ? " open" : ""}>
      <summary><span class="visually-hidden">${escape(title)}: </span>${escape(summary(pairs, selected))}</summary>
      <fieldset class="multi-options"><legend class="visually-hidden">${escape(title)}</legend>${boxes.join("")}</fieldset>
    </details></div>`;
}

/** Ticks or unticks a value of a filter (filters: field → list of values). */
export function toggleChoice(filters, box) {
  const values = new Set(filters[box.dataset.multi] ?? []);
  if (box.checked) values.add(box.value);
  else values.delete(box.value);
  filters[box.dataset.multi] = [...values];
}

/** True when the troop matches every filter (an empty list matches all). */
export const matchesFilters = (unit, filters) =>
  Object.entries(filters).every(([field, values]) => !values?.length || values.includes(String(unit[field])));

/** Remembers which drop-down is open, so a redraw keeps it open (toggle events do not bubble: captured). */
export function rememberOpenFilters() {
  document.addEventListener(
    "toggle",
    (event) => {
      if (!event.target.classList?.contains("multi-select")) return;
      if (event.target.open) state.openFilter = event.target.id;
      else if (state.openFilter === event.target.id) state.openFilter = null;
    },
    true,
  );
}
