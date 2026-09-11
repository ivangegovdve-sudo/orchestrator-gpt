export const PACKAGE_VERSION = "1.0.2";
export const PACKAGE_SPEC = `open-dashboard-mcp@${PACKAGE_VERSION}`;
export const SETUP_CHECKED_AT = "2026-09-10";
export const NPM_URL = "https://www.npmjs.com/package/open-dashboard-mcp";
export const OPENCLAW_CONFIG_FACTS = Object.freeze({
  version: "2026.9.4",
  packageSpec: "openclaw@2026.9.4",
  checkedAt: "2026-09-11",
  checkedLabel: "11 September 2026",
  docsUrl: "https://docs.openclaw.ai/cli/mcp",
  configDocsUrl:
    "https://github.com/openclaw/openclaw/blob/main/docs/gateway/configuration.md",
  configPath: "~/.openclaw/openclaw.json",
  windowsConfigPath: "%USERPROFILE%\\.openclaw\\openclaw.json",
});
export const CLIENT_VERIFICATION_FACTS = Object.freeze({
  hermes: Object.freeze({
    level: "live",
    summary: "live probe passed · hermes-agent 0.16.0 · 11 Sep 2026",
    detail:
      "Live probe passed against hermes-agent 0.16.0 on 11 September 2026 with a generated two-tool stdio entry; Hermes connected and discovered the selected Open Dashboard tools.",
  }),
  openclaw: Object.freeze({
    level: "config",
    summary: "config verified · openclaw@2026.9.4 · 11 Sep 2026",
    detail:
      "Config shape verified against openclaw@2026.9.4 on 11 September 2026 with mcp set and mcp status --json. No live mcp probe has been run here.",
  }),
  codex: Object.freeze({
    level: "config",
    summary: "config verified · codex-cli 0.153.4 · 11 Sep 2026",
    detail:
      "Config verified against codex-cli 0.153.4 on 11 September 2026 with codex mcp add and codex mcp list --json. No Codex chat session was run here.",
  }),
  "claude-code": Object.freeze({
    level: "unverified",
    summary: "not exercised · version not recorded",
    detail:
      "Not exercised against a real Claude Code install here; no version was recorded.",
  }),
  "claude-desktop": Object.freeze({
    level: "unverified",
    summary: "not exercised · version not recorded",
    detail:
      "Not exercised against a real Claude Desktop install here; no version was recorded.",
  }),
  cursor: Object.freeze({
    level: "unverified",
    summary: "not exercised · version not recorded",
    detail:
      "Not exercised against a real Cursor install here; no version was recorded.",
  }),
  generic: Object.freeze({
    level: "unverified",
    summary: "not exercised · version not recorded",
    detail:
      "No named client install was available to exercise this generic shape; no version was recorded.",
  }),
});
export const NPM_DOWNLOAD_FACTS = Object.freeze({
  downloads: 807,
  start: "2026-09-03",
  end: "2026-09-09",
  checkedAt: "2026-09-11",
  sourceUrl:
    "https://api.npmjs.org/downloads/point/last-week/open-dashboard-mcp",
});
export const MCP_EXCHANGE_FACTS = Object.freeze({
  checkedOn: "2026-09-11",
  observedAt: "2026-09-11T06:46:37.750Z",
  tool: "dashboard_price_comparison",
  providers: ["Crazyrouter", "OpenRouter"],
  crazyrouterModelId: "gpt-5-nano",
  openrouterModelId: "openai/gpt-5-nano",
  crazyrouterInput: "0.0000000325",
  openrouterInput: "0.00000005",
  crazyrouterOutput: "0.00000026",
  openrouterOutput: "0.0000004",
  savingsPercent: "35",
});

export const TOOLS = [
  {
    id: "dashboard_catalogue",
    name: "Model catalogue",
    group: "Models and prices",
    description: "Browse model IDs, capabilities, token and media prices.",
    prompt:
      "Use Open Dashboard to find video models with comparable published prices. Include the price unit, conditions, and source date.",
  },
  {
    id: "dashboard_model_economics",
    name: "Model economics",
    group: "Models and prices",
    description: "Compare cost, context, discounts and retirement evidence.",
    prompt:
      "Use Open Dashboard to compare low-cost text models that support tools. Show the exact model IDs, provider, prices, and when the evidence was collected.",
  },
  {
    id: "dashboard_resolve_model",
    name: "Find a model for a job",
    group: "Models and prices",
    description: "Turn capability requirements into model IDs and fallbacks.",
    prompt:
      "Use Open Dashboard to find an available text model with at least 128,000 tokens of context. Return the exact provider and model ID, a fallback, and the evidence date.",
  },
  {
    id: "dashboard_free_models",
    name: "Free models",
    group: "Models and prices",
    description:
      "Find models with confirmed zero prices and usable capabilities.",
    prompt:
      "Use Open Dashboard to find available free text models. Distinguish a free model from a free router and show when their prices were checked.",
  },
  {
    id: "dashboard_price_comparison",
    name: "Shared-model price comparison",
    group: "Models and prices",
    description:
      "Compare Crazyrouter aliases with OpenRouter and sourced reference prices.",
    prompt:
      "Use Open Dashboard to compare shared-model prices on Crazyrouter and OpenRouter. Compare only matching units and conditions, and explain any missing prices.",
  },
  {
    id: "dashboard_model_status",
    name: "Model availability",
    group: "Models and prices",
    description: "Check an exact model ID and its last confirmed availability.",
    prompt:
      "Use Open Dashboard to check the exact model ID openai/gpt-oss-120b across providers. Show availability and the last confirmed catalogue date.",
  },
  {
    id: "dashboard_whats_changed",
    name: "Model and price changes",
    group: "Usage and projects",
    description:
      "Review observed changes, including models that left free pricing.",
    prompt:
      "Use Open Dashboard to review recent model and price changes. Highlight observed free-to-paid changes and state the comparison’s coverage limits.",
  },
  {
    id: "dashboard_usage_leaders",
    name: "Model and app usage",
    group: "Usage and projects",
    description:
      "Explore public OpenRouter usage, with each time window labeled.",
    prompt:
      "Use Open Dashboard to show public model and app usage leaders. Keep daily model history and rolling app totals in their own time windows.",
  },
  {
    id: "dashboard_matrix",
    name: "App × model matrix",
    group: "Usage and projects",
    description: "Read the published matrix of apps and the models they use.",
    prompt:
      "Use Open Dashboard to show which models popular apps use. If the matrix is unavailable or periods differ, explain the missing evidence.",
  },
  {
    id: "dashboard_github_trending",
    name: "Trending projects",
    group: "Usage and projects",
    description: "Discover GitHub projects from the public trending board.",
    prompt:
      "Use Open Dashboard to find today’s trending AI projects on GitHub. Include repository links and the collection date.",
  },
  {
    id: "dashboard_github_movers",
    name: "Project momentum",
    group: "Usage and projects",
    description: "Compare observed project momentum in reviewed AI categories.",
    prompt:
      "Use Open Dashboard to find AI projects gaining momentum on GitHub. Include source links, category, time window and any gaps in the evidence.",
  },
  {
    id: "dashboard_benchmarks",
    name: "Benchmark evidence",
    group: "Checks and diagnostics",
    description: "Read published benchmark observations and their sources.",
    prompt:
      "Use Open Dashboard to show available coding benchmark evidence. Name the benchmark, its source and collection date.",
  },
  {
    id: "dashboard_speed",
    name: "Speed evidence",
    group: "Checks and diagnostics",
    description: "Inspect published speed claims and the measurement protocol.",
    prompt:
      "Use Open Dashboard to explain the available provider speed evidence. Separate published claims, actual measurements and unknowns.",
  },
  {
    id: "dashboard_source_health",
    name: "Data freshness",
    group: "Checks and diagnostics",
    description: "Check which sources are fresh, delayed or unavailable.",
    prompt:
      "Use Open Dashboard to check source health. Tell me which catalogues are fresh and which need caution.",
  },
  {
    id: "dashboard_contract",
    name: "Package version and contract",
    group: "Checks and diagnostics",
    description:
      "Check the installed package version and announced tool changes.",
    prompt:
      "Use Open Dashboard to report the installed package version and any announced contract changes.",
  },
  {
    id: "dashboard_key_inventory",
    name: "Configured key inventory",
    group: "Checks and diagnostics",
    description:
      "Optional: inspect explicitly configured keys; requires extra local setup.",
    prompt:
      "Use Open Dashboard to report whether key inventory is configured. Do not reveal secret values or assume unconfigured keys have zero usage.",
  },
];

export const PRESETS = [
  {
    id: "models",
    name: "Find a model",
    description: "A focused starting point",
    tools: [
      "dashboard_catalogue",
      "dashboard_model_economics",
      "dashboard_resolve_model",
    ],
  },
  {
    id: "prices",
    name: "Compare prices",
    description: "Token and media prices",
    tools: [
      "dashboard_catalogue",
      "dashboard_model_economics",
      "dashboard_price_comparison",
    ],
  },
  {
    id: "usage",
    name: "Explore usage",
    description: "Apps and their models",
    tools: ["dashboard_usage_leaders", "dashboard_matrix"],
  },
  {
    id: "projects",
    name: "Discover projects",
    description: "GitHub trends and momentum",
    tools: ["dashboard_github_trending", "dashboard_github_movers"],
  },
  {
    id: "all",
    name: "All tools",
    description: "The complete set",
    tools: TOOLS.map((tool) => tool.id),
  },
];

export const CLIENTS = [
  {
    id: "hermes",
    name: "Hermes Agent",
    detail: "Local agent · YAML",
    verification: CLIENT_VERIFICATION_FACTS.hermes,
    docs: "https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp",
    location: "~/.hermes/config.yaml",
    format: "YAML",
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    detail: "Gateway · JSON5",
    verification: CLIENT_VERIFICATION_FACTS.openclaw,
    docs: OPENCLAW_CONFIG_FACTS.docsUrl,
    location: OPENCLAW_CONFIG_FACTS.configPath,
    format: "JSON5",
  },
  {
    id: "codex",
    name: "Codex",
    detail: "App, CLI or IDE · TOML",
    verification: CLIENT_VERIFICATION_FACTS.codex,
    docs: "https://learn.chatgpt.com/docs/extend/mcp?surface=cli",
    location: "~/.codex/config.toml",
    format: "TOML",
  },
  {
    id: "claude-code",
    name: "Claude Code",
    detail: "Terminal · one command",
    verification: CLIENT_VERIFICATION_FACTS["claude-code"],
    docs: "https://code.claude.com/docs/en/mcp",
    location: "Your terminal",
    format: "Command",
  },
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    detail: "Desktop Chat · JSON",
    verification: CLIENT_VERIFICATION_FACTS["claude-desktop"],
    docs: "https://modelcontextprotocol.io/docs/develop/connect-local-servers",
    location: "claude_desktop_config.json",
    format: "JSON",
  },
  {
    id: "cursor",
    name: "Cursor",
    detail: "Editor · JSON",
    verification: CLIENT_VERIFICATION_FACTS.cursor,
    docs: "https://cursor.com/docs/mcp",
    location: "~/.cursor/mcp.json",
    format: "JSON",
  },
  {
    id: "generic",
    name: "Another agent",
    detail: "Any client with local stdio MCP",
    verification: CLIENT_VERIFICATION_FACTS.generic,
    docs: "https://modelcontextprotocol.io/docs/develop/connect-local-servers",
    location: "Your client’s local MCP settings",
    format: "JSON",
  },
];

export function normalizeTools(ids) {
  if (!Array.isArray(ids))
    throw new TypeError("Select tools using an array of tool IDs.");
  const known = new Set(TOOLS.map((tool) => tool.id));
  for (const id of ids)
    if (!known.has(id)) throw new Error(`Unknown tool: ${id}`);
  return TOOLS.filter((tool) => ids.includes(tool.id)).map((tool) => tool.id);
}

export function matchingPreset(ids) {
  const selected = normalizeTools(ids);
  return (
    PRESETS.find(
      (preset) =>
        preset.tools.length === selected.length &&
        preset.tools.every((id) => selected.includes(id)),
    )?.id ?? "custom"
  );
}

/** A link may select exact known tools, but never insert arbitrary command text. */
export function toolsFromQuery(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 1024)
    return null;
  const ids = value.split(",").map((id) => id.trim());
  if (ids.length > TOOLS.length || ids.some((id) => !id)) return null;
  try {
    return normalizeTools(ids);
  } catch {
    return null;
  }
}

export function firstPrompt(ids) {
  const selected = normalizeTools(ids);
  const preferred = [
    "dashboard_resolve_model",
    "dashboard_model_economics",
    "dashboard_catalogue",
    ...selected,
  ];
  return (
    TOOLS.find(
      (tool) => tool.id === preferred.find((id) => selected.includes(id)),
    )?.prompt ?? "Choose at least one tool to get a first question."
  );
}

export function createSetup({
  clientId = "hermes",
  toolIds = PRESETS[0].tools,
  platform = "unix",
} = {}) {
  const client = CLIENTS.find((item) => item.id === clientId);
  if (!client) throw new Error("Choose a supported local MCP client.");
  if (!["unix", "windows"].includes(platform))
    throw new Error("Choose where your agent runs.");
  const tools = normalizeTools(toolIds);
  if (tools.length === 0)
    throw new Error("Choose at least one tool to continue.");
  const windows = platform === "windows";
  const server = {
    command: windows ? "cmd" : "npx",
    args: [...(windows ? ["/c", "npx"] : []), "-y", PACKAGE_SPEC],
    env: { OPEN_DASHBOARD_TOOLS: tools.join(",") },
  };
  const result = {
    client,
    tools,
    server,
    format: client.format,
    prompt: firstPrompt(tools),
    sourceUrl: client.docs,
    location:
      clientId === "openclaw"
        ? windows
          ? OPENCLAW_CONFIG_FACTS.windowsConfigPath
          : OPENCLAW_CONFIG_FACTS.configPath
        : client.location,
    filename: "open-dashboard-mcp.json",
    content: "",
    instruction: "",
    verification: "",
  };
  if (clientId === "hermes") {
    result.filename = "open-dashboard-hermes.yaml";
    result.content = `mcp_servers:\n  open-dashboard:\n    command: ${JSON.stringify(server.command)}\n    args: ${JSON.stringify(server.args)}\n    env:\n      OPEN_DASHBOARD_TOOLS: ${JSON.stringify(server.env.OPEN_DASHBOARD_TOOLS)}\n`;
    result.instruction =
      "Merge this entry into mcp_servers in ~/.hermes/config.yaml. Keep your other settings and servers, then start a new Hermes chat.";
    result.verification =
      `${client.verification.detail} Start a new Hermes session and ask the question below.`;
  } else if (clientId === "codex") {
    result.filename = "open-dashboard-codex.toml";
    result.content = `[mcp_servers.open-dashboard]\ncommand = ${JSON.stringify(server.command)}\nargs = ${JSON.stringify(server.args)}\n\n[mcp_servers.open-dashboard.env]\nOPEN_DASHBOARD_TOOLS = ${JSON.stringify(server.env.OPEN_DASHBOARD_TOOLS)}\n`;
    result.instruction =
      "Add this entry to ~/.codex/config.toml on the host where Codex runs (inside WSL if applicable). Preserve your existing settings, then reopen your Codex session.";
    result.verification =
      `${client.verification.detail} Use /mcp in the local app or CLI to check that its tools are available, then ask the question below.`;
  } else if (clientId === "claude-code") {
    result.filename = "open-dashboard-claude-code.txt";
    result.content = `claude mcp add --transport stdio --scope user --env OPEN_DASHBOARD_TOOLS=${server.env.OPEN_DASHBOARD_TOOLS} open-dashboard -- ${server.command} ${server.args.join(" ")}`;
    result.instruction =
      "Run this command in your terminal. It adds Open Dashboard for your user across projects. If that name is already configured, update its existing entry instead.";
    result.verification =
      `${client.verification.detail} Open Claude Code, run /mcp, and check that Open Dashboard is connected. Then ask the question below.`;
  } else if (clientId === "openclaw") {
    result.filename = "open-dashboard-openclaw.json5";
    result.content =
      JSON.stringify(
        {
          mcp: {
            servers: {
              "open-dashboard": server,
            },
          },
        },
        null,
        2,
      ) + "\n";
    result.instruction = `Merge this entry into mcp.servers in ${result.location}. OpenClaw reads JSON5, so preserve your other root keys and servers. Then run openclaw mcp status --verbose to confirm the saved entry.`;
    result.verification = `${client.verification.detail} The status command reported a configured stdio server. Run openclaw mcp probe open-dashboard to test the live connection on this machine.`;
  } else {
    result.content =
      JSON.stringify(
        {
          mcpServers: {
            "open-dashboard": {
              ...(clientId === "cursor" ? { type: "stdio" } : {}),
              ...server,
            },
          },
        },
        null,
        2,
      ) + "\n";
    if (clientId === "cursor") {
      result.instruction =
        "Merge this entry into ~/.cursor/mcp.json for all projects, or .cursor/mcp.json for one project. Preserve your existing mcpServers entries.";
      result.verification =
        `${client.verification.detail} Open Customize in Cursor and check that Open Dashboard is enabled and its tools are available. Then ask the question below.`;
    } else if (clientId === "claude-desktop") {
      result.instruction =
        "In Claude Desktop, open Settings → Developer → Edit Config. Merge this into claude_desktop_config.json, preserving your other mcpServers. Quit and reopen the app.";
      result.verification =
        `${client.verification.detail} In a Desktop Chat, open the connectors menu and check Open Dashboard’s tools. This local setup is not a hosted Cowork connector.`;
    } else {
      result.instruction =
        "Choose a local stdio MCP server in your agent’s settings. Enter the command, arguments and environment below. This common JSON shape may need adapting to your client.";
      result.verification =
        `${client.verification.detail} Use your client’s MCP connection or tools panel to confirm the selected tools are available, then ask the question below.`;
    }
  }
  return result;
}
