// ══════════════════════════════════════
//   Logros
// ══════════════════════════════════════
// Se guardan en el navegador de cada jugador. En modo prueba (inmortal) no se desbloquean.
// Para agregar uno: sumalo a LISTA (id, titulo, desc, icon opcional) y desbloquealo con
// FB.Logros.unlock('id') donde corresponda (o en check / onSegmentEnd / onEnding).
// icon: ruta a una imagen (ej. 'src/assets/ui/logros/ratero.webp'); sin icono usa el trofeo.

window.FB = window.FB || {};

(function () {
  // 'pronto': la mecánica todavía no existe (se muestra igual, bloqueado)
  const LISTA = [
    { id: 'fiesta', icon: 'src/assets/ui/logros/fiesta.webp', titulo: 'La Fiesta de la Buena Vecindad', desc: 'Sobreviví a la Fiesta de la Buena Vecindad (derrotá al Chavo).' },
    { id: 'finmalo', icon: 'src/assets/ui/logros/finmalo.webp', titulo: 'No hubo Fiesta de la Buena Vecindad', desc: 'Conseguí el final malo: perdé la batalla final.' },
    { id: 'finbueno', icon: 'src/assets/ui/logros/finbueno.webp', titulo: 'Liberaste al Chavo', desc: 'Conseguí el final bueno: elegí la respuesta justa en cada diálogo.' },
    { id: 'teniaque', icon: 'src/assets/ui/logros/teniaque.webp', titulo: 'Tenía que ser el Chavo...', desc: 'Perdé contra el Chavo al principio.' },
    { id: 'escudo', icon: 'src/assets/ui/logros/escudo.webp', titulo: 'Mi escudo es un corazón', desc: 'Completá el juego sin perder.' },
    { id: 'peluchin', icon: 'src/assets/ui/logros/peluchin.webp', titulo: 'Peluchín chin chin', desc: 'Completá el rescate de la Chilindrina con todas las notas en ¡PERFECTO!.' },
    { id: 'tatata', icon: 'src/assets/ui/logros/tatata.webp', titulo: 'TA TA TAAA', desc: 'Perdé 10 veces seguidas en una parte.' },
    { id: 'pelota', icon: 'src/assets/ui/logros/pelota.webp', titulo: 'Mi Pelota Cuadrada', desc: 'Tené la suerte de que aparezca la Pelota Cuadrada de Quico.' },
    { id: 'pipipi', icon: 'src/assets/ui/logros/pipipi.webp', titulo: 'PIPIPIPI', desc: 'Lográ que el Chavo no se te acerque mucho (ganá la pelea final sin que pase la mitad del camino).' },
    { id: 'cinco', icon: 'src/assets/ui/logros/cinco.webp', titulo: '¡Eso, eso, eso!', desc: 'Completá el juego 5 veces.' },
    { id: 'vecino', icon: 'src/assets/ui/logros/vecino.webp', titulo: 'Verdadero Vecino de la Vecindad', desc: 'Completá los 10 logros.' },
  ];
  const KEY = 'fiesta-logros';

  let hechos = {};
  try {
    hechos = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch (e) {
    hechos = {};
  }
  function guardar() {
    try {
      localStorage.setItem(KEY, JSON.stringify(hechos));
    } catch (e) {}
  }

  // aviso arriba: "¡Logro desbloqueado!" (si hay varios, salen de a uno)
  const cola = [];
  let mostrando = false;
  function aviso(l) {
    cola.push(l);
    if (!mostrando) siguiente();
  }
  function siguiente() {
    const l = cola.shift();
    if (!l) return (mostrando = false);
    mostrando = true;
    setTimeout(siguiente, 3800);
    const box = document.getElementById('stage-box') || document.body;
    const d = document.createElement('div');
    d.className = 'logro-toast';
    d.innerHTML = '<span class="lt-ico"></span><span><small>¡Logro desbloqueado!</small><b></b></span>';
    d.querySelector('b').textContent = l.titulo;
    const ico = d.querySelector('.lt-ico');
    if (l.icon) (ico.style.backgroundImage = 'url(' + l.icon + ')'), (ico.style.backgroundSize = 'cover');
    box.appendChild(d);
    setTimeout(() => d.classList.add('out'), 3200);
    setTimeout(() => d.remove(), 3700);
    if (FB.SFX) FB.SFX.play('ganaste', { vol: 0.6 });
  }

  // estado de la partida actual
  let run = null;
  const KEY_FIN = 'fiesta-completados';
  function completados() {
    try {
      return +localStorage.getItem(KEY_FIN) || 0;
    } catch (e) {
      return 0;
    }
  }

  FB.Logros = {
    lista: LISTA,
    hecho: (id) => !!hechos[id],
    cuenta: () => LISTA.filter((l) => hechos[l.id]).length,

    unlock(id) {
      const g = window.game;
      if (g && g.testMode) return; // en modo prueba no cuentan
      if (hechos[id]) return;
      const l = LISTA.find((x) => x.id === id);
      if (!l) return;
      hechos[id] = Date.now();
      guardar();
      aviso(l);
      // el último: todos los demás
      if (id !== 'vecino' && LISTA.every((x) => x.id === 'vecino' || hechos[x.id])) this.unlock('vecino');
      this.render();
    },

    // al arrancar una partida (from = segundo de inicio)
    onStart(game, from) {
      run = { full: from === 0 && !game.testMode, parte: -1, seguidas: 0 };
    },

    // cada frame mientras se juega
    check(game, time) {
      if (!run || game.testMode) return;
      // si pasaste a otra parte, se corta la racha de derrotas
      const n = game.parte ? game.parte.n : -1;
      if (run.parte !== -1 && n !== run.parte) (run.parte = -1), (run.seguidas = 0);
    },

    onGameOver(game) {
      if (!run || game.testMode) return;
      const n = game.parte ? game.parte.n : -1;
      // perder contra el Chavo en su primera aparición (parte 3)
      if (game.parte && /chavo/i.test(game.parte.nombre) && game.parte.t < 200) this.unlock('teniaque');
      run.seguidas = run.parte === n ? run.seguidas + 1 : 1;
      run.parte = n;
      if (run.seguidas >= 10) this.unlock('tatata');
    },

    // cuando termina una parte con mecánica: snap = cómo estaban las estadísticas al empezar
    onSegmentEnd(game, mech, snap) {
      if (!mech || !snap || game.testMode) return;
      const s = game.stats;
      const R = FB.MECHANICS;
      // el baile de la Chilindrina con todas las notas en PERFECTO (jugado entero)
      if (R.rhythm && mech instanceof R.rhythm && mech.p.target === 'chilindrina' && !snap.desdeMitad) {
        const hits = s.notesHit - snap.notesHit;
        const perf = (s.notesPerfect || 0) - (snap.notesPerfect || 0);
        if (hits > 0 && perf === hits && s.notesMiss === snap.notesMiss) this.unlock('peluchin');
      }
    },

    // finales: 'normal' (derrotaste al Chavo), 'bueno' (además todas las respuestas clave), 'malo' (perdiste la pelea final)
    onEnding(game, tipo = 'normal') {
      if (game.testMode) return;
      const s = game.stats;
      if (tipo === 'malo') return this.unlock('finmalo');
      this.unlock('fiesta');
      if (tipo === 'bueno') this.unlock('finbueno');
      if (run && run.full && s.retries === 0) this.unlock('escudo');
      if (s.maxClose !== undefined && s.maxClose < 0.5) this.unlock('pipipi');
      // cuántas veces lo terminaste (en este navegador)
      const n = completados() + 1;
      try {
        localStorage.setItem(KEY_FIN, String(n));
      } catch (e) {}
      if (n >= 5) this.unlock('cinco');
    },

    // arma la lista del cartel de logros
    render() {
      const list = document.getElementById('logros-list');
      if (!list) return;
      document.getElementById('logros-cuenta').textContent =
        String(this.cuenta()).padStart(2, '0') + '/' + String(LISTA.length).padStart(2, '0');
      list.innerHTML = '';
      for (const l of LISTA) {
        const it = document.createElement('div');
        it.className = 'logro' + (hechos[l.id] ? ' ok' : '');
        it.innerHTML = '<span class="lg-ico"></span><span class="lg-txt"><b></b><small></small></span>';
        it.querySelector('b').textContent = l.titulo;
        it.querySelector('small').textContent = l.desc + (l.pronto ? ' (próximamente)' : '');
        if (l.icon) {
          const ic = it.querySelector('.lg-ico');
          ic.style.backgroundImage = 'url(' + l.icon + ')';
          ic.style.backgroundSize = 'cover';
        }
        list.appendChild(it);
      }
    },

    // para probar: FB.Logros.reset() en la consola
    reset() {
      hechos = {};
      guardar();
      this.render();
    },
  };
})();
