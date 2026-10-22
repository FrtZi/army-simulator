// The profile's table: one row per troop type; the count, then the three key figures as tinted columns (power,
// damage per strike, effective health). Each key column has its own details button, in its header, that opens
// the columns it comes from: power per troop; attack and damage; armour and health.
import { escape } from "../../dom.js";
import { label, nameOf, number } from "../../format.js";
import { term } from "../../glossary/tooltip.js";
import { troopIcon } from "../../icons.js";
import { state } from "../../state.js";
import { t } from "../../texts/index.js";

const GROUPS = [
  { key: "count", value: (line) => number(line.count) },
  {
    key: "power",
    term: "power",
    value: (line) => number(line.power),
    details: [{ key: "powerPerTroop", term: "power", value: (line) => number(line.powerPerTroop) }],
  },
  {
    key: "strike",
    term: "strike",
    value: (line) => number(line.damage),
    details: [
      {
        key: "attack",
        term: "attack",
        value: (line) => `${number(line.attack)} (${nameOf("attackTypes", line.mode)})`,
      },
      { key: "damagePerHit", term: "damage", value: (line) => number(line.damagePerHit) },
    ],
  },
  {
    key: "ehp",
    term: "ehp",
    value: (line) => number(line.health),
    details: [
      { key: "armour", term: "armour", value: (line) => number(line.armour) },
      { key: "healthPerTroop", term: "health", value: (line) => number(line.healthPerTroop) },
    ],
  },
];

const title = (column) => (column.term ? term(column.term, t(`col.${column.key}`)) : escape(t(`col.${column.key}`)));

/** A key column's header: its title and the button that opens or closes its details. */
function keyHeader(group) {
  const open = state.profileDetails.has(group.key);
  const name = t(`col.${group.key}`);
  const action = t(open ? "col.hideDetails" : "col.showDetails", { name });
  return `<th scope="col" class="num key"><span class="th-key">${title(group)}<button type="button" class="col-toggle" id="details-${group.key}" data-details="${group.key}" aria-expanded="${open}" aria-label="${escape(action)}" title="${escape(action)}">${open ? "−" : "+"}</button></span></th>`;
}

/** The columns shown, in order: each key column followed by its details when they are open. */
function visibleColumns() {
  return GROUPS.flatMap((group) => {
    const main = { ...group, main: Boolean(group.details) };
    const details = group.details && state.profileDetails.has(group.key) ? group.details : [];
    return [main, ...details.map((detail) => ({ ...detail, detail: true }))];
  });
}

export function profileTable(lines) {
  const columns = visibleColumns();
  const header = columns.map((column) => {
    if (column.main) return keyHeader(column);
    return `<th scope="col" class="num${column.detail ? " detail" : ""}">${title(column)}</th>`;
  });
  const cellClass = (column) => `num${column.main ? " key" : ""}${column.detail ? " detail" : ""}`;
  const rows = lines.map((line) => {
    const cells = columns.map((column) => `<td class="${cellClass(column)}">${escape(column.value(line))}</td>`);
    return `<tr><th scope="row"><span class="cell-troop">${troopIcon(line.unit)}${escape(label(line.unit))}</span></th>${cells.join("")}</tr>`;
  });
  return `<table><thead><tr><th scope="col">${escape(t("col.troop"))}</th>${header.join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}
