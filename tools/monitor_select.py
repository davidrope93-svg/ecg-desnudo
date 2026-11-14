"""Fase 1 · Tiras de monitor reales (10 s, 250 Hz) a partir de episodios anotados por expertos.
vfdb y mitdb: anotaciones de ritmo '(VF', '(VT'...; cudb: inicio y fin de FV con '[' y ']'.
Salida: /home/claude/data/mon/cands.pkl (lista de dicts con la señal en mV, filtrada 0,5–40 Hz)."""
import wfdb, os, pickle, random, numpy as np, scipy.signal as ss
D = '/home/claude/data/mon/'
FS = 250
WANT = {  # categoría: (base, etiqueta de la fuente, máx. por episodio, máx. por registro)
    'fv': [('vfdb', '(VF', 4, 4), ('vfdb', '(VFIB', 3, 3), ('cudb', '[', 2, 2)],
    'flv': [('vfdb', '(VFL', 2, 4), ('mitdb', '(VFL', 2, 3)],
    'tv': [('vfdb', '(VT', 2, 3), ('mitdb', '(VT', 1, 2)],
    'asis': [('vfdb', '(ASYS', 6, 8)],
    'riva': [('mitdb', '(IVR', 3, 4), ('vfdb', '(VER', 2, 2)],
    'bigem': [('mitdb', '(B', 1, 2), ('vfdb', '(B', 2, 2)],
    'sinusal': [('mitdb', '(N', 1, 1), ('vfdb', '(N', 1, 1)],
}
HP = ss.butter(2, 0.5, 'highpass', fs=FS, output='sos'); LP = ss.butter(4, 40, 'lowpass', fs=FS, output='sos')
def episodes(db, r):
    a = wfdb.rdann(D + db + '/' + r, 'atr'); h = wfdb.rdheader(D + db + '/' + r)
    ep, noise = [], []
    if db == 'cudb':
        on = None
        for s, sym in zip(a.sample, a.symbol):
            if sym == '[': on = s
            if sym == ']' and on is not None: ep.append(('[', on, s)); on = None
        if on is not None: ep.append(('[', on, h.sig_len))
    else:
        cur, t0 = None, 0
        for s, sym, aux in zip(a.sample, a.symbol, a.aux_note):
            if sym == '+' and aux:
                if cur: ep.append((cur, t0, s))
                cur, t0 = aux.strip('\x00').strip(), s
        if cur: ep.append((cur, t0, h.sig_len))
    noise = [(t0, t1) for lab, t0, t1 in ep if lab == '(NOISE']
    noise += [(s - h.fs, s + h.fs) for s, sym in zip(a.sample, a.symbol) if sym in '~|']
    beats = [(s, sym) for s, sym in zip(a.sample, a.symbol)]
    return ep, noise, h, beats
def quality(x, cat):
    if np.max(np.abs(x)) > 6: return False
    seg = x[:len(x) // FS * FS].reshape(-1, FS)
    sd = seg.std(axis=1)
    if cat != 'asis' and (sd < 0.015).any(): return False          # tramo plano: electrodo despegado
    d = np.abs(np.diff(x))
    if (d > 2.5).any(): return False                                # saltos: descargas o desconexión
    return True
random.seed(5)
out = []
for cat, srcs in WANT.items():
    for db, lab, per_ep, per_rec in srcs:
        recs = sorted({f[:-4] for f in os.listdir(D + db) if f.endswith('.hea')})
        for r in recs:
            ep, noise, h, beats = episodes(db, r)
            fs = h.fs; W = int(10 * fs); got = 0
            if got >= per_rec: continue
            for L, t0, t1 in ep:
                if L != lab or t1 - t0 < W + int(fs): continue
                starts = list(range(t0 + int(fs), t1 - W, int(13 * fs)))
                random.shuffle(starts); n = 0
                for s0 in starts:
                    if n >= per_ep or got >= per_rec: break
                    if any(a < s0 + W and b > s0 for a, b in noise): continue
                    if cat == 'sinusal' and any(sym not in 'N+' for s, sym in beats if s0 <= s < s0 + W): continue
                    if cat == 'bigem':
                        sy = [sym for s, sym in beats if s0 <= s < s0 + W and sym not in '+']
                        if sy.count('V') < 4 or any(c not in 'NV' for c in sy): continue
                    rec = wfdb.rdrecord(D + db + '/' + r, sampfrom=s0, sampto=s0 + W, channels=[0])
                    x = rec.p_signal[:, 0]
                    if np.isnan(x).any(): continue
                    if fs != FS: x = ss.resample_poly(x, FS, fs)
                    x = ss.sosfiltfilt(LP, ss.sosfiltfilt(HP, x))[:2500]
                    if not quality(x, cat): continue
                    p2p = float(np.percentile(x, 99) - np.percentile(x, 1))
                    out.append(dict(cat=cat, db=db, rec=r, t0=round(s0 / fs, 1), sig=x.astype(np.float32), p2p=round(p2p, 2), lead=h.sig_name[0]))
                    n += 1; got += 1
for cat in WANT: 
    c = [o for o in out if o['cat'] == cat]
    print(cat, len(c), 'registros', len({(o['db'], o['rec']) for o in c}), 'p2p', sorted(o['p2p'] for o in c)[:3], '...')
pickle.dump(out, open(D + 'cands.pkl', 'wb'))
