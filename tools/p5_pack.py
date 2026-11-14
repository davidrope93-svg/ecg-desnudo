"""Fase 5 · Empaqueta las imágenes revisadas: tools/p5_final.json + metadatos de Commons -> img/*.jpg y src/img_data.js.
Uso: python3 tools/p5_pack.py  (las imágenes originales y meta.json están en /home/claude/data/litfl)"""
import json, os, re
from PIL import Image
D = '/home/claude/data/litfl'
FIN = json.load(open('tools/p5_final.json', encoding='utf-8'))
META = json.load(open(D + '/meta.json', encoding='utf-8'))
slug = lambda t: re.sub(r'[^A-Za-z0-9]+', '_', t.rsplit('.', 1)[0]).strip('_').lower()
os.makedirs('img', exist_ok=True)
out, keep = [], set()
for f in FIN:
    m = META['File:' + f['src']]
    srcf = next(D + '/img/' + x for x in os.listdir(D + '/img') if x.rsplit('.', 1)[0] == slug(f['src']))
    im = Image.open(srcf).convert('RGB')
    if im.width > 1600: im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    fn = f['id'] + '.jpg'; keep.add(fn)
    im.save('img/' + fn, 'JPEG', quality=82, optimize=True, progressive=True)
    lic = m['lic'].replace('Public domain', 'Dominio público')
    e = dict(id=f['id'], c=f['c'], file=fn, w=im.width, h=im.height, title=f['src'].rsplit('.', 1)[0], page=m['page'], autor=f['autor'], lic=lic, licurl=m['licurl'], nota=f['nota'])
    for k in ('ctx', 'ctxFijo', 'sec', 'acc', 'parcial', 'q', 'par', 'parLabel', 'origen'):
        if k in f: e[k] = f[k]
    out.append(e)
for x in os.listdir('img'):
    if x not in keep: os.remove('img/' + x)
js = '/* Fase 5 · ECG en imagen de Wikimedia Commons. Generado por tools/p5_pack.py */\nvar IMG_META = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
js += "if (typeof module !== 'undefined') module.exports = { IMG_META };\n"
open('src/img_data.js', 'w', encoding='utf-8').write(js)
tot = sum(os.path.getsize('img/' + x) for x in keep)
print(len(out), 'imágenes,', len([e for e in out if e.get('q') is not False]), 'de práctica,', round(tot / 1e6, 2), 'MB')
from collections import Counter; print(Counter(e['c'] for e in out))
