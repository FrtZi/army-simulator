// Step 6 · saved setups (CFG-01): the setups saved in this browser, each with Load and Delete; a status line
// says what just happened (saved, loaded, refused and why).
import { byId, escape } from "../../dom.js";
import { CONFIG } from "../../config.js";
import { ICONS } from "../../icons.js";
import { state } from "../../state.js";
import { savedSetups } from "../../../storage/browser.js";
import { t } from "../../texts/index.js";

/** The browser's storage, or none when it is blocked (a private window, a page opened from the disk). */
export function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const when = (iso) =>
  new Intl.DateTimeFormat(CONFIG.locales[state.language], { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );

export function drawSaves() {
  const saves = storage() ? savedSetups(storage()) : [];
  byId("save-list").innerHTML = saves.length
    ? saves
        .map(
          (save, index) => `<li class="save-line">
            <div class="who"><span class="name">${escape(save.name)}</span><span class="meta">${escape(when(save.savedAt))}</span></div>
            <button type="button" id="load-${index}" data-load="${escape(save.name)}" aria-label="${escape(t("saves.loadName", { name: save.name }))}">${escape(t("saves.load"))}</button>
            <button type="button" class="icon" id="delete-${index}" data-delete="${escape(save.name)}" aria-label="${escape(t("saves.deleteName", { name: save.name }))}">${ICONS.close}</button>
          </li>`,
        )
        .join("")
    : `<li class="empty">${escape(t("saves.none"))}</li>`;
}

/** The status line: a ✓ or ⚠ and words, never colour alone. */
export function showStatus(message, ok = true) {
  const status = byId("save-status");
  status.className = ok ? "status" : "status critical";
  status.innerHTML = `<span aria-hidden="true">${ok ? "✓" : "⚠"}</span> ${escape(message)}`;
}
