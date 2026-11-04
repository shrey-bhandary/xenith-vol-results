# Mobile intro spec

Constants below assume 375x812 (svh). 320 and 414 checked with the same rules.

## Stage

- `height: 100svh`, `overflow: hidden`, `overscroll-behavior: none`.
- Gutter 18px. Bottom stack pinned to `env(safe-area-inset-bottom) + 20px`.
- Black `#070614` only. ASCII slab, rain and photo are off until after the gate.
- `visualViewport` resize moves the bottom stack; it never resizes canvases.

## Rusty

- Integer cell `U = 4` at 375 (canvas 168x184, 42x46 cells), `U = 3` below 340
  (126x138). Canvas width = `42 * U`, no CSS scaling.
- Centre x, top at 26svh. No parallax.
- Assemble bottom-up in 6 bands, 120ms stagger, 700ms total, 60ms cream flash
  per band. No per-cell randomness on mobile.
- Bubble above the sprite, `max-width: 78vw`, 15.5px mono. Type at 26ms/char.
  A tap fills the line instantly. Bubble appears 250ms after the last band.
- After the question, Rusty stays at 26svh; the cards enter from the bottom,
  12px stagger, 220ms each.

## Cards

- Two stacked, `calc(100% - 36px)` wide, 52px tall, 12px gap, bottom at
  safe-area + 20px.
- `[ check my vols application result ]` = amber 1px border, amber text.
  `explore xenith` = `--line` hairline, cream text.
- Press: `scale(.98)` in 90ms, release 140ms. No shadow.
- Card 2 skips the gate: fade to ink over 400ms, run the build directly.
  Card 1 goes to the gate.

## Draw-X gate

- Gate beat: Rusty docks to `y = 10svh` with `U = 3`, bubble drops.
- X guide centre at 58svh, 62vw (233px at 375), so the whole X sits in the
  thumb arc. Guides are two dashed diagonals, 2px.
- Two strokes by default (one arm per drag). 12 samples per diagonal,
  30px tolerance, 70% coverage per arm to unlock.
- `touch-action: none` on the pad only. `setPointerCapture`, 2px mint trail,
  6px round cap, no glow. `pointercancel` ends the stroke cleanly.
- `skip` 10px dim, 44px tap target, bottom centre, fades in at 2s.
- Unlock: mint flash 180ms, then 950ms settle, then the vendor engine loads
  and snapshots at 60svh centre.

## Swarm

- 6 cursors: 5 department heads + the visitor's own, amber, labelled with
  their first name. Down from 10.
- On touch the self cursor spawns at the X completion point, then follows taps.
- Labels 9px, max 3 visible at once, ellipsis at 96px. Trails 5 samples.
- `SEP_RADIUS 34`, `RADIUS 22-58`, `DAMPING 6.4-8.8` unchanged.
- `MOBILE_W 720`, `MOBILE_N 6` stay.

## Budget

- `DPR_MAX 1.25` on mobile. 24fps cap if frame time > 22ms for 30 frames.
- One rAF at a time: intro scene stops when the engine takes over.
- Press Start 2P subset to `SELECTED XENITH` + digits, ~8KB WOFF2. The
  personalised name is mono.
- Campus photo loads 950ms after the gate at 900px wide, <=120KB.
- No `backdrop-filter`, no `filter: blur`, no animated box-shadow.
- Call it done: <=60KB JS, <=3MB heap, first tap response <100ms on a
  throttled 4x CPU.
