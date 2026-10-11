// ══════════════════════════════════════
//   Música del menú principal
// ══════════════════════════════════════
// Suena en loop mientras estás en el menú (y en "Partes" / "Ajustes" desde el menú).
// Al arrancar a jugar baja con un fade y se pausa; al volver al menú arranca de nuevo.
// Los navegadores no dejan reproducir sonido sin que el jugador toque algo antes:
// si está bloqueada, arranca con el primer click / tecla.

(function () {
  const FADE = 0.6; // segundos de fade

  window.addEventListener('DOMContentLoaded', () => {
    const src = FB.SONG && FB.SONG.menuMusic;
    if (!src || !window.game) return;
    const game = window.game;
    const a = new Audio(src);
    a.loop = true;
    a.preload = 'auto';
    FB.menuMusic = a; // para la consola
    let level = 0; // 0..1 (fade)
    let last = performance.now();

    const target = () => {
      const A = Engine2D.Audio;
      return Math.max(0, Math.min(1, A.getVolume() * A.getMusicVolume() * 1.6));
    };
    const tryPlay = () => {
      if (!a.paused) return;
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
    };

    // primer toque/tecla: desbloquea el audio si el navegador lo frenó
    const unlock = () => game.state === 'menu' && tryPlay();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    (function tick() {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      const on = game.state === 'menu';
      if (on) {
        if (a.paused) {
          if (level === 0) a.currentTime = 0; // volvió al menú: arranca desde el principio
          tryPlay();
        }
        level = Math.min(1, level + dt / FADE);
      } else {
        level = Math.max(0, level - dt / FADE);
        if (level === 0 && !a.paused) a.pause();
      }
      a.volume = target() * level;
      a.muted = Engine2D.Audio.isMuted();
      requestAnimationFrame(tick);
    })();
  });
})();
