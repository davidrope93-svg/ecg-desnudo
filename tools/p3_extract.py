"""Fase 3 · STAFF III: ventanas de 10 s (basal en hemodinámica y durante el inflado del balón) y desnivel del ST automático."""
import wfdb, json, numpy as np, scipy.signal as ss, pickle, concurrent.futures as cf
D = '/home/claude/data/staff/'
BAD_PT = {1, 4, 5, 6, 89}          # derivaciones invertidas según la propia base
def artery(a):
    a = a.lower()
    if 'diag' in a or 'left main' in a: return None
    if 'lad' in a: return 'da'
    if 'rca' in a: return 'cd'
    if 'circ' in a: return 'cx'
    return None
HP = ss.butter(2, 0.5, 'highpass', fs=1000, output='sos')
ORDER = ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']
def window(rec, t0):
    r = wfdb.rdrecord(rec, pn_dir='staffiii/1.0.0/data', sampfrom=int(t0 * 1000), sampto=int(t0 * 1000) + 10000)
    x = r.p_signal
    if x.shape[0] < 10000 or np.isnan(x).any(): return None
    idx = {n.strip(): i for i, n in enumerate(r.sig_name)}
    III = x[:, idx['III']]; I = x[:, idx['I']]; II = x[:, idx['II']]
    if np.abs(III - (II - I)).max() > 0.2: return 'inconsistent'
    y = x[:, [idx[n] for n in ORDER]]
    y = ss.sosfiltfilt(HP, y, axis=0)
    y = ss.resample_poly(y, 1, 4, axis=0)[:2500]
    return y.astype(np.float32)
def twelve(y):
    I, II = y[:, 0], y[:, 1]
    return np.column_stack([I, II, II - I, -(I + II) / 2, I - II / 2, II - I / 2, y[:, 2:]])
BP = ss.butter(2, [5, 25], 'bandpass', fs=250, output='sos')
def st_levels(y):
    """Desnivel del ST (mV) en J+60 ms frente a la línea PR, sobre el latido mediano de cada derivación. Orientativo."""
    L = twelve(y)
    e = np.convolve(np.abs(np.diff(ss.sosfiltfilt(BP, L, axis=0), axis=0)).sum(axis=1), np.ones(15) / 15, 'same')
    pk, _ = ss.find_peaks(e, distance=int(0.3 * 250), height=0.35 * np.percentile(e, 98))
    pk = [p for p in pk if 60 < p < 2500 - 130]
    if len(pk) < 4: return None
    beats = np.stack([L[p - 60:p + 130] for p in pk])           # -240..+520 ms
    med = np.median(beats, axis=0)
    em = np.abs(np.diff(med, axis=0)).sum(axis=1)
    r = 60
    after = np.where(em[r:] < 0.12 * em.max())[0]
    j = r + (after[after > 5][0] if len(after[after > 5]) else 25)
    pre = [np.mean(em[i:i + 5]) for i in range(5, r - 10)]
    i0 = 5 + int(np.argmin(pre))
    base = med[i0:i0 + 5].mean(axis=0)
    stp = min(j + 15, med.shape[0] - 1)
    return (med[stp] - base).round(3), int((j - r) * 4)
ann = json.load(open(D + 'ann.json'))
jobs = []
for p in ann:
    if p['pt'] in BAD_PT or not p['bi']: continue
    b = p['bi'][0]; a = artery(b['art'])
    if a is None: continue
    ok_s = lambda v: isinstance(v, str) and v not in ('nan', '')
    base = p['bc1'] if ok_s(p['bc1']) else p['br']
    if not ok_s(base) or not ok_s(b['rec']): continue
    ts = [t for t in (60, 120, 180) if t + 10 <= b['d1']] + [max(0, b['d1'] - 12)]
    jobs.append((p, b, a, '%03d%s' % (int(base[:-1]), base[-1]), '%03d%s' % (int(b['rec'][:-1]), b['rec'][-1]), sorted(set(ts))))
def run(job):
    p, b, a, base, bi, ts = job
    try:
        h = wfdb.rdheader(base, pn_dir='staffiii/1.0.0/data')
        y0 = window(base, max(0, h.sig_len / 1000 / 2 - 5))
        if not isinstance(y0, np.ndarray): return None
        wins = [dict(t=-1, sig=y0)]
        for t in ts:
            y = window(bi, b['d0'] + t)
            if isinstance(y, np.ndarray): wins.append(dict(t=t, sig=y))
        for w in wins:
            s = st_levels(w['sig']); w['st'] = None if s is None else s[0].tolist(); w['qrs'] = None if s is None else s[1]
        return dict(pt=p['pt'], age=p['age'], sex=p['sex'], prior=p['prior'], art=a, art_txt=b['art'], dur=b['d1'], base=base, bi=bi, wins=wins)
    except Exception as e:
        return dict(err=str(e), pt=p['pt'])
with cf.ThreadPoolExecutor(8) as ex: res = list(ex.map(run, jobs))
ok = [r for r in res if r and 'err' not in r]
print('trabajos', len(jobs), 'ok', len(ok), 'errores', [r for r in res if r and 'err' in r][:3])
pickle.dump(ok, open(D + 'p3.pkl', 'wb'))
