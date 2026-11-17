// The search picture's axis (SIM-22, D-53): every army's score as a share of the best army found, the shares where
// the kept trios stand widened so that they read apart, the others squeezed at the left; every trio at a glance as
// bars by share on it.
import { escape } from "../../dom.js";
import { number } from "../../format.js";
import { t } from "../../texts/index.js";

export const PLOT = { left: 150, right: 660, axisY: 372, barsY: 150, barsHeight: 92 };
const SQUEEZED = 0.35; // the part of the plot the shares below the widened ones take
const TICK_GAP = 28; // the least room between two ticks' numbers, in pixels

export const round = (value) => Math.round(value * 10) / 10;

/**
 * Every score as a share (in %). A goal on the army's figures (`shared`) judges a trio the same way at a glance and
 * after: every score a share of the best army found. A battle's glance is a guess in other units: each row from its
 * worst army (0) to its best (100).
 */
export function sharesOf(trail, shared) {
  const exact = [...trail.kept.map(({ score }) => score), ...trail.settled.map(({ score }) => score)];
  const best = Math.max(...exact, ...(shared ? trail.glance : []));
  const ofBest = (values) => values.map((value) => (best > 0 ? (value / best) * 100 : 100));
  const ofRow = (values, row) => {
    const [low, high] = [Math.min(...row), Math.max(...row)];
    return values.map((value) => (high > low ? ((value - low) / (high - low)) * 100 : 100));
  };
  const rows = shared ? ofBest : ofRow;
  const glance = trail.kept.map(({ glance: score }) => score);
  return {
    glance: rows(trail.glance, trail.glance),
    keptGlance: rows(glance, trail.glance),
    kept: rows(
      trail.kept.map(({ score }) => score),
      exact,
    ),
    settled: rows(
      trail.settled.map(({ score }) => score),
      exact,
    ),
  };
}

/** The share where the axis widens: the lowest kept at a glance, to the whole percent below; null for one scale. */
export function focusOf(low, keptLow) {
  const focus = Math.floor(keptLow);
  return focus - low >= 2 && focus < 100 ? focus : null;
}

/** The x of a share: from `low` (left) to 100 (right), in one scale or squeezed below `focus` and widened above. */
export function xOf(low, focus) {
  const { left, right } = PLOT;
  const from = Math.min(low, 99);
  if (focus === null) return (share) => round(left + ((share - from) / (100 - from)) * (right - left));
  const split = left + SQUEEZED * (right - left);
  return (share) =>
    round(
      share < focus
        ? left + ((share - from) / (focus - from)) * (split - left)
        : split + ((share - focus) / (100 - focus)) * (right - split),
    );
}

/** The bins' lower edges: whole percents (or wider) below the focus, half percents above. */
function edgesOf(low, focus) {
  const edges = [];
  const below = focus ?? 100;
  const step = Math.max(1, Math.ceil((below - low) / 30));
  for (let edge = Math.floor(low); edge < below; edge += step) edges.push(edge);
  for (let edge = below; focus !== null && edge <= 100; edge += 0.5) edges.push(edge);
  return edges;
}

/** Every trio at a glance as bars by share, as high as the root of their count; the kept ones' and the chosen one's in their stage's colour. */
export function bars(shares, chosenGlance, x, { low, focus }) {
  const edges = edgesOf(low, focus);
  const binOf = (share) =>
    Math.max(
      0,
      edges.findLastIndex((edge) => edge <= share + 1e-9),
    );
  const counts = edges.map(() => 0);
  for (const share of shares.glance) counts[binOf(share)] += 1;
  const kept = new Set(shares.keptGlance.map(binOf));
  const top = Math.max(...counts);
  return counts
    .map((count, bin) => {
      if (!count) return "";
      const stage = bin === binOf(chosenGlance) ? "stage-chosen" : kept.has(bin) ? "stage-kept" : "stage-tried";
      const [from, to] = [x(edges[bin]) + 1, (bin + 1 < edges.length ? x(edges[bin + 1]) : PLOT.right + 3) - 1];
      const height = round(Math.max(4, Math.sqrt(count / top) * PLOT.barsHeight));
      return `<rect class="glance-bar ${stage}" x="${round(from)}" y="${round(PLOT.barsY - height)}" width="${round(Math.max(1.5, to - from))}" height="${height}" rx="1.5"><title>${escape(t(count > 1 ? "optimiser.barTitle" : "optimiser.barTitleOne", { n: number(count), percent: number(edges[bin], 1) }))}</title></rect>`;
    })
    .join("");
}

/** The ticks' shares: every 5 % below the focus, the focus, then every 1, 2 or 5 % above; never too close. */
function ticksOf(low, focus, x) {
  const above = focus ?? low;
  const span = 100 - above;
  const step = span <= 8 ? 1 : span <= 16 ? 2 : 5;
  const wanted = [];
  for (let share = Math.ceil(low / 5) * 5; share < above; share += 5) wanted.push(share);
  for (let share = Math.ceil(above / step) * step; share <= 100; share += step) wanted.push(share);
  if (focus !== null && !wanted.includes(focus)) wanted.push(focus);
  return wanted
    .sort((a, b) => b - a)
    .reduce((kept, share) => (kept.length && x(kept.at(-1)) - x(share) < TICK_GAP ? kept : [...kept, share]), []);
}

/** The axis: its ticks, the break where it widens, its title saying what a share is. */
export function axis(x, { low, focus, shared }) {
  const { left, right, axisY } = PLOT;
  const ticks = ticksOf(low, focus, x)
    .map(
      (share) =>
        `<path class="tick" d="M${x(share)} ${axisY}v5"/><text x="${x(share)}" y="${axisY + 19}" text-anchor="middle">${escape(number(share))}</text>`,
    )
    .join("");
  const split = focus === null ? "" : x(focus);
  const sides =
    focus === null
      ? ""
      : `<path class="tick" d="M${split - 5} ${axisY - 6}l4 12M${split + 1} ${axisY - 6}l4 12"/><text x="${left}" y="${axisY + 38}">${escape(t("optimiser.axisSqueezed", { percent: focus }))}</text><text x="${right}" y="${axisY + 38}" text-anchor="end">${escape(t("optimiser.axisWidened", { percent: focus }))}</text>`;
  const title = t(shared ? "optimiser.axisTitle" : "optimiser.axisTitleBattle");
  return `<path class="tick" d="M${left} ${axisY}H${right}"/>${ticks}${sides}<text class="axis-title" x="${(left + right) / 2}" y="${axisY + 62}" text-anchor="middle">${escape(title)}</text>`;
}
