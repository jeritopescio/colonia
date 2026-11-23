/* El inicio: la playa con música. Todo sintetizado, sin archivos.
   Colchón de tres acordes con novena (fa mayor), melodía lenta que suele descansar en la novena, olas y gaviotas.
   Suena solo en la portada: al entrar a la app se va con un fade. */
window.INICIO = (function () {
  const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const azar = (a, b) => a + Math.random() * (b - a);
  const uno = (l) => l[Math.floor(Math.random() * l.length)];
  const ACORDE = 15, PULSO = 1.32; // segundos por acorde y por pulso: como mucho 4 o 5 notas de melodía cada 5 s
  // Fa maj9, Re m9, Sib maj9. "meta" son las notas donde descansa una frase; la última es la novena del acorde.
  const ACORDES = [
    { bajo: 41, voces: [48, 52, 57, 67], meta: [69, 72, 74, 79] },
    { bajo: 38, voces: [48, 53, 57, 64], meta: [69, 72, 77, 76] },
    { bajo: 46, voces: [50, 53, 57, 60], meta: [65, 69, 74, 72] },
  ];
  const ESCALA = [65, 67, 69, 72, 74, 77, 79, 81]; // pentatónica de fa: no choca con ningún acorde

  function crearMotor(ctx, salida, registro) {
    const master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -15; comp.ratio.value = 3; comp.attack.value = 0.02; comp.release.value = 0.3;
    master.connect(comp); comp.connect(salida);

    // Reverb: una sala de aire libre hecha con ruido que se apaga y se va oscureciendo.
    const sr = ctx.sampleRate, largo = Math.floor(sr * 3), ir = ctx.createBuffer(2, largo, sr);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      let prev = 0;
      for (let i = 0; i < largo; i++) {
        const p = i / largo, k = 0.5 - 0.42 * p;
        prev += k * ((Math.random() * 2 - 1) - prev);
        d[i] = prev * Math.pow(1 - p, 2.6) * (i < sr * 0.02 ? i / (sr * 0.02) : 1);
      }
    }
    const rev = ctx.createConvolver(); rev.buffer = ir;
    const revG = ctx.createGain(); revG.gain.value = 0.5;
    rev.connect(revG); revG.connect(master);

    const ruido = ctx.createBuffer(2, sr * 5, sr);
    for (let c = 0; c < 2; c++) { const d = ruido.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }

    const vivos = new Set();
    const vive = (n, fin) => { vivos.add(n); n.onended = () => vivos.delete(n); n.start(fin[0]); if (fin[1] != null) n.stop(fin[1]); return n; };
    const paneo = (p) => { if (!ctx.createStereoPanner) return ctx.createGain(); const n = ctx.createStereoPanner(); n.pan.value = p; return n; };
    const enviar = (n, seco, humedo) => {
      const a = ctx.createGain(), b = ctx.createGain(); a.gain.value = seco; b.gain.value = humedo;
      n.connect(a); n.connect(b); a.connect(master); b.connect(rev);
    };

    function colchon(i, t) {
      const a = ACORDES[i % ACORDES.length], fin = t + ACORDE + 6.5;
      const fil = ctx.createBiquadFilter(); fil.type = 'lowpass'; fil.Q.value = 0.4;
      fil.frequency.setValueAtTime(430, t);
      fil.frequency.linearRampToValueAtTime(azar(760, 980), t + ACORDE * 0.55);
      fil.frequency.linearRampToValueAtTime(420, fin);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 5.5);
      g.gain.setValueAtTime(1, t + ACORDE); g.gain.linearRampToValueAtTime(0, fin);
      fil.connect(g); enviar(g, 0.8, 0.34);
      [[a.bajo, 'sine', 0.1, 0], ...a.voces.map((n) => [n, 'triangle', 0.034, azar(-0.35, 0.35)])].forEach(([n, tipo, nivel, p], v) => {
        const pan = paneo(p), vg = ctx.createGain(); vg.gain.value = nivel; vg.connect(pan); pan.connect(fil);
        (v ? [-1, 1] : [0]).forEach((lado) => {
          const o = ctx.createOscillator(); o.type = tipo; o.frequency.value = hz(n); o.detune.value = lado * azar(2.5, 6.5);
          o.connect(vg); vive(o, [t + azar(0, 0.5), fin + 0.05]);
        });
      });
      if (registro) registro.acordes.push(t);
    }

    // Maza con fieltro: fundamental redonda, parciales apenas desafinados que se apagan rápido y un soplido al golpear.
    function nota(t, n, v, p) {
      const dur = azar(3.3, 4.8), f = hz(n) * (1 + azar(-0.0009, 0.0009));
      const fil = ctx.createBiquadFilter(); fil.type = 'lowpass'; fil.frequency.value = 2500; fil.Q.value = 0.3;
      const pan = paneo(p); fil.connect(pan); enviar(pan, 0.72, 0.62);
      [[1, 1, 1], [2, 0.2, 0.52], [3.01, 0.055, 0.28], [4.17, 0.022, 0.13]].forEach(([m, a, d]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f * m;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.15 * v * a, t + azar(0.02, 0.034));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur * d);
        o.connect(g); g.connect(fil); vive(o, [t, t + dur * d + 0.03]);
      });
      const s = ctx.createBufferSource(), sf = ctx.createBiquadFilter(), sg = ctx.createGain();
      s.buffer = ruido; sf.type = 'bandpass'; sf.frequency.value = f * 1.5; sf.Q.value = 0.9;
      sg.gain.setValueAtTime(0.0001, t); sg.gain.exponentialRampToValueAtTime(0.012 * v, t + 0.012); sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      s.connect(sf); sf.connect(sg); sg.connect(fil); vivos.add(s); s.onended = () => vivos.delete(s); s.start(t, azar(0, 4), 0.12);
      if (registro) registro.notas.push(t);
    }

    // Olas: ruido filtrado que sube y baja, con un poco de espuma cuando rompe.
    const mar = ctx.createBufferSource(); mar.buffer = ruido; mar.loop = true;
    const espuma = ctx.createBufferSource(); espuma.buffer = ruido; espuma.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300; lp.Q.value = 0.2;
    const lp2 = ctx.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 1500;
    const marG = ctx.createGain(); marG.gain.value = 0.014;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
    const espG = ctx.createGain(); espG.gain.value = 0.0003;
    mar.connect(lp); lp.connect(lp2); lp2.connect(marG); marG.connect(master);
    espuma.connect(hp); hp.connect(espG); espG.connect(master);
    const arranque = ctx.currentTime + 0.04;
    vive(mar, [arranque]); vive(espuma, [arranque, null]);

    function ola(t, d) {
      const alto = azar(0.05, 0.085);
      marG.gain.setValueAtTime(0.014, t); marG.gain.linearRampToValueAtTime(alto, t + d * 0.46); marG.gain.linearRampToValueAtTime(0.014, t + d);
      lp.frequency.setValueAtTime(300, t); lp.frequency.linearRampToValueAtTime(azar(850, 1250), t + d * 0.46); lp.frequency.linearRampToValueAtTime(300, t + d);
      espG.gain.setValueAtTime(0.0003, t + d * 0.38); espG.gain.linearRampToValueAtTime(azar(0.005, 0.009), t + d * 0.56); espG.gain.linearRampToValueAtTime(0.0003, t + d);
    }

    // Gaviota: dos a cuatro "kiau" que suben un poquito y caen, ásperos y lejanos.
    function gaviota(t, p, lejos) {
      const veces = uno([2, 3, 3, 4]), f0 = azar(1450, 1900), v = 0.06 * (1 - lejos * 0.45);
      const pan = paneo(p); enviar(pan, 0.32, 0.95);
      let ts = t;
      for (let k = 0; k < veces; k++) {
        const d = azar(0.3, 0.46), f = f0 * (1 - k * 0.035);
        const o = ctx.createOscillator(), bp = ctx.createBiquadFilter(), lpg = ctx.createBiquadFilter(), g = ctx.createGain();
        const am = ctx.createOscillator(), amg = ctx.createGain(), base = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f * 0.82, ts); o.frequency.exponentialRampToValueAtTime(f * 1.08, ts + 0.07); o.frequency.exponentialRampToValueAtTime(f * 0.58, ts + d);
        bp.type = 'bandpass'; bp.frequency.value = 1750 - lejos * 260; bp.Q.value = 1.2;
        lpg.type = 'lowpass'; lpg.frequency.value = 3400 - lejos * 900;
        am.frequency.value = azar(34, 47); amg.gain.value = 0.32; base.gain.value = 0.68;
        am.connect(amg); amg.connect(base.gain);
        g.gain.setValueAtTime(0.0001, ts); g.gain.exponentialRampToValueAtTime(v, ts + 0.05); g.gain.linearRampToValueAtTime(v * 0.55, ts + d * 0.65); g.gain.exponentialRampToValueAtTime(0.0001, ts + d);
        o.connect(bp); bp.connect(lpg); lpg.connect(base); base.connect(g); g.connect(pan);
        vive(o, [ts, ts + d + 0.02]); vive(am, [ts, ts + d + 0.02]);
        ts += d + azar(0.09, 0.22);
      }
      if (registro) registro.gaviotas.push(t);
    }

    // Una frase corta: camina por la escala y descansa en una nota del acorde que esté sonando.
    const t0 = arranque + 0.1;
    let tAcorde = t0, iAcorde = 0, tFrase = t0 + 5.5, tOla = t0 + 0.2, idx = 2;
    function frase() {
      const a = ACORDES[Math.floor(Math.max(0, tFrase - t0) / ACORDE) % ACORDES.length];
      const n = uno([3, 4, 4, 5]), lado = Math.random() < 0.5 ? -0.22 : 0.22;
      let dir = idx > 4 ? -1 : 1;
      for (let i = 0; i < n; i++) {
        const fin = i === n - 1;
        if (i === Math.floor(n / 2)) dir = -dir;
        idx = Math.max(0, Math.min(ESCALA.length - 1, idx + dir * uno([1, 1, 1, 2])));
        const m = fin ? (Math.random() < 0.62 ? a.meta[3] : uno(a.meta)) : ESCALA[idx];
        const arco = Math.sin(((i + 0.6) / (n + 0.2)) * Math.PI);
        nota(tFrase + azar(-0.05, 0.05), m, 0.66 + 0.26 * arco + azar(-0.06, 0.06), lado + azar(-0.12, 0.12));
        tFrase += (fin ? uno([2, 2.5, 3]) : uno([1, 1, 1.5, 2])) * PULSO;
      }
      tFrase += azar(0.5, 2.6) * PULSO;
    }

    // Un toque en el mar: una nota de la escala una octava arriba de la melodía, casi siempre del acorde que está sonando.
    function toque(p) {
      const t = ctx.currentTime + 0.01;
      const a = ACORDES[Math.floor(Math.max(0, t - t0) / ACORDE) % ACORDES.length];
      nota(t, (Math.random() < 0.6 ? uno(a.meta) : uno(ESCALA)) + 12, azar(0.3, 0.44), Math.max(-0.8, Math.min(0.8, p + azar(-0.1, 0.1))));
    }

    function hasta(T) {
      const ahora = ctx.currentTime + 0.05;
      tAcorde = Math.max(tAcorde, ahora - ACORDE); tFrase = Math.max(tFrase, ahora); tOla = Math.max(tOla, ahora);
      while (tAcorde < T) { colchon(iAcorde++, Math.max(tAcorde, ahora)); tAcorde += ACORDE; }
      while (tFrase < T) frase();
      while (tOla < T) { const d = azar(8, 13); ola(tOla, d); tOla += d * azar(0.96, 1.05); }
    }
    function nivel(v, seg) {
      const t = ctx.currentTime, g = master.gain;
      if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(t);
      else { const hoy = g.value; g.cancelScheduledValues(t); g.setValueAtTime(hoy, t); }
      g.linearRampToValueAtTime(v, t + seg);
    }
    function cerrar() {
      vivos.forEach((n) => { try { n.stop(); } catch (e) { /* ya terminó */ } });
      vivos.clear();
      master.disconnect(); comp.disconnect(); rev.disconnect();
    }
    return { hasta, nivel, gaviota, cerrar, master, toque };
  }

  // ---------- encendido y apagado ----------
  const CLAVE = 'colonia.musica';
  let enPortada = false, motor = null, reloj = null, corte = null;
  const quiere = () => { try { return localStorage.getItem(CLAVE) !== '0'; } catch (e) { return true; } };
  const ctx = () => (window.SONIDO && SONIDO.audio ? SONIDO.audio() : null);
  let escuchando = false;

  function encender() {
    const c = ctx();
    if (!c) return;
    if (!escuchando) { escuchando = true; c.addEventListener('statechange', () => { acomodar(); }); }
    if (c.state !== 'running') { c.resume().catch(() => {}); return; }
    clearTimeout(corte); corte = null;
    if (!motor) {
      motor = crearMotor(c, c.destination);
      motor.hasta(c.currentTime + 5);
      reloj = setInterval(() => motor && motor.hasta(c.currentTime + 5), 800);
    }
    motor.nivel(0.82, 3.2);
  }
  function apagar(seg) {
    if (!motor || corte) return;
    motor.nivel(0, seg);
    corte = setTimeout(() => {
      clearInterval(reloj); reloj = null; corte = null;
      if (motor) { motor.cerrar(); motor = null; }
    }, seg * 1000 + 150);
  }
  function acomodar(seg = 4.5) {
    if (enPortada && quiere() && !document.hidden) encender(); else apagar(document.hidden ? 0.5 : seg);
    pintar();
  }
  function pintar() {
    const b = document.getElementById('sonido'), h = document.getElementById('oir'), c = ctx();
    if (b) { b.setAttribute('aria-pressed', quiere() ? 'true' : 'false'); b.classList.toggle('apagado', !quiere()); }
    if (h) h.hidden = !quiere() || !c || c.state === 'running';
  }
  function alternar() {
    try { localStorage.setItem(CLAVE, quiere() ? '0' : '1'); } catch (e) { /* queda como está */ }
    acomodar(1.2);
  }

  // ---------- gaviotas ----------
  // Lejos, una gaviota es apenas una v que aletea.
  const DIBUJO = '<svg viewBox="0 0 28 14" aria-hidden="true"><path class="ala a" d="M14 9C11 5 7 3 2 4"/><path class="ala b" d="M14 9c3-4 7-6 12-5"/></svg>';
  const quieta = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let turno = null, llamadas = [];
  const cielo = () => document.getElementById('gaviotas');

  function soltar(atras) {
    const box = cielo();
    if (!box || box.children.length > 9) return;
    const dir = Math.random() < 0.5 ? 1 : -1, tam = azar(0.6, 1), dur = azar(54, 78) / Math.sqrt(tam), alto = azar(6, 32);
    const n = uno([1, 2, 3, 3, 4]);
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.className = 'gaviota' + (dir < 0 ? ' vuelta' : '');
      const t = tam * azar(0.86, 1.1);
      el.style.cssText = `top:${(alto + (i % 2 ? 1 : -0.4) * i * azar(0.5, 1.2)).toFixed(1)}%;--w:${(25 * t).toFixed(0)}px;--dur:${dur.toFixed(1)}s;--ala:${azar(0.75, 1.15).toFixed(2)}s;--ond:${azar(4.5, 7.5).toFixed(1)}s;animation-delay:${(i * azar(1.1, 2.6) - atras * dur).toFixed(2)}s`;
      el.innerHTML = DIBUJO;
      el.addEventListener('animationend', (e) => { if (e.target === el) el.remove(); });
      box.appendChild(el);
    }
    // Canta cuando va por el medio, y suena del lado donde está.
    if (Math.random() < 0.8) {
      const f = Math.max(atras + 0.06, azar(0.3, 0.68));
      llamadas.push(setTimeout(() => {
        const c = ctx();
        if (motor && c) motor.gaviota(c.currentTime + 0.05, dir * (f * 2 - 1) * 0.75, 1.35 - tam);
      }, (f - atras) * dur * 1000));
    }
  }
  function ciclo() { soltar(0); turno = setTimeout(ciclo, azar(11, 21) * 1000); }
  function gaviotasOn() {
    const box = cielo();
    if (!box || quieta || turno) return;
    box.classList.remove('fuera');
    if (!box.children.length) { soltar(0.34); setTimeout(() => enPortada && soltar(0.12), 400); }
    turno = setTimeout(ciclo, azar(6, 11) * 1000);
  }
  function gaviotasOff() {
    clearTimeout(turno); turno = null;
    llamadas.forEach(clearTimeout); llamadas = [];
    const box = cielo();
    if (box) { box.classList.add('fuera'); setTimeout(() => { if (!enPortada) box.innerHTML = ''; }, 1800); }
  }

  document.addEventListener('visibilitychange', () => {
    if (!enPortada) return;
    if (document.hidden) gaviotasOff(); else gaviotasOn();
    acomodar();
  });

  return {
    entrar() { enPortada = true; gaviotasOn(); acomodar(); },
    salir() {
      if (!enPortada) return;
      enPortada = false; document.body.classList.remove('quieto');
      gaviotasOff(); acomodar();
    },
    alternar,
    toque(p) { if (motor && !corte) motor.toque(p); }, // p: de -1 (izquierda) a 1 (derecha)
    sonando: () => !!motor && !corte,
    _motor: crearMotor, // para medir la música sin parlantes
  };
})();
