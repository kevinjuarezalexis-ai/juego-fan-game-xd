// ══════════════════════════════════════
//   Caja de combate estilo Undertale/Deltarune
// ══════════════════════════════════════
// Movés el corazón con flechas/WASD y esquivás. Los ataques salen en los beats.
// params:
//   box: { w, h }        tamaño de la caja
//   speed                velocidad del corazón (px/s)
//   damage               daño por golpe
//   patterns: [{ type, every, offset, from, to, ...opciones }]
//     pelota     pelotas de playa que rebotan (Quico) · invert: true → gravedad al revés (rebotan en el techo)
//     cachetada  franja que avisa y después pega (dir: 'col' | 'row', warn: beats)
//     lluvia     cosas que caen (count)
//     apuntado   proyectiles que van hacia el corazón (speed)
//     muro       pared que cruza la caja con un hueco (gap, speed)
//     mano       mano gris (pixel art) que cruza la caja en línea recta (warn: beats de aviso, speed, vertical: prob.)
//     lagrimas   lágrimas celestes que suben en diagonal (izquierda o derecha) desde abajo (count)
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

// marco a cuadros verde claro / verde oscuro (guiño a la gorra del Chavo)
FB.drawCheckerFrame = function (ctx, x, y, w, h, t = 8) {
  const C1 = '#6fbf3a';
  const C2 = '#245c1a';
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - t, y - t, w + t * 2, h + t * 2);
  ctx.rect(x, y, w, h);
  ctx.clip('evenodd');
  for (let yy = y - t, r = 0; yy < y + h + t; yy += t, r++) {
    for (let xx = x - t, c = 0; xx < x + w + t; xx += t, c++) {
      ctx.fillStyle = (r + c) % 2 ? C2 : C1;
      ctx.fillRect(xx, yy, t, t);
    }
  }
  ctx.restore();
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#0f2a0b';
  ctx.strokeRect(x - t - 0.75, y - t - 0.75, w + t * 2 + 1.5, h + t * 2 + 1.5);
  ctx.strokeStyle = '#a6e070';
  ctx.strokeRect(x - 0.75, y - 0.75, w + 1.5, h + 1.5);
  ctx.restore();
};

// pelota de playa (gajos blanco / amarillo / azul y tapita naranja), girando
FB.drawBeachBall = function (ctx, x, y, r, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot || 0);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.save();
  ctx.clip();
  // los gajos salen de un "polo" corrido hacia arriba
  const px = -r * 0.15;
  const py = -r * 0.55;
  const cols = ['#ffffff', '#ffd23a', '#3d8de0', '#ffffff', '#ffd23a', '#3d8de0'];
  const n = cols.length;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(a0) * r * 3, py + Math.sin(a0) * r * 3);
    ctx.lineTo(px + Math.cos(a1) * r * 3, py + Math.sin(a1) * r * 3);
    ctx.closePath();
    ctx.fillStyle = cols[i];
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,30,40,0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // sombrita abajo y brillo arriba
  ctx.fillStyle = 'rgba(0,0,0,0.13)';
  ctx.beginPath();
  ctx.arc(r * 0.35, r * 0.4, r * 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // tapita
  ctx.beginPath();
  ctx.ellipse(px, py, r * 0.26, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#ff8a2a';
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = '#1b1b22';
  ctx.stroke();
  // contorno
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#1b1b22';
  ctx.stroke();
  ctx.restore();
  // brillo fijo (no gira)
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.4, y - r * 0.45, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

// mano abierta de cachetada (dedos hacia la derecha), centrada en 0,0; w = largo total
FB.drawSlapHand = function (ctx, w, skin = '#c9c4b4', shade = '#9c9686') {
  const s = w / 64;
  ctx.save();
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = '#1e1d22';
  const finger = (y, len, th) => {
    ctx.beginPath();
    ctx.moveTo(4, y - th / 2);
    ctx.lineTo(4 + len - th / 2, y - th / 2);
    ctx.arc(4 + len - th / 2, y, th / 2, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(4, y + th / 2);
    ctx.closePath();
    ctx.fillStyle = skin;
    ctx.fill();
    ctx.stroke();
  };
  // dedos (índice arriba → meñique abajo)
  finger(-12, 24, 8);
  finger(-4, 27, 8);
  finger(4, 25, 8);
  finger(11.5, 20, 7);
  // pulgar hacia arriba
  ctx.save();
  ctx.translate(-6, -14);
  ctx.rotate(-0.85);
  ctx.beginPath();
  ctx.ellipse(6, 0, 10, 4.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // palma + muñeca
  ctx.beginPath();
  ctx.moveTo(-26, -9);
  ctx.quadraticCurveTo(-18, -18, 6, -16);
  ctx.lineTo(8, 16);
  ctx.quadraticCurveTo(-8, 20, -26, 10);
  ctx.closePath();
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.stroke();
  // sombra de la palma y líneas
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.ellipse(-6, 8, 11, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-12, -4);
  ctx.quadraticCurveTo(-2, 0, 4, -8);
  ctx.stroke();
  // puño de la manga (rosa como Doña Florinda)
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.rect(-34, -11, 9, 22);
  ctx.fillStyle = '#e46aa0';
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

// lágrima: cabeza redonda adelante y punta atrás (apunta hacia donde va)
FB.drawTear = function (ctx, x, y, r, ang) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(-r * 2.6, 0);
  ctx.quadraticCurveTo(-r * 0.6, -r * 1.05, 0, -r);
  ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
  ctx.quadraticCurveTo(-r * 0.6, r * 1.05, -r * 2.6, 0);
  const g = ctx.createLinearGradient(-r * 2.6, 0, r, 0);
  g.addColorStop(0, 'rgba(120,205,255,0.25)');
  g.addColorStop(0.55, '#5cc0ff');
  g.addColorStop(1, '#2f8fe0');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = '#0e4f8c';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(r * 0.15, -r * 0.4, r * 0.35, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

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
        const inv = !!pat.invert; // gravedad al revés: sube y rebota en el techo
        this.bullets.push({
          kind: 'ball',
          x: left ? B.x - 14 : B.x + B.w + 14,
          y: inv ? B.y + B.h - FB.rand(15, B.h * 0.45) : B.y + FB.rand(15, B.h * 0.45),
          vx: (left ? 1 : -1) * FB.rand(130, 210) * (pat.speedMul || 1),
          vy: inv ? FB.rand(-20, 80) : FB.rand(-80, 20),
          g: inv ? -650 : 650,
          r: pat.r || 13,
          rot: Math.random() * 6,
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
        const img = { width: 66, height: 40 }; // tamaño de la mano dibujada
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
        const n = pat.count || 2;
        const dir = Math.random() < 0.5 ? -1 : 1; // todas inclinadas para el mismo lado en cada tanda
        for (let i = 0; i < n; i++) {
          const sp = FB.rand(150, 215) * (pat.speedMul || 1);
          const ang = -Math.PI / 2 + dir * FB.rand(0.3, 0.55); // arriba, inclinada a izquierda o derecha
          this.bullets.push({
            kind: 'tear',
            x: FB.rand(B.x + 10, B.x + B.w - 10) - dir * 40,
            y: B.y + B.h + 14 + i * 38,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp,
            r: 7,
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
        const g = b.g || 650;
        b.vy += g * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.rot += (b.vx / b.r) * dt;
        if (g > 0 && b.y + b.r > B.y + B.h) {
          b.y = B.y + B.h - b.r;
          b.vy = -Math.max(300, Math.abs(b.vy) * 0.85);
          b.bounces++;
        } else if (g < 0 && b.y - b.r < B.y) {
          b.y = B.y + b.r;
          b.vy = Math.max(300, Math.abs(b.vy) * 0.85);
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
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.y < B.y - 40 || b.x < B.x - 60 || b.x > B.x + B.w + 60) b.dead = true;
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
        return (S.x - b.x) ** 2 + (S.y - b.y) ** 2 < (S.r + b.r - 3) ** 2;
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
    FB.drawCheckerFrame(ctx, x, y, w, h, 7);
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
      // late con la música: se agranda en cada beat y vuelve
      const fr = this.cond.beat - Math.floor(this.cond.beat);
      const pulse = 1 + 0.28 * Math.max(0, 1 - fr / 0.3) ** 2;
      FB.drawHeart(ctx, this.soul.x, this.soul.y, 18 * pulse, '#ff1e1e');
    }
  }

  drawBullet(ctx, b, time) {
    switch (b.kind) {
      case 'ball':
        FB.drawBeachBall(ctx, b.x, b.y, b.r, b.rot);
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
        const col = b.w < b.h; // franja vertical (la mano baja) u horizontal (cruza)
        if (time < b.hitAt) {
          const blink = Math.floor(time * 10) % 2 === 0;
          ctx.fillStyle = 'rgba(255,40,40,' + (blink ? 0.22 : 0.12) + ')';
          ctx.fillRect(b.x, b.y, b.w, b.h);
          ctx.strokeStyle = 'rgba(255,60,60,0.85)';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 5]);
          ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
          ctx.setLineDash([]);
          // la mano asomando en el borde, avisando
          ctx.save();
          ctx.globalAlpha = 0.55;
          if (col) {
            ctx.translate(b.x + b.w / 2, b.y + 4);
            ctx.rotate(Math.PI / 2);
          } else {
            ctx.translate(b.x + 6, b.y + b.h / 2);
          }
          FB.drawSlapHand(ctx, Math.min(60, (col ? b.w : b.h) * 1.1));
          ctx.restore();
        } else {
          // ¡PAF! la mano barre la franja con estela blanca
          const k = Math.min(1, (time - b.hitAt) / 0.12);
          const fade = Math.min(1, (b.until - time) / 0.15);
          ctx.save();
          ctx.globalAlpha = fade;
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillRect(b.x, b.y, b.w, b.h);
          const size = Math.min(78, (col ? b.w : b.h) * 1.15);
          ctx.strokeStyle = 'rgba(255,255,255,0.9)';
          ctx.lineWidth = 2;
          for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            if (col) {
              const xx = b.x + b.w / 2 + i * size * 0.25;
              ctx.moveTo(xx, b.y);
              ctx.lineTo(xx, b.y + b.h * k - size * 0.4);
            } else {
              const yy = b.y + b.h / 2 + i * size * 0.25;
              ctx.moveTo(b.x, yy);
              ctx.lineTo(b.x + b.w * k - size * 0.4, yy);
            }
            ctx.stroke();
          }
          if (col) {
            ctx.translate(b.x + b.w / 2, b.y + b.h * k - size * 0.2);
            ctx.rotate(Math.PI / 2);
          } else ctx.translate(b.x + b.w * k - size * 0.2, b.y + b.h / 2);
          FB.drawSlapHand(ctx, size);
          ctx.restore();
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
        ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
        // los dedos miran hacia donde avanza
        if (!b.vertical) {
          if (b.vx < 0) ctx.scale(-1, 1);
        } else ctx.rotate(b.vy > 0 ? Math.PI / 2 : -Math.PI / 2);
        // líneas de velocidad atrás
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 2;
        for (const yy of [-10, 0, 10]) {
          ctx.beginPath();
          ctx.moveTo(-b.img.width / 2 - 34, yy);
          ctx.lineTo(-b.img.width / 2 - 8, yy);
          ctx.stroke();
        }
        FB.drawSlapHand(ctx, b.img.width, '#b9b7ad', '#8d8a80');
        ctx.restore();
        break;
      }
      case 'tear':
        FB.drawTear(ctx, b.x, b.y, b.r, Math.atan2(b.vy, b.vx));
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
