"""Fase 3 · Empaqueta occ_data.js (se carga solo al abrir el modo oclusión)."""
import pickle, json, gzip, base64, numpy as np
r = pickle.load(open('/home/claude/data/staff/p3.pkl', 'rb'))
ES = {'prox lad': 'DA proximal', 'mid lad': 'DA media', 'prox mid lad': 'DA proximal-media', 'prox rca': 'CD proximal', 'mid rca': 'CD media',
      'dist rca': 'CD distal', 'prox mid rca': 'CD proximal-media', 'prox circ': 'Cx proximal', 'mid circ': 'Cx media', 'dist circ': 'Cx distal'}
PRIOR = {'no': None, 'inferior': 'IAM previo inferior', 'anterior': 'IAM previo anterior', 'inferior+anterior': 'IAM previo inferior y anterior',
         'lateral': 'IAM previo lateral', 'posterior': 'IAM previo posterior', 'septal': 'IAM previo septal'}
def varint(vals):
    out = bytearray()
    for v in vals:
        z = ((v << 1) ^ (v >> 31)) & 0xFFFFFFFF
        while z >= 0x80: out.append((z & 0x7F) | 0x80); z >>= 7
        out.append(z)
    return out
blob = bytearray(); meta = []
for x in sorted(r, key=lambda x: x['pt']):
    w = x['wins']
    if w[0]['t'] >= 0 or len(w) < 2 or any(v['st'] is None for v in w): continue
    if np.abs(np.array(w[-1]['st']) - np.array(w[0]['st'])).max() < 0.1: continue
    if any(np.abs(v['sig']).max() > 8 or (v['sig'].reshape(10, 250, 8).std(axis=1) < 0.005).any() for v in w): continue
    keep = [w[0]] + [v for v in w[1:] if v['t'] == 60]          # basal, minuto 1 y final del inflado
    if w[-1]['t'] != 60: keep.append(w[-1])
    wins = []
    for v in keep:
        q = np.round(v['sig'].astype(float) / 0.005).astype(np.int64); d = np.diff(q, axis=0, prepend=0)
        off = len(blob)
        for k in range(8): blob += varint([int(z) for z in d[:, k]])
        wins.append(dict(t=int(v['t']), o=off, st=[round(s, 2) for s in v['st']]))
    meta.append(dict(id=x['pt'], art=x['art'], loc=ES.get(x['art_txt'].strip().lower(), x['art_txt']), age=(int(x['age']) if str(x['age']).isdigit() else None), sex=('M' if str(x['sex']).lower().startswith('m') else 'F'),
                     prior=PRIOR.get(str(x['prior']).strip().lower()), dur=int(x['dur']), wins=wins))
gz = gzip.compress(bytes(blob), 9); b64 = base64.b64encode(gz).decode()
from collections import Counter
print(len(meta), Counter(m['art'] for m in meta), 'ventanas', sum(len(m['wins']) for m in meta), 'b64', len(b64))
open('/home/claude/ecg-desnudo/occ_data.js', 'w').write('// Generado por tools/p3_pack.py: STAFF III (PhysioNet, ODC-By). 8 derivaciones, 250 Hz. No editar a mano.\nvar OCC_META = %s;\nvar OCC_BLOB = "%s";\n' % (json.dumps(meta, ensure_ascii=False, separators=(',', ':')), b64))
