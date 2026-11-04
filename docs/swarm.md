# Swarm cursors

`site/swarm.js` adds an ambient crew of named pointers to the reveal. Each one
chases the real pointer through its own spring, keeps clear of the others, and
drifts into a slow orbit when the pointer rests. Cursors, labels and trails all
live on one canvas, so there is no DOM churn.

It is loaded from `site/index.html` before `xenith.js`. No libraries, no edits
to the rest of the site.

## Layering

The canvas is created at boot and inserted into `#stage` before `.hud`:

- `position: fixed; inset: 0`
- `pointer-events: none`
- `z-index: 4`

That is above the ASCII slab and rain (`1`), scrim and Rusty (`3`), and below
the copy and save button (`5`) and the draw-X gate (`10`). It cannot block the
gate or the card button. The HUD also sits at `4` but comes later in the DOM,
so it paints above the swarm.

## Tuning constants

All of these are at the top of `swarm.js`.

| Constant | Value | What it does |
| --- | --- | --- |
| `FPS` | `30` | Render cap. One rAF loop; intermediate frames are skipped. |
| `DPR_MAX` | `1.5` | Backing-store cap. |
| `MOBILE_W` | `720` | Breakpoint for the smaller crew. |
| `DESKTOP_N` / `MOBILE_N` | `10` / `6` | Active cursors. |
| `IDLE_AFTER` | `650` ms | Stillness before the orbit takes over. |
| `IDLE_EASE` | `2.4` | How quickly idle mixes in (1/s). |
| `SPRING` | `17` to `33` | Per-cursor stiffness. Lower is lazier. |
| `DAMPING` | `6.4` to `8.8` | Per-cursor drag. Higher settles sooner. |
| `RADIUS` | `26` to `82` px | Offset from the pointer while moving. |
| `IDLE_RADIUS` | `1.65` | Multiplier on that offset at full idle. |
| `SPIN` | `0.22` to `0.5` rad/s | Idle orbit speed, alternating direction. |
| `WOBBLE` | `0.45` to `0.95` rad/s | Slow angle and radius drift. |
| `SEP_RADIUS` | `48` px | Personal space before flock separation pushes. |
| `SEP_FORCE` | `700` px/s² | Strength of that push. |
| `MAX_SPEED` | `1100` px/s | Velocity clamp. |
| `TRAIL` | `9` samples | Short trail history per cursor. |
| `TOUCH_SLEEP` | `2600` ms | Touch-only cloud fades after this much stillness. |

Trail bands use alpha `0.58`, `0.30` and `0.15` at 1 px; there is no shadow or
glow. Labels are 10 px monospace in a 14 px dark tag.

## Crew

`rusty` red, `xenith` amber, `events` cream, `admin` violet, `creatives` mint,
`tech` amber, `publicity` mint, `finance` cream, `docs` dim, `design` violet.

## Motion and fallbacks

- No pointer position yet: the crew orbits a default spot at 62% / 46%.
- Pointer moves: idle eases out, the orbit tightens and the springs trail.
- Pointer rests: idle eases in, radius grows and each cursor orbits at its own
  speed.
- `prefers-reduced-motion: reduce`: canvas is hidden and the loop never starts.
- Touch-only devices: no cloud until the first `pointermove`; it sleeps after
  `TOUCH_SLEEP` stillness and wakes on the next move.
- `document.hidden`: the rAF loop is cancelled until the tab is visible.
- Crossing 720 px reseeds the crew at the current pointer position.

## Verifying

```
node --check site/swarm.js
```
