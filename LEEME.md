# Fiesta de la Buena Vecindad (fan game)

Abrilo con Live Server (o cualquier servidor local) → `index.html`.

## Estructura
- `src/config/song.js` → **timeline**: partes, segmentos (qué mecánica en cada momento), eventos y subtítulos. Casi todo el juego se arma acá.
- `src/config/characters.js` → personajes, estados, rutas de sprites y fondos.
- `src/core/conductor.js` → reloj sincronizado con la música (beat/BPM).
- `src/core/stage.js` → escenario estilo FNF (fondo + bop al ritmo + efectos de terror).
- `src/mechanics/` → `bulletbox` (caja Undertale), `rhythm` (flechas cortas), `choice` (3 opciones con cronómetro), `blockshoot` (pelea final).
- `src/game.js` → loop, HUD, menús.

## Música
Poné el audio en `src/assets/music/fiesta.mp3`. Sin archivo, el juego corre con un reloj interno.

## Sacar los tiempos reales
1. Abrí `index.html?debug`.
2. Jugá con la música y apretá **M** en cada cambio (entrada de un personaje, el drop, etc.).
3. Los tiempos aparecen arriba a la derecha (y en la consola). Pasalos a `song.js`.
- `index.html?t=72` arranca directo en el segundo 72. **F2** muestra/oculta el debug.
- BPM: ponelo en `song.js` (`bpm`) y ajustá `offset` hasta que el punto blanco del debug titile con el golpe.

## Sprites
Rutas en `characters.js` (ej. `src/assets/personaje/chavo_revelado.png`). Si no existe, se ve una silueta placeholder.
- Imagen suelta → pose idle; el bop al ritmo lo hace el código.
- `{ src, frames, fps }` → tira horizontal; la animación arranca en cada beat (como el idle de FNF).
- `flip: true` en el personaje si mira para el lado equivocado.

## Controles
Flechas/WASD mover y flechas de ritmo · 1/2/3 o ↑↓+Z elegir · X bloquear · Z disparar · Esc pausa
