# The two rows: choice buttons as objects

Two answers, held still in the dark. This file is the whole object: chassis,
corner ticks, veil, states, pull, depth, sound, keys and touch. It does not
change a scene length or a line of copy. `dialogue.md` owns what he says,
`script.md` owns the clock.

Canonical home is `menu.js`. The `.opt` rows in `index.html` are the fallback and
follow the same geometry at the end.

## The object in one line

A 54px pixel slab with a 2px wire, four corner ticks and a veil that rises from
the floor as your cursor gets close. It looks like a frame around an answer, not
a control. It never changes size, only colour, light and 3px of position.

## Where it lives

| file | lines | what changes |
|---|---|---|
| `menu.js` | 96-146 | row CSS, replaced by the sheet below |
| `menu.js` | 201-210 | `normalizeOptions` keeps `sub` |
| `menu.js` | 456-473 | arm the rows, fire the two arm ticks |
| `menu.js` | 485-505 | `onMove` becomes the field sampler |
| `menu.js` | 536-573 | pick: press, cue, `aria-current`, fade out |
| `index.html` | 158-216 | fallback `.opt` gets the same chassis |
| `intro.js` | 1077-1116 | fallback builder parity |
| `intro.js` | 1132-1150 | pass `sub` and the cue hook |

## Anatomy

```
        2px chassis, 6px stepped corners
        |                                        |
        v                                        v
   ┌──────────────────────────────────────────────┐
   │  ╱                                          ╲ │  <- corner ticks, 8px arms
   │   01   check my vols application result    ▢  │  <- index / label / mark
   │        one file, one line                    │  <- optional sub
   │  ╲                                          ╱ │
   └──────────────────────────────────────────────┘
     ^                                              ^
     veil rises from the bottom, 300ms, never past the border
```

Layer order, back to front:

1. floor, transparent, the void shows through
2. veil, `::after`, `scaleY(var(--near))`, origin bottom
3. chassis, `::before`, 2px border, clip path, 6px chamfer
4. corner ticks, `.xmenu__br`
5. content, index, label, sub, mark, `z-index: 2`

## Layout

The block is the console rail. On desktop `intro.js` already puts the dialogue at
`left: clamp(20px, 6.4vw, 92px)` and `bottom: clamp(88px, 16vh, 156px)`. The rows
land on the same left edge, under the bubble.

| token | 1440 x 900 | 375 x 812 | 320 wide | short landscape |
|---|---|---|---|---|
| block left | 92px | 18px | 18px | 18px |
| block width | 540px | 339px | 284px | auto |
| block bottom | 144px | safe-area + 20px | same | 56px |
| row height | 54px min | 52px min | 52px min | 44px min |
| row gap | 6px | 12px | 12px | 6px |
| padding | 14px 14px 14px 12px | 12px 12px 12px 10px | 11px 10px 10px 9px | 9px 10px |
| grid | 28px 1fr 12px | 24px 1fr 10px | 22px 1fr 10px | 24px 1fr 10px |
| grid gap | 12px | 10px | 8px | 10px |
| label | PS2P 10px / 1.9 | PS2P 8.5px / 1.95 | PS2P 8px / 2 | PS2P 8.5px / 1.9 |
| sub | mono 9.5px / 1.6 | mono 8.5px, none under 420px | none | none |
| index | 9px | 8px | 8px | 8px |
| border | 2px | 2px | 2px | 2px |
| chamfer | 6px | 4px | 4px | 4px |
| tick arms | 8px | 5px | 5px | 5px |
| tick inset | 6px | 4px | 4px | 4px |

Rows are one column, full width, `border-radius: 0`. No flex-wrap. The sub is
optional and only present when the caller passes one. The 01 label fits one line
at 375 and wraps to two at 320. The row grows; nothing clips.

Grid cells: index, start aligned; label block, centred vertically; mark, end
aligned. The index never moves between states.

## Pixel border

One 2px border, one colour, four corners cut in a three step staircase. The clip
path is the border box, so the 2px follows the steps. Nothing is rounded.

```
(0,6) -> (2,6) -> (2,4) -> (4,4) -> (4,2) -> (6,2) -> (6,0)   top left
```

Full path, 6px cut, 2px steps:

```css
clip-path: polygon(
  0 6px, 2px 6px, 2px 4px, 4px 4px, 4px 2px, 6px 2px, 6px 0,
  calc(100% - 6px) 0,
  calc(100% - 6px) 2px, calc(100% - 4px) 2px,
  calc(100% - 4px) 4px, calc(100% - 2px) 4px,
  calc(100% - 2px) 6px, 100% 6px,
  100% calc(100% - 6px),
  calc(100% - 2px) calc(100% - 6px),
  calc(100% - 2px) calc(100% - 4px),
  calc(100% - 4px) calc(100% - 4px),
  calc(100% - 4px) calc(100% - 2px),
  calc(100% - 6px) calc(100% - 2px),
  calc(100% - 6px) 100%,
  6px 100%,
  6px calc(100% - 2px), 4px calc(100% - 2px),
  4px calc(100% - 4px), 2px calc(100% - 4px),
  2px calc(100% - 6px), 0 calc(100% - 6px)
);
```

At the mobile cut, swap every 6 for 4 and every 4 for 2.

The clip lives on the chassis pseudo, never on the button, so the focus outline
is not clipped. The chassis is `pointer-events: none`.

Colours: `--wire` `rgba(255,233,176,.16)` at rest, `rgba(255,177,92,.78)` lit,
`rgba(255,233,176,.08)` disabled. Border width never changes.

## Corner ticks

Four L marks, 2px thick, 8px arms, inset 6px, so they sit just inside the chamfer
and 1px inside the content padding. Built from eight background layers, no SVG,
no extra nodes beyond one span.

Rest: opacity `.22 + near * .78`, colour `rgba(255,177,92,.46)`.
Lit: opacity 1, colour `rgba(255,177,92,.9)`.
Focus: mint.
Selected: amber, plus a 1px amber keyline inside the chassis.
Disabled: four 2px corner pixels instead of L arms, opacity .3.

They are the same object at every size. At 375 the arms drop to 5px and the inset
to 4px; the shape is identical.

## Proximity veil

One row can be near at a time. Near is distance to the row rectangle, not to the
row centre, so the tall slab catches you early.

```
d = distance from pointer to the nearest edge of the row rect
near = clamp(1 - d / 170, 0, 1) ^ 1.15
```

- `--near` drives the veil only, `scaleY(near)`, origin `50% 100%`.
- Transition in 300ms `cubic-bezier(.2,.8,.2,1)`, out 220ms. Reduced motion: 0ms.
- The veil is `inset: 6px` (4px on mobile), so it never spills past the chamfer.
- Fill is a bottom up wash, `rgba(255,177,92,.105)`, fading out by 82%, with a
  1px scanline texture at 5% on top of it. The lines compress as it rises, which
  reads as a scan rather than a fade.
- The nearest row takes the light. The other row is set to 0 in the same frame,
  so there is never a moment with two lit rows.
- Ties at the gap go to the row vertically closer to the pointer, then to 01.

Rusty reacts before the row does: `near > .35` sets his gaze to that row,
`near > .8` leans him 6 degrees. `intro.js` already maps row 0 and 1 to
`leanT -1 / +1`; drive it from the field sample, not from `pointerenter`, so the
lean matches the veil.

## States

Every state changes at most three channels. No state changes size, padding,
border width or font.

| state | trigger | chassis | veil | ticks | index | mark | label | motion | sound |
|---|---|---|---|---|---|---|---|---|---|
| rest | nothing | wire 16% | 0 | 22% | violet | hollow | 64% cream | none | none |
| near | pointer < 170px, outside | 16% | 0 to 1 by near | 22 to 100% | violet | hollow | 64% | none | `near` once per entry |
| hover | pointer inside, or lit | amber 78% | 1 | 90% | amber | filled amber, 12px glow | cream | pull 0, drift only | `hover` on lit change |
| focus | keyboard, `:focus-visible` | amber 78% | 1 | mint 100% | mint | filled mint | cream | no pull, no drift | `key` on lit change |
| press | pointer or key down | amber, fill .06 | 1 | 100% | amber | filled | cream | depth +2px, 90ms | `press` |
| selected | committed | amber, inner keyline | 1 | amber 100% | amber | X, 2 layers | cream | depth 0, holds 460ms | `select` |
| disabled | unarmed or refused | wire 8% | 0 | dots 30% | 32% | hollow 32% | 32% | none | `deny` on tap only |
| nudge | auto pick at 15.20 | amber blink x2 | 0 | 100% | amber | filled | cream | `steps(1)` 600ms x2 | `near` |
| gone | sibling after pick | 16% | 0 | 0 | 32% | hollow | 32% | opacity .3s | none |

Hover and near are different states on purpose. Near is the room noticing you.
Hover is the room answering.

Focus beats hover for the light when the pointer is not inside a row. When the
pointer leaves the block, lit returns to the focused row, or to none.

## Magnetic pull

The row is pulled toward the cursor by at most 3px. It is a gesture, not a
layout: transform only, the rect never moves.

```
R        = 170px          same radius as the veil
pull     = 3px            desktop, 2px at 761-1023, 0 at 760 and below
falloff  = (1 - d / R) ^ 2.2
y ratio  = 0.55           it leans more than it lifts
max      = 3px desktop
```

- Direction is row centre to pointer, normalised.
- Inside the row, pull is 0. That is the important part: the target cannot run
  from the click. The row settles as the cursor crosses the border.
- Disabled, picked, reduced motion, coarse pointer: pull 0.
- Ease to target in 140ms, reset in 260ms. One rAF for both rows, batched from
  one `pointermove` on `window` while the menu is open.
- Rect cache is measured once on open, on arm, on resize, with transforms
  cleared first. No `getBoundingClientRect` per frame.
- The pair never separates by more than 3px, because only the nearest row takes
  pull and the other stays at 0.

Group parallax rides on the same transform: `--gx` and `--gy` are set on
`.xmenu__opts` from the pointer, `-2px..2px` x and `-1.5px..1.5px` y, opposite
the cursor, 180ms ease. Rows inherit them, so the pair drifts together and the
gap never changes.

## Press depth

Press is a physical 2px sink, not a scale.

| phase | time | what |
|---|---|---|
| down | 90ms | `--press: 2px`, chassis darkens 6%, index inverts to amber block, mark contracts to 6px |
| hold | until up | nothing else moves; the veil stays at 1 |
| release | 140ms | `--press: 0`, no overshoot, no bounce |
| commit | 0 / 90 / 460ms | pick paints, sibling fades, both fold at 460 |

No `scale()`. Scaling text at 8px blurs it, and this object is pixel copy.
Mobile depth is 1px. Reduced motion keeps 1px and drops the time to 0.

## Sound

Five cues, Web Audio only, all through the intro master gain (`0.24`). `menu.js`
keeps its own context as a fallback; when `intro.js` passes a `cue` hook it uses
that instead, so there is one master and one duck.

| cue | when | voice | gain | limit |
|---|---|---|---|---|
| `near` | veil crosses .45 inbound | square 1600Hz, 6ms | .006 | once per row entry, 400ms re-arm |
| `hover` | lit index changes by pointer | square 1200Hz + up to 60, 8ms | .014 | 45ms |
| `key` | lit index changes by key | triangle 900Hz, 7ms | .011 | 45ms |
| `press` | pointerdown or keydown | square 300 to 180Hz, 14ms | .016 | one per press |
| `select` | commit | square 240 to 120Hz, 30ms + sine 110 to 60Hz, 120ms | .02 / .05 | once |
| `deny` | tap on a disabled row | square 400Hz, 12ms | .009 | 300ms |

Arm ticks, when the line finishes and the rows become real: 1600Hz then 1200Hz,
90ms apart, 8ms each, `.014`. That is the two row ticks in `script.md`.

There is no sound on leave, none on disabled hover, none while a line types, and
none before the first gesture. Reduced motion does not mute.

## Keys, focus, ARIA

- `Tab` enters row 01, then 02. `ArrowDown` / `ArrowUp` / `Home` / `End` move
  focus. `1` and `2` commit. `Enter` and `Space` commit through the native
  button. `Escape` is the intro's skip, not the row's.
- Arrow keys never magnetise. They set `--mx/--my` to 0 in the same frame.
- `:focus-visible` is a 1px dashed mint outline at 4px, mint ticks and mint
  index. It is the only dashed line in the intro, which is why it reads as
  keyboard.
- Rows are real `<button type="button">`. While the line types, `aria-disabled`
  is true and the group is `inert`. On arm both clear.
- The group is labelled by the bubble: `aria-describedby` points at the full
  line. A row with a sub gets `aria-label="label. sub"` and the visual sub is
  `aria-hidden`.
- On pick, `aria-current="true"` on the chosen row, focus stays for the 460ms
  hold, then moves to the gate skip button.
- After the menu folds, focus never falls to `<body>`.

## Mobile

Touch has no hover, so touch-down is the light.

| rule | value |
|---|---|
| hit target | 52px min row, 5px gap outside the border |
| light | `pointerdown` sets near 1 with 0ms transition |
| commit | `pointerup` inside the same rect, or `click` |
| cancel | move 12px off the rect, or `pointercancel`, clears to 0 |
| depth | 1px, 90ms down, 140ms up |
| pull / drift / veil ramp | off |
| tick arms | 5px at inset 4px, chamfer 4px |
| haptic | `navigator.vibrate?.(8)` on commit, try/catch |
| text | PS2P 8.5px, no sub, 2 lines max at 320 |
| entry | 12px stagger, 220ms, from the bottom |
| keyboard | on-screen keyboards are irrelevant, but `Enter` still commits |

`touch-action: manipulation` on the row, not the page. The gate pad keeps
`touch-action: none`.

## CSS sketch

Drop-in replacement for the row block in `menu.js`. Tokens stay on `.xmenu`.

```css
.xmenu{
  --u: 2px;
  --wire: rgba(255,233,176,.16);
  --wire-hi: rgba(255,177,92,.78);
  --paper: rgba(255,177,92,.105);
  --amber: #ffb15c;
  --cream: #ffe9b0;
  --mint: #9ef0c0;
  --violet: #9e8aff;
}

.xmenu__opts{
  --gx: 0px;
  --gy: 0px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.xmenu__row{
  --near: 0;
  --mx: 0px;
  --my: 0px;
  --press: 0px;
  position: relative;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 12px;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 54px;
  margin: 0;
  padding: 14px 14px 14px 12px;
  background: none;
  border: 0;
  border-radius: 0;
  font-family: "Press Start 2P", "PS2P", ui-monospace, monospace;
  font-size: 10px;
  line-height: 1.9;
  letter-spacing: 0;
  color: rgba(255,233,176,.64);
  text-align: left;
  cursor: pointer;
  overflow: visible;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  touch-action: manipulation;
  appearance: none;
  transform: translate3d(
    calc(var(--mx) + var(--gx)),
    calc(var(--my) + var(--gy) + var(--press)),
    0
  );
  transition: transform .14s cubic-bezier(.2,.8,.2,1), color .25s ease;
}
.xmenu__row > *{ position: relative; z-index: 2; }

/* veil */
.xmenu__row::after{
  content: "";
  position: absolute;
  inset: 6px;
  z-index: 0;
  pointer-events: none;
  background:
    repeating-linear-gradient(0deg, rgba(255,233,176,.05) 0 1px, transparent 1px 3px),
    linear-gradient(to top, var(--paper), rgba(255,177,92,0) 82%);
  transform: scaleY(var(--near));
  transform-origin: 50% 100%;
  transition: transform .3s cubic-bezier(.2,.8,.2,1);
  will-change: transform;
}

/* chassis */
.xmenu__row::before{
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  border: 2px solid var(--wire);
  clip-path: polygon(
    0 6px, 2px 6px, 2px 4px, 4px 4px, 4px 2px, 6px 2px, 6px 0,
    calc(100% - 6px) 0, calc(100% - 6px) 2px, calc(100% - 4px) 2px,
    calc(100% - 4px) 4px, calc(100% - 2px) 4px, calc(100% - 2px) 6px, 100% 6px,
    100% calc(100% - 6px), calc(100% - 2px) calc(100% - 6px),
    calc(100% - 2px) calc(100% - 4px), calc(100% - 4px) calc(100% - 4px),
    calc(100% - 4px) calc(100% - 2px), calc(100% - 6px) calc(100% - 2px),
    calc(100% - 6px) 100%, 6px 100%, 6px calc(100% - 2px),
    4px calc(100% - 2px), 4px calc(100% - 4px), 2px calc(100% - 4px),
    2px calc(100% - 6px), 0 calc(100% - 6px)
  );
  transition: border-color .3s ease, background-color .3s ease;
}

/* corner ticks */
.xmenu__br{
  --brk: rgba(255,177,92,.46);
  position: absolute;
  inset: 6px;
  z-index: 3;
  pointer-events: none;
  opacity: calc(.22 + var(--near) * .78);
  transition: opacity .2s ease;
  background:
    linear-gradient(var(--brk), var(--brk)) 0 0 / 8px 2px no-repeat,
    linear-gradient(var(--brk), var(--brk)) 0 0 / 2px 8px no-repeat,
    linear-gradient(var(--brk), var(--brk)) 100% 0 / 8px 2px no-repeat,
    linear-gradient(var(--brk), var(--brk)) 100% 0 / 2px 8px no-repeat,
    linear-gradient(var(--brk), var(--brk)) 0 100% / 8px 2px no-repeat,
    linear-gradient(var(--brk), var(--brk)) 0 100% / 2px 8px no-repeat,
    linear-gradient(var(--brk), var(--brk)) 100% 100% / 8px 2px no-repeat,
    linear-gradient(var(--brk), var(--brk)) 100% 100% / 2px 8px no-repeat;
}

.xmenu__row.is-lit{ color: var(--cream); }
.xmenu__row.is-lit::before{
  border-color: var(--wire-hi);
  background-color: rgba(255,177,92,.03);
}
.xmenu__row.is-lit .xmenu__br{ --brk: rgba(255,177,92,.9); opacity: 1; }
.xmenu__row.is-lit .xmenu__idx{ color: var(--amber); }

.xmenu__row:focus{ outline: none; }
.xmenu__row:focus-visible{
  outline: 1px dashed var(--mint);
  outline-offset: 4px;
}
.xmenu__row:focus-visible .xmenu__br{ --brk: var(--mint); opacity: 1; }
.xmenu__row:focus-visible .xmenu__idx{ color: var(--mint); }

.xmenu__row.is-press{
  --press: 2px;
  transition: transform .09s cubic-bezier(.2,.8,.2,1);
}
.xmenu__row.is-press::before{
  border-color: var(--amber);
  background-color: rgba(255,177,92,.06);
}

.xmenu__row.is-picked::before{
  border-color: var(--amber);
  background-color: rgba(255,177,92,.07);
  box-shadow: inset 0 0 0 1px rgba(255,177,92,.32);
}
.xmenu__row.is-picked::after{ transform: scaleY(1); }
.xmenu__row.is-picked .xmenu__idx{ color: var(--amber); }

.xmenu__row[aria-disabled="true"]{
  color: rgba(255,233,176,.32);
  cursor: default;
}
.xmenu__row[aria-disabled="true"]::before{ border-color: rgba(255,233,176,.08); }
.xmenu__row[aria-disabled="true"]::after{ transform: scaleY(0); }
.xmenu__row[aria-disabled="true"] .xmenu__br{
  opacity: .3;
  background:
    linear-gradient(var(--brk), var(--brk)) 0 0 / 2px 2px no-repeat,
    linear-gradient(var(--brk), var(--brk)) 100% 0 / 2px 2px no-repeat,
    linear-gradient(var(--brk), var(--brk)) 0 100% / 2px 2px no-repeat,
    linear-gradient(var(--brk), var(--brk)) 100% 100% / 2px 2px no-repeat;
}

@keyframes xmenuNudge{
  0%, 100%{ border-color: var(--wire); }
  50%{ border-color: var(--amber); }
}
.xmenu__row.is-nudge::before{ animation: xmenuNudge .6s steps(1, end) 2; }

.xmenu__row.is-gone{ opacity: .16; }

.xmenu__idx{
  font-size: 9px;
  line-height: 1;
  letter-spacing: .14em;
  color: rgba(158,138,255,.82);
  transition: color .3s ease;
  font-variant-numeric: tabular-nums;
}
.xmenu__label{ min-width: 0; overflow-wrap: break-word; }
.xmenu__sub{
  display: block;
  margin-top: 6px;
  font-family: var(--mono, ui-monospace, monospace);
  font-size: 9.5px;
  line-height: 1.6;
  letter-spacing: .05em;
  color: rgba(255,233,176,.4);
}
.xmenu__mark{
  justify-self: end;
  width: 10px;
  height: 10px;
  border: 2px solid rgba(255,177,92,.42);
  background: transparent;
  transition: background-color .3s ease, border-color .3s ease, box-shadow .3s ease;
}
.xmenu__row.is-lit .xmenu__mark{
  background: var(--amber);
  border-color: var(--amber);
  box-shadow: 0 0 12px rgba(255,177,92,.6);
}
.xmenu__row.is-picked .xmenu__mark{
  background:
    linear-gradient(45deg, transparent 44%, var(--amber) 44% 56%, transparent 56%),
    linear-gradient(-45deg, transparent 44%, var(--amber) 44% 56%, transparent 56%);
  border-color: rgba(255,177,92,.3);
  box-shadow: none;
}

@media (max-width: 760px){
  .xmenu__row{
    grid-template-columns: 24px minmax(0, 1fr) 10px;
    gap: 10px;
    min-height: 52px;
    padding: 12px 12px 12px 10px;
    font-size: 8.5px;
    line-height: 1.95;
  }
  .xmenu__opts{ gap: 12px; }
  .xmenu__row::before{ clip-path: polygon(
    0 4px, 2px 4px, 2px 2px, 4px 2px, 4px 0,
    calc(100% - 4px) 0, calc(100% - 4px) 2px, calc(100% - 2px) 2px,
    calc(100% - 2px) 4px, 100% 4px,
    100% calc(100% - 4px), calc(100% - 2px) calc(100% - 4px),
    calc(100% - 2px) calc(100% - 2px), calc(100% - 4px) calc(100% - 2px),
    calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 2px),
    2px calc(100% - 2px), 2px calc(100% - 4px), 0 calc(100% - 4px)
  ); }
  .xmenu__row::after,
  .xmenu__br{ inset: 4px; }
  .xmenu__br{
    background-size: 5px 2px, 2px 5px, 5px 2px, 2px 5px,
                   5px 2px, 2px 5px, 5px 2px, 2px 5px;
  }
  .xmenu__sub{ display: none; }
  .xmenu__row.is-press{ --press: 1px; }
  .xmenu__row:focus-visible{ outline-offset: 3px; }
}
@media (max-height: 520px){
  .xmenu__row{ min-height: 44px; padding: 9px 10px; }
  .xmenu__br, .xmenu__row::after{ inset: 4px; }
}
@media (prefers-reduced-motion: reduce){
  .xmenu__row,
  .xmenu__row::after,
  .xmenu__br,
  .xmenu__opts{ transition-duration: .01ms !important; }
  .xmenu__row{ --mx: 0px; --my: 0px; --gx: 0px; --gy: 0px; }
  .xmenu__row.is-press{ --press: 1px; }
  .xmenu__row.is-nudge::before{
    animation: none;
    border-color: var(--amber);
  }
}
```

## JS sketch

Three pieces: the cue map, the field sampler, the pointer wiring. This replaces
`onMove` in `menu.js` and adds about 90 lines.

```js
// ---- field ---------------------------------------------------------
const FIELD = { r: 170, pull: 3, pullY: .55, pullAt: 1023, deadInside: 0 };

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

function edgeDistance(b, x, y) {
  const dx = x < b.l ? b.l - x : x > b.r ? x - b.r : 0;
  const dy = y < b.t ? b.t - y : y > b.b ? y - b.b : 0;
  return Math.sqrt(dx * dx + dy * dy);
}

// measure with transforms cleared, once, never per frame
function measure(u) {
  u.rows.forEach((row) => {
    row.style.setProperty("--mx", "0px");
    row.style.setProperty("--my", "0px");
  });
  u.rects = u.rows.map((row) => {
    const b = row.getBoundingClientRect();
    return { l: b.left, t: b.top, r: b.right, b: b.bottom };
  });
}

function sample(u) {
  u.raf = 0;
  if (!u.rects || !u.field.on || u.locked) return;
  const { x, y } = u.field;
  const fine = u.fine && !u.reduce && innerWidth > 760;

  let best = -1, bestD = Infinity, bestDY = Infinity;
  u.rects.forEach((b, i) => {
    const d = edgeDistance(b, x, y);
    const dy = Math.abs((b.t + b.b) / 2 - y);
    if (d < bestD - 0.5 || (Math.abs(d - bestD) <= 0.5 && dy < bestDY)) {
      best = i; bestD = d; bestDY = dy;
    }
  });

  u.rows.forEach((row, i) => {
    const mine = i === best;
    const near = mine
      ? Math.pow(clamp(1 - bestD / FIELD.r, 0, 1), 1.15)
      : 0;
    row.style.setProperty("--near", near.toFixed(3));

    let mx = 0, my = 0;
    const off = row.getAttribute("aria-disabled") === "true";
    if (mine && near > 0 && fine && !off) {
      const b = u.rects[i];
      const inside = x >= b.l && x <= b.r && y >= b.t && y <= b.b;
      if (!inside) {
        const p = FIELD.pull * Math.pow(clamp(1 - bestD / FIELD.r, 0, 1), 2.2);
        const cx = (b.l + b.r) / 2;
        const cy = (b.t + b.b) / 2;
        const len = Math.hypot(x - cx, y - cy) || 1;
        mx = ((x - cx) / len) * p;
        my = ((y - cy) / len) * p * FIELD.pullY;
      }
    }
    row.style.setProperty("--mx", mx.toFixed(2) + "px");
    row.style.setProperty("--my", my.toFixed(2) + "px");

    // rust: lean toward the near row, before it is lit
    if (u.onLean) u.onLean(mine && near > 0.35 ? (i === 0 ? -1 : 1) : 0, near);
  });
}

// group parallax, opposite the cursor, max 2px
function drift(u, x, y) {
  const gx = clamp((x / innerWidth - .5) * -4, -2, 2);
  const gy = clamp((y / innerHeight - .5) * -3, -1.5, 1.5);
  u.opts.style.setProperty("--gx", gx.toFixed(2) + "px");
  u.opts.style.setProperty("--gy", gy.toFixed(2) + "px");
}

// one listener, one rAF
function onPointer(u, e) {
  if (u.locked) return;
  u.field.x = e.clientX;
  u.field.y = e.clientY;
  u.field.on = true;
  drift(u, e.clientX, e.clientY);
  if (!u.raf) u.raf = requestAnimationFrame(() => sample(u));
}

function onLeave(u) {
  u.field.on = false;
  if (u.raf) cancelAnimationFrame(u.raf);
  u.raf = 0;
  u.rows.forEach((row) => {
    row.style.setProperty("--near", "0");
    row.style.setProperty("--mx", "0px");
    row.style.setProperty("--my", "0px");
  });
  u.opts.style.setProperty("--gx", "0px");
  u.opts.style.setProperty("--gy", "0px");
  if (u.onLean) u.onLean(0, 0);
  let focused = -1;
  try { focused = u.rows.indexOf(document.activeElement); } catch (err) {}
  setLit(u, focused);
}
```

Wire it when the menu opens, unhook on dismiss:

```js
u.fine = matchMedia("(pointer: fine)").matches;
u.rects = null;
measure(u);
global.addEventListener("pointermove", u.hMove = (e) => onPointer(u, e), { passive: true });
global.addEventListener("pointerout", u.hOut = (e) => { if (!e.relatedTarget) onLeave(u); });
addEventListener("resize", u.hResize = () => { measure(u); }, { passive: true });
// dismiss(): remove all three, cancel u.raf
```

Cue hook, called from `pick` and from `setLit`:

```js
function makeCues(ctx, out) {
  if (!ctx) return null;
  const T = () => ctx.currentTime;
  function tone(type, f, dur, gain, to) {
    try {
      const t = T();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g); g.connect(out || ctx.destination);
      o.start(t); o.stop(t + dur + .02);
    } catch (err) {}
  }
  return {
    near: () => tone("square", 1600, .006, .006),
    hover: () => tone("square", 1200 + Math.random() * 60, .008, .014),
    key: () => tone("triangle", 900, .007, .011),
    press: () => tone("square", 300, .014, .016, 180),
    select: () => {
      tone("square", 240, .03, .02, 120);
      tone("sine", 110, .12, .05, 60);
    },
    deny: () => tone("square", 400, .012, .009)
  };
}
```

`pick()` changes, in order:

```js
u.locked = true;
row.classList.add("is-press");
cue && cue("select");
row.setAttribute("aria-current", "true");
setTimeout(() => row.classList.remove("is-press"), 90);
// existing: is-picked / is-gone, resolve, onPick
// then 460ms: root.classList.add("is-out"); 180ms later dismiss()
```

`setLit` gains `row.style.setProperty("--near", "1")` for keyboard focus, and
only fires `cue("hover")` when the change came from a pointer, `cue("key")` when
it came from focus.

## Wiring checklist

1. Replace `menu.js` rows CSS (96-146). Keep `.xmenu__face` hidden per
   `script.md:175`.
2. Add `<span class="xmenu__br" aria-hidden="true">` in the row builder.
3. Keep `sub` in `normalizeOptions` (201-210) and render `.xmenu__sub`.
4. `finishTyping` (456-473): remove `aria-disabled`, fire the two arm ticks,
   then `measure(u)`.
5. Replace `onMove` (485-505) with the sampler. Delete the per-row
   `pointerenter` light or keep it as a fallback for the first frame.
6. `pick` (536-573): press class, `select` cue, `aria-current`, `is-out` fade
   before removal. Today it deletes the node with no fade.
7. `intro.js:1138`: pass `{ cue, onLean }` and keep `sub` in the option objects.
8. `intro.js:1077-1116`: fallback `.opt` gets the chassis and ticks, or delete
   the fallback once `menu.js` is guaranteed.
9. `index.html:158-216`: same, or delete.
10. `intro.js:1152-1162`: after dismiss, focus `#gateSkip`.

## Rules

- One lit row. Never two. The field sets the other to 0 in the same frame.
- No state changes size, padding or border width. Colour, transform, opacity.
- The pull is 0 while the pointer is inside the row. A target that moves away
  from a click is a bug.
- The chrome never fills more than 8% opacity at rest. This is a frame, not a
  card.
- No scale on press. No ripple. No gradient glow. No icon.
- Nothing sounds on leave. Nothing sounds while a line types.
- A disabled row does not move, does not light, and only says no.
- Touch is the light. There is no hover to fake.

## Checks

Static, no browser:

1. Row rect at rest and lit are identical; only `transform` differs.
2. `--near` in `[0, 1]`, one row above 0 at a time.
3. Pull magnitude never exceeds 3px; 0 inside the rect; 0 on touch, reduced
   motion, disabled.
4. Two rows, two focus stops, `aria-disabled` true while typing and false after.
5. `1`, `2`, arrows, Home, End, Enter, Space, and Tab all commit or move.
6. Escape still reaches `intro.js` and skips.
7. `prefers-reduced-motion`: no pull, no drift, no nudge animation, veil
   instant, press 1px.
8. No `filter`, `backdrop-filter`, animated `box-shadow`, or per-frame
   `getBoundingClientRect`.
9. At 320px: no horizontal scroll, label wraps, target at least 44px.
10. Total new CSS under 6KB, new JS under 3KB, zero images.

## Budget

| block | lines | bytes |
|---|---|---|
| CSS sheet | 190 | ~4.6KB |
| field + cues | 110 | ~3.2KB |
| wiring | 20 | ~0.6KB |
| plan | this file | under 60KB |

The object is two rows, one rAF, two listeners, five tones. That is the whole
interaction surface of the intro outside the glass.
