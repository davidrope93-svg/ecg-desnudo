# ECG desnudo · instrucciones para continuar el proyecto

Entrenador de lectura de ECG para SVA extrahospitalaria. Usuario: médico de SVA. Todo en castellano de España.

## Cómo se trabaja

- Una fase por sesión. Al empezar: leer `FUENTES.md` (mapa de fuentes y orden) y el estado de abajo.
- Construir y probar: `python3 build.py && node tests/run.js`. `index.html` es lo que publica GitHub Pages (rama `main`, raíz): https://davidrope93-svg.github.io/ecg-desnudo/
- Un ECG solo entra con doble comprobación: etiqueta de la fuente + medidas automáticas o revisión visual del trazado. Si hay duda, fuera. Nunca etiquetas inventadas ni criterios sin fuente (ERC 2025, ESC 2023, 4.ª definición universal).
- Ningbo tiene errores de etiqueta conocidos: revisión visual de cada caso. MIMIC-IV-ECG solo tiene informe automático: último recurso.
- Al cerrar cada fase: añadir pruebas, regenerar `index.html`, subir a `main`, actualizar el estado de abajo y dejar al usuario una lista corta de casos para que los valide.
- Datos descargados fuera del repositorio (`/home/claude/data`). En el repositorio solo `src/data.js` empaquetado y los scripts de `tools/`.
- Licencias: atribuir cada fuente en el pie de la página. LITFL es no comercial: si el proyecto se monetiza, hay que retirarlas.

## Estado

- [x] v0.1: 158 ECG de PTB-XL, 22 diagnósticos, artefacto por electrodo, filtros, compás, práctica, examen, atlas y progreso.
- [x] Fase 1 · Modo monitor (14/11/2026): 98 tiras reales revisadas una a una (FV 37, TV 17, sinusal 14, flutter ventricular 12, bigeminismo 10, asistolia 4, RIVA 4) de vfdb, cudb y MIT-BIH. Barrido en tiempo real, ganancia ×0,5–×4, congelar, compás, artefacto de compresiones hasta la pausa y de traslado. Pregunta de ritmo + conducta según la situación (parada, con pulso inestable, con pulso). En cudb vale FV o flutter ventricular. Scripts: `tools/monitor_select.py`, `tools/monitor_sheet.py`, `tools/monitor_pack.py`.
  - Pendiente: ampliar asistolia y RIVA (pocas tiras limpias). RIVA de Chapman/Ningbo (14, derivación II) tras revisión visual. Ojo: al descargar cabeceras de Chapman/Ningbo en paralelo, guardar cada una en su archivo (`curl -o`), no en un único fichero, o se pierde la correspondencia registro-diagnóstico.
- [x] Fase 2 · Bloqueos y taquicardias en 12 derivaciones (14/11/2026): 66 ECG nuevos revisados uno a uno (BAV completo 10 SPH, TRNAV 10, ritmo de la unión 10, Mobitz I 9, TV 8, BAV 2.º grado Mobitz II/2:1/avanzado 7, TRAV 7, pausa sinusal 5) de Chapman/Ningbo y SPH; RIVA del monitor ampliado a 8 con derivación II de Chapman/Ningbo. Banco total: 224 ECG de 12 derivaciones, 29 diagnósticos. Scripts: `tools/p2_load.py`, `tools/p2_sheet.py`, `tools/p2_labels.py`, `tools/p2_final.json`; `tools/pack.py` empaqueta PTB-XL + fase 2.
  - Descartado y por qué: FV en 12 derivaciones (electrodos despegados, ya está en el monitor); taquicardia auricular (solo 2 limpias tras filtro de FC ≥ 105); BAV 2:1 de SPH (el código 85 era flutter con conducción 2:1, no bloqueo AV); un registro de TV con 9 mV en V5 (artefacto).
  - Pendiente: taquicardia auricular (revisar las 283 de Chapman con FC 100–140) y más BAV 2:1 (MIT-BIH 231 como tira de monitor).
- [ ] Fase 3 · Oclusión coronaria (STAFF III): por arteria y por minuto de oclusión; circunfleja sin elevación.
- [ ] Fase 4 · Brugada (Brugada-HUCA), QT por fármacos (ECGRDVQ), FA preexcitada (INCART) e inversión de electrodos (transformación exacta).
- [ ] Fase 5 · Modo imagen (LITFL, CC BY-NC-SA) y banco propio de ECG anonimizados del usuario.
