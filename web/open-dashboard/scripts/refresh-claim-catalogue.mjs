/** Read-only public metadata refresh. All four complete acquired source populations are retained. */
import { readFile, writeFile } from "node:fs/promises";
import { collectClaimSource } from "../claim-data.js";

const output = new URL("../claim-catalogue.json", import.meta.url);
const previous = await readFile(output, "utf8")
  .then(JSON.parse)
  .catch(() => null);
const ids = ["openrouter", "crazyrouter", "kie", "fal"];
const results = await Promise.all(
  ids.map(async (id) => {
    try {
      return await collectClaimSource(id);
    } catch (error) {
      const provider = previous?.providers?.find((p) => p.provider === id);
      const models = previous?.models?.filter((m) => m.provider === id);
      if (!provider || !models?.length)
        throw new Error(
          `${id}: no valid source or earlier snapshot (${error.message})`,
        );
      console.warn(
        `${id}: retaining original source date ${provider.observedAt}; refresh failed.`,
      );
      return {
        providers: [provider],
        models,
        notes: [`${id} kept from the previous dated snapshot.`],
      };
    }
  }),
);
const snapshot = {
  schemaVersion: 2,
  collector:
    "openDashboard public source observations; no credentials or inference",
  fetchedAt: new Date().toISOString(),
  // Once persisted, these observations are dated snapshots even if acquired now.
  providers: results.flatMap((r) =>
    r.providers.map((provider) => ({ ...provider, freshness: "snapshot" })),
  ),
  models: results.flatMap((r) => r.models),
  notes: results.flatMap((r) => r.notes ?? []),
};
// Compact JSON reduces transfer bytes without removing identities or source dates.
await writeFile(output, JSON.stringify(snapshot) + "\n");
console.log(
  JSON.stringify({
    providers: snapshot.providers.map((p) => ({
      id: p.provider,
      rows: p.catalogueModels,
      observedAt: p.observedAt,
    })),
  }),
);
