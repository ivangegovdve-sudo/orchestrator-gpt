import {
  CLIENTS,
  PACKAGE_SPEC,
  PRESETS,
  TOOLS,
  createSetup,
  matchingPreset,
  normalizeTools,
  toolsFromQuery,
} from "./setup-data.js";
import { initShell } from "./shell.js";
import {
  formatNpmDownloadRange,
  formatNpmDownloadAge,
  readNpmDownloadState,
} from "./npm-downloads.js";
import {
  formatNpmReleaseAge,
  readNpmReleaseState,
} from "./npm-releases.js";

const STORAGE_KEY = "open-dashboard-setup-v1";
const PACKAGE_FACTS_URL = new URL("./package-facts.json", import.meta.url);
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );

export function restoreSetupPreferences(saved) {
  const state = {
    step: 0,
    clientId: "hermes",
    platform: "unix",
    toolIds: [...PRESETS[0].tools],
  };
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return state;
  if (CLIENTS.some((client) => client.id === saved.clientId))
    state.clientId = saved.clientId;
  if (["unix", "windows"].includes(saved.platform))
    state.platform = saved.platform;
  try {
    state.toolIds = normalizeTools(saved.toolIds);
  } catch {
    /* Missing or outdated tools keep the default selection. */
  }
  return state;
}

export function mountNpmDownloads(
  root = document,
  fetchImpl = globalThis.fetch,
  options = {},
) {
  const container = root.querySelector("[data-npm-downloads]");
  if (!container) return;
  const value = container.querySelector("[data-npm-downloads-value]");
  const note = container.querySelector("[data-npm-downloads-note]");
  if (!value || !note) return;

  container.dataset.npmDownloadsState = "loading";
  value.textContent = "Checking npm downloads…";
  note.textContent = "Reading the latest complete weekly window from npm.";

  return readNpmDownloadState(fetchImpl, options).then((state) => {
    container.dataset.npmDownloadsState = state.status;
    if (state.source) container.dataset.npmDownloadsSource = state.source;
    else delete container.dataset.npmDownloadsSource;
    if (state.status === "available") {
      value.textContent = `${state.facts.downloads.toLocaleString("en-US")} npm downloads`;
      const source = state.source === "cache" ? "this browser session" : "npm";
      note.textContent = `Latest complete weekly window: ${formatNpmDownloadRange(state.facts)} (read ${formatNpmDownloadAge(state.ageMs)} ago from ${source}).`;
    } else {
      value.textContent = "UNAVAILABLE";
      note.textContent = state.status === "unavailable"
        ? "The public downloads service did not return a usable weekly result; no cached number is shown."
        : "The public downloads response was unavailable or malformed; no cached number is shown.";
    }
  });
}

export function mountNpmReleases(
  root = document,
  fetchImpl = globalThis.fetch,
  options = {},
) {
  const container = root.querySelector("[data-npm-releases]");
  if (!container) return;
  const value = container.querySelector("[data-npm-releases-value]");
  const note = container.querySelector("[data-npm-releases-note]");
  if (!value || !note) return;

  container.dataset.npmReleasesState = "loading";
  value.textContent = "Checking npm releases…";
  note.textContent = "Reading published package versions from npm.";

  return readNpmReleaseState(fetchImpl, options).then((state) => {
    container.dataset.npmReleasesState = state.status;
    if (state.source) container.dataset.npmReleasesSource = state.source;
    else delete container.dataset.npmReleasesSource;
    if (state.status === "available") {
      value.textContent = `Published on npm: ${state.facts.latest}`;
      const source = state.source === "cache" ? "this browser session" : "npm";
      note.textContent = `Current npm release: ${state.facts.latest}. Registry checked ${formatNpmReleaseAge(state.ageMs)} ago from ${source}.`;
    } else {
      value.textContent = "UNAVAILABLE";
      note.textContent = state.status === "unavailable"
        ? "The npm registry did not return the published release list; no release claim is shown."
        : "The npm registry release response was unavailable or malformed; no release claim is shown.";
    }
  });
}

async function readPackageFacts(fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") throw new Error("Package facts fetch is unavailable");
  const response = await fetchImpl(PACKAGE_FACTS_URL, { cache: "no-store" });
  const facts = response?.ok ? await response.json() : null;
  if (
    !facts ||
    facts.name !== PACKAGE_SPEC ||
    typeof facts.version !== "string" ||
    typeof facts.node !== "string" ||
    !Array.isArray(facts.providers) ||
    !Array.isArray(facts.tools)
  )
    throw new Error("Package facts did not match the expected shape");
  return facts;
}

function formatNodeRequirement(requirement) {
  const match = requirement.match(/^>=\s*(\d+(?:\.\d+)?)/);
  return match ? `${match[1]} or newer` : requirement;
}

function applyPackageFacts(root, facts) {
  const nodeRequirement = formatNodeRequirement(facts.node);
  root.querySelectorAll("[data-package-provider-count]").forEach((element) => {
    element.textContent = `${facts.providers.length} providers`;
  });
  root.querySelectorAll("[data-package-tool-count]").forEach((element) => {
    element.textContent = `${facts.tools.length} tools`;
  });
  root.querySelectorAll("[data-package-version]").forEach((element) => {
    element.textContent = `MCP version ${facts.version}`;
  });
  root.querySelectorAll("[data-package-node-requirement]").forEach((element) => {
    element.textContent = `Node.js ${nodeRequirement}`;
  });
  root.querySelectorAll("[data-package-node-version]").forEach((element) => {
    element.textContent = nodeRequirement;
  });
}

export function mountSetup(root = document) {
  const wizard = root.querySelector("[data-setup]");
  if (!wizard) return;
  let packageFacts = null;
  let state = restoreSetupPreferences();
  try {
    state = restoreSetupPreferences(
      JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"),
    );
  } catch {
    /* Unavailable or malformed local preferences do not block setup. */
  }
  const query = new URLSearchParams(location.search);
  if (CLIENTS.some((client) => client.id === query.get("client")))
    state.clientId = query.get("client");
  const linkedPreset = PRESETS.find(
    (preset) => preset.id === query.get("preset"),
  );
  if (linkedPreset) state.toolIds = [...linkedPreset.tools];
  const linkedTools =
    query.getAll("tools").length === 1
      ? toolsFromQuery(query.get("tools"))
      : null;
  if (linkedTools) state.toolIds = linkedTools;

  wizard.querySelector("[data-clients]").innerHTML = CLIENTS.map(
    (client) =>
      `<label class="setup-client"><input type="radio" name="client" value="${client.id}"${state.clientId === client.id ? " checked" : ""}><span><strong>${escape(client.name)}</strong><small>${escape(client.detail)}<span class="setup-client-verification${client.verification.level === "unverified" ? " is-unverified" : ""}">${escape(client.verification.summary)}</span></small></span></label>`,
  ).join("");
  wizard.querySelector("[data-presets]").innerHTML = PRESETS.map(
    (preset) =>
      `<button class="setup-preset" type="button" data-preset="${preset.id}" aria-pressed="false"><strong>${escape(preset.name)}</strong><span>${escape(preset.description)}</span><small>${preset.tools.length} tools</small></button>`,
  ).join("");
  wizard.querySelector("[data-tools]").innerHTML = [
    ...new Set(TOOLS.map((tool) => tool.group)),
  ]
    .map(
      (group) =>
        `<fieldset class="setup-tool-group"><legend>${escape(group)}</legend>${TOOLS.filter(
          (tool) => tool.group === group,
        )
          .map(
            (tool) =>
              `<label class="setup-tool"><input type="checkbox" name="tool" value="${tool.id}"><span><strong>${escape(tool.name)}</strong><small>${escape(tool.description)}</small></span></label>`,
          )
          .join("")}</fieldset>`,
    )
    .join("");
  wizard.querySelector(`[name="platform"][value="${state.platform}"]`).checked =
    true;

  function persist() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          clientId: state.clientId,
          platform: state.platform,
          toolIds: state.toolIds,
        }),
      );
    } catch {
      /* Preferences are optional. */
    }
  }

  function updateSelection() {
    const preset = matchingPreset(state.toolIds);
    for (const input of wizard.querySelectorAll('[name="tool"]'))
      input.checked = state.toolIds.includes(input.value);
    for (const button of wizard.querySelectorAll("[data-preset]"))
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.preset === preset),
      );
    const count = state.toolIds.length;
    const totalTools = packageFacts?.tools.length;
    wizard.querySelector("[data-selection-count]").textContent =
      totalTools === undefined
        ? `${count} tools selected`
        : `${count} of ${totalTools} tools selected`;
    wizard.querySelector("[data-context-note]").textContent = count
      ? totalTools === undefined
        ? `Your assistant will see these ${count} selected tools.`
        : `Your assistant will see these ${count} tools. The remaining ${totalTools - count} are not exposed by the server.`
      : "Select at least one tool to create your setup.";
    wizard.querySelector('[data-next="2"]').disabled = count === 0;
    wizard.querySelector('[data-step-link="2"]').disabled = count === 0;
    wizard.querySelector("[data-key-note]").hidden = !state.toolIds.includes(
      "dashboard_key_inventory",
    );
    persist();
  }

  function updateOutput() {
    const setup = createSetup(state);
    wizard.querySelector("[data-output-title]").textContent =
      setup.client.id === "generic"
        ? "Connect your agent"
        : `Connect to ${setup.client.name}`;
    wizard.querySelector("[data-output-summary]").textContent =
      `${setup.tools.length} selected tools · ${setup.format} · ${packageFacts ? `version ${packageFacts.version}` : "package version unavailable"}`;
    wizard.querySelector("[data-output-instruction]").textContent =
      setup.instruction;
    wizard.querySelector("[data-output-location]").textContent = setup.location;
    wizard.querySelector("[data-output-code]").textContent = setup.content;
    const download = wizard.querySelector("[data-download-setup]");
    download.href = `data:text/plain;charset=utf-8,${encodeURIComponent(setup.content)}`;
    download.download = setup.filename;
    wizard.querySelector("[data-output-verification]").textContent =
      setup.verification;
    wizard.querySelector("[data-first-prompt]").textContent = setup.prompt;
    wizard.querySelector("[data-client-docs]").href = setup.sourceUrl;
    wizard.querySelector("[data-client-docs]").textContent =
      `${setup.client.name} setup guide`;
    wizard.querySelector("[data-selected-names]").textContent = TOOLS.filter(
      (tool) => setup.tools.includes(tool.id),
    )
      .map((tool) => tool.name)
      .join(" · ");
    wizard.querySelector("[data-copy-status]").textContent = "";
  }

  function showStep(step, focus = true) {
    if (step === 2 && state.toolIds.length === 0) return;
    state.step = step;
    if (step === 2) updateOutput();
    for (const panel of wizard.querySelectorAll("[data-step]"))
      panel.hidden = Number(panel.dataset.step) !== step;
    for (const button of wizard.querySelectorAll("[data-step-link]")) {
      if (Number(button.dataset.stepLink) === step)
        button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
      button.disabled =
        Number(button.dataset.stepLink) === 2 && state.toolIds.length === 0;
    }
    if (focus)
      wizard
        .querySelector(`[data-step="${step}"] h2`)
        .focus({ preventScroll: true });
  }

  async function copyText(text, label) {
    const status = wizard.querySelector("[data-copy-status]");
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = `${label} copied.`;
    } catch {
      status.textContent =
        "Clipboard access is unavailable. Select the text to copy it, or download the setup file.";
      const target = wizard.querySelector(
        label === "Question" ? "[data-first-prompt]" : "[data-output-code]",
      );
      const range = document.createRange();
      range.selectNodeContents(target);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  const installButton = root.querySelector("[data-copy-install]");
  if (installButton) {
    const installCommand =
      root.querySelector("[data-install-command]")?.textContent.trim() ||
      `npx -y ${PACKAGE_SPEC}`;
    installButton.addEventListener("click", async () => {
      const status = root.querySelector("[data-install-status]");
      try {
        await navigator.clipboard.writeText(installCommand);
        if (status) status.textContent = "Install line copied.";
      } catch {
        if (status)
          status.textContent =
            "Clipboard access is unavailable. Select the install line to copy it.";
        const target = root.querySelector("[data-install-command]");
        if (!target) return;
        const range = document.createRange();
        range.selectNodeContents(target);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });
  }

  wizard.addEventListener("change", (event) => {
    if (event.target.name === "client") state.clientId = event.target.value;
    if (event.target.name === "platform") state.platform = event.target.value;
    if (event.target.name === "tool")
      state.toolIds = [...wizard.querySelectorAll('[name="tool"]:checked')].map(
        (input) => input.value,
      );
    updateSelection();
  });
  wizard.addEventListener("click", (event) => {
    const button = event.target.closest("button, a[data-download-setup]");
    if (!button) return;
    if (button.hasAttribute("data-next")) showStep(Number(button.dataset.next));
    if (button.hasAttribute("data-step-link"))
      showStep(Number(button.dataset.stepLink));
    if (button.hasAttribute("data-preset")) {
      state.toolIds = [
        ...PRESETS.find((preset) => preset.id === button.dataset.preset).tools,
      ];
      updateSelection();
    }
    if (button.hasAttribute("data-clear-tools")) {
      state.toolIds = [];
      updateSelection();
    }
    if (button.hasAttribute("data-copy-setup"))
      copyText(createSetup(state).content, "Setup");
    if (button.hasAttribute("data-copy-prompt"))
      copyText(createSetup(state).prompt, "Question");
    if (button.hasAttribute("data-download-setup")) {
      wizard.querySelector("[data-copy-status]").textContent =
        "Setup file prepared for download. Merge it with your existing settings.";
    }
  });
  updateSelection();
  showStep(0, false);
  readPackageFacts()
    .then((facts) => {
      packageFacts = facts;
      applyPackageFacts(root, facts);
      updateSelection();
      if (state.step === 2) updateOutput();
    })
    .catch(() => {
      /* The setup remains usable, but it does not invent package facts. */
    });
}

if (typeof document !== "undefined") {
  if (document.querySelector("[data-setup]")) {
    initShell();
    mountSetup();
  }
  mountNpmDownloads();
  mountNpmReleases();
}
