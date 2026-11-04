# Glass mark

`mark.png` is the raster mark for the vanilla Glassy UI Glass Logo Reveal port in
`renderer.js`. It is a 1:1 headless Chrome shot of
`assets/brand/xenith-logo-amber.svg`. The SVG is untouched.

- Upstream: <https://glassyui.com/components/glass-logo-reveal> (MIT)
- Source: `../../assets/brand/xenith-logo-amber.svg`
- Raster: `mark.png`

## Stage backdrop

**Exact colour: `#06050f`**, `rgb(6 5 15)`, the site's `--ink` in
`site/style.css`. Paint it on the reveal figure as an opaque `background-color`.

The renderer reads that CSS colour and premultiplies it. For `#06050f` the
`backdrop` uniform is `[0.023529, 0.019608, 0.058824, 1]`, and `dark` is `true`
because the luminance is below 0.5.

Do not use a clear stage. `over()` and the studio reflections are built from the
backdrop. At alpha 0 the stage terms go black and the glass has nothing to
disappear into.

Glassy's stock CSS uses `#1c1c1e`. That is the upstream default, not this lab's
stage: on the Xenith page it reads as a lighter rectangle.

## Mark dimensions

- **1200 x 400 px**, 3:1, 8-bit RGBA, straight alpha, sRGB, no ICC profile.
- The canvas is transparent: all four corners are `(0, 0, 0, 0)`.
- Artwork alpha bbox, glow included: `x=41..870, y=57..326` (830 x 270).
- Solid ink, alpha 254 and up: `x=72..863, y=88..301`.
- The X is 208 x 208 at `(72, 88)`. The wordmark "enith" starts at `x=304`, sits
  on baseline 300, and advances about 564 px.
- The lockup is left-weighted. There are 72 px of clear stage on the left and
  336 px to the right of the solid mark, because the source viewBox is wider
  than the artwork.

Keep the 3:1 box. Upstream's CSS sizes it by height:
`height: var(--lg-logo-reveal-size, 46cqmin); width: auto;`. At 310 px high it
lays out 930 px wide.

## What the renderer expects

- **An element it can measure.** Put the PNG in the reveal's
  `<img class="lg-logo-reveal-mark">`. `paintMark()` measures
  `getBoundingClientRect()`; a CSS background image or a canvas will not work.
- **Same origin or CORS.** The component sets `crossorigin="anonymous"`. A
  tainted canvas throws on `texImage2D`, and the figure shows its cross-origin
  error. Serve the lab over HTTP, not `file://`.
- **Straight alpha, sRGB.** Uploads use `UNPACK_PREMULTIPLY_ALPHA_WEBGL = true`
  and `UNPACK_COLORSPACE_CONVERSION_WEBGL = NONE`. Supply an unpremultiplied
  PNG with no embedded profile, as this file does. A wide-gamut profile would
  be ignored and the amber would shift.
- **The box is the geometry.** The glass centres on the image box, not on the
  ink. In this 1200 x 400 box the centre is `(600, 200)` while the lockup is
  left-weighted, so the bloom sits right of its optical centre. Do not squash
  the box to compensate.
- **No baked stage.** Keep the background transparent. A rectangle, vignette,
  or CSS `drop-shadow` would either be sampled as part of the mark or vanish
  under the glass, since `drawImage()` ignores CSS filters.
- **The renderer adds its own margin.** `MARGIN = 0.4` gives 40% clear on each
  side of the sharp texture, and `markRect` spans 1.8x the image box. Do not
  add extra CSS padding.
- **Keep the box stable.** The last frame is a still drawn from the image at
  canvas resolution; the real `<img>` is revealed at `data-state="ended"` after
  a 240 ms canvas fade. Resizing triggers a repaint, a CSS transform does not.
- **Upright and unflipped.** The texture is uploaded without
  `UNPACK_FLIP_Y_WEBGL`, so supply the image the right way up.

## Regenerate

Shoot the SVG at 1:1 on a transparent 1200 x 400 page, not an upscale of this
PNG:

```
google-chrome --headless=new --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1200,400 --default-background-color=00000000 \
  --screenshot=mark.png file:///path/to/wrapper.html
```

The wrapper is `<img src="xenith-logo-amber.svg" width="1200" height="400">`
with `margin:0` and a transparent body.
