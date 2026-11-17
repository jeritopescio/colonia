/* Pantallas de Colonia. Prototipo: datos en el dispositivo, los demás con progreso de ejemplo. */
(function () {
  const D = window.DATA, S = window.STORE, SKY = window.SKY;
  const DEMO = !S.live;                                   // datos de ejemplo
  const PROTO = DEMO || /(^|[?&])probar(&|=|$)/.test(location.search); // panel para probar el cielo
  const $ = (q, el = document) => el.querySelector(q);
  const screen = $('#screen');
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const person = (id) => D.PEOPLE.find((p) => p.id === id);
  const face = (id) => S.faceUrl(id);
  const hash = (str) => { let h = 7; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  let carpaOverride = null;

  // ---------- íconos dibujados ----------
  const IC = {
    hoy: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.2 5.2l1.8 1.8M17 17l1.8 1.8M5.2 18.8 7 17M17 7l1.8-1.8"/></svg>',
    misiones: '<svg viewBox="0 0 24 24"><path d="M4 8h3l1.6-2.4h6.8L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.6"/></svg>',
    album: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>',
    tienda: '<svg viewBox="0 0 24 24"><path d="M4 9h16l-1.4 11H5.4z"/><path d="M8.5 9V7a3.5 3.5 0 0 1 7 0v2"/></svg>',
    carpa: '<svg viewBox="0 0 24 24"><path d="M3 10h18M5 10l2-5h10l2 5M5 10v10M19 10v10M9 10v10M15 10v10M3 20h18"/></svg>',
    camara: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l1.6-2.4h6.8L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.6"/></svg>',
  };
  const TABS = [['hoy', 'Hoy'], ['misiones', 'Misiones'], ['album', 'Álbum'], ['tienda', 'Tienda'], ['carpa', 'Carpa']];

  // ---------- carpa de balneario ----------
  function carpaSVG(progress) {
    const n = Math.floor(progress * D.CARPA.pieces.length + 1e-6);
    const g = (i, body) => `<g class="${i < n ? '' : 'ghost'}">${body}</g>`;
    const scallops = Array.from({ length: 10 }, (_, i) => `M${60 + i * 20},95 a10,10 0 0 0 20,0`).join(' ');
    const lights = Array.from({ length: 9 }, (_, i) => { const t = (i + 1) / 10, x = 72 + t * 176, y = 108 + Math.sin(Math.PI * t) * 24; return `<circle cx="${x}" cy="${y}" r="3.6" fill="${['#ffe39a', '#f7b3c6', '#b6e5cd', '#a9d6f0'][i % 4]}" stroke="#43365a" stroke-width="1.5"/>`; }).join('');
    return `<svg viewBox="0 0 320 230" role="img" aria-label="Carpa de balneario armada al ${Math.round(progress * 100)} por ciento">
      <g filter="url(#crayon)" stroke="#43365a" stroke-width="2.5" stroke-linejoin="round">
        <rect x="0" y="196" width="320" height="34" fill="#f4e3c5" stroke="none"/>
        ${g(0, '<rect x="70" y="95" width="5" height="102" fill="#9b7b62"/><rect x="245" y="95" width="5" height="102" fill="#9b7b62"/><rect x="104" y="95" width="4" height="102" fill="#b89a82"/><rect x="212" y="95" width="4" height="102" fill="#b89a82"/>')}
        ${g(1, '<polygon points="58,95 262,95 240,52 80,52" fill="url(#rayas)"/>')}
        ${g(2, `<path d="${scallops}" fill="#f6a38f"/>`)}
        ${g(3, '<polygon points="75,100 104,100 98,196 75,196" fill="url(#rayas2)"/><polygon points="245,100 216,100 222,196 245,196" fill="url(#rayas2)"/>')}
        ${g(4, '<path d="M160 52V20" fill="none"/><polygon points="160,20 188,28 160,36" fill="#ffe39a"/>')}
        ${g(5, '<polygon points="112,196 140,196 150,170 124,170" fill="#b6e5cd"/><path d="M124 170l-10-16" fill="none"/><polygon points="180,196 208,196 218,170 192,170" fill="#b6e5cd"/><path d="M192 170l-10-16" fill="none"/>')}
        ${g(6, '<path d="M286 198V112" fill="none"/><path d="M254 116 Q286 74 318 116 Z" fill="url(#rayas3)"/>')}
        ${g(7, '<rect x="150" y="176" width="26" height="20" rx="3" fill="#a9d6f0"/><rect x="148" y="171" width="30" height="7" rx="3" fill="#fffaf1"/>')}
        ${g(8, `<path d="M72 108 Q160 136 248 108" fill="none"/>${lights}`)}
        ${g(9, '<rect x="6" y="140" width="58" height="26" rx="4" fill="#fffaf1"/><path d="M35 166v30" fill="none"/><text x="35" y="158" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="11" fill="#43365a" stroke="none">COLONIA</text>')}
      </g></svg>`;
  }
  const carpaProgress = () => carpaOverride ?? Math.min(1, S.groupXp() / D.CARPA.goal);

  // ---------- helpers de juego ----------
  function daily() {
    const d = SKY.arDate();
    const trip = D.DAILY_TRIP[d];
    return { id: 'dia-' + d, s: 'dia', t: trip || D.DAILY_POOL[hash(d) % D.DAILY_POOL.length], xp: trip ? 40 : 20 };
  }
  const secret = () => ({ id: 'secreta', s: 'secreta', t: D.SECRETS[hash(S.me || 'x') % D.SECRETS.length], xp: 60 });
  function countdown() {
    const today = SKY.arDate();
    const days = Math.round((Date.parse(SKY.TRIP.from) - Date.parse(today)) / 864e5);
    if (days > 0) return { big: days, small: days === 1 ? 'día para la costa' : 'días para la costa' };
    if (today <= SKY.TRIP.to) return { big: 'Día ' + (1 - days), small: 'de colonia en Costa Esmeralda' };
    return { big: '♡', small: 'la colonia ya volvió' };
  }
  function weatherLine(st) {
    const w = st.weather;
    const parts = [st.place.name];
    if (w) parts.push(`${w.temp}°`);
    parts.push(st.kind);
    const sunTxt = st.minute < st.sun.set && st.minute > st.sun.rise ? `el sol se pone ${SKY.fmt(st.sun.set)}` : `el sol sale ${SKY.fmt(st.sun.rise)}`;
    return parts.join(' · ') + ' · ' + sunTxt;
  }
  const level = (xp) => { const i = S.levelOf(xp); const cur = D.LEVELS[i], next = D.LEVELS[i + 1]; return { i, n: cur.n, pct: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1, next }; };

  // ---------- avisos ----------
  function toast(html, ms = 3200) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<div class="card">${html}</div>`;
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), ms);
  }
  function sheet(html, onMount) {
    const bg = document.createElement('div');
    bg.className = 'sheet-bg';
    bg.innerHTML = `<div class="sheet card pop">${html}</div>`;
    bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-close]')) bg.remove(); });
    document.body.appendChild(bg);
    onMount && onMount(bg);
    return bg;
  }

  // ---------- fotos ----------
  let pending = null;
  function askPhoto(m) { pending = m; $('#file').value = ''; $('#file').click(); }
  $('#file').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f || !pending) return;
    const m = pending; pending = null;
    try {
      const url = await squareImage(f, 480);
      const res = S.addPhoto(m.id, url, m.xp);
      showReward(m, url, res);
    } catch (err) {
      toast('<span>No pude leer esa foto. Probá con otra.</span>');
    }
  });
  function squareImage(file, size) {
    return new Promise((ok, fail) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = c.height = size;
        const s = Math.min(img.naturalWidth, img.naturalHeight);
        c.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);
        URL.revokeObjectURL(img.src);
        ok(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = fail;
      img.src = URL.createObjectURL(file);
    });
  }
  function showReward(m, url, res) {
    const r = res.out[0];
    const serie = res.out.find((o) => o.ach === 'serie');
    sheet(`<div class="reward" style="display:grid;gap:12px;justify-items:center">
      <div class="eyebrow">¡Figurita nueva!</div>
      <div class="polaroid pop"><img src="${url}" alt=""></div>
      <h2>${esc(m.t)}</h2>
      ${r ? `<div class="row" style="justify-content:center"><span class="chip" style="--c:var(--mint)">+${r.xp} XP</span><span class="chip" style="--c:var(--butter)">+${r.coins} <span class="coin"></span></span></div>` : '<p class="muted small">Cambiaste la foto de esta misión.</p>'}
      ${res.levelUp != null ? `<p><b>Subiste de nivel:</b> ahora sos ${esc(D.LEVELS[res.levelUp].n)}.</p>` : ''}
      ${serie ? `<p><b>Serie completa:</b> ${esc(D.SERIES.find((x) => x.id === serie.serie).n)}. +${D.ACH.serie.c} monedas y medallita.</p>` : ''}
      <p class="muted small">Esto también suma a la carpa de todos.</p>
      <button class="btn" data-close>Seguir</button></div>`);
    render();
  }

  // ---------- pantallas ----------
  function top() {
    const st = SKY.state(), L = level(S.xp);
    return `<header class="top"><img class="face" src="${face(S.me)}" alt="">
      <div class="who"><b>${esc(person(S.me).n)}</b><span class="on-sky-soft small">${esc(L.n)} · nivel ${L.i + 1}</span></div>
      <span class="chip" style="--c:var(--butter)">${S.coins} <span class="coin"></span></span></header>
      <div class="weather small">${esc(weatherLine(st))}</div>`;
  }

  function mRow(m, extra = '') {
    const ph = S.photo(m.id);
    return `<button class="mis" data-m="${m.id}">${ph ? `<img class="thumb" src="${ph}" alt="">` : `<span class="thumb empty">${IC.camara}</span>`}
      <span class="t">${esc(m.t)}${extra ? `<small>${extra}</small>` : ''}</span>
      <span class="chip" style="--c:${ph ? 'var(--mint)' : 'var(--paper)'}">${ph ? 'hecha' : '+' + m.xp}</span></button>`;
  }
  const allMissions = () => [daily(), D.DUO, secret(), ...D.MISSIONS];
  function bindMissions(root) {
    root.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => {
      const m = allMissions().find((x) => x.id === b.dataset.m);
      const ph = S.photo(m.id);
      if (!ph) return askPhoto(m);
      sheet(`<div style="display:grid;gap:12px;justify-items:center;text-align:center">
        <div class="polaroid"><img src="${ph}" alt=""></div><h2>${esc(m.t)}</h2>
        <div class="row" style="justify-content:center"><button class="btn ghost" data-redo>Cambiar foto</button><button class="btn" data-close>Listo</button></div></div>`,
      (bg) => bg.querySelector('[data-redo]').addEventListener('click', () => { bg.remove(); askPhoto(m); }));
    }));
  }

  const SCREENS = {
    portada() {
      const st = SKY.state(), c = countdown();
      screen.innerHTML = `<section class="cover">
        <div class="eyebrow on-sky-soft">temporada 26/27</div>
        <h1>Colonia</h1>
        <div class="sub">Costa Esmeralda · 4 al 8 de diciembre</div>
        <button class="umbrella" id="enter" aria-label="Entrar">
          <svg viewBox="0 0 170 150" width="168" height="150"><g filter="url(#crayon)" stroke="#43365a" stroke-width="3" stroke-linejoin="round">
            <path d="M85 40V140" fill="none"/><path d="M85 140q0 8 -9 8" fill="none"/>
            <path d="M10 70 Q85 -6 160 70 Z" fill="url(#rayas)"/>
            <path d="M10 70 q12.5 10 25 0 q12.5 10 25 0 q12.5 10 25 0 q12.5 10 25 0 q12.5 10 25 0 q12.5 10 25 0" fill="#f6a38f"/>
            <circle cx="85" cy="30" r="5" fill="#ffe39a"/></g></svg>
        </button>
        <div class="on-sky">tocá la sombrilla para entrar</div>
        <div class="chip" style="--c:var(--paper)"><b>${c.big}</b>&nbsp;${c.small}</div>
        <div class="weather small">${esc(weatherLine(st))}</div>
      </section>`;
      $('#enter').addEventListener('click', () => go(S.me ? 'hoy' : 'quien'));
    },

    quien() {
      const grid = (arr) => arr.map((p) => `<button class="pick" data-p="${p.id}"><img class="face" src="${face(p.id)}" alt=""><span>${esc(p.n)}</span>${S.usedElsewhere(p.id) ? '<span class="small muted">ya entró</span>' : ''}</button>`).join('');
      screen.innerHTML = `<h1 class="on-sky" style="font-size:2rem">¿Quién sos?</h1>
        <p class="on-sky-soft" style="margin:0">Se elige una sola vez. Este celu se va a acordar de vos.</p>
        <div class="card"><div class="eyebrow">Van a la costa</div><div class="faces five">${grid(D.PEOPLE.filter((p) => p.trip))}</div></div>
        <div class="card"><div class="eyebrow">Juegan a distancia</div><div class="faces">${grid(D.PEOPLE.filter((p) => !p.trip))}</div></div>`;
      screen.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => {
        const p = person(b.dataset.p);
        sheet(`<div style="display:grid;gap:12px;justify-items:center;text-align:center">
          <img class="face" src="${face(p.id)}" alt="" style="width:110px;height:110px">
          <h2>¿Sos ${esc(p.n)}?</h2><p class="muted" style="margin:0">Después no se puede cambiar desde este celu.</p>
          <div class="row" style="justify-content:center"><button class="btn ghost" data-close>No</button><button class="btn" id="yes" style="--c:var(--mint)">Sí, soy yo</button></div></div>`,
        (bg) => bg.querySelector('#yes').addEventListener('click', () => { S.setMe(p.id); bg.remove(); go('hoy'); setTimeout(welcome, 300); }));
      }));
    },

    hoy() {
      const d = daily(), L = level(S.xp), c = countdown(), prog = carpaProgress(), me = person(S.me);
      const sec = secret();
      screen.innerHTML = `${top()}
        <div class="card"><div class="spread"><div class="eyebrow">Misión del día</div><span class="chip">${c.big} ${esc(c.small)}</span></div>
          <div class="list">${mRow(d, 'Subí la foto y queda hecha')}</div></div>
        <div class="card"><div class="spread"><div class="eyebrow">Tu libreta</div><span class="small muted">racha: ${S.streak()} ${S.streak() === 1 ? 'día' : 'días'}</span></div>
          <div class="spread"><b style="font-family:var(--display)">${esc(L.n)}</b><span class="small muted">${S.xp} XP${L.next ? ' · faltan ' + (L.next.xp - S.xp) : ''}</span></div>
          <div class="bar"><i style="width:calc(${Math.round(L.pct * 100)}% - 4px)"></i></div></div>
        <a href="#carpa" class="card carpa" style="color:inherit;text-decoration:none"><div class="spread"><div class="eyebrow">La carpa de la colonia</div><b>${Math.round(prog * 100)}%</b></div>${carpaSVG(prog)}
          <span class="small muted">Se arma con lo que hacemos entre todos.</span></a>
        <div class="card dark"><div class="eyebrow">Tu misión secreta</div>
          ${S.secretSeen() ? `<div class="list">${mRow(sec, 'No se la muestres a nadie')}</div>` : `<div class="secret-cover"><span class="muted">Solo vos podés verla.${me.trip ? '' : ' Vale desde donde estés.'}</span><button class="btn" id="seeSecret" style="--c:var(--lav)">Ver mi misión secreta</button></div>`}</div>`;
      bindMissions(screen);
      const b = $('#seeSecret'); if (b) b.addEventListener('click', () => { S.seeSecret(); render(); });
    },

    misiones() {
      const me = person(S.me);
      const groups = D.SERIES.filter((s) => s.id !== 'dia').map((s) => `<div class="card"><div class="eyebrow">${esc(s.n)}</div><div class="list">${D.MISSIONS.filter((m) => m.s === s.id).map((m) => mRow(m)).join('')}</div></div>`).join('');
      const achs = Object.entries(D.ACH).map(([k, a]) => `<span class="chip" style="--c:var(--paper)">${esc(a.t)} · +${a.c} <span class="coin"></span></span>`).join('');
      screen.innerHTML = `${top()}
        <h1 class="on-sky" style="font-size:1.7rem">Misiones</h1>
        <p class="on-sky-soft" style="margin:0">Cada una se cumple subiendo la foto que pide.${me.trip ? '' : ' Las podés hacer desde donde estés.'}</p>
        <div class="card"><div class="eyebrow">Hoy</div><div class="list">${mRow(daily())}${mRow(D.DUO, 'De a dos')}</div></div>
        ${groups}
        <div class="card"><div class="eyebrow">Logros que llegan solos</div><p class="small muted" style="margin:0">No hay que hacer nada: la app los da cuando pasa.</p><div class="row">${achs}</div></div>`;
      bindMissions(screen);
    },

    album() {
      const medal = (on) => `<svg class="medal" viewBox="0 0 46 46"><g filter="url(#crayon)" stroke="#43365a" stroke-width="2.2"><path d="M15 3l8 14 8-14" fill="${on ? '#a9d6f0' : 'none'}"/><circle cx="23" cy="28" r="14" fill="${on ? '#ffe39a' : '#fffaf1'}" stroke-dasharray="${on ? '0' : '4 4'}"/><path d="M23 20l2.4 5 5.4.6-4 3.7 1.1 5.3-4.9-2.7-4.9 2.7 1.1-5.3-4-3.7 5.4-.6z" fill="${on ? '#f6a38f' : 'none'}"/></g></svg>`;
      const dias = Object.keys(S.photos()).filter((k) => k.startsWith('dia-')).sort();
      const series = D.SERIES.map((s) => {
        const ms = s.id === 'dia' ? dias.map((id) => ({ id, t: 'Del ' + id.slice(-2) + '/' + id.slice(9, 11) })) : D.MISSIONS.filter((m) => m.s === s.id);
        if (s.id === 'dia' && !ms.length) return '';
        const done = ms.filter((m) => S.photo(m.id)).length;
        const full = s.id !== 'dia' && done === ms.length;
        return `<div class="card"><div class="spread"><div><h2>${esc(s.n)}</h2><span class="small muted">${done} de ${ms.length} figuritas</span></div>${s.id === 'dia' ? '' : medal(full)}</div>
          <div class="slots">${ms.map((m) => { const ph = S.photo(m.id); const n = s.id === 'dia' ? 0 : S.doneBy(m.id).length;
            return `<button class="slot" data-a="${m.id}" aria-label="${esc(m.t)}">${ph ? `<img src="${ph}" alt="">` : `<span class="ph">${esc(m.t)}</span>`}${n ? `<span class="chip n" style="--c:var(--paper)">${n}/13</span>` : ''}</button>`; }).join('')}</div></div>`;
      }).join('');
      screen.innerHTML = `${top()}<h1 class="on-sky" style="font-size:1.7rem">Álbum</h1>
        <p class="on-sky-soft" style="margin:0">Tus figuritas. Tocá una para ver las de todos.</p>${series}
        ${DEMO ? '<p class="proto">Modo demo: las fotos de los demás son de ejemplo.</p>' : ''}`;
      screen.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
        const id = b.dataset.a;
        const m = D.MISSIONS.find((x) => x.id === id) || { id, t: 'Misión del día' };
        const who = new Set(S.doneBy(id).map((p) => p.id));
        const strip = D.PEOPLE.map((p) => {
          const mine = p.id === S.me && S.photo(id);
          const theirs = !mine && S.photoOf(p.id, id);
          const inner = mine ? `<img class="sq" src="${mine}" alt="">` : theirs ? `<img class="sq" src="${theirs}" alt="" loading="lazy">` : who.has(p.id) ? `<img class="sq" src="${face(p.id)}" alt="" style="filter:saturate(.5) sepia(.25)">` : '<span class="sq no"></span>';
          return `<figure>${inner}<figcaption>${esc(p.n)}</figcaption></figure>`;
        }).join('');
        sheet(`<div style="display:grid;gap:12px"><h2>${esc(m.t)}</h2><div class="strip">${strip}</div>
          ${DEMO ? '<p class="small muted" style="margin:0">En modo demo, las fotos de los demás se muestran con su cara.</p>' : ''}
          <div class="row" style="justify-content:flex-end">${S.photo(id) ? '' : `<button class="btn" id="go" style="--c:var(--mint)">Subir la mía</button>`}<button class="btn ghost" data-close>Cerrar</button></div></div>`,
        (bg) => { const g = bg.querySelector('#go'); if (g) g.addEventListener('click', () => { bg.remove(); askPhoto(m); }); });
      }));
    },

    tienda() {
      const L = S.level();
      const cell = (it) => {
        const locked = it.lv > L + 1;
        return `<button class="item${locked ? ' locked' : ''}" data-i="${it.id}" ${locked ? 'aria-disabled="true"' : ''}>
          <span class="ic" style="--c:${it.side === 'A' ? 'var(--paper)' : 'rgba(255,255,255,.08)'}">${it.e}</span>
          <span>${esc(it.n)}</span><span class="small">${locked ? 'nivel ' + it.lv : it.p + ' <span class="coin"></span>'}</span></button>`;
      };
      const mine = S.owned().map((id) => D.SHOP.find((x) => x.id === id).e).join('');
      const gifts = S.gifts().map((g) => `<div class="row small"><img class="face" src="${face(g.from)}" alt="" style="width:28px;height:28px"> ${esc(person(g.from).n)} te regaló ${D.SHOP.find((x) => x.id === g.item).e} ${esc(D.SHOP.find((x) => x.id === g.item).n.toLowerCase())}</div>`).join('');
      screen.innerHTML = `${top()}<h1 class="on-sky" style="font-size:1.7rem">Kiosco</h1>
        <div class="card"><div class="eyebrow">Tus cosas</div>${mine ? `<div class="mine">${mine}</div>` : ''}${gifts}${!mine && !gifts ? '<span class="muted">Todavía nada.</span>' : ''}<span class="small muted">Las monedas salen de entrar a la app y cumplir misiones.</span></div>
        <div class="card"><div class="eyebrow">Lado A</div><div class="shop">${D.SHOP.filter((x) => x.side === 'A').map(cell).join('')}</div></div>
        <div class="card dark"><div class="eyebrow">Lado B</div><div class="shop">${D.SHOP.filter((x) => x.side === 'B').map(cell).join('')}</div></div>`;
      screen.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => {
        const it = D.SHOP.find((x) => x.id === b.dataset.i);
        if (it.lv > S.level() + 1) return toast(`<span>${esc(it.n)} se desbloquea en el nivel ${it.lv}.</span>`);
        const can = S.coins >= it.p;
        const others = D.PEOPLE.filter((p) => p.id !== S.me);
        sheet(`<div style="display:grid;gap:12px;justify-items:center;text-align:center">
          <span style="font-size:3rem">${it.e}</span><h2>${esc(it.n)}</h2><span class="chip" style="--c:var(--butter)">${it.p} <span class="coin"></span></span>
          ${can ? `<div class="row" style="justify-content:center"><button class="btn" id="forMe" style="--c:var(--mint)">Para mí</button><button class="btn" id="gift" style="--c:var(--rose)">Regalar</button></div>
            <div id="giftTo" hidden><p class="small muted" style="margin:0 0 8px">¿A quién?</p><div class="faces" style="grid-template-columns:repeat(4,1fr)">${others.map((p) => `<button class="pick" data-to="${p.id}"><img class="face" src="${face(p.id)}" alt="" style="width:52px;height:52px"><span class="small">${esc(p.n)}</span></button>`).join('')}</div></div>`
            : `<p class="muted" style="margin:0">Te faltan ${it.p - S.coins} monedas.</p>`}
          <button class="btn ghost" data-close>Cerrar</button></div>`,
        (bg) => {
          const done = (to) => { if (S.buy(it, to)) { bg.remove(); toast(to ? `<span style="font-size:1.4rem">${it.e}</span><span>Le regalaste ${esc(it.n.toLowerCase())} a ${esc(person(to).n)}.</span>` : `<span style="font-size:1.4rem">${it.e}</span><span>${esc(it.n)} ya está en tus cosas.</span>`); render(); } };
          const fm = bg.querySelector('#forMe'); if (fm) fm.addEventListener('click', () => done(null));
          const gf = bg.querySelector('#gift'); if (gf) gf.addEventListener('click', () => { bg.querySelector('#giftTo').hidden = false; });
          bg.querySelectorAll('[data-to]').forEach((x) => x.addEventListener('click', () => done(x.dataset.to)));
        });
      }));
    },

    carpa() {
      const prog = carpaProgress();
      const n = Math.floor(prog * D.CARPA.pieces.length + 1e-6);
      const hitos = D.CARPA.hitos.map((h) => `<div class="hito${prog >= h.at ? ' done' : ''}"><span class="dot">${prog >= h.at ? '✓' : h.fecha.length < 6 ? h.fecha : '★'}</span>
        <span><b>${esc(h.t)}</b> · ${esc(h.d)}<br><span class="small muted">${prog >= h.at ? 'Desbloqueado' : 'Se desbloquea con la carpa al ' + Math.round(h.at * 100) + '%'}</span></span></div>`).join('');
      const people = D.PEOPLE.map((p) => { const L = level(S.xpOf(p.id)); return `<div class="mate"><img class="face" src="${face(p.id)}" alt=""><span><b>${esc(p.n)}</b><br><span class="small muted">${esc(L.n)}${p.trip ? '' : ' · a distancia'}</span></span></div>`; }).join('');
      screen.innerHTML = `${top()}<h1 class="on-sky" style="font-size:1.7rem">La carpa</h1>
        <p class="on-sky-soft" style="margin:0">Cada figurita, de cualquiera, suma. Entre todos armamos la carpa antes de volver a La Plata.</p>
        <div class="card carpa"><div class="spread"><b style="font-family:var(--display);font-size:1.4rem">${Math.round(prog * 100)}%</b><span class="small muted">${n} de ${D.CARPA.pieces.length} partes</span></div>
          ${carpaSVG(prog)}
          <div class="row small">${D.CARPA.pieces.map((p, i) => `<span class="chip" style="--c:${i < n ? 'var(--mint)' : 'var(--paper)'}">${esc(p)}</span>`).join('')}</div></div>
        <div class="card"><div class="eyebrow">Lo que destraba</div>${hitos}</div>
        <div class="card"><div class="eyebrow">La colonia</div><div class="people">${people}</div></div>
        ${DEMO ? '<p class="proto">Modo demo: el progreso de los demás es de ejemplo.</p>' : ''}`;
    },
  };

  // ---------- bienvenida diaria ----------
  function welcome() {
    const got = S.dailyCheck();
    got.forEach((k, i) => setTimeout(() => toast(`<span class="chip" style="--c:var(--butter)">+${D.ACH[k].c} <span class="coin"></span></span><span>${esc(D.ACH[k].t)}</span>`), i * 700));
    if (got.length) setTimeout(render, got.length * 700);
  }

  // ---------- navegación ----------
  function go(r) { if (location.hash === '#' + r) render(); else location.hash = r; }
  function render() {
    let r = location.hash.slice(1) || 'portada';
    if (!SCREENS[r]) r = 'portada';
    if (r !== 'portada' && r !== 'quien' && !S.me) r = 'quien';
    if (r === 'quien' && S.me) r = 'hoy';
    SCREENS[r]();
    const tabs = $('#tabs');
    tabs.hidden = !S.me || r === 'portada';
    tabs.innerHTML = TABS.map(([k, l]) => `<a href="#${k}" class="${k === r ? 'on' : ''}" ${k === r ? 'aria-current="page"' : ''}>${IC[k]}<span>${l}</span></a>`).join('');
    const dev = $('#devbtn'); if (dev) dev.hidden = r === 'portada';
  }
  addEventListener('hashchange', () => { render(); scrollTo(0, 0); });
  SKY.onChange(() => { const r = location.hash.slice(1); if (r === 'portada' || r === '' || r === 'hoy') { const w = document.querySelectorAll('.weather'); w.forEach((el) => (el.textContent = weatherLine(SKY.state()))); } });

  // ---------- panel para probar el cielo (solo prototipo) ----------
  if (PROTO) {
    const b = document.createElement('button');
    b.className = 'btn devbtn'; b.id = 'devbtn'; b.textContent = 'probar cielo'; b.style.setProperty('--c', 'var(--lav)');
    document.body.appendChild(b);
    b.addEventListener('click', () => {
      const st = SKY.state();
      const kinds = ['auto', 'despejado', 'algo nublado', 'nublado', 'niebla', 'llovizna', 'lluvia', 'tormenta', 'ventoso'];
      sheet(`<div class="dev" style="display:grid;gap:14px">
        <h2>Probar el cielo</h2>
        <label>Hora: <b id="hv">${SKY.fmt(st.minute)}</b><input type="range" id="hr" min="0" max="1439" step="5" value="${Math.round(st.minute)}"></label>
        <label>Clima <select id="kd">${kinds.map((k) => `<option ${SKY.override.kind === k || (!SKY.override.kind && k === 'auto') ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
        <label>Carpa: <b id="cv">${Math.round(carpaProgress() * 100)}%</b><input type="range" id="cp" min="0" max="100" step="10" value="${Math.round(carpaProgress() * 100)}"></label>
        <div class="row"><button class="btn ghost" id="now">Volver a la hora real</button><button class="btn ghost" id="reset">Borrar todo y elegir de nuevo</button></div>
        <button class="btn" data-close>Listo</button></div>`,
      (bg) => {
        bg.querySelector('#hr').addEventListener('input', (e) => { SKY.override.minute = +e.target.value; bg.querySelector('#hv').textContent = SKY.fmt(+e.target.value); SKY.paint(); });
        bg.querySelector('#kd').addEventListener('change', (e) => { SKY.override.kind = e.target.value === 'auto' ? null : e.target.value; SKY.paint(); render(); });
        bg.querySelector('#cp').addEventListener('input', (e) => { carpaOverride = +e.target.value / 100; bg.querySelector('#cv').textContent = e.target.value + '%'; render(); });
        bg.querySelector('#now').addEventListener('click', () => { SKY.override.minute = null; SKY.override.kind = null; carpaOverride = null; SKY.paint(); render(); bg.remove(); });
        bg.querySelector('#reset').addEventListener('click', () => { S.forget(); bg.remove(); go('quien'); });
      });
    });
  }

  // Cambios de los demás en vivo: se vuelve a dibujar la pantalla (las hojas abiertas no se tocan).
  S.onChange((ev) => {
    if (ev && ev.gift) { const it = D.SHOP.find((x) => x.id === ev.gift.item); toast(`<span style="font-size:1.4rem">${it ? it.e : '♡'}</span><span>${esc(person(ev.gift.de).n)} te regaló ${esc(it ? it.n.toLowerCase() : 'algo')}.</span>`, 4500); }
    if (ev && ev.uploadFailed) toast('<span>No se pudo subir la foto. Queda guardada y se reintenta cuando haya señal.</span>', 4500);
    if (!document.querySelector('.sheet-bg')) render();
  });

  SKY.start();
  render();
  S.ready.then(() => { render(); if (S.me) setTimeout(welcome, 400); });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
