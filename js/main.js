/**
 * More Than Just Subs — Island Site Runtime
 * Pure vanilla HTML/CSS/JS runtime converting Arena design.
 */
(() => {
  "use strict";

  const ICONS = {
    arrow: '<path d="M3 12h17m-6-6 6 6-6 6"/>',
    diagonal: '<path d="M5 19 19 5M6 5h13v13"/>',
    pin: '<path d="M19.5 10c0 5.3-7.5 11-7.5 11S4.5 15.3 4.5 10a7.5 7.5 0 0 1 15 0Z"/><circle cx="12" cy="10" r="2.7"/>',
    close: '<path d="m5 5 14 14M19 5 5 19"/>',
    hamburger: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
    call: '<path d="m5 3 4-1 2 6-3 2c1 3 3 5 6 6l2-3 6 2-1 4c-.4 2-2.5 3-4.5 2.5C9 19.7 4.2 15 2.5 7.5 2 5.5 3 3.5 5 3Z"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".7" fill="currentColor" stroke="none"/>',
    facebook: '<path d="M14 21v-8h3l.6-3.5H14V7.3c0-1.1.5-1.8 1.8-1.8H18v-3c-.7-.2-1.8-.3-2.9-.3-3.2 0-5.1 1.9-5.1 5.2v2.1H7V13h3v8"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
    plus: '<path d="M12 4v16M4 12h16"/>',
    minus: '<path d="M4 12h16"/>',
    star: '<path d="m12 2.6 2.9 6.1 6.7.9-4.9 4.6 1.2 6.6L12 17.6l-5.9 3.2 1.2-6.6L2.4 9.6l6.7-.9z"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'
  };

  const MTJS = {
    content: null,

    rootPath() {
      return window.location.pathname.includes("/locations/") ? "../" : "./";
    },

    resolve(url) {
      if (!url || url.startsWith("http") || url.startsWith("data:")) return url;
      return this.rootPath() + url.replace(/^\.\//, "");
    },

    link(target) {
      const isSub = window.location.pathname.includes("/locations/");
      const [base, q] = target.split("?");
      const qs = q ? "?" + q : "";
      if (base === "/" || base === "") return isSub ? "../index.html" : "./index.html";
      if (base.startsWith("/locations/")) {
        const slug = base.replace("/locations/", "");
        return isSub ? `./${slug}.html${qs}` : `./locations/${slug}.html${qs}`;
      }
      const name = base.replace(/^\//, "");
      const prefix = isSub ? "../" : "./";
      return `${prefix}${name}.html${qs}`;
    },

    pad(n) {
      return String(n).padStart(2, "0");
    },

    icon(name, size = 18) {
      const d = ICONS[name] || "";
      return `<svg class="icon icon-${name}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
    },

    esc(t) {
      if (t == null) return "";
      return String(t)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    },

    async loadContent() {
      try {
        const res = await fetch(this.rootPath() + "content.json", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load content.json");
        this.content = await res.json();
      } catch (err) {
        console.error("MTJS: content.json failed", err);
        this.content = {};
      }
    },

    renderWordmark() {
      const brand = (this.content && this.content.brand) || {};
      if (brand.logoUrl && brand.logoUrl.trim()) {
        return `
          <span class="site-wordmark-wrap" style="display:inline-flex;align-items:center;gap:12px;">
            <img src="${this.resolve(brand.logoUrl.trim())}" alt="${this.esc(brand.siteName || "More Than Just Subs")}" class="site-logo-img" />
          </span>
        `;
      }
      return `
        <span class="site-wordmark" aria-label="More Than Just Subs">
          <span>MORE THAN</span>
          <strong>JUST SUBS</strong>
        </span>
      `;
    },

    renderHeader(activePage) {
      const c = this.content || {};
      const nav = c.navigation || [];
      const linksHtml = nav.map((p) => {
        const isCur = p.id === activePage;
        return `<a href="${this.link(p.path)}" class="${isCur ? "current" : ""}" ${isCur ? 'aria-current="page"' : ""}>${this.esc(p.id === 'about' ? 'About' : p.title)}</a>`;
      }).join("");

      return `
        <header class="site-header">
          <a href="${this.link("/")}" class="wordmark-link" aria-label="More Than Just Subs home">
            ${this.renderWordmark()}
          </a>
          <nav class="site-navigation" aria-label="Website navigation">
            ${linksHtml}
          </nav>
          <button type="button" class="order-placeholder" disabled aria-label="Order online, coming soon" title="Online ordering is coming soon">
            ${this.icon("clock", 13)}
            <span>Order online</span>
            <span class="soon-tag">Soon</span>
          </button>
          <button type="button" class="site-menu-toggle" aria-label="Open website menu" aria-expanded="false">
            ${this.icon("hamburger", 21)}
          </button>
          <nav class="mobile-site-navigation" aria-label="Mobile website navigation">
            ${nav.map((p) => `
              <a href="${this.link(p.path)}" ${p.id === activePage ? 'aria-current="page"' : ''}>
                ${this.esc(p.title)}
                ${this.icon("arrow", 15)}
              </a>
            `).join("")}
            <span>
              ${this.icon("clock", 14)}
              Online ordering coming soon
            </span>
          </nav>
        </header>
      `;
    },

    renderFooter() {
      const c = this.content || {};
      const brand = c.brand || {};
      return `
        <footer class="site-footer">
          <div class="footer-top">
            <div class="footer-brand">
              <a href="${this.link("/")}" aria-label="More Than Just Subs home">
                ${this.renderWordmark()}
              </a>
              <p>${this.esc(brand.tagline || "London-born. Since 2001.")}</p>
              <div class="social-links">
                <a href="${this.esc(brand.instagram || "https://www.instagram.com/morethanjustsubs_")}" target="_blank" rel="noreferrer" aria-label="Instagram">
                  ${this.icon("instagram", 17)}
                </a>
                <a href="${this.esc(brand.facebook || "https://www.facebook.com/share/1HSKiRsTS9/")}" target="_blank" rel="noreferrer" aria-label="Facebook">
                  ${this.icon("facebook", 17)}
                </a>
              </div>
            </div>
            <div class="footer-column">
              <span class="footer-heading">Explore</span>
              <a href="${this.link("/about")}">About us</a>
              <a href="${this.link("/our-bread")}">Our bread</a>
              <a href="${this.link("/menu")}">Menu</a>
              <a href="${this.link("/locations")}">Locations</a>
            </div>
            <div class="footer-column">
              <span class="footer-heading">Get in touch</span>
              <a href="${this.link("/contact")}">Contact</a>
              <a href="${this.link("/careers")}">Careers</a>
              <a href="mailto:${this.esc(brand.email || "info@morethanjustsubs.co.uk")}">${this.esc(brand.email || "info@morethanjustsubs.co.uk")}</a>
              <a href="tel:${this.esc(brand.phone || "+44 7340 751433")}">${this.esc(brand.phone || "+44 7340 751433")}</a>
            </div>
          </div>
          <div class="footer-bottom">
            <span>${this.esc(brand.copyright || "© 2026 More Than Just Subs")}</span>
            <span class="footer-since">Serving South Kensington since 2001</span>
            <div>
              <a href="${this.link("/privacy")}">Privacy policy</a>
              <a href="${this.link("/terms")}">Terms of use</a>
            </div>
          </div>
        </footer>
      `;
    },

    renderPageIntro(label, title, description, photoUrl, photoAlt) {
      const hasPhoto = Boolean(photoUrl);
      return `
        <section id="introduction" class="page-intro ${hasPhoto ? 'with-photo' : ''}">
          <div class="page-intro-copy">
            <span class="eyebrow eyebrow-light">${this.esc(label)}</span>
            <h1>${this.esc(title)}</h1>
            <p>${this.esc(description)}</p>
          </div>
          ${hasPhoto ? `
            <figure class="photo-frame intro-photo">
              <img src="${this.resolve(photoUrl)}" alt="${this.esc(photoAlt || label)}" loading="eager" />
              <span class="registration-marks" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
            </figure>
          ` : ''}
        </section>
      `;
    },

    renderHome() {
      const c = this.content || {};
      const hero = c.hero || {};
      const facts = hero.facts || [];
      const range = c.range || [];
      const story = c.story || {};
      const locs = c.locations || [];

      return `
        <section id="introduction" class="home-hero">
          <div class="hero-copy">
            <span class="eyebrow eyebrow-light">${this.esc(hero.eyebrow || "London · Since 2001")}</span>
            <h1>
              ${this.esc(hero.headline1 || "More Than")}<br />
              <span class="accent">${this.esc(hero.headline2 || "Just Subs.")}</span>
            </h1>
            <p>${this.esc(hero.body || "Signature subs, artisan bread, and barista coffee. A London original since 2001.")}</p>
            <div class="button-group">
              <a href="${this.link("/menu")}" class="button button-primary">
                View menu
                ${this.icon("arrow", 16)}
              </a>
              <a href="${this.link("/locations")}" class="button button-ghost">
                ${this.icon("pin", 15)}
                Find us
              </a>
            </div>
          </div>
          <div class="hero-visual">
            <figure class="photo-frame hero-photo">
              <img src="${this.resolve(hero.heroPhoto || "images/photos/chicken-melt.webp")}" alt="${this.esc(hero.heroPhotoAlt || "Caesar Chicken Melt")}" fetchpriority="high" />
              <span class="registration-marks" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
            </figure>
            <a href="${this.link("/menu")}" class="hero-badge">
              <span class="badge-kicker">${this.esc(hero.badgeLabel || "Our best seller")}</span>
              <strong>${this.esc(hero.badgeName || "Caesar Chicken Melt")}</strong>
              ${this.icon("arrow", 15)}
            </a>
          </div>
          <ul class="hero-facts" aria-label="At a glance">
            ${facts.map((f) => `
              <li>
                <strong>${this.esc(f.value)}</strong>
                <span>${this.esc(f.label)}</span>
              </li>
            `).join("")}
          </ul>
        </section>

        <section id="range" class="content-section menu-preview">
          <div class="section-heading">
            <div>
              <span class="eyebrow">Our menu</span>
              <h2>Explore the menu</h2>
            </div>
            <a href="${this.link("/menu")}" class="text-link">
              <span>Full menu</span>
              ${this.icon("arrow", 15)}
            </a>
          </div>
          <div class="range-grid">
            ${range.map((item) => `
              <a class="range-item" href="${this.link(item.path || "/menu")}">
                <div class="range-photo">
                  <img src="${this.resolve(item.photo)}" alt="${this.esc(item.name)}" loading="lazy" />
                  <span class="range-tag">${this.esc(item.tag)}</span>
                </div>
                <div class="range-title">
                  <h3>${this.esc(item.name)}</h3>
                  <span class="round-arrow">${this.icon("diagonal", 15)}</span>
                </div>
                <p>${this.esc(item.description)}</p>
              </a>
            `).join("")}
          </div>
          <div class="daily-offer">
            <span class="offer-kicker">In store</span>
            <strong>Deal of the day</strong>
            <span>Today’s featured favourite at a special price. Ask the team in store.</span>
            <a href="${this.link("/locations")}" class="offer-link">
              Find a shop
              ${this.icon("arrow", 15)}
            </a>
          </div>
        </section>

        <section id="story" class="content-section story-preview">
          <div class="reveal reveal-photo-left">
            <figure class="photo-frame story-photo">
              <img src="${this.resolve(story.photo || "images/photos/assembly.webp")}" alt="${this.esc(story.photoAlt || "Making subs")}" loading="lazy" />
              <span class="registration-marks" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
            </figure>
          </div>
          <div class="reveal reveal-from-right">
            <div class="story-copy">
              <span class="eyebrow">${this.esc(story.eyebrow || "Our story")}</span>
              <h2>${this.esc(story.heading || "Rooted in London.")}</h2>
              <p>${this.esc(story.body || "From our original South Kensington shop to a family-run sub business. Get to know the people behind More Than Just Subs.")}</p>
              <a href="${this.link("/about")}" class="text-link">
                <span>About us</span>
                ${this.icon("arrow", 15)}
              </a>
            </div>
          </div>
        </section>

        ${this.renderReviewsSection()}

        <section id="places" class="content-section places">
          <div class="section-heading">
            <div>
              <span class="eyebrow">Visit us</span>
              <h2>Find us in London</h2>
            </div>
            <a href="${this.link("/locations")}" class="text-link">
              <span>All locations</span>
              ${this.icon("arrow", 15)}
            </a>
          </div>
          <div class="location-rows">
            ${locs.map((shop, i) => `
              <a href="${this.link(`/locations/${shop.slug}`)}">
                <img class="row-thumb" src="${this.resolve(shop.photo)}" alt="${this.esc(shop.name)}" loading="lazy" />
                <span class="row-index">${this.pad(i + 1)}</span>
                <div class="row-text">
                  <h3>${this.esc(shop.name)}</h3>
                  <span>${this.esc(shop.description)}</span>
                </div>
                <span class="round-arrow">${this.icon("arrow", 17)}</span>
              </a>
            `).join("")}
          </div>
        </section>
      `;
    },

    renderReviewsSection() {
      const rev = (this.content && this.content.reviews) || {};
      const items = rev.items || [];
      const summary = rev.summary || {};
      const googleUrl = rev.googleUrl || "https://www.google.com/maps/search/More+Than+Just+Subs+London";

      const googleBtn = `
        <a class="button button-outline" href="${this.esc(googleUrl)}" target="_blank" rel="noreferrer">
          <svg class="google-mark" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path fill="#4285f4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.6c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.3-2.1 3.6-5.1 3.6-8.6z"/>
            <path fill="#34a853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-6-2.1-6.9-5.1l-3.9 3C3 21.3 7.2 24 12 24z"/>
            <path fill="#fbbc05" d="M5.1 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3l-3.9-3C.4 8.3 0 10.1 0 12s.4 3.7 1.2 5.3l3.9-3z"/>
            <path fill="#ea4335" d="M12 4.7c1.8 0 3.1.8 3.8 1.5l3.4-3.3C17.1 1.1 15.2 0 12 0 7.2 0 3 2.7 1.2 6.7l3.9 3c.9-3 3.7-5 6.9-5z"/>
          </svg>
          Review us on Google
          ${this.icon("diagonal", 14)}
        </a>
      `;

      return `
        <section id="reviews" class="content-section reviews-section">
          <div class="section-heading">
            <div>
              <span class="eyebrow">Reviews</span>
              <h2>What our customers say</h2>
            </div>
            ${summary.average ? `
              <div class="review-summary" style="display:flex;align-items:center;gap:12px;">
                <strong style="font-family:var(--display);font-size:32px;color:var(--orange);">${Number(summary.average).toFixed(1)}</strong>
                <span style="font-size:14px;color:var(--muted);">${this.esc(summary.count || '')} Google reviews</span>
              </div>
            ` : ''}
          </div>

          ${items.length > 0 ? `
            <div class="review-grid">
              ${items.map((r, i) => {
                const initial = (r.name || "C").trim().charAt(0).toUpperCase();
                const stars = "★".repeat(r.rating || 5);
                return `
                  <div class="review-cell reveal" style="transition-delay: ${(i % 3) * 90}ms">
                    <article class="review-card">
                      <div class="review-head">
                        <span class="review-avatar">${this.esc(initial)}</span>
                        <div class="review-who">
                          <strong>${this.esc(r.name)}</strong>
                          <span>${this.esc([r.shop, r.date].filter(Boolean).join(" · "))}</span>
                        </div>
                      </div>
                      <div class="stars" style="color:var(--orange);font-size:16px;">${stars}</div>
                      <p>${this.esc(r.text)}</p>
                    </article>
                  </div>
                `;
              }).join("")}
            </div>
            <div class="review-footer">${googleBtn}</div>
          ` : `
            <div class="reviews-empty">
              <div class="reviews-empty-stars">
                ${Array(5).fill(this.icon("star", 26)).join("")}
              </div>
              <h3>Customer reviews coming soon</h3>
              <p>We collect feedback from customers on Google Maps. Reviews from our South Kensington and Hounslow shops will appear here.</p>
              ${googleBtn}
            </div>
          `}
        </section>
      `;
    },

    renderAbout() {
      const a = (this.content && this.content.about) || {};
      const timeline = a.timeline || [];
      const ops = a.operations || [];

      return `
        ${this.renderPageIntro("About us", "Our story.", a.intro || "A family-run London food brand, built on fresh bread, made-to-order subs, and a loyal local following.", a.photo, a.photoAlt)}

        <section id="heritage" class="content-section">
          <div class="reveal">
            <span class="eyebrow">Our heritage</span>
            <h2>From South Kensington</h2>
          </div>
          <div class="heritage-layout">
            <div class="reveal reveal-photo-left">
              <figure class="photo-frame heritage-photo">
                <img src="${this.resolve(a.heritagePhoto || "images/photos/counter.webp")}" alt="${this.esc(a.heritagePhotoAlt || "Counter")}" loading="lazy" />
                <span class="registration-marks" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
              </figure>
            </div>
            <div class="timeline">
              ${timeline.map((item, idx) => `
                <div class="reveal" style="transition-delay: ${idx * 80}ms">
                  <span class="timeline-year">${this.esc(item.era)}</span>
                  <h3>${this.esc(item.title)}</h3>
                  <p>${this.esc(item.text)}</p>
                </div>
              `).join("")}
            </div>
          </div>
        </section>

        <section id="operations" class="content-section muted-section">
          <div class="reveal">
            <span class="eyebrow">Operations</span>
            <h2>How we operate</h2>
          </div>
          <div class="editorial-columns">
            ${ops.map((item, idx) => `
              <div class="reveal" style="transition-delay: ${idx * 120}ms">
                <div class="feature-card">
                  <span class="feature-icon">${this.icon(idx === 0 ? "layers" : "grid", 20)}</span>
                  <h3>${this.esc(item.title)}</h3>
                  <p>${this.esc(item.text)}</p>
                </div>
              </div>
            `).join("")}
          </div>
          <a href="${this.link("/our-bread")}" class="text-link">
            <span>Meet our bread</span>
            ${this.icon("arrow", 15)}
          </a>
        </section>
      `;
    },

    renderBread() {
      const b = (this.content && this.content.bread) || {};
      const types = (this.content && this.content.breadTypes) || [];

      return `
        ${this.renderPageIntro("Our bread", "Our artisan sourdough.", b.intro || "Baked fresh daily by our specialist bakery partner, using a recipe made just for us.", b.photo, b.photoAlt)}

        <section id="breads" class="content-section">
          <div class="reveal">
            <span class="eyebrow">Bread selection</span>
            <h2>Four signature breads</h2>
          </div>
          <div class="bread-list">
            ${types.map((bread, i) => `
              <div class="reveal" style="transition-delay: ${(i % 2) * 110}ms">
                <div>
                  <span class="bread-swatch" style="background: ${this.esc(bread.swatch || "#3b3a2c")}"></span>
                  <span class="row-index">${this.pad(i + 1)}</span>
                  <h3>${this.esc(bread.name)}</h3>
                  <span class="bread-note">Artisan sourdough</span>
                </div>
              </div>
            `).join("")}
          </div>
        </section>

        <section id="bakery" class="content-section muted-section bakery">
          <div class="reveal">
            <span class="eyebrow">Bakery partner</span>
            <h2>A recipe of our own</h2>
          </div>
          <p class="prose">${this.esc(b.bakeryText || "Our proprietary sourdough recipe is made under agreement with a specialist bakery partner. Fresh bread is the starting point for every sub.")}</p>
          <p class="tagline">${this.esc(b.tagline || "Fresh bread. Better taste.")}</p>
          <a href="${this.link("/menu")}" class="text-link">
            <span>Explore the subs</span>
            ${this.icon("arrow", 15)}
          </a>
        </section>
      `;
    },

    renderMenu() {
      const isDrinks = new URLSearchParams(window.location.search).get("category") === "drinks";
      const subs = (this.content && this.content.subs) || [];
      const drinks = (this.content && this.content.drinks) || [];
      const list = isDrinks ? drinks : subs;
      const deals = (this.content && this.content.mealDeals) || [];
      const photos = (this.content && this.content.menuPhotos) || {};

      const introPhoto = isDrinks ? "images/photos/latte.webp" : "images/photos/subs-overhead.webp";

      return `
        ${this.renderPageIntro("Our menu", "On the menu.", "Signature subs, freshly baked sourdough, and a barista-made drinks range.", introPhoto, isDrinks ? "Coffee and drinks" : "Signature subs")}

        <section id="menu-list" class="content-section">
          <div class="category-tabs" aria-label="Menu categories">
            <a href="${this.link("/menu")}" class="${!isDrinks ? 'selected' : ''}">
              Signature subs <span>${this.pad(subs.length)}</span>
            </a>
            <a href="${this.link("/menu?category=drinks")}" class="${isDrinks ? 'selected' : ''}">
              Coffee &amp; matcha <span>${this.pad(drinks.length)}</span>
            </a>
          </div>

          ${!isDrinks ? `
            <div class="halal-banner">
              <span class="halal-badge-seal">100%<br>HALAL</span>
              <div>
                <strong>100% Halal Certified Meats</strong>
                <p>All chicken, steak, and meat toppings served at More Than Just Subs are 100% Halal certified. Freshly assembled to order on daily artisan sourdough.</p>
              </div>
            </div>
          ` : ''}

          <div class="menu-list">
            ${list.map((item, idx) => {
              const photoUrl = photos[item] || (isDrinks ? "images/photos/latte.webp" : "images/photos/chicken-melt.webp");
              return `
                <div class="menu-list-entry" data-item="${this.esc(item)}">
                  <button type="button" aria-expanded="false" aria-controls="item-detail-${idx}">
                    <span class="row-index">${this.pad(idx + 1)}</span>
                    <span class="menu-item-name">${this.esc(item)}</span>
                    ${!isDrinks && idx === 0 ? '<span class="best-seller">Best seller</span>' : ''}
                    <span class="toggle-icon">${this.icon("plus", 16)}</span>
                  </button>
                  <div id="item-detail-${idx}" class="item-detail" style="display:none;">
                    <img src="${this.resolve(photoUrl)}" alt="${this.esc(item)}" loading="lazy" />
                    <div>
                      <span class="detail-kicker">${isDrinks ? 'Barista drinks' : 'Signature sub'}</span>
                      <h3>${this.esc(item)}</h3>
                      <p>${isDrinks ? 'Part of our in-store barista range. Ask the team about milk options and ingredients.' : 'Made to order on your choice of artisan sourdough. Ask the team about ingredients and allergens.'}</p>
                      <a href="${this.link(isDrinks ? '/locations' : '/our-bread')}" class="text-link">
                        <span>${isDrinks ? 'Find a shop' : 'See our breads'}</span>
                        ${this.icon("arrow", 15)}
                      </a>
                    </div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </section>

        <section id="meal-deals" class="content-section muted-section">
          <div class="reveal">
            <div class="deal-card">
              <div>
                <span class="eyebrow eyebrow-light">Meal deals</span>
                <h2>Make it a meal</h2>
                <p>Add chips and a drink to any 6-inch sub.</p>
              </div>
              <div class="price-list">
                ${deals.map((d) => `
                  <div>
                    <span>${this.esc(d.label)}</span>
                    <strong>${this.esc(d.price)}</strong>
                  </div>
                `).join("")}
              </div>
            </div>
          </div>
          <p class="subtle-note">Prices from our current brochure. Please confirm the range and pricing in store.</p>
        </section>
      `;
    },

    renderLocations() {
      const locs = (this.content && this.content.locations) || [];

      return `
        ${this.renderPageIntro("Locations", "Our London shops.", "Find More Than Just Subs in South Kensington and Hounslow.")}

        <section id="shop-list" class="content-section">
          <div class="reveal">
            <span class="eyebrow">Shop directory</span>
            <h2>Our locations</h2>
          </div>
          <div class="shop-grid">
            ${locs.map((shop, i) => `
              <div class="reveal" style="transition-delay: ${i * 130}ms">
                <article class="shop-entry">
                  <a href="${this.link(`/locations/${shop.slug}`)}" class="shop-photo">
                    <img src="${this.resolve(shop.photo)}" alt="${this.esc(shop.name)}" loading="lazy" />
                    <span class="shop-number">${this.pad(i + 1)}</span>
                  </a>
                  <span class="shop-kicker">Location ${this.pad(i + 1)} · ${this.esc(shop.hours || "7:00 AM – 7:00 PM")}</span>
                  <h3>${this.esc(shop.name)}</h3>
                  <div style="font-size:13px;color:var(--muted);margin:4px 0 8px;">📍 ${this.esc(shop.address || "")}</div>
                  <p>${this.esc(shop.description)}</p>
                  <a href="${this.link(`/locations/${shop.slug}`)}" class="text-link">
                    <span>Location details</span>
                    ${this.icon("arrow", 15)}
                  </a>
                </article>
              </div>
            `).join("")}
          </div>
        </section>
      `;
    },

    renderLocationDetail(slug) {
      const locs = (this.content && this.content.locations) || [];
      const shop = locs.find((l) => l.slug === slug) || locs[0] || {};
      const brand = (this.content && this.content.brand) || {};

      const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      let todayName = "";
      try {
        todayName = new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(new Date());
      } catch {
        todayName = "Monday";
      }

      const timetable = shop.timetable || {};
      const timetableRows = days.map((day) => {
        const item = timetable[day] || { open: "7:00 AM", close: "7:00 PM", closed: false };
        const isToday = day.toLowerCase() === todayName.toLowerCase();
        const timeDisplay = item.closed ? "Closed" : `${item.open || "7:00 AM"} – ${item.close || "7:00 PM"}`;
        return `
          <li class="timetable-row ${isToday ? "is-today" : ""}">
            <span><strong>${day}</strong> ${isToday ? '<span class="today-tag">Today</span>' : ''}</span>
            <span>${timeDisplay}</span>
          </li>
        `;
      }).join("");

      const serviceOptions = shop.serviceOptions || ["Dine-in", "Takeout", "Delivery"];

      return `
        ${this.renderPageIntro("Shop profile", `${shop.name || "Location"}.`, shop.detail || "", shop.photo, shop.photoAlt)}

        <section id="visit" class="content-section">
          <div class="reveal">
            <div class="section-heading">
              <div>
                <span class="eyebrow">Visit us</span>
                <h2>Plan your visit</h2>
                ${shop.rating ? `
                  <div class="shop-rating-pill">★ ${shop.rating} (${shop.reviewCount || 323} Google reviews) · ${this.esc(shop.priceRange || "£10–20 per person")}</div>
                ` : ''}
              </div>
              <a href="${this.link("/locations")}" class="text-link">
                <span>All locations</span>
                ${this.icon("arrow", 15)}
              </a>
            </div>
          </div>

          <div class="visit-grid">
            <div class="map-block">
              ${shop.mapEmbedUrl ? `
                <iframe src="${this.esc(shop.mapEmbedUrl)}" title="${this.esc(shop.name)} map" allowfullscreen="" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>
              ` : `
                <div style="background:var(--sand);height:100%;min-height:320px;border-radius:22px;display:grid;place-items:center;color:var(--muted);font-weight:700;">
                  Map coming soon
                </div>
              `}
              ${shop.mapUrl ? `
                <a href="${this.esc(shop.mapUrl)}" target="_blank" rel="noopener noreferrer" class="map-open-link">
                  ${this.icon("pin", 14)}
                  <span>Open in Google Maps</span>
                </a>
              ` : ''}
            </div>

            <dl class="visit-details">
              <div>
                <dt>Area &amp; Neighborhood</dt>
                <dd>${this.esc(shop.name || "")}, London</dd>
                ${shop.plusCode ? `<div style="font:600 11px var(--mono);color:var(--muted);margin-top:3px;">Plus code: ${this.esc(shop.plusCode)}</div>` : ''}
              </div>
              <div>
                <dt>Street Address</dt>
                <dd>${this.esc(shop.address || "To be confirmed")}</dd>
              </div>
              <div>
                <dt>Shop Phone</dt>
                <dd><a href="tel:${this.esc(shop.phone || brand.phone || "+442075893134")}">${this.esc(shop.phone || brand.phone || "+44 20 7589 3134")}</a></dd>
              </div>
              <div>
                <dt>Service Options</dt>
                <dd>
                  <div class="service-pills">
                    ${serviceOptions.map((opt) => `<span class="service-pill">${this.esc(opt)}</span>`).join("")}
                  </div>
                </dd>
              </div>
              <div>
                <dt>Weekly Opening Timetable</dt>
                <dd>
                  <ul class="timetable-list">
                    ${timetableRows}
                  </ul>
                </dd>
              </div>
              <div>
                <dt>Shop Enquiries</dt>
                <dd><a href="mailto:${this.esc(brand.email || "info@morethanjustsubs.co.uk")}">${this.esc(brand.email || "info@morethanjustsubs.co.uk")}</a></dd>
              </div>
            </dl>
          </div>

          <div style="margin-top:28px;">
            <a href="${this.link("/contact")}" class="button button-primary">
              Contact the team
              ${this.icon("arrow", 15)}
            </a>
          </div>
        </section>
      `;
    },

    renderContact(isCareers = false) {
      const c = this.content || {};
      const brand = c.brand || {};
      const careerIntro = (c.careers && c.careers.intro) || "Introduce yourself to the More Than Just Subs team in South Kensington or Hounslow.";
      const contactIntro = (c.contact && c.contact.intro) || "For menu questions, shop information, or business enquiries, contact our team.";

      return `
        ${this.renderPageIntro(
          isCareers ? "Careers" : "Contact",
          isCareers ? "Work with us." : "Get in touch.",
          isCareers ? careerIntro : contactIntro,
          isCareers ? (c.careers && c.careers.photo) : undefined,
          isCareers ? (c.careers && c.careers.photoAlt) : undefined
        )}

        <section id="enquiry" class="content-section enquiry-section">
          <div class="reveal">
            <span class="eyebrow">${isCareers ? "Careers" : "Enquiries"}</span>
            <h2>${isCareers ? "Introduce yourself" : "Send an enquiry"}</h2>
          </div>
          <p class="form-intro">${isCareers ? "Tell us about your experience and your preferred location. This is a general expression of interest, not a listed vacancy." : "Fill in the details below to prepare an email to our team."}</p>

          <form id="enquiry-form" class="enquiry-form">
            <div class="field-pair">
              <label>
                Your name
                <input name="name" required maxlength="100" placeholder="Full name" />
              </label>
              <label>
                Email address
                <input type="email" name="email" required maxlength="180" placeholder="you@example.com" />
              </label>
            </div>
            <label>
              ${isCareers ? "Preferred location" : "Enquiry type"}
              <select name="subject">
                ${isCareers ? `
                  <option value="Career enquiry: Either location">Either location</option>
                  <option value="Career enquiry: South Kensington">South Kensington</option>
                  <option value="Career enquiry: Hounslow">Hounslow</option>
                ` : `
                  <option value="General enquiry">General enquiry</option>
                  <option value="Menu enquiry">Menu enquiry</option>
                  <option value="Shop enquiry">Shop enquiry</option>
                  <option value="Business enquiry">Business enquiry</option>
                `}
              </select>
            </label>
            <label>
              ${isCareers ? "Tell us about yourself" : "Your message"}
              <textarea name="message" required minlength="5" maxlength="3000" rows="5" placeholder="${isCareers ? 'Your experience, availability, and the work you are interested in...' : 'How can we help?'}"></textarea>
            </label>
            <div class="form-action">
              <button class="button button-primary" type="submit">
                Prepare email
                ${this.icon("arrow", 15)}
              </button>
              <span class="form-hint">Creates a draft email preview.</span>
            </div>
          </form>

          <div id="draft-container"></div>
        </section>

        ${!isCareers ? `
          <section id="contact-details" class="content-section muted-section">
            <div class="reveal">
              <span class="eyebrow">Contact details</span>
              <h2>Talk to the team</h2>
            </div>
            <div class="contact-list">
              <a href="mailto:${this.esc(brand.email || "info@morethanjustsubs.co.uk")}">
                <span class="contact-icon">${this.icon("mail", 18)}</span>
                <span>
                  <small>Email</small>
                  ${this.esc(brand.email || "info@morethanjustsubs.co.uk")}
                </span>
              </a>
              <a href="tel:${this.esc(brand.phone || "+447340751433")}">
                <span class="contact-icon">${this.icon("call", 17)}</span>
                <span>
                  <small>Phone</small>
                  ${this.esc(brand.phone || "+44 7340 751433")}
                </span>
              </a>
              <a href="${this.link("/locations")}">
                <span class="contact-icon">${this.icon("pin", 18)}</span>
                <span>
                  <small>Shops</small>
                  South Kensington &amp; Hounslow
                </span>
              </a>
            </div>
          </section>
        ` : ''}
      `;
    },

    renderLegal(title) {
      const isPrivacy = title === "Privacy policy";
      const headings = isPrivacy
        ? ["Who we are", "Information we collect", "How information is used", "Cookies and your choices", "Your rights and contact details"]
        : ["About this website", "Using the website", "Menu and pricing information", "Third-party links", "Contact details"];

      return `
        ${this.renderPageIntro("Supporting page", `${title}.`, "Document structure for review. The final approved legal text will be added before launch.")}

        <section class="content-section legal-content">
          <span class="eyebrow">Draft outline</span>
          ${headings.map((h, i) => `
            <div class="legal-section">
              <span class="row-index">${this.pad(i + 1)}</span>
              <div>
                <h3>${this.esc(h)}</h3>
                <p>Approved ${isPrivacy ? 'privacy' : 'terms'} text to be supplied.</p>
              </div>
            </div>
          `).join("")}
          <a href="${this.link("/contact")}" class="text-link">
            <span>Contact the team</span>
            ${this.icon("arrow", 15)}
          </a>
        </section>
      `;
    },

    initReveal() {
      const nodes = document.querySelectorAll(".reveal");
      if (!nodes.length) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce || !("IntersectionObserver" in window)) {
        nodes.forEach((n) => n.classList.add("reveal-in"));
        return;
      }
      requestAnimationFrame(() => nodes.forEach((n) => n.classList.add("reveal-ready")));
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("reveal-in");
            obs.unobserve(e.target);
          }
        });
      }, { rootMargin: "0px 0px -5% 0px", threshold: 0.05 });
      nodes.forEach((n) => obs.observe(n));
    },

    initMobileNav() {
      const btn = document.querySelector(".site-menu-toggle");
      const nav = document.querySelector(".mobile-site-navigation");
      if (!btn || !nav) return;
      btn.addEventListener("click", () => {
        const open = nav.style.display === "flex";
        nav.style.display = open ? "none" : "flex";
        btn.setAttribute("aria-expanded", String(!open));
        btn.innerHTML = open ? this.icon("hamburger", 21) : this.icon("close", 21);
      });
    },

    initMenuAccordion() {
      const entries = document.querySelectorAll(".menu-list-entry");
      entries.forEach((entry) => {
        const btn = entry.querySelector("button");
        const detail = entry.querySelector(".item-detail");
        const iconSpan = entry.querySelector(".toggle-icon");
        if (!btn || !detail) return;
        btn.addEventListener("click", () => {
          const open = btn.getAttribute("aria-expanded") === "true";
          btn.setAttribute("aria-expanded", String(!open));
          detail.style.display = open ? "none" : "grid";
          if (iconSpan) iconSpan.innerHTML = open ? this.icon("plus", 16) : this.icon("minus", 16);
        });
      });
    },

    initContactForm() {
      const form = document.getElementById("enquiry-form");
      const container = document.getElementById("draft-container");
      if (!form || !container) return;

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const data = new FormData(form);
        const name = (data.get("name") || "").trim();
        const email = (data.get("email") || "").trim();
        const subject = (data.get("subject") || "Enquiry").trim();
        const message = (data.get("message") || "").trim();
        const brandEmail = (this.content && this.content.brand && this.content.brand.email) || "info@morethanjustsubs.co.uk";

        const body = `Hello More Than Just Subs,\n\n${message}\n\n${name}\n${email}`;
        const mailto = `mailto:${encodeURIComponent(brandEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        form.style.display = "none";
        container.innerHTML = `
          <div class="draft-preview" aria-live="polite">
            <div class="draft-icon">${this.icon("mail", 24)}</div>
            <h3>Your email draft is ready.</h3>
            <p>Review your message, then open it in your email app to send. Nothing has been sent yet.</p>
            <dl>
              <div><dt>To</dt><dd>${this.esc(brandEmail)}</dd></div>
              <div><dt>Subject</dt><dd>${this.esc(subject)}</dd></div>
            </dl>
            <pre>${this.esc(body)}</pre>
            <div class="button-group">
              <a class="button button-primary" href="${mailto}">
                Open email app
                ${this.icon("diagonal", 14)}
              </a>
              <button class="button button-outline" type="button" id="copy-draft-btn">
                ${this.icon("copy", 14)}
                <span>Copy message</span>
              </button>
            </div>
            <button type="button" class="underlined-button" id="edit-draft-btn" style="margin-top:16px;">
              Edit enquiry
            </button>
          </div>
        `;

        document.getElementById("copy-draft-btn")?.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(`To: ${brandEmail}\nSubject: ${subject}\n\n${body}`);
            const span = document.querySelector("#copy-draft-btn span");
            if (span) span.textContent = "Copied!";
          } catch {}
        });

        document.getElementById("edit-draft-btn")?.addEventListener("click", () => {
          form.style.display = "grid";
          container.innerHTML = "";
        });
      });
    },

    async init() {
      await this.loadContent();
      const page = document.body.dataset.page || "home";

      const headerEl = document.getElementById("site-header");
      if (headerEl) headerEl.innerHTML = this.renderHeader(page);

      const footerEl = document.getElementById("site-footer");
      if (footerEl) footerEl.innerHTML = this.renderFooter();

      const contentEl = document.getElementById("page-content");
      if (contentEl) {
        switch (page) {
          case "home":
            contentEl.innerHTML = this.renderHome();
            break;
          case "about":
            contentEl.innerHTML = this.renderAbout();
            break;
          case "bread":
            contentEl.innerHTML = this.renderBread();
            break;
          case "menu":
            contentEl.innerHTML = this.renderMenu();
            this.initMenuAccordion();
            break;
          case "locations":
            contentEl.innerHTML = this.renderLocations();
            break;
          case "location-detail": {
            const slug = document.body.dataset.slug || "south-kensington";
            contentEl.innerHTML = this.renderLocationDetail(slug);
            break;
          }
          case "careers":
            contentEl.innerHTML = this.renderContact(true);
            this.initContactForm();
            break;
          case "contact":
            contentEl.innerHTML = this.renderContact(false);
            this.initContactForm();
            break;
          case "privacy":
            contentEl.innerHTML = this.renderLegal("Privacy policy");
            break;
          case "terms":
            contentEl.innerHTML = this.renderLegal("Terms of use");
            break;
        }
      }

      this.initMobileNav();
      this.initReveal();
    }
  };

  document.addEventListener("DOMContentLoaded", () => MTJS.init());
})();
