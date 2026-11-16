// The optimiser's folding blocks (SIM-18, FOLD-01): each part of a tab is a block that opens and closes, its title
// and the line that sums it up always shown; closed as the player left it (state.optimiserView.closed), across redraws.
import { escape } from "../../dom.js";
import { state } from "../../state.js";

/** A block: its id (remembered closed or open), its title, its summary line, its body (HTML). */
export function block(id, title, line, body) {
  const open = !state.optimiserView.closed.has(id);
  return `<details class="opt-block" data-block="${id}"${open ? " open" : ""}>
    <summary><span class="opt-title">${escape(title)}</span> <span class="opt-line">${escape(line)}</span></summary>
    <div class="opt-body">${body}</div>
  </details>`;
}

/** A god's colour on a mark (a bar, a card's edge): a class; the god's name is always written beside it. */
export const godClass = (alignment) => `mark-${alignment}`;
