// ByteOculto · CrowdStrike (julio 2024) — escena 3D con Three.js, renderizada fotograma a fotograma.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W = 1080, H = 1920;
const BLUE = '#0a4fb4', BLUE2 = '#0c63d6';
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
function bsod(g, w, h, code = 'PAGE_FAULT_IN_NONPAGED_AREA', pct = 0) {
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, BLUE2); gr.addColorStop(1, BLUE);
  g.fillStyle = gr; g.fillRect(0, 0, w, h); const s = w / 640;
  g.fillStyle = '#fff'; g.font = `500 ${110 * s}px Inter`; g.fillText(':(', 50 * s, 150 * s);
  g.font = `500 ${25 * s}px Inter`;
  g.fillText('El equipo ha encontrado un problema', 50 * s, 215 * s);
  g.fillText('y necesita reiniciarse.', 50 * s, 247 * s);
  g.font = `500 ${18 * s}px Inter`; g.fillText(`${pct}% completado`, 50 * s, 290 * s);
  g.globalAlpha = .75; g.font = `500 ${13 * s}px Inter`; g.fillText('Código de detención: ' + code, 50 * s, 330 * s); g.globalAlpha = 1;
}
function desktop(g, w, h) {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1d2a44'); gr.addColorStop(1, '#2d4a6e');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(w * .08, h * .12, w * .5, h * .55);
  g.fillStyle = '#3d7bd9'; g.fillRect(w * .08, h * .12, w * .5, h * .07);
  g.fillStyle = '#c9d3e3'; for (let i = 0; i < 5; i++) g.fillRect(w * .11, h * (.25 + i * .08), w * (.25 + (i % 3) * .07), h * .035);
  g.fillStyle = '#0d1422'; g.fillRect(0, h * .92, w, h * .08);
}
function update(g, w, h, p = 0) {
  g.fillStyle = '#0d1b33'; g.fillRect(0, 0, w, h); const s = w / 640;
  g.fillStyle = '#e8f0ff'; g.font = `800 ${30 * s}px Inter`; g.fillText('Instalando actualización…', 60 * s, 160 * s);
  g.font = `500 ${18 * s}px Inter`; g.fillStyle = '#9fb3d9'; g.fillText('No apagues el equipo', 60 * s, 195 * s);
  g.fillStyle = '#1f3358'; g.fillRect(60 * s, 230 * s, 520 * s, 22 * s);
  g.fillStyle = '#4fa3ff'; g.fillRect(60 * s, 230 * s, 520 * s * p, 22 * s);
  g.fillStyle = '#e8f0ff'; g.font = `800 ${20 * s}px Inter`; g.fillText(Math.round(p * 100) + ' %', 60 * s, 290 * s);
}
function safemode(g, w, h, k = 0) {
  g.fillStyle = '#05070a'; g.fillRect(0, 0, w, h); const s = w / 640;
  g.fillStyle = '#d7dde8'; g.font = `500 ${20 * s}px monospace`;
  g.fillText('Modo seguro', w - 175 * s, 30 * s); g.fillText('Modo seguro', 12 * s, h - 14 * s);
  const lines = ['C:\\> cd \\Windows\\System32\\drivers\\CrowdStrike', 'C:\\...\\CrowdStrike> del C-00000291*.sys', 'Archivo eliminado.', 'C:\\...\\CrowdStrike> shutdown /r'];
  let n = k * 90;
  lines.forEach((l, i) => { const vis = l.slice(0, clamp(n, 0, l.length)); n -= l.length;
    g.fillStyle = i === 2 ? '#7dffa8' : '#d7dde8'; g.fillText(vis, 24 * s, (90 + i * 40) * s); });
}
const T = {
  bsod: ctex(640, 400, bsod), desk: ctex(640, 400, desktop), upd: ctex(640, 400, update), safe: ctex(640, 400, safemode),
};
const scrMat = tex => new THREE.MeshBasicMaterial({ map: tex.t, toneMapped: false });
const M = {
  bsod: scrMat(T.bsod), desk: scrMat(T.desk), upd: scrMat(T.upd), safe: scrMat(T.safe),
  off: new THREE.MeshBasicMaterial({ color: '#05070b' }),
  bezel: new THREE.MeshStandardMaterial({ color: '#15181f', roughness: .35, metalness: .6 }),
  floor: new THREE.MeshStandardMaterial({ color: '#0b0e15', roughness: .28, metalness: .5 }),
  wall: new THREE.MeshStandardMaterial({ color: '#1a1f2b', roughness: .8 }),
  wood: new THREE.MeshStandardMaterial({ color: '#3a2f27', roughness: .55 }),
  white: new THREE.MeshStandardMaterial({ color: '#d9dde6', roughness: .5 }),
};
const at = (o, p) => (o.position.copy(p), o);
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
function labelTex(txt, { w = 1024, h = 256, bg = null, fg = '#fff', font = 'Anton', size = 150, align = 'center' } = {}) {
  return ctex(w, h, g => { if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    g.fillStyle = fg; g.font = `${font === 'Anton' ? '' : '800 '}${size}px ${font}`; g.textAlign = align; g.textBaseline = 'middle';
    g.fillText(txt, align === 'center' ? w / 2 : 30, h / 2 + 6); });
}
function plane(w, h, tex, opts = {}) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex.t, transparent: true, toneMapped: false, side: THREE.DoubleSide, ...opts }));
}
// monitor con pantalla intercambiable
function monitor(s = 1, stand = true) {
  const g = new THREE.Group();
  g.add(box(1.62 * s, 1.04 * s, .06 * s, M.bezel));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.52 * s, .95 * s), M.desk); scr.position.z = .031 * s; g.add(scr);
  if (stand) { const n = box(.1 * s, .5 * s, .06 * s, M.bezel); n.position.set(0, -.7 * s, -.04 * s); g.add(n);
    const b = box(.6 * s, .03 * s, .35 * s, M.bezel); b.position.set(0, -.95 * s, 0); g.add(b); }
  g.userData.scr = scr; return g;
}
const shadowTex = ctex(256, 256, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  r.addColorStop(0, 'rgba(0,0,0,.75)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
function blob(w, d) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: shadowTex.t, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = .005; return m; }
function floor(sz = 80, mat = M.floor) { const f = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), mat); f.rotation.x = -Math.PI / 2; return f; }
function pl(c, i, d, p) { const l = new THREE.PointLight(c, i, d, 2); l.position.copy(p); return l; }

const SETS = {};
function set(name, x) { const g = new THREE.Group(); g.position.x = x; g.visible = false; scene.add(g); SETS[name] = g; return g; }

// ---------- A/B: escritorio + muro de pantallas ----------
const sWall = set('wall', 0);
sWall.add(floor());
const hero = monitor(1); hero.position.set(0, 1.25, 0); sWall.add(hero);
const desk1 = box(2.6, .06, 1.1, M.wood); desk1.position.set(0, .3, .2); sWall.add(desk1);
const kb = box(.9, .03, .28, M.bezel); kb.position.set(0, .345, .45); sWall.add(kb);
sWall.add(at(blob(3.4, 1.8), V(0, .006, .2)));
const wallMons = [];
for (let r = 0; r < 9; r++) for (let c = -7; c <= 7; c++) {
  if (r < 2 && Math.abs(c) < 2) continue;
  const m = monitor(.9, false); const ang = c * .085;
  m.position.set(Math.sin(ang) * 14, .55 + r * 1.0, -Math.cos(ang) * 14 + 13 - r * .15 + (r < 2 ? -2 : 0));
  m.rotation.y = -ang; m.userData.d = Math.hypot(c, r * 1.2) + rnd() * .8; sWall.add(m); wallMons.push(m);
}
sWall.add(pl('#ffb36b', 6, 6, V(1.2, 2.3, 1.4)));
const wallBlue = pl('#2f7bff', 0, 30, V(0, 4, -4)); sWall.add(wallBlue);

// ---------- C: aeropuerto ----------
const sAir = set('air', 200);
sAir.add(floor(120, new THREE.MeshStandardMaterial({ color: '#1b1f27', roughness: .18, metalness: .35 })));
const glass = new THREE.Mesh(new THREE.PlaneGeometry(60, 14), new THREE.MeshBasicMaterial({ color: '#0b1a33', transparent: true, opacity: .9 }));
glass.position.set(0, 7, -16); sAir.add(glass);
for (let i = -12; i <= 12; i++) { const mu = box(.18, 14, .18, M.bezel); mu.position.set(i * 2.5, 7, -15.9); sAir.add(mu); }
const sky = new THREE.Mesh(new THREE.PlaneGeometry(200, 60), new THREE.MeshBasicMaterial({ map: ctex(512, 256, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#081226'); gr.addColorStop(.7, '#1d3a6b'); gr.addColorStop(1, '#ff9a5a');
  g.fillStyle = gr; g.fillRect(0, 0, w, h); }).t, fog: false }));
sky.position.set(0, 10, -60); sAir.add(sky);
// avión estilizado tras el cristal
function plane3d() {
  const p = new THREE.Group(); const mat = new THREE.MeshStandardMaterial({ color: '#cfd6e2', roughness: .4, metalness: .3 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.3, 14, 8, 16), mat); body.rotation.z = Math.PI / 2; p.add(body);
  const wing = box(4, .2, 16, mat); wing.position.set(-.5, -.4, 0); wing.rotation.y = .25; p.add(wing);
  const tail = box(2.2, 3.4, .25, mat); tail.position.set(-7, 1.8, 0); p.add(tail);
  const st = box(1.6, .15, 5, mat); st.position.set(-7, .4, 0); p.add(st);
  for (let i = -5; i <= 5; i++) { const w = box(.25, .3, .02, new THREE.MeshBasicMaterial({ color: '#ffd9a0' })); w.position.set(i * 1.1, .4, 1.3); p.add(w); }
  return p;
}
const jet = plane3d(); jet.position.set(6, 2.2, -30); jet.rotation.y = -.35; sAir.add(jet);
// panel de salidas
const boardT = ctex(1024, 640, (g, w, h, mode = 0) => {
  g.fillStyle = '#05080f'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffd34d'; g.font = '64px Anton'; g.fillText('SALIDAS', 36, 80);
  const rows = [['BO 214', 'LISBOA'], ['BO 377', 'PARÍS'], ['BO 912', 'LONDRES'], ['BO 058', 'ROMA'], ['BO 640', 'BERLÍN'], ['BO 733', 'NUEVA YORK'], ['BO 120', 'DUBLÍN']];
  g.font = '800 40px Inter';
  rows.forEach((r, i) => { const y = 160 + i * 66; g.fillStyle = i % 2 ? '#0b1220' : '#0e1628'; g.fillRect(20, y - 46, w - 40, 62);
    g.fillStyle = '#e8eefc'; g.fillText(r[0], 40, y); g.fillText(r[1], 260, y);
    const st = mode === 0 ? 'EMBARQUE' : (i % 3 === 1 ? 'CANCELADO' : 'RETRASADO');
    g.fillStyle = mode === 0 ? '#7dffa8' : (st === 'CANCELADO' ? '#ff5a5a' : '#ffb84d'); g.fillText(st, 720, y); });
});
const board = new THREE.Group(); board.add(box(8.6, 5.6, .3, M.bezel));
const boardScr = new THREE.Mesh(new THREE.PlaneGeometry(8.3, 5.2), new THREE.MeshBasicMaterial({ map: boardT.t, toneMapped: false }));
boardScr.position.z = .16; board.add(boardScr); board.position.set(-3.2, 6.2, -6); board.rotation.y = .32; sAir.add(board);
const bpole = box(.25, 3.4, .25, M.bezel); bpole.position.set(-3.2, 1.7, -6.1); sAir.add(bpole);
const airMons = [];
for (let i = 0; i < 6; i++) { // mostradores de facturación
  const cx = -1 + i * 3.1;
  const ct = box(2.6, 1.1, 1, new THREE.MeshStandardMaterial({ color: '#2b3342', roughness: .4, metalness: .4 })); ct.position.set(cx, .55, -1 - i * .9); sAir.add(ct);
  const top = box(2.7, .06, 1.1, M.white); top.position.set(cx, 1.12, -1 - i * .9); sAir.add(top);
  const m = monitor(.55); m.position.set(cx - .5, 1.7, -1.2 - i * .9); m.rotation.y = .25; sAir.add(m); airMons.push(m);
  const sg = plane(2.2, .55, labelTex(`MOSTRADOR ${i + 11}`, { bg: '#16335e', size: 110 })); sg.position.set(cx, 3.6, -1.4 - i * .9); sAir.add(sg);
  const sm = monitor(.8, false); sm.position.set(cx, 2.85, -1.45 - i * .9); sAir.add(sm); airMons.push(sm);
  sAir.add(at(blob(3.6, 1.8), V(cx, .007, -1 - i * .9)));
}
for (let i = 0; i < 10; i++) { const lamp = box(.8, .05, 3, new THREE.MeshBasicMaterial({ color: '#cfe0ff' })); lamp.position.set(-8 + i * 2.6, 11, -4); sAir.add(lamp); }
sAir.add(pl('#9fc2ff', 25, 30, V(0, 9, 2))); sAir.add(pl('#ff9a5a', 10, 30, V(4, 4, -12)));
// pasajeros esquemáticos
const pMat = new THREE.MeshStandardMaterial({ color: '#3b4252', roughness: .7 });
for (let i = 0; i < 14; i++) { const p = new THREE.Group(); const b = new THREE.Mesh(new THREE.CapsuleGeometry(.22, .9, 4, 8), pMat); b.position.y = .75; p.add(b);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(.17, 12, 8), pMat); hd.position.y = 1.55; p.add(hd);
  const sc = box(.35, .5, .22, new THREE.MeshStandardMaterial({ color: ['#a33', '#357', '#555', '#a72'][i % 4] })); sc.position.set(.35, .3, 0); p.add(sc);
  p.position.set(-4 + (i % 7) * 2.2 + rnd(), 0, 2.6 + Math.floor(i / 7) * 1.6 + rnd()); p.rotation.y = rnd() * 6; sAir.add(p); }

// ---------- D: oficina ----------
const sOff = set('off', 400);
sOff.add(floor(120, new THREE.MeshStandardMaterial({ color: '#2a2f38', roughness: .5, metalness: .1 })));
const offMons = [];
for (let r = 0; r < 6; r++) for (let c = -2; c <= 2; c++) {
  const x = c * 3.2, z = -r * 3;
  const d = box(2.4, .05, 1.2, M.white); d.position.set(x, .75, z); sOff.add(d);
  [-1.1, 1.1].forEach(dx => { const l = box(.05, .75, 1.1, M.bezel); l.position.set(x + dx, .375, z); sOff.add(l); });
  const m = monitor(.55); m.position.set(x, 1.33, z - .3); m.userData.d = r + Math.abs(c) * .6; sOff.add(m); offMons.push(m);
  const ch = box(.6, .9, .6, new THREE.MeshStandardMaterial({ color: '#222630' })); ch.position.set(x, .45, z + .9); sOff.add(ch);
  const pr = box(2.4, .9, .04, new THREE.MeshStandardMaterial({ color: '#3b4a5e', roughness: .9 })); pr.position.set(x, 1.2, z - .62); sOff.add(pr);
  sOff.add(at(blob(3, 1.8), V(x, .006, z)));
}
for (let r = 0; r < 7; r++) for (let c = -1; c <= 1; c++) { const lp = box(1.6, .04, .6, new THREE.MeshBasicMaterial({ color: '#eef4ff' })); lp.material.color.set('#9aa6b8'); lp.position.set(c * 4.8, 3.4, -r * 3 + 1); sOff.add(lp); }
const ceil = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), M.wall); ceil.rotation.x = Math.PI / 2; ceil.position.y = 3.45; sOff.add(ceil);
sOff.add(pl('#eef4ff', 7, 20, V(0, 3, 0))); sOff.add(pl('#eef4ff', 6, 20, V(0, 3, -10)));
const offBlue = pl('#2f7bff', 0, 14, V(0, 1.6, -3)); sOff.add(offBlue);

// ---------- E: hospital ----------
const sHos = set('hos', 600);
sHos.add(floor(80, new THREE.MeshStandardMaterial({ color: '#7d8986', roughness: .3, metalness: .05 })));
[-3.2, 3.2].forEach(x => { const w = box(.2, 3.6, 40, new THREE.MeshStandardMaterial({ color: '#9aa5a2', roughness: .8 })); w.position.set(x, 1.8, -12); sHos.add(w);
  const st = box(.22, .25, 40, new THREE.MeshStandardMaterial({ color: '#2aa198' })); st.position.set(x, 1, -12); sHos.add(st); });
const hc = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 40), new THREE.MeshStandardMaterial({ color: '#8a9391' })); hc.rotation.x = Math.PI / 2; hc.position.set(0, 3.6, -12); sHos.add(hc);
for (let i = 0; i < 8; i++) { const lp = box(1.2, .04, .5, new THREE.MeshBasicMaterial({ color: '#f4fbff' })); lp.position.set(0, 3.57, -i * 4); sHos.add(lp); }
const sign = plane(3.4, .8, ctex(1024, 240, (g, w, h) => { g.fillStyle = '#0e6f69'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff'; g.fillRect(60, 70, 100, 100); g.fillStyle = '#0e6f69'; g.fillRect(60, 70, 30, 30); g.fillRect(130, 70, 30, 30); g.fillRect(60, 140, 30, 30); g.fillRect(130, 140, 30, 30);
  g.fillStyle = '#fff'; g.font = '140px Anton'; g.textBaseline = 'middle'; g.fillText('URGENCIAS', 210, 128); }));
sign.position.set(0, 3.1, -6); sHos.add(sign);
const rec = box(4.2, 1.1, 1, M.white); rec.position.set(0, .55, -4); sHos.add(rec);
const hosMons = []; [-1.2, 0, 1.2].forEach((x, i) => { const m = monitor(.5); m.position.set(x, 1.6, -4.2); m.rotation.y = -x * .15; sHos.add(m); hosMons.push(m); });
const vit = monitor(.6, false); vit.position.set(2.4, 1.6, -1.2); vit.rotation.y = -.9; sHos.add(vit); hosMons.push(vit);
const vp = box(.06, 1.6, .06, M.bezel); vp.position.set(2.4, .8, -1.2); sHos.add(vp);
const gur = new THREE.Group(); gur.add(at(box(.9, .12, 2.2, M.white), V(0, .85, 0)));
gur.add(at(box(.8, .1, 2, new THREE.MeshStandardMaterial({ color: '#9fd6cf' })), V(0, .95, 0)));
[[-.4, -1], [.4, -1], [-.4, 1], [.4, 1]].forEach(([x, z]) => gur.add(at(box(.05, .8, .05, M.bezel), V(x, .4, z))));
gur.position.set(-1.8, 0, -1.5); gur.rotation.y = .3; sHos.add(gur);
sHos.add(pl('#f4fbff', 5, 16, V(0, 3, -2))); sHos.add(pl('#f4fbff', 4, 16, V(0, 3, -12)));
const hosBlue = pl('#2f7bff', 0, 8, V(0, 1.8, -3)); sHos.add(hosBlue);

// ---------- F: red de distribución ----------
const sNet = set('net', 800);
const gridT = ctex(1024, 1024, (g, w) => { g.fillStyle = '#02050b'; g.fillRect(0, 0, w, w); g.strokeStyle = 'rgba(60,120,255,.28)'; g.lineWidth = 2;
  for (let i = 0; i <= w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, w); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } });
gridT.t.wrapS = gridT.t.wrapT = THREE.RepeatWrapping; gridT.t.repeat.set(8, 8);
const ng = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ map: gridT.t, roughness: .3, metalness: .6, emissive: '#ffffff', emissiveMap: gridT.t, emissiveIntensity: .6 }));
ng.rotation.x = -Math.PI / 2; sNet.add(ng);
const server = new THREE.Group();
for (let i = 0; i < 6; i++) { const u = box(1.6, .5, 1.2, M.bezel); u.position.y = .3 + i * .55; server.add(u);
  for (let k = 0; k < 6; k++) { const led = box(.06, .06, .02, new THREE.MeshBasicMaterial({ color: k % 2 ? '#4fa3ff' : '#7dffa8', toneMapped: false })); led.position.set(-.6 + k * .12, .3 + i * .55, .61); server.add(led); } }
const halo = new THREE.Mesh(new THREE.RingGeometry(2, 2.15, 64), new THREE.MeshBasicMaterial({ color: '#4fa3ff', transparent: true, opacity: .8, toneMapped: false, side: THREE.DoubleSide }));
halo.rotation.x = -Math.PI / 2; halo.position.y = .02; server.add(halo); sNet.add(server);
sNet.add(pl('#4fa3ff', 20, 20, V(0, 6, 3)));
const nodes = [];
const nodeGeo = new THREE.BoxGeometry(.7, .45, .05);
for (let i = 0; i < 110; i++) {
  const a = rnd() * Math.PI * 2, r = 4 + Math.pow(rnd(), .7) * 38;
  const p = V(Math.cos(a) * r, 0, Math.sin(a) * r);
  const n = new THREE.Group(); n.position.copy(p);
  const scr = new THREE.Mesh(nodeGeo, M.desk); scr.position.y = .5; scr.lookAt(V(0, .5, 0).sub(p).multiplyScalar(-1).add(p)); scr.rotation.y += Math.PI; n.add(scr);
  const st = box(.05, .3, .05, M.bezel); st.position.y = .15; n.add(st);
  const mid = p.clone().multiplyScalar(.5); mid.y = 2 + r * .18;
  const curve = new THREE.QuadraticBezierCurve3(V(0, 3.4, 0), mid, V(p.x, .8, p.z));
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(30)), new THREE.LineBasicMaterial({ color: '#2f6fff', transparent: true, opacity: .0, toneMapped: false }));
  sNet.add(line);
  const pk = new THREE.Mesh(new THREE.SphereGeometry(.13, 10, 8), new THREE.MeshBasicMaterial({ color: '#9fd0ff', toneMapped: false })); pk.visible = false; sNet.add(pk);
  const fx = new THREE.Mesh(new THREE.SphereGeometry(.15, 10, 8), new THREE.MeshBasicMaterial({ color: '#7dffa8', toneMapped: false })); fx.visible = false; sNet.add(fx);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.45, .55, 32), new THREE.MeshBasicMaterial({ color: '#ff4d4d', transparent: true, opacity: 0, toneMapped: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .03; n.add(ring);
  sNet.add(n); nodes.push({ n, scr, line, curve, pk, fx, ring, r, delay: r / 38 + rnd() * .15, recover: rnd() < .28 });
}

// ---------- G: archivo de contenido ----------
const sFile = set('file', 1000);
sFile.add(floor(80));
const fileT = ctex(600, 800, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f3f6fb'); gr.addColorStop(1, '#c9d3e6'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#b9c4d8'; g.beginPath(); g.moveTo(w - 150, 0); g.lineTo(w, 150); g.lineTo(w - 150, 150); g.fill();
  g.fillStyle = '#d33c3c'; g.fillRect(50, 200, 220, 70); g.fillStyle = '#fff'; g.font = '800 46px Inter'; g.fillText('.SYS', 80, 252);
  g.fillStyle = '#18233a'; g.font = '800 54px Inter'; g.fillText('C-00000291', 50, 360); g.font = '500 40px Inter'; g.fillText('*.sys', 50, 410);
  g.fillStyle = '#56627a'; g.font = '500 32px Inter'; g.fillText('Archivo de canal 291', 50, 480);
  g.fillStyle = '#c3cce0'; for (let i = 0; i < 6; i++) g.fillRect(50, 540 + i * 36, 300 + (i * 67) % 180, 16);
});
const fileCard = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2, .05), [M.white, M.white, M.white, M.white, new THREE.MeshBasicMaterial({ map: fileT.t, toneMapped: false }), M.white]);
fileCard.position.set(0, 1.6, 0); sFile.add(fileCard);
const shieldShape = new THREE.Shape(); shieldShape.moveTo(0, 1.3); shieldShape.quadraticCurveTo(.9, 1.1, 1.1, 1.0); shieldShape.lineTo(1.0, -.1);
shieldShape.quadraticCurveTo(.8, -1.0, 0, -1.4); shieldShape.quadraticCurveTo(-.8, -1.0, -1.0, -.1); shieldShape.lineTo(-1.1, 1.0); shieldShape.quadraticCurveTo(-.9, 1.1, 0, 1.3);
const shield = new THREE.Mesh(new THREE.ExtrudeGeometry(shieldShape, { depth: .25, bevelEnabled: true, bevelSize: .06, bevelThickness: .06, bevelSegments: 3 }),
  new THREE.MeshStandardMaterial({ color: '#c8102e', roughness: .3, metalness: .5, emissive: '#5a0010', emissiveIntensity: .6 }));
shield.position.set(0, 2.1, -2.6); sFile.add(shield);
const falconLbl = plane(3, .75, labelTex('FALCON', { size: 170 })); falconLbl.position.set(0, .3, -2.4); sFile.add(falconLbl);
const winPanel = new THREE.Group();
for (let i = 0; i < 4; i++) { const q = box(.7, .7, .08, new THREE.MeshStandardMaterial({ color: '#2f7bff', emissive: '#1d4fbf', emissiveIntensity: .8 })); q.position.set((i % 2) * .78 - .39, Math.floor(i / 2) * .78 - .39, 0); winPanel.add(q); }
winPanel.position.set(1.9, 2.2, -3.2); winPanel.rotation.y = -.5; sFile.add(winPanel);
const winLbl = plane(2.4, .55, labelTex('PCs WINDOWS', { size: 130 })); winLbl.position.set(1.9, 1.1, -3.1); winLbl.rotation.y = -.5; sFile.add(winLbl);
sFile.add(pl('#ff5a6e', 18, 12, V(-2, 4, 1))); sFile.add(pl('#4fa3ff', 18, 12, V(3, 3, 1)));
const fileGlow = pl('#ffffff', 1.5, 6, V(0, 1.6, 1.4)); sFile.add(fileGlow);

// ---------- H: memoria ----------
const sMem = set('mem', 1200);
sMem.add(floor(80));
const cells = [];
for (let i = 0; i < 21; i++) {
  const t = ctex(256, 256, (g, w) => { g.fillStyle = i < 20 ? '#0f3d7a' : 'rgba(0,0,0,0)'; g.fillRect(0, 0, w, w);
    g.strokeStyle = i < 20 ? '#7fc0ff' : '#ff5a5a'; g.lineWidth = 10; g.setLineDash(i < 20 ? [] : [26, 18]); g.strokeRect(8, 8, w - 16, w - 16);
    g.fillStyle = i < 20 ? '#e8f3ff' : '#ff8a8a'; g.font = '130px Anton'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(i < 20 ? String(i + 1) : '?', w / 2, w / 2 + 8); });
  const m = new THREE.Mesh(new THREE.BoxGeometry(.8, .8, .8), new THREE.MeshBasicMaterial({ map: t.t, transparent: i === 20, opacity: i === 20 ? .9 : 1, toneMapped: false }));
  m.position.set(i * 1.0 - 10, .6, 0); sMem.add(m); cells.push(m);
}
const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(20.2, 1.4, 1.4)), new THREE.LineBasicMaterial({ color: '#7fc0ff', toneMapped: false }));
frame.position.set(-.5, .6, 0); sMem.add(frame);
const scanner = new THREE.Mesh(new THREE.TorusGeometry(.75, .05, 12, 48), new THREE.MeshBasicMaterial({ color: '#ffe066', toneMapped: false })); scanner.rotation.y = Math.PI / 2; sMem.add(scanner);
const scanLight = pl('#ffe066', 8, 5, V(0, 1.5, 1)); sMem.add(scanLight);
const sparks = []; for (let i = 0; i < 60; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.05, 6, 4), new THREE.MeshBasicMaterial({ color: '#ff5a3a', toneMapped: false }));
  s.userData.v = V(rnd() - .5, rnd() * .9 + .2, rnd() - .5).normalize().multiplyScalar(2 + rnd() * 3); s.visible = false; sMem.add(s); sparks.push(s); }
const memRed = pl('#ff3030', 0, 10, V(10, 1.5, 1)); sMem.add(memRed);
sMem.add(pl('#4fa3ff', 10, 30, V(-4, 4, 4)));

// ---------- I: torre del sistema ----------
const sKer = set('ker', 1400);
sKer.add(floor(80));
const slabs = [];
[['APLICACIONES', '#2d3b55'], ['WINDOWS', '#1f4f9a'], ['NÚCLEO · KERNEL', '#3a1830']].forEach(([txt, col], i) => {
  const g = new THREE.Group();
  const s = new THREE.Mesh(new THREE.BoxGeometry(4.2, .9, 2.4), new THREE.MeshStandardMaterial({ color: col, roughness: .25, metalness: .4, transparent: i === 2, opacity: i === 2 ? .55 : 1 }));
  g.add(s); const lb = plane(3.8, .55, labelTex(txt, { size: 120 })); lb.position.z = 1.21; g.add(lb);
  g.position.y = .5 + (2 - i) * 1.05; g.userData.base = g.position.clone(); sKer.add(g); slabs.push(g);
});
const core = new THREE.Mesh(new THREE.IcosahedronGeometry(.32, 1), new THREE.MeshBasicMaterial({ color: '#ff3b3b', toneMapped: false })); core.position.set(0, .5, 0); sKer.add(core);
const coreLbl = plane(1.6, .4, labelTex('FALCON', { size: 160 })); coreLbl.position.set(1.1, .5, 1.25); sKer.add(coreLbl);
const kerScreen = new THREE.Mesh(new THREE.PlaneGeometry(9, 5.6), M.desk); kerScreen.position.set(0, 3.2, -4); sKer.add(kerScreen);
const kerRed = pl('#ff3030', 6, 8, V(0, .6, 1.5)); sKer.add(kerRed); sKer.add(pl('#9fc2ff', 12, 20, V(-3, 5, 4)));

// ---------- J: reloj ----------
const sClk = set('clk', 1600);
sClk.add(floor(80));
const face = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, .25, 64), new THREE.MeshStandardMaterial({ color: '#0e1420', roughness: .3, metalness: .7 }));
face.rotation.x = Math.PI / 2; face.position.set(0, 2.6, 0); sClk.add(face);
const rim = new THREE.Mesh(new THREE.TorusGeometry(2.02, .08, 16, 96), new THREE.MeshBasicMaterial({ color: '#4fa3ff', toneMapped: false })); rim.position.set(0, 2.6, .05); sClk.add(rim);
for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; const tk = box(i % 5 ? .03 : .07, i % 5 ? .15 : .3, .02, new THREE.MeshBasicMaterial({ color: '#cfe0ff', toneMapped: false }));
  tk.position.set(Math.sin(a) * 1.75, 2.6 + Math.cos(a) * 1.75, .14); tk.rotation.z = -a; sClk.add(tk); }
const arcMesh = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.55, 96, 1, 0, .01), new THREE.MeshBasicMaterial({ color: '#ff8a3d', transparent: true, opacity: .85, toneMapped: false }));
arcMesh.position.set(0, 2.6, .135); sClk.add(arcMesh);
const hHand = box(.09, 1.0, .03, new THREE.MeshBasicMaterial({ color: '#fff', toneMapped: false })); hHand.geometry.translate(0, .5, 0);
const mHand = box(.06, 1.55, .03, new THREE.MeshBasicMaterial({ color: '#ffd34d', toneMapped: false })); mHand.geometry.translate(0, .77, 0);
hHand.position.set(0, 2.6, .17); mHand.position.set(0, 2.6, .19); sClk.add(hHand, mHand);
sClk.add(pl('#4fa3ff', 14, 12, V(2, 4, 3)));

// ---------- K: reparación manual ----------
const sFix = set('fix', 1800);
sFix.add(floor(80, new THREE.MeshStandardMaterial({ color: '#2a2f38', roughness: .5 })));
const fixMons = [];
for (let i = 0; i < 16; i++) { const d = box(1.9, .05, 1, M.white); d.position.set(i * 2.2, .75, 0); sFix.add(d);
  const m = monitor(.6); m.position.set(i * 2.2, 1.38, -.15); sFix.add(m); fixMons.push(m); sFix.add(at(blob(2.6, 1.5), V(i * 2.2, .006, 0))); }
const keyG = new THREE.Group(); const kMat = new THREE.MeshStandardMaterial({ color: '#ffcc33', metalness: .9, roughness: .25, emissive: '#5a3c00', emissiveIntensity: .5 });
const kr = new THREE.Mesh(new THREE.TorusGeometry(.28, .09, 12, 32), kMat); keyG.add(kr);
const ks = box(.75, .1, .08, kMat); ks.position.x = .62; keyG.add(ks);
[.75, .9].forEach(x => { const t = box(.07, .18, .08, kMat); t.position.set(x, -.12, 0); keyG.add(t); });
keyG.position.set(.9, 2.3, .6); sFix.add(keyG);
for (let i = 0; i < 6; i++) sFix.add(pl('#eef4ff', 8, 8, V(i * 6, 3, 1.5)));

// ---------- L: partículas 8,5 M ----------
const sNum = set('num', 2000);
let numPts = [[0,0]]; const mkPts = (() => { const c = document.createElement('canvas'); c.width = 800; c.height = 300; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.font = '260px Anton'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('≈8,5 M', 400, 160);
  const d = g.getImageData(0, 0, 800, 300).data; const pts = [];
  for (let y = 0; y < 300; y += 3) for (let x = 0; x < 800; x += 3) if (d[(y * 800 + x) * 4 + 3] > 128) pts.push([x, y]); return pts; });
const N = 9000; const pGeo = new THREE.BufferGeometry(); const pPos = new Float32Array(N * 3); const pT = new Float32Array(N * 3), pS = new Float32Array(N * 3);
function samplePts() { numPts = mkPts(); for (let i = 0; i < N; i++) { const [x, y] = numPts[Math.floor(i * numPts.length / N)]; pT.set([(x - 400) / 210, (150 - y) / 210 + 2.6, 0], i * 3);
  const a = rnd() * 6.28, b = rnd() * 3.14, r = 6 + rnd() * 12; pS.set([Math.cos(a) * Math.sin(b) * r, Math.cos(b) * r + 2, Math.sin(a) * Math.sin(b) * r - 4], i * 3); } }
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const dotT = ctex(64, 64, (g, w) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.4, 'rgba(120,180,255,.8)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: .07, map: dotT.t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#9fd0ff', toneMapped: false }));
sNum.add(pts);
const miniMons = []; for (let i = 0; i < 60; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(.64, .4), M.bsod); m.position.set((rnd() - .5) * 26, rnd() * 9 - 1, -6 - rnd() * 14); m.userData.sp = rnd(); sNum.add(m); miniMons.push(m); }

// ---------- M: cierre ----------
const sEnd = set('end', 2200);
sEnd.add(floor(80));
const endCard = fileCard.clone(); endCard.position.set(0, 1.7, 0); sEnd.add(endCard);
const endWall = []; for (let r = 0; r < 12; r++) for (let c = -10; c <= 10; c++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(.9, .56), M.bsod); m.position.set(c * 1.0, .3 + r * .64, -6 - Math.abs(c) * .12); sEnd.add(m); endWall.push(m); }
sEnd.add(pl('#ffffff', 1.5, 6, V(0, 1.7, 1.6))); const endBlue = pl('#2f7bff', 12, 30, V(0, 4, -3)); sEnd.add(endBlue);

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
const setScr = (m, mat) => { m.userData.scr.material = mat; };

function shots(t) {
  const s = S; const fx = { glitch: 0, flash: 0, blue: 0 };
  camera.fov = 40; let shake = 0;
  // HOOK 0–5 s: actualización → pantalla azul → muro → aeropuerto → oficina
  if (t < 3.0) {
    useSet('wall');
    const p = clamp(t / 1.35);
    T.upd.draw(Math.min(.87, ease(p) * .87));
    setScr(hero, t < 1.35 ? M.upd : M.bsod);
    wallMons.forEach(m => setScr(m, t > 1.35 + m.userData.d * .09 ? M.bsod : M.desk));
    wallBlue.intensity = clamp((t - 1.4) / 1.2) * 40;
    const k = ease((t - 1.45) / 1.55);
    const near = V(0, 1.25, 4.1 - t * .5), far = V(0, 4.2, 12.5);
    look(vl(near, far, k), vl(V(0, 1.25, 0), V(0, 3.6, -6), k), 'wall');
    camera.fov = lerp(36, 52, k);
    fx.glitch = clamp(1 - Math.abs(t - 1.42) / .18); fx.flash = clamp(1 - Math.abs(t - 1.36) / .08) * .8;
  } else if (t < 4.0) {
    useSet('air'); boardT.draw(1);
    airMons.forEach((m, i) => setScr(m, M.bsod)); boardScr.material.map = t > 3.45 ? T.bsod.t : boardT.t;
    const k = (t - 3.0); look(V(7 - k * 2.2, 2.4 + k * .4, 7 - k * .8), V(-1, 3.2, -4), 'air'); camera.fov = 48;
    fx.glitch = clamp(1 - Math.abs(t - 3.45) / .12) * .8; fx.flash = clamp(1 - (t - 3.0) / .12) * .6;
  } else if (t < 5.0) {
    useSet('off'); offMons.forEach(m => setScr(m, M.bsod)); offBlue.intensity = 25;
    const k = t - 4.0; look(V(-6 + k * 3, 1.9, 3.5 - k), V(1, 1.1, -6), 'off'); camera.fov = 50;
    fx.flash = clamp(1 - (t - 4.0) / .12) * .6;
  } else if (t < s.archivo) {
    // RED: la actualización se propaga en cuestión de horas (comprimido)
    useSet('net'); const lt = t - 5.0, D = s.archivo - 5.0;
    const prog = clamp((lt - .2) / 3.4);
    nodes.forEach(nd => { const a = clamp((prog - nd.delay * .8) / .25); nd.line.material.opacity = a > 0 ? .55 : 0;
      nd.pk.visible = a > 0 && a < 1; if (nd.pk.visible) nd.pk.position.copy(nd.curve.getPoint(a));
      nd.scr.material = a >= 1 ? M.bsod : M.desk; nd.ring.material.opacity = 0; nd.fx.visible = false; });
    halo.scale.setScalar(1 + (lt * .8 % 1) * .6); halo.material.opacity = 1 - (lt * .8 % 1);
    const k = ease(lt / D);
    const ang = -.6 + k * 1.4, R = lerp(16, 34, k);
    look(V(Math.sin(ang) * R, lerp(9, 24, k), Math.cos(ang) * R), V(0, 0, -2), 'net'); camera.fov = 50;
    fx.flash = clamp(1 - lt / .12) * .6;
  } else if (t < s.memoria) {
    // ARCHIVO
    useSet('file'); const lt = t - s.archivo, D = s.memoria - s.archivo;
    fileCard.rotation.y = Math.sin(lt * 1.3) * .35; fileCard.position.y = 1.6 + Math.sin(lt * 2) * .05;
    shield.rotation.y = Math.sin(lt * .8) * .3; winPanel.rotation.y = -.5 + Math.sin(lt) * .1;
    const k = ease(lt / D);
    look(vl(V(-1.4, 1.9, 6.2), V(1.4, 2.3, 7.6), k), V(.6, 1.6, -1.4), 'file');
    fx.flash = clamp(1 - lt / .12) * .6;
  } else if (t < s.nucleo) {
    // MEMORIA: lectura fuera de límites
    useSet('mem'); const lt = t - s.memoria, D = s.nucleo - s.memoria;
    const hit = D * .62; const sx = lerp(-10, 10, clamp(lt / hit));
    scanner.position.set(sx, .6, 0); scanLight.position.set(sx, 1.5, 1);
    const after = lt - hit; memRed.intensity = after > 0 ? 30 * Math.exp(-after * 1.2) + 8 : 0;
    scanner.material.color.set(after > 0 ? '#ff4040' : '#ffe066');
    cells[20].rotation.y = after > 0 ? after * 2 : 0; cells[20].scale.setScalar(after > 0 ? 1 + Math.sin(after * 30) * .08 : 1);
    sparks.forEach(sp => { sp.visible = after > 0 && after < 1.4; if (sp.visible) sp.position.set(10 + sp.userData.v.x * after, .6 + sp.userData.v.y * after - 4.9 * after * after * .3, sp.userData.v.z * after); });
    look(V(sx - 2.5, 1.9, 4.2), V(sx + 1.5, .6, 0), 'mem'); camera.fov = 44;
    shake = after > 0 ? Math.exp(-after * 3) * .08 : 0;
    fx.glitch = after > 0 ? Math.exp(-after * 4) : 0; fx.flash = clamp(1 - lt / .12) * .6;
  } else if (t < s.impacto) {
    // NÚCLEO: el fallo tumba el sistema
    useSet('ker'); const lt = t - s.nucleo, D = s.impacto - s.nucleo;
    const brk = D * .55, after = lt - brk;
    core.scale.setScalar(1 + Math.sin(lt * 10) * .1 + (after > 0 ? .4 : 0)); kerRed.intensity = 6 + (after > 0 ? 30 : Math.sin(lt * 6) * 3 + 3);
    slabs.forEach((sl, i) => { const b = sl.userData.base; if (after > 0) { const a = after * (1.2 + i * .3);
      sl.position.set(b.x + (i - 1) * a * .8, Math.max(.45, b.y - a * a * 1.2 * (i === 2 ? .1 : 1)), b.z + a * .3 * (i - 1)); sl.rotation.set(a * .25 * (i - 1), 0, a * .35 * (1 - i)); }
      else { sl.position.copy(b).add(V(Math.sin(lt * 40 + i) * .01 * lt, 0, 0)); sl.rotation.set(0, 0, 0); } });
    kerScreen.material = after > .25 ? M.bsod : M.desk;
    const k = ease(lt / D); look(vl(V(3.6, 3.6, 10.5), V(-1.2, 2.6, 12), k), V(0, 1.8, 0), 'ker'); camera.fov = 46;
    shake = after > 0 ? Math.exp(-after * 2.5) * .12 : 0;
    fx.glitch = after > 0 ? Math.exp(-after * 3) * .9 : 0; fx.flash = clamp(1 - lt / .12) * .6;
  } else if (t < s.retirada) {
    // IMPACTO: aeropuerto, hospital, oficina (otros encuadres)
    const lt = t - s.impacto, D = s.retirada - s.impacto, a = D * s.fa, b = D * s.fb;
    if (lt < a) { useSet('air'); boardT.draw(1); boardScr.material.map = boardT.t; airMons.forEach(m => setScr(m, M.bsod));
      const k = ease(lt / a); look(vl(V(-9, 1.4, 3), V(-6.5, 1.8, -1), k), V(-3, 5, -6), 'air'); camera.fov = 50; }
    else if (lt < b) { useSet('hos'); hosMons.forEach(m => setScr(m, M.bsod)); hosBlue.intensity = 14;
      const k = ease((lt - a) / (b - a)); look(vl(V(.6, 1.7, 5), V(-.4, 1.6, 2.4), k), V(0, 1.9, -5), 'hos'); camera.fov = 50; }
    else { useSet('off'); offMons.forEach((m, i) => setScr(m, M.bsod)); offBlue.intensity = 25;
      const k = ease((lt - b) / (D - b)); look(vl(V(0, 5.5, 4), V(0, 3.2, -1), k), V(0, .6, -12), 'off'); camera.fov = 52; }
    fx.flash = Math.max(clamp(1 - lt / .12), clamp(1 - Math.abs(lt - a) / .1), clamp(1 - Math.abs(lt - b) / .1)) * .6;
  } else if (t < s.manual) {
    const lt = t - s.retirada, D = s.manual - s.retirada, c = D * .42;
    if (lt < c) { // RELOJ 04:09 → 05:27
      useSet('clk'); const k = ease(clamp((lt - .2) / (c - .6)));
      const mins = 4 * 60 + 9 + k * 78; const h = mins / 60, m = mins % 60;
      hHand.rotation.z = -(h % 12) / 12 * Math.PI * 2; mHand.rotation.z = -m / 60 * Math.PI * 2;
      const a0 = (9 / 60) * Math.PI * 2; arcMesh.geometry.dispose();
      arcMesh.geometry = new THREE.RingGeometry(1.2, 1.55, 96, 1, Math.PI / 2 - a0 - k * (78 / 60) * Math.PI * 2, Math.max(.01, k * (78 / 60) * Math.PI * 2));
      look(V(Math.sin(lt * .3) * 1.5, 2.6, 9.5 - lt * .35), V(0, 1.9, 0), 'clk'); camera.fov = 42;
      S._clk = mins;
    } else { // RED: la corrección no llega a los equipos bloqueados
      useSet('net'); const l2 = lt - c, D2 = D - c;
      const prog = clamp(l2 / (D2 * .7));
      nodes.forEach(nd => { const a = clamp((prog - nd.delay * .7) / .3); nd.pk.visible = false; nd.line.material.opacity = .25;
        nd.fx.visible = a > 0 && a < 1; if (nd.fx.visible) nd.fx.position.copy(nd.curve.getPoint(a));
        const arrived = a >= 1; nd.scr.material = arrived && nd.recover ? M.desk : M.bsod;
        nd.ring.material.opacity = arrived && !nd.recover ? .5 + .5 * Math.sin(t * 8 + nd.r) : 0; });
      halo.material.color.set('#7dffa8');
      const k = ease(l2 / D2); look(V(-14 + k * 6, 11 - k * 3, 18 - k * 4), V(0, 0, -4), 'net'); camera.fov = 50;
    }
    fx.flash = Math.max(clamp(1 - lt / .12), clamp(1 - Math.abs(lt - c) / .1)) * .6;
  } else if (t < s.cifra) {
    // MANUAL: modo seguro, uno a uno
    useSet('fix'); const lt = t - s.manual, D = s.cifra - s.manual, c = D * .45;
    if (lt < c) { T.safe.draw(clamp(lt / (c * .85))); fixMons.forEach((m, i) => setScr(m, i === 0 ? M.safe : M.bsod));
      look(V(.05, 1.4, 2.9 - lt * .12), V(0, 1.38, -.15), 'fix'); camera.fov = 40; keyG.visible = false; }
    else { const l2 = lt - c, D2 = D - c; const k = ease(l2 / D2);
      fixMons.forEach((m, i) => setScr(m, l2 > i * .32 + .2 ? M.desk : (i === Math.floor((l2 - .2) / .32) + 1 ? M.safe : M.bsod)));
      keyG.visible = true; keyG.position.set(lerp(1, 12, k), 2.3 + Math.sin(l2 * 3) * .1, .6); keyG.rotation.set(.3, l2 * 2, 0);
      look(V(lerp(-2.5, 9, k), 2.4, 4.6), V(lerp(2, 14, k), 1.3, -.3), 'fix'); camera.fov = 48; }
    fx.flash = Math.max(clamp(1 - lt / .12), clamp(1 - Math.abs(lt - c) / .1)) * .6;
  } else if (t < s.cierre) {
    // CIFRA: estimación de Microsoft
    useSet('num'); const lt = t - s.cifra, D = s.cierre - s.cifra; const k = ease(clamp(lt / 1.6));
    for (let i = 0; i < N; i++) { const kk = ease(clamp(k * 1.25 - (i % 97) / 97 * .25)); pPos[i * 3] = lerp(pS[i * 3], pT[i * 3], kk);
      pPos[i * 3 + 1] = lerp(pS[i * 3 + 1], pT[i * 3 + 1], kk) + Math.sin(t * 2 + i) * .01; pPos[i * 3 + 2] = lerp(pS[i * 3 + 2], pT[i * 3 + 2], kk); }
    pGeo.attributes.position.needsUpdate = true;
    miniMons.forEach(m => { m.position.y += 0; m.rotation.y = Math.sin(t * .5 + m.userData.sp * 6) * .4; });
    look(V(Math.sin(lt * .25) * 2, 2.6, 8.5 - lt * .35), V(0, 2.4, 0), 'num'); camera.fov = 48;
    fx.flash = clamp(1 - lt / .12) * .6;
  } else {
    // CIERRE
    useSet('end'); const lt = t - s.cierre, D = TL.duration - s.cierre; const k = ease(lt / D);
    endCard.rotation.y = lt * .6; endWall.forEach((m, i) => { m.material = (i * 7) % 11 < 9 ? M.bsod : M.off; });
    endBlue.intensity = 30 * (1 - k * .7);
    look(V(0, 1.9, lerp(5.5, 11, k)), V(0, 2.4, 0), 'end'); camera.fov = 46;
    fx.flash = clamp(1 - lt / .12) * .6;
  }
  if (shake) camera.position.add(V(Math.sin(t * 90) * shake, Math.cos(t * 77) * shake, 0));
  camera.updateProjectionMatrix();
  return fx;
}
function overlays(t) {
  const s = S;
  tag('TODO EMPEZÓ CON UNA ACTUALIZACIÓN', .25, 4.9, t, { y: 290, size: 66 });
  tag('19 JUL 2024 · 04:09 UTC', s.fecha - .1, s.fecha + 2.0, t, { y: 290 });
  tag('NO FUE UN CIBERATAQUE', s.fecha + 1.3, s.archivo - .05, t, { y: 430, accent: '#7dffa8', sub: 'Fue un fallo en una actualización' });
  tag('CROWDSTRIKE FALCON', s.archivo + .2, s.memoria - .1, t, { y: 290, accent: '#ff4d5e', sub: 'Archivo de contenido para Windows' });
  tag('LECTURA FUERA DE LÍMITES', s.memoria + .2, s.nucleo - .1, t, { y: 290, accent: '#ff4d4d', sub: 'Esperaba 21 datos: solo había 20' });
  tag('NÚCLEO DEL SISTEMA', s.nucleo + .2, s.impacto - .1, t, { y: 290, accent: '#ff4d4d', sub: 'Un fallo aquí bloquea todo Windows' });
  const D = s.retirada - s.impacto;
  tag('VUELOS DETENIDOS', s.impacto + .15, s.impacto + D * s.fa - .05, t, { y: 290, accent: '#ffb84d', sub: 'Varias aerolíneas' });
  tag('OPERACIONES APLAZADAS', s.impacto + D * s.fa + .1, s.impacto + D * s.fb - .05, t, { y: 290, accent: '#2aa198', sub: 'En algunos hospitales' });
  tag('EMPRESAS PARADAS', s.impacto + D * s.fb + .1, s.retirada - .05, t, { y: 290, accent: '#4fa3ff', sub: 'Bancos, medios, comercios…' });
  if (t >= s.retirada && t < s.retirada + (s.manual - s.retirada) * .42) {
    const m = Math.round(S._clk || 249); const hh = String(Math.floor(m / 60)).padStart(2, '0'), mm = String(m % 60).padStart(2, '0');
    tag(`${hh}:${mm} UTC`, s.retirada + .05, s.retirada + (s.manual - s.retirada) * .42, t, { y: 290, size: 90, accent: '#ff8a3d', sub: `${Math.round(m - 249)} min desde el envío` });
  }
  tag('LA CORRECCIÓN NO LLEGA', s.retirada + (s.manual - s.retirada) * .42 + .1, s.manual - .05, t, { y: 290, accent: '#7dffa8', sub: 'Muchos equipos no lograban arrancar' });
  tag('MODO SEGURO · EQUIPO A EQUIPO', s.manual + .15, s.cifra - .05, t, { y: 290, accent: '#ffcc33', sub: 'A veces con clave de recuperación BitLocker' });
  tag('ESTIMACIÓN DE MICROSOFT', s.cifra + .3, s.cierre - .05, t, { y: 290, accent: '#4fa3ff', sub: '< 1 % de los equipos Windows' });
  if (t > s.cierre + .2) { const a = eout((t - s.cierre - .2) / .4);
    o2.save(); o2.globalAlpha = a; o2.textAlign = 'center'; o2.font = '120px Anton'; o2.fillStyle = '#fff'; o2.shadowColor = '#2f7bff'; o2.shadowBlur = 40;
    o2.fillText('BYTEOCULTO', W / 2, 330); o2.shadowBlur = 0; o2.font = '800 40px Inter'; o2.fillStyle = '#cfe0ff'; o2.fillText('Historias ocultas de la tecnología', W / 2, 395); o2.restore(); }
  o2.save(); o2.font = '800 26px Inter'; o2.fillStyle = 'rgba(255,255,255,.55)'; o2.textAlign = 'right'; o2.fillText('RECREACIÓN 3D', W - 40, 70); o2.restore();
}

window.setup = async (tl) => {
  TL = tl; for (const sg of TL.segments) S[sg.id] = sg.start;
  S.fecha = Math.max(S.fecha, 5.0 + 1.5); buildChunks();
  const wd = (seg, w) => TL.words.find(x => x.seg === seg && x.w.toLowerCase().startsWith(w)).start;
  const Di = S.retirada - S.impacto; S.fa = (wd('impacto', 'algunos') - .1 - S.impacto) / Di; S.fb = (wd('impacto', 'muchas') - .1 - S.impacto) / Di;
  await document.fonts.load('100px Anton'); await document.fonts.load('800 40px Inter'); await document.fonts.load('500 40px Inter');
  ALLTEX.forEach(o => o.draw()); boardT.draw(0); samplePts();
  for (const m of [...Object.values(SETS)]) m.traverse(o => { if (o.material && o.material.map && o.material.map.isCanvasTexture) o.material.map.needsUpdate = true; });
  return true;
};
window.renderFrame = (t, opts = {}) => {
  const fx = opts.thumb ? thumbShot() : shots(t);
  composer.render();
  o2.drawImage(renderer.domElement, 0, 0); vignette();
  o2.globalAlpha = .5; o2.drawImage(grain, -((t * 997) % 512), -((t * 613) % 512), W + 1024, H + 1024); o2.globalAlpha = 1;
  if (!opts.thumb) { glitch(fx.glitch); flash(fx.flash); overlays(t); subtitle(t); }
  else thumbText();
  return out.toDataURL('image/jpeg', .92);
};
function thumbShot() {
  useSet('air'); boardScr.material.map = T.bsod.t; airMons.forEach(m => setScr(m, M.bsod));
  scene.fog.density = .012; glass.material.opacity = .35; jet.position.set(3, 3.2, -26); look(V(1.5, 2.4, 8), V(0.5, 4.4, -14), 'air'); camera.fov = 58; camera.updateProjectionMatrix(); return {};
}
function thumbText() {
  o2.save(); o2.textAlign = 'center'; o2.lineJoin = 'round';
  o2.font = '170px Anton'; o2.lineWidth = 22; o2.strokeStyle = '#000';
  [['UNA', 1330], ['ACTUALIZACIÓN', 1510]].forEach(([s, y], i) => { let sz = 170; o2.font = `${sz}px Anton`; while (o2.measureText(s).width > W - 80) { sz -= 5; o2.font = `${sz}px Anton`; }
    o2.strokeText(s, W / 2, y); o2.fillStyle = i ? '#ffd400' : '#fff'; o2.fillText(s, W / 2, y); });
  o2.font = '800 46px Inter'; o2.lineWidth = 10; o2.strokeText('…y millones de pantallas azules', W / 2, 1610); o2.fillStyle = '#fff'; o2.fillText('…y millones de pantallas azules', W / 2, 1610);
  o2.font = '800 26px Inter'; o2.fillStyle = 'rgba(255,255,255,.6)'; o2.textAlign = 'right'; o2.fillText('RECREACIÓN 3D', W - 40, 70);
  o2.restore();
}
window.READY = true;
