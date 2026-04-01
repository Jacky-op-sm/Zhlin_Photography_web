(function () {
  function byId(id) {
    return id ? document.getElementById(id) : null;
  }

  function toArray(nodeList) {
    return Array.prototype.slice.call(nodeList || []);
  }

  window.initTravelFoodModal = function initTravelFoodModal(options) {
    var opts = options || {};
    var modal = byId(opts.modalId);
    var imageEl = byId(opts.imageId);
    var titleEl = byId(opts.titleId);
    var contentEl = byId(opts.contentId);
    var scoreEl = opts.scoreId ? byId(opts.scoreId) : null;
    var cards = toArray(document.querySelectorAll(opts.cardSelector || ""));

    if (!modal || !imageEl || !titleEl || !contentEl || !cards.length) return;

    var reviews = opts.reviews || {};
    var closeAttr = opts.closeAttr || "data-close-food-modal";
    var keyAttr = opts.keyAttr || "data-food-key";
    var bodyOpenClass = opts.bodyOpenClass || "nanjing-food-modal-open";
    var lastFocused = null;

    function fillParagraphs(lines) {
      contentEl.innerHTML = "";
      var safe = Array.isArray(lines) ? lines : [];
      for (var i = 0; i < safe.length; i++) {
        var p = document.createElement("p");
        p.textContent = safe[i];
        contentEl.appendChild(p);
      }
    }

    function openModal(card) {
      if (!card) return;
      var key = card.getAttribute(keyAttr);
      var item = reviews[key];
      if (!item) return;

      lastFocused = card;
      var cardImage = card.querySelector("img");
      imageEl.src = cardImage ? cardImage.getAttribute("src") || "" : "";
      imageEl.alt = cardImage ? (cardImage.getAttribute("alt") || item.title || "") : (item.title || "");
      titleEl.textContent = item.title || "";

      if (scoreEl) {
        scoreEl.textContent = item.score || "";
        scoreEl.hidden = !item.score;
      }

      fillParagraphs(item.paragraphs);
      modal.hidden = false;
      document.body.classList.add(bodyOpenClass);
    }

    function closeModal() {
      if (modal.hidden) return;
      modal.hidden = true;
      document.body.classList.remove(bodyOpenClass);
      if (lastFocused) lastFocused.focus();
    }

    cards.forEach(function (card) {
      card.addEventListener("click", function () {
        openModal(card);
      });

      card.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openModal(card);
        }
      });
    });

    modal.addEventListener("click", function (event) {
      var target = event.target;
      if (target && target.getAttribute(closeAttr) === "true") {
        closeModal();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeModal();
      }
    });
  };
})();
