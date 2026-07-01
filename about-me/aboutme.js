import { prepareWithSegments, layoutWithLines } from './pretext.js';

/* ─────────────────────────────────────────────────────────────
   GSAP — page entrance animations
───────────────────────────────────────────────────────────── */
gsap.registerPlugin(ScrollTrigger);

document.addEventListener('DOMContentLoaded', () => {
    const duration = 0.8, stagger = 0.05;

    gsap.to(".hero-wrapper .reveal:not(#aboutStringContainer)", {
        opacity: 1, y: 0, startAt: { y: 4 }, duration, stagger, ease: "power2.out"
    });
    gsap.to("#aboutStringContainer", {
        opacity: 1, duration: 0.6, ease: "power2.out", delay: 0.15
    });
    gsap.to(".exp-item.reveal", {
        opacity: 1, y: 0, startAt: { y: 4 }, duration, stagger, ease: "power2.out",
        scrollTrigger: { trigger: ".mid-section", start: "top 90%" }
    });
    gsap.to(".pill.reveal", {
        opacity: 1, y: 0, startAt: { y: 4 }, duration, stagger: 0.02, ease: "power2.out",
        scrollTrigger: { trigger: ".skills-col", start: "top 90%" },
        onComplete: initPillPhysics
    });
    gsap.to(".online-row.reveal", {
        opacity: 1, y: 0, startAt: { y: 4 }, duration, stagger, ease: "power2.out",
        scrollTrigger: { trigger: ".online-col", start: "top 90%" }
    });
    gsap.to(".bottom-section .reveal", {
        opacity: 1, y: 0, startAt: { y: 4 }, duration, stagger, ease: "power2.out",
        scrollTrigger: { trigger: ".bottom-section", start: "top 90%" }
    });
});

/* ─────────────────────────────────────────────────────────────
   MATTER.JS PHYSICS — Skills Pills
───────────────────────────────────────────────────────────── */
function initPillPhysics() {
    // Disable physics on mobile
    if (typeof Matter === 'undefined' || window.innerWidth <= 768) return;

    const Engine = Matter.Engine,
        Runner = Matter.Runner,
        Bodies = Matter.Bodies,
        Composite = Matter.Composite,
        Mouse = Matter.Mouse,
        MouseConstraint = Matter.MouseConstraint,
        Events = Matter.Events;

    const engine = Engine.create();
    const world = engine.world;
    engine.gravity.y = 0.8; // a bit floaty

    const skillsList = document.querySelector('.skills-list');
    const pills = Array.from(skillsList.querySelectorAll('.pill'));

    if (!skillsList || pills.length === 0) return;

    // Measure the exact layout so we can freeze the container size
    const rect = skillsList.getBoundingClientRect();

    // Freeze container dimensions
    skillsList.style.width = rect.width + 'px';
    skillsList.style.height = rect.height + 'px';
    skillsList.style.position = 'relative';

    const pillBodies = [];

    // Capture pill positions BEFORE making them absolute
    const pillData = pills.map(pill => {
        const pRect = pill.getBoundingClientRect();
        return {
            el: pill,
            w: pRect.width,
            h: pRect.height,
            x: pRect.left - rect.left,
            y: pRect.top - rect.top
        };
    });

    // Create boundaries (walls, floor, ceiling)
    const wallOpts = { isStatic: true };
    const floor = Bodies.rectangle(rect.width / 2, rect.height + 25, rect.width, 50, wallOpts);
    const ceil = Bodies.rectangle(rect.width / 2, -25, rect.width, 50, wallOpts);
    const leftWall = Bodies.rectangle(-25, rect.height / 2, 50, rect.height, wallOpts);
    const rightWall = Bodies.rectangle(rect.width + 25, rect.height / 2, 50, rect.height, wallOpts);

    Composite.add(world, [floor, ceil, leftWall, rightWall]);

    // Create dynamic bodies for pills
    pillData.forEach(data => {
        // Matter positions bodies by center of mass
        const cx = data.x + data.w / 2;
        const cy = data.y + data.h / 2;

        const body = Bodies.rectangle(cx, cy, data.w, data.h, {
            restitution: 0.6,   // bouncy!
            friction: 0.1,
            density: 0.001,
            chamfer: { radius: data.h / 2 } // perfectly pill-shaped hitbox
        });

        pillBodies.push({ body, el: data.el, w: data.w, h: data.h });
        Composite.add(world, body);

        // Convert HTML elements to absolute positioning
        data.el.style.position = 'absolute';
        data.el.style.margin = '0';
        data.el.style.top = '0';
        data.el.style.left = '0';
        data.el.style.cursor = 'grab';
    });

    // Add mouse constraint to drag pills
    const mouse = Mouse.create(skillsList);
    const mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
            stiffness: 0.2,
            render: { visible: false }
        }
    });
    Composite.add(world, mouseConstraint);

    // Sync DOM element transforms with Matter.js physics bodies
    Events.on(engine, 'afterUpdate', () => {
        pillBodies.forEach(({ body, el, w, h }) => {
            const x = body.position.x - w / 2;
            const y = body.position.y - h / 2;
            const angle = body.angle;
            el.style.transform = `translate(${x}px, ${y}px) rotate(${angle}rad)`;
        });
    });

    // Visual drag states
    Events.on(mouseConstraint, 'startdrag', () => {
        if (mouseConstraint.body) {
            const index = pillBodies.findIndex(b => b.body === mouseConstraint.body);
            if (index !== -1) pillBodies[index].el.style.cursor = 'grabbing';
        }
    });
    Events.on(mouseConstraint, 'enddrag', () => {
        pillBodies.forEach(b => b.el.style.cursor = 'grab');
    });

    // Start simulation
    Runner.run(Runner.create(), engine);
}

/* ─────────────────────────────────────────────────────────────
   TEXTSTRING PHYSICS — About paragraph
   Based on https://github.com/pushmatrix/textstring
───────────────────────────────────────────────────────────── */
const ABOUT_TEXT =
    "I'm a designer from Kerala and a Fashion Communication student at NIFT, currently diving into the world of UI/UX design and UX research. I've always been drawn to creative storytelling, whether I'm working on graphic design, 3D projects, or video editing. For me, it's all about human-centric design ensuring that whatever I build feels natural and grounded in how people actually live. " +
    "Outside of work, I'm someone who just loves to be out there. I spend a lot of my time traveling and exploring new places, from the mountains to the coast. I've realized that while I love the process of building digital interfaces, I need that balance of seeing the world and living fully.";

const FONT_SIZE = 16;
const FONT_WEIGHT = '300';
const FONT_FAMILY = 'Geist, system-ui, sans-serif';
const FONT = `${FONT_WEIGHT} ${FONT_SIZE}px ${FONT_FAMILY}`;
const LINE_HEIGHT = 22;
const CONSTRAINT_DIST = 1.15;
const UNLOCK_THRESHOLD = 1.5;
const ITERATIONS = 14;
const DAMPING = 0.97;
const GRAVITY = 0.13;
const DRAGGABLE_COUNT = 8;

const container = document.getElementById('aboutStringContainer');

function buildStringEffect() {
    container.innerHTML = '';

    // ── measure ──
    const measureCtx = document.createElement('canvas').getContext('2d');
    measureCtx.font = FONT;

    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    const allGraphemes = [...segmenter.segment(ABOUT_TEXT)].map(s => s.segment);
    const gWidths = allGraphemes.map(g => measureCtx.measureText(g).width);

    // ── layout text into lines, returns local positions AND exact line indices ──
    function layoutPositionsAndLines(maxW) {
        const positions = [];
        const lineIndices = [];
        let currentLine = [];
        let x = 0, lineY = 0;

        for (let gi = 0; gi < allGraphemes.length; gi++) {
            const g = allGraphemes[gi];
            const w = gWidths[gi];

            // Soft word-wrap: look ahead at next word width
            if (g === ' ' && x > 0) {
                let wordW = 0;
                for (let j = gi + 1; j < allGraphemes.length && allGraphemes[j] !== ' '; j++) {
                    wordW += gWidths[j];
                }
                if (x + w + wordW > maxW) {
                    // wrap: put space at end of line
                    positions.push({ x: x + w, y: lineY, w: 0 });
                    currentLine.push(gi);
                    lineIndices.push(currentLine);
                    currentLine = [];
                    x = 0; lineY += LINE_HEIGHT;
                    continue;
                }
            }

            positions.push({ x, y: lineY, w });
            currentLine.push(gi);
            x += w;
        }
        if (currentLine.length > 0) {
            lineIndices.push(currentLine);
        }

        return { positions, lineIndices };
    }

    // ── zig-zag string order ──
    function buildStringOrder(lineIndices) {
        const order = [];
        const lastLi = lineIndices.length - 1;
        const needFlip = lastLi % 2 === 1; // ensures last line is always L->R

        for (let li = 0; li < lineIndices.length; li++) {
            const rev = needFlip ? (li % 2 === 0) : (li % 2 === 1);
            order.push(...(rev ? [...lineIndices[li]].reverse() : lineIndices[li]));
        }
        return order;
    }

    function getMaxWidth() {
        const w = container.getBoundingClientRect().width;
        return (w > 0 ? w : 460) - 2; // slight inset
    }

    const maxW = getMaxWidth();
    const { positions, lineIndices } = layoutPositionsAndLines(maxW);
    const stringOrder = buildStringOrder(lineIndices);

    // Total text height
    const totalH = Math.max(...positions.map(p => p.y)) + LINE_HEIGHT * 2;
    container.style.height = totalH + 'px';

    // letters: positions are LOCAL coordinates inside container
    const letters = stringOrder.map(ri => {
        const p = positions[ri] || { x: 0, y: 0, w: 8 };
        return {
            ch: allGraphemes[ri], w: p.w,
            x: p.x, y: p.y,
            ox: p.x, oy: p.y,
            px: p.x, py: p.y,
            readingIdx: ri, locked: true
        };
    });

    // rest lengths between string-order neighbours
    function computeRestLengths() {
        return letters.slice(0, -1).map((a, i) => {
            const b = letters[i + 1];
            return Math.hypot(
                (b.ox + b.w / 2) - (a.ox + a.w / 2),
                (b.oy + LINE_HEIGHT / 2) - (a.oy + LINE_HEIGHT / 2)
            ) * CONSTRAINT_DIST;
        });
    }
    let restLengths = computeRestLengths();

    // ── DOM ──
    const els = letters.map(l => {
        const s = document.createElement('span');
        s.textContent = l.ch;
        s.style.cssText = [
            'position:absolute', 'top:0', 'left:0',
            'will-change:transform',
            `font:${FONT_WEIGHT} ${FONT_SIZE}px/${LINE_HEIGHT}px ${FONT_FAMILY}`,
            'color:#000', 'pointer-events:none',
        ].join(';');
        container.appendChild(s);
        return s;
    });

    // Unlock tail letters
    const lastIdx = letters.length - 1;
    for (let i = lastIdx; i > lastIdx - DRAGGABLE_COUNT && i >= 0; i--) {
        letters[i].locked = false;
        els[i].style.pointerEvents = 'auto';
        els[i].style.cursor = 'grab';
        els[i].style.zIndex = '10';
    }

    // ── "pull" hint ──
    const hint = document.createElement('span');
    hint.className = 'ts-hint';
    hint.textContent = '← pull';
    container.appendChild(hint);

    function positionHint() {
        const last = letters[lastIdx];
        hint.style.left = (last.ox + last.w + 6) + 'px';
        hint.style.top = (last.oy + LINE_HEIGHT / 2 - 6) + 'px';
        hint.style.opacity = '1';
    }
    setTimeout(positionHint, 700);

    // ── drag ──
    const drags = new Map();
    let isActive = false;

    function isDragged(idx) {
        for (const d of drags.values()) if (d.idx === idx) return true;
        return false;
    }

    function hideHint() {
        hint.style.opacity = '0';
    }

    container.addEventListener('pointerdown', e => {
        const idx = els.indexOf(e.target);
        if (idx === -1 || letters[idx].locked) return;
        if (isDragged(idx)) return;
        const rect = container.getBoundingClientRect();
        drags.set(e.pointerId, {
            idx,
            offsetX: e.clientX - rect.left - letters[idx].x,
            offsetY: e.clientY - rect.top - letters[idx].y
        });
        els[idx].style.cursor = 'grabbing';
        e.target.setPointerCapture(e.pointerId);
        e.preventDefault();
        isActive = true;
        hideHint();
    });

    window.addEventListener('pointermove', e => {
        const d = drags.get(e.pointerId);
        if (!d) return;
        const rect = container.getBoundingClientRect();
        const l = letters[d.idx];
        l.x = e.clientX - rect.left - d.offsetX;
        l.y = e.clientY - rect.top - d.offsetY;
        l.px = l.x; l.py = l.y;
        l.locked = false;
    });

    window.addEventListener('pointerup', e => {
        const d = drags.get(e.pointerId);
        if (!d) return;
        els[d.idx].style.cursor = 'grab';
        drags.delete(e.pointerId);
    });

    window.addEventListener('pointercancel', e => {
        const d = drags.get(e.pointerId);
        if (!d) return;
        els[d.idx].style.cursor = 'grab';
        drags.delete(e.pointerId);
    });

    // click outside → reset
    document.addEventListener('pointerdown', e => {
        if (isActive && !container.contains(e.target)) {
            resetString();
        }
    });

    function resetString() {
        isActive = false;
        drags.clear();

        for (let i = 0; i < letters.length; i++) {
            const l = letters[i];
            l.x = l.ox; l.y = l.oy;
            l.px = l.ox; l.py = l.oy;
            l.locked = true;
            els[i].style.pointerEvents = 'none';
            els[i].style.cursor = 'default';
            els[i].style.zIndex = '';
        }
        for (let i = lastIdx; i > lastIdx - DRAGGABLE_COUNT && i >= 0; i--) {
            letters[i].locked = false;
            els[i].style.pointerEvents = 'auto';
            els[i].style.cursor = 'grab';
            els[i].style.zIndex = '10';
        }
        restLengths = computeRestLengths();
        positionHint();
    }

    // ── physics ──
    function simulate() {
        // propagate unlock
        for (let i = letters.length - 2; i >= 0; i--) {
            if (!letters[i].locked || letters[i + 1].locked) continue;
            const a = letters[i], b = letters[i + 1];
            const dist = Math.hypot(
                (b.x + b.w / 2) - (a.ox + a.w / 2),
                (b.y + LINE_HEIGHT / 2) - (a.oy + LINE_HEIGHT / 2)
            );
            if (dist > restLengths[i] + UNLOCK_THRESHOLD) {
                a.locked = false; a.px = a.x; a.py = a.y; isActive = true;
            }
        }

        // Verlet
        for (let i = 0; i < letters.length; i++) {
            const l = letters[i];
            if (l.locked || isDragged(i)) continue;
            const vx = (l.x - l.px) * DAMPING;
            const vy = (l.y - l.py) * DAMPING;
            l.px = l.x; l.py = l.y;
            l.x += vx; l.y += vy + GRAVITY;
        }

        // constraints
        for (let it = 0; it < ITERATIONS; it++) {
            for (let i = 0; i < letters.length - 1; i++) {
                const a = letters[i], b = letters[i + 1];
                if (a.locked && b.locked) continue;
                const ax = a.x + a.w / 2, ay = a.y + LINE_HEIGHT / 2;
                const bx = b.x + b.w / 2, by = b.y + LINE_HEIGHT / 2;
                const dx = bx - ax, dy = by - ay;
                const dist = Math.hypot(dx, dy) || 0.001;
                const diff = (dist - restLengths[i]) / dist;
                const aF = a.locked || isDragged(i);
                const bF = b.locked || isDragged(i + 1);
                if (aF && !bF) { b.x -= dx * diff; b.y -= dy * diff; }
                else if (!aF && bF) { a.x += dx * diff; a.y += dy * diff; }
                else if (!aF && !bF) {
                    a.x += dx * diff * 0.5; a.y += dy * diff * 0.5;
                    b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5;
                }
            }
        }

        // local boundary bounce
        const rect = container.getBoundingClientRect();
        const heroWrapper = document.querySelector('.hero-wrapper');
        const heroRect = heroWrapper ? heroWrapper.getBoundingClientRect() : rect;

        // Horizontal bounds: viewport width
        const minX = -rect.left;
        const maxX = window.innerWidth - rect.left;

        // Vertical bounds: bounce off the bottom of the hero-wrapper
        const minY = -rect.top;
        const maxY = heroRect.bottom - rect.top - LINE_HEIGHT;

        const bounce = 0.35;
        for (let i = 0; i < letters.length; i++) {
            const l = letters[i];
            if (l.locked || isDragged(i)) continue;
            if (l.x < minX) { l.x = minX; l.px = l.x + (l.x - l.px) * bounce; }
            if (l.x > maxX - l.w) { l.x = maxX - l.w; l.px = l.x + (l.x - l.px) * bounce; }
            // Floor bounce!
            if (l.y > maxY) { l.y = maxY; l.py = l.y + (l.y - l.py) * bounce; }
        }
    }

    // render loop — 120 Hz fixed timestep
    const FIXED_DT = 1 / 120, MAX_STEPS = 4;
    let acc = 0, lastT = -1;

    function render(now) {
        if (lastT < 0) { lastT = now; requestAnimationFrame(render); return; }
        const dt = Math.min((now - lastT) / 1000, MAX_STEPS * FIXED_DT);
        lastT = now; acc += dt;
        while (acc >= FIXED_DT) { simulate(); acc -= FIXED_DT; }

        for (let i = 0; i < letters.length; i++) {
            els[i].style.transform = `translate(${letters[i].x}px,${letters[i].y}px)`;
            if (!letters[i].locked && !isDragged(i)) {
                els[i].style.pointerEvents = 'auto';
                els[i].style.cursor = 'grab';
            }
        }
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

document.addEventListener('DOMContentLoaded', buildStringEffect);
