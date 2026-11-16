// The path under the army found (SIM-12, D-42, D-43): each hero to get or raise, each ritual or building one level up
// that can be done now, by what it adds to the goal, the most first; its cost summed as the guides sum it (D-29),
// shown and not weighed (Frantz, 2026-11-16: gain first).
import { escape } from "../../dom.js";
import { label, number } from "../../format.js";
import { goalOf } from "../../optimiser.js";
import { levelledEntries } from "../../optimiser-path.js";
import { currentGame } from "../../state.js";
import { t } from "../../texts/index.js";
import { costBetween } from "../../../engine/index.js";

const TINY = 0.05; // a gain in % that one decimal rounds to 0

const itemName = (id) => label(currentGame().items.get(id)) || id;

/** A step's entry: a hero, a ritual or a building, as the game's data holds it. */
const entryOf = ({ kind, id }) =>
  kind === "hero" ? currentGame().warlords.get(id) : levelledEntries(currentGame())[kind].get(id);

/** A step's gain in words: by how much the goal's score rises, or the battle's margin in power. */
function gainText(result, gain) {
  if (goalOf(result.goal).battle) return t("optimiser.pathPower", { gain: number(gain) });
  const percent = (gain / result.score) * 100;
  // below what one decimal shows: said so, not "+0 %"
  return percent < TINY ? t("optimiser.pathTiny") : t("optimiser.pathPercent", { percent: number(percent, 1) });
}

/** What a step costs, each item in the player's language. */
function costText(step) {
  const items = Object.entries(costBetween(entryOf(step), step.from, step.to));
  if (!items.length) return t("guides.free");
  return t("optimiser.pathCost", {
    cost: items.map(([item, count]) => `${number(count)} ${itemName(item)}`).join(" · "),
  });
}

/** What the step does: a hero got or raised, a ritual or a building one level up. */
function whatText(step) {
  const name = label(entryOf(step));
  if (step.kind !== "hero") return t(`optimiser.path-${step.kind}`, { name, from: step.from, to: step.to });
  return step.from
    ? t("optimiser.pathRaise", { name, from: step.from, to: step.to })
    : t("optimiser.pathGet", { name });
}

/** The path's title, how it reads, and its steps, or that none adds to the army now. */
export function pathHtml(result) {
  const steps = result.path ?? [];
  const line = (step) => `${whatText(step)} · ${gainText(result, step.gain)} · ${costText(step)}`;
  const body = steps.length
    ? `<ol id="optimiser-path">${steps.map((step) => `<li>${escape(line(step))}</li>`).join("")}</ol>`
    : `<p class="empty" id="optimiser-path">${escape(t("optimiser.pathNone"))}</p>`;
  return `<h3>${escape(t("optimiser.pathTitle"))}</h3><p class="hint">${escape(t("optimiser.pathHint"))}</p>${body}`;
}
