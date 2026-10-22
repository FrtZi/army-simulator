// Saving, loading and deleting setups in this browser (CFG-01); exporting one to a JSON file and importing a
// file back (CFG-02). A file the page cannot use is refused with its reasons; nothing is ever sent anywhere.
import { byId } from "../../dom.js";
import { GAMES } from "../../games.js";
import { applySetup, currentSetup } from "../../state.js";
import { renderAll } from "../../render.js";
import { deleteSetup, saveSetup, savedSetups } from "../../../storage/browser.js";
import { fromConfiguration, toConfiguration } from "../../../storage/configuration.js";
import { t } from "../../texts/index.js";
import { drawSaves, showStatus, storage } from "./draw.js";

const GAMES_BY_ID = Object.fromEntries(GAMES.map((game) => [game.id, game]));
const nameOrDefault = () => byId("save-name").value.trim() || t("saves.defaultName");
/** Why a file is refused: its own text, else the same words as under a bonus row. */
function reasonText(problem) {
  const key = `file.${problem.code}`;
  const text = t(key, problem);
  return text === key ? t(`problem.${problem.code}`, problem) : text;
}
const fileName = (name) => `${name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "army"}.json`;

/** Puts a configuration on the page, or says why it cannot; true when it was loaded. */
function load(configuration) {
  const { setup, problems } = fromConfiguration(configuration, GAMES_BY_ID);
  const reasons = problems ?? (applySetup(setup) ? [] : [{ code: "several-filters" }]);
  if (reasons.length) {
    showStatus(t("saves.refused", { reasons: reasons.map(reasonText).join(" ") }), false);
    return false;
  }
  renderAll();
  byId("save-name").value = configuration.name ?? "";
  return true;
}

function save() {
  const name = nameOrDefault();
  const stored = storage() && saveSetup(storage(), toConfiguration(currentSetup(), name));
  drawSaves();
  showStatus(stored ? t("saves.saved", { name }) : t("saves.blocked"), Boolean(stored));
}

function exportFile() {
  const name = nameOrDefault();
  const json = JSON.stringify(toConfiguration(currentSetup(), name), null, 2);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  link.download = fileName(name);
  link.click();
  URL.revokeObjectURL(link.href);
  showStatus(t("saves.exported", { file: link.download }));
}

/** A file's text (FileReader: supported everywhere, unlike File.text() in some environments). */
const readText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

async function importFile(input) {
  const [file] = input.files;
  input.value = "";
  if (!file) return;
  let configuration;
  try {
    configuration = JSON.parse(await readText(file));
  } catch {
    showStatus(t("saves.refused", { reasons: t("file.not-json") }), false);
    return;
  }
  if (load(configuration)) showStatus(t("saves.imported", { name: configuration.name ?? file.name }));
}

export function bindSaves() {
  byId("save-button").addEventListener("click", save);
  byId("export-button").addEventListener("click", exportFile);
  byId("import-file").addEventListener("change", (event) => importFile(event.target));
  byId("save-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-load], [data-delete]");
    if (!button || !storage()) return;
    const saves = savedSetups(storage());
    if (button.dataset.load !== undefined) {
      const chosen = saves[button.dataset.load];
      if (load(chosen.configuration)) showStatus(t("saves.loaded", { name: chosen.name }));
      return;
    }
    const { name } = saves[button.dataset.delete];
    deleteSetup(storage(), name);
    drawSaves();
    showStatus(t("saves.deleted", { name }));
    byId("save-name").focus();
  });
}
