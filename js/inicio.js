/* El inicio: la playa con música. Todo sintetizado, sin archivos.
   Colchón de tres acordes con novena (fa mayor), melodía lenta que suele descansar en la novena, olas y gaviotas.
   Con el barco fantasma (mirando el mar, más de 5): acordes menores y tensos, blues, viento y truenos.
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
  // Con el barco fantasma la música se pone tensa: Fa menor 9, Reb maj7(#11) y Do7(b9), y la melodía y los toques van por la
  // pentatónica menor de fa (fa, lab, sib, do, mib: la del blues). Las frases suelen terminar en el mib o en la novena.
  const ACORDES_F = [
    { bajo: 41, voces: [48, 51, 56, 67], meta: [68, 72, 75, 67] },
    { bajo: 37, voces: [48, 53, 56, 67], meta: [68, 72, 77, 75] },
    { bajo: 36, voces: [46, 52, 55, 61], meta: [70, 72, 67, 75] },
  ];
  const ESCALA_F = [65, 68, 70, 72, 75, 77, 80, 82];
  // La distorsión del colchón del dedo con el barco fantasma: satura suave (tanh) y no se pasa de 1.
  let curvaDistor = null;
  const distor = () => {
    if (curvaDistor) return curvaDistor;
    const n = 2048, k = 7, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); }
    return (curvaDistor = c);
  };

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

    // Cada modo (normal o fantasma) suena por su capa: al cambiar, una se va con un fundido y la otra entra.
    let modo = 'normal';
    const capa = {};
    [['normal', 0.8, 0.34, 1], ['fantasma', 0.72, 0.6, 0]].forEach(([m, seco, humedo, v]) => {
      const col = ctx.createGain(); col.gain.value = v; enviar(col, seco, humedo);
      capa[m] = { col, mel: ctx.createGain() };
      capa[m].mel.gain.value = v;
    });
    const fundir = (param, v, seg) => {
      const t = ctx.currentTime;
      if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(t); else { const x = param.value; param.cancelScheduledValues(t); param.setValueAtTime(x, t); }
      param.linearRampToValueAtTime(v, t + seg);
    };
    const acordesDe = (m) => (m === 'fantasma' ? ACORDES_F : ACORDES);

    // La guitarra del fogón: una cuerda pulsada (triángulo con un poco de sierra, un filtro que se cierra rápido) y, sobre
    // cada acorde, un arpegio con el pulgar en el bajo. Mientras suena, los toques del mar también suenan a guitarra.
    let conGuitarra = false;
    function cuerda(t, n, v, p, salida) {
      const f = hz(n), dur = azar(1.3, 1.9);
      const fil = ctx.createBiquadFilter(); fil.type = 'lowpass'; fil.Q.value = 0.7;
      fil.frequency.setValueAtTime(Math.min(5200, f * 9), t); fil.frequency.exponentialRampToValueAtTime(Math.max(500, f * 1.6), t + 0.35);
      const pan = paneo(p); fil.connect(pan);
      if (salida) pan.connect(salida); else enviar(pan, 0.78, 0.4);
      [['triangle', 1, 1], ['sawtooth', 1.002, 0.35]].forEach(([tipo, mm, a]) => {
        const o = ctx.createOscillator(), g = ctx.createGain(), fin = t + dur;
        o.type = tipo; o.frequency.value = f * mm;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.11 * v * a, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0004, fin); g.gain.linearRampToValueAtTime(0, fin + 0.02);
        o.connect(g); g.connect(fil); vive(o, [t, fin + 0.05]);
      });
    }
    function arpegio(a, t, salida) {
      const arriba = [...new Set(a.voces.map((n) => (n < 55 ? n + 12 : n)))].sort((x, y) => x - y).slice(0, 3);
      const patron = [a.bajo + 12, arriba[0], arriba[1], arriba[2], arriba[1], arriba[0]], paso = PULSO / 2;
      for (let k = 0, tt = t; tt < t + ACORDE - 0.3; k++, tt += paso) {
        const n = patron[k % patron.length];
        cuerda(tt + azar(-0.012, 0.012), n, (k % patron.length ? 0.36 : 0.52) * azar(0.88, 1.08), k % patron.length ? azar(-0.3, 0.3) : -0.15, salida);
      }
    }
    function colchon(i, t) {
      const m = modo, F = m === 'fantasma', a = acordesDe(m)[i % ACORDES.length], fin = t + ACORDE + 6.5;
      if (conGuitarra) arpegio(a, t, capa[m].col);
      const fil = ctx.createBiquadFilter(); fil.type = 'lowpass'; fil.Q.value = F ? 1.1 : 0.4;
      fil.frequency.setValueAtTime(F ? 340 : 430, t);
      fil.frequency.linearRampToValueAtTime(F ? azar(620, 760) : azar(760, 980), t + ACORDE * 0.55);
      fil.frequency.linearRampToValueAtTime(F ? 330 : 420, fin);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(F ? 1.15 : 1, t + (F ? 2.2 : 5.5));
      g.gain.setValueAtTime(F ? 1.15 : 1, t + ACORDE); g.gain.linearRampToValueAtTime(0, fin);
      fil.connect(g); g.connect(capa[m].col);
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
    // Entra y sale con un fundido corto (desde cero, en línea recta) para que no haga clic. "suave": sin el parcial más agudo y con menos soplido.
    // "salida": por dónde sale (la melodía tiene la suya, para poder callarla); "armonicos": cuánto más fuertes van los parciales (las graves).
    // "sube": cuántos cents abajo arranca y se desliza hasta la nota (la nota de blues "estirada").
    function nota(t, n, v, p, suave, salida, armonicos = 1, sube = 0) {
      const dur = azar(3.3, 4.8), f = hz(n) * (1 + azar(-0.0009, 0.0009)), entra = azar(0.014, 0.022);
      const fil = ctx.createBiquadFilter(); fil.type = 'lowpass'; fil.frequency.value = Math.max(suave ? 2200 : 2500, f * 1.7); fil.Q.value = 0.3;
      const pan = paneo(p); fil.connect(pan);
      if (salida) pan.connect(salida); else enviar(pan, 0.72, 0.62);
      [[1, 1, 1], [2, 0.2, 0.52], [3.01, 0.055, 0.28], [4.17, 0.022, 0.13]].slice(0, suave && armonicos <= 1 ? 3 : 4).forEach(([m, a, d]) => {
        const o = ctx.createOscillator(), g = ctx.createGain(), fin = t + dur * d;
        o.type = 'sine'; o.frequency.value = f * m;
        if (sube) { o.frequency.setValueAtTime(f * m * Math.pow(2, -sube / 1200), t); o.frequency.exponentialRampToValueAtTime(f * m, t + 0.16); }
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.15 * v * a * (m > 1 ? armonicos : 1), t + entra);
        g.gain.exponentialRampToValueAtTime(0.0004, fin);
        g.gain.linearRampToValueAtTime(0, fin + 0.03);
        o.connect(g); g.connect(fil); vive(o, [t, fin + 0.06]);
      });
      const s = ctx.createBufferSource(), sf = ctx.createBiquadFilter(), sg = ctx.createGain();
      s.buffer = ruido; sf.type = 'bandpass'; sf.frequency.value = Math.min(f * 1.5, 2600); sf.Q.value = 0.9;
      sg.gain.setValueAtTime(0, t); sg.gain.linearRampToValueAtTime((suave ? 0.005 : 0.012) * v, t + 0.012); sg.gain.exponentialRampToValueAtTime(0.0004, t + 0.1); sg.gain.linearRampToValueAtTime(0, t + 0.115);
      s.connect(sf); sf.connect(sg); sg.connect(fil); vivos.add(s); s.onended = () => vivos.delete(s); s.start(t, azar(0, 4), 0.13);
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

    // Una frase corta: camina por la escala y descansa en una nota del acorde que esté sonando. Sale por melG, que se puede callar.
    // Con el barco fantasma, por la pentatónica menor; el lab y el mib a veces entran estirados desde abajo, como en el blues.
    const melG = ctx.createGain(); enviar(melG, 0.72, 0.62);
    capa.normal.mel.connect(melG); capa.fantasma.mel.connect(melG);
    let t0 = arranque + 0.1; // desde cuándo cuentan los acordes (al cambiar de modo, vuelve a empezar)
    let tAcorde = t0, iAcorde = 0, tFrase = t0 + 5.5, tOla = t0 + 0.2, idx = 2, tViento = 0;
    const blues = (n) => (modo === 'fantasma' && (n % 12 === 8 || n % 12 === 3) && Math.random() < 0.45 ? azar(60, 110) : 0);
    function frase() {
      const F = modo === 'fantasma', esc = F ? ESCALA_F : ESCALA;
      const a = acordesDe(modo)[Math.floor(Math.max(0, tFrase - t0) / ACORDE) % ACORDES.length];
      const n = uno([3, 4, 4, 5]), lado = Math.random() < 0.5 ? -0.22 : 0.22;
      let dir = idx > 4 ? -1 : 1;
      for (let i = 0; i < n; i++) {
        const fin = i === n - 1;
        if (i === Math.floor(n / 2)) dir = -dir;
        idx = Math.max(0, Math.min(esc.length - 1, idx + dir * uno([1, 1, 1, 2])));
        const m = fin ? (Math.random() < 0.62 ? a.meta[3] : uno(a.meta)) : esc[idx];
        const arco = Math.sin(((i + 0.6) / (n + 0.2)) * Math.PI);
        nota(tFrase + azar(-0.05, 0.05), m, 0.66 + 0.26 * arco + azar(-0.06, 0.06), lado + azar(-0.12, 0.12), false, capa[modo].mel, 1, blues(m));
        tFrase += (fin ? uno([2, 2.5, 3]) : uno([1, 1, 1.5, 2])) * PULSO * (F ? 1.15 : 1);
      }
      tFrase += azar(0.5, 2.6) * PULSO;
    }

    // Viento (solo con el barco fantasma): ruido por un filtro que se mueve, en ráfagas que suben y bajan.
    const viento = ctx.createBufferSource(); viento.buffer = ruido; viento.loop = true;
    const vientoF = ctx.createBiquadFilter(); vientoF.type = 'bandpass'; vientoF.frequency.value = 500; vientoF.Q.value = 1.4;
    const vientoG = ctx.createGain(); vientoG.gain.value = 0;
    viento.connect(vientoF); vientoF.connect(vientoG); enviar(vientoG, 0.75, 0.35);
    vive(viento, [arranque]);
    function rafaga(t, d) {
      const pico = azar(0.32, 0.55), base = azar(0.07, 0.11); // el ruido filtrado es muy finito: necesita bastante volumen
      vientoG.gain.setValueAtTime(base, t); vientoG.gain.linearRampToValueAtTime(pico, t + d * azar(0.35, 0.6)); vientoG.gain.linearRampToValueAtTime(base, t + d);
      vientoF.frequency.setValueAtTime(azar(380, 520), t); vientoF.frequency.exponentialRampToValueAtTime(azar(820, 1500), t + d * 0.5); vientoF.frequency.exponentialRampToValueAtTime(azar(380, 520), t + d);
    }

    // Un trueno: si es cerca, un estallido seco primero; después el retumbo, capas de ruido grave que se apagan despacio.
    function trueno(t, fuerza = 1) {
      const out = ctx.createGain(); out.gain.value = fuerza; enviar(out, 0.85, 0.45);
      const capaRuido = (ts, tipo, frec, q, ataque, pico, cae, largo) => {
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = ruido; f.type = tipo; f.frequency.value = frec; f.Q.value = q;
        g.gain.setValueAtTime(0, ts); g.gain.linearRampToValueAtTime(pico, ts + ataque); g.gain.exponentialRampToValueAtTime(0.0005, ts + ataque + cae); g.gain.linearRampToValueAtTime(0, ts + ataque + cae + 0.03);
        s.connect(f); f.connect(g); g.connect(out); vive(s, [ts, ts + largo]);
      };
      let ts = t;
      if (fuerza > 0.75) { capaRuido(t, 'bandpass', 1400, 0.4, 0.006, 0.5, 0.5, 0.65); ts += 0.04; }
      const veces = 4 + Math.floor(Math.random() * 3);
      for (let k = 0; k < veces; k++) {
        const cae = azar(1.3, 3.2);
        capaRuido(ts, 'lowpass', azar(320, 680), 0.8, azar(0.05, 0.3), azar(1.4, 2.2) * (k ? 0.75 : 1), cae, cae + 0.5); // grave pero que se oiga en el parlante del celu
        ts += azar(0.12, 0.55);
      }
      if (registro) (registro.truenos = registro.truenos || []).push(t);
    }
    // El Holandés Laburante. El aviso de que se abre la ventana del cañonazo: dos campanitas agudas (do y fa: van con todo).
    function aviso() { const t = ctx.currentTime + 0.03; nota(t, 84, 0.55, -0.2, true, null, 1); nota(t + 0.15, 89, 0.6, 0.2, true, null, 1); }
    // El cañonazo: un golpe grave que cae, la explosión (ruido que se oscurece) y su eco.
    function canon() {
      const t = ctx.currentTime + 0.03, out = ctx.createGain(); out.gain.value = 0.7; enviar(out, 0.9, 0.45);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.38);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.9, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + 0.55); g.gain.linearRampToValueAtTime(0, t + 0.58);
      o.connect(g); g.connect(out); vive(o, [t, t + 0.6]);
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), sg = ctx.createGain();
      s.buffer = ruido; f.type = 'lowpass'; f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(280, t + 0.7);
      sg.gain.setValueAtTime(0, t); sg.gain.linearRampToValueAtTime(0.9, t + 0.008); sg.gain.exponentialRampToValueAtTime(0.001, t + 1); sg.gain.linearRampToValueAtTime(0, t + 1.03);
      s.connect(f); f.connect(sg); sg.connect(out); vive(s, [t, t + 1.1]);
    }
    // Un toque al barco: un toc de madera cortito y bajito (puede sonar hasta 9 veces por segundo).
    function golpe() {
      const t = ctx.currentTime + 0.01, out = ctx.createGain(); out.gain.value = 0.34; enviar(out, 0.95, 0.12);
      const o = ctx.createOscillator(), g = ctx.createGain(), f0 = azar(200, 270);
      o.type = 'triangle'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + 0.07);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.8, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12); g.gain.linearRampToValueAtTime(0, t + 0.13);
      o.connect(g); g.connect(out); vive(o, [t, t + 0.14]);
      const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), sg = ctx.createGain();
      s.buffer = ruido; fl.type = 'bandpass'; fl.frequency.value = azar(1800, 2700); fl.Q.value = 1.4;
      sg.gain.setValueAtTime(0, t); sg.gain.linearRampToValueAtTime(0.5, t + 0.002); sg.gain.exponentialRampToValueAtTime(0.001, t + 0.04); sg.gain.linearRampToValueAtTime(0, t + 0.045);
      s.connect(fl); fl.connect(sg); sg.connect(out); vive(s, [t, t + 0.05]);
    }
    // Una bengala que explota: un estallido corto y un chisporroteo que se apaga.
    function fuego() {
      const t = ctx.currentTime + 0.01, out = ctx.createGain(); out.gain.value = 0.45; enviar(out, 0.85, 0.35);
      const ruidito = (ts, dur, pico, frec) => {
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = ruido; f.type = 'bandpass'; f.frequency.value = frec; f.Q.value = 0.8;
        g.gain.setValueAtTime(0, ts); g.gain.linearRampToValueAtTime(pico, ts + 0.004); g.gain.exponentialRampToValueAtTime(0.001, ts + dur); g.gain.linearRampToValueAtTime(0, ts + dur + 0.01);
        s.connect(f); f.connect(g); g.connect(out); vive(s, [ts, ts + dur + 0.02]);
      };
      ruidito(t, 0.32, 0.9, 900);
      for (let k = 0; k < 14; k++) ruidito(t + 0.12 + Math.random() * 0.7, 0.03, 0.25 + Math.random() * 0.3, 3000 + Math.random() * 3000);
    }
    // La fiesta del parlante: un bombo en cada pulso, un platillo cerrado a contratiempo y el bajo en la nota del acorde.
    let conFiesta = false, tFiesta = 0, kFiesta = 0;
    function golpeFiesta(t, k) {
      const out = capa[modo].col;
      if (k % 2 === 0) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.16);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.9, t + 0.005); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); g.gain.linearRampToValueAtTime(0, t + 0.31);
        o.connect(g); g.connect(out); vive(o, [t, t + 0.32]);
        const a = acordesDe(modo)[(iAcorde + ACORDES.length - 1) % ACORDES.length], b = ctx.createOscillator(), bg = ctx.createGain(), bf = ctx.createBiquadFilter();
        b.type = 'sawtooth'; b.frequency.value = hz(a.bajo); bf.type = 'lowpass'; bf.frequency.value = 300;
        bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(0.16, t + 0.01); bg.gain.exponentialRampToValueAtTime(0.001, t + PULSO * 0.45); bg.gain.linearRampToValueAtTime(0, t + PULSO * 0.46);
        b.connect(bf); bf.connect(bg); bg.connect(out); vive(b, [t, t + PULSO * 0.47]);
      } else {
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = ruido; f.type = 'highpass'; f.frequency.value = 7000;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.002); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06); g.gain.linearRampToValueAtTime(0, t + 0.065);
        s.connect(f); f.connect(g); g.connect(out); vive(s, [t, t + 0.07]);
      }
    }
    // Hundido: un arpegio de fa mayor que sube y el acorde.
    function fanfarria() {
      const t = ctx.currentTime + 0.05;
      [65, 69, 72, 77, 81].forEach((n, i) => nota(t + i * 0.13, n, 0.85, (i - 2) * 0.15, false, null, 1.4));
      [65, 69, 72, 77].forEach((n) => nota(t + 0.85, n, 0.5, 0, false, null, 1.2));
    }
    // Normal o fantasma: la capa vieja se va con un fundido, la nueva entra, y los acordes vuelven a empezar desde el primero.
    function cambiarModo(m) {
      if (m === modo || !capa[m]) return;
      const viejo = modo, ahora = ctx.currentTime;
      modo = m;
      fundir(capa[viejo].col.gain, 0, 2.5); fundir(capa[viejo].mel.gain, 0, 1.5);
      fundir(capa[m].col.gain, 1, 2.5); fundir(capa[m].mel.gain, 1, 3);
      t0 = ahora + 0.05; tAcorde = t0; iAcorde = 0; tFrase = Math.max(tFrase, t0 + 2.5);
      if (m === 'fantasma') tViento = ahora + 0.3; else fundir(vientoG.gain, 0, 3);
    }

    // Un toque en el mar: una nota de la pentatónica de fa, de fa grave (abajo de la pantalla) a fa sobreagudo (arriba), con un poco
    // de azar (a veces sale la vecina). Toda la escala encaja con cualquiera de los tres acordes. Más arriba suena más bajito, pero
    // nunca menos que un piso. Las graves llevan más armónicos para que se oigan en el parlante del celu.
    // Se programa 35 ms adelante: si el celu tarda en avisarle al audio, la nota igual arranca desde cero y no hace clic.
    // Con el barco fantasma, la pentatónica menor de fa (blues): fa lab sib do mib.
    const PENTA = [5, 7, 9, 0, 2]; // fa sol la do re
    const ARRIBA = []; for (let n = 41; n <= 101; n++) if (PENTA.includes(n % 12)) ARRIBA.push(n); // fa2 a fa7: 26 notas
    const ARRIBA_F = []; for (let n = 41; n <= 101; n++) if ([5, 8, 10, 0, 3].includes(n % 12)) ARRIBA_F.push(n);
    const lado = (p) => Math.max(-0.8, Math.min(0.8, p));
    const acordeAhora = () => Math.floor(Math.max(0, ctx.currentTime - t0) / ACORDE) % ACORDES.length;
    const cero1 = (v) => Math.max(0, Math.min(1, v));
    function toque(p, alto, cuanto = 1) {
      alto = cero1(alto);
      const lista = modo === 'fantasma' ? ARRIBA_F : ARRIBA;
      const i = Math.max(0, Math.min(lista.length - 1, Math.round(alto * (lista.length - 1) + azar(-0.7, 0.7))));
      const v = (0.26 + 0.66 * Math.pow(1 - alto, 0.9)) * azar(0.9, 1.05) * cuanto; // abajo 0,92; arriba nunca menos de 0,26
      if (conGuitarra) cuerda(ctx.currentTime + 0.035, lista[i] - 12, v * 1.25, lado(p + azar(-0.1, 0.1)));
      else nota(ctx.currentTime + 0.035, lista[i], v, lado(p + azar(-0.1, 0.1)), true, null, 1 + 1.8 * Math.pow(1 - alto, 1.5), blues(lista[i]));
      if (registro) (registro.toques = registro.toques || []).push(ctx.currentTime);
    }

    // Dejar el dedo apoyado: un colchón de sierras suaves por un filtro que resuena (otra textura que el de fondo, que es de triángulos).
    // Arriba y abajo cambia la nota: siempre notas del acorde que suena, de a un paso por vez y deslizándose, sin saltos bruscos.
    // A los costados cambia la onda que mueve el volumen y el filtro: a la izquierda oscila lento; a la derecha, rápido y más bajito.
    // Si cambia el acorde mientras está apoyado, se desliza a las notas nuevas.
    // Con el barco fantasma: con distorsión (satura y después se le recorta lo más agudo) y bajito.
    function sostener(alto, x) {
      const t = ctx.currentTime + 0.035, F = modo === 'fantasma', nivel = F ? 0.3 : 1;
      // Las notas del acorde j entre la2 y mi6, de grave a aguda. Cada voz toma una de por medio (i, i+2, i+4): acordes abiertos.
      const delAcorde = (j) => { const a = acordesDe(F ? 'fantasma' : 'normal')[j], pcs = new Set([a.bajo, ...a.voces, ...a.meta].map((n) => n % 12)); const l = []; for (let n = 45; n <= 88; n++) if (pcs.has(n % 12)) l.push(n); return l; };
      let ia = acordeAhora(), lista = delAcorde(ia), donde = cero1(alto), paso = Math.round(donde * (lista.length - 5));
      const voces = () => [lista[paso], lista[paso + 2], lista[paso + 4]];
      const fil = ctx.createBiquadFilter(); fil.type = 'lowpass'; fil.Q.value = 5; fil.frequency.value = 900;
      const trem = ctx.createGain(); trem.gain.value = 0.68;
      const vol = ctx.createGain(); vol.gain.value = nivel;
      const env = ctx.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(1, t + 0.7);
      const pan = paneo(lado(x * 2 - 1));
      let cola = fil;
      if (F) {
        const empuje = ctx.createGain(), sat = ctx.createWaveShaper(), lima = ctx.createBiquadFilter();
        empuje.gain.value = 4.5; sat.curve = distor(); sat.oversample = '2x'; lima.type = 'lowpass'; lima.frequency.value = 2300; lima.Q.value = 0.5;
        fil.connect(empuje); empuje.connect(sat); sat.connect(lima); cola = lima;
      }
      cola.connect(trem); trem.connect(vol); vol.connect(env); env.connect(pan); enviar(pan, 0.5, 0.9);
      const lfo = ctx.createOscillator(), lfoA = ctx.createGain(), lfoF = ctx.createGain();
      lfo.type = 'sine'; lfoA.gain.value = 0.32; lfoF.gain.value = 420;
      lfo.connect(lfoA); lfoA.connect(trem.gain); lfo.connect(lfoF); lfoF.connect(fil.frequency);
      vive(lfo, [t, null]);
      const oscs = [];
      voces().forEach((n, v) => {
        const g = ctx.createGain(); g.gain.value = v === 2 ? 0.062 : 0.09; g.connect(fil);
        [-1, 1].forEach((l) => {
          const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(n); o.detune.value = l * azar(5, 9);
          o.connect(g); vive(o, [t, null]); oscs.push({ o, v });
        });
      });
      const afinar = (tau) => { const ns = voces(); oscs.forEach(({ o, v }) => o.frequency.setTargetAtTime(hz(ns[v]), ctx.currentTime, tau)); };
      function mover(a, xx) {
        donde = cero1(a); xx = cero1(xx);
        const ahora = ctx.currentTime;
        lfo.frequency.setTargetAtTime(0.35 * Math.pow(8 / 0.35, xx), ahora, 0.06); // de 0,35 a 8 oscilaciones por segundo
        vol.gain.setTargetAtTime((1 - 0.6 * xx) * nivel, ahora, 0.08);
        fil.frequency.setTargetAtTime(780 + 520 * xx, ahora, 0.1);
        if (pan.pan) pan.pan.setTargetAtTime(lado(xx * 2 - 1), ahora, 0.1);
      }
      mover(alto, x);
      // Cada 120 ms: si el dedo pide otra nota, da un solo paso hacia ella; si cambió el acorde, toma sus notas.
      const vigia = setInterval(() => {
        const j = acordeAhora();
        if (j !== ia) { ia = j; lista = delAcorde(j); paso = Math.min(paso, lista.length - 5); afinar(0.35); }
        const quiere = Math.round(donde * (lista.length - 5));
        if (quiere !== paso) { paso += quiere > paso ? 1 : -1; afinar(0.07); }
      }, 120);
      let suelto = false;
      function soltar() {
        if (suelto) return;
        suelto = true; clearInterval(vigia);
        const ahora = ctx.currentTime, g = env.gain;
        if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(ahora); else { const v = g.value; g.cancelScheduledValues(ahora); g.setValueAtTime(v, ahora); }
        g.linearRampToValueAtTime(0, ahora + 1.4);
        oscs.forEach(({ o }) => { try { o.stop(ahora + 1.5); } catch (e) { /* ya paró */ } });
        try { lfo.stop(ahora + 1.5); } catch (e) { /* ya paró */ }
      }
      return { mover, soltar };
    }
    // La melodía de la app se calla (fundido) mientras alguien toca mucho, y vuelve después.
    function melodia(si) {
      const ahora = ctx.currentTime, g = melG.gain;
      if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(ahora); else { const v = g.value; g.cancelScheduledValues(ahora); g.setValueAtTime(v, ahora); }
      g.linearRampToValueAtTime(si ? 1 : 0, ahora + (si ? 2.5 : 1.5));
    }

    function hasta(T) {
      const ahora = ctx.currentTime + 0.05;
      tAcorde = Math.max(tAcorde, ahora - ACORDE); tFrase = Math.max(tFrase, ahora); tOla = Math.max(tOla, ahora);
      while (tAcorde < T) { colchon(iAcorde++, Math.max(tAcorde, ahora)); tAcorde += ACORDE; }
      while (tFrase < T) frase();
      while (tOla < T) { const d = azar(8, 13); ola(tOla, d); tOla += d * azar(0.96, 1.05); }
      if (modo === 'fantasma') { tViento = Math.max(tViento, ahora); while (tViento < T) { const d = azar(3.5, 7.5); rafaga(tViento, d); tViento += d; } }
      if (conFiesta) { tFiesta = Math.max(tFiesta, ahora); while (tFiesta < T) { golpeFiesta(tFiesta, kFiesta++); tFiesta += PULSO / 2; } }
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
    return { hasta, nivel, gaviota, cerrar, master, toque, sostener, melodia, trueno, aviso, canon, fanfarria, golpe, fuego, modo: cambiarModo, guitarra: (si) => { conGuitarra = !!si; }, fiesta: (si) => { conFiesta = !!si; } };
  }

  // ---------- encendido y apagado ----------
  const CLAVE = 'colonia.musica';
  let enPortada = false, motor = null, reloj = null, corte = null, modoQuiere = 'normal', guitarraQuiere = false, fiestaQuiere = false;
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
      tocadas = 0; callada = false;
      motor = crearMotor(c, c.destination);
      motor.modo(modoQuiere); motor.guitarra(guitarraQuiere); motor.fiesta(fiestaQuiere);
      motor.hasta(c.currentTime + 5);
      reloj = setInterval(() => motor && motor.hasta(c.currentTime + 5), 800);
    }
    motor.nivel(0.82, 3.2);
    try { localStorage.setItem('colonia.sono', new Date().toISOString().slice(0, 10)); } catch (e) { /* nada */ }
    avisoSilencio();
  }
  // En iPhone la música de la app respeta el modo silencio, y desde acá no hay forma de saber si está puesto. Las primeras
  // veces que suena, aparece un rato el aviso para que suene igual.
  const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let avisado = false;
  function avisoSilencio() {
    const a = document.getElementById('silencio');
    if (!a || avisado || !IOS || !navigator.audioSession || !motor || corte || !quiere()) return;
    if (window.SONIDO && SONIDO.sonarIgual && SONIDO.sonarIgual()) return;
    let n = 0;
    try { n = +localStorage.getItem('colonia.silencioAvisos') || 0; localStorage.setItem('colonia.silencioAvisos', String(n + 1)); } catch (e) { /* nada */ }
    if (n >= 8) return;
    avisado = true;
    a.hidden = false;
    setTimeout(() => { a.hidden = true; }, 16000);
  }
  function apagar(seg) {
    if (!motor || corte) return;
    motor.nivel(0, seg);
    corte = setTimeout(() => {
      clearInterval(reloj); reloj = null; corte = null;
      if (motor) { motor.cerrar(); motor = null; }
    }, seg * 1000 + 150);
  }
  // Si alguien toca más de 10 notas seguidas, la melodía de la app se va con un fundido; 2 s después de la última nota
  // (o de soltar el dedo apoyado) vuelve. Cuentan también las notas de los amigos que miran el mar al mismo tiempo.
  let tocadas = 0, callada = false, quietoT = null, sosteniendo = 0;
  function esperar() { clearTimeout(quietoT); if (!sosteniendo) quietoT = setTimeout(volverMelodia, 2000); }
  function volverMelodia() { tocadas = 0; if (callada) { callada = false; if (motor) motor.melodia(true); } }
  function actividad() {
    tocadas++;
    if (tocadas > 10 && !callada && motor) { callada = true; motor.melodia(false); }
    esperar();
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
    if (!box || turno) return;
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
    entrar() { enPortada = true; avisado = false; gaviotasOn(); acomodar(); },
    salir() {
      if (!enPortada) return;
      enPortada = false; document.body.classList.remove('quieto');
      gaviotasOff(); acomodar();
    },
    alternar,
    // p: de -1 (izquierda) a 1 (derecha); alto: de 0 (abajo de la pantalla) a 1 (arriba); cuanto: volumen (los amigos, un poco más bajo).
    toque(p, alto, cuanto) { if (motor && !corte) { motor.toque(p, alto == null ? 0.5 : alto, cuanto || 1); actividad(); } },
    // El colchón del dedo apoyado. alto: 0 abajo, 1 arriba (la nota); x: 0 izquierda, 1 derecha (la oscilación).
    sostener(alto, x) {
      if (!motor || corte) return null;
      const pad = motor.sostener(alto, x);
      sosteniendo++; clearTimeout(quietoT);
      let suelto = false;
      return { mover: pad.mover, soltar() { if (suelto) return; suelto = true; pad.soltar(); sosteniendo = Math.max(0, sosteniendo - 1); esperar(); } };
    },
    bandada() { soltar(0); setTimeout(() => enPortada && soltar(0.05), 900); },
    // El barco fantasma: la música se pone tensa (y vuelve). Los truenos suenan "demora" segundos después.
    fantasma(si) { modoQuiere = si ? 'fantasma' : 'normal'; if (motor) motor.modo(modoQuiere); },
    trueno(demora, fuerza) { const c = ctx(); if (motor && !corte && c) motor.trueno(c.currentTime + (demora || 0), fuerza == null ? 1 : fuerza); },
    // El Holandés Laburante: el aviso (arranca la pelea, o apunta), el cañonazo, la fanfarria al hundirlo y cada toque.
    aviso() { if (motor && !corte) motor.aviso(); },
    canon() { if (motor && !corte) motor.canon(); },
    fanfarria() { if (motor && !corte) motor.fanfarria(); },
    golpe() { if (motor && !corte) motor.golpe(); },
    // La guitarra del fogón (cuando alguien que la tiene está en la ronda de noche).
    guitarra(si) { guitarraQuiere = !!si; if (motor) motor.guitarra(guitarraQuiere); },
    // El parlante con luces (de noche): bombo, platillo y bajo. Y una bengala que explota.
    fiesta(si) { fiestaQuiere = !!si; if (motor) motor.fiesta(fiestaQuiere); },
    fuego() { if (motor && !corte) motor.fuego(); },
    sonando: () => !!motor && !corte,
    _motor: crearMotor, // para medir la música sin parlantes
  };
})();
