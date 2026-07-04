const frame = document.getElementById("glass-box-frame");
const fallbackPanel = document.getElementById("fallback-panel");
const fallbackCopy = document.getElementById("fallback-copy");
const launchLink = document.getElementById("launch-link");
const launchLinkInline = document.getElementById("launch-link-inline");
const statusLabel = document.getElementById("status-label");
const statusCopy = document.getElementById("status-copy");
const embedTitle = document.getElementById("embed-title");

function applyLaunchTarget(targetUrl, launchLabel) {
  const href = targetUrl || "#";
  const label = launchLabel || "Open live console";
  launchLink.href = href;
  launchLink.textContent = label;
  launchLinkInline.href = href;
  launchLinkInline.textContent = label;
}

function showFallback(message, targetUrl, launchLabel) {
  frame.hidden = true;
  fallbackPanel.hidden = false;
  fallbackCopy.textContent = message;
  applyLaunchTarget(targetUrl, launchLabel);
}

async function loadConfig() {
  const response = await fetch("./config.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Config request failed with ${response.status}`);
  }
  return response.json();
}

async function bootstrap() {
  try {
    const config = await loadConfig();
    document.title = `${config.title || "TinyLM Glass Box"} - Forest HUB`;
    embedTitle.textContent = config.title || "TinyLM target";
    statusLabel.textContent = config.statusLabel || "Configured target";
    applyLaunchTarget(config.targetUrl, config.launchLabel);

    if (!config.targetUrl) {
      showFallback("No target URL is configured yet for this route.", "", config.launchLabel);
      statusCopy.textContent = "The wrapper route is live, but no TinyLM runtime target has been assigned yet.";
      return;
    }

    if (!config.allowEmbed) {
      showFallback("Embedding is disabled for this target. Launch it in a new tab instead.", config.targetUrl, config.launchLabel);
      statusCopy.textContent = "This target is intentionally launch-only.";
      return;
    }

    frame.src = config.targetUrl;
    frame.hidden = false;
    fallbackPanel.hidden = true;
    statusCopy.textContent = "Attempting inline embed. If the target blocks framing, use the launch button above or below.";

    window.setTimeout(() => {
      if (!fallbackPanel.hidden) {
        return;
      }
      statusCopy.textContent = "If the console area stays blank, the target is probably blocking iframe embedding. Use the launch button.";
    }, 3000);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown configuration error";
    showFallback(`The route could not load its runtime configuration: ${message}`, "", "Open project repo");
    statusLabel.textContent = "Configuration error";
    statusCopy.textContent = "The SD Forest wrapper is up, but its target configuration is currently unavailable.";
  }
}

bootstrap();
