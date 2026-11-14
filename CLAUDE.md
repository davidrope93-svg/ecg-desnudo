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
- [ ] Fase 2 · Bloqueos y taquicardias en 12 derivaciones (Chapman/Ningbo, SPH): Mobitz I y II, 2:1, avanzado, unión, TRNAV, TRAV, taquicardia auricular, paro sinusal, FV y TV en 12 derivaciones.
- [ ] Fase 3 · Oclusión coronaria (STAFF III): por arteria y por minuto de oclusión; circunfleja sin elevación.
- [ ] Fase 4 · Brugada (Brugada-HUCA), QT por fármacos (ECGRDVQ), FA preexcitada (INCART) e inversión de electrodos (transformación exacta).
- [ ] Fase 5 · Modo imagen (LITFL, CC BY-NC-SA) y banco propio de ECG anonimizados del usuario.
