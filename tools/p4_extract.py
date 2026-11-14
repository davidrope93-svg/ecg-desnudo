"""Fase 4 · Brugada tipo 1 basal (Brugada-HUCA), QT largo por dofetilida/quinidina (ECGRDVQ) y FA preexcitada (INCART I71)."""
import wfdb, numpy as np, scipy.signal as ss, pandas as pd, pickle, subprocess, os
D = '/home/claude/data/p4/'
LN = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']
def prep(x, fs):
    """x: muestras × 12 en mV → 2500 × 12 a 250 Hz, línea de base filtrada en fase cero."""
    x = ss.sosfiltfilt(ss.butter(2, 0.5, 'highpass', fs=fs, output='sos'), x, axis=0)
    from fractions import Fraction
    f = Fraction(250, fs).limit_denominator(1000)
    return ss.resample_poly(x, f.numerator, f.denominator, axis=0)[:2500]
def order(r):
    idx = {n.strip().upper(): i for i, n in enumerate(r.sig_name)}
    return r.p_signal[:, [idx[n.upper()] for n in LN]]
out = []
b = pd.read_csv('/home/claude/data/brug.csv'); b = b[(b.brugada == 1) & (b.basal_pattern == 1)]
for _, row in b.iterrows():
    r = wfdb.rdrecord(D + 'brug/%d' % row.patient_id); x = order(r)[100:1100]
    y = prep(x, 100)
    out.append(dict(c='brugada', src='huca', id=str(row.patient_id), sig=y, info=dict(sd=int(row.sudden_death)), cons=float(np.abs(x[:, 2] - (x[:, 1] - x[:, 0])).max())))
q = pd.read_csv(D + 'qt_best.csv')
PICK = [(1004, 'Quinidine Sulph'), (1018, 'Quinidine Sulph'), (1017, 'Quinidine Sulph'), (1007, 'Quinidine Sulph'), (1021, 'Dofetilide'), (1009, 'Dofetilide'), (1008, 'Dofetilide'), (1015, 'Dofetilide')]
os.makedirs(D + 'qt', exist_ok=True)
for rid, drug in PICK:
    row = q[(q.RANDID == rid) & (q.EXTRT == drug)].iloc[0]
    for ext in ('hea', 'dat'):
        subprocess.run(['curl', '-s', '-o', D + 'qt/%s.%s' % (row.EGREFID, ext), 'https://physionet-open.s3.amazonaws.com/ecgrdvq/1.0.0/raw/%d/%s.%s' % (rid, row.EGREFID, ext)])
    r = wfdb.rdrecord(D + 'qt/' + row.EGREFID); x = order(r)
    out.append(dict(c='qt_largo', src='rdvq', id=row.EGREFID[:8], sig=prep(x, 1000), info=dict(drug=drug, dose=row.EXDOSE, unit=row.EXDOSU, h=row.TPT, qtc=int(round(row.QTc)), base=int(round(row['base'])), qrs=int(row.QRS), rr=int(row.RR), sex=row.SEX, age=int(row.AGE)),
                    cons=float(np.abs(x[:, 2] - (x[:, 1] - x[:, 0])).max())))
a = wfdb.rdann('I71', 'atr', pn_dir='incartdb'); h = wfdb.rdheader('I71', pn_dir='incartdb')
eps, cur = [], None
for s, sym, aux in zip(a.sample, a.symbol, a.aux_note):
    if sym == '+' and aux:
        if cur: eps.append((cur[0], cur[1], s))
        cur = (aux.strip('\x00').strip(), s)
for lab, t0, t1 in eps:
    if lab != '(WPWAF': continue
    W = int(10 * h.fs)
    for s0 in range(t0 + h.fs, t1 - W, int(12 * h.fs)):
        r = wfdb.rdrecord('I71', pn_dir='incartdb', sampfrom=s0, sampto=s0 + W); x = order(r)
        out.append(dict(c='fa_preex', src='incart', id='I71@%d' % (s0 // h.fs), sig=prep(x, h.fs), info=dict(t=int(s0 // h.fs)), cons=float(np.abs(x[:, 2] - (x[:, 1] - x[:, 0])).max())))
from collections import Counter
print(Counter(o['c'] for o in out), 'coherencia III=II−I (mV, máx):', max(o['cons'] for o in out))
pickle.dump(out, open(D + 'p4.pkl', 'wb'))
