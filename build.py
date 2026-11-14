"""Genera index.html (un único archivo, sin dependencias) y sw.js (funcionamiento sin conexión) a partir de src/. Uso: python3 build.py"""
import hashlib, json, os
src = lambda f: open('src/' + f, encoding='utf-8').read()
# Lo que la app guarda en el dispositivo para funcionar sin cobertura (unos 15 MB)
ASSETS = ['index.html', 'occ_data.js', 'manifest.webmanifest'] + ['icons/' + f for f in sorted(os.listdir('icons'))] + ['img/' + f for f in sorted(os.listdir('img'))]
# Huella del contenido: cambia con cualquier cambio de src/, del banco o de las imágenes, y con ella se renueva la caché
hs = hashlib.sha256(open('build.py', 'rb').read())
for f in sorted(os.listdir('src')):
    hs.update(f.encode()); hs.update(open('src/' + f, 'rb').read())
for f in ASSETS[1:]:
    hs.update(f.encode()); hs.update(open(f, 'rb').read())
BUILD = hs.hexdigest()[:8]
t = src('template.html')
for k, f in [('DATA', 'data.js'), ('MONDATA', 'monitor_data.js'), ('IMGDATA', 'img_data.js'), ('CONTENT', 'content.js'), ('ENGINE', 'engine.js'), ('UI', 'ui.js')]:
    t = t.replace('/*%s*/' % k, src(f), 1)
t = t.replace('__BUILD__', BUILD)
head, body = t.split('<!--BODY-->', 1)
page = ('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="theme-color" content="#16191d">\n' + head.strip() + '\n</head>\n<body>\n' + body.strip() + '\n</body>\n</html>\n')
open('index.html', 'w', encoding='utf-8').write(page)
open('sw.js', 'w', encoding='utf-8').write(src('sw.js').replace('__BUILD__', BUILD).replace('__ASSETS__', json.dumps(ASSETS)))
print('index.html', len(page), 'bytes · sw.js con', len(ASSETS), 'archivos · build', BUILD)
