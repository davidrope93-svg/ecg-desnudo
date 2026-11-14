"""Etiquetas de Chapman/Ningbo (SNOMED-CT) y SPH (AHA) en castellano. Lo no listado no se muestra."""
SN = {'426177001': 'bradicardia sinusal', '426783006': 'ritmo sinusal', '427084000': 'taquicardia sinusal', '427393009': 'arritmia sinusal',
      '164889003': 'fibrilación auricular', '164890007': 'flutter auricular', '270492004': 'BAV de primer grado', '164947007': 'PR largo',
      '54016002': 'BAV 2.º grado Mobitz I', '426183003': 'BAV 2.º grado Mobitz II', '195042002': 'BAV de segundo grado', '27885002': 'BAV completo',
      '29320008': 'ritmo de la unión', '426648003': 'taquicardia de la unión', '251166008': 'TRNAV', '233897008': 'TRAV', '713422000': 'taquicardia auricular',
      '5609005': 'paro sinusal', '65778007': 'bloqueo sinoauricular', '425856008': 'taquicardia ventricular paroxística', '61277005': 'RIVA',
      '81898007': 'ritmo de escape ventricular', '75532003': 'latido de escape ventricular', '59118001': 'BRD', '713427006': 'BRD completo', '713426002': 'BRD incompleto',
      '164909002': 'BRI', '733534002': 'BRI completo', '445118002': 'HBAI', '47665007': 'eje derecho', '39732003': 'eje izquierdo', '6374002': 'bloqueo de rama',
      '164934002': 'alteraciones de la onda T', '59931005': 'T invertida', '428750005': 'alteraciones inespecíficas del ST-T', '55930002': 'alteraciones del ST',
      '429622005': 'descenso del ST', '164930006': 'elevación del ST', '164931005': 'elevación del ST', '284470004': 'extrasístoles auriculares',
      '427172004': 'extrasístoles ventriculares', '17338001': 'extrasístoles ventriculares', '164873001': 'HVI', '89792004': 'HVD', '251146004': 'bajo voltaje',
      '164917005': 'ondas Q', '111975006': 'QT largo', '50799005': 'disociación AV', '426761007': 'TSV', '74390002': 'preexcitación (WPW)', '10370003': 'marcapasos',
      '251170000': 'extrasístole auricular bloqueada', '67741000119109': 'crecimiento auricular izquierdo', '446358003': 'crecimiento auricular derecho', '164865005': 'infarto'}
AHA = {'1': 'ECG normal', '21': 'taquicardia sinusal', '22': 'bradicardia sinusal', '23': 'arritmia sinusal', '30': 'extrasístoles auriculares',
       '36': 'extrasístoles de la unión', '37': 'escape de la unión', '50': 'fibrilación auricular', '51': 'flutter auricular', '54': 'taquicardia de la unión',
       '60': 'extrasístoles ventriculares', '82': 'PR largo', '83': 'BAV 2.º grado Mobitz I', '84': 'BAV 2.º grado Mobitz II', '85': 'BAV 2:1', '86': 'BAV de conducción variable',
       '87': 'BAV avanzado', '88': 'BAV completo', '101': 'HBAI', '102': 'HBPI', '104': 'BRI', '105': 'BRD incompleto', '106': 'BRD', '108': 'preexcitación',
       '120': 'eje derecho', '121': 'eje izquierdo', '125': 'bajo voltaje', '140': 'crecimiento auricular izquierdo', '142': 'HVI', '143': 'HVD',
       '145': 'desnivel del ST', '146': 'desnivel del ST con alteración de la T', '147': 'alteración de la onda T', '148': 'QT largo', '152': 'fusión T-U',
       '153': 'ST-T por hipertrofia', '155': 'repolarización precoz', '160': 'infarto anterior', '161': 'infarto inferior', '165': 'infarto anteroseptal', '166': 'infarto anterior extenso'}
MOD = {'308': 'ocasionales', '310': 'frecuentes', '330': 'agudo', '331': 'reciente', '332': 'antiguo', '341': 'en bigeminismo', '362': '(descenso)', '363': '(elevación)', '367': '(inversión)'}
def labels(src, dx):
    if src == 'cn':
        out = [SN[c] for c in dx if c in SN]
    else:
        out = []
        for t in str(dx).split(';'):
            p = t.split('+')
            if p[0] in AHA: out.append(' '.join([AHA[p[0]]] + [MOD[m] for m in p[1:] if m in MOD]))
    return list(dict.fromkeys(out))
SEC_SN = {'59118001': 'brd', '713427006': 'brd', '164909002': 'bri', '733534002': 'bri', '270492004': 'bav1', '445118002': 'hbai', '74390002': 'wpw'}
SEC_AHA = {'106': 'brd', '104': 'bri', '82': 'bav1', '101': 'hbai', '37': 'union'}
def secondary(src, dx, cat):
    s = set()
    if src == 'cn': s = {SEC_SN[c] for c in dx if c in SEC_SN}
    else: s = {SEC_AHA[t.split('+')[0]] for t in str(dx).split(';') if t.split('+')[0] in SEC_AHA}
    if cat in ('trnav', 'trav'): s.add('tsv')
    s.discard(cat)
    return sorted(s)
