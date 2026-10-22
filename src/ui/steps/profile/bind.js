// The details buttons in the headers of the profile table: each opens or closes its column's details.
import { byId, keepingFocus } from "../../dom.js";
import { state } from "../../state.js";
import { drawProfile } from "./draw.js";

export function bindProfile() {
  byId("profile-lines").addEventListener("click", (event) => {
    const button = event.target.closest("[data-details]");
    if (!button) return;
    const { details } = button.dataset;
    if (state.profileDetails.has(details)) state.profileDetails.delete(details);
    else state.profileDetails.add(details);
    keepingFocus(drawProfile);
  });
}
