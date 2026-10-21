// Work page — the portal carousel from "home page trial/portal-carousel", ported to plain ES modules
// (no Vite, no parameter panel). Four cards = the four Figma frames. Only the images (and the
// archives SVG) go through the glass; the dial on the left and the details on the right are DOM.
//
//   dial    turns with the cards like a clock face (driven by the same spring, every frame)
//   info    swaps per card with a subtle staggered fade-up
//   archives  while centred and at rest, the live SVG sits over the canvas card so the
//             footer's isometric hover scene (footer/archives-scene.js) plays on it

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js";
import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.13.0/index.js";
import { cardVert, cardFrag, lensVert, lensFrag } from "./shader.js";
import { mountArchives } from "../footer/archives-scene.js";
import { navigate, dissolve } from "../transition/pixel.js?v=3";

const ARCHIVES_SVG = new URL("../footer/assets/archives.svg?v=2", import.meta.url).href;

// ---- content, straight from the Figma frames. w / h = card size in Figma px ----
// order = the dial in Figma 171:24979: Archives, Khadi Wool, [OkCupid], Ecommerce, Surabhi Bakery
const PROJECTS = [
  {
    name: "OkCupid", img: "content/okcupid.webp", w: 547.5, h: 357, href: "../okcupid/",
    eyebrow: ["UI UX Case Study", "[01]"], title: "OkCupid Dating App", meta: "2 Weeks - Timeline", fixed: true,
    desc: "OkCupid is a dating app that uses a question-based matching algorithm to help users find compatible people.",
    role: ["UX Research", "Synthesis", "Ideation", "UI Design"],
  },
  {
    name: "Ecommerce", img: "content/four.webp", w: 548, h: 323, href: "../four/",
    eyebrow: ["Internship Project · Under NDA", "[02]"], title: "E-commerce Experience for FOUR brand", meta: "6 Weeks - Timeline", fixed: true,
    desc: "Designing an E-commerce Experience for FOUR, a Sailing Brand Built for Women. An internship project",
    role: ["Visual Design", "UI/UX Design Intern."],
  },
  {
    name: "Surabhi Bakery", img: "content/surabhi.webp", w: 548, h: 322, href: "../branding/",
    eyebrow: ["Branding & Promotion", "[03]"], title: "Rebranding Surabhi Bakery", meta: "Old Bakery in Jodhpur", roleFixed: true,
    desc: "Surabhi Bakery is a neighbourhood bakery in Jodhpur’s old city, known for its handmade biscuits. This project focused on building a cohesive brand identity that preserves its heritage while improving visual clarity and communication.",
    role: ["Logo Design", "Illustration", "Pattern Design"],
  },
  {
    name: "Archives", svg: ARCHIVES_SVG, w: 548, h: 397, href: "../archives/",
    eyebrow: ["My Personal shit"], title: "Archives",
    desc: "These are my miscellaneous work i have done as a design aspirant go check it out.",
  },
  {
    name: "Khadi Wool", img: "content/khadi.webp?v=2", w: 548, h: 322, href: "../crd/",
    eyebrow: ["Craft Cluster", "[04]"], title: "Khadi Wool in Bikaner", meta: "3 Weeks - Timeline",
    desc: "We aimed to study the craft of khadi wool in Bikaner and to understand the social dynamics and systemic gaps within its production community.",
    role: ["Ethnography", "Participant Observation", "System Mapping", "Field Analysis", "Interview"],
  },
];
// images and links are written relative to this folder; resolve them here so the page can live at the root
PROJECTS.forEach((p) => {
  if (p.img) p.img = new URL(p.img, import.meta.url).href;
  if (p.href !== "#") p.href = new URL(p.href, import.meta.url).href;
});
const ARCH = PROJECTS.findIndex((p) => p.svg);
const REF = { w: 548, h: 357 };                        // spacing / lens reference (the OkCupid frame)

// ---- tunables: portal-carousel DEFAULTS (layout keys replaced by the Figma sizes above) ----
// peek: neighbours show a little. sizeX is the original 0.575.
// whiteGlow / centerDark 0: the centre glow washed the image out — now it shows its true colours.
const P = {
  vertical: 1,
  stack: 0, gap: 111, peek: 0.05, sideScale: 1, farPush: 1, radius: 0, edgeLight: 0,
  shape: 0, round: 0.4, sizeX: 0.575, sizeY: 1.385, rotation: 49, posX: 0.5, posY: 0.5,
  oAspect: 1.92, cardCross: 0.47,
  zoom: 0, dispersion: 11, blur: 0, rimStart: 0.46, rimEase: 1.3, rimRelease: 0.82, outside: 1,
  rimTangential: 0.6, rimInward: 0, rimFreq1: 2, rimFreq2: 1, waveSpeed: 0, mirror: 0, glowOnBg: 0,
  stick: 1, stickPx: 260,
  glow: 4.2, whiteGlow: 0, novaSize: 12, centerDark: 0, blueRing: 6, ringRadius: 0.49, ringWidth: 0.014,
  shimmerFreq: 12, shimmerSpeed: 3.5, shimmerDepth: 0.12, blueColor: "#009dff",
  rimLine: 1.4, rimLinePos: 0.488, rimLineWidth: 0.003, vignette: 0, vignetteSize: 0.3,
  // entry (portal-carousel's, ~25% quicker): cards rise from below small, then grow while the portal blooms
  entry: 1, entryStartPx: 80, riseDuration: 0.8, riseStagger: 0.06, fromBelow: 0.9,
  growDelay: 0.2, growDuration: 2, growStagger: 0.07, lensBloom: 1.1,
  motionStyle: 1, springStiffness: 55, springDamping: 0.95, bend: 0.5, bendMax: 30,
  parallax: 0.12, warpBoost: 0.8, dispBoost: 1.2,
  ease: 0.09, snapEase: 0.05, snapIdleMs: 120, pageAt: 0.08, touchEase: 0.22, wheel: 1.4, drag: 1.6,
  friction: 0.865, shrink: 0.25, shrinkMax: 60, shrinkAttack: 0.25, shrinkDecay: 0.06, motionBlur: 0.12,
  bg: "#ffffff",
};
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduce || new URLSearchParams(location.search).get("entry") === "0") P.entry = 0;   // ?entry=0 skips the load-in (testing)

// ---- renderer ----
const stage = document.getElementById("stage");
const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
const dpr = Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(dpr);
stage.appendChild(renderer.domElement);
const canvas = renderer.domElement;

const rowScene = new THREE.Scene();
const rowCam = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
const fbo = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
const covRT = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });

// textures: rasters load directly; the archives SVG is drawn into a 2x canvas first
const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
function loadCard(p) {
  const card = { tex: null, aspect: p.w / p.h, ready: false };
  const done = (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    card.tex = t;
    card.ready = true;
    cards[PROJECTS.indexOf(p)].u.uMap.value = t;
  };
  if (p.svg) {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = Math.round(p.w * 2); c.height = Math.round(p.h * 2);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      done(new THREE.CanvasTexture(c));
    };
    img.src = p.svg;
  } else new THREE.TextureLoader().load(p.img, done);
  return card;
}

const N = PROJECTS.length;
const plane = new THREE.PlaneGeometry(1, 1, 24, 24);
const blank = new THREE.Texture();
const cards = PROJECTS.map((p) => {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: blank }, uSize: { value: new THREE.Vector2(1, 1) },
      uRadius: { value: 0 }, uEdgeLight: { value: 0 }, uFade: { value: 1 },
      uTexAspect: { value: 1 }, uReady: { value: 0 },
      uBend: { value: 0 }, uVert: { value: 1 }, uT: { value: 0 }, uParallax: { value: 0 },
    },
    vertexShader: cardVert, fragmentShader: cardFrag,
    transparent: true, depthTest: false, depthWrite: false,
  });
  const mesh = new THREE.Mesh(plane, mat);
  rowScene.add(mesh);
  return { mesh, u: mat.uniforms, p, src: null };
});
cards.forEach((c) => { c.src = loadCard(c.p); });

// glass portal
const LENS_MAP = {
  uSizeX: "sizeX", uSizeY: "sizeY", uShape: "shape", uRound: "round",
  uZoom: "zoom", uDispersion: "dispersion", uBlur: "blur",
  uRimStart: "rimStart", uRimEase: "rimEase", uOutside: "outside", uRimRelease: "rimRelease", uRimTangential: "rimTangential", uRimInward: "rimInward",
  uRimFreq1: "rimFreq1", uRimFreq2: "rimFreq2", uWaveSpeed: "waveSpeed", uGlowOnBg: "glowOnBg",
  uStick: "stick", uMirror: "mirror",
  uGlow: "glow", uWhiteGlow: "whiteGlow", uNovaSize: "novaSize", uCenterDark: "centerDark",
  uBlueRing: "blueRing", uRingRadius: "ringRadius", uRingWidth: "ringWidth",
  uShimmerFreq: "shimmerFreq", uShimmerSpeed: "shimmerSpeed", uShimmerDepth: "shimmerDepth",
  uRimLine: "rimLine", uRimLinePos: "rimLinePos", uRimLineWidth: "rimLineWidth",
  uVignette: "vignette", uVignetteSize: "vignetteSize",
};
const lensU = {
  tScene: { value: fbo.texture }, uRes: { value: new THREE.Vector2() },
  uAspect: { value: 1 }, uTime: { value: 0 }, uFx: { value: 0 }, uMB: { value: 0 },
  uEnergy: { value: 0 }, uWarpBoost: { value: 0 }, uDispBoost: { value: 0 },
  uVertical: { value: 1 }, uCenter: { value: new THREE.Vector2(0.5, 0.5) },
  uRotation: { value: 0 }, uBlueColor: { value: new THREE.Color() }, uBg: { value: new THREE.Color() },
  uStickPx: { value: 28 }, tCover: { value: covRT.texture },
  uAlongPx: { value: 1 }, uCrossPx: { value: 1 }, uCardCross: { value: 0.47 }, uOAspect: { value: 1.92 },
};
for (const k in LENS_MAP) lensU[k] = { value: P[LENS_MAP[k]] };
lensU.uCenter.value.set(P.posX, P.posY);
lensU.uRotation.value = THREE.MathUtils.degToRad(P.rotation);
lensU.uBlueColor.value.set(P.blueColor);
lensU.uBg.value.set(P.bg);
lensU.uCardCross.value = P.cardCross;
lensU.uOAspect.value = P.oAspect;
lensU.uWarpBoost.value = P.warpBoost;
lensU.uDispBoost.value = P.dispBoost;
lensU.uStickPx.value = P.stickPx * dpr;
const lensScene = new THREE.Scene();
const lensCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const lensMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 2),
  new THREE.ShaderMaterial({ uniforms: lensU, vertexShader: lensVert, fragmentShader: lensFrag, depthTest: false, depthWrite: false }),
);
lensMesh.frustumCulled = false;
lensScene.add(lensMesh);

// ---- layout ----
let W = 1, H = 1, K = 1;                               // K = Figma px -> screen px (1 on desktop)
const archEl = document.getElementById("archives");
function resize() {
  W = stage.clientWidth || innerWidth;
  H = stage.clientHeight || innerHeight;
  // desktop: exact Figma size (Sagar: never resize the images). iPad / phone: scale down to fit the width
  // (32 / 14px side padding) and leave room under the card for the project details
  K = W >= 1200 ? 1 : Math.min(1, (W - 2 * (W < 768 ? 14 : 32)) / REF.w, (H * 0.42) / REF.h);
  renderer.setSize(W, H, false);
  fbo.setSize(Math.round(W * dpr), Math.round(H * dpr));
  Object.assign(rowCam, { left: -W / 2, right: W / 2, top: H / 2, bottom: -H / 2 });
  rowCam.updateProjectionMatrix();
  lensU.uRes.value.set(W * dpr, H * dpr);
  lensU.uAspect.value = W / H;
  const texel = Math.max(4, P.stickPx / 4);
  covRT.setSize(Math.max(2, Math.ceil(W / texel)), Math.max(2, Math.ceil(H / texel)));
  // iPad / phone: where the tallest card ends, so the details (work.css) sit just under it
  document.documentElement.style.setProperty("--card-end", `${H / 2 + (Math.max(...PROJECTS.map((p) => p.h)) * K) / 2}px`);
  document.documentElement.style.setProperty("--card-w", `${REF.w * K}px`);
  archEl.style.setProperty("--art-w", `${PROJECTS[ARCH].w * K}px`);
  archEl.style.setProperty("--art-h", `${PROJECTS[ARCH].h * K}px`);
}
new ResizeObserver(resize).observe(stage);
resize();

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / Math.max(1e-4, b - a))); return t * t * (3 - 2 * t); };
const wrap = (x) => ((x % N) + N) % N;
const isV = () => P.vertical > 0.5;

const rise = new Array(N).fill(1);
const grow = new Array(N).fill(1);
const S = { fx: 1, entryActive: false, archCanvas: 1 };   // archCanvas 0 = canvas archives card hidden (live SVG shown)

const refSize = () => ({ w: REF.w * K, h: REF.h * K, along: REF.h * K });

function neighbourDistance(full) {
  const L = isV() ? H : W;
  const half = (full.along * P.sideScale) / 2;
  if (P.stack > 0.5) return full.along / 2 + half + P.gap;
  const peeking = L / 2 - P.peek * L + half;
  return Math.max(peeking, full.along / 2 + half + 16);
}

function place(i, t, spacing, shrinkK, bendPx) {
  const c = cards[i], V = isV();
  const at = Math.abs(t), s = Math.sign(t);
  const scale = (1 - (1 - P.sideScale) * Math.min(at, 1)) * shrinkK;
  spacing *= shrinkK;
  const cw = c.p.w * K, ch = c.p.h * K;
  const g = grow[i];
  const startK = Math.min(1, P.entryStartPx / ch);
  const k = startK + (1 - startK) * g;
  const packed = startK + (1 - startK) * Math.max(...grow);
  const d0 = at <= 1 ? t * spacing : s * (spacing + (at - 1) * spacing * P.farPush);
  const d = d0 * packed;
  const w = cw * scale * k, h = ch * scale * k;
  const L = V ? H : W;
  // waiting cards sit below the screen; on short windows fromBelow * L isn't far enough for the cards that
  // belong above the centre, so take whatever is larger: the usual distance or "fully below the bottom edge"
  const riseOff = (1 - rise[i]) * Math.max(P.fromBelow * L, L / 2 + h / 2 + (V ? -d : d) + 20);
  if (V) c.mesh.position.set(0, -d - riseOff, 0);
  else c.mesh.position.set(d + riseOff, 0, 0);
  c.mesh.scale.set(w, h, 1);
  c.u.uSize.value.set(w, h);
  c.u.uRadius.value = P.radius * h;
  c.u.uEdgeLight.value = P.edgeLight;
  c.u.uTexAspect.value = c.src.aspect;
  c.u.uReady.value = c.src.ready ? 1 : 0;
  c.u.uBend.value = bendPx;
  c.u.uVert.value = V ? 1 : 0;
  c.u.uT.value = t;
  c.u.uParallax.value = P.parallax;
  c.u.uFade.value = (1 - smooth(1.6, 2.4, at)) * (i === ARCH ? S.archCanvas : 1);
  c.mesh.visible = c.u.uFade.value > 0.001;
  c.mesh.renderOrder = -Math.round(at * 100);
}

// ---- left dial (Figma 173:25024): turns like a clock face as the cards move ----
// at rest it is exactly Figma: active 20px #414141 (line 25), others 14px #e8e8e8 (line 18), gap 9,
// active row centred on the frame. Rows sit 30.5px (12.5 + 9 + 9) then 27px (18 + 9) apart.
const dial = document.getElementById("dial");
const ON = new THREE.Color("#414141"), OFF = new THREE.Color("#e8e8e8"), tmpC = new THREE.Color();
const dialEls = PROJECTS.map((p, i) => {
  const a = document.createElement("a");
  a.href = p.href;
  a.textContent = p.name;
  a.addEventListener("click", (e) => {
    if (i === wrap(Math.round(cur))) return;            // the active one follows its link
    e.preventDefault();
    if (locked()) return;
    let d = wrap(i - Math.round(target));
    if (d > N / 2) d -= N;
    goTo(Math.round(target) + d);
  });
  dial.appendChild(a);
  return a;
});
const DIAL_R = 240;                                     // px from the clock pivot (to the labels' left)
const DIAL_STEP = 7;                                    // degrees per label, ~30px apart like Figma
function drawDial() {
  for (let i = 0; i < N; i++) {
    // window [-2.5, 2.5): two rows above, two below at rest (Figma); the wrap happens where opacity is 0
    let t = wrap(i - cur + 2.5) - 2.5;
    const at = Math.abs(t), k = Math.min(at, 1);
    // labels ride an arc round a pivot DIAL_R to their left and tilt with it, like a clock hand
    const th = THREE.MathUtils.degToRad(t * DIAL_STEP);
    const x = DIAL_R * (Math.cos(th) - 1), y = DIAL_R * Math.sin(th);
    const lh = 25 - 7 * k;
    const el = dialEls[i];
    el.style.fontSize = `${20 - 6 * k}px`;
    el.style.lineHeight = `${lh}px`;
    el.style.letterSpacing = `${-0.02 * (20 - 6 * k)}px`;
    el.style.transform = `translate(${x}px, ${y - lh / 2}px) rotate(${t * DIAL_STEP}deg)`;
    el.style.color = `#${tmpC.copy(ON).lerp(OFF, k).getHexString()}`;
    el.style.opacity = String(1 - smooth(2, 2.5, at));
    el.tabIndex = at < 2.25 ? 0 : -1;
  }
}

// ---- right: details, swapped per card with a subtle staggered reveal ----
const info = document.getElementById("info");
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function markup(p) {
  const lines = (arr) => arr.map(esc).join("<br>");
  return `
    <p class="wi-eyebrow">${lines(p.eyebrow)}</p>
    <div class="wi-group">
      <p class="wi-title"><a href="${p.href}">${esc(p.title)}</a></p>
      ${p.meta ? `<p class="wi-meta">${esc(p.meta)}</p>` : ""}
    </div>
    <div class="wi-group wi-desc${p.fixed ? " h99" : ""}">
      <p class="wi-label">Description</p>
      <p class="wi-text">${esc(p.desc)}</p>
    </div>
    ${p.role ? `<div class="wi-group wi-role${p.roleFixed ? " h99" : ""}"><p class="wi-label">Role</p><p class="wi-text">${lines(p.role)}</p></div>` : ""}`;
}
// pixel dissolve for the details: transition/pixel.js (shared with the project pages)
let shown = -1, infoTl = null, infoIn = null;
function showInfo(i) {
  if (i === shown) return;
  const first = shown === -1;
  shown = i;
  infoTl?.kill();
  infoIn?.kill();                                       // fast scrolling: never two tweens on one mask
  infoTl = gsap.timeline();
  if (!first && !reduce) infoTl.add(dissolve([...info.children], false, { duration: 0.22, stagger: 0.02 }));
  infoTl.add(() => {
    info.innerHTML = markup(PROJECTS[i]);
    if (!reduce) infoIn = dissolve([...info.children], true, { duration: 0.55, stagger: 0.07 });
  });
}

// ---- archives: live SVG over the centred card so the footer's hover scene plays here too ----
archEl.href = PROJECTS[ARCH].href;
const archArt = archEl.querySelector(".ft-archives-art");
mountArchives(archEl, ARCHIVES_SVG);
let archTween = null;
const setArchLive = (on) => {
  archEl.classList.toggle("is-live", on);
  archTween?.kill();
  archTween = gsap.to(S, { archCanvas: on ? 0 : 1, duration: on ? 0.25 : 0.15, ease: "power1.out" });
};
archEl.addEventListener("pointerenter", () => {
  if (!archArt.classList.contains("is-scene")) return;   // scene off (reduced motion / fetch failed)
  setArchLive(true);
});
archEl.addEventListener("pointerleave", () => {
  const tl = archEl._archives?.tl;
  // swap back to the canvas once the pieces have stepped home
  if (tl && tl.progress() > 0) tl.eventCallback("onReverseComplete", () => setArchLive(false));
  else setArchLive(false);
});
function updateArchives(atRest, active) {
  const show = atRest && active === ARCH;
  if (archEl.hidden === !show) return;
  archEl.hidden = !show;
  if (!show) { archEl._archives?.leave(); setArchLive(false); }
}

// ---- motion: portal-carousel's model ----
let cur = 0, target = 0, velocity = 0, energy = 0;
let cv = 0, vSm = 0;
let dragging = false, touch = false, snapped = true, journey = false, lastInput = 0;
let home = 0;
let last = performance.now();
const lerpK = (k, f) => 1 - Math.pow(1 - k, f);
const spacingPx = () => neighbourDistance(refSize());

function frame(now) {
  const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
  last = now;
  const f = dt * 60;

  if (!dragging) {
    target += velocity * f;
    velocity *= Math.pow(P.friction, f);
    if (Math.abs(velocity) < 1e-4) velocity = 0;
    if (!snapped && !velocity && now - lastInput > P.snapIdleMs) {
      const d = target - home;
      if (Math.abs(d) >= P.pageAt && Math.abs(d) < 1) target = home + Math.sign(d);
      else target = Math.round(Math.abs(d) < P.pageAt ? home : target);
      home = target;
      snapped = true;
      journey = true;
    }
  }
  const prev = cur;
  if (dragging || P.motionStyle < 0.5) {
    const follow = dragging && touch ? P.touchEase : snapped && !journey ? P.snapEase : P.ease;
    cur += (target - cur) * lerpK(follow, f);
    cv = (cur - prev) / dt;
  } else {
    const k = P.springStiffness, c = 2 * Math.sqrt(k) * P.springDamping;
    const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
    for (let s = 0; s < n; s++) { cv += (k * (target - cur) - c * cv) * h; cur += cv * h; }
  }
  if (Math.abs(target - cur) < 1e-5 && Math.abs(cv) < 1e-3) { cur = target; cv = 0; journey = false; }

  const sp = spacingPx();
  const signed = ((cur - prev) * sp) / f;
  vSm += (signed - vSm) * lerpK(0.25, f);
  const norm = Math.min(1, Math.abs(signed) / Math.max(1, P.shrinkMax));
  energy += (norm - energy) * lerpK(norm > energy ? P.shrinkAttack : P.shrinkDecay, f);
  const shrinkK = 1 - P.shrink * energy;

  const V = isV();
  const bendPx = Math.max(-P.bendMax, Math.min(P.bendMax, (V ? -1 : 1) * P.bend * vSm));
  for (let i = 0; i < N; i++) {
    let t = wrap(i - cur);
    if (t >= N / 2) t -= N;
    place(i, t, sp, shrinkK, bendPx);
  }

  const active = wrap(Math.round(cur));
  showInfo(active);
  drawDial();
  updateArchives(!S.entryActive && !dragging && Math.abs(target - cur) < 0.004 && energy < 0.05, active);

  const ref = refSize();
  lensU.uFx.value = S.fx;
  lensU.uTime.value = now / 1000;
  lensU.uVertical.value = V ? 1 : 0;
  lensU.uMB.value = P.motionBlur * energy * 0.012;
  lensU.uEnergy.value = energy;
  // as portal-carousel: lens spans the screen; smaller screens shrink it with the cards (900 = Figma frame height)
  lensU.uAlongPx.value = (K < 1 ? Math.min(V ? H : W, 900 * K) : V ? H : W) * dpr;
  lensU.uCrossPx.value = (V ? ref.w : ref.h) * dpr;

  renderer.setRenderTarget(fbo);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(rowScene, rowCam);
  if (P.stick > 0.001) {
    renderer.setRenderTarget(covRT);
    renderer.clear();
    renderer.render(rowScene, rowCam);
  }
  renderer.setRenderTarget(null);
  renderer.render(lensScene, lensCam);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---- entry: cards rise from below small, then grow while the portal blooms in ----
// They rise as one ordered column, top card first, so none overtakes another on the way up
// (a random order made cards above the centre, e.g. Archives, travel up past the others).
function playEntry() {
  if (!P.entry) return;
  S.entryActive = true;
  rise.fill(0); grow.fill(0); S.fx = 0;
  const c = wrap(Math.round(cur));
  const order = [0, 1, -1, 2, -2].map((o) => wrap(c + o)).filter((v, i, a) => a.indexOf(v) === i);
  const tl = gsap.timeline({ onComplete: () => { S.entryActive = false; } });
  const riseOrder = [-2, -1, 0, 1, 2].map((o) => wrap(c + o)).filter((v, i, a) => a.indexOf(v) === i);   // top → bottom
  riseOrder.forEach((i, n) => tl.to(rise, { [i]: 1, duration: P.riseDuration, ease: "power3.out" }, n * P.riseStagger));
  [...Array(N).keys()].filter((i) => !riseOrder.includes(i)).forEach((i) => { rise[i] = 1; });
  const growAt = (riseOrder.length - 1) * P.riseStagger + P.riseDuration + P.growDelay;
  [...order].reverse().forEach((i, n) => tl.to(grow, { [i]: 1, duration: P.growDuration, ease: "expo.inOut" }, growAt + n * P.growStagger));
  [...Array(N).keys()].filter((i) => !order.includes(i)).forEach((i) => tl.to(grow, { [i]: 1, duration: P.growDuration, ease: "expo.inOut" }, growAt));
  tl.to(S, { fx: 1, duration: P.lensBloom, ease: "power2.inOut" }, growAt + P.growDuration * 0.45);
}
// ---- intro (Figma 328:1008): home opens on it; the first scroll down lifts the words up and away while
// the dial and details float up from below and the cards play their rise-in. One way only (the navbar logo is a plain link home).
const root = document.documentElement;
const params = new URLSearchParams(location.search);
let intro = !!document.getElementById("intro") && !params.has("work");   // ?work skips the intro (testing)
// wrap each word of the intro sentence (mask + inner span) for the staggered reveal in work.css
const introLine = document.querySelector(".intro-text p");
if (introLine) {
  const words = introLine.textContent.trim().split(/\s+/);
  introLine.replaceChildren(...words.flatMap((word, i) => {
    const mask = document.createElement("span");
    const inner = document.createElement("span");
    mask.className = "w";
    inner.textContent = word;
    inner.style.setProperty("--i", i);
    mask.appendChild(inner);
    return i ? [" ", mask] : [mask];
  }));
}
if (intro) {
  root.classList.add("is-intro");
  rise.fill(0); grow.fill(0); S.fx = 0; S.entryActive = true;           // cards wait below, input locked
  // intro words fade up in once the font is ready (max 1.2s) and the load animation (loader.js) is done
  const loaded = root.classList.contains("is-loading")
    ? new Promise((r) => document.addEventListener("loader:done", r, { once: true }))
    : Promise.resolve();
  Promise.all([Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]), loaded])
    .then(() => requestAnimationFrame(() => root.classList.remove("intro-pre")));
} else {
  root.classList.remove("intro-pre", "is-intro");
  root.classList.add("is-work");
  playEntry();
}
const WORK_DELAY = 0.3;                                 // seconds; keep in step with the .is-work delays in work.css
function enterWork() {
  if (!intro || root.classList.contains("is-loading")) return;   // not while the load animation plays
  intro = false;
  root.classList.remove("is-intro", "intro-pre");
  root.classList.add("is-work");
  // the intro leaves first; the work (cards + dial + details) follows after WORK_DELAY
  gsap.delayedCall(WORK_DELAY, () => {
    if (P.entry) playEntry();
    else { rise.fill(1); grow.fill(1); S.fx = 1; S.entryActive = false; }
  });
}

document.getElementById("introHint")?.addEventListener("click", enterWork);
let touchY = null;
addEventListener("touchstart", (e) => { touchY = e.touches[0].clientY; }, { passive: true });
addEventListener("touchmove", (e) => {
  if (intro && touchY !== null && touchY - e.touches[0].clientY > 30) enterWork();   // swipe up
}, { passive: true });

// ---- hover cursor: the hand + "See the work" over the centre image; a click there opens the project ----
const cursorEl = document.getElementById("cursor");
const onCard = (e) => {
  const p = PROJECTS[wrap(Math.round(cur))];
  return Math.abs(e.clientX - W / 2) < (p.w * K) / 2 && Math.abs(e.clientY - H / 2) < (p.h * K) / 2;
};
let overCard = false;
function setOverCard(on) {
  if (on === overCard) return;
  overCard = on;
  cursorEl.classList.toggle("is-on", on);
  document.body.classList.toggle("cursor-work", on);
}
addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse") return;
  const p = PROJECTS[wrap(Math.round(cur))];
  cursorEl.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  setOverCard(!dragging && !locked() && !e.target.closest?.("site-navbar") && onCard(e));
});
document.addEventListener("pointerleave", () => setOverCard(false));

// ---- input: wheel anywhere, drag / tap on the canvas, arrow keys ----
const locked = () => S.entryActive;
function goTo(idx) { target = home = idx; velocity = 0; snapped = true; journey = true; lastInput = performance.now(); }
const go = (n) => { if (locked()) return; goTo(Math.round(target) + n); };
const along = (e) => (isV() ? e.clientY : e.clientX);
const freeInput = () => { snapped = false; journey = false; lastInput = performance.now(); };
let lastX = 0, lastT = 0, dragVel = 0, travel = 0;

canvas.addEventListener("pointerdown", (e) => {
  if (locked()) return;
  dragging = true; touch = e.pointerType !== "mouse"; travel = 0; dragVel = 0; velocity = 0;
  lastX = along(e); lastT = e.timeStamp;
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add("grabbing");
  freeInput();
});
canvas.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const p = along(e), dx = p - lastX;
  travel += Math.abs(dx);
  const step = (-dx * (touch ? 1 : P.drag)) / spacingPx();
  target += step;
  const dt = Math.max(1, e.timeStamp - lastT) / (1000 / 60);
  dragVel = dragVel * 0.6 + (step / dt) * 0.4;
  lastX = p; lastT = e.timeStamp;
  freeInput();
});
const release = (e) => {
  if (!dragging) return;
  dragging = false;
  canvas.classList.remove("grabbing");
  if (travel < (touch ? 12 : 6)) {
    const r = canvas.getBoundingClientRect();
    const f = isV() ? (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width;
    if (f < 0.25) go(-1); else if (f > 0.75) go(1);
    else if (overCard || (touch && onCard(e))) { const href = PROJECTS[wrap(Math.round(cur))].href; if (href !== "#") navigate(href, e.clientX, e.clientY); }
    return;
  }
  velocity = e.timeStamp - lastT > 90 ? 0 : dragVel;
  freeInput();
};
canvas.addEventListener("pointerup", release);
canvas.addEventListener("pointercancel", release);

// on window, so the wheel also works over the dial, the details and the archives overlay
addEventListener("wheel", (e) => {
  if (e.target.closest?.("site-navbar")) return;
  e.preventDefault();
  if (intro) { if (e.deltaY > 0) enterWork(); return; }
  if (locked()) return;
  const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? H : 1;
  const d = (Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * unit;
  target += (d * P.wheel) / spacingPx();
  velocity = 0;
  freeInput();
}, { passive: false });

addEventListener("keydown", (e) => {
  if (e.target.closest?.("input, textarea")) return;
  if (intro) {
    if (["ArrowDown", "PageDown", " "].includes(e.key)) { e.preventDefault(); enterWork(); }
    return;
  }
  if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); go(1); }
  if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); go(-1); }
});
