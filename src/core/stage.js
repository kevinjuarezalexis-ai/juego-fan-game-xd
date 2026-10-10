// ══════════════════════════════════════
//   Stage — escenario estilo FNF
// ══════════════════════════════════════
// Fondo fijo + rivales a la izquierda + Jirafales a la derecha.
// Todos hacen "bop" en cada beat. Los rivales entran/salen con fade.

window.FB = window.FB || {};

FB.Stage = class Stage {
  constructor(game) {
    this.game = game;
    this.W = game.W;
    this.H = game.H;
    this.floorY = 610;
    this.bgId = 'entrada';
    this.tension = 0;
    this.actors = {}; // id -> { id, state, x, alpha, target, bop, animT, hit, slot }
    this.player = { id: 'jirafales', state: 'normal', x: 1010, alpha: 1, target: 1, bop: 0, animT: 0, hit: 0 };
    this.flashT = 0;
    this._buf = null; // canvas auxiliar para teñir sprites de blanco
    this._vignette = null;
  }

  // ── configuración desde el timeline ──
  apply(stageCfg = {}) {
    if (stageCfg.bg) {
      this.bgId = stageCfg.bg;
      // altura del piso por fondo (dónde apoyan los pies), default 610
      const bgDef = FB.BACKGROUNDS[stageCfg.bg];
      this.floorY = (bgDef && bgDef.floorY) || 610;
    }
    if (stageCfg.tension !== undefined) this.tension = stageCfg.tension;
    if (stageCfg.player) this.player.state = stageCfg.player;
    if (stageCfg.opponents) this.setOpponents(stageCfg.opponents);
  }

  setOpponents(list) {
    const xs = list.length === 1 ? [320] : list.length === 2 ? [210, 450] : [180, 360, 540];
    const ids = new Set(list.map((o) => o.id));
    for (const id in this.actors) {
      if (!ids.has(id)) this.actors[id].target = 0;
    }
    list.forEach((o, i) => {
      let a = this.actors[o.id];
      if (!a) {
        a = this.actors[o.id] = { id: o.id, x: xs[i], alpha: 0, bop: 0, animT: 0, hit: 0 };
      }
      a.state = o.state || a.state || 'corrupto';
      if (o.face) a.face = o.face;
      a.back = !!o.back; // capa de atrás (con distancia)
      a.ghost = !!o.ghost; // espíritu: transparente, celeste y flotando
      if (o.sil) a.sil = a.silTarget = 1; // aparece como silueta negra
      else if (a.target === 0) a.sil = a.silTarget = 0; // vuelve a escena: sin silueta vieja
      a.homeX = o.x ?? xs[i];
      if (a.alpha === 0 && o.x !== undefined) a.x = o.x;
      a.target = 1;
    });
  }

  // el "jugador" es el personaje de la derecha que controla el HUD (Jirafales,
  // o Don Ramón en su parte). Los demás son actores (rivales o aliados).
  actorOf(id) {
    return id === this.player.id ? this.player : this.actors[id];
  }

  // cambia quién es el jugador (ej. Don Ramón toma el control)
  swapPlayer(newId) {
    if (newId === this.player.id) return;
    const old = this.player;
    let neu = this.actors[newId];
    if (!neu) neu = { id: newId, state: 'normal', x: 1010, alpha: 0, target: 1, bop: 0, animT: 0, hit: 0 };
    delete this.actors[newId];
    delete neu.homeX;
    neu.back = false; // el jugador siempre va adelante
    old.homeX = old.x;
    this.actors[old.id] = old;
    this.player = neu;
  }

  // mirar a la izquierda / derecha
  face(id, dir) {
    const a = this.actorOf(id);
    if (a) a.face = dir;
  }

  // pose por un rato y después vuelve a la que tenía (disparo, susto...)
  pose(id, state, dur = 0.3) {
    const a = this.actorOf(id);
    if (!a) return;
    // si el personaje no tiene esa pose, se queda con la que tiene
    const def = FB.CHARACTERS[a.id];
    if (def && def.sprites && !def.sprites[state]) return;
    a.tempState = state;
    a.tempT = dur;
  }

  setState(id, state) {
    const a = this.actorOf(id);
    if (a) a.state = state;
  }

  // posición en pantalla (para que las mecánicas apunten a los personajes)
  posOf(id) {
    const a = this.actorOf(id);
    const def = FB.CHARACTERS[id] || { height: 280 };
    if (!a) return { x: 320, y: this.floorY - def.height / 2, top: this.floorY - def.height };
    return { x: a.x, y: this.floorY - def.height / 2, top: this.floorY - def.height };
  }

  beat() {
    this.player.bop = 1;
    this.player.animT = 0;
    for (const id in this.actors) {
      this.actors[id].bop = 1;
      this.actors[id].animT = 0;
    }
  }

  hurtPlayer() {
    this.player.hit = 0.45;
    // pose de daño: con la escopeta → 'dano_escopeta'; si no → 'dano' (o 'asustado' si no la tiene)
    const def = FB.CHARACTERS[this.player.id] || {};
    const sp = def.sprites || {};
    const armed = ['escopeta', 'disparar', 'bloquear'].includes(this.player.state);
    const p = armed ? (sp.dano_escopeta ? 'dano_escopeta' : null) : sp.dano ? 'dano' : 'asustado';
    if (p) this.pose(this.player.id, p, 0.5);
  }

  hit(id) {
    if (this.actors[id]) this.actors[id].hit = 0.3;
  }

  // destello de pantalla (blanco por defecto; color y opacidad opcionales)
  flash(dur = 0.35, color = '#ffffff', alpha = 1) {
    this.flashT = dur;
    this._flashDur = dur;
    this._flashColor = color;
    this._flashAlpha = alpha;
  }

  // temblor de pantalla (lo maneja la cámara)
  shake(power = 8, dur = 0.25) {
    this.game.camera.shake(power, dur);
  }

  // silueta negra on/off (con fundido de `dur` segundos)
  silhouette(id, on = true, dur = 0.3) {
    const a = this.actorOf(id);
    if (!a) return;
    a.silTarget = on ? 1 : 0;
    a.silSpeed = dur > 0 ? 1 / dur : 999;
    if (a.sil === undefined) a.sil = on ? 0 : 1;
  }

  // caminar de una x a otra (pose 'camina' + paso), al llegar queda en endState
  walk(id, from, to, dur = 2, endState = 'normal', instant = false) {
    const a = this.actorOf(id);
    if (!a) return;
    if (instant || dur <= 0) {
      a.x = to;
      if (a.homeX !== undefined) a.homeX = to;
      a.state = endState;
      a.walk = null;
      a.walking = false;
      return;
    }
    a.walk = { from: from ?? a.x, to, t: 0, dur, end: endState };
    a.x = a.walk.from;
    a.walking = true;
    const def = FB.CHARACTERS[id];
    if (def && def.sprites && def.sprites.camina) a.state = 'camina';
  }

  // últimos segundos antes de liberarse: parpadeo blanco cada vez más rápido + temblor
  liberate(id, dur = 3) {
    const a = this.actorOf(id);
    if (!a) return;
    a.libT = dur;
    a.libDur = dur;
  }

  // paso de baile: inclinación a un lado ('left'/'right') o saltito ('confirm')
  dance(id, move) {
    const a = this.actorOf(id);
    if (!a) return;
    if (move === 'left') a.lean = -1;
    else if (move === 'right') a.lean = 1;
    else a.hop = 1;
  }

  // subir/bajar la tensión de a poco (viñeta, rojo, parpadeo de luz)
  tensionTo(v, dur = 1) {
    this._tens = { from: this.tension, to: v, t: 0, dur: Math.max(0.01, dur) };
  }

  // texto que aparece en pantalla (ej. los "¡RATERO!" de fondo)
  popText(o) {
    this.pops = this.pops || [];
    this.pops.push({ x: 640, y: 300, size: 40, color: '#fff', dur: 1.2, rot: 0, ...o, t: 0 });
  }

  // un personaje parpadea en blanco y tiembla (golpe, susto, aparición)
  flashSprite(id, dur = 0.3, shake = 6) {
    const a = this.actorOf(id);
    if (!a) return;
    a.whiteT = dur;
    a.whiteDur = dur;
    a.jitT = dur;
    a.jitPow = shake;
  }

  update(dt) {
    const decay = (v) => Math.max(0, v - dt * 4);
    const all = [this.player, ...Object.values(this.actors)];
    for (const a of all) {
      a.bop = decay(a.bop);
      a.animT += dt;
      a.hit = Math.max(0, a.hit - dt);
      a.whiteT = Math.max(0, (a.whiteT || 0) - dt);
      a.libT = Math.max(0, (a.libT || 0) - dt);
      a.lean = (a.lean || 0) * Math.max(0, 1 - dt * 5);
      a.hop = Math.max(0, (a.hop || 0) - dt * 4);
      if (a.tempT > 0 && (a.tempT -= dt) <= 0) a.tempState = null;
      a.jitT = Math.max(0, (a.jitT || 0) - dt);
      a.alpha += (a.target - a.alpha) * Math.min(1, dt * 5);
      if (a.silTarget !== undefined && a.sil !== a.silTarget) {
        const st = dt * (a.silSpeed || 4);
        a.sil = a.sil < a.silTarget ? Math.min(a.silTarget, a.sil + st) : Math.max(a.silTarget, a.sil - st);
      }
      if (a.walk) {
        const w = a.walk;
        w.t += dt;
        const k = Math.min(1, w.t / w.dur);
        a.x = w.from + (w.to - w.from) * k;
        if (k >= 1) {
          a.walk = null;
          a.walking = false;
          a.state = w.end;
          if (a.homeX !== undefined) a.homeX = w.to;
        }
      } else if (a.homeX !== undefined) a.x += (a.homeX - a.x) * Math.min(1, dt * 6);
    }
    for (const id in this.actors) {
      if (this.actors[id].target === 0 && this.actors[id].alpha < 0.02) delete this.actors[id];
    }
    this.flashT = Math.max(0, this.flashT - dt);
    if (this._ink) {
      const k = Math.min(1, (this._ink.t += dt) / this._ink.dur);
      this.ink = this._ink.from + (this._ink.to - this._ink.from) * k;
      if (k >= 1) this._ink = null;
    }
    for (const id in this.props || {}) {
      const p = this.props[id];
      if (!p.mv) continue;
      const m = p.mv;
      const k = Math.min(1, (m.t += dt) / m.dur);
      const e = k * k; // acelera (cae / se va)
      p.x = m.fx + (m.tx - m.fx) * e;
      p.y = m.fy + (m.ty - m.fy) * e;
      p.rot = m.frot + (m.trot - m.frot) * e;
      if (m.fade) p.alpha = 1 - k;
      if (k >= 1) p.mv = null;
    }
    for (const a of [this.player, ...Object.values(this.actors)]) {
      if (!a.fall) continue;
      a.fall.t += dt;
      if (a.fall.t >= a.fall.dur) {
        a.fall = null;
        a.alpha = 0;
        a.target = 0;
      }
    }
    if (this._tens) {
      const tw = this._tens;
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      this.tension = tw.from + (tw.to - tw.from) * k;
      if (k >= 1) this._tens = null;
    }
    if (this.pops) {
      for (const p of this.pops) p.t += dt;
      this.pops = this.pops.filter((p) => p.t < p.dur);
    }
  }

  // ── dibujo ──
  // modo "tinta": fondo blanco y todos en silueta negra (escena del capítulo animado)
  setInk(on, dur = 0.4) {
    this._ink = { from: this.ink || 0, to: on ? 1 : 0, t: 0, dur: Math.max(0.01, dur) };
  }

  // utilería simple dibujada por código: barril y globos
  //   prop({ id, kind: 'barrel'|'balloons', x, y })   ·   propMove(id, x, y, dur, rot)
  prop(o) {
    this.props = this.props || {};
    if (o.on === false) {
      delete this.props[o.id];
      return;
    }
    this.props[o.id] = { y: 0, rot: 0, alpha: 1, ...o };
  }

  propMove(id, x, y, dur = 1, rot = 0, fade = false) {
    const p = this.props && this.props[id];
    if (!p) return;
    p.mv = { fx: p.x, fy: p.y, frot: p.rot, tx: x ?? p.x, ty: y ?? p.y, trot: rot, t: 0, dur: Math.max(0.01, dur), fade };
  }

  // cae "en picada" (gira y se va para abajo)
  fall(id, dur = 1.2) {
    const a = this.actorOf(id);
    if (a) a.fall = { t: 0, dur };
  }

  // front = true: se dibuja delante de los personajes (ej. Ñoño atrapado en el barril)
  drawProps(ctx, t, front = false) {
    if (!this.props) return;
    const ink = this.ink || 0;
    for (const id in this.props) {
      const p = this.props[id];
      if (!!p.front !== front) continue;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, this.floorY + p.y);
      ctx.rotate(p.rot);
      const col = (c) => (ink > 0.5 ? '#000' : c);
      if (p.kind === 'barrel') {
        ctx.fillStyle = col('#7a4a22');
        ctx.strokeStyle = col('#2a1a0a');
        ctx.lineWidth = 4;
        ctx.beginPath();
        FB.roundRect(ctx, -55, -120, 110, 120, 18);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = col('#3a3a3a');
        ctx.fillRect(-57, -100, 114, 8);
        ctx.fillRect(-57, -30, 114, 8);
      } else if (p.kind === 'balloons') {
        const cols = ['#ff4b4b', '#ffd23f', '#4aa3ff', '#7dff9a', '#ff6fb0'];
        for (let i = 0; i < 5; i++) {
          const bx = (i - 2) * 26 + Math.sin(t * 1.5 + i) * 5;
          const by = -260 - (i % 2) * 34 + Math.cos(t * 1.2 + i) * 4;
          ctx.strokeStyle = col('#ddd');
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(bx, by + 22);
          ctx.lineTo(0, -120);
          ctx.stroke();
          ctx.fillStyle = col(cols[i]);
          ctx.beginPath();
          ctx.ellipse(bx, by, 17, 22, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  drawBackground(ctx) {
    this._drawBg(ctx);
    if (this.ink > 0.001) {
      ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, this.ink) + ')';
      ctx.fillRect(-30, -30, this.W + 60, this.H + 60);
    }
    this.drawProps(ctx, performance.now() / 1000);
  }

  _drawBg(ctx) {
    const def = FB.BACKGROUNDS[this.bgId] || FB.BACKGROUNDS.patio;
    const img = this.game.img(def.img);
    if (img) {
      const m = 24; // margen extra: el temblor no deja ver bordes negros
      Engine2D.drawCover(ctx, img, -m, -m, this.W + m * 2, this.H + m * 2);
      return;
    }
    // placeholder: patio genérico de vecindad
    const g = ctx.createLinearGradient(0, 0, 0, this.H);
    g.addColorStop(0, def.top);
    g.addColorStop(1, def.bottom);
    ctx.fillStyle = g;
    ctx.fillRect(-24, -24, this.W + 48, this.H + 48);
    // pared del fondo con puertas
    ctx.fillStyle = def.wall;
    ctx.fillRect(0, 170, this.W, this.floorY - 170);
    const doors = [
      [90, '71'],
      [330, '72'],
      [600, '8'],
      [860, '14'],
      [1110, '23'],
    ];
    for (const [dx, n] of doors) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(dx, 330, 90, this.floorY - 330);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(dx + 8, 340, 74, this.floorY - 348);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(n, dx + 45, 320);
      // ventana
      ctx.fillStyle = 'rgba(255,220,140,' + (0.06 + this.tension * 0.04) + ')';
      ctx.fillRect(dx + 110, 260, 60, 50);
    }
    ctx.fillStyle = def.floor;
    ctx.fillRect(-24, this.floorY, this.W + 48, this.H - this.floorY + 24);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let x = 0; x < this.W; x += 80) ctx.fillRect(x, this.floorY, 2, this.H - this.floorY);
  }

  // opts.skip = ids a no dibujar · opts.only = dibujar solo esos ids
  drawCharacters(ctx, t, opts = {}) {
    const ok = (id) => (opts.only ? opts.only.includes(id) : !(opts.skip && opts.skip.includes(id)));
    // primero los de atrás (aliados ya salvados, más chicos y oscuros), después los de adelante
    const list = Object.values(this.actors).sort((a, b) => (b.back ? 1 : 0) - (a.back ? 1 : 0) || a.x - b.x);
    for (const a of list) if (ok(a.id)) this._drawActor(ctx, a, false, t);
    if (ok(this.player.id)) this._drawActor(ctx, this.player, true, t);
    if (!opts.only) this.drawProps(ctx, t, true);
  }

  _spriteFor(def, state) {
    if (!def.sprites) return null;
    const s = def.sprites[state] || def.sprites.normal || def.sprites.corrupto;
    if (!s) return null;
    // string → imagen suelta · { src, frames, fps } → tira animada
    // { src, cols, frame } → una pose fija de un spritesheet de `cols` columnas
    return typeof s === 'string' ? { src: s, frames: 1, fps: 12 } : { frames: 1, fps: 12, ...s };
  }

  _drawActor(ctx, a, isPlayer, t) {
    const def = FB.CHARACTERS[a.id];
    if (!def || a.alpha < 0.01) return;
    let ox = 0;
    let oy = 0;
    if (a.hit > 0) ox += (Math.random() * 2 - 1) * 8;
    if (a.walking) oy -= Math.abs(Math.sin(t * 8)) * 7; // paso al caminar
    if (a.jitT > 0) {
      const p = a.jitPow * (a.jitT / (a.whiteDur || a.jitT));
      ox += (Math.random() * 2 - 1) * p;
      oy += (Math.random() * 2 - 1) * p * 0.5;
    }
    // liberándose: parpadeo blanco que acelera + temblor que crece
    let libWhite = 0;
    if (a.libT > 0) {
      const k = 1 - a.libT / a.libDur; // 0 → 1
      const hz = 3 + 9 * k;
      libWhite = Math.sin(t * hz * Math.PI * 2) > 0 ? 0.3 + 0.5 * k : 0.05;
      const pw = 1.5 + 4 * k;
      ox += (Math.random() * 2 - 1) * pw;
      oy += (Math.random() * 2 - 1) * pw * 0.5;
    }
    if (a.hop > 0) oy -= Math.sin(a.hop * Math.PI) * 22;
    let fallRot = 0;
    if (a.fall) {
      const k = a.fall.t / a.fall.dur;
      oy += k * k * 520;
      ox -= k * 160;
      fallRot = -k * 1.4;
    }
    const inkSil = this.ink || 0;
    const back = a.back ? 1 : 0;

    ctx.save();
    ctx.globalAlpha = a.alpha * (a.hit > 0 && Math.floor(a.hit * 20) % 2 ? 0.55 : 1);
    ctx.translate(a.x + ox, this.floorY + oy - back * 22);
    if (back) ctx.scale(0.84, 0.84); // más lejos = más chico
    if (a.lean) ctx.rotate(a.lean * 0.12);
    if (fallRot) ctx.rotate(fallRot);
    // el sprite 'alma' ya viene fantasmal: menos transparencia y sin tinte celeste
    const ownGhost = a.ghost && (a.tempState || a.state) === 'alma';
    if (a.ghost) {
      ctx.globalAlpha *= (ownGhost ? 0.85 : 0.6) + Math.sin(t * 2) * 0.12;
      ctx.translate(0, -18 + Math.sin(t * 1.6) * 8); // flota
    } else {
      // sombra
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 0, def.height * 0.22, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const dim = back && !a.ghost ? 0.3 : 0; // los de atrás, un poco más oscuros
    if (a.whiteT > 0 || a.sil > 0.001 || libWhite > 0 || dim > 0 || a.ghost || inkSil > 0.001) {
      // se dibuja en un canvas aparte, se tiñe de blanco y se pega
      const B = this._whiteBuffer();
      const bx = B.ctx;
      bx.setTransform(1, 0, 0, 1, 0, 0);
      bx.globalCompositeOperation = 'source-over';
      bx.clearRect(0, 0, B.w, B.h);
      bx.translate(B.w / 2, B.h - 20);
      this._drawBody(bx, a, def, t);
      bx.setTransform(1, 0, 0, 1, 0, 0);
      bx.globalCompositeOperation = 'source-atop';
      const black = Math.max(a.sil || 0, dim, inkSil);
      if (black > 0.001) {
        bx.fillStyle = 'rgba(0,0,0,' + Math.min(1, black) + ')';
        bx.fillRect(0, 0, B.w, B.h);
      }
      if (a.ghost && !ownGhost) {
        bx.fillStyle = 'rgba(150,210,255,0.55)';
        bx.fillRect(0, 0, B.w, B.h);
      }
      const white = Math.max(a.whiteT > 0 ? Math.min(1, (a.whiteT / a.whiteDur) * 1.3) : 0, libWhite);
      if (white > 0) {
        bx.fillStyle = 'rgba(255,255,255,' + white + ')';
        bx.fillRect(0, 0, B.w, B.h);
      }
      ctx.drawImage(B.canvas, -B.w / 2, -(B.h - 20));
    } else {
      this._drawBody(ctx, a, def, t);
    }
    ctx.restore();

    // tinte rojo al recibir daño
    if (a.hit > 0 && isPlayer) {
      ctx.save();
      ctx.globalAlpha = a.hit;
      ctx.fillStyle = 'rgba(255,0,0,0.25)';
      ctx.fillRect(a.x - 120, this.floorY - def.height - 10, 240, def.height + 10);
      ctx.restore();
    }
  }

  _whiteBuffer() {
    if (!this._buf) {
      const c = document.createElement('canvas');
      c.width = 900;
      c.height = 700;
      this._buf = { canvas: c, ctx: c.getContext('2d'), w: c.width, h: c.height };
    }
    return this._buf;
  }

  // cuerpo del personaje con el bop, parado en (0,0)
  _drawBody(ctx, a, def, t) {
    ctx.save();
    const sx = 1 + 0.035 * a.bop;
    const ph = a.id.length * 1.7; // fase fija por personaje
    const sy = 1 - 0.055 * a.bop + (a.walking ? 0 : Math.sin(t * 2.2 + ph) * 0.008);
    ctx.scale(sx, sy);
    const spr = this._spriteFor(def, a.tempState || a.state);
    const img = spr && this.game.img(spr.src);
    if (img) {
      const cols = spr.cols || spr.frames;
      const fw = img.width / cols;
      const idx =
        spr.frame !== undefined
          ? spr.frame
          : spr.frames > 1
            ? Math.min(spr.frames - 1, Math.floor(a.animT * spr.fps))
            : 0;
      const h = def.height;
      const w = h * (fw / img.height);
      // facing = hacia dónde mira el dibujo original; face = hacia dónde queremos
      const nat = def.facing || 'right';
      const want = a.face || (a === this.player ? 'left' : 'right');
      if ((nat !== want) !== !!def.flip !== !!(spr && spr.mirror)) ctx.scale(-1, 1);
      ctx.drawImage(img, idx * fw, 0, fw, img.height, -w / 2, -h, w, h);
    } else {
      this._drawPlaceholder(ctx, def, a.tempState || a.state, t);
    }
    ctx.restore();
  }

  // Silueta genérica (no representa a nadie) con nombre y estado
  _drawPlaceholder(ctx, def, state, t) {
    const h = def.height;
    const w = h * 0.36;
    const evil = state === 'revelado' || state === 'final' || state === 'corrupto';
    ctx.fillStyle = state === 'final' ? '#1a0505' : def.color;
    ctx.strokeStyle = evil ? 'rgba(255,40,40,0.8)' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 3;
    // cuerpo
    ctx.beginPath();
    FB.roundRect(ctx, -w / 2, -h * 0.76, w, h * 0.76, 16);
    ctx.fill();
    ctx.stroke();
    // cabeza
    const hr = h * 0.12;
    const hy = -h * 0.76 - hr * 0.9;
    ctx.beginPath();
    ctx.arc(0, hy, hr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // ojos según estado
    if (state !== 'espalda') {
      const ex = hr * 0.38;
      if (evil) {
        ctx.save();
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = state === 'corrupto' ? 6 : 16;
        ctx.fillStyle = state === 'corrupto' ? '#ffdddd' : '#ff2020';
        const r = state === 'final' ? hr * 0.2 : hr * 0.13;
        ctx.beginPath();
        ctx.arc(-ex, hy - 2, r, 0, Math.PI * 2);
        ctx.arc(ex, hy - 2, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-ex, hy - 2, hr * 0.1, 0, Math.PI * 2);
        ctx.arc(ex, hy - 2, hr * 0.1, 0, Math.PI * 2);
        ctx.fill();
        if (state === 'triste') {
          ctx.strokeStyle = 'rgba(140,190,255,0.8)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-ex, hy + 4);
          ctx.lineTo(-ex, hy + 4 + 8 + Math.sin(t * 3) * 3);
          ctx.stroke();
        }
      }
    }
    // escopeta (placeholder) para Jirafales
    if (state === 'escopeta') {
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(-w / 2 - 70, -h * 0.55, 110, 10);
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(-w / 2 + 20, -h * 0.55, 30, 18);
    }
    // etiqueta
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(def.nombre, 0, -h * 0.35);
    ctx.font = '12px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('[' + state + ']', 0, -h * 0.35 + 18);
  }

  // Efectos de terror: viñeta, parpadeo y tinte según "tension" (0..1)
  drawPops(ctx) {
    if (!this.pops || !this.pops.length) return;
    ctx.save();
    ctx.textAlign = 'center';
    for (const p of this.pops) {
      const k = p.t / p.dur;
      const a = Math.min(1, p.t * 8, (1 - k) * 4);
      const sc = 0.6 + Math.min(1, p.t * 6) * 0.4 + k * 0.15;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(p.x + (Math.random() - 0.5) * 3, p.y - k * 18);
      ctx.rotate(p.rot);
      ctx.scale(sc, sc);
      ctx.font = 'bold ' + p.size + 'px "Press Start 2P", monospace';
      ctx.lineWidth = Math.max(4, p.size / 6);
      ctx.strokeStyle = '#000';
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  drawFx(ctx, t) {
    const T = this.tension;
    if (!this._vignette) {
      const g = ctx.createRadialGradient(this.W / 2, this.H / 2, this.H * 0.3, this.W / 2, this.H / 2, this.H * 0.95);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.85)');
      this._vignette = g;
    }
    ctx.save();
    ctx.globalAlpha = 0.35 + T * 0.65;
    ctx.fillStyle = this._vignette;
    ctx.fillRect(0, 0, this.W, this.H);
    ctx.restore();
    if (T > 0) {
      ctx.fillStyle = 'rgba(120,0,0,' + T * 0.12 + ')';
      ctx.fillRect(0, 0, this.W, this.H);
      // parpadeo de luz
      const flick = Math.sin(t * 37) * Math.sin(t * 13.3) > 0.92 - T * 0.1;
      if (flick) {
        ctx.fillStyle = 'rgba(0,0,0,' + (0.2 + T * 0.35) + ')';
        ctx.fillRect(0, 0, this.W, this.H);
      }
    }
    if (this.flashT > 0) {
      ctx.save();
      ctx.globalAlpha = (this.flashT / this._flashDur) * (this._flashAlpha ?? 1);
      ctx.fillStyle = this._flashColor || '#ffffff';
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.restore();
    }
  }
};
