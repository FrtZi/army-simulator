// What an uploaded setup file brings, before anything changes (CFG-05, D-27): per section, what is added, updated,
// unchanged and kept; every value left out, with where it is in the file, what was read and why; then Apply or
// Cancel. A file that cannot be read at all says why in one line.
import { byId, escape } from "../../dom.js";
import { label } from "../../format.js";
import { CONFIG } from "../../config.js";
import { currentGame, state } from "../../state.js";
import { t } from "../../texts/index.js";

const shown = (value) => (typeof value === "string" ? `"${value}"` : (JSON.stringify(value) ?? "nothing"));

/** Why a value was left out, in words: the file's own reason, else the one under a bonus row. */
export function reasonText(problem) {
  if (problem.code === "unknown-warlord" && problem.suggestion) {
    const name = label(currentGame().warlords.get(problem.suggestion));
    return t("setupfile.suggestion", { name, suggestion: problem.suggestion });
  }
  const key = `setupfile.${problem.code}`;
  const text = t(key, problem);
  return text === key ? t(`problem.${problem.code}`, problem) : text;
}

function sectionLine(name, report) {
  const section = t(`tile.${name}`);
  const version = CONFIG.setupComing[name];
  if (version && version !== "next") return t("setupfile.later", { section, version });
  return "added" in report
    ? t("setupfile.list", { section, ...report })
    : t("setupfile.fields", { section, ...report });
}

function reviewHtml({ file, report, problems }) {
  const lines = Object.entries(report).map(([name, counts]) => `<li>${escape(sectionLine(name, counts))}</li>`);
  const refused = problems.map(
    (problem) =>
      `<li>${escape(t("setupfile.refusedValue", { path: problem.path, read: shown(problem.read), reason: reasonText(problem) }))}</li>`,
  );
  return `<h3>${escape(t("setupfile.brings", { file }))}</h3>
    ${lines.length ? `<ul class="setup-report">${lines.join("")}</ul>` : `<p>${escape(t("setupfile.nothing"))}</p>`}
    ${refused.length ? `<h3><span aria-hidden="true">⚠</span> ${escape(t("setupfile.refusedTitle", { n: refused.length }))}</h3><ul class="setup-report">${refused.join("")}</ul>` : ""}
    <div class="file-actions">
      ${lines.length ? `<button id="setup-import-apply" type="button" class="primary">${escape(t("setupfile.apply"))}</button>` : ""}
      <button id="setup-import-cancel" type="button">${escape(t("setupfile.cancel"))}</button>
    </div>`;
}

/** The review of the file uploaded, if any: what it brings, what it could not read, or that it was applied. */
export function drawSetupReview() {
  const review = state.setupImport;
  const box = byId("setup-review");
  if (!review) box.innerHTML = "";
  else if (review.applied) {
    box.innerHTML = `<p class="status pending"><span aria-hidden="true">✓</span> ${escape(t("setupfile.applied"))}</p>`;
  } else if (review.unreadable) {
    const reason = reasonText(review.unreadable);
    box.innerHTML = `<p class="problem"><span aria-hidden="true">⚠</span> ${escape(t("setupfile.unreadable", { file: review.file, reason }))}</p>`;
  } else box.innerHTML = reviewHtml(review);
}
