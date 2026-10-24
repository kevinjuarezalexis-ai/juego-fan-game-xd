// ══════════════════════════════════════
//   Controles táctiles + ajustes + modo prueba
// ══════════════════════════════════════
// - En celular/tablet aparecen controles según la mecánica que esté activa:
//     caja de combate → palanca · ritmo → un botón por carril (◀ ▶ ENTER)
//     pelea final → BLOQUEAR / DISPARAR · respuestas → se tocan en la pantalla
// - ⚙ ajustes: volumen y pantalla completa (en compu y celu)
// - Modo prueba: inmortal + tiempo en pantalla + botón MARCAR
// Los botones "aprietan" las mismas acciones que el teclado (input.state + onAction).

(function () {
  const $ = (id) => document.getElementById(id);
  const isTouch = () => window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

  function press(game, a) {
    game.input.state[a] = true;
    game.onAction(a);
  }
  function release(game, a) {
    game.input.state[a] = false;
  }

  // botón que mantiene apretada una acción mientras el dedo está encima
  function holdButton(el, game, action) {
    const down = (e) => {
      e.preventDefault();
      el.classList.add('on');
      press(game, action);
    };
    const up = (e) => {
      e.preventDefault();
      el.classList.remove('on');
      release(game, action);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
  }

  // palanca analógica → flechas (con zona muerta)
  function joystick(el, knob, game) {
    let id = null;
    const dirs = ['left', 'right', 'up', 'down'];
    const set = (dx, dy) => {
      const dead = 0.28;
      game.input.state.left = dx < -dead;
      game.input.state.right = dx > dead;
      game.input.state.up = dy < -dead;
      game.input.state.down = dy > dead;
    };
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const R = r.width / 2;
      let dx = (e.clientX - (r.left + R)) / R;
      let dy = (e.clientY - (r.top + R)) / R;
      const len = Math.hypot(dx, dy);
      if (len > 1) (dx /= len), (dy /= len);
      knob.style.transform = 'translate(' + dx * R * 0.55 + 'px,' + dy * R * 0.55 + 'px)';
      set(dx, dy);
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      id = e.pointerId;
      el.setPointerCapture(id);
      move(e);
    });
    el.addEventListener('pointermove', (e) => e.pointerId === id && move(e));
    const end = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      knob.style.transform = '';
      for (const d of dirs) game.input.state[d] = false;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  // qué controles mostrar según la mecánica actual
  function modeOf(game) {
    if (game.state !== 'playing' || !game.mechanic) return 'none';
    const M = FB.MECHANICS;
    const m = game.mechanic;
    if (M.finalfight && m instanceof M.finalfight) return 'both';
    if (M.blockshoot && m instanceof M.blockshoot) return 'fight';
    if (M.rhythm && m instanceof M.rhythm) return 'lanes';
    if (M.bulletbox && m instanceof M.bulletbox) return 'stick';
    if (M.rescue && m instanceof M.rescue && m.box) return 'stick';
    return 'none';
  }

  const LANE_LABEL = { left: '◀', right: '▶', up: '▲', down: '▼', confirm: 'ENTER' };

  function buildLanes(game, lanes) {
    const box = $('t-lanes');
    if (box.dataset.lanes === lanes.join(',')) return;
    box.dataset.lanes = lanes.join(',');
    box.innerHTML = '';
    for (const a of lanes) {
      const b = document.createElement('button');
      b.className = 't-btn' + (a === 'confirm' ? ' t-wide' : '');
      b.textContent = LANE_LABEL[a] || a;
      holdButton(b, game, a);
      box.appendChild(b);
    }
  }

  FB.Mobile = {
    init(game) {
      const touch = isTouch();
      document.body.classList.toggle('is-touch', touch);

      // ── controles táctiles ──
      joystick($('t-stick'), $('t-knob'), game);
      holdButton($('t-block'), game, 'block');
      holdButton($('t-shoot'), game, 'confirm');
      $('t-pause').addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (game.state === 'playing') game.pause();
      });
      $('t-mark').addEventListener('pointerdown', (e) => {
        e.preventDefault();
        game.onAction('mark');
        $('t-mark').classList.add('on');
        setTimeout(() => $('t-mark').classList.remove('on'), 150);
      });

      let last = '';
      setInterval(() => {
        const mode = touch ? modeOf(game) : 'none';
        const playing = game.state === 'playing' || game.state === 'intro';
        if (mode === 'lanes') buildLanes(game, game.mechanic.lanes || []);
        const key = mode + playing + game.testMode;
        if (key === last) return;
        last = key;
        $('t-stick').classList.toggle('hidden', mode !== 'stick' && mode !== 'both');
        $('t-lanes').classList.toggle('hidden', mode !== 'lanes');
        $('t-fight').classList.toggle('hidden', mode !== 'fight' && mode !== 'both');
        $('t-pause').classList.toggle('hidden', !(touch && playing));
        $('t-mark').classList.toggle('hidden', !(game.testMode && playing));
        // el ⚙ sólo en los menús (jugando se entra desde la pausa)
        $('btn-ajustes').classList.toggle('hidden', playing);
        // al cambiar de mecánica, soltar todo lo que quedó apretado
        for (const a of ['left', 'right', 'up', 'down', 'confirm', 'block']) game.input.state[a] = false;
      }, 120);

      // ── ajustes ──
      const vol = $('aj-vol');
      vol.value = Math.round(Engine2D.Audio.getVolume() * 100);
      $('aj-vol-n').textContent = vol.value + '%';
      vol.addEventListener('input', () => {
        Engine2D.Audio.setVolume(vol.value / 100);
        $('aj-vol-n').textContent = vol.value + '%';
        game.conductor._applyVolume();
      });
      // volumen de efectos de sonido (aparte de la música)
      const sfx = $('aj-sfx');
      if (sfx) {
        sfx.value = Math.round(Engine2D.Audio.getSfxVolume() * 100);
        $('aj-sfx-n').textContent = sfx.value + '%';
        let probe = 0;
        sfx.addEventListener('input', () => {
          Engine2D.Audio.setSfxVolume(sfx.value / 100);
          $('aj-sfx-n').textContent = sfx.value + '%';
          // un "tic" de muestra para escuchar cómo queda (no más de uno cada 120 ms)
          const now = performance.now();
          if (FB.SFX && now - probe > 120) (probe = now), FB.SFX.play('click', { gap: 0 });
        });
      }
      const fsBtn = $('aj-fs');
      const fsLabel = () => (fsBtn.textContent = document.fullscreenElement ? 'Salir de pantalla completa' : 'Pantalla completa');
      fsLabel();
      document.addEventListener('fullscreenchange', fsLabel);
      fsBtn.onclick = async () => {
        try {
          if (document.fullscreenElement) await document.exitFullscreen();
          else {
            const el = document.documentElement;
            await (el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen());
            if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
          }
        } catch (e) {
          $('aj-msg').textContent = 'Tu navegador no deja usar pantalla completa (en iPhone: Compartir → Agregar a inicio).';
        }
      };
      // calidad alta / baja
      const calBtn = $('aj-calidad');
      const calTxt = () => (calBtn.textContent = 'Calidad: ' + (FB.Calidad.get() === 'baja' ? 'Baja (más fluido)' : 'Alta'));
      calTxt();
      calBtn.onclick = () => {
        game.setCalidad(FB.Calidad.get() === 'baja' ? 'alta' : 'baja');
        calTxt();
      };
      let from = null;
      $('btn-ajustes').onclick = () => {
        // durante el juego, pausa y vuelve a la pausa al cerrar
        if (game.state === 'playing') game.pause();
        from = game.state === 'paused' ? 'pause' : 'menu';
        calTxt(); // por si la calidad cambió sola
        UI.show('ajustes');
      };
      $('aj-cerrar').onclick = () => {
        UI.show((FB.Mobile.from || from) === 'pause' ? 'pause' : 'menu');
        FB.Mobile.from = null;
      };
      $('btn-pausa-ajustes').onclick = () => {
        from = 'pause';
        FB.Mobile.from = 'pause';
        UI.show('ajustes');
      };

      // ── copiar marcas (modo prueba, desde la pausa) ──
      $('btn-copiar-marcas').onclick = async () => {
        const txt = game.marks.map((m) => FB.fmtTime(m) + '  ' + m.toFixed(2)).join('\n');
        try {
          await navigator.clipboard.writeText(txt);
          $('btn-copiar-marcas').textContent = '¡Copiadas!';
        } catch (e) {
          window.prompt('Copiá las marcas:', txt.replace(/\n/g, ' | '));
        }
        setTimeout(() => ($('btn-copiar-marcas').textContent = 'Copiar marcas'), 1500);
      };
    },

    // la pausa muestra "Copiar marcas" sólo si hay marcas
    onPause(game) {
      $('btn-copiar-marcas').classList.toggle('hidden', !game.marks.length);
    },
  };
})();
