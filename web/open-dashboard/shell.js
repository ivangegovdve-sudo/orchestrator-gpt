export function initShell() {
  const buttons = document.querySelectorAll("[data-theme-toggle]");
  const update = () => {
    const dark = document.documentElement.dataset.theme === "dark";
    buttons.forEach((button) => {
      button.setAttribute(
        "aria-label",
        `Switch to ${dark ? "light" : "dark"} mode`,
      );
      button.innerHTML = `◐ <span>${dark ? "Light" : "Dark"} mode</span>`;
    });
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#0c1311" : "#f6f5ef");
  };
  if (!document.documentElement.dataset.theme) {
    try {
      document.documentElement.dataset.theme =
        localStorage.getItem("open-dashboard-theme") ||
        (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    } catch {
      document.documentElement.dataset.theme = "light";
    }
  }
  buttons.forEach((button) =>
    button.addEventListener("click", () => {
      const theme =
        document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = theme;
      try {
        localStorage.setItem("open-dashboard-theme", theme);
      } catch {}
      update();
    }),
  );
  update();
}
export async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    if (button) {
      const before = button.textContent;
      button.textContent = "Copied";
      setTimeout(() => {
        button.textContent = before;
      }, 1800);
    }
    return true;
  } catch {
    return false;
  }
}
