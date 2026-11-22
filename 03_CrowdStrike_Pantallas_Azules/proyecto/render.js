// Renderiza scene.html fotograma a fotograma (Chromium headless + WebGL/SwiftShader) y codifica con ffmpeg.
// Uso: node render.js            -> build/video.mp4
//      node render.js stills 1 5 -> build/still_*.jpg en esos segundos
//      node render.js thumb      -> ../miniatura.jpg
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = __dirname, FPS = 30, WORKERS = 3;
const TL = JSON.parse(fs.readFileSync(path.join(ROOT, 'build/timeline.json'), 'utf8'));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });

async function page(browser) {
  const p = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.error('PAGE ERROR', e.message)); p.on('console', m => console.log('console:', m.text())); p.on('requestfailed', r => console.log('fail', r.url()));
  await p.goto(`http://127.0.0.1:${srv.address().port}/scene.html`);
  await p.waitForFunction(() => window.READY === true, null, { timeout: 40000 });
  await p.evaluate(tl => window.setup(tl), TL);
  return p;
}
const save = (f, d) => fs.writeFileSync(f, Buffer.from(d.split(',')[1], 'base64'));

(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const mode = process.argv[2];
  if (mode === 'stills' || mode === 'thumb') {
    const p = await page(browser);
    if (mode === 'thumb') save(path.join(ROOT, '../miniatura.jpg'), await p.evaluate(() => window.renderFrame(0, { thumb: true })));
    else for (const s of process.argv.slice(3)) save(path.join(ROOT, `build/still_${s}.jpg`), await p.evaluate(t => window.renderFrame(t), +s));
  } else {
    const dir = path.join(ROOT, 'build/frames'); fs.mkdirSync(dir, { recursive: true });
    const total = Math.ceil(TL.duration * FPS); let done = 0; const t0 = Date.now();
    await Promise.all([...Array(WORKERS)].map(async (_, w) => {
      const p = await page(browser);
      for (let f = w; f < total; f += WORKERS) {
        const out = path.join(dir, `f${String(f).padStart(5, '0')}.jpg`);
        if (!fs.existsSync(out)) save(out, await p.evaluate(t => window.renderFrame(t), f / FPS));
        if (++done % 60 === 0) console.log(`${done}/${total} fotogramas · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
      }
    }));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'f%05d.jpg'),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), path.join(ROOT, 'build/video.mp4')]);
    console.log('video.mp4 OK');
  }
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
