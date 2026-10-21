// FOUR case study — motion.
// Lenis smooth scroll + GSAP hero reveal, the lock Lottie, and the flow video (plays while on screen).
// Reduced motion: no smooth scroll, no reveal, no autoplay (the video gets controls instead).

import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.13.0/index.js";
import { ScrollTrigger } from "https://cdn.jsdelivr.net/npm/gsap@3.13.0/ScrollTrigger.js";
import { SplitText } from "https://cdn.jsdelivr.net/npm/gsap@3.13.0/SplitText.js";
import Lenis from "https://cdn.jsdelivr.net/npm/lenis@1.1.20/dist/lenis.mjs";

gsap.registerPlugin(ScrollTrigger, SplitText);

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reduce) document.documentElement.classList.add("js-motion");

/* ---------- Smooth scroll ---------- */
let lenis = null;
if (!reduce) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

// Back to top: long even glide, wheel locked until it lands (same as the OkCupid page)
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

/* ---------- Hero: fade + rise on load, text staggers line by line ---------- */
function heroIn() {
  if (reduce) return;
  const q = (s) => document.querySelector(s);

  // Heading and the two subtext paragraphs are split into lines (accent spans keep their colour)
  const splits = [q(".hero-title"), ...document.querySelectorAll(".hero-sub p, .hero-sub-strong")].map((el) =>
    SplitText.create(el, { type: "lines" })
  );
  const titleLines = splits[0].lines;
  const subLines = splits.slice(1).flatMap((s) => s.lines);

  // The wrappers are hidden by CSS (.js-motion [data-hero]); show them and hide the lines instead
  gsap.set([...titleLines, ...subLines], { opacity: 0, y: 10 });
  gsap.set([".hero-title", ".hero-sub"], { opacity: 1 });

  gsap
    .timeline({
      defaults: { ease: "power3.out" },
      delay: 0.05,
      onComplete: () => splits.forEach((s) => s.revert()), // back to plain text (clean resize/reflow)
    })
    .fromTo([".hero-lock", ".hero-eyebrow"], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08 }, 0)
    .to(titleLines, { opacity: 1, y: 0, duration: 0.8, stagger: 0.09 }, 0.16)
    .to(subLines, { opacity: 1, y: 0, duration: 0.7, stagger: 0.05 }, 0.45)
    .fromTo(".hero-video", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.9 }, 0.5);
}

/* ---------- Lock Lottie (Figma 304:6519) ---------- */
function lock() {
  if (!window.lottie) return;
  document.querySelectorAll("[data-lottie]").forEach((el) => {
    const anim = window.lottie.loadAnimation({
      container: el,
      renderer: "svg",
      path: "content/lock.json?v=2", // ?v= busts the cache after the colour change
      loop: true,
      autoplay: !reduce,
      rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
    });
    // Reduced motion: hold a still frame instead of looping
    if (reduce) anim.addEventListener("DOMLoaded", () => anim.goToAndStop(60, true));
  });
}

/* ---------- Flow video: play while visible, pause when scrolled away ---------- */
function video() {
  const v = document.getElementById("flowVideo");
  if (!v) return;
  if (reduce) {
    v.controls = true;
    return;
  }
  const io = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) v.play().catch(() => {});
      else v.pause();
    },
    { threshold: 0.25 }
  );
  io.observe(v);
}

/* ---------- Boot ---------- */
const fontsReady = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]);
fontsReady.then(() => {
  heroIn();
  ScrollTrigger.refresh();
});
addEventListener("load", () => {
  lock();
  ScrollTrigger.refresh();
});
video();
