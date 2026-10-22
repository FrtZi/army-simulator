// A dot's name, shown only while the pointer is on it (mouse, pen or a tap): one name element per chart, drawn
// over every dot, moved to the dot pointed at and filled with its name (written by scatter() on the dot).

/** Binds the hover names of the charts drawn in this container. */
export function bindHoverNames(container) {
  container.addEventListener("pointerover", (event) => {
    const dot = event.target.closest?.(".dot");
    const name = dot?.closest("svg")?.querySelector("[data-hover-name]");
    if (!dot || !name) return;
    name.textContent = dot.getAttribute("data-name");
    name.setAttribute("x", dot.getAttribute("data-nx"));
    name.setAttribute("y", dot.getAttribute("data-ny"));
    name.setAttribute("text-anchor", dot.getAttribute("data-anchor"));
    name.setAttribute("visibility", "visible");
  });
  container.addEventListener("pointerout", (event) => {
    if (!event.target.closest?.(".dot")) return;
    event.target.closest("svg")?.querySelector("[data-hover-name]")?.setAttribute("visibility", "hidden");
  });
}
