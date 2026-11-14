"""Fase 6 · Hojas de revisión visual de las tiras candidatas (papel 25 mm/s, 10 mm/mV)."""
import pickle, sys, numpy as np, matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
c = pickle.load(open('/home/claude/data/mon6/cands.pkl', 'rb'))
cats = sys.argv[1].split(','); per = int(sys.argv[2]) if len(sys.argv) > 2 else 8
items = [(i, o) for i, o in enumerate(c) if o['cat'] in cats]
for k in range(0, len(items), per):
    chunk = items[k:k + per]; fig, axs = plt.subplots(len(chunk), 1, figsize=(16, 1.55 * len(chunk)), squeeze=False)
    t = np.arange(2500) / 250
    for ax, (i, o) in zip(axs[:, 0], chunk):
        y = o['sig']; ax.plot(t, y, 'k', lw=0.6); m = np.median(y)
        ax.set_xlim(0, 10); ax.set_ylim(m - 1.5, m + 1.8); ax.set_xticks(np.arange(0, 10, 0.2)); ax.set_yticks(np.arange(round(m - 1.5, 1), m + 1.8, 0.5))
        ax.grid(True, color='#f4a0a0', lw=0.35); ax.tick_params(labelbottom=False, labelleft=False, length=0)
        ax.set_title('#%d %s %s %s t=%s FC=%s maxRR=%s' % (i, o['cat'], o['db'], o['rec'], o['t0'], o.get('hr'), o.get('maxrr')), fontsize=8, loc='left', pad=1)
    plt.tight_layout(pad=0.2, h_pad=0.25); plt.savefig('/home/claude/data/mon6/sheet_%s_%d.png' % ('-'.join(cats), k), dpi=62); plt.close()
print(len(items))
