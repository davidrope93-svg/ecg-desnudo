import json, sys, numpy as np, pandas as pd, matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt, ast
sys.path.insert(0, '/home/claude/ecg/tools'); from proc import *
db = pd.read_pickle('/home/claude/data/db.pkl')
st = pd.read_csv('/home/claude/data/12sl_statements.csv', index_col='ecg_id')
LN = ['I','II','III','aVR','aVL','aVF','V1','V2','V3','V4','V5','V6']
def info(i):
    r = db.loc[i]
    return f"#{i} FC{r.HR_Ventr_Global:.0f} PR{r.PR_Int_Global:.0f} QRS{r.QRS_Dur_Global:.0f} QTc{r.QT_IntBazett_Global:.0f} eje{r.R_AxisFrontal_Global:.0f} | {','.join(ast.literal_eval(r.scp_codes))} | {r.infarction_stadium1 if isinstance(r.infarction_stadium1,str) else ''} | 12SL:{' '.join(ast.literal_eval(st.loc[i,'statements']))[:70]}"
def strips(ids, leads, out):
    n = len(ids); fig, axs = plt.subplots(n * len(leads), 1, figsize=(16, 0.85 * n * len(leads)))
    t = np.arange(2500) / 250
    for k, i in enumerate(ids):
        y = prep(load(i))
        for j, l in enumerate(leads):
            ax = axs[k * len(leads) + j]; ax.plot(t, y[:, LN.index(l)], 'k', lw=0.6)
            ax.set_xlim(0, 10); ax.set_ylim(-1.5, 1.8); ax.set_xticks(np.arange(0, 10, 0.2), minor=False); ax.set_yticks(np.arange(-1.5, 1.8, 0.5))
            ax.grid(True, color='#f4a0a0', lw=0.4); ax.tick_params(labelbottom=False, labelleft=False, length=0)
            ax.text(0.02, 1.3, l, fontsize=8, color='b')
            if j == 0: ax.set_title(info(i), fontsize=7.5, loc='left', pad=1)
    plt.tight_layout(pad=0.2, h_pad=0.15); plt.savefig(out, dpi=62); plt.close()
def twelve(ids, out):
    n = len(ids); fig, axs = plt.subplots(n, 1, figsize=(16, 2.6 * n))
    for k, i in enumerate(ids):
        y = prep(load(i)); ax = axs[k] if n > 1 else axs
        lay = [['I','aVR','V1','V4'],['II','aVL','V2','V5'],['III','aVF','V3','V6']]
        for r, row in enumerate(lay):
            for c, l in enumerate(row):
                seg = y[c*625:(c+1)*625, LN.index(l)]
                ax.plot(np.arange(625)/250 + c*2.5, seg - r*3.0, 'k', lw=0.6); ax.text(c*2.5+0.05, -r*3.0+1.0, l, fontsize=8, color='b')
        ax.set_xlim(0,10); ax.set_ylim(-8, 1.8); ax.set_xticks(np.arange(0,10,0.2)); ax.set_yticks(np.arange(-8,1.8,0.5))
        ax.grid(True, color='#f4a0a0', lw=0.35); ax.tick_params(labelbottom=False, labelleft=False, length=0)
        ax.set_title(info(i), fontsize=7.5, loc='left', pad=1)
    plt.tight_layout(pad=0.2, h_pad=0.2); plt.savefig(out, dpi=60); plt.close()
if __name__ == '__main__':
    pick = json.load(open('/home/claude/ecg/tools/review.json'))
    mode, cat, a, b = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    ids = pick[cat][a:b]
    out = f'/home/claude/ecg/review_{cat}_{a}.png'
    (strips(ids, ['II','V1'], out) if mode == 's' else twelve(ids, out)); print(out, ids)
