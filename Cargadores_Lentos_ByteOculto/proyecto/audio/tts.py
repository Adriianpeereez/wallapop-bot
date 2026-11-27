"""Genera la narración con la voz local Piper es_ES 'davefx' (piper-tts). Uso: python3 tts.py"""
import json, os, numpy as np, soundfile as sf
from piper import PiperVoice, SynthesisConfig
HERE = os.path.dirname(os.path.abspath(__file__))
M = os.path.join(HERE, "..", "assets", "voz", "vits-piper-es_ES-davefx-medium")
SPEED, LEAD = 1.08, 0.30
voice = PiperVoice.load(f"{M}/es_ES-davefx-medium.onnx")
g = json.load(open(os.path.join(HERE, "..", "guion.json")))
sr = voice.config.sample_rate
syn = SynthesisConfig(length_scale=1/SPEED, noise_scale=0.6, noise_w_scale=0.8)
def trim(x, th=0.01):
    idx = np.where(np.abs(x) > th)[0]
    return x[max(0, idx[0] - int(0.02*sr)): idx[-1] + int(0.05*sr)]
out, t, info = [np.zeros(int(LEAD*sr), np.float32)], LEAD, []
for f in g["frases"]:
    x = np.concatenate([c.audio_float_array for c in voice.synthesize(f["tts"], syn_config=syn)])
    x = trim(x.astype(np.float32))
    d = len(x) / sr
    info.append({"id": f["id"], "start": round(t, 3), "end": round(t + d, 3)})
    out += [x, np.zeros(int(f["pausa"]*sr), np.float32)]
    t += d + int(f["pausa"]*sr)/sr
y = np.concatenate(out); y = y / np.max(np.abs(y)) * 0.89
sf.write(os.path.join(HERE, "voz.wav"), y, sr)
json.dump({"sr": sr, "duracion": round(len(y)/sr, 3), "frases": info}, open(os.path.join(HERE, "tiempos_frases.json"), "w"), indent=1, ensure_ascii=False)
print("duración", round(len(y)/sr, 2)); [print(i) for i in info]
