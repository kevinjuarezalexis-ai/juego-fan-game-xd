// ══════════════════════════════════════
//   Fiesta de la Buena Vecindad — juego principal
// ══════════════════════════════════════
// Lee FB.SONG (timeline) y va cambiando escenario + mecánica según el
// tiempo de la canción. Todo corre continuo, como en FNF.
//
// Debug: abrí index.html?debug  →  F2 muestra/oculta info, M marca el tiempo
//        actual (para sacar los timestamps reales de la música).
//        index.html?t=72  arranca directo en el segundo 72.

window.FB = window.FB || {};

FB.Game = class Game {
  constructor(canvas) {
    this.W = 1280;
    this.H = 720;
    this.canvas = canvas;
    canvas.width = this.W;
    canvas.height = this.H;
    this.ctx = canvas.getContext('2d');
    this.song = FB.SONG;
    // los eventos se procesan en orden: se ordenan por tiempo (estable)
    this.song.events.sort((x, y) => x.t - y.t);
    this.conductor = new FB.Conductor();
    this.conductor.setSong(this.song);
    this.conductor.onEnd = () => this.finish();
    this.camera = new FB.Camera(this);
    if (this.stage && this.stage.setBgVideo) this.stage.setBgVideo(null);
    this.stage = new FB.Stage(this);
    this.images = {};
    this.state = 'menu';
    this.hp = 100;
    this.maxHp = 100;
    this.hpShown = 100;
    this.mechanic = null;
    this.segIdx = -1;
    this.evIdx = 0;
    this.lastBeat = -Infinity;
    this.parteIdx = -1;
    this.banner = null;
    this.realTime = 0;
    this.resetStats();

    const params = new URLSearchParams(location.search);
    this.debug = params.has('debug');
    this._debugParam = this.debug;
    this.testMode = false; // modo prueba: inmortal + tiempo en pantalla + marcar
    this.startAt = parseFloat(params.get('t')) || 0;
    this.marks = [];

    this.input = new Engine2D.KeyboardInput(
      {
        ArrowLeft: 'left', KeyA: 'left',
        ArrowRight: 'right', KeyD: 'right',
        ArrowUp: 'up', KeyW: 'up',
        ArrowDown: 'down', KeyS: 'down',
        KeyZ: 'confirm', Space: 'confirm', Enter: 'confirm',
        KeyX: 'block', ShiftLeft: 'block', ShiftRight: 'block',
        Digit1: 'opt1', Numpad1: 'opt1',
        Digit2: 'opt2', Numpad2: 'opt2',
        Digit3: 'opt3', Numpad3: 'opt3',
        Escape: 'pause', KeyP: 'pause',
        F2: 'debug', KeyM: 'mark',
      },
      {
        onDown: (a) => this.onAction(a),
        preventDefaultFor: new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'F2']),
      },
    );
    this.input.attach();

    canvas.addEventListener('pointerdown', (e) => {
      const r = canvas.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * this.W;
      const y = ((e.clientY - r.top) / r.height) * this.H;
      if (this.state === 'playing' && this.mechanic) this.mechanic.onPointer(x, y);
      else if (this.state === 'intro' && this.intro) this.intro.onPointer(x, y);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pause();
    });

    this.loop = new Engine2D.GameLoop({
      update: (dt) => this.update(dt / 1000),
      draw: () => this.draw(),
      maxFps: 0,
    });
  }

  resetStats() {
    this.stats = { hits: 0, notesHit: 0, notesMiss: 0, answersGood: 0, answersBad: 0, blocks: 0, bossDefeated: false, retries: 0 };
  }

  // ── carga ──
  async load(onProgress) {
    const srcs = new Set();
    for (const id in FB.CHARACTERS) {
      for (const st in FB.CHARACTERS[id].sprites || {}) {
        const s = FB.CHARACTERS[id].sprites[st];
        srcs.add(typeof s === 'string' ? s : s.src);
      }
    }
    for (const id in FB.BACKGROUNDS) if (FB.BACKGROUNDS[id].img) srcs.add(FB.BACKGROUNDS[id].img);
    const list = [...srcs];
    let done = 0;
    const total = list.length + 1;
    const tick = () => onProgress && onProgress(++done / total);
    await Promise.all([
      ...list.map((src) =>
        Engine2D.loadImage(src)
          .then((img) => (this.images[src] = img))
          .catch(() => {}) // sin arte todavía → placeholder
          .finally(tick),
      ),
      this.conductor.load(this.song.music).finally(tick),
    ]);
    this.loop.start();
  }

  img(src) {
    return src ? this.images[src] || null : null;
  }

  // ── flujo ──
  start(from = 0, opts = {}) {
    if (FB.unlockBgVideos) FB.unlockBgVideos(); // viene de un toque: el celu deja arrancar el video
    this.resetStats();
    if (from === 0 && this.song.intro && !opts.skipIntro) return this.startIntro();
    this.begin(from);
  }

  // escena previa a la música (fondo0) → al terminar arranca la canción
  startIntro() {
    if (this.mechanic) this.mechanic.end();
    this.mechanic = null;
    this.camera = new FB.Camera(this);
    if (this.stage && this.stage.setBgVideo) this.stage.setBgVideo(null);
    this.stage = new FB.Stage(this);
    this.state = 'intro';
    UI.show(null);
    this.intro = new FB.Intro(this, this.song.intro, () => {
      this.intro = null;
      this.begin(0);
    });
  }

  begin(from) {
    this.hp = this.maxHp;
    this.hpShown = this.maxHp;
    this.segIdx = -1;
    this.parteIdx = -1;
    if (this.mechanic) this.mechanic.end();
    this.mechanic = null;
    this.camera = new FB.Camera(this);
    if (this.stage && this.stage.setBgVideo) this.stage.setBgVideo(null);
    this.stage = new FB.Stage(this);
    this.regen = null;
    Engine2D.Particles.clear();
    this._pendingVideo = null;
    this.stopVideo();
    for (const e of this.song.events) if (e.type === 'video') (e._pre = false), (e._fade = false);
    if (this._flashDiv) this._flashDiv.remove(), (this._flashDiv = null);
    this.replayUntil(from);
    this.conductor.play(from);
    this.fadeIn = 0.6; // sale de negro
    this.lastBeat = Math.floor(this.conductor.beatAt(from)) - 1;
    this.state = 'playing';
    UI.show(null);
    const pv = this._pendingVideo;
    this._pendingVideo = null;
    if (pv && from < pv.t + (pv.dur ?? 10)) this.playVideo(pv, from - pv.t);
  }

  // Al arrancar a mitad de canción (reintento / ?t=) deja cámara, filtros y
  // estados como estarían en ese momento, sin animaciones.
  replayUntil(from) {
    const evs = this.song.events;
    const segs = this.song.segments;
    // segmentos y eventos anteriores a `from`, en orden de tiempo
    const items = [];
    segs.forEach((seg) => seg.t <= from && items.push({ t: seg.t, seg }));
    let i = 0;
    for (; i < evs.length && evs[i].t < from; i++) items.push({ t: evs[i].t, ev: evs[i] });
    items.sort((x, y) => x.t - y.t || (x.seg ? -1 : 1));
    this._pendingMech = null;
    for (const it of items) {
      if (it.seg) {
        this.applySegment(it.seg, true);
        this._pendingMech = {}; // cambios de mecánica posteriores al inicio del segmento
      } else if (it.ev.type === 'mech') Object.assign(this._pendingMech || {}, it.ev.set || {});
      else this.runEvent(it.ev, true);
    }
    this.segIdx = -1; // la mecánica la crea syncTimeline en el primer frame
    this._skipSegApply = true; // ...sin volver a aplicar escenario/cámara
    this.evIdx = i;
  }

  // escenario + cámara de un segmento
  applySegment(seg, instant = false, withStage = true) {
    if (withStage) this.stage.apply(instant ? seg.stage || {} : this._holdForWalks(seg));
    const st = seg.stage || {};
    // compañero que pelea al lado del jugador (se turnan la animación de daño)
    this.stage.ally = st.ally || null;
    this.stage._hurtTurn = 0;
    if (st.bumpEvery !== undefined) this.camera.setBump(st.bumpEvery, st.bumpAmount ?? 0.066, st.bumpStyle);
    const cam = seg.camera;
    if (cam) {
      const d = instant ? 0 : cam.dur ?? 0.6;
      if (cam.zoom !== undefined) this.camera.zoomTo(cam.zoom, d, cam.ease);
      if (cam.focus !== undefined) this.camera.focus(cam.focus, d, cam.ease);
      if (cam.filter !== undefined) this.camera.setFilter(cam.filter, instant ? 0 : 0.3, { keep: cam.keep });
      if (cam.tilt !== undefined) this.camera.tilt(cam.tilt, d, cam.ease);
    }
  }

  // Si un personaje tiene un 'walk' que arranca en los próximos 3 s, se queda
  // donde arranca la caminata (si no, se deslizaba a la x del segmento y
  // después se teletransportaba de vuelta al empezar a caminar).
  _holdForWalks(seg) {
    const st = seg.stage || {};
    if (!st.opponents) return st;
    const walks = this.song.events.filter((e) => e.type === 'walk' && e.from !== undefined && e.t >= seg.t && e.t <= seg.t + 3);
    if (!walks.length) return st;
    const opponents = st.opponents.map((o) => {
      const w = walks.find((e) => (e.char || 'jirafales') === o.id);
      return w ? { ...o, x: w.from } : o;
    });
    return { ...st, opponents };
  }

  get parte() {
    const ps = this.song.partes;
    let p = ps[0];
    for (const x of ps) if (x.t <= this.conductor.time) p = x;
    return p;
  }

  retry() {
    this.stats.retries++;
    this.begin(this._retryFrom || 0);
  }

  pause() {
    if (this.state !== 'playing') return;
    if (this.video) this.video.pause(); // el video de escena se pausa con el juego
    this.state = 'paused';
    this.conductor.pause();
    if (FB.Mobile) FB.Mobile.onPause(this);
    UI.show('pause');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.conductor.resume();
    if (this.video) {
      try {
        this.video.currentTime = Math.max(0, this.conductor.time - this.videoStart);
      } catch (e) {}
      this.video.play().catch(() => {});
    }
    UI.show(null);
  }

  toMenu() {
    this.stopVideo();
    this.conductor.stop();
    if (this.mechanic) this.mechanic.end();
    this.mechanic = null;
    this.intro = null;
    this.camera = new FB.Camera(this);
    if (this.stage && this.stage.setBgVideo) this.stage.setBgVideo(null);
    this.stage = new FB.Stage(this);
    this.state = 'menu';
    this.testMode = false;
    this.debug = this._debugParam;
    UI.show('menu');
  }

  gameOver() {
    this.stopVideo();
    this.state = 'gameover';
    this._retryFrom = this.parte.t;
    this.conductor.pause();
    UI.gameOver(this.parte);
  }

  finish() {
    if (this.state !== 'playing') return;
    this.state = 'ending';
    if (this.mechanic) this.mechanic.end();
    this.mechanic = null;
    UI.ending(this.stats);
  }

  hurt(n) {
    if (this.state !== 'playing') return;
    // modo prueba: inmortal (se ve el golpe pero no baja la vida)
    if (!this.testMode) this.hp = Math.max(0, this.hp - n);
    this.stats.hits++;
    this.stage.hurtPlayer();
    this.stage.shake(6, 0.18);
    if (this.hp <= 0) this.gameOver();
  }

  heal(n) {
    this.hp = Math.min(this.maxHp, this.hp + n);
  }

  // ── input ──
  onAction(a) {
    if (a === 'debug') {
      this.debug = !this.debug;
      return;
    }
    if (a === 'mark') {
      if (!this.debug) return;
      const t = this.conductor.time;
      this.marks.push(t);
      console.log('[marca]', FB.fmtTime(t), t.toFixed(2));
      return;
    }
    if (this.state === 'intro' && this.intro) return this.intro.onAction(a);
    if (a === 'pause') {
      if (this.state === 'playing') this.pause();
      else if (this.state === 'paused') this.resume();
      return;
    }
    if (this.state === 'playing' && this.mechanic) this.mechanic.onAction(a);
  }

  // ── timeline ──
  syncTimeline(time) {
    const segs = this.song.segments;
    let idx = -1;
    for (let i = 0; i < segs.length; i++) if (segs[i].t <= time) idx = i;
    if (idx !== this.segIdx && idx >= 0) {
      this.segIdx = idx;
      const seg = segs[idx];
      const t1 = idx + 1 < segs.length ? segs[idx + 1].t : this.conductor.length;
      if (!this._skipSegApply) this.applySegment(seg);
      this._skipSegApply = false;
      if (this.mechanic) this.mechanic.end();
      const M = FB.MECHANICS[(seg.mechanic && seg.mechanic.type) || 'none'] || FB.MECHANICS.none;
      this.mechanic = new M(this, { ...(seg.mechanic || {}) }, seg.t, t1);
      if (this._pendingMech) Object.assign(this.mechanic.p, this._pendingMech);
      this._pendingMech = null;
    }
    // eventos puntuales
    const evs = this.song.events;
    while (this.evIdx < evs.length && evs[this.evIdx].t <= time) {
      this.runEvent(evs[this.evIdx++]);
    }
    // cartel de parte
    const ps = this.song.partes;
    let pi = 0;
    for (let i = 0; i < ps.length; i++) if (ps[i].t <= time) pi = i;
    if (pi !== this.parteIdx) {
      this.parteIdx = pi;
      if (ps[pi].n > 0) this.banner = { text: 'PARTE ' + ps[pi].n, sub: ps[pi].nombre, t: 2.6 };
    }
  }

  // instant = true cuando se re-aplica al reintentar (sin flashes ni temblores)
  runEvent(ev, instant = false) {
    if (this.camera.runEvent(ev, instant)) return;
    switch (ev.type) {
      case 'flash':
        if (!instant) this.stage.flash(ev.dur || 0.4, ev.color, ev.alpha);
        break;
      case 'flashSprite':
        if (!instant) this.stage.flashSprite(ev.char, ev.dur ?? 0.3, ev.shake ?? 6);
        break;
      case 'bgVideo':
        // { t, type: 'bgVideo', src, alpha } prende · { t, type: 'bgVideo', off: true } apaga
        this.stage.setBgVideo(ev.off ? null : ev);
        break;
      case 'vignette':
        // { t, type: 'vignette', to: 0.6, dur } bordes oscuros (0 = nada, 1 = muy oscuro)
        this.stage.fadeVal('vig', ev.to, instant ? 0 : ev.dur ?? 1);
        break;
      case 'bgDark':
        // { t, type: 'bgDark', to: 0.3, dur } oscurece solo el fondo
        this.stage.fadeVal('bgDark', ev.to, instant ? 0 : ev.dur ?? 1);
        break;
      case 'still': {
        // { t, type: 'still', char: 'chavo', on: true } → deja de rebotar con el beat (on: false vuelve)
        const S = (this.stage.still = this.stage.still || new Set());
        if (ev.on === false) S.delete(ev.char);
        else S.add(ev.char);
        break;
      }
      case 'setState':
        this.stage.setState(ev.char, ev.state);
        break;
      case 'walk': {
        // solo en el prólogo se camina con animación; después el personaje se teletransporta
        // a su lugar con un destellito blanco (no hay sprites de caminar). anim: true fuerza caminar.
        const id = ev.char || 'jirafales';
        // slide: se desliza de a poco (o de golpe) sin pose de caminar
        if (ev.slide) {
          this.stage.walk(id, ev.from, ev.to, instant ? 0 : ev.dur ?? 1, ev.end, instant, true);
          break;
        }
        const anim = ev.anim || ev.t < 37.3;
        if (anim || instant) this.stage.walk(id, ev.from, ev.to, ev.dur ?? 2, ev.end || 'normal', instant);
        else {
          this.stage.walk(id, ev.from, ev.to, 0, ev.end || 'normal', true);
          this.stage.flashSprite(id, 0.22, 0);
        }
        break;
      }
      case 'silhouette':
        this.stage.silhouette(ev.char, ev.on !== false, instant ? 0 : ev.dur ?? 0.3);
        break;
      case 'tension':
        if (instant) this.stage.tension = ev.to;
        else this.stage.tensionTo(ev.to, ev.dur ?? 1);
        break;
      case 'text':
        if (!instant) this.stage.popText(ev);
        break;
      case 'ink':
        if (instant) this.stage.ink = ev.on === false ? 0 : 1;
        else this.stage.setInk(ev.on !== false, ev.dur ?? 0.4);
        break;
      case 'prop':
        this.stage.prop(ev);
        break;
      case 'propMove':
        if (instant) {
          const pr = this.stage.props && this.stage.props[ev.id];
          if (pr) Object.assign(pr, { x: ev.x ?? pr.x, y: ev.y ?? pr.y, rot: ev.rot ?? pr.rot, alpha: ev.fade ? 0 : pr.alpha });
        } else this.stage.propMove(ev.id, ev.x, ev.y, ev.dur ?? 1, ev.rot ?? 0, ev.fade);
        break;
      case 'fall':
        if (!instant) this.stage.fall(ev.char, ev.dur ?? 1.2);
        else {
          const fa = this.stage.actorOf(ev.char);
          if (fa) fa.alpha = fa.target = 0;
        }
        break;
      case 'video':
        // al entrar a mitad de canción (reintento / ?t=) se guarda y se arranca después, por donde iba
        if (instant) this._pendingVideo = ev;
        else this.playVideo(ev);
        break;
      case 'mech':
        // cambia parámetros de la mecánica actual (ej. el clímax de la pelea final)
        if (this.mechanic) Object.assign(this.mechanic.p, ev.set || {});
        break;
      case 'defeatBoss':
        if (this.mechanic && this.mechanic.defeat && !this.mechanic.defeated) {
          this.mechanic.hp = 0;
          this.mechanic.defeat();
        }
        break;
      case 'regen':
        // recupera vida de a poco: amount por segundo durante dur segundos
        if (!instant) this.regen = { perSec: ev.amount ?? 6, until: ev.t + (ev.dur ?? 10) };
        break;
      case 'liberate':
        if (!instant) this.stage.liberate(ev.char, ev.dur ?? 3);
        break;
      case 'face':
        this.stage.face(ev.char, ev.dir);
        break;
      case 'swapPlayer':
        this.stage.swapPlayer(ev.char);
        break;
      case 'pose':
        if (!instant) this.stage.pose(ev.char || 'jirafales', ev.state, ev.dur ?? 0.5);
        break;
      case 'bg':
        this.stage.bgId = ev.bg;
        break;
    }
  }

  // video de escena a pantalla completa, encima del juego. La música sigue sonando y el
  // video suena junto con ella (volumen = música × videoVolume, 0.9 por defecto).
  // ev: { src, dur, volume: 0.9, muted: false } · offset: segundos ya transcurridos (si se entró a mitad)
  playVideo(ev, offset = 0) {
    this.stopVideo();
    const box = document.getElementById('stage-box');
    const v = FB.sceneVideoEl(ev.src);
    v.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;z-index:5;opacity:1';
    v.onerror = () => this.stopVideo();
    if (v.parentNode !== box) box.appendChild(v);
    this.video = v;
    this.videoEv = ev;
    this.videoStart = ev.t;
    this.videoUntil = ev.t + (ev.dur ?? 10);
    v.muted = ev.muted === true;
    this._videoVolume();
    const want = Math.max(0, offset);
    if (Math.abs(v.currentTime - want) > 0.05) {
      try {
        v.currentTime = want;
      } catch (e) {}
    }
    const p = v.play();
    // si el navegador no deja reproducir con sonido, por lo menos que se vea
    if (p && p.catch)
      p.catch(() => {
        v.muted = true;
        v.play().catch(() => {});
      });
    // destello blanco de entrada: queda un instante en blanco y se desvanece mostrando el video
    const f = this._flashDiv || this._videoFlashIn(ev.flashIn || '#ffffff', true);
    this._flashDiv = null;
    setTimeout(() => {
      f.style.transition = 'opacity .7s ease-out';
      f.style.opacity = '0';
      setTimeout(() => f.remove(), 800);
    }, 150);
  }

  // un poco antes del video lo arranca oculto y en silencio, así el navegador ya lo tiene
  // decodificado y no se congela al aparecer
  _prerollVideos(time) {
    if (this.state !== 'playing' || this.video) return;
    this._videoEvs = this._videoEvs || this.song.events.filter((e) => e.type === 'video' && e.src);
    for (const ev of this._videoEvs) {
      // destello blanco que sube justo antes de que aparezca el video
      if (!ev._fade && time >= ev.t - 0.2 && time < ev.t) {
        ev._fade = true;
        this._videoFlashIn(ev.flashIn || '#ffffff');
      }
      if (ev._pre || time < ev.t - 1.5 || time >= ev.t) continue;
      ev._pre = true;
      const v = FB.sceneVideoEl(ev.src);
      const box = document.getElementById('stage-box');
      v.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;z-index:5;opacity:0;pointer-events:none';
      if (v.parentNode !== box) box.appendChild(v);
      v.muted = true;
      try {
        v.currentTime = 0;
      } catch (e) {}
      const done = () => {
        v.removeEventListener('playing', done);
        setTimeout(() => {
          if (this.video === v) return; // ya arrancó de verdad
          v.pause();
          try {
            v.currentTime = 0;
          } catch (e) {}
        }, 250);
      };
      v.addEventListener('playing', done);
      v.play().catch(() => {});
    }
  }

  // capa blanca que aparece rápido (antes del video) y queda arriba hasta que playVideo la desvanece
  _videoFlashIn(color, instant = false) {
    const box = document.getElementById('stage-box');
    const f = document.createElement('div');
    f.style.cssText = 'position:absolute;inset:0;z-index:6;pointer-events:none;background:' + color + ';opacity:' + (instant ? 1 : 0) + ';transition:opacity .18s ease-in';
    box.appendChild(f);
    if (!instant) requestAnimationFrame(() => requestAnimationFrame(() => (f.style.opacity = '1')));
    this._flashDiv = f;
    // por si algo falla, nunca queda la pantalla en blanco
    setTimeout(() => f.parentNode && this._flashDiv === f && ((this._flashDiv = null), f.remove()), 2000);
    return f;
  }

  // capa de color encima del video que se desvanece (destello)
  _videoFlash(color, dur) {
    const box = document.getElementById('stage-box');
    const f = document.createElement('div');
    f.style.cssText = 'position:absolute;inset:0;z-index:6;pointer-events:none;opacity:1;background:' + color + ';transition:opacity ' + dur + 's ease-out';
    box.appendChild(f);
    requestAnimationFrame(() => requestAnimationFrame(() => (f.style.opacity = '0')));
    setTimeout(() => f.remove(), dur * 1000 + 100);
  }

  // fin del video: destello (rojo por defecto) y vuelve al juego
  endVideo() {
    const ev = this.videoEv || {};
    this.stopVideo();
    this.stage.flash(0.6, ev.flashOut || '#ff1a1a', 0.9);
    this.camera.shake && this.camera.shake(10, 0.4);
  }

  _videoVolume() {
    const v = this.video;
    if (!v) return;
    const A = Engine2D.Audio;
    const music = this.conductor.audio ? this.conductor.audio.volume : Math.min(1, A.getVolume() * A.getMusicVolume() * 1.6);
    v.volume = Math.max(0, Math.min(1, music * (this.videoEv && this.videoEv.volume != null ? this.videoEv.volume : 0.9)));
    if (A.isMuted()) v.muted = true;
  }

  stopVideo() {
    if (this.video) {
      this.video.pause();
      this.video.remove();
    }
    this.video = null;
  }

  // ── loop ──
  update(dt) {
    this.realTime += dt;
    Engine2D.Particles.update(dt * 1000);
    this.fadeIn = Math.max(0, (this.fadeIn || 0) - dt);
    if (this.state === 'intro' && this.intro) {
      this.stage.update(dt);
      this.camera.update(dt);
      this.intro.update(dt);
      return;
    }
    if (this.state !== 'playing') return;
    const c = this.conductor;
    c.update();
    const time = c.time;
    this.syncTimeline(time);
    this.applyTalkPose(time);

    const beat = Math.floor(c.beatAt(time));
    if (beat > this.lastBeat) {
      // si hubo un salto grande (seek / pestaña colgada) no dispara todos los beats perdidos
      const from = beat - this.lastBeat > 4 ? beat : this.lastBeat + 1;
      for (let b = from; b <= beat; b++) this.onBeat(b, time);
      this.lastBeat = beat;
    }

    this.stage.update(dt);
    this.camera.update(dt);
    if (this.video && time >= this.videoUntil) this.endVideo();
    else if (this.video && (this.state === 'menu' || this.state === 'ending')) this.stopVideo();
    this._prerollVideos(time);
    if (this.video) this._videoVolume();
    if (this.regen) {
      if (time < this.regen.until) this.heal(this.regen.perSec * dt);
      else this.regen = null;
    }
    if (this.mechanic && this.state === 'playing') this.mechanic.update(dt, time);
    this.hpShown += (this.hp - this.hpShown) * Math.min(1, dt * 10);
    if (this.banner) {
      this.banner.t -= dt;
      if (this.banner.t <= 0) this.banner = null;
    }
  }

  onBeat(b, time) {
    this.stage.beat(b);
    this.camera.onBeat(b);
    if (this.mechanic) this.mechanic.onBeat(b, time);
  }

  draw() {
    const ctx = this.ctx;
    const time = this.state === 'menu' || this.state === 'intro' ? this.realTime : this.conductor.time;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);

    // capa del escenario (cámara: zoom, movimiento, temblor, inclinación)
    const cam = this.camera;
    const keep = cam.filterOn && cam.keep.length ? cam.keep : null;
    ctx.save();
    cam.apply(ctx);
    this.stage.drawBackground(ctx);
    this.stage.drawCharacters(ctx, time, keep ? { skip: keep } : {});
    ctx.restore();
    cam.applyFilter(ctx); // gris / blanco y negro
    if (keep) {
      // personajes que quedan a color encima del filtro
      ctx.save();
      cam.apply(ctx);
      this.stage.drawCharacters(ctx, time, { only: keep });
      ctx.restore();
    }
    this.stage.drawFx(ctx, time);
    this.stage.drawPops(ctx);

    if (this.state === 'menu') return;
    if (this.state === 'intro') {
      if (this.intro) this.intro.draw(ctx);
      return;
    }

    // capa de juego (sin zoom)
    if (this.mechanic) this.mechanic.draw(ctx, time);
    Engine2D.Particles.draw(ctx);
    this.drawCaption(ctx, time);
    this.drawTimedDialogue(ctx, time);
    const mt = this.mechanic && this.mechanic.constructor;
    if (mt !== FB.MECHANICS.none) this.drawHud(ctx); // en escenas sin combate no hay barra
    this.drawBanner(ctx);
    if (this.debug) this.drawDebug(ctx, time);
    if (this.fadeIn > 0) {
      ctx.fillStyle = 'rgba(0,0,0,' + this.fadeIn / 0.6 + ')';
      ctx.fillRect(0, 0, this.W, this.H);
    }
  }

  // song.dialogue: [t, quién, texto, duración] → cuadro de diálogo con tiempo
  // talkPose (characters.js): mientras un personaje habla en un diálogo con tiempo, usa su pose de hablar
  applyTalkPose(time) {
    for (const x of this.song.dialogue || []) {
      if (time < x[0] || time >= x[0] + (x[3] || 3)) continue;
      for (const id in FB.CHARACTERS) {
        const def = FB.CHARACTERS[id];
        if (!def.talkPose || def.nombre !== x[1]) continue;
        const a = this.stage.actorOf(id);
        // si ya tiene otra pose puesta por un evento (ej. un grito), la respeta
        if (a && a.tempT > 0 && a.tempState !== def.talkPose[a.state]) continue;
        if (a && def.talkPose[a.state]) this.stage.pose(id, def.talkPose[a.state], 0.12);
      }
    }
  }

  drawTimedDialogue(ctx, time) {
    const list = this.song.dialogue || [];
    let d = null;
    for (const x of list) if (time >= x[0] && time < x[0] + (x[3] || 3)) d = x;
    if (!d) return;
    const [t0, who, text, dur = 3] = d;
    const free = !this.mechanic || !this.mechanic.busy;
    const alpha = Math.min(1, (t0 + dur - time) * 5, (time - t0) * 8);
    const big = /^[^a-záéíóúñ]*$/.test(text) && text.length > 3; // GRITOS en mayúscula más grandes
    if (free) {
      FB.drawDialogue(ctx, this.W, who, text, (time - t0) * 45, { alpha, y: 506, big });
      return;
    }
    // hay mecánica en pantalla: franja baja compacta (no tapa la caja ni a los personajes)
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(8,8,12,0.88)';
    ctx.beginPath();
    FB.roundRect(ctx, 140, 618, this.W - 280, 60, 10);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 12px "Press Start 2P", monospace';
    ctx.fillText(who + ':', 160, 643);
    ctx.fillStyle = '#fff';
    ctx.font = (big ? 'bold 22px' : '19px') + ' monospace';
    ctx.fillText(String(text).slice(0, Math.floor((time - t0) * 45)), 160, 667);
    ctx.restore();
  }

  drawCaption(ctx, time) {
    let cap = null;
    for (const c of this.song.captions) if (time >= c[0] && time < c[0] + (c[3] || 3)) cap = c;
    if (!cap) return;
    const [t0, who, text, dur = 3] = cap;
    const a = Math.min(1, (time - t0) * 4, (t0 + dur - time) * 4);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.font = '22px monospace';
    const w = ctx.measureText(text).width + 40;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(this.W / 2 - w / 2, 14, w, who ? 62 : 40);
    let y = 41;
    if (who) {
      ctx.fillStyle = '#ffd23f';
      ctx.font = 'bold 12px "Press Start 2P", monospace';
      ctx.fillText(who, this.W / 2, 34);
      y = 62;
    }
    ctx.fillStyle = '#fff';
    ctx.font = '22px monospace';
    ctx.fillText(text, this.W / 2, y);
    ctx.restore();
  }

  // barra de vida estilo FNF: rojo = rival, verde = Jirafales
  drawHud(ctx) {
    const w = 520;
    const x = this.W / 2 - w / 2;
    const y = 700;
    const frac = this.hpShown / this.maxHp;
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 3, y - 3, w + 6, 16);
    ctx.fillStyle = '#b01818';
    ctx.fillRect(x, y, w, 10);
    ctx.fillStyle = '#31d843';
    ctx.fillRect(x + w * (1 - frac), y, w * frac, 18);
    // íconos (placeholder: círculos con el color del personaje)
    const div = x + w * (1 - frac);
    // ícono del rival: el objetivo de la mecánica actual, o el primer corrompido en escena
    const tgt = this.mechanic && (this.mechanic.p.target || this.mechanic.p.boss);
    const opp = tgt || Object.keys(this.stage.actors).find((id) => /corrupto|revelado|final/.test(this.stage.actors[id].state)) || Object.keys(this.stage.actors)[0];
    const oppDef = opp && FB.CHARACTERS[opp];
    const bop = 1 + this.stage.player.bop * 0.15;
    if (oppDef) this.drawIcon(ctx, div - 24, y + 5, 17 * bop, oppDef.color, oppDef.nombre.replace(/^(Prof\.|Don|Doña|La|El|Sr\.) /, '')[0]);
    const pd = FB.CHARACTERS[this.stage.player.id] || FB.CHARACTERS.jirafales;
    this.drawIcon(ctx, div + 24, y + 5, 17 * bop, pd.color, pd.nombre.replace(/^(Prof\.|Don|Doña|La|El|Sr\.) /, '')[0]);
  }

  drawIcon(ctx, x, y, r, color, letter) {
    ctx.fillStyle = color;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + Math.round(r * 0.75) + 'px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(letter, x + 1, y + r * 0.36);
  }

  drawBanner(ctx) {
    const b = this.banner;
    if (!b) return;
    const a = Math.min(1, (2.6 - b.t) * 3, b.t * 2);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 250, this.W, 110);
    ctx.fillStyle = '#ff3b3b';
    ctx.font = 'bold 34px "Press Start 2P", monospace';
    ctx.fillText(b.text, this.W / 2, 300);
    ctx.fillStyle = '#fff';
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.fillText(b.sub, this.W / 2, 336);
    ctx.restore();
  }

  drawDebug(ctx, time) {
    const c = this.conductor;
    const seg = this.song.segments[this.segIdx];
    const lines = [
      'tiempo ' + FB.fmtTime(time) + '  (' + time.toFixed(2) + 's)',
      'beat ' + c.beat.toFixed(2) + '  bpm ' + c.bpm,
      'parte ' + this.parte.n + '  seg ' + this.segIdx + ' [' + ((seg && seg.mechanic && seg.mechanic.type) || '-') + ']',
      'hp ' + Math.round(this.hp) + (c.hasAudio ? '' : '  (SIN MÚSICA: reloj interno)'),
      this.testMode ? 'MODO PRUEBA (inmortal) · M o MARCAR' : 'M = marcar tiempo',
    ];
    ctx.save();
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(8, 90, 330, lines.length * 17 + 10);
    ctx.fillStyle = '#7dff9a';
    lines.forEach((l, i) => ctx.fillText(l, 16, 108 + i * 17));
    // marcas
    if (this.marks.length) {
      const ms = this.marks.slice(-12);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(this.W - 190, 90, 182, ms.length * 17 + 28);
      ctx.fillStyle = '#ffd23f';
      ctx.fillText('marcas (' + this.marks.length + ')', this.W - 180, 108);
      ms.forEach((m, i) => ctx.fillText(FB.fmtTime(m) + '  ' + m.toFixed(2), this.W - 180, 126 + i * 17));
    }
    // pulso del beat
    const ph = c.beat - Math.floor(c.beat);
    ctx.fillStyle = 'rgba(255,255,255,' + (1 - ph) + ')';
    ctx.beginPath();
    ctx.arc(320, 104, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

FB.fmtTime = function (t) {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
};

// ══════════════════════════════════════
//   UI (menús HTML encima del canvas)
// ══════════════════════════════════════
const UI = {
  game: null,
  el: (id) => document.getElementById(id),

  // muestra una pantalla. Los carteles salen con animación (chiquitos → grandes con rebote)
  // y al cerrarse se encogen hacia el medio. El menú queda de fondo detrás de sus carteles.
  show(name) {
    const enMenu = this.game && this.game.state === 'menu';
    const sobreMenu = ['jugar', 'partes', 'ajustes', 'creditos'];
    for (const id of ['menu', 'jugar', 'partes', 'ajustes', 'creditos', 'pause', 'gameover', 'ending']) {
      const m = this.el('m-' + id);
      if (!m) continue;
      const visible = id === name || (id === 'menu' && enMenu && sobreMenu.includes(name));
      const estaba = !m.classList.contains('hidden') && !m.classList.contains('closing');
      clearTimeout(m._t);
      if (visible) {
        m.classList.remove('closing');
        if (!estaba) {
          m.classList.remove('hidden');
          // reinicia la animación de entrada
          const box = m.querySelector('.cartel-box');
          if (box) (box.style.animation = 'none'), box.offsetWidth, (box.style.animation = '');
        }
      } else if (estaba && id !== 'menu' && m.querySelector('.cartel-box')) {
        m.classList.add('closing');
        m._t = setTimeout(() => m.classList.add('hidden'), 180);
      } else {
        m.classList.remove('closing');
        m.classList.add('hidden');
      }
    }
  },

  init(game) {
    this.game = game;
    const g = game;
    this.el('btn-jugar').onclick = () => {
      Engine2D.Audio.unlock();
      g.testMode = false;
      g.start(g.startAt);
    };
    // "Elegir parte" normal y "Modo prueba" usan la misma lista de partes
    const openPartes = (test) => {
      this.partesTest = test;
      this.el('partes-title').textContent = test ? 'Modo prueba' : 'Elegir parte';
      this.el('partes-test').classList.toggle('hidden', !test);
      this.show('partes');
    };
    this.el('btn-partes').onclick = () => openPartes(false);
    this.el('btn-test').onclick = () => openPartes(true);
    this.el('btn-partes-volver').onclick = () => this.show('jugar');
    // botones del menú principal
    this.el('btn-menu-jugar').onclick = () => this.show('jugar');
    this.el('btn-menu-opciones').onclick = () => {
      if (FB.Mobile) FB.Mobile.from = 'menu';
      this.show('ajustes');
    };
    this.el('btn-menu-creditos').onclick = () => this.show('creditos');
    document.querySelectorAll('[data-back]').forEach((b) => (b.onclick = () => this.show(b.dataset.back)));
    // en el celu: efecto de apretar (se achica un instante)
    document.querySelectorAll('.img-btn, .c-btn').forEach((b) =>
      b.addEventListener('pointerdown', () => {
        b.classList.add('press');
        setTimeout(() => b.classList.remove('press'), 140);
      }),
    );
    const list = this.el('partes-list');
    list.innerHTML = '';
    for (const p of FB.SONG.partes) {
      const b = document.createElement('button');
      b.className = 'c-btn c-sec';
      b.textContent = (p.n ? p.n + '. ' : '') + p.nombre;
      b.onclick = () => {
        Engine2D.Audio.unlock();
        g.testMode = !!this.partesTest;
        g.debug = g.testMode || g._debugParam;
        g.start(p.t, { skipIntro: !g.testMode || p.t > 0 });
      };
      list.appendChild(b);
    }
    this.el('btn-continuar').onclick = () => g.resume();
    this.el('btn-reiniciar').onclick = () => {
      g._retryFrom = g.parte.t;
      g.retry();
    };
    this.el('btn-salir').onclick = () => g.toMenu();
    this.el('btn-reintentar').onclick = () => g.retry();
    this.el('btn-go-menu').onclick = () => g.toMenu();
    this.el('btn-fin-menu').onclick = () => g.toMenu();
  },

  gameOver(parte) {
    this.el('go-parte').textContent = 'Reintentar desde: ' + (parte.n ? 'Parte ' + parte.n + ' — ' : '') + parte.nombre;
    this.show('gameover');
  },

  ending(s) {
    const total = s.notesHit + s.notesMiss;
    this.el('fin-stats').textContent =
      'Golpes recibidos: ' + s.hits +
      '\nFlechas: ' + s.notesHit + '/' + total +
      '\nRespuestas buenas: ' + s.answersGood + ' · malas: ' + s.answersBad +
      '\nBloqueos: ' + s.blocks +
      '\nReintentos: ' + s.retries +
      '\n\n' + (s.bossDefeated ? 'El Chavo descansa en paz.' : 'El espíritu sigue en la vecindad...');
    this.el('m-ending').querySelector('.c-title').textContent = s.bossDefeated ? '¡Ganaste!' : 'Fin de la fiesta';
    this.show('ending');
  },
};

window.addEventListener('DOMContentLoaded', () => {
  const game = new FB.Game(document.getElementById('game'));
  window.game = game; // para la consola
  UI.init(game);
  if (FB.Mobile) FB.Mobile.init(game);
  const status = UI.el('menu-status');
  const jugar = UI.el('btn-jugar');
  jugar.disabled = true;
  game
    .load((f) => (status.textContent = 'Cargando… ' + Math.round(f * 100) + '%' + (f > 0.85 ? ' (la música puede tardar un poco)' : '')))
    .then(() => {
      jugar.disabled = false;
      status.textContent = game.conductor.hasAudio
        ? ''
        : 'Sin música: poné el archivo en ' + FB.SONG.music + ' (se juega con reloj interno)';
    });
});
