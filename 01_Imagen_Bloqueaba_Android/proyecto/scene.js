// ByteOculto · La imagen que bloqueaba algunos Android (2020) — escena 3D con Three.js, renderizada fotograma a fotograma.
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
// ===== contenido específico: la imagen que bloqueaba Android =====
const M = {
  floor: new THREE.MeshStandardMaterial({ color: '#0d0f16', roughness: .3, metalness: .5 }),
  body: new THREE.MeshStandardMaterial({ color: '#1b1e26', roughness: .25, metalness: .8 }),
  skin: new THREE.MeshStandardMaterial({ color: '#c58c6c', roughness: .55, metalness: 0 }),
  sleeve: new THREE.MeshStandardMaterial({ color: '#23324a', roughness: .8 }),
  wood: new THREE.MeshStandardMaterial({ color: '#3a2c22', roughness: .45, metalness: .1 }),
};
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const at = (o, p) => (o.position.copy(p), o);

// --- paisaje generado (no es la foto original) ---
const LAND = document.createElement('canvas'); LAND.width = 720; LAND.height = 1280;
(function paint() {
  const g = LAND.getContext('2d'), w = 720, h = 1280, hz = h * .5;
  let gr = g.createLinearGradient(0, 0, 0, hz); gr.addColorStop(0, '#1a2457'); gr.addColorStop(.45, '#6b4a94'); gr.addColorStop(.8, '#f2826c'); gr.addColorStop(1, '#ffcf86');
  g.fillStyle = gr; g.fillRect(0, 0, w, hz + 2);
  const sun = g.createRadialGradient(w * .62, hz * .9, 0, w * .62, hz * .9, 260); sun.addColorStop(0, 'rgba(255,240,200,1)'); sun.addColorStop(.12, 'rgba(255,210,150,.9)'); sun.addColorStop(1, 'rgba(255,160,120,0)');
  g.fillStyle = sun; g.fillRect(0, 0, w, hz);
  g.fillStyle = 'rgba(255,170,170,.35)'; [[120, 220, 170, 26], [420, 160, 200, 22], [300, 330, 240, 18], [580, 280, 150, 16]].forEach(([x, y, rx, ry]) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); });
  const ridge = (base, amp, f, ph) => x => base - amp * (Math.abs(Math.sin(x * f + ph)) * .6 + Math.sin(x * f * 2.7 + ph * 2) * .25 + Math.sin(x * f * 7.1) * .08);
  const layers = [[ridge(hz - 10, 230, .006, .4), '#6c5f96', null], [ridge(hz + 5, 300, .008, 1.9), '#3c3868', 'rgba(240,235,255,.85)'], [ridge(hz + 12, 130, .013, 3.1), '#21233f', null]];
  const drawLayers = () => layers.forEach(([f, col, snow]) => {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, hz + 20); for (let x = 0; x <= w; x += 4) g.lineTo(x, f(x)); g.lineTo(w, hz + 20); g.fill();
    if (snow) { g.fillStyle = snow; for (let x = 0; x <= w; x += 4) { const y = f(x); if (y < hz - 170) g.fillRect(x, y, 4, (hz - 170 - y) * .5 + 4); } } });
  drawLayers();
  // lago con reflejo
  g.save(); g.translate(0, hz * 2 + 22); g.scale(1, -1); g.globalAlpha = .55; g.drawImage(LAND, 0, 0, w, hz + 20, 0, 0, w, hz + 20); g.restore();
  gr = g.createLinearGradient(0, hz + 10, 0, h); gr.addColorStop(0, 'rgba(40,30,80,.25)'); gr.addColorStop(1, 'rgba(10,12,30,.85)'); g.fillStyle = gr; g.fillRect(0, hz + 10, w, h);
  g.strokeStyle = 'rgba(255,220,190,.18)'; g.lineWidth = 2; for (let y = hz + 20; y < h * .8; y += 9) { g.beginPath(); g.moveTo((y * 37) % 200, y); g.lineTo((y * 37) % 200 + 160 + (y % 5) * 40, y); g.stroke(); }
  g.fillStyle = 'rgba(255,214,160,.35)'; g.fillRect(w * .6, hz + 15, 40, h * .25);
  // orilla y árboles
  g.fillStyle = '#0c0d19'; g.beginPath(); g.moveTo(0, h); g.lineTo(0, h * .82); for (let x = 0; x <= w; x += 10) g.lineTo(x, h * .83 + Math.sin(x * .02) * 20); g.lineTo(w, h); g.fill();
  for (let i = 0; i < 14; i++) { const x = (i * 97) % w, s = 60 + (i * 31) % 80, y = h * .84; g.beginPath(); g.moveTo(x, y - s * 2.2); g.lineTo(x - s * .45, y); g.lineTo(x + s * .45, y); g.fill(); }
})();
const LANDDATA = (() => { const c = document.createElement('canvas'); c.width = 36; c.height = 64; const g = c.getContext('2d'); g.drawImage(LAND, 0, 0, 36, 64); return g.getImageData(0, 0, 36, 64).data; })();
const lum = (r, g, b) => .299 * r + .587 * g + .114 * b;

// --- pantalla del móvil ---
const icons = ['#4f8cff', '#ffb648', '#5ad18a', '#ff6b8a', '#9b7bff', '#3fc1d9', '#ff8a3d', '#a0a8b8'];
function home(g, w, h, wall = true) {
  if (wall) g.drawImage(LAND, 0, 0, w, h); else { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a2f3a'); gr.addColorStop(1, '#14171e'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
  g.fillStyle = '#fff'; g.font = '800 22px Inter'; g.fillText('21:47', 30, 40); g.textAlign = 'right'; g.fillText('5G  ▮▮▮  87%', w - 30, 40); g.textAlign = 'left';
  g.font = '800 92px Inter'; g.textAlign = 'center'; g.fillText('21:47', w / 2, 230); g.font = '500 26px Inter'; g.fillText('domingo, 31 de mayo', w / 2, 275); g.textAlign = 'left';
  for (let i = 0; i < 8; i++) { const x = 52 + (i % 4) * 118, y = h - 330 + Math.floor(i / 4) * 130; g.fillStyle = icons[i]; g.beginPath(); g.roundRect(x, y, 84, 84, 22); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.roundRect(30, h - 135, w - 60, 100, 40); g.fill();
}
function drawScreen(g, w, h, st = { mode: 'home' }) {
  const { mode, p = 0 } = st;
  if (mode === 'gallery') {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); const ih = w * 16 / 9 * .78, iw = w * .78;
    g.drawImage(LAND, (w - iw) / 2, 120, iw, ih);
    g.fillStyle = '#fff'; g.font = '800 30px Inter'; g.fillText('‹  Galería', 26, 70);
    g.fillStyle = '#1c1f26'; g.beginPath(); g.roundRect(0, h - 270, w, 270, 36); g.fill();
    g.fillStyle = p > 0 ? '#7fb6ff' : '#3d7bff'; g.beginPath(); g.roundRect(50, h - 190, w - 100, 92, 46); g.fill();
    g.fillStyle = '#fff'; g.font = '800 34px Inter'; g.textAlign = 'center'; g.fillText('Establecer como fondo', w / 2, h - 132); g.textAlign = 'left';
    if (p > 0) { g.fillStyle = `rgba(255,255,255,${.5 * (1 - p)})`; g.beginPath(); g.arc(w / 2, h - 144, 40 + p * 160, 0, 7); g.fill(); }
  } else if (mode === 'home') home(g, w, h);
  else if (mode === 'safe') { home(g, w, h, false); g.fillStyle = '#fff'; g.font = '800 30px Inter'; g.fillText('Modo seguro', 26, h - 160); }
  else if (mode === 'black') { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); }
  else if (mode === 'boot') { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.strokeStyle = '#9fd0ff'; g.lineWidth = 10; g.beginPath(); g.arc(w / 2, h / 2, 60, p * 9, p * 9 + 4.2); g.stroke();
    g.fillStyle = '#cfe0ff'; g.font = '800 34px Inter'; g.textAlign = 'center'; g.fillText('Reiniciando…', w / 2, h / 2 + 140); g.textAlign = 'left'; }
  else if (mode === 'crash') { home(g, w, h); g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a2d35'; g.beginPath(); g.roundRect(50, h / 2 - 130, w - 100, 260, 30); g.fill();
    g.fillStyle = '#fff'; g.font = '800 33px Inter'; g.fillText('La IU del sistema', 90, h / 2 - 50); g.fillText('se ha detenido', 90, h / 2 - 8); g.fillStyle = '#8fb8ff'; g.font = '800 28px Inter'; g.fillText('Cerrar aplicación', 90, h / 2 + 80); }
  else if (mode === 'update') { home(g, w, h, false); g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '800 36px Inter'; g.fillText('Actualización', 50, h / 2 - 80); g.fillText('del sistema', 50, h / 2 - 36);
    g.fillStyle = '#333a48'; g.fillRect(50, h / 2 + 10, w - 100, 16); g.fillStyle = '#5ad18a'; g.fillRect(50, h / 2 + 10, (w - 100) * p, 16); g.font = '500 26px Inter'; g.fillStyle = '#cfd6e6'; g.fillText(p < 1 ? 'Instalando corrección…' : 'Corrección instalada ✓', 50, h / 2 + 70); }
}
function phone(s = 1) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new RoundedBoxGeometry(1 * s, 2.1 * s, .09 * s, 5, .09 * s), M.body); g.add(b);
  const scrT = ctex(540, 1170, drawScreen);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(.93 * s, 2.02 * s), new THREE.MeshBasicMaterial({ map: scrT.t, toneMapped: false })); scr.position.z = .047 * s; g.add(scr);
  const glassM = new THREE.Mesh(new THREE.PlaneGeometry(.93 * s, 2.02 * s), new THREE.MeshPhysicalMaterial({ color: '#000', transparent: true, opacity: .18, roughness: .05, metalness: 0, clearcoat: 1 })); glassM.position.z = .049 * s; g.add(glassM);
  g.userData = { scrT, st: '' };
  g.show = (mode, p = 0) => { const k = mode + ':' + (Math.round(p * 60) / 60); if (g.userData.st !== k) { scrT.draw({ mode, p }); g.userData.st = k; } };
  return g;
}
function hand() {
  const h = new THREE.Group();
  const palm = new THREE.Mesh(new RoundedBoxGeometry(1.0, 1.05, .4, 4, .18), M.skin); palm.position.set(.05, -.75, -.25); h.add(palm);
  for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(.085, .32, 6, 10), M.skin); f.rotation.z = Math.PI / 2 - .15; f.position.set(-.5, -.2 - i * .22, -.02); h.add(f); }
  const th = new THREE.Group(); const t1 = new THREE.Mesh(new THREE.CapsuleGeometry(.1, .45, 6, 10), M.skin); t1.position.y = .25; th.add(t1);
  th.position.set(.48, -1.05, .1); th.rotation.z = .5; h.add(th); h.userData.thumb = th;
  const sl = new THREE.Mesh(new THREE.CylinderGeometry(.42, .5, 1.6, 20), M.sleeve); sl.position.set(.2, -2.0, -.3); sl.rotation.x = -.2; h.add(sl);
  return h;
}
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

// ---------- A: mano + móvil sobre escritorio ----------
const sDesk = set('desk', 0);
const table = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), M.wood); table.rotation.x = -Math.PI / 2; sDesk.add(table);
const P1 = phone(); const H1 = hand(); const rig = new THREE.Group(); rig.add(P1, H1); rig.position.set(0, 1.9, 0); rig.rotation.x = -.18; sDesk.add(rig);
sDesk.add(bokeh(40, V(14, 6, 10), ['#ffb36b', '#ffd59e', '#7fa8ff']));
sDesk.add(pl('#ffb36b', 10, 10, V(-2, 4, 2))); sDesk.add(pl('#7fa8ff', 6, 10, V(3, 3, -2)));
const deskRed = pl('#ff3355', 0, 8, V(2.2, 3.4, -.6)); sDesk.add(deskRed);
const screenGlow = pl('#ffb08a', 3, 4, V(-1.6, .6, .9)); sDesk.add(screenGlow);

// ---------- B: vóxeles de la imagen ----------
const sVox = set('vox', 200);
const VX = 36, VY = 64, VS = .12;
const vox = new THREE.InstancedMesh(new THREE.BoxGeometry(VS * .92, VS * .92, VS * .92), new THREE.MeshStandardMaterial({ roughness: .35, metalness: .1 }), VX * VY);
const vcol = [], vhot = [];
for (let y = 0; y < VY; y++) for (let x = 0; x < VX; x++) { const i = y * VX + x, k = ((VY - 1 - y) * VX + x) * 4; // y invertida
  const r = LANDDATA[((y) * VX + x) * 4], gg = LANDDATA[((y) * VX + x) * 4 + 1], b = LANDDATA[((y) * VX + x) * 4 + 2];
  const c = new THREE.Color(`rgb(${r},${gg},${b})`); vcol.push(c); vox.setColorAt(i, c);
  vhot.push(lum(r, gg, b) > 185 && r > 200); }
sVox.add(vox);
const voxM = new THREE.Matrix4(), voxQ = new THREE.Quaternion(), voxS = new THREE.Vector3(1, 1, 1), voxP = new THREE.Vector3();
const hotC = new THREE.Color('#ff2e6e');
function voxUpdate(t, ext, hotAmt) {
  for (let y = 0; y < VY; y++) for (let x = 0; x < VX; x++) { const i = y * VX + x; const c = vcol[i];
    const L = lum(c.r * 255, c.g * 255, c.b * 255) / 255; const wave = Math.sin(t * 2 + x * .3 + y * .2) * .05 * ext;
    voxP.set((x - VX / 2) * VS, (VY / 2 - y) * VS + 3.9, ext * (L * 1.6 + (vhot[i] ? .9 : 0)) + wave);
    const sc = 1 + (vhot[i] ? hotAmt * (.35 + .25 * Math.sin(t * 9 + i)) : 0); voxS.set(sc, sc, 1 + ext * L * 4);
    voxM.compose(voxP, voxQ, voxS); vox.setMatrixAt(i, voxM);
    if (vhot[i]) vox.setColorAt(i, c.clone().lerp(hotC, hotAmt * (.6 + .4 * Math.sin(t * 9 + i)))); }
  vox.instanceMatrix.needsUpdate = true; vox.instanceColor.needsUpdate = true;
}
sVox.add(pl('#ffd0a0', 30, 20, V(2, 6, 4))); sVox.add(pl('#7f8cff', 20, 20, V(-3, 2, 3))); const voxRed = pl('#ff2e6e', 0, 12, V(0, 4.5, 2)); sVox.add(voxRed);

// ---------- C: aviso ----------
const sWarn = set('warn', 400);
sWarn.add(floor());
const P2 = phone(); P2.position.set(0, 2.1, 0); sWarn.add(P2);
const triS = new THREE.Shape(); triS.moveTo(0, 1.6); triS.lineTo(1.5, -1); triS.lineTo(-1.5, -1); triS.lineTo(0, 1.6);
const hole = new THREE.Path(); hole.moveTo(0, 1.1); hole.lineTo(1.05, -.72); hole.lineTo(-1.05, -.72); hole.lineTo(0, 1.1); triS.holes.push(hole);
const tri = new THREE.Mesh(new THREE.ExtrudeGeometry(triS, { depth: .2, bevelEnabled: true, bevelSize: .04, bevelThickness: .04 }), new THREE.MeshStandardMaterial({ color: '#ffb020', emissive: '#ff8a00', emissiveIntensity: 1.3 }));
tri.position.set(0, 2.5, -1.6); tri.scale.setScalar(1.25); sWarn.add(tri);
const ex = new THREE.Mesh(new THREE.CapsuleGeometry(.08, .55, 4, 8), tri.material); ex.position.set(0, 2.55, -1.55); sWarn.add(ex);
const exd = new THREE.Mesh(new THREE.SphereGeometry(.1, 12, 8), tri.material); exd.position.set(0, 1.95, -1.55); sWarn.add(exd);
sWarn.add(bokeh(50, V(16, 7, 10), ['#ffb020', '#ff6b4a']));
sWarn.add(pl('#ffb020', 14, 10, V(0, 3, -.5))); sWarn.add(pl('#7fa8ff', 8, 10, V(2, 4, 3)));

// ---------- D: gamas de color ----------
const sGam = set('gam', 600);
sGam.add(floor());
function triMesh(pts, col, op, y) { const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => s.lineTo(p[0], p[1])); s.lineTo(pts[0][0], pts[0][1]);
  const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, toneMapped: false, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = y;
  const e = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts.map(p => V(p[0], p[1], 0))), new THREE.LineBasicMaterial({ color: col, toneMapped: false })); e.rotation.x = -Math.PI / 2; e.position.y = y + .01; return [m, e]; }
const big = [[-3.4, -2.2], [3.2, -2.6], [-.2, 3.4]], small = [[-1.9, -1.3], [1.9, -1.5], [-.1, 1.9]];
const [bigM, bigE] = triMesh(big, '#ff8a3d', .12, .02), [smM, smE] = triMesh(small, '#3fc1ff', .28, .04);
sGam.add(bigM, bigE, smM, smE);
const inTri = (p, T) => { const s = (a, b, c) => (a[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (a[1] - c[1]); const d1 = s(p, T[0], T[1]), d2 = s(p, T[1], T[2]), d3 = s(p, T[2], T[0]); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
const dots = [];
while (dots.length < 160) { const p = [(rnd() - .5) * 6.4, (rnd() - .5) * 6]; if (!inTri(p, big)) continue; const out = !inTri(p, small); if (out && dots.filter(d => d.out).length > 34) continue;
  const m = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 8), new THREE.MeshBasicMaterial({ color: out ? '#ff2e6e' : '#e8f3ff', toneMapped: false }));
  m.userData = { tgt: V(p[0], .12, -p[1]), from: V((rnd() - .5) * 2, 6 + rnd() * 3, (rnd() - .5) * 2), d: rnd() * .5, out }; sGam.add(m); dots.push(m); }
const lblS = plane(1.8, .45, labelTex('sRGB', { size: 170 })); lblS.rotation.x = -Math.PI / 2; lblS.position.set(0, .06, .6); sGam.add(lblS);
const lblB = plane(3.4, .5, labelTex('PERFIL DE LA FOTO', { size: 150, fg: '#ffb27a' })); lblB.rotation.x = -Math.PI / 2; lblB.position.set(0, .06, -3.95); sGam.add(lblB);
sGam.add(pl('#7fa8ff', 8, 12, V(0, 4, 2)));

// ---------- E: histograma de 256 casillas ----------
const sHis = set('his', 800);
sHis.add(floor());
const NB = 64, bins = new Array(NB).fill(0);
for (let i = 0; i < VX * VY; i++) { const L = lum(LANDDATA[i * 4], LANDDATA[i * 4 + 1], LANDDATA[i * 4 + 2]); bins[Math.min(NB - 1, Math.floor(L / 256 * NB))]++; }
const bmax = Math.max(...bins); const BW = .22, X0 = -(NB * BW) / 2;
const bars = bins.map((n, i) => { const c = new THREE.Color().setHSL(.6 - i / NB * .55, .7, .35 + i / NB * .35);
  const m = new THREE.Mesh(new THREE.BoxGeometry(BW * .85, 1, BW * .85), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: .45, roughness: .3 }));
  m.position.set(X0 + i * BW + BW / 2, 0, 0); m.userData.h = .3 + Math.sqrt(n / bmax) * 4.2; sHis.add(m); return m; });
const slotEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BW * .9, 1.2, BW * .9)), new THREE.LineDashedMaterial({ color: '#ff4d6d', dashSize: .08, gapSize: .06, toneMapped: false }));
slotEdge.computeLineDistances(); slotEdge.position.set(X0 + NB * BW + BW * 1.4, .6, 0); sHis.add(slotEdge);
const n0 = plane(.9, .4, labelTex('0', { size: 200 })); n0.position.set(X0 + BW / 2, -.01 + .25, .9); sHis.add(n0);
const n255 = plane(1.3, .45, labelTex('255', { size: 200 })); n255.position.set(X0 + NB * BW - BW / 2, .25, .9); sHis.add(n255);
const n256 = plane(1.3, .45, labelTex('256', { size: 200, fg: '#ff4d6d' })); n256.position.set(slotEdge.position.x, 1.5, 0); sHis.add(n256);
const rail = box(NB * BW + 1, .04, .04, new THREE.MeshBasicMaterial({ color: '#7fa8ff', toneMapped: false })); rail.position.set(0, .02, .45); sHis.add(rail);
const flyers = []; for (let i = 0; i < 70; i++) { const k = Math.floor(rnd() * VX * VY); const c = vcol[k]; const b = Math.min(NB - 1, Math.floor(lum(c.r * 255, c.g * 255, c.b * 255) / 256 * NB));
  const m = new THREE.Mesh(new THREE.BoxGeometry(.14, .14, .14), new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); m.userData = { b, d: i / 70 }; sHis.add(m); flyers.push(m); }
const rogue = new THREE.Mesh(new THREE.BoxGeometry(.24, .24, .24), new THREE.MeshBasicMaterial({ color: '#ff2e6e', toneMapped: false })); sHis.add(rogue);
const rogueLbl = plane(.8, .3, labelTex('256', { size: 200, fg: '#ffffff' })); sHis.add(rogueLbl);
const hisRed = pl('#ff2e6e', 0, 8, V(slotEdge.position.x, 1.5, 1)); sHis.add(hisRed); sHis.add(pl('#7fa8ff', 16, 20, V(0, 5, 4)));

// ---------- F: bucle de reinicios ----------
const sLoop = set('loop', 1000);
sLoop.add(floor());
const P3 = phone(1.15); P3.position.set(0, 2.4, 0); sLoop.add(P3);
const loopRing = new THREE.Mesh(new THREE.TorusGeometry(1.9, .045, 12, 120, Math.PI * 1.75), new THREE.MeshBasicMaterial({ color: '#ff4d6d', toneMapped: false })); loopRing.position.set(0, 2.4, 0); sLoop.add(loopRing);
const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(.16, .4, 16), loopRing.material); sLoop.add(arrowHead);
sLoop.add(bokeh(40, V(14, 7, 8), ['#ff4d6d', '#7fa8ff']));
const loopLight = pl('#ff4d6d', 10, 10, V(0, 2.4, 1.5)); sLoop.add(loopLight); sLoop.add(pl('#7fa8ff', 6, 10, V(-3, 4, 3)));

// ---------- G: alcance (Android 10 vs 11) ----------
const sLine = set('line', 1200);
sLine.add(floor());
const lineP = []; const vers = ['ANDROID 10', 'ANDROID 10', 'ANDROID 11', 'ANDROID 10', 'ANDROID 11'];
vers.forEach((v, i) => { const p = phone(.8); const ang = (i - 2) * .38; p.position.set(Math.sin(ang) * 5, 1.75, -Math.cos(ang) * 5 + 5); p.rotation.y = -ang; sLine.add(p);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(.5, .6, .9, 32), M.body); ped.position.set(p.position.x, .45, p.position.z); sLine.add(ped);
  const lb = plane(1.6, .38, labelTex(v, { size: 140, bg: v.endsWith('11') ? '#1d6b45' : '#7a1c2c' })); lb.position.set(p.position.x, .62, p.position.z + .62); lb.rotation.y = -ang; sLine.add(lb);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.75, .025, 8, 64), new THREE.MeshBasicMaterial({ color: '#3fc1ff', transparent: true, opacity: 0, toneMapped: false })); ring.position.copy(p.position); ring.rotation.y = -ang; sLine.add(ring);
  lineP.push({ p, v, ring }); });
sLine.add(pl('#7fa8ff', 14, 16, V(0, 5, 6))); sLine.add(pl('#ff4d6d', 5, 10, V(-3, 2, 4)));

// ---------- H: solución ----------
const sFix = set('fix', 1400);
sFix.add(floor());
const P4 = phone(1.1); P4.position.set(0, 2.3, 0); sFix.add(P4);
const shieldS = new THREE.Shape(); shieldS.moveTo(0, 1); shieldS.quadraticCurveTo(.7, .9, .85, .8); shieldS.lineTo(.8, -.1); shieldS.quadraticCurveTo(.6, -.8, 0, -1.1); shieldS.quadraticCurveTo(-.6, -.8, -.8, -.1); shieldS.lineTo(-.85, .8); shieldS.quadraticCurveTo(-.7, .9, 0, 1);
const shieldM = new THREE.Mesh(new THREE.ExtrudeGeometry(shieldS, { depth: .15, bevelEnabled: true, bevelSize: .04, bevelThickness: .04 }), new THREE.MeshStandardMaterial({ color: '#2fbf71', emissive: '#1f8a50', emissiveIntensity: 1, metalness: .4, roughness: .3 }));
shieldM.position.set(1.3, 3.4, .4); shieldM.scale.setScalar(.5); sFix.add(shieldM);
sFix.add(bokeh(40, V(14, 7, 8), ['#5ad18a', '#7fa8ff'])); sFix.add(pl('#5ad18a', 8, 10, V(1, 3.5, 2))); sFix.add(pl('#7fa8ff', 8, 10, V(-2, 4, 3)));

// ---------- I: cierre ----------
const sEnd = set('end', 1600);
sEnd.add(floor());
const LANDT = new THREE.CanvasTexture(LAND); LANDT.colorSpace = THREE.SRGBColorSpace;
const print = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 3.2), new THREE.MeshBasicMaterial({ map: LANDT, toneMapped: false })); print.position.set(0, 2.4, -1); sEnd.add(print);
const frameB = box(1.95, 3.35, .06, M.body); frameB.position.set(0, 2.4, -1.04); sEnd.add(frameB);
const lone = new THREE.Mesh(new THREE.BoxGeometry(.3, .3, .3), new THREE.MeshBasicMaterial({ color: '#ff2e6e', toneMapped: false })); lone.position.set(-.5, 2.2, .6); sEnd.add(lone);
const loneL = plane(.8, .3, labelTex('256', { size: 200 })); loneL.position.set(-.5, 2.65, .62); sEnd.add(loneL);
sEnd.add(pl('#ff2e6e', 6, 5, V(-.5, 2.2, 1))); sEnd.add(pl('#ffb08a', 4, 8, V(0, 3, 2)));
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
function loopMode(x) { x = ((x % 1.5) + 1.5) % 1.5; return x < .6 ? ['boot', x / .6] : x < .9 ? ['home', 0] : x < 1.3 ? ['crash', 0] : ['black', 0]; }

function shots(t) {
  const fx = { glitch: 0, flash: 0 }; camera.fov = 40; let shake = 0;
  if (t < 4.2) {
    useSet('desk');
    H1.userData.thumb.rotation.z = .5 - clamp(1 - Math.abs(t - 1.05) / .25) * .45; H1.userData.thumb.position.z = .1 + clamp(1 - Math.abs(t - 1.05) / .25) * .12;
    if (t < 1.4) P1.show('gallery', t > 1.05 ? clamp((t - 1.05) / .35) : 0);
    else if (t < 1.75) P1.show('home');
    else { const f = Math.floor(t * 14) % 5; P1.show(t > 2.6 && t < 2.95 ? 'crash' : f === 0 || f === 3 ? 'black' : 'home'); }
    const fl = t > 1.75 ? 1 : 0; deskRed.intensity = fl * (6 + 6 * Math.sin(t * 30)); screenGlow.intensity = 3;
    const k = ease((t - 3.0) / 1.2);
    rig.rotation.x = lerp(-.18, 0, k);
    const p0 = V(.9 - t * .15, 2.3, 5.6 - t * .3), p1 = V(0, 1.9, 2.75);
    look(vl(p0, p1, k), vl(V(0, 1.75, 0), V(0, 1.9, 0), k), 'desk'); camera.fov = 40;
    fx.glitch = t > 1.75 && t < 3.0 ? (Math.sin(t * 23) > .3 ? .6 : 0) : 0; fx.flash = clamp(1 - Math.abs(t - 1.42) / .06) * .5;
  } else if (t < S.aviso || (t >= S.virus && t < S.perfil)) {
    useSet('vox');
    if (t < S.aviso) { const lt = t - 4.2, D = S.aviso - 4.2; const k = ease(lt / D);
      voxUpdate(t, ease(clamp(lt / 1.6)), clamp((lt - 1.2) / 1.5)); voxRed.intensity = clamp((lt - 1.2) / 1.5) * 10;
      const a = k * .9; look(V(Math.sin(a) * lerp(10.5, 8, k), 3.9 - k * .6, Math.cos(a) * lerp(10.5, 8, k)), V(0, 3.9, 0), 'vox');
      fx.flash = clamp(1 - lt / .15) * .9; }
    else { const [lt, D] = segT(t, 'virus', 'perfil'); const k = ease(lt / D);
      voxUpdate(t, 1, 1); voxRed.intensity = 10 + 6 * Math.sin(t * 6);
      const a = -.9 + k * .7; look(V(Math.sin(a) * 5.5, 5.2 - k * 1.5, Math.cos(a) * 5.5), V(.4, 4.6 - k * .6, .6), 'vox'); camera.fov = 44;
      fx.flash = clamp(1 - lt / .12) * .6; }
  } else if (t < S.virus) {
    useSet('warn'); const [lt, D] = segT(t, 'aviso', 'virus'); const k = ease(lt / D);
    P2.show('home'); P2.rotation.y = Math.sin(lt * .8) * .35; P2.position.y = 2.1 + Math.sin(lt * 1.6) * .05;
    tri.material.emissiveIntensity = 1 + .6 * Math.sin(lt * 7);
    look(vl(V(-2.2, 2.6, 6.2), V(1.8, 2.2, 5.2), k), V(0, 2.3, -.5), 'warn');
    fx.flash = clamp(1 - lt / .12) * .6;
  } else if (t < S.brillo) {
    useSet('gam'); const [lt, D] = segT(t, 'perfil', 'brillo');
    dots.forEach(d => { const a = ease(clamp((lt - .2 - d.userData.d * 1.4) / .9)); d.position.copy(vl(d.userData.from, d.userData.tgt, a));
      if (d.userData.out) d.scale.setScalar(1 + (lt > 2.4 ? .6 + .5 * Math.sin(t * 10 + d.userData.d * 30) : 0)); });
    smM.material.opacity = .28; bigM.material.opacity = .12 + (lt > 2.4 ? .08 * Math.sin(t * 5) : 0);
    const k = ease(lt / D); look(vl(V(0, 11.5, 8.5), V(2.6, 7.5, 10), k), V(0, 0, -.6), 'gam'); camera.fov = 46;
    fx.flash = clamp(1 - lt / .12) * .6;
  } else if (t < S.bucle) {
    useSet('his');
    if (t < S.fallo) { const [lt, D] = segT(t, 'brillo', 'fallo');
      const g = ease(clamp(lt / (D * .85)));
      bars.forEach((b, i) => { const h = Math.max(.02, b.userData.h * clamp(g * 1.3 - i / NB * .3)); b.scale.y = h; b.position.y = h / 2; });
      flyers.forEach(f => { const a = clamp((lt - f.userData.d * D * .8) / .7); f.visible = a > 0 && a < 1;
        const b = bars[f.userData.b]; const from = V(b.position.x * .2, 6.5, -3), to = V(b.position.x, b.scale.y + .1, 0); f.position.copy(vl(from, to, ease(a))); f.rotation.set(a * 4, a * 3, 0); });
      rogue.visible = rogueLbl.visible = false; hisRed.intensity = 0;
      const k = ease(lt / D); look(vl(V(-9.5, 2.2, 2.6), V(-.5, 2.6, 3.2), k), vl(V(-3, 1.6, 0), V(6, 1.6, 0), k), 'his'); camera.fov = 48;
      fx.flash = clamp(1 - lt / .12) * .6; }
    else { const [lt, D] = segT(t, 'fallo', 'bucle');
      bars.forEach(b => { b.scale.y = b.userData.h; b.position.y = b.userData.h / 2; }); flyers.forEach(f => f.visible = false);
      const hit = D * .55, a = clamp(lt / hit); rogue.visible = rogueLbl.visible = true;
      const x0 = X0 + BW * 40, x1 = slotEdge.position.x; rogue.position.set(lerp(x0, x1, ease(a)), .55 + Math.abs(Math.sin(a * 9)) * .5 * (1 - a), 0); rogue.rotation.set(t * 3, t * 2, 0);
      rogueLbl.position.set(rogue.position.x, rogue.position.y + .4, .2);
      const after = lt - hit; hisRed.intensity = after > 0 ? 25 * Math.exp(-after * 1.5) + 6 : 2;
      if (after > 0) { rogue.scale.setScalar(1 + Math.sin(after * 40) * .15); bars.slice(-12).forEach((b, i) => { b.rotation.z = Math.sin(after * 30 + i) * .05 * Math.exp(-after * 2); }); }
      else { rogue.scale.setScalar(1); bars.forEach(b => b.rotation.z = 0); }
      look(V(lerp(x0 - 1.5, x1 - 1.6, ease(a)), 1.7, 3.6), V(lerp(x0, x1, ease(a)) + .6, .8, 0), 'his'); camera.fov = 44;
      shake = after > 0 ? Math.exp(-after * 3) * .07 : 0; fx.glitch = after > 0 ? Math.exp(-after * 3.5) : 0; fx.flash = clamp(1 - lt / .12) * .6; }
  } else if (t < S.alcance) {
    useSet('loop'); const [lt, D] = segT(t, 'bucle', 'alcance');
    const [m, p] = loopMode(lt); P3.show(m, p);
    loopRing.rotation.z = -t * 2.2; const ae = -t * 2.2 + Math.PI * 1.75; arrowHead.position.set(Math.cos(ae) * 1.9, 2.4 + Math.sin(ae) * 1.9, 0); arrowHead.rotation.z = ae + Math.PI;
    loopLight.intensity = m === 'crash' ? 16 : 7;
    const k = ease(lt / D); look(V(Math.sin(k * 1.2 - .6) * 6.5, 2.7, Math.cos(k * 1.2 - .6) * 6.5), V(0, 2.2, 0), 'loop'); camera.fov = 44;
    fx.flash = Math.max(clamp(1 - lt / .12) * .6, m === 'black' ? .15 : 0); fx.glitch = m === 'crash' ? .25 : 0;
  } else if (t < S.solucion) {
    useSet('line'); const [lt, D] = segT(t, 'alcance', 'solucion');
    lineP.forEach(({ p, v, ring }, i) => { if (v.endsWith('11')) { p.show('home'); ring.material.opacity = .8 * (1 - ((lt * .9 + i * .2) % 1)); ring.scale.setScalar(.8 + ((lt * .9 + i * .2) % 1) * .9); }
      else { const [m, pp] = loopMode(lt + i * .5); p.show(m, pp); } });
    const k = ease(lt / D); look(V(lerp(-3, 3, k), 2.6, 9.6), V(lerp(-1, 1, k), 1.4, 2), 'line'); camera.fov = 50;
    fx.flash = clamp(1 - lt / .12) * .6;
  } else if (t < S.cierre) {
    useSet('fix'); const [lt, D] = segT(t, 'solucion', 'cierre'); const c = D * .45;
    if (lt < c) P4.show('safe'); else { const pr = clamp((lt - c) / (D * .4)); P4.show(pr < 1 ? 'update' : 'home', pr); }
    const sh = ease(clamp((lt - c - D * .4) / .5)); shieldM.scale.setScalar(.01 + sh * .5); shieldM.rotation.y = lt * 1.5;
    P4.rotation.y = Math.sin(lt * .6) * .2;
    look(V(Math.sin(lt * .2) * 1.2, 2.6, 5.6 - lt * .15), V(0, 2.2, 0), 'fix'); camera.fov = 44;
    fx.flash = Math.max(clamp(1 - lt / .12), clamp(1 - Math.abs(lt - c) / .1) * .7) * .6;
  } else {
    useSet('end'); const lt = t - S.cierre, D = TL.duration - S.cierre; const k = ease(lt / D);
    lone.rotation.set(t * 1.5, t, 0); lone.position.y = 2.2 + Math.sin(t * 2) * .06;
    look(V(-.4 + k * .4, 2.2, lerp(3.4, 7.5, k)), V(.1, 2.1, -.5), 'end'); camera.fov = 44;
    fx.flash = clamp(1 - lt / .12) * .6;
  }
  if (shake) camera.position.add(V(Math.sin(t * 90) * shake, Math.cos(t * 77) * shake, 0));
  camera.updateProjectionMatrix(); return fx;
}
function overlays(t) {
  tag('¿UN FONDO NORMAL?', .3, 3.0, t, { y: 290, accent: '#ffb08a' });
  tag('¿QUÉ ESCONDÍAN SUS COLORES?', 4.4, S.aviso - .1, t, { y: 290, accent: '#ff2e6e' });
  tag('MAYO DE 2020', S.aviso + .1, S.virus - .1, t, { y: 290, accent: '#ffb020', sub: 'Aviso del filtrador Ice Universe' });
  tag('NO ERA UN VIRUS', S.virus + .1, S.perfil - .1, t, { y: 290, accent: '#5ad18a', sub: 'El problema estaba en el color' });
  tag('PERFIL DE COLOR ≠ sRGB', S.perfil + .1, S.brillo - .1, t, { y: 290, accent: '#ff8a3d', sub: 'Colores fuera del rango esperado' });
  tag('256 CASILLAS DE BRILLO', S.brillo + .1, S.fallo - .1, t, { y: 290, accent: '#3fc1ff', sub: 'Numeradas del 0 al 255' });
  tag('CASILLA 256: NO EXISTE', S.fallo + .1, S.bucle - .1, t, { y: 290, accent: '#ff2e6e', sub: 'El cálculo se salía del rango' });
  if (t >= S.bucle && t < S.alcance) { const n = Math.floor((t - S.bucle) / 1.5) + 1;
    tag(`REINICIO ${n}`, S.bucle + .1, S.alcance - .1, t, { y: 290, accent: '#ff4d6d', sub: 'La interfaz del sistema fallaba una y otra vez' }); }
  tag('ALGUNOS MÓVILES, NO TODOS', S.alcance + .1, S.solucion - .1, t, { y: 290, accent: '#3fc1ff', sub: 'Casos documentados en Samsung y Pixel' });
  tag('SOLUCIÓN', S.solucion + .1, S.cierre - .1, t, { y: 290, accent: '#5ad18a', sub: 'Modo seguro, restablecer y actualizaciones' });
  if (t > S.cierre + .2) { const a = eout((t - S.cierre - .2) / .4);
    o2.save(); o2.globalAlpha = a; o2.textAlign = 'center'; o2.font = '120px Anton'; o2.fillStyle = '#fff'; o2.shadowColor = '#ff2e6e'; o2.shadowBlur = 40;
    o2.fillText('BYTEOCULTO', W / 2, 330); o2.shadowBlur = 0; o2.font = '800 40px Inter'; o2.fillStyle = '#ffd6e0'; o2.fillText('Historias ocultas de la tecnología', W / 2, 395); o2.restore(); }
  o2.save(); o2.font = '800 26px Inter'; o2.fillStyle = 'rgba(255,255,255,.55)'; o2.textAlign = 'right'; o2.fillText('RECREACIÓN 3D', W - 40, 70); o2.restore();
}

window.setup = async (tl) => {
  TL = tl; for (const sg of TL.segments) S[sg.id] = sg.start; buildChunks();
  await document.fonts.load('100px Anton'); await document.fonts.load('800 40px Inter'); await document.fonts.load('500 40px Inter');
  ALLTEX.forEach(o => o.draw()); [P1, P2, P3, P4, ...lineP.map(x => x.p)].forEach(p => p.userData.st = '');
  return true;
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
  useSet('desk'); P1.show('home'); rig.rotation.x = -.1; deskRed.intensity = 10; H1.userData.thumb.rotation.z = .5;
  look(V(.5, 1.2, 5.0), V(0, 1.15, 0), 'desk'); camera.fov = 44; camera.updateProjectionMatrix(); return {};
}
function thumbText() {
  o2.save(); o2.textAlign = 'center'; o2.lineJoin = 'round'; o2.lineWidth = 22; o2.strokeStyle = '#000';
  [['NO PONGAS', 250, '#fff'], ['ESTA FOTO', 420, '#ffd400']].forEach(([s, y, c]) => { let sz = 190; o2.font = `${sz}px Anton`; while (o2.measureText(s).width > W - 80) { sz -= 5; o2.font = `${sz}px Anton`; }
    o2.strokeText(s, W / 2, y); o2.fillStyle = c; o2.fillText(s, W / 2, y); });
  o2.font = '800 46px Inter'; o2.lineWidth = 10; const s2 = 'como fondo en algunos Android'; o2.strokeText(s2, W / 2, 1800); o2.fillStyle = '#fff'; o2.fillText(s2, W / 2, 1800);
  o2.font = '800 26px Inter'; o2.fillStyle = 'rgba(255,255,255,.6)'; o2.textAlign = 'right'; o2.fillText('RECREACIÓN 3D', W - 40, 70); o2.restore();
}
window.READY = true;
