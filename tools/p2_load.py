"""Fase 2 · Carga común de ECG de Chapman/Ningbo (ecg-arrhythmia) y SPH, rasgos automáticos y hojas de revisión."""
import numpy as np, scipy.signal as ss, wfdb, h5py, os
CN = '/home/claude/data/cn/mat/'; SPH = '/home/claude/data/sph/records/'
LN = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']
HP = ss.butter(2, 0.5, 'highpass', fs=500, output='sos')
def load(src, rid, t0=0):
    """12 derivaciones, 10 s, 250 Hz, mV, línea de base filtrada en fase cero."""
    if src == 'cn':
        r = wfdb.rdrecord(CN + rid); x = r.p_signal[:, [r.sig_name.index(l) for l in LN]]
    else:
        x = h5py.File(SPH + rid + '.h5', 'r')['ecg'][:].T.astype(float)
    x = x[int(t0 * 500): int(t0 * 500) + 5000]
    if len(x) < 5000 or np.isnan(x).any(): return None
    y = ss.sosfiltfilt(HP, x, axis=0)
    return ss.decimate(y, 2, ftype='fir', axis=0, zero_phase=True)
BP = ss.butter(2, [5, 25], 'bandpass', fs=250, output='sos')
def feats(y):
    e = np.abs(np.diff(ss.sosfiltfilt(BP, y, axis=0), axis=0)).sum(axis=1)
    e = np.convolve(e, np.ones(20) / 20, 'same')
    pk, _ = ss.find_peaks(e, distance=int(0.24 * 250), height=0.35 * np.percentile(e, 98))
    if len(pk) < 3: return dict(hr=None, cv=None, pause=None, maxrr=None, n=len(pk))
    rr = np.diff(pk) / 250
    return dict(hr=round(60 / np.median(rr)), cv=round(float(rr.std() / rr.mean()), 2), pause=round(float(rr.max() / np.median(rr)), 2), maxrr=round(float(rr.max()), 2), n=len(pk))
def sheet(items, out, leads=('II', 'V1')):
    import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
    n = len(items); fig, axs = plt.subplots(n * len(leads), 1, figsize=(16, 0.8 * n * len(leads)), squeeze=False)
    t = np.arange(2500) / 250
    for k, (title, y) in enumerate(items):
        for j, l in enumerate(leads):
            ax = axs[k * len(leads) + j][0]; ax.plot(t, y[:, LN.index(l)], 'k', lw=0.55)
            ax.set_xlim(0, 10); ax.set_ylim(-1.6, 1.8); ax.set_xticks(np.arange(0, 10, 0.2)); ax.set_yticks(np.arange(-1.5, 1.8, 0.5))
            ax.grid(True, color='#f4a0a0', lw=0.35); ax.tick_params(labelbottom=False, labelleft=False, length=0)
            ax.text(0.02, 1.25, l, fontsize=8, color='b')
            if j == 0: ax.set_title(title, fontsize=7.5, loc='left', pad=1)
    plt.tight_layout(pad=0.2, h_pad=0.12); plt.savefig(out, dpi=58); plt.close()
