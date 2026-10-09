// ══════════════════════════════════════
//   Caja de combate estilo Undertale/Deltarune
// ══════════════════════════════════════
// Movés el corazón con flechas/WASD y esquivás. Los ataques salen en los beats.
// params:
//   box: { w, h }        tamaño de la caja
//   speed                velocidad del corazón (px/s)
//   damage               daño por golpe
//   patterns: [{ type, every, offset, from, to, ...opciones }]
//     pelota     pelotas que rebotan (Quico)
//     cachetada  franja que avisa y después pega (dir: 'col' | 'row', warn: beats)
//     lluvia     cosas que caen (count)
//     apuntado   proyectiles que van hacia el corazón (speed)
//     muro       pared que cruza la caja con un hueco (gap, speed)
//     mano       mano gris (pixel art) que cruza la caja en línea recta (warn: beats de aviso, speed, vertical: prob.)
//     lagrimas   lágrimas celestes (pixel art) que caen (count)
//     corte      cortes rojos finos en cualquier ángulo; avisan dónde caen (warnSec, default 2 s; count, len)

// ── pixel art (se dibuja una vez en un canvas chico y se escala sin suavizado) ──
FB.PIXEL = FB.PIXEL || {};
FB.pixelSprite = (key, rows, colors, scale) => {
  if (FB.PIXEL[key]) return FB.PIXEL[key];
  const w = Math.max(...rows.map((r) => r.length));
  const c = document.createElement('canvas');
  c.width = w * scale;
  c.height = rows.length * scale;
  const g = c.getContext('2d');
  rows.forEach((r, y) =>
    [...r].forEach((ch, x) => {
      if (!colors[ch]) return;
      g.fillStyle = colors[ch];
      g.fillRect(x * scale, y * scale, scale, scale);
    }),
  );
  return (FB.PIXEL[key] = c);
};
// mano abierta de cachetada, los dedos apuntan a la derecha
const HAND_ROWS = [
  '...oo...........',
  '..olho..........',
  '..olhho.........',
  'ooolhhhoooooooo.',
  'ollhhhhhllllllho',
  'olhhhhhhooooooo.',
  'olhhhhhhllllllho',
  'olhhhhhhooooooo.',
  'olhhhhhhlllllho.',
  'oshhhhhhoooooo..',
  '.osssssso.......',
  '..oooooo........',
];
const HAND_COLORS = { o: '#2e2e33', h: '#9a9aa2', l: '#c9c9d0', s: '#6c6c75' };
const TEAR_ROWS = ['...o...', '...o...', '..obo..', '..obo..', '.obbbo.', 'obbwbbo', 'obwbbbo', 'obbbbbo', '.obbbo.', '..ooo..'];
const TEAR_COLORS = { o: '#1d6fae', b: '#6cc8ff', w: '#e8f8ff' };

FB.MECHANICS.bulletbox = class BulletBox extends FB.Mechanic {
  constructor(game, p, t0, t1) {
    super(game, p, t0, t1);
    // por defecto arriba al centro, entre las cabezas: así no tapa a nadie
    const bw = (p.box && p.box.w) || 300;
    const bh = (p.box && p.box.h) || 175;
    this.box = { x: game.W / 2 - bw / 2, y: (p.box && p.box.y) || 52, w: bw, h: bh };
    this.soul = { x: this.box.x + bw / 2, y: this.box.y + bh / 2, r: 7 };
    this.speed = p.speed || 250;
    this.damage = p.damage || 10;
    this.bullets = [];
    this.inv = 0;
  }

  onBeat(b, time) {
    if (time > this.t1 - 0.6) return; // nada nuevo justo antes de terminar
    for (const pat of this.p.patterns || []) {
      if (pat.from !== undefined && time < pat.from) continue;
      if (pat.to !== undefined && time > pat.to) continue;
      const every = pat.every || 2;
      if ((((b - (pat.offset || 0)) % every) + every) % every !== 0) continue;
      this.spawn(pat, time);
    }
  }

  spawn(pat, time) {
    const B = this.box;
    const crochet = this.cond.crochet;
    switch (pat.type) {
      case 'pelota': {
        const left = Math.random() < 0.5;
        this.bullets.push({
          kind: 'ball',
          x: left ? B.x - 12 : B.x + B.w + 12,
          y: B.y + FB.rand(15, B.h * 0.45),
          vx: (left ? 1 : -1) * FB.rand(130, 210) * (pat.speedMul || 1),
          vy: FB.rand(-80, 20),
          r: pat.r || 11,
          bounces: 0,
        });
        break;
      }
      case 'cachetada': {
        const dir = pat.dir || (Math.random() < 0.5 ? 'col' : 'row');
        const size = pat.size || 70;
        const warn = (pat.warn || 1) * crochet;
        const r =
          dir === 'col'
            ? { x: FB.rand(B.x, B.x + B.w - size), y: B.y, w: size, h: B.h }
            : { x: B.x, y: FB.rand(B.y, B.y + B.h - size), w: B.w, h: size };
        this.bullets.push({ kind: 'slap', ...r, start: time, hitAt: time + warn, until: time + warn + 0.3 });
        break;
      }
      case 'lluvia': {
        const n = pat.count || 3;
        for (let i = 0; i < n; i++) {
          this.bullets.push({
            kind: 'rect',
            x: FB.rand(B.x, B.x + B.w - 14),
            y: B.y - 20 - i * 30,
            w: 14,
            h: 14,
            vx: 0,
            vy: FB.rand(150, 240) * (pat.speedMul || 1),
            rot: Math.random() * 6,
          });
        }
        break;
      }
      case 'apuntado': {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        if (side === 0) (x = FB.rand(B.x, B.x + B.w)), (y = B.y - 10);
        else if (side === 1) (x = B.x + B.w + 10), (y = FB.rand(B.y, B.y + B.h));
        else if (side === 2) (x = FB.rand(B.x, B.x + B.w)), (y = B.y + B.h + 10);
        else (x = B.x - 10), (y = FB.rand(B.y, B.y + B.h));
        const a = Math.atan2(this.soul.y - y, this.soul.x - x);
        const sp = pat.speed || 210;
        this.bullets.push({ kind: 'orb', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 7 });
        break;
      }
      case 'mano': {
        const img = FB.pixelSprite('mano', HAND_ROWS, HAND_COLORS, 3);
        const vertical = Math.random() < (pat.vertical ?? 0.3);
        const fromStart = Math.random() < 0.5; // izquierda→derecha / arriba→abajo
        const sp = pat.speed || 420;
        const warn = (pat.warn ?? 1) * crochet;
        const hw = img.width;
        const hh = img.height;
        if (!vertical) {
          const y = FB.rand(B.y + 4, B.y + B.h - hh - 4);
          this.bullets.push({
            kind: 'hand', img, vertical, w: hw, h: hh,
            x: fromStart ? B.x - hw - 4 : B.x + B.w + 4, y,
            vx: fromStart ? sp : -sp, vy: 0, go: time + warn,
          });
        } else {
          // girada: el ancho/alto se intercambian
          const x = FB.rand(B.x + 4, B.x + B.w - hh - 4);
          this.bullets.push({
            kind: 'hand', img, vertical, w: hh, h: hw,
            x, y: fromStart ? B.y - hw - 4 : B.y + B.h + 4,
            vx: 0, vy: fromStart ? sp : -sp, go: time + warn,
          });
        }
        break;
      }
      case 'lagrimas': {
        const img = FB.pixelSprite('lagrima', TEAR_ROWS, TEAR_COLORS, 3);
        const n = pat.count || 2;
        for (let i = 0; i < n; i++) {
          this.bullets.push({
            kind: 'tear', img,
            x: FB.rand(B.x + 2, B.x + B.w - img.width - 2),
            y: B.y - img.height - i * 40,
            w: img.width, h: img.height,
            vx: 0, vy: FB.rand(140, 210) * (pat.speedMul || 1),
          });
        }
        break;
      }
      case 'corte': {
        const n = pat.count || 1;
        const warnSec = pat.warnSec ?? 2;
        for (let i = 0; i < n; i++) {
          const len = pat.len || FB.rand(110, 170);
          const cx = FB.rand(B.x + 30, B.x + B.w - 30);
          const cy = FB.rand(B.y + 25, B.y + B.h - 25);
          const a = Math.random() * Math.PI; // cualquier ángulo
          const dx = (Math.cos(a) * len) / 2;
          const dy = (Math.sin(a) * len) / 2;
          this.bullets.push({
            kind: 'cut', x1: cx - dx, y1: cy - dy, x2: cx + dx, y2: cy + dy,
            th: pat.thick || 6, start: time, hitAt: time + warnSec, until: time + warnSec + 0.28,
          });
        }
        break;
      }
      case 'muro': {
        const gap = pat.gap || 70;
        const gy = FB.rand(B.y + 10, B.y + B.h - gap - 10);
        const left = Math.random() < 0.5;
        this.bullets.push({
          kind: 'wall',
          x: left ? B.x - 20 : B.x + B.w + 4,
          w: 16,
          vx: (left ? 1 : -1) * (pat.speed || 220),
          gapY: gy,
          gap,
        });
        break;
      }
    }
  }

  update(dt, time) {
    const B = this.box;
    const S = this.soul;
    const k = this.game.input.state;
    let mx = (k.right ? 1 : 0) - (k.left ? 1 : 0);
    let my = (k.down ? 1 : 0) - (k.up ? 1 : 0);
    if (mx && my) (mx *= 0.7071), (my *= 0.7071);
    S.x = Math.max(B.x + S.r, Math.min(B.x + B.w - S.r, S.x + mx * this.speed * dt));
    S.y = Math.max(B.y + S.r, Math.min(B.y + B.h - S.r, S.y + my * this.speed * dt));
    this.inv = Math.max(0, this.inv - dt);

    for (const b of this.bullets) {
      if (b.kind === 'ball') {
        b.vy += 650 * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.y + b.r > B.y + B.h) {
          b.y = B.y + B.h - b.r;
          b.vy = -Math.max(300, Math.abs(b.vy) * 0.85);
          b.bounces++;
        }
        if (b.x < B.x - 60 || b.x > B.x + B.w + 60) b.dead = true;
      } else if (b.kind === 'rect' || b.kind === 'orb') {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.rot !== undefined) b.rot += dt * 5;
        if (b.y > B.y + B.h + 40 || b.y < B.y - 300 || b.x < B.x - 60 || b.x > B.x + B.w + 60) b.dead = true;
      } else if (b.kind === 'wall') {
        b.x += b.vx * dt;
        if (b.x < B.x - 40 || b.x > B.x + B.w + 40) b.dead = true;
      } else if (b.kind === 'slap' || b.kind === 'cut') {
        if (time > b.until) b.dead = true;
      } else if (b.kind === 'hand') {
        if (time >= b.go) {
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          if (b.x < B.x - b.w - 60 || b.x > B.x + B.w + 60 || b.y < B.y - b.h - 60 || b.y > B.y + B.h + 60) b.dead = true;
        }
      } else if (b.kind === 'tear') {
        b.y += b.vy * dt;
        if (b.y > B.y + B.h + 30) b.dead = true;
      }
      if (!b.dead && this.inv <= 0 && this.collides(b, time)) {
        this.inv = 1;
        this.game.hurt(this.damage);
      }
    }
    this.bullets = this.bullets.filter((b) => !b.dead);
  }

  collides(b, time) {
    const S = this.soul;
    const circRect = (x, y, w, h) => {
      const cx = Math.max(x, Math.min(S.x, x + w));
      const cy = Math.max(y, Math.min(S.y, y + h));
      return (S.x - cx) ** 2 + (S.y - cy) ** 2 < (S.r - 2) ** 2;
    };
    switch (b.kind) {
      case 'ball':
      case 'orb':
        return (S.x - b.x) ** 2 + (S.y - b.y) ** 2 < (S.r + b.r - 3) ** 2;
      case 'rect':
        return circRect(b.x, b.y, b.w, b.h);
      case 'slap':
        return time >= b.hitAt && circRect(b.x, b.y, b.w, b.h);
      case 'hand':
        return time >= b.go && circRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6);
      case 'tear':
        return circRect(b.x + 3, b.y + 6, b.w - 6, b.h - 8);
      case 'cut': {
        if (time < b.hitAt) return false;
        // distancia del corazón al segmento
        const vx = b.x2 - b.x1;
        const vy = b.y2 - b.y1;
        const k = Math.max(0, Math.min(1, ((S.x - b.x1) * vx + (S.y - b.y1) * vy) / (vx * vx + vy * vy)));
        const px = b.x1 + vx * k;
        const py = b.y1 + vy * k;
        return (S.x - px) ** 2 + (S.y - py) ** 2 < (b.th / 2 + S.r - 2) ** 2;
      }
      case 'wall': {
        const B = this.box;
        return circRect(b.x, B.y, b.w, b.gapY - B.y) || circRect(b.x, b.gapY + b.gap, b.w, B.y + B.h - b.gapY - b.gap);
      }
    }
    return false;
  }

  draw(ctx, time) {
    const f = this.fade(time);
    if (f <= 0) return;
    const B = this.box;
    // la caja crece desde el centro al entrar
    const w = B.w * f;
    const h = B.h * f;
    const x = B.x + (B.w - w) / 2;
    const y = B.y + (B.h - h) / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
    if (f < 1) {
      ctx.restore();
      return;
    }
    ctx.beginPath();
    ctx.rect(B.x, B.y, B.w, B.h);
    ctx.clip();
    for (const b of this.bullets) this.drawBullet(ctx, b, time);
    ctx.restore();
    // corazón
    if (this.inv <= 0 || Math.floor(this.inv * 12) % 2 === 0) {
      FB.drawHeart(ctx, this.soul.x, this.soul.y, 18, '#ff1e1e');
    }
  }

  drawBullet(ctx, b, time) {
    switch (b.kind) {
      case 'ball':
        ctx.fillStyle = '#f2f2f2';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#d02020';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'orb':
        ctx.save();
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ff4040';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      case 'rect':
        ctx.save();
        ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
        ctx.rotate(b.rot || 0);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
        ctx.restore();
        break;
      case 'slap': {
        if (time < b.hitAt) {
          const blink = Math.floor(time * 10) % 2 === 0;
          ctx.fillStyle = 'rgba(255,40,40,' + (blink ? 0.28 : 0.15) + ')';
          ctx.fillRect(b.x, b.y, b.w, b.h);
          ctx.strokeStyle = 'rgba(255,60,60,0.9)';
          ctx.lineWidth = 2;
          ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
          ctx.fillStyle = '#ff5050';
          ctx.font = 'bold 22px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('!', b.x + b.w / 2, b.y + b.h / 2 + 8);
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.95)';
          ctx.fillRect(b.x, b.y, b.w, b.h);
        }
        break;
      }
      case 'hand': {
        const B = this.box;
        ctx.save();
        if (time < b.go) {
          // aviso: línea punteada gris por donde va a pasar
          ctx.strokeStyle = 'rgba(200,200,210,' + (Math.floor(time * 10) % 2 ? 0.55 : 0.3) + ')';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          if (!b.vertical) {
            ctx.moveTo(B.x, b.y + b.h / 2);
            ctx.lineTo(B.x + B.w, b.y + b.h / 2);
          } else {
            ctx.moveTo(b.x + b.w / 2, B.y);
            ctx.lineTo(b.x + b.w / 2, B.y + B.h);
          }
          ctx.stroke();
          ctx.restore();
          break;
        }
        ctx.imageSmoothingEnabled = false;
        ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
        // los dedos miran hacia donde avanza
        if (!b.vertical) {
          if (b.vx < 0) ctx.scale(-1, 1);
        } else ctx.rotate(b.vy > 0 ? Math.PI / 2 : -Math.PI / 2);
        ctx.drawImage(b.img, -b.img.width / 2, -b.img.height / 2);
        ctx.restore();
        break;
      }
      case 'tear':
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(b.img, Math.round(b.x), Math.round(b.y));
        ctx.restore();
        break;
      case 'cut': {
        ctx.save();
        ctx.lineCap = 'round';
        if (time < b.hitAt) {
          // aviso: línea roja finita que titila más rápido cuando está por caer
          const left = b.hitAt - time;
          const blink = Math.floor(time * (left < 0.6 ? 18 : 8)) % 2 === 0;
          ctx.strokeStyle = 'rgba(255,40,40,' + (blink ? 0.6 : 0.3) + ')';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.moveTo(b.x1, b.y1);
          ctx.lineTo(b.x2, b.y2);
          ctx.stroke();
        } else {
          // el corte: se dibuja de punta a punta muy rápido
          const k = Math.min(1, (time - b.hitAt) / 0.07);
          const fade = Math.min(1, (b.until - time) / 0.12);
          ctx.globalAlpha = fade;
          ctx.shadowColor = '#ff0000';
          ctx.shadowBlur = 12;
          ctx.strokeStyle = '#ff2a2a';
          ctx.lineWidth = b.th;
          ctx.beginPath();
          ctx.moveTo(b.x1, b.y1);
          ctx.lineTo(b.x1 + (b.x2 - b.x1) * k, b.y1 + (b.y2 - b.y1) * k);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#ffd0d0';
          ctx.lineWidth = Math.max(1, b.th / 3);
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      case 'wall': {
        const B = this.box;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(b.x, B.y, b.w, b.gapY - B.y);
        ctx.fillRect(b.x, b.gapY + b.gap, b.w, B.y + B.h - b.gapY - b.gap);
        break;
      }
    }
  }
};
