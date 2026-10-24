# Decisions: why these choices

[← Overview](../ARCHITECTURE.md)

## D-01 · A static page, no server (2026-10-22)

The simulator is one static page on GitHub Pages; all computation runs in the browser.

- **Set aside: a backend with accounts** (Firebase, Supabase). It would bring sign-in, hosting costs and
  player data held by a third party, for a need (private configurations) the browser already covers.
- **Why it is enough:** a link to the published page is all a player needs. There is no web API: the
  "public API" of the engine is only `src/engine/index.js`, the one module the page and the tests import.

## D-02 · Configurations saved in the browser, plus a JSON file (2026-10-22)

Each player's configurations live in their browser (`localStorage`); they can export one as a JSON file and
import it back. The export is also the backup, and its restore is tested (REL-01).

- **Set aside: IndexedDB.** More code for a few kilobytes of data.
- **Known limit:** clearing the browser's data erases the configurations; the export is the safeguard.

## D-03 · Sharing by file or link, never by a shared database (2026-10-22)

To be confirmed with the need (CFG-03): a player shares an exported file, or a read-only link that carries the
configuration after the `#` of the URL. Browsers never send that part to the server.

- **Set aside: a shared database**, which D-01 rules out.

## D-04 · One effect shape for every bonus (2026-10-22)

Heroes, rituals, champion, armour and buildings all resolve to the same **effects** (stat, percentage or flat
amount, target). The engine applies effects; a resolver per source kind turns a player's levels into effects.

- **Set aside: one model per source.** Each new source would have touched the stat calculation.
- **Now:** only the `manual` source exists (the totals of the in-game boost summary), the other shapes are
  documented ([data-model.md](data-model.md)) and will be built when used.

## D-05 · Scenarios as a list, two on screen (2026-10-22)

The configuration holds a list of scenarios and the engine compares them all against the first one. The
interface shows two; showing more is a setting, not a change of format.

## D-06 · Screenshots stay on this computer (2026-10-22)

The in-game screenshots (`captures/`) are ignored by git. The art belongs to the game's publishers, and some
screens show other players' names, which are personal data.

- **Open question:** using unit pictures in the published page needs the publishers' permission, or a
  stand-in (initials, tier badge). To decide with the interface.

## D-07 · Unofficial fan tool (2026-10-22)

The page will say it is unofficial and not affiliated with Games Workshop or Tilting Point. The repo's name
avoids their trademarks. The unit stats are factual game data, transcribed by hand.

## D-08 · Names in French and English, copied from the game (2026-10-22)

Each name the game shows is stored under `labels`, one entry per language (`labels.fr`, `labels.en`), next
to the fact it names in `data/`. The English name is copied from the game set to English, not translated: the
official names (Skin Wolves, Forsaken, Hellcannon…) are what English-speaking players search for and recognise.
The page's own texts (buttons, titles) will live in one file per language, created with the page (LANG-02).

- **Set aside: translating the French names ourselves**, as the rule. A guessed name would not match what an
  English-speaking player sees in the game.
- **Exception (2026-10-22, Frantz's call):** when no source gives the game's name in one language, we translate
  it and mark it with a star at the end (`Food Upkeep*`), so the page can show it is ours. The star goes as
  soon as the game's own name is known.
- **Set aside: a translation library** (i18next and the like). Two languages and a few hundred strings need a
  lookup in an object, not a dependency.

**Source of the English names (2026-10-22):** an English-language reference kept locally (D-10). It is older
than the game (D-09), so its names are provisional: each one is confirmed when an English screenshot shows it.

## D-09 · The screenshots win over any other source (2026-10-22)

The stats in `data/chaos-conquest/units.json` are transcribed from the in-game sheets. When another source disagrees (a
spreadsheet, a guide), the screenshot decides. Checked on 2026-10-22 against an independent reference (D-10): 13 of 61
shared units differed, and the screenshots confirmed our values every time; the reference predates a rebalance (the
dragons and the War Altar moved from tier V or IV to VI, the Chaos Spawn from I to II, several knights changed).

The same check showed that the stat the French game calls "Charger" is the **load** (how much a troop carries),
the "Load" of the English game, not a charge bonus: every value matches the reference's Load. It is
stored as `load` (DEF-001).

## D-10 · A control solution, kept off the repo (2026-10-22)

An independent calculation of the troops' damage and effective health, made by a member of the warband, is our
**control solution** (SIM-07): for the same stats and bonuses, the engine must give the same figures; a
difference is explained before either side is trusted. It is someone else's work: it stays on the author's
computer (`captures/`, ignored by git, with the notes of each run), and the repo does not describe it.

- **Not a source of truth for stats:** the screenshots win (D-09).
- **Credit:** contributors are named in the README only.

## D-11 · Defences: a catalogue of their own, the fortress as the defending side (2026-10-22)

Defences (walls, pits, towers) are built in the Fortress Walls and never leave the fortress. They live in
`data/chaos-conquest/defences.json`, with the same fields as a unit (tier, attack type, alignment, stats), so the battle engine
handles both alike. A player's configuration will hold a **fortress**: its defences, within the walls' defence
capacity ("Défenses totales"), plus the troops garrisoned there. A battle is army against army, or army against
fortress, where the published rules apply: defences are hit first within a tier, attack every turn, never fail
morale.

- **Set aside: defences as units with a flag.** One forgotten check and a wall marches with the army.
- **Their sheets show fewer stats:** no squad size, upkeep, speed or load; one attack type at most, none at all
  for the Debased Mortar (a wall that only absorbs damage). English names: the game's own since D-25.

## D-12 · How bonuses combine, what power counts (2026-10-22)

Provisional rules of the engine (`src/engine/stats.js`, `army.js`), to confirm with the calibration (SIM-04):

- **Bonuses are percentages, from 0 to 100 %; they add up, then apply once to the base:** +10 % and +15 % give
  +25 %, not 1.10 × 1.15. No flat amounts (Frantz's call, 2026-10-22). The march capacity follows the same rule, as does the
  control calculation (D-10).
- **Power = count × "Puissance d'escouade".** Despite its name, the sheet's figure is the power each single
  troop adds: the training screen shows 12 000 Debased Mortars (power 1) as a power gain of 12 000.
- **Bonuses change stats and capacity, not power.** The game's power reflects what is trained, not boosts.
- **Army size is counted in troops**, like the march capacity ("Capacité de marche").

- **Set aside: multiplying percentages.** Nothing in the game or the control calculation points to it; one test changes
  if the calibration proves otherwise.

## D-13 · One folder per game (2026-10-22)

The simulator starts by choosing the game (GAME-01). Each game's facts live in their own folder,
`data/<game>/` (`game.json`, `units.json`, `defences.json`, `combat-rules.json`), and the games are listed
once in `data/games.json`. A saved configuration names its game. The engine receives a game's data from its
caller, so a new game is a new folder and a line in `games.json`: no engine change. The screenshots follow the
same layout (`captures/<game>/`).

- **Set aside: one shared folder with a game field on every entry.** Every file and every test would filter by
  game; a folder per game keeps each game's data whole and readable.

## D-14 · What a bonus can change (2026-10-22)

Frantz's rules for the bonuses a player enters (BONUS-01): a percentage from 0 to 100 % (`bonusPercent` in
`data/<game>/game.json`), on any stat except those the game fixes, marked `boostable: false`: squad size, food
upkeep, squad power. A bonus can target troop types, alignments, tiers, attack types, buildings or single units.
The march capacity is a fixed base plus a percentage bonus, and the page shows the base, the bonus and the
total (ARMY-02). The engine reports a wrong bonus as problem codes (`effectProblems`), which the page
translates.

## D-15 · Adding troops: a list with an "Add troops" picker (2026-10-22)

The army is a list of troop lines (name, tier, god, count, remove), under the march capacity bar (base, bonus,
total, used and free, the army's power). An "Add troops" button opens a picker in the page: a search box, four
filters (building, tier, god, type), a list of troops to tick, several at once; troops already in the army show
as such. Chosen by Frantz after trying a clickable prototype of both layouts: smoother, and it keeps the army in
view on a phone.

- **Set aside: the catalogue as a grid of cards beside the army.** Closer to the game's screens, but it needs a
  wide screen; on a phone the army ends up below the cards, out of sight.

## D-16 · The battle model (2026-10-22)

The engine plays the rules the game publishes (`combat-rules.json`): 3 turns, the attacker strikes first,
damage hits the lowest tier first and, within a tier, defences, then melee, then ranged, then broken troops;
a ranged group with no melee troops or defences at its tier fights in melee; a troop type that loses more than
25 % in a turn takes a morale test; the winner inflicted the bigger power loss. What the game does not publish
is a parameter in `combat-rules.json` (`model`), to fit with the calibration (SIM-04):

- **Damage per troop = attack × damage / 200; health per troop = armour × health / 40**, as in the control
  calculation (D-10). A strike's damage kills troops of the target in proportion to their health; what is left
  goes to the next target.
- **Tier modifier: +x % per tier below the striker, −x % per tier above**, with x = 0 until measured.
- **Morale: (100 − morale) % of the survivors break**, tested at the end of each turn; they sit out the next
  turn, are hit last in their tier and rally after it. Broken troops' extra damage from ranged attacks: 0 %
  until measured.
- **Expected outcome, fractional troops:** the engine computes the average battle, without chance; rounding
  is for display. A random version (chance of failing a morale test) can come later.
- **Not modelled yet:** warlord and champion, fortress defences and Hellcannon emplacements (ARMY-04).

- **Set aside: a total-against-total model alone** (total damage against total health): quick, and kept as two
  measures (`armyDamage`, `armyHealth`), but blind to tiers, the damage order and morale.

**Update 2026-10-22: the community wiki.** The game's fan wiki documents its combat
([Combat Mechanics](https://warhammer-cnc.fandom.com/wiki/Combat_Mechanics), CC-BY-SA). It confirms the two
formulas above, word for word with the control calculation, and corrects three points, now in the engine:

- **A troop strikes with the attack that deals more damage, bonuses included**, not with its sheet's label;
  it also takes damage in that category (melee before ranged).
- **Within a tier and a category, the higher morale is hit first.**
- **Broken troops can only be hit by ranged attacks**, and take extra damage from them (rituals change it).

It also says: a morale test is per squad, when a squad loses more than 25 % of its squad size, with morale %
as the chance to pass (100 or more: unbreakable); fortress battles have a fourth, first round where only the
defences strike; victory goes to the side that kills more power, or wipes the other out. It says nothing of a
tier bonus: that one stays 0 until measured. See [open-questions.md](open-questions.md).

## D-17 · The Altaïra look, light and dark (2026-10-22)

Frantz's call: the page takes the Altaïra charter (dark by default: near-black background, cream headings,
amber accent and buttons with navy text; light derived from the light logo, not a mechanical inverse), its
language flags and its light / dark button, as on altaira.eu. The theme follows the system until the player
picks one; the choice is remembered in the browser. System fonts, light weights: no font is downloaded, so the
page stays one file that works offline. Every colour is a token, and every text colour is checked on every
surface in both themes.

## D-18 · Icons drawn for the page; saves in the browser and in files (2026-10-22)

- **Icons:** one pictogram per troop type, in the god's colour, drawn as small SVGs for the page: no game art
  (D-06). The god's name is always written next to it.
- **Saves:** a setup (bonuses, capacity, both compositions) is saved by name in the browser, or exported to a
  JSON file in the configuration format of docs/data-model.md, and imported back. A file is checked in full
  before anything changes on the page: wrong version, unknown game or troop, a bonus the game refuses — it is
  refused with its reasons. A bonus row shows one target: a file with a bonus on several targets is refused
  for now.
- **Comparison:** the two compositions share the bonuses and the capacity; each figure side by side with the
  difference and the better one (arrow and words), then each attacking the other. With an empty side, no
  verdict.

## D-19 · As many compositions as wanted, any two compared (2026-10-22)

Frantz's call, replacing "two on screen" (D-05): the player adds compositions (new, or a duplicate of the
one being edited), renames and deletes them; two lists choose which two the comparison shows. Each figure:
the better value in green with ▲, the weaker in red with ▼, equal values in orange with = — the symbol and,
for screen readers, a word always go with the colour; the orange is a token, checked for contrast in both
themes. Names: the first free letter (A, B … Z), then numbers. A saved file keeps every composition.

## D-20 · Five dashboards in tabs; key figures highlighted (2026-10-22)

Frantz's call: the five dashboards proposed (efficiency, battle by round, balance, damage vs tanking, pros and
cons) on one card with five tabs (the ARIA tabs pattern: arrows, Home, End). Only the tab shown is drawn. They
read the same state as the rest of the page: the player's bonuses, the composition being edited (balance,
map), the two compositions compared (rounds, pros and cons).

- **Thresholds, in `src/engine/insights.js`:** a front line is thin under 10 % of the effective health; one
  god dominates from 60 % of the power; morale is low under 50; a pro or con is a gap of 10 % or more.
- **Key figures:** power, damage per strike and effective health are tinted orange (a token, contrast-checked
  in both themes) in the profile table, the comparison and the efficiency ranking. In the profile table, each
  key column has its own details button in its header: power per troop; attack and damage; armour and health.
- **The map is drawn by hand in SVG** (no chart library): a dozen dots, one file, themed by the tokens.

## D-21 · Troops compared per march slot, not per power or food (2026-10-22)

Frantz's call. The march capacity counts troops whatever their tier: one Marauder takes the room of one Dragon.
So what a troop is worth is what one troop gives, per slot of the army — damage and effective health per troop
(the efficiency chart), speed and load per troop (the raiding chart). Ratios per power ranked Marauders among
the best troops, which says nothing about an army limited by its number of troops; ratios per food meant
nothing to a player. Both charts show every troop of the game with the player's bonuses, as dots (no list):
filters by building, tier and god; the troops of the composition being edited are ringed; names are written for
those, for the three best of each axis, and for a selection of 15 or fewer, moved down when they would overlap.

## D-22 · Version 1.0 (2026-10-22)

The version is written once, in `package.json` (1.0.0); the page shows major.minor next to its title (v1.0),
filled in at build time like the English texts. A new feature raises the minor number, a fix the patch.

## D-23 · Filters of several values; charts that zoom (2026-10-22)

Frantz's calls, after trying the charts:

- **Filters take several values** (tiers IV and V, Khorne and Nurgle…), in the picker and on the charts: a
  drop-down of tick boxes (`<details>` with a fieldset), which stays open while it is used; nothing ticked
  means all. Set aside: `<select multiple>`, awkward with a mouse and unknown to most players.
- **Zoom:** drag a box on a chart to zoom into it; "+" and "−" zoom in towards the bottom-left corner (where the
  low tiers crowd) and out, for the keyboard; "Show the whole chart" resets. Each dashboard keeps its own zoom.
  Set aside: a chart library, for one chart drawn in a few dozen lines.
- **Names on the charts** appear only while the pointer is on a dot (or a finger taps it), over every other
  dot, flipped to the left near the right edge; each dot keeps a title for screen readers. Frantz's call, after
  permanent names cluttered the crowded corner.
- **"Highlight composition"**, on the efficiency and raiding charts, darkens every troop outside the
  composition being edited (its troops are also ringed).

## D-24 · Every chart also as a table (2026-10-24)

Each scatter chart (efficiency, raiding, damage vs tanking) has a "Show as a table" disclosure under it: the
same troops as the chart, with its filters and zoom, one row per troop with the chart's two figures (and the
troop count on the damage-vs-tanking map), highest first. Keyboard and screen-reader users so reach every
figure the pointer shows (WCAG 1.1.1, 2.1.1), which the chart alone did not (DEF-023). The table stays open
across redraws. Approved by Frantz as part of ACC-01. Set aside: focusable dots with arrow-key navigation
(82 tab stops, and harder to read out than a table); per-dot titles exposed inside the image (the image's own
name hides them from screen readers, and they cannot be reached by keyboard anyway).

## D-25 · cctools.cc as the reference for the game's data (2026-10-24)

[cctools.cc](https://cctools.cc), a community toolkit, publishes the game's data with its internal codes
(troops, warlords, rituals, champion, gear, structures). Compared on 2026-10-24 with our 82 troops and 15
defences, transcribed from the screenshots: every combat stat, god, troop type and attack type matched, all 97.
Only the food upkeep differs, by a constant factor of 6 (open question 13), and 34 English names.

- **English names:** the game's own, from cctools.cc, replace the names of the local reference and our
  translations (D-08's star stays only where no source gives the name: "Food Upkeep*").
- **A cross-check, not a copy:** the troop table is saved locally (`captures/`, ignored by git) and a test
  compares it with `data/` wherever it is present; screenshots still win for a stat (D-09).
- **The warlords, rituals, champion and gear** (the backlog's next items) will come from cctools.cc, credited
  in the README and the data. It publishes no licence: its author is told and asked, as a matter of principle,
  without waiting for the answer (Frantz's call): the data are the game's, public in the game.
- **Set aside: scraping the page markup.** Each page carries its data as JSON (Inertia), read as such.
