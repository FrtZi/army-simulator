// Writes data/<game>/champion-skills.json: the champion's two skill trees (BL-30). The conquest tree from cctools.cc's
// saved vigour-distribution page (its skills, their most levels and prerequisites), named in French as the game does
// (Frantz's screenshots, 2026-11-11); the champion tree, which cctools.cc does not have, from those screenshots
// (data/chaos-conquest/champion-tree.json, written by hand). Never edit the output by hand.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const PAGE = new URL("../captures/chaos-conquest/sources/cctools/skills/vigour-distribution.html", import.meta.url);
const HAND = new URL("../data/chaos-conquest/champion-tree.json", import.meta.url);
const OUTPUT = new URL("../data/chaos-conquest/champion-skills.json", import.meta.url);
const kebab = (code) => code.replaceAll("_", "-");

const pageData = (html) =>
  JSON.parse(
    html
      .match(/data-page="([^"]+)"/)[1]
      .replaceAll("&quot;", '"')
      .replaceAll("&amp;", "&"),
  ).props;

/** The conquest tree: each skill, its most levels, the level of each skill it asks; its French name if known. */
export function conquestTree(skillTree, hand) {
  const fixes = hand.conquest.prerequisites ?? {};
  return {
    id: "conquest",
    points: "monsterSkillPoints",
    labels: hand.conquest.labels,
    skills: skillTree.nodes.map((node) => ({
      id: kebab(node.code),
      labels: { en: node.name, fr: hand.conquest.french[node.name] ?? `${node.name}*` },
      branch: node.branch,
      max: node.maxLevel,
      requires:
        fixes[kebab(node.code)] ??
        Object.fromEntries(node.prerequisites.map((need) => [kebab(need.code), need.requiredLevel])),
    })),
  };
}

export function buildSkills(skillTree, hand) {
  return {
    source: `Written by scripts/import-skills.mjs from cctools.cc's vigour-distribution page and ${hand.source}: never edit by hand`,
    trees: [conquestTree(skillTree, hand), { id: "champion", points: "skillPoints", ...hand.champion }],
  };
}

export const formatSkills = (data) => `${JSON.stringify(data, null, 2)}\n`;

/** The skill trees from the saved page and the hand-made file, as the import writes them. */
export const savedSkills = () =>
  buildSkills(pageData(readFileSync(PAGE, "utf8")).skillTree, JSON.parse(readFileSync(HAND, "utf8")));

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const data = savedSkills();
  writeFileSync(OUTPUT, formatSkills(data));
  console.log(`✓ ${data.trees.map((tree) => `${tree.id}: ${tree.skills.length} skills`).join(", ")}`);
}
