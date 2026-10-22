// The language buttons: switch the whole page, and remember the choice in this browser (LANG-02).
import { CONFIG } from "../../config.js";
import { state } from "../../state.js";
import { renderAll } from "../../render.js";

export function bindLanguage() {
  for (const button of document.querySelectorAll("[data-lang]")) {
    button.addEventListener("click", () => {
      state.language = button.dataset.lang;
      try {
        localStorage.setItem(CONFIG.languageKey, state.language);
      } catch {
        // storage blocked: the choice holds until the page is closed
      }
      renderAll();
    });
  }
}
