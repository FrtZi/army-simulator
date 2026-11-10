// Your setup's troops owned (CFG-08, D-34): each troop or defence with its number as the Chaos Keep's Army tab shows
// it; a choice of the others, by type, adds one. A number typed is kept at once, unsaved until Save.
import { byId, escape } from "../../dom.js";
import { label, nameOf } from "../../format.js";
import { ICONS, troopIcon } from "../../icons.js";
import { currentGame, state } from "../../state.js";
import { t } from "../../texts/index.js";
import { ownable } from "../../../storage/setup-troops.js";
import { drawSetupStatus } from "./draw.js";

const owned = () => state.playerSetup.troops;
const troopOf = (id) => ownable(currentGame().catalogue).find((troop) => troop.id === id);

function row({ id, count }) {
  const troop = troopOf(id);
  const name = label(troop);
  return `<li class="army-line">${troopIcon(troop)}
    <div class="who"><span class="name">${escape(name)}</span><span class="meta">${escape(nameOf("unitTypes", troop.unitType))}</span></div>
    <label class="visually-hidden" for="setup-troop-${id}">${escape(t("setup.troopCountOf", { name }))}</label>
    <input id="setup-troop-${id}" data-setup-troop="${id}" type="number" min="0" step="1" inputmode="numeric" value="${count}" />
    <button type="button" class="icon" id="setup-troop-remove-${id}" data-setup-troop-remove="${id}" aria-label="${escape(t("setup.troopRemove", { name }))}">${ICONS.close}</button>
  </li>`;
}

/** The troops and defences not listed yet, by type in the game's order, for the choice that adds one. */
function addChoice() {
  const mine = new Set(owned().map((entry) => entry.id));
  const others = ownable(currentGame().catalogue).filter((troop) => !mine.has(troop.id));
  byId("setup-troop-add").disabled = others.length === 0;
  const groups = currentGame()
    .game.unitTypes.filter((type) => others.some((troop) => troop.unitType === type.id))
    .map((type) => {
      const choices = others
        .filter((troop) => troop.unitType === type.id)
        .sort((a, b) => label(a).localeCompare(label(b)))
        .map((troop) => `<option value="${troop.id}">${escape(label(troop))}</option>`);
      return `<optgroup label="${escape(label(type))}">${choices.join("")}</optgroup>`;
    });
  byId("setup-troop-select").innerHTML = groups.length
    ? groups.join("")
    : `<option value="">${escape(t("setup.allTroopsOwned"))}</option>`;
}

export function drawSetupTroops() {
  byId("setup-troop-list").innerHTML = owned().map(row).join("");
  byId("setup-troop-none").hidden = owned().length > 0;
  addChoice();
}

export function bindSetupTroops() {
  byId("setup-troop-add").addEventListener("click", () => {
    const id = byId("setup-troop-select").value;
    if (!id) return;
    state.playerSetup.troops = [...owned(), { id, count: 0 }];
    drawSetupTroops();
    drawSetupStatus();
    byId(`setup-troop-${id}`).focus();
  });
  byId("setup-troop-list").addEventListener("input", (event) => {
    const id = event.target.dataset.setupTroop;
    if (!id) return;
    const value = event.target.value === "" ? 0 : Number(event.target.value);
    const valid = Number.isInteger(value) && value >= 0;
    event.target.setAttribute("aria-invalid", String(!valid));
    if (!valid) return;
    owned().find((entry) => entry.id === id).count = value;
    drawSetupStatus();
  });
  byId("setup-troop-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-setup-troop-remove]");
    if (!button) return;
    state.playerSetup.troops = owned().filter((entry) => entry.id !== button.dataset.setupTroopRemove);
    drawSetupTroops();
    drawSetupStatus();
    byId("setup-troop-select").focus();
  });
}
