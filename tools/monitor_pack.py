"""Selección final (tras revisión visual de cada tira) y empaquetado de src/monitor_data.js."""
import pickle, gzip, base64, json, numpy as np, random
c = pickle.load(open('/home/claude/data/mon/cands.pkl', 'rb'))
key = lambda o: (o['db'], o['rec'], o['t0'])
# Descartadas en la revisión visual: artefacto, descarga, transición de ritmo, ritmo polimorfo o dudoso
BAD = {('cudb', 'cu13', 467.3), ('cudb', 'cu16', 333.8), ('cudb', 'cu16', 294.8), ('cudb', 'cu20', 349.2), ('cudb', 'cu21', 1.0),
       ('cudb', 'cu27', 452.6), ('cudb', 'cu33', 458.0), ('cudb', 'cu35', 484.6),
       ('vfdb', '419', 933.7), ('vfdb', '424', 1489.8), ('vfdb', '430', 451.2)}
TV_OK = {('vfdb', '420', 1509.2), ('vfdb', '420', 1483.2), ('vfdb', '420', 1595.7), ('vfdb', '421', 1375.8), ('vfdb', '425', 943.6),
         ('vfdb', '426', 1741.8), ('vfdb', '426', 1754.8), ('vfdb', '427', 987.5), ('vfdb', '428', 1950.3), ('vfdb', '428', 1924.3),
         ('vfdb', '430', 1713.1), ('vfdb', '430', 1739.1), ('vfdb', '605', 1661.8), ('vfdb', '607', 1634.8), ('vfdb', '607', 1608.8),
         ('vfdb', '611', 1808.2), ('vfdb', '611', 1782.2)}
ASIS_OK = {('vfdb', '424', 1371.5), ('vfdb', '427', 1937.0), ('vfdb', '430', 525.6), ('vfdb', '430', 1243.2)}
RIVA_OK = {('mitdb', '124', 312.0), ('mitdb', '207', 1718.3), ('mitdb', '207', 1640.3), ('mitdb', '207', 1692.3)}
random.seed(3)
sel = []
fv = [o for o in c if o['cat'] == 'fv' and key(o) not in BAD]
seen = {}
for o in fv:  # una por registro de cudb, hasta dos por registro de vfdb (FV de baja amplitud)
    k = (o['db'], o['rec']); lim = 2 if o['db'] == 'vfdb' else 1
    if seen.get(k, 0) < lim: sel.append(o); seen[k] = seen.get(k, 0) + 1
sel += [o for o in c if o['cat'] == 'flv' and key(o) not in BAD]
sel += [o for o in c if o['cat'] == 'tv' and key(o) in TV_OK]
sel += [o for o in c if o['cat'] == 'asis' and key(o) in ASIS_OK]
sel += [o for o in c if o['cat'] == 'riva' and key(o) in RIVA_OK]
sel += [o for o in c if o['cat'] == 'bigem']
sinus = [o for o in c if o['cat'] == 'sinusal']; random.shuffle(sinus); sel += sinus[:14]
CTX = {'fv': ['parada'], 'flv': ['parada'], 'tv': ['parada', 'inestable'], 'asis': ['parada'], 'riva': ['pulso'], 'bigem': ['pulso'], 'sinusal': ['parada', 'pulso']}
blob = bytearray(); meta = []
def varint(vals):
    out = bytearray()
    for v in vals:
        z = ((v << 1) ^ (v >> 31)) & 0xFFFFFFFF
        while z >= 0x80: out.append((z & 0x7F) | 0x80); z >>= 7
        out.append(z)
    return out
for i, o in enumerate(sel):
    q = np.round(o['sig'].astype(float) / 0.005).astype(np.int64)
    d = np.diff(q, prepend=0)
    off = len(blob); blob += varint([int(v) for v in d])
    meta.append(dict(id=i + 1, c=o['cat'], o=off, db=o['db'], rec=o['rec'], t0=o['t0'], lead=o['lead'], p2p=o['p2p'],
                     acc=(['flv'] if o['db'] == 'cudb' else []), ctx=CTX[o['cat']]))
gz = gzip.compress(bytes(blob), 9); b64 = base64.b64encode(gz).decode()
from collections import Counter
print(Counter(m['c'] for m in meta), 'b64', len(b64))
open('/home/claude/ecg-desnudo/src/monitor_data.js', 'w').write(
    '// Generado por tools/monitor_pack.py: tiras de vfdb, cudb y MIT-BIH (PhysioNet, ODC-By), 250 Hz, filtradas 0,5–40 Hz. No editar a mano.\n'
    'const MON_META = %s;\nconst MON_BLOB = "%s";\n' % (json.dumps(meta, ensure_ascii=False, separators=(',', ':')), b64))
