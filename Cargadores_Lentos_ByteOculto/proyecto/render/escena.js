// ByteOculto · «¿Por qué tarda más?» — escena 3D (three.js) renderizada fotograma a fotograma.
// window.renderFrame(t) devuelve un JPEG (dataURL) del instante t; window.renderThumb() la miniatura.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

const Q = new URLSearchParams(location.search);
const SCALE = +(Q.get('scale') || 1);
const W = 1080, H = 1920, FPS = 30, END = 42.4;
const RW = Math.round(W * SCALE), RH = Math.round(H * SCALE);
const CY = '#22d3ee', VI = '#a78bfa', AM = '#fbbf24', GR = '#4ade80', RD = '#fb7185', IC = '#93c5fd';
const SUB_Y = 1475;

// ---------- utilidades ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const eout = x => 1 - Math.pow(1 - x, 3);
const back = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const prog = (t, a, b) => clamp((t - a) / (b - a));
const win = (t, a, b, f = .25) => Math.min(prog(t, a, a + f), 1 - prog(t, b - f, b));
const frac = x => x - Math.floor(x);
function trk(t, keys, e = eio) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
      const k = t1 - t0 < 1e-6 ? 1 : e((t - t0) / (t1 - t0));
      return Array.isArray(v0) ? v0.map((v, j) => lerp(v, v1[j], k)) : lerp(v0, v1, k);
    }
  }
  return keys[keys.length - 1][1];
}
const step = (t, keys) => { let v = keys[0][1]; for (const [k, x] of keys) if (t >= k) v = x; return v; };
// fase integrada de un flujo cuya velocidad cambia con el tiempo (determinista)
const integ = (t, keys) => { let s = 0; const dt = 1 / 60; for (let u = 0; u < t; u += dt) s += trk(Math.min(u, t), keys, x => x) * Math.min(dt, t - u); return s; };
let seed = 11;
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- datos ----------
await Promise.all(['600 40px Montserrat', '800 40px Montserrat', '900 40px Montserrat'].map(f => document.fonts.load(f)));
const [PAL, ENV, FJ] = await Promise.all(['../audio/palabras.json', '../audio/envolvente.json', '../assets/fonts/helvetiker_bold.typeface.json'].map(u => fetch(u).then(r => r.json())));
const font3d = new FontLoader().parse(FJ);

// ---------- motor ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(RW, RH);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.id = 'gl'; document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const FOGC = 0x0c1830;
scene.background = new THREE.Color(FOGC);
scene.fog = new THREE.Fog(FOGC, 9, 28);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;
const camera = new THREE.PerspectiveCamera(46, W / H, 0.03, 220);
camera.setViewOffset(W, H, 0, H * 0.08, W, H);
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, samples: 4 }));
composer.setPixelRatio(1); composer.setSize(RW, RH);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(RW, RH), 0.45, 0.4, 1.3);
composer.addPass(bloom); composer.addPass(new OutputPass());

// ---------- ayudas de material / lienzo ----------
function canvasTex(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { c, ctx: c.getContext('2d'), t }; }
function rr(x, a, b, w, h, r) { x.beginPath(); x.roundRect(a, b, w, h, r); }
const glowCol = (h, k) => new THREE.Color(h).multiplyScalar(k);
const glow = (h, k = 2.4, o = {}) => new THREE.MeshBasicMaterial({ color: glowCol(h, k), toneMapped: false, ...o });
const RAD = (() => { const T = canvasTex(128, 128), x = T.ctx, g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); T.t.colorSpace = THREE.NoColorSpace; return T.t; })();
const softMat = (h, k = 1.5, op = 1) => new THREE.MeshBasicMaterial({ map: RAD, color: glowCol(h, k), transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
function fitFont(x, w, size, txt, max) { let s = size; do { x.font = `${w} ${s}px Montserrat`; s -= 2; } while (x.measureText(txt).width > max && s > 10); }
const M = {
  white: new THREE.MeshPhysicalMaterial({ color: 0xdfe4ec, roughness: .4, clearcoat: .45, clearcoatRoughness: .3 }),
  graphite: new THREE.MeshPhysicalMaterial({ color: 0x252c3b, roughness: .3, metalness: .65, clearcoat: .6 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x0b0e15, roughness: .45, metalness: .3 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xc3cad6, roughness: .22, metalness: 1 }),
  copper: new THREE.MeshStandardMaterial({ color: 0xd4884a, roughness: .28, metalness: 1, emissive: 0x3a1a05, emissiveIntensity: .6 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xffc85a, roughness: .25, metalness: 1 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xdff6ff, roughness: .08, transparent: true, opacity: .22, depthWrite: false, clearcoat: 1 }),
};

// ---------- entorno ----------
const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color(0x03060d) }, mid: { value: new THREE.Color(FOGC) }, hz: { value: new THREE.Color(0x173a6b) } },
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: 'uniform vec3 top, mid, hz; varying vec3 vP; void main(){ float h = vP.y; vec3 c = mix(mid, top, smoothstep(0.02, 0.55, h)); c += hz * 0.55 * exp(-pow((h - 0.03) * 9.0, 2.0)); gl_FragColor = vec4(c, 1.); }',
}));
sky.renderOrder = -10; scene.add(sky);
const grid = canvasTex(256, 256);
{ const x = grid.ctx; x.fillStyle = '#0b1424'; x.fillRect(0, 0, 256, 256); x.strokeStyle = 'rgba(90,200,255,.20)'; x.lineWidth = 2; x.strokeRect(1, 1, 254, 254); x.strokeStyle = 'rgba(90,200,255,.07)'; x.beginPath(); x.moveTo(128, 0); x.lineTo(128, 256); x.moveTo(0, 128); x.lineTo(256, 128); x.stroke(); }
grid.t.wrapS = grid.t.wrapT = THREE.RepeatWrapping; grid.t.repeat.set(200, 30);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 60), new THREE.MeshStandardMaterial({ map: grid.t, roughness: .5, metalness: .2 }));
floor.rotation.x = -Math.PI / 2; floor.position.set(40, 0, 0); floor.receiveShadow = true; scene.add(floor);

const hemi = new THREE.HemisphereLight(0xa6c8ff, 0x0a0f1d, 0.45); scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff0de, 1.9); key.castShadow = true;
key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 5, bottom: -3, near: .5, far: 30 });
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4; scene.add(key, key.target);
const rimC = new THREE.PointLight(0x22d3ee, 16, 14, 2), rimV = new THREE.PointLight(0x8b5cf6, 14, 14, 2), fill = new THREE.PointLight(0xffffff, .35, 12, 2);
const fx = new THREE.PointLight(0xff5533, 0, 5, 2); scene.add(rimC, rimV, fill, fx);

const dust = (() => { const N = 380, p = new Float32Array(N * 3); for (let i = 0; i < N; i++) { p[i * 3] = (rnd() - .5) * 9; p[i * 3 + 1] = rnd() * 5; p[i * 3 + 2] = (rnd() - .5) * 7 - .5; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ size: .035, map: RAD, color: glowCol('#9fe8ff', 1.2), transparent: true, opacity: .6, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); })();
scene.add(dust);

function makePad(r = .45, col = CY) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, .012, 8, 64), glow(col, 1.6)); ring.rotation.x = -Math.PI / 2; ring.position.y = .012;
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(r * 2.8, r * 2.8), softMat(col, .5, .9)); disc.rotation.x = -Math.PI / 2; disc.position.y = .01;
  g.add(ring, disc); return g;
}

// ---------- cargador ----------
const LBL20 = { big: '20 W', sub: 'USB-C PD', spec: 'Salida: 9 V · 2,22 A' };
const LBL10 = { big: '10 W', sub: 'USB-C', spec: 'Salida: 5 V · 2 A' };
const LBL100 = { big: '100 W', sub: 'USB-C PD', spec: 'Salida: 20 V · 5 A' };
function makeCharger(l) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(.56, .56, .56, 5, .09), M.white); body.castShadow = body.receiveShadow = true; g.add(body);
  const L = canvasTex(512, 512), x = L.ctx; x.fillStyle = '#1c2433'; x.textAlign = 'center';
  fitFont(x, 900, 150, l.big, 430); x.fillText(l.big, 256, 238);
  x.font = '800 56px Montserrat'; x.fillText(l.sub, 256, 322);
  fitFont(x, 600, 36, l.spec, 440); x.fillText(l.spec, 256, 388);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(.46, .46), new THREE.MeshStandardMaterial({ map: L.t, transparent: true, roughness: .6, polygonOffset: true, polygonOffsetFactor: -1 }));
  label.rotation.y = Math.PI / 2; label.position.x = .2808; g.add(label);
  const hl = new THREE.Mesh(new THREE.PlaneGeometry(.36, .012), glow(CY, 3, { transparent: true }));
  hl.rotation.y = Math.PI / 2; hl.position.set(.2815, -.012, 0); hl.scale.x = .001; g.add(hl);
  const port = new THREE.Mesh(new RoundedBoxGeometry(.15, .055, .03, 2, .02), M.dark); port.position.set(0, -.06, .275); g.add(port);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.026, .026, .2, 16), M.metal); p.rotation.x = Math.PI / 2; p.position.set(s * .1, 0, -.37); g.add(p); }
  g.userData = { hl, port: V(0, -.06, .28) };
  return g;
}

// ---------- móvil ----------
function makePhone() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(.8, 1.62, .1, 4, .045), M.graphite); body.castShadow = true; g.add(body);
  const S = canvasTex(288, 608);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(.74, 1.56), new THREE.MeshBasicMaterial({ map: S.t, toneMapped: false })); scr.position.z = .0506; g.add(scr);
  const cam = new THREE.Mesh(new RoundedBoxGeometry(.3, .3, .03, 2, .012), M.dark); cam.position.set(-.18, .58, -.06); g.add(cam);
  for (const [y, h] of [[.42, .16], [.18, .2]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(.012, h, .04), M.metal); b.position.set(.403, y, 0); g.add(b); }
  const port = new THREE.Mesh(new THREE.BoxGeometry(.12, .012, .035), M.dark); port.position.set(0, -.807, 0); g.add(port);
  g.userData = { S, st: { level: .3, mode: 'normal', icon: null, col: CY } };
  return g;
}
function drawBolt(x, cx, cy, s, fillC = '#ffffff') {
  const P = [[10, -62], [-30, 10], [-3, 10], [-13, 62], [31, -12], [4, -12], [15, -62]];
  x.beginPath(); P.forEach(([a, b], i) => i ? x.lineTo(cx + a * s, cy + b * s) : x.moveTo(cx + a * s, cy + b * s)); x.closePath();
  x.lineJoin = 'round'; x.lineWidth = 7 * s; x.strokeStyle = 'rgba(4,10,22,.85)'; x.stroke(); x.fillStyle = fillC; x.fill();
}
function drawThermoIcon(x, cx, cy, col) {
  x.lineWidth = 8; x.strokeStyle = '#fff'; rr(x, cx - 14, cy - 62, 28, 92, 14); x.stroke(); x.beginPath(); x.arc(cx, cy + 40, 24, 0, 7); x.fillStyle = col; x.fill(); x.stroke();
  rr(x, cx - 6, cy - 30, 12, 64, 6); x.fill();
}
function drawSnowIcon(x, cx, cy, col) {
  x.strokeStyle = col; x.lineWidth = 9; x.lineCap = 'round';
  for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3, c = Math.cos(a), s = Math.sin(a); x.beginPath(); x.moveTo(cx - c * 58, cy - s * 58); x.lineTo(cx + c * 58, cy + s * 58); x.stroke();
    for (const e of [-1, 1]) { const ex = cx + c * 36 * e, ey = cy + s * 36 * e; for (const d of [-1, 1]) { const b = a + d * .7 + (e < 0 ? Math.PI : 0); x.beginPath(); x.moveTo(ex, ey); x.lineTo(ex + Math.cos(b) * 18, ey + Math.sin(b) * 18); x.stroke(); } } }
}
function drawChev(x, cx, y, c) { x.strokeStyle = c; x.lineWidth = 11; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); x.moveTo(cx - 32, y + 15); x.lineTo(cx, y - 12); x.lineTo(cx + 32, y + 15); x.stroke(); }
function drawPhone(ph, t) {
  const { S, st } = ph.userData, x = S.ctx, w = 288, h = 608, cx = w / 2, cy = 262, col = st.col;
  x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
  const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#10224a'); g.addColorStop(1, '#03060d');
  rr(x, 6, 6, w - 12, h - 12, 36); x.fillStyle = g; x.fill();
  rr(x, cx - 42, 22, 84, 24, 12); x.fillStyle = '#000'; x.fill();
  const sp = st.mode === 'fast' ? 7.5 : st.mode === 'slow' ? 2.2 : 4.2, pulse = .5 + .5 * Math.sin(t * sp);
  const rg = x.createRadialGradient(cx, cy, 10, cx, cy, 165); rg.addColorStop(0, hexA(col, .28 + .22 * pulse)); rg.addColorStop(1, hexA(col, 0));
  x.fillStyle = rg; x.fillRect(0, 70, w, 400);
  x.lineWidth = 10; x.strokeStyle = '#e9eef7'; rr(x, cx - 58, cy - 104, 116, 208, 24); x.stroke();
  rr(x, cx - 22, cy - 120, 44, 13, 5); x.fillStyle = '#e9eef7'; x.fill();
  const fh = 188 * clamp(st.level); if (fh > 2) { rr(x, cx - 48, cy + 94 - fh, 96, fh, 13); x.fillStyle = col; x.fill(); }
  if (st.icon === 'hot') drawThermoIcon(x, cx, cy, RD); else if (st.icon === 'cold') drawSnowIcon(x, cx, cy, '#e0f2ff'); else drawBolt(x, cx, cy, st.mode === 'fast' ? 1.05 : .8);
  const n = st.mode === 'fast' ? 3 : st.mode === 'slow' ? 1 : 2;
  for (let i = 0; i < n; i++) drawChev(x, cx, 492 - i * 36, hexA(col, .25 + .75 * Math.max(0, Math.sin(t * sp - i * 1.1))));
  S.t.needsUpdate = true;
}

// ---------- cable ----------
function makePlug() {
  const g = new THREE.Group();
  const a = new THREE.Mesh(new RoundedBoxGeometry(.11, .075, .17, 3, .03), M.white); a.castShadow = true;
  const b = new THREE.Mesh(new RoundedBoxGeometry(.075, .032, .07, 2, .012), M.metal); b.position.z = .11; g.add(a, b); return g;
}
function makeCable(pts, o = {}) {
  const { r = .032, col = CY, n = 18, mat = M.white, plugs = [true, true], seg = 100, rad = 10 } = o;
  const curve = new THREE.CatmullRomCurve3(pts.map(p => V(...p)), false, 'catmullrom', .5);
  const geo = new THREE.TubeGeometry(curve, seg, r, rad, false);
  const tube = new THREE.Mesh(geo, mat); tube.castShadow = !mat.transparent;
  const g = new THREE.Group(); g.add(tube);
  const pm = new THREE.MeshBasicMaterial({ color: glowCol(col, 2.8), toneMapped: false });
  const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), pm, n); inst.frustumCulled = false; g.add(inst);
  const pl = [];
  [0, 1].forEach(e => { if (!plugs[e]) return; const p = makePlug(); g.add(p); pl[e] = p; });
  g.userData = { curve, geo, inst, pm, n, seg, rad, pl, r };
  setCable(g, 0, { count: 0 });
  return g;
}
const _m = new THREE.Matrix4(), _v = new THREE.Vector3();
function placePlug(c, e, u) {
  const { curve, pl } = c.userData; const p = pl[e]; if (!p) return;
  const pos = curve.getPointAt(u), tan = curve.getTangentAt(u).multiplyScalar(e ? 1 : -1);
  p.position.copy(pos).addScaledVector(tan, -.075); p.lookAt(_v.copy(p.position).add(tan));
}
function setCable(c, phase, { count = 8, size, on = 1, u0 = 0, u1 = 1, col } = {}) {
  const d = c.userData; size = size ?? d.r * 1.3;
  const s0 = Math.floor(u0 * d.seg), s1 = Math.ceil(u1 * d.seg);
  d.geo.setDrawRange(s0 * d.rad * 6, Math.max(0, s1 - s0) * d.rad * 6);
  if (d.pl[0]) { d.pl[0].visible = u0 < .97; placePlug(c, 0, u0); }
  if (d.pl[1]) { d.pl[1].visible = u1 > .03; placePlug(c, 1, u1); }
  if (col) d.pm.color.copy(glowCol(col, 2.8));
  for (let i = 0; i < d.n; i++) {
    if (i >= count || on <= 0 || u1 - u0 < .02) _m.makeScale(0, 0, 0);
    else { const u = frac(phase + i / count), uu = lerp(u0, u1, u), s = size * on * Math.min(1, u * 10, (1 - u) * 10); _m.makeScale(s, s, s).setPosition(d.curve.getPointAt(uu)); }
    d.inst.setMatrixAt(i, _m);
  }
  d.inst.instanceMatrix.needsUpdate = true;
}

// ---------- tarjetas holográficas ----------
function makeCard(lines, o = {}) {
  const { w = 1.3, accent = CY, fs = 84, pad = 46, icon = null } = o;
  const c = document.createElement('canvas'), x = c.getContext('2d');
  const L = lines.map(l => typeof l === 'string' ? { t: l } : l);
  x.font = `900 ${fs}px Montserrat`;
  let mw = 0; for (const l of L) { x.font = `${l.w || 900} ${Math.round(fs * (l.s || 1))}px Montserrat`; mw = Math.max(mw, x.measureText(l.t).width); }
  const iconW = icon ? fs * 1.25 : 0;
  const cw = Math.ceil(mw + pad * 2 + iconW), lh = L.map(l => fs * (l.s || 1) * 1.22), ch = Math.ceil(lh.reduce((a, b) => a + b, 0) + pad * 1.6);
  c.width = cw + 40; c.height = ch + 40;
  x.translate(20, 20);
  rr(x, 0, 0, cw, ch, 34); x.fillStyle = 'rgba(6,12,26,.86)'; x.fill();
  x.shadowColor = accent; x.shadowBlur = 18; x.lineWidth = 6; x.strokeStyle = accent; rr(x, 3, 3, cw - 6, ch - 6, 32); x.stroke(); x.shadowBlur = 0;
  if (icon) icon(x, pad + iconW * .42, ch / 2, fs);
  let y = pad * .8; x.textAlign = 'center'; x.textBaseline = 'top';
  L.forEach((l, i) => { x.font = `${l.w || 900} ${Math.round(fs * (l.s || 1))}px Montserrat`; x.fillStyle = l.c || '#ffffff'; x.fillText(l.t, iconW + (cw - iconW) / 2, y + fs * (l.s || 1) * .08); y += lh[i]; });
  const T = new THREE.CanvasTexture(c); T.colorSpace = THREE.SRGBColorSpace; T.anisotropy = 8;
  const mat = new THREE.MeshBasicMaterial({ map: T, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * c.height / c.width), mat); m.renderOrder = 20; m.visible = false;
  scene.add(m); return m;
}
const iconCheck = col => (x, cx, cy, fs) => { x.strokeStyle = col; x.lineWidth = fs * .17; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); x.moveTo(cx - fs * .36, cy); x.lineTo(cx - fs * .1, cy + fs * .27); x.lineTo(cx + fs * .4, cy - fs * .3); x.stroke(); };
const iconCross = col => (x, cx, cy, fs) => { x.strokeStyle = col; x.lineWidth = fs * .16; x.lineCap = 'round'; const s = fs * .28; x.beginPath(); x.moveTo(cx - s, cy - s); x.lineTo(cx + s, cy + s); x.moveTo(cx + s, cy - s); x.lineTo(cx - s, cy + s); x.stroke(); };
const iconShield = col => (x, cx, cy, fs) => { const s = fs * .5; x.beginPath(); x.moveTo(cx, cy - s * 1.1); x.lineTo(cx + s, cy - s * .7); x.quadraticCurveTo(cx + s, cy + s * .6, cx, cy + s * 1.15); x.quadraticCurveTo(cx - s, cy + s * .6, cx - s, cy - s * .7); x.closePath(); x.fillStyle = col; x.fill(); iconCheck('#06101f')(x, cx, cy + s * .05, fs * .8); };
function showCard(m, t, a, b, pos, k = 1) {
  const on = t > a && t < b; m.visible = on; if (!on) return;
  const s = back(prog(t, a, a + .35)) * (1 - eio(prog(t, b - .22, b)));
  m.scale.setScalar(Math.max(.001, s * k)); m.material.opacity = clamp(prog(t, a, a + .15) * (1 - prog(t, b - .18, b)));
  if (pos) m.position.set(...pos);
  m.quaternion.copy(camera.quaternion);
}

// ---------- Byte (personaje) ----------
function makeByte() {
  const root = new THREE.Group(), bob = new THREE.Group(); root.add(bob);
  const body = new THREE.Mesh(new THREE.SphereGeometry(.42, 48, 32), M.white); body.scale.set(1, 1.06, .92); body.castShadow = true; bob.add(body);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(.405, .016, 10, 80), glow(CY, 1.8)); belt.rotation.x = Math.PI / 2; belt.scale.set(1, .92, 1); belt.position.y = -.1; bob.add(belt);
  const core = new THREE.Mesh(new THREE.CircleGeometry(.085, 40), M.dark); core.position.set(0, .1, .382); core.rotation.x = -.18; bob.add(core);
  const coreR = new THREE.Mesh(new THREE.TorusGeometry(.085, .016, 10, 48), glow(CY, 2.2)); coreR.position.copy(core.position); coreR.rotation.x = -.18; bob.add(coreR);
  const coreB = new THREE.Mesh(new THREE.CircleGeometry(.036, 24), glow(CY, 2.6)); coreB.position.set(0, .1, .385); coreB.rotation.x = -.18; bob.add(coreB);
  const head = new THREE.Group(); head.position.y = .76; bob.add(head);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.11, .14, .16, 24), M.graphite); neck.position.y = .44; bob.add(neck);
  const shell = new THREE.Mesh(new RoundedBoxGeometry(1.0, .76, .7, 6, .22), M.white); shell.castShadow = true; head.add(shell);
  const visor = new THREE.Mesh(new RoundedBoxGeometry(.84, .56, .08, 4, .035), new THREE.MeshPhysicalMaterial({ color: 0x04060b, roughness: .12, metalness: .3, clearcoat: 1 })); visor.position.z = .33; head.add(visor);
  const F = canvasTex(512, 336);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(.78, .512), new THREE.MeshBasicMaterial({ map: F.t, transparent: true, toneMapped: false, depthWrite: false })); face.position.z = .3715; head.add(face);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .1, 32), M.graphite); ear.rotation.z = Math.PI / 2; ear.position.x = s * .52; head.add(ear);
    const er = new THREE.Mesh(new THREE.TorusGeometry(.075, .014, 8, 40), glow(CY, 2)); er.rotation.y = Math.PI / 2; er.position.x = s * .575; head.add(er);
  }
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(.016, .02, .24, 12), M.graphite); ant.position.y = .48; head.add(ant);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(.055, 20, 14), glow(CY, 2.6)); tip.position.y = .62; head.add(tip);
  const mkArm = sd => {
    const s = new THREE.Group(); s.position.set(.43 * sd, .08, 0); bob.add(s);
    const j = new THREE.Mesh(new THREE.SphereGeometry(.085, 20, 14), M.graphite); s.add(j);
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(.068, .24, 6, 16), M.white); up.position.y = -.2; up.castShadow = true; s.add(up);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.105, 24, 16), M.graphite); hand.position.y = -.42; hand.castShadow = true; s.add(hand);
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(.036, .09, 4, 10), M.graphite); thumb.position.set(0, -.36, .07); thumb.rotation.x = .5; thumb.visible = false; s.add(thumb);
    const anchor = new THREE.Object3D(); anchor.position.y = -.5; s.add(anchor);
    return { s, thumb, anchor };
  };
  const A = mkArm(-1), B = mkArm(1);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.26, .022, 10, 60), glow(CY, 2)); ring.rotation.x = Math.PI / 2; ring.position.y = -.56; bob.add(ring);
  const thr = new THREE.Mesh(new THREE.PlaneGeometry(.9, .9), softMat(CY, 1.1, .85)); thr.rotation.x = -Math.PI / 2; thr.position.y = -.6; bob.add(thr);
  // lupa (se usa en la escena del cable)
  const mag = new THREE.Group();
  const mr = new THREE.Mesh(new THREE.TorusGeometry(.17, .028, 12, 48), M.graphite);
  const ml = new THREE.Mesh(new THREE.CircleGeometry(.16, 40), new THREE.MeshPhysicalMaterial({ color: 0xcff6ff, roughness: .05, transparent: true, opacity: .28, depthWrite: false }));
  const mh = new THREE.Mesh(new THREE.CapsuleGeometry(.03, .2, 4, 10), M.graphite); mh.position.y = -.28;
  mag.add(mr, ml, mh); mag.visible = false; scene.add(mag);
  root.castShadow = true;
  scene.add(root);
  return { root, bob, head, F, A, B, tip, ring, mag };
}
const byte = makeByte();
function drawFace(F, s) {
  const x = F.ctx; x.clearRect(0, 0, 512, 336);
  x.save(); x.shadowColor = CY; x.shadowBlur = 26; x.fillStyle = '#8ef6ff'; x.strokeStyle = '#8ef6ff'; x.lineCap = 'round'; x.lineJoin = 'round';
  const ox = s.lx * 30, oy = s.ly * 20, e = s.expr, bl = clamp(s.blink);
  const eye = (cx, cy, w, h) => { h = Math.max(10, h * (1 - bl)); rr(x, cx - w / 2, cy - h / 2, w, h, Math.min(w, h) / 2); x.fill(); };
  for (const sd of [-1, 1]) {
    const cx = 256 + sd * 104 + ox, cy = 136 + oy;
    if (e === 'happy' || (e === 'wink' && sd > 0)) { x.lineWidth = 20; x.beginPath(); x.arc(cx, cy + 26, 38, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); }
    else if (e === 'surprised') { x.beginPath(); x.arc(cx, cy, 48 * (1 - bl * .9), 0, 7); x.fill(); }
    else if (e === 'curious') eye(cx, cy - (sd > 0 ? 10 : 0), 66, sd > 0 ? 74 : 110);
    else if (e === 'focus') eye(cx, cy + 8, 74, 54);
    else if (e === 'meh') eye(cx, cy + 16, 70, 56);
    else if (e === 'worried') eye(cx, cy + 6, 62, 92);
    else eye(cx, cy, 66, 106);
    if (e === 'worried' || e === 'curious' && sd > 0 || e === 'focus') {
      x.lineWidth = 14; x.beginPath();
      if (e === 'worried') { x.moveTo(cx - sd * 40, cy - 52); x.lineTo(cx + sd * 30, cy - 76); }
      else if (e === 'focus') { x.moveTo(cx - sd * 40, cy - 46); x.lineTo(cx + sd * 34, cy - 30); }
      else { x.moveTo(cx - 36, cy - 84); x.lineTo(cx + 36, cy - 94); }
      x.stroke();
    }
  }
  const mx = 256 + ox * .6, my = 262 + oy * .5, m = clamp(s.mouth);
  if (m > .06) { const w = 74 - 14 * m, h = 12 + 46 * m; rr(x, mx - w / 2, my - h / 2, w, h, Math.min(w, h) / 2); x.fill(); }
  else { x.lineWidth = 12; x.beginPath();
    if (e === 'surprised') { x.arc(mx, my, 14, 0, 7); x.stroke(); }
    else if (e === 'worried' || e === 'meh') { x.moveTo(mx - 30, my + 4); x.quadraticCurveTo(mx, my - 10, mx + 30, my + 4); x.stroke(); }
    else { x.arc(mx, my - 22, 34, Math.PI * .22, Math.PI * .78); x.stroke(); } }
  x.restore(); F.t.needsUpdate = true;
}

// ---------- objetos de cada escena ----------
// A · gancho, presentación y etiquetas (x = 0)
const phL = makePhone(), phR = makePhone(); phL.position.set(-.48, 1.84, 0); phR.position.set(.48, 1.84, 0); scene.add(phL, phR);
const padL = makePad(.42), padR = makePad(.42, AM); padL.position.set(-.48, 0, 0); padR.position.set(.48, 0, 0); scene.add(padL, padR);
const chA = makeCharger(LBL20), chB = makeCharger(LBL10); scene.add(chA, chB);
const DESK = [V(-.5, .28, .78), V(.5, .28, .78)];
const cabPts = sx => [[sx, .22, 1.07], [sx, .2, 1.34], [sx * 1.08, .5, 1.3], [sx * 1.05, .78, .72], [sx, .92, .2], [sx, 1.03, 0]];
const cabL = makeCable(cabPts(-.5)), cabR = makeCable(cabPts(.5), { col: AM }); scene.add(cabL, cabR);
const qMark = (() => { const g = new TextGeometry('?', { font: font3d, size: .62, depth: .16, curveSegments: 10, bevelEnabled: true, bevelThickness: .03, bevelSize: .018, bevelSegments: 4 }); g.center();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x0e7490, emissiveIntensity: 1.0, roughness: .3, metalness: .2 })); m.castShadow = true; scene.add(m); return m; })();
const qGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), softMat(CY, .5, .6)); scene.add(qGlow);
const sparks = (() => { const N = 26, g = new THREE.Group(); for (let i = 0; i < N; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(.022, 8, 6), glow(i % 2 ? CY : '#ffffff', 2.5)); m.userData = { a: rnd() * 6.28, b: rnd() * 2 - 1, v: .6 + rnd() * .9 }; g.add(m); } scene.add(g); return g; })();

// B · depende de los dos (x = 14)
const XB = 14;
const chB1 = makeCharger(LBL20); chB1.scale.setScalar(.82); chB1.position.set(XB - .88, 1.25, .25); chB1.rotation.y = -.5; scene.add(chB1);
const phB = makePhone(); phB.scale.setScalar(.8); phB.position.set(XB + .86, 1.6, .15); phB.rotation.y = -.12; scene.add(phB);
const padB1 = makePad(.35), padB2 = makePad(.35, VI); padB1.position.set(XB - .88, 0, .25); padB2.position.set(XB + .86, 0, .15); scene.add(padB1, padB2);
function makeColumn(x, col) {
  const g = new THREE.Group(); g.position.set(x, .35, -.35);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, 2.4, 40, 1, true), M.glass); tube.position.y = 1.2;
  const cap = new THREE.Mesh(new THREE.TorusGeometry(.15, .018, 8, 40), M.metal); cap.rotation.x = Math.PI / 2; cap.position.y = 2.4;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.21, .24, .12, 40), M.graphite); base.position.y = -.02; base.castShadow = true;
  const fillM = new THREE.MeshBasicMaterial({ color: glowCol(col, 1.9), toneMapped: false, transparent: true, opacity: .9 });
  const fillm = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 1, 32), fillM); fillm.position.y = .5;
  const fg = new THREE.Group(); fg.add(fillm); fg.scale.y = .001;
  g.add(fg, tube, cap, base); scene.add(g); return { g, fg, fillM };
}
const colC = makeColumn(XB - .3, CY), colP = makeColumn(XB + .3, VI);
const limit = new THREE.Mesh(new THREE.BoxGeometry(1.0, .028, .028), glow('#ffffff', 2.4)); limit.position.set(XB, .35 + 2.4 * .55, -.35); scene.add(limit);
const limitGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .5), softMat('#ffffff', .7, .7)); limitGlow.position.copy(limit.position); scene.add(limitGlow);
const cabB = makeCable([[XB - .88, 1.2, .5], [XB - .75, .7, .95], [XB - .1, .32, 1.0], [XB + .6, .45, .75], [XB + .84, .7, .35], [XB + .86, .95, .15]]); scene.add(cabB);
const cardCarg = makeCard(['Cargador'], { w: .95, fs: 76 }), cardMov = makeCard(['Móvil'], { w: .7, fs: 76, accent: VI });

// Túnel · dentro del cable (x = -200, y = 5)
const TX = -200, TY = 5;
const tun = new THREE.Group(); tun.position.set(TX, TY, 0); scene.add(tun);
{
  const T = canvasTex(512, 512), x = T.ctx; x.fillStyle = '#050b18'; x.fillRect(0, 0, 512, 512);
  x.strokeStyle = 'rgba(60,190,255,.55)'; x.lineWidth = 3; for (let i = 0; i <= 512; i += 128) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 512); x.stroke(); }
  x.strokeStyle = 'rgba(60,190,255,.25)'; x.lineWidth = 2; for (let i = 0; i <= 512; i += 64) { x.beginPath(); x.moveTo(0, i); x.lineTo(512, i); x.stroke(); }
  T.t.wrapS = T.t.wrapT = THREE.RepeatWrapping; T.t.repeat.set(6, 22);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 90, 48, 1, true), new THREE.MeshBasicMaterial({ map: T.t, side: THREE.BackSide }));
  wall.rotation.x = Math.PI / 2; tun.add(wall);
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; const w = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 90, 16), k < 2 ? M.copper : M.white); w.rotation.x = Math.PI / 2; w.position.set(Math.cos(a) * 1.34, Math.sin(a) * 1.34, 0); tun.add(w); }
  for (let z = -44; z <= 44; z += 3) { const r = new THREE.Mesh(new THREE.TorusGeometry(1.46, .02, 6, 64), glow(CY, 1.3)); r.position.z = z; tun.add(r); }
}
const tunPulses = (() => { const N = 60, m = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.05, .5, 4, 8), new THREE.MeshBasicMaterial({ color: glowCol(CY, 3), toneMapped: false }), N); m.frustumCulled = false; m.userData.seeds = Array.from({ length: N }, () => [rnd() * 6.28, rnd(), rnd() < .5 ? 1 : -1]); tun.add(m); return m; })();
const tunRing = new THREE.Mesh(new THREE.TorusGeometry(1, .04, 10, 80), glow(GR, 2.4, { transparent: true })); tun.add(tunRing);
const cOffer = makeCard([{ t: 'CARGADOR', s: .55, c: CY, w: 800 }, 'Puedo: 5 V o 9 V'], { w: .98, fs: 80 });
const cAsk = makeCard([{ t: 'MÓVIL', s: .55, c: VI, w: 800 }, 'Quiero: 9 V'], { w: .8, fs: 80, accent: VI });
const cDeal = makeCard(['¡Acuerdo!'], { w: .92, fs: 96, accent: GR, icon: iconCheck(GR) });
const cPD = makeCard([{ t: 'Modo de carga', s: .55, c: '#cfe9ff', w: 800 }, 'USB Power Delivery'], { w: 1.02, fs: 78, accent: GR });

// C · sin modo rápido común (x = 28)
const XC = 28;
const chC = makeCharger(LBL10); chC.position.set(XC - .45, .28, .7); chC.rotation.y = .25; scene.add(chC);
const phC = makePhone(); phC.position.set(XC + .5, 1.95, 0); scene.add(phC);
const padC = makePad(.42, AM); padC.position.set(XC + .5, 0, 0); scene.add(padC);
const cabC = makeCable([[XC - .45 + .07, .22, .98], [XC - .3, .25, 1.25], [XC + .3, .5, 1.0], [XC + .52, .85, .4], [XC + .5, 1.06, .02], [XC + .5, 1.14, 0]], { col: AM }); scene.add(cabC);
const cQ = makeCard(['¿Carga rápida?'], { w: 1.05, fs: 80, accent: VI });
const cNo = makeCard(['Solo la básica'], { w: 1.05, fs: 80, accent: AM, icon: iconCross(AM) });

// D · el cable también cuenta (x = 42)
const XD = 42;
const sheath = new THREE.MeshPhysicalMaterial({ color: 0xe9f3ff, roughness: .15, transparent: true, opacity: .26, depthWrite: false, clearcoat: 1 });
const dPts = x => [[x, .05, .55], [x + .05, .7, .35], [x - .04, 1.5, .1], [x, 2.35, 0], [x, 2.6, 0]];
const dSheL = makeCable(dPts(XD - .42), { r: .1, mat: sheath, n: 1, plugs: [false, true] }), dSheR = makeCable(dPts(XD + .42), { r: .1, mat: sheath, n: 1, plugs: [false, true] });
const dCorL = makeCable(dPts(XD - .42), { r: .022, mat: M.copper, col: AM, n: 10, plugs: [false, false] }), dCorR = makeCable(dPts(XD + .42), { r: .05, mat: M.copper, col: CY, n: 22, plugs: [false, false] });
scene.add(dSheL, dSheR, dCorL, dCorR);
for (const c of [dSheL, dSheR]) c.userData.pl[1].scale.setScalar(2.2);
const chip = (() => { const g = new THREE.Group(); const b = new THREE.Mesh(new RoundedBoxGeometry(.2, .13, .03, 2, .01), M.dark); g.add(b);
  for (let i = -2; i <= 2; i++) for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.018, .03, .012), M.gold); p.position.set(i * .036, s * .078, 0); g.add(p); }
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(.5, .4), softMat(CY, 1.2, .9)); gl.position.z = -.02; g.add(gl);
  g.position.set(XD + .42, 2.42, .19); scene.add(g); return g; })();
const cW60 = makeCard([{ t: 'Cable', s: .62, c: '#cfe9ff', w: 800 }, 'hasta 60 W'], { w: .78, fs: 80, accent: AM });
const cW240 = makeCard([{ t: 'Cable', s: .62, c: '#cfe9ff', w: 800 }, 'hasta 240 W'], { w: .86, fs: 80 });
const cChip = makeCard(['chip e-marker'], { w: .7, fs: 70 });

// E · más vatios no obligan (x = 56)
const XE = 56;
const chE = makeCharger(LBL100); chE.scale.setScalar(1.4); chE.position.set(XE - .55, .392, .55); chE.rotation.y = -.75; scene.add(chE);
const phE = makePhone(); phE.position.set(XE + .58, 2.0, 0); scene.add(phE);
const padE = makePad(.42); padE.position.set(XE + .58, 0, 0); scene.add(padE);
const cabE = makeCable([[XE - .55 + .26, .31, .86], [XE - .1, .25, 1.15], [XE + .45, .55, .9], [XE + .6, .95, .35], [XE + .58, 1.12, .02], [XE + .58, 1.19, 0]]); scene.add(cabE);
const aura = (() => { const N = 40, m = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: glowCol(CY, 3), toneMapped: false }), N); m.frustumCulled = false; m.userData.s = Array.from({ length: N }, () => [rnd() * 6.28, .45 + rnd() * .35, rnd() * .9, .6 + rnd()]); scene.add(m); return m; })();
const regRing = new THREE.Mesh(new THREE.TorusGeometry(.17, .022, 10, 48), glow(GR, 2.4)); regRing.rotation.x = Math.PI / 2; regRing.position.set(XE + .6, .92, .3); scene.add(regRing);
const cShield = makeCard(['Solo lo que admite'], { w: 1.2, fs: 74, accent: GR, icon: iconShield(GR) });

// F · temperatura y batería casi llena (x = 70)
const XF = 70;
const phF = makePhone(); phF.scale.setScalar(1.1); phF.position.set(XF + .3, 1.95, 0); scene.add(phF);
const padF = makePad(.45); padF.position.set(XF + .3, 0, 0); scene.add(padF);
const cabF = makeCable([[XF + .3, .02, 1.4], [XF + .32, .3, 1.0], [XF + .35, .7, .5], [XF + .3, .95, .06], [XF + .3, 1.06, 0]], { plugs: [false, true] }); scene.add(cabF);
const thermo = (() => { const g = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.CapsuleGeometry(.11, 1.15, 8, 24), M.glass); tube.position.y = .62;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.19, 28, 20), M.glass);
  const lm = new THREE.MeshBasicMaterial({ color: glowCol(RD, 2), toneMapped: false });
  const lb = new THREE.Mesh(new THREE.SphereGeometry(.14, 24, 16), lm);
  const lq = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1, 20), lm); lq.position.y = .5; const lg = new THREE.Group(); lg.add(lq); lg.position.y = .05;
  for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(.07, .012, .012), M.metal); t.position.set(.14, .3 + i * .17, 0); g.add(t); }
  g.add(lg, lb, tube, bulb); g.position.set(XF - .62, 1.05, .35); scene.add(g); g.userData = { lm, lg }; return g; })();
const snow = (() => { const g = new THREE.Group(), m = glow(IC, 2.4); for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.62, .045, .045), m); b.rotation.z = i * Math.PI / 3; g.add(b);
    for (const e of [-1, 1]) for (const d of [-1, 1]) { const s = new THREE.Mesh(new THREE.BoxGeometry(.14, .035, .035), m); const a = i * Math.PI / 3; s.position.set(Math.cos(a) * .2 * e, Math.sin(a) * .2 * e, 0); s.rotation.z = a + d * .8; g.add(s); } }
  g.position.set(XF - .2, 2.55, .55); scene.add(g); return g; })();
const heat = (() => { const N = 70, p = new Float32Array(N * 3), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: .09, map: RAD, color: glowCol('#ff7a45', 1.8), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); pts.frustumCulled = false;
  pts.userData.s = Array.from({ length: N }, () => [rnd(), rnd(), rnd()]); scene.add(pts); return pts; })();
const fcardFull = makeCard(['Casi llena: carga suave'], { w: 1.25, fs: 64, accent: GR });

// G · cierre (x = 84)
const XG = 84;
const chG = makeCharger(LBL20); chG.position.set(XG - .55, .28, .6); chG.rotation.y = .35; scene.add(chG);
const phG = makePhone(); phG.position.set(XG + .55, 1.95, 0); scene.add(phG);
const padG = makePad(.42); padG.position.set(XG + .55, 0, 0); scene.add(padG);
const cabG = makeCable([[XG - .55 + .1, .22, .87], [XG - .2, .22, 1.2], [XG + .35, .5, .95], [XG + .57, .9, .35], [XG + .55, 1.06, .02], [XG + .55, 1.14, 0]]); scene.add(cabG);
const halos = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(.5, .02, 8, 64), glow(CY, 2.6, { transparent: true })); scene.add(m); return m; });

// ---------- cámara ----------
const CAM = [
  [0, [0, .88, 4.4], [0, .82, .5]],
  [2.3, [.12, 1.7, 4.7], [0, 1.45, .2]],
  [4.75, [0, 1.9, 4.1], [0, 1.62, 0]],
  [5.4, [0, 1.95, 3.75], [0, 1.78, .1]],
  [6.3, [0, 1.75, 5.5], [0, 1.45, .7]],
  [7.6, [.35, 1.6, 4.8], [0, 1.35, 1.1]],
  [8.45, [.1, 1.5, 4.5], [0, 1.25, 1.5]],
  [9.25, [-.56, 1.23, 3.18], [-.56, 1.21, 2.2]],
  [9.75, [-.56, 1.23, 3.15], [-.56, 1.21, 2.2]],
  [10.3, [.56, 1.23, 3.15], [.56, 1.21, 2.2]],
  [10.8, [.56, 1.23, 3.18], [.56, 1.21, 2.2]],
  [11.45, [.25, 1.65, 4.8], [0, 1.3, 1.3]],
  [12.3, [XB + .1, 1.85, 5.9], [XB, 1.5, 0]],
  [15.2, [XB - .05, 1.7, 5.1], [XB, 1.45, 0]],
  [15.75, [XB + .7, .8, 2.0], [XB + .84, .78, .2]],
  [16.149, [XB + .86, .85, .45], [XB + .86, .9, .1]],
  [16.15, [TX + .2, TY - .1, 22], [TX, TY, 0]],
  [20.97, [TX - .15, TY + .1, 11.5], [TX, TY, -10]],
  [20.98, [XC + .6, 2.1, 6.2], [XC + .05, 1.5, .2]],
  [23.65, [XC - .1, 1.75, 4.9], [XC + .05, 1.4, .2]],
  [24.15, [XD, 3.2, 2.5], [XD, 2.55, 0]],
  [25.25, [XD + .2, 2.85, 2.9], [XD + .2, 2.45, 0]],
  [26.4, [XD + .2, 2.05, 5.1], [XD + .15, 1.65, 0]],
  [28.25, [XD + .15, 2.0, 4.7], [XD + .15, 1.65, 0]],
  [28.75, [XE - .1, 1.6, 5.7], [XE, 1.22, .2]],
  [32.35, [XE + .35, 1.65, 5.0], [XE + .1, 1.27, .2]],
  [32.85, [XF + .1, 1.95, 5.4], [XF, 1.6, 0]],
  [37.15, [XF - .05, 1.85, 4.5], [XF, 1.6, 0]],
  [37.65, [XG, 1.95, 5.8], [XG, 1.5, 0]],
  [40.2, [XG, 1.95, 5.2], [XG, 1.55, 0]],
  [END, [XG, 2.05, 5.6], [XG, 1.6, 0]],
];
const camAt = t => { const p = trk(t, CAM.map(k => [k[0], k[1]])), q = trk(t, CAM.map(k => [k[0], k[2]])); return [p, q]; };

// ---------- Byte: animación ----------
const BP = [[0, [0, -3, 1.25]], [5.55, [0, -3, 1.25]], [6.2, [0, 1.2, 1.28]], [11.45, [0, 1.2, 1.28]], [12.3, [XB, .66, 1.3]], [16.1, [XB, .66, 1.3]], [16.11, [XC - .62, 1.68, -.35]], [23.65, [XC - .62, 1.68, -.35]],
  [24.15, [XD + 1.12, 2.15, .05]], [28.25, [XD + 1.12, 2.15, .05]], [28.75, [XE - .72, 1.78, -.25]], [32.35, [XE - .72, 1.78, -.25]], [32.85, [XF + 1.0, 2.42, -.45]], [37.15, [XF + 1.0, 2.42, -.45]], [37.65, [XG - .45, 2.15, -.1]], [END, [XG - .45, 2.15, -.1]]];
const BS = [[0, 1], [11.45, 1], [12.3, .7], [16.1, .7], [16.11, .85], [23.65, .85], [24.15, .8], [28.25, .8], [28.75, .85], [32.35, .85], [32.85, .78], [37.15, .78], [37.65, .9]];
const REST_A = [0, -.22], REST_B = [0, .22];
const ARM_A = [[0, REST_A], [6.85, REST_A], [7.35, [-1.3, -.3]], [8.55, [-1.3, -.3]], [8.85, [-1.55, -.25]], [9.7, [-1.55, -.25]], [9.95, [-1.3, -.3]], [11.45, [-1.3, -.3]], [11.8, [.5, -.5]], [12.3, REST_A], [13.15, REST_A], [13.45, [-.35, -1.9]], [15.2, [-.35, -1.9]], [15.5, REST_A],
  [22.45, REST_A], [22.75, [-.3, -1.05]], [23.55, [-.3, -1.05]], [23.8, [.4, -.4]], [24.3, [-1.25, -.35]], [28.1, [-1.25, -.35]], [28.5, REST_A], [34.95, REST_A], [35.25, [-1.55, -.35]], [36.65, [-1.55, -.35]], [36.95, REST_A], [37.7, [-.4, -1.15]], [39.6, [-.4, -1.15]], [39.9, REST_A]];
const ARM_B = [[0, REST_B], [5.75, REST_B], [6.0, [-.15, 2.45]], [6.8, [-.15, 2.45]], [7.35, [-1.3, .3]], [9.7, [-1.3, .3]], [9.95, [-1.55, .25]], [10.75, [-1.55, .25]], [11.0, [-1.3, .3]], [11.45, [-1.3, .3]], [11.8, [.5, .5]], [12.3, [-.4, 1.9]], [15.2, [-.4, 1.9]], [15.5, REST_B],
  [22.45, REST_B], [22.75, [-.3, 1.05]], [23.55, [-.3, 1.05]], [23.8, [.4, .4]], [24.3, REST_B], [28.5, REST_B], [28.8, [-2.0, .35]], [30.4, [-2.0, .35]], [30.7, [-.9, 1.05]], [32.2, [-.9, 1.05]], [32.5, REST_B], [34.95, REST_B], [35.25, [-1.55, .35]], [36.65, [-1.55, .35]], [36.95, REST_B], [37.7, [-.4, 1.15]], [39.6, [-.4, 1.15]], [39.9, [-.15, 2.45]]];
const HEAD = [[0, [0, 0, 0]], [6.7, [0, 0, 0]], [7.1, [0, .28, 0]], [8.5, [0, .22, 0]], [8.8, [-.38, .3, 0]], [9.7, [-.38, .3, 0]], [9.95, [.38, .3, 0]], [10.75, [.38, .3, 0]], [11.05, [0, .05, 0]], [12.3, [0, -.28, 0]], [15.2, [0, -.2, 0]], [15.5, [.3, .2, 0]],
  [20.98, [.25, .05, 0]], [22.45, [.2, 0, 0]], [22.75, [0, .05, .2]], [23.55, [0, .05, .2]], [24.25, [-.55, .2, 0]], [26.6, [-.55, .2, 0]], [26.9, [-.2, .05, .1]], [28.6, [0, 0, 0]], [30.6, [.3, 0, 0]], [32.85, [-.55, .2, .1]], [36.7, [-.55, .2, .1]], [37.0, [-.3, 0, -.1]], [37.7, [0, 0, 0]], [40, [0, 0, .12]]];
const EXPR = [[0, 'normal'], [5.6, 'happy'], [6.8, 'curious'], [7.6, 'focus'], [11.0, 'normal'], [12.3, 'focus'], [14.8, 'normal'], [15.4, 'surprised'], [16.2, 'normal'], [20.98, 'curious'], [22.5, 'meh'], [23.8, 'normal'], [24.2, 'focus'], [26.9, 'surprised'], [27.5, 'happy'],
  [28.6, 'wink'], [29.8, 'happy'], [30.6, 'normal'], [32.85, 'worried'], [35.1, 'surprised'], [35.9, 'worried'], [36.8, 'happy'], [37.6, 'happy']];
const LOOK = [[0, [0, 0]], [6.8, [0, -.4]], [8.8, [-.6, -.5]], [9.7, [-.6, -.5]], [9.95, [.6, -.5]], [10.75, [.6, -.5]], [11.05, [0, 0]], [12.3, [0, -.6]], [15.2, [.4, .3]], [20.98, [.5, -.2]], [22.5, [0, 0]], [24.2, [-.7, .1]], [26.6, [-.7, .1]], [27, [0, 0]], [30.6, [.6, 0]], [32.4, [0, 0]], [32.85, [-.7, .2]], [36.7, [-.7, .2]], [37, [0, 0]]];
const BLINKS = []; { let b = 1.2; while (b < END) { BLINKS.push(b); b += 2.2 + rnd() * 1.6; } }
const _p = new THREE.Vector3(), _q = new THREE.Vector3();
function updateByte(t) {
  const vis = t > 5.56 && !(t > 16.12 && t < 20.98);
  byte.root.visible = vis; if (!vis) return;
  const p = trk(t, BP), pa = trk(t - .05, BP), pb = trk(t + .05, BP), vx = (pb[0] - pa[0]) / .1, vy = (pb[1] - pa[1]) / .1;
  const rise = t < 6.3 ? back(prog(t, 5.56, 6.25)) : 1;
  byte.root.position.set(p[0], lerp(-1.5, p[1], rise), p[2]);
  byte.root.scale.setScalar(trk(t, BS) * (t < 6.3 ? lerp(.3, 1, eout(prog(t, 5.56, 6.0))) : 1));
  const camx = camera.position.x - p[0], camz = camera.position.z - p[2];
  byte.root.rotation.set(clamp(vy * -.01, -.3, .3), Math.atan2(camx, camz) * .7 + clamp(vx * .012, -.6, .6), clamp(-vx * .02, -.55, .55));
  byte.bob.position.y = Math.sin(t * 2.3) * .035; byte.bob.rotation.z = Math.sin(t * 1.7) * .03;
  const h = trk(t, HEAD); byte.head.rotation.set(h[1] + Math.sin(t * 1.3) * .025, h[0] + Math.sin(t * .9) * .04, h[2]);
  const a = trk(t, ARM_A), b = trk(t, ARM_B);
  const wave = (t > 6.0 && t < 6.8 ? Math.sin((t - 6) * 13) * .32 : 0) + (t > 39.9 ? Math.sin((t - 39.9) * 12) * .32 * prog(t, 39.9, 40.2) : 0);
  byte.A.s.rotation.set(a[0] + Math.sin(t * 2.1) * .04, 0, a[1]); byte.B.s.rotation.set(b[0] + Math.sin(t * 2.1 + 1) * .04, 0, b[1] + wave);
  byte.B.thumb.visible = t > 28.75 && t < 30.5;
  const l = trk(t, LOOK), fr = Math.min(ENV.length - 1, Math.floor(t * FPS));
  let bl = 0; for (const tb of BLINKS) bl = Math.max(bl, 1 - Math.abs(t - tb) / .09);
  drawFace(byte.F, { expr: step(t, EXPR), lx: l[0], ly: l[1], blink: bl, mouth: (ENV[fr] || 0) * 1.05 });
  byte.tip.scale.setScalar(1 + .25 * Math.sin(t * 6));
  byte.root.updateMatrixWorld(true);
  // lupa en la mano A (escena del cable)
  byte.mag.visible = t > 24.05 && t < 28.35;
  if (byte.mag.visible) { byte.A.anchor.getWorldPosition(_p); byte.mag.position.copy(_p).add(V(-.12, .2, .12)); byte.mag.rotation.set(0, -.5, .35); byte.mag.scale.setScalar(eout(prog(t, 24.05, 24.4)) * (1 - prog(t, 28.15, 28.35)) + .001); }
}

// ---------- subtítulos ----------
const CHUNKS = [];
for (const f of PAL) {
  let cur = [];
  const flush = () => { if (cur.length) CHUNKS.push({ words: cur, sid: f.id }); cur = []; };
  f.palabras.forEach((w, i) => { if (/^ByteOculto/.test(w.w)) flush(); cur.push(w); const len = cur.map(x => x.w).join(' ').length; if (/[,.:?…]$/.test(w.w) || cur.length >= 3 || len >= 15) flush(); });
  flush();
  CHUNKS.filter(c => c.sid === f.id).forEach(c => c.send = f.end);
}
CHUNKS.forEach((c, i) => { c.a = c.words[0].t - .06; const n = CHUNKS[i + 1]; c.b = n && n.sid === c.sid ? n.words[0].t - .06 : Math.min(c.send + .18, n ? n.words[0].t - .1 : 99); });
const cleanW = w => w.replace(/[,.:]$/, '');
const KEY = /^(vatios|potencia|cargador|cargadores|móvil|cable|USB|Power|Delivery|USB-C|caliente|frío|lleno|rápido|despacio|ByteOculto|Byte|dos|iguales…|admite)$/i;
function drawSubs(O, t) {
  if (t > 40.33) return;
  const c = CHUNKS.find(c => t >= c.a && t < c.b); if (!c) return;
  const pop = back(prog(t, c.a, c.a + .16)), al = clamp(prog(t, c.a, c.a + .08) * (1 - prog(t, c.b - .06, c.b)));
  let fs = 92; O.font = `900 ${fs}px Montserrat`;
  const words = c.words.map(w => cleanW(w.w)), sp = fs * .32;
  let tw = words.reduce((s, w) => s + O.measureText(w).width, 0) + sp * (words.length - 1);
  if (tw > 960) { fs = Math.floor(fs * 960 / tw); O.font = `900 ${fs}px Montserrat`; tw = words.reduce((s, w) => s + O.measureText(w).width, 0) + fs * .32 * (words.length - 1); }
  O.save(); O.globalAlpha = al; O.translate(W / 2, SUB_Y); O.scale(.86 + .14 * pop, .86 + .14 * pop);
  let x = -tw / 2; O.textBaseline = 'middle'; O.lineJoin = 'round';
  let cur = 0; c.words.forEach((w, i) => { if (t >= w.t - .04) cur = i; });
  words.forEach((w, i) => {
    const ww = O.measureText(w).width, active = i === cur;
    O.save(); O.translate(x + ww / 2, 0);
    O.lineWidth = fs * .2; O.strokeStyle = 'rgba(2,6,16,.92)'; O.shadowColor = 'rgba(0,0,0,.6)'; O.shadowBlur = 18; O.shadowOffsetY = 6;
    O.textAlign = 'center'; O.strokeText(w, 0, 0); O.shadowBlur = 0; O.shadowOffsetY = 0;
    O.fillStyle = active ? '#ffd43b' : KEY.test(w) ? '#7ff0ff' : '#ffffff'; O.fillText(w, 0, 0);
    O.restore(); x += ww + fs * .32;
  });
  O.restore();
}

// ---------- capa 2D: marca, transiciones y textos ----------
const out = document.createElement('canvas'); out.width = W; out.height = H; const O = out.getContext('2d');
const vign = document.createElement('canvas'); vign.width = W; vign.height = H;
{ const x = vign.getContext('2d'), g = x.createRadialGradient(W / 2, H * .42, H * .3, W / 2, H * .5, H * .78); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
function drawEye(O, cx, cy, s) { O.save(); O.shadowColor = CY; O.shadowBlur = 12 * s; O.fillStyle = '#8ef6ff'; for (const d of [-1, 1]) { rr(O, cx + d * 9 * s - 4 * s, cy - 7 * s, 8 * s, 14 * s, 4 * s); O.fill(); } O.restore(); }
function drawMark(O, t) {
  const a = .78 * clamp(prog(t, .5, 1.0) * (1 - prog(t, 40.0, 40.3)));
  if (a <= 0) return;
  O.save(); O.globalAlpha = a; O.font = '800 34px Montserrat'; const tw = O.measureText('ByteOculto').width;
  rr(O, 44, 104, tw + 96, 60, 30); O.fillStyle = 'rgba(4,10,22,.55)'; O.fill();
  rr(O, 58, 114, 40, 40, 12); O.fillStyle = '#0b1220'; O.fill(); drawEye(O, 78, 134, 1.25);
  O.textBaseline = 'middle'; O.fillStyle = '#ffffff'; O.fillText('Byte', 112, 135); O.fillStyle = '#7ff0ff'; O.fillText('Oculto', 112 + O.measureText('Byte').width, 135);
  O.restore();
}
function drawLogo(O, t) {
  if (t < 40.33) return;
  const p = back(prog(t, 40.33, 40.75)), a = clamp(prog(t, 40.33, 40.5));
  O.save(); O.globalAlpha = a; O.translate(W / 2, SUB_Y - 20); O.scale(p, p);
  O.font = '900 132px Montserrat'; const w1 = O.measureText('Byte').width, w2 = O.measureText('Oculto').width, x0 = -(w1 + w2) / 2;
  O.textBaseline = 'middle'; O.lineJoin = 'round'; O.lineWidth = 22; O.strokeStyle = 'rgba(2,6,16,.9)';
  O.strokeText('Byte', x0, 0); O.strokeText('Oculto', x0 + w1, 0);
  O.fillStyle = '#ffffff'; O.fillText('Byte', x0, 0); O.shadowColor = CY; O.shadowBlur = 30; O.fillStyle = '#5ef2ff'; O.fillText('Oculto', x0 + w1, 0);
  O.restore();
}
function composite(t, thumb) {
  O.drawImage(renderer.domElement, 0, 0, W, H);
  O.drawImage(vign, 0, 0);
  if (thumb) return;
  drawMark(O, t); drawSubs(O, t); drawLogo(O, t);
  const blk = Math.max(1 - prog(t, 0, .18), win(t, 15.93, 16.37, .2), prog(t, END - .3, END));
  if (blk > 0) { O.fillStyle = `rgba(0,0,0,${blk})`; O.fillRect(0, 0, W, H); }
  const wh = .9 * win(t, 20.76, 21.2, .21);
  if (wh > 0) { O.fillStyle = `rgba(215,250,255,${wh})`; O.fillRect(0, 0, W, H); }
}

// ---------- actualización por fotograma ----------
const setVis = (t, a, b, ...objs) => { const v = t >= a && t <= b; objs.forEach(o => o.visible = v); return v; };
const FLOW = { hookL: [[0, 1.1], [END, 1.1]], hookR: [[0, .22], [END, .22]], slow: [[0, .25], [END, .25]], fast: [[0, .85], [END, .85]],
  F: [[0, .85], [33.4, .85], [34.4, .35], [35.1, .22], [36.7, .14], [37.0, .08], [END, .08]] };
const ph = (k, t) => integ(t, FLOW[k]);
function update(t) {
  const [cp, ct] = camAt(t);
  const dr = [Math.sin(t * .7) * .035, Math.sin(t * .9 + 1) * .025, Math.sin(t * .5 + 2) * .03];
  camera.position.set(cp[0] + dr[0], cp[1] + dr[1], cp[2] + dr[2]); camera.lookAt(ct[0], ct[1], ct[2]);
  if (t > 16.15 && t < 20.98) camera.rotateZ(Math.sin(t * .8) * .06);
  camera.updateMatrixWorld();
  const inTun = t > 16.15 && t < 20.98;
  // luces siguen al foco
  const f = V(ct[0], inTun ? TY : 0, inTun ? camera.position.z - 4 : 0);
  key.position.set(f.x + 3.5, 8, 6); key.target.position.set(f.x, 1, 0); key.intensity = inTun ? 0 : 1.9;
  rimC.position.set(f.x - 2.6, (inTun ? TY : 0) + 2.8, inTun ? camera.position.z - 3 : -2.2); rimV.position.set(f.x + 2.8, (inTun ? TY : 0) + 2.2, inTun ? camera.position.z - 5 : -2);
  fill.position.set(camera.position.x, camera.position.y + .5, camera.position.z + .5);
  sky.position.copy(camera.position);
  dust.position.set(ct[0], 0, 0); dust.rotation.y = t * .03; dust.visible = !inTun;
  scene.fog.near = inTun ? 4 : 9; scene.fog.far = inTun ? 26 : 28;
  fx.intensity = 0;
  updateByte(t);

  // A · gancho
  const vA = setVis(t, 0, 12.4, phL, phR, padL, padR, cabL, cabR);
  if (vA) {
    phL.position.y = 1.84 + Math.sin(t * 1.6) * .02; phR.position.y = 1.84 + Math.sin(t * 1.6 + 1.3) * .02;
    phL.userData.st = { level: lerp(.12, .97, eout(prog(t, .2, 11))), mode: 'fast', col: CY };
    phR.userData.st = { level: lerp(.12, .36, prog(t, .2, 11)), mode: 'slow', col: AM };
    drawPhone(phL, t); drawPhone(phR, t);
    const ret = eio(prog(t, 6.85, 7.45));
    setCable(cabL, ph('hookL', t), { count: 12, u0: ret }); setCable(cabR, ph('hookR', t), { count: 4, u0: ret, col: AM });
  }
  setVis(t, 0, 11.9, chA, chB);
  if (chA.visible) {
    byte.A.anchor.getWorldPosition(_p); byte.B.anchor.getWorldPosition(_q);
    const k = eio(prog(t, 6.9, 7.55)), gone = 1 - eio(prog(t, 11.45, 11.85));
    [[chA, DESK[0], _p, -1], [chB, DESK[1], _q, 1]].forEach(([c, d, hnd, s]) => {
      const held = byte.root.visible ? V(hnd.x, hnd.y + .05, hnd.z + .18) : d;
      const lift = Math.sin(Math.PI * k) * .35;
      c.position.set(lerp(d.x, held.x, k), lerp(d.y, held.y, k) + lift, lerp(d.z, held.z, k));
      c.rotation.set(Math.sin(t * 1.4 + s) * .04 * k, lerp(0, -Math.PI / 2 + s * .12, k), Math.sin(t * 1.1) * .03 * k);
      c.scale.setScalar(Math.max(.001, gone));
    });
    chA.userData.hl.scale.x = Math.max(.001, eout(prog(t, 8.55, 9.0)) * (1 - prog(t, 11.0, 11.3)));
    chB.userData.hl.scale.x = Math.max(.001, eout(prog(t, 9.95, 10.4)) * (1 - prog(t, 11.0, 11.3)));
  }
  const qv = setVis(t, 4.9, 6.1, qMark, qGlow);
  if (qv) { const s = back(prog(t, 4.92, 5.3)) * (1 - eio(prog(t, 5.75, 6.1))); qMark.scale.setScalar(Math.max(.001, s * .75)); qMark.position.set(0, 2.02 + Math.sin(t * 3) * .03, .5); qMark.rotation.y = (t - 4.9) * 2.2; qGlow.position.set(0, 2.02, .35); qGlow.quaternion.copy(camera.quaternion); qGlow.scale.setScalar(Math.max(.001, s)); }
  const sv = setVis(t, 5.56, 6.6, sparks);
  if (sv) sparks.children.forEach(m => { const { a, b, v } = m.userData, k = prog(t, 5.6, 6.6); const r = .2 + eout(k) * 1.1 * v; m.position.set(Math.cos(a) * r, 1.2 + b * .6 + eout(k) * .3, 1.28 + Math.sin(a) * r * .5); m.scale.setScalar(Math.max(.001, 1 - k)); });

  // B · depende de los dos
  const vB = setVis(t, 11.4, 16.2, chB1, phB, padB1, padB2, colC.g, colP.g, limit, limitGlow, cabB);
  if (vB) {
    chB1.position.y = 1.25 + Math.sin(t * 1.5) * .03; phB.position.y = 1.6 + Math.sin(t * 1.5 + 1) * .03;
    phB.userData.st = { level: .45, mode: t > 15.6 ? 'fast' : 'normal', col: VI }; drawPhone(phB, t);
    const kc = eout(prog(t, 13.2, 14.0)), kp = eout(prog(t, 13.9, 14.7));
    colC.fg.scale.y = Math.max(.001, 2.4 * .92 * kc); colP.fg.scale.y = Math.max(.001, 2.4 * .55 * kp);
    const lim = eio(prog(t, 14.75, 15.1)); limit.scale.x = Math.max(.001, lim); limitGlow.material.opacity = .7 * lim;
    colC.fillM.opacity = lerp(.9, .38, lim);
    const plug = eio(prog(t, 15.3, 15.75)); setCable(cabB, ph('fast', t), { count: plug > .99 ? 10 : 0, u1: Math.max(.001, plug) });
    showCard(cardCarg, t, 13.25, 15.4, [XB - .62, 2.78, .3]); showCard(cardMov, t, 14.0, 15.4, [XB + .72, 2.78, .3]);
  } else { cardCarg.visible = cardMov.visible = false; }

  // Túnel
  const vT = setVis(t, 16.1, 21.0, tun);
  if (vT) {
    tunPulses.userData.seeds.forEach(([a, u, d], i) => { const z = 40 - frac(u + d * (t - 16) * .35) * 80; _m.makeRotationX(Math.PI / 2).setPosition(Math.cos(a) * 1.36, Math.sin(a) * 1.36, z); tunPulses.setMatrixAt(i, _m); });
    tunPulses.instanceMatrix.needsUpdate = true;
    tunPulses.material.color.copy(glowCol(t > 19.2 ? GR : CY, 3));
    const rz = camera.position.z - 3.2, rk = eout(prog(t, 19.35, 20.2));
    tunRing.position.set(0, 0, rz); tunRing.scale.setScalar(Math.max(.001, .4 + rk * .9)); tunRing.material.opacity = clamp(prog(t, 19.3, 19.5)) * (1 - prog(t, 20.5, 20.9));
    tunRing.visible = t > 19.3;
    const cz2 = camera.position.z;
    const slide = (a, from, to) => { const k = eout(prog(t, a, a + .45)); return [lerp(from[0], to[0], k), TY + lerp(from[1], to[1], k), cz2 + lerp(from[2], to[2], k)]; };
    showCard(cOffer, t, 16.3, 17.55, slide(16.3, [0, .1, -9], [0, .32, -2.6]).map((v, i) => i === 0 ? TX + v : v));
    showCard(cAsk, t, 17.35, 18.5, slide(17.35, [-.6, -.5, -.5], [0, -.3, -2.5]).map((v, i) => i === 0 ? TX + v : v));
    showCard(cDeal, t, 18.25, 19.45, [TX, TY + .05, cz2 - 2.5]);
    showCard(cPD, t, 19.45, 20.95, [TX, TY + .05, cz2 - 2.7]);
  } else { cOffer.visible = cAsk.visible = cDeal.visible = cPD.visible = false; }

  // C · sin modo rápido común
  const vC = setVis(t, 20.9, 24.4, chC, phC, padC, cabC);
  if (vC) {
    phC.position.y = 1.95 + Math.sin(t * 1.5) * .02;
    phC.userData.st = { level: lerp(.28, .34, prog(t, 21, 24.4)), mode: t > 22.5 ? 'slow' : 'normal', col: t > 22.5 ? AM : VI }; drawPhone(phC, t);
    setCable(cabC, ph('slow', t), { count: t > 22.5 ? 4 : 0, col: AM });
    showCard(cQ, t, 21.15, 23.55, [XC + .5, 2.92, .45]); showCard(cNo, t, 21.75, 23.55, [XC - .38, 1.0, 1.05]);
  } else { cQ.visible = cNo.visible = false; }

  // D · el cable también cuenta
  const vD = setVis(t, 23.6, 29.0, dSheL, dSheR, dCorL, dCorR, chip);
  if (vD) {
    setCable(dSheL, 0, { count: 0 }); setCable(dSheR, 0, { count: 0 });
    setCable(dCorL, ph('slow', t) * .9, { count: 4, size: .045, col: AM }); setCable(dCorR, ph('fast', t) * 1.1, { count: 18, size: .075 });
    chip.scale.setScalar(Math.max(.001, back(prog(t, 25.3, 25.75)))); chip.rotation.y = Math.sin(t * 1.2) * .1;
    showCard(cW60, t, 26.1, 28.35, [XD - .42, 1.42, .45]); showCard(cW240, t, 26.55, 28.35, [XD + .42, 1.05, .45]);
    showCard(cChip, t, 25.45, 28.35, [XD + .3, 2.98, .35]);
  } else { cW60.visible = cW240.visible = cChip.visible = false; }

  // E · más vatios no obligan
  const vE = setVis(t, 28.2, 33.3, chE, phE, padE, cabE, aura, regRing);
  if (vE) {
    phE.position.y = 2.0 + Math.sin(t * 1.5) * .02;
    phE.userData.st = { level: lerp(.42, .55, prog(t, 28.5, 33)), mode: 'fast', col: CY }; drawPhone(phE, t);
    setCable(cabE, ph('fast', t), { count: 10 });
    aura.userData.s.forEach(([a, r, y, v], i) => { const an = a + t * v * 1.4; _m.makeScale(.03, .03, .03).setPosition(chE.position.x + Math.cos(an) * r * 1.3, .15 + y + Math.sin(t * 2 + a) * .05, chE.position.z + Math.sin(an) * r * 1.3); aura.setMatrixAt(i, _m); });
    aura.instanceMatrix.needsUpdate = true;
    regRing.scale.setScalar(1 + .12 * Math.sin(t * 6)); regRing.rotation.z = t;
    showCard(cShield, t, 30.7, 32.45, [XE + .5, 2.62, .45]);
  } else cShield.visible = false;

  // F · temperatura / casi llena
  const vF = setVis(t, 32.4, 37.9, phF, padF, cabF, thermo, snow, heat);
  if (vF) {
    const hot = win(t, 35.05, 35.95, .2), cold = win(t, 35.9, 36.8, .2), full = prog(t, 36.75, 37.0);
    phF.userData.st = { level: lerp(.55, .93, prog(t, 36.6, 37.0)), mode: t > 33.5 ? 'slow' : 'fast', col: t > 36.75 ? GR : t > 35.95 ? IC : t > 35.1 ? RD : t > 33.5 ? AM : CY, icon: t > 35.1 && t < 35.95 ? 'hot' : t >= 35.95 && t < 36.75 ? 'cold' : null };
    drawPhone(phF, t);
    setCable(cabF, ph('F', t), { count: t > 36.9 ? 3 : 8, col: t > 36.75 ? GR : t > 35.95 ? IC : t > 35.1 ? RD : t > 33.5 ? AM : CY });
    const lvl = .45 + .5 * hot - .32 * cold; thermo.userData.lg.scale.y = Math.max(.02, lvl * 1.15);
    thermo.userData.lm.color.copy(glowCol(cold > .5 ? IC : RD, 2)); thermo.rotation.z = Math.sin(t * 1.3) * .04;
    snow.visible = cold > 0; snow.scale.setScalar(Math.max(.001, cold * .8)); snow.rotation.z = t * .8;
    heat.visible = hot > 0 || cold > 0;
    const hp = heat.geometry.attributes.position;
    heat.userData.s.forEach(([a, b, c], i) => { const k = frac(a + (t - 35) * (hot > cold ? .6 : -.35)); hp.setXYZ(i, phF.position.x + (b - .5) * 1.1, hot > cold ? 1.0 + k * 2.1 : 3.2 - (1 - k) * 2.2, (c - .5) * .8 + .2); });
    hp.needsUpdate = true; heat.material.color.copy(glowCol(hot > cold ? '#ff7a45' : '#cfe8ff', 1.8)); heat.material.opacity = Math.max(hot, cold);
    fx.position.set(phF.position.x, 2, 1); fx.color.set(hot > cold ? 0xff4422 : 0x66aaff); fx.intensity = 14 * Math.max(hot, cold);
    showCard(fcardFull, t, 36.85, 37.4, [XF + .3, 3.25, .3]);
  } else fcardFull.visible = false;

  // G · cierre
  const vG = setVis(t, 37.2, END + 1, chG, phG, padG, cabG, ...halos);
  if (vG) {
    phG.position.y = 1.95 + Math.sin(t * 1.5) * .02;
    phG.userData.st = { level: lerp(.55, .8, prog(t, 37.6, END)), mode: 'fast', col: CY }; drawPhone(phG, t);
    setCable(cabG, ph('fast', t), { count: 12, on: t > 38.0 ? 1 : 0 });
    const hp = [[chG.position.clone(), 37.55, .55], [cabG.userData.curve.getPointAt(.45), 38.03, .32], [phG.position.clone(), 38.43, .95]];
    halos.forEach((m, i) => { const [p, a, r] = hp[i]; const k = prog(t, a, a + .55); m.visible = k > 0 && k < 1; m.position.copy(p); m.quaternion.copy(camera.quaternion); m.scale.setScalar(r * (.6 + eout(k) * 1.2)); m.material.opacity = 1 - k; });
  }

}

window.END = END; window.FPS = FPS;
window.renderFrame = t => { update(t); composer.render(); composite(t, false); return out.toDataURL('image/jpeg', .93); };
window.renderThumb = () => {
  const t = 10.95; update(t); update(t);
  camera.position.set(0, 1.95, 5.6); camera.lookAt(0, 1.72, 1.3); camera.updateMatrixWorld();
  drawFace(byte.F, { expr: 'curious', lx: 0, ly: 0, blink: 0, mouth: 0 });
  chA.userData.hl.scale.x = chB.userData.hl.scale.x = .001;
  composer.render(); composite(t, true);
  const x = O, lines = ['¿POR QUÉ', 'TARDA MÁS?'];
  x.save(); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  lines.forEach((l, i) => { let fs = 170; x.font = `900 ${fs}px Montserrat`; while (x.measureText(l).width > 980) { fs -= 4; x.font = `900 ${fs}px Montserrat`; }
    const y = 1390 + i * 185; x.lineWidth = 30; x.strokeStyle = '#03060f'; x.strokeText(l, W / 2, y); x.fillStyle = i ? '#ffd43b' : '#ffffff'; x.fillText(l, W / 2, y); });
  x.restore(); drawMark(O, 5);
  return out.toDataURL('image/png');
};
window.ready = true;
