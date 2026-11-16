/* ---------- Cuenta (0.9.2 beta): el progreso en la nube con la cuenta de beta tester (núcleo común en src/cuenta.js) ----------
   Los aciertos son contadores: cada dispositivo sube su parte (devices[id]) y el total de la cuenta es la suma, así nada se cuenta dos
   veces aunque se responda a la vez en el móvil y en el ordenador. «Fallos para repasar»: lo más reciente. Reportes: se unen
   («Vaciar la lista» deja una marca). «Borrar progreso» o «Cargar una copia» con la cuenta iniciada valen para todos los dispositivos. */
const ACC_DEV = (() => { try { let d = localStorage.getItem('ecgdesnudo.dev'); if (!d) { d = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); localStorage.setItem('ecgdesnudo.dev', d); } return d; } catch (e) { return 'dev'; } })();
const ACC_SYNC = 'ecgdesnudo.sync', ACC_RESET = 'ecgdesnudo.reset';
// acct, accDirty, accView y accMissedJ se declaran en ui.js, junto a S (save() los usa)
const accLS = { get: (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }, set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* nada */ } } };
const accMember = () => !!(acct && acct.core.state() === 'member');
/* lo llama save(): marca la hora de los cambios de «fallos» y avisa a la cuenta */
function accStamp() { const j = JSON.stringify(S.missed); if (j !== accMissedJ) { accMissedJ = j; S.missedAt = new Date().toISOString(); } }
function accTouch() { if (accMember()) { accDirty = true; acct.touch(); } }
/* «Borrar progreso» y «Cargar una copia»: con cuenta, lo que queda aquí pasa a ser todo el progreso de la cuenta */
function accReset() { if (accMember()) accLS.set(ACC_RESET, new Date().toISOString()); }

/* contadores { stats: { cat: { n, ok, p } }, cf: { caso: [n, ok, p] }, total }: suma o resta, nunca por debajo de 0 */
const accZero = () => ({ stats: {}, cf: {}, total: 0 });
const accCounters = (st) => ({ stats: st.stats || {}, cf: st.cf || {}, total: st.total || 0 });
function accAdd(a, b, sign) {
  sign = sign || 1; a = a || accZero(); b = b || accZero();
  const o = { stats: {}, cf: {}, total: Math.max(0, (a.total || 0) + sign * (b.total || 0)) };
  const cl = (n, ok, p) => { n = Math.max(0, n); ok = Math.max(0, Math.min(n, ok)); return [n, ok, Math.max(0, Math.min(n - ok, p))]; };
  for (const k of new Set([...Object.keys(a.stats || {}), ...Object.keys(b.stats || {})])) {
    const x = (a.stats || {})[k] || {}, y = (b.stats || {})[k] || {}, [n, ok, p] = cl((x.n || 0) + sign * (y.n || 0), (x.ok || 0) + sign * (y.ok || 0), (x.p || 0) + sign * (y.p || 0));
    if (n) o.stats[k] = { n, ok, p };
  }
  for (const k of new Set([...Object.keys(a.cf || {}), ...Object.keys(b.cf || {})])) {
    const x = (a.cf || {})[k] || [0, 0, 0], y = (b.cf || {})[k] || [0, 0, 0], v = cl(x[0] + sign * y[0], x[1] + sign * y[1], x[2] + sign * y[2]);
    if (v[0]) o.cf[k] = v;
  }
  return o;
}
const accIsZero = (c) => !c.total && !Object.keys(c.stats).length && !Object.keys(c.cf).length;
const accRepKey = (r) => (r.t || '') + '|' + (r.ref || '');
/* fusión (sin DOM: la prueban las pruebas) */
function accMerge(r, l, ctx) {
  r = r && r.v === 1 ? r : { v: 1, devices: {}, missed: { l: [], at: '' }, reports: [], repClear: '', resetAt: '' };
  const cache = l.cache && l.cache.uid === ctx.uid ? l.cache : null, now = new Date().toISOString();
  let devices, resetAt = r.resetAt || '';
  if (l.resetReq) { devices = { [l.dev]: Object.assign(accCounters(clone(l.snap)), { at: now }) }; resetAt = l.resetReq; }
  else {
    // lo respondido aquí desde la última sincronización (sin caché, todo lo de este dispositivo; si otro dispositivo borró el progreso, nada)
    const wiped = cache && (r.resetAt || '') > (cache.resetAt || '');
    const delta = wiped ? accZero() : cache ? accAdd(l.snap, accAdd(cache.mine, cache.others), -1) : accCounters(l.snap);
    const prev = r.devices[l.dev], mine = accAdd(prev, delta);
    devices = Object.assign({}, r.devices, { [l.dev]: Object.assign(mine, { at: accIsZero(delta) && prev ? prev.at : now }) });
  }
  const missed = l.resetReq ? { l: [], at: now } : (l.missed.at || '') > (r.missed.at || '') ? l.missed : r.missed;
  const repClear = [r.repClear || '', l.repClear || ''].sort().pop(), rep = new Map();
  for (const x of (r.reports || []).concat(l.reports || [])) { if (!x || !x.ref || (repClear && (x.t || '') <= repClear)) continue; const k = accRepKey(x), o = rep.get(k); rep.set(k, o ? Object.assign({}, o, x, { env: o.env || x.env ? 1 : 0 }) : x); }
  const reports = [...rep.values()].sort((a, b) => (b.t || '').localeCompare(a.t || '')).slice(0, 300);
  return { v: 1, devices, missed: { l: (missed.l || []).slice(0, 80), at: missed.at || '' }, reports, repClear, resetAt };
}
const ACC_ADAPTER = {
  app: 'ecg',
  collect(ctx) {
    return { dev: ACC_DEV, snap: clone(accCounters(S)), missed: { l: S.missed.slice(), at: S.missedAt || '' }, reports: clone(S.reports), repClear: S.repClear || '', resetReq: accLS.get(ACC_RESET), cache: accLS.get(ACC_SYNC) };
  },
  merge: accMerge,
  apply(m, l, ctx) {
    const mine = m.devices[l.dev] || accZero();
    const others = Object.entries(m.devices).filter(([d]) => d !== l.dev).reduce((acc, [, x]) => accAdd(acc, x), accZero());
    const late = accAdd(accCounters(S), l.snap, -1); // respondido mientras se sincronizaba
    const tot = accAdd(accAdd(mine, others), late);
    S.stats = tot.stats; S.cf = tot.cf; S.total = tot.total;
    if (JSON.stringify(S.missed) === JSON.stringify(l.missed.l)) { S.missed = m.missed.l.slice(); S.missedAt = m.missed.at; accMissedJ = JSON.stringify(S.missed); }
    const seen = new Set(m.reports.map(accRepKey)), extra = S.reports.filter((x) => !seen.has(accRepKey(x)) && (!m.repClear || (x.t || '') > m.repClear));
    S.reports = extra.concat(m.reports).slice(0, 300); S.repClear = m.repClear;
    accLS.set(ACC_SYNC, { uid: ctx.uid, mine: accCounters(mine), others, resetAt: m.resetAt });
    if (l.resetReq && accLS.get(ACC_RESET) === l.resetReq) accLS.set(ACC_RESET, null);
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* sin persistencia */ }
    if (!accIsZero(late) || extra.length) acct.touch();
    accRefresh();
  },
  summary(m) {
    const t = Object.values(m.devices).reduce((acc, x) => accAdd(acc, x), accZero()), st = Object.values(t.stats);
    const n = st.reduce((a, s) => a + s.n, 0), ok = st.reduce((a, s) => a + s.ok, 0);
    return { n: t.total, pct: n ? Math.round(100 * ok / n) : null, rep: m.reports.length, dev: Object.keys(m.devices).length };
  },
  pending() { return accDirty; },
  onSession(s, kind) {
    if (!s && kind === 'out') { // al cerrar sesión, este dispositivo vuelve a empezar: el progreso queda en la cuenta
      Object.assign(S, { stats: {}, cf: {}, total: 0, missed: [], reports: [], missedAt: '', repClear: '' }); accMissedJ = '[]';
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* sin persistencia */ }
      accLS.set(ACC_SYNC, null); accLS.set(ACC_RESET, null); accRefresh();
    }
    if (!s && kind === 'deleted') { accLS.set(ACC_SYNC, null); accLS.set(ACC_RESET, null); }
  },
  adminDetail(d) {
    const E = Cuenta.esc, t = Object.values(d.devices || {}).reduce((acc, x) => accAdd(acc, x), accZero());
    const name = (k) => k.startsWith('m_') ? (MON_CATS[k.slice(2)] || {}).name : k.startsWith('o_') ? (OCC_CATS[k.slice(2)] || {}).name : k.startsWith('i_') ? (IMG_CATS[k.slice(2)] || {}).name : (CATS[k] || {}).name;
    const mode = (k) => k.startsWith('m_') ? 'Monitor' : k.startsWith('o_') ? 'Oclusión' : k.startsWith('i_') ? 'Imagen' : '12 derivaciones';
    const rows = Object.entries(t.stats).sort((a, b) => b[1].n - a[1].n).map(([k, s]) => `<tr><td>${E(name(k) || k)}</td><td>${E(mode(k))}</td><td>${s.n}</td><td>${Math.round(100 * s.ok / s.n)} %</td></tr>`).join('');
    const reps = (d.reports || []).slice(0, 30).map((r) => `<tr><td>${E(Cuenta.fdate(r.t))}</td><td>${E(r.modo)}</td><td>${E(r.caso)} <span class="cta-sm">[${E(r.ref)}]</span></td><td>${E(r.motivo)}${r.nota ? '<br><span class="cta-sm">' + E(r.nota) + '</span>' : ''}</td></tr>`).join('');
    const n = Object.values(t.stats).reduce((a, s) => a + s.n, 0), ok = Object.values(t.stats).reduce((a, s) => a + s.ok, 0);
    return `<p>${t.total} respuestas${n ? ' · ' + Math.round(100 * ok / n) + ' % de acierto' : ''} · ${Object.keys(d.devices || {}).length} dispositivo(s) · ${(d.missed && d.missed.l || []).length} fallos para repasar</p>
      ${rows ? `<div class="cta-scroll"><table class="cta-tbl"><tr><th>Diagnóstico</th><th>Modo</th><th>Respuestas</th><th>Acierto</th></tr>${rows}</table></div>` : ''}
      ${reps ? `<h4>Sus reportes («Este caso no me convence»)</h4><div class="cta-scroll"><table class="cta-tbl"><tr><th>Fecha</th><th>Modo</th><th>Caso</th><th>Motivo</th></tr>${reps}</table></div>` : '<p class="cta-sm">Sin reportes.</p>'}`;
  }
};
/* coordinación: todos los reportes de todas las cuentas en un CSV */
async function accReportsCsv(c, core) {
  const rows = [['fecha', 'tester', 'correo', 'modo', 'caso', 'ref', 'la app dice', 'su respuesta', 'motivo', 'comentario'].join(';')]; let n = 0, who = 0;
  for (const u of c.users) {
    const d = await core.admin.appData(u.id, 'ecg').catch(() => null); if (!d || !(d.reports || []).length) continue;
    who++; for (const r of d.reports) { n++; rows.push([r.t, u.fields.name || '', u.fields.email || '', r.modo, r.caso, r.ref, r.etiqueta, r.resp || '', r.motivo, r.nota || ''].map((x) => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"').join(';')); }
  }
  if (!n) return 'Nadie ha enviado reportes todavía.';
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8' })); a.download = 'ecg-en-ruta-reportes-' + todayStr() + '.csv'; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  return n + ' reportes de ' + who + ' beta tester' + (who > 1 ? 's' : '') + ' descargados en CSV.';
}
function accRefresh() { if (accView === 'home') home(); else if (accView === 'stats') stats(); }
function accInit() {
  const b = document.getElementById('btn-acct'); if (!window.Cuenta || !b || embedded()) return;
  try {
    acct = Cuenta.createUI(Cuenta.createCore(), ACC_ADAPTER, { what: 'Se guardan tus aciertos por diagnóstico y por caso, tus fallos para repasar y tus reportes.', onSync: (s) => { if (s.st === 'ok') accDirty = false; }, adminActions: [{ label: 'Reportes de todos (CSV)', run: accReportsCsv }] });
    acct.mountButton(b); b.hidden = false; acct.start();
  } catch (e) { acct = null; /* sin cuenta: la app sigue igual */ }
}
