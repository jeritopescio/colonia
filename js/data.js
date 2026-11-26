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

  // 20 niveles. La curva sube despacio: los primeros salen en días, el 20 pide toda la temporada.
  const LEVELS = [
    { xp: 0, n: 'Huevo de tortuga' },
    { xp: 40, n: 'Renacuajo de charco' },
    { xp: 90, n: 'Sirena encallada' },
    { xp: 150, n: 'Almeja con insomnio' },
    { xp: 220, n: 'Medusa sin rumbo' },
    { xp: 300, n: 'Cangrejo en crisis' },
    { xp: 390, n: 'Gaviota con antecedentes' },
    { xp: 490, n: 'Lobo marino de siesta' },
    { xp: 600, n: 'Churrero ambulante' },
    { xp: 720, n: 'Guardavida insolado' },
    { xp: 850, n: 'Barrenador de ola chica' },
    { xp: 990, n: 'Capitán de reposera' },
    { xp: 1140, n: 'Pulpo malabarista' },
    { xp: 1300, n: 'Faro con ojeras' },
    { xp: 1480, n: 'Delfín mochilero' },
    { xp: 1680, n: 'Tritón de médano' },
    { xp: 1900, n: 'Kraken de bolsillo' },
    { xp: 2150, n: 'Neptuno en ojotas' },
    { xp: 2450, n: 'Oráculo de la marea' },
    { xp: 2800, n: 'Colonia definitivo' },
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
  // Las marcadas "costa" se destraban recién cuando ya estamos allá: COSTA, en hora argentina.
  const COSTA = '2026-12-04T16:00';
  const MISSIONS = [
    { id: 'bolso', s: 'previa', t: 'Lo que va en tu bolso', xp: 20 },
    { id: 'golo-ruta', s: 'previa', t: 'La golosina para la ruta', xp: 20 },
    { id: 'playlist', s: 'previa', t: 'El tema que sumás a la playlist del viaje', xp: 20 },
    { id: 'flor', s: 'flora', t: 'Una flor', xp: 30 },
    { id: 'perro', s: 'flora', t: 'Un animalito de playa (vale cualquier ternurita)', xp: 30, costa: true },
    { id: 'caracol', s: 'flora', t: 'Un caracol o una almeja', xp: 30, costa: true },
    { id: 'pajaro', s: 'flora', t: 'Un pájaro', xp: 30 },
    { id: 'bicho', s: 'flora', t: 'El bicho más raro que veas', xp: 35 },
    { id: 'golosina', s: 'morfi', t: 'Tu golosina favorita del kiosco', xp: 25 },
    { id: 'parrilla', s: 'morfi', t: 'Lo que hay en la parrilla', xp: 25 },
    { id: 'helado', s: 'morfi', t: 'Un helado', xp: 25 },
    { id: 'desayuno', s: 'morfi', t: 'Un desayuno de colonia', xp: 25, costa: true },
    { id: 'selfie-nueva', s: 'selfies', t: 'Selfie con alguien con quien no tenés ninguna este año', xp: 35 },
    { id: 'selfie-mojada', s: 'selfies', t: 'Selfie mojada', xp: 30, costa: true },
    { id: 'selfie-atardecer', s: 'selfies', t: 'Selfie al atardecer', xp: 30 },
    { id: 'mar-manana', s: 'paisajes', t: 'El mar a la mañana', xp: 25, costa: true },
    { id: 'nubes', s: 'paisajes', t: 'La nube más rara', xp: 25 },
    { id: 'huellas', s: 'paisajes', t: 'Huellas en la arena', xp: 25, costa: true },
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
  // Quienes juegan a distancia tienen su propia misión del día mientras la colonia está en la costa.
  const DAILY_LEJOS = {
    '2026-12-04': 'Un cartelito de "¡Buen viaje!" para los autos',
    '2026-12-05': 'Algo que te haga acordar a la colonia',
    '2026-12-06': 'Tu rincón de verano',
    '2026-12-07': 'Tu atardecer, a la misma hora que el de la costa',
    '2026-12-08': 'Una selfie saludando a la colonia que vuelve',
  };
  // Entre capítulos (después de que cierra uno y hasta que arranca el que sigue): misión del día liviana, mirando para atrás y para adelante.
  const DAILY_ENTRE = [
    'Una foto de la colonia que nunca mostraste', 'Algo que querés llevar al próximo viaje', 'Tu verano de hoy',
    'Un lugar al que irías con la colonia', 'Algo que te haga acordar a Costa Esmeralda', 'El cielo de hoy, estés donde estés',
    'Lo que estás escuchando', 'Un rincón lindo de tu casa', 'Algo rico para la próxima juntada', 'Tus ojotas',
  ];
  // Alguna persona con su propia misión del día (Jose sale recién el sábado).
  const DAILY_PROPIA = { jose: { '2026-12-04': 'Un cartelito de "¡Ya voy!" para la colonia' } };

  const DUO = { id: 'duo-cocina', t: 'Cociná algo con alguien con quien nunca cocinaste', xp: 50 };

  // La ruta: el viernes 4 salen todos de La Plata. Nadie compite: cada auto avanza en la tira
  // cuando alguien que va en él sube la foto de la parada (la saca quien no maneja). Los demás le tocan bocina.
  const RUTA = {
    desde: '2026-12-04T00:00', ultimoDia: '2026-12-05', xp: 25,
    vehiculos: [
      { id: 'sandero', n: 'El Sandero', quien: ['rochi', 'pachi', 'nico', 'nachote', 'juani'], sale: 'sale a las 7, con la tabla y Tulio', col: '#d9dde3', tabla: true },
      { id: 'fox', n: 'El Fox', quien: ['viqui', 'jero', 'rich', 'juli'], sale: 'sale cerca de las 13', col: '#fffaf1' },
      { id: 'micro', n: 'El micro de Jose', quien: ['jose'], sale: 'sale el sábado de madrugada', col: '#cfc0f0', micro: true },
    ],
    // x = dónde queda la parada en la tira (0 a 100). "va" = cómo se cuenta que el auto ya pasó por ahí.
    paradas: [
      { id: 'salida', x: 6, t: 'La selfie del auto antes de arrancar', micro: 'La selfie en el micro antes de arrancar', va: 'ya arrancó' },
      { id: 'mitad', x: 48, t: 'Mitad de camino: lo que se ve por la ventanilla', va: 'va por la mitad' },
      { id: 'cartel', x: 80, t: 'El primer cartel que diga Costa Esmeralda', va: 'ya ve los carteles' },
      { id: 'llegada', x: 100, t: 'Llegada: la primera foto en la casa', va: 'llegó' },
    ],
  };

  // Juego "¿Quién de la colonia…?": las preguntas con respuesta salen de las tarjetas (en el bucket).
  // "sin" = partes de una tarjeta que no van al juego. "senalar" = sin respuesta: a la cuenta de tres, todos señalan.
  const JUEGO = {
    sin: ['chino.deb', 'chino.dato', 'viqui.dato'],
    senalar: [
      'se meta primero al mar', 'cebe el primer mate en la casa', 'encuentre el caracol más lindo', 'ponga el tema que nadie conoce',
      'saque más fotos en el viaje', 'se acuerde del protector', 'le hable a todos los perros de la playa', 'cocine algo rico sin que nadie se lo pida',
      'proponga la próxima juntada', 'se ría primero de esta pregunta', 'arme la mejor playlist', 'se quede charlando hasta tarde',
      'traiga algo rico para compartir', 'se emocione con el atardecer', 'invente un juego en la playa', 'encuentre la mejor sombra',
    ],
  };

  // Misiones secretas: dos nuevas por día para cada persona, desde "desde". Solo las ve quien las tiene.
  // Cada uno las recorre en su propio orden y no se repiten hasta terminar la lista.
  // Del 5 al 8/12 (el 4 se pasa en la ruta), quienes viajan reciben las de "viaje"; quienes juegan a distancia siguen con "todas".
  const SECRETAS = {
    desde: '2026-11-19',
    viajeDesde: '2026-12-05',
    xp: 30,
    todas: [
      'Conseguí que alguien te enseñe algo nuevo sin decirle que es una misión. Foto de la clase.',
      'Dejá una notita escondida para alguien. Foto de la notita antes de esconderla.',
      'Cebale un mate (o servile algo) a alguien que no te lo pidió. Foto de lo que serviste.',
      'Sacale una foto linda a alguien sin que se dé cuenta.',
      'Conseguí que alguien baile diez segundos. Foto del baile.',
      'Hacé que alguien diga "Costa Esmeralda" sin que vos lo nombres primero. Foto del momento.',
      'Lográ que alguien del grupo mande un audio sin pedírselo. Captura del audio.',
      'Conseguí que alguien del grupo escriba "regio" en el chat. Captura.',
      'Mandá al grupo una foto de algo celeste sin explicar por qué. Captura.',
      'Pedile a alguien que te recomiende una canción y escuchala entera. Foto del tema sonando.',
      'Encontrá algo con forma de corazón en la calle. Foto.',
      'Dibujá a alguien del grupo de memoria, en menos de un minuto. Foto del dibujo.',
      'Decile a alguien del grupo algo lindo que nunca le dijiste. Captura (podés tapar el texto).',
      'Preguntale a alguien cuál fue el mejor verano de su vida. Foto de quien te lo contó.',
      'Hacé un barquito de papel y dejalo donde alguien lo encuentre. Foto.',
      'Comé algo que nunca probaste. Foto.',
      'Saludá a un perro que no conocés (con permiso). Foto del perro.',
      'Hacé reír a alguien a carcajadas. Foto de la risa.',
      'Conseguí que alguien te preste algo y devolvelo con una sorpresa. Foto de la sorpresa.',
      'Mandale un sticker a alguien del grupo con quien hace días que no hablás. Captura.',
      'Usá una palabra inventada en una charla y conseguí que alguien la repita. Foto del momento.',
      'Sacale una foto a tu sombra haciendo una pose ridícula.',
      'Hacé que alguien te cuente su comida favorita de cuando era chico. Foto de esa comida o de quien te lo contó.',
      'Regalale una flor (o un yuyito) a alguien. Foto de la entrega.',
      'Encontrá una nube con forma de algo y conseguí que otra persona también la vea. Foto.',
      'Escribí "colonia" en algún lado (un vidrio empañado, una servilleta, la tierra) y dejalo ahí. Foto.',
      'Agradecele a alguien algo que hizo por vos hace mucho. Foto o captura.',
      'Conseguí que alguien haga una mueca para la foto sin explicarle por qué.',
      'Sacá una foto desde el piso, con todo gigante arriba.',
      'Tarareá una canción y conseguí que alguien la adivine. Foto de quien adivinó (o no).',
      'Llevá algo dulce a algún lado y convidá. Foto.',
      'Contá un chiste malo y conseguí al menos una risa. Foto del público.',
      'Conseguí que alguien te cuente un dato raro que no sabías. Foto de quien te lo contó.',
      'Dejá una piedrita linda donde alguien la vaya a encontrar. Foto.',
      'Pedile a alguien que te recomiende una peli o un libro y anotalo. Foto de la anotación.',
      'Armá una torre con lo que tengas a mano sin que nadie sepa para qué. Foto.',
      'Mandá al grupo una foto vieja de una juntada que nadie recuerde. Captura.',
      'Conseguí que alguien te salude con un abrazo largo, de esos de diez segundos. Foto.',
      'Sacale una foto a la persona que más te hizo reír esta semana. No le digas por qué.',
      'Hacé algo por alguien sin que se entere de que fuiste vos. Foto de lo que hiciste.',
    ],
    viaje: [
      'Conseguí que alguien te ponga protector en la espalda sin pedírselo. Foto de la espalda.',
      'Enterrá algo chiquito en la arena y dejá que otra persona lo encuentre. Foto del hallazgo.',
      'Escribí el nombre de alguien en la arena antes de que lo borre el mar. Foto.',
      'Conseguí que alguien se meta al mar con vos sin haberlo planeado. Foto mojada.',
      'Robale un ratito de sombra a la sombrilla de otra persona. Foto desde tu lugar.',
      'Hacé que alguien pruebe algo de la heladerita que nunca come. Foto.',
      'Juntá tres caracoles distintos y regaláselos a alguien. Foto de la entrega.',
      'Conseguí que alguien saque la foto del atardecer por vos. Foto de esa foto.',
      'Dibujá una estrella en la arena al lado de las ojotas de alguien. Foto.',
      'Hacé que la casa entera cante una canción. Foto del coro.',
      'Preguntale a alguien cuál es su momento favorito del viaje hasta ahora. Foto de quien te lo contó.',
      'Conseguí que alguien haga una vertical, una ronda o una pirueta en la arena. Foto.',
      'Prepará algo para la mesa sin que te lo pidan. Foto de lo que preparaste.',
      'Dejá una notita en la mochila de alguien. Foto antes de guardarla.',
    ],
  };

  // Más coleccionables (además de las figuritas de misiones):
  // - El baúl de la colonia: fotos reales en el bucket (recuerdos/recuerdos.json). Llegan en sobres:
  //   uno por día que entrás, uno por cada nivel que subís y unos de bienvenida. Las rarezas "de la suerte" salen pocas veces.
  // - Figuritas de amigos: la de cada persona se consigue con 2 de 3 cosas (reaccionar a una foto suya, visitar su altarcito, regalarle algo).
  // - Tu tarjeta sube de categoría con el nivel.
  const COLECCION = {
    sobres: { inicio: 3, suerte: 0.12, repetido: 20 },
    amigos: { necesita: 2, premio: 150 },
    tarjeta: [{ id: 'bronce', n: 'Bronce', lv: 5 }, { id: 'plata', n: 'Plata', lv: 10 }, { id: 'oro', n: 'Oro', lv: 15 }],
  };

  // Racha: días seguidos entrando a la app. Desde el 2.º día suma experiencia (cada día un poco más, hasta el 5.º);
  // desde el 5.º, el borde de tu foto se pone dorado para todos, hasta que un día no entres.
  const RACHA = { xp: { 2: 5, 3: 10, 4: 15, 5: 20 }, dorado: 5 };
  // Regalar algo del kiosco suma experiencia: 1 XP cada 2 monedas que cuesta (comprar para vos no suma).
  const XP_REGALO = 0.5;
  const xpRegalo = (p) => Math.max(1, Math.round(p * XP_REGALO));

  // Capítulos: la colonia se cuenta por temporadas. Cuando una cierra no se borra nada (álbum, altarcitos, la foto, monedas)
  // y la app sigue abierta "entre capítulos", con misión del día e ideas para el que viene.
  // El que viene se anuncia sin publicar la app, en agenda.json del bucket: "proximo": { "n": 2, "t": "Colonia de invierno", "d": "2027-07-10" }.
  const CAPITULOS = [
    { n: 1, t: 'Costa Esmeralda', temporada: '26/27', desde: '2026-11-17', hasta: '2027-01-10' },
  ];

  // Monedas de regalo puntuales: se dan una sola vez, al entrar. para '*' = a todos; desde = recién a partir de ese día.
  const BONOS = [
    { id: 'regalitos-jero', para: 'jero', c: 300, t: 'Para estrenar los regalitos' },
    { id: 'capitulo-2', para: '*', desde: '2027-01-11', c: 100, t: 'Para arrancar el capítulo 2' },
  ];

  // Hallazgos: aparecen solos en tu altarcito algunos días (prob = chance por día, entre los minutos de y a, hora argentina).
  // Se abren tocándolos y dan monedas. Si no lo abrís ese día, se lo lleva la marea. Cada persona los recorre en su propio orden.
  const HALLAZGOS = {
    desde: '2026-11-21',
    botella: {
      prob: 0.3, de: 480, a: 1200, c: 20,
      claves: {
        murcielago: { n: 'en clave murciélago', pista: 'M U R C I E L A G O = 0 1 2 3 4 5 6 7 8 9' },
        jeringozo: { n: 'en jeringozo', pista: 'Sacale la p y la vocal que se repite.' },
        reves: { n: 'escrita al revés', pista: 'Leela de atrás para adelante.' },
        espejo: { n: 'escrita en espejo', pista: 'Ponela frente a un espejo, o tocá Descifrar.' },
        corrida: { n: 'corrida una letra', pista: 'Cada letra es la que viene antes: la b es una a.' },
      },
      mensajes: [
        ['murcielago', 'Si encontraste esta botella, el mar te debe una ola. Firma: el mar.'],
        ['jeringozo', 'Guarden un mate tibio. Llego con la próxima marea.'],
        ['reves', 'Acá abajo también ponemos la sombrilla torcida. Firma: los peces.'],
        ['espejo', 'El protector no se pone solo. Firma: el sol de las tres.'],
        ['corrida', 'Una sirena pregunta quién se llevó la tabla.'],
        ['murcielago', 'No le cuentes a nadie: los caracoles escuchan todo.'],
        ['jeringozo', 'Coordenadas del tesoro: debajo de la sombrilla de quien más se ríe.'],
        ['reves', 'Si estás leyendo esto, tomá agua.'],
        ['espejo', 'Tulio fue visto en la orilla con anteojos de sol. No confirmamos ni desmentimos.'],
        ['corrida', 'Botella siete de cien. Las otras noventa y tres se las quedó un delfín.'],
        ['murcielago', 'Hoy el mar estuvo pensando en vos.'],
        ['jeringozo', 'Mensaje de una gaviota: la papa frita era mía y no pido perdón.'],
        ['reves', 'Desde el fondo del mar: aplausos para quien cocinó.'],
        ['espejo', 'Si un caracol suena a radio, no es el mar: es la playlist del viaje.'],
        ['corrida', 'Las olas cuentan hasta siete y vuelven a empezar. Vos también podés.'],
        ['murcielago', 'Gracias por llevarte la basura. Firma: la arena.'],
        ['jeringozo', 'Encontramos una ojota sola. Si es tuya, el mar te la quiere devolver.'],
        ['reves', 'Una estrella de mar te manda un abrazo de cinco brazos.'],
        ['espejo', 'Pronóstico submarino: mojado, con probabilidad de más mojado.'],
        ['corrida', 'Para quien juega de lejos: el mar te guarda una ola hasta que vengas.'],
        ['murcielago', 'No hay mensaje. Solo queríamos que abrieras algo lindo.'],
        ['jeringozo', 'Un cangrejo pide entrar a la colonia. Le dijimos que no. Insiste.'],
        ['reves', 'Nico: el mar avisa que la arena no es heladera.'],
        ['espejo', 'Jero: el mar dice que ya lo miraste bastante, que te metas.'],
        ['corrida', 'Rich: un delfín te vio bailar y quiere clases.'],
        ['murcielago', 'El faro manda saludos y pide que dejen una luz prendida en la casa.'],
        ['jeringozo', 'Si lo leíste en voz alta, ya sos parte del club secreto de la botella.'],
        ['reves', 'Escrito en una servilleta mojada: la próxima juntada la propone quien lea esto.'],
        ['espejo', 'La marea se lleva las huellas, pero no las fotos. Seguí sacando.'],
        ['corrida', 'Fin del mensaje. Volvé a tirar la botella al mar, con un deseo adentro.'],
      ],
    },
    galleta: {
      prob: 0.1, de: 600, a: 1320, c: 40,
      frases: [
        ['Un viaje de mil leguas empieza con un solo paso.', [4, 5, 29, 36, 44, 48]],
        ['Cuando tomes agua, acordate de quién cavó el pozo.', [4, 5, 9, 13, 15, 16]],
        ['La gota de agua horada la piedra.', [14, 17, 33, 34, 42, 43]],
        ['No temas ir despacio; temé quedarte quieto.', [2, 7, 10, 28, 33, 40]],
        ['Si caminan tres juntos, seguro uno tiene algo para enseñarte.', [12, 18, 26, 33, 41, 43]],
        ['Una risa te saca diez años de encima.', [5, 12, 28, 38, 43, 48]],
        ['Cuando todos suman leña, la llama crece.', [10, 15, 27, 34, 43, 48]],
        ['Un hilo solo no hace una cuerda; un árbol solo no hace un bosque.', [1, 3, 15, 37, 47, 49]],
        ['El agua que corre no se pudre.', [5, 11, 20, 42, 43, 46]],
        ['Aprender es remar contra la corriente: si no avanzás, retrocedés.', [10, 15, 21, 39, 41, 47]],
        ['Más vale un vecino cerca que un pariente lejos.', [6, 7, 10, 19, 32, 43]],
        ['Si la montaña no se mueve, que dé la vuelta el camino.', [17, 18, 24, 29, 41, 48]],
        ['Ver una vez vale más que escuchar cien veces.', [12, 19, 20, 25, 40, 46]],
        ['Si dos tienen el mismo corazón, cortan hasta el metal.', [12, 27, 31, 35, 37, 39]],
        ['Entre los cuatro mares, todos somos hermanos.', [12, 25, 28, 36, 41, 44]],
        ['Que lleguen amigos de lejos, ¿no es acaso una alegría?', [4, 5, 7, 36, 42, 43]],
        ['Un día sin verte parecen tres otoños.', [5, 18, 27, 35, 39, 41]],
        ['El viejo de la frontera perdió su caballo: ¿quién sabe si no fue una suerte?', [5, 14, 28, 29, 36, 37]],
        ['Dale un pescado a alguien y come un día; enseñale a pescar y come toda la vida.', [3, 5, 9, 10, 17, 47]],
        ['Con la gente unida se mueve hasta una montaña.', [4, 15, 16, 31, 45, 49]],
        ['Una palabra amable abriga tres inviernos.', [8, 18, 20, 24, 33, 43]],
        ['Quien sabe estar contento es feliz siempre.', [1, 12, 34, 38, 41, 49]],
        ['El mar es grande porque recibe a cien ríos.', [8, 12, 17, 37, 38, 39]],
        ['Cuando baja el agua, aparecen las piedras.', [4, 6, 8, 11, 13, 43]],
        ['Para la gente, la comida es el cielo.', [5, 7, 25, 28, 37, 46]],
        ['El plan del año se hace en primavera; el del día, a la mañana.', [4, 9, 14, 23, 37, 41]],
        ['Mejor encender una vela que quejarse de la oscuridad.', [13, 14, 18, 25, 43, 49]],
        ['El mejor momento para plantar un árbol fue hace veinte años. El segundo mejor es hoy.', [1, 16, 24, 28, 33, 42]],
        ['Agujerito sin arreglar, agujerazo para llorar.', [14, 25, 29, 33, 34, 46]],
        ['Quien pregunta es tonto cinco minutos; quien no pregunta, lo es para siempre.', [3, 15, 18, 19, 24, 28]],
      ],
    },
  };

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

  // Logros por escalones: se cobran solos al llegar a cada meta. Dan monedas (c) y sobres del baúl (s), nunca experiencia.
  // pasos: [meta, monedas, sobres]; meta 'todo' = el total que corresponda (todo el kiosco, todos los altarcitos).
  const LOGROS = [
    { id: 'regalos', t: 'Regalos', u: 'regalos hechos', ic: '🎁', pasos: [[3, 25], [5, 50], [10, 0, 1], [20, 100, 1]] },
    { id: 'fotos', t: 'Fotos de misiones', u: 'fotos', ic: '📸', pasos: [[10, 30], [25, 60], [50, 100, 1], [100, 200, 2]] },
    { id: 'compras', t: 'Coleccionista del kiosco', u: 'cosas distintas compradas para vos', ic: '🛍️', pasos: [[5, 20], [15, 50], [30, 0, 1], ['todo', 300]] },
    { id: 'racha', t: 'Racha', u: 'días seguidos (tu mejor racha)', ic: '🔥', pasos: [[7, 50, 1], [14, 100, 1], [30, 300, 2]] },
    { id: 'dias', t: 'Presente', u: 'días que entraste', ic: '📅', pasos: [[10, 50], [30, 150]] },
    { id: 'reacciones', t: 'Reacciones', u: 'fotos con tu reacción', ic: '💬', pasos: [[10, 20], [50, 50], [100, 0, 1]] },
    { id: 'baul', t: 'El baúl', u: '% del baúl', ic: '🧳', pasos: [[25, 50], [50, 100], [100, 300]] },
    { id: 'hallazgos', t: 'Cosas que trajo el mar', u: 'botellas y galletas abiertas', ic: '🍾', pasos: [[5, 50], [15, 0, 1]] },
    { id: 'visitas', t: 'De visita', u: 'altarcitos visitados', ic: '🏖️', pasos: [[5, 20], ['todo', 50]] },
    { id: 'juntos', t: 'Mirar el mar juntos', u: 'personas con las que te sentaste a mirar el mar', ic: '🌊', pasos: [[1, 30], [3, 60], [6, 0, 1]] },
  ];
  // La botella entre amigos (desde "Mirar el mar"): una por día; a quien le llega, al abrirla, estas monedas.
  const BOTELLA_AMIGO = 10;

  // Lotes de playa: agrandan el altarcito hacia los costados (ancho = cuántas pantallas entra). Se compran una vez, en orden.
  const LOTES = [
    { id: 'lote1', n: 'Lote de al lado', ancho: 1.5, p: 300, lv: 6, d: 'Medio altarcito más de arena. Los vecinos todavía no se enteraron.' },
    { id: 'lote2', n: 'Lote doble', ancho: 2, p: 800, lv: 12, d: 'El doble de playa. Ya podés poner la sombrilla lejos de todo.' },
    { id: 'lote3', n: 'La playa entera', ancho: 3, p: 1500, lv: 18, d: 'De punta a punta. Si alguien pasa, paga peaje.' },
  ];

  // Kiosco: todo lo que se compra va al altarcito playero de cada uno.
  // side R = refugio (va de fondo y no se mueve; la carpa reemplaza a la sombrilla).
  // z = zona: 'mar' (flota o salta en el agua), 'fondo' (atrás de la arena); sin z, en la arena.
  // anim = 'salta', 'cola' o 'flota'. col = color inicial si se puede pintar; sin col, el color es fijo.
  const SHOP = [
    { id: 'sombrilla', n: 'Sombrilla', p: 40, lv: 1, side: 'R', col: '#f6a38f', d: 'Sombra portátil. Se clava con fe y se vuela con el primer viento.' },
    { id: 'carpa', n: 'Carpa de balneario', p: 110, lv: 3, side: 'R', col: '#a9d6f0', d: 'Lujo de balneario: sombra propia y derecho a mirar feo al que pasa.' },
    { id: 'mangrullo', n: 'Mangrullo', p: 180, lv: 4, z: 'fondo', d: 'Desde acá arriba se ve todo: el mar, los bañistas y quién no trajo nada para el mate.' },

    { id: 'yate', n: 'Yate', p: 600, lv: 8, z: 'mar', anim: 'flota', d: 'Anclado frente a tu altarcito. Nadie sabe cómo pagaste esto.' },
    { id: 'ballena', n: 'Ballenita', p: 200, lv: 6, z: 'mar', anim: 'salta', d: 'Salta justo cuando mirás para otro lado.' },
    { id: 'sirena', n: 'Cola de sirena', p: 160, lv: 6, z: 'mar', anim: 'cola', d: 'Solo se le ve la cola. Mejor no preguntar.' },
    { id: 'delfin', n: 'Delfín', p: 120, lv: 4, z: 'mar', anim: 'salta', d: 'Sale, saluda y se va. Mejor que muchos invitados.' },
    { id: 'delfinrosa', n: 'Delfín rosa', p: 150, lv: 4, z: 'mar', anim: 'salta', d: 'Rarísimo y muy consciente de eso.' },

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
    { id: 'basquet', n: 'Pelota de básquet', p: 18, lv: 3, d: 'No hay aro ni piso firme. Pica una vez y se queda a vivir en la arena.' },
    { id: 'toalla', n: 'Toalla', p: 20, lv: 1, col: '#cfc0f0', d: 'Territorio soberano. Pisarla con arena es declarar la guerra.' },
    { id: 'puchos', n: 'Atado de puchos', p: 20, lv: 1, d: 'El último. Eso dijiste el verano pasado.' },
    { id: 'naipes', n: 'Mazo para el truco', p: 20, lv: 1, d: 'Quien no mienta, que reparta.' },
    { id: 'mate', n: 'Mate y termo', p: 25, lv: 1, col: '#b6e5cd', d: 'Lavado a la tercera ronda, defendido hasta la última.' },
    { id: 'buzo', n: 'Buzo', p: 25, lv: 1, retirado: true, col: '#a9d6f0', d: 'Para cuando baja el sol y juraste que no ibas a tener frío.' },
    { id: 'rabas', n: 'Rabas con limón', p: 28, lv: 1, d: 'La gaviota ya las vio.' },
    { id: 'tejos', n: 'Tejos', p: 30, lv: 1, col: '#f6a38f', d: 'Deporte nacional de orilla. Se mide con la ojota y se discute igual.' },
    { id: 'salvavidas', n: 'Salvavidas', p: 30, lv: 1, col: '#f6a38f', d: 'Nadie lo necesita hasta que todos lo quieren.' },
    { id: 'porro', n: 'Porro', p: 30, lv: 3, d: 'Armado a mano. Se comparte hacia la izquierda.' },
    { id: 'cuchillo', n: 'Cuchillito', p: 30, lv: 4, col: '#f7b3c6', d: 'Para el salame. Por ahora.' },
    { id: 'lobo', n: 'Toallón del Lobo', p: 35, lv: 1, d: 'Azul y blanco. Aguanta lo que venga, como siempre.' },
    { id: 'estudiantes', n: 'Toallón de Estudiantes', p: 35, lv: 1, d: 'Rojo y blanco. Se seca rápido y te lo hace saber.' },
    { id: 'vino', n: 'Vino', p: 35, lv: 3, d: 'Tinto de playa: con hielo y sin culpa.' },
    { id: 'reposeraarg', n: 'Reposera argentina', p: 40, lv: 1, col: '#a9d6f0', d: 'La de caño y cintitas. Te deja la espalda rayada de recuerdo.' },
    { id: 'liebre', n: 'Liebre', p: 40, lv: 3, d: 'Autóctona del bosque esmeralda. Ranchea en tu lugar sin pedir permiso.' },
    { id: 'reposera', n: 'Reposera', p: 45, lv: 1, col: '#f6a38f', d: 'De madera y con clase. Le aprieta los dedos a quien la abre con soberbia.' },
    { id: 'zorrito', n: 'Zorrito', p: 45, lv: 4, d: 'Vecino del pinar. Si falta una ojota, ya sabés.' },
    { id: 'calavera', n: 'Calaverita', p: 45, lv: 6, col: '#f6a38f', d: 'Apareció en la duna. Tiene flor y mejor actitud que vos.' },
    { id: 'caipirinha', n: 'Tabla de caipirinha', p: 45, lv: 3, d: 'Limas, azúcar y una tabla que no llega entera a la noche.' },
    { id: 'fogata', n: 'Fogatita', p: 50, lv: 3, d: 'Chiquita y contenida. Todos saben prenderla, ninguno la prende.' },
    { id: 'heladerita', n: 'Heladerita con sanguchitos', p: 55, lv: 3, col: '#a9d6f0', d: 'Adentro hay sanguchitos de miga y la promesa de que alcanzan.' },
    { id: 'antorchas', n: 'Antorchas de playa', p: 55, lv: 3, d: 'Ambientan, espantan mosquitos y se creen Hawái.' },
    { id: 'tulio', n: 'Tulio', sub: 'el salchicha de Pachi', p: 55, lv: 3, d: 'Mide lo que una cuadra y entra en todos lados.' },
    { id: 'tony', n: 'Tony', sub: 'el gato de Jero y Viqui', p: 55, lv: 3, d: 'Gris, flaco y con ojos de ámbar. Te mira como si le debieras plata.' },
    { id: 'feluchis', n: 'Feluchis', sub: 'la gata de Jose', p: 55, lv: 3, d: 'Duerme con los ojos apretados y te juzga igual.' },
    { id: 'pompi', n: 'Pompi', sub: 'el gato de Juani', p: 55, lv: 3, d: 'Naranja, flaco y veloz. Cuando llegás, ya se fue.' },
    { id: 'renu', n: 'Renu', sub: 'la perrita de Nachote', p: 55, lv: 3, d: 'Olfato de bretona: detecta un asado a tres balnearios.' },
    { id: 'leda', n: 'Leda', sub: 'la perra de Rochi', p: 55, lv: 3, d: 'Cabeza de huevo, corazón de dulce de leche.' },
    { id: 'pure', n: 'Puré', sub: 'la perra de Sofi', p: 55, lv: 3, d: 'Petisa, con orejas de antena. Se duerme en cualquier asiento de auto, de copiloto.' },
    { id: 'kuky', n: 'Kuky', sub: 'la perra del Chino', p: 55, lv: 3, d: 'Redondita y peluda. Cruza las patas como una señora y mira todo con ojos de miel.' },
    { id: 'marihuana', n: 'Planta de marihuana', p: 60, lv: 3, d: 'Creció sola, dice. Da sombra, risas y hambre.' },
    { id: 'neoprene', n: 'Traje de neoprene', p: 60, lv: 3, col: '#a9d6f0', d: 'Entrar cuesta. Salir, más. Surfista al menos de lejos.' },
    { id: 'tabla', n: 'Tabla de surf', p: 70, lv: 4, col: '#f7b3c6', d: 'Viaja en el techo del Sandero. Surfear es opcional.' },
    { id: 'guitarra', n: 'Guitarra criolla', p: 80, lv: 3, d: 'Cinco cuerdas sanas. Alguien va a arrancar con la de siempre.' },
    { id: 'kayak', n: 'Kayak', p: 130, lv: 4, col: '#ffe39a', d: 'Para adentro se rema con ganas. Para afuera, con arrepentimiento.' },
    { id: 'corona', n: 'Corona enterrada', p: 150, lv: 8, col: '#f7b3c6', d: 'Alguien la enterró antes que vos. Nadie reclamó el trono.' },
    { id: 'moto', n: 'Moto de agua', p: 320, lv: 6, col: '#e8735a', d: 'Ruido, nafta y envidia. Cara, como todo lo que no necesitás.' },
    { id: 'ps5', n: 'PS5', p: 400, lv: 6, d: 'En la playa no hay enchufe. Igual la trajiste.' },

    // Únicas (unico: true): no se venden en el kiosco, llegan solo de regalo (cumpleaños y fechas así).
    { id: 'mellis', n: 'Cartel de mellis sueltas', p: 0, lv: 1, unico: true, d: 'Señalización oficial de la Costa: por esta playa andan dos mellis sueltas. Regalo de cumple, 26/11/2026.' },
  ];
  // Regalos de cumpleaños: cuando llega de regalo una de estas cosas, se abre con un saludo grande y papelitos.
  const CUMPLES = { mellis: { t: '¡FELIZ CUMPLE, MELLIS!', s: 'Hay dos mellis sueltas por la playa. Avisen a los guardavidas.' } };
  // Cosas de la tienda vieja: se muestran como lo más parecido de la nueva (nadie pierde lo que compró).
  const ALIAS = { cangrejo: 'estrella', osito: 'liebre', helado: 'sandia', pulpo: 'caracoles', choripan: 'heladerita',
    gatito: 'tony', salchicha: 'tulio', champa: 'vino', balde: 'heineken' };
  const COLORS = ['#f6a38f', '#f7b3c6', '#ffe39a', '#b6e5cd', '#a9d6f0', '#cfc0f0', '#7fb8e6', '#e8735a', '#fffaf1', '#5b4d72'];

  const CARTAS_V = 3; // subir cuando cambien las tarjetas del bucket (cartas/)

  // La foto del 8/12: dos autos, la tabla, Tulio y la colonia entera. Las cosas se destraban con la XP de todos (la meta es secreta).
  // Cada persona aparece cuando sube sus primeras "figus" figuritas; "ultimo" (quien hizo la app) aparece recién
  // cuando ya están todos los demás. El 8/12 se revela entera igual.
  const FOTO = {
    // 'dibujo' = el provisorio en SVG. 'recortes' = la imagen de nanobanana entera de base y, encima, un PNG por persona
    // o cosa (mismo tamaño que la base, transparente salvo esa persona). Lo que todavía no aparece se ve como silueta.
    modo: 'recortes',
    recortes: {
      ancho: 896, alto: 1200,
      base: 'foto/base.jpg',
      ext: 'webp',
      v: 5, // subir este número cuando se reemplacen las imágenes del bucket
      // de atrás para adelante (las personas no se pisan entre sí; las cosas ya vienen sin la gente encima)
      capas: ['sandero', 'fox', 'tabla', 'sofi', 'chino', 'grego',
        'nico', 'nachote', 'juani', 'jero', 'jose', 'viqui', 'pachi', 'rochi', 'juli', 'rich',
        'heladerita', 'bolsos', 'tulio'],
      silueta: 'papel', // 'papel' (recorte crema con borde) o 'fantasma' (la persona lavada, sin revelar)
    },
    goal: 2600,
    figus: 3,
    ultimo: 'jero',
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
      { at: 1, t: 'La foto revelada', d: 'Se ve entera, para guardar', fecha: 'antes de volver' },
    ],
  };

  // Fotos subidas durante la beta (persona, misión, fecha). Las de misiones secretas no van acá.
  const VESTIGIOS = [['rochi', 'dia-2026-11-17', '17/11'], ['nico', 'dia-2026-11-17', '17/11'], ['nico', 'flor', '18/11'],
    ['jero', 'dia-2026-11-18', '18/11'], ['rochi', 'selfie-nueva', '18/11'], ['viqui', 'dia-2026-11-18', '18/11']];
  return { CUMPLES, LOGROS, LOTES, BOTELLA_AMIGO, RACHA, xpRegalo, PEOPLE, LEVELS, SERIES, COSTA, MISSIONS, DAILY_TRIP, DAILY_POOL, DAILY_ENTRE, DAILY_LEJOS, DAILY_PROPIA, DUO, RUTA, JUEGO, CAPITULOS, COLECCION, BONOS, HALLAZGOS, SECRETAS, ACH, SHOP, ALIAS, COLORS, FOTO, CARTAS_V, VESTIGIOS };
})();
