/* Motor sin DOM: decodificación del banco, derivaciones, artefacto extrahospitalario, filtros y lógica de preguntas.
   Lo usan la interfaz y las pruebas (node tests/run.js). */
const LEADS = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];

/* ---------- Banco ---------- */
function decodeRecord(bytes, off, n, nl = 8) {
  // 8 derivaciones independientes (I, II, V1–V6): delta + zigzag + varint, unidades de ECG_Q mV
  const out = [];
  let p = off;
  for (let k = 0; k < nl; k++) {
    const a = new Float32Array(n);
    let acc = 0;
    for (let i = 0; i < n; i++) {
      let z = 0, s = 0, b;
      do { b = bytes[p++]; z |= (b & 0x7f) << s; s += 7; } while (b & 0x80);
      z >>>= 0;
      const v = (z >>> 1) ^ -(z & 1);
      acc += v;
      a[i] = acc * ECG_Q;
    }
    out.push(a);
  }
  return out;
}

function twelveFrom(I, II, V) {
  // Einthoven y Goldberger: III, aVR, aVL y aVF se derivan de I y II (igual que en el registro original)
  const n = I.length, III = new Float32Array(n), aVR = new Float32Array(n), aVL = new Float32Array(n), aVF = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    III[i] = II[i] - I[i];
    aVR[i] = -(I[i] + II[i]) / 2;
    aVL[i] = I[i] - II[i] / 2;
    aVF[i] = II[i] - I[i] / 2;
  }
  return [I, II, III, aVR, aVL, aVF, ...V];
}

/* ---------- Azar reproducible ---------- */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashSeed(...xs) {
  let h = 2166136261;
  for (const x of xs) for (const c of String(x)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function gauss(r) { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const uni = (r, a, b) => a + (b - a) * r();

/* ---------- Filtros (causales, como en el monitor) ---------- */
function biquad(x, b0, b1, b2, a1, a2) {
  const y = new Float32Array(x.length);
  let x1 = x[0], x2 = x[0], y1 = 0, y2 = 0;
  // arranque en régimen permanente para no crear un escalón al inicio
  const g = (b0 + b1 + b2) / (1 + a1 + a2);
  if (isFinite(g)) { y1 = y2 = g * x[0]; }
  for (let i = 0; i < x.length; i++) {
    const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
function lowpass(x, fc, fs) { // Butterworth 2.º orden (RBJ)
  const w = 2 * Math.PI * fc / fs, c = Math.cos(w), al = Math.sin(w) / (2 * Math.SQRT1_2), a0 = 1 + al;
  return biquad(x, (1 - c) / 2 / a0, (1 - c) / a0, (1 - c) / 2 / a0, -2 * c / a0, (1 - al) / a0);
}
function notch(x, f0, fs, q) {
  const w = 2 * Math.PI * f0 / fs, c = Math.cos(w), al = Math.sin(w) / (2 * q), a0 = 1 + al;
  return biquad(x, 1 / a0, -2 * c / a0, 1 / a0, -2 * c / a0, (1 - al) / a0);
}
function highpass1(x, fc, fs) { // paso alto de 1 polo: a 0,5 Hz deforma el ST (modo monitor)
  const rc = 1 / (2 * Math.PI * fc), dt = 1 / fs, a = rc / (rc + dt);
  const y = new Float32Array(x.length);
  let px = x[0], py = 0;
  for (let i = 0; i < x.length; i++) { const v = a * (py + x[i] - px); y[i] = v; py = v; px = x[i]; }
  return y;
}
const FILTERS = {
  diag: { short: 'Diagnóstico', name: 'Diagnóstico 0,05–150 Hz', hp: 0.05, lp: 0 },
  mon: { short: 'Monitor', name: 'Monitor 0,5–40 Hz', hp: 0.5, lp: 40 },
  emg: { short: 'Muscular', name: 'Muscular 0,05–40 Hz', hp: 0.05, lp: 40 },
};
function applyFilters(sig, f, fs) {
  const F = FILTERS[f.mode] || FILTERS.diag;
  return sig.map((x) => {
    let y = x;
    if (F.hp >= 0.5) y = highpass1(y, F.hp, fs);
    if (F.lp) y = lowpass(y, F.lp, fs);
    if (f.notch) y = notch(y, 50, fs, 8);
    return y;
  });
}

/* ---------- Artefacto extrahospitalario ----------
   Se genera en cada electrodo (RA, LA, LL, V1–V6) y se proyecta a las derivaciones:
   un temblor del brazo izquierdo aparece en I, III y aVL pero respeta II, como en la realidad. */
const NOISE = {
  limpio: { name: 'Limpio', d: 'Registro de calidad hospitalaria' },
  leve: { name: 'Domicilio', d: 'Paciente tranquilo, algo de respiración y tensión muscular' },
  ambulancia: { name: 'Ambulancia', d: 'En marcha: baches, vibración, línea de base que baila' },
  hostil: { name: 'Hostil', d: 'Paciente agitado o tiritando, electrodos que se despegan' },
  aleatorio: { name: 'Aleatorio', d: 'Cualquiera de los anteriores' },
};
const ELEC = ['RA', 'LA', 'LL', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];

function smoothNoise(r, n, fs, fc) { // ruido blanco filtrado paso bajo (1 polo, ida y vuelta) normalizado
  let y = new Float32Array(n);
  for (let i = 0; i < n; i++) y[i] = gauss(r);
  const a = Math.exp(-2 * Math.PI * fc / fs);
  for (let pass = 0; pass < 2; pass++) {
    let s = 0;
    const idx = pass ? [...Array(n).keys()].reverse() : [...Array(n).keys()];
    for (const i of idx) { s = a * s + (1 - a) * y[i]; y[i] = s; }
  }
  let m = 0; for (let i = 0; i < n; i++) m += y[i] * y[i];
  m = Math.sqrt(m / n) || 1;
  for (let i = 0; i < n; i++) y[i] /= m;
  return y;
}
function envelope(r, n, fs, duty, minLen) { // ráfagas suaves 0–1
  const e = new Float32Array(n);
  let i = 0;
  while (i < n) {
    const len = Math.floor(fs * uni(r, minLen, minLen * 3));
    const on = r() < duty;
    for (let k = 0; k < len && i < n; k++, i++) e[i] = on ? 1 : 0;
  }
  const a = Math.exp(-2 * Math.PI * 2 / fs);
  let s = e[0];
  for (let k = 0; k < n; k++) { s = a * s + (1 - a) * e[k]; e[k] = s; }
  return e;
}

function noiseProfile(level, r) {
  if (level === 'aleatorio') {
    const x = r();
    level = x < 0.15 ? 'limpio' : x < 0.4 ? 'leve' : x < 0.75 ? 'ambulancia' : 'hostil';
  }
  const P = { level, resp: 0, wander: 0, emg: 0, emgDuty: 0, tremor: 0, tremorLimbs: [], mains: 0, pops: 0, vib: 0, leadOff: null };
  if (level === 'leve') Object.assign(P, { resp: uni(r, 0.04, 0.12), wander: uni(r, 0.03, 0.1), emg: uni(r, 0.006, 0.015), emgDuty: 0.4, mains: r() < 0.3 ? uni(r, 0.01, 0.03) : 0 });
  if (level === 'ambulancia') Object.assign(P, { resp: uni(r, 0.08, 0.2), wander: uni(r, 0.12, 0.3), emg: uni(r, 0.012, 0.035), emgDuty: 0.5, mains: r() < 0.35 ? uni(r, 0.015, 0.05) : 0, pops: Math.floor(uni(r, 1, 3.99)), vib: uni(r, 0.03, 0.08) });
  if (level === 'hostil') {
    Object.assign(P, { resp: uni(r, 0.1, 0.25), wander: uni(r, 0.2, 0.45), emg: uni(r, 0.03, 0.07), emgDuty: 0.65, mains: r() < 0.4 ? uni(r, 0.03, 0.08) : 0, pops: Math.floor(uni(r, 2, 5.99)), vib: uni(r, 0.04, 0.1) });
    if (r() < 0.55) { // tiritona o temblor de 4–7 Hz en uno o dos miembros: pseudoflutter
      P.tremor = uni(r, 0.05, 0.14);
      const limbs = ['RA', 'LA', 'LL'];
      P.tremorLimbs = [limbs.splice(Math.floor(r() * 3), 1)[0]];
      if (r() < 0.4) P.tremorLimbs.push(limbs[Math.floor(r() * 2)]);
    }
    if (r() < 0.25) P.leadOff = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'][Math.floor(r() * 6)];
  }
  return P;
}

function makeArtifact(P, n, fs, r) {
  const t = (i) => i / fs;
  const fr = uni(r, 0.2, 0.4), phr = r() * 6.28; // respiración 12–24 /min
  const vibEnv = P.vib ? envelope(r, n, fs, 0.35, 0.4) : null;
  const vib = P.vib ? smoothNoise(r, n, fs, 18) : null; // vibración del vehículo, común
  const mainsPh = r() * 6.28;
  const tremF = uni(r, 4, 7);
  const e = {};
  for (const name of ELEC) {
    const limb = name === 'RA' || name === 'LA' || name === 'LL';
    const x = new Float32Array(n);
    // respiración: más en electrodos torácicos y pierna
    const gr = P.resp * (limb ? (name === 'LL' ? 0.8 : 0.35) : uni(r, 0.6, 1.2));
    const wd = smoothNoise(r, n, fs, 0.35), gw = P.wander * uni(r, 0.4, 1.1);
    for (let i = 0; i < n; i++) x[i] += gr * Math.sin(2 * Math.PI * fr * t(i) + phr + (limb ? 0 : 0.6)) + gw * wd[i];
    // EMG: ruido de alta frecuencia en ráfagas, mayor en miembros
    if (P.emg) {
      const env = envelope(r, n, fs, P.emgDuty, 0.3);
      const g = P.emg * (limb ? uni(r, 0.8, 1.6) : uni(r, 0.3, 0.8));
      let prev = 0;
      for (let i = 0; i < n; i++) { const w = gauss(r); x[i] += g * env[i] * (w - 0.5 * prev); prev = w; }
    }
    if (P.tremor && P.tremorLimbs.includes(name)) {
      const env = envelope(r, n, fs, 0.8, 0.8), jit = smoothNoise(r, n, fs, 0.5);
      let ph = r() * 6.28;
      for (let i = 0; i < n; i++) { ph += 2 * Math.PI * tremF * (1 + 0.04 * jit[i]) / fs; x[i] += P.tremor * env[i] * (Math.sin(ph) + 0.25 * Math.sin(2 * ph)); }
    }
    if (P.mains) { const g = P.mains * uni(r, 0.2, 1.4); for (let i = 0; i < n; i++) x[i] += g * Math.sin(2 * Math.PI * 50 * t(i) + mainsPh); }
    if (vib) { const g = P.vib * uni(r, 0.5, 1.5); for (let i = 0; i < n; i++) x[i] += g * vibEnv[i] * vib[i]; }
    e[name] = x;
  }
  // electrodos que se mueven o despegan: escalón con descenso exponencial
  for (let k = 0; k < P.pops; k++) {
    const name = ELEC[Math.floor(r() * ELEC.length)], i0 = Math.floor(r() * (n - 50)), amp = uni(r, 0.3, 1.4) * (r() < 0.5 ? -1 : 1), tau = uni(r, 0.15, 0.7) * fs;
    for (let i = i0; i < n; i++) e[name][i] += amp * Math.exp(-(i - i0) / tau);
  }
  return e;
}

function noisyLeads(rec8, level, seed, Pover) {
  // rec8: [I, II, V1..V6] limpios. Devuelve 12 derivaciones con artefacto y el perfil usado.
  const n = rec8[0].length, fs = ECG_FS, r = rng(seed);
  const P = Pover || noiseProfile(level, r);
  if (P.level === 'limpio') return { leads: twelveFrom(rec8[0], rec8[1], rec8.slice(2)), P };
  const e = makeArtifact(P, n, fs, r);
  const I = new Float32Array(n), II = new Float32Array(n), V = [];
  for (let i = 0; i < n; i++) { I[i] = rec8[0][i] + e.LA[i] - e.RA[i]; II[i] = rec8[1][i] + e.LL[i] - e.RA[i]; }
  for (let k = 0; k < 6; k++) {
    const name = 'V' + (k + 1), v = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const wct = (e.RA[i] + e.LA[i] + e.LL[i]) / 3;
      v[i] = name === P.leadOff ? 0.004 * gauss(r) : rec8[2 + k][i] + e[name][i] - wct;
    }
    V.push(v);
  }
  return { leads: twelveFrom(I, II, V), P };
}

/* ---------- Preguntas ---------- */
function shuffle(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function options(meta, cats, r, k) {
  // correcta + confusiones típicas de esa categoría + una al azar; nunca un hallazgo secundario real del ECG
  const C = CATS[meta.c], banned = new Set([meta.c, ...meta.sec]);
  const pool = C.conf.filter((x) => !banned.has(x) && CATS[x]);
  const picked = shuffle(pool.slice(), r).slice(0, k - 2);
  const rest = shuffle(Object.keys(CATS).filter((x) => !banned.has(x) && !picked.includes(x)), r);
  while (picked.length < k - 1 && rest.length) picked.push(rest.shift());
  return shuffle([meta.c, ...picked], r);
}

function grade(meta, ans) {
  if (ans === meta.c) return 'ok';
  if (meta.sec.includes(ans)) return 'partial';
  return 'bad';
}

function buildDeck(metaList, sel, stats, r, n) {
  // reparto equilibrado por categoría; las categorías con peor acierto salen más
  const byCat = {};
  metaList.forEach((m, i) => { if (sel.has(m.c)) (byCat[m.c] = byCat[m.c] || []).push(i); });
  const cats = Object.keys(byCat);
  if (!cats.length) return [];
  const w = (c) => { const s = stats[c]; if (!s || !s.n) return 1.4; return 0.6 + 1.6 * (1 - s.ok / s.n); };
  const deck = [], used = new Set();
  let guard = 0;
  while (deck.length < n && guard++ < n * 50) {
    const tot = cats.reduce((a, c) => a + w(c), 0);
    let x = r() * tot, c = cats[0];
    for (const cc of cats) { x -= w(cc); if (x <= 0) { c = cc; break; } }
    if (deck.length && metaList[deck[deck.length - 1]].c === c && cats.length > 1) continue;
    const free = byCat[c].filter((i) => !used.has(i));
    const i = (free.length ? free : byCat[c])[Math.floor(r() * (free.length || byCat[c].length))];
    deck.push(i); used.add(i);
  }
  return deck;
}

/* ---------- Monitor: artefacto de compresiones y de traslado sobre una sola derivación ---------- */
function monitorStrip(sig, level, ctx, seed) {
  const n = sig.length, fs = ECG_FS, r = rng(seed);
  if (level === 'aleatorio') { const x = r(); level = x < 0.15 ? 'limpio' : x < 0.4 ? 'leve' : x < 0.75 ? 'ambulancia' : 'hostil'; }
  const P = { level, cpr: 0, wander: 0, vib: 0, pops: 0, emg: 0 };
  const x = Float32Array.from(sig);
  if (level === 'limpio') return { x, P };
  if (level === 'leve') Object.assign(P, { wander: uni(r, 0.03, 0.08) });
  if (level === 'ambulancia') Object.assign(P, { wander: uni(r, 0.08, 0.2), vib: uni(r, 0.03, 0.06), pops: r() < 0.5 ? 1 : 0 });
  if (level === 'hostil') Object.assign(P, { wander: uni(r, 0.15, 0.35), vib: uni(r, 0.05, 0.1), pops: 1 + Math.floor(r() * 3), emg: ctx === 'parada' ? 0 : uni(r, 0.02, 0.05) });
  if (ctx === 'parada') {
    // compresiones a 100–120/min hasta la pausa de análisis; al parar queda un desplazamiento que se recupera
    P.cpr = level === 'hostil' ? uni(r, 3, 5.5) : uni(r, 2, 4);
    const f = uni(r, 100, 120) / 60, A = uni(r, 0.6, 1.8), stop = Math.floor(P.cpr * fs);
    let ph = r(), amp = A, off = 0;
    for (let i = 0; i < stop; i++) {
      const prev = ph; ph += f / fs;
      if (ph >= 1) { ph -= 1; amp = A * uni(r, 0.8, 1.2); }
      const g = ph < 0.45 ? Math.pow(Math.sin(Math.PI * ph / 0.45), 2) : -0.3 * Math.pow(Math.sin(Math.PI * (ph - 0.45) / 0.55), 2);
      x[i] += amp * g; off = amp * g;
      if (prev > ph) off = 0;
    }
    const tau = 0.4 * fs, step = uni(r, -0.4, 0.4);
    for (let i = stop; i < n; i++) x[i] += (off + step) * Math.exp(-(i - stop) / tau);
  }
  const fr = uni(r, 0.15, 0.35), ph0 = r() * 6.28, wd = smoothNoise(r, n, fs, 0.3);
  for (let i = 0; i < n; i++) x[i] += P.wander * (0.6 * Math.sin(2 * Math.PI * fr * i / fs + ph0) + wd[i]);
  if (P.vib) { const env = envelope(r, n, fs, 0.35, 0.4), v = smoothNoise(r, n, fs, 15); for (let i = 0; i < n; i++) x[i] += P.vib * env[i] * v[i]; }
  if (P.emg) { const env = envelope(r, n, fs, 0.6, 0.3); let prev = 0; for (let i = 0; i < n; i++) { const w = gauss(r); x[i] += P.emg * env[i] * (w - 0.5 * prev); prev = w; } }
  for (let k = 0; k < P.pops; k++) {
    const i0 = Math.floor(uni(r, P.cpr * fs, n - 50)), amp = uni(r, 0.3, 1.2) * (r() < 0.5 ? -1 : 1), tau = uni(r, 0.15, 0.6) * fs;
    for (let i = i0; i < n; i++) x[i] += amp * Math.exp(-(i - i0) / tau);
  }
  return { x, P };
}
function gradeMon(meta, rAns, kAns, ctx) {
  const rOk = rAns === meta.c || meta.acc.includes(rAns), kOk = kAns === CONDUCTA_OK[meta.c][ctx];
  return { rOk, kOk, g: rOk && kOk ? 'ok' : rOk || kOk ? 'partial' : 'bad' };
}

if (typeof module !== 'undefined') module.exports = { monitorStrip, gradeMon, LEADS, decodeRecord, twelveFrom, rng, hashSeed, lowpass, notch, highpass1, applyFilters, FILTERS, NOISE, noiseProfile, noisyLeads, makeArtifact, ELEC, options, grade, buildDeck, shuffle };
