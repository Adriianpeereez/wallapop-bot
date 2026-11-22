"""Genera build/timeline.json (tiempos de segmentos y palabras).
Si existe build/alignment.json (ElevenLabs /with-timestamps) usa tiempos reales;
si no, estima con un ritmo de locución tipo TikTok."""
import json, os, re
G = json.load(open('guion.json', encoding='utf-8'))
CPS, GAP, LEAD = 17.0, 0.28, 0.15  # caracteres/seg, pausa entre frases, inicio
full = ' '.join(s['text'] for s in G['segments'])
al = None
if os.path.exists('build/alignment.json'):
    a = json.load(open('build/alignment.json'))
    a = a.get('normalized_alignment') or a.get('alignment') or a
    if ''.join(a['characters']) == full:
        al = a
segs, words, pos, t = [], [], 0, LEAD
for s in G['segments']:
    txt = s['text']
    for m in re.finditer(r'\S+', txt):
        i0, i1 = pos + m.start(), pos + m.end() - 1
        if al:
            ws, we = LEAD + al['character_start_times_seconds'][i0], LEAD + al['character_end_times_seconds'][i1]
        else:
            ws, we = t + m.start() / CPS, t + (m.end()) / CPS
        words.append({'w': m.group(), 'start': round(ws, 3), 'end': round(we, 3), 'seg': s['id']})
    sw = [w for w in words if w['seg'] == s['id']]
    segs.append({'id': s['id'], 'text': txt, 'start': sw[0]['start'], 'end': sw[-1]['end']})
    t = sw[-1]['end'] + GAP
    pos += len(txt) + 1
dur = round(segs[-1]['end'] + 1.6, 2)
json.dump({'source': 'elevenlabs' if al else 'estimado', 'duration': dur, 'segments': segs, 'words': words},
          open('build/timeline.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('timeline', 'elevenlabs' if al else 'estimado', dur, 's')
for s in segs: print(f"{s['id']:9s} {s['start']:6.2f} {s['end']:6.2f}")
