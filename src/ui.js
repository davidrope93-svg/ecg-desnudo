/* Interfaz: papel milimetrado, compás, práctica, examen, atlas y progreso. */
(() => {
'use strict';
const KEY = 'ecgdesnudo.v1';
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
const rec8 = (i) => { if (!CACHE.has(i)) CACHE.set(i, decodeRecord(BYTES, ECG_META[i].o, ECG_N)); return CACHE.get(i); };
async function loadBank() {
  const bin = Uint8Array.from(atob(ECG_BLOB), (c) => c.charCodeAt(0));
  const ds = new DecompressionStream('gzip');
  const buf = await new Response(new Blob([bin]).stream().pipeThrough(ds)).arrayBuffer();
  BYTES = new Uint8Array(buf);
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
    const r = rec8(st.idx);
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
    if (opt.ctx && st.meta) { const t = (st.meta.sex === 'M' ? 'Varón' : 'Mujer') + (st.meta.age != null ? ' · ' + st.meta.age + ' años' : ''); g.textAlign = 'right'; g.fillText(t, G.W - 2, 3.6); g.textAlign = 'left'; }
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
      st.idx = idx; st.meta = ECG_META[idx]; st.seed = seed; st.level = level; st.clean = false; st.c = null;
      const r = rec8(idx);
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
  if (meta.hr != null) facts.push('FC ' + meta.hr + ' lpm');
  if (meta.pr != null && !['fa', 'flutter'].includes(meta.c)) facts.push('PR ' + meta.pr + ' ms');
  if (meta.qrs != null) facts.push('QRS ' + meta.qrs + ' ms');
  if (meta.qtc != null) facts.push('QTc ' + meta.qtc + ' ms');
  if (meta.ax != null) facts.push('Eje ' + meta.ax + '°');
  const st = [];
  if (meta.ste.length) st.push('Elevación del ST: ' + meta.ste.join(', '));
  if (meta.std.length) st.push('Descenso del ST: ' + meta.std.join(', '));
  if (meta.avr >= 0.1) st.push('Elevación del ST en aVR: ' + fmt(meta.avr * 10, 1) + ' mm');
  const codes = meta.k.filter((k) => CODES[k] && !(k === 'NORM' && meta.c !== 'normal')).map((k) => CODES[k] + (meta.stg && /MI$/.test(k) ? ' (' + STAGES[meta.stg] + ')' : ''));
  const sec = meta.sec.map((c) => CATS[c].name);
  return h('div', { class: 'fb' },
    h('div', { class: 'verdict ' + grade }, V[grade]),
    h('div', { class: 'body' },
      h('div', {}, h('h3', {}, C.name), ans && ans !== meta.c ? h('div', { class: 'small muted' }, 'Tu respuesta: ' + CATS[ans].name) : null),
      h('div', {}, h('h4', {}, 'En este ECG'),
        h('div', { class: 'facts' }, facts.map((f) => h('span', {}, f))),
        st.length ? h('div', { class: 'small', style: 'margin-top:6px' }, st.join(' · ')) : null,
        codes.length ? h('div', { class: 'small', style: 'margin-top:6px' }, h('b', {}, 'Informe del cardiólogo: '), codes.join(', ')) : null,
        sec.length ? h('div', { class: 'small', style: 'margin-top:4px' }, h('b', {}, 'También presente: '), sec.join(', ')) : null,
        P ? h('div', { class: 'small muted', style: 'margin-top:4px' }, h('b', {}, 'Artefacto: '), describeNoise(P)) : null),
      h('div', {}, h('h4', {}, 'Claves'), h('ul', {}, C.claves.map((x) => h('li', {}, x)))),
      h('div', { class: 'callout' }, h('h4', {}, 'Trampa'), C.trampa),
      h('div', { class: 'callout teal' }, h('h4', {}, 'En SVA'), C.sva),
      h('div', { class: 'src' }, 'PTB-XL n.º ' + meta.id + ' · ' + (meta.sex === 'M' ? 'varón' : 'mujer') + (meta.age != null ? ', ' + meta.age + ' años' : '') + ' · medidas automáticas GE 12SL (orientativas) · artefacto simulado')));
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
      h('p', {}, ECG_META.length + ' ECG de 12 derivaciones validados por cardiólogos, ' + Object.keys(CATS).length + ' diagnósticos y artefacto extrahospitalario simulado electrodo a electrodo. Míralo, mide con el compás y decide.')),
    h('div', { class: 'grid3' },
      h('button', { class: 'mode primary', onclick: () => practice(false) }, h('b', {}, 'Práctica'), h('span', { class: 'muted' }, 'Un ECG tras otro, con la explicación al responder. Insiste en lo que más fallas.')),
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
      seg([['no', 'Electro desnudo'], ['si', 'Mostrar edad y sexo']], S.settings.ctx ? 'si' : 'no', (k) => { S.settings.ctx = k === 'si'; rerender(); })),
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
    }))]).flat());
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
      })]).flat()),
    h('div', { class: 'next', style: 'margin-top:14px' }, reset, h('button', { class: 'btn ghost', disabled: !S.missed.length, onclick: () => practice(true) }, 'Repasar fallos (' + S.missed.length + ')'), h('button', { class: 'btn', onclick: () => practice(false) }, 'Practicar')));
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
