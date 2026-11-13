import numpy as np, scipy.signal as ss, os
R = '/home/claude/data/rec/'
def load(eid):
    n = '%05d_hr' % eid
    x = np.fromfile(R + n + '.dat', dtype='<i2').reshape(-1, 12).astype(float) / 1000.0  # mV
    return x
def derived_err(x):
    I, II, III, aVR, aVL, aVF = x[:, :6].T
    return max(np.abs(III - (II - I)).max(), np.abs(aVR + (I + II) / 2).max(), np.abs(aVF - (II - I / 2)).max())
HP = ss.butter(2, 0.5, 'highpass', fs=500, output='sos')
def prep(x):
    """500 Hz -> 250 Hz (FIR antialias, fase cero) y línea de base (Butterworth 0,5 Hz, filtfilt: no deforma el ST)."""
    y = ss.sosfiltfilt(HP, x, axis=0)
    y = ss.decimate(y, 2, ftype='fir', axis=0, zero_phase=True)
    return y  # 2500 x 12, mV
import subprocess, pandas as _pd
_db = None
def fetch(ids):
    global _db
    if _db is None: _db = _pd.read_pickle('/home/claude/data/db.pkl')
    B = 'https://physionet-open.s3.amazonaws.com/ptb-xl/1.0.3/'
    for i in ids:
        n = '%05d_hr' % i
        if not os.path.exists(R + n + '.dat'):
            f = _db.loc[i, 'filename_hr']
            subprocess.run(['curl', '-sS', '-o', R + n + '.dat', B + f + '.dat'], check=True)
