// <site-footer> — global footer (Figma: portfolio / footer 189:2779, phone 248:3674).
// Usage: <script type="module" src="../footer/footer.js"></script>
//        <site-footer home="/" about="#about" archives="#"></site-footer>
// The corner photo gets a WebGL take on Figma's shader (gradient map + lens distortion)
// plus an aura wave that follows the pointer on hover — see footer-shader.js.

const base = new URL(".", import.meta.url).href;
const asset = (name) => `${base}assets/${name}`;
// Bump when an asset file is replaced, so browsers don't keep the cached copy
const ARCHIVES_SVG = `${base}assets/archives.svg?v=2`;
const EMAIL = "shiyansagar@gmail.com";
const LINKS = {
  github: "https://github.com/shiyansagar",
  twitter: "https://x.com/Sagarshiyan1",
  arena: "https://www.are.na/sagar-shiyan",
  linkedin: "https://www.linkedin.com/in/sagar-shiyan-577423300/",
};

function ensureStyles() {
  if (document.querySelector("link[data-site-footer]")) return;
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = `${base}footer.css`;
  css.dataset.siteFooter = "";
  document.head.append(css);
}

const social = (label, href) => `
  <a class="ft-social-link" href="${href}" target="_blank" rel="noopener noreferrer">${label}<img src="${asset("arrow-up-right.svg")}" width="10" height="10" alt=""></a>`;

class SiteFooter extends HTMLElement {
  connectedCallback() {
    if (this._ready) return;
    this._ready = true;
    ensureStyles();
    const attr = (name, fallback) => this.getAttribute(name) || LINKS[name] || fallback;

    this.innerHTML = `
      <footer class="ft">
        <div class="ft-top">
          <div class="ft-talk">
            <h2 class="ft-title">Let's Talk about design over a Red Bull bruh!!!</h2>
            <a class="ft-btn ft-btn-strong" href="mailto:${EMAIL}">Get in Touch</a>
          </div>
          <a class="ft-archives" href="${attr("archives", `${base}../archives/`)}">
            <span class="ft-archives-title">Check out my Archives</span>
            <span class="ft-archives-art">
              <img class="ft-archives-img" src="${ARCHIVES_SVG}" width="898" height="649" alt="Archive of past work" loading="lazy" decoding="async">
            </span>
          </a>
        </div>
        <div class="ft-bottom">
          <p class="ft-copy">Sagar Shiyan © 2026</p>
          <nav class="ft-links" aria-label="Footer">
            <a class="ft-btn" href="${attr("home", `${base}../?work`)}">Go to Home</a>
            <!-- TODO: real About Me link -->
            <a class="ft-btn" href="${attr("about", "#about")}">About Me</a>
            <div class="ft-social">
              ${social("Github", attr("github"))}
              ${social("Twitter", attr("twitter"))}
              ${social("Are.na", attr("arena"))}
              ${social("LinkedIn", attr("linkedin"))}
              <a class="ft-social-mail" href="mailto:${EMAIL}">${EMAIL}</a>
            </div>
          </nav>
        </div>
        <div class="ft-photo" aria-hidden="true">
          <img class="ft-photo-img" src="${asset("photo.webp")}" width="840" height="861" alt="" loading="lazy" decoding="async">
        </div>
      </footer>`;

    // Archives: isometric hover scene (inlines the SVG; the <img> stays as the fallback)
    import("./archives-scene.js")
      .then((m) => m.mountArchives(this.querySelector(".ft-archives"), ARCHIVES_SVG))
      .catch(() => { });

    import("./footer-shader.js")
      .then((m) => m.mountAura(this.querySelector(".ft-photo")))
      .catch(() => { }); // no WebGL / module failed: the CSS-filtered photo stays
  }

  disconnectedCallback() {
    this.querySelector(".ft-photo")?._aura?.destroy();
    this._ready = false;
  }
}

customElements.define("site-footer", SiteFooter);
