// ══════════════════════════════════════
//   Intro (antes de la música) — escenas tipo cómic
// ══════════════════════════════════════
// Se arma con song.js → intro.steps. Cada paso puede tener:
//   say:  ['Quién', 'texto']             cuadro de diálogo
//   walk: { from, to, dur }              Jirafales camina (from opcional)
//   pose: 'asustado'                     pose al llegar / mientras habla
//   exit: true                           se desvanece (entra por la puerta)
// Click / Z / Enter: completa el texto → pasa al siguiente paso.
// Un paso sin texto avanza solo cuando termina de caminar.
// Esc salta toda la intro. Al terminar: fundido a negro → onDone().

window.FB = window.FB || {};

FB.Intro = class Intro {
  constructor(game, cfg, onDone) {
    this.game = game;
    this.cfg = cfg;
    this.onDone = onDone;
    this.steps = cfg.steps || [];
    this.i = -1;
    this.t = 0;
    this.chars = 0;
    this.fade = 1; // arranca en negro
    this.fadeOut = 0;
    this.finishing = false;
    const p = game.stage.player;
    game.stage.apply({ bg: cfg.bg || 'entrada', opponents: [], tension: 0 }); // afuera todavía no hay parpadeo de luz
    p.x = cfg.startX ?? 1450;
    game.camera.zoomTo(cfg.zoom ?? 1.12, 0);
    game.camera.focus('jirafales', 0, 'out', true);
    game.camera.panX = p.x - game.W / 2;
    this.next();
  }

  get step() {
    return this.steps[this.i];
  }

  next() {
    this.i++;
    this.chars = 0;
    const s = this.step;
    if (!s) {
      this.finishing = true;
      return;
    }
    const st = this.game.stage;
    if (s.walk) st.walk('jirafales', s.walk.from, s.walk.to, s.walk.dur ?? 2, s.pose || 'normal');
    else if (s.pose) st.setState('jirafales', s.pose);
    if (s.exit) st.player.target = 0;
  }

  get walking() {
    return !!this.game.stage.player.walk;
  }

  update(dt) {
    this.t += dt;
    this.fade = Math.max(0, this.fade - dt * 1.5);
    const s = this.step;
    const p = this.game.stage.player;
    if (s && s.say) {
      this.chars = Math.min(s.say[1].length, this.chars + dt * 40);
      // boca: 'hablando' mientras escribe (si está quieto y no hay otra pose pedida)
      if (!this.walking && !s.pose && s.say[0] === 'Prof. Jirafales') {
        p.state = this.chars < s.say[1].length ? 'hablando' : 'normal';
      }
    }
    // paso sin texto: avanza solo al terminar de caminar / desvanecerse
    if (s && !s.say && !this.walking && (!s.exit || p.alpha < 0.05)) this.next();
    if (this.finishing) {
      this.fadeOut = Math.min(1, this.fadeOut + dt * 1.6);
      if (this.fadeOut >= 1 && !this.done) {
        this.done = true;
        this.onDone();
      }
    }
  }

  onAction(a) {
    if (a === 'pause') return this.skip();
    if (a === 'confirm') this.advance();
  }

  onPointer() {
    this.advance();
  }

  advance() {
    const s = this.step;
    if (!s || this.finishing) return;
    if (this.walking) {
      // saltar la caminata: llega de una
      const w = this.game.stage.player.walk;
      this.game.stage.walk('jirafales', 0, w.to, 0, w.end, true);
      return;
    }
    if (s.say && this.chars < s.say[1].length) {
      this.chars = s.say[1].length;
      return;
    }
    this.next();
  }

  skip() {
    this.finishing = true;
  }

  draw(ctx) {
    const G = this.game;
    // franjas negras de cine
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, G.W, 46);
    ctx.fillRect(0, G.H - 46, G.W, 46);
    const s = this.step;
    if (s && s.say && !this.finishing) {
      FB.drawDialogue(ctx, G.W, s.say[0], s.say[1], this.chars, {
        hint: !this.walking && Math.floor(this.t * 2.5) % 2 === 0,
        y: G.H - 46 - 160,
      });
    }
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#fff';
    ctx.font = '11px "Press Start 2P", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Esc saltar', G.W - 16, 30);
    ctx.restore();
    const a = Math.max(this.fade, this.fadeOut);
    if (a > 0) {
      ctx.fillStyle = 'rgba(0,0,0,' + a + ')';
      ctx.fillRect(0, 0, G.W, G.H);
    }
  }
};
