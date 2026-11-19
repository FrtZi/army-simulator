# Calibration on battle reports (SIM-04, BL-15, BL-21) — spec

[← Overview](../../ARCHITECTURE.md) · Catalogue: SIM-04 · Rules: `data/<game>/combat-rules.json` · Status: proposed on
2026-11-19, after the audit of the same day; agreed by Frantz on 2026-11-19; the table, the backtest and the fit built on 2026-11-19 (D-55), the reports to come

## The need

The game does not publish its combat formula. The engine follows the official tips and the community wiki, but
several of its parameters are estimates (open questions 1 to 4, 7), and the tier modifier among them weighs the
most: from ×0.7 to ×3.25 for a tier difference of −3 to +3 (cctools.cc's table). Until they are fitted on real
battles, a simulated battle is an order of magnitude, not a prediction. Version 1.2 waits on exactly this (BL-21,
the tier modifier confirmed on a battle report).

The first real report (rank 15 Greenskin Army, 2026-11-17) already found a defect (DEF-062: the PvE armies' power
×10), then a gap: the engine killed 18 % fewer enemies and lost 17 % more troops than the game.

## The parameters to fit

| #   | Parameter                                  | Now                                 | What a report tells                  |
| --- | ------------------------------------------ | ----------------------------------- | ------------------------------------ |
| 1   | Tier modifier (`tierFactors`)              | cctools.cc's ×0.7 to ×3.25          | the dead on both sides, tier by tier |
| 2   | Morale: losses counted per squad or type   | per troop type                      | which of your troops lose, how many  |
| 3   | Extra ranged damage on broken troops       | none                                | the dead when one side breaks        |
| 4   | Two bonuses on a stat: added or multiplied | added (D-12)                        | the dead, with known bonuses         |
| 7   | The champion in battle                     | his bonuses only, he does not fight | your losses with and without him     |

## What a report needs

1. **The report itself**, as the game shows it: both sides' troops, survivors, dead and power lost; your troops one
   by one (lost / sent); the enemy's troops one by one; the heroes and the champion. Screenshots are enough.
2. **The army sent, exactly**: each troop and its count, the heroes, the talents, the champion's gear; the setup as
   it was that day (rituals, buildings). The simplest: run the optimiser, apply its army, send that one, and save
   the composition (or the setup file) before attacking.
3. **The target**: its kind, name and level; and if it was already hit, the troops it had left (its bar).

## How it works

1. **Each report kept on Frantz's computer only**, in `captures/<game>/battle-reports/` (git-ignored: his army and
   his levels are personal), one file per battle in a documented format: the date, the target, the army sent, and
   the report's figures.
2. **The backtest**: every report replayed by the engine; for each, the gap on the enemy dead, your dead, your power
   lost and your dead troop by troop, shown as a table (locally, and summed in a test skipped where the reports are
   absent, as the cross-checks).
3. **The fit**, one parameter at a time, the tier modifier first: the value that brings the replays closest to the
   reports (the sum of squared log ratios of predicted to actual dead), kept only if it also improves the reports
   it was not fitted on (each report left out in turn), so that a value never fits noise.
4. **What changes**: data, never code. The fitted values replace the estimates in `combat-rules.json`, with a
   decision giving the reports' count, the gaps before and after, and the values set aside. The tests that pin
   today's values move with them.
5. **The page says how sure it is**: once fitted, the battle simulation names the number of reports behind it; a
   parameter not yet fitted stays marked as an estimate.

## The parameter table (Frantz, 2026-11-19: nothing written in the code)

Every value the calibration uses or produces is a parameter in a data file, read by the code; no number, threshold
or list is written in the code (the golden rule: a parameter in `data/`, never in the code).

- **The model's values** stay where they are, once: `data/<game>/combat-rules.json` (`tierFactors`,
  `brokenRangedBonusPercent`, the morale rule…). The calibration writes there, nowhere else.
- **The calibration's own table**: `data/<game>/calibration.json`, one entry per parameter to fit: its key in
  `combat-rules.json`, the open question it answers, its status (`estimate` or `fitted`), the reports behind it,
  the candidate values the fit tries (a grid, or a range and a step), and its order in the fit; then the settings of
  the whole: the reports needed to call a parameter fitted (six), the gap that counts as noise, the measures
  compared and their weights, and the targets suggested first (by their place ids in `pve.json`).
- **The reports' format** is described in `docs/data-model.md`, as every data file; the reports themselves stay in
  `captures/` (personal).

## Which battles to fight first

The ones that separate the parameters: a target whose troops are all of one tier, so the tier modifier shows
alone (Skeleton Warrior, Frostheart Phoenix); then a close one (Dwarf Army 15) for morale and broken troops; the
same target twice to measure the noise. The predictions sheet of 2026-11-17 lists nine with the engine's figures;
the suggested targets are a list in `calibration.json`.

## Done when

- The reports `calibration.json` asks for (six) with their armies known exactly, the tier modifier confirmed or
  corrected (BL-21 closed, version 1.2 reached), questions 1 to 4 settled or stated as still open, with the gaps
  before and after.

## Set aside

- Battles against players (their setup is unknown); keep attacks (BL-11 first).
- Reading the reports from screenshots by a program: typed in by hand from the screenshots until the count of
  reports makes it worth it.
