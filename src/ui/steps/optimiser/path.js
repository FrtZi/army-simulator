// The path under the army found (SIM-12, D-42): each hero to get or raise, by what it adds to the goal, the most
// first; its cost summed as the guides sum it (D-29), shown and not weighed (Frantz, 2026-11-16: gain first).
import { escape } from "../../dom.js";
import { label, number } from "../../format.js";
import { goalOf } from "../../optimiser.js";
import { currentGame } from "../../state.js";
import { t } from "../../texts/index.js";
import { costBetween } from "../../../engine/index.js";

const itemName = (id) => label(currentGame().items.get(id)) || id;

/** A step's gain in words: by how much the goal's score rises, or the battle's margin in power. */
function gainText(result, gain) {
  if (goalOf(result.goal).battle) return t("optimiser.pathPower", { gain: number(gain) });
  return t("optimiser.pathPercent", { percent: number((gain / result.score) * 100, 1) });
}

/** What a step costs, each item in the player's language. */
function costText({ id, from, to }) {
  const items = Object.entries(costBetween(currentGame().warlords.get(id), from, to));
  if (!items.length) return t("guides.free");
  return t("optimiser.pathCost", {
    cost: items.map(([item, count]) => `${number(count)} ${itemName(item)}`).join(" · "),
  });
}

function stepText(result, step) {
  const name = label(currentGame().warlords.get(step.id));
  const what = step.from
    ? t("optimiser.pathRaise", { name, from: step.from, to: step.to })
    : t("optimiser.pathGet", { name });
  return `${what} · ${gainText(result, step.gain)} · ${costText(step)}`;
}

/** The path's title, how it reads, and its steps, or that none adds to the army now. */
export function pathHtml(result) {
  const steps = result.path ?? [];
  const body = steps.length
    ? `<ol id="optimiser-path">${steps.map((step) => `<li>${escape(stepText(result, step))}</li>`).join("")}</ol>`
    : `<p class="empty" id="optimiser-path">${escape(t("optimiser.pathNone"))}</p>`;
  return `<h3>${escape(t("optimiser.pathTitle"))}</h3><p class="hint">${escape(t("optimiser.pathHint"))}</p>${body}`;
}
