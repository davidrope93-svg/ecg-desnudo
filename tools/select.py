"""Selecciona ECG de PTB-XL por categoría con criterios estrictos (etiqueta del cardiólogo + concordancia con GE 12SL + medidas)."""
import pandas as pd, ast, json, sys
D = '/home/claude/data/'
db = pd.read_csv(D+'ptbxl_database.csv', index_col='ecg_id')
db['K'] = db.scp_codes.apply(lambda s: {k:v for k,v in ast.literal_eval(s).items()})
st = pd.read_csv(D+'12sl_statements.csv', index_col='ecg_id')
db['S'] = st.statements.reindex(db.index).apply(lambda s: set(ast.literal_eval(s)) if isinstance(s,str) else set())
L = ['I','II','III','aVR','aVL','aVF','V1','V2','V3','V4','V5','V6']
cols = ['ecg_id','HR_Ventr_Global','PR_Int_Global','QRS_Dur_Global','QT_Int_Global','QT_IntBazett_Global','R_AxisFrontal_Global','HR_Atrial_Global'] + ['ST_Amp_'+l for l in L]
ft = pd.read_csv(D+'12sl_features.csv', usecols=cols, index_col='ecg_id')
db = db.join(ft)
noise = db[['baseline_drift','static_noise','burst_noise','electrodes_problems']].notna().any(axis=1)
db['clean'] = ~noise
db['val'] = db.validated_by_human.astype(bool)
MI = {'IMI','ASMI','AMI','ALMI','LMI','ILMI','IPLMI','IPMI','PMI','INJAS','INJAL','INJIN','INJLA','INJIL'}
INJ = {'INJAS','INJAL','INJIN','INJLA','INJIL'}
MAJOR = MI | {'CLBBB','CRBBB','LAFB','LPFB','WPW','1AVB','2AVB','3AVB','IVCD','ILBBB','AFIB','AFLT','PACE','PSVT','SVTAC','BIGU','TRIGU','PVC','LVH','RVH','SEHYP','LNGQT','DIG','EL','ANEUR','ISC_','ISCAL','ISCAS','ISCIN','ISCLA','ISCIL','ISCAN','STACH','SBRAD','PAC','SVARR','NST_','NDT','STD_','STE_','LAO/LAE','RAO/RAE','IRBBB'}
def only(K, allowed): return set(K) - {'SR','NORM','SARRH'} <= set(allowed)
def st(r, leads): return [r['ST_Amp_'+l] for l in leads]
R = {}
def add(cat, mask): R[cat] = db[mask & db.clean]
k = db.K; s = db.S
has = lambda c: k.apply(lambda d: c in d)
has100 = lambda c: k.apply(lambda d: d.get(c,0) >= 100)
sh = lambda *c: s.apply(lambda x: bool(x & set(c)))
add('normal', k.apply(lambda d: set(d) <= {'NORM','SR'} and d.get('NORM',0)>=100) & sh('NML') & sh('NSR') & db.HR_Ventr_Global.between(60,95) & db.val)
add('bradi', has('SBRAD') & k.apply(lambda d: only(d, {'SBRAD'})) & sh('SBRAD','MSBRAD') & (db.HR_Ventr_Global < 55) & db.val)
add('taqui', has('STACH') & k.apply(lambda d: only(d, {'STACH'})) & sh('STACH') & (db.HR_Ventr_Global > 105) & (db.QRS_Dur_Global < 110))
add('fa', has('AFIB') & k.apply(lambda d: only(d, {'AFIB','NDT','NST_','ABQRS','STD_','LVOLT'})) & sh('AFIB') & (db.QRS_Dur_Global < 115))
add('flutter', has('AFLT') & sh('FLUT') & k.apply(lambda d: not (set(d) & (MI|{'CLBBB','PACE'}))))
add('tsv', (has('PSVT') | has('SVTAC')) & (db.HR_Ventr_Global > 140) & (db.QRS_Dur_Global < 115))
add('ev', (has('PVC') | has('BIGU')) & k.apply(lambda d: only(d, {'PVC','BIGU','NDT','ABQRS'})) & sh('PVC','BIGEM','VPCX'))
add('marcapasos', has('PACE') & sh('VPR','AVDPR','APR'))
add('bav1', has100('1AVB') & k.apply(lambda d: only(d, {'1AVB'})) & sh('FAV') & (db.PR_Int_Global > 220) & (db.QRS_Dur_Global < 110))
add('bav2', has('2AVB'))
add('bav3', has('3AVB'))
add('brd', has100('CRBBB') & k.apply(lambda d: only(d, {'CRBBB','NDT'})) & sh('RBBB') & (db.QRS_Dur_Global >= 120))
add('bri', has100('CLBBB') & k.apply(lambda d: only(d, {'CLBBB','NDT','LVH'})) & sh('LBBB') & (db.QRS_Dur_Global >= 120))
add('hbai', has100('LAFB') & k.apply(lambda d: only(d, {'LAFB'})) & sh('AFB') & (db.R_AxisFrontal_Global <= -45) & db.val)
add('bifasc', has100('CRBBB') & has100('LAFB') & k.apply(lambda d: only(d, {'CRBBB','LAFB','NDT','1AVB'})) & sh('RBBB') & sh('AFB','BIFB') & (db.QRS_Dur_Global >= 120))
add('wpw', has('WPW') & sh('WPW','WPWA','WPWB'))
stA = db[['ST_Amp_V1','ST_Amp_V2','ST_Amp_V3','ST_Amp_V4']].apply(lambda r: (r >= 0.15).sum(), axis=1)
stI = db[['ST_Amp_II','ST_Amp_III','ST_Amp_aVF']].apply(lambda r: (r >= 0.1).sum(), axis=1)
stL = db[['ST_Amp_I','ST_Amp_aVL','ST_Amp_V5','ST_Amp_V6']].apply(lambda r: (r >= 0.1).sum(), axis=1)
acute = db.infarction_stadium1.isin(['Stadium I','Stadium I-II'])
stemi = sh('STEMI','ASBINJ','ISBINJ','LSBINJ','IINJ','AINJ','ALINJ','ILINJ','LINJ')
noinj = k.apply(lambda d: not (set(d) & INJ))
add('scacest_ant', (acute | stemi) & noinj & (has('ASMI') | has('AMI') | has('ALMI')) & (stA >= 2) & k.apply(lambda d: not (set(d) & {'CLBBB','PACE','LVH','WPW','IMI','INJIN','INJIL'})))
add('scacest_inf', (acute | stemi) & noinj & (has('IMI') | has('ILMI') | has('IPLMI') | has('IPMI')) & (stI >= 2) & k.apply(lambda d: not (set(d) & {'CLBBB','PACE','LVH','WPW','ASMI','AMI','INJAS','INJAL'})))
add('scacest_lat', (acute | stemi) & noinj & (has('LMI') | has('ALMI')) & (stL >= 2) & k.apply(lambda d: not (set(d) & {'CLBBB','PACE','LVH','WPW','IMI','INJIN','INJIL'})))
old = db.infarction_stadium1.isin(['Stadium III']) & db.infarction_stadium2.isna()
add('iam_antiguo', old & (has100('IMI') | has100('ASMI')) & k.apply(lambda d: not (set(d) & (INJ|{'CLBBB','CRBBB','PACE','LVH','WPW','AFIB','LAFB'}))) & sh('IMI','ASMI','AMI','SMI'))
stD = db[['ST_Amp_'+l for l in ['I','II','III','aVL','aVF','V2','V3','V4','V5','V6']]].apply(lambda r: (r <= -0.1).sum(), axis=1)
add('scasest', (k.apply(lambda d: any(d.get(c,0)>=50 for c in INJ)) | k.apply(lambda d: any(d.get(c,0)>=100 for c in {'ISC_','ISCAL','ISCAS','ISCIN','ISCLA','ISCIL','ISCAN'}))) & (stD >= 3) & (stA == 0) & (stI == 0) & (stL == 0) & k.apply(lambda d: not (set(d) & {'CLBBB','CRBBB','PACE','LVH','WPW','AFIB','DIG','LNGQT','IVCD','SEHYP','PVC','VCLVH'})) & (db.QRS_Dur_Global < 115))
isc = {'ISC_','ISCAL','ISCAS','ISCIN','ISCLA','ISCIL','ISCAN'}
_unused = ( k.apply(lambda d: any(d.get(c,0)>=100 for c in isc) and not (set(d) & (MI|{'CLBBB','CRBBB','PACE','LVH','WPW','AFIB','DIG','LNGQT','IVCD','LAFB','SEHYP','PVC'}))) & db.val)
add('hvi', has100('LVH') & k.apply(lambda d: only(d, {'LVH','ISC_','ISCAL','NDT','STD_','LAO/LAE','LVOLT','VCLVH','ISCLA','NST_'})) & sh('LVH2','LVH3','LVH') & (db.QRS_Dur_Global < 120))
add('qt_largo', has100('LNGQT') & (db.QT_IntBazett_Global > 480) & (db.QRS_Dur_Global < 120) & k.apply(lambda d: not (set(d) & (MI|{'PACE','AFIB','CLBBB','CRBBB'}))))
add('digital', has100('DIG') & k.apply(lambda d: not (set(d) & (MI|{'PACE','CLBBB','CRBBB','WPW'}))))
out = {}
for c, d in R.items():
    d = d.sort_values(['val'], ascending=False)
    print(f"{c:14s} {len(d):5d}  val={int(d.val.sum())}")
    out[c] = [int(i) for i in d.index]
json.dump(out, open('/home/claude/ecg/tools/candidates.json','w'))
db.drop(columns=['K','S']).to_pickle('/home/claude/data/db.pkl')
