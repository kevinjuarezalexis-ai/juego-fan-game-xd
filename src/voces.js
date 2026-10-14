// ══════════════════════════════════════
//   Voces / canciones de referencia encima de la música
// ══════════════════════════════════════
// Clips cortos (gritos, cancioncitas) que suenan en su momento exacto.
// Evento: { t, type: 'voz', src, vol }  (vol: multiplicador extra, default 1;
// el volumen "de fondo" ya viene puesto en el archivo).
// Usa elementos <audio> igual que la música: anda en celu (también con el
// modo silencio del iPhone), abriendo el index.html directo y en GitHub Pages.
// Siguen el reloj de la canción: pausa, reintento y ?t= los retoman donde van.

window.FB = window.FB || {};

(function () {
  const els = {}; // src -> <audio>
  const activos = new Set(); // eventos sonando

  function musicVol() {
    const A = window.Engine2D && Engine2D.Audio;
    if (!A) return 0.8;
    return Math.min(1, A.getVolume() * A.getMusicVolume() * 1.6);
  }
  function muted() {
    const A = window.Engine2D && Engine2D.Audio;
    return !!(A && A.isMuted && A.isMuted());
  }

  function el(src) {
    if (!els[src]) {
      const a = new Audio();
      a.preload = 'auto';
      a.src = src;
      a.load();
      els[src] = a;
    }
    return els[src];
  }

  function dur(ev) {
    const a = els[ev.src];
    return a && isFinite(a.duration) && a.duration > 0 ? a.duration : 0;
  }

  FB.Voces = {
    preload(events) {
      for (const e of events) if (e.type === 'voz') el(e.src);
    },

    // llamar dentro de un toque (botón Jugar): el celu deja que después suenen solos
    unlock(events) {
      for (const e of events) {
        if (e.type !== 'voz') continue;
        const a = el(e.src);
        if (a._unlocked) continue;
        a._unlocked = true;
        a.muted = true;
        const p = a.play();
        const done = () => {
          if (a._enUso) return; // ya arrancó de verdad mientras tanto
          a.pause();
          a.muted = false;
        };
        if (p && p.then) p.then(done, done);
        else done();
      }
    },

    // arranca la voz en la posición que le toca según el tiempo de canción
    start(ev, time) {
      const a = el(ev.src);
      const off = time - ev.t;
      const d = dur(ev);
      if (off < 0 || (d && off >= d - 0.05)) return;
      a._enUso = true;
      a.muted = muted();
      a.volume = Math.max(0, Math.min(1, musicVol() * (ev.vol ?? 1)));
      try {
        a.currentTime = off;
      } catch (e) {}
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
      activos.add(ev);
    },

    stop(ev) {
      const a = els[ev.src];
      if (a) {
        a._enUso = false;
        a.pause();
      }
      activos.delete(ev);
    },

    stopAll() {
      for (const ev of [...activos]) this.stop(ev);
    },

    // para pruebas: qué voces están sonando y por dónde van
    estado() {
      return [...activos].map((ev) => ({ src: ev.src, pos: els[ev.src] ? els[ev.src].currentTime : 0 }));
    },

    // al reanudar o empezar a mitad de canción: arranca las que estarían sonando
    resumeAt(events, time) {
      for (const e of events) {
        if (e.type !== 'voz' || time < e.t) continue;
        const d = dur(e);
        if (!d || time < e.t + d) this.start(e, time);
      }
    },

    // cada frame: entra la que toca, volumen al día y corrección si se desfasa
    tick(time, events) {
      if (events)
        for (const e of events) {
          if (activos.has(e) || time < e.t || time > e.t + 0.6) continue;
          this.start(e, time); // su momento (por si el evento se salteó)
        }
      const v = musicVol();
      const m = muted();
      for (const ev of [...activos]) {
        const a = els[ev.src];
        const d = dur(ev);
        const want = time - ev.t;
        if (a.ended || (d && want >= d)) {
          this.stop(ev);
          continue;
        }
        a.volume = Math.max(0, Math.min(1, v * (ev.vol ?? 1)));
        a.muted = m;
        if (!a.paused && Math.abs(a.currentTime - want) > 0.15) {
          try {
            a.currentTime = want;
          } catch (e) {}
        }
      }
    },
  };
})();
