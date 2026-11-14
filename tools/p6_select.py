"""Fase 6 · Tiras periparada (10 s, 250 Hz, derivación de monitor) para revisión visual.
MIT-BIH: episodios anotados por expertos ((AFIB, (AFL, (SVTA, (BII, (SBR). Chapman/Ningbo y SPH: derivación II de los ECG de la fase 2 ya revisados
(TRNAV/TRAV → TSV; BAV completo; Mobitz II/2:1/avanzado). Salida: /home/claude/data/mon6/cands.pkl"""
import wfdb, os, pickle, random, json, sys, numpy as np, scipy.signal as ss
D = '/home/claude/data/mon/mitdb/'; FS = 250; OUT = '/home/claude/data/mon6/'
HP = ss.butter(2, 0.5, 'highpass', fs=FS, output='sos'); LP = ss.butter(4, 40, 'lowpass', fs=FS, output='sos')
WANT = {'fa': ('(AFIB', 4, 5), 'flutter': ('(AFL', 3, 6), 'tsv': ('(SVTA', 3, 3), 'bav2': ('(BII', 2, 10), 'bradi': ('(SBR', 14, 14)}
BEATS = set('NLRBAaJSVrFejnE/fQ?')
def episodes(r):
    a = wfdb.rdann(D + r, 'atr'); h = wfdb.rdheader(D + r); ep, cur, t0 = [], None, 0
    for s, sym, aux in zip(a.sample, a.symbol, a.aux_note):
        if sym == '+' and aux:
            if cur: ep.append((cur, t0, s))
            cur, t0 = aux.strip('\x00').strip(), s
    if cur: ep.append((cur, t0, h.sig_len))
    noise = [(t0, t1) for l, t0, t1 in ep if l == '(NOISE'] + [(s - h.fs, s + h.fs) for s, sym in zip(a.sample, a.symbol) if sym in '~|']
    return ep, noise, h, list(zip(a.sample, a.symbol))
def quality(x):
    if np.max(np.abs(x)) > 6 or (np.abs(np.diff(x)) > 2.5).any(): return False
    return True
random.seed(6); out = []
recs = sorted({f[:-4] for f in os.listdir(D) if f.endswith('.hea')})
for cat, (lab, per_ep, per_rec) in WANT.items():
    for r in recs:
        ep, noise, h, beats = episodes(r); fs = h.fs; W = int(10 * fs); got = 0
        for L, t0, t1 in ep:
            if L != lab or t1 - t0 < W: continue
            starts = list(range(t0, t1 - W + 1, int(5 * fs))); random.shuffle(starts); n = 0
            for s0 in starts:
                if n >= per_ep or got >= per_rec: break
                if any(a < s0 + W and b > s0 for a, b in noise): continue
                bs = [(s, y) for s, y in beats if s0 <= s < s0 + W and y in BEATS]
                if len(bs) < 3: continue
                sy = [y for s, y in bs]; rr = np.diff([s for s, y in bs]) / fs
                hr = round(len(bs) * 6); nV = sy.count('V')
                if cat == 'fa' and (hr < 110 or nV > 1): continue
                if cat in ('flutter', 'tsv') and nV > 1: continue
                if cat == 'tsv' and hr < 130: continue
                if cat == 'bradi' and rr.max() < 2.5: continue
                x = wfdb.rdrecord(D + r, sampfrom=s0, sampto=s0 + W, channels=[0]).p_signal[:, 0]
                if np.isnan(x).any(): continue
                x = ss.sosfiltfilt(LP, ss.sosfiltfilt(HP, ss.resample_poly(x, FS, fs)))[:2500]
                if not quality(x): continue
                out.append(dict(cat=cat, db='mitdb', rec=r, t0=round(s0 / fs, 1), sig=x.astype(np.float32), lead=h.sig_name[0], hr=hr, maxrr=round(float(rr.max()), 2), nV=nV,
                                p2p=round(float(np.percentile(x, 99) - np.percentile(x, 1)), 2)))
                n += 1; got += 1
sys.path.insert(0, '/home/claude/ecg-desnudo/tools'); from p2_load import load as p2load, LN
LP2 = ss.butter(4, 40, 'lowpass', fs=250, output='sos')
MAP = {'trnav': 'tsv', 'trav': 'tsv', 'bav3': 'bav3', 'bav2alto': 'bav2'}
for x in json.load(open('/home/claude/ecg-desnudo/tools/p2_final.json')):
    if x['c'] not in MAP: continue
    y = p2load(x['src'], x['id'])
    if y is None: continue
    y = ss.sosfiltfilt(LP2, y[:, LN.index('II')])
    out.append(dict(cat=MAP[x['c']], db=x['src'], rec=x['id'], t0=0, sig=y.astype(np.float32), lead='II', hr=x.get('hr'), src_c=x['c'],
                    p2p=round(float(np.percentile(y, 99) - np.percentile(y, 1)), 2)))
from collections import Counter
print(Counter((o['cat'], o['db']) for o in out))
pickle.dump(out, open(OUT + 'cands.pkl', 'wb'))
