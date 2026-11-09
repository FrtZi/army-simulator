// The brief for an agent reading the player's screenshots (CFG-06, D-27): the instructions, then the whole data
// dictionary as text, so the agent needs nothing else (no link to follow, no file to open). Markdown, which agents
// read well and a person can still check.

import { exampleFile } from "./setup-dictionary.js";

const NOT_CONFIRMED = "not confirmed yet";
const LANGUAGES = { en: "English", fr: "French" };
const json = (value) => JSON.stringify(value);
const row = (cells) => `| ${cells.join(" | ")} |`;
const table = (head, rows) => [row(head), row(head.map(() => "---")), ...rows.map(row)];

/** An element's value domain in words; a section's is its elements. */
function domainText({ valueDomain }, hasElements) {
  if (hasElements) return "see its elements below";
  if (valueDomain.const !== undefined) return `always ${json(valueDomain.const)}`;
  if (valueDomain.list) return `an id of the list "${valueDomain.list}"`;
  if (valueDomain.filters) {
    return `filters, each a list of ids of the list of the same name: ${valueDomain.filters.join(", ")}`;
  }
  const { min, max } = valueDomain;
  if (min !== undefined && max !== undefined) return `${min} to ${max}`;
  return min !== undefined ? `${min} or more` : "free";
}

function elementsText(elements) {
  const parentOf = (name) =>
    elements.some((other) => other.name.startsWith(`${name}.`) || other.name.startsWith(`${name}[].`));
  const head = ["Element", "Definition", "Data type", "Value domain", "Obligation", "Where in game", "Example"];
  return table(
    head,
    elements.map((element) => [
      `\`${element.name}\``,
      element.definition,
      element.dataType,
      domainText(element, parentOf(element.name)),
      element.obligation,
      element.whereInGame === undefined ? "" : (element.whereInGame ?? NOT_CONFIRMED),
      element.example === undefined ? "" : `\`${json(element.example)}\``,
    ]),
  );
}

/** A value list, one id per line with its English and French names; a name we translated is said so. */
function listText(name, entries) {
  const lines = entries.map(({ id, labels, translated, rarity, levels }) => {
    const names = [...new Set([labels.en, labels.fr])].filter(Boolean).join(" / ");
    const languages = translated?.map((language) => LANGUAGES[language]).join(" and ");
    const notes = [
      rarity,
      levels && `levels 0 to ${levels}`,
      languages && `the ${languages} name is ours, the game's may differ`,
    ];
    const note = notes.filter(Boolean).join("; ");
    return `- \`${json(id)}\`: ${names}${note ? ` (${note})` : ""}`;
  });
  return [`### ${name} (${entries.length})`, "", ...lines, ""];
}

function readingsText(readings) {
  return table(
    ["On screen", "In the file"],
    readings.map(({ onScreen, inFile, toConfirm }) => [
      `"${onScreen}"`,
      inFile.map((entry) => `\`${json(entry)}\``).join(" and ") +
        (toConfirm ? ` (${NOT_CONFIRMED}: ${toConfirm})` : ""),
    ]),
  );
}

/** The data dictionary as text: the elements, the value lists, the readings and an example file. */
export function dictionaryText(dictionary) {
  return [
    `# Data dictionary: Army Simulator setup, version ${dictionary.version}, ${dictionary.gameName}`,
    "",
    "## Elements",
    "",
    ...elementsText(dictionary.elements),
    "",
    "## Allowed ids, with the names the game shows (English / French)",
    "",
    ...Object.entries(dictionary.valueLists).flatMap(([name, entries]) => listText(name, entries)),
    "## From the game's wording to the file",
    "",
    ...readingsText(dictionary.readings),
    "",
    "## An example file",
    "",
    "```json",
    JSON.stringify(exampleFile(dictionary), null, 2),
    "```",
  ].join("\n");
}

/** The whole brief: the instructions (data/<game>/setup.json), then the dictionary. */
export function agentBrief(brief, dictionary) {
  const rules = brief.rules.map((rule) => `- ${rule}`);
  return [...brief.intro, "", "Rules:", ...rules, "", dictionaryText(dictionary), ""].join("\n");
}
