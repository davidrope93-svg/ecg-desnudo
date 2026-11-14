# Fuentes de ECG: mapa de cobertura

Revisado el 13/11/2026. Todas las fuentes son de acceso abierto y se han comprobado descargando sus etiquetas, no solo leyendo la descripción. «n» es el número de ECG o episodios con esa etiqueta en la fuente: antes de entrar en el entrenador, cada caso pasa doble comprobación (etiqueta + medidas o revisión visual).

## Fuentes

| Fuente | Qué es | Etiqueta | Formato | Licencia |
|---|---|---|---|---|
| **PTB-XL** + PTB-XL+ | 21.799 ECG, Alemania | Cardiólogo, validada + GE 12SL | 12 der., 10 s, 500 Hz | CC BY 4.0 |
| **Chapman-Shaoxing + Ningbo** (`ecg-arrhythmia`) | 45.152 ECG, China | Médicos (Ningbo con errores conocidos: su «flutter» está inflado) | 12 der., 10 s, 500 Hz | CC BY 4.0 |
| **SPH** (Shandong) | 25.770 ECG | Revisada por cardiólogos, códigos AHA | 12 der., 10–60 s, 500 Hz | CC0 |
| **STAFF III** | 104 pacientes, 152 oclusiones con balón de DA, CD, Cx y TCI | Verdad absoluta: arteria ocluida y minuto de inflado | 12 der. continuas, 1000 Hz | ODC-By |
| **Brugada-HUCA** (Asturias) | 363 sujetos | Diagnóstico clínico confirmado; patrón basal | 12 der., 12 s, 100 Hz | CC BY-SA 4.0 |
| **MIT-BIH Arrhythmia** | 48 Holter | Expertos, latido a latido y ritmo | 2 der., 360 Hz | ODC-By |
| **MIT-BIH Malignant Ventricular Ectopy** (`vfdb`) | 22 registros | Expertos, episodios de ritmo | 2 der., 250 Hz | ODC-By |
| **CU Ventricular Tachyarrhythmia** (`cudb`) | 35 registros con FV | Expertos | 1 der., 250 Hz | ODC-By |
| **INCART** | 75 registros de 30 min | Expertos | 12 der., 257 Hz | ODC-By |
| **ECGRDVQ** | Voluntarios con dofetilida, quinidina, ranolazina y verapamilo | Ensayo controlado | 12 der. | ODC-By |
| **MIMIC-IV-ECG** | 800.035 ECG, Boston | Solo informe automático del aparato | 12 der., 10 s, 500 Hz | ODbL |
| **Wikimedia Commons** | ECG docentes reales (James Heilman, CardioNetworks/ECGpedia, otros) | Descripción del autor, revisada visualmente | Imágenes | CC BY / CC BY-SA |
| **LITFL ECG Library** | Biblioteca docente de casos reales | Revisada por urgenciólogos | Imágenes | CC BY-NC-SA 4.0 (no comercial). Bloquea la descarga automática (403) |

## Cobertura por tipo de ECG

Leyenda: ✅ ya en la v0.1 · 🟢 señal real con etiqueta fiable · 🟡 señal real, etiqueta automática (hay que revisarla caso a caso) · 🖼️ solo imagen · 🔁 transformación exacta de un ECG real

### Parada y ritmos letales

| Tipo | Fuente | n |
|---|---|---|
| FV gruesa y fina | 🟢 vfdb, cudb (tira de monitor); 🟢 Chapman/Ningbo (12 der.) | 35 registros con FV en cudb · 59 ECG |
| Flutter ventricular | 🟢 vfdb, MIT-BIH 207; Chapman/Ningbo | 98 episodios · 7 ECG |
| TV monomorfa | 🟢 vfdb, MIT-BIH; 🟢 Chapman/Ningbo (12 der.); 🟡 MIMIC | 93 + 61 episodios · 109 ECG · ~1.700 |
| Torsade de pointes | Sin etiqueta en ninguna base: buscar en episodios polimorfos de vfdb con revisión visual; 🖼️ Commons (pendiente) | — |
| Asistolia | 🟢 vfdb | 13 episodios |
| RIVA | 🟢 MIT-BIH, Chapman/Ningbo; 🟡 MIMIC | 4 episodios · 14 ECG · ~1.900 |
| Escape ventricular | 🟢 Chapman/Ningbo | 96 ECG |

### Taquicardias

| Tipo | Fuente | n |
|---|---|---|
| TRNAV / TRAV | 🟢 Chapman/Ningbo | 16 / 26 |
| TSV sin especificar | ✅ PTB-XL; 🟢 Chapman/Ningbo | 5 · 724 |
| Taquicardia auricular | 🟢 Chapman/Ningbo | 297 |
| Taquicardia de la unión | 🟢 SPH, Chapman/Ningbo | 13 · 24 |
| Flutter 2:1, 3:1, 4:1, variable | ✅ PTB-XL; 🟢 SPH, MIT-BIH | 7 · 99 |
| FA preexcitada (12 der.) | 🟢 INCART | 1 registro, 149 s |

### Bradicardias y bloqueos

| Tipo | Fuente | n |
|---|---|---|
| Mobitz I (Wenckebach) | 🟢 Chapman/Ningbo, SPH; 🟡 MIMIC | 31 · 9 · ~240 |
| Mobitz II | 🟢 Chapman/Ningbo, SPH; 🟡 MIMIC | 7 · 3 · ~60 |
| BAV 2:1 | 🟢 SPH; ✅ MIT-BIH 231 (monitor) | 35 · 700 s |
| BAV avanzado | 🟢 SPH | 3 |
| BAV completo | ✅ PTB-XL; 🟢 Chapman/Ningbo, SPH | 5 · 76 · 22 |
| Disociación AV | 🟢 Chapman/Ningbo | 59 |
| Paro sinusal / bloqueo SA | 🟢 Chapman/Ningbo | 33 / 5 |
| Ritmo de la unión | 🟢 Chapman/Ningbo, SPH | 139 · 20 |
| Marcapasos | ✅ PTB-XL; 🟢 Chapman/Ningbo | 6 · 1.182 |
| Fallo de captura o detección | 🟡 MIMIC; 🖼️ LITFL (las de ECGpedia son pruebas de umbral con imán, descartadas) | 27 |

### Isquemia y oclusión coronaria

| Tipo | Fuente | n |
|---|---|---|
| Oclusión aguda real por arteria: DA, CD, Cx y TCI, minuto a minuto (T hiperagudas → elevación del ST) | 🟢 **STAFF III** | 58 DA · 59 CD · 32 Cx · 3 TCI |
| Oclusión de circunfleja «sin elevación» (posterior) | 🟢 STAFF III | 32 |
| SCACEST anterior e inferior | ✅ PTB-XL; 🟢 Chapman/Ningbo (IAM agudo) | 17 · 49 |
| Descenso del ST / SCASEST | ✅ PTB-XL | 8 |
| Necrosis antigua | ✅ PTB-XL; 🟢 SPH | 8 · 236 |
| Repolarización precoz (imitador) | 🟢 Chapman/Ningbo, SPH | 366 · 32 |
| Wellens, de Winter, Sgarbossa, IAM posterior | ✅ 🖼️ Commons | 3 · 1 · 1 · 1 |
| IAM de VD con V4R | 🖼️ Commons (pendiente: imagen con V4R identificable) | — |

### Otros, metabólico y tóxico

| Tipo | Fuente | n |
|---|---|---|
| Brugada tipo 1 | 🟢 Brugada-HUCA; Chapman/Ningbo | 19 con patrón tipo 1 basal (69 con diagnóstico) · 5 |
| QT largo por fármacos | ✅ PTB-XL; 🟢 ECGRDVQ (dofetilida, quinidina) | 6 · ensayo |
| Bajo voltaje | 🟢 Chapman/Ningbo, SPH | 1.040 · 322 |
| Pericarditis | ✅ 🖼️ Commons; 🟡 MIMIC | 4 · ~2.500 |
| Dextrocardia | ✅ 🖼️ Commons; 🟡 MIMIC | 1 · 323 |
| Hiperpotasemia, hipopotasemia, hipocalcemia | ✅ 🖼️ Commons (con la cifra de la fuente). Ninguna base abierta vincula señal y electrolitos | 3 · 2 · 2 |
| Hipotermia (J de Osborn), TEP, derrame con alternancia | ✅ 🖼️ Commons | 1 · 1 · 2 |
| Hemorragia subaracnoidea | ✅ 🖼️ Commons | 1 |
| Tricíclicos, Takotsubo | 🖼️ LITFL | — |

### Trampas técnicas

| Tipo | Fuente |
|---|---|
| Inversión de electrodos de miembros | ✅ 🔁 MD↔MI, MI↔PI y MD↔PI, transformación exacta de ECG normales reales; 🟡 MIMIC (1.689 detectadas por el aparato) |
| Artefacto de temblor, tiritona, movimiento | ✅ simulado electrodo a electrodo |

## Huecos que no cubre ninguna base abierta con señal

Hiperpotasemia, hipotermia, intoxicación por tricíclicos, Wellens, de Winter y fallos de marcapasos solo existen como imágenes. Cubiertos en la fase 5 con imágenes de Wikimedia Commons de licencia libre (sin NC); el resto, con el banco propio de ECG de extrahospitalaria anonimizados.

## Orden de integración propuesto

1. ✅ **Monitor** (hecho): FV, flutter ventricular, TV, asistolia, RIVA, bigeminismo y sinusal de vfdb, cudb y MIT-BIH, como tira del monitor-desfibrilador.
2. ✅ **Bloqueos y taquicardias** (hecho): Mobitz I, Mobitz II/2:1/avanzado, BAV completo, unión, TRNAV, TRAV, pausa sinusal y TV en 12 derivaciones (Chapman/Ningbo y SPH), revisados uno a uno. Pendiente: taquicardia auricular. Ojo: en SPH, el código 85 «2:1» acompaña al flutter (conducción 2:1), no es bloqueo AV.
3. ✅ **OMI** (hecho): STAFF III por arteria, con basal, minuto 1 y final del inflado, incluida la circunfleja.
4. ✅ **Brugada**, QT por fármacos, FA preexcitada e inversión de electrodos (hecho).
5. ✅ **Modo imagen** (hecho): 22 ECG de Wikimedia Commons para 13 entidades sin señal. Pendiente: torsade, IAM de VD, fallo de captura.
6. ✅ **Monitor periparada** (hecho): TSV, FA rápida, flutter, BAV 2.º grado y completo, bradicardia con pausas, con conducta ERC 2025.
7. ✅ **Cables y huecos** (hecho): inversiones MI↔PI y MD↔PI, segunda hipocalcemia. Asistolia sin tiras limpias nuevas.
8. **Banco propio** de ECG anonimizados del usuario.
