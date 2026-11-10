// "Load your setup" in the Battle lab (CFG-04, D-27): the switch, and in words what it puts in play: on, the heroes
// owned, the setup's march capacity and bonuses, what the setup does not hold taken from the lab; off, free play.
// It can be turned on once something is saved in Your setup.
import { byId } from "../../dom.js";
import { number } from "../../format.js";
import { currentGame, state } from "../../state.js";
import { capacityInPlay, fromSetup, hasSavedSetup, setupBonuses } from "../../lab-setup.js";
import { t } from "../../texts/index.js";

function onText() {
  const saved = state.savedPlayerSetup;
  const { base, percent } = capacityInPlay(state);
  const parts = [
    t("load.heroes", { n: saved.warlords.length, total: currentGame().warlords.size }),
    fromSetup(state, "base") || fromSetup(state, "bonusPercent")
      ? t("load.capacity", { base: number(base), percent: number(percent ?? 0, 1) })
      : t("load.labCapacity"),
    setupBonuses(state) ? t("load.bonuses", { n: saved.bonuses.length }) : t("load.labBonuses"),
  ];
  if (saved.rituals.length || saved.buildings.length) {
    parts.push(t("load.levelled", { rituals: saved.rituals.length, buildings: saved.buildings.length }));
  }
  if (saved.champion?.gear?.length) parts.push(t("load.champion", { n: saved.champion.gear.length }));
  return `${t("load.on")} ${parts.join(" · ")}`;
}

export function drawLoadSetup() {
  const available = hasSavedSetup(state);
  if (!available) state.useSetup = false; // nothing saved: nothing to load
  const toggle = byId("load-setup-toggle");
  toggle.checked = state.useSetup;
  toggle.disabled = !available;
  byId("load-setup-status").textContent = !available ? t("load.none") : state.useSetup ? onText() : t("load.off");
}
