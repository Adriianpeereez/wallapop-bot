"""Genera la narración completa en UNA solicitud a ElevenLabs (con marcas de tiempo).
Lee la clave de la variable de entorno ELEVENLABS_API_KEY (nunca se guarda).
Salida: assets/voz.mp3 y build/alignment.json"""
import base64, json, os, sys, urllib.request
key = os.environ.get('ELEVENLABS_API_KEY') or os.environ.get('XI_API_KEY')
if not key:
    sys.exit('Falta ELEVENLABS_API_KEY en el entorno.')
g = json.load(open('guion.json', encoding='utf-8'))
text = ' '.join(s['text'] for s in g['segments'])
body = json.dumps({'text': text, 'model_id': 'eleven_multilingual_v2',
                   'voice_settings': {'stability': 0.45, 'similarity_boost': 0.8, 'style': 0.35, 'speed': 1.08}}).encode()
req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{g['voice_id']}/with-timestamps",
                             data=body, headers={'xi-api-key': key, 'Content-Type': 'application/json'})
r = json.load(urllib.request.urlopen(req, timeout=180))
open('assets/voz.mp3', 'wb').write(base64.b64decode(r['audio_base64']))
json.dump(r.get('alignment'), open('build/alignment.json', 'w'))
print('OK: assets/voz.mp3')
