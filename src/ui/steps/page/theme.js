// The light / dark button: its icon shows the current theme, its name says the action; a click switches the
// theme and saves the choice in this browser. The theme itself is set before the first paint by theme-init.js.
import { byId } from "../../dom.js";
import { ICONS } from "../../icons.js";
import { t } from "../../texts/index.js";

const THEME_KEY = "army-simulator.theme";
const root = document.documentElement;
const current = () => (root.getAttribute("data-theme") === "light" ? "light" : "dark");

export function drawThemeToggle() {
  const light = current() === "light";
  const button = byId("theme-toggle");
  button.innerHTML = light ? ICONS.sun : ICONS.moon;
  button.setAttribute("aria-label", t(light ? "theme.toDark" : "theme.toLight"));
  button.title = button.getAttribute("aria-label");
}

export function bindThemeToggle() {
  byId("theme-toggle").addEventListener("click", () => {
    const next = current() === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // storage blocked: the choice holds until the page is closed
    }
    drawThemeToggle();
  });
  // theme-init.js follows the system live while nothing is saved: the icon follows too
  window.matchMedia?.("(prefers-color-scheme: light)")?.addEventListener("change", drawThemeToggle);
}
