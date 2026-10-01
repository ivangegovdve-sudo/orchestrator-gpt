const toggle = document.querySelector(".menu-toggle");
function closeMenu() {
  document.querySelector(".sidebar").classList.remove("open");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Expand navigation");
}
toggle.addEventListener("click", () => {
  const open = document.querySelector(".sidebar").classList.toggle("open");
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute(
    "aria-label",
    open ? "Collapse navigation" : "Expand navigation",
  );
});
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    document.querySelector(".sidebar").classList.contains("open")
  ) {
    closeMenu();
    toggle.focus();
  }
});
document
  .querySelectorAll(".sidebar a")
  .forEach((link) => link.addEventListener("click", closeMenu));
// Keep navigation on the current catalogue, preserving its loaded evidence.
const viewLinks = [...document.querySelectorAll('.sidebar a[href^="?view="]')];
function markView(view) {
  document
    .querySelectorAll('.sidebar nav[aria-label="Dashboard navigation"] a')
    .forEach((link) => {
      const active = view
        ? link.hash === "#explore" &&
          new URL(link.href).searchParams.get("view") === view
        : link.hash === "#main";
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
}
viewLinks.forEach((link) =>
  link.addEventListener("click", (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    const view = new URL(link.href).searchParams.get("view");
    const tab = document.querySelector(`[data-view="${view}"]`);
    if (!tab) return;
    event.preventDefault();
    tab.click();
    document.querySelector("#explore").scrollIntoView();
    markView(view);
  }),
);
document
  .querySelectorAll("[data-view]")
  .forEach((tab) =>
    tab.addEventListener("click", () => markView(tab.dataset.view)),
  );
document
  .querySelector('.sidebar a[href="#main"]')
  .addEventListener("click", () => markView(null));
markView(
  location.hash === "#explore"
    ? new URLSearchParams(location.search).get("view") || "models"
    : null,
);
const stages = {
  gather: [
    "Start with what is known.",
    "The router gathers current catalogue prices, measured model behavior and provider quota or budget state.",
  ],
  decide: [
    "A choice, with its reasons.",
    "The router qualifies candidates against the request. If no model qualifies, it abstains and records the reasons.",
  ],
  act: [
    "Forward the call. Keep the record.",
    "The proxy forwards the request and records the result. The MCP interface provides routing advice. This dashboard does not execute routing requests.",
  ],
};
document.querySelectorAll("[data-stage]").forEach((button) =>
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-stage]").forEach((other) => {
      other.classList.toggle("selected", other === button);
      other.setAttribute("aria-pressed", String(other === button));
    });
    const [title, copy] = stages[button.dataset.stage];
    document.querySelector("#stage-title").textContent = title;
    document.querySelector("#stage-copy").textContent = copy;
  }),
);
