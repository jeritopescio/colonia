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
    const faltan = [false, ...R.capas.map(locked)];
    const clave = (R.v || 0) + ':' + faltan.map((f) => (f ? 1 : 0)).join('');
    const abre = `<div class="capas ${R.silueta}${mini ? ' chica' : ''}" style="--ar:${R.ancho}/${R.alto}" role="img" aria-label="La foto de la colonia"`;
    if (R.silueta === 'papel' && FOTO_ARMADA.has(clave)) return `${abre}><img src="${FOTO_ARMADA.get(clave)}" alt="" draggable="false"></div>`;
    if (R.silueta === 'papel') fotoPorArmar = { clave, faltan, srcs: [R.base, ...R.capas.map((id) => 'foto/' + id + '.' + (R.ext || 'png'))].map((p) => S.artUrl(p + v)) };
    return `${abre} data-armar="${clave}">
      ${img(R.base)}${R.capas.map((id) => img('foto/' + id + '.' + (R.ext || 'png'), locked(id) ? 'falta' : '')).join('')}</div>`;
  }
  // La foto armada en una sola imagen: la base, lo que ya tenés y la silueta crema con borde de lo que falta.
  // Antes eran 17 capas del tamaño de la foto y cada silueta pasaba por 5 filtros de CSS cada vez que el celu repintaba.
  // Se arma una vez por combinación de figuritas y queda guardada mientras la app esté abierta.
  const FOTO_ARMADA = new Map();
  let fotoPorArmar = null;
  const cargarImg = (src) => new Promise((ok, mal) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => ok(im); im.onerror = mal; im.src = src; });
  const ARMANDO = new Map();
  async function armarFoto(root) {
    const el = root.querySelector('.capas[data-armar]'), p = fotoPorArmar;
    if (!el || !p || el.dataset.armar !== p.clave) return;
    fotoPorArmar = null;
    if (!ARMANDO.has(p.clave)) ARMANDO.set(p.clave, componerFoto(p, el.clientWidth || 340));
    const url = await ARMANDO.get(p.clave);
    if (url && el.isConnected) el.innerHTML = `<img src="${url}" alt="" draggable="false">`;
  }
  async function componerFoto(p, anchoCss) {
    try {
      const ims = await Promise.all(p.srcs.map(cargarImg));
      const W = ims[0].naturalWidth, H = ims[0].naturalHeight, o = 1.75 * W / anchoCss; // ~el grosor que daban las 4 sombras de 1,5px
      const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
      const t = document.createElement('canvas'); t.width = W; t.height = H; const y = t.getContext('2d');
      ims.forEach((im, i) => {
        if (!p.faltan[i]) { x.drawImage(im, 0, 0, W, H); return; }
        y.globalCompositeOperation = 'copy'; y.drawImage(im, 0, 0, W, H);
        y.globalCompositeOperation = 'source-in'; y.fillStyle = '#43365a'; y.fillRect(0, 0, W, H);
        for (const dx of [-o, 0, o]) for (const dy of [-o, 0, o]) if (dx || dy) x.drawImage(t, dx, dy);
        y.fillStyle = '#fffff4'; y.fillRect(0, 0, W, H); // el mismo crema que daba el filtro
        x.drawImage(t, 0, 0);
      });
      const b = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.92));
      if (!b) return null;
      const url = URL.createObjectURL(b);
      await cargarImg(url).then((im) => im.decode && im.decode()).catch(() => {}); // que entre ya decodificada
      FOTO_ARMADA.set(p.clave, url);
      return url;
    } catch (e) { return null; } // sin permiso para leer las capas: quedan las capas de siempre
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

  // Con lotes, la playa mide K pantallas de ancho. Lo guardado (place.x) va en pantallas (0 a K): lo que ya estaba acomodado no se mueve.
  // En la página, .mundo mide K veces el ancho y las posiciones y anchos van en fracción del mundo (x / K).
  function spot(pid, it, place, K = 1) {
    const p = place[it.k];
    if (p && p.x != null) return p;
    const r = rnd(pid + it.k), zona = zonaDe(it.id), [a, b] = ZONAS[zona];
    return Object.assign({}, p, { x: 0.12 + r() * (K - 0.24), y: zona === 'arena' ? a + 0.1 + r() * (b - a - 0.12) : a + r() * (b - a) });
  }
  const itWidth = (id, y, K = 1) => ((y == null ? ARTE.size(id).w / 4 : ARTE.size(id).w / 4 * ESCALA * escala(id, y)) / K).toFixed(2) + '%';
  const itStyle = (id, x, y, z, flat, K = 1) => `left:${(x * 100).toFixed(2)}%;top:${(y * 100).toFixed(2)}%;width:${itWidth(id, flat ? null : y, K)};z-index:${z}`;
  const FONDO_LOTE = { 1.5: 'fondo-15', 2: 'fondo-2', 3: 'fondo-3' };
  const colorOf = (it, p) => (p && p.c) || shopItem(it.id).col || null;
  const ordenIt = (a, b) => RANGO[zonaDe(a.id)] - RANGO[zonaDe(b.id)] || area(b.id) - area(a.id) || a.y - b.y;
  const zDe = (id, i) => (zonaDe(id) === 'mar' ? 1 : i + 4); // mar 1, refugio 2, cartel 3, el resto arriba
  function itHTML(pid, it, p, i, K = 1) {
    const sh = shopItem(it.id), h = hash(pid + it.k), art = ARTE.item(it.id, colorOf(it, p)), x = clamp(p.x, 0.02, K - 0.02) / K;
    const clip = sh.anim === 'salta' || sh.anim === 'cola';
    const vars = sh.anim ? `;--t:${(7 + (h % 40) / 10).toFixed(1)}s;--d:-${((h >> 3) % 70 / 10).toFixed(1)}s` : '';
    return `<div class="it${zonaDe(it.id) === 'mar' ? ' mar' : ''}${sh.anim ? ' ' + sh.anim : ''}" data-k="${it.k}" data-id="${it.id}" data-x="${x}" data-y="${p.y}" style="${itStyle(it.id, x, p.y, zDe(it.id, i), false, K)}${vars}">${clip ? `<span class="recorte">${art}</span>` : art}</div>`;
  }
  // ---------- hallazgos: la botella del mar y la galleta de arroz ----------
  // Aparecen solas en tu altarcito algunos días. Se abren tocándolas y dan monedas; si no la abrís ese día, se la lleva la marea.
  const HZ = D.HALLAZGOS;
  const forzado = {}; // panel de prueba: hace aparecer una ya
  function hallazgoHoy(tipo, K = 1) {
    const h = HZ[tipo], dia = SKY.arDate();
    if (!S.me || dia < HZ.desde || S.hallado(tipo, dia)) return null;
    const r = rnd(tipo + S.me + dia), sale = r() < h.prob, hora = h.de + r() * (h.a - h.de);
    if (!forzado[tipo] && (!sale || SKY.arMinute() < hora)) return null;
    return { tipo, K, x: 0.16 + r() * (K - 0.32), y: tipo === 'botella' ? 0.47 + r() * 0.025 : 0.64 + r() * 0.26 };
  }
  function hallazgoHTML(h) {
    const K = h.K || 1, w = (ARTE.size(h.tipo).w / 4 * ESCALA * (h.tipo === 'botella' ? 0.9 : persp(h.y)) / K).toFixed(2);
    const que = h.tipo === 'botella' ? 'Una botella llegó del mar' : 'Hay algo enterrado en la arena';
    return `<div class="it hallazgo ${h.tipo}${h.tipo === 'botella' ? ' mar flota' : ''}" data-hallazgo="${h.tipo}" role="button" tabindex="0" aria-label="${que}"
      style="left:${(h.x / K * 100).toFixed(2)}%;top:${(h.y * 100).toFixed(2)}%;width:${w}%;z-index:60">${ARTE.item(h.tipo)}<i class="brillo" aria-hidden="true">✦</i></div>`;
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
    if (el.dataset.hallazgo === 'amigo') return abrirBotellaAmigo(el);
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
    const a = S.altar(pid), K = S.loteAncho(pid);
    const placed = a.items.map((it) => ({ it, p: spot(pid, it, a.place, K) })).filter((x) => !x.p.off)
      .sort((u, v) => ordenIt({ id: u.it.id, y: u.p.y }, { id: v.it.id, y: v.p.y }));
    const R = a.refugio;
    const ref = R ? `<div class="it fixed" data-k="${R.k}" data-id="${R.id}" style="${itStyle(R.id, REFUGIO[R.id].x / K, REFUGIO[R.id].y, 2, true, K)}">${ARTE.item(R.id, colorOf(R, a.place[R.k]))}</div>` : '';
    const name = person(pid).n;
    const cw = ARTE.cartelIA ? 23 : (Math.max(60, Math.min(110, 14 + name.length * 7.2)) + 4) / 4;
    // Dirección completa: un url() relativo dentro de una variable se resolvería desde css/, no desde la página.
    const fondo = K > 1 && FONDO_LOTE[K] ? `;--fondo:url(${new URL(`img/altar/${FONDO_LOTE[K]}.webp?v=1`, location.href).href})` : '';
    return `<div class="altar${editable ? ' edit' : ''}${ARTE.pintado ? ' pintado' : ''}${K > 1 ? ' ancho' : ''}" data-pid="${pid}" data-k="${K}"><div class="mundo" style="width:${K * 100}%${fondo}">
      ${ARTE.pintado ? '' : '<i class="nube" style="left:10%;top:7%;width:22%"></i><i class="nube" style="left:64%;top:14%;width:15%"></i>'}
      ${ref}
      ${a.items.some((it) => it.id === 'avioneta') ? `<div class="avioneta-altar" aria-hidden="true"><span class="cartel-avioneta">${esc(cartelAvioneta(pid))}</span><i class="soga"></i><span class="cuerpo">${ARTE.item('avioneta', colorOf(a.items.find((it) => it.id === 'avioneta'), a.place[a.items.find((it) => it.id === 'avioneta').k]))}</span></div>` : ''}
      <div class="it fixed cartel" style="left:${((K - 0.14) / K * 100).toFixed(2)}%;top:57%;width:${(cw / K).toFixed(2)}%;z-index:3">${ARTE.cartel(esc(name))}</div>
      ${placed.map(({ it, p }, i) => itHTML(pid, it, p, i, K)).join('')}
      ${editable && pid === S.me ? ['botella', 'galleta'].map((t) => hallazgoHoy(t, K)).filter(Boolean).map(hallazgoHTML).join('') + botellaAmigoHTML(K) : ''}
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
    // Con lotes (K > 1) la playa es más ancha que el cuadro: abre alejada para verla entera (ZMIN) y se puede acercar.
    const K = +altar.dataset.k || 1, ZMIN = 1 / K;
    const v = vistas[pid] && vistas[pid].k === K ? vistas[pid] : (vistas[pid] = { z: ZMIN, x: 0, y: 0, k: K });
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
    // Si la playa queda más chica que el cuadro, se centra (arriba sigue el cielo y abajo la arena); si no, se puede recorrer.
    const puedeMover = () => v.z > 1.001 || altar.clientWidth * K * v.z > altar.clientWidth + 1;
    const aplicar = () => {
      const W = altar.clientWidth, H = altar.clientHeight, ww = W * K * v.z, hh = H * v.z;
      v.x = ww <= W + 0.5 ? (W - ww) / 2 : clamp(v.x, W - ww, 0);
      v.y = hh <= H + 0.5 ? (H - hh) / 2 : clamp(v.y, H - hh, 0);
      const igual = Math.abs(v.z - 1) < 0.001 && Math.abs(v.x) < 0.5 && Math.abs(v.y) < 0.5;
      box.style.transform = igual ? '' : `translate3d(${v.x.toFixed(1)}px,${v.y.toFixed(1)}px,0) scale(${v.z.toFixed(3)})`;
      altar.classList.toggle('zoom', puedeMover());
    };
    const zoomEn = (z, cx, cy, suave) => {
      const nz = clamp(z, ZMIN, ZMAX), k = nz / v.z;
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
      shadow.style.width = (ARTE.size(id).w / 4 * ESCALA * 0.7 / K) + '%';
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
      el.style.left = (d.gx * 100) + '%'; el.style.top = (d.gy * 100) + '%'; el.style.width = itWidth(d.id, d.gy, K);
      caer(el, box, Math.max(d.gy - d.fy, 0.03), () => { restack(box); dragging = false; });
      if (d.moved) S.setPlace(el.dataset.k, { x: +(d.gx * K).toFixed(4), y: +d.gy.toFixed(4) });
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
        g.gx = clamp(g.x0 + dx / g.rw, 0.05 / K, 1 - 0.05 / K);
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
          g = puedeMover() ? { tipo: 'pan', lx: e.clientX, ly: e.clientY } : { tipo: 'nada' };
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
      if (now - tapT < 320 && Math.hypot(x - tapX, y - tapY) < 34) { tapT = 0; zoomEn(v.z > ZMIN * 1.01 ? ZMIN : Math.max(1, 2 * ZMIN), x, y, true); }
      else { tapT = now; tapX = x; tapY = y; }
    };
    altar.addEventListener('pointerup', fin);
    altar.addEventListener('pointercancel', fin);
    box.querySelectorAll('[data-hallazgo]').forEach((b) => b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirHallazgo(b); } }));
    // Mientras se arrastra o hay zoom, el dedo es de la playa y no de la página.
    altar.addEventListener('touchmove', (e) => { if ((g && g.tipo === 'drag') || puedeMover() || e.touches.length > 1) e.preventDefault(); }, { passive: false });
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
      <p class="muted" style="margin:0">${it.venta != null ? `Te dan ${venta} monedas.` : `Te devuelven ${venta} monedas, el 80% de lo que costó.`} Se va de tu altarcito.</p>
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
    const venta = editable && mine && !inst.from && String(k).startsWith('o') ? D.precioVenta(it) : 0;
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
    return { id: 'dia-' + d, s: 'dia', t: trip || D.DAILY_FIJA[d] || delPool(d), xp: trip ? 40 : 20 };
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
    // la del Holandés Laburante, desde el día que lo hundiste por primera vez
    const barco = S.barcoPrimero();
    if (barco) out.splice(out.filter((m) => m.dia > barco).length, 0, Object.assign({ s: 'secreta', dia: barco }, D.BARCO.mision));
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
    if (mid.startsWith('hora-')) { const [, m, d] = mid.slice(5).split('-'); return `Hora Colonia del ${+d}/${+m}`; }
    if (!mid.startsWith('dia-')) return (D.MISSIONS.find((m) => m.id === mid) || { t: 'Una misión' }).t;
    const d = mid.slice(4);
    return D.DAILY_TRIP[d] || D.DAILY_FIJA[d] || delPool(d);
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
  // Menciones escritas a partir del chat (bucket menciones/menciones.json): si hay, reemplazan a la automática.
  let MENC = null;
  try { MENC = JSON.parse(localStorage.getItem('colonia.menciones')); } catch (e) { /* sin copia */ }
  fetch(S.artUrl('menciones/menciones.json'), { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((j) => {
    if (!j || !j.menciones) return;
    const cambio = JSON.stringify(j) !== JSON.stringify(MENC);
    MENC = j;
    try { localStorage.setItem('colonia.menciones', JSON.stringify(j)); } catch (e) { /* sin lugar */ }
    if (cambio && location.hash.slice(1) === 'colonia') renderSiArriba();
  }).catch(() => {});
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
    resto.forEach((f) => { const m = MENC && MENC.menciones[f.id]; if (m && m.t) f.mencion = { t: m.t, d: m.d || '' }; });
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
  // Fecha y hora (de Argentina) de una foto: "27/11 · 18:05".
  const fechaFoto = (iso) => {
    const t = Date.parse(iso); if (!t) return '';
    const d = new Date(t - 3 * 36e5), hh = String(d.getUTCHours()).padStart(2, '0'), mm = String(d.getUTCMinutes()).padStart(2, '0');
    return `${d.getUTCDate()}/${d.getUTCMonth() + 1} · ${hh}:${mm}`;
  };
  // Con 4 cruces rojas la foto queda desaprobada: una cruz grande encima (y no suma hasta que se cambie).
  const marcaDesap = (pid, mid) => (S.desaprobada(pid, mid) ? '<span class="desap" role="img" aria-label="Foto desaprobada">❌</span>' : '');
  // Los botones de reacción de una foto y quiénes pusieron cada una. En tus fotos no reaccionás: ves cuántas te pusieron.
  function reacsHTML(key) {
    const mia = key.split('/')[0] === S.me, mi = S.miReaccion(key), rs = S.reacciones(key);
    const botones = REAC.filter(([id]) => !mia || rs[id]).map(([id, e, n]) => {
      const c = (rs[id] || []).length;
      return mia ? `<span class="reac"><span aria-hidden="true">${e}</span><b>${c}</b><span class="sr">${n}</span></span>`
        : `<button class="reac${mi === id ? ' on' : ''}" data-reac="${id}" data-foto="${key}" aria-pressed="${mi === id}" aria-label="${n}${c ? ': ' + c : ''}" data-mudo><span aria-hidden="true">${e}</span>${c ? `<b>${c}</b>` : ''}</button>`;
    }).join('');
    const quienes = REAC.filter(([id]) => rs[id]).map(([id, e]) => `<span class="reac-quien"><span aria-hidden="true">${e}</span><span class="mini-caras">${rs[id].map((p) => `<img class="face" src="${face(p)}" alt="${esc(person(p).n)}" title="${esc(person(p).n)}">`).join('')}</span></span>`).join('');
    const desap = S.desaprobada(...key.split('/'));
    return `<div class="reacs">${botones || '<span class="small muted">Todavía sin reacciones.</span>'}</div>${quienes ? `<div class="reac-quienes">${quienes}</div>` : ''}
      ${desap ? `<p class="small desap-nota">${mia ? `Tu foto quedó desaprobada: ${S.cruces} cruces rojas. No suma hasta que la cambies.` : `Desaprobada: ${S.cruces} o más cruces rojas.`}</p>` : ''}`;
  }
  function postHTML(f) {
    const key = f.pid + '/' + f.mision;
    const img = `<div class="post-foto-w"><img class="post-foto" src="${f.url || face(f.pid)}" alt="" loading="lazy"${f.url ? '' : ' style="filter:saturate(.5) sepia(.25)"'}>${marcaDesap(f.pid, f.mision)}</div>`;
    return `<div class="card post" data-post="${key}"><div class="post-top"><button class="post-quien" data-carta="${f.pid}"><img class="face" src="${face(f.pid)}" alt=""><b>${esc(person(f.pid).n)}</b></button><span class="small muted">${fechaFoto(f.creada)}</span></div>
      <p class="post-t">${esc(tituloFoto(f.mision, f.pid))}</p>${img}
      ${reacsHTML(key)}</div>`;
  }
  function reaccionar(b) {
    const key = b.dataset.foto, r = b.dataset.reac;
    S.reaccionar(key, r); SONIDO.plop(); setTimeout(revisarAmigos, 500);
    // En la foto abierta desde una tarjeta: se vuelven a dibujar solo sus reacciones (y la cruz grande, si cambió).
    const caja = b.closest('.foto-reacs');
    if (caja) {
      caja.innerHTML = reacsHTML(key);
      const w = caja.parentElement.querySelector('.foto-grande-w'), [pid, mid] = key.split('/');
      if (w) { const m = w.querySelector('.desap'); if (m) m.remove(); w.insertAdjacentHTML('beforeend', marcaDesap(pid, mid)); }
      const nb = caja.querySelector(`[data-reac="${r}"]`); if (nb && nb.classList.contains('on')) nb.classList.add('pop');
      return;
    }
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
  // Transparencia de niveles: cuánto falta y de dónde sale la experiencia (solo de las fotos de misiones).
  const faltaXp = (xp, vos) => {
    const L = level(xp);
    if (!L.next) return `${vos ? 'Llegaste' : 'Llegó'} al último nivel.`;
    return `${vos ? 'Te faltan' : 'Le faltan'} ${L.next.xp - xp} XP para el nivel ${L.i + 2}: ${L.next.n}.`;
  };
  const barraXp = (xp) => `<span class="bar xp-bar"><i style="width:${Math.round(level(xp).pct * 100)}%"></i></span>`;
  const COMO_XP = () => `<div class="como-xp"><div class="eyebrow">Cómo se sube de nivel</div>
    <p>Con fotos de misiones: cada misión da experiencia una sola vez, la primera vez que subís su foto.</p>
    <ul><li><span>Misión del día</span><b>+20</b></li><li><span>Misión del día en el viaje (4 al 8/12)</span><b>+40</b></li>
      <li><span>Misiones secretas, dos nuevas por día</span><b>+30</b></li><li><span>Misiones del álbum</span><b>+20 a +35</b></li>
      <li><span>La de a dos</span><b>+${D.DUO.xp}</b></li><li><span>La ruta, por cada parada (4 y 5/12)</span><b>+${D.RUTA.xp}</b></li></ul>
    <p>Además:</p>
    <ul><li><span>Regalar algo del kiosco (1 XP cada 2 monedas)</span><b>+${D.xpRegalo(8)} a +${D.xpRegalo(Math.max(...D.SHOP.map((x) => x.p)))}</b></li>
      <li><span>Racha: 2.º día seguido entrando</span><b>+${D.RACHA.xp[2]}</b></li><li><span>3.er día</span><b>+${D.RACHA.xp[3]}</b></li><li><span>4.º día</span><b>+${D.RACHA.xp[4]}</b></li>
      <li><span>5.º día en adelante, y tu foto con borde dorado</span><b>+${D.RACHA.xp[5]}</b></li></ul>
    <p>Reaccionar y comprar para vos no dan experiencia. Si un día no entrás, la racha vuelve a empezar.</p></div>`;
  // Racha: cómo va y qué trae mañana.
  const rachaTexto = (pid) => {
    const n = S.rachaDe(pid), vos = pid === S.me, sig = D.RACHA.xp[Math.min(n + 1, 5)];
    if (!n) return vos ? `Entrá mañana también y arrancás una racha: el 2.º día seguido suma +${D.RACHA.xp[2]} XP.` : 'Sin racha por ahora.';
    const dias = n === 1 ? '1 día' : `${n} días seguidos`;
    if (n >= D.RACHA.dorado) return `${vos ? 'Tu racha' : 'Racha'}: ${dias}. Borde dorado ✦${vos ? ` Mañana, +${sig} XP.` : ''}`;
    return `${vos ? 'Tu racha' : 'Racha'}: ${dias}.${vos ? ` Mañana, +${sig} XP${n + 1 >= D.RACHA.dorado ? ' y borde dorado' : ''}.` : ''}`;
  };

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
  function askPhoto(m) { pending = m; elegirFoto($('#file'), 'environment'); }
  // En Android, Chrome abre el selector de fotos del sistema (sin cámara) cuando se piden solo imágenes. Por eso ahí se pregunta
  // antes: "Sacar una foto" abre la cámara directo (capture) y "Elegir de la galería", el selector. En iPhone el menú ya trae la cámara.
  const ANDROID = /Android/i.test(navigator.userAgent);
  function elegirFoto(inp, camara) {
    inp.value = '';
    if (!ANDROID) { inp.removeAttribute('capture'); inp.click(); return; }
    sheet(`<div style="display:grid;gap:12px;justify-items:center;text-align:center"><div class="eyebrow">La foto</div>
      <div class="row" style="justify-content:center"><button class="btn" id="conCamara" style="--c:var(--mint)">Sacar una foto</button><button class="btn" id="deGaleria" style="--c:var(--celeste)">Elegir de la galería</button></div>
      <button class="btn ghost" data-close>${NAH}</button></div>`,
    (bg) => {
      bg.querySelector('#conCamara').addEventListener('click', () => { bg.remove(); inp.setAttribute('capture', camara); inp.click(); });
      bg.querySelector('#deGaleria').addEventListener('click', () => { bg.remove(); inp.removeAttribute('capture'); inp.click(); });
    });
  }
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
    const antes = r ? S.xp - r.xp : S.xp, La = level(antes);
    sheet(`<div class="reward" style="display:grid;gap:12px;justify-items:center">
      <div class="eyebrow">¡Figurita nueva!</div>
      <div class="polaroid pop"><img src="${url}" alt=""></div>
      <h2>${esc(m.t)}</h2>
      ${r ? `<div class="xp-sube"><div class="spread"><b class="xp-nivel">Nivel ${La.i + 1} · ${esc(La.n)}</b><span class="chip xp-gana" style="--c:var(--mint)">+${r.xp} XP</span></div>
          ${barraXp(antes)}<p class="small muted xp-falta">${esc(faltaXp(antes, true))}</p></div>
        <div class="row" style="justify-content:center"><span class="chip" style="--c:var(--butter)">+${r.coins} <span class="coin"></span></span>${res.out.some((o) => o.sobre) ? '<span class="chip" style="--c:var(--rose)">+1 sobre del baúl</span>' : ''}</div>
        <p class="small muted" style="margin:0">${res.out.some((o) => o.sobre) ? 'Cada 2 fotos de misiones te llega un sobre.' : 'Con una foto de misión más te llega un sobre del baúl.'}</p>` : '<p class="muted small">Cambiaste la foto de esta misión: la experiencia se da una sola vez por misión.</p>'}
      ${serie ? `<p><b>Serie completa:</b> ${esc(D.SERIES.find((x) => x.id === serie.serie).n)}. +${D.ACH.serie.c} monedas y medallita.</p>` : ''}
      <p class="muted small">${esc(avisoFoto())}</p>
      <button class="btn" data-close>Seguir</button></div>`, (bg) => { if (r) subirBarra(bg, S.xp, res.levelUp); });
    render();
  }
  // La barrita se llena con lo que ganaste; si pasaste de nivel, se completa, sale el cartel y arranca de nuevo.
  function subirBarra(root, despues, nuevo) { animarXp(root.querySelector('.xp-sube'), despues, nuevo); }
  function animarXp(box, despues, nuevo) {
    const i = box && box.querySelector('.xp-bar i');
    if (!i) return;
    const poner = (xp) => {
      const L = level(xp), n = box.querySelector('.xp-nivel'), f = box.querySelector('.xp-falta');
      if (n) n.textContent = `Nivel ${L.i + 1} · ${L.n}`;
      if (f) f.textContent = faltaXp(xp, true);
    };
    const ir = (pct, ms) => new Promise((ok) => { i.style.transition = `width ${ms}ms cubic-bezier(.3, .8, .4, 1)`; i.style.width = pct + '%'; setTimeout(ok, ms + 80); });
    setTimeout(async () => {
      if (nuevo == null) { await ir(level(despues).pct * 100, 1000); poner(despues); return; }
      await ir(100, 800);
      i.style.transition = 'none'; i.style.width = '0%'; void i.offsetWidth;
      poner(despues);
      felicitar(nuevo);
      await ir(level(despues).pct * 100, 800);
    }, 500);
  }
  // Popup chico arriba (no tapa nada) con la barrita que se llena: para la racha y los regalos.
  function toastXp(titulo, res) {
    if (!res || !res.xp) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<div class="card xp-toast"><div class="spread"><b>${esc(titulo)}</b><span class="chip" style="--c:var(--mint)">+${res.xp} XP</span></div>
      ${barraXp(res.antes)}<span class="small muted xp-falta">${esc(faltaXp(res.antes, true))}</span></div>`;
    $('#toasts').appendChild(t);
    animarXp(t, res.despues, res.levelUp);
    setTimeout(() => t.remove(), res.levelUp == null ? 4200 : 5200);
  }
  // Borde dorado en la foto de quien lleva 5 días seguidos o más (lo ven todos). Se marca cada vez que aparece una cara.
  let dorados = new Set();
  const actualizarDorados = () => { dorados = new Set(D.PEOPLE.filter((p) => S.rachaDe(p.id) >= D.RACHA.dorado).map((p) => face(p.id))); };
  const marcarDorado = (im) => im.classList.toggle('dorado', dorados.has(im.getAttribute('src')));
  new MutationObserver((cambios) => cambios.forEach((c) => c.addedNodes.forEach((n) => {
    if (n.nodeType !== 1) return;
    if (n.matches('img.face')) marcarDorado(n); else n.querySelectorAll('img.face').forEach(marcarDorado);
  }))).observe(document.body, { childList: true, subtree: true });
  // Cartel de felicitaciones al subir de nivel: qué cambió y qué se destrabó.
  function felicitar(n) {
    const lv = n + 1, tier = D.COLECCION.tarjeta.find((x) => x.lv === lv);
    const nuevos = D.SHOP.filter((it) => it.lv === lv && !it.retirado && !it.unico && ARTE.has(it.id));
    const colores = ['var(--coral)', 'var(--mint)', 'var(--butter)', 'var(--celeste)', 'var(--lav)', 'var(--rose)'];
    const confeti = Array.from({ length: 30 }, (_, k) => {
      const a = (k / 30) * Math.PI * 2 + Math.random() * 0.4, d = 90 + Math.random() * 90;
      return `<i style="--x:${Math.round(Math.cos(a) * d)}px;--y:${Math.round(Math.sin(a) * d - 40)}px;--r:${Math.round(Math.random() * 540 - 270)}deg;background:${colores[k % 6]}"></i>`;
    }).join('');
    SONIDO.si();
    sheet(`<div class="felicitar"><div class="confeti" aria-hidden="true">${confeti}</div>
      <div class="eyebrow">¡Felicitaciones!</div>
      <div class="nivel-num pop" aria-hidden="true">${lv}</div>
      <h2>Subiste al nivel ${lv}</h2>
      <p style="margin:0">Ahora sos <b>${esc(D.LEVELS[n].n)}</b>.</p>
      <ul class="premios"><li>Te llegó un sobre del baúl de la colonia.</li>
        ${tier ? `<li>Tu tarjeta pasó a <b>${tier.n.toLowerCase()}</b>.</li>` : ''}
        ${nuevos.length ? `<li>En el kiosco se destrabó: ${nuevos.map((it) => esc(it.n)).join(', ')}.</li>` : ''}</ul>
      <p class="small muted" style="margin:0">${esc(faltaXp(S.xp, true))}</p>
      <button class="btn" data-close style="--c:var(--butter)">¡Vamos!</button></div>`);
  }


  // ---------- más coleccionables: recuerdos, figuritas de amigos y tarjeta ----------
  // El baúl de la colonia: las fotos viven en el bucket (recuerdos/), no en el repo. La lista se guarda para verla sin señal.
  let RECUERDOS = null;
  try { RECUERDOS = JSON.parse(localStorage.getItem('colonia.recuerdos')); } catch (e) { /* sin copia */ }
  fetch(S.artUrl('recuerdos/recuerdos.json'), { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((j) => {
    if (!j || !Array.isArray(j.items)) return;
    const cambio = JSON.stringify(j) !== JSON.stringify(RECUERDOS);
    RECUERDOS = j;
    try { localStorage.setItem('colonia.recuerdos', JSON.stringify(j)); } catch (e) { /* sin lugar */ }
    if (cambio && ['album', 'hoy'].includes(location.hash.slice(1))) renderSiArriba();
  }).catch(() => {});
  const recUrl = (id) => S.artUrl(`recuerdos/${id}.webp?v=${(RECUERDOS && RECUERDOS.v) || 1}`);
  // Miniatura liviana (260 px) para las grillas; la grande se baja recién al abrirla.
  const recMini = (id) => S.artUrl(`recuerdos/mini/${id}.webp?v=${(RECUERDOS && RECUERDOS.v) || 1}`);
  // Se ve al instante con la miniatura y se cambia por la grande cuando terminó de bajar.
  const imgProgresiva = (id) => `<img src="${recMini(id)}" data-full="${recUrl(id)}" alt="" decoding="async">`;
  function cargarProgresivas(root) {
    root.querySelectorAll('img[data-full]').forEach((img) => {
      const big = new Image();
      big.src = img.dataset.full;
      (big.decode ? big.decode() : Promise.resolve()).then(() => { img.src = big.src; img.removeAttribute('data-full'); }).catch(() => {});
    });
  }
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
          box.innerHTML = `<div class="eyebrow">${it.mala ? '¡Uy! De la mala suerte' : it.suerte != null ? '¡De la suerte!' : 'Del baúl de la colonia'}</div>
            <div class="polaroid recuerdo-grande pop${it.suerte != null ? ' suerte' : ''}">${imgProgresiva(it.id)}</div>
            <h2>${esc(it.t)}</h2>${carasDe(it.p)}
            ${it.suerte ? `<span class="chip" style="--c:var(--butter)">+${it.suerte} <span class="coin"></span></span>` : ''}
            ${it.mala ? '<p class="small muted" style="margin:0">Tranqui: la mala suerte te dejó un sobre extra.</p>' : ''}
            <p class="small muted" style="margin:0">Tenés ${S.misRecuerdos().length} de ${RECUERDOS.items.length}.</p>
            <div class="row" style="justify-content:center">${botones}</div>`;
        }
        cargarProgresivas(box);
        const o = box.querySelector('#otro'); if (o) o.addEventListener('click', abrir);
        render();
      };
      const n = S.sobres();
      box.innerHTML = `<div class="eyebrow">El baúl de la colonia</div>
        <button class="sobre" id="abrirSobre" aria-label="Abrir el sobre"><span class="sobre-sello" aria-hidden="true">♡</span></button>
        <h2>${n === 1 ? 'Tenés un sobre' : `Tenés ${n} sobres`}</h2>
        <p class="small muted" style="margin:0">Cada sobre trae una foto real de la colonia, de cualquier época. A veces sale una de la suerte, que da monedas.</p>
        <div class="row" style="justify-content:center"><button class="btn ghost" data-close>Después</button><button class="btn" id="abrirSobre2" style="--c:var(--rose)">Abrirlo</button></div>`;
      box.querySelectorAll('#abrirSobre, #abrirSobre2').forEach((b) => b.addEventListener('click', abrir));
    });
    return true;
  }
  function verRecuerdo(id) {
    const it = recuerdo(id);
    if (!it) return;
    sheet(`<div class="sobre-hoja"><div class="polaroid recuerdo-grande${it.suerte != null ? ' suerte' : ''}">${imgProgresiva(it.id)}</div>
      <h2>${esc(it.t)}</h2>${carasDe(it.p)}<button class="btn" data-close>Listo</button></div>`, cargarProgresivas);
  }

  // Figuritas de amigos: con 2 de 3 cosas (reaccionar a una foto suya, visitar su altarcito, regalarle algo).
  // Cada figurita es una polaroid con la foto de perfil de esa persona (si la cambia en la app, cambia también acá).
  const caraAmigo = (pid) => `<span class="amigo-polaroid"><img src="${face(pid)}" alt=""></span>`;
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

  // ---------- logros por escalones ----------
  // Se cobran solos (monedas y sobres, nunca experiencia). Si llegan varios juntos, un solo cartelito.
  const baulTotal = () => (RECUERDOS ? RECUERDOS.items.length : 0);
  const premioLogro = (p) => [p.c ? `${p.c} <span class="coin"></span>` : '', p.s ? `${p.s} ${p.s === 1 ? 'sobre' : 'sobres'}` : ''].filter(Boolean).join(' + ');
  function fraseLogro(n) {
    if (n.todo) return n.l.id === 'visitas' ? 'Visitaste todos los altarcitos' : 'Compraste todo el kiosco';
    if (n.l.id === 'baul') return `Completaste el ${n.meta}% del baúl`;
    if (n.l.id === 'racha') return `${n.meta} días seguidos entrando`;
    if (n.l.id === 'juntos' && n.meta === 1) return 'Te sentaste a mirar el mar con alguien';
    if (n.l.id === 'barcos' && n.meta === 1) return 'Hundiste al Holandés Laburante';
    if (n.l.id === 'nivelBarco') return `Hundiste al Holandés de nivel ${n.meta}`;
    return `${n.meta} ${n.l.u}`;
  }
  function revisarLogros() {
    if (!S.me) return;
    const nuevos = S.cobrarLogros(baulTotal());
    if (!nuevos.length) return;
    const c = nuevos.reduce((a, n) => a + n.c, 0), so = nuevos.reduce((a, n) => a + n.s, 0);
    const chips = `${c ? `<span class="chip" style="--c:var(--butter)">+${c} <span class="coin"></span></span>` : ''}${so ? `<span class="chip" style="--c:var(--rose)">+${so} ${so === 1 ? 'sobre' : 'sobres'}</span>` : ''}`;
    const texto = nuevos.length === 1 ? `<b>¡Logro!</b> ${esc(fraseLogro(nuevos[0]))}.` : `<b>¡${nuevos.length} logros nuevos!</b> ${nuevos.map((n) => esc(fraseLogro(n))).join(' · ')}.`;
    toast(`<span class="logro-ic" aria-hidden="true">${nuevos[0].l.ic}</span><span>${texto}</span>${chips}`, 5200);
    if (c) SONIDO.monedas(c); else SONIDO.si();
    if (['album', 'altar', 'kiosco'].includes(location.hash.slice(1)) && !document.querySelector('.sheet-bg') && !dragging) setTimeout(render, 500);
  }
  function logrosHTML() {
    const ls = S.logros(baulTotal());
    const hechos = ls.reduce((n, l) => n + l.pasos.filter((p) => p.ok).length, 0), total = ls.reduce((n, l) => n + l.pasos.length, 0);
    const fila = (l) => {
      const sig = l.pasos.find((p) => !p.ok), meta = sig ? sig.meta : l.pasos[l.pasos.length - 1].meta;
      const pct = sig ? Math.min(100, (100 * l.v) / meta) : 100;
      const cuanto = l.id === 'baul' ? `Tenés el ${l.v}% del baúl · próxima meta: ${meta}%` : `${Math.min(l.v, meta)} de ${meta} ${l.u}`;
      return `<li class="logro${sig ? '' : ' listo'}"><span class="logro-ic" aria-hidden="true">${l.ic}</span><div>
        <div class="spread"><b>${esc(l.t)}</b><span class="small">${sig ? premioLogro(sig) : '✓ completo'}</span></div>
        <span class="bar logro-bar"><i style="width:${pct.toFixed(1)}%"></i></span>
        <span class="small muted">${sig ? esc(cuanto) : `Completaste los ${l.pasos.length} escalones.`}</span>
        <span class="escalones" aria-label="${l.pasos.filter((p) => p.ok).length} de ${l.pasos.length} escalones">${l.pasos.map((p) => `<i class="${p.ok ? 'ok' : ''}"></i>`).join('')}</span></div></li>`;
    };
    return `<div class="card"><div class="spread"><div><h2>Logros</h2><span class="small muted">Se cobran solos al llegar a cada meta: monedas y sobres del baúl.</span></div><b class="cuenta-logros">${hechos}/${total}</b></div>
      <ul class="logros">${ls.map(fila).join('')}</ul></div>`;
  }

  // Tu tarjeta sube de categoría con el nivel: bronce, plata y oro.
  const tierDe = (nivel) => [...D.COLECCION.tarjeta].reverse().find((t) => nivel >= t.lv) || null;
  const tierDePid = (pid) => tierDe(level(pid === S.me ? S.xp : S.xpOf(pid)).i + 1);

  function masColeccionables(medal) {
    const nv = level(S.xp).i + 1, yo = person(S.me);
    let recs = '';
    if (RECUERDOS) {
      const mios = new Set(S.misRecuerdos()), comunes = RECUERDOS.items.filter((x) => x.suerte == null), raras = RECUERDOS.items.filter((x) => x.suerte != null);
      const pol = (it) => (mios.has(it.id) ? `<button class="rec${it.suerte != null ? ' suerte' : ''}" data-rec="${it.id}" aria-label="${esc(it.t)}"><img src="${recMini(it.id)}" alt="" loading="lazy" decoding="async"></button>`
        : `<span class="rec falta${it.suerte != null ? ' suerte' : ''}" aria-hidden="true">${it.suerte != null ? '✦' : '?'}</span>`);
      const tengo = (l) => l.filter((x) => mios.has(x.id)).length;
      const total = RECUERDOS.items.length, mias = tengo(RECUERDOS.items);
      recs = `<div class="card"><div class="cuenta-baul"><b>${mias}/${total}</b><span class="small muted">${mias === total ? '¡Completaste el baúl!' : `Te faltan ${total - mias} para completarlo`}</span></div>
        <div class="spread"><div><h2>El baúl de la colonia</h2><span class="small muted">${tengo(comunes)} de ${comunes.length} fotos reales de la colonia</span></div>
          ${S.sobres() ? `<button class="btn" data-sobres style="--c:var(--rose);flex:none;white-space:nowrap">Abrir sobre (${S.sobres()})</button>` : medal(tengo(comunes) === comunes.length)}</div>
        <div class="recs">${comunes.map(pol).join('')}</div>
        <div class="eyebrow">De la suerte · ${tengo(raras)} de ${raras.length}</div><div class="recs">${raras.map(pol).join('')}</div>
        <p class="small muted" style="margin:0">Te llega un sobre por cada día que entrás, por cada nivel que subís y cada 2 fotos de misiones.</p></div>`;
    }
    const amigos = D.PEOPLE.filter((p) => p.id !== S.me), mis = new Set(S.misAmigos());
    const amigosCard = `<div class="card"><div class="spread"><div><h2>Figuritas de amigos</h2><span class="small muted">${amigos.filter((p) => mis.has(p.id)).length} de ${amigos.length}</span></div>${medal(amigos.every((p) => mis.has(p.id)))}</div>
      <p class="small muted" style="margin:0">La de cada persona sale con 2 de estas 3: reaccionar a una foto suya, visitar su altarcito o regalarle algo. Con todas, +${D.COLECCION.amigos.premio} monedas.</p>
      <div class="amigos-grid">${amigos.map((p) => `<button class="amigo-slot${mis.has(p.id) ? '' : ' falta'}" data-amigo="${p.id}" aria-label="${esc(p.n)}${mis.has(p.id) ? '' : ': todavía no'}">${caraAmigo(p.id)}<span class="small">${esc(p.n)}</span></button>`).join('')}</div></div>`;
    const c = (CARTAS && CARTAS[S.me]) || {};
    const tarjeta = `<div class="card"><div><h2>Tu tarjeta</h2><span class="small muted">Sube de categoría con tu nivel. Vas por el ${nv}.</span></div>
      <div class="tiers">${D.COLECCION.tarjeta.map((t) => `<button class="tier${nv >= t.lv ? '' : ' falta'}" data-carta aria-label="Tarjeta de ${t.n.toLowerCase()}${nv >= t.lv ? '' : ', nivel ' + t.lv}">
        <span class="mini-carta tier-${t.id}" style="--el:${ELEMENTO[c.e] || 'var(--butter)'}"><img src="${face(S.me)}" alt=""><b>${esc(yo.n)}</b></span><span class="small">${t.n} · nivel ${t.lv}</span></button>`).join('')}</div></div>`;
    return `<h2 class="on-sky" style="font-size:1.3rem;margin:6px 0 0">Más coleccionables</h2>${recs}${logrosHTML()}${amigosCard}${tarjeta}`;
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
    if (cambio && ['hoy', 'calendario'].includes(location.hash.slice(1))) renderSiArriba();
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
      <span class="who"><b>${esc(person(S.me).n)}</b><span class="on-sky-soft small">${esc(L.n)} · nivel ${L.i + 1}</span><span class="xp-mini" aria-hidden="true"><i style="width:${Math.round(L.pct * 100)}%"></i></span></span></button>
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
  const allMissions = () => [daily(), D.DUO, ...rutaMisiones(), ...secretasDe(S.me, SKY.arDate()), ...secretasHasta(), ...D.MISSIONS, horaMision()].filter(Boolean);
  // ---------- Hora Colonia ----------
  // Cada día, a una hora al azar (la misma en todos los celus) entre las 10 y las 21, hay 5 minutos para subir lo que tenés
  // enfrente. Si la suben 6 o más dentro del rato, cada uno de ellos cobra 30 monedas.
  const HORA_PRUEBA = PROTO && /[?&]horaya/.test(location.search) ? Date.now() + 8000 : null;
  const horaDe = (dia) => D.HORA.desde + (hash('hora' + dia) % (D.HORA.hasta - D.HORA.desde));
  function ventanaHora(dia = SKY.arDate()) {
    const m = horaDe(dia), [y, mo, d] = dia.split('-').map(Number);
    let desde = Date.UTC(y, mo - 1, d, 3) + m * 6e4; // medianoche argentina = 3 UTC
    if (HORA_PRUEBA && dia === SKY.arDate()) desde = HORA_PRUEBA; // ?horaya: para probarla ahora
    return { m, desde, hasta: desde + D.HORA.dura * 6e4 };
  }
  const horaTexto = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  function horaMision() {
    const dia = SKY.arDate(), v = ventanaHora(dia), id = 'hora-' + dia, ahora = Date.now();
    if ((ahora >= v.desde && ahora < v.hasta) || S.photo(id)) return { id, t: D.HORA.t, xp: D.HORA.xp };
    return null;
  }
  function horaHTML() {
    const dia = SKY.arDate(), v = ventanaHora(dia), ahora = Date.now(), id = 'hora-' + dia;
    if (ahora >= v.desde && ahora < v.hasta) {
      const falta = Math.ceil((v.hasta - ahora) / 1000);
      return `<div class="card hora-colonia"><div class="spread"><div class="eyebrow">⏰ ¡Hora Colonia!</div><span class="chip" style="--c:var(--rose)" data-hora-falta>${Math.floor(falta / 60)}:${String(falta % 60).padStart(2, '0')}</span></div>
        <p class="small" style="margin:0">Tenés 5 minutos para sacarle una foto a lo que tenés enfrente. Si la suben 6 o más, cada uno cobra ${D.HORA.c} monedas.</p>
        <div class="list">${mRow(horaMision(), 'Avisale al grupo')}</div></div>`;
    }
    if (ahora >= v.hasta) {
      const n = S.horaQuienes(dia, v.desde, v.hasta + 12e4).size;
      return `<p class="on-sky-soft small hora-paso">La Hora Colonia de hoy fue a las ${horaTexto(v.m)}${n ? `: la ${n === 1 ? 'subió 1' : `subieron ${n}`}` : ''}.${S.photo(id) ? ' Vos estuviste.' : ''}</p>`;
    }
    return '';
  }
  // Mientras la app está abierta: avisa cuando empieza y cobra el premio cuando ya pasó.
  let horaAvisada = '';
  setInterval(() => {
    if (!S.me) return;
    const dia = SKY.arDate(), v = ventanaHora(dia), ahora = Date.now();
    if (ahora >= v.desde && ahora < v.hasta && horaAvisada !== dia) {
      horaAvisada = dia;
      toast(`<span style="font-size:1.5rem">⏰</span><span><b>¡Hora Colonia!</b> Tenés 5 minutos para subir lo que tenés enfrente. <a href="#hoy">Ir a Hoy</a></span>`, 9000);
      if (location.hash.slice(1) === 'hoy' && scrollY < 40) render();
    }
    const el = document.querySelector('[data-hora-falta]');
    if (el) { const f = Math.max(0, Math.ceil((v.hasta - ahora) / 1000)); el.textContent = `${Math.floor(f / 60)}:${String(f % 60).padStart(2, '0')}`; }
    cobrarHoras();
  }, 1000);
  function cobrarHoras() {
    [1, 0].forEach((n) => {
      const d = new Date(SKY.arDate() + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - n);
      const dia = d.toISOString().slice(0, 10), v = ventanaHora(dia);
      if (Date.now() < v.hasta + 15 * 6e4) return; // se espera un rato a que suban todos
      const c = S.cobrarHora(dia, v.desde, v.hasta + 12e4);
      if (c) { SONIDO.monedas(c); toast(`<span class="chip" style="--c:var(--butter)">+${c} <span class="coin"></span></span><span>La Hora Colonia la subieron ${D.HORA.minimo} o más: premio para cada uno.</span>`, 5000); }
    });
  }

  // ---------- cápsula del tiempo ----------
  // Del 6 al 9/12 cada uno escribe algo para la colonia del 10/1 (se puede cambiar hasta el 9). El 10/1 se abre y se leen todas.
  function capsulaHTML() {
    const hoy = SKY.arDate(), mia = S.capsula();
    if (hoy >= D.CAPSULA.abre) {
      const n = D.PEOPLE.filter((p) => S.capsula(p.id)).length;
      return n ? `<button class="card capsula" data-capsula-leer><div class="eyebrow">Cápsula del tiempo</div><b>Se abrió la cápsula: ${n} ${n === 1 ? 'mensaje' : 'mensajes'} del viaje</b><span class="small muted">Tocá para leerlos.</span></button>` : '';
    }
    if (hoy < D.CAPSULA.desde || hoy > D.CAPSULA.hasta) return '';
    return `<div class="card capsula"><div class="eyebrow">Cápsula del tiempo</div>
      <p class="small" style="margin:0">Escribile algo a la colonia del 10 de enero: lo que sentís hoy, lo que no querés olvidarte, una promesa. Nadie lo lee hasta ese día.</p>
      ${mia ? `<p class="small muted" style="margin:0">Ya guardaste tu mensaje. Lo podés cambiar hasta el 9/12.</p><button class="btn ghost" data-capsula>Cambiar mi mensaje</button>`
        : '<button class="btn" data-capsula style="--c:var(--lav)">Escribir en la cápsula</button>'}</div>`;
  }
  function escribirCapsula() {
    const mia = S.capsula();
    sheet(`<div style="display:grid;gap:12px"><h2>Cápsula del tiempo</h2>
      <p class="small muted" style="margin:0">Se abre el 10/1 y la leen todos. Hasta 500 letras.</p>
      <textarea id="capsula-t" maxlength="500" rows="6" style="width:100%;font:inherit;padding:10px;border-radius:10px;border:2px solid var(--ink)">${esc(mia ? mia.t : '')}</textarea>
      <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-close>Cancelar</button><button class="btn" id="capsula-ok" style="--c:var(--lav)">Guardar</button></div></div>`,
    (bg) => bg.querySelector('#capsula-ok').addEventListener('click', () => {
      S.escribirCapsula(bg.querySelector('#capsula-t').value); bg.remove(); SONIDO.plop();
      toast('<span>Guardado en la cápsula. Se abre el 10/1.</span>'); render();
    }));
  }
  function leerCapsula() {
    const ms = D.PEOPLE.map((p) => [p, S.capsula(p.id)]).filter(([, c]) => c);
    sheet(`<div style="display:grid;gap:14px"><h2>La cápsula del tiempo</h2><p class="small muted" style="margin:0">Lo que escribieron en el viaje, del 6 al 9 de diciembre.</p>
      ${ms.map(([p, c]) => `<div class="capsula-msj"><img class="face" src="${face(p.id)}" alt=""><div><b>${esc(p.n)}</b><p style="margin:2px 0 0;white-space:pre-wrap">${esc(c.t)}</p></div></div>`).join('')}
      <button class="btn" data-close>Cerrar</button></div>`);
  }

  // ---------- Premios Colonia ----------
  // Del 9 al 15/12 se vota en seis categorías (tres de fotos del viaje y tres de personas); el 16/12 salen los ganadores y
  // cada uno cobra 100 monedas (si hay empate, ganan todos los empatados).
  const fotosDelViaje = () => S.fotosColonia().filter((f) => f.creada >= D.PREMIOS.viaje[0] && f.creada < D.PREMIOS.viaje[1]);
  const fotoUrl = (f) => f.url || face(f.pid);
  function ganadoresDe(cat) {
    const v = S.votos(cat), max = Math.max(0, ...Object.values(v));
    return max ? Object.keys(v).filter((k) => v[k] === max).map((id) => ({ id, n: max })) : [];
  }
  function premiosHTML() {
    const hoy = SKY.arDate();
    if (hoy >= D.PREMIOS.resultados) return `<button class="card premios" data-premios><div class="eyebrow">🏆 Premios Colonia</div><b>Ya están los ganadores</b><span class="small muted">Tocá para verlos.</span></button>`;
    if (hoy < D.PREMIOS.desde || hoy > D.PREMIOS.hasta) return '';
    const hechos = D.PREMIOS.cats.filter((c) => S.voto(c.id)).length;
    return `<button class="card premios" data-premios><div class="eyebrow">🏆 Premios Colonia</div><b>Votá hasta el 15/12</b><span class="small muted">${hechos} de ${D.PREMIOS.cats.length} categorías votadas. Los ganadores cobran ${D.PREMIOS.c} monedas.</span></button>`;
  }
  function abrirPremios() {
    if (SKY.arDate() >= D.PREMIOS.resultados) return ganadoresPremios();
    sheet(`<div class="premios-hoja"><h2>🏆 Premios Colonia</h2><p class="small muted" style="margin:0">Elegí en cada categoría. Se puede cambiar hasta el 15/12.</p>
      ${D.PREMIOS.cats.map((c) => { const v = S.voto(c.id); return `<button class="premio-cat" data-cat="${c.id}"><span>${esc(c.t)}</span><span class="small ${v ? '' : 'muted'}">${v ? '✓ votaste' : 'votar'}</span></button>`; }).join('')}
      <button class="btn" data-close>Listo</button></div>`,
    (bg) => bg.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => { bg.remove(); votarCategoria(D.PREMIOS.cats.find((c) => c.id === b.dataset.cat)); })));
  }
  function votarCategoria(cat) {
    const mio = S.voto(cat.id);
    const opciones = cat.tipo === 'foto'
      ? fotosDelViaje().filter((f) => f.pid !== S.me).map((f) => [f.pid + '/' + f.mision, `<img src="${fotoUrl(f)}" alt="" loading="lazy"><span class="small">${esc(person(f.pid).n)}</span>`])
      : D.PEOPLE.filter((p) => p.id !== S.me).map((p) => [p.id, `<img class="face" src="${face(p.id)}" alt=""><span class="small">${esc(p.n)}</span>`]);
    sheet(`<div class="premios-hoja"><h2>${esc(cat.t)}</h2>
      ${opciones.length ? `<div class="premio-opciones ${cat.tipo}">${opciones.map(([id, html]) => `<button class="premio-op${mio === id ? ' on' : ''}" data-op="${esc(id)}">${html}</button>`).join('')}</div>` : '<p class="muted">Todavía no hay fotos del viaje.</p>'}
      <button class="btn ghost" data-volver>Volver</button></div>`,
    (bg) => {
      bg.querySelectorAll('[data-op]').forEach((b) => b.addEventListener('click', () => { S.votar(cat.id, b.dataset.op); SONIDO.plop(); bg.remove(); abrirPremios(); }));
      bg.querySelector('[data-volver]').addEventListener('click', () => { bg.remove(); abrirPremios(); });
    });
  }
  function ganadoresPremios() {
    const fotos = S.fotosColonia();
    const bloque = (c) => {
      const g = ganadoresDe(c.id);
      if (!g.length) return `<div class="premio-res"><b>${esc(c.t)}</b><span class="small muted">Sin votos.</span></div>`;
      return `<div class="premio-res"><b>${esc(c.t)}</b><div class="premio-ganan">${g.map(({ id, n }) => {
        if (c.tipo === 'persona') return `<span class="ganador"><img class="face" src="${face(id)}" alt=""><span class="small">${esc(person(id).n)} · ${n} ${n === 1 ? 'voto' : 'votos'}</span></span>`;
        const [pid, mid] = id.split('/'), f = fotos.find((x) => x.pid === pid && x.mision === mid);
        return `<span class="ganador"><img class="foto" src="${f ? fotoUrl(f) : face(pid)}" alt=""><span class="small">${esc(person(pid).n)} · ${n} ${n === 1 ? 'voto' : 'votos'}</span></span>`;
      }).join('')}</div></div>`;
    };
    sheet(`<div class="premios-hoja"><h2>🏆 Los ganadores</h2>${D.PREMIOS.cats.map(bloque).join('')}<button class="btn" data-close>Cerrar</button></div>`);
  }
  // Si ganaste algo, se cobra al entrar.
  function cobrarPremios() {
    if (!S.me || SKY.arDate() < D.PREMIOS.resultados) return;
    let total = 0;
    D.PREMIOS.cats.forEach((c) => { if (ganadoresDe(c.id).some(({ id }) => (c.tipo === 'persona' ? id : id.split('/')[0]) === S.me)) total += S.cobrarPremio(c.id); });
    if (total) { SONIDO.monedas(total); toast(`<span style="font-size:1.5rem">🏆</span><span>¡Ganaste en los Premios Colonia! <b>+${total}</b> monedas.</span>`, 5000); }
  }

  // ---------- el wrapped de la temporada ----------
  // Desde el 10/1: una historia de tarjetas con lo de cada uno (las cuentas de tiempo y del mar arrancaron el 27/11).
  const WRAP_PRUEBA = PROTO && /[?&]wrapped/.test(location.search);
  function wrappedHTML() {
    if (!WRAP_PRUEBA && SKY.arDate() < D.WRAPPED.desde) return '';
    return `<button class="card wrapped-card" data-wrapped><div class="eyebrow">🎁 Temporada 26/27</div><b>Tu wrapped de la colonia</b><span class="small muted">Lo tuyo de este capítulo, en tarjetas.</span></button>`;
  }
  function puesto(valor, de) {
    const otros = D.PEOPLE.map((p) => de(p.id)).sort((a, b) => b - a);
    return otros.indexOf(valor) + 1;
  }
  function verWrapped() {
    const me = S.me, c = S.cuentas(me), st = S.stats(me), p = person(me), xp = S.xp, L = level(xp);
    const misFotos = S.fotosColonia().filter((f) => f.pid === me);
    const reacRecibidas = (f) => Object.values(S.reacciones(me + '/' + f.mision)).reduce((a, l) => a + l.length, 0);
    const mejor = misFotos.map((f) => [f, reacRecibidas(f)]).sort((a, b) => b[1] - a[1])[0];
    const recibidas = misFotos.reduce((a, f) => a + reacRecibidas(f), 0);
    const reacMias = Object.keys(S.reacDe(me)), aQuien = {};
    reacMias.forEach((k) => { const pid = k.split('/')[0]; if (pid !== me) aQuien[pid] = (aQuien[pid] || 0) + 1; });
    const masReac = Object.entries(aQuien).sort((a, b) => b[1] - a[1])[0];
    const regalos = S.regalosDe(me), itemCuenta = {}, paraCuenta = {};
    regalos.forEach((r) => { itemCuenta[r.item] = (itemCuenta[r.item] || 0) + 1; paraCuenta[r.para] = (paraCuenta[r.para] || 0) + 1; });
    const masItem = Object.entries(itemCuenta).sort((a, b) => b[1] - a[1])[0], masPara = Object.entries(paraCuenta).sort((a, b) => b[1] - a[1])[0];
    const seg = c['app.seg'] || 0, h = Math.floor(seg / 3600), min = Math.round((seg % 3600) / 60);
    const franjas = { 'de madrugada': 0, 'a la mañana': 0, 'a la tarde': 0, 'de noche': 0 };
    misFotos.forEach((f) => { const hh = (new Date(f.creada).getUTCHours() + 21) % 24; franjas[hh < 6 ? 'de madrugada' : hh < 12 ? 'a la mañana' : hh < 19 ? 'a la tarde' : 'de noche']++; });
    const franja = Object.entries(franjas).sort((a, b) => b[1] - a[1])[0];
    const titulos = [
      ['fotos', 'Fotógrafo oficial de la colonia', (pid) => S.stats(pid).fotos],
      ['mar', 'Capitán del mar', (pid) => S.cuentas(pid)['mar.seg'] || 0],
      ['reac', 'Corazón de la colonia', (pid) => S.stats(pid).reacciones],
      ['regalos', 'Papá Noel de la playa', (pid) => S.stats(pid).regalos],
      ['barco', 'Cazador de holandeses', (pid) => S.cuentas(pid)['mar.golpes'] || 0],
      ['app', 'Habitante permanente', (pid) => S.cuentas(pid)['app.seg'] || 0],
    ].map(([k, t, f]) => [k, t, puesto(f(me), f), f(me)]).filter((x) => x[3] > 0).sort((a, b) => a[2] - b[2]);
    const titulo = titulos[0] || ['', 'Colonia de alma', 1, 0];
    const slides = [
      ['var(--celeste)', `<img class="face wr-face" src="${face(me)}" alt=""><h2>Tu temporada 26/27</h2><p>Capítulo 1 · Costa Esmeralda</p><p class="small">Tocá a la derecha para seguir.</p>`],
      ['var(--rose)', `<p>Subiste</p><b class="wr-num">${st.fotos}</b><p>fotos a la colonia</p><p class="small">Puesto ${puesto(st.fotos, (pid) => S.stats(pid).fotos)} de ${D.PEOPLE.length} en fotos.</p>
        ${mejor && mejor[1] ? `<img class="wr-foto" src="${fotoUrl(mejor[0])}" alt=""><p class="small">La que más reacciones tuvo: ${mejor[1]}.</p>` : ''}`],
      ['var(--butter)', `<p>Estuviste en la app</p><b class="wr-num">${h ? `${h} h ${min} min` : `${min} min`}</b><p>${c['app.aperturas'] || 0} veces que entraste</p>${franja && franja[1] ? `<p class="small">Tus fotos, casi siempre ${franja[0]}.</p>` : ''}<p class="small muted">Desde el 27/11, cuando la app empezó a contar.</p>`],
      ['var(--mint)', `<p>Mirando el mar</p><b class="wr-num">${Math.round((c['mar.seg'] || 0) / 60)} min</b><p>${c['mar.notas'] || 0} notas tocadas · ${c['mar.delfines'] || 0} delfines</p><p class="small">${c['mar.hundidos'] ? `Hundiste al Holandés ${c['mar.hundidos']} ${c['mar.hundidos'] === 1 ? 'vez' : 'veces'}` : 'El Holandés no te encontró'}${c['mar.golpes'] ? ` · ${c['mar.golpes']} golpes al barco` : ''}.</p>`],
      ['var(--lav)', `<p>Regalaste</p><b class="wr-num">${regalos.length}</b><p>cosas del kiosco</p>${masItem ? `<div class="wr-item">${ARTE.item(masItem[0], shopItem(masItem[0]).col)}</div><p class="small">Lo que más regalaste: ${esc(shopItem(masItem[0]).n.toLowerCase())}.</p>` : ''}${masPara ? `<p class="small">A quien más le regalaste: ${esc(person(masPara[0]).n)}.</p>` : ''}`],
      ['var(--coral)', `<p>Pusiste</p><b class="wr-num">${reacMias.length}</b><p>reacciones · recibiste ${recibidas}</p>${masReac ? `<img class="face wr-face chica" src="${face(masReac[0])}" alt=""><p class="small">A quien más le reaccionaste: ${esc(person(masReac[0]).n)} (${masReac[1]}).</p>` : ''}`],
      ['var(--celeste)', `<p>Terminaste en</p><b class="wr-num">nivel ${L.i + 1}</b><p>${esc(L.n)} · ${xp} XP</p><p class="small">${st.dias} días entrando a la app.</p>`],
      ['var(--butter)', `<p>Tu título de la temporada</p><b class="wr-titulo">${esc(titulo[1])}</b>${titulo[0] ? `<p class="small">Puesto ${titulo[2]} de ${D.PEOPLE.length} en lo tuyo.</p>` : ''}<p>Nos vemos en el capítulo 2.</p>`],
    ];
    S.contar('wrapped.visto');
    const ov = document.createElement('div');
    ov.className = 'wrapped';
    ov.innerHTML = `<div class="wr-barras">${slides.map(() => '<i><b></b></i>').join('')}</div><button class="wr-cerrar" aria-label="Cerrar">✕</button><div class="wr-slide"></div>`;
    document.body.appendChild(ov);
    let i = 0, t = null;
    const mostrar = (k) => {
      i = Math.max(0, Math.min(slides.length - 1, k));
      ov.style.setProperty('--fondo', slides[i][0]);
      ov.querySelector('.wr-slide').innerHTML = slides[i][1];
      ov.querySelectorAll('.wr-barras i').forEach((b, j) => b.classList.toggle('llena', j < i));
      ov.querySelectorAll('.wr-barras i').forEach((b, j) => b.classList.toggle('va', j === i));
      clearTimeout(t); if (i < slides.length - 1) t = setTimeout(() => mostrar(i + 1), 7000);
    };
    ov.addEventListener('click', (e) => {
      if (e.target.closest('.wr-cerrar')) { clearTimeout(t); ov.remove(); return; }
      mostrar(e.clientX < innerWidth / 3 ? i - 1 : i + 1);
    });
    mostrar(0);
  }

  // ---------- salvavidas de racha ----------
  function salvavidasHTML() {
    const n = S.salvavidas();
    return `<div class="salvavidas-linea small"><span>🛟 Salvavidas de racha: tenés ${n}. Si un día no entrás, te cubre la racha (uno por semana).</span>
      ${n < D.SALVAVIDAS.max ? `<button class="btn ghost" data-salvavidas>Comprar uno · ${D.SALVAVIDAS.p} <span class="coin"></span></button>` : ''}</div>`;
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-salvavidas]');
    if (!b) return;
    if (!S.comprarSalvavidas()) { toast(S.coins < D.SALVAVIDAS.p ? `<span>Te faltan monedas: el salvavidas sale ${D.SALVAVIDAS.p}.</span>` : '<span>Ya tenés los salvavidas que se pueden guardar.</span>'); return; }
    SONIDO.monedas(1);
    const l = b.closest('.salvavidas-linea'); if (l) l.outerHTML = salvavidasHTML();
    toast('<span>🛟 Compraste un salvavidas de racha.</span>');
  });
  function bindMissions(root) {
    root.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => {
      const m = allMissions().find((x) => x.id === b.dataset.m);
      if (trabada(m)) return toast(`<span>${CUANDO_COSTA}, cuando ya estemos todos allá.</span>`);
      const ph = S.photo(m.id);
      if (!ph) return askPhoto(m);
      sheet(`<div style="display:grid;gap:12px;justify-items:center;text-align:center">
        <div class="polaroid foto-grande-w"><img src="${ph}" alt="">${marcaDesap(S.me, m.id)}</div><h2>${esc(m.t)}</h2>
        ${m.id.startsWith('sec-') ? '' : `<div class="foto-reacs" style="width:100%">${reacsHTML(S.me + '/' + m.id)}</div>`}
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
        <button class="silencio small" id="silencio" hidden>🔕 ¿No se escucha? Si el celu está en silencio, tocá acá y suena igual</button>
        <button class="btn ghost mirar" id="mirar">Mirar el mar</button>
      </section>`;
      $('#enter').addEventListener('click', () => go(S.me ? 'hoy' : 'quien'));
      $('#sonido').addEventListener('click', INICIO.alternar);
      $('#silencio').addEventListener('click', (e) => {
        SONIDO.sonarEnSilencio();
        e.currentTarget.textContent = 'Listo: ahora suena aunque el celu esté en silencio';
        setTimeout(() => { const a = $('#silencio'); if (a) a.hidden = true; }, 3500);
      });
      $('#mirar').addEventListener('click', mirarMar);
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
        ${horaHTML()}
        ${wrappedHTML()}
        ${premiosHTML()}
        ${capsulaHTML()}
        ${laRuta()}
        ${entreCapitulos() ? ideasCard() : ''}
        <div class="card"><div class="spread"><div class="eyebrow">Misión del día</div><span class="chip">${c.big} ${esc(c.small)}</span></div>
          <div class="list">${mRow(d, 'Sacá la foto y se vuelve figurita')}</div></div>
        ${S.sobres() && RECUERDOS ? `<button class="card sobres-hoy" data-sobres><span class="sobre chico" aria-hidden="true"><span class="sobre-sello">♡</span></span><span><b>${S.sobres() === 1 ? 'Tenés un sobre sin abrir' : `Tenés ${S.sobres()} sobres sin abrir`}</b><br><span class="small muted">Fotos del baúl de la colonia</span></span><span class="chip" style="--c:var(--rose)">Abrir</span></button>` : ''}
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
        return `<button class="slot${ph ? '' : ' vacia'}" data-a="${m.id}" aria-label="${esc(m.t)}${ph ? '' : ': sacar la foto'}">${ph ? `<img src="${ph}" alt="" loading="lazy" decoding="async">` : `<span class="ph">${IC.camara}<span>${esc(m.t)}</span></span>`}${n ? `<span class="chip n" style="--c:var(--paper)">${n}/${D.PEOPLE.length}</span>` : ''}</button>`;
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
          return `<figure><button class="vf" data-vf="${p.id}" aria-label="Ver la foto de ${esc(p.n)}"><span class="carta-ft-w">${theirs ? `<img class="sq" src="${theirs}" alt="" loading="lazy">` : `<img class="sq" src="${face(p.id)}" alt="" style="filter:saturate(.5) sepia(.25)">`}${marcaDesap(p.id, id)}</span></button><figcaption>${esc(p.n)}</figcaption></figure>`;
        }).join('');
        const hecha = S.photo(id);
        sheet(`<div style="display:grid;gap:12px;justify-items:center;text-align:center">
          ${hecha ? `<div class="polaroid foto-grande-w"><img src="${hecha}" alt="">${marcaDesap(S.me, id)}</div>` : ''}
          <h2>${esc(m.t)}</h2>
          ${hecha && !id.startsWith('sec-') ? `<div class="foto-reacs" style="width:100%">${reacsHTML(S.me + '/' + id)}</div>` : ''}
          ${hecha ? '' : `<p class="small muted" style="margin:0">Sacá esta foto y se vuelve tu figurita: +${m.xp || 20} de experiencia y +10 monedas.</p>`}
          ${strip ? `<div style="width:100%;text-align:left"><div class="eyebrow">${hecha ? 'Las de los demás' : 'Ya la sacaron'}</div><div class="strip">${strip}</div></div>` : ''}
          <div class="row" style="justify-content:center">${hecha ? '<button class="btn ghost" id="go">Cambiar mi foto</button><button class="btn" data-close>Listo</button>'
            : `<button class="btn ghost" data-close>${NAH}</button><button class="btn" id="go" style="--c:var(--mint)">Sacar la foto</button>`}</div></div>`,
        (bg) => {
          const g = bg.querySelector('#go'); if (g) g.addEventListener('click', () => { bg.remove(); askPhoto(m); });
          bg.querySelectorAll('[data-vf]').forEach((v) => v.addEventListener('click', () => verFoto(v.dataset.vf, id, S.photoOf(v.dataset.vf, id), m.t)));
        });
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
          <p class="small muted" style="margin:0">Mantené apretada una cosa para moverla. Tocala para verla, pintarla o guardarla. ${S.loteAncho() > 1 ? 'Con dos dedos te acercás y te alejás; acercado, deslizá para recorrer tu playa.' : 'Con dos dedos te acercás.'}${D.LOTES[S.lote()] ? ' ¿Te queda chica? En el kiosco hay lotes de playa.' : ''}</p>${bolsaHTML()}
          ${S.altar().items.some((it) => it.id === 'avioneta') ? `<button class="btn ghost" id="cartelAvioneta">✏️ Cartel de la avioneta: «${esc(cartelAvioneta(S.me))}»</button>` : ''}
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
      const ca = $('#cartelAvioneta');
      if (ca) ca.addEventListener('click', () => sheet(`<div style="display:grid;gap:12px"><h2>El cartel de tu avioneta</h2>
        <p class="small muted" style="margin:0">Lo ven todos cuando cruza el cielo en Mirar el mar y en tu altarcito. Hasta 40 letras.</p>
        <input id="cartel-t" maxlength="40" value="${esc(S.achDe(S.me).avioneta || '')}" placeholder="${esc(cartelAvioneta(S.me))}" style="font:inherit;padding:10px;border-radius:10px;border:2px solid var(--ink)">
        <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-close>Cancelar</button><button class="btn" id="cartel-ok">Guardar</button></div></div>`,
      (bg) => bg.querySelector('#cartel-ok').addEventListener('click', () => { S.setCartelAvioneta(bg.querySelector('#cartel-t').value); bg.remove(); SONIDO.plop(); render(); })));
    },

    kiosco() {
      const L = S.level();
      const blockedFor = (it, pid) => it.side === 'R' && (it.id === 'sombrilla' ? S.hasRefugio(pid) : S.hasRefugio(pid, 'carpa'));
      const cell = (it) => {
        const locked = it.lv > L + 1, blocked = blockedFor(it, S.me);
        return `<button class="item${locked ? ' locked' : ''}" data-i="${it.id}" ${locked ? 'aria-disabled="true"' : ''}>
          <span class="ic" style="--c:var(--paper)">${ARTE.item(it.id, it.col)}</span>
          <span>${esc(it.n)}</span><span class="small">${locked ? 'nivel ' + it.lv : blocked ? 'ya tenés' : it.p + ' <span class="coin"></span>'}</span>${para && !locked ? `<span class="small xp-regalo">+${D.xpRegalo(it.p)} XP</span>` : ''}</button>`;
      };
      const grupo = (f) => D.SHOP.filter((x) => ARTE.has(x.id) && !x.retirado && !x.unico && f(x)).sort((a, b) => a.p - b.p).map(cell).join('');
      const bloque = (t, nota, f) => { const h = grupo(f); return h ? `<div class="card"><div class="eyebrow">${t}</div>${nota ? `<p class="small muted" style="margin:0">${nota}</p>` : ''}<div class="shop">${h}</div></div>` : ''; };
      const para = regalarA && person(regalarA);
      // Lotes de playa: el que sigue, de a uno. Agrandan tu altarcito hacia el costado.
      const lote = D.LOTES[S.lote()], loteBloq = lote && lote.lv > L + 1;
      const veces = (k) => String(k).replace('.', ',');
      const loteCard = !para && lote ? `<div class="card lote-card"><div class="eyebrow">Más playa para tu altarcito</div><div class="spread">
          <div><b>${esc(lote.n)}</b><p class="small muted" style="margin:2px 0 0">${esc(lote.d)} Queda ${veces(lote.ancho)} veces más ancho.</p></div>
          <button class="btn" id="lote" style="--c:var(--celeste)"${loteBloq ? ' aria-disabled="true"' : ''}>${loteBloq ? 'nivel ' + lote.lv : lote.p + ' <span class="coin"></span>'}</button></div></div>` : '';
      const tengo = S.logroValor('compras'), hay = S.logroMeta('compras', 'todo');
      screen.innerHTML = `${top()}
        <div class="spread"><h1 class="on-sky" style="font-size:1.7rem">Kiosco</h1>${para ? '<button class="btn ghost" id="noRegalar">Volver a su altarcito</button>' : '<a class="btn ghost" href="#altar" style="text-decoration:none">Volver al altarcito</a>'}</div>
        ${para ? `<div class="card para-quien"><img class="face" src="${face(para.id)}" alt=""><div><b>Elegí algo para ${esc(para.n)}</b><p class="small muted" style="margin:0">Va directo a su altarcito, con tu nombre. Regalar suma experiencia: 1 XP cada 2 monedas.</p></div></div>`
          : `<p class="on-sky-soft" style="margin:0">Todo lo que comprás va a tu altarcito playero. Si lo regalás, además suma experiencia: 1 XP cada 2 monedas. <b>Compraste ${Math.min(tengo, hay)} de las ${hay} cosas del kiosco.</b></p>`}
        ${loteCard}
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
          <div class="row" style="justify-content:center"><span class="chip" style="--c:var(--butter)">${it.p} <span class="coin"></span></span><span class="chip" style="--c:var(--mint)">+${D.xpRegalo(it.p)} XP si lo regalás</span></div>
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
              setTimeout(() => toastXp(`Por regalarle a ${person(to).n}`, k), 500);
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
      const lb = $('#lote');
      if (lb) lb.addEventListener('click', () => {
        if (loteBloq) return toast(`<span>${esc(lote.n)} se desbloquea en el nivel ${lote.lv}.</span>`);
        const ancho = (k) => `<div class="lote-dibujo" style="--k:${k}"><i></i></div>`;
        sheet(`<div style="display:grid;gap:12px;justify-items:center;text-align:center">
          <div class="eyebrow">Más playa</div><h2>${esc(lote.n)}</h2><p class="desc">${esc(lote.d)}</p>
          <div class="lote-antes">${ancho(S.loteAncho())}<span aria-hidden="true">→</span>${ancho(lote.ancho)}</div>
          <p class="small muted" style="margin:0">Lo que ya acomodaste queda donde está. Las cosas que nunca moviste se reparten por la playa nueva. Alejate con dos dedos (o con −) para ver todo.</p>
          ${S.coins >= lote.p ? `<button class="btn" id="siLote" data-mudo style="--c:var(--celeste)">Comprar por ${lote.p} <span class="coin"></span></button>` : `<p class="muted" style="margin:0">Te faltan ${lote.p - S.coins} monedas.</p>`}
          <button class="btn ghost" data-close>${NAH}</button></div>`,
        (bg) => {
          const si = bg.querySelector('#siLote');
          if (si) si.addEventListener('click', () => {
            const it = S.comprarLote();
            if (!it) return;
            bg.remove(); SONIDO.monedas(it.p, -1);
            toast(`<span>¡Listo! Tu altarcito ahora es ${veces(it.ancho)} veces más ancho. Mové tus cosas a la playa nueva.</span>`, 4500);
            go('altar');
          });
        });
      });
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
  // Todas las fotos que subió alguien, con la misión de cada una (las secretas, solo en tu propia tarjeta).
  function fotosDe(pid) {
    const out = S.fotosColonia().filter((f) => f.pid === pid).map((f) => ({ url: f.url, t: tituloFoto(f.mision, pid), creada: f.creada, mision: f.mision }));
    if (pid === S.me) secretasHasta().filter((m) => S.photo(m.id)).forEach((m) => out.push({ url: S.photo(m.id), t: m.t, creada: m.dia + 'T15:00:00Z', secreta: true, mision: m.id }));
    return out.sort((a, b) => String(b.creada).localeCompare(String(a.creada))).map((f) => Object.assign(f, { cuando: fechaFoto(f.creada) }));
  }
  // Una foto en grande: qué misión era, de quién, cuándo, y para reaccionar como en Colonia (las secretas no se reaccionan).
  function verFoto(pid, mid, url, t, cuando, secreta) {
    if (cuando == null) { const f = S.fotosColonia().find((x) => x.pid === pid && x.mision === mid); cuando = f ? fechaFoto(f.creada) : ''; }
    sheet(`<div class="sobre-hoja"><div class="polaroid recuerdo-grande foto-grande-w"><img src="${url || face(pid)}" alt="">${secreta ? '' : marcaDesap(pid, mid)}</div>
      <div class="eyebrow">${secreta ? 'Misión secreta' : 'Misión'}</div><h2 style="margin-top:-6px">${esc(t || tituloFoto(mid, pid))}</h2>
      <p class="small muted" style="margin:0">${esc(person(pid).n)}${cuando ? ' · ' + cuando : ''}</p>
      ${secreta ? '' : `<div class="foto-reacs">${reacsHTML(pid + '/' + mid)}</div>`}
      <button class="btn" data-close>Listo</button></div>`,
    (hb) => hb.addEventListener('click', (e) => { const rb = e.target.closest('[data-reac]'); if (rb) reaccionar(rb); }));
  }
  function carta(pid) {
    S.contar('tarjetas');
    const vos = pid === S.me, p = person(pid), c = (CARTAS && CARTAS[pid]) || {}, xp = vos ? S.xp : S.xpOf(pid), L = level(xp);
    const hab = (c.hab || []).map(([k, n]) => `<div class="hab${n > 10 ? ' over' : ''}"><span>${esc(k)}</span><span class="nivel"><i style="width:${Math.min(n, 10) * 10}%"></i></span><b>${n}</b></div>`).join('');
    const tier = tierDePid(pid), fotos = fotosDe(pid);
    sheet(`<div class="carta${c.foil ? ' foil' : ''}${tier ? ' tier-' + tier.id : ''}" style="--el:${ELEMENTO[c.e] || 'var(--butter)'}">
      <div class="carta-foto"><img src="${S.artUrl(`cartas/${pid}.webp?v=${D.CARTAS_V}`)}" alt="${esc(p.n)}"></div>
      <div class="carta-id"><h2>${esc(p.n)}</h2>${c.apodo ? `<p class="carta-apodo">${esc(c.apodo)}</p>` : ''}${c.t ? `<p>${esc(c.t)}</p>` : ''}
        ${c.s || tier ? `<div class="row">${c.s ? `<span class="chip" style="--c:var(--el)">${SIGNO[c.s] || ''}&#xFE0E; ${esc(c.s)}</span>` : ''}${tier ? `<span class="chip tier-chip tier-${tier.id}">Tarjeta de ${tier.n.toLowerCase()}</span>` : ''}</div>` : ''}</div>
      <div class="carta-sec carta-xp"><div class="spread"><b>Nivel ${L.i + 1} · ${esc(L.n)}</b><span class="small">${xp} XP</span></div>
        ${barraXp(xp)}<p class="small muted">${esc(faltaXp(xp, vos))}</p><p class="small racha-linea">${esc(rachaTexto(pid))}</p>${vos ? salvavidasHTML() + COMO_XP() : ''}</div>
      ${c.bio ? `<p class="carta-bio">${esc(c.bio)}</p>` : ''}
      ${hab ? `<div class="carta-sec"><div class="eyebrow">Habilidades</div>${hab}</div>` : ''}
      ${c.poder ? `<div class="carta-sec"><div class="eyebrow">Poder</div><p>${esc(c.poder)}</p></div>` : ''}
      ${c.deb ? `<div class="carta-sec"><div class="eyebrow">Debilidad</div><p>${esc(c.deb)}</p></div>` : ''}
      ${c.dato ? `<p class="carta-dato">${esc(c.dato)}</p>` : ''}
      <div class="carta-sec"><div class="eyebrow">${vos ? 'Tus fotos' : 'Sus fotos'} · ${fotos.length}</div>
        ${fotos.length ? `<div class="carta-fotos">${fotos.map((f, i) => `<button class="carta-ft" data-ft="${i}"><span class="carta-ft-w"><img src="${f.url || face(pid)}" alt="" loading="lazy" decoding="async"${f.url ? '' : ' style="filter:saturate(.5) sepia(.25)"'}>${f.secreta ? '' : marcaDesap(pid, f.mision)}</span><span>${esc(f.t)}</span><small>${f.secreta ? 'misión secreta · ' : ''}${f.cuando}</small></button>`).join('')}</div>`
          : `<p class="small muted">${vos ? 'Todavía no subiste' : 'Todavía no subió'} ninguna foto.</p>`}</div>
      <div class="row" style="justify-content:center">${vos ? '<button class="btn ghost" id="miPerfil">Cambiar mi foto de perfil</button>' : '<button class="btn ghost" id="suAltar">Ver su altarcito</button>'}<button class="btn" data-close>Listo</button></div></div>`,
    (bg) => {
      bg.insertAdjacentHTML('afterbegin', '<button class="cruz cerrar-hoja" data-close aria-label="Cerrar la tarjeta"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>');
      const im = bg.querySelector('.carta-foto img'), al = bg.querySelector('#suAltar');
      im.addEventListener('error', () => { im.src = face(pid); }, { once: true });
      bg.querySelectorAll('[data-ft]').forEach((b) => b.addEventListener('click', () => {
        const f = fotos[+b.dataset.ft];
        verFoto(pid, f.mision, f.url, f.t, f.cuando, f.secreta);
      }));
      if (al) al.addEventListener('click', () => { bg.remove(); visit(pid); });
      const mp = bg.querySelector('#miPerfil'); if (mp) mp.addEventListener('click', () => { bg.remove(); cambiarPerfil(); });
    });
  }
  // Foto de perfil: cada uno puede cambiar la de WhatsApp por otra (se recorta cuadrada, al centro).
  function cambiarPerfil() {
    let inp = $('#perfilFile');
    if (!inp) { inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.id = 'perfilFile'; inp.hidden = true; document.body.appendChild(inp); }
    inp.value = '';
    inp.onchange = async () => {
      const f = inp.files[0];
      if (!f) return;
      let url;
      try { url = await squareImage(f, 400); } catch (e) { return toast('<span>No pude leer esa foto. Probá con otra.</span>'); }
      sheet(`<div class="sobre-hoja"><div class="eyebrow">Tu foto de perfil</div>
        <img class="face perfil-previa" src="${url}" alt="">
        <p class="small muted" style="margin:0">Así te van a ver en la app: en el ranking, en las reacciones y cuando entrás.</p>
        <div class="row" style="justify-content:center"><button class="btn ghost" id="otraPerfil">Elegir otra</button><button class="btn" id="usarPerfil" style="--c:var(--mint)">Usar esta</button></div>
        ${S.tienePerfil() ? '<button class="vender" id="volverWa">Volver a la de WhatsApp</button>' : ''}</div>`,
      (bg) => {
        bg.querySelector('#otraPerfil').addEventListener('click', () => { bg.remove(); cambiarPerfil(); });
        bg.querySelector('#usarPerfil').addEventListener('click', async () => {
          bg.remove(); render();
          const ok = await S.setPerfil(url);
          toast(ok ? '<span>Listo, ya tenés tu foto nueva.</span>' : '<span>Quedó en este celu, pero no se pudo subir. Probá de nuevo con señal.</span>');
          render();
        });
        const wa = bg.querySelector('#volverWa');
        if (wa) wa.addEventListener('click', () => { bg.remove(); S.setPerfil(null); toast('<span>Volviste a la foto de WhatsApp.</span>'); render(); });
      });
    };
    elegirFoto(inp, 'user'); // la cámara de adelante, para una selfie
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
    else if (e.target.closest('[data-capsula]')) escribirCapsula();
    else if (e.target.closest('[data-capsula-leer]')) leerCapsula();
    else if (e.target.closest('[data-premios]')) abrirPremios();
    else if (e.target.closest('[data-wrapped]')) verWrapped();
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
    const bonos = S.bonos(), cosas = bonos.filter((b) => b.item && shopItem(b.item));
    const got = S.dailyCheck().map((k) => D.ACH[k]).concat(bonos.filter((b) => b.c));
    got.forEach((a, i) => setTimeout(() => toast(`<span class="chip" style="--c:var(--butter)">+${a.c} <span class="coin"></span></span><span>${esc(a.t)}</span>`), i * 700));
    if (cosas.length) setTimeout(() => souvenir(cosas[0]), 900);
    if (got.length) { SONIDO.monedas(got.reduce((n, a) => n + a.c, 0)); setTimeout(render, got.length * 700); }
    setTimeout(cobrarPremios, 1500);
    if (S.salvavidasUsado) { const d = S.salvavidasUsado.split('-'); S.salvavidasUsado = null; setTimeout(() => toast(`<span>🛟 El ${+d[2]}/${+d[1]} no entraste: usaste un salvavidas y tu racha sigue.</span>`, 5000), 600); }
    const rh = S.rachaHoy; S.rachaHoy = null;
    if (rh) setTimeout(() => toastXp(rh.dias === D.RACHA.dorado ? `¡${rh.dias} días seguidos! Tu foto ya tiene borde dorado ✦` : `Racha de ${rh.dias} días seguidos${rh.dias > D.RACHA.dorado ? ' ✦' : ''}`, rh), got.length * 700 + 400);
  }

  // Papelitos de colores que salen volando (cumples y regalos especiales).
  function papelitos(n = 36) {
    const colores = ['var(--coral)', 'var(--mint)', 'var(--butter)', 'var(--celeste)', 'var(--lav)', 'var(--rose)'];
    return `<div class="confeti" aria-hidden="true">${Array.from({ length: n }, (_, k) => {
      const a = (k / n) * Math.PI * 2 + Math.random() * 0.4, d = 100 + Math.random() * 100;
      return `<i style="--x:${Math.round(Math.cos(a) * d)}px;--y:${Math.round(Math.sin(a) * d - 40)}px;--r:${Math.round(Math.random() * 540 - 270)}deg;background:${colores[k % 6]}"></i>`;
    }).join('')}</div>`;
  }
  // Una cosa que la app le da a todos (D.BONOS con item), como el souvenir del cumple de las mellis.
  function souvenir(b) {
    const it = shopItem(b.item), venta = D.precioVenta(it);
    if (document.querySelector('.sheet-bg')) { setTimeout(() => souvenir(b), 1500); return; }
    sheet(`<div class="regalo-nuevo de-cumple">${b.titulo ? papelitos() : ''}
      ${b.titulo ? `<h1 class="cumple-titulo pop">${esc(b.titulo)}</h1>` : ''}<p class="cumple-sub">${esc(b.t)}</p>
      <div class="art-big pop" style="width:150px;height:150px">${ARTE.item(it.id, it.col)}</div>
      <h2>${esc(it.n)}</h2>
      <p class="small muted" style="margin:0">Ya está en tu altarcito.${venta ? ` Si no lo querés, lo podés vender por ${venta} monedas.` : ''}</p>
      <div class="row" style="justify-content:center"><button class="btn ghost" data-close>Listo</button><button class="btn" id="aMiAltar" style="--c:var(--rose)">Ver mi altarcito</button></div></div>`,
    (bg) => bg.querySelector('#aMiAltar').addEventListener('click', () => { bg.remove(); go('altar'); }));
    SONIDO.si();
  }

  // ---------- regalos que llegaron ----------
  // Al entrar (o al volver a mirar la app) aparece lo que te regalaron y todavía no viste: la cosa y la cara de quien te la mandó.
  function mostrarRegalos() {
    const r = location.hash.slice(1);
    if (!S.me || !r || r === 'portada' || r === 'quien' || document.hidden || document.querySelector('.sheet-bg')) return;
    const nuevos = S.regalosNuevos().filter((g) => shopItem(g.item) && !shopItem(g.item).retirado && person(g.from));
    if (!nuevos.length) return;
    S.verRegalos(nuevos.map((g) => g.id));
    const uno = nuevos.length === 1, primero = nuevos[0];
    const fila = (g) => { const it = shopItem(g.item);
      return `<div class="regalo-fila"><img class="face" src="${face(g.from)}" alt=""><span><b>${esc(it.n)}</b><br><span class="small muted">de parte de ${esc(person(g.from).n)}</span></span><span class="mini">${ARTE.item(it.id, it.col)}</span></div>`; };
    const it1 = shopItem(primero.item);
    // Si es un regalo de cumple (D.CUMPLES), arriba va el saludo grande en mayúscula, con papelitos.
    const cumple = nuevos.map((g) => D.CUMPLES[g.item]).find(Boolean);
    sheet(`<div class="regalo-nuevo${cumple ? ' de-cumple' : ''}">${cumple ? papelitos() : ''}
      ${cumple ? `<h1 class="cumple-titulo pop">${esc(cumple.t)}</h1><p class="cumple-sub">${esc(cumple.s)}</p>` : ''}
      <div class="eyebrow">${uno ? '¡Te llegó un regalo!' : `¡Te llegaron ${nuevos.length} regalos!`}</div>
      ${uno ? `<div class="regalo-escena"><img class="face" src="${face(primero.from)}" alt=""><span class="lazo" aria-hidden="true">♡</span><div class="art-big pop">${ARTE.item(it1.id, it1.col)}</div></div>
        <h2>${esc(it1.n)}</h2><p class="regalado" style="margin:-8px 0 0">De parte de <b>${esc(person(primero.from).n)}</b> ♡</p>`
        : `<div class="regalo-lista">${nuevos.slice(0, 6).map(fila).join('')}</div>${nuevos.length > 6 ? `<p class="small muted" style="margin:0">Y ${nuevos.length - 6} más.</p>` : ''}`}
      <p class="small muted" style="margin:0">Ya está en tu altarcito.</p>
      <div class="row" style="justify-content:center"><button class="btn ghost" data-close>Listo</button><button class="btn" id="aMiAltar" style="--c:var(--rose)">Ver mi altarcito</button></div></div>`,
    (bg) => bg.querySelector('#aMiAltar').addEventListener('click', () => { bg.remove(); go('altar'); }));
    if (cumple) SONIDO.si(); else { SONIDO.plop(); setTimeout(SONIDO.plop, 140); }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(mostrarRegalos, 500); });

  // ---------- navegación ----------
  function go(r) { if (location.hash === '#' + r) render(); else location.hash = r; }
  let logrosT = null, ultimaPantalla = '', dibujada = '', altoT = null, pendiente = false;
  // Lo que llega solo (listas del bucket al abrir): se redibuja si estás arriba de todo; si no, queda para después.
  function renderSiArriba() { if (scrollY < 40 && !document.querySelector('.sheet-bg') && !dragging) render(); else pendiente = true; }
  function render() {
    let r = location.hash.slice(1) || 'portada';
    if (r === 'misiones') r = 'album'; // Misiones quedó adentro del álbum
    if (!SCREENS[r]) r = 'portada';
    if (r !== 'portada' && r !== 'quien' && !S.me) r = 'quien';
    if (r === 'quien' && S.me) r = 'hoy';
    if (r !== ultimaPantalla) { ultimaPantalla = r; S.contar('ver.' + r); } // para el wrapped: qué pantallas se usan más
    if (r !== 'kiosco') regalarA = null; // el modo "regalarle a alguien" dura mientras estás en el kiosco
    if (r !== 'portada') salirDelMar();
    actualizarDorados();
    if (S.devuelto && S.me) { const n = S.devuelto; S.devuelto = 0; setTimeout(() => toast(`<span class="chip" style="--c:var(--butter)">+${n} <span class="coin"></span></span><span>Sacamos el buzo del kiosco: te devolvimos lo que pagaste.</span>`, 5000), 1200); }
    // Si es la misma pantalla (después de tocar algo), se queda donde estabas: el alto se sostiene mientras cargan las fotos.
    const misma = r === dibujada, y = scrollY;
    if (misma) { clearTimeout(altoT); screen.style.minHeight = screen.offsetHeight + 'px'; }
    SCREENS[r]();
    dibujada = r; pendiente = false;
    if (misma) { scrollTo(0, y); altoT = setTimeout(() => { screen.style.minHeight = ''; }, 1500); }
    screen.querySelectorAll('img:not([decoding])').forEach((i) => { i.decoding = 'async'; }); // que decodificar fotos no trabe el scroll
    if (fotoPorArmar) setTimeout(() => armarFoto(screen), 300);
    if (r === 'portada') INICIO.entrar(); else INICIO.salir();
    const tabs = $('#tabs');
    tabs.hidden = !S.me || r === 'portada';
    const cur = r === 'kiosco' ? 'altar' : r === 'calendario' ? 'hoy' : r;
    tabs.innerHTML = TABS.map(([k, l]) => `<a href="#${k}" class="${k === cur ? 'on' : ''}" ${k === cur ? 'aria-current="page"' : ''}>${IC[k]}<span>${l}</span></a>`).join('');
    const dev = $('#devbtn'); if (dev) dev.hidden = r === 'portada';
    if (r !== 'portada' && r !== 'quien') { setTimeout(() => finDeCapitulo() || mostrarRegalos() || mostrarSobres(), 700); setTimeout(revisarAmigos, 1800); setTimeout(avisarReacciones, 1400); setTimeout(avisarCosta, 1000); clearTimeout(logrosT); logrosT = setTimeout(revisarLogros, 2600); }
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

  // ---------- mirar el mar ----------
  // Se esconde todo, el horizonte sube y queda la playa. Tocar deja chispitas en espiral y una nota de la pentatónica de fa:
  // abajo, grave; arriba, aguda y más bajita. Dejar el dedo apoyado suma un colchón: arriba y abajo cambia la nota (del acorde,
  // de a un paso); a los costados, la oscilación (a la izquierda lenta, a la derecha rápida y más bajita).
  // Arriba a la derecha, "volver"; arriba a la izquierda, la botella para tirarle un mensaje a alguien de la colonia.
  let dedo = null; // el dedo apoyado: { id, t (para empezar el colchón), pad, halo, ult }
  const SOSTENER_MS = 320;
  // Para el wrapped: cuántas veces, cuánto tiempo (total y la más larga), a qué hora, y cuántas notas y colchones.
  let marDesde = 0;
  function mirarMar() {
    document.body.classList.add('quieto', 'mirando');
    marDesde = Date.now();
    S.contar('mar.veces'); S.contar('mar.h' + String(new Date(Date.now() - 3 * 36e5).getUTCHours()).padStart(2, '0'));
    const capa = document.createElement('div');
    capa.className = 'mirar-capa';
    capa.innerHTML = `<button class="volver-mirar" data-mudo>volver</button>
      <button class="botella-mirar" data-mudo aria-label="Tirar una botella al mar">${ARTE.item('botella')}</button>`;
    document.body.appendChild(capa);
    capa.querySelector('.volver-mirar').addEventListener('click', salirDelMar);
    capa.querySelector('.botella-mirar').addEventListener('click', tirarBotella);
    const alto = (e) => 1 - e.clientY / innerHeight, lado = (e) => (e.clientX / innerWidth) * 2 - 1, equis = (e) => e.clientX / innerWidth;
    capa.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      if (tocarSirena(e.clientX, e.clientY) || tocarBarco(e.clientX, e.clientY) || tocarPelota(e.clientX, e.clientY) || tocarHeladerita(e.clientX, e.clientY) || tocarMascota(e.clientX, e.clientY)
        || tocarPaquete(e.clientX, e.clientY) || tocarCatalejo(e.clientX, e.clientY) || tocarChozita(e.clientX, e.clientY) || tocarCofre(e.clientX, e.clientY)
        || tocarCastillo(e.clientX, e.clientY) || tocarPaleta(e.clientX, e.clientY) || tocarBanana(e.clientX, e.clientY)) return; // la cola de sirena, el barco con el aro o una mascota
      if (tocarPersonita(e.clientX, e.clientY)) return; // a una personita se la toca para sentarse o saludar, no suena
      bengala(e.clientX, e.clientY);
      chispas(e.clientX, e.clientY);
      INICIO.toque(lado(e), alto(e));
      S.contar('mar.notas');
      mandarNota(e);
      if (dedo) return; // un solo colchón a la vez; los otros dedos solo tocan notas
      try { capa.setPointerCapture(e.pointerId); } catch (err) { /* sin captura igual anda */ }
      const d = (dedo = { id: e.pointerId, x: e.clientX, y: e.clientY, ult: 0 });
      d.t = setTimeout(() => {
        if (dedo !== d) return;
        d.pad = INICIO.sostener(1 - d.y / innerHeight, d.x / innerWidth);
        S.contar('mar.colchones');
        d.halo = document.createElement('div');
        d.halo.className = 'halo-dedo';
        document.body.appendChild(d.halo);
        moverHalo(d);
      }, SOSTENER_MS);
    });
    capa.addEventListener('pointermove', (e) => {
      const d = dedo;
      if (!d || e.pointerId !== d.id) return;
      d.x = e.clientX; d.y = e.clientY;
      if (!d.halo) return;
      if (d.pad) d.pad.mover(alto(e), equis(e));
      moverHalo(d);
      if (performance.now() - d.ult > 140) { d.ult = performance.now(); chispas(d.x, d.y, 4); }
    });
    const suelta = (e) => { if (dedo && e.pointerId === dedo.id) soltarDedo(); };
    capa.addEventListener('pointerup', suelta);
    capa.addEventListener('pointercancel', suelta);
    if (conPersona()) {
      S.mirarElMar(true); // los demás que estén mirando el mar te ven en su orilla
      S.enviarMar({ t: 'hola', como: quienMira() });
      const p = document.createElement('div');
      p.className = 'pista-mar';
      p.textContent = 'Tocá tu personita para sentarte · tocá a otra para saludarla';
      capa.appendChild(p);
      setTimeout(() => p.classList.add('fuera'), 5500);
    }
    armarEscena();
    clearInterval(relojMar); relojMar = setInterval(latidoMar, 1000);
  }
  // El halo late al mismo ritmo que el colchón: a la izquierda lento, a la derecha rápido (y más tenue).
  function moverHalo(d) {
    const a = clamp(d.x / innerWidth, 0, 1);
    d.halo.style.left = d.x + 'px'; d.halo.style.top = d.y + 'px';
    d.halo.style.setProperty('--p', (1 / (0.35 * Math.pow(8 / 0.35, a)) / 2).toFixed(3) + 's');
    d.halo.style.opacity = (1 - 0.5 * a).toFixed(2);
  }
  function soltarDedo() {
    const d = dedo;
    if (!d) return;
    dedo = null; clearTimeout(d.t);
    if (d.pad) d.pad.soltar();
    if (d.halo) { const h = d.halo; h.classList.add('fuera'); setTimeout(() => h.remove(), 900); }
  }
  function salirDelMar() {
    soltarDedo();
    if (marDesde) { const seg = Math.round((Date.now() - marDesde) / 1000); S.contar('mar.seg', seg); S.record('mar.max', seg); marDesde = 0; }
    document.body.classList.remove('quieto', 'mirando');
    document.querySelectorAll('.mirar-capa').forEach((n) => n.remove());
    clearInterval(relojMar); relojMar = null;
    sacarEscena();
    S.mirarElMar(false);
  }
  const CHISPA = ['#ffffff', '#fff6d8', '#ffe39a', '#c9ecfa', '#f9d9e4'];
  function chispas(x, y, cuantas = 12, colores = CHISPA) {
    const c = document.createElement('div');
    c.className = 'chispas'; c.style.left = x + 'px'; c.style.top = y + 'px';
    c.innerHTML = Array.from({ length: cuantas }, (_, i) => {
      const giro = (150 + Math.random() * 170) * (i % 2 ? 1 : -1);
      return `<i style="--a:${Math.round((i * 360) / cuantas + Math.random() * 24)}deg;--g:${Math.round(giro)}deg;--r:${Math.round(12 + Math.random() * 22)}px;--s:${(1.6 + Math.random() * 1.8).toFixed(1)}px;background:${colores[i % colores.length]}"></i>`;
    }).join('');
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 1100);
  }

  // ---------- la botella entre amigos ----------
  // Una por día: el mensaje le llega flotando al altarcito de alguien de la colonia, al azar (quien la tira no sabe a quién).
  function tirarBotella() {
    if (!S.me) return toast('<span>Primero entrá a la colonia para tirar botellas.</span>');
    if (S.botellaHoy()) return toast('<span>Ya tiraste una botella hoy. Mañana podés tirar otra.</span>', 3600);
    sheet(`<div class="tirar-botella"><div class="eyebrow">Una botella al mar</div>
      <p class="small muted" style="margin:0">Le va a llegar flotando al altarcito de alguien de la colonia, al azar. Una por día.</p>
      <textarea id="msjBotella" maxlength="140" rows="3" placeholder="Escribí tu mensaje"></textarea>
      <div class="row" style="justify-content:center"><button class="btn ghost" data-close>${NAH}</button><button class="btn" id="tirar" data-mudo style="--c:var(--celeste)">Tirarla al mar</button></div></div>`,
    (bg) => {
      const ta = bg.querySelector('#msjBotella');
      setTimeout(() => ta.focus(), 250);
      bg.querySelector('#tirar').addEventListener('click', () => {
        const t = ta.value.trim();
        if (!t) { ta.focus(); return; }
        if (!S.tirarBotella(t)) return;
        S.contar('botellas');
        bg.remove();
        vuelaBotella();
        setTimeout(() => toast('<span>Tu botella va flotando hacia el altarcito de alguien de la colonia.</span>', 4200), 1300);
      });
    });
  }
  // Sale de abajo, hace un arco y cae al mar (con un chapuzón de chispitas).
  function vuelaBotella() {
    const b = document.createElement('div');
    b.className = 'botella-vuela'; b.innerHTML = ARTE.item('botella');
    document.body.appendChild(b);
    const x0 = innerWidth * 0.5, y0 = innerHeight * 0.92, x1 = innerWidth * (0.3 + Math.random() * 0.4), y1 = innerHeight * 0.6;
    b.animate([
      { transform: `translate(${x0}px, ${y0}px) rotate(0deg) scale(1)` },
      { transform: `translate(${(x0 + x1) / 2}px, ${innerHeight * 0.32}px) rotate(260deg) scale(.75)`, offset: 0.5 },
      { transform: `translate(${x1}px, ${y1}px) rotate(520deg) scale(.45)` },
    ], { duration: 1200, easing: 'cubic-bezier(.3,.1,.5,1)' }).onfinish = () => {
      b.remove(); chispas(x1, y1, 10, ['#ffffff', '#c9ecfa', '#a9d6f0']); SONIDO.chap(0.5);
    };
  }
  // En tu altarcito: la primera botella de un amigo que no abriste, flotando en el agua.
  function botellaAmigoHTML(K) {
    const b = S.botellasParaMi()[0];
    if (!b) return '';
    const r = rnd(b.id), x = 0.18 + r() * (K - 0.36), y = 0.47 + r() * 0.02, w = (ARTE.size('botella').w / 4 * ESCALA * 0.9 / K).toFixed(2);
    return `<div class="it hallazgo botella amigo mar flota" data-hallazgo="amigo" data-bid="${esc(b.id)}" role="button" tabindex="0" aria-label="Llegó una botella de alguien de la colonia"
      style="left:${(x / K * 100).toFixed(2)}%;top:${(y * 100).toFixed(2)}%;width:${w}%;z-index:61">${ARTE.item('botella')}<i class="brillo" aria-hidden="true">♥</i></div>`;
  }
  function abrirBotellaAmigo(el) {
    const b = S.botellasParaMi().find((x) => x.id === el.dataset.bid);
    if (!b || !S.leerBotella(b.id)) return;
    el.classList.add('se-va');
    SONIDO.monedas(D.BOTELLA_AMIGO);
    const de = person(b.de);
    sheet(`<div class="hallazgo-hoja"><div class="eyebrow">Llegó una botella</div>
      <span class="chip" style="--c:var(--butter)">+${D.BOTELLA_AMIGO} <span class="coin"></span></span>
      <div class="papel"><p class="msj claro">${esc(b.t)}</p></div>
      ${de ? `<p class="regalado">Te la tiró <button class="amigo" data-de="${de.id}"><img class="face" src="${face(de.id)}" alt="">${esc(de.n)}</button> desde el mar</p>` : ''}
      <button class="btn" data-close>Guardarla</button></div>`,
    (bg) => { const a = bg.querySelector('[data-de]'); if (a) a.addEventListener('click', () => { bg.remove(); carta(a.dataset.de); }); });
    setTimeout(render, 450);
  }

  // ---------- la personita ----------
  // Quien mira el mar, chiquita y de espaldas en la orilla. Quienes estén mirando el mar al mismo tiempo aparecen también:
  // cada celu mueve su propia personita y les cuenta a los demás dónde está y qué hace (canal de presencia de Supabase).
  // Los colores salen del cielo: de día, apagados y con la luz del lugar; al atardecer, cálidos; de noche, silueta negra.
  // De día van en malla; de noche (o con lluvia), con buzo holgado con capucha y jogging.
  // Se mueve sola, tranquila: respira, mira a los costados y cada tanto da unos pasos (también para adelante y para atrás:
  // más cerca de la orilla se ve apenas más chica). Tocarla la sienta (en la ronda del fogón, en la lona o al lado de alguien
  // sentado); tocar a otra la saluda. Si dos se quedan sentadas juntas un rato, pasa una estrella fugaz (de noche) o una
  // bandada (de día). Con 3 o más: fogatita al atardecer y de noche; de día, sombrilla con su sombra y una lona.
  // Para todos los que entraron a la colonia (sin elegir quién sos, el mar está solo). ?persona=juani te muestra como otra persona,
  // para probar; ?persona=no apaga las personitas en ese celu y ?persona=si las vuelve a prender.
  // pelo, largo (0 corto, 1 colita, 2 largo, 3 rodete), gorra, rem (remera), ab (short o pantalón; abL: 1 si es largo), cm,
  // malla ('short': de baño, sin remera; 'enteriza': malla entera, del color de la remera).
  const PERSONITAS = {
    jero: { pelo: '#2b211c', largo: 0, rem: '#7d9b55', ab: '#6b4a32', cm: 173, malla: 'short' },
    viqui: { pelo: '#8a6a4c', largo: 2, rem: '#2e2a33', ab: '#d9c3a2', cm: 152, malla: 'enteriza' },
    pachi: { pelo: '#c9a46c', largo: 3, rem: '#f4f1ea', ab: '#9fb4c8', abL: 1, cm: 150, malla: 'enteriza' },
    juani: { pelo: '#e2c27a', largo: 2, rem: '#cfae86', ab: '#7f9fc0', cm: 168, malla: 'enteriza' },
    nico: { pelo: '#2b211c', largo: 0, rem: '#4a4650', ab: '#3a3640', abL: 1, cm: 178, malla: 'short' },
    rochi: { pelo: '#4a3024', largo: 2, rem: '#f6f2ee', ab: '#5fb896', cm: 165, malla: 'enteriza' },
    jose: { pelo: '#231a16', largo: 0, rem: '#6d6a70', ab: '#6b5038', cm: 150, malla: 'enteriza' },
    nachote: { pelo: '#231a16', largo: 0, rem: '#3a3438', ab: '#2f2b30', abL: 1, cm: 169, malla: 'short' },
    juli: { pelo: '#2b1d17', largo: 1, rem: '#2b282e', ab: '#a9c0d6', cm: 170, malla: 'enteriza' },
    rich: { pelo: '#231a16', largo: 0, gorra: '#1f1d22', rem: '#a7a9ad', ab: '#2f3f68', cm: 179, malla: 'short' },
    sofi: { pelo: '#6b4632', largo: 2, rem: '#f0b9a8', ab: '#7f9fc0', cm: 170, malla: 'enteriza' },
    chino: { pelo: '#231a16', largo: 0, rem: '#4f6f8f', ab: '#5b5348', cm: 174, malla: 'short' },
    grego: { pelo: '#3a2a20', largo: 0, rem: '#e7e1d6', ab: '#56708a', cm: 179, malla: 'short' },
  };
  const PX_CM = 0.19; // a qué distancia están: 1,73 m son unos 33 px
  (() => {
    const q = new URLSearchParams(location.search).get('persona');
    if (q == null) return;
    try { if (q === 'si' || q === '') localStorage.removeItem('colonia.persona'); else localStorage.setItem('colonia.persona', q); } catch (e) { /* sin lugar */ }
  })();
  const pruebaPersona = () => { try { return localStorage.getItem('colonia.persona'); } catch (e) { return null; } };
  const conPersona = () => !!S.me && pruebaPersona() !== 'no';
  const yoEnElMar = () => S.me || 'yo';
  const quienMira = () => { const q = new URLSearchParams(location.search).get('persona') || pruebaPersona(); return PERSONITAS[q] ? q : PERSONITAS[S.me] ? S.me : 'jero'; };

  // Colores: el cielo deja los suyos en el :root como #rrggbb.
  const rgbDe = (c) => {
    c = String(c).trim();
    if (c[0] === '#') { const h = c.length === 4 ? [...c.slice(1)].map((x) => x + x).join('') : c.slice(1, 7); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
    const m = c.match(/[\d.]+/g);
    return m ? m.slice(0, 3).map(Number) : [128, 128, 128];
  };
  const hexDe = (v) => '#' + v.map((x) => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, '0')).join('');
  const mezclar = (a, b, t) => { const x = rgbDe(a), y = rgbDe(b); return hexDe(x.map((v, i) => v + (y[i] - v) * t)); };
  const lumDe = (c) => { const [r, g, b] = rgbDe(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  const apagado = (c, k) => { const l = lumDe(c) * 255; return mezclar(c, hexDe([l, l, l]), k); };
  const NOCHE = '#16121d';
  const varCielo = (k, d) => getComputedStyle(document.documentElement).getPropertyValue(k).trim() || d;
  const diaAhora = () => clamp((lumDe(varCielo('--sky-top', '#7fc5ee')) - 0.3) / 0.28, 0, 1); // 0 de noche, 1 de día
  const ropaAhora = () => (diaAhora() > 0.45 && !/lluvia|llovizna|tormenta/.test(SKY.state().kind) ? 'malla' : 'buzo');
  function paletaPersonita(o) {
    const dia = diaAhora(), luz = mezclar(varCielo('--sky-hor', '#eef6f1'), varCielo('--sand', '#f4e3c5'), 0.5);
    // De día: mitad de saturado, teñido con la luz del lugar y apenas a la sombra. Con menos luz se va a la silueta.
    const tono = (c) => mezclar(NOCHE, mezclar(mezclar(apagado(c, 0.5), luz, 0.28), '#4a4258', 0.1), dia);
    return {
      '--piel': tono('#e9bf9c'), '--pelo': tono(o.pelo), '--rem': tono(o.rem), '--ab': tono(o.ab), '--gorra': tono(o.gorra || o.pelo), '--zap': tono('#6f5f80'),
      '--buzo': tono(mezclar(o.rem, '#8d86a8', 0.35)), '--jog': tono(mezclar(o.ab, '#3c3848', 0.45)),
      '--tinta': mezclar(NOCHE, mezclar('#43365a', luz, 0.35), dia), '--sombra': `rgba(40, 32, 56, ${(0.2 * dia).toFixed(3)})`,
    };
  }
  const espejoX = (d) => d.replace(/(-?\d*\.?\d+) (-?\d*\.?\d+)/g, (m, x, y) => `${(24 - x).toFixed(1)} ${y}`);
  // Por partes, para moverlas: piernas (caminar), rodillas (sentada), "sube" (lo de arriba baja al sentarse), cadera / cadera-sentada
  // (parada / la cola redonda al sentarse), brazo d (saludar), cabeza (mirar a los costados).
  function personitaSVG(o, ropa = 'malla') {
    const buzo = ropa === 'buzo', ent = !buzo && o.malla === 'enteriza';
    const P = buzo ? 'jog' : 'piel'; // de qué color se ven las piernas
    const abajoC = buzo ? 'jog' : ent ? 'rem' : 'ab'; // el color de la cadera
    const brazo = buzo ? 'M7 19C5.9 22.4 5.3 27.2 5.5 31.8C5.8 33.1 7.9 33.1 8.1 31.8C8.1 27.4 8.5 23.1 9.3 19.6Z' : 'M7.3 19.2C6.4 22.4 5.9 27 6.2 31.4C6.5 32.5 7.7 32.4 7.9 31.4C7.9 27.2 8.2 23 8.9 19.8Z';
    const pierna = 'M8.3 37.2L11.3 37.2L11 54.4L8.9 54.4C8.5 48.6 8.2 42.6 8.3 37.2Z';
    const espalda = 'M7.2 17.6C7.9 16.3 9.7 15.9 12 15.9C14.3 15.9 16.1 16.3 16.8 17.6L16.6 22.4L16.3 31L7.7 31L7.4 22.4Z';
    let torso, cadera;
    if (buzo) {
      torso = '<path class="buzo" d="M6.6 17.3C7.4 15.9 9.4 15.4 12 15.4C14.6 15.4 16.6 15.9 17.4 17.3L18.7 22.2L17.3 22.8L17.1 33.4L6.9 33.4L6.7 22.8L5.3 22.2Z"/>'
        + '<path class="buzo" d="M8 15.4C8.2 18.9 15.8 18.9 16 15.4C14.4 14.3 9.6 14.3 8 15.4Z"/><path class="pliegue" d="M9.6 16.6C11 17.6 13 17.6 14.4 16.6"/>';
      cadera = '<path class="jog" d="M7.4 32.4L16.6 32.4L16.6 38.6L7.4 38.6Z"/>';
    } else if (ent) {
      torso = `<path class="piel" d="${espalda}"/><path class="rem" d="M7.6 23.2C9.4 25.2 14.6 25.2 16.4 23.2L16.4 31.2L7.6 31.2Z"/>`
        + '<path class="rem" d="M8.7 16.5L9.5 16.3L10.3 24.1L9.5 23.9Z"/><path class="rem" d="M15.3 16.5L14.5 16.3L13.7 24.1L14.5 23.9Z"/>';
      cadera = '<path class="piel" d="M7.4 33L16.6 33L16.8 38.4L7.2 38.4Z"/><path class="rem" d="M7.6 30.4L16.4 30.4L16.7 34.6C14.6 35.6 13 35.9 12 36.6C11 35.9 9.4 35.6 7.3 34.6Z"/>';
    } else {
      torso = `<path class="piel" d="${espalda}"/>`;
      cadera = '<path class="ab" d="M7.6 30.2L16.4 30.2L16.9 38.2L12.7 38.2L12 35.4L11.3 38.2L7.1 38.2Z"/>';
    }
    const pelo = o.largo === 2 ? '<path class="pelo" d="M7.6 8.8C7 14 7.3 19.4 8.5 24.2C10.7 25 13.3 25 15.5 24.2C16.7 19.4 17 14 16.4 8.8Z"/>'
      : o.largo === 1 ? '<path class="pelo" d="M11.2 12C10.9 15 11.3 17.6 12 19C12.7 17.6 13.1 15 12.8 12Z"/>' : '';
    const orejas = o.largo === 2 ? '' : '<circle class="piel" cx="7.5" cy="9.6" r=".8"/><circle class="piel" cx="16.5" cy="9.6" r=".8"/>';
    const rodete = o.largo === 3 ? '<circle class="pelo" cx="12" cy="3.9" r="2"/>' : '';
    const gorra = o.gorra ? '<path class="gorra" d="M7.4 8.4A4.6 4.6 0 0 1 16.6 8.4Z"/>' : '';
    const brazoC = buzo ? 'buzo' : 'piel';
    return `<svg viewBox="0 0 24 60" aria-hidden="true"><g class="trazo">
      <ellipse class="sombra" cx="12" cy="55.6" rx="6.6" ry="1.2"/>
      <g class="piernas"><g class="pierna i"><path class="${P}" d="${pierna}"/><ellipse class="zap" cx="9.9" cy="55" rx="1.4" ry=".6"/></g>
        <g class="pierna d"><path class="${P}" d="${espejoX(pierna)}"/><ellipse class="zap" cx="14.1" cy="55" rx="1.4" ry=".6"/></g></g>
      <g class="rodillas"><ellipse class="${P}" cx="5.2" cy="46.4" rx="1.6" ry="2.4"/><ellipse class="${P}" cx="18.8" cy="46.4" rx="1.6" ry="2.4"/></g>
      <g class="sube"><g class="respira">
        <g class="cadera">${cadera}</g>
        <g class="cadera-sentada"><path class="${abajoC}" d="M7.6 30.6H16.4C17.3 33.6 17.1 37.1 15.5 38.6C14 39.7 10 39.7 8.5 38.6C6.9 37.1 6.7 33.6 7.6 30.6Z"/><path class="pliegue" d="M12 35.6V39.4"/></g>
        <path class="${brazoC} brazo i" d="${brazo}"/><path class="${brazoC} brazo d" d="${espejoX(brazo)}"/>
        <path class="piel" d="M10.8 12.6h2.4v4h-2.4z"/>
        ${torso}
        <g class="cabeza">${pelo}${orejas}${rodete}<circle class="pelo" cx="12" cy="9" r="4.6"/>${gorra}</g>
      </g></g></g></svg>`;
  }

  // La escena: pid → { pid, como (a quién se parece), el, x, y (dónde pisa: % del ancho y del alto del cielo), sentada, mira,
  // mia (la mueve este celu), falsa (demo), vaASentarse, ordenada (se sentó a propósito), miraBase, t, visto }
  const escena = new Map();
  let relojMar = null, ultimoEstado = 0, ultimaNota = 0, rafProf = 0;
  // Con "reducir movimiento" en el celu solo se apagan los destellos de los relámpagos y los sacudones: lo demás se mueve
  // igual (es lento, y sin eso al que lo tiene prendido no le aparecían las gaviotas, las motos ni las personitas andando).
  const sinDestellos = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PASO_MAR = 0.55; // segundos por cada 1 % del ancho: paso lento de orilla (unos 7 px por segundo en un celu)
  // Profundidad: más abajo es más cerca de quien mira (apenas más grande y adelante); cerca de la orilla, apenas más chica.
  const Y_ORILLA = 70.6, Y_CERCA = 82.4;
  const escalaY = (y) => 1 + (y - 76) * 0.014;
  const capaY = (y) => String(Math.round(100 + (y - 60) * 10));
  // Las distancias se miden en un celu de referencia (390 × 844 px): la ronda y los lugares quedan iguales en todos los celus.
  const REF_W = 390, REF_H = 844;
  const dist = (a, b) => Math.hypot((a.x - b.x) * REF_W / 100, (a.y - b.y) * REF_H / 100);
  // Con 3 o más: fogón en el medio (al atardecer y de noche); de día, sombrilla con su lona a la derecha.
  const FUEGO = { x: 50, y: 76.6 }, SOMBRILLA = { x: 83.5, y: 74.3 }, LONA = { x: 77.5, y: 78.2 };
  const cosasMar = () => (escena.size < 3 ? '' : diaAhora() < 0.5 ? 'fogon' : 'sombra');
  const COLORES_AMIGO = [['#f7b3c6', '#ffd6e2'], ['#cfc0f0', '#e6defb'], ['#b6e5cd', '#dff5ea'], ['#ffe39a', '#fff2c8'], ['#a9d6f0', '#d6eefb'], ['#f6a38f', '#fcd2c6']];
  const coloresDe = (pid) => COLORES_AMIGO[hash(pid) % COLORES_AMIGO.length];
  function pintarPersonita(p) {
    const ropa = p.agua ? 'malla' : ropaAhora(); // en el agua, siempre en malla
    if (p.el.dataset.ropa !== ropa) {
      const globo = p.el.querySelector('.globito, .corazon');
      p.el.innerHTML = personitaSVG(PERSONITAS[p.como], ropa);
      if (globo) p.el.appendChild(globo);
      p.el.dataset.ropa = ropa;
    }
    Object.entries(paletaPersonita(PERSONITAS[p.como])).forEach(([k, v]) => p.el.style.setProperty(k, v));
  }
  SKY.onChange(() => { escena.forEach(pintarPersonita); ponerFogon(); });
  // Dónde se para cada uno: en zigzag, una fila cerca de la orilla y otra más acá, con un poquito de desorden propio de cada uno.
  // Todos los celus calculan lo mismo. Con fogón queda un hueco en el medio; con sombrilla se corren a la izquierda.
  function casas() {
    const ids = [...escena.keys()].sort(), n = ids.length, cosa = cosasMar();
    const cx = cosa === 'sombra' ? 41 : 50, ancho = cosa === 'sombra' ? 64 : 80, hueco = cosa === 'fogon' ? 4 : 0;
    const s = n > 1 ? Math.min(6.5, ancho / (n - 1)) : 0;
    return Object.fromEntries(ids.map((id, i) => {
      const h = hash(id), jx = (h % 97) / 96 - 0.5, jy = ((h >>> 8) % 89) / 88 - 0.5;
      const off = (i - (n - 1) / 2) * s, atras = Math.round(i - (n - 1) / 2) % 2 === 0;
      return [id, { x: clamp(cx + off + Math.sign(off) * hueco + jx * 1.6, 6, 94), y: (atras ? 72.9 : 79.4) + jy * 1.2 }];
    }));
  }
  // Los lugares para sentarse. De noche, en ronda alrededor del fogón, abierta hacia el mar (todos siguen mirándolo):
  // los de los costados miran el fuego. De día, primero en la lona, a la sombra; después al lado.
  function lugaresRonda(n) {
    n = Math.max(n, 3);
    const a = Math.max(44, 5 * n), b = a * 0.42, arco = Math.min(230, 42 * (n - 1)), t0 = 90 - arco / 2;
    return Array.from({ length: n }, (_, k) => {
      const t = (t0 + (k * arco) / (n - 1)) * Math.PI / 180, c = Math.cos(t);
      return { x: FUEGO.x + (c * a / REF_W) * 100, y: FUEGO.y + (Math.sin(t) * b / REF_H) * 100, mira: c > 0.35 ? 'mira-i' : c < -0.35 ? 'mira-d' : '' };
    });
  }
  function lugaresLona(n) {
    const l = [[80.2, 76.2], [75.2, 76.3], [85.2, 76.3], [70.2, 76.5]].map(([x, y]) => ({ x, y, mira: '' }));
    for (let k = 0; l.length < Math.max(n, 4); k++) l.push({ x: 64.4 - k * 5.6, y: 76.8 + (k % 2) * 2.2, mira: '' });
    return l;
  }
  // El lugar libre para sentarse: en la ronda, el más cercano; en la lona, el primero (a la sombra).
  function asiento(p) {
    const cosa = cosasMar();
    if (!cosa) return null;
    const lugares = cosa === 'fogon' ? lugaresRonda(escena.size) : lugaresLona(escena.size);
    const libres = lugares.filter((l) => ![...escena.values()].some((q) => q !== p && (q.sentada || q.vaASentarse) && dist(q, l) < 12));
    const opciones = libres.length ? libres : lugares;
    return cosa === 'fogon' ? opciones.sort((a, b) => dist(a, p) - dist(b, p))[0] : opciones[0];
  }
  // En qué grupo está sentada (para contar "sentarse juntos"): la ronda del fogón o la lona.
  function grupo(p) {
    const cosa = cosasMar();
    if (!p.sentada || !cosa) return '';
    if (cosa === 'fogon') return dist(p, FUEGO) < 90 ? 'ronda' : '';
    return Math.abs(p.x - LONA.x) < 12 && Math.abs(p.y - 76.4) < 2.5 ? 'lona' : '';
  }
  function ubicar(p) {
    if (p.agua) return; // en el agua la mueve moverAgua
    p.el.style.left = p.x.toFixed(2) + '%';
    p.el.style.top = p.y.toFixed(2) + '%';
    p.el.style.height = (PERSONITAS[p.como].cm * PX_CM * escalaY(p.y)).toFixed(1) + 'px';
    p.el.style.zIndex = capaY(p.anda ? p.anda.y0 : p.y);
  }
  // Mientras caminan hacia adelante o hacia atrás, cambian de capa a medida que avanzan (así nadie se le mete por delante a otro).
  function profundidad() {
    let alguna = false;
    const ahora = performance.now();
    escena.forEach((p) => {
      const a = p.anda;
      if (!a) return;
      const k = Math.min(1, (ahora - a.t0) / a.ms);
      p.el.style.zIndex = capaY(a.y0 + (a.y1 - a.y0) * k);
      if (k < 1) alguna = true; else p.anda = null;
    });
    rafProf = alguna ? requestAnimationFrame(profundidad) : 0;
  }
  function nuevaPersonita(pid, como, x, y, mia, falsa) {
    const sky = document.getElementById('sky');
    const el = document.createElement('div');
    el.className = 'personita'; el.dataset.pid = pid;
    const p = { pid, como, el, x, y, sentada: false, mira: '', mia, falsa, t: null, visto: Date.now(), juntos: {} };
    ubicar(p);
    sky.appendChild(el);
    pintarPersonita(p);
    escena.set(pid, p);
    if (mia) p.t = setTimeout(() => vivir(p), 2500 + Math.random() * 3000);
    return p;
  }
  // Vos y quienes estén mirando el mar ahora. Quien se va, se desvanece; quien llega aparece en su lugar, y los demás
  // van caminando a acomodarse.
  function armarEscena() {
    if (!document.getElementById('sky') || !conPersona() || !document.querySelector('.mirar-capa')) return;
    const yo = yoEnElMar(), otros = S.enElMar().filter((id) => id !== yo && PERSONITAS[(escena.get(id) || {}).como || id]);
    const nuevas = [];
    if (!escena.has(yo)) nuevas.push(nuevaPersonita(yo, quienMira(), 50, 76, true, false));
    escena.forEach((p, id) => {
      if (id === yo || otros.includes(id) || Date.now() - p.visto < 10000) return;
      clearTimeout(p.t); p.el.classList.add('se-va'); setTimeout(() => p.el.remove(), 900);
      escena.delete(id);
    });
    otros.forEach((id) => { if (!escena.has(id)) nuevas.push(nuevaPersonita(id, id, 50, 76, !S.live, !S.live)); });
    const c = casas();
    nuevas.forEach((p) => { p.x = c[p.pid].x; p.y = c[p.pid].y; ubicar(p); });
    escena.forEach((p, id) => { if (p.mia && !nuevas.includes(p) && !p.sentada && !p.vaASentarse) andarA(p, c[id].x, c[id].y); });
    ponerFogon();
    revisarFantasma();
    revisarSolo();
    revisarAgua();
  }
  function sacarEscena() {
    seVaFantasma(true);
    terminaSolo();
    clearTimeout(mimosT); mimosT = null;
    if (pelota) { cancelAnimationFrame(pelota.raf); pelota = null; }
    if (rally) { cancelAnimationFrame(rally.raf); rally = null; }
    bananeros.clear(); bananaLider = null;
    INICIO.guitarra(false); INICIO.fiesta(false); document.body.classList.remove('fiesta');
    document.querySelectorAll('#sky .lujo-mar, #sky .paquete-mar, #sky .hilos-mar, #sky .luces-fiesta, #sky .paleta-pelota, .lente').forEach((n) => n.remove());
    document.querySelectorAll('#sky .delfin-mar, #sky .cola-sirena, #sky .varada, #sky .mascota-mar, #sky .antorcha-mar, #sky .heladerita-mar, #sky .pelota-mar').forEach((n) => n.remove());
    escena.forEach((p) => clearTimeout(p.t));
    escena.clear();
    cancelAnimationFrame(rafProf); rafProf = 0;
    cancelAnimationFrame(rafAgua); rafAgua = 0;
    document.querySelectorAll('#sky .personita, #sky .cosa-mar, #sky .agua, .estrella-fugaz').forEach((n) => n.remove());
  }
  // Cuenta a los demás dónde está y qué hace tu personita.
  function publicar(p) {
    if (!p || p.falsa || p.pid !== yoEnElMar() || !conPersona()) return;
    ultimoEstado = Date.now();
    S.enviarMar({ t: 'estado', como: p.como, x: +p.x.toFixed(1), y: +p.y.toFixed(1), sentada: p.sentada, mira: p.mira, va: p.vaASentarse ? 1 : 0, pi: fantasma && fantasma.inicio && !fantasma.hundido && !fantasma.escapo ? fantasma.inicio : undefined, vm: fantasma && fantasma.vm ? fantasma.vm : undefined, nv: fantasma && fantasma.nv != null ? fantasma.nv : undefined });
  }
  // Camina hasta (x, y), despacio, y si hacía falta se levanta antes. "luego" corre al llegar.
  function andarA(p, x, y, luego) {
    if (x == null || !p.el.isConnected || p.agua) return;
    if (p.sentada) { p.sentada = false; p.el.classList.remove('sentada'); publicar(p); clearTimeout(p.fin); p.fin = setTimeout(() => andarA(p, x, y, luego), 1000); return; }
    moverA(p, x, y, luego);
    publicar(p);
  }
  function moverA(p, x, y, luego) {
    y = clamp(y == null ? p.y : y, Y_ORILLA, Y_CERCA);
    const seg = Math.hypot(x - p.x, ((y - p.y) * REF_H) / REF_W) * PASO_MAR;
    clearTimeout(p.fin);
    if (seg < 0.05) { if (luego) luego(); return; }
    p.el.style.setProperty('--andar', seg.toFixed(2) + 's');
    p.el.classList.add('camina');
    p.anda = { t0: performance.now(), ms: seg * 1000, y0: p.y, y1: y };
    p.x = x; p.y = y;
    ubicar(p);
    if (!rafProf) rafProf = requestAnimationFrame(profundidad);
    p.fin = setTimeout(() => { p.el.classList.remove('camina'); if (luego) luego(); }, seg * 1000);
  }
  // ¿Puede ir hasta d sin pasarle por encima a nadie (ni al fuego)?
  function caminoLibre(p, d) {
    const obstaculos = [...escena.values()].filter((q) => q !== p);
    if (cosasMar() === 'fogon') obstaculos.push(FUEGO);
    if (obstaculos.some((q) => dist(q, d) < 30)) return false;
    for (let k = 1; k < 6; k++) {
      const m = { x: p.x + ((d.x - p.x) * k) / 6, y: p.y + ((d.y - p.y) * k) / 6 };
      if (obstaculos.some((q) => dist(q, m) < 22)) return false;
    }
    return true;
  }
  function sentar(p, si) {
    p.sentada = si; p.el.classList.toggle('sentada', si);
    if (!si) { p.ordenada = false; p.miraBase = ''; }
    publicar(p);
  }
  // Al levantarse de la ronda o de la lona, vuelve a su lugar (para no quedarse parada delante del fuego).
  function levantarse(p) {
    const g = grupo(p);
    p.vaASentarse = false; clearTimeout(p.fin); p.el.classList.remove('camina');
    sentar(p, false);
    if (g) p.fin = setTimeout(() => { const c = casas()[p.pid]; if (c && !p.sentada && !p.vaASentarse) andarA(p, c.x, c.y); }, 1400);
  }
  // Va a sentarse: a la ronda o a la lona si las hay; si no, al lado de quien esté sentado más cerca; si no, ahí mismo.
  function irASentarse(p) {
    if (fantasma) return; // con el barco fantasma nadie se sienta
    p.ordenada = true;
    const l = asiento(p);
    if (l) {
      p.vaASentarse = true; p.miraBase = l.mira;
      andarA(p, l.x, l.y, () => { p.vaASentarse = false; sentar(p, true); mirarA(p, p.miraBase, 0); });
      return;
    }
    const al = [...escena.values()].filter((q) => q !== p && q.sentada).sort((a, b) => dist(a, p) - dist(b, p))[0];
    if (!al) { sentar(p, true); return; }
    const lado = p.x < al.x ? -1 : 1, ocupado = (x) => [...escena.values()].some((q) => q !== p && q !== al && dist(q, { x, y: al.y }) < 14);
    let x = al.x + lado * 5.5;
    if (x < 6 || x > 94 || ocupado(x)) x = al.x - lado * 5.5;
    p.vaASentarse = true;
    andarA(p, clamp(x, 6, 94), al.y, () => { p.vaASentarse = false; sentar(p, true); });
  }
  function mirarA(p, lado, ms) {
    p.mira = lado; p.el.classList.remove('mira-i', 'mira-d'); if (lado) p.el.classList.add(lado);
    publicar(p);
    if (ms) setTimeout(() => { if (p.mira === lado) mirarA(p, p.miraBase || '', 0); }, ms);
  }
  // Lo que hace sola: casi siempre mirar el mar; a veces a un costado; cada tanto unos pasitos cerca de su lugar, para
  // adelante, para atrás o al costado, sin pasarle por encima a nadie. Las de prueba del modo demo además se sientan un rato.
  function vivir(p) {
    const despues = (ms) => { clearTimeout(p.t); p.t = setTimeout(() => vivir(p), ms); };
    if (!p.el.isConnected) return;
    if (p.agua) return despues(8000); // en el agua no camina ni se sienta
    if (fantasma) return despues(5000); // con el barco fantasma se quedan paradas
    const r = Math.random(), casa = casas()[p.pid], lado = () => (Math.random() < 0.5 ? 'mira-i' : 'mira-d');
    if (p.falsa && p.sentada) { if (r < 0.3) levantarse(p); else if (r < 0.55) mirarA(p, lado(), 1800 + Math.random() * 1500); return despues(8000 + Math.random() * 6000); }
    if (p.ordenada || p.vaASentarse) { if (r < 0.35) mirarA(p, lado(), 1800 + Math.random() * 1500); return despues(7000 + Math.random() * 6000); }
    if ((p.mia || p.falsa) && r > 0.8 && hace28() && duenioDe('pelopincho') && !p.sentada) {
      const px = 27 + (Math.random() - 0.5) * 5;
      p.vaASentarse = true;
      andarA(p, px, 80.6, () => { p.vaASentarse = false; sentar(p, true); });
      return despues(14000 + Math.random() * 8000);
    }
    if (r < 0.45) mirarA(p, lado(), 1600 + Math.random() * 1800);
    else if (r < 0.7 && casa) {
      const cerca = { x: clamp(p.x + (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * 3), casa.x - 5, casa.x + 5), y: clamp(p.y + (Math.random() - 0.5) * 3, casa.y - 2, casa.y + 2) };
      const d = [cerca, casa].find((o) => caminoLibre(p, o));
      if (d) andarA(p, d.x, d.y);
    } else if (p.falsa && r < 0.85) irASentarse(p);
    despues(8000 + Math.random() * 7000);
  }
  // Tocar tu personita la sienta (en la ronda, en la lona o al lado de alguien) o la levanta. Tocar a otra la saluda.
  function tocarPersonita(x, y) {
    const el = [...document.querySelectorAll('#sky .personita')].find((n) => { const r = n.getBoundingClientRect(); return x > r.left - 14 && x < r.right + 14 && y > r.top - 16 && y < r.bottom + 10; });
    const p = el && escena.get(el.dataset.pid);
    if (!p) return false;
    const yo = escena.get(yoEnElMar());
    if (p === yo) {
      SONIDO.plop();
      if (p.agua) { saludar(p); return true; } // en la moto o en la tabla, saluda
      if (fantasma) { tirarSusto(p, SUSTOS[Math.floor(Math.random() * SUSTOS.length)]); return true; } // asustada, tira un susto
      if (p.sentada || p.vaASentarse) { levantarse(p); return true; }
      S.contar('mar.sentadas');
      irASentarse(p);
      return true;
    }
    globito(p, (person(p.pid) || {}).n || p.pid);
    if (yo) { saludar(yo); S.enviarMar({ t: 'saludo', a: p.pid }); }
    S.contar('mar.saludos');
    if (p.falsa) setTimeout(() => { saludar(p); corazon(p); globito(p, '¡Hola!'); }, 1400);
    return true;
  }
  function saludar(p) { p.el.classList.remove('saluda'); void p.el.offsetWidth; p.el.classList.add('saluda'); setTimeout(() => p.el.classList.remove('saluda'), 2100); }
  function globito(p, texto) {
    p.el.querySelectorAll('.globito').forEach((g) => g.remove());
    const g = document.createElement('span');
    g.className = 'globito'; g.textContent = texto;
    p.el.appendChild(g);
    setTimeout(() => g.remove(), 2600);
  }
  function corazon(p) {
    const c = document.createElement('span');
    c.className = 'corazon'; c.textContent = '♥';
    p.el.appendChild(c);
    setTimeout(() => c.remove(), 1900);
  }
  // Tus notas les suenan a los demás (si hay alguien más mirando el mar), como mucho una cada 70 ms.
  function mandarNota(e) {
    if (!conPersona() || escena.size < 2 || performance.now() - ultimaNota < 70) return;
    ultimaNota = performance.now();
    S.enviarMar({ t: 'nota', p: +((e.clientX / innerWidth) * 2 - 1).toFixed(3), alto: +(1 - e.clientY / innerHeight).toFixed(3), x: +(e.clientX / innerWidth).toFixed(3), y: +(e.clientY / innerHeight).toFixed(3) });
  }
  // Lo que llega de los demás que miran el mar.
  function recibirMar(m) {
    if (!m || !m.de || m.de === yoEnElMar() || !document.querySelector('.mirar-capa') || !conPersona()) return;
    if (m.t === 'hola') { publicar(escena.get(yoEnElMar())); return; }
    // el barco fantasma: cuándo arrancó la pelea, los golpes de cada uno (su total) y si alguien vio que se hundió
    if (m.t === 'brindis') { brindar(m.de, false); return; }
    if (m.t === 'paquete') { paqueteDeOtro(m.de, m.c); return; }
    if (m.t === 'bengala') { if (diaAhora() < 0.5) fuegos(m.x * innerWidth, m.y * innerHeight); return; }
    if (m.t === 'pala') { paladasVivas[m.de] = Math.max(paladasVivas[m.de] || 0, m.n); revisarCastillo(document.getElementById('sky'), duenioDe('balde'), 165 * PX_CM); return; }
    if (m.t === 'paleta') { golpePaleta(m.n, m.de, m.a, m.t0, m.dur); return; }
    if (m.t === 'banana') { bananaDeOtro(m.de, m.si); return; }
    if (m.t === 'pelota') { pase(m.n, m.a, m.t0); return; }
    if (m.t === 'pelea') { adoptarPelea(m.pi, m.vm, m.nv, m.pe, m.ga); return; }
    if (m.t === 'golpes') { golpesDe(m.de, m.pi, m.vm, m.n); return; }
    if (m.t === 'hundido') { if (fantasma && fantasma.inicio && Math.abs(m.pi - fantasma.inicio) <= 30000) hundir(); return; }
    if (m.t === 'estado' && m.pi != null) adoptarPelea(m.pi, m.vm, m.nv);
    const my = m.y != null ? m.y : 73.5; // las versiones viejas no mandan la profundidad
    let p = escena.get(m.de);
    if (!p && (m.t === 'estado' || m.t === 'hola') && PERSONITAS[m.como || m.de]) p = nuevaPersonita(m.de, m.como || m.de, m.x != null ? m.x : 50, my, false, false);
    if (p) p.visto = Date.now();
    if (m.t === 'estado' && p) {
      if (m.como && m.como !== p.como && PERSONITAS[m.como]) { p.como = m.como; p.el.dataset.ropa = ''; pintarPersonita(p); ubicar(p); }
      p.vaASentarse = !!m.va;
      if (p.agua) { p.x = m.x; p.y = my; p.sentada = !!m.sentada; return; } // está en el agua: lo de la orilla queda para cuando salga
      const llegar = () => { p.sentada = !!m.sentada; p.el.classList.toggle('sentada', p.sentada); };
      if (Math.abs(m.x - p.x) > 0.3 || Math.abs(my - p.y) > 0.3) { p.el.classList.remove('sentada'); moverA(p, m.x, my, llegar); } else llegar();
      p.mira = m.mira || ''; p.el.classList.remove('mira-i', 'mira-d'); if (p.mira) p.el.classList.add(p.mira);
      ponerFogon();
    } else if (m.t === 'saludo' && p) {
      saludar(p);
      if (m.a === yoEnElMar()) { corazon(p); globito(p, `${(person(m.de) || {}).n || m.de} te saluda`); }
    } else if (m.t === 'nota') {
      INICIO.toque(m.p, m.alto, 0.7); // los amigos suenan un poquito más bajo
      chispas(m.x * innerWidth, m.y * innerHeight, 10, coloresDe(m.de));
    }
  }
  // Cada segundo: se cuenta cuánto llevan sentados juntos (al lado, o en la misma ronda o lona), quién está a la sombra,
  // y cada 15 s se repite el estado por si alguien no lo recibió.
  function latidoMar() {
    const yo = escena.get(yoEnElMar());
    if (!yo) return;
    if (Date.now() - ultimoEstado > 15000) publicar(yo);
    escena.forEach((q) => {
      if (q === yo) return;
      const g = grupo(yo), cerca = yo.sentada && q.sentada && (dist(yo, q) < 40 || (g && g === grupo(q)));
      yo.juntos[q.pid] = cerca ? (yo.juntos[q.pid] || 0) + 1 : Math.min(yo.juntos[q.pid] || 0, 0);
      if (yo.juntos[q.pid] === 12) juntos(q);
    });
    aLaSombra();
    revisarFantasma();
    revisarSolo();
    revisarAgua();
  }
  // Doce segundos sentados uno al lado del otro: estrella fugaz de noche, bandada de día, y cuenta para el logro.
  function juntos(q) {
    if (diaAhora() < 0.5) {
      const s = document.createElement('i');
      s.className = 'estrella-fugaz';
      s.style.left = (15 + Math.random() * 45) + '%'; s.style.top = (6 + Math.random() * 18) + '%';
      document.getElementById('sky').appendChild(s);
      setTimeout(() => s.remove(), 1800);
    } else INICIO.bandada();
    if (!q.falsa || !S.live) S.sentarseCon(q.pid);
    SONIDO.si();
    setTimeout(revisarLogros, 1600);
  }
  // Con 3 o más mirando el mar: fogatita al atardecer y de noche; de día, sombrilla con su sombra y una lona.
  // Cuando aparecen, quienes ya estaban sentados (en este celu) se levantan y van a acomodarse a la ronda o a la lona.
  function ponerFogon() {
    const sky = document.getElementById('sky');
    if (!sky) return;
    const tipo = document.querySelector('.mirar-capa') ? cosasMar() : '';
    sky.querySelectorAll('.cosa-mar').forEach((n) => { if (n.dataset.tipo !== tipo) { n.classList.add('se-va'); setTimeout(() => n.remove(), 900); n.dataset.tipo = 'x'; } });
    if (!tipo) return;
    if (!sky.querySelector(`.cosa-mar[data-tipo="${tipo}"]`)) {
      // [qué, dónde pisa, ancho en px, color, capa (lo que está en el piso va abajo de todos)]
      const cosas = tipo === 'fogon' ? [['fogata', FUEGO, 26, null, capaY(FUEGO.y)]]
        : [['toalla', LONA, 76, '#a9d6f0', '3'], ['sombra-piso', SOMBRILLA, 54, null, '4'], ['sombrilla', SOMBRILLA, 54, '#f6a38f', capaY(SOMBRILLA.y)]];
      cosas.forEach(([id, l, w, col, z]) => {
        const c = document.createElement('div'), e = escalaY(l.y), ancho = w * e;
        c.className = `cosa-mar ${id}`; c.dataset.tipo = tipo;
        // la sombrilla está torcida: el palo se clava a la derecha del dibujo (al 68 % de su ancho)
        const izq = id === 'sombrilla' ? `calc(${l.x}% - ${(0.18 * ancho).toFixed(1)}px)` : `${l.x}%`;
        c.style.cssText = `left:${izq};top:${l.y}%;width:${ancho.toFixed(1)}px;z-index:${z}`;
        if (id !== 'sombra-piso') c.innerHTML = ARTE.item(id, col);
        sky.appendChild(c);
      });
      setTimeout(() => escena.forEach((p) => { if (p.mia && p.sentada) irASentarse(p); }), 1800);
    }
    if (tipo === 'sombra') sombraDelSol();
  }
  // La sombra de la sombrilla en la arena: debajo de la tela, corrida para el lado contrario al sol y más larga cuando el
  // sol está bajo. Con nubes casi no se ve.
  function sombraDelSol() {
    const el = document.querySelector('#sky .cosa-mar.sombra-piso');
    if (!el) return;
    const st = SKY.state(), sx = clamp((st.minute - st.sun.rise) / (st.sun.set - st.sun.rise), 0, 1), alt = Math.sin(Math.PI * sx);
    const w = 54 * escalaY(SOMBRILLA.y), nubes = { 'algo nublado': 0.3, nublado: 0.65, niebla: 0.8, llovizna: 0.8, lluvia: 0.9, tormenta: 0.95 }[st.kind] || 0;
    const dx = -0.24 * w + (0.5 - sx) * 0.5 * w, dy = 0.2 * w + (1 - alt) * 0.14 * w;
    el.style.left = `calc(${SOMBRILLA.x}% + ${dx.toFixed(1)}px)`;
    el.style.top = `calc(${SOMBRILLA.y}% + ${dy.toFixed(1)}px)`;
    el.style.width = (w * (1.1 + (1 - alt) * 0.35)).toFixed(1) + 'px';
    el.style.height = (w * 0.44).toFixed(1) + 'px';
    el.style.opacity = ((1 - nubes) * clamp(diaAhora() * 1.4 - 0.4, 0, 1)).toFixed(2);
  }
  // Quien queda adentro de la sombra se ve un poco más oscuro.
  function aLaSombra() {
    const s = document.querySelector('#sky .cosa-mar.sombra-piso:not(.se-va)'), r = s && s.getBoundingClientRect();
    escena.forEach((p) => {
      let adentro = false;
      if (r && r.width && +s.style.opacity > 0.15) {
        const q = p.el.getBoundingClientRect(), cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
        adentro = ((q.left + q.right) / 2 - cx) ** 2 / (r.width / 2) ** 2 + (q.bottom - cy) ** 2 / (r.height / 2 + 6) ** 2 < 1;
      }
      p.el.classList.toggle('a-la-sombra', adentro);
    });
  }
  // ---------- en el agua: moto de agua, kayak y surf ----------
  // Quien tiene la moto de agua y está mirando el mar anda en el mar mientras hay sol, de un lado al otro; si son varios,
  // de a dos, a la par. Quien tiene la tabla de surf surfea a la mañana, de día y al atardecer: espera la ola sentado en la
  // tabla, se para, la corre hasta la orilla y vuelve a salir. Quien tiene el kayak rema despacio, más cerca de la orilla,
  // mientras hay luz. Con más de una cosa, alterna cada 10 minutos. Con tormenta, nadie.
  // Todo sale de la hora, así que en todos los celus se ve igual.
  const tieneCosa = (pid, id) => { try { return S.altar(pid).items.some((x) => x.id === id); } catch (e) { return false; } };
  function colorCosa(pid, id) {
    try { const a = S.altar(pid), it = a.items.find((x) => x.id === id); return (it && (a.place[it.k] || {}).c) || shopItem(id).col; } catch (e) { return shopItem(id).col; }
  }
  function aguaDe(pid) {
    const st = SKY.state(), m = st.minute, sol = st.sun;
    if (/tormenta/.test(st.kind) || fantasma) return null;
    const dia = m >= sol.rise && m <= sol.set, conLuz = m >= sol.rise && m <= sol.set + 15;
    if (bananeros.has(pid) && duenioDe('banana') && [...escena.values()].some((q) => q.agua === 'moto')) return 'banana';
    const puede = [dia && tieneCosa(pid, 'moto') && 'moto', conLuz && tieneCosa(pid, 'kayak') && 'kayak', conLuz && tieneCosa(pid, 'tabla') && 'surf'].filter(Boolean);
    return puede.length ? puede[Math.floor(Date.now() / 6e5) % puede.length] : null;
  }
  // El kayak de costado (con el color que eligió su dueño) y el remo, que va de un lado al otro.
  const kayakSVG = (col) => `<svg viewBox="0 0 64 12" aria-hidden="true"><path d="M1.5 5.4C13 3.2 51 3.2 62.5 5.4C55 10.8 9 10.8 1.5 5.4Z" fill="${col}" stroke="#43365a" stroke-width="1.1" stroke-linejoin="round"/><path d="M6 6.9C21 8.4 43 8.4 58 6.9" fill="none" stroke="#43365a" stroke-width=".6" opacity=".4"/><ellipse cx="30" cy="4.6" rx="7.5" ry="1.5" fill="#43365a" opacity=".85"/></svg>`;
  const REMO = '<svg viewBox="0 0 46 8" aria-hidden="true"><path d="M5 4H41" stroke="#8a6a4c" stroke-width="1.5" stroke-linecap="round"/><ellipse cx="4" cy="4" rx="3.6" ry="1.9" fill="#d7a86e" stroke="#43365a" stroke-width=".8"/><ellipse cx="42" cy="4" rx="3.6" ry="1.9" fill="#d7a86e" stroke="#43365a" stroke-width=".8"/></svg>';
  const tablaSVG = (col) => `<svg viewBox="0 0 64 14" aria-hidden="true"><path d="M2 7C10 1.2 50 .6 62 7C50 13.4 10 12.8 2 7Z" fill="${col}" stroke="var(--tinta)" stroke-width="1.2"/><path d="M8 7H56" stroke="#fffaf0" stroke-width="1.6" opacity=".8"/></svg>`;
  function entrarAlAgua(p, tipo) {
    const sky = document.getElementById('sky');
    const w = document.createElement('div');
    w.className = 'agua ' + tipo;
    w.innerHTML = tipo === 'banana' ? '<span class="nave"></span>' : tipo === 'kayak'
      ? `<span class="nave">${kayakSVG(colorCosa(p.pid, 'kayak') || '#ffe39a')}</span><i class="remo">${REMO}</i>`
      : `<span class="nave">${tipo === 'moto' ? ARTE.item('moto', colorCosa(p.pid, 'moto')) : tablaSVG(colorCosa(p.pid, 'tabla') || '#f7b3c6')}</span><i class="estela" aria-hidden="true"></i>`;
    sky.appendChild(w);
    clearTimeout(p.fin); p.anda = null;
    p.el.classList.remove('camina', 'sentada', 'mira-i', 'mira-d', 'a-la-sombra');
    p.el.classList.add('en-agua');
    p.el.style.left = ''; p.el.style.top = ''; p.el.style.zIndex = '';
    w.appendChild(p.el);
    p.agua = tipo; p.w = w;
    if (tipo === 'moto' || tipo === 'kayak' || tipo === 'banana') p.el.classList.add('sentada');
    pintarPersonita(p);
    if (!rafAgua) rafAgua = requestAnimationFrame(moverAgua);
  }
  function salirDelAgua(p) {
    const sky = document.getElementById('sky'), w = p.w;
    p.agua = null; p.w = null;
    p.el.classList.remove('en-agua', 'sentada', 'surfea', 'izq');
    p.el.style.opacity = '';
    if (sky) sky.appendChild(p.el);
    if (w) w.remove();
    p.el.classList.toggle('sentada', !!p.sentada);
    ubicar(p); pintarPersonita(p);
  }
  // Quién está en el agua ahora (se revisa cada segundo, y cuando llega o se va alguien).
  function revisarAgua() {
    escena.forEach((p) => {
      const tipo = conPersona() ? aguaDe(p.pid) : null;
      if (tipo === p.agua) return;
      if (p.agua) salirDelAgua(p);
      if (tipo) entrarAlAgua(p, tipo);
    });
    revisarVaradas();
    revisarMascotas();
    revisarRonda();
    revisarLujos();
  }
  // Lo que no está en el agua queda varado en la orilla (de noche, con tormenta, con el barco fantasma o mientras surfea con
  // la otra cosa): la moto, el kayak o la tabla de quien la tiene. Una por persona, en los costados, para no tapar a nadie.
  const VARADAS = ['moto', 'kayak', 'tabla'], LUGAR_VARADA = [[9, 71.2], [91, 71.4], [27, 71], [73, 71.1], [42, 70.9], [58, 71]];
  function revisarVaradas() {
    const sky = document.getElementById('sky');
    if (!sky) return;
    const hay = conPersona() ? [...escena.values()].filter((p) => !p.agua).map((p) => [p.pid, VARADAS.find((id) => tieneCosa(p.pid, id))]).filter((x) => x[1]).sort((a, b) => a[0].localeCompare(b[0])) : [];
    const claves = hay.map(([pid, id]) => pid + ':' + id);
    sky.querySelectorAll('.varada').forEach((el) => { if (!claves.includes(el.dataset.k)) el.remove(); });
    hay.forEach(([pid, id], i) => {
      const k = claves[i], [x, y] = LUGAR_VARADA[i % LUGAR_VARADA.length];
      let el = sky.querySelector(`.varada[data-k="${k}"]`);
      if (!el) {
        el = document.createElement('div');
        el.className = 'varada ' + id; el.dataset.k = k;
        el.innerHTML = id === 'moto' ? ARTE.item('moto', colorCosa(pid, 'moto')) : id === 'kayak' ? kayakSVG(colorCosa(pid, 'kayak') || '#ffe39a') : tablaSVG(colorCosa(pid, 'tabla') || '#f7b3c6');
        sky.appendChild(el);
      }
      const h = 165 * PX_CM * escalaY(y);
      el.classList.toggle('izq', x > 50);
      el.style.cssText = `left:${x}%;top:${y}%;width:${(h * (id === 'moto' ? 1.75 : id === 'kayak' ? 2.1 : 1.5)).toFixed(1)}px;z-index:${capaY(y)}`;
    });
  }
  // ---------- las mascotas ----------
  // Las mascotas de quienes están mirando el mar, una de cada una aunque la tengan varios (va con el primero, por orden):
  // sentadas en la arena al lado del lugar de su dueño, un poco adelante. Cada tanto alguna tira un 🦴, una 🐾, un 🐟…
  // y si la tocás, también. Con el barco fantasma se asustan.
  let mimosT = null;
  function revisarMascotas() {
    const sky = document.getElementById('sky');
    if (!sky) return;
    const cs = casas(), duenio = new Map();
    if (conPersona()) [...escena.keys()].sort().forEach((pid) => Object.keys(D.MASCOTAS).forEach((id) => { if (!duenio.has(id) && tieneCosa(pid, id)) duenio.set(id, pid); }));
    sky.querySelectorAll('.mascota-mar').forEach((el) => { if (!duenio.has(el.dataset.m)) el.remove(); });
    const cuantas = {};
    duenio.forEach((pid, id) => {
      const c = cs[pid];
      if (!c) return;
      const j = (cuantas[pid] = (cuantas[pid] || 0) + 1) - 1, lado = (hash(pid) % 2 ? 1 : -1) * (j % 2 ? -1 : 1);
      const x = clamp(c.x + lado * (3.6 + Math.floor(j / 2) * 3.2), 4, 96), y = c.y + 1.6 + (j % 2) * 0.5;
      const [aw, ah] = (window.ARTE_IMG || {})[id] || [300, 300], t = 165 * PX_CM * escalaY(y) * 0.66;
      let el = sky.querySelector(`.mascota-mar[data-m="${id}"]`);
      if (!el) {
        el = document.createElement('div');
        el.className = 'mascota-mar'; el.dataset.m = id;
        el.innerHTML = `<span class="cuerpo">${ARTE.item(id)}</span>`;
        sky.appendChild(el);
      }
      el.classList.toggle('izq', x > c.x);
      const css = `left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;width:${(t * Math.sqrt(aw / ah)).toFixed(1)}px;z-index:${capaY(y)}`;
      if (el.style.cssText !== css) el.style.cssText = css;
    });
    if (duenio.size && !mimosT) mimosT = setTimeout(mimos, 2500 + Math.random() * 2500);
  }
  function mimos() {
    mimosT = null;
    const ms = [...document.querySelectorAll('#sky .mascota-mar')];
    if (!ms.length) return;
    mimo(ms[Math.floor(Math.random() * ms.length)]);
    mimosT = setTimeout(mimos, (ms.length > 2 ? 2600 : 4200) + Math.random() * 3000);
  }
  function mimo(el) {
    const tipo = D.MASCOTAS[el.dataset.m] || 'perro', pelea = fantasma && fantasma.inicio && Date.now() >= fantasma.inicio && !fantasma.hundido && !fantasma.escapo;
    const l = pelea ? (tipo === 'gato' ? ['😾', '🐾'] : ['¡guau!', '¡guau!', '🦴']) : fantasma ? (tipo === 'gato' ? ['🙀', '❗'] : ['❗', '😨']) : D.MIMOS[tipo];
    el.querySelectorAll('.mimo').forEach((m) => m.remove());
    const m = document.createElement('span');
    m.className = 'mimo'; m.textContent = l[Math.floor(Math.random() * l.length)]; m.setAttribute('aria-hidden', 'true');
    el.appendChild(m);
    setTimeout(() => m.remove(), 1700);
  }
  function tocarMascota(x, y) {
    const el = [...document.querySelectorAll('#sky .mascota-mar')].find((n) => {
      const r = n.getBoundingClientRect();
      return x > r.left - 10 && x < r.right + 10 && y > r.top - 12 && y < r.bottom + 8;
    });
    if (!el) return false;
    mimo(el);
    SONIDO.plop();
    S.contar('mar.mimos');
    return true;
  }
  let rafAgua = 0;
  const suave = (k) => k * k * (3 - 2 * k);
  function moverAgua() {
    const ahora = Date.now(), en = [...escena.values()].filter((p) => p.agua && p.w);
    if (!en.length) { rafAgua = 0; return; }
    const motos = en.filter((p) => p.agua === 'moto').sort((a, b) => a.pid.localeCompare(b.pid));
    const surfers = en.filter((p) => p.agua === 'surf').sort((a, b) => a.pid.localeCompare(b.pid));
    const kayaks = en.filter((p) => p.agua === 'kayak').sort((a, b) => a.pid.localeCompare(b.pid));
    // Kayaks: más cerca de la orilla y despacio, cada uno en su carril; van y vuelven en un minuto y medio.
    kayaks.forEach((p, i) => {
      const T = 96000, u = (ahora / T + i * 0.37) % 1, ida = u < 0.5, k = suave(ida ? u * 2 : 2 - u * 2);
      ponerEnAgua(p, 14 + 72 * k, 63.6 + i * 1.5 + Math.sin(ahora / 900 + i) * 0.16, !ida, 1, false);
    });
    // Motos: de a dos, a la par (el segundo un poco más cerca), cada pareja en su carril. Van y vuelven en 44 s.
    motos.forEach((p, i) => {
      const par = Math.floor(i / 2), T = 44000, u = (ahora / T + par * 0.31) % 1, ida = u < 0.5, k = suave(ida ? u * 2 : 2 - u * 2);
      // a la par: el segundo de cada pareja va por el carril de al lado (más cerca) y apenas atrás, para que se vean los dos
      const atras = (i % 2) * (ida ? -3 : 3), x = 10 + 80 * k + atras, y = 60.6 - par * 1.9 + (i % 2) * 2.6 + Math.sin(ahora / 520 + i) * 0.12;
      ponerEnAgua(p, x, y, !ida, 1, Math.abs(Math.sin(u * Math.PI * 2)) > 0.15);
      if (i === 0) bananaLider = { x, y, izq: !ida };
    });
    // la banana va atrás de la primera moto, y los que se subieron, sentados encima
    const ban = document.querySelector('#sky .banana-mar');
    if (ban && bananaLider) {
      const { x, y, izq } = bananaLider, bx = x + (izq ? 9 : -9), by = y + 0.5, hb = 165 * PX_CM * escalaY(by);
      ban.style.cssText = `left:${bx.toFixed(2)}%;top:${by.toFixed(2)}%;width:${(hb * 2.4).toFixed(1)}px;z-index:${capaY(by) - 1}`;
      ban.classList.toggle('izq', izq);
      en.filter((p) => p.agua === 'banana').sort((a, b) => a.pid.localeCompare(b.pid)).forEach((p, i) => ponerEnAgua(p, bx + (izq ? 1 : -1) * (i * 3.2 - 4.8), by - 0.3, izq, 1, false));
    }
    // Surf: espera la ola sentado, se para y la corre hacia la orilla, se cae y vuelve a salir. Cada uno a su ritmo.
    surfers.forEach((p, i) => {
      const T = 24000, fase = (ahora / T + i * 0.43), u = fase % 1, vuelta = Math.floor(fase);
      const dir = (vuelta + i) % 2 ? 1 : -1, r = ((i * 37 + vuelta * 17) % 52) / 52, x0 = dir > 0 ? 10 + r * 52 : 38 + r * 52; // la ola termina adentro de la pantalla
      let x = x0, y = 59.2 + Math.sin(ahora / 700 + i) * 0.15, op = 1, parado = false;
      if (u < 0.06) op = u / 0.06;
      else if (u >= 0.38 && u < 0.8) { const k = (u - 0.38) / 0.42; x = x0 + dir * 26 * k; y = 59.2 + 6.6 * suave(k); parado = true; }
      else if (u >= 0.8) { x = x0 + dir * 26; y = 65.8; op = u < 0.86 ? 1 - (u - 0.8) / 0.06 : 0; parado = u < 0.83; }
      p.el.classList.toggle('sentada', !parado); p.el.classList.toggle('surfea', parado);
      p.w.classList.toggle('ola', parado);
      ponerEnAgua(p, x, y, dir < 0, op, parado);
    });
    rafAgua = requestAnimationFrame(moverAgua);
  }
  function ponerEnAgua(p, x, y, izq, op, estela) {
    const h = PERSONITAS[p.como].cm * PX_CM * escalaY(y);
    p.w.style.left = x.toFixed(2) + '%'; p.w.style.top = y.toFixed(2) + '%';
    p.w.style.setProperty('--h', h.toFixed(1) + 'px');
    p.w.style.zIndex = capaY(y);
    p.w.style.opacity = op.toFixed(2);
    p.w.classList.toggle('izq', izq); p.w.classList.toggle('con-estela', estela);
  }
  // ---------- la ronda: antorchas, heladerita, guitarra y pelota ----------
  // Cosas del kiosco que cobran vida si su dueño está mirando el mar (una de cada una, aunque la tengan varios):
  // las antorchas a los costados (de noche iluminan la arena), la heladerita (tocarla es brindar: si brindan 3 o más casi a la
  // vez, chin chin y 5 monedas, una vez por día), la guitarra (de noche, con el fogón, su dueño toca: la música suma arpegios
  // y los toques suenan a guitarra) y la pelota de vóley o de fútbol, para pasársela entre todos sin que caiga.
  const duenioDe = (id) => [...escena.keys()].sort().find((pid) => tieneCosa(pid, id));
  function revisarRonda() {
    const sky = document.getElementById('sky');
    if (!sky) return;
    const hay = conPersona() && !!document.querySelector('.mirar-capa'), noche = diaAhora() < 0.5, h = 165 * PX_CM;
    const poner = (cls, id, x, y, ancho, espejo) => {
      let el = sky.querySelector('.' + cls.trim().split(/\s+/).join('.'));
      if (!el) { el = document.createElement('div'); el.className = cls; el.innerHTML = `<span class="cuerpo">${ARTE.item(id, shopItem(id).col)}</span>`; sky.appendChild(el); }
      el.classList.toggle('noche', noche); el.classList.toggle('izq', !!espejo);
      const css = `left:${x}%;top:${y}%;width:${(ancho * escalaY(y)).toFixed(1)}px;z-index:${capaY(y)}`;
      if (el.style.cssText !== css) el.style.cssText = css;
      return el;
    };
    const sacar = (cls) => sky.querySelectorAll(`.${cls}`).forEach((n) => n.remove());
    // antorchas: un par a cada costado
    if (hay && duenioDe('antorchas')) { poner('antorcha-mar a', 'antorchas', 20, 75.6, h * 0.42); poner('antorcha-mar b', 'antorchas', 80, 75.6, h * 0.42, true); }
    else sacar('antorcha-mar');
    // heladerita
    if (hay && duenioDe('heladerita')) poner('heladerita-mar', 'heladerita', 64, 79.2, h * 0.95);
    else sacar('heladerita-mar');
    // guitarra: de noche, con el fogón
    const guitarrero = hay && cosasMar() === 'fogon' && !fantasmaPeleando() ? duenioDe('guitarra') : null;
    escena.forEach((p) => {
      const tiene = p.pid === guitarrero, ya = p.el.querySelector('.guitarra-mano');
      if (tiene && !ya) { const g = document.createElement('span'); g.className = 'guitarra-mano'; g.innerHTML = ARTE.item('guitarra'); p.el.appendChild(g); }
      if (!tiene && ya) ya.remove();
    });
    INICIO.guitarra(!!guitarrero);
    revisarPelota(hay);
  }
  const fantasmaPeleando = () => !!(fantasma && fantasma.inicio && !fantasma.hundido && !fantasma.escapo);

  // El brindis
  let brindis = [], ultimoChin = 0;
  function tocarHeladerita(x, y) {
    const el = document.querySelector('#sky .heladerita-mar');
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (x < r.left - 14 || x > r.right + 14 || y < r.top - 18 || y > r.bottom + 10) return false;
    brindar(yoEnElMar(), true);
    // en el modo demo, dos personitas de prueba brindan también
    if (!S.live) [...escena.values()].filter((p) => p.falsa).slice(0, 2).forEach((p, i) => setTimeout(() => brindar(p.pid, false), 500 + i * 450));
    return true;
  }
  function brindar(pid, propio) {
    const ahora = Date.now(), p = escena.get(pid);
    brindis = brindis.filter((b) => ahora - b.t < 3000 && b.pid !== pid).concat({ pid, t: ahora });
    if (p) tirarSusto(p, '🥂');
    if (propio) { S.enviarMar({ t: 'brindis' }); SONIDO.plop(); }
    if (brindis.length >= 3 && brindis.some((b) => b.pid === yoEnElMar()) && ahora - ultimoChin > 5000) chinChin();
  }
  function chinChin() {
    ultimoChin = Date.now(); brindis = [];
    const el = document.querySelector('#sky .heladerita-mar'), r = el && el.getBoundingClientRect();
    if (r) chispas(r.left + r.width / 2, r.top, 26, ['#ffe39a', '#f7b3c6', '#b6e5cd', '#a9d6f0', '#cfc0f0', '#ffffff']);
    escena.forEach((p) => setTimeout(() => tirarSusto(p, ['🥂', '🍻', '🥳'][hash(p.pid) % 3]), Math.random() * 500));
    INICIO.aviso();
    const c = S.brindar();
    toast(`<span style="font-size:1.6rem">🥂</span><span>¡Chin chin!${c ? ` <b>+${c}</b> monedas.` : ''}</span>`, 3500);
  }

  // La pelota: se la pasan sin que caiga. Tocarla la manda hacia otra personita; si llega sin que nadie la toque, cae y se
  // empieza de nuevo. Cuenta los pases seguidos; el récord es de toda la colonia.
  let pelota = null; // { el, id, n, de, a, t0, cae, x, y, yoToque }
  const VUELO = 1700;
  function revisarPelota(hay) {
    const sky = document.getElementById('sky');
    const id = hay ? (duenioDe('voley') ? 'voley' : duenioDe('futbol') ? 'futbol' : null) : null;
    if (!id || escena.size < 1) { if (pelota) { pelota.el.remove(); pelota = null; } return; }
    if (pelota && pelota.id === id) return;
    if (pelota) pelota.el.remove();
    const el = document.createElement('div');
    el.className = 'pelota-mar';
    el.innerHTML = `<span class="bola">${ARTE.item(id)}</span><b class="cuenta"></b>`;
    sky.appendChild(el);
    pelota = { el, id, n: 0, de: duenioDe(id), a: duenioDe(id), t0: 0, cae: true, yoToque: false };
    quietaEn(pelota.a);
  }
  const pies = (pid) => { const p = escena.get(pid), r = p && p.el.getBoundingClientRect(), s = document.getElementById('sky').getBoundingClientRect(); return r ? [r.left + r.width / 2 - s.left + 9, r.bottom - s.top - 2] : [innerWidth / 2, innerHeight * 0.78]; };
  const cabeza = (pid) => { const p = escena.get(pid), r = p && p.el.getBoundingClientRect(), s = document.getElementById('sky').getBoundingClientRect(); return r ? [r.left + r.width / 2 - s.left, r.top - s.top - 6] : [innerWidth / 2, innerHeight * 0.7]; };
  function ubicarPelota(x, y) {
    if (!pelota) return;
    pelota.x = x; pelota.y = y;
    pelota.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }
  function quietaEn(pid) { const [x, y] = pies(pid); ubicarPelota(x, y); }
  function tocarPelota(x, y) {
    if (!pelota) return false;
    const s = document.getElementById('sky').getBoundingClientRect(), dx = x - s.left - pelota.x, dy = y - s.top - pelota.y;
    if (dx * dx + dy * dy > 34 * 34) return false;
    const k = pelota.cae ? 1 : (Date.now() - pelota.t0) / VUELO;
    if (!pelota.cae && k < 0.35) return true; // recién salió: todavía no se puede volver a tocar
    const otros = [...escena.keys()].filter((pid) => pid !== pelota.a);
    const a = otros.length ? otros[Math.floor(Math.random() * otros.length)] : pelota.a;
    pelota.yoToque = true;
    pase(pelota.cae ? 1 : pelota.n + 1, a, Date.now());
    S.enviarMar({ t: 'pelota', n: pelota.n, a, t0: pelota.t0 });
    return true;
  }
  function pase(n, a, t0) {
    if (!pelota || !escena.has(a)) return;
    if (!pelota.cae && n <= pelota.n && t0 <= pelota.t0) return; // ya lo tenía
    pelota.n = Math.max(n, pelota.cae ? 0 : pelota.n); pelota.de = pelota.a; pelota.a = a; pelota.t0 = t0; pelota.cae = false;
    pelota.desde = [pelota.x, pelota.y];
    pelota.el.classList.remove('cayo'); pelota.el.classList.add('vuela');
    pelota.el.querySelector('.cuenta').textContent = pelota.n > 1 ? pelota.n : '';
    INICIO.golpe();
    if (!pelota.raf) pelota.raf = requestAnimationFrame(volarPelota);
  }
  function volarPelota() {
    if (!pelota) return;
    pelota.raf = 0;
    const k = (Date.now() - pelota.t0) / VUELO, [x0, y0] = pelota.desde, [x1, y1] = cabeza(pelota.a);
    if (k < 1) {
      const u = Math.max(0, k), alto = Math.min(110, 50 + Math.abs(x1 - x0) * 0.35);
      ubicarPelota(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u - alto * 4 * u * (1 - u));
      pelota.raf = requestAnimationFrame(volarPelota);
      return;
    }
    if (k < 1.12) { ubicarPelota(x1, y1); pelota.raf = requestAnimationFrame(volarPelota); return; } // un ratito para tocarla justo
    // nadie la tocó: cae
    const n = pelota.n;
    pelota.cae = true; pelota.el.classList.remove('vuela'); pelota.el.classList.add('cayo');
    quietaEn(pelota.a);
    if (n > 1) {
      if (pelota.yoToque) S.record('pases.max', n);
      const rec = Math.max(S.maxDeTodos('pases.max'), n);
      pelota.el.querySelector('.cuenta').textContent = `${n} pases · récord ${rec}`;
      setTimeout(() => { if (pelota && pelota.cae) pelota.el.querySelector('.cuenta').textContent = ''; }, 3000);
    } else pelota.el.querySelector('.cuenta').textContent = '';
    pelota.n = 0; pelota.yoToque = false;
  }

  // ---------- los juegos y los lujos nuevos en Mirar el mar ----------
  // Cada cosa aparece si su dueño está mirando el mar (una de cada una). En el cielo y el horizonte: la isla, el velero (con
  // el color de su vela), el faro (de noche barre el mar), el helicóptero (cada 3 minutos cruza y tira un paquete: el primero
  // que lo toca cobra 15 monedas), los barriletes (arriba de su dueño; con viento suben más y si hay tres se enredan), la
  // avioneta con el cartel de su dueño (si hay varias se turnan), las bengalas (de noche, tocar el cielo tira fuegos; en las
  // fechas especiales, todos) y el catalejo maldito (tocarlo muestra qué hay lejos). En la arena: el sillón, la chozita (si
  // golpeás, contestan), las estatuas doradas de las mascotas (brillan al atardecer), el pelopincho (con más de 28° la gente
  // se mete), el parlante (de noche, luces, bajo y baile), el cofre maldito (su dueño lo abre una vez por día), el castillo
  // de arena de todos, las paletas y la banana inflable que tira la moto de agua.
  const CALOR_PRUEBA = PROTO && /[?&]calor/.test(location.search);
  const hace28 = () => CALOR_PRUEBA || !!(SKY.weather && SKY.weather.temp >= 28);
  const fechaEspecial = () => ['12-08', '12-24', '12-25', '12-31', '01-01'].includes(SKY.arDate().slice(5));
  function lujo(sky, cls, id, x, y, ancho, col, extra = '') {
    let el = sky.querySelector('.' + cls);
    if (!el) { el = document.createElement('div'); el.className = 'lujo-mar ' + cls; el.innerHTML = `<span class="cuerpo">${ARTE.item(id, col)}</span>${extra}`; sky.appendChild(el); }
    const css = `left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;width:${ancho.toFixed(1)}px;z-index:${capaY(y)}`;
    if (el.style.cssText !== css) el.style.cssText = css;
    return el;
  }
  const quitarLujo = (cls) => document.querySelectorAll('#sky .' + cls).forEach((n) => n.remove());
  const enSky = (el) => { const r = el.getBoundingClientRect(), s = skyRect(); return [((r.left + r.width / 2 - s.left) / s.width) * 100, ((r.top - s.top) / s.height) * 100]; };
  const skyRect = () => document.getElementById('sky').getBoundingClientRect();
  const dentro = (el, x, y, m = 10) => { if (!el) return false; const r = el.getBoundingClientRect(); return x > r.left - m && x < r.right + m && y > r.top - m && y < r.bottom + m; };
  function revisarLujos() {
    const sky = document.getElementById('sky');
    if (!sky) return;
    const hay = conPersona() && !!document.querySelector('.mirar-capa'), noche = diaAhora() < 0.5, h = 165 * PX_CM, ahora = Date.now();
    const de = (id) => (hay ? duenioDe(id) : null), cs = casas();
    // la isla y el velero, en el horizonte
    if (de('isla')) lujo(sky, 'isla-mar', 'isla', 80, 57.6, 56); else quitarLujo('isla-mar');
    const velero = de('velero');
    if (velero) {
      const T = 180000, fase = (hash(velero) % 1000) / 1000, u = (ahora / T + fase) * 2 * Math.PI;
      const el = lujo(sky, 'velero-mar', 'velero', 50 + 36 * Math.sin(u), 57.9, 30, colorCosa(velero, 'velero'));
      el.classList.toggle('izq', Math.cos(u) < 0);
    } else quitarLujo('velero-mar');
    // el faro, a la derecha del horizonte; de noche barre el mar
    if (de('faro')) { const el = lujo(sky, 'faro-mar', 'faro', 95, 59, 24, null, '<i class="haz" aria-hidden="true"></i>'); el.classList.toggle('noche', noche); } else quitarLujo('faro-mar');
    revisarHelicoptero(sky, de('helicoptero'), ahora);
    revisarBarriletes(sky, hay);
    revisarAvioneta(sky, hay, ahora);
    // el catalejo maldito, en la orilla a la izquierda
    if (de('catalejo')) lujo(sky, 'catalejo-mar', 'catalejo', 14, 77.2, h * 0.95); else quitarLujo('catalejo-mar');
    // en la arena: la chozita al fondo, el sillón y el cofre al lado de su dueño, las estatuas, el pelopincho, el parlante y el castillo
    if (de('chozita')) lujo(sky, 'chozita-mar', 'chozita', 6.5, 71, h * 1.6); else quitarLujo('chozita-mar');
    if (de('sillon')) lujo(sky, 'sillon-mar', 'sillon', 71, 72.8, h * 1.05); else quitarLujo('sillon-mar');
    if (de('cofre')) lujo(sky, 'cofre-mar', 'cofre', 86, 78.4, h * 0.85); else quitarLujo('cofre-mar');
    revisarEstatuas(sky, de('estatuas'));
    if (de('pelopincho')) { const el = lujo(sky, 'pelopincho-mar', 'pelopincho', 27, 81.4, h * 1.7); el.classList.toggle('calor', hace28()); } else quitarLujo('pelopincho-mar');
    const parlante = de('parlante'), fiesta = !!parlante && noche && !fantasmaPeleando();
    if (parlante) lujo(sky, 'parlante-mar', 'parlante', 58, 74.4, h * 0.62); else quitarLujo('parlante-mar');
    let luces = sky.querySelector('.luces-fiesta');
    if (fiesta && !luces) { luces = document.createElement('div'); luces.className = 'luces-fiesta'; luces.innerHTML = '<i></i><i></i><i></i><i></i>'; sky.appendChild(luces); }
    if (!fiesta && luces) luces.remove();
    document.body.classList.toggle('fiesta', fiesta);
    INICIO.fiesta(fiesta);
    revisarCastillo(sky, de('balde'), h);
    revisarPaletas(sky, de('paletas'));
    revisarBanana(sky, de('banana'));
    // la maldición del cofre: una gaviota parada en la cabeza
    escena.forEach((p) => {
      const g = p.el.querySelector('.gaviota-cabeza'), maldito = (S.achDe(p.pid).maldicion || 0) > ahora;
      if (maldito && !g) { const e = document.createElement('span'); e.className = 'gaviota-cabeza'; e.textContent = '🐦'; e.setAttribute('aria-hidden', 'true'); p.el.appendChild(e); }
      if (!maldito && g) g.remove();
    });
  }

  // El helicóptero: cada 3 minutos (la misma hora en todos los celus) cruza el cielo en 14 s y a la mitad tira un paquete con
  // paracaídas. Cae en la arena y queda un rato: el primero que lo toca cobra 15 monedas.
  const HELI = 180000, CRUCE = 14000;
  let paqueteAgarrado = new Set();
  function revisarHelicoptero(sky, duenio, ahora) {
    const c = Math.floor(ahora / HELI), t = ahora - c * HELI;
    const heli = sky.querySelector('.heli-mar');
    if (duenio && t < CRUCE) {
      if (!heli || +heli.dataset.c !== c) {
        if (heli) heli.remove();
        const el = document.createElement('div');
        el.className = 'lujo-mar heli-mar'; el.dataset.c = c;
        el.innerHTML = `<span class="cuerpo">${ARTE.item('helicoptero')}</span>`;
        el.style.animationDelay = `-${(t / 1000).toFixed(2)}s`;
        sky.appendChild(el);
      }
    } else if (heli) heli.remove();
    const paq = sky.querySelector('.paquete-mar'), activo = duenio && t >= CRUCE / 2 && t < CRUCE / 2 + 30000 && !paqueteAgarrado.has(c);
    if (activo && (!paq || +paq.dataset.c !== c)) {
      if (paq) paq.remove();
      const el = document.createElement('div');
      el.className = 'paquete-mar'; el.dataset.c = c;
      el.innerHTML = '<span class="paracaidas" aria-hidden="true"></span><span class="caja" aria-hidden="true">📦</span>';
      el.style.animationDelay = `-${((t - CRUCE / 2) / 1000).toFixed(2)}s`;
      sky.appendChild(el);
    } else if (!activo && paq) paq.remove();
  }
  function tocarPaquete(x, y) {
    const el = document.querySelector('#sky .paquete-mar');
    if (!dentro(el, x, y, 22)) return false;
    const c = +el.dataset.c;
    paqueteAgarrado.add(c); el.remove();
    const m = S.agarrarPaquete(c);
    S.enviarMar({ t: 'paquete', c });
    chispas(x, y, 16, ['#ffe39a', '#fff2c8', '#f6a38f']);
    if (m) { SONIDO.monedas(m); toast(`<span style="font-size:1.5rem">📦</span><span>¡Agarraste el paquete del helicóptero! <b>+${m}</b> monedas.</span>`, 3500); }
    return true;
  }
  function paqueteDeOtro(pid, c) {
    paqueteAgarrado.add(c);
    const el = document.querySelector(`#sky .paquete-mar[data-c="${c}"]`);
    if (el) { el.remove(); const p = escena.get(pid); if (p && p.el.isConnected) tirarSusto(p, '📦'); }
  }

  // Los barriletes: uno arriba de cada dueño, con su hilo hasta la mano. Con viento de verdad suben más; si hay tres o más,
  // se enredan en el medio.
  function revisarBarriletes(sky, hay) {
    const duenios = hay ? [...escena.keys()].sort().filter((pid) => tieneCosa(pid, 'barrilete')) : [];
    sky.querySelectorAll('.barrilete-mar').forEach((el) => { if (!duenios.includes(el.dataset.pid)) el.remove(); });
    let hilos = sky.querySelector('.hilos-mar');
    if (!duenios.length) { if (hilos) hilos.remove(); return; }
    if (!hilos) { hilos = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); hilos.setAttribute('class', 'hilos-mar'); hilos.setAttribute('viewBox', '0 0 100 100'); hilos.setAttribute('preserveAspectRatio', 'none'); sky.appendChild(hilos); }
    const viento = SKY.weather && SKY.weather.wind >= 25, enredados = duenios.length >= 3;
    let lineas = '';
    duenios.forEach((pid, i) => {
      const p = escena.get(pid);
      if (!p || !p.el.isConnected) return;
      const [mx, my] = enSky(p.el), manoY = my + 2.2;
      const kx = enredados ? 50 + (i - (duenios.length - 1) / 2) * 3.5 : clamp(mx + (i % 2 ? -7 : 7), 8, 92), ky = (viento ? 17 : 27) + (i % 3) * 2;
      let el = sky.querySelector(`.barrilete-mar[data-pid="${pid}"]`);
      if (!el) { el = document.createElement('div'); el.className = 'lujo-mar barrilete-mar'; el.dataset.pid = pid; el.innerHTML = `<span class="cuerpo">${ARTE.item('barrilete', colorCosa(pid, 'barrilete'))}</span>`; sky.appendChild(el); }
      el.style.left = kx.toFixed(2) + '%'; el.style.top = ky.toFixed(2) + '%';
      el.classList.toggle('enredado', enredados);
      lineas += `<path d="M${mx.toFixed(2)} ${manoY.toFixed(2)} Q${((mx + kx) / 2 + (enredados ? (i - 1) * 6 : 0)).toFixed(2)} ${((manoY + ky) / 2 + 8).toFixed(2)} ${kx.toFixed(2)} ${(ky + 4).toFixed(2)}"/>`;
    });
    hilos.innerHTML = lineas;
  }

  // La avioneta: cruza el cielo con el cartel de su dueño. Si hay varias, se turnan: una cada 40 s.
  const cartelAvioneta = (pid) => S.achDe(pid).avioneta || `¡Saludos de ${(person(pid) || { n: pid }).n}!`;
  function revisarAvioneta(sky, hay, ahora) {
    const duenios = hay ? [...escena.keys()].sort().filter((pid) => tieneCosa(pid, 'avioneta')) : [];
    const k = Math.floor(ahora / 40000), t = ahora - k * 40000, pid = duenios.length ? duenios[k % duenios.length] : null;
    const el = sky.querySelector('.avioneta-mar');
    if (!pid || t >= 16000) { if (el) el.remove(); return; }
    if (el && +el.dataset.k === k) return;
    if (el) el.remove();
    const a = document.createElement('div');
    a.className = 'lujo-mar avioneta-mar' + (k % 2 ? ' izq' : ''); a.dataset.k = k;
    a.innerHTML = `<span class="cartel-avioneta">${esc(cartelAvioneta(pid))}</span><i class="soga" aria-hidden="true"></i><span class="cuerpo">${ARTE.item('avioneta', colorCosa(pid, 'avioneta'))}</span>`;
    a.style.animationDelay = `-${(t / 1000).toFixed(2)}s`;
    sky.appendChild(a);
  }

  // Las bengalas: de noche, si alguien que las tiene está mirando (o en una fecha especial), tocar el cielo tira fuegos.
  let ultimaBengala = 0;
  const COLORES_FUEGO = ['#ffe39a', '#f7b3c6', '#a9d6f0', '#b6e5cd', '#cfc0f0', '#ffffff', '#f6a38f'];
  function bengala(x, y) {
    if (y > innerHeight * 0.52 || diaAhora() >= 0.5 || Date.now() - ultimaBengala < 800) return;
    if (!fechaEspecial() && !duenioDe('bengalas')) return;
    ultimaBengala = Date.now();
    fuegos(x, y);
    S.enviarMar({ t: 'bengala', x: +(x / innerWidth).toFixed(3), y: +(y / innerHeight).toFixed(3) });
    S.contar('mar.bengalas');
  }
  function fuegos(x, y) {
    const color = COLORES_FUEGO[Math.floor(Math.random() * COLORES_FUEGO.length)], color2 = COLORES_FUEGO[Math.floor(Math.random() * COLORES_FUEGO.length)];
    for (let i = 0; i < 26; i++) {
      const d = document.createElement('i'), a = (i / 26) * Math.PI * 2 + Math.random() * 0.2, r = 50 + Math.random() * 45;
      d.className = 'chispa-fuego'; d.style.background = i % 3 ? color : color2;
      document.body.appendChild(d);
      d.animate([
        { transform: `translate(${x}px, ${y}px) scale(1)`, opacity: 1 },
        { transform: `translate(${x + Math.cos(a) * r}px, ${y + Math.sin(a) * r}px) scale(.9)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${x + Math.cos(a) * r * 1.1}px, ${y + Math.sin(a) * r * 1.1 + 34}px) scale(.3)`, opacity: 0 },
      ], { duration: 1300 + Math.random() * 400, easing: 'cubic-bezier(.15,.7,.3,1)' }).onfinish = () => d.remove();
    }
    INICIO.fuego();
  }

  // El catalejo maldito: tocarlo muestra qué hay lejos, por unos segundos. A veces, algo te mira de vuelta.
  let ultimoCatalejo = 0;
  function tocarCatalejo(x, y) {
    const el = document.querySelector('#sky .catalejo-mar');
    if (!dentro(el, x, y, 12)) return false;
    if (Date.now() - ultimoCatalejo < 8000 || document.querySelector('.lente')) return true;
    ultimoCatalejo = Date.now();
    const holandes = !fantasma && ![...escena.keys()].some((pid) => S.hundioHoy(pid));
    const vistas = [['ballena', 'Una ballena, lejos, lejos.'], ['lobo', 'Un lobo marino tomando sol en una boya.'], ['delfin', 'Delfines, saltando en fila.'],
      ['botella', 'Una botella flotando. ¿Para quién será?'], ['sirena', '¿Eso fue una cola de sirena?'], ['nada', 'Mar. Solo mar.'],
      ['ojo', 'Algo te está mirando.', true], ...(holandes ? [['barco', 'El Holandés, en el horizonte. Viene.', true]] : [])];
    const [que, txt, maldito] = vistas[Math.floor(Math.random() * vistas.length)];
    const dibujo = que === 'barco' ? '<img class="vista-barco" src="img/mar/fantasma.webp?v=1" alt="">' : que === 'ojo' ? '<span class="ojo">👁️</span>' : que === 'nada' ? '' : `<span class="vista-cosa">${ARTE.item(que)}</span>`;
    const lente = document.createElement('div');
    lente.className = 'lente' + (maldito ? ' maldita' : '');
    lente.innerHTML = `<div class="circulo">${dibujo}</div><p>${esc(txt)}</p>`;
    document.querySelector('.mirar-capa').appendChild(lente);
    if (maldito) INICIO.trueno(0.1, 0.45); else INICIO.aviso();
    setTimeout(() => lente.classList.add('fuera'), 4200); setTimeout(() => lente.remove(), 5000);
    S.contar('mar.catalejo');
    return true;
  }

  // La chozita: si golpeás, contestan.
  function tocarChozita(x, y) {
    const el = document.querySelector('#sky .chozita-mar');
    if (!dentro(el, x, y, 6)) return false;
    INICIO.golpe(); setTimeout(() => INICIO.golpe(), 180);
    el.querySelectorAll('.respuesta').forEach((n) => n.remove());
    const r = document.createElement('span');
    r.className = 'respuesta'; r.textContent = ['¡Ocupado!', '🙋', '😴', '🦀', '¿Quién es?', 'Shhh', '🍻'][Math.floor(Math.random() * 7)];
    el.appendChild(r); setTimeout(() => r.remove(), 1800);
    return true;
  }

  // El cofre maldito: lo abre su dueño, una vez por día.
  function tocarCofre(x, y) {
    const el = document.querySelector('#sky .cofre-mar');
    if (!dentro(el, x, y, 8)) return false;
    const duenio = duenioDe('cofre');
    if (duenio !== yoEnElMar()) { toast(`<span>🗝️ El cofre es de ${esc((person(duenio) || { n: '' }).n)}: solo lo abre su dueño.</span>`); INICIO.trueno(0.05, 0.3); return true; }
    const r = S.abrirCofre();
    if (!r) { toast('<span>🗝️ Hoy ya abriste el cofre. Mañana vuelve a estar lleno… o maldito.</span>'); return true; }
    const b = el.getBoundingClientRect();
    if (r.c) { chispas(b.left + b.width / 2, b.top, 20, ['#ffe39a', '#fff2c8', '#f9d27a']); SONIDO.monedas(r.c); toast(`<span style="font-size:1.5rem">💰</span><span>El cofre tenía <b>+${r.c}</b> monedas.</span>`, 3500); }
    else { chispas(b.left + b.width / 2, b.top, 20, ['#7ef3c6', '#b9f8de', '#3fbf95']); INICIO.trueno(0.1, 0.6); toast('<span style="font-size:1.5rem">🐦</span><span>¡Maldición! Una gaviota se te paró en la cabeza. Se va en una hora.</span>', 4500); }
    revisarLujos();
    return true;
  }

  // Las estatuas doradas: las mascotas de su dueño en oro sobre un pedestal (si no tiene mascotas, las del kiosco). Al
  // atardecer brillan.
  function revisarEstatuas(sky, duenio) {
    const el = sky.querySelector('.estatuas-mar');
    if (!duenio) { if (el) el.remove(); return; }
    const mascotas = Object.keys(D.MASCOTAS).filter((id) => tieneCosa(duenio, id)).slice(0, 2), clave = duenio + ':' + mascotas.join(',');
    let e = el;
    if (!e || e.dataset.k !== clave) {
      if (e) e.remove();
      e = document.createElement('div'); e.className = 'lujo-mar estatuas-mar'; e.dataset.k = clave;
      e.innerHTML = mascotas.length ? mascotas.map((id) => `<span class="estatua"><span class="oro">${ARTE.item(id)}</span><i class="pedestal"></i></span>`).join('') : `<span class="cuerpo">${ARTE.item('estatuas')}</span>`;
      sky.appendChild(e);
    }
    const y = 72.2, st = SKY.state(), m = st.minute, sol = st.sun;
    e.style.cssText = `left:89%;top:${y}%;width:${(165 * PX_CM * (mascotas.length > 1 ? 1.6 : 1)).toFixed(1)}px;z-index:${capaY(y)}`;
    e.classList.toggle('brilla', Math.abs(m - sol.set) < 50);
  }

  // El castillo de arena de todos (balde y pala): cada toque es una palada y crece durante el día; a la noche se lo lleva
  // la marea. Las paladas de cada uno se guardan en sus cuentas del día, así que en todos los celus se ve el mismo.
  const ETAPAS_CASTILLO = [0, 6, 18, 40, 75, 120];
  let paladasVivas = {};
  function paladasHoy() {
    const k = 'castillo.' + SKY.arDate();
    return D.PEOPLE.reduce((t, p) => t + Math.max(S.cuentaDe(p.id, k), paladasVivas[p.id] || 0), 0);
  }
  const mareaAlta = () => { const st = SKY.state(); return st.minute > st.sun.set + 60 || st.minute < st.sun.rise; };
  function castilloSVG(etapa) {
    const A = '#e9d3a8', B = '#d9bf8c', L = 'stroke="#43365a" stroke-width="1.6" stroke-linejoin="round"';
    const torre = (x, w, h, y0 = 30) => `<path d="M${x} ${y0}V${y0 - h}h${w / 4}v-3h${w / 4}v3h${w / 4}v-3h${w / 4}v3V${y0}Z" fill="${A}" ${L}/>`;
    const partes = [`<path d="M4 30Q30 ${etapa ? 20 : 24} 56 30Z" fill="${B}" ${L}/>`];
    if (etapa >= 1) partes.push(torre(22, 14, 9));
    if (etapa >= 2) partes.push(torre(9, 11, 7), torre(40, 11, 7));
    if (etapa >= 3) partes.push(`<path d="M14 30V23H46V30" fill="${A}" ${L}/>`, torre(22, 14, 13));
    if (etapa >= 4) partes.push(torre(25, 9, 20), torre(5, 9, 10), torre(46, 9, 10));
    if (etapa >= 5) partes.push('<path d="M29.5 10V4l6 1.8-6 1.8" fill="#f7b3c6" stroke="#43365a" stroke-width="1.2"/>', '<path d="M9.5 20v-5l4 1.4-4 1.4M50.5 20v-5l4 1.4-4 1.4" fill="#a9d6f0" stroke="#43365a" stroke-width="1"/>');
    return `<svg viewBox="0 0 60 32" aria-hidden="true">${partes.join('')}</svg>`;
  }
  function revisarCastillo(sky, duenio, h) {
    let el = sky.querySelector('.castillo-mar');
    if (!duenio) { if (el) el.remove(); return; }
    const n = mareaAlta() ? 0 : paladasHoy(), etapa = ETAPAS_CASTILLO.filter((u) => n >= u).length - 1;
    if (!el) { el = document.createElement('div'); el.className = 'lujo-mar castillo-mar'; sky.appendChild(el); }
    if (+el.dataset.etapa !== etapa) { el.dataset.etapa = etapa; el.innerHTML = castilloSVG(etapa) + '<b class="cuenta"></b>'; }
    el.querySelector('.cuenta').textContent = n && !mareaAlta() ? `${n} paladas` : '';
    const y = 82.4; el.style.cssText = `left:37%;top:${y}%;width:${(h * 1.45).toFixed(1)}px;z-index:${capaY(y)}`;
  }
  function tocarCastillo(x, y) {
    const el = document.querySelector('#sky .castillo-mar');
    if (!dentro(el, x, y, 10)) return false;
    if (mareaAlta()) { toast('<span>🌊 La marea se llevó el castillo. Mañana se empieza de nuevo.</span>'); return true; }
    const n = S.palada();
    paladasVivas[S.me] = n;
    S.enviarMar({ t: 'pala', n });
    const b = el.getBoundingClientRect();
    chispas(b.left + b.width / 2, b.bottom - 6, 8, ['#e9d3a8', '#d9bf8c', '#fffaf0']);
    SONIDO.trtss();
    revisarCastillo(document.getElementById('sky'), duenioDe('balde'), 165 * PX_CM);
    return true;
  }

  // Las paletas: su dueño pelotea con otra personita. Hay que tocar la pelotita justo cuando está por llegar (en el último
  // tramo); cada golpe la acelera un poco. Si nadie la toca a tiempo, cae. El récord de golpes seguidos es de toda la colonia.
  let rally = null; // { el, n, de, a, t0, dur, cae, yo }
  function revisarPaletas(sky, duenio) {
    const otro = duenio ? [...escena.keys()].sort().find((pid) => pid !== duenio) : null;
    if (!duenio || !otro) { if (rally) { rally.el.remove(); cancelAnimationFrame(rally.raf); rally = null; } return; }
    if (rally && (rally.de === duenio || rally.a === duenio) && (rally.de === otro || rally.a === otro)) return;
    if (rally) rally.el.remove();
    const el = document.createElement('div');
    el.className = 'paleta-pelota'; el.innerHTML = '<i></i><b class="cuenta"></b>';
    sky.appendChild(el);
    rally = { el, n: 0, de: otro, a: duenio, t0: 0, dur: 900, cae: true, yo: false };
    const [x, y] = pies(duenio); el.style.transform = `translate(${x}px, ${y}px)`; rally.x = x; rally.y = y;
  }
  function tocarPaleta(x, y) {
    if (!rally) return false;
    const s = skyRect(), dx = x - s.left - rally.x, dy = y - s.top - rally.y;
    if (dx * dx + dy * dy > 40 * 40) return false;
    const k = rally.cae ? 1 : (Date.now() - rally.t0) / rally.dur;
    if (!rally.cae && k < 0.6) return true; // todavía lejos: no cuenta
    rally.yo = true;
    golpePaleta(rally.cae ? 1 : rally.n + 1, rally.a, rally.de, Date.now(), rally.cae ? 900 : Math.max(450, rally.dur * 0.96));
    S.enviarMar({ t: 'paleta', n: rally.n, de: rally.de, a: rally.a, t0: rally.t0, dur: rally.dur });
    return true;
  }
  function golpePaleta(n, de, a, t0, dur) {
    if (!rally || !escena.has(a) || !escena.has(de)) return;
    if (!rally.cae && n <= rally.n) return;
    Object.assign(rally, { n, de, a, t0, dur, cae: false });
    rally.el.querySelector('.cuenta').textContent = n > 1 ? n : '';
    INICIO.golpe();
    if (!rally.raf) rally.raf = requestAnimationFrame(volarPaleta);
  }
  function volarPaleta() {
    if (!rally) return;
    rally.raf = 0;
    const k = (Date.now() - rally.t0) / rally.dur, [x0, y0] = cabeza(rally.de), [x1, y1] = cabeza(rally.a);
    if (k < 1.12) {
      const u = Math.min(1, Math.max(0, k)), x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u - 26 * 4 * u * (1 - u) + 10;
      rally.x = x; rally.y = y; rally.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      rally.el.classList.toggle('justo', k >= 0.6);
      rally.raf = requestAnimationFrame(volarPaleta);
      return;
    }
    const n = rally.n;
    rally.cae = true; rally.el.classList.remove('justo');
    const [x, y] = pies(rally.a); rally.x = x; rally.y = y; rally.el.style.transform = `translate(${x}px, ${y}px)`;
    if (n > 1) {
      if (rally.yo) S.record('paletas.max', n);
      rally.el.querySelector('.cuenta').textContent = `${n} golpes · récord ${Math.max(S.maxDeTodos('paletas.max'), n)}`;
      setTimeout(() => { if (rally && rally.cae) rally.el.querySelector('.cuenta').textContent = ''; }, 3000);
    } else rally.el.querySelector('.cuenta').textContent = '';
    rally.n = 0; rally.yo = false;
  }

  // La banana inflable: la tira la moto de agua del que la tenga (la primera). Tocarla te sube (hasta 4, por 2 minutos);
  // tocarla de nuevo te baja.
  const bananeros = new Map(); // pid → hasta cuándo
  let bananaLider = null; // { x, y, izq } de la moto que la tira
  function revisarBanana(sky, duenio) {
    const hayMoto = [...escena.values()].some((p) => p.agua === 'moto');
    let el = sky.querySelector('.banana-mar');
    if (!duenio || !hayMoto) { if (el) el.remove(); bananaLider = null; return; }
    if (!el) { el = document.createElement('div'); el.className = 'lujo-mar banana-mar'; el.innerHTML = `<span class="cuerpo">${ARTE.item('banana')}</span>`; sky.appendChild(el); }
    const ahora = Date.now();
    bananeros.forEach((hasta, pid) => { if (hasta < ahora || !escena.has(pid)) bananeros.delete(pid); });
  }
  function tocarBanana(x, y) {
    const el = document.querySelector('#sky .banana-mar');
    if (!dentro(el, x, y, 10)) return false;
    const yo = yoEnElMar(), p = escena.get(yo);
    if (!p) return true;
    if (bananeros.has(yo)) { bananeros.delete(yo); S.enviarMar({ t: 'banana', si: 0 }); }
    else if (p.agua && p.agua !== 'banana') { toast('<span>Ya estás en el agua.</span>'); return true; }
    else if (bananeros.size >= 4) { toast('<span>🍌 La banana está llena (entran 4).</span>'); return true; }
    else { bananeros.set(yo, Date.now() + 120000); S.enviarMar({ t: 'banana', si: 1 }); S.contar('mar.banana'); }
    revisarAgua();
    return true;
  }
  function bananaDeOtro(pid, si) { if (si) bananeros.set(pid, Date.now() + 120000); else bananeros.delete(pid); revisarAgua(); }

  // ---------- el barco fantasma ----------
  // Con más de 5 mirando el mar aparece en el horizonte un barco fantasma todo roto, que va y viene despacio con una nube
  // negra atrás. Se oscurece todo, cada tanto hay relámpagos y truenos, y sopla viento. La música se pone tensa: acordes
  // menores, las notas pasan a la pentatónica menor (blues) y el colchón del dedo suena con distorsión, bajito.
  // Las personitas salen del agua y se paran derechitas, temblando, con un ❗ arriba; cada 2 segundos una (por turno) tira
  // un 😨, ☠️ o 🏴‍☠️ que dura 1 segundo. Tocar la tuya le hace tirar uno. El barco, la nube y los sustos salen de la hora:
  // en todos los celus se ven igual. Se va cuando quedan menos de 6 por unos segundos.
  // Es el Holandés Laburante, un boss: viene a llevarse las vacaciones de la colonia. Tiene una barra de vida y hay un
  // minuto para hundirlo a toques (ver "la pelea", más abajo). Hundido: premio para cada uno (una vez por día) y no vuelve
  // mientras esté mirando alguien que ya lo hundió hoy. Si se van antes, no se pierde nada. Con "reducir movimiento" en el
  // celu, sin destellos ni sacudones.
  const FANTASMA_MIN = 6, SUSTOS = ['😨', '☠️', '🏴‍☠️'];
  let echadoHoy = ''; // la fecha en que lo hundieron desde este celu (por si los datos de los demás tardan en llegar)
  const PERIODO_BARCO = 240000; // va y vuelve en 4 minutos
  const xBarco = (t) => 50 + 25 * Math.sin((2 * Math.PI * t) / PERIODO_BARCO); // sin salirse de la pantalla
  const vaDerecha = (t) => Math.cos((2 * Math.PI * t) / PERIODO_BARCO) > 0;
  // El giro, en las puntas (donde casi no se mueve): de costado pasa a de frente (mirando a la playa un rato) y después
  // de costado para el otro lado; siempre girando hacia quien mira. El de frente es angosto: 0,24 del ancho del de costado.
  const GIRO_BARCO = 12000, ANCHO_FRENTE = (239 / 640) / (640 / 417);
  function vistaBarco(t) {
    const p = (((t % PERIODO_BARCO) + PERIODO_BARCO) % PERIODO_BARCO) / PERIODO_BARCO;
    const k = (centro) => Math.min(1, Math.max(0, ((p - centro) * PERIODO_BARCO + GIRO_BARCO / 2) / GIRO_BARCO));
    if (Math.abs(p - 0.25) * PERIODO_BARCO < GIRO_BARCO / 2) return 2 * k(0.25); // a la derecha de todo: se da vuelta
    if (Math.abs(p - 0.75) * PERIODO_BARCO < GIRO_BARCO / 2) return 2 - 2 * k(0.75); // a la izquierda de todo
    return vaDerecha(t) ? 0 : 2;
  }
  let fantasma = null; // { desde, bajo (desde cuándo son menos), t (relámpagos), g (sustos) }
  // [centro x %, arriba %, ancho %, opacidad, espejada]
  const NUBES_FANTASMA = [[14, 2, 72, 0.5, 0], [80, 5, 66, 0.45, 1], [47, -2, 60, 0.36, 0], [-2, 24, 62, 0.42, 1], [100, 27, 68, 0.46, 0], [28, 37, 50, 0.3, 1], [74, 39, 46, 0.28, 0]];
  const deFantasma = (cls) => document.querySelector(`#sky .${cls}:not(.se-va)`);
  function revisarFantasma() {
    const mirando = !!document.getElementById('sky') && !!document.querySelector('.mirar-capa') && conPersona();
    if (!fantasma) {
      const hoy = SKY.arDate(), echado = echadoHoy === hoy || perdidoHoy === hoy || [...escena.keys()].some((pid) => S.hundioHoy(pid) || S.perdioHoy(pid));
      if (mirando && escena.size >= FANTASMA_MIN && !echado) llegaFantasma();
      return;
    }
    // una vez que arrancó la pelea sigue aunque queden menos de 6 (antes de arrancar, si se van, se va sin hacer nada)
    const enPelea = fantasma.inicio && Date.now() >= fantasma.inicio;
    if (mirando && (fantasma.hundido || fantasma.escapo || enPelea || escena.size >= FANTASMA_MIN)) { fantasma.bajo = 0; moverBarco(); if (!fantasma.hundido) marcarSustos(); return; }
    if (!mirando) { seVaFantasma(true); return; }
    if (!fantasma.bajo) fantasma.bajo = Date.now();
    if (Date.now() - fantasma.bajo > 6000) seVaFantasma(); else moverBarco();
  }
  function llegaFantasma() {
    const sky = document.getElementById('sky');
    fantasma = { desde: Date.now(), bajo: 0 };
    document.body.classList.add('fantasma');
    const poner = (cls, html = '') => { const el = document.createElement('div'); el.className = cls; el.innerHTML = html; sky.appendChild(el); return el; };
    poner('fantasma-oscuro');
    // más nubes negras por el cielo, más transparentes, que se mueven despacito (la que sigue al barco va adelante)
    poner('nubes-fantasma', NUBES_FANTASMA.map(([x, y, w, o, espejo], i) => `<img src="img/mar/nube-negra.webp?v=1" alt="" draggable="false" style="left:${x}%;top:${y}%;width:${w}%;--o:${o};--d:${38 + i * 7}s;animation-delay:-${i * 9}s${espejo ? ';--e:-1' : ''}">`).join(''));
    // las vistas para el giro: de costado (proa a la derecha), de frente, y de costado espejada (proa a la izquierda)
    poner('barco-fantasma', ['fantasma', 'fantasma-frente', 'fantasma'].map((v) => `<span class="vista"><img src="img/mar/${v}.webp?v=1" alt="" draggable="false"></span>`).join('')
      + '<i class="aro" aria-hidden="true"></i>');
    poner('rayo', '<svg viewBox="0 0 40 100" preserveAspectRatio="none" aria-hidden="true"><path d="M24 0L15 31L25 35L10 66L20 69L6 100"/><path class="rama" d="M18 47L30 58L27 70"/></svg>');
    poner('nube-negra', '<img src="img/mar/nube-negra.webp?v=1" alt="" draggable="false">');
    poner('relampago');
    poner('cielo-rojo'); poner('arena-negra');
    moverBarco(true);
    setTimeout(() => ['fantasma-oscuro', 'cielo-rojo', 'arena-negra', 'nubes-fantasma', 'barco-fantasma', 'nube-negra'].forEach((c) => { const el = deFantasma(c); if (el) el.classList.add('ve'); }), 60);
    escena.forEach((p) => { if (p.mia) asustar(p); });
    revisarAgua(); // salen del agua (con el barco fantasma nadie anda en moto ni surfea)
    marcarSustos();
    INICIO.fantasma(true);
    S.contar('mar.fantasmas');
    relampagos(true);
    fantasma.g = setTimeout(sustos, 1800);
    const capa = document.querySelector('.mirar-capa');
    if (capa) {
      const p = document.createElement('div');
      p.className = 'pista-mar pista-barco';
      p.innerHTML = '¡El <b>Holandés Laburante</b> viene a llevarse las vacaciones! Cuando arranque, toquen el barco todos, lo más rápido que puedan: tienen un minuto. Si se escapa, les roba.';
      capa.appendChild(p);
      setTimeout(() => p.classList.add('fuera'), 8000); setTimeout(() => p.remove(), 9500);
      const bb = document.createElement('div');
      bb.className = 'barra-boss';
      bb.innerHTML = '<div class="bb-fila"><b>El Holandés Laburante <span class="bb-nivel"></span></b><span class="bb-tiempo">1:00</span></div><div class="bb-vida"><i class="bb-golpe"></i><i class="bb-lleno"></i><span class="bb-num"></span></div><div class="bb-msg" aria-live="polite"></div>';
      capa.appendChild(bb);
    }
    armarPelea(fantasma);
  }
  function seVaFantasma(ya) {
    if (!fantasma) return;
    clearTimeout(fantasma.t); clearTimeout(fantasma.g); clearTimeout(fantasma.v); clearInterval(fantasma.reloj); (fantasma.dlg || []).forEach(clearTimeout);
    if (fantasma.escapo && !fantasma.hundido && !fantasma.robado) { const r = robar(fantasma); setTimeout(() => cartelRobo(r), 600); } // se fue del mar en medio del diálogo
    else if (ya && fantasma.inicio && Date.now() >= fantasma.inicio && !fantasma.hundido && !fantasma.escapo && !fantasma.robado) { // se fue en medio de la pelea: pierde él solo
      if (fantasma.mios) S.contar('mar.golpes', fantasma.mios);
      const r = robar(fantasma); setTimeout(() => cartelRobo(r, true), 600);
    }
    fantasma = null;
    document.querySelectorAll('.pista-barco, .barra-boss, .mareo-yo, .dialogo-barco').forEach((n) => n.remove());
    document.body.classList.remove('fantasma', 'relampaguea');
    INICIO.fantasma(false);
    document.querySelectorAll('#sky .fantasma-oscuro, #sky .cielo-rojo, #sky .arena-negra, #sky .nubes-fantasma, #sky .barco-fantasma, #sky .nube-negra, #sky .relampago, #sky .rayo').forEach((n) => {
      if (ya) { n.remove(); return; }
      n.classList.add('se-va'); n.classList.remove('ve');
      setTimeout(() => n.remove(), 4200);
    });
    document.querySelectorAll('#sky .personita').forEach((el) => { el.classList.remove('asustada', 'mareada'); el.querySelectorAll('.susto, .grito, .mareo, .blanco').forEach((s) => s.remove()); });
    if (!ya) revisarAgua();
  }
  // Tu personita (y las de prueba del modo demo): se levanta y se queda parada, mirando el mar.
  function asustar(p) {
    clearTimeout(p.fin); p.vaASentarse = false; p.ordenada = false; p.miraBase = '';
    if (p.sentada) sentar(p, false);
    mirarA(p, '', 0);
  }
  function marcarSustos() {
    escena.forEach((p) => {
      p.el.classList.add('asustada');
      if (!p.el.querySelector('.susto')) { const s = document.createElement('span'); s.className = 'susto'; s.textContent = '❗'; s.setAttribute('aria-hidden', 'true'); p.el.appendChild(s); }
    });
  }
  // El barco va y viene por el horizonte (mirando para donde va); la nube negra lo sigue, unos segundos atrás.
  function moverBarco(primera) {
    const b = deFantasma('barco-fantasma'), n = deFantasma('nube-negra'), r = deFantasma('rayo'), t = Date.now();
    if (!b) return;
    if (primera) [b, n].forEach((el) => el && (el.style.transition = 'none'));
    b.style.left = xBarco(t).toFixed(2) + '%';
    // f: 0 de costado hacia la derecha, 1 de frente, 2 de costado hacia la izquierda. El de costado se va angostando
    // (como si girara) hasta el ancho del de frente, y ahí se funden.
    const f = vistaBarco(t), [der, frente, izq] = b.querySelectorAll('.vista'), angosto = (k) => 1 - (1 - ANCHO_FRENTE) * suave(Math.min(1, Math.max(0, k)));
    const pone = (v, op, sx) => { v.style.opacity = Math.min(1, Math.max(0, op)).toFixed(2); v.style.transform = `translateX(-50%) scaleX(${sx.toFixed(3)})`; };
    pone(der, (1 - f) / 0.45, angosto(f));
    pone(frente, 1 - Math.abs(f - 1) / 0.45, 1);
    pone(izq, (f - 1) / 0.45, -angosto(2 - f));
    if (n) n.style.left = xBarco(t - 14000).toFixed(2) + '%';
    if (r && !r.classList.contains('cae')) r.style.left = (xBarco(t - 9000) + (vaDerecha(t) ? -4 : 4)).toFixed(2) + '%';
    if (primera) { void b.offsetWidth; [b, n].forEach((el) => el && (el.style.transition = '')); }
  }
  // Cada 2 segundos, por turno, una personita tira un susto (el mismo en todos los celus).
  function sustos() {
    if (!fantasma) return;
    const ahora = Date.now(), k = Math.floor(ahora / 2000);
    fantasma.g = setTimeout(sustos, 2000 - (ahora % 2000) + 15);
    const ids = [...escena.keys()].sort();
    if (ids.length) tirarSusto(escena.get(ids[k % ids.length]), SUSTOS[hash('susto' + k) % SUSTOS.length]);
  }
  function tirarSusto(p, e) {
    if (!p || !p.el.isConnected) return;
    p.el.querySelectorAll('.grito').forEach((g) => g.remove());
    const g = document.createElement('span');
    g.className = 'grito'; g.textContent = e; g.setAttribute('aria-hidden', 'true');
    p.el.appendChild(g);
    setTimeout(() => g.remove(), 1000);
  }
  // Relámpagos cada 7 a 16 segundos (el primero enseguida): la luz, a veces el rayo cerca del barco, y el trueno, que
  // llega antes cuanto más cerca cae. Con "reducir movimiento", solo el trueno.
  function relampagos(primero) {
    if (!fantasma) return;
    clearTimeout(fantasma.t);
    fantasma.t = setTimeout(() => { relampago(); relampagos(false); }, primero ? 2600 : 7000 + Math.random() * 9000);
  }
  function relampago() {
    const f = deFantasma('relampago'), r = deFantasma('rayo');
    if (!fantasma || !f) return;
    const cerca = Math.random() < 0.6;
    if (sinDestellos) { INICIO.trueno(0.6 + Math.random(), cerca ? 0.8 : 0.5); return; } // sin destellos: solo el trueno
    f.classList.remove('flash'); void f.offsetWidth; f.classList.add('flash');
    document.body.classList.add('relampaguea');
    setTimeout(() => document.body.classList.remove('relampaguea'), 650);
    if (cerca && r) {
      r.classList.remove('cae'); r.classList.toggle('espejo', Math.random() < 0.5); void r.offsetWidth; r.classList.add('cae');
      setTimeout(() => r.classList.remove('cae'), 700);
    }
    INICIO.trueno(cerca ? 0.12 + Math.random() * 0.25 : 0.9 + Math.random() * 1.2, cerca ? 1 : 0.55);
  }

  // ---------- el Holandés Laburante: la pelea ----------
  // A los pocos segundos de llegar empieza la pelea, que dura un minuto (la hora de arranque se redondea a 5 s y se
  // comparte: todos los celus se quedan con la más temprana). Tiene vida según el nivel por cada persona mirando (nivel 1
  // con 6: 1.008) y cada toque al barco le saca 1 (como mucho 9 por segundo por celu). Cada celu cuenta sus toques y manda su total cada
  // 0,3 s; la vida es la del arranque menos la suma de todos. Cada tantos segundos el barco le tira un cañonazo a alguien
  // de la playa (por turno, en el mismo orden en todos los celus): avisa un segundo y medio antes, y a quien le da queda mareado
  // (sus toques no cuentan). Si la vida llega a 0, se hunde. Si se termina el minuto, se escapa: el capitán y un esqueleto
  // discuten y a cada uno de los que estaban le roba 2 cosas del altarcito y 20 monedas. Ese día no vuelve. Una vez que
  // arrancó, la pelea sigue aunque queden menos de 6; quien se va en el medio pierde él solo (le roba igual) y los que
  // quedan siguen. Las mascotas ayudan: cada perro le muerde medio punto por segundo y cada gato atrasa medio segundo los
  // cañonazos (como mucho, un segundo y medio).
  // Cada vez que lo hunden vuelve un nivel más fuerte (el nivel es en cuántos días distintos lo hundieron): más vida por
  // persona, cañonazos más seguidos, mareos más largos y, desde el nivel 4, de a dos. Después del nivel 10 ya no sube. Con
  // 6 personas, cada una tiene que pegarle unas 3 veces por segundo en el nivel 1 y unas 5,5 en el nivel 10. El cielo se
  // pone más rojo y la arena más negra a medida que sube.
  const PELEA = 60000, PREVIA = 7000, AVISA_TIRO = 1600, TOQUE_MIN = 110, NIVEL_TOPE = 10;
  const reglas = (nv) => { const n = Math.min(nv, NIVEL_TOPE); return { vidaPor: 160 + 8 * n, cada: Math.max(9000, 15000 - 600 * n), mareo: Math.min(7000, 5000 + 250 * n), dobles: n >= 4 }; };
  const NIVEL_PRUEBA = PROTO && /[?&]nivel=\d+/.test(location.search) ? +location.search.match(/[?&]nivel=(\d+)/)[1] : null; // para probar
  let perdidoHoy = ''; // el día en que se escapó desde este celu (por si los datos de los demás tardan en llegar)
  const nombreMar = (pid) => (person(pid) || { n: pid }).n;
  const vidaDe = (f) => Math.max(0, f.vm - f.mios - Object.values(f.golpes).reduce((a, n) => a + n, 0) - mordidas(f));
  const mareado = (f, pid) => (f.mareados[pid] || 0) > Date.now();
  function fijarReglas(f, nv, perros, gatos) {
    f.nv = nv; f.perros = perros || 0; f.gatos = gatos || 0;
    f.rg = reglas(nv); f.rg.cada += Math.min(1500, 500 * f.gatos);
  }
  const mordidas = (f) => Math.floor((f.perros || 0) * 0.5 * Math.min(PELEA, Math.max(0, Date.now() - f.inicio)) / 1000);
  function armarPelea(f) {
    const nv = NIVEL_PRUEBA != null ? NIVEL_PRUEBA : S.nivelBarco();
    const ms = [...document.querySelectorAll('#sky .mascota-mar')].map((el) => D.MASCOTAS[el.dataset.m]);
    fijarReglas(f, nv, ms.filter((t) => t === 'perro').length, ms.filter((t) => t === 'gato').length);
    Object.assign(f, { inicio: Math.ceil((Date.now() + PREVIA) / 5000) * 5000, vm: f.rg.vidaPor * Math.max(FANTASMA_MIN, escena.size), golpes: {}, mios: 0, enviados: 0,
      ultimoEnvio: 0, ultimoToque: 0, ultimoSacudon: 0, ultimaPelea: 0, msgHasta: 0, mareados: {}, tiros: new Set(), prueba: {}, pulsoT: Date.now() });
    S.enviarMar({ t: 'pelea', pi: f.inicio, vm: f.vm, nv: f.nv, pe: f.perros, ga: f.gatos });
    f.reloj = setInterval(() => pulso(f), 150);
    pintarNivel(); pintarBarra();
  }
  // El nivel en la barra, y el cielo rojo y la arena negra según el nivel.
  function pintarNivel() {
    const f = fantasma;
    if (!f || f.nv == null) return;
    const k = Math.min(1, f.nv / 8), r = deFantasma('cielo-rojo'), a = deFantasma('arena-negra'), n = document.querySelector('.barra-boss .bb-nivel');
    if (r) r.style.setProperty('--o', (0.1 + 0.62 * k).toFixed(2));
    if (a) a.style.setProperty('--o', (0.08 + 0.58 * k).toFixed(2));
    if (n) n.textContent = `nivel ${f.nv}`;
  }
  // Otro celu arrancó la pelea antes (o con más gente): me pongo en su hora. Si el atrasado es el otro, le aviso la mía.
  function adoptarPelea(pi, vm, nv, pe, ga) {
    const f = fantasma;
    if (!f || !f.inicio || f.hundido || f.escapo || pi == null || Math.abs(pi - f.inicio) > 30000) return;
    if (pi < f.inicio || (pi === f.inicio && vm > f.vm)) {
      f.inicio = pi; if (vm) f.vm = vm;
      if (nv != null) { fijarReglas(f, nv, pe != null ? pe : f.perros, ga != null ? ga : f.gatos); pintarNivel(); }
      pintarBarra();
    } else if (pi > f.inicio && Date.now() - f.ultimaPelea > 1000) { f.ultimaPelea = Date.now(); S.enviarMar({ t: 'pelea', pi: f.inicio, vm: f.vm, nv: f.nv, pe: f.perros, ga: f.gatos }); }
  }
  function pulso(f) {
    if (fantasma !== f || f.hundido || f.escapo) return;
    const ahora = Date.now(), dt = ahora - f.pulsoT;
    f.pulsoT = ahora;
    if (f.mios !== f.enviados && ahora - f.ultimoEnvio >= 300) { f.enviados = f.mios; f.ultimoEnvio = ahora; S.enviarMar({ t: 'golpes', pi: f.inicio, vm: f.vm, n: f.mios }); }
    if (!f.arranco && ahora >= f.inicio) { f.arranco = true; avisoBarra('¡AHORA! ¡Toquen el barco!', 2400); INICIO.aviso(); }
    for (let k = 1; k * f.rg.cada < PELEA; k++) {
      const tt = f.inicio + k * f.rg.cada;
      if (!f.tiros.has(k) && ahora >= tt - AVISA_TIRO && ahora < tt + 2000) { f.tiros.add(k); apuntar(f, k, tt); }
    }
    if (!S.live) golpesDePrueba(f, ahora, dt);
    pintarBarra();
    if (vidaDe(f) <= 0) ganar(f);
    else if (ahora >= f.inicio + PELEA + 900) escaparse(f);
  }
  // En el modo demo, las personitas de prueba también le pegan: cada una a su ritmo (de 2,4 a 4,6 toques por segundo), y
  // cada tanto alguna se distrae unos segundos.
  function golpesDePrueba(f, ahora, dt) {
    if (ahora < f.inicio || ahora >= f.inicio + PELEA) return;
    escena.forEach((p) => {
      if (!p.falsa || mareado(f, p.pid) || hash(p.pid + Math.floor((ahora - f.inicio) / 6000)) % 5 === 0) return;
      f.prueba[p.pid] = (f.prueba[p.pid] || 0) + (2.4 + ((hash(p.pid) % 100) / 100) * 2.2) * dt / 1000;
      golpesDe(p.pid, f.inicio, f.vm, Math.floor(f.prueba[p.pid]));
    });
  }
  // Los golpes de otro (su total hasta ahora): chispitas de su color sobre su personita, como mucho dos veces por segundo.
  function golpesDe(pid, pi, vm, n) {
    const f = fantasma;
    if (!f || !f.inicio || f.hundido || pi == null || Math.abs(pi - f.inicio) > 30000 || pid === yoEnElMar()) return;
    adoptarPelea(pi, vm);
    if (!(n > (f.golpes[pid] || 0))) return;
    f.golpes[pid] = n;
    const p = escena.get(pid), ahora = Date.now();
    if (p && p.el.isConnected && ahora - (p.chispaGolpe || 0) > 450) { p.chispaGolpe = ahora; const r = p.el.getBoundingClientRect(); chispas(r.left + r.width / 2, r.top - 4, 4, coloresDe(pid)); }
    if (vidaDe(f) <= 0 && ahora < f.inicio + PELEA + 4000) ganar(f); // llegó tarde el último golpe: igual se hunde
  }
  function tocarBarco(x, y) {
    const f = fantasma, b = deFantasma('barco-fantasma');
    if (!f || !f.inicio || f.hundido || f.escapo || !b) return false;
    const r = b.getBoundingClientRect();
    if (x < r.left - 30 || x > r.right + 30 || y < r.top - 50 || y > r.bottom + 24) return false;
    const ahora = Date.now(), yo = yoEnElMar();
    if (ahora < f.inicio || ahora >= f.inicio + PELEA) return true; // todavía no empezó, o ya terminó
    if (mareado(f, yo)) { chispas(x, y, 3, ['#8a8499', '#c9c4d6']); return true; }
    if (ahora - f.ultimoToque < TOQUE_MIN) return true;
    f.ultimoToque = ahora; f.mios++;
    chispas(x, y, 6, coloresDe(yo));
    INICIO.golpe();
    if (!sinDestellos && ahora - f.ultimoSacudon > 450) { f.ultimoSacudon = ahora; b.classList.remove('golpe'); void b.offsetWidth; b.classList.add('golpe'); }
    pintarBarra();
    if (vidaDe(f) <= 0) ganar(f);
    return true;
  }
  // La barra de vida arriba: el nombre, el tiempo, la vida que queda (con una estela clara de lo que acaba de perder) y una
  // línea con lo que pasa. El barco se va inclinando a medida que pierde vida.
  function pintarBarra() {
    const f = fantasma, el = document.querySelector('.barra-boss'), b = deFantasma('barco-fantasma');
    if (!f || !f.inicio || !el) return;
    const ahora = Date.now(), v = vidaDe(f), k = v / f.vm, falta = Math.max(0, f.inicio + PELEA - ahora), antes = f.inicio - ahora;
    const s = antes > 0 ? PELEA / 1000 : Math.ceil(falta / 1000), ancho = (k * 100).toFixed(2) + '%';
    el.querySelector('.bb-lleno').style.width = ancho;
    el.querySelector('.bb-golpe').style.width = ancho;
    el.querySelector('.bb-num').textContent = `${v} / ${f.vm}`;
    el.querySelector('.bb-tiempo').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    el.classList.toggle('apurado', antes <= 0 && falta > 0 && falta <= 10000 && !f.hundido && !f.escapo);
    if (b) { b.classList.toggle('apunta', antes <= 0 && falta > 0 && !f.hundido && !f.escapo); b.classList.toggle('herido-1', k < 0.66); b.classList.toggle('herido-2', k < 0.33); }
    if (ahora < f.msgHasta || f.hundido || f.escapo) return;
    const msg = el.querySelector('.bb-msg');
    msg.classList.remove('fuerte');
    const ayudan = [f.perros && `${f.perros} ${f.perros === 1 ? 'perro' : 'perros'}`, f.gatos && `${f.gatos} ${f.gatos === 1 ? 'gato' : 'gatos'}`].filter(Boolean).join(' y ');
    msg.textContent = antes > 3000 ? `¡Prepárense!${ayudan ? ` Ayudan ${ayudan}.` : ''}` : antes > 0 ? `Empieza en ${Math.ceil(antes / 1000)}…` : mareado(f, yoEnElMar()) ? 'Mareado… 💫'
      : f.mios ? `Vos: ${f.mios} ${f.mios === 1 ? 'golpe' : 'golpes'}` : '¡Toquen el barco lo más rápido que puedan!';
  }
  function avisoBarra(txt, ms = 2200) {
    const f = fantasma, msg = document.querySelector('.barra-boss .bb-msg');
    if (!f || !msg) return;
    f.msgHasta = Date.now() + ms;
    msg.textContent = txt; msg.classList.add('fuerte');
  }
  // El barco apunta a quien le toca (el orden sale de la pelea: es el mismo en todos los celus), con un círculo rojo a sus
  // pies y el aviso, y un segundo y medio después tira.
  function apuntar(f, k, tt) {
    const ids = [...escena.keys()].sort((a, b) => hash(a + f.inicio) - hash(b + f.inicio));
    if (!ids.length) return;
    const n = f.rg.dobles && ids.length > 2 ? 2 : 1, blancos = Array.from({ length: n }, (_, j) => ids[((k - 1) * n + j) % ids.length]), yo = yoEnElMar();
    avisoBarra(blancos.includes(yo) ? '¡Te apunta a vos! 😱' : `¡Cuidado, ${blancos.map(nombreMar).join(' y ')}!`, AVISA_TIRO + 300);
    blancos.forEach((pid) => {
      const p = escena.get(pid);
      if (!p || !p.el.isConnected) return;
      const m = document.createElement('span'); m.className = 'blanco'; m.setAttribute('aria-hidden', 'true'); p.el.appendChild(m);
      setTimeout(() => m.remove(), Math.max(400, tt - Date.now() + 900));
    });
    INICIO.aviso();
    setTimeout(() => { if (fantasma === f && !f.hundido && !f.escapo) INICIO.canon(); blancos.forEach((pid) => dispararA(f, pid)); }, Math.max(0, tt - Date.now()));
  }
  // El cañonazo del barco: humo, una bala negra que vuela hasta la personita y le pega.
  function dispararA(f, pid) {
    if (fantasma !== f || f.hundido || f.escapo) return;
    const b = deFantasma('barco-fantasma'), p = escena.get(pid);
    if (!b || !p || !p.el.isConnected) { pegarA(f, pid); return; }
    const rb = b.getBoundingClientRect(), rp = p.el.getBoundingClientRect();
    const x0 = rb.left + rb.width / 2, y0 = rb.top + rb.height * 0.5, x1 = rp.left + rp.width / 2, y1 = rp.top + rp.height * 0.55;
    chispas(x0, y0, 10, ['#5b566b', '#8a8499', '#c9c4d6']);
    const bala = document.createElement('div');
    bala.className = 'bala-barco';
    document.body.appendChild(bala);
    bala.animate([
      { transform: `translate(${x0}px, ${y0}px) scale(.5)` },
      { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - innerHeight * 0.12}px) scale(.8)`, offset: 0.45 },
      { transform: `translate(${x1}px, ${y1}px) scale(1.1)` },
    ], { duration: 900, easing: 'cubic-bezier(.35,.1,.7,1)' }).onfinish = () => { bala.remove(); pegarA(f, pid); };
  }
  // Le dio: salta arena, la personita queda mareada (💫) y sus toques no cuentan por 5 segundos.
  function pegarA(f, pid) {
    if (fantasma !== f || f.hundido) return;
    f.mareados[pid] = Date.now() + f.rg.mareo;
    const p = escena.get(pid), yo = yoEnElMar();
    if (p && p.el.isConnected) {
      const r = p.el.getBoundingClientRect();
      chispas(r.left + r.width / 2, r.bottom - 3, 14, ['#e9d3a8', '#d9c3a2', '#fffaf0']);
      p.el.classList.add('mareada');
      const m = document.createElement('span'); m.className = 'mareo'; m.textContent = '💫'; m.setAttribute('aria-hidden', 'true'); p.el.appendChild(m);
      setTimeout(() => { p.el.classList.remove('mareada'); m.remove(); }, f.rg.mareo);
    }
    SONIDO.trtss();
    // con tiros dobles, un solo aviso con los dos nombres
    const ahora = Date.now();
    if (!f.leDio || ahora - f.leDio.t > 800) f.leDio = { t: ahora, n: [] };
    if (pid === yo) mareoPropio(f); else f.leDio.n.push(nombreMar(pid));
    if (f.leDio.n.length) avisoBarra(`¡Le dio a ${f.leDio.n.join(' y ')}! 💫`, 1800);
  }
  function mareoPropio(f) {
    const capa = document.querySelector('.mirar-capa'), hasta = f.mareados[yoEnElMar()];
    if (navigator.vibrate) navigator.vibrate([90, 60, 160]);
    if (!capa) return;
    capa.querySelectorAll('.mareo-yo').forEach((n) => n.remove());
    const el = document.createElement('div');
    el.className = 'mareo-yo';
    capa.appendChild(el);
    const pinta = () => {
      const s = Math.ceil((hasta - Date.now()) / 1000);
      if (s <= 0 || fantasma !== f || f.hundido || f.escapo) { el.remove(); return; }
      el.innerHTML = `💫 ¡Te dio un cañonazo!<b>${s}</b><span>tus toques no cuentan</span>`;
      setTimeout(pinta, 250);
    };
    pinta();
  }
  function ganar(f) {
    if (f.hundido) return;
    S.enviarMar({ t: 'hundido', pi: f.inicio });
    hundir();
  }
  // Se terminó el minuto y no lo hundieron: se ríe, el capitán y un esqueleto discuten (en cursiva) y, al final, a cada uno
  // de los que estaban le roba 2 cosas compradas del altarcito y 20 monedas (la experiencia no). Ese día no vuelve; al otro,
  // un nivel más fuerte. Si alguien lo hunde con un golpe que llega tarde, gana igual y no roba nada.
  const DIALOGO = [['capitan', 'Capitán', 'Tráiganme a los que estén más al pedo.'], ['esqueleto', 'Esqueleto', '¡Colonias a la vista!'],
    ['capitan', 'Capitán', 'No, no TAN al pedo.'], ['esqueleto', 'Esqueleto', 'Bueno, pero dejanos robarles un par de cosas.'], ['capitan', 'Capitán', 'Uff, qué hinchahuevos… dale, vá, vá.']];
  const LINEA = 2300;
  function escaparse(f) {
    if (f.escapo || f.hundido) return;
    f.escapo = true; clearInterval(f.reloj);
    perdidoHoy = SKY.arDate();
    const v = vidaDe(f), b = deFantasma('barco-fantasma');
    pintarBarra();
    avisoBarra(`¡Se escapó con las vacaciones! Le quedaban ${v}.`, 60000);
    document.querySelectorAll('.mareo-yo').forEach((n) => n.remove());
    if (b) {
      b.classList.remove('apunta');
      const risa = document.createElement('span');
      risa.className = 'risa-barco'; risa.textContent = '☠️'; risa.setAttribute('aria-hidden', 'true');
      b.appendChild(risa); setTimeout(() => risa.remove(), 1600);
    }
    INICIO.trueno(0.15, 0.8);
    if (f.mios) S.contar('mar.golpes', f.mios);
    const capa = document.querySelector('.mirar-capa'), caja = document.createElement('div');
    caja.className = 'dialogo-barco'; caja.setAttribute('aria-live', 'polite');
    if (capa) capa.appendChild(caja);
    f.dlg = DIALOGO.map(([cls, quien, txt], i) => setTimeout(() => {
      if (fantasma !== f || f.hundido) return;
      const l = document.createElement('p');
      l.className = cls; l.innerHTML = `<b>${quien}:</b> —${esc(txt)}`;
      caja.appendChild(l);
    }, 1500 + i * LINEA));
    f.v = setTimeout(() => {
      if (fantasma !== f || f.hundido) return;
      if ([...escena.keys()].some((pid) => S.hundioHoy(pid))) { f.escapo = false; hundir(); return; } // alguien lo hundió con un golpe que llegó tarde
      const robo = robar(f);
      seVaFantasma();
      setTimeout(() => cartelRobo(robo), 700);
    }, 1500 + DIALOGO.length * LINEA + 1400);
  }
  function robar(f) {
    if (f.robado) return null;
    f.robado = true;
    return S.robarBarco();
  }
  // Lo que se llevó: las dos cosas con su dibujo y las monedas.
  function cartelRobo(robo, seFue) {
    if (!robo) return;
    const cosas = robo.items.map((id) => { const it = shopItem(id); return `<div class="robado"><div class="robado-art">${ARTE.item(id, it.col)}</div><span class="small">${esc(it.n)}</span></div>`; }).join('');
    sheet(`<div class="hallazgo-hoja barco-robo"><div class="cumple-titulo">EL HOLANDÉS SE LLEVÓ…</div>
      ${robo.items.length ? `<div class="robados">${cosas}</div>` : '<p class="small" style="margin:0">No tenías cosas compradas en el altarcito: se conformó con las monedas.</p>'}
      ${robo.c ? `<div class="row" style="justify-content:center"><span class="chip" style="--c:var(--rose)">−${robo.c} <span class="coin"></span></span></div>` : ''}
      <p class="small muted" style="margin:0">La experiencia no se la llevó. Lo robado sigue contando para tus logros y, si querés, lo podés volver a comprar en el kiosco.</p>
      ${seFue ? '<p class="small" style="margin:0">Te fuiste en medio de la pelea: para el Holandés, perdiste vos.</p>' : ''}
      <p class="cumple-sub">${seFue ? 'Los que se quedaron siguen peleando.' : 'Mañana vuelve, con el mismo nivel.'}</p>
      <button class="btn" data-close>Uff, bueno</button></div>`);
    SONIDO.no();
  }
  // Se hunde: se inclina y se va abajo del agua, vuelve la música de siempre con una fanfarria, las personitas festejan,
  // la tormenta se va y cada uno cobra su premio.
  function hundir() {
    const f = fantasma, b = deFantasma('barco-fantasma');
    if (!f || f.hundido) return;
    if (f.escapo && f.robado) return; // ya se fue con lo robado
    f.hundido = true; f.escapo = false; clearTimeout(f.v); clearTimeout(f.t); clearTimeout(f.g); clearInterval(f.reloj); (f.dlg || []).forEach(clearTimeout);
    if (perdidoHoy === SKY.arDate()) perdidoHoy = '';
    echadoHoy = SKY.arDate();
    if (b) { b.classList.remove('apunta'); b.classList.add('se-hunde'); }
    document.querySelectorAll('.pista-barco, .mareo-yo, .dialogo-barco').forEach((n) => n.remove());
    pintarBarra(); avisoBarra('¡LO HUNDIERON! 🎉', 60000);
    if (f.mios) S.contar('mar.golpes', f.mios);
    INICIO.fanfarria();
    setTimeout(() => INICIO.fantasma(false), 600);
    document.querySelectorAll('#sky .personita').forEach((el) => { el.classList.remove('asustada'); el.querySelectorAll('.susto').forEach((x) => x.remove()); });
    escena.forEach((p) => setTimeout(() => { saludar(p); tirarSusto(p, ['🎉', '🥳', '🙌'][hash(p.pid) % 3]); }, 300 + Math.random() * 900));
    const premio = S.hundirBarco(f.nv || 0);
    setTimeout(() => seVaFantasma(), 3800);
    setTimeout(() => premioBarco(premio, f.mios, f.nv), 3400);
  }
  function premioBarco(premio, mios, nv) {
    const it = shopItem(D.BARCO.item);
    const cosas = premio
      ? `<div class="row" style="justify-content:center;gap:8px;flex-wrap:wrap"><span class="chip" style="--c:var(--butter)">+${premio.c} <span class="coin"></span></span><span class="chip" style="--c:var(--lav)">+${premio.s} sobre</span></div>
        ${premio.primero ? `<div class="barco-trofeo">${ARTE.item(D.BARCO.item)}</div><p class="small" style="margin:0">La <b>${esc(it.n)}</b> para tu altarcito, y una <b>misión secreta</b> nueva: la foto de todos los que estaban.</p>` : ''}`
      : '<p class="small muted" style="margin:0">Hoy ya cobraste el premio del barco. Mañana puede volver.</p>';
    sheet(`<div class="hallazgo-hoja barco-ganado"><div class="cumple-titulo">¡HUNDIERON AL HOLANDÉS LABURANTE!</div>
      <p class="cumple-sub">Las vacaciones están a salvo. Por hoy no vuelve; mañana viene en el nivel ${(nv || 0) + 1}.</p>${mios ? `<p class="small" style="margin:0">Vos le pegaste <b>${mios}</b> ${mios === 1 ? 'vez' : 'veces'}.</p>` : ''}${cosas}
      <button class="btn" data-close>¡Vamos!</button></div>`);
    if (premio) { SONIDO.monedas(premio.c); setTimeout(revisarLogros, 1200); }
  }

  // ---------- a solas: delfines y la cola de sirena ----------
  // Si estás mirando el mar sin nadie más: cada 25 segundos salta un delfín en algún lugar del mar, y en algún momento al
  // azar (una vez por visita) asoma una cola de sirena: está 5 segundos, brilla y se va. Si la tocás a tiempo, 250 monedas
  // (una vez por día; si ya la atrapaste hoy, no aparece).
  let solo = null; // { d: reloj de los delfines, s: el de la sirena }
  const DELFIN_CADA = 25000, SIRENA_DURA = 5000;
  function revisarSolo() {
    const aSolas = !!document.querySelector('.mirar-capa') && conPersona() && escena.size === 1 && !fantasma;
    if (aSolas && !solo) {
      solo = { d: setInterval(delfin, DELFIN_CADA) };
      if (!S.sirenaHoy()) solo.s = setTimeout(sirena, 20000 + Math.random() * 100000);
    } else if (!aSolas && solo) terminaSolo();
  }
  function terminaSolo() {
    if (!solo) return;
    clearInterval(solo.d); clearTimeout(solo.s); solo = null;
  }
  // Dónde queda en la pantalla un punto del cielo (en %).
  const enPantalla = (x, y) => { const r = document.getElementById('sky').getBoundingClientRect(); return [r.left + (r.width * x) / 100, r.top + (r.height * y) / 100]; };
  function delfin() {
    const sky = document.getElementById('sky');
    if (!sky || !document.querySelector('.mirar-capa')) return;
    const izq = Math.random() < 0.5, x = 18 + Math.random() * 64, y = 59.5 + Math.random() * 5, w = 40 + (y - 59.5) * 4;
    const el = document.createElement('div');
    el.className = 'delfin-mar' + (izq ? ' izq' : '');
    el.style.cssText = `left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;width:${w.toFixed(0)}px;z-index:${capaY(y)}`;
    el.innerHTML = `<span class="recorte">${ARTE.item('delfin')}</span>`;
    sky.appendChild(el);
    const salpica = (dx) => { const [px, py] = enPantalla(x, y); chispas(px + (izq ? -dx : dx) * w, py, 9, ['#ffffff', '#c9ecfa', '#a9d6f0']); };
    setTimeout(() => salpica(-0.45), 250); setTimeout(() => { salpica(0.5); SONIDO.chap(0.25); }, 1750);
    setTimeout(() => el.remove(), 2300);
    S.contar('mar.delfines');
  }
  function sirena() {
    const sky = document.getElementById('sky');
    if (!solo || !sky || S.sirenaHoy()) return;
    const x = 20 + Math.random() * 60, y = 60.5 + Math.random() * 4, w = 24 + (y - 60.5) * 2;
    const el = document.createElement('div');
    el.className = 'cola-sirena';
    el.style.cssText = `left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;width:${w.toFixed(0)}px;z-index:${capaY(y)}`;
    el.innerHTML = `<span class="recorte">${ARTE.item('sirena')}</span><i class="destello" aria-hidden="true">✨</i>`;
    el.dataset.hasta = Date.now() + SIRENA_DURA;
    sky.appendChild(el);
    setTimeout(() => el.classList.add('brilla'), 1400);
    setTimeout(() => { if (!el.classList.contains('atrapada')) el.remove(); }, SIRENA_DURA + 200);
  }
  function tocarSirena(x, y) {
    const el = document.querySelector('#sky .cola-sirena:not(.atrapada)');
    if (!el || Date.now() > +el.dataset.hasta) return false;
    const r = el.getBoundingClientRect();
    if (x < r.left - 30 || x > r.right + 30 || y < r.top - 30 || y > r.bottom + 24) return false;
    el.classList.add('atrapada');
    chispas(r.left + r.width / 2, r.top + r.height / 2, 24, ['#ffe39a', '#fff2c8', '#f9d27a', '#ffffff']);
    const c = S.atraparSirena();
    if (c) { SONIDO.monedas(c); toast(`<span style="font-size:1.6rem">🧜‍♀️</span><span>¡Atrapaste la cola de sirena! <b>+${c}</b> monedas.</span>`, 4500); }
    setTimeout(() => el.remove(), 900);
    return true;
  }

  if (PROTO) window.__personitas = { PERSONITAS, personitaSVG, paletaPersonita }; // para armar muestras en el modo demo
  if (PROTO) window.__prueba = { capsulaHTML, escribirCapsula, leerCapsula, horaHTML, abrirPremios, ganadoresPremios, verWrapped };
  if (PROTO) window.__mar = { delfin, sirena: () => { if (!solo) solo = { d: 0 }; sirena(); }, escapar: () => fantasma && fantasma.inicio && escaparse(fantasma), barco: () => fantasma && { inicio: fantasma.inicio, nv: fantasma.nv, perros: fantasma.perros, gatos: fantasma.gatos, vm: fantasma.vm, vida: vidaDe(fantasma), mios: fantasma.mios, hundido: !!fantasma.hundido, escapo: !!fantasma.escapo } }; // para probar en el modo demo

  // A quien le desaprueban una foto (o la recupera) le llega el aviso con lo que perdió o volvió.
  function avisarDesaprobadas(cambios) {
    cambios.slice(0, 3).forEach((c, i) => setTimeout(() => {
      const t = esc(tituloFoto(c.mid, S.me)), cuanto = `${c.xp} XP${c.c ? ` y ${c.c} monedas` : ''}`;
      toast(c.mala ? `<span style="font-size:1.6rem">❌</span><span>Tu foto <b>${t}</b> quedó desaprobada: ${S.cruces} cruces rojas. Perdiste ${cuanto}. Cambiala para recuperarlos.</span>`
        : `<span style="font-size:1.6rem">✅</span><span>Tu foto <b>${t}</b> volvió a valer. Recuperaste ${cuanto}.</span>`, 6000);
    }, i * 1200));
    if (cambios.length) { SONIDO[cambios[0].mala ? 'no' : 'si'](); setTimeout(render, 300); }
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

  // Cambios de los demás en vivo: la pantalla ya no se vuelve a dibujar sola (con cada cosa que hacía cualquiera se movía
  // el scroll); se ven al deslizar hacia abajo estando arriba de todo, o al cambiar de sección.
  S.onChange((ev) => {
    if (ev && ev.llego) return avisarLlegada(ev.llego);
    if (ev && ev.mar) return recibirMar(ev.mar);
    if (ev && ev.desap) avisarDesaprobadas(ev.desap);
    if (ev && ev.presencia) { const el = $('#enLinea'); if (el) el.outerHTML = enLineaHTML(); armarEscena(); return; }
    if (ev && ev.gift) setTimeout(mostrarRegalos, 300);
    if (ev && ev.uploadFailed) toast('<span>No se pudo subir la foto. Queda guardada y se reintenta cuando haya señal.</span>', 4500);
    avisarBocinas();
    pendiente = true;
    avisarReacciones();
  });

  // Deslizar hacia abajo estando arriba de todo: trae lo nuevo de la base y vuelve a dibujar la pantalla (como casi todas
  // las apps). No en la portada, ni con una hoja abierta, ni arrastrando algo en el altarcito.
  // Modo liviano: unos segundos después de abrir se mide cuántos cuadros por segundo dibuja el celu. Si no llega a 30, se
  // apagan los efectos más pesados (el filtro de crayón, que se recalcula con cada movimiento, y nubes de más con el barco
  // fantasma) y queda guardado para la próxima.
  (function medirCelu() {
    const LIV = 'colonia.liviano';
    try { if (localStorage.getItem(LIV) === '1') document.documentElement.classList.add('liviano'); } catch (e) { /* nada */ }
    setTimeout(() => {
      if (document.hidden) return;
      let n = 0, peor = 0, ant = 0;
      const t0 = performance.now();
      const cuadro = (t) => {
        n++; if (ant) peor = Math.max(peor, t - ant); ant = t;
        if (t - t0 < 4000) { requestAnimationFrame(cuadro); return; }
        if (peor > 1500 || document.hidden) return; // se fue a otra app en el medio: no vale
        const fps = Math.round((n * 1000) / (t - t0));
        try { localStorage.setItem('colonia.fps', String(fps)); if (fps < 30) localStorage.setItem(LIV, '1'); } catch (e) { /* nada */ }
        if (fps < 30) document.documentElement.classList.add('liviano');
      };
      requestAnimationFrame(cuadro);
    }, 5000);
  })();

  (function deslizarParaActualizar() {
    const UMBRAL = 74;
    let y0 = null, dy = 0, cargando = false;
    const ind = document.createElement('div');
    ind.className = 'ptr'; ind.setAttribute('aria-hidden', 'true');
    ind.innerHTML = '<svg viewBox="0 0 24 24"><path class="flecha" d="M12 5v13M6.5 12.5 12 18l5.5-5.5"/><circle class="giro" cx="12" cy="12" r="7.5"/></svg>';
    document.body.appendChild(ind);
    const svg = ind.firstChild;
    const puede = (e) => {
      const r = location.hash.slice(1) || 'portada';
      return !cargando && scrollY <= 0 && e.touches.length === 1 && S.me && r !== 'portada' && r !== 'quien' && !dragging
        && !document.querySelector('.sheet-bg') && !document.body.classList.contains('mirando') && !(e.target.closest && e.target.closest('.altar, input, textarea, select'));
    };
    function mostrar(d) {
      const k = Math.min(1, d / UMBRAL);
      ind.style.transform = `translate(-50%, ${(Math.min(d * 0.55, 70) - 48).toFixed(1)}px)`;
      ind.style.opacity = d > 8 ? Math.min(1, k * 1.5).toFixed(2) : '0';
      svg.style.transform = `rotate(${k >= 1 ? 180 : Math.round(k * 150)}deg)`;
      ind.classList.toggle('listo', k >= 1);
    }
    addEventListener('touchstart', (e) => { y0 = puede(e) ? e.touches[0].clientY : null; dy = 0; }, { passive: true });
    addEventListener('touchmove', (e) => {
      if (y0 == null) return;
      if (scrollY > 2) { y0 = null; mostrar(0); return; }
      dy = Math.max(0, e.touches[0].clientY - y0);
      mostrar(dy);
    }, { passive: true });
    const soltar = async () => {
      if (y0 == null) return;
      y0 = null;
      if (dy < UMBRAL) { mostrar(0); return; }
      cargando = true;
      ind.classList.add('cargando'); ind.style.transform = 'translate(-50%, 14px)'; ind.style.opacity = '1'; svg.style.transform = '';
      try { await Promise.race([S.refrescar(), new Promise((ok) => setTimeout(ok, 6000))]); } catch (e) { /* sin señal: se dibuja con lo que hay */ }
      if (!document.querySelector('.sheet-bg')) render();
      ind.classList.remove('cargando', 'listo'); mostrar(0);
      cargando = false;
    };
    addEventListener('touchend', soltar, { passive: true });
    addEventListener('touchcancel', () => { y0 = null; mostrar(0); }, { passive: true });
  })();

  SKY.start();
  render();
  S.ready.then(() => { render(); avisarBocinas(); if (S.me) { setTimeout(welcome, 400); S.contar('app.aperturas'); } });
  // Para el wrapped: cuántas veces abrís la app (volver después de media hora cuenta como otra) y cuánto tiempo la tenés a la vista.
  // Si la cerrás mirando el mar, ese rato también cuenta como mirar el mar.
  let vistaDesde = Date.now(), ocultaDesde = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      ocultaDesde = Date.now();
      S.contar('app.seg', Math.round((ocultaDesde - vistaDesde) / 1000));
      if (marDesde) { const seg = Math.round((ocultaDesde - marDesde) / 1000); S.contar('mar.seg', seg); S.record('mar.max', seg); marDesde = 0; }
    } else {
      if (ocultaDesde && Date.now() - ocultaDesde > 30 * 6e4) S.contar('app.aperturas');
      vistaDesde = Date.now();
      if (document.body.classList.contains('mirando')) marDesde = Date.now();
    }
  });
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
