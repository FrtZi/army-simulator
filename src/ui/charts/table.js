// A chart as a table (D-24): the troops the chart shows, its filters and zoom included, one row per troop with
// the chart's figures, highest first. The chart is one image to a screen reader and its dots cannot be reached
// by keyboard, so this table is how every figure stays within reach without a pointer (DEF-023). It sits under
// the chart in a disclosure, which stays open across redraws (state.chartTable).
import { escape } from "../dom.js";
import { number } from "../format.js";
import { state } from "../state.js";
import { t } from "../texts/index.js";

const cell = (value) => `<td class="num">${escape(number(value))}</td>`;
const rowName = ({ name, note }) => escape(note ? `${name} — ${note}` : name);

/**
 * The table: a caption, the titles of the figures (`columns`), and the rows [{ name, note, values }], each
 * value in the order of `columns`; rows are sorted on the first figure, highest first.
 */
export function chartTable({ caption, columns, rows }) {
  const sorted = [...rows].sort((a, b) => b.values[0] - a.values[0]);
  const head = [t("col.troop"), ...columns]
    .map((title, index) => `<th scope="col"${index ? ' class="num"' : ""}>${escape(title)}</th>`)
    .join("");
  const body = sorted
    .map((row) => `<tr><th scope="row">${rowName(row)}</th>${row.values.map(cell).join("")}</tr>`)
    .join("");
  return `<details class="chart-table" id="chart-table"${state.chartTable ? " open" : ""}>
    <summary>${escape(t("table.show", { count: rows.length }))}</summary>
    <div class="table-wrap"><table><caption>${escape(caption)}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
  </details>`;
}
