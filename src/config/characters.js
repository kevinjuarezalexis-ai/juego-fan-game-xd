// ══════════════════════════════════════
//   Personajes y fondos
// ══════════════════════════════════════
// Cada personaje tiene "estados" (corrupto, espalda, revelado, triste...).
// Un sprite puede ser:
//   - un string con la ruta de UNA imagen (pose idle; el bop al ritmo lo hace el código)
//   - { src, frames, fps } → tira horizontal de frames: la animación idle
//     arranca de cero en cada beat (como el "dance" de FNF)
// Si la imagen no existe se dibuja un placeholder (silueta + nombre), así
// se puede probar todo sin arte.
//
// facing: hacia dónde mira el dibujo original ('right' por defecto). El juego lo
// espeja solo según hacia dónde tenga que mirar (evento 'face' o `face` en el escenario).

window.FB = window.FB || {};

FB.CHARACTERS = {
  jirafales: {
    nombre: 'Prof. Jirafales',
    color: '#6b4f2e',
    height: 400,
    facing: 'left', // el dibujo original mira a la izquierda (el juego lo espeja si hace falta)
    flip: false,
    // jirafales_sheet.png: 11 poses (fondo gris): 0 normal, 1 caminando, 2 miedo, 3 enojado, 4 gritando,
    //   5 hablando, 6 escopeta, 7 disparando, 8 bloqueando, 9 daño con escopeta, 10 daño
    // muzzle = punta del caño en la pose 'disparar' (fracción de la altura; x medido mirando a la izquierda)
    muzzle: { x: -0.342, y: 0.842 },
    sprites: {
      normal: { src: 'src/assets/personaje/jirafales/jirafales_sheet.png', cols: 11, frame: 0 },
      camina: { src: 'src/assets/personaje/jirafales/jirafales_sheet.png', cols: 11, frame: 1 },
      asustado: { src: 'src/assets/personaje/jirafales/jirafales_sheet.png', cols: 11, frame: 2 },
      enojado: { src: 'src/assets/personaje/jirafales/jirafales_sheet.png', cols: 11, frame: 3 },
      grito: { src: 'src/assets/personaje/jirafales/jirafales_sheet.png', cols: 11, frame: 4 },
      hablando: { src: 'src/assets/personaje/jirafales/jirafales_sheet.png', cols: 11, frame: 5 },
      escopeta: { src: 'src/assets/personaje/jirafales/jirafales_sheet.png', cols: 11, frame: 6 },
      disparar: { src: 'src/assets/personaje/jirafales/jirafales_sheet.png', cols: 11, frame: 7 },
      bloquear: { src: 'src/assets/personaje/jirafales/jirafales_sheet.png', cols: 11, frame: 8 },
      dano_escopeta: { src: 'src/assets/personaje/jirafales/jirafales_sheet.png', cols: 11, frame: 9 },
      dano: { src: 'src/assets/personaje/jirafales/jirafales_sheet.png', cols: 11, frame: 10 },
    },
  },
  quico: {
    nombre: 'Quico',
    color: '#3b6fb6',
    height: 250,
    // cuando habla sano en un diálogo con tiempo, usa la pose de hablar
    talkPose: { sano: 'hablando' },
    // quico_sheet.png: 10 poses (miran a la derecha):
    //   corrupto: 0 idle, 1 grito "mamaaa", 2 gritando enojado (señala), 3 enojado, 4 dudando (barra de liberación)
    //   sano:     5 recién curado, 6 hablando, 7 idle, 8 recibe daño, 9 gritando (¡ÑOÑO!)
    sprites: {
      corrupto: { src: 'src/assets/personaje/quico/quico_sheet.png', cols: 10, frame: 0 },
      grito: { src: 'src/assets/personaje/quico/quico_sheet.png', cols: 10, frame: 1 },
      grito_enojado: { src: 'src/assets/personaje/quico/quico_sheet.png', cols: 10, frame: 2 },
      enojado: { src: 'src/assets/personaje/quico/quico_sheet.png', cols: 10, frame: 3 },
      dudando: { src: 'src/assets/personaje/quico/quico_sheet.png', cols: 10, frame: 4 },
      curado: { src: 'src/assets/personaje/quico/quico_sheet.png', cols: 10, frame: 5 },
      hablando: { src: 'src/assets/personaje/quico/quico_sheet.png', cols: 10, frame: 6 },
      sano: { src: 'src/assets/personaje/quico/quico_sheet.png', cols: 10, frame: 7 },
      dano: { src: 'src/assets/personaje/quico/quico_sheet.png', cols: 10, frame: 8 },
      gritando: { src: 'src/assets/personaje/quico/quico_sheet.png', cols: 10, frame: 9 },
      responde: { src: 'src/assets/personaje/quico/quico_sheet.png', cols: 10, frame: 2 },
      asustado: { src: 'src/assets/personaje/quico/quico_sheet.png', cols: 10, frame: 8 },
    },
  },
  florinda: {
    nombre: 'Doña Florinda',
    color: '#a8456b',
    height: 330,
    // florinda_sheet.png: 3 poses (0 corrupta, 1 sana, 2 sana hablando), miran a la derecha
    sprites: {
      corrupto: { src: 'src/assets/personaje/florinda/florinda_sheet.png', cols: 3, frame: 0 },
      sano: { src: 'src/assets/personaje/florinda/florinda_sheet.png', cols: 3, frame: 1 },
      hablando: { src: 'src/assets/personaje/florinda/florinda_sheet.png', cols: 3, frame: 2 },
    },
  },
  chavo: {
    nombre: 'El Chavo',
    color: '#5c6b3a',
    height: 275, // la celda incluye las antenas de la forma final: el Chavo normal queda ~250
    facing: 'left', // los dibujos miran a la izquierda
    // cuando habla en un diálogo con tiempo y está en esta pose, usa la otra
    talkPose: { triste: 'hablando' },
    // chavo_sheet.png: 0 espalda, 1 revelado, 2 corrupto, 3 forma final, 4 recibe daño,
    //                  5 hablando (historia), 6 triste (historia), 7 alma
    sprites: {
      espalda: { src: 'src/assets/personaje/chavo/chavo_sheet.png', cols: 8, frame: 0, mirror: true }, // invertido
      revelado: { src: 'src/assets/personaje/chavo/chavo_sheet.png', cols: 8, frame: 1 },
      corrupto: { src: 'src/assets/personaje/chavo/chavo_sheet.png', cols: 8, frame: 2 },
      final: { src: 'src/assets/personaje/chavo/chavo_sheet.png', cols: 8, frame: 3 },
      dano: { src: 'src/assets/personaje/chavo/chavo_sheet.png', cols: 8, frame: 4 },
      derrotado: { src: 'src/assets/personaje/chavo/chavo_sheet.png', cols: 8, frame: 4 },
      hablando: { src: 'src/assets/personaje/chavo/chavo_sheet.png', cols: 8, frame: 5 },
      triste: { src: 'src/assets/personaje/chavo/chavo_sheet.png', cols: 8, frame: 6 },
      alma: { src: 'src/assets/personaje/chavo/chavo_sheet.png', cols: 8, frame: 7 },
      normal: { src: 'src/assets/personaje/chavo/chavo_sheet.png', cols: 8, frame: 7 }, // recuerdo en tinta (silueta)
    },
  },
  chilindrina: {
    nombre: 'La Chilindrina',
    color: '#b3542f',
    height: 230,
    facing: 'left', // el dibujo original mira a la izquierda
    // chilindrina_sheet.png: 0 corrupta, 1-2 baile (izq/der), 3 baile enter, 4 sana con miedo, 5 curada (señalando)
    sprites: {
      corrupto: { src: 'src/assets/personaje/chilindrina/chilindrina_sheet.png', cols: 6, frame: 0 },
      baile_izq: { src: 'src/assets/personaje/chilindrina/chilindrina_sheet.png', cols: 6, frame: 1 },
      baile_der: { src: 'src/assets/personaje/chilindrina/chilindrina_sheet.png', cols: 6, frame: 2 },
      baile_enter: { src: 'src/assets/personaje/chilindrina/chilindrina_sheet.png', cols: 6, frame: 3 },
      sano: { src: 'src/assets/personaje/chilindrina/chilindrina_sheet.png', cols: 6, frame: 4 },
      asustado: { src: 'src/assets/personaje/chilindrina/chilindrina_sheet.png', cols: 6, frame: 4 },
      curada: { src: 'src/assets/personaje/chilindrina/chilindrina_sheet.png', cols: 6, frame: 5 },
      hablando: { src: 'src/assets/personaje/chilindrina/chilindrina_sheet.png', cols: 6, frame: 5 },
    },
  },
  ramon: {
    nombre: 'Don Ramón',
    color: '#4b4b6b',
    height: 320,
    // ramon_sheet.png: 7 poses (0 corrupto, 1 sano, 2 hablando, 3 baile izq, 4 baile der, 5 baile enter, 6 corrupto hablando)
    sprites: {
      corrupto: { src: 'src/assets/personaje/ramon/ramon_sheet.png', cols: 7, frame: 0 },
      sano: { src: 'src/assets/personaje/ramon/ramon_sheet.png', cols: 7, frame: 1 },
      asustado: { src: 'src/assets/personaje/ramon/ramon_sheet.png', cols: 7, frame: 1 },
      hablando: { src: 'src/assets/personaje/ramon/ramon_sheet.png', cols: 7, frame: 2 },
      baile_izq: { src: 'src/assets/personaje/ramon/ramon_sheet.png', cols: 7, frame: 3 },
      baile_der: { src: 'src/assets/personaje/ramon/ramon_sheet.png', cols: 7, frame: 4 },
      baile_enter: { src: 'src/assets/personaje/ramon/ramon_sheet.png', cols: 7, frame: 5 },
      corrupto_hablando: { src: 'src/assets/personaje/ramon/ramon_sheet.png', cols: 7, frame: 6 },
    },
  },
  nono: {
    nombre: 'Ñoño',
    color: '#8a6d2f',
    height: 280,
    facing: 'left', // invertido: así mira hacia los vecinos sanos
    // nono_sheet.png: 0 corrupto, 1 corrupto mientras lo salvan, 2 sano (curado), 3 sano con miedo
    sprites: {
      corrupto: { src: 'src/assets/personaje/nono/nono_sheet.png', cols: 4, frame: 0 },
      salvando: { src: 'src/assets/personaje/nono/nono_sheet.png', cols: 4, frame: 1 },
      sano: { src: 'src/assets/personaje/nono/nono_sheet.png', cols: 4, frame: 2 },
      asustado: { src: 'src/assets/personaje/nono/nono_sheet.png', cols: 4, frame: 3 },
    },
  },
  barriga: {
    nombre: 'Sr. Barriga',
    color: '#3d5c4f',
    height: 330,
    facing: 'right', // invertido de nuevo (pedido): sano y corrupto
    // cuando habla en un diálogo con tiempo, usa la pose de hablar
    talkPose: { sano: 'hablando', curado: 'hablando' },
    // barriga_sheet.png: 0 corrupto, 1 recién curado (preocupado), 2 sano idle, 3 hablando
    sprites: {
      corrupto: { src: 'src/assets/personaje/barriga/barriga_sheet.png', cols: 4, frame: 0 },
      curado: { src: 'src/assets/personaje/barriga/barriga_sheet.png', cols: 4, frame: 1 },
      asustado: { src: 'src/assets/personaje/barriga/barriga_sheet.png', cols: 4, frame: 1 },
      sano: { src: 'src/assets/personaje/barriga/barriga_sheet.png', cols: 4, frame: 2 },
      hablando: { src: 'src/assets/personaje/barriga/barriga_sheet.png', cols: 4, frame: 3 },
    },
  },
};

// Fondos: si la imagen existe se usa (cover), si no se dibuja un patio genérico
// con los colores de abajo.
FB.BACKGROUNDS = {
  // floorY = altura (en 720) donde apoyan los pies en ese fondo
  entrada: { img: 'src/assets/fondo/fondo0.jpg', floorY: 548, top: '#151a26', bottom: '#2a2420', floor: '#2e2620', wall: '#3b3530' },
  patio: { img: 'src/assets/fondo/fondo1.jfif', top: '#1a1416', bottom: '#2c1e1e', floor: '#2a1d1a', wall: '#4a3430' },
  patio_rojo: { img: 'src/assets/fondo/patio_rojo.png', top: '#2a0608', bottom: '#3d0d0d', floor: '#2a0a0a', wall: '#5a1a1a' },
  recuerdo: { img: 'src/assets/fondo/recuerdo.png', top: '#5a4a32', bottom: '#8a7350', floor: '#6b5638', wall: '#a08a62' },
  final: { img: 'src/assets/fondo/final.png', top: '#0a0000', bottom: '#260404', floor: '#1a0202', wall: '#300808' },
};
