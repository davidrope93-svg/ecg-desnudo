import pickle, sys, numpy as np, matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
c = pickle.load(open('/home/claude/data/mon/cands.pkl', 'rb'))
cat = sys.argv[1]; a = int(sys.argv[2]); b = int(sys.argv[3])
items = [(i, o) for i, o in enumerate(c) if o['cat'] in cat.split(',')][a:b]
rows = (len(items) + 1) // 2
fig, axs = plt.subplots(rows, 2, figsize=(16, 1.05 * rows), squeeze=False)
t = np.arange(2500) / 250
for k, (i, o) in enumerate(items):
    ax = axs[k // 2][k % 2]
    ax.plot(t, o['sig'], 'k', lw=0.5); ax.set_xlim(0, 10); ax.set_ylim(-2, 2)
    ax.set_xticks(np.arange(0, 10, 0.2)); ax.set_yticks(np.arange(-2, 2, 0.5)); ax.grid(True, color='#f4a0a0', lw=0.3)
    ax.tick_params(labelbottom=False, labelleft=False, length=0)
    ax.set_title(f"#{i} {o['db']}/{o['rec']} t={o['t0']}s p2p={o['p2p']}", fontsize=7, loc='left', pad=1)
for k in range(len(items), rows * 2): axs[k // 2][k % 2].axis('off')
plt.tight_layout(pad=0.2, h_pad=0.2, w_pad=0.4); out = f'/home/claude/data/mon/sheet_{cat}_{a}.png'; plt.savefig(out, dpi=58); print(out)
