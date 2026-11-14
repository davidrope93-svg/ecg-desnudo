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
  fa_preex: {
    g: 'ritmo', name: 'FA preexcitada (WPW)',
    claves: ['Ritmo irregularmente irregular', 'QRS anchos y de morfología cambiante latido a latido (grado variable de preexcitación)', 'Puede ser muy rápida: RR preexcitados muy cortos (≤ 250 ms) indican una vía accesoria peligrosa'],
    trampa: 'No es una TV ni una FA con bloqueo de rama: la irregularidad y los QRS cambiantes la delatan. Nada de adenosina, verapamilo, diltiazem, betabloqueantes ni digoxina: favorecen la conducción por la vía y puede degenerar en FV.',
    sva: 'Inestable: cardioversión eléctrica sincronizada. Estable: la cardioversión eléctrica también es segura; los antiarrítmicos indicados (procainamida, ibutilida) son de uso hospitalario (ESC 2019).',
    conf: ['fa', 'tv', 'bri', 'brd', 'wpw'],
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
  brugada: {
    g: 'otros', name: 'Patrón de Brugada tipo 1',
    claves: ['Elevación del punto J y del ST ≥ 2 mm en V1 y/o V2, con morfología «en cúpula» descendente', 'Seguida de una onda T negativa, sin línea isoeléctrica entre ambas', 'Se ve mejor con V1–V2 en el 2.º o 3.er espacio intercostal (ESC 2022)'],
    trampa: 'El patrón tipo 2 (en silla de montar, con T positiva) no es diagnóstico por sí solo. La fiebre y los bloqueadores de los canales de sodio pueden desenmascararlo o empeorarlo. Diferéncialo de BRD, repolarización precoz, hiperpotasemia y SCACEST anterior.',
    sva: 'Síncope, palpitaciones nocturnas o PCR con este patrón: riesgo de FV; traslado monitorizado y valoración por cardiología. Trata la fiebre y evita los fármacos de la lista de brugadadrugs.org.',
    conf: ['brd', 'scacest_ant', 'normal', 'wpw', 'hvi'],
  },
  inv_brazos: {
    g: 'otros', name: 'Inversión brazo derecho ↔ brazo izquierdo',
    claves: ['P, QRS y T negativos en I (imagen en espejo)', 'aVR positiva; II y III intercambiadas, igual que aVR y aVL', 'Precordiales normales, con progresión de la R conservada'],
    trampa: 'La dextrocardia también invierte I, pero altera las precordiales (la R disminuye de V1 a V6). Antes de diagnosticar un eje derecho extremo o un infarto lateral, revisa los cables.',
    sva: 'Recoloca los electrodos y repite el ECG. Es la inversión de cables más frecuente, y con la prisa de la ambulancia todavía más.',
    conf: ['inv_md_pi', 'inv_mi_pi', 'normal', 'iam_antiguo', 'brd'],
  },
  inv_mi_pi: {
    g: 'otros', name: 'Inversión brazo izquierdo ↔ pierna izquierda',
    claves: ['I y II intercambiadas: la P es más alta en I que en II', 'III invertida (P negativa en III) y aVL ↔ aVF intercambiadas', 'aVR y precordiales normales: el ECG parece casi normal'],
    trampa: 'Es la inversión que más pasa desapercibida. Puede fabricar una Q o una T negativa en III que se lee como necrosis inferior antigua. Si cambia la cara inferior sin cambio clínico, compara con un ECG previo y revisa los cables.',
    sva: 'Recoloca los electrodos y repite el ECG antes de interpretar la cara inferior.',
    conf: ['normal', 'iam_antiguo', 'inv_brazos', 'inv_md_pi', 'hbai'],
  },
  inv_md_pi: {
    g: 'otros', name: 'Inversión brazo derecho ↔ pierna izquierda',
    claves: ['II, III y aVF con P, QRS y T negativos', 'aVR positiva (es la antigua aVF) y aVL sin cambios', 'Precordiales normales'],
    trampa: 'Simula un ritmo auricular bajo o de la unión (P negativa en cara inferior) o un IAM inferior. Una aVR positiva con precordiales normales es casi siempre un cable.',
    sva: 'Recoloca los electrodos y repite el ECG. Si persiste con los cables bien puestos, entonces sí: piensa en ritmo ectópico auricular o dextrocardia.',
    conf: ['inv_brazos', 'union', 'iam_antiguo', 'scacest_inf', 'inv_mi_pi'],
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
  tsv: {
    name: 'TSV de QRS estrecho',
    claves: ['Taquicardia regular de QRS estrecho, a menudo de 150 a 250 lpm', 'P invisibles o justo detrás del QRS', 'Inicio y fin bruscos'],
    trampa: 'A ~150 lpm piensa en flutter 2:1 y busca ondas F: las maniobras vagales o la adenosina lo desenmascaran. Antes de la adenosina, descarta preexcitación en el ECG basal.',
    sva: 'Estable: maniobras vagales (Valsalva modificada, en decúbito y elevando las piernas) y, si fracasan, adenosina 6 mg IV en bolo rápido, después 12 mg y considerar 18 mg, con el ECG registrando. Inestable: cardioversión sincronizada, 70–120 J con aumentos escalonados (ERC 2025).',
  },
  fa: {
    name: 'FA con respuesta rápida',
    claves: ['Ritmo irregularmente irregular', 'Sin ondas P: línea de base fibrilatoria o casi plana', 'QRS estrecho salvo bloqueo de rama o preexcitación'],
    trampa: 'Rápida, ancha e irregular es FA preexcitada: nada de frenadores del nodo AV. Y una taquicardia compensadora (sepsis, hipovolemia) no se frena: se trata la causa.',
    sva: 'Inestable: cardioversión sincronizada con la energía máxima del desfibrilador. Estable: control de la frecuencia (betabloqueante, diltiazem o verapamilo; con FEVI < 40 %, la menor dosis de betabloqueante que deje la FC < 110 y digoxina si hace falta) y busca el desencadenante (ERC 2025).',
  },
  flutter: {
    name: 'Flutter auricular',
    claves: ['Ondas F en dientes de sierra a ~300/min, mejor visibles en II', 'Conducción 2:1 (FC ~150), 3:1, 4:1 o variable', 'QRS estrecho entre las ondas F'],
    trampa: 'Con 2:1 y una FC fija de ~150, las F se esconden en el QRS y la T y parece una TSV. Si dudas, las maniobras vagales o la adenosina frenan la conducción y las muestran.',
    sva: 'Inestable: cardioversión sincronizada, primera descarga 70–120 J con aumentos escalonados (ERC 2025). Estable: control de la frecuencia (betabloqueante o calcioantagonista).',
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
  bradi: {
    name: 'Bradicardia sinusal con pausas',
    claves: ['P sinusal delante de cada QRS, a < 60 lpm', 'Pausas sin P ni QRS (paro sinusal o bloqueo sinoauricular)', 'Una pausa > 3 s en vigilia es un signo de alto riesgo (ERC 2025)'],
    trampa: 'Antes de llamar asistolia a una pausa, sube la ganancia y mira otra derivación. Busca la causa: betabloqueantes, antagonistas del calcio, digoxina, hipotermia, hipoxia, HTIC.',
    sva: 'Con signos adversos: atropina 500 mcg IV, repetible cada 3–5 min hasta 3 mg; si fracasa, isoprenalina (5 mcg/min) o adrenalina (2–10 mcg/min) en perfusión y marcapasos transcutáneo (ERC 2025).',
  },
  bav2: {
    name: 'BAV 2.º grado (Mobitz II, 2:1 o avanzado)',
    claves: ['P regulares y algunas sin QRS detrás', 'PR constante en los latidos conducidos; en 2:1, una P bloqueada entre cada QRS, a menudo sobre la T', 'Con QRS ancho, el bloqueo suele estar por debajo del haz de His'],
    trampa: 'Un 2:1 con la P escondida en la T parece una bradicardia sinusal. En un bloqueo de alto grado con QRS ancho la atropina es ineficaz y puede empeorarlo (ERC 2025).',
    sva: 'Con signos adversos: si el QRS es estrecho, atropina 500 mcg IV, repetible hasta 3 mg; si es ancho o no responde, isoprenalina o adrenalina en perfusión y marcapasos transcutáneo como puente (ERC 2025). Riesgo de asistolia: parches puestos aunque esté estable. Sin pulso es una AESP.',
  },
  bav3: {
    name: 'BAV completo',
    claves: ['Disociación AV: P y QRS cada uno a su ritmo, sin relación', 'Escape regular y lento: de la unión (QRS estrecho, 40–60 lpm) o ventricular (QRS ancho, < 40 lpm)', 'PR que cambia sin patrón'],
    trampa: 'Un escape de QRS ancho está por debajo del His: la atropina no funciona. Sin pulso es una AESP: RCP y adrenalina, no atropina.',
    sva: 'Con signos adversos: si el escape es estrecho, atropina 500 mcg IV, repetible hasta 3 mg; si es ancho o no responde, isoprenalina (5 mcg/min) o adrenalina (2–10 mcg/min) en perfusión y marcapasos transcutáneo con analgesia y sedación, como puente al transvenoso (ERC 2025). Busca IAM inferior, fármacos e hiperpotasemia.',
  },
  asis: {
    name: 'Asistolia',
    claves: ['Sin actividad eléctrica ventricular', 'Línea casi plana con ligera ondulación de la línea de base', 'Puede haber ondas P sin QRS (parada ventricular)'],
    trampa: 'Antes de llamarla asistolia: electrodos y cables conectados, ganancia ×2–×4 y otra derivación. Busca ondas P: la parada ventricular puede responder al marcapasos (ERC 2025). Una FV fina claramente identificada se desfibrila.',
    sva: 'No desfibrilable: RCP de calidad, adrenalina 1 mg lo antes posible y cada 3–5 min, y causas reversibles (4H y 4T).',
  },
};
const CONDUCTAS = {
  descarga: 'Desfibrilar (descarga no sincronizada) y RCP 2 min',
  cardioversion: 'Cardioversión eléctrica sincronizada',
  rcp_adr: 'RCP 2 min y adrenalina 1 mg, sin descarga',
  adenosina: 'Maniobras vagales y, si fracasan, adenosina IV',
  control_fc: 'Control de la frecuencia con fármacos',
  atropina: 'Atropina 500 mcg IV',
  marcapasos: 'Marcapasos transcutáneo o perfusión de isoprenalina o adrenalina',
  observar: 'No descargar: monitorizar y tratar la causa',
};
const CONTEXTOS = {
  parada: 'Inconsciente, no respira con normalidad y sin pulso central. RCP en curso: pausa para analizar el ritmo.',
  inestable: 'Consciente, con pulso. TAS 75 mmHg, frío, sudoroso y con dolor torácico.',
  pulso: 'Consciente y con pulso. TA 120/75 mmHg, buena perfusión.',
};
const CONTEXTO_RIVA = 'SCACEST en tratamiento: con pulso, TA 115/70 mmHg y buena perfusión.';
const CONDUCTA_OK = { fv: { parada: 'descarga' }, flv: { parada: 'descarga' }, tv: { parada: 'descarga', inestable: 'cardioversion' }, asis: { parada: 'rcp_adr' }, riva: { pulso: 'observar' }, bigem: { pulso: 'observar' }, sinusal: { parada: 'rcp_adr', pulso: 'observar' },
  tsv: { inestable: 'cardioversion', pulso: 'adenosina' }, fa: { inestable: 'cardioversion', pulso: 'control_fc' }, flutter: { inestable: 'cardioversion', pulso: 'control_fc' },
  bradi: { inestable: 'atropina' }, bav2: { inestable: 'atropina', parada: 'rcp_adr' }, bav3: { inestable: 'atropina', parada: 'rcp_adr' } };
// Por tira: meta.k sustituye la conducta de una situación (BAV con QRS ancho: marcapasos o perfusión, no atropina)
const conductaOk = (meta, ctx) => (meta.k && meta.k[ctx]) || CONDUCTA_OK[meta.c][ctx];

if (typeof module !== 'undefined') module.exports.MON = { MON_CATS, CONDUCTAS, CONTEXTOS, CONDUCTA_OK, conductaOk };

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

/* ---------- Modo imagen (fase 5) ----------
   ECG reales fotografiados o escaneados, de Wikimedia Commons (CC BY / CC BY-SA), para entidades sin banco de señal.
   conf puede incluir categorías de CATS como distractores. Criterios: ERC 2025 (circunstancias especiales y SVA), ESC 2023, 4.ª definición universal. */
const IMG_CATS = {
  hiperk: {
    name: 'Hiperpotasemia',
    claves: ['T altas y picudas, de base estrecha, más altas que la R en más de una derivación', 'Después: PR largo, P aplanada o ausente y QRS ancho (> 120 ms)', 'Al final: onda sinusoidal, bradicardia extrema, TV o parada'],
    trampa: 'El ECG puede ser normal con un potasio muy alto y no se correlaciona bien con la cifra. Un QRS ancho y lento en un paciente renal, con debilidad o parálisis flácida, es hiperpotasemia hasta demostrar lo contrario.',
    sva: 'Grave con cambios en el ECG: cloruro cálcico 10 % 10 mL IV (registra el ECG antes y después), insulina rápida 10 unidades con glucosa 25 g IV y salbutamol nebulizado 10–20 mg. En parada: cloruro cálcico 10 % 10 mL y bicarbonato sódico 50 mmol IV, por vías separadas o lavando entre ambos (ERC 2025).',
    conf: ['bri', 'tv', 'scacest_ant', 'hipok', 'hipoca'],
  },
  hipok: {
    name: 'Hipopotasemia',
    claves: ['Descenso del ST con T aplanada o negativa', 'Onda U prominente, mejor visible en V2–V3, que puede superar a la T', 'QT aparentemente largo por la fusión de T y U; PR algo alargado'],
    trampa: 'La fusión T-U se mide como un QT largo: el riesgo es la torsade de pointes y la FV, sobre todo con digoxina o fármacos que alargan el QT. Busca la hipomagnesemia asociada.',
    sva: 'Repón potasio y corrige el magnesio a la vez. En parada por hipopotasemia: cloruro potásico 20 mmol IV en 2–3 min, seguido de 10 mmol en 2 min, y ajustar según el K+ (ERC 2025).',
    conf: ['qt_largo', 'scasest', 'digital', 'hiperk', 'hipoca'],
  },
  hipoca: {
    name: 'Hipocalcemia',
    claves: ['QT largo a expensas de un ST largo y rectilíneo', 'T de forma normal y sin onda U (a diferencia de la hipopotasemia)', 'Puede haber T negativas y bloqueo AV'],
    trampa: 'Piensa en ella en la transfusión masiva, la insuficiencia renal, la pancreatitis, la rabdomiólisis y la intoxicación por antagonistas del calcio.',
    sva: 'Gluconato cálcico 10 % 10–20 mL IV en 5–10 min y, después, perfusión según el calcio (ERC 2025).',
    conf: ['qt_largo', 'hipok', 'hiperk', 'normal', 'digital'],
  },
  hipotermia: {
    name: 'Hipotermia',
    claves: ['Onda J de Osborn: joroba positiva al final del QRS, mayor cuanto más baja la temperatura', 'Bradicardia sinusal con PR, QRS y QT largos', 'Artefacto por temblor; FA lenta y, al enfriarse más, FV o asistolia'],
    trampa: 'La onda J puede simular una elevación del ST o un Brugada. Una FC < 45 lpm en un hipotérmico es un criterio de alto riesgo de parada (ERC 2025).',
    sva: 'En parada por debajo de 30 °C: máximo tres descargas y no más hasta superar 30 °C; una sola dosis de adrenalina 1 mg salvo ECPR inminente; entre 30 y 35 °C, adrenalina cada 6–10 min. Con riesgo de parada o en parada, traslado directo a un centro con ECMO (ERC 2025).',
    conf: ['bradi', 'brugada', 'scacest_inf', 'hiperk', 'pericarditis'],
  },
  wellens: {
    name: 'Síndrome de Wellens',
    claves: ['T bifásicas (tipo A) o negativas, profundas y simétricas (tipo B) en V2–V3, a veces hasta V6', 'Sin ondas Q, R conservada y ST isoeléctrico o casi', 'Se registra en un periodo sin dolor, tras un episodio de angina'],
    trampa: 'Con dolor, las T se pseudonormalizan y el ECG puede parecer normal. Indica una estenosis crítica de la DA proximal con alto riesgo de oclusión: nunca prueba de esfuerzo.',
    sva: 'SCA de alto riesgo: traslado a un centro con hemodinámica. Si vuelve el dolor, repite el ECG: puede evolucionar a una oclusión de la DA (de Zwaan y Wellens, Am Heart J 1982).',
    conf: ['scasest', 'iam_antiguo', 'tep', 'hvi', 'dewinter'],
  },
  dewinter: {
    name: 'Patrón de de Winter',
    claves: ['Descenso del ST ascendente de 1–3 mm en el punto J en V1–V6', 'Continúa en T altas, positivas y simétricas', 'Suele haber elevación del ST de 1–2 mm en aVR'],
    trampa: 'No hay elevación del ST en precordiales, por eso se etiqueta de SCASEST. Es una oclusión aguda de la DA proximal y equivale a un SCACEST.',
    sva: 'Activar Codican como un SCACEST (de Winter et al., N Engl J Med 2008).',
    conf: ['scasest', 'hiperk', 'scacest_ant', 'wellens', 'hvi'],
  },
  pericarditis: {
    name: 'Pericarditis aguda',
    claves: ['Elevación del ST difusa y cóncava, en derivaciones de varios territorios', 'Descenso del PR; en aVR, PR elevado y ST descendido', 'Sin imagen especular (salvo en aVR y V1) y sin ondas Q'],
    trampa: 'El SCACEST tiene territorio, a menudo convexidad e imagen especular. Un descenso del ST en III o aVL frente a una elevación en la cara opuesta no es pericarditis.',
    sva: 'Dolor pleurítico que mejora al inclinarse hacia delante, a veces con roce. Descarta derrame y taponamiento con ecografía. Si dudas con un SCACEST, transmite el ECG a hemodinámica antes de decidir.',
    conf: ['scacest_inf', 'scacest_ant', 'hsa', 'hipotermia', 'brugada'],
  },
  tep: {
    name: 'Tromboembolismo pulmonar',
    claves: ['Taquicardia sinusal: el hallazgo más frecuente', 'Sobrecarga del VD: T negativas en V1–V4, qR en V1, BRD completo o incompleto', 'S1Q3T3 (S en I, Q y T negativa en III): sugestivo, pero poco sensible'],
    trampa: 'Las T negativas en V1–V4 de la sobrecarga del VD se confunden con isquemia anterior o con un Wellens. Un ECG normal no descarta un TEP.',
    sva: 'Disnea súbita sin cardiopatía ni neumopatía conocida: piensa en TEP y busca sobrecarga del VD. En parada por TEP sospechado, fibrinolisis y RCP 60–90 min tras administrarla (ERC 2025).',
    conf: ['scasest', 'brd', 'taqui', 'wellens', 'iam_antiguo'],
  },
  taponamiento: {
    name: 'Derrame pericárdico con taponamiento',
    claves: ['Taquicardia sinusal', 'Bajo voltaje del QRS', 'Alternancia eléctrica: la amplitud del QRS cambia latido a latido porque el corazón oscila dentro del derrame'],
    trampa: 'La alternancia eléctrica es específica pero poco sensible: su ausencia no descarta taponamiento. Una TSV muy rápida también puede alternar.',
    sva: 'Hipotensión, ingurgitación yugular y taquicardia con bajo voltaje: ecografía a pie de cama. El taponamiento es una causa reversible de parada (4H y 4T): pericardiocentesis si hay compromiso.',
    conf: ['taqui', 'pericarditis', 'tep', 'tsv', 'normal'],
  },
  mp_fallo: {
    name: 'Fallo de captura del marcapasos',
    claves: ['Espícula de marcapasos que no va seguida de QRS', 'Pausas o bradicardia aunque el marcapasos emite', 'Distínguelo del fallo de sensado: espículas que caen sobre QRS o T propios sin respetar el ritmo del paciente'],
    trampa: 'Si en la pausa no hay espícula, no es fallo de captura sino inhibición por sobresensado o fallo de salida. El imán pasa el marcapasos a modo asíncrono: corrige la inhibición, no el fallo de captura.',
    sva: 'Bradicardia con signos adversos: algoritmo de bradicardia (atropina 500 mcg IV, isoprenalina o adrenalina, marcapasos transcutáneo; ERC 2025). Causas: desplazamiento del cable, umbral alto, hiperpotasemia, isquemia, fármacos.',
    conf: ['marcapasos', 'bav3', 'bradi', 'bav2alto', 'ev'],
  },
  dextrocardia: {
    name: 'Dextrocardia',
    claves: ['P, QRS y T negativos en I; aVR positiva', 'Progresión inversa de la R: los QRS se hacen más pequeños de V1 a V6', 'Con precordiales en el hemitórax derecho, el trazado se normaliza'],
    trampa: 'La inversión de los electrodos de los brazos también da I negativa y aVR positiva, pero las precordiales son normales. Mira V5–V6 antes de decidir.',
    sva: 'Para un ECG interpretable, intercambia los electrodos de los brazos y coloca las precordiales en espejo en el hemitórax derecho, sobre todo si hay dolor torácico.',
    conf: ['inv_brazos', 'iam_antiguo', 'hvi', 'brd', 'normal'],
  },
  sgarbossa: {
    name: 'IAM con BRI (criterios de Sgarbossa)',
    claves: ['BRI con elevación del ST concordante (en la misma dirección que el QRS) ≥ 1 mm', 'Descenso concordante del ST ≥ 1 mm en V1–V3', 'Discordancia desproporcionada: ST/S ≥ 25 % (Smith); ≥ 5 mm en el criterio original'],
    trampa: 'En el BRI lo esperable es un ST discordante. Lo que hay que buscar es concordancia o una discordancia desproporcionada, y un BRI sin estos criterios no descarta la oclusión.',
    sva: 'BRI, conocido o nuevo, con clínica de isquemia en curso: manéjalo como un SCACEST y activa el Codican (ESC 2023).',
    conf: ['bri', 'scacest_ant', 'hvi', 'marcapasos', 'hiperk'],
  },
  iam_vd: {
    name: 'IAM de ventrículo derecho',
    claves: ['IAM inferior con elevación del ST mayor en III que en II', 'Elevación del ST en V4R (y V3R) ≥ 0,5 mm; ≥ 1 mm en varones < 30 años', 'Puede elevar el ST en V1'],
    trampa: 'Sin V4R pasa desapercibido. Hipotensión con pulmones limpios e ingurgitación yugular en un IAM inferior: piensa en el VD antes de dar nitratos.',
    sva: 'Evita nitratos y diuréticos; si hay hipotensión, carga de volumen prudente. Bradicardia y BAV frecuentes. Codican.',
    conf: ['scacest_inf', 'scacest_ant', 'brd', 'iam_post', 'pericarditis'],
  },
  iam_post: {
    name: 'IAM posterior',
    claves: ['Descenso del ST máximo en V1–V3, horizontal, con T positiva', 'R alta en V1–V2 cuando evoluciona: la Q posterior vista en espejo', 'Elevación del ST ≥ 0,5 mm en V7–V9 (≥ 1 mm en varones < 40 años)'],
    trampa: 'Se etiqueta de SCASEST anterior. Míralo en espejo: el descenso de V1–V3 es una elevación vista desde delante.',
    sva: 'Registra V7–V9: si confirman la elevación, es un SCACEST y se activa el Codican (ESC 2023). Suele acompañar a un IAM inferior o lateral.',
    conf: ['scasest', 'brd', 'wpw', 'hvi', 'iam_vd'],
  },
  hsa: {
    name: 'Lesión cerebral aguda (hemorragia subaracnoidea)',
    claves: ['T negativas gigantes y anchas, con QT muy largo', 'Elevación o descenso del ST que puede simular un SCA', 'Bradicardia o arritmias por la descarga autonómica'],
    trampa: 'El ECG puede ser indistinguible de un SCACEST. Cefalea brusca, bajo nivel de conciencia o focalidad mandan: antes de antiagregar, piensa en la cabeza.',
    sva: 'Si domina el cuadro neurológico, no antiagregues ni anticoagules sin descartar la hemorragia: el destino es un centro con neuroimagen y neurocirugía.',
    conf: ['scacest_ant', 'wellens', 'qt_largo', 'pericarditis', 'scasest'],
  },
  tdp: {
    name: 'Torsade de pointes',
    claves: ['TV polimorfa: los QRS cambian de amplitud y parecen girar alrededor de la línea de base', 'Aparece sobre un QT largo, a menudo tras una secuencia corto-largo-corto', 'Suele autolimitarse, pero puede degenerar en FV'],
    trampa: 'Una TV polimorfa con QT normal sugiere isquemia, no torsade, y el magnesio no basta.',
    sva: 'Sin pulso: desfibrilación. Con pulso: sulfato de magnesio 2 g (8 mmol) IV en 10 min, repetible una vez; retira los fármacos que alargan el QT y corrige el potasio y el magnesio (ERC 2025).',
    conf: ['tv', 'fa_preex', 'qt_largo', 'flutter', 'ev'],
  },
};
if (typeof module !== 'undefined') module.exports.IMG = { IMG_CATS };
