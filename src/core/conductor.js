// ══════════════════════════════════════
//   Conductor — reloj de la canción
// ══════════════════════════════════════
// Todo el juego se sincroniza con conductor.time (segundos de canción) y
// conductor.beat. Si hay archivo de música usa su currentTime (suavizado,
// porque el navegador lo actualiza a saltos); si no hay, usa un reloj interno
// para poder probar igual.

window.FB = window.FB || {};

FB.Conductor = class Conductor {
  constructor() {
    this.audio = null;
    this.hasAudio = false;
    this.bpm = 120;
    this.offset = 0;
    this.length = 60;
    this.playing = false;
    this.time = 0;
    this._lastPerf = 0;
    this._lastAudio = -1;
    this.onEnd = null;
  }

  setSong({ bpm, offset = 0, length = 60 }) {
    this.bpm = bpm;
    this.offset = offset;
    this.length = length;
  }

  get crochet() {
    return 60 / this.bpm; // duración de un beat en segundos
  }

  get beat() {
    return this.beatAt(this.time);
  }

  beatAt(t) {
    return (t - this.offset) / this.crochet;
  }

  timeOfBeat(b) {
    return this.offset + b * this.crochet;
  }

  load(src) {
    return new Promise((resolve) => {
      if (!src) return resolve(false);
      const a = new Audio();
      a.preload = 'auto';
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        clearTimeout(to);
        this.hasAudio = ok;
        if (ok) {
          this.audio = a;
          if (isFinite(a.duration) && a.duration > 0) this.length = a.duration;
          a.addEventListener('ended', () => this._finish());
        }
        resolve(ok);
      };
      a.addEventListener('canplaythrough', () => finish(true), { once: true });
      a.addEventListener('error', () => finish(false), { once: true });
      const to = setTimeout(() => finish(a.readyState >= 1), 5000);
      a.src = src;
      a.load();
    });
  }

  _applyVolume() {
    if (!this.audio) return;
    const A = Engine2D.Audio;
    this.audio.volume = Math.max(0, Math.min(1, A.getVolume() * A.getMusicVolume() * 1.6));
    this.audio.muted = A.isMuted();
  }

  play(from = 0) {
    this.time = from;
    this.playing = true;
    this._lastPerf = performance.now();
    this._lastAudio = -1;
    if (this.hasAudio) {
      this._applyVolume();
      this.audio.currentTime = from;
      const p = this.audio.play();
      if (p && p.catch) p.catch(() => {});
    }
  }

  pause() {
    this.playing = false;
    if (this.hasAudio) this.audio.pause();
  }

  resume() {
    if (this.playing) return;
    this.playing = true;
    this._lastPerf = performance.now();
    this._lastAudio = -1;
    if (this.hasAudio) {
      this.audio.currentTime = this.time;
      const p = this.audio.play();
      if (p && p.catch) p.catch(() => {});
    }
  }

  stop() {
    this.playing = false;
    if (this.hasAudio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  _finish() {
    if (!this.playing) return;
    this.playing = false;
    if (this.onEnd) this.onEnd();
  }

  update() {
    const now = performance.now();
    if (!this.playing) {
      this._lastPerf = now;
      return;
    }
    this.time += (now - this._lastPerf) / 1000;
    this._lastPerf = now;
    if (this.hasAudio) {
      const at = this.audio.currentTime;
      if (at !== this._lastAudio) {
        this._lastAudio = at;
        const d = at - this.time;
        if (Math.abs(d) > 0.1) this.time = at;
        else this.time += d * 0.2;
      }
    } else if (this.time >= this.length) {
      this.time = this.length;
      this._finish();
    }
  }
};
