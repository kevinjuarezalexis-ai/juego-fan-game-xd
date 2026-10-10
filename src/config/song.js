// ══════════════════════════════════════
//   Timeline de la canción
// ══════════════════════════════════════
// Tiempos en segundos de la canción (1:30 = 90). Los que me pasaste están
// puestos tal cual; los demás son estimados → ajustalos con ?debug + M.
//
// partes   → checkpoints (al perder reintentás desde el inicio de la parte)
// segments → quién está en escena y qué mecánica se juega desde t
// events   → acciones puntuales (poses, caminar, cámara, filtros...)
// dialogue → cuadros de diálogo con tiempo
//
// BPM y offset detectados analizando el audio (146 BPM, primer beat ~0.36 s).

window.FB = window.FB || {};

// Personaje en escena: P(id, pose, x, { face: 'left'|'right', sil: true })
const P = (id, state, x, extra = {}) => ({ id, state, x, ...extra });
// 2:12.8 → 2:35.8 de fondo se escucha "¡RATERO!" con la voz de cada personaje:
// aparecen en pantalla con el color de cada uno, cada vez más grandes (tiempos aprox.)
const RATERO = (() => {
  const cols = ['#4aa3ff', '#ff6fb0', '#a9b0ff', '#ff8a3d', '#e8c060', '#6fd0a0', '#ffffff'];
  const out = [];
  let i = 0;
  for (let t = 132.79; t < 155.4; t += 1.45 - (t - 132.79) * 0.035) {
    const k = (t - 132.79) / 22.6; // 0 → 1
    out.push({
      t: +t.toFixed(2),
      type: 'text',
      text: '¡RATERO!',
      color: cols[i++ % cols.length],
      x: 640 + Math.sin(i * 2.3) * 420,
      y: 130 + ((i * 97) % 230),
      size: Math.round(22 + k * 26),
      rot: Math.sin(i * 1.7) * 0.18,
      dur: 1.3,
    });
  }
  return out;
})();

// fila de atrás (aliados ya salvados) repartida detrás del jugador
// Desde que se cura Quico: el jugador y los salvados a la IZQUIERDA, los corrompidos salen por la DERECHA.
const BACKROW = (ids) =>
  ids.map((id, i) => P(id, 'sano', [290, 200, 110, 245, 155, 65][i], { back: true, face: 'right' }));

// back: true = capa de atrás (más chico y oscuro, con distancia). Para los ya salvados (atrás de Jirafales, a la izquierda).
const ATRAS = BACKROW(['florinda', 'quico']);

// Respuestas: ok true = buena (sube la barra), false = mala (daño), 'neutral' = nada
const opt = (text, ok, reply) => ({ text, ok, reply });

// ── Preguntas (textos provisorios: cambialos por los tuyos) ──
const Q = {
  // 0:36 → 1:30 hablarle a Doña Florinda
  florinda: [
    {
      t: 40, time: 6.5, speaker: 'Doña Florinda',
      prompt: '¿Usted también vino a culpar al Chavo, Profesor?',
      options: [
        opt('Vine por usted, Doña Florinda.', true, '...¿por mí?'),
        opt('¡Ese muchacho siempre fue un problema!', false, '¡Igual que todos!'),
        opt('¿Qué le pasó a la vecindad?', 'neutral', '...no lo recuerdo.'),
      ],
    },
    {
      t: 47.5, time: 6.5, speaker: 'Doña Florinda',
      prompt: '¡Váyase! ¡Aquí ya no hay ninguna fiesta!',
      options: [
        opt('No me voy sin usted.', true, 'Usted siempre tan caballero...'),
        opt('Está bien, ya me voy.', false, '¡Cobarde!'),
        opt('¿Me permite pasar?', 'neutral', '...'),
      ],
    },
    {
      t: 56, time: 6.5, speaker: 'Doña Florinda',
      prompt: 'Mi tesoro... ¿dónde está mi Quico?',
      options: [
        opt('Está aquí. Vamos a ayudarlo juntos.', true, '...Quico...'),
        opt('Quico ya no tiene salvación.', false, '¡NO DIGA ESO!'),
        opt('No lo sé.', 'neutral', '...'),
      ],
    },
    {
      t: 64.5, time: 6.5, speaker: 'Doña Florinda',
      prompt: 'Todo esto es culpa de esa chusma...',
      options: [
        opt('No, Doña Florinda. Nadie le creyó al Chavo.', true, '...el Chavo...'),
        opt('Sí, es culpa de ellos.', false, '¡CHUSMA, CHUSMA!'),
        opt('Tranquila...', 'neutral', '...'),
      ],
    },
    {
      t: 73, time: 6.5, speaker: 'Doña Florinda',
      prompt: '¿Por qué no me deja en paz, Profesor?',
      options: [
        opt('Porque usted me importa, Florinda.', true, '...Profesor Jirafales...'),
        opt('Porque usted me invitó a la fiesta.', 'neutral', '...la fiesta...'),
        opt('Porque no tengo otra opción.', false, '¡Lárguese!'),
      ],
    },
    {
      t: 81.5, time: 6, speaker: 'Doña Florinda',
      prompt: '...¿gusta pasar a tomar una tacita de café?',
      options: [
        opt('Sería un placer, Doña Florinda.', true, '¡Ay, Profesor!'),
        opt('No, gracias.', false, '...'),
        opt('¿Café a estas horas?', 'neutral', '...'),
      ],
    },
  ],

  // 1:30 → 2:00 hablarle a Quico
  quico: [
    {
      t: 94, time: 6.5, speaker: 'Quico',
      prompt: '¡Cállese, cállese, cállese, que me desespera!',
      options: [
        opt('Quico, tu mamá ya está bien.', true, '...¿mami?'),
        opt('¡Cállate tú!', false, '¡CHUSMA!'),
        opt('...', 'neutral', '...'),
      ],
    },
    {
      t: 102.5, time: 6.5, speaker: 'Quico',
      prompt: 'El Chavo... el Chavo tiene la culpa de todo...',
      options: [
        opt('El Chavo nunca te hizo daño, Quico.', true, '...es que...'),
        opt('Sí, el Chavo tiene la culpa.', false, '¡RATERO!'),
        opt('¿Qué te hizo?', 'neutral', '...nada...'),
      ],
    },
    {
      t: 111, time: 6.5, speaker: 'Quico',
      prompt: '¿Usted cree que... todavía puedo ser bueno?',
      options: [
        opt('Claro que sí, Quico.', true, '...gracias, Profesor.'),
        opt('No lo sé.', 'neutral', '...'),
        opt('Ya es tarde para ti.', false, '...'),
      ],
    },
  ],

  // 2:28 la pregunta del Chavo (las respuestas que me pasaste)
  chavo: [
    {
      t: 147.8, time: 5.5, speaker: 'El Chavo',
      prompt: 'Yo le dije que no fui yo.',
      options: [
        opt('Yo sabía que no fuiste tú.', 'neutral', 'Demasiado tarde.'),
        opt('¿Qué te pasó, Chavo?', 'neutral', '...'),
        opt('¿Por qué hiciste eso?', 'neutral', 'Yo no quería hacerlo.'),
      ],
    },
  ],

  // 3:00 → 4:00 hablarle a Don Ramón mientras esquivás
  ramon: [
    {
      t: 184, time: 7, speaker: 'Don Ramón',
      prompt: '¡Fuera de aquí! ¡Aquí no hay nada para nadie!',
      options: [
        opt('Don Ramón, soy yo, el Profesor.', true, '...¿Profesor?'),
        opt('¡Págueme lo que me debe!', false, '¡No hay dinero!'),
        opt('...', 'neutral', '...'),
      ],
    },
    {
      t: 194, time: 7, speaker: 'Don Ramón',
      prompt: 'No hay dinero, no hay trabajo... no hay nada.',
      options: [
        opt('Hay algo: su hija lo necesita.', true, '...mi hija...'),
        opt('Siempre fue un flojo.', false, '¡SÓLO PORQUE NO TE DOY OTRA...!'),
        opt('Ya saldrá algo.', 'neutral', '...'),
      ],
    },
    {
      t: 204, time: 7, speaker: 'Don Ramón',
      prompt: '¿Para qué? Si el Chavo ya no está...',
      options: [
        opt('Él querría que usted siguiera.', true, '...ese Chavo...'),
        opt('Mejor así.', false, '¡¿QUÉ DIJO?!'),
        opt('No sé qué decirle.', 'neutral', '...'),
      ],
    },
    {
      t: 214, time: 7, speaker: 'Don Ramón',
      prompt: '¡Ahí va la cachetada! ...digo... ¿por qué sigue aquí?',
      options: [
        opt('Porque es mi amigo, Don Ramón.', true, '...amigo...'),
        opt('Porque me divierte.', false, '¡Ahora verá!'),
        opt('Porque sí.', 'neutral', '...'),
      ],
    },
    {
      t: 224, time: 7, speaker: 'Don Ramón',
      prompt: 'La Chilindrina... ¿dónde está mi hijita?',
      options: [
        opt('Está aquí, y la vamos a salvar juntos.', true, '...mi Chilindrina...'),
        opt('Ya no hay nada que hacer.', false, '¡NOOO!'),
        opt('Por allá.', 'neutral', '...'),
      ],
    },
  ],

  // 4:00 → 4:22 motivar a Don Ramón
  motivar: [
    {
      t: 245.5, time: 6, speaker: 'Don Ramón',
      prompt: 'Les fallé... no merezco ni que me miren.',
      options: [
        opt('Todavía puede salvarla, Don Ramón.', true, '...¿usted cree?'),
        opt('Sí, les falló.', false, '...'),
        opt('Todos fallamos.', 'neutral', '...'),
      ],
    },
    {
      t: 253, time: 6, speaker: 'Don Ramón',
      prompt: '¿Y si no puedo?',
      options: [
        opt('¡Usted es el único que puede, es su papá!', true, '...tiene razón.'),
        opt('Entonces ni lo intente.', false, '...'),
        opt('Hágalo por el Chavo.', true, '...por el Chavo.'),
      ],
    },
  ],
  // 6:51 → 7:36 liberar al Sr. Barriga (mientras esquivás)
  barriga: [
    {
      t: 416, time: 7, speaker: 'Sr. Barriga',
      prompt: '¡Tenía que ser el Chavo del Ocho!',
      options: [
        opt('El Chavo no tuvo la culpa, Señor Barriga.', true, '...¿no?'),
        opt('¡Sí, todo es culpa del Chavo!', false, '¡LO SABÍA!'),
        opt('¿Cómo sigue su callo?', 'neutral', '¡AAAY!'),
      ],
    },
    {
      t: 425, time: 7, speaker: 'Sr. Barriga',
      prompt: '¡Me deben catorce meses de renta!',
      options: [
        opt('Ahora lo que importa es su hijo.', true, '...Ñoño...'),
        opt('¡No pienso pagarle nada!', false, '¡Sinvergüenza!'),
        opt('Mañana le pago.', 'neutral', '¡Siempre lo mismo!'),
      ],
    },
    {
      t: 434, time: 7, speaker: 'Sr. Barriga',
      prompt: 'Siempre que vengo a esta vecindad me pasa algo...',
      options: [
        opt('Esta vez vino a salvar a alguien.', true, '...a Ñoño.'),
        opt('Entonces no venga más.', false, '¡Ni loco vuelvo!'),
        opt('Es la costumbre.', 'neutral', '...'),
      ],
    },
    {
      t: 443, time: 7, speaker: 'Sr. Barriga',
      prompt: '¿Dónde está mi Ñoño?',
      options: [
        opt('Ahí está. Vamos a salvarlo juntos.', true, '...hijo mío...'),
        opt('Ya es tarde para él.', false, '¡NOOO!'),
        opt('No sé.', 'neutral', '...'),
      ],
    },
  ],

  // 7:36 → 8:22 rescatar a Ñoño (jugás con el Sr. Barriga)
  nono: [
    {
      t: 461, time: 7, speaker: 'Ñoño',
      prompt: '¡Ay, mi cuerpecito!',
      options: [
        opt('Ñoño, soy tu papá.', true, '...¿papá?'),
        opt('¡Deja de quejarte!', false, '¡Buaaa!'),
        opt('...', 'neutral', '...'),
      ],
    },
    {
      t: 470, time: 7, speaker: 'Ñoño',
      prompt: 'El Chavo me dejó ahí... solito.',
      options: [
        opt('El Chavo no quería hacerte daño.', true, '...yo sé...'),
        opt('Te lo merecías.', false, '¡¿QUÉ?!'),
        opt('¿Te duele?', 'neutral', '...mi cuerpecito...'),
      ],
    },
    {
      t: 479, time: 7, speaker: 'Ñoño',
      prompt: '¿Me vas a regañar, papá?',
      options: [
        opt('No, hijo. Vine a llevarte a casa.', true, '...papá...'),
        opt('Sí, y mucho.', false, '¡No quiero!'),
        opt('Después hablamos.', 'neutral', '...'),
      ],
    },
    {
      t: 488, time: 7, speaker: 'Ñoño',
      prompt: '¿Hay torta de jamón en la casa?',
      options: [
        opt('Las que quieras, Ñoño.', true, '¡Eso!'),
        opt('No.', false, '...'),
        opt('Primero salí de ahí.', 'neutral', '...'),
      ],
    },
  ],
};

FB.SONG = {
  titulo: 'Fiesta de la Buena Vecindad',
  music: 'src/assets/music/fiesta.mp3',
  bpm: 146,
  offset: 0.36, // segundos hasta el primer beat
  length: 628, // solo se usa si no hay archivo de música

  // ── Intro (antes de la música): escenas tipo cómic en fondo0 ──
  // Click / Z / Enter avanza · Esc salta. Al terminar: fundido → patio + música.
  // Pasos: say ['quién','texto'] · walk {from,to,dur} · pose · exit (se va por la puerta)
  intro: {
    bg: 'entrada',
    zoom: 1.12,
    startX: 1450,
    steps: [
      { walk: { from: 1450, to: 780, dur: 4.5 }, say: ['Prof. Jirafales', 'Doña Florinda me invitó a la fiesta de la buena vecindad...'] },
      { say: ['Prof. Jirafales', 'Qué raro... no se escucha nada desde afuera.'] },
      { say: ['Prof. Jirafales', 'Tal vez todavía no empezó. Bueno... con permiso.'] },
      { walk: { to: 640, dur: 1.4 }, exit: true }, // entra por el portón
    ],
  },

  partes: [
    { n: 0, nombre: 'Prólogo', t: 0 },
    { n: 1, nombre: 'Doña Florinda', t: 37.3 },
    { n: 2, nombre: 'Quico', t: 90 },
    { n: 3, nombre: 'El Chavo', t: 130 },
    { n: 4, nombre: 'La Chilindrina y Don Ramón', t: 167 },
    { n: 5, nombre: 'Monchito al rescate', t: 262 },
    { n: 6, nombre: 'La verdad del Chavo', t: 322 },
    { n: 7, nombre: 'Ñoño', t: 374 },
    { n: 8, nombre: 'El Sr. Barriga', t: 411 },
    { n: 9, nombre: 'Rescatar a Ñoño', t: 456 },
    { n: 10, nombre: 'La última fiesta', t: 527 },
  ],

  // Cada segmento lista TODOS los personajes en escena además del jugador
  // (rivales y aliados), con pose, posición x y hacia dónde miran.
  segments: [
    // ── Prólogo: patio a oscuras ──
    { t: 0, stage: { bg: 'patio', opponents: [], player: 'normal', tension: 0.3, bumpEvery: 0 }, mechanic: { type: 'none' } },
    // 0:09 Quico atrás, silueta negra gritando
    { t: 9, stage: { opponents: [P('quico', 'grito', 320, { sil: true })], tension: 0.4 }, mechanic: { type: 'none' } },

    // ── Parte 1 (0:37.3): sale Doña Florinda → hablarle para liberarla ──
    {
      t: 37.3,
      stage: { opponents: [P('quico', 'corrupto', 210), P('florinda', 'corrupto', 450)], tension: 0.45, bumpEvery: 4 },
      mechanic: {
        type: 'rescue',
        target: 'florinda',
        questions: Q.florinda,
        dodge: {
          damage: 9,
          patterns: [
            { type: 'mano', every: 4, warn: 1 }, // cachetadas de Florinda (mano gris que cruza)
            { type: 'pelota', every: 4, offset: 2 }, // pelotas de Quico
          ],
        },
      },
    },

    // ── Parte 2 (1:30): Florinda libre (se pone atrás de Jirafales) → hablarle a Quico ──
    {
      t: 90,
      stage: {
        opponents: [P('quico', 'corrupto', 300), P('florinda', 'sano', 1150, { back: true, face: 'left' })],
        tension: 0.4,
        bumpEvery: 4,
      },
      mechanic: {
        type: 'rescue',
        target: 'quico',
        questions: Q.quico,
        dodge: {
          damage: 9,
          patterns: [
            { type: 'pelota', every: 2 }, // pelotas de Quico
            { type: 'lagrimas', every: 4, offset: 1, count: 3 }, // lágrimas de Quico
          ],
        },
      },
    },
    // 2:00 Quico curado: Jirafales y Florinda van con Quico y se quedan ahí (izquierda)
    {
      t: 120,
      stage: { opponents: [P('quico', 'sano', 300), P('florinda', 'sano', 1150, { face: 'left' })], tension: 0.25, bumpEvery: 0 },
      mechanic: { type: 'none' },
    },

    // ── Parte 3 (2:10): aparece el Chavo a la derecha (los salvados, atrás de Jirafales) ──
    {
      t: 130,
      stage: { opponents: [...ATRAS, P('chavo', 'espalda', 960, { face: 'left' })], tension: 0.35 }, // de espaldas: no se le ve la cara
      mechanic: { type: 'none' },
    },
    // la pregunta del Chavo
    {
      t: 148,
      stage: { opponents: [...ATRAS, P('chavo', 'espalda', 960, { face: 'left' })] },
      mechanic: { type: 'choice', replyTime: 2, questions: Q.chavo },
    },
    // 2:35.76 su verdadera forma → combate DIFÍCIL hasta 2:46
    {
      t: 155.76,
      stage: { opponents: [...ATRAS, P('chavo', 'revelado', 960, { face: 'left' })], tension: 0.9, bumpEvery: 2 },
      mechanic: {
        type: 'bulletbox',
        damage: 14,
        speed: 280,
        patterns: [
          { type: 'apuntado', every: 2, speed: 260 }, // pelotitas rojas
          { type: 'corte', every: 2, offset: 1, count: 2, warnSec: 2 }, // cortes rojos (avisan 2 s antes)
        ],
      },
    },
    // 2:46 el Chavo se desvanece y se va la caja
    {
      t: 166,
      stage: { opponents: [...ATRAS], tension: 0.6, bumpEvery: 0 },
      mechanic: { type: 'none' },
    },

    // ── Parte 4 (2:47): la Chilindrina → 3:00 Don Ramón ──
    {
      t: 167,
      stage: { opponents: [...ATRAS, P('chilindrina', 'corrupto', 840, { face: 'left' })], tension: 0.6 },
      mechanic: { type: 'none' },
    },
    // 2:59.3 → 4:00 hablarle a Don Ramón mientras esquivás sus ataques
    {
      t: 179.3,
      stage: {
        opponents: [
          ...ATRAS,
          P('chilindrina', 'corrupto', 840, { face: 'left' }),
          P('ramon', 'corrupto', 1080, { face: 'left' }),
        ],
        tension: 0.6,
        bumpEvery: 4,
      },
      mechanic: {
        type: 'rescue',
        target: 'ramon',
        questions: Q.ramon,
        dodge: {
          damage: 8,
          patterns: [
            { type: 'lluvia', every: 2, count: 2 },
            { type: 'cachetada', every: 4, offset: 1, warn: 1.5, dir: 'col' }, // coscorrón
            { type: 'muro', every: 8, offset: 3, gap: 80, speed: 200 },
          ],
        },
      },
    },
    // 4:00 Don Ramón libre: "les fallé..." → hay que motivarlo (cinemática)
    {
      t: 240,
      stage: {
        opponents: [
          ...ATRAS,
          P('chilindrina', 'corrupto', 840, { face: 'left' }),
          P('ramon', 'sano', 1080, { face: 'left' }),
        ],
        tension: 0.4,
        bumpEvery: 0,
      },
      mechanic: { type: 'choice', healOk: 8, questions: Q.motivar },
    },

    // ── Parte 5 (4:22): jugás con Don Ramón; los demás atrás de él ──
    {
      t: 262,
      stage: {
        opponents: [
          ...BACKROW(['florinda', 'quico', 'jirafales']),
          P('chilindrina', 'corrupto', 720, { face: 'left' }),
          P('chavo', 'alma', 330, { ghost: true, back: true, face: 'right' }), // su alma lo ayuda
        ],
        tension: 0.2,
        bumpEvery: 4,
      },
      mechanic: { type: 'none' },
    },
    // 4:34 → 5:04 el baile de Peluchín: 1 vez te lo muestran, después "¡REPITE!" (8 veces en total)
    {
      t: 272,
      stage: {
        opponents: [
          ...BACKROW(['florinda', 'quico', 'jirafales']),
          P('chilindrina', 'corrupto', 720, { face: 'left' }),
          P('chavo', 'alma', 330, { ghost: true, back: true, face: 'right' }),
        ],
        bumpEvery: 2,
      },
      mechanic: {
        type: 'rhythm',
        lanes: ['left', 'right', 'confirm'],
        pattern: ['left', 'left', 'right', 'right', 'left', 'right', 'confirm'],
        every: 1,
        rest: 1, // 7 pasos + 1 de pausa = 8 tiempos por repetición
        startAt: 274.09, // primer paso, en el golpe de la música
        reps: 8,
        demoReps: 1, // la 1ª la baila la Chilindrina sola → "¡REPITE!"
        demoDancer: 'chilindrina',
        dancer: 'ramon',
        dancers: ['chilindrina'],
        dancePoses: { left: 'baile_izq', right: 'baile_der', confirm: 'baile_enter' },
        x: 1010, // carriles a la derecha (Ramón a la izquierda, la Chilindrina en el medio)
        speed: 560,
        missDamage: 4,
        target: 'chilindrina',
      },
    },
    // 5:04 Chilindrina libre: se juntan los 5 (vuelve Jirafales como jugador)
    {
      t: 304,
      stage: {
        opponents: [
          P('quico', 'sano', 100, { face: 'right' }),
          P('florinda', 'sano', 230, { face: 'right' }),
          P('ramon', 'sano', 520, { face: 'right' }),
          P('chilindrina', 'curada', 650, { face: 'left' }),
        ],
        tension: 0.15,
        bumpEvery: 0,
      },
      mechanic: { type: 'none' },
    },

    // ── Parte 6 (5:22): el Chavo sano cuenta lo que pasó ──
    {
      t: 322,
      stage: {
        opponents: [
          P('quico', 'sano', 100, { face: 'right' }),
          P('florinda', 'sano', 230, { face: 'right' }),
          P('ramon', 'sano', 520, { face: 'right' }),
          P('chilindrina', 'sano', 650, { face: 'right' }),
          P('chavo', 'triste', 1000, { face: 'left' }),
        ],
        tension: 0.1,
      },
      mechanic: { type: 'none' },
    },

    // ═══════════════ SEGUNDA MITAD ═══════════════
    // 5:56 el Chavo falso se va (tensión subiendo hasta 6:14)
    {
      t: 356,
      stage: {
        opponents: [
          P('quico', 'sano', 100, { face: 'right' }),
          P('florinda', 'sano', 230, { face: 'right' }),
          P('ramon', 'sano', 520, { face: 'right' }),
          P('chilindrina', 'sano', 650, { face: 'right' }),
        ],
      },
      mechanic: { type: 'none' },
    },

    // ── Parte 7 (6:14): escena del capítulo animado, en tinta (fondo blanco, siluetas negras). Jugás con Don Ramón ──
    {
      t: 374,
      stage: {
        opponents: [
          // el recuerdo: sólo el Chavo y Ñoño (los demás vuelven en 6:36)
          P('chavo', 'normal', 860, { face: 'left' }),
          P('nono', 'sano', 460, { face: 'right' }),
        ],
        tension: 0,
        bumpEvery: 0,
      },
      mechanic: { type: 'none' },
    },
    // 6:36 Quico se une al combate (adelante, al lado de Don Ramón, a la izquierda)
    {
      t: 396,
      stage: {
        opponents: [
          ...BACKROW(['jirafales', 'florinda', 'chilindrina']),
          P('quico', 'sano', 260, { face: 'right' }),
          P('chavo', 'normal', 860, { face: 'left' }),
        ],
      },
      mechanic: { type: 'none' },
    },
    // 6:39 vuelve el color: Ñoño corrompido → combate
    {
      t: 399,
      stage: {
        opponents: [
          ...BACKROW(['jirafales', 'florinda', 'chilindrina']),
          P('quico', 'sano', 260, { face: 'right' }),
          P('nono', 'corrupto', 960, { face: 'left' }),
        ],
        tension: 0.55,
        bumpEvery: 2,
      },
      mechanic: {
        type: 'bulletbox',
        damage: 10,
        patterns: [
          { type: 'lluvia', every: 1, count: 2 },
          { type: 'pelota', every: 4, offset: 2 },
        ],
      },
    },

    // ── Parte 8 (6:51): se suma el Sr. Barriga → primero liberarlo a él ──
    {
      t: 411,
      stage: {
        opponents: [
          ...BACKROW(['jirafales', 'florinda', 'chilindrina']),
          P('quico', 'sano', 260, { face: 'right' }),
          P('nono', 'corrupto', 1000, { face: 'left' }),
          P('barriga', 'corrupto', 760, { face: 'left' }),
        ],
        tension: 0.6,
        bumpEvery: 2,
      },
      mechanic: {
        type: 'rescue',
        target: 'barriga',
        questions: Q.barriga,
        dodge: {
          damage: 10,
          patterns: [
            { type: 'lluvia', every: 2, count: 3 }, // monedas / recibos de la renta
            { type: 'muro', every: 4, offset: 1, gap: 75 },
            { type: 'pelota', every: 8, offset: 5 },
          ],
        },
      },
    },

    // ── Parte 9 (7:36): el Sr. Barriga libre reemplaza a Don Ramón → rescatar a Ñoño ──
    {
      t: 456,
      stage: {
        opponents: [
          ...BACKROW(['jirafales', 'florinda', 'chilindrina', 'ramon']),
          P('quico', 'sano', 260, { face: 'right' }),
          P('nono', 'corrupto', 960, { face: 'left' }),
        ],
        tension: 0.6,
        bumpEvery: 2,
      },
      mechanic: { type: 'none' },
    },
    {
      t: 458,
      stage: {
        opponents: [
          ...BACKROW(['jirafales', 'florinda', 'chilindrina', 'ramon']),
          P('quico', 'sano', 260, { face: 'right' }),
          P('nono', 'corrupto', 960, { face: 'left' }),
        ],
      },
      mechanic: {
        type: 'rescue',
        target: 'nono',
        questions: Q.nono,
        hopePose: 'salvando', // cuando la barra de liberación pasa el 60%: la pose de "lo están salvando"
        hopeAt: 0.6,
        dodge: {
          damage: 10,
          patterns: [
            { type: 'lluvia', every: 1, count: 2 },
            { type: 'apuntado', every: 4, offset: 1, speed: 220 },
            { type: 'cachetada', every: 8, offset: 6, warn: 1.5 },
          ],
        },
      },
    },
    // 8:22 Ñoño libre: todos juntos
    {
      t: 502,
      stage: {
        opponents: [
          ...BACKROW(['jirafales', 'florinda', 'chilindrina', 'ramon']),
          P('quico', 'sano', 260, { face: 'right' }),
          P('nono', 'sano', 960, { face: 'left' }),
        ],
        tension: 0.1,
        bumpEvery: 0,
      },
      mechanic: { type: 'none' },
    },

    // 8:34 video cortito (src/assets/video/escena.mp4) → si no existe, se sigue viendo la escena
    {
      t: 514,
      stage: { tension: 0.4 },
      mechanic: { type: 'none' },
    },

    // ── Parte 10 (8:47): batalla final contra el Chavo en su forma final (escopeta: bloquear / disparar) ──
    {
      t: 527,
      stage: {
        bg: 'patio',
        opponents: [
          ...BACKROW(['florinda', 'chilindrina', 'quico', 'ramon', 'barriga', 'nono']),
          P('chavo', 'corrupto', 960, { face: 'left' }), // empieza como corrupto y se transforma (evento 533)
        ],
        player: 'escopeta',
        tension: 1,
        bumpEvery: 2,
      },
      mechanic: {
        type: 'blockshoot',
        boss: 'chavo',
        bossName: 'El Chavo (forma final)',
        bossHp: 100,
        attackEvery: 4,
        warnBeats: 2,
        damage: 12,
        shootDamage: 5,
        minHpUntil: 619.5, // no cae antes de 10:20
      },
    },
    // 10:20 derrotado → final
    {
      t: 620.5,
      stage: {
        opponents: [
          ...BACKROW(['florinda', 'chilindrina', 'quico', 'ramon', 'barriga', 'nono']),
          P('chavo', 'derrotado', 960, { face: 'left' }),
        ],
        tension: 0,
        bumpEvery: 0,
      },
      mechanic: { type: 'none' },
    },
  ],

  // ── Efectos y acciones puntuales ──
  //  { t, type: 'zoom', to: 1.2, dur: 0.5, ease: 'out' }        zoom suave
  //  { t, type: 'bump', every: 2, amount: 0.04 }                 zoom rítmico (every: 0 lo apaga)
  //  { t, type: 'bump', amount: 0.08 }                           un golpe de zoom suelto
  //  { t, type: 'focus', on: 'left'|'right'|'center'|'chavo', zoom: 1.3, dur: 0.6, follow: true }
  //  { t, type: 'pan', x: -150, y: 0, dur: 0.6 }                 mover cámara a mano
  //  { t, type: 'tilt', deg: -4, dur: 0.4 }                      inclinar cámara
  //  { t, type: 'shake', power: 12, dur: 0.4 }                   temblor
  //  { t, type: 'filter', mode: 'gris'|'oscuro'|'bn'|'none', dur: 0.3, keep: ['chavo'], amount: 1 }
  //  { t, type: 'flashSprite', char: 'chavo', dur: 0.35, shake: 8 }   parpadeo blanco + temblor
  //  { t, type: 'flash', dur: 0.4 }                              flash blanco de pantalla
  //  { t, type: 'setState', char: 'chavo', state: 'revelado' }   cambiar pose
  //  { t, type: 'pose', char: 'quico', state: 'grito', dur: 0.5 } pose por un rato
  //  { t, type: 'walk', char: 'jirafales', from: 1010, to: 400, dur: 3, end: 'normal' }
  //  { t, type: 'face', char: 'jirafales', dir: 'right' }        mirar a izquierda/derecha
  //  { t, type: 'silhouette', char: 'quico', on: false, dur: 0.2 }
  //  { t, type: 'swapPlayer', char: 'ramon' }                   cambiar a quién manejás
  //  { t, type: 'regen', amount: 7, dur: 14 }                    recuperar vida de a poco
  //  { t, type: 'text', text: '¡RATERO!', x, y, size, color, dur } texto que aparece en pantalla
  //  { t, type: 'tension', to: 0.8, dur: 20 }                    subir/bajar la tensión de a poco
  //  { t, type: 'liberate', char: 'florinda', dur: 3 }           parpadeo blanco + temblor antes de liberarse
  // Tip: index.html?fx abre un panel para probarlos y copiar las líneas.
  events: [
    // ── prólogo ──
    { t: 0, type: 'filter', mode: 'oscuro', dur: 0 },
    { t: 0, type: 'zoom', to: 1.4, dur: 0 },
    { t: 0, type: 'walk', char: 'jirafales', from: 1380, to: 1010, dur: 5, end: 'asustado' },
    { t: 0, type: 'focus', on: 'jirafales', follow: true, dur: 0 },
    { t: 6, type: 'setState', char: 'jirafales', state: 'enojado' }, // grita
    { t: 6, type: 'shake', power: 6, dur: 1.5 },
    { t: 6, type: 'bump', amount: 0.08 },
    // 0:09 silueta de Quico gritando
    { t: 9, type: 'focus', on: 'center', zoom: 1, dur: 1, ease: 'inOut' },
    { t: 9, type: 'setState', char: 'jirafales', state: 'asustado' },
    { t: 9, type: 'shake', power: 5, dur: 0.8 },
    // 0:11 se revela
    { t: 11, type: 'silhouette', char: 'quico', on: false, dur: 0.15 },
    { t: 11, type: 'setState', char: 'quico', state: 'corrupto' },
    { t: 11, type: 'flashSprite', char: 'quico', dur: 0.4, shake: 8 },
    { t: 11, type: 'filter', mode: 'oscuro', amount: 0.45, dur: 0.4 },
    { t: 11, type: 'focus', on: 'quico', zoom: 1.3, dur: 0.35, ease: 'out' },
    { t: 13, type: 'focus', on: 'jirafales', zoom: 1.25, dur: 0.8 },
    { t: 13, type: 'setState', char: 'jirafales', state: 'hablando' },
    { t: 18.5, type: 'setState', char: 'jirafales', state: 'asustado' },
    { t: 18.5, type: 'focus', on: 'quico', zoom: 1.3, dur: 0.8 },
    // 0:22.4 Quico grita
    { t: 22.43, type: 'setState', char: 'quico', state: 'grito' },
    { t: 22.43, type: 'shake', power: 7, dur: 2.4 },
    { t: 22.43, type: 'bump', amount: 0.05 },
    { t: 24.9, type: 'setState', char: 'quico', state: 'corrupto' },
    { t: 25.5, type: 'focus', on: 'center', zoom: 1, dur: 1.5 },
    // 0:30.8 → 0:37 se gritan (tiempos marcados con M)
    ...[
      [30.83, 'jirafales', 'enojado'],
      [31.68, 'quico', 'responde'],
      [32.5, 'jirafales', 'enojado'],
      [33.42, 'quico', 'responde'],
      [34.16, 'jirafales', 'enojado'],
      [34.88, 'quico', 'responde'],
      [35.77, 'jirafales', 'enojado'],
      [36.55, 'quico', 'grito'],
    ].flatMap(([t, char, state]) => [
      { t, type: 'setState', char, state },
      { t, type: 'bump', amount: 0.045 },
    ]),
    { t: 36.55, type: 'shake', power: 8, dur: 1 },
    // 0:37.3 sale Doña Florinda (después del "¡DE NADAAA!")
    { t: 37.3, type: 'setState', char: 'jirafales', state: 'asustado' },
    { t: 37.3, type: 'setState', char: 'quico', state: 'corrupto' },
    { t: 37.3, type: 'filter', mode: 'none', dur: 0.6 },
    { t: 37.3, type: 'flashSprite', char: 'florinda', dur: 0.4, shake: 8 },
    { t: 37.3, type: 'shake', power: 10, dur: 0.4 },
    { t: 39, type: 'setState', char: 'jirafales', state: 'normal' },
    // 1:03.8 y 1:17.3 gritos de Quico durante la pelea
    ...[63.76, 77.26].flatMap((t) => [
      { t, type: 'pose', char: 'quico', state: 'grito', dur: 1.6 },
      { t, type: 'shake', power: 6, dur: 0.8 },
      { t, type: 'bump', amount: 0.05 },
      { t, type: 'text', text: '¡AAAAH!', size: 30, x: 210, y: 250, color: '#4aa3ff', dur: 1.3 },
    ]),

    // ── 1:27 → 1:30 Florinda se está liberando (parpadeo + temblor) ──
    { t: 87, type: 'liberate', char: 'florinda', dur: 3 },
    // ── 1:30 Florinda liberada → se pone atrás de Jirafales ──
    { t: 91.5, type: 'face', char: 'florinda', dir: 'right' },
    { t: 91.5, type: 'walk', char: 'florinda', from: 450, to: 1150, dur: 2.5, end: 'sano' },
    { t: 94.1, type: 'face', char: 'florinda', dir: 'left' },
    { t: 90, type: 'flash', dur: 0.4 },
    { t: 90, type: 'flashSprite', char: 'florinda', dur: 0.6, shake: 4 },
    { t: 90.2, type: 'setState', char: 'florinda', state: 'hablando' },
    { t: 94, type: 'setState', char: 'florinda', state: 'sano' },

    // ── 2:00 Quico curado, se juntan a la izquierda ──
    { t: 120, type: 'flash', dur: 0.4 },
    { t: 120, type: 'flashSprite', char: 'quico', dur: 0.6, shake: 4 },
    { t: 120.2, type: 'setState', char: 'quico', state: 'hablando' },
    { t: 123, type: 'setState', char: 'quico', state: 'sano' },
    { t: 123, type: 'setState', char: 'florinda', state: 'hablando' },
    { t: 117, type: 'liberate', char: 'quico', dur: 3 },
    { t: 120.5, type: 'face', char: 'florinda', dir: 'left' },
    { t: 121, type: 'walk', char: 'florinda', from: 1150, to: 420, dur: 3, end: 'hablando' },
    { t: 122, type: 'walk', char: 'jirafales', from: 1010, to: 560, dur: 2.5, end: 'normal' },
    { t: 126, type: 'setState', char: 'florinda', state: 'sano' },
    // se quedan a la izquierda: Jirafales adelante, Quico y Florinda atrás de él (a la derecha va a salir el Chavo)
    { t: 127, type: 'walk', char: 'quico', from: 300, to: 200, dur: 1.2, end: 'sano' },
    { t: 127, type: 'walk', char: 'florinda', from: 420, to: 290, dur: 1.2, end: 'sano' },
    { t: 127, type: 'walk', char: 'jirafales', from: 560, to: 400, dur: 1.2, end: 'normal' },
    { t: 128.3, type: 'face', char: 'jirafales', dir: 'right' },
    { t: 128.3, type: 'face', char: 'florinda', dir: 'right' },
    { t: 128.3, type: 'face', char: 'quico', dir: 'right' },

    // ── 2:10 el Chavo: zoom fuerte a él y de a poco se abre hasta ver sólo al Prof y al Chavo ──
    { t: 130, type: 'pan', x: 320, y: 125, dur: 0.5, ease: 'out' },
    { t: 130, type: 'zoom', to: 2, dur: 0.5, ease: 'out' },
    { t: 131.5, type: 'pan', x: 140, y: 55, dur: 9, ease: 'inOut' },
    { t: 131.5, type: 'zoom', to: 1.55, dur: 9, ease: 'inOut' },
    { t: 133, type: 'walk', char: 'jirafales', from: 400, to: 600, dur: 2.5, end: 'hablando' },
    // 2:10 → 2:36 la tensión sube: viñeta roja y los "¡RATERO!" de fondo
    { t: 131, type: 'tension', to: 0.85, dur: 24.5 },
    { t: 150, type: 'bump', every: 2, amount: 0.025 },
    ...RATERO,
    { t: 142, type: 'setState', char: 'jirafales', state: 'normal' },
    // 2:35.76 verdadera forma
    { t: 155.3, type: 'filter', mode: 'oscuro', dur: 0.4 },
    { t: 155.76, type: 'flash', dur: 0.5 },
    { t: 155.76, type: 'flashSprite', char: 'chavo', dur: 0.5, shake: 12 },
    { t: 155.76, type: 'shake', power: 18, dur: 0.8 },
    { t: 155.76, type: 'filter', mode: 'bn', dur: 0, keep: ['chavo'] },
    { t: 155.76, type: 'setState', char: 'jirafales', state: 'asustado' },
    { t: 155.76, type: 'walk', char: 'jirafales', from: 600, to: 400, dur: 0.6, end: 'asustado' },
    { t: 155.76, type: 'focus', on: 'chavo', zoom: 1.35, dur: 0.25, ease: 'out' },
    { t: 160, type: 'focus', on: 'center', zoom: 1, dur: 1.2 },
    { t: 165, type: 'filter', mode: 'oscuro', amount: 0.6, dur: 1 },
    { t: 165.5, type: 'silhouette', char: 'chavo', on: true, dur: 0.5 },

    // ── 2:47 Chilindrina / 3:00 Don Ramón ──
    { t: 167, type: 'flashSprite', char: 'chilindrina', dur: 0.4, shake: 8 },
    { t: 167, type: 'focus', on: 'chilindrina', zoom: 1.25, dur: 0.4 },
    { t: 168, type: 'setState', char: 'jirafales', state: 'hablando' },
    { t: 173, type: 'focus', on: 'center', zoom: 1, dur: 1 },
    { t: 176, type: 'setState', char: 'jirafales', state: 'asustado' },
    { t: 179.3, type: 'filter', mode: 'none', dur: 0.6 },
    // 3:00 referencia al capítulo del maestro: "Esta calavera significa PE-LI-GRO" (tiempos aprox.)
    { t: 179.6, type: 'text', text: '☠', size: 90, x: 640, y: 470, color: '#ffffff', dur: 3.2 },
    { t: 181.15, type: 'text', text: 'PE', size: 46, x: 520, y: 550, color: '#ff4040', dur: 1.7 },
    { t: 181.75, type: 'text', text: 'LI', size: 46, x: 640, y: 550, color: '#ff4040', dur: 1.3 },
    { t: 182.3, type: 'text', text: 'GRO', size: 46, x: 770, y: 550, color: '#ff4040', dur: 1.1 },
    { t: 182.56, type: 'shake', power: 8, dur: 0.4 },
    { t: 182.56, type: 'bump', amount: 0.06 },
    { t: 182.56, type: 'tension', to: 0.7, dur: 0.5 },
    { t: 179.3, type: 'flashSprite', char: 'ramon', dur: 0.4, shake: 10 },
    { t: 179.45, type: 'pose', char: 'ramon', state: 'corrupto_hablando', dur: 3.2 }, // "Esta calavera significa PE-LI-GRO"
    { t: 179.3, type: 'shake', power: 12, dur: 0.5 },
    { t: 182.6, type: 'setState', char: 'jirafales', state: 'normal' },
    { t: 237, type: 'liberate', char: 'ramon', dur: 3 },
    // 4:00 Don Ramón libre
    { t: 240, type: 'flash', dur: 0.4 },
    { t: 240, type: 'flashSprite', char: 'ramon', dur: 0.6, shake: 4 },
    { t: 240.3, type: 'setState', char: 'ramon', state: 'hablando' },
    { t: 245, type: 'setState', char: 'ramon', state: 'sano' },

    // ── 4:22 jugás con Don Ramón ──
    { t: 257.5, type: 'walk', char: 'ramon', from: 1080, to: 400, dur: 4, end: 'sano' },
    { t: 257.5, type: 'face', char: 'jirafales', dir: 'left' },
    { t: 257.5, type: 'walk', char: 'jirafales', from: 400, to: 110, dur: 2.5, end: 'normal' },
    { t: 260.1, type: 'face', char: 'jirafales', dir: 'right' },
    { t: 261.9, type: 'swapPlayer', char: 'ramon' },
    { t: 262.2, type: 'walk', char: 'chilindrina', from: 840, to: 720, dur: 1.5, end: 'corrupto' },
    { t: 261.6, type: 'face', char: 'ramon', dir: 'right' },
    { t: 262, type: 'focus', on: 'ramon', zoom: 1.2, dur: 1 },
    { t: 262, type: 'tension', to: 0.15, dur: 2 }, // se calma la música (intro del Chapulín)
    { t: 262.5, type: 'setState', char: 'ramon', state: 'hablando' },
    { t: 269.5, type: 'bump', amount: 0.08 },
    { t: 269.5, type: 'shake', power: 6, dur: 0.6 },
    { t: 274, type: 'setState', char: 'ramon', state: 'sano' },
    { t: 274, type: 'focus', on: 'center', zoom: 1, dur: 1.5 },

    // ── 5:04 Chilindrina libre, se juntan los 5 ──
    { t: 301, type: 'liberate', char: 'chilindrina', dur: 3 },
    { t: 303.9, type: 'swapPlayer', char: 'jirafales' },
    { t: 304, type: 'flash', dur: 0.4 },
    { t: 304, type: 'flashSprite', char: 'chilindrina', dur: 0.6, shake: 4 },
    { t: 304, type: 'setState', char: 'chilindrina', state: 'curada' },
    { t: 304.5, type: 'face', char: 'chilindrina', dir: 'left' }, // corre hacia su papá
    { t: 307.1, type: 'face', char: 'chilindrina', dir: 'right' },
    { t: 304.5, type: 'walk', char: 'chilindrina', from: 720, to: 650, dur: 2.5, end: 'sano' },
    { t: 304.5, type: 'walk', char: 'ramon', from: 400, to: 520, dur: 1.2, end: 'sano' },
    { t: 304.5, type: 'walk', char: 'florinda', from: 290, to: 230, dur: 1, end: 'sano' },
    { t: 304.5, type: 'walk', char: 'quico', from: 200, to: 100, dur: 1, end: 'sano' },
    { t: 304.5, type: 'face', char: 'jirafales', dir: 'right' },
    { t: 304.5, type: 'walk', char: 'jirafales', from: 110, to: 370, dur: 1.5, end: 'normal' },

    // ── 5:07 "Qué bonita vecindad": recuerdo en sepia, Don Ramón cuenta cuando llegó el Chavo, se recupera vida ──
    { t: 307, type: 'filter', mode: 'sepia', dur: 1.5 },
    { t: 307, type: 'zoom', to: 1.08, dur: 14, ease: 'inOut' },
    { t: 307, type: 'tension', to: 0, dur: 1.5 },
    { t: 307.5, type: 'regen', amount: 7, dur: 14 },
    { t: 307.5, type: 'text', text: '+ VIDA', size: 22, x: 640, y: 660, color: '#7dff9a', dur: 2 },
    { t: 307.5, type: 'setState', char: 'ramon', state: 'hablando' },
    { t: 321.2, type: 'setState', char: 'ramon', state: 'sano' },
    { t: 321.3, type: 'filter', mode: 'none', dur: 0.6 },
    { t: 321.3, type: 'zoom', to: 1, dur: 0.6 },

    // ── 5:22 el Chavo sano ──
    { t: 322, type: 'flashSprite', char: 'chavo', dur: 0.5, shake: 2 },
    { t: 322, type: 'focus', on: 'chavo', zoom: 1.25, dur: 1.5 },
    { t: 340, type: 'focus', on: 'center', zoom: 1.05, dur: 2 },

    // ═══════════════ SEGUNDA MITAD (tiempos aprox. salvo los que pasaste) ═══════════════
    // 5:47 termina la historia: se muestra corrupto ("Fue por su culpa...")
    { t: 347.4, type: 'flashSprite', char: 'chavo', dur: 0.4, shake: 8 },
    { t: 347.4, type: 'setState', char: 'chavo', state: 'corrupto' },
    { t: 347.4, type: 'shake', power: 8, dur: 0.4 },
    { t: 347.4, type: 'tension', to: 0.5, dur: 1 },
    { t: 353, type: 'silhouette', char: 'chavo', on: true, dur: 2.5 },
    { t: 356, type: 'tension', to: 0.6, dur: 17 },
    { t: 360, type: 'zoom', to: 1.12, dur: 14, ease: 'in' },
    // 6:14 escena del capítulo animado (tinta)
    { t: 373.8, type: 'swapPlayer', char: 'ramon' },
    { t: 373.85, type: 'walk', char: 'ramon', from: 520, to: 400, dur: 0.05, end: 'sano' },
    { t: 373.9, type: 'face', char: 'ramon', dir: 'right' },
    { t: 374, type: 'flash', dur: 0.3 },
    { t: 374, type: 'ink', on: true, dur: 0.15 },
    { t: 374, type: 'zoom', to: 1, dur: 0 },
    { t: 374, type: 'prop', id: 'barril', kind: 'barrel', x: 640 },
    { t: 374, type: 'prop', id: 'globos', kind: 'balloons', x: 640 },
    { t: 381, type: 'walk', char: 'nono', from: 460, to: 640, dur: 1, end: 'sano' },
    { t: 382.2, type: 'pose', char: 'nono', state: 'sano', dur: 0.1 },
    // 6:23.5 se rompe el barril: Ñoño queda atrapado y se van los globos
    { t: 383.5, type: 'prop', id: 'barril', kind: 'barrel', x: 640, front: true },
    { t: 383.5, type: 'shake', power: 8, dur: 0.4 },
    { t: 384, type: 'propMove', id: 'globos', x: 300, y: -700, dur: 5, fade: true },
    // 6:33.5 el Chavo patea el barril: cae en picada
    { t: 393.5, type: 'pose', char: 'chavo', state: 'normal', dur: 0.4 },
    { t: 393.5, type: 'shake', power: 12, dur: 0.5 },
    { t: 393.5, type: 'propMove', id: 'barril', x: 980, y: 620, dur: 1.3, rot: 2.2 },
    { t: 393.5, type: 'fall', char: 'nono', dur: 1.3 },
    { t: 394.5, type: 'text', text: '¡ÑOÑOOOO!', size: 42, x: 380, y: 220, color: '#000', dur: 1.8 },
    // 6:36 Quico se une al combate
    { t: 396, type: 'flashSprite', char: 'quico', dur: 0.3, shake: 4 },
    // 6:39 vuelve el color, Ñoño corrompido
    { t: 399, type: 'ink', on: false, dur: 0.25 },
    { t: 399, type: 'flash', dur: 0.4 },
    { t: 399, type: 'prop', id: 'barril', on: false },
    { t: 399, type: 'prop', id: 'globos', on: false },
    { t: 399, type: 'flashSprite', char: 'nono', dur: 0.4, shake: 8 },
    // 6:51 Sr. Barriga (grito del capítulo del callo)
    { t: 411, type: 'flashSprite', char: 'barriga', dur: 0.4, shake: 10 },
    { t: 411, type: 'shake', power: 12, dur: 0.6 },
    { t: 411, type: 'text', text: '¡AAAAAY!', size: 48, x: 760, y: 260, color: '#ff5050', dur: 1.6 },
    // Quico grita "¡ÑOÑOOO!" (7:35, 7:58, 8:21 en la música)
    ...[455, 478, 501].flatMap((t) => [
      { t, type: 'pose', char: 'quico', state: 'grito', dur: 1.2 },
      { t, type: 'text', text: '¡ÑOÑOOO!', size: 34, x: 260, y: 270, color: '#4aa3ff', dur: 1.5 },
      { t, type: 'bump', amount: 0.05 },
    ]),
    // 8:33 el último, ya con Ñoño libre: de alegría, justo antes del video
    { t: 513, type: 'setState', char: 'quico', state: 'hablando' },
    { t: 513, type: 'text', text: '¡ÑOÑOOO!', size: 40, x: 640, y: 260, color: '#7dff9a', dur: 1.2 },
    { t: 513, type: 'bump', amount: 0.06 },
    // 7:36 Barriga libre → reemplaza a Don Ramón
    { t: 453, type: 'liberate', char: 'barriga', dur: 3 },
    { t: 455.9, type: 'swapPlayer', char: 'barriga' },
    { t: 456, type: 'flash', dur: 0.4 },
    { t: 456, type: 'flashSprite', char: 'barriga', dur: 0.6, shake: 4 },
    { t: 456.2, type: 'face', char: 'barriga', dir: 'left' },
    { t: 456.2, type: 'walk', char: 'barriga', from: 760, to: 400, dur: 1.6, end: 'sano' },
    { t: 457.9, type: 'face', char: 'barriga', dir: 'right' },
    { t: 456.2, type: 'walk', char: 'ramon', from: 400, to: 245, dur: 1, end: 'sano' },
    // 8:22 Ñoño libre
    { t: 499, type: 'liberate', char: 'nono', dur: 3 },
    { t: 502, type: 'flash', dur: 0.4 },
    { t: 502, type: 'flashSprite', char: 'nono', dur: 0.6, shake: 4 },
    // 8:34 video
    { t: 514, type: 'video', src: 'src/assets/video/escena.mp4', dur: 12.5 },
    // 8:47 batalla final
    { t: 526.8, type: 'swapPlayer', char: 'jirafales' },
    { t: 526.9, type: 'face', char: 'jirafales', dir: 'right' },
    { t: 527, type: 'flash', dur: 0.5 },
    { t: 527, type: 'flashSprite', char: 'chavo', dur: 0.5, shake: 12 },
    { t: 527, type: 'shake', power: 16, dur: 0.7 },
    { t: 527, type: 'filter', mode: 'oscuro', amount: 0.45, dur: 0.5 },
    // 8:53 su forma verdadera
    { t: 533, type: 'flash', dur: 0.5 },
    { t: 533, type: 'flashSprite', char: 'chavo', dur: 0.6, shake: 14 },
    { t: 533, type: 'setState', char: 'chavo', state: 'final' },
    { t: 533, type: 'shake', power: 14, dur: 0.6 },
    { t: 533, type: 'bump', amount: 0.08 },
    { t: 527, type: 'walk', char: 'jirafales', from: 290, to: 400, dur: 0.6, end: 'escopeta' },
    { t: 527, type: 'walk', char: 'barriga', from: 400, to: 155, dur: 0.8, end: 'sano' },
    { t: 527, type: 'walk', char: 'nono', from: 960, to: 65, dur: 1.6, end: 'asustado' }, // atrás del grupo, con miedo
    { t: 527, type: 'walk', char: 'quico', from: 260, to: 110, dur: 0.8, end: 'sano' },
    // 9:32 clímax: últimos segundos para ganar
    { t: 572, type: 'flash', dur: 0.4 },
    { t: 572, type: 'mech', set: { attackEvery: 2, warnBeats: 1.5, damage: 15 } },
    { t: 572, type: 'bump', every: 1, amount: 0.03 },
    { t: 572, type: 'tilt', deg: -3, dur: 0.6 },
    { t: 572, type: 'text', text: '¡ÚLTIMO ESFUERZO!', size: 30, x: 640, y: 330, color: '#ffd23f', dur: 2 },
    { t: 600, type: 'tilt', deg: 3, dur: 1 },
    // 10:20 se derrota al Chavo falso
    { t: 620, type: 'defeatBoss' },
    { t: 620, type: 'tilt', deg: 0, dur: 0.6 },
    { t: 620, type: 'bump', every: 0 },
    { t: 620.5, type: 'filter', mode: 'none', dur: 2 },
    { t: 621, type: 'setState', char: 'jirafales', state: 'normal' },
    // queda su alma, libre
    { t: 621.6, type: 'flash', dur: 0.6 },
    { t: 621.6, type: 'setState', char: 'chavo', state: 'alma' },
  ],

  // Diálogos con tiempo de la canción: [t, quién, texto, duración]
  // (sin combate van abajo; si hay algo en el centro de la pantalla van arriba)
  // Texto TODO EN MAYÚSCULAS = grito (letra más grande)
  dialogue: [
    // prólogo
    [1, 'Prof. Jirafales', 'Qué raro... ¿por qué está todo tan oscuro?', 4.5],
    [6, 'Prof. Jirafales', '¡QUICOOO! ¡DOÑA FLORINDAAA!', 3],
    [9.5, 'Prof. Jirafales', '¿Q-quién anda ahí?', 1.5],
    [13, 'Prof. Jirafales', 'Pero... ¿qué te pasó, Quico? ¿Quién te hizo esto?', 5],
    [19, 'Quico', '...', 2],
    // 0:30.8 → 0:37 se gritan (como en el capítulo)
    [30.83, 'Prof. Jirafales', '¡QUICO!', 0.85],
    [31.68, 'Quico', '¡¿QUÉEE?!', 0.82],
    [32.5, 'Prof. Jirafales', '¡¿ESTÁ TU MADRE?!', 0.92],
    [33.42, 'Quico', '¡¿DE PARTE DE QUIÉN?!', 0.74],
    [34.16, 'Prof. Jirafales', '¡DE PARTE MÍA!', 0.72],
    [34.88, 'Quico', '¡SÍ ESTÁAA!', 0.89],
    [35.77, 'Prof. Jirafales', '¡GRAAACIAS!', 0.78],
    [36.55, 'Quico', '¡DE NADAAA!', 1.2],
    // 1:30 Florinda
    [90.2, 'Doña Florinda', '¿Profesor Jirafales? ¿Qué... qué me pasó?', 3.6],
    // 2:00 Quico
    [120.2, 'Quico', '¿Profesor? ¿Mami?', 2.8],
    [123, 'Doña Florinda', '¡Mi tesoro! Ven acá, no te juntes con... ay, ya no importa.', 3.5],
    // 2:10 el Chavo
    [131, 'Prof. Jirafales', '¿Chavo? ¿Eres tú?', 3],
    [134.5, 'El Chavo', '...', 2.5],
    [137.5, 'Prof. Jirafales', 'Chavo, ¿dónde estabas? Todos te estábamos buscando.', 4],
    [142, 'El Chavo', '...', 2.5],
    [144.5, 'El Chavo', 'Yo le dije... que no fui yo.', 3.2],
    // 2:47 Chilindrina
    [168, 'Prof. Jirafales', '¡Noo! ¿Tú también, Chilindrina?', 3.5],
    [172.5, 'Prof. Jirafales', '...¿Y Don Ramón?', 3],
    // 3:00 Don Ramón de maestro
    [179.48, 'Don Ramón', 'Esta calavera significa...', 1.6],
    // 4:00 Don Ramón
    [240.3, 'Don Ramón', 'Les fallé a los dos... al Chavo y a mi hijita...', 4.5],
    // 4:22 Monchito
    [262.5, 'Don Ramón', 'Perdóname, hijita...', 3.5],
    [266.5, 'Don Ramón', 'No te preocupes...', 2.8],
    [269.5, 'Don Ramón', '¡MONCHITO TE VA A SALVAR!', 4],
    // 5:04 los 5 juntos
    [304.5, 'La Chilindrina', '¿Papá...? ¡PAPÁ!', 3],
    [308, 'Don Ramón', '¡Chilindrina! Fíjate, fíjate, fíjate que ya pasó todo...', 4],
    // 5:07 recuerdo: cuando llegó el Chavo (textos provisorios)
    [307.6, 'Don Ramón', '¿Se acuerdan cuando llegó el Chavo a la vecindad?', 4],
    [312, 'Don Ramón', 'Llegó solito, con su barril... y nadie sabía de dónde venía.', 4.5],
    [316.8, 'Don Ramón', 'Siempre con hambre... pero nunca le faltó una sonrisa.', 4.4],
    // 5:22 el Chavo cuenta la verdad (textos provisorios)
    [323, 'El Chavo', 'Ese día todos dijeron que yo me había robado las cosas...', 5],
    [328.5, 'El Chavo', 'Nadie me creyó. Me fui a la iglesia a rezar, para que se supiera la verdad.', 6],
    [335, 'El Chavo', 'Cuando salí... no vi el coche. Y ya no pude volver a la vecindad.', 6],
    [341.5, 'El Chavo', 'Me quedé ahí, solito... y algo se metió en mí.', 5.5],
    [347.5, 'El Chavo', 'Fue por su culpa. Por no creerme.', 5],
    [353, 'El Chavo', '...ahora les toca a ustedes.', 3],
    // 6:14 escena del capítulo animado
    [374.5, 'Ñoño', '¿Qué estás haciendo, eh?', 3],
    [377.5, 'El Chavo', 'Hay que treparse al bote para bajar los globos.', 3.4],
    [381, 'Ñoño', '¡Sale y vale!', 1.3],
    [382.3, 'El Chavo', 'No, Ñoño, tú no lo—', 1.4],
    [385, 'Ñoño', '¡Ay, mi cuerpecito! ¡Ay, mi cuerpecito!', 3.3],
    [388.5, 'El Chavo', '¡Por tu culpa se nos fueron los globos!', 3],
    [391.6, 'Ñoño', 'No, Chavo... ¡NO!', 1.8],
    [394.5, 'Quico', '¡ÑOÑOOOO!', 2],
    // 8:22 Ñoño libre
    [502.5, 'Ñoño', '¿Papá...? ¡PAPÁ!', 2.5],
    [505.5, 'Sr. Barriga', '¡Ñoño! ¡Hijo mío!', 3],
    // 10:20 final
    [622, 'El Chavo', 'Gracias... por creerme.', 5],
  ],

  captions: [],
};
