"""Fase 6 · Derivación II de ECG del banco (data.js, ya revisados) como tira de monitor: FA y flutter con FC ≥ 100.
Decodifica src/data.js (delta + zigzag + varint) y filtra 0,5–40 Hz como el resto de tiras."""
import re, json, base64, gzip, numpy as np, scipy.signal as ss, pickle, sys
s = open('/home/claude/ecg-desnudo/src/data.js', encoding='utf-8').read()
meta = json.loads(re.search(r'ECG_META\s*=\s*(\[.*?\]);', s, re.S).group(1))
blob = gzip.decompress(base64.b64decode(re.search(r'ECG_BLOB\s*=\s*"([^"]+)"', s).group(1)))
Q = float(re.search(r'ECG_Q\s*=\s*([0-9.e-]+)', s).group(1)); N = 2500
def lead(off, k):
    p = off
    for kk in range(k + 1):
        acc, a = 0, np.zeros(N)
        for i in range(N):
            z = sh = 0
            while True:
                b = blob[p]; p += 1; z |= (b & 0x7f) << sh; sh += 7
                if not b & 0x80: break
            acc += (z >> 1) ^ -(z & 1); a[i] = acc * Q
    return a
LP = ss.butter(4, 40, 'lowpass', fs=250, output='sos')
out = []
for m in meta:
    if m['c'] in ('fa', 'flutter') and (m.get('hr') or 0) >= 100 and not m.get('src') and not m.get('xf'):
        y = ss.sosfiltfilt(LP, lead(m['o'], 1))
        out.append(dict(cat=m['c'], db='ptbxl', rec=str(m['id']), t0=0, sig=y.astype(np.float32), lead='II', hr=m['hr'], p2p=round(float(np.percentile(y, 99) - np.percentile(y, 1)), 2)))
print([(o['cat'], o['rec'], o['hr']) for o in out])
c = pickle.load(open('/home/claude/data/mon6/cands.pkl', 'rb')); c = [o for o in c if o['db'] != 'ptbxl'] + out
pickle.dump(c, open('/home/claude/data/mon6/cands.pkl', 'wb')); print(len(c))
