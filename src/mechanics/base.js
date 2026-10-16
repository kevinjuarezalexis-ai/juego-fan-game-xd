// ══════════════════════════════════════
//   Base de mecánicas + helpers de dibujo
// ══════════════════════════════════════
// Una mecánica vive entre t0 y t1 (segundos de canción). El juego le pasa:
//   update(dt, time)      cada frame (dt en segundos)
//   onBeat(beat, time)    en cada beat entero
//   onAction(action)      tecla apretada (left/right/up/down/confirm/block/opt1..3)
//   onPointer(x, y)       click/toque en coordenadas del canvas
//   draw(ctx, time)       encima del escenario
// Para lastimar/curar usa this.game.hurt(n) / this.game.heal(n).

window.FB = window.FB || {};

FB.Mechanic = class Mechanic {
  constructor(game, params, t0, t1) {
    this.game = game;
    this.p = params || {};
    this.t0 = t0;
    this.t1 = t1;
  }
  get cond() {
    return this.game.conductor;
  }
  update(dt, time) {}
  onBeat(beat, time) {}
  onAction(action) {}
  onPointer(x, y) {}
  draw(ctx, time) {}
  end() {}
  // ¿está ocupando el centro de la pantalla? (si sí, los diálogos van arriba)
  get busy() {
    return true;
  }
  // 0→1 al entrar, 1→0 en el último medio segundo
  fade(time, inDur = 0.35, outDur = 0.35) {
    const a = this.noFadeIn ? 1 : Math.min(1, (time - this.t0) / inDur);
    const b = this.noFadeOut ? 1 : Math.min(1, (this.t1 - time) / outDur);
    return Math.max(0, Math.min(a, b));
  }
};

FB.MECHANICS = {}; // type -> clase (se registran en cada archivo)

FB.MECHANICS.none = class None extends FB.Mechanic {
  get busy() {
    return false;
  }
};

// ── helpers ──
FB.roundRect = function (ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

FB.wrapText = function (ctx, text, maxW) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
};

// ── Diálogo flotante (como los "¡RATERO!"): texto con borde negro sobre la cabeza del que habla ──
// color de cada uno (el profe amarillo, el Chavo rojo, el resto blanco)
FB.speechColor = function (id) {
  return { jirafales: '#ffd23f', chavo: '#ff6a6a' }[id] || '#ffffff';
};

// mide un texto flotante ya cortado en líneas (para ubicarlo antes de dibujar)
FB.measureSpeech = function (ctx, text, size = 16, maxW = 440) {
  ctx.save();
  ctx.font = 'bold ' + size + 'px "Press Start 2P", monospace';
  const lines = FB.wrapText(ctx, text, maxW);
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 12;
  ctx.restore();
  return { lines, w, h: lines.length * (size + 8) + 6, size };
};

// dibuja el texto con su parte de abajo en (x, y). k = 0..1 de la animación de entrada
FB.drawSpeech = function (ctx, m, x, y, color, alpha = 1, k = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold ' + m.size + 'px "Press Start 2P", monospace';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, m.size / 3.2);
  ctx.strokeStyle = '#000';
  ctx.fillStyle = color;
  const sc = 0.7 + 0.3 * Math.min(1, k);
  ctx.translate(x, y);
  ctx.scale(sc, sc);
  const lh = m.size + 8;
  m.lines.forEach((l, i) => {
    const ly = -(m.lines.length - 1 - i) * lh;
    ctx.strokeText(l, 0, ly);
    ctx.fillText(l, 0, ly);
  });
  ctx.restore();
};

// RNG con semilla: el mismo patrón de notas en cada intento
FB.rng = function (seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
};

FB.rand = (a, b) => a + Math.random() * (b - a);

// Corazón estilo Undertale
FB.drawHeart = function (ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 16, s / 16);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-8, 0, -9, -7, -4, -8);
  ctx.bezierCurveTo(-1.5, -8.5, 0, -6, 0, -4.5);
  ctx.bezierCurveTo(0, -6, 1.5, -8.5, 4, -8);
  ctx.bezierCurveTo(9, -7, 8, 0, 0, 6);
  ctx.fill();
  ctx.restore();
};

// Flecha estilo FNF (apunta hacia arriba, rotada por carril)
FB.drawArrow = function (ctx, x, y, size, rot, fill, stroke) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const s = size / 2;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s, 0);
  ctx.lineTo(s * 0.42, 0);
  ctx.lineTo(s * 0.42, s);
  ctx.lineTo(-s * 0.42, s);
  ctx.lineTo(-s * 0.42, 0);
  ctx.lineTo(-s, 0);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.lineWidth = 4;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
  ctx.restore();
};

// Cuadro de diálogo (intro y diálogos con tiempo de la canción)
// chars = cuántas letras mostrar (efecto máquina de escribir)
FB.drawDialogue = function (ctx, W, who, text, chars, opts = {}) {
  const x = 170;
  const y = opts.y ?? 506;
  const w = W - 340;
  const h = 150;
  ctx.save();
  ctx.globalAlpha = opts.alpha ?? 1;
  ctx.fillStyle = 'rgba(8,8,12,0.9)';
  ctx.beginPath();
  FB.roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.textAlign = 'left';
  if (who) {
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 15px "Press Start 2P", monospace';
    ctx.fillText(who, x + 24, y + 36);
  }
  ctx.fillStyle = '#fff';
  ctx.font = (opts.big ? 'bold 30px' : '24px') + ' monospace';
  const shown = String(text).slice(0, Math.floor(chars));
  FB.wrapText(ctx, shown, w - 48).forEach((l, i) => ctx.fillText(l, x + 24, y + 74 + i * 30));
  if (opts.hint && chars >= String(text).length) {
    ctx.fillStyle = '#ffd23f';
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Z ▶', x + w - 20, y + h - 18);
  }
  ctx.restore();
};
