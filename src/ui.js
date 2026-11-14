/* Interfaz: papel milimetrado, compás, práctica, examen, atlas y progreso. */
(() => {
'use strict';
const KEY = 'ecgdesnudo.v1'; // nombre antiguo del proyecto: se mantiene para no perder el progreso guardado
const app = document.getElementById('app');
const h = (tag, a, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(a || {})) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(9)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
};
const fmt = (x, d = 0) => (x == null || isNaN(x)) ? '—' : Number(x).toFixed(d).replace('.', ',');

/* ---------- Datos ---------- */
let BYTES = null;
const CACHE = new Map();
const rec8 = (i) => { if (!CACHE.has(i)) CACHE.set(i, applyXf(decodeRecord(BYTES, ECG_META[i].o, ECG_N), ECG_META[i].xf)); return CACHE.get(i); };
async function loadBank() {
  const bin = Uint8Array.from(atob(ECG_BLOB), (c) => c.charCodeAt(0));
  const ds = new DecompressionStream('gzip');
  const buf = await new Response(new Blob([bin]).stream().pipeThrough(ds)).arrayBuffer();
  BYTES = new Uint8Array(buf);
  const mb = Uint8Array.from(atob(MON_BLOB), (c) => c.charCodeAt(0));
  MON_BYTES = new Uint8Array(await new Response(new Blob([mb]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
}

/* ---------- Estado guardado ---------- */
const DEF = { settings: { noise: 'ambulancia', answer: 'opts', ctx: false, zoom: 1, groups: { ritmo: true, cond: true, isq: true, otros: true } }, stats: {}, missed: [], total: 0 };
const clone = (o) => JSON.parse(JSON.stringify(o));
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && s.settings) return { ...clone(DEF), ...s, settings: { ...DEF.settings, ...s.settings, groups: { ...DEF.settings.groups, ...(s.settings.groups || {}) } } };
  } catch (e) { /* almacenamiento no disponible */ }
  return clone(DEF);
}
let S = loadState();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* sin persistencia */ } };
const R = rng((Date.now() ^ (Math.random() * 1e9)) >>> 0);
const newSeed = () => Math.floor(R() * 4294967296) >>> 0;
const selCats = () => new Set(Object.keys(CATS).filter((c) => S.settings.groups[CATS[c].g]));
const byId = new Map(ECG_META.map((m, i) => [m.id, i]));

/* ---------- Papel ECG ---------- */
const G = { ML: 10, TH: 7, RH: 27, RS: 27, MB: 5, W: 264 };
G.H = G.TH + 3 * G.RH + G.RS + G.MB;
const LAYOUT = [['I', 'aVR', 'V1', 'V4'], ['II', 'aVL', 'V2', 'V5'], ['III', 'aVF', 'V3', 'V6']];
const LIMB_LEADS = { RA: 'I, II y aVR', LA: 'I, III y aVL', LL: 'II, III y aVF' };
const LIMB_NAME = { RA: 'brazo derecho', LA: 'brazo izquierdo', LL: 'pierna izquierda' };

function describeNoise(P) {
  if (!P || P.level === 'limpio') return 'Registro limpio.';
  const out = [];
  if (P.tremor) out.push('temblor de 4–7 Hz en ' + P.tremorLimbs.map((l) => LIMB_NAME[l] + ' (se ve en ' + LIMB_LEADS[l] + ')').join(' y ') + ': puede imitar ondas F');
  if (P.leadOff) out.push(P.leadOff + ' despegado');
  if (P.mains) out.push('interferencia de 50 Hz (prueba el filtro de 50 Hz)');
  if (P.pops) out.push('electrodos que se mueven (saltos bruscos de la línea de base)');
  if (P.vib) out.push('vibración del vehículo');
  if (P.emg >= 0.02) out.push('tensión muscular (prueba el filtro muscular)');
  if (P.wander >= 0.1) out.push('línea de base inestable por respiración y movimiento');
  return out.length ? out.join('; ') + '.' : 'Artefacto leve.';
}

function makeViewer(opt = {}) {
  const st = { meta: null, idx: -1, seed: 0, level: 'limpio', noisy: null, clean: false, filt: { mode: 'diag', notch: false }, strip: 'II', cal: false, c: null, s: 4 };
  const cv = h('canvas'), ov = h('canvas', { class: 'ov' });
  const wrap = h('div', { class: 'paperwrap' }, cv, ov);
  const tb = h('div', { class: 'tools' });
  const hint = h('div', { class: 'hint hidden' }, 'Compás: arrastra sobre el trazado para medir intervalo y amplitud. Arrastra un extremo para ajustarlo o la barra para desplazarlo entero.');
  const swipe = h('div', { class: 'hint hidden' }, 'Desliza el papel para ver V4–V6 o gira el móvil.');
  const el = h('div', {}, tb, wrap, swipe, hint);

  const bZm = h('button', { class: 'tool', title: 'Alejar', onclick: () => zoom(-1) }, '−');
  const zLbl = h('span', { class: 'small muted' });
  const bZp = h('button', { class: 'tool', title: 'Acercar', onclick: () => zoom(1) }, '+');
  const bCal = h('button', { class: 'tool', onclick: () => { st.cal = !st.cal; if (!st.cal) st.c = null; sync(); drawOv(); } }, 'Compás');
  const sF = h('select', { onchange: (e) => { st.filt.mode = e.target.value; render(); } }, Object.entries(FILTERS).map(([k, f]) => h('option', { value: k, title: f.name }, 'Filtro ' + f.short)));
  const bN = h('button', { class: 'tool', onclick: () => { st.filt.notch = !st.filt.notch; render(); } }, '50 Hz');
  const sS = h('select', { onchange: (e) => { st.strip = e.target.value; render(); } }, LEADS.map((l) => h('option', { value: l }, 'Tira ' + l)));
  const bClean = h('button', { class: 'tool hidden', onclick: () => { st.clean = !st.clean; render(); } }, 'Ver sin artefacto');
  tb.append(bZm, zLbl, bZp, bCal, h('label', { class: 'tool' }, sF), bN, h('label', { class: 'tool' }, sS), bClean);

  function sync() {
    bCal.classList.toggle('on', st.cal); bN.classList.toggle('on', st.filt.notch); bClean.classList.toggle('on', st.clean);
    ov.style.pointerEvents = st.cal ? 'auto' : 'none'; ov.style.touchAction = st.cal ? 'none' : 'auto'; ov.style.cursor = st.cal ? 'crosshair' : 'default';
    hint.classList.toggle('hidden', !st.cal);
    zLbl.textContent = '×' + fmt(S.settings.zoom, S.settings.zoom % 1 ? 1 : 0);
    sF.value = st.filt.mode; sS.value = st.strip;
  }
  function zoom(d) {
    const Z = [0.75, 1, 1.5, 2, 3];
    let i = Z.indexOf(S.settings.zoom); if (i < 0) i = 1;
    S.settings.zoom = Z[Math.max(0, Math.min(Z.length - 1, i + d))]; save(); render();
  }
  function signals() {
    const r = st.rec;
    const leads = st.clean ? twelveFrom(r[0], r[1], r.slice(2)) : st.noisy.leads;
    return applyFilters(leads, st.filt, ECG_FS);
  }
  function render() {
    if (st.idx < 0) return;
    sync();
    const wrapW = wrap.clientWidth || Math.min(window.innerWidth - 24, 1150);
    const fit = Math.max(wrapW / G.W, 2.4), s = fit * S.settings.zoom;
    st.s = s;
    const W = Math.round(G.W * s), H = Math.round(G.H * s);
    let dpr = window.devicePixelRatio || 1;
    if (W * H * dpr * dpr > 14e6) dpr = Math.sqrt(14e6 / (W * H));
    for (const c of [cv, ov]) { c.style.width = W + 'px'; c.style.height = H + 'px'; c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    st.dpr = dpr;
    swipe.classList.toggle('hidden', W <= wrapW + 4);
    const g = cv.getContext('2d');
    g.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
    const px = 1 / (s * dpr);
    g.fillStyle = '#fff8f6'; g.fillRect(0, 0, G.W, G.H);
    // cuadrícula
    g.beginPath(); g.lineWidth = px; g.strokeStyle = '#f6d0d0';
    for (let x = 0; x <= G.W; x += 1) { g.moveTo(x, 0); g.lineTo(x, G.H); }
    for (let y = 0; y <= G.H; y += 1) { g.moveTo(0, y); g.lineTo(G.W, y); }
    g.stroke();
    g.beginPath(); g.lineWidth = Math.max(px * 1.4, 0.1); g.strokeStyle = '#eba2a2';
    for (let x = 0; x <= G.W; x += 5) { g.moveTo(x, 0); g.lineTo(x, G.H); }
    for (let y = 0; y <= G.H; y += 5) { g.moveTo(0, y); g.lineTo(G.W, y); }
    g.stroke();
    // cabecera
    g.fillStyle = '#4a3434'; g.font = '2.6px -apple-system,Segoe UI,Roboto,Arial,sans-serif'; g.textBaseline = 'middle';
    const F = FILTERS[st.filt.mode];
    g.fillText('25 mm/s · 10 mm/mV · ' + F.name + ' · 50 Hz ' + (st.filt.notch ? 'sí' : 'no') + (st.clean ? ' · SIN ARTEFACTO' : ''), 2, 3.6);
    if (opt.ctx && st.meta && (st.meta.sex || st.meta.age != null)) { const t = (st.meta.sex ? (st.meta.sex === 'M' ? 'Varón' : 'Mujer') : '') + (st.meta.age != null ? (st.meta.sex ? ' · ' : '') + st.meta.age + ' años' : ''); g.textAlign = 'right'; g.fillText(t, G.W - 2, 3.6); g.textAlign = 'left'; }
    const sig = signals();
    const lw = Math.max(px * 1.25, 0.17);
    const trace = (a, i0, i1, x0, y0) => {
      g.beginPath();
      for (let i = i0; i < i1; i++) { const x = x0 + (i - i0) * 0.1, y = y0 - a[i] * 10; i === i0 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.stroke();
    };
    const cal = (y0) => { g.beginPath(); g.moveTo(2, y0); g.lineTo(3, y0); g.lineTo(3, y0 - 10); g.lineTo(8, y0 - 10); g.lineTo(8, y0); g.lineTo(9, y0); g.stroke(); };
    g.strokeStyle = '#111'; g.lineWidth = lw; g.lineJoin = 'round';
    g.font = 'bold 3.1px -apple-system,Segoe UI,Roboto,Arial,sans-serif'; g.fillStyle = '#111';
    for (let r = 0; r < 3; r++) {
      const y0 = G.TH + G.RH * r + G.RH * 0.56;
      cal(y0);
      for (let c = 0; c < 4; c++) {
        const L = LAYOUT[r][c], k = LEADS.indexOf(L), x0 = G.ML + c * 62.5;
        trace(sig[k], c * 625, (c + 1) * 625 + (c < 3 ? 1 : 0), x0, y0);
        g.fillText(L, x0 + 1.2, G.TH + G.RH * r + 3.2);
        if (c) { g.beginPath(); g.moveTo(x0, y0 - 3); g.lineTo(x0, y0 + 3); g.stroke(); }
      }
    }
    const yS = G.TH + 3 * G.RH + G.RS * 0.56;
    cal(yS);
    trace(sig[LEADS.indexOf(st.strip)], 0, ECG_N, G.ML, yS);
    g.fillText(st.strip, G.ML + 1.2, G.TH + 3 * G.RH + 3.2);
    drawOv();
  }
  function drawOv() {
    const g = ov.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, ov.width, ov.height);
    if (!st.cal || !st.c) return;
    const s = st.s, dpr = st.dpr;
    g.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
    const { x1, y1, x2, y2 } = st.c, px = 1 / (s * dpr);
    g.strokeStyle = '#c8102e'; g.fillStyle = '#c8102e'; g.lineWidth = Math.max(px * 1.6, 0.18);
    g.beginPath();
    for (const x of [x1, x2]) { g.moveTo(x, G.TH); g.lineTo(x, G.H - G.MB); }
    const yb = Math.min(y1, y2) - 4;
    g.moveTo(x1, yb); g.lineTo(x2, yb);
    g.moveTo(x1 - 1.5, y1); g.lineTo(x1 + 1.5, y1); g.moveTo(x2 - 1.5, y2); g.lineTo(x2 + 1.5, y2);
    g.stroke();
    const ms = Math.abs(x2 - x1) / 25 * 1000, mv = (y1 - y2) / 10;
    const t1 = Math.round(ms) + ' ms' + (ms > 150 ? ' · ' + Math.round(60000 / ms) + ' lpm' : '');
    const t2 = (mv >= 0 ? '+' : '') + fmt(mv, 2) + ' mV (' + fmt(Math.abs(mv) * 10, 1) + ' mm)';
    g.font = 'bold 3px -apple-system,Segoe UI,Roboto,Arial,sans-serif';
    const tw = Math.max(g.measureText(t1).width, g.measureText(t2).width) + 3;
    let lx = (x1 + x2) / 2 - tw / 2; lx = Math.max(1, Math.min(G.W - tw - 1, lx));
    let ly = yb - 9; if (ly < 1) ly = Math.max(y1, y2) + 3;
    g.fillStyle = 'rgba(255,255,255,.93)'; g.fillRect(lx, ly, tw, 8);
    g.strokeRect(lx, ly, tw, 8);
    g.fillStyle = '#c8102e'; g.textBaseline = 'middle';
    g.fillText(t1, lx + 1.5, ly + 2.2); g.fillText(t2, lx + 1.5, ly + 5.8);
  }
  // compás
  let drag = null;
  const mm = (e) => { const b = ov.getBoundingClientRect(); return { x: (e.clientX - b.left) / st.s, y: (e.clientY - b.top) / st.s }; };
  ov.addEventListener('pointerdown', (e) => {
    if (!st.cal) return;
    const p = mm(e); ov.setPointerCapture(e.pointerId);
    const c = st.c;
    if (c && Math.abs(p.x - c.x1) < 2.5) drag = { k: 1 };
    else if (c && Math.abs(p.x - c.x2) < 2.5) drag = { k: 2 };
    else if (c && p.x > Math.min(c.x1, c.x2) && p.x < Math.max(c.x1, c.x2) && Math.abs(p.y - (Math.min(c.y1, c.y2) - 4)) < 3) drag = { k: 0, p, c: { ...c } };
    else { st.c = { x1: p.x, y1: p.y, x2: p.x, y2: p.y }; drag = { k: 2 }; }
    e.preventDefault();
  });
  ov.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = mm(e);
    if (drag.k === 1) { st.c.x1 = p.x; st.c.y1 = p.y; }
    else if (drag.k === 2) { st.c.x2 = p.x; st.c.y2 = p.y; }
    else { const dx = p.x - drag.p.x, dy = p.y - drag.p.y; st.c = { x1: drag.c.x1 + dx, x2: drag.c.x2 + dx, y1: drag.c.y1 + dy, y2: drag.c.y2 + dy }; }
    drawOv();
  });
  const end = () => { drag = null; };
  ov.addEventListener('pointerup', end); ov.addEventListener('pointercancel', end);
  const ro = new ResizeObserver(() => { if (Math.abs((wrap.clientWidth || 0) - (st.lastW || 0)) > 8) { st.lastW = wrap.clientWidth; render(); } });
  ro.observe(wrap);

  return {
    el,
    set(idx, seed, level) {
      const ext = typeof idx === 'object' ? idx : null;
      st.idx = ext ? 0 : idx; st.meta = ext ? ext.meta : ECG_META[idx]; st.seed = seed; st.level = level; st.clean = false; st.c = null;
      const r = ext ? [ext.rec[0], ext.rec[1], ...ext.rec[2]] : rec8(idx); st.rec = r;
      st.noisy = noisyLeads(r, level, seed);
      bClean.classList.toggle('hidden', st.noisy.P.level === 'limpio' || !opt.allowClean);
      requestAnimationFrame(render);
    },
    allowClean(v) { opt.allowClean = v; bClean.classList.toggle('hidden', !v || !st.noisy || st.noisy.P.level === 'limpio'); },
    noise() { return st.noisy && st.noisy.P; },
    render,
    destroy() { ro.disconnect(); },
  };
}

/* ---------- Bloques comunes ---------- */
function feedback(meta, grade, ans, P) {
  const C = CATS[meta.c];
  const V = { ok: 'Correcto', partial: 'Casi: eso también está, pero no es lo principal', bad: 'No es eso', info: GROUPS[C.g] };
  const facts = [];
  if (meta.hr != null) facts.push('FC ' + meta.hr + ' lpm' + (meta.src ? ' (estimada)' : ''));
  if (meta.pr != null && !['fa', 'flutter'].includes(meta.c)) facts.push('PR ' + meta.pr + ' ms');
  if (meta.qrs != null) facts.push('QRS ' + meta.qrs + ' ms');
  if (meta.qtc != null) facts.push('QTc ' + meta.qtc + ' ms');
  if (meta.ax != null) facts.push('Eje ' + meta.ax + '°');
  const st = [];
  if (meta.ste.length) st.push('Elevación del ST: ' + meta.ste.join(', '));
  if (meta.std.length) st.push('Descenso del ST: ' + meta.std.join(', '));
  if (meta.avr >= 0.1) st.push('Elevación del ST en aVR: ' + fmt(meta.avr * 10, 1) + ' mm');
  const codes = meta.rep || meta.k.filter((k) => CODES[k] && !(k === 'NORM' && meta.c !== 'normal')).map((k) => CODES[k] + (meta.stg && /MI$/.test(k) ? ' (' + STAGES[meta.stg] + ')' : ''));
  const SRC = meta.xf ? ['Origen: ', 'Transformación exacta de PTB-XL · ', 'mismo ECG con los cables cambiados'] : ({ cn: ['Etiquetas de la fuente: ', 'Chapman-Shaoxing/Ningbo · ', 'etiqueta de la fuente revisada visualmente · FC estimada'], sph: ['Informe revisado por cardiólogos: ', 'SPH (Shandong) · ', 'FC estimada'], huca: ['Diagnóstico: ', 'Brugada-HUCA (Asturias) · ', 'patrón revisado en el latido mediano de V1–V2 · FC estimada'], rdvq: ['Contexto: ', 'ECGRDVQ (FDA) · ', 'QTc del laboratorio central del ensayo'], incart: ['Anotación: ', 'INCART (San Petersburgo) · ', 'anotado por expertos · FC estimada'] }[meta.src] || ['Informe del cardiólogo: ', 'PTB-XL n.º ', 'medidas automáticas GE 12SL (orientativas)']);
  const sec = meta.sec.map((c) => CATS[c].name);
  return h('div', { class: 'fb' },
    h('div', { class: 'verdict ' + grade }, V[grade]),
    h('div', { class: 'body' },
      h('div', {}, h('h3', {}, C.name), ans && ans !== meta.c ? h('div', { class: 'small muted' }, 'Tu respuesta: ' + CATS[ans].name) : null),
      h('div', {}, h('h4', {}, 'En este ECG'),
        h('div', { class: 'facts' }, facts.map((f) => h('span', {}, f))),
        st.length ? h('div', { class: 'small', style: 'margin-top:6px' }, st.join(' · ')) : null,
        codes.length ? h('div', { class: 'small', style: 'margin-top:6px' }, h('b', {}, SRC[0]), codes.join(', ')) : null,
        sec.length ? h('div', { class: 'small', style: 'margin-top:4px' }, h('b', {}, 'También presente: '), sec.join(', ')) : null,
        P ? h('div', { class: 'small muted', style: 'margin-top:4px' }, h('b', {}, 'Artefacto: '), describeNoise(P)) : null),
      h('div', {}, h('h4', {}, 'Claves'), h('ul', {}, C.claves.map((x) => h('li', {}, x)))),
      h('div', { class: 'callout' }, h('h4', {}, 'Trampa'), C.trampa),
      h('div', { class: 'callout teal' }, h('h4', {}, 'En SVA'), C.sva),
      h('div', { class: 'src' }, SRC[1] + meta.id + (meta.sex ? ' · ' + (meta.sex === 'M' ? 'varón' : 'mujer') : '') + (meta.age != null ? ', ' + meta.age + ' años' : '') + ' · ' + SRC[2] + ' · artefacto simulado')));
}

const SYS = h('details', { class: 'sys' }, h('summary', {}, 'Lectura sistemática'),
  h('ol', {},
    h('li', {}, 'Calidad: calibración (10 mm/mV, 25 mm/s), artefacto, electrodos mal colocados.'),
    h('li', {}, 'Ritmo y FC: ¿regular? ¿P delante de cada QRS? FC = 300 / cuadrados grandes entre R, o QRS en 10 s × 6.'),
    h('li', {}, 'Eje: polaridad del QRS en I y aVF (y II si I es positivo y aVF negativo).'),
    h('li', {}, 'P y PR: morfología, PR 120–200 ms, relación P-QRS.'),
    h('li', {}, 'QRS: anchura (< 120 ms), morfología, ondas Q, voltaje.'),
    h('li', {}, 'ST: elevación o descenso, territorio coronario e imagen especular.'),
    h('li', {}, 'T y QT: polaridad, simetría, QTc.')));

function answerPanel(meta, opts, onAnswer) {
  const btns = [];
  const pick = (c) => onAnswer(c, btns);
  let body;
  if (opts) {
    body = h('div', { class: 'opts' }, opts.map((c, i) => { const b = h('button', { class: 'opt', 'data-c': c, onclick: () => pick(c) }, (i + 1) + '. ' + CATS[c].name); btns.push(b); return b; }));
  } else {
    body = h('div', { class: 'glist' }, Object.entries(GROUPS).map(([g, gn]) => h('div', { class: 'g' }, h('b', {}, gn),
      h('div', { class: 'row' }, Object.keys(CATS).filter((c) => CATS[c].g === g).map((c) => { const b = h('button', { class: 'opt', 'data-c': c, onclick: () => pick(c) }, CATS[c].name); btns.push(b); return b; })))));
  }
  return { el: h('div', { class: 'answers' }, h('div', { class: 'sec-title', style: 'margin-top:4px' }, '¿Qué ves?'), body), btns };
}
function markButtons(btns, meta, ans, grade) {
  for (const b of btns) {
    const c = b.dataset.c; b.disabled = true;
    if (c === meta.c) b.classList.add('ok');
    else if (c === ans) b.classList.add(grade === 'partial' ? 'partial' : 'bad');
    else if (meta.sec.includes(c)) b.classList.add('partial');
    else b.classList.add('dim');
  }
}
function record(meta, grade) {
  const s = S.stats[meta.c] || (S.stats[meta.c] = { n: 0, ok: 0, p: 0 });
  s.n++; if (grade === 'ok') s.ok++; if (grade === 'partial') s.p++;
  S.total++;
  S.missed = S.missed.filter((x) => x !== meta.id);
  if (grade !== 'ok') { S.missed.unshift(meta.id); S.missed = S.missed.slice(0, 80); }
  save();
}

/* ---------- Vistas ---------- */
let current = null;
function mount(...els) { if (current && current.destroy) current.destroy(); current = null; app.replaceChildren(...els); window.scrollTo(0, 0); }
let keyHandler = null;
const setKeys = (fn) => { keyHandler = fn; };
document.addEventListener('keydown', (e) => { if (keyHandler && !e.metaKey && !e.ctrlKey && !e.altKey && e.target.tagName !== 'SELECT') keyHandler(e); });

function seg(values, cur, onPick) {
  return h('div', { class: 'seg' }, values.map(([k, label]) => h('button', { class: k === cur ? 'on' : '', onclick: () => onPick(k) }, label)));
}
function home() {
  setKeys(null);
  const sel = selCats();
  const n = ECG_META.filter((m) => sel.has(m.c)).length;
  const tot = Object.values(S.stats).reduce((a, s) => a + s.n, 0), ok = Object.values(S.stats).reduce((a, s) => a + s.ok, 0);
  const rerender = () => { save(); home(); };
  mount(
    h('div', { class: 'hero' }, h('h2', {}, 'Electros reales, sin contexto y con el ruido de la calle.'),
      h('p', {}, ECG_META.length + ' ECG reales de 12 derivaciones etiquetados por especialistas, ' + MON_META.length + ' tiras de monitor de parada y periparada anotadas por expertos, ' + IMG_META.filter((m) => m.q !== false).length + ' ECG clásicos en imagen y artefacto extrahospitalario simulado. Míralo, mide con el compás y decide.')),
    h('div', { class: 'grid3' },
      h('button', { class: 'mode primary', onclick: () => practice(false) }, h('b', {}, 'Práctica'), h('span', { class: 'muted' }, 'Un ECG tras otro, con la explicación al responder. Insiste en lo que más fallas.')),
      h('button', { class: 'mode', onclick: monitorPractice }, h('b', {}, 'Monitor'), h('span', { class: 'muted' }, 'Parada y periparada en tira de monitor real: FV, TV, TSV, FA rápida, bloqueos y más. Ritmo y conducta según el ERC 2025.')),
      h('button', { class: 'mode', onclick: occPractice }, h('b', {}, 'Oclusión coronaria'), h('span', { class: 'muted' }, 'ECG reales con el balón ocluyendo DA, CD o Cx. ¿Hay oclusión? ¿Qué arteria?')),
      h('button', { class: 'mode', onclick: imgPractice }, h('b', {}, 'Imagen · casos clásicos'), h('span', { class: 'muted' }, 'ECG reales en papel: hiperpotasemia, Wellens, de Winter, pericarditis, TEP… Lo que no hay en señal.')),
      h('button', { class: 'mode', onclick: exam }, h('b', {}, 'Examen · 10 ECG'), h('span', { class: 'muted' }, 'Sin pistas ni corrección hasta el final. Nota y tiempo.')),
      h('button', { class: 'mode', onclick: atlas }, h('b', {}, 'Atlas'), h('span', { class: 'muted' }, 'Cada diagnóstico con sus criterios, trampas y todos sus ejemplos.'))),
    h('div', { class: 'sec-title' }, 'Ajustes'),
    h('div', { class: 'card set' },
      h('div', {}, h('b', {}, 'Escena'), h('div', { class: 'small muted' }, NOISE[S.settings.noise].d)),
      seg(Object.entries(NOISE).map(([k, v]) => [k, v.name]), S.settings.noise, (k) => { S.settings.noise = k; rerender(); }),
      h('div', {}, h('b', {}, 'Respuesta')),
      seg([['opts', '5 opciones'], ['list', 'Lista completa']], S.settings.answer, (k) => { S.settings.answer = k; rerender(); }),
      h('div', {}, h('b', {}, 'Temas'), h('div', { class: 'small muted' }, n + ' ECG seleccionados')),
      h('div', { class: 'row' }, Object.entries(GROUPS).map(([g, gn]) => h('button', { class: 'chip' + (S.settings.groups[g] ? ' on' : ''), onclick: () => { S.settings.groups[g] = !S.settings.groups[g]; if (!Object.values(S.settings.groups).some(Boolean)) S.settings.groups[g] = true; rerender(); } }, gn))),
      h('div', {}, h('b', {}, 'Contexto')),
      seg([['no', 'Sin contexto'], ['si', 'Mostrar edad y sexo']], S.settings.ctx ? 'si' : 'no', (k) => { S.settings.ctx = k === 'si'; rerender(); })),
    h('div', { class: 'sec-title' }, 'Tu progreso'),
    h('div', { class: 'card row', style: 'justify-content:space-between' },
      h('div', {}, tot ? h('span', {}, h('b', {}, tot + ' respuestas'), ' · ' + Math.round(100 * ok / tot) + ' % de acierto') : h('span', { class: 'muted' }, 'Aún no has respondido ninguno.')),
      h('div', { class: 'row' },
        h('button', { class: 'btn ghost', disabled: !S.missed.length, onclick: () => practice(true) }, 'Repasar fallos (' + S.missed.length + ')'),
        h('button', { class: 'btn ghost', onclick: stats }, 'Ver por diagnóstico'))));
}

function caseShell(titleBits) {
  return h('div', { class: 'casebar' }, h('button', { class: 'tool', onclick: home }, '‹ Inicio'), ...titleBits);
}

function practice(review) {
  const sel = selCats();
  let deck = [], pos = 0, streak = 0, count = 0;
  const refill = () => {
    if (review) {
      deck = shuffle(S.missed.map((id) => byId.get(id)).filter((i) => i != null), R);
      if (!deck.length) { home(); return false; }
    } else deck = buildDeck(ECG_META, sel, S.stats, R, 20);
    pos = 0; return true;
  };
  if (!refill()) return;
  const viewer = makeViewer({ ctx: S.settings.ctx, allowClean: false });
  const bar = h('span', { class: 'pill' });
  const ansBox = h('div'), fbBox = h('div');
  mount(caseShell([h('span', { class: 'title' }, review ? 'Repaso de fallos' : 'Práctica'), bar]), viewer.el, SYS, ansBox, fbBox);
  current = viewer;
  function next() {
    if (pos >= deck.length && !refill()) return;
    const idx = deck[pos++], meta = ECG_META[idx], seed = newSeed();
    count++;
    bar.textContent = 'ECG ' + count + (streak > 1 ? ' · racha ' + streak : '');
    viewer.allowClean(false);
    viewer.set(idx, seed, S.settings.noise);
    fbBox.replaceChildren();
    const opts = S.settings.answer === 'opts' ? options(meta, null, R, 5) : null;
    let done = false;
    const panel = answerPanel(meta, opts, (c, btns) => {
      if (done) return; done = true;
      const gr = grade(meta, c);
      record(meta, gr);
      streak = gr === 'ok' ? streak + 1 : 0;
      bar.textContent = 'ECG ' + count + (streak > 1 ? ' · racha ' + streak : '');
      markButtons(btns, meta, c, gr);
      viewer.allowClean(true);
      fbBox.replaceChildren(feedback(meta, gr, c, viewer.noise()), h('div', { class: 'next', style: 'margin-top:12px' }, h('button', { class: 'btn', onclick: next }, 'Siguiente ECG ›')));
      fbBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    ansBox.replaceChildren(panel.el);
    setKeys((e) => {
      if (!done && opts && /^[1-5]$/.test(e.key)) panel.btns[+e.key - 1].click();
      else if (done && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); next(); }
    });
    window.scrollTo({ top: 0 });
  }
  next();
}

function exam() {
  const sel = selCats();
  const deck = buildDeck(ECG_META, sel, {}, R, 10);
  if (!deck.length) return home();
  const Q = deck.map((idx) => ({ idx, seed: newSeed(), opts: S.settings.answer === 'opts' ? options(ECG_META[idx], null, R, 5) : null, ans: null, gr: null }));
  const t0 = Date.now();
  let i = 0;
  const viewer = makeViewer({ ctx: S.settings.ctx, allowClean: false });
  const bar = h('span', { class: 'pill' }), clock = h('span', { class: 'pill' });
  const ansBox = h('div');
  mount(caseShell([h('span', { class: 'title' }, 'Examen'), bar, clock]), viewer.el, SYS, ansBox);
  current = viewer;
  const tick = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); clock.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }, 500);
  const destroy = viewer.destroy;
  viewer.destroy = () => { clearInterval(tick); destroy(); };
  function show() {
    const q = Q[i], meta = ECG_META[q.idx];
    bar.textContent = (i + 1) + ' / ' + Q.length;
    viewer.set(q.idx, q.seed, S.settings.noise);
    q.P = null;
    const panel = answerPanel(meta, q.opts, (c) => {
      q.ans = c; q.gr = grade(meta, c); q.P = viewer.noise(); record(meta, q.gr);
      i++; if (i < Q.length) show(); else { clearInterval(tick); results(Q, Date.now() - t0); }
    });
    ansBox.replaceChildren(panel.el);
    setKeys((e) => { if (q.opts && /^[1-5]$/.test(e.key)) panel.btns[+e.key - 1].click(); });
    window.scrollTo({ top: 0 });
  }
  show();
}

function results(Q, ms) {
  setKeys(null);
  const sc = Q.reduce((a, q) => a + (q.gr === 'ok' ? 1 : q.gr === 'partial' ? 0.5 : 0), 0);
  const s = Math.round(ms / 1000);
  mount(caseShell([h('span', { class: 'title' }, 'Resultado del examen')]),
    h('div', { class: 'card row', style: 'gap:24px' },
      h('div', {}, h('div', { class: 'big' }, fmt(sc, sc % 1 ? 1 : 0) + ' / ' + Q.length), h('div', { class: 'muted small' }, 'Medio punto si eliges un hallazgo real que no es el principal')),
      h('div', {}, h('div', { class: 'big' }, Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')), h('div', { class: 'muted small' }, Math.round(s / Q.length) + ' s por ECG'))),
    h('div', { class: 'sec-title' }, 'Revisión: toca cada uno para ver el ECG y la explicación'),
    h('div', { class: 'card', style: 'padding:4px 12px' }, Q.map((q, k) => {
      const m = ECG_META[q.idx];
      return h('div', { class: 'res', onclick: () => review(Q, ms, k) }, h('span', { class: 'dot ' + q.gr }, q.gr === 'ok' ? '✓' : q.gr === 'partial' ? '½' : '✕'),
        h('div', {}, h('b', {}, (k + 1) + '. ' + CATS[m.c].name), q.gr !== 'ok' ? h('div', { class: 'small muted' }, 'Respondiste: ' + CATS[q.ans].name) : null), h('span', { class: 'small muted' }, 'Ver ›'));
    })),
    h('div', { class: 'next', style: 'margin-top:14px' }, h('button', { class: 'btn ghost', onclick: home }, 'Inicio'), h('button', { class: 'btn', onclick: exam }, 'Otro examen')));
}
function review(Q, ms, k) {
  const q = Q[k], meta = ECG_META[q.idx];
  const viewer = makeViewer({ ctx: true, allowClean: true });
  mount(h('div', { class: 'casebar' }, h('button', { class: 'tool', onclick: () => results(Q, ms) }, '‹ Resultado'), h('span', { class: 'title' }, 'ECG ' + (k + 1) + ' de ' + Q.length)), viewer.el);
  current = viewer;
  viewer.set(q.idx, q.seed, S.settings.noise);
  const ans = answerPanel(meta, q.opts, () => {});
  markButtons(ans.btns, meta, q.ans, q.gr);
  app.append(ans.el, feedback(meta, q.gr, q.ans, viewer.noise()),
    h('div', { class: 'next', style: 'margin-top:12px' }, k > 0 ? h('button', { class: 'btn ghost', onclick: () => review(Q, ms, k - 1) }, '‹ Anterior') : null, k < Q.length - 1 ? h('button', { class: 'btn', onclick: () => review(Q, ms, k + 1) }, 'Siguiente ›') : null));
  setKeys((e) => { if (e.key === 'ArrowRight' && k < Q.length - 1) review(Q, ms, k + 1); if (e.key === 'ArrowLeft' && k > 0) review(Q, ms, k - 1); });
}

function atlas() {
  setKeys(null);
  mount(caseShell([h('span', { class: 'title' }, 'Atlas')]),
    ...Object.entries(GROUPS).map(([g, gn]) => [h('div', { class: 'sec-title' }, gn), h('div', { class: 'atlas' }, Object.keys(CATS).filter((c) => CATS[c].g === g).map((c) => {
      const n = ECG_META.filter((m) => m.c === c).length, s = S.stats[c];
      return h('button', { onclick: () => atlasCat(c, 0) }, h('b', {}, CATS[c].name), h('small', {}, n + ' ejemplos' + (s && s.n ? ' · ' + Math.round(100 * s.ok / s.n) + ' % acierto' : '')));
    }))]).flat(),
    h('div', { class: 'sec-title' }, 'Imagen · casos clásicos'), h('div', { class: 'atlas' }, Object.keys(IMG_CATS).map((c) => {
      const n = IMG_META.filter((m) => m.c === c).length, s = S.stats['i_' + c];
      return n ? h('button', { onclick: () => atlasImg(c, 0) }, h('b', {}, IMG_CATS[c].name), h('small', {}, n + (n === 1 ? ' imagen' : ' imágenes') + (s && s.n ? ' · ' + Math.round(100 * s.ok / s.n) + ' % acierto' : ''))) : null;
    })),
    h('div', { class: 'sec-title' }, 'Oclusión coronaria (STAFF III)'), h('div', { class: 'atlas' }, ['da', 'cd', 'cx'].map((c) => h('button', { onclick: () => occWithLoad(() => occEvolution(OCC_META.find((p) => p.art === c).id, 60)) }, h('b', {}, OCC_CATS[c].name), h('small', {}, 'Basal, minuto 1 y final del inflado')))),
    h('div', { class: 'sec-title' }, 'Monitor'), h('div', { class: 'atlas' }, Object.keys(MON_CATS).map((c) => {
      const n = MON_META.filter((m) => m.c === c).length, s = S.stats['m_' + c];
      return h('button', { onclick: () => atlasMon(c, 0) }, h('b', {}, MON_CATS[c].name), h('small', {}, n + ' tiras' + (s && s.n ? ' · ' + Math.round(100 * s.ok / s.n) + ' % acierto' : '')));
    })));
}
let atlasNoise = 'limpio';
function atlasCat(c, k) {
  const list = ECG_META.map((m, i) => [m, i]).filter(([m]) => m.c === c);
  k = (k + list.length) % list.length;
  const [meta, idx] = list[k];
  const viewer = makeViewer({ ctx: true, allowClean: true });
  const seed = hashSeed(meta.id, atlasNoise);
  mount(h('div', { class: 'casebar' }, h('button', { class: 'tool', onclick: atlas }, '‹ Atlas'), h('span', { class: 'title' }, CATS[c].name),
    h('span', { class: 'pill' }, (k + 1) + ' / ' + list.length),
    h('button', { class: 'tool', onclick: () => atlasCat(c, k - 1) }, '‹'), h('button', { class: 'tool', onclick: () => atlasCat(c, k + 1) }, '›'),
    seg(Object.entries(NOISE).filter(([x]) => x !== 'aleatorio').map(([x, v]) => [x, v.name]), atlasNoise, (x) => { atlasNoise = x; atlasCat(c, k); })), viewer.el);
  current = viewer;
  viewer.set(idx, seed, atlasNoise);
  app.append(feedback(meta, 'info', null, atlasNoise === 'limpio' ? null : viewer.noise()));
  setKeys((e) => { if (e.key === 'ArrowRight') atlasCat(c, k + 1); if (e.key === 'ArrowLeft') atlasCat(c, k - 1); });
}

function stats() {
  setKeys(null);
  let armed = false;
  const reset = h('button', { class: 'btn ghost', onclick: () => {
    if (!armed) { armed = true; reset.textContent = '¿Seguro? Pulsa otra vez'; return; }
    S.stats = {}; S.missed = []; S.total = 0; save(); stats();
  } }, 'Borrar progreso');
  mount(caseShell([h('span', { class: 'title' }, 'Progreso por diagnóstico')]),
    h('div', { class: 'card' }, Object.entries(GROUPS).map(([g, gn]) => [h('div', { class: 'sec-title', style: 'margin-top:8px' }, gn),
      Object.keys(CATS).filter((c) => CATS[c].g === g).map((c) => {
        const s = S.stats[c] || { n: 0, ok: 0 }, p = s.n ? s.ok / s.n : 0;
        return h('div', { class: 'stat' }, h('span', {}, CATS[c].name), h('div', { class: 'bar' }, h('i', { style: 'width:' + Math.round(100 * p) + '%;background:' + (p >= 0.8 ? 'var(--ok)' : p >= 0.5 ? 'var(--warn)' : 'var(--bad)') })), h('span', { class: 'small muted', style: 'text-align:right' }, s.n ? Math.round(100 * p) + ' % · ' + s.n : '—'));
      })]).flat(),
      h('div', { class: 'sec-title', style: 'margin-top:8px' }, 'Oclusión coronaria'),
      Object.keys(OCC_CATS).map((c) => {
        const s = S.stats['o_' + c] || { n: 0, ok: 0 }, p = s.n ? s.ok / s.n : 0;
        return h('div', { class: 'stat' }, h('span', {}, OCC_CATS[c].name), h('div', { class: 'bar' }, h('i', { style: 'width:' + Math.round(100 * p) + '%;background:' + (p >= 0.8 ? 'var(--ok)' : p >= 0.5 ? 'var(--warn)' : 'var(--bad)') })), h('span', { class: 'small muted', style: 'text-align:right' }, s.n ? Math.round(100 * p) + ' % · ' + s.n : '—'));
      }),
      h('div', { class: 'sec-title', style: 'margin-top:8px' }, 'Imagen'),
      Object.keys(IMG_CATS).filter((c) => IMG_META.some((m) => m.c === c)).map((c) => {
        const s = S.stats['i_' + c] || { n: 0, ok: 0 }, p = s.n ? s.ok / s.n : 0;
        return h('div', { class: 'stat' }, h('span', {}, IMG_CATS[c].name), h('div', { class: 'bar' }, h('i', { style: 'width:' + Math.round(100 * p) + '%;background:' + (p >= 0.8 ? 'var(--ok)' : p >= 0.5 ? 'var(--warn)' : 'var(--bad)') })), h('span', { class: 'small muted', style: 'text-align:right' }, s.n ? Math.round(100 * p) + ' % · ' + s.n : '—'));
      }),
      h('div', { class: 'sec-title', style: 'margin-top:8px' }, 'Monitor'),
      Object.keys(MON_CATS).map((c) => {
        const s = S.stats['m_' + c] || { n: 0, ok: 0 }, p = s.n ? s.ok / s.n : 0;
        return h('div', { class: 'stat' }, h('span', {}, MON_CATS[c].name), h('div', { class: 'bar' }, h('i', { style: 'width:' + Math.round(100 * p) + '%;background:' + (p >= 0.8 ? 'var(--ok)' : p >= 0.5 ? 'var(--warn)' : 'var(--bad)') })), h('span', { class: 'small muted', style: 'text-align:right' }, s.n ? Math.round(100 * p) + ' % · ' + s.n : '—'));
      })),
    h('div', { class: 'next', style: 'margin-top:14px' }, reset, h('button', { class: 'btn ghost', disabled: !S.missed.length, onclick: () => practice(true) }, 'Repasar fallos (' + S.missed.length + ')'), h('button', { class: 'btn', onclick: () => practice(false) }, 'Practicar')));
}


/* ---------- Modo monitor (fase 1) ---------- */
let MON_BYTES = null;
const MCACHE = new Map();
const monSig = (i) => { if (!MCACHE.has(i)) MCACHE.set(i, decodeRecord(MON_BYTES, MON_META[i].o, ECG_N, 1)[0]); return MCACHE.get(i); };
const MSRC = { vfdb: 'MIT-BIH Malignant Ventricular Ectopy', cudb: 'CU Ventricular Tachyarrhythmia', mitdb: 'MIT-BIH Arrhythmia', cn: 'Chapman-Shaoxing/Ningbo', sph: 'SPH (Shandong)', ptbxl: 'PTB-XL' };
const mmss = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
function describeMonNoise(P) {
  if (!P || P.level === 'limpio') return 'Tira limpia.';
  const o = [];
  if (P.cpr) o.push('compresiones torácicas durante los primeros ' + fmt(P.cpr, 1) + ' s: no se analiza hasta la pausa');
  if (P.vib) o.push('vibración del vehículo');
  if (P.pops) o.push('movimiento de parches o cables (saltos de la línea de base)');
  if (P.emg) o.push('tensión muscular');
  if (P.wander >= 0.1) o.push('línea de base inestable');
  return o.length ? o.join('; ') + '.' : 'Artefacto leve.';
}
function makeMonitor(opt = {}) {
  const st = { idx: -1, x: null, clean: null, showClean: false, gain: 1, pos: 0, frozen: false, raf: 0, t0: 0, cal: false, c: null, lay: null };
  const cv = h('canvas'), ov = h('canvas', { class: 'ov' });
  const wrap = h('div', { class: 'monwrap' }, cv, ov);
  const gains = [0.5, 1, 2, 4];
  const gBtns = gains.map((g) => h('button', { class: 'tool', onclick: () => { st.gain = g; draw(); } }, '×' + fmt(g, g % 1 ? 1 : 0)));
  const bFreeze = h('button', { class: 'tool', onclick: () => { if (st.frozen) replay(); else freeze(); } }, 'Congelar');
  const bCal = h('button', { class: 'tool', onclick: () => { if (!st.frozen) freeze(); st.cal = !st.cal; if (!st.cal) st.c = null; sync(); drawOv(); } }, 'Compás');
  const bClean = h('button', { class: 'tool hidden', onclick: () => { st.showClean = !st.showClean; draw(); } }, 'Ver sin artefacto');
  const tb = h('div', { class: 'tools' }, h('span', { class: 'small muted' }, 'Ganancia'), ...gBtns, bFreeze, bCal, bClean);
  const hint = h('div', { class: 'hint hidden' }, 'Compás: arrastra sobre la tira para medir intervalo y amplitud (la amplitud se corrige según la ganancia).');
  const el = h('div', {}, tb, wrap, hint);
  function sync() {
    gBtns.forEach((b, i) => b.classList.toggle('on', gains[i] === st.gain));
    bFreeze.textContent = st.frozen ? 'Repetir barrido' : 'Congelar';
    bCal.classList.toggle('on', st.cal); bClean.classList.toggle('on', st.showClean);
    ov.style.pointerEvents = st.cal ? 'auto' : 'none'; ov.style.touchAction = st.cal ? 'none' : 'auto';
    hint.classList.toggle('hidden', !st.cal);
  }
  function layout() {
    const W0 = wrap.clientWidth || Math.min(window.innerWidth - 24, 1150);
    const rows = W0 < 640 ? 2 : 1, secs = 10 / rows, Wmm = 8 + secs * 25 + 4, RH = 46;
    const s = W0 / Wmm, H = 8 + rows * RH;
    return { rows, secs, Wmm, RH, s, Hmm: H };
  }
  function draw() {
    if (st.idx < 0) return;
    sync();
    const L = st.lay = layout(), s = L.s;
    const W = Math.round(L.Wmm * s), H = Math.round(L.Hmm * s);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    for (const c of [cv, ov]) { c.style.width = W + 'px'; c.style.height = H + 'px'; c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    st.dpr = dpr;
    const g = cv.getContext('2d');
    g.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
    const px = 1 / (s * dpr);
    g.fillStyle = '#04110a'; g.fillRect(0, 0, L.Wmm, L.Hmm);
    g.beginPath(); g.lineWidth = px; g.strokeStyle = '#0f2e1d';
    for (let x = 8; x <= L.Wmm - 4 + 0.01; x += 5) { g.moveTo(x, 8); g.lineTo(x, L.Hmm); }
    for (let r = 0; r < L.rows; r++) for (let y = 8 + r * L.RH + 3; y <= 8 + (r + 1) * L.RH - 3; y += 5) { g.moveTo(8, y); g.lineTo(L.Wmm - 4, y); }
    g.stroke();
    g.fillStyle = '#7dd9a0'; g.font = 'bold 3.2px -apple-system,Segoe UI,Roboto,Arial,sans-serif'; g.textBaseline = 'middle';
    const m = MON_META[st.idx];
    g.fillText((m.lead === 'MLII' ? 'II' : 'ECG') + '   ×' + fmt(st.gain, st.gain % 1 ? 1 : 0) + '   25 mm/s   Filtro monitor 0,5–40 Hz' + (st.showClean ? '   SIN ARTEFACTO' : ''), 2, 4);
    const sig = applyFilters([st.showClean ? st.clean : st.x], { mode: 'mon', notch: false }, ECG_FS)[0];
    const upto = st.frozen ? ECG_N : Math.min(ECG_N, Math.floor(st.pos));
    const perRow = ECG_N / L.rows, k = 10 * st.gain;
    g.strokeStyle = '#3cf08a'; g.lineWidth = Math.max(px * 1.6, 0.28); g.lineJoin = 'round';
    for (let r = 0; r < L.rows; r++) {
      const top = 8 + r * L.RH, y0 = top + L.RH * 0.55;
      g.save(); g.beginPath(); g.rect(0, top, L.Wmm, L.RH); g.clip();
      g.beginPath();
      const i0 = r * perRow, i1 = Math.min(upto, (r + 1) * perRow);
      for (let i = i0; i < i1; i++) { const x = 8 + (i - i0) * 0.1, y = y0 - sig[i] * k; i === i0 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.stroke(); g.restore();
      // calibración 1 mV
      g.beginPath(); g.lineWidth = Math.max(px, 0.18); g.strokeStyle = '#2a8a55';
      g.moveTo(2, y0); g.lineTo(3, y0); g.lineTo(3, y0 - k); g.lineTo(6, y0 - k); g.lineTo(6, y0); g.lineTo(7, y0); g.stroke();
      g.strokeStyle = '#3cf08a'; g.lineWidth = Math.max(px * 1.6, 0.28);
    }
    if (!st.frozen) { // barra de borrado del barrido
      const r = Math.min(L.rows - 1, Math.floor(upto / perRow)), x = 8 + (upto - r * perRow) * 0.1;
      g.fillStyle = '#04110a'; g.fillRect(x, 8 + r * L.RH, 3, L.RH);
    }
    drawOv();
  }
  function drawOv() {
    const g = ov.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, ov.width, ov.height);
    if (!st.cal || !st.c || !st.lay) return;
    const s = st.lay.s, dpr = st.dpr, px = 1 / (s * dpr);
    g.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
    const { x1, y1, x2, y2 } = st.c;
    g.strokeStyle = '#ffd34d'; g.fillStyle = '#ffd34d'; g.lineWidth = Math.max(px * 1.6, 0.25);
    g.beginPath(); g.moveTo(x1, y1 - 6); g.lineTo(x1, y1 + 6); g.moveTo(x2, y2 - 6); g.lineTo(x2, y2 + 6); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    const ms = Math.abs(x2 - x1) / 25 * 1000, mv = (y1 - y2) / (10 * st.gain);
    const t = Math.round(ms) + ' ms' + (ms > 150 ? ' · ' + Math.round(60000 / ms) + ' lpm' : '') + ' · ' + (mv >= 0 ? '+' : '') + fmt(mv, 2) + ' mV';
    g.font = 'bold 3px -apple-system,Segoe UI,Roboto,Arial,sans-serif';
    const tw = g.measureText(t).width + 3;
    let lx = Math.max(1, Math.min(st.lay.Wmm - tw - 1, (x1 + x2) / 2 - tw / 2)), ly = Math.min(y1, y2) - 11; if (ly < 1) ly = Math.max(y1, y2) + 4;
    g.fillStyle = 'rgba(4,17,10,.9)'; g.fillRect(lx, ly, tw, 5); g.fillStyle = '#ffd34d'; g.textBaseline = 'middle'; g.fillText(t, lx + 1.5, ly + 2.6);
  }
  let drag = null;
  const mm = (e) => { const b = ov.getBoundingClientRect(); return { x: (e.clientX - b.left) / st.lay.s, y: (e.clientY - b.top) / st.lay.s }; };
  ov.addEventListener('pointerdown', (e) => {
    if (!st.cal) return; const p = mm(e); ov.setPointerCapture(e.pointerId);
    if (st.c && Math.abs(p.x - st.c.x1) < 2.5) drag = 1; else if (st.c && Math.abs(p.x - st.c.x2) < 2.5) drag = 2; else { st.c = { x1: p.x, y1: p.y, x2: p.x, y2: p.y }; drag = 2; }
    e.preventDefault();
  });
  ov.addEventListener('pointermove', (e) => { if (!drag) return; const p = mm(e); if (drag === 1) { st.c.x1 = p.x; st.c.y1 = p.y; } else { st.c.x2 = p.x; st.c.y2 = p.y; } drawOv(); });
  const end = () => { drag = null; }; ov.addEventListener('pointerup', end); ov.addEventListener('pointercancel', end);
  function loop(ts) {
    if (!st.t0) st.t0 = ts;
    st.pos = (ts - st.t0) / 1000 * ECG_FS;
    if (st.pos >= ECG_N) { freeze(); return; }
    draw(); st.raf = requestAnimationFrame(loop);
  }
  function freeze() { cancelAnimationFrame(st.raf); st.frozen = true; draw(); }
  function replay() { cancelAnimationFrame(st.raf); st.frozen = false; st.cal = false; st.c = null; st.t0 = 0; st.pos = 0; st.raf = requestAnimationFrame(loop); }
  const ro = new ResizeObserver(() => { if (Math.abs((wrap.clientWidth || 0) - (st.lastW || 0)) > 8) { st.lastW = wrap.clientWidth; draw(); } });
  ro.observe(wrap);
  return {
    el,
    set(idx, seed, level, ctx, sweep = true) {
      st.idx = idx; st.showClean = false; st.cal = false; st.c = null; st.gain = 1;
      st.clean = monSig(idx);
      const m = monitorStrip(st.clean, level, ctx, seed); st.x = m.x; st.P = m.P;
      bClean.classList.toggle('hidden', !opt.allowClean || m.P.level === 'limpio');
      if (sweep) replay(); else { st.frozen = true; requestAnimationFrame(draw); }
    },
    allowClean(v) { opt.allowClean = v; bClean.classList.toggle('hidden', !v || !st.P || st.P.level === 'limpio'); },
    noise() { return st.P; },
    destroy() { cancelAnimationFrame(st.raf); ro.disconnect(); },
  };
}
const ctxText = (m, ctx) => m.c === 'riva' ? CONTEXTO_RIVA : CONTEXTOS[ctx];
function monFeedback(m, ctx, res, rAns, kAns, P) {
  const C = MON_CATS[m.c], okK = conductaOk(m, ctx);
  const V = res ? (res.g === 'ok' ? 'Correcto: ritmo y conducta' : res.rOk ? 'Ritmo correcto, conducta no' : res.kOk ? 'Conducta correcta, ritmo no' : 'Ni ritmo ni conducta') : 'Monitor';
  return h('div', { class: 'fb' },
    h('div', { class: 'verdict ' + (res ? res.g : 'info') }, V),
    h('div', { class: 'body' },
      h('div', {}, h('h3', {}, C.name), m.acc.length ? h('div', { class: 'small muted' }, 'La base de datos no distingue FV de flutter ventricular en este registro: valen las dos.') : null,
        rAns && !res.rOk ? h('div', { class: 'small muted' }, 'Tu ritmo: ' + MON_CATS[rAns].name) : null),
      h('div', {}, h('h4', {}, 'Situación y conducta'), h('div', { class: 'small' }, ctxText(m, ctx)),
        h('div', { style: 'margin-top:6px' }, h('b', {}, 'Conducta: '), CONDUCTAS[okK]), kAns && kAns !== okK ? h('div', { class: 'small muted' }, 'Tu conducta: ' + CONDUCTAS[kAns]) : null,
        m.qrs && ctx === 'inestable' ? h('div', { class: 'small', style: 'margin-top:4px' }, m.qrs === 'ancho' ? 'QRS ancho: bloqueo probablemente por debajo del His. La atropina es ineficaz y puede empeorarlo (ERC 2025).' : 'QRS estrecho: primero atropina; si no responde, perfusión de isoprenalina o adrenalina y marcapasos.') : null),
      h('div', {}, h('h4', {}, 'En esta tira'),
        h('div', { class: 'facts' }, h('span', {}, 'Amplitud ' + fmt(m.p2p, 1) + ' mV (' + Math.round(m.p2p * 10) + ' mm a ×1)'), h('span', {}, MSRC[m.db] + ' · registro ' + m.rec + ' · ' + (['cn', 'sph', 'ptbxl'].includes(m.db) ? 'derivación II' : mmss(m.t0)))),
        P ? h('div', { class: 'small muted', style: 'margin-top:4px' }, h('b', {}, 'Artefacto: '), describeMonNoise(P)) : null),
      h('div', {}, h('h4', {}, 'Claves'), h('ul', {}, C.claves.map((x) => h('li', {}, x)))),
      h('div', { class: 'callout' }, h('h4', {}, 'Trampa'), C.trampa),
      h('div', { class: 'callout teal' }, h('h4', {}, 'En SVA'), C.sva),
      h('div', { class: 'src' }, ({ cn: 'Derivación II de un ECG de Chapman-Shaoxing/Ningbo (PhysioNet), etiqueta de la fuente revisada visualmente', sph: 'Derivación II de un ECG de SPH (figshare), informe revisado por cardiólogos', ptbxl: 'Derivación II de un ECG de PTB-XL (PhysioNet), informe del cardiólogo' }[m.db] || 'Episodio anotado por expertos en ' + MSRC[m.db] + ' (PhysioNet)') + ' · artefacto simulado')));
}
function monAnswer(onDone, submitLabel) {
  let r = null, k = null;
  const rB = Object.keys(MON_CATS).map((c) => h('button', { class: 'opt', 'data-c': c, onclick: () => { r = c; rB.forEach((b) => b.classList.toggle('sel', b === rB[Object.keys(MON_CATS).indexOf(c)])); go.disabled = !(r && k); } }, MON_CATS[c].name));
  const kB = Object.keys(CONDUCTAS).map((c) => h('button', { class: 'opt', 'data-c': c, onclick: () => { k = c; kB.forEach((b) => b.classList.toggle('sel', b.dataset.c === c)); go.disabled = !(r && k); } }, CONDUCTAS[c]));
  const go = h('button', { class: 'btn', disabled: true, onclick: () => { go.disabled = true; onDone(r, k, rB, kB); } }, submitLabel);
  return { el: h('div', { class: 'answers' }, h('div', { class: 'sec-title', style: 'margin-top:4px' }, 'Ritmo'), h('div', { class: 'opts mopts' }, rB),
    h('div', { class: 'sec-title' }, 'Conducta'), h('div', { class: 'opts' }, kB), h('div', { class: 'next', style: 'margin-top:12px' }, go)), rB, kB };
}
function markMon(rB, kB, m, ctx, rAns, kAns) {
  const okK = conductaOk(m, ctx);
  rB.forEach((b) => { const c = b.dataset.c; b.disabled = true; b.classList.remove('sel'); b.classList.add(c === m.c || m.acc.includes(c) ? 'ok' : c === rAns ? 'bad' : 'dim'); });
  kB.forEach((b) => { const c = b.dataset.c; b.disabled = true; b.classList.remove('sel'); b.classList.add(c === okK ? 'ok' : c === kAns ? 'bad' : 'dim'); });
}
function monRecord(m, res) {
  const key = 'm_' + m.c, s = S.stats[key] || (S.stats[key] = { n: 0, ok: 0, p: 0 });
  s.n++; if (res.g === 'ok') s.ok++; if (res.g === 'partial') s.p++; S.total++; save();
}
const monStats = () => Object.fromEntries(Object.keys(MON_CATS).map((c) => [c, S.stats['m_' + c]]));
const pickCtx = (m) => m.ctx[Math.floor(R() * m.ctx.length)];
function ctxCard(m, ctx) { return h('div', { class: 'ctx' }, h('b', {}, 'Situación: '), ctxText(m, ctx)); }

function monitorPractice() {
  const sel = new Set(Object.keys(MON_CATS));
  let deck = [], pos = 0, count = 0, streak = 0;
  const mon = makeMonitor({ allowClean: false });
  const bar = h('span', { class: 'pill' }), ctxBox = h('div'), ansBox = h('div'), fbBox = h('div');
  mount(caseShell([h('span', { class: 'title' }, 'Monitor'), bar, h('button', { class: 'tool', onclick: monitorExam }, 'Examen de 10')]), ctxBox, mon.el, ansBox, fbBox);
  current = mon;
  function next() {
    if (pos >= deck.length) { deck = buildDeck(MON_META, sel, monStats(), R, 20); pos = 0; }
    const idx = deck[pos++], m = MON_META[idx], ctx = pickCtx(m);
    count++; bar.textContent = 'Tira ' + count + (streak > 1 ? ' · racha ' + streak : '');
    ctxBox.replaceChildren(ctxCard(m, ctx));
    mon.allowClean(false); mon.set(idx, newSeed(), S.settings.noise, ctx);
    fbBox.replaceChildren();
    const a = monAnswer((rAns, kAns, rB, kB) => {
      const res = gradeMon(m, rAns, kAns, ctx);
      monRecord(m, res); streak = res.g === 'ok' ? streak + 1 : 0;
      bar.textContent = 'Tira ' + count + (streak > 1 ? ' · racha ' + streak : '');
      markMon(rB, kB, m, ctx, rAns, kAns); mon.allowClean(true);
      fbBox.replaceChildren(monFeedback(m, ctx, res, rAns, kAns, mon.noise()), h('div', { class: 'next', style: 'margin-top:12px' }, h('button', { class: 'btn', onclick: next }, 'Siguiente tira ›')));
      fbBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setKeys((e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } });
    }, 'Comprobar');
    ansBox.replaceChildren(a.el); setKeys(null);
    window.scrollTo({ top: 0 });
  }
  next();
}
function monitorExam() {
  const deck = buildDeck(MON_META, new Set(Object.keys(MON_CATS)), {}, R, 10);
  const Q = deck.map((idx) => ({ idx, seed: newSeed(), ctx: pickCtx(MON_META[idx]), r: null, k: null, res: null }));
  const t0 = Date.now(); let i = 0;
  const mon = makeMonitor({ allowClean: false });
  const bar = h('span', { class: 'pill' }), clock = h('span', { class: 'pill' }), ctxBox = h('div'), ansBox = h('div');
  mount(caseShell([h('span', { class: 'title' }, 'Examen de monitor'), bar, clock]), ctxBox, mon.el, ansBox);
  current = mon;
  const tick = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); clock.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }, 500);
  const d = mon.destroy; mon.destroy = () => { clearInterval(tick); d(); };
  function show() {
    const q = Q[i], m = MON_META[q.idx];
    bar.textContent = (i + 1) + ' / ' + Q.length;
    ctxBox.replaceChildren(ctxCard(m, q.ctx));
    mon.set(q.idx, q.seed, S.settings.noise, q.ctx);
    const a = monAnswer((rAns, kAns) => {
      q.r = rAns; q.k = kAns; q.res = gradeMon(m, rAns, kAns, q.ctx); q.P = mon.noise(); monRecord(m, q.res);
      i++; if (i < Q.length) show(); else { clearInterval(tick); monResults(Q, Date.now() - t0); }
    }, i < Q.length - 1 ? 'Siguiente ›' : 'Terminar');
    ansBox.replaceChildren(a.el); window.scrollTo({ top: 0 });
  }
  show();
}
function monResults(Q, ms) {
  setKeys(null);
  const sc = Q.reduce((a, q) => a + (q.res.g === 'ok' ? 1 : q.res.g === 'partial' ? 0.5 : 0), 0), s = Math.round(ms / 1000);
  mount(caseShell([h('span', { class: 'title' }, 'Resultado · monitor')]),
    h('div', { class: 'card row', style: 'gap:24px' },
      h('div', {}, h('div', { class: 'big' }, fmt(sc, sc % 1 ? 1 : 0) + ' / ' + Q.length), h('div', { class: 'muted small' }, 'Medio punto si aciertas solo el ritmo o solo la conducta')),
      h('div', {}, h('div', { class: 'big' }, Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')), h('div', { class: 'muted small' }, Math.round(s / Q.length) + ' s por tira'))),
    h('div', { class: 'sec-title' }, 'Revisión'),
    h('div', { class: 'card', style: 'padding:4px 12px' }, Q.map((q, k) => {
      const m = MON_META[q.idx];
      return h('div', { class: 'res', onclick: () => monReview(Q, ms, k) }, h('span', { class: 'dot ' + q.res.g }, q.res.g === 'ok' ? '✓' : q.res.g === 'partial' ? '½' : '✕'),
        h('div', {}, h('b', {}, (k + 1) + '. ' + MON_CATS[m.c].name), h('div', { class: 'small muted' }, CONDUCTAS[CONDUCTA_OK[m.c][q.ctx]])), h('span', { class: 'small muted' }, 'Ver ›'));
    })),
    h('div', { class: 'next', style: 'margin-top:14px' }, h('button', { class: 'btn ghost', onclick: home }, 'Inicio'), h('button', { class: 'btn', onclick: monitorExam }, 'Otro examen')));
}
function monReview(Q, ms, k) {
  const q = Q[k], m = MON_META[q.idx];
  const mon = makeMonitor({ allowClean: true });
  mount(h('div', { class: 'casebar' }, h('button', { class: 'tool', onclick: () => monResults(Q, ms) }, '‹ Resultado'), h('span', { class: 'title' }, 'Tira ' + (k + 1) + ' de ' + Q.length)), ctxCard(m, q.ctx), mon.el);
  current = mon;
  mon.set(q.idx, q.seed, S.settings.noise, q.ctx, false);
  const a = monAnswer(() => {}, '');
  markMon(a.rB, a.kB, m, q.ctx, q.r, q.k);
  a.el.querySelector('.next').remove();
  app.append(a.el, monFeedback(m, q.ctx, q.res, q.r, q.k, mon.noise()),
    h('div', { class: 'next', style: 'margin-top:12px' }, k > 0 ? h('button', { class: 'btn ghost', onclick: () => monReview(Q, ms, k - 1) }, '‹ Anterior') : null, k < Q.length - 1 ? h('button', { class: 'btn', onclick: () => monReview(Q, ms, k + 1) }, 'Siguiente ›') : null));
}
function atlasMon(c, k) {
  const list = MON_META.map((m, i) => [m, i]).filter(([m]) => m.c === c);
  k = (k + list.length) % list.length;
  const [m, idx] = list[k], ctx = m.ctx[0];
  const mon = makeMonitor({ allowClean: true });
  mount(h('div', { class: 'casebar' }, h('button', { class: 'tool', onclick: atlas }, '‹ Atlas'), h('span', { class: 'title' }, MON_CATS[c].name),
    h('span', { class: 'pill' }, (k + 1) + ' / ' + list.length), h('button', { class: 'tool', onclick: () => atlasMon(c, k - 1) }, '‹'), h('button', { class: 'tool', onclick: () => atlasMon(c, k + 1) }, '›'),
    seg(Object.entries(NOISE).filter(([x]) => x !== 'aleatorio').map(([x, v]) => [x, v.name]), atlasNoise, (x) => { atlasNoise = x; atlasMon(c, k); })), mon.el);
  current = mon;
  mon.set(idx, hashSeed(m.id, atlasNoise, 'mon'), atlasNoise, ctx, false);
  app.append(monFeedback(m, ctx, null, null, null, atlasNoise === 'limpio' ? null : mon.noise()));
  setKeys((e) => { if (e.key === 'ArrowRight') atlasMon(c, k + 1); if (e.key === 'ArrowLeft') atlasMon(c, k - 1); });
}


/* ---------- Oclusión coronaria real (fase 3, STAFF III) ---------- */
let OCC_BYTES = null, occLoading = null;
function loadOcc() {
  if (OCC_BYTES) return Promise.resolve();
  if (!occLoading) occLoading = new Promise((ok, ko) => {
    const s = document.createElement('script'); s.src = 'occ_data.js';
    s.onload = async () => {
      try {
        const b = Uint8Array.from(atob(OCC_BLOB), (c) => c.charCodeAt(0));
        OCC_BYTES = new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
        ok();
      } catch (e) { ko(e); }
    };
    s.onerror = () => { occLoading = null; ko(new Error('no se pudo descargar el banco de oclusiones')); };
    document.head.appendChild(s);
  });
  return occLoading;
}
const OCC_CACHE = new Map();
function occRec(p, w) {
  const key = p.id + ':' + w.t;
  if (!OCC_CACHE.has(key)) OCC_CACHE.set(key, decodeRecord(OCC_BYTES, w.o, ECG_N));
  return OCC_CACHE.get(key);
}
const occExt = (p, w) => { const r = occRec(p, w); return { rec: [r[0], r[1], r.slice(2)], meta: { sex: p.sex, age: p.age } }; };
const tLabel = (t) => t < 0 ? 'Basal' : t === 60 ? 'Minuto 1' : 'Final (' + mmss(t) + ')';
function occWithLoad(fn) {
  mount(caseShell([h('span', { class: 'title' }, 'Oclusión coronaria')]), h('div', { class: 'card' }, 'Cargando los ECG de STAFF III (unos 3,7 MB, solo la primera vez)…'));
  loadOcc().then(fn).catch((e) => mount(caseShell([]), h('div', { class: 'card' }, 'No se pudo cargar: ' + e.message)));
}
function dstGrid(p, w) {
  const b = p.wins[0].st;
  return h('div', { class: 'dst' }, LEADS.map((l, i) => {
    const v = (w.st[i] - b[i]) * 10;
    return h('span', { class: v >= 1 ? 'up' : v <= -1 ? 'down' : '' }, h('b', {}, l), (v > 0 ? '+' : '') + fmt(v, 1));
  }));
}
function occInfo(p, w) {
  const C = OCC_CATS[p.art];
  return h('div', { class: 'body' },
    h('div', {}, h('h4', {}, 'Qué está pasando'), h('div', {}, w.t < 0 ? 'ECG basal en hemodinámica, antes de inflar el balón.' : 'Balón inflado en la ' + p.loc + ': ' + (w.t === 60 ? 'primer minuto' : 'final del inflado, a los ' + mmss(w.t)) + ' de oclusión completa.'),
      h('div', { class: 'small muted', style: 'margin-top:4px' }, (p.sex === 'M' ? 'Varón' : 'Mujer') + (p.age ? ', ' + p.age + ' años' : '') + (p.prior ? ' · ' + p.prior : '') + ' · inflado total ' + mmss(p.dur))),
    w.t >= 0 ? h('div', {}, h('h4', {}, 'Cambio del ST frente al basal (mm, medida automática orientativa)'), dstGrid(p, w)) : null,
    h('div', {}, h('h4', {}, C.name), h('ul', {}, C.claves.map((x) => h('li', {}, x)))),
    h('div', { class: 'callout' }, h('h4', {}, 'Trampa'), C.trampa),
    h('div', { class: 'callout teal' }, h('h4', {}, 'En SVA'), C.sva),
    h('div', { class: 'src' }, 'STAFF III (PhysioNet) · paciente ' + p.id + ' · arteria y tiempo de oclusión conocidos · artefacto simulado'));
}
function occPick() {
  const arts = ['da', 'cd', 'cx'], a = arts[Math.floor(R() * 3)];
  const ps = OCC_META.filter((p) => p.art === a), p = ps[Math.floor(R() * ps.length)];
  const x = R(), w = x < 0.25 ? p.wins[0] : (x < 0.45 && p.wins.length > 2 ? p.wins[1] : p.wins[p.wins.length - 1]);
  return { p, w, truth: w.t < 0 ? 'basal' : p.art };
}
function occPractice() {
  occWithLoad(() => {
    const viewer = makeViewer({ ctx: true, allowClean: false });
    const bar = h('span', { class: 'pill' }), ctxBox = h('div'), ansBox = h('div'), fbBox = h('div');
    mount(caseShell([h('span', { class: 'title' }, 'Oclusión coronaria'), bar]), ctxBox, viewer.el, ansBox, fbBox);
    current = viewer;
    let count = 0;
    function next() {
      const q = occPick(); count++; bar.textContent = 'ECG ' + count;
      ctxBox.replaceChildren(h('div', { class: 'ctx' }, h('b', {}, 'Situación: '), 'angioplastia programada en hemodinámica, ' + (q.p.sex === 'M' ? 'varón' : 'mujer') + (q.p.age ? ' de ' + q.p.age + ' años' : '') + (q.p.prior ? ', ' + q.p.prior : '') + '. ¿Hay ahora una oclusión coronaria? ¿De qué arteria?'));
      viewer.allowClean(false); viewer.set(occExt(q.p, q.w), newSeed(), S.settings.noise);
      fbBox.replaceChildren();
      const btns = Object.keys(OCC_CATS).map((c) => h('button', { class: 'opt', 'data-c': c, onclick: () => answer(c) }, OCC_CATS[c].opt));
      let done = false;
      function answer(c) {
        if (done) return; done = true;
        const g = c === q.truth ? 'ok' : (q.truth !== 'basal' && c !== 'basal') ? 'partial' : 'bad';
        const s = S.stats['o_' + q.truth] || (S.stats['o_' + q.truth] = { n: 0, ok: 0, p: 0 }); s.n++; if (g === 'ok') s.ok++; if (g === 'partial') s.p++; S.total++; save();
        btns.forEach((b) => { const k = b.dataset.c; b.disabled = true; b.classList.add(k === q.truth ? 'ok' : k === c ? (g === 'partial' ? 'partial' : 'bad') : 'dim'); });
        viewer.allowClean(true);
        let showBase = false;
        const bBase = h('button', { class: 'btn ghost', onclick: () => { showBase = !showBase; viewer.set(occExt(q.p, showBase ? q.p.wins[0] : q.w), newSeed(), 'limpio'); bBase.textContent = showBase ? 'Volver al ECG de la pregunta' : 'Comparar con el basal'; } }, 'Comparar con el basal');
        const V = { ok: 'Correcto', partial: 'Hay oclusión, pero no de esa arteria', bad: q.truth === 'basal' ? 'No: es el ECG basal, sin oclusión' : 'No: hay una oclusión en curso' };
        fbBox.replaceChildren(h('div', { class: 'fb' }, h('div', { class: 'verdict ' + g }, V[g]), h('div', { class: 'body', style: 'padding-bottom:0' }, h('h3', {}, OCC_CATS[q.truth].name)), occInfo(q.p, q.w)),
          h('div', { class: 'next', style: 'margin-top:12px' }, q.w.t >= 0 ? bBase : null, h('button', { class: 'btn ghost', onclick: () => occEvolution(q.p.id, q.w.t, occPractice) }, 'Ver la evolución'), h('button', { class: 'btn', onclick: next }, 'Siguiente ›')));
        fbBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      ansBox.replaceChildren(h('div', { class: 'answers' }, h('div', { class: 'sec-title', style: 'margin-top:4px' }, '¿Oclusión ahora?'), h('div', { class: 'opts mopts' }, btns)));
      setKeys((e) => { if (!done && /^[1-4]$/.test(e.key)) btns[+e.key - 1].click(); else if (done && e.key === 'Enter') next(); });
      window.scrollTo({ top: 0 });
    }
    next();
  });
}
function occEvolution(id, t, back) {
  occWithLoad(() => {
    const p = OCC_META.find((x) => x.id === id), same = OCC_META.filter((x) => x.art === p.art), k = same.indexOf(p);
    const w = p.wins.find((x) => x.t === t) || p.wins[p.wins.length - 1];
    const viewer = makeViewer({ ctx: true, allowClean: true });
    mount(h('div', { class: 'casebar' }, h('button', { class: 'tool', onclick: back || atlas }, '‹ Volver'), h('span', { class: 'title' }, OCC_CATS[p.art].name),
      h('span', { class: 'pill' }, (k + 1) + ' / ' + same.length),
      h('button', { class: 'tool', onclick: () => occEvolution(same[(k - 1 + same.length) % same.length].id, t, back) }, '‹'),
      h('button', { class: 'tool', onclick: () => occEvolution(same[(k + 1) % same.length].id, t, back) }, '›')),
      h('div', { class: 'row', style: 'margin-bottom:8px' }, h('span', { class: 'small muted' }, 'Momento:'), seg(p.wins.map((x) => [x.t, tLabel(x.t)]), w.t, (x) => occEvolution(id, x, back))),
      viewer.el, h('div', { class: 'fb', style: 'margin-top:12px' }, occInfo(p, w)));
    current = viewer;
    viewer.set(occExt(p, w), hashSeed(p.id, w.t), 'limpio');
    setKeys((e) => { const i = p.wins.indexOf(w); if (e.key === 'ArrowRight' && i < p.wins.length - 1) occEvolution(id, p.wins[i + 1].t, back); if (e.key === 'ArrowLeft' && i > 0) occEvolution(id, p.wins[i - 1].t, back); });
  });
}


/* ---------- Modo imagen (fase 5): ECG reales en imagen, Wikimedia Commons ---------- */
const IMG_Q = IMG_META.filter((m) => m.q !== false);
const imgName = (c) => (IMG_CATS[c] || CATS[c]).name;
function makeImgViewer() {
  const img = h('img', { alt: 'ECG de 12 derivaciones', draggable: 'false' });
  const msg = h('div', { class: 'msg' }, 'Cargando la imagen…');
  const wrap = h('div', { class: 'imgwrap' }, msg, img);
  let z = 1;
  const zoomBtns = [];
  const setZoom = (nz, fx = 0.5, fy = 0.5) => {
    const ox = (wrap.scrollLeft + fx * wrap.clientWidth) / Math.max(1, img.clientWidth), oy = (wrap.scrollTop + fy * wrap.clientHeight) / Math.max(1, img.clientHeight);
    z = Math.max(1, Math.min(4, nz)); img.style.width = (100 * z) + '%'; wrap.classList.toggle('z', z > 1);
    wrap.scrollLeft = ox * img.clientWidth - fx * wrap.clientWidth; wrap.scrollTop = oy * img.clientHeight - fy * wrap.clientHeight;
    zoomBtns[1].textContent = '×' + fmt(z, z % 1 ? 1 : 0);
  };
  img.addEventListener('click', (e) => { const r = wrap.getBoundingClientRect(); setZoom(z > 1 ? 1 : 2.5, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); });
  img.addEventListener('load', () => { msg.classList.add('hidden'); img.classList.remove('hidden'); });
  img.addEventListener('error', () => { msg.textContent = 'No se pudo cargar la imagen.'; msg.classList.remove('hidden'); img.classList.add('hidden'); });
  zoomBtns.push(h('button', { class: 'tool', onclick: () => setZoom(z / 1.5) }, '−'), h('button', { class: 'tool', onclick: () => setZoom(1) }, '×1'), h('button', { class: 'tool', onclick: () => setZoom(z * 1.5) }, '+'));
  const bar = h('div', { class: 'tools' }, h('span', { class: 'small muted' }, 'Zoom'), ...zoomBtns, h('span', { class: 'small muted' }, 'Toca la imagen para ampliar ese punto'));
  return {
    el: h('div', {}, bar, wrap),
    set(file) { msg.textContent = 'Cargando la imagen…'; msg.classList.remove('hidden'); img.classList.add('hidden'); img.src = 'img/' + file; setZoom(1); },
  };
}
function imgSource(m) {
  return h('div', { class: 'src' }, 'Imagen: ', h('a', { href: m.page, target: '_blank', rel: 'noopener' }, m.title), ' · ', m.autor, ' · ',
    h('a', { href: m.licurl, target: '_blank', rel: 'noopener' }, m.lic), ' · vía Wikimedia Commons · redimensionada' + (m.origen ? ' · ' + m.origen : ''));
}
function imgFeedback(m, grade, ans, viewer) {
  const C = IMG_CATS[m.c];
  const V = { ok: 'Correcto', partial: 'Casi: eso también está, pero no es lo principal', bad: 'No es eso', info: 'Imagen' };
  const pair = m.par ? IMG_META.find((x) => x.id === m.par) : null;
  let showPair = false;
  const srcBox = h('div', {}, imgSource(m)), pairNote = h('div', { class: 'small hidden', style: 'margin-top:6px' }, pair ? pair.nota : '');
  const bPair = pair ? h('button', { class: 'btn ghost', onclick: () => {
    showPair = !showPair; viewer.set(showPair ? pair.file : m.file);
    bPair.textContent = showPair ? 'Volver a la imagen principal' : pair.parLabel; pairNote.classList.toggle('hidden', !showPair); srcBox.replaceChildren(imgSource(showPair ? pair : m));
  } }, pair.parLabel) : null;
  return h('div', { class: 'fb' },
    h('div', { class: 'verdict ' + grade }, V[grade]),
    h('div', { class: 'body' },
      h('div', {}, h('h3', {}, C.name), ans && ans !== m.c ? h('div', { class: 'small muted' }, 'Tu respuesta: ' + imgName(ans)) : null),
      h('div', {}, h('h4', {}, 'En esta imagen'), h('div', {}, m.nota),
        m.ctx ? h('div', { class: 'small', style: 'margin-top:6px' }, h('b', {}, 'Contexto de la fuente: '), m.ctx) : null,
        m.sec && m.sec.length ? h('div', { class: 'small', style: 'margin-top:4px' }, h('b', {}, 'También presente: '), m.sec.map(imgName).join(', ')) : null,
        bPair ? h('div', { style: 'margin-top:8px' }, bPair, pairNote) : null),
      h('div', {}, h('h4', {}, 'Claves'), h('ul', {}, C.claves.map((x) => h('li', {}, x)))),
      h('div', { class: 'callout' }, h('h4', {}, 'Trampa'), C.trampa),
      h('div', { class: 'callout teal' }, h('h4', {}, 'En SVA'), C.sva),
      srcBox));
}
function imgPractice() {
  setKeys(null);
  const viewer = makeImgViewer();
  const bar = h('span', { class: 'pill' }), ctxBox = h('div'), ansBox = h('div'), fbBox = h('div');
  mount(caseShell([h('span', { class: 'title' }, 'Imagen · casos clásicos'), bar]), ctxBox, viewer.el, ansBox, fbBox);
  // primero lo que más se falla: baraja ponderada por acierto previo de cada diagnóstico
  const w = (m) => { const s = S.stats['i_' + m.c]; return s && s.n ? 1.5 - s.ok / s.n : 1.6; };
  const deck = IMG_Q.map((m) => [m, -Math.log(R()) / w(m)]).sort((a, b) => a[1] - b[1]).map(([m]) => m);
  let k = -1;
  function next() {
    k = (k + 1) % deck.length;
    const m = deck[k];
    bar.textContent = (k + 1) + ' / ' + deck.length;
    ctxBox.replaceChildren((S.settings.ctx || m.ctxFijo) && m.ctx ? h('div', { class: 'ctx' }, h('b', {}, 'Contexto: '), m.ctx) : '');
    viewer.set(m.file); fbBox.replaceChildren();
    new Image().src = 'img/' + deck[(k + 1) % deck.length].file; // precarga la siguiente: en el artefacto cada imagen tarda unos segundos
    const opts = imgOptions(m, IMG_CATS, R);
    const btns = opts.map((c, i) => h('button', { class: 'opt', 'data-c': c, onclick: () => answer(c) }, (i + 1) + '. ' + imgName(c)));
    let done = false;
    function answer(c) {
      if (done) return; done = true;
      const g = gradeImg(m, c);
      const st = S.stats['i_' + m.c] || (S.stats['i_' + m.c] = { n: 0, ok: 0, p: 0 }); st.n++; if (g === 'ok') st.ok++; if (g === 'partial') st.p++; S.total++; save();
      btns.forEach((b) => { const x = b.dataset.c; b.disabled = true; b.classList.add(x === m.c ? 'ok' : x === c ? (g === 'partial' ? 'partial' : 'bad') : 'dim'); });
      fbBox.replaceChildren(imgFeedback(m, g, c, viewer), h('div', { class: 'next', style: 'margin-top:12px' }, h('button', { class: 'btn', onclick: next }, 'Siguiente ›')));
      fbBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    ansBox.replaceChildren(h('div', { class: 'answers' }, h('div', { class: 'sec-title', style: 'margin-top:4px' }, '¿Qué ves?'), h('div', { class: 'opts' }, btns)));
    setKeys((e) => { if (!done && /^[1-5]$/.test(e.key) && btns[+e.key - 1]) btns[+e.key - 1].click(); else if (done && e.key === 'Enter') next(); });
    window.scrollTo({ top: 0 });
  }
  next();
}
function atlasImg(c, k) {
  const list = IMG_META.filter((m) => m.c === c);
  k = (k + list.length) % list.length;
  const m = list[k], viewer = makeImgViewer();
  mount(h('div', { class: 'casebar' }, h('button', { class: 'tool', onclick: atlas }, '‹ Atlas'), h('span', { class: 'title' }, IMG_CATS[c].name),
    h('span', { class: 'pill' }, (k + 1) + ' / ' + list.length),
    h('button', { class: 'tool', onclick: () => atlasImg(c, k - 1) }, '‹'), h('button', { class: 'tool', onclick: () => atlasImg(c, k + 1) }, '›')), viewer.el);
  viewer.set(m.file);
  app.append(imgFeedback(m, 'info', null, viewer));
  setKeys((e) => { if (e.key === 'ArrowRight') atlasImg(c, k + 1); if (e.key === 'ArrowLeft') atlasImg(c, k - 1); });
}

document.getElementById('home-link').addEventListener('click', home);
document.getElementById('btn-stats').addEventListener('click', stats);

(async () => {
  try {
    if (typeof DecompressionStream === 'undefined') throw new Error('Este navegador es antiguo: actualízalo para abrir el entrenador.');
    await loadBank();
    document.getElementById('loading').remove();
    home();
  } catch (err) {
    document.getElementById('loading').textContent = 'No se pudo cargar: ' + err.message;
  }
})();
})();
