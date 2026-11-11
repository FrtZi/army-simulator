// The summaries of Your setup's blocks and the Guides when folded (FOLD-01): Your setup's figures are its tiles' and
// its status's, so a folded block says what its tile says.
import { shownText as shown } from "./dom.js";
import { t } from "./texts/index.js";

const tile = (section) => shown(`[data-tile="${section}"] .tile-figure`);

export const SETUP_SUMMARIES = {
  setup: () => shown("#setup-status"),
  "setup-files": () => shown("#setup-files-status") || t("fold.noFile"),
  "setup-warlords": () => t("fold.owned", { figure: tile("warlords") }),
  "setup-troops": () => tile("troops"),
  "setup-champion": () => tile("champion"),
  "setup-rituals": () => t("fold.entered", { figure: tile("rituals") }),
  "setup-buildings": () => t("fold.entered", { figure: tile("buildings") }),
  "setup-capacity": () => shown("#setup-capacity-total") || tile("capacity"),
  // the Champion lab's blocks (BONUS-09)
  "champion-level": () => `${shown("#clab-level option:checked")} · ${shown("#clab-figures .metric.key")}`,
  "champion-gear": () => shown("#clab-compare summary") || t("clab.noGear"),
  "champion-skills": () => shown("#clab-points"),
  guides: () => [shown(".guide-tabs [aria-selected=true]"), shown(".guide-detail h3")].filter(Boolean).join(" · "),
};
