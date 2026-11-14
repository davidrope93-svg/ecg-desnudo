import pickle, sys
sys.path.insert(0, '/home/claude/ecg-desnudo/tools'); from p2_load import load, sheet
SN = {'54016002': 'MobI', '426183003': 'MobII', '195042002': '2AVB', '27885002': '3AVB', '29320008': 'JR', '426648003': 'JT', '251166008': 'AVNRT', '233897008': 'AVRT',
      '713422000': 'AT', '5609005': 'SArrest', '65778007': 'SAB', '164896001': 'VF', '425856008': 'pVT', '111288001': 'VFL', '61277005': 'AIVR', '81898007': 'VEscape',
      '426177001': 'SB', '426783006': 'SR', '427084000': 'ST', '164889003': 'AF', '164890007': 'AFL', '59118001': 'RBBB', '164909002': 'LBBB', '10370003': 'Pace',
      '50799005': 'AVdiss', '426761007': 'SVT', '284470004': 'PAC', '427172004': 'PVC', '17338001': 'VPB', '270492004': '1AVB'}
k = pickle.load(open('/home/claude/data/p2_keep.pkl', 'rb'))
cats = sys.argv[1].split(','); a, b = int(sys.argv[2]), int(sys.argv[3])
pool = [(i, x) for i, x in enumerate(k) if x['cat'] in cats]
pool.sort(key=lambda t: (t[1]['src'] != 'sph', t[0]))
items = []
for i, x in pool[a:b]:
    dx = x['dx'] if x['src'] == 'sph' else ','.join(SN.get(d, d) for d in x['dx'])
    f = x['f']
    items.append((f"#{i} [{x['cat']}] {x['src']}:{x['id']} dx={dx} | FC{f['hr']} cv{f['cv']} pausa{f['pause']} maxRR{f['maxrr']}", load(x['src'], x['id'])))
out = f"/home/claude/data/p2_{'-'.join(cats)}_{a}.png"; sheet(items, out); print(out)
