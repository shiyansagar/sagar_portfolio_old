// Khadi Wool case study — smooth scroll (Lenis) + one subtle fade-up per block (GSAP ScrollTrigger).
// Reduced motion: static page, no Lenis, no reveals.

import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.13.0/index.js";
import { ScrollTrigger } from "https://cdn.jsdelivr.net/npm/gsap@3.13.0/ScrollTrigger.js";
import Lenis from "https://cdn.jsdelivr.net/npm/lenis@1.1.20/dist/lenis.mjs";

gsap.registerPlugin(ScrollTrigger);

if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.documentElement.classList.add("js-motion");

  const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  // Back to top
  document.querySelector("[data-scroll-top]")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.currentTarget.blur();
    lenis.scrollTo(0, { duration: Math.min(3, Math.max(1.4, scrollY / 6000)), lock: true, force: true });
  });

  gsap.set("[data-reveal]", { y: 8 });
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 92%",
    once: true,
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", stagger: 0.06, overwrite: true }),
  });
} else {
  document.querySelector("[data-scroll-top]")?.addEventListener("click", (e) => {
    e.preventDefault();
    scrollTo({ top: 0 });
  });
}
