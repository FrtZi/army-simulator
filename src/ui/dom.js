// Small DOM helpers.

export const byId = (id) => document.getElementById(id);

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Text safe to put in HTML (names come from data files and could hold any character). */
export const escape = (text) => String(text).replace(/[&<>"']/g, (char) => ESCAPES[char]);

/** `<option>`s from [value, label] pairs, with the selected one marked. */
export const options = (pairs, selected) =>
  pairs
    .map(
      ([value, text]) =>
        `<option value="${escape(value)}"${String(value) === String(selected) ? " selected" : ""}>${escape(text)}</option>`,
    )
    .join("");

/**
 * Redraws a part of the page and puts the focus back on the control that had it (matched by id), so a
 * keyboard user does not lose their place when a list is rebuilt.
 */
export function keepingFocus(draw) {
  const focusedId = document.activeElement?.id;
  draw();
  if (focusedId) byId(focusedId)?.focus();
}
