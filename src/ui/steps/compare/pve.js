// The PvE army chosen as the second side (SIM-11, BL-20): its kind, its name, its level, then its troops, each kept
// or left out and its count lowered (what is left of it, or one part of it); "the whole army" puts it back.
import { byId, escape, keepingFocus, options } from "../../dom.js";
import { label, nameOf, number, tierName } from "../../format.js";
import { troopIcon } from "../../icons.js";
import { currentGame, state } from "../../state.js";
import { t } from "../../texts/index.js";
import { choosePlace, chosenPlace, placesOf, pveCatalogue } from "../../pve.js";

const KINDS = ["army", "raid", "city"];

function troopRow(id, most) {
  const unit = pveCatalogue(currentGame()).units.get(id);
  const name = label(unit);
  const kept = id in state.pve.troops;
  return `<li class="army-line">${troopIcon(unit)}
    <div class="who"><label><input type="checkbox" data-pve-keep="${id}"${kept ? " checked" : ""} /> <span class="name">${escape(name)}</span></label><span class="meta">${escape(`${tierName(unit.tier)} · ${nameOf("unitTypes", unit.unitType)}`)}</span></div>
    <label class="visually-hidden" for="pve-count-${id}">${escape(t("pve.countOf", { name }))}</label>
    <input id="pve-count-${id}" type="number" min="0" max="${most}" step="1" inputmode="numeric" data-pve-count="${id}" value="${state.pve.troops[id] ?? 0}"${kept ? "" : " disabled"} />
    <span class="meta">${escape(t("pve.of", { n: number(most) }))}</span>
  </li>`;
}

export function drawPveChoice() {
  const box = byId("compare-pve");
  box.hidden = !state.pve.on;
  if (box.hidden) return;
  const game = currentGame();
  const place = chosenPlace(state, game);
  const names = [...new Set(placesOf(game, state.pve.kind).map((entry) => entry.labels.en))];
  const levels = placesOf(game, state.pve.kind).filter((entry) => entry.labels.en === place?.labels.en);
  const field = (id, key, choices, value) =>
    `<div class="field"><label for="${id}">${escape(t(key))}</label><select id="${id}" data-pve="${id.slice(4)}">${options(choices, value)}</select></div>`;
  const byName = (name) => label(placesOf(game, state.pve.kind).find((entry) => entry.labels.en === name));
  box.innerHTML = `<div class="compare-choice">
      ${field(
        "pve-kind",
        "pve.kind",
        KINDS.map((kind) => [kind, t(`pve.kind-${kind}`)]),
        state.pve.kind,
      )}
      ${field(
        "pve-name",
        "pve.place",
        names.map((name) => [name, byName(name)]),
        place?.labels.en,
      )}
      ${field(
        "pve-level",
        "pve.level",
        levels.map((entry) => [entry.level, String(entry.level)]),
        place?.level,
      )}
    </div>
    <p class="hint">${escape(t("pve.troopsHint"))} <button type="button" id="pve-whole">${escape(t("pve.whole"))}</button></p>
    <ul class="army-list">${Object.entries(place?.troops ?? {})
      .map(([id, most]) => troopRow(id, most))
      .join("")}</ul>`;
}

/** The choices of kind, name and level, a troop kept or left out, a count lowered; then the battle follows. */
export function bindPveChoice(redraw) {
  const box = byId("compare-pve");
  box.addEventListener("change", (event) => {
    const { pve: field, pveKeep } = event.target.dataset;
    const game = currentGame();
    if (field) {
      const choice = { [field]: field === "level" ? Number(event.target.value) : event.target.value };
      choosePlace(state, game, field === "kind" ? { ...choice, name: "", level: null } : choice);
    } else if (pveKeep) {
      const most = chosenPlace(state, game).troops[pveKeep];
      if (event.target.checked) state.pve.troops[pveKeep] = most;
      else delete state.pve.troops[pveKeep];
    } else return;
    keepingFocus(() => {
      drawPveChoice();
      redraw();
    });
  });
  box.addEventListener("input", (event) => {
    const id = event.target.dataset.pveCount;
    if (!id) return;
    const most = Number(event.target.max);
    const value = event.target.value === "" ? 0 : Number(event.target.value);
    const valid = Number.isInteger(value) && value >= 0 && value <= most;
    event.target.setAttribute("aria-invalid", String(!valid));
    if (!valid) return;
    state.pve.troops[id] = value;
    redraw();
  });
  box.addEventListener("click", (event) => {
    if (event.target.id !== "pve-whole") return;
    choosePlace(state, currentGame(), {});
    keepingFocus(() => {
      drawPveChoice();
      redraw();
    });
  });
}
