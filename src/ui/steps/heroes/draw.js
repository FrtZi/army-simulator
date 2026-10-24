// The heroes of the composition being edited (ARMY-05, ARMY-06, D-26): one line per hero with its rank and level,
// then the talents its heroes offer, the chosen ones ticked, at most `talentsPerArmy`. A talent two heroes offer
// is listed once, at its strongest; one the engine cannot apply yet says so in words.
import { byId, escape } from "../../dom.js";
import { label, nameOf, number, tierName } from "../../format.js";
import { ICONS, troopIcon } from "../../icons.js";
import { heroesOf, talentsOf } from "../../heroes.js";
import { currentGame, state } from "../../state.js";
import { heroUnit, rankOf } from "../../../engine/index.js";
import { t } from "../../texts/index.js";
import { drawHeroPicker } from "./picker.js";

/** A hero's short description: tier at its level, god, rarity. */
export const heroMeta = (hero) =>
  t("heroes.meta", {
    tier: tierName(hero.tier),
    god: nameOf("alignments", hero.alignment),
    rarity: nameOf("rarities", hero.rarity),
  });

const options = (count, selected) =>
  Array.from({ length: count }, (_, index) => index + 1)
    .map((value) => `<option value="${value}"${value === selected ? " selected" : ""}>${value}</option>`)
    .join("");

function choice(key, id, name, count, selected) {
  const field = `${key}-${id}`;
  return `<label for="${field}"><span aria-hidden="true">${escape(t(`heroes.${key}`))}</span><span class="visually-hidden">${escape(t(`heroes.${key}Of`, { name }))}</span></label>
    <select id="${field}" data-${key}="${id}">${options(count, selected)}</select>`;
}

function heroLine({ warlord, level }) {
  const rules = currentGame().game.heroRules;
  const unit = heroUnit(warlord, level);
  const name = label(warlord);
  const at = rankOf(level, rules);
  const power = t("heroes.at", { level, power: number(unit.stats.squadPower) });
  return `<li class="army-line hero-line">
    ${troopIcon(unit)}
    <div class="who"><span class="name">${escape(name)}</span><span class="meta">${escape(`${heroMeta(unit)} · ${power}`)}</span></div>
    <div class="hero-level">${choice("rank", warlord.id, name, rules.ranks, at.rank)}${choice("level", warlord.id, name, rules.levelsPerRank, at.level)}</div>
    <button type="button" class="icon" id="remove-hero-${warlord.id}" data-remove-hero="${warlord.id}" aria-label="${escape(t("heroes.remove", { name }))}">${ICONS.close}</button>
  </li>`;
}

/** A talent's name: its own label, or the stat and what it targets (a god's troops, a troop type, the march). */
function talentName(id) {
  const { game, talents } = currentGame();
  const shape = talents.find((entry) => entry.id === id) ?? game.talentCodes.find((entry) => entry.id === id);
  if (shape.labels) return label(shape);
  const stat = shape.stat === "marchCapacity" ? t("capacity.label") : nameOf("troopStats", shape.stat);
  const [field, [value] = []] = Object.entries(shape.target ?? {})[0] ?? [];
  const target = field ? nameOf(field, value) : t("talents.march");
  return t("talents.label", { stat, target });
}

const signed = (percent) => `${percent < 0 ? "−" : "+"}${number(Math.abs(percent), 1)} %`;

function talentItem(talent, chosen, full, inactive) {
  const { warlords } = currentGame();
  const checked = chosen.includes(talent.id);
  const from = t("talents.from", { names: talent.from.map((id) => label(warlords.get(id))).join(", ") });
  const note = inactive ? ` · ⓘ ${t("talents.inactive")}` : "";
  return `<li><label for="talent-${talent.id}"><input type="checkbox" id="talent-${talent.id}" data-talent="${talent.id}"${checked ? " checked" : ""}${full && !checked ? " disabled" : ""} />
    <span class="name">${escape(`${talentName(talent.id)} ${signed(talent.percent)}`)}</span><span class="visually-hidden">, </span><span class="meta">${escape(from + note)}</span></label></li>`;
}

export function drawTalents() {
  const game = currentGame();
  const { offered, chosen } = talentsOf(state.composition, game);
  const max = game.game.heroRules.talentsPerArmy;
  byId("talents-title").textContent = t("talents.title", { n: chosen.length, max });
  if (!offered.length) {
    byId("talent-list").innerHTML = `<p class="empty">${escape(t("talents.none"))}</p>`;
    return;
  }
  const full = chosen.length >= max;
  const applies = (id) =>
    Boolean(
      (game.talents.find((entry) => entry.id === id) ?? game.game.talentCodes.find((entry) => entry.id === id)).stat,
    );
  const items = offered.map((talent) => talentItem(talent, chosen, full, !applies(talent.id)));
  const status = full ? `<p class="hint">${escape(t("talents.full", { max }))}</p>` : "";
  byId("talent-list").innerHTML = `${status}<ul class="picker-list talent-list">${items.join("")}</ul>`;
}

export function drawHeroLines() {
  const heroes = heroesOf(state.composition, currentGame());
  byId("hero-lines").innerHTML = heroes.length
    ? `<ul class="army-list">${heroes.map(heroLine).join("")}</ul>`
    : `<p class="empty">${escape(t("heroes.empty", { name: state.composition.name || state.active + 1 }))}</p>`;
}

export function drawHeroes() {
  const rules = currentGame().game.heroRules;
  byId("heroes-composition").textContent = t("composition.tab", { name: state.composition.name || state.active + 1 });
  byId("heroes-hint").textContent = t("heroes.hint", { max: rules.heroesPerArmy, talents: rules.talentsPerArmy });
  drawHeroLines();
  drawTalents();
  drawHeroPicker();
}
