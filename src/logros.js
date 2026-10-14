// ══════════════════════════════════════
//   Logros
// ══════════════════════════════════════
// Se guardan en el navegador de cada jugador. En modo prueba (inmortal) no se desbloquean.
// Para agregar uno: sumalo a LISTA (id, titulo, desc, icon opcional) y desbloquealo con
// FB.Logros.unlock('id') donde corresponda (o en check / onSegmentEnd / onEnding).
// icon: ruta a una imagen (ej. 'src/assets/ui/logros/ratero.webp'); sin icono usa el trofeo.

window.FB = window.FB || {};

(function () {
  const LISTA = [
    { id: 'empezar', titulo: '¡Bienvenido a la vecindad!', desc: 'Empezá la fiesta.' },
    { id: 'ratero', titulo: '¡Ratero!', desc: 'Sobreviví al encuentro con el Chavo.' },
    { id: 'peluchin', titulo: 'Peluchín chin chin', desc: 'Bailá con la Chilindrina sin fallar ninguna flecha.' },
    { id: 'eso', titulo: '¡Eso, eso, eso!', desc: 'Contestá bien 10 preguntas seguidas.' },
    { id: 'intocable', titulo: 'Intocable', desc: 'Terminá una pelea en la caja sin recibir ni un golpe.' },
    { id: 'rescate', titulo: 'Rescate perfecto', desc: 'Liberá a un vecino con la barra llena.' },
    { id: 'unidos', titulo: 'La vecindad unida', desc: 'Liberá a todos los vecinos con la barra llena en una misma partida.' },
    { id: 'fin', titulo: 'Fin de la fiesta', desc: 'Llegá al final de la canción.' },
    { id: 'descansa', titulo: 'Descansa en paz', desc: 'Derrotá al espíritu que poseía al Chavo.' },
    { id: 'sinperder', titulo: 'Sin perder ni una', desc: 'Terminá el juego desde el principio sin perder ninguna vez.' },
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
    if (l.icon) ico.style.backgroundImage = 'url(' + l.icon + ')';
    box.appendChild(d);
    setTimeout(() => d.classList.add('out'), 3200);
    setTimeout(() => d.remove(), 3700);
    if (FB.SFX) FB.SFX.play('ganaste', { vol: 0.6 });
  }

  // estado de la partida actual (para los logros que miran cosas de toda la partida)
  let run = null;

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
      this.render();
    },

    // al arrancar una partida (from = segundo de inicio)
    onStart(game, from) {
      run = { full: from === 0 && !game.testMode, racha: 0, good: 0, bad: 0, ratero: from > 166 };
    },

    // cada frame mientras se juega
    check(game, time) {
      if (!run || game.testMode) return;
      const s = game.stats;
      if (time > 0.5) this.unlock('empezar');
      if (!run.ratero && time >= 167) (run.ratero = true), this.unlock('ratero');
      // racha de respuestas buenas
      if (s.answersBad > run.bad) (run.racha = 0), (run.bad = s.answersBad);
      if (s.answersGood > run.good) {
        run.racha += s.answersGood - run.good;
        run.good = s.answersGood;
        if (run.racha >= 10) this.unlock('eso');
      }
    },

    // cuando termina una parte con mecánica: snap = cómo estaban las estadísticas al empezar
    onSegmentEnd(game, mech, snap) {
      if (!mech || !snap || game.testMode) return;
      const s = game.stats;
      const dur = (mech.t1 || 0) - (mech.t0 || 0);
      const R = FB.MECHANICS;
      // baile sin fallar (el de la Chilindrina)
      if (R.rhythm && mech instanceof R.rhythm && mech.p.target === 'chilindrina' && !snap.desdeMitad) {
        if (s.notesHit > snap.notesHit && s.notesMiss === snap.notesMiss) this.unlock('peluchin');
      }
      // pelea en caja sin recibir golpes (que dure algo, y jugada desde el principio)
      const conCaja = (R.bulletbox && mech instanceof R.bulletbox) || (R.rescue && mech instanceof R.rescue && mech.box);
      if (conCaja && !mech.noFadeOut && dur >= 8 && !snap.desdeMitad && s.hits === snap.hits) {
        this.unlock('intocable');
      }
      // rescate con la barra llena
      if (R.rescue && mech instanceof R.rescue && mech.meter >= 0.999) this.unlock('rescate');
    },

    // final de la canción
    onEnding(game) {
      if (game.testMode) return;
      const s = game.stats;
      this.unlock('fin');
      if (s.bossDefeated) this.unlock('descansa');
      if (run && run.full && s.retries === 0) this.unlock('sinperder');
      // todos los rescates con la barra llena
      const objetivos = new Set();
      for (const seg of game.song.segments) if (seg.mechanic && seg.mechanic.type === 'rescue') objetivos.add(seg.mechanic.target);
      const r = s.rescue || {};
      if (run && run.full && objetivos.size && [...objetivos].every((id) => (r[id] || 0) >= 0.999)) this.unlock('unidos');
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
        it.querySelector('small').textContent = l.desc;
        if (l.icon) it.querySelector('.lg-ico').style.backgroundImage = 'url(' + l.icon + ')';
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
