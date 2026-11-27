"""Música de fondo y efectos sintetizados localmente (sin muestras externas) + mezcla con la voz.
Uso: python3 musica_sfx.py  -> musica.wav, sfx.wav, mezcla.wav"""
import json, numpy as np, soundfile as sf
SR, DUR = 48000, 42.4
N = int(SR * DUR); rng = np.random.default_rng(3)
t = np.arange(N) / SR
def env(n, a, r):
    e = np.ones(n); A = int(a * SR); R = int(r * SR)
    if A: e[:A] = np.linspace(0, 1, A)
    if R: e[-R:] *= np.linspace(1, 0, R)
    return e
def lp(x, k):  # filtro paso bajo de un polo
    y = np.empty_like(x); s = 0.0
    for i, v in enumerate(x): s += k * (v - s); y[i] = s
    return y
def place(buf, x, at, g=1.0):
    i = int(at * SR); j = min(len(buf), i + len(x))
    if j > i: buf[i:j] += x[:j - i] * g
f = lambda m: 440 * 2 ** ((m - 69) / 12)

# ---- música: La menor, 100 BPM, Am–F–C–G ----
mus = np.zeros(N); beat = 60 / 100; bar = beat * 4
chords = [[57, 60, 64], [53, 57, 60], [48, 55, 60], [55, 59, 62]]
k = 0; at = 0.0
while at < DUR:
    ch = chords[k % 4]; n = int(bar * SR) + int(.4 * SR); tt = np.arange(n) / SR
    pad = sum(np.sin(2 * np.pi * f(m + 12) * tt + d) * .5 + np.sin(2 * np.pi * f(m + 12) * 1.003 * tt) * .5 for m, d in zip(ch, (0, 1, 2)))
    place(mus, pad * env(n, .35, .45) * .05, at)
    place(mus, np.sin(2 * np.pi * f(ch[0] - 12) * tt) * env(n, .05, .4) * .09, at)
    for s in range(8):  # arpegio en corcheas
        m = ch[s % 3] + (24 if s % 4 == 3 else 12); nn = int(.45 * SR); ts = np.arange(nn) / SR
        pl = (np.sin(2 * np.pi * f(m) * ts) + .3 * np.sin(4 * np.pi * f(m) * ts)) * np.exp(-ts * 9)
        place(mus, pl * .035, at + s * beat / 2)
    for b in range(4):
        kn = int(.35 * SR); tk = np.arange(kn) / SR; fr = 45 + 75 * np.exp(-tk * 30)
        if b in (0, 2): place(mus, np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-tk * 9) * .16, at + b * beat)
        hn = int(.05 * SR); place(mus, np.diff(rng.standard_normal(hn + 1)) * np.exp(-np.arange(hn) / SR * 80) * .012, at + b * beat + beat / 2)
    k += 1; at += bar
mus = lp(mus, .35)
mus *= np.minimum(1, t / 1.0) * np.minimum(1, (DUR - t) / 1.2)

# ---- efectos ----
fx = np.zeros(N)
def whoosh(d=.55, up=True):
    n = int(d * SR); x = rng.standard_normal(n); out = np.empty(n); s = 0.0
    for i in range(n):
        p = i / n; c = .02 + .25 * (p if up else 1 - p) * (1 - p) * 4
        s += c * (x[i] - s); out[i] = s
    return out * np.sin(np.pi * np.arange(n) / n) ** 2 * 1.4
def tone(fr, d, dec=8, wave=np.sin, sweep=0):
    n = int(d * SR); ts = np.arange(n) / SR; ph = 2 * np.pi * np.cumsum(fr + sweep * ts / d) / SR
    return wave(ph) * np.exp(-ts * dec) * env(n, .004, .01)
sq = lambda p: np.tanh(4 * np.sin(p))
def mixd(*xs):
    L = max(len(x) for x in xs); return sum(np.pad(x, (0, L - len(x))) for x in xs)
pop = lambda: tone(500, .12, 25, sweep=700)
click = lambda: np.concatenate([rng.standard_normal(int(.006 * SR)) * .5, tone(2400, .05, 60)])
chime = lambda: mixd(tone(f(88), .9, 4), .7 * np.concatenate([np.zeros(int(.09 * SR)), tone(f(95), .8, 4)]))
blips = lambda: mixd(*[np.concatenate([np.zeros(int(i * .07 * SR)), tone(1200 + i * 300, .06, 30, sq) * .5]) for i in range(3)])
def addb(x, at, g): place(fx, x, at, g)
shimmer = lambda: sum(tone(rng.uniform(2000, 5000), 1.0, rng.uniform(3, 7)) * .25 for _ in range(10))
sizzle = lambda: np.diff(rng.standard_normal(int(.7 * SR) + 1)) * env(int(.7 * SR), .05, .3) * (rng.random(int(.7 * SR)) > .7) * .5
ice = lambda: sum(tone(f(m), .9, 3.5) * .35 for m in (96, 100, 103))
bonk = lambda: tone(230, .22, 10, lambda p: 2 / np.pi * np.arcsin(np.sin(p)), sweep=-90)
rise = lambda: tone(300, .45, 2, sweep=600) * .5
E = [(click(), .05, .25), (pop(), 5.45, .22), (whoosh(.45), 5.3, .3), (pop(), 5.62, .2), (whoosh(.5), 6.9, .35),
     (whoosh(.4), 8.6, .3), (whoosh(.4), 9.75, .3), (whoosh(.7), 11.5, .55), (rise(), 13.25, .35), (rise(), 13.95, .35),
     (pop(), 14.8, .25), (click(), 15.7, .35), (whoosh(.6, False), 15.75, .5), (blips(), 16.3, .3), (blips(), 17.4, .3),
     (chime(), 18.25, .3), (shimmer(), 19.4, .35), (whoosh(.5), 20.75, .55), (blips(), 21.15, .25), (bonk(), 21.75, .35),
     (whoosh(.5), 23.7, .5), (pop(), 25.3, .25), (tone(f(93), .6, 6), 25.45, .25), (whoosh(.5), 28.25, .5), (pop(), 28.85, .3),
     (chime(), 30.7, .22), (whoosh(.5), 32.35, .5), (sizzle(), 35.1, .35), (ice(), 35.95, .35), (tone(f(88), .7, 5), 36.8, .3),
     (whoosh(.5), 37.15, .5), (tone(f(76), .3, 8), 37.6, .3), (tone(f(79), .3, 8), 38.05, .3), (tone(f(83), .3, 8), 38.45, .3),
     (shimmer(), 39.2, .3), (pop(), 40.35, .35), (chime(), 40.4, .25)]
for x, at, g in E: addb(x, at, g)

# ---- mezcla: la música se atenúa mientras habla la voz ----
v, vsr = sf.read("voz.wav"); v = np.interp(np.arange(int(len(v) * SR / vsr)) / SR, np.arange(len(v)) / vsr, v)
v = np.pad(v, (0, max(0, N - len(v))))[:N]
ve = lp(np.abs(v), .0008); duck = 1 - .65 * np.clip(ve / (np.percentile(ve, 90) + 1e-9), 0, 1)
mix = v * 1.0 + mus * duck * .45 + fx * .42
mix = mix / np.max(np.abs(mix)) * .9
sf.write("musica.wav", mus, SR); sf.write("sfx.wav", fx, SR); sf.write("mezcla.wav", np.stack([mix, mix], 1), SR)
print("ok", round(len(mix) / SR, 2))
