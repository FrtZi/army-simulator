// Your setup's rituals and buildings (BONUS-04, BONUS-07, D-27): each entry's level typed as the game shows it, from
// 0 (not learnt or not built) to its last; the rituals one category at a time. A level typed is kept at once (a level
// 0 or an empty field takes the entry out), unsaved until Save; a value out of range is marked and not kept.
import { byId, escape, options } from "../../dom.js";
import { label } from "../../format.js";
import { currentGame, state } from "../../state.js";
import { t } from "../../texts/index.js";
import { drawSetupStatus } from "./draw.js";

/** Each section: the setup's list, the game's entries (the rituals of the category chosen), the ids' prefix. */
const SECTIONS = {
  rituals: {
    entries: () => currentGame().rituals.rituals.filter((ritual) => ritual.category === state.setupRitualCategory),
    prefix: "setup-ritual",
  },
  buildings: { entries: () => currentGame().structures.structures, prefix: "setup-building" },
};

const levelIn = (section, id) => state.playerSetup[section].find((entry) => entry.id === id)?.level ?? "";

function rowHtml(section, entry) {
  const { prefix } = SECTIONS[section];
  const max = entry.power.length;
  const name = label(entry);
  const battle = Object.keys(entry.effects).length ? t("guides.inBattle") : t("guides.notInBattle");
  return `<li class="setup-level-row">
    <span><span class="name">${escape(name)}</span> <span class="meta">${escape(battle)}</span></span>
    <label class="visually-hidden" for="${prefix}-${entry.id}">${escape(t("setup.levelOf", { name, max }))}</label>
    <input id="${prefix}-${entry.id}" type="number" min="0" max="${max}" step="1" inputmode="numeric" data-setup-level="${section}" data-id="${entry.id}" value="${levelIn(section, entry.id)}" />
    <span class="meta" aria-hidden="true">/ ${max}</span>
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
      .map((entry) => rowHtml(section, entry))
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
    });
  }
}
