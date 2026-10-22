// A scatter chart in SVG, shared by the efficiency, raiding and damage-vs-tanking dashboards: one dot per troop
// type in its god's colour. Drawn by hand (no chart library, D-20); themed by the tokens through CSS classes.
// Names appear only when the pointer is on a dot (hover.js), in one name drawn over everything; each dot also
// has a title for screen readers and long presses.
import { escape } from "../dom.js";
import { number } from "../format.js";

const SIZE = { width: 680, height: 400, left: 64, right: 24, top: 16, bottom: 46 };
const TICKS = 4;
const HEADROOM = 1.08; // the highest dot stays inside the frame
const CHAR_WIDTH = 6.5; // an estimate of a 12 px name's character width, to keep it inside the chart
const GAP = 5; // between a dot and its name

/** Round tick steps: 1, 2 or 5 times a power of ten. */
function step(span) {
  const raw = span / TICKS;
  const power = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= raw);
}

function grid(scale, [min, max], axis) {
  const every = step(max - min);
  const ticks = [];
  for (let value = Math.ceil(min / every) * every; value <= max; value += every) ticks.push(value);
  return ticks
    .map((value) => {
      const at = scale(value);
      return axis === "x"
        ? `<line class="map-grid" x1="${at}" y1="${SIZE.top}" x2="${at}" y2="${SIZE.height - SIZE.bottom}"/><text class="map-label" x="${at}" y="${SIZE.height - SIZE.bottom + 16}" text-anchor="middle">${number(value)}</text>`
        : `<line class="map-grid" x1="${SIZE.left}" y1="${at}" x2="${SIZE.width - SIZE.right}" y2="${at}"/><text class="map-label" x="${SIZE.left - 6}" y="${at + 4}" text-anchor="end">${number(value)}</text>`;
    })
    .join("");
}

/** The ranges shown when there is no zoom: from 0 to just above the highest dot. */
export function fullView(points) {
  const top = (key) => Math.max(...points.map((point) => point[key])) * HEADROOM || 1;
  return { x0: 0, x1: top("x"), y0: 0, y1: top("y") };
}

/** Where a dot's name goes: right of it, or left of it when it would leave the chart. */
function namePlace(cx, cy, radius, text) {
  const toRight = cx + radius + GAP + text.length * CHAR_WIDTH <= SIZE.width - GAP;
  return { x: toRight ? cx + radius + GAP : cx - radius - GAP, y: cy + 4, anchor: toRight ? "start" : "end" };
}

/**
 * The chart: points [{ x, y, radius, alignment, label, title, ringed, dimmed }], axis titles, a summary that
 * names the chart for screen readers, and the view (the zoom).
 */
export function scatter({ points, xTitle, yTitle, summary, view = fullView(points) }) {
  const plotW = SIZE.width - SIZE.left - SIZE.right;
  const plotH = SIZE.height - SIZE.top - SIZE.bottom;
  const sx = (x) => SIZE.left + ((x - view.x0) / (view.x1 - view.x0)) * plotW;
  const sy = (y) => SIZE.top + plotH - ((y - view.y0) / (view.y1 - view.y0)) * plotH;
  const dots = points.map((point) => {
    const [cx, cy] = [sx(point.x), sy(point.y)];
    const place = namePlace(cx, cy, point.radius, point.label);
    const ring = point.ringed ? `<circle class="map-ring" cx="${cx}" cy="${cy}" r="${point.radius + 4}"/>` : "";
    const name = `data-name="${escape(point.label)}" data-nx="${place.x}" data-ny="${place.y}" data-anchor="${place.anchor}"`;
    return `<g class="dot god-${point.alignment}${point.dimmed ? " dimmed" : ""}" ${name}>${ring}<circle cx="${cx}" cy="${cy}" r="${point.radius}" fill="currentColor" fill-opacity="0.4" stroke="currentColor"><title>${escape(point.title)}</title></circle></g>`;
  });
  const titles = `<text class="map-label" x="${SIZE.left + plotW / 2}" y="${SIZE.height - 6}" text-anchor="middle">${escape(xTitle)} →</text>
    <text class="map-label" transform="translate(14 ${SIZE.top + plotH / 2}) rotate(-90)" text-anchor="middle">${escape(yTitle)} →</text>`;
  // the plot's frame and ranges, for the zoom to turn a dragged box into values
  const frame = `data-frame="${[SIZE.left, SIZE.top, plotW, plotH, view.x0, view.x1, view.y0, view.y1].join(" ")}"`;
  const hoverName = `<text class="map-label map-name" data-hover-name aria-hidden="true" visibility="hidden"></text>`;
  return `<svg class="damage-map" viewBox="0 0 ${SIZE.width} ${SIZE.height}" ${frame} role="img" aria-label="${escape(summary)}">${grid(sx, [view.x0, view.x1], "x")}${grid(sy, [view.y0, view.y1], "y")}${titles}${dots.join("")}${hoverName}</svg>`;
}
