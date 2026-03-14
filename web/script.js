(function () {
  var STORAGE_KEY = "theme";
  var DARK = "dark";
  var LIGHT = "light";

  var html = document.documentElement;
  var toggle = document.getElementById("theme-toggle");
  var label = document.querySelector(".theme-label");

  function readStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function writeStoredTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      // Ignore storage errors, keep theme in memory only.
    }
  }

  function getPreferredTheme() {
    var stored = readStoredTheme();
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
    writeStoredTheme(theme);
  }

  function toggleTheme() {
    var isDark = html.getAttribute("data-theme") === DARK;
    setTheme(isDark ? LIGHT : DARK);
  }

  if (toggle) {
    toggle.addEventListener("click", toggleTheme);
  }

  setTheme(getPreferredTheme());
})();

(function () {
  var body = document.body;
  if (!body) return;

  var page = body.getAttribute("data-page") || "";
  var basePath = (body.getAttribute("data-base-path") || ".").replace(/\/+$/, "");
  var contentUrl = body.getAttribute("data-content-url");
  var DEFAULT_TRAVEL_COMMENTS_CONFIG = {
    enabled: true,
    primaryProvider: "waline",
    waline: {
      serverURL: "https://web-comment-seven.vercel.app",
      lang: "zh-CN",
      requiredMeta: ["nick"],
      login: "disable",
      dark: '[data-theme="dark"]'
    },
    giscus: {
      repo: "Jacky-op-sm/Zhlin_Photography_web",
      repoId: "R_kgDORlYKzQ",
      category: "Announcements",
      categoryId: "DIC_kwDORlYKzc4C4WTD",
      mapping: "pathname",
      strict: "0",
      reactionsEnabled: "1",
      emitMetadata: "0",
      inputPosition: "bottom",
      lang: "zh-CN"
    }
  };
  var walineModulePromise = null;
  var walineInstance = null;

  function escapeHtml(value) {
    var text = value == null ? "" : String(value);
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function withBase(path) {
    if (!path) return "";
    if (/^(https?:|mailto:|tel:)/i.test(path)) return path;
    if (path.charAt(0) === "/") return path;
    if (!basePath || basePath === ".") return path;
    return basePath + "/" + path;
  }

  function setText(selector, text) {
    var el = document.querySelector(selector);
    if (!el) return;
    el.textContent = text || "";
  }

  function renderParagraphs(containerSelector, lines) {
    var el = document.querySelector(containerSelector);
    if (!el || !Array.isArray(lines)) return;

    var html = "";
    for (var i = 0; i < lines.length; i++) {
      html += "<p>" + escapeHtml(lines[i]) + "</p>";
    }
    el.innerHTML = html;
  }

  function renderSocialLinks(containerSelector, socials) {
    var container = document.querySelector(containerSelector);
    if (!container || !socials) return;

    function isLink(value) {
      return /^(https?:|mailto:|tel:|weixin:)/i.test(value || "");
    }

    var entries = [
      { key: "instagram", label: "Instagram" },
      { key: "linkedin", label: "LinkedIn" },
      { key: "wechat", label: "WeChat" }
    ];

    var html = "";
    for (var i = 0; i < entries.length; i++) {
      var item = entries[i];
      var link = socials[item.key];
      if (!link) continue;
      if (html) {
        html += '<span class="social-separator">·</span>';
      }
      if (isLink(link)) {
        html += '<a href="' + escapeAttr(link) + '" class="social-link" target="_blank" rel="noopener noreferrer">' + escapeHtml(item.label) + "</a>";
      } else {
        html += '<span class="social-link social-link--plain">' + escapeHtml(item.label) + ": " + escapeHtml(link) + "</span>";
      }
    }

    container.innerHTML = html || '<span class="section-placeholder">社交链接待补充</span>';
  }

  function renderHome(data) {
    if (!data || !data.profile) return;

    setText(".name", data.profile.name);
    setText(".title-line", data.profile.title);

    var avatar = document.getElementById("about-avatar");
    if (avatar) {
      avatar.src = withBase(data.profile.avatar);
      avatar.alt = data.profile.name + " avatar";
      avatar.loading = "eager";
      avatar.decoding = "async";
    }

    renderParagraphs("#about-text", data.profile.aboutParagraphs);

    var footerEmail = document.getElementById("footer-email");
    if (footerEmail && data.profile.email) {
      footerEmail.href = "mailto:" + data.profile.email;
      footerEmail.textContent = "Email";
    }

    renderSocialLinks("#footer-social-links", data.profile.socials);
    var footerSocial = document.getElementById("footer-social-links");
    if (
      footerSocial &&
      footerSocial.textContent &&
      footerSocial.textContent.trim() &&
      !footerSocial.querySelector(".section-placeholder")
    ) {
      footerSocial.insertAdjacentHTML("afterbegin", '<span class="social-separator">·</span>');
    }
  }

  function renderPhotography(data) {
    if (!data || !data.photography) return;

    setText("#photography-intro", data.photography.intro);

    var gallery = document.getElementById("photo-gallery");
    if (!gallery || !Array.isArray(data.photography.items)) return;

    var areaClasses = ["photo-item--a", "photo-item--b", "photo-item--c", "photo-item--d"];
    var html = "";

    for (var i = 0; i < data.photography.items.length; i++) {
      var item = data.photography.items[i];
      var areaClass = areaClasses[i % areaClasses.length];
      var src = withBase(item && item.src);
      var title = item && item.title ? String(item.title) : "";
      var subtitle = item && item.subtitle ? String(item.subtitle) : "";
      var location = item && item.location ? String(item.location) : "";
      var date = item && item.date ? String(item.date) : "";
      html +=
        '<li class="photo-item ' + areaClass + '">' +
          '<button type="button" class="photo-card" ' +
            'data-lightbox-src="' + escapeAttr(src) + '" ' +
            'data-lightbox-title="' + escapeAttr(title) + '" ' +
            'data-lightbox-subtitle="' + escapeAttr(subtitle) + '" ' +
            'data-lightbox-location="' + escapeAttr(location) + '" ' +
            'data-lightbox-date="' + escapeAttr(date) + '" ' +
            'aria-label="' + escapeAttr("Open " + title) + '">' +
            '<span class="photo-card-media">' +
              '<img src="' + escapeAttr(src) + '" alt="' + escapeAttr(title) + '" loading="' + (i === 0 ? "eager" : "lazy") + '" decoding="async">' +
            '</span>' +
          '</button>' +
        '</li>';
    }

    gallery.innerHTML = html;
  }

  function renderHobby(data) {
    if (!data || !data.hobby) return;

    var hobby = data.hobby;
    setText("#hobby-intro", hobby.intro);

    function normalizeMonthValue(month) {
      if (typeof month !== "string") return -1;
      var matched = month.match(/^(\d{4})-(\d{1,2})$/);
      if (!matched) return -1;
      return parseInt(matched[1], 10) * 100 + parseInt(matched[2], 10);
    }

    function formatMonth(month) {
      if (typeof month !== "string") return "";
      var matched = month.match(/^(\d{4})-(\d{1,2})$/);
      if (!matched) return month;
      var mm = matched[2].length === 1 ? "0" + matched[2] : matched[2];
      return matched[1] + " 年 " + mm + " 月";
    }

    function renderDigestGroup(title, entries, monthIndex, groupKey) {
      if (!Array.isArray(entries) || !entries.length) return "";

      var maxVisible = 3;
      var listId = "hobby-digest-list-" + groupKey + "-" + monthIndex;
      var html = "";
      html += '<section class="hobby-digest-group">';
      html += '<h4 class="hobby-digest-group-title">' + escapeHtml(title) + "</h4>";
      html += '<ul class="hobby-digest-list" id="' + listId + '">';

      for (var i = 0; i < entries.length; i++) {
        var row = entries[i] || {};
        var hiddenClass = i >= maxVisible ? " hobby-digest-row--extra" : "";
        html += '<li class="hobby-digest-row' + hiddenClass + '">';
        html += "<strong>" + escapeHtml(row.name) + "</strong>";
        html += "<span>" + escapeHtml(row.why) + "</span>";
        html += "</li>";
      }

      html += "</ul>";
      if (entries.length > maxVisible) {
        html += '<button type="button" class="hobby-mini-btn" data-target="' + listId + '" data-expanded="false" aria-expanded="false">查看本月更多</button>';
      }
      html += "</section>";
      return html;
    }

    function renderInlineLolProfile(lolProfile) {
      if (!lolProfile || typeof lolProfile !== "object") return "";
      var hasInfo = false;
      var descParts = [];
      if (lolProfile.server) {
        if (String(lolProfile.server).toUpperCase() === "CN") {
          descParts.push("国服（CN）");
        } else {
          descParts.push("服务器 " + String(lolProfile.server));
        }
        hasInfo = true;
      }
      if (lolProfile.rank) {
        descParts.push("当前段位 " + String(lolProfile.rank));
        hasInfo = true;
      }

      var tagsRowsHtml = "";
      if (Array.isArray(lolProfile.mainRoles) && lolProfile.mainRoles.length) {
        var roleChips = "";
        for (var a = 0; a < lolProfile.mainRoles.length; a++) {
          roleChips += '<span class="hobby-tag">' + escapeHtml(lolProfile.mainRoles[a]) + "</span>";
        }
        tagsRowsHtml += '<div class="hobby-inline-lol-row"><span class="hobby-inline-lol-row-label">位置</span><div class="hobby-inline-lol-chip-row">' + roleChips + "</div></div>";
        hasInfo = true;
      }
      if (Array.isArray(lolProfile.championPool) && lolProfile.championPool.length) {
        var champChips = "";
        for (var b = 0; b < lolProfile.championPool.length; b++) {
          champChips += '<span class="hobby-tag">' + escapeHtml(lolProfile.championPool[b]) + "</span>";
        }
        tagsRowsHtml += '<div class="hobby-inline-lol-row"><span class="hobby-inline-lol-row-label">英雄池</span><div class="hobby-inline-lol-chip-row">' + champChips + "</div></div>";
        hasInfo = true;
      }

      var note = lolProfile.currentInsight ? String(lolProfile.currentInsight) : "";
      if (note) hasInfo = true;
      if (!hasInfo) return "";

      var html = "";
      html += '<div class="hobby-inline-lol">';
      html += '<p class="hobby-inline-lol-desc">' + escapeHtml(descParts.join(" · ") || "近期对局观察") + "</p>";
      if (tagsRowsHtml) {
        html += '<div class="hobby-inline-lol-rows">' + tagsRowsHtml + "</div>";
      }
      if (note) {
        html += '<p class="hobby-inline-lol-note">' + escapeHtml(note) + "</p>";
      }
      html += "</div>";
      return html;
    }

    var grid = document.getElementById("hobby-grid");
    var featuredCards = Array.isArray(hobby.featured) ? hobby.featured : (Array.isArray(hobby.cards) ? hobby.cards : []);
    var inlineLolHtml = renderInlineLolProfile(hobby.lolProfile || {});
    if (grid) {
      var featuredHtml = "";
      for (var i = 0; i < featuredCards.length; i++) {
        var card = featuredCards[i] || {};
        var items = Array.isArray(card.items) ? card.items : [];
        featuredHtml += '<article class="hobby-card">';
        featuredHtml += '<h2 class="hobby-card-title">' + escapeHtml(card.title) + "</h2>";
        featuredHtml += '<ul class="hobby-card-list">';

        for (var j = 0; j < items.length; j++) {
          var row = items[j] || {};
          var cardTitle = String(card.title || "");
          var itemName = String(row.name || "");
          var isGameLol = cardTitle === "游戏" && (itemName.toUpperCase() === "LOL" || itemName === "League of Legends");
          featuredHtml += "<li>";
          featuredHtml += "<strong>" + escapeHtml(row.name) + "</strong>";
          featuredHtml += "<span>" + escapeHtml(row.why) + "</span>";
          if (isGameLol && inlineLolHtml) {
            featuredHtml += inlineLolHtml;
          }
          featuredHtml += "</li>";
        }

        featuredHtml += "</ul>";
        featuredHtml += "</article>";
      }

      grid.innerHTML = featuredHtml;
    }

    var digestSection = document.getElementById("hobby-digest-section");
    var digestGrid = document.getElementById("hobby-digest-grid");
    var digestToggle = document.getElementById("hobby-digest-toggle");
    var digestSource = Array.isArray(hobby.monthlyDigest) ? hobby.monthlyDigest.slice() : [];
    digestSource.sort(function (a, b) {
      return normalizeMonthValue((b && b.month) || "") - normalizeMonthValue((a && a.month) || "");
    });

    if (digestSection && digestGrid) {
      var digestHtml = "";
      var collapsedMonths = 4;
      var expandedMonths = 8;
      var renderedMonths = 0;

      for (var m = 0; m < digestSource.length; m++) {
        if (renderedMonths >= expandedMonths) break;

        var monthData = digestSource[m] || {};
        var readingHtml = renderDigestGroup("阅读", monthData.reading, m, "reading");
        var filmHtml = renderDigestGroup("电影", monthData.films, m, "films");

        if (!readingHtml && !filmHtml) continue;

        var extraMonthAttr = renderedMonths >= collapsedMonths ? ' data-extra-month="true" hidden' : "";
        digestHtml += '<article class="hobby-digest-card"' + extraMonthAttr + ">";
        digestHtml += '<h3 class="hobby-digest-month">' + escapeHtml(formatMonth(monthData.month || "")) + "</h3>";
        digestHtml += readingHtml + filmHtml;
        digestHtml += "</article>";
        renderedMonths += 1;
      }

      if (digestHtml) {
        digestGrid.innerHTML = digestHtml;
        digestSection.hidden = false;

        var extraMonths = digestGrid.querySelectorAll('[data-extra-month="true"]');
        if (digestToggle) {
          if (extraMonths.length) {
            digestToggle.hidden = false;
            digestToggle.textContent = "查看更多月份";
            digestToggle.setAttribute("data-expanded", "false");
            digestToggle.setAttribute("aria-expanded", "false");
          } else {
            digestToggle.hidden = true;
          }
        }
      } else {
        digestGrid.innerHTML = "";
        digestSection.hidden = true;
        if (digestToggle) digestToggle.hidden = true;
      }

      if (!digestGrid.getAttribute("data-bound")) {
        digestGrid.addEventListener("click", function (event) {
          var target = event.target;
          if (!target || !target.classList || !target.classList.contains("hobby-mini-btn")) return;

          var listId = target.getAttribute("data-target");
          if (!listId) return;
          var list = document.getElementById(listId);
          if (!list) return;

          var expanded = list.classList.contains("is-expanded");
          if (expanded) {
            list.classList.remove("is-expanded");
            target.textContent = "查看本月更多";
            target.setAttribute("data-expanded", "false");
            target.setAttribute("aria-expanded", "false");
          } else {
            list.classList.add("is-expanded");
            target.textContent = "收起";
            target.setAttribute("data-expanded", "true");
            target.setAttribute("aria-expanded", "true");
          }
        });
        digestGrid.setAttribute("data-bound", "true");
      }

      if (digestToggle && !digestToggle.getAttribute("data-bound")) {
        digestToggle.addEventListener("click", function () {
          if (!digestGrid) return;
          var expanded = digestToggle.getAttribute("data-expanded") === "true";
          var cards = digestGrid.querySelectorAll('[data-extra-month="true"]');
          for (var i2 = 0; i2 < cards.length; i2++) {
            cards[i2].hidden = expanded;
          }
          if (expanded) {
            digestToggle.textContent = "查看更多月份";
            digestToggle.setAttribute("data-expanded", "false");
            digestToggle.setAttribute("aria-expanded", "false");
          } else {
            digestToggle.textContent = "收起";
            digestToggle.setAttribute("data-expanded", "true");
            digestToggle.setAttribute("aria-expanded", "true");
          }
        });
        digestToggle.setAttribute("data-bound", "true");
      }
    }

    var linksSection = document.getElementById("hobby-links-section");
    var linksContainer = document.getElementById("hobby-links");
    var externalProfiles = hobby.externalProfiles || {};
    if (linksSection && linksContainer) {
      var linkEntries = [
        { key: "goodreads", label: "Goodreads" },
        { key: "letterboxd", label: "Letterboxd" }
      ];
      var linksHtml = "";

      for (var n = 0; n < linkEntries.length; n++) {
        var entry = linkEntries[n];
        var url = externalProfiles[entry.key];
        if (!url) continue;
        linksHtml += '<a class="hobby-link-btn" href="' + escapeAttr(url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(entry.label) + " ↗</a>";
      }

      if (linksHtml) {
        linksContainer.innerHTML = linksHtml;
        linksSection.hidden = false;
      } else {
        linksContainer.innerHTML = "";
        linksSection.hidden = true;
      }
    }

    var lolSection = document.getElementById("hobby-lol-section");
    if (lolSection) {
      // LOL profile is rendered inline under the 游戏/LOL item.
      lolSection.hidden = true;
    }
  }

  function renderTravel(data) {
    if (!data || !data.travel) return;

    setText("#travel-intro", data.travel.intro);

    var grid = document.getElementById("travel-grid");
    if (!grid || !Array.isArray(data.travel.cities)) return;

    var html = "";

    for (var i = 0; i < data.travel.cities.length; i++) {
      var city = data.travel.cities[i];
      var slug = city && city.slug ? String(city.slug).trim() : "";
      if (!/^[a-z0-9-]+$/i.test(slug)) continue;
      var cityZhName = city && city.zhName ? String(city.zhName) : "";
      var cityEnName = city && city.enName ? String(city.enName) : "";
      var cityPeriod = city && city.period ? String(city.period) : "";
      var cityCardTitle = city && city.cardTitle ? String(city.cardTitle) : "";
      var cityCover = withBase(city && city.cover);
      html +=
        '<li class="travel-card">' +
          '<a href="' + escapeAttr(slug) + '/index.html" class="travel-card-link">' +
            '<div class="travel-card-image-wrap">' +
              '<img src="' + escapeAttr(cityCover) + '" alt="' + escapeAttr(cityZhName + " · " + cityEnName) + '" loading="' + (i === 0 ? "eager" : "lazy") + '" decoding="async">' +
              '<div class="travel-card-overlay">' +
                '<span class="travel-card-overlay-tag">Travel</span>' +
                '<span class="travel-card-overlay-title">' + escapeHtml(cityZhName) + '</span>' +
                '<span class="travel-card-overlay-sub">' + escapeHtml(cityEnName) + '</span>' +
              '</div>' +
            '</div>' +
            '<p class="travel-card-meta">' + escapeHtml(cityPeriod) + '</p>' +
            '<h2 class="travel-card-title">' + escapeHtml(cityCardTitle) + '</h2>' +
            '<span class="travel-card-read">Read More</span>' +
          '</a>' +
        '</li>';
    }

    grid.innerHTML = html;
  }

  function renderTravelDetail(data) {
    if (!data || !data.travel || !Array.isArray(data.travel.cities)) return;

    var slug = body.getAttribute("data-city");
    if (!slug) return;

    var city = null;
    for (var i = 0; i < data.travel.cities.length; i++) {
      if (data.travel.cities[i].slug === slug) {
        city = data.travel.cities[i];
        break;
      }
    }
    if (!city) return;

    setText("#travel-detail-period", city.period);
    setText("#travel-detail-title", city.cardTitle);
    setText("#travel-detail-location", city.zhName + " · " + city.enName);
    setText("#travel-detail-summary", city.summary);
    setText("#travel-photo-story", city.photoStory);
    setText("#travel-reflection", city.reflection);

    var cover = document.getElementById("travel-detail-cover");
    if (cover) {
      cover.src = withBase(city.cover);
      cover.alt = city.zhName + " · " + city.enName;
      cover.loading = "eager";
      cover.decoding = "async";
    }

    var itinerary = document.getElementById("travel-itinerary");
    if (itinerary && Array.isArray(city.itinerary)) {
      var itineraryHtml = "";
      for (var j = 0; j < city.itinerary.length; j++) {
        itineraryHtml += "<li>" + escapeHtml(city.itinerary[j]) + "</li>";
      }
      itinerary.innerHTML = itineraryHtml;
    }

    var spots = document.getElementById("travel-spots");
    if (spots && Array.isArray(city.spots)) {
      var spotsHtml = "";
      for (var k = 0; k < city.spots.length; k++) {
        spotsHtml += "<li>" + escapeHtml(city.spots[k]) + "</li>";
      }
      spots.innerHTML = spotsHtml;
    }
  }

  function renderContact(data) {
    if (!data || !data.contact || !data.profile) return;

    setText("#contact-title", data.contact.title);
    setText("#contact-response-time", data.contact.responseTime);

    var email = document.getElementById("contact-email");
    if (email && data.profile.email) {
      email.href = "mailto:" + data.profile.email;
      email.textContent = data.profile.email;
    }

    var socialWrap = document.getElementById("contact-social");
    if (socialWrap) {
      function isLink(value) {
        return /^(https?:|mailto:|tel:|weixin:)/i.test(value || "");
      }

      function appendSocial(label, value, short) {
        if (!value) return "";
        if (isLink(value)) {
          return '<a href="' + escapeAttr(value) + '" class="social-icon social-icon--text" aria-label="' + escapeAttr(label) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(short) + "</a>";
        }
        return '<span class="social-chip">' + escapeHtml(label) + ": " + escapeHtml(value) + "</span>";
      }

      var html = "";
      html += appendSocial("Instagram", data.profile.socials.instagram, "ig");
      html += appendSocial("LinkedIn", data.profile.socials.linkedin, "in");
      html += appendSocial("WeChat", data.profile.socials.wechat, "wx");
      socialWrap.innerHTML = html || '<span class="section-placeholder">社交链接待补充</span>';
    }

    var typeSelect = document.getElementById("contact-type");
    if (typeSelect && Array.isArray(data.contact.types)) {
      var options = '<option value="">请选择类型</option>';
      for (var i = 0; i < data.contact.types.length; i++) {
        var t = data.contact.types[i];
        options += '<option value="' + escapeAttr(t) + '">' + escapeHtml(t) + "</option>";
      }
      typeSelect.innerHTML = options;
    }
  }

  function initContactForm() {
    var form = document.getElementById("contact-form");
    if (!form) return;

    var status = document.getElementById("contact-form-status");
    var submitButton = form.querySelector("button[type='submit']");

    function setStatus(text, type) {
      if (!status) return;
      status.textContent = text || "";
      status.className = "form-status" + (type ? " form-status--" + type : "");
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      var firstNameField = document.getElementById("first-name");
      var lastNameField = document.getElementById("last-name");
      var emailField = document.getElementById("email");
      var typeField = document.getElementById("contact-type");
      var messageField = document.getElementById("message");

      var payload = {
        firstName: (firstNameField && firstNameField.value || "").trim(),
        lastName: (lastNameField && lastNameField.value || "").trim(),
        email: (emailField && emailField.value || "").trim(),
        type: (typeField && typeField.value || "").trim(),
        message: (messageField && messageField.value || "").trim(),
        // Keep honeypot empty in JS flow to avoid accidental autofill false positives.
        website: ""
      };

      if (!payload.firstName || !payload.lastName || !payload.email || !payload.message || !payload.type) {
        setStatus("请完整填写必填项后再提交。", "error");
        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "SENDING...";
      }
      setStatus("正在发送，请稍候...", "pending");

      try {
        var fallbackEmail = "Jackylin714@gmail.com";
        var fallbackSubject = encodeURIComponent("[Website Contact] " + payload.type);
        var fallbackBody = encodeURIComponent(
          "Name: " + payload.firstName + " " + payload.lastName + "\n" +
          "Email: " + payload.email + "\n" +
          "Type: " + payload.type + "\n\n" +
          payload.message
        );

        var response = await fetch("/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        var rawResult = await response.text();
        var result = null;
        if (rawResult) {
          try {
            result = JSON.parse(rawResult);
          } catch (error) {
            result = null;
          }
        }

        if (!response.ok) {
          throw new Error((result && result.error) || "提交失败，请稍后重试。");
        }

        if (!result || !result.ok) {
          throw new Error((result && result.error) || "提交失败，请稍后重试。");
        }

        form.reset();
        setStatus("提交成功。我们已收到你的消息，将尽快回复。", "success");
      } catch (error) {
        var message = error && error.message ? error.message : "提交失败，请稍后重试。";
        setStatus(message + " 若问题持续，请使用邮箱直接联系。", "error");

        // Graceful fallback: open prefilled email draft so user content is not lost.
        try {
          window.location.href = "mailto:" + fallbackEmail + "?subject=" + fallbackSubject + "&body=" + fallbackBody;
        } catch (fallbackError) {
          // Ignore mailto errors in restricted environments.
        }
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "SEND";
        }
      }
    });
  }

  function initPhotoLightbox() {
    var lightbox = document.getElementById("photo-lightbox");
    if (!lightbox) return;

    var imageEl = document.getElementById("photo-lightbox-image");
    var titleEl = document.getElementById("photo-lightbox-title");
    var subtitleEl = document.getElementById("photo-lightbox-subtitle");
    var locationEl = document.getElementById("photo-lightbox-location");
    var dateEl = document.getElementById("photo-lightbox-date");
    var closeBtn = document.getElementById("photo-lightbox-close");
    var prevBtn = document.getElementById("photo-lightbox-prev");
    var nextBtn = document.getElementById("photo-lightbox-next");

    var cards = Array.prototype.slice.call(document.querySelectorAll(".photo-card[data-lightbox-src]"));
    var currentIndex = -1;
    var lastFocused = null;

    function fillLine(el, text) {
      if (!el) return;
      el.textContent = text || "";
      el.style.display = text ? "" : "none";
    }

    function getFocusable() {
      var nodes = lightbox.querySelectorAll("button:not([disabled])");
      return Array.prototype.slice.call(nodes);
    }

    function openAt(index) {
      if (!cards.length) return;
      if (index < 0) index = cards.length - 1;
      if (index >= cards.length) index = 0;

      var card = cards[index];
      currentIndex = index;

      if (!card || !imageEl) return;

      imageEl.src = card.getAttribute("data-lightbox-src") || "";
      imageEl.alt = card.getAttribute("data-lightbox-title") || "Photo preview";
      fillLine(titleEl, card.getAttribute("data-lightbox-title"));
      fillLine(subtitleEl, card.getAttribute("data-lightbox-subtitle"));
      fillLine(locationEl, card.getAttribute("data-lightbox-location"));
      fillLine(dateEl, card.getAttribute("data-lightbox-date"));

      lastFocused = document.activeElement;
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("lightbox-open");

      if (closeBtn) {
        closeBtn.focus();
      }
    }

    function closeLightbox() {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lightbox-open");

      if (imageEl) {
        imageEl.src = "";
        imageEl.alt = "";
      }

      if (lastFocused && typeof lastFocused.focus === "function") {
        lastFocused.focus();
      }
    }

    function next() {
      openAt(currentIndex + 1);
    }

    function prev() {
      openAt(currentIndex - 1);
    }

    for (var i = 0; i < cards.length; i++) {
      (function (idx) {
        cards[idx].addEventListener("click", function () {
          openAt(idx);
        });
      })(i);
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", closeLightbox);
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", prev);
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", next);
    }

    lightbox.addEventListener("click", function (event) {
      if (event.target === lightbox || event.target.getAttribute("data-lightbox-close") === "true") {
        closeLightbox();
      }
    });

    document.addEventListener("keydown", function (event) {
      var open = lightbox.classList.contains("is-open");
      if (!open) return;

      if (event.key === "Escape") {
        closeLightbox();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        prev();
        return;
      }

      if (event.key === "Tab") {
        var focusable = getFocusable();
        if (!focusable.length) return;

        var first = focusable[0];
        var last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
  }

  function initTravelStoryToc() {
    var isTravelStoryPage = /^travel-/.test(page) && page !== "travel" && page !== "travel-detail";
    if (!isTravelStoryPage) return;

    var headingNodes = document.querySelectorAll(
      ".nanjing-rb-section h2, .japan-rb-section h2, .nanjing-section--appendix .nanjing-section-heading h2, .japan-section--appendix .japan-section-heading h2"
    );
    if (!headingNodes.length) return;

    function ensureTocShell() {
      var existing = document.getElementById("travel-toc-shell");
      if (existing) return existing;

      var main = document.querySelector("main");
      if (!main || !main.parentNode) return null;

      var shell = document.createElement("aside");
      shell.className = "travel-toc-shell";
      shell.id = "travel-toc-shell";
      shell.setAttribute("aria-label", "目录");
      shell.innerHTML =
        '<button type="button" class="travel-toc-toggle" id="travel-toc-toggle" aria-controls="travel-toc-panel" aria-expanded="true">' +
          '<span class="travel-toc-toggle-icon" aria-hidden="true">+</span>' +
          '<span class="travel-toc-toggle-label">隐藏目录</span>' +
        "</button>" +
        '<nav class="travel-toc" id="travel-toc-panel" aria-label="目录">' +
          '<p class="travel-toc-title">目录</p>' +
          '<div class="travel-toc-content">' +
            '<div class="travel-toc-progress" aria-hidden="true">' +
              '<span class="travel-toc-progress-bar" id="travel-toc-progress-bar"></span>' +
            "</div>" +
            '<ol class="travel-toc-list" id="travel-toc-list"></ol>' +
          "</div>" +
        "</nav>";

      main.parentNode.insertBefore(shell, main);
      return shell;
    }

    ensureTocShell();

    var panel = document.getElementById("travel-toc-panel");
    var progressBar = document.getElementById("travel-toc-progress-bar");
    var list = document.getElementById("travel-toc-list");
    var toggleBtn = document.getElementById("travel-toc-toggle");
    if (!panel || !list || !toggleBtn) return;

    function slugify(text) {
      var value = (text || "").toLowerCase();
      value = value.replace(/[^\u4e00-\u9fa5a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      return value || "section";
    }

    var pagePrefix = (page || "travel").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "travel";
    var usedIds = {};
    var sections = [];
    var html = "";

    for (var i = 0; i < headingNodes.length; i++) {
      var heading = headingNodes[i];
      var title = (heading.textContent || "").trim();
      if (!title) continue;

      var section = heading.closest("section");
      if (!section) continue;

      if (!section.id) {
        var baseId = pagePrefix + "-" + slugify(title);
        var targetId = baseId;
        var suffix = 2;

        while (usedIds[targetId] || document.getElementById(targetId)) {
          targetId = baseId + "-" + suffix;
          suffix += 1;
        }

        section.id = targetId;
      }

      usedIds[section.id] = true;
      sections.push(section);
      var tocIndex = String(sections.length).padStart(2, "0");
      html +=
        '<li><a href="#' + escapeAttr(section.id) + '">' +
          '<span class="travel-toc-item-index" aria-hidden="true">' + tocIndex + "</span>" +
          '<span class="travel-toc-item-title">' + escapeHtml(title) + "</span>" +
        "</a></li>";
    }

    if (!sections.length) return;
    list.innerHTML = html;

    var links = Array.prototype.slice.call(list.querySelectorAll("a"));
    var activeId = "";

    function scrollToSectionById(id) {
      if (!id) return;
      var target = document.getElementById(id);
      if (!target) return;
      var targetTop = target.getBoundingClientRect().top + window.scrollY;
      var topOffset = 88;
      var destination = Math.max(0, targetTop - topOffset);
      window.scrollTo({ top: destination, behavior: "smooth" });
    }

    function setActive(id) {
      if (!id || id === activeId) return;
      activeId = id;

      for (var j = 0; j < links.length; j++) {
        var link = links[j];
        var isCurrent = link.getAttribute("href") === "#" + id;
        link.classList.toggle("is-active", isCurrent);
        if (isCurrent) {
          link.setAttribute("aria-current", "true");
        } else {
          link.removeAttribute("aria-current");
        }
      }
    }

    for (var linkIdx = 0; linkIdx < links.length; linkIdx++) {
      links[linkIdx].addEventListener("click", function (event) {
        var href = this.getAttribute("href") || "";
        if (href.charAt(0) !== "#") return;
        event.preventDefault();
        var id = href.slice(1);
        scrollToSectionById(id);
        setActive(id);
        if (history && typeof history.replaceState === "function") {
          history.replaceState(null, "", "#" + id);
        }
      });
    }

    function refreshTocState() {
      var pivot = window.innerHeight * 0.34;
      var nextActive = sections[0].id;

      for (var k = 0; k < sections.length; k++) {
        var top = sections[k].getBoundingClientRect().top;
        if (top - pivot <= 0) {
          nextActive = sections[k].id;
        } else {
          break;
        }
      }

      setActive(nextActive);

      if (progressBar) {
        var firstTop = sections[0].getBoundingClientRect().top + window.scrollY;
        var startY = firstTop - window.innerHeight * 0.2;
        var lastSection = sections[sections.length - 1];
        var lastBottom = lastSection.getBoundingClientRect().bottom + window.scrollY;
        var endY = lastBottom - window.innerHeight * 0.7;
        var total = Math.max(1, endY - startY);
        var done = Math.min(Math.max(window.scrollY - startY, 0), total);
        var pct = (done / total) * 100;
        progressBar.style.height = pct.toFixed(2) + "%";
      }
    }

    window.addEventListener("scroll", refreshTocState, { passive: true });
    window.addEventListener("resize", refreshTocState);
    refreshTocState();

    var TOC_STORAGE_KEY = "travel-toc-open-v1";

    function readStoredTocState() {
      try {
        return localStorage.getItem(TOC_STORAGE_KEY);
      } catch (error) {
        return null;
      }
    }

    function writeStoredTocState(value) {
      try {
        localStorage.setItem(TOC_STORAGE_KEY, value);
      } catch (error) {
        // Ignore storage errors and keep in-memory state.
      }
    }

    function setTocOpen(isOpen) {
      document.body.classList.toggle("travel-toc-collapsed", !isOpen);
      toggleBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      panel.setAttribute("aria-hidden", isOpen ? "false" : "true");

      var labelNode = toggleBtn.querySelector(".travel-toc-toggle-label");
      if (labelNode) {
        labelNode.textContent = isOpen ? "隐藏目录" : "显示目录";
      }

      writeStoredTocState(isOpen ? "true" : "false");
    }

    var stored = readStoredTocState();
    if (stored === "true" || stored === "false") {
      setTocOpen(stored === "true");
    } else {
      // Default to open on mobile (< 900px), closed on desktop
      setTocOpen(window.innerWidth < 900);
    }

    toggleBtn.addEventListener("click", function () {
      var currentlyOpen = toggleBtn.getAttribute("aria-expanded") === "true";
      setTocOpen(!currentlyOpen);
      refreshTocState();
    });
  }

  function isTravelArticlePage() {
    return /^travel-/.test(page) && page !== "travel";
  }

  function mergeConfig(base, override) {
    var output = {};
    var key;
    override = override && typeof override === "object" ? override : {};

    for (key in base) {
      if (!Object.prototype.hasOwnProperty.call(base, key)) continue;
      if (
        base[key] &&
        typeof base[key] === "object" &&
        !Array.isArray(base[key]) &&
        override[key] &&
        typeof override[key] === "object" &&
        !Array.isArray(override[key])
      ) {
        output[key] = mergeConfig(base[key], override[key]);
      } else {
        output[key] = override[key] != null ? override[key] : base[key];
      }
    }

    for (key in override) {
      if (!Object.prototype.hasOwnProperty.call(override, key)) continue;
      if (!Object.prototype.hasOwnProperty.call(output, key)) {
        output[key] = override[key];
      }
    }

    return output;
  }

  function getTravelCommentsConfig() {
    var external = window.TRAVEL_COMMENTS_CONFIG;
    var userConfig = external && typeof external === "object" ? external : {};
    return mergeConfig(DEFAULT_TRAVEL_COMMENTS_CONFIG, userConfig);
  }

  function getTravelCommentsTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark_dimmed" : "light";
  }

  function setTravelCommentsMessage(container, message) {
    if (!container) return;
    container.innerHTML =
      '<div class="travel-comments-message">' +
        "<p>" + escapeHtml(message) + "</p>" +
      "</div>";
  }

  function ensureTravelCommentsMount() {
    var existingWaline = document.getElementById("travel-comments-waline");
    var existingGiscus = document.getElementById("travel-comments-giscus");
    if (existingWaline && existingGiscus) {
      return {
        waline: existingWaline,
        giscus: existingGiscus
      };
    }

    var section = document.createElement("section");
    section.className = "travel-comments";
    section.setAttribute("aria-label", "评论区");
    section.innerHTML =
      '<div class="travel-comments-head">' +
        '<p class="travel-comments-kicker">Comments</p>' +
        "<h2>欢迎留言交流</h2>" +
        '<div class="travel-comments-tabs" role="tablist" aria-label="评论方式">' +
          '<button type="button" class="travel-comments-tab is-active" data-comments-tab="waline" role="tab" aria-selected="true">快捷评论</button>' +
          '<button type="button" class="travel-comments-tab" data-comments-tab="giscus" role="tab" aria-selected="false">GitHub 评论</button>' +
        "</div>" +
      "</div>" +
      '<div class="travel-comments-panels">' +
        '<div class="waline-proxy-tip" id="waline-proxy-tip">' +
          '<span class="waline-proxy-tip-icon">ℹ️</span> 由于服务器部署在海外，中国大陆用户需开启代理才能正常使用评论功能。' +
        '</div>' +
        '<div class="travel-comments-thread is-active" id="travel-comments-waline" role="tabpanel"></div>' +
        '<div class="travel-comments-thread" id="travel-comments-giscus" role="tabpanel" hidden></div>' +
      "</div>";

    var anchor = document.querySelector(".japan-section--backlink, .nanjing-section--backlink, .travel-detail-backlink");
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(section, anchor);
      return {
        waline: document.getElementById("travel-comments-waline"),
        giscus: document.getElementById("travel-comments-giscus")
      };
    }

    var host = document.querySelector(".japan-rb-article, .nanjing-rb-article, main .section, main");
    if (!host) return null;
    host.appendChild(section);
    return {
      waline: document.getElementById("travel-comments-waline"),
      giscus: document.getElementById("travel-comments-giscus")
    };
  }

  function isConfiguredCommentsValue(value) {
    if (typeof value !== "string") return false;
    var trimmed = value.trim();
    if (!trimmed) return false;
    return trimmed.indexOf("YOUR_") !== 0;
  }

  function updateGiscusTheme() {
    var frame = document.querySelector("iframe.giscus-frame");
    if (!frame || !frame.contentWindow) return;

    frame.contentWindow.postMessage(
      { giscus: { setConfig: { theme: getTravelCommentsTheme() } } },
      "https://giscus.app"
    );
  }

  function initCommentTabs() {
    var tabButtons = document.querySelectorAll(".travel-comments-tab");
    if (!tabButtons.length) return;

    function setActiveTab(tab) {
      var walinePanel = document.getElementById("travel-comments-waline");
      var giscusPanel = document.getElementById("travel-comments-giscus");
      var proxyTip = document.getElementById("waline-proxy-tip");
      var isWaline = tab === "waline";

      for (var i = 0; i < tabButtons.length; i++) {
        var button = tabButtons[i];
        var active = button.getAttribute("data-comments-tab") === tab;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
      }

      if (walinePanel) {
        walinePanel.classList.toggle("is-active", isWaline);
        walinePanel.hidden = !isWaline;
      }

      if (giscusPanel) {
        giscusPanel.classList.toggle("is-active", !isWaline);
        giscusPanel.hidden = isWaline;
      }

      if (proxyTip) {
        proxyTip.hidden = !isWaline;
      }
    }

    for (var i = 0; i < tabButtons.length; i++) {
      tabButtons[i].addEventListener("click", function () {
        var tab = this.getAttribute("data-comments-tab");
        if (!tab) return;
        setActiveTab(tab);
      });
    }
  }

  function initWaline(walineMount, walineConfig) {
    if (!walineMount) return;
    if (!isConfiguredCommentsValue(walineConfig.serverURL) || walineConfig.serverURL.indexOf("YOUR-WALINE-SERVER") !== -1) {
      setTravelCommentsMessage(
        walineMount,
        "快捷评论尚未配置。请先部署 Waline 服务，并在 web/script.js 中填写 waline.serverURL。"
      );
      return;
    }

    var cssId = "waline-css";
    if (!document.getElementById(cssId)) {
      var css = document.createElement("link");
      css.id = cssId;
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/@waline/client@v3/dist/waline.css";
      document.head.appendChild(css);
    }

    if (!walineModulePromise) {
      walineModulePromise = import("https://unpkg.com/@waline/client@v3/dist/waline.js");
    }

    walineModulePromise.then(function (walineModule) {
      if (!walineModule || typeof walineModule.init !== "function") {
        setTravelCommentsMessage(walineMount, "Waline 加载失败，请稍后刷新重试。");
        return;
      }

      walineMount.innerHTML = "";
      if (walineInstance && typeof walineInstance.destroy === "function") {
        walineInstance.destroy();
      }

      walineInstance = walineModule.init({
        el: "#travel-comments-waline",
        serverURL: walineConfig.serverURL,
        lang: walineConfig.lang,
        requiredMeta: walineConfig.requiredMeta,
        login: walineConfig.login,
        dark: walineConfig.dark
      });
    }).catch(function () {
      setTravelCommentsMessage(walineMount, "Waline 脚本加载失败，请检查网络或稍后重试。");
    });
  }

  function initGiscus(giscusMount, giscusConfig) {
    if (!giscusMount) return;

    if (
      !isConfiguredCommentsValue(giscusConfig.repo) ||
      !isConfiguredCommentsValue(giscusConfig.repoId) ||
      !isConfiguredCommentsValue(giscusConfig.category) ||
      !isConfiguredCommentsValue(giscusConfig.categoryId)
    ) {
      setTravelCommentsMessage(giscusMount, "GitHub 评论配置缺失。");
      return;
    }

    giscusMount.innerHTML = "";
    var script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.setAttribute("crossorigin", "anonymous");
    script.setAttribute("data-repo", giscusConfig.repo);
    script.setAttribute("data-repo-id", giscusConfig.repoId);
    script.setAttribute("data-category", giscusConfig.category);
    script.setAttribute("data-category-id", giscusConfig.categoryId);
    script.setAttribute("data-mapping", giscusConfig.mapping);
    script.setAttribute("data-strict", giscusConfig.strict);
    script.setAttribute("data-reactions-enabled", giscusConfig.reactionsEnabled);
    script.setAttribute("data-emit-metadata", giscusConfig.emitMetadata);
    script.setAttribute("data-input-position", giscusConfig.inputPosition);
    script.setAttribute("data-theme", getTravelCommentsTheme());
    script.setAttribute("data-lang", giscusConfig.lang);
    script.setAttribute("data-loading", "lazy");
    script.setAttribute("data-travel-comments", "giscus");
    giscusMount.appendChild(script);
  }

  function initTravelComments() {
    if (!isTravelArticlePage()) return;

    var mounts = ensureTravelCommentsMount();
    if (!mounts) return;

    var commentsConfig = getTravelCommentsConfig();
    if (!commentsConfig.enabled) {
      setTravelCommentsMessage(mounts.waline, "评论区已关闭。");
      setTravelCommentsMessage(mounts.giscus, "评论区已关闭。");
      return;
    }

    initWaline(mounts.waline, commentsConfig.waline || {});
    initGiscus(mounts.giscus, commentsConfig.giscus || {});
    initCommentTabs();

    var observer = new MutationObserver(function () {
      updateGiscusTheme();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"]
    });

    if ((commentsConfig.primaryProvider || "").toLowerCase() === "giscus") {
      var giscusTab = document.querySelector('.travel-comments-tab[data-comments-tab="giscus"]');
      if (giscusTab) giscusTab.click();
    }
  }

  async function loadContentData() {
    if (!contentUrl) return null;

    try {
      var response = await fetch(contentUrl);
      if (!response.ok) {
        throw new Error("Failed to load content data");
      }
      return await response.json();
    } catch (error) {
      console.warn("Content data not loaded:", error);
      return null;
    }
  }

  async function bootstrap() {
    var data = await loadContentData();

    if (data) {
      if (page === "home") renderHome(data);
      if (page === "photography") renderPhotography(data);
      if (page === "hobby") renderHobby(data);
      if (page === "travel") renderTravel(data);
      if (page === "travel-detail") renderTravelDetail(data);
      if (page === "contact") renderContact(data);
    }

    initPhotoLightbox();
    initContactForm();
    initTravelStoryToc();
    initTravelComments();
  }

  bootstrap();
})();
