// Archives illustration — isometric hover scene.
// Ported from "new portfolio/scene.js" (IsoScene, "uiux" config): archives.svg is the same artwork,
// with the same groups (float_1–6, phone, project_name).
//
//   AT REST   the scene sits slightly under-exposed.
//   ON HOVER  it lifts to full exposure while the elements step out along the isometric grid,
//             one after another (tiny 0.025s offsets, so it reads as one movement).
//   AFTER     each element starts its own float the moment it lands, until the pointer leaves.
//
// Hover offset and idle float would fight over one transform, so every animated group is wrapped:
//   <g class="iso-lift">   <- hover offset
//     <g id="float_1">     <- idle float

import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.13.0/index.js";

const SVG_NS = "http://www.w3.org/2000/svg";

// Isometric axes measured off the floor plate (~30° hand-drawn isometric)
const AXIS = {
  leftBack: { x: -1, y: -0.53 },
  rightBack: { x: 1, y: -0.58 },
  leftFront: { x: -1, y: 0.58 },
  rightFront: { x: 1, y: 0.53 },
  up: { x: 0, y: -1 },
};

// The reference artwork is ~800px wide; here it is 232px (145 on phone). Authored distances are in
// SVG units, so at this size they would only move ~10px — scale them up so the step-out reads.
const DIST_SCALE = 2;
const BOB_SCALE = 2;
// Margin round the artboard (fraction of its longest side) so moved pieces never clip.
// footer.css grows the box by the same amount, so the drawing keeps its Figma size.
const PAD = 0.13;
// No exposure filter: a filter on the SVG re-rasterises the whole drawing every frame while
// pieces move. Dropping it keeps the artwork exactly as in Figma and the animation cheap.

const HOVER_DEBOUNCE = 100; // entering only — leaving is instant
const SPEED = 0.52; // global pace of the cascade (lower = slower)
const EXIT_BOOST = 2.1; // the exit runs a little crisper than the entrance

const SCENE = {
  moves: [
    { id: "float_4", axis: "up", dist: 34, at: 0.0, duration: 0.65 },
    { id: "float_1", axis: "leftBack", dist: 40, at: 0.025, duration: 0.65 },
    { id: "float_2", axis: "rightBack", dist: 34, at: 0.05, duration: 0.65 },
    { id: "float_3", axis: "leftFront", dist: 36, at: 0.075, duration: 0.65 },
    { id: "float_6", axis: "leftBack", dist: 36, at: 0.1, duration: 0.65 },
    { id: "float_5", axis: "leftBack", dist: 42, at: 0.125, duration: 0.65 },
    { id: "phone", axis: "up", dist: 30, at: 0.15 },
    // drawn under the floor plate: a short nudge out along the ground axis
    { id: "project_name", axis: "rightFront", dist: 46, at: 0.1, duration: 0.4, ease: "back.out(1.5)" },
    // second name pill (new in this artwork) — slides out down-left, like brand_name in the bakery scene
    { id: "Brand_Name", axis: "leftFront", dist: 46, at: 0.125, duration: 0.4, ease: "back.out(1.5)" },
  ],
  bob: { ids: ["float_1", "float_2", "float_3", "float_4", "float_5", "float_6", "phone", "project_name", "Brand_Name"], amp: 11 },
};

// Illustrator's generic .cls-N names would clash with other inlined SVGs — prefix them
function namespaceClasses(text, prefix) {
  text = text.replace(/\.cls-(\d+)/g, `.${prefix}-cls-$1`);
  return text.replace(/class="([^"]*)"/g, (m, list) =>
    `class="${list.trim().split(/\s+/).map((c) => (/^cls-\d+$/.test(c) ? `${prefix}-${c}` : c)).join(" ")}"`
  );
}

function wrapInGroup(el, className) {
  const g = document.createElementNS(SVG_NS, "g");
  g.setAttribute("class", className);
  el.parentNode.insertBefore(g, el);
  g.appendChild(el);
  return g;
}

export async function mountArchives(link, src) {
  const art = link?.querySelector(".ft-archives-art");
  if (!art || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let text;
  try {
    const res = await fetch(src);
    if (!res.ok) return;
    text = await res.text();
  } catch {
    return; // keep the <img> fallback
  }
  const doc = new DOMParser().parseFromString(namespaceClasses(text, "archives"), "image/svg+xml");
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== "svg" || root.querySelector("parsererror")) return;

  const svg = document.importNode(root, true);
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  // Margin round the artboard so elements never clip mid-move (CSS grows the box to match)
  const vb = svg.viewBox.baseVal;
  const pad = Math.max(vb.width, vb.height) * PAD;
  art.style.setProperty("--art-pad", PAD);
  svg.setAttribute("viewBox", `${vb.x - pad} ${vb.y - pad} ${vb.width + pad * 2} ${vb.height + pad * 2}`);

  art.replaceChildren(svg);
  art.classList.add("is-scene");

  // Wrap each moving group
  const layers = {};
  SCENE.moves.forEach(({ id }) => {
    const group = svg.querySelector(`#${CSS.escape(id)}`);
    if (group) layers[id] = { group, lift: wrapInGroup(group, "iso-lift") };
  });

  let hovered = false;
  let timer = 0;
  const idle = {};

  function startBob(id) {
    const layer = layers[id];
    if (!layer || idle[id]) return;
    const i = SCENE.bob.ids.indexOf(id);
    if (i === -1) return;
    const amp = SCENE.bob.amp * BOB_SCALE;
    // a drift plus a touch of roll — desynced by index so nothing marches in step
    idle[id] = gsap.to(layer.group, {
      y: -amp,
      x: (i % 2 ? -1 : 1) * amp * 0.35,
      rotation: (i % 2 ? -1 : 1) * 1.4,
      transformOrigin: "50% 50%",
      duration: 1.6 + i * 0.19,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
  }

  function stopIdle() {
    Object.values(idle).forEach((t) => t.kill());
    Object.keys(idle).forEach((k) => delete idle[k]);
    const targets = SCENE.bob.ids.map((id) => layers[id]?.group).filter(Boolean);
    if (targets.length) gsap.to(targets, { x: 0, y: 0, rotation: 0, duration: 0.3 / SPEED, ease: "power2.out" });
  }

  // The cascade (exposure is kept off it so it can snap off fast on the way out)
  const tl = gsap.timeline({ paused: true });
  SCENE.moves.forEach((m) => {
    const layer = layers[m.id];
    if (!layer) return;
    const axis = AXIS[m.axis];
    tl.to(layer.lift, {
      x: axis.x * m.dist * DIST_SCALE,
      y: axis.y * m.dist * DIST_SCALE,
      transformOrigin: "50% 50%",
      duration: m.duration || 0.45,
      ease: m.ease || "back.out(1.7)",
      onComplete: () => hovered && startBob(m.id),
    }, m.at);
  });

  function enter() {
    if (hovered) return;
    hovered = true;
    tl.timeScale(SPEED).play();
  }
  function leave() {
    clearTimeout(timer);
    if (!hovered) return;
    hovered = false;
    stopIdle(); // kill the loops now, not after the reverse
    tl.timeScale(SPEED * EXIT_BOOST).reverse();
  }

  // Off screen (e.g. hovered, then scrolled away): pause the float loops; resume when back
  new IntersectionObserver(([e]) => {
    Object.values(idle).forEach((t) => (e.isIntersecting ? t.resume() : t.pause()));
  }).observe(art);
  const enterSoon = () => {
    clearTimeout(timer);
    timer = setTimeout(enter, HOVER_DEBOUNCE);
  };

  link.addEventListener("pointerenter", (e) => e.pointerType !== "touch" && enterSoon());
  link.addEventListener("pointerleave", leave);
  link.addEventListener("focus", enter);
  link.addEventListener("blur", leave);
  // touch: a tap plays the scene once it's in view; tapping again follows the link
  link.addEventListener("touchstart", () => (hovered ? null : enter()), { passive: true });

  link._archives = { tl, enter, leave };
}
