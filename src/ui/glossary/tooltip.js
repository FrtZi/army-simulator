// Dotted terms and their tooltip (as in the banking churn demo). One tooltip for every term: shown on hover,
// keyboard focus or tap; closed with Escape, a second tap, a tap elsewhere or scrolling.
import { byId, escape } from "../dom.js";
import { state } from "../state.js";
import { t } from "../texts/index.js";
import { TERMS } from "./terms.js";

/** HTML of a dotted term: focusable text that shows its definition. */
export const term = (key, text) =>
  TERMS[key] ? `<span class="term" tabindex="0" data-term="${key}">${escape(text)}</span>` : escape(text);

function place(tip, element) {
  const box = element.getBoundingClientRect();
  tip.style.left = "0px";
  tip.style.top = "0px";
  tip.classList.add("on");
  const left = Math.min(Math.max(8, box.left + box.width / 2 - tip.offsetWidth / 2), innerWidth - tip.offsetWidth - 8);
  const above = box.top - tip.offsetHeight - 8;
  tip.style.left = `${left}px`;
  tip.style.top = `${above >= 8 ? above : box.bottom + 8}px`; // above if it fits, else below
}

export function setUpTooltip() {
  const tip = byId("tip");
  let owner = null;
  const show = (element) => {
    const entry = TERMS[element.dataset.term];
    if (!entry) return;
    owner = element;
    const [title, text] = entry[state.language];
    const source = entry.wiki ? `<span class="more">${escape(t("glossary.wiki"))}</span>` : "";
    tip.innerHTML = `<b>${escape(title)}</b>${escape(text)}${source}`;
    tip.setAttribute("aria-hidden", "false");
    element.setAttribute("aria-describedby", "tip");
    place(tip, element);
  };
  const hide = () => {
    owner?.removeAttribute("aria-describedby");
    owner = null;
    tip.classList.remove("on");
    tip.setAttribute("aria-hidden", "true");
  };
  const termOf = (event) => event.target.closest?.(".term");
  document.addEventListener("mouseover", (event) => termOf(event) && show(termOf(event)));
  document.addEventListener("mouseout", (event) => termOf(event) && hide());
  document.addEventListener("focusin", (event) => (termOf(event) ? show(termOf(event)) : hide()));
  document.addEventListener("click", (event) => {
    const element = termOf(event);
    if (!element) hide();
    else if (element === owner) hide();
    else show(element);
  });
  document.addEventListener("keydown", (event) => event.key === "Escape" && hide());
  addEventListener("scroll", hide, { passive: true });
}
