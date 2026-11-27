"""Alinea palabras de los subtítulos con la voz usando reconocimiento local (Parakeet TDT v3, sherpa-onnx).
Uso: python3 alinear.py /ruta/a/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8"""
import json, os, re, sys, unicodedata, difflib, numpy as np, soundfile as sf, sherpa_onnx
HERE = os.path.dirname(os.path.abspath(__file__)); M = sys.argv[1]
rec = sherpa_onnx.OfflineRecognizer.from_transducer(encoder=f"{M}/encoder.int8.onnx", decoder=f"{M}/decoder.int8.onnx",
    joiner=f"{M}/joiner.int8.onnx", tokens=f"{M}/tokens.txt", model_type="nemo_transducer", num_threads=4)
g = json.load(open(os.path.join(HERE, "..", "guion.json"))); T = json.load(open(os.path.join(HERE, "tiempos_frases.json")))
y, sr = sf.read(os.path.join(HERE, "voz.wav"))
def norm(w): return re.sub(r"[^a-z0-9ñ]", "", "".join(c for c in unicodedata.normalize("NFD", w.lower()) if unicodedata.category(c) != "Mn"))
def resample(x, a, b): return np.interp(np.arange(0, len(x) * b / a) * a / b, np.arange(len(x)), x).astype(np.float32)
out = []
for f, t in zip(g["frases"], T["frases"]):
    s0 = max(0, t["start"] - 0.05); seg = y[int(s0 * sr): int((t["end"] + 0.05) * sr)]
    st = rec.create_stream(); st.accept_waveform(16000, resample(seg, sr, 16000)); rec.decode_stream(st); r = st.result
    aw = []  # palabras ASR con tiempo de inicio
    for tok, ts in zip(r.tokens, r.timestamps):
        if tok.startswith("▁") or tok.startswith(" ") or not aw: aw.append([tok.strip("▁ "), s0 + ts])
        else: aw[-1][0] += tok
    print(f"[{f['id']}] ASR: {r.text}")
    tw = f["tts"].split(); xw = f["text"].split()
    # tiempo de cada palabra TTS (por coincidencia con ASR; el resto se interpola)
    tt = [None] * len(tw)
    sm = difflib.SequenceMatcher(None, [norm(w) for w in tw], [norm(w[0]) for w in aw], autojunk=False)
    for b in sm.get_matching_blocks():
        for k in range(b.size): tt[b.a + k] = aw[b.b + k][1]
    tt[0] = tt[0] if tt[0] is not None else t["start"]
    known = [i for i, v in enumerate(tt) if v is not None]; ends = known + [len(tw)]
    for i in range(len(tw)):
        if tt[i] is None:
            a = max(k for k in known if k < i); b = next((k for k in known if k > i), None)
            tb = tt[b] if b is not None else t["end"]; nb = b if b is not None else len(tw)
            tt[i] = tt[a] + (tb - tt[a]) * (i - a) / (nb - a)
    # palabras del subtítulo ↔ palabras TTS
    tx = [None] * len(xw); sm2 = difflib.SequenceMatcher(None, [norm(w) for w in xw], [norm(w) for w in tw], autojunk=False)
    for op, a1, a2, b1, b2 in sm2.get_opcodes():
        for k in range(a1, a2):
            j = b1 + (k - a1) * max(1, b2 - b1) // max(1, a2 - a1) if op != "equal" else b1 + (k - a1)
            tx[k] = tt[min(j, len(tw) - 1)]
    for k in range(1, len(tx)): tx[k] = max(tx[k], tx[k - 1] + 0.05)
    out.append({"id": f["id"], "start": t["start"], "end": t["end"], "palabras": [{"w": w, "t": round(v, 3)} for w, v in zip(xw, tx)]})
json.dump(out, open(os.path.join(HERE, "palabras.json"), "w"), indent=1, ensure_ascii=False)
