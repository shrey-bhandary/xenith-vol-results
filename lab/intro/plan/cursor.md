# Cursor

The pointer is a witness until 8.40, then a hand with a name.

[script.md](../script.md) line 195 bans stage parallax and any cursor follower
before the gate. This plan keeps the follower ban and times the reactivity:
nothing answers the pointer during the honest stall, the room starts at 8.40, the
room freezes at the gate, and the trail appears only after the X. The visitor's
cursor is born at success and named during the build.

"Reactivity everywhere" means every plane with depth, not every UI layer. No HUD
element, no second action, no cursor competing with the system one.

This file owns the pointer signal, the timing gates, the trail and the handoff.
Where a sibling plan owns a domain, its numbers are copied here and that file
stays the source of truth: [void.md](void.md) for the camera and dust,
[buttons.md](buttons.md) for the rows, [expressions.md](expressions.md) for the
rig, [wake.md](wake.md) for the beats, [dialogue.md](dialogue.md) for the lines.

## 1 · Signal

One pointer model feeds every channel. Listen once, compute once per frame, never
read layout in the loop.

| Signal | Source | Factor / gain | Clamp | Easing |
|---|---|---|---|---|
| `x,y` | `pointermove` (passive) | 1 | viewport | none |
| `nx,ny` | `x/W*2-1`, `y/H*2-1` | 1 | -1..1 | none |
| `gTarget` | pointer relative to Rusty's anchor | `rx=clamp(W*.27,180,520)`, `ry=clamp(H*.25,140,420)` | -1..1 | see 2.1 |
| `speed` | px moved / dt | smoothed `lambda 12` | 0..2400 px/s | exponential |
| `still` | ms since move > 0.5px | 1 | 0..∞ | none |
| `near` | distance to row rect | `(1-d/170)^1.15` | 0..1 | 300ms in, 220ms out |
| `pull` | nearest row, outside only | 3px x, 1.65px y | 3px | 140ms in, 260ms out |
| `trail` | last 10 positions | 1px, 340ms ttl | 10 samples | age bands |

```js
// move: store only
ptr.x = e.clientX; ptr.y = e.clientY; ptr.movedAt = now;

// frame: derive
const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
const v = Math.hypot(ptr.x - pvx, ptr.y - pvy) / dt;
ptr.speed += (v - ptr.speed) * (1 - Math.exp(-12 * dt));
```

Gates decide whether the signal may move anything:

| Gate | Range | Effect |
|---|---|---|
| `armed` | before 7.85 | all pointer channels 0 |
| `wake` | 7.85 to 8.40 | rig only: antenna 7°, head 3°, camera 3px (wake.md) |
| `room` | 8.40 to gate | camera pointer term and dust hole on |
| `stall` | head missing | camera 25%, pointer term frozen (void.md) |
| `gate` | pad live | camera and dust frozen, gaze only |
| `handoff` | stage out | everything to zero by 400ms |

Pointer loss (`pointerleave`, `blur`, tab hidden) sets `has=false`, eases outputs
to zero at `lambda 4.5`, and stops feeding gaze. The last look decays into
[rusty.js](../rusty.js)'s own idle sweep (line 671) when its 4s timer runs out.
During the hold, wake.md suspends that timer until 9.00, so he does not look
around while the rig is missing its head.

Keyboard parity: focus and arrows produce the same lit row and 6° lean, with pull
forced to zero. Nothing here requires a pointer.

## 2 · Rusty

### 2.1 Rusty's gaze

`setGaze` already takes normalized gaze (rusty.js line 496). The intro never calls
it; `intro.js` line 1464 only feeds the local rig. Forward it. Also stop forwarding
raw phase names: `void`, `assemble`, `greet`, `menu`, `gate` and `handoff` are not
rig states, so wired Rusty falls back to idle. Use the alias map already specified
in [expressions.md](expressions.md):

| Intro phase | Rig state | Gaze authority |
|---|---|---|
| `void` | `boot`, held | 0 |
| `assemble` | `boot`, running | 0 until 7.85, then 0.35 |
| `greet` | `listening` | 0.85 |
| `menu` | `curious` | 1.0 |
| `pick` / line typing | `listening` | 0.75 |
| `gate`, no stroke | `scanning` | 0.9 |
| `gate`, drawing | `scanning`, sweep off | 1.0, target is the stroke tip |
| success | `celebrating` | 0.2 |
| `handoff` | `proud` | 0 |

The rig auto-assembles on mount. Call `assemble(0)` at probe to hold him invisible,
then `setState("boot")` once at the wake and let the 2.2s scrub run. To sync to the
intro timeline, call `assemble(p)` each tick, which takes over. Never re-enter
`boot`, or the assembly restarts.

Gaze target:

```js
const soft = (v) => Math.sign(v) * clamp((Math.abs(v) - 0.04) / 0.96, 0, 1);
const targetX = soft(clamp((x - ax) / rx, -1, 1)) * authority;
const targetY = soft(clamp((y - ay) / ry, -1, 1)) * authority;
if (extRig && extRig.setGaze) extRig.setGaze(targetX, targetY);   // target only
```

Feed the local rig's `lookT` from the same target so both paths agree. Do not
pre-damp: expressions.md line 39 states `gx/gy` are already damped by `update()`,
and rusty.js eases them at 7 and 6 (line 675). A second damp reads as a lazy head.

`setGaze` resets the rig's internal `still` timer (rusty.js line 500). Feed it only
on frames where the pointer moved more than 0.5px, once on entry, and once on any
authority change. A resting
pointer keeps the last target because the rig keeps interpolating, so the 4s sweep
starts from the last real move. Feeding every frame suppresses the sweep forever.
Do not send `setGaze(0, 0)` to end a look: that resets the timer and buys another
four seconds of stare.

While a stroke is live, `gTarget` is the stroke tip, with `ry` widened to `0.32H`.
Kill `scanning`'s ±13° sweep for this beat; a sweep fights the line. He watches the
stroke, not the pointer.

### 2.2 Head lead

The chain is eyes, head, torso, arms, antenna. Each link is slower and smaller
than the one before. No assignment, only springs.

| Link | Lead / lag | Spring k / d | Clamp | Contribution |
|---|---|---|---|---|
| eyes | leads head 60 to 90ms (lambda 16) | n/a | ±1.5 plate, pupil per expressions.md | `egz.x*1.5`, `egz.y*0.55` |
| head | reference | 110 / 16 | ±15° pose | `state.head + gx*9` |
| neck | follows head | 0.3 × head | n/a | `headNow*0.3` |
| lean | +110ms | 70 / 12 | ±6° | `state.lean + gx*2.5 + rowLean` |
| arms | +170ms | 130 / 14 | ±4° additive | `± gx*4` |
| elbows | +170ms | 120 / 14 | ±3° additive | `-gy*3` |
| antenna | +220ms, settles last | 150 / 9 | ±22° | `state.ant + headDeg*.85 + gx*7` |

The existing constants give the torso and antenna for free. Keep the ±15° pose
clamp that expressions.md defines; the pitch's 12° is satisfied by the 9° gaze
term, which is all the pointer ever contributes. Give the eyes their own faster
path to the same target:

```js
// rusty.js update, after the existing gx/gy damp
egz.x = damp(egz.x, wantX, 16, dt);
egz.y = damp(egz.y, wantY, 16, dt);
eyes.ox = egz.x * 1.5;
eyes.oy = egz.y * 0.55;
headTarget = clamp(cur.head + gx * 9 + sweep + shake, -15, 15) * DEG;
```

That 60 to 90ms gap is the lead. The head is the reference the neck and lean
follow; the eyes are always already there. The pupil adds expressions.md's
0.55/0.40 at damp 14 on top, not instead.

No bonus blinks, no antenna kicks on direction changes. The authored beats in
wake.md are the performance; this plan only feeds them.

### 2.3 Gate gaze

The pad uses the same `gTarget`, but the target is the stroke, not the pointer. At
rest, pointer. While drawing, stroke tip, camera and dust frozen, authority 1.0.
On lift, stop feeding and let the 4s idle sweep resume after the gate's own beats.
The 30 and 60 percent reactions are dialogue.md's.

### 2.4 Prerequisite

Wired Rusty is currently frozen. `probeRig` accepts `inst.draw` (intro.js line 133)
and `callExt` calls it as `draw(t, dt)`, but rusty.js `draw(bob, breathe)` is a
painter, not a frame API. The springs never advance and the whole robot is offset
by the clock. Before any gaze work, add:

```js
rig.frame = function (ms) { update(ms); };   // update already draws
```

and make `callExt` prefer `frame` over `draw`, passing `dt * 1000`. Without this,
every number below is decoration.

## 3 · Button magnetism

[buttons.md](buttons.md) owns the values. The cursor plan only depends on them:

- Near is distance to the row rect, not its centre: `near = clamp(1-d/170, 0, 1)
  ^ 1.15`, one row at a time. Rusty reacts before the row: `near > .35` sends his
  gaze to that row, `near > .8` leans him 6°.
- Pull is 3px desktop, 2px at 761 to 1023, 0 at 760 and below. Direction is row
  centre to pointer; falloff `(1-d/170)^2.2`; y ratio 0.55; inside the row pull is
  0, so the target cannot run from the click.
- Ease to target 140ms, reset 260ms. Transform only, rect never moves. Local
  `.opt` rows already shift 6px on hover; keep that and add the 3px pull, do not
  stack a second transform path. `IntroMenu` rows have no base shift.
- Group parallax rides the same transform: `--gx/--gy` on `.xmenu__opts`, -2..2px
  x and -1.5..1.5px y, opposite the cursor, 180ms.
- Focus beats hover when the pointer is outside. Arrow keys set pull to 0 in the
  same frame. Disabled, picked, reduced motion, coarse pointer: 0.

## 4 · Dust parting

[void.md](void.md) replaces 28 motes with 96 and makes the pointer a hole, not a
lamp: it removes light and pushes motes out of the bore.

```
hole radius   far 210 / mid 170 / near 130 px      a cone, deeper than wide
push          0.30 * R * (1 - d/R)^1.6             63 / 51 / 39px at centre
speed term    0.3 + 0.7 * clamp(v/1400, 0, 1)      v is the smoothed pointer
ingress       (d/R) * 90ms                         closes from the rim inward
recovery      spring k 14, d 5, about 900ms        return on a curve, not a lerp
over UI       x 0.4                                the room keeps living under rows
lamp          22px exclusion, alpha 0 inside 10px  nothing crosses the only light
```

- Gate: the hole freezes entirely. The gate is the visitor's scene.
- Touch: no hover; the hole follows the last touch for 1.2s after lift, then closes.
- Reduced motion: hole off, still field.
- The pointer is already on `document` in `intro.js`. Reuse that event and the
  smoothed vector; do not add another listener or a per-frame rect read.
- If the local stage is still the visible one, use the same numbers there. The 28
  motes in the current prototype are a placeholder; there is no hole yet.

## 5 · Parallax layers

[void.md](void.md) has one camera vector and four planes. Copy these, do not build
a second system:

```
ptr      = damp(ptr, clamp(pointer/W*2-1), 6 in / 2.2 out, dt)
camX     = driftX * driftA + ptr.x * 0.014W
camY     = driftY * driftA + ptr.y * 0.010H
plane    = cam * factor
```

| Plane | Factor x/y | Notes |
|---|---|---|
| dust far and mid | .18 / .12 | 78 motes, lit by the one point |
| the rig | .28 / .18 | drawn with the camera, never a CSS transform |
| dust near | .62 / .44 | 18 two-pixel blocks, in front of him |
| lens (`.tint`, `.scan`, `.grain`, `.vig`) | 0 | locked to the glass |
| console, rows, HUD | 0 | above it all, never move |
| menu group | -2..2 / -1.5..1.5 px | buttons.md, 180ms |

- Cap every plane at 1.4 percent of the frame; that is the whole budget.
- Drift is 0.009W / 0.006H over 43s and 61s, ramped in 1.6s. The pointer term
  starts at 8.40, not at the wake. Before that the room is still.
- During the stall the camera drops to 25 percent and the pointer term freezes.
  At the gate it freezes entirely. On success release to 100 percent for the
  burst, then handoff eases to zero over 400ms.
- Delete the 21s CSS drift on `#rigCv` (`index.html` line 47). It parallaxes
  Rusty against a room that does not move. One camera means the rig is drawn
  inside the camera, not transformed above it.
- Reduced motion: drift and pointer term 0. Coarse-only: 0. Mobile: halve the
  pointer term; the layer factors stay.

## 6 · Cursor trail

A trail before the X would be a follower, so it does not exist. It switches on
320ms after `gate.success`, once the burst owns the frame, and hands off to the
build.

- New canvas `#cursorCv`, z 31, `pointer-events:none`, DPR cap 2. Above the gate
  (30) so the success burst does not swallow it, below the flash (40).
- 10 samples, 1px, 340ms ttl, sampled on move ≥ 1.5px and ≥ 16ms. No smoothing,
  no glow, no shadow.
- Alpha bands: 0.5 for the newest 3, 0.28 for the next 3, 0.12 for the rest.
  On-ramp is a 0 to 1 multiplier over 260ms.
- Cream `#ffe9b0` during the gate. Over the 400ms before handoff, lerp to mint
  `#9ef0c0`, the colour of the visitor's presence.
- Pointer stops: samples expire within 340ms, nothing rebuilds. Touch or reduced
  motion: no trail at all.

## 7 · The named cursor

The trail is not the named cursor yet. It is the thread that becomes one.

`handoff()` (intro.js line 1348) adds one backward-compatible field:

```js
pointer: {
  x, y, nx, ny,
  name: sanitize(params.get("name")) || "you",   // [a-z0-9 _-]{1,20}
  trail: trailSamples(),                          // last 10, oldest first
  at: performance.now()
}
```

The host's swarm passenger uses it as a seed, not a teleport:

- Shape: a 5×5 mint plus with a 1px body, deliberately different from the dept
  arrows and from Ricco's gold arrow. It is the one cursor that places, not builds.
- Offset +12px x, +10px y with a 1px mint leader to the real point, so the OS
  cursor stays usable and the tag never sits under the arrow. Clamp the unit to an
  8px viewport margin.
- Motion: spring 26 / 7.4, speed clamp 1800, no orbit, no separation. The heads
  wander; the visitor's cursor is exact. That contrast is the character.
- Across the first 300ms after handoff, the last trail sample grows from 1px to
  the 5px plus and drifts to its offset. Same point, no cut.
- The tag does not exist yet. During the build the passenger is a quiet mint plus.
  At the visitor beat (vision, 42s) the tag slides out 2px and types the name at
  26ms per character, 10px mono in a 14px dark box with a 1px mint hairline. The
  heads pause and turn. That moment is the naming, not a spawn.
- It follows the real pointer with no lag beyond the spring. It never replaces the
  native cursor and never captures. On touch, the tag sits 26px above the last tap.
- If the host ignores the payload, the trail dies with the stage. No orphan DOM, no
  fake cursor in `site/`.
- Reduced motion: tag appears instantly, plus static, no trail.

## 8 · Timeline

| Phase | Gaze | Rows | Dust | Camera | Trail |
|---|---|---|---|---|---|
| void | 0 | none | drift only | drift | none |
| hold, to 7.85 | 0 | none | drift | drift | none |
| wake, 7.85 to 8.40 | antenna, head 3° | none | drift | rig 3px | none |
| greet, from 8.40 | 0.85 | none | hole on | pointer term on | none |
| menu | 1.0 + row | near, pull 3px | hole, x.4 under rows | 100% | none |
| pick | 0.75, nod | closing | hole | 100% | none |
| gate | stroke tip | none | frozen | frozen | none |
| success | 0.2 | none | burst | release 100% | ramp on |
| handoff | 0 | none | off | 0 by 400ms | mint, to host |

## 9 · Costs and limits

- One passive `pointermove` store, one 30fps derive. No `getBoundingClientRect` in
  the loop; row rects cached. Canvas writes only when the value changes by 0.5px.
- Budget: 96 motes, 10 trail samples, 3px pull, camera planes at 1.4% of frame.
- No CSS transform on `#rigCv`; no second camera; no per-layer CSS parallax.
- No custom cursor replaces the OS one. No pointer lock. No scroll capture.
- The gate keeps `touch-action:none`; everything else stays passive.
- Add `XenithIntro.cursor()` returning `{nx, ny, gTarget, speed, still}` so the
  numbers can be asserted without a browser.

## 10 · Build list, all inside `lab/intro/`

1. [rusty.js](../rusty.js): `frame(ms)`, alias map from expressions.md, eye-lead
   damping, gaze authority helper. Keep the 15° pose clamp.
2. [intro.js](../intro.js): pointer signal, `armed` at 7.85 and `room` at 8.40,
   forward `setGaze`, trail canvas, name sanitize, handoff payload, local row
   magnet. Consolidate the duplicate pointer handlers at lines 1005 and 1465.
3. [menu.js](../menu.js): implement buttons.md (near 1.15, pull 3px, group
   parallax, cached rects).
4. [void.js](../void.js): implement void.md (one camera, 96 motes, hole, lens
   order). The pointer comes from the existing document listener.
5. [index.html](../index.html): `#cursorCv` layer, delete the `#rigCv` drift,
   reduced-motion block.
6. [script.md](../script.md) line 195: amend "no stage parallax" to "no pointer
   parallax before 8.40; no follower or trail before the X".

## 11 · Acceptance, no browser

- Before 7.85 every pointer output is 0. With a pointer present, the camera term
  is non-zero at 8.40 and 0 at the gate.
- Gaze contributes at most 9° inside the 15° pose clamp; eyes settle 60 to 90ms
  before the head; antenna is last.
- Pull is 0 at 760 and below, 2px at 761 to 1023, 3px above 1023, and 0 inside a
  row.
- Dust centre push is 63 / 51 / 39px on the far / mid / near layers; the hole
  radius matches 210 / 170 / 130.
- Camera plane shift ≤ 1.4% of frame; `#rigCv` has no CSS transform.
- Trail ≤ 10 samples, 1px, gone 340ms after stop, absent before success.
- Reduced motion: camera 0, hole off, trail 0, pull 0.
- Handoff: `pointer.x/y` finite, `trail.length <= 10`, `name` matches
  `/^[a-z0-9 _-]{1,20}$/` or falls back to `you`.

## 12 · Open decisions

1. Keep the trail ban before the X. It is the one rule that makes the ending land.
2. Name only at the build, never in the intro. The intro gives him a witness; the
   build gives the visitor a name.
3. Who owns the tag text: URL param first, host second, `you` last.
4. Pitch says 12°, code and expressions.md say 15°. This plan keeps 15°, with a
   9° gaze term. If the pitch wins, lower only the gaze contribution to 6° and
   leave the pose clamp alone.
