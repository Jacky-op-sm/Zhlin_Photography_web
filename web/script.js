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

(function () {
  var lightbox = document.getElementById("photo-lightbox");
  if (!lightbox) return;

  var imageEl = document.getElementById("photo-lightbox-image");
  var titleEl = document.getElementById("photo-lightbox-title");
  var subtitleEl = document.getElementById("photo-lightbox-subtitle");
  var locationEl = document.getElementById("photo-lightbox-location");
  var dateEl = document.getElementById("photo-lightbox-date");
  var closeBtn = document.getElementById("photo-lightbox-close");
  var cards = document.querySelectorAll(".photo-card[data-lightbox-src]");

  function fillLine(el, text) {
    if (!el) return;
    el.textContent = text || "";
    el.style.display = text ? "" : "none";
  }

  function openLightbox(card) {
    if (!card || !imageEl) return;

    imageEl.src = card.getAttribute("data-lightbox-src") || "";
    imageEl.alt = card.getAttribute("data-lightbox-title") || "Photo preview";
    fillLine(titleEl, card.getAttribute("data-lightbox-title"));
    fillLine(subtitleEl, card.getAttribute("data-lightbox-subtitle"));
    fillLine(locationEl, card.getAttribute("data-lightbox-location"));
    fillLine(dateEl, card.getAttribute("data-lightbox-date"));

    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-open");
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lightbox-open");
    if (imageEl) {
      imageEl.src = "";
      imageEl.alt = "";
    }
  }

  for (var i = 0; i < cards.length; i++) {
    cards[i].addEventListener("click", function () {
      openLightbox(this);
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", closeLightbox);
  }

  lightbox.addEventListener("click", function (event) {
    if (event.target === lightbox || event.target.getAttribute("data-lightbox-close") === "true") {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && lightbox.classList.contains("is-open")) {
      closeLightbox();
    }
  });
})();
