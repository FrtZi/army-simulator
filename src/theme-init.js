// Chooses the theme before the first paint (inlined in <head> by the build): the choice saved in this browser,
// else the system's preference, followed live while nothing is saved. The only place that decides the theme;
// the CSS reads nothing but the data-theme attribute. Without JavaScript: dark.
(function () {
  const root = document.documentElement;
  const systemLight = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;
  const saved = () => {
    try {
      const theme = localStorage.getItem("army-simulator.theme");
      return theme === "light" || theme === "dark" ? theme : null;
    } catch {
      return null; // storage blocked: follow the system
    }
  };
  const apply = () => root.setAttribute("data-theme", saved() || (systemLight?.matches ? "light" : "dark"));
  apply();
  systemLight?.addEventListener("change", apply);
})();
