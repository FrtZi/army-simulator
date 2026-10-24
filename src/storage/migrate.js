// Brings a saved file up to the current format, so a setup saved or exported before a change still loads.
// Version 1 had no heroes: its compositions get none (version 2, D-26). A file of another version comes back as
// it is, and the reader refuses it with its reason.

const ADDED_IN_2 = { heroes: [], talents: [] };

/** The configuration in the current format, or the same object when there is nothing to upgrade. */
export function migrate(configuration) {
  if (configuration?.schemaVersion !== 1) return configuration;
  const { scenarios } = configuration;
  const upgraded = Array.isArray(scenarios)
    ? scenarios.map((scenario) =>
        scenario && typeof scenario === "object" ? { ...ADDED_IN_2, ...scenario } : scenario,
      )
    : scenarios; // a wrong shape stays wrong: the reader refuses it (DEF-014)
  return { ...configuration, schemaVersion: 2, scenarios: upgraded };
}
