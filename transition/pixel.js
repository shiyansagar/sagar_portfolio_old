// Pixel dissolve, shared by the whole site (after pixel-text-reveal.vercel.app, "dissolve" preset).
//  1. Page transition: click an internal link → the screen dissolves to white in pixels → the browser loads the next
//     page normally (no Barba: every page stays standalone) → it opens by dissolving the white away.
//     The next page's <head> runs `try{sessionStorage.getItem("rt")&&document.documentElement.classList.add("rt-in")}catch(e){}`
//     so it starts white (navbar.css) until the reveal begins. Imported by navbar.js, so every page has it.
//  2. dissolve(els, show, vars): text appears / disappears through a mask of 3px blocks (the work page details only).
import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.13.0/index.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- 2. element dissolve: masks of 3px blocks that switch on in random order, pre-drawn once ----------
const PX = 3, TILE = 63, STEPS = 10;
const MASKS = (() => {
  const n = TILE / PX, th = Array.from({ length: n * n }, Math.random);
  const c = document.createElement("canvas");
  c.width = c.height = TILE;
  const g = c.getContext("2d");
  return Array.from({ length: STEPS + 1 }, (_, k) => {
    g.clearRect(0, 0, TILE, TILE);
    th.forEach((v, i) => { if (v < k / STEPS) g.fillRect((i % n) * PX, Math.floor(i / n) * PX, PX, PX); });
    return `url(${c.toDataURL()})`;
  });
})();
function setMask(el, k) {
  const m = k >= STEPS ? "none" : MASKS[Math.max(0, Math.round(k))];
  el.style.maskImage = el.style.webkitMaskImage = m;
}
export function dissolve(els, show, vars) {
  const px = els.map((el) => {
    // random tile offset per element so the pattern never lines up between blocks
    el.style.maskSize = el.style.webkitMaskSize = `${TILE}px ${TILE}px`;
    el.style.maskPosition = el.style.webkitMaskPosition = `${Math.floor(Math.random() * 21) * PX}px ${Math.floor(Math.random() * 21) * PX}px`;
    setMask(el, show ? 0 : STEPS);
    return { el, k: show ? 0 : STEPS };
  });
  return gsap.to(px, { k: show ? STEPS : 0, ease: "none", ...vars, onUpdate: () => px.forEach((p) => setMask(p.el, p.k)) });
}

// ---------- 1. page transition ----------
const KEY = "rt";
const OUT = 0.45, IN = 0.6;                         // seconds
const B = 3;                                       // block size, css px (same 3px as the text dissolve; snapped to whole device pixels, no seams)
let cv, ctx, busy = false, bd = B, dpr = 1;

function screen() {
  if (!cv) {
    cv = document.createElement("canvas");
    cv.setAttribute("aria-hidden", "true");
    cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:2147483647;pointer-events:none";
    document.documentElement.append(cv);       // outside <body>: survives anything a page does to its body
    ctx = cv.getContext("2d");
  }
  dpr = Math.min(devicePixelRatio || 1, 2);
  bd = Math.max(1, Math.round(B * dpr));
  cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
  ctx.fillStyle = "#fff";                        // drawn in device pixels (identity transform)
}
// each block switches at its own moment: mostly random, a little earlier near (x, y) so it spreads from the click
function order(x, y) {
  x *= dpr; y *= dpr;
  const W = cv.width, H = cv.height, cols = Math.ceil(W / bd), rows = Math.ceil(H / bd);
  const t = new Float32Array(cols * rows), far = Math.hypot(Math.max(x, W - x), Math.max(y, H - y));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    t[r * cols + c] = 0.72 * Math.random() + 0.28 * (Math.hypot(c * bd - x, r * bd - y) / far);
  }
  return { t, cols };
}
function run(x, y, dur, cover) {
  screen();
  if (!cover) ctx.fillRect(0, 0, cv.width, cv.height);
  const { t, cols } = order(x, y);
  return new Promise((done) => {
    const t0 = performance.now();
    let prev = -1;
    const frame = (now) => {
      const lin = Math.min(1, (now - t0) / 1000 / dur);
      const u = lin < 1 ? 0.5 - 0.5 * Math.cos(Math.PI * lin) : 1.01;     // sine in-out
      for (let i = 0; i < t.length; i++) {                              // only the blocks that switch this frame
        if (t[i] > prev && t[i] <= u) {
          const bx = (i % cols) * bd, by = ((i / cols) | 0) * bd;
          cover ? ctx.fillRect(bx, by, bd, bd) : ctx.clearRect(bx, by, bd, bd);
        }
      }
      prev = u;
      if (lin < 1) requestAnimationFrame(frame);
      else { cover ? ctx.fillRect(0, 0, cv.width, cv.height) : ctx.clearRect(0, 0, cv.width, cv.height); done(); }
    };
    requestAnimationFrame(frame);
  });
}

export async function navigate(url, x = innerWidth / 2, y = innerHeight / 2) {
  if (busy) return;
  if (reduce) { location.href = url; return; }
  busy = true;
  prefetch(url);
  await run(x, y, OUT, true);
  try { sessionStorage.setItem(KEY, JSON.stringify({ x: x / innerWidth, y: y / innerHeight, t: Date.now() })); } catch { /* no storage: the next page just appears */ }
  location.href = url;
}

const internal = (a) => {
  if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return null;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return null;
  if (url.pathname === location.pathname && url.search === location.search) return null;   // same page (#hash links)
  return url;
};
document.addEventListener("click", (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const url = internal(e.composedPath().find((n) => n.tagName === "A"));
  if (!url) return;
  e.preventDefault();
  const kb = e.detail === 0;                        // keyboard "click": no pointer position, start from the centre
  navigate(url.href, kb ? innerWidth / 2 : e.clientX, kb ? innerHeight / 2 : e.clientY);
});

// warm the next page while the pointer is on its link, so the swap behind the white screen is quick
const warmed = new Set();
function prefetch(href) {
  if (warmed.has(href)) return;
  warmed.add(href);
  const l = document.createElement("link");
  l.rel = "prefetch"; l.href = href;
  document.head.append(l);
}
document.addEventListener("pointerover", (e) => {
  const url = internal(e.target.closest?.("a"));
  if (url) prefetch(url.href);
}, { passive: true });

// arriving: dissolve the white away
(function arrive() {
  let s = null;
  try { s = JSON.parse(sessionStorage.getItem(KEY)); sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  const root = document.documentElement;
  if (!s || Date.now() - s.t > 8000 || reduce) { root.classList.remove("rt-in"); return; }
  screen(); ctx.fillRect(0, 0, cv.width, cv.height);       // white on the canvas…
  root.classList.remove("rt-in");                          // …so the CSS cover can go
  run(s.x * innerWidth, s.y * innerHeight, IN, false);
})();

// back/forward cache restores the old page exactly as left: fully white. Clear it.
addEventListener("pageshow", (e) => {
  if (!e.persisted) return;
  busy = false;
  document.documentElement.classList.remove("rt-in");
  if (cv) ctx.clearRect(0, 0, cv.width, cv.height);
});
