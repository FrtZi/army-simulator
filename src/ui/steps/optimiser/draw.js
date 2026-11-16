// The optimiser block (SIM-05, D-40; SIM-18): the goal, the opponent for a battle, the aim (SIM-12), the button and
// its status; then, once an army is found, its tabs: the model's map, with what I have, to improve. Without Your setup
// loaded, or its troops owned, it says what is missing.
import { CONFIG } from "../../config.js";
import { byId, options } from "../../dom.js";
import { number } from "../../format.js";
import { blocked, goalOf, opponentChosen, opponents } from "../../optimiser.js";
import { state } from "../../state.js";
import { t } from "../../texts/index.js";
import { multiFilter } from "../../filters.js";
import { sizeBars } from "../dashboards/balance.js";
import { havePanel } from "./have.js";
import { mapPanel } from "./map.js";
import { upPanel } from "./path.js";
import { compositionName, opponentName } from "./words.js";

/** The tabs, in their order, and how each draws the army found. */
export const TABS = { map: mapPanel, have: havePanel, up: upPanel };

/** The status line: why it cannot run, or what the last run found, or what was put in the composition. */
function statusText(reason) {
  const { result, applied } = state.optimiser;
  if (reason) return `ⓘ ${t(reason)}`;
  if (applied) return t("optimiser.used", { name: compositionName() });
  if (result === false) return `ⓘ ${t("optimiser.none")}`;
  return result ? t("optimiser.found", { goal: t(`optimiser.goal-${result.goal}`), n: number(result.judged) }) : "";
}

/** The goals to choose from and the aim's filters, as chosen (redrawn with the page, not with the figures). */
export function drawOptimiserGoals() {
  const goals = CONFIG.optimiser.goals.map(({ id }) => [id, t(`optimiser.goal-${id}`)]);
  byId("optimiser-goal").innerHTML = options(goals, state.optimiser.goal);
  byId("optimiser-aim").innerHTML = CONFIG.optimiser.aimFilters
    .map((field) => multiFilter("optimiser-aim", field, state.optimiser.aim[field]))
    .join("");
}

/** The opponent's list, shown for the battle goal only: the other compositions and the PvE army (by their names now). */
function drawOpponents() {
  const battle = Boolean(goalOf(state.optimiser.goal).battle);
  byId("optimiser-opponent-field").hidden = !battle;
  if (!battle) return;
  const pairs = opponents().map(([value]) => [value, opponentName(value)]);
  byId("optimiser-opponent").innerHTML = options(pairs, opponentChosen());
}

/** The tabs and their panels: each panel drawn, the one chosen shown (the ARIA tabs pattern, as the dashboards'). */
function drawTabs(result) {
  const shown = Boolean(result);
  byId("optimiser-result").hidden = !shown;
  if (!shown) return;
  for (const [name, draw] of Object.entries(TABS)) {
    const selected = name === state.optimiserView.tab;
    const tab = byId(`opt-tab-${name}`);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    const panel = byId(`opt-panel-${name}`);
    panel.hidden = !selected;
    panel.innerHTML = draw(result);
    sizeBars(panel);
  }
}

/**
 * Whether it can run, its status and the army found: with the figures, as troops added to a composition or a side
 * compared may let it run or not (DEF-045).
 */
export function drawOptimiser() {
  drawOpponents();
  const reason = blocked(goalOf(state.optimiser.goal));
  byId("optimiser-run").disabled = Boolean(reason);
  const { result } = state.optimiser;
  const status = byId("optimiser-status");
  status.textContent = statusText(reason);
  status.classList.toggle("pending", Boolean(reason) || result === false); // still to act on: not a success's colour
  drawTabs(result && !reason ? result : null);
}
