# Navbar — session notes (14 Oct 2026)

Building the OkCupid case-study page from Figma, starting with the navbar as a reusable component.

## Figma sources

File: **portfolio** — `https://www.figma.com/design/P3BbwZomnK70kIwXkSmz6U/portfolio`

| Node | Name | What it is |
|---|---|---|
| `2:4581` | Wireframe - 1 | Full OkCupid case-study page (1440 × 15246). Sections: navbar, hero, Overview, Primary Research, Affinity map, Journey mapping, Information Architecture, Design, Learnings, Next Project nav, footer |
| `159:2959` | Frame 406 | Top navbar: logo (110×24) left; links pill right (theme toggle from Figma removed — no dark mode) |
| `111:2645` | Frame 404 (component set) | Links pill. **Default**: 323×42, radius 12, cream→transparent gradient over #f5f5f5, favicon + black "+" button. **Variant2**: 323×304 black panel with links |

| `159:3034` | Frame 414 | "Sagar Shiyan" wordmark (S glyph SVGs + live text) — now the navbar logo |
| `25:1873` | Product analysis (component set) | 4-panel accordion, variants Default / Variant2–4 (instance `25:1999`) |
| `189:2480` | each section | Section indicator (Product Analysis … Final Design) |

Font: **Google Sans Flex**, self-hosted (`assets/fonts/GoogleSansFlex-latin.woff2`, 136 KB). Built from the full variable font in google/fonts (OFL), subset to Latin, keeping **opsz 6–144** and **wght 300–700**. Google Fonts' CSS API drops opsz, which made 14–16px text ~3% narrower than Figma and changed line breaks.

## Files

```
portfolio 2026/navbar/
├── index.html          navbar-only demo (index.html#open loads with the menu open)
├── navbar.js           <site-navbar> custom element: markup, state, a11y, hide-on-scroll
├── navbar-motion.js    GSAP animations (loaded lazily)
├── navbar.css          styles; Figma values as CSS custom properties
├── assets/             downloaded from Figma
│   ├── fonts/               self-hosted Google Sans Flex
│   ├── logo-portfolio.svg   navbar logo (Sagar's own SVG, 111.16 × 24.9)
│   ├── logo.png             logo 3 (old raster logo, no longer used)
│   ├── favicon-dark.svg     fevicon 2 (closed state)
│   ├── favicon-light.svg    fevicon 3 (open state, white)
│   ├── plus.svg             Group 62 (light dots, on black button)
│   ├── plus-light.svg       Group 63 (black dots, on white button)
│   ├── arrow-up-right.svg   ↗ for external links
└── SESSION_NOTES.md    this file

portfolio 2026/okcupid/           the OkCupid case study page
├── index.html          page (Figma 2:4581); loads ../navbar/navbar.js + navbar.css (global nav, font)
├── okcupid.css         page styles (all values from Figma Dev Mode)
├── okcupid.js          Lenis + GSAP ScrollTrigger motion for the page
├── content/            case-study images: optimised .webp (41 MB of PNG → 2.2 MB) + .svg vectors
└── img/                original source PNGs (untouched, not used by the page)
```

Stack: plain HTML/CSS/JS as a native Web Component, matching `carousel-web/`. No build step, no framework, no Tailwind.

## Using it

```html
<script type="module" src="../navbar/navbar.js"></script>
<site-navbar></site-navbar>
```

Optional attributes (defaults are built in):

| Attribute | Default |
|---|---|
| `linkedin` | https://www.linkedin.com/in/sagar-shiyan-577423300/ |
| `arena` | https://www.are.na/sagar-shiyan |
| `twitter` | https://x.com/Sagarshiyan1 |
| `github` | https://github.com/shiyansagar |
| `about` | `#about` — **TODO: real About Me link still to come** |
| `home` | `/` (logo link) |

Email links (`shiyansagar@gmail.com`, "Lets Have a Talk!") are `mailto:`.

JS API: `nav.toggle(true|false)` opens/closes the menu.

## Run locally

```
cd "D:\anti gravity\portfolio 2026"
python -m http.server 5173
```
Open http://localhost:5173/okcupid/ for the case study, http://localhost:5173/navbar/ for the navbar demo (hard refresh with Ctrl+Shift+R after changes).

## Behaviour

- Menu opens on "+" click; closes on second click, Esc, or click outside.
- `aria-expanded` / `aria-controls` on the button, panel is `inert` when closed, focus-visible outlines.
- Under 600px the pill shrinks to fit the space next to the logo.
- The demo page lets the navbar span the full window width (20px gutter).

## Motion (navbar-motion.js)

GSAP 3.13 from `cdn.jsdelivr.net/npm/gsap@3.13.0/index.js`. Skipped when the OS asks for reduced motion; if GSAP can't load, the navbar falls back to simple CSS transitions.

**Performance approach** — nothing animates layout:
- The pill is always laid out at its open size; the black body is an **SVG path** redrawn from a state object `{ h, w, sx, bulge, wave, fill }`.
- Links/icons only animate `transform` and `opacity`.
- Open and close both tween that same state from wherever it is, so clicking mid-animation reverses smoothly.
- Tested in headless Chrome: 0 frames over 20ms during open and close.

**Open (~0.8s body, wobble settles by ~1.4s)**
- Pill fills black (0.2s), then pours down: `h` 42→304 over 0.8s `power3.out`.
- Bottom edge sags like a drop (`bulge` → 20) and settles with `elastic.out(1, 0.45)`; slight side-to-side slosh (`wave`).
- "+" rotates into × (`back.out(1.8)`), button goes black→white, favicon swaps.
- Links rise in with a 0.04s stagger (0.7s `power3.out`), arrows follow.

**Close (~0.6s)** — final version
- Links fade up and out, bottom to top (0.18s, 0.015 stagger).
- Body pulls back up in one smooth motion: 0.55s `power3.inOut`; edge lifts slightly (`bulge` −10) and flattens on arrival.
- Black melts into the light pill as it arrives (fade starts at 0.3s).
- × turns back to + (`back.out(1.4)`), colours swap with the fade.

**Extras**
- Hover: a soft highlight (white 12%) glides between links and resizes to each; ↗ arrows nudge up-right.
- Press: buttons squish to 0.9 and spring back.

## How we got here

1. Built the static navbar from Figma (closed + open variants), served on localhost.
2. Added real social links; made the navbar span the full width.
3. First GSAP pass: circular ink reveal, blurred link entrance, height animation. **Felt laggy**: height animation forced layout every frame, 7 blur filters, a large clip-path repaint.
4. Rebuilt around the SVG liquid shape + transform/opacity only. Smooth.
5. Tried a slower close with a squash & stretch landing bounce. Too slow, then still too slow after two speed-ups, and the bounce didn't look right.
6. Replaced the close with a quick, quiet retract (current). Idea: the open carries the personality; the close just gets out of the way.

## Testing harness (scratchpad, not in the project)

Headless Chrome driven over the DevTools protocol from Node (`cdp.mjs`, `t2.js`, `frames.mjs`): checks GSAP loads, measures frame times during open/close, tests rapid toggling, and captures frames mid-animation. The Claude in Chrome extension was not connected, so nothing was clicked by hand.

## Not yet verified / next

- Esc and click-outside were only tested programmatically, not by hand.
- Mobile was checked down to ~518px; not on a real phone width.
- About Me link pending.
- Next section from the wireframe: **hero** (title, subtitle, three phone mockups).


---

# Session 2 (14 Oct 2026) — OkCupid case study page

Built the whole page from Figma `2:4581` (except the footer — deferred by Sagar). Desktop only; phone/tablet to be designed separately.

## Decisions
- The case study now lives in `okcupid/` (moved from `navbar/`); `navbar/` holds only the global nav component + its demo.
- **Global nav**: `<site-navbar>` is now `position: fixed` (top/left/right 20px; 16px under 600px) in `navbar.css`, so every page gets it. Page content starts at y=220 (20 + 42 + 158).
- **Logo**: now `assets/logo-portfolio.svg` (Sagar's export) in the 110 × 24 slot. Replaced the earlier live-text wordmark built from Figma `159:3034`.
- **Full width**: the frame fills the window (20px gutter, `min-width: 1440px`). Figma's auto-layout is ported literally: centred blocks stay their Figma size, full-width rows (images, boards, IA) stretch with their aspect ratio. Pixel-identical at 1440.
- **Line heights**: Figma rounds "normal" line height per size, so CSS uses explicit px: 10→13, 12→15, 14→18, 16→20, 18→23, 20→25, 28→35, 32→40.
- **0.5px strokes**: Figma counts them in layout, Chrome rounds 0.5px borders to 1px at 1x. Framework boxes use `padding: 16.5px` + inset shadow.
- **Real-world exploration strip** is 2713px wide in Figma (clipped in the wireframe). It scrolls sideways (trackpad / drag with mouse), scrollbar hidden.
- Indicator groups: User Research also covers Affinity map; Ideation covers IA; Final Design covers Learnings.

## Motion (okcupid.js)
- Lenis (`lenis@1.1.20`) synced to the GSAP ticker; GSAP 3.13 + ScrollTrigger from jsDelivr (same gsap module as the navbar).
- Hero: fade + 12px rise, 0.08 stagger, after fonts load.
- Framework (reworked after feedback — the pinned/scrubbed version felt bad):
  - Stack reveal plays once, time-based, when the section top reaches 70% of the viewport: box 1 fades up,
    boxes 2–4 each slide down from behind the box above (0.28s apart, power3.out). No pin.
  - Heading flight plays when the framework bottom passes 72%: clones start on the live heading positions and land on the
    live indicator slots (x power3.inOut + y power2.in = curved path, scale 16→12px, colour to active/idle), 0.07s stagger,
    then hand over to the real links. Scrolling back up fades the indicator out; scrolling down again replays the flight.
    If the headings are already off-screen (reload mid-page), the indicator just appears.
- Indicator: fixed at left 40, vertically centred; active section black, others #adadad; click scrolls there.
  Once Learnings is fully in view it travels up with the page and fades.
- Accordion: the open panel follows the mouse (70ms hover intent) and stays open after the mouse leaves; click/tap/focus also open.
  One GSAP tween per panel width (expo.out 0.75s, overwrite auto), content crossfades, number badge glides to its variant position.
- Everything else: 8px fade-up once (`ScrollTrigger.batch`).
- Reduced motion: no Lenis, no pin/reveals; indicator and accordion still work.

## Verified (headless Chrome over CDP, 1440×900)
- Section tops/heights vs Figma: all within 0–4px.
- 78 images load, none broken, no Figma temp URLs left.
- Frames during pinned scrub and fast accordion sweeps: 0 over 20ms (GPU on). Max 18ms.
- Indicator active state switches per section; panel 4 stays open after mouse leaves.

## Not done / next
- Footer (`189:2779`) — has custom shader effects + ~440 vectors; deferred.
- Phone / tablet layouts.
- "Next Project" link target (`#` placeholder, TODO in index.html). About Me link still pending in the navbar.
- The indicator sits over full-width images (desk research, user research photos, affinity map) at x 40–135 — as in the design.
- Not tested by hand in a real browser window yet (the in-app browser pane was hidden, so checks ran headless).


## Later (same day)
- Dark mode (toggle, wave-drop transition, dark styles) was built and then **removed** at Sagar's request. The theme toggle is gone from the navbar; the page is light only.
- Navbar hides on scroll down, shows on scroll up, always visible in the hero (top 75% of a screen).

## Responsive (iPad + iPhone)
Breakpoints: desktop ≥1200 (unchanged) · iPad 768–1199 · iPhone ≤767. Phone source: Figma `245:2454` "iPhone 16 & 17 Pro - 37" (402 wide) on the "ok cupid" page.
- Gutters: 20 desktop / 32 iPad / 16 iPhone — page and navbar match. Section gap 168 / 120 / 100.
- Phone type = Figma phone sizes (12px body, 14 sub-heads, 18 titles) — Sagar confirmed 12px is fine.
- Navbar on phone: no wordmark, pill spans the width (Figma). iPad keeps logo + pill.
- Accordion: desktop hover-row; iPad/phone vertical tap-to-open list with height glide (okcupid.js accordion → activateColumn), switches live on resize.
- Real-world strip: desktop pinned scrub (gsap.matchMedia, desktop only); iPad/phone native sideways swipe (+ mouse drag).
- Side indicator + heading flight: desktop only.
- Phone stacking: hero, overview meta/timeline (chart zoomed 0.76), desk images, user-research copy/chips/docs, affinity cards, empathy+journey maps, final-design rows.
- CSS lives in two blocks at the end of okcupid/okcupid.css.

## Global footer (`portfolio 2026/footer/`)
- `<site-footer>` web component, same pattern as the navbar: `footer.js` (markup), `footer.css`, `footer-shader.js` (WebGL), `assets/` (photo.webp cropped to Figma's visible slice, archives.svg from Sagar, arrow-up-right.svg).
- Use: `<script type="module" src="../footer/footer.js"></script>` + `<site-footer home="/" about="#about" archives="#"></site-footer>` (attributes optional). Placed outside `.frame` so the photo can sit in the window's bottom-left corner.
- Figma desktop 189:2779 / phone 248:3674; iPad: gap 140, photo 300px.
- Photo effect: Figma's shader runtime needs WebGPU + the experimental HTML-in-Canvas API, so it's re-implemented in WebGL 1 with the same maths (gradient map white→transparent cyan→black, lens distortion 0.01 + chromatic aberration 0.16). Added: idle sway, hover aura (rings from the pointer, wider colour fringe, soft cyan glow), eased pointer follow. Renders only while visible; static frame with reduced motion; CSS-filter fallback without WebGL.
- TODO: real Archives link and About Me link.
