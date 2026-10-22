// The page's fixed texts, in the current language: every element with data-text (its text) or
// data-text-label (its accessible name); the language buttons show which one is on.
import { state } from "../../state.js";
import { t } from "../../texts/index.js";

export function applyTexts() {
  document.documentElement.lang = state.language;
  document.title = t("title");
  for (const element of document.querySelectorAll("[data-text]")) element.textContent = t(element.dataset.text);
  for (const element of document.querySelectorAll("[data-text-label]")) {
    element.setAttribute("aria-label", t(element.dataset.textLabel));
  }
  for (const button of document.querySelectorAll("[data-lang]")) {
    button.setAttribute("aria-pressed", String(button.dataset.lang === state.language));
  }
}
