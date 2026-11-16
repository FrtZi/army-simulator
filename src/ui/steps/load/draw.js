// "Load your setup" in the Battle lab (CFG-04, D-27): the switch, and in words what it puts in play: on, the heroes
// owned, the setup's march capacity and bonuses, what the setup does not hold taken from the lab; off, free play.
// It can be turned on once something is saved in Your setup. A champion saved in the Champion lab may play instead
// of Your setup's (CFG-10).
import { byId, options } from "../../dom.js";
import { number } from "../../format.js";
import { currentGame, state } from "../../state.js";
import { capacityInPlay, fromSetup, hasSavedSetup, setupBonuses } from "../../lab-setup.js";
import { t } from "../../texts/index.js";

/** The champion in play in words: a Champion lab setup's (CFG-10), or Your setup's gear, or none. */
function championText(saved) {
  const { labChampion } = state;
  if (labChampion) return [t("load.labChampion", { name: labChampion.slice(0, labChampion.lastIndexOf("|")) })];
  return saved.champion?.gear?.length ? [t("load.champion", { n: saved.champion.gear.length })] : [];
}

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
  parts.push(...championText(saved));
  if (saved.troops?.length) parts.push(t("load.troops", { n: saved.troops.length }));
  return `${t("load.on")} ${parts.join(" · ")}`;
}

/** The champion played: Your setup's, or a Champion lab setup's set A, or its set B when it has one. */
function drawChampionChoice() {
  const sets = state.championSetups.flatMap((save) =>
    ["a", "b"]
      .filter((side) => side === "a" || save.champion.gear.b.length)
      .map((side) => [`${save.name}|${side}`, `${save.name} · ${t(`clab.side-${side}`)}`]),
  );
  byId("load-champion-field").hidden = !sets.length;
  byId("load-champion").innerHTML = options([["", t("load.setupChampion")], ...sets], state.labChampion);
  byId("load-champion").disabled = !state.useSetup;
}

export function drawLoadSetup() {
  const available = hasSavedSetup(state);
  if (!available) state.useSetup = false; // nothing saved: nothing to load
  const toggle = byId("load-setup-toggle");
  toggle.checked = state.useSetup;
  toggle.disabled = !available;
  byId("load-setup-status").textContent = !available ? t("load.none") : state.useSetup ? onText() : t("load.off");
  drawChampionChoice();
}
