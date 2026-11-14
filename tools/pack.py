import json, gzip, base64, ast, sys, numpy as np, pandas as pd
sys.path.insert(0, '/home/claude/ecg-desnudo/tools'); sys.path.insert(0, '/home/claude/ecg/tools'); from proc import load, prep
db = pd.read_pickle('/home/claude/data/db.pkl'); db['K'] = db.scp_codes.apply(ast.literal_eval)
final = json.load(open('/home/claude/ecg/tools/final.json'))
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
# Fase 2: Chapman/Ningbo y SPH, revisados uno a uno (tools/p2_final.json)
from p2_load import load as p2load
from p2_labels import labels, secondary
for x in json.load(open('/home/claude/ecg-desnudo/tools/p2_final.json')):
    y = p2load(x['src'], x['id'])[:, KEEP]
    q = np.round(y / Q).astype(np.int64); d = np.diff(q, axis=0, prepend=0)
    off = len(blob)
    for k in range(8): blob += varint([int(v) for v in d[:, k]])
    try: age = int(float(x['age']))
    except (TypeError, ValueError): age = None
    sx = str(x['sex']).lower()
    meta.append(dict(id=x['id'], src=x['src'], c=x['c'], o=off, age=('≥90' if age and age >= 90 else age), sex=('M' if sx in ('m', 'male') else 'F'),
        hr=x['hr'], pr=None, qrs=None, qt=None, qtc=None, ax=None, avr=0, ste=[], std=[], k=[], rep=labels(x['src'], x['dx']), stg=None, sec=secondary(x['src'], x['dx'], x['c'])))
# Fase 4: Brugada tipo 1 (Brugada-HUCA), QT por fármacos (ECGRDVQ), FA preexcitada (INCART), revisados uno a uno
import pickle
P4 = pickle.load(open('/home/claude/data/p4/p4.pkl', 'rb'))
BRUG_OK = {'428031', '852786', '972330', '1122903', '1157038', '1191595', '1220716', '1358245', '1426919', '3015438'}
QT_DROP = {'3d4a8418'}                                   # artefacto de línea de base al final
FA_KEEP = {'I71@%d' % t for t in (671, 695, 719, 743, 767, 1265)}
DRUG = {'Quinidine Sulph': 'quinidina', 'Dofetilide': 'dofetilida'}
from p2_load import feats
for x in P4:
    if x['c'] == 'brugada' and x['id'] not in BRUG_OK: continue
    if x['c'] == 'qt_largo' and x['id'] in QT_DROP: continue
    if x['c'] == 'fa_preex' and x['id'] not in FA_KEEP: continue
    y = x['sig'][:, KEEP]
    q = np.round(y / Q).astype(np.int64); d = np.diff(q, axis=0, prepend=0)
    off = len(blob)
    for k in range(8): blob += varint([int(v) for v in d[:, k]])
    i = x['info']; age = sex = None; rep = []; sec = []; hr = feats(x['sig'])['hr']; qtc = None; qrs = None
    if x['c'] == 'brugada':
        rep = ['patrón de Brugada tipo 1 espontáneo', 'síndrome de Brugada con diagnóstico clínico confirmado'] + (['muerte súbita en el seguimiento'] if i['sd'] else [])
    elif x['c'] == 'qt_largo':
        u = 'mcg' if i['unit'] == 'ug' else i['unit']
        rep = ['voluntario sano en un ensayo clínico', '%s %s %s, %s h tras la dosis' % (DRUG[i['drug']], int(i['dose']), u, str(i['h']).replace('.0', '')), 'QTc %d ms (basal %d ms, Bazett)' % (i['qtc'], i['base'])]
        age, sex, hr, qtc, qrs = i['age'], i['sex'], round(60000 / i['rr']), i['qtc'], i['qrs']
    else:
        rep = ['fibrilación auricular preexcitada (WPW)']; sec = ['fa', 'wpw']
    meta.append(dict(id=x['id'], src=x['src'], c=x['c'], o=off, age=age, sex=sex, hr=hr, pr=None, qrs=qrs, qt=None, qtc=qtc, ax=None, avr=0, ste=[], std=[], k=[], rep=rep, stg=None, sec=sec))
# Inversión de electrodos de los brazos: transformación exacta en la interfaz (xf) sobre ECG normales ya empaquetados
for m in [m for m in meta if m['c'] == 'normal'][:8]:
    inv = dict(m); inv.update(id='inv-%s' % m['id'], c='inv_brazos', xf='brazos', ax=None, ste=[], std=[], avr=0, k=[], sec=[],
                              rep=['ECG normal (PTB-XL n.º %s) con los electrodos de brazo derecho y brazo izquierdo intercambiados' % m['id']])
    meta.append(inv)
# Fase 7 · Otras inversiones de los miembros (misma transformación exacta). Brazo izq. ↔ pierna izq.: normales con eje ≥ 30° (P y QRS mayores en II que en I)
NORM = [m for m in meta if m['c'] == 'normal' and not m.get('xf')]
XF = [('mi_pi', 'inv_mi_pi', 'brazo izquierdo y pierna izquierda', [m for m in NORM if (m['ax'] or 0) >= 30][:8]),
      ('md_pi', 'inv_md_pi', 'brazo derecho y pierna izquierda', [m for m in NORM if (m['ax'] or 0) < 30][:6] + [m for m in NORM if (m['ax'] or 0) >= 30][-2:])]
for xf, c, txt, base in XF:
    for m in base:
        inv = dict(m); inv.update(id='%s-%s' % (xf, m['id']), c=c, xf=xf, ax=None, ste=[], std=[], avr=0, k=[], sec=[],
                                  rep=['ECG normal (PTB-XL n.º %s) con los electrodos de %s intercambiados' % (m['id'], txt)])
        meta.append(inv)
gz = gzip.compress(bytes(blob), 9)
b64 = base64.b64encode(gz).decode()
print('records', len(meta), 'raw varint', len(blob), 'gzip', len(gz), 'b64', len(b64))
open('/home/claude/ecg-desnudo/src/data.js', 'w').write('// Generado por tools/pack.py: PTB-XL 1.0.3 y PTB-XL+ 1.0.1 (CC BY 4.0), Chapman-Shaoxing/Ningbo (CC BY 4.0) y SPH (CC0). No editar a mano.\nconst ECG_Q = %s, ECG_FS = 250, ECG_N = 2500;\nconst ECG_META = %s;\nconst ECG_BLOB = "%s";\n' % (Q, json.dumps(meta, ensure_ascii=False, separators=(',', ':')), b64))
