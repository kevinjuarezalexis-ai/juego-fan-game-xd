// ══════════════════════════════════════
//   Batalla final: caja + escopeta + bloquear + ayuda de los vecinos
// ══════════════════════════════════════
// · Esquivás en la caja de combate (como siempre).
// · En la caja aparecen CARTUCHOS de escopeta: al agarrarlos tenés munición.
// · El Chavo NO tiene vida: se va acercando de a poco. DISPARAR (Z / Espacio) gasta
//   un cartucho y lo aleja. Si llega hasta el profesor, perdés (final malo).
// · Cada tanto el Chavo le tira un ataque al profesor (anillo rojo que se cierra):
//   BLOQUEAR (X / Shift) justo cuando el anillo llega al círculo; si no, perdés vida.
// · Los vecinos ayudan dentro de la caja:
//     taza de café (Doña Florinda)  → cura
//     pelota de Quico               → rebota por la caja y rompe los proyectiles del Chavo
//     paleta (la Chilindrina)       → cura un poquito y te da velocidad un rato
// · Se gana aguantando hasta el evento 'defeatBoss' (lo marca la canción).
// params:
//   boss, patterns (ataques en la caja), boxDamage, box
//   approach   cuánto se acerca por segundo (0..1 del camino)   push   cuánto lo aleja cada disparo
//   startX / nearX   dónde arranca el Chavo y dónde "te alcanza"
//   blockAt    [segundos] ataques al profesor que hay que bloquear (pocos y marcados)
//   attackEvery / warnBeats / damage   (sin blockAt: un ataque cada tantos beats)
//   blockSprite  imagen opcional del ataque que tira el Chavo (si no, una bola roja)
//   ammoEvery, ammoStart, ammoMax      cartuchos
//   cafeEvery, pelotaEvery, paletaEvery  (beats; 0 = no sale)

FB.MECHANICS.finalfight = class FinalFight extends FB.Mechanic {
  constructor(game, p, t0, t1) {
    super(game, p, t0, t1);
    this.boss = p.boss || 'chavo';
    this.box = new FB.MECHANICS.bulletbox(game, { damage: p.boxDamage || 10, patterns: p.patterns || [], box: p.box }, t0, t1);
    this.close = p.closeStart ?? 0; // 0 = lejos · 1 = te alcanzó
    this.maxClose = this.close;
    this.ammo = p.ammoStart ?? 2;
    this.items = []; // cartuchos, café, paletas, pelota amiga
    this.attacks = [];
    this.blockWindow = p.blockWindow || 0.22;
    this.blockQueue = (p.blockAt || []).filter((t) => t > t0 + 0.5).sort((a, b) => a - b);
    this.blockLock = 0;
    this.blockPose = 0;
    this.shootCd = 0;
    this.tracer = 0;
    this.speedT = 0; // velocidad extra (paleta)
    this.popups = [];
    this.defeated = false;
    this.lost = false;
    this.ringR = 46;
    this.flashAmmo = 0;
    this.baseSpeed = this.box.speed;
  }

  get busy() {
    return true;
  }

  // ── ritmo: ataques, cartuchos y ayudas salen con los beats ──
  onBeat(b, time) {
    if (this.defeated || this.lost) return;
    this.box.onBeat(b, time);
    if (time > this.t1 - 1.5 || time < this.t0 + 1) return;
    const P = this.p;
    const every = (n, off = 0) => n > 0 && (((b - off) % n) + n) % n === 0;
    // ataque al profesor (bloquear)
    if (!P.blockAt && every(P.attackEvery || 6, 3)) {
      const warn = P.warnBeats || 2;
      this.attacks.push({ warnStart: time, hitAt: this.cond.timeOfBeat(b + warn), done: false });
    }
    if (every(P.ammoEvery ?? 4, 1)) this.spawn('cartucho');
    if (every(P.cafeEvery ?? 16, 6)) this.spawn('cafe');
    if (every(P.paletaEvery ?? 24, 14)) this.spawn('paleta');
    if (every(P.pelotaEvery ?? 20, 10)) this.spawn('pelota');
  }

  spawn(kind) {
    const B = this.box.box;
    const S = this.box.soul;
    const t = this.cond.time;
    if (kind === 'cartucho') {
      if (this.items.filter((i) => i.kind === 'cartucho').length >= 2) return;
      // aparece en un lugar libre, lejos del corazón, y dura unos segundos
      let x, y, tries = 0;
      do {
        x = FB.rand(B.x + 22, B.x + B.w - 22);
        y = FB.rand(B.y + 22, B.y + B.h - 22);
      } while (Math.hypot(x - S.x, y - S.y) < 70 && ++tries < 10);
      this.items.push({ kind, x, y, r: 13, born: t, life: 4.5 });
    } else if (kind === 'cafe' || kind === 'paleta') {
      this.items.push({ kind, x: FB.rand(B.x + 25, B.x + B.w - 25), y: B.y - 20, r: 15, vy: kind === 'cafe' ? 80 : 105, rot: 0, spin: FB.rand(-3, 3), born: t, life: 9 });
      this.ayuda(kind === 'cafe' ? 'florinda' : 'chilindrina');
    } else if (kind === 'pelota') {
      const left = Math.random() < 0.5;
      this.items.push({
        kind, r: 16, born: t, life: 12, rot: 0, bounces: 0,
        x: left ? B.x - 16 : B.x + B.w + 16,
        y: B.y + FB.rand(15, B.h * 0.4),
        vx: (left ? 1 : -1) * FB.rand(150, 200),
        vy: FB.rand(-60, 20),
      });
      this.ayuda('quico');
    }
  }

  // el vecino que ayuda parpadea (se nota que te tira algo)
  ayuda(id) {
    const st = this.game.stage;
    if (st.actorOf(id)) {
      st.flashSprite(id, 0.3, 3);
      st.hop && st.hop(id);
    }
  }

  onAction(a) {
    if (this.defeated || this.lost) return;
    const time = this.cond.time;
    if (a === 'block') {
      if (this.blockLock > 0) return;
      this.blockPose = 0.25;
      this.game.stage.pose('jirafales', 'bloquear', 0.3);
      const atk = this.attacks.find((k) => !k.done && Math.abs(k.hitAt - time) <= this.blockWindow);
      if (atk) {
        atk.done = true;
        this.game.stats.blocks++;
        if (FB.SFX) FB.SFX.play('bloqueo');
        this.close = Math.max(0, this.close - 0.03); // bloquear bien lo frena un poquito
        this.popup('¡BLOQUEADO!', '#7dd8ff');
        const pp = this.game.stage.posOf('jirafales');
        Engine2D.Particles.sparks(pp.x + 70, pp.y, { amount: 18, colors: ['#bfe9ff', '#ffffff'] });
        this.game.stage.shake(4, 0.12);
      } else {
        this.blockLock = 0.35; // bloquear al aire: castigo corto (anti-spam)
      }
    } else if (a === 'confirm') {
      if (this.shootCd > 0) return;
      if (this.ammo <= 0) {
        this.shootCd = 0.25;
        this.flashAmmo = 0.5;
        this.popup('¡SIN BALAS!', '#ff8080');
        if (FB.SFX) FB.SFX.play('falla');
        return;
      }
      this.ammo--;
      this.shootCd = 0.4;
      this.tracer = 0.12;
      this.game.stage.pose('jirafales', 'disparar', 0.35);
      this.game.stage.shake(7, 0.15);
      this.game.stage.flash(0.06);
      if (FB.SFX) FB.SFX.play('disparo');
      this.close = Math.max(0, this.close - (this.p.push ?? 0.16));
      this.game.stage.hit(this.boss);
      this.game.stage.pose(this.boss, 'dano', 0.4);
      this.popup('¡ATRÁS!', '#ffd23f', true);
      const bp = this.game.stage.posOf(this.boss);
      Engine2D.Particles.burst(bp.x, bp.y, { amount: 14, colors: ['#ff2020', '#600000'], speed: 220 });
    }
  }

  // lo llama el evento 'defeatBoss' (el momento lo marca la canción)
  defeat() {
    if (this.lost) return;
    this.defeated = true;
    this.attacks = [];
    this.box.bullets = [];
    this.items = [];
    this.game.stats.bossDefeated = true;
    this.game.stats.maxClose = this.maxClose;
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
    const P = this.p;
    this.blockLock = Math.max(0, this.blockLock - dt);
    this.blockPose = Math.max(0, this.blockPose - dt);
    this.shootCd = Math.max(0, this.shootCd - dt);
    this.tracer = Math.max(0, this.tracer - dt);
    this.flashAmmo = Math.max(0, this.flashAmmo - dt);
    this.speedT = Math.max(0, this.speedT - dt);

    if (this.p.patterns && this.box.p.patterns !== this.p.patterns) this.box.p.patterns = this.p.patterns; // evento 'mech'
    // ataques marcados (blockAt): salen unos beats antes para que se vea venir
    if (!this.defeated && !this.lost && this.blockQueue.length) {
      const warn = (P.warnBeats || 3) * this.cond.crochet;
      while (this.blockQueue.length && time >= this.blockQueue[0] - warn) {
        const at = this.blockQueue.shift();
        // cae justo en un beat (el más cercano al segundo marcado)
        const hitAt = this.cond.timeOfBeat(Math.round(this.cond.beatAt(at)));
        if (hitAt > time + 0.3) this.attacks.push({ warnStart: time, hitAt, done: false });
      }
    }
    if (!this.defeated && !this.lost) {
      this.box.speed = this.baseSpeed * (this.speedT > 0 ? 1.5 : 1);
      this.box.update(dt, time);
      // el Chavo se acerca solo (empieza a moverse cuando arranca la pelea)
      if (time > this.t0 + 1) this.close = Math.min(1, this.close + (P.approach ?? 0.028) * dt);
      this.maxClose = Math.max(this.maxClose, this.close);
      if (this.close >= 1) return this.alcanzado();
      // ataques al profesor que no se bloquearon
      for (const k of this.attacks) {
        if (!k.done && time > k.hitAt + this.blockWindow) {
          k.done = true;
          this.game.hurt(P.damage || 12);
          this.game.stage.shake(12, 0.25);
        }
      }
      this.attacks = this.attacks.filter((k) => !k.done);
      this.updateItems(dt, time);
    }
    // posición del Chavo en el escenario según qué tan cerca está
    const a = this.game.stage.actorOf(this.boss);
    if (a) {
      const x0 = P.startX ?? 960;
      const x1 = P.nearX ?? 560;
      const want = x0 + (x1 - x0) * this.close;
      a.x += (want - a.x) * Math.min(1, dt * 6);
    }
    for (const p of this.popups) {
      p.t -= dt;
      p.y -= dt * 40;
    }
    this.popups = this.popups.filter((p) => p.t > 0);
  }

  updateItems(dt, time) {
    const B = this.box.box;
    const S = this.box.soul;
    for (const it of this.items) {
      if (time > it.born + it.life) it.dead = true;
      if (it.kind === 'cafe' || it.kind === 'paleta') {
        it.y += it.vy * dt;
        it.rot += it.spin * dt;
        if (it.y > B.y + B.h + 30) it.dead = true;
      } else if (it.kind === 'pelota') {
        // rebota como la de Quico, pero de nuestro lado: rompe proyectiles
        it.vy += 650 * dt;
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        it.rot += (it.vx / it.r) * dt;
        if (it.y + it.r > B.y + B.h) {
          it.y = B.y + B.h - it.r;
          it.vy = -Math.max(330, Math.abs(it.vy) * 0.88);
        }
        if (it.x < B.x - 60 || it.x > B.x + B.w + 60) it.dead = true;
        for (const b of this.box.bullets) {
          if (b.dead || !ROMPIBLE[b.kind]) continue;
          const bx = b.x + (b.w ? b.w / 2 : 0);
          const by = b.y + (b.h ? b.h / 2 : 0);
          const br = b.r || Math.max(b.w || 0, b.h || 0) / 2 || 10;
          if (Math.hypot(bx - it.x, by - it.y) < br + it.r) {
            b.dead = true;
            Engine2D.Particles.sparks(bx, by, { amount: 8, colors: ['#ffd23a', '#3d8de0', '#ffffff'] });
          }
        }
        continue; // la pelota no se agarra
      }
      // agarrar con el corazón
      if (!it.dead && Math.hypot(S.x - it.x, S.y - it.y) < S.r + it.r) {
        it.dead = true;
        this.agarrar(it);
      }
    }
    this.items = this.items.filter((i) => !i.dead);
  }

  agarrar(it) {
    const P = this.p;
    const S = this.box.soul;
    if (it.kind === 'cartucho') {
      const max = P.ammoMax ?? 5;
      if (this.ammo < max) this.ammo++;
      if (FB.SFX) FB.SFX.play('bien', { vol: 0.6 });
      Engine2D.Particles.sparks(S.x, S.y, { amount: 10, colors: ['#ffd23a', '#c0392b'] });
    } else if (it.kind === 'cafe') {
      this.game.heal(P.cafeHeal ?? 10);
      if (FB.SFX) FB.SFX.play('liberar', { vol: 0.5 });
      Engine2D.Particles.sparks(S.x, S.y, { amount: 12, colors: ['#7dff9a', '#ffffff'] });
    } else if (it.kind === 'paleta') {
      this.game.heal(P.paletaHeal ?? 4);
      this.speedT = P.paletaTime ?? 4;
      if (FB.SFX) FB.SFX.play('liberar', { vol: 0.5 });
      Engine2D.Particles.sparks(S.x, S.y, { amount: 12, colors: ['#ff5fa8', '#ffffff'] });
    }
  }

  // el Chavo llegó hasta el profesor → final malo
  alcanzado() {
    if (this.lost) return;
    this.lost = true;
    this.attacks = [];
    this.game.stats.maxClose = 1;
    this.game.stage.flash(0.7, '#ff1a1a', 0.95);
    this.game.stage.shake(18, 0.9);
    if (this.game.badEnding) this.game.badEnding('alcanzado');
  }

  draw(ctx, time) {
    const f = this.fade(time, 0.5, 0.5);
    if (!this.defeated) this.box.draw(ctx, time);
    const B = this.box.box;
    const pp = this.game.stage.posOf('jirafales');
    const bp = this.game.stage.posOf(this.boss);
    ctx.save();
    ctx.globalAlpha = f;

    // objetos dentro de la caja
    if (!this.defeated && this.box.fade(time) >= 1) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(B.x, B.y, B.w, B.h);
      ctx.clip();
      for (const it of this.items) this.drawItem(ctx, it, time);
      ctx.restore();
    }

    // qué tan cerca está: barra arriba de la caja (profesor ← → Chavo)
    if (!this.defeated) {
      const w = 300;
      const x = this.game.W / 2 - w / 2;
      const y = Math.max(10, B.y - 26);
      const danger = this.close;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(x - 4, y - 4, w + 8, 18);
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, '#ff2020');
      g.addColorStop(0.5, '#ff9a20');
      g.addColorStop(1, '#3fbf3f');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, 10);
      // marcador del Chavo: va de la derecha (lejos) a la izquierda (te alcanzó)
      const mx = x + w * (1 - danger);
      ctx.fillStyle = danger > 0.75 && Math.floor(time * 8) % 2 ? '#ffffff' : '#1a0000';
      ctx.fillRect(mx - 3, y - 4, 6, 18);
      ctx.fillStyle = '#fff';
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.textAlign = 'right';
      ctx.fillText('PROF', x - 10, y + 9);
      ctx.textAlign = 'left';
      ctx.fillText('CHAVO', x + w + 10, y + 9);
    }

    // munición: cartuchos al costado de la caja
    if (!this.defeated) {
      const max = this.p.ammoMax ?? 5;
      const x0 = B.x + B.w + 18;
      ctx.textAlign = 'left';
      ctx.fillStyle = this.flashAmmo > 0 && Math.floor(time * 12) % 2 ? '#ff6060' : '#fff';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText('BALAS', x0, B.y + 12);
      for (let i = 0; i < max; i++) {
        ctx.save();
        ctx.translate(x0 + 10 + (i % 3) * 22, B.y + 34 + Math.floor(i / 3) * 34);
        ctx.globalAlpha = f * (i < this.ammo ? 1 : 0.22);
        drawShell(ctx, 1);
        ctx.restore();
      }
      if (this.speedT > 0) {
        ctx.fillStyle = '#ff9fd8';
        ctx.fillText('¡RÁPIDO!', x0, B.y + B.h - 6);
      }
    }

    // el ataque que tira el Chavo: vuela en arco hasta el profesor y llega justo al bloquear
    for (const k of this.attacks) {
      const u = Math.max(0, Math.min(1, (time - k.warnStart) / (k.hitAt - k.warnStart)));
      const x = bp.x + (pp.x + 60 - bp.x) * u;
      const y = bp.y - 40 + (pp.y - bp.y + 40) * u - Math.sin(u * Math.PI) * 140;
      const img = this.p.blockSprite && this.game.img(this.p.blockSprite);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(time * 9);
      if (img) ctx.drawImage(img, -40, -40, 80, 80);
      else {
        const r = 16 + u * 12;
        ctx.fillStyle = 'rgba(255,0,0,0.25)';
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#7a0000';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff3a3a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.65, 0.4, 4.6);
        ctx.stroke();
      }
      ctx.restore();
    }
    // avisos de ataque al profesor: anillo que se cierra
    ctx.textAlign = 'center';
    for (const k of this.attacks) {
      const total = k.hitAt - k.warnStart;
      const left = k.hitAt - time;
      const r = this.ringR + Math.max(0, left / total) * 150;
      ctx.strokeStyle = 'rgba(255,40,40,0.9)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ff3030';
      ctx.font = 'bold 34px "Press Start 2P", monospace';
      ctx.fillText('!', pp.x, pp.top - 30);
    }
    if (this.attacks.length) {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, this.ringR, 0, Math.PI * 2);
      ctx.stroke();
    }
    // escudo al bloquear (del lado del Chavo)
    const dir = bp.x >= pp.x ? 1 : -1;
    if (this.blockPose > 0) {
      ctx.strokeStyle = this.blockLock > 0 ? 'rgba(150,150,150,0.7)' : 'rgba(140,220,255,0.95)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      if (dir > 0) ctx.arc(pp.x - 20, pp.y, 110, -Math.PI * 0.3, Math.PI * 0.3);
      else ctx.arc(pp.x + 20, pp.y, 110, Math.PI * 0.7, Math.PI * 1.3);
      ctx.stroke();
    }
    // disparo
    if (this.tracer > 0) {
      const jd = FB.CHARACTERS.jirafales;
      const mz = jd.muzzle || { x: -0.3, y: 0.6 };
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
    if (!this.defeated) {
      ctx.globalAlpha = f * 0.8;
      ctx.fillStyle = '#fff';
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.fillText('flechas: esquivar y juntar balas · Z disparar · X bloquear', this.game.W / 2, 672);
    }
    ctx.restore();
  }

  drawItem(ctx, it, time) {
    // los que están por desaparecer titilan
    const left = it.born + it.life - time;
    if (left < 1.2 && Math.floor(time * 10) % 2) return;
    ctx.save();
    ctx.translate(it.x, it.y);
    if (it.kind === 'cartucho') {
      const s = 1 + 0.12 * Math.sin(time * 8);
      halo(ctx, 17, 'rgba(255,210,58,0.3)');
      ctx.rotate(-0.5);
      drawShell(ctx, 1.25 * s);
    } else if (it.kind === 'cafe') {
      halo(ctx, 22, 'rgba(125,255,154,0.28)');
      ctx.rotate(it.rot * 0.3);
      FB.drawCup(ctx, 34);
    } else if (it.kind === 'paleta') {
      halo(ctx, 22, 'rgba(255,159,216,0.3)');
      ctx.rotate(it.rot);
      drawLollipop(ctx, 15);
    } else if (it.kind === 'pelota') {
      // aura verde: es amiga (rompe proyectiles)
      ctx.strokeStyle = 'rgba(125,255,154,0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, it.r + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      FB.drawBeachBall(ctx, it.x, it.y, it.r, it.rot);
      return;
    }
    ctx.restore();
  }
};

// proyectiles que la pelota de Quico puede romper
const ROMPIBLE = { ball: 1, rect: 1, orb: 1, tear: 1, drop: 1, cup: 1, heartb: 1, hand: 1 };

// brillo barato (círculo transparente) en vez de shadowBlur, que es muy pesado en celu
function halo(ctx, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
}

// cartucho de escopeta (rojo con base dorada), centrado
function drawShell(ctx, s) {
  ctx.save();
  ctx.scale(s, s);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = '#1e1d22';
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  FB.roundRect(ctx, -5, -11, 10, 15, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e8b33a';
  ctx.beginPath();
  FB.roundRect(ctx, -6, 3, 12, 7, 1.5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(-3, -9, 2, 11);
  ctx.restore();
}

// paleta de remolino (como la de la Chilindrina)
function drawLollipop(ctx, r) {
  ctx.save();
  ctx.strokeStyle = '#f2efe6';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, r * 0.6);
  ctx.lineTo(0, r * 2.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#ff4f8b';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 5; a += 0.2) {
    const rr = (a / (Math.PI * 5)) * r * 0.9;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (a === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = '#1e1d22';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
