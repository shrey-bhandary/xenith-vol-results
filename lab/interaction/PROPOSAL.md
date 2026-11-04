# The X remembers your hand

The gate is the only thing on this page the visitor makes. Right now it is
thrown away at the exact moment it is accepted. The strongest new beat is to
keep it: at unlock, the ideal ASCII X is rebuilt from the visitor's actual
strokes. The bow and the off-centre crossing survive into the monument. No new
words, no new controls, one small module.

## Five ideas

### 1. Your hand becomes the monument

**Do.** Draw the X exactly as now. One stroke, two strokes, mouse or thumb.

**See.** At unlock the X does not vanish and reappear. The same shape stays
where the ink was, its flat line resolves into the glowing glyph line, and then
it becomes the object that rotates and slides right. What rotates is their
stroke, fitted to the two guides, not a stock X.

**Why it lands.** The page asks for proof of presence and then deletes it. Keeping
it turns a gate into a keepsake: the monument could not exist in that exact form
for anyone else. It is effort converted into an artifact, which is the cheapest
and most honest way to make a selection feel personal. It also makes every
screenshot unique, which matters for a fest where people share.

**Cost.** Small. One new file, about 90 lines of integration, no assets.

**Risk.** Subtlety. A neatly drawn X looks almost ideal, so the recognition comes
from the timing of the handoff more than from the deformation. A sloppy trace
must never produce a broken object. Mitigated by clamping, corner taper and a
clean fallback. If the team wants it louder, the only safe extension is
preserving the visitor's real overshoot at the corners, and that should be
tested on device before it ships.

### 2. The drop

**Do.** Nothing. Finish the X.

**See.** At 100 percent coverage the page holds its breath for about 650ms. The
campus dims, the X contracts two percent, one cream flare goes off, and then the
name does not fade in. It lands as a block with a two pixel thud and the headline
settles.

**Why it lands.** Anticipation is most of a reveal. A pause with a clear physical
cue makes the name feel like a drop instead of a fade, and the page already has a
420ms delay that half does this.

**Cost.** Small.

**Risk.** Dead air reads as lag. On a slow phone the hold can look like a stall,
and if the cue is too quiet the visitor taps again. Also, the existing 420ms
delay already occupies this territory, so this is a polish of a beat that exists
rather than a new one.

### 3. The room answers

**Do.** Draw the X. Audio starts on the first pointerdown, so there is no toggle
to add.

**See and hear.** Each covered sample adds a soft tick whose pitch rises with
coverage. At unlock the ticks resolve into a low fifth and a short tail that
fades under the rotation.

**Why it lands.** Sound is the fastest route to a physical response. A page that
has been silent becomes a room that has been waiting, and the unlock gets a
physiological hit that no visual can match.

**Cost.** Medium. About 80 lines of WebAudio, no files.

**Risk.** The link will be opened in lectures, libraries and at dinner tables.
Surprise audio is the fastest way to make someone close a private link. iOS
ignores audio under the silent switch, autoplay policy varies, and it directly
contradicts "sound off by default" in the storyboard. The tick per sample can
also sound like a Geiger counter.

### 4. Rusty sees you

**Do.** Move the pointer after the name lands. Nothing to click.

**See.** Rusty's eyes already follow the pointer on one axis. Extend them to two,
so he leans past his own edge to follow you across the screen, double blinks when
you cross his face, and looks up at the name if you rest on him.

**Why it lands.** Being noticed by the mascot is warm and funny, and it rewards
the small number of people who move the mouse around after the reveal.

**Cost.** Small.

**Risk.** Desktop only. It competes with the name for attention, which the design
doc forbids, and pointer tracking eyes are a known trick. Charming, but it does
not increase the feeling of being selected.

### 5. The return

**Do.** Reopen the private link.

**See.** The gate starts with your old X already half drawn in mint. Rusty is
already sitting in the corner, waiting, before the reveal. No new copy.

**Why it lands.** A second visit feels like someone kept your seat. It turns a
link into a place.

**Cost.** Small.

**Risk.** Most people open a congrats link once, screenshot it and leave, so the
reach is low. Private and incognito windows lose storage, and "why does this page
remember me" is a bad question to raise on a private selection link. A half-drawn
X can also read as a broken gate.

## The pick

**Keep the gesture.** It is the only idea that uses the ritual already on the
page, adds no second sense, no second gesture and no repeat visit, and turns the
gate into the thing people screenshot. Sound and Rusty ask for attention. The
drop is a timing polish of a pause that already exists. The return depends on a
visit that will likely not happen.

### The beat, second by second

| t | What happens |
|---|---|
| -320ms | Both guides hit 80 percent. Mint is complete. The page holds. |
| 0 | Unlock. The strokes are fitted, the monument is swapped behind the gate, the flash fires. |
| 0 to 240ms | The X stays exactly where the ink was. The gate fades to about half, the ink goes, the glyph line is already underneath. Depth blooms. |
| 240ms | The X starts its slide right. The name fades up on the left. The gate finishes clearing at 420ms. |
| 900ms | Name readable, X settled, Rusty dropping in on his existing delay. |

The 240ms hold is the whole trick. Without it the X starts sliding while the gate
is still fading, and the handoff reads as a cut. With it, the eye sees the same
mark stay put and change material before it becomes the object.

## How it works

### Capture

The gate already stores every pointer sample in `strokes` as screen points. At
unlock, normalize them into gate units, where the ideal diagonals run from -1 to
1:

```
unitX = (screenX - padW / 2) / (S / 2)
unitY = (screenY - padH / 2) / (S / 2)
```

Pass the gate's own tolerance into the fit, converted to units:

```
tol = max(18, S * 0.085) / (S / 2)
```

The 18px floor is a larger fraction of the X on a 320px screen, so a fixed
tolerance would reject strokes the gate accepted. This is the only place mobile
needs different handling, and it is one line.

### Fit

For every raw point:

1. Project onto each guide. Keep the nearer guide if its perpendicular distance
   is within tolerance.
2. Record the guide parameter `t` and the signed perpendicular offset `d`.
3. Splat `d` into the two nearest of 24 bins along that arm, weighted.

Then, per guide: average each bin, fill empty bins by linear interpolation,
smooth with a five-tap kernel, clamp to plus or minus 0.24 gate units, multiply
by a 0.8 blend, and taper to zero over the first and last 10 percent so the four
corners stay anchored and the X stays closed. Sample 64 points.

The blend matters. At 1.0 the monument can become a scribble and the X stops
reading as a monument. At 0.8 the X is still a monument, but it moves like a hand. The
gate tolerance already bounds how unlike an X the fit can be, so there is no
classification step and nothing to train.

### Handoff

The gate draws with `S = min(W, H) * 0.38`, so the guide corner is `S / 2` from
center. The monument's nearest layer at `z = -0.08` projects at:

```
screen = model * S0 * 0.5 * 2.4 / (1.9 - 0.08 * 0.55)
```

At the current constants (`S0 = 0.265 * min`) the traced model scale that lands
exactly on the ink is about **1.109**, not the canonical 1.15. Using 1.15 leaves
the traced X about four percent larger than the ink and produces a visible pop.
Compute it, do not hardcode it:

```
scale = (S / 2) / (S0 * 0.5 * 2.4 / (1.9 - 0.08 * 0.55))
```

At `enteredMix = 0` the monument center is exactly `W/2, H/2`, which is the gate
center. That alignment is why this works at all, and it is worth a comment in the
code so a later scale change does not silently break it.

### Depth

The back layers should bloom, not pop. Keep the z values fixed; animate only
their alpha:

```
alpha = front ? 0.8 : 0.45 * lift
```

`lift` is 1 during the gate. On a traced unlock set it to 0 and ease to 1 over
about 600ms. At lift 0 only the aligned front layer is drawn, so the line sits
on the ink. Then the violet depth appears behind it. Under reduced motion, set
`lift` to 1 at unlock and let only the shape change.

Do not collapse the z values to fake this. At `z = 0` every layer projects to the
same place, `front` can become false for all of them, and at lift 0 the X
disappears. Alpha is
the safe lever.

### The flash

One fixed overlay above the gate, a radial cream wash, 550ms. It masks the swap,
punctuates the unlock and gives the eye something to follow while the gate fades.
No text, no icon, no sound.

```css
#flash{position:fixed;inset:0;z-index:11;pointer-events:none;opacity:0;
  background:radial-gradient(circle at 50% 48%,
    rgba(255,233,176,.5), rgba(255,177,92,.12) 24%, transparent 58%);}
#flash.on{animation:xf .55s ease-out both}
@keyframes xf{0%{opacity:0}10%{opacity:.85}32%{opacity:.45}100%{opacity:0}}
```

The global reduced motion rule already kills the animation, which is the correct
behaviour for flashing. The shape still changes; the flash does not. The page now
also computes a `reduceMotion` boolean, so `if (!reduceMotion) flash()` is the
explicit guard if you want one.

### Fallbacks

The trace is additive. Every path that does not produce a valid fit gets the
current ideal X and the current timing:

- no strokes, `skip`, Escape
- `?entered`, `?gate=auto`
- fewer than 10 of 24 bins populated on either arm
- fewer than 8 usable points

`build()` returns `{ok:false}` and `unlock()` keeps the ideal `xpts`. Do not reset
`lift` in that case, or skipping will dip the depth for no reason.

### Failure modes

**A valid but ugly trace.** The gate allows 18 to 29px of wobble depending on
screen, and the fit clamps at 0.24 units and tapers the corners. The worst case
is a bowed X, never a broken one. If a specific device produces something odd,
`DEFAULTS.blend = 0.5` is the single kill switch.

**The pop.** If the swap is visible on a real screen, the flash is peaking too
late or the gate is fading too early. Fade the gate over about 420ms with no
delay; the 550ms flash covers the first half of it. If the slide looks hidden,
the fade is too slow, not too fast. Do not extend the flash past 600ms or it
becomes a blink.

**Alignment drift.** If anyone changes `S`, `S0`, or the 2.4 projection
multiplier, recompute the handoff scale. The formula is in the code and in this
document. Nothing else depends on it after the first 300ms.

**Performance.** The ideal X is 540 glyphs. The traced X is 384, and the fit is
one pass over at most a few hundred points at unlock. This is cheaper than the
current frame, not more expensive.

## Integration

1. `index.html`: add `<script src="trace.js"></script>` before `xenith.js`, and
   `<div id="flash" aria-hidden="true"></div>` before `#gate`.
2. `style.css`: add the flash block. Change the gate transition to
   `opacity .42s ease, visibility .42s ease`. Add 100ms to the content delay so
   the name starts after the X begins to move.
3. `xenith.js`:
   - add `let lift = 1, liftTarget = 1;`
   - in `drawX`, gate the back alpha on `lift`
   - in `unlock`, fit, swap, set `lift = 0`, add the classes, flash, and delay
     `zoomTarget` / `enteredTarget` by 240ms
   - in `paint`, reduce the post-coverage delay from 420ms to 320ms. The
     240ms handoff hold is separate from this.
4. No data changes, no new copy, no new assets. The existing live-region
   announcement and name focus in `unlock()` stay. Put the trace swap before
   them: the `entered` class is still added immediately, so focus lands on a
   visible name.

The prototype is a trimmed copy of the page minus Rusty and the campus photo, so
the choreography can be compared side by side. `data-source="hand"` or
`"ideal"` is set on `<body>` for QA; it is not visible.

## Do not add

- A label saying the X is yours. The whole point is that it needs no label.
- A 1:1 unfitted trace. It will produce broken objects on real thumbs.
- localStorage or a second visit state. Not for this beat.
- Per-letter animation on the name. The name is one object; the X is the event.
- Sound. The venue alone makes it a liability for this audience.

## Verification

```
node lab/interaction/trace-test.js
node lab/interaction/smoke-test.js
```

`trace-test.js` checks the maths against ideal, wobbly, one stroke, empty and
scribble inputs, plus the handoff alignment. `smoke-test.js` executes the
prototype against a stubbed canvas, simulates both strokes, unlocks and runs
frames. Both pass with no browser.

Manual, when a device is available: draw straight, draw with a bow, draw one
zigzag, click skip, open `?demo=wobble`, check at 320px, check reduced motion.

## Files

```
lab/interaction/
  trace.js         the fit, no DOM, dual export
  trace-test.js    21 assertions plus an ASCII preview
  prototype.html   standalone version of the beat
  prototype.css    copy of the page styling plus the flash
  prototype.js     capture, handoff, lift, hold, demo params
  smoke-test.js    headless execution of the prototype
  PROPOSAL.md      this document
```
