// Your setup's rituals and buildings (BONUS-04, BONUS-07, D-27): each entry's level typed as the game shows it, from
// 0 (not learnt or not built) to its last; the rituals one category at a time. A level typed is kept at once (a level
// 0 or an empty field takes the entry out), unsaved until Save; a value out of range is marked and not kept.
import { byId, escape, options } from "../../dom.js";
import { treeOrder } from "../../ritual-tree.js";
import { label } from "../../format.js";
import { currentGame, state } from "../../state.js";
import { t } from "../../texts/index.js";
import { drawSetupStatus } from "./draw.js";
import { mostCopies } from "../../../storage/setup-buildings.js";

/** Each section: the setup's list, the game's entries (the rituals of the category chosen), the ids' prefix. */
const SECTIONS = {
  rituals: {
    // in the order of the game's tree, each with its number, as the guides' map shows them (Frantz, 2026-11-10)
    entries: () =>
      treeOrder(currentGame().rituals.rituals.filter((ritual) => ritual.category === state.setupRitualCategory)),
    prefix: "setup-ritual",
  },
  buildings: {
    entries: () => currentGame().structures.structures.map((entry) => ({ entry })),
    prefix: "setup-building",
  },
};

const levelIn = (section, id) => state.playerSetup[section].find((entry) => entry.id === id)?.level ?? "";
const copiesOf = (id) => state.playerSetup.buildings.find((entry) => entry.id === id)?.copies ?? [];

/** A building the game lets you build more than once: a field per other copy, usable once the first has a level. */
function copiesHtml(entry, name, max) {
  const most = mostCopies(currentGame().game, entry.id);
  const first = levelIn("buildings", entry.id) !== "";
  if (most < 2) return "";
  const fields = Array.from({ length: most - 1 }, (_, index) => {
    const copy = index + 2;
    const id = `setup-building-${entry.id}-copy-${copy}`;
    return `<label class="visually-hidden" for="${id}">${escape(t("setup.copyOf", { name, copy, max }))}</label>
    <input id="${id}" class="setup-copy" type="number" min="0" max="${max}" step="1" inputmode="numeric" data-setup-copy="${entry.id}" data-copy="${index}" value="${copiesOf(entry.id)[index] ?? ""}"${first ? "" : " disabled"} />`;
  });
  return `<span class="setup-copies"><span class="meta">${escape(t("setup.otherCopies", { most }))}</span>${fields.join("")}</span>`;
}

function rowHtml(section, { entry, number }) {
  const { prefix } = SECTIONS[section];
  const max = entry.power.length;
  const name = label(entry);
  const battle = Object.keys(entry.effects).length ? t("guides.inBattle") : t("guides.notInBattle");
  return `<li class="setup-level-row">
    <span>${number ? `<span class="tree-number">${number}</span> ` : ""}<span class="name">${escape(name)}</span> <span class="meta">${escape(battle)}</span></span>
    <label class="visually-hidden" for="${prefix}-${entry.id}">${escape(t("setup.levelOf", { name, max }))}</label>
    <input id="${prefix}-${entry.id}" type="number" min="0" max="${max}" step="1" inputmode="numeric" data-setup-level="${section}" data-id="${entry.id}" value="${levelIn(section, entry.id)}" />
    <span class="meta" aria-hidden="true">/ ${max}</span>
    ${section === "buildings" ? copiesHtml(entry, name, max) : ""}
  </li>`;
}

export function drawSetupLevelled() {
  const { categories } = currentGame().rituals;
  state.setupRitualCategory ??= categories[0].id;
  byId("setup-ritual-category").innerHTML = options(
    categories.map((category) => [category.id, label(category)]),
    state.setupRitualCategory,
  );
  for (const section of Object.keys(SECTIONS)) {
    byId(`${section === "rituals" ? "setup-ritual" : "setup-building"}-list`).innerHTML = SECTIONS[section]
      .entries()
      .map((row) => rowHtml(section, row))
      .join("");
  }
}

/** A level typed: kept when a whole number in range (0 or empty: the entry out), else marked and not kept. */
function typed(input) {
  const section = input.dataset.setupLevel;
  const max = Number(input.max);
  const value = input.value === "" ? 0 : Number(input.value);
  const valid = Number.isInteger(value) && value >= 0 && value <= max;
  input.setAttribute("aria-invalid", String(!valid));
  if (!valid) return;
  const others = state.playerSetup[section].filter((entry) => entry.id !== input.dataset.id);
  const kept = state.playerSetup[section].find((entry) => entry.id === input.dataset.id);
  if (value === 0) state.playerSetup[section] = others;
  else if (kept) kept.level = value;
  else state.playerSetup[section] = [...others, { id: input.dataset.id, level: value }];
  for (const copy of document.querySelectorAll(`[data-setup-copy="${input.dataset.id}"]`)) copy.disabled = value === 0;
  drawSetupStatus();
}

/** Another copy's level typed: the copies kept in order, an empty field or 0 taking that copy out (D-33). */
function typedCopy(input) {
  const max = Number(input.max);
  const value = input.value === "" ? 0 : Number(input.value);
  const valid = Number.isInteger(value) && value >= 0 && value <= max;
  input.setAttribute("aria-invalid", String(!valid));
  const building = state.playerSetup.buildings.find((entry) => entry.id === input.dataset.setupCopy);
  if (!valid || !building) return;
  const copies = [...(building.copies ?? [])];
  copies[Number(input.dataset.copy)] = value;
  const kept = copies.filter((level) => level > 0);
  if (kept.length) building.copies = kept;
  else delete building.copies;
  drawSetupStatus();
}

export function bindSetupLevelled() {
  byId("setup-ritual-category").addEventListener("change", (event) => {
    state.setupRitualCategory = event.target.value;
    drawSetupLevelled();
  });
  for (const id of ["setup-rituals", "setup-buildings"]) {
    byId(id).addEventListener("input", (event) => {
      if (event.target.dataset.setupLevel) typed(event.target);
      if (event.target.dataset.setupCopy) typedCopy(event.target);
    });
  }
}
