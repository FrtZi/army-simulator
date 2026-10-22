// The render pipeline: the only place that decides what to redraw.
//   renderAll() — after a structural change (language, game, a bonus or troop added or removed, a setup
//                 loaded): every part.
//   refresh()   — after a value typed in (a percentage, a count, the capacity, a name): only the computed
//                 parts, so the field being typed in is never rebuilt under the cursor.
import { keepingFocus } from "./dom.js";
import { applyTexts } from "./steps/page/draw.js";
import { drawThemeToggle } from "./steps/page/theme.js";
import { drawGame } from "./steps/game/draw.js";
import { drawBonuses, drawBonusProblems } from "./steps/bonuses/draw.js";
import { drawArmyLines, drawCapacity, drawCapacityFields, drawCompositions } from "./steps/army/draw.js";
import { drawPicker } from "./steps/picker/draw.js";
import { drawProfile } from "./steps/profile/draw.js";
import { drawCompare } from "./steps/compare/draw.js";
import { drawSaves } from "./steps/saves/draw.js";
import { drawDashboards } from "./steps/dashboards/draw.js";

export function refresh() {
  drawBonusProblems();
  drawCapacity();
  drawProfile();
  drawCompare();
  drawDashboards();
}

export function renderAll() {
  keepingFocus(() => {
    applyTexts();
    drawThemeToggle();
    drawGame();
    drawBonuses();
    drawCapacityFields();
    drawCompositions();
    drawArmyLines();
    drawPicker();
    drawSaves();
  });
  refresh();
}
