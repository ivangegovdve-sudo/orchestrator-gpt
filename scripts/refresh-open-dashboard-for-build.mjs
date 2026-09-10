/** Refresh public catalogue metadata for a deployment; retain the dated snapshot on failure. */
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const snapshotUrl = new URL(
  "../web/open-dashboard/media-catalogue.json",
  import.meta.url,
);
const previousBytes = await readFile(snapshotUrl);
const previous = JSON.parse(previousBytes);

try {
  const result = spawnSync(
    process.execPath,
    ["web/open-dashboard/scripts/refresh-media.mjs"],
    {
      cwd: root,
      timeout: 90000,
      maxBuffer: 1024 * 1024,
      encoding: "utf8",
      windowsHide: true,
    },
  );
  if (result.error || result.status !== 0)
    throw new Error("The public catalogue refresh did not complete.");
  const current = JSON.parse(await readFile(snapshotUrl, "utf8"));
  const previouslyAvailable = (previous.providers ?? []).filter(
    (provider) => provider.catalogueModels > 0,
  );
  for (const provider of previouslyAvailable) {
    const refreshed = current.providers?.find(
      (item) => item.provider === provider.provider,
    );
    if (
      !refreshed ||
      ["unavailable", "error", "failed"].includes(refreshed.status) ||
      !(refreshed.catalogueModels > 0)
    ) {
      throw new Error(
        `The ${provider.provider} public catalogue was unavailable.`,
      );
    }
  }
  console.log(
    `Open Dashboard: refreshed ${current.models.length} native catalogue entries at ${current.fetchedAt}.`,
  );
} catch (error) {
  // A provider outage must not remove a working, explicitly dated public catalogue.
  await writeFile(snapshotUrl, previousBytes);
  console.warn(
    `Open Dashboard: ${error.message} Using the checked-in snapshot from ${previous.fetchedAt}; its original source dates remain visible.`,
  );
}
