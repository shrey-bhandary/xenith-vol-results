# Xenith motion system v2

Motion audit and replacement spec for `site/style.css` and `site/xenith.js`.
No libraries. CSS transitions for the type, one canvas clock for the X, the
campus and Rusty. Read section 3 before you touch a duration.

Everything here is measured against the two files as they stand today.

---

## 0. What the reveal should feel like

The gate is a machine deciding whether to believe you. When the last arm
closes it should hold for a fifth of a second, not a sigh. Then the X goes
cream: 260ms out and back, a light being tested, not a glow up. The room drops
its exposure. The X does not fly right, it is already the object; it turns to a
three quarter view and drifts into the right half because the name needs the
left. The name prints in five bands, top edge first. Rusty falls, lands, and
squashes once.

Nothing enters from offscreen. Nothing slides in from a direction it was not
already near. The one exception is Rusty, who is allowed to fall, because he is
the only character in the scene. By 1.6s the page is completely still and the
only thing that can move is your cursor.

That last sentence is the whole system. The stillness is the payoff. A page
that keeps moving after the name lands is a page that does not believe its own
news is important.

---

## 1. Audit

### 1.1 What is actually running now

| Thing | Where | What it does | Stops? |
|---|---|---|---|
| X monument | `xenith.js:59-96` | sway + drift right, lerped at 0.03/frame | never |
| Campus slab | `xenith.js:179-183` | sine yaw/pitch + sine scale + pointer lerp 0.04 | never |
| Slab brightness | `style.css:33` | `.7` to `.95`, 1.4s | yes, 1.4s |
| Name block | `style.css:76` | one fade + 10px rise, 1.4s, 0.2s delay | yes |
| Rusty | `style.css:104` | fade + 14px rise, 1.2s, 0.9s delay | yes |
| Rusty sprite | `xenith.js:334-371` | bob forever, blink every 3400ms | never |
| Gate | `style.css:111` | 0.9s fade | yes |
| Prompt | `style.css:126-128` | 0.6s to 12% opacity, once | yes |
| Scrim | `style.css:43,49` | transition declared, then overridden to `opacity:1` | it never runs |
| Guides | `xenith.js:248-292` | mint alpha snaps per pointermove | no smoothing |

### 1.2 Six things that are wrong

**1. The timing is tied to refresh rate. This is the big one.**
Every smooth value in the file is `x += (target - x) * k` with a fixed `k`.
That is a per-frame fraction, so a 144Hz display runs the same animation 2.4
times faster than a 60Hz one. Measured, current values:

| Settle (k = 0.03) to 95% | 60Hz | 90Hz | 120Hz | 144Hz |
|---|---|---|---|---|
| time | 1.65s | 1.10s | 0.82s | 0.69s |

| Pointer follow (k = 0.04) to 95% | 60Hz | 90Hz | 120Hz | 144Hz |
|---|---|---|---|---|
| time | 1.23s | 0.82s | 0.62s | 0.51s |

So the X takes 1.23s to catch up to the cursor on a normal laptop, which reads
as lag, and 0.51s on a ProMotion MacBook, which reads as responsive. Same code,
two different products. The reveal you approve on one machine is not the reveal
half the committee sees.

**2. The hero object is frozen on the gate, then never stops.**
`xenith.js:60` multiplies the sway by `enteredMix`, which is 0 until unlock. So
the glowing X does not float, does not breathe, does not do anything at all
while it is the only thing on screen and the visitor is deciding whether to
draw. Then the moment they do, `enteredMix` rises and the sine starts running
forever. The pose it settles into is whatever moment of the sine it happened to
land on. The object is inert exactly when it should be alive, and alive exactly
when it should be still. Both faults come from one multiplier.

**3. Everything starts in the same frame.**
`body.entered` flips one class. That one class change fires six CSS transitions
and two canvas lerps simultaneously. There is no sequence, so there is no
story: the name, the rust, the scrim, the gate and the object all arrive
together and the eye has nothing to follow.

**4. Two exposure systems on two different clocks.**
The campus is dimmed two ways: `#scene{filter}` (today `.7` to `.95`) and
`#gate::before`, a `rgba(6,5,15,.78)` radial dim over the same campus. The
gate's dim leaves with the gate. The filter arrives on its own clock. Today
that is 900ms and 1400ms; under this spec it is 320ms and 1000ms. Either way
the centre of the screen pops bright before it dims again, because nobody put
the two on one clock.

**5. The unlock has no recognition beat, and then 420ms of nothing.**
The storyboard asks for the drawn X to flash cream. There is no flash anywhere
in the code. Instead `setTimeout(unlock, 420)` holds a dead frame at the exact
moment the visitor is most alert, then everything changes at once. That hold is
the one place the page should be tightest.

**6. Full DOM and canvas work for zero visual change.**
Before unlock the monument's rotation is multiplied to zero, so `drawX` redraws
540 points, sorts them and fills 540 shadowed glyphs every frame to produce an
identical picture. `#scene` writes a transform string to `style` every frame
for a 0.8% scale breathing you cannot see. Meanwhile the gate repaints on every
`pointermove` and re-scores all 22 guide samples against every segment of every
stroke. That is the budget problem, and it is a motion problem: the page spends
its frame budget on things that are not moving.

Also worth fixing while you are in there: `.prompt.fade` goes to 12% opacity on
first touch and never comes back, so anyone who misses the guides loses the
instruction entirely, and `tx`/`ty` never reset, so on a phone the X and Rusty's
eyes freeze wherever the signature ended.

---

## 2. The system

### 2.1 Three tiers

| Tier | Range | Used for | Rule |
|---|---|---|---|
| T0 instant | 90 to 140ms | things the visitor caused: prompt, hover, eyes | must feel like a keypress |
| T1 action | 220 to 520ms | content arriving: name, dept, line | must be readable within half a second |
| T2 atmosphere | 1000 to 1600ms | the room changing: X settle, exposure | never on something being waited for |

Nothing is allowed to sit between 620ms and 900ms. That range is where a
transition stops reading as instant and starts reading as slow, and it is why
the current 1.4s name fade feels like a website rather than a machine.

### 2.2 Curves

Three, and only three. Each has a job, so you never have to guess.

| Token | Value | Reads as | Use |
|---|---|---|---|
| `--e-out` | `cubic-bezier(.22,1,.36,1)` | arrive fast, then hold | anything settling into place |
| `--e-in` | `cubic-bezier(.55,.06,.68,.19)` | leaves late, then gone | exits only |
| `--e-gate` | `cubic-bezier(.4,0,.2,1)` | symmetric | opacity crossfades |

Plus two step functions where smooth is wrong:

- `steps(5,end)` for the name. 520ms in 5 bands is 104ms per band, about 10fps.
  A pixel typeface that fades smoothly contradicts itself. One that prints in
  bands is doing what its letterforms promise.
- `steps(1,end)` inside Rusty's keyframes. A sprite snaps between poses. Easing
  his squash is the same mistake as anti-aliasing him.

The existing `cubic-bezier(.2,.8,.2,1)` is not wrong, it is just soft. Keep it
if you want, but `--e-out` at the same duration finishes the visible movement
earlier, which is most of what "tighter" means here.

### 2.3 One clock

Anything longer than 140ms is driven by elapsed time, never by a per-frame
fraction.

```js
smooth(cur, target, tau, dt) = target + (cur - target) * Math.exp(-dt / tau)
```

`tau` is the time to cover 63%. This gives the same result at 30Hz and 144Hz
exactly, which is the fix for finding 1. Pick tau by feel and it stays put:

| Layer | tau | 95% reached in |
|---|---|---|
| Rusty's eyes | 0.06 | 0.18s |
| campus tilt | 0.09 | 0.27s |
| X parallax | 0.12 | 0.36s |

For the timeline itself, do not chain `setTimeout`s. Read progress from one
number:

```js
const ms = performance.now() - unlockAt;
const p  = M.progressAt("name", ms);   // clamped 0..1, 0 before it starts
```

That makes the whole unlock scrubbable, so `?entered` plus a `t=` param can stop
the page at any frame for a screenshot, and so the canvas and the CSS agree by
construction rather than by hope.

### 2.4 Overlap

Each text block starts about 75% of the way through the previous one. Enough
that it reads as one gesture, not enough that two things compete.

At most one *subject* starts at a time. The camera is one subject: the X settle,
the slab settle and the exposure change all start within 20ms of each other,
because splitting them would read as three unrelated events. Everything else
waits its turn.

After the name lands at 780ms, nothing new starts until Rusty at 1200ms. The
room is still finishing its exposure and the X is in the last 20% of its
travel, but nothing arrives. Today, six things arrive together.

---

## 3. The unlock, second by second

One column is 100ms, starts rounded. `TOTAL` is 1660ms.

`t` is measured from **unlock**, which fires 140ms after the second guide
closes. That 140ms is not dead time: the guides snap to solid cream at the
moment of coverage, so the visitor sees their own X complete before the page
answers. Then the gate lets go.

```
        0    500   1000  1500
        |    |     |     |
flash   ███
gate    ███
room     ██████████
settle   ███████████████
scrim      ███████
name       ██████
role           ███
line              ████
rusty                    █████
```

**0 to 260ms: recognition.** The drawn X is already cream from the moment it
completed. At unlock the monument beneath it answers in the same colour and
pulses once: `shadowBlur 11 -> 31 -> 11`, glyph tint mixed toward `#fffaf0` by
`pulse(t)`. The gate fades underneath on a 320ms `--e-in`. Nothing else moves.
One colour, two surfaces, one beat. This is what the page has been building to;
give it room but not a pause.

**100ms: the room.** `#scene` filter drops to `.38`, the `#focus` dim goes to 0,
both over 1000ms. The campus gets *darker*, not brighter. Today it brightens,
which fights the name that is about to arrive.

**120ms: the object.** The X eases from wherever the gate breath left it to the
hero pose over 1480ms `outQuint`. From 120ms to about 500ms it covers 80% of the
distance, then spends a second arriving. It never overshoots. An overshoot on a
monument reads as a bouncy castle.

**240ms: the scrim.** 700ms. It belongs to the name, so it arrives just before
it, not with the gate.

**260ms: the name.** 520ms clip wipe, `steps(5,end)`. The top edge prints first.
Because it wipes, it does not need a fade, and because it does not fade, it can
start while the X is still moving. That overlap is the causality: the X is
moving aside *for* it.

**640ms: the dept.** 220ms, linear, opacity only. No rise. The label appears.

**840ms: the line.** 380ms, `--e-gate`, opacity only. The line should already be
there when you look at it. Giving it a translate makes it an entrance, and an
entrance makes it a fourth thing competing.

**1200ms: Rusty.** 460ms. He fades in over the first 32ms while still up at the
top of his fall, falls eased to the ground by 267ms, snaps 3px past, snaps back,
snaps 1px, settles. Three bounces in 200ms. Then his canvas bob fades in over
300ms, so the drop is the first thing he does.

**1660ms: done.** Nothing moves except the pointer, Rusty's bob, and a blink
every few seconds.

---

## 4. Element table

| Element | Trigger | Duration | Easing | Property |
|---|---|---|---|---|
| X, gate idle | page load | 26s period | sine | canvas yaw +/-4 deg, pitch +/-1.4 deg |
| X, freeze | first pad `pointerdown` | 90ms | `--e-out` | canvas yaw/pitch to 0 |
| X, flash | second guide at 80% | 260ms | `pulse()` | glyph tint to cream, shadowBlur 11 to 31 |
| X, settle | unlock +120ms | 1480ms | `outQuint` | yaw, pitch, cx, scale, alpha |
| X, parallax | `pointermove` | tau 120ms | exponential | yaw +/-1.2 deg, pitch +/-0.8 deg |
| Campus, settle | unlock +120ms | 1200ms | `--e-out` | scale 1.2 to 1.0, rotateY -7 to -3 |
| Campus, exposure | unlock +100ms | 1000ms | `--e-gate` | `filter: brightness(.55) -> (.38)` |
| Focus dim | unlock +100ms | 1000ms | `--e-gate` | opacity 1 to 0 |
| Scrim | unlock +240ms | 700ms | `--e-gate` | opacity 0 to 1 |
| Gate overlay | unlock | 320ms | `--e-in` | opacity, then `visibility` |
| Prompt | first stroke | 140ms | `--e-out` | opacity to .4 |
| Guide mint | `pointermove` | one step per 10% | none, quantised | canvas alpha 0 to .4, 8 bands |
| Guide complete | arm reaches 80% | 0ms, snap | none | dashed to solid, alpha .4 to .55 |
| Skip | hover / focus | 120ms | `--e-out` | color |
| Name | unlock +260ms | 520ms | `steps(5,end)` | `clip-path` bottom inset 100% to 0 |
| Dept | unlock +640ms | 220ms | linear | opacity |
| Line | unlock +840ms | 380ms | `--e-gate` | opacity |
| Rusty, drop | unlock +1200ms | 460ms | linear + `steps(1,end)` | translateY, opacity |
| Rusty, bob | after land | 2.4s period | sine | canvas y, +/-1 sprite unit |
| Rusty, blink | random 2.6 to 5.2s | 110ms | `steps(1,end)` | canvas eye height |
| Rusty, eyes | `pointermove` | tau 60ms | exponential | canvas x +/-1.2u, y +/-0.7u |

Four animated properties: `opacity`, `transform`, `clip-path`, `filter`. No
`width`, no `top`, no `box-shadow`, nothing that triggers layout. `clip-path`
is the one slightly expensive member of the set, and it runs for 520ms on one
element. The skip's colour is the only other thing that transitions.

Some durations in the table are zero on purpose. A snap is a legitimate
duration, and a system that refuses to snap ends up easing things that should
just happen.

---

## 5. Pointer contract

Three things react. Everything else holds still.

| Layer | Range | tau | Why |
|---|---|---|---|
| X monument | +/-1.2 deg, +/-0.8 deg | 0.12 | it is an object, it can be looked at |
| Campus slab | +/-2.2 deg, +/-1.4 deg | 0.09 | it is a surface, it can be leaned over |
| Rusty's eyes | +/-1.2 sprite units | 0.06 | he is the character, he should notice first |

Rules:

1. **The name, dept and line never react to the pointer.** Not a tilt, not a
   parallax, not a shadow offset. Text that moves is text you have to chase.
2. **Never more than 3 degrees on the slab.** The ASCII is drawn on a grid; past
   3 degrees the cell edges smear and the campus looks out of focus rather than
   tilted. Today it is 3.4, which is already past the limit.
3. **Everything returns home.** `pointerleave` and `blur` set the target to 0,
   and it drifts back over 320ms. Today the values persist forever: on a phone,
   the X and Rusty's eyes are frozen wherever the signature ended.
4. **Touch decays.** A finger never leaves, so a touch pointer schedules its own
   return to 0 after 600ms.
5. **The gate freezes the object.** First `pointerdown` on the pad eases the X
   to 0 over 90ms. You are drawing on it; it should be a surface, not a moving
   target. This is the moment the page stops performing and starts receiving.
6. **No pointer reaction before unlock.** The gate is an instruction, not a toy.
   The only thing that responds to the pointer on the gate is ink.

---

## 6. What stops

| Thing | When | Why |
|---|---|---|
| X rotation | 1600ms after unlock, and forever after | the object has arrived, the pose is the message |
| Campus sway | immediately | the backdrop is a backdrop |
| Campus scale breathing | delete it | 0.8% over 100s is not a breathing, it is a bug you can measure |
| Name, dept, line | after entrance | they are content, not performers |
| Prompt | at .4 opacity | it must stay legible if someone misses |
| Scrim | at 1 | it is a layer, not an animation |

Three loops are allowed to run forever, and they are all small: the X breath
(gate only), Rusty's bob, Rusty's blink. `design.md` allows exactly these. Keep
the count at three. If you want a fourth, delete one first.

---

## 7. Five motions to delete

**1. The 1.4s lump fade and the 10px rise on `#content`.**
`style.css:76-77`. A 10px upward translate is the most generic tell in web
motion, and it delays the name by 1.4s for no information. Delete both, let the
children carry their own reveals.

**2. The campus slab's permanent yaw and pitch sine.**
`xenith.js:179-180`. The backdrop drifts forever on a 63 second and 78 second
period, like a camera on a boat. After unlock the campus should be fixed, with
only the pointer left as a reason to move at all.

**3. The campus slab's scale breathing.**
`xenith.js:181`, `Math.sin(time * 0.06) * 0.008`. A 0.8% scale change over a
105 second cycle is invisible to every human, and it forces a full `style`
write and repaint every single frame. Delete it and the slab only has to be
touched when the pointer actually moves.

**4. The 420ms silent hold before unlock.**
`xenith.js:290`. After the last stroke there are 420 milliseconds where the
page looks broken: nothing acknowledges the gesture. Replace with a 140ms hold
and an immediate cream pulse, so the page answers while the visitor is still
looking at their own X.

**5. Rusty's 1.2s upward float from 14px below.**
`style.css:104`. The storyboard says he drops in, bottom right. Rising from
below is what a web page does to a div, not what gravity does to a robot, and
"bottom right" plus "rises from below" means he slides up out of the floor.
Delete the float, give him the four pose drop.

**Also cut, no ceremony:** `.prompt.fade{opacity:.12}` (`style.css:128`), the
dead `#scrim{opacity:1}` override (`style.css:49`), the duplicate
`body.entered #monument` block (`style.css:45-48`), the duplicate `.prompt`
media query (`style.css:160`), and `#gate.done`, a class nothing ever adds.

---

## 8. Mobile and reduced motion

**Mobile (below 720, matching the CSS breakpoint).** The X cannot move right
because there is no right. Give it a different composition instead of a squeeze:
it rises to `cy = .26H`, shrinks to `.16 * min(W,H)`, and dims to 70%. It becomes
a watermark above the name. The name wipe, the dept, the line and Rusty's drop
all stay. Rusty falls 22px instead of 30, because 30 is most of a phone screen.

**Reduced motion.** Not just durations. The current block truncates transitions
but leaves their delays, so Rusty's 1ms animation still waits 1180ms before
popping. Zero the delays too. In JS, `M.reduce()` should skip the breath, snap
the settle, and skip the bob. The X still appears in the hero pose and the name
still appears; only the travel is gone.

---

## 9. Implementation

Files in `lab/motion/`: `motion.css` to merge into `site/style.css`, `motion.js`
as the canvas core, `verify.js` to prove the maths, and this document. None of
them edits `site/`.

### 9.1 CSS

Append `motion.css` after the existing rules; every `transition` in it is a
shorthand and fully replaces the old one, so nothing needs deleting for the
merge to work. The header comment lists the old line numbers to remove once you
are happy.

Two smaller cascade notes. `#rusty` needs an explicit `transition:none` because
the old 1.2s float lives on that selector and would come back to life anywhere
the new animation is switched off, reduced motion being the obvious case. And
`#scene`'s `transform-origin` moves from 62% to 70%, so the pull-back centres
on where the X actually lands instead of an arbitrary point two thirds along.

One line of HTML is worth adding, after `#monument` in `index.html`:

```html
<div id="focus"></div>
```

It holds the gate's radial dim on its own 1000ms clock (fixes finding 4). If you
will not touch the HTML, instead soften `#gate::before` to
`rgba(6,5,15,.45)` and lengthen the gate fade to 500ms, which makes the pop
gradual rather than sharp.

The name reveal needs `clip-path`, and the chromatic `text-shadow` sits outside
the text box, so the clip uses negative insets (`-14px`). Without them the
shadow gets cut and the name loses its violet edge as it prints.

### 9.2 JS

Replace the three `requestAnimationFrame` loops (`frame`, `rustyLoop`, and the
pad's per-move `paint`) with one `M.loop`. Then:

- `tx`/`ty` become `M.pointer().attach()` and `p.step(dt, 0.12)`.
- `enteredMix` becomes `M.progressAt("settle", ms)` fed through `outQuint`.
- `zoom` becomes `lerp(1.2, 1.0, outQuint(progressAt("slab", ms)))`.
- The flash is `pulse(progressAt("flash", ms))` in `drawX`'s colour mix.
- The gate breath is `M.breath(t).yaw`, multiplied by `1 - frozenMix`, where
  `frozenMix` eases to 1 over 90ms on first `pointerdown`.
- After `M.ended(ms)`, skip `drawX` entirely unless the pointer moved or the
  window resized. Pre-unlock, draw it once and forget it.

### 9.3 Three perf notes that are really motion notes

**Redraw the pad on rAF, not on every move.** Only score the last 40 points of
each stroke for coverage; the older ones have already been counted. On a fast
signature the current code does that O(n squared) work about 120 times a second.

**Quantise the mint fill to 8 bands, one per 10% of the arm.** It removes the
jitter you get today when coverage jumps by 1/22 between two paint calls, and
it stops you needing to smooth a number that is already being quantised. The
name uses 5 bands because a fixed reveal wants coarse steps; coverage is a live
input and wants finer ones.

**Draw Rusty at 20fps, not 60.** A pixel character at 20fps reads as intentional
animation. At 60fps he reads as a smooth object pretending to be pixel art, and
he costs three times the fill. Gate his loop on a 50ms accumulator.

### 9.4 How to check it without a browser

```
node --check motion.js
node verify.js     # 49 checks, all passing
```

`verify.js` covers the parts that can be checked without a browser: easing
endpoints and monotonicity, `stepEnd` matching `steps(n,end)`, `TOTAL` matching
the last beat, pose geometry at 320, 375, 720, 768, 1024, 1440 and 1920 wide,
the settled X staying on screen and clear of the name, and the claim that six
refresh rates produce identical smoothing.

The one thing those checks cannot tell you is whether 104ms per name band looks
right. That is a judgement call, and it is the only one in this document worth
arguing about.

---

## 10. Summary

| | Now | Proposed |
|---|---|---|
| Curves | 3, used inconsistently | 3, one job each |
| Frame-rate dependent | yes, 2.4x drift | no |
| Starts in the unlock frame | all 8, one frame | 3, then one at a time |
| Unlock length | ~1.4s, fronted by a 420ms dead hold | 1660ms, 10 sequenced beats |
| Last motion | never | 1660ms, then still |
| Name entrance | 1.4s fade + 10px rise | 520ms print in 5 bands |
| Rusty | floats up | falls, bounces, settles |
| Pointer affects | 2 layers, 1.2s lag, never resets | 3 layers, 0.18 to 0.36s, returns home |
