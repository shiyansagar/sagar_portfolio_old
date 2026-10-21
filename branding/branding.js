// Surabhi Bakery — motion.
// Lenis smooth scroll + GSAP ScrollTrigger (same pinned versions as the navbar, so one shared GSAP).
// Only transform/opacity are animated. The sticky side labels are pure CSS (position: sticky), which works
// because Lenis drives the native scroll. Reduced motion: no smooth scroll, no reveals, no zoom.

import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.13.0/index.js";
import { ScrollTrigger } from "https://cdn.jsdelivr.net/npm/gsap@3.13.0/ScrollTrigger.js";
import Lenis from "https://cdn.jsdelivr.net/npm/lenis@1.1.20/dist/lenis.mjs";

gsap.registerPlugin(ScrollTrigger);

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const DESKTOP = "(min-width: 1200px)"; // branding.css uses the same breakpoints
if (!reduce) document.documentElement.classList.add("js-motion");

/* ---------- Smooth scroll ---------- */
let lenis = null;
if (!reduce) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

// Back to top: a long, even glide (duration grows with distance), wheel locked until it lands
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
document.querySelector("[data-scroll-top]")?.addEventListener("click", (e) => {
  e.preventDefault();
  e.currentTarget.blur();
  if (lenis) {
    const duration = Math.min(3, Math.max(1.4, scrollY / 6000));
    lenis.scrollTo(0, { duration, easing: easeInOutCubic, lock: true, force: true });
  } else {
    window.scrollTo({ top: 0 });
  }
});

/* ---------- Hero: fade + rise on load, then a gentle zoom as it scrolls away ---------- */
function hero() {
  if (reduce) return;
  gsap.fromTo(
    "[data-hero]",
    { opacity: 0, y: 12 },
    { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.08, delay: 0.05 }
  );
  // Starts at exactly the Figma framing (scale 1) and eases in only while the hero leaves
  gsap.matchMedia().add(DESKTOP, () => {
    gsap.to(".hero-img img", {
      scale: 1.06,
      ease: "none",
      scrollTrigger: { trigger: ".hero-img", start: "top top", end: "bottom top", scrub: 0.6 },
    });
  });
}

/* ---------- Text: subtle 8px fade-up ---------- */
function textReveals() {
  if (reduce) return;
  gsap.set("[data-reveal]", { y: 8 });
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 92%",
    once: true,
    onEnter: (els) =>
      gsap.to(els, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", stagger: 0.06, overwrite: true }),
  });
}

/* ---------- Images: box fades in while the picture settles from a slight zoom ---------- */
function mediaReveals() {
  if (reduce) return;
  gsap.set("[data-media] img", { scale: 1.06 });
  ScrollTrigger.batch("[data-media]", {
    start: "top 90%",
    once: true,
    onEnter: (els) => {
      gsap.to(els, { opacity: 1, duration: 0.9, ease: "power2.out", stagger: 0.08, overwrite: true });
      gsap.to(
        els.map((el) => el.querySelector("img")),
        { scale: 1, duration: 1.4, ease: "expo.out", stagger: 0.08, overwrite: true }
      );
    },
  });
}

/* ---------- Boot ---------- */
const fontsReady = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]);
fontsReady.then(() => {
  hero();
  textReveals();
  mediaReveals();
  ScrollTrigger.refresh();
});
addEventListener("load", () => ScrollTrigger.refresh());
