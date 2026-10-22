# Roadmap

[← Overview](../ARCHITECTURE.md) · Features: [features.md](features.md)

## Now: troops only (roadmap as of 22 October 2026)

- [x] **Catalogue of troops** (DATA-03) and of defences (DATA-04).
- [x] **Effective stats** (BONUS-01, BONUS-02): engine done; the entry form comes with the page.
- [x] **Armies and caps** (ARMY-01, ARMY-02), **power** (SIM-01): engine done.
- [x] **Battle** (SIM-02, D-16) and the control of the formulas (SIM-07).
- [x] **Comparison of two compositions** (ARMY-03, SIM-03).
- [x] **Saving**, export and import (CFG-01, CFG-02, REL-01); glossary, icons, Altaïra look (GLOSS-01, ICON-01, THEME-01).
- [x] **Dashboards** (DASH-01 to DASH-06, SIM-06): six tabs. **Version 1.0** (D-22).
- [ ] **Open questions**: see [open-questions.md](open-questions.md).
- [x] **The first page** (GAME-01, BONUS-01/02, ARMY-01/02, SIM-01, SIM-08, LANG-02, COMP-01, ACC-01): game,
      bonuses, army with the picker, capacity, profile; tested in jsdom, axe and contrast checks.

- [ ] **Confirm the English names** (LANG-01): they come from a local reference (D-08), except the Heralds of
      Slaanesh and the food upkeep stat, translated by us and marked *. To check in the English game: the
      stats table, the "Foresaken" spelling, the Heralds (absent from the reference).

- [ ] **The fortress** (ARMY-04): defences within the walls' capacity, plus garrison troops, with the battle.

## Next: the evolutions asked on 22 October 2026

- [ ] **Heroes' stats** (BONUS-03): each hero's bonuses by level, chosen on the page instead of typed.
- [ ] **Skill tree** (BONUS-04): the citadel's rituals, their talent classes and linked skills, by level.
- [ ] **Champion: stats and sets** (BONUS-05, BONUS-06): the champion's own stats and buffs by level, its armour
      pieces by level and the set bonuses by number of pieces worn.

## Later

- [ ] Calibration on battle reports (SIM-04): the tier modifier, how percentages combine. The damage and
      health formulas are settled (community wiki, D-16).
- [ ] Heroes, rituals, champion, armour, buildings (BONUS-03 to BONUS-07). Warlords' bonuses to read
      on their sheets in game.
- [ ] Optimiser (SIM-05), share link (CFG-03).

## Tooling to add

- [ ] Generate `docs/defects.md` from `docs/defects.toml` and check each entry, as in the other repos (with
      the first defect).
- [ ] Generate the proof column of `features.md` from the test names.
- [ ] Publish the repo on GitHub (MIT): the workflow deploys `dist/` to GitHub Pages from `main`.
