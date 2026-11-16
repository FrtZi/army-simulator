// The Champion lab's setups saved by name (CFG-10, D-39): the lab as it is (level, both gear sets, skills) kept in
// this browser, each listed with Load and Delete; a status line says what just happened. A saved one can then be
// played in the Battle lab, instead of Your setup's champion.
import { byId, escape } from "../../dom.js";
import { ICONS } from "../../icons.js";
import { state } from "../../state.js";
import { t } from "../../texts/index.js";
import { renderAll } from "../../render.js";
import { dropChampionSetup, keepChampionSetup } from "../../champion-setups.js";
import { lab } from "./lab.js";

// a plain copy: jsdom, which runs the page tests, has no structuredClone (DEF-029)
const copy = (value) => JSON.parse(JSON.stringify(value));

export function drawChampionSaves() {
  const saves = state.championSetups;
  byId("clab-save-list").innerHTML = saves.length
    ? saves
        .map(
          ({ name, champion }, index) => `<li class="save-line">
            <div class="who"><span class="name">${escape(name)}</span><span class="meta">${escape(t("clab.savedLevel", { level: champion.level }))}</span></div>
            <button type="button" id="clab-load-${index}" data-clab-load="${escape(name)}" aria-label="${escape(t("saves.loadName", { name }))}">${escape(t("saves.load"))}</button>
            <button type="button" class="icon" id="clab-delete-${index}" data-clab-delete="${escape(name)}" aria-label="${escape(t("saves.deleteName", { name }))}">${ICONS.close}</button>
          </li>`,
        )
        .join("")
    : `<li class="empty">${escape(t("clab.noSave"))}</li>`;
}

/** The status line: a ✓ or ⚠ and words, never colour alone. */
function showStatus(message, ok = true) {
  const status = byId("clab-save-status");
  status.className = ok ? "status" : "status critical";
  status.innerHTML = `<span aria-hidden="true">${ok ? "✓" : "⚠"}</span> ${escape(message)}`;
}

function save() {
  const name = byId("clab-save-name").value.trim() || t("clab.defaultName");
  const { level, gear, skills } = lab();
  const kept = keepChampionSetup(name, copy({ level, gear, skills }));
  renderAll(); // the Battle lab's choice of champion lists it
  showStatus(kept ? t("clab.saved", { name }) : t("saves.blocked"), kept);
}

/** A saved setup put in the lab, or deleted; by name, as another tab may have changed the list (DEF-015). */
function act(button) {
  const name = button.dataset.clabLoad ?? button.dataset.clabDelete;
  const chosen = state.championSetups.find((entry) => entry.name === name);
  if (chosen && button.dataset.clabLoad !== undefined) {
    Object.assign(lab(), copy(chosen.champion), { set: { a: "", b: "" }, chosen: null });
    byId("clab-save-name").value = name;
    renderAll();
    showStatus(t("clab.loaded", { name }));
    return;
  }
  if (chosen) dropChampionSetup(name);
  renderAll();
  if (chosen) showStatus(t("clab.deleted", { name }));
  byId("clab-save-name").focus();
}

export function bindChampionSaves() {
  byId("clab-save").addEventListener("click", save);
  byId("clab-save-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-clab-load], [data-clab-delete]");
    if (button) act(button);
  });
}
