// The render pipeline: the only place that decides what to redraw.
//   renderAll() — after a structural change (language, game, a bonus or troop added or removed, a setup
//                 loaded): every part.
//   refresh()   — after a value typed in (a percentage, a count, the capacity, a name): only the computed
//                 parts, so the field being typed in is never rebuilt under the cursor.
import { keepingFocus } from "./dom.js";
import { applyTexts } from "./steps/page/draw.js";
import { drawThemeToggle } from "./steps/page/theme.js";
import { drawPageTabs } from "./steps/page/tabs.js";
import { drawGame } from "./steps/game/draw.js";
import { drawBonuses, drawBonusProblems } from "./steps/bonuses/draw.js";
import { drawArmyLines, drawCapacity, drawCapacityFields, drawCompositions } from "./steps/army/draw.js";
import { drawPicker } from "./steps/picker/draw.js";
import { drawHeroes } from "./steps/heroes/draw.js";
import { drawProfile } from "./steps/profile/draw.js";
import { drawCompare } from "./steps/compare/draw.js";
import { drawSaves } from "./steps/saves/draw.js";
import { drawDashboards } from "./steps/dashboards/draw.js";
import { drawSetupCapacityFields, drawSetupStatus } from "./steps/setup/draw.js";
import { drawSetupWarlords } from "./steps/setup/warlords.js";
import { drawSetupReview } from "./steps/setup/review.js";
import { drawLoadSetup } from "./steps/load/draw.js";
import { drawGuides } from "./steps/guides/draw.js";

export function refresh() {
  drawBonusProblems();
  drawCapacity();
  drawProfile();
  drawCompare();
  drawDashboards();
  drawSetupStatus();
}

export function renderAll() {
  keepingFocus(() => {
    applyTexts();
    drawThemeToggle();
    drawPageTabs();
    drawLoadSetup();
    drawGame();
    drawBonuses();
    drawCapacityFields();
    drawCompositions();
    drawArmyLines();
    drawPicker();
    drawHeroes();
    drawSaves();
    drawSetupWarlords();
    drawSetupCapacityFields();
    drawSetupReview();
    drawGuides();
  });
  refresh();
}
