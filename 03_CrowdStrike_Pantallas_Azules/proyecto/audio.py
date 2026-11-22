"""Música y efectos generados por síntesis (originales, sin licencias de terceros) + mezcla con la voz.
Salida: build/mezcla.wav (y build/musica_fx.wav sin voz)."""
import json, os, subprocess, wave
import numpy as np
SR = 48000
TL = json.load(open('build/timeline.json', encoding='utf-8'))
S = {s['id']: s['start'] for s in TL['segments']}
DUR = TL['duration']; N = int(DUR * SR); t = np.arange(N) / SR
rng = np.random.default_rng(3)
def env(n, a, r): e = np.ones(n); a = int(a * SR); r = int(r * SR); e[:a] = np.linspace(0, 1, a) if a else 1; e[-r:] *= np.linspace(1, 0, r); return e
def add(buf, x, at, g=1.0):
    i = int(at * SR); j = min(N, i + len(x));
    if i < N and j > i: buf[i:j] += x[:j - i] * g
def lp(x, a):  # paso bajo de un polo (a escalar o por muestra)
    if np.ndim(a) == 0:
        from scipy.signal import lfilter
        return lfilter([a], [1, a - 1], x)
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += a[i] * (x[i] - acc); y[i] = acc
    return y
L = np.zeros(N); R = np.zeros(N)
# --- pad oscuro (Re menor, Si bemol, Fa, Do) ---
BPM = 100; beat = 60 / BPM; bar = beat * 4
chords = [[50, 53, 57], [46, 50, 53], [41, 45, 48], [48, 52, 55]]
f = lambda m: 440 * 2 ** ((m - 69) / 12)
pad = np.zeros(N)
for b in range(int(DUR / bar) + 1):
    seg = np.arange(int(bar * SR) + SR // 2) / SR
    tone = sum(np.sin(2 * np.pi * f(m) * seg + np.sin(2 * np.pi * .3 * seg)) + .5 * np.sin(2 * np.pi * f(m) * 1.003 * seg) for m in chords[b % 4])
    add(pad, tone * env(len(seg), .6, .8) / 6, b * bar)
pad *= .16
# --- bajo pulsante en corcheas (entra tras el gancho) ---
bass = np.zeros(N); roots = [38, 34, 29, 36]
for k in range(int(DUR / (beat / 2))):
    at = k * beat / 2; seg = np.arange(int(beat / 2 * SR)) / SR
    note = f(roots[int(at / bar) % 4]); x = np.sign(np.sin(2 * np.pi * note * seg)) * .5 + np.sin(2 * np.pi * note * seg)
    add(bass, x * np.exp(-seg * 9), at)
bass = lp(bass, .06) * .32
bass *= np.clip((t - 4.8) / 1.0, 0, 1) * np.clip((S['cierre'] + 1.0 - t) / 1.0, 0, 1)
# --- tic-tac de reloj (tensión) ---
tick = np.zeros(N)
for k in range(int(DUR / beat)):
    at = k * beat; n = int(.03 * SR); x = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 160)
    add(tick, np.diff(x, prepend=0), at, .5 if k % 2 else .8)
tick *= .18 * np.clip((t - 7) / 1, 0, 1)
tick *= np.where((t > S['retirada']) & (t < S['manual']), 2.2, 1)
# --- efectos ---
fx = np.zeros(N)
def boom(at, g=1.):
    n = int(1.6 * SR); s = np.arange(n) / SR; fr = 60 * np.exp(-s * 2) + 32
    x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-s * 2.6) + rng.standard_normal(n) * np.exp(-s * 18) * .3
    add(fx, x, at, .9 * g)
def whoosh(at, d=.45, g=1.):
    n = int(d * SR); x = rng.standard_normal(n); x = lp(x, .12) * np.sin(np.linspace(0, np.pi, n)) ** 2
    add(fx, x * 2.2, at - d * .6, .5 * g)
def glitchfx(at, d=.35, g=1.):
    n = int(d * SR); s = np.arange(n) / SR; x = np.sign(np.sin(2 * np.pi * 180 * s * (1 + 3 * (rng.random(n) > .97)))) * (rng.random(n) > .3)
    x = x * np.repeat(rng.random(n // 400 + 1) > .4, 400)[:n] + rng.standard_normal(n) * .4
    add(fx, x * np.exp(-s * 5), at, .35 * g)
def blip(at, fr=1200, g=1.):
    n = int(.12 * SR); s = np.arange(n) / SR; add(fx, np.sin(2 * np.pi * fr * s) * np.exp(-s * 40), at, .25 * g)
def riser(at, d):
    n = int(d * SR); s = np.arange(n) / SR; x = lp(rng.standard_normal(n), .05 + .25 * s / d) * (s / d) ** 2
    add(fx, x * 3 + np.sin(2 * np.pi * (200 + 600 * (s / d) ** 2) * s) * (s / d) ** 2 * .2, at, .4)
# progreso de la actualización
for k in range(8): blip(.1 + k * .16, 900 + k * 60, .6)
glitchfx(1.36, .4, 1.2); boom(1.36, 1.1)
whoosh(3.0); glitchfx(3.45, .25); whoosh(4.0); whoosh(5.0); boom(5.0, .6)
for k in range(30): blip(5.3 + k * .11, 600 + (k % 5) * 90, .25)   # paquetes por la red
riser(S['archivo'] - 1.6, 1.6); boom(S['archivo'], .8); whoosh(S['archivo'])
Dm = S['nucleo'] - S['memoria']
for k in range(20): blip(S['memoria'] + k * Dm * .62 / 20, 1500, .35)
boom(S['memoria'] + Dm * .62, 1.2); glitchfx(S['memoria'] + Dm * .62, .5, 1.4)
whoosh(S['nucleo']); Dn = S['impacto'] - S['nucleo']; boom(S['nucleo'] + Dn * .55, 1.4); glitchfx(S['nucleo'] + Dn * .55, .6, 1.2)
Di = S['retirada'] - S['impacto']
for a in (0, .36, .7): whoosh(S['impacto'] + Di * a); boom(S['impacto'] + Di * a, .5)
whoosh(S['retirada']); Dr = S['manual'] - S['retirada']; whoosh(S['retirada'] + Dr * .42); boom(S['retirada'] + Dr * .42, .5)
whoosh(S['manual']); Dk = S['cifra'] - S['manual']
for k in range(60): blip(S['manual'] + .1 + k * .045, 2200, .18) if k % 3 else None  # tecleo
whoosh(S['manual'] + Dk * .45)
for k in range(16): blip(S['manual'] + Dk * .45 + .2 + k * .32, 1800, .3)
riser(S['cifra'] - 1.2, 1.2); boom(S['cifra'], 1.0); whoosh(S['cierre']); boom(S['cierre'] + .2, 1.3)
mus = pad + bass + tick
mus *= np.clip(t / .3, 0, 1) * np.clip((DUR - t) / 1.2, 0, 1)
L = mus + fx * .9; R = mus + fx * .9
R = np.concatenate([np.zeros(240), R[:-240]])  # ligera anchura estéreo
# --- voz + ducking ---
mix_L, mix_R = L, R
voz = 'assets/voz.mp3'
if os.path.exists(voz):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', voz, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True).stdout
    v = np.frombuffer(raw, np.int16).astype(float) / 32768; v = np.pad(v, (int(.15 * SR), 0))[:N]; v = np.pad(v, (0, N - len(v)))
    e = lp(np.abs(v), .002); duck = 1 - .55 * np.clip(e / (e.max() * .25 + 1e-9), 0, 1)
    mix_L = L * duck + v * 1.0; mix_R = R * duck + v * 1.0
def write(fn, a, b):
    st = np.stack([a, b], 1); st = st / (np.abs(st).max() + 1e-9) * .89
    with wave.open(fn, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes())
os.makedirs('build', exist_ok=True)
write('build/musica_fx.wav', L, R); write('build/mezcla.wav', mix_L, mix_R)
print('audio OK', round(DUR, 2), 's', '(con voz)' if os.path.exists(voz) else '(sin voz)')
