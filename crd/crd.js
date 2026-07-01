/* ============================================================
   CRD.JS — Khadi Wool Ethnographic Study
   - Lenis smooth scroll (Infinite)
   - Page loader
   - Subtle GSAP scroll-triggered animations
   ============================================================ */

(function () {
  "use strict";

  /* ───────────────────────────────────────────────
     REGISTER GSAP PLUGINS IMMEDIATELY
  ─────────────────────────────────────────────── */
  gsap.registerPlugin(ScrollTrigger);

  /* ───────────────────────────────────────────────
     HELPERS
  ─────────────────────────────────────────────── */
  // Splits text into spans for letter-by-letter animation
  function splitTextToChars(element) {
    const text = element.textContent;
    element.innerHTML = "";
    text.split("").forEach((char) => {
      const span = document.createElement("span");
      span.classList.add("char");
      span.textContent = char === " " ? "\u00A0" : char;
      element.appendChild(span);
    });
    return element.querySelectorAll(".char");
  }

  /* ───────────────────────────────────────────────
     1. LENIS SMOOTH SCROLL
  ─────────────────────────────────────────────── */
  function initLenis() {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false, // Infinite scroll disabled
    });

    // Connect Lenis RAF to GSAP ticker
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    // Let ScrollTrigger know about Lenis scroll position
    lenis.on("scroll", ScrollTrigger.update);

    return lenis;
  }

  /* ───────────────────────────────────────────────
     2. PAGE LOADER
  ─────────────────────────────────────────────── */
  const loader = document.getElementById("pageLoader");

  function hideLoader() {
    gsap.to(loader, {
      opacity: 0,
      duration: 0.5,
      ease: "power2.inOut",
      onComplete: () => {
        loader.style.display = "none";
        // Refresh ScrollTrigger after loader hides
        ScrollTrigger.refresh();
      },
    });
  }

  /* ───────────────────────────────────────────────
     3. ANIMATIONS
  ─────────────────────────────────────────────── */
  function initAnimations() {
    /* ─── Hero: scale-down on entry ─── */
    const heroImg = document.querySelector(".hero__img");
    if (heroImg) {
      gsap.fromTo(heroImg, { scale: 1.05 }, { scale: 1, duration: 1.8, ease: "power3.out" });

      // Parallax on scroll — only desktop
      if (window.innerWidth > 767) {
        gsap.to(heroImg, {
          yPercent: 12,
          ease: "none",
          scrollTrigger: {
            trigger: ".hero",
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      }
    }

    /* ─── Image reveal — clip-path wipe from bottom ─── */
    const revealImgs = document.querySelectorAll(".img-reveal");
    revealImgs.forEach((img) => {
      const parent = img.parentElement;
      if (parent && getComputedStyle(parent).overflow !== "hidden") {
        parent.style.overflow = "hidden";
      }

      gsap.fromTo(
        img,
        { clipPath: "inset(0 0 100% 0)" },
        {
          clipPath: "inset(0 0 0% 0)",
          duration: 1.1,
          ease: "power3.inOut",
          scrollTrigger: {
            trigger: img,
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );
    });

    /* ─── Section headings — fade only (y-movement removed for cleaner look) ─── */
    const headings = document.querySelectorAll(
      ".section-heading--large, .section-heading--serif, .methodology-big-title"
    );
    headings.forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.85,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 92%",
            toggleActions: "play none none none",
          },
        }
      );
    });

    /* ─── Tags / pills — stagger on group entry ─── */
    const tagGroups = document.querySelectorAll(
      ".title-section__tags, .methodology-section__pills"
    );
    tagGroups.forEach((group) => {
      gsap.fromTo(
        Array.from(group.children),
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          ease: "power2.out",
          stagger: 0.075,
          scrollTrigger: {
            trigger: group,
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );
    });

    /* ─── Meta rows — slide from left ─── */
    const metaRows = gsap.utils.toArray(".meta-row");
    if (metaRows.length) {
      gsap.fromTo(
        metaRows,
        { opacity: 0, x: -16 },
        {
          opacity: 1,
          x: 0,
          duration: 0.6,
          ease: "power2.out",
          stagger: 0.1,
          scrollTrigger: {
            trigger: ".meta-section",
            start: "top 88%",
            toggleActions: "play none none none",
          },
        }
      );
    }

    /* ─── Abstracts + body text — simple fade (y-movement removed) ─── */
    const bodyTexts = gsap.utils.toArray(".body-text");
    bodyTexts.forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 92%",
            toggleActions: "play none none none",
          },
        }
      );
    });

    /* ─── Artisan Names — Letter Reveal ─── */
    const artisanNames = document.querySelectorAll(".artisan-card__name");
    artisanNames.forEach((name) => {
      const chars = splitTextToChars(name);
      gsap.fromTo(
        chars,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
          stagger: 0.03,
          scrollTrigger: {
            trigger: name,
            start: "top 95%",
            toggleActions: "play none none none",
          },
        }
      );
    });

    /* ─── Insight cards — stagger ─── */
    const insightCards = gsap.utils.toArray(".insight-card");
    if (insightCards.length) {
      gsap.fromTo(
        insightCards,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.75,
          ease: "power2.out",
          stagger: 0.1,
          scrollTrigger: {
            trigger: ".insights-grid",
            start: "top 88%",
            toggleActions: "play none none none",
          },
        }
      );
    }

    /* ─── Artisan cards — stagger background items ─── */
    const artisanDetails = gsap.utils.toArray(".artisan-card__info > div:not(.artisan-card__name-block)");
    artisanDetails.forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, x: 10 },
        {
          opacity: 1,
          x: 0,
          duration: 0.5,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 95%",
            toggleActions: "play none none none",
          },
        }
      );
    });

    /* ─── Footer image — subtle scale in ─── */
    const footerImg = document.querySelector(".footer-image img");
    if (footerImg) {
      gsap.fromTo(
        footerImg,
        { scale: 1.05, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 1.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".footer-image",
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );
    }
  }

  /* ───────────────────────────────────────────────
     4. BOOT SEQUENCE
  ─────────────────────────────────────────────── */
  // Start Lenis immediately
  initLenis();

  document.addEventListener("DOMContentLoaded", () => {
    initAnimations();
  });

  // Hide loader once page fully loads
  if (document.readyState === "complete") {
    hideLoader();
  } else {
    window.addEventListener("load", hideLoader);
  }

  const nav = document.querySelector('.global-nav');
  ScrollTrigger.create({
      start: 'top -100',
      onUpdate: (self) => {
          if (self.direction === 1) {
              nav.classList.add('nav-hidden');
          } else {
              nav.classList.remove('nav-hidden');
          }
      }
  });

  function updateLocalTime() {
      const timeElements = document.querySelectorAll('.nav-time, .nav-mobile-time');
      if (!timeElements.length) return;
      const now = new Date();
      let hours = now.getHours();
      let minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      minutes = minutes < 10 ? '0' + minutes : minutes;
      const strTime = hours + ':' + minutes + ' ' + ampm;
      timeElements.forEach(el => el.textContent = strTime);
  }
  updateLocalTime();
  setInterval(updateLocalTime, 1000);

  document.querySelector('.nav-mobile-toggle').addEventListener('click', () => {
      document.querySelector('.nav-mobile-menu').classList.toggle('active');
  });
})();
