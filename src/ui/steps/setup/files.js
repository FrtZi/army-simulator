// Your setup's files (CFG-05, CFG-06, D-27): a file uploaded is read and reviewed before anything changes, then
// applied to the setup shown (unsaved: Save keeps it); the setup, an empty file, an example, the dictionary and the
// brief for an agent are downloaded; the brief is copied where the browser allows it. Nothing is ever sent anywhere.
import { byId, keepingFocus } from "../../dom.js";
import { downloadFile, readText } from "../../files.js";
import { dictionaryOf } from "../../games.js";
import { currentGame, state } from "../../state.js";
import { writeSetupFile } from "../../../storage/setup-file.js";
import { emptySetup, mergeSetup } from "../../../storage/setup-merge.js";
import { agentBrief, dictionaryText } from "../../../storage/setup-brief.js";
import { exampleFile } from "../../../storage/setup-dictionary.js";
import { t } from "../../texts/index.js";
import { drawSetup } from "./draw.js";
import { drawSetupReview } from "./review.js";
import { choose, reviewOf } from "./import.js";

const json = (value) => JSON.stringify(value, null, 2);
const showStatus = (text) => {
  byId("setup-files-status").textContent = text;
};

async function upload(input) {
  const [file] = input.files;
  input.value = ""; // the same file chosen again is read again
  if (!file) return;
  state.setupImport = reviewOf(file.name, await readText(file));
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
  byId("setup-review").addEventListener("change", (event) => {
    const { parked: path } = event.target.dataset;
    if (!path) return;
    const entry = state.setupImport.parked[path].entries[event.target.value];
    state.setupImport = choose(state.setupImport, path, entry ? entry.id : null);
    keepingFocus(drawSetupReview);
  });
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
  // an example filled in and the dictionary alone, for a person or an agent (CFG-07)
  byId("setup-example").addEventListener("click", () =>
    download(`army-simulator-setup-example-${state.gameId}.json`, json(exampleFile(dictionaryOf(currentGame())))),
  );
  byId("setup-dictionary-download").addEventListener("click", () =>
    download(
      `army-simulator-dictionary-${state.gameId}.md`,
      dictionaryText(dictionaryOf(currentGame())),
      "text/markdown",
    ),
  );
  byId("setup-brief-download").addEventListener("click", () =>
    download(`army-simulator-brief-${state.gameId}.md`, brief(), "text/markdown"),
  );
  byId("setup-brief-copy").addEventListener("click", copyBrief);
}
