# the void, as a place

The void is 3.00s of a 30.00s intro, and it is the only place in the piece where
nothing is being asked of the visitor. This file gives it a floor plan: five
layers, one camera, three parallax planes, dust that moves around the hand, and
one 1/60s frame at 2.80 where the room changes hands and Rusty's antenna becomes
the only light in it.

Read with `script.md` (the clock), `plan/dialogue.md` (the voice), `void.js` and
`intro.js` (what is on screen now). Nothing here changes a scene length. Every
effect is canvas 2D, no dependency, no CSS filter, no `shadowBlur`.

The shot list runs 0.00 to 9.00. After 9.00 the empty room is still this room,
and it stays in his hands until the gate.

## The contract

Four rules hold the 9s together. Break one and the whole thing reads as a
loading screen with a robot in front of it.

1. **One point.** `A = (0.5W, 0.46H)`. The pixel is born at A. The rod grows down
   from A. The grid's vanishing point is A. The light is at A until the rig hands
   over its antenna, and the rig must land its bulb on A within 1px. In `intro.js`
   the local stage already draws the pixel at `H * 0.46`, so A is not new.
2. **One light.** From 2.80 to the gate there is exactly one illuminant. Anything
   that glows may not cast.
3. **One camera.** A single `(x, y)` vector drives drift and parallax. No CSS
   `transform` on `#rigCv`, ever. Today `index.html` runs a 21s CSS drift on the
   rig while the void never moves, so Rusty parallaxes against a stationary room.
   That is two coordinate systems and it is the first bug to delete.
4. **The cursor is a hole, not a lamp.** The pointer removes light from the dust.
   A glow under the cursor would make a second source and kill the 2.80 frame.

## The layers

The five layers from the brief, in draw order, plus the rig and a near dust plane
that passes in front of him. Factors are the multiplier on the camera vector (see
below), capped so no layer slides more than 1.4% of the frame.

| # | layer | z | factor x/y | what it is |
|---|---|---|---|---|
| 0 | dust, far and mid | 0 `#voidCv` | .18 / .12 | 78 one-pixel motes, the room's only sense of depth |
| 1 | distant grid | 0 `#voidCv` | .06 / .04 | 11 verticals, 5 horizontals, 1px, 2.8% cream, vanishing at A |
| 2 | light cone | 0 `#voidCv` | follows the light, not the camera | a 30 degree soft wedge from the bulb, the grid's only reason to exist |
| 3 | the rig | 1 `#rigCv` | .28 / .18 | Rusty, lit top-down by his own antenna |
| 4 | dust, near | 2 `#dustNearCv` (new) | .62 / .44 | 18 two-pixel blocks at 55%, passing in front of him |
| 5 | lens | 3 to 6 | 0 | `.tint`, `.scan`, `.grain`, `.vig`, locked to the glass |

Lens order matters and is wrong today. In `index.html`, `#rigCv` is `z-index:5`,
above `.scan` (3) and `.vig` (4), so Rusty is never graded by the vignette and
the scanline draws under a character who is supposed to be inside the scanlines.
New order: void 0, rig 1, near dust 2, tint 3, scan 4, grain 5, vignette 6. The
console, rows and HUD stay above all of it and never move with the camera.

Nothing else appears before 9.00. No logo, no spinner, no progress, no tilt on
the stage. The HUD is two words and it fades in at 2.20, not at 0.00.

### the grid

The grid is not decoration, it is the evidence of a wall. Verticals converge on
A by one-point perspective, horizontals sit at `A.y + n * 72px`. After 2.80 it
is drawn inside the cone's clip only, so the wall exists exactly where his light
reaches it, and the rest of the room is honest black. When the cone swings, the wall's
visible region swings with it, no relayout, no perspective recompute.

Two consequences worth having:

- The room is never fully described. You get a strip of wall and a floor of
  darkness, which is what a dark room actually gives you.
- When he looks at the cursor at 8.40 to 9.00, the only lit architecture in the
  frame moves to point at the visitor.

The grid's vanishing point stays at A even as the light swings. The light moves,
the room does not rotate. That distinction keeps it calm.

## The camera

One vector, two inputs, one output.

```
driftX = 0.009W * sin(2*pi*t / 43)
driftY = 0.006H * sin(2*pi*t / 61 + 1.7)
driftA = 1 - exp(-t / 1.6)                 // 0 at first paint, full at 3.2s

ptrX   = clamp((pointer.x / W - .5) * 2, -1, 1)
ptrY   = clamp((pointer.y / H - .5) * 2, -1, 1)
ptr    = damp(ptr, target, 6, dt)          // hand, 2 stages
camX   = driftX * driftA + ptr.x * 0.014W
camY   = driftY * driftA + ptr.y * 0.010H
plane  = cam * factor                      // per layer, one multiply
```

- 43s and 61s are coprime, so the Lissajous never repeats inside a session.
- The pointer enters the camera through a 6Hz damper and leaves it through a
  2.2Hz damper, so the world trails the hand by about 180ms and settles by 600ms.
  A camera that arrives with the cursor feels like a mouse-follow parallax. One
  that arrives late feels like a place.
- Drift starts at zero and ramps for 1.6s, because the first second belongs to a
  single blinking pixel and nothing else may move.
- `prefers-reduced-motion`: driftA = 0, pointer term = 0, factors ignored. The
  room is a still photograph, the light still hands over at 2.80.
- During the honest stall (when the head is missing) the camera drops to 25%
  amplitude and the pointer term freezes at its last value. The visitor's hand
  stops moving a room that is holding its breath. That is the one place the
  cursor loses authority.
- During the gate, the camera and the dust hole freeze entirely. The gate is the
  visitor's scene, and a room that keeps breathing while they draw is a room
  that competes.

A 3% scale push on the rig plane runs 3.00 to 22.00, per `script.md`. It is a
scale on the rig only, not the camera, so his body grows while the room does not.

## Dust that parts

96 motes seeded once: 20 far (1px, 9% to 16%), 58 mid (1px, 14% to 30%), 18 near
(2px, 8% to 18%). Far motes are dimmer and slower, near motes larger and blurrier
in alpha, never in blur. Positions are fractional and drawn at integer pixels.

The hole:

| field | value | why |
|---|---|---|
| hole radius, far / mid / near | 210 / 170 / 130 px | a cone, so the parting reads as a bore through depth rather than a cutout |
| push | `0.30 * R * (1 - d/R)^1.6` | 63px at the centre of the far layer, 51 mid, 39 near |
| speed term | `0.3 + 0.7 * clamp(v / 1400, 0, 1)` | matches r5 in dialogue.md, which already calls 1400px/s fast |
| ingress stagger | `(d / R) * 90ms` | the hole closes from the rim inward, so it reads as a breath |
| recovery | spring, k 14, d 5, about 900ms | motes return along a curve, not a lerp |
| strength over UI | × 0.4 | the room keeps living under the rows, quietly |

Two details do most of the work:

- **The hole is deeper than it is wide**, because the radius shrinks with depth.
  From one pointer you get parallax you can see without moving the camera.
- **Nothing crosses the lamp.** Any mote within 22px of the light is pushed out to
  the rim with a 6px falloff, and alpha goes to zero inside 10px. Nothing ever
  touches the only light. It costs one line and it is the image people keep.

The pointer enters through the document listener already in `intro.js`, so this
works in wired mode and in local mode. `void.js` sets `pointer-events:none` on
`.void-root`, which is correct, the stage listens to `document`, not to itself.
On touch there is no hover: the hole follows the last touch for 1.2s after lift,
then closes. On reduced motion the hole is off and the dust is a still field.

## One light

The light is an object, not a paint call.

```
light = {
  at: A,                    // replaced by the rig's measured bulb
  on: false,                // 2.80 onwards
  radius: 0,                // eases to 0.52 * min(W, H) over 900ms
  cone: 15,                 // half angle, degrees
  angle: -90 + ant * 2.4 + gazeX * 5,
  power: 1,                 // multiplies with the bulb's own flicker
  sources: []               // must hold exactly one entry
}
```

Three things read from it every frame:

1. **Falloff.** A cached 256px radial sprite, drawn scaled to `radius`, multiplied
   by `power`. No gradient built per frame, no `shadowBlur`. This is what lights
   the motes: `alpha = (1 - d/radius)^1.5 * power`, which replaces the hardcoded
   `litX = W * .24, litY = H * .8` in `void.js` that currently lights the dust
   from a point where nothing exists.
2. **Cone.** A 30 degree wedge from `light.at` along `light.angle`, 0.95H long,
   alpha `.055` at the apex to 0 at the tip, drawn as a clip for the grid. Its
   angle is the antenna spring times 2.4, so the room's only light rotates with a
   part that has its own physics and overshoot. Every landing kicks it.
3. **Flicker.** `power` inherits `paintGlow`'s 2.2Hz pulse from `rusty.js`, so the
   room breathes at the bulb's rate and never at its own. One breath in the whole
   frame, sourced where the light is.

**Glow, never cast.** Rusty's screen, eyes, chest LEDs and tread strips are
emissive: alpha capped at .9, confined to their own rects, no gradient outside a
part, no effect on the mote field. This is the rule that makes "the only light"
survivable, because without it his chest screen quietly becomes a second source
and the claim is false. `plan/dialogue.md` r6 already tells the visitor "the
light stays on. it is on my head." This section is the implementation of that
line.

**The handoff.** Before 3.00 the light is the proto-antenna: pixel, rod, bulb.
From 3.00 the light reads `bulbWorld()`, measured from the rig's transform chain
(`mPoint(byId.bulb.m, 0, -1.5)` already exists in `rusty.js`). At 3.00 the two
must agree within 1px or the pixel visibly jumps into his head. If the rig's
bulb cannot land on A, translate the rig canvas, do not move A.

## The moment at 2.80

This is the shot the first 2.8s exist to build. Exact frames, 60fps.

| t | frames | what happens |
|---|---|---|
| 2.64 to 2.71 | 4 | hum bloom 0.5 to 0, ambient grid wash 0.020 to 0, tint to 0. ease-in, so the last frame is a small dark step |
| 2.72 to 2.79 | 5 | **nothing is lit in the frame except the pixel and four rod segments.** camera at 10% amplitude. this is the first true black since 1.00 |
| 2.800 | 1 | fourth rod segment seats. same frame, `light.on = true` |
| 2.80 to 3.70 | 54 | radius 0 to 0.52·min(W,H), easeOutCubic. cone 0 to .055 over 600ms. motes relit from the mid dust out, about 8 lit at 2.80 and about 50 inside the falloff at 3.70 |

At 2.800 exactly: one 3×3 cream block with a 1px `#fff6de` core at A, one 1px
shade rod below it, and a room that is otherwise `#05040c`. There is no second
bright pixel anywhere in the frame.

From that frame until the gate, "the only light" is a property you can check:
every non-zero luminance in the void canvas is a function of distance from
`light.at`, except the rig's own emissive rects and the lens grade. One entry in
`light.sources` is the whole implementation.

The first movement of the beam is the best part. It does not move at 2.80. It
moves at 3.00 because the head arrives and the antenna spring reacts (one 3.5
degree swing, settled by 3.70), then it is still again until 7.90. The light has
not moved for 4.2s, and then it moves because he chose to look.

## Shots, 0.00 to 9.00

| t | shot | in frame | light | camera + dust |
|---|---|---|---|---|
| 0.00 | S1 the pixel | 2px amber at A, 1px cream core. off 0.15 and 0.55, 40ms each. nothing else | off | at rest. dust seeded, alpha 0. grid alpha 0 |
| 1.00 | S2 the room before him | hum bloom ramps to 0.5 over 480ms. 8 motes wake inside 90px of A, drifting up 6 to 14px/s. ambient grid wash 0.020, no cone | off, the pixel only | drift ramps 0 to 1 over 1.2s. hole live at 35% strength |
| 2.20 | S3 the rod | 4 segments of 4px, 60ms each: 2.20, 2.32, 2.44, 2.56. 1px overshoot, settle 90ms. HUD fades to .5 at 2.20 | off | the hum dims 10% per segment. the room leans in |
| 2.64 | S4 the room goes out | see the 2.80 table | dying | amplitude 10%, pointer term frozen |
| 2.80 | S5 only light | the moment. one 3×3 block and a 16px rod | on, radius ramping | drift resumes at 2.80, still at 60% |
| 3.00 | S6 the head | flies in from 40px left, overshoots 18px, springs. face boots, one scanline, one eye, two at 4.10. upside down 3 frames at 3.35 | inherited from the rig | 3 impacts push 60px rings through mid dust: 3.02, 3.36, 3.58 |
| 4.20 | S7 the body | ears, neck, body rises from below. chest screen is the first part you see, at 4.90, because it is the only other thing that glows | steady, vertical | rig scale push starts, 3.00 to 22.00, 3% |
| 5.60 | S8 the shake | arms unfold, hands flex twice, treads drop, dust. one dog shake at 6.42 | 3 dips of 2.0 degrees at 5.72, 5.94, 6.16. 6 degree wobble at 6.42 | 6px world impulse, no screen shake |
| 6.90 | S9 the settle | screen clears 7.40, blink 7.90, head lifts 2px. for 1.00s nothing else moves | still for 1.00s, then +3.0 degrees at 7.90 | hole live, scanline crosses at 7.61 |
| 8.40 | S10 hi. | `hi.` lands 8.60. eyes find the cursor 9.00 | swings to the cursor over 360ms, overshoot 4 degrees | camera turns with it. 9.00 is the freeze frame |

Notes on the three shots that carry the idea.

**S4 is the setup, and it is 160ms.** Cut all ambient over 4 frames, hold true
black for 5, then ignite. Five frames of black after 1.7s of a lit room is the
only shock the intro can afford, and it costs nothing but the discipline to
schedule it.

**S5 is one frame plus a slow bloom.** The bloom is 900ms so the room does not
switch on like a light, it comes up like an eye. The rod has been growing toward
this for 600ms. Do not add a sound sting bigger than the servo tick.

**S10 is the payoff.** For the 6.2s since it ignited, the only light in the world
has pointed at a wall. At 9.00 it points at the visitor. That is the
first thing in the intro that faces them, and it happens one line of copy before
`hi.` lands. The beam holds there through the greeting and into the rows.

## What changes in code

| where | change |
|---|---|
| `index.html` | add `#dustNearCv`, reorder z: void 0, rig 1, near dust 2, tint 3, scan 4, grain 5, vignette 6. delete the `drift` keyframes and `#rigCv` animation block |
| `void.js` | 28 motes to 96 with layer weights. replace the hardcoded lit point with `light.at`. add `light` to the API and a `point(x, y)` setter so the intro can feed the pointer. no other API change |
| `intro.js` | own the camera (one module, one vector). set `light.at` from `bulbWorld()` after 3.00. schedule 2.64 and 2.80 as absolute offsets from first paint, not from the wake. draw the cone and the grid before the rig |
| `rusty.js` | none required if the bulb can be measured. expose `bulb()` if the transform chain is not readable from outside. the 3.00 anchor check is the only hard constraint |

The prototype fires the boot off the wake action, while `script.md` runs a clock
from first paint. Both stay: 0.00 to 3.00 is unconditional and includes the 2.80
moment, the wake only starts the boot at 3.00, and if the visitor never acts the
void holds indefinitely with the pixel breathing, the dust parting and the beam
still. It is the honest stall with the visitor as the load.

## Amendments

Two rules in approved files contradict this plan. Both are deliberate, both are
cheap to reverse.

1. `script.md` line 27, "The room does not drift. There is no room yet", and line
   195, "No stage parallax, no tilt, no cursor follower before the gate." Now the
   room drifts, parallaxes in three planes and answers the pointer. Reason: the
   brief asks for a place, and a place needs a camera. The restraint is kept by
   amplitude (max 1.4% of the frame) and by freezing the camera for the stall and
   the gate.
2. `pitch.md` "Twenty-eight 1px dust motes." Now 96, of which about 8 are lit
   before 2.80 and about 50 after. Reason: 28 motes on a 1440×900 frame puts
   about 2 inside the pointer's bore, so the parting reads as one dot drifting
   off. 96 puts about 7 there, and 7 motes moving together is a hole. The count
   that stays true is the number of lit motes, and it comes from the light.

Everything else in `script.md` holds: the clock, the copy, the 2.20 HUD, the four
rod segments, the black after 2.72, and the silence from 7.40 to 8.40.

### open conflicts with the sibling plans

`plan/cursor.md` and `plan/wake.md` were written against the same code and they
disagree with this file in five places. None is fatal, all need a decision before
merge.

1. **Parallax in the void.** `wake.md` line 390 has "no room parallax before
   8.40"; `cursor.md` gives the `void` phase a factor of 0. This file wants drift
   from 1.00 and three planes from 1.00. The brief asks for it, so this wins, but
   the other two plans need the same edit or a merge will silently zero it.
2. **The CSS `drift`.** `cursor.md` line 219 says keep it and compose parallax on
   the `translate` property. Two motion systems on one plane means the rig and the
   dust disagree by a few pixels at different phases, which is what a parallax bug
   looks like. One camera.
3. **The rig above the grade.** `cursor.md` keeps `#rigCv` at 5, above `.scan` and
   `.vig`. If Rusty is above the vignette he is pasted on the frame, not standing
   in the room. Move him under the lens.
4. **The unit.** Their factors are pixels, mine are fractions of the camera vector
   scaled by `W` and `H`. A merge must pick one or the numbers will not mix.
5. **Mote count.** Both plans use 28. This file seeds 96, for the reason in the
   amendments. If 28 ships, the parting mostly disappears, so either raise the
   count or cut the parting to the mid layer and accept one mote moving.

Agreement worth keeping: `wake.md` line 368 says the pixel is the bulb and the
centre pixel must leave `void.js` for the boot, or there are two of them. That is
the anchor rule, already correct.

## Budget

| item | cost | target |
|---|---|---|
| clear + falloff sprite | 1 `drawImage` | 0.3ms |
| 96 motes | 96 `fillRect`, integer snapped | 0.6ms |
| grid | 16 lines, one clip | 0.3ms |
| cone | one cached wedge sprite, rotated | 0.2ms |
| total, 1440×900 @ dpr2 | | under 2.5ms of a 16.6ms frame |

Banned in the void path: `shadowBlur` (the local stage sets it to 24 every frame
today, cache the glow instead), canvas `filter`, per-frame `createRadialGradient`,
and any CSS `blur()` on a full screen element. One `clearRect`, one transform,
integer fills.

## Checks

- anchor: pixel, rod base, bulb and grid origin agree within 1px at 3.00.
- `light.sources.length === 1` for every frame from 2.80 to 22.00.
- 2.72 to 2.79 contains no drawn pixel above `#0a0818` outside the pixel and rod.
- black hold is 5 frames at 60, 2 at 30. do not let a slow frame straddle it.
- reduced motion: 2.80 still cuts, the room does not drift, the hole is off.
- every file in `lab/intro/` stays under 60KB. `intro.js` is 47KB today, so the
  camera module is a few hundred bytes, not a rewrite.
- `node --check lab/intro/intro.js` and the existing `node lab/intro/verify.js`
  stay green.

The rest is eyes. Watch 2.72 to 2.80 once with everything else muted. If the
room does not feel darker than it did before, the black is one frame too short.
