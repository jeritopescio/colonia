/* Dibujos de Colonia: las cosas del altar playero y la foto del 8/12.
   Cada cosa es un SVG con su propia caja (viewBox). El ancho en la escena sale de esa caja: ancho/400 del altar.
   k = color elegido (solo en las cosas que se pueden pintar). */
window.ARTE = (function () {
  const INK = '#43365a', CR = '#fffaf1', AR = '#f4e3c5', WOOD = '#b08868', WOOD2 = '#8e6b52';
  const f = (n) => +n.toFixed(1);

  function starPath(cx, cy, R, r, rot) {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = (rot + i * 36) * Math.PI / 180, rr = i % 2 ? r : R;
      d += (i ? 'L' : 'M') + f(cx + rr * Math.cos(a)) + ' ' + f(cy + rr * Math.sin(a)) + ' ';
    }
    return d + 'Z';
  }
  function leaf(x, y, s) {
    const parts = [[-90, 1], [-62, 0.78], [-118, 0.78], [-34, 0.52], [-146, 0.52], [-8, 0.3], [-172, 0.3]].map(([a, l]) => {
      const L = 17 * s * l, r = a * Math.PI / 180, cx = f(x + Math.cos(r) * L / 2), cy = f(y + Math.sin(r) * L / 2);
      return `<ellipse cx="${cx}" cy="${cy}" rx="${f(L / 2)}" ry="${f(L / 8 + 0.8)}" transform="rotate(${a} ${cx} ${cy})" fill="#7fbf6a" stroke-width="1.1"/>`;
    }).join('');
    return parts + `<path d="M${x} ${y} l-2 6" fill="none" stroke-width="1.4"/>`;
  }
  function cat(body, stripe, deco = '') {
    return `<path d="M40 66 Q61 68 55 44" fill="none" stroke="${INK}" stroke-width="8"/><path d="M40 66 Q61 68 55 44" fill="none" stroke="${body}" stroke-width="4.6"/>
      <path d="M14 70 Q8 42 30 34 Q52 42 46 70 Z" fill="${body}"/>
      <path d="M19 50 q4 2 7 0 M34 50 q4 2 7 0 M17 58 q5 2 8 0 M35 58 q5 2 8 0" fill="none" stroke="${stripe}" stroke-width="2"/>
      <ellipse cx="24" cy="69" rx="5.5" ry="3.5" fill="${body}"/><ellipse cx="36" cy="69" rx="5.5" ry="3.5" fill="${body}"/>
      <path d="M15 22 L16 5 L28 15 Z" fill="${body}"/><path d="M45 22 L44 5 L32 15 Z" fill="${body}"/>
      <path d="M18 17 L18.5 10 L24 14 Z" fill="#f7b3c6" stroke="none"/><path d="M42 17 L41.5 10 L36 14 Z" fill="#f7b3c6" stroke="none"/>
      <ellipse cx="30" cy="25" rx="16" ry="13" fill="${body}"/>
      <path d="M26 14 L27 19 M30 12.5 V18.5 M34 14 L33 19" fill="none" stroke="${stripe}" stroke-width="2"/>
      <path d="M22 25.5 q2.5 -2.6 5 0 M33 25.5 q2.5 -2.6 5 0" fill="none" stroke-width="1.8"/>
      <path d="M28.6 29.5 h2.8 l-1.4 1.9 Z" fill="#f39aa8" stroke-width="1"/>
      <path d="M30 31.4 v1.2 q-2 2 -3.8 .4 M30 32.6 q2 2 3.8 .4" fill="none" stroke-width="1.2"/>
      <path d="M13 28 H20 M13 31.5 L20 30.5 M47 28 H40 M47 31.5 L40 30.5" fill="none" stroke-width="1"/>
      <circle cx="21.5" cy="31" r="2.2" fill="#f7b3c6" stroke="none" opacity=".75"/><circle cx="38.5" cy="31" r="2.2" fill="#f7b3c6" stroke="none" opacity=".75"/>${deco}`;
  }

  // [ancho, alto, dibujo(k)]
  const ITEMS = {
    sombrilla: [140, 152, (k) => `<ellipse cx="70" cy="147" rx="16" ry="4.5" fill="${AR}"/>
      <rect x="67.5" y="26" width="5" height="121" rx="2.5" fill="${WOOD}"/>
      <path d="M8 62 Q70 -6 132 62 Z" fill="${k}"/>
      <path d="M70 28 L28.7 62 L49.3 62 Z M70 28 L70 62 L90.7 62 Z M70 28 L111.3 62 L132 62 Q101 28 70 28 Z" fill="${CR}" stroke="none"/>
      <path d="M70 28 L28.7 62 M70 28 L49.3 62 M70 28 V62 M70 28 L90.7 62 M70 28 L111.3 62" fill="none" stroke-width="1.3"/>
      <path d="M8 62 Q70 -6 132 62 Z" fill="none"/>
      <path d="M8 62 ${'q10.33 10 20.67 0 '.repeat(6)}" fill="${k}"/>
      <circle cx="70" cy="26" r="4.5" fill="#ffe39a"/>`],

    carpa: [240, 184, (k) => {
      let roof = '';
      for (let i = 0; i < 8; i++) {
        const t0 = 58 + i * 15.5, t1 = t0 + 15.5, b0 = 18 + i * 25.5, b1 = b0 + 25.5;
        roof += `<path d="M${f(t0)} 18 L${f(t1)} 18 L${f(b1)} 60 L${f(b0)} 60 Z" fill="${i % 2 ? CR : k}" stroke="none"/>`;
      }
      return `<path d="M10 180 H230" fill="none" stroke-width="1.5"/>
        <rect x="36" y="62" width="168" height="116" fill="#efe2cd"/>
        <path d="M60 178 Q120 150 180 178" fill="#e6d6bd" stroke="none"/>
        <rect x="30" y="54" width="6" height="126" rx="2" fill="${WOOD}"/><rect x="204" y="54" width="6" height="126" rx="2" fill="${WOOD}"/>
        <path d="M36 64 H72 Q60 100 55 122 Q51 150 57 178 H36 Z" fill="${k}"/>
        <path d="M204 64 H168 Q180 100 185 122 Q189 150 183 178 H204 Z" fill="${k}"/>
        <path d="M52 120 q5 3 10 0 M178 120 q5 3 10 0" fill="none" stroke="${CR}" stroke-width="3"/>
        ${roof}<path d="M58 18 L182 18 L222 60 L18 60 Z" fill="none"/>
        <path d="M18 60 ${'q10.2 12 20.4 0 '.repeat(10)}" fill="${k}"/>
        <path d="M120 18 V1" fill="none"/><path d="M120 1.5 L139 6 L120 11 Z" fill="#ffe39a"/>`;
    }],

    reposera: [130, 100, (k) => `<path d="M24 96 L50 60 M98 96 L72 62 M28 60 L80 66 M80 66 L108 18" fill="none" stroke="${WOOD2}" stroke-width="4.5"/>
      <path d="M26 56 Q54 72 80 61 L104 12 L115 17 L89 70 Q56 84 27 66 Z" fill="${k}"/>
      <path d="M31 62 Q56 76 84 65 L109 15" fill="none" stroke="${CR}" stroke-width="3" stroke-dasharray="7 6"/>`],

    tabla: [44, 142, (k) => `<path d="M22 4 C38 22 40 72 36 124 L8 124 C4 72 6 22 22 4 Z" fill="${k}"/>
      <path d="M22 10 V120" fill="none" stroke="${CR}" stroke-width="2"/>
      <path d="M9 52 Q22 47 35 52 L35.4 60 Q22 55 8.6 60 Z" fill="${CR}" stroke="none"/>
      <path d="M22 4 C38 22 40 72 36 124 L8 124 C4 72 6 22 22 4 Z" fill="none"/>
      <path d="M2 140 Q6 121 22 122 Q38 121 42 140 Z" fill="${AR}"/>`],

    heladerita: [100, 86, (k) => `<path d="M24 36 L40 8 L56 36 Z" fill="${CR}"/><path d="M30 27 Q35 23 40 27 T50 27" fill="none" stroke="#7fbf6a" stroke-width="3"/>
      <path d="M46 36 L64 12 L80 36 Z" fill="${CR}"/><path d="M53 29 L73 29" fill="none" stroke="#f3a3a8" stroke-width="3"/>
      <rect x="10" y="32" width="80" height="50" rx="9" fill="${k}"/>
      <rect x="10" y="32" width="80" height="14" rx="7" fill="${CR}"/>
      <path d="M30 33 V22 Q30 18 34 18 H66 Q70 18 70 22 V33" fill="none" stroke-width="3"/>
      <path d="M50 62 C46 57 40 60 43 65 L50 72 L57 65 C60 60 54 57 50 62 Z" fill="${CR}"/>`],

    toalla: [160, 46, (k) => `<path d="M20 8 L152 8 L142 40 L8 40 Z" fill="${k}"/>
      <path d="M36 8 H48 L36 40 H24 Z M124 8 H136 L126 40 H112 Z" fill="${CR}" stroke="none"/>
      <path d="M20 8 L152 8 L142 40 L8 40 Z" fill="none"/>
      <path d="M10 41 v4 M16 41 v4 M22 41 v4 M128 41 v4 M134 41 v4 M140 41 v4" fill="none" stroke-width="1.4"/>`],

    sandia: [70, 44, () => `<path d="M4 8 A31 31 0 0 0 66 8 Z" fill="#8fcf8a"/>
      <path d="M9 8 A26 26 0 0 0 61 8 Z" fill="#eaf7dc" stroke="none"/><path d="M12 8 A23 23 0 0 0 58 8 Z" fill="#f47f86" stroke="none"/>
      <g fill="${INK}" stroke="none"><ellipse cx="25" cy="15" rx="1.6" ry="2.4"/><ellipse cx="35" cy="21" rx="1.6" ry="2.4"/><ellipse cx="45" cy="15" rx="1.6" ry="2.4"/><ellipse cx="30" cy="11" rx="1.4" ry="2"/><ellipse cx="40" cy="11" rx="1.4" ry="2"/></g>
      <path d="M4 8 H66" fill="none"/>`],

    futbol: [50, 50, () => `<circle cx="25" cy="25" r="22" fill="#fff"/>
      <path d="M25 17.5 L32.1 22.7 L29.4 31.1 L20.6 31.1 L17.9 22.7 Z" fill="${INK}"/>
      <path d="M25 17.5 V3.5 M32.1 22.7 L45 18.5 M29.4 31.1 L37.3 42 M20.6 31.1 L12.7 42 M17.9 22.7 L5 18.5" fill="none" stroke-width="1.6"/>
      <path d="M33 4.8 L38.6 8.9 L36 12 L31 10.4 Z M45.9 30 L42.5 36.5 L39 34 L41 29 Z M17.6 45.6 L10.4 42 L12.7 38.8 L18 40.5 Z M3.6 28.5 L4.6 21 L8.2 22.4 L7.8 27.7 Z M18.6 3.9 L14.3 9.8 L11.6 6.9 L13.8 4.6 Z" fill="${INK}" stroke="none"/>`],

    basquet: [50, 50, () => `<circle cx="25" cy="25" r="22" fill="#f39a5a"/>
      <path d="M25 3 V47 M3 25 H47 M10 9 Q22 25 10 41 M40 9 Q28 25 40 41" fill="none" stroke-width="1.6"/>`],

    voley: [50, 50, (k) => `<circle cx="25" cy="25" r="22" fill="${CR}"/>
      <path d="M25 25 Q14 12 22 3.2 A22 22 0 0 1 46.6 21 Q34 17 25 25 Z" fill="${k}" stroke-width="1.4"/>
      <path d="M25 25 Q27 40 14 44 A22 22 0 0 1 3.4 29 Q16 33 25 25 Z" fill="#a9d6f0" stroke-width="1.4"/>
      <circle cx="25" cy="25" r="22" fill="none"/>`],

    mate: [66, 84, (k) => `<rect x="6" y="16" width="22" height="64" rx="6" fill="${k}"/>
      <rect x="8" y="5" width="18" height="13" rx="4" fill="#d9d4e4"/><path d="M26 9 h5 v5 h-5" fill="#d9d4e4"/>
      <path d="M10 30 h14 M10 66 h14" fill="none" stroke="${CR}" stroke-width="3"/>
      <path d="M38 54 Q33 82 50 82 Q67 82 62 54 Z" fill="${WOOD}"/>
      <path d="M41 62 q9 4 18 0" fill="none" stroke="${CR}" stroke-width="2" opacity=".6"/>
      <ellipse cx="50" cy="54" rx="12" ry="4" fill="#8cc275"/>
      <path d="M53 55 L61 28" fill="none" stroke="${INK}" stroke-width="4.6"/><path d="M53 55 L61 28" fill="none" stroke="#d6dbe3" stroke-width="2.4"/>`],

    balde: [64, 60, (k) => `<path d="M57 6 L51 36" fill="none" stroke="${INK}" stroke-width="5"/><path d="M57 6 L51 36" fill="none" stroke="${WOOD}" stroke-width="2.6"/>
      <path d="M44 34 Q44 52 51 52 Q58 52 58 36 Z" fill="#ffe39a"/>
      <path d="M8 24 L44 24 L40 57 L12 57 Z" fill="${k}"/>
      <rect x="6" y="21" width="40" height="6" rx="3" fill="${k}"/>
      <path d="M10 23 Q26 2 42 23" fill="none" stroke-width="1.6"/>
      <path d="M14 40 h24" fill="none" stroke="${CR}" stroke-width="3"/>`],

    tony: [60, 74, () => cat('#b8b6c4', '#6f6a80')],
    feluchis: [60, 74, () => cat('#f3d58f', '#c9a14e', '<path d="M38 12 l5 -3 v6 Z M38 12 l-5 -3 v6 Z" fill="#f7b3c6" stroke-width="1.2"/><circle cx="38" cy="12" r="1.6" fill="#f7b3c6" stroke-width="1"/>')],
    pompi: [74, 54, () => `<path d="M60 50 Q72 48 70 38 Q69 34 65 36 Q66 44 56 46 Z" fill="#f4a259"/>
      <path d="M10 50 Q6 28 34 26 Q66 24 66 46 Q66 51 60 51 H15 Q10 51 10 50 Z" fill="#f4a259"/>
      <path d="M42 30 q2.5 5 0 10 M50 30 q2.5 5 0 10 M58 33 q2 4 0 8" fill="none" stroke="#c86b2a" stroke-width="2"/>
      <ellipse cx="28" cy="50" rx="6" ry="3" fill="#f4a259"/>
      <path d="M9 22 L10 6 L21 15 Z" fill="#f4a259"/><path d="M37 22 L36 6 L25 15 Z" fill="#f4a259"/>
      <path d="M12 17 L12.5 10 L18 14 Z M34 17 L33.5 10 L28 14 Z" fill="#f7b3c6" stroke="none"/>
      <ellipse cx="23" cy="26" rx="15" ry="12" fill="#f4a259"/>
      <path d="M19 16 L20 21 M23 14.5 V20.5 M27 16 L26 21" fill="none" stroke="#c86b2a" stroke-width="2"/>
      <path d="M15.5 26.5 q2.5 -2.6 5 0 M25.5 26.5 q2.5 -2.6 5 0" fill="none" stroke-width="1.8"/>
      <path d="M21.6 30.3 h2.8 l-1.4 1.9 Z" fill="#f39aa8" stroke-width="1"/>
      <circle cx="15" cy="31" r="2.1" fill="#f7b3c6" stroke="none" opacity=".75"/><circle cx="31" cy="31" r="2.1" fill="#f7b3c6" stroke="none" opacity=".75"/>
      <path d="M7 29 H13 M7 32 L13 31.2 M39 29 H33 M39 32 L33 31.2" fill="none" stroke-width="1"/>`],

    tulio: [114, 60, () => `<g transform="translate(4 2)">
      <path d="M92 26 Q102 18 106 7" fill="none" stroke="${INK}" stroke-width="6.5"/><path d="M92 26 Q102 18 106 7" fill="none" stroke="#a8683f" stroke-width="3.4"/>
      <rect x="40" y="34" width="8" height="19" rx="3.5" fill="#8a532f"/><rect x="74" y="34" width="8" height="19" rx="3.5" fill="#8a532f"/>
      <rect x="24" y="18" width="74" height="24" rx="12" fill="#a8683f"/>
      <path d="M36 37 Q62 44 88 37" fill="none" stroke="#c98d5f" stroke-width="3"/>
      <rect x="32" y="36" width="8" height="19" rx="3.5" fill="#a8683f"/><rect x="84" y="36" width="8" height="19" rx="3.5" fill="#a8683f"/>
      <ellipse cx="20" cy="22" rx="14" ry="11" fill="#a8683f"/>
      <ellipse cx="9" cy="28" rx="9" ry="6" fill="#a8683f"/>
      <circle cx="2.6" cy="26.4" r="2.7" fill="${INK}"/>
      <circle cx="15" cy="19" r="1.9" fill="${INK}" stroke="none"/>
      <path d="M22 14 Q33 15 30 36 Q22 36 19 22 Z" fill="#7d4a2b"/>
      <path d="M31 13 Q36 24 32 34" fill="none" stroke="#f6a38f" stroke-width="3.5"/></g>`],

    renu: [70, 78, () => `<path d="M50 66 Q62 62 60 52" fill="none" stroke="${INK}" stroke-width="7"/><path d="M50 66 Q62 62 60 52" fill="none" stroke="#fbf6ee" stroke-width="4"/>
      <path d="M18 76 Q12 46 35 40 Q58 46 52 76 Z" fill="#fbf6ee"/>
      <path d="M40 50 Q51 52 51 63 Q44 63 40 56 Z" fill="#b8703f" stroke="none"/><ellipse cx="25" cy="64" rx="5" ry="4" fill="#b8703f" stroke="none"/>
      <ellipse cx="28" cy="74" rx="5.5" ry="3.5" fill="#fbf6ee"/><ellipse cx="42" cy="74" rx="5.5" ry="3.5" fill="#fbf6ee"/>
      <ellipse cx="35" cy="27" rx="15" ry="14" fill="#fbf6ee"/>
      <path d="M22 22 Q35 8 48 22 Q42 18 35 19 Q28 18 22 22 Z" fill="#b8703f" stroke="none"/>
      <ellipse cx="29" cy="25" rx="5.2" ry="4.6" fill="#b8703f" stroke="none"/>
      <path d="M21 18 Q9 22 12 41 Q20 41 23 30 Z" fill="#b8703f"/><path d="M49 18 Q61 22 58 41 Q50 41 47 30 Z" fill="#b8703f"/>
      <ellipse cx="35" cy="34" rx="7" ry="5" fill="#fff"/>
      <ellipse cx="35" cy="31.6" rx="2.7" ry="2" fill="${INK}"/>
      <circle cx="29" cy="25" r="1.9" fill="${INK}" stroke="none"/><circle cx="41" cy="25" r="1.9" fill="${INK}" stroke="none"/>
      <path d="M35 36 q-.4 4.5 2 4.5 q2 0 1.2 -3.5" fill="#f39aa8" stroke-width="1"/>`],

    leda: [98, 68, () => `<g transform="translate(2 2)">
      <path d="M84 30 Q94 34 92 47" fill="none" stroke="${INK}" stroke-width="5"/><path d="M84 30 Q94 34 92 47" fill="none" stroke="#fbf6ee" stroke-width="2.6"/>
      <rect x="44" y="40" width="9" height="22" rx="4" fill="#e6dfd3"/><rect x="74" y="40" width="9" height="22" rx="4" fill="#e6dfd3"/>
      <path d="M30 26 Q56 18 84 26 Q91 36 84 46 Q58 52 34 46 Q26 36 30 26 Z" fill="#fbf6ee"/>
      <rect x="38" y="42" width="9" height="21" rx="4" fill="#fbf6ee"/><rect x="68" y="42" width="9" height="21" rx="4" fill="#fbf6ee"/>
      <path d="M5 35 Q3 26 13 16 Q24 7 32 13 Q39 21 35 32 Q27 42 12 41 Q6 40 5 35 Z" fill="#fbf6ee"/>
      <path d="M25 12 L29 1 L35 13 Z" fill="#fbf6ee"/><path d="M28 10 L29.6 5 L32.4 11 Z" fill="#f7b3c6" stroke="none"/>
      <path d="M17 20 l4.6 1.6 -4.6 1.4 Z" fill="${INK}" stroke="none"/>
      <ellipse cx="6.5" cy="34.5" rx="2.7" ry="2.3" fill="${INK}"/>
      <path d="M10 39 q4 2 8 0" fill="none" stroke-width="1.2"/>
      <circle cx="20" cy="29" r="2.4" fill="#f7b3c6" stroke="none" opacity=".7"/>
      <path d="M30 17 Q36 28 32 39" fill="none" stroke="#a9d6f0" stroke-width="3.5"/></g>`],

    zorrito: [66, 72, () => `<path d="M38 66 Q66 70 60 40 Q58 30 50 36 Q56 52 38 58 Z" fill="#f08a4b"/>
      <path d="M58.4 39 Q59 32 53.6 33.6 Q53 37.6 56 41.4 Z" fill="${CR}" stroke="none"/>
      <path d="M16 70 Q10 44 32 38 Q50 44 46 70 Z" fill="#f08a4b"/>
      <path d="M24 46 Q32 66 38 46 Q32 42 24 46 Z" fill="${CR}" stroke="none"/>
      <ellipse cx="24" cy="69" rx="5" ry="3.2" fill="#5b4d72"/><ellipse cx="38" cy="69" rx="5" ry="3.2" fill="#5b4d72"/>
      <path d="M18 22 L15 3 L29 14 Z" fill="#f08a4b"/><path d="M46 22 L49 3 L35 14 Z" fill="#f08a4b"/>
      <path d="M19 17 L17.6 8.6 L24.4 13.6 Z M45 17 L46.4 8.6 L39.6 13.6 Z" fill="#5b4d72" stroke="none"/>
      <path d="M13 22 Q32 6 51 22 Q47 34 32 41 Q17 34 13 22 Z" fill="#f08a4b"/>
      <path d="M19 28 Q32 31 45 28 Q40 37 32 41 Q24 37 19 28 Z" fill="${CR}" stroke="none"/>
      <circle cx="32" cy="38.6" r="2.3" fill="${INK}"/>
      <path d="M22.5 23.5 q2.5 -2.6 5 0 M36.5 23.5 q2.5 -2.6 5 0" fill="none" stroke-width="1.8"/>`],

    liebre: [56, 72, () => `<path d="M21 28 Q12 5 19 2.5 Q26 2 28 25 Z" fill="#b59a7c"/><path d="M27 27 Q30 5 36 4 Q41 6 32 29 Z" fill="#a88d70"/>
      <path d="M19 2.6 Q16.6 6 18.6 9 Q21.6 6.6 22 3.2 Z M36 4.2 Q39.6 6 38.6 9 Q35.6 8 35 5 Z" fill="${INK}" stroke="none"/>
      <path d="M18 70 Q8 50 22 38 Q40 30 48 50 Q52 64 44 70 Z" fill="#b59a7c"/>
      <path d="M17 62 Q21 54 28 56 Q26 66 22 70 Z" fill="#efe4d4" stroke="none"/>
      <circle cx="49" cy="58" r="5" fill="${CR}"/>
      <ellipse cx="22" cy="33" rx="12.5" ry="10" fill="#b59a7c"/>
      <circle cx="17.6" cy="30" r="2" fill="${INK}" stroke="none"/>
      <circle cx="10.6" cy="35" r="1.7" fill="#f39aa8" stroke="none"/>
      <path d="M5 34 H11 M5 37 L11 36" fill="none" stroke-width="1"/>
      <ellipse cx="31" cy="69" rx="9" ry="3" fill="#a88d70"/>`],

    estrella: [50, 48, (k) => `<path d="${starPath(25, 25, 22, 10, -96)}" fill="${k}" stroke-width="2.2"/>
      <g fill="${CR}" stroke="none" opacity=".85"><circle cx="25" cy="13" r="1.4"/><circle cx="35" cy="21" r="1.4"/><circle cx="31" cy="33" r="1.4"/><circle cx="18" cy="33" r="1.4"/><circle cx="14.5" cy="21" r="1.4"/><circle cx="25" cy="25" r="2"/></g>`],

    caracoles: [58, 36, (k) => `<path d="M18 33 L5 16 Q6 4 18 3 Q30 4 31 16 Z" fill="${k}"/>
      <path d="M18 33 L10 7 M18 33 L18 4 M18 33 L26 7" fill="none" stroke-width="1.3"/>
      <path d="M12 30 H24 L22 35 H14 Z" fill="${k}"/>
      <circle cx="42" cy="23" r="11" fill="#f7d9c4"/>
      <path d="M42 23 m0 -2 a2 2 0 1 1 -2 2 a4.5 4.5 0 1 1 4.5 4.5 a7.5 7.5 0 1 1 -7.5 -7.5" fill="none" stroke-width="1.4"/>`],

    lentes: [58, 26, (k) => `<path d="M3 9 H55" fill="none" stroke="${INK}" stroke-width="5.4"/><path d="M3 9 H55" fill="none" stroke="${k}" stroke-width="2.8"/>
      <rect x="6" y="7" width="20" height="15" rx="6.5" fill="#3d3550" stroke="${INK}" stroke-width="5.4"/>
      <rect x="32" y="7" width="20" height="15" rx="6.5" fill="#3d3550" stroke="${INK}" stroke-width="5.4"/>
      <rect x="6" y="7" width="20" height="15" rx="6.5" fill="#3d3550" stroke="${k}" stroke-width="2.8"/>
      <rect x="32" y="7" width="20" height="15" rx="6.5" fill="#3d3550" stroke="${k}" stroke-width="2.8"/>
      <path d="M10 12 h5 M36 12 h5" fill="none" stroke="#fff" stroke-width="2" opacity=".55"/>`],

    protector: [32, 60, (k) => `<rect x="10" y="2" width="12" height="10" rx="2.5" fill="${CR}"/>
      <path d="M6 13 Q6 11 9 11 H23 Q26 11 26 13 L28 54 Q28 58 24 58 H8 Q4 58 4 54 Z" fill="${k}"/>
      <rect x="8" y="24" width="16" height="20" rx="3" fill="${CR}"/>
      <circle cx="16" cy="32" r="4" fill="#f6a38f"/><path d="M11 40 h10" fill="none" stroke-width="1.2"/>`],

    librito: [62, 42, (k) => `<path d="M7 38 L31 9 L55 38 Z" fill="${CR}"/>
      <path d="M12 38 L31 14 L50 38 M17 38 L31 19 L45 38" fill="none" stroke-width="1"/>
      <path d="M2 36 L31 5 L34 8 L7 39 Z" fill="${k}"/><path d="M60 36 L31 5 L28 8 L55 39 Z" fill="${k}"/>`],

    corona: [62, 42, (k) => `<g transform="rotate(-14 31 22)">
      <path d="M12 32 L9 12 L19 20 L27 6 L35 20 L46 10 L45 32 Z" fill="#f5c84c"/>
      <rect x="12" y="26" width="33" height="5" fill="#e3ad35" stroke="none"/>
      <circle cx="9" cy="11" r="2.8" fill="${k}"/><circle cx="27" cy="5" r="2.8" fill="${k}"/><circle cx="46" cy="9" r="2.8" fill="${k}"/>
      <path d="M20 14 l2 -2" fill="none" stroke="#fff" stroke-width="1.6" opacity=".7"/></g>
      <path d="M0 41 Q6 28 31 29 Q56 28 62 41 Z" fill="${AR}"/>
      <path d="M14 36 h2 M40 34 h2 M28 38 h2" fill="none" stroke-width="1.2"/>`],

    puchos: [42, 52, () => `<rect x="12" y="3" width="5" height="14" rx="1" fill="#fff"/><rect x="12" y="3" width="5" height="4" fill="#e8a35a" stroke="none"/>
      <rect x="19" y="6" width="5" height="12" rx="1" fill="#fff"/><rect x="19" y="6" width="5" height="4" fill="#e8a35a" stroke="none"/>
      <rect x="7" y="12" width="28" height="38" rx="2.5" fill="#fff"/>
      <path d="M7 12 H35 V30 L21 22 L7 30 Z" fill="#e0453a"/>
      <path d="M7 18 H35" fill="none" stroke-width="1.2"/><rect x="7" y="12" width="28" height="38" rx="2.5" fill="none"/>`],

    porro: [68, 46, () => `${leaf(22, 40, 1)}
      <path d="M58 24 q-6 -6 0 -10 q6 -4 0 -10" fill="none" stroke="#c9c3d8" stroke-width="2.2"/>
      <path d="M8 36 L56 26 L58 33 L9 41 Z" fill="#fff"/>
      <path d="M8 36 L18 34 L19 39.4 L9 41 Z" fill="#f4e3c5"/>
      <ellipse cx="57.4" cy="29.4" rx="2" ry="3.7" fill="#f46d4a" transform="rotate(-12 57.4 29.4)"/>
      <path d="M28 35 l5 -1 M40 32.4 l5 -1" fill="none" stroke-width="1" opacity=".6"/>`],

    birra: [28, 66, (k) => `<rect x="10.5" y="2" width="7" height="5" rx="1.2" fill="#c9ced6"/>
      <path d="M11 6 H17 V18 Q24 24 24 32 V60 Q24 63 21 63 H7 Q4 63 4 60 V32 Q4 24 11 18 Z" fill="#c07a35"/>
      <rect x="4" y="36" width="20" height="15" fill="${k}"/>
      <path d="M8 14 V22" fill="none" stroke="#fff" stroke-width="1.6" opacity=".55"/>`],

    vino: [28, 72, () => `<rect x="10" y="2" width="8" height="8" rx="1.5" fill="#8c4a6e"/>
      <path d="M11 9 H17 V22 Q24 27 24 36 V67 Q24 70 21 70 H7 Q4 70 4 67 V36 Q4 27 11 22 Z" fill="#5a2d4a"/>
      <rect x="6" y="42" width="16" height="16" rx="1" fill="${CR}"/>
      <path d="M10 48 h8 M10 52 h6" fill="none" stroke-width="1.2"/>
      <path d="M8 30 V38" fill="none" stroke="#fff" stroke-width="1.6" opacity=".4"/>`],

    dados: [58, 38, (k) => {
      const dot = (x, y) => `<circle cx="${x}" cy="${y}" r="2.2"/>`;
      return `<g transform="rotate(-10 16 20)"><rect x="4" y="8" width="24" height="24" rx="5" fill="${k}"/>
        <g fill="${INK}" stroke="none">${dot(10, 14)}${dot(16, 20)}${dot(22, 26)}</g></g>
        <g transform="rotate(12 42 22)"><rect x="31" y="11" width="22" height="22" rx="5" fill="${k}"/>
        <g fill="${INK}" stroke="none">${dot(36.5, 16.5)}${dot(47.5, 16.5)}${dot(42, 22)}${dot(36.5, 27.5)}${dot(47.5, 27.5)}</g></g>`;
    }],

    naipes: [62, 48, () => `<g transform="rotate(-16 31 42)"><rect x="12" y="7" width="22" height="34" rx="3" fill="#fff"/><path d="M23 12 V33 M19 28 H27" fill="none" stroke="#5b8fd1" stroke-width="2.4"/></g>
      <g transform="rotate(2 31 42)"><rect x="20" y="5" width="22" height="34" rx="3" fill="#fff"/><path d="M26 12 H36 Q36 20 31 21 Q26 20 26 12 Z" fill="#f6a38f" stroke-width="1.4"/><path d="M31 21 V28 M27 28.5 H35" fill="none" stroke-width="1.6"/></g>
      <g transform="rotate(18 31 42)"><rect x="28" y="7" width="22" height="34" rx="3" fill="#fff"/><circle cx="39" cy="24" r="6" fill="#ffe39a"/><circle cx="39" cy="24" r="3" fill="none" stroke-width="1.2"/></g>`],

    cuchillo: [62, 28, (k) => `<g transform="rotate(-14 31 14)">
      <path d="M22 9 L56 9 Q59 9 56 12.5 Q46 19 22 18 Z" fill="#e3e7ee"/>
      <path d="M26 11.5 H48" fill="none" stroke="#fff" stroke-width="1.4"/>
      <rect x="4" y="8" width="20" height="11" rx="5.5" fill="${k}"/>
      <path d="M12 12 c-1.6 -1.6 -4 0 -2 2 l2 1.8 2 -1.8 c2 -2 -.4 -3.6 -2 -2 Z" fill="${CR}" stroke-width="1"/></g>`],

    calavera: [42, 42, (k) => `<path d="M7 21 Q7 5 21 5 Q35 5 35 21 Q35 28 30 30 V37 H12 V30 Q7 28 7 21 Z" fill="${CR}"/>
      <ellipse cx="15" cy="21" rx="4.2" ry="4.8" fill="${INK}"/><ellipse cx="27" cy="21" rx="4.2" ry="4.8" fill="${INK}"/>
      <circle cx="16.4" cy="19.4" r="1.4" fill="#fff" stroke="none"/><circle cx="28.4" cy="19.4" r="1.4" fill="#fff" stroke="none"/>
      <path d="M21 26 l-2 3 h4 Z" fill="${INK}"/>
      <path d="M16.5 33 V37 M21 33 V37 M25.5 33 V37" fill="none" stroke-width="1.2"/>
      <g transform="translate(31 7)">${[0, 72, 144, 216, 288].map((a) => `<circle cx="${f(4 * Math.cos(a * Math.PI / 180))}" cy="${f(4 * Math.sin(a * Math.PI / 180))}" r="3.2" fill="${k}" stroke-width="1.2"/>`).join('')}<circle r="2.2" fill="#ffe39a" stroke-width="1.2"/></g>`],
  };

  // Cosas que solo existen como arte de IA: acá va su lado mayor, en la misma escala que los dibujos.
  Object.entries({ heineken: 46, marihuana: 104, lobo: 116, estudiantes: 116, reposeraarg: 100, guitarra: 104, buzo: 78, tejos: 72,
    moto: 130, ps5: 70, fogata: 84, caipirinha: 86, salvavidas: 66, mangrullo: 172, kayak: 138, yate: 150, ballena: 112, sirena: 70,
    delfin: 80, delfinrosa: 80, sombrero: 64, rabas: 70, papas: 64, neoprene: 100, antorchas: 112,
    pure: 72, kuky: 100, botella: 54, galleta: 40, mellis: 118 })
    .forEach(([id, m]) => { ITEMS[id] = [m, m, null]; });
  // Con el arte nuevo cambian las proporciones: estos usan otro lado mayor que su dibujo viejo.
  const LADO = { carpa: 172, sombrilla: 140, tony: 88, feluchis: 84 };

  // Cartelito con el nombre del altar (no se compra).
  // Arte hecho con IA (img/altar). Si una cosa no lo tiene, se usa su dibujo en SVG.
  const IMG = window.ARTE_IMG || {}, V = window.ARTE_IMG_V || 1;
  const dir = (n) => `img/altar/${n}.webp?v=${V}`;
  function pintura(id, k, cls) {
    const [w, h, m] = IMG[id];
    const tinte = m ? `<i style="background:${k || '#f6a38f'};-webkit-mask-image:url(${dir(id + '-m')});mask-image:url(${dir(id + '-m')})"></i>` : '';
    return `<span class="art ai ${cls}" style="--ar:${w}/${h}" aria-hidden="true"><img src="${dir(id)}" alt="" draggable="false">${tinte}</span>`;
  }
  function cartel(name) {
    if (IMG.cartel) {
      const [w, h] = IMG.cartel, fs = name.length > 7 ? 11 : 14;
      return `<span class="art ai cartelito" style="--ar:${w}/${h}" aria-hidden="true"><img src="${dir('cartel')}" alt="" draggable="false"><b style="font-size:${fs}px">${name}</b></span>`;
    }
    const w = Math.max(60, Math.min(110, 14 + name.length * 7.2));
    return `<svg viewBox="0 0 ${f(w + 4)} 58" class="art"><g filter="url(#crayon)" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
      <rect x="${f(w / 2)}" y="22" width="5" height="34" rx="2" fill="${WOOD}"/>
      <rect x="2" y="3" width="${f(w)}" height="24" rx="5" fill="#f2e2c4"/>
      <text x="${f(w / 2 + 2)}" y="20" text-anchor="middle" font-family="Patrick Hand, sans-serif" font-size="14" fill="${INK}" stroke="none">${name}</text></g></svg>`;
  }

  const has = (id) => !!ITEMS[id] && (!!IMG[id] || !!ITEMS[id][2]);
  // Con arte de IA se respeta su forma, y su lado mayor mide lo mismo que el del dibujo original.
  const size = (id) => {
    const it = ITEMS[id], g = IMG[id];
    if (!g) return { w: it[0], h: it[1] };
    const e = (LADO[id] || Math.max(it[0], it[1])) / Math.max(g[0], g[1]);
    return { w: g[0] * e, h: g[1] * e };
  };
  function item(id, k, cls = '') {
    const it = ITEMS[id];
    if (!it) return '';
    if (IMG[id]) return pintura(id, k, cls);
    if (!it[2]) return '';
    return `<svg viewBox="0 0 ${it[0]} ${it[1]}" class="art ${cls}" aria-hidden="true"><g filter="url(#crayon)" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${it[2](k || '#f6a38f')}</g></svg>`;
  }
  // Para meter un dibujo adentro de otro SVG (la foto).
  function nested(id, x, y, w, k) {
    const it = ITEMS[id];
    return `<svg x="${x}" y="${y}" width="${w}" height="${f(w * it[1] / it[0])}" viewBox="0 0 ${it[0]} ${it[1]}" overflow="visible"><g stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${it[2](k || '#f6a38f')}</g></svg>`;
  }

  // ---------- la foto del 8/12 (dibujo provisorio hasta tener los PNG) ----------
  const SHIRTS = { jero: '#a9d6f0', viqui: '#f7b3c6', pachi: '#b6e5cd', juani: '#ffe39a', nico: '#cfc0f0', rochi: '#f6a38f',
    jose: '#9fd3c7', nachote: '#f9c58d', juli: '#c3d7a4', rich: '#e7b7e0', sofi: '#f7b3c6', chino: '#b6e5cd', grego: '#a9d6f0' };
  function head(id, cy, faceUrl) {
    return `<clipPath id="fc-${id}"><circle cx="0" cy="${cy}" r="13"/></clipPath>
      <circle cx="0" cy="${cy}" r="13" fill="${CR}"/>
      <image href="${faceUrl}" x="-13" y="${cy - 13}" width="26" height="26" preserveAspectRatio="xMidYMid slice" clip-path="url(#fc-${id})"/>
      <circle cx="0" cy="${cy}" r="13" fill="none" stroke-width="2.2"/>`;
  }
  function arm(d, c) { return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="7.4"/><path d="${d}" fill="none" stroke="${c}" stroke-width="4.4"/>`; }
  function persona(id, slot, on, faceUrl, label) {
    const c = SHIRTS[id] || '#f7b3c6', pants = '#6f6a80';
    const tr = `translate(${slot.x} ${slot.y})${slot.s ? ` scale(${slot.s})` : ''}${slot.r ? ` rotate(${slot.r})` : ''}`;
    let body = '';
    let top = -76;
    if (slot.pose === 'pie') {
      body = `<rect x="-9" y="-25" width="8" height="24" rx="3.5" fill="${pants}"/><rect x="1" y="-25" width="8" height="24" rx="3.5" fill="${pants}"/>
        <ellipse cx="-5.5" cy="-1" rx="6" ry="3" fill="${INK}"/><ellipse cx="5.5" cy="-1" rx="6" ry="3" fill="${INK}"/>
        ${arm('M-11 -45 Q-19 -35 -15 -26', c)}${arm('M11 -45 Q19 -35 15 -26', c)}
        <path d="M-13 -22 Q-14 -48 0 -50 Q14 -48 13 -22 Z" fill="${c}"/>${head(id, -62, faceUrl)}`;
    } else if (slot.pose === 'agachado') {
      top = -62;
      body = `<ellipse cx="-8" cy="-9" rx="8" ry="6.5" fill="${pants}"/><ellipse cx="8" cy="-9" rx="8" ry="6.5" fill="${pants}"/>
        <ellipse cx="-9" cy="-1" rx="6" ry="3" fill="${INK}"/><ellipse cx="9" cy="-1" rx="6" ry="3" fill="${INK}"/>
        <path d="M-13 -10 Q-14 -34 0 -36 Q14 -34 13 -10 Z" fill="${c}"/>
        ${arm('M-11 -30 Q-16 -20 -9 -15', c)}${arm('M11 -30 Q16 -20 9 -15', c)}${head(id, -48, faceUrl)}`;
    } else if (slot.pose === 'sentado') {
      top = -56;
      body = `<rect x="-9" y="-3" width="8" height="24" rx="3.5" fill="${pants}" transform="rotate(8 -5 -3)"/><rect x="1" y="-3" width="8" height="24" rx="3.5" fill="${pants}" transform="rotate(-6 5 -3)"/>
        <ellipse cx="-8" cy="21" rx="6" ry="3" fill="${INK}"/><ellipse cx="7" cy="21" rx="6" ry="3" fill="${INK}"/>
        ${arm('M-11 -22 Q-20 -12 -14 -3', c)}${arm('M11 -22 Q22 -30 20 -42', c)}
        <path d="M-13 1 Q-14 -26 0 -28 Q14 -26 13 1 Z" fill="${c}"/>${head(id, -40, faceUrl)}`;
    } else { // polaroid pegada (los que juegan a distancia)
      top = -24;
      body = `<rect x="-12" y="-14" width="24" height="29" rx="1.5" fill="#fff"/>
        <clipPath id="fc-${id}"><rect x="-9.5" y="-11.5" width="19" height="19"/></clipPath>
        <rect x="-9.5" y="-11.5" width="19" height="19" fill="${CR}"/>
        <image href="${faceUrl}" x="-9.5" y="-11.5" width="19" height="19" preserveAspectRatio="xMidYMid slice" clip-path="url(#fc-${id})"/>
        <rect x="-6" y="-18" width="12" height="6" fill="#ffe39a" opacity=".85" stroke="none" transform="rotate(-6)"/>`;
    }
    const tag = label ? `<text x="0" y="${top - 4}" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="600" font-size="11" fill="${INK}" stroke="#fff" stroke-width="3" paint-order="stroke">${label}</text>` : '';
    return `<g class="pz-p${on ? '' : ' ghost'}" data-p="${id}" transform="${tr}">${body}${tag}</g>`;
  }
  function pine(x, base, h, c) {
    const w = h * 0.42;
    return `<rect x="${f(x - 2.5)}" y="${f(base - h * 0.22)}" width="5" height="${f(h * 0.22)}" fill="${WOOD2}" stroke="none"/>
      <path d="M${x} ${f(base - h)} L${f(x + w * 0.55)} ${f(base - h * 0.62)} L${f(x + w * 0.35)} ${f(base - h * 0.62)} L${f(x + w * 0.75)} ${f(base - h * 0.4)} L${f(x + w * 0.5)} ${f(base - h * 0.4)} L${f(x + w)} ${f(base - h * 0.2)} L${f(x - w)} ${f(base - h * 0.2)} L${f(x - w * 0.5)} ${f(base - h * 0.4)} L${f(x - w * 0.75)} ${f(base - h * 0.4)} L${f(x - w * 0.35)} ${f(base - h * 0.62)} L${f(x - w * 0.55)} ${f(base - h * 0.62)} Z" fill="${c}" stroke-width="1.6"/>`;
  }
  const FOX = `<g class="pz" data-pz="fox">
      <rect x="58" y="222" width="22" height="18" rx="5" fill="#4a4258"/><rect x="156" y="222" width="22" height="18" rx="5" fill="#4a4258"/>
      <path d="M66 184 L78 150 Q80 146 86 146 H150 Q156 146 158 150 L170 184 Z" fill="#f6f4ef"/>
      <path d="M75 182 L85 154 H151 L161 182 Z" fill="#bfe3f2"/><path d="M92 160 L86 176 M100 160 L96 170" fill="none" stroke="#fff" stroke-width="2.4" opacity=".8"/>
      <ellipse cx="60" cy="180" rx="7" ry="4.5" fill="#f6f4ef"/><ellipse cx="176" cy="180" rx="7" ry="4.5" fill="#f6f4ef"/>
      <path d="M52 228 V196 Q52 186 62 184 L174 184 Q184 186 184 196 V228 Q184 232 180 232 H56 Q52 232 52 228 Z" fill="#f6f4ef"/>
      <rect x="58" y="192" width="22" height="11" rx="4" fill="#fff6c9"/><rect x="156" y="192" width="22" height="11" rx="4" fill="#fff6c9"/>
      <rect x="92" y="194" width="52" height="8" rx="3" fill="#d9d4e4"/>
      <path d="M54 216 H182" fill="none" stroke-width="1.5"/><rect x="100" y="209" width="36" height="11" rx="2" fill="#fff"/></g>`;
  const SANDERO = `<g class="pz" data-pz="sandero">
      <rect x="218" y="222" width="23" height="18" rx="5" fill="#4a4258"/><rect x="323" y="222" width="23" height="18" rx="5" fill="#4a4258"/>
      <path d="M226 182 L238 146 Q240 142 246 142 H318 Q324 142 326 146 L338 182 Z" fill="#cfd4dc"/>
      <path d="M234 180 L244 150 H320 L330 180 Z" fill="#bfe3f2"/><path d="M296 156 L290 172 M304 156 L300 166" fill="none" stroke="#fff" stroke-width="2.4" opacity=".8"/>
      <path d="M240 140 H324" fill="none" stroke-width="3"/>
      <ellipse cx="220" cy="178" rx="7" ry="4.5" fill="#cfd4dc"/><ellipse cx="344" cy="178" rx="7" ry="4.5" fill="#cfd4dc"/>
      <path d="M212 228 V194 Q212 184 222 182 L342 182 Q352 184 352 194 V228 Q352 232 348 232 H216 Q212 232 212 228 Z" fill="#cfd4dc"/>
      <path d="M218 191 L245 193 L243 202 L218 201 Z" fill="#fff6c9"/><path d="M346 191 L319 193 L321 202 L346 201 Z" fill="#fff6c9"/>
      <rect x="256" y="194" width="52" height="9" rx="3" fill="#b9bfc8"/>
      <path d="M214 216 H350" fill="none" stroke-width="1.5"/><rect x="264" y="209" width="36" height="11" rx="2" fill="#fff"/></g>`;
  const TABLA = `<g class="pz" data-pz="tabla"><path d="M262 141 L264 134 M300 141 L298 134" fill="none" stroke-width="2"/>
      <path d="M196 134 Q282 120 368 134 Q282 146 196 134 Z" fill="#f6a38f"/>
      <path d="M204 134 Q282 126 360 134" fill="none" stroke="${CR}" stroke-width="2"/>
      <path d="M352 132 l8 -8 l2 9 Z" fill="#f6a38f"/></g>`;
  function banderines() {
    const letters = 'COLONIA'.split('');
    const cols = ['#f6a38f', '#ffe39a', '#b6e5cd', '#a9d6f0', '#cfc0f0', '#f7b3c6', '#f9c58d'];
    const pts = letters.map((_, i) => { const t = (i + 0.5) / letters.length, x = 40 + t * 320, y = 52 + Math.sin(Math.PI * t) * 22; return [x, y]; });
    return `<g class="pz" data-pz="banderines"><path d="M30 46 Q200 96 370 46" fill="none" stroke-width="1.6"/>
      ${pts.map(([x, y], i) => `<path d="M${f(x - 13)} ${f(y - 2)} L${f(x + 13)} ${f(y - 2)} L${f(x)} ${f(y + 24)} Z" fill="${cols[i]}" stroke-width="1.8"/><text x="${f(x)}" y="${f(y + 12)}" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="11" fill="${INK}" stroke="none">${letters[i]}</text>`).join('')}</g>`;
  }

  // opts: { faces: id => url, pieces: Set de piezas, people: Set de ids que ya aparecen, ref: true para poner nombres }
  function foto(D, opts) {
    const P = opts.pieces, on = (id) => P.has(id);
    const slots = D.FOTO.slots;
    const who = (ids) => opts.nobody ? '' : ids.map((id) => persona(id, slots[id], opts.people.has(id), opts.faces(id), opts.ref ? D.PEOPLE.find((p) => p.id === id).n : '')).join('');
    const ghost = (id, svg) => on(id) ? svg : svg.replace('class="pz"', 'class="pz ghost"');
    const show = (id, svg) => on(id) || opts.ref ? svg : ghost(id, svg);
    const back = ['rich', 'nachote', 'nico'], front = ['juli', 'juani', 'jero', 'viqui'], low = ['pachi', 'rochi'];
    return `<svg viewBox="0 0 400 300" role="img" aria-label="La foto de la colonia antes de volver">
      <defs><linearGradient id="fsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sky-top)"/><stop offset=".55" style="stop-color:var(--sky-mid)"/><stop offset="1" style="stop-color:var(--sky-hor)"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#fsky)"/>
      <g filter="url(#crayon)" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
        <path d="M150 178 V122 L200 88 L250 122 V178 Z" fill="#fbf3e6"/><path d="M140 126 L200 82 L260 126" fill="none" stroke="#c97b63" stroke-width="7"/>
        <rect x="190" y="146" width="20" height="32" rx="2" fill="#c9a98c"/><rect x="160" y="132" width="18" height="16" rx="2" fill="#bfe3f2"/><rect x="222" y="132" width="18" height="16" rx="2" fill="#bfe3f2"/>
        ${pine(18, 182, 96, '#6fa889')}${pine(58, 180, 74, '#82b998')}${pine(110, 178, 62, '#6fa889')}${pine(290, 178, 66, '#82b998')}${pine(338, 180, 88, '#6fa889')}${pine(386, 182, 70, '#82b998')}
        <path d="M0 174 Q200 162 400 174 V300 H0 Z" fill="#efe1c3"/>
        <path d="M30 262 l3 -6 l3 6 M352 270 l3 -6 l3 6 M380 230 l2 -5 l2 5" fill="none" stroke="#7fbf6a" stroke-width="1.6"/>
        ${on('banderines') || opts.ref ? banderines() : ''}
        ${who(['nachote'])}
        ${show('fox', FOX)}${show('sandero', SANDERO)}${on('tabla') || opts.ref ? TABLA : ''}
        ${who(['sofi', 'chino', 'grego'])}
        ${who(['jose'])}
        ${who(back.filter((x) => x !== 'nachote'))}
        ${who(front)}
        ${on('tulio') || opts.ref ? nested('tulio', 177, 266, 46) : ''}
        ${who(low)}
      </g>
      ${on('revelado') ? `<text x="388" y="292" text-anchor="end" font-family="ui-monospace, monospace" font-weight="700" font-size="12" fill="#f08a4b" opacity=".9">08 12 '26</text>` : ''}
    </svg>`;
  }

  return { ITEMS, has, size, item, nested, cartel, foto, pintado: !!IMG.fondo, cartelIA: !!IMG.cartel };
})();
