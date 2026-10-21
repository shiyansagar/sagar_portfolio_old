// Home load animation — the logo build from Figma 166:23676 (choreography kept, timing + easing redone).
// Built at the navbar logo's exact size (110px). About 3.5s, plays once per browser tab (sessionStorage),
// skipped with reduced motion. A click or any key skips it. Light: GSAP on a few SVG nodes, no canvas.
//
//   1  land   the S (both S marks stacked) settles from large to logo size
//   2  build  the S marks part onto two rows; the S of "Sagar" sweeps left and "agar" rises in letter by
//             letter in its wake; "hiyan" slides out of the lower S letter by letter; the lower row rises
//             into line: "Sagar Shiyan"
//   3  out    the loader fades away, revealing the page (the navbar logo is already in place)

import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.13.0/index.js";

const root = document.documentElement;
const loader = document.getElementById("loader");
const LOGO_SVG = new URL("../navbar/assets/logo-portfolio.svg", import.meta.url).href;
const NAV_LOGO_W = 110;                                       // = .nav-logo width in navbar.css
const SVG_NS = "http://www.w3.org/2000/svg";

function finish() {
  root.classList.remove("is-loading");
  loader?.remove();
  try { sessionStorage.setItem("sg-loaded", "1"); } catch { /* storage off: it simply plays again */ }
  document.dispatchEvent(new Event("loader:done"));
}

if (!root.classList.contains("is-loading") || !loader) loader?.remove();
else run().catch(finish);   // any failure (asset blocked, etc.): just show the page

// A word in the logo is one <path> of several sub-paths (letters + their counters, the dot of the i).
// Split it into one <path> per letter: sub-paths that overlap horizontally belong to the same letter.
function splitLetters(path) {
  const subs = path.getAttribute("d").match(/M[^M]*/g) || [];
  if (subs.length < 2) return [path];
  const boxes = subs.map((d) => {
    const p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("d", d);
    path.parentNode.appendChild(p);
    const b = p.getBBox();
    p.remove();
    return { d, x0: b.x, x1: b.x + b.width };
  }).sort((a, b) => a.x0 - b.x0);
  const letters = [];
  for (const s of boxes) {
    const last = letters[letters.length - 1];
    if (last && s.x0 < last.x1 - 0.2) { last.d += s.d; last.x1 = Math.max(last.x1, s.x1); }
    else letters.push({ d: s.d, x1: s.x1 });
  }
  const g = document.createElementNS(SVG_NS, "g");
  const els = letters.map(({ d }) => {
    const p = path.cloneNode(false);
    p.setAttribute("d", d);
    g.appendChild(p);
    return p;
  });
  path.replaceWith(g);
  return els;
}

async function run() {
  const svgText = await fetch(LOGO_SVG).then((r) => r.text());
  const logoBox = loader.querySelector(".ld-logo");

  // inline the navbar logo so each part can move; Illustrator's .cls-N names are prefixed against clashes
  logoBox.innerHTML = svgText.replace(/<\?xml[^>]*>/, "").replace(/cls-(\d+)/g, "ld-cls-$1");
  const svg = logoBox.querySelector("svg");
  // sA = the S of "Sagar" (x 0), sB = the S of "Shiyan" (x 55)
  const [agarPath, sB, sA, hiyanPath] = [...svg.children].filter((n) => n.tagName !== "defs");
  logoBox.style.setProperty("--ld-w", `${NAV_LOGO_W}px`);
  const VB_W = 113.03;
  const R = 24;                                               // row gap while the name is on two rows, logo units
  const agar = splitLetters(agarPath), hiyan = splitLetters(hiyanPath);

  // centre on the S artwork (not its clip box): sA ≈ x 7.1–15.9, y 3.5–19.6
  const a = sA.getBBox(), b = sB.getBBox();
  const ac = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
  const bc = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  const stack = { x: VB_W / 2, y: ac.y + R / 2 };              // both S marks start here: centre, between the rows

  // ---- start state ----
  gsap.set(logoBox, { opacity: 1 });                          // the parts carry their own visibility
  gsap.set([sA, sB], { transformOrigin: "50% 50%" });
  gsap.set(sA, { x: stack.x - ac.x, y: stack.y - ac.y, scale: 2.2, opacity: 0 });
  gsap.set(sB, { x: stack.x - bc.x, y: stack.y - bc.y, scale: 2.2, opacity: 0 });
  gsap.set([...agar, ...hiyan], { opacity: 0 });
  gsap.set(agar, { y: 6 });
  gsap.set(hiyan, { x: -6, y: R });

  // easing: TRAVEL things crossing space · LAND things arriving · FADE opacity
  const TRAVEL = "expo.inOut", LAND = "expo.out", FADE = "power1.out";
  const tl = gsap.timeline({ delay: 0.15, onComplete: finish });
  tl.addLabel("land", 0)
    .addLabel("split", 0.85)
    .addLabel("sweep", 1.3)
    .addLabel("merge", 2.05)
    .addLabel("out", 2.95);                                   // a beat to read the full name first

  // 1 land: the S arrives large and settles to size
  tl.to([sA, sB], { opacity: 1, duration: 0.3, ease: FADE }, "land")
    .to([sA, sB], { scale: 1, duration: 0.8, ease: LAND }, "land");

  // 2 build: part onto two rows → sweep, letters rising in its wake → the lower row rises into line
  tl.to(sA, { x: stack.x - ac.x - 8, y: 0, duration: 0.5, ease: TRAVEL }, "split")
    .to(sB, { x: 0, y: R, duration: 0.5, ease: TRAVEL }, "split")
    .to(sA, { x: 0, duration: 0.75, ease: TRAVEL }, "sweep")
    // "agar": right to left, as the S passes each letter
    .to([...agar].reverse(), { y: 0, opacity: 1, duration: 0.55, ease: LAND, stagger: 0.06 }, "sweep+=0.25")
    // "hiyan": out of the lower S, left to right
    .to(hiyan, { x: 0, opacity: 1, duration: 0.55, ease: LAND, stagger: 0.05 }, "sweep+=0.12")
    .to([sB, ...hiyan], { y: 0, duration: 0.6, ease: TRAVEL }, "merge");

  // 3 out: the loader fades, the page (and its navbar logo) is underneath
  tl.to(loader, { opacity: 0, duration: 0.4, ease: FADE }, "out");

  const skip = () => tl.progress(1);
  loader.addEventListener("pointerdown", skip, { once: true });
  addEventListener("keydown", skip, { once: true });
}
