// Pruebas del motor: node tests/run.js
const fs = require('fs'), vm = require('vm'), zlib = require('zlib'), path = require('path');
const ctx = { console, module: undefined };
vm.createContext(ctx);
for (const f of ['data.js', 'monitor_data.js', 'content.js', 'engine.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../src', f), 'utf8'), ctx, { filename: f });
const E = (s) => vm.runInContext(s, ctx);
const META = E('ECG_META'), CATS = E('CATS'), GROUPS = E('GROUPS');
const { decodeRecord, twelveFrom, noisyLeads, applyFilters, options, grade, buildDeck, rng, notch, lowpass, LEADS } = E('({decodeRecord, twelveFrom, noisyLeads, applyFilters, options, grade, buildDeck, rng, notch, lowpass, LEADS})');
const BYTES = new Uint8Array(zlib.gunzipSync(Buffer.from(E('ECG_BLOB'), 'base64')));
let pass = 0, fail = 0;
const t = (name, ok, extra = '') => { if (ok) pass++; else { fail++; console.log('FALLA:', name, extra); } };
const rms = (a, i0 = 0, i1 = a.length) => { let s = 0; for (let i = i0; i < i1; i++) s += a[i] * a[i]; return Math.sqrt(s / (i1 - i0)); };
const N = E('ECG_N');
const rec = (i) => decodeRecord(BYTES, META[i].o, N);

// 1. Banco: decodifica entero, sin valores imposibles ni derivaciones planas
const all = META.map((m, i) => rec(i));
t('158 registros o más', META.length >= 150, META.length);
let bad = 0, flat = 0;
all.forEach((r, i) => { for (const a of r) { for (const v of a) if (!isFinite(v) || Math.abs(v) > 8) bad++; if (rms(a) < 0.02) flat++; } });
t('valores finitos y < 8 mV', bad === 0, bad);
t('ninguna derivación plana', flat === 0, flat);
// 2. Codificación idéntica a la referencia de Python (I, II y derivadas)
const ref = JSON.parse(fs.readFileSync(path.join(__dirname, 'ref.json')));
for (const [id, leads] of Object.entries(ref)) {
  const i = META.findIndex((m) => m.id === +id), r = all[i], L = twelveFrom(r[0], r[1], r.slice(2));
  let maxe = 0;
  for (const [ln, vals] of Object.entries(leads)) { const a = L[LEADS.indexOf(ln)]; vals.forEach((v, k) => { maxe = Math.max(maxe, Math.abs(a[k * 50] - v)); }); }
  t('registro ' + id + ' = referencia (error < 10 µV)', maxe < 0.01, maxe);
}
// 3. Contenido completo y coherente
const cats = new Set(META.map((m) => m.c));
for (const c of Object.keys(CATS)) {
  const C = CATS[c];
  t('contenido ' + c, C.name && C.claves.length >= 3 && C.trampa && C.sva && GROUPS[C.g], c);
  t('confusiones válidas ' + c, C.conf.every((x) => CATS[x] && x !== c), C.conf);
  t('al menos 5 ECG de ' + c, META.filter((m) => m.c === c).length >= 5, c);
}
t('todas las categorías del banco tienen contenido', [...cats].every((c) => CATS[c]));
t('hallazgos secundarios válidos', META.every((m) => m.sec.every((c) => CATS[c] && c !== m.c)));
// 4. Opciones: 5, sin repetir, con la correcta y sin hallazgos reales secundarios
let okOpts = true;
const r = rng(42);
META.forEach((m) => { for (let k = 0; k < 20; k++) { const o = options(m, null, r, 5); if (o.length !== 5 || new Set(o).size !== 5 || !o.includes(m.c) || o.some((x) => m.sec.includes(x))) okOpts = false; } });
t('opciones correctas en todos los ECG', okOpts);
const m0 = META.find((m) => m.sec.length);
t('nota: correcta, parcial, incorrecta', grade(m0, m0.c) === 'ok' && grade(m0, m0.sec[0]) === 'partial' && grade(m0, Object.keys(CATS).find((c) => c !== m0.c && !m0.sec.includes(c))) === 'bad');
// 5. Artefacto: reproducible y creciente por escena
const i0 = META.findIndex((m) => m.c === 'normal');
const a1 = noisyLeads(all[i0], 'ambulancia', 7).leads, a2 = noisyLeads(all[i0], 'ambulancia', 7).leads;
t('misma semilla, mismo artefacto', a1.every((L, k) => L.every((v, j) => v === a2[k][j])));
const clean = twelveFrom(all[i0][0], all[i0][1], all[i0].slice(2));
const lvl = {};
for (const L of ['limpio', 'leve', 'ambulancia', 'hostil']) {
  let s = 0; for (let seed = 1; seed <= 30; seed++) { const n = noisyLeads(all[i0], L, seed).leads; for (let k = 0; k < 12; k++) { const d = n[k].map((v, j) => v - clean[k][j]); s += rms(d); } }
  lvl[L] = s / 360;
}
t('artefacto limpio = 0', lvl.limpio === 0, lvl.limpio);
t('artefacto leve < ambulancia < hostil', lvl.leve < lvl.ambulancia && lvl.ambulancia < lvl.hostil, JSON.stringify(lvl));
t('artefacto hostil con amplitud realista (0,05–0,6 mV RMS)', lvl.hostil > 0.05 && lvl.hostil < 0.6, lvl.hostil);
// 6. Física de electrodos: temblor del brazo izquierdo se ve en I, III y aVL y respeta II
const zero = Array.from({ length: 8 }, () => new Float32Array(N));
const P = { level: 'test', resp: 0, wander: 0, emg: 0, emgDuty: 0, tremor: 0.1, tremorLimbs: ['LA'], mains: 0, pops: 0, vib: 0, leadOff: null };
const z = noisyLeads(zero, 'x', 3, P).leads, Lx = (n) => rms(z[LEADS.indexOf(n)]);
t('temblor en LA: visible en I, III, aVL', Lx('I') > 0.03 && Lx('III') > 0.03 && Lx('aVL') > 0.03, [Lx('I'), Lx('III'), Lx('aVL')]);
t('temblor en LA: II limpia', Lx('II') < 1e-6, Lx('II'));
const P2 = { ...P, tremor: 0, leadOff: 'V3' };
const z2 = noisyLeads(all[i0], 'x', 3, P2).leads;
t('V3 despegado: casi plano', rms(z2[LEADS.indexOf('V3')]) < 0.01);
// 7. Filtros: el notch elimina 50 Hz, el paso bajo de 40 Hz atenúa 100 Hz, todo estable
const fs250 = 250, sine = (f) => Float32Array.from({ length: 2500 }, (_, i) => Math.sin(2 * Math.PI * f * i / fs250));
t('notch 50 Hz atenúa > 20 dB', rms(notch(sine(50), 50, fs250, 8), 500) < 0.1 * rms(sine(50)));
t('notch respeta 10 Hz', rms(notch(sine(10), 50, fs250, 8), 500) > 0.9 * rms(sine(10)));
t('paso bajo 40 Hz atenúa 100 Hz', rms(lowpass(sine(100), 40, fs250), 500) < 0.2 * rms(sine(100)));
let finite = true;
for (const mode of ['diag', 'mon', 'emg']) for (const nt of [false, true]) applyFilters(a1, { mode, notch: nt }, fs250).forEach((L) => L.forEach((v) => { if (!isFinite(v)) finite = false; }));
t('filtros estables', finite);
// 8. Mazo: respeta la selección y evita dos seguidos de la misma categoría
const sel = new Set(Object.keys(CATS).filter((c) => CATS[c].g === 'isq'));
const deck = buildDeck(META, sel, {}, rng(9), 20);
t('mazo de 20', deck.length === 20);
t('mazo solo con la selección', deck.every((i) => sel.has(META[i].c)));
t('sin dos seguidos de la misma categoría', deck.every((i, k) => k === 0 || META[i].c !== META[deck[k - 1]].c));

// 9. Monitor: banco, contenido, conducta, artefacto de RCP y nota
const MM = E('MON_META'), MC = E('MON_CATS'), CK = E('CONDUCTA_OK'), CONDUCTAS = E('CONDUCTAS');
const { monitorStrip, gradeMon } = E('({monitorStrip, gradeMon})');
const MB = new Uint8Array(zlib.gunzipSync(Buffer.from(E('MON_BLOB'), 'base64')));
const mon = MM.map((m) => decodeRecord(MB, m.o, N, 1)[0]);
t('tiras de monitor decodificadas', mon.length === MM.length && mon.every((a) => a.length === N && a.every((v) => isFinite(v) && Math.abs(v) < 8)));
for (const c of Object.keys(MC)) {
  const n = MM.filter((m) => m.c === c).length;
  t('monitor: al menos 4 tiras de ' + c, n >= 4, n);
  t('monitor: contenido de ' + c, MC[c].name && MC[c].claves.length >= 3 && MC[c].trampa && MC[c].sva);
}
t('monitor: cada contexto tiene conducta válida', MM.every((m) => m.ctx.length && m.ctx.every((x) => CONDUCTAS[CK[m.c][x]])));
t('monitor: FV y flutter ventricular son desfibrilables en parada', CK.fv.parada === 'descarga' && CK.flv.parada === 'descarga' && CK.tv.parada === 'descarga');
t('monitor: asistolia y AESP sin descarga, con adrenalina', CK.asis.parada === 'rcp_adr' && CK.sinusal.parada === 'rcp_adr');
t('monitor: TV con pulso inestable → cardioversión sincronizada', CK.tv.inestable === 'cardioversion');
t('monitor: asistolia casi plana (< 0,5 mV pico a pico)', MM.filter((m) => m.c === 'asis').every((m) => m.p2p < 0.5));
const iF = MM.findIndex((m) => m.c === 'fv');
const s1 = monitorStrip(mon[iF], 'ambulancia', 'parada', 11), s2 = monitorStrip(mon[iF], 'ambulancia', 'parada', 11);
t('monitor: artefacto reproducible', s1.x.every((v, j) => v === s2.x[j]));
t('monitor: limpio no modifica la señal', monitorStrip(mon[iF], 'limpio', 'parada', 3).x.every((v, j) => v === mon[iF][j]));
let cprOk = true;
for (let seed = 1; seed <= 20; seed++) {
  const z = monitorStrip(new Float32Array(N), 'leve', 'parada', seed), stop = Math.floor(z.P.cpr * 250);
  if (!(z.P.cpr >= 2 && z.P.cpr <= 4) || rms(z.x, 0, stop) < 0.2 || rms(z.x, stop + 250, N) > 0.15) cprOk = false;
}
t('monitor: compresiones solo hasta la pausa de análisis', cprOk);
t('monitor: sin compresiones si hay pulso', monitorStrip(new Float32Array(N), 'hostil', 'pulso', 4).P.cpr === 0);
const cu = MM.find((m) => m.db === 'cudb');
t('monitor: en cudb vale FV o flutter ventricular', gradeMon(cu, 'flv', 'descarga', 'parada').g === 'ok' && gradeMon(cu, 'fv', 'descarga', 'parada').g === 'ok');
const tvm = MM.find((m) => m.c === 'tv');
t('monitor: nota parcial si falla la conducta', gradeMon(tvm, 'tv', 'descarga', 'inestable').g === 'partial' && gradeMon(tvm, 'asis', 'observar', 'inestable').g === 'bad');

// 10. Fase 2: bloqueos y taquicardias de Chapman/Ningbo y SPH
const F2 = META.filter((m) => m.src);
t('fase 2: al menos 60 ECG nuevos', F2.length >= 60, F2.length);
const LAB = { mobitz1: /Mobitz I\b/, bav2alto: /Mobitz II|avanzado|segundo grado|2:1/, bav3: /BAV completo/, trnav: /TRNAV/, trav: /TRAV/, tv: /taquicardia ventricular/, union: /unión/, paro: /paro sinusal|sinoauricular/ };
t('fase 2: la etiqueta de la fuente respalda la categoría', F2.every((m) => !LAB[m.c] || m.rep.some((r) => LAB[m.c].test(r))), F2.filter((m) => LAB[m.c] && !m.rep.some((r) => LAB[m.c].test(r))).map((m) => m.id));
t('fase 2: ningún bloqueo AV etiquetado también como FA o flutter', F2.filter((m) => ['mobitz1', 'bav2alto', 'bav3', 'union'].includes(m.c)).every((m) => !m.rep.some((r) => /fibrilación|flutter/.test(r))));
const HR = { tv: (h) => h >= 110, trnav: (h) => h >= 110, trav: (h) => h >= 110, bav3: (h) => h < 60, union: (h) => h >= 35 && h <= 150 };
t('fase 2: frecuencia coherente con el diagnóstico', F2.every((m) => !HR[m.c] || HR[m.c](m.hr)), F2.filter((m) => HR[m.c] && !HR[m.c](m.hr)).map((m) => m.id + ':' + m.hr));
t('fase 2: TRNAV y TRAV aceptan «TSV» como hallazgo parcial', F2.filter((m) => m.c === 'trnav' || m.c === 'trav').every((m) => m.sec.includes('tsv')));
t('fase 2: RIVA en monitor ampliado (≥ 8 tiras)', MM.filter((m) => m.c === 'riva').length >= 8);

// 11. Fase 3: oclusiones reales de STAFF III
vm.runInContext(fs.readFileSync(path.join(__dirname, '../occ_data.js'), 'utf8'), ctx, { filename: 'occ_data.js' });
const OM = E('OCC_META'), OC = E('OCC_CATS');
const OB = new Uint8Array(zlib.gunzipSync(Buffer.from(E('OCC_BLOB'), 'base64')));
let occOk = true;
OM.forEach((p) => p.wins.forEach((w) => { const r = decodeRecord(OB, w.o, N); if (r.some((a) => a.some((v) => !isFinite(v) || Math.abs(v) > 8))) occOk = false; }));
t('oclusión: ventanas decodificadas y plausibles', occOk);
t('oclusión: al menos 70 pacientes', OM.length >= 70, OM.length);
for (const a of ['da', 'cd', 'cx']) t('oclusión: al menos 10 pacientes con ' + a, OM.filter((p) => p.art === a).length >= 10);
t('oclusión: primero basal y después tiempos crecientes', OM.every((p) => p.wins[0].t < 0 && p.wins.slice(1).every((w, i, arr) => w.t > 0 && (i === 0 || w.t > arr[i - 1].t))));
t('oclusión: contenido completo', Object.values(OC).every((c) => c.name && c.opt && c.claves.length >= 3 && c.trampa && c.sva));
const meanD = (a, li) => { const ps = OM.filter((p) => p.art === a); return ps.reduce((s, p) => s + p.wins[p.wins.length - 1].st[li] - p.wins[0].st[li], 0) / ps.length; };
const Li = (l) => LEADS.indexOf(l);
t('oclusión DA: sube el ST en V2–V3', meanD('da', Li('V2')) > 0.1 && meanD('da', Li('V3')) > 0.1);
t('oclusión CD: sube en III y baja en aVL', meanD('cd', Li('III')) > 0.05 && meanD('cd', Li('aVL')) < -0.05);
t('oclusión Cx: baja en V1–V3 (posterior)', meanD('cx', Li('V2')) < -0.05);

// 12. Fase 4: Brugada, QT por fármacos, FA preexcitada e inversión de electrodos
const applyXf = E('applyXf');
const inv = META.map((m, i) => [m, i]).filter(([m]) => m.xf === 'brazos');
t('fase 4: al menos 5 inversiones de brazos', inv.length >= 5);
let xfOk = true;
for (const [m, i] of inv) {
  const src = META.findIndex((x) => x.c === 'normal' && x.o === m.o);
  const a = twelveFrom(...(() => { const r = rec(src); return [r[0], r[1], r.slice(2)]; })());
  const rb = applyXf(rec(i), 'brazos'), b = twelveFrom(rb[0], rb[1], rb.slice(2));
  const eq = (x, y, s = 1) => x.every((v, j) => Math.abs(v - s * y[j]) < 1e-5);
  // RA↔LA: I → −I, II ↔ III, aVR ↔ aVL, aVF y precordiales iguales
  if (src < 0 || !eq(b[0], a[0], -1) || !eq(b[1], a[2]) || !eq(b[2], a[1]) || !eq(b[3], a[4]) || !eq(b[4], a[3]) || !eq(b[5], a[5]) || !eq(b[6], a[6]) || !eq(b[11], a[11])) xfOk = false;
}
t('fase 4: la inversión de brazos es la transformación exacta (I→−I, II↔III, aVR↔aVL)', xfOk);
const BR = META.filter((m) => m.c === 'brugada');
t('fase 4: al menos 8 Brugada tipo 1 confirmados', BR.length >= 8 && BR.every((m) => m.src === 'huca' && m.rep.some((r) => /Brugada tipo 1/.test(r))));
const QD = META.filter((m) => m.src === 'rdvq');
t('fase 4: QT por fármacos con QTc ≥ 500 ms', QD.length >= 5 && QD.every((m) => m.c === 'qt_largo' && m.qtc >= 500));
const FP = META.filter((m) => m.c === 'fa_preex');
t('fase 4: FA preexcitada acepta FA y WPW como parciales', FP.length >= 5 && FP.every((m) => m.sec.includes('fa') && m.sec.includes('wpw')));

// 13. Fase 5: modo imagen (Wikimedia Commons)
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/img_data.js'), 'utf8'), ctx, { filename: 'img_data.js' });
const IM = E('IMG_META'), IC = E('IMG_CATS'), imgOptions = E('imgOptions'), gradeImg = E('gradeImg');
const IQ = IM.filter((m) => m.q !== false);
t('fase 5: al menos 15 imágenes de práctica', IQ.length >= 15, IQ.length);
t('fase 5: ids únicos', new Set(IM.map((m) => m.id)).size === IM.length);
t('fase 5: cada imagen tiene categoría, archivo, nota y atribución completa', IM.every((m) => IC[m.c] && m.file && m.nota && m.autor && m.title && /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(m.page) && /^https?:\/\//.test(m.licurl)), IM.filter((m) => !IC[m.c] || !m.autor || !m.licurl).map((m) => m.id).join());
t('fase 5: solo licencias libres que permiten redistribuir (sin NC ni ND)', IM.every((m) => /^(CC BY(-SA)? \d\.\d|CC0|Dominio público)$/.test(m.lic)), IM.map((m) => m.lic).join());
const imgDir = path.join(__dirname, '../img');
t('fase 5: el archivo de cada imagen existe, ≤ 1600 px de ancho y < 600 kB', IM.every((m) => fs.existsSync(path.join(imgDir, m.file)) && m.w <= 1600 && fs.statSync(path.join(imgDir, m.file)).size < 600e3));
t('fase 5: no hay imágenes sueltas sin metadatos', fs.readdirSync(imgDir).every((f) => IM.some((m) => m.file === f)));
t('fase 5: los pares apuntan a imágenes de apoyo (fuera de la práctica) con etiqueta', IM.filter((m) => m.par).every((m) => { const p = IM.find((x) => x.id === m.par); return p && p.q === false && p.parLabel && p.c === m.c; }));
t('fase 5: los hallazgos secundarios existen', IM.every((m) => (m.sec || []).concat(m.acc || []).every((c) => IC[c] || CATS[c])));
t('fase 5: contenido docente completo y distractores válidos', Object.values(IC).every((c) => c.name && c.claves.length >= 3 && c.trampa && c.sva && c.conf.length >= 4 && c.conf.every((x) => IC[x] || CATS[x])));
t('fase 5: ninguna clave de imagen pisa una categoría de señal', Object.keys(IC).every((c) => !CATS[c]));
let ioOk = true;
const ir = rng(7);
for (const m of IQ) for (let k = 0; k < 20; k++) {
  const o = imgOptions(m, IC, ir);
  if (o.length !== 5 || !o.includes(m.c) || new Set(o).size !== 5 || o.some((c) => c !== m.c && ((m.sec || []).includes(c) || (m.acc || []).includes(c)))) ioOk = false;
}
t('fase 5: 5 opciones, con la correcta, sin repetir ni ofrecer hallazgos presentes', ioOk);
const tp = IM.find((m) => (m.sec || []).length);
t('fase 5: corrección (correcta = ok, hallazgo secundario = parcial, otra = mal)', gradeImg(tp, tp.c) === 'ok' && gradeImg(tp, tp.sec[0]) === 'partial' && gradeImg(tp, IC[tp.c].conf.find((c) => !(tp.sec || []).includes(c))) === 'bad');
const hp = IM.find((m) => (m.parcial || []).length);
t('fase 5: lectura parcial defendible (se ofrece y puntúa como parcial)', !hp || (gradeImg(hp, hp.parcial[0]) === 'partial' && imgOptions(hp, IC, rng(3)).includes(hp.parcial[0])));
t('fase 5: dosis con unidades seguras (mcg, unidades; nunca µg ni UI)', Object.values(IC).every((c) => !/µg|\bUI\b/.test(c.sva + c.trampa)));

// 14. Fase 6: periparada en el modo monitor
const M6 = MM, KO = E('CONDUCTA_OK'), KD = E('CONDUCTAS'), conductaOk = E('conductaOk'), gradeMon6 = E('gradeMon');
const P6 = ['tsv', 'fa', 'flutter', 'bradi', 'bav2', 'bav3'];
t('fase 6: al menos 5 tiras de cada ritmo periparada', P6.every((c) => M6.filter((m) => m.c === c).length >= 5), P6.map((c) => c + ' ' + M6.filter((m) => m.c === c).length).join());
t('fase 6: contenido completo de los ritmos nuevos', P6.every((c) => MC[c] && MC[c].name && MC[c].claves.length >= 3 && MC[c].trampa && MC[c].sva));
t('fase 6: cada situación de cada tira tiene una conducta definida y existente', M6.every((m) => m.ctx.every((x) => KD[conductaOk(m, x)])));
t('fase 6: inestable con taquicardia supraventricular = cardioversión sincronizada', ['tsv', 'fa', 'flutter'].every((c) => KO[c].inestable === 'cardioversion'));
t('fase 6: estable: TSV = vagales/adenosina; FA y flutter = control de FC', KO.tsv.pulso === 'adenosina' && KO.fa.pulso === 'control_fc' && KO.flutter.pulso === 'control_fc');
const BV = M6.filter((m) => m.c === 'bav2' || m.c === 'bav3');
t('fase 6: todos los BAV tienen anchura del QRS', BV.length >= 10 && BV.every((m) => m.qrs === 'ancho' || m.qrs === 'estrecho'));
t('fase 6: BAV con QRS ancho e inestable = marcapasos o perfusión, nunca atropina (ERC 2025)', BV.filter((m) => m.qrs === 'ancho').every((m) => conductaOk(m, 'inestable') === 'marcapasos' && !gradeMon6(m, m.c, 'atropina', 'inestable').kOk));
t('fase 6: BAV con QRS estrecho e inestable = atropina', BV.filter((m) => m.qrs === 'estrecho').every((m) => conductaOk(m, 'inestable') === 'atropina'));
t('fase 6: hay BAV de QRS ancho y de QRS estrecho', BV.some((m) => m.qrs === 'ancho') && BV.some((m) => m.qrs === 'estrecho'));
t('fase 6: BAV sin pulso = AESP (RCP y adrenalina)', BV.every((m) => !m.ctx.includes('parada') || conductaOk(m, 'parada') === 'rcp_adr'));
t('fase 6: las tiras periparada no se ofrecen en parada salvo los BAV', M6.filter((m) => ['tsv', 'fa', 'flutter', 'bradi'].includes(m.c)).every((m) => !m.ctx.includes('parada')));
t('fase 6: tiras de 10 s sin valores imposibles', (() => { const B6 = new Uint8Array(zlib.gunzipSync(Buffer.from(E('MON_BLOB'), 'base64'))); return M6.filter((m) => P6.includes(m.c)).every((m) => { const x = decodeRecord(B6, m.o, N, 1)[0]; return x.length === 2500 && x.every((v) => isFinite(v) && Math.abs(v) < 6); }); })());
t('fase 6: dosis periparada en mcg (nunca µg ni UI)', P6.every((c) => !/µg|\bUI\b/.test(MC[c].sva + MC[c].trampa)));
console.log(`${pass} pruebas superadas, ${fail} fallidas`);
process.exit(fail ? 1 : 0);
