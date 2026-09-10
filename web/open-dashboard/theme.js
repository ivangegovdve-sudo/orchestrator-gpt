try {
  const theme = localStorage.getItem("open-dashboard-theme");
  document.documentElement.dataset.theme =
    theme === "dark" || theme === "light"
      ? theme
      : matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
} catch {
  document.documentElement.dataset.theme = "light";
}
