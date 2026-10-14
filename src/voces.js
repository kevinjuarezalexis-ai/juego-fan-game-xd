// ══════════════════════════════════════
//   Voces de referencia (sacadas de la v1 de la canción)
// ══════════════════════════════════════
// Clips cortos (gritos, cancioncitas) que suenan encima de la música en su
// momento exacto. Evento: { t, type: 'voz', src, vol }.
// Siguen el reloj de la canción: pausa, reintento y ?t= los retoman donde van.
// Usan el volumen de la música (no el de efectos).

window.FB = window.FB || {};

(function () {
  const bufs = {}; // src -> AudioBuffer | Promise | null
  const activos = []; // { ev, s, g, startCtx, offset, dur }

  function ctx() {
    return FB.SFX && FB.SFX.context ? FB.SFX.context() : null;
  }

  function musicVol() {
    const A = window.Engine2D && Engine2D.Audio;
    if (!A) return 0.8;
    if (A.isMuted && A.isMuted()) return 0;
    return Math.min(1, A.getVolume() * A.getMusicVolume() * 1.6);
  }

  function load(src) {
    if (src in bufs) return bufs[src];
    const c = ctx();
    if (!c) return null;
    bufs[src] = fetch(src)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
      .then((ab) => new Promise((res, rej) => c.decodeAudioData(ab, res, rej)))
      .then((b) => (bufs[src] = b))
      .catch(() => (bufs[src] = null));
    return bufs[src];
  }

  function quitar(a) {
    const i = activos.indexOf(a);
    if (i >= 0) activos.splice(i, 1);
    try {
      a.s.onended = null;
      a.s.stop();
    } catch (e) {}
    a.g.disconnect();
  }

  FB.Voces = {
    preload(events) {
      for (const e of events) if (e.type === 'voz') load(e.src);
    },

    // arranca la voz en la posición que le toca según el tiempo de canción
    start(ev, time) {
      const b = bufs[ev.src];
      if (!(b instanceof AudioBuffer)) {
        if (b === undefined) load(ev.src); // todavía no cargó: esta vez no suena
        return;
      }
      const off = time - ev.t;
      if (off < 0 || off >= b.duration - 0.05) return;
      this.stop(ev);
      const c = ctx();
      if (!c) return;
      const s = c.createBufferSource();
      s.buffer = b;
      const g = c.createGain();
      g.gain.value = musicVol() * (ev.vol ?? 1);
      s.connect(g).connect(c.destination);
      s.start(0, off);
      const a = { ev, s, g, startCtx: c.currentTime, offset: off, dur: b.duration };
      s.onended = () => quitar(a);
      activos.push(a);
    },

    stop(ev) {
      for (const a of activos.slice()) if (a.ev === ev) quitar(a);
    },

    // para pruebas: qué voces están sonando y por dónde van
    estado() {
      const c = ctx();
      return activos.map((a) => ({ src: a.ev.src, pos: a.offset + (c ? c.currentTime - a.startCtx : 0) }));
    },

    stopAll() {
      for (const a of activos.slice()) quitar(a);
    },

    // al reanudar o empezar a mitad de canción: arranca las que estarían sonando
    resumeAt(events, time) {
      for (const e of events) {
        if (e.type !== 'voz' || time < e.t) continue;
        const b = bufs[e.src];
        if (b instanceof AudioBuffer && time < e.t + b.duration) this.start(e, time);
      }
    },

    // cada frame: volumen al día y corrección si se desfasa de la canción
    tick(time, events) {
      // si alguna tenía que estar sonando pero su audio terminó de cargar recién, entra por donde va
      if (events)
        for (const e of events) {
          if (e.type !== 'voz' || time < e.t || activos.some((a) => a.ev === e)) continue;
          const b = bufs[e.src];
          if (b instanceof AudioBuffer && time < e.t + b.duration - 0.3) this.start(e, time);
        }
      if (!activos.length) return;
      const c = ctx();
      if (!c) return;
      const v = musicVol();
      for (const a of activos.slice()) {
        a.g.gain.setTargetAtTime(v * (a.ev.vol ?? 1), c.currentTime, 0.05);
        const pos = a.offset + (c.currentTime - a.startCtx);
        const want = time - a.ev.t;
        if (Math.abs(pos - want) > 0.12 && want < a.dur - 0.2) this.start(a.ev, time);
      }
    },
  };
})();
