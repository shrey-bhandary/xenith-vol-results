# wake: Rusty, 0.00 to 9.00

Fourteen beats, nine seconds, one character. This replaces the old boot in
`script.md` (scene 2) and hands straight into the first half of `hi.` at 9.00.

Everything below is built from `rusty.js`, so the numbers are the rig's numbers
and not invented ones. Where the rig cannot do a beat yet, the hook is named at
the end.

## Four rules

1. Honest load. A part cannot move before it exists. The ring in the empty
   socket counts parts attached, not elapsed time.
2. One action. The press is the only thing the visitor does. Everything after
   it is a consequence.
3. No cuts. Every arrival is a spring or a step. Nothing fades in, nothing
   teleports, no part appears at a size other than 1.
4. The antenna is last. Nothing else is allowed to still be moving when it
   settles.

## The physics I am writing against

| part | spring k/d | zeta | settle | overshoot | reads as |
|---|---|---|---|---|---|
| antenna | 150/9 | 0.37 | 0.89s | 28% | the last thing to stop |
| head | 110/16 | 0.76 | 0.50s | 2.5% | decisive, one small nod |
| arms | 130/14 | 0.61 | 0.57s | 8.7% | heavy, floats after a big lift |
| elbows | 120/14 | 0.64 | 0.57s | 6.9% | follows the arm, arrives later |
| lean | 70/12 | 0.72 | 0.67s | 4% | whole body, reluctant |
| squash | 190/13 | 0.47 | rebound at 260ms | 19% | takes a hit, bounces once |
| gaze | damp 7/s | n/a | 0.20s | none | eyes lead the head |

One line holds it together: the gaze is a damp, the head is a spring. That
difference in arrival time is the character. Never sync them.

## The clock

| # | in | out | part | the beat |
|---|---|---|---|---|
| B01 | 0.00 | 0.70 | bulb | the pixel is the only thing that exists, and it blinks |
| B02 | 0.70 | 1.60 | antBase, antRod | the rod grows out of it, downwards |
| B03 | 1.60 | 2.60 | the room | eight motes find him and light |
| B04 | 2.60 | 3.30 | treads, body, arms, ports | he lands already wearing everything but a head |
| B05 | 3.30 | 4.10 | neck socket | the honest stall: nothing moves, ring stops at 17/26 |
| B06 | 4.10 | 4.45 | right arm | false start: he tries to turn and fails |
| B07 | 4.45 | 5.05 | head | the drop, and the loudest frame in the piece |
| B08 | 5.05 | 5.60 | screen, eyes | one eye, 110ms, then the other |
| B09 | 5.60 | 6.10 | eyes | the double blink, and two frames of personality |
| B10 | 6.10 | 6.70 | arms, chest, antenna | the stretch, the only full-body beat |
| B11 | 6.70 | 7.20 | everything, then antenna | settle. antenna still moving at 7.16 |
| B12 | 7.20 | 7.85 | nothing | the held frame, 0.65s of deliberate air |
| B13 | 7.85 | 8.40 | antenna, head, chest | he hears you before he looks |
| B14 | 8.40 | 9.00 | gaze, head | the first look, then `hi.` |

---

### B01 / 0.00 to 0.70 / bulb

**motion** one amber 2x2 pixel at frame centre. It exists because it blinks:
out at 0.15 for 40ms, out at 0.55 for 40ms. Between blinks it breathes, 2px of
glow, 1.6s period.

**curve** sine breathe, hard cuts for the blinks. No fade in. The first painted
frame is already lit.

**expression** none. There is no face and there will not be one for five
seconds.

**sound** 40Hz sine from silence, 1.0s ramp, -30dB. One 8ms servo tick at 0.52
that has nothing to do with anything yet.

**camera** locked at 0.500 / 0.460 / 1.000. The CSS drift layer is already
running at 0.22% over 21s. Let it. Nobody will see it, and that is the point.

**note** if this frame feels empty, the answer is more black, not more object.

### B02 / 0.70 to 1.60 / antBase, antRod

**motion** the rod grows down out of the bulb in four segments of 5u, 60ms each,
30ms apart. The bulb dips 0.4u on each segment and springs back, because it is
now carrying something.

**curve** `steps()`, not ease. Four discrete moves with hard starts, so it reads
as a mechanism being bolted on rather than something growing.

**expression** none.

**sound** four rod ticks, 30ms each, 1.4k / 1.5k / 1.6k / 1.7k. That rise is the
only musical thing in the first three seconds.

**camera** still locked. At 1.55, one pixel of vertical settle as the weight
arrives.

**note** first motor turn of the character and it is upside down. He is built
top down because the head is the part that will be missing.

### B03 / 1.60 to 2.60 / the room

**motion** eight of the 28 motes drift within 90px of the bulb and light. They
were always there. The lighting is proximity, not state.

**curve** linear drift, per-mote sine sway at 0.1 to 0.3Hz. Nothing accelerates.

**expression** none.

**sound** noise bed, lowpass 1.2k, -26dB. Sub slides 40 to 44Hz across the whole
beat. HUD fades in at 2.20, late on purpose.

**camera** 0.4% push, 1.000 to 1.004, linear over 2.0s.

**note** the void has decided to have a subject. Do not add a light source. The
motes are the light and they are 1px each.

### B04 / 2.60 to 3.30 / treads, body, chest, arms, ports

**motion** body drops in from below, 12u, lands at 3.02. Arms unfold 60ms apart,
left leads, right replies. Hands flex twice. Ports and cable snap on last with a
40ms rattle. That is 17 of 26 parts, and the neck socket is the only hole.

**curve** `easeOutBack` at 1.4 overshoot for the entry, then the arm springs take
over. Landing squash is the 190/13 spring, two frames, one rebound, no second
bounce.

**expression** none. The socket is the brightest thing on screen because it is
the only hole.

**sound** tread thump 70Hz at 3.02, two arm servos 240Hz square 70ms, dust noise
lowpass 700. No music.

**camera** 1px dip on the thump, recovered by 3.45. Nothing else.

**note** he lands wearing his arms. The hole has to be the head, or the stall is
just a loading bar with a joke attached.

### B05 / 3.30 to 4.10 / neck socket

**motion** nothing moves. A dashed amber ring at the socket sweeps and stops at
17/26, then holds. The number in the middle is the wait in seconds and it stops
climbing because there is nothing left to attach.

**curve** linear. The ring is the only linear thing in the piece, because it is a
clock and clocks are not characters.

**expression** none. No face to express with. 0.8s of dead air inside 9s, and it
is the most important 0.8s here.

**sound** bed drops 6dB. One 320Hz triangle blip at 3.30 that does not resolve.
Then room tone, and the floor has to be real, or the stall reads as a bug.

**camera** fully locked, 3.30 to 4.10. The lock is the joke. No creep, no breath,
no vignette pulse.

**note** hold until the head reports available, 800ms floor. If the rig ever
loads for real, the stall is the load and the floor stops mattering.

### B06 / 4.10 to 4.45 / right arm

**motion** right shoulder tries to raise 6 degrees, elbow 9, hand 2u. Holds 90ms.
Then all three fall 4u below rest and stop. He is turning toward you with a neck
that has nothing on top of it. Direction follows the pointer if there is one.
Timing never does.

**curve** 90ms `easeOut`, then the target is deleted and a critically damped
spring (90/18) falls with no bounce. Do not ease the fall. Removing the target is
the whole gag.

**expression** none.

**sound** a 300Hz servo winds up for 80ms and cuts mid-note with no release tail.
Then a 40ms 90Hz clunk as the arm hits its stop. It should sound like a machine
giving up, not a sad trombone.

**camera** 2px right, 1px down on the twitch, held through the fall, released at
4.45.

**note** first time we hear his motors fail. One false start only. Two is a
running gag, and this piece has no room for one.

### B07 / 4.45 to 5.05 / head, bezel, screen, ears

**motion** head enters at -14u with zero velocity, falls 14u in 340ms, compresses
the neck 3u on contact, and the whole rig takes 6% squash for two frames. Ears
snap out 40ms after contact, never before.

**curve** `easeInQuad` on the way down. It is the only pure ease-in in the
sequence and it is why the hit has weight. Contact kicks headS +7 deg/s, so the
head nods 3 degrees forward and returns in 0.5s.

**expression** the screen is dead ink for eight frames. That is the longest he
goes without a face in the whole piece.

**sound** magnetic clack at 4.45, 2.4k tick 12ms, chest thump 55Hz 120ms, twelve
dust particles. The loudest frame in the intro.

**camera** 3px drop, spring back over 260ms, plus a 0.4% scale punch for two
frames. Use the squash spring family, not a lerp, so the camera has the same body
he does.

**note** everything after this is quieter on purpose. If the clack does not hurt,
the mix is wrong.

### B08 / 5.05 to 5.60 / screen, then eyeL, then eyeR

**motion** one scanline sweeps the screen top to bottom in 180ms. Left eye cuts
in at 5.28 as a 4u wide pupil with a 0.9u catchlight. Right eye at 5.39, 110ms
later. Mouth arrives at 5.48 as a 1.2u dot.

**curve** the sweep is a hard step. Each eye is a single frame, no fade, no
scale, because a CRT does not ease. The 110ms gap is the entire performance.

**expression** wide, which reads as newborn. Do not use happy here. Happy is a
reward and he has not done anything yet.

**sound** 680Hz square 60ms on the left eye, 520Hz triangle 50ms on the right. A
9kHz whine at -34dB for 300ms, then gone.

**camera** 1.5% push, 1.004 to 1.019, linear, 400ms. No shake.

**note** two eyes at once is a logo. One eye is a creature. Cheapest character
beat in the rig, and `paintEye` already knows how to do it.

### B09 / 5.60 to 6.10 / eyes

**motion** blink at 5.68, 140ms closed. The 16% branch sets the next blink to
260ms, so the second closes at 5.94 for 140ms. Then he holds his eyes open for
0.38s into the stretch, checking that they still work, and `one sec.` takes the
face at 6.46.

**curve** each blink is a cut. Closed is a 0.8u bar. Open is a hard return, no
eyelid animation, because he has a shutter and not lids.

**expression** wide, closed, wide, closed, open. Mouth stays a dot throughout.

**sound** two 1.1k ticks, 40ms, the second 4dB quieter. Nothing under them.

**camera** still. The camera has no opinion about a blink.

**note** first sign of personality in the piece and it costs two frames. It is
already latent in the rig's random branch. Author it here, leave it random
everywhere else.

### B10 / 6.10 to 6.70 / arms, chest, head, antenna

**motion** arms rise to 42 degrees, elbows to 28, chest lifts 2u, head tips back
and reaches only 11 of the 14 degrees asked for, because headLift is damped at
8/s. Antenna lays back 14 and does not come forward until after the arms are
down. Treads stay planted, weight on both.

**curve** arm springs with a 90ms stagger, settled by 6.42. The antenna is still
moving at 6.70 and that is the point of the beat.

**expression** eyes squint to a 2.6u bar at the peak, the only happy in the first
nine seconds, 200ms long. Mouth opens 2.4u for 200ms. If it reads as a yawn, cut
the mouth, keep the arms.

**sound** one long servo, 120 to 260Hz saw, lowpass 900, 300ms. A 90Hz creak 40ms
at the top. Room tone swells 1.5dB.

**camera** 2% pull-back, 1.019 to 1.000, so he stays the same size on screen as
he gets bigger. The only camera move that is about him and not the room.

**note** the only beat where he uses his whole body. If it does not feel like
relief, the arms are too slow. They are not too small.

### B11 / 6.70 to 7.20 / everything, then the antenna

**motion** arms drop to rest 6/9, chest settles, head returns to centre, antenna
overshoots 4 degrees forward and comes back. He does not look at anything yet.

**curve** springs only, no tweens. The antenna is the only part moving at 7.16
and does not stop until about 7.30, which is how the piece can end without ever
looking frozen.

**expression** eyes back to open, 3.2u, mouth flat. `one sec.` lands at 6.48 and
holds to 6.98, which blanks the face for half a second and gives the settle
somewhere to happen.

**sound** the saw is gone by 6.70. One 60Hz sub thump at 6.94 as the treads take
the weight. Then nothing, starting at 6.98, and the nothing is a cue.

**camera** 1.002, with a 0.3% right drift across 3s. So slow it only reads if you
look away and back.

**note** the old script's best frame starts here. I start the silence 0.4s early
so it has an attack.

### B12 / 7.20 to 7.85 / nothing

**motion** the bulb glow breathes 1.2%, the chest trace beat is the only moving
pixel, the dust keeps drifting. He does not blink.

**curve** 1.6s sine, his idle rate. Everything else is a constant.

**expression** open, flat, eyes centred at 0. He is not looking at you yet and
the wait is the setup.

**sound** room tone, sub 40Hz, no cues. Floor at -46dB and no higher.

**camera** dead still at 1.008. The number stops moving for the first time since
0.00, and the stillness needs a tight frame or it reads as a stall.

**note** 0.65s is enough to make a room feel occupied. If a review note says
"dead air", the note is about the mix, not the timing.

### B13 / 7.85 to 8.40 / antenna, head, chest

**motion** antenna tips 7 degrees toward the pointer before the head moves. Head
follows 60ms later and only 3 degrees. Chest lights 20%. He has heard you and has
not looked yet.

**curve** antS is the fastest spring in the rig and the head is the heaviest, so
this order is free. Do not force it with delays.

**expression** eyes widen 3.2 to 4u, pupils shift 1.2u toward the pointer, mouth
to a dot.

**sound** one 1.9k bandpass click, 8ms. A 38Hz note, 200ms, -30dB, that exists
only to tell the sub something is coming.

**camera** 3px toward the pointer, 1px up, lerp 0.04, and the push resumes to
1.012. First pointer-reactive camera in the piece.

**note** hearing before seeing. One frame of him knowing you are there before he
can prove it. On touch the pointer is the last touch point, and if there is none
he hears the frame itself and the beat plays unchanged.

### B14 / 8.40 to 9.00 / gaze, head, antenna

**motion** eyes land at 8.44. Head lands at 8.53 at 9 degrees, clamped, with one
2.5% overshoot at 8.68 and no wobble. One 2 degree nod at 8.72. The antenna is
still swinging at 9.00, about two thirds through its 0.89s settle, and it is the
last thing we see move.

**curve** gaze is a damp at 7/s, 0.20s. Head is the 110/16 spring, 0.50s. The
difference in arrival time is the character. Never sync them.

**expression** eyes locked, mouth flat, no blink. `hi.` lands at 8.86. Three
characters, so it sits on the face without blanking it. The next blink is at
10.9, under the hello.

**sound** three blips, A5 / C#6 / E6, 40ms each, 60ms apart, one per character.
Sub ducks 2dB so they land.

**camera** 4px push and 2px rise, ending at 1.035. Dust parallax turns on here,
6px against the pointer, and nowhere before, because a room should not move
before there is someone in it to see it.

**note** he looks at you last. Nine seconds of assembly, one double blink, one
stretch, and the whole thing is a setup for eye contact. Cut anything except
this.

---

## Hooks

Nine small changes, all inside `rusty.js` except the last line.

| beat | hook |
|---|---|
| B01 to B04 | `assemble(v)`, v from 0.02 to 0.42, with `asmAuto` off so each beat calls it. Reorder the `at` ladder so the antenna chain is in by 0.06 and the head is not before 0.44. |
| B05 | freeze at 0.42. Ring reads `partsIn / 26`. `intro.js` already draws a stall ring; move it onto the rig so there is one socket, not two. |
| B06 | new `rig.fail(side, dir)`: set the arm targets, delete them after 90ms. One function, no state. |
| B07 | the head needs a y approach. Override head `from` to `[0, -14]` and add `rig.drop(v)`, applied as `byId.head.oy`. |
| B08 | already there. `paintEye` hides eyeR while `state === "boot" && asm < 0.44`. Point that at the left eye's own `at` instead of the hard number. |
| B09 | authored blink: `rig.blink()` sets `blinkT = 0.14`. Call it twice. The 0.26 branch exists; the fix is calling it instead of rolling for it. |
| B10 | add a `stretch` state to `STATES` (head -14, ant 14, armL/R 42, elbL/R 28, eye `happy` for one frame then `open`, chest 0.9). Use the table, not inline angles. |
| B13, B14 | `setGaze` already drives head, antenna, eyes and arms. Feed it a damped pointer. Suspend the `still > 4` auto-look until 9.00 or he will look around on his own during the hold. |
| all | the pixel is the bulb. Remove the centre pixel from `void.js`'s canvas for this sequence or there are two of them, and two is the whole failure mode. |

## Copy under this plan

| in | out | where | copy |
|---|---|---|---|
| 4.52 | 5.02 | screen | `ow.` |
| 6.48 | 6.98 | screen | `one sec.` |
| 8.86 | 9.60 | screen | `hi.` |

Nothing else speaks. `waking him up` is scene 1's HUD word in `script.md`. If it
stays, it enters at 2.20 and is gone by 3.30, and it never touches his face.
`one sec.` is eight characters, so the rig gives it the whole screen and the face
goes dark for half a second. That is the reason it sits in the settle and not
across the blink.

## What I am not doing

- No music, no riser, no whoosh. The motors are the score.
- No second double blink. He gets one and that is his whole morning.
- No camera shake except two frames on the clack.
- No text before `ow.` at 4.52.
- No cursor follower, no tilt, no room parallax before 8.40.
- No fade at 9.00. The last frame of this document is the first frame of `hi.`

## Reduced motion and mobile

Reduced runs the same 14 beats at 38%, which the existing `D()` helper does. One
blink instead of two, the stretch loses its spring, the camera never moves, the
parallax never turns on. Total 3.42s.

At 375 the unit is `min(W/48, H/58) * 0.72`, so he is about a third of the width.
The drop stays. The 2px and 3px camera moves halve. `one sec.` goes to 2.5px
PS2P, which is under the legibility floor, so it is cut on mobile. `ow.` and
`hi.` are three characters each and survive at 6px.

## The count

14 beats in 9.00s. Two beats have no motion at all, B05 and B12, and together
they are 1.45s, 16% of the piece. Six beats are mostly hold: B04, B05, B07, B09,
B12, B14. If a build has fewer holds than that, it is busy, and busy is the one
thing this sequence cannot survive.
