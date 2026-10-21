# Home / Work page — session notes

The **Work page** (`work/`) is one 100vh screen. The project images scroll vertically through a liquid-glass
portal, a clock-style dial on the left turns with them, and each project's details appear on the right.

**The work page is the home page.** The root `index.html` opens on the intro (Figma `328:1008`). The first
scroll down (also a swipe up, the ↓ / PageDown / Space keys, or a click on "(Scroll to see work)") lifts
the intro words up and away. At the same time the dial and details float up from below and the cards play
their rise-in. One way only: the navbar logo is a plain link home, which reloads `/` back to the intro (the loader doesn't replay in the same tab).

- **Local:** `http://localhost:5173/` (run `python -m http.server 5173` from the project root)
- **Testing:** `?loader` forces the load animation, `?work` skips the loader and the intro, `?entry=0` skips the
  card load-in, e.g. `http://localhost:5173/?work&entry=0`
- **Source of the effect:** `D:\anti gravity\home page trial\portal-carousel` (three.js + GSAP, Vite). It was ported here
  to plain ES modules with no build step and no parameter panel.

---

## Files

```
index.html            (project root) the home page: <site-navbar>, intro, WebGL stage, archives overlay,
                      dial, hover cursor, details. Loads work/work.css + work/work.js
work/
├── work.css          layout + type (Figma values), dial, details, cursor, archives overlay
├── loader.js         load animation (S lands → two-row, letter-by-letter logo build → fade)
├── jellies.js        three faint ASCII jellyfish drifting behind the intro (hover + tap)
├── work.js           carousel engine, content data, dial, text reveal, archives hover, cursor, input
├── shader.js         card + portal shaders (ported; cardFrag edited, see below)
└── content/
    ├── okcupid.webp      3 phones, composited from the Figma assets (2x)
    ├── four.webp         FOUR photo + white bottom fade + r12 (2x)
    ├── surabhi.webp      billboard, Figma crop + r12 (2x)
    ├── khadi.webp        Figma 331:3666 (976x573, source size, corners baked)
    ├── cursor-hand.webp  hover cursor (Figma 327:1006), shown at 30x30
    └── scroll-mouse.svg  intro scroll hint icon (Figma 348:396)
```
The Archives card uses the footer's own `footer/assets/archives.svg`. It is not copied.

---

## Figma nodes (file `P3BbwZomnK70kIwXkSmz6U`)

| What | Node |
|---|---|
| OkCupid frame | `171:24979` (card group `171:24980`, 547.5 x 357) |
| Ecommerce / FOUR frame | `307:7505` (image `307:7503`, 548 x 323) |
| Khadi Wool frame | `308:7612` (new image `331:3666`, 548 x 322) |
| Archives frame | `324:435` (SVG `324:71`, 548 x 397) |
| Surabhi Bakery text | `173:25176` (image `329:1468`, 548 x 322) |
| Left dial | `173:25024` |
| Right details | `173:25036` |
| Hover cursor hand | `327:1006` (30 x 30) |
| Loader inspiration | `166:23676` (guide lines + logo build) |
| Intro / home | `328:1008` (pill `348:312`, text `348:305`, scroll hint `348:395`) |

---

## Projects (order = the dial in the first Figma frame)

| # | Dial name | Card | Links to |
|---|---|---|---|
| 1 | OkCupid | okcupid.webp | `../okcupid/` |
| 2 | Ecommerce | four.webp | `../four/` |
| 3 | Surabhi Bakery | surabhi.webp | `../branding/` |
| 4 | Archives | archives.svg (live hover scene) | `#` |
| 5 | Khadi Wool | khadi.webp | `../crd/` |

All content lives in the `PROJECTS` array at the top of `work.js`. The text is copied word for word from Figma.
`fixed` / `roleFixed` reproduce Figma's fixed 99px-high Description / Role blocks.

---

## How it works

**Cards + portal (WebGL).** Two passes, as in portal-carousel:
1. The cards are drawn flat into an off-screen buffer.
2. A full-screen shader draws that buffer through the glass portal (rim bend, colour split, blue ring).

- Only images and the archives SVG go through the glass. Text is DOM on top.
- Cards are always at **exact Figma size**: `K = 1`, never scaled.

**Dial (left).**
- Each name rides an arc round a pivot 240px to its left and tilts with it, like a clock second hand
  (`DIAL_R = 240`, `DIAL_STEP = 7°`).
- At rest the active name is 20px `#414141` (line 25). The others are 14px `#e8e8e8` (line 18).
- Five rows show at rest: two above the active name and two below.
- Clicking a name scrolls to that card. Clicking the active name follows its link.

**Details (right).**
- Swapped per card with a pixel dissolve, after the "dissolve" preset of pixel-text-reveal.vercel.app.
- A mask of 3px blocks switches on in random order, staggered per text group.

**Archives.**
- While Archives is centred and still, the real SVG sits over the canvas card.
- Hovering plays the footer's isometric cascade (`footer/archives-scene.js`).
- The canvas copy fades out during the hover, so nothing ghosts.

**Hover cursor.**
- Over the centre image: the Figma hand (30x30, fingertip on the pointer) plus "See the work".
- Clicking there opens that project's page.
- Everywhere else: the normal cursor.

**Load animation (`work/loader.js`, ~3.5s).** The logo build from Figma `166:23676`: the choreography is kept,
the timing and easing are redone. It is built at the navbar logo's exact size (110px). No canvas, no guide lines, no flash.
1. **Land (0–0.8s):** both S marks, stacked, arrive at 2.2x and settle to logo size (`expo.out`).
2. **Build (0.85–2.65s):** the S marks part onto two rows.
   - The S of "Sagar" sweeps left, and "agar" rises in letter by letter in its wake.
   - "hiyan" slides out of the lower S letter by letter.
   - The lower row rises into line.
   - The words are split into letters at runtime: their sub-paths are grouped by horizontal overlap.
3. **Hold:** a short beat to read "Sagar Shiyan".
4. **Out (2.95s):** the loader fades over 0.4s. The navbar logo is already in place underneath.

Details:
- Easing: `expo.inOut` for travel, `expo.out` for arrivals, `power1.out` for fades.
- Beats are timeline labels: `land`, `split`, `sweep`, `merge`, `out`.
- Plays **once per tab** (sessionStorage `sg-loaded`). Skipped with reduced motion or `?work`.
  A click or any key skips it.
- The inline `<head>` script adds `html.is-loading` before first paint.
- The intro words wait for the `loader:done` event.
- **Testing tip:** a hidden browser pane throttles frames. To check timing, step GSAP with `gsap.updateRoot(t)`.

**Card entry (after the first scroll, ~3s).** This is portal-carousel's own rise-and-grow, about 25% quicker:
- Rise 0.8s, stagger 0.06, pause 0.2s, grow 2s, bloom 1.1s.
- The cards rise as **one ordered column, top card first**, so none overtakes another. A random order used to
  make cards above the centre (e.g. Archives) travel up past the rest.
- Tuned by the `entry` keys in `P` (`work.js`).

**Intro jellyfish (`work/jellies.js`).** Faint ASCII jellyfish drift across the whole intro, behind the text.
Only the jellyfish are drawn: no grid, no background. The style is from `stackedlol/ascii-sharks` (its X clip),
but that repo has no licence, so this is written from scratch.
- **Count:** a few, scaled to the screen: about 1 per 400k px² (3 on a 1440×900 desktop, 2 on a phone, max 4).
  Every one is a different size: the biggest bell is 168px wide, down to 60% of that.
- **Style:** each character sits on its own small grey tile (6×9px cells, 8px system monospace).
  - Gradient: densest in the **middle** of the bell, softening toward the edges (like a glowing core in a
    translucent dome). Dense characters (`:;t%SX8@`) sit in the core. A thin crisp outline and a rim line
    keep the silhouette defined, and faint radial canals run through the dome.
  - Tiles go up to 9% black and characters up to 52%.
  - About 5% of the bell's cells show a muted accent (sage, coral, lilac, teal) that shimmers.
  - A very soft shadow sits under the bell.
  - Only the cells around each jellyfish are visited each frame.
- **Bell:** pulses on a smooth cosine curve (quicker squeeze, slower relax, no kinks), and the thrust is spread
  across the whole squeeze. It then glides a long way (low drag), turns lazily, and drifts mostly upward,
  wrapping from one edge to the other. The scalloped rim ripples as it pulses.
- **Tentacles:** 6 trailing strands plus 3 frilly arms on the biggest (4 + 2 on the smallest, so small ones stay clean), 16-node chains that:
  - stream behind the actual direction of travel;
  - carry a slow travelling wave that grows toward the tips;
  - flick out on each pulse;
  - ease toward their positions so they curve smoothly.
  - **Always hang down:** the trail direction is kept within ~60° of straight down, and each segment is hard-limited to
    never sit above the one it hangs from and never stretch past 1.2× its length. Before this, swimming downward
    made the tentacles stream *up over the bell* (and a fast dart stretched the chain up to 500px). Measured over
    ~17,000 frames incl. ~3,300 swimming down: no tip ever rose more than 11px above its attachment point.
  - Look: thicker near the bell, thinning to light dots at the tips. Characters follow each strand's direction
    (`|` near-vertical, `/ \` when slanted, `: ;` texture); the oral arms carry `% ; : t` with small tiles near the bell.
- **Hover:** the jellyfish eases away and the tentacles sway aside.
- **Roaming:** each jellyfish swims toward a goal anywhere on the page, with a lazy meander.
  - Goals favour the edges: 50% a corner, 30% the middle of an edge (top, bottom, left or right), 20% anywhere.
    A uniform pick would leave them crossing the middle most of the time.
  - Each goal gets enough time to be reached at the calm cruising speed (about 30px/s plus a linger, 10–34s), and a new
    one is picked on arrival.
  - Cruising is calm: median ~30px/s, top ~60px/s. The edge walls sit close to the edges so corners are reachable.
  - Measured over 40s on a 1440×900 page: 16–45% of the time in the central zone (it was 55% when destinations
    were uniform), with the rest at the edges and corners.
- **Touch ripple:** a click or tap anywhere on the intro sends a ripple out from that point. It is made of
  ASCII characters (`.:-=+*#%`) that only exist while a ring passes, so with no touch the page stays white.
  - **Two separate rings** per click, the second 0.22s behind the first at 80% strength.
  - The rings start fast, slow as they spread to about 300px, fade in and out smoothly, and are gone after about 1.8s.
  - Readable: the ripple has its own larger grid (8px characters in 7×11px cells), up to 85% strength.
  - Colour: blue near the touch, then azure, then cyan further out.
  - Characters are random: each cell picks its own character (re-rolled about 7 times a second). The ring's
    strength sets how bright it is and leans the choice toward denser characters at the crest.
  - Several ripples can overlap (max 5).
- **Jellyfish reaction:** each jellyfish within 300px reacts when the wave actually reaches it.
  - It is carried outward by the passing wave, and lights up and tints slightly blue, then fades back.
  - It darts off in a **new random direction every time**, but around "directly away from the touch": about ±17°
    up close, up to ±46° farther out (a wider spread had some swim *toward* the tap). Measured: 400–660px per
    tap, 89% directly away on average.
  - The push ramps in over 0.35s, then it glides a long way.
  - It turns on a soft spring, but never aims more than a capped angle (about 25–55°, a bit more right after a
    touch) away from where it already faces, with a matching top turning speed. A far-off direction is reached
    through a gentle curve, never a sudden spin.
  - **Less rotation:** the bell is drawn tilted by `0.75 × sin(heading)`, so at most about 43° even when it swims
    sideways or down (a sine, so there is never a jump when it turns right round).
  - Right after a touch the cap grows (up to ×2.3 while escaping), so it can face where it darts.
  - The cap is random (about 30–80°) and **different every touch**, plus a slow random drift in heading, so
    each escape curves differently.
  - Long travel: a stronger, varied dart, much less drag while escaping, ~4s of escaping, and far roaming
    goals afterwards. Measured: 400–740px per tap.
  - A dart never runs into a wall: within ~150px of an edge it slides along the wall instead (keeping the
    along-wall part of "away"), in a corner it heads for the middle, and touching the edge wall picks a fresh
    spot to roam to. (A mirrored heading used to send some darts toward the touch, and a longer lookahead
    triggered this far too often.)
- **Spreading out:** jellyfish gently push apart when they get close (within ~2 bell-widths), and each new roaming
    spot is the best of 6 random candidates, the one farthest from every other jellyfish and its destination.
    The bell wobbles elastically for about 2s.
- **Edges:** jellyfish never leave the page. A soft, springy wall near each edge bounces them back, and they
  turn to swim back in.
- **Lifecycle:** fades in with the intro, fades out on the first scroll (the loop stops), pauses when the tab
  is hidden, and draws a still frame under reduced motion.
- **Tuning:** the constants at the top of the file (`TILE_MAX`, `GLYPH_MAX`, `ACCENTS`, `BELL_R`, `MIN_SIZE`,
  `CW`/`CH`/`FONT_PX`, `HOVER_R`; ripple: `RING_LIFE`, `RING_DELAY`, `RING_STRENGTH`, `RIP_REACH`, `RIP_MAX`, `RIP_HUES`, `RCW`/`RCH`/`RFONT_PX`, `KICK_R`).
  The count formula is near the bottom.
- **Cache:** `index.html` loads `work/work.js?v=2` and `work/jellies.js?v=13`. Bump the number after editing
  them, or the browser may keep running the old file.
- **Short windows (fixed):** waiting cards now always start fully below the screen, so on windows under ~600px
  tall they no longer peek into the intro.

**Intro reveal.** Once the loader is done and the font is ready, the intro comes in in this order:
1. The "Based in Kerala, India" pill fades up.
2. The sentence rises **word by word** out of per-word masks (30ms stagger, 0.9s each, ease-out). `work.js`
   wraps the words, and `work.css` styles `.intro-text .w`.
3. "(Scroll to see work)" arrives last, at 0.6s.

**Intro → work.**
- Pure CSS transitions (0.7s opacity / 0.85s move) driven by classes on `<html>`. The work starts 0.3s after the intro (`WORK_DELAY`):
  - `intro-pre`: intro words hidden until the font is ready
  - `is-intro`: work hidden 48px below
  - `is-work`: intro words gone 48px up
- The inline script in `<head>` adds the first two before the first paint, so nothing flashes.
- The animations use the CSS `translate` property, so they stack with the centring transforms.
- Image paths and project links in `work.js` resolve against the script's own location
  (`import.meta.url`), so the page works from the root.

**Input.**
- Mouse wheel anywhere, drag on the canvas, ↑ ↓ keys.
- Clicking the top or bottom quarter of the screen goes to the previous / next card.

---

## Changes from portal-carousel (and why)

| Setting | Original | Here | Why |
|---|---|---|---|
| `whiteGlow` | 0.24 | 0 | the centre white glow washed the images out |
| `centerDark` | 0.09 | 0 | same: images keep their true Figma colours |
| `peek` | 0.07 | 0.05 | neighbours peek in "a little" |
| parallax zoom | always on | only while a card is off-centre | the resting image shows the full Figma crop |
| card alpha | ignored | texture alpha used | phone shapes, rounded corners, SVG transparency |
| card size | 25% of screen height | exact Figma px | Sagar: never resize the images |
| `?entry=0` | yes | kept | testing |

The portal maths (`uAlongPx` = screen height, `sizeX` 0.575) is **exactly the original**.

---

## Things tried and reverted

- **Straight dial column.** Replaced by the clock arc, which Sagar preferred.
- **Wider portal (`sizeX` 0.8) and portal scaled to the card.** Both changed the warp feel, so both were reverted to the original.
- **Hiding the neighbours completely.** Sagar wanted them to peek.
- **"Signal" and "materialize" text reveals (red).** Sagar chose the dissolve.
- **Shrinking cards on shorter windows.** Removed: exact Figma size always.

---

## Known trade-offs / open items

- The Figma cards are about 35% of the screen height, against the original's 25%. So at rest the
  corners of the centre image touch the glass rim and bend slightly. Fixing that without changing the
  warp means smaller cards, which goes against the exact Figma size.
- Below 1200px there is no Figma design yet. The dial is hidden and the text sits under the image as a stopgap.
- Archives still links to `#`.
- The new Khadi image is only 976px wide in Figma, a little under 2x, so it is slightly soft on retina screens.
- The intro has no Figma phone layout; below 768px the text gets 16px side margins as a stopgap.

---

## Tuning quick reference (`work.js`)

| Want to change | Edit |
|---|---|
| Glass / warp | the `P` object (same keys as portal-carousel `DEFAULTS`) |
| Neighbour peek | `P.peek` |
| Dial spacing / tilt | `DIAL_STEP`, `DIAL_R` |
| Text reveal speed | `duration` / `stagger` in `showInfo` |
| Text reveal block size | `PX`, `STEPS` |
| Project text, order, links | `PROJECTS` |
| Card images | `work/content/` (bump `?v=` on a replaced file) |

## Jellyfish movement rewrite (jellies.js v=37)
Replaced the patched flee/cap/bias steering with one swim model: each bell squeeze pushes along the bell's axis,
tilt is capped at ~49° (MAX_TILT 0.85) and is what's drawn, turning happens mostly during squeezes, it rests and
sinks to go down (SINK 15, goal-below activity 0.06), and taps shove it away and then trigger an escape tilt plus fast pulses.
Measured at 1440×900 over 4 minutes: max tilt 52°, avg speed 15px/s, every 3×3 zone visited, never off-page, taps push 130–280px away.
