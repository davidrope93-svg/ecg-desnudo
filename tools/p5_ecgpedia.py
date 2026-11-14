"""Fase 5 · Copias de ECGpedia (origen de los archivos CardioNetworks que están en Commons con CC BY-SA 3.0).
Commons limita la descarga desde la IP del contenedor (429); el archivo es el mismo y se atribuye a su página de Commons."""
import urllib.request, re, time, sys, os
UA = 'ECGdesnudo/0.1 (herramienta docente; https://github.com/davidrope93-svg/ecg-desnudo)'
M = {'E319 (CardioNetworks ECGpedia).jpg': 'E319.jpg', 'E310 (CardioNetworks ECGpedia).jpg': 'E310.jpg',
     'RBBB inf MI V4R (CardioNetworks ECGpedia).jpg': 'RBBB_inf_MI_V4R.jpg', 'De-Dextrocardia (CardioNetworks ECGpedia).jpg': 'De-Dextrocardia.jpg',
     'Rhythm torsade (CardioNetworks ECGpedia).png': 'Rhythm_torsade.png', 'ECG E000800.jpg': 'E000800.jpg'}
get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': UA}), timeout=60).read()
for title, f in M.items():
    try:
        page = get('https://en.ecgpedia.org/wiki/File:' + f).decode('utf-8', 'replace')
        m = re.search(r'href="(/images/[0-9a-f]/[0-9a-f]{2}/[^"/]+)"', page)
        if not m: print('sin enlace', f); continue
        b = get('https://en.ecgpedia.org' + m.group(1))
        out = re.sub(r'[^A-Za-z0-9]+', '_', title.rsplit('.', 1)[0]).strip('_').lower() + '.' + f.rsplit('.', 1)[1].lower()
        open(sys.argv[1] + '/' + out, 'wb').write(b); print('ok', f, len(b), '->', out)
    except Exception as e: print('error', f, e)
    time.sleep(3)
