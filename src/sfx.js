// ══════════════════════════════════════
//   Efectos de sonido sintetizados (sin archivos)
// ══════════════════════════════════════
// Se generan en el momento con el sintetizador del navegador (Web Audio).
// Respetan el volumen general y el de efectos de Ajustes, y el mute.
// Uso: FB.SFX.play('golpe')  ·  nombres disponibles: ver SOUNDS más abajo.

window.FB = window.FB || {};

(function () {
  let ctx = null;
  let noiseBuf = null;
  const last = {}; // anti-spam: tiempo del último disparo de cada sonido

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      // ruido blanco para golpes / whoosh
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function volume() {
    const A = window.Engine2D && Engine2D.Audio;
    if (!A) return 0.6;
    if (A.isMuted && A.isMuted()) return 0;
    const sfx = A.getSfxVolume ? A.getSfxVolume() : 0.8;
    return A.getVolume() * sfx;
  }

  // ── piezas básicas ──
  // tono con envolvente (type: sine | square | triangle | sawtooth), con barrido de frecuencia opcional
  function tone(c, out, { f = 440, f2 = null, type = 'sine', t = 0, dur = 0.15, vol = 0.3, attack = 0.005 }) {
    const o = c.createOscillator();
    const g = c.createGain();
    const t0 = c.currentTime + t;
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(out);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }
  // ruido filtrado (golpes, whoosh, chispas)
  function noise(c, out, { t = 0, dur = 0.2, vol = 0.3, freq = 1200, freq2 = null, q = 1, type = 'bandpass', attack = 0.005 }) {
    const s = c.createBufferSource();
    s.buffer = noiseBuf;
    const fl = c.createBiquadFilter();
    fl.type = type;
    fl.Q.value = q;
    const g = c.createGain();
    const t0 = c.currentTime + t;
    fl.frequency.setValueAtTime(freq, t0);
    if (freq2) fl.frequency.exponentialRampToValueAtTime(freq2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(fl).connect(g).connect(out);
    s.start(t0, Math.random() * 0.5);
    s.stop(t0 + dur + 0.02);
  }

  // ── los sonidos ──
  const SOUNDS = {
    // menú
    hover: (c, o) => tone(c, o, { f: 900, f2: 1200, type: 'triangle', dur: 0.05, vol: 0.08 }),
    click: (c, o) => {
      tone(c, o, { f: 520, f2: 760, type: 'square', dur: 0.07, vol: 0.12 });
      tone(c, o, { f: 1040, type: 'triangle', t: 0.03, dur: 0.06, vol: 0.06 });
    },
    abrir: (c, o) => {
      noise(c, o, { dur: 0.22, vol: 0.18, freq: 400, freq2: 2600, q: 0.8 });
      tone(c, o, { f: 300, f2: 640, type: 'triangle', t: 0.12, dur: 0.12, vol: 0.12 }); // "boing" del rebote
    },
    cerrar: (c, o) => noise(c, o, { dur: 0.16, vol: 0.14, freq: 2200, freq2: 300, q: 0.8 }),
    perdiste: (c, o) => {
      [392, 370, 349, 262].forEach((f, i) => tone(c, o, { f, f2: i === 3 ? 180 : null, type: 'triangle', t: i * 0.22, dur: i === 3 ? 0.7 : 0.2, vol: 0.22 }));
    },
    ganaste: (c, o) => {
      [523, 659, 784, 1047].forEach((f, i) => tone(c, o, { f, type: 'square', t: i * 0.11, dur: i === 3 ? 0.5 : 0.12, vol: 0.12 }));
      noise(c, o, { t: 0.33, dur: 0.5, vol: 0.06, freq: 6000, q: 0.5, type: 'highpass' });
    },
    // combate
    golpe: (c, o) => {
      tone(c, o, { f: 180, f2: 55, type: 'sine', dur: 0.22, vol: 0.5 }); // panzazo grave
      noise(c, o, { dur: 0.12, vol: 0.32, freq: 900, q: 1.2 }); // crack
    },
    bloqueo: (c, o) => {
      tone(c, o, { f: 1400, type: 'square', dur: 0.12, vol: 0.12 });
      tone(c, o, { f: 2100, type: 'triangle', dur: 0.25, vol: 0.1 });
      noise(c, o, { dur: 0.08, vol: 0.2, freq: 4000, q: 2 });
    },
    disparo: (c, o) => {
      noise(c, o, { dur: 0.35, vol: 0.55, freq: 1500, freq2: 120, q: 0.7, type: 'lowpass', attack: 0.002 });
      tone(c, o, { f: 140, f2: 40, type: 'sine', dur: 0.25, vol: 0.45 });
    },
    critico: (c, o) => {
      tone(c, o, { f: 880, f2: 1760, type: 'square', dur: 0.12, vol: 0.12 });
      tone(c, o, { f: 1320, type: 'triangle', t: 0.08, dur: 0.18, vol: 0.1 });
    },
    // respuestas
    bien: (c, o) => {
      tone(c, o, { f: 784, type: 'triangle', dur: 0.12, vol: 0.18 });
      tone(c, o, { f: 1175, type: 'triangle', t: 0.09, dur: 0.22, vol: 0.18 });
    },
    mal: (c, o) => {
      tone(c, o, { f: 220, f2: 150, type: 'sawtooth', dur: 0.3, vol: 0.12 });
      tone(c, o, { f: 233, f2: 155, type: 'square', dur: 0.3, vol: 0.06 });
    },
    // ritmo: la nota se te pasó
    falla: (c, o) => {
      tone(c, o, { f: 160, f2: 90, type: 'square', dur: 0.14, vol: 0.12 });
      noise(c, o, { dur: 0.08, vol: 0.1, freq: 500, q: 1 });
    },
    // teletransporte (destellito)
    tp: (c, o) => {
      tone(c, o, { f: 600, f2: 2400, type: 'sine', dur: 0.14, vol: 0.1 });
      noise(c, o, { dur: 0.14, vol: 0.06, freq: 5000, q: 1, type: 'highpass' });
    },
    // portón de madera abriéndose: chirrido de bisagra + golpe al final
    porton: (c, o) => {
      // chirrido: diente de sierra que tiembla, filtrado como madera/metal viejo
      const osc = c.createOscillator();
      const lfo = c.createOscillator();
      const lfoG = c.createGain();
      const bp = c.createBiquadFilter();
      const g = c.createGain();
      const t0 = c.currentTime;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, t0);
      osc.frequency.linearRampToValueAtTime(420, t0 + 0.6);
      osc.frequency.linearRampToValueAtTime(330, t0 + 1.1);
      lfo.frequency.value = 23;
      lfoG.gain.value = 35;
      lfo.connect(lfoG).connect(osc.frequency);
      bp.type = 'bandpass';
      bp.frequency.value = 1300;
      bp.Q.value = 4;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.08);
      g.gain.setValueAtTime(0.16, t0 + 0.8);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.15);
      osc.connect(bp).connect(g).connect(o);
      osc.start(t0);
      lfo.start(t0);
      osc.stop(t0 + 1.2);
      lfo.stop(t0 + 1.2);
      // el portón golpea contra la pared
      tone(c, o, { f: 110, f2: 50, type: 'sine', t: 1.12, dur: 0.35, vol: 0.45 });
      noise(c, o, { t: 1.12, dur: 0.18, vol: 0.22, freq: 600, q: 0.8, type: 'lowpass' });
    },
    // empieza a liberarse (brillo que sube)
    liberar: (c, o) => {
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(c, o, { f, type: 'sine', t: i * 0.09, dur: 0.35, vol: 0.09 }));
      noise(c, o, { dur: 0.8, vol: 0.05, freq: 7000, q: 0.6, type: 'highpass' });
    },
  };

  // ── ambientes (sonido de fondo continuo) ──
  // 'calle': rumor de ciudad, autos que pasan de vez en cuando y pajaritos
  const amb = {};
  function ambVolume() {
    const A = window.Engine2D && Engine2D.Audio;
    if (!A) return 0.5;
    if (A.isMuted && A.isMuted()) return 0;
    return A.getVolume() * (A.getSfxVolume ? A.getSfxVolume() : 0.8);
  }
  function startCalle(c) {
    const master = c.createGain();
    master.gain.value = 0.0001;
    master.connect(c.destination);
    // rumor de ciudad: ruido grave y suave que respira
    const s = c.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 380;
    const hum = c.createGain();
    hum.gain.value = 0.22;
    const lfo = c.createOscillator();
    const lfoG = c.createGain();
    lfo.frequency.value = 0.13;
    lfoG.gain.value = 0.08;
    lfo.connect(lfoG).connect(hum.gain);
    s.connect(lp).connect(hum).connect(master);
    s.start();
    lfo.start();
    const timers = [];
    // pajarito: 2 a 5 trinos rápidos
    const pajaro = () => {
      const base = 2600 + Math.random() * 1800;
      const n = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        const t = i * (0.09 + Math.random() * 0.05);
        tone(c, master, { f: base * (0.9 + Math.random() * 0.25), f2: base * (1.25 + Math.random() * 0.3), type: 'sine', t, dur: 0.07, vol: 0.05 + Math.random() * 0.03 });
      }
      timers.push(setTimeout(pajaro, 900 + Math.random() * 2600));
    };
    // auto que pasa: ruido que sube y baja con un leve cambio de tono
    const auto = () => {
      const d = 2.2 + Math.random() * 1.5;
      noise(c, master, { dur: d, vol: 0.16, freq: 250, freq2: 600, q: 0.6, type: 'lowpass', attack: d * 0.45 });
      tone(c, master, { f: 70 + Math.random() * 20, f2: 55, type: 'sawtooth', dur: d, vol: 0.02, attack: d * 0.45 });
      timers.push(setTimeout(auto, 5000 + Math.random() * 7000));
    };
    timers.push(setTimeout(pajaro, 300));
    timers.push(setTimeout(auto, 1800 + Math.random() * 2500));
    // el volumen sigue a Ajustes
    const vt = setInterval(() => master.gain.setTargetAtTime(ambVolume() * 0.9, c.currentTime, 0.3), 400);
    master.gain.setTargetAtTime(ambVolume() * 0.9, c.currentTime, 0.6); // entra suave
    return {
      stop() {
        timers.forEach(clearTimeout);
        clearInterval(vt);
        master.gain.setTargetAtTime(0.0001, c.currentTime, 0.35); // se va suave
        setTimeout(() => {
          try {
            s.stop();
            lfo.stop();
          } catch (e) {}
          master.disconnect();
        }, 1600);
      },
    };
  }
  const AMBIENTES = { calle: startCalle };

  FB.SFX = {
    // FB.SFX.ambient('calle', true) prende · FB.SFX.ambient('calle', false) apaga (con fundido)
    ambient(name, on) {
      if (!on) {
        if (amb[name]) amb[name].stop();
        delete amb[name];
        return;
      }
      if (amb[name] || !AMBIENTES[name]) return;
      const c = audio();
      if (!c) return;
      amb[name] = AMBIENTES[name](c);
    },
    ambientOff() {
      for (const k in amb) this.ambient(k, false);
    },
    play(name, opts = {}) {
      const fn = SOUNDS[name];
      if (!fn) return;
      const v = volume() * (opts.vol ?? 1);
      if (v <= 0.001) return;
      const now = performance.now();
      if (last[name] && now - last[name] < (opts.gap ?? 45)) return; // no amontonar
      last[name] = now;
      const c = audio();
      if (!c) return;
      const out = c.createGain();
      out.gain.value = Math.min(1.5, v * 1.1);
      out.connect(c.destination);
      try {
        fn(c, out);
      } catch (e) {}
      setTimeout(() => out.disconnect(), 2500);
    },
    // el navegador solo deja sonar después de un toque: se "despierta" en el primero
    unlock() {
      audio();
    },
    names: Object.keys(SOUNDS),
    // para escucharlos todos de corrido (prueba): devuelve un WAV
    async demo() {
      const names = Object.keys(SOUNDS);
      const sr = 44100;
      const oc = new OfflineAudioContext(1, sr * names.length * 1.1, sr);
      const nb = oc.createBuffer(1, sr, sr);
      const d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const keep = noiseBuf;
      noiseBuf = nb;
      names.forEach((n, i) => {
        const out = oc.createGain();
        out.gain.value = 0.9;
        out.connect(oc.destination);
        // los sonidos usan c.currentTime: se corre cada uno a su lugar
        const shifted = new Proxy(oc, { get: (o, k) => (k === 'currentTime' ? i * 1.1 : typeof o[k] === 'function' ? o[k].bind(o) : o[k]) });
        SOUNDS[n](shifted, out);
      });
      const buf = await oc.startRendering();
      noiseBuf = keep;
      const pcm = buf.getChannelData(0);
      const dv = new DataView(new ArrayBuffer(44 + pcm.length * 2));
      const w = (o, str) => [...str].forEach((ch, k) => dv.setUint8(o + k, ch.charCodeAt(0)));
      w(0, 'RIFF'); dv.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVEfmt ');
      dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
      dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
      w(36, 'data'); dv.setUint32(40, pcm.length * 2, true);
      for (let i = 0; i < pcm.length; i++) dv.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 32767, true);
      return { names, wav: new Uint8Array(dv.buffer) };
    },
  };

  window.addEventListener('pointerdown', () => FB.SFX.unlock(), { once: true });
  window.addEventListener('keydown', () => FB.SFX.unlock(), { once: true });
})();
