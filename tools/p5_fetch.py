"""Fase 5 · Descarga (a 1600 px) y metadatos completos de las imágenes preseleccionadas de Wikimedia Commons."""
import json, urllib.request, urllib.parse, urllib.error, re, html, time, os
UA = 'ECGdesnudo/0.1 (herramienta docente; https://github.com/davidrope93-svg/ecg-desnudo)'
SEL = {
 'hiperk': ['118 (CardioNetworks ECGpedia).jpg', 'HyperK7.6.jpg', 'Hyperkalemia ECG.jpg'],
 'hipok': ['HypoK2.4.jpg', 'LowKECG.JPG', 'Hypokalemia (CardioNetworks ECGpedia).jpg'],
 'hipotermia': ['HypothermiaECG.jpg'],
 'wellens': ['Wellens1.JPG', 'Wellens2.JPG', 'WellensPain.JPG', 'WellensPainfree.JPG', "Wellens' Syndrome.png"],
 'dewinter': ['DeWinterECG.jpg'],
 'pericarditis': ['Acute pericarditis.jpg', 'Pericarditis10.JPG', 'Pericarditis2012.jpg', 'Pericarditis2016.jpg', 'PericarditisECG.JPG'],
 'tep': ['E000584 (CardioNetworks ECGpedia).jpg', 'Pulm embolism.jpg', 'Pulmonary embolism ECG.jpg', 'ECG QR pattern in V1 (Kucher sing) in pulmonary embolism.jpg'],
 'alternancia': ['Electrical Alternans.JPG', 'Pericardial effusion with tamponade.png', 'PulsusAlternans (CardioNetworks ECHOpedia).jpg'],
 'mp_fallo': ['E0003153 (CardioNetworks ECGpedia).jpg', 'E0003154 (CardioNetworks ECGpedia).jpg', 'E0003143 (CardioNetworks ECGpedia).jpg', 'E0003123 (CardioNetworks ECGpedia).jpg'],
 'dextrocardia': ['De-Dextrocardia (CardioNetworks ECGpedia).jpg'],
 'sgarbossa': ['E319 (CardioNetworks ECGpedia).jpg'],
 'vd': ['RBBB inf MI V4R (CardioNetworks ECGpedia).jpg', 'E208 (CardioNetworks ECGpedia).jpg'],
 'posterior': ['E310 (CardioNetworks ECGpedia).jpg'],
 'digital_tox': ['E000760 (CardioNetworks ECGpedia).jpg'],
 'htic': ['CNSinjury.JPG', 'STHeadinjury.JPG'],
 'hipocalcemia': ['ECG E000800.jpg', 'ECG Hypocalcemia.jpg'],
 'tdp': ['Rhythm torsade (CardioNetworks ECGpedia).png'],
}
def api(params):
    req = urllib.request.Request('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(params), headers={'User-Agent': UA})
    for k in range(6):
        try: return json.load(urllib.request.urlopen(req, timeout=30))
        except urllib.error.HTTPError as e:
            if e.code != 429: raise
            time.sleep(int(e.headers.get('Retry-After') or 0) or 10 * (k + 1))
titles = ['File:' + t for ts in SEL.values() for t in ts]
meta = json.load(open('meta.json')) if os.path.exists('meta.json') else {}
titles_q = [t for t in titles if t not in meta]
for i in range(0, len(titles_q), 20):
    d = api(dict(action='query', titles='|'.join(titles_q[i:i + 20]), prop='imageinfo', iiprop='url|size|mime|extmetadata', iiurlwidth=1600, format='json'))
    for p in d['query']['pages'].values():
        ii = (p.get('imageinfo') or [{}])[0]; em = ii.get('extmetadata', {})
        g = lambda k: html.unescape(re.sub('<[^>]+>', ' ', em.get(k, {}).get('value', ''))).strip()
        meta[p['title']] = dict(url=ii.get('thumburl') or ii.get('url'), page=ii.get('descriptionurl'), lic=g('LicenseShortName'), licurl=g('LicenseUrl'), author=re.sub(r'\s+', ' ', g('Artist')), desc=re.sub(r'\s+', ' ', g('ImageDescription')), credit=re.sub(r'\s+', ' ', g('Credit')))
    time.sleep(2)
json.dump(meta, open('meta.json', 'w'), ensure_ascii=False, indent=1)
out = []
for cat, ts in SEL.items():
    for t in ts:
        m = meta.get('File:' + t)
        if not m or not m['url']: print('sin datos', t); continue
        ext = urllib.parse.urlsplit(m['url']).path.rsplit('.', 1)[-1].lower().replace('jpeg', 'jpg')
        fn = re.sub(r'[^A-Za-z0-9]+', '_', t.rsplit('.', 1)[0]).strip('_').lower() + '.' + ext
        if not (os.path.exists('img/' + fn) and os.path.getsize('img/' + fn) > 0):
            req = urllib.request.Request(m['url'], headers={'User-Agent': UA})
            for k in range(6):
                try:
                    b = urllib.request.urlopen(req, timeout=60).read(); open('img/' + fn, 'wb').write(b); break
                except urllib.error.HTTPError as e:
                    if e.code != 429: raise
                    ra = int(e.headers.get('Retry-After') or 0) or 20
                    print('429', t, 'intento', k + 1, 'espera', ra + 30 * k, flush=True)
                    time.sleep(ra + 30 * k)
            else: print('fallo', t, flush=True); continue
            print('ok', t, flush=True)
            time.sleep(4)
        out.append(dict(cat=cat, title=t, file=fn, **m))
json.dump(out, open('sel.json', 'w'), ensure_ascii=False, indent=1)
for o in out: print(o['cat'], '|', o['title'][:40], '|', o['lic'], '|', o['author'][:40], '|', o['desc'][:260])
