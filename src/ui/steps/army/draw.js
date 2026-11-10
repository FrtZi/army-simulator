// Step 3 · the army (ARMY-01, ARMY-02, ARMY-03): the march capacity split into base, bonus and total; tabs for
// the two compositions, the one being edited with its name; a bar of its troops against the capacity; one line
// per troop type, with its icon and count.
import { byId, escape } from "../../dom.js";
import { label, number, troopMeta } from "../../format.js";
import { ICONS, troopIcon } from "../../icons.js";
import { term } from "../../glossary/tooltip.js";
import { capacityEffect, currentArmy, currentGame, problemsOf, state } from "../../state.js";
import { capacityInPlay, championGear, fromSetup } from "../../lab-setup.js";
import { t } from "../../texts/index.js";
import { championBonusCount, championFiguresHtml } from "../../champion-figures.js";

const PERCENT = 100;

/** The capacity's fields: the lab's values, or the setup's, shown and locked, when it is loaded and holds them. */
export function drawCapacityFields() {
  const { base, percent } = capacityInPlay(state);
  byId("capacity-base").value = base;
  byId("capacity-bonus").value = Number.isFinite(percent) ? percent : "";
  byId("capacity-base").disabled = fromSetup(state, "base");
  byId("capacity-bonus").disabled = fromSetup(state, "bonusPercent");
}

/** The tabs of the compositions and the "new" one, the name of the one being edited; delete only if not alone. */
export function drawCompositions() {
  const tabs = state.compositions.map(
    (composition, index) =>
      `<button type="button" id="composition-tab-${index}" data-composition="${index}" aria-pressed="${index === state.active}">${escape(t("composition.tab", { name: composition.name || index + 1 }))}</button>`,
  );
  const add = `<button type="button" id="composition-new" class="tab-new">+ ${escape(t("composition.new"))}</button>`;
  byId("composition-tabs").innerHTML = tabs.join("") + add;
  byId("composition-name").value = state.compositions[state.active].name;
  byId("composition-delete").hidden = state.compositions.length <= 1;
  drawChampionChoice();
}

/** "Led by your champion": usable once the setup is loaded with a champion wearing gear (D-30). */
function drawChampionChoice() {
  const usable = state.useSetup && championGear(state).length > 0;
  const box = byId("composition-champion");
  box.checked = usable && Boolean(state.composition.ledByChampion);
  box.disabled = !usable;
  byId("composition-champion-hint").textContent = t(usable ? "composition.championOn" : "composition.championOff");
  drawChampionFigures(box.checked);
}

/** What the saved champion brings, with the setup loaded (BONUS-08): its figures, folded to a line. */
function drawChampionFigures(led) {
  const champion = state.savedPlayerSetup.champion;
  const details = byId("composition-champion-details");
  details.hidden = !state.useSetup || !champion;
  if (details.hidden) return;
  const n = championBonusCount(champion);
  byId("composition-champion-summary").textContent = t(led ? "champion.labLed" : "champion.labNotLed", { n });
  byId("composition-champion-figures").innerHTML = championFiguresHtml(champion);
}

/** The capacity summary, the bar, and the status in words and icon (never colour alone). */
export function drawCapacity() {
  const { army } = currentArmy();
  const { base, bonus, percent, total } = army.capacity;
  const problems = problemsOf(capacityEffect());
  const filled = total > 0 ? Math.min(PERCENT, (army.size / total) * PERCENT) : PERCENT;
  const over = army.excess > 0;
  const status = over
    ? `<span aria-hidden="true">⚠</span> ${escape(t("capacity.over", { over: number(army.excess) }))}`
    : `<span aria-hidden="true">✓</span> ${escape(t("capacity.within", { used: number(army.size), free: number(total - army.size) }))}`;
  const summary = t("capacity.summary", {
    base: number(base),
    bonus: number(bonus),
    percent: number(percent, 1),
    total: number(total),
  });
  byId("capacity-bonus").setAttribute("aria-invalid", String(problems.length > 0));
  byId("capacity").innerHTML = `
    ${problems.length ? `<p class="problem"><span aria-hidden="true">⚠</span> ${escape(problems.map((p) => t(`problem.${p.code}`, p)).join(" "))}</p>` : ""}
    <p class="capacity-total">${term("capacity", t("capacity.label"))}${escape(t("colon"))}${escape(summary)}</p>
    <div class="bar${over ? " over" : ""}" aria-hidden="true"><span></span></div>
    <p class="status${over ? " critical" : ""}">${status}</p>`;
  byId("capacity").querySelector(".bar span").style.width = `${filled}%`;
}

function line(id, count) {
  const unit = currentGame().catalogue.units.get(id);
  const name = label(unit);
  return `<li class="army-line">
    ${troopIcon(unit)}
    <div class="who"><span class="name">${escape(name)}</span><span class="meta">${escape(troopMeta(unit))}</span></div>
    <label class="visually-hidden" for="count-${id}">${escape(`${t("army.count")} · ${name}`)}</label>
    <input id="count-${id}" data-count="${id}" type="number" min="0" step="100" inputmode="numeric" value="${count}" />
    <button type="button" class="icon" id="remove-${id}" data-remove="${id}" aria-label="${escape(t("army.remove", { name }))}">${ICONS.close}</button>
  </li>`;
}

export function drawArmyLines() {
  const entries = Object.entries(state.troops);
  byId("army-lines").innerHTML = entries.length
    ? `<ul class="army-list">${entries.map(([id, count]) => line(id, count)).join("")}</ul>`
    : `<p class="empty">${escape(t("army.empty"))}</p>`;
}
