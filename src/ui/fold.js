// Every block closes to one line that sums it up (FOLD-01, Frantz, 2026-11-10, as in Portfolio Advisor): a button by
// its title folds and opens it, and while folded its summary line stands under the title, written by rules from the
// block's figures (fold-summaries.js). What is folded is remembered in this browser, a convenience only.
import { byId, escape } from "./dom.js";
import { CONFIG } from "./config.js";
import { t } from "./texts/index.js";
import { SUMMARIES } from "./fold-summaries.js";

const blocks = () =>
  Object.keys(SUMMARIES)
    .map((id) => byId(id))
    .filter(Boolean);

function remembered() {
  try {
    return new Set(JSON.parse(localStorage.getItem(CONFIG.foldKey) ?? "[]"));
  } catch {
    return new Set(); // no storage here, or a damaged entry: every block open
  }
}

function remember() {
  try {
    const folded = blocks()
      .filter((block) => block.classList.contains("folded"))
      .map((block) => block.id);
    localStorage.setItem(CONFIG.foldKey, JSON.stringify(folded));
  } catch {
    // no storage here: the blocks fold for this visit only
  }
}

/** Each folded block's summary line, from its figures now; an open block's line stays empty and hidden. */
export function drawFoldSummaries() {
  for (const block of blocks()) {
    const folded = block.classList.contains("folded");
    const line = block.querySelector(":scope > .fold-summary");
    line.hidden = !folded;
    line.innerHTML = folded ? escape(SUMMARIES[block.id]()) : "";
    const toggle = block.querySelector(":scope > .fold-toggle");
    toggle.setAttribute("aria-expanded", String(!folded));
    toggle.setAttribute(
      "aria-label",
      t(folded ? "fold.open" : "fold.close", { block: block.querySelector("h2").textContent }),
    );
    toggle.textContent = folded ? "▸" : "▾";
  }
}

/** Each block gets its button and its summary line, folded as last time. */
export function bindFolds() {
  const folded = remembered();
  for (const block of blocks()) {
    const title = block.querySelector("h2");
    title.insertAdjacentHTML("afterend", '<p class="fold-summary" hidden></p>');
    title.insertAdjacentHTML(
      "beforebegin",
      `<button type="button" class="fold-toggle" aria-controls="${block.id}"></button>`,
    );
    block.classList.toggle("folded", folded.has(block.id));
    block.querySelector(":scope > .fold-toggle").addEventListener("click", () => {
      block.classList.toggle("folded");
      remember();
      drawFoldSummaries();
    });
  }
}
