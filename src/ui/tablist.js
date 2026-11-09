// A row of tabs, as the ARIA tabs pattern asks: a click on a tab, or the arrow keys (going round), Home and End,
// shows another one. Shared by the page's tabs, the dashboards' and the guides'.

const KEYS = { ArrowRight: 1, ArrowLeft: -1 };

/**
 * Binds a tab row: `names` in order, `current()` the one shown, `show(name)` shows one and moves the focus to it;
 * `attribute` is the data attribute naming each tab's choice (data-dash="rounds": "dash").
 */
export function bindTablist(row, names, current, show, attribute) {
  row.addEventListener("click", (event) => {
    const tab = event.target.closest(`[data-${attribute}]`);
    if (tab) show(tab.getAttribute(`data-${attribute}`));
  });
  row.addEventListener("keydown", (event) => {
    const index = names.indexOf(current());
    const next =
      { Home: 0, End: names.length - 1 }[event.key] ??
      (event.key in KEYS ? (index + KEYS[event.key] + names.length) % names.length : null);
    if (next === null) return;
    event.preventDefault();
    show(names[next]);
  });
}
