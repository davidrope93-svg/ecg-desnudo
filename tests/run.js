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
console.log(`${pass} pruebas superadas, ${fail} fallidas`);
process.exit(fail ? 1 : 0);
