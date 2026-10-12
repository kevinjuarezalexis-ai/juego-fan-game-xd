// ══════════════════════════════════════
//   Diálogo con 3 opciones + cronómetro
// ══════════════════════════════════════
// La música no se frena: si no elegís a tiempo, cuenta como respuesta mala.
// Controles: 1/2/3 directo, o ↑↓ + Z/Enter, o click/toque.
// params:
//   questions: [{ t, time, speaker, prompt, options: [{ text, ok, reply }] }]
//     ok: true (cura) | false (daña) | 'neutral' (nada)
//   healOk, wrongDamage, timeoutDamage
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
    this.feedback = null; // { speaker, text, color, until }
    this.panel = { x: p.panelX ?? 150, y: p.panelY ?? 14, w: 780, h: 250 }; // arriba a la izquierda: no tapa a Jirafales
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
          this.feedback = null;
        }
      }
    }
    if (this.active && time >= this.active.t + (this.active.time || 6)) {
      this.resolve(-1);
    }
    if (this.feedback && time > this.feedback.until) this.feedback = null;
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
    if (i < 0) {
      this.game.hurt(this.p.timeoutDamage || 12);
      this.game.stats.answersBad++;
      this.feedback = { speaker: '', text: '...se acabó el tiempo.', color: '#ff6060', until: time + 1.8 };
      if (this.p.onResult) this.p.onResult('timeout', q, null);
      return;
    }
    const o = q.options[i];
    if (o.ok === true) {
      this.game.heal(this.p.healOk || 6);
      this.game.stats.answersGood++;
    } else if (o.ok === false) {
      this.game.hurt(this.p.wrongDamage || 10);
      this.game.stats.answersBad++;
    }
    const color = o.ok === true ? '#7dff9a' : o.ok === false ? '#ff6060' : '#dddddd';
    const who = q.speaker === 'Prof. Jirafales' ? '' : q.speaker;
    this.feedback = { speaker: who, text: o.reply || '...', color, until: time + (this.p.replyTime ?? 2.2) };
    if (this.p.onResult) this.p.onResult(o.ok === true ? 'good' : o.ok === false ? 'bad' : 'neutral', q, o);
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

  // franja de arriba: la pregunta en una línea y las 3 opciones lado a lado
  // (para usar junto con la caja de combate, que baja un poco).
  drawStrip(ctx, time) {
    const W = this.game.W;
    const x = 40;
    const w = W - 80;
    const y = this.p.stripY ?? 8;
    const h = 88;
    if (this.active) {
      const q = this.active;
      const total = q.time || 6;
      const left = Math.max(0, q.t + total - time);
      const appear = Math.min(1, (time - q.t) / 0.2);
      ctx.save();
      ctx.globalAlpha = appear;
      ctx.fillStyle = 'rgba(8,8,12,0.92)';
      ctx.beginPath();
      FB.roundRect(ctx, x, y, w, h, 10);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = left < 2 ? (Math.floor(time * 8) % 2 ? '#ff3030' : '#ff8080') : '#ffd23f';
      ctx.fillRect(x + 10, y + 6, (w - 20) * (left / total), 4);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffd23f';
      ctx.font = 'bold 12px "Press Start 2P", monospace';
      const who = q.speaker ? q.speaker + ': ' : '';
      ctx.fillText(who, x + 14, y + 30);
      const ww = ctx.measureText(who).width;
      ctx.fillStyle = '#fff';
      ctx.font = '19px monospace';
      ctx.fillText(q.prompt, x + 14 + ww, y + 31);
      this.optRects = [];
      const n = q.options.length;
      const cw = (w - 20 - (n - 1) * 8) / n;
      q.options.forEach((o, i) => {
        const r = { x: x + 10 + i * (cw + 8), y: y + 42, w: cw, h: 38 };
        this.optRects.push(r);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = 'rgba(255,210,63,0.6)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = '#ffd23f';
        ctx.font = 'bold 14px "Press Start 2P", monospace';
        ctx.fillText(String(i + 1), r.x + 10, r.y + 26);
        ctx.fillStyle = '#eee';
        ctx.font = '16px monospace';
        const lines = FB.wrapText(ctx, o.text, r.w - 44);
        lines.slice(0, 2).forEach((l, k) => ctx.fillText(l, r.x + 34, r.y + (lines.length > 1 ? 16 + k * 17 : 25)));
      });
      ctx.restore();
    } else if (this.feedback) {
      const fb = this.feedback;
      ctx.save();
      ctx.globalAlpha = Math.min(1, (fb.until - time) * 3);
      ctx.fillStyle = 'rgba(8,8,12,0.85)';
      ctx.beginPath();
      FB.roundRect(ctx, W / 2 - 360, y + 14, 720, 56, 10);
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = fb.color;
      ctx.font = 'italic 20px monospace';
      ctx.fillText((fb.speaker ? fb.speaker + ': ' : '') + fb.text, W / 2, y + 49);
      ctx.restore();
    }
  }

  get busy() {
    return !!(this.active || this.feedback);
  }

  onPointer(x, y) {
    if (!this.active) return;
    this.optRects.forEach((r, i) => {
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) this.resolve(i);
    });
  }

  draw(ctx, time) {
    if (this.p.layout === 'strip') return this.drawStrip(ctx, time);
    const P = this.panel;
    if (this.active) {
      const q = this.active;
      const total = q.time || 6;
      const left = Math.max(0, q.t + total - time);
      const appear = Math.min(1, (time - q.t) / 0.25);
      ctx.save();
      ctx.globalAlpha = appear;
      ctx.translate(0, -(1 - appear) * 30);
      // panel
      ctx.fillStyle = 'rgba(8,8,12,0.92)';
      ctx.beginPath();
      FB.roundRect(ctx, P.x, P.y, P.w, P.h, 12);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();
      // cronómetro
      const frac = left / total;
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(P.x + 16, P.y + 12, P.w - 32, 8);
      ctx.fillStyle = left < 2 ? (Math.floor(time * 8) % 2 ? '#ff3030' : '#ff8080') : '#ffd23f';
      ctx.fillRect(P.x + 16, P.y + 12, (P.w - 32) * frac, 8);
      // quien habla + pregunta
      ctx.textAlign = 'left';
      let ty = P.y + 46;
      if (q.speaker) {
        ctx.fillStyle = '#ffd23f';
        ctx.font = 'bold 15px "Press Start 2P", monospace';
        ctx.fillText(q.speaker, P.x + 20, ty);
        ty += 26;
      }
      ctx.fillStyle = '#fff';
      ctx.font = '20px monospace';
      for (const line of FB.wrapText(ctx, q.prompt, P.w - 40)) {
        ctx.fillText(line, P.x + 20, ty);
        ty += 24;
      }
      // opciones
      ty += 6;
      this.optRects = [];
      q.options.forEach((o, i) => {
        const r = { x: P.x + 16, y: ty, w: P.w - 32, h: 36 };
        this.optRects.push(r);
        const on = i === this.sel;
        ctx.fillStyle = on ? 'rgba(255,210,63,0.18)' : 'rgba(255,255,255,0.05)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        if (on) {
          ctx.strokeStyle = '#ffd23f';
          ctx.lineWidth = 2;
          ctx.strokeRect(r.x, r.y, r.w, r.h);
          FB.drawHeart(ctx, r.x + 18, r.y + 19, 16, '#ff1e1e');
        }
        ctx.fillStyle = on ? '#ffe680' : '#ddd';
        ctx.font = '18px monospace';
        ctx.fillText(i + 1 + '. ' + o.text, r.x + 36, r.y + 24);
        ty += 41;
      });
      ctx.restore();
    } else if (this.feedback) {
      const fb = this.feedback;
      ctx.save();
      ctx.globalAlpha = Math.min(1, (fb.until - time) * 3);
      ctx.fillStyle = 'rgba(8,8,12,0.85)';
      ctx.beginPath();
      FB.roundRect(ctx, P.x + 90, P.y + 130, P.w - 180, 80, 10);
      ctx.fill();
      ctx.textAlign = 'center';
      if (fb.speaker) {
        ctx.fillStyle = '#ffd23f';
        ctx.font = 'bold 13px "Press Start 2P", monospace';
        ctx.fillText(fb.speaker, P.x + P.w / 2, P.y + 160);
      }
      ctx.fillStyle = fb.color;
      ctx.font = 'italic 20px monospace';
      ctx.fillText(fb.text, P.x + P.w / 2, P.y + (fb.speaker ? 192 : 178));
      ctx.restore();
    }
  }
};
