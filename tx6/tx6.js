/**
 * TX-6 — tx6.js
 * 0. Lenis Smooth Scroll
 * 1. GSAP intro animation (navbar, hero image, title stagger, hero text)
 * 2. GSAP scroll: Tx goes left, -6 goes right
 * 3. Video play/pause via IntersectionObserver
 * 4. Image sequence scroll animation via GSAP ScrollTrigger + Canvas
 */

gsap.registerPlugin(ScrollTrigger);

/* ─── 0. LENIS SMOOTH SCROLL ─────────────────────────────── */
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true,
});

lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);


/* ─── 1. INTRO ANIMATION ──────────────────────────────────── */
(function initIntro() {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    // ── Navbar: fade + slide down ──
    tl.from('.navbar', {
        y: -20,
        opacity: 0,
        duration: 0.6,
    });

    // ── Hero image: scale from 1.1 + blur reveal ──
    tl.from('.hero-image', {
        scale: 1.1,
        filter: 'blur(10px)',
        opacity: 0,
        duration: 0.9,
        ease: 'power2.out',
    }, '-=0.3');

    // ── hero title: "Tx" from left, "-6" from right ──
    tl.from('#title-tx', {
        x: -30,
        opacity: 0,
        duration: 0.8,
        ease: 'ease-in-out',
    }, '-=0.6');

    tl.from('#title-dash6', {
        x: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'ease-in-out',
    }, '<0.05');

    // ── Hero text blocks ──
    tl.from(['#hero-text-left', '#hero-text-right'], {
        opacity: 0,
        y: 15,
        duration: 0.6,
        stagger: 0.1,
    }, '-=0.4');

})();


/* ─── 2. SCROLL: Tx → left, -6 → right ───────────────────── */
(function initTitleScroll() {
    const tx = document.getElementById('title-tx');
    const d6 = document.getElementById('title-dash6');
    if (!tx || !d6) return;

    const hero = document.querySelector('.hero');

    gsap.to(tx, {
        x: () => -window.innerWidth * 0.35,
        ease: 'none',
        scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: 'top top',
            scrub: 1.5,
        },
    });

    gsap.to(d6, {
        x: () => window.innerWidth * 0.35,
        ease: 'none',
        scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: 'top top',
            scrub: 1.5,
        },
    });

})();


/* ─── 3. VIDEO: play only when section is visible ─────────── */
(function initVideo() {
    const video = document.querySelector('.main-video');
    const videoSection = document.querySelector('.video-section');
    if (!video || !videoSection) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    video.play().catch((err) => { });
                } else {
                    video.pause();
                }
            });
        },
        { threshold: 0.2 }
    );

    observer.observe(videoSection);
})();


/* ─── 4. IMAGE SEQUENCE: scroll-driven canvas animation ───── */
(function initImageSequence() {
    const TOTAL_FRAMES = 100;
    const FOLDER = 'imgseq/';

    const framePath = (index) =>
        `${FOLDER}${String(index).padStart(4, '0')}.webp`;

    const canvas = document.getElementById('seq-canvas');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const frames = new Array(TOTAL_FRAMES).fill(null);
    let loadedCount = 0;

    function drawFrame(index) {
        const img = frames[index];
        if (!img || !img.complete) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const scale = canvas.width / img.naturalWidth;
        const drawH = img.naturalHeight * scale;
        const offsetY = (canvas.height - drawH) / 2;
        ctx.drawImage(img, 0, offsetY, canvas.width, drawH);
    }

    const seqSection = document.getElementById('seq-section');
    let framesLoaded = false;
    const seqObs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting && !framesLoaded) {
                framesLoaded = true;
                // Load all frames only when section comes into view
                for (let i = 0; i < TOTAL_FRAMES; i++) {
                    const img = new Image();
                    img.src = framePath(i + 1);
                    img.onload = () => {
                        loadedCount++;
                        if (i === 0) drawFrame(0);
                    };
                    frames[i] = img;
                }

                // Set up GSAP animation
                const seqObj = { frame: 0 };
                gsap.to(seqObj, {
                    frame: TOTAL_FRAMES - 1,
                    snap: 'frame',
                    ease: 'none',
                    scrollTrigger: {
                        trigger: '#seq-section',
                        start: 'top top',
                        end: '+=300%',
                        scrub: 1,
                        pin: true,
                    },
                    onUpdate() {
                        drawFrame(Math.round(seqObj.frame));
                    },
                });

                seqObs.unobserve(seqSection);
            }
        });
    }, { threshold: 0.1 });
    seqObs.observe(seqSection);
})();

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
