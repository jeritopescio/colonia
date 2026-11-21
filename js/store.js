/* Estado de Colonia.
   Con config: Supabase (tablas jugadores, figuritas, regalos + bucket "figuritas"), sin login.
   Sin config o con ?demo en la dirección: modo demo, todo en este dispositivo y los demás con progreso de ejemplo.
   Lo propio (xp, monedas, cosas) se guarda primero acá y después se manda; las fotos se reintentan si no hay señal. */
window.STORE = (function () {
  const D = window.DATA;
  const C = window.COLONIA_CONFIG || {};
  const live = !!(C.supabaseUrl && C.supabaseAnonKey) && !/(^|[?&])demo(&|=|$)/.test(location.search);
  const KEY = live ? 'colonia.v2' : 'colonia.demo';
  const SB_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.min.js';
  const pub = (path) => `${C.supabaseUrl}/storage/v1/object/public/figuritas/${path}`;

  const blank = () => ({ me: null, xp: 0, coins: 0, photos: {}, owned: [], place: {}, gifts: [], days: [], ach: {}, secretSeen: false, am: null, bocinas: {}, regalosVistos: [], idea: null, sumo: [], hallazgos: {}, reac: {}, reacVistas: [],
    cache: { players: {}, figs: [], regalos: [] } });
  let s;
  try { s = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { s = blank(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* sin lugar: seguimos */ } };

  const listeners = [];
  let emitT;
  const emit = () => { clearTimeout(emitT); emitT = setTimeout(() => listeners.forEach((f) => f()), 250); };

  // ---------- modo demo: los demás con progreso de ejemplo ----------
  function seeded(str) { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296; }
  const DEMO = {};
  D.PEOPLE.forEach((p) => {
    const r = seeded('demo' + p.id);
    const done = D.MISSIONS.filter((m) => m.s === 'previa' && r() < 0.45).map((m) => m.id);
    DEMO[p.id] = { xp: done.length * 20 + Math.round(r() * 25), done };
    if (!p.trip) DEMO[p.id].bocinas = Object.fromEntries(D.RUTA.vehiculos.map((v) => [v.id, Math.floor(r() * 3)]));
  });
  // Ideas de ejemplo para el capítulo que viene (solo en el modo demo).
  [['rochi', 'Un finde largo en las sierras, con pileta'], ['nico', 'Repetir la costa, pero una semana entera'], ['juli', 'Una colonia de invierno con guiso y juegos de mesa']]
    .forEach(([id, t], i) => { DEMO[id].idea = { t, en: `2027-01-1${i + 1}T12:00:00Z` }; });
  DEMO.pachi.sumo = ['rochi']; DEMO.juani.sumo = ['rochi', 'juli']; DEMO.rich.sumo = ['nico'];
  const REAC_DEMO = ['corazon', 'bien', 'mal', 'no', 'si', 'risa'];
  D.PEOPLE.forEach((p) => {
    const r = seeded('reac' + p.id); DEMO[p.id].reac = {};
    D.PEOPLE.forEach((q) => { if (q.id !== p.id) DEMO[q.id].done.forEach((m) => { if (r() < 0.3) DEMO[p.id].reac[q.id + '/' + m] = REAC_DEMO[Math.floor(r() * 6)]; }); });
  });

  const levelOf = (xp) => { let i = 0; D.LEVELS.forEach((l, j) => { if (xp >= l.xp) i = j; }); return i; };

  // ---------- Supabase ----------
  let client = null;
  function loadLib() {
    return new Promise((ok, fail) => {
      if (window.supabase) return ok();
      const sc = document.createElement('script'); sc.src = SB_JS; sc.onload = ok; sc.onerror = fail; document.head.appendChild(sc);
    });
  }
  async function pull() {
    const [j, f, r] = await Promise.all([
      client.from('jugadores').select('id,xp,monedas,datos'),
      client.from('figuritas').select('jugador,mision,foto,creada'),
      client.from('regalos').select('id,de,para,item,creado').order('creado'),
    ]);
    if (j.error || f.error || r.error) throw j.error || f.error || r.error;
    s.cache.players = Object.fromEntries(j.data.map((x) => [x.id, x]));
    s.cache.figs = f.data;
    s.cache.regalos = r.data;
    // Mis datos guardados en la base mandan (por si es un celu nuevo o se borró el navegador).
    const mine = s.me && s.cache.players[s.me];
    if (mine && mine.datos && mine.datos.v) {
      const local = { xp: s.xp, coins: s.coins };
      if (mine.xp >= local.xp) {
        s.xp = mine.xp; s.coins = mine.monedas;
        const d = mine.datos;
        s.owned = d.owned || []; s.place = d.place || {}; s.days = d.days || []; s.ach = d.ach || {}; s.secretSeen = d.secretSeen || false; s.am = d.am || null; s.bocinas = d.bocinas || {};
        s.idea = d.idea || null; s.sumo = d.sumo || []; s.hallazgos = d.hallazgos || {}; s.reac = d.reac || {};
        s.reacVistas = [...new Set([...(d.reacVistas || []), ...s.reacVistas])];
        s.regalosVistos = [...new Set([...(d.regalosVistos || []), ...s.regalosVistos])];
      }
    }
    if (s.me) s.cache.figs.filter((x) => x.jugador === s.me).forEach((x) => { if (!String(s.photos[x.mision] || '').startsWith('data:')) s.photos[x.mision] = pub(x.foto); });
    save();
  }
  function subscribe() {
    client.channel('colonia')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jugadores' }, (p) => { if (p.new && p.new.id) { s.cache.players[p.new.id] = p.new; save(); emit(); } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'figuritas' }, (p) => {
        if (!p.new || !p.new.jugador) return;
        s.cache.figs = s.cache.figs.filter((x) => !(x.jugador === p.new.jugador && x.mision === p.new.mision)).concat(p.new);
        save(); emit();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'regalos' }, (p) => {
        if (s.cache.regalos.some((r) => r.id === p.new.id)) return; // ya lo agregó quien lo regaló
        s.cache.regalos.push(p.new); save(); emit();
        if (p.new.para === s.me) listeners.forEach((f) => f({ gift: p.new }));
      })
      .subscribe();
  }

  // ---------- quién está en la colonia ----------
  // Presencia en vivo de Supabase: no se guarda nada. Cada celu avisa que está mientras tiene la app a la vista.
  const enLinea = new Set();
  let presencia = null, listo = false, listoT;
  function conectarPresencia() {
    if (!client || !s.me || presencia) return;
    presencia = client.channel('presencia', { config: { presence: { key: s.me } } });
    presencia
      .on('presence', { event: 'sync' }, () => {
        enLinea.clear();
        Object.entries(presencia.presenceState()).forEach(([id, ps]) => { if (id !== s.me && ps.length) enLinea.add(id); });
        listeners.forEach((f) => f({ presencia: true }));
      })
      // Solo avisa de quien llega después: los que ya estaban llegan juntos en los primeros segundos.
      .on('presence', { event: 'join' }, ({ key, currentPresences }) => {
        if (!listo || key === s.me || (currentPresences && currentPresences.length)) return;
        listeners.forEach((f) => f({ llego: key }));
      })
      .subscribe((st) => {
        if (st !== 'SUBSCRIBED') return;
        listo = false; clearTimeout(listoT); listoT = setTimeout(() => { listo = true; }, 4000);
        if (!document.hidden) presencia.track({ desde: Date.now() });
      });
  }
  document.addEventListener('visibilitychange', () => {
    if (!presencia) return;
    if (document.hidden) presencia.untrack(); else presencia.track({ desde: Date.now() });
  });

  let pushT;
  function pushMe() {
    if (!client || !s.me) return;
    clearTimeout(pushT);
    pushT = setTimeout(async () => {
      const datos = { v: 1, owned: s.owned, place: s.place, days: s.days.slice(-40), ach: s.ach, secretSeen: s.secretSeen, am: s.am, bocinas: s.bocinas, regalosVistos: s.regalosVistos.slice(-200), idea: s.idea, sumo: s.sumo, hallazgos: s.hallazgos, reac: s.reac, reacVistas: s.reacVistas.slice(-400) };
      const { error } = await client.from('jugadores').update({ xp: s.xp, monedas: s.coins, datos, actualizado: new Date().toISOString() }).eq('id', s.me);
      if (error) console.warn('No se pudo guardar', error);
    }, 400);
  }

  async function uploadPending() {
    if (!client || !s.me) return;
    for (const [mid, url] of Object.entries(s.photos)) {
      if (!String(url).startsWith('data:')) continue;
      try {
        const blob = await (await fetch(url)).blob();
        const path = `fotos/${s.me}/${mid}-${Date.now()}.jpg`;
        const up = await client.storage.from('figuritas').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
        if (up.error) throw up.error;
        const row = { jugador: s.me, mision: mid, foto: path, creada: new Date().toISOString() };
        const ins = await client.from('figuritas').upsert(row, { onConflict: 'jugador,mision' });
        if (ins.error) throw ins.error;
        s.photos[mid] = pub(path);
        s.cache.figs = s.cache.figs.filter((x) => !(x.jugador === s.me && x.mision === mid)).concat(row);
        save(); emit();
      } catch (e) {
        console.warn('Foto pendiente, se reintenta', e);
        listeners.forEach((f) => f({ uploadFailed: true }));
        return;
      }
    }
  }

  const ready = (async () => {
    if (!live) {
      setTimeout(() => { enLinea.add('nico'); listeners.forEach((f) => f({ presencia: true })); }, 2500);
      setTimeout(() => { enLinea.add('rochi'); listeners.forEach((f) => f({ presencia: true })); listeners.forEach((f) => f({ llego: 'rochi' })); }, 6000);
      return;
    }
    try {
      await Promise.race([
        (async () => {
          await loadLib();
          client = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, { auth: { persistSession: false } });
          await pull();
          subscribe();
          conectarPresencia();
        })(),
        new Promise((_, no) => setTimeout(() => no(new Error('tarda mucho')), 9000)),
      ]);
      uploadPending();
    } catch (e) {
      console.warn('Sin conexión con la base, sigo con lo guardado', e);
    }
  })();
  addEventListener('online', () => { if (client) { pull().then(emit).catch(() => {}); uploadPending(); } });

  const others = () => s.cache.players;
  const reacDe = (pid) => (pid === s.me ? s.reac : live ? ((s.cache.players[pid] || {}).datos || {}).reac || {} : DEMO[pid].reac || {});

  const api = {
    live, ready,
    onChange(f) { listeners.push(f); },
    faceUrl(id) { return C.supabaseUrl ? pub('caras/' + id + '.webp') : 'img/caras/' + id + '.webp'; },
    get me() { return s.me; },
    setMe(id) {
      s.me = id;
      const row = s.cache.players[id];
      if (row && row.datos && row.datos.v) { s.xp = row.xp; s.coins = row.monedas; s.owned = row.datos.owned || []; s.place = row.datos.place || {}; s.days = row.datos.days || []; s.ach = row.datos.ach || {}; s.secretSeen = row.datos.secretSeen || false; s.am = row.datos.am || null; s.bocinas = row.datos.bocinas || {}; s.regalosVistos = row.datos.regalosVistos || []; s.idea = row.datos.idea || null; s.sumo = row.datos.sumo || []; s.hallazgos = row.datos.hallazgos || {}; s.reac = row.datos.reac || {}; s.reacVistas = row.datos.reacVistas || []; }
      s.cache.figs.filter((x) => x.jugador === id).forEach((x) => { s.photos[x.mision] = pub(x.foto); });
      save(); conectarPresencia();
    },
    // Quiénes tienen la app abierta ahora (sin contarte a vos).
    conectados() { return [...enLinea]; },
    usedElsewhere(id) { const r = s.cache.players[id]; return !!(live && r && r.datos && r.datos.v); },
    forget() { const c = s.cache; s = blank(); s.cache = c; save(); },
    get xp() { return s.xp; },
    get coins() { return s.coins; },
    level() { return levelOf(s.xp); },
    levelOf,
    photo(mid) { return s.photos[mid]; },
    photos() { return s.photos; },
    photoOf(pid, mid) {
      if (pid === s.me) return s.photos[mid] || null;
      if (!live) return null;
      const f = s.cache.figs.find((x) => x.jugador === pid && x.mision === mid);
      return f ? pub(f.foto) : null;
    },
    owned() { return s.owned; },
    gifts() {
      if (live) return s.cache.regalos.filter((r) => r.para === s.me).map((r) => ({ id: r.id, from: r.de, item: r.item }));
      return s.me && s.me !== 'nico' ? [{ id: 'demo1', from: 'nico', item: 'birra' }] : [];
    },
    // Regalos que todavía no viste (el aviso sale una sola vez, también si entrás desde otro celu).
    regalosNuevos() { return api.gifts().filter((g) => !s.regalosVistos.includes(g.id)); },
    verRegalos(ids) { s.regalosVistos = [...new Set([...s.regalosVistos, ...ids])]; save(); pushMe(); },
    // Monedas de regalo puntuales (D.BONOS): se dan una sola vez a quien corresponde.
    bonos() {
      const hoy = window.SKY.arDate();
      const got = (D.BONOS || []).filter((b) => (b.para === s.me || b.para === '*') && (!b.desde || hoy >= b.desde) && !s.ach['bono:' + b.id]);
      got.forEach((b) => { s.coins += b.c; s.ach['bono:' + b.id] = 1; });
      if (got.length) { save(); pushMe(); }
      return got;
    },

    // ---------- altarcito playero ----------
    // Cada cosa tiene una clave: o<n> si la compraste vos, g<id> si te la regalaron.
    // place[clave] = { x, y (0 a 1, el pie de la cosa), c (color), off (guardada en la bolsa) }
    altar(pid) {
      pid = pid || s.me;
      const fix = (id) => (D.SHOP.some((x) => x.id === id) ? id : D.ALIAS[id] || 'caracoles');
      let owned, place, regalos;
      if (pid === s.me) { owned = s.owned; place = s.place; regalos = api.gifts(); }
      else {
        const r = s.cache.players[pid];
        owned = (r && r.datos && r.datos.owned) || []; place = (r && r.datos && r.datos.place) || {};
        regalos = s.cache.regalos.filter((g) => g.para === pid).map((g) => ({ id: g.id, from: g.de, item: g.item }));
      }
      const items = owned.map((id, i) => (id ? { k: 'o' + i, id: fix(id) } : null)).filter(Boolean)
        .concat(regalos.filter((g) => g.id).map((g) => ({ k: 'g' + g.id, id: fix(g.item), from: g.from })));
      // Un solo refugio: si hay carpa, la sombrilla no se usa.
      const hasCarpa = items.some((x) => x.id === 'carpa');
      let refugio = null;
      const rest = [];
      items.forEach((x) => {
        const sh = D.SHOP.find((y) => y.id === x.id);
        if (sh.side === 'R') { if (!refugio && (x.id === 'carpa' || !hasCarpa)) refugio = x; }
        else rest.push(x);
      });
      return { refugio, items: rest, place };
    },
    hasRefugio(pid, which) {
      const a = api.altar(pid);
      return which ? !!(a.refugio && a.refugio.id === which) : !!a.refugio;
    },
    setPlace(k, p) {
      s.place[k] = Object.assign({}, s.place[k], p);
      save(); pushMe();
    },
    // En la compu (localhost) usa img/ para probar sin subir nada; publicado, el bucket.
    artUrl(path) { return C.supabaseUrl && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? pub(path) : 'img/' + path; },
    // Las secretas se destapan una vez por día: guarda la fecha en que las miraste.
    secretSeen() { return s.secretSeen === window.SKY.arDate(); },
    seeSecret() { s.secretSeen = window.SKY.arDate(); save(); pushMe(); },
    // Bocinazos de la ruta: cada uno guarda cuántas veces le tocó bocina a cada auto; el total es la suma de todos.
    bocinar(veh) { s.bocinas[veh] = Math.min(99, (s.bocinas[veh] || 0) + 1); save(); pushMe(); },
    bocinas(veh) {
      const por = {};
      D.PEOPLE.forEach((p) => {
        const de = p.id === s.me ? s.bocinas : live ? ((s.cache.players[p.id] || {}).datos || {}).bocinas : DEMO[p.id].bocinas;
        const n = (de && de[veh]) || 0;
        if (n) por[p.id] = n;
      });
      return { total: Object.values(por).reduce((a, b) => a + b, 0), por };
    },
    // Vender algo que compraste (lo regalado no): devuelve el 80% de su precio. Queda un hueco en owned para no correr las claves.
    vender(k) {
      const i = +String(k).slice(1), id = String(k)[0] === 'o' && s.owned[i];
      if (!id) return 0;
      const it = D.SHOP.find((x) => x.id === id) || D.SHOP.find((x) => x.id === D.ALIAS[id]);
      const c = it ? Math.round(it.p * 0.8) : 0;
      s.owned[i] = null; delete s.place[k]; s.coins += c; save(); pushMe();
      return c;
    },

    // ---------- fotos de la colonia y reacciones ----------
    // Todas las fotos subidas (menos las de misiones secretas), de la más nueva a la más vieja. url null en demo: se usa la cara.
    fotosColonia() {
      let out;
      if (live) {
        out = s.cache.figs.map((x) => ({ pid: x.jugador, mision: x.mision, url: x.jugador === s.me && s.photos[x.mision] ? s.photos[x.mision] : pub(x.foto), creada: x.creada || '' }));
        Object.entries(s.photos).forEach(([m, u]) => { if (String(u).startsWith('data:') && !out.some((x) => x.pid === s.me && x.mision === m)) out.push({ pid: s.me, mision: m, url: u, creada: new Date().toISOString() }); });
      } else {
        out = D.PEOPLE.filter((p) => p.id !== s.me).flatMap((p) => DEMO[p.id].done.map((m, j) => ({ pid: p.id, mision: m, url: null, creada: `2026-11-${String(10 + ((p.id.length * 3 + j * 5) % 11)).padStart(2, '0')}T1${j % 10}:00:00Z` })))
          .concat(Object.entries(s.photos).map(([m, u]) => ({ pid: s.me, mision: m, url: u, creada: new Date().toISOString() })));
      }
      return out.filter((x) => !x.mision.startsWith('sec-')).sort((a, b) => String(b.creada).localeCompare(String(a.creada)));
    },
    // Cada persona tiene una reacción por foto (datos.reac['jugador/mision'] = 'risa'). Tocar la misma la saca.
    reaccionar(foto, r) { if (s.reac[foto] === r) delete s.reac[foto]; else s.reac[foto] = r; save(); pushMe(); },
    miReaccion(foto) { return s.reac[foto] || null; },
    reacciones(foto) {
      const out = {};
      D.PEOPLE.forEach((p) => { const r = reacDe(p.id)[foto]; if (r) (out[r] = out[r] || []).push(p.id); });
      return out;
    },
    // Las que otros pusieron en tus fotos y todavía no viste (el aviso sale una sola vez, también desde otro celu).
    reaccionesNuevas() {
      const out = [];
      D.PEOPLE.forEach((p) => {
        if (p.id === s.me) return;
        Object.entries(reacDe(p.id)).forEach(([foto, r]) => {
          const k = p.id + '|' + foto + '|' + r;
          if (foto.startsWith(s.me + '/') && !s.reacVistas.includes(k)) out.push({ de: p.id, foto, r, k });
        });
      });
      return out;
    },
    verReacciones(ks) { s.reacVistas = [...new Set([...s.reacVistas, ...ks])]; save(); pushMe(); },

    // Botellas y galletas que encontraste en tu altarcito: { botella: [{ dia, i }], galleta: [...] } (i = cuál mensaje).
    hallazgos(tipo) { return (s.hallazgos && s.hallazgos[tipo]) || []; },
    hallado(tipo, dia) { return api.hallazgos(tipo).some((h) => h.dia === dia); },
    hallar(tipo, dia, i, c) {
      if (api.hallado(tipo, dia)) return false;
      s.hallazgos = Object.assign({}, s.hallazgos, { [tipo]: api.hallazgos(tipo).concat({ dia, i }) });
      s.coins += c; save(); pushMe();
      return true;
    },
    // Cosas que se ven una sola vez por persona (también desde otro celu): se anotan en ach.
    visto(k) { return !!s.ach[k]; },
    marcar(k) { s.ach[k] = 1; save(); pushMe(); },

    // Ideas para el capítulo que viene: cada persona deja una (datos.idea) y toca ♡ en las de otros (datos.sumo = de quiénes).
    setIdea(t) { t = String(t || '').trim().slice(0, 120); s.idea = t ? { t, en: new Date().toISOString() } : null; save(); pushMe(); },
    sumarme(pid) { s.sumo = s.sumo.includes(pid) ? s.sumo.filter((x) => x !== pid) : s.sumo.concat(pid); save(); pushMe(); },
    ideas() {
      const de = (pid) => (pid === s.me ? s : live ? ((s.cache.players[pid] || {}).datos || {}) : DEMO[pid]);
      return D.PEOPLE.map((p) => ({ pid: p.id, ...(de(p.id).idea || {}) })).filter((i) => i.t)
        .map((i) => Object.assign(i, { sumos: D.PEOPLE.filter((p) => p.id !== i.pid && (de(p.id).sumo || []).includes(i.pid)).map((p) => p.id) }))
        .sort((a, b) => String(a.en).localeCompare(String(b.en)));
    },

    // Para cerrar un capítulo: lo que juntó la colonia hasta "hasta" (inclusive).
    resumen(hasta) {
      const antes = (t) => !t || String(t).slice(0, 10) <= hasta;
      let fotos;
      if (live) {
        const set = new Set(s.cache.figs.filter((x) => antes(x.creada)).map((x) => x.jugador + '/' + x.mision));
        Object.entries(s.photos).forEach(([m, u]) => { if (String(u).startsWith('data:')) set.add(s.me + '/' + m); });
        fotos = set.size;
      } else fotos = D.PEOPLE.reduce((n, p) => n + api.figuritas(p.id), 0);
      const regalos = live ? s.cache.regalos.filter((r) => antes(r.creado)).length : api.gifts().length;
      const bocinas = D.RUTA.vehiculos.reduce((n, v) => n + api.bocinas(v.id).total, 0);
      return { fotos, regalos, bocinas };
    },
    figuritas(id) {
      if (id === s.me) return Object.keys(s.photos).length;
      return live ? s.cache.figs.filter((x) => x.jugador === id).length : DEMO[id].done.length;
    },

    // Guarda la foto, devuelve los premios y la sube en segundo plano.
    addPhoto(mid, dataUrl, xp) {
      const before = levelOf(s.xp);
      const first = !s.photos[mid];
      s.photos[mid] = dataUrl;
      const out = [];
      if (first) {
        s.xp += xp; s.coins += 10; out.push({ xp, coins: 10 });
        const m = D.MISSIONS.find((x) => x.id === mid);
        if (m) {
          const all = D.MISSIONS.filter((x) => x.s === m.s);
          const key = 'serie-' + m.s;
          if (all.every((x) => s.photos[x.id]) && !s.ach[key]) { s.ach[key] = 1; s.coins += D.ACH.serie.c; out.push({ ach: 'serie', serie: m.s }); }
        }
      }
      save(); pushMe(); uploadPending();
      return { out, levelUp: levelOf(s.xp) > before ? levelOf(s.xp) : null };
    },

    buy(item, to) {
      if (s.coins < item.p) return false;
      s.coins -= item.p;
      if (to && to !== s.me) {
        if (!s.ach.regalo) { s.ach.regalo = 1; s.coins += D.ACH.regalo.c; }
        // Se agrega enseguida a lo guardado, así aparece en su altarcito sin esperar.
        api.regaloEnCamino = client
          ? client.from('regalos').insert({ de: s.me, para: to, item: item.id })
            .then(({ error }) => {
              if (error) { console.warn(error); return null; }
              return client.from('regalos').select('id,de,para,item,creado').eq('de', s.me).eq('para', to).order('creado', { ascending: false }).limit(1);
            })
            .then((res) => {
              const data = res && res.data && res.data[0];
              if (data && !s.cache.regalos.some((r) => r.id === data.id)) { s.cache.regalos.push(data); save(); emit(); }
            }).catch((e) => console.warn(e))
          : Promise.resolve();
        save(); pushMe();
        return true;
      }
      s.owned.push(item.id);
      save(); pushMe();
      return 'o' + (s.owned.length - 1);
    },

    // Corre al entrar: entrada del día, racha, noctámbulo y premio matutino (primera persona del día desde las 5).
    dailyCheck() {
      const today = window.SKY.arDate();
      const min = window.SKY.arMinute();
      const got = [];
      const give = (k) => { s.coins += D.ACH[k].c; s.ach[k + ':' + today] = 1; got.push(k); };
      if (!s.days.includes(today)) {
        s.days.push(today);
        give('entrada');
        if (min < 300) give('noctambulo');
        const streak = api.streak();
        if (streak === 2) give('racha2');
        if (streak >= 3) give('racha3');
      }
      if (min >= 300 && s.am !== today) {
        s.am = today;
        const someoneBefore = live
          ? Object.values(s.cache.players).some((p) => p.id !== s.me && p.datos && p.datos.am === today)
          : min >= 540;
        if (!someoneBefore) give('matutino');
      }
      save(); if (got.length) pushMe();
      return got;
    },
    streak() {
      const set = new Set(s.days);
      let n = 0;
      const d = window.SKY.arNow();
      while (set.has(d.toISOString().slice(0, 10))) { n++; d.setUTCDate(d.getUTCDate() - 1); }
      return n;
    },

    xpOf(id) {
      if (id === s.me) return s.xp;
      return live ? (others()[id] ? others()[id].xp : 0) : DEMO[id].xp;
    },
    groupXp() { return D.PEOPLE.reduce((t, p) => t + api.xpOf(p.id), 0); },
    doneBy(mid) {
      return D.PEOPLE.filter((p) => {
        if (p.id === s.me) return !!s.photos[mid];
        return live ? s.cache.figs.some((x) => x.jugador === p.id && x.mision === mid) : DEMO[p.id].done.includes(mid);
      });
    },
  };
  return api;
})();
