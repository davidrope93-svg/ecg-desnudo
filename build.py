"""Genera index.html (un único archivo, sin dependencias) a partir de src/. Uso: python3 build.py"""
src = lambda f: open('src/' + f, encoding='utf-8').read()
t = src('template.html')
for k, f in [('DATA', 'data.js'), ('MONDATA', 'monitor_data.js'), ('IMGDATA', 'img_data.js'), ('CONTENT', 'content.js'), ('ENGINE', 'engine.js'), ('UI', 'ui.js')]:
    t = t.replace('/*%s*/' % k, src(f), 1)
head, body = t.split('<!--BODY-->', 1)
page = ('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="theme-color" content="#16191d">\n' + head.strip() + '\n</head>\n<body>\n' + body.strip() + '\n</body>\n</html>\n')
open('index.html', 'w', encoding='utf-8').write(page)
print('index.html', len(page), 'bytes')
