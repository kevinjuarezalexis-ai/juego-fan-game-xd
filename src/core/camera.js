// ══════════════════════════════════════
//   Cámara + filtros de pantalla
// ══════════════════════════════════════
// Todo se puede disparar desde song.js (events) o a mano: game.camera.xxx()
//
//   zoomTo(z, dur, ease)         zoom suave (1 = normal, 1.3 = cerca)
//   setBump(every, amount, style) zoom rítmico: cada `every` beats salta `amount` (0 = apagado)
//                                style = { shake, tilt, flash, flashAlpha }: en cada golpe tiembla,
//                                gira la cámara alternando izquierda/derecha (grados) y opcional destello de color
//   bump(amount)                 un golpe de zoom suelto
//   focus(target, dur, ease)     mueve la cámara: 'left' | 'right' | 'center' | id de personaje
//   panTo(x, y, dur, ease)       mueve la cámara a mano (px desde el centro)
//   shake(power, dur)            temblor
//   tilt(deg, dur, ease)         inclinación de cámara
//   setFilter(mode, dur, opts)   'none' | 'gris' | 'oscuro' | 'sepia' | 'bn' (blanco y negro con contraste)
//                                opts.amount = intensidad (0..1)
//                                opts.keep = ['chavo'] → ese personaje queda a color
//
// Ojo: el movimiento izquierda/derecha solo se nota con zoom > 1 (la cámara
// no se sale del fondo, así nunca se ve el borde negro).
// Eases: 'linear' | 'in' | 'out' | 'inOut' | 'back'

window.FB = window.FB || {};

FB.EASE = {
  linear: (t) => t,
  in: (t) => t * t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2),
};

FB.Camera = class Camera {
  // estilo por defecto del zoom rítmico: temblor fuerte + giro leve alternado
  static BUMP_STYLE = { shake: 7, tilt: 1.6, sway: 0, flash: null, flashAlpha: 0.2 };

  constructor(game) {
    this.game = game;
    this.W = game.W;
    this.H = game.H;
    // valores animables
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.angle = 0;
    this.gray = 0;
    this.contrast = 0;
    this.dark = 0;
    this.sepia = 0;
    // zoom rítmico
    this.bumpEvery = 0;
    this.bumpAmount = 0.066; // +10%
    this.bumpZoom = 0;
    this.bumpStyle = { ...FB.Camera.BUMP_STYLE };
    this.tiltKick = 0; // giro del golpe rítmico (se va solo)
    this.swayKick = 0; // vaivén izquierda/derecha del golpe rítmico (px)
    this.bumpSide = 1;
    // temblor
    this.shakeT = 0;
    this.shakeDur = 0;
    this.shakePow = 0;
    this.keep = [];
    this.tweens = {};
  }

  // ── tweens ──
  tween(key, to, dur = 0, ease = 'out') {
    if (!dur || dur <= 0) {
      this[key] = to;
      delete this.tweens[key];
      return;
    }
    this.tweens[key] = { from: this[key], to, t: 0, dur, ease: FB.EASE[ease] || FB.EASE.out };
  }

  zoomTo(z, dur = 0.5, ease = 'out') {
    this.tween('zoom', z, dur, ease);
  }

  setBump(every = 4, amount = 0.066, style) {
    this.bumpEvery = every;
    this.bumpAmount = amount;
    const clean = {};
    for (const k in style || {}) if (style[k] !== undefined) clean[k] = style[k];
    this.bumpStyle = { ...FB.Camera.BUMP_STYLE, ...clean };
  }

  bump(amount = this.bumpAmount) {
    this.bumpZoom += amount;
  }

  panTo(x = 0, y = 0, dur = 0.6, ease = 'inOut') {
    this.tween('panX', x, dur, ease);
    this.tween('panY', y, dur, ease);
  }

  focus(target = 'center', dur = 0.6, ease = 'inOut', follow = false) {
    // follow = la cámara sigue al personaje mientras se mueve (ej. caminando)
    this.followId = follow && !['left', 'right', 'center'].includes(target) ? target : null;
    let x = 0;
    if (target === 'left') x = -this.W * 0.25;
    else if (target === 'right') x = this.W * 0.25;
    else if (target !== 'center') x = this.game.stage.posOf(target).x - this.W / 2;
    this.panTo(x, 0, dur, ease);
  }

  tilt(deg = 0, dur = 0.4, ease = 'out') {
    this.tween('angle', (deg * Math.PI) / 180, dur, ease);
  }

  shake(power = 8, dur = 0.25) {
    if (power >= this.shakePow * (this.shakeT / (this.shakeDur || 1))) {
      this.shakePow = power;
      this.shakeT = dur;
      this.shakeDur = dur;
    }
  }

  setFilter(mode = 'none', dur = 0.3, opts = {}) {
    const amount = opts.amount ?? 1;
    if (mode === 'gris') {
      this.tween('gray', 0.85 * amount, dur, 'linear');
      this.tween('contrast', 0, dur, 'linear');
      this.tween('dark', 0.1 * amount, dur, 'linear');
    } else if (mode === 'sepia') {
      // recuerdo / foto vieja
      this.tween('gray', 0.9 * amount, dur, 'linear');
      this.tween('contrast', 0, dur, 'linear');
      this.tween('dark', 0, dur, 'linear');
      this.tween('sepia', 0.75 * amount, dur, 'linear');
      this.keep = opts.keep || [];
      return;
    } else if (mode === 'oscuro') {
      // todo oscuro, casi no se ve (lugar sin luz)
      this.tween('gray', 0.35 * amount, dur, 'linear');
      this.tween('contrast', 0, dur, 'linear');
      this.tween('dark', 0.62 * amount, dur, 'linear');
    } else if (mode === 'bn') {
      this.tween('gray', 1 * amount, dur, 'linear');
      this.tween('contrast', 0.75 * amount, dur, 'linear');
      this.tween('dark', 0, dur, 'linear');
    } else {
      this.tween('gray', 0, dur, 'linear');
      this.tween('contrast', 0, dur, 'linear');
      this.tween('dark', 0, dur, 'linear');
    }
    this.tween('sepia', 0, dur, 'linear');
    this.keep = opts.keep || [];
  }

  onBeat(b) {
    if (!(this.bumpEvery > 0 && b % this.bumpEvery === 0)) return;
    const st = this.bumpStyle;
    this.bump();
    // estilo "terremoto": temblor corto + giro alternado + destello opcional
    if (st.shake) this.shake(st.shake, 0.2);
    if (st.tilt) this.tiltKick = (this.bumpSide * st.tilt * Math.PI) / 180;
    if (st.sway) this.swayKick = this.bumpSide * st.sway;
    this.bumpSide *= -1;
    if (st.flash) this.game.stage.flash(0.16, st.flash, st.flashAlpha ?? 0.2);
  }

  update(dt) {
    if (this.followId && !this.tweens.panX) {
      const tx = this.game.stage.posOf(this.followId).x - this.W / 2;
      this.panX += (tx - this.panX) * Math.min(1, dt * 5);
    }
    for (const key in this.tweens) {
      const tw = this.tweens[key];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      this[key] = tw.from + (tw.to - tw.from) * tw.ease(k);
      if (k >= 1) delete this.tweens[key];
    }
    this.bumpZoom += (0 - this.bumpZoom) * Math.min(1, dt * 4);
    this.tiltKick += (0 - this.tiltKick) * Math.min(1, dt * 5);
    this.swayKick += (0 - this.swayKick) * Math.min(1, dt * 5);
    this.shakeT = Math.max(0, this.shakeT - dt);
  }

  get totalZoom() {
    return Math.max(0.5, this.zoom + this.bumpZoom);
  }

  // centro de la vista, limitado para no mostrar fuera del fondo
  get center() {
    const z = this.totalZoom;
    const hw = this.W / (2 * z);
    const hh = this.H / (2 * z);
    let cx = this.W / 2 + this.panX;
    let cy = this.H / 2 + this.panY;
    if (z >= 1) {
      cx = Math.max(hw, Math.min(this.W - hw, cx));
      cy = Math.max(hh, Math.min(this.H - hh, cy));
    } else {
      cx = this.W / 2;
      cy = this.H / 2;
    }
    return { x: cx, y: cy };
  }

  get shakeOffset() {
    if (this.shakeT <= 0) return { x: 0, y: 0 };
    const p = this.shakePow * (this.shakeT / this.shakeDur);
    return { x: (Math.random() * 2 - 1) * p, y: (Math.random() * 2 - 1) * p };
  }

  // aplica la transformación de cámara (llamar entre save/restore)
  apply(ctx) {
    const z = this.totalZoom;
    const c = this.center;
    const s = this.shakeOffset;
    ctx.translate(this.W / 2 + s.x + this.swayKick, this.H / 2 + s.y);
    if (this.angle || this.tiltKick) ctx.rotate(this.angle + this.tiltKick);
    ctx.scale(z, z);
    ctx.translate(-c.x, -c.y);
  }

  get filterOn() {
    return this.sepia > 0.005 || this.gray > 0.005 || this.contrast > 0.005 || this.dark > 0.005;
  }

  // filtro sobre lo que ya está dibujado en el canvas (fondo + personajes)
  applyFilter(ctx) {
    if (!this.filterOn) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.gray > 0.005) {
      ctx.globalCompositeOperation = 'saturation';
      ctx.globalAlpha = Math.min(1, this.gray);
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, this.W, this.H);
    }
    if (this.contrast > 0.005) {
      // overlay de la imagen consigo misma = más contraste
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = Math.min(1, this.contrast);
      ctx.drawImage(ctx.canvas, 0, 0);
    }
    if (this.sepia > 0.005) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = Math.min(1, this.sepia);
      ctx.fillStyle = '#e0b878';
      ctx.fillRect(0, 0, this.W, this.H);
    }
    if (this.dark > 0.005) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = this.dark;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, this.W, this.H);
    }
    ctx.restore();
  }

  // estado "instantáneo" para reintentos: aplica sin animar
  runEvent(ev, instant = false) {
    const d = (v) => (instant ? 0 : v);
    switch (ev.type) {
      case 'zoom':
        this.zoomTo(ev.to ?? 1, d(ev.dur ?? 0.5), ev.ease);
        return true;
      case 'bump':
        if (ev.every !== undefined)
          this.setBump(ev.every, ev.amount ?? 0.066, { shake: ev.shake, tilt: ev.tilt, sway: ev.sway, flash: ev.flash, flashAlpha: ev.flashAlpha });
        else if (!instant) this.bump(ev.amount);
        return true;
      case 'focus':
        this.focus(ev.on || 'center', d(ev.dur ?? 0.6), ev.ease, ev.follow);
        if (ev.zoom !== undefined) this.zoomTo(ev.zoom, d(ev.dur ?? 0.6), ev.ease);
        return true;
      case 'pan':
        this.panTo(ev.x || 0, ev.y || 0, d(ev.dur ?? 0.6), ev.ease);
        return true;
      case 'tilt':
        this.tilt(ev.deg || 0, d(ev.dur ?? 0.4), ev.ease);
        return true;
      case 'filter':
        this.setFilter(ev.mode || 'none', d(ev.dur ?? 0.3), { amount: ev.amount, keep: ev.keep });
        return true;
      case 'shake':
        if (!instant) this.shake(ev.power || 10, ev.dur || 0.4);
        return true;
    }
    return false;
  }
};
