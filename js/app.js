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
    foto: '<svg viewBox="0 0 24 24"><rect x="4" y="2.5" width="16" height="19" rx="1.5"/><rect x="7" y="5.5" width="10" height="10" rx=".5"/></svg>',
    camara: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l1.6-2.4h6.8L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.6"/></svg>',
  };
  const TABS = [['hoy', 'Hoy'], ['misiones', 'Misiones'], ['album', 'Álbum'], ['altar', 'Altarcito'], ['foto', 'La foto']];

  // ---------- la foto del 8/12 ----------
  const fotoProgress = () => fotoOverride ?? Math.min(1, S.groupXp() / D.FOTO.goal);
  function fotoState() {
    const prog = fotoProgress();
    const pieces = new Set(D.FOTO.pieces.filter((p) => prog >= p.at - 1e-9).map((p) => p.id));
    const all = SKY.arDate() >= D.FOTO.dia;
    const people = new Set(D.PEOPLE.filter((p) => all || S.levelOf(S.xpOf(p.id)) >= D.FOTO.nivel).map((p) => p.id));
    return { prog, pieces, people };
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
      const t = g = { tipo: 'toque', el, pointer: e.pointerId, sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY };
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
      if (t.el) { SONIDO.si(); itemSheet(pid, t.el, editable); return; }
      const now = performance.now(), [x, y] = aLocal(e.clientX, e.clientY);
      if (now - tapT < 320 && Math.hypot(x - tapX, y - tapY) < 34) { tapT = 0; zoomEn(v.z > 1.01 ? 1 : 2, x, y, true); }
      else { tapT = now; tapX = x; tapY = y; }
    };
    altar.addEventListener('pointerup', fin);
    altar.addEventListener('pointercancel', fin);
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
  function itemSheet(pid, el, editable) {
    const k = el.dataset.k, id = el.dataset.id, it = shopItem(id);
    const a = S.altar(pid);
    const inst = a.items.concat(a.refugio ? [a.refugio] : []).find((x) => x.k === k) || {};
    const cur = colorOf(inst.id ? inst : { id }, a.place[k]);
    const mine = pid === S.me;
    const from = inst.from ? `${mine ? 'Te lo regaló' : 'Se lo regaló'} ${esc(person(inst.from).n)} ♡` : '';
    const note = [it.sub ? esc(it.sub) : '', from].filter(Boolean).join(' · ');
    sheet(`<div style="display:grid;gap:12px;justify-items:center;text-align:center">
      <div class="art-big" id="big">${ARTE.item(id, cur)}</div><h2>${esc(it.n)}</h2>
      ${note ? `<p class="muted" style="margin:-6px 0 0">${note}</p>` : ''}
      ${it.d ? `<p class="desc">${esc(it.d)}</p>` : ''}
      ${editable && it.col ? `<div class="swatches">${D.COLORS.map((c) => `<button data-c="${c}" class="${c === cur ? 'on' : ''}" style="--c:${c}" aria-label="Pintar"></button>`).join('')}</div>` : ''}
      <div class="row" style="justify-content:center">${editable && it.side !== 'R' ? '<button class="btn ghost" id="bag">Guardar en la bolsa</button>' : ''}<button class="btn" data-close>Listo</button></div></div>`,
    (bg) => {
      bg.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => {
        S.setPlace(k, { c: b.dataset.c });
        bg.querySelectorAll('[data-c]').forEach((x) => x.classList.toggle('on', x === b));
        bg.querySelector('#big').innerHTML = ARTE.item(id, b.dataset.c);
        el.innerHTML = ARTE.item(id, b.dataset.c);
      }));
      const bag = bg.querySelector('#bag');
      if (bag) bag.addEventListener('click', () => { S.setPlace(k, { off: 1 }); bg.remove(); render(); });
    });
  }
  function visit(pid) {
    if (pid === S.me) { go('altar'); return; }
    const bg = sheet(`<div style="display:grid;gap:12px"><div class="spread"><h2>El altarcito de ${esc(person(pid).n)}</h2>
        <button class="ver-carta" id="suCarta" aria-label="Ver la tarjeta de ${esc(person(pid).n)}"><img class="face" src="${face(pid)}" alt=""><span class="small">Tarjeta</span></button></div>
      ${altarHTML(pid, false)}<button class="btn ghost" data-close>Volver</button></div>`);
    bindAltar(bg.querySelector('.altar'), false);
    bg.querySelector('#suCarta').addEventListener('click', () => { bg.remove(); carta(pid); });
  }
  // ---------- helpers de juego ----------
  function daily() {
    const d = SKY.arDate();
    const trip = D.DAILY_TRIP[d];
    return { id: 'dia-' + d, s: 'dia', t: trip || D.DAILY_POOL[hash(d) % D.DAILY_POOL.length], xp: trip ? 40 : 20 };
  }
  const secret = () => ({ id: 'secreta', s: 'secreta', t: D.SECRETS[hash(S.me || 'x') % D.SECRETS.length], xp: 60 });
  const vestigioUrl = (pid, mid) => S.artUrl(`vestigios/${pid}-${mid}.jpg?v=1`);
  function misionDe(mid) {
    if (!mid.startsWith('dia-')) return (D.MISSIONS.find((m) => m.id === mid) || { t: 'Una misión' }).t;
    const d = mid.slice(4);
    return D.DAILY_TRIP[d] || D.DAILY_POOL[hash(d) % D.DAILY_POOL.length];
  }
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
      ${res.levelUp != null ? `<p><b>Subiste de nivel:</b> ahora sos ${esc(D.LEVELS[res.levelUp].n)}.</p>` : ''}
      ${serie ? `<p><b>Serie completa:</b> ${esc(D.SERIES.find((x) => x.id === serie.serie).n)}. +${D.ACH.serie.c} monedas y medallita.</p>` : ''}
      <p class="muted small">Esto también suma a la foto de todos.</p>
      <button class="btn" data-close>Seguir</button></div>`);
    render();
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
        <button class="sonido" id="sonido" data-mudo aria-label="Música del inicio"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="6.500" cy="18" r="2.500"/><circle cx="16.500" cy="16" r="2.500"/><path class="tacha" d="M3 3l18 18"/></svg></button>
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
      const d = daily(), L = level(S.xp), c = countdown(), fst = fotoState(), me = person(S.me);
      const sec = secret();
      screen.innerHTML = `${top()}
        <div class="card"><div class="spread"><div class="eyebrow">Misión del día</div><span class="chip">${c.big} ${esc(c.small)}</span></div>
          <div class="list">${mRow(d, 'Subí la foto y queda hecha')}</div></div>
        <div class="card"><div class="spread"><div class="eyebrow">Tu libreta</div><span class="small muted">racha: ${S.streak()} ${S.streak() === 1 ? 'día' : 'días'}</span></div>
          <div class="spread"><b style="font-family:var(--display)">${esc(L.n)}</b><span class="small muted">${S.xp} XP${L.next ? ' · faltan ' + (L.next.xp - S.xp) : ''}</span></div>
          <div class="bar"><i style="width:calc(${Math.round(L.pct * 100)}% - 4px)"></i></div></div>
        <a href="#foto" class="card" style="color:inherit;text-decoration:none"><div class="spread"><div class="eyebrow">La foto del 8/12</div><b>${Math.round(fst.prog * 100)}%</b></div>${fotoHTML(fst, true)}
          <span class="small muted">Se arma con lo que hacemos entre todos.</span></a>
        <div class="card dark"><div class="eyebrow">Tu misión secreta</div>
          ${S.secretSeen() ? `<div class="list">${mRow(sec, 'No se la muestres a nadie')}</div>` : `<div class="secret-cover"><span class="muted">Solo vos podés verla.${me.trip ? '' : ' Vale desde donde estés.'}</span><button class="btn" id="seeSecret" style="--c:var(--lav)">Ver mi misión secreta</button></div>`}</div>
        <a class="btn a-playa" href="#portada" style="--c:var(--celeste)">Ir a mirar el mar</a>`;
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
      const tarjetas = [S.me, ...D.PEOPLE.map((p) => p.id).filter((id) => id !== S.me)].map((id) => {
        const c = (CARTAS && CARTAS[id]) || {}, n = esc(person(id).n);
        return `<button class="mini-carta${c.foil ? ' foil' : ''}" data-carta="${id}" style="--el:${ELEMENTO[c.e] || 'var(--butter)'}" aria-label="Ver la tarjeta de ${n}"><img src="${face(id)}" alt=""><b>${n}</b></button>`;
      }).join('');
      screen.innerHTML = `${top()}<h1 class="on-sky" style="font-size:1.7rem">Álbum</h1>
        <div class="card"><div><h2>Tarjetas de la colonia</h2><span class="small muted">Tocá a alguien para ver la suya.</span></div><div class="tarjetas">${tarjetas}</div></div>
        <p class="on-sky-soft" style="margin:0">Tus figuritas. Tocá una para ver las de todos.</p>${series}
        <div class="card"><div><h2>Vestigios de la beta</h2><span class="small muted">Las primeras fotos de la colonia, de cuando la app todavía se estaba armando.</span></div>
          <div class="vestigios">${D.VESTIGIOS.map(([pid, mid], i) => `<button class="vest" data-vest="${i}" aria-label="Foto de ${esc(person(pid).n)}"><img src="${vestigioUrl(pid, mid)}" alt="" loading="lazy"><span class="small">${esc(person(pid).n)}</span></button>`).join('')}</div></div>
        ${DEMO ? '<p class="proto">Modo demo: las fotos de los demás son de ejemplo.</p>' : ''}`;
      screen.querySelectorAll('[data-vest]').forEach((b) => b.addEventListener('click', () => {
        const [pid, mid, fecha] = D.VESTIGIOS[+b.dataset.vest];
        sheet(`<div style="display:grid;gap:12px;justify-items:center;text-align:center">
          <div class="polaroid"><img src="${vestigioUrl(pid, mid)}" alt=""></div>
          <h2>${esc(misionDe(mid))}</h2><p class="small muted" style="margin:0">De ${esc(person(pid).n)}, el ${fecha}, en plena beta.</p>
          <button class="btn" data-close>Listo</button></div>`);
      }));
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
          <div class="row" style="justify-content:flex-end">${S.photo(id) ? '' : `<button class="btn" id="go" style="--c:var(--mint)">Subir la mía</button>`}<button class="btn ghost" data-close>${S.photo(id) ? 'Cerrar' : NAH}</button></div></div>`,
        (bg) => { const g = bg.querySelector('#go'); if (g) g.addEventListener('click', () => { bg.remove(); askPhoto(m); }); });
      }));
    },

    altar() {
      screen.innerHTML = `${top()}
        <div class="spread"><h1 class="on-sky" style="font-size:1.7rem">Tu altarcito playero</h1><a class="btn" href="#kiosco" style="--c:var(--butter);text-decoration:none">Kiosco</a></div>
        <div class="card">${altarHTML(S.me, true)}
          <p class="small muted" style="margin:0">Mantené apretada una cosa para moverla. Tocala para verla, pintarla o guardarla. Con dos dedos te acercás.</p>${bolsaHTML()}</div>
        <div class="card"><div class="eyebrow">Altarcitos de la colonia</div>
          <div class="faces visit">${D.PEOPLE.filter((p) => p.id !== S.me).map((p) => `<button class="pick" data-v="${p.id}"><img class="face" src="${face(p.id)}" alt=""><span class="small">${esc(p.n)}</span></button>`).join('')}</div></div>`;
      bindAltar(screen.querySelector('.altar'), true);
      screen.querySelectorAll('[data-out]').forEach((b) => b.addEventListener('click', () => {
        S.setPlace(b.dataset.out, { off: 0 });
        fresh.add(b.dataset.out);
        render();
      }));
      screen.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => visit(b.dataset.v)));
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
      screen.innerHTML = `${top()}
        <div class="spread"><h1 class="on-sky" style="font-size:1.7rem">Kiosco</h1><a class="btn ghost" href="#altar" style="text-decoration:none">Volver al altarcito</a></div>
        <p class="on-sky-soft" style="margin:0">Todo lo que comprás va a tu altarcito playero. Tocá tus monedas para ver cómo juntar más.</p>
        ${bloque('De fondo', 'Va atrás de todo. Si tenés la carpa, la sombrilla ya no hace falta.', (x) => x.side === 'R' || x.z === 'fondo')}
        ${bloque('En el mar', 'Flotan o saltan en el agua, detrás de la arena.', (x) => x.z === 'mar')}
        ${bloque('En la arena', '', (x) => x.side !== 'R' && !x.z)}`;
      screen.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => {
        const it = shopItem(b.dataset.i);
        if (it.lv > S.level() + 1) return toast(`<span>${esc(it.n)} se desbloquea en el nivel ${it.lv}.</span>`);
        const can = S.coins >= it.p, mineBlocked = blockedFor(it, S.me);
        const others = D.PEOPLE.filter((p) => p.id !== S.me && !blockedFor(it, p.id));
        sheet(`<div style="display:grid;gap:12px;justify-items:center;text-align:center">
          <div class="art-big">${ARTE.item(it.id, it.col)}</div><h2>${esc(it.n)}</h2>
          ${it.sub ? `<p class="muted" style="margin:-6px 0 0">${esc(it.sub)}</p>` : ''}
          ${it.d ? `<p class="desc">${esc(it.d)}</p>` : ''}
          <span class="chip" style="--c:var(--butter)">${it.p} <span class="coin"></span></span>
          ${mineBlocked ? `<p class="small muted" style="margin:0">Ya tenés ${it.id === 'carpa' ? 'la carpa' : 'tu refugio'}. Se lo podés regalar a alguien.</p>` : ''}
          ${can ? `<div class="row" style="justify-content:center">${mineBlocked ? '' : '<button class="btn" id="forMe" data-mudo style="--c:var(--mint)">Para mí</button>'}<button class="btn" id="gift" style="--c:var(--rose)">Regalar</button></div>
            <div id="giftTo" hidden><p class="small muted" style="margin:0 0 8px">¿A quién?</p><div class="faces" style="grid-template-columns:repeat(4,1fr)">${others.map((p) => `<button class="pick" data-to="${p.id}" data-mudo><img class="face" src="${face(p.id)}" alt="" style="width:52px;height:52px"><span class="small">${esc(p.n)}</span></button>`).join('')}</div></div>`
            : `<p class="muted" style="margin:0">Te faltan ${it.p - S.coins} monedas.</p>`}
          <button class="btn ghost" data-close>${NAH}</button></div>`,
        (bg) => {
          const done = (to) => {
            const k = S.buy(it, to);
            if (!k) return;
            SONIDO.monedas(it.p, -1);
            bg.remove();
            if (to) { toast(`<span class="mini">${ARTE.item(it.id, it.col)}</span><span>Le regalaste ${esc(it.n.toLowerCase())} a ${esc(person(to).n)}. Ya está en su altarcito.</span>`); render(); return; }
            if (typeof k === 'string') fresh.add(k);
            go('altar');
          };
          const fm = bg.querySelector('#forMe'); if (fm) fm.addEventListener('click', () => done(null));
          const gf = bg.querySelector('#gift'); if (gf) gf.addEventListener('click', () => { bg.querySelector('#giftTo').hidden = false; });
          bg.querySelectorAll('[data-to]').forEach((x) => x.addEventListener('click', () => done(x.dataset.to)));
        });
      }));
    },

    foto() {
      const st = fotoState();
      const n = D.FOTO.pieces.filter((p) => st.pieces.has(p.id)).length;
      const hitos = D.FOTO.hitos.map((h) => `<div class="hito${st.prog >= h.at ? ' done' : ''}"><span class="dot">${st.prog >= h.at ? '✓' : h.fecha.length < 6 ? h.fecha : '★'}</span>
        <span><b>${esc(h.t)}</b> · ${esc(h.d)}<br><span class="small muted">${st.prog >= h.at ? 'Desbloqueado' : 'Se desbloquea con la foto al ' + Math.round(h.at * 100) + '%'}</span></span></div>`).join('');
      const people = D.PEOPLE.map((p) => `<button class="mate" data-v="${p.id}"><img class="face" src="${face(p.id)}" alt=""${st.people.has(p.id) ? '' : ' style="filter:grayscale(.6);opacity:.75"'}>
        <span><b>${esc(p.n)}</b><br><span class="small muted">${st.people.has(p.id) ? 'En la foto' : 'Aparece en nivel ' + (D.FOTO.nivel + 1)}${p.trip ? '' : ' · a distancia'}</span></span></button>`).join('');
      screen.innerHTML = `${top()}<h1 class="on-sky" style="font-size:1.7rem">La foto</h1>
        <p class="on-sky-soft" style="margin:0">La del 8/12, antes de volver a La Plata. Cada figurita de cualquiera suma, y cada uno aparece cuando llega al nivel ${D.FOTO.nivel + 1}.</p>
        <div class="card"><div class="spread"><b style="font-family:var(--display);font-size:1.4rem">${Math.round(st.prog * 100)}%</b><span class="small muted">${n} de ${D.FOTO.pieces.length} partes</span></div>
          ${fotoHTML(st)}
          <div class="row small">${D.FOTO.pieces.map((p) => `<span class="chip" style="--c:${st.pieces.has(p.id) ? 'var(--mint)' : 'var(--paper)'}">${esc(p.n)}</span>`).join('')}</div></div>
        <div class="card"><div class="eyebrow">Lo que destraba</div>${hitos}</div>
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
    sheet(`<div class="carta${c.foil ? ' foil' : ''}" style="--el:${ELEMENTO[c.e] || 'var(--butter)'}">
      <div class="carta-foto"><img src="${S.artUrl(`cartas/${pid}.webp?v=${D.CARTAS_V}`)}" alt="${esc(p.n)}"></div>
      <div class="carta-id"><h2>${esc(p.n)}</h2>${c.apodo ? `<p class="carta-apodo">${esc(c.apodo)}</p>` : ''}${c.t ? `<p>${esc(c.t)}</p>` : ''}
        <div class="row">${c.s ? `<span class="chip" style="--c:var(--el)">${SIGNO[c.s] || ''}&#xFE0E; ${esc(c.s)}</span>` : ''}<span class="chip">${esc(L.n)} · nivel ${L.i + 1}</span></div></div>
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
      </ul></div>
      <div><h2>Para qué sirven</h2><p>Se gastan en el kiosco: cosas para tu altarcito playero o regalos para el altarcito de otra persona. Lo más caro también pide subir de nivel.</p></div>
      <div class="row" style="justify-content:center"><button class="btn" id="irKiosco" style="--c:var(--butter)">Ir al kiosco</button><button class="btn ghost" data-close>Cerrar</button></div></div>`,
    (bg) => bg.querySelector('#irKiosco').addEventListener('click', () => { bg.remove(); go('kiosco'); }));
  }
  screen.addEventListener('click', (e) => {
    const t = e.target.closest('[data-carta]');
    if (t) carta(t.dataset.carta || S.me);
    else if (e.target.closest('[data-monedas]')) infoMonedas();
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
    const got = S.dailyCheck();
    got.forEach((k, i) => setTimeout(() => toast(`<span class="chip" style="--c:var(--butter)">+${D.ACH[k].c} <span class="coin"></span></span><span>${esc(D.ACH[k].t)}</span>`), i * 700));
    if (got.length) { SONIDO.monedas(got.reduce((n, k) => n + D.ACH[k].c, 0)); setTimeout(render, got.length * 700); }
  }

  // ---------- navegación ----------
  function go(r) { if (location.hash === '#' + r) render(); else location.hash = r; }
  function render() {
    let r = location.hash.slice(1) || 'portada';
    if (!SCREENS[r]) r = 'portada';
    if (r !== 'portada' && r !== 'quien' && !S.me) r = 'quien';
    if (r === 'quien' && S.me) r = 'hoy';
    SCREENS[r]();
    if (r === 'portada') INICIO.entrar(); else INICIO.salir();
    const tabs = $('#tabs');
    tabs.hidden = !S.me || r === 'portada';
    const cur = r === 'kiosco' ? 'altar' : r;
    tabs.innerHTML = TABS.map(([k, l]) => `<a href="#${k}" class="${k === cur ? 'on' : ''}" ${k === cur ? 'aria-current="page"' : ''}>${IC[k]}<span>${l}</span></a>`).join('');
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
        <label>La foto: <b id="cv">${Math.round(fotoProgress() * 100)}%</b><input type="range" id="cp" min="0" max="100" step="5" value="${Math.round(fotoProgress() * 100)}"></label>
        <div class="row"><button class="btn ghost" id="now">Volver a la hora real</button><button class="btn ghost" id="reset">Borrar todo y elegir de nuevo</button></div>
        <button class="btn" data-close>Listo</button></div>`,
      (bg) => {
        bg.querySelector('#hr').addEventListener('input', (e) => { SKY.override.minute = +e.target.value; bg.querySelector('#hv').textContent = SKY.fmt(+e.target.value); SKY.paint(); });
        bg.querySelector('#kd').addEventListener('change', (e) => { SKY.override.kind = e.target.value === 'auto' ? null : e.target.value; SKY.paint(); render(); });
        bg.querySelector('#cp').addEventListener('input', (e) => { fotoOverride = +e.target.value / 100; bg.querySelector('#cv').textContent = e.target.value + '%'; render(); });
        bg.querySelector('#now').addEventListener('click', () => { SKY.override.minute = null; SKY.override.kind = null; fotoOverride = null; SKY.paint(); render(); bg.remove(); });
        bg.querySelector('#reset').addEventListener('click', () => { S.forget(); bg.remove(); go('quien'); });
      });
    });
  }

  // Cambios de los demás en vivo: se vuelve a dibujar la pantalla (las hojas abiertas no se tocan).
  S.onChange((ev) => {
    if (ev && ev.gift) { const it = shopItem(ev.gift.item); toast(`<span class="mini">${it ? ARTE.item(it.id, it.col) : '♡'}</span><span>${esc(person(ev.gift.de).n)} te regaló ${esc(it ? it.n.toLowerCase() : 'algo')}. Ya está en tu altarcito.</span>`, 4500); }
    if (ev && ev.uploadFailed) toast('<span>No se pudo subir la foto. Queda guardada y se reintenta cuando haya señal.</span>', 4500);
    if (!document.querySelector('.sheet-bg') && !dragging) render();
  });

  SKY.start();
  render();
  S.ready.then(() => { render(); if (S.me) setTimeout(welcome, 400); });
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
