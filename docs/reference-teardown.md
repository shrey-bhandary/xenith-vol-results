# Reference teardown, code level

Fetched and read on 3 Nov, no browser tabs kept open.

## why.zero.university

- Rendered DOM: a single `<canvas id="webgl">` with `data-engine="three.js r160"`, plus a HUD built in DOM.
- Loader counts to **99**, with a rolling digit animation and the word "degree". It sets `aria-valuenow="99"` on the progressbar.
- HUD shows an **XP counter**, a `SCROLL` cue and a depth readout (`0 BZ`, `-25 BZ`, `-50 BZ`). The page stages progress with scroll, not routes.
- Continue control: a circular **hold-to-continue** button with an SVG progress ring, `holdDuration`, a resume window of 500ms, and its own audio cue. That is the pattern worth stealing for the final stamp.
- Sound is a first-class layer (`X.play`, `holdAudio`, fades).
- The "DRAW A ZERO" prompt is painted inside the WebGL scene, not in the DOM, so there is no shape validation to copy. The gate is a gesture ritual, not a captcha. That confirmed the decision to use forgiving coverage detection for our X instead of shape classification.
- Bundle is a single 1.2 MB minified module with three.js inlined. No separate chunks to cherry-pick.

What to take: the 99 loader, the hold button with a progress ring, the depth readout, the audio discipline. Not the 1.2 MB bundle.

## vshslv.com

- Astro, three CSS files, no framework runtime in the page.
- Type: **ABC Diatype**, one family, weights doing the work.
- Palette: near-black `#000`, white, and a single accent `#ff6c00`. Everything else is alpha white: `#ffffff1a`, `#ffffff40`, `#ffffff80`.
- Tokens are real CSS variables: `--text`, `--surface`, `--line`, `--hairline: 1px`, `--rhythm-cols`, plus a full z-index ladder (`--z-nav` 999 to `--z-terminal` 10020).
- Layout: three-column rhythm `1fr 1fr 1fr` with a 0.63rem gap and a 0.315rem text inset.
- Motion: GSAP-style reveals, but the page is mostly static composition. The premium feel comes from the photo/video treatment, hairlines and restraint, not from effects.

What to take: hairline rules, tiny uppercase metadata, one accent colour, the z-index ladder, the 3-column rhythm. Not the font (we use mono and Press Start 2P).

## ascii-magic.com

- Before/after slider with a draggable divider is the core UI idea.
- Effect chips: Characters, Dither, Mixed, Pixel Art, Mosaic, LEGO, Disco, Animated ASCII, Dots, Cross, Diagonal, Diamond, Lines.
- Black UI, orange accents, mono labels, a single "Open tool" CTA.
- The tool treats the effect as a parameter set (charset, dither, colour, animation), not a fixed style.

What to take: the effect chips as a future playground, the slider as a comparison device, the black/orange tool language. For the congrats page, use Characters + Dither only; the rest is noise.

## What this changed in our build

1. The gate is now a real interaction: draw X, coverage detection, mint progress, skip.
2. The boot loader will count like Zero's (99 degrees) before the name lands, instead of a plain typing log.
3. The final CTA becomes a hold-to-stamp with a progress ring, not a plain button.
4. Palette tightened to near-black, cream, amber, one violet accent, one mint success.
5. No more than one CTA per screen.
