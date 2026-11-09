// Your setup's files (CFG-05, CFG-06, D-27): a file uploaded is read and reviewed before anything changes, then
// applied to the setup shown (unsaved: Save keeps it); the setup, an empty file and the brief for an agent are
// downloaded; the brief is copied where the browser allows it. Nothing is ever sent anywhere.
import { byId } from "../../dom.js";
import { downloadFile, readText } from "../../files.js";
import { GAMES_BY_ID, dictionaryOf } from "../../games.js";
import { currentGame, state } from "../../state.js";
import { readSetupFile, writeSetupFile } from "../../../storage/setup-file.js";
import { emptySetup, mergeSetup } from "../../../storage/setup-merge.js";
import { agentBrief } from "../../../storage/setup-brief.js";
import { t } from "../../texts/index.js";
import { drawSetup } from "./draw.js";
import { drawSetupReview } from "./review.js";

const json = (value) => JSON.stringify(value, null, 2);
const showStatus = (text) => {
  byId("setup-files-status").textContent = text;
};

/** The review of a file's text: what it brings to the setup shown, or why it cannot be read at all. */
function review(file, text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { file, unreadable: { code: "not-json" } };
  }
  const { game, sections, problems } = readSetupFile(parsed, GAMES_BY_ID);
  if (!sections) return { file, unreadable: problems[0] };
  if (game !== state.gameId) return { file, unreadable: { code: "game", read: game } };
  return { file, sections, problems, report: mergeSetup(state.playerSetup, sections).report };
}

async function upload(input) {
  const [file] = input.files;
  input.value = ""; // the same file chosen again is read again
  if (!file) return;
  state.setupImport = review(file.name, await readText(file));
  drawSetupReview();
}

/** Ends the review: the changes applied to the setup shown, or nothing done; the focus back on the upload. */
function close(apply) {
  if (apply) state.playerSetup = mergeSetup(state.playerSetup, state.setupImport.sections).setup;
  state.setupImport = apply ? { applied: true } : null;
  drawSetup();
  drawSetupReview();
  byId("setup-import").focus();
}

const brief = () => agentBrief(currentGame().setup.brief, dictionaryOf(currentGame()));
const download = (name, text, type) => showStatus(t("setupfile.downloaded", { file: downloadFile(name, text, type) }));

async function copyBrief() {
  try {
    await navigator.clipboard.writeText(brief());
    showStatus(t("setupfile.copied"));
  } catch {
    showStatus(t("setupfile.notCopied")); // no clipboard here, or the browser refused
  }
}

export function bindSetupFiles() {
  byId("setup-import").addEventListener("change", (event) => upload(event.target));
  byId("setup-review").addEventListener("click", (event) => {
    if (event.target.id === "setup-import-apply") close(true);
    if (event.target.id === "setup-import-cancel") close(false);
  });
  byId("setup-export").addEventListener("click", () =>
    download(`army-simulator-setup-${state.gameId}.json`, json(writeSetupFile(state.playerSetup, currentGame().game))),
  );
  byId("setup-template").addEventListener("click", () =>
    download(
      `army-simulator-setup-empty-${state.gameId}.json`,
      json(writeSetupFile(emptySetup(state.gameId), currentGame().game)),
    ),
  );
  byId("setup-brief-download").addEventListener("click", () =>
    download(`army-simulator-brief-${state.gameId}.md`, brief(), "text/markdown"),
  );
  byId("setup-brief-copy").addEventListener("click", copyBrief);
}
