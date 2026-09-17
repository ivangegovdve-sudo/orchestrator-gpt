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
const publicSnapshotUrl = new URL(
  "../web/open-dashboard/public-catalogue.json",
  import.meta.url,
);
const previousPublicBytes = await readFile(publicSnapshotUrl).catch(() => null);
const nousSnapshotUrl = new URL(
  "../web/open-dashboard/nous-catalogue.json",
  import.meta.url,
);
const previousNousBytes = await readFile(nousSnapshotUrl).catch(() => null);

function runScript(script, timeout = 90000, env = process.env) {
  return spawnSync(process.execPath, [script], {
    cwd: root,
    timeout,
    maxBuffer: 1024 * 1024,
    encoding: "utf8",
    windowsHide: true,
    env,
  });
}

// Package facts come from a real in-memory MCP handshake (tools/list), so a
// deployment cannot silently describe a different installed contract.
const factsResult = runScript("scripts/refresh-open-dashboard-package-facts.mjs");
if (factsResult.error || factsResult.status !== 0)
  throw new Error("The installed open-dashboard-mcp contract could not be verified.");
console.log(factsResult.stdout.trim());

try {
  const result = runScript("web/open-dashboard/scripts/refresh-public-catalogue.mjs");
  if (result.error || result.status !== 0)
    throw new Error("The public catalogue snapshot did not complete.");
  console.log(result.stdout.trim());
} catch (error) {
  if (previousPublicBytes)
    await writeFile(publicSnapshotUrl, previousPublicBytes);
  console.warn(
    `Open Dashboard: ${error.message} Using the checked-in public catalogue snapshot.`,
  );
}

try {
  const result = runScript("web/open-dashboard/scripts/refresh-media.mjs");
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

// Nous is an authenticated, read-only supplement. Keep the dated checked-in
// snapshot for builds that do not have a key; never make a deployment depend on
// a secret being present and never print a failed response body.
if (process.env.NOUS_API_KEY?.trim()) {
  const result = runScript("web/open-dashboard/scripts/refresh-nous-catalogue.mjs");
  if (result.error || result.status !== 0) {
    if (previousNousBytes)
      await writeFile(nousSnapshotUrl, previousNousBytes);
    console.warn(
      "Open Dashboard: Nous catalogue refresh unavailable; retaining the checked-in authenticated snapshot.",
    );
  } else {
    console.log(result.stdout.trim());
  }
}
