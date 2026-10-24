// Shared by the page tests: opens the published page (dist/index.html, built by `npm test`) in jsdom and drives
// it like a user: typing, choosing, clicking. Not a test file itself (node --test runs *.test.js only).
import { readFileSync } from "node:fs";
import { JSDOM, VirtualConsole } from "jsdom";

export const PAGE = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
const LANGUAGE_KEY = "army-simulator.language";

/**
 * The page in a fresh window: the browser's language, and a language saved by an earlier visit if any.
 * jsdom only reports an error in a page script to its console, so a script that throws while the page opens
 * fails the test here: src/theme-init.js once threw because jsdom, like some browsers, has no matchMedia (DEF-009).
 */
export function openPage({ language = "en-GB", saved } = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole().forwardTo(console, { jsdomErrors: "none" });
  virtualConsole.on("jsdomError", (error) => errors.push(error));
  const { window } = new JSDOM(PAGE, {
    virtualConsole,
    runScripts: "dangerously",
    url: "http://localhost/",
    pretendToBeVisual: true,
    beforeParse(win) {
      Object.defineProperty(win.navigator, "language", { value: language });
      if (saved) win.localStorage.setItem(LANGUAGE_KEY, saved);
    },
  });
  if (errors.length) throw errors[0];
  const $ = (selector) => window.document.querySelector(selector);
  const $$ = (selector) => [...window.document.querySelectorAll(selector)];
  const fire = (element, type) => element.dispatchEvent(new window.Event(type, { bubbles: true }));
  return {
    window,
    $,
    $$,
    text: (selector) => $(selector).textContent.replace(/\s+/g, " ").trim(),
    click: (selector) => $(selector).click(),
    type(selector, value) {
      $(selector).value = String(value);
      fire($(selector), "input");
    },
    choose(selector, value) {
      $(selector).value = String(value);
      fire($(selector), "change");
    },
    tick(selector) {
      $(selector).checked = true;
      fire($(selector), "change");
    },
    untick(selector) {
      $(selector).checked = false;
      fire($(selector), "change");
    },
    savedLanguage: () => window.localStorage.getItem(LANGUAGE_KEY),
    metric: (key) => $(`[data-metric="${key}"] .metric-value`).textContent,
  };
}

/** Opens the picker, ticks these troops and adds them to the army. */
export function addTroops(page, ids) {
  if (page.$("#picker").hidden) page.click("#picker-toggle");
  for (const id of ids) page.tick(`#pick-${id}`);
  page.click("#picker-add");
}
