// ── Lenis Smooth Scroll ──────────────────────────────────────
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true,
});

// Keep GSAP ScrollTrigger in sync with Lenis
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

document.addEventListener("DOMContentLoaded", () => {

    // ─── MARQUEE SCROLL ANIMATION ─────────────────────────
    const marqueeInner = document.querySelector(".marquee-inner");

    if (marqueeInner) {
        gsap.to(marqueeInner, {
            x: "-10%",
            ease: "none",
            scrollTrigger: {
                trigger: ".marquee-strip",
                start: "top bottom",
                end: "bottom top",
                scrub: 1.5,
            }
        });
    }

    // ─── RESEARCH METHOD CARDS — SEQUENTIAL SLIDE IN ───────
    // The .researchmethod-group is pinned so cards slide in
    // one by one as the user scrolls on DESKTOP only.
    let mm = gsap.matchMedia();

    mm.add("(min-width: 1025px)", () => {
        const rmCards = gsap.utils.toArray(".rm-card");
        const researchMethodGroup = document.querySelector(".researchmethod-group");

        if (researchMethodGroup && rmCards.length > 1) {
            // Set min-height to 100vh so the section covers the viewport while pinning
            gsap.set(researchMethodGroup, { minHeight: "100vh" });

            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: researchMethodGroup,
                    start: "top top",
                    end: "+=2000",
                    pin: true,
                    pinSpacing: true,
                    scrub: 1,
                }
            });

            rmCards.slice(1).forEach((card) => {
                tl.from(card, {
                    x: "-100%",
                    opacity: 0,
                    ease: "power2.out",
                    duration: 1,
                }, "+=0.2");
            });
        }
    });

    // Mobile fallback (optional reset if needed, but matchMedia handles cleanup)
    mm.add("(max-width: 1024px)", () => {
        const researchMethodGroup = document.querySelector(".researchmethod-group");
        if (researchMethodGroup) {
            gsap.set(researchMethodGroup, { minHeight: "0", height: "auto" });
        }
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

document.querySelector('.nav-mobile-toggle').addEventListener('click', () => {
    document.querySelector('.nav-mobile-menu').classList.toggle('active');
});

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
