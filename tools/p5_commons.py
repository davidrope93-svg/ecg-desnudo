"""Fase 5 · Busca ECG reales con licencia libre en Wikimedia Commons (autor, licencia y descripción de cada archivo)."""
import json, urllib.request, urllib.error, urllib.parse, re, time, html
UA = 'ECGdesnudo/0.1 (herramienta docente; https://github.com/davidrope93-svg/ecg-desnudo)'
API = 'https://commons.wikimedia.org/w/api.php?'
def get(params):
    req = urllib.request.Request(API + urllib.parse.urlencode(params), headers={'User-Agent': UA})
    for k in range(6):                       # respeta el límite de peticiones de Wikimedia
        try: return json.load(urllib.request.urlopen(req, timeout=30))
        except urllib.error.HTTPError as e:
            if e.code != 429: raise
            time.sleep(int(e.headers.get('Retry-After') or 0) or 10 * (k + 1))
    raise RuntimeError('Wikimedia sigue limitando las peticiones')
Q = {'hiperk': ['hyperkalemia ECG', 'hyperkalaemia electrocardiogram', 'HyperK'], 'hipok': ['hypokalemia ECG', 'hypokalaemia electrocardiogram'],
     'hipotermia': ['Osborn wave', 'hypothermia ECG', 'J wave hypothermia'], 'adt': ['tricyclic antidepressant ECG', 'tricyclic overdose ECG'],
     'wellens': ['Wellens syndrome', 'Wellens ECG'], 'dewinter': ['de Winter T waves', 'de Winter ECG'], 'pericarditis': ['pericarditis ECG', 'pericarditis electrocardiogram'],
     'tep': ['pulmonary embolism ECG', 'S1Q3T3'], 'alternancia': ['electrical alternans', 'pericardial effusion ECG'],
     'mp_fallo': ['pacemaker failure to capture', 'pacemaker malfunction ECG', 'failure to sense pacemaker'], 'dextrocardia': ['dextrocardia ECG'],
     'sgarbossa': ['Sgarbossa', 'LBBB myocardial infarction ECG'], 'tdp': ['torsades de pointes', 'torsade de pointes ECG']}
out = {}
for cat, qs in Q.items():
    seen = {}
    for q in qs:
        d = get(dict(action='query', generator='search', gsrsearch=q, gsrnamespace=6, gsrlimit=25, prop='imageinfo', iiprop='url|size|mime|extmetadata', iiurlwidth=1600, format='json'))
        for p in (d.get('query', {}).get('pages', {}) or {}).values():
            ii = (p.get('imageinfo') or [{}])[0]
            if ii.get('mime') not in ('image/jpeg', 'image/png') or ii.get('width', 0) < 700: continue
            em = ii.get('extmetadata', {})
            g = lambda k: html.unescape(re.sub('<[^>]+>', '', em.get(k, {}).get('value', '')))[:220]
            lic = g('LicenseShortName')
            if not re.search(r'CC BY|CC0|Public domain|PD', lic, re.I) or re.search(r'NC|ND', lic): continue
            seen[p['title']] = dict(title=p['title'], url=ii.get('thumburl') or ii['url'], page=ii.get('descriptionurl'), w=ii['width'], h=ii['height'], lic=lic, author=g('Artist'), desc=g('ImageDescription'))
        time.sleep(3)
    out[cat] = list(seen.values())
    print('==', cat, len(out[cat]))
    for x in out[cat][:12]: print('   ', x['title'][:70], '|', x['lic'], '|', x['author'][:30], '|', x['desc'][:90])
json.dump(out, open('/home/claude/data/litfl/commons.json', 'w'), ensure_ascii=False, indent=1)
