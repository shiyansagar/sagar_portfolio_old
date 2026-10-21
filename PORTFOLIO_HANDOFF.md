# Portfolio 2026 — handoff for new pages

Read this before building any new page. It describes how the site is put together, the global
components every page shares, and the rules and lessons from building the OkCupid case study.
**Use `okcupid/` as the reference implementation** — copy its patterns rather than inventing new ones.

---

## 1. Working with Sagar (owner)

- **Exact Figma, no design changes.** Layout, padding, gaps, fonts, sizes, alignment come straight from
  Figma Dev Mode (`get_design_context`). Improve only where asked, and say what you changed.
- Stack is **plain HTML + CSS + JS** (native ES modules, Web Components). No framework, no build step, no Tailwind.
- Motion is welcome where asked (GSAP); everything else gets only a very subtle reveal. Smooth scroll via Lenis.
- Sagar tests in his own browser. Don't run long test loops unless asked; quick sanity checks are fine.
- Keep explanations short and plain.

---

## 2. Folder structure

```
portfolio 2026/
├── navbar/                     GLOBAL navbar (web component) + shared font + favicon
│   ├── navbar.js               <site-navbar>
│   ├── navbar.css              navbar styles + the @font-face for the whole site
│   ├── navbar-motion.js        GSAP menu animation (lazy-loaded)
│   ├── index.html              navbar-only demo
│   ├── SESSION_NOTES.md        detailed build log (navbar + OkCupid + footer)
│   └── assets/                 logo-portfolio.svg, favicons, plus icons, arrow, fonts/
├── footer/                     GLOBAL footer (web component)
│   ├── footer.js               <site-footer>
│   ├── footer.css
│   ├── footer-shader.js        WebGL effect on the corner photo
│   ├── archives-scene.js       isometric hover animation on the archives SVG
│   └── assets/                 photo.webp, archives.svg, arrow-up-right.svg
├── okcupid/                    OkCupid case study page (reference page)
│   ├── index.html
│   ├── okcupid.css
│   ├── okcupid.js
│   ├── content/                that page's optimised images (.webp + .svg)
│   └── img/                    original source PNGs (not used by the page)
├── index.html                  HOME page = intro + work (one 100vh page). See work/SESSION_NOTES.md
├── work/                       home page code: portal carousel (three.js glass lens, ported from
│                               home page trial/portal-carousel), clock dial, live archives hover
└── <new-page>/                 each new page gets its own folder like okcupid/
```

Each page lives in its own folder: `index.html`, `<page>.css`, `<page>.js`, `content/`.

---

## 3. Page template

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page title — Sagar Shiyan</title>
  <meta name="description" content="…">
  <link rel="icon" href="../navbar/assets/favicon-dark.svg">
  <link rel="preload" href="../navbar/assets/fonts/GoogleSansFlex-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="../navbar/navbar.css" data-site-navbar>   <!-- also loads the font -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lenis@1.1.20/dist/lenis.css">
  <link rel="stylesheet" href="page.css">
  <script type="module" src="../navbar/navbar.js"></script>
  <script type="module" src="../footer/footer.js"></script>
  <script type="module" src="page.js"></script>
</head>
<body>
  <div class="frame">                 <!-- side gutter -->
    <site-navbar></site-navbar>
    <main class="page"> … sections … </main>
  </div>
  <site-footer></site-footer>         <!-- OUTSIDE .frame so its photo reaches the window corner -->
</body>
</html>
```

---

## 4. Global components

### `<site-navbar>` (Figma `159:2959`, pill component set `111:2645`)
- Fixed to the top (20px from the edges), so page content starts at **y = 220** (20 + 42 nav + 158).
- **Hides on scroll down, shows on scroll up**, always visible in the top 75% of the first screen.
- Logo: `navbar/assets/logo-portfolio.svg` (110 × 24 slot). Menu pill is plain `#f5f5f5` (no gradient).
- Menu opens on "+", with a liquid GSAP pour; closes on second click, Esc, or click outside.
- Optional attributes: `linkedin`, `arena`, `twitter`, `github`, `about`, `home`.
- **No dark mode** — it was built and removed on purpose. Don't add a theme toggle.
- iPhone (≤767): no logo, the pill spans the full width and its "S" acts as the logo. iPad: 32px edges.

### `<site-footer>` (Figma desktop `189:2779`, phone `248:3674`)
- Top: "Lets Talk…" + Get in Touch · "Check out my Archives" + archives SVG.
- Bottom: © line · Go to Home · About Me · socials box (Github, Twitter, Are.na, LinkedIn, email).
- Corner photo pinned to the window's bottom-left, with a WebGL effect (gradient map + lens distortion +
  hover aura). Figma's own shader runtime needs WebGPU + experimental HTML-in-Canvas, so it was rebuilt in WebGL.
- Archives SVG has an isometric hover cascade (ported from `new portfolio/scene.js`).
- Optional attributes: `home`, `about`, `archives`.
- If you replace `footer/assets/archives.svg`, bump `ARCHIVES_SVG` `?v=` in `footer.js` (cache).

---

## 5. Design rules

**Figma file:** `https://www.figma.com/design/P3BbwZomnK70kIwXkSmz6U/portfolio` (fileKey `P3BbwZomnK70kIwXkSmz6U`).
OkCupid desktop = `2:4581` ("Wireframe - 1"); OkCupid phone = `245:2454` on page "ok cupid" (`1:42362`).
Phone frames are found by searching the page for ~402-wide frames (the page itself is too big for `get_metadata`).

**Font:** Google Sans Flex, **self-hosted** (`navbar/assets/fonts/GoogleSansFlex-latin.woff2`, opsz 6–144 + wght 300–700),
loaded by `navbar.css`. Don't use Google Fonts' CSS — it drops the opsz axis and makes 14–16px text ~3% narrower than Figma.
Use `font-variation-settings: "GRAD" 0, "ROND" 0, "wdth" 100`.

**Line heights:** Figma rounds "normal" per size, so always set explicit px:

| size | 10 | 12 | 14 | 16 | 18 | 20 | 28 | 32 |
|---|---|---|---|---|---|---|---|---|
| line-height | 13 | 15 | 18 | 20 | 23 | 25 | 35 | 40 |

Letter-spacing is −2% (e.g. 16px → −0.32px).

**Colour tokens** (from `okcupid.css :root`): ink `#000`, text `#464646`, muted `#838383` / `#8c8c8c`,
surface `#f5f5f5`, line `#8c8c8c`, stroke `#d4d4d4`, button hover `#ececec`, indicator idle `#adadad`.

**Layout:**
- Desktop: 1400 frame + **20px gutter**, fills the window on wider screens (no 1440 cap).
  Port Figma auto-layout literally: centred blocks keep their Figma size, full-width rows stretch with aspect ratio.
- 10-column grid: 140px columns at 1440; content commonly starts on column 2 (~142px) or 3 (~284px).
- Section gap **168px** desktop (Figma frames are evenly 168 apart).
- Native scrollbar is hidden on the page (`html { scrollbar-width: none }`) so both gutters are a true 20px.

**Breakpoints** (CSS and JS use the same):

| | desktop ≥1200 | iPad 768–1199 | iPhone ≤767 |
|---|---|---|---|
| side gutter | 20 | 32 | 16 |
| section gap | 168 | 120 | 100 |
| type | Figma desktop | desktop sizes | Figma phone sizes (12px body is fine) |

Write desktop first, then two override blocks at the end of the page CSS: `@media (max-width: 1199px)` and `@media (max-width: 767px)`.

---

## 6. Motion patterns (see `okcupid/okcupid.js`)

- Imports (pin these versions):
  `gsap@3.13.0/index.js`, `gsap@3.13.0/ScrollTrigger.js`, `lenis@1.1.20/dist/lenis.mjs` — all from `cdn.jsdelivr.net/npm/`.
  The navbar imports the same GSAP URL, so it's one shared instance.
- Lenis synced to the GSAP ticker: `lenis.on("scroll", ScrollTrigger.update)`, `gsap.ticker.add(t => lenis.raf(t*1000))`, `lagSmoothing(0)`.
- Add `js-motion` to `<html>` only when motion runs; CSS hides `[data-reveal]` / `[data-hero]` only under `.js-motion`
  (so no-JS / reduced-motion shows everything).
- Hero: fade + 12px rise, 0.08 stagger, after `document.fonts.ready` (≤1.2s).
- Everything else: `data-reveal` → 8px fade-up once via `ScrollTrigger.batch` (0.6s).
- Respect `prefers-reduced-motion`: no Lenis, no pins, no reveals; interactive bits still work.
- Animate transform/opacity; avoid animating layout and avoid CSS filters on large/complex SVGs (repaints every frame).
- Desktop-only effects via `gsap.matchMedia()` or an `isDesktop()` check.

---

## 7. Images

- Download Figma assets from `get_design_context` URLs (they expire in 7 days) — never ship Figma temp URLs.
- Rasters → WebP with `sharp` (install it in a scratch folder, not the project): quality ~80–84,
  width ≈ **2× the displayed Figma width**, capped at the source size. Crop to the visible slice when Figma crops.
- Keep vectors (icons, dots) as `.svg`, untouched.
- Put them in the page's `content/`. Give `<img>` explicit `width`/`height`; `loading="lazy" decoding="async"` below the fold.
- If CSS sizes an image with `aspect-ratio`, also set `height: auto` (the height attribute otherwise wins).

---

## 8. Lessons learned (avoid repeating these)

- **ScrollTrigger pin inside a flex parent:** `pinSpacing` defaults to **false** — set `pinSpacing: true` explicitly.
- **Pinned horizontal scroll:** use a continuous eased tween (`ease: "sine.inOut"`), end ≈ distance × 1.15, `scrub: 1`.
  A dead "hold" at the end feels like it stops. Wrap the scroll container with `width: 100%` or it overflows the page.
- **0.5px strokes:** Figma counts them in layout; Chrome rounds 0.5px borders up to 1px at 1x. Use padding +0.5 and an inset box-shadow.
- **Text wrapping vs Figma:** caused by the font's opsz axis (see font above) and line heights — fix those, not widths.
- **Figma "overflowing" frames:** Figma lets children overflow a frame; the browser shows it. Let children shrink (`flex-shrink: 1; min-width: 0`).
- **Figma shaders / custom effects:** need WebGPU + experimental HTML-in-Canvas → rebuild in WebGL with the same maths.
- **Caching:** `python -m http.server` lets browsers cache files (long for files with old mtimes). Tell Sagar to hard-refresh
  (Ctrl+Shift+R), and add `?v=` to replaced assets.
- **Headless Chrome** has a ~500px minimum window width — phone screenshots from it look cropped; use DevTools device mode instead.
- Opening pages straight from disk (file://) breaks ES modules — always use the local server.

---

## 9. Run locally

```bash
cd "D:\anti gravity\portfolio 2026"
python -m http.server 5173
```
Pages: `http://localhost:5173/okcupid/`, `http://localhost:5173/navbar/`, new pages at `http://localhost:5173/<folder>/`.
(`.claude/launch.json` has a "portfolio" config for the Claude preview.)

---

## 10. Links, transition, open TODOs

- **Next Project** queue: OkCupid → FOUR → Surabhi Bakery → Khadi Wool → OkCupid (Archives is skipped; it lives in the footer).
- Footer **Go to Home** → `../?work` (straight to the work section). Logo → site root. **Archives** → `archives/` (placeholder page).
  Defaults are built from the script's own URL, so the site works from any host or subfolder.
- **Page transition + text reveal** (`transition/pixel.js`, imported by navbar.js): the screen dissolves to white in
  pixels from the click, the next page loads normally, then dissolves in. Each page's `<head>` needs the one-line `rt-in`
  script (see the top of pixel.js) so it starts white. Project pages call `reveal(els)` for load/scroll reveals: text
  pixels in, images fade up. No Barba: every page stays standalone. Import it as `../transition/pixel.js?v=N`, the
  same URL everywhere, so there is only one copy.
- Shared scripts carry `?v=` tags (navbar.js, footer.js, navbar.css, work.*). Bump them when you change those files.
- TODO: real **About Me** link; real Archives page.
