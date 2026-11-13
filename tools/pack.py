import json, gzip, base64, ast, sys, numpy as np, pandas as pd
sys.path.insert(0, '/home/claude/ecg/tools'); from proc import load, prep
db = pd.read_pickle('/home/claude/data/db.pkl'); db['K'] = db.scp_codes.apply(ast.literal_eval)
final = json.load(open('final.json'))
LN = ['I','II','III','aVR','aVL','aVF','V1','V2','V3','V4','V5','V6']
KEEP = [0, 1, 6, 7, 8, 9, 10, 11]
Q = 0.005  # mV por unidad (5 µV)
def varint(vals):
    out = bytearray()
    for v in vals:
        z = (v << 1) ^ (v >> 31)  # zigzag (int32)
        z &= 0xFFFFFFFF
        while z >= 0x80: out.append((z & 0x7F) | 0x80); z >>= 7
        out.append(z)
    return out
SEC = {'AFIB':'fa','AFLT':'flutter','PACE':'marcapasos','PVC':'ev','BIGU':'ev','1AVB':'bav1','3AVB':'bav3','CLBBB':'bri','WPW':'wpw','LVH':'hvi','LNGQT':'qt_largo','DIG':'digital','STACH':'taqui','SBRAD':'bradi'}
blob = bytearray(); meta = []
for cat, ids in final.items():
    for i in ids:
        r = db.loc[i]; K = r.K
        y = prep(load(i))[:, KEEP]
        q = np.round(y / Q).astype(np.int64)
        d = np.diff(q, axis=0, prepend=0)
        off = len(blob)
        for k in range(8): blob += varint([int(v) for v in d[:, k]])
        sec = {SEC[c] for c in K if c in SEC}
        if 'CRBBB' in K: sec.add('bifasc' if 'LAFB' in K else 'brd')
        if 'LAFB' in K and 'CRBBB' not in K: sec.add('hbai')
        if r.infarction_stadium1 == 'Stadium III' and set(K) & {'IMI','ASMI','AMI','ALMI','LMI','ILMI','IPLMI','IPMI'}: sec.add('iam_antiguo')
        sec.discard(cat)
        ste = [l for l in LN if l != 'aVR' and r['ST_Amp_' + l] >= (0.15 if l in ('V2','V3') else 0.1)]
        std = [l for l in LN if l != 'aVR' and r['ST_Amp_' + l] <= -0.1]
        f = lambda v: None if pd.isna(v) else int(round(v))
        age = None if pd.isna(r.age) else int(r.age)
        meta.append(dict(id=int(i), c=cat, o=off, age=('≥90' if age and age >= 90 else age), sex=('M' if r.sex == 0 else 'F'),
            hr=f(r.HR_Ventr_Global), pr=f(r.PR_Int_Global), qrs=f(r.QRS_Dur_Global), qt=f(r.QT_Int_Global), qtc=f(r.QT_IntBazett_Global), ax=f(r.R_AxisFrontal_Global),
            avr=round(float(r.ST_Amp_aVR), 2), ste=ste, std=std, k=[c for c in K if c not in ('SR',)], stg=(r.infarction_stadium1 if isinstance(r.infarction_stadium1, str) and r.infarction_stadium1.startswith('Stadium') else None), sec=sorted(sec)))
gz = gzip.compress(bytes(blob), 9)
b64 = base64.b64encode(gz).decode()
print('records', len(meta), 'raw varint', len(blob), 'gzip', len(gz), 'b64', len(b64))
open('/home/claude/ecg/src/data.js', 'w').write('// Generado por tools/pack.py a partir de PTB-XL 1.0.3 y PTB-XL+ 1.0.1 (PhysioNet, CC BY 4.0). No editar a mano.\nconst ECG_Q = %s, ECG_FS = 250, ECG_N = 2500;\nconst ECG_META = %s;\nconst ECG_BLOB = "%s";\n' % (Q, json.dumps(meta, ensure_ascii=False, separators=(',', ':')), b64))
