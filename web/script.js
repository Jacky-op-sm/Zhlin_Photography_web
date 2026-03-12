(function () {
  var STORAGE_KEY = "theme";
  var DARK = "dark";
  var LIGHT = "light";

  var html = document.documentElement;
  var toggle = document.getElementById("theme-toggle");
  var label = document.querySelector(".theme-label");

  function getPreferred() {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored === DARK || stored === LIGHT) return stored;
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return DARK;
    return LIGHT;
  }

  function setTheme(theme) {
    if (theme === DARK) {
      html.setAttribute("data-theme", DARK);
      if (label) label.textContent = "浅色";
    } else {
      html.removeAttribute("data-theme");
      if (label) label.textContent = "深色";
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }

  function toggleTheme() {
    var isDark = html.getAttribute("data-theme") === DARK;
    setTheme(isDark ? LIGHT : DARK);
  }

  if (toggle) {
    toggle.addEventListener("click", toggleTheme);
  }

  setTheme(getPreferred());
})();
