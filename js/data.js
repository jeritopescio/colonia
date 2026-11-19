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
    { id: 'perro', s: 'flora', t: 'Un animalito de playa (vale cualquier ternurita)', xp: 30 },
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
    'El cielo desde tu ventana', 'Algo que te recuerde al verano', 'Tu taza favorita', 'Un animalito de tu barrio (vale cualquier ternurita)',
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

  // Kiosco: todo lo que se compra va al altarcito playero de cada uno.
  // side R = refugio (va de fondo y no se mueve; la carpa reemplaza a la sombrilla).
  // z = zona: 'mar' (flota o salta en el agua), 'fondo' (atrás de la arena); sin z, en la arena.
  // anim = 'salta', 'cola' o 'flota'. col = color inicial si se puede pintar; sin col, el color es fijo.
  const SHOP = [
    { id: 'sombrilla', n: 'Sombrilla', p: 40, lv: 1, side: 'R', col: '#f6a38f', d: 'Sombra portátil. Se clava con fe y se vuela con el primer viento.' },
    { id: 'carpa', n: 'Carpa de balneario', p: 110, lv: 2, side: 'R', col: '#a9d6f0', d: 'Lujo de balneario: sombra propia y derecho a mirar feo al que pasa.' },
    { id: 'mangrullo', n: 'Mangrullo', p: 180, lv: 3, z: 'fondo', d: 'Desde acá arriba se ve todo: el mar, los bañistas y quién no trajo nada para el mate.' },

    { id: 'yate', n: 'Yate', p: 600, lv: 5, z: 'mar', anim: 'flota', d: 'Anclado frente a tu altarcito. Nadie sabe cómo pagaste esto.' },
    { id: 'ballena', n: 'Ballenita', p: 200, lv: 4, z: 'mar', anim: 'salta', d: 'Salta justo cuando mirás para otro lado.' },
    { id: 'sirena', n: 'Cola de sirena', p: 160, lv: 4, z: 'mar', anim: 'cola', d: 'Solo se le ve la cola. Mejor no preguntar.' },
    { id: 'delfin', n: 'Delfín', p: 120, lv: 3, z: 'mar', anim: 'salta', d: 'Sale, saluda y se va. Mejor que muchos invitados.' },
    { id: 'delfinrosa', n: 'Delfín rosa', p: 150, lv: 3, z: 'mar', anim: 'salta', d: 'Rarísimo y muy consciente de eso.' },

    { id: 'estrella', n: 'Estrella de mar', p: 8, lv: 1, col: '#f6a38f', d: 'Cinco puntas, cero apuro. Lleva tres días cruzando la misma duna.' },
    { id: 'caracoles', n: 'Caracoles', p: 8, lv: 1, col: '#f7b3c6', d: 'Si te los acercás al oído, alguien te pide que le pases el protector.' },
    { id: 'protector', n: 'Protector', p: 10, lv: 1, col: '#ffe39a', d: 'Factor 50. Se pasa una vez y se recuerda cuando ya es tarde.' },
    { id: 'lentes', n: 'Lentes de sol', p: 12, lv: 1, col: '#f7b3c6', d: 'Para mirar a cualquiera sin que se note. Se nota.' },
    { id: 'heineken', n: 'Lata de Heineken', p: 12, lv: 1, d: 'La lata verde. Transpira más que vos.' },
    { id: 'sandia', n: 'Sandía', p: 12, lv: 1, d: 'Se come con las manos y termina en el codo.' },
    { id: 'librito', n: 'Librito', p: 15, lv: 1, col: '#b6e5cd', d: 'Viajó a todas las playas. Sigue en la página doce.' },
    { id: 'futbol', n: 'Pelota de fútbol', p: 15, lv: 1, d: 'Dos ojotas hacen un arco. El que la patea al mar la va a buscar.' },
    { id: 'voley', n: 'Pelota de vóley', p: 15, lv: 1, col: '#ffe39a', d: 'Red imaginaria, reglas discutidas, amistades en riesgo.' },
    { id: 'birra', n: 'Birra', p: 15, lv: 1, col: '#ffe39a', d: 'Fría hasta que la apoyás en la arena.' },
    { id: 'dados', n: 'Dados', p: 15, lv: 1, col: '#fffaf1', d: 'Deciden quién lava los platos. No se apela.' },
    { id: 'sombrero', n: 'Sombrero de paja', p: 18, lv: 1, col: '#f6a38f', d: 'Paja fina, ala ancha. Se vuela justo cuando te ponés digno.' },
    { id: 'papas', n: 'Bowl de papas fritas', p: 18, lv: 1, d: 'Baja solo, aunque nadie admite haber comido.' },
    { id: 'basquet', n: 'Pelota de básquet', p: 18, lv: 2, d: 'No hay aro ni piso firme. Pica una vez y se queda a vivir en la arena.' },
    { id: 'toalla', n: 'Toalla', p: 20, lv: 1, col: '#cfc0f0', d: 'Territorio soberano. Pisarla con arena es declarar la guerra.' },
    { id: 'puchos', n: 'Atado de puchos', p: 20, lv: 1, d: 'El último. Eso dijiste el verano pasado.' },
    { id: 'naipes', n: 'Mazo para el truco', p: 20, lv: 1, d: 'Quien no mienta, que reparta.' },
    { id: 'mate', n: 'Mate y termo', p: 25, lv: 1, col: '#b6e5cd', d: 'Lavado a la tercera ronda, defendido hasta la última.' },
    { id: 'buzo', n: 'Buzo', p: 25, lv: 1, col: '#a9d6f0', d: 'Para cuando baja el sol y juraste que no ibas a tener frío.' },
    { id: 'rabas', n: 'Rabas con limón', p: 28, lv: 1, d: 'La gaviota ya las vio.' },
    { id: 'tejos', n: 'Tejos', p: 30, lv: 1, col: '#f6a38f', d: 'Deporte nacional de orilla. Se mide con la ojota y se discute igual.' },
    { id: 'salvavidas', n: 'Salvavidas', p: 30, lv: 1, col: '#f6a38f', d: 'Nadie lo necesita hasta que todos lo quieren.' },
    { id: 'porro', n: 'Porro', p: 30, lv: 2, d: 'Armado a mano. Se comparte hacia la izquierda.' },
    { id: 'cuchillo', n: 'Cuchillito', p: 30, lv: 3, col: '#f7b3c6', d: 'Para el salame. Por ahora.' },
    { id: 'lobo', n: 'Toallón del Lobo', p: 35, lv: 1, d: 'Azul y blanco. Aguanta lo que venga, como siempre.' },
    { id: 'estudiantes', n: 'Toallón de Estudiantes', p: 35, lv: 1, d: 'Rojo y blanco. Se seca rápido y te lo hace saber.' },
    { id: 'vino', n: 'Vino', p: 35, lv: 2, d: 'Tinto de playa: con hielo y sin culpa.' },
    { id: 'reposeraarg', n: 'Reposera argentina', p: 40, lv: 1, col: '#a9d6f0', d: 'La de caño y cintitas. Te deja la espalda rayada de recuerdo.' },
    { id: 'liebre', n: 'Liebre', p: 40, lv: 2, d: 'Autóctona del bosque esmeralda. Ranchea en tu lugar sin pedir permiso.' },
    { id: 'reposera', n: 'Reposera', p: 45, lv: 1, col: '#f6a38f', d: 'De madera y con clase. Le aprieta los dedos a quien la abre con soberbia.' },
    { id: 'zorrito', n: 'Zorrito', p: 45, lv: 3, d: 'Vecino del pinar. Si falta una ojota, ya sabés.' },
    { id: 'calavera', n: 'Calaverita', p: 45, lv: 4, col: '#f6a38f', d: 'Apareció en la duna. Tiene flor y mejor actitud que vos.' },
    { id: 'caipirinha', n: 'Tabla de caipirinha', p: 45, lv: 2, d: 'Limas, azúcar y una tabla que no llega entera a la noche.' },
    { id: 'fogata', n: 'Fogatita', p: 50, lv: 2, d: 'Chiquita y contenida. Todos saben prenderla, ninguno la prende.' },
    { id: 'heladerita', n: 'Heladerita con sanguchitos', p: 55, lv: 2, col: '#a9d6f0', d: 'Adentro hay sanguchitos de miga y la promesa de que alcanzan.' },
    { id: 'antorchas', n: 'Antorchas de playa', p: 55, lv: 2, d: 'Ambientan, espantan mosquitos y se creen Hawái.' },
    { id: 'tulio', n: 'Tulio', sub: 'el salchicha de Pachi', p: 55, lv: 2, d: 'Mide lo que una cuadra y entra en todos lados.' },
    { id: 'tony', n: 'Tony', sub: 'el gato de Jero y Viqui', p: 55, lv: 2, d: 'Gris, flaco y con ojos de ámbar. Te mira como si le debieras plata.' },
    { id: 'feluchis', n: 'Feluchis', sub: 'la gata de Jose', p: 55, lv: 2, d: 'Duerme con los ojos apretados y te juzga igual.' },
    { id: 'pompi', n: 'Pompi', sub: 'el gato de Juani', p: 55, lv: 2, d: 'Naranja, flaco y veloz. Cuando llegás, ya se fue.' },
    { id: 'renu', n: 'Renu', sub: 'la perrita de Nachote', p: 55, lv: 2, d: 'Olfato de bretona: detecta un asado a tres balnearios.' },
    { id: 'leda', n: 'Leda', sub: 'la perra de Rochi', p: 55, lv: 2, d: 'Cabeza de huevo, corazón de dulce de leche.' },
    { id: 'marihuana', n: 'Planta de marihuana', p: 60, lv: 2, d: 'Creció sola, dice. Da sombra, risas y hambre.' },
    { id: 'neoprene', n: 'Traje de neoprene', p: 60, lv: 2, col: '#a9d6f0', d: 'Entrar cuesta. Salir, más. Surfista al menos de lejos.' },
    { id: 'tabla', n: 'Tabla de surf', p: 70, lv: 3, col: '#f7b3c6', d: 'Viaja en el techo del Sandero. Surfear es opcional.' },
    { id: 'guitarra', n: 'Guitarra criolla', p: 80, lv: 2, d: 'Cinco cuerdas sanas. Alguien va a arrancar con la de siempre.' },
    { id: 'kayak', n: 'Kayak', p: 130, lv: 3, col: '#ffe39a', d: 'Para adentro se rema con ganas. Para afuera, con arrepentimiento.' },
    { id: 'corona', n: 'Corona enterrada', p: 150, lv: 5, col: '#f7b3c6', d: 'Alguien la enterró antes que vos. Nadie reclamó el trono.' },
    { id: 'moto', n: 'Moto de agua', p: 320, lv: 4, col: '#e8735a', d: 'Ruido, nafta y envidia. Cara, como todo lo que no necesitás.' },
    { id: 'ps5', n: 'PS5', p: 400, lv: 4, d: 'En la playa no hay enchufe. Igual la trajiste.' },
  ];
  // Cosas de la tienda vieja: se muestran como lo más parecido de la nueva (nadie pierde lo que compró).
  const ALIAS = { cangrejo: 'estrella', osito: 'liebre', helado: 'sandia', pulpo: 'caracoles', choripan: 'heladerita',
    gatito: 'tony', salchicha: 'tulio', champa: 'vino', balde: 'heineken' };
  const COLORS = ['#f6a38f', '#f7b3c6', '#ffe39a', '#b6e5cd', '#a9d6f0', '#cfc0f0', '#7fb8e6', '#e8735a', '#fffaf1', '#5b4d72'];

  const CARTAS_V = 3; // subir cuando cambien las tarjetas del bucket (cartas/)

  // La foto del 8/12: dos autos, la tabla, Tulio y la colonia entera. Se arma con la XP de todos (la meta es secreta)
  // y cada persona aparece cuando llega al nivel 2. El 8/12 aparecen todos igual.
  const FOTO = {
    // 'dibujo' = el provisorio en SVG. 'recortes' = la imagen de nanobanana entera de base y, encima, un PNG por persona
    // o cosa (mismo tamaño que la base, transparente salvo esa persona). Lo que todavía no aparece se ve como silueta.
    modo: 'recortes',
    recortes: {
      ancho: 896, alto: 1200,
      base: 'foto/base.jpg',
      ext: 'webp',
      v: 3, // subir este número cuando se reemplacen las imágenes del bucket
      // de atrás para adelante (las personas no se pisan entre sí; las cosas ya vienen sin la gente encima)
      capas: ['sandero', 'fox', 'tabla', 'sofi', 'chino', 'grego',
        'nico', 'nachote', 'juani', 'jero', 'jose', 'viqui', 'pachi', 'rochi', 'juli', 'rich',
        'heladerita', 'bolsos', 'tulio'],
      silueta: 'papel', // 'papel' (recorte crema con borde) o 'fantasma' (la persona lavada, sin revelar)
    },
    goal: 2600,
    nivel: 1,
    dia: '2026-12-08',
    pieces: [
      { id: 'fox', n: 'El Fox', at: 0.05 },
      { id: 'sandero', n: 'El Sandero', at: 0.12 },
      { id: 'tabla', n: 'La tabla', at: 0.25 },
      { id: 'tulio', n: 'Tulio', at: 0.4 },
      { id: 'heladerita', n: 'La heladerita', at: 0.55 },
      { id: 'bolsos', n: 'El bolso playero', at: 0.7 },
      { id: 'revelado', n: 'Revelado', at: 1 },
    ],
    // Dónde está cada uno (coordenadas sobre 400×300, pie en y). Se puede reacomodar acá.
    slots: {
      rich: { x: 27, y: 246, s: 0.92, pose: 'pie' },
      nachote: { x: 198, y: 243, s: 0.88, pose: 'pie' },
      nico: { x: 374, y: 246, s: 0.92, pose: 'pie' },
      juli: { x: 64, y: 288, s: 1, pose: 'pie' },
      juani: { x: 120, y: 291, s: 1, pose: 'pie' },
      jero: { x: 282, y: 291, s: 1, pose: 'pie' },
      viqui: { x: 337, y: 288, s: 1, pose: 'pie' },
      pachi: { x: 160, y: 295, s: 0.95, pose: 'agachado' },
      rochi: { x: 240, y: 295, s: 0.95, pose: 'agachado' },
      jose: { x: 118, y: 147, s: 0.85, pose: 'sentado' },
      sofi: { x: 254, y: 166, r: -8, pose: 'polaroid' },
      chino: { x: 283, y: 163, r: 3, pose: 'polaroid' },
      grego: { x: 312, y: 167, r: 9, pose: 'polaroid' },
    },
    hitos: [
      { at: 0.4, t: 'Llega Jose', d: 'Estreno del video de Rich', fecha: '5/12' },
      { at: 1, t: 'La foto revelada', d: 'Álbum final, wrapped y premio', fecha: 'antes de volver' },
    ],
  };

  // Fotos subidas durante la beta (persona, misión, fecha). Las de misiones secretas no van acá.
  const VESTIGIOS = [['rochi', 'dia-2026-11-17', '17/11'], ['nico', 'dia-2026-11-17', '17/11'], ['nico', 'flor', '18/11'],
    ['jero', 'dia-2026-11-18', '18/11'], ['rochi', 'selfie-nueva', '18/11'], ['viqui', 'dia-2026-11-18', '18/11']];
  return { PEOPLE, LEVELS, SERIES, MISSIONS, DAILY_TRIP, DAILY_POOL, DUO, SECRETS, ACH, SHOP, ALIAS, COLORS, FOTO, CARTAS_V, VESTIGIOS };
})();
