/* =====================================================
   BRANDING PAGE — LENIS + GSAP ANIMATIONS
   ===================================================== */

// ── 1. Lenis Smooth Scroll ──────────────────────────
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true,
});

function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// Sync ScrollTrigger with Lenis
gsap.registerPlugin(ScrollTrigger);
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// ── 2. Scroll-triggered fade-up for text sections ──
document.addEventListener('DOMContentLoaded', () => {

    const fadeTargets = [
        '.meta-row',
        '.brand-title-row',
        '.project-vision',
        '.research-section',
        '.creative-section',
    ];

    fadeTargets.forEach((selector) => {
        gsap.utils.toArray(selector).forEach((el) => {
            gsap.from(el, {
                y: 40,
                opacity: 0,
                duration: 0.9,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: el,
                    start: 'top 88%',
                    once: true,
                },
            });
        });
    });

    // Images scale in gently
    gsap.utils.toArray('.img-full, .img-centered').forEach((img) => {
        gsap.from(img, {
            scale: 1.03,
            opacity: 0,
            duration: 1.0,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: img,
                start: 'top 90%',
                once: true,
            },
        });
    });
});

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



// ── Page Loader ─────────────────────────────────────────────────────────────
function hideLoader() {
    const loader = document.getElementById("pageLoader");
    if (!loader) return;
    gsap.to(loader, {
        opacity: 0,
        duration: 0.5,
        ease: "power2.inOut",
        onComplete: () => {
            loader.style.display = "none";
            ScrollTrigger.refresh();
        },
    });
}
if (document.readyState === "complete") {
    hideLoader();
} else {
    window.addEventListener("load", hideLoader);
}
// ────────────────────────────────────────────────────────────────────────────
