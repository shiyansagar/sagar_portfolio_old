// OkCupid case study — motion.
// Lenis smooth scroll + GSAP ScrollTrigger. Only transform/opacity are animated, except the
// accordion panel widths (4 elements, contained). Reduced motion: no smooth scroll, no pin,
// no reveals — the static layout from Figma is shown and the indicator/accordion still work.

import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.13.0/index.js";
import { ScrollTrigger } from "https://cdn.jsdelivr.net/npm/gsap@3.13.0/ScrollTrigger.js";
import Lenis from "https://cdn.jsdelivr.net/npm/lenis@1.1.20/dist/lenis.mjs";

gsap.registerPlugin(ScrollTrigger);

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
// Desktop ≥1200 · iPad 768–1199 · iPhone ≤767 (okcupid.css uses the same breakpoints)
const DESKTOP = "(min-width: 1200px)";
const isDesktop = () => matchMedia(DESKTOP).matches;
const root = document.documentElement;
if (!reduce) root.classList.add("js-motion");

/* ---------- Smooth scroll ---------- */
let lenis = null;
if (!reduce) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

function scrollToEl(el, offset = 0) {
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.4 });
  else window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + offset });
}

// Back to top: a long, even glide — duration grows with distance, eases in and out (cubic),
// and wheel input is locked until it lands so it never stutters halfway.
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
document.querySelector("[data-scroll-top]")?.addEventListener("click", (e) => {
  e.preventDefault();
  e.currentTarget.blur(); // no focus ring left behind after a mouse click
  if (lenis) {
    const duration = Math.min(3, Math.max(1.4, scrollY / 6000));
    lenis.scrollTo(0, { duration, easing: easeInOutCubic, lock: true, force: true });
  } else {
    window.scrollTo({ top: 0 });
  }
});

/* ---------- Hero: simple fade + rise on load ---------- */
function heroIn() {
  if (reduce) return;
  gsap.fromTo(
    "[data-hero]",
    { opacity: 0, y: 12 },
    { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.08, delay: 0.05 }
  );
}

/* ---------- Subtle reveals for everything else ---------- */
function reveals() {
  if (reduce) return;
  gsap.set("[data-reveal]", { y: 8 });
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 92%",
    once: true,
    onEnter: (els) =>
      gsap.to(els, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", stagger: 0.06, overwrite: true }),
  });
}

/* ---------- Section indicator ---------- */
const indicator = document.querySelector(".indicator");
const indLinks = [...indicator.querySelectorAll("a")];
const linkFor = (key) => indLinks.find((a) => a.dataset.target === key);
// Indicator colours come from the theme tokens (light/dark)
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function setActive(key) {
  indLinks.forEach((a) => a.classList.toggle("is-active", a.dataset.target === key));
}
setActive("product");

indLinks.forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    const target = document.getElementById(a.dataset.target);
    if (target) scrollToEl(target, -120);
  });
});

/* ---------- Research framework: stack reveal + headings fly to the indicator ---------- */
function framework() {
  const section = document.querySelector(".framework");
  const boxes = gsap.utils.toArray(".fw-box");
  const flyKeys = ["product", "desk", "user"];
  const heads = flyKeys.map((k) => section.querySelector(`[data-fly="${k}"]`));
  const earlyLinks = flyKeys.map(linkFor);
  const lateLinks = [linkFor("ideation"), linkFor("final")];

  gsap.set(indLinks, { autoAlpha: 0 });

  if (reduce) {
    ScrollTrigger.create({
      trigger: "#product",
      start: "top center",
      onEnter: () => gsap.set(indLinks, { autoAlpha: 1 }),
      onLeaveBack: () => gsap.set(indLinks, { autoAlpha: 0 }),
    });
    return;
  }

  // 1) Stack reveal — plays once when the section comes into view (time-based, not scrubbed).
  //    Each box starts tucked behind the one above it and slides down into place.
  const top = (i) => boxes[i].offsetTop;
  gsap.set(boxes[0], { opacity: 0, y: 16 });
  boxes.slice(1).forEach((b, j) => gsap.set(b, { y: top(j) - top(j + 1), opacity: 0, scale: 0.97, transformOrigin: "50% 0%" }));
  const reveal = gsap.timeline({ paused: true });
  reveal.to(boxes[0], { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" });
  boxes.slice(1).forEach((b, j) => {
    const at = 0.35 + j * 0.28;
    reveal.to(b, { y: 0, scale: 1, duration: 0.8, ease: "power3.out" }, at);
    reveal.to(b, { opacity: 1, duration: 0.35, ease: "power1.out" }, at);
  });
  ScrollTrigger.create({ trigger: section, start: "top 70%", once: true, onEnter: () => reveal.play() });

  // 2) Headings fly into the left indicator when you scroll on past the framework.
  //    Positions are measured live at the moment it plays, so it always starts on the headings
  //    and lands on the indicator slots. x and y use different eases, which bends the path into an arc.
  let flight = null;
  let clones = [];
  const clearClones = () => {
    clones.forEach((c) => c.remove());
    clones = [];
  };

  function flyIn() {
    if (!isDesktop()) return;
    if (reveal.progress() < 1) reveal.progress(1);
    flight?.kill();
    clearClones();
    gsap.killTweensOf(indLinks);
    // Landed here without seeing the headings (page reload mid-way, fast jump): just show the indicator
    if (heads.every((h) => h.getBoundingClientRect().bottom < 0)) {
      gsap.set(indLinks, { autoAlpha: 1 });
      return;
    }
    gsap.set(indLinks, { autoAlpha: 0 });

    flight = gsap.timeline({ onComplete: clearClones });
    heads.forEach((h, i) => {
      const from = h.getBoundingClientRect();
      const to = earlyLinks[i].getBoundingClientRect();
      const c = document.createElement("p");
      c.className = "fly-clone";
      c.textContent = h.textContent;
      c.setAttribute("aria-hidden", "true");
      document.body.append(c);
      clones.push(c);
      gsap.set(c, { x: from.left, y: from.top, scale: 1, color: cssVar("--text") });

      const at = i * 0.07;
      const d = 0.95;
      flight
        .to(c, { x: to.left, duration: d, ease: "power3.inOut" }, at)
        .to(c, { y: to.top, duration: d, ease: "power2.in" }, at)
        .to(c, { scale: 0.75, duration: d, ease: "power2.inOut" }, at)
        .to(c, { color: i === 0 ? cssVar("--ink") : cssVar("--idle"), duration: d * 0.6, ease: "none" }, at + d * 0.4)
        .set(earlyLinks[i], { autoAlpha: 1 }, at + d)
        .set(c, { autoAlpha: 0 }, at + d);
    });
    flight.to(lateLinks, { autoAlpha: 1, duration: 0.35, stagger: 0.07, ease: "power1.out" }, 0.75);
  }

  function flyOut() {
    flight?.kill();
    clearClones();
    gsap.to(indLinks, { autoAlpha: 0, duration: 0.3, ease: "power1.out", overwrite: true });
  }

  ScrollTrigger.create({
    trigger: section,
    start: "bottom 72%",
    onEnter: flyIn,
    onLeaveBack: flyOut,
  });
}

/* ---------- Indicator: active section + scroll away after Learnings ---------- */
function indicatorTracking() {
  document.querySelectorAll("[data-section]").forEach((sec) => {
    const key = sec.dataset.section;
    ScrollTrigger.create({
      trigger: sec,
      start: "top center",
      end: "bottom center",
      onEnter: () => setActive(key),
      onEnterBack: () => setActive(key),
    });
  });

  // Step aside for full-width media: fade out while an edge-to-edge image passes behind the indicator
  const band = () => {
    const h = indicator.offsetHeight;
    return { top: innerHeight / 2 - h / 2 - 12, bottom: innerHeight / 2 + h / 2 + 12 };
  };
  const covering = new Set();
  const media = ".desk-images, .ur-photos, .ur-docs, .af-map, .id-maps, .rw, .id-newmap, .ia-box";
  document.querySelectorAll(media).forEach((node) => {
    const el = node.closest(".pin-spacer") || node;
    ScrollTrigger.create({
      trigger: el,
      start: () => `top ${band().bottom}px`,
      end: () => `bottom ${band().top}px`,
      invalidateOnRefresh: true,
      onToggle: (self) => {
        self.isActive ? covering.add(el) : covering.delete(el);
        indicator.classList.toggle("is-covered", covering.size > 0);
      },
    });
  });

  // Sticky until Learnings has fully scrolled in, then it travels up with the page (1:1) and fades
  ScrollTrigger.create({
    trigger: "#learnings",
    start: "bottom bottom",
    end: "max",
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      const dist = self.end - self.start;
      gsap.set(indicator, { y: -self.progress * dist, opacity: 1 - gsap.parseEase("power1.in")(self.progress) });
    },
    onLeaveBack: () => gsap.set(indicator, { y: 0, opacity: 1 }),
  });
}

/* ---------- Accordion (component set 25:1873): open panel follows the mouse and stays ---------- */
function accordion(acc) {
  const panels = [...acc.querySelectorAll(".acc-panel")];
  const GAP = 20;
  const total = 1114;
  const mq = matchMedia(DESKTOP);
  let open = -1;
  let timer = 0;
  let mode = mq.matches ? "row" : "column";

  const layers = (p) => [p.querySelector(".acc-open"), p.querySelector(".acc-closed"), p.querySelector(".acc-num")];
  const widths = (i) => {
    const ow = Number(panels[i].dataset.openW);
    const cw = (total - GAP * (panels.length - 1) - ow) / (panels.length - 1);
    return panels.map((_, k) => (k === i ? ow : cw));
  };
  // Number badge position per state (Figma: open 16/16; closed panel 1 20/20;
  // closed 2–4 are 16/26 in the Default variant and 20/20 in Variant2–4)
  const numPos = (k, i) => (k === i ? [16, 16] : k === 0 || i !== 0 ? [20, 20] : [16, 26]);

  // Desktop: the open panel follows the mouse and stays; widths glide, content crossfades
  function activateRow(i, instant) {
    const w = widths(i);
    const d = instant || reduce ? 0 : 1;
    panels.forEach((p, k) => {
      const isOpen = k === i;
      const [openLayer, closedLayer, num] = layers(p);
      const [nx, ny] = numPos(k, i);
      p.classList.toggle("is-open", isOpen);
      p.setAttribute("aria-expanded", String(isOpen));

      gsap.to(p, { width: w[k], duration: 0.75 * d, ease: "expo.out", overwrite: "auto" });
      gsap.to(num, { x: nx, y: ny, duration: 0.6 * d, ease: "expo.out", overwrite: "auto" });

      if (isOpen) {
        gsap.to(closedLayer, { autoAlpha: 0, duration: 0.15 * d, overwrite: "auto" });
        if (gsap.getProperty(openLayer, "opacity") < 0.05) gsap.set(openLayer, { y: 10 });
        gsap.to(openLayer, { autoAlpha: 1, y: 0, duration: 0.5 * d, delay: 0.16 * d, ease: "power3.out", overwrite: "auto" });
      } else {
        gsap.to(openLayer, { autoAlpha: 0, y: 0, duration: 0.15 * d, overwrite: "auto" });
        // closed layer padding: 26/16 by default, 20/20 when a panel other than 1 is open
        const shift = k > 0 && i !== 0 ? { x: 4, y: -6 } : { x: 0, y: 0 };
        gsap.to(closedLayer, { autoAlpha: 1, ...shift, duration: 0.4 * d, delay: 0.18 * d, ease: "power2.out", overwrite: "auto" });
      }
    });
  }

  // iPad / iPhone: a vertical list — tap a panel to open it; heights glide (measured before/after)
  function activateColumn(i, instant) {
    const before = panels.map((p) => p.offsetHeight);
    panels.forEach((p, k) => {
      p.classList.toggle("is-open", k === i);
      p.setAttribute("aria-expanded", String(k === i));
    });
    if (instant || reduce) return;
    const after = panels.map((p) => p.offsetHeight);
    panels.forEach((p, k) => {
      if (before[k] === after[k]) return;
      gsap.fromTo(p, { height: before[k] }, {
        height: after[k], duration: 0.6, ease: "power3.inOut", overwrite: true,
        onComplete: () => gsap.set(p, { clearProps: "height" }),
      });
    });
    const [openLayer] = layers(panels[i]);
    gsap.fromTo(openLayer, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, delay: 0.18, ease: "power2.out", overwrite: true });
  }

  function activate(i, instant = false) {
    if (i === open) return;
    open = i;
    mode === "row" ? activateRow(i, instant) : activateColumn(i, instant);
  }

  // Switching between desktop and iPad/iPhone layouts: drop inline GSAP styles, re-apply the state
  mq.addEventListener("change", () => {
    mode = mq.matches ? "row" : "column";
    panels.forEach((p) => {
      gsap.killTweensOf([p, ...layers(p)]);
      gsap.set([p, ...layers(p)], { clearProps: "all" });
    });
    const keep = Math.max(0, open);
    open = -1;
    activate(keep, true);
  });

  panels.forEach((p, k) => {
    p.setAttribute("role", "button");
    p.addEventListener("pointerenter", (e) => {
      if (mode !== "row" || e.pointerType === "touch") return;
      clearTimeout(timer);
      timer = setTimeout(() => activate(k), 70); // hover intent: ignore fast sweeps
    });
    p.addEventListener("pointerleave", () => clearTimeout(timer));
    p.addEventListener("click", () => activate(k));
    p.addEventListener("focus", () => mode === "row" && activate(k));
    p.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate(k);
      }
    });
  });

  activate(0, true);
}

/* ---------- Real-world strip: pinned, vertical scroll drives it sideways ---------- */
function horizontal() {
  if (reduce) return;
  // Pinned at every width; vertical scroll drives it sideways (re-measured on resize)
  document.querySelectorAll(".rw").forEach((rw) => {
    const strip = rw.querySelector(".rw-strip");
    const distance = () => Math.max(0, Math.max(strip.scrollWidth, strip.offsetWidth) - rw.clientWidth);
    // One continuous slide: sine ease-in/out so it eases into motion as the pin starts and settles
    // softly on the last board as the pin releases — no dead hold, no abrupt start or stop.
    gsap.to(strip, {
      x: () => -distance(),
      ease: "sine.inOut",
      scrollTrigger: {
        trigger: rw,
        start: "top top", // pin the moment the section reaches the top edge
        end: () => `+=${distance() * 1.15}`, // a little extra length to spread the easing
        pin: true,
        pinSpacing: true, // parent .ideation is flex, where ScrollTrigger defaults this to false
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });
  });
}

/* ---------- Real-world strip (reduced motion): drag to scroll sideways with a mouse ---------- */
function dragScroll(el) {
  let startX = 0;
  let startLeft = 0;
  let dragging = false;
  el.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    if (getComputedStyle(el).overflowX === "hidden") return; // desktop: the pin drives it
    dragging = true;
    startX = e.clientX;
    startLeft = el.scrollLeft;
    el.setPointerCapture(e.pointerId);
    el.classList.add("is-dragging");
  });
  el.addEventListener("pointermove", (e) => {
    if (dragging) el.scrollLeft = startLeft - (e.clientX - startX);
  });
  const stop = () => {
    dragging = false;
    el.classList.remove("is-dragging");
  };
  el.addEventListener("pointerup", stop);
  el.addEventListener("pointercancel", stop);
}

/* ---------- Boot ---------- */
document.querySelectorAll(".acc").forEach(accordion);
document.querySelectorAll(".rw").forEach(dragScroll);

const fontsReady = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]);
fontsReady.then(() => {
  heroIn();
  framework();
  horizontal(); // before the triggers below it, so they account for its pin spacing
  indicatorTracking();
  reveals();
  ScrollTrigger.refresh();
});
addEventListener("load", () => ScrollTrigger.refresh());
