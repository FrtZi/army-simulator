// Your setup's controls (CFG-04, D-27): add, remove and level a hero; type the march capacity; Save and Discard.
// Every edit shows at once, unsaved; leaving the page with unsaved changes asks first.
import { byId } from "../../dom.js";
import { CONFIG } from "../../config.js";
import { currentGame, state } from "../../state.js";
import { levelOf } from "../../../engine/index.js";
import { discardSetupChanges, savePlayerSetup, unsavedCount } from "../../player-setup.js";
import { drawSetup, drawSetupStatus } from "./draw.js";
import { renderAll } from "../../render.js";

function bindWarlords() {
  byId("setup-warlord-add").addEventListener("click", () => {
    const id = byId("setup-warlord-select").value;
    if (!id) return;
    state.playerSetup.warlords.push({ id, level: CONFIG.newHeroLevel });
    drawSetup();
  });
  const list = byId("setup-warlord-list");
  list.addEventListener("change", (event) => {
    const id = event.target.dataset.setupRank ?? event.target.dataset.setupLevel;
    const warlord = state.playerSetup.warlords.find((entry) => entry.id === id);
    if (!warlord) return;
    const rank = Number(byId(`setup-rank-${id}`).value);
    warlord.level = levelOf(rank, Number(byId(`setup-level-${id}`).value), currentGame().game.heroRules);
    drawSetup();
  });
  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-setup-remove]");
    if (!button) return;
    const { setupRemove: id } = button.dataset;
    state.playerSetup.warlords = state.playerSetup.warlords.filter((warlord) => warlord.id !== id);
    drawSetup();
    byId("setup-warlord-select").focus(); // the button pressed is gone: the focus goes to the add choice
  });
}

/** A capacity field typed in: a number is kept, an empty field removes the value. */
function bindCapacity(id, field) {
  byId(id).addEventListener("input", (event) => {
    const { value } = event.target;
    if (value === "") delete state.playerSetup.capacity[field];
    else if (Number.isFinite(Number(value))) state.playerSetup.capacity[field] = Number(value);
    drawSetupStatus();
  });
}

export function bindSetup() {
  bindWarlords();
  bindCapacity("setup-capacity-base", "base");
  bindCapacity("setup-capacity-bonus", "bonusPercent");
  byId("setup-save").addEventListener("click", () => {
    savePlayerSetup();
    renderAll(); // the Battle lab plays with the saved setup when it is loaded
  });
  byId("setup-discard").addEventListener("click", () => {
    discardSetupChanges();
    drawSetup();
  });
  window.addEventListener("beforeunload", (event) => {
    if (unsavedCount() === 0) return;
    event.preventDefault();
    event.returnValue = ""; // older browsers ask only when a value is set
  });
}
