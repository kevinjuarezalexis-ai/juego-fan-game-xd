// ══════════════════════════════════════
//   Diálogo con 3 opciones + cronómetro
// ══════════════════════════════════════
// Los diálogos son lore + curación: las 3 respuestas son buenas y todas curan.
// Una es la CLAVE (key: true): cura el doble y cuenta para el final bueno
// (hay que elegir la clave en todos los diálogos). Si no elegís a tiempo, no pasa nada.
// Controles: 1/2/3 directo, o ↑↓ + Z/Enter, o click/toque.
// params:
//   questions: [{ t, time, speaker, prompt, options: [{ text, key, reply }] }]
//     key: true → respuesta clave (por compatibilidad, ok: true también cuenta como clave)
//   heal          cuánto cura una respuesta normal (la clave cura el doble) · healOk = lo mismo (viejo)
//   panelY        altura del cuadro (default 14 = arriba)
//   stripY        altura de la franja (default 8 = arriba)
//   numbersOnly   solo 1/2/3 o click (para usar mientras esquivás con las flechas)
//   replyTime     segundos que se ve la respuesta (default 2.2)
//   onResult(r)   avisa 'good' | 'bad' | 'neutral' | 'timeout' (lo usa la mecánica rescate)
//   onLast        { char, state, from } al contestar la última pregunta pone esa pose (si está en 'from')

FB.MECHANICS.choice = class Choice extends FB.Mechanic {
  constructor(game, p, t0, t1) {
    super(game, p, t0, t1);
    this.questions = (p.questions || []).map((q) => ({ ...q, state: 'pending' }));
    this.active = null;
    this.sel = 0;
    this.speech = []; // frases flotantes: { id, text, t0, t1, posed }
    this.optRects = [];
  }

  update(dt, time) {
    if (!this.active) {
      const q = this.questions.find((q) => q.state === 'pending' && time >= q.t);
      if (q) {
        if (time > q.t + (q.time || 6) - 1) q.state = 'skipped'; // ya pasó (entraste a mitad)
        else {
          this.active = q;
          q.state = 'active';
          this.sel = 0;
          // si quedaba alguna frase de antes, se corta: empieza la pregunta nueva
          for (const sp of this.speech) sp.t1 = Math.min(sp.t1, time);
        }
      }
    }
    if (this.active && time >= this.active.t + (this.active.time || 6)) {
      this.resolve(-1);
    }
    // cada frase: el que la dice usa su sprite de hablar mientras dura
    for (const sp of this.speech) {
      if (!sp.posed && time >= sp.t0 && time < sp.t1) {
        sp.posed = true;
        const pose = this.talkPose(sp.id);
        if (pose) this.game.stage.pose(sp.id, pose, sp.t1 - time);
      }
    }
    this.speech = this.speech.filter((sp) => time < sp.t1 + 0.3);
  }

  // pose de hablar del personaje en su estado actual (si tiene)
  talkPose(id) {
    const st = this.game.stage;
    const a = st.actorOf(id);
    const def = FB.CHARACTERS[id];
    if (!a || !def || !def.sprites) return null;
    const state = a.state;
    if (def.talkPose && def.talkPose[state]) return def.talkPose[state];
    if (state === 'corrupto' && def.sprites.corrupto_hablando) return 'corrupto_hablando';
    if (state !== 'corrupto' && def.sprites.hablando) return 'hablando';
    return null;
  }

  // cuánto dura una frase en pantalla según lo larga que es
  durFrase(text) {
    return Math.max(1.6, Math.min(3.8, 0.9 + String(text).length * 0.055));
  }

  resolve(i) {
    const q = this.active;
    if (!q) return;
    q.state = 'done';
    this.active = null;
    const L = this.p.onLast;
    if (L && this.questions.every((x) => x.state === 'done' || x.state === 'skipped')) {
      const a = this.game.stage.actorOf(L.char);
      if (a && (!L.from || a.state === L.from)) this.game.stage.setState(L.char, L.state);
    }
    const time = this.cond.time;
    const yo = this.game.stage.player.id;
    // para el final bueno: qué respuesta se eligió en cada diálogo (por su segundo)
    const claves = (this.game.claves = this.game.claves || {});
    if (i < 0) {
      claves[q.t] = false;
      this.speech.push({ id: yo, text: '...', t0: time, t1: time + 1.3, silent: true });
      if (this.p.onResult) this.p.onResult('timeout', q, null);
      return;
    }
    const o = q.options[i];
    const key = o.key === true || (o.key === undefined && o.ok === true);
    claves[q.t] = key;
    const base = this.p.heal ?? this.p.healOk ?? 6;
    this.game.heal(key ? base * 2 : base);
    this.game.stats.answersGood++;
    if (key) this.game.stats.answersKey = (this.game.stats.answersKey || 0) + 1;
    if (FB.SFX) FB.SFX.play('bien');
    // el que elegiste lo dice el profe (con su sprite de hablar) y después contesta el vecino
    const d1 = this.durFrase(o.text);
    this.speech.push({ id: yo, text: o.text, t0: time, t1: time + d1 });
    if (o.reply) {
      const quien = this.game.speakerId(q.speaker);
      this.speech.push({ id: quien, text: o.reply, t0: time + d1, t1: time + d1 + this.durFrase(o.reply) });
    }
    if (this.p.onResult) this.p.onResult('good', q, o);
  }

  onAction(a) {
    if (!this.active) return;
    const n = this.active.options.length;
    if (this.p.numbersOnly && (a === 'up' || a === 'down' || a === 'confirm')) return;
    if (a === 'up') this.sel = (this.sel + n - 1) % n;
    else if (a === 'down') this.sel = (this.sel + 1) % n;
    else if (a === 'confirm') this.resolve(this.sel);
    else if (a === 'opt1' && n > 0) this.resolve(0);
    else if (a === 'opt2' && n > 1) this.resolve(1);
    else if (a === 'opt3' && n > 2) this.resolve(2);
  }

  get busy() {
    return !!this.active;
  }

  onPointer(x, y) {
    if (!this.active) return;
    this.optRects.forEach((r, i) => {
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) this.resolve(i);
    });
  }

  // todo flotante (como los "¡RATERO!"): la pregunta sobre el vecino, las opciones sobre el profe,
  // y después la frase elegida y la respuesta, cada una sobre quien la dice
  draw(ctx, time) {
    const g = this.game;
    if (this.active) {
      const q = this.active;
      const total = q.time || 6;
      const left = Math.max(0, q.t + total - time);
      const appear = Math.min(1, (time - q.t) / 0.2);
      // la pregunta, sobre el que habla
      const quien = g.speakerId(q.speaker);
      const mq = FB.measureSpeech(ctx, q.prompt, 16, 440);
      const pq = g.speechSpot(quien, mq);
      FB.drawSpeech(ctx, mq, pq.x, pq.y, FB.speechColor(quien), appear, (time - q.t) * 6);
      // las opciones, sobre el profe (lo que va a decir)
      ctx.save();
      ctx.globalAlpha = appear;
      ctx.font = '17px monospace';
      const W = 400;
      const items = q.options.map((o) => FB.wrapText(ctx, o.text, W - 50));
      const hs = items.map((ls) => ls.length * 19 + 12);
      const tot = hs.reduce((a, b) => a + b, 0) + (items.length - 1) * 6 + 10;
      const spot = g.speechSpot(g.stage.player.id, { w: W, h: tot });
      const x0 = spot.x - W / 2;
      let y = spot.y - tot;
      // cronómetro (barrita arriba de las opciones)
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x0, y - 2, W, 6);
      ctx.fillStyle = left < 2 ? (Math.floor(time * 8) % 2 ? '#ff3030' : '#ff8080') : '#ffd23f';
      ctx.fillRect(x0, y - 2, W * (left / total), 6);
      y += 10;
      this.optRects = [];
      items.forEach((ls, i) => {
        const r = { x: x0, y, w: W, h: hs[i] };
        this.optRects.push(r);
        const on = i === this.sel && !this.p.numbersOnly;
        ctx.fillStyle = on ? 'rgba(60,40,0,0.78)' : 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        FB.roundRect(ctx, r.x, r.y, r.w, r.h, 8);
        ctx.fill();
        ctx.strokeStyle = on ? '#ffd23f' : 'rgba(255,255,255,0.35)';
        ctx.lineWidth = on ? 2.5 : 1.2;
        ctx.stroke();
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffd23f';
        ctx.font = 'bold 14px "Press Start 2P", monospace';
        ctx.fillText(String(i + 1), r.x + 12, r.y + 24);
        ctx.fillStyle = '#ffffff';
        ctx.font = '17px monospace';
        ls.forEach((l, k) => ctx.fillText(l, r.x + 38, r.y + 22 + k * 19));
        y += hs[i] + 6;
      });
      ctx.restore();
    }
    // frases ya elegidas / respuestas
    for (const sp of this.speech) {
      if (time < sp.t0 || time > sp.t1 + 0.25) continue;
      const m = FB.measureSpeech(ctx, sp.text, 16, 440);
      const p = g.speechSpot(sp.id, m);
      const alpha = Math.min(1, (sp.t1 + 0.25 - time) * 4, (time - sp.t0) * 8);
      FB.drawSpeech(ctx, m, p.x, p.y, sp.silent ? '#bbbbbb' : FB.speechColor(sp.id), alpha, (time - sp.t0) * 6);
    }
  }
};
