// Zoom on the charts: drag a box on a chart to zoom into it; "+" and "−" zoom in towards the bottom-left corner
// (where the crowd of low tiers sits) and back out, for the keyboard; "Reset" shows the whole chart. Each
// dashboard keeps its own zoom (state.chartZoom).
import { escape } from "../dom.js";
import { state } from "../state.js";
import { t } from "../texts/index.js";

const MIN_BOX = 8; // a smaller drag is a click, not a zoom
const SVG_NS = "http://www.w3.org/2000/svg";

/** True when a point is inside the zoom (or when there is none). */
export const inView = (view, x, y) => !view || (x >= view.x0 && x <= view.x1 && y >= view.y0 && y <= view.y1);

/** The zoom buttons and how to zoom, above a chart, after any other control of the chart (`extra`). */
export function zoomControls(name, extra = "") {
  const zoomed = Boolean(state.chartZoom[name]);
  const button = (action, symbol) =>
    `<button type="button" class="icon" id="zoom-${action}" data-zoom="${action}" aria-label="${escape(t(`zoom.${action}`))}" title="${escape(t(`zoom.${action}`))}">${symbol}</button>`;
  return `<div class="zoom-bar"><span class="hint">${escape(t("zoom.hint"))}</span>${extra}${button("in", "+")}${button("out", "−")}${zoomed ? `<button type="button" id="zoom-reset" data-zoom="reset">${escape(t("zoom.reset"))}</button>` : ""}</div>`;
}

/** The chart's frame (left, top, width, height in SVG units) and ranges, as written by scatter(). */
const frameOf = (svg) => {
  const [left, top, width, height, x0, x1, y0, y1] = svg.getAttribute("data-frame").split(" ").map(Number);
  return { left, top, width, height, view: { x0, x1, y0, y1 } };
};

/** A pointer's position in the SVG's own units. */
function toSvg(svg, event) {
  const box = svg.getBoundingClientRect();
  const { width, height } = svg.viewBox.baseVal;
  return [((event.clientX - box.left) * width) / box.width, ((event.clientY - box.top) * height) / box.height];
}

/** A box dragged in SVG units, as ranges of values. */
function boxToView(svg, [ax, ay], [bx, by]) {
  const { left, top, width, height, view } = frameOf(svg);
  const valueX = (px) => view.x0 + ((px - left) / width) * (view.x1 - view.x0);
  const valueY = (py) => view.y0 + ((top + height - py) / height) * (view.y1 - view.y0);
  const [x0, x1] = [valueX(Math.min(ax, bx)), valueX(Math.max(ax, bx))];
  const [y0, y1] = [valueY(Math.max(ay, by)), valueY(Math.min(ay, by))];
  return { x0: Math.max(0, x0), x1, y0: Math.max(0, y0), y1 };
}

/** "+" halves the ranges from the bottom-left corner; "−" doubles them. */
function stepZoom(view, action) {
  const factor = action === "in" ? 0.5 : 2;
  return {
    x0: view.x0,
    x1: view.x0 + (view.x1 - view.x0) * factor,
    y0: view.y0,
    y1: view.y0 + (view.y1 - view.y0) * factor,
  };
}

/** Binds the zoom of the charts drawn in this container; `redraw` draws them again. */
export function bindZoom(container, redraw) {
  let drag = null;
  container.addEventListener("click", (event) => {
    const button = event.target.closest("[data-zoom]");
    const svg = container.querySelector("svg[data-frame]");
    if (!button || !svg) return;
    const action = button.dataset.zoom;
    state.chartZoom[state.dashboard] = action === "reset" ? null : stepZoom(frameOf(svg).view, action);
    redraw(button.id);
  });
  container.addEventListener("pointerdown", (event) => {
    const svg = event.target.closest("svg[data-frame]");
    if (!svg || event.button !== 0) return;
    const start = toSvg(svg, event);
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("class", "zoom-box");
    svg.append(rect);
    svg.setPointerCapture?.(event.pointerId);
    drag = { svg, start, rect };
  });
  container.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const [x, y] = toSvg(drag.svg, event);
    const [sx, sy] = drag.start;
    Object.entries({
      x: Math.min(x, sx),
      y: Math.min(y, sy),
      width: Math.abs(x - sx),
      height: Math.abs(y - sy),
    }).forEach(([key, value]) => drag.rect.setAttribute(key, value));
  });
  container.addEventListener("pointerup", (event) => {
    if (!drag) return;
    const end = toSvg(drag.svg, event);
    const { svg, start, rect } = drag;
    drag = null;
    rect.remove();
    if (Math.abs(end[0] - start[0]) < MIN_BOX || Math.abs(end[1] - start[1]) < MIN_BOX) return;
    state.chartZoom[state.dashboard] = boxToView(svg, start, end);
    redraw("zoom-reset");
  });
}
