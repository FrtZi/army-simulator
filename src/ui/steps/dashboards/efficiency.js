// DASH-01 and DASH-06 · what one troop is worth per march slot (D-21): every troop of the game, with the
// player's bonuses, placed on two of its figures. The march capacity counts troops whatever their tier, so this
// is what each slot of an army gives. Efficiency: effective health across, damage up. Raiding: load across
// (what it carries home), speed up. Filters narrow the cloud; the troops of the composition being edited are
// ringed, and a button darkens all the others; names show when the pointer is on a dot.
import { escape } from "../../dom.js";
import { matchesFilters, multiFilter } from "../../filters.js";
import { label, number, troopMeta } from "../../format.js";
import { fullView, scatter } from "../../charts/scatter.js";
import { inView, zoomControls } from "../../charts/zoom.js";
import { chartTable } from "../../charts/table.js";
import { currentGame, state, validEffects } from "../../state.js";
import { efficiency } from "../../../engine/index.js";
import { t } from "../../texts/index.js";

const FILTERS = ["building", "tier", "alignment"];
const RADIUS = 6;

function points(rows, chart) {
  return rows.map((row) => {
    const inArmy = row.unit.id in state.troops;
    return {
      x: row[chart.x],
      y: row[chart.y],
      radius: RADIUS,
      alignment: row.unit.alignment,
      label: label(row.unit),
      title: `${label(row.unit)} (${troopMeta(row.unit)}): ${t(chart.yTitle)} ${number(row[chart.y])}, ${t(chart.xTitle)} ${number(row[chart.x])}`,
      ringed: inArmy,
      dimmed: state.highlightComposition && !inArmy,
    };
  });
}

/** The button that darkens every troop outside the composition being edited. */
function highlightButton(name) {
  const on = state.highlightComposition;
  return `<button type="button" id="highlight-toggle" aria-pressed="${on}">${escape(t("efficiency.highlight", { name }))}</button>`;
}

const filters = () => FILTERS.map((field) => multiFilter("eff-filter", field, state.efficiencyFilters[field])).join("");

/** The troops the chart shows, as a table: the chart's two figures, and whether each is in the composition. */
function table(visible, chart, name) {
  return chartTable({
    caption: t(chart.summary, { count: visible.length }),
    columns: [t(chart.yTitle), t(chart.xTitle)],
    rows: visible.map((row) => ({
      name: label(row.unit),
      note: row.unit.id in state.troops ? t("table.inComposition", { name }) : "",
      values: [row[chart.y], row[chart.x]],
    })),
  });
}

/** A panel: the hint, the filters, the chart of two measures and its table, the legend. */
function chartPanel(chart) {
  const { catalogue, rules } = currentGame();
  const units = [...catalogue.units.values()].filter((unit) => matchesFilters(unit, state.efficiencyFilters));
  const rows = efficiency(units, validEffects(), rules.model);
  const name = state.compositions[state.active].name || state.active + 1;
  const zoom = state.chartZoom[state.dashboard];
  const visible = rows.filter((row) => inView(zoom, row[chart.x], row[chart.y]));
  const drawn = visible.length
    ? scatter({
        points: points(visible, chart),
        view: zoom ?? fullView(rows.map((row) => ({ x: row[chart.x], y: row[chart.y] }))),
        xTitle: t(chart.xTitle),
        yTitle: t(chart.yTitle),
        summary: t(chart.summary, { count: rows.length }),
      }) + table(visible, chart, name)
    : `<p class="empty">${escape(t("picker.none"))}</p>`;
  return `<p class="hint">${escape(t(chart.hint))}</p>
    <div class="filters dash-filters">${filters()}</div>${zoomControls(state.dashboard, highlightButton(name))}${drawn}
    <p class="hint">${escape(t("efficiency.legend", { name }))}</p>`;
}

export const efficiencyPanel = () =>
  chartPanel({
    x: "health",
    y: "damage",
    xTitle: "map.x",
    yTitle: "map.y",
    hint: "efficiency.hint",
    summary: "efficiency.summary",
  });

export const raidPanel = () =>
  chartPanel({ x: "load", y: "speed", xTitle: "raid.x", yTitle: "raid.y", hint: "raid.hint", summary: "raid.summary" });
