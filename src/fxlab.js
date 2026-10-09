// ══════════════════════════════════════
//   Laboratorio de efectos (index.html?fx)
// ══════════════════════════════════════
// Panel para probar los efectos en vivo con la música sonando. Cada botón
// dispara el efecto y anota la línea lista para pegar en song.js → events,
// con el tiempo exacto en que lo apretaste.

window.addEventListener('DOMContentLoaded', () => {
  if (!new URLSearchParams(location.search).has('fx')) return;

  const opp = () => Object.keys(game.stage.actors)[0] || 'chavo';
  const groups = [
    ['Zoom', [
      ['1.0', { type: 'zoom', to: 1, dur: 0.5 }],
      ['1.2', { type: 'zoom', to: 1.2, dur: 0.5 }],
      ['1.4', { type: 'zoom', to: 1.4, dur: 0.3, ease: 'back' }],
      ['0.9', { type: 'zoom', to: 0.9, dur: 0.5 }],
    ]],
    ['Zoom rítmico', [
      ['c/1 beat', { type: 'bump', every: 1, amount: 0.03 }],
      ['c/2', { type: 'bump', every: 2, amount: 0.04 }],
      ['c/4', { type: 'bump', every: 4, amount: 0.05 }],
      ['off', { type: 'bump', every: 0 }],
      ['golpe', { type: 'bump', amount: 0.08 }],
    ]],
    ['Cámara', [
      ['← izq', { type: 'focus', on: 'left', dur: 0.6 }],
      ['centro', { type: 'focus', on: 'center', dur: 0.6 }],
      ['der →', { type: 'focus', on: 'right', dur: 0.6 }],
      ['rival', () => ({ type: 'focus', on: opp(), zoom: 1.3, dur: 0.6 })],
      ['Jirafales', { type: 'focus', on: 'jirafales', zoom: 1.3, dur: 0.6 }],
      ['incl -4°', { type: 'tilt', deg: -4, dur: 0.4 }],
      ['incl 0', { type: 'tilt', deg: 0, dur: 0.4 }],
    ]],
    ['Temblor', [
      ['suave', { type: 'shake', power: 5, dur: 0.3 }],
      ['fuerte', { type: 'shake', power: 18, dur: 0.6 }],
      ['flash', { type: 'flash', dur: 0.4 }],
    ]],
    ['Filtro', [
      ['normal', { type: 'filter', mode: 'none', dur: 0.4 }],
      ['gris', { type: 'filter', mode: 'gris', dur: 0.4 }],
      ['B y N', { type: 'filter', mode: 'bn', dur: 0.2 }],
      ['ByN + rival color', () => ({ type: 'filter', mode: 'bn', dur: 0.2, keep: [opp()] })],
    ]],
    ['Sprite', [
      ['rival blanco', () => ({ type: 'flashSprite', char: opp(), dur: 0.35, shake: 8 })],
      ['Jirafales blanco', { type: 'flashSprite', char: 'jirafales', dur: 0.35, shake: 8 }],
    ]],
  ];

  const css = document.createElement('style');
  css.textContent = `
  #fxlab{position:fixed;top:8px;right:8px;z-index:50;width:250px;max-height:calc(100vh - 16px);overflow:auto;
    background:rgba(10,10,14,.92);border:1px solid #444;border-radius:8px;padding:8px;font:12px monospace;color:#ddd}
  #fxlab h4{margin:8px 0 4px;color:#ffd23f;font-size:11px}
  #fxlab button{margin:2px;padding:4px 6px;font:11px monospace;background:#222;color:#fff;border:1px solid #555;border-radius:4px;cursor:pointer}
  #fxlab button:hover{background:#333}
  #fxlab textarea{width:100%;height:130px;margin-top:6px;background:#000;color:#7dff9a;font:10px monospace;border:1px solid #333}
  #fxlab .x{float:right}`;
  document.head.appendChild(css);

  const box = document.createElement('div');
  box.id = 'fxlab';
  box.innerHTML = '<b>Efectos</b> <button class="x" id="fx-hide">–</button><div id="fx-body"></div>';
  document.body.appendChild(box);
  const body = box.querySelector('#fx-body');

  const out = document.createElement('textarea');
  out.placeholder = 'Las líneas para song.js → events aparecen acá';

  for (const [title, btns] of groups) {
    const h = document.createElement('h4');
    h.textContent = title;
    body.appendChild(h);
    for (const [label, def] of btns) {
      const b = document.createElement('button');
      b.textContent = label;
      b.onclick = () => {
        if (game.state !== 'playing') return;
        const ev = { t: +game.conductor.time.toFixed(2), ...(typeof def === 'function' ? def() : def) };
        game.runEvent(ev);
        out.value += JSON.stringify(ev).replace(/"(\w+)":/g, '$1: ').replace(/"/g, "'").replace(/,/g, ', ') + ',\n';
        out.scrollTop = out.scrollHeight;
        b.blur(); // que Espacio/Enter no vuelvan a apretar el botón
      };
      body.appendChild(b);
    }
  }
  body.appendChild(out);
  box.querySelector('#fx-hide').onclick = () => {
    body.hidden = !body.hidden;
  };
});
