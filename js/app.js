/* Pantallas de Colonia. Prototipo: datos en el dispositivo, los demás con progreso de ejemplo. */
(function () {
  const D = window.DATA, S = window.STORE, SKY = window.SKY, ARTE = window.ARTE;
  const DEMO = !S.live;                                   // datos de ejemplo
  const PROTO = DEMO || /(^|[?&])probar(&|=|$)/.test(location.search); // panel para probar el cielo
  const $ = (q, el = document) => el.querySelector(q);
  const screen = $('#screen');
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const person = (id) => D.PEOPLE.find((p) => p.id === id);
  const face = (id) => S.faceUrl(id);
  const hash = (str) => { let h = 7; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  let fotoOverride = null;
  const NAH = 'Qué hinchahuevos'; // para decirle que no a algo que propone la app

  // ---------- íconos dibujados ----------
  const IC = {
    hoy: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.2 5.2l1.8 1.8M17 17l1.8 1.8M5.2 18.8 7 17M17 7l1.8-1.8"/></svg>',
    misiones: '<svg viewBox="0 0 24 24"><path d="M4 8h3l1.6-2.4h6.8L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.6"/></svg>',
    album: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>',
    tienda: '<svg viewBox="0 0 24 24"><path d="M4 9h16l-1.4 11H5.4z"/><path d="M8.5 9V7a3.5 3.5 0 0 1 7 0v2"/></svg>',
    altar: '<svg viewBox="0 0 24 24"><path d="M2.5 11.5a9.5 8 0 0 1 19 0z"/><path d="M12 11.5v8.5M7 20.5h10"/></svg>',
    colonia: '<svg viewBox="0 0 24 24"><circle cx="8.5" cy="8.5" r="3.2"/><circle cx="16.5" cy="9.5" r="2.6"/><path d="M3 20c.5-3.8 2.8-6 5.5-6s5 2.2 5.5 6"/><path d="M14.2 14.4c.7-.4 1.5-.6 2.3-.6 2.3 0 4 1.8 4.5 5"/></svg>',
    foto: '<svg viewBox="0 0 24 24"><rect x="4" y="2.5" width="16" height="19" rx="1.5"/><rect x="7" y="5.5" width="10" height="10" rx=".5"/></svg>',
    camara: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l1.6-2.4h6.8L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.6"/></svg>',
    sombrilla: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 11.5a9.5 8 0 0 1 19 0z"/><path d="M12 11.5v8.5M7 20.5h10"/></svg>',
  };
  const TABS = [['hoy', 'Hoy'], ['album', 'Álbum'], ['colonia', 'Colonia'], ['altar', 'Altarcito'], ['foto', 'La foto']];
  // Reacciones a las fotos de la colonia.
  const REAC = [['corazon', '❤️', 'Corazón'], ['bien', '👍', 'Pulgar arriba'], ['no', '❌', 'Incorrecto'], ['si', '✅', 'Correcto'], ['risa', '😂', 'Me hizo reír'], ['emocion', '🥹', 'Me emocionó']];
  const REAC_E = Object.fromEntries(REAC.map(([id, e]) => [id, e]));

  // ---------- la foto del 8/12 ----------
  const fotoProgress = () => fotoOverride ?? Math.min(1, S.groupXp() / D.FOTO.goal);
  function fotoState() {
    const prog = fotoProgress();
    const pieces = new Set(D.FOTO.pieces.filter((p) => prog >= p.at - 1e-9).map((p) => p.id));
    // Cada uno aparece con sus primeras figuritas; quien hizo la app, recién cuando están todos los demás. El 8/12, todos.
    const all = SKY.arDate() >= D.FOTO.dia;
    const resto = D.PEOPLE.filter((p) => p.id !== D.FOTO.ultimo);
    const people = new Set(resto.filter((p) => all || S.figuritas(p.id) >= D.FOTO.figus).map((p) => p.id));
    if (all || people.size === resto.length) people.add(D.FOTO.ultimo);
    return { prog, pieces, people, faltan: resto.length - resto.filter((p) => people.has(p.id)).length };
  }
  // Qué le falta a cada uno para aparecer en la foto.
  function estadoEnFoto(pid, st) {
    if (st.people.has(pid)) return 'En la foto';
    const vos = pid === S.me;
    if (pid === D.FOTO.ultimo) return `${vos ? 'Aparecés' : 'Aparece'} último, cuando estén todos · ${st.faltan === 1 ? 'falta 1' : 'faltan ' + st.faltan}`;
    const k = D.FOTO.figus - S.figuritas(pid);
    return `${vos ? 'Te' : 'Le'} ${k === 1 ? 'falta 1 figurita' : `faltan ${k} figuritas`}`;
  }
  // Modo recortes: la imagen entera de base y cada persona o cosa encima, en orden de atrás para adelante.
  // Lo desbloqueado se ve tal cual; lo que falta, como silueta en su lugar (así no hay que rellenar lo que queda tapado).
  function fotoRecortes(st, mini) {
    const R = D.FOTO.recortes;
    const locked = (id) => (D.PEOPLE.some((p) => p.id === id) ? !st.people.has(id) : D.FOTO.pieces.some((p) => p.id === id) && !st.pieces.has(id));
    const v = R.v ? '?v=' + R.v : '';
    const img = (path, cls) => `<img class="${cls || ''}" src="${S.artUrl(path + v)}" alt="" loading="lazy" draggable="false">`;
    return `<div class="capas ${R.silueta}${mini ? ' chica' : ''}" style="--ar:${R.ancho}/${R.alto}" role="img" aria-label="La foto de la colonia">
      ${img(R.base)}${R.capas.map((id) => img('foto/' + id + '.' + (R.ext || 'png'), locked(id) ? 'falta' : '')).join('')}</div>`;
  }
  const fotoHTML = (st, mini) => `<div class="foto${st.pieces.has('revelado') ? ' revelada' : ''}">${D.FOTO.modo === 'recortes' ? fotoRecortes(st, mini) : ARTE.foto(D, { faces: face, pieces: st.pieces, people: st.people })}</div>`;

  // ---------- altarcito playero ----------
  const SAND_TOP = 0.5, SAND_BOT = 0.97, MAR_TOP = 0.35, MAR_BOT = 0.445;
  const ZONAS = { arena: [SAND_TOP, SAND_BOT], fondo: [SAND_TOP, SAND_TOP + 0.09], mar: [MAR_TOP, MAR_BOT] };
  const RANGO = { mar: 0, fondo: 1, arena: 2 };
  const ESCALA = 1.3, HOLD = 260, SLOP = 9, ZMAX = 3; // tamaño general, ms para agarrar, px de tolerancia, zoom máximo
  const REFUGIO = { sombrilla: { x: 0.26, y: 0.6 }, carpa: { x: 0.27, y: 0.6 } };
  const shopItem = (id) => D.SHOP.find((x) => x.id === id) || D.SHOP.find((x) => x.id === D.ALIAS[id]);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const zonaDe = (id) => (shopItem(id) || {}).z || 'arena';
  const persp = (y) => 0.82 + 0.18 * clamp((y - SAND_TOP) / (SAND_BOT - SAND_TOP), 0, 1);
  const escala = (id, y) => (zonaDe(id) === 'mar' ? 0.72 + 0.28 * clamp((y - MAR_TOP) / (MAR_BOT - MAR_TOP), 0, 1) : persp(y));
  const area = (id) => { const z = ARTE.size(id); return z.w * z.h; };
  function rnd(seed) { let h = hash(seed); return () => { h = (h + 0x6D2B79F5) >>> 0; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const fresh = new Set(); // cosas recién compradas: caen del cielo
  const vistas = {};       // zoom de cada altarcito: sobrevive a los redibujos
  let dragging = false;

  function spot(pid, it, place) {
    const p = place[it.k];
    if (p && p.x != null) return p;
    const r = rnd(pid + it.k), zona = zonaDe(it.id), [a, b] = ZONAS[zona];
    return Object.assign({}, p, { x: 0.12 + r() * 0.76, y: zona === 'arena' ? a + 0.1 + r() * (b - a - 0.12) : a + r() * (b - a) });
  }
  const itWidth = (id, y) => (y == null ? ARTE.size(id).w / 4 : ARTE.size(id).w / 4 * ESCALA * escala(id, y)).toFixed(2) + '%';
  const itStyle = (id, x, y, z, flat) => `left:${(x * 100).toFixed(2)}%;top:${(y * 100).toFixed(2)}%;width:${itWidth(id, flat ? null : y)};z-index:${z}`;
  const colorOf = (it, p) => (p && p.c) || shopItem(it.id).col || null;
  const ordenIt = (a, b) => RANGO[zonaDe(a.id)] - RANGO[zonaDe(b.id)] || area(b.id) - area(a.id) || a.y - b.y;
  const zDe = (id, i) => (zonaDe(id) === 'mar' ? 1 : i + 4); // mar 1, refugio 2, cartel 3, el resto arriba
  function itHTML(pid, it, p, i) {
    const sh = shopItem(it.id), h = hash(pid + it.k), art = ARTE.item(it.id, colorOf(it, p));
    const clip = sh.anim === 'salta' || sh.anim === 'cola';
    const vars = sh.anim ? `;--t:${(7 + (h % 40) / 10).toFixed(1)}s;--d:-${((h >> 3) % 70 / 10).toFixed(1)}s` : '';
    return `<div class="it${zonaDe(it.id) === 'mar' ? ' mar' : ''}${sh.anim ? ' ' + sh.anim : ''}" data-k="${it.k}" data-id="${it.id}" data-x="${p.x}" data-y="${p.y}" style="${itStyle(it.id, p.x, p.y, zDe(it.id, i))}${vars}">${clip ? `<span class="recorte">${art}</span>` : art}</div>`;
  }
  // ---------- hallazgos: la botella del mar y la galleta de arroz ----------
  // Aparecen solas en tu altarcito algunos días. Se abren tocándolas y dan monedas; si no la abrís ese día, se la lleva la marea.
  const HZ = D.HALLAZGOS;
  const forzado = {}; // panel de prueba: hace aparecer una ya
  function hallazgoHoy(tipo) {
    const h = HZ[tipo], dia = SKY.arDate();
    if (!S.me || dia < HZ.desde || S.hallado(tipo, dia)) return null;
    const r = rnd(tipo + S.me + dia), sale = r() < h.prob, hora = h.de + r() * (h.a - h.de);
    if (!forzado[tipo] && (!sale || SKY.arMinute() < hora)) return null;
    return { tipo, x: 0.16 + r() * 0.68, y: tipo === 'botella' ? 0.47 + r() * 0.025 : 0.64 + r() * 0.26 };
  }
  function hallazgoHTML(h) {
    const w = (ARTE.size(h.tipo).w / 4 * ESCALA * (h.tipo === 'botella' ? 0.9 : persp(h.y))).toFixed(2);
    const que = h.tipo === 'botella' ? 'Una botella llegó del mar' : 'Hay algo enterrado en la arena';
    return `<div class="it hallazgo ${h.tipo}${h.tipo === 'botella' ? ' mar flota' : ''}" data-hallazgo="${h.tipo}" role="button" tabindex="0" aria-label="${que}"
      style="left:${(h.x * 100).toFixed(2)}%;top:${(h.y * 100).toFixed(2)}%;width:${w}%;z-index:60">${ARTE.item(h.tipo)}<i class="brillo" aria-hidden="true">✦</i></div>`;
  }
  const SIN_TILDE = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U' };
  const sinTilde = (t) => t.replace(/[áéíóúüÁÉÍÓÚ]/g, (c) => SIN_TILDE[c]);
  const CIFRAR = {
    murcielago: (t) => sinTilde(t).replace(/[murcielago]/gi, (c) => 'murcielago'.indexOf(c.toLowerCase())),
    jeringozo: (t) => t.replace(/[aeiouáéíóú]/gi, (v) => v + 'p' + sinTilde(v).toLowerCase()),
    reves: (t) => [...t].reverse().join(''),
    espejo: (t) => t,
    corrida: (t) => sinTilde(t).replace(/[a-z]/gi, (c) => { const A = c <= 'Z' ? 65 : 97; return String.fromCharCode((c.charCodeAt(0) - A + 1) % 26 + A); }),
  };
  function abrirHallazgo(el) {
    const tipo = el.dataset.hallazgo, h = HZ[tipo], lista = tipo === 'botella' ? h.mensajes : h.frases;
    const i = barajar(lista.length, tipo + S.me)[S.hallazgos(tipo).length % lista.length];
    if (!S.hallar(tipo, SKY.arDate(), i, h.c)) return;
    forzado[tipo] = false;
    el.classList.add('se-va');
    SONIDO.monedas(h.c);
    leerHallazgo(tipo, i, true);
    setTimeout(render, 450);
  }
  function leerHallazgo(tipo, i, nuevo) {
    const premio = nuevo ? `<span class="chip" style="--c:var(--butter)">+${HZ[tipo].c} <span class="coin"></span></span>` : '';
    if (tipo === 'botella') {
      const [clave, texto] = HZ.botella.mensajes[i], k = HZ.botella.claves[clave], cif = CIFRAR[clave](texto);
      return sheet(`<div class="hallazgo-hoja">
        <div class="eyebrow">Llegó una botella del mar</div>${premio}
        <div class="papel"><p class="msj${clave === 'espejo' ? ' espejo' : ''}" id="msj">${esc(cif)}</p></div>
        <p class="small muted" style="margin:0">Viene ${esc(k.n)}. ${esc(k.pista)}</p>
        <div class="row" style="justify-content:center"><button class="btn ghost" data-close>Guardarla</button><button class="btn" id="descifrar" style="--c:var(--celeste)">Descifrar</button></div></div>`,
      (bg) => {
        const p = bg.querySelector('#msj'), b = bg.querySelector('#descifrar');
        b.addEventListener('click', () => {
          if (b.dataset.close != null) return;
          b.disabled = true; p.classList.remove('espejo');
          const t0 = performance.now(), dur = clave === 'espejo' ? 500 : 1300;
          const paso = (now) => {
            const q = Math.min(1, (now - t0) / dur);
            p.textContent = texto.slice(0, Math.round(q * texto.length)) + cif.slice(Math.round(q * cif.length));
            if (q < 1) return requestAnimationFrame(paso);
            p.textContent = texto; p.classList.add('claro'); SONIDO.plop();
            b.textContent = 'Listo'; b.disabled = false; b.dataset.close = '';
          };
          requestAnimationFrame(paso);
        });
      });
    }
    const [frase, nums] = HZ.galleta.frases[i];
    sheet(`<div class="hallazgo-hoja">
      <div class="eyebrow">Una galleta de arroz en la arena</div>${premio}
      <button class="galleta-abre${nuevo ? '' : ' partida'}" id="partir" aria-label="Partir la galleta"><span class="mitad izq">${ARTE.item('galleta')}</span><span class="mitad der">${ARTE.item('galleta')}</span></button>
      <div class="tira" id="tira"${nuevo ? ' hidden' : ''}><p>${esc(frase)}</p><p class="small" style="margin:0">Números de la suerte<br><b class="nums">${nums.join(' · ')}</b></p></div>
      ${nuevo ? '<p class="small muted" id="nota" style="margin:0">Tocala para partirla.</p>' : ''}
      <button class="btn ghost" data-close>Listo</button></div>`,
    (bg) => {
      const g = bg.querySelector('#partir');
      g.addEventListener('click', () => {
        if (g.classList.contains('partida')) return;
        g.classList.add('partida'); SONIDO.plop();
        setTimeout(() => { bg.querySelector('#tira').hidden = false; const n = bg.querySelector('#nota'); if (n) n.hidden = true; }, 320);
      });
    });
  }
  const nHallazgos = () => S.hallazgos('botella').length + S.hallazgos('galleta').length;
  // Todo lo que encontraste, de lo más nuevo a lo más viejo, ya descifrado.
  function misHallazgos() {
    const todos = ['botella', 'galleta'].flatMap((tipo) => S.hallazgos(tipo).map((h) => Object.assign({ tipo }, h))).sort((a, b) => b.dia.localeCompare(a.dia));
    const fila = (h) => {
      const g = h.tipo === 'galleta' && HZ.galleta.frases[h.i], txt = g ? g[0] : HZ.botella.mensajes[h.i][1];
      return `<li><span class="mini">${ARTE.item(h.tipo)}</span><div><span class="small muted">${h.tipo === 'botella' ? 'Botella' : 'Galleta'} del ${fechaCorta(h.dia)}</span>
        <p style="margin:2px 0 0">${esc(txt)}</p>${g ? `<span class="small">Números: ${g[1].join(' · ')}</span>` : ''}</div></li>`;
    };
    sheet(`<div style="display:grid;gap:12px"><h2>Lo que trajo el mar</h2>
      <p class="small muted" style="margin:0">Botellas y galletas que encontraste en tu altarcito.</p>
      <ul class="hallados">${todos.map(fila).join('')}</ul><button class="btn ghost" data-close>Listo</button></div>`);
  }
  function altarHTML(pid, editable) {
    const a = S.altar(pid);
    const placed = a.items.map((it) => ({ it, p: spot(pid, it, a.place) })).filter((x) => !x.p.off)
      .sort((u, v) => ordenIt({ id: u.it.id, y: u.p.y }, { id: v.it.id, y: v.p.y }));
    const R = a.refugio;
    const ref = R ? `<div class="it fixed" data-k="${R.k}" data-id="${R.id}" style="${itStyle(R.id, REFUGIO[R.id].x, REFUGIO[R.id].y, 2, true)}">${ARTE.item(R.id, colorOf(R, a.place[R.k]))}</div>` : '';
    const name = person(pid).n;
    const cw = ARTE.cartelIA ? 23 : (Math.max(60, Math.min(110, 14 + name.length * 7.2)) + 4) / 4;
    return `<div class="altar${editable ? ' edit' : ''}${ARTE.pintado ? ' pintado' : ''}" data-pid="${pid}"><div class="mundo">
      ${ARTE.pintado ? '' : '<i class="nube" style="left:10%;top:7%;width:22%"></i><i class="nube" style="left:64%;top:14%;width:15%"></i>'}
      ${ref}
      <div class="it fixed cartel" style="left:86%;top:57%;width:${cw}%;z-index:3">${ARTE.cartel(esc(name))}</div>
      ${placed.map(({ it, p }, i) => itHTML(pid, it, p, i)).join('')}
      ${editable && pid === S.me ? ['botella', 'galleta'].map(hallazgoHoy).filter(Boolean).map(hallazgoHTML).join('') : ''}
      ${!a.items.length && !R ? `<div class="vacio">${editable ? 'Tu playa está vacía.<br>Pasá por el kiosco.' : 'Todavía está vacía.'}</div>` : ''}
    </div><div class="zoombar"><button data-z="-1" aria-label="Alejar">−</button><button data-z="1" aria-label="Acercar">+</button></div></div>`;
  }
  function bolsaHTML() {
    const a = S.altar();
    const off = a.items.filter((it) => (a.place[it.k] || {}).off);
    if (!off.length) return '';
    return `<div class="eyebrow">En la bolsa</div><div class="bolsa">${off.map((it) => `<button data-out="${it.k}" aria-label="Sacar ${esc(shopItem(it.id).n)}">${ARTE.item(it.id, colorOf(it, a.place[it.k]))}</button>`).join('')}</div>`;
  }
  // Cae desde h (fracción del alto del altarcito) hasta donde está parado. Todo con transform: va liso aunque el celu esté ocupado.
  const PIE = 'translate(-50%, -100%)', GRAVEDAD = 6.5;
  function polvo(box, x, y) {
    for (let i = 0; i < 6; i++) {
      const p = document.createElement('i'), a = Math.PI * (1 + i / 5), r = 12 + Math.random() * 14;
      p.className = 'polvo'; p.style.left = (x * 100) + '%'; p.style.top = (y * 100) + '%';
      p.style.setProperty('--dx', (Math.cos(a) * r).toFixed(1) + 'px');
      p.style.setProperty('--dy', (Math.sin(a) * (r * 0.55)).toFixed(1) + 'px');
      p.addEventListener('animationend', () => p.remove());
      box.appendChild(p);
    }
  }
  function caer(el, box, h, done) {
    const px = h * box.offsetHeight;
    const ms = clamp(Math.sqrt(2 * h / GRAVEDAD) * 1000, 55, 480);
    let over = false;
    const land = () => {
      if (over) return;
      over = true; clearTimeout(safety);
      const fuerza = clamp(h / 0.3 + 0.15, 0, 1);
      if (zonaDe(el.dataset.id) === 'mar') SONIDO.chap(fuerza);
      else { SONIDO.trtss(fuerza); polvo(box, +el.dataset.x, +el.dataset.y); }
      el.classList.remove('plop'); void el.offsetWidth; el.classList.add('plop');
      if (h > 0.07) el.animate([{ transform: PIE }, { transform: `${PIE} translate3d(0,${-Math.min(14, px * 0.1)}px,0)`, easing: 'ease-in' }, { transform: PIE }], { duration: 170, easing: 'ease-out' });
      if (done) done();
    };
    const safety = setTimeout(land, ms + 250); // si la app queda en segundo plano a mitad de la caída
    el.animate([{ transform: `${PIE} translate3d(0,${-px}px,0)` }, { transform: PIE }], { duration: ms, easing: 'cubic-bezier(.55,.085,.68,.53)' }).onfinish = land;
  }
  function restack(box) {
    [...box.querySelectorAll('.it:not(.fixed)')]
      .sort((u, v) => ordenIt({ id: u.dataset.id, y: +u.dataset.y }, { id: v.dataset.id, y: +v.dataset.y }))
      .forEach((el, i) => (el.style.zIndex = zDe(el.dataset.id, i)));
  }
  // Un dedo: tocar abre la cosa; mantener la agarra; deslizar scrollea la página (o recorre la playa si hay zoom).
  // Dos dedos: zoom. Doble toque en la arena: acerca o aleja.
  function bindAltar(altar, editable) {
    const pid = altar.dataset.pid, box = altar.querySelector('.mundo');
    const v = vistas[pid] || (vistas[pid] = { z: 1, x: 0, y: 0 });
    const MOVE = 'onpointerrawupdate' in window ? 'pointerrawupdate' : 'pointermove', LIFT = 0.04;
    const pts = new Map();
    let g = null, tapT = 0, tapX = 0, tapY = 0;

    box.querySelectorAll('.it[data-k]').forEach((el) => {
      if (!fresh.has(el.dataset.k)) return;
      fresh.delete(el.dataset.k);
      el.style.zIndex = 99;
      caer(el, box, +el.dataset.y + 0.12, () => restack(box));
    });

    const aLocal = (cx, cy) => { const r = altar.getBoundingClientRect(); return [cx - r.left - altar.clientLeft, cy - r.top - altar.clientTop]; };
    const aplicar = () => {
      v.x = clamp(v.x, altar.clientWidth * (1 - v.z), 0);
      v.y = clamp(v.y, altar.clientHeight * (1 - v.z), 0);
      const hay = v.z > 1.001;
      box.style.transform = hay ? `translate3d(${v.x.toFixed(1)}px,${v.y.toFixed(1)}px,0) scale(${v.z.toFixed(3)})` : '';
      altar.classList.toggle('zoom', hay);
    };
    const zoomEn = (z, cx, cy, suave) => {
      const nz = clamp(z, 1, ZMAX), k = nz / v.z;
      v.x = cx - (cx - v.x) * k; v.y = cy - (cy - v.y) * k; v.z = nz;
      if (suave) { box.classList.add('suave'); setTimeout(() => box.classList.remove('suave'), 220); }
      aplicar();
    };
    aplicar();
    const pinch = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; };
    const sinEspera = () => { if (g && g.timer) clearTimeout(g.timer); if (g && g.el) g.el.classList.remove('pre'); };

    function agarrar() {
      const t = g, el = t.el, id = el.dataset.id, x0 = +el.dataset.x, y0 = +el.dataset.y, p0 = escala(id, y0);
      const [ymin, ymax] = ZONAS[zonaDe(id)], r = box.getBoundingClientRect(), W = box.offsetWidth, H = box.offsetHeight;
      const shadow = document.createElement('i'); shadow.className = 'ground';
      shadow.style.width = (ARTE.size(id).w / 4 * ESCALA * 0.7) + '%';
      const d = g = { tipo: 'drag', el, id, pointer: t.pointer, x0, y0, ymin, ymax, rw: r.width, rh: r.height, sx: t.lx, sy: t.ly, gx: x0, gy: y0, fy: y0, moved: false, shadow };
      d.paint = () => {
        el.style.transform = `${PIE} translate3d(${((d.gx - x0) * W).toFixed(1)}px,${((d.fy - y0) * H).toFixed(1)}px,0) scale(${(escala(id, d.gy) / p0).toFixed(3)})`;
        shadow.style.transform = `translate3d(${(d.gx * W).toFixed(1)}px,${(d.gy * H).toFixed(1)}px,0) translate(-50%,-50%) scale(${escala(id, d.gy).toFixed(3)})`;
      };
      dragging = true;
      el.classList.remove('pre', 'plop'); el.classList.add('held'); el.style.zIndex = 99;
      box.appendChild(shadow); d.paint();
      SONIDO.plop();
      if (navigator.vibrate) navigator.vibrate(8);
    }
    function soltar() {
      const d = g, el = d.el; g = null;
      d.shadow.remove(); el.classList.remove('held'); el.style.transform = '';
      el.dataset.x = d.gx; el.dataset.y = d.gy;
      el.style.left = (d.gx * 100) + '%'; el.style.top = (d.gy * 100) + '%'; el.style.width = itWidth(d.id, d.gy);
      caer(el, box, Math.max(d.gy - d.fy, 0.03), () => { restack(box); dragging = false; });
      if (d.moved) S.setPlace(el.dataset.k, { x: +d.gx.toFixed(4), y: +d.gy.toFixed(4) });
    }

    altar.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.zoombar') || (g && g.tipo === 'drag') || (e.pointerType === 'mouse' && e.button)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { altar.setPointerCapture(e.pointerId); } catch (err) { /* el dedo ya se fue */ }
      if (pts.size === 2) {
        sinEspera();
        const p = pinch(), [mx, my] = aLocal(p.mx, p.my);
        g = { tipo: 'pinch', d0: p.d, z0: v.z, mx, my };
        return;
      }
      if (pts.size > 2) return;
      const el = e.target.closest('.it[data-k]');
      const t = g = { tipo: 'toque', el, huevo: e.target.closest('[data-hallazgo]'), pointer: e.pointerId, sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY };
      if (el && editable && !el.classList.contains('fixed')) {
        el.classList.add('pre');
        t.timer = setTimeout(() => { if (g === t && el.isConnected) agarrar(); }, HOLD);
      }
    });
    altar.addEventListener(MOVE, (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!g) return;
      if (g.tipo === 'drag') {
        if (e.pointerId !== g.pointer) return;
        const dx = e.clientX - g.sx, dy = e.clientY - g.sy, dist = Math.hypot(dx, dy);
        if (dist > 6) g.moved = true;
        g.gx = clamp(g.x0 + dx / g.rw, 0.05, 0.95);
        const ay = clamp(g.y0 + dy / g.rh, 0.04, 0.99);
        g.gy = clamp(ay, g.ymin, g.ymax);
        g.fy = Math.min(ay, g.gy - LIFT * Math.min(1, dist / 26));
        g.paint();
      } else if (g.tipo === 'pinch') {
        if (pts.size < 2) return;
        const p = pinch(), [mx, my] = aLocal(p.mx, p.my);
        v.x += mx - g.mx; v.y += my - g.my; g.mx = mx; g.my = my;
        zoomEn(g.z0 * p.d / g.d0, mx, my);
      } else if (g.tipo === 'pan') {
        v.x += e.clientX - g.lx; v.y += e.clientY - g.ly; g.lx = e.clientX; g.ly = e.clientY;
        aplicar();
      } else if (g.tipo === 'toque') {
        g.lx = e.clientX; g.ly = e.clientY;
        if (Math.hypot(e.clientX - g.sx, e.clientY - g.sy) > SLOP) {
          sinEspera();
          g = v.z > 1.001 ? { tipo: 'pan', lx: e.clientX, ly: e.clientY } : { tipo: 'nada' };
        }
      }
    });
    const fin = (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (!g) return;
      if (g.tipo === 'drag') { if (e.pointerId === g.pointer) soltar(); return; }
      if (g.tipo === 'pinch') {
        const [q] = [...pts.values()];
        g = q ? { tipo: 'pan', lx: q.x, ly: q.y } : null;
        return;
      }
      const t = g; sinEspera(); g = null;
      if (t.tipo !== 'toque' || e.type === 'pointercancel') return;
      if (t.huevo) { abrirHallazgo(t.huevo); return; }
      if (t.el) { SONIDO.si(); itemSheet(pid, t.el, editable); return; }
      const now = performance.now(), [x, y] = aLocal(e.clientX, e.clientY);
      if (now - tapT < 320 && Math.hypot(x - tapX, y - tapY) < 34) { tapT = 0; zoomEn(v.z > 1.01 ? 1 : 2, x, y, true); }
      else { tapT = now; tapX = x; tapY = y; }
    };
    altar.addEventListener('pointerup', fin);
    altar.addEventListener('pointercancel', fin);
    box.querySelectorAll('[data-hallazgo]').forEach((b) => b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirHallazgo(b); } }));
    // Mientras se arrastra o hay zoom, el dedo es de la playa y no de la página.
    altar.addEventListener('touchmove', (e) => { if ((g && g.tipo === 'drag') || v.z > 1.001 || e.touches.length > 1) e.preventDefault(); }, { passive: false });
    altar.addEventListener('gesturestart', (e) => e.preventDefault());
    altar.addEventListener('contextmenu', (e) => e.preventDefault());
    altar.addEventListener('wheel', (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const [x, y] = aLocal(e.clientX, e.clientY);
      zoomEn(v.z * Math.exp(-e.deltaY * 0.01), x, y);
    }, { passive: false });
    altar.querySelectorAll('[data-z]').forEach((b) => b.addEventListener('click', () => {
      zoomEn(v.z + (+b.dataset.z) * 0.7, altar.clientWidth / 2, altar.clientHeight / 2, true);
    }));
  }
  const nombreDe = (it) => (it.sub ? it.n : it.n.toLowerCase()); // las mascotas tienen nombre propio
  function venderSheet(k, it, venta) {
    sheet(`<div style="display:grid;gap:12px;justify-items:center;text-align:center">
      <div class="art-big">${ARTE.item(it.id, colorOf({ id: it.id }, S.altar().place[k]))}</div>
      <h2>¿Vendés ${esc(nombreDe(it))}?</h2>
      <p class="muted" style="margin:0">Te devuelven ${venta} monedas, el 80% de lo que costó. Se va de tu altarcito.</p>
      <div class="row" style="justify-content:center"><button class="btn ghost" data-close>${NAH}</button><button class="btn" id="siVender" data-mudo style="--c:var(--butter)">Vender por ${venta} <span class="coin"></span></button></div></div>`,
    (bg) => bg.querySelector('#siVender').addEventListener('click', () => {
      const c = S.vender(k);
      bg.remove();
      if (!c) return;
      SONIDO.monedas(c);
      toast(`<span class="chip" style="--c:var(--butter)">+${c} <span class="coin"></span></span><span>Vendiste ${esc(nombreDe(it))}.</span>`);
      render();
    }));
  }
  function itemSheet(pid, el, editable) {
    const k = el.dataset.k, id = el.dataset.id, it = shopItem(id);
    const a = S.altar(pid);
    const inst = a.items.concat(a.refugio ? [a.refugio] : []).find((x) => x.k === k) || {};
    const cur = colorOf(inst.id ? inst : { id }, a.place[k]);
    const mine = pid === S.me;
    // Quién lo regaló, grande y tocable: lleva a su tarjeta (y de ahí a su altarcito).
    const de = inst.from && person(inst.from);
    const from = de ? `<p class="regalado">${mine ? 'Te lo regaló' : 'Se lo regaló'} <button class="amigo" data-de="${de.id}"><img class="face" src="${face(de.id)}" alt="">${esc(de.n)}</button> ♡</p>` : '';
    // Lo que compraste se puede vender al 80% de su precio; lo regalado, no.
    const venta = editable && mine && !inst.from && String(k).startsWith('o') ? Math.round(it.p * 0.8) : 0;
    sheet(`<div style="display:grid;gap:12px;justify-items:center;text-align:center">
      <div class="art-big" id="big">${ARTE.item(id, cur)}</div><h2>${esc(it.n)}</h2>
      ${it.sub ? `<p class="muted" style="margin:-6px 0 0">${esc(it.sub)}</p>` : ''}${from}
      ${it.d ? `<p class="desc">${esc(it.d)}</p>` : ''}
      ${editable && it.col ? `<div class="swatches">${D.COLORS.map((c) => `<button data-c="${c}" class="${c === cur ? 'on' : ''}" style="--c:${c}" aria-label="Pintar"></button>`).join('')}</div>` : ''}
      <div class="row" style="justify-content:center">${editable && it.side !== 'R' ? '<button class="btn ghost" id="bag">Guardar en la bolsa</button>' : ''}<button class="btn" data-close>Listo</button></div>
      ${venta ? `<button class="vender" id="vender">Venderlo por ${venta} <span class="coin"></span></button>` : ''}</div>`,
    (bg) => {
      const vb = bg.querySelector('#vender');
      if (vb) vb.addEventListener('click', () => { bg.remove(); venderSheet(k, it, venta); });
      bg.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => {
        S.setPlace(k, { c: b.dataset.c });
        bg.querySelectorAll('[data-c]').forEach((x) => x.classList.toggle('on', x === b));
        bg.querySelector('#big').innerHTML = ARTE.item(id, b.dataset.c);
        el.innerHTML = ARTE.item(id, b.dataset.c);
      }));
      const bag = bg.querySelector('#bag');
      if (bag) bag.addEventListener('click', () => { S.setPlace(k, { off: 1 }); bg.remove(); render(); });
      const am = bg.querySelector('[data-de]');
      if (am) am.addEventListener('click', () => { document.querySelectorAll('.sheet-bg').forEach((x) => x.remove()); carta(am.dataset.de); });
    });
  }
  let regalarA = null; // si se entra al kiosco desde el altarcito de alguien, es para regalarle a esa persona
  function visit(pid) {
    if (pid === S.me) { go('altar'); return; }
    S.visitar(pid); setTimeout(revisarAmigos, 600);
    const bg = sheet(`<div style="display:grid;gap:12px"><div class="spread"><h2>El altarcito de ${esc(person(pid).n)}</h2>
        <button class="ver-carta" id="suCarta" aria-label="Ver la tarjeta de ${esc(person(pid).n)}"><img class="face" src="${face(pid)}" alt=""><span class="small">Tarjeta</span></button></div>
      ${altarHTML(pid, false)}
      <div class="row" style="justify-content:center"><button class="btn ghost" data-close>Volver</button><button class="btn" id="regalarle" style="--c:var(--rose)">Regalarle algo</button></div></div>`);
    bindAltar(bg.querySelector('.altar'), false);
    bg.querySelector('#suCarta').addEventListener('click', () => { bg.remove(); carta(pid); });
    bg.querySelector('#regalarle').addEventListener('click', () => { bg.remove(); regalarA = pid; go('kiosco'); });
  }
  // ---------- helpers de juego ----------
  // La rotativa del día: durante el capítulo 1, DAILY_POOL; cuando cierra, la de entre capítulos.
  const delPool = (d) => { const p = d > D.CAPITULOS[0].hasta ? D.DAILY_ENTRE : D.DAILY_POOL; return p[hash(d) % p.length]; };
  function daily() {
    const d = SKY.arDate(), yo = person(S.me);
    // Durante el viaje: la del viaje; quienes juegan a distancia y alguna persona puntual tienen la suya.
    const trip = (D.DAILY_PROPIA[S.me] || {})[d] || (yo && !yo.trip ? D.DAILY_LEJOS[d] : null) || D.DAILY_TRIP[d];
    return { id: 'dia-' + d, s: 'dia', t: trip || delPool(d), xp: trip ? 40 : 20 };
  }
  // Misiones secretas: dos por día y por persona, cada una en su propio orden, sin repetir hasta agotar la lista.
  function barajar(n, semilla) {
    const r = rnd(semilla), o = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
    return o;
  }
  // Misiones de la costa: se destraban cuando ya estamos allá. Si alguien ya la hizo, le queda hecha.
  const ahoraAR = () => SKY.arNow().toISOString().slice(0, 16);
  const enCosta = () => ahoraAR() >= D.COSTA;
  const trabada = (m) => !!m.costa && !enCosta() && !S.photo(m.id);
  const CUANDO_COSTA = 'Se destraba en la costa, el viernes 4 a las 16 h';
  // Hasta entonces no se muestran; cuando se destraban, un aviso una sola vez.
  function avisarCosta() {
    if (!S.me || !enCosta() || SKY.arDate() > SKY.TRIP.to || S.visto('aviso:costa')) return;
    S.marcar('aviso:costa');
    const n = D.MISSIONS.filter((m) => m.costa && !S.photo(m.id)).length;
    if (n) toast(`<span>¡Llegaron ${n} figuritas nuevas de la costa! Ya están en tu álbum.</span>`, 5000);
  }
  function secretasDe(pid, dia) {
    const P = D.SECRETAS, viaje = person(pid).trip && dia >= P.viajeDesde && dia <= SKY.TRIP.to;
    const lista = viaje ? P.viaje : P.todas;
    const n = Math.round((Date.parse(dia) - Date.parse(viaje ? P.viajeDesde : P.desde)) / 864e5);
    const orden = barajar(lista.length, 'secretas' + pid + (viaje ? 'viaje' : ''));
    return [0, 1].map((k) => ({ id: `sec-${dia}-${k + 1}`, s: 'secreta', t: lista[orden[(n * 2 + k) % lista.length]], xp: P.xp }));
  }
  // Todas las que ya se destaparon, de la más nueva a la más vieja (las de hoy, solo si ya las miraste).
  function secretasHasta() {
    const out = [], hoy = SKY.arDate();
    for (let t = Date.parse(hoy); t >= Date.parse(D.SECRETAS.desde); t -= 864e5) {
      const dia = new Date(t).toISOString().slice(0, 10);
      if (dia !== hoy || S.secretSeen()) out.push(...secretasDe(S.me, dia).map((m) => Object.assign(m, { dia })));
    }
    return out;
  }
  const fechaCorta = (dia) => `${+dia.slice(8)}/${+dia.slice(5, 7)}`;
  // En Misiones: las secretas que ya se destaparon. Las pendientes primero; las hechas, plegadas.
  function secretasCard() {
    const todas = secretasHasta();
    if (!todas.length) return '';
    const fila = (m) => mRow(m, m.dia === SKY.arDate() ? 'De hoy' : 'Del ' + fechaCorta(m.dia));
    const pend = todas.filter((m) => !S.photo(m.id)), hechas = todas.filter((m) => S.photo(m.id));
    return `<div class="card dark"><div class="eyebrow">Tus secretas</div>
      <p class="small muted" style="margin:0">Solo vos las ves. Dos nuevas por día, y las de días anteriores siguen valiendo.</p>
      ${pend.length ? `<div class="list">${pend.map(fila).join('')}</div>` : '<p class="small muted" style="margin:0">Las tenés todas hechas.</p>'}
      ${hechas.length ? `<details class="hechas"><summary class="small">Hechas (${hechas.length})</summary><div class="list">${hechas.map(fila).join('')}</div></details>` : ''}</div>`;
  }
  const vestigioUrl = (pid, mid) => S.artUrl(`vestigios/${pid}-${mid}.jpg?v=1`);
  function misionDe(mid) {
    if (!mid.startsWith('dia-')) return (D.MISSIONS.find((m) => m.id === mid) || { t: 'Una misión' }).t;
    const d = mid.slice(4);
    return D.DAILY_TRIP[d] || delPool(d);
  }
  function tituloFoto(mid, pid) {
    if (mid.startsWith('ruta-')) { const p = R.paradas.find((x) => 'ruta-' + x.id === mid); return p ? p.t : 'La ruta'; }
    if (mid === D.DUO.id) return D.DUO.t;
    const d = mid.slice(4), quien = pid && person(pid);
    if (mid.startsWith('dia-') && quien) return (D.DAILY_PROPIA[pid] || {})[d] || (!quien.trip && D.DAILY_LEJOS[d]) || misionDe(mid);
    return misionDe(mid);
  }

  // ---------- balance, ranking y menciones de honor ----------
  // Puntos: cada foto 3, cada regalo 2, cada reacción y cada día que entraste 1.
  const PUNTOS = { fotos: 3, regalos: 2, reacciones: 1, dias: 1 };
  const vez = (n) => (n === 1 ? 'una vez' : `${n} veces`);
  const tipo = (k) => (s) => s.porTipo[k] || 0;
  // [clave, título, cómo se cuenta, de dónde sale el número]
  const MENCIONES = [
    ['fotos', 'Ojo de fotógrafo', (n) => (n === 1 ? 'una foto' : `${n} fotos`), (s) => s.fotos],
    ['corazon', 'Corazón de la colonia', (n) => `puso ❤️ ${vez(n)}`, tipo('corazon')],
    ['risa', 'Risa fácil', (n) => `se rió 😂 ${vez(n)}`, tipo('risa')],
    ['emocion', 'Lágrima fácil', (n) => `se emocionó 🥹 ${vez(n)}`, tipo('emocion')],
    ['no', 'Mano dura', (n) => `marcó ❌ ${vez(n)}`, tipo('no')],
    ['si', 'Sello de aprobación', (n) => `dio ✅ ${vez(n)}`, tipo('si')],
    ['bien', 'Pulgar de oro', (n) => `puso 👍 ${vez(n)}`, tipo('bien')],
    ['regalos', 'Alma generosa', (n) => (n === 1 ? 'hizo un regalo' : `hizo ${n} regalos`), (s) => s.regalos],
    ['matutino', 'Primera luz de la mañana', (n) => `fue la primera persona del día ${vez(n)}`, (s) => s.matutino],
    ['noctambulo', 'Turno noche', (n) => `entró de madrugada ${vez(n)}`, (s) => s.noctambulo],
    ['hallazgos', 'Ojo de pirata', (n) => `encontró ${n === 1 ? 'un tesoro' : n + ' tesoros'} del mar`, (s) => s.hallazgos],
    ['bocinas', 'Bocina de oro', (n) => `tocó bocina ${vez(n)}`, (s) => s.bocinas],
    ['altar', 'Altar de lujo', (n) => `${n === 1 ? 'una cosa' : n + ' cosas'} en su altarcito`, (s) => s.altar],
    ['dias', 'Constancia', (n) => `entró ${n === 1 ? 'un día' : n + ' días'}`, (s) => s.dias],
  ];
  function ranking() {
    const filas = D.PEOPLE.map((p) => { const st = S.stats(p.id); return { id: p.id, st, pts: Object.entries(PUNTOS).reduce((t, [k, v]) => t + st[k] * v, 0) }; })
      .sort((a, b) => b.pts - a.pts || person(a.id).n.localeCompare(person(b.id).n));
    // Fuera del podio, cada persona recibe la mención donde más se destaca frente al resto (cada una se da una sola vez).
    const resto = filas.slice(3), maximo = {}, pares = [], usadas = new Set();
    MENCIONES.forEach(([k, , , v]) => { maximo[k] = Math.max(1, ...filas.map((f) => v(f.st))); });
    resto.forEach((f) => MENCIONES.forEach(([k, , , v]) => { const n = v(f.st); if (n > 0) pares.push({ f, k, n, peso: n / maximo[k] }); }));
    pares.sort((a, b) => b.peso - a.peso || b.n - a.n).forEach((p) => {
      if (p.f.mencion || usadas.has(p.k)) return;
      const m = MENCIONES.find(([k]) => k === p.k);
      p.f.mencion = { t: m[1], d: m[2](p.n) }; usadas.add(p.k);
    });
    resto.forEach((f) => { if (!f.mencion) f.mencion = { t: 'Miembro de honor', d: 'la colonia no sería la misma' }; });
    return filas;
  }
  let verMenciones = false; // si abriste las menciones, quedan abiertas aunque se vuelva a dibujar
  addEventListener('toggle', (e) => { if (e.target.classList && e.target.classList.contains('menciones')) verMenciones = e.target.open; }, true);
  function balanceHTML() {
    const filas = ranking(), yo = filas.find((f) => f.id === S.me), st = yo.st;
    const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;
    const podio = filas.slice(0, 3).map((f, i) => `<button class="podio-p p${i + 1}" data-carta="${f.id}" aria-label="${i + 1}º: ${esc(person(f.id).n)}, ${f.pts} puntos">
      <span class="medalla" aria-hidden="true">${['🥇', '🥈', '🥉'][i]}</span><img class="face" src="${face(f.id)}" alt=""><b>${esc(person(f.id).n)}</b><span class="small">${f.pts} pts</span></button>`);
    const resto = filas.slice(3).map((f, i) => `<li><span class="pos">${i + 4}</span><img class="face" src="${face(f.id)}" alt="">
      <span><b>${esc(person(f.id).n)}</b> <span class="chip mencion" style="--c:var(--lav)">${esc(f.mencion.t)}</span><br><span class="small muted">${esc(f.mencion.d)}</span></span><span class="small pts">${f.pts}</span></li>`).join('');
    return `<div class="card balance">
      <div class="spread"><div class="eyebrow">Tu balance</div><span class="chip" style="--c:var(--butter)">${yo.pts} pts · ${filas.indexOf(yo) + 1}º de ${filas.length}</span></div>
      <p style="margin:0">Subiste ${plural(st.fotos, 'foto', 'fotos')}, mandaste ${plural(st.reacciones, 'reacción', 'reacciones')}, hiciste ${plural(st.regalos, 'regalo', 'regalos')} y entraste ${plural(st.dias, 'día', 'días')}.</p>
      <div class="eyebrow">Quienes más participan</div>
      <div class="podio">${[podio[1], podio[0], podio[2]].join('')}</div>
      <details class="menciones"${verMenciones ? ' open' : ''}><summary>Menciones de honor para el resto (${filas.length - 3})</summary><ul class="ranking">${resto}</ul></details>
      <p class="small muted" style="margin:0">Cada foto suma 3 puntos, cada regalo 2, y cada reacción y cada día que entrás, 1. Se actualiza en vivo. El 8/12, cuando termine el viaje, sale el wrapped de la colonia.</p></div>`;
  }

  // ---------- fotos de la colonia y reacciones ----------
  let verFotos = 15; // cuántas se muestran en Colonia ("Ver más" suma 15)
  const fechaFoto = (iso) => { const t = Date.parse(iso); if (!t) return ''; const d = new Date(t - 3 * 36e5); return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`; };
  function postHTML(f) {
    const key = f.pid + '/' + f.mision, mia = f.pid === S.me, mi = S.miReaccion(key), rs = S.reacciones(key);
    const img = `<img class="post-foto" src="${f.url || face(f.pid)}" alt="" loading="lazy"${f.url ? '' : ' style="filter:saturate(.5) sepia(.25)"'}>`;
    // En tus fotos no reaccionás: ves cuántas te pusieron.
    const botones = REAC.filter(([id]) => !mia || rs[id]).map(([id, e, n]) => {
      const c = (rs[id] || []).length;
      return mia ? `<span class="reac"><span aria-hidden="true">${e}</span><b>${c}</b><span class="sr">${n}</span></span>`
        : `<button class="reac${mi === id ? ' on' : ''}" data-reac="${id}" data-foto="${key}" aria-pressed="${mi === id}" aria-label="${n}${c ? ': ' + c : ''}" data-mudo><span aria-hidden="true">${e}</span>${c ? `<b>${c}</b>` : ''}</button>`;
    }).join('');
    const quienes = REAC.filter(([id]) => rs[id]).map(([id, e]) => `<span class="reac-quien"><span aria-hidden="true">${e}</span><span class="mini-caras">${rs[id].map((p) => `<img class="face" src="${face(p)}" alt="${esc(person(p).n)}" title="${esc(person(p).n)}">`).join('')}</span></span>`).join('');
    return `<div class="card post" data-post="${key}"><div class="post-top"><button class="post-quien" data-carta="${f.pid}"><img class="face" src="${face(f.pid)}" alt=""><b>${esc(person(f.pid).n)}</b></button><span class="small muted">${fechaFoto(f.creada)}</span></div>
      <p class="post-t">${esc(tituloFoto(f.mision, f.pid))}</p>${img}
      <div class="reacs">${botones || '<span class="small muted">Todavía sin reacciones.</span>'}</div>${quienes ? `<div class="reac-quienes">${quienes}</div>` : ''}</div>`;
  }
  function reaccionar(b) {
    const key = b.dataset.foto, r = b.dataset.reac;
    S.reaccionar(key, r); SONIDO.plop(); setTimeout(revisarAmigos, 500);
    const f = S.fotosColonia().find((x) => x.pid + '/' + x.mision === key), post = b.closest('.post');
    if (!f || !post) return render();
    post.outerHTML = postHTML(f);
    const nb = screen.querySelector(`[data-post="${key}"] [data-reac="${r}"]`);
    if (nb && nb.classList.contains('on')) nb.classList.add('pop');
  }
  // A quien subió la foto le llega el aviso: una vez por reacción, también si entra desde otro celu.
  function avisarReacciones() {
    const r = location.hash.slice(1);
    if (!S.me || !r || r === 'portada' || r === 'quien' || document.hidden) return;
    const nuevas = S.reaccionesNuevas().filter((x) => person(x.de) && REAC_E[x.r]);
    if (!nuevas.length) return;
    S.verReacciones(nuevas.map((x) => x.k));
    nuevas.slice(0, 3).forEach((x, i) => setTimeout(() => toast(`<img class="face" src="${face(x.de)}" alt="" style="width:40px;height:40px"><span><b>${esc(person(x.de).n)}</b> reaccionó ${REAC_E[x.r]} a tu foto: ${esc(tituloFoto(x.foto.split('/')[1], S.me))}</span>`, 4200), i * 900));
    if (nuevas.length > 3) setTimeout(() => toast(`<span>Y ${nuevas.length - 3} reacciones más a tus fotos. Están en Colonia.</span>`, 4200), 2700);
    SONIDO.plop();
  }
  function countdown() {
    const today = SKY.arDate();
    const days = Math.round((Date.parse(SKY.TRIP.from) - Date.parse(today)) / 864e5);
    if (days > 0) return { big: days, small: days === 1 ? 'día para la costa' : 'días para la costa' };
    if (days === 0 && !enCosta()) return { big: 'Hoy', small: 'salimos a la costa' };
    if (today <= SKY.TRIP.to) return { big: 'Día ' + (1 - days), small: 'de colonia en Costa Esmeralda' };
    if (!entreCapitulos()) return { big: '♡', small: 'la colonia ya volvió' };
    const px = proximo(), faltan = px && Math.round((Date.parse(px.d) - Date.parse(today)) / 864e5);
    if (faltan > 0) return { big: faltan, small: `${faltan === 1 ? 'día' : 'días'} para el capítulo ${px.n}` };
    if (faltan === 0) return { big: 'Hoy', small: `arranca el capítulo ${px.n}` };
    return { big: '♡', small: 'la colonia sigue' };
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
  function sheet(html, onMount, firme) {
    const bg = document.createElement('div');
    bg.className = 'sheet-bg';
    bg.innerHTML = `<div class="sheet card pop">${html}</div>`;
    if (firme) bg.dataset.firme = '1';
    bg.addEventListener('click', (e) => { if ((e.target === bg && !firme) || e.target.closest('[data-close]')) bg.remove(); });
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
      reviewPhoto(m, await squareImage(f, 480));
    } catch (err) {
      toast('<span>No pude leer esa foto. Probá con otra.</span>');
    }
  });
  // Antes de usarla: la ves y, si no te gustó, la descartás con la cruz o sacás otra.
  function reviewPhoto(m, url) {
    sheet(`<div class="revisar">
      <button class="cruz" data-close aria-label="Descartar esta foto"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <div class="eyebrow">¿Va esta?</div>
      <div class="polaroid"><img src="${url}" alt=""></div>
      <h2>${esc(m.t)}</h2>
      <div class="row" style="justify-content:center"><button class="btn ghost" id="otra">Sacar otra</button><button class="btn" id="usar" data-mudo style="--c:var(--mint)">Usar esta</button></div></div>`,
    (bg) => {
      bg.querySelector('#otra').addEventListener('click', () => { bg.remove(); askPhoto(m); });
      bg.querySelector('#usar').addEventListener('click', () => { bg.remove(); showReward(m, url, S.addPhoto(m.id, url, m.xp)); });
    }, true);
  }
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
  function avisoFoto() {
    const n = S.figuritas(S.me), k = D.FOTO.figus - n;
    if (S.me === D.FOTO.ultimo) return 'Esto suma a la foto de todos. Vos aparecés cuando estén los demás.';
    if (k > 0) return `Te ${k === 1 ? 'falta 1 figurita' : 'faltan ' + k + ' figuritas'} para aparecer en la foto.`;
    if (k === 0) return '¡Ya aparecés en la foto del 8/12!';
    return 'Esto también suma a la foto de todos.';
  }
  function showReward(m, url, res) {
    const r = res.out[0];
    const serie = res.out.find((o) => o.ach === 'serie');
    const ganadas = (r ? r.coins : 0) + (serie ? D.ACH.serie.c : 0);
    if (ganadas) SONIDO.monedas(res.levelUp != null ? ganadas + 30 : ganadas);
    sheet(`<div class="reward" style="display:grid;gap:12px;justify-items:center">
      <div class="eyebrow">¡Figurita nueva!</div>
      <div class="polaroid pop"><img src="${url}" alt=""></div>
      <h2>${esc(m.t)}</h2>
      ${r ? `<div class="row" style="justify-content:center"><span class="chip" style="--c:var(--mint)">+${r.xp} XP</span><span class="chip" style="--c:var(--butter)">+${r.coins} <span class="coin"></span></span></div>` : '<p class="muted small">Cambiaste la foto de esta misión.</p>'}
      ${res.levelUp != null ? `<p style="margin:0"><b>Subiste al nivel ${res.levelUp + 1}:</b> ahora sos ${esc(D.LEVELS[res.levelUp].n)}. Te llegó un sobre de recuerdos.</p>` : ''}
      ${res.levelUp != null && D.COLECCION.tarjeta.some((x) => x.lv === res.levelUp + 1) ? `<p style="margin:0"><b>Tu tarjeta pasó a ${esc(tierDe(res.levelUp + 1).n.toLowerCase())}.</b></p>` : ''}
      ${serie ? `<p><b>Serie completa:</b> ${esc(D.SERIES.find((x) => x.id === serie.serie).n)}. +${D.ACH.serie.c} monedas y medallita.</p>` : ''}
      <p class="muted small">${esc(avisoFoto())}</p>
      <button class="btn" data-close>Seguir</button></div>`);
    render();
  }


  // ---------- más coleccionables: recuerdos, figuritas de amigos y tarjeta ----------
  // Recuerdos del verano pasado: las fotos viven en el bucket (recuerdos/), no en el repo. La lista se guarda para verla sin señal.
  let RECUERDOS = null;
  try { RECUERDOS = JSON.parse(localStorage.getItem('colonia.recuerdos')); } catch (e) { /* sin copia */ }
  fetch(S.artUrl('recuerdos/recuerdos.json'), { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((j) => {
    if (!j || !Array.isArray(j.items)) return;
    const cambio = JSON.stringify(j) !== JSON.stringify(RECUERDOS);
    RECUERDOS = j;
    try { localStorage.setItem('colonia.recuerdos', JSON.stringify(j)); } catch (e) { /* sin lugar */ }
    if (cambio && ['album', 'hoy'].includes(location.hash.slice(1))) render();
  }).catch(() => {});
  const recUrl = (id) => S.artUrl(`recuerdos/${id}.webp?v=${(RECUERDOS && RECUERDOS.v) || 1}`);
  const recuerdo = (id) => RECUERDOS && RECUERDOS.items.find((x) => x.id === id);
  const carasDe = (ids) => (ids && ids.length ? `<span class="mini-caras rec-caras">${ids.filter(person).map((id) => `<img class="face" src="${face(id)}" alt="${esc(person(id).n)}" title="${esc(person(id).n)}">`).join('')}</span>` : '');
  // Al entrar avisa una vez si hay sobres; después se abren desde Hoy o el álbum.
  let sobresAvisados = false;
  function mostrarSobres(forzar) {
    const r = location.hash.slice(1);
    if (!forzar && (sobresAvisados || !S.me || !r || r === 'portada' || r === 'quien' || document.hidden || document.querySelector('.sheet-bg'))) return false;
    if (!S.sobres() || !RECUERDOS) return false;
    sobresAvisados = true;
    sheet('<div class="sobre-hoja" id="sobreHoja"></div>', (bg) => {
      const box = bg.querySelector('#sobreHoja');
      const abrir = () => {
        const it = S.abrirSobre(RECUERDOS.items);
        if (!it) { bg.remove(); return; }
        SONIDO.plop(); setTimeout(SONIDO.plop, 130);
        const mas = S.sobres();
        const botones = mas ? `<button class="btn ghost" data-close>Listo</button><button class="btn" id="otro" style="--c:var(--rose)">Abrir otro (${mas})</button>` : '<button class="btn" data-close>Listo</button>';
        if (it.repetido) {
          SONIDO.monedas(D.COLECCION.sobres.repetido);
          box.innerHTML = `<div class="eyebrow">Ya tenés todos los recuerdos</div><h2>Este sobre trae monedas</h2>
            <span class="chip" style="--c:var(--butter)">+${D.COLECCION.sobres.repetido} <span class="coin"></span></span><div class="row" style="justify-content:center">${botones}</div>`;
        } else {
          if (it.suerte) SONIDO.monedas(it.suerte);
          box.innerHTML = `<div class="eyebrow">${it.mala ? '¡Uy! De la mala suerte' : it.suerte != null ? '¡De la suerte!' : 'Recuerdo del verano pasado'}</div>
            <div class="polaroid recuerdo-grande pop${it.suerte != null ? ' suerte' : ''}"><img src="${recUrl(it.id)}" alt=""></div>
            <h2>${esc(it.t)}</h2>${carasDe(it.p)}
            ${it.suerte ? `<span class="chip" style="--c:var(--butter)">+${it.suerte} <span class="coin"></span></span>` : ''}
            ${it.mala ? '<p class="small muted" style="margin:0">Tranqui: la mala suerte te dejó un sobre extra.</p>' : ''}
            <p class="small muted" style="margin:0">Tenés ${S.misRecuerdos().length} de ${RECUERDOS.items.length}.</p>
            <div class="row" style="justify-content:center">${botones}</div>`;
        }
        const o = box.querySelector('#otro'); if (o) o.addEventListener('click', abrir);
        render();
      };
      const n = S.sobres();
      box.innerHTML = `<div class="eyebrow">Recuerdos del verano pasado</div>
        <button class="sobre" id="abrirSobre" aria-label="Abrir el sobre"><span class="sobre-sello" aria-hidden="true">♡</span></button>
        <h2>${n === 1 ? 'Tenés un sobre' : `Tenés ${n} sobres`}</h2>
        <p class="small muted" style="margin:0">Cada sobre trae una foto real del viaje anterior. A veces sale una de la suerte, que da monedas.</p>
        <div class="row" style="justify-content:center"><button class="btn ghost" data-close>Después</button><button class="btn" id="abrirSobre2" style="--c:var(--rose)">Abrirlo</button></div>`;
      box.querySelectorAll('#abrirSobre, #abrirSobre2').forEach((b) => b.addEventListener('click', abrir));
    });
    return true;
  }
  function verRecuerdo(id) {
    const it = recuerdo(id);
    if (!it) return;
    sheet(`<div class="sobre-hoja"><div class="polaroid recuerdo-grande${it.suerte != null ? ' suerte' : ''}"><img src="${recUrl(it.id)}" alt=""></div>
      <h2>${esc(it.t)}</h2>${carasDe(it.p)}<button class="btn" data-close>Listo</button></div>`);
  }

  // Figuritas de amigos: con 2 de 3 cosas (reaccionar a una foto suya, visitar su altarcito, regalarle algo).
  // Quienes juegan a distancia salen como polaroid, igual que en la foto del 8/12.
  const caraAmigo = (pid) => (person(pid).trip ? `<img class="amigo-sticker" src="${S.artUrl('amigos/' + pid + '.webp')}" alt="">`
    : `<span class="amigo-polaroid"><img src="${face(pid)}" alt=""></span>`);
  const pasosAmigo = (pid) => { const c = S.conAmigo(pid); return [['reac', 'Reaccionar a una foto suya'], ['visita', 'Visitar su altarcito'], ['regalo', 'Regalarle algo']].map(([k, t]) => ({ k, t, ok: c[k] })); };
  function revisarAmigos() {
    if (!S.me) return;
    const nuevos = D.PEOPLE.filter((p) => p.id !== S.me && !S.misAmigos().includes(p.id) && pasosAmigo(p.id).filter((x) => x.ok).length >= D.COLECCION.amigos.necesita);
    nuevos.forEach((p, i) => {
      const r = S.ganarAmigo(p.id);
      setTimeout(() => {
        toast(`<span class="mini-amigo">${caraAmigo(p.id)}</span><span>¡Conseguiste la figurita de <b>${esc(p.n)}</b>!${r === 'todos' ? ` Completaste todas: +${D.COLECCION.amigos.premio} monedas.` : ''}</span>`, 4500);
        if (r === 'todos') SONIDO.monedas(D.COLECCION.amigos.premio); else SONIDO.plop();
      }, i * 900);
    });
    if (nuevos.length && ['album', 'colonia'].includes(location.hash.slice(1)) && !document.querySelector('.sheet-bg')) setTimeout(render, 300);
  }
  function amigoSheet(pid) {
    const p = person(pid), tiene = S.misAmigos().includes(pid);
    sheet(`<div class="sobre-hoja"><div class="amigo-grande${tiene ? '' : ' falta'}">${caraAmigo(pid)}</div>
      <h2>${tiene ? `La figurita de ${esc(p.n)}` : `Te falta la de ${esc(p.n)}`}</h2>
      <ul class="pasos">${pasosAmigo(pid).map((x) => `<li class="${x.ok ? 'ok' : ''}"><span aria-hidden="true">${x.ok ? '✓' : '○'}</span>${esc(x.t)}</li>`).join('')}</ul>
      ${tiene ? '' : `<p class="small muted" style="margin:0">Con ${D.COLECCION.amigos.necesita} de las 3 es tuya.</p>`}
      <div class="row" style="justify-content:center"><button class="btn ghost" id="suAltar2">Visitar su altarcito</button><button class="btn" id="regalar2" style="--c:var(--rose)">Regalarle algo</button></div></div>`,
    (bg) => {
      bg.querySelector('#suAltar2').addEventListener('click', () => { bg.remove(); visit(pid); });
      bg.querySelector('#regalar2').addEventListener('click', () => { bg.remove(); regalarA = pid; go('kiosco'); });
    });
  }

  // Tu tarjeta sube de categoría con el nivel: bronce, plata y oro.
  const tierDe = (nivel) => [...D.COLECCION.tarjeta].reverse().find((t) => nivel >= t.lv) || null;
  const tierDePid = (pid) => tierDe(level(pid === S.me ? S.xp : S.xpOf(pid)).i + 1);

  function masColeccionables(medal) {
    const nv = level(S.xp).i + 1, yo = person(S.me);
    let recs = '';
    if (RECUERDOS) {
      const mios = new Set(S.misRecuerdos()), comunes = RECUERDOS.items.filter((x) => x.suerte == null), raras = RECUERDOS.items.filter((x) => x.suerte != null);
      const pol = (it) => (mios.has(it.id) ? `<button class="rec${it.suerte != null ? ' suerte' : ''}" data-rec="${it.id}" aria-label="${esc(it.t)}"><img src="${recUrl(it.id)}" alt="" loading="lazy"></button>`
        : `<span class="rec falta${it.suerte != null ? ' suerte' : ''}" aria-hidden="true">${it.suerte != null ? '✦' : '?'}</span>`);
      const tengo = (l) => l.filter((x) => mios.has(x.id)).length;
      recs = `<div class="card"><div class="spread"><div><h2>Recuerdos del verano pasado</h2><span class="small muted">${tengo(comunes)} de ${comunes.length} fotos reales del viaje anterior</span></div>
          ${S.sobres() ? `<button class="btn" data-sobres style="--c:var(--rose)">Abrir sobre (${S.sobres()})</button>` : medal(tengo(comunes) === comunes.length)}</div>
        <div class="recs">${comunes.map(pol).join('')}</div>
        <div class="eyebrow">De la suerte · ${tengo(raras)} de ${raras.length}</div><div class="recs">${raras.map(pol).join('')}</div>
        <p class="small muted" style="margin:0">Te llega un sobre por cada día que entrás y por cada nivel que subís.</p></div>`;
    }
    const amigos = D.PEOPLE.filter((p) => p.id !== S.me), mis = new Set(S.misAmigos());
    const amigosCard = `<div class="card"><div class="spread"><div><h2>Figuritas de amigos</h2><span class="small muted">${amigos.filter((p) => mis.has(p.id)).length} de ${amigos.length}</span></div>${medal(amigos.every((p) => mis.has(p.id)))}</div>
      <p class="small muted" style="margin:0">La de cada persona sale con 2 de estas 3: reaccionar a una foto suya, visitar su altarcito o regalarle algo. Con todas, +${D.COLECCION.amigos.premio} monedas.</p>
      <div class="amigos-grid">${amigos.map((p) => `<button class="amigo-slot${mis.has(p.id) ? '' : ' falta'}" data-amigo="${p.id}" aria-label="${esc(p.n)}${mis.has(p.id) ? '' : ': todavía no'}">${caraAmigo(p.id)}<span class="small">${esc(p.n)}</span></button>`).join('')}</div></div>`;
    const c = (CARTAS && CARTAS[S.me]) || {};
    const tarjeta = `<div class="card"><div><h2>Tu tarjeta</h2><span class="small muted">Sube de categoría con tu nivel. Vas por el ${nv}.</span></div>
      <div class="tiers">${D.COLECCION.tarjeta.map((t) => `<button class="tier${nv >= t.lv ? '' : ' falta'}" data-carta aria-label="Tarjeta de ${t.n.toLowerCase()}${nv >= t.lv ? '' : ', nivel ' + t.lv}">
        <span class="mini-carta tier-${t.id}" style="--el:${ELEMENTO[c.e] || 'var(--butter)'}"><img src="${face(S.me)}" alt=""><b>${esc(yo.n)}</b></span><span class="small">${t.n} · nivel ${t.lv}</span></button>`).join('')}</div></div>`;
    return `<h2 class="on-sky" style="font-size:1.3rem;margin:6px 0 0">Más coleccionables</h2>${recs}${amigosCard}${tarjeta}`;
  }

  // ---------- calendario ----------
  // Las fechas viven en el bucket (agenda/agenda.json), no en el repo público: se cambian sin volver a publicar la app.
  let AGENDA = null;
  try { AGENDA = JSON.parse(localStorage.getItem('colonia.agenda')); } catch (e) { /* sin copia */ }
  fetch(S.artUrl('agenda/agenda.json'), { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((j) => {
    if (!j || !Array.isArray(j.eventos)) return;
    const cambio = JSON.stringify(j) !== JSON.stringify(AGENDA);
    AGENDA = j;
    try { localStorage.setItem('colonia.agenda', JSON.stringify(j)); } catch (e) { /* sin lugar */ }
    if (cambio && ['hoy', 'calendario'].includes(location.hash.slice(1))) render();
  }).catch(() => {});
  const TIPO = { plan: ['var(--rose)', 'juntada'], gig: ['var(--coral)', 'show'], bday: ['var(--butter)', 'cumple'], trip: ['var(--mint)', 'costa'], out: ['var(--celeste)', 'alguien de viaje'] };
  const PRIORIDAD = ['trip', 'bday', 'gig', 'plan', 'out'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const dos = (n) => String(n).padStart(2, '0');
  const eventos = () => (AGENDA ? [...AGENDA.eventos].sort((a, b) => a.d.localeCompare(b.d)) : []);
  function cuando(dia) {
    const dd = Math.round((Date.parse(dia) - Date.parse(SKY.arDate())) / 864e5);
    if (dd === 0) return 'hoy';
    if (dd === 1) return 'mañana';
    const [y, m, d] = dia.split('-').map(Number);
    return dd > 1 && dd < 7 ? `${SEMANA[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d}` : `${d}/${m}`;
  }
  function evRow(e, etiqueta) {
    const caras = (e.p || []).filter(person).map((id) => `<img class="face" src="${face(id)}" alt="">`).join('');
    return `<li class="ev${e.d < SKY.arDate() ? ' paso' : ''}${e.k === 'hol' ? ' feriado' : ''}"><span class="ev-dia" style="--c:${TIPO[e.k] ? TIPO[e.k][0] : 'transparent'}">${etiqueta}</span>
      <span class="ev-t">${esc(e.t)}${e.n ? ` <small>· ${esc(e.n)}</small>` : ''}</span>${caras ? `<span class="ev-caras">${caras}</span>` : ''}</li>`;
  }
  function mesHTML(y, m, evs) {
    const hoy = SKY.arDate();
    const largo = new Date(Date.UTC(y, m, 0)).getUTCDate(), primero = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
    let g = 'LMMJVSD'.split('').map((x) => `<span class="dow">${x}</span>`).join('') + '<span></span>'.repeat(primero);
    for (let d = 1; d <= largo; d++) {
      const dia = `${y}-${dos(m)}-${dos(d)}`, ks = evs.filter((e) => e.d === dia).map((e) => e.k);
      if (dia >= SKY.TRIP.from && dia <= SKY.TRIP.to) ks.push('trip');
      const tipo = PRIORIDAD.find((k) => ks.includes(k)), c = ['d'];
      if (dia < AGENDA.desde || dia > AGENDA.hasta) c.push('fuera');
      else if (dia < hoy) c.push('paso');
      if (ks.includes('hol')) c.push('feriado');
      if (dia === hoy) c.push('hoy');
      if (tipo) c.push('marca');
      g += `<span class="${c.join(' ')}"${tipo ? ` style="--c:${TIPO[tipo][0]}"` : ''}${dia === hoy ? ' aria-current="date"' : ''}>${d}</span>`;
    }
    return `<div class="card mes"><div class="spread"><h2>${MESES[m - 1]}</h2><span class="muted">${y}</span></div>
      <div class="cal">${g}</div><ul class="evs del-mes">${evs.map((e) => evRow(e, Number(e.d.slice(8)))).join('')}</ul></div>`;
  }
  // Para Hoy: lo de hoy y lo que sigue (al menos tres cosas).
  function loQueViene() {
    const hoy = SKY.arDate(), prox = eventos().filter((e) => e.d >= hoy);
    if (!prox.length) return '';
    const n = Math.max(3, prox.filter((e) => e.d === hoy).length);
    return `<a href="#calendario" class="card" style="color:inherit;text-decoration:none"><div class="spread"><div class="eyebrow">Lo que viene</div><span class="small muted">ver el calendario</span></div>
      <ul class="evs">${prox.slice(0, n).map((e) => evRow(e, cuando(e.d))).join('')}</ul></a>`;
  }

  // ---------- capítulos ----------
  // Cuando cierra un capítulo no se borra nada: la app queda "entre capítulos", con su misión del día y un tablero de ideas para el que viene.
  const capHoy = () => D.CAPITULOS.find((c) => SKY.arDate() >= c.desde && SKY.arDate() <= c.hasta);
  const capCerrado = () => [...D.CAPITULOS].reverse().find((c) => SKY.arDate() > c.hasta);
  const entreCapitulos = () => !capHoy() && !!capCerrado();
  // El que viene se anuncia en agenda.json (bucket): "proximo": { "n": 2, "t": "…", "d": "2027-07-10" }.
  const proximo = () => (AGENDA && AGENDA.proximo && AGENDA.proximo.d ? AGENDA.proximo : null);
  const siguiente = () => (proximo() ? proximo().n : capCerrado().n + 1);
  let verTodas = false; // si abriste "Ver las otras", queda abierto aunque se vuelva a dibujar
  addEventListener('toggle', (e) => { if (e.target.classList && e.target.classList.contains('mas-ideas')) verTodas = e.target.open; }, true);
  function ideasCard() {
    const px = proximo(), ideas = S.ideas(), mia = ideas.find((i) => i.pid === S.me), c = countdown();
    const chip = !px ? 'se escribe entre todos' : typeof c.big === 'number' ? `${c.big} ${c.big === 1 ? 'día' : 'días'}` : c.big === 'Hoy' ? '¡arranca hoy!' : 'en marcha';
    const caras = (ids) => `<span class="mini-caras">${ids.map((id) => `<img class="face" src="${face(id)}" alt="">`).join('')}</span>`;
    const nota = (i) => {
      const yo = i.pid === S.me, on = i.sumos.includes(S.me);
      const pie = yo ? (i.sumos.length ? `<span class="sumo-pie small">${caras(i.sumos)} se suman</span>` : '<span class="sumo-pie small muted">la tuya</span>')
        : `<button class="sumo${on ? ' on' : ''}" data-sumo="${i.pid}" aria-pressed="${on}" data-mudo><span aria-hidden="true">${on ? '♥' : '♡'}</span> ${i.sumos.length ? caras(i.sumos) : 'me sumo'}</button>`;
      return `<li class="idea${yo ? ' mia' : ''}"><img class="face" src="${face(i.pid)}" alt=""><p><b>${esc(person(i.pid).n)}:</b> ${esc(i.t)}</p>${pie}</li>`;
    };
    return `<div class="card capitulo"><div class="spread"><div class="eyebrow">Capítulo ${siguiente()}${px && px.t ? ' · ' + esc(px.t) : ''}</div>
        <span class="chip" style="--c:var(--mint)">${chip}</span></div>
      <p class="small muted" style="margin:0">El capítulo ${capCerrado().n} terminó, la colonia no. ¿Qué hacemos en el que viene? Dejá tu idea y tocá ♡ en las que te copan.</p>
      ${ideas.length ? `<ul class="ideas">${ideas.slice(0, 4).map(nota).join('')}</ul>` : '<p class="small" style="margin:0">Todavía no hay ninguna. ¿Arrancás vos?</p>'}
      ${ideas.length > 4 ? `<details class="mas-ideas"${verTodas ? ' open' : ''}><summary class="small">Ver las otras ${ideas.length - 4}</summary><ul class="ideas">${ideas.slice(4).map(nota).join('')}</ul></details>` : ''}
      <div class="row" style="justify-content:center"><button class="btn ghost" data-resumen>Releer el capítulo ${capCerrado().n}</button><button class="btn" data-idea style="--c:var(--rose)">${mia ? 'Cambiar mi idea' : 'Dejar una idea'}</button></div></div>`;
  }
  function dejarIdea() {
    const mia = S.ideas().find((i) => i.pid === S.me);
    sheet(`<div style="display:grid;gap:12px">
      <h2>Tu idea para el capítulo ${siguiente()}</h2>
      <p class="small muted" style="margin:0">Un lugar, un plan, una fecha, algo que no puede faltar. La ve toda la colonia.</p>
      <textarea id="ideaT" class="campo" maxlength="120" rows="3" placeholder="Escribila acá">${mia ? esc(mia.t) : ''}</textarea>
      <div class="row" style="justify-content:center">${mia ? '<button class="btn ghost" id="ideaBorrar">Borrarla</button>' : '<button class="btn ghost" data-close>Cancelar</button>'}
        <button class="btn" id="ideaOk" style="--c:var(--mint)">Guardar</button></div></div>`,
    (bg) => {
      const t = bg.querySelector('#ideaT');
      setTimeout(() => t.focus(), 60);
      bg.querySelector('#ideaOk').addEventListener('click', () => {
        if (!t.value.trim()) return t.focus();
        S.setIdea(t.value); bg.remove(); render(); SONIDO.plop();
      });
      const borrar = bg.querySelector('#ideaBorrar');
      if (borrar) borrar.addEventListener('click', () => { S.setIdea(''); bg.remove(); render(); });
    });
  }
  // Una vez por persona, al entrar después de que cerró el capítulo (o cuando alguien lo quiere releer).
  function finDeCapitulo(releer) {
    const cap = capCerrado();
    if (!releer) {
      const r = location.hash.slice(1);
      if (!S.me || !cap || !entreCapitulos() || S.visto('capitulo:' + cap.n) || !r || r === 'portada' || r === 'quien' || document.hidden || document.querySelector('.sheet-bg')) return false;
      S.marcar('capitulo:' + cap.n);
    }
    const R0 = S.resumen(cap.hasta), L = level(S.xp);
    const estrellas = eventos().filter((e) => ['plan', 'gig', 'bday', 'trip'].includes(e.k) && e.d >= cap.desde && e.d <= cap.hasta).length;
    const datos = [[R0.fotos, 'fotos de la colonia'], [estrellas, 'estrellas en el calendario'], [R0.regalos, R0.regalos === 1 ? 'regalo' : 'regalos'], [R0.bocinas, 'bocinazos en la ruta']]
      .filter(([n]) => n > 0).map(([n, t]) => `<div class="dato"><b>${n}</b><span class="small">${t}</span></div>`).join('');
    sheet(`<div class="fin-capitulo">
      <div class="eyebrow">Temporada ${esc(cap.temporada)}</div>
      <h2>Fin del capítulo ${cap.n}</h2>
      <p class="lema">No se terminó la colonia: se dio vuelta la página.</p>
      ${datos ? `<div class="datos">${datos}</div>` : ''}
      <p class="small muted" style="margin:0">Vos: ${S.figuritas(S.me) ? `${S.figuritas(S.me)} ${S.figuritas(S.me) === 1 ? 'figurita' : 'figuritas'}, ` : ''}nivel ${esc(L.n)}.</p>
      <p style="margin:0">Todo lo que juntaron queda acá: el álbum, los altarcitos, la foto del 8/12 y las monedas. La app sigue abierta, con su misión del día, y el capítulo ${cap.n + 1} lo escribimos entre todos.</p>
      <div class="row" style="justify-content:center"><button class="btn ghost" id="fcFoto">Ver la foto del 8/12</button><button class="btn" id="fcIdea" style="--c:var(--rose)">${releer ? 'Listo' : 'Dejar una idea'}</button></div></div>`,
    (bg) => {
      bg.querySelector('#fcFoto').addEventListener('click', () => { bg.remove(); go('foto'); });
      bg.querySelector('#fcIdea').addEventListener('click', () => { bg.remove(); if (!releer) dejarIdea(); });
    });
    if (!releer) { SONIDO.plop(); setTimeout(SONIDO.plop, 160); }
    return true;
  }

  // ---------- la ruta (viernes 4 y sábado 5) ----------
  // Nadie compite: cada auto avanza cuando alguien que va en él sube la foto de la parada. Los demás le tocan bocina.
  const R = D.RUTA;
  const rutaVisible = () => ahoraAR() >= R.desde && SKY.arDate() <= R.ultimoDia;
  const rutaAbierta = () => ahoraAR() >= R.desde && SKY.arDate() <= SKY.TRIP.to;
  const miVehiculo = (pid = S.me) => R.vehiculos.find((v) => v.quien.includes(pid));
  function rutaMisiones() {
    const v = miVehiculo();
    if (!v || !rutaAbierta()) return [];
    return R.paradas.map((p) => ({ id: 'ruta-' + p.id, s: 'ruta', t: (v.micro && p.micro) || p.t, xp: R.xp }));
  }
  // La parada más lejana a la que llegó alguien de ese auto (−1: todavía no salió).
  const dondeVa = (v) => R.paradas.reduce((k, p, i) => (S.doneBy('ruta-' + p.id).some((x) => v.quien.includes(x.id)) ? i : k), -1);
  const dibujoVehiculo = (v) => (v.micro
    ? `<svg viewBox="0 0 58 28" aria-hidden="true"><g filter="url(#crayon)" stroke="#43365a" stroke-width="1.8" stroke-linejoin="round">
        <rect x="3" y="4.5" width="51" height="16.5" rx="3.5" fill="${v.col}"/>
        <path d="M7 8.5h6.5v5H7zM16 8.5h6.5v5H16zM25 8.5h6.5v5H25zM34 8.5h6.5v5H34zM46 8.5h5.5v7.5H46z" fill="#a9d6f0" stroke-width="1.3"/>
        <circle cx="14" cy="21.4" r="3.6" fill="#43365a"/><circle cx="44" cy="21.4" r="3.6" fill="#43365a"/></g></svg>`
    : `<svg viewBox="0 0 50 28" aria-hidden="true"><g filter="url(#crayon)" stroke="#43365a" stroke-width="1.8" stroke-linejoin="round">
        ${v.tabla ? '<path d="M14 6.6h20c3.5 0 3.5-2 0-2H14c-2.6 0-2.6 2 0 2z" fill="#ffe39a" stroke-width="1.4"/><path d="M24 4.6v2" stroke="#f6a38f" stroke-width="1.4"/>' : ''}
        <path d="M3 21v-5.5q0-3 3.5-3H14l4.5-4.5H31l6 4.5h6.5q3.5.3 3.5 3.5V21z" fill="${v.col}"/>
        <path d="M15.8 12.3l3.4-3.1H24v3.1zM25.6 12.3V9.2h4.9l4.1 3.1z" fill="#a9d6f0" stroke-width="1.3"/>
        <circle cx="13" cy="21.4" r="3.6" fill="#43365a"/><circle cx="37" cy="21.4" r="3.6" fill="#43365a"/></g></svg>`);
  function laRuta() {
    if (!rutaVisible()) return '';
    const yo = miVehiculo(), ultima = R.paradas.length - 1;
    const carriles = R.vehiculos.map((v) => {
      const k = dondeVa(v), p = R.paradas[k], mio = yo && yo.id === v.id, b = S.bocinas(v.id).total;
      const estado = k < 0 ? v.sale : p.va;
      const auto = mio
        ? `<span class="vehiculo" style="--x:${p ? p.x : 0}%">${dibujoVehiculo(v)}</span>`
        : `<button class="vehiculo" data-bocina="${v.id}" data-mudo style="--x:${p ? p.x : 0}%" aria-label="Tocarle bocina a ${esc(v.n.toLowerCase())}">${dibujoVehiculo(v)}</button>`;
      return `<div class="carril${k < 0 ? ' quieto' : k === ultima ? ' llego' : ' andando'}${v.micro ? ' es-micro' : ''}">
        <div class="pista">${[0, ...R.paradas.slice(1).map((x) => x.x)].map((x) => `<i style="--x:${x}%"></i>`).join('')}${auto}</div>
        <div class="carril-pie small"><span><b>${esc(v.n)}</b> ${esc(estado)}${mio ? ' · vas acá' : ''}<span class="muted" data-cuenta="${v.id}">${b ? ` · ${b} ${b === 1 ? 'bocinazo' : 'bocinazos'}` : ''}</span></span>
          <span class="mini-caras">${v.quien.map((id) => `<img class="face" src="${face(id)}" alt="">`).join('')}</span></div></div>`;
    }).join('');
    const sig = yo ? rutaMisiones()[dondeVa(yo) + 1] : null;
    const llegaron = R.vehiculos.every((v) => dondeVa(v) === ultima);
    return `<div class="card ruta"><div class="spread"><div class="eyebrow">La ruta</div><span class="small muted">${llegaron ? 'llegamos todos' : 'tocá un auto para tocarle bocina'}</span></div>
      <div class="ruta-ext small muted"><span>La Plata</span><span>Costa Esmeralda</span></div>${carriles}
      ${sig ? `<div class="list">${mRow(sig, 'La saca quien no maneja')}</div>` : ''}
      <button class="btn ghost" data-juego>Jugar a ¿Quién de la colonia…?</button></div>`;
  }
  function tocarBocina(btn) {
    const id = btn.dataset.bocina;
    S.bocinar(id); SONIDO.bocina();
    btn.classList.remove('pip'); void btn.offsetWidth; btn.classList.add('pip');
    const g = document.createElement('span'); g.className = 'globo'; g.textContent = '¡mec mec!';
    btn.appendChild(g); setTimeout(() => g.remove(), 900);
    const b = S.bocinas(id).total, c = screen.querySelector(`[data-cuenta="${id}"]`);
    if (c) c.textContent = ` · ${b} ${b === 1 ? 'bocinazo' : 'bocinazos'}`;
  }
  // A quienes van en un auto les llega el aviso cuando alguien les toca bocina.
  let bocinasVistas = null;
  function avisarBocinas() {
    const v = miVehiculo();
    if (!v || !rutaVisible()) return;
    const ahora = S.bocinas(v.id).por, antes = bocinasVistas;
    bocinasVistas = ahora;
    if (!antes) return;
    const quienes = Object.keys(ahora).filter((id) => ahora[id] > (antes[id] || 0)).map((id) => person(id).n);
    if (!quienes.length) return;
    SONIDO.bocina(true);
    const lista = quienes.length === 1 ? quienes[0] : quienes.slice(0, -1).join(', ') + ' y ' + quienes[quienes.length - 1];
    toast(`<span>${esc(lista)} ${v.quien.length > 1 ? 'les' : 'te'} ${quienes.length > 1 ? 'tocaron' : 'tocó'} bocina.</span>`);
  }

  // ---------- juego para el auto: ¿Quién de la colonia…? ----------
  // Las preguntas con respuesta salen de las tarjetas; las de señalar no tienen respuesta. No hay puntos ni ganadores.
  function preguntasJuego() {
    const out = [], sin = new Set(D.JUEGO.sin), repetidas = {};
    if (CARTAS) {
      Object.values(CARTAS).forEach((c) => (c.hab || []).forEach(([h]) => { repetidas[h] = (repetidas[h] || 0) + 1; }));
      D.PEOPLE.forEach(({ id }) => {
        const c = CARTAS[id];
        if (!c) return;
        const add = (campo, q) => { if (c[campo] && !sin.has(id + '.' + campo)) out.push({ q, who: id }); };
        add('t', `¿Quién es «${c.t}»?`);
        add('apodo', `¿A quién le dicen «${c.apodo}»?`);
        add('poder', `¿De quién es este poder? «${c.poder}»`);
        add('deb', `¿De quién es esta debilidad? «${c.deb}»`);
        add('dato', `¿De quién es este dato del chat? «${c.dato}»`);
        (c.hab || []).filter(([h, n]) => n >= 10 && repetidas[h] === 1).forEach(([h, n]) => out.push({ q: `¿Quién tiene ${h[0].toLowerCase() + h.slice(1)} ${n} en su tarjeta?`, who: id }));
      });
    }
    const mezcla = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const senalar = mezcla(D.JUEGO.senalar.map((t) => ({ q: `¿Quién de la colonia es más probable que ${t}?` })));
    // Una de señalar cada tres de las otras.
    const con = mezcla(out), res = [];
    while (con.length || senalar.length) { res.push(...con.splice(0, 3)); if (senalar.length) res.push(senalar.shift()); }
    return res;
  }
  function juego() {
    const qs = preguntasJuego();
    let i = 0;
    sheet('<div class="juego"></div>', (bg) => {
      const box = bg.querySelector('.juego');
      const pintar = (ver) => {
        const p = qs[i % qs.length];
        box.innerHTML = `<div class="eyebrow">¿Quién de la colonia…?</div>
          <p class="juego-q">${esc(p.q)}</p>
          ${p.who ? (ver ? `<div class="juego-r pop"><img class="face" src="${face(p.who)}" alt=""><b>${esc(person(p.who).n)}</b></div>` : '<p class="small muted" style="margin:0">Alguien lee en voz alta y el resto adivina.</p>')
            : '<p class="small muted" style="margin:0">A la cuenta de tres, todos señalan a alguien.</p>'}
          <div class="row" style="justify-content:center"><button class="btn ghost" data-close>Cerrar</button>
            ${p.who && !ver ? '<button class="btn" id="verQuien" style="--c:var(--lav)">Ver quién es</button>' : '<button class="btn" id="otra" style="--c:var(--mint)">Otra</button>'}</div>`;
        const v = box.querySelector('#verQuien'), o = box.querySelector('#otra');
        if (v) v.addEventListener('click', () => pintar(true));
        if (o) o.addEventListener('click', () => { i += 1; pintar(false); });
      };
      pintar(false);
    });
  }

  // ---------- pantallas ----------
  function top() {
    const st = SKY.state(), L = level(S.xp);
    return `<header class="top"><button class="yo" data-carta aria-label="Ver mi tarjeta"><img class="face" src="${face(S.me)}" alt="">
      <span class="who"><b>${esc(person(S.me).n)}</b><span class="on-sky-soft small">${esc(L.n)} · nivel ${L.i + 1}</span></span></button>
      <button class="chip" data-monedas style="--c:var(--butter)" aria-label="${S.coins} monedas: cómo conseguir más">${S.coins} <span class="coin"></span></button></header>
      <div class="weather small">${esc(weatherLine(st))}</div>`;
  }

  function mRow(m, extra = '') {
    if (trabada(m)) {
      return `<button class="mis trabada" data-m="${m.id}" aria-disabled="true"><span class="thumb empty">${IC.sombrilla}</span>
        <span class="t">${esc(m.t)}<small>${CUANDO_COSTA}</small></span><span class="chip" style="--c:var(--paper)">+${m.xp}</span></button>`;
    }
    const ph = S.photo(m.id);
    return `<button class="mis" data-m="${m.id}">${ph ? `<img class="thumb" src="${ph}" alt="">` : `<span class="thumb empty">${IC.camara}</span>`}
      <span class="t">${esc(m.t)}${extra ? `<small>${extra}</small>` : ''}</span>
      <span class="chip" style="--c:${ph ? 'var(--mint)' : 'var(--paper)'}">${ph ? 'hecha' : '+' + m.xp}</span></button>`;
  }
  const allMissions = () => [daily(), D.DUO, ...rutaMisiones(), ...secretasDe(S.me, SKY.arDate()), ...secretasHasta(), ...D.MISSIONS];
  function bindMissions(root) {
    root.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => {
      const m = allMissions().find((x) => x.id === b.dataset.m);
      if (trabada(m)) return toast(`<span>${CUANDO_COSTA}, cuando ya estemos todos allá.</span>`);
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
      const st = SKY.state(), c = countdown(), cap = capHoy(), px = proximo();
      // Durante un capítulo, cuál es; entre capítulos, el que viene.
      const arriba = cap ? `capítulo ${cap.n} · temporada ${cap.temporada}` : entreCapitulos() ? 'entre capítulos' : 'temporada 26/27';
      const sub = cap || !entreCapitulos() ? 'Costa Esmeralda · 4 al 8 de diciembre' : `Capítulo ${siguiente()} · ${px && px.t ? px.t : 'se escribe entre todos'}`;
      screen.innerHTML = `<section class="cover">
        <button class="sonido" id="sonido" data-mudo aria-label="Música del inicio"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="6.500" cy="18" r="2.500"/><circle cx="16.500" cy="16" r="2.500"/><path class="tacha" d="M3 3l18 18"/></svg></button>
        <div class="eyebrow on-sky-soft">${esc(arriba)}</div>
        <h1>Colonia</h1>
        <div class="sub">${esc(sub)}</div>
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
        <div class="on-sky-soft small" id="oir" hidden>tocá la playa para escuchar</div>
        <button class="btn ghost mirar" id="mirar">Mirar el mar</button>
      </section>`;
      $('#enter').addEventListener('click', () => go(S.me ? 'hoy' : 'quien'));
      $('#sonido').addEventListener('click', INICIO.alternar);
      $('#mirar').addEventListener('click', () => {
        document.body.classList.add('quieto');
        setTimeout(() => addEventListener('click', () => document.body.classList.remove('quieto'), { once: true, capture: true }), 0);
      });
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
      const d = daily(), c = countdown(), me = person(S.me), antesFoto = SKY.arDate() <= SKY.TRIP.to;
      const hoyS = secretasDe(S.me, SKY.arDate());
      const atras = secretasHasta().filter((m) => m.dia !== SKY.arDate() && !S.photo(m.id)).length;
      const enLaCasa = !rutaVisible() && SKY.arDate() > R.ultimoDia && SKY.arDate() <= SKY.TRIP.to;
      screen.innerHTML = `${top()}
        <p class="on-sky-soft como">Sacá la foto que pide cada misión: se vuelve figurita en tu álbum y te da monedas para tu altarcito${antesFoto ? `. Con ${D.FOTO.figus} figuritas aparecés en la foto del 8/12` : ''}.</p>
        ${enLineaHTML()}
        ${laRuta()}
        ${entreCapitulos() ? ideasCard() : ''}
        <div class="card"><div class="spread"><div class="eyebrow">Misión del día</div><span class="chip">${c.big} ${esc(c.small)}</span></div>
          <div class="list">${mRow(d, 'Sacá la foto y se vuelve figurita')}</div></div>
        ${S.sobres() && RECUERDOS ? `<button class="card sobres-hoy" data-sobres><span class="sobre chico" aria-hidden="true"><span class="sobre-sello">♡</span></span><span><b>${S.sobres() === 1 ? 'Tenés un sobre sin abrir' : `Tenés ${S.sobres()} sobres sin abrir`}</b><br><span class="small muted">Recuerdos del verano pasado</span></span><span class="chip" style="--c:var(--rose)">Abrir</span></button>` : ''}
        <div class="card dark"><div class="spread"><div class="eyebrow">Tus misiones secretas</div><span class="small muted">dos nuevas por día</span></div>
          ${S.secretSeen() ? `<div class="list">${hoyS.map((m) => mRow(m, 'No se la muestres a nadie')).join('')}</div>${atras ? `<a class="small" href="#album" style="color:var(--b-soft)">Tenés ${atras} ${atras === 1 ? 'pendiente' : 'pendientes'} de días anteriores</a>` : ''}`
            : `<div class="secret-cover"><span class="muted">Solo vos podés verlas.${me.trip ? '' : ' Valen desde donde estés.'}</span><button class="btn" id="seeSecret" style="--c:var(--lav)">Ver las de hoy</button></div>`}</div>
        ${loQueViene()}
        ${enLaCasa ? '<button class="btn" data-juego style="--c:var(--lav)">Jugar a ¿Quién de la colonia…?</button>' : ''}
        <a class="btn a-playa" href="#portada" style="--c:var(--celeste)">Ir a mirar el mar</a>`;
      bindMissions(screen);
      const b = $('#seeSecret'); if (b) b.addEventListener('click', () => { S.seeSecret(); render(); });
    },

    calendario() {
      const c = countdown(), hoy = SKY.arDate();
      const titulo = `${top()}<div class="spread"><h1 class="on-sky" style="font-size:1.7rem">Calendario</h1><a class="btn ghost" href="#hoy" style="text-decoration:none">Volver a Hoy</a></div>`;
      if (!AGENDA) { screen.innerHTML = `${titulo}<div class="card"><p class="muted" style="margin:0">Buscando las fechas… Si no tenés señal, aparecen cuando vuelva.</p></div>`; return; }
      const evs = eventos(), [y0, m0] = AGENDA.desde.split('-').map(Number), fin = AGENDA.hasta.slice(0, 7);
      const meses = [];
      for (let y = y0, m = m0; `${y}-${dos(m)}` <= fin; m === 12 ? ((y += 1), (m = 1)) : (m += 1)) meses.push([y, m]);
      const estrellas = evs.filter((e) => ['plan', 'gig', 'bday', 'trip'].includes(e.k));
      const pasaron = estrellas.filter((e) => e.d < hoy).length;
      const estrella = (on) => `<svg class="${on ? 'on' : ''}" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 .9l1.5 3.2 3.5.4-2.6 2.4.7 3.5L6 8.7 2.9 10.4l.7-3.5L1 4.5l3.5-.4z"/></svg>`;
      const [, mh, dh] = AGENDA.hasta.split('-').map(Number), [, md, dd] = AGENDA.desde.split('-').map(Number);
      screen.innerHTML = `${titulo}
        <div class="card"><div class="spread"><div class="eyebrow">Temporada 26/27</div><span class="chip" style="--c:var(--mint)">${c.big} ${esc(c.small)}</span></div>
          <p class="small muted" style="margin:0">Del ${dd}/${md} al ${dh}/${mh}. Cada estrella es una juntada, un show o un cumple: se pinta cuando ya pasó.</p>
          <p class="small" style="margin:0">${entreCapitulos() ? 'El capítulo 1 ya cerró, la colonia no: todo lo que juntaron sigue acá y el que viene se escribe entre todos.'
            : 'El 10/1 cierra el capítulo 1, no la app: lo que junten queda guardado y en 2027 la colonia sigue con el capítulo 2.'}</p>
          <div class="estrellas" role="img" aria-label="${pasaron} de ${estrellas.length}">${estrellas.map((e) => estrella(e.d < hoy)).join('')}</div></div>
        ${meses.map(([y, m]) => mesHTML(y, m, evs.filter((e) => e.d.startsWith(`${y}-${dos(m)}`)))).join('')}
        <div class="card"><div class="leyenda small">${Object.values(TIPO).map(([col, n]) => `<span style="--c:${col}">${n}</span>`).join('')}<span class="feriado">feriado</span></div></div>`;
    },

    // Álbum: cada figurita es una misión. Vacía, dice qué foto sacar; llena, tiene tu foto. Solo se ven las que se pueden hacer.
    album() {
      const medal = (on) => `<svg class="medal" viewBox="0 0 46 46"><g filter="url(#crayon)" stroke="#43365a" stroke-width="2.2"><path d="M15 3l8 14 8-14" fill="${on ? '#a9d6f0' : 'none'}"/><circle cx="23" cy="28" r="14" fill="${on ? '#ffe39a' : '#fffaf1'}" stroke-dasharray="${on ? '0' : '4 4'}"/><path d="M23 20l2.4 5 5.4.6-4 3.7 1.1 5.3-4.9-2.7-4.9 2.7 1.1-5.3-4-3.7 5.4-.6z" fill="${on ? '#f6a38f' : 'none'}"/></g></svg>`;
      const me = person(S.me), fst = fotoState(), antesFoto = SKY.arDate() <= SKY.TRIP.to;
      const slot = (m, conteo) => {
        const ph = S.photo(m.id), n = conteo ? S.doneBy(m.id).length : 0;
        return `<button class="slot${ph ? '' : ' vacia'}" data-a="${m.id}" aria-label="${esc(m.t)}${ph ? '' : ': sacar la foto'}">${ph ? `<img src="${ph}" alt="">` : `<span class="ph">${IC.camara}<span>${esc(m.t)}</span></span>`}${n ? `<span class="chip n" style="--c:var(--paper)">${n}/${D.PEOPLE.length}</span>` : ''}</button>`;
      };
      const tarjeta = (titulo, nota, ms, todas, conteo = true) => {
        if (!ms.length) return '';
        const done = ms.filter((m) => S.photo(m.id)).length;
        return `<div class="card"><div class="spread"><div><h2>${esc(titulo)}</h2><span class="small muted">${nota || `${done} de ${ms.length} figuritas`}</span></div>${todas ? medal(todas.every((m) => S.photo(m.id))) : ''}</div>
          <div class="slots">${ms.map((m) => slot(m, conteo)).join('')}</div></div>`;
      };
      const dias = Object.keys(S.photos()).filter((k) => k.startsWith('dia-')).sort().reverse().map((id) => ({ id, t: misionDe(id) }));
      const ruta = miVehiculo() && (rutaAbierta() || R.paradas.some((p) => S.photo('ruta-' + p.id))) ? R.paradas.map((p) => ({ id: 'ruta-' + p.id, t: (miVehiculo().micro && p.micro) || p.t, xp: R.xp })) : [];
      const series = D.SERIES.filter((s) => s.id !== 'dia').map((s) => {
        const todas = D.MISSIONS.filter((m) => m.s === s.id);
        return tarjeta(s.n, null, todas.filter((m) => !trabada(m)), todas);
      }).join('');
      screen.innerHTML = `${top()}<h1 class="on-sky" style="font-size:1.7rem">Álbum</h1>
        <p class="on-sky-soft" style="margin:0">Cada figurita es una misión: tocá una vacía, sacá la foto que pide y queda pegada.${me.trip ? '' : ' Las podés hacer desde donde estés.'}</p>
        <div class="card album-resumen"><div class="spread"><b style="font-family:var(--display);font-size:1.3rem">${S.figuritas(S.me)} ${S.figuritas(S.me) === 1 ? 'figurita' : 'figuritas'}</b><span class="chip" style="--c:var(--butter)">+10 <span class="coin"></span> cada una</span></div>
          ${antesFoto ? `<a href="#foto" class="small" style="color:inherit">${fst.people.has(S.me) ? 'Ya estás en la foto del 8/12 ♡' : S.me === D.FOTO.ultimo ? 'Aparecés último en la foto del 8/12, cuando estén todos' : esc(estadoEnFoto(S.me, fst)) + ' para aparecer en la foto del 8/12'}</a>` : ''}</div>
        ${tarjeta('La ruta', 'Cuando alguien de tu auto sube la foto de una parada, el auto avanza en Hoy.', ruta, null, false)}
        ${series}
        ${tarjeta('De a dos', 'Una para hacer con alguien.', [D.DUO], null)}
        ${tarjeta('Del día', `${dias.length} ${dias.length === 1 ? 'misión del día hecha' : 'misiones del día hechas'}`, dias, null, false)}
        ${secretasCard()}
        ${masColeccionables(medal)}`;
      bindMissions(screen);
      screen.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
        const id = b.dataset.a;
        const m = allMissions().find((x) => x.id === id) || { id, t: tituloFoto(id), xp: 20 };
        const who = new Set(S.doneBy(id).map((p) => p.id));
        const strip = D.PEOPLE.filter((p) => p.id !== S.me && who.has(p.id)).map((p) => {
          const theirs = S.photoOf(p.id, id);
          return `<figure>${theirs ? `<img class="sq" src="${theirs}" alt="" loading="lazy">` : `<img class="sq" src="${face(p.id)}" alt="" style="filter:saturate(.5) sepia(.25)">`}<figcaption>${esc(p.n)}</figcaption></figure>`;
        }).join('');
        const hecha = S.photo(id);
        sheet(`<div style="display:grid;gap:12px;justify-items:center;text-align:center">
          ${hecha ? `<div class="polaroid"><img src="${hecha}" alt=""></div>` : ''}
          <h2>${esc(m.t)}</h2>
          ${hecha ? '' : `<p class="small muted" style="margin:0">Sacá esta foto y se vuelve tu figurita: +${m.xp || 20} de experiencia y +10 monedas.</p>`}
          ${strip ? `<div style="width:100%;text-align:left"><div class="eyebrow">${hecha ? 'Las de los demás' : 'Ya la sacaron'}</div><div class="strip">${strip}</div></div>` : ''}
          <div class="row" style="justify-content:center">${hecha ? '<button class="btn ghost" id="go">Cambiar mi foto</button><button class="btn" data-close>Listo</button>'
            : `<button class="btn ghost" data-close>${NAH}</button><button class="btn" id="go" style="--c:var(--mint)">Sacar la foto</button>`}</div></div>`,
        (bg) => { const g = bg.querySelector('#go'); if (g) g.addEventListener('click', () => { bg.remove(); askPhoto(m); }); });
      }));
    },

    // Colonia: las fotos de todos, de la más nueva a la más vieja, con reacciones. Arriba las tarjetas; abajo, los vestigios de la beta.
    colonia() {
      const fotos = S.fotosColonia(), ver = fotos.slice(0, verFotos);
      const tarjetas = [S.me, ...D.PEOPLE.map((p) => p.id).filter((id) => id !== S.me)].map((id) => {
        const c = (CARTAS && CARTAS[id]) || {}, n = esc(person(id).n);
        const tr = tierDePid(id);
        return `<button class="mini-carta${c.foil ? ' foil' : ''}${tr ? ' tier-' + tr.id : ''}" data-carta="${id}" style="--el:${ELEMENTO[c.e] || 'var(--butter)'}" aria-label="Ver la tarjeta de ${n}"><img src="${face(id)}" alt=""><b>${n}</b></button>`;
      }).join('');
      screen.innerHTML = `${top()}<h1 class="on-sky" style="font-size:1.7rem">Colonia</h1>
        ${balanceHTML()}
        <p class="on-sky-soft" style="margin:0">Las fotos de todos, de la más nueva a la más vieja. Reaccioná con un toque.</p>
        ${ver.length ? ver.map(postHTML).join('') : '<div class="card"><p class="muted" style="margin:0">Todavía nadie subió fotos. Sacá la primera desde el álbum.</p></div>'}
        ${fotos.length > verFotos ? `<button class="btn" id="masFotos" style="--c:var(--paper);justify-self:center">Ver más fotos (${fotos.length - verFotos})</button>` : ''}
        <div class="card"><div><h2>Tarjetas de la colonia</h2><span class="small muted">Tocá a alguien para ver la suya y visitar su altarcito.</span></div><div class="tarjetas">${tarjetas}</div></div>
        <div class="card"><div><h2>Vestigios de la beta</h2><span class="small muted">Las primeras fotos de la colonia, de cuando la app todavía se estaba armando.</span></div>
          <div class="vestigios">${D.VESTIGIOS.map(([pid, mid], i) => `<button class="vest" data-vest="${i}" aria-label="Foto de ${esc(person(pid).n)}"><img src="${vestigioUrl(pid, mid)}" alt="" loading="lazy"><span class="small">${esc(person(pid).n)}</span></button>`).join('')}</div></div>
        ${DEMO ? '<p class="proto">Modo demo: las fotos de los demás se muestran con su cara.</p>' : ''}`;
      const mas = $('#masFotos'); if (mas) mas.addEventListener('click', () => { verFotos += 15; render(); });
      screen.querySelectorAll('[data-vest]').forEach((b) => b.addEventListener('click', () => {
        const [pid, mid, fecha] = D.VESTIGIOS[+b.dataset.vest];
        sheet(`<div style="display:grid;gap:12px;justify-items:center;text-align:center">
          <div class="polaroid"><img src="${vestigioUrl(pid, mid)}" alt=""></div>
          <h2>${esc(misionDe(mid))}</h2><p class="small muted" style="margin:0">De ${esc(person(pid).n)}, el ${fecha}, en plena beta.</p>
          <button class="btn" data-close>Listo</button></div>`);
      }));
    },

    altar() {
      screen.innerHTML = `${top()}
        <div class="spread"><h1 class="on-sky" style="font-size:1.7rem">Tu altarcito playero</h1><a class="btn" href="#kiosco" style="--c:var(--butter);text-decoration:none">Kiosco</a></div>
        <div class="card">${altarHTML(S.me, true)}
          <p class="small muted" style="margin:0">Mantené apretada una cosa para moverla. Tocala para verla, pintarla o guardarla. Con dos dedos te acercás.</p>${bolsaHTML()}
          ${nHallazgos() ? `<button class="btn ghost hallados-btn" id="misHallazgos">Lo que trajo el mar (${nHallazgos()})</button>` : ''}</div>
        <div class="card"><div class="eyebrow">Altarcitos de la colonia</div>
          <div class="faces visit">${D.PEOPLE.filter((p) => p.id !== S.me).map((p) => `<button class="pick" data-v="${p.id}"><img class="face" src="${face(p.id)}" alt=""><span class="small">${esc(p.n)}</span></button>`).join('')}</div></div>`;
      bindAltar(screen.querySelector('.altar'), true);
      screen.querySelectorAll('[data-out]').forEach((b) => b.addEventListener('click', () => {
        S.setPlace(b.dataset.out, { off: 0 });
        fresh.add(b.dataset.out);
        render();
      }));
      screen.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => visit(b.dataset.v)));
      const mh = $('#misHallazgos'); if (mh) mh.addEventListener('click', misHallazgos);
    },

    kiosco() {
      const L = S.level();
      const blockedFor = (it, pid) => it.side === 'R' && (it.id === 'sombrilla' ? S.hasRefugio(pid) : S.hasRefugio(pid, 'carpa'));
      const cell = (it) => {
        const locked = it.lv > L + 1, blocked = blockedFor(it, S.me);
        return `<button class="item${locked ? ' locked' : ''}" data-i="${it.id}" ${locked ? 'aria-disabled="true"' : ''}>
          <span class="ic" style="--c:var(--paper)">${ARTE.item(it.id, it.col)}</span>
          <span>${esc(it.n)}</span><span class="small">${locked ? 'nivel ' + it.lv : blocked ? 'ya tenés' : it.p + ' <span class="coin"></span>'}</span></button>`;
      };
      const grupo = (f) => D.SHOP.filter((x) => ARTE.has(x.id) && f(x)).sort((a, b) => a.p - b.p).map(cell).join('');
      const bloque = (t, nota, f) => { const h = grupo(f); return h ? `<div class="card"><div class="eyebrow">${t}</div>${nota ? `<p class="small muted" style="margin:0">${nota}</p>` : ''}<div class="shop">${h}</div></div>` : ''; };
      const para = regalarA && person(regalarA);
      screen.innerHTML = `${top()}
        <div class="spread"><h1 class="on-sky" style="font-size:1.7rem">Kiosco</h1>${para ? '<button class="btn ghost" id="noRegalar">Volver a su altarcito</button>' : '<a class="btn ghost" href="#altar" style="text-decoration:none">Volver al altarcito</a>'}</div>
        ${para ? `<div class="card para-quien"><img class="face" src="${face(para.id)}" alt=""><div><b>Elegí algo para ${esc(para.n)}</b><p class="small muted" style="margin:0">Va directo a su altarcito, con tu nombre.</p></div></div>`
          : '<p class="on-sky-soft" style="margin:0">Todo lo que comprás va a tu altarcito playero. Tocá tus monedas para ver cómo juntar más.</p>'}
        ${bloque('De fondo', 'Va atrás de todo. Si tenés la carpa, la sombrilla ya no hace falta.', (x) => x.side === 'R' || x.z === 'fondo')}
        ${bloque('En el mar', 'Flotan o saltan en el agua, detrás de la arena.', (x) => x.z === 'mar')}
        ${bloque('En la arena', '', (x) => x.side !== 'R' && !x.z)}`;
      screen.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => {
        const it = shopItem(b.dataset.i);
        if (it.lv > S.level() + 1) return toast(`<span>${esc(it.n)} se desbloquea en el nivel ${it.lv}.</span>`);
        const can = S.coins >= it.p, mineBlocked = blockedFor(it, S.me);
        const others = D.PEOPLE.filter((p) => p.id !== S.me && !blockedFor(it, p.id));
        const paraBlocked = para && blockedFor(it, para.id);
        const acciones = para
          ? (paraBlocked ? `<p class="small muted" style="margin:0">${esc(para.n)} ya tiene ${it.id === 'carpa' ? 'la carpa' : 'su refugio'}.</p>`
            : can ? `<button class="btn" id="aEsa" data-mudo style="--c:var(--rose)">Regalárselo a ${esc(para.n)}</button>` : `<p class="muted" style="margin:0">Te faltan ${it.p - S.coins} monedas.</p>`)
          : null;
        sheet(`<div style="display:grid;gap:12px;justify-items:center;text-align:center">
          <div class="art-big">${ARTE.item(it.id, it.col)}</div><h2>${esc(it.n)}</h2>
          ${it.sub ? `<p class="muted" style="margin:-6px 0 0">${esc(it.sub)}</p>` : ''}
          ${it.d ? `<p class="desc">${esc(it.d)}</p>` : ''}
          <span class="chip" style="--c:var(--butter)">${it.p} <span class="coin"></span></span>
          ${acciones !== null ? acciones : `${mineBlocked ? `<p class="small muted" style="margin:0">Ya tenés ${it.id === 'carpa' ? 'la carpa' : 'tu refugio'}. Se lo podés regalar a alguien.</p>` : ''}
          ${can ? `<div class="row" style="justify-content:center">${mineBlocked ? '' : '<button class="btn" id="forMe" data-mudo style="--c:var(--mint)">Para mí</button>'}<button class="btn" id="gift" style="--c:var(--rose)">Regalar</button></div>
            <div id="giftTo" hidden><p class="small muted" style="margin:0 0 8px">¿A quién?</p><div class="faces" style="grid-template-columns:repeat(4,1fr)">${others.map((p) => `<button class="pick" data-to="${p.id}" data-mudo><img class="face" src="${face(p.id)}" alt="" style="width:52px;height:52px"><span class="small">${esc(p.n)}</span></button>`).join('')}</div></div>`
            : `<p class="muted" style="margin:0">Te faltan ${it.p - S.coins} monedas.</p>`}`}
          <button class="btn ghost" data-close>${NAH}</button></div>`,
        (bg) => {
          const done = (to) => {
            const k = S.buy(it, to);
            if (!k) return;
            SONIDO.monedas(it.p, -1);
            bg.remove();
            if (to) {
              Promise.resolve(S.regaloEnCamino).then(() => setTimeout(revisarAmigos, 300));
              toast(`<span class="mini">${ARTE.item(it.id, it.col)}</span><span>Le regalaste ${esc(it.n.toLowerCase())} a ${esc(person(to).n)}. Ya está en su altarcito.</span>`);
              // Si venías de su altarcito, volvés ahí para verlo puesto.
              if (para) { regalarA = null; go('altar'); Promise.race([S.regaloEnCamino, new Promise((ok) => setTimeout(ok, 2500))]).then(() => visit(to)); } else render();
              return;
            }
            if (typeof k === 'string') fresh.add(k);
            go('altar');
          };
          const ae = bg.querySelector('#aEsa'); if (ae) ae.addEventListener('click', () => done(para.id));
          const fm = bg.querySelector('#forMe'); if (fm) fm.addEventListener('click', () => done(null));
          const gf = bg.querySelector('#gift'); if (gf) gf.addEventListener('click', () => { bg.querySelector('#giftTo').hidden = false; });
          bg.querySelectorAll('[data-to]').forEach((x) => x.addEventListener('click', () => done(x.dataset.to)));
        });
      }));
      const nr = $('#noRegalar');
      if (nr) nr.addEventListener('click', () => { const p = regalarA; regalarA = null; go('altar'); visit(p); });
    },

    foto() {
      const st = fotoState();
      const n = D.FOTO.pieces.filter((p) => st.pieces.has(p.id)).length;
      const hitos = D.FOTO.hitos.map((h) => `<div class="hito${st.prog >= h.at ? ' done' : ''}"><span class="dot">${st.prog >= h.at ? '✓' : h.fecha.length < 6 ? h.fecha : '★'}</span>
        <span><b>${esc(h.t)}</b> · ${esc(h.d)}<br><span class="small muted">${st.prog >= h.at ? 'Desbloqueado' : 'Se desbloquea con la foto al ' + Math.round(h.at * 100) + '%'}</span></span></div>`).join('');
      const people = D.PEOPLE.map((p) => `<button class="mate" data-v="${p.id}"><img class="face" src="${face(p.id)}" alt=""${st.people.has(p.id) ? '' : ' style="filter:grayscale(.6);opacity:.75"'}>
        <span><b>${esc(p.n)}</b><br><span class="small muted">${esc(estadoEnFoto(p.id, st))}${p.trip ? '' : ' · a distancia'}</span></span></button>`).join('');
      const ult = person(D.FOTO.ultimo).n, total = D.PEOPLE.length;
      screen.innerHTML = `${top()}<h1 class="on-sky" style="font-size:1.7rem">La foto</h1>
        <p class="on-sky-soft" style="margin:0">La del 8/12, antes de volver a La Plata. Cada uno aparece cuando sube sus primeras ${D.FOTO.figus} figuritas. ${esc(ult)} aparece último, cuando estén todos. El 8/12 se revela entera igual.</p>
        <div class="card"><div class="eyebrow">La colonia en la foto</div>
          <div class="spread"><b style="font-family:var(--display);font-size:1.4rem">${st.people.size} de ${total}</b><span class="small muted">${st.people.size === total ? '¡Estamos todos!' : st.faltan ? `${st.faltan === 1 ? 'falta 1' : 'faltan ' + st.faltan} para que aparezca ${esc(ult)}` : `solo falta ${esc(ult)}`}</span></div>
          <div class="bar barra-colonia"><i style="width:calc(${Math.round((st.people.size / total) * 100)}% - 4px)"></i></div>
          ${fotoHTML(st)}
          <div class="spread small"><span class="muted">Las cosas de la foto salen con las figuritas de todos</span><span class="muted">${n} de ${D.FOTO.pieces.length}</span></div>
          <div class="row small">${D.FOTO.pieces.map((p) => `<span class="chip" style="--c:${st.pieces.has(p.id) ? 'var(--mint)' : 'var(--paper)'}">${esc(p.n)}</span>`).join('')}</div></div>
        <div class="card"><div class="eyebrow">Lo que destraba</div>${hitos}<div class="hito"><span class="dot">8/12</span><span><b>El wrapped de la colonia</b> · el balance de todo el viaje<br><span class="small muted">Sale cuando termina el viaje, no depende de la foto</span></span></div></div>
        <div class="card"><div class="eyebrow">La colonia</div><p class="small muted" style="margin:0">Tocá a alguien para visitar su altarcito.</p><div class="people">${people}</div></div>
        ${DEMO ? '<p class="proto">Modo demo: el progreso de los demás es de ejemplo.</p>' : ''}`;
      screen.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => visit(b.dataset.v)));
    },
  };

  // ---------- tarjeta personal y monedas ----------
  // Las tarjetas viven en el bucket (cartas/), no en el repo público. Se guardan para verlas sin señal.
  let CARTAS = null;
  try { CARTAS = JSON.parse(localStorage.getItem('colonia.cartas')); } catch (e) { /* sin copia */ }
  fetch(S.artUrl('cartas/cartas.json?v=' + D.CARTAS_V), { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((j) => {
    if (!j) return;
    CARTAS = j;
    try { localStorage.setItem('colonia.cartas', JSON.stringify(j)); } catch (e) { /* sin lugar */ }
  }).catch(() => {});
  const ELEMENTO = { fuego: '#ffc8ad', tierra: '#bfe9d3', aire: '#bcdaf3', agua: '#cdbdf2' };
  const SIGNO = { Acuario: '♒', Sagitario: '♐', Leo: '♌', Capricornio: '♑', Piscis: '♓', Cáncer: '♋', Tauro: '♉', Géminis: '♊' };
  function carta(pid) {
    const p = person(pid), c = (CARTAS && CARTAS[pid]) || {}, L = level(pid === S.me ? S.xp : S.xpOf(pid));
    const hab = (c.hab || []).map(([k, n]) => `<div class="hab${n > 10 ? ' over' : ''}"><span>${esc(k)}</span><span class="nivel"><i style="width:${Math.min(n, 10) * 10}%"></i></span><b>${n}</b></div>`).join('');
    const tier = tierDePid(pid);
    sheet(`<div class="carta${c.foil ? ' foil' : ''}${tier ? ' tier-' + tier.id : ''}" style="--el:${ELEMENTO[c.e] || 'var(--butter)'}">
      <div class="carta-foto"><img src="${S.artUrl(`cartas/${pid}.webp?v=${D.CARTAS_V}`)}" alt="${esc(p.n)}"></div>
      <div class="carta-id"><h2>${esc(p.n)}</h2>${c.apodo ? `<p class="carta-apodo">${esc(c.apodo)}</p>` : ''}${c.t ? `<p>${esc(c.t)}</p>` : ''}
        <div class="row">${c.s ? `<span class="chip" style="--c:var(--el)">${SIGNO[c.s] || ''}&#xFE0E; ${esc(c.s)}</span>` : ''}<span class="chip">${esc(L.n)} · nivel ${L.i + 1}</span>${tier ? `<span class="chip tier-chip tier-${tier.id}">Tarjeta de ${tier.n.toLowerCase()}</span>` : ''}</div></div>
      ${c.bio ? `<p class="carta-bio">${esc(c.bio)}</p>` : ''}
      ${hab ? `<div class="carta-sec"><div class="eyebrow">Habilidades</div>${hab}</div>` : ''}
      ${c.poder ? `<div class="carta-sec"><div class="eyebrow">Poder</div><p>${esc(c.poder)}</p></div>` : ''}
      ${c.deb ? `<div class="carta-sec"><div class="eyebrow">Debilidad</div><p>${esc(c.deb)}</p></div>` : ''}
      ${c.dato ? `<p class="carta-dato">${esc(c.dato)}</p>` : ''}
      <div class="row" style="justify-content:center">${pid === S.me ? '' : '<button class="btn ghost" id="suAltar">Ver su altarcito</button>'}<button class="btn" data-close>Listo</button></div></div>`,
    (bg) => {
      const im = bg.querySelector('.carta-foto img'), al = bg.querySelector('#suAltar');
      im.addEventListener('error', () => { im.src = face(pid); }, { once: true });
      if (al) al.addEventListener('click', () => { bg.remove(); visit(pid); });
    });
  }
  function infoMonedas() {
    const fila = (t, c) => `<li><span>${esc(t)}</span><span class="chip" style="--c:var(--butter)">+${c} <span class="coin"></span></span></li>`;
    sheet(`<div class="plata">
      <div class="eyebrow">Tus monedas</div>
      <div class="plata-total">${S.coins} <span class="coin"></span></div>
      <div><h2>Cómo se consiguen</h2><ul>
        ${fila('Cada misión nueva con foto', 10)}
        ${fila('Entrar a la app cada día', D.ACH.entrada.c)}
        ${fila('Ser la primera persona de la mañana', D.ACH.matutino.c)}
        ${fila('Volver al día siguiente', D.ACH.racha2.c)}
        ${fila('Tres días seguidos o más, cada día', D.ACH.racha3.c)}
        ${fila('Entrar de madrugada', D.ACH.noctambulo.c)}
        ${fila('Completar una serie del álbum', D.ACH.serie.c)}
        ${fila('Hacer tu primer regalo', D.ACH.regalo.c)}
        <li><span>Vender algo de tu altarcito (lo regalado no)</span><span class="chip" style="--c:var(--butter)">80% <span class="coin"></span></span></li>
      </ul></div>
      <div><h2>Para qué sirven</h2><p>Se gastan en el kiosco: cosas para tu altarcito playero o regalos para el altarcito de otra persona. Lo más caro también pide subir de nivel.</p></div>
      <div class="row" style="justify-content:center"><button class="btn" id="irKiosco" style="--c:var(--butter)">Ir al kiosco</button><button class="btn ghost" data-close>Cerrar</button></div></div>`,
    (bg) => bg.querySelector('#irKiosco').addEventListener('click', () => { bg.remove(); go('kiosco'); }));
  }
  screen.addEventListener('click', (e) => {
    const t = e.target.closest('[data-carta]');
    if (t) carta(t.dataset.carta || S.me);
    else if (e.target.closest('[data-monedas]')) infoMonedas();
    else if (e.target.closest('[data-bocina]')) tocarBocina(e.target.closest('[data-bocina]'));
    else if (e.target.closest('[data-juego]')) juego();
    else if (e.target.closest('[data-idea]')) dejarIdea();
    else if (e.target.closest('[data-resumen]')) finDeCapitulo(true);
    else if (e.target.closest('[data-sumo]')) { S.sumarme(e.target.closest('[data-sumo]').dataset.sumo); SONIDO.plop(); render(); }
    else if (e.target.closest('[data-reac]')) reaccionar(e.target.closest('[data-reac]'));
    else if (e.target.closest('[data-sobres]')) mostrarSobres(true);
    else if (e.target.closest('[data-rec]')) verRecuerdo(e.target.closest('[data-rec]').dataset.rec);
    else if (e.target.closest('[data-amigo]')) amigoSheet(e.target.closest('[data-amigo]').dataset.amigo);
  });

  // ---------- sonido de cada botón ----------
  // "si" para lo que avanza; "no" para cerrar, cancelar o lo que está bloqueado. data-mudo: ya suena otra cosa (las monedas).
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.classList && t.classList.contains('sheet-bg')) { if (!t.dataset.firme) SONIDO.no(); return; }
    const b = t.closest && t.closest('button, a[href]');
    if (!b || b.hasAttribute('data-mudo')) return;
    if (b.matches('.cruz, .locked, [aria-disabled="true"], .ghost[data-close]')) SONIDO.no(); else SONIDO.si();
  }, true);

  // ---------- bienvenida diaria ----------
  function welcome() {
    const got = S.dailyCheck().map((k) => D.ACH[k]).concat(S.bonos());
    got.forEach((a, i) => setTimeout(() => toast(`<span class="chip" style="--c:var(--butter)">+${a.c} <span class="coin"></span></span><span>${esc(a.t)}</span>`), i * 700));
    if (got.length) { SONIDO.monedas(got.reduce((n, a) => n + a.c, 0)); setTimeout(render, got.length * 700); }
  }

  // ---------- regalos que llegaron ----------
  // Al entrar (o al volver a mirar la app) aparece lo que te regalaron y todavía no viste: la cosa y la cara de quien te la mandó.
  function mostrarRegalos() {
    const r = location.hash.slice(1);
    if (!S.me || !r || r === 'portada' || r === 'quien' || document.hidden || document.querySelector('.sheet-bg')) return;
    const nuevos = S.regalosNuevos().filter((g) => shopItem(g.item) && person(g.from));
    if (!nuevos.length) return;
    S.verRegalos(nuevos.map((g) => g.id));
    const uno = nuevos.length === 1, primero = nuevos[0];
    const fila = (g) => { const it = shopItem(g.item);
      return `<div class="regalo-fila"><img class="face" src="${face(g.from)}" alt=""><span><b>${esc(it.n)}</b><br><span class="small muted">de parte de ${esc(person(g.from).n)}</span></span><span class="mini">${ARTE.item(it.id, it.col)}</span></div>`; };
    const it1 = shopItem(primero.item);
    sheet(`<div class="regalo-nuevo">
      <div class="eyebrow">${uno ? '¡Te llegó un regalo!' : `¡Te llegaron ${nuevos.length} regalos!`}</div>
      ${uno ? `<div class="regalo-escena"><img class="face" src="${face(primero.from)}" alt=""><span class="lazo" aria-hidden="true">♡</span><div class="art-big pop">${ARTE.item(it1.id, it1.col)}</div></div>
        <h2>${esc(it1.n)}</h2><p class="regalado" style="margin:-8px 0 0">De parte de <b>${esc(person(primero.from).n)}</b> ♡</p>`
        : `<div class="regalo-lista">${nuevos.slice(0, 6).map(fila).join('')}</div>${nuevos.length > 6 ? `<p class="small muted" style="margin:0">Y ${nuevos.length - 6} más.</p>` : ''}`}
      <p class="small muted" style="margin:0">Ya está en tu altarcito.</p>
      <div class="row" style="justify-content:center"><button class="btn ghost" data-close>Listo</button><button class="btn" id="aMiAltar" style="--c:var(--rose)">Ver mi altarcito</button></div></div>`,
    (bg) => bg.querySelector('#aMiAltar').addEventListener('click', () => { bg.remove(); go('altar'); }));
    SONIDO.plop(); setTimeout(SONIDO.plop, 140);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(mostrarRegalos, 500); });

  // ---------- navegación ----------
  function go(r) { if (location.hash === '#' + r) render(); else location.hash = r; }
  function render() {
    let r = location.hash.slice(1) || 'portada';
    if (r === 'misiones') r = 'album'; // Misiones quedó adentro del álbum
    if (!SCREENS[r]) r = 'portada';
    if (r !== 'portada' && r !== 'quien' && !S.me) r = 'quien';
    if (r === 'quien' && S.me) r = 'hoy';
    if (r !== 'kiosco') regalarA = null; // el modo "regalarle a alguien" dura mientras estás en el kiosco
    SCREENS[r]();
    if (r === 'portada') INICIO.entrar(); else INICIO.salir();
    const tabs = $('#tabs');
    tabs.hidden = !S.me || r === 'portada';
    const cur = r === 'kiosco' ? 'altar' : r === 'calendario' ? 'hoy' : r;
    tabs.innerHTML = TABS.map(([k, l]) => `<a href="#${k}" class="${k === cur ? 'on' : ''}" ${k === cur ? 'aria-current="page"' : ''}>${IC[k]}<span>${l}</span></a>`).join('');
    const dev = $('#devbtn'); if (dev) dev.hidden = r === 'portada';
    if (r !== 'portada' && r !== 'quien') { setTimeout(() => finDeCapitulo() || mostrarRegalos() || mostrarSobres(), 700); setTimeout(revisarAmigos, 1800); setTimeout(avisarReacciones, 1400); setTimeout(avisarCosta, 1000); }
  }
  addEventListener('hashchange', () => { render(); scrollTo(0, 0); });
  SKY.onChange(() => { const r = location.hash.slice(1); if (r === 'portada' || r === '' || r === 'hoy' || r === 'calendario') { const w = document.querySelectorAll('.weather'); w.forEach((el) => (el.textContent = weatherLine(SKY.state()))); } });

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
        <label>La foto: <b id="cv">${Math.round(fotoProgress() * 100)}%</b><input type="range" id="cp" min="0" max="100" step="5" value="${Math.round(fotoProgress() * 100)}"></label>
        <div class="row"><button class="btn ghost" id="now">Volver a la hora real</button><button class="btn ghost" id="reset">Borrar todo y elegir de nuevo</button></div>
        <div class="row"><button class="btn ghost" data-traer="botella">Traer una botella</button><button class="btn ghost" data-traer="galleta">Traer una galleta</button></div>
        <button class="btn" data-close>Listo</button></div>`,
      (bg) => {
        bg.querySelector('#hr').addEventListener('input', (e) => { SKY.override.minute = +e.target.value; bg.querySelector('#hv').textContent = SKY.fmt(+e.target.value); SKY.paint(); });
        bg.querySelector('#kd').addEventListener('change', (e) => { SKY.override.kind = e.target.value === 'auto' ? null : e.target.value; SKY.paint(); render(); });
        bg.querySelector('#cp').addEventListener('input', (e) => { fotoOverride = +e.target.value / 100; bg.querySelector('#cv').textContent = e.target.value + '%'; render(); });
        bg.querySelector('#now').addEventListener('click', () => { SKY.override.minute = null; SKY.override.kind = null; fotoOverride = null; SKY.paint(); render(); bg.remove(); });
        bg.querySelector('#reset').addEventListener('click', () => { S.forget(); bg.remove(); go('quien'); });
        // Para mirarlas sin esperar: aparece hoy en tu altarcito (si ya abriste la de hoy, no vuelve).
        bg.querySelectorAll('[data-traer]').forEach((b) => b.addEventListener('click', () => { forzado[b.dataset.traer] = true; bg.remove(); go('altar'); }));
      });
    });
  }

  // ---------- quién está en la colonia ----------
  // Cuando alguien abre la app mientras vos la tenés abierta: un cartelito con su cara (una vez cada 3 h por persona).
  function avisarLlegada(pid) {
    if (!S.me || !person(pid) || document.hidden) return;
    let av = {};
    try { av = JSON.parse(localStorage.getItem('colonia.avisados')) || {}; } catch (e) { /* sin copia */ }
    if (Date.now() - (av[pid] || 0) < 3 * 36e5) return;
    av[pid] = Date.now();
    try { localStorage.setItem('colonia.avisados', JSON.stringify(av)); } catch (e) { /* sin lugar */ }
    toast(`<img class="face" src="${face(pid)}" alt="" style="width:40px;height:40px"><span><b>${esc(person(pid).n)}</b> está en la colonia</span>`, 4200);
    SONIDO.plop();
  }
  // En Hoy: las caritas de quienes tienen la app abierta ahora.
  function enLineaHTML() {
    const ids = S.me ? S.conectados().filter(person) : [];
    return `<div id="enLinea">${ids.length ? `<div class="en-linea"><span class="small">Ahora en la colonia</span><span class="caras">${ids.map((id) => `<button class="cara-linea" data-carta="${id}" aria-label="${esc(person(id).n)} está en la colonia: ver su tarjeta"><img class="face" src="${face(id)}" alt=""><i aria-hidden="true"></i></button>`).join('')}</span></div>` : ''}</div>`;
  }

  // Cambios de los demás en vivo: se vuelve a dibujar la pantalla (las hojas abiertas no se tocan).
  S.onChange((ev) => {
    if (ev && ev.llego) return avisarLlegada(ev.llego);
    if (ev && ev.presencia) { const el = $('#enLinea'); if (el) el.outerHTML = enLineaHTML(); return; }
    if (ev && ev.gift) setTimeout(mostrarRegalos, 300);
    if (ev && ev.uploadFailed) toast('<span>No se pudo subir la foto. Queda guardada y se reintenta cuando haya señal.</span>', 4500);
    avisarBocinas();
    if (!document.querySelector('.sheet-bg') && !dragging) render();
    avisarReacciones();
  });

  SKY.start();
  render();
  S.ready.then(() => { render(); avisarBocinas(); if (S.me) setTimeout(welcome, 400); });
  // Actualización sola: la app instalada queda abierta en segundo plano y vuelve sin recargar.
  // Al volver a mirarla se fija si hay versión nueva; si la hay, recarga cuando no estás haciendo nada.
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    const hadSW = !!navigator.serviceWorker.controller;
    let updated = false;
    const busy = () => dragging || !!pending || !!document.querySelector('.sheet-bg');
    const reload = () => { if (updated && !busy()) location.reload(); };
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadSW) { updated = true; reload(); } });
    navigator.serviceWorker.register('sw.js').then((reg) => {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
        else reload();
      });
      addEventListener('hashchange', reload);
    }).catch(() => {});
  }
})();
