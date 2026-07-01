// ── Lenis smooth scroll ─────────────────────────────────────────────────────
let lenis;
if (typeof Lenis !== 'undefined') {
    lenis = new Lenis({
        lerp: 0.1,
        smoothWheel: true,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
}

// Register GSAP Plugins
if (typeof ScrambleTextPlugin !== 'undefined' && typeof TextPlugin !== 'undefined' && typeof SplitText !== 'undefined') {
    gsap.registerPlugin(ScrambleTextPlugin, TextPlugin, SplitText);
}
// ────────────────────────────────────────────────────────────────────────────


// ────────────────────────────────────────────────────────────────────────────

const cursor = document.querySelector(".cursor");
const follower = document.querySelector(".cursor-follower");

// Pre-center the cursor elements (follower now offset to bottom-right)
gsap.set(cursor, { xPercent: -50, yPercent: -50 });
gsap.set(follower, { xPercent: 40, yPercent: 30 });

let mm = gsap.matchMedia();

mm.add("(min-width: 769px)", () => {
    const items = document.querySelectorAll('.wrapper > div');

    items.forEach((item, index) => {
        const isOdd = (index + 1) % 2 !== 0;
        const targetHeight = isOdd ? '55vh' : '26vh';
        const targetWidth = isOdd ? '28%' : '31%';
        const baseHeight = isOdd ? '25vh' : '15vh';
        const baseWidth = isOdd ? '16%' : '18%';

        item.addEventListener('mouseenter', () => {
            gsap.to(item, {
                width: targetWidth,
                height: targetHeight,
                duration: 0.2,
                ease: "power2.out"
            });

            const desc = item.getAttribute('data-description');
            if (desc) {
                follower.textContent = desc;
                follower.classList.add('has-text');
                gsap.to(follower, {
                    xPercent: 5,
                    yPercent: 15,
                    duration: 0.3,
                    ease: "power2.out"
                });
            }
        });

        item.addEventListener('mouseleave', () => {
            gsap.to(item, {
                width: baseWidth,
                height: baseHeight,
                duration: 0.2,
                ease: "power2.out"
            });

            follower.textContent = '';
            follower.classList.remove('has-text');
            gsap.to(follower, {
                xPercent: 20,
                yPercent: 20,
                duration: 0.1,
                ease: "power2.out"
            });
        });
    });

    window.addEventListener("mousemove", (e) => {
        // Move the main cursor  
        gsap.to(cursor, {
            x: e.clientX,
            y: e.clientY,
            duration: 0.1,
            ease: "power2.out"
        });

        // Move the follower with a slight delay and bottom-right offset
        gsap.to(follower, {
            x: e.clientX + 10,
            y: e.clientY + 10,
            duration: 0.4,
            ease: "power3.out"
        });
    });

    // Optional: Change cursor style on links
    document.querySelectorAll("a").forEach((link) => {
        link.addEventListener("mouseenter", () => {
            gsap.to([cursor, follower], {
                scale: 1.1,
                duration: 0.2
            });
        });
        link.addEventListener("mouseleave", () => {
            gsap.to([cursor, follower], {
                scale: 1,
                duration: 0.2
            });
        });
    });
});

// ── Contact Dropdown Logic ──────────────────────────────────────────────────
const contactBtn = document.querySelector('.contactme');
const contactsList = document.querySelector('.contacts');

if (contactBtn && contactsList) {
    // Initial hidden state - hide immediately to avoid gap jump
    gsap.set(contactsList, {
        height: 0,
        autoAlpha: 0,
        overflow: 'hidden',
        marginTop: 0,
        display: 'none'
    });

    let isContactsOpen = false;

    contactBtn.addEventListener('click', () => {
        isContactsOpen = !isContactsOpen;

        // Kill any existing animations to prevent conflicts
        gsap.killTweensOf(contactsList);

        if (isContactsOpen) {
            // Show first, then animate
            gsap.set(contactsList, { display: 'flex' });
            gsap.to(contactsList, {
                height: "auto",
                autoAlpha: 1,
                marginTop: 14, // Smoothly animate the spacing
                duration: 0.6,
                ease: "expo.out",
                force3D: true,
                onComplete: () => {
                    if (lenis) lenis.resize();
                }
            });
        } else {
            gsap.to(contactsList, {
                height: 0,
                autoAlpha: 0,
                marginTop: 0,
                duration: 0.4,
                ease: "power2.inOut",
                force3D: true,
                onComplete: () => {
                    gsap.set(contactsList, { display: 'none' });
                    if (lenis) lenis.resize();
                }
            });
        }
    });
}
// ── Text Scramble & Terminal Effects ────────────────────────────────────────
window.addEventListener('load', () => {
    const descriptionText = document.querySelector("#description-text");
    if (!descriptionText) return;

    // 1. Initial State for h1
    if (document.querySelector(".name-text h1")) {
        gsap.to(".name-text h1", {
            duration: 1,
            scrambleText: {
                text: "Sagar Shiyan",
                chars: "!@#$%^&*()_+~{}[]|;:,.<>?/1234567890",
                speed: 0.3,
                delimiter: ""
            }
        });
    }

    // 2. Terminal Typewriter Reveal for Description
    const textTarget = descriptionText.querySelector(".text-content");
    if (!textTarget) return;

    const originalText = textTarget.innerText;
    textTarget.innerText = ''; // Clear for reveal

    // Cursor blinking
    gsap.to(".type-cursor", {
        opacity: 0,
        ease: "steps(1)",
        repeat: -1,
        duration: 0.5
    });

    const tl = gsap.timeline({ delay: 0.5 });
    tl.to(textTarget, {
        duration: 1.5,
        text: {
            value: originalText,
            delimiter: ""
        },
        ease: "none",
        onComplete: () => {
            // Setup the ASCII Radius Hover Effect after reveal
            initRadialAsciiEffect(textTarget, originalText);
        }
    });

    function initRadialAsciiEffect(container, fullText) {
        // Split text for individual char control
        const split = new SplitText(container, { type: "chars" });
        const chars = split.chars;
        const charData = chars.map(c => ({
            el: c,
            original: c.innerText,
            isScrambled: false
        }));

        const ascii = "!@#$%^&*()_+~{}[]|;:,.<>?/0123456789";
        const colors = ["#8fc857", "#ff5f5f", "#5fafff", "#ffaf5f", "#af5fff"];

        container.addEventListener("mousemove", (e) => {
            const { clientX, clientY } = e;

            charData.forEach(data => {
                const rect = data.el.getBoundingClientRect();
                const charX = rect.left + rect.width / 2;
                const charY = rect.top + rect.height / 2;
                const distance = Math.sqrt((clientX - charX) ** 2 + (clientY - charY) ** 2);

                if (distance < 60) { // Slightly larger radius for better feel
                    if (!data.isScrambled || Math.random() > 0.8) {
                        data.el.innerText = ascii[Math.floor(Math.random() * ascii.length)];
                        data.el.style.color = colors[Math.floor(Math.random() * colors.length)];
                        data.isScrambled = true;
                    }
                } else if (data.isScrambled) {
                    data.el.innerText = data.original;
                    data.el.style.color = "";
                    data.isScrambled = false;
                }
            });
        });

        container.addEventListener("mouseleave", () => {
            charData.forEach(data => {
                data.el.innerText = data.original;
                data.el.style.color = "";
                data.isScrambled = false;
            });
        });
    }
});
// ────────────────────────────────────────────────────────────────────────────
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
        },
    });
}
window.addEventListener("load", hideLoader);
// ────────────────────────────────────────────────────────────────────────────

