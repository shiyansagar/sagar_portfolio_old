/* ─────────────────────────────────────────────
   GRID INTERACTION SYSTEM
   Desktop  (>1024px) → fullscreen overlay modal
   Mobile   (≤1024px) → slide-up full-screen page
───────────────────────────────────────────── */

(function () {
    'use strict';

    /* ── DOM refs ── */
    const overlay = document.getElementById('grid-overlay');
    const overlayWrap = document.getElementById('grid-overlay-wrap');
    const overlayClose = document.getElementById('grid-overlay-close');
    const overlayTitle = document.getElementById('grid-overlay-title');
    const overlayBody = document.getElementById('grid-overlay-body');
    const overlayInner = document.getElementById('grid-overlay-inner');

    const mobilePage = document.getElementById('grid-mobile-page');
    const mobileBack = document.getElementById('grid-mobile-back');
    const mobileTitle = document.getElementById('grid-mobile-title');
    const mobileBody = document.getElementById('grid-mobile-body');
    const mobileInner = document.getElementById('grid-mobile-inner');

    /* ── Breakpoint ── */
    const DESKTOP_BP = 1025; // px — matches spec: >1024 = desktop

    function isDesktop() {
        return window.innerWidth >= DESKTOP_BP;
    }

    /* ── Scroll lock ── */
    let scrollY = 0;

    function lockScroll() {
        scrollY = window.scrollY;
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
    }

    function unlockScroll() {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
    }

    /* ── Content builder ── */
    function buildContent(item) {
        const title = item.dataset.title || item.querySelector('h3')?.textContent || 'Untitled';
        const category = item.dataset.category || item.querySelector('p')?.textContent || '';
        const category1 = item.dataset.category1 || '';

        // Gallery assets
        const photos = item.dataset.photos ? item.dataset.photos.split(',') : [];
        const videos = item.dataset.videos ? item.dataset.videos.split(',') : [];

        // CASE 1: SPECIAL CATEGORY1 LAYOUT (ALMOST GODS STYLE)
        if (category1) {
            const conceptTitle = item.dataset.conceptTitle || '';
            const conceptDesc = item.dataset.conceptDesc || '';
            const sensoryTitle = item.dataset.sensoryTitle || '';
            const sensoryDesc = item.dataset.sensoryDesc || '';

            let galleryHtml = '';
            photos.forEach(src => {
                galleryHtml += `
                    <div class="gm-cover gm-gallery-item is-loading">
                        <img src="${src.trim()}" alt="Gallery" loading="lazy" onload="this.parentElement.classList.add('is-loaded'); this.parentElement.classList.remove('is-loading');">
                    </div>`;
            });

            const mainImg = item.querySelector('img')?.src || '';

            return {
                title,
                html: `
                    <div class="gm-meta"><span class="gm-category">${category}</span></div>
                    <div class="gm-category1"><p>${category1}</p></div>
                    ${mainImg ? `<div class="gm-cover gm-main-img is-loading"><img src="${mainImg}" alt="${title}" loading="lazy" onload="this.parentElement.classList.add('is-loaded'); this.parentElement.classList.remove('is-loading');"></div>` : ''}
                    <div class="gm-extended">
                        ${conceptTitle ? `<h4>${conceptTitle}</h4>` : ''}
                        ${conceptDesc ? `<p>${conceptDesc}</p>` : ''}
                    </div>
                    <div class="gm-extended">
                        ${sensoryTitle ? `<h4>${sensoryTitle}</h4>` : ''}
                        ${sensoryDesc ? `<p>${sensoryDesc}</p>` : ''}
                    </div>
                    <div class="gm-gallery">${galleryHtml}</div>
                `
            };
        }

        // CASE 2: DEFAULT / VIDEO-FIRST LAYOUT
        const desc = item.dataset.desc || 'Project details coming soon.';
        const links = item.dataset.links ? item.dataset.links.split(',') : [];
        let mediaHtml = '';

        // Add main card image at the top
        const mainImg = item.querySelector('img')?.src || '';
        const hideMain = item.dataset.hideMain === 'true';
        if (mainImg && !hideMain) {
            mediaHtml += `<div class="gm-cover is-loading"><img src="${mainImg}" alt="${title}" loading="lazy" onload="this.parentElement.classList.add('is-loaded'); this.parentElement.classList.remove('is-loading');"></div>`;
        }

        // Add videos
        videos.forEach(src => {
            if (src.trim()) {
                mediaHtml += `
                <div class="gm-cover gm-video-wrap is-loading">
                    <video class="gm-video" data-src="${src.trim()}" muted loop playsinline preload="none" onloadeddata="this.parentElement.classList.add('is-loaded'); this.parentElement.classList.remove('is-loading');"></video>
                </div>`;
            }
        });

        // Add extra photos with potential links
        photos.forEach((src, idx) => {
            if (src.trim()) {
                mediaHtml += `<div class="gm-cover is-loading"><img src="${src.trim()}" alt="Project View" loading="lazy" onload="this.parentElement.classList.add('is-loaded'); this.parentElement.classList.remove('is-loading');"></div>`;
                if (links[idx] && links[idx].trim()) {
                    mediaHtml += `<div class="gm-link-row"><a href="${links[idx].trim()}" target="_blank" class="gm-link-btn">Visit Website</a></div>`;
                }
            }
        });

        const isSquare  = ['magazine', 'poser society'].includes(category.toLowerCase());
        const isStacked = ['typography', 'street photograghy'].includes(category.toLowerCase());
        const isNatural = category.toLowerCase() === 'websites';
        const isNoGap   = category.toLowerCase() === 'magazine';

        return {
            title,
            html: `
                <div class="gm-meta"><span class="gm-category">${category}</span></div>
                <div class="gm-desc"><p>${desc}</p></div>
                <div class="gm-media-stack ${isSquare ? 'gm-square' : ''} ${isStacked ? 'gm-stacked' : ''} ${isNatural ? 'gm-natural' : ''} ${isNoGap ? 'gm-no-gap' : ''}">${mediaHtml}</div>
            `
        };
    }

    function lazyLoadOverlayVideos(container) {
        const videos = container.querySelectorAll('video[data-src]');
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    const v = e.target;
                    if (v.dataset.src) {
                        v.src = v.dataset.src;
                        v.load();
                        v.play();
                    }
                    obs.unobserve(v);
                }
            });
        }, { threshold: 0.2 });
        videos.forEach(v => obs.observe(v));
    }

    /* ══════════════════════════════════════
       DESKTOP — OVERLAY MODAL
    ══════════════════════════════════════ */

    function openOverlay(item) {
        const { title, html } = buildContent(item);
        overlayTitle.textContent = title;
        overlayBody.innerHTML = html;
        overlayInner.scrollTop = 0;

        // Make visible first (display flex), then trigger animation
        overlay.style.display = 'flex';
        // rAF ensures the browser has painted before we add the active class
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                overlay.classList.add('is-open');
            });
        });

        lockScroll();
        lazyLoadOverlayVideos(overlayBody);
    }

    function closeOverlay() {
        overlay.classList.remove('is-open');
        overlay.addEventListener('transitionend', function onEnd(e) {
            if (e.target !== overlay) return;
            overlay.style.display = 'none';
            overlay.removeEventListener('transitionend', onEnd);
        });
        unlockScroll();
    }

    /* ══════════════════════════════════════
       MOBILE — SLIDE-UP PAGE
    ══════════════════════════════════════ */

    function openMobilePage(item) {
        const { title, html } = buildContent(item);
        mobileTitle.textContent = title;
        mobileBody.innerHTML = html;
        mobileInner.scrollTop = 0;

        mobilePage.style.display = 'flex';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                mobilePage.classList.add('is-open');
            });
        });

        lockScroll();
        lazyLoadOverlayVideos(mobileBody);
    }

    function closeMobilePage() {
        mobilePage.classList.remove('is-open');
        mobilePage.addEventListener('transitionend', function onEnd(e) {
            if (e.target !== mobilePage) return;
            mobilePage.style.display = 'none';
            mobilePage.removeEventListener('transitionend', onEnd);
        });
        unlockScroll();
    }

    /* ══════════════════════════════════════
       GRID ITEM CLICK DELEGATE
    ══════════════════════════════════════ */

    document.querySelectorAll('.grid-item:not(.grid-item--static):not(.grid-item--back)').forEach(function (item) {
        item.addEventListener('click', function () {
            if (isDesktop()) {
                openOverlay(item);
            } else {
                openMobilePage(item);
            }
        });
    });

    /* ── Overlay close interactions ── */
    overlayClose.addEventListener('click', closeOverlay);

    overlay.addEventListener('click', function (e) {
        // Click outside the window (on the backdrop)
        if (e.target === overlay) closeOverlay();
    });

    /* ── Mobile back interaction ── */
    mobileBack.addEventListener('click', closeMobilePage);

    /* ── Keyboard: Escape ── */
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (overlay.classList.contains('is-open')) closeOverlay();
        if (mobilePage.classList.contains('is-open')) closeMobilePage();
    });

    /* ══════════════════════════════════════
       RESIZE GUARD
       If the user resizes across the breakpoint while
       a panel is open, close it cleanly.
    ══════════════════════════════════════ */
    let resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            if (overlay.classList.contains('is-open') && !isDesktop()) {
                closeOverlay();
            }
            if (mobilePage.classList.contains('is-open') && isDesktop()) {
                closeMobilePage();
            }
        }, 150);
    });

    /* ══════════════════════════════════════
       PAGE LOADER
    ══════════════════════════════════════ */
    function hidePageLoader() {
        const pageLoader = document.getElementById("pageLoader");
        if (!pageLoader) return;
        gsap.to(pageLoader, {
            opacity: 0,
            duration: 0.5,
            ease: "power2.inOut",
            onComplete: () => {
                pageLoader.style.display = "none";
                // Staggered entrance animation after loader is gone
                gsap.to('.grid-item', {
                    opacity: 1,
                    y: 0,
                    duration: 1.1,
                    ease: 'expo.out',
                    stagger: {
                        each: 0.07,
                        from: 'start'
                    }
                });
            },
        });
    }

    if (document.readyState === "complete") {
        hidePageLoader();
    } else {
        window.addEventListener("load", hidePageLoader);
    }

})();
