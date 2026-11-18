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

  const blank = () => ({ me: null, xp: 0, coins: 0, photos: {}, owned: [], place: {}, gifts: [], days: [], ach: {}, secretSeen: false, am: null,
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
        s.owned = d.owned || []; s.place = d.place || {}; s.days = d.days || []; s.ach = d.ach || {}; s.secretSeen = !!d.secretSeen; s.am = d.am || null;
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
        s.cache.regalos.push(p.new); save(); emit();
        if (p.new.para === s.me) listeners.forEach((f) => f({ gift: p.new }));
      })
      .subscribe();
  }

  let pushT;
  function pushMe() {
    if (!client || !s.me) return;
    clearTimeout(pushT);
    pushT = setTimeout(async () => {
      const datos = { v: 1, owned: s.owned, place: s.place, days: s.days.slice(-40), ach: s.ach, secretSeen: s.secretSeen, am: s.am };
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
    if (!live) return;
    try {
      await Promise.race([
        (async () => {
          await loadLib();
          client = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, { auth: { persistSession: false } });
          await pull();
          subscribe();
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

  const api = {
    live, ready,
    onChange(f) { listeners.push(f); },
    faceUrl(id) { return C.supabaseUrl ? pub('caras/' + id + '.webp') : 'img/caras/' + id + '.webp'; },
    get me() { return s.me; },
    setMe(id) {
      s.me = id;
      const row = s.cache.players[id];
      if (row && row.datos && row.datos.v) { s.xp = row.xp; s.coins = row.monedas; s.owned = row.datos.owned || []; s.place = row.datos.place || {}; s.days = row.datos.days || []; s.ach = row.datos.ach || {}; s.secretSeen = !!row.datos.secretSeen; s.am = row.datos.am || null; }
      s.cache.figs.filter((x) => x.jugador === id).forEach((x) => { s.photos[x.mision] = pub(x.foto); });
      save();
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

    // ---------- altar playero ----------
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
      const items = owned.map((id, i) => ({ k: 'o' + i, id: fix(id) }))
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
    secretSeen() { return s.secretSeen; },
    seeSecret() { s.secretSeen = true; save(); pushMe(); },

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
        if (client) client.from('regalos').insert({ de: s.me, para: to, item: item.id }).then(({ error }) => { if (error) console.warn(error); });
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
