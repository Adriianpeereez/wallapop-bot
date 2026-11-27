"""Envolvente de la voz a 30 fps (para animar la boca de Byte)."""
import json, numpy as np, soundfile as sf
y, sr = sf.read("voz.wav"); hop = sr // 30
e = np.array([np.sqrt(np.mean(y[i:i + hop] ** 2)) for i in range(0, len(y), hop)])
e = np.clip(e / np.percentile(e, 95), 0, 1)
e = np.convolve(e, [0.25, 0.5, 0.25], mode="same")
json.dump([round(float(v), 3) for v in e], open("envolvente.json", "w"))
print(len(e))
