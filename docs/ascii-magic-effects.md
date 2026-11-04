# ascii-magic.com — effect taxonomy, slider UI, visual language

Study for the Xenith reveal page. Everything below was read off the live site on 2025-11-03:
the tool's DOM (`/app`), its JS bundles, and the 13 `/styles/*` pages. Numbers in *italics*
are measured from source; the rest is stated on-page.

Sources: [landing + before/after slider](https://www.ascii-magic.com/) ·
[the editor](https://www.ascii-magic.com/app) ·
[style pages](https://www.ascii-magic.com/styles) ·
[character-ramp guide](https://www.ascii-magic.com/blog/ascii-characters-full-guide) ·
[voxel](https://www.ascii-magic.com/styles/voxel) ·
[recipes](https://www.ascii-magic.com/recipes)

---

## 1. What the tool actually is

One canvas pipeline, *97* styles in the dropdown — *16* free, 81 wearing a `· Pro` badge. The free
16 are exactly our 12 plus Keycap ASCII, Block, Braille and Voxel. Everything is local: the file
never uploads, export runs up to 4× source resolution.

The whole thing reduces to a single loop. Learn it once and all 13 effects are a `switch`:

```
for each cell (grid sized by fontSize):
    sample  → average colour + average luminance of the cell
     tone   → index into a ramp / radius / stroke length / colour
     paint  → glyph, dot, bar, polygon, or flat tile
```

That is the entire architecture. "Characters" vs "Lines" vs "Dots" is only the last line —
what you paint into the cell. This matters for us: one renderer, one tuning panel, 13 looks.

---

## 2. The measured control panel

These controls are shared by every style (read from the live `/app` DOM):

| Control | Range / options | Default |
|---|---|---|
| `fontSize` (cell height in px) | 3–80, step 1 | *11* |
| `coverage` | 0–100 | *100* |
| `contrast` | −100…100 | *70* |
| `brightness` | −100…100 | *0* |
| `charOpacity` | 0–100 | *100* |
| `blendMode` | source-over, overlay, color-dodge, screen, lighter | *source-over* |
| `bgMode` | blur, solid, original, none | *blur* |
| `bgBlur` | 0–60 px | *0* |
| `bgOpacity` | 0–100 | *100* |
| `advBlur-type` | off, gaussian, lens, tilt, directional, radial, zoom, glassy, perspective, progressive | *off* |

Two things to steal regardless of effect choice:

- **`contrast` ships at 70, not 0.** Their output is punchier than the source by default. Copy
  that default or the render looks washed out next to their screenshots.
- **Post-FX is a separate stack, not part of the render:** Vignette, Scan Lines, CRT Curvature,
  Chromatic Aberration, Bloom, Film Grain, Glitch, RGB Split, Pixelate, Film Dust. Each with an
  intensity slider, plus a colour overlay with 11 blend modes (Multiply, Overlay, Screen, Color,
  Hue, Saturation, Luminosity, Soft Light, Hard Light, Color Burn, Color Dodge).

Cell width is **0.6 × cell height** (stated for Disco, and matches the mono advance everywhere
else). Use it; it keeps a 12 px render from looking horizontally squashed.

---

## 3. Character ramps — the actual strings

From the shipped bundle:

```js
standard: "@%#*+=-:. "     blocks: "█▓▒░ "
minimal:  "#=-. "          binary: "10 "
dots:     "●◕◑◔∙ "
```

The studio's custom-chars field pre-fills `@#S08Xx+=-;: ` (the guide quotes `@#S08Xx+=-;:,.`).
17 presets are exposed in the dropdown: `standard, classic, ink, minimal, forensic, blocks, bars,
quadrants, braille, numeric, binary, hacker, alpha, dots, geometric, math, katakana`.

Rule from their guide, worth quoting to anyone who asks why the text looks different between
variants: *more distinct glyphs = smoother gradients; fewer = punchier and more graphic.*

**Polarity — gotcha.** Their copy says "dense glyphs for shadows", but that is the dark-ink-on-
paper convention. Measured against their own hero pair, stroke density (16 px cell variance) rises
with source luminance: *0.8 at near-black → ~20 at light, r = 0.68*, i.e. **bright areas carry the
ink** because the canvas is black. Same for the pattern styles — all luma-positive (source luma vs
bright-pixel coverage): *Dots r = 0.90, Lines r = 0.89, Cross r = 0.90*.

So: on our black page, bright = dense. If you ever render onto paper-white, flip the index.

---

## 4. The 13 effects

| Effect | Paints per cell | Native params | Cost |
|---|---|---|---|
| Characters | one glyph from a ramp | ramp preset + custom string | 1 `fillText`/cell |
| Dither | 1 px of a quantised palette | algorithm, palette, scale, strength, threshold, contrast | 1 `ImageData` pass |
| Mixed | glyph from *n* pools, chosen per cell | pool count (5 families), hash | 1–2 draws/cell |
| Pixel Art | flat colour block | cell size only (+contrast/coverage) | 1 `fillRect`/cell |
| Mosaic | flat colour tile, any aspect | tile shape (square/wide/tall), size, blend, optional dither overlay | 1 `fillRect`/cell |
| LEGO | tile + stud highlight + edge | brick size, palette, coverage | 1 rect + 1 gradient/cell |
| Disco | faceted gradient tile + glint + burst | **Uniformity** (only unique slider), size, bloom | ~3 draws/cell |
| Animated ASCII | Characters, per video frame | same as Characters + fps/export | heaviest by far |
| Dots | filled circle, r ∝ tone | size, density, colour | 1 `arc`/cell |
| Cross | ╋ ┼ + × sized by tone | density, colour | 2 strokes/cell |
| Diagonal | 45° strokes (30/60 selectable) | density, colour | 1 stroke/cell |
| Diamond | ⬥ ◆ ◇ ⋄ sized by tone | size, colour | 1 polygon/cell |
| Lines | vertical bar, left-anchored | density, colour | 1 `fillRect`/cell |

Full names, for anyone cross-checking the site: Lines is sold as the *VHS/CRT scanlines* page;
Dots as *Halftone / Ben-Day*; Diagonal and Cross as *hatching / cross-stitch*; LEGO as *LEGO
mosaic*; Animated ASCII as *video to ASCII*.

### 4.1 Characters
Samples each cell's average luminance, maps it onto a ramp ordered dense→sparse, draws the glyph.
Ramp length is the contrast budget: 8 levels is graphic, 14+ is photographic. Cell size is the
detail dial. Colour is per-cell sampled from the source, so a warm photo stays warm.

```js
const i = Math.min(ramp.length-1, (luma/255 * (ramp.length-1)) | 0); // bright→dense on black
ctx.fillStyle = `rgb(${r},${g},${b})`;                              // cell mean colour
ctx.font = `${cell}px ui-monospace, "SFMono-Regular", Menlo, monospace`;
ctx.textBaseline = 'top';
ctx.fillText(ramp[i], x*cell, y*cell);
```
Cost is the problem: *1600 cells at a 12 px grid on a 390×600 phone = 1600 `fillText` calls*.
Render once into an `OffscreenCanvas`, cache it, and only re-render on resize (debounced) — never
per animation frame. For a live version, move to a glyph atlas + one instanced draw call in WebGL.

### 4.2 Dither
Quantises to a palette and distributes the error. Two families, and the choice decides whether it
plays nicely with animation:

- **Ordered** — Bayer 2×2/4×4/8×8/16×16, halftone, radial, linesH/V/D, white noise, blue noise.
  Stable per frame; no shimmer. Correct pick for anything that moves.
- **Error diffusion** — Floyd–Steinberg (`7/16, 3/16, 5/16, 1/16`), Atkinson, Stucki, Sierra Lite.
  Organic, and shimmers frame-to-frame because the error field changes.

Palettes: mono, grey4, grey8, gameboy, cga0, cga1, pico8, c64, nes16, rgb3, cyberpunk, pastel,
riso, sepia, original, custom. Plus `ditherChromaMode` (standard / luminance / per-channel),
`ditherScale` *1–12, default 2*, `ditherStrength` 0–100, `ditherThreshold` *0–100, default 50*,
`ditherContrast` *0–200, default 110*.

```js
// ordered, 4x4
const B4=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]].map(r=>r.map(v=>v/16-0.5));
v = clamp01(luma/255 + B4[y&3][x&3] * 0.5);   // threshold bias = dither strength
px = v > 0.5 ? white : black;
```
Cheapest of all 13: one `ImageData` walk, no per-cell allocation. On a static photo it is basically
free, which makes it the right choice for a *loading* state.

### 4.3 Mixed
The interesting one. On-page text says the real version composites **different render styles in
different parts of one frame** (bright regions as glyphs, shadows as dots; subject as pixel art,
background as dither), and the cell-level version picks from **five ink-matched families by
position hash** so the texture varies across the frame instead of repeating.

```js
const fam = hash2(x,y) % families.length;          // stable, no Math.random()
families[fam](cell, luma, rgb);                     // each family is one of the 13 above
```
Hash, not random — otherwise it crawls between frames. This is our cheap route to "ASCII 3D-ish
depth" without a second renderer: glyphs in the lit half, dot-matrix in the shadow half.

### 4.4 Pixel Art
No glyphs. Downsample to a grid, keep source colour, nearest-neighbour upscale. `fontSize` *is* the
pixel size.

```js
ctx.imageSmoothingEnabled = false;
tmp.drawImage(img, 0,0, cols, rows);        // downsample
ctx.drawImage(tmp, 0,0, W, H);              // upscale, crunchy
```
One draw call. This should be our default for Rusty and the crest — a sprite is already pixels, so
this is a no-op that still lets the same slider drive it.

### 4.5 Mosaic
Each tile filled with the cell's mean colour. Tile shape square / wide / tall (the page's history
section also mentions hex and triangular), plus optional palette and a **C64 Bayer-dither overlay**
on the tiles, plus blend mode.

```js
ctx.fillStyle = `rgb(${r},${g},${b})`;
ctx.fillRect(x*tw, y*th, tw, th);           // tw = th*1 or th*2 or th*0.5
```
Bigger cells read as mosaic, smaller as soft pixelation — same renderer, one slider apart. On a
phone, mosaic and pixel art are visually identical below ~6 px cells. Don't ship both.

### 4.6 LEGO
Posterise to a brick palette, then draw each cell as a brick: flat body + a stud with a light-from-
top-left gradient, and a darker edge for the seam. Palette + brick size + coverage.

```js
ctx.fillStyle = brick;                 ctx.fillRect(x*cs, y*cs, cs, cs);
const g = ctx.createRadialGradient(cx-r*.3, cy-r*.3, 1, cx, cy, r);  // r ≈ .28*cs
g.addColorStop(0,'rgba(255,255,255,.55)'); g.addColorStop(1,'rgba(0,0,0,0)');
ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx,cy,r,0,7); ctx.fill();
```
The 1 px inner top edge plus the stud gradient is the whole trick — without the gradient it reads as
Mosaic with rounded corners. Charming, but it is ~2× Mosaic's cost and reads *very* toy-like; wrong
register for a college fest congrats page unless used on Rusty alone.

### 4.7 Disco
The best-documented effect on the site, and the only one with real internal numbers:

- cell = `fontSize` tall, **60% as wide** (tiles slightly taller than wide, "the proportion you read
  looking straight at a mirror ball")
- brightness gain **up to ~1.45×** on bright cells
- each tile drawn **2 px short of its cell** → dark grout seams
- fill is a vertical 3-stop gradient: near-white at the top edge → tile colour just below → **~60%
  of that colour** at the bottom
- **> ~45% brightness**: hard 1 px white bar along the top edge (the glint)
- **> ~55%**: additive radial burst at a radius wider than the tile, so light spills onto neighbours
- one unique slider, **Uniformity**, ships at *80*: at 100 every tile keeps its true brightness;
  lower it and each tile takes a repeatable offset up to ~1 stop darker / ~0.5 stop brighter

Bloom and flares are emitted per tile, not filtered over the finished frame — that is why they track
the highlights. Practical note from the page that applies to us: a flat, evenly lit photo barely
sparkles, because nothing crosses the thresholds. Push contrast first.

### 4.8 Animated ASCII
Characters applied per video frame: decode with HTML5 Canvas, run the same renderer per frame,
re-encode to MP4/GIF. Their guidance on which style survives motion:

> Dither + ordered (Bayer 8×8, Halftone) is the most stable; error diffusion shimmers. Dots is the
> most graphic and reads at small sizes. Voxel is the heaviest. Pixel Art is the cleanest.

We are a static site on 3G — we will not ship video. But this ranking is the ranking *for us* too:
anything that emits at a stable per-cell position is safe to animate on scroll or on pointer.

### 4.9 Dots
Halftone. Radius tracks tone. Verified luma-positive (dots glow on black; *r = 0.90*).

```js
const r = 0.5 * cs * Math.sqrt(ink);       // sqrt = area-accurate, this is what reads right
ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
```
`sqrt` matters: linear radius makes midtones look blown out. This is the single best effect for a
photo of the St. Xavier's building — it survives a 3-inch thumbnail and it doubles as a CRT phosphor
mask if you offset every other row by half a cell.

### 4.10 Cross
Two strokes at ±45°, or the glyph set `╋ ┼ + ×` picked by tone. Dense weave, reads as embroidery /
cross-stitch / pen hatch.

```js
const L = cs * 0.5 * ink;                  // half-length
ctx.lineWidth = Math.max(1, cs*0.12); ctx.lineCap='round';
ctx.beginPath(); ctx.moveTo(cx-L,cy-L); ctx.lineTo(cx+L,cy+L);
                 ctx.moveTo(cx+L,cy-L); ctx.lineTo(cx-L,cy+L); ctx.stroke();
```

### 4.11 Diagonal
One hatch direction, 45° by default (30/60 selectable), thickening as tone rises. Reads as motion —
their page leans on that: sport posters, gig flyers.

```js
const L = cs*0.55*ink;
ctx.moveTo(cx-L, cy-L); ctx.lineTo(cx+L, cy+L);   // 45°
// 30°: (cx-L*0.87, cy-L*0.5) → (cx+L*0.87, cy+L*0.5)
```

### 4.12 Diamond
Squares rotated 45°, size by tone; four weights `⬥ ◆ ◇ ⋄` when drawn as glyphs. Reads Art Deco /
woven textile because diamonds tessellate.

```js
const d = cs*0.5*ink;
ctx.moveTo(cx, cy-d); ctx.lineTo(cx+d, cy); ctx.lineTo(cx, cy+d); ctx.lineTo(cx-d, cy); ctx.closePath();
```

### 4.13 Lines
Vertical bars per column, **left-anchored**, width from half a cell down to an eighth — "rows stack
into continuous rules whose width follows tone". This is their CRT/VHS page.

```js
ctx.fillRect(x*cs, y*cs, Math.max(1, cs*0.5*ink), cs);   // left-anchored ✓
```
Cheapest glyph-free effect after Pixel Art, and the most on-brief for CRT. Their own note: scanlines
are the simplest layer; CRT = scanlines + barrel curvature + phosphor glow + vignette, and the
curvature is what distorts typography. So keep the name out of the curved layer.

---

## 5. The before/after slider

Worth copying almost verbatim for our "before → after" reveal beat (raw campus photo → ASCII campus).

Structure — two absolutely-positioned layers, one clipped:

```css
.slider        { position:relative; aspect-ratio:1477/676; overflow:hidden; background:#000;
                 user-select:none; }
.slider__layer { position:absolute; inset:0; }
.slider__layer--after { clip-path: inset(0 0 0 var(--split, 50%)); }   /* the whole trick */
```

Details that make it feel expensive:

- `--split` is a CSS custom property driven from JS; `setSplit()` clamps *0–100* and writes
  `aria-valuenow` on a `role="slider"` element.
- Divider: 1 px, `rgba(255,255,255,.85)`, `box-shadow: 0 0 10px rgba(255,255,255,.35)`.
- Handle: 48 px circle, `background:rgba(10,10,12,.55)`, `backdrop-filter: blur(10px) saturate(1.4)`,
  1 px `rgba(255,255,255,.6)` border, `touch-action:none`, chevrons inside.
- Labels: 11 px, `letter-spacing:.14em`, uppercase, in a `rgba(4,4,6,.5)` pill with
  `backdrop-filter: blur(8px)`, `outline:1px solid rgba(255,255,255,.16)`.
- **No z-index on labels** — they live inside their own layer, so the after-layer's clip eats the
  "Before" label as it sweeps over it. Small detail, genuinely better than fixed labels.
- Letterboxing is handled by an ambient layer instead of dead black: `.slider__ambient`
  `inset:-60px`, `filter: blur(48px) brightness(.42) saturate(1.3)`, same image behind. Then a
  `radial-gradient(ellipse 75% 95% at 50% 50%, transparent 35%, rgba(4,4,6,.9) 100%)` vignette on
  top of it.
- Before is a static `<img>`; after can be `<video poster>` so the still paints immediately and the
  clip streams later. `object-fit: cover`, `draggable="false"`.

Also steal the **CRT boot overlay**: a full-bleed canvas painting per-pixel `Math.random()` snow each
frame with a slow VCR tracking band, over a 16 px uppercase label reading `initializing` with a
`steps(4)` dots animation, fading out over 450 ms. That is exactly the "transmission opens" beat in
our README, already proven to read as retro instead of as a spinner.

---

## 6. Visual language

**Palette (measured).** Near-black, not pure black, and the "accent" is white:

| Token | Value | Use |
|---|---|---|
| `--bg` | `#040406` | page |
| `--text` / `--accent` | `#FFFFFF` | body, active states, dividers |
| `--accent-text` | `#040406` | text on white buttons |
| borders | `#1C1C1C`, `#0F0F12`, `#353535` | hairlines, panels |
| signal | `#ff8a3c` | **only** the announcement dot + arrow |
| ok / error | `#6fd07a` / `#ff7373` | status only |

The orange in the brief is real but *sparse*: `#ff8a3c` appears on the announcement strip's pulsing
dot and its arrow, nothing else. In `--accent` terms the system is monochrome. That is the lesson —
one small warm signal on a large cold field reads as alive; orange everywhere would read as
corporate. Note the dot also gets a `box-shadow` pulse ring (`0 0 0 0 → 6px` at 55%→0 alpha) — a
2-keyframe animation, no library.

**Type (measured).**

- Display: **GeistPixel-Square** (`--font-display`), falling back to mono. Pixel font for headings,
  CTAs, labels. That is why the site reads "pixel" before it reads "ASCII".
- Body: **Satoshi**.
- Mono: `ui-monospace, SFMono-Regular, Menlo, "Cascadia Code", monospace` — used for technical
  strings, not for everything.

**Other rules visible in CSS.** `outline: 1px solid` with `outline-offset: -1px` instead of borders
(no layout shift, crisp at any DPR). Labels: 11 px, `letter-spacing: .14em`, uppercase. Buttons:
45 px tall, 18 px side padding, square corners. Transitions ~150–180 ms, hover = background lift
rather than colour change.

---

## 7. Recommended 4 for the Xenith page

Ordered by how the reveal actually plays. All four share one renderer and one cell-size slider.

**1. Dots — campus stage.** The St. Xavier's photo as halftone. At a 6 px cell it still resolves on
a 320 px-wide phone, it is luma-positive so the building lights up on black, and the `sqrt` radius
gives free "glow" without a bloom pass. Doubles as the CRT phosphor mask by half-cell row offset.
This is the effect that makes a photo look *engineered* rather than filtered.

**2. Pixel Art — Rusty + crest.** A mascot sprite is already on a pixel grid, so this is a no-op
render at zero cost and total fidelity; no glyph shimmer, no anti-aliasing rot. It also enforces the
constraint that Rusty must be authored at final size — which is the only way a 3G page gets a mascot
for a couple of KB.

**3. Characters — the name line.** `name / dept / role` revealed as a glyph dissolve: render the
text as a ramp, then settle from random glyphs to the real ones over ~600 ms. Cheap (one static
render, cached) and it is the one effect where the output is *literally text*, so the ritual reads
as "the machine typed your name". Keep the final name also present as real DOM text underneath —
selectable, screen-reader clean, and it renders before any canvas work.

**4. Lines — the CRT pass.** Vertical bars as a global overlay plus the transition wipe between
stages (bars sweep closed, stage swaps, bars sweep open). Cheapest of the four after Pixel Art,
instantly reads VHS/CRT, and it is the one effect that should be *animated*, because bars that grow
from a half cell are a wipe for free.

**Runners-up.** *Dither* is the honest pick for a loading state or a "before/after" toggle — one
`ImageData` pass, and ordered Bayer will not shimmer. *Disco* is the best easter egg in the whole
tool: tap Rusty, Uniformity drops to ~40, the mascot's highlights glint. It is ~3 draws/cell so only
do it on tap, never on load. *LEGO* and *Diamond* are beautiful and wrong-register here; *Diamond*
would work on the college crest if the page ever wants an Art Deco beat.

**On "ASCII 3D".** None of the 13 are 3D. The nearest thing the tool has is
[Voxel](https://www.ascii-magic.com/styles/voxel): a hex grid of isometric cubes lifted by
brightness, lighter top face, darker side, per-face shading, cube size / spacing / outline. If the
3D read is non-negotiable, that is the pattern to reimplement: project a heightfield to iso, paint
three faces per cell, and you get depth without a WebGL scene. It is also the heaviest renderer they
ship, so bake it once at build time into a still, and keep the live canvas to the 2D effects.

---

## 8. Budget notes for our page

- Cells are the cost unit. *390×600 at 12 px cells = 1600 cells; at 8 px = 3600; desktop 1440 at
  14 px ≈ 4500.* One render, cached in an `OffscreenCanvas`; re-render only on resize.
- Per-cell `fillText` is the expensive path. If the name animation needs to be live, draw the ramp
  from a pre-baked glyph atlas, not `fillText`.
- Everything above is procedural: zero image bytes for the effects themselves, which fits the
  400 KB imagery target and the 350 MB disk without a single install.
- Do the "before" photo once, at the smallest size that still reads, and let the effect create the
  detail. Their own hero does exactly this: phone gets a 720 px portrait crop, desktop a 1280 px one.

---

## 9. What to skip

The Pro surface (105 styles, 10 post-FX, 11 blend modes, 4× export, MP4/GIF encoding) is not our
product. We need four looks, one data file, one template. The transferable part of this site is the
*cell loop*, the *clip-path slider*, the *CRT boot overlay*, and the restraint of one orange dot.
