/* Cielo reactivo: hora de Argentina, salida y puesta del sol, y clima real.
   Antes y después del viaje mira La Plata; del 4 al 8 de diciembre, Costa Esmeralda. */
(function () {
  const PLACES = {
    laplata: { name: 'La Plata', lat: -34.921, lon: -57.955 },
    costa: { name: 'Costa Esmeralda', lat: -37.03, lon: -56.77 },
  };
  const TRIP = { from: '2026-12-04', to: '2026-12-08' };

  // Fecha "corrida" para que los getters UTC den la hora de Argentina (UTC-3, sin horario de verano).
  const arNow = () => new Date(Date.now() - 3 * 3600e3);
  const arDate = (d = arNow()) => d.toISOString().slice(0, 10);
  const arMinute = (d = arNow()) => d.getUTCHours() * 60 + d.getUTCMinutes();
  const place = () => {
    const s = arDate();
    return s >= TRIP.from && s <= TRIP.to ? PLACES.costa : PLACES.laplata;
  };

  // Ecuación de salida del sol. Devuelve minutos desde la medianoche local (UTC-3).
  function sunTimes(dateStr, lat, lon) {
    const r = Math.PI / 180;
    const [y, m, d] = dateStr.split('-').map(Number);
    const J = Date.UTC(y, m - 1, d, 12) / 864e5 + 2440587.5;
    const n = Math.round(J - 2451545 + 0.0008);
    const Js = n - lon / 360;
    const M = (357.5291 + 0.98560028 * Js) % 360;
    const C = 1.9148 * Math.sin(M * r) + 0.02 * Math.sin(2 * M * r) + 0.0003 * Math.sin(3 * M * r);
    const L = (M + C + 180 + 102.9372) % 360;
    const Jt = 2451545 + Js + 0.0053 * Math.sin(M * r) - 0.0069 * Math.sin(2 * L * r);
    const dec = Math.asin(Math.sin(L * r) * Math.sin(23.4397 * r));
    const cw = (Math.sin(-0.833 * r) - Math.sin(lat * r) * Math.sin(dec)) / (Math.cos(lat * r) * Math.cos(dec));
    const w = Math.acos(Math.max(-1, Math.min(1, cw))) / r;
    const toMin = (j) => {
      const t = new Date((j - 2440587.5) * 864e5 - 3 * 3600e3);
      return t.getUTCHours() * 60 + t.getUTCMinutes() + t.getUTCSeconds() / 60;
    };
    return { rise: toMin(Jt - w / 360), set: toMin(Jt + w / 360), noon: toMin(Jt) };
  }

  // Paletas de playa atlántica: [cielo arriba, cielo medio, horizonte, mar, arena]
  const PAL = {
    night: ['#1c2452', '#2d3b70', '#4b5b8c', '#1f2a52', '#5d5878'],
    predawn: ['#3d4180', '#8b80b3', '#f1b6aa', '#5d6b9c', '#a99aab'],
    sunrise: ['#93abd9', '#f4c8c2', '#ffdaa9', '#8fb1d0', '#ead0b8'],
    morning: ['#9fd1ef', '#c9e7f3', '#f4eedb', '#80c4d0', '#f2e0c3'],
    midday: ['#7fc5ee', '#bae3f5', '#eef6f1', '#60b7c5', '#f4e3c5'],
    golden: ['#8fc3e7', '#f3dab2', '#ffca90', '#70aabe', '#f1d0a5'],
    sunset: ['#6f80c1', '#f39b7b', '#ffb46c', '#8b80a9', '#e3a989'],
    dusk: ['#303b79', '#7c609f', '#e4908b', '#3c4681', '#8f7b98'],
  };
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const toHex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));
  const lum = (h) => { const [r, g, b] = hex(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

  function palette(min, s) {
    const K = [
      [0, PAL.night], [s.rise - 75, PAL.night], [s.rise - 35, PAL.predawn], [s.rise + 5, PAL.sunrise],
      [s.rise + 100, PAL.morning], [s.noon, PAL.midday], [s.set - 80, PAL.golden], [s.set - 5, PAL.sunset],
      [s.set + 30, PAL.dusk], [s.set + 75, PAL.night], [1440, PAL.night],
    ];
    for (let i = 0; i < K.length - 1; i++) {
      const [a, pa] = K[i], [b, pb] = K[i + 1];
      if (min >= a && min <= b) { const t = b === a ? 0 : (min - a) / (b - a); return pa.map((c, j) => mix(c, pb[j], t)); }
    }
    return PAL.night;
  }

  // Clima: códigos WMO de Open-Meteo a algo que el cielo entiende.
  function kindOf(code, wind) {
    let k = 'despejado';
    if (code === 2) k = 'algo nublado';
    else if (code === 3) k = 'nublado';
    else if (code === 45 || code === 48) k = 'niebla';
    else if (code >= 51 && code <= 57) k = 'llovizna';
    else if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) k = 'lluvia';
    else if (code >= 95) k = 'tormenta';
    if (wind >= 28 && (k === 'despejado' || k === 'algo nublado')) k = 'ventoso';
    return k;
  }
  const GREY = { despejado: 0, ventoso: 0.05, 'algo nublado': 0.18, nublado: 0.42, niebla: 0.5, llovizna: 0.5, lluvia: 0.58, tormenta: 0.7 };
  const CLOUDS = { despejado: 0, ventoso: 2, 'algo nublado': 3, nublado: 6, niebla: 5, llovizna: 6, lluvia: 7, tormenta: 8 };

  const SKY = { weather: null, override: { minute: null, kind: null }, listeners: [] };

  async function fetchWeather() {
    const p = place();
    const key = 'colonia.weather.' + p.name;
    try {
      const c = JSON.parse(localStorage.getItem(key) || 'null');
      if (c && Date.now() - c.at < 20 * 60e3) { SKY.weather = c.w; return; }
    } catch (e) {}
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=sunrise,sunset&forecast_days=1&timezone=America%2FArgentina%2FBuenos_Aires`;
      const j = await (await fetch(url)).json();
      const cur = j.current;
      const hm = (iso) => { const t = iso.slice(11, 16).split(':'); return +t[0] * 60 + +t[1]; };
      SKY.weather = { temp: Math.round(cur.temperature_2m), wind: Math.round(cur.wind_speed_10m), kind: kindOf(cur.weather_code, cur.wind_speed_10m),
        day: j.daily.time[0], rise: hm(j.daily.sunrise[0]), set: hm(j.daily.sunset[0]) };
      try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), w: SKY.weather })); } catch (e) {}
    } catch (e) {
      SKY.weather = null; // sin conexión: el cielo sigue la hora igual
    }
  }

  function state() {
    const p = place();
    const s = sunTimes(arDate(), p.lat, p.lon);
    // Si el pronóstico trae salida y puesta de hoy, usamos esas (más precisas).
    const w = SKY.weather;
    if (w && w.day === arDate() && w.rise) { s.rise = w.rise; s.set = w.set; s.noon = (w.rise + w.set) / 2; }
    const minute = SKY.override.minute ?? arMinute();
    const kind = SKY.override.kind || (SKY.weather && SKY.weather.kind) || 'despejado';
    return { place: p, sun: s, minute, kind, weather: SKY.weather };
  }

  // ---------- dibujo ----------
  let canvas, ctx, drops = [], mode = '', windy = false, raf;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function build() {
    const el = document.getElementById('sky');
    el.innerHTML = '<div class="sky-grad"></div><div class="stars"></div><div class="sun"></div><div class="clouds"></div><canvas class="rain"></canvas><div class="sea"><i class="foam"></i></div><div class="sand"></div>';
    const st = el.querySelector('.stars');
    for (let i = 0; i < 40; i++) {
      const s = document.createElement('i');
      s.style.left = Math.random() * 100 + '%'; s.style.top = Math.random() * 55 + '%';
      s.style.animationDelay = Math.random() * 4 + 's';
      st.appendChild(s);
    }
    canvas = el.querySelector('canvas'); ctx = canvas.getContext('2d');
    const size = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
    size(); addEventListener('resize', size);
  }

  function setClouds(n, speed) {
    const box = document.querySelector('#sky .clouds');
    if (box.dataset.n === String(n) && box.dataset.s === String(speed)) return;
    box.dataset.n = n; box.dataset.s = speed; box.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const c = document.createElement('i');
      const w = 90 + Math.random() * 110;
      c.style.width = w + 'px'; c.style.height = w * 0.42 + 'px';
      c.style.top = 4 + Math.random() * 38 + '%';
      c.style.animationDuration = speed * (0.8 + Math.random() * 0.5) + 's';
      c.style.animationDelay = -Math.random() * speed + 's';
      box.appendChild(c);
    }
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (mode) {
      const W = canvas.width, H = canvas.height;
      ctx.lineCap = 'round';
      for (const d of drops) {
        if (mode === 'rain') {
          ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * (windy ? 0.5 : 0.18), d.y + d.l); ctx.stroke();
          d.y += d.v; d.x -= d.v * (windy ? 0.5 : 0.18);
          if (d.y > H * 0.82) { d.y = -20; d.x = Math.random() * W * 1.2; }
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.quadraticCurveTo(d.x + d.l / 2, d.y - 6, d.x + d.l, d.y); ctx.stroke();
          d.x += d.v; if (d.x > W + 40) { d.x = -d.l - Math.random() * 200; d.y = Math.random() * H * 0.6; }
        }
      }
    }
    raf = requestAnimationFrame(loop);
  }

  function setParticles(kind) {
    const next = kind === 'lluvia' || kind === 'tormenta' || kind === 'llovizna' ? 'rain' : kind === 'ventoso' ? 'wind' : '';
    windy = kind === 'tormenta' || kind === 'ventoso';
    if (next === mode) return;
    mode = next; drops = [];
    const n = kind === 'tormenta' ? 170 : kind === 'llovizna' ? 45 : kind === 'lluvia' ? 110 : 14;
    for (let i = 0; i < n; i++) {
      drops.push(mode === 'rain'
        ? { x: Math.random() * innerWidth * 1.2, y: Math.random() * innerHeight, l: 10 + Math.random() * 12, v: 6 + Math.random() * 5 }
        : { x: Math.random() * innerWidth, y: Math.random() * innerHeight * 0.6, l: 30 + Math.random() * 40, v: 3 + Math.random() * 3 });
    }
    if (reduce) { cancelAnimationFrame(raf); loop(); cancelAnimationFrame(raf); }
  }

  function paint() {
    const S = state();
    let pal = palette(S.minute, S.sun);
    const g = GREY[S.kind] || 0;
    const dark = lum(pal[0]) < 0.4;
    if (g) pal = pal.map((c) => mix(c, dark ? '#343a52' : '#c4cad4', g));
    const root = document.documentElement;
    ['--sky-top', '--sky-mid', '--sky-hor', '--sea', '--sand'].forEach((v, i) => root.style.setProperty(v, pal[i]));
    const isDark = lum(pal[0]) < 0.42;
    root.style.setProperty('--on-sky', isDark ? '#fff8ec' : '#3f3352');
    root.style.setProperty('--on-sky-soft', isDark ? 'rgba(255,248,236,.75)' : 'rgba(63,51,82,.7)');
    root.dataset.skyDark = isDark ? '1' : '0';

    // sol: arco entre salida y puesta
    const sun = document.querySelector('#sky .sun');
    const x = (S.minute - S.sun.rise) / (S.sun.set - S.sun.rise);
    if (x > -0.03 && x < 1.03) {
      const alt = Math.sin(Math.PI * Math.min(1, Math.max(0, x)));
      sun.style.left = 8 + x * 84 + '%';
      sun.style.top = 70 - alt * 58 + '%';
      sun.style.background = mix('#ff9d5c', '#fff3b8', Math.min(1, alt * 1.6));
      sun.style.opacity = Math.max(0, 1 - g * 1.6);
    } else sun.style.opacity = 0;
    const stars = document.querySelector('#sky .stars');
    stars.style.opacity = isDark && g < 0.3 ? 0.9 : 0;

    setClouds(CLOUDS[S.kind] || 0, S.kind === 'ventoso' || S.kind === 'tormenta' ? 26 : 80);
    setParticles(S.kind);
    SKY.listeners.forEach((f) => f(S));
  }

  const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`;

  SKY.start = async function () {
    build(); paint(); loop();
    await fetchWeather(); paint();
    setInterval(paint, 60e3);
    setInterval(async () => { await fetchWeather(); paint(); }, 20 * 60e3);
  };
  SKY.paint = paint;
  SKY.state = state;
  SKY.fmt = fmt;
  SKY.arDate = arDate;
  SKY.arMinute = arMinute;
  SKY.arNow = arNow;
  SKY.TRIP = TRIP;
  SKY.onChange = (f) => SKY.listeners.push(f);
  window.SKY = SKY;
})();
