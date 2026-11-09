// "Load your setup" (CFG-04, D-27): the switch redraws the whole lab, its figures now from the setup or not; the
// button opens Your setup, where the setup is entered and saved.
import { byId } from "../../dom.js";
import { state } from "../../state.js";
import { renderAll } from "../../render.js";

export function bindLoadSetup() {
  byId("load-setup-toggle").addEventListener("change", (event) => {
    state.useSetup = event.target.checked;
    renderAll();
  });
  byId("load-setup-open").addEventListener("click", () => {
    state.page = "setup";
    renderAll();
    byId("page-tab-setup").focus();
  });
}
