# ECG en Ruta · entrenador de ECG para emergencias extrahospitalarias

(Antes «ECG desnudo». El repositorio y la dirección web conservan el nombre antiguo hasta tener dominio propio.)

Entrenador de lectura de ECG para SVA extrahospitalaria: ECG reales de 12 derivaciones, sin contexto, con artefacto de ambulancia simulado electrodo a electrodo.

**Abrir el entrenador:** https://davidrope93-svg.github.io/ecg-desnudo/

Funciona en el ordenador, la tablet o el móvil, sin instalar nada; y si se añade a la pantalla de inicio, se instala como una app y funciona sin cobertura. Las fuentes de ECG previstas y lo que cubre cada una están en [FUENTES.md](FUENTES.md).

## Qué hay

- **Beta y distribución (14/11/2026)**: botón «Este caso no me convence» en la explicación de los cuatro modos (motivo + comentario, se guarda en el dispositivo y se envía por WhatsApp o correo con la hoja de compartir); aciertos por caso; copia del progreso en un archivo JSON (enviar a quien coordina la beta, o pasar a otro dispositivo) con importación validada; página de aviso docente y privacidad, y aviso la primera vez. App instalable (manifiesto, iconos) que funciona sin conexión: `sw.js` guarda la app, el banco de oclusiones y las imágenes (unos 15 MB) con la huella del contenido y avisa cuando hay versión nueva. No se activa dentro de un iframe (artefacto de Claude).
- **Cables (fase 7)**: además de brazo derecho ↔ brazo izquierdo, las inversiones brazo izquierdo ↔ pierna izquierda (la que más pasa desapercibida) y brazo derecho ↔ pierna izquierda, por transformación exacta de ECG normales reales.
- **Monitor periparada (fase 6)**: 54 tiras nuevas (TSV, FA rápida, flutter, BAV 2.º grado y completo, bradicardia con pausas) con su conducta según el ERC 2025: cardioversión sincronizada, vagales y adenosina, control de FC, atropina, o marcapasos y perfusión si el BAV tiene QRS ancho. El monitor tiene ya 156 tiras y 13 ritmos.
- **Imagen · casos clásicos (fase 5)**: 23 ECG reales en imagen de Wikimedia Commons (CC BY y CC BY-SA) para lo que no existe en señal: hiperpotasemia, hipopotasemia, hipocalcemia, hipotermia, Wellens (con el ECG del mismo paciente con dolor), de Winter, pericarditis, TEP, taponamiento con alternancia eléctrica, IAM con BRI (Sgarbossa), IAM posterior, dextrocardia y hemorragia subaracnoidea que imita un SCACEST. Zoom por toque, autor y licencia en cada imagen.
- **Fase 4**: Brugada tipo 1 espontáneo (Brugada-HUCA), QT largo por quinidina y dofetilida (ECGRDVQ), FA preexcitada (INCART) e inversión de electrodos de los brazos (transformación exacta de ECG normales).
- **Oclusión coronaria (fase 3)**: 78 pacientes de STAFF III con el balón ocluyendo DA, CD o Cx: ECG basal, al minuto 1 y al final del inflado. Pregunta de oclusión y arteria, comparación con el basal y vista de evolución con el cambio del ST por derivación.
- **Bloqueos y taquicardias (fase 2)**: Mobitz I, Mobitz II/2:1/avanzado, BAV completo, ritmo de la unión, TRNAV, TRAV, pausa sinusal y TV en 12 derivaciones (Chapman-Shaoxing/Ningbo y SPH), revisados uno a uno. Banco total: 224 ECG de 12 derivaciones y 102 tiras de monitor.
- **Modo monitor (fase 1)**: 98 tiras reales de parada y periparada anotadas por expertos (vfdb, cudb, MIT-BIH), con barrido, ganancia, compresiones torácicas hasta la pausa de análisis y pregunta de ritmo + conducta (descarga, cardioversión sincronizada, RCP y adrenalina, o no descargar) según la situación.

- **158 ECG reales** de PTB-XL (500 Hz → 250 Hz), 22 diagnósticos en 4 grupos (ritmo, conducción, isquemia, otros). Cada ECG se eligió con doble concordancia: etiqueta del cardiólogo (PTB-XL, validada) + interpretación de GE 12SL (PTB-XL+) + medidas (FC, PR, QRS, QTc, desnivel del ST). Los SCACEST exigen estadio agudo o «STEMI» de 12SL, elevación medida y, en el inferior, especular en aVL.
- **Artefacto extrahospitalario** generado en cada electrodo (RA, LA, LL, V1–V6) y proyectado a las derivaciones: respiración, línea de base, tensión muscular, temblor de 4–7 Hz (pseudoflutter), 50 Hz, vibración, electrodos que se mueven o despegan. Un temblor del brazo izquierdo sale en I, III y aVL y respeta II. Escenas: Limpio, Domicilio, Ambulancia, Hostil, Aleatorio.
- **Filtros como en el monitor**: Diagnóstico 0,05–150 Hz, Monitor 0,5–40 Hz (deforma el ST, como el real), Muscular 0,05–40 Hz y notch de 50 Hz.
- **Papel milimetrado** 25 mm/s · 10 mm/mV, formato 3×4 + tira larga elegible, zoom y **compás** (intervalo, FC y amplitud).
- **Práctica** (insiste en lo que más fallas), **Examen** de 10 ECG con nota y tiempo, **Atlas** por diagnóstico, **Repaso de fallos** y progreso por diagnóstico. Corrección en tres niveles: correcto, parcial (hallazgo real pero no el principal) e incorrecto.
- Explicación de cada ECG: medidas automáticas, desnivel del ST por derivaciones, informe del cardiólogo, qué artefacto tenía, claves, trampa y actuación en SVA (ERC 2025, ESC 2023, 4.ª definición universal).

## Estructura

| Archivo | Contenido |
|---|---|
| `src/img_data.js`, `img/` | Fase 5: metadatos (autor, licencia, nota) e imágenes redimensionadas. Lo genera `tools/p5_pack.py` desde `tools/p5_final.json`. |
| `src/data.js` | Banco comprimido (delta + varint + gzip) y metadatos. Lo genera `tools/pack.py`. |
| `src/content.js` | Criterios, trampas, actuación y confusiones de cada diagnóstico; códigos SCP en castellano. |
| `src/engine.js` | Decodificación, derivaciones, artefacto, filtros, opciones y mazo. Sin DOM. |
| `src/ui.js` | Papel, compás, práctica, examen, atlas y progreso. |
| `src/template.html` | Maquetación y estilos. |
| `build.py` | Une todo en `index.html` (sin dependencias) y genera `sw.js` desde `src/sw.js` con la lista de archivos y la huella del contenido. El banco de oclusiones va aparte en `occ_data.js` y se carga al abrir ese modo. |
| `manifest.webmanifest`, `icons/` | App instalable. Iconos generados con `tools/make_icons.py`. |
| `tests/run.js` | 238 pruebas: decodificación idéntica a Python, contenido, opciones, artefacto (reproducible, creciente, física de electrodos), filtros, mazo, reportes, copia del progreso y caché sin conexión. |
| `tools/` | Selección y empaquetado desde PhysioNet (`select.py`, `final.py`, `pack.py`). |

```
python3 build.py && node tests/run.js
```

## Fuentes y licencia de los datos

Los trazados derivados de Brugada-HUCA (Costa Cortez y García Iglesias, 2026) se redistribuyen bajo CC BY-SA 4.0, como exige su licencia. Las imágenes de `img/` son de Wikimedia Commons; cada una conserva su licencia (CC BY o CC BY-SA) y su autor, que se muestran en la app y en `src/img_data.js`; están redimensionadas. Uso docente sin ánimo de lucro: antes de cualquier uso comercial, revisar las 5 imágenes señaladas en `CLAUDE.md`.

Wagner P, et al. PTB-XL, a large publicly available electrocardiography dataset (v1.0.3). PhysioNet, 2022. Strodthoff N, et al. PTB-XL+ (v1.0.1). PhysioNet, 2023. Ambos CC BY 4.0. El artefacto es simulado. Herramienta docente.
