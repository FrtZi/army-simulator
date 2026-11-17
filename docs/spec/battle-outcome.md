# A battle's outcome in full (BL-39) — spec

[← Overview](../../ARCHITECTURE.md) · Catalogue: SIM-25 · Engine: `src/engine/battle.js` · Status: asked by Frantz on
2026-11-17, on a real battle report

## The need

A battle is won by the side that inflicts the bigger loss of power, not by the side that kills every troop: on a real
report against a PvE army, the march won and killed 805,919 of 4,500,000 troops. To know whether one march is enough,
the player needs to see whether the enemy falls entirely in one fight ("total annihilation"), or how many survive;
and what each of his own troops loses, as the game's report shows it (lost / sent, troop by troop).

## How it behaves

1. **The verdict**, for each battle the Battle lab simulates:
   - _Total annihilation_: the side that wins leaves no troop of the other alive (every troop line rounds to 0);
   - _Victory_: the side that wins, and how many troops of the other survive, of how many, with their share;
   - _Draw_, as today. The power each side lost stays under the verdict.
2. **The losses per troop**, in a block that folds, its line the two sides' troops lost of troops sent: for each
   side, each troop line with the troops sent, lost and left, the largest loss first; the totals as the report gives
   them (troops, survivors, killed). Heroes are not troop lines: they stay out of the counts.
3. The figures are the engine's expected ones (fractional troops), rounded to whole troops for display.

## Set aside

- How many attacks it takes to finish an army (each attack's losses change the next; a later step if asked).
- The wounded the Sawbones takes in (the report's "Carabin"): the engine counts troops lost, not where they go.
