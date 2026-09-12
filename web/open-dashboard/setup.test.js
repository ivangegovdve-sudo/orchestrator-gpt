import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CLIENTS,
  CLIENT_VERIFICATION_FACTS,
  MCP_EXCHANGE_FACTS,
  OPENCLAW_CONFIG_FACTS,
  PRESETS,
  TOOLS,
  PACKAGE_SPEC,
  PACKAGE_VERSION,
  createSetup,
  firstPrompt,
  matchingPreset,
  toolsFromQuery,
} from "./setup-data.js";
import {
  GROQ_FREE_LIMITS,
  OPENROUTER_FREE_LIMITS,
  getFreeTierOffer,
} from "./provider-limits.js";
import shipped from "open-dashboard-mcp/contract-vocabulary.json" with { type: "json" };
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { restoreSetupPreferences } from "./setup.js";

test("partial saved preferences cannot replace missing fields with undefined", () => {
  const empty = restoreSetupPreferences({});
  assert.equal(empty.clientId, "hermes");
  assert.equal(empty.platform, "unix");
  assert.ok(empty.toolIds.length > 0);
  assert.doesNotThrow(() => createSetup(empty));

  const partial = restoreSetupPreferences({ clientId: "codex" });
  assert.equal(partial.clientId, "codex");
  assert.equal(partial.platform, "unix");
  assert.deepEqual(partial.toolIds, empty.toolIds);
  assert.doesNotThrow(() => createSetup(partial));
});

test("saved preferences retain valid choices and discard only unsupported fields", () => {
  const tools = ["dashboard_github_trending", "dashboard_github_movers"];
  for (const client of CLIENTS) {
    const restored = restoreSetupPreferences({
      clientId: client.id,
      platform: "windows",
      toolIds: tools,
      step: 2,
    });
    assert.equal(restored.clientId, client.id);
    assert.equal(restored.platform, "windows");
    assert.deepEqual(new Set(restored.toolIds), new Set(tools));
    assert.equal(restored.step, 0);
    assert.notEqual(restored.toolIds, tools);
    assert.equal(createSetup(restored).server.command, "cmd");
  }
  assert.deepEqual(
    restoreSetupPreferences({ clientId: "codex", toolIds: [] }).toolIds,
    [],
  );
  const duplicate = restoreSetupPreferences({ toolIds: [tools[0], tools[0]] });
  assert.deepEqual(duplicate.toolIds, [tools[0]]);

  const unsupported = restoreSetupPreferences({
    clientId: "unknown",
    platform: "windows",
    toolIds: ["dashboard_benchmarks", "unknown_tool"],
  });
  assert.equal(unsupported.clientId, "hermes");
  assert.equal(unsupported.platform, "windows");
  assert.doesNotThrow(() => createSetup(unsupported));
  assert.equal(
    restoreSetupPreferences({ clientId: "codex", platform: null }).clientId,
    "codex",
  );
  for (const invalid of [null, undefined, [], "codex", 1, true]) {
    assert.doesNotThrow(() => createSetup(restoreSetupPreferences(invalid)));
  }
  for (const invalidTools of [null, {}, "dashboard_benchmarks", [1]]) {
    const restored = restoreSetupPreferences({
      clientId: "cursor",
      toolIds: invalidTools,
    });
    assert.equal(restored.clientId, "cursor");
    assert.doesNotThrow(() => createSetup(restored));
  }
});

test("the shipped server advertises exactly each generated preset without fetching data", async () => {
  const packageUrl = new URL(
    import.meta.resolve("open-dashboard-mcp/package.json"),
  );
  const { createServer } = await import(new URL("build/server.js", packageUrl));
  const { PROVIDER_IDS } = await import(
    new URL("build/providers/registry.js", packageUrl)
  );
  for (const preset of PRESETS) {
    const selectedTools = createSetup({
      toolIds: preset.tools,
    }).server.env.OPEN_DASHBOARD_TOOLS.split(",");
    const server = createServer({
      selectedTools,
      selectedProviders: PROVIDER_IDS,
      fetchImpl: async () => {
        throw Error("Tool discovery must not fetch provider data.");
      },
    });
    const client = new Client({
      name: "setup-contract-test",
      version: "1.0.0",
    });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      assert.deepEqual(
        (await client.listTools()).tools.map((tool) => tool.name).sort(),
        [...preset.tools].sort(),
      );
    } finally {
      await client.close();
      await server.close();
    }
  }
});

test("selectable tools and version match the actual published package vocabulary", () => {
  assert.equal(PACKAGE_VERSION, shipped.version);
  // Unpinned on purpose: npx must resolve the current release, matching the README.
  // A version here would reintroduce the staleness this package exists to detect.
  assert.equal(PACKAGE_SPEC, "open-dashboard-mcp");
  assert.doesNotMatch(PACKAGE_SPEC, /@/, "the install spec must never name a version");
  assert.deepEqual(
    TOOLS.map((tool) => tool.id).sort(),
    [...shipped.tools].sort(),
  );
  assert.equal(new Set(TOOLS.map((tool) => tool.id)).size, 17);
});

test("the MCP entry page exposes sourced proof and the direct install path", async () => {
  const page = await readFile(new URL("./mcp/index.html", import.meta.url), "utf8");
  assert.match(page, /Agents guess at model names and prices/);
  assert.match(page, /13\s+providers/);
  assert.match(page, /text, image, video and audio/);
  assert.match(page, /OpenClaw/);
  assert.match(page, /OpenClaw compatibility/);
  assert.match(page, /docs\.openclaw\.ai\/cli\/mcp/);
  assert.match(page, /docs\/help\/environment\.md/);
  assert.ok(page.includes("openclaw@2026.9.4"));
  assert.ok(page.includes("No live"));
  assert.ok(page.includes("%USERPROFILE%\\.openclaw\\openclaw.json"));
  assert.match(page, /Verdict: Crazyrouter is cheaper on both token legs/);
  assert.match(page, /data-npm-downloads-value>Checking npm downloads/);
  assert.match(page, new RegExp(`npx -y ${PACKAGE_SPEC.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}`));
  assert.match(page, /data-npm-downloads-note>Reading the latest complete weekly window from npm/);
  assert.match(page, new RegExp(MCP_EXCHANGE_FACTS.tool));
  assert.match(page, new RegExp(MCP_EXCHANGE_FACTS.crazyrouterModelId));
  assert.match(page, new RegExp(MCP_EXCHANGE_FACTS.openrouterModelId.replace("/", "\\/")));
  assert.match(page, new RegExp(MCP_EXCHANGE_FACTS.crazyrouterInput));
  assert.match(page, new RegExp(MCP_EXCHANGE_FACTS.openrouterOutput));
  assert.doesNotMatch(page, /Public usage and project trends|app insights/);
});

test("OpenClaw uses its documented JSON5 mcp.servers shape and keeps the tool allowlist", () => {
  const selectedTools = ["dashboard_catalogue", "dashboard_matrix"];
  const unix = createSetup({ clientId: "openclaw", toolIds: selectedTools });
  const unixConfig = JSON.parse(unix.content);
  assert.equal(unix.format, "JSON5");
  assert.equal(unix.location, OPENCLAW_CONFIG_FACTS.configPath);
  assert.deepEqual(unixConfig.mcp.servers["open-dashboard"], {
    command: "npx",
    args: ["-y", PACKAGE_SPEC],
    env: { OPEN_DASHBOARD_TOOLS: selectedTools.join(",") },
  });
  assert.match(unix.instruction, /mcp\.servers/);
  assert.match(unix.verification, /openclaw@2026\.9\.4/);
  assert.match(unix.verification, /11 September 2026/);
  assert.match(unix.verification, /No live mcp probe has been run/);

  const windows = createSetup({
    clientId: "openclaw",
    platform: "windows",
    toolIds: selectedTools,
  });
  const windowsConfig = JSON.parse(windows.content);
  assert.equal(windows.location, OPENCLAW_CONFIG_FACTS.windowsConfigPath);
  assert.deepEqual(windowsConfig.mcp.servers["open-dashboard"], {
    command: "cmd",
    args: ["/c", "npx", "-y", PACKAGE_SPEC],
    env: { OPEN_DASHBOARD_TOOLS: selectedTools.join(",") },
  });
});

test("every agent entry states its verification scope and generated output repeats it", () => {
  assert.deepEqual(
    CLIENTS.map((client) => client.id).sort(),
    Object.keys(CLIENT_VERIFICATION_FACTS).sort(),
  );
  for (const client of CLIENTS) {
    assert.ok(client.verification.summary, `${client.id} needs a verification summary`);
    assert.ok(client.verification.detail, `${client.id} needs a verification detail`);
    const setup = createSetup({
      clientId: client.id,
      toolIds: ["dashboard_catalogue"],
    });
    assert.match(
      setup.verification,
      new RegExp(client.verification.detail.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")),
      `${client.id} output must carry its verification detail`,
    );
  }
  assert.match(CLIENT_VERIFICATION_FACTS.openclaw.detail, /No live mcp probe/);
  assert.match(CLIENT_VERIFICATION_FACTS.hermes.detail, /Live probe passed/);
  assert.match(CLIENT_VERIFICATION_FACTS.codex.detail, /codex-cli 0\.153\.4/);
});

test("each preset exposes only its selected tools, including a two-tool GitHub setup", () => {
  for (const preset of PRESETS) {
    const setup = createSetup({ clientId: "cursor", toolIds: preset.tools });
    const server = JSON.parse(setup.content).mcpServers["open-dashboard"];
    assert.deepEqual(
      server.env.OPEN_DASHBOARD_TOOLS.split(",").sort(),
      [...preset.tools].sort(),
    );
    assert.equal(server.type, "stdio");
    assert.equal(server.args.at(-1), PACKAGE_SPEC);
    assert.equal(matchingPreset(preset.tools), preset.id);
  }
  assert.deepEqual(PRESETS.find((preset) => preset.id === "projects").tools, [
    "dashboard_github_trending",
    "dashboard_github_movers",
  ]);
});

test("client-specific setup preserves transport shape and Windows npm wrapper", () => {
  for (const client of CLIENTS) {
    const setup = createSetup({
      clientId: client.id,
      platform: "windows",
      toolIds: ["dashboard_contract"],
    });
    assert.equal(setup.server.command, "cmd");
    assert.deepEqual(setup.server.args.slice(0, 2), ["/c", "npx"]);
    assert.match(setup.content, /OPEN_DASHBOARD_TOOLS/);
    assert.ok(setup.sourceUrl.startsWith("https://"));
  }
  assert.match(
    createSetup({ clientId: "hermes" }).content,
    /^mcp_servers:\n  open-dashboard:\n    command: "npx"/,
  );
  assert.match(
    createSetup({ clientId: "codex" }).content,
    /^\[mcp_servers.open-dashboard\]/,
  );
  assert.match(
    createSetup({ clientId: "codex" }).content,
    /\[mcp_servers.open-dashboard.env\]/,
  );
  assert.match(
    createSetup({ clientId: "claude-code" }).content,
    /^claude mcp add --transport stdio --scope user --env OPEN_DASHBOARD_TOOLS=[a-z_,]+ open-dashboard -- npx/,
  );
  assert.equal(
    JSON.parse(createSetup({ clientId: "claude-desktop" }).content).mcpServers[
      "open-dashboard"
    ].command,
    "npx",
  );
});

test("empty, unsupported or untrusted choices never become an install command", () => {
  assert.throws(() => createSetup({ toolIds: [] }), /at least one/);
  assert.throws(
    () => createSetup({ toolIds: ["dashboard_catalogue; whoami"] }),
    /Unknown tool/,
  );
  assert.throws(() => createSetup({ clientId: "cowork" }), /supported/);
  assert.throws(
    () => createSetup({ platform: "shell-injection" }),
    /where your agent runs/,
  );
  const deduplicated = createSetup({
    toolIds: ["dashboard_contract", "dashboard_contract"],
  });
  assert.equal(deduplicated.tools.length, 1);
});

test("explorer deep links enable their exact capability and reject an invalid selection as a whole", () => {
  const benchmarkTools = toolsFromQuery("dashboard_benchmarks");
  assert.deepEqual(benchmarkTools, ["dashboard_benchmarks"]);
  assert.equal(
    createSetup({ toolIds: benchmarkTools }).server.env.OPEN_DASHBOARD_TOOLS,
    "dashboard_benchmarks",
  );
  const changeTools = toolsFromQuery(
    "dashboard_whats_changed,dashboard_model_status",
  );
  assert.deepEqual(
    new Set(changeTools),
    new Set(["dashboard_whats_changed", "dashboard_model_status"]),
  );
  assert.deepEqual(
    new Set(
      createSetup({
        toolIds: changeTools,
      }).server.env.OPEN_DASHBOARD_TOOLS.split(","),
    ),
    new Set(changeTools),
  );
  assert.deepEqual(
    toolsFromQuery(" dashboard_benchmarks ,dashboard_benchmarks"),
    ["dashboard_benchmarks"],
  );
  for (const invalid of [
    null,
    "",
    " ",
    "dashboard_benchmarks,",
    ",dashboard_benchmarks",
    "dashboard_benchmarks,,dashboard_contract",
    "dashboard_benchmarks,unknown_tool",
    "dashboard_benchmarks;echo injected",
    Array(18).fill("dashboard_benchmarks").join(","),
    "x".repeat(1025),
  ]) {
    assert.equal(
      toolsFromQuery(invalid),
      null,
      `Invalid deep link must keep the existing preset or saved selection: ${invalid}`,
    );
  }
  assert.equal(
    toolsFromQuery(TOOLS.map((tool) => tool.id).join(",")).length,
    17,
  );
});

test("first question always belongs to a selected capability", () => {
  for (const tool of TOOLS) assert.equal(firstPrompt([tool.id]), tool.prompt);
  assert.equal(
    firstPrompt(PRESETS.find((preset) => preset.id === "projects").tools),
    TOOLS.find((tool) => tool.id === "dashboard_github_trending").prompt,
  );
});

test("quota offers do not turn paid or unknown catalogue prices into free variants", () => {
  assert.equal(getFreeTierOffer("openrouter", "openai/gpt-oss-120b"), null);
  assert.equal(getFreeTierOffer("groq", "unknown-model"), null);
  assert.equal(getFreeTierOffer("unknown-provider", "model:free"), null);
  assert.equal(
    getFreeTierOffer("openrouter", "vendor/model:free").kind,
    "free_variant_quota",
  );
  assert.equal(
    getFreeTierOffer("groq", "openai/gpt-oss-120b").kind,
    "free_plan_quota",
  );
  assert.equal(GROQ_FREE_LIMITS.models["groq/compound"].requestsPerDay, 250);
  assert.equal(
    GROQ_FREE_LIMITS.models["openai/gpt-oss-120b"].tokensPerMinute,
    8000,
  );
  assert.equal(
    GROQ_FREE_LIMITS.models["whisper-large-v3"].audioSecondsPerDay,
    28800,
  );
  assert.equal(OPENROUTER_FREE_LIMITS.requestsPerMinute, 20);
  assert.deepEqual(
    OPENROUTER_FREE_LIMITS.tiers.map((tier) => tier.requestsPerDay),
    [50, 1000],
  );
  assert.match(
    OPENROUTER_FREE_LIMITS.qualification,
    /purchased.*lifetime.*not its current balance/,
  );
});
