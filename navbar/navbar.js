// <site-navbar> — reusable navbar component.
// Usage: <script type="module" src="../navbar/navbar.js"></script>
//        <site-navbar linkedin="…" arena="…" twitter="…" github="…"></site-navbar>

import "../transition/pixel.js?v=3";   // site-wide page transition (every page loads the navbar)

const base = new URL(".", import.meta.url).href;
const asset = (name) => `${base}assets/${name}`;
const EMAIL = "shiyansagar@gmail.com";
const LINKS = {
  linkedin: "https://www.linkedin.com/in/sagar-shiyan-577423300/",
  arena: "https://www.are.na/sagar-shiyan",
  twitter: "https://x.com/Sagarshiyan1",
  github: "https://github.com/shiyansagar",
};

function ensureStyles() {
  if (!document.querySelector("link[data-site-navbar]")) {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = `${base}navbar.css`;
    css.dataset.siteNavbar = "";
    document.head.append(css);
  }
}

// GSAP motion is optional: skipped for reduced motion, CSS fallback if it fails to load
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const motionModule = reduceMotion ? Promise.resolve(null) : import("./navbar-motion.js").catch(() => null);

const extLink = (label, href) => `
  <li><a href="${href}" target="_blank" rel="noopener noreferrer">${label}<img class="nav-ext" src="${asset("arrow-up-right.svg")}" width="10" height="10" alt=""></a></li>`;

class SiteNavbar extends HTMLElement {
  connectedCallback() {
    if (this._ready) return;
    this._ready = true;
    ensureStyles();

    const attr = (name) => this.getAttribute(name) || LINKS[name] || "#";
    const panelId = `nav-panel-${Math.random().toString(36).slice(2, 8)}`;

    this.innerHTML = `
      <a class="nav-logo" href="${this.getAttribute("home") || new URL("../", import.meta.url).href}" aria-label="Sagar Shiyan — home">
        <img class="nav-logo-img" src="${asset("logo-portfolio.svg")}" width="111.16" height="24.9" alt="Sagar Shiyan">
      </a>
      <div class="nav-right">
        <div class="nav-pill-slot">
          <nav class="nav-pill" aria-label="Main">
            <span class="nav-bg" aria-hidden="true"></span>
            <svg class="nav-shape" aria-hidden="true"><path /></svg>
            <div class="nav-pill-top">
              <span class="nav-swap nav-favicon" aria-hidden="true">
                <img src="${asset("favicon-dark.svg")}" width="30" height="30" alt="">
                <img src="${asset("favicon-light.svg")}" width="30" height="30" alt="">
              </span>
              <button class="nav-menu-btn" type="button" aria-expanded="false" aria-controls="${panelId}" aria-label="Open menu">
                <span class="nav-swap nav-menu-icon" aria-hidden="true">
                  <img src="${asset("plus.svg")}" width="18.0025" height="18" alt="">
                  <img src="${asset("plus-light.svg")}" width="18.0025" height="18" alt="">
                </span>
              </button>
            </div>
            <div class="nav-panel" id="${panelId}">
              <span class="nav-hover" aria-hidden="true"></span>
              <ul class="nav-links">
                <li><a href="${this.getAttribute("about") || "#about"}">About Me</a></li>
                <li><a href="mailto:${EMAIL}">${EMAIL}</a></li>
                ${extLink("LinkedIn", attr("linkedin"))}
                ${extLink("Are.na", attr("arena"))}
                ${extLink("Twitter", attr("twitter"))}
                ${extLink("Github", attr("github"))}
              </ul>
              <div class="nav-talk-row">
                <a class="nav-talk" href="mailto:${EMAIL}">Lets Have a Talk!</a>
              </div>
            </div>
          </nav>
        </div>
      </div>`;

    this._btn = this.querySelector(".nav-menu-btn");
    this._panel = this.querySelector(".nav-panel");
    this._btn.addEventListener("click", () => this.toggle());

    this._onKey = (e) => {
      if (e.key === "Escape" && this._isOpen) {
        this.toggle(false);
        this._btn.focus();
      }
    };
    this._onDocClick = (e) => {
      if (this._isOpen && !this.querySelector(".nav-pill").contains(e.target)) {
        this.toggle(false);
      }
    };
    document.addEventListener("keydown", this._onKey);
    document.addEventListener("click", this._onDocClick);

    // Hide on scroll down, show on scroll up; always shown in the hero (top of the page)
    this._lastY = scrollY;
    this._ticking = false;
    this._onScroll = () => {
      if (this._ticking) return;
      this._ticking = true;
      requestAnimationFrame(() => {
        this._ticking = false;
        const y = scrollY;
        const dy = y - this._lastY;
        if (Math.abs(dy) < 6) return; // ignore tiny jitters
        const inHero = y < innerHeight * 0.75;
        this.classList.toggle("nav-hidden", !inHero && dy > 0 && !this._isOpen);
        this._lastY = y;
      });
    };
    addEventListener("scroll", this._onScroll, { passive: true });

    this._isOpen = false;
    this._panel.inert = true;

    motionModule.then((m) => {
      if (!m || !this._ready) return;
      this._motion = m.createMotion(this);
      this.classList.add("nav-gsap");
    });
    // Skip transitions for the initial state
    this.classList.add("nav-preload");
    requestAnimationFrame(() => requestAnimationFrame(() => this.classList.remove("nav-preload")));
  }

  disconnectedCallback() {
    document.removeEventListener("keydown", this._onKey);
    document.removeEventListener("click", this._onDocClick);
    removeEventListener("scroll", this._onScroll);
    this._ready = false;
  }

  toggle(force) {
    const open = force ?? !this._isOpen;
    if (open === this._isOpen) return;
    this._isOpen = open;
    this._btn.setAttribute("aria-expanded", String(open));
    this._btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    this._panel.inert = !open;
    if (this._motion) open ? this._motion.open() : this._motion.close();
    else this.toggleAttribute("open", open);
  }

}

customElements.define("site-navbar", SiteNavbar);
