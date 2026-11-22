// ByteOculto · El mapa de calor de Strava (2017-2018) — escena 3D con Three.js, renderizada fotograma a fotograma.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const W = 1080, H = 1920;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => (t = clamp(t), t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const eout = t => 1 - Math.pow(1 - clamp(t), 3);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const vl = (a, b, t) => a.clone().lerp(b, t);
let rs = 7; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#03060c');
scene.fog = new THREE.FogExp2('#03060c', 0.035);
const pm = new THREE.PMREMGenerator(renderer);
scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;
const camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 400);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.5, 0.45, 0.82);
composer.addPass(bloom); composer.addPass(new OutputPass());
scene.add(new THREE.HemisphereLight('#7fa8ff', '#0a0a12', 0.5));

// ---------- texturas por canvas ----------
const ALLTEX = [];
function ctex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const o = { c, g, t, draw: (...a) => { g.clearRect(0, 0, w, h); draw(g, w, h, ...a); t.needsUpdate = true; } };
  o.draw(); ALLTEX.push(o); return o;
}
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const at = (o, p) => (o.position.copy(p), o);
function pl(c, i, d, p) { const l = new THREE.PointLight(c, i, d, 2); l.position.copy(p); return l; }
function floor(sz = 80, mat = M.floor) { const f = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), mat); f.rotation.x = -Math.PI / 2; return f; }
function labelTex(txt, { w = 1024, h = 256, bg = null, fg = '#fff', size = 150 } = {}) {
  return ctex(w, h, g => { if (bg) { g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, w, h, 40); g.fill(); } g.fillStyle = fg; g.font = `${size}px Anton`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h / 2 + 6); });
}
function plane(w, h, tex, opts = {}) { return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex.t, transparent: true, toneMapped: false, side: THREE.DoubleSide, ...opts })); }
const SETS = {};
function set(name, x) { const g = new THREE.Group(); g.position.x = x; g.visible = false; scene.add(g); SETS[name] = g; return g; }
const bokehT = ctex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(.6, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
function bokeh(n, area, cols) { const grp = new THREE.Group(); for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bokehT.t, color: cols[i % cols.length], transparent: true, opacity: .35, depthWrite: false, toneMapped: false }));
  s.position.set((rnd() - .5) * area.x, rnd() * area.y, -area.z * (.4 + rnd() * .6)); s.scale.setScalar(.3 + rnd() * .9); grp.add(s); } return grp; }
// ===== contenido específico: el mapa de calor de Strava =====
const M = {
  floor: new THREE.MeshStandardMaterial({ color: '#0b0e15', roughness: .35, metalness: .4 }),
  bld: new THREE.MeshStandardMaterial({ color: '#1a1f2a', roughness: .6, metalness: .3 }),
  wall: new THREE.MeshStandardMaterial({ color: '#232a36', roughness: .8 }),
  body: new THREE.MeshStandardMaterial({ color: '#2b3445', roughness: .5 }),
  skin: new THREE.MeshStandardMaterial({ color: '#b98568', roughness: .6 }),
  pin: new THREE.MeshStandardMaterial({ color: '#ff6a1f', emissive: '#ff5a10', emissiveIntensity: 1.4, roughness: .3 }),
};
// helpers (box, at, pl, floor, labelTex, plane, SETS, set, bokeh) se insertan aquí

// ---------- mapa base (terreno oscuro genérico, sin lugares reales) ----------
const MW = 80, CS = 2048, K = CS / MW;
const toPx = (x, z) => [(x + MW / 2) * K, (z + MW / 2) * K];
const terrain = ctex(CS, CS, (g, w, h) => {
  g.fillStyle = '#0a0d14'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { const x = rnd() * w, y = rnd() * h, r = 40 + rnd() * 220; const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rnd() < .5 ? 'rgba(30,34,44,.35)' : 'rgba(18,22,30,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  g.strokeStyle = 'rgba(70,90,130,.10)'; g.lineWidth = 2; for (let i = 0; i <= w; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  g.strokeStyle = 'rgba(40,70,120,.35)'; g.lineWidth = 10; g.beginPath(); g.moveTo(0, h * .62); for (let x = 0; x <= w; x += 32) g.lineTo(x, h * .62 + Math.sin(x * .004) * 140 + Math.sin(x * .013) * 30); g.stroke();
  g.strokeStyle = 'rgba(120,130,150,.12)'; g.lineWidth = 4; g.beginPath(); const [cx, cy] = toPx(-22, -18), [bx, by] = toPx(12, 8);
  g.moveTo(cx, cy); g.bezierCurveTo(cx + 500, cy + 100, bx - 400, by - 300, bx, by); g.stroke();
  for (let k = 0; k < 6; k++) { g.strokeStyle = 'rgba(120,130,150,.06)'; g.beginPath(); g.moveTo(rnd() * w, rnd() * h); g.quadraticCurveTo(rnd() * w, rnd() * h, rnd() * w, rnd() * h); g.stroke(); }
});
const heat = ctex(CS, CS, () => {});
const sMap = set('map', 0);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(MW, MW), new THREE.MeshStandardMaterial({ map: terrain.t, roughness: .9, metalness: .1 })); ground.rotation.x = -Math.PI / 2; sMap.add(ground);
const heatM = new THREE.MeshBasicMaterial({ map: heat.t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
const heatP = new THREE.Mesh(new THREE.PlaneGeometry(MW, MW), heatM); heatP.rotation.x = -Math.PI / 2; heatP.position.y = .03; sMap.add(heatP);

// ---------- instalación recreada (genérica) ----------
const B = { x: 12, z: 8, w: 10, h: 7, r: .32 };
const rot = (x, z, r) => [x * Math.cos(r) - z * Math.sin(r), x * Math.sin(r) + z * Math.cos(r)];
const bp = (lx, lz) => { const [x, z] = rot(lx, lz, B.r); return [B.x + x, B.z + z]; };
const base = new THREE.Group(); base.position.set(B.x, 0, B.z); base.rotation.y = -B.r; sMap.add(base);
const blds = [];
[[0, -B.h / 2, B.w, .12], [0, B.h / 2, B.w, .12], [-B.w / 2, 0, .12, B.h], [B.w / 2, 0, .12, B.h]].forEach(([x, z, w, d]) => { const m = box(w, .35, d, M.wall); m.position.set(x, .17, z); m.userData.y = .17; base.add(m); blds.push(m); });
[[-3, -1.5, 1.6, 1, .6], [-1, -1.6, 1.2, 1.4, .5], [1.4, -1.2, 2, 1, .8], [3.2, 1.6, 1.4, 1.4, .5], [-2.8, 1.8, 2.2, 1, .45], [.4, 1.7, 1, 1, .9]].forEach(([x, z, w, d, h]) => {
  const m = box(w, h, d, M.bld); m.position.set(x, h / 2, z); base.add(m); m.userData.y = h / 2; blds.push(m);
  const win = box(w * .8, .05, d * .8, new THREE.MeshBasicMaterial({ color: '#ffb35a', toneMapped: false, transparent: true, opacity: .08 })); win.position.set(x, h + .03, z); base.add(win); blds.push(win); win.userData.y = h + .03; });
const hangar = new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, 2.4, 20, 1, false, 0, Math.PI), M.bld); hangar.rotation.set(0, 0, Math.PI / 2); hangar.rotation.order = 'ZYX'; hangar.position.set(3, 0, -1.6); hangar.rotation.x = Math.PI / 2; base.add(hangar);
const runway = new THREE.Mesh(new THREE.PlaneGeometry(16, 1.1), new THREE.MeshStandardMaterial({ color: '#151922', roughness: .7 })); runway.rotation.x = -Math.PI / 2; runway.position.set(0, .02, -5.4); base.add(runway);
for (let i = 0; i < 14; i++) { const d = box(.6, .01, .06, new THREE.MeshBasicMaterial({ color: '#9aa3b5' })); d.position.set(-7.5 + i * 1.15, .03, -5.4); base.add(d); }
const outpost = new THREE.Group(); const [ox, oz] = [25, 22]; outpost.position.set(ox, 0, oz); sMap.add(outpost);
[[0, -1, 2, .1], [0, 1, 2, .1], [-1, 0, .1, 2], [1, 0, .1, 2]].forEach(([x, z, w, d]) => { const m = box(w, .3, d, M.wall); m.position.set(x, .15, z); outpost.add(m); });
const ob = box(.7, .5, .7, M.bld); ob.position.y = .25; outpost.add(ob);
// ciudad genérica (bloques bajos)
const city = new THREE.Group(); city.position.set(-22, 0, -18); sMap.add(city);
for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) { if (rnd() < .25) continue; const h = .2 + rnd() * 1.2; const m = box(.8, h, .8, M.bld); m.position.set(i * 1.2, h / 2, j * 1.2); city.add(m); }
sMap.add(pl('#7f9cff', 30, 60, V(0, 20, 10)));
const baseLight = pl('#ff8a3d', 0, 18, V(B.x, 4, B.z)); sMap.add(baseLight);

// ---------- rutas ----------
const strokes = [];
const J = (s) => (rnd() - .5) * s;
function loop(cx, cz, w, h, r, j, n = 48) { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n * 4; let lx, lz;
  if (t < 1) { lx = -w / 2 + w * t; lz = -h / 2; } else if (t < 2) { lx = w / 2; lz = -h / 2 + h * (t - 1); } else if (t < 3) { lx = w / 2 - w * (t - 2); lz = h / 2; } else { lx = -w / 2; lz = h / 2 - h * (t - 3); }
  const [x, z] = rot(lx + J(j), lz + J(j), r); pts.push([cx + x, cz + z]); } return pts; }
const line = (a, b, n = 20, j = .05) => Array.from({ length: n + 1 }, (_, i) => [lerp(a[0], b[0], i / n) + J(j), lerp(a[1], b[1], i / n) + J(j)]);
const add = (pts, t0, t1, a = .12, tag = '') => strokes.push({ pts: pts.map(([x, z]) => toPx(x, z)), t0, t1, a, tag });
const SCH = {}; // tiempos se asignan en setup (dependen de la locución)
function buildStrokes(S) {
  strokes.length = 0; rs = 99;
  // instalación: vueltas al perímetro (gancho)
  for (let i = 0; i < 34; i++) { const t0 = .2 + (i % 17) * .14 + (i > 16 ? .9 : 0); add(loop(B.x, B.z, B.w - .5, B.h - .5, B.r, .12), t0, t0 + 1.3 + rnd() * .5, .16, 'per'); }
  // caminos internos
  [[[-4, 0], [4, 0]], [[0, -3], [0, 3]], [[-4, -2.6], [4, -2.6]], [[-4, 2.6], [4, 2.6]], [[2.2, -3], [2.2, 3]]].forEach(([a, b], k) => {
    for (let i = 0; i < 5; i++) { const t0 = 1.6 + k * .35 + i * .12; add(line(bp(...a), bp(...b), 16, .1), t0, t0 + 1.1, .14, 'int'); } });
  // rutas sueltas en zonas remotas (débiles)
  for (let i = 0; i < 10; i++) { const a = [J(70), J(70)]; if (Math.hypot(a[0] - B.x, a[1] - B.z) < 10) continue; const b = [a[0] + J(10), a[1] + J(10)]; add(line(a, b, 10, .4), .4 + rnd() * 3, 3 + rnd() * 3, .1, 'rem'); }
  // ciudad: retícula muy transitada (mapa mundial)
  for (let i = 0; i < 160; i++) { const hz = rnd() < .5; const k = Math.floor(rnd() * 13) - 6; const a0 = -7.2 + rnd() * 4, a1 = a0 + 4 + rnd() * 8;
    const [ax, az] = hz ? [a0, k * 1.2 + .6] : [k * 1.2 + .6, a0], [bx, bz] = hz ? [a1, k * 1.2 + .6] : [k * 1.2 + .6, a1];
    const t0 = S.mapa + .2 + rnd() * 3.5; add(line([-22 + ax, -18 + az], [-22 + bx, -18 + bz], 12, .08), t0, t0 + 1.2, .22, 'city'); }
  for (let i = 0; i < 25; i++) { const t0 = S.mapa + .5 + rnd() * 3; add(loop(-22 + J(6), -18 + J(6), 2 + rnd() * 3, 2 + rnd() * 3, rnd(), .1, 24), t0, t0 + 1.5, .12, 'city'); }
  // ejemplos: pista, patrulla hacia el puesto y más vueltas (rutinas)
  for (let i = 0; i < 8; i++) { const t0 = S.ejemplos + .5 + i * .25; add(line(bp(-7.5, -5.0), bp(7.5, -5.0), 20, .1), t0, t0 + 1.4, .14, 'run'); }
  for (let i = 0; i < 6; i++) { const t0 = S.ejemplos + 2 + i * .35; const a = bp(B.w / 2, 1); const pts = [a, [a[0] + 4, a[1] + 3], [a[0] + 6, a[1] + 8], [ox - 2, oz - 3], [ox, oz]];
    const full = []; for (let s = 0; s < pts.length - 1; s++) full.push(...line(pts[s], pts[s + 1], 8, .12)); add(full, t0, t0 + 2.2, .14, 'pat'); add(loop(ox, oz, 1.6, 1.6, 0, .08, 16), t0 + 2.2, t0 + 2.9, .16, 'pat'); }
  for (let i = 0; i < 12; i++) { const t0 = S.ejemplos + 1 + i * .3; add(loop(B.x, B.z, B.w - .5, B.h - .5, B.r, .12), t0, t0 + 1.5, .12, 'per'); }
}
let heatT = -1;
function drawHeat(t) {
  if (t === heatT) return; heatT = t; const g = heat.g; g.clearRect(0, 0, CS, CS); g.globalCompositeOperation = 'lighter'; g.lineCap = g.lineJoin = 'round';
  for (const s of strokes) { const p = clamp((t - s.t0) / (s.t1 - s.t0)); if (p <= 0) continue; const n = s.pts.length - 1, f = p * n, k = Math.floor(f);
    g.beginPath(); g.moveTo(...s.pts[0]); for (let i = 1; i <= k; i++) g.lineTo(...s.pts[i]);
    if (k < n) { const a = s.pts[k], b = s.pts[k + 1], r = f - k; g.lineTo(a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r); }
    g.strokeStyle = `rgba(255,80,20,${s.a * .35})`; g.lineWidth = 12; g.stroke(); g.strokeStyle = `rgba(255,140,60,${s.a})`; g.lineWidth = 3.5; g.stroke(); }
  g.globalCompositeOperation = 'source-over'; heat.t.needsUpdate = true;
}
function heads(t, tag) { return strokes.filter(s => s.tag === tag && t > s.t0 && t < s.t1).map(s => { const p = (t - s.t0) / (s.t1 - s.t0), n = s.pts.length - 1, f = p * n, k = Math.floor(f), a = s.pts[k], b = s.pts[Math.min(n, k + 1)], r = f - k;
  return [(a[0] + (b[0] - a[0]) * r) / K - MW / 2, (a[1] + (b[1] - a[1]) * r) / K - MW / 2]; }); }
// señales de ubicación (pins)
function pinMesh(s = 1) { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.ConeGeometry(.14 * s, .4 * s, 16), M.pin); c.rotation.x = Math.PI; c.position.y = .2 * s; g.add(c);
  const sp = new THREE.Mesh(new THREE.SphereGeometry(.15 * s, 16, 12), M.pin); sp.position.y = .45 * s; g.add(sp);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.15 * s, .2 * s, 32), new THREE.MeshBasicMaterial({ color: '#ff8a3d', transparent: true, toneMapped: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = .02; g.add(ring); g.userData.ring = ring; return g; }
const mapPins = Array.from({ length: 10 }, () => { const p = pinMesh(1.4); p.visible = false; sMap.add(p); return p; });
const lens = new THREE.Mesh(new THREE.TorusGeometry(1, .025, 12, 80), new THREE.MeshBasicMaterial({ color: '#9fd0ff', toneMapped: false })); lens.rotation.x = Math.PI / 2; lens.visible = false; sMap.add(lens);
const lock = new THREE.Group(); { const lm = new THREE.MeshStandardMaterial({ color: '#d9dde6', metalness: .9, roughness: .25, emissive: '#3a4a6a', emissiveIntensity: .4 });
  const bodyL = new THREE.Mesh(new RoundedBoxGeometry(2.2, 1.7, .7, 4, .15), lm); lock.add(bodyL); const sh = new THREE.Mesh(new THREE.TorusGeometry(.75, .16, 16, 40, Math.PI), lm); sh.position.y = .85; lock.add(sh);
  const kh = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .1, 16), new THREE.MeshBasicMaterial({ color: '#0b0e15' })); kh.rotation.x = Math.PI / 2; kh.position.z = .36; lock.add(kh); }
lock.position.set(B.x, 5, B.z); lock.visible = false; sMap.add(lock);

// ---------- corredores (primer plano) ----------
const sRun = set('run', 300);
const trail = ctex(256, 2048, () => {});
const road = new THREE.Mesh(new THREE.PlaneGeometry(3, 40), new THREE.MeshStandardMaterial({ color: '#141821', roughness: .8 })); road.rotation.x = -Math.PI / 2; road.position.z = -10; sRun.add(road);
const trailP = new THREE.Mesh(new THREE.PlaneGeometry(3, 40), new THREE.MeshBasicMaterial({ map: trail.t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); trailP.rotation.x = -Math.PI / 2; trailP.position.set(0, .02, -10); sRun.add(trailP);
const sand = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ map: terrain.t, roughness: .9 })); sand.rotation.x = -Math.PI / 2; sand.position.y = -.01; sRun.add(sand);
function runner() { const g = new THREE.Group(); const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.17, .45, 4, 10), M.body); torso.position.y = 1.05; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.15, 14, 10), M.skin); head.position.y = 1.55; g.add(head);
  const legs = [0, 1].map(i => { const l = new THREE.Mesh(new THREE.CapsuleGeometry(.07, .55, 4, 8), M.body); l.geometry.translate(0, -.3, 0); l.position.set(i ? .09 : -.09, .78, 0); g.add(l); return l; });
  const arms = [0, 1].map(i => { const a = new THREE.Mesh(new THREE.CapsuleGeometry(.05, .4, 4, 8), M.skin); a.geometry.translate(0, -.2, 0); a.position.set(i ? .24 : -.24, 1.25, 0); g.add(a); return a; });
  const watch = new THREE.Mesh(new THREE.BoxGeometry(.09, .05, .09), new THREE.MeshBasicMaterial({ color: '#ff8a3d', toneMapped: false })); watch.position.set(.24, .9, 0); g.add(watch);
  const pin = pinMesh(1.2); pin.position.y = 2.0; g.add(pin); g.userData = { legs, arms, pin }; return g; }
const runners = Array.from({ length: 6 }, (_, i) => { const r = runner(); r.position.x = (i % 2 ? .45 : -.45); sRun.add(r); return r; });
sRun.add(new THREE.HemisphereLight('#9fb4ff', '#1a1410', 1.2)); sRun.add(pl('#ffb36b', 20, 30, V(3, 5, -4))); sRun.add(pl('#7f9cff', 20, 40, V(-4, 8, -14)));
function runAt(r, i, t, T0) { const sp = 2.2, z = 6 - (t - T0 + 1.2 - i * .7) * sp; r.position.z = z; r.visible = t - T0 - i * .55 > -1; const ph = t * 11 + i;
  r.userData.legs[0].rotation.x = Math.sin(ph) * .7; r.userData.legs[1].rotation.x = -Math.sin(ph) * .7; r.userData.arms[0].rotation.x = -Math.sin(ph) * .6; r.userData.arms[1].rotation.x = Math.sin(ph) * .6;
  r.position.y = Math.abs(Math.sin(ph)) * .06; const rg = r.userData.pin.userData.ring; const k = (t * 1.5 + i * .3) % 1; rg.scale.setScalar(1 + k * 4); rg.material.opacity = 1 - k; return z; }
function drawTrail(zs) { const g = trail.g; g.clearRect(0, 0, 256, 2048); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  const yS = (6 + 30) / 40 * 2048;
  zs.forEach((z, i) => { if (z > 6) return; const y = (Math.max(z, -30) + 30) / 40 * 2048, x = 128 + (i % 2 ? 38 : -38);
    g.beginPath(); g.moveTo(x, yS); g.lineTo(x, y); g.strokeStyle = 'rgba(255,80,20,.28)'; g.lineWidth = 34; g.stroke(); g.strokeStyle = 'rgba(255,150,60,.6)'; g.lineWidth = 9; g.stroke(); });
  g.globalCompositeOperation = 'source-over'; trail.t.needsUpdate = true; }
// ---------- perfiles (límites del mapa) ----------
const sProf = set('prof', 600);
sProf.add(floor());
const card = ctex(720, 1000, (g, w, h, mode = 0) => {
  g.fillStyle = 'rgba(10,16,28,.92)'; g.beginPath(); g.roundRect(0, 0, w, h, 40); g.fill(); g.strokeStyle = mode ? '#ff8a3d' : '#4fa3ff'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#fff'; g.font = '64px Anton'; g.fillText(mode ? 'SEGMENTO · CLASIFICACIÓN' : 'MAPA DE CALOR', 40, 90);
  if (!mode) { g.font = '800 38px Inter'; g.fillStyle = '#cfe0ff'; ['Solo rutas agregadas', 'Sin nombres', 'Sin fechas', 'Sin horas'].forEach((s, i) => { g.fillText((i ? '✕  ' : '•  ') + s, 40, 200 + i * 90); });
    const gr = g.createLinearGradient(40, 600, w - 40, 900); gr.addColorStop(0, '#ff5a10'); gr.addColorStop(1, '#ffd36b'); g.strokeStyle = gr; g.lineWidth = 14; g.beginPath(); g.moveTo(60, 900); g.bezierCurveTo(200, 600, 400, 950, w - 60, 640); g.stroke(); }
  else { for (let i = 0; i < 6; i++) { const y = 170 + i * 120; g.fillStyle = i % 2 ? '#141c2c' : '#1a2336'; g.fillRect(30, y, w - 60, 100); g.fillStyle = '#ff8a3d'; g.font = '800 44px Inter'; g.fillText(String(i + 1), 50, y + 66);
      g.fillStyle = '#56627a'; g.beginPath(); g.arc(140, y + 50, 32, 0, 7); g.fill(); g.filter = 'blur(10px)'; g.fillStyle = '#e8eefc'; g.fillRect(200, y + 30, 260 + (i * 47) % 120, 36); g.filter = 'none';
      g.fillStyle = '#9fb3d9'; g.font = '500 34px Inter'; g.fillText(`${4 + i}:${String(10 + i * 7).padStart(2, '0')}`, w - 170, y + 64); } }
});
const cardM = plane(2.0, 2.78, card); cardM.position.set(0, 2.6, 0); sProf.add(cardM);
const pr = runner(); pr.position.set(-1.6, 0, .6); pr.rotation.y = .5; sProf.add(pr);
const holo = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.6, .08, 48), new THREE.MeshBasicMaterial({ color: '#4fa3ff', transparent: true, opacity: .5, toneMapped: false })); holo.position.y = .04; sProf.add(holo);
sProf.add(bokeh(40, V(14, 7, 8), ['#ff8a3d', '#4fa3ff'])); sProf.add(pl('#4fa3ff', 10, 10, V(0, 3, 2))); sProf.add(pl('#ff8a3d', 6, 10, V(-2, 2, 2)));
// ---------- capa 2D (subtítulos, rótulos, efectos) ----------
const out = document.createElement('canvas'); out.width = W; out.height = H; document.body.appendChild(out);
const o2 = out.getContext('2d');
const grain = document.createElement('canvas'); grain.width = 512; grain.height = 512;
{ const g = grain.getContext('2d'); const id = g.createImageData(512, 512); for (let i = 0; i < id.data.length; i += 4) { const v = rnd() * 255; id.data.set([v, v, v, 16], i); } g.putImageData(id, 0, 0); }

let TL, chunks = [];
function buildChunks() {
  const ws = TL.words; let cur = [];
  const push = () => { if (cur.length) chunks.push(cur); cur = []; };
  ws.forEach((w, i) => { cur.push(w); const len = cur.map(x => x.w).join(' ').length;
    const nxt = ws[i + 1]; if (/[.,:;]$/.test(w.w) || cur.length >= 3 || len > 15 || !nxt || nxt.seg !== w.seg) push(); });
  chunks.forEach((c, i) => { c.start = c[0].start - .05; c.end = chunks[i + 1] ? Math.min(chunks[i + 1][0].start - .05, c[c.length - 1].end + .6) : c[c.length - 1].end + .8; });
}
function subtitle(t) {
  const c = chunks.find(c => t >= c.start && t < c.end); if (!c) return;
  const k = eout((t - c.start) / .12);
  o2.save(); o2.textAlign = 'center'; o2.textBaseline = 'middle'; o2.lineJoin = 'round';
  let size = 104; const txt = c.map(w => w.w.toUpperCase()).join(' ');
  o2.font = `${size}px Anton`; while (o2.measureText(txt).width + size * .22 * (c.length - 1) > W - 120) { size -= 4; o2.font = `${size}px Anton`; }
  const y = 1400; o2.translate(W / 2, y); o2.scale(.85 + .15 * k, .85 + .15 * k); o2.globalAlpha = k;
  const widths = c.map(w => o2.measureText(w.w.toUpperCase()).width), sp = o2.measureText(' ').width + size * .22;
  let x = -(widths.reduce((a, b) => a + b, 0) + sp * (c.length - 1)) / 2;
  c.forEach((w, i) => { const on = t >= w.start - .03; const word = w.w.toUpperCase(); const cx = x + widths[i] / 2;
    o2.save(); o2.translate(cx, 0); if (on && t < w.end + .05) o2.scale(1.08, 1.08);
    o2.shadowColor = 'rgba(0,0,0,.6)'; o2.shadowBlur = 24; o2.lineWidth = 16; o2.strokeStyle = '#000'; o2.strokeText(word, 0, 0);
    o2.shadowBlur = 0; o2.fillStyle = on ? (t < w.end + .05 ? '#ffd400' : '#ffffff') : 'rgba(255,255,255,.55)'; o2.fillText(word, 0, 0); o2.restore();
    x += widths[i] + sp; });
  o2.restore();
}
function tag(text, t0, t1, t, { y = 300, size = 64, bg = 'rgba(8,14,28,.78)', fg = '#fff', accent = '#4fa3ff', sub = null } = {}) {
  if (t < t0 || t > t1) return; const a = Math.min(eout((t - t0) / .25), eout((t1 - t) / .2));
  o2.save(); o2.globalAlpha = a; o2.font = `${size}px Anton`; o2.textAlign = 'center'; o2.textBaseline = 'middle';
  const w = o2.measureText(text).width + 70, h = size * 1.35; const off = (1 - a) * 40;
  o2.translate(W / 2, y + off);
  o2.fillStyle = bg; o2.beginPath(); o2.roundRect(-w / 2, -h / 2, w, h, 18); o2.fill();
  o2.fillStyle = accent; o2.fillRect(-w / 2, -h / 2, 10, h);
  o2.fillStyle = fg; o2.fillText(text, 5, 4);
  if (sub) { o2.font = '800 34px Inter'; o2.fillStyle = 'rgba(255,255,255,.85)'; o2.fillText(sub, 0, h / 2 + 34); }
  o2.restore();
}
function glitch(amount) {
  if (amount <= 0) return; const n = 10;
  for (let i = 0; i < n; i++) { const y = Math.floor(((i * 977 + Math.floor(amount * 50) * 131) % 1000) / 1000 * H), h = 20 + (i * 53) % 90;
    const dx = ((i * 7919) % 2 ? 1 : -1) * amount * (30 + (i * 37) % 70); o2.drawImage(out, 0, y, W, h, dx, y, W, h); }
  o2.globalCompositeOperation = 'lighter'; o2.globalAlpha = amount * .35; o2.fillStyle = '#2050ff'; o2.fillRect(0, 0, W, H);
  o2.globalCompositeOperation = 'source-over'; o2.globalAlpha = 1;
}
function flash(a, col = '#fff') { if (a <= 0) return; o2.globalAlpha = clamp(a); o2.fillStyle = col; o2.fillRect(0, 0, W, H); o2.globalAlpha = 1; }
function vignette() { const r = o2.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .7); r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(0,0,0,.55)'); o2.fillStyle = r; o2.fillRect(0, 0, W, H); }
// ---------- dirección (planos) ----------
let S = {};
const useSet = n => { for (const k in SETS) SETS[k].visible = k === n; };
const look = (pos, tgt, set) => { const o = SETS[set].position; camera.position.set(pos.x + o.x, pos.y, pos.z); camera.lookAt(tgt.x + o.x, tgt.y, tgt.z); };
const segT = (t, a, b) => [t - S[a], S[b] - S[a]];
const BV = V(B.x, 0, B.z);
function mapState(t, { pins = null, heatOp = 1, bRise = 1 } = {}) {
  useSet('map'); scene.fog.density = .006; drawHeat(t); heatM.opacity = heatOp;
  blds.forEach(b => { b.visible = bRise > .04; b.scale.y = Math.max(.01, bRise); b.position.y = b.userData.y * b.scale.y; });
  hangar.scale.set(1, 1, 1); hangar.visible = bRise > .3;
  const hs = pins ? pins.flatMap(tag => heads(t, tag)) : [];
  mapPins.forEach((p, i) => { const h = hs[i]; p.visible = !!h; if (h) { p.position.set(h[0], 0, h[1]); const k = (t * 1.6 + i * .17) % 1; p.userData.ring.scale.setScalar(1 + k * 4); p.userData.ring.material.opacity = 1 - k; } });
  lens.visible = false; lock.visible = false; baseLight.intensity = 6 * heatOp;
}
function shots(t) {
  const fx = { glitch: 0, flash: 0 }; camera.fov = 42;
  if (t < S.mapa) {
    const rise = ease((t - 3.4) / 1.6);
    mapState(t, { pins: ['per', 'int', 'rem'], bRise: rise });
    if (t < 2.6) { const k = t / 2.6; look(V(B.x - 2 + k * 2, 34 - k * 6, B.z + 6 - k * 2), V(B.x, 0, B.z - 1), 'map'); camera.fov = 44; }
    else if (t < 5) { const k = ease((t - 2.6) / 2.4); look(vl(V(B.x, 28, B.z + 4), V(B.x + 3, 7, B.z + 11), k), vl(V(B.x, 0, B.z - 1), BV, k), 'map'); camera.fov = 44; }
    else { const lt = t - 5, a = .3 + lt * .12; look(V(B.x + Math.sin(a) * 11, 6.5 - lt * .2, B.z + Math.cos(a) * 11), V(B.x, .4, B.z), 'map'); camera.fov = 46; }
  } else if (t < S.calor) {
    const [lt, D] = segT(t, 'mapa', 'calor'); const k = ease(lt / D); mapState(t, { pins: ['city'] });
    look(vl(V(B.x - 4, 16, B.z + 12), V(-19, 58, -16), k), vl(BV, V(-5, 0, -5), k), 'map'); camera.fov = 46;
    fx.flash = clamp(1 - lt / .12) * .5;
  } else if (t < S.remoto) {
    useSet('run'); scene.fog.density = .03; const [lt, D] = segT(t, 'calor', 'remoto'); const zs = runners.map((r, i) => runAt(r, i, t, S.calor)); drawTrail(zs);
    const k = ease(lt / D); const zc = Math.min(...zs); look(vl(V(2.2, 1.6, zc - 3.5), V(2.6, 5.5, zc - 6), k), vl(V(0, 1.0, zc + 1.5), V(0, .2, zc + 5), k), 'run'); camera.fov = 46;
    fx.flash = clamp(1 - lt / .12) * .6;
  } else if (t < S.ruser) {
    const [lt, D] = segT(t, 'remoto', 'ruser'); mapState(t); const k = ease(lt / D);
    look(vl(V(-22, 16, -8), V(B.x - 3, 16, B.z + 12), k), vl(V(-22, 0, -18), BV, k), 'map'); camera.fov = 46;
    fx.flash = clamp(1 - lt / .12) * .6;
  } else if (t < S.ejemplos) {
    const [lt, D] = segT(t, 'ruser', 'ejemplos'); mapState(t); const k = ease(lt / D);
    lens.visible = true; lens.position.set(B.x, .3, B.z); lens.scale.setScalar(lerp(9, 6.6, eout(lt / 1.2)));
    look(vl(V(B.x - 3, 16, B.z + 12), V(B.x - 1, 12, B.z + 6), k), BV, 'map'); camera.fov = 44;
  } else if (t < S.limites) {
    const [lt, D] = segT(t, 'ejemplos', 'limites'); mapState(t, { pins: ['run', 'pat', 'per'] }); const k = ease(lt / D);
    const a = 2.2 + k * 1.3, R = lerp(10, 15, k), c = vl(BV, V((B.x + ox) / 2, 0, (B.z + oz) / 2), clamp(k * 1.4));
    look(V(c.x + Math.sin(a) * R, lerp(5.5, 11, k), c.z + Math.cos(a) * R), V(c.x, .3, c.z), 'map'); camera.fov = 46;
    fx.flash = clamp(1 - lt / .12) * .5;
  } else if (t < S.respuesta) {
    useSet('prof'); scene.fog.density = .03; const [lt, D] = segT(t, 'limites', 'respuesta'); const half = D * S.fL;
    const mode = lt < half ? 0 : 1; card.draw(mode); const fl = clamp(1 - Math.abs(lt - half) / .3); cardM.rotation.y = Math.sin(lt * .5) * .15 + (lt > half - .3 && lt < half + .3 ? (lt - half + .3) / .6 * Math.PI * 2 : 0);
    holo.material.color.set(mode ? '#ff8a3d' : '#4fa3ff');
    runAt(pr, 0, t, t - 999); pr.position.set(-1.6, 0, .6); pr.userData.pin.visible = true;
    look(V(Math.sin(lt * .2) * 1.5, 3, 7.2 - lt * .2), V(0, 3.1, 0), 'prof'); camera.fov = 44;
    fx.flash = Math.max(clamp(1 - lt / .12), fl * .3) * .6;
  } else if (t < S.cierre) {
    const [lt, D] = segT(t, 'respuesta', 'cierre'); const dim = ease(clamp(lt / 1.8)); mapState(t, { heatOp: 1 - dim * .75 });
    lock.visible = true; lock.position.set(B.x, lerp(12, 4.2, eout(lt / 1.4)), B.z); lock.rotation.y = lt * .6;
    look(V(B.x + Math.sin(lt * .15) * 3, 9 + lt * .3, B.z + 13), V(B.x, 2.2, B.z), 'map'); camera.fov = 46;
    fx.flash = clamp(1 - lt / .12) * .6;
  } else {
    const lt = t - S.cierre, D = TL.duration - S.cierre; const k = ease(lt / D); mapState(t, { heatOp: lerp(.25, 1, clamp(lt / 1)) });
    look(vl(V(B.x + 3, 10, B.z + 12), V(B.x + .5, 30, B.z + 3), k), vl(BV, V(B.x + 2, 0, B.z + 2), k), 'map'); camera.fov = 46;
    fx.flash = clamp(1 - lt / .12) * .5;
  }
  camera.updateProjectionMatrix(); return fx;
}
function overlays(t) {
  tag('LAS RUTAS REVELARON ALGO MÁS', 2.6, S.mapa - .1, t, { y: 290, accent: '#ff8a3d' });
  tag('NOV 2017 · MAPA DE CALOR', S.mapa + .1, S.calor - .1, t, { y: 290, accent: '#ff8a3d', sub: 'Más de mil millones de actividades' });
  tag('CADA RUTA SUMA LUZ', S.calor + .1, S.remoto - .1, t, { y: 290, accent: '#ffb36b', sub: 'Más gente por un camino = más brillo' });
  const Dr = S.ruser - S.remoto;
  tag('CIUDAD: TODO BRILLA', S.remoto + .1, S.remoto + Dr * S.fR, t, { y: 290, accent: '#ffd36b' });
  tag('ZONA REMOTA: POCAS RUTAS DESTACAN', S.remoto + Dr * S.fR + .1, S.ruser - .1, t, { y: 290, size: 58, accent: '#ff5a10' });
  tag('ENERO 2018', S.ruser + .1, S.ejemplos - .1, t, { y: 290, accent: '#4fa3ff', sub: 'El analista Nathan Ruser lo señala' });
  const De = S.limites - S.ejemplos;
  tag('SIRIA · AFGANISTÁN · …', S.ejemplos + .1, S.ejemplos + De * S.fE, t, { y: 290, accent: '#ff8a3d', sub: 'Instalación recreada, no una base real' });
  tag('PERÍMETROS · CAMINOS · RUTINAS', S.ejemplos + De * S.fE + .1, S.limites - .1, t, { y: 290, size: 58, accent: '#ff8a3d', sub: 'Muchas bases ya eran conocidas' });
  const Dl = S.respuesta - S.limites;
  tag('EL MAPA NO MOSTRABA NOMBRES', S.limites + .1, S.limites + Dl * S.fL, t, { y: 270, size: 58, accent: '#4fa3ff' });
  tag('OTRAS FUNCIONES: A VECES SÍ', S.limites + Dl * S.fL + .1, S.respuesta - .1, t, { y: 270, size: 58, accent: '#ff8a3d', sub: 'Según los ajustes de privacidad de cada usuario' });
  const Dp = S.cierre - S.respuesta;
  tag('STRAVA: MÁS PRIVACIDAD', S.respuesta + .1, S.respuesta + Dp * S.fP, t, { y: 290, accent: '#5ad18a', sub: 'Ajustes más simples, menos detalle en el mapa' });
  tag('PENTÁGONO · AGOSTO 2018', S.respuesta + Dp * S.fP + .1, S.cierre - .1, t, { y: 290, accent: '#5ad18a', sub: 'Sin geolocalización en zonas de operaciones' });
  if (t > S.cierre + .2) { const a = eout((t - S.cierre - .2) / .4);
    o2.save(); o2.globalAlpha = a; o2.textAlign = 'center'; o2.font = '120px Anton'; o2.fillStyle = '#fff'; o2.shadowColor = '#ff6a1f'; o2.shadowBlur = 40;
    o2.fillText('BYTEOCULTO', W / 2, 330); o2.shadowBlur = 0; o2.font = '800 40px Inter'; o2.fillStyle = '#ffd9c0'; o2.fillText('Historias ocultas de la tecnología', W / 2, 395); o2.restore(); }
  o2.save(); o2.font = '800 26px Inter'; o2.fillStyle = 'rgba(255,255,255,.55)'; o2.textAlign = 'right'; o2.fillText('RECREACIÓN 3D · MAPA GENÉRICO', W - 40, 70); o2.restore();
}
window.setup = async (tl) => {
  TL = tl; for (const sg of TL.segments) S[sg.id] = sg.start; buildChunks();
  const fr = (seg, nxt, w) => { const x = TL.words.find(q => q.seg === seg && q.w.startsWith(w)); return (x.start - .1 - S[seg]) / (S[nxt] - S[seg]); };
  S.fR = fr('remoto', 'ruser', 'Pero'); S.fE = fr('ejemplos', 'limites', 'Muchas'); S.fL = fr('limites', 'respuesta', 'Aunque'); S.fP = fr('respuesta', 'cierre', 'Y');
  await document.fonts.load('100px Anton'); await document.fonts.load('800 40px Inter'); await document.fonts.load('500 40px Inter');
  ALLTEX.forEach(o => o.draw()); buildStrokes(S); heatT = -1; return true;
};
window.renderFrame = (t, opts = {}) => {
  const fx = opts.thumb ? thumbShot() : shots(t);
  composer.render();
  o2.drawImage(renderer.domElement, 0, 0); vignette();
  o2.globalAlpha = .5; o2.drawImage(grain, -((t * 997) % 512), -((t * 613) % 512), W + 1024, H + 1024); o2.globalAlpha = 1;
  if (!opts.thumb) { glitch(fx.glitch); flash(fx.flash); overlays(t); subtitle(t); } else thumbText();
  return out.toDataURL('image/jpeg', .92);
};
function thumbShot() {
  mapState(S.limites); look(V(B.x + 4, 13, B.z + 12), V(B.x + 1.5, 0, B.z + 1), 'map'); camera.fov = 46; camera.updateProjectionMatrix(); return {};
}
function thumbText() {
  o2.save(); o2.textAlign = 'center'; o2.lineJoin = 'round'; o2.lineWidth = 22; o2.strokeStyle = '#000';
  [['EL MAPA', 1440, '#fff'], ['LO REVELÓ', 1620, '#ff8a3d']].forEach(([s, y, c]) => { let sz = 200; o2.font = `${sz}px Anton`; while (o2.measureText(s).width > W - 80) { sz -= 5; o2.font = `${sz}px Anton`; }
    o2.strokeText(s, W / 2, y); o2.fillStyle = c; o2.fillText(s, W / 2, y); });
  o2.font = '800 44px Inter'; o2.lineWidth = 10; const s2 = 'Rutas de running en un mapa público'; o2.strokeText(s2, W / 2, 1720); o2.fillStyle = '#fff'; o2.fillText(s2, W / 2, 1720);
  o2.font = '800 26px Inter'; o2.fillStyle = 'rgba(255,255,255,.6)'; o2.textAlign = 'right'; o2.fillText('RECREACIÓN 3D', W - 40, 70); o2.restore();
}
window.READY = true;
