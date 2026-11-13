"""Lista final de ECG por categoría y empaquetado (250 Hz, 8 derivaciones independientes, delta + varint + gzip)."""
import json, random, gzip, base64, ast, sys, numpy as np, pandas as pd
sys.path.insert(0, '/home/claude/ecg/tools'); from proc import load, prep, fetch
db = pd.read_pickle('/home/claude/data/db.pkl'); db['K'] = db.scp_codes.apply(ast.literal_eval)
c = json.load(open('candidates.json'))
N = dict(normal=14, bradi=6, taqui=6, fa=10, flutter=7, tsv=5, ev=7, marcapasos=6, bav1=6, brd=8, bri=8, hbai=6, bifasc=6, wpw=7, iam_antiguo=8, scasest=8, hvi=7, qt_largo=6, digital=5)
INJ = {'INJAS','INJAL','INJIN','INJLA','INJIL'}; ISC = {'ISC_','ISCAL','ISCAS','ISCIN','ISCLA','ISCIL','ISCAN'}
OLD = {'IMI','ASMI','AMI','ALMI','LMI','ILMI','IPLMI','IPMI'}
pure = dict(scasest=INJ|ISC|{'STD_','NST_','NDT','LAFB','ABQRS','LOWT','INVT','SARRH','STACH'}, iam_antiguo=OLD|{'NDT','QWAVE','LOWT','INVT','PAC','IRBBB','LPR','ABQRS'}, qt_largo={'LNGQT','EL','LOWT','STD_','NDT','NST_','LAFB','RAO/RAE','LAO/LAE','STACH','SBRAD'}, flutter={'AFLT','NST_','ABQRS','NDT','STD_'}, tsv={'PSVT','SVTAC','NST_','STD_','NDT','ISC_','IVCD'}, ev={'PVC','BIGU','NDT','ABQRS'}, wpw={'WPW','ABQRS','SARRH','SBRAD'})
st = pd.read_csv('/home/claude/data/12sl_statements.csv', index_col='ecg_id')
S = st.statements.apply(lambda s: set(ast.literal_eval(s)))
random.seed(11)
final = {}
for cat, n in N.items():
    ids = c[cat][:]
    if cat in pure: ids = [i for i in ids if set(db.loc[i,'K']) - {'SR','NORM'} <= pure[cat]]
    if cat == 'tsv': ids = [i for i in ids if 'SVT' in S[i] and not ({'AFLT','AFIB'} & set(db.loc[i,'K']))]
    if cat == 'marcapasos': ids = [i for i in ids if S[i] & {'VPR','AVDPR'}]
    if cat == 'wpw': ids = [i for i in ids if 'Stadium' not in str(db.loc[i,'infarction_stadium1'])]
    if cat in ('iam_antiguo','scasest','hvi','qt_largo','digital','normal','bri','brd','fa'):
        pass
    v = [i for i in ids if db.loc[i,'val']]; nv = [i for i in ids if not db.loc[i,'val']]
    random.shuffle(v); random.shuffle(nv)
    final[cat] = (v + nv)[:n]
final['bav3'] = [959, 8620, 8911, 16271, 21533]
final['scacest_inf'] = [532, 3956, 4827, 8611, 12899, 15130, 19269]
final['scacest_ant'] = [6303, 11940, 11944, 13913, 18924, 18948, 19067, 20139, 20617, 21040]
for k, v in final.items(): print(k, len(v), v)
json.dump(final, open('final.json', 'w'))
fetch([i for v in final.values() for i in v])
