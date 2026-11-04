# The build engine

The build is the real engine from `DhvanilPatel/swarm-cursors`, vendored at
`site/vendor/swarm.js` and loaded after the draw-X gate.

Flow:

1. Gate unlocks, the page settles for 950ms. `loadSwarmEngine()` snaps the X to
   its final position and forces the content to full opacity first, so the
   snapshot is not taken mid-transition.
2. `loadSwarmEngine()` injects the vendor script.
3. The engine snapshots the live DOM (boxes, text, borders, buttons, canvases via
   `toDataURL`, the campus photo background), blanks the page with its own sheet,
   orbits its cursor set, then rebuilds everything with crosshair boxes, typed
   text, pen lines, guides and duplicates.
4. Its toolbar appears: Tour, speed, sound, Go live, Replay, close.
5. Go live restores the real page, where `save card` and `copy link` work.

`body.engine` hides our own ambient swarm, sound and replay controls while the
engine owns the screen.

Debug: `?entered=1&engine=1` skips the gate and runs the engine immediately.

On phones the same engine runs; the X is baked to its final right-hand position
before the snapshot so the rebuilt frame matches the live page.

Licence: see `site/vendor/NOTICE.md`. The upstream code has no licence and
adapts Joel Califa's Swarm, so this is not safe to publish as-is.
