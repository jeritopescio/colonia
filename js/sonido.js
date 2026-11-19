/* Sonidos de Colonia: todo sintetizado con Web Audio, sin archivos.
   plop = agarrar algo del altarcito. trtss = cae en la arena. chap = cae al agua.
   si / no = botones: cortitos y secos. si va en el medio; no es un "prp" grave.
   monedas = escalas rápidas en mayor, cada nota con su novena arriba, y un acorde mayor con 9na al final. */
window.SONIDO = (function () {
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, out = null, seco = null, noise = null, pend = null;
  if (navigator.audioSession) { try { navigator.audioSession.type = 'ambient'; } catch (e) { /* no pasa nada */ } } // no corta la música y respeta el silencio

  function init() {
    if (ctx || !AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = 0.002; comp.release.value = 0.12;
    out = ctx.createGain(); out.gain.value = 0.55;
    seco = ctx.createGain(); seco.gain.value = 0.55; seco.connect(comp); // sin eco
    // un eco cortito para que las monedas brillen
    const wet = ctx.createGain(); wet.gain.value = 0.16;
    const delay = ctx.createDelay(0.4); delay.delayTime.value = 0.095;
    const fb = ctx.createGain(); fb.gain.value = 0.26;
    out.connect(comp); out.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(comp);
    comp.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  // El navegador solo deja sonar después de que tocás algo.
  function unlock() {
    init();
    if (!ctx) return;
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    if (pend && ctx.state === 'running') { const p = pend; pend = null; if (performance.now() - p.t < 12000) p.fn(); }
  }
  ['pointerdown', 'pointerup', 'touchend', 'keydown'].forEach((ev) => addEventListener(ev, unlock, { capture: true, passive: true }));

  function run(fn, keep) {
    init();
    if (!ctx) return;
    if (ctx.state === 'running') { fn(); return; }
    let done = false;
    ctx.resume().then(() => { if (!done && ctx.state === 'running') { done = true; pend = null; fn(); } }).catch(() => {});
    if (keep) pend = { fn: () => { if (!done) { done = true; fn(); } }, t: performance.now() };
  }

  function grain(t, dur, peak, type, freq, q) {
    const s = ctx.createBufferSource(); s.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(seco);
    s.start(t, Math.random() * 0.8, dur + 0.02);
  }

  // Agarrar: gotita que sube de tono.
  function plop() {
    run(() => {
      const t = ctx.currentTime + 0.002;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(240, t);
      o.frequency.exponentialRampToValueAtTime(860, t + 0.075);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.75, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      o.connect(g); g.connect(seco); o.start(t); o.stop(t + 0.15);
    });
  }

  // Caer en la arena: "trt" de granitos y "sss" que se apaga. fuerza va de 0 a 1.
  function trtss(fuerza = 0.5) {
    run(() => {
      const t = ctx.currentTime + 0.002, v = 0.3 + 0.5 * Math.min(1, fuerza);
      grain(t, 0.045, v * 0.9, 'lowpass', 520, 0.7); // el golpe sordo
      [0, 0.03, 0.058, 0.084].forEach((d, i) => grain(t + d, 0.03, v * (0.8 - i * 0.14), 'bandpass', 1900 + i * 420 + Math.random() * 300, 1.3));
      grain(t + 0.095, 0.2 + 0.1 * fuerza, v * 0.34, 'highpass', 4800, 0.6);
    });
  }

  // Caer al agua: un bloop y unas gotas.
  function chap(fuerza = 0.5) {
    run(() => {
      const t = ctx.currentTime + 0.002, v = 0.25 + 0.4 * Math.min(1, fuerza);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(115, t + 0.09);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      o.connect(g); g.connect(seco); o.start(t); o.stop(t + 0.12);
      grain(t + 0.02, 0.09, v * 0.5, 'bandpass', 1500, 0.8);
      grain(t + 0.06, 0.13, v * 0.28, 'highpass', 3600, 0.6);
    });
  }

  // Botón que dice que sí: un toquecito de tono medio, 55 ms.
  function si() {
    run(() => {
      const t = ctx.currentTime + 0.001;
      [[1, 'triangle', 0.42, 0.055], [2, 'sine', 0.1, 0.032]].forEach(([m, type, a, d]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(490 * m, t); o.frequency.exponentialRampToValueAtTime(610 * m, t + 0.035);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(a, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g); g.connect(seco); o.start(t); o.stop(t + d + 0.01);
      });
    });
  }

  // Botón que dice que no: "prp", grave y con tres golpecitos, menos de 110 ms.
  function no() {
    run(() => {
      const t = ctx.currentTime + 0.001;
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'square'; o.frequency.setValueAtTime(96, t); o.frequency.exponentialRampToValueAtTime(68, t + 0.1);
      f.type = 'lowpass'; f.frequency.value = 430; f.Q.value = 0.8;
      g.gain.setValueAtTime(0.0001, t);
      [[0, 0.62], [0.033, 0.46], [0.066, 0.52]].forEach(([d, a]) => {
        g.gain.exponentialRampToValueAtTime(a, t + d + 0.004);
        g.gain.exponentialRampToValueAtTime(0.05, t + d + 0.027);
      });
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.105);
      o.connect(f); f.connect(g); g.connect(seco); o.start(t); o.stop(t + 0.115);
    });
  }

  const MAYOR = [0, 2, 4, 5, 7, 9, 11];
  const semi = (g) => 12 * Math.floor(g / 7) + MAYOR[((g % 7) + 7) % 7];

  function coin(t, f, peak, dur) {
    [[1, 'triangle', 1], [2, 'sine', 0.42], [3.01, 'sine', 0.16]].forEach(([m, type, a], i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = f * m;
      const d = dur / (1 + i * 0.7);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak * a, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.02);
    });
  }

  // n = cuántas monedas: más monedas, escala más larga. dir = 1 ganás (sube), -1 gastás (baja).
  function monedas(n = 10, dir = 1) {
    run(() => {
      const tonica = 349.23 * Math.pow(2, [0, 2, 4, 5, 7][Math.floor(Math.random() * 5)] / 12); // de fa a do, en mayor
      const hz = (g) => tonica * Math.pow(2, semi(g) / 12);
      const largo = Math.round(Math.max(14, Math.min(30, 12 + n * 0.75)));
      const paso = 0.036, alto = 22; // termina en la 9na, tres octavas arriba
      const t0 = ctx.currentTime + 0.01;
      for (let i = 0; i < largo; i++) {
        const g = dir > 0 ? alto - largo + 1 + i : alto - 8 - i;
        const t = t0 + i * paso + Math.random() * 0.003;
        const crece = 0.11 + 0.1 * (i / largo);
        coin(t, hz(g), crece, 0.11);
        if (hz(g + 8) < 5200) coin(t + 0.004, hz(g + 8), crece * 0.42, 0.08); // la novena arriba
      }
      // Remate: arpegio mayor con 7ma y 9na.
      const fin = t0 + largo * paso + 0.015, base = dir > 0 ? 7 : 0;
      [0, 2, 4, 6, 8].forEach((g, i) => coin(fin + i * 0.028, hz(base + g), 0.13, 0.55 - i * 0.04));
    }, true);
  }

  // La música del inicio usa el mismo contexto de audio.
  const audio = () => { init(); return ctx; };
  return { plop, trtss, chap, si, no, monedas, audio };
})();
