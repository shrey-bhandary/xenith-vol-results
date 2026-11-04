# Rusty's face: the expression sheet

`dialogue.md` owns what he says. This file owns what his face does while he says
it: every expression as rects, every trigger, every duration, every ease, and
the talk cycle that runs on top of it.

Rusty is 26 parts at `scale = min(W / 48, H / 58) * 0.72`, so one rig unit is
about 6 CSS px on a 900 high window. A 0.4 unit rect is 2.4 px. Draw in rects,
snap to 0.05 units, never scale an expression.

## 1. Coordinate contract

The eye and mouth painters draw in their own part frames, not the screen frame.
This is why the numbers below look small.

| part | local x | local y | frame |
|---|---|---|---|
| `eyeL`, `eyeR` | -1.6 .. 1.6 | -1.6 .. 1.6 | 3.2 square |
| `mouth` | -2.2 .. 2.2 | -1.2 .. 1.2 | 4.4 by 2.4 |
| `screen` | -7.6 .. 7.6 | -10 .. 0 | 15.2 by 10 |
| `bezel`, `head` | parent frames | parent frames | no painting below the eyes |

Screen layout, y is negative up, 0 is the bottom of the screen:

```
 -10  +--------------------------+
      |     [eyeL]   [eyeR]      |   eye centres at y -6.2, 3.2 tall
  -5  |     long text band       |   PS2P 2.5, 1.6 .. 14.4 wide, 5+ chars
      |                          |
 -2.2 |     short text / mouth   |   PS2P 2.8, 1 .. 3 chars, or the mouth
   0  +--------------------------+
```

Rules:

- y is down. Negative is up. A pupil above centre has negative `py`.
- `side = p.id === "eyeR" ? 1 : -1` inside every eye painter, so lids and tears
  mirror without a second code path.
- `gx, gy` are the rig gaze, -1 .. 1, already damped by `update()`.
- `time` is seconds, module scope, already advanced by `update()`.
- All colors come from `C` in `rusty.js`. No new hues. Alpha variants of
  `C.red`, `C.cream` and `C.ink` are allowed, nothing brighter than the plate.
- Keep rect edges on a 0.05 unit step where the scale allows it. At scale 6 a
  0.15 unit sliver is one device pixel; never go thinner. Do not rotate the eye
  or mouth part. Rotation belongs to the head, the antenna and the arms.

### Parallax ladder

The cursor moves four planes, each one slower and smaller than the last:

| plane | what moves | amount | spring |
|---|---|---|---|
| pupil | inside the eye | gx * 0.55, gy * 0.40 units | damp 14 |
| head | the whole face | gx * 9 degrees, clamped 15 | 110 / 16 |
| body | lean at the treads | gx * 2.5 degrees | 70 / 12 |
| antenna | tip, last to settle | gx * 7 degrees | 150 / 9 |

`#rigCv` already drifts plus or minus 0.22 percent over 21s in CSS. Do not add a
second canvas drift. The ladder above is the parallax that reads as depth.

## 2. Channels

One expression is a preset over these channels. Numeric channels blend. Eye
kinds crossfade for 90ms; mouth kinds snap on the next closed frame. Never swap
a whole face on one string.

| channel | range | lambda | what it does |
|---|---|---|---|
| `eyeHW`, `eyeHH` | 1.30 .. 1.90 | 20 | red plate half extents |
| `glow` | 0 .. 0.55 | 8 | red halo outside the plate |
| `lidT` | 0 .. 3.20 | 24 | units covered from the top edge |
| `lidB` | 0 .. 3.20 | 24 | units covered from the bottom edge |
| `lidTilt` | -0.60 .. 0.60 | 18 | outer corner droop, units per eye half |
| `pupW`, `pupH` | 0.25 .. 0.70 | 18 | pupil half extents, ink core |
| `pupX`, `pupY` | -0.70 .. 0.70 | 14 | pupil centre, before gaze |
| `mouth` | 0 .. 1.20 | 26 | talk envelope, 0 closed, 1.2 wide open |
| `mouthW` | 2.40 .. 4.00 | 20 | talk mouth width |
| `head` | -15 .. 15 deg | spring 110 / 16 | tilt, added to gaze |
| `lean` | -6 .. 6 deg | spring 70 / 12 | torso at the treads |
| `ant` | -22 .. 22 deg | spring 150 / 9 | antenna, always last |
| `armL`, `armR` | 0 .. 118 deg | spring 130 / 14 | positive is outward |
| `elbL`, `elbR` | 0 .. 117 deg | spring 120 / 14 | forearms |
| `lift` | -2.5 .. 1.5 | damp 8 | head on the neck, units |
| `bob`, `rate` | 0 .. 1.4 | n/a | idle bob, existing formula |
| `chest` | 0 .. 1 | damp 8 | chest screen brightness |

`lidT` is a cover, not a half extent. `0` is open, `3.2` is fully shut, `2.3`
leaves a 0.9 unit band before the bottom lid takes its 0.35. This is the only
place the old `eye: "open"` strings survive.

## 3. Reference painters

Paste these into `rusty.js` under `paintEye` and `paintMouth`. Every call in
section 5 resolves to one of them, so the call lists stay exact without
repeating the rect math fourteen times. Set `var side = p.id === "eyeR" ? 1 : -1`
once at the top of `paintEye`, before any helper call.

```js
/* eye part frame: x -1.6..1.6, y -1.6..1.6, y down. side is -1 left, +1 right. */

function eyePlate(hw, hh, glow) {
  if (glow > 0) {
    ctx.fillStyle = "rgba(255,92,59,.13)";
    ctx.fillRect(-hw - glow, -hh - glow, hw * 2 + glow * 2, hh * 2 + glow * 2);
  }
  ctx.fillStyle = C.red;
  ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
}

function eyePupil(cx, cy, phw, phh) {
  ctx.fillStyle = C.ink;
  ctx.fillRect(cx - phw, cy - phh, phw * 2, phh * 2);
  ctx.fillStyle = C.cream;
  ctx.fillRect(cx - phw + 0.14, cy - phh + 0.14, 0.30, 0.30);
}

function eyeLidTop(cover, tilt, side) {
  if (cover <= 0.02) return;
  for (var i = 0; i < 4; i++) {
    var x = -1.7 + i * 0.85;
    var f = ((i + 0.5) / 4) * 2 - 1;                 /* -0.75 .. 0.75 */
    var h = cover + tilt * f * side;
    h = Math.max(0, Math.min(3.2, h));
    ctx.fillStyle = C.ink;
    ctx.fillRect(x, -1.75, 0.85, h + 0.15);
    ctx.fillStyle = "rgba(255,92,59,.85)";
    ctx.fillRect(x, -1.6 + h - 0.22, 0.85, 0.22);
  }
}

function eyeLidBottom(cover, side) {
  if (cover <= 0.02) return;
  var h = Math.min(3.2, cover);
  ctx.fillStyle = C.ink;
  ctx.fillRect(-1.7, 1.6 - h, 3.4, h + 0.15);
  ctx.fillStyle = "rgba(255,92,59,.70)";
  ctx.fillRect(-1.7, 1.6 - h - 0.18, 3.4, 0.18);
}

function eyeHappy(w) {
  ctx.fillStyle = C.red;
  ctx.fillRect(-w, -0.30, w * 2, 0.80);
  ctx.fillRect(-w, -1.70, 0.90, 1.50);
  ctx.fillRect(w - 0.90, -1.70, 0.90, 1.50);
}

function eyeLaugh() {
  ctx.fillStyle = C.red;
  ctx.fillRect(-1.70, 0.05, 3.40, 0.85);
  ctx.fillRect(-1.70, -1.00, 0.95, 1.25);
  ctx.fillRect(0.75, -1.00, 0.95, 1.25);
  ctx.fillStyle = C.cream;
  ctx.fillRect(side * 1.85 - 0.20, -1.45, 0.40, 0.40);
}

function eyeX() {
  ctx.fillStyle = C.red;
  ctx.fillRect(-1.55, -1.55, 3.10, 3.10);
  ctx.fillStyle = C.ink;
  for (var i = 0; i < 7; i++) {
    var o = -1.30 + i * 0.38;
    ctx.fillRect(o, o, 0.34, 0.34);
    ctx.fillRect(-o - 0.34, o, 0.34, 0.34);
  }
  ctx.fillStyle = C.cream;
  ctx.fillRect(-0.17, -0.17, 0.34, 0.34);
}

/* mouth part frame: x -2.2..2.2, y -1.2..1.2 */

function mouthFlat(w, h) {
  ctx.fillStyle = C.amber;
  ctx.fillRect(-w / 2, -h / 2, w, h);
}

function mouthTiny(w, h) {
  ctx.fillStyle = C.amber;
  ctx.fillRect(-w / 2, -0.10, w, h);
  ctx.fillStyle = C.ink;
  ctx.fillRect(-w * 0.28, 0.04, w * 0.56, 0.20);
}

function mouthDot(s) {
  ctx.fillStyle = C.amber;
  ctx.fillRect(-s / 2, -0.20, s, s);
}

function mouthWavy(ph) {
  var a = Math.sin(ph) * 0.22, b = Math.sin(ph + 2.1) * 0.22, c = Math.sin(ph + 4.2) * 0.22;
  ctx.fillStyle = C.amber;
  ctx.fillRect(-2.2, -0.15 + a, 1.4, 0.90);
  ctx.fillRect(-0.6, 0.25 + b, 1.2, 0.90);
  ctx.fillRect(0.8, -0.15 + c, 1.4, 0.90);
}

function mouthSmile(k) {
  ctx.fillStyle = C.amber;
  ctx.fillRect(-2.2, -0.25 - k * 0.65, 1.0, 1.0);
  ctx.fillRect(1.2, -0.25 - k * 0.65, 1.0, 1.0);
  ctx.fillRect(-1.2, 0.10, 2.4, 0.90 * k);
}

function mouthOpen(w, h) {
  ctx.fillStyle = C.amber;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = C.ink;
  ctx.fillRect(-w * 0.28, -h * 0.10, w * 0.56, h * 0.36);
}

function mouthLaugh(k) {
  ctx.fillStyle = C.amber;
  ctx.fillRect(-1.70, -1.10, 3.40, 2.20 * k);
  ctx.fillStyle = C.ink;
  ctx.fillRect(-1.10, -0.55, 2.20, 0.90 * k);
  ctx.fillStyle = C.cream;
  ctx.fillRect(-1.30, -0.55, 2.60, 0.25);
}

function mouthGrit() {
  ctx.fillStyle = C.amber;
  ctx.fillRect(-1.60, -0.55, 3.20, 1.10);
  ctx.fillStyle = C.ink;
  for (var i = 0; i < 3; i++) ctx.fillRect(-1.00 + i * 0.90, -0.55, 0.18, 1.10);
}

function mouthDroop(w, h) {
  ctx.fillStyle = C.amber;
  ctx.fillRect(-w / 2, 0.05, w, h);
  ctx.fillRect(-w / 2 - 0.35, 0.35, 0.35, h);
  ctx.fillRect(w / 2, 0.35, 0.35, h);
}

function mouthSlit(x) {
  ctx.fillStyle = C.amber;
  ctx.fillRect(-2.20, 0.15, 4.40, 0.50);
  ctx.fillStyle = C.ink;
  ctx.fillRect(x, 0.15, 0.50, 0.50);
}

function mouthTalk(mouth, w) {
  var h = 0.35 + mouth * 1.10;
  ctx.fillStyle = C.amber;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  if (h > 0.80) {
    ctx.fillStyle = C.ink;
    ctx.fillRect(-w * 0.27, -h * 0.18, w * 0.54, h * 0.40);
  }
}
```

### Screen text

The stamp is drawn in the screen frame, not a part frame. It is one function,
shared by every expression. It fixes the existing overflow: 8 characters at 2.5
units are 20 units wide and the screen is 15.2.

```js
function screenText(label, y) {
  var big = label.length >= 4;
  var size = Math.min(big ? 2.5 : 2.8, 14.4 / (label.length || 1));
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (!big) {
    ctx.fillStyle = C.ink;
    ctx.fillRect(-4.4, -3.6, 8.8, 2.8);
  }
  ctx.font = size + "px PS2P, 'Press Start 2P', ui-monospace, monospace";
  ctx.fillStyle = C.cream;
  ctx.globalAlpha = 0.90 + Math.sin(time * 12) * 0.08;
  ctx.fillText(label, 0, big ? -5 : y);
  ctx.globalAlpha = 1;
}

/* the stamp setter. stamp and stampUntil are module vars, "" and 0. */
function screen(label, holdMs) {
  stamp = label || "";
  stampUntil = time + holdMs / 1000;
}
```

- Long stamp, 4 or more characters: `screenText(label, 0)` at y -5, eyes and
  mouth are skipped for its whole life.
- Short stamp, 1 to 3 characters: `screenText(label, -2.2)` at the mouth slot,
  eyes stay, the mouth is skipped.
- Never more than 8 characters. `one sec.` and `prove it` are the widest at 8
  and land on 1.8 units, about 11 px. Readable, and it fits.
- Word stamps hold 1.2s. `FOUND` holds to handoff. The gate stamps follow
  `dialogue.md`: `...`, `almost`, `?`, `FOUND`.
- `paintScreen` calls `screenText` only while `time < stampUntil`, then clears
  the stamp. A zero hold clears on the next frame.

## 4. The atlas

Eight eye kinds, ten mouth kinds. Every expression in section 5 is one
combination plus numbers. Kinds are exclusive: two kinds can crossfade for 90ms,
never more.

| kind | call | what it reads as |
|---|---|---|
| E0 open | `eyePlate` + `eyePupil` + lids | the default eye, everything else modifies it |
| E1 wide | `eyePlate(1.90, 1.85, .50)` | surprise, first contact, new object |
| E2 focus | `eyePlate(1.50, 1.35, .15)` | narrowed, serious, worried |
| E3 happy | `eyeHappy(1.60)` | closed bracket, amused |
| E4 laugh | `eyeLaugh()` | lower bracket plus an off-corner sparkle |
| E5 sleepy | `eyePlate` + `lidT 2.30` | a 0.55 unit slit near the bottom |
| E6 x | `eyeX()` | dead, error, one beat only |
| E7 scan | `eyePlate` + pupil bar | a moving read head |
| M0 flat | `mouthFlat(4.40, .80)` | neutral, no comment |
| M1 tiny | `mouthTiny(1.60, .55)` | about to listen, slightly parted |
| M2 dot | `mouthDot(1.20)` | a question, a thought |
| M3 wavy | `mouthWavy(ph)` | unsure, computing |
| M4 smile | `mouthSmile(k)` | pleased, k 0 .. 1 |
| M5 open | `mouthOpen(2.80, 1.80)` | excited, mid vowel |
| M6 laugh | `mouthLaugh(k)` | open laugh, teeth line |
| M7 grit | `mouthGrit()` | error, mechanical |
| M8 droop | `mouthDroop(3.20, .55)` | concerned, corners down |
| M9 slit | `mouthSlit(x)` | scanning, a moving read line |

## 5. The thirteen expressions

Three tables, then one block per expression with the exact calls and the life
that keeps it from being a still. Durations are milliseconds. `outCubic`,
`outBack`, `inOutSine` and `damp` are the only eases used.

### 5.1 Face

| expr | eye | lid T / B / tilt | pupil (half, x, y) | mouth | screen |
|---|---|---|---|---|---|
| neutral | E0 1.60 | .25 / .10 / 0 | .50, .05, .02 | M0 | none |
| listening | E0 1.60 x 1.55 | .55 / .30 / .10 | .48, gaze, .10 + gaze | M1 | none |
| curious | E1 1.86 x 1.82 | .10 / 0 / 0 | .34, .15, -.25 | M2 | `?` 700 |
| thinking | E0 1.60 x 1.50 | .80 / .20 / -.18 | .42, -.35, -.45 | M3 | `...` loop |
| happy | E3 | none | hidden | M4 | none |
| laugh | E4 | none | hidden | M6 | `ha` 240 |
| proud | E3 1.55 | none | hidden | M4 | none |
| confused | E1 1.75 x 1.70 | .35 / 0 / .25 | L -.20,-.50 / R .25,.35 | M3 | `?` 600 |
| concerned | E2 1.50 x 1.35 | 1.15 / .45 / .55 | .60, .10, .35 | M8 | none |
| scanning | E0 1.50 x 1.45 | .60 / .20 / 0 | bar .26 x 1.05, sweeping | M9 | `...` loop |
| excited | E1 1.90 x 1.85 | 0 / 0 / 0 | .30, gaze, gaze | M5 | none |
| sleepy | E5 | 2.30 / .35 / 0 | .35, .05, .95 | M2 0.95 | `z` 1200 |
| error | E6 | 0 / 0 / 0 | none | M7 | `err` 900 |

### 5.2 Body

Degrees. `arms` is left / right outward, `elbows` the forearm.

| expr | head | lean | ant | arms | elbows | bob / rate | lift | chest |
|---|---|---|---|---|---|---|---|---|
| neutral | 0 | 0 | 0 | 6 / 6 | 9 / 9 | .55 / 1 | 0 | .5 |
| listening | 2 | 1.5 | 4 | 8 / 8 | 12 / 12 | .35 / 1 | 0 | .6 |
| curious | -5 | -2 | 10 | 6 / 22 | 10 / 40 | .70 / 1.2 | -1.4 | .65 |
| thinking | 7 | 2 | -8 | 6 / 100 | 9 / 117 | .45 / .9 | 0 | .35 |
| happy | -3 | -1 | 7 | 16 / 16 | 14 / 14 | .65 / 1.1 | -1.5 | .9 |
| laugh | -6 | -2 | 14 | 40 to 52 | 20 / 20 | 1.40 / 3 | -2.5 | 1 |
| proud | -3 | 0 | 7 | 20 / 20 | 8 / 8 | .65 / 1.1 | -1.5 | .9 |
| confused | 9 | 3.5 | -14 | 26 / 26 | 38 / 38 | .50 / .8 | 0 | .3 |
| concerned | 4 | 2.5 | -4 | 12 / 12 | 16 / 16 | .30 / .9 | 0 | .4 |
| scanning | sweep 13 | 0 | sweep 7 | 10 / 10 | 14 / 14 | .65 / 1 | 0 | .7 |
| excited | -2 | -3 | 15 | 30 / 30 | 20 / 20 | 1.15 / 2.6 | -2 | 1 |
| sleepy | 6 | 3 | -10 | 4 / 4 | 6 / 6 | .20 / .6 | 1.5 | .25 |
| error | 0 | 0 | 0 | 3 / 3 | 2 / 2 | 0 / 0 | 0 | .15 |

### 5.3 Timing

| expr | trigger | in | hold | out | ease | prio |
|---|---|---|---|---|---|---|
| neutral | boot settled, a line ended 1.5s ago | 240 | hold | 240 | outCubic | 1 |
| listening | a line is typing, a row is lit, the pad is armed | 160 | hold | 220 | outCubic | 2 |
| curious | first row, a new object, 0.24s after a bark | 180 | 900 | 420 | outBack 1.12 | 2 |
| thinking | a typing pause over 350ms, 1.2s gate stall, 30% | 200 | 1600 | 260 | outCubic | 2 |
| happy | a pick lands, a coverage tick over 55% | 160 | 900 | 240 | outCubic | 3 |
| laugh | `ow.`, the explore pick, the 5.60 shake | 120 | 520 | 200 | outBack 1.35 | 3 |
| proud | hatch at 16.00, the frame out, the 30.00 settle | 220 | 1400 | 400 | outCubic | 3 |
| confused | a backwards stroke, a bad key, a fast move | 180 | 1200 | 260 | outCubic | 4 |
| concerned | 60% coverage, a 1.2s stall, a cut line | 260 | 1800 | 320 | inOutSine | 4 |
| scanning | gate armed, a stroke in flight, boot face check | 120 | hold | 200 | inOutSine | 2 |
| excited | first contact on the pad, a coverage tick | 120 | 700 | 200 | outBack 1.30 | 4 |
| sleepy | 18s of no pointer and no line, before the face boots | 600 | hold | 400 | inOutSine | 0 |
| error | a missing module, a font or audio failure | 90 | 1600 | 400 | step, then outCubic | 5 |
| boot | `assemble()` 0 .. 1 | asm | asm | 240 | outCubic | 5 |
| found | both guides pass, 28.60 | 120 | 1400 | 300 | outBack 1.20 | 6 |

Priority wins. Found cannot be interrupted. Error beats everything except
found. Sleepy yields to anything, including a gaze change.

### 5.4 One block per expression

The calls are the body of `paintEye` / `paintMouth` for that preset. Lids are
drawn after the pupil so a half-lid cuts a pupil cleanly. `screen()` is the
stamp setter, `screenText` the painter.

#### neutral

```
trigger  a line ended 1.5s ago, nothing new on screen
timing   240 in, hold, 240 out, outCubic, P1
eye      E0 1.60 x 1.60, glow .25, lid .25 / .10, pupil .50 at (.05, .02)
mouth    M0
screen   none
body     head 0, lean 0, ant 0, arms 6/6, elbows 9/9, bob .55/1, chest .5
calls    eyePlate(1.60, 1.60, .25);
         eyePupil(.05 + Math.sin(time * .9) * .04, .02, .50, .50);
         eyeLidTop(.25, 0, side);
         eyeLidBottom(.10, side);
         mouthFlat(4.40, .80);
life     blink every 3.0 to 4.4s. pupil drifts 0.04 units with the breath.
         after four still seconds `update()` already looks around, leave it.
```

#### listening

```
trigger  a line is typing, a row is lit, the pad is armed before first contact
timing   160 in, hold, 220 out, outCubic, P2
eye      E0 1.60 x 1.55, glow .30, lid .55 / .30, tilt .10, pupil .48 at gaze
mouth    M1
screen   none
body     head 2, lean 1.5, ant 4, arms 8/8, elbows 12/12, bob .35/1, chest .6
calls    eyePlate(1.60, 1.55, .30);
         eyePupil(gx * .55, .10 + gy * .40, .48, .52);
         eyeLidTop(.55, .10, side);
         eyeLidBottom(.30, side);
         mouthTiny(1.60, .55);
life     every third typed character dips the antenna 1.5 degrees, one
         antS.kick(.20) alternating sign. the mouth does not move. listening
         is silence with the rig's life in it, never a loop.
```

#### curious

```
trigger  the first row at 11.10, a new object, a hover on Rusty himself
timing   180 in, 900 hold, 420 out, outBack 1.12, P2
eye      E1 1.86 x 1.82, glow .45, lid .10, pupil .34 at (.15 + gx*.5, -.25)
mouth    M2 1.20
screen   `?` 700ms
body     head -5, lean -2, ant 10, arms 6/22, elbows 10/40, bob .70/1.2, lift -1.4, chest .65
calls    eyePlate(1.86, 1.82, .45);
         eyePupil(.15 + gx * .50, -.25 + gy * .40, .34, .36);
         eyeLidTop(.10, 0, side);
         mouthDot(1.20);
         screen("?", 700);
life     the text lands first, the eyes go wide on the same frame, the head cocks
         two frames later. head -5 plus a 1.5 degree cock at 2.2Hz. after the
         stamp clears, hold the wide plate at 85 percent for 600ms, then settle
         to listening.
```

#### thinking

```
trigger  a typing pause over 350ms, the 1.2s gate stall, 30% coverage
timing   200 in, 1600 hold, 260 out, outCubic, P2
eye      E0 1.60 x 1.50, glow .20, lid .80 / .20, tilt -.18, pupil .42 at (-.35, -.45)
mouth    M3
screen   `...` loop, the dots already animate at 2.4Hz
body     head 7, lean 2, ant -8, arms 6/100, elbows 9/117, bob .45/.9, chest .35
calls    eyePlate(1.60, 1.50, .20);
         eyePupil(-.35 + Math.sin(time * .7) * .06, -.45, .42, .44);
         eyeLidTop(.80, -.18, side);
         eyeLidBottom(.20, side);
         mouthWavy(.40 + Math.sin(time * 1.7) * .15);
         screen("...", 0);
life     hand to the jaw, armR 100 and elbR 117. double blink: after the first
         blink set blinkNext 0.26. the pupil drifts left 0.06 units a second,
         as if the thought is off screen.
```

#### happy

```
trigger  a pick lands, a coverage tick over 55%, a good answer
timing   160 in, 900 hold, 240 out, outCubic, P3
eye      E3, no pupil, no lid
mouth    M4 .90
screen   none
body     head -3, lean -1, ant 7, arms 16/16, elbows 14/14, bob .65/1.1, lift -1.5, chest .9
calls    eyeHappy(1.60);
         mouthSmile(.90);
life     one squash at onset, squashV += .9. a 1.2 degree head bob at 2.2Hz.
         hands flex 0.05 rad. nothing else. happy is small.
```

#### laugh

```
trigger  `ow.`, the explore pick, the 5.60 shake, the found pre-roll
timing   120 in, 520 hold, 200 out, outBack 1.35 plus a spring, P3
eye      E4
mouth    M6 1.0 to 1.15
screen   `ha` 240ms
body     head -6, lean -2, ant 14, arms 40 to 52, elbows 20/20, bob 1.40/3, lift -2.5, chest 1
calls    eyeLaugh();
         mouthLaugh(1.00 + Math.abs(Math.sin(time * 9)) * .15);
         screen("ha", 240);
life     three bounces at 170ms: head -6 plus 3 degrees of decay, lift -2.5,
         arms 40 to 52 with a 6Hz flutter, one dust puff at t+90, chest 1.
         antenna kick .9. the sparkle fires on every other laugh.
```

#### proud

```
trigger  hatch at 16.00, the frame out at 18.00, the hold at 29.60
timing   220 in, 1400 hold, 400 out, outCubic, P3
eye      E3 1.55
mouth    M4 1.00
screen   none, or `prove it` / `i'll know` as stamps
body     head -3, lean 0, ant 7, arms 20/20, elbows 8/8, bob .65/1.1, lift -1.5, chest .9
calls    eyeHappy(1.55);
         mouthSmile(1.00);
life     chin up: lift -1.5 and one nod at onset, headS.kick(.36). hands to
         hips, armL/R 20 and elbows 8. one slow blink 400ms after onset. the
         antenna is the last thing to stop, as always.
```

#### confused

```
trigger  a backwards stroke, a bad key, a fast move, a pointer circling
timing   180 in, 1200 hold, 260 out, outCubic plus a shake, P4
eye      E1 1.75 x 1.70, glow .30, lid .35, tilt .25, two different pupils
mouth    M3
screen   `?` 600ms
body     head 9, lean 3.5, ant -14, arms 26/26, elbows 38/38, bob .50/.8, chest .3
calls    eyePlate(1.75, 1.70, .30);
         if (side < 0) eyePupil(-.20, -.50, .45, .45);
         else          eyePupil(.25, .35, .45, .45);
         eyeLidTop(.35, .25, side);
         mouthWavy(.55 + Math.sin(time * 8.4) * .15);
         screen("?", 600);
life     head +9 plus sin(time*8.4)*sin(time*1.7)*3 degrees. suppress the blink
         for the first 300ms so the asymmetric pupils read. antenna kicks -1.0.
         after 1.2s go to concerned, never stay confused.
```

#### concerned

```
trigger  60% coverage, a 1.2s stall, a line cut for time, audio denied
timing   260 in, 1800 hold, 320 out, inOutSine, P4
eye      E2 1.50 x 1.35, glow .15, lid 1.15 / .45, tilt .55, pupil .60 at (.10, .35)
mouth    M8
screen   none
body     head 4, lean 2.5, ant -4, arms 12/12, elbows 16/16, bob .30/.9, chest .4
calls    eyePlate(1.50, 1.35, .15);
         eyePupil(.10, .35, .60, .60);
         eyeLidTop(1.15, .55, side);
         eyeLidBottom(.45, side);
         mouthDroop(3.20, .55);
life     one blink at 200ms, lid to 3.2 for 120ms. lean in 2.5 degrees toward
         the glass. the pupil grows: concern is a soft lens, not a frown.
```

#### scanning

```
trigger  the gate is armed, a stroke is in flight, the face checks at 4.0
timing   120 in, hold, 200 out, inOutSine, P2
eye      E0 1.50 x 1.45, glow .20, lid .60 / .20, pupil bar .26 x 1.05
mouth    M9
screen   `...` loop
body     head sweep 13, lean 0, ant sweep 7, arms 10/10, elbows 14/14, bob .65/1, chest .7
calls    var sx = Math.sin(time * 4.6) * .62;
         eyePlate(1.50, 1.45, .20);
         eyePupil(sx, .10, .26, 1.05);
         ctx.fillStyle = "rgba(255,233,176,.35)";
         ctx.fillRect(sx - .40, -.85, .12, 1.70);
         eyeLidTop(.60, 0, side);
         eyeLidBottom(.20, side);
         mouthSlit((time * 1.1) % 3.7 - 1.85);
         screen("...", 0);
life     head sweeps 13 degrees at 1.6Hz, the antenna follows at 7. the bar
         trails a cream edge so the direction reads. the mouth slit and the eye
         bar never move at the same speed: 4.6 rad/s against one pass every 3.4s.
```

#### excited

```
trigger  first contact on the pad, a coverage tick, a hover after idle
timing   120 in, 700 hold, 200 out, outBack 1.30, P4
eye      E1 1.90 x 1.85, glow .50, no lids, pupil .30 at gaze
mouth    M5
screen   none
body     head -2, lean -3, ant 15, arms 30/30, elbows 20/20, bob 1.15/2.6, lift -2, chest 1
calls    eyePlate(1.90, 1.85, .50);
         eyePupil(gx * .60, gy * .35, .30, .32);
         mouthOpen(2.80, 1.80);
life     sparks every 180ms, sparkT .18. one squash at onset. bob 1.15 at 2.6.
         the halo pulses at 9Hz, but only its alpha: never scale the plate.
```

#### sleepy

```
trigger  18s with no pointer and no line, or the 0.00 void before the face boots
timing   600 in, hold, 400 out, inOutSine, P0
eye      E5, lid 2.30 / .35, pupil .35 at (.05, .95)
mouth    M2 0.95, breathing 0.80 to 1.10
screen   `z` 1200ms, repeating
body     head 6, lean 3, ant -10, arms 4/4, elbows 6/6, bob .20/.6, lift 1.5, chest .25
calls    eyePlate(1.60, 1.60, .10);
         eyePupil(.05, .95, .35, .28);
         eyeLidTop(2.30, 0, side);
         eyeLidBottom(.35, side);
         mouthDot(.90 + Math.sin(time * .8) * .15);
         screen("z", 1200);
life     head +6 with a 2.4s droop cycle, lift 1.5. antenna -10. one long blink
         every 2.4s, lid 2.9 for 240ms, then the slit returns. anything at all,
         a pointer move, a key, a line, wakes him in 120ms.
```

#### error

```
trigger  a module fallback, a font or audio failure, an unknown state name
timing   90 in, 1600 hold, 400 out, step then outCubic, P5
eye      E6
mouth    M7
screen   `err` 900ms
body     head 0, lean 0, ant 0, arms 3/3, elbows 2/2, bob 0/0, chest .15
calls    eyeX();
         mouthGrit();
         screen("err", 900);
life     four frames of 0.08 unit jitter, then dead still. arms 3/3, no bob, no
         blink. one antenna spark, no more. this is diegetic, not a crash
         screen: no color outside the palette, no red flash on the page.
```

#### boot

```
trigger  assemble(), 0 to 1, the scene 2 window
timing   follows asm, out 240, P5
eye      E0 1.55, glow .20, lid .10, pupil .42 at (.10 + gx*.3, -.05)
mouth    M2 1.10
screen   `ow.` 3.00 to 4.20, `one sec.` 4.20 to 5.60
body     head 0 sway 1.7, lean 0, ant 0, arms 3/3, elbows 3/3, bob .8, chest .2
calls    eyePlate(1.55, 1.55, .20);
         eyePupil(.10 + gx * .30, -.05, .42, .42);
         eyeLidTop(.10, 0, side);
         mouthDot(1.10);
life     eyeR paints only after asm .44, eyeL after .34, the existing rule. a
         1.7 degree sway at 2.4Hz, as if the head is still loose. lid snaps for
         120ms at asm .44. this is the only expression that may show one eye.
```

#### found

```
trigger  both guides pass at 28.60
timing   120 in, 1400 hold to handoff, 300 out, outBack 1.20, P6
eye      skipped by the stamp
mouth    skipped by the stamp
screen   `FOUND`, 5 chars, holds to handoff
body     head -6, lean 0, ant 19, arms 118/118, elbows 8/8, bob 1.3/3, lift -2.5, chest 1
calls    screen("FOUND", 1400);
         /* no eye, no mouth: the stamp is the whole face */
life     spin 420ms, arms 118, antenna 19, 46 confetti, chest 1, one cream
         screen flash. the stamp holds to handoff, then falls to proud. found
         is the only expression that may not be interrupted.
```

#### presenting

Not one of the thirteen, kept because `dialogue.md` and `intro.js` call it. It
is a combo, not a preset: proud body, `mouthSmile(.8)`, eyes E0 1.60 at gaze,
and a short stamp (`hi`, `hello`). Set it as `expr: "proud"`, then override the
mouth and the stamp. This is why the console face icon comes off: he is already
on screen.

## 6. Waking

The boot is not one expression. It is eight beats, keyed to `asm`, and the face
is deliberately late.

| asm | what just arrived | face | calls |
|---|---|---|---|
| .00 | antenna only | dark | no screen paint |
| .26 | screen | scanline, no eyes | `screenText` off, screen flicker .9 |
| .34 | eyeL | one eye | boot calls, eyeR skipped |
| .44 | eyeR | two eyes, lid snap | boot calls, 120ms lid to 1.0 |
| .55 | head seated | `ow.` | short stamp, mouth off |
| .70 | neck, body | shake | confused at .6 weight for 300ms |
| .80 | arms | `one sec.` | long stamp, eyes off |
| 1.0 | treads, dust | settle | neutral, then listening at 8.40 |

The shake is the first joke. It is confused and laugh blended 60/40 for 520ms,
head at 8Hz, no text. Never play it as a still.

## 7. The talk cycle

`menu.js` types at 26ms a character, blips every third. The mouth is driven by
the same clock, not by a separate timer, so his lips and the console cannot
drift apart.

### 7.1 Character classes

Lowercase first. A word keeps its punctuation, but the punctuation still closes
the mouth.

| class | characters | mouth target | width | hold |
|---|---|---|---|---|
| vowel | a e i o u | .90 to 1.20 | 3.4 | one vowel group |
| bilabial | m b p | .05 then .55 | 2.6 | two glyphs |
| plosive | t d k g c q | .15 then .75 | 3.0 | two glyphs |
| fricative | f s z v h x j | .45 | 2.8 | one or two |
| liquid | l r w | .62 | 3.0 | one |
| nasal | n | .30 | 2.6 | one |
| space, punctuation | space . , ? ! | 0 | 4.4 | one plus 40ms |
| ellipsis | `...` | .35 to .55 | 2.4 | 180ms a dot |

Rules:

- One flap per vowel group, not per letter. `hello` is two flaps, `one` is one.
- Inside a word the mouth never closes below .25. It closes fully on a space or
  a full stop. That is the syllable rhythm.
- A bilabial closes first, then pops. A plosive pops, then closes. Do not blur
  the two: the difference is half the lip sync.
- Jitter every peak by plus or minus .10 from a syllable index hash, so no two
  flaps are identical. Never more than .15.
- The envelope is `mouth = damp(mouth, target, 26, dt)`, attack 40ms, release
  60ms. At 26ms a glyph, the shape reaches about half a target in one glyph,
  about 63 percent in 40ms, which is the softness a pixel mouth needs.

### 7.2 The call

When `talking`, the mouth is not M0 to M9. It is:

```js
mouthTalk(mouth, mouthW);
```

`mouthW` is 3.0 plus mouth times 0.6, clamped 2.8 to 3.8. The expression's own
mouth is restored 120ms after the last character, so the face finishes the
sentence before it settles.

### 7.3 Example: `oh. hello.` (10 chars, 260ms)

| t | char | class | target | width | notes |
|---|---|---|---|---|---|
| 0 | o | vowel | 1.00 | 3.4 | nod starts, blink suppressed |
| 26 | h | fricative | .45 | 2.8 | |
| 52 | . | close | 0 | 4.4 | 40ms hold, dart window |
| 78 | space | close | 0 | 4.4 | |
| 104 | h | fricative | .45 | 2.8 | second sentence nod |
| 130 | e | vowel | 1.05 | 3.4 | peak |
| 156 | l | liquid | .62 | 3.0 | |
| 182 | l | liquid | .58 | 3.0 | |
| 208 | o | vowel | .95 | 3.4 | final peak |
| 234 | . | close | 0 | 4.4 | lean +0.6, settle to listening |

### 7.4 Eye darts

- Decide at word boundaries. 35 percent chance, at least 900ms apart, one in
  flight.
- Target: 60 percent the cursor, 30 percent the lit row or the glass, 10 percent
  a random point plus or minus .35.
- Move 110ms, hold 260 to 520ms, return 140ms. `pupX/Y` damp at 14 while
  moving, 8 while holding.
- Never dart while `mouth > .75`. The mouth is the beat, the eyes are the rest.
- At the last full stop, return to the listener and stay.

### 7.5 The nod and the antenna

- First syllable of a sentence: `headS.kick(.36)`, a 2 degree overshoot, plus a
  0.35 unit dip on `byId.head.oy` over 240ms.
- Stressed syllable: the longest vowel group in a word of four or more, once,
  `headS.kick(.18)`, 1.2 degrees.
- Last full stop: 2.6 degrees, lean +0.6, then release.
- Each syllable kicks the antenna `(i % 2 ? 1 : -1) * .22`. It settles about
  350ms after the last one, which is why it is always the last thing to stop.
- Blips come every third character. A vowel peak must land within one glyph of
  a blip; stretch the peak, never speed up the typing.

### 7.6 The stamp rule

A long stamp (4 or more characters) hides the eyes and the mouth for its whole
life. Never speak under one. A short stamp shares the mouth slot, so it hides
the mouth, and it yields while a line is typing, returning 240ms after the last
character. `FOUND` is the one stamp that holds to the handoff.

## 8. How expressions blend

Six layers, always in this order:

| layer | owns | mask |
|---|---|---|
| stamp | the screen text | long stamp hides eyes and mouth |
| talk | the mouth envelope | replaces the expression mouth while typing |
| blink | the lid only | `max(lid, blink)`, never on error or found |
| expression | eye kind, lid, pupil, posture | base layer, weight 0 .. 1 |
| gaze | head, lean, antenna, pupil | additive after the blend |
| impulse | nod, shake, spark, squash | additive, never blended |

### 8.1 Numbers

`live[channel] = damp(live[channel], target[channel], lambda, dt)`. The weights:

- `w` ramps 0 to 1 over `in`, outCubic. If a new expression arrives before the
  out completes, the previous target is frozen as the blend source, so nothing
  snaps.
- Eye kinds crossfade for 90ms with `globalAlpha`, two kinds at most. Lids and
  pupils are channel-damped, not faded.
- Mouth kinds never crossfade. A half wavy, half smile mouth reads as a broken
  mask. The shape snaps at the next frame where `mouth < .30`, which is usually
  the space before the new sentence.
- Posture is a spring, not a damp: head 110/16, lean 70/12, arms 130/14, antenna
  150/9. The eye changes on frame 0, the head on frame 2, the antenna on frame
  4. That 33 to 66ms stagger is the whole difference between a rig and a
  slideshow.

### 8.2 Onset order

At `t0`, in milliseconds:

| ms | what |
|---|---|
| 0 | stamp, eye kind, plate size |
| 16 | pupil, lids, mouth kind |
| 33 | head spring target |
| 50 | lean |
| 60 | arms and elbows |
| 66 | antenna target and kick |
| 0 | chest, which is already continuous |

### 8.3 Combos

Blending two named expressions is allowed only for these, and the weights
always sum to 1.

| combo | weights | where |
|---|---|---|
| listening + happy | .7 / .3 | a pick he likes, second row hover |
| proud + listening | .6 / .4 | frame out, eyes still on you |
| concerned + thinking | .6 / .4 | the gate stall at 26.40 |
| confused + laugh | .6 / .4 | a backwards stroke, 520ms only |
| sleepy + listening | .8 / .2 | waiting, pointer still but inside |
| proud + presenting | 1 / 0 | the `hello` stamp, body proud |

### 8.4 Interrupts

- Error and confused may interrupt any preset except found.
- Found may not be interrupted for 1400ms.
- Sleepy is interrupted by any input in 120ms, no out.
- A new authored line changes the expression on its first character only, never
  mid-line. `dialogue.md` already requires this; it is also what keeps the mouth
  synced.

### 8.5 Reduced motion

Durations times 0.4, no shake, no sparks, no spin, no dust, no bob above .15.
Lids snap instead of damping. The mouth still runs at full speed, because
speech is information. Error holds the X for 120ms then returns to neutral.
Found skips the spin and keeps the 120ms cream flash.

## 9. Triggers on the clock

Seconds from first paint, from `script.md`.

| t | event | expression | why |
|---|---|---|---|
| 0.00 | void, bulb only | sleepy | face is off, the pixel is his antenna |
| 3.00 | head flies in | boot | one eye at .34, two at .44 |
| 3.35 | upside down | boot + confused .6 | the only physical joke in the wake |
| 4.20 | ears, neck, body | boot + `one sec.` | eyes off under the long stamp |
| 5.60 | arms, treads | laugh 520 | the dog shake |
| 6.90 | settled | neutral | 1.2s of nothing, on purpose |
| 8.40 | eye contact | listening | he finds you before he talks |
| 8.60 | `hi.` | presenting | short stamp, eyes stay |
| 10.00 | greeting types | curious + talk | lean 2, antenna perk |
| 11.10 | rows arm | listening | eyes on the lit row, not the cursor |
| 11.80 | hover | curious to listening | 6 degree lean toward the light |
| 15.20 | auto pulse | proud | he straightens, turns to the frame |
| 16.00 | hatch | proud | both hands to the chest |
| 18.40 | `prove it` | proud | stamp, no speech |
| 20.40 | `i'll know` | scanning | lean in over the guides |
| 22.00 | pad armed | scanning | eyes track before the hand lands |
| 22.60 | first contact | excited | spark, wide eyes |
| 25.00 | 30% | thinking | `...`, lean 4px closer |
| 26.40 | 60% | concerned | `almost`, one hand up |
| 27.60 | stall, backwards | confused | `?`, two 2 degree shakes |
| 28.60 | both guides | found | `FOUND`, spin, confetti |
| 29.60 | hold | found, drift | the stamp holds, the body lets go |

## 10. Cursor reactions

The pointer never turns him into a toy. Eight rows, cooldowns from
`dialogue.md`, all one expression.

| trigger | expression | extra | cooldown |
|---|---|---|---|
| pointer moves | listening | pupil to pointer, head clamped 15 | none |
| hover on him | curious | `?` 700, head cock 12 | 3.5s, once |
| hover a row | proud | eyes to the row, lean 6 | 2.5s a row |
| click on him | excited | nod, dust, double blink | 8.0s, three |
| still 6s | curious | tilt 5, long blink | 20s |
| over 1400px/s for 300ms | confused | head lags 90ms | 12s |
| leave the window | scanning | gaze edge, antenna droop | once |
| return inside 20s | proud | blink once, gaze cursor | once |

Fast move is a lag, not a shake: hold the head target 90ms behind `gx`. That is
the only reaction that changes a spring, not an expression.

## 11. Wiring

`rusty.js`, in this order:

1. Add the painters from section 3. Keep `block()` and the part list untouched.
2. Rename `STATES` to `FACE` and reshape every entry into the channel form in
   section 5. Keep the existing body values; the old ten states map one to one.
3. Add the seven new presets: `neutral`, `listening`, `happy`, `laugh`,
   `concerned`, `sleepy`, `error`. Keep `boot`, `curious`, `thinking`, `proud`,
   `excited`, `confused`, `scanning`, `presenting`, `celebrating`, and alias
   `idle` to `neutral`.
4. Add the alias map, because `intro.js` calls states the rig does not know and
   `setState` silently falls back to idle today:
   `greet -> listening`, `menu -> curious`, `assemble -> boot`,
   `gate -> scanning`, `handoff -> proud`, `idle -> neutral`.
5. Add three methods: `say(text, cps)` schedules section 7, `face(label, ms)`
   sets a stamp, `nod()` kicks the head spring.
6. In `paintEye`, read `blinkT`, the eye kind, the pupil and the lids in that
   order. In `paintMouth`, return if a stamp is up, otherwise read `talking`
   first and the preset second.
7. In `update`, keep the existing gaze, bob, spring and blink code. Only the
   target lookup changes, from `cur.head` to the blended `live.head`.

`menu.js`: call `rig.say()` with the same 26ms clock it types with, `rig.face()`
on a stamp, `rig.nod()` on selection.

`intro.js`: the existing `setState` calls now land on real expressions through
the alias map. The gate hooks at 30% and 60% already call `rigFace`; that name
becomes `rig.face`.

## 12. Checks

- Thirteen expressions plus boot, found and presenting. Each has a trigger, in,
  hold, out, ease, eye, lid, pupil, mouth, screen, body and calls.
- Every rect lands inside its part frame except the lid glow, the halo and the
  laugh sparkle, which are meant to spill by 0.15 to 0.35 units.
- No new colors. No shadows in the face painters. No per-frame allocation.
- Mouth and eyes are skipped under a long stamp. Nothing speaks under one.
- `node --check lab/intro/rusty.js` after the edit. No browser needed.
- `wc -c` on every file in `lab/intro/`, none over 60KB. This file is the
  biggest plan doc and stays under 40KB.
- No em dashes in on-screen copy. Lowercase everywhere except `FOUND`.
