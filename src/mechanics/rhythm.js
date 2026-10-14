// ══════════════════════════════════════
//   Ritmo corto (flechas estilo FNF)
// ══════════════════════════════════════
// 4 carriles: ← ↓ ↑ →. Las notas suben hasta los receptores.
// params:
//   every       cada cuántos beats puede haber nota (1, 0.5...)
//   density     probabilidad de nota en cada paso (0..1)
//   seed        semilla → mismo patrón en cada intento
//   chart       opcional: [[beatDesdeElInicio, carril], ...] para escribir el patrón a mano
//   lead        beats de espera antes de la primera nota (default 4)
//   speed       velocidad de scroll (px/s)
//   missDamage  daño por nota perdida
//   lanes       carriles (default ['left','down','up','right']); se puede usar 'confirm' (Enter)
//   pattern     secuencia fija que se repite, ej. ['left','left','right','right','left','right','confirm']
//               (cada `every` beats una nota, y `rest` beats de pausa entre repeticiones)
//   startAt     segundo exacto donde cae la primera nota del patrón · reps: cuántas veces se repite
//   demoReps    las primeras N repeticiones son demostración (se juegan solas, sin daño) → "¡REPITE!"
//   demoDancer  quién baila en la demostración · dancer: quién baila cuando acertás
//   dancers     otros que bailan con vos cuando acertás (ej. ['chilindrina'])
//   dancePoses  { left: 'baile_izq', right: 'baile_der', confirm: 'baile_enter' } poses del baile
//   x           centro horizontal de los carriles (default: centro de la pantalla)
//   target      id de un personaje: muestra su barra de "liberación" que sube con cada acierto

FB.MECHANICS.rhythm = class Rhythm extends FB.Mechanic {
  constructor(game, p, t0, t1) {
    super(game, p, t0, t1);
    const ALL = {
      left: { rot: -Math.PI / 2, color: '#c24b99' },
      down: { rot: Math.PI, color: '#00d8ff' },
      up: { rot: 0, color: '#12fa05' },
      right: { rot: Math.PI / 2, color: '#f9393f' },
      confirm: { rot: null, color: '#ffd23f' },
    };
    this.lanes = p.lanes || ['left', 'down', 'up', 'right'];
    this.rots = this.lanes.map((l) => ALL[l].rot);
    this.colors = this.lanes.map((l) => ALL[l].color);
    this.meter = 0;
    this.recY = p.y || 110;
    this.cx = p.x ?? game.W / 2;
    this.gapX = 100;
    this.size = 72;
    this.speed = p.speed || 650;
    this.window = 0.15;
    this.press = [0, 0, 0, 0];
    this.glow = [0, 0, 0, 0];
    this.rating = null;
    this.combo = 0;

    const c = this.cond;
    const startBeat = Math.ceil(c.beatAt(t0)) + (p.lead ?? 4);
    const now = c.time;
    this.notes = [];
    const nL = this.lanes.length;
    this.press = new Array(nL).fill(0);
    this.glow = new Array(nL).fill(0);
    if (p.pattern) {
      const every = p.every || 1;
      const cycle = p.pattern.length * every + (p.rest ?? 1);
      // startAt: segundo EXACTO del primer paso (sin redondear al beat: se respeta la marca tal cual)
      const first = p.startAt !== undefined ? Math.round(c.beatAt(p.startAt)) : startBeat;
      const shift = p.startAt !== undefined ? p.startAt - c.timeOfBeat(first) : 0;
      const T = (b) => c.timeOfBeat(b) + shift;
      let reps = 0;
      for (let base = first; ; base += cycle) {
        if (p.reps && reps >= p.reps) break;
        const demo = reps < (p.demoReps || 0);
        if (!demo && this.repiteAt === undefined) this.repiteAt = T(base - (p.rest ?? 1) - 0.5);
        if (demo && this.demoFrom === undefined) this.demoFrom = T(base - 2);
        reps++;
        let done = false;
        p.pattern.forEach((act, i) => {
          const tt = T(base + i * every);
          if (tt >= t1 - 0.5) return (done = true);
          this.notes.push({ time: tt, lane: this.lanes.indexOf(act), demo });
        });
        if (done || T(base + cycle) >= t1 - 0.5) break;
      }
      this.total = this.notes.filter((n) => !n.demo).length;
    } else if (p.chart) {
      for (const [b, lane] of p.chart) this.notes.push({ time: c.timeOfBeat(startBeat + b), lane });
    } else {
      const rnd = FB.rng(p.seed || 1);
      const every = p.every || 1;
      let prev = -1;
      for (let b = startBeat; c.timeOfBeat(b) < t1 - 0.5; b += every) {
        if (rnd() > (p.density ?? 0.75)) continue;
        let lane = Math.floor(rnd() * nL);
        if (lane === prev && rnd() < 0.6) lane = (lane + 1 + Math.floor(rnd() * (nL - 1))) % nL;
        prev = lane;
        this.notes.push({ time: c.timeOfBeat(b), lane });
      }
    }
    // si se entró a mitad del segmento, no castigar notas que ya pasaron
    this.notes = this.notes.filter((n) => n.time > now + 0.5);
  }

  laneX(i) {
    return this.cx + (i - (this.lanes.length - 1) / 2) * this.gapX;
  }

  onAction(a) {
    const lane = this.lanes.indexOf(a);
    if (lane < 0) return;
    this.press[lane] = 0.12;
    const time = this.cond.time;
    let best = null;
    for (const n of this.notes) {
      if (n.done || n.demo || n.lane !== lane) continue;
      const d = Math.abs(n.time - time);
      if (d <= this.window && (!best || n.time < best.time)) best = n;
    }
    if (!best) return; // ghost tapping: apretar sin nota no castiga
    best.done = true;
    const d = Math.abs(best.time - time);
    const label = d < 0.045 ? '¡PERFECTO!' : d < 0.09 ? '¡BIEN!' : 'OK';
    this.combo++;
    this.glow[lane] = 0.2;
    this.game.heal(d < 0.09 ? 2 : 1);
    this.game.stats.notesHit++;
    if (this.total) this.meter = Math.min(1, this.meter + 1.25 / this.total);
    this.rating = { text: label, t: 0.6, color: d < 0.045 ? '#ffe14d' : '#ffffff' };
    this.danceMove(this.p.dancer, a);
    for (const id of this.p.dancers || []) this.danceMove(id, a);
    Engine2D.Particles.sparks(this.laneX(lane), this.recY, { colors: [this.colors[lane], '#ffffff'], amount: 8 });
  }

  // paso de baile: pose del baile (si hay sprite) + inclinación / saltito
  danceMove(id, move) {
    if (!id) return;
    const st = this.game.stage;
    // el personaje puede tener sus propias poses de baile (ej. Don Ramón, en 2 cuadros)
    const own = (FB.CHARACTERS[id] || {}).dancePoses;
    const pose = (own && own[move]) || (this.p.dancePoses && this.p.dancePoses[move]);
    if (pose) st.pose(id, pose, 0.38);
    st.dance(id, move);
  }

  update(dt, time) {
    for (let i = 0; i < this.lanes.length; i++) {
      this.press[i] = Math.max(0, this.press[i] - dt);
      this.glow[i] = Math.max(0, this.glow[i] - dt);
    }
    if (this.rating) {
      this.rating.t -= dt;
      if (this.rating.t <= 0) this.rating = null;
    }
    for (const n of this.notes) {
      if (n.done) continue;
      // demostración: se "toca" sola en el tiempo justo
      if (n.demo) {
        if (time >= n.time) {
          n.done = true;
          const lane = this.lanes[n.lane];
          this.glow[n.lane] = 0.2;
          this.press[n.lane] = 0.12;
          this.danceMove(this.p.demoDancer, lane);
        }
        continue;
      }
      if (time - n.time > this.window) {
        n.done = true;
        n.missed = true;
        this.combo = 0;
        this.game.stats.notesMiss++;
        if (FB.SFX) FB.SFX.play('falla', { vol: 0.8 });
        this.game.hurt(this.p.missDamage || 5);
        this.rating = { text: 'FALLASTE', t: 0.6, color: '#ff5050' };
      }
    }
  }

  // flecha, o botón redondo "ENTER" para el carril 'confirm'
  drawNote(ctx, lane, x, y, size, fill, stroke) {
    if (this.rots[lane] !== null) return FB.drawArrow(ctx, x, y, size, this.rots[lane], fill, stroke);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, size * 0.48, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = stroke;
    ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 11px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ENTER', x, y + 5);
    ctx.restore();
  }

  draw(ctx, time) {
    const f = this.fade(time);
    if (f <= 0) return;
    ctx.save();
    ctx.globalAlpha = f;
    // franja de fondo
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(this.laneX(0) - 60, 0, this.gapX * (this.lanes.length - 1) + 120, this.game.H);
    // receptores
    for (let i = 0; i < this.lanes.length; i++) {
      const s = this.size * (this.press[i] > 0 ? 0.9 : 1);
      const fill = this.glow[i] > 0 ? this.colors[i] : this.press[i] > 0 ? 'rgba(255,255,255,0.25)' : 'rgba(40,40,50,0.8)';
      this.drawNote(ctx, i, this.laneX(i), this.recY, s, fill, 'rgba(255,255,255,0.7)');
    }
    // notas (las de la demostración, más transparentes)
    for (const n of this.notes) {
      if (n.done) continue;
      ctx.globalAlpha = f * (n.demo ? 0.45 : 1);
      const y = this.recY + (n.time - time) * this.speed;
      if (y > this.game.H + 60) continue;
      this.drawNote(ctx, n.lane, this.laneX(n.lane), y, this.size, this.colors[n.lane], '#ffffff');
    }
    ctx.globalAlpha = f;
    // carteles
    const firstPlay = this.notes.find((n) => !n.demo);
    const demoOn = this.demoFrom !== undefined && time >= this.demoFrom && firstPlay && time < this.repiteAt;
    if (demoOn) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('¡MIRÁ EL BAILE!', this.cx, this.recY + 110);
    }
    if (this.repiteAt !== undefined && time >= this.repiteAt && time < this.repiteAt + 1.6) {
      const k = (time - this.repiteAt) / 1.6;
      ctx.save();
      ctx.globalAlpha = f * Math.min(1, (1 - k) * 3);
      ctx.translate(this.cx, this.recY + 120);
      ctx.scale(1 + (1 - k) * 0.3, 1 + (1 - k) * 0.3);
      ctx.fillStyle = '#ffd23f';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 6;
      ctx.font = 'bold 34px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.strokeText('¡REPITE!', 0, 0);
      ctx.fillText('¡REPITE!', 0, 0);
      ctx.restore();
    }
    // calificación y combo
    if (this.rating) {
      ctx.globalAlpha = f * Math.min(1, this.rating.t * 3);
      ctx.fillStyle = this.rating.color;
      ctx.font = 'bold 30px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.rating.text, this.cx, this.recY + 120 - (0.6 - this.rating.t) * 30);
      if (this.combo > 2) {
        ctx.font = 'bold 18px "Press Start 2P", monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText('x' + this.combo, this.cx, this.recY + 155);
      }
    }
    if (this.p.target) {
      const pos = this.game.stage.posOf(this.p.target);
      const def = FB.CHARACTERS[this.p.target] || {};
      const w = 150;
      const bx = pos.x - w / 2;
      const by = Math.max(330, pos.top - 46);
      ctx.globalAlpha = f;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(bx - 3, by - 3, w + 6, 16);
      ctx.fillStyle = '#ff9fd8';
      ctx.fillRect(bx, by, w * this.meter, 10);
      ctx.fillStyle = '#fff';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SALVAR A ' + (def.nombre || this.p.target).toUpperCase(), pos.x, by - 8);
    }
    ctx.restore();
  }
};
