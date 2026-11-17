/* Contenido del juego: gente, niveles, misiones, tienda y la carpa. Todo editable acá. */
window.DATA = (function () {
  const PEOPLE = [
    { id: 'jero', n: 'Jero', trip: true },
    { id: 'viqui', n: 'Viqui', trip: true },
    { id: 'pachi', n: 'Pachi', trip: true },
    { id: 'juani', n: 'Juani', trip: true },
    { id: 'nico', n: 'Nico', trip: true },
    { id: 'rochi', n: 'Rochi', trip: true },
    { id: 'jose', n: 'Jose', trip: true },
    { id: 'nachote', n: 'Nachote', trip: true },
    { id: 'juli', n: 'Juli', trip: true },
    { id: 'rich', n: 'Rich', trip: true },
    { id: 'sofi', n: 'Sofi', trip: false },
    { id: 'chino', n: 'Chino', trip: false },
    { id: 'grego', n: 'Grego', trip: false },
  ];

  const LEVELS = [
    { xp: 0, n: 'Renacuajo' },
    { xp: 60, n: 'Bañista' },
    { xp: 150, n: 'Barrenador' },
    { xp: 280, n: 'Guardavidas' },
    { xp: 450, n: 'Capitán de carpa' },
    { xp: 700, n: 'Leyenda de la colonia' },
  ];

  const SERIES = [
    { id: 'previa', n: 'La previa', d: 'Antes de salir a la ruta' },
    { id: 'dia', n: 'Del día', d: 'Una por día, aparece a la mañana' },
    { id: 'flora', n: 'Flora y fauna', d: 'Lo que vive en la costa' },
    { id: 'morfi', n: 'Golosinas y morfi', d: 'Lo que comemos' },
    { id: 'selfies', n: 'Selfies', d: 'Caras de colonia' },
    { id: 'paisajes', n: 'Paisajes', d: 'Mar, cielo y arena' },
  ];

  // Cada misión se cumple subiendo una foto. Al subirla, queda hecha.
  const MISSIONS = [
    { id: 'bolso', s: 'previa', t: 'Lo que va en tu bolso', xp: 20 },
    { id: 'golo-ruta', s: 'previa', t: 'La golosina para la ruta', xp: 20 },
    { id: 'playlist', s: 'previa', t: 'El tema que sumás a la playlist del viaje', xp: 20 },
    { id: 'flor', s: 'flora', t: 'Una flor', xp: 30 },
    { id: 'perro', s: 'flora', t: 'Un perro de playa', xp: 30 },
    { id: 'caracol', s: 'flora', t: 'Un caracol o una almeja', xp: 30 },
    { id: 'pajaro', s: 'flora', t: 'Un pájaro', xp: 30 },
    { id: 'bicho', s: 'flora', t: 'El bicho más raro que veas', xp: 35 },
    { id: 'golosina', s: 'morfi', t: 'Tu golosina favorita del kiosco', xp: 25 },
    { id: 'parrilla', s: 'morfi', t: 'Lo que hay en la parrilla', xp: 25 },
    { id: 'helado', s: 'morfi', t: 'Un helado', xp: 25 },
    { id: 'desayuno', s: 'morfi', t: 'Un desayuno de colonia', xp: 25 },
    { id: 'selfie-nueva', s: 'selfies', t: 'Selfie con alguien con quien no tenés ninguna este año', xp: 35 },
    { id: 'selfie-mojada', s: 'selfies', t: 'Selfie mojada', xp: 30 },
    { id: 'selfie-atardecer', s: 'selfies', t: 'Selfie al atardecer', xp: 30 },
    { id: 'mar-manana', s: 'paisajes', t: 'El mar a la mañana', xp: 25 },
    { id: 'nubes', s: 'paisajes', t: 'La nube más rara', xp: 25 },
    { id: 'huellas', s: 'paisajes', t: 'Huellas en la arena', xp: 25 },
  ];

  // Misión del día: fija durante el viaje, rotativa antes.
  const DAILY_TRIP = {
    '2026-12-04': 'El primer mate de la ruta',
    '2026-12-05': 'El abrazo de bienvenida a Jose',
    '2026-12-06': 'El mar antes de las 10',
    '2026-12-07': 'Todos mirando el atardecer',
    '2026-12-08': 'La foto grupal antes de cerrar la casa',
  };
  const DAILY_POOL = [
    'Algo amarillo', 'Tu almuerzo de hoy', 'Una planta de tu casa', 'Tus zapatillas de hoy',
    'El cielo desde tu ventana', 'Algo que te recuerde al verano', 'Tu taza favorita', 'Un perro de tu barrio',
  ];

  const DUO = { id: 'duo-cocina', t: 'Cociná algo con alguien con quien nunca cocinaste', xp: 50 };

  // Una secreta por persona. Solo la ve quien la tiene.
  const SECRETS = [
    'Conseguí que alguien te enseñe algo nuevo sin decirle que es una misión. Foto de la clase.',
    'Dejá una notita escondida para alguien. Foto de la notita antes de esconderla.',
    'Cebale un mate a alguien que no te lo pidió. Foto del mate.',
    'Sacale una foto linda a alguien sin que se dé cuenta.',
    'Conseguí que alguien baile diez segundos. Foto del baile.',
    'Hacé que tres personas digan "Costa Esmeralda" en una misma charla. Foto del momento.',
    'Juntá algo de la playa para regalarle a alguien al volver. Foto del regalo.',
  ];

  // Logros automáticos: se ganan solos, sin foto.
  const ACH = {
    'entrada': { t: 'Entraste hoy', c: 5 },
    'matutino': { t: 'Premio matutino: primera persona del día', c: 15 },
    'racha2': { t: 'Dos días seguidos', c: 10 },
    'racha3': { t: 'Tres días seguidos', c: 20 },
    'noctambulo': { t: 'Noctámbulo: entraste de madrugada', c: 5 },
    'serie': { t: 'Serie completa', c: 30 },
    'regalo': { t: 'Regalaste algo', c: 5 },
  };

  // Tienda mega simple. Lado A tierno, lado B oscuro. Íconos provisorios.
  const SHOP = [
    { id: 'cangrejo', n: 'Cangrejito', e: '🦀', p: 15, lv: 1, side: 'A' },
    { id: 'osito', n: 'Osito', e: '🧸', p: 25, lv: 1, side: 'A' },
    { id: 'sandia', n: 'Sandía', e: '🍉', p: 10, lv: 1, side: 'A' },
    { id: 'helado', n: 'Helado', e: '🍦', p: 12, lv: 1, side: 'A' },
    { id: 'pulpo', n: 'Pulpo de peluche', e: '🐙', p: 35, lv: 2, side: 'A' },
    { id: 'choripan', n: 'Choripán', e: '🌭', p: 20, lv: 2, side: 'A' },
    { id: 'gatito', n: 'Gatito negro', e: '🐈‍⬛', p: 45, lv: 3, side: 'A' },
    { id: 'salchicha', n: 'Perro salchicha', e: '🐕', p: 60, lv: 4, side: 'A' },
    { id: 'birra', n: 'Birra', e: '🍺', p: 20, lv: 1, side: 'B' },
    { id: 'puchos', n: 'Atado de puchos', e: '🚬', p: 25, lv: 1, side: 'B' },
    { id: 'dados', n: 'Dados', e: '🎲', p: 20, lv: 1, side: 'B' },
    { id: 'naipes', n: 'Mazo para el truco', e: '🃏', p: 30, lv: 2, side: 'B' },
    { id: 'vino', n: 'Vino', e: '🍷', p: 45, lv: 2, side: 'B' },
    { id: 'cuchillo', n: 'Cuchillito', e: '🔪', p: 35, lv: 3, side: 'B' },
    { id: 'calavera', n: 'Calaverita', e: '💀', p: 55, lv: 4, side: 'B' },
    { id: 'champa', n: 'Champagne', e: '🍾', p: 120, lv: 5, side: 'B' },
  ];

  // La carpa de balneario se arma con la XP de todos. La meta es secreta.
  const CARPA = {
    goal: 2600,
    pieces: ['Parantes', 'Techo a rayas', 'Volado', 'Cortinas', 'Banderín', 'Reposeras', 'Sombrilla', 'Heladerita', 'Guirnalda', 'Cartel'],
    hitos: [
      { at: 0.4, t: 'Llega Jose', d: 'Estreno del video de Rich', fecha: '5/12' },
      { at: 1, t: 'Carpa completa', d: 'Álbum final, wrapped y premio', fecha: 'antes de volver' },
    ],
  };

  return { PEOPLE, LEVELS, SERIES, MISSIONS, DAILY_TRIP, DAILY_POOL, DUO, SECRETS, ACH, SHOP, CARPA };
})();
