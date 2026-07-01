/* =====================================================
   IDM PAGE — GSAP + LENIS ANIMATIONS
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

// Keep GSAP ScrollTrigger in sync with Lenis
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);


// ── 1.1 Smooth Scroll to Anchor ─────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);

        if (targetElement) {
            lenis.scrollTo(targetElement, {
                offset: 0,
                duration: 1.5,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
            });
        }
    });
});


// ── Page Loader ─────────────────────────────────────────────────────────────
function hidePageLoader() {
    const pageLoaderEl = document.getElementById("pageLoader");
    if (!pageLoaderEl) return;
    gsap.to(pageLoaderEl, {
        opacity: 0,
        duration: 0.5,
        ease: "power2.inOut",
        onComplete: () => {
            pageLoaderEl.style.display = "none";
            ScrollTrigger.refresh();
        },
    });
}
if (document.readyState === "complete") {
    hidePageLoader();
} else {
    window.addEventListener("load", hidePageLoader);
}
// ────────────────────────────────────────────────────────────────────────────


// ── 3. Scroll-Triggered Animations ─────────────────
// function initScrollAnimations() {
//     gsap.registerPlugin(ScrollTrigger);

//     // Helper: fade up on scroll
//     const fadeUp = (selector, options = {}) => {
//         gsap.utils.toArray(selector).forEach((el) => {
//             gsap.from(el, {
//                 y: options.y ?? 50,
//                 opacity: 0,
//                 duration: options.duration ?? 0.5,
//                 ease: options.ease ?? 'power3.out',
//                 stagger: options.stagger ?? 0,
//                 scrollTrigger: {
//                     trigger: el,
//                     start: 'top 88%',
//                     once: true,
//                 },
//             });
//         });
//     };

//     // Section 2 — Research
//     fadeUp('.content_1 h2', { stagger: 0.12 });
//     fadeUp('.content_1 .josmo h2, .content_1 .josmo p', { stagger: 0.12 });
//     fadeUp('.content_right img', { stagger: 0.2, y: 30 });








//     // Content boxes row 2 & 3
//     fadeUp('.content_2 .content_box', { stagger: 0.14, y: 20 });
//     fadeUp('.content_3 .content_box', { stagger: 0.14, y: 20 });

//     // Section 3 — Form 
//     fadeUp('.form_content h2, .form_content p', { stagger: 0.15 });
//     gsap.from('.section_3 img', {
//         scale: 1.1,
//         opacity: 0,
//         duration: 1.1,
//         ease: 'power3.out',
//         scrollTrigger: {
//             trigger: '.section_3',
//             start: 'top 85%',
//             once: true,
//         }
//     });

//     // Section 4 — Oroa hero text
//     fadeUp('.oroa_content h4', { y: 10 });
//     fadeUp('.oroa_content h2', { y: 20, duration: 1.0 });
//     fadeUp('.oroa_content p', { stagger: 0.18, y: 25 });
//     fadeUp('.oroa_imgwrap', { y: 20, duration: 1.0 });

//     // Section 5 — Material
//     fadeUp('.mat_wrapper h2', { y: 20 });
//     fadeUp('.mat_wrapper p', { stagger: 0.18, y: 25 });
//     fadeUp('.blender_text', { y: 20, duration: 0.7 });

//     // Section 6 — Renders
//     // fadeUp('.section_6 h2', { y: 30 });
//     // gsap.utils.toArray('.render_stack1 img, .render_stack2 img, .section_6 .render_stack1 img, .section_6 .render_stack2 img').forEach((img, i) => {
//     //     gsap.from(img, {
//     //         opacity: 0,
//     //         y: 30,
//     //         duration: 0.7,
//     //         delay: i * 0.08,
//     //         ease: 'power3.out',
//     //         scrollTrigger: {
//     //             trigger: img,
//     //             start: 'top 90%',
//     //             once: true,
//     //         }
//     //     });
//     // });

//     // Section 7 — Veya hero
//     fadeUp('.veya_content h4', { y: 10 });
//     fadeUp('.veya_content h2', { y: 20, duration: 1.0 });
//     fadeUp('.veya_content p', { stagger: 0.18, y: 25 });

//     // Section 8 — Veya Materials
//     fadeUp('.veya_mat_content h2', { y: 20 });
//     fadeUp('.veya_mat_content h3, .veya_mat_content p', { stagger: 0.12 });

//     // Section 9 — Veya Renders
//     // fadeUp('.section_9 .renders h2', { y: 30 });
//     // gsap.utils.toArray('.section_9 .render_stack1 img, .section_9 .render_stack2 img').forEach((img, i) => {
//     //     gsap.from(img, {
//     //         opacity: 0,
//     //         y: 30,
//     //         duration: 0.7,
//     //         delay: i * 0.02,
//     //         ease: 'power3.out',
//     //         scrollTrigger: {
//     //             trigger: img,
//     //             start: 'top 90%',
//     //             once: true,
//     //         }
//     //     });
//     // });

//     // Footer — More Works
//     fadeUp('.next_header h2', { y: 30 });
//     gsap.utils.toArray('.works_grid a').forEach((el, i) => {
//         gsap.from(el, {
//             opacity: 0,
//             y: 40,
//             duration: 0.7,
//             delay: i * 0.1,
//             ease: 'power3.out',
//             scrollTrigger: {
//                 trigger: '.works_grid',
//                 start: 'top 88%',
//                 once: true,
//             }
//         });
//     });
// }
// ── 4. Hide-on-Scroll Navbar ──
const nav = document.querySelector('.global-nav');
ScrollTrigger.create({
    start: 'top -100', // only start hiding after 100px scrolled down
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
