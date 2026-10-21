// Footer photo effect (WebGL 1, runs everywhere).
// Recreates Figma's two effects on IMG_4428 (189:2780) with the same maths:
//   1. Gradient map on luminance: white (0) → transparent cyan #1abcfe (0.5) → black (1)
//   2. Lens distortion 0.01 with lateral chromatic aberration 0.16 (8 weighted taps)
// and adds the hover aura: a soft wave ripples out from the pointer, the colour fringe opens up
// and a faint cyan glow follows the cursor. At rest the photo sways very slightly.
// Figma's own runtime needs WebGPU + the experimental HTML-in-Canvas API, so it isn't used here.

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5); // top-left origin
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;      // canvas size in px
uniform float uTime;
uniform vec2 uMouse;    // 0..1, top-left origin
uniform float uHover;   // 0..1, eased
varying vec2 vUv;

const float AMOUNT = 0.01;              // Figma distortionStrength
const float CHROMA = 0.1616;            // (1 + |amount|) * aberrationStrength 0.16
const vec4 STOP0 = vec4(1.0, 1.0, 1.0, 1.0);
const vec4 STOP1 = vec4(0.10196, 0.73725, 0.99608, 0.0);
const vec4 STOP2 = vec4(0.0, 0.0, 0.0, 1.0);

// Gradient-mapped photo at a box uv (premultiplied). Figma crop: image top sits 3.43% down, 101.1% tall.
vec4 mapped(vec2 uv) {
  vec2 iuv = vec2(uv.x, (uv.y - 0.0343) / 1.011);
  if (iuv.x < 0.0 || iuv.y < 0.0 || iuv.x > 1.0 || iuv.y > 1.0) return vec4(0.0);
  vec4 c = texture2D(uTex, iuv);
  float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
  vec4 g = l < 0.5 ? mix(STOP0, STOP1, l / 0.5) : mix(STOP1, STOP2, (l - 0.5) / 0.5);
  return vec4(g.rgb * g.a * c.a, g.a * c.a);
}

vec2 lens(vec2 p, float amount) {
  vec2 c = uRes * 0.5;
  vec2 cp = p - c;
  vec2 n = cp / (length(uRes) * 0.5);
  float d2 = dot(n, n);
  return cp * (1.0 + amount * (d2 + d2 * d2)) + c;
}

void main() {
  vec2 px = vUv * uRes;
  float s = uRes.y / 427.0;             // effect sizes relative to the Figma 427px photo

  // Aura wave: rings travel out from the pointer and fade with distance
  vec2 m = uMouse * uRes;
  float d = distance(px, m) / s;
  vec2 dir = (px - m) / max(distance(px, m), 0.001);
  float ring = sin(d * 0.055 - uTime * 3.2) * exp(-d * 0.0075) * uHover;
  px += dir * ring * 7.0 * s;
  // Idle: a very slow, tiny sway so the photo feels alive
  px.x += sin(px.y / s * 0.018 + uTime * 0.7) * 0.7 * s;

  float chroma = CHROMA * (1.0 + uHover * 0.9);
  vec4 acc = vec4(0.0);
  float wsum = 0.0;
  for (int i = 0; i < 8; i++) {
    float fi = float(i) / 7.0 - 0.5;
    float w = 1.0 - abs(fi * 2.0) + 0.0001;
    vec4 r = mapped(lens(px, AMOUNT + (fi + 0.5) * chroma) / uRes);
    vec4 g = mapped(lens(px, AMOUNT + fi * chroma) / uRes);
    vec4 b = mapped(lens(px, AMOUNT + (fi - 0.5) * chroma) / uRes);
    float rs = r.a > 0.01 ? r.r / r.a : 1.0;
    float gs = g.a > 0.01 ? g.g / g.a : 1.0;
    float bs = b.a > 0.01 ? b.b / b.a : 1.0;
    float a = max(max(r.a, g.a), b.a);
    acc += vec4(rs * a, gs * a, bs * a, a) * w;
    wsum += w;
  }
  acc /= wsum;

  // Soft cyan aura that follows the pointer
  float glow = exp(-d * 0.01) * uHover * 0.28;
  acc.rgb = min(acc.rgb + vec3(0.10, 0.74, 1.0) * glow * acc.a, vec3(acc.a));
  gl_FragColor = acc;
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
  return sh;
}

export function mountAura(box) {
  if (!box) return;
  const img = box.querySelector(".ft-photo-img");
  const canvas = document.createElement("canvas");
  canvas.className = "ft-photo-fx";
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = (n) => gl.getUniformLocation(prog, n);
  const uRes = u("uRes"), uTime = u("uTime"), uMouse = u("uMouse"), uHover = u("uHover");

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.clearColor(0, 0, 0, 0);

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mouse = { x: 0.5, y: 0.45, tx: 0.5, ty: 0.45 };
  let hover = 0;
  let hoverTarget = 0;
  let raf = 0;
  let visible = false;
  let ready = false;
  const start = performance.now();

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(box.clientWidth * dpr));
    const h = Math.max(1, Math.round(box.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  function draw(t) {
    resize();
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, reduce ? 0 : t);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.uniform1f(uHover, hover);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function frame(now) {
    raf = 0;
    // Buttery follow: ease pointer and hover strength toward their targets every frame
    mouse.x += (mouse.tx - mouse.x) * 0.08;
    mouse.y += (mouse.ty - mouse.y) * 0.08;
    hover += (hoverTarget - hover) * 0.06;
    draw((now - start) / 1000);
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  const play = () => {
    if (!raf && ready && visible && !reduce) raf = requestAnimationFrame(frame);
  };

  function onImage() {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    ready = true;
    box.append(canvas);
    box.classList.add("is-fx");
    draw(0);
    play();
  }
  img.loading = "eager";
  if (img.complete && img.naturalWidth) onImage();
  else img.addEventListener("load", onImage, { once: true });

  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    play();
  });
  io.observe(box);
  const onVis = () => play();
  document.addEventListener("visibilitychange", onVis);
  const ro = new ResizeObserver(() => ready && (reduce || !raf) && draw((performance.now() - start) / 1000));
  ro.observe(box);

  if (!reduce) {
    box.addEventListener("pointerenter", () => { hoverTarget = 1; play(); });
    box.addEventListener("pointerleave", () => { hoverTarget = 0; mouse.tx = 0.5; mouse.ty = 0.45; });
    box.addEventListener("pointermove", (e) => {
      const r = box.getBoundingClientRect();
      mouse.tx = (e.clientX - r.left) / r.width;
      mouse.ty = (e.clientY - r.top) / r.height;
    });
  }

  box._aura = {
    destroy() {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
