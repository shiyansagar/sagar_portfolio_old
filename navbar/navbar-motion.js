// GSAP motion for <site-navbar>. Loaded lazily by navbar.js; if this fails to
// load (offline, reduced motion) the navbar falls back to its CSS transitions.
//
// Performance: nothing here animates layout. The menu body is an SVG path
// redrawn from a small state object ({ h, w, bulge, wave, fill }), and the
// content only moves with transform/opacity. Open and close both tween that
// same state from wherever it is, so clicks mid-animation reverse smoothly.

import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.13.0/index.js";

export function createMotion(nav) {
  const q = (s) => nav.querySelector(s);
  const qa = (s) => [...nav.querySelectorAll(s)];

  const slot = q(".nav-pill-slot");
  const pill = q(".nav-pill");
  const top = q(".nav-pill-top");
  const shape = q(".nav-shape");
  const path = q(".nav-shape path");
  const btn = q(".nav-menu-btn");
  const icon = q(".nav-menu-icon");
  const [plusDark, plusLight] = qa(".nav-menu-icon img");
  const [favDark, favLight] = qa(".nav-favicon img");
  const panel = q(".nav-panel");
  const hover = q(".nav-hover");
  const talk = q(".nav-talk");
  const links = qa(".nav-links a");
  const arrows = qa(".nav-links .nav-ext");
  const texts = [...links, talk];

  const cssPx = (name, fallback) =>
    parseFloat(getComputedStyle(nav).getPropertyValue(name)) || fallback;
  const RADIUS = cssPx("--nav-pill-radius", 12);
  const closedH = () => cssPx("--nav-pill-height", 42);
  const openH = () => cssPx("--nav-pill-open-height", 304);
  const closedW = () => slot.clientWidth;
  const openW = () => pill.clientWidth;

  // ── Liquid shape ────────────────────────────────────────────────────────
  // A rounded rect, right-aligned in the pill, whose bottom edge can sag
  // (bulge) and slosh side to side (wave). `sx` widens it evenly on both
  // sides for squash & stretch.
  const s = { h: closedH(), w: closedW(), sx: 0, bulge: 0, wave: 0, fill: 0 };

  function draw() {
    const W = pill.clientWidth;
    const h = s.h;
    const w = s.w + s.sx;
    const x0 = W - s.w - s.sx / 2;
    const x1 = W + s.sx / 2;
    const r = Math.min(RADIUS, h / 2, w / 2);
    const sag = (s.bulge * 4) / 3; // cubic midpoint lands exactly on `bulge`
    path.setAttribute(
      "d",
      `M${x0} ${r}A${r} ${r} 0 0 1 ${x0 + r} 0H${x1 - r}A${r} ${r} 0 0 1 ${x1} ${r}` +
        `V${h - r}A${r} ${r} 0 0 1 ${x1 - r} ${h}` +
        `C${x1 - w * 0.3} ${h + sag + s.wave} ${x0 + w * 0.3} ${h + sag - s.wave} ${x0 + r} ${h}` +
        `A${r} ${r} 0 0 1 ${x0} ${h - r}Z`
    );
    shape.style.opacity = s.fill;
  }

  if (nav.hasAttribute("open")) Object.assign(s, { h: openH(), w: openW(), fill: 1 });
  draw();

  let menuTl;
  let hoverOn = false;

  // ── Menu ────────────────────────────────────────────────────────────────
  function open() {
    const fresh = !nav.hasAttribute("open");
    menuTl?.kill();
    nav.setAttribute("open", "");

    if (fresh) {
      gsap.set(texts, { y: 16, opacity: 0 });
      gsap.set(arrows, { x: -4, y: 4, opacity: 0 });
      gsap.set([plusLight, favLight], { opacity: 0 });
      gsap.set([plusDark, favDark], { opacity: 1 });
      gsap.set(btn, { backgroundColor: "#000" });
      gsap.set(icon, { rotation: 0 });
    }

    menuTl = gsap
      .timeline({ onUpdate: draw })
      // body: the pill fills black, then pours downward
      .to(s, { fill: 1, duration: 0.2, ease: "power1.out" }, 0)
      .to(s, { w: openW(), sx: 0, duration: 0.6, ease: "power3.out" }, 0)
      .to(top, { y: 0, duration: 0.3, ease: "power2.out" }, 0)
      .to(s, { h: openH(), duration: 0.8, ease: "power3.out" }, 0.04)
      // the leading edge sags like a drop, then settles with a soft wobble
      .to(s, {
        keyframes: [
          { bulge: 20, duration: 0.3, ease: "power2.out" },
          { bulge: 0, duration: 1.1, ease: "elastic.out(1, 0.45)" },
        ],
      }, 0.04)
      .to(s, {
        keyframes: [
          { wave: 6, duration: 0.3, ease: "sine.inOut" },
          { wave: -4, duration: 0.35, ease: "sine.inOut" },
          { wave: 1.5, duration: 0.3, ease: "sine.inOut" },
          { wave: 0, duration: 0.3, ease: "sine.inOut" },
        ],
      }, 0.1)
      // button: + turns into ×
      .to(btn, { backgroundColor: "#fff", duration: 0.3, ease: "power2.out" }, 0.05)
      .to(icon, { rotation: -45, duration: 0.6, ease: "back.out(1.8)" }, 0.03)
      .to([plusDark, favDark], { opacity: 0, duration: 0.2, ease: "power1.out" }, 0.05)
      .to([plusLight, favLight], { opacity: 1, duration: 0.25, ease: "power1.out" }, 0.07)
      // links: rise in one after another
      .to(texts, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out", stagger: 0.04 }, 0.14)
      .to(arrows, { x: 0, y: 0, opacity: 1, duration: 0.5, ease: "power3.out", stagger: 0.04 }, 0.3);
  }

  function close() {
    menuTl?.kill();
    hoverOn = false;
    gsap.to(hover, { opacity: 0, duration: 0.15, overwrite: "auto" });

    menuTl = gsap
      .timeline({
        onUpdate: draw,
        onComplete: () => {
          nav.removeAttribute("open");
          Object.assign(s, { h: closedH(), w: closedW(), sx: 0 });
          draw();
          gsap.set([top, btn, icon, plusDark, plusLight, favDark, favLight, ...texts, ...arrows], {
            clearProps: "all",
          });
        },
      })
      // links step out first, bottom to top
      .to(texts, {
        y: -4, opacity: 0, duration: 0.18, ease: "power2.in",
        stagger: { each: 0.015, from: "end" },
      }, 0)
      .to(arrows, { opacity: 0, duration: 0.12, ease: "power1.in" }, 0)
      // body: one smooth pull back up; the edge lifts slightly and flattens on arrival
      .to(s, { h: closedH(), sx: 0, duration: 0.55, ease: "power3.inOut" }, 0.04)
      .to(s, { w: closedW(), duration: 0.5, ease: "power3.inOut" }, 0.06)
      .to(s, {
        keyframes: [
          { bulge: -10, duration: 0.25, ease: "power2.out" },
          { bulge: 0, duration: 0.32, ease: "power2.inOut" },
        ],
      }, 0.04)
      // the black melts into the light pill as it arrives
      .to(s, { fill: 0, duration: 0.3, ease: "power1.inOut" }, 0.3)
      // button: × turns back to +, colours swap with the fade
      .to(top, { y: 0, duration: 0.3, ease: "power2.out" }, 0)
      .to(icon, { rotation: 0, duration: 0.45, ease: "back.out(1.4)" }, 0.05)
      .to(btn, { backgroundColor: "#000", duration: 0.3, ease: "power1.inOut" }, 0.3)
      .to([plusLight, favLight], { opacity: 0, duration: 0.3, ease: "power1.inOut" }, 0.3)
      .to([plusDark, favDark], { opacity: 1, duration: 0.3, ease: "power1.inOut" }, 0.3);
  }

  // Keep the shape matched to the pill if the window resizes
  addEventListener("resize", () => {
    if (menuTl?.isActive()) return;
    Object.assign(s, nav.hasAttribute("open") ? { h: openH(), w: openW() } : { h: closedH(), w: closedW() });
    draw();
  });

  // ── Hover: a soft highlight glides between links ───────────────────────
  texts.forEach((a) => {
    const arrow = a.querySelector(".nav-ext");
    a.addEventListener("pointerenter", () => {
      const pr = panel.getBoundingClientRect();
      const r = a.getBoundingClientRect();
      const box = { x: r.left - pr.left - 6, y: r.top - pr.top - 3, width: r.width + 12, height: r.height + 6 };
      if (!hoverOn) gsap.set(hover, { ...box, scale: 0.94 });
      hoverOn = true;
      gsap.to(hover, { ...box, opacity: 1, scale: 1, duration: 0.45, ease: "power3.out", overwrite: "auto" });
      if (arrow) gsap.to(arrow, { x: 2, y: -2, duration: 0.35, ease: "power3.out", overwrite: "auto" });
    });
    a.addEventListener("pointerleave", () => {
      if (arrow) gsap.to(arrow, { x: 0, y: 0, duration: 0.35, ease: "power3.out", overwrite: "auto" });
    });
  });
  panel.addEventListener("pointerleave", () => {
    hoverOn = false;
    gsap.to(hover, { opacity: 0, scale: 0.97, duration: 0.3, ease: "power2.out", overwrite: "auto" });
  });

  // ── Press: buttons give a little and spring back ───────────────────────
  [btn].forEach((el) => {
    const release = () => gsap.to(el, { scale: 1, duration: 0.5, ease: "back.out(2.5)", overwrite: "auto" });
    el.addEventListener("pointerdown", () => gsap.to(el, { scale: 0.9, duration: 0.12, ease: "power2.out", overwrite: "auto" }));
    el.addEventListener("pointerup", release);
    el.addEventListener("pointerleave", release);
  });

  return { open, close };
}
