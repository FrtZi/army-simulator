// DASH-04 · damage against tanking: each troop type of the composition being edited as a dot, its effective
// health per troop across, its damage per troop up, its size by troop count, in its god's colour. Hitters sit
// high, walls sit right.
import { escape } from "../../dom.js";
import { label, number } from "../../format.js";
import { fullView, scatter } from "../../charts/scatter.js";
import { inView, zoomControls } from "../../charts/zoom.js";
import { chartTable } from "../../charts/table.js";
import { currentArmy, state } from "../../state.js";
import { t } from "../../texts/index.js";

const RADIUS = { min: 5, max: 24 };

export function mapPanel() {
  const { profile } = currentArmy();
  const name = state.compositions[state.active].name || state.active + 1;
  const lines = profile.lines.filter((line) => line.count > 0);
  if (!lines.length) return `<p class="empty">${escape(t("map.empty", { name }))}</p>`;
  const most = Math.max(...lines.map((line) => line.count));
  const points = lines.map((line) => {
    const [x, y] = [line.health / line.count, line.damage / line.count];
    return {
      x,
      y,
      radius: RADIUS.min + (RADIUS.max - RADIUS.min) * Math.sqrt(line.count / most),
      alignment: line.unit.alignment,
      label: label(line.unit),
      title: `${label(line.unit)}: ${t("map.y")} ${number(y)}, ${t("map.x")} ${number(x)}, ${number(line.count)}`,
      count: line.count,
    };
  });
  const zoom = state.chartZoom[state.dashboard];
  const shown = points.filter((point) => inView(zoom, point.x, point.y));
  const table = chartTable({
    caption: t("map.summary", { count: shown.length }),
    columns: [t("map.y"), t("map.x"), t("table.count")],
    rows: shown.map((point) => ({ name: point.label, values: [point.y, point.x, point.count] })),
  });
  const chart = scatter({
    points: shown,
    view: zoom ?? fullView(points),
    xTitle: t("map.x"),
    yTitle: t("map.y"),
    summary: t("map.summary", { count: lines.length }),
  });
  return `<p class="hint">${escape(t("map.hint", { name }))}</p>${zoomControls(state.dashboard)}${chart}${table}`;
}
