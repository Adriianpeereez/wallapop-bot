#!/usr/bin/env bash
# Pipeline completo: [voz] -> tiempos -> audio -> render 3D -> MP4 final
set -euo pipefail
cd "$(dirname "$0")"
[ -f assets/voz.mp3 ] || python3 voz_elevenlabs.py || echo "AVISO: sin voz; se renderiza solo con música y efectos."
python3 timeline.py
python3 audio.py
rm -rf build/frames  # los tiempos pueden haber cambiado
node render.js
ffmpeg -y -loglevel error -i build/video.mp4 -i build/mezcla.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart ../strava-mapa-instalaciones.mp4
echo "Listo: ../strava-mapa-instalaciones.mp4"
