/* Contenido docente por categoría. Criterios: 4.ª definición universal del infarto, ESC 2023 (SCA), ERC 2025 (arritmias periparada).
   conf = diagnósticos con los que se suele confundir: salen como opciones incorrectas. */
const GROUPS = {
  ritmo: 'Ritmo',
  cond: 'Conducción',
  isq: 'Isquemia',
  otros: 'Otros',
};
const CATS = {
  normal: {
    g: 'ritmo', name: 'ECG normal',
    claves: ['P positiva en I, II y aVF (negativa en aVR) delante de cada QRS, con PR constante de 120–200 ms', 'FC 60–100 lpm, QRS < 120 ms y eje entre −30° y +90°', 'ST isoeléctrico y T concordante con el QRS (puede ser negativa en aVR, V1 y a veces III)'],
    trampa: 'Un ECG normal no descarta un SCA. Con dolor persistente o cambio clínico, repite el ECG y compara; si la sospecha es alta, registra V7–V9 y V3R–V4R.',
    sva: 'El primer ECG normal es frecuente en el SCA precoz: ECG seriado durante la asistencia.',
    conf: ['bradi', 'taqui', 'iam_antiguo', 'hbai', 'bav1', 'scasest'],
  },
  bradi: {
    g: 'ritmo', name: 'Bradicardia sinusal',
    claves: ['Ritmo sinusal (P normal delante de cada QRS, PR constante) a < 60 lpm', 'Todas las P conducen: si sobran P, no es sinusal sino un bloqueo AV', 'QRS y repolarización normales salvo patología asociada'],
    trampa: 'Busca P escondidas en la T: un BAV 2:1 con 80 lpm auriculares da 40 lpm ventriculares y se confunde con bradicardia sinusal.',
    sva: 'Solo se trata con signos adversos (shock, síncope, isquemia, insuficiencia cardiaca): atropina 500 mcg IV, repetible cada 3–5 min hasta 3 mg; si fracasa, isoprenalina o adrenalina en perfusión o marcapasos (ERC 2025). Piensa en fármacos, hipotermia, hipoxia, HTIC e IAM inferior.',
    conf: ['bav1', 'bav3', 'normal', 'fa', 'marcapasos'],
  },
  taqui: {
    g: 'ritmo', name: 'Taquicardia sinusal',
    claves: ['Ritmo sinusal > 100 lpm: P positiva en II y aVF delante de cada QRS', 'Inicio y fin graduales', 'QRS estrecho salvo bloqueo de rama previo'],
    trampa: 'A ~150 lpm piensa en flutter 2:1 y busca ondas F en II, III, aVF y V1. Si la P cae sobre la T previa, puede parecer una TSV.',
    sva: 'Es una respuesta, no la enfermedad: dolor, fiebre, hipovolemia, hipoxia, sepsis, TEP, tóxicos. Se trata la causa, no la frecuencia.',
    conf: ['tsv', 'flutter', 'fa', 'normal', 'scasest'],
  },
  fa: {
    g: 'ritmo', name: 'Fibrilación auricular',
    claves: ['RR irregularmente irregular', 'Sin ondas P: línea de base con ondas f finas o gruesas (mejor en V1 y II)', 'QRS estrecho salvo bloqueo de rama, aberrancia o preexcitación'],
    trampa: 'Con respuesta rápida parece regular: mide varios RR con el compás. Irregular, muy rápida y con QRS anchos cambiantes = FA preexcitada: nada de frenadores del nodo AV.',
    sva: 'Inestable: cardioversión sincronizada, primera descarga a máxima energía (ERC 2025). Estable: control de frecuencia, tiempo de evolución y anticoagulación.',
    conf: ['flutter', 'taqui', 'ev', 'tsv', 'normal'],
  },
  flutter: {
    g: 'ritmo', name: 'Flutter auricular',
    claves: ['Ondas F en dientes de sierra a ~300/min, sin línea isoeléctrica, en II, III, aVF y V1', 'Conducción 2:1 (FC ~150), 3:1, 4:1 (~75) o variable', 'QRS estrecho y regular si la conducción es fija'],
    trampa: 'Taquicardia regular de QRS estrecho a ~150 lpm = flutter 2:1 hasta demostrar lo contrario: una de cada dos F queda oculta en el QRS o en la T.',
    sva: 'Las maniobras vagales o la adenosina enlentecen la respuesta y desenmascaran las F. Inestable: cardioversión sincronizada 70–120 J con aumentos escalonados (ERC 2025).',
    conf: ['fa', 'tsv', 'taqui', 'scasest', 'normal'],
  },
  tsv: {
    g: 'ritmo', name: 'TSV paroxística',
    claves: ['Taquicardia regular de QRS estrecho, habitualmente 150–250 lpm', 'P no visibles o retrógradas tras el QRS (pseudo-r′ en V1, pseudo-S en II, III y aVF en la reentrada intranodal)', 'Inicio y fin bruscos'],
    trampa: 'Descarta flutter 2:1 (~150 lpm, ondas F) y taquicardia sinusal (P delante del QRS). El descenso del ST durante la TSV es frecuente y por sí solo no indica SCA.',
    sva: 'Estable: Valsalva modificada y adenosina en bolo rápido. Inestable: cardioversión sincronizada 70–120 J (ERC 2025).',
    conf: ['taqui', 'flutter', 'fa', 'scasest', 'wpw'],
  },
  trnav: {
    g: 'ritmo', name: 'TRNAV (reentrada intranodal)',
    claves: ['Taquicardia regular de QRS estrecho, a menudo 150–250 lpm', 'P retrógrada oculta en el QRS o justo al final: pseudo-r′ en V1 y pseudo-S en II, III y aVF', 'Es la TSV paroxística más frecuente'],
    trampa: 'En la práctica es una TSV paroxística: si dudas entre TRNAV y TRAV, la actuación es la misma. Descarta flutter 2:1 (~150 lpm, ondas F).',
    sva: 'Estable: Valsalva modificada y adenosina en bolo rápido. Inestable: cardioversión sincronizada 70–120 J (ERC 2025).',
    conf: ['trav', 'tsv', 'flutter', 'taqui', 'fa'],
  },
  trav: {
    g: 'ritmo', name: 'TRAV (vía accesoria)',
    claves: ['Taquicardia regular de QRS estrecho (ortodrómica), a menudo muy rápida', 'P retrógrada visible en el ST o en la T, separada del QRS (RP > 70 ms)', 'En ritmo sinusal puede verse preexcitación (WPW) o no (vía oculta)'],
    trampa: 'Si la taquicardia es de QRS ancho (antidrómica) o irregular con QRS cambiantes (FA preexcitada), no uses frenadores del nodo AV.',
    sva: 'Ortodrómica estable: como cualquier TSV (Valsalva modificada, adenosina). Inestable: cardioversión sincronizada (ERC 2025).',
    conf: ['trnav', 'tsv', 'flutter', 'taqui', 'wpw'],
  },
  ev: {
    g: 'ritmo', name: 'Extrasístoles ventriculares',
    claves: ['QRS prematuro, ancho (≥ 120 ms) y de morfología distinta, sin P previa', 'Repolarización discordante (T opuesta al QRS)', 'Pausa compensadora completa; bigeminismo si alterna 1:1 con el latido sinusal'],
    trampa: 'Si hay una P prematura delante, es una extrasístole auricular conducida con aberrancia. En SCA, QT largo o hipopotasemia, las EV precoces (R sobre T) pueden desencadenar TV/FV.',
    sva: 'Aisladas y asintomáticas no se tratan. Con isquemia o alteración iónica: monitorización continua, corregir K+ y Mg2+ y desfibrilador preparado.',
    conf: ['fa', 'bri', 'marcapasos', 'normal', 'wpw'],
  },
  marcapasos: {
    g: 'ritmo', name: 'Ritmo de marcapasos',
    claves: ['Espícula antes del QRS (diminuta con electrodo bipolar y a menudo atenuada por los filtros del registro)', 'Estimulación en ápex del VD: QRS ancho con morfología de BRI y eje izquierdo', 'ST-T discordante con el QRS, como en el BRI'],
    trampa: 'No valores el ST con los criterios habituales: usa Sgarbossa modificado. Si no ves espícula, sospéchalo ante un QRS ancho, regular, a frecuencia fija (a menudo 60–70 lpm).',
    sva: 'Comprueba captura (cada espícula seguida de QRS y pulso) y detección. Ritmo estimulado con clínica isquémica persistente: valorar estrategia de SCACEST (ESC 2023).',
    conf: ['bri', 'ev', 'bav3', 'brd', 'hvi'],
  },
  tv: {
    g: 'ritmo', name: 'Taquicardia ventricular',
    claves: ['QRS ancho (≥ 120 ms), regular y > 100 lpm', 'Disociación AV, latidos de captura o de fusión: diagnósticos de TV', 'Apoyan TV: concordancia de los QRS en precordiales, eje extremo (QRS negativo en I y aVF) y R inicial dominante en aVR'],
    trampa: 'Toda taquicardia regular de QRS ancho es TV hasta que se demuestre lo contrario, sobre todo con cardiopatía o infarto previo. No des verapamilo ni diltiazem.',
    sva: 'Con pulso y signos adversos: cardioversión sincronizada 120–150 J con aumentos escalonados; si fracasa, amiodarona 300 mg IV en 10–20 min y nuevo intento (ERC 2025). Sin pulso: algoritmo de FV/TVSP.',
    conf: ['brd', 'bri', 'tsv', 'wpw', 'marcapasos'],
  },
  union: {
    g: 'ritmo', name: 'Ritmo de la unión',
    claves: ['QRS estrecho y regular sin P delante, o con P retrógrada (negativa en II, III y aVF) justo antes, dentro o después del QRS', 'Escape de la unión 40–60 lpm, ritmo de la unión acelerado 60–100 y taquicardia de la unión > 100', 'Aparece como escape en bradicardias y bloqueos'],
    trampa: 'Si hay P sinusales que no conducen y QRS regulares a otra frecuencia, no es un ritmo de la unión aislado: busca un BAV completo con escape de la unión.',
    sva: 'El escape no se suprime: si hay signos adversos, trata la bradicardia de base. Piensa en digoxina, betabloqueantes, IAM inferior e hiperpotasemia.',
    conf: ['bradi', 'bav3', 'fa', 'normal', 'bav1'],
  },
  paro: {
    g: 'ritmo', name: 'Pausa sinusal (paro o bloqueo SA)',
    claves: ['Ausencia brusca de P y QRS durante una pausa', 'Bloqueo sinoauricular: la pausa es múltiplo exacto del PP previo; paro sinusal: no lo es', 'Puede terminar con un latido de escape de la unión o ventricular'],
    trampa: 'Una extrasístole auricular bloqueada produce una pausa parecida: busca una P prematura deformando la T previa.',
    sva: 'Pausas largas con síncope o signos adversos: tratar como bradicardia (atropina, marcapasos; ERC 2025). Piensa en enfermedad del nodo sinusal, fármacos, vagotonía e hiperpotasemia.',
    conf: ['bav2alto', 'mobitz1', 'bradi', 'bav3', 'fa'],
  },
  bav1: {
    g: 'cond', name: 'BAV de primer grado',
    claves: ['PR > 200 ms y constante', 'Todas las P conducen (una P por cada QRS)', 'QRS habitualmente estrecho'],
    trampa: 'Con PR muy largo la P cae dentro de la T previa y puede parecer un ritmo de la unión. Mide el PR donde mejor se vea la P (II o V1).',
    sva: 'Benigno por sí mismo. Piensa en frenadores (betabloqueantes, calcioantagonistas, digoxina), vagotonía e IAM inferior.',
    conf: ['normal', 'bradi', 'bav3', 'wpw', 'hbai'],
  },
  mobitz1: {
    g: 'cond', name: 'BAV 2.º grado Mobitz I (Wenckebach)',
    claves: ['PR que se alarga latido a latido hasta que una P no conduce', 'Tras la P bloqueada, el PR vuelve a ser el más corto', 'Latidos agrupados; la pausa mide menos de dos RR; QRS habitualmente estrecho'],
    trampa: 'Compara el PR justo antes y justo después de la pausa: si es igual, piensa en Mobitz II. Con conducción 2:1 no se puede saber el tipo.',
    sva: 'Suele ser nodal y benigno (vagotonía, fármacos, IAM inferior). Solo se trata con signos adversos: atropina 500 mcg IV, repetible cada 3–5 min hasta 3 mg (ERC 2025).',
    conf: ['bav2alto', 'bav1', 'bav3', 'paro', 'bradi'],
  },
  bav2alto: {
    g: 'cond', name: 'BAV 2.º grado Mobitz II, 2:1 o avanzado',
    claves: ['Mobitz II: PR constante y, de repente, una P que no conduce', 'BAV 2:1: una P conducida y otra bloqueada; no permite saber si es tipo I o II', 'Avanzado (alto grado): dos o más P consecutivas sin conducir'],
    trampa: 'Busca la P bloqueada dentro de la T previa. Con QRS ancho el bloqueo suele ser infrahisiano y puede pasar a BAV completo sin aviso.',
    sva: 'Riesgo de asistolia: monitorización y parches colocados. Con signos adversos: atropina si el QRS es estrecho; con QRS ancho no la uses (ERC 2025). Marcapasos transcutáneo como puente, isoprenalina o adrenalina en perfusión.',
    conf: ['mobitz1', 'bav3', 'bradi', 'paro', 'bav1'],
  },
  bav3: {
    g: 'cond', name: 'BAV completo',
    claves: ['Disociación AV: P regulares y QRS regulares sin relación (PR variable)', 'Frecuencia auricular mayor que la ventricular', 'Escape de la unión (QRS estrecho, 40–60 lpm) o ventricular (QRS ancho, 20–40 lpm)'],
    trampa: 'Marca dos P con el compás y desplázalo: las P «marchan» a través de los QRS. Si alguna P conduce, no es completo.',
    sva: 'Con escape de QRS ancho la atropina no es eficaz y puede empeorar el bloqueo: marcapasos transcutáneo como puente, isoprenalina o adrenalina en perfusión (ERC 2025). En el IAM inferior suele ser nodal, con escape estrecho y transitorio.',
    conf: ['bradi', 'bav1', 'marcapasos', 'bri', 'ev'],
  },
  brd: {
    g: 'cond', name: 'Bloqueo de rama derecha',
    claves: ['QRS ≥ 120 ms', 'rSR′ («orejas de conejo») en V1–V2', 'S ancha y empastada en I, aVL, V5 y V6', 'T negativa en V1–V3 secundaria (esperable)'],
    trampa: 'El BRD no impide valorar un SCACEST: la elevación del ST sigue siendo interpretable. BRD + taquicardia + S1Q3T3 orienta a TEP; elevación del ST en cúpula ≥ 2 mm en V1–V2 con T negativa: Brugada tipo 1.',
    sva: 'BRD con clínica isquémica persistente: valorar estrategia de SCACEST (ESC 2023).',
    conf: ['bri', 'bifasc', 'scacest_ant', 'wpw', 'hbai'],
  },
  bri: {
    g: 'cond', name: 'Bloqueo de rama izquierda',
    claves: ['QRS ≥ 120 ms', 'QS o rS ancho en V1–V3', 'R ancha y mellada sin q en I, aVL, V5 y V6', 'ST-T discordante (opuesto al QRS): es lo esperado'],
    trampa: 'Criterios de Sgarbossa: elevación del ST concordante ≥ 1 mm, descenso del ST concordante ≥ 1 mm en V1–V3 o elevación discordante desproporcionada (Smith: ST ≥ 25 % de la S) sugieren oclusión coronaria.',
    sva: 'BRI con clínica isquémica persistente: valorar estrategia de SCACEST (ESC 2023), sobre todo si cumple Sgarbossa.',
    conf: ['brd', 'marcapasos', 'hvi', 'scacest_ant', 'wpw'],
  },
  hbai: {
    g: 'cond', name: 'Hemibloqueo anterior izquierdo',
    claves: ['Eje del QRS ≤ −45°', 'rS en II, III y aVF; qR en aVL', 'QRS < 120 ms'],
    trampa: 'No lo confundas con necrosis inferior: en el HBAI hay r inicial en II, III y aVF (rS); en la necrosis inferior, QS o Qr.',
    sva: 'Aislado no requiere actuación. Junto a un BRD forma un bloqueo bifascicular.',
    conf: ['iam_antiguo', 'bifasc', 'normal', 'hvi', 'bav1'],
  },
  bifasc: {
    g: 'cond', name: 'Bloqueo bifascicular (BRD + HBAI)',
    claves: ['Criterios de BRD: QRS ≥ 120 ms, rSR′ en V1, S ancha en I y V6', 'Eje ≤ −45° con rS en II, III y aVF', 'Puede asociar PR largo'],
    trampa: 'Mira siempre el eje: un BRD con eje izquierdo extremo no es un BRD aislado.',
    sva: 'Con síncope, sospecha BAV paroxístico de alto grado: monitorización continua y parches de marcapasos colocados.',
    conf: ['brd', 'bri', 'hbai', 'bav3', 'marcapasos'],
  },
  wpw: {
    g: 'cond', name: 'Preexcitación (WPW)',
    claves: ['PR corto (< 120 ms)', 'Onda delta: empastamiento inicial del QRS', 'QRS ancho con alteraciones secundarias de la repolarización'],
    trampa: 'Puede imitar un infarto (pseudo-Q por delta negativa), una HVI o un bloqueo de rama. En FA preexcitada no uses adenosina, verapamilo, diltiazem, betabloqueantes ni digoxina.',
    sva: 'Taquicardia preexcitada inestable: cardioversión sincronizada.',
    conf: ['bri', 'brd', 'hvi', 'iam_antiguo', 'bav1'],
  },
  scacest_ant: {
    g: 'isq', name: 'SCACEST anterior',
    claves: ['Elevación del ST en ≥ 2 derivaciones contiguas de V1–V4 (V2–V3: ≥ 2 mm en varones ≥ 40 años, ≥ 2,5 mm en < 40 y ≥ 1,5 mm en mujeres; resto ≥ 1 mm)', 'Puede extenderse a I, aVL, V5 y V6 (anterolateral)', 'En evolución: QS en V1–V3 y T negativas; puede haber descenso especular en cara inferior'],
    trampa: 'Distínguelo de la repolarización precoz (ST cóncavo, muesca en J, sin especular) y del aneurisma (QS con elevación persistente en un IAM antiguo). Ante la duda, ECG seriado y comparar con previos.',
    sva: 'Activar Codican. Riesgo alto de FV en las primeras horas: monitorización continua y parches colocados.',
    conf: ['iam_antiguo', 'scasest', 'scacest_inf', 'bri', 'hvi'],
  },
  scacest_inf: {
    g: 'isq', name: 'SCACEST inferior',
    claves: ['Elevación del ST ≥ 1 mm en ≥ 2 de II, III y aVF', 'Descenso especular en I y aVL (muy específico)', 'ST en III > II orienta a coronaria derecha', 'Descenso del ST en V1–V3: afectación posterior, registra V7–V9'],
    trampa: 'Registra V3R–V4R: la elevación del ST en V4R indica afectación del VD (precarga-dependiente: evita nitratos y asegura volumen). Bradicardia y BAV son frecuentes.',
    sva: 'Activar Codican. Vigila bradicardia, BAV e hipotensión.',
    conf: ['scacest_ant', 'iam_antiguo', 'scasest', 'bav3', 'hbai'],
  },
  scasest: {
    g: 'isq', name: 'Descenso del ST (SCASEST)',
    claves: ['Descenso del ST horizontal o descendente ≥ 0,5 mm en ≥ 2 derivaciones contiguas', 'Puede acompañarse de T negativas', 'Sin elevación del ST que cumpla criterios de SCACEST'],
    trampa: 'Descenso máximo en V1–V3: posible IAM posterior, registra V7–V9. Descenso ≥ 1 mm en ≥ 8 derivaciones con elevación en aVR y/o V1: lesión de tronco o multivaso. Descarta causas secundarias: HVI, BRI, digoxina, taquicardia.',
    sva: 'SCASEST de muy alto riesgo (inestabilidad, dolor refractario, arritmias, insuficiencia cardiaca): estrategia invasiva inmediata (< 2 h), contacto con hemodinámica (ESC 2023).',
    conf: ['digital', 'hvi', 'scacest_ant', 'normal', 'iam_antiguo'],
  },
  iam_antiguo: {
    g: 'isq', name: 'Necrosis antigua (ondas Q)',
    claves: ['Ondas Q patológicas: ≥ 30 ms y ≥ 1 mm de profundidad (o QS) en 2 derivaciones contiguas; en V2–V3, cualquier Q ≥ 20 ms o QS', 'Sin elevación aguda del ST', 'T aplanadas o negativas residuales; pérdida de R en precordiales en la necrosis anterior'],
    trampa: 'El aneurisma ventricular mantiene elevación del ST con QS durante meses. Solo la comparación con ECG previos y la clínica permiten separarlo de un IAM agudo.',
    sva: 'Pide siempre ECG previos (informes, historia digital, familia): la comparación cambia la decisión.',
    conf: ['scacest_ant', 'scacest_inf', 'hbai', 'normal', 'scasest'],
  },
  hvi: {
    g: 'otros', name: 'Hipertrofia ventricular izquierda',
    claves: ['Voltaje: Sokolow-Lyon (S V1 + R V5 o V6 ≥ 35 mm) o Cornell (R aVL + S V3 > 28 mm en varones, > 20 mm en mujeres)', 'Sobrecarga: ST descendente con T asimétrica negativa en I, aVL, V5 y V6', 'Puede haber crecimiento auricular izquierdo y eje izquierdo'],
    trampa: 'La sobrecarga imita isquemia lateral, y la elevación discordante del ST en V1–V3 imita un SCACEST anterior. Compara con ECG previos.',
    sva: 'Por sí sola no es urgente, pero condiciona la lectura del ST. Sugiere HTA de larga evolución, estenosis aórtica o miocardiopatía hipertrófica.',
    conf: ['scasest', 'bri', 'digital', 'scacest_ant', 'normal'],
  },
  qt_largo: {
    g: 'otros', name: 'QT largo',
    claves: ['QTc > 450 ms en varones y > 460 ms en mujeres; > 500 ms, riesgo alto de torsade de pointes', 'Mide en II o V5 desde el inicio del QRS hasta el final de la T (método de la tangente)', 'Regla rápida a 60–100 lpm: si el QT supera la mitad del RR, probablemente está alargado'],
    trampa: 'No incluyas la onda U. Busca la causa: fármacos (antiarrítmicos, macrólidos, quinolonas, antipsicóticos, ondansetrón, metadona), hipopotasemia, hipomagnesemia, hipocalcemia o formas congénitas.',
    sva: 'No añadas fármacos que alarguen el QT. Torsade de pointes: sulfato de magnesio 2 g IV en 10 min y corregir el K+ (ERC).',
    conf: ['normal', 'scasest', 'hvi', 'digital', 'bav1'],
  },
  digital: {
    g: 'otros', name: 'Efecto digitálico',
    claves: ['Descenso del ST cóncavo «en cubeta», sobre todo en derivaciones con R alta', 'T aplanada o bifásica y QT acortado', 'Frecuente en pacientes en FA'],
    trampa: 'Es efecto, no intoxicación. La intoxicación da casi cualquier arritmia (EV y bigeminismo, taquicardia auricular con bloqueo, BAV, TV bidireccional) con clínica digestiva o visual e hiperpotasemia.',
    sva: 'Pregunta por digoxina, función renal y K+. En la intoxicación grave hay antídoto (fragmentos Fab antidigoxina).',
    conf: ['scasest', 'hvi', 'fa', 'qt_largo', 'normal'],
  },
};

/* Informe del cardiólogo (códigos SCP de PTB-XL) en castellano */
const CODES = {
  NORM: 'ECG normal', SARRH: 'arritmia sinusal', SBRAD: 'bradicardia sinusal', STACH: 'taquicardia sinusal', AFIB: 'fibrilación auricular', AFLT: 'flutter auricular',
  PACE: 'marcapasos', PVC: 'extrasístoles ventriculares', PAC: 'extrasístoles auriculares', BIGU: 'bigeminismo', TRIGU: 'trigeminismo', SVARR: 'arritmia supraventricular',
  SVTAC: 'taquicardia supraventricular', PSVT: 'TSV paroxística', '1AVB': 'BAV de primer grado', '2AVB': 'BAV de segundo grado', '3AVB': 'BAV completo',
  CLBBB: 'BRI completo', ILBBB: 'BRI incompleto', CRBBB: 'BRD completo', IRBBB: 'BRD incompleto', LAFB: 'HBAI', LPFB: 'HBPI', IVCD: 'trastorno inespecífico de la conducción intraventricular',
  WPW: 'preexcitación (WPW)', LVH: 'HVI', RVH: 'HVD', SEHYP: 'hipertrofia septal', 'LAO/LAE': 'crecimiento auricular izquierdo', 'RAO/RAE': 'crecimiento auricular derecho',
  IMI: 'infarto inferior', ASMI: 'infarto anteroseptal', AMI: 'infarto anterior', ALMI: 'infarto anterolateral', LMI: 'infarto lateral', ILMI: 'infarto inferolateral',
  IPLMI: 'infarto inferoposterolateral', IPMI: 'infarto inferoposterior', PMI: 'infarto posterior',
  INJAS: 'lesión subendocárdica anteroseptal', INJAL: 'lesión subendocárdica anterolateral', INJIN: 'lesión subendocárdica inferior', INJLA: 'lesión subendocárdica lateral', INJIL: 'lesión subendocárdica inferolateral',
  ISC_: 'isquemia inespecífica', ISCAL: 'isquemia anterolateral', ISCAS: 'isquemia anteroseptal', ISCIN: 'isquemia inferior', ISCLA: 'isquemia lateral', ISCIL: 'isquemia inferolateral', ISCAN: 'isquemia anterior',
  NST_: 'alteraciones inespecíficas del ST', NDT: 'alteraciones inespecíficas de la T', STD_: 'descenso inespecífico del ST', STE_: 'elevación inespecífica del ST', LNGQT: 'QT largo',
  DIG: 'efecto digitálico', EL: 'alteración electrolítica o farmacológica', ANEUR: 'ST-T compatible con aneurisma ventricular', ABQRS: 'QRS anómalo', QWAVE: 'ondas Q', LOWT: 'T de bajo voltaje',
  INVT: 'T invertidas', LVOLT: 'bajo voltaje en miembros', HVOLT: 'alto voltaje', LPR: 'PR corto', TAB_: 'anomalía de la T', VCLVH: 'criterios de voltaje de HVI', NT_: 'cambios inespecíficos de la T',
};
const STAGES = { 'Stadium I': 'fase aguda', 'Stadium I-II': 'fase aguda-subaguda', 'Stadium II': 'fase subaguda', 'Stadium II-III': 'fase subaguda-crónica', 'Stadium III': 'fase crónica' };

if (typeof module !== 'undefined') module.exports = { GROUPS, CATS, CODES, STAGES };

/* ---------- Modo monitor (fase 1) ----------
   Ritmos de parada y periparada en tira de monitor. Conducta según ERC 2025 (SVA adulto y arritmias periparada). */
const MON_CATS = {
  fv: {
    name: 'Fibrilación ventricular',
    claves: ['Ondulaciones caóticas, irregulares en amplitud, forma y frecuencia', 'Sin QRS, ST ni T identificables', 'Gruesa o fina: la amplitud cae con el tiempo de parada'],
    trampa: 'El artefacto de compresiones y de movimiento imita una FV: analiza solo en la pausa. La FV fina parece asistolia a ×1: sube la ganancia y mira otra derivación antes de decidir.',
    sva: 'Desfibrilable. ERC 2025: descarga en cuanto se identifica, también si es fina. Primera descarga bifásica ≥ 150 J (130–150 J si es pulsada) y RCP 2 min sin comprobar pulso. Adrenalina 1 mg y amiodarona 300 mg tras la 3.ª descarga. FV refractaria tras 3 descargas: considera cambiar los parches a posición anteroposterior.',
  },
  flv: {
    name: 'Flutter ventricular',
    claves: ['Onda sinusoidal regular y muy rápida, en torno a 300/min', 'No se distinguen QRS, ST ni T', 'Suele degenerar en FV'],
    trampa: 'Se confunde con una TV muy rápida. Sin pulso da igual el nombre: las dos se desfibrilan.',
    sva: 'Desfibrilable: igual que la FV (ERC 2025).',
  },
  tv: {
    name: 'TV monomorfa',
    claves: ['QRS ancho (≥ 120 ms), regular y de morfología uniforme', 'Frecuencia > 100 lpm, a menudo 150–250', 'Si se ven: disociación AV, latidos de captura y de fusión'],
    trampa: 'El monitor no te dice si hay pulso: compruébalo. Sin pulso se desfibrila; con pulso y signos adversos se cardiovierte sincronizada. Una TV muy rápida y sinusoidal se confunde con flutter ventricular.',
    sva: 'Sin pulso: como la FV. Con pulso y signos adversos: cardioversión sincronizada, primera descarga 120–150 J con aumentos escalonados; si fracasa, amiodarona 300 mg IV en 10–20 min y nuevo intento (ERC 2025). Sedoanalgesia si está consciente.',
  },
  asis: {
    name: 'Asistolia',
    claves: ['Sin actividad eléctrica ventricular', 'Línea casi plana con ligera ondulación de la línea de base', 'Puede haber ondas P sin QRS (parada ventricular)'],
    trampa: 'Antes de llamarla asistolia: electrodos y cables conectados, ganancia ×2–×4 y otra derivación. Busca ondas P: la parada ventricular puede responder al marcapasos (ERC 2025). Una FV fina claramente identificada se desfibrila.',
    sva: 'No desfibrilable: RCP de calidad, adrenalina 1 mg lo antes posible y cada 3–5 min, y causas reversibles (4H y 4T).',
  },
  riva: {
    name: 'RIVA',
    claves: ['QRS ancho y regular, de origen ventricular', 'Más rápido que un escape ventricular (20–40 lpm) y más lento que una TV', 'Inicio y fin graduales, a menudo con latidos de fusión'],
    trampa: 'No es una TV: es típico de la reperfusión (tras ICP, fibrinólisis o RCE) y suele ser bien tolerado y autolimitado.',
    sva: 'No se trata con antiarrítmicos ni se cardiovierte: monitorizar. Si no hay pulso, es una AESP.',
  },
  bigem: {
    name: 'Bigeminismo ventricular',
    claves: ['Cada latido sinusal va seguido de una extrasístole ventricular', 'EV ancha y prematura, con pausa compensadora', 'Alternancia 1:1 mantenida'],
    trampa: 'Las EV pueden no generar pulso eficaz: el pulso palpado puede ser la mitad de la FC que marca el monitor.',
    sva: 'No desfibrilable. Busca la causa: isquemia, hipopotasemia, hipomagnesemia, fármacos, hipoxia. Monitorización continua.',
  },
  sinusal: {
    name: 'Ritmo sinusal',
    claves: ['QRS estrecho y regular', 'Onda P delante de cada QRS', 'Frecuencia 60–100 lpm'],
    trampa: 'Un ritmo organizado en el monitor no garantiza pulso. Sin pulso es una AESP: no desfibrilable.',
    sva: 'AESP: RCP, adrenalina 1 mg lo antes posible, causas reversibles y ecografía en las pausas. Con pulso: tratamiento según el cuadro clínico.',
  },
};
const CONDUCTAS = {
  descarga: 'Desfibrilar (descarga no sincronizada) y RCP 2 min',
  cardioversion: 'Cardioversión eléctrica sincronizada',
  rcp_adr: 'RCP 2 min y adrenalina 1 mg, sin descarga',
  observar: 'No descargar: monitorizar y tratar la causa',
};
const CONTEXTOS = {
  parada: 'Inconsciente, no respira con normalidad y sin pulso central. RCP en curso: pausa para analizar el ritmo.',
  inestable: 'Consciente, con pulso. TAS 75 mmHg, frío, sudoroso y con dolor torácico.',
  pulso: 'Consciente y con pulso. TA 120/75 mmHg, buena perfusión.',
};
const CONTEXTO_RIVA = 'SCACEST en tratamiento: con pulso, TA 115/70 mmHg y buena perfusión.';
const CONDUCTA_OK = { fv: { parada: 'descarga' }, flv: { parada: 'descarga' }, tv: { parada: 'descarga', inestable: 'cardioversion' }, asis: { parada: 'rcp_adr' }, riva: { pulso: 'observar' }, bigem: { pulso: 'observar' }, sinusal: { parada: 'rcp_adr', pulso: 'observar' } };

if (typeof module !== 'undefined') module.exports.MON = { MON_CATS, CONDUCTAS, CONTEXTOS, CONDUCTA_OK };

/* ---------- Oclusión coronaria real (fase 3, STAFF III) ----------
   ECG registrados mientras un balón de angioplastia ocluye por completo una coronaria durante minutos. */
const OCC_CATS = {
  basal: {
    name: 'Sin oclusión (basal)', opt: 'No: ECG basal',
    claves: ['ECG del mismo paciente en la sala de hemodinámica, antes de inflar el balón', 'Puede no ser normal: necrosis previas, bloqueos o alteraciones crónicas de la repolarización', 'Es la referencia para juzgar cualquier cambio posterior'],
    trampa: 'Sin un ECG previo, un cambio pequeño del ST es muy difícil de interpretar. Pide siempre el ECG previo y repite el tuyo si el dolor persiste.',
    sva: 'Dolor torácico con ECG no diagnóstico: ECG seriados y, si la sospecha es alta, V7–V9 y V3R–V4R (ESC 2023).',
  },
  da: {
    name: 'Oclusión de la descendente anterior (DA)', opt: 'Sí: DA',
    claves: ['Elevación del ST en V1–V4, máxima en V2–V3', 'Oclusión proximal: también en I y aVL, con descenso especular en II, III y aVF', 'En los primeros minutos: T altas, anchas y simétricas (hiperagudas) antes de que suba el ST'],
    trampa: 'Unas T hiperagudas sin elevación del ST ya pueden ser una oclusión. El patrón de de Winter (descenso del ST ascendente con T altas y simétricas en precordiales) equivale a una oclusión de la DA.',
    sva: 'Activar Codican. Riesgo alto de FV: monitorización y parches colocados.',
  },
  cd: {
    name: 'Oclusión de la coronaria derecha (CD)', opt: 'Sí: CD',
    claves: ['Elevación del ST en II, III y aVF, mayor en III que en II', 'Descenso especular en I y aVL, a menudo el primer signo', 'Descenso en V1–V3 si hay afectación posterior; elevación en V4R si hay afectación del VD (oclusión proximal)'],
    trampa: 'Bradicardia, BAV e hipotensión son frecuentes. Si hay afectación del VD, evita nitratos y asegura la precarga.',
    sva: 'Activar Codican. Registra V3R–V4R y V7–V9.',
  },
  cx: {
    name: 'Oclusión de la circunfleja (Cx)', opt: 'Sí: Cx',
    claves: ['A menudo poco expresiva en las 12 derivaciones convencionales', 'Descenso del ST en V1–V3: imagen especular de la cara posterior', 'Puede elevar el ST en II, III, aVF y V5–V6 (inferolateral) o en I y aVL'],
    trampa: 'Con dolor y descenso del ST máximo en V1–V3, registra V7–V9 antes de etiquetarlo de SCASEST: una elevación del ST ≥ 0,5 mm en V7–V9 indica IAM posterior (ESC 2023).',
    sva: 'Si V7–V9 confirman la elevación, es un SCACEST: activar Codican.',
  },
};
if (typeof module !== 'undefined') module.exports.OCC = { OCC_CATS };
