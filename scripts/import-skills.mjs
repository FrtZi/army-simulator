// Writes data/<game>/champion-skills.json: the champion's two skill trees (BL-30). The conquest tree from cctools.cc's
// saved vigour-distribution page (its skills, their most levels and prerequisites), named in French as the game does
// (Frantz's screenshots, 2026-11-11); the champion tree, which cctools.cc does not have, from those screenshots
// (data/chaos-conquest/champion-tree.json, written by hand), what each level of 29 of its skills gives from three
// cctools.cc tools (damage, training, march speed). Never edit the output by hand.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const PAGE = new URL("../captures/chaos-conquest/sources/cctools/skills/vigour-distribution.html", import.meta.url);
const HAND = new URL("../data/chaos-conquest/champion-tree.json", import.meta.url);
// where the bonuses' definitions are: the champion's gear, then the rituals' and the buildings' (troop bonuses)
const DEFINITIONS = ["champion", "rituals", "structures"].map(
  (file) => new URL(`../data/chaos-conquest/${file}.json`, import.meta.url),
);
// the cctools.cc tools whose pages give what each level of a champion skill brings
const TOOLS = ["dpu-calculator", "training-healing", "march-speed-calculator"].map(
  (page) => new URL(`../captures/chaos-conquest/sources/cctools/skills/${page}.html`, import.meta.url),
);
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

/** Each champion skill a tool knows, by its code: its name, its most levels, each level's figures. */
function knownSkills(pages) {
  const lists = pages.flatMap((page) => [page.champion_skills, page.championSkills]).filter(Boolean);
  return new Map(lists.flatMap((list) => Object.values(list)).map((skill) => [skill.code, skill]));
}

/** What a level gives, as the site's bonuses: a stat code becomes its bonus id; a bare modifier, the skill's own. */
function bonusesOf(skill, codes) {
  const own =
    skill.code === "leading_the_charge"
      ? ["march-speed-modifier"]
      : (skill.applicable_unit_types ?? ["defenses"]).map((type) => `${kebab(type)}-produce-speed-modifier`);
  const gives = {};
  for (let level = 1; level <= skill.max_level; level += 1) {
    for (const [stat, fraction] of Object.entries(skill.levels[level] ?? {})) {
      const ids = stat === "modifier" ? own : [codes.get(stat) ?? kebab(stat)];
      for (const id of ids) {
        (gives[id] ??= Array(skill.max_level).fill(null))[level - 1] = Math.round(fraction * 10000) / 100;
      }
    }
  }
  return gives;
}

/**
 * The champion tree: a skill a tool knows takes its English name, its most levels and what each level gives; the tree
 * carries the definition of each bonus its skills give (its stat and troops, or its name), the hand-made ones first.
 */
function championTree(hand, known, definitions) {
  const codes = new Map(definitions.map((bonus) => [bonus.code, bonus.id]));
  const skills = hand.champion.skills.map(({ cctools, ...skill }) => {
    const found = known.get(cctools);
    if (!found) return skill;
    const labels = { en: found.name, fr: skill.labels.fr };
    return { ...skill, labels, max: found.max_level, gives: bonusesOf(found, codes) };
  });
  const used = new Set(skills.flatMap((skill) => Object.keys(skill.gives ?? {})));
  const byId = new Map(definitions.map((bonus) => [bonus.id, bonus]));
  const own = new Map((hand.champion.bonuses ?? []).map((bonus) => [bonus.id, bonus]));
  const bonuses = [...used].sort().map((id) => own.get(id) ?? byId.get(id) ?? { id });
  return { id: "champion", points: "skillPoints", ...hand.champion, skills, bonuses };
}

export function buildSkills(skillTree, hand, pages = [], definitions = []) {
  return {
    source: `Written by scripts/import-skills.mjs from cctools.cc's vigour-distribution page and ${hand.source}: never edit by hand`,
    trees: [conquestTree(skillTree, hand), championTree(hand, knownSkills(pages), definitions)],
  };
}

export const formatSkills = (data) => `${JSON.stringify(data, null, 2)}\n`;

/** The skill trees from the saved pages and the hand-made file, as the import writes them. */
export const savedSkills = () =>
  buildSkills(
    pageData(readFileSync(PAGE, "utf8")).skillTree,
    JSON.parse(readFileSync(HAND, "utf8")),
    TOOLS.map((page) => pageData(readFileSync(page, "utf8"))),
    DEFINITIONS.map((file) => JSON.parse(readFileSync(file, "utf8"))).flatMap((data) => [
      ...data.effects,
      ...(data.march ?? []),
      ...(data.other ?? []),
    ]),
  );

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const data = savedSkills();
  writeFileSync(OUTPUT, formatSkills(data));
  console.log(`✓ ${data.trees.map((tree) => `${tree.id}: ${tree.skills.length} skills`).join(", ")}`);
}
