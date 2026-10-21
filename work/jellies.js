// Intro jellyfish: faint ASCII jellyfish drifting across the intro, in the tiled-glyph style of
// stackedlol/ascii-sharks (each character sits on its own small grey tile; dense glyphs on darker tiles,
// a few softly coloured accents, a blurred shadow underneath). That repo has no licence, so this is written
// from scratch. Nothing else is drawn until you touch: the page stays white.
//
//   count      scales with the screen: 3 on a desktop, 2 on a phone, max 4, all different sizes
//   bell       a dome that pulses: a quick squeeze pushes it forward, then it relaxes and glides
//   tentacles  5 trailing chains + 2 frilly oral arms that stream behind the way it moves
//   hover      a mouse nearby eases the jellyfish away and sways its tentacles aside
//   touch      a click / tap anywhere sends a ripple out from that point, made of ASCII characters that
//              only exist while the wave passes (blue at the centre first, cyan further out, then white
//              again after ~1.7s). When the wave reaches a jellyfish it lights up a little, wobbles, and
//              darts off in a new random direction (mostly away), with a soft elastic start and a long glide;
//              the passing wave also carries it outward
//   edges      they never leave the page: a soft springy wall near each edge bounces them back and they
//              turn to swim back in
//
// One canvas behind the intro text; only the cells around each jellyfish and each ripple are visited.
// Runs only while the intro shows (stops after the first scroll), pauses when the tab is hidden,
// and draws a single still frame (no ripples) under prefers-reduced-motion.

const root = document.documentElement;
const canvas = document.querySelector(".intro-jellies");
const CW = 6, CH = 9;                                       // character cell, px (a tile is 1px smaller)
const FONT_PX = 8;
const TILE_MAX = 0.09;                                      // darkest tile: 9% black (subtle)
const GLYPH_MAX = 0.52;                                     // darkest character at rest: 52% black
const BODY = ":;t%SX8@";                                    // light → dense, like the clip
const LIGHT = ".',`";                                       // sparse edge / tentacle characters
const ACCENTS = ["143,200,87", "224,122,95", "155,127,209", "79,179,191"];   // sage, coral, lilac, teal
const ACCENT_ALPHA = 0.55;
const BELL_R = 84;                                          // bell radius of the biggest, px (168px wide)
const MIN_SIZE = 0.6;                                       // the smallest is 60% of the biggest
const TENTACLES = 8, ORAL = 3, NODES = 16;
const HOVER_R = 160;

// ripple
// the ripple has its own, larger character grid so the characters are readable (the jellyfish keep their
// fine grid); each click sends two separate rings, the second a moment behind the first
const RCW = 6, RCH = 10, RFONT_PX = 6;                       // ripple character cell + size, px (between the first and second version)
const RING_LIFE = 1.6;                                       // seconds each ring lives
const RING_DELAY = 0.22;                                    // the second ring follows this much later
const RING_STRENGTH = [1, 0.8];                             // first ring, second ring
const RIP_LIFE = RING_LIFE + RING_DELAY;                    // until the page is white again
const RIP_REACH = 280;                                      // px a ring travels
const RIP_MAX = 0.85;                                       // brightest ripple character
const RIP_CHARS = ".:-=+*#%";                               // faint → bright (plain ASCII: cheapest to draw)
const RIP_HUES = ["47,107,255", "40,150,245", "34,197,227"]; // blue (near the centre) → azure → cyan (far out)
const MAX_RIPPLES = 5;
const KICK_R = 300;                                       // jellyfish within this react to a touch

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const angleDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const hash = (x, y, z = 0) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// pulse over one cycle: a smooth cosine squeeze with the phase skewed so the squeeze is quicker (first 35%) than
// the relax (the rest); the slope is zero at the turning points, so there are no kinks anywhere in the motion
const squeeze = (p) => {
  const q = p < 0.35 ? (p / 0.35) * 0.5 : 0.5 + ((p - 0.35) / 0.65) * 0.5;
  return 0.5 - 0.5 * Math.cos(TAU * q);
};
// the ripple's radius over its life: fast out of the touch, slowing as it spreads
const ripEase = (u) => 1 - Math.pow(1 - u, 3);
// …and the inverse: when does the first wave reach distance d? (used to time each jellyfish's reaction)
const ripArrival = (d) => (d >= RIP_REACH ? RING_LIFE : RING_LIFE * (1 - Math.pow(1 - d / RIP_REACH, 1 / 3)));

if (canvas) start();

function start() {
  const ctx = canvas.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pointer = { x: 0, y: 0, active: false };
  let W = 0, H = 0, dpr = 1, time = 0, cols = 0, rows = 0;
  let field = new Float32Array(0), hueOf = new Uint8Array(0);   // ripple intensity per cell, this frame
  const touched = [];                                           // cells written this frame
  const ripples = [];
  const roster = [];                                            // every jellyfish (so they can keep apart)

  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `${FONT_PX}px ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    cols = Math.ceil(W / RCW) + 1; rows = Math.ceil(H / RCH) + 1;   // the ripple's grid
    field = new Float32Array(cols * rows); hueOf = new Uint8Array(cols * rows);
  }

  // ---------- jellyfish ----------
  function makeJelly(size, slot, count) {
    const R = BELL_R * size;
    const j = {
      size, R,
      x: (W * (slot + 0.5)) / count + rand(-30, 30), y: H * rand(0.3, 0.8),
      vx: 0, vy: 0,
      ang: rand(-0.25, 0.25), angV: 0, tilt: 0,            // bell axis (0 = straight up); tilt = ang, for drawing
      wander: rand(0, TAU),                                 // slow random steering
      phase: rand(0, 1), period: rand(1.4, 2.0) * (0.85 + 0.3 * size), c: 0, active: 1,
      startle: 0,                                           // 1 right after a touch, fades: faster, stronger pulses
      esc: 0, escTilt: 0, escActive: 1,                     // escaping after a touch: which way to tilt, how hard to pulse
      rest: 0, restT: rand(6, 14),                          // short rests between bursts of swimming (it drifts and sinks)
      kick: null,                                           // the wave's shove, ramped in over a fraction of a second
      wob: 0, wobV: 0,                                      // elastic squash of the bell
      lit: 0,                                               // brightened by a passing ripple
      seed: (Math.random() * 1e6) | 0,
      tents: [],
    };
    // fewer strands on smaller jellyfish so they stay clean: 6 + 3 arms on the biggest, 4 + 2 on the smallest
    const nt = 4 + Math.round(2 * clamp((size - MIN_SIZE) / (1 - MIN_SIZE), 0, 1));
    const no = size > 0.8 ? ORAL : ORAL - 1;
    for (let t = 0; t < nt + no; t++) {
      const oral = t >= nt;
      const across = oral ? (t - nt - (no - 1) / 2) * 0.32 : -0.85 + (1.7 * t) / (nt - 1);
      const len = R * (oral ? 1.9 : 3.4) * (oral ? rand(0.85, 1.1) : rand(0.65, 1.15));   // varied lengths look natural
      const nodes = [];
      for (let k = 0; k < NODES; k++) nodes.push({ x: 0, y: 0 });
      j.tents.push({ oral, across, seg: len / (NODES - 1), nodes, seed: rand(0, TAU) });
    }
    snapTentacles(j);
    roster.push(j);
    pickGoal(j);
    return j;
  }
  // a destination anywhere on the page (away from the very edges); optionally biased along a direction
  function pickGoal(j, ang) {
    if (ang === undefined) {
      // spread over the whole page, favouring the corners and edges (a uniform pick leaves them crossing
      // the middle most of the time): 50% a corner, 30% the middle of an edge, 20% anywhere.
      // Try a few random spots and keep the one farthest from every other jellyfish and its destination,
      // so they spread out instead of piling into the same corner.
      const lo = () => rand(0.07, 0.2), hi = () => rand(0.8, 0.93);
      let bx = 0, by = 0, bs = -1;
      for (let tries = 0; tries < 6; tries++) {
        const roll = Math.random();
        let x, y;
        if (roll < 0.5) { x = (Math.random() < 0.5 ? lo() : hi()) * W; y = (Math.random() < 0.5 ? lo() : hi()) * H; }
        else if (roll < 0.8) {
          const side = (Math.random() * 4) | 0;
          x = (side === 0 ? lo() : side === 1 ? hi() : rand(0.25, 0.75)) * W;
          y = (side === 2 ? lo() : side === 3 ? hi() : rand(0.25, 0.75)) * H;
        } else { x = rand(0.08, 0.92) * W; y = rand(0.1, 0.9) * H; }
        let nearest = 1e9;
        for (const o of roster) {
          if (o === j) continue;
          nearest = Math.min(nearest, Math.hypot(o.x - x, o.y - y), o.gx === undefined ? 1e9 : Math.hypot(o.gx - x, o.gy - y));
        }
        // also favour spots far from where it is now, so it travels across the page instead of circling its own patch
        const score = Math.min(nearest, W * 0.5) + 0.8 * Math.hypot(x - j.x, y - j.y);
        if (score > bs) { bs = score; bx = x; by = y; }
      }
      j.gx = bx; j.gy = clamp(by, j.R * 1.7, H - j.R * 1.7);   // not in the edge bands where the walls turn it back
    } else {
      const dist = rand(380, 760);                           // roam far after a touch
      j.gx = clamp(j.x + Math.sin(ang) * dist, W * 0.07, W * 0.93);
      j.gy = clamp(j.y - Math.cos(ang) * dist, j.R * 1.7, H - j.R * 1.7);
    }
    // enough time to actually get there at the calm cruising speed (~30px/s), plus a little linger
    j.goalT = clamp(Math.hypot(j.gx - j.x, j.gy - j.y) / 13 + rand(3, 6), 15, 50);   // time to actually arrive
  }
  function snapTentacles(j) {
    for (const t of j.tents) t.nodes.forEach((nd, k) => { nd.x = j.x + t.across * j.R; nd.y = j.y + k * t.seg; });
  }

  // ---------- motion ----------
  // A jellyfish only moves by squeezing its bell: each squeeze pushes it along the bell's own axis, then it
  // coasts and slowly sinks. It stays upright-ish (never more than MAX_TILT from vertical), so the tilt you
  // see is the way it swims. To go sideways it tilts; to go up it pulses steadily; to go down it rests
  // between pulses and sinks. It turns mostly while squeezing, so turns come in gentle steps, never spins.
  const MAX_TILT = 0.85;                                     // ~49° from upright
  const THRUST = 85;                                         // px/s of push per full squeeze (biggest jellyfish)
  const DRAG = 1.15;                                         // water drag, per second
  const SINK = 24;                                           // px/s² of sinking (terminal ~20px/s)

  // the moment the ripple's wave reaches a jellyfish: the wave shoves it and rocks the bell, then it swims
  // off with quick strong pulses, tilting away (from a touch above, it tilts aside and sinks away instead)
  function react(j, fromX, fromY, strength) {
    const dx = j.x - fromX, dy = j.y - fromY, d = Math.hypot(dx, dy) || 1;
    // 1 the water shove: away from the touch, ramped in (an elastic start), in any direction
    const shove = (70 + 130 * strength) * rand(0.85, 1.15);
    j.kick = { vx: (dx / d) * shove, vy: (dy / d) * shove, left: 0.3, total: 0.3 };
    j.angV += (dx / d) * 1.6 * strength * rand(0.7, 1.3);    // the shove rocks the bell away from the touch
    j.wobV += (5 + 7 * strength) * (Math.random() < 0.5 ? -1 : 1);
    // 2 the escape: which way to tilt (random around "away"), and how hard to swim
    const side = Math.abs(dx) > 8 ? Math.sign(dx) : (Math.random() < 0.5 ? -1 : 1);
    if (dy < -d * 0.35) {                                    // touched from below: swim up and away
      j.escTilt = clamp(Math.atan2(dx, -dy) + rand(-0.35, 0.35), -MAX_TILT, MAX_TILT);
      j.escActive = 1;
    } else if (dy > d * 0.35) {                              // touched from above: tilt aside, pulse less, sink away
      j.escTilt = side * MAX_TILT * rand(0.75, 1);
      j.escActive = 0.35;
    } else {                                                 // from the side: tilt hard away and swim
      j.escTilt = side * MAX_TILT * rand(0.8, 1);
      j.escActive = 1;
    }
    // near a side wall, escape along it instead of into it
    if ((j.x < W * 0.12 && j.escTilt < 0) || (j.x > W * 0.88 && j.escTilt > 0)) j.escTilt *= -0.6;
    j.esc = Math.max(j.esc, 0.5 + 0.5 * strength);
    j.startle = Math.max(j.startle, strength);
    j.rest = 0;
    if (strength > 0.35) j.phase = 0;                        // close ones squeeze right away
    // afterwards it roams on in roughly that direction instead of drifting straight back
    const roam = dy > d * 0.35 ? Math.sign(j.escTilt || 1) * 2.2 : j.escTilt * 1.3;   // from above: aside and down
    pickGoal(j, roam);
  }

  function step(j, dt) {
    // ---- where it wants to go: a roaming goal, a slow wander, room from the others and the edges ----
    j.goalT -= dt;
    if (j.goalT <= 0 || Math.hypot(j.gx - j.x, j.gy - j.y) < Math.max(j.R * 1.5, 120)) pickGoal(j);   // close enough: move on
    const gdx = j.gx - j.x, gdy = j.gy - j.y;
    // tilt toward the goal's side; a goal below gives a sideways tilt (it sinks the rest of the way)
    let want = clamp(Math.atan2(gdx, Math.max(-gdy, 70)), -MAX_TILT, MAX_TILT);
    j.wander += dt * 0.3;
    want += Math.sin(j.wander) * 0.22 + Math.sin(j.wander * 0.47 + j.seed) * 0.12;
    for (const o of roster) {                                // lean away from a neighbour that is close
      if (o === j) continue;
      const ox = j.x - o.x, oy = j.y - o.y, od = Math.hypot(ox, oy) || 1, near = (j.R + o.R) * 2.2;
      // stacked one above the other there is no sideways push: pick a side (fixed per jellyfish) so they slide past
      const side = Math.abs(ox) > 20 ? Math.sign(ox) : (j.seed & 1 ? 1 : -1);
      if (od < near) want += side * Math.max(Math.abs(ox) / od, 0.6) * (1 - od / near) * 0.9;
    }
    const edge = j.R * 1.6;                                  // lean away from the side walls
    if (j.x < edge) want += (1 - j.x / edge) * 0.9;
    if (j.x > W - edge) want -= (1 - (W - j.x) / edge) * 0.9;
    if (pointer.active) {                                    // hover: lean away from the mouse
      const hx = j.x - pointer.x, hy = j.y - pointer.y, hd = Math.hypot(hx, hy);
      if (hd < HOVER_R && hd > 1) want += (hx / hd) * (1 - hd / HOVER_R) * 0.7;
    }
    if (j.esc > 0) want = want * (1 - j.esc) + j.escTilt * j.esc;
    want = clamp(want, -MAX_TILT, MAX_TILT);

    // ---- how hard to swim: up = keep pulsing, down = rest and sink; short rests now and then ----
    // active = how hard each pulse pushes (the rhythm stays steady): going down = soft pulses, so it sinks
    let active = gdy < -40 ? 1 : gdy > 60 ? 0.08 : 0.8;
    if (j.y < j.R * 1.4) active = 0;                         // near the top: soft pulses, drift down
    if (j.y > H - j.R * 1.2) active = 1;                     // near the bottom: swim up
    j.restT -= dt;
    if (j.restT <= 0) { j.rest = rand(0.8, 1.8); j.restT = rand(10, 18); }   // brief pauses, never a long hang
    if (j.rest > 0) { j.rest -= dt; active *= 0.3; }
    if (j.esc > 0) active = active * (1 - j.esc) + j.escActive * j.esc;
    j.active += (active - j.active) * Math.min(1, dt * 1.5);

    // ---- the pulse: it always finishes a squeeze; when resting it waits relaxed before the next ----
    const rate = (1 + j.startle * 1.5) / j.period;
    const prevC = j.c;
    j.phase += dt * rate * (j.phase > 0.8 ? Math.max(0.35, j.active) : 1);
    if (j.phase >= 1) j.phase -= 1;
    j.c = squeeze(j.phase);
    const dc = Math.max(0, j.c - prevC);                    // only the squeeze pushes

    // ---- turning: a soft spring toward the wanted tilt, mostly while squeezing (asymmetric squeeze) ----
    const squeezing = dc > 0 ? 1 : 0.3;
    j.angV += (5 * (want - j.ang) - 3.4 * j.angV) * dt * squeezing;
    j.angV *= Math.exp(-dt * 0.8);
    j.ang = clamp(j.ang + j.angV * dt, -MAX_TILT - 0.15, MAX_TILT + 0.15);
    j.tilt = j.ang;                                          // what you see is how it swims

    // ---- forces: thrust along the bell's axis, the wave's shove, sinking, water drag ----
    const ux = Math.sin(j.ang), uy = -Math.cos(j.ang);
    const thrust = dc * THRUST * Math.sqrt(j.size) * (1 + j.startle * 1.3) * (0.1 + 0.9 * j.active);
    j.vx += ux * thrust; j.vy += uy * thrust;
    if (j.kick) {                                            // the shove ramps in (ease-out over ~0.3s)
      const k = j.kick, u0 = 1 - k.left / k.total;
      k.left = Math.max(0, k.left - dt);
      const u1 = 1 - k.left / k.total;
      const f = (1 - (1 - u1) ** 2) - (1 - (1 - u0) ** 2);
      j.vx += k.vx * f; j.vy += k.vy * f;
      if (k.left <= 0) j.kick = null;
    }
    j.vy += SINK * dt;
    const drag = Math.exp(-dt * DRAG);
    j.vx *= drag; j.vy *= drag;
    for (const o of roster) {                                // a soft cushion so they never overlap
      if (o === j) continue;
      const ox = j.x - o.x, oy = j.y - o.y, od = Math.hypot(ox, oy) || 1, min = (j.R + o.R) * 1.3;
      if (od < min) { const f = (1 - od / min) * 120 * dt; j.vx += (ox / od) * f; j.vy += (oy / od) * f; }
    }
    // stay on the page: a soft springy wall a little inside each edge
    const L = j.R * 0.6, Rt = W - j.R * 0.6, T = j.R * 0.9, B = H - j.R * 0.4;
    if (j.x < L) j.vx += (L - j.x) * 18 * dt; else if (j.x > Rt) j.vx -= (j.x - Rt) * 18 * dt;
    if (j.y < T) j.vy += (T - j.y) * 18 * dt; else if (j.y > B) j.vy -= (j.y - B) * 18 * dt;
    j.x += j.vx * dt; j.y += j.vy * dt;
    j.startle = Math.max(0, j.startle - dt * 0.45);
    j.esc = Math.max(0, j.esc - dt * 0.33);                 // ~3s of escaping, then back to roaming

    // elastic wobble of the bell: a lightly damped spring, ~1 jiggle a second for a couple of seconds
    j.wobV += (-38 * j.wob - 1.6 * j.wobV) * dt;
    j.wob = clamp(j.wob + j.wobV * dt, -1, 1);
    j.lit *= Math.exp(-dt * 1.6);                           // ripple glow fades back

    // ---- tentacles: chains from the rim that trail behind the bell and its motion through the water ----
    // trail = straight back from the bell's axis, blended with the water flowing past (opposite its velocity)
    const rx = Math.cos(j.ang), ry = Math.sin(j.ang);
    const w = (1 - 0.2 * j.c) * (1 + 0.16 * j.wob);
    const flow = 1 / 45;                                    // how much the motion bends them (per px/s)
    let dx0 = -ux - j.vx * flow, dy0 = -uy - Math.min(j.vy, 6) * flow + 0.25;   // + a little gravity; sinking barely lifts them
    let dl = Math.hypot(dx0, dy0) || 1; dx0 /= dl; dy0 /= dl;
    if (dy0 < 0.45) { dy0 = 0.45; dx0 = Math.sign(dx0) * Math.sqrt(1 - 0.45 * 0.45); }   // always trail downward
    for (const t of j.tents) {
      const n = t.nodes;
      n[0].x = j.x + rx * t.across * j.R * w;
      n[0].y = j.y + ry * t.across * j.R * w;
      for (let k = 1; k < n.length; k++) {
        const a = n[k - 1], b = n[k];
        // a slow travelling wave that grows toward the tips, livelier while swimming hard
        const wave = Math.sin(time * (1.2 + j.startle) - k * 0.5 + t.seed) * (0.15 + 0.45 * (k / n.length)) * (1 + 0.5 * j.c + 0.5 * j.startle);
        const tx = dx0 * Math.cos(wave) - dy0 * Math.sin(wave), ty = Math.max(0.1, dx0 * Math.sin(wave) + dy0 * Math.cos(wave));   // never curl above the bell
        let bx = b.x + tx * t.seg * 0.3, by = b.y + ty * t.seg * 0.3;
        if (pointer.active) {                               // hover sways the tentacles aside
          const hx = bx - pointer.x, hy = by - pointer.y, hd = Math.hypot(hx, hy);
          if (hd < HOVER_R * 0.7 && hd > 1) { const f = (1 - hd / (HOVER_R * 0.7)) * 2.2; bx += (hx / hd) * f; by += (hy / hd) * f; }
        }
        const ex0 = bx - a.x, ey0 = by - a.y, d0 = Math.hypot(ex0, ey0) || 1;
        const nx = a.x + (ex0 / d0) * t.seg, ny = a.y + (ey0 / d0) * t.seg;
        const e = Math.min(1, dt * 7);                       // ease: the chain lags and curves softly
        b.x += (nx - b.x) * e; b.y += (ny - b.y) * e;
        const ex = b.x - a.x, ey = b.y - a.y, el = Math.hypot(ex, ey) || 1;   // never stretch past 1.2×
        if (el > t.seg * 1.2) { b.x = a.x + (ex / el) * t.seg * 1.2; b.y = a.y + (ey / el) * t.seg * 1.2; }
        if (b.y < a.y) b.y = a.y;                            // never above the node it hangs from (lag while sinking)
      }
    }
  }

  // ---------- ripples ----------
  function addRipple(x, y) {
    if (ripples.length >= MAX_RIPPLES) ripples.shift();
    ripples.push({ x, y, t: 0, seed: Math.random() * TAU });
    // each jellyfish reacts when the first wave actually reaches it
    for (const j of jellies) {
      const d = Math.hypot(j.x - x, j.y - y);
      const reach = Math.max(KICK_R, j.R * 1.5);
      if (d > reach) continue;
      const strength = Math.pow(1 - d / reach, 1.3);
      setTimeout(() => react(j, x, y, strength), ripArrival(Math.max(0, d - j.R * 0.6)) * 1000);
    }
  }

  // write every ring of every ripple into the per-cell field (the strongest ring wins each cell)
  function rippleField(dt) {
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.t += dt;
      if (rp.t >= RIP_LIFE) { ripples.splice(i, 1); continue; }
      for (let k = 0; k < RING_STRENGTH.length; k++) {
        const tk = rp.t - k * RING_DELAY;
        if (tk <= 0 || tk >= RING_LIFE) continue;
        const u = tk / RING_LIFE;
        const rr = RIP_REACH * ripEase(u);
        const w = 10 + rr * 0.05;                            // the ring widens and softens as it spreads
        // fades in over the first instants (a soft spark, not a filled disc) and out on a smooth curve
        const fade = RING_STRENGTH[k] * smooth(0, 0.14, u) * Math.pow(1 - smooth(0.05, 1, u), 1.7);
        const hue = rr < RIP_REACH * 0.28 ? 0 : rr < RIP_REACH * 0.6 ? 1 : 2;   // blue first, cyan as it travels
        // the ring isn't a perfect circle: its radius gently wobbles around it, and the wobble drifts as it travels
        const wobAmp = 0.07 * smooth(0, 0.35, u), sd = rp.seed + k * 1.7, tt = tk;
        const outer = rr * (1 + wobAmp * 1.4) + w * 2.2, inner = Math.max(0, rr * (1 - wobAmp * 1.4) - w * 2.2);
        const outer2 = outer * outer, inner2 = inner * inner;
        const c0 = Math.max(0, Math.floor((rp.x - outer) / RCW)), c1 = Math.min(cols - 1, Math.ceil((rp.x + outer) / RCW));
        const q0 = Math.max(0, Math.floor((rp.y - outer) / RCH)), q1 = Math.min(rows - 1, Math.ceil((rp.y + outer) / RCH));
        for (let r = q0; r <= q1; r++) {
          const dy = (r + 0.5) * RCH - rp.y;
          for (let c = c0; c <= c1; c++) {
            const dx = (c + 0.5) * RCW - rp.x, d2 = dx * dx + dy * dy;
            if (d2 > outer2 || d2 < inner2) continue;
            const ang = Math.atan2(dy, dx);
            const rw = rr * (1 + wobAmp * (0.6 * Math.sin(ang * 3 + tt * 2.2 + sd) + 0.4 * Math.sin(ang * 5 - tt * 3.1 + sd * 1.7)));
            const v = Math.exp(-(((Math.sqrt(d2) - rw) / w) ** 2)) * fade;
            if (v < 0.05) continue;
            const idx = r * cols + c;
            if (field[idx] === 0) touched.push(idx);
            if (v > field[idx]) { field[idx] = v; hueOf[idx] = hue; }
          }
        }
        // a jellyfish a ring is passing lights up a little and is carried outward by it
        for (const j of jellies) {
          const dx = j.x - rp.x, dy = j.y - rp.y, d = Math.hypot(dx, dy) || 1;
          const glow = Math.exp(-(((d - rr) / (j.R * 1.2 + w)) ** 2)) * fade;
          if (glow > j.lit) j.lit = glow;
          const push = glow * (k ? 90 : 160) * dt;                       // the second ring nudges more gently
          j.vx += (dx / d) * push; j.vy += (dy / d) * push;
          j.wobV += glow * 6 * dt * (hash(j.seed, i + k) < 0.5 ? -1 : 1); // a little elastic jiggle as it passes
        }
      }
    }
  }

  // ---------- rasterise into the tiled character grid ----------
  const LEVELS = 12, HEAD = 1.8;                                // alpha headroom: a lit jellyfish can go darker
  const tiles = Array.from({ length: LEVELS }, () => []);        // [x, y] per tile, by darkness
  const glyphs = Array.from({ length: LEVELS }, () => []);       // [char, x, y], by darkness
  const accents = ACCENTS.map(() => []);
  const ripGlyphs = RIP_HUES.map(() => Array.from({ length: LEVELS }, () => []));   // ripple grid, large font
  const tintGlyphs = Array.from({ length: LEVELS }, () => []);   // jellyfish characters tinted blue by a ring
  const FONT = `ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`;
  const level = (a) => clamp(Math.ceil((a / HEAD) * LEVELS) - 1, 0, LEVELS - 1);
  const tile = (c, r, a) => tiles[level(a)].push(c * CW, r * CH);
  const glyph = (g, c, r, a) => glyphs[level(a)].push(g, (c + 0.5) * CW, (r + 0.5) * CH);

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const l of [tiles, glyphs, accents]) l.forEach((b) => (b.length = 0));
    ripGlyphs.forEach((h) => h.forEach((b) => (b.length = 0)));
    tintGlyphs.forEach((b) => (b.length = 0));
    for (const j of jellies) shadow(j);
    for (const j of jellies) cells(j);
    // the ripple: characters that only exist while a ring passes. Each cell picks its own random character
    // (re-rolled ~7×/s, so the rings shimmer with a random texture); the ring's strength sets how bright it
    // is and leans the choice toward denser characters at the crest
    const roll = Math.floor(time * 7);
    for (const idx of touched) {
      const v = field[idx], c = idx % cols, r = (idx / cols) | 0;
      const k = clamp(v * 0.55 + hash(c, r, roll) * 0.65, 0, 1);
      const g = RIP_CHARS[Math.round(k * (RIP_CHARS.length - 1))];
      ripGlyphs[hueOf[idx]][clamp(Math.ceil(v * LEVELS) - 1, 0, LEVELS - 1)].push(g, (c + 0.5) * RCW, (r + 0.5) * RCH);
      field[idx] = 0;
    }
    touched.length = 0;

    tiles.forEach((b, i) => {
      if (!b.length) return;
      ctx.fillStyle = `rgba(0,0,0,${Math.min(0.2, (TILE_MAX * HEAD * (i + 1)) / LEVELS).toFixed(3)})`;
      for (let k = 0; k < b.length; k += 2) ctx.fillRect(b[k], b[k + 1], CW - 1, CH - 1);
    });
    glyphs.forEach((b, i) => {
      if (!b.length) return;
      ctx.fillStyle = `rgba(0,0,0,${Math.min(0.85, (GLYPH_MAX * HEAD * (i + 1)) / LEVELS).toFixed(3)})`;
      for (let k = 0; k < b.length; k += 3) ctx.fillText(b[k], b[k + 1], b[k + 2]);
    });
    accents.forEach((b, i) => {
      if (!b.length) return;
      ctx.fillStyle = `rgba(${ACCENTS[i]},${ACCENT_ALPHA})`;
      for (let k = 0; k < b.length; k += 3) ctx.fillText(b[k], b[k + 1], b[k + 2]);
    });
    tintGlyphs.forEach((b, i) => {
      if (!b.length) return;
      ctx.fillStyle = `rgba(${RIP_HUES[0]},${((RIP_MAX * (i + 1)) / LEVELS).toFixed(3)})`;
      for (let k = 0; k < b.length; k += 3) ctx.fillText(b[k], b[k + 1], b[k + 2]);
    });
    ctx.font = `${RFONT_PX}px ${FONT}`;                       // the ripple's larger characters
    ripGlyphs.forEach((byLevel, h) => byLevel.forEach((b, i) => {
      if (!b.length) return;
      ctx.fillStyle = `rgba(${RIP_HUES[h]},${((RIP_MAX * (i + 1)) / LEVELS).toFixed(3)})`;
      for (let k = 0; k < b.length; k += 3) ctx.fillText(b[k], b[k + 1], b[k + 2]);
    }));
    ctx.font = `${FONT_PX}px ${FONT}`;
  }

  // a soft blurred shadow under the bell, as if it floats a little above the page
  function shadow(j) {
    const sx = j.x + j.R * 0.3, sy = j.y + j.R * 0.55;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, j.R);
    g.addColorStop(0, "rgba(0,0,0,0.028)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(sx, sy, j.R, j.R * 0.55, j.tilt, 0, TAU);
    ctx.fill();
  }

  function cells(j) {
    const ux = Math.sin(j.tilt), uy = -Math.cos(j.tilt), rx = Math.cos(j.tilt), ry = Math.sin(j.tilt);   // drawn tilt
    // a round dome; squeeze: narrower and taller; wobble: an elastic squash after a touch
    const Rw = j.R * (1 - 0.2 * j.c) * (1 + 0.16 * j.wob), Rh = j.R * (1.05 + 0.2 * j.c) * (1 - 0.12 * j.wob);
    const epoch = Math.floor(time * 1.5);                                // accents shimmer ~1.5×/s
    const boost = 1 + 0.8 * j.lit;                                       // a passing ripple lifts it a little
    const tint = j.lit * 0.35;                                           // …and tints a few characters blue
    const flick = Math.floor(time * 10);
    // segments of every tentacle, for the distance test
    const segs = [];
    let x0 = j.x - j.R * 1.4, x1 = j.x + j.R * 1.4, y0 = j.y - j.R * 1.4, y1 = j.y + j.R * 1.4;
    for (const t of j.tents) {
      for (let k = 1; k < t.nodes.length; k++) {
        const a = t.nodes[k - 1], b = t.nodes[k];
        segs.push(a.x, a.y, b.x, b.y, k / t.nodes.length, t.oral ? 1 : 0);
        x0 = Math.min(x0, b.x); x1 = Math.max(x1, b.x); y0 = Math.min(y0, b.y); y1 = Math.max(y1, b.y);
      }
    }
    const put = (g, c, r, a) => {                                        // a jellyfish character, maybe ripple-tinted
      if (tint > 0.02 && hash(c, r, flick) < tint) {
        tintGlyphs[clamp(Math.ceil(a * 0.9 * LEVELS) - 1, 0, LEVELS - 1)].push(g, (c + 0.5) * CW, (r + 0.5) * CH);
      } else glyph(g, c, r, a * boost);
    };
    const c0 = Math.max(0, Math.floor(x0 / CW) - 1), c1 = Math.min(Math.ceil(W / CW), Math.ceil(x1 / CW) + 1);
    const r0 = Math.max(0, Math.floor(y0 / CH) - 1), r1 = Math.min(Math.ceil(H / CH), Math.ceil(y1 / CH) + 1);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const px = (c + 0.5) * CW, py = (r + 0.5) * CH;
        // bell: a dome above the rim line, in the jellyfish's own frame (supersampled 2×2)
        let cov = 0, rho = 0;
        for (let s = 0; s < 4; s++) {
          const sx = px + ((s & 1) - 0.5) * CW * 0.5, sy = py + ((s >> 1) - 0.5) * CH * 0.5;
          const dx = sx - j.x, dy = sy - j.y;
          const lx = dx * rx + dy * ry, ly = dx * ux + dy * uy;           // across, height above the rim
          // a scalloped rim whose frills ripple as the bell pulses
          const rim = Math.sin((lx / Rw) * Math.PI * 4 + time * 2.2 + j.seed) * (1.2 + 2.2 * j.c);
          const e = (lx / Rw) ** 2 + (ly / Rh) ** 2;
          if (e <= 1 && ly >= -2 + rim) { cov += 0.25; rho = Math.max(rho, Math.sqrt(e)); }
        }
        if (cov > 0) {
          if (cov <= 0.5) {                                                 // ragged edge: a light mark, no tile
            if (hash(c, r, j.seed) < 0.7) put(LIGHT[(hash(r, c) * LIGHT.length) | 0], c, r, 0.35);
            continue;
          }
          // body: densest in the middle of the bell, softening toward the edges (a glowing core in a
          // translucent dome); a thin crisp outline keeps the silhouette defined
          const dx = px - j.x, dy = py - j.y, lx = dx * rx + dy * ry, ly = dx * ux + dy * uy;
          const outline = smooth(0.86, 0.97, rho);                         // the dome's edge
          const rimLine = 1 - smooth(0, Rh * 0.1, ly);                     // the open rim along the bottom
          const edge = Math.max(outline, rimLine);
          const core = 1 - smooth(0.05, 1.0, Math.hypot(lx / Rw, (ly - Rh * 0.28) / Rh));   // 1 at the core → 0 at the edge
          const bands = ly > 0 ? 0.18 * Math.pow(Math.max(0, Math.cos(Math.atan2(lx, ly) * 6)), 8) : 0;   // faint radial canals
          const k = clamp(0.1 + 0.8 * core - bands * core + 0.35 * edge + (hash(c, r, j.seed) - 0.5) * 0.12, 0.06, 1);
          tile(c, r, (0.06 + 0.94 * core) * boost);                         // tiles follow the core, not the edge
          if (hash(c, r, epoch + j.seed) < 0.04 && k > 0.3) {               // a few softly coloured, shimmering
            accents[(hash(r, c, epoch) * ACCENTS.length) | 0].push(BODY[(k * (BODY.length - 1)) | 0], px, py);
          } else {
            put(BODY[Math.round(k * (BODY.length - 1))], c, r, 0.3 + 0.7 * k);
          }
          continue;
        }
        // tentacles: sparse light characters along the nearest chain
        let best = 1e9, bi = -1;
        for (let i = 0; i < segs.length; i += 6) {
          const ax = segs[i], ay = segs[i + 1], vx = segs[i + 2] - ax, vy = segs[i + 3] - ay;
          const L = vx * vx + vy * vy || 1;
          const t = clamp(((px - ax) * vx + (py - ay) * vy) / L, 0, 1);
          const qx = ax + vx * t - px, qy = ay + vy * t - py, d2 = qx * qx + qy * qy;
          if (d2 < best) { best = d2; bi = i; }
        }
        if (bi < 0) continue;
        const along = segs[bi + 4], oral = segs[bi + 5];
        // thicker near the bell, thinning to the tips
        const reach = (oral ? 0.8 : 0.55) * CW * (1.2 - along * 0.8);
        if (best > reach * reach) continue;
        const sx0 = segs[bi + 2] - segs[bi], sy0 = segs[bi + 3] - segs[bi + 1];
        if (oral) {                                                         // frilly arms: small tiles near the bell
          if (along < 0.65) tile(c, r, 0.3 * (1 - along) * boost);
          put(";:t"[(hash(c, r, j.seed + epoch) * 3) | 0], c, r, 0.62 * (1 - along * 0.6));
        } else if (along > 0.82) {                                          // the very tips fade to light dots
          put(LIGHT[(hash(c, r, j.seed) * LIGHT.length) | 0], c, r, 0.45 * (1 - along) * 4);
        } else {
          // the glyph follows the strand's direction: | for near-vertical, / \ when it slants, : ; for texture
          const slope = Math.abs(sx0) / (Math.abs(sy0) + 1e-3);
          const g = slope < 0.45 ? ("|:;"[(hash(c, r, j.seed) * 3) | 0]) : (sx0 * sy0 > 0 ? "\\" : "/");
          put(g, c, r, 0.68 * (1 - along * 0.65));
        }
      }
    }
  }

  // ---------- loop ----------
  resize();
  // a small number, scaled to the screen: ~1 per 400k px² (3 on a 1440×900 desktop, 2 on a phone), max 4;
  // sizes spread evenly from the biggest down to MIN_SIZE, slots shuffled so sizes mix across the width
  const count = clamp(Math.round((W * H) / 400000), 2, 4);
  const slots = [...Array(count).keys()].sort(() => Math.random() - 0.5);
  const jellies = slots.map((slot, i) => makeJelly(1 - ((1 - MIN_SIZE) * i) / (count - 1), slot, count));

  const showing = () => !root.classList.contains("is-work") && !document.hidden;
  let raf = 0, last = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now; time += dt;
    for (const j of jellies) step(j, dt);
    rippleField(dt);
    draw();
    raf = showing() ? requestAnimationFrame(frame) : 0;
  }
  function play() { if (!raf && showing() && !reduce) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  if (reduce) {                                             // a settled still frame, no motion, no ripples
    for (let i = 0; i < 120; i++) { time += 1 / 60; jellies.forEach((j) => step(j, 1 / 60)); }
    draw();
    return;
  }
  play();
  document.addEventListener("visibilitychange", play);
  new MutationObserver(play).observe(root, { attributes: true, attributeFilter: ["class"] });

  addEventListener("pointermove", (e) => {
    pointer.x = e.clientX; pointer.y = e.clientY;
    pointer.active = e.pointerType !== "touch";
  }, { passive: true });
  root.addEventListener("pointerleave", () => { pointer.active = false; });
  // click / tap anywhere on the intro: a ripple from that point (the jellyfish react as it reaches them)
  addEventListener("pointerdown", (e) => {
    if (!showing() || root.classList.contains("is-loading")) return;
    if (e.target.closest?.("site-navbar, a, button")) return;   // not when using the navbar or the scroll hint
    addRipple(e.clientX, e.clientY);
  }, { passive: true });
}
