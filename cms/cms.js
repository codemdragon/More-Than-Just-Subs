/**
 * More Than Just Subs — Island Content Management System (CMS)
 * Pure vanilla ES6, GitHub API integration + offline Local File Mode.
 */
(() => {
  "use strict";

  const STORAGE_KEY = "mtjs_island_draft";
  const TOKEN_KEY = "mtjs_island_gh_token";
  const OWNER_KEY = "mtjs_island_gh_owner";
  const REPO_KEY = "mtjs_island_gh_repo";
  const BRANCH_KEY = "mtjs_island_gh_branch";

  let REPO_OWNER = localStorage.getItem(OWNER_KEY) || "codemdragon";
  let REPO_NAME = localStorage.getItem(REPO_KEY) || "More-Than-Just-Subs";
  let BRANCH = localStorage.getItem(BRANCH_KEY) || "main";
  let FILE_PATH = "content.json";

  let liveData = null;
  let draftData = null;
  let liveSha = null;
  let ghToken = localStorage.getItem(TOKEN_KEY) || "";

  // Helper functions
  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const deepClone = (obj) => JSON.parse(JSON.stringify(obj || {}));

  const getPath = (obj, path) => {
    if (!obj || !path) return undefined;
    return path.split(".").reduce((curr, key) => (curr ? curr[key] : undefined), obj);
  };

  const setPath = (obj, path, val) => {
    if (!obj || !path) return;
    const parts = path.split(".");
    let curr = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      if (curr[k] === undefined || curr[k] === null) {
        curr[k] = /^\d+$/.test(parts[i + 1]) ? [] : {};
      }
      curr = curr[k];
    }
    curr[parts[parts.length - 1]] = val;
  };

  const diffCount = (a, b) => {
    let count = 0;
    const compare = (x, y) => {
      if (typeof x !== typeof y) { count++; return; }
      if (typeof x !== "object" || x === null || y === null) {
        if (x !== y) count++;
        return;
      }
      const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
      keys.forEach((k) => compare(x[k], y[k]));
    };
    compare(a, b);
    return count;
  };

  const CMS = {
    currentTab: "dashboard",
    activeImageTarget: null,
    pendingUploadData: null,

    DAYS: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],

    TIME_OPTIONS: [
      "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM",
      "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM", "2:00 PM", "3:00 PM",
      "4:00 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM",
      "9:00 PM", "9:30 PM", "10:00 PM", "10:30 PM", "11:00 PM", "11:59 PM"
    ],

    updateTimetableDay(locIdx, day, openVal, closeVal, isClosed) {
      const loc = draftData.locations[locIdx];
      if (!loc) return;
      loc.timetable = loc.timetable || {};
      loc.timetable[day] = loc.timetable[day] || { open: "7:00 AM", close: "7:00 PM", closed: false };

      if (openVal !== null && openVal !== undefined) loc.timetable[day].open = openVal;
      if (closeVal !== null && closeVal !== undefined) loc.timetable[day].close = closeVal;
      if (isClosed !== null && isClosed !== undefined) loc.timetable[day].closed = isClosed;

      this.syncHoursSummary(locIdx);
      this.autosave();
      this.renderCurrentTab();
    },

    applyTimePreset(locIdx, open, close) {
      const loc = draftData.locations[locIdx];
      if (!loc) return;
      loc.timetable = loc.timetable || {};
      this.DAYS.forEach((day) => {
        loc.timetable[day] = { open, close, closed: false };
      });
      this.syncHoursSummary(locIdx);
      this.autosave();
      this.renderCurrentTab();
      this.toast(`Applied ${open} – ${close} to all days for ${loc.name}`, "success");
    },

    copyMondayToWeekdays(locIdx) {
      const loc = draftData.locations[locIdx];
      if (!loc || !loc.timetable || !loc.timetable.Monday) return;
      const mon = loc.timetable.Monday;
      ["Tuesday", "Wednesday", "Thursday", "Friday"].forEach((day) => {
        loc.timetable[day] = { ...mon };
      });
      this.syncHoursSummary(locIdx);
      this.autosave();
      this.renderCurrentTab();
      this.toast("Copied Monday hours to all weekdays", "success");
    },

    syncHoursSummary(locIdx) {
      const loc = draftData.locations[locIdx];
      if (!loc || !loc.timetable) return;
      const tt = loc.timetable;
      const allSame = this.DAYS.every((d) => {
        const item = tt[d] || {};
        const mon = tt.Monday || {};
        return item.open === mon.open && item.close === mon.close && item.closed === mon.closed;
      });

      if (allSame) {
        const mon = tt.Monday || { open: "7:00 AM", close: "7:00 PM" };
        loc.hours = mon.closed ? "Closed" : `Mon - Sun: ${mon.open} - ${mon.close}`;
      } else {
        const weekdaysSame = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].every((d) => {
          const item = tt[d] || {};
          const mon = tt.Monday || {};
          return item.open === mon.open && item.close === mon.close && item.closed === mon.closed;
        });
        const weekendsSame = (tt.Saturday?.open === tt.Sunday?.open) && (tt.Saturday?.close === tt.Sunday?.close);
        if (weekdaysSame && weekendsSame) {
          const mon = tt.Monday || { open: "7:00 AM", close: "7:00 PM" };
          const sat = tt.Saturday || { open: "8:00 AM", close: "8:00 PM" };
          loc.hours = `Mon–Fri: ${mon.open}–${mon.close}, Sat–Sun: ${sat.open}–${sat.close}`;
        } else {
          loc.hours = `Daily hours vary (see timetable)`;
        }
      }
    },

    AVAILABLE_IMAGES: [
      "images/hero-sub.jpg",
      "images/deal-big-beef.jpg",
      "images/sub-peri-peri.jpg",
      "images/sub-chicken-tikka.jpg",
      "images/sub-bbq-chicken.jpg",
      "images/sub-pepperoni-cheese.jpg",
      "images/sub-blt-turkey.jpg",
      "images/sub-falafel-vegan.jpg",
      "images/sub-tuna-sweetcorn.jpg",
      "images/burger-classic-chicken.jpg",
      "images/artisan-bread-sourdough.jpg",
      "images/storefront-south-kensington.jpg",
      "images/storefront-hounslow.jpg",
      "images/drink-cappuccino.jpg",
      "images/drink-espresso.jpg",
      "images/drink-flat-white.jpg",
      "images/drink-macchiato.jpg",
      "images/drink-tea.jpg",
      "images/drink-white-americano.jpg",
      "images/drink-winter-warmth.jpg",
      "images/sides-loaded-fries.jpg",
      "images/logo.jpg"
    ],

    async init() {
      this.bindGlobalEvents();
      this.initGlobalSearch();
      this.initGalleryModal();

      try {
        const res = await fetch("../content.json?t=" + Date.now());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        liveData = await res.json();
      } catch (err) {
        console.warn("[CMS] Unable to fetch live content.json:", err);
        liveData = {};
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          draftData = JSON.parse(stored);
        } catch {
          draftData = deepClone(liveData);
        }
      } else {
        draftData = deepClone(liveData);
      }

      if (ghToken) {
        this.verifyGitHub();
      } else {
        this.setConnectedState(false);
      }

      this.updateDraftStatus();
      this.renderCurrentTab();
    },

    bindGlobalEvents() {
      document.getElementById("btn-publish-main")?.addEventListener("click", () => this.pushToGitHub());
      document.getElementById("btn-export-json")?.addEventListener("click", () => this.exportJson());
      document.getElementById("btn-discard")?.addEventListener("click", () => this.discardDraft());

      document.querySelectorAll(".nav-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
          document.querySelectorAll(".nav-tab").forEach((t) => t.classList.remove("active"));
          tab.classList.add("active");
          this.currentTab = tab.dataset.tab;
          this.renderCurrentTab();
        });
      });
    },

    /* ------------------------------------------------------------- Global Search */
    initGlobalSearch() {
      const searchInput = document.getElementById("cms-global-search");
      const dropdown = document.getElementById("cms-search-dropdown");
      if (!searchInput || !dropdown) return;

      const performSearch = (q) => {
        q = q.trim().toLowerCase();
        if (!q || q.length < 1) {
          dropdown.style.display = "none";
          dropdown.innerHTML = "";
          return;
        }

        const results = [];
        const data = draftData || {};

        // 1. Subs
        (data.subs || []).forEach((sub, idx) => {
          if (sub.toLowerCase().includes(q)) {
            results.push({ tab: "menu", title: sub, badge: "Signature Sub", targetId: `sub-row-${idx}` });
          }
        });

        // 2. Drinks
        (data.drinks || []).forEach((drink, idx) => {
          if (drink.toLowerCase().includes(q)) {
            results.push({ tab: "menu", title: drink, badge: "Drink", targetId: `drink-row-${idx}` });
          }
        });

        // 3. Locations
        (data.locations || []).forEach((loc, idx) => {
          if ((loc.name || "").toLowerCase().includes(q) || (loc.address || "").toLowerCase().includes(q) || (loc.hours || "").toLowerCase().includes(q)) {
            results.push({ tab: "locations", title: `${loc.name} (${loc.hours || 'Hours'})`, badge: "Location", targetId: `loc-card-${idx}` });
          }
        });

        // 4. Hero & Best Seller
        const hero = data.hero || {};
        if ((hero.badgeName || "").toLowerCase().includes(q) || (hero.badgeLabel || "").toLowerCase().includes(q)) {
          results.push({ tab: "dashboard", title: `Best Seller: ${hero.badgeName}`, badge: "Spotlight", targetId: "dash-best-seller-card" });
        }
        if ((hero.headline1 || "").toLowerCase().includes(q) || (hero.headline2 || "").toLowerCase().includes(q)) {
          results.push({ tab: "home", title: "Hero Headline & Tagline", badge: "Home Page", targetId: "hero-headline-field" });
        }

        // 5. Brand & Contact
        const brand = data.brand || {};
        if ((brand.phone || "").toLowerCase().includes(q) || (brand.email || "").toLowerCase().includes(q) || (brand.siteName || "").toLowerCase().includes(q)) {
          results.push({ tab: "brand", title: `Brand Contact: ${brand.phone || brand.email}`, badge: "Brand", targetId: "brand-contact-card" });
        }

        // 6. Reviews
        const reviews = (data.reviews && data.reviews.items) || [];
        reviews.forEach((r, idx) => {
          if ((r.name || "").toLowerCase().includes(q) || (r.text || "").toLowerCase().includes(q)) {
            results.push({ tab: "reviews", title: `Review by ${r.name}`, badge: "Review", targetId: `review-row-${idx}` });
          }
        });

        if (results.length === 0) {
          dropdown.innerHTML = `<div style="padding:14px;font-size:13px;color:var(--cms-muted);text-align:center;">No matching items found for "${esc(q)}"</div>`;
        } else {
          dropdown.innerHTML = results.slice(0, 10).map((r) => `
            <div class="search-item" data-tab="${r.tab}" data-target="${r.targetId || ''}">
              <span class="search-item-title">${esc(r.title)}</span>
              <span class="search-item-badge">${esc(r.badge)}</span>
            </div>
          `).join("");
        }

        dropdown.style.display = "block";
      };

      searchInput.addEventListener("input", (e) => performSearch(e.target.value));

      dropdown.addEventListener("click", (e) => {
        const item = e.target.closest(".search-item");
        if (!item) return;
        const tab = item.dataset.tab;
        const targetId = item.dataset.target;

        this.switchTab(tab);
        dropdown.style.display = "none";
        searchInput.value = "";

        if (targetId) {
          setTimeout(() => {
            const el = document.getElementById(targetId);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.classList.add("highlight-pulse");
              setTimeout(() => el.classList.remove("highlight-pulse"), 2500);
            }
          }, 120);
        }
      });

      document.addEventListener("click", (e) => {
        if (!e.target.closest(".cms-search-box")) {
          dropdown.style.display = "none";
        }
      });
    },

    switchTab(tabName) {
      document.querySelectorAll(".nav-tab").forEach((t) => {
        if (t.dataset.tab === tabName) t.classList.add("active");
        else t.classList.remove("active");
      });
      this.currentTab = tabName;
      this.renderCurrentTab();
    },

    /* ------------------------------------------------------------- Image Picker Modal */
    initGalleryModal() {
      const modal = document.getElementById("cms-gallery-modal");
      const btnClose = document.getElementById("gallery-btn-close");
      const btnCancel = document.getElementById("gallery-btn-cancel");
      const fileInput = document.getElementById("cms-file-uploader");
      const dropzone = document.getElementById("upload-dropzone");

      const btnG = document.getElementById("gtab-btn-gallery");
      const btnU = document.getElementById("gtab-btn-upload");
      const btnL = document.getElementById("gtab-btn-link");

      const viewG = document.getElementById("gtab-view-gallery");
      const viewU = document.getElementById("gtab-view-upload");
      const viewL = document.getElementById("gtab-view-link");

      const setGTab = (tab) => {
        [btnG, btnU, btnL].forEach((b) => b?.classList.remove("active"));
        if (viewG) viewG.style.display = "none";
        if (viewU) viewU.style.display = "none";
        if (viewL) viewL.style.display = "none";

        if (tab === "gallery") {
          btnG?.classList.add("active");
          if (viewG) viewG.style.display = "block";
        } else if (tab === "upload") {
          btnU?.classList.add("active");
          if (viewU) viewU.style.display = "block";
        } else if (tab === "link") {
          btnL?.classList.add("active");
          if (viewL) viewL.style.display = "block";
        }
      };

      btnG?.addEventListener("click", () => setGTab("gallery"));
      btnU?.addEventListener("click", () => setGTab("upload"));
      btnL?.addEventListener("click", () => setGTab("link"));

      btnClose?.addEventListener("click", () => this.closeGallery());
      btnCancel?.addEventListener("click", () => this.closeGallery());

      // File Uploader
      const handleFile = (file) => {
        if (!file || !file.type.startsWith("image/")) {
          CMS.toast("Please select a valid image file", "error");
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          CMS.pendingUploadData = { name: file.name, dataUrl: ev.target.result };
          const pImg = document.getElementById("upload-preview-img");
          const pWrap = document.getElementById("upload-preview-wrap");
          if (pImg) pImg.src = ev.target.result;
          if (pWrap) pWrap.style.display = "block";
        };
        reader.readAsDataURL(file);
      };

      fileInput?.addEventListener("change", (e) => {
        if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
      });

      if (dropzone) {
        dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.style.borderColor = "var(--cms-orange)"; });
        dropzone.addEventListener("dragleave", () => { dropzone.style.borderColor = "var(--cms-border-light)"; });
        dropzone.addEventListener("drop", (e) => {
          e.preventDefault();
          dropzone.style.borderColor = "var(--cms-border-light)";
          if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        });
      }

      document.getElementById("btn-confirm-upload")?.addEventListener("click", () => {
        if (!CMS.pendingUploadData || !CMS.activeImageTarget) return;
        const imgPath = `images/${CMS.pendingUploadData.name}`;
        setPath(draftData, CMS.activeImageTarget, imgPath);
        CMS.autosave();
        CMS.renderCurrentTab();
        CMS.closeGallery();
        CMS.toast(`Applied uploaded image as "${imgPath}"`, "success");
      });

      // Link Preview & Apply
      const urlInput = document.getElementById("input-image-url");
      const linkImg = document.getElementById("link-preview-img");
      const linkWrap = document.getElementById("link-preview-wrap");

      urlInput?.addEventListener("input", (e) => {
        const val = e.target.value.trim();
        if (val.length > 4) {
          if (linkImg) linkImg.src = val.startsWith("http") || val.startsWith("images/") ? (val.startsWith("http") ? val : `../${val}`) : val;
          if (linkWrap) linkWrap.style.display = "block";
        } else {
          if (linkWrap) linkWrap.style.display = "none";
        }
      });

      document.getElementById("btn-confirm-link")?.addEventListener("click", () => {
        const val = urlInput?.value.trim();
        if (!val || !CMS.activeImageTarget) {
          CMS.toast("Please enter a valid image address", "error");
          return;
        }
        setPath(draftData, CMS.activeImageTarget, val);
        CMS.autosave();
        CMS.renderCurrentTab();
        CMS.closeGallery();
        CMS.toast("Applied custom image URL", "success");
      });
    },

    pickImage(targetBindPath) {
      this.activeImageTarget = targetBindPath;
      this.pendingUploadData = null;

      const modal = document.getElementById("cms-gallery-modal");
      const grid = document.getElementById("gallery-grid");
      if (!modal || !grid) return;

      // Render Gallery
      grid.innerHTML = this.AVAILABLE_IMAGES.map((img) => `
        <div class="gallery-item" data-src="${img}">
          <img src="../${img}" alt="${img}" />
          <span>${img.split("/").pop()}</span>
        </div>
      `).join("");

      // Gallery Click Handler
      grid.onclick = (e) => {
        const item = e.target.closest(".gallery-item");
        if (!item) return;
        const selected = item.dataset.src;
        setPath(draftData, targetBindPath, selected);
        this.autosave();
        this.renderCurrentTab();
        this.closeGallery();
        this.toast(`Updated photo to ${selected.split("/").pop()}`, "success");
      };

      // Reset tabs & views
      document.getElementById("gtab-btn-gallery")?.click();
      const pWrap = document.getElementById("upload-preview-wrap");
      if (pWrap) pWrap.style.display = "none";
      const lWrap = document.getElementById("link-preview-wrap");
      if (lWrap) lWrap.style.display = "none";
      const uInp = document.getElementById("input-image-url");
      if (uInp) uInp.value = "";

      modal.classList.add("open");
    },

    closeGallery() {
      const modal = document.getElementById("cms-gallery-modal");
      if (modal) modal.classList.remove("open");
      this.activeImageTarget = null;
    },

    /* ------------------------------------------------------------- Render Tabs */
    renderCurrentTab() {
      const container = document.getElementById("panel-container");
      if (!container) return;

      switch (this.currentTab) {
        case "dashboard":
          container.innerHTML = this.renderDashboard();
          break;
        case "brand":
          container.innerHTML = this.renderBrandPanel();
          break;
        case "home":
          container.innerHTML = this.renderHomePanel();
          break;
        case "about":
          container.innerHTML = this.renderAboutPanel();
          break;
        case "bread":
          container.innerHTML = this.renderBreadPanel();
          break;
        case "menu":
          container.innerHTML = this.renderMenuPanel();
          break;
        case "locations":
          container.innerHTML = this.renderLocationsPanel();
          break;
        case "reviews":
          container.innerHTML = this.renderReviewsPanel();
          break;
        case "settings":
          container.innerHTML = this.renderSettingsPanel();
          break;
        default:
          container.innerHTML = this.renderDashboard();
      }

      this.bindInputs(container);
    },

    bindInputs(root) {
      root.querySelectorAll("[data-bind]").forEach((el) => {
        const path = el.dataset.bind;
        el.addEventListener("input", () => {
          let val = el.type === "checkbox" ? el.checked : el.value;
          if (el.tagName === "SELECT" && !isNaN(Number(val))) val = Number(val);
          setPath(draftData, path, val);
          CMS.autosave();
        });
      });
    },

    /* ------------------------------------------------------------- Dashboard */
    renderDashboard() {
      const diffs = liveData ? diffCount(liveData, draftData) : 0;
      const subs = draftData.subs || [];
      const drinks = draftData.drinks || [];
      const locs = draftData.locations || [];
      const revs = (draftData.reviews && draftData.reviews.items) || [];
      const hero = draftData.hero || {};
      const brand = draftData.brand || {};

      const currentBestSeller = hero.badgeName || (subs[0] || "Signature Sub Melt");
      const currentBadgeLabel = hero.badgeLabel || "Our best seller";

      return `
        <div class="panel-header">
          <h1>Website Manager Dashboard</h1>
          <p>Common daily controls, featured best sellers, and quick updates for More Than Just Subs.</p>
        </div>

        <!-- Metrics Bar -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 14px; margin-bottom: 22px;">
          <div class="card" style="padding: 16px 20px; margin-bottom:0;">
            <div style="font: 700 11px var(--mono); color: var(--cms-orange); text-transform: uppercase;">Unpublished Edits</div>
            <div style="font: 800 28px var(--sans); margin-top: 4px;">${diffs}</div>
          </div>
          <div class="card" style="padding: 16px 20px; margin-bottom:0;">
            <div style="font: 700 11px var(--mono); color: var(--cms-orange); text-transform: uppercase;">Signature Subs</div>
            <div style="font: 800 28px var(--sans); margin-top: 4px;">${subs.length}</div>
          </div>
          <div class="card" style="padding: 16px 20px; margin-bottom:0;">
            <div style="font: 700 11px var(--mono); color: var(--cms-orange); text-transform: uppercase;">Barista Drinks</div>
            <div style="font: 800 28px var(--sans); margin-top: 4px;">${drinks.length}</div>
          </div>
          <div class="card" style="padding: 16px 20px; margin-bottom:0;">
            <div style="font: 700 11px var(--mono); color: var(--cms-orange); text-transform: uppercase;">London Shops</div>
            <div style="font: 800 28px var(--sans); margin-top: 4px;">${locs.length}</div>
          </div>
          <div class="card" style="padding: 16px 20px; margin-bottom:0;">
            <div style="font: 700 11px var(--mono); color: var(--cms-orange); text-transform: uppercase;">Google Rating</div>
            <div style="font: 800 28px var(--sans); margin-top: 4px;">★ ${draftData.reviews?.summary?.average || "4.9"}</div>
          </div>
        </div>

        <!-- ⭐ Featured Best Seller / Spotlight -->
        <div class="card" id="dash-best-seller-card">
          <div class="card-title">
            <span><svg width="15" height="15" viewBox="0 0 24 24" fill="#ff7a18" stroke="#ff7a18" stroke-width="1" style="vertical-align:-2px;margin-right:6px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>Homepage Best Seller Spotlight</span>
            <span style="font: 600 12px var(--mono); color: var(--cms-orange);">Live on Homepage Hero</span>
          </div>
          <p style="font-size:13px;color:var(--cms-muted);margin-bottom:16px;">
            Quickly select which menu sub gets highlighted in the floating hero pill on the website.
          </p>

          <div class="field-row-2">
            <div class="field">
              <label>Select Sub from Menu</label>
              <select id="dash-best-seller-select" onchange="CMS.selectBestSeller(this.value)">
                ${subs.map((s) => `
                  <option value="${esc(s)}" ${s === currentBestSeller ? 'selected' : ''}>${esc(s)}</option>
                `).join("")}
                <option value="__custom__" ${!subs.includes(currentBestSeller) ? 'selected' : ''}>Custom Name...</option>
              </select>
              <input type="text" data-bind="hero.badgeName" id="dash-badge-name-input" value="${esc(currentBestSeller)}" style="${subs.includes(currentBestSeller) ? 'display:none;margin-top:8px;' : 'margin-top:8px;'}" placeholder="Type custom sub name..." />
            </div>

            <div class="field">
              <label>Badge Tag / Kicker</label>
              <div style="display:flex;gap:8px;">
                <select onchange="CMS.setBestSellerLabel(this.value)" style="flex:1;">
                  <option value="Our best seller" ${currentBadgeLabel === 'Our best seller' ? 'selected' : ''}>Our best seller</option>
                  <option value="Customer favourite" ${currentBadgeLabel === 'Customer favourite' ? 'selected' : ''}>Customer favourite</option>
                  <option value="Fresh-baked daily" ${currentBadgeLabel === 'Fresh-baked daily' ? 'selected' : ''}>Fresh-baked daily</option>
                  <option value="Chef's special" ${currentBadgeLabel === 'Chef\'s special' ? 'selected' : ''}>Chef's special</option>
                  <option value="Limited time" ${currentBadgeLabel === 'Limited time' ? 'selected' : ''}>Limited time</option>
                  <option value="__custom__">Custom text...</option>
                </select>
                <input type="text" data-bind="hero.badgeLabel" id="dash-badge-label-input" value="${esc(currentBadgeLabel)}" style="flex:1;" />
              </div>
            </div>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding-top:14px;border-top:1px solid var(--cms-border);flex-wrap:wrap;gap:12px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <img src="../${esc(hero.heroPhoto || 'images/hero-sub.jpg')}" class="img-thumb" style="width:70px;height:50px;border-radius:6px;object-fit:cover;" alt="Hero photo" />
              <div>
                <div style="font-size:12px;color:var(--cms-muted);">Current Hero Sub Photo</div>
                <div style="font:600 11px var(--mono);color:var(--cms-text);">${esc(hero.heroPhoto || 'images/hero-sub.jpg')}</div>
              </div>
            </div>
            <button type="button" class="btn btn-outline btn-sm" onclick="CMS.pickImage('hero.heroPhoto')">Change Hero Photo</button>
          </div>
        </div>

        <!-- 🕒 Store Opening Hours Quick-Edit -->
        <div class="card" id="dash-hours-card">
          <div class="card-title">
            <span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>Store Hours &amp; Timetable Quick-Edit</span>
            <button type="button" class="btn btn-outline btn-sm" onclick="CMS.switchTab('locations')">Manage Full Timetables ↗</button>
          </div>
          <div class="field-row-2">
            ${locs.map((loc, idx) => `
              <div class="field" style="background:var(--cms-surface);border:1px solid var(--cms-border);padding:14px;border-radius:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                  <label style="margin:0;font-size:13px;font-weight:700;color:#fff;">${esc(loc.name)}</label>
                  <button type="button" class="btn btn-outline btn-sm" style="padding:3px 8px;font-size:11px;" onclick="CMS.applyTimePreset(${idx}, '${idx === 0 ? '7:00 AM' : '8:00 AM'}', '${idx === 0 ? '7:00 PM' : '10:00 PM'}')">
                    Set ${idx === 0 ? '7 AM – 7 PM' : '8 AM – 10 PM'}
                  </button>
                </div>
                <input type="text" data-bind="locations.${idx}.hours" value="${esc(loc.hours)}" placeholder="e.g. Mon–Sun: 7:00 AM – 7:00 PM" />
                <div class="field-hint">${esc(loc.address)}</div>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- 🥪 Quick Menu Adder & Brand Phone -->
        <div class="field-row-2">
          <div class="card" style="margin-bottom:0;">
            <div class="card-title"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Quick Add Sub to Menu</div>
            <p style="font-size:13px;color:var(--cms-muted);margin-bottom:12px;">Add a new signature sub roll directly to the active menu.</p>
            <div style="display:flex;gap:8px;">
              <input type="text" id="dash-new-sub-input" placeholder="e.g. Chipotle Chicken Steak" style="flex:1;" />
              <button type="button" class="btn btn-primary btn-sm" onclick="CMS.quickAddSub()">Add Sub</button>
            </div>
          </div>

          <div class="card" id="brand-contact-card" style="margin-bottom:0;">
            <div class="card-title"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>Quick Contact Info</div>
            <p style="font-size:13px;color:var(--cms-muted);margin-bottom:12px;">Add a new signature sub roll directly to the active menu.</p>
            <div style="display:flex;gap:8px;">
              <input type="text" id="dash-new-sub-input" placeholder="e.g. Chipotle Chicken Steak" style="flex:1;" />
              <button type="button" class="btn btn-primary btn-sm" onclick="CMS.quickAddSub()">Add Sub</button>
            </div>
          </div>

          <div class="card" id="brand-contact-card" style="margin-bottom:0;">
            <div class="card-title">📞 Quick Contact Info</div>
            <div class="field">
              <label>Phone Number</label>
              <input type="text" data-bind="brand.phone" value="${esc(brand.phone)}" />
            </div>
            <div class="field" style="margin-top:10px;">
              <label>Email Address</label>
              <input type="text" data-bind="brand.email" value="${esc(brand.email)}" />
            </div>
          </div>
        </div>

        <!-- Quick Actions Bottom -->
        <div class="card" style="margin-top:20px;">
          <div class="card-title">Publish &amp; Export</div>
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <button class="btn btn-primary" onclick="CMS.pushToGitHub()">
              <span>Push changes to live website</span>
            </button>
            <button class="btn btn-outline" onclick="CMS.exportJson()">Export content.json</button>
            <a href="../index.html" target="_blank" class="btn btn-outline">Preview live website ↗</a>
          </div>
        </div>
      `;
    },

    selectBestSeller(val) {
      const input = document.getElementById("dash-badge-name-input") || document.getElementById("home-badge-name-input");
      if (val === "__custom__") {
        if (input) input.style.display = "block";
      } else {
        if (input) {
          input.style.display = "none";
          input.value = val;
        }
        setPath(draftData, "hero.badgeName", val);
        this.autosave();
        this.toast(`Best seller set to "${val}"`, "success");
      }
    },

    setBestSellerLabel(val) {
      if (val === "__custom__") return;
      const input = document.getElementById("dash-badge-label-input") || document.getElementById("home-badge-label-input");
      if (input) input.value = val;
      setPath(draftData, "hero.badgeLabel", val);
      this.autosave();
      this.toast(`Badge tag set to "${val}"`, "success");
    },

    quickAddSub() {
      const inp = document.getElementById("dash-new-sub-input");
      const name = inp ? inp.value.trim() : "";
      if (!name) {
        this.toast("Please enter a sub name", "error");
        return;
      }
      draftData.subs = draftData.subs || [];
      draftData.subs.push(name);
      this.autosave();
      if (inp) inp.value = "";
      this.renderCurrentTab();
      this.toast(`Added "${name}" to signature subs!`, "success");
    },

    /* ------------------------------------------------------------- Brand Panel */
    renderBrandPanel() {
      const b = draftData.brand || {};
      return `
        <div class="panel-header">
          <h1>Brand & Contact Details</h1>
          <p>Global website identity, header logo, social profiles, and phone numbers.</p>
        </div>

        <div class="card">
          <div class="card-title">General Brand</div>
          <div class="field-row-2">
            <div class="field">
              <label>Site Name</label>
              <input type="text" data-bind="brand.siteName" value="${esc(b.siteName)}" />
            </div>
            <div class="field">
              <label>Brand Tagline</label>
              <input type="text" data-bind="brand.tagline" value="${esc(b.tagline)}" />
            </div>
          </div>
          <div class="field">
            <label>Brand Logo (Optional - leave empty for original typographic wordmark)</label>
            <div style="display:flex;gap:8px;">
              <input type="text" data-bind="brand.logoUrl" id="brand-logo-input" value="${esc(b.logoUrl || '')}" placeholder="Leave empty for original typographic wordmark" style="flex:1;" />
              <button type="button" class="btn btn-outline btn-sm" onclick="CMS.pickImage('brand.logoUrl')">Choose Image</button>
              <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('brand-logo-input').value=''; CMS.setPath('brand.logoUrl', ''); CMS.saveDraft(); CMS.render();">Reset to Wordmark</button>
            </div>
            ${b.logoUrl ? `
              <div class="img-picker-wrap" style="margin-top:8px;">
                <img src="../${esc(b.logoUrl)}" class="img-thumb" style="width:70px;height:50px;border-radius:6px;object-fit:contain;" alt="Logo" />
              </div>
            ` : `
              <div class="field-hint" style="margin-top:6px;color:var(--cms-orange);">Active: <strong>Original Bold Typographic Wordmark (MORE THAN JUST SUBS)</strong></div>
            `}
          </div>
          <div class="field-row-2">
            <div class="field">
              <label>Primary Phone</label>
              <input type="text" data-bind="brand.phone" value="${esc(b.phone)}" />
            </div>
            <div class="field">
              <label>Email Address</label>
              <input type="text" data-bind="brand.email" value="${esc(b.email)}" />
            </div>
          </div>
          <div class="field">
            <label>Halal Certification Guarantee Notice</label>
            <input type="text" data-bind="brand.halalNotice" value="${esc(b.halalNotice || '100% Halal certified meats & artisan fresh ingredients.')}" />
            <div class="field-hint">Featured across your menu, homepage trust badges, and locations.</div>
          </div>
          <div class="field-row-2">
            <div class="field">
              <label>Instagram URL</label>
              <input type="text" data-bind="brand.instagram" value="${esc(b.instagram)}" />
            </div>
            <div class="field">
              <label>Facebook URL</label>
              <input type="text" data-bind="brand.facebook" value="${esc(b.facebook)}" />
            </div>
          </div>
          <div class="field">
            <label>Copyright Notice</label>
            <input type="text" data-bind="brand.copyright" value="${esc(b.copyright)}" />
          </div>
        </div>
      `;
    },

    /* ------------------------------------------------------------- Home Panel */
    renderHomePanel() {
      const hero = draftData.hero || {};
      const story = draftData.story || {};
      const range = draftData.range || [];
      const subs = draftData.subs || [];

      const currentBestSeller = hero.badgeName || (subs[0] || "Signature Sub Melt");
      const currentBadgeLabel = hero.badgeLabel || "Our best seller";

      return `
        <div class="panel-header">
          <h1>Home Page</h1>
          <p>Customize the hero banner, London story preview, and range items.</p>
        </div>

        <div class="card" id="hero-headline-field">
          <div class="card-title">Hero Section &amp; Spotlight</div>
          <div class="field-row-2">
            <div class="field">
              <label>Hero Eyebrow</label>
              <input type="text" data-bind="hero.eyebrow" value="${esc(hero.eyebrow)}" />
            </div>
            <div class="field">
              <label>Featured Best Seller Sub (Menu Picker)</label>
              <select id="home-best-seller-select" onchange="CMS.selectBestSeller(this.value)">
                ${subs.map((s) => `
                  <option value="${esc(s)}" ${s === currentBestSeller ? 'selected' : ''}>${esc(s)}</option>
                `).join("")}
                <option value="__custom__" ${!subs.includes(currentBestSeller) ? 'selected' : ''}>Custom Name...</option>
              </select>
              <input type="text" data-bind="hero.badgeName" id="home-badge-name-input" value="${esc(currentBestSeller)}" style="${subs.includes(currentBestSeller) ? 'display:none;margin-top:6px;' : 'margin-top:6px;'}" placeholder="Enter sub name" />
            </div>
          </div>
          <div class="field-row-2">
            <div class="field">
              <label>Headline 1</label>
              <input type="text" data-bind="hero.headline1" value="${esc(hero.headline1)}" />
            </div>
            <div class="field">
              <label>Headline 2 (Accent)</label>
              <input type="text" data-bind="hero.headline2" value="${esc(hero.headline2)}" />
            </div>
          </div>
          <div class="field">
            <label>Badge Kicker Label</label>
            <div style="display:flex;gap:8px;">
              <select onchange="CMS.setBestSellerLabel(this.value)" style="flex:1;">
                <option value="Our best seller" ${currentBadgeLabel === 'Our best seller' ? 'selected' : ''}>Our best seller</option>
                <option value="Customer favourite" ${currentBadgeLabel === 'Customer favourite' ? 'selected' : ''}>Customer favourite</option>
                <option value="Fresh-baked daily" ${currentBadgeLabel === 'Fresh-baked daily' ? 'selected' : ''}>Fresh-baked daily</option>
                <option value="Chef's special" ${currentBadgeLabel === 'Chef\'s special' ? 'selected' : ''}>Chef's special</option>
                <option value="Limited time" ${currentBadgeLabel === 'Limited time' ? 'selected' : ''}>Limited time</option>
                <option value="__custom__">Custom text...</option>
              </select>
              <input type="text" data-bind="hero.badgeLabel" id="home-badge-label-input" value="${esc(currentBadgeLabel)}" style="flex:1;" />
            </div>
          </div>
          <div class="field">
            <label>Hero Body Text</label>
            <textarea data-bind="hero.body" rows="3">${esc(hero.body)}</textarea>
          </div>
          <div class="field">
            <label>Hero Photo</label>
            <input type="text" data-bind="hero.heroPhoto" value="${esc(hero.heroPhoto)}" />
            <div class="img-picker-wrap" style="margin-top:8px;">
              <img src="../${esc(hero.heroPhoto)}" class="img-thumb" style="width:90px;height:65px;border-radius:8px;object-fit:cover;" alt="Hero" />
              <button type="button" class="btn btn-outline btn-sm" onclick="CMS.pickImage('hero.heroPhoto')">Choose Photo</button>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">Featured Range Preview (3 Cards on Homepage)</div>
          ${range.map((item, idx) => `
            <div style="border:1px solid var(--cms-border);border-radius:8px;padding:14px;margin-bottom:12px;background:var(--cms-surface);">
              <div class="field-row-2">
                <div class="field">
                  <label>Card #${idx + 1} Name</label>
                  <input type="text" data-bind="range.${idx}.name" value="${esc(item.name)}" />
                </div>
                <div class="field">
                  <label>Tag / Kicker</label>
                  <input type="text" data-bind="range.${idx}.tag" value="${esc(item.tag)}" />
                </div>
              </div>
              <div class="field">
                <label>Description</label>
                <input type="text" data-bind="range.${idx}.description" value="${esc(item.description)}" />
              </div>
              <div class="field">
                <label>Card Image</label>
                <input type="text" data-bind="range.${idx}.photo" value="${esc(item.photo)}" />
                <div class="img-picker-wrap" style="margin-top:8px;">
                  <img src="../${esc(item.photo)}" class="img-thumb" style="width:80px;height:55px;border-radius:6px;object-fit:cover;" alt="Range card" />
                  <button type="button" class="btn btn-outline btn-sm" onclick="CMS.pickImage('range.${idx}.photo')">Choose Image</button>
                </div>
              </div>
            </div>
          `).join("")}
        </div>

        <div class="card">
          <div class="card-title">Homepage Story Section</div>
          <div class="field-row-2">
            <div class="field">
              <label>Story Eyebrow</label>
              <input type="text" data-bind="story.eyebrow" value="${esc(story.eyebrow)}" />
            </div>
            <div class="field">
              <label>Story Heading</label>
              <input type="text" data-bind="story.heading" value="${esc(story.heading)}" />
            </div>
          </div>
          <div class="field">
            <label>Story Body</label>
            <textarea data-bind="story.body" rows="3">${esc(story.body)}</textarea>
          </div>
          <div class="field">
            <label>Story Photo</label>
            <input type="text" data-bind="story.photo" value="${esc(story.photo)}" />
            <div class="img-picker-wrap" style="margin-top:8px;">
              <img src="../${esc(story.photo)}" class="img-thumb" style="width:90px;height:65px;border-radius:8px;object-fit:cover;" alt="Story" />
              <button type="button" class="btn btn-outline btn-sm" onclick="CMS.pickImage('story.photo')">Choose Photo</button>
            </div>
          </div>
        </div>
      `;
    },

    /* ------------------------------------------------------------- About Panel */
    renderAboutPanel() {
      const a = draftData.about || {};
      return `
        <div class="panel-header">
          <h1>About Us Page</h1>
          <p>Customize the brand story, mission, and London heritage timeline.</p>
        </div>

        <div class="card">
          <div class="card-title">Intro &amp; Story</div>
          <div class="field">
            <label>Intro Statement</label>
            <textarea data-bind="about.intro" rows="3">${esc(a.intro)}</textarea>
          </div>
          <div class="field">
            <label>Featured Photo</label>
            <input type="text" data-bind="about.photo" value="${esc(a.photo)}" />
            <div class="img-picker-wrap" style="margin-top:8px;">
              <img src="../${esc(a.photo)}" class="img-thumb" style="width:90px;height:65px;border-radius:8px;object-fit:cover;" alt="About" />
              <button type="button" class="btn btn-outline btn-sm" onclick="CMS.pickImage('about.photo')">Choose Photo</button>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">Heritage Paragraphs</div>
          <div class="field">
            <label>Heritage Paragraph 1</label>
            <textarea data-bind="about.heritageP1" rows="3">${esc(a.heritageP1)}</textarea>
          </div>
          <div class="field">
            <label>Heritage Paragraph 2</label>
            <textarea data-bind="about.heritageP2" rows="3">${esc(a.heritageP2)}</textarea>
          </div>
        </div>
      `;
    },

    /* ------------------------------------------------------------- Bread Panel */
    renderBreadPanel() {
      const b = draftData.bread || {};
      const items = b.items || [];
      return `
        <div class="panel-header">
          <h1>Our Bread Page</h1>
          <p>Highlight the artisan daily bake, ingredients, and signature bread types.</p>
        </div>

        <div class="card">
          <div class="card-title">Bread Intro &amp; Photo</div>
          <div class="field">
            <label>Bread Page Intro</label>
            <textarea data-bind="bread.intro" rows="3">${esc(b.intro)}</textarea>
          </div>
          <div class="field">
            <label>Bread Hero Photo</label>
            <input type="text" data-bind="bread.photo" value="${esc(b.photo)}" />
            <div class="img-picker-wrap" style="margin-top:8px;">
              <img src="../${esc(b.photo)}" class="img-thumb" style="width:90px;height:65px;border-radius:8px;object-fit:cover;" alt="Bread" />
              <button type="button" class="btn btn-outline btn-sm" onclick="CMS.pickImage('bread.photo')">Choose Photo</button>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">Daily Breads (${items.length})</div>
          ${items.map((item, idx) => `
            <div style="border-bottom:1px solid var(--cms-border);padding-bottom:12px;margin-bottom:12px;">
              <div class="field-row-2">
                <div class="field">
                  <label>Bread Name</label>
                  <input type="text" data-bind="bread.items.${idx}.name" value="${esc(item.name)}" />
                </div>
                <div class="field">
                  <label>Kicker / Tag</label>
                  <input type="text" data-bind="bread.items.${idx}.tag" value="${esc(item.tag)}" />
                </div>
              </div>
              <div class="field">
                <label>Description</label>
                <input type="text" data-bind="bread.items.${idx}.description" value="${esc(item.description)}" />
              </div>
            </div>
          `).join("")}
        </div>
      `;
    },

    /* ------------------------------------------------------------- Menu Panel */
    renderMenuPanel() {
      const subs = draftData.subs || [];
      const drinks = draftData.drinks || [];
      const deals = draftData.mealDeals || [];

      return `
        <div class="panel-header">
          <h1>Menu Items & Pricing</h1>
          <p>Edit made-to-order subs, barista drinks, and meal deal pricing.</p>
        </div>

        <div class="card">
          <div class="card-title">Signature Subs (${subs.length})</div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${subs.map((sub, idx) => `
              <div class="sub-item-row" id="sub-row-${idx}">
                <span class="sub-item-index">#${idx + 1}</span>
                <input type="text" data-bind="subs.${idx}" value="${esc(sub)}" style="flex:1;" />
                <button type="button" class="btn btn-danger btn-sm" title="Remove sub" onclick="CMS.removeSub(${idx})">✕</button>
              </div>
            `).join("")}
          </div>
          <button type="button" class="btn btn-outline btn-sm" style="margin-top:12px;" onclick="CMS.addSub()">+ Add New Sub</button>
        </div>

        <div class="card">
          <div class="card-title">Barista Drinks & Matcha (${drinks.length})</div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${drinks.map((drink, idx) => `
              <div class="sub-item-row" id="drink-row-${idx}">
                <span class="sub-item-index">#${idx + 1}</span>
                <input type="text" data-bind="drinks.${idx}" value="${esc(drink)}" style="flex:1;" />
                <button type="button" class="btn btn-danger btn-sm" title="Remove drink" onclick="CMS.removeDrink(${idx})">✕</button>
              </div>
            `).join("")}
          </div>
          <button type="button" class="btn btn-outline btn-sm" style="margin-top:12px;" onclick="CMS.addDrink()">+ Add New Drink</button>
        </div>

        <div class="card">
          <div class="card-title">Meal Deals</div>
          ${deals.map((deal, idx) => `
            <div class="field-row-2" style="border-bottom:1px solid var(--cms-border);padding-bottom:10px;margin-bottom:10px;">
              <div class="field">
                <label>Deal Description</label>
                <input type="text" data-bind="mealDeals.${idx}.label" value="${esc(deal.label)}" />
              </div>
              <div class="field">
                <label>Price</label>
                <input type="text" data-bind="mealDeals.${idx}.price" value="${esc(deal.price)}" />
              </div>
            </div>
          `).join("")}
        </div>
      `;
    },

    addSub() {
      draftData.subs = draftData.subs || [];
      draftData.subs.push("New Signature Sub");
      this.autosave();
      this.renderCurrentTab();
    },

    removeSub(idx) {
      draftData.subs.splice(idx, 1);
      this.autosave();
      this.renderCurrentTab();
    },

    addDrink() {
      draftData.drinks = draftData.drinks || [];
      draftData.drinks.push("New Barista Drink");
      this.autosave();
      this.renderCurrentTab();
    },

    removeDrink(idx) {
      draftData.drinks.splice(idx, 1);
      this.autosave();
      this.renderCurrentTab();
    },

    /* ------------------------------------------------------------- Locations Panel */
    renderLocationsPanel() {
      const locs = draftData.locations || [];
      return `
        <div class="panel-header">
          <h1>Shops &amp; Locations</h1>
          <p>Manage store addresses, weekly opening timetable, and embedded Google Maps pins.</p>
        </div>

        ${locs.map((shop, idx) => `
          <div class="card" id="loc-card-${idx}">
            <div class="card-title">
              <span>Location #${idx + 1}: ${esc(shop.name)}</span>
              <span style="font:600 12px var(--mono);color:var(--cms-orange);">${esc(shop.slug)}</span>
            </div>

            <div class="field-row-2">
              <div class="field">
                <label>Shop Name</label>
                <input type="text" data-bind="locations.${idx}.name" value="${esc(shop.name)}" />
              </div>
              <div class="field">
                <label>Shop Phone Number</label>
                <input type="text" data-bind="locations.${idx}.phone" value="${esc(shop.phone || '+44 20 7589 3134')}" placeholder="+44 20 7589 3134" />
              </div>
            </div>

            <div class="field-row-2">
              <div class="field">
                <label>Street Address</label>
                <input type="text" data-bind="locations.${idx}.address" value="${esc(shop.address)}" />
              </div>
              <div class="field">
                <label>Price Range</label>
                <input type="text" data-bind="locations.${idx}.priceRange" value="${esc(shop.priceRange || '£10–20 per person')}" placeholder="e.g. £10–20 per person" />
              </div>
            </div>

            <div class="field-row-2">
              <div class="field">
                <label>Plus Code (Google Maps)</label>
                <input type="text" data-bind="locations.${idx}.plusCode" value="${esc(shop.plusCode || '')}" placeholder="e.g. FRVG+PC London, United Kingdom" />
              </div>
              <div class="field">
                <label>Google Rating &amp; Review Count</label>
                <div style="display:flex;gap:8px;">
                  <input type="number" step="0.1" min="1" max="5" data-bind="locations.${idx}.rating" value="${esc(shop.rating || 3.5)}" style="width:90px;" placeholder="3.5" />
                  <input type="number" data-bind="locations.${idx}.reviewCount" value="${esc(shop.reviewCount || 323)}" style="flex:1;" placeholder="323 reviews" />
                </div>
              </div>
            </div>

            <div class="field">
              <label>Description</label>
              <input type="text" data-bind="locations.${idx}.description" value="${esc(shop.description)}" />
            </div>

            <!-- Weekly Opening Timetable Editor -->
            <div style="background:var(--cms-surface);border:1px solid var(--cms-border);border-radius:10px;padding:16px;margin:18px 0;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:10px;">
                <div>
                  <div style="font:700 13px var(--mono);color:var(--cms-orange);text-transform:uppercase;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>Weekly Opening Timetable
                  </div>
                  <div style="font-size:12px;color:var(--cms-muted);">Adjust day-by-day hours. Summary string updates automatically.</div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  <button type="button" class="btn btn-outline btn-sm" onclick="CMS.applyTimePreset(${idx}, '7:00 AM', '7:00 PM')">Set 7 AM – 7 PM (All Days)</button>
                  <button type="button" class="btn btn-outline btn-sm" onclick="CMS.applyTimePreset(${idx}, '8:00 AM', '10:00 PM')">Set 8 AM – 10 PM (All Days)</button>
                  <button type="button" class="btn btn-outline btn-sm" onclick="CMS.copyMondayToWeekdays(${idx})">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>Copy Mon to Weekdays
                  </button>
                </div>
              </div>

              <!-- Day by Day Rows -->
              <div style="display:flex;flex-direction:column;gap:6px;">
                ${CMS.DAYS.map((day) => {
                  const item = (shop.timetable && shop.timetable[day]) || { open: "7:00 AM", close: "7:00 PM", closed: false };
                  return `
                    <div style="display:grid;grid-template-columns:105px 1fr auto 1fr auto;gap:8px;align-items:center;padding:6px 10px;background:var(--cms-card);border-radius:6px;border:1px solid var(--cms-border);">
                      <span style="font:700 12.5px var(--sans);color:#fff;">${day}</span>
                      <select style="font-size:12px;padding:5px 8px;" onchange="CMS.updateTimetableDay(${idx}, '${day}', this.value, null, null)" ${item.closed ? 'disabled' : ''}>
                        ${CMS.TIME_OPTIONS.map((t) => `<option value="${t}" ${t === item.open ? 'selected' : ''}>${t}</option>`).join("")}
                      </select>
                      <span style="font-size:12px;color:var(--cms-muted);">to</span>
                      <select style="font-size:12px;padding:5px 8px;" onchange="CMS.updateTimetableDay(${idx}, '${day}', null, this.value, null)" ${item.closed ? 'disabled' : ''}>
                        ${CMS.TIME_OPTIONS.map((t) => `<option value="${t}" ${t === item.close ? 'selected' : ''}>${t}</option>`).join("")}
                      </select>
                      <label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--cms-muted);margin:0;cursor:pointer;">
                        <input type="checkbox" ${item.closed ? 'checked' : ''} onchange="CMS.updateTimetableDay(${idx}, '${day}', null, null, this.checked)" style="width:auto!important;margin:0!important;" />
                        <span>Closed</span>
                      </label>
                    </div>
                  `;
                }).join("")}
              </div>

              <div style="margin-top:12px;display:flex;align-items:center;gap:10px;">
                <span style="font:700 11px var(--mono);color:var(--cms-muted);text-transform:uppercase;">Summary String:</span>
                <input type="text" data-bind="locations.${idx}.hours" value="${esc(shop.hours)}" style="flex:1;font-size:12px;padding:6px 10px;" />
              </div>
            </div>

            <div class="field">
              <label>Google Maps Embed URL (Iframe src)</label>
              <input type="text" data-bind="locations.${idx}.mapEmbedUrl" value="${esc(shop.mapEmbedUrl)}" />
            </div>
            <div class="field">
              <label>Direct Google Maps Link</label>
              <input type="text" data-bind="locations.${idx}.mapUrl" value="${esc(shop.mapUrl)}" />
            </div>
            <div class="field">
              <label>Storefront Photo</label>
              <input type="text" data-bind="locations.${idx}.photo" value="${esc(shop.photo)}" />
              <div class="img-picker-wrap" style="margin-top:8px;">
                <img src="../${esc(shop.photo)}" class="img-thumb" style="width:90px;height:65px;border-radius:8px;object-fit:cover;" alt="Shop" />
                <button type="button" class="btn btn-outline btn-sm" onclick="CMS.pickImage('locations.${idx}.photo')">Choose Photo</button>
              </div>
            </div>
          </div>
        `).join("")}
      `;
    },

    /* ------------------------------------------------------------- Reviews Panel */
    renderReviewsPanel() {
      const rev = draftData.reviews || {};
      const summary = rev.summary || {};
      const items = rev.items || [];

      return `
        <div class="panel-header">
          <h1>Customer Reviews & Google Maps Feedback</h1>
          <p>Add authentic reviews from Google Maps. Shown on homepage and in customer reviews section.</p>
        </div>

        <div class="card">
          <div class="card-title">Google Maps Review Summary</div>
          <div class="field-row-2">
            <div class="field">
              <label>Average Rating (e.g. 4.9)</label>
              <input type="number" step="0.1" min="1" max="5" data-bind="reviews.summary.average" value="${esc(summary.average || '')}" placeholder="e.g. 4.9" />
            </div>
            <div class="field">
              <label>Total Reviews Count (e.g. 128)</label>
              <input type="number" data-bind="reviews.summary.count" value="${esc(summary.count || '')}" placeholder="e.g. 128" />
            </div>
          </div>
          <div class="field">
            <label>Google Maps Profile URL (for 'Review us on Google' button)</label>
            <input type="text" data-bind="reviews.googleUrl" value="${esc(rev.googleUrl || '')}" placeholder="https://www.google.com/maps/search/..." />
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span>Customer Testimonials (${items.length})</span>
            <button class="btn btn-outline btn-sm" onclick="CMS.addReview()">+ Add Review</button>
          </div>

          ${items.map((r, idx) => `
            <div class="item-row" id="review-row-${idx}">
              <div class="item-row-header">
                <span class="item-num">Review #${idx + 1}</span>
                <button class="btn btn-danger btn-sm" onclick="CMS.removeReview(${idx})">Delete</button>
              </div>
              <div class="field-row-2">
                <div class="field">
                  <label>Customer Name</label>
                  <input type="text" data-bind="reviews.items.${idx}.name" value="${esc(r.name)}" placeholder="e.g. Sarah M." />
                </div>
                <div class="field">
                  <label>Star Rating (1 - 5)</label>
                  <select data-bind="reviews.items.${idx}.rating">
                    <option value="5" ${Number(r.rating) === 5 ? "selected" : ""}>★★★★★ (5 Stars)</option>
                    <option value="4" ${Number(r.rating) === 4 ? "selected" : ""}>★★★★☆ (4 Stars)</option>
                    <option value="3" ${Number(r.rating) === 3 ? "selected" : ""}>★★★☆☆ (3 Stars)</option>
                  </select>
                </div>
              </div>
              <div class="field-row-2">
                <div class="field">
                  <label>Shop Location</label>
                  <input type="text" data-bind="reviews.items.${idx}.shop" value="${esc(r.shop || 'South Kensington')}" />
                </div>
                <div class="field">
                  <label>Review Date</label>
                  <input type="text" data-bind="reviews.items.${idx}.date" value="${esc(r.date || '')}" placeholder="e.g. Oct 2026" />
                </div>
              </div>
              <div class="field">
                <label>Review Text</label>
                <textarea data-bind="reviews.items.${idx}.text" rows="3">${esc(r.text)}</textarea>
              </div>
            </div>
          `).join("")}
        </div>
      `;
    },

    addReview() {
      draftData.reviews = draftData.reviews || { items: [] };
      draftData.reviews.items = draftData.reviews.items || [];
      draftData.reviews.items.push({
        name: "Customer",
        rating: 5,
        shop: "South Kensington",
        date: "Recent",
        text: "Amazing fresh subs and great coffee!"
      });
      this.autosave();
      this.renderCurrentTab();
    },

    removeReview(idx) {
      draftData.reviews.items.splice(idx, 1);
      this.autosave();
      this.renderCurrentTab();
    },

    /* ------------------------------------------------------------- Settings Panel */
    renderSettingsPanel() {
      return `
        <div class="panel-header">
          <h1>GitHub Sync Settings</h1>
          <p>Configure direct repository commits. Leave blank to stay in Local File Mode.</p>
        </div>

        <div class="card">
          <div class="card-title">GitHub Configuration</div>
          <div class="field">
            <label>GitHub Personal Access Token (Fine-Grained PAT or Classic)</label>
            <input type="password" id="input-token" value="${esc(ghToken)}" placeholder="github_pat_xxxxxxxxxxxxxxxxxxxx" />
            <small style="color:var(--cms-muted);margin-top:4px;display:block;">Supports GitHub Fine-Grained Personal Access Tokens (<code>github_pat_...</code>). Required permission: <strong>Repository &gt; Contents: Read and write</strong>.</small>
          </div>
          <div class="field-row-2">
            <div class="field">
              <label>Repository Owner / Org</label>
              <input type="text" id="input-owner" value="${esc(REPO_OWNER)}" />
            </div>
            <div class="field">
              <label>Repository Name</label>
              <input type="text" id="input-repo" value="${esc(REPO_NAME)}" />
            </div>
          </div>
          <div class="field">
            <label>Branch</label>
            <input type="text" id="input-branch" value="${esc(BRANCH)}" />
          </div>
          <div style="display:flex;gap:12px;margin-top:16px;">
            <button class="btn btn-primary" onclick="CMS.saveSettings()">Save &amp; Connect</button>
            <button class="btn btn-outline" onclick="CMS.disconnectGitHub()">Disconnect (Local Mode)</button>
          </div>
        </div>
      `;
    },

    saveSettings() {
      const token = document.getElementById("input-token").value.trim();
      const owner = document.getElementById("input-owner").value.trim() || "codemdragon";
      const repo = document.getElementById("input-repo").value.trim() || "More-Than-Just-Subs";
      const branch = document.getElementById("input-branch").value.trim() || "main";

      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(OWNER_KEY, owner);
      localStorage.setItem(REPO_KEY, repo);
      localStorage.setItem(BRANCH_KEY, branch);

      ghToken = token;
      REPO_OWNER = owner;
      REPO_NAME = repo;
      BRANCH = branch;

      this.toast("Settings saved! Reconnecting...", "info");
      this.init();
    },

    disconnectGitHub() {
      localStorage.removeItem(TOKEN_KEY);
      ghToken = "";
      this.toast("Disconnected from GitHub. Working in Local File Mode.", "info");
      this.setConnectedState(false);
      this.renderCurrentTab();
    },

    /* ------------------------------------------------------------- State & Persistence */
    autosave() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draftData));
        this.updateDraftStatus();
      } catch (e) {
        console.error("Autosave failed", e);
      }
    },

    updateDraftStatus() {
      const diffs = liveData ? diffCount(liveData, draftData) : 0;
      const countEl = document.getElementById("draft-count");
      const pillEl = document.getElementById("draft-pill");
      const discardBtn = document.getElementById("btn-discard");

      if (countEl) countEl.textContent = diffs;
      if (pillEl) {
        if (diffs > 0) pillEl.classList.add("visible");
        else pillEl.classList.remove("visible");
      }
      if (discardBtn) {
        discardBtn.style.display = diffs > 0 ? "inline-flex" : "none";
      }
    },

    discardDraft() {
      if (!confirm("Discard all unpublished changes and revert to live content.json?")) return;
      localStorage.removeItem(STORAGE_KEY);
      draftData = deepClone(liveData);
      this.updateDraftStatus();
      this.renderCurrentTab();
      this.toast("Draft discarded. Reverted to live content.", "info");
    },

    exportJson() {
      const jsonStr = JSON.stringify(draftData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "content.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.toast("Downloaded content.json to your computer!", "success");
    },

    /* ------------------------------------------------------------- GitHub Integration */
    setConnectedState(connected, username = "") {
      const pill = document.getElementById("connection-pill");
      const status = document.getElementById("connection-status");
      if (!pill || !status) return;

      if (connected) {
        pill.className = "status-pill connected";
        status.textContent = `Connected: ${username || REPO_OWNER}/${REPO_NAME}`;
      } else {
        pill.className = "status-pill local";
        status.textContent = "Local File Mode";
      }
    },

    async verifyGitHub() {
      try {
        const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`, {
          headers: {
            Authorization: `Bearer ${ghToken}`,
            Accept: "application/vnd.github.v3+json"
          }
        });
        if (!res.ok) {
          this.setConnectedState(false);
          return;
        }
        const file = await res.json();
        liveSha = file.sha;
        this.setConnectedState(true);
      } catch {
        this.setConnectedState(false);
      }
    },

    async pushToGitHub() {
      if (!ghToken) {
        this.exportJson();
        this.toast("Running in Local Mode: Exported content.json. Configure GitHub in Settings to push directly.", "info");
        return;
      }

      this.toast("Pushing changes to GitHub...", "info");
      try {
        const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(draftData, null, 2))));
        const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${ghToken}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.github.v3+json"
          },
          body: JSON.stringify({
            message: "Content update via More Than Just Subs CMS",
            content: contentBase64,
            sha: liveSha,
            branch: BRANCH
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Failed to commit");
        }

        const data = await res.json();
        liveSha = data.content.sha;
        liveData = deepClone(draftData);
        localStorage.removeItem(STORAGE_KEY);
        this.updateDraftStatus();
        this.renderCurrentTab();
        this.toast("Successfully pushed to GitHub! Website will update.", "success");
      } catch (err) {
        this.toast(`GitHub Push Error: ${err.message}`, "error");
      }
    },

    toast(msg, type = "info") {
      const el = document.getElementById("cms-toast");
      if (!el) return;
      el.textContent = msg;
      el.className = `toast show ${type}`;
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => {
        el.className = "toast";
      }, 3500);
    }
  };

  // Expose a setter so the auth gate can inject the token into the CMS runtime
  CMS.setToken = function (token) {
    ghToken = token;
    // If the Settings panel is currently rendered, update its input live
    const settingsInput = document.getElementById("input-token");
    if (settingsInput) settingsInput.value = token;
  };

  window.CMS = CMS;
  document.addEventListener("DOMContentLoaded", () => CMS.init());
})();
