// ══════════════════════════════════════
//   Pelea final: bloquear / disparar
// ══════════════════════════════════════
// El jefe avisa cada ataque con un anillo que se cierra sobre Jirafales:
// apretá BLOQUEAR (X / Shift) justo cuando el anillo llega al círculo.
// Bloquear bien lo deja ATURDIDO un par de beats: ahí DISPARAR (Z / Espacio)
// hace daño crítico. Disparar sin aturdirlo hace poquito daño.
// params:
//   boss, bossName, bossHp
//   attackEvery   beats entre ataques (fase 1; baja en fases 2 y 3)
//   warnBeats     beats de aviso antes del golpe
//   damage        daño si no bloqueás
//   shootDamage   daño base del disparo
//   stunBeats     beats que queda aturdido tras un bloqueo perfecto
//   minHpUntil    segundo antes del cual el jefe no puede morir (se derrota con el evento 'defeatBoss')

FB.MECHANICS.blockshoot = class BlockShoot extends FB.Mechanic {
  constructor(game, p, t0, t1) {
    super(game, p, t0, t1);
    this.boss = p.boss || 'chavo';
    this.maxHp = p.bossHp || 100;
    this.hp = this.maxHp;
    this.attacks = [];
    this.stunUntil = -1;
    this.blockWindow = p.blockWindow || 0.16;
    this.blockLock = 0; // castigo por bloquear al aire (anti-spam)
    this.blockPose = 0;
    this.shootCd = 0;
    this.tracer = 0;
    this.popups = [];
    this.defeated = false;
    this.ringR = 46;
  }

  get phase() {
    const f = this.hp / this.maxHp;
    return f > 0.6 ? 1 : f > 0.3 ? 2 : 3;
  }

  onBeat(b, time) {
    if (this.defeated || time > this.t1 - 1.5 || time < this.t0 + 1) return;
    const base = this.p.attackEvery || 4;
    const every = Math.max(1, base - (this.phase - 1));
    if (b % every !== 0) return;
    const warn = this.p.warnBeats || 2;
    const c = this.cond;
    this.attacks.push({ warnStart: time, hitAt: c.timeOfBeat(b + warn), done: false });
    // fase 3: a veces doble golpe
    if (this.phase === 3 && Math.random() < 0.4) {
      this.attacks.push({ warnStart: time, hitAt: c.timeOfBeat(b + warn + 1), done: false });
    }
  }

  onAction(a) {
    const time = this.cond.time;
    if (a === 'block') {
      if (this.blockLock > 0) return;
      this.blockPose = 0.25;
      this.game.stage.pose('jirafales', 'bloquear', 0.3);
      const atk = this.attacks.find((k) => !k.done && Math.abs(k.hitAt - time) <= this.blockWindow);
      if (atk) {
        atk.done = true;
        this.game.stats.blocks++;
        this.stunUntil = time + (this.p.stunBeats || 2) * this.cond.crochet;
        this.popup('¡BLOQUEADO!', '#7dd8ff');
        const pp = this.game.stage.posOf('jirafales');
        Engine2D.Particles.sparks(pp.x + 70 * (this.game.stage.posOf(this.boss).x >= pp.x ? 1 : -1), pp.y, { amount: 18, colors: ['#bfe9ff', '#ffffff'] });
        this.game.stage.shake(4, 0.12);
      } else {
        this.blockLock = 0.35;
      }
    } else if (a === 'confirm') {
      if (this.shootCd > 0 || this.defeated) return;
      this.shootCd = 0.45;
      this.tracer = 0.12;
      this.game.stage.pose('jirafales', 'disparar', 0.35);
      this.game.stage.shake(7, 0.15);
      this.game.stage.flash(0.06);
      const stunned = time < this.stunUntil;
      const dmg = (this.p.shootDamage || 7) * (stunned ? 2 : 0.35);
      // minHpUntil: antes de ese segundo el jefe no puede caer (la canción manda)
      const floor = this.p.minHpUntil && time < this.p.minHpUntil ? this.maxHp * 0.04 : 0;
      this.hp = Math.max(floor, this.hp - dmg);
      this.game.stage.hit(this.boss);
      if (stunned) this.game.stage.pose(this.boss, 'dano', 0.4); // sprite de recibir daño
      this.popup(stunned ? '¡CRÍTICO!' : 'lo esquiva...', stunned ? '#ffd23f' : '#aaaaaa', true);
      const bp = this.game.stage.posOf(this.boss);
      Engine2D.Particles.burst(bp.x, bp.y, { amount: stunned ? 20 : 6, colors: ['#ff2020', '#600000'], speed: 220 });
      if (this.hp <= 0) this.defeat();
    }
  }

  defeat() {
    this.defeated = true;
    this.attacks = [];
    this.game.stats.bossDefeated = true;
    this.game.stage.setState(this.boss, 'derrotado');
    this.game.stage.flash(0.8);
    this.game.stage.shake(16, 0.8);
    this.popup('¡LO DERROTASTE!', '#ffffff', true);
  }

  popup(text, color, onBoss) {
    const p = this.game.stage.posOf(onBoss ? this.boss : 'jirafales');
    this.popups.push({ text, color, x: p.x, y: p.top - 20, t: 0.9 });
  }

  update(dt, time) {
    this.blockLock = Math.max(0, this.blockLock - dt);
    this.blockPose = Math.max(0, this.blockPose - dt);
    this.shootCd = Math.max(0, this.shootCd - dt);
    this.tracer = Math.max(0, this.tracer - dt);
    for (const k of this.attacks) {
      if (!k.done && time > k.hitAt + this.blockWindow) {
        k.done = true;
        this.game.hurt(this.p.damage || 14);
        this.game.stage.shake(12, 0.25);
      }
    }
    this.attacks = this.attacks.filter((k) => !k.done);
    for (const p of this.popups) {
      p.t -= dt;
      p.y -= dt * 40;
    }
    this.popups = this.popups.filter((p) => p.t > 0);
  }

  draw(ctx, time) {
    const f = this.fade(time, 0.5, 0.5);
    const pp = this.game.stage.posOf('jirafales');
    const bp = this.game.stage.posOf(this.boss);
    ctx.save();
    ctx.globalAlpha = f;

    // barra de vida del jefe
    const bw = 520;
    const bx = this.game.W / 2 - bw / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(bx - 4, 64, bw + 8, 26);
    ctx.fillStyle = '#3a0000';
    ctx.fillRect(bx, 68, bw, 18);
    ctx.fillStyle = this.phase === 3 ? '#ff2020' : this.phase === 2 ? '#d02a2a' : '#a01818';
    ctx.fillRect(bx, 68, (bw * this.hp) / this.maxHp, 18);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.p.bossName || 'Jefe', this.game.W / 2, 58);

    // jefe aturdido
    if (time < this.stunUntil) {
      ctx.fillStyle = '#ffd23f';
      ctx.font = 'bold 14px "Press Start 2P", monospace';
      ctx.fillText('ATURDIDO', bp.x, bp.top - 40 + Math.sin(time * 12) * 4);
      ctx.strokeStyle = 'rgba(255,210,63,0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(bp.x, bp.top - 10, 40, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // avisos de ataque: anillo que se cierra
    const cx = pp.x;
    const cy = pp.y;
    for (const k of this.attacks) {
      const total = k.hitAt - k.warnStart;
      const left = k.hitAt - time;
      const r = this.ringR + Math.max(0, left / total) * 150;
      ctx.strokeStyle = 'rgba(255,40,40,0.9)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ff3030';
      ctx.font = 'bold 34px "Press Start 2P", monospace';
      ctx.fillText('!', cx, pp.top - 30);
    }
    if (this.attacks.length) {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, this.ringR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // hacia dónde mira Jirafales (el jefe puede estar a cualquier lado)
    const dir = bp.x >= pp.x ? 1 : -1;
    // escudo al bloquear (del lado del jefe)
    if (this.blockPose > 0) {
      ctx.strokeStyle = this.blockLock > 0 ? 'rgba(150,150,150,0.7)' : 'rgba(140,220,255,0.95)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      if (dir > 0) ctx.arc(cx - 20, cy, 110, -Math.PI * 0.3, Math.PI * 0.3);
      else ctx.arc(cx + 20, cy, 110, Math.PI * 0.7, Math.PI * 1.3);
      ctx.stroke();
    }

    // disparo (sale de la punta de la escopeta)
    if (this.tracer > 0) {
      const jd = FB.CHARACTERS.jirafales;
      const mz = jd.muzzle || { x: -0.3, y: 0.6 };
      // muzzle.x está medido con el dibujo mirando a la izquierda: se espeja si mira al jefe a la derecha
      const mx = pp.x + Math.abs(mz.x) * jd.height * dir;
      const my = this.game.stage.floorY - mz.y * jd.height;
      ctx.strokeStyle = 'rgba(255,230,140,' + this.tracer * 8 + ')';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(bp.x - 20 * dir, bp.y);
      ctx.stroke();
      ctx.fillStyle = '#fff3b0';
      ctx.beginPath();
      ctx.arc(mx, my, 18 * this.tracer * 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // popups
    for (const p of this.popups) {
      ctx.globalAlpha = f * Math.min(1, p.t * 3);
      ctx.fillStyle = p.color;
      ctx.font = 'bold 16px "Press Start 2P", monospace';
      ctx.fillText(p.text, p.x, p.y);
    }

    // ayuda de controles
    ctx.globalAlpha = f * 0.8;
    ctx.fillStyle = '#fff';
    ctx.font = '13px "Press Start 2P", monospace';
    ctx.fillText('X bloquear · Z disparar', this.game.W / 2, 640);
    ctx.restore();
  }
};
