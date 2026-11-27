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

  const blank = () => ({ me: null, xp: 0, coins: 0, photos: {}, owned: [], place: {}, gifts: [], days: [], ach: {}, secretSeen: false, am: null, bocinas: {}, regalosVistos: [], idea: null, sumo: [], hallazgos: {}, reac: {}, reacT: {}, cuentas: {}, reacVistas: [], sobres: 0, recuerdos: [], visitas: [], amigos: [], perfil: null, tiradas: [], leidas: [],
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
  // Para el ranking en demo: días, regalos, madrugadas y cosas de ejemplo.
  D.PEOPLE.forEach((p) => {
    const r = seeded('extra' + p.id), d = DEMO[p.id];
    d.days = Array.from({ length: 1 + Math.floor(r() * 5) }, (_, i) => `2026-11-${17 + i}`);
    d.regalosHechos = Math.floor(r() * 3);
    d.ach = r() < 0.35 ? { 'matutino:2026-11-20': 1, 'matutino:2026-11-21': 1 } : r() < 0.3 ? { 'noctambulo:2026-11-19': 1 } : {};
    d.owned = Array.from({ length: Math.floor(r() * 5) }, () => 'mate');
    d.hallazgos = r() < 0.3 ? { botella: [{ dia: '2026-11-21', i: 0 }] } : {};
  });
  const REAC_DEMO = ['corazon', 'bien', 'no', 'si', 'risa', 'emocion'];
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
        s.idea = d.idea || null; s.sumo = d.sumo || []; s.hallazgos = d.hallazgos || {}; s.reac = d.reac || {}; s.reacT = d.reacT || {};
        s.cuentas = juntarCuentas(d.cuentas, s.cuentas);
        s.reacVistas = [...new Set([...(d.reacVistas || []), ...s.reacVistas])];
        s.sobres = d.sobres || 0;
        if (!String(s.perfil || '').startsWith('data:')) s.perfil = d.perfil || null;
        ['recuerdos', 'visitas', 'amigos', 'leidas'].forEach((k) => { s[k] = [...new Set([...(d[k] || []), ...(s[k] || [])])]; });
        s.tiradas = d.tiradas || s.tiradas || [];
        s.regalosVistos = [...new Set([...(d.regalosVistos || []), ...s.regalosVistos])];
      }
    }
    if (s.me) s.cache.figs.filter((x) => x.jugador === s.me).forEach((x) => { if (!String(s.photos[x.mision] || '').startsWith('data:')) s.photos[x.mision] = pub(x.foto); });
    save();
    devolverRetirados();
    revisarDesaprobadas();
  }
  // Lo que se sacó del kiosco (retirado: true en D.SHOP): se devuelve lo que se pagó, una sola vez, a quien lo compró o lo regaló.
  function devolverRetirados() {
    if (!s.me) return;
    const ret = (id) => { const it = D.SHOP.find((x) => x.id === id); return it && it.retirado ? it : null; };
    let n = 0;
    s.owned.forEach((id, i) => { const it = id && ret(id); if (it) { s.owned[i] = null; delete s.place['o' + i]; s.coins += it.p; n += it.p; } });
    s.cache.regalos.forEach((g) => { const it = g.de === s.me && ret(g.item); if (it && !s.ach['devuelto:' + g.id]) { s.ach['devuelto:' + g.id] = 1; s.coins += it.p; n += it.p; } });
    if (n) { api.devuelto = (api.devuelto || 0) + n; save(); pushMe(); }
  }
  function subscribe() {
    client.channel('colonia')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jugadores' }, (p) => { if (p.new && p.new.id) { s.cache.players[p.new.id] = p.new; save(); emit(); if (p.new.id !== s.me) revisarDesaprobadas(); } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'figuritas' }, (p) => {
        if (!p.new || !p.new.jugador) return;
        s.cache.figs = s.cache.figs.filter((x) => !(x.jugador === p.new.jugador && x.mision === p.new.mision)).concat(p.new);
        save(); emit(); revisarDesaprobadas();
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
  const enLinea = new Set(), enElMar = new Set(); // enElMar: quienes están en "mirar el mar" ahora
  let presencia = null, listo = false, listoT, mirando = false;
  const anunciar = () => { if (presencia && !document.hidden) presencia.track(mirando ? { desde: Date.now(), mar: true } : { desde: Date.now() }); };
  function conectarPresencia() {
    if (!client || !s.me || presencia) return;
    presencia = client.channel('presencia', { config: { presence: { key: s.me } } });
    presencia
      .on('presence', { event: 'sync' }, () => {
        enLinea.clear(); enElMar.clear();
        Object.entries(presencia.presenceState()).forEach(([id, ps]) => {
          if (id === s.me || !ps.length) return;
          enLinea.add(id);
          if (ps.some((p) => p.mar)) enElMar.add(id);
        });
        listeners.forEach((f) => f({ presencia: true }));
      })
      // Mirar el mar juntos: dónde está cada personita, saludos y notas. Llega solo a los demás.
      .on('broadcast', { event: 'mar' }, ({ payload }) => { if (payload) listeners.forEach((f) => f({ mar: payload })); })
      // Solo avisa de quien llega después: los que ya estaban llegan juntos en los primeros segundos.
      .on('presence', { event: 'join' }, ({ key, currentPresences }) => {
        if (!listo || key === s.me || (currentPresences && currentPresences.length)) return;
        listeners.forEach((f) => f({ llego: key }));
      })
      .subscribe((st) => {
        if (st !== 'SUBSCRIBED') return;
        listo = false; clearTimeout(listoT); listoT = setTimeout(() => { listo = true; }, 4000);
        anunciar();
      });
  }
  document.addEventListener('visibilitychange', () => {
    if (!presencia) return;
    if (document.hidden) presencia.untrack(); else anunciar();
  });
  // Avisa a los demás que estás (o ya no) mirando el mar. En el modo demo, al rato aparecen Rochi y Nico mirando también;
  // con ?demo&gente=7, van llegando de a uno hasta ser 7 (para ver el barco fantasma, que aparece con más de 5);
  // con ?demo&gente=1 no llega nadie (para ver los delfines y la cola de sirena, que salen a solas).
  let demoMarT = [];
  const DEMO_GENTE = +((location.search.match(/[?&]gente=(\d+)/) || [])[1] || 0);
  function mirarElMar(si) {
    if (mirando === !!si) return;
    mirando = !!si;
    if (live) { anunciar(); return; }
    demoMarT.forEach(clearTimeout); demoMarT = [];
    const llegan = DEMO_GENTE > 0
      ? ['rochi', 'nico', 'juani', 'pachi', 'viqui', 'rich', 'sofi', 'chino', 'grego', 'jose', 'nachote', 'juli', 'jero'].filter((id) => id !== s.me).slice(0, DEMO_GENTE - 1).map((id, i) => [id, 1500 + i * 1500])
      : [['rochi', 2500], ['nico', 6000]];
    if (si) llegan.forEach(([id, ms]) => demoMarT.push(setTimeout(() => { enElMar.add(id); listeners.forEach((f) => f({ presencia: true })); }, ms)));
    else enElMar.clear();
  }
  function enviarMar(m) {
    if (!presencia || !live) return;
    presencia.send({ type: 'broadcast', event: 'mar', payload: Object.assign({ de: s.me }, m) });
  }

  // Qué celu usa cada uno, para entender por qué a alguien no le aparece algo: sistema, navegador, si tiene "reducir
  // movimiento", si la app está instalada, si la música del inicio está prendida, el último día que sonó y si eligió
  // que suene aunque el iPhone esté en silencio.
  function dispositivo() {
    const ua = navigator.userAgent, ls = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    const ios = /iPhone|iPad|iPod/.test(ua) && ua.match(/OS (\d+)_(\d+)/), and = ua.match(/Android (\d+)/);
    return {
      so: ios ? `iOS ${ios[1]}.${ios[2]}` : and ? `Android ${and[1]}` : /Macintosh/.test(ua) ? 'Mac o iPad' : /Windows/.test(ua) ? 'Windows' : 'otro',
      nav: /CriOS|Chrome/.test(ua) ? 'chrome' : /FxiOS|Firefox/.test(ua) ? 'firefox' : /Safari/.test(ua) ? 'safari' : 'otro',
      rm: matchMedia('(prefers-reduced-motion: reduce)').matches,
      app: matchMedia('(display-mode: standalone)').matches || !!navigator.standalone,
      musica: ls('colonia.musica') !== '0', sono: ls('colonia.sono'), silencio: ls('colonia.silencio') === 'sonar',
      fps: +ls('colonia.fps') || null, liviano: ls('colonia.liviano') === '1',
      t: new Date().toISOString().slice(0, 16),
    };
  }
  // Los días que cubrió un salvavidas cuentan para la racha (no como días en la app).
  const diasConSalvavidas = (days, ach) => new Set([...(days || []), ...Object.keys(ach || {}).filter((k) => k.startsWith('salvado:')).map((k) => k.slice(8))]);
  const diaMenos = (dia, n) => { const d = new Date(dia + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
  // Al entrar: si ayer no entraste pero anteayer sí, y tenés un salvavidas (y no usaste otro en la última semana), te cubre ayer.
  function usarSalvavidas(hoy) {
    const set = diasConSalvavidas(s.days, s.ach), ayer = diaMenos(hoy, 1), anteayer = diaMenos(hoy, 2);
    if (set.has(ayer) || !set.has(anteayer) || !(s.ach.salvavidas > 0)) return;
    if (s.ach.salvavidasUso && s.ach.salvavidasUso > diaMenos(hoy, D.SALVAVIDAS.cada)) return;
    s.ach['salvado:' + ayer] = 1; s.ach.salvavidas -= 1; s.ach.salvavidasUso = hoy;
    api.salvavidasUsado = ayer;
  }
  let pushT;
  function pushMe() {
    if (!client || !s.me) return;
    clearTimeout(pushT);
    pushT = setTimeout(async () => {
      const datos = { v: 1, owned: s.owned, place: s.place, days: s.days.slice(-40), ach: s.ach, secretSeen: s.secretSeen, am: s.am, bocinas: s.bocinas, regalosVistos: s.regalosVistos.slice(-200), idea: s.idea, sumo: s.sumo, hallazgos: s.hallazgos, reac: s.reac, reacT: s.reacT, cuentas: s.cuentas, reacVistas: s.reacVistas.slice(-400), sobres: s.sobres, recuerdos: s.recuerdos, visitas: s.visitas, amigos: s.amigos, tiradas: (s.tiradas || []).slice(-20), leidas: (s.leidas || []).slice(-200), disp: dispositivo(),
        perfil: String(s.perfil || '').startsWith('data:') ? (((s.cache.players[s.me] || {}).datos || {}).perfil || null) : s.perfil };
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
        save(); emit(); revisarDesaprobadas();
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
  // Suma experiencia y, si pasaste de nivel, un sobre por cada nivel nuevo.
  function sumarXp(n) {
    const antes = s.xp, nivelAntes = levelOf(antes);
    s.xp += n;
    const subio = levelOf(s.xp) - nivelAntes;
    if (subio > 0) s.sobres = (s.sobres || 0) + subio;
    return { xp: n, antes, despues: s.xp, levelUp: subio > 0 ? levelOf(s.xp) : null };
  }
  const reacDe = (pid) => (pid === s.me ? s.reac : live ? ((s.cache.players[pid] || {}).datos || {}).reac || {} : DEMO[pid].reac || {});
  // Cuándo puso cada uno su reacción. Las de antes de que existiera esto cuentan como puestas el 27/11 a la mañana.
  const REAC_VIEJA = '2026-11-27T12:00:00.000Z';
  const reacTDe = (pid) => (pid === s.me ? s.reacT : live ? ((s.cache.players[pid] || {}).datos || {}).reacT || {} : {});
  // Cuándo se subió la foto que hay ahora (al cambiarla, las reacciones de antes ya no cuentan).
  const creadaDe = (pid, mid) => { const f = s.cache.figs.find((x) => x.jugador === pid && x.mision === mid); return f ? f.creada || '' : ''; };
  // Fotos desaprobadas: con CRUCES o más cruces rojas, la foto pierde lo que dio (experiencia y monedas) hasta que se cambie.
  const CRUCES = 4;
  // La experiencia que dio cada misión (anotada al subirla; para las de antes, la de la misión).
  const xpMision = (mid) => {
    if (s.ach['xp:' + mid]) return s.ach['xp:' + mid];
    const m = D.MISSIONS.find((x) => x.id === mid);
    if (m) return m.xp;
    if (mid === D.DUO.id) return D.DUO.xp;
    if (mid.startsWith('ruta-')) return D.RUTA.xp;
    if (mid.startsWith('sec-')) return 30;
    if (mid.startsWith('hora-')) return D.HORA.xp;
    return mid.startsWith('dia-') && D.DAILY_TRIP[mid.slice(4)] ? 40 : 20;
  };
  function revisarDesaprobadas() {
    if (!s.me) return;
    const cambios = [];
    Object.keys(s.photos).forEach((mid) => {
      const mala = api.desaprobada(s.me, mid), k = 'desap:' + mid, ya = s.ach[k];
      if (mala && !ya) {
        const xp = Math.min(s.xp, xpMision(mid)), c = Math.min(s.coins, 10);
        s.xp -= xp; s.coins -= c; s.ach[k] = [xp, c]; cambios.push({ mid, mala: true, xp, c });
      } else if (!mala && ya) {
        const [xp, c] = Array.isArray(ya) ? ya : [0, 0];
        s.xp += xp; s.coins += c; delete s.ach[k]; cambios.push({ mid, mala: false, xp, c });
      }
    });
    if (!cambios.length) return;
    save(); pushMe();
    listeners.forEach((f) => f({ desap: cambios }));
  }
  // Las cuentas para el wrapped se juntan quedándose con lo más alto de cada una (por si usás dos celus).
  function juntarCuentas(a, b) {
    const out = Object.assign({}, a || {});
    Object.entries(b || {}).forEach(([k, v]) => { out[k] = Math.max(out[k] || 0, v); });
    return out;
  }
  let cuentasT = null;
  const subirCuentas = () => { if (!cuentasT) cuentasT = setTimeout(() => { cuentasT = null; pushMe(); }, 20000); };
  document.addEventListener('visibilitychange', () => { if (document.hidden && cuentasT) { clearTimeout(cuentasT); cuentasT = null; pushMe(); } });

  const api = {
    live, ready,
    onChange(f) { listeners.push(f); },
    // Deslizar para actualizar: vuelve a traer todo de la base (si hay señal).
    async refrescar() { if (!client) return false; await pull(); emit(); return true; },
    // La foto de perfil: la que cada uno eligió en la app (datos.perfil) o, si no, la de WhatsApp que puso Jero (caras/).
    faceUrl(id) {
      const perfil = id === s.me ? s.perfil : live ? ((s.cache.players[id] || {}).datos || {}).perfil : null;
      if (perfil) return String(perfil).startsWith('data:') ? perfil : pub(perfil);
      return C.supabaseUrl ? pub('caras/' + id + '.webp') : 'img/caras/' + id + '.webp';
    },
    tienePerfil() { return !!s.perfil; },
    // Se ve enseguida en este celu; se sube a fotos/<id>/ (como las figuritas) y después se avisa a los demás.
    async setPerfil(dataUrl) {
      s.perfil = dataUrl || null; save();
      if (!dataUrl) { pushMe(); emit(); return true; }
      if (!client) { emit(); return true; }
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const path = `fotos/${s.me}/perfil-${Date.now()}.jpg`;
        const up = await client.storage.from('figuritas').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
        if (up.error) throw up.error;
        s.perfil = path; save(); pushMe(); emit();
        return true;
      } catch (e) {
        console.warn('No se pudo subir la foto de perfil', e);
        return false;
      }
    },
    get me() { return s.me; },
    setMe(id) {
      s.me = id;
      const row = s.cache.players[id];
      if (row && row.datos && row.datos.v) { s.xp = row.xp; s.coins = row.monedas; s.owned = row.datos.owned || []; s.place = row.datos.place || {}; s.days = row.datos.days || []; s.ach = row.datos.ach || {}; s.secretSeen = row.datos.secretSeen || false; s.am = row.datos.am || null; s.bocinas = row.datos.bocinas || {}; s.regalosVistos = row.datos.regalosVistos || []; s.idea = row.datos.idea || null; s.sumo = row.datos.sumo || []; s.hallazgos = row.datos.hallazgos || {}; s.reac = row.datos.reac || {}; s.reacT = row.datos.reacT || {}; s.cuentas = juntarCuentas(row.datos.cuentas, s.cuentas); s.reacVistas = row.datos.reacVistas || []; s.sobres = row.datos.sobres || 0; s.recuerdos = row.datos.recuerdos || []; s.visitas = row.datos.visitas || []; s.amigos = row.datos.amigos || []; s.perfil = row.datos.perfil || null; s.tiradas = row.datos.tiradas || []; s.leidas = row.datos.leidas || []; }
      s.cache.figs.filter((x) => x.jugador === id).forEach((x) => { s.photos[x.mision] = pub(x.foto); });
      save(); conectarPresencia();
    },
    // Quiénes tienen la app abierta ahora (sin contarte a vos).
    conectados() { return [...enLinea]; },
    mirarElMar,
    enviarMar,
    enElMar() { return [...enElMar]; },
    // Sentarse a mirar el mar al lado de alguien (para el logro "Mirar el mar juntos").
    sentarseCon(pid) { if (!pid || s.ach['juntos:' + pid]) return; s.ach['juntos:' + pid] = 1; save(); pushMe(); },

    // ---------- la botella entre amigos ----------
    botellaHoy() { return !!s.ach['botella:' + window.SKY.arDate()]; },
    // Una por día. Le llega a alguien de la colonia al azar (no a vos). Queda en tus datos (tiradas) y la lee quien la recibe.
    tirarBotella(t) {
      t = String(t || '').trim().slice(0, 140);
      if (!s.me || !t || api.botellaHoy()) return null;
      const otros = D.PEOPLE.filter((p) => p.id !== s.me), para = otros[Math.floor(Math.random() * otros.length)].id;
      s.tiradas = (s.tiradas || []).concat({ id: s.me + '-' + Date.now().toString(36), para, t, en: new Date().toISOString() }).slice(-20);
      s.ach['botella:' + window.SKY.arDate()] = 1;
      save(); pushMe();
      return para;
    },
    // Las que te tiraron y todavía no abriste, de la más vieja a la más nueva. En el modo demo, una de Rochi.
    botellasParaMi() {
      const leidas = new Set(s.leidas || []);
      let todas;
      if (live) todas = Object.values(s.cache.players).filter((p) => p.id !== s.me).flatMap((p) => ((p.datos || {}).tiradas || []).filter((b) => b.para === s.me).map((b) => Object.assign({ de: p.id }, b)));
      else todas = s.me && s.me !== 'rochi' ? [{ id: 'demo-botella', de: 'rochi', t: 'Ojalá este verano dure un poquito más que el anterior.', en: '2026-11-23T20:00:00Z' }] : [];
      return todas.filter((b) => !leidas.has(b.id)).sort((a, b) => String(a.en).localeCompare(String(b.en)));
    },
    leerBotella(id) {
      if (!id || (s.leidas || []).includes(id)) return false;
      s.leidas = (s.leidas || []).concat(id); s.coins += D.BOTELLA_AMIGO;
      save(); pushMe();
      return true;
    },
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
      const got = (D.BONOS || []).filter((b) => (b.para === s.me || b.para === '*') && !(b.no || []).includes(s.me) && (!b.desde || hoy >= b.desde) && !s.ach['bono:' + b.id]);
      got.forEach((b) => { s.coins += b.c || 0; if (b.item) s.owned.push(b.item); s.ach['bono:' + b.id] = 1; });
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
        .concat(regalos.filter((g) => g.id).map((g) => ({ k: 'g' + g.id, id: fix(g.item), from: g.from })))
        .filter((x) => !(D.SHOP.find((y) => y.id === x.id) || {}).retirado);
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
    // Lotes de playa: ach.lote = cuántos compró (0 a 3). El ancho del altarcito es el del último.
    lote(pid) {
      pid = pid || s.me;
      const ach = pid === s.me ? s.ach : live ? (((s.cache.players[pid] || {}).datos || {}).ach || {}) : {};
      return Math.min(D.LOTES.length, +ach.lote || 0);
    },
    loteAncho(pid) { const n = api.lote(pid); return n ? D.LOTES[n - 1].ancho : 1; },
    comprarLote() {
      const it = D.LOTES[api.lote()];
      if (!it || s.coins < it.p || levelOf(s.xp) + 1 < it.lv) return null;
      s.coins -= it.p; s.ach.lote = api.lote() + 1;
      save(); pushMe();
      return it;
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
    // Vender algo que compraste (lo regalado no): devuelve el 80% de su precio, o lo que diga su "venta". Queda un hueco en owned
    // para no correr las claves.
    vender(k) {
      const i = +String(k).slice(1), id = String(k)[0] === 'o' && s.owned[i];
      if (!id) return 0;
      const it = D.SHOP.find((x) => x.id === id) || D.SHOP.find((x) => x.id === D.ALIAS[id]);
      const c = it ? D.precioVenta(it) : 0;
      s.owned[i] = null; delete s.place[k]; s.coins += c; save(); pushMe();
      return c;
    },

    // Lo que hizo cada persona en la app: para el balance, el ranking y las menciones de honor.
    stats(pid) {
      const yo = pid === s.me, d = yo ? s : live ? ((s.cache.players[pid] || {}).datos || {}) : DEMO[pid];
      const ach = d.ach || {}, cuenta = (pre) => Object.keys(ach).filter((k) => k.startsWith(pre + ':')).length;
      const reac = reacDe(pid), porTipo = {};
      Object.values(reac).forEach((r) => { porTipo[r] = (porTipo[r] || 0) + 1; });
      const hz = d.hallazgos || {};
      return {
        fotos: api.figuritas(pid) - api.desaprobadasDe(pid),
        reacciones: Object.keys(reac).length,
        regalos: live ? s.cache.regalos.filter((r) => r.de === pid).length : d.regalosHechos || 0,
        dias: (d.days || []).length,
        porTipo,
        matutino: cuenta('matutino'),
        noctambulo: cuenta('noctambulo'),
        hallazgos: (hz.botella || []).length + (hz.galleta || []).length,
        bocinas: Object.values(d.bocinas || {}).reduce((a, b) => a + b, 0),
        altar: (d.owned || []).filter(Boolean).length,
      };
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
    // Cada reacción guarda cuándo se puso (datos.reacT): si después se cambia la foto, las de antes dejan de contar.
    reaccionar(foto, r) {
      if (s.reac[foto] === r) { delete s.reac[foto]; delete s.reacT[foto]; } else { s.reac[foto] = r; s.reacT[foto] = new Date().toISOString(); }
      api.contar('reacciones');
      save(); pushMe();
    },
    miReaccion(foto) { return api.vigente(s.me, foto) ? s.reac[foto] || null : null; },
    // ¿La reacción de pid a esta foto es de la foto que hay ahora?
    vigente(pid, foto) {
      const [due, mid] = foto.split('/'), creada = creadaDe(due, mid);
      return !creada || (reacTDe(pid)[foto] || REAC_VIEJA) >= creada;
    },
    reacciones(foto) {
      const out = {};
      D.PEOPLE.forEach((p) => { const r = reacDe(p.id)[foto]; if (r && api.vigente(p.id, foto)) (out[r] = out[r] || []).push(p.id); });
      return out;
    },
    // Con 4 cruces rojas (de 4 personas distintas, puestas a la foto que hay ahora), la foto queda desaprobada.
    desaprobada(pid, mid) {
      if (mid.startsWith('sec-')) return false;
      return ((api.reacciones(pid + '/' + mid).no) || []).length >= CRUCES;
    },
    cruces: CRUCES,
    // ---------- cuentas para el wrapped ----------
    // Cuántas veces (o cuántos segundos) hacés cada cosa. Quedan en datos.cuentas y se suben cada tanto.
    contar(k, n = 1) { if (!s.me || !n) return; s.cuentas[k] = (s.cuentas[k] || 0) + n; save(); subirCuentas(); },
    record(k, n) { if (!s.me || (s.cuentas[k] || 0) >= n) return; s.cuentas[k] = n; save(); subirCuentas(); },
    cuentas(pid) { return pid === s.me || !pid ? s.cuentas : live ? (((s.cache.players[pid] || {}).datos || {}).cuentas || {}) : {}; },
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

    // ---------- más coleccionables ----------
    sobres() { return s.sobres || 0; },
    misRecuerdos() { return s.recuerdos || []; },
    // Abre un sobre: un recuerdo que no tengas (a veces, una rareza de la suerte). Si ya tenés todos, monedas.
    abrirSobre(items) {
      api.contar('sobres.abiertos');
      if (!(s.sobres > 0) || !items || !items.length) return null;
      s.sobres -= 1;
      const faltan = items.filter((x) => !s.recuerdos.includes(x.id));
      const raras = faltan.filter((x) => x.suerte != null), comunes = faltan.filter((x) => x.suerte == null);
      const pool = raras.length && (!comunes.length || Math.random() < D.COLECCION.sobres.suerte) ? raras : comunes;
      let it = null;
      if (pool.length) {
        it = pool[Math.floor(Math.random() * pool.length)];
        s.recuerdos.push(it.id);
        if (it.suerte) s.coins += it.suerte;
        if (it.mala) s.sobres += 1;
      } else s.coins += D.COLECCION.sobres.repetido;
      save(); pushMe();
      return it || { repetido: true };
    },
    visitar(pid) { api.contar('visitas'); if (!s.visitas.includes(pid)) { s.visitas.push(pid); save(); pushMe(); } },
    // Qué hiciste con cada persona: reaccionar a una foto suya, visitar su altarcito, regalarle algo.
    conAmigo(pid) {
      return {
        reac: Object.keys(s.reac).some((k) => k.startsWith(pid + '/')),
        visita: s.visitas.includes(pid),
        regalo: live ? s.cache.regalos.some((r) => r.de === s.me && r.para === pid) : false,
      };
    },
    misAmigos() { return s.amigos || []; },
    ganarAmigo(pid) {
      if (s.amigos.includes(pid)) return false;
      s.amigos.push(pid);
      const todos = D.PEOPLE.filter((p) => p.id !== s.me).every((p) => s.amigos.includes(p.id));
      if (todos && !s.ach['amigos:todos']) { s.ach['amigos:todos'] = 1; s.coins += D.COLECCION.amigos.premio; }
      save(); pushMe();
      return todos ? 'todos' : true;
    },

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
    // El Holandés Laburante: si alguien ya lo hundió hoy (mientras esté mirando el mar, no vuelve), y el premio de cada uno.
    hundioHoy(pid) {
      const ach = !pid || pid === s.me ? s.ach : live ? (((s.cache.players[pid] || {}).datos || {}).ach || {}) : {};
      return !!ach['barco:' + window.SKY.arDate()];
    },
    barcoPrimero() { return s.ach['barco:primero'] || null; },
    perdioHoy(pid) {
      const ach = !pid || pid === s.me ? s.ach : live ? (((s.cache.players[pid] || {}).datos || {}).ach || {}) : {};
      return !!ach['barcoPerdio:' + window.SKY.arDate()];
    },
    // El nivel del Holandés: en cuántos días distintos lo hundieron antes de hoy, con los datos de todos (si se escapa, no sube).
    nivelBarco() {
      const hoy = window.SKY.arDate(), dias = new Set();
      const mirar = (ach) => Object.keys(ach || {}).forEach((k) => { const m = k.match(/^barco:(\d{4}-\d{2}-\d{2})$/); if (m && m[1] < hoy) dias.add(m[1]); });
      mirar(s.ach);
      if (live) Object.values(s.cache.players).forEach((r) => mirar(((r || {}).datos || {}).ach));
      return dias.size;
    },
    // Se escapó: le roba 2 cosas compradas del altarcito (ni regalos, ni las únicas, ni mascotas) y 20 monedas, una vez por día.
    // La experiencia no se toca y lo robado sigue contando para el logro de coleccionista; se puede volver a comprar.
    robarBarco() {
      if (!s.me) return null;
      const hoy = window.SKY.arDate();
      if (s.ach['barcoPerdio:' + hoy]) return null;
      const real = (id) => (D.SHOP.some((x) => x.id === id) ? id : D.ALIAS[id]);
      const sePuede = (id) => { const it = D.SHOP.find((x) => x.id === real(id)); return it && !it.unico && !it.retirado && !(D.MASCOTAS || {})[it.id]; };
      const pueden = s.owned.map((id, i) => (id && sePuede(id) ? i : -1)).filter((i) => i >= 0), items = [];
      for (let k = 0; k < D.BARCO.roba && pueden.length; k++) {
        const i = pueden.splice(Math.floor(Math.random() * pueden.length), 1)[0], id = real(s.owned[i]);
        s.ach['compra:' + id] = 1; s.owned[i] = null; delete s.place['o' + i]; items.push(id);
      }
      const c = Math.min(D.BARCO.robaMonedas, Math.max(0, s.coins));
      s.coins -= c;
      s.ach['barcoPerdio:' + hoy] = items.join(',') || 'nada';
      api.contar('mar.robos');
      save(); pushMe();
      return { items, c };
    },
    // El premio crece con el nivel: 50 monedas más 10 por nivel, y un sobre.
    hundirBarco(nv = 0) {
      if (!s.me) return null;
      const hoy = window.SKY.arDate();
      if (s.ach['barco:' + hoy]) return null;
      const c = D.BARCO.c + D.BARCO.porNivel * nv;
      s.ach['barco:' + hoy] = 1; s.ach.barcos = (s.ach.barcos || 0) + 1;
      s.ach.barcoNivelMax = Math.max(s.ach.barcoNivelMax || 0, nv);
      s.coins += c; s.sobres = (s.sobres || 0) + D.BARCO.s;
      const primero = !s.ach['barco:primero'];
      if (primero) { s.ach['barco:primero'] = hoy; s.owned.push(D.BARCO.item); }
      api.contar('mar.hundidos');
      save(); pushMe();
      return { c, s: D.BARCO.s, primero };
    },
    // Lujos de Mirar el mar.
    achDe(pid) { return !pid || pid === s.me ? s.ach : live ? (((s.cache.players[pid] || {}).datos || {}).ach || {}) : {}; },
    cuentaDe(pid, k) { const c = !pid || pid === s.me ? s.cuentas : live ? (((s.cache.players[pid] || {}).datos || {}).cuentas || {}) : {}; return c[k] || 0; },
    setCartelAvioneta(t) { t = String(t || '').trim().slice(0, 40); if (t) s.ach.avioneta = t; else delete s.ach.avioneta; save(); pushMe(); },
    // el paquete del helicóptero: el primero que lo toca cobra 15 monedas (una vez por paquete)
    agarrarPaquete(c) { if (!s.me || s.ach['paquete:' + c]) return 0; s.ach['paquete:' + c] = 1; s.coins += 15; api.contar('mar.paquetes'); save(); pushMe(); return 15; },
    // el cofre maldito: una vez por día; monedas (10 a 40) o una gaviota en la cabeza por una hora
    abrirCofre() {
      const k = 'cofre:' + window.SKY.arDate();
      if (!s.me || s.ach[k]) return null;
      s.ach[k] = 1; api.contar('mar.cofres');
      let r;
      if (Math.random() < 0.6) { const c = 10 + Math.floor(Math.random() * 31); s.coins += c; r = { c }; } else { s.ach.maldicion = Date.now() + 3600e3; r = { maldicion: s.ach.maldicion }; }
      save(); pushMe();
      return r;
    },
    // el castillo de arena de todos: cuántas paladas puso cada uno hoy
    palada() { const k = 'castillo.' + window.SKY.arDate(); api.contar(k); return s.cuentas[k] || 0; },
    // Premios Colonia: el voto de cada uno por categoría (ach.voto:<cat>), el conteo con los votos de todos y el premio.
    votar(cat, id) { if (!s.me) return; s.ach['voto:' + cat] = id; save(); pushMe(); },
    voto(cat) { return s.ach['voto:' + cat] || null; },
    votos(cat) {
      const out = {};
      D.PEOPLE.forEach((p) => { const v = api.achDe(p.id)['voto:' + cat]; if (v) out[v] = (out[v] || 0) + 1; });
      return out;
    },
    cobrarPremio(cat) {
      if (!s.me || s.ach['premio:' + cat]) return 0;
      s.ach['premio:' + cat] = 1; s.coins += D.PREMIOS.c; save(); pushMe();
      return D.PREMIOS.c;
    },
    // Para el wrapped: las reacciones que puso cada uno y los regalos que hizo.
    reacDe(pid) { return reacDe(pid) || {}; },
    regalosDe(pid) { return (s.cache.regalos || []).filter((r) => r.de === (pid || s.me)); },
    salvavidas() { return s.ach.salvavidas || 0; },
    comprarSalvavidas() {
      if (!s.me || (s.ach.salvavidas || 0) >= D.SALVAVIDAS.max || s.coins < D.SALVAVIDAS.p) return false;
      s.coins -= D.SALVAVIDAS.p; s.ach.salvavidas = (s.ach.salvavidas || 0) + 1;
      api.contar('salvavidas.comprados');
      save(); pushMe();
      return true;
    },
    // Cápsula del tiempo: lo que escribió cada uno (se guarda en ach.capsula).
    capsula(pid) {
      const ach = !pid || pid === s.me ? s.ach : live ? (((s.cache.players[pid] || {}).datos || {}).ach || {}) : {};
      return ach.capsula || null;
    },
    escribirCapsula(t) {
      t = String(t || '').trim().slice(0, 500);
      if (!s.me) return;
      if (t) s.ach.capsula = { t, en: new Date().toISOString() }; else delete s.ach.capsula;
      save(); pushMe();
    },
    // Hora Colonia: quiénes subieron su foto dentro de los 5 minutos (y un poco más, por si tardó en subir).
    horaQuienes(dia, desde, hasta) {
      const mid = 'hora-' + dia, quienes = new Set();
      (s.cache.figs || []).forEach((f) => { if (f.mision === mid && f.creada) { const t = Date.parse(f.creada); if (t >= desde && t <= hasta) quienes.add(f.jugador); } });
      if (s.photos[mid] && s.ach['horaEn:' + dia] && s.ach['horaEn:' + dia] <= hasta) quienes.add(s.me);
      return quienes;
    },
    cobrarHora(dia, desde, hasta) {
      if (!s.me || s.ach['hora:' + dia]) return 0;
      const q = api.horaQuienes(dia, desde, hasta);
      if (!q.has(s.me) || q.size < D.HORA.minimo) return 0;
      s.ach['hora:' + dia] = 1; s.coins += D.HORA.c;
      save(); pushMe();
      return D.HORA.c;
    },
    // El brindis con la heladerita (3 o más a la vez): 5 monedas, una vez por día.
    brindar() {
      if (!s.me) return 0;
      const k = 'brindis:' + window.SKY.arDate();
      if (s.ach[k]) return 0;
      s.ach[k] = 1; s.coins += 5; api.contar('mar.brindis');
      save(); pushMe();
      return 5;
    },
    // El récord de la colonia en algo que cuenta cada uno (el más alto de todos).
    maxDeTodos(k) {
      let m = (s.cuentas || {})[k] || 0;
      if (live) Object.values(s.cache.players).forEach((r) => { m = Math.max(m, (((r || {}).datos || {}).cuentas || {})[k] || 0); });
      return m;
    },
    // La cola de sirena: una por día.
    sirenaHoy() { return !!s.ach['sirena:' + window.SKY.arDate()]; },
    atraparSirena() {
      if (!s.me || api.sirenaHoy()) return 0;
      s.ach['sirena:' + window.SKY.arDate()] = 1; s.coins += D.SIRENA;
      api.contar('mar.sirenas');
      save(); pushMe();
      return D.SIRENA;
    },
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
    desaprobadasDe(id) {
      const mids = id === s.me ? Object.keys(s.photos) : live ? s.cache.figs.filter((x) => x.jugador === id).map((x) => x.mision) : DEMO[id].done;
      return mids.filter((m) => api.desaprobada(id, m)).length;
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
      if (!first) api.contar('fotos.cambiadas');
      if (first) {
        s.ach['xp:' + mid] = xp; // para saber cuánto descontar si la desaprueban
        if (mid.startsWith('hora-')) s.ach['horaEn:' + mid.slice(5)] = Date.now(); // cuándo la subió (para el premio de la Hora Colonia)
        s.xp += xp; s.coins += 10; out.push({ xp, coins: 10 });
        // Cada 2 fotos de misiones, un sobre del baúl (se cuenta desde el 23/11, no hacia atrás).
        s.ach.fotosSobre = (s.ach.fotosSobre || 0) + 1;
        if (s.ach.fotosSobre >= 2) { s.ach.fotosSobre = 0; s.sobres = (s.sobres || 0) + 1; out.push({ sobre: 1 }); }
        const m = D.MISSIONS.find((x) => x.id === mid);
        if (m) {
          const all = D.MISSIONS.filter((x) => x.s === m.s);
          const key = 'serie-' + m.s;
          if (all.every((x) => s.photos[x.id]) && !s.ach[key]) { s.ach[key] = 1; s.coins += D.ACH.serie.c; out.push({ ach: 'serie', serie: m.s }); }
        }
      }
      const subio = levelOf(s.xp) - before;
      if (subio > 0) s.sobres = (s.sobres || 0) + subio;
      save(); pushMe(); uploadPending();
      return { out, levelUp: subio > 0 ? levelOf(s.xp) : null };
    },

    buy(item, to) {
      if (s.coins < item.p) return false;
      s.coins -= item.p;
      if (to && to !== s.me) {
        if (!s.ach.regalo) { s.ach.regalo = 1; s.coins += D.ACH.regalo.c; }
        s.ach.regalados = Math.max(api.regalosHechos(), s.ach.regalados || 0) + 1;
        const xpGanada = sumarXp(D.xpRegalo(item.p)); // regalar suma experiencia (comprar para vos, no)
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
        return xpGanada;
      }
      s.owned.push(item.id);
      api.contar('kiosco.compras'); api.contar('kiosco.gastado', item.p);
      s.ach['compra:' + item.id] = 1; // para el logro de coleccionista: cuenta cosas distintas, aunque después las vendas
      save(); pushMe();
      return 'o' + (s.owned.length - 1);
    },

    // ---------- logros por escalones (D.LOGROS) ----------
    // Regalos que hiciste: los de la base y, por si todavía no llegaron, los que anotó este celu.
    regalosHechos() { return Math.max(live ? s.cache.regalos.filter((r) => r.de === s.me).length : 0, s.ach.regalados || 0); },
    // Cuánto llevás en cada logro y cuánto es "todo" donde corresponde. baulTotal lo pasa la app (el baúl vive en el bucket).
    logroValor(id, baulTotal) {
      if (id === 'regalos') return api.regalosHechos();
      if (id === 'fotos') return Object.keys(s.photos).length;
      if (id === 'compras') return new Set(s.owned.filter(Boolean).concat(Object.keys(s.ach).filter((k) => k.startsWith('compra:')).map((k) => k.slice(7)))).size;
      if (id === 'racha') {
        const dias = [...diasConSalvavidas(s.days, s.ach)].sort();
        let mejor = 0, n = 0, prev = null;
        dias.forEach((d) => { n = prev && Date.parse(d) - Date.parse(prev) === 864e5 ? n + 1 : 1; mejor = Math.max(mejor, n); prev = d; });
        return Math.max(mejor, s.ach.rachaMax || 0);
      }
      if (id === 'dias') return Math.max(s.days.length, s.ach.diasMax || 0);
      if (id === 'reacciones') return Object.keys(s.reac).length;
      if (id === 'baul') return baulTotal ? Math.floor((100 * (s.recuerdos || []).length) / baulTotal) : 0;
      if (id === 'hallazgos') return api.hallazgos('botella').length + api.hallazgos('galleta').length;
      if (id === 'visitas') return (s.visitas || []).filter((p) => p !== s.me).length;
      if (id === 'juntos') return Object.keys(s.ach).filter((k) => k.startsWith('juntos:')).length;
      if (id === 'barcos') return s.ach.barcos || 0;
      if (id === 'nivelBarco') return s.ach.barcoNivelMax || 0;
      return 0;
    },
    // 'todo': todos los altarcitos de los demás, o todo el kiosco (sin la sombrilla ni la carpa, que no se pueden tener juntas).
    logroMeta(id, m) {
      if (m !== 'todo') return m;
      return id === 'visitas' ? D.PEOPLE.length - 1 : D.SHOP.filter((x) => !x.retirado && !x.unico && x.side !== 'R').length;
    },
    logros(baulTotal) {
      return D.LOGROS.map((l) => {
        const v = api.logroValor(l.id, baulTotal);
        const pasos = l.pasos.map((p, i) => ({ meta: api.logroMeta(l.id, p[0]), todo: p[0] === 'todo', c: p[1] || 0, s: p[2] || 0, ok: !!s.ach['logro:' + l.id + ':' + i] }));
        return Object.assign({}, l, { v, pasos });
      });
    },
    // Cobra los escalones a los que ya llegaste y todavía no cobraste. Devuelve la lista de lo nuevo.
    cobrarLogros(baulTotal) {
      if (!s.me) return [];
      const nuevos = [];
      s.ach.rachaMax = Math.max(s.ach.rachaMax || 0, api.logroValor('racha'));
      s.ach.diasMax = Math.max(s.ach.diasMax || 0, s.days.length);
      api.logros(baulTotal).forEach((l) => l.pasos.forEach((p, i) => {
        if (p.ok || l.v < p.meta || (l.id === 'baul' && !baulTotal)) return;
        s.ach['logro:' + l.id + ':' + i] = 1;
        s.coins += p.c; s.sobres = (s.sobres || 0) + p.s;
        nuevos.push({ l, i, meta: p.meta, todo: p.todo, c: p.c, s: p.s });
      }));
      if (nuevos.length) { save(); pushMe(); }
      return nuevos;
    },

    // Corre al entrar: entrada del día, racha, noctámbulo y premio matutino (primera persona del día desde las 5).
    dailyCheck() {
      const today = window.SKY.arDate();
      const min = window.SKY.arMinute();
      const got = [];
      const give = (k) => { s.coins += D.ACH[k].c; s.ach[k + ':' + today] = 1; got.push(k); };
      if (!s.ach['sobres:inicio']) { s.ach['sobres:inicio'] = 1; s.sobres = (s.sobres || 0) + D.COLECCION.sobres.inicio; pushMe(); }
      if (!s.days.includes(today)) {
        usarSalvavidas(today);
        s.days.push(today);
        s.sobres = (s.sobres || 0) + 1;
        give('entrada');
        if (min < 300) give('noctambulo');
        const streak = api.streak();
        if (streak === 2) give('racha2');
        if (streak >= 3) give('racha3');
        const xpRacha = D.RACHA.xp[Math.min(streak, 5)];
        api.rachaHoy = xpRacha ? Object.assign({ dias: streak }, sumarXp(xpRacha)) : null;
      }
      if (min >= 300 && s.am !== today) {
        s.am = today;
        const someoneBefore = live
          ? Object.values(s.cache.players).some((p) => p.id !== s.me && p.datos && p.datos.am === today)
          : min >= 540;
        if (!someoneBefore) give('matutino');
      }
      save(); if (got.length || api.rachaHoy) pushMe();
      return got;
    },
    streak() {
      const set = diasConSalvavidas(s.days, s.ach);
      let n = 0;
      const d = window.SKY.arNow();
      while (set.has(d.toISOString().slice(0, 10))) { n++; d.setUTCDate(d.getUTCDate() - 1); }
      return n;
    },

    // Días seguidos que lleva entrando. Si hoy todavía no entró, cuenta desde ayer: la racha sigue viva hasta que pase un día entero sin entrar.
    rachaDe(pid) {
      const days = pid === s.me ? s.days : live ? ((others()[pid] || {}).datos || {}).days || [] : (DEMO[pid] || {}).days || [];
      const ach = pid === s.me ? s.ach : live ? ((others()[pid] || {}).datos || {}).ach || {} : {};
      const set = diasConSalvavidas(days, ach), d = window.SKY.arNow();
      if (!set.has(d.toISOString().slice(0, 10))) d.setUTCDate(d.getUTCDate() - 1);
      let n = 0;
      while (set.has(d.toISOString().slice(0, 10))) { n++; d.setUTCDate(d.getUTCDate() - 1); }
      return n;
    },
    fotosParaSobre() { return s.ach.fotosSobre || 0; },
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
