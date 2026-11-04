# Xenith selected: perf + a11y audit

Read: `site/xenith.js` (393 lines), `site/style.css` (160), `site/index.html` (44),
`site/data.js`, `docs/design.md`, `docs/storyboard.md`. No browser opened. Numbers
below are computed, not estimated: canvas text counts from the code's own cell math,
contrast from WCAG relative luminance, name widths from the TTF's `hmtx` table.

---

## P0, ship blockers

### 1. One mouse move during load permanently kills the X and Rusty's eyes
`xenith.js:23` declares `W = 0, H = 0`. They are only assigned in `build()` (`:106`),
which only runs after the 270 KB campus JPEG loads and is ASCII-ified. `:167-170`
divides by them anyway:

```
mx = (e.clientX / W - 0.5) * 2     // clientX / 0 -> Infinity
```

`:174` returns early while `!ready`, so `mx` sits at `Infinity`. Then `:175`
`tx += (mx - tx) * 0.04` -> `Infinity`, next frame `Infinity - Infinity` -> `NaN`.
`NaN` propagates into `ay`/`ax` (`:60-61`), so every projected point is `NaN` and
`fillText("#", NaN, NaN)` draws nothing. Note `NaN * 0` is still `NaN`, so even at
`enteredMix = 0` every point is dead: **the glowing X never appears at all**, and
the reveal the whole page exists for is an empty canvas over a frozen backdrop. `:183` emits `rotateY(NaNdeg)`, an invalid
declaration, so the backdrop transform freezes at its last valid value. `:336`
`lx` becomes `NaN` and `:346-347` call `fillRect(NaN, ...)`, so **Rusty's pupils
vanish** while his body keeps bobbing.

Reproduced in node: `mx=Infinity, tx=Infinity, tx=NaN, rotateY(NaNdeg)`.

Who hits it: anyone whose pointer is over the window while the page loads. On 3G
that window is seconds. This is not a corner case, it is the default path.

Fix: one line. `if (!W || !H) return;` at the top of the `pointermove` handler,
and initialise `W = innerWidth, H = innerHeight` at declaration.

### 2. The X depends on a 270 KB JPEG, so the gate has no X
`:172-174` gates *everything* on `ready`, including `drawX` (`:185`). `ready` is
only set at `:161`, the last line of `build()`. `build()` returns at `:114` if the
image is absent, and `img.onerror` is never assigned, so on a 404, a CDN blip or a
blocked asset the monument canvas stays **blank forever**. The visitor sees two
dashed diagonal guides and `draw x` with no glowing object between them.

Also on the happy path the X appears only after: JPEG download + full-res decode
(270 KB, likely 4000 px wide, downsampled by `drawImage` at `:129`) + the ASCII
pass. The trace target should exist at frame zero.

Fix: call `drawX()` from boot regardless of `ready`, add `img.onerror` that sets
`W/H` and flips `ready`, and let the backdrop arrive late without blocking the X.

### 3. `data.js` failing kills the whole page
`:8` `window.XENITH_PEOPLE[key]` throws if `data.js` 404s or is blocked, and it
throws *before* any listener is attached. Result: `body` keeps `locked`, `#skip`
does nothing, `Escape` does nothing, empty `<h1>`. Total dead end with no error
visible to the visitor. Guard with `(window.XENITH_PEOPLE || {})`.

### 4. Focus is dropped into a hidden subtree on unlock
`#skip` is the only focusable control (`index.html:37`). On unlock, `:311-318` adds
`.entered`, and `style.css:117` sets `#gate{visibility:hidden}`. The focused
element disappears, so focus falls back to `<body>` and a screen reader announces
nothing. There is no `aria-live`, no heading change, no focus move. A keyboard or
SR user does the one available action and gets no confirmation that anything
happened.

Fix: `tabindex="-1"` on `#name`, `$("#name").focus()` inside `unlock()`, plus a
polite live region: "You're in. Katherine Augustine, Events and Admin."

### 5. Contrast failures and a 27 px escape hatch
Computed against the painted backdrop `#06050f` (`:112`), alpha-composited:

| element | line | value | ratio | AA 4.5 |
|---|---|---|---|---|
| `#skip` | css:140 | `rgba(255,233,176,.30)` 9px | **2.29** | FAIL |
| `.hud` | css:67 | `rgba(255,233,176,.40)` 9px | **3.28** | FAIL |
| `.prompt .p2` | css:135 | `rgba(255,233,176,.42)` 9px | **3.53** | FAIL |
| gate guides | js:255 | `rgba(255,233,176,.40)` 1.5px dash | **3.28** | FAIL as a target |
| `#line` | css:95 | `rgba(255,233,176,.62)` 14px | 6.61 | pass |
| `#role` | css:91 | `#ffb15c` 9.5px | 11.29 | pass |

`#skip` is the only non-gesture exit, it is the smallest text on the page, and its
tap target is `9px * 1.2 + 16px padding` ≈ **46 by 27 px**. `css:142` also sets
`outline:none`. It also sits at `bottom:26px`, which on iPhone Safari is the zone
the URL bar covers, and `index.html:5` has no `viewport-fit=cover` and no
`env(safe-area-inset-bottom)`. The escape hatch can be behind the toolbar.

The gate's dashed guide is the thing you are asked to trace, at 3.28:1. On a dim
laptop in a lit room that is nearly invisible.

### 6. `prefers-reduced-motion` is a placebo
`style.css:156-158` kills CSS transitions. Every actual motion is JS: the X
rotation and parallax (`:172-187`), the zoom, Rusty's bob and blink (`:367-372`).
`matchMedia` appears nowhere in the file. A reduced-motion user gets the full 3D
parallax show, driven by their own pointer. The media query currently achieves
nothing except disabling the `#name` fade-in.

---

## P1, makes it feel cheap

### 7. Resize triggers an unbounded full ASCII rebuild
`:165` `addEventListener("resize", () => { if (ready) build(); })`, no debounce,
and a second unthrottled listener at `:205` for the pad. Each `build()` allocates
a fresh offscreen canvas (`:121`), calls `getImageData` (`:130`), then does **two
`fillText` calls per cell** (`:149`, `:157`) with two state writes each.

Cells at real sizes (from the code's own `cell`/`lineH` math):

| viewport | cols x rows | cells | fillText per rebuild |
|---|---|---|---|
| 320x568 | 41x54 | 2,214 | 4,428 |
| 414x896 | 53x85 | 4,505 | 9,010 |
| 1440x900 | 132x63 | 8,316 | 16,632 |
| 1920x1080 | 176x75 | 13,200 | 26,400 |
| 3840x2160 | 351x148 | 51,948 | **103,896** |

Rotating a phone or dragging a window edge fires this dozens of times. The main
thread blocks for the whole pass, then pops.

### 8. The X costs 540 glyph draws with an 11 px shadow, per frame
`:70-79` allocates 540 `{sx,sy,sc,z}` objects and sorts them every frame. `:85-93`
then draws 540 glyphs with `shadowBlur = 11` (`:84`), and sets `mctx.font` to a
freshly concatenated string **inside the loop** (`:91`), alternating between two
values so the font cache thrashes. `globalAlpha` and `fillStyle` are also rewritten
per point, about 1,620 state writes per frame.

`shadowBlur` is the most expensive canvas state there is, and it is applied to
every glyph.

Per second at 60 fps: 32,400 shadowed glyphs. On a 120 Hz display: 64,800. Plus
about 2 MB/s of short-lived objects from `proj`.

### 9. There is no 30 fps loop, and the easing is frame-rate dependent
The brief says 30 fps. `:172-173` is an uncapped rAF recursion, and `:367-369` is a
second independent rAF loop for Rusty. On a 120 Hz iPad that is two callbacks per
refresh.

Worse: `:175-177` and `:184` use fixed per-frame lerps (`0.03`, `0.035`, `0.04`).
Entrance speed is tied to refresh rate. If you add a 30 fps cap without switching
to delta time, the reveal plays at double speed. Fix both together:
`a += (t - a) * (1 - Math.pow(1 - 0.03, dt / 16.67))`.

### 10. `cover()` is O(strokes x points) and runs on every pointermove
`:302-306` pushes a point per pointer event with no distance filter, then calls
`paint()`. `paint()` (`:248-292`) clears a full-screen canvas, redraws every guide
and every stroke with `shadowBlur = 14`, then calls `cover()` twice (`:261`), each
doing 22 samples x every segment of every stroke. A 20 s scribble at 60 Hz is
~1,200 points; every subsequent move re-walks all of them twice. Work grows
quadratically with how long the user has been trying.

Also `:208` calls `getBoundingClientRect()` on every pointer event, a layout read
per event.

### 11. Font: 118 KB TTF when a 1.8 KB woff2 is sitting in assets
`css:5` loads `PressStart2P.ttf` (118,204 B). `assets/fonts/ps2p-subset.woff2`
is **1,880 B**, a 63x difference, for a page whose only display text is a name.
`index.html:8` preloads the TTF at high priority, competing with the 270 KB campus
JPEG for the same slow connection and delaying the X.

`font-display:swap` with no metric override also hurts more than usual here:
measured from the font's own `hmtx`, **PS2P advance is exactly 1.000 em for every
glyph including the space**, while system mono is about 0.6 em. So the name is
~66% narrower before the swap and can reflow from one line to two. At 390 px
"Katherine Augustine" is 338 px in mono, 563 px in PS2P, and available width is
346 px. The swap changes the layout of the largest thing on the page.

Use the subset, update `index.html:8` to `type="font/woff2"`, and add
`size-adjust` on a fallback `@font-face`.

### 12. Landscape: Rusty sits on the personal line
At 568x320 the `max-width:720px` block applies: name 34 px, content block ~159 px
tall centred, so it spans y 80-239. `#rusty` is 84 px wide, 92 px tall,
`bottom:18px` -> y 210-302. Overlap at 210-239. The same thing happens at 844x390
with the desktop rules. `#content` is `z-index:4` over `#rusty`'s 3, so the last
line of someone's personal note prints across the robot's face.

### 13. Rusty is drawn on fractional pixels
`:335-336` `bob = Math.sin(t*1.5) * 1.1`, then `:331` multiplies by `U = 6`:
every `fillRect` edge lands on a fractional device pixel, so the whole sprite is
permanently antialiased and the fringe crawls as `bob` changes. `lx` (`:336`) does
the same to the eyes. Pixel art should never receive a float.

The backing store is also fixed at 252x276 (`:329`) with no DPR, while CSS width
is `clamp(84px,11vw,150px)`. At 150 CSS px on a 3x screen you need 450 px of art
and you have 252.

### 14. Dead scrim, dead transition, dead CSS
`css:40-44` gives `#scrim` `opacity:0` and a transition. `css:49` immediately
overrides it with `opacity:1`. So the scrim never animates, and it is permanently
covering the left ~40% of the ASCII backdrop at 92-98% opacity. You pay for 26,400
`fillText` calls on a 1080p rebuild to render a texture that is mostly hidden.
`body.entered #monument` (`css:45-48`) duplicates `css:36-39`. `#gate.done`
(`css:118`) is never applied. `@media (max-width:720px){.prompt{top:76%}}`
(`css:160`) duplicates `css:124`. `--violet`, `--red`, `--mint`, `--dim` are
declared and never used through `var()`. `docs/design.md` says `--ink #070614`,
the CSS and JS both paint `#06050f`.

`css:32` puts `filter:brightness(.7)` on a full-viewport canvas and `css:33`
transitions it over 1.4 s. That transition fires at exactly the unlock moment,
competing with the transform animation and the name entrance. Animate a scrim's
opacity instead.

---

## P2, hardening

- **Canvas size has no area cap.** `:105-108` and `:48-51` use
  `Math.min(dpr, 2)` with no pixel budget. 3840 CSS px at DPR 2 is 7680x4320,
  33 Mpx, 132 MB of backing store. Safari and many Android WebViews degrade or
  blank well before that. Clamp: `dpr = Math.min(dpr, Math.sqrt(12e6 / (W * H)))`.
- **The two canvases are sized from different sources.** `#scene` gets inline
  `innerHeight` px (`:109-110`) while `#monument` gets `inset:0` from CSS
  (`css:37`). On iOS the layout and visual viewports disagree by the toolbar
  height, so the X drifts off the backdrop it is supposed to sit on. Size both
  from one W/H, sourced from `visualViewport`.
- **`body{overflow:hidden}`** (`css:22`) means any vertical overflow is unreachable,
  not scrollable. It survives now because PS2P's 1 em advance is predictable, but
  it is one long name away from clipping.
- **Gate tolerance is stricter on touch than on mouse.** `:231`
  `Math.max(18, S*0.085)` gives 18 px at 320 wide (S=121) and 29 px on desktop.
  `docs/design.md` specifies 26 px. Touch needs more slack, not less.
- **`Math.random()` per cell** (`:141`) re-dithers the sky on every rebuild, so the
  backdrop visibly sparks when you rotate the phone. Use a hash of `x, y`.
- **No idle stop.** Both loops run forever after unlock. Drop `will-change`
  (`css:31`) once the entrance settles, and cancel the loops when the X settles
  under reduced motion.
- **`person.role`** is dead (`:9-11` accepts a `role` URL param that nothing reads),
  and the `?entered=1` / `?gate=auto` flags (`:382-392`) bypass the gate by design.
  Make sure those two never end up in a private link.
- **`#skip` says "skip"**, the design system says `skip and enter`. And
  `design.md:43` specifies `[ enter xenith ]`, which does not exist in the markup.
  That button is also the cleanest fix for the keyboard gap.

---

## Accessibility summary

Working already: `<html lang="en">`, `#name` is a real `<h1>`, decorative canvases
are `aria-hidden` (`index.html:12-13,29`), `body.locked` hides `#content` with
`visibility` rather than `opacity` (`css:144`), so no phantom text in the a11y tree,
`touch-action:none` on the pad (`css:121`), `#prompt` is real DOM text.

Missing:

1. **No keyboard path to the gesture.** A canvas is not focusable. Escape
   (`:321-323`) and `#skip` are the only alternatives, and neither is labelled for
   what it does. Add the `[ enter xenith ]` button from the design system, keep the
   canvas `aria-hidden` plus `role="presentation"`, and let it call `unlock()`.
2. **`aria-label` on a bare `<canvas>`** (`index.html:32`) with no role is
   inconsistently exposed. Either give it `role="img"` or move the label onto a
   real control.
3. **No unlock announcement and lost focus** (P0 #4).
4. **`outline:none`** on `#skip` (`css:142`). The colour change from 2.29:1 to
   10.72:1 is doing all the work of a focus ring. Keep a custom ring.
5. **Tiny uppercase with heavy tracking** as the department label: 9.5 px, 0.36 em
   (`css:90`), 8.5 px at 320 (`css:150`). High contrast, but it reads as texture,
   not as a label.
6. `<title>Xenith</title>` is identical on every private link. Set it to
   `Xenith · <name>` from JS. One line, and a screen reader user hears who the
   page is for before anything renders.

---

## Prioritised fix list

| # | Fix | Where | Lines | Impact |
|---|---|---|---|---|
| 1 | Guard `W`/`H` in pointermove | `xenith.js:167` | 2 | Stops the X and Rusty's eyes vanishing |
| 2 | `img.onerror` + draw the X from boot | `xenith.js:114,164,172` | ~10 | The gate always has an X |
| 3 | Guard missing `XENITH_PEOPLE` | `xenith.js:8` | 2 | No total dead page |
| 4 | Focus `#name` + live region on unlock | `xenith.js:311`, `index.html:24` | ~8 | SR users get confirmation |
| 5 | `#skip` to 4.5:1, 44 px target, safe-area bottom, keep a focus ring | `css:137-142` | 6 | The exit becomes reachable |
| 6 | Honour reduced motion in JS | `xenith.js:172,367` | ~15 | The media query stops lying |
| 7 | Debounce resize to one build per rAF | `xenith.js:165,205` | ~8 | No multi-hundred-ms freezes |
| 8 | Pre-render `#` and `:` to 2 sprites, `drawImage` them, drop `shadowBlur` | `xenith.js:85-93` | ~30 | 5-10x on the hottest canvas path |
| 9 | 30 fps cap + delta-time lerps, one loop for both | `xenith.js:172,367` | ~20 | Matches the brief, saves battery |
| 10 | Min-distance point sampling, cap stroke length, `cover()` at most once per rAF | `xenith.js:302-306,228` | ~15 | Interaction stops degrading |
| 11 | woff2 subset + `type="font/woff2"` + `size-adjust` | `css:3-7`, `index.html:8` | 5 | 116 KB and a reflow saved |
| 12 | 76 KB webp instead of the 270 KB JPEG | `xenith.js:20` | 1 | The X appears sooner |
| 13 | Round Rusty's bob and eye offsets, DPR the backing store | `xenith.js:329-347` | 4 | Pixel art that is actually pixel art |
| 14 | Landscape: keep Rusty clear of `#content` | `css:146-155` | 6 | Text off the robot's face |
| 15 | Canvas area clamp, one W/H source, safe-area insets | `xenith.js:105,197`, `index.html:5` | ~12 | iOS registration and memory |
| 16 | Delete dead CSS (`#scrim` opacity, `.done`, duplicate `.prompt`, `entered #monument`) | `css:40-49,118,160` | delete | Less to maintain, scrim behaves |
| 17 | Real `[ enter xenith ]` button per the design system | `index.html:31-38` | ~8 | Keyboard and SR path, and it is already specified |

Estimated total: about 150 lines of edits. Items 1-6 are the ones that change
whether a person can use the page at all.

---

## Low-power fallback

The page currently has one speed. Two rAF loops, 540 shadowed glyphs and an
uncapped-rAF parallax is a lot to ask of a 2018 Android phone on a hot evening.

**Detect, in this order:**

```
?lite=1                                   explicit override, and it should win
navigator.connection.saveData === true    the user already asked for less data
/2g/.test(connection.effectiveType)       real network, not a guess
navigator.deviceMemory <= 2               Chrome/Android only
navigator.hardwareConcurrency <= 2        low-end, cheap to read
matchMedia("(prefers-reduced-motion: reduce)").matches
sessionStorage.xenithLite === "1"         remembered from a previous downgrade
```

**What lite mode drops**, in order of what actually costs:

1. No rAF loop at all. Build the backdrop once, call `drawX(FIXED_T)` once, draw
   Rusty once with `bob = 0`. Zero per-frame work. This alone is the whole win.
2. No `shadowBlur` anywhere. It is the single most expensive canvas state on old
   GPUs. The X and Rusty read fine without it at these brightness levels.
3. Backdrop cell 13 instead of 11, and cap `dpr` at 1. 4K drops from 51,948 cells
   to about 8,000.
4. No pointer parallax. `tx`/`ty` pinned to 0.
5. Gate: `paint()` only on `pointerup`, `lineWidth` 3, no shadow. Keep the mint
   fill, it is the only success signal and it is cheap.
6. No `filter`, no `mix-blend-mode` (`css:32,59`). Lay a flat `rgba` scrim instead.

**Auto-downgrade at runtime**, so nobody has to be classified correctly up front:
sample frame deltas for the first 90 frames after unlock. If the p75 delta is over
40 ms, switch to the static path, `cancelAnimationFrame` both loops, and write
`sessionStorage.xenithLite = "1"`. No libraries, about 15 lines, and it catches
the phone cases `deviceMemory` cannot see (iOS Safari exposes no `deviceMemory`
and no `connection` in most versions, so it always falls through to the frame
sample, which is the honest signal anyway).

The gate itself must stay fully usable in lite. A person on a 2016 phone must
still be able to draw an X and see it turn mint.

Drop-in detection and helpers: `lite.js` in this folder. `node --check` clean.
