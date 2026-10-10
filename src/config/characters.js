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
    // jirafales_sheet.png: 7 poses en fila (0..6), pies alineados abajo
    // muzzle = punta de la escopeta en la pose 'disparar' (fracción de la altura)
    muzzle: { x: -0.442, y: 0.835 },
    sprites: {
      camina: { src: 'src/assets/personaje/jirafales/jirafales_sheet.png', cols: 7, frame: 0 },
      normal: { src: 'src/assets/personaje/jirafales/jirafales_sheet.png', cols: 7, frame: 1 },
      asustado: { src: 'src/assets/personaje/jirafales/jirafales_sheet.png', cols: 7, frame: 2 },
      enojado: { src: 'src/assets/personaje/jirafales/jirafales_sheet.png', cols: 7, frame: 3 },
      escopeta: { src: 'src/assets/personaje/jirafales/jirafales_sheet.png', cols: 7, frame: 4 },
      disparar: { src: 'src/assets/personaje/jirafales/jirafales_sheet.png', cols: 7, frame: 5 },
      hablando: { src: 'src/assets/personaje/jirafales/jirafales_sheet.png', cols: 7, frame: 6 },
    },
  },
  quico: {
    nombre: 'Quico',
    color: '#3b6fb6',
    height: 250,
    // quico_sheet.png: 6 poses en fila (0..5), los pies alineados abajo
    sprites: {
      corrupto: { src: 'src/assets/personaje/quico/quico_sheet.png', cols: 6, frame: 0 },
      grito: { src: 'src/assets/personaje/quico/quico_sheet.png', cols: 6, frame: 1 },
      responde: { src: 'src/assets/personaje/quico/quico_sheet.png', cols: 6, frame: 2 },
      enojado: { src: 'src/assets/personaje/quico/quico_sheet.png', cols: 6, frame: 3 },
      sano: { src: 'src/assets/personaje/quico/quico_sheet.png', cols: 6, frame: 4 },
      hablando: { src: 'src/assets/personaje/quico/quico_sheet.png', cols: 6, frame: 5 },
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
    height: 250,
    sprites: {
      normal: 'src/assets/personaje/chavo_normal.png',
      espalda: 'src/assets/personaje/chavo_espalda.png',
      revelado: 'src/assets/personaje/chavo_revelado.png',
      triste: 'src/assets/personaje/chavo_triste.png',
      final: 'src/assets/personaje/chavo_final.png',
      derrotado: 'src/assets/personaje/chavo_derrotado.png',
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
    sprites: {
      corrupto: 'src/assets/personaje/nono_corrupto.png',
      sano: 'src/assets/personaje/nono_sano.png',
    },
  },
  barriga: {
    nombre: 'Sr. Barriga',
    color: '#3d5c4f',
    height: 330,
    sprites: {
      corrupto: 'src/assets/personaje/barriga_corrupto.png',
      sano: 'src/assets/personaje/barriga_sano.png',
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
