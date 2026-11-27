// Render fotograma a fotograma con Chromium headless (WebGL por software).
// Uso: node render.cjs frames <desde> <hasta> <dir_salida> [escala]
//      node render.cjs shots <t1,t2,...> <dir_salida> [escala]
//      node render.cjs thumb <archivo.png>
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
const [mode, a, b, c, d] = process.argv.slice(2);
(async () => {
  await new Promise(r => srv.listen(0, r));
  const scale = mode === 'frames' ? (d || 1) : mode === 'shots' ? (c || 1) : 1;
  const br = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await br.newPage();
  pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[web]', m.text()); });
  pg.on('pageerror', e => { console.log('[pageerror]', e.message); process.exit(1); });
  await pg.goto(`http://localhost:${srv.address().port}/render/index.html?scale=${scale}`);
  await pg.waitForFunction(() => window.ready === true, null, { timeout: 120000 });
  const save = (file, url) => fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  if (mode === 'thumb') { save(a, await pg.evaluate(() => window.renderThumb())); }
  else if (mode === 'shots') { fs.mkdirSync(b, { recursive: true }); for (const t of a.split(',')) { const t0 = Date.now(); save(path.join(b, `t_${(+t).toFixed(2)}.jpg`), await pg.evaluate(x => window.renderFrame(x), +t)); console.log(t, Date.now() - t0, 'ms'); } }
  else { fs.mkdirSync(c, { recursive: true }); const fps = await pg.evaluate(() => window.FPS); const t0 = Date.now();
    for (let f = +a; f < +b; f++) { save(path.join(c, `f_${String(f).padStart(5, '0')}.jpg`), await pg.evaluate(x => window.renderFrame(x), f / fps)); if (f % 30 === 0) console.log('frame', f, ((Date.now() - t0) / (f - +a + 1)).toFixed(0), 'ms/f'); } }
  await br.close(); srv.close();
})();
