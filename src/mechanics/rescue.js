// ══════════════════════════════════════
//   Rescate: hablarle a un personaje corrompido para liberarlo
// ══════════════════════════════════════
// Preguntas con 3 opciones (como 'choice') + barra de "Liberación" sobre el
// personaje. Si `dodge` tiene config, además hay caja de combate: esquivás con
// las flechas y respondés con 1/2/3 o click (la pregunta va arriba, la caja debajo).
// params:
//   target       id del personaje (ej. 'florinda')
//   questions    igual que en 'choice'
//   dodge        null | params de 'bulletbox' (patterns, damage, box...)
//   gain / loss  cuánto sube/baja la barra por respuesta buena/mala (0..1)
// La liberación en sí (cambiar a pose 'sano') la hace el timeline con un
// evento setState: la historia sigue igual, la barra suma al puntaje final.

FB.MECHANICS.rescue = class Rescue extends FB.Mechanic {
  constructor(game, p, t0, t1) {
    super(game, p, t0, t1);
    this.meter = p.meterStart ?? 0;
    this.shownMeter = this.meter;
    this.flash = 0;
    const dodge = !!p.dodge;
    // las opciones van arriba, así que la caja baja un poco (debajo de la franja)
    const box = { ...((p.dodge && p.dodge.box) || {}) };
    if (box.y === undefined) box.y = 108;
    this.box = dodge ? new FB.MECHANICS.bulletbox(game, { ...p.dodge, box }, t0, t1) : null;
    this.choice = new FB.MECHANICS.choice(
      game,
      {
        ...p,
        layout: dodge ? 'strip' : p.layout,
        numbersOnly: dodge,
        onResult: (r) => this.result(r),
      },
      t0,
      t1,
    );
  }

  result(r) {
    if (r === 'good') {
      this.meter = Math.min(1, this.meter + (this.p.gain ?? 0.22));
      this.flash = 0.5;
      this.game.stage.flashSprite(this.p.target, 0.25, 4);
    } else if (r === 'bad' || r === 'timeout') {
      this.meter = Math.max(0, this.meter - (this.p.loss ?? 0.1));
      this.game.stage.shake(5, 0.2);
    }
    this.game.stats.rescue = this.game.stats.rescue || {};
    this.game.stats.rescue[this.p.target] = this.meter;
  }

  update(dt, time) {
    this.shownMeter += (this.meter - this.shownMeter) * Math.min(1, dt * 6);
    this.flash = Math.max(0, this.flash - dt);
    if (this.box) this.box.update(dt, time);
    this.choice.update(dt, time);
  }

  onBeat(b, time) {
    // mientras hay pregunta en pantalla, el rival ataca menos (cada 2 beats)
    if (this.box && !(this.choice.active && b % 2)) this.box.onBeat(b, time);
  }

  onAction(a) {
    this.choice.onAction(a);
  }

  onPointer(x, y) {
    this.choice.onPointer(x, y);
  }

  get busy() {
    return !!this.box || this.choice.busy;
  }

  draw(ctx, time) {
    if (this.box) this.box.draw(ctx, time);
    this.choice.draw(ctx, time);
    // barra de liberación sobre el personaje
    const pos = this.game.stage.posOf(this.p.target);
    const def = FB.CHARACTERS[this.p.target] || {};
    const f = this.fade(time);
    const w = 150;
    const x = pos.x - w / 2;
    const y = Math.max(this.box ? 312 : 280, pos.top - 34);
    ctx.save();
    ctx.globalAlpha = f;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(x - 3, y - 3, w + 6, 16);
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(x, y, w, 10);
    ctx.fillStyle = this.flash > 0 ? '#ffffff' : '#7dd8ff';
    ctx.fillRect(x, y, w * this.shownMeter, 10);
    ctx.fillStyle = '#fff';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LIBERAR A ' + (def.nombre || this.p.target).toUpperCase(), pos.x, y - 8);
    if (this.box) {
      ctx.globalAlpha = f * 0.75;
      ctx.font = '11px "Press Start 2P", monospace';
      if (!this.choice.busy) ctx.fillText('flechas: esquivar · 1 2 3 o click: responder', this.game.W / 2, 660);
    }
    ctx.restore();
  }
};
