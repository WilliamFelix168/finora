const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("finora-theme");
    var isDark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", isDark);
  } catch (e) {}
})();
`;

/** Sets the `.dark` class before first paint to avoid a light/dark flash. */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
}
