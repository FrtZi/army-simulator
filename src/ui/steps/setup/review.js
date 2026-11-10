// What an uploaded setup file brings, before anything changes (CFG-05, D-27): per section, chips in colour with an
// icon and a word (added, updated, unchanged, kept); the values parked, each with the list to choose from, the
// nearest already chosen where there is one, or "leave it out"; the values no list can fix, left out with where,
// what and why; then Apply or Cancel. A file that cannot be read at all says why in one line.
import { byId, escape } from "../../dom.js";
import { label } from "../../format.js";
import { CONFIG } from "../../config.js";
import { state } from "../../state.js";
import { t } from "../../texts/index.js";

const CHIPS = { added: "+", updated: "↻", unchanged: "=", kept: "•", removed: "−" };
const shown = (value) => (typeof value === "string" ? `"${value}"` : (JSON.stringify(value) ?? "—"));
const chip = (kind, text) =>
  `<span class="chip chip-${kind}"><span aria-hidden="true">${CHIPS[kind]}</span> ${escape(text)}</span>`;
/** The id of a parked value's list, from its path in the file: stable while choices are made. */
export const parkedId = (path) => `parked-${path.replace(/[^a-z0-9]+/gi, "-")}`;

/** Why a value was set aside, in words: the file's own reason, else the one under a bonus row. */
export function reasonText(problem) {
  const key = `setupfile.${problem.code}`;
  const text = t(key, problem);
  return text === key ? t(`problem.${problem.code}`, problem) : text;
}

/** How many entries or values of a section the file changes (added, updated, and removed when it replaces). */
const changes = (report) => (report.added ?? 0) + report.updated + (report.removed ?? 0);
/** How many entries of a list section the file holds, whatever it does with them. */
const held = (report) => (report.added ?? 0) + report.updated + report.unchanged;

function counts(name, report) {
  const version = CONFIG.setupComing[name];
  if (!held(report) && !report.kept) return [chip("unchanged", t("setupfile.none"))];
  if (version && version !== "next") return [chip("kept", t("setupfile.later", { version }))];
  const removed = report.removed ? [chip("removed", t("setupfile.removed", { n: report.removed }))] : [];
  if (!("added" in report)) {
    return [
      report.updated
        ? chip("updated", t("setupfile.changed", { n: report.updated }))
        : chip("unchanged", t("setupfile.same")),
      ...removed,
    ];
  }
  return Object.keys(CHIPS)
    .filter((kind) => report[kind] > 0)
    .map((kind) => chip(kind, t(`setupfile.${kind}`, { n: report[kind] })));
}

/** Add to what the player has, or replace it: offered for a section the file holds something of (CFG-09). */
function howApplied(name, report, replace) {
  if (!held(report) && !report.updated && !report.unchanged) return "";
  const id = `setup-replace-${name}`;
  const choices = [
    ["add", t("setupfile.addTo")],
    ["replace", t("setupfile.replace")],
  ].map(
    ([value, text]) =>
      `<option value="${value}"${(value === "replace") === replace ? " selected" : ""}>${escape(text)}</option>`,
  );
  return `<label class="visually-hidden" for="${id}">${escape(t("setupfile.howApplied", { section: t(`tile.${name}`) }))}</label>
    <select id="${id}" class="replace-choice" data-replace="${name}">${choices.join("")}</select>`;
}

const sectionRow = (name, report, replace) =>
  `<li class="report-row"><span class="report-section">${escape(t(`tile.${name}`))}</span> ${counts(name, report).join(" ")} ${howApplied(name, report, replace.includes(name))}</li>`;

function parkedRow({ path, read, entries, problem }, chosen) {
  const id = parkedId(path);
  // by name in the page's language: the list is read, not the file's order
  const sorted = entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => label(a.entry).localeCompare(label(b.entry), undefined, { numeric: true }));
  const choices = sorted.map(({ entry, index }) => {
    const selected = entry.id === chosen ? " selected" : "";
    return `<option value="${index}"${selected}>${escape(label(entry))}</option>`;
  });
  return `<li class="parked-row">
    <span>${escape(t("setupfile.readAs", { path, read: shown(read), reason: reasonText(problem) }))}</span>
    <label class="visually-hidden" for="${id}">${escape(t("setupfile.useInsteadOf", { read: shown(read), path }))}</label>
    <select id="${id}" data-parked="${escape(path)}">
      <option value=""${chosen === null || chosen === undefined ? " selected" : ""}>${escape(t("setupfile.leaveOut"))}</option>${choices.join("")}
    </select>
  </li>`;
}

function reviewHtml({ file, report, parked, choices, leftOut, replace = [] }) {
  const rows = Object.entries(report).map(([name, section]) => sectionRow(name, section, replace));
  const changed = Object.values(report).some((section) => changes(section) > 0);
  const parkedRows = Object.values(parked).map((entry) => parkedRow(entry, choices[entry.path]));
  const leftRows = leftOut.map(
    (problem) =>
      `<li>${escape(t("setupfile.readAs", { path: problem.path, read: shown(problem.read), reason: reasonText(problem) }))}</li>`,
  );
  return `<h3>${escape(t("setupfile.brings", { file }))}</h3>
    ${rows.length ? `<ul class="setup-report">${rows.join("")}</ul>` : ""}
    ${changed ? "" : `<p>${escape(t("setupfile.nothing"))}</p>`}
    ${parkedRows.length ? `<h3 class="report-parked"><span aria-hidden="true">?</span> ${escape(t("setupfile.parkedTitle", { n: parkedRows.length }))}</h3><p class="hint">${escape(t("setupfile.parkedHint"))}</p><ul class="setup-report parked-list">${parkedRows.join("")}</ul>` : ""}
    ${leftRows.length ? `<h3 class="report-left"><span aria-hidden="true">⚠</span> ${escape(t("setupfile.leftOutTitle", { n: leftRows.length }))}</h3><ul class="setup-report left-list">${leftRows.join("")}</ul>` : ""}
    <div class="file-actions">
      ${changed ? `<button id="setup-import-apply" type="button" class="primary">${escape(t("setupfile.apply"))}</button>` : ""}
      <button id="setup-import-cancel" type="button">${escape(t("setupfile.cancel"))}</button>
    </div>`;
}

/** The review of the file uploaded, if any: what it brings, what to check, or that it was applied. */
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
